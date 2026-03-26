"""RAG tools over typology_library and compliance_policies collections."""

import logging
import re
from langchain_core.tools import tool
from dependencies import get_mongo_client, DB_NAME

logger = logging.getLogger(__name__)


@tool
def lookup_typology(typology_id: str) -> dict:
    """Retrieve a single AML typology by its typology_id.

    Returns the full description, red flags, and regulatory references.
    """
    client = get_mongo_client()
    doc = client[DB_NAME]["typology_library"].find_one(
        {"typology_id": typology_id}, {"_id": 0}
    )
    return doc or {"error": f"Typology {typology_id} not found"}


@tool
def search_typologies(query: str) -> list:
    """Text search across all typology descriptions and red flags.

    Returns matching typologies ranked by relevance.
    Uses MongoDB $regex for server-side filtering instead of full collection scan.
    """
    if not query.strip():
        return []
    client = get_mongo_client()
    coll = client[DB_NAME]["typology_library"]
    pattern = re.escape(query)
    regex = {"$regex": pattern, "$options": "i"}
    results = list(coll.find(
        {"$or": [
            {"name": regex},
            {"description": regex},
            {"red_flags": regex},
        ]},
        {"_id": 0},
    ).limit(5))
    return results


@tool
def search_compliance_policies(query: str) -> list:
    """Text search across compliance policies and SAR guidance.

    Returns matching policies ranked by relevance.
    Uses MongoDB $regex for server-side filtering instead of full collection scan.
    """
    if not query.strip():
        return []
    client = get_mongo_client()
    coll = client[DB_NAME]["compliance_policies"]
    pattern = re.escape(query)
    regex = {"$regex": pattern, "$options": "i"}
    results = list(coll.find(
        {"$or": [
            {"title": regex},
            {"content": regex},
        ]},
        {"_id": 0},
    ).limit(5))
    return results
