"""RAG tools over typology_library and compliance_policies collections."""

import logging
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
    """
    client = get_mongo_client()
    coll = client[DB_NAME]["typology_library"]
    query_lower = query.lower()
    results = []
    for doc in coll.find({}, {"_id": 0}):
        text = f"{doc.get('name', '')} {doc.get('description', '')} {' '.join(doc.get('red_flags', []))}"
        if query_lower in text.lower():
            results.append(doc)
    return results[:5]


@tool
def search_compliance_policies(query: str) -> list:
    """Text search across compliance policies and SAR guidance.

    Returns matching policies ranked by relevance.
    """
    client = get_mongo_client()
    coll = client[DB_NAME]["compliance_policies"]
    query_lower = query.lower()
    results = []
    for doc in coll.find({}, {"_id": 0}):
        text = f"{doc.get('title', '')} {doc.get('content', '')}"
        if query_lower in text.lower():
            results.append(doc)
    return results[:5]
