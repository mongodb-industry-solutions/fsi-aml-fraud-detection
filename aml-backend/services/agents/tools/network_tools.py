"""Tools for relationship-graph analysis via $graphLookup."""

import logging
from langchain_core.tools import tool
from dependencies import get_mongo_client, DB_NAME, RELATIONSHIPS_COLLECTION
# Phase-2 step 3: the UI surface moved its party identity to `customerId`, so
# relationship_fields.SOURCE_KEY/TARGET_KEY now point at `sourceCustomerId` /
# `targetCustomerId`. The agent tools still read `threatsightEntities`, whose
# identity is the source `entityId` -- so they stay pinned to the retained
# `*EntityRef` pair, which build_sd7.py populates on every relationship
# document alongside the customer ids. Traversing on the customer keys from an
# `entityId` seed returns zero edges and raises nothing.
# Migrate this surface to `customers` and drop the aliasing in a later pass.
from repositories.relationship_fields import (
    SOURCE_ENTITY_REF_KEY as SOURCE_KEY,
    TARGET_ENTITY_REF_KEY as TARGET_KEY,
    TYPE_KEY,
)

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
