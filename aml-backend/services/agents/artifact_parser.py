"""
Streaming artifact parser for LLM token streams.

Detects <artifact identifier="..." type="..." title="...">...</artifact> XML
boundaries in an incremental character stream and yields structured events that
the SSE layer can forward directly to the frontend.
"""

from __future__ import annotations

import re
from enum import Enum, auto
from typing import Any, Dict, Generator, Tuple

_OPEN_TAG_RE = re.compile(
    r'<artifact\s+'
    r'(?=.*?identifier\s*=\s*"(?P<identifier>[^"]*)")'
    r'(?=.*?type\s*=\s*"(?P<type>[^"]*)")'
    r'(?=.*?title\s*=\s*"(?P<title>[^"]*)")'
    r'[^>]*>',
    re.DOTALL,
)

_CLOSE_TAG = "</artifact>"

DELTA_FLUSH_SIZE = 400


class _State(Enum):
    TEXT = auto()
    MAYBE_OPEN = auto()
    ARTIFACT = auto()


Event = Tuple[str, Any]


class ArtifactStreamParser:
    """Incremental parser that splits an LLM token stream into plain-text
    segments and structured artifact events.

    Usage::

        parser = ArtifactStreamParser()
        for token in llm_stream:
            for event_type, payload in parser.feed(token):
                ...
        for event_type, payload in parser.flush():
            ...

    Yielded events
    ~~~~~~~~~~~~~~
    - ``("text", "<string>")`` -- regular text outside any artifact
    - ``("artifact_start", {"identifier": ..., "type": ..., "title": ...})``
    - ``("artifact_delta", {"identifier": ..., "content": ...})``
    - ``("artifact_end",   {"identifier": ...})``
    """

    def __init__(self) -> None:
        self._state = _State.TEXT
        self._buf = ""
        self._artifact_id: str | None = None
        self._artifact_content = ""

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def feed(self, token: str) -> Generator[Event, None, None]:
        """Feed a token (may be one char or many) and yield events."""
        self._buf += token
        yield from self._consume()

    def flush(self) -> Generator[Event, None, None]:
        """Flush any remaining buffered content at end-of-stream.

        If the stream ends mid-artifact (no closing ``</artifact>`` was seen),
        the emitted ``artifact_end`` event carries ``"truncated": True`` so the
        frontend can distinguish a clean close from a cut-off.
        """
        if self._state in (_State.TEXT, _State.MAYBE_OPEN):
            if self._buf:
                yield ("text", self._buf)
                self._buf = ""
        elif self._state == _State.ARTIFACT:
            if self._artifact_content:
                yield ("artifact_delta", {
                    "identifier": self._artifact_id,
                    "content": self._artifact_content,
                })
                self._artifact_content = ""
            if self._buf:
                yield ("artifact_delta", {
                    "identifier": self._artifact_id,
                    "content": self._buf,
                })
                self._buf = ""
            yield ("artifact_end", {
                "identifier": self._artifact_id,
                "truncated": True,
            })
            self._artifact_id = None
            self._state = _State.TEXT

    # ------------------------------------------------------------------
    # Internal state machine
    # ------------------------------------------------------------------

    def _consume(self) -> Generator[Event, None, None]:
        changed = True
        while changed:
            changed = False

            if self._state == _State.TEXT:
                idx = self._buf.find("<artifact")
                if idx == -1:
                    safe = self._safe_text_flush()
                    if safe:
                        yield ("text", safe)
                        changed = True
                elif idx > 0:
                    yield ("text", self._buf[:idx])
                    self._buf = self._buf[idx:]
                    self._state = _State.MAYBE_OPEN
                    changed = True
                else:
                    self._state = _State.MAYBE_OPEN
                    changed = True

            elif self._state == _State.MAYBE_OPEN:
                close_bracket = self._buf.find(">")
                if close_bracket == -1:
                    break

                candidate = self._buf[: close_bracket + 1]
                m = _OPEN_TAG_RE.match(candidate)
                if m:
                    self._artifact_id = m.group("identifier")
                    yield ("artifact_start", {
                        "identifier": m.group("identifier"),
                        "type": m.group("type"),
                        "title": m.group("title"),
                    })
                    self._buf = self._buf[close_bracket + 1:]
                    self._artifact_content = ""
                    self._state = _State.ARTIFACT
                    changed = True
                else:
                    yield ("text", candidate)
                    self._buf = self._buf[close_bracket + 1:]
                    self._state = _State.TEXT
                    changed = True

            elif self._state == _State.ARTIFACT:
                idx = self._buf.find("</artifact>")
                if idx != -1:
                    self._artifact_content += self._buf[:idx]
                    if self._artifact_content:
                        yield ("artifact_delta", {
                            "identifier": self._artifact_id,
                            "content": self._artifact_content,
                        })
                        self._artifact_content = ""
                    yield ("artifact_end", {"identifier": self._artifact_id})
                    self._buf = self._buf[idx + len(_CLOSE_TAG):]
                    self._artifact_id = None
                    self._state = _State.TEXT
                    changed = True
                else:
                    maybe_close = self._buf.rfind("<")
                    if maybe_close == -1:
                        self._artifact_content += self._buf
                        self._buf = ""
                    elif maybe_close > 0:
                        self._artifact_content += self._buf[:maybe_close]
                        self._buf = self._buf[maybe_close:]
                    elif _CLOSE_TAG.startswith(self._buf):
                        # Buffer is a valid prefix of "</artifact>" — wait
                        pass
                    else:
                        # Leading '<' is NOT a close-tag prefix (e.g. "<div>")
                        self._artifact_content += self._buf[0]
                        self._buf = self._buf[1:]
                        changed = True

                    if len(self._artifact_content) >= DELTA_FLUSH_SIZE:
                        yield ("artifact_delta", {
                            "identifier": self._artifact_id,
                            "content": self._artifact_content,
                        })
                        self._artifact_content = ""
                        changed = True
                    if not changed:
                        break

    def _safe_text_flush(self) -> str:
        """Return the portion of ``_buf`` that can safely be emitted as text
        (everything before a potential ``<artifact`` prefix at the end)."""
        idx = self._buf.rfind("<")
        if idx == -1:
            text = self._buf
            self._buf = ""
            return text
        if idx == 0:
            return ""
        text = self._buf[:idx]
        self._buf = self._buf[idx:]
        return text
