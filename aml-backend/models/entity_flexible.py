from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any, Union
from datetime import datetime

# Flexible entity models that match the actual database structure
class EntityBasic(BaseModel):
    """Simplified entity model for list display"""
    entityId: str = Field(..., description="Unique entity identifier")
    name_full: str = Field(..., description="Full name of the entity")
    entityType: str = Field(..., description="Type of entity")
    risk_score: Union[int, float] = Field(..., description="Overall risk score")
    risk_level: str = Field(..., description="Overall risk level")

    class Config:
        validate_by_name = True
        populate_by_name = True

class EntityDetail(BaseModel):
    """Detailed entity model for full display - flexible structure"""
    entityId: str = Field(..., description="Unique entity identifier")
    entityType: str = Field(..., description="Type of entity")
    status: Optional[str] = Field(None, description="Entity status")
    sourceSystem: Optional[str] = Field(None, description="Source system")
    scenarioKey: Optional[str] = Field(None, description="Scenario key")
    name: Dict[str, Any] = Field(..., description="Entity name information")
    dateOfBirth: Optional[str] = Field(None, description="Date of birth")
    placeOfBirth: Optional[str] = Field(None, description="Place of birth")
    gender: Optional[str] = Field(None, description="Gender")
    nationality: Optional[List[str]] = Field(None, description="Nationality")
    residency: Optional[str] = Field(None, description="Residency")
    addresses: List[Dict[str, Any]] = Field(default_factory=list, description="Addresses")
    contactInfo: List[Dict[str, Any]] = Field(default_factory=list, description="Contact info")
    identifiers: List[Dict[str, Any]] = Field(default_factory=list, description="Identifiers")
    riskAssessment: Dict[str, Any] = Field(..., description="Risk assessment")
    watchlistMatches: List[Dict[str, Any]] = Field(default_factory=list, description="Watchlist matches")
    customerInfo: Optional[Dict[str, Any]] = Field(None, description="Customer information")
    resolution: Optional[Dict[str, Any]] = Field(None, description="Resolution information")
    profileSummaryText: Optional[str] = Field(None, description="Profile summary")
    profileEmbedding: Optional[List[float]] = Field(None, description="Profile embedding")
    createdAt: Optional[Union[str, datetime]] = Field(None, description="Creation timestamp")
    updatedAt: Optional[Union[str, datetime]] = Field(None, description="Update timestamp")

    class Config:
        validate_by_name = True
        populate_by_name = True
        extra = "allow"  # Allow additional fields

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