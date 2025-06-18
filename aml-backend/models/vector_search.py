"""
Vector Search Models - Data models for vector search operations

Models for vector similarity search, embedding operations, and semantic matching.
"""

from datetime import datetime
from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field


class VectorSearchRequest(BaseModel):
    """Request model for vector similarity search"""
    
    query_text: Optional[str] = None
    query_vector: Optional[List[float]] = None
    limit: int = Field(default=10, ge=1, le=100)
    similarity_threshold: float = Field(default=0.6, ge=0.0, le=1.0)
    
    # Filter options
    entity_type: Optional[str] = None
    exclude_entity_ids: Optional[List[str]] = None
    
    class Config:
        json_schema_extra = {
            "example": {
                "query_text": "John Smith with SSN 123-45-6789",
                "limit": 10,
                "similarity_threshold": 0.7,
                "entity_type": "individual"
            }
        }


class VectorSearchResult(BaseModel):
    """Individual vector search result"""
    
    entity_id: str
    entity_data: Dict[str, Any]
    similarity_score: float
    search_metadata: Optional[Dict[str, Any]] = None
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class VectorSearchResponse(BaseModel):
    """Response for vector search operations"""
    
    results: List[VectorSearchResult]
    query_info: Dict[str, Any]
    total_found: int
    search_time_ms: float
    similarity_threshold: float
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class EmbeddingRequest(BaseModel):
    """Request for generating embeddings"""
    
    text: str
    entity_id: Optional[str] = None
    model_name: Optional[str] = "default"
    
    class Config:
        json_schema_extra = {
            "example": {
                "text": "John Smith, DOB: 1985-03-15, Address: 123 Main St",
                "entity_id": "ENT123456"
            }
        }


class EmbeddingResponse(BaseModel):
    """Response containing generated embedding"""
    
    embedding: List[float]
    text: str
    model_name: str
    generation_time_ms: float
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class VectorSearchByEntityRequest(BaseModel):
    """Request for vector search using an existing entity"""
    
    entity_id: str
    limit: int = Field(default=10, ge=1, le=100)
    similarity_threshold: float = Field(default=0.6, ge=0.0, le=1.0)
    exclude_self: bool = True
    
    # Filter options
    entity_type: Optional[str] = None
    exclude_entity_ids: Optional[List[str]] = None
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class VectorSearchByTextRequest(BaseModel):
    """Request for vector search using text query"""
    
    query_text: str = Field(..., min_length=1)
    limit: int = Field(default=10, ge=1, le=100)
    similarity_threshold: float = Field(default=0.6, ge=0.0, le=1.0)
    
    # Filter options
    entity_type: Optional[str] = None
    exclude_entity_ids: Optional[List[str]] = None
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class VectorSearchStatsResponse(BaseModel):
    """Response containing vector search statistics"""
    
    total_entities_with_embeddings: int
    total_entities_without_embeddings: int
    average_similarity_scores: Dict[str, float]
    search_performance_metrics: Dict[str, Any]
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class VectorSearchDemoRequest(BaseModel):
    """Request for vector search demo scenarios"""
    
    demo_scenario: str = "similarity_search"
    sample_query: Optional[str] = None
    limit: int = Field(default=5, ge=1, le=20)
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class VectorSearchDemoResponse(BaseModel):
    """Response containing vector search demo results"""
    
    demo_scenario: str
    results: List[VectorSearchResult]
    demo_description: str
    sample_queries: List[str]
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class SimilarEntity(BaseModel):
    """Similar entity from vector search"""
    
    entity_id: str
    entity_data: Dict[str, Any]
    similarity_score: float
    match_reasons: List[str] = []
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }