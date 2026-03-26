"""Data Gathering Agent – parallel fan-out via Send, fan-in assembly."""

import json
import logging
import time
from datetime import datetime, timezone
from typing import TypedDict

from langchain_core.messages import SystemMessage, HumanMessage
from langgraph.types import Send, Command

from dependencies import get_mongo_client, DB_NAME
from models.agents.investigation import CaseAssemblyOutput
from services.agents.llm import get_llm, get_model_id, extract_token_usage, invoke_with_retry
from services.agents.prompts import CASE_ASSEMBLY_SYSTEM
from services.agents.state import InvestigationState
from services.agents.tools.entity_tools import get_entity_profile, screen_watchlists
from services.agents.tools.transaction_tools import query_entity_transactions
from services.agents.tools.network_tools import analyze_entity_network
from services.agents.tools.policy_tools import search_typologies

logger = logging.getLogger(__name__)

_MAX_TOOL_OUTPUT = 3000


def _serialize_tool_output(obj) -> str:
    try:
        text = json.dumps(obj, default=str)
    except Exception:
        text = str(obj)
    return text[:_MAX_TOOL_OUTPUT] + "..." if len(text) > _MAX_TOOL_OUTPUT else text


def _resolve_entity_id(raw_id: str) -> str:
    """Resolve an identifier that may be a scenarioKey to the actual entityId."""
    client = get_mongo_client()
    db = client[DB_NAME]
    doc = db["entities"].find_one({"entityId": raw_id}, {"entityId": 1, "_id": 0})
    if doc:
        return doc["entityId"]
    doc = db["entities"].find_one({"scenarioKey": raw_id}, {"entityId": 1, "_id": 0})
    if doc:
        return doc["entityId"]
    return raw_id


class GatherTask(TypedDict):
    task: str
    entity_id: str


# ── Fan-out dispatcher ────────────────────────────────────────────────

def dispatch_data_tasks(state: InvestigationState) -> Command:
    alert = state.get("alert_data", {})
    raw_id = alert.get("entity_id", "")
    entity_id = _resolve_entity_id(raw_id)

    tasks = [
        "fetch_entity_profile",
        "fetch_transactions",
        "fetch_network",
        "fetch_watchlist",
    ]
    return Command(
        goto=[
            Send(task, {"task": task, "entity_id": entity_id})
            for task in tasks
        ],
        update={
            "investigation_status": "data_gathering_started",
            "agent_audit_log": [{
                "agent": "data_gathering_dispatch",
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "tasks_dispatched": tasks,
            }],
        },
    )


# ── Individual fan-out workers ────────────────────────────────────────

def _fetch_with_trace(state, tool_name, tool_fn, tool_input, data_key):
    """Run a tool, capture timing, and produce audit + trace entries."""
    entity_id = state["entity_id"]
    t0 = time.perf_counter()
    try:
        result = tool_fn.invoke(tool_input)
    except Exception as exc:
        logger.warning("Data gathering tool %s failed for %s: %s", tool_name, entity_id, exc)
        result = {"error": str(exc)}
    duration_ms = int((time.perf_counter() - t0) * 1000)
    serialized = _serialize_tool_output(result)

    trace_entry = {
        "tool": tool_name,
        "agent": f"fetch_{data_key}",
        "input": json.dumps(tool_input),
        "output": serialized,
        "duration_ms": duration_ms,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    audit_entry = {
        "agent": f"fetch_{data_key}",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "duration_ms": duration_ms,
        "tool": tool_name,
        "output_summary": serialized[:200],
    }
    return {
        "gathered_data": {data_key: result},
        "_node_tool_calls": [{"tool": tool_name, "input": json.dumps(tool_input), "output": serialized}],
        "tool_trace_log": [trace_entry],
        "agent_audit_log": [audit_entry],
    }


def fetch_entity_profile_node(state: GatherTask) -> dict:
    return _fetch_with_trace(
        state, "get_entity_profile", get_entity_profile,
        {"entity_id": state["entity_id"]}, "entity_profile",
    )


def fetch_transactions_node(state: GatherTask) -> dict:
    return _fetch_with_trace(
        state, "query_entity_transactions", query_entity_transactions,
        {"entity_id": state["entity_id"], "limit": 50}, "transactions",
    )


def fetch_network_node(state: GatherTask) -> dict:
    return _fetch_with_trace(
        state, "analyze_entity_network", analyze_entity_network,
        {"entity_id": state["entity_id"], "max_depth": 2}, "network",
    )


def fetch_watchlist_node(state: GatherTask) -> dict:
    return _fetch_with_trace(
        state, "screen_watchlists", screen_watchlists,
        {"entity_id": state["entity_id"]}, "watchlist",
    )


# ── Fan-in assembly + typology classification ────────────────────────

def assemble_case_node(state: InvestigationState) -> dict:
    """Build case file AND classify typology in a single LLM call."""
    t0 = time.perf_counter()
    gathered = state.get("gathered_data", {})
    triage = state.get("triage_decision", {})
    hint = triage.get("typology_hint", "")

    tool_calls = []
    trace_entries = []
    typology_context = "No specific typology hints."

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
            "agent": "case_analyst",
            "input": json.dumps(tool_input),
            "output": truncated,
            "duration_ms": tool_dur,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })
        if relevant_typologies:
            typology_context = json.dumps(relevant_typologies, default=str)[:4000]

    gathered_text = json.dumps(gathered, default=str)[:12000]

    llm = get_llm().with_structured_output(CaseAssemblyOutput, include_raw=True)
    result = invoke_with_retry(llm, [
        SystemMessage(content=CASE_ASSEMBLY_SYSTEM),
        HumanMessage(content=(
            f"GATHERED EVIDENCE:\n{gathered_text}\n\n"
            f"RELEVANT TYPOLOGIES FROM LIBRARY:\n{typology_context}"
        )),
    ])
    assembly: CaseAssemblyOutput = result["parsed"]
    token_usage = extract_token_usage(result["raw"])
    duration_ms = int((time.perf_counter() - t0) * 1000)

    case_dump = assembly.case_file.model_dump()
    typology_dump = assembly.typology.model_dump()
    findings_count = len(case_dump.get("key_findings", []) if isinstance(case_dump.get("key_findings"), list) else [])
    secondary = typology_dump.get("secondary_typologies", [])

    audit_entry = {
        "agent": "case_analyst",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "duration_ms": duration_ms,
        "llm_model": get_model_id(),
        "token_usage": token_usage,
        "sources_gathered": list(gathered.keys()),
        "primary_typology": assembly.typology.primary_typology.value,
        "typology_confidence": assembly.typology.confidence,
        "secondary_typologies": [str(s) for s in secondary[:3]],
        "typology_reasoning": typology_dump.get("reasoning", "")[:300],
        "input_summary": f"gathered_data with {len(gathered)} sources, hint={hint or 'none'}",
        "output_summary": (
            f"{findings_count} key findings, "
            f"typology={assembly.typology.primary_typology.value} "
            f"(confidence={assembly.typology.confidence})"
        ),
    }

    return {
        "case_file": case_dump,
        "typology": typology_dump,
        "investigation_status": "case_assembled_and_typology_classified",
        "_node_tool_calls": tool_calls,
        "tool_trace_log": trace_entries,
        "agent_audit_log": [audit_entry],
    }
