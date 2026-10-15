"""Tools for querying the customers collection."""

import logging
from langchain_core.tools import tool
from dependencies import get_mongo_client, DB_NAME
from repositories import entity_fields as ef
from services.agents.entity_resolution import agentic_scoped

logger = logging.getLogger(__name__)


def _get_customer_wire(entity_id: str) -> dict | None:
    """Fetch a `customers` doc translated to the wire shape the tools expect."""
    client = get_mongo_client()
    proj = ef.wire_projection(include_embeddings=False)
    proj["_id"] = 0
    pipeline = [
        {"$match": agentic_scoped({ef.CUSTOMER_ID: entity_id})},
        {"$project": proj},
        {"$limit": 1},
    ]
    results = list(client[DB_NAME]["customers"].aggregate(pipeline))
    return results[0] if results else None


@tool
def get_entity_profile(entity_id: str) -> dict:
    """Look up a single entity by entityId (a `customers.customerId` value).

    Returns riskAssessment, watchlistMatches, customerInfo, addresses,
    identifiers, name, entityType, and scenarioKey.
    """
    doc = _get_customer_wire(entity_id)
    if not doc:
        return {"error": f"Entity {entity_id} not found"}
    return doc


@tool
def screen_watchlists(entity_id: str) -> dict:
    """Check an entity's watchlistMatches for sanctions / PEP hits.

    Returns structured screening results including list IDs,
    match scores, and confirmation status.
    """
    doc = _get_customer_wire(entity_id)
    if not doc:
        return {"screened": False, "error": f"Entity {entity_id} not found"}

    matches = doc.get("watchlistMatches", [])
    hits = [
        {
            "list_id": m.get("listId", ""),
            "match_score": m.get("matchScore", 0),
            "status": m.get("status", "unknown"),
            "details": m.get("details", {}),
        }
        for m in matches
    ]
    return {
        "screened": True,
        "entity_name": doc.get("name", {}).get("full", ""),
        "risk_level": doc.get("riskAssessment", {}).get("overall", {}).get("level", "unknown"),
        "hit_count": len(hits),
        "clean": len(hits) == 0,
        "hits": hits,
    }
