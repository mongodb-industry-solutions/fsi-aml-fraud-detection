"""
API Response Models - Clean DTOs for API responses

Response models that provide consistent structure for all API endpoints
with proper error handling and metadata.
"""

from datetime import datetime
from typing import Dict, List, Optional, Any, Union
from pydantic import BaseModel, Field

from ..core.entity import Entity, EntitySummary
from ..core.resolution import ResolutionResult, PotentialMatch, ConfidenceLevel
from ..core.network import EntityNetwork, NetworkDiscoveryResult


# ==================== BASE RESPONSE MODELS ====================

class StandardResponse(BaseModel):
    """Standard response wrapper for all API endpoints"""
    
    success: bool
    data: Optional[Any] = None
    error: Optional[str] = None
    error_code: Optional[str] = None
    
    # Response metadata
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    request_id: Optional[str] = None
    processing_time_ms: Optional[float] = None
    
    # Pagination metadata (when applicable)
    pagination: Optional[Dict[str, Any]] = None
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class ErrorResponse(BaseModel):
    """Detailed error response"""
    
    success: bool = False
    error: str
    error_code: str
    error_type: str  # validation, not_found, internal, etc.
    
    # Error details
    details: Optional[Dict[str, Any]] = None
    field_errors: Optional[Dict[str, List[str]]] = None
    
    # Context
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    request_id: Optional[str] = None
    path: Optional[str] = None
    
    # Support information
    documentation_url: Optional[str] = None
    support_contact: Optional[str] = None


class PaginationInfo(BaseModel):
    """Pagination information for list responses"""
    
    total: int
    count: int
    limit: int
    offset: int
    
    has_next: bool
    has_previous: bool
    
    # Page information
    current_page: Optional[int] = None
    total_pages: Optional[int] = None
    
    # Navigation URLs (optional)
    next_url: Optional[str] = None
    previous_url: Optional[str] = None


# ==================== ENTITY RESPONSE MODELS ====================

class EntityResponse(StandardResponse):
    """Response for single entity operations"""
    
    data: Optional[Entity] = None
    
    # Additional entity metadata
    metadata: Optional[Dict[str, Any]] = None


class EntitySummaryResponse(StandardResponse):
    """Response for entity summary operations"""
    
    data: Optional[EntitySummary] = None


class EntitiesListResponse(StandardResponse):
    """Response for entity list operations"""
    
    data: Optional[List[EntitySummary]] = None
    pagination: Optional[PaginationInfo] = None
    
    # Search metadata
    search_metadata: Optional[Dict[str, Any]] = None
    filters_applied: Optional[Dict[str, Any]] = None


class EntityDetailedResponse(StandardResponse):
    """Response for detailed entity view with relationships"""
    
    data: Optional[Dict[str, Any]] = None  # Contains entity + relationships + analytics
    
    # Relationship summary
    relationship_summary: Optional[Dict[str, Any]] = None
    
    # Risk analysis
    risk_analysis: Optional[Dict[str, Any]] = None


# ==================== SEARCH RESPONSE MODELS ====================

class SearchMatch(BaseModel):
    """Individual search match result"""
    
    entity_id: str
    entity_data: Dict[str, Any]
    search_score: float
    match_reasons: List[str] = []
    confidence: Optional[float] = None
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class SearchResponse(StandardResponse):
    """Response for search operations"""
    
    data: Optional[List[SearchMatch]] = None
    query: Optional[str] = None
    total_matches: int = 0
    search_time_ms: Optional[float] = None
    
    # Search metadata
    search_metadata: Optional[Dict[str, Any]] = None


class UnifiedSearchResponse(StandardResponse):
    """Response for unified search operations combining Atlas and Vector search"""
    
    data: Optional[List[SearchMatch]] = None
    query: Optional[str] = None
    total_matches: int = 0
    search_time_ms: Optional[float] = None
    
    # Unified search metadata
    atlas_results_count: int = 0
    vector_results_count: int = 0
    combined_results_count: int = 0
    search_strategy: Optional[str] = None
    weights_used: Optional[Dict[str, float]] = None


class RelationshipListResponse(StandardResponse):
    """Response for relationship list operations"""
    
    data: Optional[List[Dict[str, Any]]] = None
    total_count: int = 0
    page_info: Optional[Dict[str, Any]] = None
    search_time_ms: Optional[float] = None


# ==================== RESOLUTION RESPONSE MODELS ====================

class ResolutionResponse(StandardResponse):
    """Response for entity resolution operations"""
    
    data: Optional[ResolutionResult] = None
    
    # Resolution summary
    summary: Optional[Dict[str, Any]] = None


class QuickResolutionResponse(StandardResponse):
    """Quick resolution response with minimal data"""
    
    data: Optional[Dict[str, Any]] = None
    
    class QuickResolutionData(BaseModel):
        resolution_id: str
        confidence_level: ConfidenceLevel
        recommended_action: str
        best_match_id: Optional[str] = None
        match_count: int = 0
        processing_time_ms: float


class BatchResolutionResponse(StandardResponse):
    """Response for batch resolution operations"""
    
    data: Optional[Dict[str, Any]] = None
    
    class BatchResolutionData(BaseModel):
        batch_id: str
        total_entities: int
        processed_entities: int
        successful_resolutions: int
        failed_resolutions: int
        
        # Individual results
        results: List[ResolutionResult] = Field(default_factory=list)
        errors: List[Dict[str, str]] = Field(default_factory=list)
        
        # Batch statistics
        average_processing_time_ms: float = 0
        total_processing_time_ms: float = 0


class ResolutionStatsResponse(StandardResponse):
    """Response for resolution statistics"""
    
    data: Optional[Dict[str, Any]] = None
    
    class ResolutionStats(BaseModel):
        period_days: int
        total_resolutions: int
        
        # Confidence distribution
        confidence_distribution: List[Dict[str, Any]] = Field(default_factory=list)
        
        # Performance metrics
        average_processing_time_ms: float
        success_rate: float
        
        # Trend data
        daily_counts: List[Dict[str, Any]] = Field(default_factory=list)


# ==================== NETWORK RESPONSE MODELS ====================

class NetworkResponse(StandardResponse):
    """Response for network operations"""
    
    data: Optional[EntityNetwork] = None
    
    # Network statistics
    statistics: Optional[Dict[str, Any]] = None


class NetworkDiscoveryResponse(StandardResponse):
    """Response for network discovery operations"""
    
    data: Optional[NetworkDiscoveryResult] = None
    
    # Discovery insights
    insights: Optional[Dict[str, Any]] = None


class RelationshipResponse(StandardResponse):
    """Response for relationship operations"""
    
    data: Optional[Dict[str, Any]] = None  # Relationship data


class RelationshipsListResponse(StandardResponse):
    """Response for relationship list operations"""
    
    data: Optional[List[Dict[str, Any]]] = None
    pagination: Optional[PaginationInfo] = None
    
    # Relationship metadata
    relationship_summary: Optional[Dict[str, Any]] = None


# ==================== SEARCH RESPONSE MODELS ====================

class SearchResponse(StandardResponse):
    """Response for search operations"""
    
    data: Optional[List[EntitySummary]] = None
    pagination: Optional[PaginationInfo] = None
    
    # Search metadata
    search_metadata: Optional[Dict[str, Any]] = None
    
    class SearchMetadata(BaseModel):
        query: Optional[str] = None
        search_time_ms: float
        total_hits: int
        strategies_used: List[str] = Field(default_factory=list)
        
        # Search insights
        suggestion: Optional[str] = None
        did_you_mean: Optional[str] = None
        filters_applied: Dict[str, Any] = Field(default_factory=dict)


class AdvancedSearchResponse(StandardResponse):
    """Response for advanced search operations"""
    
    data: Optional[Dict[str, Any]] = None
    
    class AdvancedSearchData(BaseModel):
        entities: List[EntitySummary] = Field(default_factory=list)
        
        # Search results by strategy
        text_matches: List[EntitySummary] = Field(default_factory=list)
        identifier_matches: List[EntitySummary] = Field(default_factory=list)
        semantic_matches: List[EntitySummary] = Field(default_factory=list)
        
        # Search analytics
        search_analytics: Dict[str, Any] = Field(default_factory=dict)
        performance_metrics: Dict[str, float] = Field(default_factory=dict)


# ==================== ANALYTICS RESPONSE MODELS ====================

class AnalyticsResponse(StandardResponse):
    """Response for analytics operations"""
    
    data: Optional[Dict[str, Any]] = None
    
    # Analytics metadata
    analytics_metadata: Optional[Dict[str, Any]] = None
    
    class AnalyticsMetadata(BaseModel):
        analytics_type: str
        period_analyzed: Dict[str, datetime]
        data_points: int
        generation_time_ms: float
        
        # Data quality
        completeness_score: Optional[float] = None
        confidence_score: Optional[float] = None


class RiskAnalyticsResponse(StandardResponse):
    """Response for risk analytics"""
    
    data: Optional[Dict[str, Any]] = None
    
    class RiskAnalyticsData(BaseModel):
        # Risk distribution
        risk_distribution: Dict[str, int] = Field(default_factory=dict)
        risk_trends: List[Dict[str, Any]] = Field(default_factory=list)
        
        # High-risk entities
        high_risk_entities: List[str] = Field(default_factory=list)
        risk_factors: Dict[str, float] = Field(default_factory=dict)
        
        # Risk insights
        risk_insights: List[str] = Field(default_factory=list)
        recommendations: List[str] = Field(default_factory=list)


class NetworkAnalyticsResponse(StandardResponse):
    """Response for network analytics"""
    
    data: Optional[Dict[str, Any]] = None
    
    class NetworkAnalyticsData(BaseModel):
        # Network metrics
        total_entities: int
        total_relationships: int
        network_density: float
        average_degree: float
        
        # Community analysis
        communities_found: int
        largest_community_size: int
        
        # Central entities
        most_central_entities: List[str] = Field(default_factory=list)
        bridge_entities: List[str] = Field(default_factory=list)
        
        # Risk propagation
        risk_propagation_paths: List[List[str]] = Field(default_factory=list)


# ==================== BULK OPERATION RESPONSES ====================

class BulkOperationResponse(StandardResponse):
    """Response for bulk operations"""
    
    data: Optional[Dict[str, Any]] = None
    
    class BulkOperationData(BaseModel):
        operation_id: str
        operation_type: str
        
        # Results summary
        total_items: int
        successful_items: int
        failed_items: int
        skipped_items: int = 0
        
        # Individual results
        successful_ids: List[str] = Field(default_factory=list)
        failed_items: List[Dict[str, str]] = Field(default_factory=list)
        
        # Timing
        total_processing_time_ms: float
        average_item_time_ms: float


class ImportResponse(StandardResponse):
    """Response for data import operations"""
    
    data: Optional[Dict[str, Any]] = None
    
    class ImportData(BaseModel):
        import_id: str
        import_status: str
        
        # Import summary
        total_records: int
        imported_records: int
        duplicate_records: int
        error_records: int
        
        # Processing details
        duplicates_handled: List[Dict[str, Any]] = Field(default_factory=list)
        import_errors: List[Dict[str, str]] = Field(default_factory=list)
        
        # Validation results
        validation_summary: Dict[str, Any] = Field(default_factory=dict)


class ExportResponse(StandardResponse):
    """Response for data export operations"""
    
    data: Optional[Dict[str, Any]] = None
    
    class ExportData(BaseModel):
        export_id: str
        export_status: str
        
        # Export details
        total_entities: int
        export_format: str
        file_size_bytes: int
        
        # Download information
        download_url: Optional[str] = None
        expires_at: Optional[datetime] = None
        
        # Export metadata
        includes_relationships: bool
        includes_risk_data: bool
        compression_used: bool


# ==================== STATUS AND HEALTH RESPONSES ====================

class HealthResponse(StandardResponse):
    """Response for health check operations"""
    
    data: Optional[Dict[str, Any]] = None
    
    class HealthData(BaseModel):
        status: str  # healthy, degraded, unhealthy
        version: str
        uptime_seconds: float
        
        # Component health
        database_status: str
        redis_status: Optional[str] = None
        ai_service_status: Optional[str] = None
        
        # Performance metrics
        response_time_ms: float
        memory_usage_mb: float
        cpu_usage_percent: float
        
        # System metrics
        total_entities: int
        total_relationships: int
        resolution_rate: float


class SystemInfoResponse(StandardResponse):
    """Response for system information"""
    
    data: Optional[Dict[str, Any]] = None
    
    class SystemInfo(BaseModel):
        # System details
        service_name: str
        version: str
        environment: str
        deployment_date: datetime
        
        # Configuration
        features_enabled: List[str] = Field(default_factory=list)
        matching_strategies: List[str] = Field(default_factory=list)
        
        # Limits and quotas
        max_entities: Optional[int] = None
        max_requests_per_minute: Optional[int] = None
        
        # API information
        api_version: str
        documentation_url: str
        support_contact: str


# ==================== HELPER FUNCTIONS ====================

def create_success_response(
    data: Any = None,
    processing_time_ms: Optional[float] = None,
    request_id: Optional[str] = None,
    pagination: Optional[PaginationInfo] = None
) -> StandardResponse:
    """Helper function to create successful response"""
    return StandardResponse(
        success=True,
        data=data,
        processing_time_ms=processing_time_ms,
        request_id=request_id,
        pagination=pagination.dict() if pagination else None
    )


def create_error_response(
    error_message: str,
    error_code: str = "GENERAL_ERROR",
    error_type: str = "internal",
    details: Optional[Dict[str, Any]] = None,
    request_id: Optional[str] = None
) -> ErrorResponse:
    """Helper function to create error response"""
    return ErrorResponse(
        error=error_message,
        error_code=error_code,
        error_type=error_type,
        details=details,
        request_id=request_id
    )


def create_pagination_info(
    total: int,
    count: int,
    limit: int,
    offset: int
) -> PaginationInfo:
    """Helper function to create pagination info"""
    return PaginationInfo(
        total=total,
        count=count,
        limit=limit,
        offset=offset,
        has_next=offset + count < total,
        has_previous=offset > 0,
        current_page=(offset // limit) + 1 if limit > 0 else 1,
        total_pages=((total - 1) // limit) + 1 if limit > 0 and total > 0 else 1
    )