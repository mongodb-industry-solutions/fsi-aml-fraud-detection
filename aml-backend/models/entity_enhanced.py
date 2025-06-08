"""
Enhanced Entity Models for AML/KYC System

Comprehensive Pydantic models supporting the full data structure
from the improved MongoDB synthetic data, including:
- Enhanced name structures with aliases and components
- Comprehensive address and contact information
- Entity resolution tracking
- Multi-component risk assessment
- Detailed watchlist matching
- Customer relationship data
- UBO information for organizations
"""

from pydantic import BaseModel, Field, validator
from typing import List, Optional, Dict, Any, Union
from datetime import datetime
from enum import Enum

# Enums for better type safety
class EntityTypeEnum(str, Enum):
    INDIVIDUAL = "individual"
    ORGANIZATION = "organization"

class EntityStatusEnum(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    UNDER_REVIEW = "under_review"
    RESTRICTED = "restricted"

class RiskLevelEnum(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"

class ResolutionStatusEnum(str, Enum):
    UNRESOLVED = "unresolved"
    RESOLVED = "resolved"
    UNDER_REVIEW = "under_review"

class WatchlistMatchStatusEnum(str, Enum):
    UNDER_REVIEW = "under_review"
    CONFIRMED_HIT = "confirmed_hit"
    FALSE_POSITIVE = "false_positive"

# Enhanced Name Structure
class NameStructured(BaseModel):
    """Structured name components"""
    first: Optional[str] = None
    middle: Optional[str] = None
    last: Optional[str] = None
    legalName: Optional[str] = None  # For organizations

class NameEnhanced(BaseModel):
    """Enhanced name structure with aliases and components"""
    full: str = Field(..., description="Full legal or common name")
    structured: Optional[NameStructured] = None
    aliases: List[str] = Field(default_factory=list, description="Known aliases or AKAs")
    nameComponents: List[str] = Field(default_factory=list, description="Lowercase tokens of the full name")

# Enhanced Address Structure
class AddressStructured(BaseModel):
    """Structured address components"""
    street: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    postalCode: Optional[str] = None
    country: Optional[str] = None

class AddressEnhanced(BaseModel):
    """Enhanced address with verification and coordinates"""
    type: Optional[str] = Field(None, description="Address type (residential, business, mailing, etc.)")
    primary: bool = Field(False, description="Is this the primary address")
    full: Optional[str] = Field(None, description="Full concatenated address string")
    structured: Optional[AddressStructured] = None
    coordinates: Optional[List[float]] = Field(None, description="[longitude, latitude] GeoJSON Point")
    validFrom: Optional[datetime] = Field(None, description="Date address became valid")
    validTo: Optional[datetime] = Field(None, description="Date address ceased to be valid")
    verified: Optional[bool] = None
    verificationMethod: Optional[str] = Field(None, description="Method used for verification")
    verificationDate: Optional[datetime] = None

# Contact Information
class ContactInfo(BaseModel):
    """Contact information with verification"""
    type: str = Field(..., description="Contact type (email, phone_mobile, phone_landline, etc.)")
    value: str = Field(..., description="Contact detail itself")
    primary: bool = Field(False, description="Is this the primary contact")
    verified: Optional[bool] = None
    verificationDate: Optional[datetime] = None

# Enhanced Identifier Structure
class IdentifierEnhanced(BaseModel):
    """Enhanced identifier with verification details"""
    type: str = Field(..., description="Identifier type (passport, ssn, national_id, etc.)")
    value: str = Field(..., description="The identifier value")
    country: Optional[str] = Field(None, description="Issuing country (ISO code)")
    issueDate: Optional[datetime] = None
    expiryDate: Optional[datetime] = None
    verified: Optional[bool] = None
    verificationMethod: Optional[str] = Field(None, description="Method used for verification")
    verificationDate: Optional[datetime] = None

# Entity Resolution
class LinkedEntity(BaseModel):
    """Linked entity information"""
    entityId: str
    linkType: Optional[str] = None
    confidence: Optional[float] = None
    matchedAttributes: List[str] = Field(default_factory=list)
    matchDate: Optional[datetime] = None
    decidedBy: Optional[str] = None
    decision: Optional[str] = None

class Resolution(BaseModel):
    """Entity resolution status and tracking"""
    status: ResolutionStatusEnum = Field(ResolutionStatusEnum.UNRESOLVED, description="Resolution workflow status")
    masterEntityId: Optional[str] = Field(None, description="Master entity ID if this is a duplicate")
    confidence: float = Field(0.0, ge=0.0, le=1.0, description="Confidence score if linked to master")
    linkedEntities: List[LinkedEntity] = Field(default_factory=list, description="List of linked entities")
    lastReviewDate: Optional[datetime] = None
    reviewedBy: Optional[str] = Field(None, description="Analyst ID or system")

# Enhanced Risk Assessment
class RiskFactor(BaseModel):
    """Individual risk factor"""
    type: str
    impact: float = Field(..., ge=0.0, le=100.0)
    description: str

class RiskComponent(BaseModel):
    """Risk component (identity, profile, activity, etc.)"""
    score: float = Field(..., ge=0.0, le=100.0)
    weight: float = Field(..., ge=0.0, le=1.0)
    factors: List[RiskFactor] = Field(default_factory=list)

class RiskHistory(BaseModel):
    """Risk score history entry"""
    date: datetime
    score: float = Field(..., ge=0.0, le=100.0)
    level: RiskLevelEnum
    changeTrigger: Optional[str] = None

class RiskMetadata(BaseModel):
    """Risk assessment metadata"""
    model: Optional[str] = None
    assessmentType: Optional[str] = None
    overrides: List[Dict[str, Any]] = Field(default_factory=list)

class RiskOverall(BaseModel):
    """Overall risk assessment"""
    score: float = Field(..., ge=0.0, le=100.0, description="Overall risk score")
    level: RiskLevelEnum = Field(..., description="Risk level classification")
    trend: Optional[str] = Field(None, description="Risk trend (stable, increasing, decreasing)")
    lastUpdated: Optional[datetime] = None
    nextScheduledReview: Optional[datetime] = None

class RiskAssessmentEnhanced(BaseModel):
    """Enhanced multi-component risk assessment"""
    overall: RiskOverall
    components: Dict[str, RiskComponent] = Field(default_factory=dict, description="Risk by category")
    history: List[RiskHistory] = Field(default_factory=list, description="Risk score evolution")
    metadata: Optional[RiskMetadata] = None

# Enhanced Watchlist Matches
class WatchlistMatchDetails(BaseModel):
    """Additional watchlist match details"""
    reason: Optional[str] = None
    role: Optional[str] = None  # For PEPs
    additional_info: Optional[Dict[str, Any]] = None

class WatchlistMatchEnhanced(BaseModel):
    """Enhanced watchlist match with detailed information"""
    listId: str = Field(..., description="Watchlist identifier")
    matchId: Optional[str] = Field(None, description="ID of the record from watchlist source")
    matchScore: float = Field(..., ge=0.0, le=1.0, description="Match confidence score")
    matchDate: Optional[datetime] = None
    status: WatchlistMatchStatusEnum = Field(WatchlistMatchStatusEnum.UNDER_REVIEW, description="Match status")
    details: Optional[WatchlistMatchDetails] = None

# Customer Information
class CustomerInfo(BaseModel):
    """Customer relationship and profile information"""
    customerSince: Optional[datetime] = None
    segments: List[str] = Field(default_factory=list, description="Customer segments")
    products: List[str] = Field(default_factory=list, description="Products held by customer")
    notes: Optional[str] = None
    
    # Individual-specific fields
    employmentStatus: Optional[str] = None
    occupation: Optional[str] = None
    employer: Optional[str] = None
    monthlyIncomeUSD: Optional[float] = None
    
    # Organization-specific fields
    industry: Optional[str] = None
    businessType: Optional[str] = None
    numberOfEmployees: Optional[int] = None
    annualRevenueUSD: Optional[float] = None

# UBO Information
class UBOIdentification(BaseModel):
    """UBO identification details"""
    type: str
    value: str

class UBOInfo(BaseModel):
    """Ultimate Beneficial Owner information"""
    name: str
    entityType: EntityTypeEnum = Field(..., description="Individual or corporate UBO")
    nationality: Optional[str] = Field(None, description="For individual UBOs")
    countryOfIncorporation: Optional[str] = Field(None, description="For corporate UBOs")
    percentageOwnership: Optional[float] = Field(None, ge=0.0, le=100.0)
    controlType: Optional[str] = Field(None, description="Type of control (direct_ownership, voting_rights, etc.)")
    identification: Optional[UBOIdentification] = None
    linkedEntityId: Optional[str] = Field(None, description="EntityId if UBO is also a full entity")

# Main Enhanced Entity Models
class EntityEnhanced(BaseModel):
    """Comprehensive enhanced entity model"""
    # Core identification
    entityId: str = Field(..., description="Unique entity identifier")
    scenarioKey: Optional[str] = Field(None, description="Demo scenario classification")
    entityType: EntityTypeEnum = Field(..., description="Individual or organization")
    status: EntityStatusEnum = Field(EntityStatusEnum.ACTIVE, description="Entity status")
    sourceSystem: Optional[str] = Field(None, description="Data source system")
    
    # Timestamps
    createdAt: Optional[datetime] = Field(None, alias="createdAt")
    updatedAt: Optional[datetime] = Field(None, alias="updatedAt")
    
    # Enhanced name information
    name: NameEnhanced = Field(..., description="Enhanced name structure")
    
    # Individual-specific fields
    dateOfBirth: Optional[str] = Field(None, description="Date of birth (YYYY-MM-DD format)")
    placeOfBirth: Optional[str] = None
    gender: Optional[str] = None
    nationality: List[str] = Field(default_factory=list, description="List of nationalities (ISO codes)")
    residency: Optional[str] = Field(None, description="Primary country of residence")
    
    # Organization-specific fields
    incorporationDate: Optional[str] = Field(None, description="Date of incorporation (YYYY-MM-DD format)")
    jurisdictionOfIncorporation: Optional[str] = Field(None, description="Country of incorporation")
    uboInfo: List[UBOInfo] = Field(default_factory=list, description="Ultimate Beneficial Owner information")
    
    # Enhanced contact and address information
    addresses: List[AddressEnhanced] = Field(default_factory=list, description="Enhanced address information")
    contactInfo: List[ContactInfo] = Field(default_factory=list, description="Contact information")
    identifiers: List[IdentifierEnhanced] = Field(default_factory=list, description="Enhanced identifiers")
    
    # Resolution and risk
    resolution: Optional[Resolution] = None
    riskAssessment: Optional[RiskAssessmentEnhanced] = None
    watchlistMatches: List[WatchlistMatchEnhanced] = Field(default_factory=list, description="Enhanced watchlist matches")
    
    # Customer relationship
    customerInfo: Optional[CustomerInfo] = None
    
    # AI/ML fields
    profileSummaryText: Optional[str] = Field(None, description="Profile summary for embeddings")
    profileEmbedding: Optional[List[float]] = Field(None, description="Vector embedding of profile")
    
    class Config:
        validate_by_name = True
        populate_by_name = True
        use_enum_values = True

# Simplified models for API responses
class EntityBasicEnhanced(BaseModel):
    """Enhanced basic entity model for list display"""
    entityId: str = Field(..., description="Unique entity identifier")
    scenarioKey: Optional[str] = None
    entityType: EntityTypeEnum = Field(..., description="Individual or organization")
    status: EntityStatusEnum = Field(..., description="Entity status")
    name_full: str = Field(..., description="Full name")
    risk_score: Optional[float] = Field(None, description="Overall risk score")
    risk_level: Optional[RiskLevelEnum] = Field(None, description="Risk level")
    watchlist_matches_count: int = Field(0, description="Number of watchlist matches")
    resolution_status: Optional[ResolutionStatusEnum] = None
    
    class Config:
        use_enum_values = True

# Response models
class EntitiesListEnhancedResponse(BaseModel):
    """Enhanced response model for entities list endpoint"""
    entities: List[EntityBasicEnhanced]
    total_count: int
    page: int
    limit: int
    has_next: bool
    has_previous: bool
    scenario_keys: List[str] = Field(default_factory=list, description="Available scenario keys for filtering")

# Error response model
class ErrorResponse(BaseModel):
    """Error response model"""
    detail: str
    error_code: Optional[str] = None

# Backward compatibility aliases
EntityDetail = EntityEnhanced  # Alias for backward compatibility
EntityBasic = EntityBasicEnhanced  # Alias for backward compatibility