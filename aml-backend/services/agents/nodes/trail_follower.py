"""Trail Follower Agent -- selects investigation leads via LLM reasoning over network + temporal data.

Uses $graphLookup to trace ownership chains, then asks the LLM to rank and
select the most suspicious connected entities for sub-investigation.
"""

import json
import logging
import time
from datetime import datetime, timezone

from langchain_core.messages import SystemMessage, HumanMessage

from dependencies import get_mongo_client, DB_NAME
from models.agents.investigation import TrailAnalysis
from services.agents.llm import get_llm, extract_token_usage
from services.agents.prompts import TRAIL_FOLLOWER_SYSTEM
from services.agents.state import InvestigationState

logger = logging.getLogger(__name__)

_MAX_TOOL_OUTPUT = 3000
_LLM_MODEL = "bedrock/anthropic-sonnet"

OWNERSHIP_TYPES = {
    "owns", "controls", "ubo_of", "parent_of_subsidiary",
    "subsidiary_of", "shareholder_of", "director_of",
    "nominee_director", "board_member_of", "potential_beneficial_owner_of",
}


def _trace_ownership_chains(db, entity_id: str, max_depth: int = 3) -> list[dict]:
    """Trace ownership/control chains from the subject entity via $graphLookup."""
    pipeline = [
        {"$match": {
            "source.entityId": entity_id,
            "type": {"$in": list(OWNERSHIP_TYPES)},
        }},
        {
            "$graphLookup": {
                "from": "relationships",
                "startWith": "$target.entityId",
                "connectFromField": "target.entityId",
                "connectToField": "source.entityId",
                "as": "chain",
                "maxDepth": max_depth - 1,
                "depthField": "hops",
                "restrictSearchWithMatch": {
                    "type": {"$in": list(OWNERSHIP_TYPES)},
                },
            }
        },
        {"$project": {
            "_id": 0,
            "direct_target": "$target.entityId",
            "direct_type": "$type",
            "direct_strength": "$strength",
            "chain": {
                "$map": {
                    "input": "$chain",
                    "as": "c",
                    "in": {
                        "source": "$$c.source.entityId",
                        "target": "$$c.target.entityId",
                        "type": "$$c.type",
                        "strength": "$$c.strength",
                        "hops": "$$c.hops",
                    },
                },
            },
        }},
    ]
    results = list(db["relationships"].aggregate(pipeline))

    chains = []
    for row in results:
        chain_entry = {
            "root": entity_id,
            "direct_target": row.get("direct_target"),
            "direct_type": row.get("direct_type"),
            "depth": 1 + max((c.get("hops", 0) for c in row.get("chain", [])), default=0),
            "path": [
                {"entity": row.get("direct_target"), "via": row.get("direct_type")},
            ] + [
                {"entity": c.get("target"), "via": c.get("type")}
                for c in sorted(row.get("chain", []), key=lambda x: x.get("hops", 0))
            ],
        }
        chains.append(chain_entry)

    return chains[:10]


def trail_follower_node(state: InvestigationState) -> dict:
    t0 = time.perf_counter()
    case_file = state.get("case_file", {})
    typology = state.get("typology", {})
    network = state.get("network_analysis", {})
    temporal = state.get("temporal_analysis", {})
    entity_id = state.get("alert_data", {}).get("entity_id", "")

    tool_calls = []
    trace_entries = []

    ownership_chains = []
    if entity_id:
        client = get_mongo_client()
        db = client[DB_NAME]
        t_tool = time.perf_counter()
        ownership_chains = _trace_ownership_chains(db, entity_id)
        tool_dur = int((time.perf_counter() - t_tool) * 1000)

        chain_output = json.dumps(ownership_chains, default=str)[:_MAX_TOOL_OUTPUT]
        tool_calls.append({
            "tool": "trace_ownership_chains",
            "input": json.dumps({"entity_id": entity_id, "max_depth": 3}),
            "output": chain_output,
        })
        trace_entries.append({
            "tool": "trace_ownership_chains",
            "agent": "trail_follower",
            "input": json.dumps({"entity_id": entity_id}),
            "output": chain_output,
            "duration_ms": tool_dur,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })

    evidence_payload = json.dumps({
        "case_file": case_file,
        "typology": typology,
        "network_analysis": network,
        "temporal_analysis": temporal,
        "ownership_chains": ownership_chains,
    }, default=str)[:12000]

    llm = get_llm().with_structured_output(TrailAnalysis, include_raw=True)
    llm_result = llm.invoke([
        SystemMessage(content=TRAIL_FOLLOWER_SYSTEM),
        HumanMessage(content=evidence_payload),
    ])
    result: TrailAnalysis = llm_result["parsed"]
    token_usage = extract_token_usage(llm_result["raw"])
    duration_ms = int((time.perf_counter() - t0) * 1000)

    result_dump = result.model_dump()
    result_dump["ownership_chains"] = ownership_chains

    leads_summary = [
        {"entity_id": l.entity_id, "priority": l.priority, "reason": l.reason[:100]}
        for l in result.leads[:5]
    ]

    audit_entry = {
        "agent": "trail_follower",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "duration_ms": duration_ms,
        "llm_model": _LLM_MODEL,
        "token_usage": token_usage,
        "ownership_chains_found": len(ownership_chains),
        "leads_selected": len(result.leads),
        "shell_patterns": len(result.shell_patterns),
        "reasoning": result.summary[:300],
        "output_summary": (
            f"chains={len(ownership_chains)}, leads={len(result.leads)}, "
            f"shell_patterns={len(result.shell_patterns)}"
        ),
    }

    return {
        "trail_analysis": result_dump,
        "investigation_status": "trail_analysis_complete",
        "_node_tool_calls": tool_calls,
        "tool_trace_log": trace_entries,
        "agent_audit_log": [audit_entry],
    }
