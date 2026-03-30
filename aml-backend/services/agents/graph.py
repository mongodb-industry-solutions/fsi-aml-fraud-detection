"""
LangGraph StateGraph wiring for the agentic investigation pipeline.

Combines:
  - Command-based dynamic routing (triage, validation)
  - Send-based parallel fan-out (data gathering, sub-investigations)
  - Parallel analysis nodes (network_analyst || temporal_analyst)
  - interrupt_before for durable human-in-the-loop review
  - MongoDBSaver for persistent checkpointing
"""

import logging
import os

from pymongo import MongoClient
from langgraph.graph import StateGraph, START, END
from langgraph.checkpoint.mongodb import MongoDBSaver

from services.agents.memory import get_memory_store
from services.agents.state import InvestigationState
from services.agents.nodes.triage import triage_node, auto_close_node
from services.agents.nodes.data_gatherer import (
    dispatch_data_tasks,
    fetch_entity_profile_node,
    fetch_transactions_node,
    fetch_network_node,
    fetch_watchlist_node,
    assemble_case_node,
)
from services.agents.nodes.network_analyst import network_analyst_node
from services.agents.nodes.temporal_analyst import temporal_analyst_node
from services.agents.nodes.trail_follower import trail_follower_node
from services.agents.nodes.sub_investigator import (
    dispatch_sub_investigations,
    mini_investigate_node,
)
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

    # Triage (returns Command -> auto_close | data_gathering)
    builder.add_node("triage", triage_node)
    builder.add_node("auto_close", auto_close_node)

    # Data gathering fan-out (dispatch returns list of Send objects)
    builder.add_node("data_gathering", dispatch_data_tasks)
    builder.add_node("fetch_entity_profile", fetch_entity_profile_node)
    builder.add_node("fetch_transactions", fetch_transactions_node)
    builder.add_node("fetch_network", fetch_network_node)
    builder.add_node("fetch_watchlist", fetch_watchlist_node)

    # Fan-in assembly + typology classification (merged into single LLM call)
    builder.add_node("assemble_case", assemble_case_node)

    # Parallel compute nodes (no LLM)
    builder.add_node("network_analyst", network_analyst_node)
    builder.add_node("temporal_analyst", temporal_analyst_node)

    # Trail follower (conditional LLM lead selection after network + temporal converge)
    builder.add_node("trail_follower", trail_follower_node)

    # Sub-investigation fan-out (mini_investigate fans directly into narrative)
    builder.add_node("dispatch_sub_investigations", dispatch_sub_investigations)
    builder.add_node("mini_investigate", mini_investigate_node)

    # Narrative + validation
    builder.add_node("narrative", narrative_node)
    builder.add_node("validation", validation_node)

    # Human review (paused via interrupt_before at compile time)
    builder.add_node("human_review", human_review_node)

    # Finalize (persists to investigations collection)
    builder.add_node("finalize", finalize_node)

    # ── Edges ─────────────────────────────────────────────────────────

    # Entry
    builder.add_edge(START, "triage")

    # Auto-close still goes through finalize so the case is persisted
    builder.add_edge("auto_close", "finalize")

    # Fan-out workers -> assemble_case (includes typology classification)
    builder.add_edge("fetch_entity_profile", "assemble_case")
    builder.add_edge("fetch_transactions", "assemble_case")
    builder.add_edge("fetch_network", "assemble_case")
    builder.add_edge("fetch_watchlist", "assemble_case")

    # Parallel: assemble_case -> [network_analyst, temporal_analyst]
    builder.add_edge("assemble_case", "network_analyst")
    builder.add_edge("assemble_case", "temporal_analyst")

    # Both converge into trail_follower
    builder.add_edge("network_analyst", "trail_follower")
    builder.add_edge("temporal_analyst", "trail_follower")

    # Trail follower -> dispatch sub-investigations
    builder.add_edge("trail_follower", "dispatch_sub_investigations")

    # Sub-investigation workers -> narrative (collect_sub_findings merged in)
    builder.add_edge("mini_investigate", "narrative")

    # Narrative -> validation
    builder.add_edge("narrative", "validation")

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
        store = get_memory_store()
        compile_kwargs = {
            "checkpointer": checkpointer,
            "interrupt_before": ["human_review"],
        }
        if store is not None:
            compile_kwargs["store"] = store
        _compiled_graph = builder.compile(**compile_kwargs)
    return _compiled_graph
