"""
Chat API Routes for the conversational AML/Compliance Assistant.

Endpoint:
  POST /agents/chat  -- Send a message and receive SSE-streamed response
"""

import json
import logging
import uuid
from datetime import datetime, timezone
from typing import Any, Dict

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse

from services.agents.chat_agent import get_chat_agent
from services.agents.tracing import get_tracing_callbacks
from services.agents.rate_limit import rate_limit_chat
from services.agents.artifact_parser import ArtifactStreamParser

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/agents", tags=["agent-chat"])

MAX_OUTPUT_CHARS = 4000


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _sse(payload: dict) -> str:
    return f"data: {json.dumps(payload, default=str)}\n\n"


def _truncate(text: str, limit: int = MAX_OUTPUT_CHARS) -> str:
    if len(text) <= limit:
        return text
    return text[:limit] + f"... [{len(text) - limit} chars truncated]"


def _artifact_sse(evt_type: str, payload) -> str:
    """Convert an ArtifactStreamParser event into an SSE line."""
    if evt_type == "text":
        return _sse({"type": "token", "content": payload})
    if evt_type == "artifact_start":
        return _sse({
            "type": "artifact_start",
            "identifier": payload["identifier"],
            "artifact_type": payload["type"],
            "title": payload["title"],
            "timestamp": _now(),
        })
    if evt_type == "artifact_delta":
        return _sse({
            "type": "artifact_delta",
            "identifier": payload["identifier"],
            "content": payload["content"],
        })
    if evt_type == "artifact_end":
        evt = {
            "type": "artifact_end",
            "identifier": payload["identifier"],
            "timestamp": _now(),
        }
        if payload.get("truncated"):
            evt["truncated"] = True
        return _sse(evt)
    return ""


@router.post("/chat", dependencies=[Depends(rate_limit_chat)])
async def chat(request: Dict[str, Any]):
    """Send a message to the AML compliance assistant.

    Body:
        { "message": "...", "thread_id": "..." (optional) }

    Returns SSE stream with events:
        { type: "thread_id", thread_id }
        { type: "tool_call", tool, input }
        { type: "tool_result", tool, output }
        { type: "token", content }
        { type: "artifact_start", identifier, artifact_type, title }
        { type: "artifact_delta", identifier, content }
        { type: "artifact_end", identifier }
        { type: "done" }
    """
    message = request.get("message", "").strip()
    if not message:
        raise HTTPException(status_code=400, detail="message is required")

    thread_id = request.get("thread_id") or f"chat-{uuid.uuid4().hex[:12]}"
    config = {
        "configurable": {"thread_id": thread_id},
        "recursion_limit": 40,
        "callbacks": get_tracing_callbacks(thread_id),
    }

    async def event_stream():
        yield _sse({"type": "thread_id", "thread_id": thread_id, "timestamp": _now()})

        artifact_parser = ArtifactStreamParser()
        agent = get_chat_agent()
        try:
            async for event in agent.astream_events(
                {"messages": [{"role": "user", "content": message}]},
                config=config,
                version="v2",
            ):
                kind = event.get("event", "")

                if kind == "on_chat_model_stream":
                    chunk = event.get("data", {}).get("chunk")
                    if chunk and hasattr(chunk, "content") and chunk.content:
                        content = chunk.content
                        if isinstance(content, list):
                            text_parts = []
                            for block in content:
                                if isinstance(block, dict) and block.get("type") == "text":
                                    text_parts.append(block["text"])
                                elif isinstance(block, str):
                                    text_parts.append(block)
                            content = "".join(text_parts)
                        if isinstance(content, str) and content:
                            for evt_type, payload in artifact_parser.feed(content):
                                yield _artifact_sse(evt_type, payload)

                elif kind == "on_tool_start":
                    yield _sse({
                        "type": "tool_call",
                        "tool": event.get("name", ""),
                        "input": _truncate(json.dumps(event.get("data", {}).get("input", {}), default=str)),
                        "timestamp": _now(),
                    })

                elif kind == "on_tool_end":
                    raw_output = event.get("data", {}).get("output", "")
                    if hasattr(raw_output, "content"):
                        output_str = raw_output.content if isinstance(raw_output.content, str) else json.dumps(raw_output.content, default=str)
                    elif isinstance(raw_output, str):
                        output_str = raw_output
                    else:
                        output_str = json.dumps(raw_output, default=str)
                    yield _sse({
                        "type": "tool_result",
                        "tool": event.get("name", ""),
                        "output": _truncate(output_str),
                        "timestamp": _now(),
                    })

            for evt_type, payload in artifact_parser.flush():
                yield _artifact_sse(evt_type, payload)

            yield _sse({"type": "done", "thread_id": thread_id, "timestamp": _now()})

        except Exception as e:
            logger.exception("Chat stream error")
            for evt_type, payload in artifact_parser.flush():
                yield _artifact_sse(evt_type, payload)
            yield _sse({"type": "error", "message": str(e), "timestamp": _now()})
            yield _sse({"type": "done", "thread_id": thread_id, "timestamp": _now()})

    return StreamingResponse(event_stream(), media_type="text/event-stream")
