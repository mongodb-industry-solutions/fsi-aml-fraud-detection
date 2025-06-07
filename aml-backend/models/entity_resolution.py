"""
Pydantic models for entity resolution and onboarding workflows
"""

from typing import List, Optional, Union, Dict, Any
from datetime import datetime, date
from pydantic import BaseModel, Field, validator
from enum import Enum

class ResolutionStatus(str, Enum):
    """Entity resolution status options"""
    UNRESOLVED = "unresolved"
    RESOLVED = "resolved"
    PENDING = "pending"

class ResolutionDecision(str, Enum):
    """Resolution decision options"""
    CONFIRMED_MATCH = "confirmed_match"
    NOT_A_MATCH = "not_a_match"
    NEEDS_REVIEW = "needs_review"

# Redefined here to avoid circular imports
class RelationshipType(str, Enum):
    """Types of relationships between entities"""
    CONFIRMED_SAME_ENTITY = "confirmed_same_entity"
    POTENTIAL_DUPLICATE = "potential_duplicate"
    BUSINESS_ASSOCIATE = "business_associate"
    FAMILY_MEMBER = "family_member"
    SHARED_ADDRESS = "shared_address"
    SHARED_IDENTIFIER = "shared_identifier"

class RelationshipDirection(str, Enum):
    """Relationship direction options"""
    BIDIRECTIONAL = "bidirectional"
    SOURCE_TO_TARGET = "source_to_target"
    TARGET_TO_SOURCE = "target_to_source"

class NewOnboardingInput(BaseModel):
    """Input model for new customer onboarding"""
    name_full: str = Field(..., description="Full name of the customer")
    date_of_birth: Optional[str] = Field(None, description="Date of birth in YYYY-MM-DD format")
    address_full: Optional[str] = Field(None, description="Full address string")
    identifier_value: Optional[str] = Field(None, description="Primary identifier (SSN, passport, etc.)")
    
    @validator('date_of_birth')
    def validate_date_format(cls, v):
        if v is not None:
            try:
                datetime.strptime(v, '%Y-%m-%d')
            except ValueError:
                raise ValueError('Date of birth must be in YYYY-MM-DD format')
        return v

class PotentialMatch(BaseModel):
    """Model for potential entity matches from search results"""
    entityId: str = Field(..., description="Entity identifier")
    name_full: Optional[str] = Field(None, description="Full name of the entity")
    dateOfBirth: Optional[str] = Field(None, description="Date of birth")
    primaryAddress_full: Optional[str] = Field(None, description="Primary address full string")
    riskAssessment_overall_score: Optional[float] = Field(None, description="Overall risk score")
    searchScore: float = Field(..., description="Atlas Search score")
    matchReasons: List[str] = Field(default_factory=list, description="Reasons for match (similar_name, shared_address, etc.)")
    entityType: Optional[str] = Field(None, description="Type of entity (individual, organization)")
    
    class Config:
        allow_population_by_field_name = True
        schema_extra = {
            "example": {
                "entityId": "C123456",
                "name_full": "John Smith",
                "dateOfBirth": "1978-04-15",
                "primaryAddress_full": "123 Main St, New York, NY",
                "riskAssessment_overall_score": 68.5,
                "searchScore": 0.87,
                "matchReasons": ["similar_name", "shared_address"],
                "entityType": "individual"
            }
        }

class ResolutionDecisionInput(BaseModel):
    """Input model for entity resolution decisions"""
    sourceEntityId: str = Field(..., description="ID of the source entity (new or existing)")
    targetMasterEntityId: str = Field(..., description="ID of the target master entity")
    decision: ResolutionDecision = Field(..., description="Resolution decision")
    matchConfidence: float = Field(..., ge=0.0, le=1.0, description="Confidence score for the match")
    matchedAttributes: List[str] = Field(..., description="List of matched attributes (name, address, identifier, etc.)")
    resolvedBy: Optional[str] = Field(None, description="User/system identifier who made the resolution")
    notes: Optional[str] = Field(None, description="Additional notes about the resolution")

class EntityResolution(BaseModel):
    """Model for entity resolution information"""
    status: ResolutionStatus = Field(default=ResolutionStatus.UNRESOLVED)
    masterEntityId: Optional[str] = Field(None, description="ID of the master entity if resolved")
    confidence: Optional[float] = Field(None, ge=0.0, le=1.0, description="Resolution confidence")
    resolvedBy: Optional[str] = Field(None, description="User/system who resolved")
    resolvedAt: Optional[datetime] = Field(None, description="Resolution timestamp")
    linkedEntities: List[str] = Field(default_factory=list, description="List of linked entity IDs")

# Relationship models are defined in models/relationship.py to avoid duplication

class FindMatchesResponse(BaseModel):
    """Response model for find matches endpoint"""
    input: NewOnboardingInput = Field(..., description="Original input data")
    matches: List[PotentialMatch] = Field(..., description="List of potential matches")
    totalMatches: int = Field(..., description="Total number of matches found")
    searchMetadata: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Search metadata")

class ResolutionResponse(BaseModel):
    """Response model for entity resolution endpoint"""
    success: bool = Field(..., description="Whether the resolution was successful")
    message: str = Field(..., description="Status message")
    sourceEntityId: str = Field(..., description="Source entity ID")
    targetMasterEntityId: str = Field(..., description="Target master entity ID")
    decision: ResolutionDecision = Field(..., description="Resolution decision made")
    relationshipId: Optional[str] = Field(None, description="ID of created relationship if applicable")
    updatedEntities: List[str] = Field(default_factory=list, description="List of updated entity IDs")

# Atlas Search Query Models

class FuzzyOptions(BaseModel):
    """Options for fuzzy matching in Atlas Search"""
    maxEdits: int = Field(default=2, ge=1, le=2, description="Maximum edit distance")
    prefixLength: int = Field(default=0, ge=0, description="Number of characters at start that must match exactly")
    maxExpansions: int = Field(default=50, ge=1, description="Maximum number of variations to generate")

class CompoundQuery(BaseModel):
    """Atlas Search compound query structure"""
    must: List[Dict[str, Any]] = Field(default_factory=list)
    should: List[Dict[str, Any]] = Field(default_factory=list)
    mustNot: List[Dict[str, Any]] = Field(default_factory=list)
    filter: List[Dict[str, Any]] = Field(default_factory=list)

class SearchQueryBuilder(BaseModel):
    """Helper class for building Atlas Search queries"""
    index: str = Field(default="entity_resolution_search")
    compound: CompoundQuery = Field(default_factory=CompoundQuery)
    limit: int = Field(default=10, ge=1, le=100)
    date_match_stage: Optional[Dict[str, Any]] = Field(default=None)
    
    def add_name_search(self, name: str, boost: float = 3.0):
        """Add fuzzy name search to the query"""
        name_query = {
            "text": {
                "query": name,
                "path": ["name.full", "name.aliases"],
                "fuzzy": FuzzyOptions().dict(),
                "score": {"boost": {"value": boost}}
            }
        }
        self.compound.should.append(name_query)
    
    def add_address_search(self, address: str, boost: float = 2.0):
        """Add fuzzy address search to the query"""
        address_query = {
            "text": {
                "query": address,
                "path": "addresses.full",
                "fuzzy": FuzzyOptions(maxEdits=1).dict(),
                "score": {"boost": {"value": boost}}
            }
        }
        self.compound.should.append(address_query)
    
    def add_identifier_search(self, identifier: str, boost: float = 5.0):
        """Add exact identifier search to the query"""
        identifier_query = {
            "equals": {
                "path": "identifiers.value",
                "value": identifier,
                "score": {"boost": {"value": boost}}
            }
        }
        self.compound.should.append(identifier_query)
    
    def add_date_filter(self, date_of_birth: str, years_tolerance: int = 2):
        """Add date of birth proximity filter as a separate $match stage"""
        try:
            birth_date = datetime.strptime(date_of_birth, '%Y-%m-%d')
            start_date = birth_date.replace(year=birth_date.year - years_tolerance)
            end_date = birth_date.replace(year=birth_date.year + years_tolerance)
            
            # Store as a separate $match stage instead of inside $search
            self.date_match_stage = {
                "$match": {
                    "dateOfBirth": {
                        "$gte": start_date.strftime('%Y-%m-%d'),
                        "$lte": end_date.strftime('%Y-%m-%d')
                    }
                }
            }
        except ValueError:
            # If date parsing fails, skip the filter
            pass
    
    def build_aggregation_pipeline(self):
        """Build the complete aggregation pipeline for Atlas Search"""
        search_stage = {
            "$search": {
                "index": self.index,
                "compound": self.compound.dict(exclude_none=True),
                "highlight": {
                    "path": ["name.full", "addresses.full"]
                }
            }
        }
        
        # Add metadata and scoring
        add_fields_stage = {
            "$addFields": {
                "searchScore": {"$meta": "searchScore"},
                "searchHighlights": {"$meta": "searchHighlights"}
            }
        }
        
        # Project fields needed for PotentialMatch
        project_stage = {
            "$project": {
                "entityId": 1,
                "name.full": 1,
                "dateOfBirth": 1,
                "entityType": 1,
                "addresses": 1,
                "riskAssessment.overall.score": 1,
                "searchScore": 1,
                "searchHighlights": 1,
                # Add computed field for primary address
                "primaryAddress": {
                    "$arrayElemAt": [
                        {"$filter": {
                            "input": "$addresses",
                            "as": "addr",
                            "cond": {"$eq": ["$$addr.primary", True]}
                        }},
                        0
                    ]
                }
            }
        }
        
        # Limit results
        limit_stage = {"$limit": self.limit}
        
        return [search_stage, add_fields_stage, project_stage, limit_stage]