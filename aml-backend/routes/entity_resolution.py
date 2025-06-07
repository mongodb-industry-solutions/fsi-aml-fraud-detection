"""
FastAPI routes for entity resolution and onboarding
"""

import logging
from typing import Dict, Any

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import JSONResponse

from dependencies import get_async_db_dependency
from models.entity_resolution import (
    NewOnboardingInput,
    FindMatchesResponse,
    ResolutionDecisionInput,
    ResolutionResponse
)
from services.atlas_search import AtlasSearchService
from services.entity_resolution import EntityResolutionService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/entities", tags=["Entity Resolution"])

@router.post("/onboarding/find_matches", response_model=FindMatchesResponse)
async def find_entity_matches(
    input_data: NewOnboardingInput,
    limit: int = 10,
    db = Depends(get_async_db_dependency)
):
    """
    Find potential entity matches for new onboarding input using Atlas Search
    
    This endpoint performs intelligent fuzzy matching against existing entities
    using name, address, date of birth, and identifier information.
    
    **Features:**
    - Fuzzy name matching with high boost for exact matches
    - Address similarity search
    - Date of birth proximity matching (+/- 2 years)
    - Exact identifier matching with highest boost
    - Configurable result limits
    
    **Search Algorithm:**
    - Uses MongoDB Atlas Search compound queries
    - Combines multiple search criteria with different weights
    - Returns match confidence scores and reasons
    - Optimized for entity resolution scenarios
    """
    try:
        logger.info(f"Finding matches for onboarding input: {input_data.name_full}")
        
        # Validate input
        if not input_data.name_full or input_data.name_full.strip() == "":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Name is required for entity matching"
            )
        
        # Validate limit
        if limit < 1 or limit > 50:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Limit must be between 1 and 50"
            )
        
        # Initialize search service
        search_service = AtlasSearchService(db)
        
        # Perform search
        result = await search_service.find_entity_matches(input_data, limit)
        
        logger.info(f"Found {result.totalMatches} potential matches for {input_data.name_full}")
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error finding entity matches: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to find entity matches: {str(e)}"
        )

@router.post("/resolve", response_model=ResolutionResponse)
async def resolve_entities(
    decision_input: ResolutionDecisionInput,
    db = Depends(get_async_db_dependency)
):
    """
    Process an entity resolution decision
    
    This endpoint handles the resolution of entity matches, including:
    - Confirming entities as the same person/organization
    - Marking entities as not matching
    - Flagging matches for further review
    
    **Resolution Actions:**
    - **confirmed_match**: Merges entities and creates master-duplicate relationship
    - **not_a_match**: Records dismissal decision to prevent future matching
    - **needs_review**: Flags the match for manual review by analysts
    
    **Database Operations:**
    - Updates entity resolution status
    - Creates relationship records for audit trail
    - Maintains referential integrity between entities
    - Tracks confidence scores and evidence
    """
    try:
        logger.info(f"Processing entity resolution: {decision_input.decision} between "
                   f"{decision_input.sourceEntityId} and {decision_input.targetMasterEntityId}")
        
        # Validate input
        if decision_input.sourceEntityId == decision_input.targetMasterEntityId:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Source and target entities cannot be the same"
            )
        
        if not decision_input.matchedAttributes:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="At least one matched attribute must be specified"
            )
        
        # Initialize resolution service
        resolution_service = EntityResolutionService(db)
        
        # Process resolution
        result = await resolution_service.resolve_entities(decision_input)
        
        if result.success:
            logger.info(f"Successfully processed resolution: {decision_input.decision}")
        else:
            logger.warning(f"Resolution processing failed: {result.message}")
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error processing entity resolution: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process entity resolution: {str(e)}"
        )

@router.get("/resolution/status/{entity_id}")
async def get_entity_resolution_status(
    entity_id: str,
    db = Depends(get_async_db_dependency)
):
    """
    Get resolution status for a specific entity
    
    Returns information about whether an entity has been resolved,
    its master entity (if applicable), and linked entities.
    """
    try:
        resolution_service = EntityResolutionService(db)
        status_info = await resolution_service.get_entity_resolution_status(entity_id)
        
        if status_info is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Entity {entity_id} not found"
            )
        
        return {"entityId": entity_id, "resolution": status_info}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting resolution status for {entity_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get resolution status: {str(e)}"
        )

@router.get("/resolution/linked/{master_entity_id}")
async def get_linked_entities(
    master_entity_id: str,
    db = Depends(get_async_db_dependency)
):
    """
    Get all entities linked to a master entity
    
    Returns all entities that have been resolved to point to the specified master entity.
    """
    try:
        resolution_service = EntityResolutionService(db.database)
        linked_entities = await resolution_service.get_linked_entities(master_entity_id)
        
        return {
            "masterEntityId": master_entity_id,
            "linkedEntities": linked_entities,
            "totalLinked": len(linked_entities)
        }
        
    except Exception as e:
        logger.error(f"Error getting linked entities for {master_entity_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get linked entities: {str(e)}"
        )

@router.post("/search/test")
async def test_atlas_search(
    db = Depends(get_async_db_dependency)
):
    """
    Test Atlas Search index configuration and connectivity
    
    This endpoint helps verify that the Atlas Search index is properly configured
    and accessible for entity resolution operations.
    """
    try:
        search_service = AtlasSearchService(db)
        test_result = await search_service.test_search_index()
        
        return {
            "searchIndexTest": test_result,
            "timestamp": str(logging.Formatter().formatTime(logging.LogRecord(
                name="test", level=logging.INFO, pathname="", lineno=0,
                msg="", args=(), exc_info=None
            )))
        }
        
    except Exception as e:
        logger.error(f"Error testing Atlas Search: {e}")
        return {
            "searchIndexTest": {
                "index_accessible": False,
                "error": str(e)
            },
            "timestamp": str(logging.Formatter().formatTime(logging.LogRecord(
                name="test", level=logging.ERROR, pathname="", lineno=0,
                msg="", args=(), exc_info=None
            )))
        }

@router.get("/search/suggestions")
async def get_search_suggestions(
    query: str,
    field: str = "name.full",
    limit: int = 5,
    db = Depends(get_async_db_dependency)
):
    """
    Get autocomplete suggestions for entity search
    
    Uses Atlas Search autocomplete operator to provide real-time suggestions
    as users type in entity search fields.
    """
    try:
        if not query or len(query.strip()) < 2:
            return {"suggestions": []}
        
        search_service = AtlasSearchService(db.database)
        suggestions = await search_service.get_search_suggestions(query, field, limit)
        
        return {
            "query": query,
            "field": field,
            "suggestions": suggestions
        }
        
    except Exception as e:
        logger.error(f"Error getting search suggestions: {e}")
        return {
            "query": query,
            "field": field,
            "suggestions": [],
            "error": str(e)
        }

# Example usage and testing endpoints

@router.post("/onboarding/demo")
async def demo_entity_matching():
    """
    Demo endpoint showing example entity matching scenarios
    
    Returns sample data showing how the entity matching system works
    with different types of input data and matching scenarios.
    """
    return {
        "demo_scenarios": [
            {
                "scenario": "Exact Name Match",
                "input": {
                    "name_full": "Samantha Miller",
                    "date_of_birth": "1985-03-15",
                    "address_full": "123 Oak Street, Portland, OR 97205"
                },
                "expected_matches": [
                    {
                        "entityId": "C123456",
                        "confidence": 0.95,
                        "match_reasons": ["exact_name_match", "similar_address"]
                    }
                ]
            },
            {
                "scenario": "Fuzzy Name Match",
                "input": {
                    "name_full": "Sam Miller", 
                    "identifier_value": "SSN-123-45-6789"
                },
                "expected_matches": [
                    {
                        "entityId": "C789012",
                        "confidence": 0.87,
                        "match_reasons": ["similar_name", "shared_identifier"]
                    }
                ]
            },
            {
                "scenario": "Address Only Match",
                "input": {
                    "name_full": "John Doe",
                    "address_full": "123 Oak Street, Portland, OR 97205"
                },
                "expected_matches": [
                    {
                        "entityId": "C345678",
                        "confidence": 0.65,
                        "match_reasons": ["shared_address"]
                    }
                ]
            }
        ],
        "instructions": "Use POST /entities/onboarding/find_matches with the input examples above"
    }