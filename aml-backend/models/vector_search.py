"""
Pydantic models for entity vector search functionality.
"""

from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime

class VectorSearchByEntityRequest(BaseModel):
    """Request model for finding similar entities by entity ID."""
    entity_id: str = Field(..., description="ID of the entity to find similar entities for")
    limit: int = Field(default=5, ge=1, le=20, description="Maximum number of results to return")
    filters: Optional[Dict[str, Any]] = Field(None, description="Optional filters for results")

class VectorSearchByTextRequest(BaseModel):
    """Request model for finding similar entities by text query."""
    query_text: str = Field(..., min_length=10, description="Text description to search for similar entities")
    limit: int = Field(default=5, ge=1, le=20, description="Maximum number of results to return")
    filters: Optional[Dict[str, Any]] = Field(None, description="Optional filters for results")

class VectorSearchFilters(BaseModel):
    """Optional filters for vector search queries."""
    entity_type: Optional[str] = Field(None, description="Filter by entity type (individual, organization)")
    risk_level: Optional[str] = Field(None, description="Filter by risk level (low, medium, high)")
    min_risk_score: Optional[float] = Field(None, ge=0.0, le=1.0, description="Minimum risk score")
    max_risk_score: Optional[float] = Field(None, ge=0.0, le=1.0, description="Maximum risk score")
    resolution_status: Optional[str] = Field(None, description="Filter by resolution status")

class SimilarEntity(BaseModel):
    """Model for a similar entity result from vector search."""
    entityId: Optional[str] = Field(None, description="Unique entity identifier")
    entityType: Optional[str] = Field(None, description="Type of entity")
    name: Optional[Dict[str, Any]] = Field(None, description="Entity name information")
    riskAssessment: Optional[Dict[str, Any]] = Field(None, description="Risk assessment information")
    profileSummaryText: Optional[str] = Field(None, description="Profile summary")
    vectorSearchScore: Optional[float] = Field(None, description="Vector similarity score (0-1)")
    resolution: Optional[Dict[str, Any]] = Field(None, description="Resolution status information")

class VectorSearchResponse(BaseModel):
    """Response model for vector search results."""
    query_info: Dict[str, Any] = Field(..., description="Information about the search query")
    similar_entities: List[SimilarEntity] = Field(..., description="List of similar entities")
    total_found: int = Field(..., description="Total number of entities found")
    search_metadata: Dict[str, Any] = Field(..., description="Search execution metadata")

class VectorSearchStatsResponse(BaseModel):
    """Response model for vector search statistics."""
    total_entities: int = Field(..., description="Total number of entities in the database")
    entities_with_embeddings: int = Field(..., description="Number of entities with profile embeddings")
    embedding_coverage: float = Field(..., description="Percentage of entities with embeddings")
    vector_index_name: str = Field(..., description="Name of the vector search index")
    entity_types: Dict[str, int] = Field(..., description="Count of entities by type")
    risk_levels: Dict[str, int] = Field(..., description="Count of entities by risk level")

class VectorSearchDemoRequest(BaseModel):
    """Request model for vector search demo scenarios."""
    scenario: str = Field(..., description="Demo scenario name")
    limit: int = Field(default=5, ge=1, le=10, description="Number of results to return")

class VectorSearchDemoResponse(BaseModel):
    """Response model for vector search demo scenarios."""
    scenario_name: str = Field(..., description="Name of the demo scenario")
    scenario_description: str = Field(..., description="Description of what this scenario demonstrates")
    query_entity: Dict[str, Any] = Field(..., description="The entity used as the search query")
    similar_entities: List[SimilarEntity] = Field(..., description="Similar entities found")
    insights: List[str] = Field(..., description="Key insights from this search")
    search_time_ms: float = Field(..., description="Search execution time in milliseconds")