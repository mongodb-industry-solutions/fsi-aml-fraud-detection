"""Tools for querying the entities collection."""

import logging
from langchain_core.tools import tool
from dependencies import get_mongo_client, DB_NAME

logger = logging.getLogger(__name__)


@tool
def get_entity_profile(entity_id: str) -> dict:
    """Look up a single entity by entityId.

    Returns riskAssessment, watchlistMatches, customerInfo, addresses,
    identifiers, name, entityType, and scenarioKey.
    """
    client = get_mongo_client()
    doc = client[DB_NAME]["entities"].find_one(
        {"entityId": entity_id},
        {
            "_id": 0,
            "entityId": 1,
            "entityType": 1,
            "scenarioKey": 1,
            "status": 1,
            "name": 1,
            "dateOfBirth": 1,
            "addresses": 1,
            "identifiers": 1,
            "contactInfo": 1,
            "customerInfo": 1,
            "uboInfo": 1,
            "riskAssessment": 1,
            "watchlistMatches": 1,
        },
    )
    if not doc:
        return {"error": f"Entity {entity_id} not found"}
    return doc


@tool
def screen_watchlists(entity_id: str) -> dict:
    """Check an entity's watchlistMatches for sanctions / PEP hits.

    Returns structured screening results including list IDs,
    match scores, and confirmation status.
    """
    client = get_mongo_client()
    doc = client[DB_NAME]["entities"].find_one(
        {"entityId": entity_id},
        {"_id": 0, "watchlistMatches": 1, "riskAssessment.overall": 1, "name.full": 1},
    )
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
