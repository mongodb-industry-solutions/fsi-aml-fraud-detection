"""Tools for querying entity transaction history.

Two disjoint sources feed `customers`' transaction history (see
threat360-migration/phase-2-migration/HANDOVER-phase2-step3c-agentic-migration-and-sar-defects.md
Q1/Q2): the AML-sourced cohort's evaluations live in `fraudEvaluation`
(linked via fromEntityId/toEntityId), while the fraud-sourced cohort's real
transaction history lives in `transactions` (linked via
payer.accountId/payee.accountId -- see
threat360-migration/build-scripts/build_sd6.py). A given customer belongs to
exactly one cohort, but nothing on the wire says which, so both must be
queried and merged -- querying only `fraudEvaluation` silently reports zero
transaction activity for every fraud-sourced customer.
"""

import logging
from langchain_core.tools import tool
from dependencies import get_mongo_client, DB_NAME

logger = logging.getLogger(__name__)

FRAUD_EVAL_COLLECTION = "fraudEvaluation"
TRANSACTIONS_COLLECTION = "transactions"


def _normalize_fraud_eval(t: dict) -> dict:
    return {
        "transactionId": t.get("transactionId"),
        "from": t.get("fromEntityId"),
        "to": t.get("toEntityId"),
        "amount": t.get("amount"),
        "currency": t.get("currency", "USD"),
        "type": t.get("transactionType"),
        "tags": t.get("ruleResults", {}).get("tags", []),
        "riskScore": t.get("modelResults", {}).get("riskScore", 0) or 0,
        "flagged": bool(t.get("modelResults", {}).get("flagged", False)),
        "timestamp": str(t.get("timestamp", "")),
    }


def _normalize_real_txn(t: dict) -> dict:
    risk = t.get("riskAssessment") or {}
    flags = risk.get("flags") or []
    return {
        "transactionId": t.get("txnId"),
        "from": (t.get("payer") or {}).get("accountId"),
        "to": (t.get("payee") or {}).get("accountId"),
        "amount": t.get("amount"),
        "currency": t.get("currency", "USD"),
        "type": t.get("transactionCategory"),
        "tags": flags,
        "riskScore": risk.get("score", 0) or 0,
        "flagged": bool(flags) or risk.get("level") in ("high", "critical"),
        "timestamp": str(t.get("createdAt", "")),
    }


def _entity_match(entity_id: str) -> list:
    """The two per-collection `$or` predicates for an entity, sharing one function so
    the field-name pairing (fraudEvaluation vs transactions) is defined once."""
    return [
        {"$or": [{"fromEntityId": entity_id}, {"toEntityId": entity_id}]},
        {"$or": [{"payer.accountId": entity_id}, {"payee.accountId": entity_id}]},
    ]


def entity_transaction_stats(entity_id: str, db) -> dict:
    """Aggregate transaction stats for an entity across both cohort collections."""
    fraud_eval_match, real_match = _entity_match(entity_id)

    fraud_eval = list(db[FRAUD_EVAL_COLLECTION].aggregate([
        {"$match": fraud_eval_match},
        {"$group": {
            "_id": None,
            "total_count": {"$sum": 1},
            "total_volume": {"$sum": "$amount"},
            "flagged_count": {"$sum": {"$cond": ["$modelResults.flagged", 1, 0]}},
            "max_risk": {"$max": "$modelResults.riskScore"},
            "risk_sum": {"$sum": "$modelResults.riskScore"},
        }},
    ]))
    real = list(db[TRANSACTIONS_COLLECTION].aggregate([
        {"$match": real_match},
        {"$group": {
            "_id": None,
            "total_count": {"$sum": 1},
            "total_volume": {"$sum": "$amount"},
            "flagged_count": {"$sum": {
                "$cond": [{"$gt": [{"$size": {"$ifNull": ["$riskAssessment.flags", []]}}, 0]}, 1, 0]
            }},
            "max_risk": {"$max": "$riskAssessment.score"},
            "risk_sum": {"$sum": "$riskAssessment.score"},
        }},
    ]))
    a = fraud_eval[0] if fraud_eval else {}
    b = real[0] if real else {}

    total_count = (a.get("total_count", 0) or 0) + (b.get("total_count", 0) or 0)
    risk_sum = (a.get("risk_sum", 0) or 0) + (b.get("risk_sum", 0) or 0)
    return {
        "total_count": total_count,
        "total_volume": (a.get("total_volume", 0) or 0) + (b.get("total_volume", 0) or 0),
        "flagged_count": (a.get("flagged_count", 0) or 0) + (b.get("flagged_count", 0) or 0),
        "max_risk": max(a.get("max_risk", 0) or 0, b.get("max_risk", 0) or 0),
        "avg_risk": round(risk_sum / total_count, 2) if total_count else 0,
    }


@tool
def query_entity_transactions(entity_id: str, limit: int = 50) -> dict:
    """Retrieve transactions where the entity is sender OR receiver.

    Checks both transaction sources feeding `customers` -- the AML-sourced
    cohort's `fraudEvaluation` evaluations and the fraud-sourced cohort's
    real `transactions` history -- since a given entity belongs to exactly
    one and there is no wire signal for which.

    Returns aggregate statistics plus the most suspicious individual
    transactions (flagged or high-risk-score first).
    """
    client = get_mongo_client()
    db = client[DB_NAME]
    fraud_eval_match, real_match = _entity_match(entity_id)

    fraud_eval_txns = db[FRAUD_EVAL_COLLECTION].find(
        fraud_eval_match, {"_id": 0}
    ).sort([("modelResults.riskScore", -1), ("modelResults.flagged", -1)]).limit(limit)
    real_txns = db[TRANSACTIONS_COLLECTION].find(
        real_match, {"_id": 0}
    ).sort([("riskAssessment.score", -1)]).limit(limit)

    txns = (
        [_normalize_fraud_eval(t) for t in fraud_eval_txns]
        + [_normalize_real_txn(t) for t in real_txns]
    )
    if not txns:
        return {"entity_id": entity_id, "total_count": 0, "transactions": []}

    txns.sort(key=lambda t: (t["riskScore"], t["flagged"]), reverse=True)
    txns = txns[:limit]

    total_volume = sum(t.get("amount") or 0 for t in txns)
    flagged = [t for t in txns if t.get("flagged")]
    all_tags = set()
    for t in txns:
        all_tags.update(t.get("tags", []))

    return {
        "entity_id": entity_id,
        "total_count": len(txns),
        "total_volume": round(total_volume, 2),
        "avg_amount": round(total_volume / len(txns), 2) if txns else 0,
        "flagged_count": len(flagged),
        "suspicious_tags": sorted(all_tags),
        "transactions": txns[:15],
    }
