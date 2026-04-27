"""LangGraph callback-based tracing for the investigation pipeline.

Emits structured JSON logs for LLM calls, tool executions, and node
transitions using LangChain's BaseCallbackHandler. Zero external
dependencies -- logs go to Python's standard logging framework.
"""

import json
import logging
import time
from typing import Any, Dict, List, Optional
from uuid import UUID

from langchain_core.callbacks import BaseCallbackHandler
from langchain_core.outputs import LLMResult

logger = logging.getLogger("agents.tracing")


class InvestigationTracingHandler(BaseCallbackHandler):
    """Structured JSON logger for LangGraph pipeline observability."""

    def __init__(self, thread_id: str = ""):
        super().__init__()
        self.thread_id = thread_id
        self._llm_starts: Dict[str, float] = {}
        self._tool_starts: Dict[str, float] = {}

    def _log(self, event_type: str, data: dict) -> None:
        data["thread_id"] = self.thread_id
        data["event"] = event_type
        logger.info(json.dumps(data, default=str))

    def on_llm_start(
        self,
        serialized: Dict[str, Any],
        prompts: List[str],
        *,
        run_id: UUID,
        **kwargs: Any,
    ) -> None:
        self._llm_starts[str(run_id)] = time.perf_counter()
        self._log("llm_start", {
            "run_id": str(run_id),
            "model": serialized.get("kwargs", {}).get("model", ""),
        })

    def on_llm_end(
        self,
        response: LLMResult,
        *,
        run_id: UUID,
        **kwargs: Any,
    ) -> None:
        t0 = self._llm_starts.pop(str(run_id), None)
        duration_ms = int((time.perf_counter() - t0) * 1000) if t0 else None
        token_usage = {}
        if response.llm_output:
            token_usage = response.llm_output.get("usage", {})
        self._log("llm_end", {
            "run_id": str(run_id),
            "duration_ms": duration_ms,
            "token_usage": token_usage,
        })

    def on_llm_error(
        self,
        error: BaseException,
        *,
        run_id: UUID,
        **kwargs: Any,
    ) -> None:
        t0 = self._llm_starts.pop(str(run_id), None)
        duration_ms = int((time.perf_counter() - t0) * 1000) if t0 else None
        self._log("llm_error", {
            "run_id": str(run_id),
            "duration_ms": duration_ms,
            "error": str(error),
        })

    def on_tool_start(
        self,
        serialized: Dict[str, Any],
        input_str: str,
        *,
        run_id: UUID,
        **kwargs: Any,
    ) -> None:
        self._tool_starts[str(run_id)] = time.perf_counter()
        self._log("tool_start", {
            "run_id": str(run_id),
            "tool": serialized.get("name", ""),
            "input": input_str[:500],
        })

    def on_tool_end(
        self,
        output: str,
        *,
        run_id: UUID,
        **kwargs: Any,
    ) -> None:
        t0 = self._tool_starts.pop(str(run_id), None)
        duration_ms = int((time.perf_counter() - t0) * 1000) if t0 else None
        self._log("tool_end", {
            "run_id": str(run_id),
            "duration_ms": duration_ms,
            "output_length": len(str(output)),
        })

    def on_tool_error(
        self,
        error: BaseException,
        *,
        run_id: UUID,
        **kwargs: Any,
    ) -> None:
        t0 = self._tool_starts.pop(str(run_id), None)
        duration_ms = int((time.perf_counter() - t0) * 1000) if t0 else None
        self._log("tool_error", {
            "run_id": str(run_id),
            "duration_ms": duration_ms,
            "error": str(error),
        })


def get_tracing_callbacks(thread_id: str = "") -> list:
    """Return a list of callback handlers for a graph invocation."""
    return [InvestigationTracingHandler(thread_id=thread_id)]
