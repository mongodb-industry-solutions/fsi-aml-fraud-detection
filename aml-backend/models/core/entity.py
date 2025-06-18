"""
Core Entity Models - Clean, focused domain models

Consolidated from entity.py and entity_enhanced.py, keeping only essential functionality
and removing complexity while maintaining all required features.
"""

from datetime import datetime
from enum import Enum
from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field, validator


# ==================== ENUMS ====================

class EntityType(str, Enum):
    """Entity classification"""
    INDIVIDUAL = "individual"
    ORGANIZATION = "organization"


class EntityStatus(str, Enum):
    """Entity lifecycle status"""
    ACTIVE = "active"
    INACTIVE = "inactive" 
    ARCHIVED = "archived"
    UNDER_REVIEW = "under_review"


class RiskLevel(str, Enum):
    """Risk classification levels"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high" 
    CRITICAL = "critical"


class WatchlistType(str, Enum):
    """Types of watchlist matches"""
    SANCTIONS = "sanctions"
    PEP = "pep"
    ADVERSE_MEDIA = "adverse_media"
    INTERNAL = "internal"


# ==================== CORE MODELS ====================

class ContactInfo(BaseModel):
    """Simplified contact information"""
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None
    
    @validator('email')
    def validate_email(cls, v):
        if v and '@' not in v:
            raise ValueError('Invalid email format')
        return v


class WatchlistMatch(BaseModel):
    """Watchlist screening result"""
    match_type: WatchlistType
    match_score: float = Field(..., ge=0, le=1)
    match_details: str
    source: str
    date_identified: datetime = Field(default_factory=datetime.utcnow)


class RiskAssessment(BaseModel):
    """Simplified risk assessment"""
    overall_score: float = Field(..., ge=0, le=1)
    level: RiskLevel
    
    # Risk factors
    geographic_risk: Optional[float] = Field(None, ge=0, le=1)
    industry_risk: Optional[float] = Field(None, ge=0, le=1) 
    transaction_risk: Optional[float] = Field(None, ge=0, le=1)
    
    # Assessment metadata
    assessed_date: datetime = Field(default_factory=datetime.utcnow)
    assessed_by: Optional[str] = None
    reasoning: Optional[str] = None


class Entity(BaseModel):
    """Core entity model - consolidated and simplified"""
    
    # Core identification
    id: Optional[str] = Field(None, alias="_id")
    name: str = Field(..., min_length=1, max_length=500)
    entity_type: EntityType
    status: EntityStatus = EntityStatus.ACTIVE
    
    # Alternative names for matching
    alternate_names: List[str] = Field(default_factory=list)
    
    # Unique identifiers for exact matching
    identifiers: Dict[str, str] = Field(default_factory=dict)
    
    # Contact and location information
    contact: Optional[ContactInfo] = None
    nationality: Optional[str] = None
    
    # Risk and compliance
    risk_assessment: Optional[RiskAssessment] = None
    watchlist_matches: List[WatchlistMatch] = Field(default_factory=list)
    
    # Entity relationships (for graph operations)
    connected_entities: List[str] = Field(default_factory=list)
    
    # Additional structured data
    attributes: Dict[str, Any] = Field(default_factory=dict)
    
    # System metadata
    created_date: datetime = Field(default_factory=datetime.utcnow)
    updated_date: Optional[datetime] = None
    created_by: Optional[str] = None
    last_reviewed: Optional[datetime] = None
    
    # Search and matching fields (populated by system)
    phonetic_codes: Optional[Dict[str, str]] = None
    embedding: Optional[List[float]] = None
    
    class Config:
        populate_by_name = True
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }
    
    @validator('alternate_names')
    def clean_alternate_names(cls, v):
        """Remove empty and duplicate alternate names"""
        if not v:
            return []
        cleaned = [name.strip() for name in v if name and name.strip()]
        return list(dict.fromkeys(cleaned))  # Remove duplicates while preserving order
    
    @validator('identifiers')
    def clean_identifiers(cls, v):
        """Remove empty identifier values"""
        if not v:
            return {}
        return {k: v_id for k, v_id in v.items() if v_id and str(v_id).strip()}
    
    @property
    def risk_level(self) -> RiskLevel:
        """Convenience property for risk level"""
        if self.risk_assessment:
            return self.risk_assessment.level
        return RiskLevel.LOW
    
    @property
    def risk_score(self) -> float:
        """Convenience property for risk score"""
        if self.risk_assessment:
            return self.risk_assessment.overall_score
        return 0.0
    
    @property
    def has_watchlist_matches(self) -> bool:
        """Check if entity has any watchlist matches"""
        return bool(self.watchlist_matches)
    
    @property
    def high_risk(self) -> bool:
        """Quick check for high-risk entities"""
        return self.risk_level in [RiskLevel.HIGH, RiskLevel.CRITICAL]
    
    def add_identifier(self, id_type: str, id_value: str) -> None:
        """Helper method to add identifier"""
        if id_type and id_value:
            self.identifiers[id_type] = str(id_value).strip()
    
    def add_alternate_name(self, name: str) -> None:
        """Helper method to add alternate name"""
        if name and name.strip() and name.strip() not in self.alternate_names:
            self.alternate_names.append(name.strip())
    
    def update_risk_assessment(self, score: float, level: RiskLevel, reasoning: str = None) -> None:
        """Helper method to update risk assessment"""
        self.risk_assessment = RiskAssessment(
            overall_score=score,
            level=level,
            reasoning=reasoning
        )
        self.updated_date = datetime.utcnow()


# ==================== SPECIALIZED MODELS ====================

class EntitySummary(BaseModel):
    """Lightweight entity summary for list views"""
    id: str = Field(..., alias="_id")
    name: str
    entity_type: EntityType
    status: EntityStatus
    risk_level: RiskLevel
    risk_score: float
    has_watchlist_matches: bool
    created_date: datetime
    
    class Config:
        populate_by_name = True


class EntityDetail(BaseModel):
    """Detailed entity view including relationships"""
    entity: Entity
    relationship_count: int = 0
    recent_activity: List[Dict[str, Any]] = Field(default_factory=list)
    compliance_status: Optional[str] = None
    
    class Config:
        populate_by_name = True


# ==================== VALIDATION HELPERS ====================

def validate_entity_data(data: Dict[str, Any]) -> Dict[str, Any]:
    """Validate and clean entity data before processing"""
    
    # Required fields check
    if not data.get("name"):
        raise ValueError("Entity name is required")
    
    if not data.get("entity_type"):
        raise ValueError("Entity type is required")
    
    # Validate entity type
    if data["entity_type"] not in [e.value for e in EntityType]:
        raise ValueError(f"Invalid entity type. Must be one of: {[e.value for e in EntityType]}")
    
    # Clean and normalize data
    data["name"] = data["name"].strip()
    
    # Clean alternate names
    if "alternate_names" in data:
        data["alternate_names"] = [
            name.strip() for name in data["alternate_names"]
            if name and name.strip()
        ]
    
    # Clean identifiers
    if "identifiers" in data:
        data["identifiers"] = {
            k: str(v).strip() for k, v in data["identifiers"].items()
            if v and str(v).strip()
        }
    
    return data


# ==================== BACKWARDS COMPATIBILITY ====================

# Aliases for existing code that imports from old models
EntityBasic = Entity
EntityEnhanced = Entity
OverallRisk = RiskAssessment  # Legacy name mapping