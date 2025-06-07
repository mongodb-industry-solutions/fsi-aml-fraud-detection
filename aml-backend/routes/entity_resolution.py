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
from services.vector_search import VectorSearchService
from models.vector_search import (
    VectorSearchByEntityRequest,
    VectorSearchByTextRequest,
    VectorSearchResponse,
    VectorSearchStatsResponse,
    VectorSearchDemoRequest,
    VectorSearchDemoResponse,
    SimilarEntity
)

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

# Vector Search Endpoints

@router.post("/find_similar_by_vector", response_model=VectorSearchResponse)
async def find_similar_entities_by_vector(
    request: VectorSearchByEntityRequest,
    db = Depends(get_async_db_dependency)
):
    """
    Find entities with similar profiles using vector search
    
    This endpoint uses MongoDB Atlas Vector Search to find entities with semantically
    similar profiles based on their profile embeddings. It's particularly useful for:
    
    **Use Cases:**
    - Discovering entities with similar risk profiles
    - Finding related entities that might not match traditional attribute searches
    - Uncovering potential networks or connections based on profile similarity
    - Investigation support for complex entity relationships
    
    **Search Algorithm:**
    - Uses 1536-dimensional profile embeddings (compatible with OpenAI/Bedrock)
    - Cosine similarity for measuring profile similarity
    - Configurable filtering by entity type, risk level, resolution status
    - Returns similarity scores between 0-1 (higher = more similar)
    
    **Example Request:**
    ```json
    {
        "entity_id": "CDI-431BB609EB",
        "limit": 5,
        "filters": {
            "entityType": "individual",
            "riskLevel": "high"
        }
    }
    ```
    
    **Response includes:**
    - Similar entities with similarity scores
    - Search metadata and execution time
    - Match reasons and insights
    """
    try:
        import time
        start_time = time.time()
        
        vector_service = VectorSearchService(db)
        
        # Prepare filters
        filters = request.filters or {}
        
        # Find similar entities
        similar_entities = await vector_service.find_similar_entities_by_id(
            entity_id=request.entity_id,
            limit=request.limit,
            filters=filters
        )
        
        end_time = time.time()
        search_time_ms = (end_time - start_time) * 1000
        
        # Convert to response format
        similar_entity_models = []
        for entity in similar_entities:
            similar_entity_models.append(SimilarEntity(**entity))
        
        return VectorSearchResponse(
            query_info={
                "entity_id": request.entity_id,
                "limit": request.limit,
                "filters_applied": filters,
                "search_type": "entity_profile_vector_search"
            },
            similar_entities=similar_entity_models,
            total_found=len(similar_entity_models),
            search_metadata={
                "search_time_ms": round(search_time_ms, 2),
                "vector_index_used": "entity_vector_search_index",
                "similarity_metric": "cosine",
                "embedding_dimensions": 1536
            }
        )
        
    except Exception as e:
        logger.error(f"Error in vector search for entity {request.entity_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Vector search failed: {str(e)}"
        )

@router.post("/find_similar_by_text", response_model=VectorSearchResponse)
async def find_similar_entities_by_text(
    request: VectorSearchByTextRequest,
    db = Depends(get_async_db_dependency)
):
    """
    Find entities with profiles similar to a text description
    
    This endpoint allows narrative-based searches to find entities that match
    complex descriptions using AWS Bedrock Titan embedding generation.
    Useful for investigation scenarios where you need to find entities based 
    on behavioral descriptions or risk characteristics.
    
    **Use Cases:**
    - "Find individuals involved in offshore shell companies"
    - "Locate entities with high-frequency transaction patterns" 
    - "Identify organizations in financial services sector with compliance issues"
    - "Search for entities with politically exposed person (PEP) connections"
    - "Find high-risk entities in cryptocurrency-related activities"
    
    **How it works:**
    1. Your text query is converted to a 1536-dimensional embedding using AWS Bedrock
    2. Vector similarity search finds entities with semantically similar profiles
    3. Results are ranked by cosine similarity and filtered by your criteria
    
    **Example queries:**
    - "High-risk individual with offshore banking activities"
    - "Corporate entities involved in money laundering schemes"
    - "Individuals with sanctions violations and compliance issues"
    """
    try:
        import time
        start_time = time.time()
        
        vector_service = VectorSearchService(db)
        
        # Find similar entities by text using AWS Bedrock embeddings
        similar_entities = await vector_service.find_similar_entities_by_text(
            query_text=request.query_text,
            limit=request.limit,
            filters=request.filters or {}
        )
        
        end_time = time.time()
        search_time_ms = (end_time - start_time) * 1000
        
        # Convert to response format
        similar_entity_models = []
        for entity in similar_entities:
            similar_entity_models.append(SimilarEntity(**entity))
        
        return VectorSearchResponse(
            query_info={
                "query_text": request.query_text,
                "limit": request.limit,
                "filters_applied": request.filters or {},
                "search_type": "text_to_vector_search"
            },
            similar_entities=similar_entity_models,
            total_found=len(similar_entity_models),
            search_metadata={
                "search_time_ms": round(search_time_ms, 2),
                "status": "text_embedding_implemented",
                "message": "Using AWS Bedrock Titan for text embedding generation",
                "vector_index_used": "entity_vector_search_index",
                "similarity_metric": "cosine",
                "embedding_dimensions": 1536
            }
        )
        
    except Exception as e:
        logger.error(f"Error in text-based vector search: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Text-based vector search failed: {str(e)}"
        )

@router.get("/vector_search/stats", response_model=VectorSearchStatsResponse)
async def get_vector_search_stats(
    db = Depends(get_async_db_dependency)
):
    """
    Get statistics about vector search capabilities
    
    Returns information about:
    - Total entities in the database
    - How many entities have profile embeddings
    - Embedding coverage percentage
    - Distribution by entity type and risk level
    - Vector index configuration details
    """
    try:
        vector_service = VectorSearchService(db)
        stats = await vector_service.get_vector_search_stats()
        
        return VectorSearchStatsResponse(**stats)
        
    except Exception as e:
        logger.error(f"Error getting vector search stats: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get vector search statistics: {str(e)}"
        )

@router.post("/vector_search/demo", response_model=VectorSearchDemoResponse)
async def demo_vector_search(
    request: VectorSearchDemoRequest,
    db = Depends(get_async_db_dependency)
):
    """
    Demonstrate vector search capabilities with predefined scenarios
    
    Available scenarios:
    - "high_risk_individual": Find entities similar to high-risk individuals
    - "corporate_entity": Find entities similar to corporate structures
    - "offshore_patterns": Find entities with offshore activity patterns
    - "compliance_issues": Find entities with similar compliance concerns
    
    Each scenario uses a known entity as the search query and provides
    insights about what the results demonstrate.
    """
    try:
        import time
        start_time = time.time()
        
        vector_service = VectorSearchService(db)
        
        # Demo scenarios with known entity IDs
        demo_scenarios = {
            "high_risk_individual": {
                "entity_id": "CDI-982BDB7D7B",  # Sam Brittany Miller - high risk
                "description": "Demonstrates finding individuals with similar high-risk profiles",
                "insights": [
                    "Identifies entities with similar risk characteristics",
                    "Shows profile-based similarity beyond name matching",
                    "Useful for investigation pattern analysis"
                ]
            },
            "corporate_entity": {
                "entity_id": "ORG-101",  # Any organization entity
                "description": "Shows how to find organizations with similar business profiles",
                "insights": [
                    "Finds corporate entities with similar business activities",
                    "Identifies potential shell company networks",
                    "Supports corporate investigation workflows"
                ]
            },
            "medium_risk_profile": {
                "entity_id": "CDI-431BB609EB",  # Samantha Miller - medium risk
                "description": "Finds entities with moderate risk profiles for comparison",
                "insights": [
                    "Demonstrates graduated risk similarity",
                    "Shows how vector search captures risk nuances",
                    "Useful for risk assessment validation"
                ]
            }
        }
        
        scenario_config = demo_scenarios.get(request.scenario)
        if not scenario_config:
            raise HTTPException(
                status_code=400,
                detail=f"Unknown scenario '{request.scenario}'. Available: {list(demo_scenarios.keys())}"
            )
        
        # Get the query entity details
        entities_collection = db.database["entities"]
        query_entity = await entities_collection.find_one({"entityId": scenario_config["entity_id"]})
        
        if not query_entity:
            raise HTTPException(
                status_code=404,
                detail=f"Demo entity {scenario_config['entity_id']} not found"
            )
        
        # Perform vector search
        similar_entities = await vector_service.find_similar_entities_by_id(
            entity_id=scenario_config["entity_id"],
            limit=request.limit
        )
        
        end_time = time.time()
        search_time_ms = (end_time - start_time) * 1000
        
        # Convert to response models
        similar_entity_models = []
        for entity in similar_entities:
            similar_entity_models.append(SimilarEntity(**entity))
        
        # Prepare query entity for response (remove ObjectId)
        if "_id" in query_entity:
            query_entity["_id"] = str(query_entity["_id"])
        
        return VectorSearchDemoResponse(
            scenario_name=request.scenario,
            scenario_description=scenario_config["description"],
            query_entity=query_entity,
            similar_entities=similar_entity_models,
            insights=scenario_config["insights"],
            search_time_ms=round(search_time_ms, 2)
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in vector search demo '{request.scenario}': {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Demo vector search failed: {str(e)}"
        )