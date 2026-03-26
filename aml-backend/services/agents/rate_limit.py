"""Simple in-memory rate limiter for agent endpoints.

Uses a sliding-window counter per client IP. Intended as a baseline
guard against accidental DoS / runaway cost on Bedrock LLM calls.
Not a substitute for a proper API gateway in production.
"""

import time
from collections import defaultdict
from fastapi import HTTPException, Request

import os

_WINDOW_SECONDS = 60


def _safe_int(env_key: str, default: int) -> int:
    try:
        return int(os.getenv(env_key, str(default)))
    except (ValueError, TypeError):
        return default


_MAX_INVESTIGATE = _safe_int("RATE_LIMIT_INVESTIGATE", 10)
_MAX_CHAT = _safe_int("RATE_LIMIT_CHAT", 30)

_buckets: dict[str, list[float]] = defaultdict(list)


def _check(key: str, max_requests: int) -> None:
    now = time.monotonic()
    window_start = now - _WINDOW_SECONDS
    hits = _buckets[key]
    _buckets[key] = [t for t in hits if t > window_start]
    if len(_buckets[key]) >= max_requests:
        raise HTTPException(
            status_code=429,
            detail=f"Rate limit exceeded: max {max_requests} requests per {_WINDOW_SECONDS}s",
        )
    _buckets[key].append(now)


async def rate_limit_investigate(request: Request) -> None:
    client = request.client.host if request.client else "unknown"
    _check(f"investigate:{client}", _MAX_INVESTIGATE)


async def rate_limit_chat(request: Request) -> None:
    client = request.client.host if request.client else "unknown"
    _check(f"chat:{client}", _MAX_CHAT)
