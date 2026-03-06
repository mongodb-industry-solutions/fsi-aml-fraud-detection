"""Triage Agent – scores alert severity and routes via Command."""

import json
import logging
import time
from datetime import datetime, timezone

from langchain_core.messages import SystemMessage, HumanMessage
from langgraph.types import Command

from models.agents.investigation import TriageDecision
from services.agents.llm import get_llm, extract_token_usage
from services.agents.prompts import TRIAGE_SYSTEM
from services.agents.state import InvestigationState

logger = logging.getLogger(__name__)

_LLM_MODEL = "bedrock/anthropic-sonnet"


def triage_node(state: InvestigationState) -> Command:
    t0 = time.perf_counter()
    llm = get_llm().with_structured_output(TriageDecision, include_raw=True)
    alert = state.get("alert_data", {})

    result = llm.invoke([
        SystemMessage(content=TRIAGE_SYSTEM),
        HumanMessage(content=json.dumps(alert, default=str)),
    ])
    decision: TriageDecision = result["parsed"]
    token_usage = extract_token_usage(result["raw"])
    duration_ms = int((time.perf_counter() - t0) * 1000)

    audit_entry = {
        "agent": "triage",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "duration_ms": duration_ms,
        "llm_model": _LLM_MODEL,
        "token_usage": token_usage,
        "decision": decision.model_dump(),
        "reasoning": decision.reasoning[:300] if hasattr(decision, "reasoning") and decision.reasoning else "",
        "input_summary": f"entity_id={alert.get('entity_id','')}, alert_type={alert.get('alert_type','')}",
        "output_summary": f"disposition={decision.disposition}, risk_score={decision.risk_score}",
    }

    update = {
        "triage_decision": decision.model_dump(),
        "investigation_status": f"triage_{decision.disposition}",
        "agent_audit_log": [audit_entry],
    }

    if decision.disposition == "auto_close":
        return Command(goto="auto_close", update=update)
    elif decision.disposition == "escalate_urgent":
        return Command(goto="urgent_escalation", update=update)
    else:
        return Command(goto="data_gathering", update=update)


def auto_close_node(state: InvestigationState) -> dict:
    triage = state.get("triage_decision", {})
    return {
        "investigation_status": "closed_false_positive",
        "agent_audit_log": [{
            "agent": "auto_close",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "duration_ms": 0,
            "reasoning": f"False positive auto-closure — risk score {triage.get('risk_score', 'N/A')}",
        }],
    }


def urgent_escalation_node(state: InvestigationState) -> dict:
    triage = state.get("triage_decision", {})
    return {
        "investigation_status": "urgent_escalation",
        "agent_audit_log": [{
            "agent": "urgent_escalation",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "duration_ms": 0,
            "reasoning": f"Urgent escalation — risk score {triage.get('risk_score', 'N/A')}, disposition={triage.get('disposition', '')}",
        }],
    }
