"""
Agent Investigation API Routes

Endpoints:
  POST /agents/investigate          – Launch a new investigation
  POST /agents/investigate/resume   – Resume after human review
  GET  /agents/investigations       – List all investigations
  GET  /agents/investigations/{id}  – Get single investigation detail
  POST /agents/seed                 – Seed typology & compliance collections
  GET  /agents/health               – Health check
"""

import json
import logging
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, Optional

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from dependencies import get_mongo_client, DB_NAME
from services.agents.graph import get_compiled_graph

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/agents", tags=["agent-investigation"])

# ── SSE helpers ──────────────────────────────────────────────────────

_AGENT_NODES = frozenset({
    "triage", "data_gathering", "assemble_case",
    "typology", "network_analyst", "narrative",
    "validation", "human_review", "finalize",
    "auto_close", "urgent_escalation",
    "fetch_entity_profile", "fetch_transactions",
    "fetch_network", "fetch_watchlist",
})

_STATE_OUTPUT_KEYS = (
    "triage_decision", "typology", "narrative", "network_analysis",
    "validation_result", "case_file", "gathered_data", "human_decision",
)

MAX_PAYLOAD_CHARS = 8000


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _truncate(text: str, limit: int = MAX_PAYLOAD_CHARS) -> str:
    if len(text) <= limit:
        return text
    return text[:limit] + f"... [{len(text) - limit} chars truncated]"


def _safe_serialize(obj: Any) -> Any:
    """Convert an object to a JSON-safe representation, truncated."""
    try:
        text = json.dumps(obj, default=str)
    except Exception:
        text = str(obj)
    return _truncate(text, MAX_PAYLOAD_CHARS)


def _extract_llm_content(raw_output: Any) -> str:
    """Pull readable text from a ChatModel output (AIMessage or dict)."""
    if hasattr(raw_output, "content"):
        return str(raw_output.content)
    if isinstance(raw_output, dict):
        if "content" in raw_output:
            return str(raw_output["content"])
        return json.dumps(raw_output, default=str)
    return str(raw_output)


def _sse(payload: dict) -> str:
    return f"data: {json.dumps(payload, default=str)}\n\n"


def _truncate_deep(obj: Any, budget: int = MAX_PAYLOAD_CHARS) -> Any:
    """Recursively truncate string values within dicts/lists to stay under budget
    while preserving the dict/list structure the frontend expects."""
    if isinstance(obj, str):
        return obj[:budget] + "..." if len(obj) > budget else obj
    if isinstance(obj, dict):
        out = {}
        for k, v in obj.items():
            out[k] = _truncate_deep(v, budget // max(len(obj), 1))
        return out
    if isinstance(obj, list):
        if len(obj) > 20:
            return [_truncate_deep(item, budget // 20) for item in obj[:20]]
        return [_truncate_deep(item, budget // max(len(obj), 1)) for item in obj]
    return obj


def _extract_agent_output(result: dict) -> dict:
    """Extract structured output keys from a node's state update."""
    output = {}
    for key in _STATE_OUTPUT_KEYS:
        if key in result:
            val = result[key]
            try:
                serialized = json.dumps(val, default=str)
                if len(serialized) <= MAX_PAYLOAD_CHARS:
                    output[key] = val
                else:
                    output[key] = _truncate_deep(val, MAX_PAYLOAD_CHARS)
            except Exception:
                output[key] = str(val)[:MAX_PAYLOAD_CHARS]
    return output


# ── Launch investigation ──────────────────────────────────────────────

@router.post("/investigate")
async def launch_investigation(request: Dict[str, Any]):
    """Start a new agentic investigation.

    Body:
        { "entity_id": "...", "alert_type": "...", ... }
    """
    entity_id = request.get("entity_id")
    if not entity_id:
        raise HTTPException(status_code=400, detail="entity_id is required")

    thread_id = f"case-{uuid.uuid4().hex[:12]}"
    config = {"configurable": {"thread_id": thread_id}, "recursion_limit": 100}

    alert_data = {
        "entity_id": entity_id,
        "alert_type": request.get("alert_type", "suspicious_activity"),
        "submitted_at": datetime.now(timezone.utc).isoformat(),
        **{k: v for k, v in request.items() if k not in ("entity_id", "alert_type")},
    }

    async def event_stream():
        graph = get_compiled_graph()
        try:
            async for chunk in graph.astream(
                {"alert_data": alert_data},
                config=config,
                stream_mode="updates",
            ):
                if not isinstance(chunk, dict):
                    continue
                for node_name, state_update in chunk.items():
                    if node_name not in _AGENT_NODES:
                        continue
                    yield _sse({
                        "type": "agent_start",
                        "agent": node_name,
                        "timestamp": _now(),
                    })
                    status = ""
                    output_data = {}
                    if isinstance(state_update, dict):
                        status = state_update.get("investigation_status", "")
                        output_data = _extract_agent_output(state_update)
                    yield _sse({
                        "type": "agent_end",
                        "agent": node_name,
                        "status": status,
                        "output": output_data,
                        "timestamp": _now(),
                    })

            final_state = graph.get_state(config)
            state_values = final_state.values if final_state else {}
            is_interrupted = bool(final_state.next) if final_state else False

            if is_interrupted:
                yield _sse({
                    "type": "agent_start",
                    "agent": "human_review",
                    "timestamp": _now(),
                })

            yield _sse({
                "type": "investigation_complete",
                "thread_id": thread_id,
                "status": state_values.get("investigation_status", "unknown"),
                "triage_decision": state_values.get("triage_decision", {}),
                "typology": state_values.get("typology", {}),
                "narrative": state_values.get("narrative", {}),
                "validation_result": state_values.get("validation_result", {}),
                "needs_human_review": is_interrupted,
                "timestamp": _now(),
            })
        except Exception as e:
            logger.exception("Investigation stream error")
            yield _sse({"type": "error", "message": str(e)})

    return StreamingResponse(event_stream(), media_type="text/event-stream")


# ── Resume after human review ────────────────────────────────────────

@router.post("/investigate/resume")
async def resume_investigation(request: Dict[str, Any]):
    """Resume an investigation paused at human review.

    Body:
        { "thread_id": "case-...", "decision": "approve|reject|request_changes",
          "analyst_notes": "..." }
    """
    thread_id = request.get("thread_id")
    if not thread_id:
        raise HTTPException(status_code=400, detail="thread_id is required")

    decision = request.get("decision", "approve")
    analyst_notes = request.get("analyst_notes", "")

    config = {"configurable": {"thread_id": thread_id}, "recursion_limit": 100}
    resume_value = {"decision": decision, "analyst_notes": analyst_notes}

    graph = get_compiled_graph()

    async def event_stream():
        try:
            graph.update_state(
                config,
                {"human_decision": resume_value},
                as_node="validation",
            )

            async for chunk in graph.astream(
                None,
                config=config,
                stream_mode="updates",
            ):
                if not isinstance(chunk, dict):
                    continue
                for node_name, state_update in chunk.items():
                    if node_name not in _AGENT_NODES:
                        continue
                    yield _sse({
                        "type": "agent_start",
                        "agent": node_name,
                        "timestamp": _now(),
                    })
                    status = ""
                    output_data = {}
                    if isinstance(state_update, dict):
                        status = state_update.get("investigation_status", "")
                        output_data = _extract_agent_output(state_update)
                    yield _sse({
                        "type": "agent_end",
                        "agent": node_name,
                        "status": status,
                        "output": output_data,
                        "timestamp": _now(),
                    })

            final_state = graph.get_state(config)
            state_values = final_state.values if final_state else {}
            yield _sse({
                "type": "resume_complete",
                "thread_id": thread_id,
                "status": state_values.get("investigation_status", "unknown"),
                "triage_decision": state_values.get("triage_decision", {}),
                "typology": state_values.get("typology", {}),
                "narrative": state_values.get("narrative", {}),
                "validation_result": state_values.get("validation_result", {}),
                "case_id": state_values.get("case_id", ""),
                "human_decision": state_values.get("human_decision", {}),
                "timestamp": _now(),
            })
        except Exception as e:
            logger.exception("Resume stream error")
            yield _sse({"type": "error", "message": str(e)})

    return StreamingResponse(event_stream(), media_type="text/event-stream")


# ── List investigations ──────────────────────────────────────────────

@router.get("/investigations")
async def list_investigations(
    status: Optional[str] = None,
    limit: int = 20,
    skip: int = 0,
):
    """List all investigations, optionally filtered by status."""
    client = get_mongo_client()
    coll = client[DB_NAME]["investigations"]

    query: dict = {}
    if status:
        query["investigation_status"] = status

    cursor = coll.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit)
    investigations = list(cursor)
    total = coll.count_documents(query)

    return {"investigations": investigations, "total": total, "skip": skip, "limit": limit}


# ── Get investigation detail ─────────────────────────────────────────

@router.get("/investigations/{case_id}")
async def get_investigation(case_id: str):
    """Get a single investigation by case_id."""
    client = get_mongo_client()
    doc = client[DB_NAME]["investigations"].find_one(
        {"case_id": case_id}, {"_id": 0}
    )
    if not doc:
        raise HTTPException(status_code=404, detail=f"Investigation {case_id} not found")
    return doc


# ── Seed agent collections ───────────────────────────────────────────

@router.post("/seed")
async def seed_collections():
    """Seed typology_library and compliance_policies collections."""
    from services.agents.seed import seed_agent_collections
    stats = await seed_agent_collections()
    return {"status": "seeded", "stats": stats}


# ── Health check ─────────────────────────────────────────────────────

@router.get("/health")
async def agent_health():
    """Agent pipeline health check."""
    return {
        "status": "healthy",
        "service": "agent_investigation_pipeline",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
