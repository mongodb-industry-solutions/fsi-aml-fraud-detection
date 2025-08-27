"""
Relationship Models - Data models for entity relationships

Models for managing relationships between entities, including
relationship evidence, confidence scoring, and lifecycle management.
"""

from datetime import datetime
from typing import Dict, List, Optional, Any, Literal
from enum import Enum
from pydantic import BaseModel, Field


# Import RelationshipType from core for consistency
from .core.relationship import RelationshipType, RelationshipDirection, RelationshipStatus


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


class EntityReferenceSimple(BaseModel):
    """Simple reference to an entity in a relationship"""
    
    entityId: str
    entityType: str
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class Relationship(BaseModel):
    """Relationship between two entities"""
    
    relationshipId: str
    source: EntityReferenceSimple
    target: EntityReferenceSimple
    type: str
    
    # Relationship attributes
    direction: Literal["bidirectional", "directed"] = "bidirectional"
    strength: float = Field(ge=0.0, le=1.0)
    confidence: float = Field(ge=0.0, le=1.0)
    
    # Status and lifecycle
    active: bool = True
    verified: bool = False
    created_date: datetime = Field(default_factory=datetime.utcnow)
    updated_date: datetime = Field(default_factory=datetime.utcnow)
    
    # Evidence and verification
    evidence: List[RelationshipEvidence] = []
    
    # Data lineage
    datasource: Optional[str] = None
    
    # Analysis metadata
    risk_impact: Optional[float] = None
    network_importance: Optional[float] = None
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class RelationshipRequest(BaseModel):
    """Request for creating or updating relationships"""
    
    source: EntityReferenceSimple
    target: EntityReferenceSimple
    type: str
    
    # Relationship attributes
    direction: Optional[Literal["bidirectional", "directed"]] = "bidirectional"
    strength: Optional[float] = None
    confidence: Optional[float] = None
    
    # Initial evidence
    evidence: Optional[List[RelationshipEvidence]] = None
    
    # Data lineage
    datasource: Optional[str] = None
    notes: Optional[str] = None
    
    class Config:
        json_schema_extra = {
            "example": {
                "source": {"entityId": "ENT123456", "entityType": "individual"},
                "target": {"entityId": "ENT789012", "entityType": "individual"},
                "type": "family_member",
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
    
    relationshipId: str
    analysis_type: str
    analysis_results: Dict[str, Any]
    confidence: float
    
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
    entityId: Optional[str] = None
    entityIds: Optional[List[str]] = None
    
    # Relationship filtering
    types: Optional[List[str]] = None
    min_strength: Optional[float] = None
    min_confidence: Optional[float] = None
    active: Optional[bool] = None
    verified: Optional[bool] = None
    direction: Optional[Literal["bidirectional", "directed"]] = None
    datasource: Optional[str] = None
    
    # Pagination
    limit: int = Field(default=20, ge=1, le=100)
    offset: int = Field(default=0, ge=0)
    
    # Sorting
    sort_by: Optional[str] = "strength"
    sort_order: Optional[Literal["asc", "desc"]] = "desc"
    
    class Config:
        json_schema_extra = {
            "example": {
                "entityId": "ENT123456",
                "types": ["family_member", "business_partner"],
                "min_confidence": 0.7,
                "active": True,
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
                        "source": {"entityId": "ENT123456", "entityType": "individual"},
                        "target": {"entityId": "ENT789012", "entityType": "individual"},
                        "type": "family_member",
                        "direction": "bidirectional",
                        "strength": 0.8,
                        "confidence": 0.9
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
    
    source: EntityReferenceSimple
    target: EntityReferenceSimple
    type: str
    
    # Optional attributes
    direction: Optional[Literal["bidirectional", "directed"]] = "bidirectional"
    strength: Optional[float] = None
    confidence: Optional[float] = None
    evidence: Optional[List[RelationshipEvidence]] = None
    datasource: Optional[str] = None
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class UpdateRelationshipRequest(BaseModel):
    """Request for updating an existing relationship"""
    
    # Updatable fields
    type: Optional[str] = None
    direction: Optional[Literal["bidirectional", "directed"]] = None
    strength: Optional[float] = None
    confidence: Optional[float] = None
    active: Optional[bool] = None
    verified: Optional[bool] = None
    evidence: Optional[List[RelationshipEvidence]] = None
    datasource: Optional[str] = None
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class RelationshipQueryParams(BaseModel):
    """Query parameters for relationship operations"""
    
    # Entity filtering
    entityId: Optional[str] = None
    entityIds: Optional[List[str]] = None
    
    # Relationship filtering
    types: Optional[List[str]] = None
    min_strength: Optional[float] = None
    min_confidence: Optional[float] = None
    active: Optional[bool] = None
    verified: Optional[bool] = None
    direction: Optional[Literal["bidirectional", "directed"]] = None
    datasource: Optional[str] = None
    
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
    relationships_by_direction: Dict[str, int]
    active_relationships: int
    inactive_relationships: int
    average_strength: float
    average_confidence: float
    verified_count: int
    relationships_by_datasource: Dict[str, int]
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class RelationshipOperationResponse(BaseModel):
    """Response for relationship operation requests"""
    
    success: bool
    operation: str
    relationshipId: Optional[str] = None
    message: Optional[str] = None
    data: Optional[Dict[str, Any]] = None
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }