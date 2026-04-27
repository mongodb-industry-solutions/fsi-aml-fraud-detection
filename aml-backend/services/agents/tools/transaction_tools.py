"""Tools for querying the transactionsv2 collection."""

import logging
from langchain_core.tools import tool
from dependencies import get_mongo_client, DB_NAME

logger = logging.getLogger(__name__)

COLLECTION = "transactionsv2"


@tool
def query_entity_transactions(entity_id: str, limit: int = 50) -> dict:
    """Retrieve transactions where the entity is sender OR receiver.

    Returns aggregate statistics plus the most suspicious individual
    transactions (flagged or high-risk-score first).
    """
    client = get_mongo_client()
    coll = client[DB_NAME][COLLECTION]

    cursor = coll.find(
        {"$or": [{"fromEntityId": entity_id}, {"toEntityId": entity_id}]},
        {"_id": 0},
    ).sort([("riskScore", -1), ("flagged", -1)]).limit(limit)

    txns = list(cursor)
    if not txns:
        return {"entity_id": entity_id, "total_count": 0, "transactions": []}

    total_volume = sum(t.get("amount", 0) for t in txns)
    flagged = [t for t in txns if t.get("flagged")]
    all_tags = set()
    for t in txns:
        all_tags.update(t.get("tags", []))

    top_txns = []
    for t in txns[:15]:
        top_txns.append({
            "transactionId": t.get("transactionId"),
            "from": t.get("fromEntityId"),
            "to": t.get("toEntityId"),
            "amount": t.get("amount"),
            "currency": t.get("currency", "USD"),
            "type": t.get("transactionType"),
            "tags": t.get("tags", []),
            "riskScore": t.get("riskScore", 0),
            "flagged": t.get("flagged", False),
            "timestamp": str(t.get("timestamp", "")),
        })

    return {
        "entity_id": entity_id,
        "total_count": len(txns),
        "total_volume": round(total_volume, 2),
        "avg_amount": round(total_volume / len(txns), 2) if txns else 0,
        "flagged_count": len(flagged),
        "suspicious_tags": sorted(all_tags),
        "transactions": top_txns,
    }
