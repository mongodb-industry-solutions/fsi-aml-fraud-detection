"""
Pydantic models for faceted search functionality
"""

from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from models.entity_enhanced import EntityBasicEnhanced


class FacetBucket(BaseModel):
    """Individual facet bucket with count"""
    id: str = Field(description="Facet value", alias="_id")
    count: int = Field(description="Number of entities with this facet value")
    
    class Config:
        populate_by_name = True


class FacetCounts(BaseModel):
    """Facet counts for all filterable fields"""
    entityType: List[FacetBucket] = Field(default=[], description="Entity type facets")
    riskLevel: List[FacetBucket] = Field(default=[], description="Risk level facets")
    status: List[FacetBucket] = Field(default=[], description="Status facets")
    country: List[FacetBucket] = Field(default=[], description="Country facets")
    businessType: List[FacetBucket] = Field(default=[], description="Business type facets")
    scenarioKey: List[FacetBucket] = Field(default=[], description="Scenario key facets")
    riskScoreRange: List[FacetBucket] = Field(default=[], description="Risk score range facets")


class FacetedSearchRequest(BaseModel):
    """Request model for faceted search"""
    search_query: Optional[str] = Field(None, description="Text search query for entity names")
    entity_type: Optional[str] = Field(None, description="Filter by entity type")
    risk_level: Optional[str] = Field(None, description="Filter by risk level")
    status: Optional[str] = Field(None, description="Filter by entity status")
    scenario_key: Optional[str] = Field(None, description="Filter by demo scenario key")
    country: Optional[str] = Field(None, description="Filter by country")
    business_type: Optional[str] = Field(None, description="Filter by business type")
    risk_score_min: Optional[float] = Field(None, ge=0, le=100, description="Minimum risk score")
    risk_score_max: Optional[float] = Field(None, ge=0, le=100, description="Maximum risk score")
    skip: int = Field(0, ge=0, description="Number of entities to skip for pagination")
    limit: int = Field(20, ge=1, le=100, description="Number of entities to return")


class FacetedSearchResponse(BaseModel):
    """Response model for faceted search"""
    entities: List[EntityBasicEnhanced] = Field(description="List of entities matching the search criteria")
    facets: FacetCounts = Field(description="Facet counts for all filterable fields")
    total_count: int = Field(description="Total number of entities matching the search criteria")
    page: int = Field(description="Current page number")
    limit: int = Field(description="Number of entities per page")
    has_next: bool = Field(description="Whether there are more pages")
    has_previous: bool = Field(description="Whether there are previous pages")


class AutocompleteRequest(BaseModel):
    """Request model for autocomplete"""
    query: str = Field(min_length=2, max_length=100, description="Search query for autocomplete")
    limit: int = Field(10, ge=1, le=20, description="Number of suggestions to return")


class AutocompleteSuggestion(BaseModel):
    """Individual autocomplete suggestion"""
    entityId: str = Field(description="Entity ID")
    entityType: str = Field(description="Entity type")
    name_full: str = Field(description="Full entity name")
    risk_level: Optional[str] = Field(None, description="Risk level")
    highlights: List[Dict[str, Any]] = Field(default=[], description="Search highlights")
    score: float = Field(description="Search relevance score")


class AutocompleteResponse(BaseModel):
    """Response model for autocomplete"""
    suggestions: List[AutocompleteSuggestion] = Field(description="List of autocomplete suggestions")
    query: str = Field(description="Original search query")
    total_suggestions: int = Field(description="Number of suggestions returned")


class RiskScoreDistribution(BaseModel):
    """Risk score distribution statistics"""
    min_score: float = Field(description="Minimum risk score in the dataset")
    max_score: float = Field(description="Maximum risk score in the dataset")
    avg_score: float = Field(description="Average risk score")
    count: int = Field(description="Total number of entities with risk scores")


class FilterOptions(BaseModel):
    """Available filter options with counts"""
    entity_types: List[FacetBucket] = Field(description="Available entity types")
    risk_levels: List[FacetBucket] = Field(description="Available risk levels")
    statuses: List[FacetBucket] = Field(description="Available entity statuses")
    countries: List[FacetBucket] = Field(description="Available countries (top 10)")
    business_types: List[FacetBucket] = Field(description="Available business types")
    scenario_keys: List[FacetBucket] = Field(description="Available scenario keys (top 20)")
    risk_score_distribution: RiskScoreDistribution = Field(description="Risk score distribution")


class FacetedSearchStats(BaseModel):
    """Statistics about the faceted search capabilities"""
    total_entities: int = Field(description="Total number of entities")
    search_index: str = Field(description="Atlas Search index name")
    facet_fields: List[str] = Field(description="Available facet fields")
    autocomplete_fields: List[str] = Field(description="Available autocomplete fields")
    risk_score_distribution: RiskScoreDistribution = Field(description="Risk score distribution")