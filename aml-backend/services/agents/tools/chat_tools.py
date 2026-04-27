"""Additional tools for the conversational AML assistant (chat agent)."""

import logging
import os
from langchain_core.tools import tool
from dependencies import get_mongo_client, DB_NAME

logger = logging.getLogger(__name__)

ENTITY_VECTOR_INDEX = os.getenv("ENTITY_VECTOR_INDEX", "entity_vector_search_index")


@tool
def search_investigations(
    entity_id: str = "",
    status: str = "",
    limit: int = 10,
) -> dict:
    """Search past investigations, optionally filtered by entity_id and/or status.

    Returns a list of investigation summaries (case_id, entity_id, status,
    created_at, typology, triage disposition) sorted by most recent first.
    """
    client = get_mongo_client()
    coll = client[DB_NAME]["investigations"]

    query = {}
    if entity_id:
        query["entity_id"] = entity_id
    if status:
        query["investigation_status"] = status

    cursor = (
        coll.find(query, {"_id": 0})
        .sort("created_at", -1)
        .limit(limit)
    )
    results = []
    for doc in cursor:
        results.append({
            "case_id": doc.get("case_id"),
            "entity_id": doc.get("entity_id"),
            "status": doc.get("investigation_status"),
            "created_at": doc.get("created_at"),
            "typology": doc.get("typology", {}).get("primary_typology", "unknown"),
            "typology_confidence": doc.get("typology", {}).get("confidence"),
            "triage_disposition": doc.get("triage_decision", {}).get("disposition"),
            "risk_score": doc.get("triage_decision", {}).get("risk_score"),
            "human_decision": doc.get("human_decision", {}).get("decision"),
        })
    return {"count": len(results), "investigations": results}


@tool
def get_investigation_detail(case_id: str) -> dict:
    """Get full details of a single investigation by case_id.

    Returns the complete case document including triage decision, case file,
    typology classification, narrative, network analysis, validation result,
    human decision, and audit trail.
    """
    client = get_mongo_client()
    doc = client[DB_NAME]["investigations"].find_one(
        {"case_id": case_id}, {"_id": 0}
    )
    if not doc:
        return {"error": f"Investigation {case_id} not found"}
    return doc


RISK_SCORE_THRESHOLDS = {
    "critical": 80,
    "high": 60,
    "medium": 40,
    "low": 0,
}


@tool
def search_entities(
    entity_type: str = "",
    risk_level: str = "",
    name_contains: str = "",
    limit: int = 20,
) -> dict:
    """Search entities by type, risk level, or partial name.

    Parameters:
        entity_type: 'individual' or 'organization' (optional)
        risk_level: 'low', 'medium', 'high', or 'critical' (optional).
            Searches by the level label first; if nothing matches it falls
            back to a score-range query (critical>=80, high>=60, medium>=40).
        name_contains: partial name for case-insensitive search (optional)
        limit: max results (default 20)

    Returns matching entities with their entityId, name, type, risk info.
    When count is 0 the response includes diagnostic metadata
    (total_entities, available_risk_levels) so you can tell whether the
    collection is empty vs. no entities matching the filter.
    """
    client = get_mongo_client()
    coll = client[DB_NAME]["entities"]

    projection = {
        "_id": 0,
        "entityId": 1,
        "entityType": 1,
        "name": 1,
        "scenarioKey": 1,
        "status": 1,
        "riskAssessment.overall": 1,
    }

    base_query: dict = {}
    if entity_type:
        base_query["entityType"] = entity_type
    if name_contains:
        base_query["name.full"] = {"$regex": name_contains, "$options": "i"}

    # --- primary search: match by level label ---
    query = {**base_query}
    if risk_level:
        query["riskAssessment.overall.level"] = {
            "$regex": f"^{risk_level}$",
            "$options": "i",
        }

    results = list(coll.find(query, projection).limit(limit))

    # --- fallback: if level match returned nothing, try score range ---
    used_fallback = False
    if not results and risk_level:
        level_key = risk_level.strip().lower()
        min_score = RISK_SCORE_THRESHOLDS.get(level_key)
        if min_score is not None:
            score_query = {**base_query}
            score_filter: dict = {"riskAssessment.overall.score": {"$gte": min_score}}
            next_levels = [v for v in sorted(RISK_SCORE_THRESHOLDS.values()) if v > min_score]
            if next_levels:
                score_filter["riskAssessment.overall.score"]["$lt"] = next_levels[0]
            score_query.update(score_filter)
            results = list(
                coll.find(score_query, projection)
                .sort("riskAssessment.overall.score", -1)
                .limit(limit)
            )
            used_fallback = True

    response: dict = {"count": len(results), "entities": results}

    if used_fallback and results:
        response["note"] = (
            f"No entities had risk level label '{risk_level}'; "
            f"returned {len(results)} entities matched by score range instead."
        )

    # --- diagnostics when nothing found ---
    if not results:
        total = coll.estimated_document_count()
        distinct_levels = coll.distinct("riskAssessment.overall.level")
        response["diagnostics"] = {
            "total_entities_in_collection": total,
            "available_risk_levels": distinct_levels,
            "hint": (
                "The collection may be empty or no entities match the "
                "requested filters. Try broadening criteria or omit "
                "risk_level to list all entities."
            ),
        }

    return response


@tool
def assess_entity_risk(entity_id: str) -> dict:
    """Generate a comprehensive risk dossier for an entity in a single call.

    Combines entity profile, watchlist screening, transaction statistics,
    and network analysis. Returns the full risk assessment, watchlist details,
    transaction stats (volume, flagged count, avg/max risk), relationship type
    breakdown, and high-risk connection count.
    """
    client = get_mongo_client()
    db = client[DB_NAME]

    profile = db["entities"].find_one(
        {"entityId": entity_id},
        {
            "_id": 0, "entityId": 1, "entityType": 1, "name": 1,
            "riskAssessment": 1, "watchlistMatches": 1, "status": 1,
        },
    )
    if not profile:
        return {"error": f"Entity {entity_id} not found"}

    txn_pipeline = [
        {"$match": {"$or": [{"fromEntityId": entity_id}, {"toEntityId": entity_id}]}},
        {"$group": {
            "_id": None,
            "total_count": {"$sum": 1},
            "total_volume": {"$sum": "$amount"},
            "flagged_count": {"$sum": {"$cond": ["$flagged", 1, 0]}},
            "max_risk": {"$max": "$riskScore"},
            "avg_risk": {"$avg": "$riskScore"},
        }},
    ]
    txn_stats = list(db["transactionsv2"].aggregate(txn_pipeline))
    txn = txn_stats[0] if txn_stats else {}

    rel_type_pipeline = [
        {"$match": {"$or": [
            {"source.entityId": entity_id},
            {"target.entityId": entity_id},
        ]}},
        {"$group": {
            "_id": "$type",
            "count": {"$sum": 1},
        }},
        {"$sort": {"count": -1}},
        {"$limit": 10},
    ]
    relationships = list(db["relationships"].aggregate(rel_type_pipeline))

    rel_risk_pipeline = [
        {"$match": {"$or": [
            {"source.entityId": entity_id},
            {"target.entityId": entity_id},
        ]}},
        {"$group": {
            "_id": None,
            "total": {"$sum": 1},
            "high_risk": {"$sum": {"$cond": [{"$lt": ["$confidence", 0.5]}, 1, 0]}},
        }},
    ]
    rel_risk = list(db["relationships"].aggregate(rel_risk_pipeline))
    rr = rel_risk[0] if rel_risk else {}

    watchlist = profile.get("watchlistMatches", [])

    return {
        "entity_id": entity_id,
        "name": profile.get("name", {}).get("full", ""),
        "entity_type": profile.get("entityType", ""),
        "risk_assessment": profile.get("riskAssessment", {}),
        "watchlist_hits": len(watchlist),
        "watchlist_details": [
            {"list_id": m.get("listId"), "score": m.get("matchScore")}
            for m in watchlist[:5]
        ],
        "transaction_stats": {
            "total_count": txn.get("total_count", 0),
            "total_volume": round(txn.get("total_volume", 0), 2),
            "flagged_count": txn.get("flagged_count", 0),
            "max_risk_score": txn.get("max_risk", 0),
            "avg_risk_score": round(txn.get("avg_risk", 0), 2),
        },
        "relationship_types": [
            {"type": r["_id"], "count": r["count"]}
            for r in relationships
        ],
        "network_stats": {
            "total_relationships": rr.get("total", 0),
            "high_risk_connections": rr.get("high_risk", 0),
        },
    }


@tool
def compare_entities(entity_id_a: str, entity_id_b: str) -> dict:
    """Compare two entities side-by-side on risk, transactions, and network.

    Returns a comparison object with risk scores, transaction volume,
    flagged counts, network size, and watchlist status for both entities.
    """
    client = get_mongo_client()
    db = client[DB_NAME]

    def _summarize(eid):
        entity = db["entities"].find_one(
            {"entityId": eid},
            {"_id": 0, "entityId": 1, "name": 1, "entityType": 1,
             "riskAssessment.overall": 1, "watchlistMatches": 1},
        )
        if not entity:
            return {"error": f"Entity {eid} not found"}

        txns = list(db["transactionsv2"].aggregate([
            {"$match": {"$or": [{"fromEntityId": eid}, {"toEntityId": eid}]}},
            {"$group": {
                "_id": None,
                "count": {"$sum": 1},
                "volume": {"$sum": "$amount"},
                "flagged": {"$sum": {"$cond": ["$flagged", 1, 0]}},
            }},
        ]))
        t = txns[0] if txns else {}

        rels = db["relationships"].count_documents({
            "$or": [{"source.entityId": eid}, {"target.entityId": eid}]
        })

        return {
            "entity_id": eid,
            "name": entity.get("name", {}).get("full", ""),
            "entity_type": entity.get("entityType", ""),
            "risk_score": entity.get("riskAssessment", {}).get("overall", {}).get("score"),
            "risk_level": entity.get("riskAssessment", {}).get("overall", {}).get("level"),
            "watchlist_hits": len(entity.get("watchlistMatches", [])),
            "transaction_count": t.get("count", 0),
            "transaction_volume": round(t.get("volume", 0), 2),
            "flagged_transactions": t.get("flagged", 0),
            "relationship_count": rels,
        }

    return {
        "entity_a": _summarize(entity_id_a),
        "entity_b": _summarize(entity_id_b),
    }


@tool
def trace_fund_flow(
    entity_id: str,
    direction: str = "outgoing",
    hops: int = 2,
) -> dict:
    """Trace the flow of funds from/to an entity through transaction chains.

    Follows money through transactionsv2 using fromEntityId/toEntityId links
    up to N hops. Direction can be 'outgoing' (where money went) or 'incoming'
    (where money came from).

    Returns a list of fund flow paths with amounts and counterparties at each hop.
    """
    client = get_mongo_client()
    db = client[DB_NAME]
    coll = db["transactionsv2"]

    if direction == "outgoing":
        match_field, follow_field, next_match = "fromEntityId", "toEntityId", "fromEntityId"
    else:
        match_field, follow_field, next_match = "toEntityId", "fromEntityId", "toEntityId"

    paths: list[dict] = []
    frontier = [{"entity_id": entity_id, "path": [], "total_amount": 0}]

    for hop in range(hops):
        next_frontier = []
        for node in frontier[:10]:
            txns = list(
                coll.find(
                    {match_field: node["entity_id"]},
                    {"_id": 0, "transactionId": 1, "fromEntityId": 1, "toEntityId": 1,
                     "amount": 1, "timestamp": 1, "riskScore": 1, "flagged": 1},
                )
                .sort("riskScore", -1)
                .limit(5)
            )
            for t in txns:
                counterparty = t.get(follow_field, "")
                if counterparty == entity_id:
                    continue
                new_path = node["path"] + [{
                    "hop": hop + 1,
                    "from": t.get("fromEntityId"),
                    "to": t.get("toEntityId"),
                    "amount": t.get("amount", 0),
                    "risk_score": t.get("riskScore", 0),
                    "flagged": t.get("flagged", False),
                    "timestamp": str(t.get("timestamp", "")),
                    "transaction_id": t.get("transactionId"),
                }]
                entry = {
                    "entity_id": counterparty,
                    "path": new_path,
                    "total_amount": node["total_amount"] + t.get("amount", 0),
                }
                next_frontier.append(entry)
                if hop == hops - 1:
                    paths.append({
                        "endpoint": counterparty,
                        "hops": hop + 1,
                        "total_amount": round(entry["total_amount"], 2),
                        "path": new_path,
                    })
        frontier = next_frontier
        if not frontier:
            break

    paths.sort(key=lambda p: p.get("total_amount", 0), reverse=True)
    return {
        "entity_id": entity_id,
        "direction": direction,
        "max_hops": hops,
        "paths_found": len(paths),
        "paths": paths[:15],
    }


@tool
def find_similar_entities(entity_id: str, limit: int = 5) -> dict:
    """Find entities with similar risk/behavioral profiles using vector search.

    Reads the entity's profileEmbedding and runs Atlas Vector Search to find
    the most similar entities. Useful for discovering entities that share
    patterns with known suspicious actors.
    """
    client = get_mongo_client()
    db = client[DB_NAME]

    entity = db["entities"].find_one(
        {"entityId": entity_id},
        {"_id": 0, "entityId": 1, "name": 1, "profileEmbedding": 1},
    )
    if not entity:
        return {"error": f"Entity {entity_id} not found"}

    embedding = entity.get("profileEmbedding")
    if not embedding:
        return {"error": f"Entity {entity_id} has no profileEmbedding"}

    pipeline = [
        {
            "$vectorSearch": {
                "index": ENTITY_VECTOR_INDEX,
                "path": "profileEmbedding",
                "queryVector": embedding,
                "numCandidates": limit * 10,
                "limit": limit + 1,
            }
        },
        {"$match": {"entityId": {"$ne": entity_id}}},
        {"$limit": limit},
        {"$project": {
            "_id": 0,
            "entityId": 1,
            "entityType": 1,
            "name": 1,
            "riskAssessment.overall": 1,
            "score": {"$meta": "vectorSearchScore"},
        }},
    ]

    results = list(db["entities"].aggregate(pipeline))
    return {
        "query_entity": entity_id,
        "query_name": entity.get("name", {}).get("full", ""),
        "similar_count": len(results),
        "similar_entities": results,
    }


@tool
def analyze_temporal_patterns(entity_id: str, days_back: int = 90) -> dict:
    """Analyse temporal transaction patterns for an entity.

    Detects structuring (sub-threshold clusters), velocity spikes,
    round-trip fund flows, off-hours activity, and dormancy-burst patterns.
    Uses MongoDB aggregation -- no LLM involved.
    """
    from services.agents.nodes.temporal_analyst import (
        _detect_structuring,
        _detect_velocity_anomalies,
        _detect_round_trips,
        _detect_time_anomalies,
        _detect_dormancy_bursts,
    )

    client = get_mongo_client()
    db = client[DB_NAME]

    structuring = _detect_structuring(db, entity_id)
    velocity = _detect_velocity_anomalies(db, entity_id)
    round_trips = _detect_round_trips(db, entity_id)
    time_anomalies = _detect_time_anomalies(db, entity_id)
    dormancy = _detect_dormancy_bursts(db, entity_id)

    summary_parts = []
    if structuring:
        summary_parts.append(f"{len(structuring)} structuring pattern(s)")
    if velocity:
        summary_parts.append(f"{len(velocity)} velocity spike(s)")
    if round_trips:
        summary_parts.append(f"{len(round_trips)} round-trip flow(s)")
    if time_anomalies:
        summary_parts.append(f"time anomalies: {', '.join(a['type'] for a in time_anomalies)}")
    if dormancy:
        summary_parts.append(f"{len(dormancy)} dormancy-burst pattern(s)")
    if not summary_parts:
        summary_parts.append("no significant temporal anomalies")

    return {
        "entity_id": entity_id,
        "days_back": days_back,
        "structuring_indicators": structuring,
        "velocity_anomalies": velocity,
        "round_trip_patterns": round_trips,
        "time_anomalies": time_anomalies,
        "dormancy_bursts": dormancy,
        "summary": "; ".join(summary_parts),
    }
