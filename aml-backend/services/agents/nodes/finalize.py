"""Finalize Agent – assembles the final case document and persists to MongoDB."""

import logging
import uuid
from datetime import datetime, timezone

from dependencies import get_mongo_client, DB_NAME
from services.agents.state import InvestigationState

logger = logging.getLogger(__name__)


def finalize_node(state: InvestigationState) -> dict:
    case_id = f"CASE-{uuid.uuid4().hex[:8].upper()}"
    now = datetime.now(timezone.utc)

    human = state.get("human_decision", {})
    decision = human.get("decision", "approved") if human else "auto_finalized"

    case_document = {
        "case_id": case_id,
        "created_at": now.isoformat(),
        "entity_id": state.get("alert_data", {}).get("entity_id", ""),
        "alert_data": state.get("alert_data", {}),
        "investigation_status": "filed" if decision == "approve" else "closed",
        "triage_decision": state.get("triage_decision", {}),
        "case_file": state.get("case_file", {}),
        "typology": state.get("typology", {}),
        "network_analysis": state.get("network_analysis", {}),
        "narrative": state.get("narrative", {}),
        "validation_result": state.get("validation_result", {}),
        "human_decision": human,
        "agent_audit_log": state.get("agent_audit_log", []),
    }

    persistence_error = None
    try:
        client = get_mongo_client()
        client[DB_NAME]["investigations"].insert_one(case_document)
        logger.info("Investigation %s persisted to MongoDB", case_id)
    except Exception as exc:
        logger.exception("Failed to persist investigation %s", case_id)
        persistence_error = str(exc)

    audit_entry = {
        "agent": "finalize",
        "timestamp": now.isoformat(),
        "case_id": case_id,
        "final_status": case_document["investigation_status"],
    }
    if persistence_error:
        audit_entry["persistence_error"] = persistence_error

    return {
        "investigation_status": case_document["investigation_status"],
        "case_id": case_id,
        "agent_audit_log": [audit_entry],
    }
