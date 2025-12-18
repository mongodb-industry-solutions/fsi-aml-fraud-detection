"""
Clean Vector Search API Models - Repository Pattern Integration

Simple, focused models for vector search API that directly integrate 
with the repository pattern without unnecessary abstraction layers.
"""

from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field


class SimilarEntitiesRequest(BaseModel):
    """Request to find similar entities by entity ID"""
    
    entity_id: str = Field(..., description="Entity ID to find similar entities for")
    limit: int = Field(default=5, ge=1, le=100, description="Maximum number of similar entities to return")
    filters: Optional[Dict[str, Any]] = Field(default=None, description="Optional filters to apply to search")
    embedding_type: Optional[str] = Field(default="identifier", description="Type of embedding to use: 'identifier' or 'behavioral'")
    
    class Config:
        json_schema_extra = {
            "example": {
                "entity_id": "ENT-12345",
                "limit": 10,
                "filters": {
                    "entity_type": "INDIVIDUAL",
                    "risk_level": "HIGH"
                },
                "embedding_type": "identifier"
            }
        }


class SimilarEntity(BaseModel):
    """Similar entity result from vector search"""
    
    entityId: str = Field(..., description="Entity identifier")
    name: Optional[Dict[str, Any]] = Field(default=None, description="Entity name information")
    entityType: Optional[str] = Field(default=None, description="Type of entity")
    riskAssessment: Optional[Dict[str, Any]] = Field(default=None, description="Risk assessment information")
    profileSummaryText: Optional[str] = Field(default=None, description="Profile summary text")
    vectorSearchScore: float = Field(..., description="Vector similarity score (0.0 to 1.0)")
    
    class Config:
        json_schema_extra = {
            "example": {
                "entityId": "ENT-67890",
                "name": {"full": "John Smith"},
                "entityType": "INDIVIDUAL", 
                "riskAssessment": {"overall": {"level": "MEDIUM", "score": 45.2}},
                "profileSummaryText": "Individual with moderate risk profile...",
                "vectorSearchScore": 0.87
            }
        }


class SimilarEntitiesResponse(BaseModel):
    """Response containing similar entities found via vector search"""
    
    similar_entities: List[SimilarEntity] = Field(..., description="List of similar entities found")
    search_metadata: Dict[str, Any] = Field(..., description="Search execution metadata")
    
    class Config:
        json_schema_extra = {
            "example": {
                "similar_entities": [
                    {
                        "entityId": "ENT-67890",
                        "name": {"full": "John Smith"},
                        "entityType": "INDIVIDUAL",
                        "vectorSearchScore": 0.87
                    }
                ],
                "search_metadata": {
                    "search_time_ms": 45,
                    "total_found": 1,
                    "entity_id": "ENT-12345",
                    "similarity_metric": "cosine"
                }
            }
        }