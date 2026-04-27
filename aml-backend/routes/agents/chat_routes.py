"""
Chat API Routes for the conversational AML/Compliance Assistant.

Endpoints:
  POST /agents/chat           -- Send a message and receive SSE-streamed response
  GET  /agents/chat/history   -- Retrieve conversation history for a thread
"""

import json
import logging
import uuid
from datetime import datetime, timezone
from typing import Any, Dict

from fastapi import APIRouter, Depends, HTTPException, Query
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


def _extract_text_content(content) -> str:
    """Extract text from a message content field (string or list of blocks)."""
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        return "".join(
            block["text"] for block in content
            if isinstance(block, dict) and block.get("type") == "text"
        )
    return ""


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


@router.get("/chat/history", dependencies=[Depends(rate_limit_chat)])
async def get_chat_history(thread_id: str = Query(..., min_length=4, description="Thread ID to retrieve")):
    """Retrieve conversation history for a thread from the LangGraph checkpoint."""
    agent = get_chat_agent()
    config = {"configurable": {"thread_id": thread_id}}

    try:
        state = await agent.aget_state(config)
    except Exception as exc:
        logger.error("Failed to retrieve thread state: %s", exc)
        raise HTTPException(status_code=500, detail="Failed to retrieve thread history")

    if not state or not state.values:
        return {"messages": [], "thread_id": thread_id}

    messages = []
    for msg in state.values.get("messages", []):
        msg_type = getattr(msg, "type", None)

        if msg_type == "human":
            messages.append({"role": "user", "content": _extract_text_content(msg.content)})

        elif msg_type == "ai":
            entry = {
                "role": "assistant",
                "content": _extract_text_content(msg.content),
            }
            if hasattr(msg, "tool_calls") and msg.tool_calls:
                entry["toolCalls"] = [
                    {
                        "id": tc.get("id", ""),
                        "tool": tc.get("name", ""),
                        "input": json.dumps(tc.get("args", {}), default=str),
                        "output": None,
                    }
                    for tc in msg.tool_calls
                ]
            messages.append(entry)

        elif msg_type == "tool":
            # Match tool result to the correct tool call by tool_call_id
            tool_call_id = getattr(msg, "tool_call_id", None)
            if not messages or not messages[-1].get("toolCalls"):
                logger.warning("ToolMessage id=%s has no matching AI message in history", tool_call_id)
            else:
                matched = False
                if tool_call_id:
                    for tc in messages[-1]["toolCalls"]:
                        if tc.get("id") == tool_call_id and tc["output"] is None:
                            tc["output"] = _truncate(
                                msg.content if isinstance(msg.content, str) else json.dumps(msg.content, default=str)
                            )
                            matched = True
                            break
                # Fallback for legacy checkpoints without tool_call_id
                if not matched:
                    for tc in messages[-1]["toolCalls"]:
                        if tc["output"] is None:
                            tc["output"] = _truncate(
                                msg.content if isinstance(msg.content, str) else json.dumps(msg.content, default=str)
                            )
                            break

    return {"messages": messages, "thread_id": thread_id}
