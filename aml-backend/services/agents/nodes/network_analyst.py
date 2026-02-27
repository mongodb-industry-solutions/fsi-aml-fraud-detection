"""Network Analysis Agent – enriches investigation with graph-based insights."""

import json
import logging
from datetime import datetime, timezone

from langchain_core.messages import SystemMessage, HumanMessage

from models.agents.investigation import NetworkRiskProfile
from services.agents.llm import get_llm
from services.agents.state import InvestigationState

logger = logging.getLogger(__name__)

NETWORK_SYSTEM = """You are a network analysis specialist for financial crime investigations.
Analyze the provided network data and generate a risk profile.

Focus on:
- Shell company structures (nominee directors, layered subsidiaries)
- Suspicious relationship patterns (proxy, beneficial owner, financial beneficiary)
- Centrality: is this entity a hub connecting high-risk nodes?
- Risk propagation: do connected entities raise the overall risk?"""


def network_analyst_node(state: InvestigationState) -> dict:
    gathered = state.get("gathered_data", {})
    network_data = gathered.get("network", {})

    if not network_data or network_data.get("network_size", 0) == 0:
        profile = NetworkRiskProfile(summary="No network data available.")
    else:
        llm = get_llm().with_structured_output(NetworkRiskProfile)
        profile = llm.invoke([
            SystemMessage(content=NETWORK_SYSTEM),
            HumanMessage(content=json.dumps(network_data, default=str)[:6000]),
        ])

    audit_entry = {
        "agent": "network_analyst",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "network_size": profile.network_size,
        "high_risk_connections": profile.high_risk_connections,
    }

    return {
        "network_analysis": profile.model_dump(),
        "agent_audit_log": [audit_entry],
    }
