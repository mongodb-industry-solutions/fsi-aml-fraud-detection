"""Triage Agent – scores alert severity and routes via Command."""

import json
import logging
from datetime import datetime, timezone

from langchain_core.messages import SystemMessage, HumanMessage
from langgraph.types import Command

from models.agents.investigation import TriageDecision
from services.agents.llm import get_llm
from services.agents.prompts import TRIAGE_SYSTEM
from services.agents.state import InvestigationState

logger = logging.getLogger(__name__)


def triage_node(state: InvestigationState) -> Command:
    llm = get_llm().with_structured_output(TriageDecision)
    alert = state.get("alert_data", {})

    decision: TriageDecision = llm.invoke([
        SystemMessage(content=TRIAGE_SYSTEM),
        HumanMessage(content=json.dumps(alert, default=str)),
    ])

    audit_entry = {
        "agent": "triage",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "decision": decision.model_dump(),
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
    return {"investigation_status": "closed_false_positive"}


def urgent_escalation_node(state: InvestigationState) -> dict:
    return {"investigation_status": "urgent_escalation"}
