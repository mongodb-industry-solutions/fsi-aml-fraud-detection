"""Stored <-> wire translation for the BIAN `fraudResolution` collection.

The investigation case lives in three shapes and only the middle one changed:

    1. LangGraph state   services/agents/state.py   flat snake_case   UNCHANGED
    2. Stored            MongoDB `fraudResolution`  BIAN nested camel CHANGED
    3. Wire / render     REST + WS -> React         flat snake_case   UNCHANGED

Decision 2026-08-12 (DECISION-investigations-to-fraudResolution.md §0b, "Option A"):
translate at the DB boundary. Every read of the collection passes through `to_wire`
and the one writer builds via `to_stored`, so the frontend never learns that the
document was reshaped. Precedent: `fraudModel` did the same in
`routes/model_management.py`.

The stored shape is the contract registered in the canonical spec as `fraudResolution`
(v4_33). Read it with:

    python3 bian-data-model/bian.py show fraudResolution

Control record `FraudResolutionProcedure` fields sit at the top; the three real BIAN
behaviour qualifiers -- `CaseAnalysis`, `CaseDetermination`, `CaseResolution` -- are one
nested object each; agent telemetry stays at the top level as tagged non-BIAN extensions.

WHY RECURSIVE RECASING IS SAFE HERE. The pipeline writes a uniformly snake_case
document: across all 37 source documents exactly two nested keys are camelCase
(`case_file.transactions.flagged_transactions[].transactionId` and `.riskScore`, a
known generator inconsistency -- see build-scripts/t360_camel.py hazard 2). Those two
round-trip to `transaction_id` / `risk_score` on the wire, which nothing reads. Every
other key is a clean inverse pair.
"""

import re

COLLECTION = "fraudResolution"

# ── Stored field paths ────────────────────────────────────────────────
# Queries, sorts, projections and aggregation pipelines must use these rather than
# inline string literals, so a future spec bump lands in exactly one file.

CASE_ID = "caseId"
CASE_TYPE = "caseType"
CUSTOMER_ID = "customerId"
TRANSACTION_REFERENCE = "transactionReference"
CREATED_AT = "createdAt"
STATUS = "status"
CASE_FILE = "caseFile"
SOURCE_ENTITY_ID = "sourceEntityId"
ENTITY_NAME = "entityName"

CASE_ANALYSIS = "caseAnalysis"
TYPOLOGY = "caseAnalysis.typology"
PRIMARY_TYPOLOGY = "caseAnalysis.typology.primaryTypology"

CASE_DETERMINATION = "caseDetermination"
TRIAGE_DECISION = "caseDetermination.triageDecision"
RISK_SCORE = "caseDetermination.triageDecision.riskScore"

CASE_RESOLUTION = "caseResolution"
NARRATIVE = "caseResolution.narrative"
NARRATIVE_INTRO = "caseResolution.narrative.introduction"

# BIAN `Casetypevalues`. Every ThreatSight case is a financial-crime case.
CASE_TYPE_VALUE = "Fraud"

# ── The nesting map ───────────────────────────────────────────────────
# Wire key (camelised) -> which behaviour qualifier it nests under. Single source of
# truth: `to_stored` and `to_wire` both drive off this, so they cannot drift apart.

_BQ_MEMBERS = {
    CASE_ANALYSIS: ("typology", "networkAnalysis", "temporalAnalysis", "trailAnalysis"),
    CASE_DETERMINATION: ("triageDecision", "validationResult", "humanDecision"),
    CASE_RESOLUTION: ("narrative",),
}

# Wire name -> stored name, for the two CR fields BIAN renames.
_TOP_RENAMES = {"investigationStatus": STATUS}
_TOP_RENAMES_INVERSE = {v: k for k, v in _TOP_RENAMES.items()}

# Written by the boundary, never sourced from the wire document.
_DERIVED = {CASE_TYPE, CUSTOMER_ID, SOURCE_ENTITY_ID, TRANSACTION_REFERENCE,
            "partyResolution", "sourceSystem", "externalRef"}

# Its keys are entity ids, not field names -- recasing them would corrupt the ids.
FINDINGS = "subInvestigationFindings"
FINDINGS_WIRE = "sub_investigation_findings"

# Agent telemetry: full LLM prompts and raw tool outputs. 23.5 KB of the average
# 41 KB document -- 57% of every case. The investigations UI renders it on dedicated
# tabs, but an LLM caller reading several cases at once will exhaust its context on
# debug logs before reaching the narrative. Projected out by default; see
# TELEMETRY_EXCLUDE.
TELEMETRY_FIELDS = ("toolTraceLog", "agentAuditLog", "pipelineMetrics")

# Mongo projection. Exclusion-only, so it is legal alongside `_id: 0` and needs no
# maintenance when new extension fields are added.
TELEMETRY_EXCLUDE = {"_id": 0, **{f: 0 for f in TELEMETRY_FIELDS}}

SOURCE_SYSTEM = "threatsight360"


# ── Recasing ──────────────────────────────────────────────────────────

def _to_camel(name: str) -> str:
    """`risk_score` -> `riskScore`. Idempotent. `_id` is left alone."""
    if not isinstance(name, str) or "_" not in name or name.startswith("_"):
        return name
    head, *rest = name.split("_")
    return head + "".join(p[:1].upper() + p[1:] for p in rest if p)


def _to_snake(name: str) -> str:
    """`riskScore` -> `risk_score`. Exact inverse of `_to_camel`. `_id` is left alone."""
    if not isinstance(name, str) or name.startswith("_"):
        return name
    return re.sub(r"(?<=[^_A-Z])(?=[A-Z])", "_", name).lower()


def _recase(doc, fn):
    """Recursively apply `fn` to every dict key. Values pass through untouched."""
    if isinstance(doc, list):
        return [_recase(v, fn) for v in doc]
    if not isinstance(doc, dict):
        return doc
    return {fn(k): _recase(v, fn) for k, v in doc.items()}


# ── Findings: map <-> array ───────────────────────────────────────────
# The pipeline accumulates findings in a dict keyed by entity id (state.py, merged via
# a reducer). A map keyed by data cannot be indexed or joined, so the stored shape is
# an array carrying a resolved party FK on each row.

def _findings_to_stored(wire_map, resolve) -> list:
    rows = []
    for entity_id, findings in (wire_map or {}).items():
        customer_id, method = resolve(entity_id)
        rows.append({
            "customerId": customer_id,
            "sourceEntityId": entity_id,
            "partyResolution": method,
            "findings": _recase(findings, _to_camel),
        })
    # Deterministic order -- dict iteration order must not leak into storage.
    return sorted(rows, key=lambda r: r["sourceEntityId"])


def _findings_to_wire(rows) -> dict:
    return {
        r.get("sourceEntityId"): _recase(r.get("findings"), _to_snake)
        for r in (rows or [])
        if r.get("sourceEntityId")
    }


def flagged_transaction_ids(case_file) -> list:
    """`caseFile.transactions.flaggedTransactions[].transactionId`, de-duplicated.

    The one place this reshape does more than move a path (spec §6). Kept here so the
    migration transform and the live writer derive it identically.
    """
    txns = ((case_file or {}).get("transactions") or {}).get("flaggedTransactions") or []
    seen, out = set(), []
    for t in txns:
        tid = (t or {}).get("transactionId") or (t or {}).get("transaction_id")
        if tid and tid not in seen:
            seen.add(tid)
            out.append(tid)
    return out


# ── The boundary ──────────────────────────────────────────────────────

def to_stored(wire: dict, *, customer_id=None, party_resolution="UNRESOLVED",
              external_ref=None, resolve_finding=None) -> dict:
    """Flat snake_case case document -> the BIAN-nested `fraudResolution` shape.

    `customer_id` / `party_resolution` are supplied by the caller because resolving a
    raw entity id to `customers.customerId` needs a database and this function is pure.
    `resolve_finding(entity_id) -> (customer_id, method)` does the same per findings row;
    unresolved by default, never guessed.
    """
    resolve_finding = resolve_finding or (lambda _eid: (None, "UNRESOLVED"))

    src = {_to_camel(k): v for k, v in (wire or {}).items() if k != "_id"}
    findings_wire = src.pop(FINDINGS, None)
    case_file = _recase(src.pop(CASE_FILE, None), _to_camel)

    doc = {
        CASE_ID: src.pop(CASE_ID, None),
        CASE_TYPE: CASE_TYPE_VALUE,
        CUSTOMER_ID: customer_id,
        TRANSACTION_REFERENCE: flagged_transaction_ids(case_file),
        CREATED_AT: src.pop(CREATED_AT, None),
        STATUS: src.pop("investigationStatus", None),
    }
    if case_file is not None:
        doc[CASE_FILE] = case_file

    # ─── the three behaviour qualifiers ───
    for bq, members in _BQ_MEMBERS.items():
        block = {}
        for member in members:
            if member in src:
                block[member] = _recase(src.pop(member), _to_camel)
        if block:
            doc[bq] = block

    # ─── party (both resolved and raw -- `entityId` is overloaded) ───
    doc[SOURCE_ENTITY_ID] = src.pop("entityId", None)
    doc["partyResolution"] = party_resolution
    if external_ref is not None:
        doc["externalRef"] = external_ref

    doc[FINDINGS] = _findings_to_stored(findings_wire, resolve_finding)

    # ─── everything else stays a top-level non-BIAN extension ───
    # Unknown keys flow through rather than being dropped, so a new state field can
    # never silently vanish at the boundary.
    for key, value in src.items():
        if key in _DERIVED:
            continue
        doc[key] = _recase(value, _to_camel)

    doc["sourceSystem"] = SOURCE_SYSTEM
    return doc


def to_wire(stored: dict) -> dict:
    """`fraudResolution` document -> the flat snake_case shape the frontend renders.

    Exact inverse of `to_stored` for everything the UI reads. Fields that exist only
    in storage (`caseType`, `transactionReference`, `partyResolution`, `sourceSystem`,
    `externalRef`) are dropped -- no screen reads them and leaking them would change
    what the UI receives.
    """
    if stored is None:
        return None

    doc = {}
    for key, value in stored.items():
        if key == "_id" or key in _DERIVED or key == CASE_TYPE:
            continue

        if key in _BQ_MEMBERS:
            for member, member_value in (value or {}).items():
                doc[_to_snake(member)] = _recase(member_value, _to_snake)
            continue

        if key == FINDINGS:
            doc[FINDINGS_WIRE] = _findings_to_wire(value)
            continue

        doc[_to_snake(_TOP_RENAMES_INVERSE.get(key, key))] = _recase(value, _to_snake)

    # `sourceEntityId` is the pre-image the UI knew as `entity_id`.
    if SOURCE_ENTITY_ID in stored:
        doc["entity_id"] = stored[SOURCE_ENTITY_ID]
        doc.pop("source_entity_id", None)

    return doc
