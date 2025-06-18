"""
Unified Search Models - Data models for unified search operations

Models for combined Atlas Search and Vector Search operations with
intelligent result merging and ranking.
"""

from datetime import datetime
from typing import Dict, List, Optional, Any, Literal
from pydantic import BaseModel, Field


class UnifiedSearchRequest(BaseModel):
    """Request model for unified search operations"""
    
    # Search query
    query: str = Field(..., min_length=1, description="Search query text")
    
    # Search options
    limit: int = Field(default=10, ge=1, le=50)
    atlas_weight: float = Field(default=0.6, ge=0.0, le=1.0)
    vector_weight: float = Field(default=0.4, ge=0.0, le=1.0)
    
    # Filter options
    entity_type: Optional[str] = None
    status: Optional[str] = None
    risk_level: Optional[str] = None
    
    # Search method preference
    search_strategy: Literal["balanced", "fuzzy_focused", "semantic_focused"] = "balanced"
    
    class Config:
        json_schema_extra = {
            "example": {
                "query": "John Smith DOB 1985-03-15",
                "limit": 10,
                "atlas_weight": 0.6,
                "vector_weight": 0.4,
                "search_strategy": "balanced"
            }
        }


class UnifiedSearchMatch(BaseModel):
    """Individual unified search result with combined scoring"""
    
    entity_id: str
    entity_data: Dict[str, Any]
    
    # Combined scoring
    combined_score: float
    atlas_score: float = 0.0
    vector_score: float = 0.0
    
    # Match information
    match_reasons: List[str] = []
    search_methods: List[str] = []
    confidence_level: str = "medium"
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class UnifiedSearchResponse(BaseModel):
    """Response for unified search operations"""
    
    matches: List[UnifiedSearchMatch]
    query: str
    total_found: int
    search_time_ms: float
    
    # Search composition
    atlas_results_count: int = 0
    vector_results_count: int = 0
    combined_results_count: int = 0
    
    # Search metadata
    search_strategy: str
    weights_used: Dict[str, float]
    performance_metrics: Optional[Dict[str, Any]] = None
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class SearchComparison(BaseModel):
    """Model for comparing different search approaches"""
    
    query: str
    atlas_only_results: List[Dict[str, Any]]
    vector_only_results: List[Dict[str, Any]]
    unified_results: List[UnifiedSearchMatch]
    
    performance_comparison: Dict[str, Any]
    recommendation: str
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class DemoScenario(BaseModel):
    """Demo scenario for unified search testing"""
    
    scenario_name: str
    description: str
    query: str
    expected_results: int
    search_strategy: str = "balanced"
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class DemoScenarioResponse(BaseModel):
    """Response containing demo scenarios for unified search"""
    
    scenarios: List[DemoScenario]
    total_scenarios: int
    description: str
    usage_instructions: str
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }