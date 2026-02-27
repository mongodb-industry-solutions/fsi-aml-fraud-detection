"""Data Gathering Agent – parallel fan-out via Send, fan-in assembly."""

import json
import logging
from datetime import datetime, timezone
from typing import TypedDict

from langchain_core.messages import SystemMessage, HumanMessage
from langgraph.types import Send, Command

from dependencies import get_mongo_client, DB_NAME
from models.agents.investigation import CaseFile
from services.agents.llm import get_llm
from services.agents.prompts import CASE_ASSEMBLY_SYSTEM
from services.agents.state import InvestigationState
from services.agents.tools.entity_tools import get_entity_profile, screen_watchlists
from services.agents.tools.transaction_tools import query_entity_transactions
from services.agents.tools.network_tools import analyze_entity_network

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

def fetch_entity_profile_node(state: GatherTask) -> dict:
    entity_id = state["entity_id"]
    tool_input = {"entity_id": entity_id}
    result = get_entity_profile.invoke(tool_input)
    return {
        "gathered_data": {"entity_profile": result},
        "_node_tool_calls": [{
            "tool": "get_entity_profile",
            "input": json.dumps(tool_input),
            "output": _serialize_tool_output(result),
        }],
    }


def fetch_transactions_node(state: GatherTask) -> dict:
    entity_id = state["entity_id"]
    tool_input = {"entity_id": entity_id, "limit": 50}
    result = query_entity_transactions.invoke(tool_input)
    return {
        "gathered_data": {"transactions": result},
        "_node_tool_calls": [{
            "tool": "query_entity_transactions",
            "input": json.dumps(tool_input),
            "output": _serialize_tool_output(result),
        }],
    }


def fetch_network_node(state: GatherTask) -> dict:
    entity_id = state["entity_id"]
    tool_input = {"entity_id": entity_id, "max_depth": 2}
    result = analyze_entity_network.invoke(tool_input)
    return {
        "gathered_data": {"network": result},
        "_node_tool_calls": [{
            "tool": "analyze_entity_network",
            "input": json.dumps(tool_input),
            "output": _serialize_tool_output(result),
        }],
    }


def fetch_watchlist_node(state: GatherTask) -> dict:
    entity_id = state["entity_id"]
    tool_input = {"entity_id": entity_id}
    result = screen_watchlists.invoke(tool_input)
    return {
        "gathered_data": {"watchlist": result},
        "_node_tool_calls": [{
            "tool": "screen_watchlists",
            "input": json.dumps(tool_input),
            "output": _serialize_tool_output(result),
        }],
    }


# ── Fan-in assembly ──────────────────────────────────────────────────

def assemble_case_node(state: InvestigationState) -> dict:
    gathered = state.get("gathered_data", {})

    llm = get_llm().with_structured_output(CaseFile)
    case_file: CaseFile = llm.invoke([
        SystemMessage(content=CASE_ASSEMBLY_SYSTEM),
        HumanMessage(content=json.dumps(gathered, default=str)[:12000]),
    ])

    audit_entry = {
        "agent": "data_gathering",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "sources_gathered": list(gathered.keys()),
    }

    return {
        "case_file": case_file.model_dump(),
        "investigation_status": "case_assembled",
        "agent_audit_log": [audit_entry],
    }
