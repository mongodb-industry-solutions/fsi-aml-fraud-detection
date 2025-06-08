"""
Pydantic models for unified entity search (Atlas Search + Vector Search)
"""

from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any, Union
from datetime import datetime
from enum import Enum

from .entity_resolution import PotentialMatch
from .vector_search import SimilarEntity

class SearchMethod(str, Enum):
    """Available search methods"""
    ATLAS = "atlas"
    VECTOR = "vector"
    BOTH = "both"

class MatchCorrelationType(str, Enum):
    """Types of match correlation between search methods"""
    INTERSECTION = "intersection"  # Found by both methods
    ATLAS_UNIQUE = "atlas_unique"  # Only found by Atlas Search
    VECTOR_UNIQUE = "vector_unique"  # Only found by Vector Search

class UnifiedSearchRequest(BaseModel):
    """Request model for unified entity search (Atlas Search + Vector Search)"""
    
    # Traditional Atlas Search fields
    name_full: Optional[str] = Field(None, description="Full name for Atlas Search fuzzy matching")
    address_full: Optional[str] = Field(None, description="Full address for Atlas Search")
    date_of_birth: Optional[str] = Field(None, description="Date of birth for Atlas Search (YYYY-MM-DD)")
    identifier_value: Optional[str] = Field(None, description="Identifier value for exact Atlas Search matching")
    
    # Vector Search fields
    semantic_query: Optional[str] = Field(None, description="Semantic text query for Vector Search")
    
    # Search method selection
    search_methods: List[SearchMethod] = Field(
        default=[SearchMethod.ATLAS, SearchMethod.VECTOR], 
        description="Which search methods to use"
    )
    
    # Configuration
    limit: int = Field(default=10, ge=1, le=20, description="Maximum results per search method")
    filters: Optional[Dict[str, Any]] = Field(None, description="Optional filters for both search methods")
    
    # Demo and testing support
    scenario_name: Optional[str] = Field(None, description="Demo scenario identifier")

class EntityMatch(BaseModel):
    """Model for entity matches that combines Atlas and Vector search results"""
    entity_id: str = Field(..., description="Entity identifier")
    entity_type: str = Field(..., description="Type of entity")
    name: Dict[str, Any] = Field(..., description="Entity name information")
    risk_assessment: Optional[Dict[str, Any]] = Field(None, description="Risk assessment data")
    
    # Atlas Search specific fields
    atlas_search_score: Optional[float] = Field(None, description="Atlas Search score (if found by Atlas)")
    atlas_match_reasons: List[str] = Field(default_factory=list, description="Atlas Search match reasons")
    
    # Vector Search specific fields
    vector_search_score: Optional[float] = Field(None, description="Vector similarity score (if found by Vector)")
    semantic_relevance: Optional[str] = Field(None, description="Why this entity is semantically relevant")
    
    # Combined intelligence
    found_by_methods: List[SearchMethod] = Field(..., description="Which search methods found this entity")
    correlation_type: MatchCorrelationType = Field(..., description="How this match correlates between methods")
    combined_confidence: Optional[float] = Field(None, description="Combined confidence score across methods")

class CorrelationAnalysis(BaseModel):
    """Analysis of how Atlas Search and Vector Search results correlate"""
    total_atlas_results: int = Field(..., description="Total results from Atlas Search")
    total_vector_results: int = Field(..., description="Total results from Vector Search")
    intersection_count: int = Field(..., description="Number of entities found by both methods")
    atlas_unique_count: int = Field(..., description="Entities only found by Atlas Search")
    vector_unique_count: int = Field(..., description="Entities only found by Vector Search")
    
    # Analysis insights
    correlation_percentage: float = Field(..., description="Percentage of overlap between methods")
    atlas_precision: Optional[float] = Field(None, description="Atlas Search precision for this query")
    vector_precision: Optional[float] = Field(None, description="Vector Search precision for this query")
    
    # Recommendations
    recommended_method: Optional[SearchMethod] = Field(None, description="Recommended primary search method")
    reasoning: List[str] = Field(default_factory=list, description="Reasoning for recommendations")

class SearchPerformanceMetrics(BaseModel):
    """Performance metrics for search execution"""
    atlas_search_time_ms: Optional[float] = Field(None, description="Atlas Search execution time")
    vector_search_time_ms: Optional[float] = Field(None, description="Vector Search execution time")
    correlation_time_ms: float = Field(..., description="Time to correlate results")
    total_search_time_ms: float = Field(..., description="Total search execution time")
    
    # Search method details
    atlas_index_used: Optional[str] = Field(None, description="Atlas Search index used")
    vector_index_used: Optional[str] = Field(None, description="Vector Search index used")
    embedding_model: Optional[str] = Field(None, description="Embedding model used for vector search")

class CombinedIntelligence(BaseModel):
    """Intelligence derived from combining Atlas Search and Vector Search results"""
    
    # Categorized results
    intersection_matches: List[EntityMatch] = Field(
        default_factory=list, 
        description="Entities found by both search methods"
    )
    atlas_unique: List[PotentialMatch] = Field(
        default_factory=list, 
        description="Entities only found by Atlas Search"
    )
    vector_unique: List[SimilarEntity] = Field(
        default_factory=list, 
        description="Entities only found by Vector Search"
    )
    
    # Analysis and insights
    correlation_analysis: CorrelationAnalysis = Field(..., description="Analysis of search method correlation")
    key_insights: List[str] = Field(default_factory=list, description="Key insights from the combined search")
    recommendations: List[str] = Field(default_factory=list, description="Recommendations for investigation")
    
    # Intelligence scores
    search_comprehensiveness: float = Field(..., description="How comprehensive the combined search was (0-1)")
    confidence_level: float = Field(..., description="Overall confidence in the results (0-1)")

class SearchMetadata(BaseModel):
    """Metadata about the unified search execution"""
    query_timestamp: datetime = Field(default_factory=datetime.utcnow, description="When the search was executed")
    search_methods_used: List[SearchMethod] = Field(..., description="Which search methods were used")
    performance_metrics: SearchPerformanceMetrics = Field(..., description="Performance metrics")
    
    # Search configuration
    filters_applied: Dict[str, Any] = Field(default_factory=dict, description="Filters applied to search")
    limits_used: Dict[str, int] = Field(default_factory=dict, description="Limits used per search method")
    
    # Quality metrics
    result_quality_score: Optional[float] = Field(None, description="Overall quality score for results")
    search_effectiveness: Optional[str] = Field(None, description="Assessment of search effectiveness")

class UnifiedSearchResponse(BaseModel):
    """Response model for unified entity search"""
    
    # Query information
    query_info: Dict[str, Any] = Field(..., description="Information about the search query")
    
    # Individual search method results
    atlas_results: List[PotentialMatch] = Field(default_factory=list, description="Atlas Search results")
    vector_results: List[SimilarEntity] = Field(default_factory=list, description="Vector Search results")
    
    # Combined intelligence
    combined_intelligence: CombinedIntelligence = Field(..., description="Intelligence from combining both methods")
    
    # Metadata
    search_metadata: SearchMetadata = Field(..., description="Search execution metadata")
    
    # Summary statistics
    total_unique_entities: int = Field(..., description="Total unique entities across all methods")
    search_success: bool = Field(default=True, description="Whether the search completed successfully")
    error_messages: List[str] = Field(default_factory=list, description="Any error messages encountered")

# Demo scenario models

class DemoScenario(BaseModel):
    """Model for predefined demo scenarios"""
    scenario_id: str = Field(..., description="Unique scenario identifier")
    name: str = Field(..., description="Display name for the scenario")
    description: str = Field(..., description="Description of what this scenario demonstrates")
    
    # Scenario input
    search_request: UnifiedSearchRequest = Field(..., description="The search request for this scenario")
    
    # Expected outcomes
    expected_atlas_count: Optional[int] = Field(None, description="Expected Atlas Search result count")
    expected_vector_count: Optional[int] = Field(None, description="Expected Vector Search result count")
    expected_intersection: Optional[int] = Field(None, description="Expected intersection count")
    
    # Demo insights
    key_demonstrations: List[str] = Field(..., description="What this scenario demonstrates")
    business_value: List[str] = Field(..., description="Business value shown by this scenario")
    wow_factor: str = Field(..., description="The main 'wow factor' for this demo")

class DemoScenarioResponse(BaseModel):
    """Response model for demo scenario execution"""
    scenario: DemoScenario = Field(..., description="The demo scenario that was executed")
    search_results: UnifiedSearchResponse = Field(..., description="The search results")
    demo_insights: List[str] = Field(..., description="Insights specific to this demo")
    success_metrics: Dict[str, Any] = Field(..., description="Metrics showing demo success")