"""JSON-aware payload truncation for LLM evidence payloads.

Raw string slicing (e.g. json.dumps(...)[:12000]) produces malformed JSON
that causes LLMs to hallucinate or produce incomplete outputs. This module
provides safe alternatives that always return valid JSON.
"""

import copy
import json
import logging
from typing import Any

logger = logging.getLogger(__name__)

_TRUNCATED = "[truncated — evidence available in full state]"

_PRESERVE_KEYS = {
    "case_file", "narrative",
    "network_analysis", "temporal_analysis", "trail_analysis",
    "typology", "typology_classification",
}

_DROP_ORDER = [
    "sub_investigation_findings",
    "typology_classification", "typology",
    "trail_analysis",
    "temporal_analysis",
    "network_analysis",
    "narrative",
    "case_file",
]


def _estimate_size(obj: Any) -> int:
    """Byte-length of the JSON serialization of *obj*."""
    return len(json.dumps(obj, default=str))


def _trim_list(lst: list, target: int) -> list:
    """Progressively shorten a list until its serialized size fits target."""
    while len(lst) > 1 and _estimate_size(lst) > target:
        lst = lst[: len(lst) // 2]
    if len(lst) == 1 and _estimate_size(lst) > target:
        return []
    return lst


def truncate_payload(payload: dict, max_chars: int) -> str:
    """Serialize *payload* to JSON, trimming large sub-values to stay under *max_chars*.

    Strategy:
    1. Serialize the full payload. If it fits, return as-is.
    2. Otherwise, identify the largest list/dict values and progressively
       shrink them (halving lists, trimming long strings) until the output fits.
    3. If still over budget, drop unprotected keys by size (largest first),
       then drop protected keys in a defined priority order (_DROP_ORDER).
    4. As a final fallback, replace ALL keys with truncation markers.
       The result is always valid JSON.
    """
    full = json.dumps(payload, default=str)
    if len(full) <= max_chars:
        return full

    working = copy.deepcopy(payload)

    for _ in range(8):
        sizes = []
        for key, val in working.items():
            sizes.append((key, _estimate_size(val)))
        sizes.sort(key=lambda x: x[1], reverse=True)

        shrunk = False
        for key, size in sizes:
            val = working[key]

            if isinstance(val, dict):
                for sub_key, sub_val in list(val.items()):
                    if isinstance(sub_val, list) and len(sub_val) > 2:
                        val[sub_key] = _trim_list(sub_val, _estimate_size(sub_val) // 2)
                        shrunk = True
                    elif isinstance(sub_val, str) and len(sub_val) > 500:
                        val[sub_key] = sub_val[:400] + "... [trimmed]"
                        shrunk = True

            elif isinstance(val, list) and len(val) > 2:
                working[key] = _trim_list(val, size // 2)
                shrunk = True

            elif isinstance(val, str) and len(val) > 500:
                working[key] = val[:400] + "... [trimmed]"
                shrunk = True

            if shrunk:
                break

        candidate = json.dumps(working, default=str)
        if len(candidate) <= max_chars:
            return candidate

        if not shrunk:
            break

    unprotected = [k for k in working if k not in _PRESERVE_KEYS]
    sizes_unprotected = [(k, _estimate_size(working[k])) for k in unprotected]
    sizes_unprotected.sort(key=lambda x: x[1], reverse=True)
    for key, _ in sizes_unprotected:
        working[key] = _TRUNCATED
        candidate = json.dumps(working, default=str)
        if len(candidate) <= max_chars:
            return candidate

    drop_order = [k for k in _DROP_ORDER if k in working]
    remaining = [k for k in working if k not in set(_DROP_ORDER) and k not in set(unprotected)]
    drop_order.extend(remaining)
    for key in drop_order:
        working[key] = _TRUNCATED
        candidate = json.dumps(working, default=str)
        if len(candidate) <= max_chars:
            return candidate

    logger.warning(
        "truncate_payload: even after replacing all keys the payload (%d chars) "
        "exceeds max_chars (%d); returning minimal valid JSON",
        len(json.dumps(working, default=str)),
        max_chars,
    )
    return json.dumps({"_truncation_error": "payload exceeds budget after full reduction"})
