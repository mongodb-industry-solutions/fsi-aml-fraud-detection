"""
Network Analysis Routes - Entity relationship networks and graph visualization

Focused routes for network analysis capabilities using NetworkAnalysisService:
- Entity relationship network building using $graphLookup
- Network centrality analysis and community detection
- Risk propagation and suspicious pattern detection
- Network visualization data preparation
"""

import logging
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status

from models.network import NetworkDataResponse, NetworkQueryParams
from models.api.responses import ErrorResponse
from services.dependencies import get_network_analysis_service
from services.network.network_analysis_service import NetworkAnalysisService

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/network",
    tags=["Network Analysis"],
    responses={
        404: {"model": ErrorResponse, "description": "Entity not found"},
        500: {"model": ErrorResponse, "description": "Internal server error"}
    }
)


@router.get("/{entity_id}", response_model=NetworkDataResponse)
async def get_entity_network(
    entity_id: str,
    max_depth: int = Query(default=2, ge=1, le=4, description="Maximum traversal depth"),
    min_strength: float = Query(default=0.5, ge=0.0, le=1.0, description="Minimum relationship strength"),
    include_inactive: bool = Query(default=False, description="Include inactive relationships"),
    max_nodes: int = Query(default=100, ge=10, le=500, description="Maximum number of nodes to return"),
    include_risk_analysis: bool = Query(default=True, description="Include risk propagation analysis"),
    network_analysis_service: NetworkAnalysisService = Depends(get_network_analysis_service)
):
    """
    Build entity relationship network using enhanced NetworkAnalysisService
    
    Uses the refactored NetworkAnalysisService for comprehensive network analysis
    with repository pattern data access, advanced graph algorithms, and visualization support.
    
    **Enhanced Network Analysis Features:**
    - Repository-based graph operations using NetworkRepository
    - Advanced centrality analysis (degree, betweenness, closeness)
    - Community detection and clustering algorithms
    - Risk propagation analysis through relationship networks
    - Visualization-ready data with styling and positioning
    
    **Network Building Algorithm:**
    - MongoDB $graphLookup for efficient multi-hop traversal
    - Configurable depth and strength filtering
    - Performance optimization for large networks
    - Suspicious pattern detection and risk assessment
    
    Args:
        entity_id: Starting entity for network building
        max_depth: Maximum relationship traversal depth (1-4)
        min_strength: Minimum relationship strength threshold (0.0-1.0)
        include_inactive: Whether to include inactive relationships
        max_nodes: Maximum number of nodes in the result
        include_risk_analysis: Whether to include risk propagation analysis
        
    Returns:
        NetworkDataResponse: Complete network data with nodes, edges, and analytics
    """
    try:
        logger.info(f"Building enhanced network for entity {entity_id} with max_depth={max_depth}, min_strength={min_strength}")
        
        # Create network query parameters
        query_params = NetworkQueryParams(
            entity_id=entity_id,
            max_depth=max_depth,
            min_strength=min_strength,
            include_inactive=include_inactive,
            max_nodes=max_nodes,
            include_risk_analysis=include_risk_analysis
        )
        
        # Build the entity network through enhanced service
        network_data = await network_analysis_service.build_entity_network(query_params)
        
        logger.info(f"Enhanced network built successfully: {network_data.totalNodes} nodes, {network_data.totalEdges} edges")
        
        return network_data
        
    except ValueError as e:
        # Handle specific entity not found error
        logger.warning(f"Entity {entity_id} not found for network building: {e}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Entity '{entity_id}' not found"
        )
    except Exception as e:
        logger.error(f"Error building enhanced network for entity {entity_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Network building failed: {str(e)}"
        )


@router.get("/{entity_id}/centrality")
async def get_network_centrality_analysis(
    entity_id: str,
    centrality_type: str = Query("all", description="Type of centrality analysis (degree, betweenness, closeness, all)"),
    network_scope: int = Query(3, ge=1, le=4, description="Network scope for centrality calculation"),
    network_analysis_service: NetworkAnalysisService = Depends(get_network_analysis_service)
):
    """
    Get centrality analysis for entity in its network context
    
    Uses the enhanced NetworkAnalysisService to perform sophisticated centrality
    analysis using advanced graph algorithms and repository-based data access.
    
    **Enhanced Centrality Analysis:**
    - Degree centrality: Number of direct connections
    - Betweenness centrality: Entity's role as a bridge between others
    - Closeness centrality: How close entity is to all others in network
    - Repository pattern for efficient graph traversal
    
    Args:
        entity_id: Entity to analyze for centrality
        centrality_type: Type of centrality analysis to perform
        network_scope: How many hops to include in centrality calculation
        
    Returns:
        Centrality analysis results with interpretation and insights
    """
    try:
        logger.info(f"Performing centrality analysis for entity {entity_id}, type: {centrality_type}")
        
        # Get centrality analysis through enhanced service
        centrality_results = await network_analysis_service.analyze_entity_centrality(
            entity_id=entity_id,
            centrality_type=centrality_type,
            network_scope=network_scope
        )
        
        logger.info(f"Centrality analysis completed for entity {entity_id}")
        
        return centrality_results
        
    except ValueError as e:
        logger.warning(f"Entity {entity_id} not found for centrality analysis: {e}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Entity '{entity_id}' not found"
        )
    except Exception as e:
        logger.error(f"Error performing centrality analysis for {entity_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Centrality analysis failed: {str(e)}"
        )


@router.get("/{entity_id}/risk_propagation")
async def get_risk_propagation_analysis(
    entity_id: str,
    propagation_depth: int = Query(3, ge=1, le=4, description="How many hops to analyze for risk propagation"),
    risk_threshold: float = Query(0.6, ge=0.0, le=1.0, description="Minimum risk level to consider"),
    network_analysis_service: NetworkAnalysisService = Depends(get_network_analysis_service)
):
    """
    Analyze risk propagation through entity's network
    
    Uses the enhanced NetworkAnalysisService to perform sophisticated risk
    propagation analysis through relationship networks with repository-based efficiency.
    
    **Enhanced Risk Propagation Features:**
    - Multi-hop risk transmission analysis
    - Risk amplification and dampening factors
    - Suspicious pattern detection in risk networks
    - Repository pattern for efficient risk data access
    
    Args:
        entity_id: Starting entity for risk propagation analysis
        propagation_depth: How many relationship hops to analyze
        risk_threshold: Minimum risk level to include in analysis
        
    Returns:
        Risk propagation analysis with pathways and amplification factors
    """
    try:
        logger.info(f"Analyzing risk propagation for entity {entity_id}, depth: {propagation_depth}")
        
        # Get risk propagation analysis through enhanced service
        risk_analysis = await network_analysis_service.analyze_risk_propagation(
            entity_id=entity_id,
            propagation_depth=propagation_depth,
            risk_threshold=risk_threshold
        )
        
        logger.info(f"Risk propagation analysis completed for entity {entity_id}")
        
        return risk_analysis
        
    except ValueError as e:
        logger.warning(f"Entity {entity_id} not found for risk propagation analysis: {e}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Entity '{entity_id}' not found"
        )
    except Exception as e:
        logger.error(f"Error analyzing risk propagation for {entity_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Risk propagation analysis failed: {str(e)}"
        )


@router.get("/{entity_id}/communities")
async def get_network_community_detection(
    entity_id: str,
    community_algorithm: str = Query("modularity", description="Community detection algorithm (modularity, connected_components)"),
    min_community_size: int = Query(3, ge=2, le=50, description="Minimum community size to report"),
    network_analysis_service: NetworkAnalysisService = Depends(get_network_analysis_service)
):
    """
    Detect communities in entity's network using advanced algorithms
    
    Uses the enhanced NetworkAnalysisService to perform sophisticated community
    detection using advanced graph algorithms and repository-based data access.
    
    **Enhanced Community Detection:**
    - Modularity-based community detection for natural groupings
    - Connected components analysis for isolated clusters
    - Community statistics and characteristics analysis
    - Repository pattern for efficient community data processing
    
    Args:
        entity_id: Entity whose network to analyze for communities
        community_algorithm: Algorithm to use for community detection
        min_community_size: Minimum size for communities to report
        
    Returns:
        Community detection results with member lists and characteristics
    """
    try:
        logger.info(f"Detecting communities in network for entity {entity_id}, algorithm: {community_algorithm}")
        
        # Get community detection through enhanced service
        community_results = await network_analysis_service.detect_network_communities(
            entity_id=entity_id,
            algorithm=community_algorithm,
            min_community_size=min_community_size
        )
        
        logger.info(f"Community detection completed for entity {entity_id}")
        
        return community_results
        
    except ValueError as e:
        logger.warning(f"Entity {entity_id} not found for community detection: {e}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Entity '{entity_id}' not found"
        )
    except Exception as e:
        logger.error(f"Error detecting communities for {entity_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Community detection failed: {str(e)}"
        )


@router.get("/{entity_id}/suspicious_patterns")
async def detect_suspicious_network_patterns(
    entity_id: str,
    pattern_types: Optional[str] = Query(None, description="Specific pattern types to detect (hubs, circles, clusters)"),
    sensitivity: float = Query(0.7, ge=0.1, le=1.0, description="Detection sensitivity (higher = more patterns detected)"),
    network_analysis_service: NetworkAnalysisService = Depends(get_network_analysis_service)
):
    """
    Detect suspicious patterns in entity's network
    
    Uses the enhanced NetworkAnalysisService to identify suspicious patterns
    using advanced graph analysis algorithms and repository-based pattern detection.
    
    **Enhanced Suspicious Pattern Detection:**
    - Hub detection: Entities with unusually high connectivity
    - Circular patterns: Potential money laundering cycles
    - Cluster analysis: Tightly connected suspicious groups
    - Repository pattern for efficient pattern data access
    
    Args:
        entity_id: Entity whose network to analyze for suspicious patterns
        pattern_types: Specific types of patterns to detect
        sensitivity: Detection sensitivity level
        
    Returns:
        Suspicious pattern detection results with risk assessments
    """
    try:
        logger.info(f"Detecting suspicious patterns for entity {entity_id}, sensitivity: {sensitivity}")
        
        # Get suspicious pattern detection through enhanced service
        pattern_results = await network_analysis_service.detect_suspicious_patterns(
            entity_id=entity_id,
            pattern_types=pattern_types.split(",") if pattern_types else None,
            sensitivity=sensitivity
        )
        
        logger.info(f"Suspicious pattern detection completed for entity {entity_id}")
        
        return pattern_results
        
    except ValueError as e:
        logger.warning(f"Entity {entity_id} not found for pattern detection: {e}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Entity '{entity_id}' not found"
        )
    except Exception as e:
        logger.error(f"Error detecting suspicious patterns for {entity_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Suspicious pattern detection failed: {str(e)}"
        )


@router.get("/{entity_id}/visualization")
async def get_network_visualization_data(
    entity_id: str,
    layout_algorithm: str = Query("force_directed", description="Layout algorithm (force_directed, circular, hierarchical)"),
    include_styling: bool = Query(True, description="Include node and edge styling information"),
    optimize_for_size: Optional[int] = Query(None, description="Optimize layout for specific node count"),
    network_analysis_service: NetworkAnalysisService = Depends(get_network_analysis_service)
):
    """
    Get network visualization data optimized for frontend display
    
    Uses the enhanced NetworkAnalysisService to prepare network data specifically
    optimized for visualization with styling, positioning, and performance optimization.
    
    **Enhanced Visualization Features:**
    - Multiple layout algorithms (force-directed, circular, hierarchical)
    - Advanced node and edge styling based on properties
    - Performance optimization for different network sizes
    - Repository pattern for efficient visualization data preparation
    
    Args:
        entity_id: Entity whose network to prepare for visualization
        layout_algorithm: Algorithm to use for node positioning
        include_styling: Whether to include styling information
        optimize_for_size: Optimize for specific network size
        
    Returns:
        Visualization-ready network data with positioning and styling
    """
    try:
        logger.info(f"Preparing visualization data for entity {entity_id}, layout: {layout_algorithm}")
        
        # Get visualization data through enhanced service
        visualization_data = await network_analysis_service.prepare_network_visualization(
            entity_id=entity_id,
            layout_algorithm=layout_algorithm,
            include_styling=include_styling,
            optimize_for_size=optimize_for_size
        )
        
        logger.info(f"Visualization data prepared for entity {entity_id}")
        
        return visualization_data
        
    except ValueError as e:
        logger.warning(f"Entity {entity_id} not found for visualization: {e}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Entity '{entity_id}' not found"
        )
    except Exception as e:
        logger.error(f"Error preparing visualization data for {entity_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Visualization data preparation failed: {str(e)}"
        )


@router.get("/stats/global")
async def get_global_network_statistics(
    network_analysis_service: NetworkAnalysisService = Depends(get_network_analysis_service)
):
    """
    Get global network statistics across all entities
    
    Uses the enhanced NetworkAnalysisService to provide comprehensive
    statistics about the overall entity relationship network.
    
    **Enhanced Global Statistics:**
    - Network density and connectivity metrics
    - Community structure analysis
    - Risk distribution across the network
    - Repository pattern for efficient global analysis
    
    Returns:
        Global network statistics and health metrics
    """
    try:
        logger.info("Getting global network statistics")
        
        # Get global statistics through enhanced service
        global_stats = await network_analysis_service.get_global_network_statistics()
        
        logger.info("Global network statistics retrieved successfully")
        
        return global_stats
        
    except Exception as e:
        logger.error(f"Error getting global network statistics: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get global network statistics: {str(e)}"
        )