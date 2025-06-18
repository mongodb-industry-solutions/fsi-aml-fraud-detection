"""
Vector Search Routes - Semantic similarity and AI-powered entity discovery

Focused routes for Vector Search capabilities using VectorSearchService:
- Semantic similarity search using AI embeddings
- Behavioral pattern recognition and risk profiling
- Entity-to-entity similarity analysis
- Text-to-entity semantic search functionality
"""

import logging
import time
from typing import Dict, Any, Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, status

from models.vector_search import (
    VectorSearchByEntityRequest,
    VectorSearchByTextRequest,
    VectorSearchResponse,
    VectorSearchStatsResponse,
    VectorSearchDemoRequest,
    VectorSearchDemoResponse,
    SimilarEntity
)
from models.api.responses import ErrorResponse
from services.dependencies import get_vector_search_service
from services.search.vector_search_service import VectorSearchService

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/search/vector",
    tags=["Vector Search"],
    responses={
        400: {"model": ErrorResponse, "description": "Bad request"},
        404: {"model": ErrorResponse, "description": "Entity not found"},
        500: {"model": ErrorResponse, "description": "Internal server error"}
    }
)


@router.post("/find_similar_by_entity", response_model=VectorSearchResponse)
async def find_similar_entities_by_entity(
    request: VectorSearchByEntityRequest,
    vector_search_service: VectorSearchService = Depends(get_vector_search_service)
):
    """
    Find entities with similar profiles using vector similarity
    
    Uses the refactored VectorSearchService for AI-powered entity similarity
    analysis based on profile embeddings with repository pattern data access.
    
    **Vector Search Strengths:**
    - AI-powered semantic understanding beyond text matching
    - Behavioral pattern recognition and risk profiling
    - Profile similarity analysis using 1536-dimensional embeddings
    - Repository pattern for clean data access and enhanced performance
    
    **Use Cases:**
    - Discovering entities with similar risk profiles
    - Finding related entities that don't match traditional searches
    - Uncovering potential networks based on profile similarity
    - Investigation support for complex entity relationships
    
    Args:
        request: Vector search request with entity ID and filters
        
    Returns:
        VectorSearchResponse: Similar entities with semantic similarity scores
    """
    try:
        start_time = time.time()
        
        logger.info(f"Executing vector search for entity: {request.entity_id}")
        
        # Execute vector search through refactored service
        similar_entities = await vector_search_service.find_similar_entities_by_id(
            entity_id=request.entity_id,
            limit=request.limit,
            filters=request.filters or {},
            similarity_threshold=0.5  # Configurable threshold
        )
        
        end_time = time.time()
        search_time_ms = (end_time - start_time) * 1000
        
        # Convert results to response models
        similar_entity_models = []
        for entity in similar_entities:
            if isinstance(entity, dict):
                # Remove MongoDB _id field to avoid serialization issues
                entity.pop("_id", None)
                similar_entity_models.append(SimilarEntity(**entity))
            else:
                similar_entity_models.append(entity)
        
        logger.info(f"Vector search completed in {search_time_ms:.2f}ms, found {len(similar_entity_models)} similar entities")
        
        return VectorSearchResponse(
            query_info={
                "entity_id": request.entity_id,
                "limit": request.limit,
                "filters_applied": request.filters or {},
                "search_type": "entity_profile_vector_search",
                "service_architecture": "Repository pattern with VectorSearchService"
            },
            similar_entities=similar_entity_models,
            total_found=len(similar_entity_models),
            search_metadata={
                "search_time_ms": round(search_time_ms, 2),
                "vector_index_used": "entity_vector_search_index",
                "similarity_metric": "cosine",
                "embedding_dimensions": 1536,
                "repository_benefits": [
                    "Clean data access abstraction",
                    "Enhanced error handling",
                    "Optimized query patterns"
                ]
            }
        )
        
    except Exception as e:
        logger.error(f"Vector search failed for entity {request.entity_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Vector search failed: {str(e)}"
        )


@router.post("/find_similar_by_text", response_model=VectorSearchResponse)
async def find_similar_entities_by_text(
    request: VectorSearchByTextRequest,
    vector_search_service: VectorSearchService = Depends(get_vector_search_service)
):
    """
    Find entities with profiles similar to a text description
    
    Uses the refactored VectorSearchService for narrative-based searches to find
    entities matching complex descriptions using AI embedding generation.
    
    **Semantic Search Magic:**
    - Natural language query understanding
    - AWS Bedrock Titan embedding generation
    - Behavioral and risk characteristic matching
    - Repository pattern for enhanced performance
    
    **Use Cases:**
    - "Find individuals involved in offshore shell companies"
    - "Locate entities with high-frequency transaction patterns"
    - "Identify organizations in financial services with compliance issues"
    - "Search for entities with politically exposed person (PEP) connections"
    
    **How it works:**
    1. Text query converted to 1536-dimensional embedding using AWS Bedrock
    2. Vector similarity search finds semantically similar entity profiles
    3. Results ranked by cosine similarity with configurable filtering
    
    Args:
        request: Vector search request with text query and filters
        
    Returns:
        VectorSearchResponse: Entities matching semantic description
    """
    try:
        start_time = time.time()
        
        logger.info(f"Executing text-based vector search for query: '{request.query_text[:100]}...'")
        
        # Execute semantic search through refactored service
        similar_entities = await vector_search_service.find_similar_entities_by_text(
            query_text=request.query_text,
            limit=request.limit,
            filters=request.filters or {},
            similarity_threshold=0.6  # Higher threshold for text queries
        )
        
        end_time = time.time()
        search_time_ms = (end_time - start_time) * 1000
        
        # Convert results to response models
        similar_entity_models = []
        for entity in similar_entities:
            try:
                # Remove MongoDB _id field to avoid serialization issues
                if isinstance(entity, dict):
                    entity.pop("_id", None)
                    similar_entity_models.append(SimilarEntity(**entity))
                else:
                    similar_entity_models.append(entity)
            except Exception as model_error:
                logger.error(f"Failed to create SimilarEntity model: {model_error}")
                continue
        
        logger.info(f"Text-based vector search completed in {search_time_ms:.2f}ms, found {len(similar_entity_models)} matching entities")
        
        return VectorSearchResponse(
            query_info={
                "query_text": request.query_text,
                "limit": request.limit,
                "filters_applied": request.filters or {},
                "search_type": "text_to_vector_search",
                "service_architecture": "Repository pattern with VectorSearchService"
            },
            similar_entities=similar_entity_models,
            total_found=len(similar_entity_models),
            search_metadata={
                "search_time_ms": round(search_time_ms, 2),
                "status": "ai_embedding_implemented",
                "message": "Using AWS Bedrock Titan for text embedding generation",
                "vector_index_used": "entity_vector_search_index",
                "similarity_metric": "cosine",
                "embedding_dimensions": 1536,
                "ai_features": [
                    "AWS Bedrock Titan embedding generation",
                    "Semantic understanding beyond text matching",
                    "Repository pattern integration"
                ]
            }
        )
        
    except Exception as e:
        logger.error(f"Text-based vector search failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Text-based vector search failed: {str(e)}"
        )


@router.get("/stats", response_model=VectorSearchStatsResponse)
async def get_vector_search_statistics(
    vector_search_service: VectorSearchService = Depends(get_vector_search_service)
):
    """
    Get comprehensive vector search capabilities and statistics
    
    Uses the refactored VectorSearchService to provide detailed information
    about vector search performance, coverage, and capabilities.
    
    **Enhanced Statistics:**
    - Repository-based metrics collection
    - Embedding coverage analysis
    - Search performance analytics
    - Vector index health monitoring
    
    Returns:
        VectorSearchStatsResponse: Comprehensive vector search statistics
    """
    try:
        logger.info("Getting vector search statistics through refactored service")
        
        # Get statistics through refactored service
        stats = await vector_search_service.get_vector_search_stats()
        
        logger.info("Vector search statistics retrieved successfully")
        
        return VectorSearchStatsResponse(**stats)
        
    except Exception as e:
        logger.error(f"Error getting vector search statistics: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get vector search statistics: {str(e)}"
        )


@router.post("/demo", response_model=VectorSearchDemoResponse)
async def demo_vector_search(
    request: VectorSearchDemoRequest,
    vector_search_service: VectorSearchService = Depends(get_vector_search_service)
):
    """
    Demonstrate vector search capabilities with predefined scenarios
    
    Uses the refactored VectorSearchService to showcase semantic search
    capabilities with known entities and comprehensive analysis.
    
    **Available Demo Scenarios:**
    - "high_risk_individual": Entities similar to high-risk individuals
    - "corporate_entity": Entities similar to corporate structures
    - "medium_risk_profile": Entities with moderate risk profiles
    - "offshore_patterns": Entities with offshore activity patterns
    
    Args:
        request: Demo request with scenario selection and parameters
        
    Returns:
        VectorSearchDemoResponse: Demo results with insights and explanations
    """
    try:
        start_time = time.time()
        
        logger.info(f"Executing vector search demo scenario: {request.scenario}")
        
        # Demo scenarios with known entity IDs and descriptions
        demo_scenarios = {
            "high_risk_individual": {
                "entity_id": "CDI-982BDB7D7B",  # Sam Brittany Miller - high risk
                "description": "Demonstrates finding individuals with similar high-risk profiles",
                "insights": [
                    "Identifies entities with similar risk characteristics using AI",
                    "Shows profile-based similarity beyond traditional name matching",
                    "Useful for investigation pattern analysis and risk assessment",
                    "Repository pattern provides clean, efficient data access"
                ]
            },
            "corporate_entity": {
                "entity_id": "ORG-101",
                "description": "Shows how to find organizations with similar business profiles",
                "insights": [
                    "Finds corporate entities with similar business activities",
                    "Identifies potential shell company networks through semantic similarity",
                    "Supports corporate investigation workflows with AI understanding",
                    "Enhanced performance through repository pattern"
                ]
            },
            "medium_risk_profile": {
                "entity_id": "CDI-431BB609EB",  # Samantha Miller - medium risk
                "description": "Finds entities with moderate risk profiles for comparison",
                "insights": [
                    "Demonstrates graduated risk similarity detection",
                    "Shows how vector search captures risk nuances and patterns",
                    "Useful for risk assessment validation and benchmarking",
                    "Repository pattern enables sophisticated similarity analysis"
                ]
            }
        }
        
        scenario_config = demo_scenarios.get(request.scenario)
        if not scenario_config:
            raise HTTPException(
                status_code=400,
                detail=f"Unknown scenario '{request.scenario}'. Available: {list(demo_scenarios.keys())}"
            )
        
        # Execute vector search demo through refactored service
        similar_entities = await vector_search_service.find_similar_entities_by_id(
            entity_id=scenario_config["entity_id"],
            limit=request.limit,
            similarity_threshold=0.5
        )
        
        end_time = time.time()
        search_time_ms = (end_time - start_time) * 1000
        
        # Convert results to response models
        similar_entity_models = []
        for entity in similar_entities:
            if isinstance(entity, dict):
                entity.pop("_id", None)
                similar_entity_models.append(SimilarEntity(**entity))
            else:
                similar_entity_models.append(entity)
        
        # Get query entity details through service
        query_entity = await vector_search_service.get_entity_by_id(scenario_config["entity_id"])
        if query_entity and isinstance(query_entity, dict):
            query_entity.pop("_id", None)
        
        logger.info(f"Vector search demo '{request.scenario}' completed in {search_time_ms:.2f}ms")
        
        return VectorSearchDemoResponse(
            scenario_name=request.scenario,
            scenario_description=scenario_config["description"],
            query_entity=query_entity,
            similar_entities=similar_entity_models,
            insights=scenario_config["insights"],
            search_time_ms=round(search_time_ms, 2),
            service_enhancements=[
                "Repository pattern for clean data access",
                "Enhanced error handling and logging",
                "Optimized vector search performance",
                "Consistent API patterns"
            ]
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Vector search demo failed for scenario '{request.scenario}': {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Demo vector search failed: {str(e)}"
        )


@router.get("/demo_scenarios")
async def get_vector_search_demo_scenarios():
    """
    Get available vector search demo scenarios
    
    Provides information about available demo scenarios that showcase
    vector search capabilities with the enhanced service architecture.
    
    Returns:
        Available demo scenarios with descriptions and expected results
    """
    return {
        "vector_search_demo_scenarios": [
            {
                "scenario_id": "high_risk_individual",
                "name": "High-Risk Individual Similarity",
                "description": "Find entities with similar high-risk characteristics",
                "expected_results": "Entities with similar risk profiles and behavioral patterns",
                "demo_insights": [
                    "AI-powered risk pattern recognition",
                    "Semantic understanding of risk characteristics",
                    "Repository pattern performance benefits"
                ]
            },
            {
                "scenario_id": "corporate_entity",
                "name": "Corporate Structure Similarity",
                "description": "Find organizations with similar business profiles",
                "expected_results": "Corporate entities with similar business activities",
                "demo_insights": [
                    "Business pattern recognition through AI",
                    "Shell company network detection",
                    "Enhanced data access through repository pattern"
                ]
            },
            {
                "scenario_id": "medium_risk_profile",
                "name": "Medium Risk Profile Analysis",
                "description": "Find entities with moderate risk profiles",
                "expected_results": "Entities with graduated risk similarity",
                "demo_insights": [
                    "Nuanced risk assessment capabilities",
                    "Profile comparison and benchmarking",
                    "Service architecture performance benefits"
                ]
            }
        ],
        "vector_search_strengths": [
            "AI-powered semantic understanding beyond text matching",
            "Behavioral pattern recognition and risk profiling",
            "Complex investigation support through similarity analysis",
            "Repository pattern for clean, efficient data access"
        ],
        "service_architecture_benefits": [
            "Repository pattern abstraction",
            "Enhanced error handling and validation",
            "Consistent API patterns across vector operations",
            "Optimized performance through clean data access"
        ],
        "usage_instructions": "Use POST /search/vector/demo with scenario selection to experience AI-powered entity discovery"
    }