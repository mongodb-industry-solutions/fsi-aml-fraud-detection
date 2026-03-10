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

import asyncio
import json
import logging
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional

from bson import ObjectId
from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.responses import StreamingResponse
from dependencies import get_mongo_client, get_database, DB_NAME
from services.agents.graph import get_compiled_graph

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/agents", tags=["agent-investigation"])

# ── SSE helpers ──────────────────────────────────────────────────────

_AGENT_NODES = frozenset({
    "triage", "data_gathering", "assemble_case",
    "typology", "network_analyst", "temporal_analyst",
    "trail_follower", "dispatch_sub_investigations",
    "mini_investigate", "collect_sub_findings",
    "narrative", "validation", "human_review", "finalize",
    "auto_close",
    "fetch_entity_profile", "fetch_transactions",
    "fetch_network", "fetch_watchlist",
})

_STATE_OUTPUT_KEYS = (
    "triage_decision", "typology", "narrative", "network_analysis",
    "temporal_analysis", "trail_analysis", "sub_investigation_findings",
    "sub_investigation_summary", "validation_result", "case_file",
    "gathered_data", "human_decision",
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


def _emit_node_events(node_name: str, state_update):
    """Yield agent_start, tool_start/tool_end pairs, then agent_end SSE events."""
    events = []
    events.append(_sse({
        "type": "agent_start",
        "agent": node_name,
        "timestamp": _now(),
    }))

    tool_calls = []
    status = ""
    output_data = {}
    if isinstance(state_update, dict):
        tool_calls = state_update.get("_node_tool_calls", [])
        if not isinstance(tool_calls, list):
            tool_calls = []
        status = state_update.get("investigation_status", "")
        output_data = _extract_agent_output(state_update)

    for tc in tool_calls:
        events.append(_sse({
            "type": "tool_start",
            "agent": node_name,
            "tool": tc.get("tool", "unknown"),
            "input": tc.get("input", ""),
            "timestamp": _now(),
        }))
        events.append(_sse({
            "type": "tool_end",
            "agent": node_name,
            "tool": tc.get("tool", "unknown"),
            "output": tc.get("output", ""),
            "timestamp": _now(),
        }))

    events.append(_sse({
        "type": "agent_end",
        "agent": node_name,
        "status": status,
        "output": output_data,
        "timestamp": _now(),
    }))
    return events


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

    # Insert alert document into alerts collection (event-driven trigger pattern)
    alert_doc = {
        "entity_id": entity_id,
        "alert_type": alert_data["alert_type"],
        "submitted_at": datetime.now(timezone.utc),
        "status": "pending",
        "thread_id": thread_id,
    }
    try:
        client = get_mongo_client()
        result = client[DB_NAME]["alerts"].insert_one(alert_doc)
        alert_id = str(result.inserted_id)
    except Exception as exc:
        logger.warning("Failed to insert alert doc: %s", exc)
        alert_id = None

    async def event_stream():
        graph = get_compiled_graph()

        # Emit alert ingestion event first
        yield _sse({
            "type": "alert_ingested",
            "alert_id": alert_id,
            "entity_id": entity_id,
            "alert_type": alert_data["alert_type"],
            "timestamp": _now(),
        })

        yield _sse({
            "type": "pipeline_started",
            "agent": "triage",
            "timestamp": _now(),
        })
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
                    for event in _emit_node_events(node_name, state_update):
                        yield event

            final_state = graph.get_state(config)
            state_values = final_state.values if final_state else {}
            is_interrupted = bool(final_state.next) if final_state else False

            if is_interrupted:
                yield _sse({
                    "type": "agent_start",
                    "agent": "human_review",
                    "timestamp": _now(),
                })

            # Update alert status
            if alert_id:
                try:
                    new_status = "awaiting_review" if is_interrupted else "completed"
                    client[DB_NAME]["alerts"].update_one(
                        {"_id": ObjectId(alert_id)},
                        {"$set": {"status": new_status, "completed_at": datetime.now(timezone.utc)}},
                    )
                except Exception:
                    pass

            yield _sse({
                "type": "investigation_complete",
                "thread_id": thread_id,
                "case_id": state_values.get("case_id", ""),
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
        yield _sse({
            "type": "pipeline_resumed",
            "agent": "human_review",
            "timestamp": _now(),
        })
        try:
            # region agent log
            import time as _t; open("/Users/mehar.grewal/Desktop/Work/Coding/Finance/Fraud/fsi-aml-fraud-detection/.cursor/debug-f0b7a1.log","a").write(json.dumps({"sessionId":"f0b7a1","location":"investigation_routes.py:resume_pre_update","message":"State before update_state","data":{"thread_id":thread_id,"next":str(getattr(graph.get_state(config),"next","N/A"))},"timestamp":int(_t.time()*1000),"hypothesisId":"C"})+"\n")
            # endregion

            audit_entry = {
                "agent": "human_review",
                "timestamp": _now(),
                "analyst_decision": decision,
                "analyst_notes": analyst_notes,
            }

            graph.update_state(
                config,
                {
                    "human_decision": resume_value,
                    "investigation_status": "reviewed_by_analyst",
                    "agent_audit_log": [audit_entry],
                },
                as_node="human_review",
            )

            # region agent log
            open("/Users/mehar.grewal/Desktop/Work/Coding/Finance/Fraud/fsi-aml-fraud-detection/.cursor/debug-f0b7a1.log","a").write(json.dumps({"sessionId":"f0b7a1","location":"investigation_routes.py:resume_post_update","message":"State after update_state(as_node=human_review)","data":{"thread_id":thread_id,"next":str(getattr(graph.get_state(config),"next","N/A"))},"timestamp":int(_t.time()*1000),"hypothesisId":"C"})+"\n")
            # endregion

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
                    for event in _emit_node_events(node_name, state_update):
                        yield event

            final_state = graph.get_state(config)
            state_values = final_state.values if final_state else {}

            # region agent log
            open("/Users/mehar.grewal/Desktop/Work/Coding/Finance/Fraud/fsi-aml-fraud-detection/.cursor/debug-f0b7a1.log","a").write(json.dumps({"sessionId":"f0b7a1","location":"investigation_routes.py:resume_final","message":"Resume stream finished","data":{"status":state_values.get("investigation_status",""),"case_id":state_values.get("case_id",""),"has_human_decision":bool(state_values.get("human_decision")),"next":str(getattr(final_state,"next","N/A"))},"timestamp":int(_t.time()*1000),"hypothesisId":"C"})+"\n")
            # endregion

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

    for inv in investigations:
        if not inv.get("entity_name"):
            name = (inv.get("case_file") or {}).get("entity", {}).get("name", "")
            if name:
                inv["entity_name"] = name
                coll.update_one(
                    {"case_id": inv["case_id"]},
                    {"$set": {"entity_name": name}},
                )

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


# ── Investigable entities ─────────────────────────────────────────────

SCENARIO_CATEGORY_MAP = {
    "shell_company_candidate": "shell_company",
    "pep_individual_varied": "pep_exposure",
    "sanctioned_org_varied": "sanctions_evasion",
    "rapid_mover": "rapid_movement",
    "generic_individual": "false_positive",
    "generic_organization": "false_positive",
    "hnwi_global_investor": "hnwi",
}


def _categorize_entity(scenario_key: str) -> str:
    """Map a scenarioKey to an investigation category."""
    if not scenario_key:
        return "other"
    for prefix, category in SCENARIO_CATEGORY_MAP.items():
        if scenario_key.startswith(prefix):
            return category
    return "other"


@router.get("/entities/investigable")
async def list_investigable_entities():
    """Return entities grouped by investigation category with transactionsv2 red-flag tags."""
    client = get_mongo_client()
    db = client[DB_NAME]

    pipeline = [
        {"$lookup": {
            "from": "transactionsv2",
            "let": {"eid": "$entityId"},
            "pipeline": [
                {"$match": {"$expr": {"$or": [
                    {"$eq": ["$fromEntityId", "$$eid"]},
                    {"$eq": ["$toEntityId", "$$eid"]},
                ]}}},
                {"$match": {"flagged": True}},
                {"$unwind": {"path": "$tags", "preserveNullAndEmptyArrays": False}},
                {"$group": {"_id": None, "tags": {"$addToSet": "$tags"}}},
            ],
            "as": "_tx",
        }},
        {"$addFields": {
            "red_flag_tags": {"$ifNull": [{"$arrayElemAt": ["$_tx.tags", 0]}, []]},
        }},
        {"$project": {
            "_id": 0,
            "entityId": 1,
            "entityType": 1,
            "scenarioKey": 1,
            "name": 1,
            "riskAssessment": 1,
            "red_flag_tags": 1,
        }},
        {"$sort": {"scenarioKey": 1, "entityId": 1}},
    ]

    entities = list(db["entities"].aggregate(pipeline))

    grouped: Dict[str, list] = {}
    for ent in entities:
        key = ent.get("scenarioKey", "unknown")
        grouped.setdefault(key, []).append(ent)

    categorized: Dict[str, list] = {}
    for ent in entities:
        cat = _categorize_entity(ent.get("scenarioKey", ""))
        categorized.setdefault(cat, []).append(ent)

    return {"entities": entities, "grouped": grouped, "categorized": categorized}


# ── Typologies ───────────────────────────────────────────────────────

@router.get("/typologies")
async def list_typologies():
    """Return all AML typologies from the typology_library collection."""
    client = get_mongo_client()
    docs = list(
        client[DB_NAME]["typology_library"]
        .find({}, {"_id": 0})
        .sort("name", 1)
    )
    return {"typologies": docs}


# ── Change Stream WebSocket ───────────────────────────────────────────

_cs_connections: list = []


def _make_json_safe(obj):
    """Recursively convert MongoDB types to JSON-serializable types."""
    if isinstance(obj, ObjectId):
        return str(obj)
    if isinstance(obj, datetime):
        return obj.isoformat()
    if isinstance(obj, dict):
        return {k: _make_json_safe(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_make_json_safe(i) for i in obj]
    return obj


@router.websocket("/investigations/stream")
async def investigation_change_stream(websocket: WebSocket):
    """Stream real-time investigation updates via MongoDB Change Streams.

    Watches the `investigations` collection for insert/update/replace events
    and pushes them to connected WebSocket clients.
    """
    await websocket.accept()
    _cs_connections.append(websocket)

    db = get_database()

    try:
        pipeline = [
            {"$match": {
                "operationType": {"$in": ["insert", "update", "replace"]},
                "ns.coll": "investigations",
            }},
        ]

        async with db.watch(pipeline=pipeline, full_document="updateLookup") as stream:
            heartbeat_task = asyncio.create_task(_cs_heartbeat(websocket))

            async for change in stream:
                doc = change.get("fullDocument")
                if not doc:
                    continue

                safe_doc = _make_json_safe(doc)
                await websocket.send_json({
                    "type": "change",
                    "operationType": change["operationType"],
                    "investigation": {
                        "case_id": safe_doc.get("case_id"),
                        "entity_id": safe_doc.get("entity_id"),
                        "investigation_status": safe_doc.get("investigation_status"),
                        "created_at": safe_doc.get("created_at"),
                        "typology": safe_doc.get("typology", {}).get("primary_typology") if safe_doc.get("typology") else None,
                        "triage_risk_score": safe_doc.get("triage_decision", {}).get("risk_score") if safe_doc.get("triage_decision") else None,
                    },
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                })

    except WebSocketDisconnect:
        pass
    except Exception as exc:
        logger.error("Change stream WebSocket error: %s", exc)
    finally:
        if websocket in _cs_connections:
            _cs_connections.remove(websocket)
        try:
            if "heartbeat_task" in dir():
                heartbeat_task.cancel()
        except Exception:
            pass


async def _cs_heartbeat(ws: WebSocket):
    """Periodic heartbeat to keep the WebSocket alive."""
    try:
        while True:
            await asyncio.sleep(30)
            await ws.send_json({"type": "heartbeat", "timestamp": datetime.now(timezone.utc).isoformat()})
    except (WebSocketDisconnect, asyncio.CancelledError):
        pass


# ── Alerts Change Stream WebSocket ────────────────────────────────────

@router.websocket("/alerts/stream")
async def alerts_change_stream(websocket: WebSocket):
    """Stream real-time alert updates via MongoDB Change Streams.

    Watches the `alerts` collection for insert/update events
    and pushes them to connected WebSocket clients. Also watches
    the `investigations` collection to correlate completions.
    """
    await websocket.accept()

    db = get_database()

    try:
        # Send recent alerts as initial state
        recent = []
        cursor = db["alerts"].find().sort("submitted_at", -1).limit(20)
        async for doc in cursor:
            recent.append(_make_json_safe(doc))
        await websocket.send_json({"type": "initial", "alerts": recent})

        # Watch both alerts and investigations collections
        pipeline = [
            {"$match": {
                "operationType": {"$in": ["insert", "update", "replace"]},
                "ns.coll": {"$in": ["alerts", "investigations"]},
            }},
        ]

        heartbeat_task = asyncio.create_task(_cs_heartbeat(websocket))

        async with db.watch(pipeline=pipeline, full_document="updateLookup") as stream:
            async for change in stream:
                doc = change.get("fullDocument")
                if not doc:
                    continue

                safe_doc = _make_json_safe(doc)
                coll = change.get("ns", {}).get("coll", "")

                if coll == "alerts":
                    await websocket.send_json({
                        "type": "alert_change",
                        "operationType": change["operationType"],
                        "alert": {
                            "alert_id": safe_doc.get("_id"),
                            "entity_id": safe_doc.get("entity_id"),
                            "alert_type": safe_doc.get("alert_type"),
                            "status": safe_doc.get("status"),
                            "thread_id": safe_doc.get("thread_id"),
                        },
                        "timestamp": datetime.now(timezone.utc).isoformat(),
                    })
                elif coll == "investigations":
                    await websocket.send_json({
                        "type": "investigation_change",
                        "operationType": change["operationType"],
                        "investigation": {
                            "case_id": safe_doc.get("case_id"),
                            "entity_id": safe_doc.get("entity_id"),
                            "investigation_status": safe_doc.get("investigation_status"),
                            "created_at": safe_doc.get("created_at"),
                        },
                        "timestamp": datetime.now(timezone.utc).isoformat(),
                    })

    except WebSocketDisconnect:
        pass
    except Exception as exc:
        logger.error("Alerts change stream WebSocket error: %s", exc)
    finally:
        try:
            heartbeat_task.cancel()
        except Exception:
            pass


# ── Analytics Aggregation ─────────────────────────────────────────────

@router.get("/investigations/analytics")
async def investigation_analytics():
    """Compute investigation analytics using MongoDB aggregation pipelines.

    Returns status distribution, typology counts, and average risk scores
    using $facet, $group, and $avg stages.
    """
    client = get_mongo_client()
    db = client[DB_NAME]

    pipeline = [
        {"$facet": {
            "by_status": [
                {"$group": {"_id": "$investigation_status", "count": {"$sum": 1}}},
                {"$sort": {"count": -1}},
            ],
            "by_typology": [
                {"$match": {"typology.primary_typology": {"$exists": True, "$ne": None}}},
                {"$group": {"_id": "$typology.primary_typology", "count": {"$sum": 1}}},
                {"$sort": {"count": -1}},
                {"$limit": 10},
            ],
            "risk_stats": [
                {"$match": {"triage_decision.risk_score": {"$exists": True}}},
                {"$group": {
                    "_id": None,
                    "avg_risk": {"$avg": "$triage_decision.risk_score"},
                    "max_risk": {"$max": "$triage_decision.risk_score"},
                    "min_risk": {"$min": "$triage_decision.risk_score"},
                    "total": {"$sum": 1},
                }},
            ],
            "recent_7d": [
                {"$match": {"created_at": {"$gte": (datetime.now(timezone.utc).replace(hour=0, minute=0, second=0) - timedelta(days=7)).isoformat()}}},
                {"$count": "count"},
            ],
        }},
    ]

    results = list(db["investigations"].aggregate(pipeline))
    facets = results[0] if results else {}

    risk = facets.get("risk_stats", [{}])[0] if facets.get("risk_stats") else {}
    recent = facets.get("recent_7d", [{}])[0] if facets.get("recent_7d") else {}

    return {
        "by_status": facets.get("by_status", []),
        "by_typology": facets.get("by_typology", []),
        "risk_stats": {
            "avg": round(risk.get("avg_risk", 0), 1) if risk.get("avg_risk") else None,
            "max": risk.get("max_risk"),
            "min": risk.get("min_risk"),
            "total_scored": risk.get("total", 0),
        },
        "recent_7d": recent.get("count", 0),
        "aggregation_pipeline": json.dumps(pipeline, indent=2, default=str),
    }


# ── Investigation Search ──────────────────────────────────────────────

@router.get("/investigations/search")
async def search_investigations(q: str = "", limit: int = 20):
    """Search investigations by entity_id, case_id, typology, or narrative text.

    Uses MongoDB text matching on key investigation fields.
    """
    client = get_mongo_client()
    db = client[DB_NAME]

    if not q.strip():
        return {"results": [], "query": q}

    query_lower = q.strip().lower()
    query_regex = {"$regex": q.strip(), "$options": "i"}

    results = list(db["investigations"].find(
        {"$or": [
            {"case_id": query_regex},
            {"entity_id": query_regex},
            {"typology.primary_typology": query_regex},
            {"narrative.introduction": query_regex},
            {"case_file.key_findings": query_regex},
            {"alert_data.alert_type": query_regex},
        ]},
        {
            "_id": 0,
            "case_id": 1,
            "entity_id": 1,
            "investigation_status": 1,
            "created_at": 1,
            "typology.primary_typology": 1,
            "triage_decision.risk_score": 1,
            "narrative.introduction": 1,
        },
    ).sort("created_at", -1).limit(limit))

    return {"results": results, "query": q, "count": len(results)}


# ── Health check ─────────────────────────────────────────────────────

@router.get("/health")
async def agent_health():
    """Agent pipeline health check."""
    return {
        "status": "healthy",
        "service": "agent_investigation_pipeline",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
