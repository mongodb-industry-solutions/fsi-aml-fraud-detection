"""
Entity Resolution Models - Clean resolution workflow models

Consolidated and simplified from entity_resolution.py, focusing on essential
resolution functionality without over-engineering.
"""

from datetime import datetime
from enum import Enum
from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field, validator

from .entity import Entity


# ==================== ENUMS ====================

class ResolutionStatus(str, Enum):
    """Status of resolution process"""
    PENDING = "pending"
    IN_PROGRESS = "in_progress"  
    COMPLETED = "completed"
    FAILED = "failed"
    REQUIRES_REVIEW = "requires_review"


class ResolutionDecision(str, Enum):
    """Decision outcomes for resolution"""
    CREATE_NEW = "create_new"
    UPDATE_EXISTING = "update_existing" 
    MERGE_ENTITIES = "merge_entities"
    MANUAL_REVIEW = "manual_review"
    NO_ACTION = "no_action"


class MatchType(str, Enum):
    """Types of matching strategies"""
    EXACT = "exact"
    IDENTIFIER = "identifier"
    FUZZY_HIGH = "fuzzy_high"
    FUZZY_MEDIUM = "fuzzy_medium"
    FUZZY_LOW = "fuzzy_low"
    PHONETIC = "phonetic"
    VECTOR_SEMANTIC = "vector_semantic"
    GRAPH_RELATIONSHIP = "graph_relationship"


class ConfidenceLevel(str, Enum):
    """Confidence level classifications"""
    EXACT_MATCH = "exact_match"        # 0.95+
    HIGH_CONFIDENCE = "high_confidence"  # 0.85-0.94
    MEDIUM_CONFIDENCE = "medium_confidence"  # 0.70-0.84
    LOW_CONFIDENCE = "low_confidence"    # 0.50-0.69
    NO_MATCH = "no_match"              # < 0.50


# ==================== MATCHING MODELS ====================

class MatchEvidence(BaseModel):
    """Evidence supporting a match"""
    match_type: MatchType
    field_name: str
    input_value: str
    matched_value: str
    similarity_score: float = Field(..., ge=0, le=1)
    algorithm_used: Optional[str] = None
    details: Optional[Dict[str, Any]] = None


class PotentialMatch(BaseModel):
    """A potential entity match with confidence scoring"""
    entity: Entity
    confidence_score: float = Field(..., ge=0, le=1)
    match_types: List[MatchType]
    evidence: List[MatchEvidence] = Field(default_factory=list)
    
    # Additional scoring details
    individual_scores: Dict[str, float] = Field(default_factory=dict)
    weighted_score: Optional[float] = None
    
    @property
    def confidence_level(self) -> ConfidenceLevel:
        """Determine confidence level from score"""
        if self.confidence_score >= 0.95:
            return ConfidenceLevel.EXACT_MATCH
        elif self.confidence_score >= 0.85:
            return ConfidenceLevel.HIGH_CONFIDENCE
        elif self.confidence_score >= 0.70:
            return ConfidenceLevel.MEDIUM_CONFIDENCE
        elif self.confidence_score >= 0.50:
            return ConfidenceLevel.LOW_CONFIDENCE
        else:
            return ConfidenceLevel.NO_MATCH
    
    @property
    def recommended_action(self) -> ResolutionDecision:
        """Get recommended action based on confidence"""
        level = self.confidence_level
        if level == ConfidenceLevel.EXACT_MATCH:
            return ResolutionDecision.MERGE_ENTITIES
        elif level == ConfidenceLevel.HIGH_CONFIDENCE:
            return ResolutionDecision.UPDATE_EXISTING
        elif level in [ConfidenceLevel.MEDIUM_CONFIDENCE, ConfidenceLevel.LOW_CONFIDENCE]:
            return ResolutionDecision.MANUAL_REVIEW
        else:
            return ResolutionDecision.CREATE_NEW


# ==================== RESOLUTION WORKFLOW MODELS ====================

class ResolutionInput(BaseModel):
    """Input data for entity resolution"""
    name: str = Field(..., min_length=1)
    entity_type: str = Field(..., pattern="^(individual|organization)$")
    
    # Optional matching data
    alternate_names: List[str] = Field(default_factory=list)
    identifiers: Dict[str, str] = Field(default_factory=dict)
    nationality: Optional[str] = None
    associated_entities: List[str] = Field(default_factory=list)
    
    # Additional context for matching
    attributes: Dict[str, Any] = Field(default_factory=dict)
    
    # Resolution preferences
    max_matches: int = Field(20, ge=1, le=100)
    min_confidence: float = Field(0.5, ge=0, le=1)
    strategies: List[MatchType] = Field(default_factory=list)
    
    @validator('alternate_names')
    def clean_alternate_names(cls, v):
        return [name.strip() for name in v if name and name.strip()]
    
    @validator('identifiers')
    def clean_identifiers(cls, v):
        return {k: str(v_id).strip() for k, v_id in v.items() if v_id and str(v_id).strip()}


class ResolutionResult(BaseModel):
    """Complete resolution result"""
    resolution_id: str
    input_data: ResolutionInput
    
    # Matching results
    matches: List[PotentialMatch] = Field(default_factory=list)
    best_match: Optional[PotentialMatch] = None
    confidence_level: ConfidenceLevel
    
    # Resolution decision
    recommended_action: ResolutionDecision
    decision_reasoning: Optional[str] = None
    
    # Processing metadata
    processing_time_ms: float
    strategies_used: List[MatchType]
    total_candidates_evaluated: int = 0
    
    # System metadata
    created_date: datetime = Field(default_factory=datetime.utcnow)
    status: ResolutionStatus = ResolutionStatus.COMPLETED
    
    @property
    def has_significant_matches(self) -> bool:
        """Check if any matches meet minimum confidence threshold"""
        return any(match.confidence_score >= 0.5 for match in self.matches)
    
    @property
    def requires_manual_review(self) -> bool:
        """Check if manual review is required"""
        return (self.confidence_level in [ConfidenceLevel.MEDIUM_CONFIDENCE, ConfidenceLevel.LOW_CONFIDENCE] 
                or self.recommended_action == ResolutionDecision.MANUAL_REVIEW)


class ResolutionDecisionInput(BaseModel):
    """User decision input for resolution workflow"""
    resolution_id: str
    decision: ResolutionDecision
    selected_match_id: Optional[str] = None
    reasoning: Optional[str] = None
    user_id: Optional[str] = None
    additional_data: Optional[Dict[str, Any]] = None


# ==================== SEARCH AND QUERY MODELS ====================

class SearchCriteria(BaseModel):
    """Flexible search criteria for entity discovery"""
    
    # Text search
    query: Optional[str] = None
    fuzzy: bool = True
    
    # Filters
    entity_type: Optional[str] = None
    risk_level: Optional[str] = None
    status: Optional[str] = None
    nationality: Optional[str] = None
    
    # Identifier search
    identifiers: Dict[str, str] = Field(default_factory=dict)
    
    # Date filters
    created_after: Optional[datetime] = None
    created_before: Optional[datetime] = None
    
    # Pagination
    limit: int = Field(20, ge=1, le=100)
    offset: int = Field(0, ge=0)
    
    # Sorting
    sort_by: str = "created_date"
    sort_order: str = Field("desc", pattern="^(asc|desc)$")


class SearchResult(BaseModel):
    """Search result with metadata"""
    entities: List[Entity]
    total_count: int
    has_more: bool
    search_time_ms: float
    filters_applied: Dict[str, Any]
    
    # Search metadata
    query_used: Optional[str] = None
    search_strategy: Optional[str] = None


# ==================== MERGE AND LINK MODELS ====================

class MergeRequest(BaseModel):
    """Request to merge two entities"""
    source_entity_id: str
    target_entity_id: str
    merge_strategy: str = Field("combine", pattern="^(combine|prefer_source|prefer_target)$")
    reasoning: Optional[str] = None
    user_id: Optional[str] = None


class MergeResult(BaseModel):
    """Result of entity merge operation"""
    merged_entity_id: str
    source_entity_id: str
    target_entity_id: str
    merge_strategy: str
    
    # Conflict resolution
    conflicts_resolved: List[Dict[str, Any]] = Field(default_factory=list)
    data_preserved: Dict[str, Any] = Field(default_factory=dict)
    
    # Metadata
    performed_by: Optional[str] = None
    performed_date: datetime = Field(default_factory=datetime.utcnow)
    reasoning: Optional[str] = None


# ==================== CONFIGURATION MODELS ====================

class MatchingConfig(BaseModel):
    """Configuration for matching algorithms"""
    
    # Confidence thresholds
    exact_match_threshold: float = Field(0.95, ge=0.9, le=1.0)
    high_confidence_threshold: float = Field(0.85, ge=0.8, le=0.95)
    medium_confidence_threshold: float = Field(0.70, ge=0.6, le=0.85)
    low_confidence_threshold: float = Field(0.50, ge=0.3, le=0.70)
    
    # Strategy weights
    strategy_weights: Dict[MatchType, float] = Field(default_factory=lambda: {
        MatchType.EXACT: 1.0,
        MatchType.IDENTIFIER: 0.95,
        MatchType.FUZZY_HIGH: 0.85,
        MatchType.FUZZY_MEDIUM: 0.70,
        MatchType.FUZZY_LOW: 0.50,
        MatchType.VECTOR_SEMANTIC: 0.75,
        MatchType.PHONETIC: 0.60,
        MatchType.GRAPH_RELATIONSHIP: 0.55
    })
    
    # Algorithm settings
    fuzzy_min_ratio: int = Field(70, ge=50, le=95)
    max_matches_returned: int = Field(20, ge=1, le=100)
    enable_ai_matching: bool = True
    enable_graph_matching: bool = True
    
    # Performance settings
    timeout_seconds: int = Field(30, ge=5, le=120)
    max_candidates: int = Field(1000, ge=100, le=10000)


# ==================== AUDIT AND HISTORY MODELS ====================

class ResolutionAuditEntry(BaseModel):
    """Audit entry for resolution decisions"""
    resolution_id: str
    entity_input: Dict[str, Any]
    decision_made: ResolutionDecision
    confidence_score: Optional[float] = None
    
    # User context
    user_id: Optional[str] = None
    session_id: Optional[str] = None
    ip_address: Optional[str] = None
    
    # System context
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    processing_time_ms: float
    strategies_used: List[MatchType]
    
    # Additional context
    reasoning: Optional[str] = None
    system_recommendation: Optional[ResolutionDecision] = None
    user_overrode_recommendation: bool = False