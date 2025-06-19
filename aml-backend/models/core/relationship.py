"""
Core Relationship Models - Domain models for entity relationships

Core domain models representing relationships between entities including
relationship types, evidence, and relationship lifecycle management.
"""

from datetime import datetime
from typing import Dict, List, Optional, Any
from enum import Enum
from pydantic import BaseModel, Field


class RelationshipType(str, Enum):
    """Enumeration of relationship types"""
    
    # Family relationships
    FAMILY_MEMBER = "family_member"
    SPOUSE = "spouse"
    PARENT = "parent"
    CHILD = "child"
    SIBLING = "sibling"
    
    # Business relationships
    BUSINESS_PARTNER = "business_partner"
    EMPLOYER = "employer"
    EMPLOYEE = "employee"
    DIRECTOR = "director"
    SHAREHOLDER = "shareholder"
    
    # Financial relationships
    BENEFICIAL_OWNER = "beneficial_owner"
    ACCOUNT_HOLDER = "account_holder"
    SIGNATORY = "signatory"
    GUARANTOR = "guarantor"
    
    # Address relationships
    SHARED_ADDRESS = "shared_address"
    PREVIOUS_ADDRESS = "previous_address"
    
    # Contact relationships
    SHARED_CONTACT = "shared_contact"
    AUTHORIZED_REPRESENTATIVE = "authorized_representative"
    
    # Generic relationships
    ASSOCIATED_WITH = "associated_with"
    RELATED_TO = "related_to"
    UNKNOWN = "unknown"


class RelationshipDirection(str, Enum):
    """Direction of the relationship"""
    
    BIDIRECTIONAL = "bidirectional"
    DIRECTED = "directed"


class RelationshipStatus(str, Enum):
    """Status of the relationship"""
    
    ACTIVE = "active"
    INACTIVE = "inactive"
    UNDER_REVIEW = "under_review"
    DISPUTED = "disputed"
    ARCHIVED = "archived"


class RelationshipEvidence(BaseModel):
    """Evidence supporting a relationship"""
    
    evidence_type: str
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


class EntityReference(BaseModel):
    """Reference to an entity in a relationship"""
    
    entityId: str
    entityType: str
    name: Optional[str] = None
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class Relationship(BaseModel):
    """Core relationship model"""
    
    relationshipId: str
    source: EntityReference
    target: EntityReference
    type: str
    
    # Relationship attributes
    direction: RelationshipDirection = RelationshipDirection.BIDIRECTIONAL
    strength: float = Field(ge=0.0, le=1.0, default=0.5)
    confidence: float = Field(ge=0.0, le=1.0, default=0.5)
    
    # Status and lifecycle
    active: bool = True
    verified: bool = False
    created_date: datetime = Field(default_factory=datetime.utcnow)
    updated_date: datetime = Field(default_factory=datetime.utcnow)
    
    # Evidence and verification
    evidence: List[RelationshipEvidence] = Field(default_factory=list)
    
    # Data lineage
    datasource: Optional[str] = None
    
    # Additional metadata
    description: Optional[str] = None
    notes: Optional[str] = None
    tags: List[str] = Field(default_factory=list)
    risk_impact: Optional[float] = None
    compliance_flags: List[str] = Field(default_factory=list)
    created_by: Optional[str] = None
    updated_by: Optional[str] = None
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class RelationshipSummary(BaseModel):
    """Summary view of a relationship"""
    
    relationshipId: str
    type: str
    source: EntityReference
    target: EntityReference
    strength: float
    confidence: float
    active: bool
    verified: bool
    evidence_count: int = 0
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class RelationshipNetwork(BaseModel):
    """Network of relationships for an entity"""
    
    center_entity_id: str
    relationships: List[Relationship]
    total_relationships: int
    relationship_types: List[RelationshipType]
    
    # Network statistics
    average_strength: float = 0.0
    average_confidence: float = 0.0
    verified_count: int = 0
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }