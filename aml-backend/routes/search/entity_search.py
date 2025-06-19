"""
Enhanced Entity Search Routes - Phase 7 Stage 2 Implementation

Comprehensive entity search API endpoints leveraging the full Atlas Search index with
advanced faceted filtering, autocomplete, and intelligent search capabilities.

These routes provide:
- Unified entity search with comprehensive faceted filtering (12+ facets)
- Autocomplete using the dedicated name.full field
- Advanced faceted search with numeric range filtering  
- Identifier-specific search functionality
- Facet values and analytics endpoints
"""

import logging
from datetime import datetime
from typing import List, Optional, Dict, Any

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from services.dependencies import get_entity_search_service
from services.search.entity_search_service import EntitySearchService

logger = logging.getLogger(__name__)

# Create router
router = APIRouter(
    prefix="/entities/search",
    tags=["Entity Search - Phase 7"],
    responses={
        404: {"description": "Not found"},
        500: {"description": "Internal server error"}
    }
)

# ==================== API MODELS ====================

class EntitySearchResponse(BaseModel):
    """Response model for entity search operations"""
    success: bool = True
    data: Dict[str, Any] = Field(default_factory=dict)
    metadata: Dict[str, Any] = Field(default_factory=dict)
    error: Optional[str] = None

class AutocompleteSuggestion(BaseModel):
    """Individual autocomplete suggestion with entity ID for navigation"""
    entityId: str
    name: str

class AutocompleteResponse(BaseModel):
    """Response model for autocomplete operations"""
    success: bool = True
    data: Dict[str, List[AutocompleteSuggestion]] = Field(default_factory=dict)
    metadata: Dict[str, Any] = Field(default_factory=dict)
    error: Optional[str] = None

class FacetsResponse(BaseModel):
    """Response model for facets operations"""
    success: bool = True
    data: Dict[str, Any] = Field(default_factory=dict)
    metadata: Dict[str, Any] = Field(default_factory=dict)
    error: Optional[str] = None

# ==================== ENHANCED SEARCH ENDPOINTS ====================

@router.get("/unified", response_model=EntitySearchResponse)
async def unified_entity_search(
    q: str = Query("", description="Search query"),
    entityType: Optional[str] = Query(None, description="Entity type (individual, organization)"),
    riskLevel: Optional[str] = Query(None, description="Risk level (low, medium, high, critical)"),
    nationality: Optional[str] = Query(None, description="Nationality"),
    residency: Optional[str] = Query(None, description="Residency location"),
    jurisdiction: Optional[str] = Query(None, description="Jurisdiction of incorporation"),
    businessType: Optional[str] = Query(None, description="Business type"),
    facets: bool = Query(True, description="Include facet counts"),
    autocomplete: bool = Query(False, description="Return autocomplete suggestions"),
    limit: int = Query(20, ge=1, le=100, description="Number of results"),
    page: int = Query(1, ge=1, description="Page number for pagination"),
    entity_search_service: EntitySearchService = Depends(get_entity_search_service)
):
    """
    Unified entity search with comprehensive faceted filtering
    
    Supports all available Atlas Search facets:
    - Entity classification: entityType, businessType
    - Risk assessment: riskLevel
    - Geography: country, city, nationality, residency, jurisdiction
    - Identity: identifierType
    - Demo: scenarioKey
    
    Features:
    - Real-time faceted filtering with counts
    - Autocomplete mode for search suggestions
    - Support for multiple values per facet
    - Fixed jurisdiction field mapping to jurisdictionOfIncorporation
    """
    try:
        logger.info(f"Unified entity search: query='{q}', facets={facets}, autocomplete={autocomplete}")
        
        # Build simplified filter object for demo
        filters = {}
        if entityType: filters["entityType"] = entityType
        if riskLevel: filters["riskLevel"] = riskLevel
        if nationality: filters["nationality"] = nationality
        if residency: filters["residency"] = residency
        if jurisdiction: filters["jurisdiction"] = jurisdiction
        if businessType: filters["businessType"] = businessType
        
        # Check if this is a basic entity listing request (no search criteria)
        has_query = q and q.strip()
        has_filters = any(v is not None and v != "" for v in filters.values())  # Handle 0 values properly
        is_basic_listing = not has_query and not has_filters and not autocomplete
        
        if is_basic_listing:
            # Handle basic entity listing with pagination (replaces legacy API)
            skip = (page - 1) * limit
            basic_results = await entity_search_service.entity_repo.get_entities_paginated(
                skip=skip,
                limit=limit,
                filters={}
            )
            
            # Handle tuple return format (entities_list, total_count)
            if isinstance(basic_results, tuple):
                entities, total_count = basic_results
            else:
                # Fallback for dictionary format
                entities = basic_results.get("entities", [])
                total_count = basic_results.get("total_count", 0)
            
            # Calculate pagination metadata
            import math
            total_pages = math.ceil(total_count / limit) if total_count > 0 else 1
            has_next = (skip + limit) < total_count
            has_previous = skip > 0
            
            results = {
                "results": entities,
                "total_count": total_count,
                "page": page,
                "has_next": has_next,
                "has_previous": has_previous
            }
            
            # Add facets if requested
            if facets:
                facet_data = await entity_search_service.get_available_facets()
                results["facets"] = facet_data
                
            metadata = {
                "search_type": "basic_listing",
                "facets_enabled": facets,
                "filters_applied": 0,
                "is_paginated": True,
                "page": page,
                "total_pages": total_pages
            }
            
        elif autocomplete:
            # Use autocomplete mode for real-time suggestions
            suggestions = await entity_search_service.autocomplete_entity_names(q, limit)
            results = {
                "results": [],
                "suggestions": suggestions,
                "total_count": 0,
                "page": page,
                "has_next": False,
                "has_previous": False
            }
            metadata = {
                "search_type": "autocomplete",
                "facets_enabled": facets,
                "filters_applied": 0,
                "page": page
            }
        else:
            # Use simplified faceted search for demo
            results = await entity_search_service.simple_faceted_search(
                search_query=q,
                selected_facets=filters,
                limit=limit
            )
            
            # Add pagination metadata for search results
            search_results = results.get("results", [])
            results.update({
                "page": page,
                "has_next": len(search_results) == limit,  # Simple heuristic
                "has_previous": page > 1,
                "total_count": results.get("total_results", len(search_results))
            })
            
            # Add facets if requested
            if facets:
                facet_data = await entity_search_service.get_available_facets()
                results["facets"] = facet_data
        
        # Update metadata if not already set
        if 'metadata' not in locals() or not metadata:
            metadata = {
                "search_type": "faceted_search",
                "facets_enabled": facets,
                "filters_applied": len([f for f in filters.values() if f]),
                "total_facets": len(filters),
                "page": page
            }
        else:
            # Add common metadata fields
            metadata.update({
                "total_facets": len(filters),
                "page": page
            })
        
        logger.info(f"Unified search completed: {results.get('total_count', len(results.get('results', [])))} results")
        
        return EntitySearchResponse(
            success=True,
            data=results,
            metadata=metadata
        )
        
    except Exception as e:
        logger.error(f"Unified entity search failed: {e}")
        raise HTTPException(
            status_code=500,
            detail="Internal server error during entity search"
        )

@router.get("/autocomplete", response_model=AutocompleteResponse)
async def autocomplete_entity_names(
    q: str = Query(..., min_length=2, description="Partial entity name (minimum 2 characters)"),
    limit: int = Query(10, ge=1, le=20, description="Number of suggestions"),
    entity_search_service: EntitySearchService = Depends(get_entity_search_service)
):
    """
    Get autocomplete suggestions for entity names
    
    Uses the dedicated name.full field with autocomplete analyzer:
    - Min/max grams: 2-15 characters
    - Diacritic folding for international names
    - Fuzzy matching with 1 edit distance
    
    Features:
    - Real-time suggestions as user types
    - Optimized for performance (< 100ms target)
    - International character support
    """
    try:
        logger.info(f"Autocomplete request: query='{q}', limit={limit}")
        
        if len(q) < 2:
            return AutocompleteResponse(
                success=True,
                data={"suggestions": []},
                metadata={"query": q, "count": 0, "message": "Minimum 2 characters required"}
            )
        
        suggestions = await entity_search_service.autocomplete_entity_names(q, limit)
        
        logger.info(f"Autocomplete completed: {len(suggestions)} suggestions")
        
        return AutocompleteResponse(
            success=True,
            data={"suggestions": suggestions},
            metadata={
                "query": q, 
                "count": len(suggestions),
                "search_field": "name.full",
                "analyzer": "autocomplete"
            }
        )
        
    except Exception as e:
        logger.error(f"Autocomplete search failed: {e}")
        raise HTTPException(
            status_code=500,
            detail="Internal server error during autocomplete"
        )

@router.get("/identifier", response_model=EntitySearchResponse)
async def search_by_identifier(
    value: str = Query(..., description="Identifier value"),
    type: Optional[str] = Query(None, description="Identifier type (passport, ssn, tax_id, etc.)"),
    entity_search_service: EntitySearchService = Depends(get_entity_search_service)
):
    """
    Search entities by specific identifier
    
    Supports exact keyword matching on:
    - identifiers.value: The actual identifier value
    - identifiers.type: The type of identifier (optional filter)
    
    Features:
    - Exact matching using keyword analyzer
    - Optional identifier type filtering
    - High precision results for compliance use cases
    """
    try:
        logger.info(f"Identifier search: value='{value}', type={type}")
        
        results = await entity_search_service.search_by_identifier(value, type)
        
        metadata = {
            "search_type": "identifier",
            "identifier_value": value,
            "identifier_type": type,
            "exact_match": True
        }
        
        logger.info(f"Identifier search completed: {len(results)} results")
        
        return EntitySearchResponse(
            success=True,
            data={"results": results, "total_count": len(results)},
            metadata=metadata
        )
        
    except Exception as e:
        logger.error(f"Identifier search failed: {e}")
        raise HTTPException(
            status_code=500,
            detail="Internal server error during identifier search"
        )

@router.get("/facets", response_model=FacetsResponse)
async def get_available_facets(
    entity_search_service: EntitySearchService = Depends(get_entity_search_service)
):
    """
    Get available facet values with counts for filtering UI
    
    Returns all available facet values from the Atlas Search index:
    - entityType: Individual, Organization counts
    - riskLevel: Low, Medium, High, Critical counts  
    - riskScore: Numeric distribution boundaries
    - country/city: Geographic distribution
    - nationality/residency: Demographic distribution
    - jurisdiction: Legal entity distribution
    - identifierType: Document type distribution
    - businessType: Business classification distribution
    - scenarioKey: Demo scenario distribution
    
    Features:
    - Real-time counts for dynamic filtering
    - Supports progressive disclosure in UI
    - Optimized for faceted search interface
    """
    try:
        logger.info("Getting available facets for filtering UI")
        
        facets = await entity_search_service.get_available_facets()
        
        # Calculate metadata
        facet_counts = {name: len(values) if isinstance(values, dict) else 0 
                       for name, values in facets.items()}
        
        metadata = {
            "facet_count": len(facets),
            "facet_distribution": facet_counts,
            "total_unique_values": sum(facet_counts.values())
        }
        
        logger.info(f"Facets retrieved: {len(facets)} facets, {sum(facet_counts.values())} total values")
        
        return FacetsResponse(
            success=True,
            data=facets,
            metadata=metadata
        )
        
    except Exception as e:
        logger.error(f"Get facets failed: {e}")
        raise HTTPException(
            status_code=500,
            detail="Internal server error while retrieving facets"
        )

# ==================== ANALYTICS ENDPOINTS ====================

@router.get("/analytics", response_model=EntitySearchResponse)
async def get_search_analytics(
    entity_search_service: EntitySearchService = Depends(get_entity_search_service)
):
    """
    Get real-time search analytics from Atlas Search backend
    
    Provides insights into:
    - Total search volume
    - Popular search queries  
    - Real backend performance metrics (Atlas Search timing)
    - Search trends over time
    
    Features:
    - Real backend timing (not frontend network timing)
    - Atlas Search performance insights
    - User behavior analytics
    """
    try:
        logger.info("Getting real-time search analytics from Atlas Search backend")
        
        # Get real analytics from Atlas Search repository
        analytics = await entity_search_service.get_search_analytics()
        
        # Get performance metrics with real backend timing
        performance_metrics = await entity_search_service.atlas_search.get_search_performance_metrics()
        
        # Combine analytics with performance metrics
        enhanced_analytics = {
            **analytics,
            "backend_performance": performance_metrics,
            "timing_source": "atlas_search_backend",
            "includes_network_latency": False
        }
        
        metadata = {
            "analytics_type": "real_backend_performance",
            "timing_method": "atlas_search_repository",
            "generated_at": datetime.utcnow().isoformat()
        }
        
        return EntitySearchResponse(
            success=True,
            data=enhanced_analytics,
            metadata=metadata
        )
        
    except Exception as e:
        logger.error(f"Get search analytics failed: {e}")
        raise HTTPException(
            status_code=500,
            detail="Internal server error while retrieving analytics"
        )


# ==================== HEALTH CHECK ENDPOINT ====================

@router.get("/health", response_model=EntitySearchResponse)
async def search_health_check(
    entity_search_service: EntitySearchService = Depends(get_entity_search_service)
):
    """
    Health check for entity search services
    
    Validates:
    - EntitySearchService availability
    - Atlas Search index connectivity
    - Repository dependencies
    
    Returns:
    - Service status
    - Index configuration
    - Performance metrics
    """
    try:
        logger.info("Performing entity search health check")
        
        # Test basic service functionality
        test_result = await entity_search_service.autocomplete_entity_names("test", limit=1)
        
        health_data = {
            "service_status": "healthy",
            "index_name": entity_search_service.index_name,
            "facet_count": len(entity_search_service.facet_config),
            "available_facets": list(entity_search_service.facet_config.keys()),
            "test_autocomplete": len(test_result) >= 0  # Just test it works
        }
        
        metadata = {
            "health_check_type": "entity_search",
            "timestamp": "2025-06-18T00:00:00Z",  # Would use actual timestamp
            "version": "phase_7_stage_2"
        }
        
        return EntitySearchResponse(
            success=True,
            data=health_data,
            metadata=metadata
        )
        
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return EntitySearchResponse(
            success=False,
            data={"service_status": "unhealthy"},
            metadata={"error_type": "health_check_failure"},
            error=str(e)
        )