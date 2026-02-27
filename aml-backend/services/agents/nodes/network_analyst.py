"""Network Analysis Agent – computes graph metrics from real MongoDB data."""

import json
import logging
from datetime import datetime, timezone

from dependencies import get_mongo_client, DB_NAME
from models.agents.investigation import NetworkRiskProfile
from services.agents.state import InvestigationState

logger = logging.getLogger(__name__)


def _compute_degree_centrality(db, entity_id: str, network_size: int) -> float:
    """Degree centrality = (in_degree + out_degree) / (2 * (N - 1)), normalized 0-1."""
    if network_size <= 1:
        return 0.0

    out_degree = db["relationships"].count_documents({"source.entityId": entity_id})
    in_degree = db["relationships"].count_documents({"target.entityId": entity_id})

    max_possible = 2 * (network_size - 1)
    return min((out_degree + in_degree) / max_possible, 1.0) if max_possible > 0 else 0.0


def _compute_network_risk(db, entity_id: str, suspicious_connections: list) -> dict:
    """Compute network risk score from the entity's own risk + connected entity risks."""
    entity = db["entities"].find_one(
        {"entityId": entity_id},
        {"riskAssessment.overall.score": 1, "_id": 0},
    )
    base_risk = 0.0
    if entity:
        base_risk = entity.get("riskAssessment", {}).get("overall", {}).get("score", 0.0)

    if not suspicious_connections:
        return {"base_entity_risk": base_risk, "network_risk_score": base_risk}

    target_ids = [c.get("target") for c in suspicious_connections if c.get("target")]
    if not target_ids:
        return {"base_entity_risk": base_risk, "network_risk_score": base_risk}

    connected_entities = list(db["entities"].find(
        {"entityId": {"$in": target_ids}},
        {"entityId": 1, "riskAssessment.overall.score": 1, "_id": 0},
    ))

    risk_by_id = {
        e["entityId"]: e.get("riskAssessment", {}).get("overall", {}).get("score", 0.0)
        for e in connected_entities
    }

    total_weighted_risk = 0.0
    weight_sum = 0.0
    for conn in suspicious_connections:
        target = conn.get("target")
        strength = conn.get("strength", 0.5)
        if target and target in risk_by_id:
            total_weighted_risk += risk_by_id[target] * strength
            weight_sum += strength

    connection_risk_factor = (total_weighted_risk / weight_sum * 0.3) if weight_sum > 0 else 0.0
    network_risk_score = min(base_risk + connection_risk_factor, 100.0)

    return {"base_entity_risk": base_risk, "network_risk_score": network_risk_score}


def network_analyst_node(state: InvestigationState) -> dict:
    gathered = state.get("gathered_data", {})
    network_data = gathered.get("network", {})
    entity_id = network_data.get("entity_id", state.get("alert_data", {}).get("entity_id", ""))

    if not network_data or network_data.get("network_size", 0) == 0:
        profile = NetworkRiskProfile(summary="No network data available.")
        return {
            "network_analysis": profile.model_dump(),
            "_node_tool_calls": [{
                "tool": "compute_network_metrics",
                "input": json.dumps({"entity_id": entity_id}),
                "output": json.dumps({"skipped": True, "reason": "no network data"}),
            }],
            "agent_audit_log": [{
                "agent": "network_analyst",
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "network_size": 0,
                "high_risk_connections": 0,
            }],
        }

    client = get_mongo_client()
    db = client[DB_NAME]

    network_size = network_data.get("network_size", 0)
    high_risk_connections = network_data.get("high_risk_connections", 0)
    shell_indicators = network_data.get("shell_structure_indicators", [])
    suspicious_connections = network_data.get("suspicious_connections", [])

    degree_centrality = _compute_degree_centrality(db, entity_id, network_size)
    risk_result = _compute_network_risk(db, entity_id, suspicious_connections)

    key_connections = [
        {"target": c.get("target"), "type": c.get("type"), "strength": c.get("strength", 0)}
        for c in suspicious_connections[:5]
    ]

    summary_parts = [f"Network of {network_size} entities with {high_risk_connections} high-risk connections."]
    if degree_centrality > 0.5:
        summary_parts.append(f"High centrality ({degree_centrality:.2f}) indicates hub entity.")
    if shell_indicators:
        summary_parts.append("Shell structure indicators present.")
    summary_parts.append(f"Network risk score: {risk_result['network_risk_score']:.1f}/100.")

    profile = NetworkRiskProfile(
        network_size=network_size,
        high_risk_connections=high_risk_connections,
        max_depth_reached=network_data.get("max_depth_reached", 0),
        shell_structure_indicators=shell_indicators,
        degree_centrality=round(degree_centrality, 4),
        network_risk_score=round(risk_result["network_risk_score"], 2),
        base_entity_risk=round(risk_result["base_entity_risk"], 2),
        key_connections=key_connections,
        summary=" ".join(summary_parts),
    )

    tool_output = {
        "degree_centrality": profile.degree_centrality,
        "network_risk_score": profile.network_risk_score,
        "base_entity_risk": profile.base_entity_risk,
        "network_size": profile.network_size,
    }

    audit_entry = {
        "agent": "network_analyst",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "network_size": profile.network_size,
        "high_risk_connections": profile.high_risk_connections,
        "degree_centrality": profile.degree_centrality,
        "network_risk_score": profile.network_risk_score,
    }

    return {
        "network_analysis": profile.model_dump(),
        "_node_tool_calls": [{
            "tool": "compute_network_metrics",
            "input": json.dumps({"entity_id": entity_id, "network_size": network_size}),
            "output": json.dumps(tool_output),
        }],
        "agent_audit_log": [audit_entry],
    }
