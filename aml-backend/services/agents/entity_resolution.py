"""Resolve a raw agent-facing identifier to its `customers.customerId`.

Phase-2 step 3 rekeyed the AML party collection from `threatsightEntities`
(`entityId`) to the BIAN `customers` collection (`customerId`), and the old id
was deliberately NOT backfilled onto the new documents (decision D9). Alerts
and investigations are not migrated yet, so they still hand the agent surface
old-format ids -- this module is the one place that bridges the two.

The mapping is deterministic (`build_rekey_map.py::mint_customer_id`), so
there is no lookup table to load or keep in sync: recompute the candidate id
and confirm it exists.
"""

import hashlib

from repositories import entity_fields as ef

# The agentic surface only ever deals with AML party ids (never fraud-side
# customer ids), so the source collection namespace is always "entities" --
# see build_rekey_map.py::mint_customer_id.
_SOURCE_COLLECTION = "entities"

# Fraud-sourced customers carry a riskProfile.rawScore field -- a SIBLING of
# `overall`, not nested inside it (see
# threat360-migration/build-scripts/build_sd1.py::build_risk_profile_fraud,
# which returns {"overall": {...}, "rawScore": score, ...}). AML-sourced
# entities never do. The agentic investigation surface (copilot + SAR
# pipeline) is scoped to AML-sourced entities only -- Kiran, 2026-08-05.
AML_ONLY_MATCH = {"riskProfile.rawScore": {"$exists": False}}


def agentic_scoped(match: dict | None = None) -> dict:
    """`ef.scoped()` plus the AML-only cohort filter.

    Use on every `customers` read reachable from the copilot or SAR pipeline
    -- `ef.scoped()` alone would still let fraud-sourced customers (e.g.
    CUST-356a7098 / Stephen Burns) surface through search/assess/network
    tools that are meant to operate on AML entities only.
    """
    return {**ef.scoped(match), **AML_ONLY_MATCH}


def resolve_to_customer_id(raw_id: str, db) -> str:
    """Best-effort resolution of `raw_id` to a live, AML-sourced `customers.customerId`."""
    if not raw_id:
        return raw_id

    if raw_id.startswith("CUST-"):
        return raw_id

    coll = db["customers"]

    by_scenario = coll.find_one(
        agentic_scoped({ef.SCENARIO_KEY: raw_id}), {ef.CUSTOMER_ID: 1, "_id": 0}
    )
    if by_scenario:
        return by_scenario[ef.CUSTOMER_ID]

    seed = f"{_SOURCE_COLLECTION}|{raw_id}".encode()
    candidate = "CUST-" + hashlib.sha1(seed).hexdigest()[:8]
    if coll.find_one(agentic_scoped({ef.CUSTOMER_ID: candidate}), {"_id": 1}):
        return candidate

    return raw_id
