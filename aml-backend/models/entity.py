from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime

# Basic models for nested structures
class Name(BaseModel):
    full: str
    structured: Optional[Dict[str, Any]] = None

class Address(BaseModel):
    type: Optional[str] = None
    address_line: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None
    postal_code: Optional[str] = None

class Identifier(BaseModel):
    type: str
    value: str
    country: Optional[str] = None

class OverallRisk(BaseModel):
    score: float = Field(..., ge=0.0, le=1.0, description="Risk score between 0 and 1")
    level: str = Field(..., description="Risk level (e.g., LOW, MEDIUM, HIGH)")

class RiskAssessment(BaseModel):
    overall: OverallRisk
    factors: Optional[Dict[str, Any]] = None
    last_updated: Optional[datetime] = None

class WatchlistMatch(BaseModel):
    list_name: str
    match_score: float
    matched_name: str
    match_details: Optional[Dict[str, Any]] = None

# Main entity models
class EntityBasic(BaseModel):
    """Simplified entity model for list display"""
    entityId: str = Field(..., description="Unique entity identifier")
    name_full: str = Field(..., alias="name.full", description="Full name of the entity")
    entityType: str = Field(..., description="Type of entity (INDIVIDUAL, ORGANIZATION, etc.)")
    risk_score: float = Field(..., alias="riskAssessment.overall.score", description="Overall risk score")
    risk_level: str = Field(..., alias="riskAssessment.overall.level", description="Overall risk level")

    class Config:
        validate_by_name = True
        populate_by_name = True

class EntityDetail(BaseModel):
    """Detailed entity model for full display"""
    entityId: str = Field(..., description="Unique entity identifier")
    entityType: str = Field(..., description="Type of entity")
    name: Name = Field(..., description="Entity name information")
    dateOfBirth: Optional[datetime] = Field(None, description="Date of birth (for individuals)")
    addresses: List[Address] = Field(default_factory=list, description="List of addresses")
    identifiers: List[Identifier] = Field(default_factory=list, description="List of identifiers")
    riskAssessment: RiskAssessment = Field(..., description="Risk assessment information")
    watchlistMatches: List[WatchlistMatch] = Field(default_factory=list, description="Watchlist matches")
    profileSummaryText: Optional[str] = Field(None, description="Profile summary text")
    profileEmbedding: Optional[List[float]] = Field(None, description="Profile embedding vector")
    
    # Additional metadata
    created_at: Optional[datetime] = Field(None, description="Entity creation timestamp")
    updated_at: Optional[datetime] = Field(None, description="Last update timestamp")

    class Config:
        validate_by_name = True
        populate_by_name = True

# Response models
class EntitiesListResponse(BaseModel):
    """Response model for entities list endpoint"""
    entities: List[EntityBasic]
    total_count: int
    page: int
    limit: int
    has_next: bool
    has_previous: bool

class ErrorResponse(BaseModel):
    """Error response model"""
    detail: str
    error_code: Optional[str] = None