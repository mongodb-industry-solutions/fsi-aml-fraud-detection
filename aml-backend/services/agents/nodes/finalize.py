"""Finalize Agent – assembles the final case document and persists to MongoDB."""

import logging
import time
import uuid
from datetime import datetime, timezone

from dependencies import get_mongo_client, DB_NAME
from services.agents.state import InvestigationState

logger = logging.getLogger(__name__)


def finalize_node(state: InvestigationState) -> dict:
    t0 = time.perf_counter()
    case_id = f"CASE-{uuid.uuid4().hex[:8].upper()}"
    now = datetime.now(timezone.utc)

    human = state.get("human_decision", {})
    decision = human.get("decision", "approved") if human else "auto_finalized"

    upstream_status = state.get("investigation_status", "")
    if upstream_status == "closed_false_positive":
        final_status = "closed_false_positive"
    elif decision == "approve":
        final_status = "filed"
    else:
        final_status = "closed"

    audit_log = state.get("agent_audit_log", [])
    tool_trace = state.get("tool_trace_log", [])

    llm_nodes = {
        "triage", "case_assembly", "narrative", "validator",
        "trail_follower",
    }
    llm_calls_count = sum(1 for e in audit_log if e.get("agent") in llm_nodes and e.get("llm_model"))
    llm_calls_count += sum(
        1 for e in audit_log
        if e.get("agent", "").startswith("mini_investigate:") and e.get("llm_model")
    )
    total_node_duration = sum(e.get("duration_ms", 0) for e in audit_log)

    case_file_entity = state.get("case_file", {}).get("entity", {})
    case_document = {
        "case_id": case_id,
        "created_at": now.isoformat(),
        "entity_id": case_file_entity.get("entity_id") or state.get("alert_data", {}).get("entity_id", ""),
        "entity_name": case_file_entity.get("name", ""),
        "alert_data": state.get("alert_data", {}),
        "investigation_status": final_status,
        "triage_decision": state.get("triage_decision", {}),
        "case_file": state.get("case_file", {}),
        "typology": state.get("typology", {}),
        "network_analysis": state.get("network_analysis", {}),
        "temporal_analysis": state.get("temporal_analysis", {}),
        "trail_analysis": state.get("trail_analysis", {}),
        "sub_investigation_findings": state.get("sub_investigation_findings", {}),
        "narrative": state.get("narrative", {}),
        "validation_result": state.get("validation_result", {}),
        "human_decision": human,
        "agent_audit_log": audit_log,
        "tool_trace_log": tool_trace,
        "pipeline_metrics": {
            "total_node_duration_ms": total_node_duration,
            "llm_calls_count": llm_calls_count,
            "tool_calls_count": len(tool_trace),
            "nodes_executed": [e.get("agent") for e in audit_log],
            "validation_loops": state.get("validation_count", 0),
            "total_input_tokens": sum(e.get("token_usage", {}).get("input_tokens", 0) for e in audit_log),
            "total_output_tokens": sum(e.get("token_usage", {}).get("output_tokens", 0) for e in audit_log),
            "total_tokens": sum(e.get("token_usage", {}).get("total_tokens", 0) for e in audit_log),
        },
    }

    persistence_error = None
    try:
        client = get_mongo_client()
        client[DB_NAME]["investigations"].insert_one(case_document)
        logger.info("Investigation %s persisted to MongoDB", case_id)
    except Exception as exc:
        logger.exception("Failed to persist investigation %s", case_id)
        persistence_error = str(exc)

    duration_ms = int((time.perf_counter() - t0) * 1000)

    audit_entry = {
        "agent": "finalize",
        "timestamp": now.isoformat(),
        "duration_ms": duration_ms,
        "case_id": case_id,
        "final_status": case_document["investigation_status"],
        "pipeline_metrics": case_document["pipeline_metrics"],
    }
    if persistence_error:
        audit_entry["persistence_error"] = persistence_error

    return {
        "investigation_status": case_document["investigation_status"],
        "case_id": case_id,
        "agent_audit_log": [audit_entry],
    }
