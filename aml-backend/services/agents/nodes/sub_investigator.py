"""Sub-Investigation Agent -- parallel mini-investigations of connected entities.

Uses Send-based fan-out (same pattern as data_gatherer) to investigate
leads identified by the trail_follower. Each mini_investigate worker
runs tool calls + a single LLM assessment. Results flow directly to the
narrative node for synthesis.
"""

import json
import logging
import time
from datetime import datetime, timezone
from typing import TypedDict

from langchain_core.messages import SystemMessage, HumanMessage
from langgraph.types import Send, Command

from models.agents.investigation import LeadAssessment
from services.agents.llm import get_llm, extract_token_usage
from services.agents.prompts import LEAD_ASSESSMENT_SYSTEM
from services.agents.state import InvestigationState
from services.agents.tools.entity_tools import get_entity_profile, screen_watchlists
from services.agents.tools.transaction_tools import query_entity_transactions
from services.agents.tools.network_tools import analyze_entity_network

logger = logging.getLogger(__name__)

_MAX_TOOL_OUTPUT = 3000
_LLM_MODEL = "bedrock/anthropic-sonnet"


def _serialize(obj) -> str:
    try:
        text = json.dumps(obj, default=str)
    except Exception:
        text = str(obj)
    return text[:_MAX_TOOL_OUTPUT] + "..." if len(text) > _MAX_TOOL_OUTPUT else text


class SubInvestigateTask(TypedDict):
    task: str
    entity_id: str
    entity_name: str
    reason: str
    parent_context: str


# ── Fan-out dispatcher ────────────────────────────────────────────────

def dispatch_sub_investigations(state: InvestigationState) -> Command:
    """Read leads from trail_analysis and fan-out mini-investigations via Send."""
    trail = state.get("trail_analysis", {})
    leads = trail.get("leads", [])

    if not leads:
        return Command(
            goto="narrative",
            update={
                "investigation_status": "sub_investigations_skipped",
                "agent_audit_log": [{
                    "agent": "sub_investigation_dispatch",
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "leads_dispatched": 0,
                    "reasoning": "No leads from trail analysis",
                }],
            },
        )

    parent_context = json.dumps({
        "subject_entity": state.get("case_file", {}).get("entity", {}),
        "typology": state.get("typology", {}),
    }, default=str)[:4000]

    send_targets = []
    for lead in leads[:3]:
        eid = lead.get("entity_id", "") if isinstance(lead, dict) else lead.entity_id
        ename = lead.get("entity_name", "") if isinstance(lead, dict) else lead.entity_name
        reason = lead.get("reason", "") if isinstance(lead, dict) else lead.reason
        send_targets.append(
            Send("mini_investigate", {
                "task": "mini_investigate",
                "entity_id": eid,
                "entity_name": ename,
                "reason": reason,
                "parent_context": parent_context,
            })
        )

    return Command(
        goto=send_targets,
        update={
            "investigation_status": "sub_investigations_started",
            "agent_audit_log": [{
                "agent": "sub_investigation_dispatch",
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "leads_dispatched": len(send_targets),
                "lead_ids": [
                    lead.get("entity_id", "") if isinstance(lead, dict) else lead.entity_id
                    for lead in leads[:3]
                ],
            }],
        },
    )


# ── Mini-investigation worker ─────────────────────────────────────────

def mini_investigate_node(state: SubInvestigateTask) -> dict:
    """Self-contained worker: fetch all data, then LLM-assess the lead."""
    t0 = time.perf_counter()
    entity_id = state["entity_id"]
    entity_name = state.get("entity_name", "")
    reason = state.get("reason", "")
    parent_context = state.get("parent_context", "{}")

    tool_calls = []
    trace_entries = []

    def _run_tool(tool_name, tool_fn, tool_input):
        t_tool = time.perf_counter()
        try:
            result = tool_fn.invoke(tool_input)
        except Exception as exc:
            logger.warning("Sub-investigation tool %s failed for %s: %s", tool_name, entity_id, exc)
            result = {"error": str(exc)}
        dur = int((time.perf_counter() - t_tool) * 1000)
        serialized = _serialize(result)
        tool_calls.append({
            "tool": tool_name,
            "input": json.dumps(tool_input),
            "output": serialized,
        })
        trace_entries.append({
            "tool": tool_name,
            "agent": f"mini_investigate:{entity_id}",
            "input": json.dumps(tool_input),
            "output": serialized,
            "duration_ms": dur,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })
        return result

    profile = _run_tool("get_entity_profile", get_entity_profile, {"entity_id": entity_id})
    watchlist = _run_tool("screen_watchlists", screen_watchlists, {"entity_id": entity_id})
    transactions = _run_tool("query_entity_transactions", query_entity_transactions,
                             {"entity_id": entity_id, "limit": 20})
    network = _run_tool("analyze_entity_network", analyze_entity_network,
                        {"entity_id": entity_id, "max_depth": 1})

    evidence = json.dumps({
        "entity_profile": profile,
        "watchlist_screening": watchlist,
        "transactions": transactions,
        "network": network,
        "parent_investigation_context": json.loads(parent_context) if parent_context else {},
        "selection_reason": reason,
    }, default=str)[:10000]

    llm = get_llm().with_structured_output(LeadAssessment, include_raw=True)
    llm_result = llm.invoke([
        SystemMessage(content=LEAD_ASSESSMENT_SYSTEM),
        HumanMessage(content=evidence),
    ])
    assessment: LeadAssessment = llm_result["parsed"]
    token_usage = extract_token_usage(llm_result["raw"])
    duration_ms = int((time.perf_counter() - t0) * 1000)

    assessment_dict = assessment.model_dump()
    assessment_dict["entity_id"] = entity_id
    assessment_dict["entity_name"] = entity_name or assessment.entity_name

    audit_entry = {
        "agent": f"mini_investigate:{entity_id}",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "duration_ms": duration_ms,
        "llm_model": _LLM_MODEL,
        "token_usage": token_usage,
        "entity_id": entity_id,
        "risk_level": assessment.risk_level,
        "risk_score": assessment.risk_score,
        "recommendation": assessment.recommendation,
        "output_summary": (
            f"entity={entity_id}, risk={assessment.risk_level}, "
            f"score={assessment.risk_score}, rec={assessment.recommendation}"
        ),
    }

    return {
        "sub_investigation_findings": {entity_id: assessment_dict},
        "_node_tool_calls": tool_calls,
        "tool_trace_log": trace_entries,
        "agent_audit_log": [audit_entry],
    }
