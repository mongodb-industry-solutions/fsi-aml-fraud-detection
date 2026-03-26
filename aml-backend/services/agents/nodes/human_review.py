"""Human Review Agent – processes analyst decision after interrupt_before pause."""

import logging
from datetime import datetime, timezone

from services.agents.state import InvestigationState

logger = logging.getLogger(__name__)


def human_review_node(state: InvestigationState) -> dict:
    """Runs AFTER the analyst resumes the graph.

    The graph pauses before this node via ``interrupt_before``.
    The resume endpoint injects ``human_decision`` into the state
    via ``graph.update_state(as_node="human_review")`` and the graph
    then proceeds directly to ``finalize``.

    This node function exists as a graph placeholder; actual
    human-review logic is handled in the resume endpoint so
    that ``as_node="human_review"`` correctly routes to ``finalize``.
    """
    decision = state.get("human_decision", {})

    analyst_decision = decision.get("decision", "unknown") if isinstance(decision, dict) else str(decision)
    analyst_notes = decision.get("analyst_notes", "") if isinstance(decision, dict) else ""

    audit_entry = {
        "agent": "human_review",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "analyst_decision": analyst_decision,
        "analyst_notes": analyst_notes,
        "reasoning": f"Analyst decision: {analyst_decision}" + (f" — {analyst_notes[:200]}" if analyst_notes else ""),
    }

    return {
        "human_decision": decision,
        "investigation_status": "reviewed_by_analyst",
        "agent_audit_log": [audit_entry],
    }
