"""Temporal Analysis Agent -- detects time-based suspicious patterns via MongoDB aggregation.

Pure compute node (no LLM). Runs in parallel with network_analyst after typology.
"""

import json
import logging
import time
from datetime import datetime, timezone

from dependencies import get_mongo_client, DB_NAME
from models.agents.investigation import TemporalAnalysis
from services.agents.state import InvestigationState

logger = logging.getLogger(__name__)

COLLECTION = "transactionsv2"
STRUCTURING_THRESHOLD = 10_000
STRUCTURING_LOWER = 8_000
DORMANCY_GAP_DAYS = 30
VELOCITY_ZSCORE_THRESHOLD = 2.0


def _detect_structuring(db, entity_id: str) -> list[dict]:
    """Find transactions just below the reporting threshold within short windows."""
    pipeline = [
        {"$match": {
            "$or": [{"fromEntityId": entity_id}, {"toEntityId": entity_id}],
            "amount": {"$gte": STRUCTURING_LOWER, "$lt": STRUCTURING_THRESHOLD},
        }},
        {"$addFields": {
            "day": {"$dateToString": {"format": "%Y-%m-%d", "date": "$timestamp"}},
        }},
        {"$group": {
            "_id": "$day",
            "count": {"$sum": 1},
            "total": {"$sum": "$amount"},
            "avg_amount": {"$avg": "$amount"},
            "transactions": {"$push": {
                "transactionId": "$transactionId",
                "amount": "$amount",
                "timestamp": "$timestamp",
            }},
        }},
        {"$match": {"count": {"$gte": 2}}},
        {"$sort": {"count": -1}},
        {"$limit": 10},
        {"$project": {
            "_id": 0,
            "date": "$_id",
            "count": 1,
            "total": {"$round": ["$total", 2]},
            "avg_amount": {"$round": ["$avg_amount", 2]},
            "transaction_ids": "$transactions.transactionId",
        }},
    ]
    return list(db[COLLECTION].aggregate(pipeline))


def _detect_velocity_anomalies(db, entity_id: str) -> list[dict]:
    """Detect periods where transaction frequency spikes above the entity's baseline."""
    pipeline = [
        {"$match": {
            "$or": [{"fromEntityId": entity_id}, {"toEntityId": entity_id}],
        }},
        {"$addFields": {
            "week": {"$dateToString": {"format": "%Y-W%V", "date": "$timestamp"}},
        }},
        {"$group": {
            "_id": "$week",
            "count": {"$sum": 1},
            "volume": {"$sum": "$amount"},
        }},
        {"$sort": {"_id": 1}},
        {"$group": {
            "_id": None,
            "weeks": {"$push": {"week": "$_id", "count": "$count", "volume": "$volume"}},
            "avg_count": {"$avg": "$count"},
            "std_count": {"$stdDevPop": "$count"},
        }},
    ]
    result = list(db[COLLECTION].aggregate(pipeline))
    if not result:
        return []

    stats = result[0]
    avg = stats.get("avg_count", 0)
    std = stats.get("std_count", 0)
    if std == 0:
        return []

    anomalies = []
    for w in stats.get("weeks", []):
        z = (w["count"] - avg) / std if std > 0 else 0
        if z >= VELOCITY_ZSCORE_THRESHOLD:
            anomalies.append({
                "week": w["week"],
                "transaction_count": w["count"],
                "volume": round(w["volume"], 2),
                "z_score": round(z, 2),
                "baseline_avg": round(avg, 2),
            })
    return sorted(anomalies, key=lambda x: x["z_score"], reverse=True)[:10]


def _detect_round_trips(db, entity_id: str) -> list[dict]:
    """Find A->B->A fund-flow cycles (money returning to the subject entity)."""
    pipeline = [
        {"$match": {"fromEntityId": entity_id}},
        {"$lookup": {
            "from": COLLECTION,
            "let": {"counterparty": "$toEntityId", "outgoing_ts": "$timestamp"},
            "pipeline": [
                {"$match": {"$expr": {"$and": [
                    {"$eq": ["$fromEntityId", "$$counterparty"]},
                    {"$eq": ["$toEntityId", entity_id]},
                    {"$gt": ["$timestamp", "$$outgoing_ts"]},
                ]}}},
                {"$limit": 1},
            ],
            "as": "return_txn",
        }},
        {"$match": {"return_txn": {"$ne": []}}},
        {"$project": {
            "_id": 0,
            "counterparty": "$toEntityId",
            "outgoing_id": "$transactionId",
            "outgoing_amount": "$amount",
            "outgoing_date": "$timestamp",
            "return_id": {"$arrayElemAt": ["$return_txn.transactionId", 0]},
            "return_amount": {"$arrayElemAt": ["$return_txn.amount", 0]},
            "return_date": {"$arrayElemAt": ["$return_txn.timestamp", 0]},
        }},
        {"$limit": 10},
    ]
    return list(db[COLLECTION].aggregate(pipeline))


def _detect_time_anomalies(db, entity_id: str) -> list[dict]:
    """Detect transactions at unusual hours (before 6 AM or after 10 PM)."""
    pipeline = [
        {"$match": {
            "$or": [{"fromEntityId": entity_id}, {"toEntityId": entity_id}],
        }},
        {"$addFields": {
            "hour": {"$hour": "$timestamp"},
            "day_of_week": {"$dayOfWeek": "$timestamp"},
        }},
        {"$facet": {
            "hour_distribution": [
                {"$group": {"_id": "$hour", "count": {"$sum": 1}}},
                {"$sort": {"_id": 1}},
            ],
            "off_hours": [
                {"$match": {"$or": [
                    {"hour": {"$lt": 6}},
                    {"hour": {"$gte": 22}},
                ]}},
                {"$group": {
                    "_id": None,
                    "count": {"$sum": 1},
                    "total_amount": {"$sum": "$amount"},
                    "sample_ids": {"$push": "$transactionId"},
                }},
            ],
            "weekend": [
                {"$match": {"day_of_week": {"$in": [1, 7]}}},
                {"$group": {
                    "_id": None,
                    "count": {"$sum": 1},
                    "total_amount": {"$sum": "$amount"},
                }},
            ],
        }},
    ]
    result = list(db[COLLECTION].aggregate(pipeline))
    if not result:
        return []

    facets = result[0]
    anomalies = []

    off_hours = facets.get("off_hours", [])
    if off_hours and off_hours[0].get("count", 0) > 0:
        oh = off_hours[0]
        anomalies.append({
            "type": "off_hours_activity",
            "count": oh["count"],
            "total_amount": round(oh.get("total_amount", 0), 2),
            "sample_ids": oh.get("sample_ids", [])[:5],
        })

    weekend = facets.get("weekend", [])
    if weekend and weekend[0].get("count", 0) > 0:
        wk = weekend[0]
        anomalies.append({
            "type": "weekend_activity",
            "count": wk["count"],
            "total_amount": round(wk.get("total_amount", 0), 2),
        })

    return anomalies


def _detect_dormancy_bursts(db, entity_id: str) -> list[dict]:
    """Detect long inactivity gaps followed by burst activity."""
    pipeline = [
        {"$match": {
            "$or": [{"fromEntityId": entity_id}, {"toEntityId": entity_id}],
        }},
        {"$sort": {"timestamp": 1}},
        {"$group": {
            "_id": None,
            "timestamps": {"$push": "$timestamp"},
            "amounts": {"$push": "$amount"},
            "ids": {"$push": "$transactionId"},
        }},
    ]
    result = list(db[COLLECTION].aggregate(pipeline))
    if not result or len(result[0].get("timestamps", [])) < 3:
        return []

    data = result[0]
    timestamps = data["timestamps"]
    amounts = data["amounts"]
    tx_ids = data["ids"]

    bursts = []
    for i in range(1, len(timestamps)):
        prev = timestamps[i - 1]
        curr = timestamps[i]
        if not prev or not curr:
            continue
        gap_days = (curr - prev).total_seconds() / 86400
        if gap_days >= DORMANCY_GAP_DAYS:
            burst_end = min(i + 5, len(timestamps))
            burst_txns = burst_end - i
            burst_volume = sum(amounts[i:burst_end])
            bursts.append({
                "dormancy_days": round(gap_days, 1),
                "dormancy_ended": str(curr),
                "burst_transaction_count": burst_txns,
                "burst_volume": round(burst_volume, 2),
                "sample_ids": tx_ids[i:burst_end][:5],
            })

    return sorted(bursts, key=lambda x: x["dormancy_days"], reverse=True)[:5]


def temporal_analyst_node(state: InvestigationState) -> dict:
    t0 = time.perf_counter()
    gathered = state.get("gathered_data", {})
    entity_id = (
        gathered.get("entity_profile", {}).get("entityId")
        or state.get("alert_data", {}).get("entity_id", "")
    )

    if not entity_id:
        duration_ms = int((time.perf_counter() - t0) * 1000)
        profile = TemporalAnalysis(timeline_summary="No entity ID available.")
        return {
            "temporal_analysis": profile.model_dump(),
            "_node_tool_calls": [{
                "tool": "temporal_analysis",
                "input": json.dumps({"entity_id": ""}),
                "output": json.dumps({"skipped": True, "reason": "no entity ID"}),
            }],
            "agent_audit_log": [{
                "agent": "temporal_analyst",
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "duration_ms": duration_ms,
                "reasoning": "No entity ID available for temporal analysis",
            }],
        }

    client = get_mongo_client()
    db = client[DB_NAME]

    structuring = _detect_structuring(db, entity_id)
    velocity = _detect_velocity_anomalies(db, entity_id)
    round_trips = _detect_round_trips(db, entity_id)
    time_anomalies = _detect_time_anomalies(db, entity_id)
    dormancy = _detect_dormancy_bursts(db, entity_id)

    summary_parts = []
    if structuring:
        summary_parts.append(
            f"{len(structuring)} structuring pattern(s) detected "
            f"({sum(s['count'] for s in structuring)} sub-threshold transactions)."
        )
    if velocity:
        summary_parts.append(
            f"{len(velocity)} velocity spike(s) (max z-score: "
            f"{max(v['z_score'] for v in velocity):.1f})."
        )
    if round_trips:
        summary_parts.append(f"{len(round_trips)} round-trip fund flow(s) detected.")
    if time_anomalies:
        summary_parts.append(
            f"Time anomalies: {', '.join(a['type'] for a in time_anomalies)}."
        )
    if dormancy:
        summary_parts.append(
            f"{len(dormancy)} dormancy-burst pattern(s) "
            f"(max gap: {max(d['dormancy_days'] for d in dormancy):.0f} days)."
        )
    if not summary_parts:
        summary_parts.append("No significant temporal anomalies detected.")

    profile = TemporalAnalysis(
        structuring_indicators=structuring,
        velocity_anomalies=velocity,
        round_trip_patterns=round_trips,
        time_anomalies=time_anomalies,
        dormancy_bursts=dormancy,
        timeline_summary=" ".join(summary_parts),
    )

    tool_output = {
        "structuring_count": len(structuring),
        "velocity_anomaly_count": len(velocity),
        "round_trip_count": len(round_trips),
        "time_anomaly_count": len(time_anomalies),
        "dormancy_burst_count": len(dormancy),
    }

    duration_ms = int((time.perf_counter() - t0) * 1000)

    audit_entry = {
        "agent": "temporal_analyst",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "duration_ms": duration_ms,
        **tool_output,
        "reasoning": " ".join(summary_parts),
        "output_summary": (
            f"structuring={len(structuring)}, velocity={len(velocity)}, "
            f"round_trips={len(round_trips)}, time={len(time_anomalies)}, "
            f"dormancy={len(dormancy)}"
        ),
    }

    trace_entry = {
        "tool": "temporal_analysis",
        "agent": "temporal_analyst",
        "input": json.dumps({"entity_id": entity_id}),
        "output": json.dumps(tool_output),
        "duration_ms": duration_ms,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }

    return {
        "temporal_analysis": profile.model_dump(),
        "_node_tool_calls": [{
            "tool": "temporal_analysis",
            "input": json.dumps({"entity_id": entity_id}),
            "output": json.dumps(tool_output),
        }],
        "tool_trace_log": [trace_entry],
        "agent_audit_log": [audit_entry],
    }
