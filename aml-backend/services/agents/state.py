"""
LangGraph investigation state schema.

Every agent node reads from / writes to this shared TypedDict.
The append-only `agent_audit_log` provides an immutable trail for
regulatory compliance (SR 11-7, EU AI Act).
"""

from __future__ import annotations

from typing import Annotated, TypedDict

from langgraph.graph.message import add_messages


def _append_only(existing: list, new: list) -> list:
    """Reducer that only appends -- entries can never be removed."""
    return existing + new


def _merge_dicts(existing: dict, new: dict) -> dict:
    """Reducer that shallow-merges dicts so parallel fan-out results accumulate."""
    return {**existing, **new}


class InvestigationState(TypedDict, total=False):
    # LangGraph message history
    messages: Annotated[list, add_messages]

    # Input
    alert_data: dict

    # Triage
    triage_decision: dict

    # Data gathering (fan-out results keyed by task name, merged via reducer)
    gathered_data: Annotated[dict, _merge_dicts]

    # Assembled 360-degree case profile
    case_file: dict

    # Typology classification
    typology: dict

    # Network risk analysis
    network_analysis: dict

    # SAR narrative
    narrative: dict

    # Validation
    validation_result: dict
    validation_count: int

    # Human review
    human_decision: dict

    # Pipeline tracking
    investigation_status: str
    case_id: str

    # Per-node tool call metadata (appended by parallel nodes, consumed by SSE generator)
    _node_tool_calls: Annotated[list, _append_only]

    # Persisted tool call traces with inputs, outputs, and timing
    tool_trace_log: Annotated[list, _append_only]

    # Immutable audit trail
    agent_audit_log: Annotated[list, _append_only]
