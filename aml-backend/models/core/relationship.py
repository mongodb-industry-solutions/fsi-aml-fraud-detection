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
    """Network relationship types based on the relationships collection schema"""
    
    # Entity resolution relationships
    CONFIRMED_SAME_ENTITY = "confirmed_same_entity"
    POTENTIAL_DUPLICATE = "potential_duplicate"
    
    # Corporate structure relationships
    DIRECTOR_OF = "director_of"
    UBO_OF = "ubo_of"
    PARENT_OF_SUBSIDIARY = "parent_of_subsidiary"
    SHAREHOLDER_OF = "shareholder_of"
    
    # Household and personal relationships
    HOUSEHOLD_MEMBER = "household_member"
    
    # High-risk network relationships
    BUSINESS_ASSOCIATE_SUSPECTED = "business_associate_suspected"
    POTENTIAL_BENEFICIAL_OWNER_OF = "potential_beneficial_owner_of"
    TRANSACTIONAL_COUNTERPARTY_HIGH_RISK = "transactional_counterparty_high_risk"
    
    # Public/social relationships
    PROFESSIONAL_COLLEAGUE_PUBLIC = "professional_colleague_public"
    SOCIAL_MEDIA_CONNECTION_PUBLIC = "social_media_connection_public"


class RelationshipDirection(str, Enum):
    """Direction of the relationship"""
    
    BIDIRECTIONAL = "bidirectional"
    UNIDIRECTIONAL = "unidirectional"
    REVERSE = "reverse"


class RelationshipStatus(str, Enum):
    """Status of the relationship"""
    
    ACTIVE = "active"
    INACTIVE = "inactive"
    UNDER_REVIEW = "under_review"
    DISPUTED = "disputed"
    ARCHIVED = "archived"


class RelationshipEvidence(BaseModel):
    """Evidence supporting a relationship based on network plan schema"""
    
    type: str  # "attribute_match", "company_registry_simulated", etc.
    description: str
    source: str  # Source of the evidence
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class EntityReference(BaseModel):
    """Reference to an entity in a network relationship"""
    
    entityId: str
    entityType: str  # "individual" or "organization"
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class NetworkRelationship(BaseModel):
    """Network relationship model matching the relationships collection schema"""
    
    relationshipId: str  # "REL" + random characters
    source: EntityReference
    target: EntityReference
    type: RelationshipType
    
    # Relationship properties
    direction: RelationshipDirection = RelationshipDirection.BIDIRECTIONAL
    strength: float = Field(ge=0.0, le=1.0)
    confidence: float = Field(ge=0.0, le=1.0)
    
    # Status flags
    active: bool = True
    verified: bool = False
    
    # Evidence and data lineage
    evidence: List[RelationshipEvidence] = Field(default_factory=list)
    datasource: str
    
    # Temporal validity (optional)
    validFrom: Optional[datetime] = None
    validTo: Optional[datetime] = None
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class NetworkRelationshipSummary(BaseModel):
    """Summary view of a network relationship"""
    
    relationshipId: str
    type: RelationshipType
    source: EntityReference
    target: EntityReference
    strength: float
    confidence: float
    active: bool
    verified: bool
    evidence_count: int
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class EntityNetwork(BaseModel):
    """Network graph for an entity using $graphLookup results"""
    
    center_entity_id: str
    relationships: List[NetworkRelationship]
    total_relationships: int
    relationship_types: List[RelationshipType]
    
    # Network statistics
    average_strength: float = 0.0
    average_confidence: float = 0.0
    verified_count: int = 0
    max_depth_reached: int = 1
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }