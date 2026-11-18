"""Tools for relationship-graph analysis via $graphLookup."""

import logging
import re
from langchain_core.tools import tool
from dependencies import get_mongo_client, DB_NAME, RELATIONSHIPS_COLLECTION
from repositories import entity_fields as ef
# Phase-2 step 3 migration: entity ids flowing into this tool are now
# `customers.customerId` values (see services/agents/entity_resolution.py),
# so the graph traverses on the same key the entity side resolves on.
from repositories.relationship_fields import (
    SOURCE_KEY, TARGET_KEY, TYPE_KEY, SUBTYPE_KEY, ACTIVE_KEY,
)
from services.agents.entity_resolution import agentic_scoped

try:  # optional: screen_sanctions_ownership reports an error without it
    from ownership_rules import evaluate as evaluate_ownership_rule
except ImportError:  # pragma: no cover
    evaluate_ownership_rule = None

logger = logging.getLogger(__name__)


@tool
def analyze_entity_network(entity_id: str, max_depth: int = 2) -> dict:
    """Traverse the entity relationship graph using $graphLookup.

    Returns network size, high-risk connections, relationship type
    distribution, and shell-structure indicators.
    """
    client = get_mongo_client()
    db = client[DB_NAME]

    pipeline = [
        {"$match": {SOURCE_KEY: entity_id}},
        {
            "$graphLookup": {
                "from": RELATIONSHIPS_COLLECTION,
                "startWith": f"${TARGET_KEY}",
                "connectFromField": TARGET_KEY,
                "connectToField": SOURCE_KEY,
                "as": "network",
                "maxDepth": max_depth,
                "depthField": "hops",
            }
        },
        {
            "$project": {
                "_id": 0,
                "direct_type": f"${TYPE_KEY}",
                "direct_target": f"${TARGET_KEY}",
                "direct_strength": "$strength",
                "direct_verified": "$verified",
                "network": {
                    "$map": {
                        "input": "$network",
                        "as": "n",
                        "in": {
                            "source": f"$$n.{SOURCE_KEY}",
                            "target": f"$$n.{TARGET_KEY}",
                            "type": f"$$n.{TYPE_KEY}",
                            "strength": "$$n.strength",
                            "confidence": "$$n.confidence",
                            "verified": "$$n.verified",
                            "hops": "$$n.hops",
                        },
                    }
                },
            }
        },
    ]

    results = list(db[RELATIONSHIPS_COLLECTION].aggregate(pipeline))

    if not results:
        return {
            "entity_id": entity_id,
            "network_size": 0,
            "high_risk_connections": 0,
            "summary": "No relationships found for this entity.",
        }

    seen_entities: set[str] = {entity_id}
    type_counts: dict[str, int] = {}
    suspicious_types = {
        "financial_beneficiary_suspected",
        "proxy_relationship_suspected",
        "potential_beneficial_owner_of",
        "transactional_counterparty_high_risk",
        "business_associate_suspected",
    }
    suspicious_connections: list[dict] = []

    for row in results:
        t = row.get("direct_type", "")
        type_counts[t] = type_counts.get(t, 0) + 1
        seen_entities.add(row.get("direct_target", ""))

        if t in suspicious_types:
            suspicious_connections.append({
                "target": row.get("direct_target"),
                "type": t,
                "strength": row.get("direct_strength", 0),
            })

        for n in row.get("network", []):
            seen_entities.add(n.get("target", ""))
            nt = n.get("type", "")
            type_counts[nt] = type_counts.get(nt, 0) + 1
            if nt in suspicious_types:
                suspicious_connections.append({
                    "target": n.get("target"),
                    "type": nt,
                    "strength": n.get("strength", 0),
                    "hops": n.get("hops", 0),
                })

    shell_indicators = []
    nominee_count = type_counts.get("director_of", 0) + type_counts.get("nominee_director", 0)
    if nominee_count >= 2:
        shell_indicators.append(f"Multiple director/nominee relationships ({nominee_count})")
    if type_counts.get("subsidiary_of", 0) + type_counts.get("parent_of_subsidiary", 0) >= 2:
        shell_indicators.append("Complex corporate layering structure detected")
    if len(suspicious_connections) >= 2:
        shell_indicators.append(f"{len(suspicious_connections)} suspicious relationship types found")

    return {
        "entity_id": entity_id,
        "network_size": len(seen_entities),
        "high_risk_connections": len(suspicious_connections),
        "max_depth_reached": max_depth,
        "relationship_type_distribution": type_counts,
        "shell_structure_indicators": shell_indicators,
        "suspicious_connections": suspicious_connections[:10],
        "summary": (
            f"Network of {len(seen_entities)} entities with "
            f"{len(suspicious_connections)} suspicious connections. "
            f"{'Shell structure indicators present.' if shell_indicators else 'No shell indicators.'}"
        ),
    }


# Ownership links, read as owner -> owned. `subsidiary_of` points the other way.
OWNER_TO_OWNED_TYPES = {"ubo_of", "parent_of_subsidiary", "shareholder_of", "owns"}
OWNED_TO_OWNER_TYPES = {"subsidiary_of"}

# Confirmed hits on these lists seed the ownership screens. PEP lists are not
# sanctions and never seed. OFAC SDN entries become list code "SDN" for the
# OFAC 50 Percent Rule; the other lists only feed the any-list-50 screen.
SANCTIONS_LIST_PREFIXES = ("OFAC-", "EU-", "UN-", "UK-HMT", "HMT-")

_PCT_RE = re.compile(r"(\d+(?:\.\d+)?)\s*%")


def _edge_share(doc: dict):
    """Ownership share stated on a relationship, or None when unknown.

    The seed data writes the UBO stake into the sub-type ("37.5% ownership via
    direct_ownership") and "Majority Owned" on parent_of_subsidiary links.
    Indirect UBO stakes are restatements of a chain, so they count as unknown
    rather than as a second direct holding.
    """
    sub = str(doc.get(SUBTYPE_KEY) or "").lower()
    if "indirect" in sub:
        return None
    m = _PCT_RE.search(sub)
    if m:
        v = float(m.group(1))
        return v if v <= 100 else None
    if "wholly" in sub:
        return 100.0
    if "majority" in sub:
        return [50.0, 100.0]
    return None


def _sanctions_lists(matches: list) -> tuple[set[str], bool]:
    """List codes from confirmed sanctions hits, and whether any unconfirmed one exists."""
    codes: set[str] = set()
    unconfirmed = False
    for m in matches or []:
        list_id = str(m.get("listId", "")).upper()
        if not list_id.startswith(SANCTIONS_LIST_PREFIXES):
            continue
        if str(m.get("status", "")).lower() != "confirmed_hit":
            unconfirmed = True
            continue
        codes.add("SDN" if list_id.startswith("OFAC-SDN") else list_id)
    return codes, unconfirmed


def _subject_result(evaluation, entity_id: str) -> dict:
    r = evaluation[entity_id]
    out = {"verdict": r.verdict, "explanation": r.explain()}
    if r.verdict != "listed":
        out["covered_share_pct"] = [round(r.share[0], 2), round(r.share[1], 2)]
    if r.seeds:
        out["listed_owners"] = list(r.seeds)
    return out


@tool
def screen_sanctions_ownership(entity_id: str, max_depth: int = 4) -> dict:
    """Check whether sanctioned parties own 50% or more of an entity, directly or
    through a chain of companies (OFAC 50 Percent Rule).

    Walks ubo_of / parent_of_subsidiary / shareholder_of / subsidiary_of links
    upward from the entity, takes owners with confirmed sanctions hits as seeds,
    and returns a verdict with the proof path: listed, definitely (blocked by
    ownership), possibly (a sanctioned owner holds a share of unknown size),
    or not. Also returns the same 50% screen over EU, UN and UK lists, which is
    a screening signal, not a legal determination.
    """
    if evaluate_ownership_rule is None:
        return {"entity_id": entity_id,
                "error": "ownership-rules is not installed (pip install ownership-rules)"}

    db = get_mongo_client()[DB_NAME]
    projection = {"_id": 0, SOURCE_KEY: 1, TARGET_KEY: 1, TYPE_KEY: 1, SUBTYPE_KEY: 1}
    edges: list[dict] = []
    seen = {entity_id}
    frontier = [entity_id]
    for _ in range(max(1, min(max_depth, 6))):
        if not frontier:
            break
        query = {
            ACTIVE_KEY: {"$ne": False},
            "$or": [
                {TARGET_KEY: {"$in": frontier}, TYPE_KEY: {"$in": list(OWNER_TO_OWNED_TYPES)}},
                {SOURCE_KEY: {"$in": frontier}, TYPE_KEY: {"$in": list(OWNED_TO_OWNER_TYPES)}},
            ],
        }
        nxt = []
        for doc in db[RELATIONSHIPS_COLLECTION].find(query, projection):
            owner, owned = doc.get(SOURCE_KEY), doc.get(TARGET_KEY)
            if doc.get(TYPE_KEY) in OWNED_TO_OWNER_TYPES:
                owner, owned = owned, owner
            if not owner or not owned or owner == owned:
                continue
            edges.append({"owner": owner, "owned": owned, "pct": _edge_share(doc),
                          "source": doc.get(TYPE_KEY)})
            if owner not in seen:
                seen.add(owner)
                nxt.append(owner)
        frontier = nxt

    listed, unconfirmed = [], []
    customers = db["customers"].find(
        agentic_scoped({ef.CUSTOMER_ID: {"$in": list(seen)}}),
        {"_id": 0, ef.CUSTOMER_ID: 1, ef.WATCHLIST_MATCHES: 1},
    )
    for doc in customers:
        matches = doc
        for part in ef.WATCHLIST_MATCHES.split("."):
            matches = (matches or {}).get(part)
        codes, has_unconfirmed = _sanctions_lists(matches)
        if codes:
            listed.append({"id": doc[ef.CUSTOMER_ID], "lists": sorted(codes)})
        if has_unconfirmed:
            unconfirmed.append(doc[ef.CUSTOMER_ID])

    ofac = _subject_result(
        evaluate_ownership_rule(edges, [p for p in listed if "SDN" in p["lists"]], "ofac-50"),
        entity_id,
    )
    other = _subject_result(evaluate_ownership_rule(edges, listed, "any-list-50"), entity_id)

    return {
        "entity_id": entity_id,
        "ofac_50_percent_rule": ofac,
        "any_sanctions_list_50_percent_screen": other,
        "owners_in_chain": len(seen) - 1,
        "ownership_links": len(edges),
        "sanctioned_parties_in_chain": [p["id"] for p in listed if p["id"] != entity_id],
        "unconfirmed_sanctions_hits_in_chain": unconfirmed,
        "summary": (
            f"OFAC 50% rule: {ofac['verdict']}; any sanctions list (screen): "
            f"{other['verdict']}. {len(seen) - 1} owners over {len(edges)} ownership links."
        ),
    }
