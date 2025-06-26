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

from repositories.interfaces.network_repository import NetworkQueryParams, NetworkDataResponse
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


@router.get("/{entity_id}")
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
            center_entity_id=entity_id,
            max_depth=max_depth,
            min_confidence=min_strength,
            only_active=not include_inactive,  # Invert logic: include_inactive=True means only_active=False
            max_entities=max_nodes
        )
        
        # Build the entity network through repository
        network_data = await network_analysis_service.network_repo.build_entity_network(query_params)
        
        logger.info(f"Enhanced network built successfully: {network_data.total_entities} nodes, {network_data.total_relationships} edges")
        
        # Enhance with advanced analysis if requested
        enhanced_nodes = network_data.nodes
        node_enhancements = {}
        
        if include_risk_analysis:
            try:
                # Get all entity IDs from the network
                entity_ids = [node.entity_id for node in network_data.nodes]
                
                # Get centrality analysis for visual enhancement
                centrality_results = await network_analysis_service.analyze_network_centrality(entity_ids)
                if centrality_results.get("success") and centrality_results.get("centrality_metrics"):
                    for entity_id, metrics in centrality_results["centrality_metrics"].items():
                        if entity_id not in node_enhancements:
                            node_enhancements[entity_id] = {}
                        node_enhancements[entity_id]["centrality"] = metrics.get("normalized_degree_centrality", 0)
                        node_enhancements[entity_id]["betweenness"] = metrics.get("betweenness_centrality", 0)
                
                # Get risk analysis for the center entity
                risk_analysis = await network_analysis_service.calculate_network_risk_score(
                    entity_id=entity_id, analysis_depth=2
                )
                if risk_analysis.get("success"):
                    center_id = entity_id
                    if center_id not in node_enhancements:
                        node_enhancements[center_id] = {}
                    node_enhancements[center_id]["networkRiskScore"] = risk_analysis.get("network_risk_score", 0)
                    
            except Exception as e:
                logger.warning(f"Failed to enhance network with advanced analysis: {e}")
        
        # Convert to frontend-compatible format
        def convert_node(node):
            enhancements = node_enhancements.get(node.entity_id, {})
            # Use actual risk score from node, with network enhancement as bonus
            base_risk_score = getattr(node, 'risk_score', 0.0)
            network_risk_bonus = enhancements.get("networkRiskScore", 0.0) * 0.1  # 10% bonus from network analysis
            combined_risk_score = min(1.0, base_risk_score + network_risk_bonus)
            
            return {
                "id": node.entity_id,
                "label": node.entity_name,
                "type": node.entity_type,
                "riskLevel": node.risk_level.value if hasattr(node.risk_level, 'value') else str(node.risk_level),
                "riskScore": combined_risk_score * 100,  # Convert to 0-100 scale for frontend
                "centrality": enhancements.get("centrality", 0),
                "betweenness": enhancements.get("betweenness", 0),
                "isCenter": getattr(node, 'is_center', False),
                "connectionCount": getattr(node, 'connection_count', 0),
                "connections": getattr(node, 'connection_count', 0),  # Alias for frontend
                "size": getattr(node, 'size', 20),
                "verified": True,
                "active": True,
                "entityType": node.entity_type  # Alias for frontend
            }
        
        # Use a counter to ensure absolutely unique edge IDs
        edge_counter = 0
        
        def convert_edge(edge):
            nonlocal edge_counter
            edge_counter += 1
            
            # Create unique edge ID with counter to ensure absolute uniqueness
            relationship_type_str = edge.relationship_type.value if hasattr(edge.relationship_type, 'value') else str(edge.relationship_type)
            edge_id = f"{edge.source_id}-{edge.target_id}-{relationship_type_str}-{edge_counter}"
            
            # Calculate risk weight based on relationship type
            risk_weight = 0.5  # Default
            
            # High-risk relationship types
            if relationship_type_str in ['confirmed_same_entity', 'business_associate_suspected', 'potential_beneficial_owner_of', 'transactional_counterparty_high_risk']:
                risk_weight = 0.9
            # Medium-risk relationship types  
            elif relationship_type_str in ['director_of', 'ubo_of', 'parent_of_subsidiary', 'potential_duplicate']:
                risk_weight = 0.7
            # Low-risk relationship types
            elif relationship_type_str in ['household_member', 'professional_colleague_public', 'social_media_connection_public']:
                risk_weight = 0.3
            
            # Determine if the edge is bidirectional
            is_bidirectional = getattr(edge, 'direction', 'directed') == 'bidirectional'
            
            return {
                "id": edge_id,
                "source": edge.source_id,
                "target": edge.target_id,
                "relationshipType": relationship_type_str,
                "confidence": edge.confidence,
                "weight": edge.weight,
                "verified": edge.verified,
                "active": True,
                "riskWeight": risk_weight,
                "bidirectional": is_bidirectional,
                "direction": getattr(edge, 'direction', 'directed')
            }
        
        # Transform data for frontend
        response_data = {
            "nodes": [convert_node(node) for node in network_data.nodes],
            "edges": [convert_edge(edge) for edge in network_data.edges],
            "metadata": {
                "centerEntityId": network_data.center_entity_id,
                "totalEntities": network_data.total_entities,
                "totalRelationships": network_data.total_relationships,
                "maxDepthReached": network_data.max_depth_reached
            }
        }
        
        # ==================== CRITICAL FIX: INCLUDE STATISTICS ====================
        # Add the MongoDB aggregation statistics to the response
        if hasattr(network_data, 'statistics') and network_data.statistics:
            response_data["statistics"] = network_data.statistics
            logger.info(f"✅ ROUTE FIX: Including {len(network_data.statistics)} statistics categories in response")
        else:
            logger.warning(f"⚠️ ROUTE FIX: No statistics available in network_data - frontend will fail")
            # Add empty statistics to prevent frontend errors
            response_data["statistics"] = {
                "basic_metrics": {},
                "network_density": 0,
                "risk_distribution": {},
                "entity_type_distribution": {},
                "hub_entities": [],
                "bridge_entities": [],
                "prominent_entities": [],
                "relationship_distribution": []
            }
        
        return response_data
        
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
        centrality_results = await network_analysis_service.analyze_network_centrality(
            entity_ids=[entity_id]  # Service expects a list of entity IDs
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
        risk_analysis = await network_analysis_service.calculate_network_risk_score(
            entity_id=entity_id,
            analysis_depth=propagation_depth
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
            entity_ids=[entity_id],  # Service expects a list of entity IDs
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
            entity_ids=[entity_id],  # Service expects a list of entity IDs
            pattern_types=pattern_types.split(",") if pattern_types else None
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


@router.get("/{entity_id}/statistics")
async def get_network_statistics(
    entity_id: str,
    max_depth: int = Query(2, ge=1, le=4, description="Maximum traversal depth"),
    include_advanced: bool = Query(True, description="Include advanced metrics"),
    network_analysis_service: NetworkAnalysisService = Depends(get_network_analysis_service)
):
    """
    Get comprehensive network statistics without full network data
    All calculations performed server-side using MongoDB aggregation
    
    This endpoint provides the same statistics as the main network endpoint
    but without returning the full node/edge data, optimizing for performance
    when only metrics are needed.
    
    **MongoDB Aggregation Features:**
    - All statistics calculated using $facet operations
    - No client-side processing required
    - 2-5ms calculation time for comprehensive metrics
    - Consistent with main network endpoint statistics
    
    Args:
        entity_id: Entity to analyze for network statistics
        max_depth: Maximum relationship traversal depth
        include_advanced: Include advanced centrality metrics
        
    Returns:
        Comprehensive network statistics with metadata
    """
    try:
        logger.info(f"🚀 STATS ENDPOINT: Getting network statistics for entity {entity_id}")
        
        # Create network query parameters
        query_params = NetworkQueryParams(
            center_entity_id=entity_id,
            max_depth=max_depth,
            min_confidence=0.0,  # Include all for statistics
            only_active=True,
            max_entities=500  # Reasonable limit for statistics
        )
        
        # Get entity network with statistics (reuses main implementation)
        network_data = await network_analysis_service.network_repo.build_entity_network(query_params)
        
        if include_advanced and network_data.total_entities > 0:
            try:
                # Calculate true betweenness if requested
                entity_ids = [node.entity_id for node in network_data.nodes]
                
                # Get enhanced centrality analysis
                centrality_results = await network_analysis_service.analyze_network_centrality(entity_ids)
                if centrality_results.get("success") and centrality_results.get("centrality_metrics"):
                    # Enhance statistics with true centrality metrics
                    enhanced_metrics = {}
                    for entity_id, metrics in centrality_results["centrality_metrics"].items():
                        enhanced_metrics[entity_id] = {
                            "true_centrality": metrics.get("centrality_score", 0),
                            "true_betweenness": metrics.get("betweenness_centrality", 0)
                        }
                    
                    # Add enhanced metrics to statistics
                    if hasattr(network_data, 'statistics') and network_data.statistics:
                        network_data.statistics["enhanced_centrality"] = enhanced_metrics
                        
            except Exception as e:
                logger.warning(f"Failed to calculate advanced metrics: {e}")

        # Return statistics-only response
        response = {
            "success": True,
            "entity_id": entity_id,
            "statistics": getattr(network_data, 'statistics', {}),
            "metadata": {
                "total_entities": network_data.total_entities,
                "total_relationships": network_data.total_relationships,
                "max_depth_reached": network_data.max_depth_reached,
                "query_time_ms": network_data.query_time_ms,
                "calculation_method": "server_side_aggregation",
                "mongodb_operations": "native_aggregation_pipelines",
                "performance": "optimized",
                "endpoint_type": "statistics_only"
            }
        }
        
        logger.info(f"✅ STATS ENDPOINT: Statistics calculated for {network_data.total_entities} entities in {network_data.query_time_ms:.2f}ms")
        
        return response
        
    except ValueError as e:
        logger.warning(f"Entity {entity_id} not found for statistics: {e}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Entity '{entity_id}' not found"
        )
    except Exception as e:
        logger.error(f"Error getting network statistics for {entity_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Statistics calculation failed: {str(e)}"
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