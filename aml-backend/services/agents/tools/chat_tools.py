"""Additional tools for the conversational AML assistant (chat agent)."""

import logging
import os
from langchain_core.tools import tool
from dependencies import (get_mongo_client, DB_NAME, RELATIONSHIPS_COLLECTION,
                          FRAUD_EVAL_COLLECTION)
# Phase-2 step 3 migration: entity ids flowing into this file are now
# `customers.customerId` values (see services/agents/entity_resolution.py),
# so the graph traverses on the same key the entity side resolves on.
from repositories.relationship_fields import SOURCE_KEY, TARGET_KEY, TYPE_KEY
from repositories import entity_fields as ef
from services.agents import fraud_resolution_shape as frs
from services.agents.entity_resolution import agentic_scoped, AML_ONLY_MATCH
from services.agents.tools.transaction_tools import entity_transaction_stats

logger = logging.getLogger(__name__)

ENTITY_VECTOR_INDEX = os.getenv("ENTITY_VECTOR_INDEX", "entity_vector_search_index")


def _fetch_customer_wire(db, entity_id: str) -> dict | None:
    """Fetch a `customers` doc translated to the wire shape the tools expect."""
    proj = ef.wire_projection(include_embeddings=False)
    proj["_id"] = 0
    pipeline = [
        {"$match": agentic_scoped({ef.CUSTOMER_ID: entity_id})},
        {"$project": proj},
        {"$limit": 1},
    ]
    results = list(db["customers"].aggregate(pipeline))
    return results[0] if results else None


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
    coll = client[DB_NAME][frs.COLLECTION]

    query = {}
    if entity_id:
        # `entity_id` is overloaded: the raw ThreatSight id pre-BIAN, a
        # `customers.customerId` post-Phase-2. Match either stored field.
        query["$or"] = [
            {frs.SOURCE_ENTITY_ID: entity_id},
            {frs.CUSTOMER_ID: entity_id},
        ]
    if status:
        query[frs.STATUS] = status

    cursor = (
        coll.find(query, {"_id": 0})
        .sort(frs.CREATED_AT, -1)
        .limit(limit)
    )
    results = []
    for stored in cursor:
        doc = frs.to_wire(stored)
        results.append({
            "case_id": doc.get("case_id"),
            "entity_id": doc.get("entity_id"),
            "status": doc.get("investigation_status"),
            "created_at": doc.get("created_at"),
            "typology": (doc.get("typology") or {}).get("primary_typology", "unknown"),
            "typology_confidence": (doc.get("typology") or {}).get("confidence"),
            "triage_disposition": (doc.get("triage_decision") or {}).get("disposition"),
            "risk_score": (doc.get("triage_decision") or {}).get("risk_score"),
            "human_decision": (doc.get("human_decision") or {}).get("decision"),
        })
    return {"count": len(results), "investigations": results}


@tool
def get_investigation_detail(case_id: str, include_telemetry: bool = False) -> dict:
    """Get the analyst-facing detail of a single investigation by case_id.

    Returns the triage decision, case file, typology classification, SAR narrative,
    network/temporal/trail analysis, validation result, human decision and
    sub-investigation findings -- everything needed to explain or summarise a case.

    Parameters:
        case_id: the case reference, e.g. 'CASE-83E69DC9'.
        include_telemetry: also return the agent audit log, tool trace log and
            pipeline metrics (default False). These are debugging artefacts -- raw
            LLM prompts and tool outputs -- and they are LARGE: they roughly triple
            the response. Request them only when asked about how the pipeline itself
            ran, and only for ONE case at a time.

    To compare or summarise several cases, call this per case_id and leave
    include_telemetry off.
    """
    client = get_mongo_client()
    projection = {"_id": 0} if include_telemetry else frs.TELEMETRY_EXCLUDE
    doc = client[DB_NAME][frs.COLLECTION].find_one(
        {frs.CASE_ID: case_id}, projection
    )
    if not doc:
        return {"error": f"Investigation {case_id} not found"}
    return frs.to_wire(doc)


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
    coll = client[DB_NAME]["customers"]

    proj = ef.wire_projection(include_embeddings=False)
    proj["_id"] = 0

    base_query: dict = {}
    if entity_type:
        base_query[ef.TYPE] = ef.type_to_storage(entity_type)
    if name_contains:
        base_query[ef.FULL_NAME] = {"$regex": name_contains, "$options": "i"}

    # --- primary search: match by level label ---
    query = agentic_scoped(dict(base_query))
    if risk_level:
        query[ef.RISK_LEVEL] = {"$regex": f"^{risk_level}$", "$options": "i"}

    results = list(
        coll.aggregate([{"$match": query}, {"$project": proj}, {"$limit": limit}])
    )

    # --- fallback: if level match returned nothing, try score range ---
    used_fallback = False
    if not results and risk_level:
        level_key = risk_level.strip().lower()
        min_score = RISK_SCORE_THRESHOLDS.get(level_key)
        if min_score is not None:
            score_query = agentic_scoped(dict(base_query))
            score_filter: dict = {ef.RISK_SCORE: {"$gte": min_score}}
            next_levels = [v for v in sorted(RISK_SCORE_THRESHOLDS.values()) if v > min_score]
            if next_levels:
                score_filter[ef.RISK_SCORE]["$lt"] = next_levels[0]
            score_query.update(score_filter)
            results = list(
                coll.aggregate([
                    {"$match": score_query},
                    {"$sort": {ef.RISK_SCORE: -1}},
                    {"$project": proj},
                    {"$limit": limit},
                ])
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
        total = coll.count_documents(agentic_scoped({}))
        distinct_levels = coll.distinct(ef.RISK_LEVEL, agentic_scoped({}))
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

    profile = _fetch_customer_wire(db, entity_id)
    if not profile:
        return {"error": f"Entity {entity_id} not found"}

    txn = entity_transaction_stats(entity_id, db)

    rel_type_pipeline = [
        {"$match": {"$or": [
            {SOURCE_KEY: entity_id},
            {TARGET_KEY: entity_id},
        ]}},
        {"$group": {
            "_id": f"${TYPE_KEY}",
            "count": {"$sum": 1},
        }},
        {"$sort": {"count": -1}},
        {"$limit": 10},
    ]
    relationships = list(db[RELATIONSHIPS_COLLECTION].aggregate(rel_type_pipeline))

    rel_risk_pipeline = [
        {"$match": {"$or": [
            {SOURCE_KEY: entity_id},
            {TARGET_KEY: entity_id},
        ]}},
        {"$group": {
            "_id": None,
            "total": {"$sum": 1},
            "high_risk": {"$sum": {"$cond": [{"$lt": ["$confidence", 0.5]}, 1, 0]}},
        }},
    ]
    rel_risk = list(db[RELATIONSHIPS_COLLECTION].aggregate(rel_risk_pipeline))
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
        entity = _fetch_customer_wire(db, eid)
        if not entity:
            return {"error": f"Entity {eid} not found"}

        t = entity_transaction_stats(eid, db)

        rels = db[RELATIONSHIPS_COLLECTION].count_documents({
            "$or": [{SOURCE_KEY: eid}, {TARGET_KEY: eid}]
        })

        return {
            "entity_id": eid,
            "name": entity.get("name", {}).get("full", ""),
            "entity_type": entity.get("entityType", ""),
            "risk_score": entity.get("riskAssessment", {}).get("overall", {}).get("score"),
            "risk_level": entity.get("riskAssessment", {}).get("overall", {}).get("level"),
            "watchlist_hits": len(entity.get("watchlistMatches", [])),
            "transaction_count": t.get("total_count", 0),
            "transaction_volume": round(t.get("total_volume", 0), 2),
            "flagged_transactions": t.get("flagged_count", 0),
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
    coll = db[FRAUD_EVAL_COLLECTION]

    # `fraudEvaluation` only ever holds AML-sourced entities' evaluations, so a
    # fraud-sourced id (out of scope for this surface -- see agentic_scoped())
    # would silently return "0 paths found" rather than a clear reason why.
    if not db["customers"].find_one(agentic_scoped({ef.CUSTOMER_ID: entity_id}), {"_id": 1}):
        return {"error": f"Entity {entity_id} not found"}

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
                     "amount": 1, "timestamp": 1, "modelResults.riskScore": 1,
                     "modelResults.flagged": 1},
                )
                .sort("modelResults.riskScore", -1)
                .limit(5)
            )
            for t in txns:
                counterparty = t.get(follow_field, "")
                if counterparty == entity_id:
                    continue
                model_results = t.get("modelResults", {})
                new_path = node["path"] + [{
                    "hop": hop + 1,
                    "from": t.get("fromEntityId"),
                    "to": t.get("toEntityId"),
                    "amount": t.get("amount", 0),
                    "risk_score": model_results.get("riskScore", 0),
                    "flagged": model_results.get("flagged", False),
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

    Reads the entity's profileEmbedding and runs MongoDB Vector Search to find
    the most similar entities. Useful for discovering entities that share
    patterns with known suspicious actors.
    """
    client = get_mongo_client()
    db = client[DB_NAME]

    entity = db["customers"].find_one(
        agentic_scoped({ef.CUSTOMER_ID: entity_id}),
        {"_id": 0, ef.CUSTOMER_ID: 1, ef.FULL_NAME: 1, ef.PROFILE_EMBEDDING: 1},
    )
    if not entity:
        return {"error": f"Entity {entity_id} not found"}

    embedding = entity.get(ef.PROFILE_EMBEDDING)
    if not embedding:
        return {"error": f"Entity {entity_id} has no profileEmbedding"}

    pipeline = [
        {
            "$vectorSearch": {
                "index": ENTITY_VECTOR_INDEX,
                "path": ef.PROFILE_EMBEDDING,
                "queryVector": embedding,
                "numCandidates": limit * 10,
                "limit": limit + 1,
                "filter": ef.vector_scope_filter(),
            }
        },
        # $vectorSearch's `filter` can only use indexed filter fields
        # (sourceSystem/type/status -- see LOAD-RECORD); rawScore isn't
        # indexed, so the AML-only cohort exclusion is applied post-search.
        {"$match": {ef.CUSTOMER_ID: {"$ne": entity_id}, **AML_ONLY_MATCH}},
        {"$limit": limit},
        {"$project": {
            "_id": 0,
            "entityId": f"${ef.CUSTOMER_ID}",
            "entityType": f"${ef.TYPE}",
            "name": {"full": f"${ef.FULL_NAME}"},
            "riskAssessment": {"overall": f"${ef.RISK_OVERALL}"},
            "score": {"$meta": "vectorSearchScore"},
        }},
    ]

    results = list(db["customers"].aggregate(pipeline))
    for r in results:
        r["entityType"] = ef.type_to_wire(r.get("entityType"))

    return {
        "query_entity": entity_id,
        "query_name": (entity.get("identification") or {}).get("fullName", ""),
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
