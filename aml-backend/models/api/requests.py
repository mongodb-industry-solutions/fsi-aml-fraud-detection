"""
API Request Models - Clean DTOs for API endpoints

Request models that separate API concerns from domain models,
providing validation and transformation for incoming requests.
"""

from datetime import datetime
from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field, validator

from ..core.entity import EntityType, EntityStatus, RiskLevel
from ..core.resolution import MatchType, ResolutionDecision
from ..core.network import RelationshipType, RelationshipStrength


# ==================== ENTITY REQUEST MODELS ====================

class EntityCreateRequest(BaseModel):
    """Request to create a new entity"""
    
    # Required fields
    name: str = Field(..., min_length=1, max_length=500)
    entity_type: EntityType
    
    # Optional identification
    alternate_names: List[str] = Field(default_factory=list)
    identifiers: Dict[str, str] = Field(default_factory=dict)
    nationality: Optional[str] = None
    
    # Contact information
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None
    
    # Initial risk assessment
    risk_level: Optional[RiskLevel] = None
    risk_score: Optional[float] = Field(None, ge=0, le=1)
    
    # Additional attributes
    attributes: Dict[str, Any] = Field(default_factory=dict)
    
    # Creator information
    created_by: Optional[str] = None
    
    @validator('name')
    def validate_name(cls, v):
        return v.strip() if v else v
    
    @validator('alternate_names')
    def clean_alternate_names(cls, v):
        return [name.strip() for name in v if name and name.strip()]
    
    @validator('identifiers')
    def clean_identifiers(cls, v):
        return {k: str(val).strip() for k, val in v.items() if val and str(val).strip()}


class EntityUpdateRequest(BaseModel):
    """Request to update an existing entity"""
    
    # Updatable fields (all optional)
    name: Optional[str] = Field(None, min_length=1, max_length=500)
    status: Optional[EntityStatus] = None
    alternate_names: Optional[List[str]] = None
    identifiers: Optional[Dict[str, str]] = None
    nationality: Optional[str] = None
    
    # Contact updates
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None
    
    # Risk updates
    risk_level: Optional[RiskLevel] = None
    risk_score: Optional[float] = Field(None, ge=0, le=1)
    
    # Additional attributes
    attributes: Optional[Dict[str, Any]] = None
    
    # Update metadata
    updated_by: Optional[str] = None
    update_reason: Optional[str] = None
    
    @validator('name')
    def validate_name(cls, v):
        return v.strip() if v else v


class EntitySearchRequest(BaseModel):
    """Request for entity search with filtering"""
    
    # Entity matching fields (for entity resolution)
    entity_name: Optional[str] = None  # Primary search field
    fuzzy_matching: bool = True        # Enable fuzzy matching
    
    # Contact information for matching
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    
    # Text search (legacy field for compatibility)
    query: Optional[str] = None
    fuzzy: bool = True
    
    # Filters
    entity_type: Optional[EntityType] = None
    status: Optional[EntityStatus] = None
    risk_level: Optional[RiskLevel] = None
    nationality: Optional[str] = None
    
    # Identifier search
    identifiers: Dict[str, str] = Field(default_factory=dict)
    
    # Date filters
    created_after: Optional[datetime] = None
    created_before: Optional[datetime] = None
    
    # Pagination and sorting
    limit: int = Field(20, ge=1, le=100)
    offset: int = Field(0, ge=0)
    sort_by: str = Field("created_date", pattern="^(name|created_date|risk_score|updated_date)$")
    sort_order: str = Field("desc", pattern="^(asc|desc)$")
    
    # Response options
    include_summary_only: bool = False


class CompleteEntitySearchRequest(BaseModel):
    """Complete entity search request for enhanced resolution workflows"""
    
    # Required fields
    entity_name: str = Field(..., min_length=1, max_length=500)
    entity_type: Optional[str] = None
    
    # Matching options
    fuzzy_matching: bool = True
    
    # Contact information for comprehensive matching
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    
    # Search configuration
    limit: int = Field(50, ge=1, le=100)
    
    @validator('entity_name')
    def validate_entity_name(cls, v):
        return v.strip() if v else v


# ==================== RESOLUTION REQUEST MODELS ====================

class ResolutionRequest(BaseModel):
    """Request for entity resolution"""
    
    # Entity data to resolve
    name: str = Field(..., min_length=1, max_length=500)
    entity_type: EntityType
    
    # Matching data
    alternate_names: List[str] = Field(default_factory=list)
    identifiers: Dict[str, str] = Field(default_factory=dict)
    nationality: Optional[str] = None
    associated_entities: List[str] = Field(default_factory=list)
    
    # Resolution preferences
    max_matches: int = Field(20, ge=1, le=100)
    min_confidence: float = Field(0.5, ge=0, le=1)
    strategies: List[MatchType] = Field(default_factory=list)
    
    # Context for resolution
    context: Optional[str] = None
    use_ai_matching: bool = True
    include_network_analysis: bool = False
    
    # Request metadata
    requested_by: Optional[str] = None
    session_id: Optional[str] = None
    
    @validator('name')
    def validate_name(cls, v):
        return v.strip()
    
    @validator('alternate_names')
    def clean_alternate_names(cls, v):
        return [name.strip() for name in v if name and name.strip()]


class ResolutionDecisionRequest(BaseModel):
    """Request to make resolution decision"""
    
    resolution_id: str
    decision: ResolutionDecision
    
    # Decision details
    selected_match_id: Optional[str] = None
    confidence_override: Optional[float] = Field(None, ge=0, le=1)
    reasoning: Optional[str] = None
    
    # Additional data for new entity creation
    additional_entity_data: Optional[Dict[str, Any]] = None
    
    # Decision metadata
    decided_by: Optional[str] = None
    decision_date: Optional[datetime] = None


class BatchResolutionRequest(BaseModel):
    """Request for batch entity resolution"""
    
    entities: List[ResolutionRequest] = Field(..., min_items=1, max_items=100)
    
    # Batch processing options
    batch_id: Optional[str] = None
    parallel_processing: bool = True
    stop_on_error: bool = False
    
    # Default resolution preferences
    default_max_matches: int = Field(10, ge=1, le=50)
    default_min_confidence: float = Field(0.7, ge=0.5, le=1.0)
    
    # Batch metadata
    requested_by: Optional[str] = None
    batch_description: Optional[str] = None


# ==================== NETWORK REQUEST MODELS ====================

class NetworkDiscoveryRequest(BaseModel):
    """Request for network discovery and analysis"""
    
    # Starting point
    center_entity_id: str
    max_depth: int = Field(2, ge=1, le=5)
    
    # Relationship filters
    relationship_types: List[RelationshipType] = Field(default_factory=list)
    min_confidence: float = Field(0.3, ge=0, le=1)
    only_verified: bool = False
    
    # Entity filters
    include_entity_types: List[EntityType] = Field(default_factory=list)
    exclude_entity_types: List[EntityType] = Field(default_factory=list)
    min_risk_level: Optional[RiskLevel] = None
    
    # Analysis options
    include_centrality_analysis: bool = True
    include_community_detection: bool = False
    include_risk_propagation: bool = False
    
    # Size limits
    max_entities: int = Field(100, ge=10, le=500)
    max_relationships: int = Field(200, ge=20, le=1000)
    
    # Visualization preferences
    optimize_for_visualization: bool = True
    layout_algorithm: str = Field("force", pattern="^(force|hierarchical|circular)$")


class RelationshipCreateRequest(BaseModel):
    """Request to create entity relationship"""
    
    source_entity_id: str
    target_entity_id: str
    relationship_type: RelationshipType
    
    # Relationship details
    strength: RelationshipStrength = RelationshipStrength.POSSIBLE
    confidence_score: Optional[float] = Field(None, ge=0, le=1)
    description: Optional[str] = None
    evidence: List[str] = Field(default_factory=list)
    
    # Source information
    data_source: Optional[str] = None
    created_by: Optional[str] = None
    requires_verification: bool = True
    
    # Additional attributes
    attributes: Dict[str, Any] = Field(default_factory=dict)
    
    @validator('source_entity_id', 'target_entity_id')
    def validate_entity_ids(cls, v):
        if not v or not v.strip():
            raise ValueError("Entity ID cannot be empty")
        return v.strip()
    
    @validator('description')
    def validate_description(cls, v):
        return v.strip() if v else v


class RelationshipUpdateRequest(BaseModel):
    """Request to update entity relationship"""
    
    # Updatable fields
    relationship_type: Optional[RelationshipType] = None
    strength: Optional[RelationshipStrength] = None
    confidence_score: Optional[float] = Field(None, ge=0, le=1)
    description: Optional[str] = None
    evidence: Optional[List[str]] = None
    
    # Verification
    verified: Optional[bool] = None
    verified_by: Optional[str] = None
    
    # Update metadata
    updated_by: Optional[str] = None
    update_reason: Optional[str] = None
    
    # Additional attributes
    attributes: Optional[Dict[str, Any]] = None


# ==================== SEARCH AND ANALYTICS REQUESTS ====================

class AdvancedSearchRequest(BaseModel):
    """Advanced search request with multiple criteria"""
    
    # Multiple search terms
    text_queries: List[str] = Field(default_factory=list)
    identifier_searches: List[Dict[str, str]] = Field(default_factory=list)
    
    # Complex filters
    risk_score_range: Optional[Dict[str, float]] = None  # {"min": 0.5, "max": 0.9}
    relationship_criteria: Optional[Dict[str, Any]] = None
    geographic_filters: Optional[Dict[str, Any]] = None
    
    # Search behavior
    search_mode: str = Field("any", pattern="^(any|all|exact)$")
    include_inactive: bool = False
    include_archived: bool = False
    
    # Result preferences
    max_results: int = Field(100, ge=1, le=500)
    include_network_preview: bool = False
    include_risk_analysis: bool = False
    
    # Search metadata
    search_name: Optional[str] = None
    save_search: bool = False


class AnalyticsRequest(BaseModel):
    """Request for analytics and reporting"""
    
    # Time period
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    
    # Analytics type
    analytics_type: str = Field(..., pattern="^(resolution_stats|risk_distribution|network_analysis|entity_growth)$")
    
    # Filters
    entity_types: List[EntityType] = Field(default_factory=list)
    risk_levels: List[RiskLevel] = Field(default_factory=list)
    
    # Grouping and aggregation
    group_by: Optional[str] = None
    aggregation_level: str = Field("day", pattern="^(hour|day|week|month)$")
    
    # Output preferences
    include_charts: bool = True
    export_format: str = Field("json", pattern="^(json|csv|pdf)$")


# ==================== BULK OPERATIONS ====================

class BulkEntityOperation(BaseModel):
    """Bulk operation on multiple entities"""
    
    operation: str = Field(..., pattern="^(create|update|delete|archive)$")
    entity_ids: List[str] = Field(default_factory=list)
    entity_data: List[Dict[str, Any]] = Field(default_factory=list)
    
    # Operation options
    batch_size: int = Field(50, ge=1, le=100)
    continue_on_error: bool = True
    validate_before_operation: bool = True
    
    # Operation metadata
    operation_id: Optional[str] = None
    performed_by: Optional[str] = None
    reason: Optional[str] = None
    
    @validator('entity_ids', 'entity_data')
    def validate_operation_data(cls, v, values):
        operation = values.get('operation')
        if operation in ['update', 'delete', 'archive'] and not values.get('entity_ids'):
            raise ValueError(f"entity_ids required for {operation} operation")
        if operation == 'create' and not values.get('entity_data'):
            raise ValueError("entity_data required for create operation")
        return v


# ==================== IMPORT/EXPORT REQUESTS ====================

class DataImportRequest(BaseModel):
    """Request for data import"""
    
    # Import source
    import_type: str = Field(..., pattern="^(csv|json|xml|api)$")
    source_url: Optional[str] = None
    file_data: Optional[str] = None  # Base64 encoded file content
    
    # Import configuration
    field_mapping: Dict[str, str] = Field(default_factory=dict)
    validation_rules: Dict[str, Any] = Field(default_factory=dict)
    duplicate_handling: str = Field("merge", pattern="^(merge|skip|replace)$")
    
    # Processing options
    batch_size: int = Field(100, ge=10, le=1000)
    dry_run: bool = False
    auto_resolve_duplicates: bool = True
    
    # Import metadata
    import_name: Optional[str] = None
    description: Optional[str] = None
    imported_by: Optional[str] = None


class DataExportRequest(BaseModel):
    """Request for data export"""
    
    # Export criteria
    entity_ids: List[str] = Field(default_factory=list)
    search_criteria: Optional[EntitySearchRequest] = None
    
    # Export format
    export_format: str = Field("json", pattern="^(json|csv|xml|excel)$")
    include_relationships: bool = False
    include_risk_data: bool = True
    include_history: bool = False
    
    # Export options
    compression: bool = False
    split_large_files: bool = True
    max_file_size_mb: int = Field(100, ge=1, le=1000)
    
    # Export metadata
    export_name: Optional[str] = None
    description: Optional[str] = None
    exported_by: Optional[str] = None


# ==================== VECTOR SEARCH REQUESTS ====================

class VectorSearchRequest(BaseModel):
    """Request model for vector similarity search"""
    
    query_text: Optional[str] = None
    query_vector: Optional[List[float]] = None
    limit: int = Field(default=10, ge=1, le=100)
    similarity_threshold: float = Field(default=0.6, ge=0.0, le=1.0)
    
    # Filter options
    entity_type: Optional[str] = None
    exclude_entity_ids: Optional[List[str]] = None


class SimilaritySearchRequest(BaseModel):
    """Request model for similarity-based search operations"""
    
    query: str = Field(..., min_length=1, description="Search query text")
    limit: int = Field(default=10, ge=1, le=100)
    similarity_threshold: float = Field(default=0.6, ge=0.0, le=1.0)
    
    # Search options
    fuzzy: bool = True
    exact_match: bool = False
    
    # Filter options
    entity_type: Optional[str] = None
    status: Optional[str] = None


class UnifiedSearchRequest(BaseModel):
    """Request model for unified search operations"""
    
    query: str = Field(..., min_length=1, description="Search query text")
    limit: int = Field(default=10, ge=1, le=50)
    atlas_weight: float = Field(default=0.6, ge=0.0, le=1.0)
    vector_weight: float = Field(default=0.4, ge=0.0, le=1.0)
    
    # Filter options
    entity_type: Optional[str] = None
    status: Optional[str] = None
    risk_level: Optional[str] = None


class NetworkRequest(BaseModel):
    """Request model for network operations"""
    
    center_entity_id: str
    max_depth: int = Field(default=2, ge=1, le=5)
    max_entities: int = Field(default=100, ge=1, le=500)
    
    # Analysis options
    include_risk_analysis: bool = True
    relationship_types: Optional[List[str]] = None


class RelationshipQueryRequest(BaseModel):
    """Request model for relationship queries"""
    
    # Entity filtering
    entity_id: Optional[str] = None
    entity_ids: Optional[List[str]] = None
    
    # Relationship filtering
    relationship_types: Optional[List[str]] = None
    min_strength: Optional[float] = None
    min_confidence: Optional[float] = None
    
    # Pagination
    limit: int = Field(default=20, ge=1, le=100)
    offset: int = Field(default=0, ge=0)


class EntityNetworkRequest(BaseModel):
    """Request model for entity network operations"""
    
    entity_id: str
    max_depth: int = Field(default=2, ge=1, le=5)
    max_entities: int = Field(default=100, ge=1, le=500)
    include_risk_analysis: bool = True
    relationship_types: Optional[List[str]] = None