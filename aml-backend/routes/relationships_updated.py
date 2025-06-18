"""
Relationship Routes - Entity relationship management using enhanced service architecture

Updated routes for relationship management using:
- Refactored RelationshipService with repository pattern
- Clean dependency injection with enhanced services
- Network analysis integration through NetworkAnalysisService
"""

import logging
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query

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
from models.api.responses import ErrorResponse
from services.dependencies import (
    get_relationship_service,
    get_network_analysis_service
)
from services.core.relationship_service import RelationshipService
from services.network.network_analysis_service import NetworkAnalysisService

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/relationships",
    tags=["Entity Relationships"],
    responses={
        400: {"model": ErrorResponse, "description": "Bad request"},
        404: {"model": ErrorResponse, "description": "Relationship not found"},
        500: {"model": ErrorResponse, "description": "Internal server error"}
    }
)


@router.post("", response_model=RelationshipOperationResponse)
async def create_relationship(
    request: CreateRelationshipRequest,
    relationship_service: RelationshipService = Depends(get_relationship_service)
):
    """
    Create a new relationship between entities using enhanced service architecture
    
    Uses the refactored RelationshipService with repository pattern for clean
    relationship creation with comprehensive validation and evidence tracking.
    
    **Enhanced Relationship Creation:**
    - Repository pattern for clean data access
    - Advanced validation and entity checking
    - Automatic confidence scoring based on evidence
    - Comprehensive audit trail and relationship tracking
    
    **Supported Relationship Types:**
    - confirmed_same_entity: Entities confirmed to be the same
    - potential_duplicate: Entities might be duplicates (needs review)
    - business_associate: Business relationship
    - family_member: Family relationship
    - shared_address: Entities share an address
    - shared_identifier: Entities share an identifier
    
    Args:
        request: Relationship creation request with evidence and metadata
        
    Returns:
        RelationshipOperationResponse: Creation results with relationship details
    """
    try:
        logger.info(f"Creating enhanced relationship between {request.sourceEntityId} and {request.targetEntityId}")
        
        # Create relationship through enhanced service
        result = await relationship_service.create_relationship(request)
        
        logger.info(f"Enhanced relationship created successfully: {result.relationshipId}")
        
        return result
        
    except Exception as e:
        logger.error(f"Error creating enhanced relationship: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create relationship: {str(e)}"
        )


@router.put("/{relationship_id}", response_model=RelationshipOperationResponse)
async def update_relationship(
    relationship_id: str,
    request: UpdateRelationshipRequest,
    relationship_service: RelationshipService = Depends(get_relationship_service)
):
    """
    Update an existing relationship using enhanced service architecture
    
    Uses the refactored RelationshipService for comprehensive relationship updates
    with validation, confidence recalculation, and audit trail maintenance.
    
    **Enhanced Relationship Updates:**
    - Repository pattern for efficient updates
    - Automatic confidence recalculation
    - Validation and consistency checking
    - Enhanced audit trail with change tracking
    
    Args:
        relationship_id: Relationship identifier to update
        request: Update request with modified relationship data
        
    Returns:
        RelationshipOperationResponse: Update results with enhanced validation
    """
    try:
        logger.info(f"Updating enhanced relationship: {relationship_id}")
        
        # Update relationship through enhanced service
        result = await relationship_service.update_relationship(relationship_id, request)
        
        logger.info(f"Enhanced relationship updated successfully: {relationship_id}")
        
        return result
        
    except Exception as e:
        logger.error(f"Error updating enhanced relationship {relationship_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update relationship: {str(e)}"
        )


@router.delete("/{relationship_id}", response_model=RelationshipOperationResponse)
async def delete_relationship(
    relationship_id: str,
    relationship_service: RelationshipService = Depends(get_relationship_service)
):
    """
    Delete a relationship using enhanced service architecture
    
    Uses the refactored RelationshipService for safe relationship deletion
    with validation and audit trail preservation.
    
    **Enhanced Relationship Deletion:**
    - Repository pattern for safe deletion
    - Validation and dependency checking
    - Audit trail preservation
    - Enhanced error handling and logging
    
    Note: Consider updating status to 'dismissed' instead of permanent deletion
    for better audit trail preservation.
    
    Args:
        relationship_id: Relationship identifier to delete
        
    Returns:
        RelationshipOperationResponse: Deletion results with confirmation
    """
    try:
        logger.info(f"Deleting enhanced relationship: {relationship_id}")
        
        # Delete relationship through enhanced service
        result = await relationship_service.delete_relationship(relationship_id)
        
        logger.info(f"Enhanced relationship deleted successfully: {relationship_id}")
        
        return result
        
    except Exception as e:
        logger.error(f"Error deleting enhanced relationship {relationship_id}: {e}")
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
    relationship_service: RelationshipService = Depends(get_relationship_service)
):
    """
    Get relationships using enhanced service architecture with advanced filtering
    
    Uses the refactored RelationshipService for comprehensive relationship queries
    with repository pattern efficiency and enhanced filtering capabilities.
    
    **Enhanced Relationship Queries:**
    - Repository pattern for optimized queries
    - Advanced filtering and pagination
    - Enhanced relationship analytics
    - Comprehensive validation and error handling
    
    **Query Options:**
    - Filter by specific entity (returns all relationships involving that entity)
    - Filter by relationship type, status, or minimum strength
    - Pagination with skip and limit parameters
    - Filter by data source or creator for audit purposes
    
    Args:
        entity_id: Optional entity ID to filter relationships
        relationship_type: Optional relationship type filter
        status: Optional status filter
        min_strength: Optional minimum strength threshold
        datasource: Optional data source filter
        created_by: Optional creator filter
        limit: Maximum number of results to return
        skip: Number of results to skip for pagination
        
    Returns:
        RelationshipListResponse: Filtered relationships with enhanced metadata
    """
    try:
        # Create query parameters with enhanced validation
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
        
        logger.info(f"Getting enhanced relationships with parameters: entity_id={entity_id}, type={relationship_type}")
        
        # Get relationships through enhanced service
        result = await relationship_service.get_relationships(params)
        
        logger.info(f"Retrieved {len(result.relationships)} enhanced relationships")
        
        return result
        
    except Exception as e:
        logger.error(f"Error getting enhanced relationships: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get relationships: {str(e)}"
        )


@router.get("/stats", response_model=RelationshipStats)
async def get_relationship_statistics(
    relationship_service: RelationshipService = Depends(get_relationship_service)
):
    """
    Get comprehensive relationship statistics using enhanced service architecture
    
    Uses the refactored RelationshipService for detailed relationship analytics
    with repository pattern efficiency and enhanced statistical analysis.
    
    **Enhanced Relationship Statistics:**
    - Repository pattern for efficient analytics
    - Comprehensive relationship breakdowns
    - Advanced pattern analysis
    - Enhanced performance metrics
    
    Returns:
        RelationshipStats: Comprehensive relationship statistics and analytics
    """
    try:
        logger.info("Getting comprehensive relationship statistics")
        
        # Get statistics through enhanced service
        stats = await relationship_service.get_relationship_stats()
        
        logger.info("Enhanced relationship statistics retrieved successfully")
        
        return stats
        
    except Exception as e:
        logger.error(f"Error getting enhanced relationship stats: {e}")
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
    network_analysis_service: NetworkAnalysisService = Depends(get_network_analysis_service)
):
    """
    Get network of relationships for an entity using enhanced NetworkAnalysisService
    
    Uses the refactored NetworkAnalysisService for comprehensive network analysis
    with repository pattern efficiency and advanced graph algorithms.
    
    **Enhanced Network Analysis:**
    - Repository pattern for efficient graph operations
    - Advanced network analysis algorithms
    - Comprehensive visualization support
    - Enhanced performance and scalability
    
    **Network Building Features:**
    - MongoDB $graphLookup traversal optimization
    - Configurable depth and strength filtering
    - Advanced network analytics and insights
    - Visualization-ready data with styling
    
    Args:
        entity_id: Entity whose network to analyze
        max_depth: Maximum relationship traversal depth
        min_strength: Minimum relationship strength threshold
        include_inactive: Whether to include inactive relationships
        max_nodes: Maximum number of nodes in the result
        
    Returns:
        NetworkDataResponse: Enhanced network data with analytics
    """
    try:
        logger.info(f"Building enhanced network for entity {entity_id} (depth={max_depth}, min_strength={min_strength})")
        
        # Build network through enhanced service
        from models.network import NetworkQueryParams
        query_params = NetworkQueryParams(
            entity_id=entity_id,
            max_depth=max_depth,
            min_strength=min_strength,
            include_inactive=include_inactive,
            max_nodes=max_nodes
        )
        
        network = await network_analysis_service.build_entity_network(query_params)
        
        logger.info(f"Enhanced network built with {network.totalNodes} nodes and {network.totalEdges} edges")
        
        return network
        
    except Exception as e:
        logger.error(f"Error building enhanced entity network for {entity_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to build entity network: {str(e)}"
        )


@router.get("/entity/{entity_id}/summary")
async def get_entity_relationship_summary(
    entity_id: str,
    relationship_service: RelationshipService = Depends(get_relationship_service)
):
    """
    Get a comprehensive summary of relationships for a specific entity
    
    Uses the refactored RelationshipService for detailed relationship summaries
    with enhanced analytics and repository pattern efficiency.
    
    **Enhanced Relationship Summary:**
    - Repository pattern for efficient summary generation
    - Advanced relationship analytics and pattern detection
    - Comprehensive statistics and insights
    - Enhanced performance and detailed breakdowns
    
    Args:
        entity_id: Entity to generate relationship summary for
        
    Returns:
        Comprehensive relationship summary with enhanced analytics
    """
    try:
        logger.info(f"Getting enhanced relationship summary for entity: {entity_id}")
        
        # Get relationship summary through enhanced service
        summary = await relationship_service.get_entity_relationship_summary(entity_id)
        
        logger.info(f"Enhanced relationship summary generated for entity: {entity_id}")
        
        return summary
        
    except Exception as e:
        logger.error(f"Error getting enhanced relationship summary for {entity_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get relationship summary: {str(e)}"
        )


@router.post("/verify/{relationship_id}")
async def verify_relationship(
    relationship_id: str,
    verification_evidence: dict,
    relationship_service: RelationshipService = Depends(get_relationship_service)
):
    """
    Verify a relationship with additional evidence using enhanced service architecture
    
    Uses the refactored RelationshipService for comprehensive relationship verification
    with evidence processing and confidence recalculation.
    
    **Enhanced Relationship Verification:**
    - Repository pattern for efficient verification processing
    - Advanced evidence analysis and confidence scoring
    - Automatic verification status updates
    - Comprehensive audit trail maintenance
    
    Args:
        relationship_id: Relationship to verify
        verification_evidence: Additional evidence for verification
        
    Returns:
        Verification results with updated confidence and status
    """
    try:
        logger.info(f"Verifying enhanced relationship: {relationship_id}")
        
        # Verify relationship through enhanced service
        verification_result = await relationship_service.verify_relationship(
            relationship_id, verification_evidence
        )
        
        logger.info(f"Enhanced relationship verification completed: {relationship_id}")
        
        return verification_result
        
    except Exception as e:
        logger.error(f"Error verifying enhanced relationship {relationship_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to verify relationship: {str(e)}"
        )