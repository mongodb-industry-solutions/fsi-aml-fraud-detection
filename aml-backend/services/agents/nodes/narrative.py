"""Narrative Agent – generates SAR-compliant narrative from the case file."""

import json
import logging
from datetime import datetime, timezone

from langchain_core.messages import SystemMessage, HumanMessage

from models.agents.investigation import SARNarrative
from services.agents.llm import get_llm
from services.agents.prompts import NARRATIVE_SYSTEM
from services.agents.state import InvestigationState
from services.agents.tools.policy_tools import search_compliance_policies

logger = logging.getLogger(__name__)


_MAX_TOOL_OUTPUT = 3000


def narrative_node(state: InvestigationState) -> dict:
    case_file = state.get("case_file", {})
    typology = state.get("typology", {})
    network = state.get("network_analysis", {})

    tool_input = {"query": "SAR narrative structure"}
    policies = search_compliance_policies.invoke(tool_input)
    policy_context = json.dumps(policies, default=str)[:3000] if policies else "Follow standard FinCEN SAR narrative guidelines."

    output_text = json.dumps(policies, default=str) if policies else "[]"
    tool_calls = [{
        "tool": "search_compliance_policies",
        "input": json.dumps(tool_input),
        "output": output_text[:_MAX_TOOL_OUTPUT] + "..." if len(output_text) > _MAX_TOOL_OUTPUT else output_text,
    }]

    evidence_payload = json.dumps({
        "case_file": case_file,
        "typology_classification": typology,
        "network_analysis": network,
    }, default=str)[:10000]

    llm = get_llm().with_structured_output(SARNarrative)
    narrative: SARNarrative = llm.invoke([
        SystemMessage(content=NARRATIVE_SYSTEM),
        HumanMessage(content=(
            f"COMPLIANCE POLICY CONTEXT:\n{policy_context}\n\n"
            f"INVESTIGATION EVIDENCE:\n{evidence_payload}"
        )),
    ])

    audit_entry = {
        "agent": "narrative",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "narrative_length": len(narrative.introduction) + len(narrative.body) + len(narrative.conclusion),
        "citations_count": len(narrative.cited_evidence),
    }

    return {
        "narrative": narrative.model_dump(),
        "investigation_status": "narrative_generated",
        "_node_tool_calls": tool_calls,
        "agent_audit_log": [audit_entry],
    }
