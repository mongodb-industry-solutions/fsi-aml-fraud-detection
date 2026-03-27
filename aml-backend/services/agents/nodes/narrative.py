"""Narrative Agent – generates SAR-compliant narrative from the case file."""

import json
import logging
import time
from datetime import datetime, timezone

from langchain_core.messages import SystemMessage, HumanMessage

from models.agents.investigation import SARNarrative
from services.agents.llm import get_llm, get_model_id, extract_token_usage, invoke_with_retry
from services.agents.prompts import NARRATIVE_SYSTEM
from services.agents.state import InvestigationState
from services.agents.tools.policy_tools import search_compliance_policies
from services.agents.truncation import truncate_payload

logger = logging.getLogger(__name__)

_MAX_TOOL_OUTPUT = 3000


def narrative_node(state: InvestigationState) -> dict:
    t0 = time.perf_counter()
    case_file = state.get("case_file", {})
    typology = state.get("typology", {})
    network = state.get("network_analysis", {})

    tool_input = {"query": "SAR narrative structure"}
    t_tool = time.perf_counter()
    policies = search_compliance_policies.invoke(tool_input)
    tool_dur = int((time.perf_counter() - t_tool) * 1000)
    policy_context = truncate_payload({"policies": policies}, max_chars=3000) if policies else "Follow standard FinCEN SAR narrative guidelines."

    output_text = json.dumps(policies, default=str) if policies else "[]"
    truncated = output_text[:_MAX_TOOL_OUTPUT] + "..." if len(output_text) > _MAX_TOOL_OUTPUT else output_text
    tool_calls = [{
        "tool": "search_compliance_policies",
        "input": json.dumps(tool_input),
        "output": truncated,
    }]
    trace_entries = [{
        "tool": "search_compliance_policies",
        "agent": "sar_author",
        "input": json.dumps(tool_input),
        "output": truncated,
        "duration_ms": tool_dur,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }]

    temporal = state.get("temporal_analysis", {})
    trail = state.get("trail_analysis", {})
    sub_findings = state.get("sub_investigation_findings", {})

    evidence_payload = truncate_payload({
        "case_file": case_file,
        "typology_classification": typology,
        "network_analysis": network,
        "temporal_analysis": temporal,
        "trail_analysis": trail,
        "sub_investigation_findings": sub_findings,
    }, max_chars=14000)

    llm = get_llm().with_structured_output(SARNarrative, include_raw=True)
    llm_result = invoke_with_retry(llm, [
        SystemMessage(content=NARRATIVE_SYSTEM),
        HumanMessage(content=(
            f"COMPLIANCE POLICY CONTEXT:\n{policy_context}\n\n"
            f"INVESTIGATION EVIDENCE:\n{evidence_payload}"
        )),
    ])
    narrative: SARNarrative | None = llm_result["parsed"]
    token_usage = extract_token_usage(llm_result["raw"])
    duration_ms = int((time.perf_counter() - t0) * 1000)

    if narrative is None:
        logger.warning("SAR narrative LLM returned unparseable output — using empty fallback")
        narrative = SARNarrative(introduction="LLM failed to return structured output.")

    total_length = len(narrative.introduction) + len(narrative.body) + len(narrative.conclusion)

    audit_entry = {
        "agent": "sar_author",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "duration_ms": duration_ms,
        "llm_model": get_model_id(),
        "token_usage": token_usage,
        "narrative_length": total_length,
        "citations_count": len(narrative.cited_evidence),
        "output_summary": f"{total_length} chars, {len(narrative.cited_evidence)} citations, 3 sections",
    }

    return {
        "narrative": narrative.model_dump(),
        "investigation_status": "narrative_generated",
        "_node_tool_calls": tool_calls,
        "tool_trace_log": trace_entries,
        "agent_audit_log": [audit_entry],
    }
