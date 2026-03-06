"""
LangGraph StateGraph wiring for the agentic investigation pipeline.

Combines:
  - Command-based dynamic routing (triage, validation)
  - Send-based parallel fan-out (data gathering)
  - interrupt_before for durable human-in-the-loop review
  - MongoDBSaver for persistent checkpointing
"""

import logging
import os

from pymongo import MongoClient
from langgraph.graph import StateGraph, START, END
from langgraph.checkpoint.mongodb import MongoDBSaver

from services.agents.state import InvestigationState
from services.agents.nodes.triage import triage_node, auto_close_node, urgent_escalation_node
from services.agents.nodes.data_gatherer import (
    dispatch_data_tasks,
    fetch_entity_profile_node,
    fetch_transactions_node,
    fetch_network_node,
    fetch_watchlist_node,
    assemble_case_node,
)
from services.agents.nodes.typology import typology_node
from services.agents.nodes.network_analyst import network_analyst_node
from services.agents.nodes.narrative import narrative_node
from services.agents.nodes.validator import validation_node
from services.agents.nodes.human_review import human_review_node
from services.agents.nodes.finalize import finalize_node

logger = logging.getLogger(__name__)

MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017")


def build_investigation_graph() -> StateGraph:
    """Construct and return the compiled investigation graph."""

    builder = StateGraph(InvestigationState)

    # ── Nodes ─────────────────────────────────────────────────────────

    # Triage (returns Command -> auto_close | data_gathering | urgent_escalation)
    builder.add_node("triage", triage_node)
    builder.add_node("auto_close", auto_close_node)
    builder.add_node("urgent_escalation", urgent_escalation_node)

    # Data gathering fan-out (dispatch returns list of Send objects)
    builder.add_node("data_gathering", dispatch_data_tasks)
    builder.add_node("fetch_entity_profile", fetch_entity_profile_node)
    builder.add_node("fetch_transactions", fetch_transactions_node)
    builder.add_node("fetch_network", fetch_network_node)
    builder.add_node("fetch_watchlist", fetch_watchlist_node)

    # Fan-in assembly
    builder.add_node("assemble_case", assemble_case_node)

    # Analysis pipeline
    builder.add_node("typology", typology_node)
    builder.add_node("network_analyst", network_analyst_node)
    builder.add_node("narrative", narrative_node)

    # Validation (returns Command -> data_gathering | narrative | human_review | finalize)
    builder.add_node("validation", validation_node)

    # Human review (paused via interrupt_before at compile time)
    builder.add_node("human_review", human_review_node)

    # Finalize (persists to investigations collection)
    builder.add_node("finalize", finalize_node)

    # ── Edges ─────────────────────────────────────────────────────────

    # Entry
    builder.add_edge(START, "triage")
    # triage uses Command — no explicit edges needed for routing

    # Auto-close still goes through finalize so the case is persisted
    builder.add_edge("auto_close", "finalize")

    # Urgent escalation -> human review
    builder.add_edge("urgent_escalation", "human_review")

    # Fan-out workers -> assemble_case
    builder.add_edge("fetch_entity_profile", "assemble_case")
    builder.add_edge("fetch_transactions", "assemble_case")
    builder.add_edge("fetch_network", "assemble_case")
    builder.add_edge("fetch_watchlist", "assemble_case")

    # Sequential pipeline after case assembly
    builder.add_edge("assemble_case", "typology")
    builder.add_edge("typology", "network_analyst")
    builder.add_edge("network_analyst", "narrative")
    builder.add_edge("narrative", "validation")
    # validation uses Command — no explicit edges needed for routing

    # Human review -> finalize
    builder.add_edge("human_review", "finalize")

    # Finalize -> END
    builder.add_edge("finalize", END)

    return builder


_compiled_graph = None


def get_compiled_graph():
    """Build and compile the graph with MongoDB persistence."""
    global _compiled_graph
    if _compiled_graph is None:
        builder = build_investigation_graph()
        client = MongoClient(MONGODB_URI)
        db = client[os.getenv("DB_NAME", "fsi-threatsight360")]
        checkpointer = MongoDBSaver(db)
        _compiled_graph = builder.compile(
            checkpointer=checkpointer,
            interrupt_before=["human_review"],
        )
    return _compiled_graph
