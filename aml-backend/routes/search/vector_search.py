"""
Vector Search Routes - Clean Repository Pattern Implementation

Streamlined vector search API using repository pattern directly:
- Entity similarity search using AI embeddings
- Direct repository integration without service layer abstraction
- Simple request/response flow matching frontend expectations
"""

import logging
import time
import os
from typing import Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status

from models.api.vector_search import (
    SimilarEntitiesRequest,
    SimilarEntitiesResponse,
    SimilarEntity
)
from models.api.responses import ErrorResponse
from repositories.factory.repository_factory import get_vector_search_repository
from repositories.interfaces.vector_search_repository import VectorSearchRepositoryInterface

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/search/vector",
    tags=["Vector Search - Repository Pattern"],
    responses={
        400: {"model": ErrorResponse, "description": "Bad request"},
        404: {"model": ErrorResponse, "description": "Entity not found"},
        500: {"model": ErrorResponse, "description": "Internal server error"}
    }
)


@router.post("/find_similar_by_entity", response_model=SimilarEntitiesResponse)
async def find_similar_entities_by_entity(
    request: SimilarEntitiesRequest,
    vector_search_repo: VectorSearchRepositoryInterface = Depends(get_vector_search_repository)
):
    """
    Find entities with similar profiles using vector similarity
    
    **Clean Repository Pattern Implementation:**
    - Direct repository usage without service layer abstraction
    - AI-powered semantic similarity using embeddings
    - Simple request/response flow matching frontend expectations
    
    **Use Cases:**
    - Discovering entities with similar risk profiles
    - Finding related entities for compliance investigations
    - Uncovering potential networks based on profile similarity
    
    Args:
        request: Entity ID and search parameters
        
    Returns:
        SimilarEntitiesResponse: Similar entities with similarity scores
    """
    try:
        start_time = time.time()
        
        logger.info(f"Executing vector search for entity: {request.entity_id} with embedding type: {request.embedding_type}")
        
        # Use repository directly for clean, simple implementation
        similar_entity_docs = await vector_search_repo.find_similar_by_entity_id(
            entity_id=request.entity_id,
            limit=request.limit,
            filters=request.filters,
            embedding_type=request.embedding_type
        )
        
        end_time = time.time()
        search_time_ms = (end_time - start_time) * 1000
        
        # Determine which index was used
        embedding_type = request.embedding_type or "identifier"
        if embedding_type == "identifier":
            index_name = os.getenv("ENTITY_IDENTIFIER_VECTOR_INDEX", "entity_identifier_vector_index")
        elif embedding_type == "behavioral":
            index_name = os.getenv("ENTITY_BEHAVIORAL_VECTOR_INDEX", "entity_behavioral_vector_index")
        else:
            index_name = os.getenv("ENTITY_VECTOR_SEARCH_INDEX", "entity_vector_search_index")
        
        # Transform repository results to API response format
        similar_entities = []
        for doc in similar_entity_docs:
            try:
                # Use the actual entityId field (not MongoDB _id)
                entity_id = doc.get("entityId", "")
                similarity_score = doc.pop("similarity_score", 0.0)
                
                # Clean up MongoDB _id field for response
                doc.pop("_id", None)
                
                similar_entity = SimilarEntity(
                    entityId=entity_id,
                    name=doc.get("name"),
                    entityType=doc.get("entityType"),
                    riskAssessment=doc.get("riskAssessment"),
                    profileSummaryText=doc.get("profileSummaryText"),
                    vectorSearchScore=similarity_score
                )
                similar_entities.append(similar_entity)
                
            except Exception as e:
                logger.warning(f"Failed to process similar entity: {e}")
                continue
        
        search_metadata = {
            "search_time_ms": round(search_time_ms, 2),
            "total_found": len(similar_entities),
            "entity_id": request.entity_id,
            "embedding_type": embedding_type,
            "similarity_metric": "cosine",
            "vector_index_used": index_name,
            "repository_pattern": True
        }
        
        logger.info(f"Vector search completed in {search_time_ms:.2f}ms, found {len(similar_entities)} similar entities")
        
        return SimilarEntitiesResponse(
            similar_entities=similar_entities,
            search_metadata=search_metadata
        )
        
    except Exception as e:
        logger.error(f"Vector search failed for entity {request.entity_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Vector search failed: {str(e)}"
        )


# Removed legacy endpoints - using clean repository pattern implementation only