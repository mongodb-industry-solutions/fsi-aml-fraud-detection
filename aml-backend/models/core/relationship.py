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
    """Enumeration of relationship types aligned with synthetic data model"""
    
    # Entity Resolution Types (High Risk - Identity)
    SAME_ENTITY = "confirmed_same_entity"
    CONFIRMED_SAME_ENTITY = "confirmed_same_entity"
    POTENTIAL_DUPLICATE = "potential_duplicate"
    
    # Corporate Structure Types (Medium-High Risk - Ownership/Control)
    DIRECTOR_OF = "director_of"
    UBO_OF = "ubo_of"
    PARENT_OF_SUBSIDIARY = "parent_of_subsidiary"
    CORPORATE_STRUCTURE = "corporate_structure"
    BOARD_MEMBER_OF = "board_member_of"
    SUBSIDIARY_OF = "subsidiary_of"
    
    # Business Relationships
    SUPPLIER_OF = "supplier_of"
    JOINT_VENTURE_PARTNER = "joint_venture_partner"
    CUSTOMER_OF = "customer_of"
    VENDOR_FOR = "vendor_for"
    COMPETITOR_OF = "competitor_of"
    PARTNER_WITH = "partner_with"
    BUSINESS_PARTNER = "business_partner"
    AFFILIATED_WITH = "affiliated_with"
    
    # Professional Services
    LEGAL_ADVISOR_FOR = "legal_advisor_for"
    ACCOUNTANT_FOR = "accountant_for"
    WEALTH_MANAGER_FOR = "wealth_manager_for"
    TRUSTEE_FOR = "trustee_for"
    PROFESSIONAL_SERVICE_PROVIDER = "professional_service_provider"
    LEGAL_REPRESENTATIVE = "legal_representative"
    INVESTMENT_ADVISOR = "investment_advisor"
    
    # Employment
    EMPLOYED_BY = "employed_by"
    CONSULTANT_FOR = "consultant_for"
    EMPLOYER = "employer"
    EMPLOYEE = "employee"
    
    # Household & Family Types (Low-Medium Risk)
    HOUSEHOLD_MEMBER = "household_member"
    FAMILY_MEMBER = "family_member"
    FAMILY_MEMBER_PARENT = "family_member_parent"
    FAMILY_MEMBER_SIBLING = "family_member_sibling"
    FAMILY_MEMBER_CHILD = "family_member_child"
    FAMILY_MEMBER_IN_LAW = "family_member_in_law"
    
    # Professional/Social Networks
    PROFESSIONAL_COLLEAGUE = "professional_colleague"
    PROFESSIONAL_COLLEAGUE_PUBLIC = "professional_colleague_public"
    FORMER_ASSOCIATE = "former_associate"
    REFERRAL_SOURCE = "referral_source"
    MENTOR_MENTEE = "mentor_mentee"
    ALUMNI_CONNECTION = "alumni_connection"
    INDUSTRY_CONTACT = "industry_contact"
    BUSINESS_REFERRAL = "business_referral"
    PAST_BUSINESS_PARTNER = "past_business_partner"
    SOCIAL_MEDIA_CONNECTION_PUBLIC = "social_media_connection_public"
    
    # High-Risk Network Types (High Risk - Suspicious Associations)
    BUSINESS_ASSOCIATE_SUSPECTED = "business_associate_suspected"
    FINANCIAL_BENEFICIARY_SUSPECTED = "financial_beneficiary_suspected"
    PROXY_RELATIONSHIP_SUSPECTED = "proxy_relationship_suspected"
    KNOWN_ASSOCIATE_UNVERIFIED = "known_associate_unverified"
    POTENTIAL_BENEFICIAL_OWNER_OF = "potential_beneficial_owner_of"
    TRANSACTIONAL_COUNTERPARTY_HIGH_RISK = "transactional_counterparty_high_risk"
    EMERGING_BUSINESS_ASSOCIATE = "emerging_business_associate"
    FINANCIAL_LINK_SUSPECTED = "financial_link_suspected"
    
    # Ownership/Investment
    SHAREHOLDER_MINORITY_PRIVATE_CO = "shareholder_minority_private_co"
    DIRECTOR_OF_SMALL_ENTITY = "director_of_small_entity"
    SHAREHOLDER = "shareholder"
    DIRECTOR = "director"
    BENEFICIAL_OWNER = "beneficial_owner"
    
    # Financial Relationships
    LOAN_PROVIDER_FOR = "loan_provider_for"
    ACCOUNT_HOLDER = "account_holder"
    SIGNATORY = "signatory"
    GUARANTOR = "guarantor"
    
    # Network Distance
    PERIPHERAL_CONNECTION = "peripheral_connection"
    DISTANT_CONNECTION = "distant_connection"
    
    # Legacy/Backward Compatibility Types
    BUSINESS_ASSOCIATE = "business_associate"
    SHARED_ADDRESS = "shared_address"
    SHARED_IDENTIFIER = "shared_identifier"
    TRANSACTION_COUNTERPARTY = "transaction_counterparty"
    
    # Additional Address Relationships
    PREVIOUS_ADDRESS = "previous_address"
    
    # Additional Contact Relationships
    SHARED_CONTACT = "shared_contact"
    AUTHORIZED_REPRESENTATIVE = "authorized_representative"
    
    # Generic Relationships
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