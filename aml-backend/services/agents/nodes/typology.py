"""Typology Agent – classifies suspicious activity into crime typologies."""

import json
import logging
from datetime import datetime, timezone

from langchain_core.messages import SystemMessage, HumanMessage

from models.agents.investigation import TypologyResult
from services.agents.llm import get_llm
from services.agents.prompts import TYPOLOGY_SYSTEM
from services.agents.state import InvestigationState
from services.agents.tools.policy_tools import search_typologies

logger = logging.getLogger(__name__)

_MAX_TOOL_OUTPUT = 3000


def typology_node(state: InvestigationState) -> dict:
    case_file = state.get("case_file", {})
    triage = state.get("triage_decision", {})

    hint = triage.get("typology_hint", "")
    tool_calls = []
    relevant_typologies = []
    if hint:
        tool_input = {"query": hint}
        relevant_typologies = search_typologies.invoke(tool_input)
        output_text = json.dumps(relevant_typologies, default=str)
        tool_calls.append({
            "tool": "search_typologies",
            "input": json.dumps(tool_input),
            "output": output_text[:_MAX_TOOL_OUTPUT] + "..." if len(output_text) > _MAX_TOOL_OUTPUT else output_text,
        })

    case_summary = json.dumps(case_file, default=str)[:8000]
    typology_context = json.dumps(relevant_typologies, default=str)[:4000] if relevant_typologies else "No specific typology hints."

    llm = get_llm().with_structured_output(TypologyResult)
    result: TypologyResult = llm.invoke([
        SystemMessage(content=TYPOLOGY_SYSTEM),
        HumanMessage(content=(
            f"CASE FILE:\n{case_summary}\n\n"
            f"RELEVANT TYPOLOGIES FROM LIBRARY:\n{typology_context}"
        )),
    ])

    audit_entry = {
        "agent": "typology",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "primary": result.primary_typology.value,
        "confidence": result.confidence,
    }

    return {
        "typology": result.model_dump(),
        "investigation_status": "typology_classified",
        "_node_tool_calls": tool_calls,
        "agent_audit_log": [audit_entry],
    }
