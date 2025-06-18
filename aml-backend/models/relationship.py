"""
Relationship Models - Data models for entity relationships

Models for managing relationships between entities, including
relationship evidence, confidence scoring, and lifecycle management.
"""

from datetime import datetime
from typing import Dict, List, Optional, Any, Literal
from pydantic import BaseModel, Field


class RelationshipEvidence(BaseModel):
    """Evidence supporting a relationship between entities"""
    
    evidence_type: str  # "shared_address", "shared_phone", "transaction", etc.
    evidence_value: Any
    confidence: float = Field(ge=0.0, le=1.0)
    source: str
    
    # Temporal information
    discovered_date: datetime = Field(default_factory=datetime.utcnow)
    evidence_date: Optional[datetime] = None
    
    # Verification
    verified: bool = False
    verified_by: Optional[str] = None
    verification_date: Optional[datetime] = None
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class Relationship(BaseModel):
    """Relationship between two entities"""
    
    relationship_id: str
    source_entity_id: str
    target_entity_id: str
    relationship_type: str
    
    # Relationship strength and confidence
    strength: float = Field(ge=0.0, le=1.0)
    confidence: float = Field(ge=0.0, le=1.0)
    
    # Evidence and verification
    evidence: List[RelationshipEvidence] = []
    evidence_count: int = 0
    
    # Status and lifecycle
    status: Literal["active", "inactive", "under_review", "disputed"] = "active"
    created_date: datetime = Field(default_factory=datetime.utcnow)
    updated_date: datetime = Field(default_factory=datetime.utcnow)
    
    # Analysis metadata
    risk_impact: Optional[float] = None
    network_importance: Optional[float] = None
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class RelationshipRequest(BaseModel):
    """Request for creating or updating relationships"""
    
    source_entity_id: str
    target_entity_id: str
    relationship_type: str
    
    # Initial evidence
    evidence: Optional[List[RelationshipEvidence]] = None
    
    # Relationship attributes
    strength: Optional[float] = None
    confidence: Optional[float] = None
    notes: Optional[str] = None
    
    class Config:
        json_schema_extra = {
            "example": {
                "source_entity_id": "ENT123456",
                "target_entity_id": "ENT789012",
                "relationship_type": "family_member",
                "evidence": [
                    {
                        "evidence_type": "shared_address",
                        "evidence_value": "123 Main St, City, State",
                        "confidence": 0.9,
                        "source": "KYC_verification"
                    }
                ]
            }
        }


class RelationshipAnalysis(BaseModel):
    """Analysis results for a relationship"""
    
    relationship_id: str
    analysis_type: str
    analysis_results: Dict[str, Any]
    confidence_score: float
    
    # Risk assessment
    risk_indicators: List[str] = []
    risk_score: Optional[float] = None
    
    # Recommendations
    recommendations: List[str] = []
    requires_review: bool = False
    
    # Analysis metadata
    analysis_date: datetime = Field(default_factory=datetime.utcnow)
    analysis_method: str = "automated"
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class RelationshipSearchRequest(BaseModel):
    """Request for searching relationships"""
    
    # Entity filtering
    entity_id: Optional[str] = None
    entity_ids: Optional[List[str]] = None
    
    # Relationship filtering
    relationship_types: Optional[List[str]] = None
    min_strength: Optional[float] = None
    min_confidence: Optional[float] = None
    status: Optional[str] = None
    
    # Pagination
    limit: int = Field(default=20, ge=1, le=100)
    offset: int = Field(default=0, ge=0)
    
    # Sorting
    sort_by: Optional[str] = "strength"
    sort_order: Optional[Literal["asc", "desc"]] = "desc"
    
    class Config:
        json_schema_extra = {
            "example": {
                "entity_id": "ENT123456",
                "relationship_types": ["family_member", "business_partner"],
                "min_confidence": 0.7,
                "limit": 20
            }
        }


class RelationshipSearchResponse(BaseModel):
    """Response for relationship search operations"""
    
    relationships: List[Relationship]
    total_count: int
    page_info: Dict[str, Any]
    search_time_ms: float
    
    # Search metadata
    filters_applied: Dict[str, Any]
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class BulkRelationshipOperation(BaseModel):
    """Request for bulk relationship operations"""
    
    operation: Literal["create", "update", "delete", "analyze"]
    relationships: List[Dict[str, Any]]
    
    # Operation options
    validate_entities: bool = True
    update_network: bool = True
    
    class Config:
        json_schema_extra = {
            "example": {
                "operation": "create",
                "relationships": [
                    {
                        "source_entity_id": "ENT123456",
                        "target_entity_id": "ENT789012",
                        "relationship_type": "family_member"
                    }
                ]
            }
        }


class BulkRelationshipResponse(BaseModel):
    """Response for bulk relationship operations"""
    
    operation: str
    total_requested: int
    successful: int
    failed: int
    
    # Detailed results
    results: List[Dict[str, Any]] = []
    errors: List[Dict[str, Any]] = []
    
    # Operation timing
    processing_time_ms: float
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class CreateRelationshipRequest(BaseModel):
    """Request for creating a new relationship"""
    
    source_entity_id: str
    target_entity_id: str
    relationship_type: str
    
    # Optional attributes
    strength: Optional[float] = None
    confidence: Optional[float] = None
    evidence: Optional[List[RelationshipEvidence]] = None
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class UpdateRelationshipRequest(BaseModel):
    """Request for updating an existing relationship"""
    
    # Updatable fields
    relationship_type: Optional[str] = None
    strength: Optional[float] = None
    confidence: Optional[float] = None
    status: Optional[str] = None
    evidence: Optional[List[RelationshipEvidence]] = None
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class RelationshipQueryParams(BaseModel):
    """Query parameters for relationship operations"""
    
    # Entity filtering
    entity_id: Optional[str] = None
    entity_ids: Optional[List[str]] = None
    
    # Relationship filtering
    relationship_types: Optional[List[str]] = None
    min_strength: Optional[float] = None
    min_confidence: Optional[float] = None
    status: Optional[str] = None
    
    # Pagination
    limit: int = Field(default=20, ge=1, le=100)
    offset: int = Field(default=0, ge=0)
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class RelationshipListResponse(BaseModel):
    """Response for relationship list operations"""
    
    relationships: List[Relationship]
    total_count: int
    page_info: Dict[str, Any]
    search_time_ms: Optional[float] = None
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class RelationshipStats(BaseModel):
    """Statistics about relationships in the system"""
    
    total_relationships: int
    relationships_by_type: Dict[str, int]
    relationships_by_status: Dict[str, int]
    average_strength: float
    average_confidence: float
    verified_count: int
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class RelationshipOperationResponse(BaseModel):
    """Response for relationship operation requests"""
    
    success: bool
    operation: str
    relationship_id: Optional[str] = None
    message: Optional[str] = None
    data: Optional[Dict[str, Any]] = None
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }