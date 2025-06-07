from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
import logging
import math

from models.entity_flexible import EntityBasic, EntityDetail, EntitiesListResponse, ErrorResponse
from dependencies import (
    get_db_dependency,
    DB_NAME,
    ENTITIES_COLLECTION,
    DEFAULT_PAGE_SIZE,
    MAX_PAGE_SIZE
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

def transform_entity_to_basic(entity_doc: dict) -> EntityBasic:
    """Transform MongoDB entity document to EntityBasic model"""
    try:
        # Handle nested field access safely
        name_full = entity_doc.get("name", {}).get("full", "")
        risk_score = entity_doc.get("riskAssessment", {}).get("overall", {}).get("score", 0)
        risk_level = entity_doc.get("riskAssessment", {}).get("overall", {}).get("level", "unknown")
        
        return EntityBasic(
            entityId=entity_doc.get("entityId", ""),
            name_full=name_full,
            entityType=entity_doc.get("entityType", ""),
            risk_score=risk_score,
            risk_level=risk_level
        )
    except Exception as e:
        logger.error(f"Error transforming entity to basic model: {e}")
        logger.error(f"Entity document keys: {list(entity_doc.keys()) if entity_doc else 'None'}")
        raise HTTPException(status_code=500, detail="Error processing entity data")

def transform_entity_to_detail(entity_doc: dict) -> EntityDetail:
    """Transform MongoDB entity document to EntityDetail model"""
    try:
        # Create a clean copy and remove MongoDB _id field
        clean_doc = {k: v for k, v in entity_doc.items() if k != "_id"}
        
        # Convert to EntityDetail using Pydantic's parsing
        return EntityDetail(**clean_doc)
    except Exception as e:
        logger.error(f"Error transforming entity to detail model: {e}")
        logger.error(f"Entity document keys: {list(entity_doc.keys()) if entity_doc else 'None'}")
        # Log specific validation errors if it's a Pydantic error
        if hasattr(e, 'errors'):
            logger.error(f"Validation errors: {e.errors()}")
        raise HTTPException(status_code=500, detail=f"Error processing entity data: {str(e)}")

@router.get("/", response_model=EntitiesListResponse)
async def get_entities(
    skip: int = Query(0, ge=0, description="Number of entities to skip"),
    limit: int = Query(DEFAULT_PAGE_SIZE, ge=1, le=MAX_PAGE_SIZE, description="Number of entities to return"),
    entity_type: Optional[str] = Query(None, description="Filter by entity type"),
    risk_level: Optional[str] = Query(None, description="Filter by risk level"),
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
        
        return EntitiesListResponse(
            entities=entities,
            total_count=total_count,
            page=current_page,
            limit=limit,
            has_next=has_next,
            has_previous=has_previous
        )
        
    except Exception as e:
        logger.error(f"Error fetching entities: {e}")
        raise HTTPException(status_code=500, detail="Internal server error while fetching entities")

@router.get("/{entity_id}", response_model=EntityDetail)
async def get_entity_by_id(
    entity_id: str,
    db: MongoDBAccess = Depends(get_db_dependency)
):
    """
    Retrieve a single entity by its entityId from the 'entities' collection.
    
    Returns an EntityDetail model with all entity information.
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