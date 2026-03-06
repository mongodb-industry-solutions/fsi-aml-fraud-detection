"""Typology Agent – classifies suspicious activity into crime typologies."""

import json
import logging
import time
from datetime import datetime, timezone

from langchain_core.messages import SystemMessage, HumanMessage

from models.agents.investigation import TypologyResult
from services.agents.llm import get_llm
from services.agents.prompts import TYPOLOGY_SYSTEM
from services.agents.state import InvestigationState
from services.agents.tools.policy_tools import search_typologies

logger = logging.getLogger(__name__)

_MAX_TOOL_OUTPUT = 3000
_LLM_MODEL = "bedrock/anthropic-sonnet"


def typology_node(state: InvestigationState) -> dict:
    t0 = time.perf_counter()
    case_file = state.get("case_file", {})
    triage = state.get("triage_decision", {})

    hint = triage.get("typology_hint", "")
    tool_calls = []
    trace_entries = []
    relevant_typologies = []
    if hint:
        tool_input = {"query": hint}
        t_tool = time.perf_counter()
        relevant_typologies = search_typologies.invoke(tool_input)
        tool_dur = int((time.perf_counter() - t_tool) * 1000)
        output_text = json.dumps(relevant_typologies, default=str)
        truncated = output_text[:_MAX_TOOL_OUTPUT] + "..." if len(output_text) > _MAX_TOOL_OUTPUT else output_text
        tool_calls.append({
            "tool": "search_typologies",
            "input": json.dumps(tool_input),
            "output": truncated,
        })
        trace_entries.append({
            "tool": "search_typologies",
            "agent": "typology",
            "input": json.dumps(tool_input),
            "output": truncated,
            "duration_ms": tool_dur,
            "timestamp": datetime.now(timezone.utc).isoformat(),
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
    duration_ms = int((time.perf_counter() - t0) * 1000)

    result_dump = result.model_dump()
    secondary = result_dump.get("secondary_typologies", [])

    audit_entry = {
        "agent": "typology",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "duration_ms": duration_ms,
        "llm_model": _LLM_MODEL,
        "primary": result.primary_typology.value,
        "confidence": result.confidence,
        "secondary_typologies": [s.get("typology", "") if isinstance(s, dict) else str(s) for s in secondary[:3]],
        "reasoning": result_dump.get("reasoning", "")[:300],
        "input_summary": f"case_file with {len(case_file)} keys, hint={hint or 'none'}",
        "output_summary": f"primary={result.primary_typology.value}, confidence={result.confidence}",
    }

    return {
        "typology": result_dump,
        "investigation_status": "typology_classified",
        "_node_tool_calls": tool_calls,
        "tool_trace_log": trace_entries,
        "agent_audit_log": [audit_entry],
    }
