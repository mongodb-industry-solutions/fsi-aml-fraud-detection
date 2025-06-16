from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
import logging
import math

from models.entity_enhanced import EntityBasicEnhanced, EntityEnhanced, EntitiesListEnhancedResponse, ErrorResponse
from models.faceted_search import (
    FacetedSearchRequest, FacetedSearchResponse, AutocompleteRequest, AutocompleteResponse,
    FilterOptions, FacetedSearchStats, FacetCounts, FacetBucket, RiskScoreDistribution
)
from services.faceted_search import AtlasSearchService
from dependencies import (
    get_db_dependency,
    DB_NAME,
    ENTITIES_COLLECTION,
    DEFAULT_PAGE_SIZE,
    MAX_PAGE_SIZE,
    ATLAS_SEARCH_INDEX
)
from db.mongo_db import MongoDBAccess

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/entities",
    tags=["Entities"],
    responses={
        404: {"model": ErrorResponse, "description": "Entity not found"},
        500: {"model": ErrorResponse, "description": "Internal server error"}
    }
)

def transform_entity_to_basic(entity_doc: dict) -> EntityBasicEnhanced:
    """Transform MongoDB entity document to EntityBasicEnhanced model"""
    try:
        # Handle nested field access safely
        name_full = entity_doc.get("name", {}).get("full", "")
        risk_score = entity_doc.get("riskAssessment", {}).get("overall", {}).get("score", 0)
        risk_level = entity_doc.get("riskAssessment", {}).get("overall", {}).get("level", "unknown")
        watchlist_matches_count = len(entity_doc.get("watchlistMatches", []))
        resolution_status = entity_doc.get("resolution", {}).get("status", None)
        
        return EntityBasicEnhanced(
            entityId=entity_doc.get("entityId", ""),
            scenarioKey=entity_doc.get("scenarioKey"),
            entityType=entity_doc.get("entityType", ""),
            status=entity_doc.get("status", "active"),
            name_full=name_full,
            risk_score=risk_score,
            risk_level=risk_level,
            watchlist_matches_count=watchlist_matches_count,
            resolution_status=resolution_status
        )
    except Exception as e:
        logger.error(f"Error transforming entity to basic enhanced model: {e}")
        logger.error(f"Entity document keys: {list(entity_doc.keys()) if entity_doc else 'None'}")
        raise HTTPException(status_code=500, detail="Error processing entity data")

def transform_entity_to_detail(entity_doc: dict) -> EntityEnhanced:
    """Transform MongoDB entity document to EntityEnhanced model"""
    try:
        # Create a clean copy and remove MongoDB _id field
        clean_doc = {k: v for k, v in entity_doc.items() if k != "_id"}
        
        # Convert to EntityEnhanced using Pydantic's parsing
        return EntityEnhanced(**clean_doc)
    except Exception as e:
        logger.error(f"Error transforming entity to enhanced detail model: {e}")
        logger.error(f"Entity document keys: {list(entity_doc.keys()) if entity_doc else 'None'}")
        # Log specific validation errors if it's a Pydantic error
        if hasattr(e, 'errors'):
            logger.error(f"Validation errors: {e.errors()}")
        raise HTTPException(status_code=500, detail=f"Error processing entity data: {str(e)}")

@router.get("/", response_model=EntitiesListEnhancedResponse)
async def get_entities(
    skip: int = Query(0, ge=0, description="Number of entities to skip"),
    limit: int = Query(DEFAULT_PAGE_SIZE, ge=1, le=MAX_PAGE_SIZE, description="Number of entities to return"),
    entity_type: Optional[str] = Query(None, description="Filter by entity type (individual, organization)"),
    risk_level: Optional[str] = Query(None, description="Filter by risk level (low, medium, high)"),
    scenario_key: Optional[str] = Query(None, description="Filter by demo scenario key"),
    status: Optional[str] = Query(None, description="Filter by entity status (active, inactive, under_review, restricted)"),
    db: MongoDBAccess = Depends(get_db_dependency)
):
    """
    Retrieve a list of all entities from the 'entities' collection.
    
    Returns a paginated list of EntityBasic models with metadata.
    """
    try:
        logger.info(f"Fetching entities with skip={skip}, limit={limit}, entity_type={entity_type}, risk_level={risk_level}")
        
        # Build filter criteria
        filter_dict = {}
        if entity_type:
            filter_dict["entityType"] = entity_type
        if risk_level:
            filter_dict["riskAssessment.overall.level"] = risk_level
        if scenario_key:
            filter_dict["scenarioKey"] = scenario_key
        if status:
            filter_dict["status"] = status
        
        # Get paginated entities
        entities_docs, total_count = db.find_entities_paginated(
            db_name=DB_NAME,
            collection_name=ENTITIES_COLLECTION,
            skip=skip,
            limit=limit,
            filter_dict=filter_dict
        )
        
        logger.info(f"Found {len(entities_docs)} entities out of {total_count} total")
        
        # Transform to EntityBasic models
        entities = [transform_entity_to_basic(doc) for doc in entities_docs]
        
        # Calculate pagination metadata
        current_page = (skip // limit) + 1
        total_pages = math.ceil(total_count / limit) if total_count > 0 else 1
        has_next = (skip + limit) < total_count
        has_previous = skip > 0
        
        # Get available scenario keys for filtering
        scenario_keys_docs = db.get_distinct_values(
            db_name=DB_NAME,
            collection_name=ENTITIES_COLLECTION,
            field="scenarioKey",
            filter_dict={}
        )
        scenario_keys = [sk for sk in scenario_keys_docs if sk is not None]
        
        return EntitiesListEnhancedResponse(
            entities=entities,
            total_count=total_count,
            page=current_page,
            limit=limit,
            has_next=has_next,
            has_previous=has_previous,
            scenario_keys=scenario_keys
        )
        
    except Exception as e:
        logger.error(f"Error fetching entities: {e}")
        raise HTTPException(status_code=500, detail="Internal server error while fetching entities")

@router.get("/{entity_id}", response_model=EntityEnhanced)
async def get_entity_by_id(
    entity_id: str,
    db: MongoDBAccess = Depends(get_db_dependency)
):
    """
    Retrieve a single entity by its entityId from the 'entities' collection.
    
    Returns an EntityEnhanced model with all entity information.
    """
    try:
        logger.info(f"Fetching entity with ID: {entity_id}")
        
        # Find entity by ID
        entity_doc = db.find_entity_by_id(
            db_name=DB_NAME,
            collection_name=ENTITIES_COLLECTION,
            entity_id=entity_id
        )
        
        if entity_doc is None:
            logger.warning(f"Entity not found with ID: {entity_id}")
            raise HTTPException(
                status_code=404, 
                detail=f"Entity with ID '{entity_id}' not found"
            )
        
        logger.info(f"Found entity: {entity_id}")
        
        # Transform to EntityDetail model
        entity = transform_entity_to_detail(entity_doc)
        
        return entity
        
    except HTTPException:
        # Re-raise HTTP exceptions as-is
        raise
    except Exception as e:
        logger.error(f"Error fetching entity {entity_id}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error while fetching entity")


# ================================
# ATLAS SEARCH FACETED ENDPOINTS
# ================================

async def get_atlas_search_service(db: MongoDBAccess = Depends(get_db_dependency)) -> AtlasSearchService:
    """Get Atlas Search service instance"""
    from motor.motor_asyncio import AsyncIOMotorClient
    
    # Create async motor client for Atlas Search operations
    motor_client = AsyncIOMotorClient(db.uri)
    motor_collection = motor_client[DB_NAME][ENTITIES_COLLECTION]
    
    return AtlasSearchService(motor_collection, ATLAS_SEARCH_INDEX)


@router.post("/search/faceted", response_model=FacetedSearchResponse)
async def faceted_entity_search(
    request: FacetedSearchRequest,
    atlas_search: AtlasSearchService = Depends(get_atlas_search_service)
):
    """
    Perform faceted search with all supported filters and get facet counts
    
    This endpoint uses Atlas Search with faceting capabilities to provide:
    - Full-text search on entity names
    - Faceted filtering with counts for all filter options
    - Risk score range filtering
    - Geographic and business type filtering
    """
    try:
        logger.info(f"Faceted search request: {request.dict()}")
        
        # Perform the faceted search
        search_result = await atlas_search.faceted_entity_search(
            search_query=request.search_query,
            entity_type=request.entity_type,
            risk_level=request.risk_level,
            status=request.status,
            scenario_key=request.scenario_key,
            country=request.country,
            business_type=request.business_type,
            risk_score_min=request.risk_score_min,
            risk_score_max=request.risk_score_max,
            skip=request.skip,
            limit=request.limit
        )
        
        # Transform entities to basic enhanced models
        entities = []
        for entity_doc in search_result["entities"]:
            try:
                entity = transform_entity_to_basic(entity_doc)
                entities.append(entity)
            except Exception as e:
                logger.warning(f"Error transforming entity {entity_doc.get('entityId', 'unknown')}: {e}")
                continue
        
        # Transform facets to response model
        facets_data = search_result.get("facets", {})
        facets = FacetCounts(
            entityType=[FacetBucket(id=bucket["_id"], count=bucket["count"]) 
                       for bucket in facets_data.get("entityType", [])],
            riskLevel=[FacetBucket(id=bucket["_id"], count=bucket["count"]) 
                      for bucket in facets_data.get("riskLevel", [])],
            status=[FacetBucket(id=bucket["_id"], count=bucket["count"]) 
                   for bucket in facets_data.get("status", [])],
            country=[FacetBucket(id=bucket["_id"], count=bucket["count"]) 
                    for bucket in facets_data.get("country", [])],
            businessType=[FacetBucket(id=bucket["_id"], count=bucket["count"]) 
                         for bucket in facets_data.get("businessType", [])],
            scenarioKey=[FacetBucket(id=bucket["_id"], count=bucket["count"]) 
                        for bucket in facets_data.get("scenarioKey", [])],
            riskScoreRange=[FacetBucket(id=str(bucket["_id"]), count=bucket["count"]) 
                           for bucket in facets_data.get("riskScoreRange", [])]
        )
        
        # Calculate page number
        current_page = (request.skip // request.limit) + 1
        
        return FacetedSearchResponse(
            entities=entities,
            facets=facets,
            total_count=search_result["total_count"],
            page=current_page,
            limit=request.limit,
            has_next=search_result["has_next"],
            has_previous=search_result["has_previous"]
        )
        
    except Exception as e:
        logger.error(f"Error in faceted search: {e}")
        raise HTTPException(status_code=500, detail="Internal server error during faceted search")


@router.post("/search/autocomplete", response_model=AutocompleteResponse)
async def autocomplete_entity_names(
    request: AutocompleteRequest,
    atlas_search: AtlasSearchService = Depends(get_atlas_search_service)
):
    """
    Get autocomplete suggestions for entity names using Atlas Search
    
    This endpoint provides real-time autocomplete suggestions as the user types,
    with search highlighting and relevance scoring.
    """
    try:
        logger.info(f"Autocomplete request: query='{request.query}', limit={request.limit}")
        
        # Get autocomplete suggestions
        suggestions_data = await atlas_search.autocomplete_entity_names(
            query=request.query,
            limit=request.limit
        )
        
        # Transform to response model
        suggestions = []
        for suggestion in suggestions_data:
            name_full = suggestion.get("name", {}).get("full", "")
            risk_level = suggestion.get("riskAssessment", {}).get("overall", {}).get("level")
            
            suggestions.append({
                "entityId": suggestion.get("entityId", ""),
                "entityType": suggestion.get("entityType", ""),
                "name_full": name_full,
                "risk_level": risk_level,
                "highlights": suggestion.get("highlights", []),
                "score": suggestion.get("score", 0.0)
            })
        
        return AutocompleteResponse(
            suggestions=suggestions,
            query=request.query,
            total_suggestions=len(suggestions)
        )
        
    except Exception as e:
        logger.error(f"Error in autocomplete: {e}")
        raise HTTPException(status_code=500, detail="Internal server error during autocomplete")


@router.get("/search/filters", response_model=FilterOptions)
async def get_filter_options(
    atlas_search: AtlasSearchService = Depends(get_atlas_search_service)
):
    """
    Get available filter options with counts for the frontend
    
    This endpoint returns all available filter values and their counts,
    used to populate filter dropdowns in the frontend.
    """
    try:
        logger.info("Getting filter options")
        
        # Get facets for all available filters (no search query)
        search_result = await atlas_search.faceted_entity_search(
            skip=0,
            limit=1  # We only need facets, not entities
        )
        
        # Get risk score distribution
        risk_distribution = await atlas_search.get_risk_score_distribution()
        
        facets_data = search_result.get("facets", {})
        
        return FilterOptions(
            entity_types=[FacetBucket(id=bucket["_id"], count=bucket["count"]) 
                         for bucket in facets_data.get("entityType", [])],
            risk_levels=[FacetBucket(id=bucket["_id"], count=bucket["count"]) 
                        for bucket in facets_data.get("riskLevel", [])],
            statuses=[FacetBucket(id=bucket["_id"], count=bucket["count"]) 
                     for bucket in facets_data.get("status", [])],
            countries=[FacetBucket(id=bucket["_id"], count=bucket["count"]) 
                      for bucket in facets_data.get("country", [])],
            business_types=[FacetBucket(id=bucket["_id"], count=bucket["count"]) 
                           for bucket in facets_data.get("businessType", [])],
            scenario_keys=[FacetBucket(id=bucket["_id"], count=bucket["count"]) 
                          for bucket in facets_data.get("scenarioKey", [])],
            risk_score_distribution=RiskScoreDistribution(**risk_distribution)
        )
        
    except Exception as e:
        logger.error(f"Error getting filter options: {e}")
        raise HTTPException(status_code=500, detail="Internal server error getting filter options")


@router.get("/search/stats", response_model=FacetedSearchStats)
async def get_search_stats(
    atlas_search: AtlasSearchService = Depends(get_atlas_search_service)
):
    """
    Get statistics about the faceted search capabilities
    
    This endpoint provides metadata about the search index and capabilities.
    """
    try:
        logger.info("Getting search statistics")
        
        # Get basic entity count
        db = atlas_search.collection.database
        total_entities = await db[ENTITIES_COLLECTION].count_documents({})
        
        # Get risk score distribution
        risk_distribution = await atlas_search.get_risk_score_distribution()
        
        return FacetedSearchStats(
            total_entities=total_entities,
            search_index=atlas_search.search_index,
            facet_fields=[
                "entityType", "riskLevel", "status", "country", 
                "businessType", "scenarioKey", "riskScoreRange"
            ],
            autocomplete_fields=["name.full"],
            risk_score_distribution=RiskScoreDistribution(**risk_distribution)
        )
        
    except Exception as e:
        logger.error(f"Error getting search stats: {e}")
        raise HTTPException(status_code=500, detail="Internal server error getting search stats")