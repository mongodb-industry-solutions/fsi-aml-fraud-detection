"""
Core Entity Routes - Entity CRUD operations using new service architecture

Refactored entity routes using:
- New consolidated models from models.core and models.api
- Repository pattern through service dependency injection
- Clean separation of concerns with focused responsibilities
"""

import logging
import math
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query

from models.api.requests import EntitySearchRequest
from models.api.responses import EntityDetailedResponse, ErrorResponse
from models.api.entity_list import EntityListResponse, create_entity_list_response
from models.core.entity import Entity
from services.dependencies import get_entity_repository

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/entities",
    tags=["Core Entities"],
    responses={
        404: {"model": ErrorResponse, "description": "Entity not found"},
        500: {"model": ErrorResponse, "description": "Internal server error"}
    }
)

# Configuration constants
DEFAULT_PAGE_SIZE = 20
MAX_PAGE_SIZE = 100


def get_entity_repository_dependency():
    """Dependency wrapper for entity repository"""
    return get_entity_repository()


@router.get("/", response_model=EntityListResponse)
async def get_entities(
    skip: int = Query(0, ge=0, description="Number of entities to skip"),
    limit: int = Query(DEFAULT_PAGE_SIZE, ge=1, le=MAX_PAGE_SIZE, description="Number of entities to return"),
    entity_type: Optional[str] = Query(None, description="Filter by entity type (individual, organization)"),
    risk_level: Optional[str] = Query(None, description="Filter by risk level (low, medium, high, critical)"),
    status: Optional[str] = Query(None, description="Filter by entity status (active, inactive, archived)"),
    entity_repo = Depends(get_entity_repository_dependency)
):
    """
    Retrieve a paginated list of entities with filtering support
    
    Uses the new EntityRepository through dependency injection for clean data access.
    Supports filtering by entity type, risk level, and status with comprehensive pagination.
    
    Returns:
        EntitiesListResponse: Paginated entity list with metadata
    """
    try:
        logger.info(f"Fetching entities with skip={skip}, limit={limit}, filters: type={entity_type}, risk={risk_level}, status={status}")
        
        # Build filter criteria
        filters = {}
        if entity_type:
            filters["entity_type"] = entity_type
        if risk_level:
            filters["risk_level"] = risk_level  
        if status:
            filters["status"] = status
        
        # Get paginated entities through repository
        entities, total_count = await entity_repo.get_entities_paginated(
            skip=skip,
            limit=limit,
            filters=filters
        )
        
        logger.info(f"Retrieved {len(entities)} entities out of {total_count} total")
        
        # Calculate pagination metadata
        current_page = (skip // limit) + 1
        total_pages = math.ceil(total_count / limit) if total_count > 0 else 1
        has_next = (skip + limit) < total_count
        has_previous = skip > 0
        
        # Get available filter values for frontend
        available_filters = await entity_repo.get_available_filter_values()
        
        # Use the helper function to create proper response
        return create_entity_list_response(
            entities=entities,
            total_count=total_count,
            page=current_page,
            limit=limit,
            offset=skip,
            available_filters=available_filters
        )
        
    except Exception as e:
        logger.error(f"Error fetching entities: {e}")
        raise HTTPException(
            status_code=500, 
            detail="Internal server error while fetching entities"
        )


@router.get("/{entity_id}", response_model=EntityDetailedResponse)
async def get_entity_by_id(
    entity_id: str,
    entity_repo = Depends(get_entity_repository_dependency)
):
    """
    Retrieve a single entity by its entity ID
    
    Uses the new EntityRepository for clean data access with comprehensive entity details.
    
    Args:
        entity_id: Unique entity identifier
        
    Returns:
        EntityDetailResponse: Complete entity information
    """
    try:
        logger.info(f"Fetching entity with ID: {entity_id}")
        
        # Get entity through repository
        entity = await entity_repo.find_by_entity_id(entity_id)
        
        if not entity:
            logger.warning(f"Entity not found with ID: {entity_id}")
            raise HTTPException(
                status_code=404,
                detail=f"Entity with ID '{entity_id}' not found"
            )
        
        logger.info(f"Successfully retrieved entity: {entity_id}")
        
        return EntityDetailedResponse(
            success=True,
            data=entity
        )
        
    except HTTPException:
        # Re-raise HTTP exceptions as-is
        raise
    except Exception as e:
        logger.error(f"Error fetching entity {entity_id}: {e}")
        raise HTTPException(
            status_code=500,
            detail="Internal server error while fetching entity"
        )


@router.put("/{entity_id}", response_model=EntityDetailedResponse)
async def update_entity(
    entity_id: str,
    update_data: dict,
    entity_repo = Depends(get_entity_repository_dependency)
):
    """
    Update an existing entity
    
    Uses the new EntityRepository for clean data access with validation and error handling.
    
    Args:
        entity_id: Unique entity identifier
        update_data: Dictionary containing fields to update
        
    Returns:
        EntityDetailResponse: Updated entity information
    """
    try:
        logger.info(f"Updating entity: {entity_id}")
        
        # Validate entity exists
        existing_entity = await entity_repo.get_entity_by_id(entity_id)
        if not existing_entity:
            raise HTTPException(
                status_code=404,
                detail=f"Entity with ID '{entity_id}' not found"
            )
        
        # Update entity through repository
        updated_entity = await entity_repo.update_entity(entity_id, update_data)
        
        logger.info(f"Successfully updated entity: {entity_id}")
        
        return EntityDetailedResponse(
            success=True,
            data=updated_entity
        )
        
    except HTTPException:
        # Re-raise HTTP exceptions as-is
        raise
    except Exception as e:
        logger.error(f"Error updating entity {entity_id}: {e}")
        raise HTTPException(
            status_code=500,
            detail="Internal server error while updating entity"
        )


@router.delete("/{entity_id}")
async def delete_entity(
    entity_id: str,
    entity_repo = Depends(get_entity_repository_dependency)
):
    """
    Delete an entity (soft delete by updating status)
    
    Uses the new EntityRepository for clean data access. Implements soft delete
    by updating entity status to 'archived' for audit trail preservation.
    
    Args:
        entity_id: Unique entity identifier
        
    Returns:
        Success confirmation
    """
    try:
        logger.info(f"Deleting entity: {entity_id}")
        
        # Validate entity exists
        existing_entity = await entity_repo.get_entity_by_id(entity_id)
        if not existing_entity:
            raise HTTPException(
                status_code=404,
                detail=f"Entity with ID '{entity_id}' not found"
            )
        
        # Soft delete through repository (update status to archived)
        await entity_repo.update_entity(entity_id, {"status": "archived"})
        
        logger.info(f"Successfully deleted (archived) entity: {entity_id}")
        
        return {
            "success": True,
            "message": f"Entity {entity_id} has been archived",
            "entity_id": entity_id
        }
        
    except HTTPException:
        # Re-raise HTTP exceptions as-is
        raise
    except Exception as e:
        logger.error(f"Error deleting entity {entity_id}: {e}")
        raise HTTPException(
            status_code=500,
            detail="Internal server error while deleting entity"
        )


@router.post("/search", response_model=EntityListResponse)
async def search_entities(
    search_request: EntitySearchRequest,
    entity_repo = Depends(get_entity_repository_dependency)
):
    """
    Search entities with advanced criteria
    
    Uses the new EntityRepository for clean data access with complex search capabilities.
    Supports text search, filtering, and sorting with pagination.
    
    Args:
        search_request: Search parameters including query, filters, and pagination
        
    Returns:
        EntitiesListResponse: Paginated search results
    """
    try:
        logger.info(f"Searching entities with query: {search_request.query}")
        
        # Execute search through repository
        entities, total_count = await entity_repo.search_entities(
            query=search_request.query,
            filters=search_request.filters or {},
            skip=search_request.skip or 0,
            limit=search_request.limit or DEFAULT_PAGE_SIZE,
            sort_by=search_request.sort_by,
            sort_order=search_request.sort_order
        )
        
        logger.info(f"Search completed: {len(entities)} entities found out of {total_count} total")
        
        # Calculate pagination metadata
        skip = search_request.skip or 0
        limit = search_request.limit or DEFAULT_PAGE_SIZE
        current_page = (skip // limit) + 1
        total_pages = math.ceil(total_count / limit) if total_count > 0 else 1
        has_next = (skip + limit) < total_count
        has_previous = skip > 0
        
        return create_entity_list_response(
            entities=entities,
            total_count=total_count,
            page=current_page,
            limit=limit,
            offset=skip
        )
        
    except Exception as e:
        logger.error(f"Error searching entities: {e}")
        raise HTTPException(
            status_code=500,
            detail="Internal server error while searching entities"
        )


@router.get("/{entity_id}/summary")
async def get_entity_summary(
    entity_id: str,
    entity_repo = Depends(get_entity_repository_dependency)
):
    """
    Get a summary of entity information including statistics and status
    
    Provides condensed entity information for dashboard and overview displays.
    
    Args:
        entity_id: Unique entity identifier
        
    Returns:
        Entity summary with key metrics and status information
    """
    try:
        logger.info(f"Getting summary for entity: {entity_id}")
        
        # Get entity through repository
        entity = await entity_repo.get_entity_by_id(entity_id)
        
        if not entity:
            raise HTTPException(
                status_code=404,
                detail=f"Entity with ID '{entity_id}' not found"
            )
        
        # Generate summary information
        summary = {
            "entity_id": entity.entity_id,
            "name": entity.name,
            "entity_type": entity.entity_type,
            "status": entity.status,
            "risk_level": entity.risk_level,
            "risk_score": entity.risk_score,
            "created_date": entity.created_date,
            "updated_date": entity.updated_date,
            "has_identifiers": bool(entity.identifiers),
            "has_contact_info": bool(entity.contact),
            "identifier_count": len(entity.identifiers) if entity.identifiers else 0
        }
        
        logger.info(f"Generated summary for entity: {entity_id}")
        
        return summary
        
    except HTTPException:
        # Re-raise HTTP exceptions as-is
        raise
    except Exception as e:
        logger.error(f"Error getting entity summary for {entity_id}: {e}")
        raise HTTPException(
            status_code=500,
            detail="Internal server error while getting entity summary"
        )