"""
Network Analysis Service - Refactored to use repository pattern

Clean service focused on business logic for network analysis and graph visualization,
using NetworkRepository for all data access and graph operations.
"""

import logging
from typing import List, Dict, Any, Optional, Set
from datetime import datetime

from repositories.interfaces.network_repository import NetworkRepositoryInterface, NetworkQueryParams, NetworkDataResponse
from models.api.requests import NetworkRequest, EntityNetworkRequest
from models.api.responses import StandardResponse, NetworkResponse
from models.core.network import NetworkNode, NetworkEdge, RelationshipType

logger = logging.getLogger(__name__)


class NetworkAnalysisService:
    """
    Network Analysis service using repository pattern
    
    Focuses on business logic for network analysis, graph building, and visualization
    while delegating all data access to NetworkRepository.
    """
    
    def __init__(self, network_repo: NetworkRepositoryInterface):
        """
        Initialize Network Analysis service
        
        Args:
            network_repo: NetworkRepository for graph data access
        """
        self.network_repo = network_repo
        
        # Business logic configuration
        self.default_max_depth = 2
        self.default_max_entities = 100
        self.default_confidence_threshold = 0.5
        self.visualization_node_limit = 150
        
        # Risk color mapping for visualization
        self.risk_colors = {
            'critical': '#DC2626',  # Red
            'high': '#EA580C',      # Orange
            'medium': '#F59E0B',    # Amber  
            'low': '#16A34A',       # Green
            'unknown': '#6B7280'    # Gray
        }
        
        # Relationship type colors for edges
        self.relationship_colors = {
            RelationshipType.SAME_ENTITY: '#16A34A',           # Green
            RelationshipType.POTENTIAL_DUPLICATE: '#F59E0B',   # Amber
            RelationshipType.BUSINESS_ASSOCIATE: '#3B82F6',    # Blue
            RelationshipType.FAMILY_MEMBER: '#8B5CF6',         # Purple
            RelationshipType.SHARED_ADDRESS: '#06B6D4',        # Cyan
            RelationshipType.SHARED_IDENTIFIER: '#EF4444',     # Red
            RelationshipType.TRANSACTION_COUNTERPARTY: '#F97316', # Orange
            RelationshipType.CORPORATE_STRUCTURE: '#64748B',   # Slate
            RelationshipType.UNKNOWN: '#9CA3AF'                # Gray
        }
        
        logger.info("Network Analysis service initialized with repository pattern")
    
    # ==================== NETWORK BUILDING OPERATIONS ====================
    
    async def build_entity_network(self, request: EntityNetworkRequest) -> NetworkResponse:
        """
        Build a network graph for an entity
        
        Args:
            request: Network building request
            
        Returns:
            NetworkResponse: Network data with nodes and edges
        """
        start_time = datetime.utcnow()
        
        try:
            logger.info(f"Building network for entity {request.entity_id} with depth {request.max_depth}")
            
            # Prepare network query parameters
            query_params = NetworkQueryParams(
                center_entity_id=request.entity_id,
                max_depth=request.max_depth or self.default_max_depth,
                relationship_types=request.relationship_types,
                min_confidence=request.min_confidence or self.default_confidence_threshold,
                only_verified=request.only_verified or False,
                include_entity_types=request.include_entity_types,
                exclude_entity_types=request.exclude_entity_types,
                max_entities=min(request.max_entities or self.default_max_entities, self.visualization_node_limit),
                max_relationships=request.max_relationships or 500
            )
            
            # Build network through repository
            network_data = await self.network_repo.build_entity_network(query_params)
            
            # Process and enhance network for visualization
            enhanced_network = await self._enhance_network_for_visualization(
                network_data, request.layout_algorithm
            )
            
            # Calculate network statistics
            network_stats = await self._calculate_network_statistics(enhanced_network)
            
            processing_time = (datetime.utcnow() - start_time).total_seconds() * 1000
            
            logger.info(f"Built network with {len(enhanced_network.nodes)} nodes and {len(enhanced_network.edges)} edges in {processing_time:.2f}ms")
            
            return NetworkResponse(
                success=True,
                network_data=enhanced_network,
                statistics=network_stats,
                metadata={
                    "processing_time_ms": processing_time,
                    "query_parameters": query_params.__dict__,
                    "visualization_optimized": True
                }
            )
            
        except Exception as e:
            logger.error(f"Network building failed for entity {request.entity_id}: {e}")
            
            processing_time = (datetime.utcnow() - start_time).total_seconds() * 1000
            return NetworkResponse(
                success=False,
                network_data=None,
                error_message=f"Failed to build network: {str(e)}",
                metadata={"processing_time_ms": processing_time}
            )
    
    async def get_entity_connections(self, entity_id: str,
                                   max_depth: Optional[int] = None,
                                   relationship_types: Optional[List[RelationshipType]] = None,
                                   min_confidence: Optional[float] = None) -> Dict[str, Any]:
        """
        Get direct connections for an entity
        
        Args:
            entity_id: Entity ID to get connections for
            max_depth: Maximum relationship depth
            relationship_types: Filter by relationship types
            min_confidence: Minimum confidence threshold
            
        Returns:
            Dict: Entity connections data
        """
        try:
            logger.info(f"Getting connections for entity {entity_id}")
            
            # Get connections through repository
            connections = await self.network_repo.get_entity_connections(
                entity_id=entity_id,
                max_depth=max_depth or 1,
                relationship_types=relationship_types,
                min_confidence=min_confidence
            )
            
            # Process connections for analysis
            connection_analysis = await self._analyze_entity_connections(connections, entity_id)
            
            return {
                "success": True,
                "entity_id": entity_id,
                "total_connections": len(connections),
                "connections": connections,
                "analysis": connection_analysis
            }
            
        except Exception as e:
            logger.error(f"Failed to get entity connections for {entity_id}: {e}")
            return {
                "success": False,
                "entity_id": entity_id,
                "error": str(e)
            }
    
    async def find_relationship_path(self, source_entity_id: str, target_entity_id: str,
                                   max_depth: Optional[int] = None,
                                   relationship_types: Optional[List[RelationshipType]] = None) -> Dict[str, Any]:
        """
        Find path between two entities through relationships
        
        Args:
            source_entity_id: Starting entity ID
            target_entity_id: Target entity ID
            max_depth: Maximum path length
            relationship_types: Allowed relationship types
            
        Returns:
            Dict: Relationship path data
        """
        try:
            logger.info(f"Finding path from {source_entity_id} to {target_entity_id}")
            
            # Find path through repository
            path = await self.network_repo.find_relationship_path(
                source_entity_id=source_entity_id,
                target_entity_id=target_entity_id,
                max_depth=max_depth or 6,
                relationship_types=relationship_types
            )
            
            if not path:
                return {
                    "success": True,
                    "path_found": False,
                    "source_entity_id": source_entity_id,
                    "target_entity_id": target_entity_id,
                    "message": "No relationship path found"
                }
            
            # Analyze path strength and confidence
            path_analysis = await self._analyze_relationship_path(path)
            
            return {
                "success": True,
                "path_found": True,
                "source_entity_id": source_entity_id,
                "target_entity_id": target_entity_id,
                "path": path,
                "analysis": path_analysis
            }
            
        except Exception as e:
            logger.error(f"Path finding failed from {source_entity_id} to {target_entity_id}: {e}")
            return {
                "success": False,
                "source_entity_id": source_entity_id,
                "target_entity_id": target_entity_id,
                "error": str(e)
            }
    
    # ==================== NETWORK ANALYSIS OPERATIONS ====================
    
    async def analyze_network_centrality(self, entity_ids: List[str]) -> Dict[str, Any]:
        """
        Calculate centrality metrics for entities in a network
        
        Args:
            entity_ids: List of entity IDs to analyze
            
        Returns:
            Dict: Centrality analysis results
        """
        try:
            logger.info(f"Analyzing centrality for {len(entity_ids)} entities")
            
            # Calculate centrality metrics through repository
            centrality_metrics = await self.network_repo.calculate_centrality_metrics(entity_ids)
            
            # Identify key entities based on centrality
            key_entities = await self._identify_key_entities(centrality_metrics)
            
            # Generate insights from centrality analysis
            insights = await self._generate_centrality_insights(centrality_metrics)
            
            return {
                "success": True,
                "total_entities": len(entity_ids),
                "centrality_metrics": centrality_metrics,
                "key_entities": key_entities,
                "insights": insights
            }
            
        except Exception as e:
            logger.error(f"Centrality analysis failed: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    async def detect_network_communities(self, entity_ids: List[str],
                                       min_community_size: Optional[int] = None,
                                       resolution: Optional[float] = None) -> Dict[str, Any]:
        """
        Detect communities within entity network
        
        Args:
            entity_ids: List of entity IDs to analyze
            min_community_size: Minimum entities per community
            resolution: Community detection resolution parameter
            
        Returns:
            Dict: Community detection results
        """
        try:
            logger.info(f"Detecting communities in network of {len(entity_ids)} entities")
            
            # Detect communities through repository
            communities = await self.network_repo.detect_communities(
                entity_ids=entity_ids,
                min_community_size=min_community_size or 3,
                resolution=resolution or 1.0
            )
            
            # Analyze communities for insights
            community_analysis = await self._analyze_communities(communities)
            
            return {
                "success": True,
                "total_entities": len(entity_ids),
                "total_communities": len(communities),
                "communities": communities,
                "analysis": community_analysis
            }
            
        except Exception as e:
            logger.error(f"Community detection failed: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    async def calculate_network_risk_score(self, entity_id: str,
                                         analysis_depth: Optional[int] = None) -> Dict[str, Any]:
        """
        Calculate network-based risk score for an entity
        
        Args:
            entity_id: Entity to analyze
            analysis_depth: Depth of network analysis
            
        Returns:
            Dict: Network risk analysis results
        """
        try:
            logger.info(f"Calculating network risk for entity {entity_id}")
            
            # Calculate network risk through repository
            risk_analysis = await self.network_repo.calculate_network_risk_score(
                entity_id=entity_id,
                analysis_depth=analysis_depth or 2
            )
            
            # Enhance risk analysis with business logic
            enhanced_analysis = await self._enhance_risk_analysis(risk_analysis, entity_id)
            
            return {
                "success": True,
                "entity_id": entity_id,
                "risk_analysis": enhanced_analysis
            }
            
        except Exception as e:
            logger.error(f"Network risk calculation failed for {entity_id}: {e}")
            return {
                "success": False,
                "entity_id": entity_id,
                "error": str(e)
            }
    
    # ==================== PATTERN DETECTION ====================
    
    async def detect_suspicious_patterns(self, entity_ids: List[str],
                                       pattern_types: Optional[List[str]] = None) -> Dict[str, Any]:
        """
        Detect suspicious network patterns
        
        Args:
            entity_ids: Entities to analyze for patterns
            pattern_types: Types of patterns to detect
            
        Returns:
            Dict: Detected patterns
        """
        try:
            logger.info(f"Detecting suspicious patterns in {len(entity_ids)} entities")
            
            # Since find_suspicious_patterns is not implemented in the streamlined repository,
            # we'll implement basic pattern detection using available methods
            patterns_detected = {}
            total_patterns = 0
            
            # Pattern 1: Hub entities (check if target entities are hubs - OPTIMIZED)
            if not pattern_types or "hub_entities" in pattern_types:
                try:
                    hub_entities = []
                    # Instead of scanning all entities, check connection count for our target entities
                    for entity_id in entity_ids:
                        connections = await self.network_repo.get_entity_connections(
                            entity_id=entity_id,
                            max_depth=1,  # Only direct connections
                            relationship_types=None,
                            min_confidence=0.3
                        )
                        
                        connection_count = len(connections) if connections else 0
                        if connection_count >= 3:  # Hub threshold
                            hub_entities.append({
                                "entity_id": entity_id,
                                "connection_count": connection_count,
                                "pattern_type": "hub_entity",
                                "confidence": min(1.0, connection_count / 10.0)  # Scale confidence
                            })
                            logger.info(f"Entity {entity_id} is a hub with {connection_count} connections")
                    
                    if hub_entities:
                        patterns_detected["hub_entities"] = hub_entities
                        total_patterns += len(hub_entities)
                        logger.info(f"Detected {len(hub_entities)} hub entities among target entities")
                    else:
                        logger.info("No hub entities detected among target entities")
                        patterns_detected["hub_entities"] = []
                        
                except Exception as e:
                    logger.warning(f"Hub entity detection failed: {e}")
                    patterns_detected["hub_entities"] = []
            
            # Pattern 2: High centrality entities (using centrality metrics as proxy)
            if not pattern_types or "high_centrality" in pattern_types:
                try:
                    centrality_metrics = await self.network_repo.calculate_centrality_metrics(
                        entity_ids=entity_ids,
                        max_depth=2,
                        include_advanced=True
                    )
                    
                    high_centrality_entities = []
                    for entity_id, metrics in centrality_metrics.items():
                        # Consider entities with high degree centrality as potentially suspicious
                        degree_centrality = metrics.get("degree_centrality", 0)
                        if degree_centrality > 0.7:  # High centrality threshold
                            high_centrality_entities.append({
                                "entity_id": entity_id,
                                "centrality_score": degree_centrality,
                                "pattern_type": "high_centrality"
                            })
                    
                    if high_centrality_entities:
                        patterns_detected["high_centrality"] = high_centrality_entities
                        total_patterns += len(high_centrality_entities)
                        logger.info(f"Detected {len(high_centrality_entities)} high centrality entities")
                except Exception as e:
                    logger.warning(f"Centrality pattern detection failed: {e}")
                    patterns_detected["high_centrality"] = []
            
            # Pattern 3: Risk concentration (simplified - check base entity risk only)  
            if not pattern_types or "risk_concentration" in pattern_types:
                risk_concentration_entities = []
                
                # Get entities from database to check their base risk scores
                try:
                    entity_collection = self.network_repo.entity_collection
                    entities_cursor = entity_collection.find(
                        {"entityId": {"$in": entity_ids}},
                        {"entityId": 1, "riskAssessment": 1}
                    )
                    
                    async for entity in entities_cursor:
                        entity_id = entity.get("entityId")
                        risk_assessment = entity.get("riskAssessment", {}).get("overall", {})
                        base_risk_score = risk_assessment.get("score", 0)
                        
                        if base_risk_score > 70:  # High risk threshold
                            risk_concentration_entities.append({
                                "entity_id": entity_id,
                                "base_risk_score": base_risk_score,
                                "pattern_type": "risk_concentration",
                                "confidence": min(1.0, base_risk_score / 100.0)
                            })
                            logger.info(f"Entity {entity_id} has high base risk: {base_risk_score}")
                    
                    if risk_concentration_entities:
                        patterns_detected["risk_concentration"] = risk_concentration_entities
                        total_patterns += len(risk_concentration_entities)
                        logger.info(f"Detected {len(risk_concentration_entities)} high-risk entities")
                    else:
                        logger.info("No high-risk entities detected among target entities")
                        
                except Exception as e:
                    logger.warning(f"Risk concentration analysis failed: {e}")
                    patterns_detected["risk_concentration"] = []
            
            return {
                "success": True,
                "total_entities": len(entity_ids),
                "total_patterns": total_patterns,
                "patterns_detected": patterns_detected,
                "analysis": await self._analyze_suspicious_patterns(patterns_detected)
            }
            
        except Exception as e:
            logger.error(f"Pattern detection failed: {e}")
            return {
                "success": False,
                "total_patterns": 0,
                "patterns_detected": {},
                "error": str(e)
            }
    
    async def detect_hub_entities(self, min_connections: Optional[int] = None,
                                connection_types: Optional[List[RelationshipType]] = None) -> Dict[str, Any]:
        """
        Detect hub entities with many connections
        
        Args:
            min_connections: Minimum connections to be considered a hub
            connection_types: Types of connections to count
            
        Returns:
            Dict: Hub entities data
        """
        try:
            logger.info("Detecting hub entities in network")
            
            # Detect hub entities through repository
            hub_entities = await self.network_repo.detect_hub_entities(
                min_connections=min_connections or 10,
                connection_types=connection_types
            )
            
            # Analyze hub entities for insights
            hub_analysis = await self._analyze_hub_entities(hub_entities)
            
            return {
                "success": True,
                "total_hubs": len(hub_entities),
                "hub_entities": hub_entities,
                "analysis": hub_analysis
            }
            
        except Exception as e:
            logger.error(f"Hub detection failed: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    # ==================== VISUALIZATION SUPPORT ====================
    
    async def prepare_network_for_visualization(self, query_params: NetworkQueryParams,
                                              layout_algorithm: Optional[str] = None) -> Dict[str, Any]:
        """
        Prepare network data optimized for visualization
        
        Args:
            query_params: Network query parameters
            layout_algorithm: Preferred layout algorithm
            
        Returns:
            Dict: Visualization-ready network data
        """
        try:
            logger.info(f"Preparing network visualization for entity {query_params.center_entity_id}")
            
            # Get visualization-optimized network data through repository
            viz_data = await self.network_repo.prepare_network_for_visualization(
                params=query_params,
                layout_algorithm=layout_algorithm or "force"
            )
            
            # Add visualization styling and metadata
            enhanced_viz_data = await self._enhance_visualization_data(viz_data)
            
            return {
                "success": True,
                "visualization_data": enhanced_viz_data
            }
            
        except Exception as e:
            logger.error(f"Visualization preparation failed: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    # ==================== HELPER METHODS ====================
    
    async def _enhance_network_for_visualization(self, network_data: NetworkDataResponse,
                                               layout_algorithm: Optional[str] = None) -> NetworkDataResponse:
        """
        Enhance network data with visualization styling and positioning
        
        Args:
            network_data: Raw network data
            layout_algorithm: Layout algorithm for positioning
            
        Returns:
            NetworkDataResponse: Enhanced network data
        """
        try:
            # Calculate node positions if not already set
            if not any(hasattr(node, 'x') and hasattr(node, 'y') for node in network_data.nodes):
                positions = await self.network_repo.calculate_node_positions(
                    nodes=network_data.nodes,
                    edges=network_data.edges,
                    algorithm=layout_algorithm or "force"
                )
                
                # Apply positions to nodes
                for node in network_data.nodes:
                    node_id = getattr(node, 'id', None)
                    if node_id in positions:
                        x, y = positions[node_id]
                        setattr(node, 'x', x)
                        setattr(node, 'y', y)
            
            # Apply visual styling to nodes
            for node in network_data.nodes:
                await self._apply_node_styling(node)
            
            # Apply visual styling to edges
            for edge in network_data.edges:
                await self._apply_edge_styling(edge)
            
            return network_data
            
        except Exception as e:
            logger.warning(f"Visualization enhancement failed: {e}")
            return network_data
    
    async def _apply_node_styling(self, node: NetworkNode) -> None:
        """
        Apply visual styling to a network node
        
        Args:
            node: Network node to style
        """
        try:
            # Get risk level for color
            risk_level = getattr(node, 'risk_level', 'unknown')
            node_color = self.risk_colors.get(risk_level, self.risk_colors['unknown'])
            
            # Calculate node size based on risk or connection count
            risk_score = getattr(node, 'risk_score', 0.0)
            base_size = 20
            size_multiplier = 1 + (risk_score * 2)  # Scale 1-3x based on risk
            node_size = base_size * size_multiplier
            
            # Apply styling attributes
            setattr(node, 'color', node_color)
            setattr(node, 'size', min(node_size, 60))  # Cap maximum size
            setattr(node, 'strokeColor', '#ffffff')
            setattr(node, 'strokeWidth', 2)
            
        except Exception as e:
            logger.warning(f"Node styling failed: {e}")
    
    async def _apply_edge_styling(self, edge: NetworkEdge) -> None:
        """
        Apply visual styling to a network edge
        
        Args:
            edge: Network edge to style
        """
        try:
            # Get relationship type for color
            relationship_type = getattr(edge, 'relationship_type', RelationshipType.UNKNOWN)
            edge_color = self.relationship_colors.get(relationship_type, self.relationship_colors[RelationshipType.UNKNOWN])
            
            # Calculate edge width based on confidence
            confidence_score = getattr(edge, 'confidence_score', 0.5)
            edge_width = 1 + (confidence_score * 4)  # Width 1-5 based on confidence
            
            # Set dash pattern for unverified relationships
            verified = getattr(edge, 'verified', False)
            dash_pattern = "0" if verified else "5 5"
            
            # Apply styling attributes
            setattr(edge, 'color', edge_color)
            setattr(edge, 'width', edge_width)
            setattr(edge, 'dashPattern', dash_pattern)
            
        except Exception as e:
            logger.warning(f"Edge styling failed: {e}")
    
    async def _calculate_network_statistics(self, network_data: NetworkDataResponse) -> Dict[str, Any]:
        """
        Calculate comprehensive network statistics
        
        Args:
            network_data: Network data
            
        Returns:
            Dict: Network statistics
        """
        try:
            total_nodes = len(network_data.nodes)
            total_edges = len(network_data.edges)
            
            # Calculate node statistics
            node_stats = {
                "total_nodes": total_nodes,
                "node_types": {},
                "risk_distribution": {}
            }
            
            for node in network_data.nodes:
                # Count by type
                node_type = getattr(node, 'entity_type', 'unknown')
                node_stats["node_types"][node_type] = node_stats["node_types"].get(node_type, 0) + 1
                
                # Count by risk level
                risk_level = getattr(node, 'risk_level', 'unknown')
                node_stats["risk_distribution"][risk_level] = node_stats["risk_distribution"].get(risk_level, 0) + 1
            
            # Calculate edge statistics
            edge_stats = {
                "total_edges": total_edges,
                "relationship_types": {},
                "verification_status": {"verified": 0, "unverified": 0}
            }
            
            for edge in network_data.edges:
                # Count by relationship type
                rel_type = getattr(edge, 'relationship_type', 'unknown')
                edge_stats["relationship_types"][str(rel_type)] = edge_stats["relationship_types"].get(str(rel_type), 0) + 1
                
                # Count verification status
                verified = getattr(edge, 'verified', False)
                if verified:
                    edge_stats["verification_status"]["verified"] += 1
                else:
                    edge_stats["verification_status"]["unverified"] += 1
            
            # Calculate network density
            max_possible_edges = total_nodes * (total_nodes - 1) / 2 if total_nodes > 1 else 0
            density = total_edges / max_possible_edges if max_possible_edges > 0 else 0
            
            return {
                "node_statistics": node_stats,
                "edge_statistics": edge_stats,
                "network_metrics": {
                    "density": round(density, 4),
                    "max_depth_reached": getattr(network_data, 'max_depth_reached', 0),
                    "connectivity_ratio": round(total_edges / total_nodes if total_nodes > 0 else 0, 2)
                }
            }
            
        except Exception as e:
            logger.warning(f"Network statistics calculation failed: {e}")
            return {"error": str(e)}
    
    async def _analyze_entity_connections(self, connections: List[Dict[str, Any]], entity_id: str) -> Dict[str, Any]:
        """
        Analyze entity connections for insights
        
        Args:
            connections: List of entity connections
            entity_id: Central entity ID
            
        Returns:
            Dict: Connection analysis
        """
        analysis = {
            "connection_strength_distribution": {},
            "relationship_type_distribution": {},
            "verification_ratio": 0.0,
            "strongest_connections": [],
            "risk_indicators": []
        }
        
        try:
            if not connections:
                return analysis
            
            verified_count = 0
            strength_scores = []
            
            for conn in connections:
                # Analyze strength
                strength = conn.get("confidence_score", 0.0)
                strength_scores.append(strength)
                
                # Count verification
                if conn.get("verified", False):
                    verified_count += 1
                
                # Count relationship types
                rel_type = conn.get("relationship_type", "unknown")
                analysis["relationship_type_distribution"][rel_type] = analysis["relationship_type_distribution"].get(rel_type, 0) + 1
            
            # Calculate verification ratio
            analysis["verification_ratio"] = verified_count / len(connections)
            
            # Find strongest connections
            sorted_connections = sorted(connections, key=lambda x: x.get("confidence_score", 0.0), reverse=True)
            analysis["strongest_connections"] = sorted_connections[:5]
            
            # Identify risk indicators
            if analysis["verification_ratio"] < 0.3:
                analysis["risk_indicators"].append("Low verification ratio")
            
            if len(connections) > 50:
                analysis["risk_indicators"].append("High connectivity entity")
            
            return analysis
            
        except Exception as e:
            logger.warning(f"Connection analysis failed: {e}")
            return analysis
    
    async def _analyze_relationship_path(self, path: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Analyze relationship path for strength and confidence
        
        Args:
            path: Relationship path
            
        Returns:
            Dict: Path analysis
        """
        try:
            if not path:
                return {"error": "Empty path"}
            
            path_length = len(path)
            confidence_scores = [rel.get("confidence_score", 0.0) for rel in path]
            
            # Calculate overall path confidence (weakest link)
            min_confidence = min(confidence_scores) if confidence_scores else 0.0
            avg_confidence = sum(confidence_scores) / len(confidence_scores) if confidence_scores else 0.0
            
            # Count verified relationships
            verified_count = sum(1 for rel in path if rel.get("verified", False))
            verification_ratio = verified_count / path_length
            
            # Determine path reliability
            if min_confidence >= 0.8 and verification_ratio >= 0.8:
                reliability = "high"
            elif min_confidence >= 0.6 and verification_ratio >= 0.6:
                reliability = "medium"
            else:
                reliability = "low"
            
            return {
                "path_length": path_length,
                "min_confidence": min_confidence,
                "avg_confidence": avg_confidence,
                "verification_ratio": verification_ratio,
                "reliability": reliability,
                "relationship_types": [rel.get("relationship_type", "unknown") for rel in path]
            }
            
        except Exception as e:
            logger.warning(f"Path analysis failed: {e}")
            return {"error": str(e)}
    
    async def _identify_key_entities(self, centrality_metrics: Dict[str, Dict[str, float]]) -> List[Dict[str, Any]]:
        """
        Identify key entities based on centrality metrics
        
        Args:
            centrality_metrics: Centrality metrics by entity
            
        Returns:
            List: Key entities with their metrics
        """
        try:
            key_entities = []
            
            for entity_id, metrics in centrality_metrics.items():
                # Calculate composite importance score
                degree_centrality = metrics.get("degree_centrality", 0.0)
                betweenness_centrality = metrics.get("betweenness_centrality", 0.0)
                closeness_centrality = metrics.get("closeness_centrality", 0.0)
                
                importance_score = (degree_centrality * 0.4 + 
                                  betweenness_centrality * 0.4 + 
                                  closeness_centrality * 0.2)
                
                if importance_score > 0.5:  # Threshold for key entities
                    key_entities.append({
                        "entity_id": entity_id,
                        "importance_score": importance_score,
                        "metrics": metrics,
                        "key_reason": self._determine_key_reason(metrics)
                    })
            
            # Sort by importance score
            key_entities.sort(key=lambda x: x["importance_score"], reverse=True)
            
            return key_entities[:10]  # Top 10 key entities
            
        except Exception as e:
            logger.warning(f"Key entity identification failed: {e}")
            return []
    
    def _determine_key_reason(self, metrics: Dict[str, float]) -> str:
        """
        Determine why an entity is considered key
        
        Args:
            metrics: Centrality metrics
            
        Returns:
            str: Reason for being key
        """
        degree = metrics.get("degree_centrality", 0.0)
        betweenness = metrics.get("betweenness_centrality", 0.0)
        closeness = metrics.get("closeness_centrality", 0.0)
        
        if degree > 0.7:
            return "High connectivity hub"
        elif betweenness > 0.7:
            return "Critical network bridge"
        elif closeness > 0.7:
            return "Central network position"
        else:
            return "Overall network importance"
    
    async def _generate_centrality_insights(self, centrality_metrics: Dict[str, Dict[str, float]]) -> List[str]:
        """
        Generate insights from centrality analysis
        
        Args:
            centrality_metrics: Centrality metrics
            
        Returns:
            List[str]: Generated insights
        """
        insights = []
        
        try:
            if not centrality_metrics:
                return ["No centrality data available"]
            
            # Find highest degree centrality
            max_degree = max(metrics.get("degree_centrality", 0.0) for metrics in centrality_metrics.values())
            if max_degree > 0.8:
                insights.append("Network contains highly connected hub entities")
            
            # Find highest betweenness centrality
            max_betweenness = max(metrics.get("betweenness_centrality", 0.0) for metrics in centrality_metrics.values())
            if max_betweenness > 0.7:
                insights.append("Network has critical bridge entities controlling information flow")
            
            # Analyze overall connectivity
            avg_degree = sum(metrics.get("degree_centrality", 0.0) for metrics in centrality_metrics.values()) / len(centrality_metrics)
            if avg_degree > 0.6:
                insights.append("Network shows high overall connectivity")
            elif avg_degree < 0.2:
                insights.append("Network is sparsely connected")
            
            return insights
            
        except Exception as e:
            logger.warning(f"Insight generation failed: {e}")
            return ["Unable to generate insights"]
    
    async def _analyze_communities(self, communities: List[List[str]]) -> Dict[str, Any]:
        """
        Analyze detected communities
        
        Args:
            communities: Detected communities
            
        Returns:
            Dict: Community analysis
        """
        try:
            if not communities:
                return {"message": "No communities detected"}
            
            # Calculate community size distribution
            sizes = [len(community) for community in communities]
            
            analysis = {
                "total_communities": len(communities),
                "average_community_size": sum(sizes) / len(sizes),
                "largest_community_size": max(sizes),
                "smallest_community_size": min(sizes),
                "size_distribution": {
                    "small (2-5 entities)": sum(1 for size in sizes if 2 <= size <= 5),
                    "medium (6-15 entities)": sum(1 for size in sizes if 6 <= size <= 15),
                    "large (16+ entities)": sum(1 for size in sizes if size >= 16)
                }
            }
            
            # Generate insights
            insights = []
            if len(communities) > 10:
                insights.append("Network is highly fragmented with many small communities")
            if max(sizes) > 20:
                insights.append("Network contains large cohesive groups")
            
            analysis["insights"] = insights
            
            return analysis
            
        except Exception as e:
            logger.warning(f"Community analysis failed: {e}")
            return {"error": str(e)}
    
    async def _enhance_risk_analysis(self, risk_analysis: Dict[str, Any], entity_id: str) -> Dict[str, Any]:
        """
        Enhance risk analysis with business logic
        
        Args:
            risk_analysis: Raw risk analysis from repository
            entity_id: Entity ID
            
        Returns:
            Dict: Enhanced risk analysis
        """
        try:
            enhanced = risk_analysis.copy()
            
            # Add risk level categorization - updated for 0-100 scale
            risk_score = risk_analysis.get("network_risk_score", 0.0)
            if risk_score >= 80:
                enhanced["risk_level"] = "critical"
                enhanced["recommended_actions"] = ["Immediate investigation required", "Enhanced monitoring"]
            elif risk_score >= 60:
                enhanced["risk_level"] = "high"
                enhanced["recommended_actions"] = ["Detailed review recommended", "Increased monitoring"]
            elif risk_score >= 40:
                enhanced["risk_level"] = "medium"
                enhanced["recommended_actions"] = ["Periodic review", "Standard monitoring"]
            else:
                enhanced["risk_level"] = "low"
                enhanced["recommended_actions"] = ["Standard procedures"]
            
            # Add contextual information
            enhanced["analysis_timestamp"] = datetime.utcnow().isoformat()
            enhanced["entity_id"] = entity_id
            
            return enhanced
            
        except Exception as e:
            logger.warning(f"Risk analysis enhancement failed: {e}")
            return risk_analysis
    
    async def _analyze_suspicious_patterns(self, patterns: Dict[str, List[Dict[str, Any]]]) -> Dict[str, Any]:
        """
        Analyze detected suspicious patterns
        
        Args:
            patterns: Detected patterns by type
            
        Returns:
            Dict: Pattern analysis
        """
        try:
            analysis = {
                "total_patterns": sum(len(pattern_list) for pattern_list in patterns.values()),
                "pattern_summary": {},
                "risk_indicators": [],
                "recommended_actions": []
            }
            
            for pattern_type, pattern_list in patterns.items():
                if pattern_list:
                    analysis["pattern_summary"][pattern_type] = len(pattern_list)
                    
                    # Add specific risk indicators based on pattern type
                    if pattern_type == "circular_relationships" and len(pattern_list) > 0:
                        analysis["risk_indicators"].append("Circular relationship patterns detected")
                        analysis["recommended_actions"].append("Investigate circular relationship chains")
                    
                    if pattern_type == "hub_entities" and len(pattern_list) > 5:
                        analysis["risk_indicators"].append("Multiple hub entities identified")
                        analysis["recommended_actions"].append("Review hub entity activities")
            
            return analysis
            
        except Exception as e:
            logger.warning(f"Pattern analysis failed: {e}")
            return {"error": str(e)}
    
    async def _analyze_hub_entities(self, hub_entities: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Analyze hub entities for insights
        
        Args:
            hub_entities: List of hub entities
            
        Returns:
            Dict: Hub analysis
        """
        try:
            if not hub_entities:
                return {"message": "No hub entities detected"}
            
            # Calculate connection statistics
            connection_counts = [hub.get("connection_count", 0) for hub in hub_entities]
            
            analysis = {
                "total_hubs": len(hub_entities),
                "average_connections": sum(connection_counts) / len(connection_counts),
                "max_connections": max(connection_counts),
                "min_connections": min(connection_counts),
                "insights": []
            }
            
            # Generate insights
            if max(connection_counts) > 50:
                analysis["insights"].append("Network contains super-hubs with extensive connections")
            
            if len(hub_entities) > 10:
                analysis["insights"].append("Network has multiple hub entities indicating complex structure")
            
            return analysis
            
        except Exception as e:
            logger.warning(f"Hub analysis failed: {e}")
            return {"error": str(e)}
    
    async def _enhance_visualization_data(self, viz_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Enhance visualization data with additional styling and metadata
        
        Args:
            viz_data: Raw visualization data
            
        Returns:
            Dict: Enhanced visualization data
        """
        try:
            enhanced = viz_data.copy()
            
            # Add visualization metadata
            enhanced["visualization_config"] = {
                "recommended_zoom": 1.0,
                "center_focus": True,
                "animation_duration": 750,
                "physics_enabled": True,
                "clustering_enabled": len(viz_data.get("nodes", [])) > 100
            }
            
            # Add legend information
            enhanced["legend"] = {
                "node_colors": self.risk_colors,
                "edge_colors": {str(k): v for k, v in self.relationship_colors.items()},
                "size_meaning": "Node size represents risk level",
                "edge_meaning": "Edge thickness represents confidence level"
            }
            
            return enhanced
            
        except Exception as e:
            logger.warning(f"Visualization enhancement failed: {e}")
            return viz_data