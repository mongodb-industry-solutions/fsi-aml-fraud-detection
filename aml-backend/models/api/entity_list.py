"""
Entity List Response Models - Specific models for entity list views
"""

from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class EntityListItem(BaseModel):
    """Entity item for list views - matches frontend expectations"""
    
    # Core identification
    id: str = Field(..., alias="_id")
    entityId: str
    scenarioKey: Optional[str] = None
    
    # Display information
    name_full: str
    entityType: str
    status: str
    
    # Risk information
    risk_level: Optional[str] = None
    risk_score: Optional[float] = None
    
    # Watchlist information
    watchlist_matches_count: int = 0
    has_watchlist_matches: bool = False
    
    # Behavioral analytics and account info (for transaction simulator)
    behavioral_analytics: Optional[Dict[str, Any]] = None
    account_info: Optional[Dict[str, Any]] = None
    
    # Embeddings (for entity management UI)
    identifierEmbedding: Optional[List[float]] = None
    behavioralEmbedding: Optional[List[float]] = None
    identifierText: Optional[str] = None
    behavioralText: Optional[str] = None
    
    # Timestamps
    created_date: datetime
    updated_date: Optional[datetime] = None
    
    class Config:
        populate_by_name = True
        extra = "allow"  # Allow additional fields from projection
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class EntityListPagination(BaseModel):
    """Pagination information for entity lists"""
    
    total: int
    count: int
    limit: int
    offset: int
    
    has_next: bool
    has_previous: bool
    
    current_page: Optional[int] = None
    total_pages: Optional[int] = None


class EntityListResponse(BaseModel):
    """Response for entity list operations - matches frontend API expectations"""
    
    success: bool = True
    
    # Data and pagination (matching frontend expectations)
    entities: List[EntityListItem] = Field(default_factory=list, alias="entities")
    total_count: int = 0
    page: Optional[int] = None
    has_next: bool = False
    has_previous: bool = False
    
    # Additional metadata
    scenario_keys: Optional[List[str]] = None
    available_filters: Optional[Dict[str, List[str]]] = None
    
    # Response metadata
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    processing_time_ms: Optional[float] = None
    
    class Config:
        populate_by_name = True
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


# Helper function to transform database results
def create_entity_list_response(
    entities: List[Dict[str, Any]],
    total_count: int,
    page: int = 1,
    limit: int = 20,
    offset: int = 0,
    available_filters: Optional[Dict[str, List[str]]] = None,
    processing_time_ms: Optional[float] = None
) -> EntityListResponse:
    """Create EntityListResponse from database results"""
    
    # Transform entities to match frontend expectations
    entity_items = []
    for entity in entities:
        # Build entity dict with all fields, including behavioral_analytics and embeddings
        entity_dict = {
            "_id": str(entity["_id"]),
            "entityId": entity.get("entityId", ""),
            "scenarioKey": entity.get("scenarioKey"),
            "name_full": entity.get("name_full", "Unknown"),
            "entityType": entity.get("entityType", "individual"),
            "status": entity.get("status", "active"),
            "risk_level": entity.get("risk_level", "low"),
            "risk_score": entity.get("risk_score", 0.0),
            "watchlist_matches_count": entity.get("watchlist_matches_count", 0),
            "has_watchlist_matches": entity.get("has_watchlist_matches", False),
            "behavioral_analytics": entity.get("behavioral_analytics"),  # Include behavioral analytics
            "account_info": entity.get("account_info"),  # Include account info
            "identifierEmbedding": entity.get("identifierEmbedding"),  # Include identifier embedding
            "behavioralEmbedding": entity.get("behavioralEmbedding"),  # Include behavioral embedding
            "identifierText": entity.get("identifierText"),  # Include identifier text
            "behavioralText": entity.get("behavioralText"),  # Include behavioral text
            "created_date": entity.get("created_date", datetime.utcnow()),
            "updated_date": entity.get("updated_date")
        }
        # Add any additional fields from the entity dict (like 'name', 'riskAssessment', etc.)
        for key, value in entity.items():
            if key not in entity_dict and key not in ["_id"]:
                entity_dict[key] = value
        
        entity_items.append(EntityListItem(**entity_dict))
    
    # Calculate pagination
    has_next = (offset + len(entities)) < total_count
    has_previous = offset > 0
    
    return EntityListResponse(
        success=True,
        entities=entity_items,  # Now directly uses "entities" field
        total_count=total_count,
        page=page,
        has_next=has_next,
        has_previous=has_previous,
        available_filters=available_filters,
        processing_time_ms=processing_time_ms
    )