"""
FastAPI routes for entity resolution and onboarding
"""

import logging
from typing import Dict, Any, List
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
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
from services.network_service import NetworkService
from models.vector_search import (
    VectorSearchByEntityRequest,
    VectorSearchByTextRequest,
    VectorSearchResponse,
    VectorSearchStatsResponse,
    VectorSearchDemoRequest,
    VectorSearchDemoResponse,
    SimilarEntity
)
from models.unified_search import (
    UnifiedSearchRequest,
    UnifiedSearchResponse,
    DemoScenario,
    DemoScenarioResponse
)
from services.unified_search import UnifiedSearchService
from models.network import NetworkDataResponse, NetworkQueryParams

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
        resolution_service = EntityResolutionService(db)
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
        
        search_service = AtlasSearchService(db)
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
            try:
                # Remove _id field to avoid ObjectId serialization issues
                if "_id" in entity:
                    del entity["_id"]
                similar_entity_models.append(SimilarEntity(**entity))
            except Exception as model_error:
                logger.error(f"Failed to create SimilarEntity model for entity {entity.get('entityId', 'unknown')}: {model_error}")
                logger.debug(f"Entity data: {entity}")
                continue
        
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
        entities_collection = db["entities"]
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

# Unified Search Endpoints

@router.post("/unified_search", response_model=UnifiedSearchResponse)
async def unified_entity_search(
    request: UnifiedSearchRequest,
    db = Depends(get_async_db_dependency)
):
    """
    Perform unified entity search using both Atlas Search and Vector Search
    
    This endpoint represents the pinnacle of MongoDB's search capabilities, combining:
    - **Atlas Search**: Traditional fuzzy matching, typo tolerance, exact identifier matching
    - **Vector Search**: AI-powered semantic similarity and behavioral pattern recognition
    - **Combined Intelligence**: Correlation analysis and intersection discovery
    
    **Demo Scenarios:**
    
    1. **Atlas Search Excellence** - Perfect for traditional data quality issues:
       - Name variations: "Sam Miller" → finds "Samantha Miller"  
       - Address normalization: "Oak St" → finds "Oak Street"
       - Typo tolerance and partial matching
    
    2. **Vector Search Magic** - Semantic understanding beyond text:
       - Risk profiling: "High-risk offshore activities" → finds similar risk entities
       - Behavioral patterns: "Shell company networks" → discovers similar structures
       - AI-powered investigation support
    
    3. **Combined Intelligence** - The best of both worlds:
       - Atlas finds all name matches, Vector narrows by risk/behavior
       - Comprehensive entity resolution that misses nothing
       - Intersection analysis shows highest-confidence matches
    
    **Use Cases:**
    - Traditional entity resolution workflows (Atlas Search strengths)
    - Advanced investigation scenarios (Vector Search strengths)  
    - Comprehensive due diligence (Combined approach)
    - Demo scenarios showcasing MongoDB's complete search platform
    
    **Search Methods:**
    - `["atlas"]`: Traditional fuzzy matching only
    - `["vector"]`: Semantic similarity only  
    - `["atlas", "vector"]`: Both methods with correlation analysis (recommended)
    
    **Request Examples:**
    
    Atlas Search Demo:
    ```json
    {
        "name_full": "Sam Brittany Miller",
        "address_full": "Oak St Portland", 
        "search_methods": ["atlas"],
        "limit": 5
    }
    ```
    
    Vector Search Demo:
    ```json
    {
        "semantic_query": "High-risk individual with offshore banking activities",
        "search_methods": ["vector"],
        "limit": 5
    }
    ```
    
    Combined Intelligence Demo:
    ```json
    {
        "name_full": "John Smith",
        "semantic_query": "offshore shell companies high risk",
        "search_methods": ["atlas", "vector"],
        "limit": 10
    }
    ```
    """
    try:
        logger.info(f"Executing unified search with methods: {request.search_methods}")
        
        # Initialize unified search service
        unified_service = UnifiedSearchService(db)
        
        # Execute unified search
        response = await unified_service.unified_search(request)
        
        # Log search summary
        atlas_count = len(response.atlas_results)
        vector_count = len(response.vector_results) 
        intersection_count = response.combined_intelligence.correlation_analysis.intersection_count
        
        logger.info(f"Unified search completed: {atlas_count} Atlas, {vector_count} Vector, {intersection_count} intersection")
        
        return response
        
    except Exception as e:
        logger.error(f"Unified search failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unified search failed: {str(e)}"
        )

@router.get("/demo_scenarios")
async def get_demo_scenarios():
    """
    Get predefined demo scenarios for showcasing unified search capabilities
    
    Returns scenarios designed to demonstrate the strengths of each search method
    and their combined intelligence capabilities.
    """
    try:
        scenarios = [
            DemoScenario(
                scenario_id="atlas_search_excellence",
                name="Atlas Search Excellence",
                description="Showcase Atlas Search handling real-world data variations",
                search_request=UnifiedSearchRequest(
                    name_full="Sam Brittany Miller",
                    address_full="Oak St Portland",
                    search_methods=["atlas"],
                    limit=5,
                    scenario_name="atlas_search_excellence"
                ),
                expected_atlas_count=4,
                expected_vector_count=0,
                expected_intersection=0,
                key_demonstrations=[
                    "Fuzzy name matching: 'Sam' → 'Samantha'",
                    "Address normalization: 'Oak St' → 'Oak Street'", 
                    "High-confidence exact matches despite variations",
                    "Traditional data quality issue resolution"
                ],
                business_value=[
                    "Handles real-world data entry variations",
                    "Reduces false negatives from typos and abbreviations",
                    "Fast, scalable traditional search",
                    "Familiar search paradigm for analysts"
                ],
                wow_factor="Finds exact entity despite name and address variations"
            ),
            DemoScenario(
                scenario_id="vector_search_magic",
                name="Vector Search Magic", 
                description="Demonstrate semantic understanding and AI-powered entity discovery",
                search_request=UnifiedSearchRequest(
                    semantic_query="High-risk individual with offshore banking activities and shell company connections",
                    search_methods=["vector"],
                    limit=5,
                    scenario_name="vector_search_magic"
                ),
                expected_atlas_count=0,
                expected_vector_count=5,
                expected_intersection=0,
                key_demonstrations=[
                    "Semantic query understanding without name/address", 
                    "Risk profile pattern recognition",
                    "Behavioral similarity detection",
                    "AI-powered investigation support"
                ],
                business_value=[
                    "Discovers hidden connections through AI understanding",
                    "Uncovers entities with similar risk characteristics", 
                    "Goes beyond traditional text matching",
                    "Enables complex investigation workflows"
                ],
                wow_factor="Finds entities by meaning and behavior, not just text similarity"
            ),
            DemoScenario(
                scenario_id="combined_intelligence",
                name="Combined Intelligence Power",
                description="Show the best of both worlds with comprehensive entity resolution",
                search_request=UnifiedSearchRequest(
                    name_full="John Smith",
                    semantic_query="offshore shell companies high risk",
                    search_methods=["atlas", "vector"],
                    limit=10,
                    scenario_name="combined_intelligence"
                ),
                expected_atlas_count=8,
                expected_vector_count=6,
                expected_intersection=2,
                key_demonstrations=[
                    "Atlas Search finds all John Smiths (traditional matching)",
                    "Vector Search finds high-risk offshore entities (semantic)",
                    "Intersection reveals John Smiths with offshore risk patterns",
                    "Combined intelligence identifies most relevant candidates"
                ],
                business_value=[
                    "Comprehensive entity resolution that misses nothing",
                    "Precision through intersection analysis",
                    "Complete investigation workflow support", 
                    "MongoDB's unified search platform advantage"
                ],
                wow_factor="Intelligence amplification through dual search methods"
            )
        ]
        
        return {
            "scenarios": scenarios,
            "total_scenarios": len(scenarios),
            "description": "Demo scenarios showcasing MongoDB Atlas Search + Vector Search capabilities",
            "usage": "Use POST /entities/unified_search with the search_request from any scenario"
        }
        
    except Exception as e:
        logger.error(f"Error getting demo scenarios: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get demo scenarios: {str(e)}"
        )

@router.post("/demo_scenario/{scenario_id}", response_model=DemoScenarioResponse)
async def execute_demo_scenario(
    scenario_id: str,
    db = Depends(get_async_db_dependency)
):
    """
    Execute a specific demo scenario and return results with demo insights
    
    Available scenarios:
    - `atlas_search_excellence`: Traditional fuzzy matching demo
    - `vector_search_magic`: Semantic similarity demo  
    - `combined_intelligence`: Dual-search comprehensive demo
    """
    try:
        # Get demo scenarios
        scenarios_response = await get_demo_scenarios()
        scenarios = scenarios_response["scenarios"]
        
        # Find the requested scenario
        scenario = next((s for s in scenarios if s.scenario_id == scenario_id), None)
        if not scenario:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Demo scenario '{scenario_id}' not found"
            )
        
        logger.info(f"Executing demo scenario: {scenario_id}")
        
        # Execute the unified search
        unified_service = UnifiedSearchService(db)
        search_results = await unified_service.unified_search(scenario.search_request)
        
        # Generate demo-specific insights
        demo_insights = _generate_demo_insights(scenario, search_results)
        
        # Calculate success metrics
        success_metrics = _calculate_demo_success_metrics(scenario, search_results)
        
        return DemoScenarioResponse(
            scenario=scenario,
            search_results=search_results,
            demo_insights=demo_insights,
            success_metrics=success_metrics
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error executing demo scenario '{scenario_id}': {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Demo scenario execution failed: {str(e)}"
        )

def _generate_demo_insights(scenario: DemoScenario, results: UnifiedSearchResponse) -> List[str]:
    """Generate insights specific to the demo scenario."""
    insights = []
    
    atlas_count = len(results.atlas_results)
    vector_count = len(results.vector_results)
    intersection_count = results.combined_intelligence.correlation_analysis.intersection_count
    
    if scenario.scenario_id == "atlas_search_excellence":
        insights.append(f"Atlas Search found {atlas_count} matches using fuzzy matching")
        if atlas_count > 0:
            insights.append("Successfully handled name/address variations without exact text matches")
            insights.append("Demonstrates MongoDB's powerful traditional search capabilities")
    
    elif scenario.scenario_id == "vector_search_magic":
        insights.append(f"Vector Search found {vector_count} semantically similar entities")
        if vector_count > 0:
            insights.append("Discovered entities through AI understanding, not text matching")
            insights.append("Shows the power of semantic search for complex investigations")
    
    elif scenario.scenario_id == "combined_intelligence":
        insights.append(f"Combined search: {atlas_count} Atlas + {vector_count} Vector = {intersection_count} intersection")
        if intersection_count > 0:
            insights.append("Intersection matches represent highest-confidence entities")
            insights.append("Demonstrates MongoDB's comprehensive dual-search platform")
    
    # Add performance insights
    search_time = results.search_metadata.performance_metrics.total_search_time_ms
    insights.append(f"Total search completed in {search_time:.1f}ms")
    
    return insights

def _calculate_demo_success_metrics(scenario: DemoScenario, results: UnifiedSearchResponse) -> Dict[str, Any]:
    """Calculate metrics showing demo success."""
    atlas_count = len(results.atlas_results) 
    vector_count = len(results.vector_results)
    intersection_count = results.combined_intelligence.correlation_analysis.intersection_count
    
    return {
        "expected_vs_actual": {
            "atlas_expected": scenario.expected_atlas_count,
            "atlas_actual": atlas_count,
            "vector_expected": scenario.expected_vector_count, 
            "vector_actual": vector_count,
            "intersection_expected": scenario.expected_intersection,
            "intersection_actual": intersection_count
        },
        "performance_metrics": {
            "total_search_time_ms": results.search_metadata.performance_metrics.total_search_time_ms,
            "search_success": results.search_success,
            "total_unique_entities": results.total_unique_entities
        },
        "demo_effectiveness": {
            "met_expectations": atlas_count >= (scenario.expected_atlas_count or 0) and vector_count >= (scenario.expected_vector_count or 0),
            "comprehensiveness_score": results.combined_intelligence.search_comprehensiveness,
            "confidence_level": results.combined_intelligence.confidence_level
        }
    }

# Debug Endpoints for Search Investigation

@router.get("/debug/search_info")
async def get_search_debug_info(db = Depends(get_async_db_dependency)):
    """
    Debug endpoint to get information about search indexes and entity data.
    
    Returns comprehensive information for debugging search issues.
    """
    try:
        entities_collection = db["entities"]
        
        # Get total entity count
        total_entities = await entities_collection.count_documents({})
        
        # Check how many entities have embeddings
        entities_with_embeddings = await entities_collection.count_documents({
            "profileEmbedding": {"$exists": True, "$ne": None}
        })
        
        # Get sample entity for debugging
        sample_entity = await entities_collection.find_one({}, {
            "_id": 0,  # Exclude ObjectId to avoid serialization issues
            "entityId": 1,
            "name": 1,
            "addresses": 1,
            "identifiers": 1,
            "riskAssessment": 1
        })
        
        # Check if sample entity has embeddings
        if sample_entity:
            # Check for embedding without including it in response
            full_entity = await entities_collection.find_one(
                {"entityId": sample_entity.get("entityId")},
                {"profileEmbedding": 1}
            )
            sample_entity["hasProfileEmbedding"] = bool(full_entity and full_entity.get("profileEmbedding"))
        
        # Check for common entity patterns
        entity_types = []
        async for result in entities_collection.aggregate([
            {"$group": {"_id": "$entityType", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}}
        ]):
            entity_types.append(result)
        
        return {
            "database_info": {
                "total_entities": total_entities,
                "entities_with_embeddings": entities_with_embeddings,
                "embedding_coverage_percentage": round((entities_with_embeddings / total_entities * 100), 2) if total_entities > 0 else 0
            },
            "entity_types_distribution": entity_types,
            "sample_entity": sample_entity,
            "search_indexes": {
                "atlas_search_index": "entity_resolution_search",
                "vector_search_index": "entity_vector_search_index"
            },
            "debug_timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error getting search debug info: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get search debug info: {str(e)}"
        )

@router.post("/debug/atlas_search_raw")
async def debug_atlas_search_raw(
    query: dict,
    db = Depends(get_async_db_dependency)
):
    """
    Debug endpoint to test raw Atlas Search queries.
    
    Allows testing Atlas Search pipelines directly for debugging.
    """
    try:
        entities_collection = db["entities"]
        
        logger.info(f"Executing raw Atlas Search query: {query}")
        
        # Execute the raw query
        results = []
        async for result in entities_collection.aggregate(query):
            if "_id" in result:
                result["_id"] = str(result["_id"])
            results.append(result)
        
        return {
            "query": query,
            "results": results,
            "result_count": len(results),
            "debug_timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error executing raw Atlas Search: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Raw Atlas Search failed: {str(e)}"
        )

@router.post("/debug/vector_search_raw")
async def debug_vector_search_raw(
    entity_id: str,
    limit: int = 5,
    db = Depends(get_async_db_dependency)
):
    """
    Debug endpoint to test vector search for a specific entity.
    
    Returns detailed information about vector search process.
    """
    try:
        entities_collection = db["entities"]
        
        # Get the source entity
        source_entity = await entities_collection.find_one({"entityId": entity_id})
        if not source_entity:
            raise HTTPException(status_code=404, detail=f"Entity {entity_id} not found")
        
        # Check if it has embeddings
        profile_embedding = source_entity.get("profileEmbedding")
        has_embedding = profile_embedding is not None
        embedding_size = len(profile_embedding) if profile_embedding else 0
        
        # If it has embeddings, try vector search
        vector_results = []
        if has_embedding:
            vector_service = VectorSearchService(db)
            vector_results = await vector_service.find_similar_entities_by_id(
                entity_id=entity_id,
                limit=limit
            )
        
        return {
            "source_entity_id": entity_id,
            "source_entity_info": {
                "name": source_entity.get("name", {}).get("full", "Unknown"),
                "entity_type": source_entity.get("entityType", "Unknown"),
                "has_embedding": has_embedding,
                "embedding_dimensions": embedding_size
            },
            "vector_search_results": vector_results,
            "result_count": len(vector_results),
            "debug_timestamp": datetime.now().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error debugging vector search for {entity_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Vector search debug failed: {str(e)}"
        )

# Network Analysis Endpoints

@router.get("/{entity_id}/network", response_model=NetworkDataResponse)
async def get_entity_network(
    entity_id: str,
    max_depth: int = Query(default=2, ge=1, le=4, description="Maximum traversal depth"),
    min_strength: float = Query(default=0.5, ge=0.0, le=1.0, description="Minimum relationship strength"),
    include_inactive: bool = Query(default=False, description="Include inactive relationships"),
    max_nodes: int = Query(default=100, ge=10, le=500, description="Maximum number of nodes to return"),
    db = Depends(get_async_db_dependency)
):
    """
    Get entity relationship network using MongoDB $graphLookup
    
    This endpoint builds a network graph starting from the specified entity,
    traversing relationships up to max_depth levels, and filtering by strength.
    
    Parameters:
    - entity_id: Starting entity for network building
    - max_depth: Maximum relationship traversal depth (1-4)
    - min_strength: Minimum relationship strength threshold (0.0-1.0)
    - include_inactive: Whether to include inactive relationships
    - max_nodes: Maximum number of nodes in the result (prevents overwhelming visualizations)
    
    Returns:
    - NetworkDataResponse: Complete network data with nodes, edges, and metadata
    """
    try:
        logger.info(f"Building network for entity {entity_id} with max_depth={max_depth}, min_strength={min_strength}")
        
        # Initialize network service
        network_service = NetworkService(db)
        
        # Build the entity network
        network_data = await network_service.build_entity_network(
            entity_id=entity_id,
            max_depth=max_depth,
            min_strength=min_strength,
            include_inactive=include_inactive,
            max_nodes=max_nodes
        )
        
        logger.info(f"Network built successfully: {network_data.totalNodes} nodes, {network_data.totalEdges} edges")
        
        return network_data
        
    except ValueError as e:
        # Handle specific entity not found error
        logger.warning(f"Entity {entity_id} not found for network building: {e}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Entity '{entity_id}' not found"
        )
    except Exception as e:
        logger.error(f"Error building network for entity {entity_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Network building failed: {str(e)}"
        )