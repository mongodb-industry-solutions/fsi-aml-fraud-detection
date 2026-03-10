"""Validation Agent – quality-checks the investigation and routes dynamically."""

import json
import logging
import time
from datetime import datetime, timezone

from langchain_core.messages import SystemMessage, HumanMessage
from langgraph.types import Command

from models.agents.investigation import ValidationResult
from services.agents.llm import get_llm, extract_token_usage
from services.agents.prompts import VALIDATION_SYSTEM
from services.agents.state import InvestigationState

logger = logging.getLogger(__name__)

MAX_VALIDATION_LOOPS = 2
_LLM_MODEL = "bedrock/anthropic-sonnet"


def validation_node(state: InvestigationState) -> Command:
    t0 = time.perf_counter()
    loop_count = state.get("validation_count", 0) + 1

    if loop_count >= MAX_VALIDATION_LOOPS:
        duration_ms = int((time.perf_counter() - t0) * 1000)
        forced = ValidationResult(
            is_valid=False,
            score=0.0,
            issues=["Maximum validation loops exceeded — forced escalation"],
            route_to="human_review",
        )
        audit_entry = {
            "agent": "compliance_qa",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "duration_ms": duration_ms,
            "loop": loop_count,
            "forced_escalation": True,
            "reasoning": "Max validation loops exceeded, forcing human review",
        }
        return Command(
            goto="human_review",
            update={
                "validation_result": forced.model_dump(),
                "validation_count": loop_count,
                "investigation_status": "forced_escalation",
                "agent_audit_log": [audit_entry],
            },
        )

    payload = json.dumps({
        "case_file": state.get("case_file", {}),
        "narrative": state.get("narrative", {}),
        "typology": state.get("typology", {}),
        "network_analysis": state.get("network_analysis", {}),
    }, default=str)[:12000]

    llm = get_llm().with_structured_output(ValidationResult, include_raw=True)
    llm_result = llm.invoke([
        SystemMessage(content=VALIDATION_SYSTEM),
        HumanMessage(content=payload),
    ])
    result: ValidationResult = llm_result["parsed"]
    token_usage = extract_token_usage(llm_result["raw"])
    duration_ms = int((time.perf_counter() - t0) * 1000)

    audit_entry = {
        "agent": "compliance_qa",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "duration_ms": duration_ms,
        "llm_model": _LLM_MODEL,
        "token_usage": token_usage,
        "loop": loop_count,
        "score": result.score,
        "route_to": result.route_to,
        "issues": result.issues,
        "reasoning": f"Validation score {result.score}, routing to {result.route_to}" + (
            f" — issues: {', '.join(result.issues[:2])}" if result.issues else ""
        ),
        "output_summary": f"score={result.score}, route={result.route_to}, issues={len(result.issues)}",
    }

    update = {
        "validation_result": result.model_dump(),
        "validation_count": loop_count,
        "investigation_status": f"validation_{result.route_to}",
        "agent_audit_log": [audit_entry],
    }

    return Command(goto=result.route_to, update=update)
