"""
FastAPI routes for entity relationship management
"""

import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status, Query

from dependencies import get_async_db_dependency
from models.relationship import (
    CreateRelationshipRequest,
    UpdateRelationshipRequest,
    RelationshipQueryParams,
    RelationshipListResponse,
    RelationshipStats,
    RelationshipOperationResponse,
    RelationshipType,
    RelationshipStatus
)
from models.network import NetworkDataResponse
from services.relationship_manager import RelationshipManagerService
from services.network_service import NetworkService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/relationships", tags=["Entity Relationships"])

@router.post("", response_model=RelationshipOperationResponse)
async def create_relationship(
    request: CreateRelationshipRequest,
    db = Depends(get_async_db_dependency)
):
    """
    Create a new relationship between entities
    
    This endpoint creates a relationship record between two entities,
    including metadata about the relationship type, strength, and evidence.
    
    **Relationship Types:**
    - confirmed_same_entity: Entities are confirmed to be the same
    - potential_duplicate: Entities might be duplicates (needs review)
    - business_associate: Business relationship
    - family_member: Family relationship
    - shared_address: Entities share an address
    - shared_identifier: Entities share an identifier
    """
    try:
        logger.info(f"Creating relationship between {request.sourceEntityId} and {request.targetEntityId}")
        
        relationship_service = RelationshipManagerService(db)
        result = await relationship_service.create_relationship(request)
        
        return result
        
    except Exception as e:
        logger.error(f"Error creating relationship: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create relationship: {str(e)}"
        )

@router.put("/{relationship_id}", response_model=RelationshipOperationResponse)
async def update_relationship(
    relationship_id: str,
    request: UpdateRelationshipRequest,
    db = Depends(get_async_db_dependency)
):
    """
    Update an existing relationship
    
    Allows modification of relationship properties including type, strength,
    status, and evidence. Useful for updating relationship assessments over time.
    """
    try:
        logger.info(f"Updating relationship {relationship_id}")
        
        relationship_service = RelationshipManagerService(db)
        result = await relationship_service.update_relationship(relationship_id, request)
        
        return result
        
    except Exception as e:
        logger.error(f"Error updating relationship {relationship_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update relationship: {str(e)}"
        )

@router.delete("/{relationship_id}", response_model=RelationshipOperationResponse)
async def delete_relationship(
    relationship_id: str,
    db = Depends(get_async_db_dependency)
):
    """
    Delete a relationship
    
    Permanently removes a relationship record. Use with caution as this
    operation cannot be undone. Consider updating status to 'dismissed' instead.
    """
    try:
        logger.info(f"Deleting relationship {relationship_id}")
        
        relationship_service = RelationshipManagerService(db.database)
        result = await relationship_service.delete_relationship(relationship_id)
        
        return result
        
    except Exception as e:
        logger.error(f"Error deleting relationship {relationship_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete relationship: {str(e)}"
        )

@router.get("", response_model=RelationshipListResponse)
async def get_relationships(
    entity_id: Optional[str] = Query(None, description="Find relationships for specific entity"),
    relationship_type: Optional[RelationshipType] = Query(None, alias="type", description="Filter by relationship type"),
    status: Optional[RelationshipStatus] = Query(None, description="Filter by status"),
    min_strength: Optional[float] = Query(None, ge=0.0, le=1.0, description="Minimum strength threshold"),
    datasource: Optional[str] = Query(None, description="Filter by data source"),
    created_by: Optional[str] = Query(None, description="Filter by creator"),
    limit: int = Query(50, ge=1, le=1000, description="Maximum number of results"),
    skip: int = Query(0, ge=0, description="Number of results to skip"),
    db = Depends(get_async_db_dependency)
):
    """
    Get relationships based on query parameters
    
    Supports filtering and pagination for relationship queries.
    Useful for finding relationships for specific entities or
    analyzing relationship patterns.
    
    **Query Options:**
    - Filter by specific entity (returns all relationships involving that entity)
    - Filter by relationship type, status, or minimum strength
    - Pagination with skip and limit parameters
    - Filter by data source or creator for audit purposes
    """
    try:
        # Create query parameters
        params = RelationshipQueryParams(
            entityId=entity_id,
            type=relationship_type,
            status=status,
            minStrength=min_strength,
            datasource=datasource,
            createdBy=created_by,
            limit=limit,
            skip=skip
        )
        
        relationship_service = RelationshipManagerService(db.database)
        result = await relationship_service.get_relationships(params)
        
        logger.info(f"Retrieved {len(result.relationships)} relationships")
        
        return result
        
    except Exception as e:
        logger.error(f"Error getting relationships: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get relationships: {str(e)}"
        )

@router.get("/stats", response_model=RelationshipStats)
async def get_relationship_statistics(
    db = Depends(get_async_db_dependency)
):
    """
    Get statistics about relationships
    
    Returns summary statistics including:
    - Total number of relationships
    - Breakdown by relationship type and status
    - Average relationship strength
    - Count of high-confidence relationships
    
    Useful for monitoring the overall health and patterns
    in the entity relationship graph.
    """
    try:
        relationship_service = RelationshipManagerService(db.database)
        stats = await relationship_service.get_relationship_stats()
        
        logger.info("Retrieved relationship statistics")
        
        return stats
        
    except Exception as e:
        logger.error(f"Error getting relationship stats: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get relationship statistics: {str(e)}"
        )

@router.get("/network/{entity_id}", response_model=NetworkDataResponse)
async def get_entity_network(
    entity_id: str,
    max_depth: int = Query(2, ge=1, le=4, description="Maximum depth to traverse"),
    min_strength: float = Query(0.5, ge=0.0, le=1.0, description="Minimum relationship strength"),
    include_inactive: bool = Query(False, description="Include inactive relationships"),
    max_nodes: int = Query(100, ge=10, le=500, description="Maximum number of nodes"),
    db = Depends(get_async_db_dependency)
):
    """
    Get network of relationships for an entity
    
    Builds a graph of connected entities starting from the specified entity,
    traversing relationships up to the specified depth and strength threshold.
    
    **Network Analysis:**
    - MongoDB $graphLookup traversal from the center entity
    - Configurable depth and strength filtering
    - Returns nodes (entities) and edges (relationships)
    - Includes visualization metadata (colors, sizes)
    - Limited to 100 entities for performance
    
    **Use Cases:**
    - Entity relationship visualization
    - Connected component analysis
    - Risk propagation analysis
    - Investigation workflows
    """
    try:
        logger.info(f"Building network for entity {entity_id} (depth={max_depth}, min_strength={min_strength})")
        
        network_service = NetworkService(db)
        network = await network_service.build_entity_network(
            entity_id, 
            max_depth, 
            min_strength, 
            include_inactive,
            max_nodes
        )
        
        logger.info(f"Built network with {network.totalNodes} nodes and {network.totalEdges} edges")
        
        return network
        
    except Exception as e:
        logger.error(f"Error building entity network for {entity_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to build entity network: {str(e)}"
        )

@router.get("/entity/{entity_id}/summary")
async def get_entity_relationship_summary(
    entity_id: str,
    db = Depends(get_async_db_dependency)
):
    """
    Get a summary of relationships for a specific entity
    
    Returns condensed information about an entity's relationships,
    including counts by type, average strength, and key connections.
    """
    try:
        # Get relationships for this entity
        params = RelationshipQueryParams(entityId=entity_id, limit=1000)
        relationship_service = RelationshipManagerService(db.database)
        relationships_response = await relationship_service.get_relationships(params)
        
        relationships = relationships_response.relationships
        
        # Calculate summary statistics
        total_relationships = len(relationships)
        if total_relationships == 0:
            return {
                "entityId": entity_id,
                "totalRelationships": 0,
                "relationshipsByType": {},
                "relationshipsByStatus": {},
                "averageStrength": 0.0,
                "strongestRelationships": [],
                "recentRelationships": []
            }
        
        # Group by type and status
        by_type = {}
        by_status = {}
        total_strength = 0.0
        
        for rel in relationships:
            # Count by type
            rel_type = rel.type
            by_type[rel_type] = by_type.get(rel_type, 0) + 1
            
            # Count by status
            rel_status = rel.status
            by_status[rel_status] = by_status.get(rel_status, 0) + 1
            
            # Add to strength total
            total_strength += rel.strength
        
        average_strength = total_strength / total_relationships
        
        # Get strongest relationships (top 5)
        strongest = sorted(relationships, key=lambda r: r.strength, reverse=True)[:5]
        strongest_summary = [
            {
                "relationshipId": rel.id,
                "connectedEntityId": rel.target.entityId if rel.source.entityId == entity_id else rel.source.entityId,
                "connectedEntityName": rel.target.entityName if rel.source.entityId == entity_id else rel.source.entityName,
                "type": rel.type,
                "strength": rel.strength
            }
            for rel in strongest
        ]
        
        # Get most recent relationships (top 3)
        recent = sorted(relationships, key=lambda r: r.createdAt, reverse=True)[:3]
        recent_summary = [
            {
                "relationshipId": rel.id,
                "connectedEntityId": rel.target.entityId if rel.source.entityId == entity_id else rel.source.entityId,
                "connectedEntityName": rel.target.entityName if rel.source.entityId == entity_id else rel.source.entityName,
                "type": rel.type,
                "createdAt": rel.createdAt
            }
            for rel in recent
        ]
        
        return {
            "entityId": entity_id,
            "totalRelationships": total_relationships,
            "relationshipsByType": by_type,
            "relationshipsByStatus": by_status,
            "averageStrength": average_strength,
            "strongestRelationships": strongest_summary,
            "recentRelationships": recent_summary
        }
        
    except Exception as e:
        logger.error(f"Error getting relationship summary for {entity_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get relationship summary: {str(e)}"
        )