"""Additional tools for the conversational AML assistant (chat agent)."""

import logging
from langchain_core.tools import tool
from dependencies import get_mongo_client, DB_NAME

logger = logging.getLogger(__name__)


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
        risk_level: 'low', 'medium', 'high', or 'critical' (optional)
        name_contains: partial name for case-insensitive search (optional)
        limit: max results (default 20)

    Returns matching entities with their entityId, name, type, risk info.
    """
    client = get_mongo_client()
    coll = client[DB_NAME]["entities"]

    query = {}
    if entity_type:
        query["entityType"] = entity_type
    if risk_level:
        query["riskAssessment.overall.level"] = {"$regex": f"^{risk_level}$", "$options": "i"}
    if name_contains:
        query["name.full"] = {"$regex": name_contains, "$options": "i"}

    cursor = coll.find(
        query,
        {
            "_id": 0,
            "entityId": 1,
            "entityType": 1,
            "name": 1,
            "scenarioKey": 1,
            "status": 1,
            "riskAssessment.overall": 1,
        },
    ).limit(limit)

    results = list(cursor)
    return {"count": len(results), "entities": results}


@tool
def get_risk_summary(entity_id: str) -> dict:
    """Generate a composite risk breakdown for an entity.

    Returns the full risk assessment (overall score, geographic risk, industry
    risk, transaction risk), watchlist hit count, transaction stats (flagged
    count, total volume), and network metrics (size, high-risk connections).
    """
    client = get_mongo_client()
    db = client[DB_NAME]

    entity = db["entities"].find_one(
        {"entityId": entity_id},
        {"_id": 0, "name": 1, "entityType": 1, "riskAssessment": 1, "watchlistMatches": 1},
    )
    if not entity:
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

    rel_pipeline = [
        {"$match": {"$or": [
            {"source.entityId": entity_id},
            {"target.entityId": entity_id},
        ]}},
        {"$group": {
            "_id": None,
            "network_size": {"$sum": 1},
            "high_risk": {"$sum": {"$cond": [{"$lt": ["$confidence", 0.5]}, 1, 0]}},
        }},
    ]
    rel_stats = list(db["relationships"].aggregate(rel_pipeline))
    rel = rel_stats[0] if rel_stats else {}

    return {
        "entity_id": entity_id,
        "name": entity.get("name", {}).get("full", ""),
        "entity_type": entity.get("entityType", ""),
        "risk_assessment": entity.get("riskAssessment", {}),
        "watchlist_hits": len(entity.get("watchlistMatches", [])),
        "transaction_stats": {
            "total_count": txn.get("total_count", 0),
            "total_volume": round(txn.get("total_volume", 0), 2),
            "flagged_count": txn.get("flagged_count", 0),
            "max_risk_score": txn.get("max_risk", 0),
            "avg_risk_score": round(txn.get("avg_risk", 0), 2),
        },
        "network_stats": {
            "total_relationships": rel.get("network_size", 0),
            "high_risk_connections": rel.get("high_risk", 0),
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
