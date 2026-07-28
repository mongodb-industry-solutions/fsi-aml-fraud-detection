"""Query scoping for the shared `leafy_bank_bian` database.

`customers` and `transactions` in `leafy_bank_bian` are shared with the Leafy Bank
payments/ledger demo. ThreatSight must only ever see its own documents, so every
read against those two collections is wrapped in `scoped()`, and every write stamps
`SOURCE_SYSTEM_FIELD`.

A write that forgets the stamp is invisible to every scoped read — the document
appears to vanish. It also escapes the ledger change stream's exclusion filter
(`ingest_worker.py`), which would reject it and kill the worker.
"""

SOURCE_SYSTEM = "threatsight360"
SOURCE_SYSTEM_FIELD = "sourceSystem"


def scoped(query: dict | None = None) -> dict:
    """Restrict a query to this demo's own documents.

    The scope is applied last, so it cannot be silently overridden by a caller's
    filter on the same field.
    """
    return {**(query or {}), SOURCE_SYSTEM_FIELD: SOURCE_SYSTEM}


def stamped(document: dict) -> dict:
    """Mark a document as owned by this demo before it is written."""
    return {**document, SOURCE_SYSTEM_FIELD: SOURCE_SYSTEM}
