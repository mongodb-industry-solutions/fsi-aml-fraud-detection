"""
Conversational AML/Compliance Assistant backed by a LangGraph ReAct agent.

Provides a senior-analyst-grade assistant with access to all investigation
tools, past cases, entity search, and compliance knowledge.
"""

import logging
import os

from pymongo import MongoClient
from langgraph.prebuilt import create_react_agent
from langgraph.checkpoint.mongodb import MongoDBSaver

from services.agents.llm import get_llm

from services.agents.tools.entity_tools import get_entity_profile, screen_watchlists
from services.agents.tools.transaction_tools import query_entity_transactions
from services.agents.tools.network_tools import analyze_entity_network
from services.agents.tools.policy_tools import (
    lookup_typology,
    search_typologies,
    search_compliance_policies,
)
from services.agents.tools.chat_tools import (
    search_investigations,
    get_investigation_detail,
    search_entities,
    get_risk_summary,
    compare_entities,
    trace_fund_flow,
    find_similar_entities,
    analyze_temporal_patterns,
    expand_investigation_lead,
)

logger = logging.getLogger(__name__)

MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME", "fsi-threatsight360")

CHAT_SYSTEM_PROMPT = """\
You are ThreatSight, a senior AML/KYC investigation co-pilot for risk analysts \
at a financial institution. You act as an intelligent partner during investigations, \
helping analysts explore entities, follow money trails, uncover hidden connections, \
and prioritise risks.

You have direct access to:
- Entity profiles, transaction records, network graphs, watchlist screening
- Past investigation cases and their full evidence (including sub-investigations)
- AML typology libraries and regulatory compliance policies
- Fund flow tracing across transaction chains (multi-hop)
- Temporal pattern analysis (structuring, velocity spikes, round-tripping, dormancy)
- Similar entity discovery via vector search
- Rapid lead expansion (mini-investigation of connected entities)

GUIDELINES:
- Always ground your answers in data retrieved via your tools. Never fabricate \
  entity IDs, transaction details, or risk scores.
- Cite data sources in brackets: [entity_profile], [transactions], \
  [network_analysis], [watchlist], [investigation:<case_id>], \
  [typology:<id>], [compliance_policy], [fund_flow], [temporal_analysis], \
  [similar_entities], [lead_expansion].
- When discussing risk, reference the specific evidence that drives the score.
- Flag potential regulatory concerns proactively and recommend concrete next \
  steps when evidence warrants (e.g. filing a SAR, escalating for review).
- When you discover suspicious connections or patterns, proactively suggest \
  next leads to explore: "Based on this, you may want to investigate Entity X \
  because..."
- Chain multiple tools when needed to answer complex questions. For example, \
  to answer "Is Entity A connected to any sanctioned entities?", first expand \
  the network, then check watchlists on connected entities.
- Format responses with clear structure using headers and bullet points.
- If a tool returns no results, state that clearly rather than guessing.
- You may trace fund flows, detect temporal anomalies, find similar entities, \
  compare entities, summarize investigation history, explain typologies, \
  answer compliance questions, and help analysts prioritize work.
"""

ALL_TOOLS = [
    get_entity_profile,
    query_entity_transactions,
    analyze_entity_network,
    screen_watchlists,
    search_typologies,
    lookup_typology,
    search_compliance_policies,
    search_investigations,
    get_investigation_detail,
    search_entities,
    get_risk_summary,
    compare_entities,
    trace_fund_flow,
    find_similar_entities,
    analyze_temporal_patterns,
    expand_investigation_lead,
]

_chat_agent = None


def get_chat_agent():
    """Build and return the compiled chat agent (singleton)."""
    global _chat_agent
    if _chat_agent is None:
        client = MongoClient(MONGODB_URI)
        db = client[DB_NAME]
        checkpointer = MongoDBSaver(db)

        _chat_agent = create_react_agent(
            model=get_llm(),
            tools=ALL_TOOLS,
            checkpointer=checkpointer,
            prompt=CHAT_SYSTEM_PROMPT,
        )
        logger.info("Chat agent compiled with %d tools", len(ALL_TOOLS))
    return _chat_agent
