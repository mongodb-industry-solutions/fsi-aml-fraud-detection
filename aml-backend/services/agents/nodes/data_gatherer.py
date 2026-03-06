"""Data Gathering Agent – parallel fan-out via Send, fan-in assembly."""

import json
import logging
import time
from datetime import datetime, timezone
from typing import TypedDict

from langchain_core.messages import SystemMessage, HumanMessage
from langgraph.types import Send, Command

from dependencies import get_mongo_client, DB_NAME
from models.agents.investigation import CaseFile
from services.agents.llm import get_llm, extract_token_usage
from services.agents.prompts import CASE_ASSEMBLY_SYSTEM
from services.agents.state import InvestigationState
from services.agents.tools.entity_tools import get_entity_profile, screen_watchlists
from services.agents.tools.transaction_tools import query_entity_transactions
from services.agents.tools.network_tools import analyze_entity_network

logger = logging.getLogger(__name__)

_MAX_TOOL_OUTPUT = 3000
_LLM_MODEL = "bedrock/anthropic-sonnet"


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
    result = tool_fn.invoke(tool_input)
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


# ── Fan-in assembly ──────────────────────────────────────────────────

def assemble_case_node(state: InvestigationState) -> dict:
    t0 = time.perf_counter()
    gathered = state.get("gathered_data", {})

    llm = get_llm().with_structured_output(CaseFile, include_raw=True)
    result = llm.invoke([
        SystemMessage(content=CASE_ASSEMBLY_SYSTEM),
        HumanMessage(content=json.dumps(gathered, default=str)[:12000]),
    ])
    case_file: CaseFile = result["parsed"]
    token_usage = extract_token_usage(result["raw"])
    duration_ms = int((time.perf_counter() - t0) * 1000)

    case_dump = case_file.model_dump()
    findings_count = len(case_dump.get("key_findings", []) if isinstance(case_dump.get("key_findings"), list) else [])

    audit_entry = {
        "agent": "data_gathering",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "duration_ms": duration_ms,
        "llm_model": _LLM_MODEL,
        "token_usage": token_usage,
        "sources_gathered": list(gathered.keys()),
        "output_summary": f"{findings_count} key findings assembled from {len(gathered)} sources",
    }

    return {
        "case_file": case_dump,
        "investigation_status": "case_assembled",
        "agent_audit_log": [audit_entry],
    }
