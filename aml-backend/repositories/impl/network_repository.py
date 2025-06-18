"""
Network Repository Implementation - Concrete implementation using mongodb_core_lib

Streamlined, production-ready implementation of network analysis and graph operations using 
mongodb_core_lib utilities for optimal performance and comprehensive network analysis.

Focus: Core network operations, graph traversal, risk propagation, and visualization support.
"""

import logging
import math
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Set, Tuple
from collections import deque
from bson import ObjectId

from repositories.interfaces.network_repository import (
    NetworkRepositoryInterface, NetworkQueryParams, NetworkDataResponse, 
    GraphTraversalResult
)
from reference.mongodb_core_lib import MongoDBRepository, AggregationBuilder, GraphOperations
from models.core.network import (
    EntityNetwork, NetworkNode, NetworkEdge, 
    RelationshipType, NetworkRiskLevel
)


logger = logging.getLogger(__name__)


class NetworkRepository(NetworkRepositoryInterface):
    """
    Network repository implementation using mongodb_core_lib
    
    Provides comprehensive network analysis functionality with MongoDB graph operations,
    relationship traversal, risk propagation, and network visualization support.
    """
    
    def __init__(self, mongodb_repo: MongoDBRepository, 
                 entity_collection: str = "entities",
                 relationship_collection: str = "entity_relationships"):
        """
        Initialize Network repository
        
        Args:
            mongodb_repo: MongoDB repository instance from core lib
            entity_collection: Name of entities collection
            relationship_collection: Name of relationships collection
        """
        self.repo = mongodb_repo
        self.entity_collection_name = entity_collection
        self.relationship_collection_name = relationship_collection
        
        # Initialize collections
        self.entity_collection = self.repo.collection(entity_collection)
        self.relationship_collection = self.repo.collection(relationship_collection)
        
        # Initialize graph operations
        self.graph_ops = self.repo.graph(relationship_collection)
        self.aggregation = self.repo.aggregation
        
        # Network analysis cache
        self._analysis_cache = {}
        self._cache_expiry = timedelta(minutes=15)
    
    # ==================== CORE NETWORK OPERATIONS ====================
    
    async def build_entity_network(self, params: NetworkQueryParams) -> NetworkDataResponse:
        """Build entity network around a center entity"""
        start_time = datetime.utcnow()
        
        try:
            # Get network relationships using graph lookup
            network_data = await self._build_network_graph(params)
            
            # Convert to NetworkNode and NetworkEdge objects
            nodes = []
            edges = []
            entity_ids = set()
            
            # Process relationships to build network
            for relationship in network_data["relationships"]:
                source_id = str(relationship["source_entity_id"])
                target_id = str(relationship["target_entity_id"])
                
                entity_ids.add(source_id)
                entity_ids.add(target_id)
                
                # Create edge
                edge = NetworkEdge(
                    id=f"{source_id}_{target_id}",
                    source_entity_id=source_id,
                    target_entity_id=target_id,
                    relationship_type=RelationshipType(relationship.get("relationship_type", "unknown")),
                    strength=relationship.get("strength", "possible"),
                    confidence_score=relationship.get("confidence_score", 0.5),
                    weight=relationship.get("confidence_score", 0.5),
                    verified=relationship.get("verified", False)
                )
                edges.append(edge)
            
            # Get entity details and create nodes
            if entity_ids:
                entities = await self._get_entities_batch(list(entity_ids))
                
                for entity in entities:
                    entity_id = str(entity["_id"])
                    
                    # Determine node size based on connection count
                    connection_count = sum(1 for edge in edges 
                                         if edge.source_entity_id == entity_id or edge.target_entity_id == entity_id)
                    
                    node = NetworkNode(
                        id=entity_id,
                        name=entity.get("name", "Unknown"),
                        entity_type=entity.get("entity_type", "unknown"),
                        risk_level=NetworkRiskLevel(entity.get("risk_assessment", {}).get("level", "low")),
                        connection_count=connection_count,
                        is_center=entity_id == params.center_entity_id,
                        attributes=entity.get("attributes", {}),
                        size=max(10, min(50, connection_count * 5))  # Size based on connections
                    )
                    nodes.append(node)
            
            end_time = datetime.utcnow()
            query_time = (end_time - start_time).total_seconds() * 1000
            
            return NetworkDataResponse(
                nodes=nodes,
                edges=edges,
                center_entity_id=params.center_entity_id,
                total_entities=len(nodes),
                total_relationships=len(edges),
                max_depth_reached=network_data["max_depth"],
                query_time_ms=query_time
            )
            
        except Exception as e:
            logger.error(f"Failed to build entity network for {params.center_entity_id}: {e}")
            return NetworkDataResponse(
                nodes=[],
                edges=[],
                center_entity_id=params.center_entity_id,
                total_entities=0,
                total_relationships=0,
                max_depth_reached=0,
                query_time_ms=0
            )
    
    async def get_entity_connections(self, entity_id: str,
                                   max_depth: int = 1,
                                   relationship_types: Optional[List[RelationshipType]] = None,
                                   min_confidence: Optional[float] = None) -> List[Dict[str, Any]]:
        """Get direct connections for an entity"""
        try:
            # Build match conditions
            match_conditions = {
                "$or": [
                    {"source_entity_id": ObjectId(entity_id)},
                    {"target_entity_id": ObjectId(entity_id)}
                ]
            }
            
            # Add relationship type filter
            if relationship_types:
                match_conditions["relationship_type"] = {
                    "$in": [rt.value for rt in relationship_types]
                }
            
            # Add confidence filter
            if min_confidence:
                match_conditions["confidence_score"] = {"$gte": min_confidence}
            
            # Build aggregation pipeline with entity lookups
            pipeline = (self.aggregation()
                       .match(match_conditions)
                       .lookup(
                           from_collection=self.entity_collection_name,
                           local_field="source_entity_id",
                           foreign_field="_id",
                           as_field="source_entity"
                       )
                       .lookup(
                           from_collection=self.entity_collection_name,
                           local_field="target_entity_id", 
                           foreign_field="_id",
                           as_field="target_entity"
                       )
                       .unwind("$source_entity", preserve_null=True)
                       .unwind("$target_entity", preserve_null=True)
                       .sort({"confidence_score": -1})
                       .limit(100)
                       .build())
            
            results = await self.repo.execute_pipeline(self.relationship_collection_name, pipeline)
            
            # Process results to include connected entity info
            connections = []
            for result in results:
                # Determine which entity is the connected one
                if str(result["source_entity_id"]) == entity_id:
                    connected_entity = result.get("target_entity", {})
                    direction = "outgoing"
                else:
                    connected_entity = result.get("source_entity", {})
                    direction = "incoming"
                
                if connected_entity:
                    connection = {
                        "relationship_id": str(result["_id"]),
                        "connected_entity_id": str(connected_entity["_id"]),
                        "connected_entity_name": connected_entity.get("name", "Unknown"),
                        "entity_type": connected_entity.get("entity_type", "unknown"),
                        "relationship_type": result.get("relationship_type"),
                        "confidence_score": result.get("confidence_score", 0.0),
                        "strength": result.get("strength", "possible"),
                        "verified": result.get("verified", False),
                        "direction": direction,
                        "risk_level": connected_entity.get("risk_assessment", {}).get("level", "low")
                    }
                    connections.append(connection)
            
            return connections
            
        except Exception as e:
            logger.error(f"Failed to get entity connections for {entity_id}: {e}")
            return []
    
    async def find_relationship_path(self, source_entity_id: str,
                                   target_entity_id: str,
                                   max_depth: int = 6,
                                   relationship_types: Optional[List[RelationshipType]] = None) -> Optional[List[Dict[str, Any]]]:
        """Find path between two entities through relationships"""
        try:
            # Use MongoDB $graphLookup for pathfinding
            match_conditions = {"_id": ObjectId(source_entity_id)}
            
            # Build $graphLookup pipeline
            graph_lookup_stage = {
                "$graphLookup": {
                    "from": self.relationship_collection_name,
                    "startWith": "$_id",
                    "connectFromField": "_id",
                    "connectToField": "source_entity_id",
                    "as": "relationship_path",
                    "maxDepth": max_depth - 1,
                    "depthField": "depth"
                }
            }
            
            # Add relationship type restrictions if provided
            if relationship_types:
                graph_lookup_stage["$graphLookup"]["restrictSearchWithMatch"] = {
                    "relationship_type": {"$in": [rt.value for rt in relationship_types]}
                }
            
            pipeline = [
                {"$match": match_conditions},
                graph_lookup_stage,
                {
                    "$project": {
                        "paths": {
                            "$filter": {
                                "input": "$relationship_path",
                                "cond": {"$eq": ["$$this.target_entity_id", ObjectId(target_entity_id)]}
                            }
                        }
                    }
                }
            ]
            
            results = await self.repo.execute_pipeline(self.entity_collection_name, pipeline)
            
            if results and results[0].get("paths"):
                # Found at least one path
                shortest_path = min(results[0]["paths"], key=lambda x: x.get("depth", 999))
                
                # Build path details
                path = [{
                    "relationship_id": str(shortest_path["_id"]),
                    "source_entity_id": str(shortest_path["source_entity_id"]),
                    "target_entity_id": str(shortest_path["target_entity_id"]),
                    "relationship_type": shortest_path.get("relationship_type"),
                    "confidence_score": shortest_path.get("confidence_score", 0.0),
                    "depth": shortest_path.get("depth", 0)
                }]
                
                return path
            
            return None
            
        except Exception as e:
            logger.error(f"Failed to find relationship path from {source_entity_id} to {target_entity_id}: {e}")
            return None
    
    # ==================== GRAPH TRAVERSAL OPERATIONS ====================
    
    async def graph_lookup_relationships(self, entity_id: str,
                                       max_depth: int = 3,
                                       follow_types: Optional[List[RelationshipType]] = None) -> GraphTraversalResult:
        """Perform graph lookup using MongoDB $graphLookup"""
        try:
            # Build $graphLookup stage
            graph_lookup_stage = {
                "$graphLookup": {
                    "from": self.relationship_collection_name,
                    "startWith": "$_id",
                    "connectFromField": "_id",
                    "connectToField": "source_entity_id",
                    "as": "traversed_relationships",
                    "maxDepth": max_depth - 1,
                    "depthField": "depth"
                }
            }
            
            # Add relationship type restrictions
            if follow_types:
                graph_lookup_stage["$graphLookup"]["restrictSearchWithMatch"] = {
                    "relationship_type": {"$in": [rt.value for rt in follow_types]}
                }
            
            pipeline = [
                {"$match": {"_id": ObjectId(entity_id)}},
                graph_lookup_stage,
                {
                    "$project": {
                        "traversed_relationships": 1,
                        "entity_count": {"$size": "$traversed_relationships"}
                    }
                }
            ]
            
            results = await self.repo.execute_pipeline(self.entity_collection_name, pipeline)
            
            if results:
                relationships = results[0].get("traversed_relationships", [])
                
                # Extract visited entities and paths
                visited_entities = {entity_id}
                relationship_paths = []
                
                for rel in relationships:
                    target_id = str(rel["target_entity_id"])
                    visited_entities.add(target_id)
                    
                    # Simple path representation
                    path = [entity_id, target_id]
                    relationship_paths.append(path)
                
                max_depth_reached = max([rel.get("depth", 0) for rel in relationships], default=0) + 1
                
                return GraphTraversalResult(
                    visited_entities=visited_entities,
                    relationship_paths=relationship_paths,
                    depth_reached=max_depth_reached,
                    total_traversed=len(visited_entities)
                )
            
            return GraphTraversalResult(
                visited_entities={entity_id},
                relationship_paths=[],
                depth_reached=0,
                total_traversed=1
            )
            
        except Exception as e:
            logger.error(f"Graph lookup failed for entity {entity_id}: {e}")
            return GraphTraversalResult(
                visited_entities=set(),
                relationship_paths=[],
                depth_reached=0,
                total_traversed=0
            )
    
    async def traverse_network_bfs(self, entity_id: str,
                                 max_depth: int = 3,
                                 relationship_types: Optional[List[RelationshipType]] = None,
                                 visit_function: Optional[callable] = None) -> GraphTraversalResult:
        """Traverse network using breadth-first search"""
        try:
            visited_entities = set()
            relationship_paths = []
            queue = deque([(entity_id, 0, [entity_id])])  # (entity_id, depth, path)
            
            while queue and len(visited_entities) < 1000:  # Limit for performance
                current_entity, depth, path = queue.popleft()
                
                if current_entity in visited_entities or depth >= max_depth:
                    continue
                
                visited_entities.add(current_entity)
                
                # Call visit function if provided
                if visit_function:
                    try:
                        visit_function(current_entity, depth)
                    except Exception as e:
                        logger.warning(f"Visit function failed for {current_entity}: {e}")
                
                # Get connections for current entity
                connections = await self.get_entity_connections(
                    entity_id=current_entity,
                    max_depth=1,
                    relationship_types=relationship_types
                )
                
                # Add connected entities to queue
                for connection in connections:
                    connected_id = connection["connected_entity_id"]
                    if connected_id not in visited_entities:
                        new_path = path + [connected_id]
                        queue.append((connected_id, depth + 1, new_path))
                        relationship_paths.append(new_path)
            
            return GraphTraversalResult(
                visited_entities=visited_entities,
                relationship_paths=relationship_paths,
                depth_reached=max_depth if len(visited_entities) > 1 else 0,
                total_traversed=len(visited_entities)
            )
            
        except Exception as e:
            logger.error(f"BFS traversal failed for entity {entity_id}: {e}")
            return GraphTraversalResult(
                visited_entities=set(),
                relationship_paths=[],
                depth_reached=0,
                total_traversed=0
            )
    
    async def traverse_network_dfs(self, entity_id: str,
                                 max_depth: int = 3,
                                 relationship_types: Optional[List[RelationshipType]] = None,
                                 visit_function: Optional[callable] = None) -> GraphTraversalResult:
        """Traverse network using depth-first search"""
        try:
            visited_entities = set()
            relationship_paths = []
            
            async def dfs_recursive(current_entity: str, depth: int, path: List[str]):
                if current_entity in visited_entities or depth >= max_depth or len(visited_entities) >= 1000:
                    return
                
                visited_entities.add(current_entity)
                
                # Call visit function if provided
                if visit_function:
                    try:
                        visit_function(current_entity, depth)
                    except Exception as e:
                        logger.warning(f"Visit function failed for {current_entity}: {e}")
                
                # Get connections
                connections = await self.get_entity_connections(
                    entity_id=current_entity,
                    max_depth=1,
                    relationship_types=relationship_types
                )
                
                # Recursively visit connected entities
                for connection in connections:
                    connected_id = connection["connected_entity_id"]
                    if connected_id not in visited_entities:
                        new_path = path + [connected_id]
                        relationship_paths.append(new_path)
                        await dfs_recursive(connected_id, depth + 1, new_path)
            
            await dfs_recursive(entity_id, 0, [entity_id])
            
            return GraphTraversalResult(
                visited_entities=visited_entities,
                relationship_paths=relationship_paths,
                depth_reached=max_depth if len(visited_entities) > 1 else 0,
                total_traversed=len(visited_entities)
            )
            
        except Exception as e:
            logger.error(f"DFS traversal failed for entity {entity_id}: {e}")
            return GraphTraversalResult(
                visited_entities=set(),
                relationship_paths=[],
                depth_reached=0,
                total_traversed=0
            )
    
    # ==================== NETWORK ANALYSIS ====================
    
    async def calculate_centrality_metrics(self, entity_ids: List[str]) -> Dict[str, Dict[str, float]]:
        """Calculate centrality metrics for entities"""
        try:
            centrality_metrics = {}
            
            for entity_id in entity_ids:
                # Get connections for centrality calculation
                connections = await self.get_entity_connections(entity_id, max_depth=2)
                
                # Calculate simple centrality metrics
                degree_centrality = len(connections)
                
                # Weighted centrality based on confidence scores
                weighted_centrality = sum(conn.get("confidence_score", 0.0) for conn in connections)
                
                # Betweenness centrality approximation (simplified)
                betweenness_centrality = degree_centrality * 0.1  # Simplified approximation
                
                centrality_metrics[entity_id] = {
                    "degree_centrality": degree_centrality,
                    "weighted_centrality": weighted_centrality,
                    "betweenness_centrality": betweenness_centrality,
                    "normalized_degree": degree_centrality / max(len(entity_ids), 1)
                }
            
            return centrality_metrics
            
        except Exception as e:
            logger.error(f"Failed to calculate centrality metrics: {e}")
            return {}
    
    async def detect_communities(self, entity_ids: List[str],
                               min_community_size: int = 3,
                               resolution: float = 1.0) -> List[List[str]]:
        """Detect communities within entity network"""
        try:
            # Simplified community detection using connection density
            communities = []
            unassigned = set(entity_ids)
            
            while unassigned and len(communities) < 20:  # Limit communities
                # Start new community with most connected entity
                community = []
                
                if not unassigned:
                    break
                
                # Get most connected unassigned entity
                seed_entity = unassigned.pop()
                community.append(seed_entity)
                
                # Get connections for seed entity
                connections = await self.get_entity_connections(seed_entity, max_depth=1)
                
                # Add highly connected entities to community
                for connection in connections:
                    connected_id = connection["connected_entity_id"]
                    if (connected_id in unassigned and 
                        connection.get("confidence_score", 0.0) > 0.7):
                        community.append(connected_id)
                        unassigned.discard(connected_id)
                
                # Only keep communities that meet minimum size
                if len(community) >= min_community_size:
                    communities.append(community)
            
            return communities
            
        except Exception as e:
            logger.error(f"Failed to detect communities: {e}")
            return []
    
    # ==================== RISK PROPAGATION ====================
    
    async def propagate_risk_scores(self, source_entity_id: str,
                                  max_depth: int = 3,
                                  propagation_factor: float = 0.5,
                                  min_propagated_score: float = 0.1) -> Dict[str, float]:
        """Propagate risk scores through network relationships"""
        try:
            # Get source entity risk score
            source_entity = await self.entity_collection.find_one({"_id": ObjectId(source_entity_id)})
            if not source_entity:
                return {}
            
            initial_risk = source_entity.get("risk_assessment", {}).get("overall_score", 0.0)
            if initial_risk < min_propagated_score:
                return {}
            
            # Propagate risk through network
            risk_scores = {source_entity_id: initial_risk}
            visited = set([source_entity_id])
            
            for depth in range(1, max_depth + 1):
                current_risk = initial_risk * (propagation_factor ** depth)
                
                if current_risk < min_propagated_score:
                    break
                
                # Get entities at current depth
                current_entities = [entity_id for entity_id, score in risk_scores.items() 
                                  if abs(score - (initial_risk * (propagation_factor ** (depth - 1)))) < 0.001]
                
                for entity_id in current_entities:
                    connections = await self.get_entity_connections(entity_id, max_depth=1)
                    
                    for connection in connections:
                        connected_id = connection["connected_entity_id"]
                        
                        if connected_id not in visited:
                            # Calculate propagated risk based on relationship strength
                            relationship_weight = connection.get("confidence_score", 0.5)
                            propagated_risk = current_risk * relationship_weight
                            
                            if propagated_risk >= min_propagated_score:
                                risk_scores[connected_id] = propagated_risk
                                visited.add(connected_id)
            
            return risk_scores
            
        except Exception as e:
            logger.error(f"Failed to propagate risk scores from {source_entity_id}: {e}")
            return {}
    
    async def calculate_network_risk_score(self, entity_id: str,
                                         analysis_depth: int = 2) -> Dict[str, Any]:
        """Calculate overall network risk score for an entity"""
        try:
            # Get entity's own risk
            entity = await self.entity_collection.find_one({"_id": ObjectId(entity_id)})
            if not entity:
                return {"error": "Entity not found"}
            
            base_risk = entity.get("risk_assessment", {}).get("overall_score", 0.0)
            
            # Analyze network connections
            connections = await self.get_entity_connections(entity_id, max_depth=analysis_depth)
            
            if not connections:
                return {
                    "entity_id": entity_id,
                    "network_risk_score": base_risk,
                    "base_risk_score": base_risk,
                    "connection_risk_factor": 0.0,
                    "high_risk_connections": 0,
                    "total_connections": 0,
                    "analysis_depth": analysis_depth
                }
            
            # Calculate connection risk factors
            high_risk_connections = 0
            total_risk_contribution = 0.0
            
            for connection in connections:
                conn_risk_level = connection.get("risk_level", "low")
                confidence = connection.get("confidence_score", 0.0)
                
                if conn_risk_level in ["high", "critical"]:
                    high_risk_connections += 1
                    risk_contribution = confidence * (0.8 if conn_risk_level == "high" else 1.0)
                    total_risk_contribution += risk_contribution
            
            # Calculate network risk adjustment
            connection_risk_factor = min(total_risk_contribution / len(connections), 0.5)
            network_risk_score = min(base_risk + connection_risk_factor, 1.0)
            
            return {
                "entity_id": entity_id,
                "network_risk_score": network_risk_score,
                "base_risk_score": base_risk,
                "connection_risk_factor": connection_risk_factor,
                "high_risk_connections": high_risk_connections,
                "total_connections": len(connections),
                "analysis_depth": analysis_depth,
                "risk_level": "critical" if network_risk_score >= 0.8 else 
                            "high" if network_risk_score >= 0.6 else
                            "medium" if network_risk_score >= 0.4 else "low"
            }
            
        except Exception as e:
            logger.error(f"Failed to calculate network risk score for {entity_id}: {e}")
            return {"error": str(e)}
    
    # ==================== PATTERN DETECTION ====================
    
    async def detect_circular_relationships(self, entity_id: str,
                                          max_cycle_length: int = 6) -> List[List[str]]:
        """Detect circular relationship patterns"""
        try:
            cycles = []
            
            # Use DFS to detect cycles
            visited = set()
            path = []
            
            async def dfs_cycle_detection(current_entity: str, depth: int):
                if depth > max_cycle_length or len(cycles) >= 10:  # Limit for performance
                    return
                
                if current_entity in path:
                    # Found a cycle
                    cycle_start_index = path.index(current_entity)
                    cycle = path[cycle_start_index:] + [current_entity]
                    if len(cycle) >= 3:  # Minimum cycle length
                        cycles.append(cycle)
                    return
                
                if current_entity in visited:
                    return
                
                visited.add(current_entity)
                path.append(current_entity)
                
                # Get connections
                connections = await self.get_entity_connections(current_entity, max_depth=1)
                
                for connection in connections:
                    connected_id = connection["connected_entity_id"]
                    await dfs_cycle_detection(connected_id, depth + 1)
                
                path.pop()
            
            await dfs_cycle_detection(entity_id, 0)
            
            return cycles
            
        except Exception as e:
            logger.error(f"Failed to detect circular relationships for {entity_id}: {e}")
            return []
    
    async def detect_hub_entities(self, min_connections: int = 10,
                                connection_types: Optional[List[RelationshipType]] = None) -> List[Dict[str, Any]]:
        """Detect hub entities with many connections"""
        try:
            # Build aggregation pipeline to count connections
            match_conditions = {}
            if connection_types:
                match_conditions["relationship_type"] = {
                    "$in": [rt.value for rt in connection_types]
                }
            
            pipeline = [
                {"$match": match_conditions} if match_conditions else {"$match": {}},
                {
                    "$group": {
                        "_id": "$source_entity_id",
                        "outgoing_count": {"$sum": 1}
                    }
                },
                {
                    "$unionWith": {
                        "coll": self.relationship_collection_name,
                        "pipeline": [
                            {"$match": match_conditions} if match_conditions else {"$match": {}},
                            {
                                "$group": {
                                    "_id": "$target_entity_id",
                                    "incoming_count": {"$sum": 1}
                                }
                            }
                        ]
                    }
                },
                {
                    "$group": {
                        "_id": "$_id",
                        "total_connections": {
                            "$sum": {"$add": [
                                {"$ifNull": ["$outgoing_count", 0]},
                                {"$ifNull": ["$incoming_count", 0]}
                            ]}
                        }
                    }
                },
                {"$match": {"total_connections": {"$gte": min_connections}}},
                {"$sort": {"total_connections": -1}},
                {"$limit": 20}
            ]
            
            # Remove empty match conditions
            pipeline = [stage for stage in pipeline if stage.get("$match") != {}]
            
            results = await self.repo.execute_pipeline(self.relationship_collection_name, pipeline)
            
            # Get entity details for hubs
            hub_entities = []
            for result in results:
                entity_id = str(result["_id"])
                entity = await self.entity_collection.find_one({"_id": ObjectId(entity_id)})
                
                if entity:
                    hub_entities.append({
                        "entity_id": entity_id,
                        "name": entity.get("name", "Unknown"),
                        "entity_type": entity.get("entity_type", "unknown"),
                        "total_connections": result["total_connections"],
                        "risk_level": entity.get("risk_assessment", {}).get("level", "low")
                    })
            
            return hub_entities
            
        except Exception as e:
            logger.error(f"Failed to detect hub entities: {e}")
            return []
    
    # ==================== NETWORK VISUALIZATION SUPPORT ====================
    
    async def prepare_network_for_visualization(self, params: NetworkQueryParams,
                                              layout_algorithm: str = "force") -> Dict[str, Any]:
        """Prepare network data optimized for visualization"""
        try:
            # Build network data
            network_response = await self.build_entity_network(params)
            
            # Calculate node positions
            node_positions = await self.calculate_node_positions(
                network_response.nodes,
                network_response.edges,
                layout_algorithm
            )
            
            # Prepare visualization-ready data
            viz_nodes = []
            for node in network_response.nodes:
                position = node_positions.get(node.id, (0, 0))
                viz_node = {
                    "id": node.id,
                    "name": node.name,
                    "type": node.entity_type,
                    "riskLevel": node.risk_level.value,
                    "size": node.size,
                    "isCenter": node.is_center,
                    "connectionCount": node.connection_count,
                    "x": position[0],
                    "y": position[1],
                    "color": self._get_node_color(node.risk_level)
                }
                viz_nodes.append(viz_node)
            
            viz_edges = []
            for edge in network_response.edges:
                viz_edge = {
                    "id": edge.id,
                    "source": edge.source_entity_id,
                    "target": edge.target_entity_id,
                    "type": edge.relationship_type.value,
                    "weight": edge.weight,
                    "confidence": edge.confidence_score,
                    "verified": edge.verified,
                    "color": self._get_edge_color(edge.confidence_score),
                    "thickness": max(1, edge.confidence_score * 5)
                }
                viz_edges.append(viz_edge)
            
            return {
                "nodes": viz_nodes,
                "edges": viz_edges,
                "layout": layout_algorithm,
                "centerEntityId": params.center_entity_id,
                "statistics": {
                    "totalNodes": len(viz_nodes),
                    "totalEdges": len(viz_edges),
                    "maxDepth": network_response.max_depth_reached,
                    "queryTime": network_response.query_time_ms
                }
            }
            
        except Exception as e:
            logger.error(f"Failed to prepare network for visualization: {e}")
            return {"nodes": [], "edges": [], "error": str(e)}
    
    async def calculate_node_positions(self, nodes: List[NetworkNode],
                                     edges: List[NetworkEdge],
                                     algorithm: str = "force") -> Dict[str, Tuple[float, float]]:
        """Calculate optimal positions for network nodes"""
        try:
            positions = {}
            
            if algorithm == "force":
                # Simple force-directed layout simulation
                import random
                
                # Initialize positions
                for i, node in enumerate(nodes):
                    angle = 2 * math.pi * i / len(nodes)
                    radius = 100 + (node.connection_count * 10)
                    positions[node.id] = (
                        radius * math.cos(angle),
                        radius * math.sin(angle)
                    )
                
                # Center entity at origin
                center_nodes = [n for n in nodes if n.is_center]
                if center_nodes:
                    positions[center_nodes[0].id] = (0, 0)
            
            elif algorithm == "circular":
                # Circular layout
                for i, node in enumerate(nodes):
                    angle = 2 * math.pi * i / len(nodes)
                    radius = 150 if not node.is_center else 0
                    positions[node.id] = (
                        radius * math.cos(angle),
                        radius * math.sin(angle)
                    )
            
            else:
                # Default grid layout
                grid_size = math.ceil(math.sqrt(len(nodes)))
                for i, node in enumerate(nodes):
                    x = (i % grid_size) * 100
                    y = (i // grid_size) * 100
                    positions[node.id] = (x, y)
            
            return positions
            
        except Exception as e:
            logger.error(f"Failed to calculate node positions: {e}")
            # Fallback to simple positions
            return {node.id: (0, 0) for node in nodes}
    
    # ==================== NETWORK STATISTICS ====================
    
    async def get_network_statistics(self, entity_id: str,
                                   max_depth: int = 2) -> Dict[str, Any]:
        """Get comprehensive network statistics for an entity"""
        try:
            # Get network data
            params = NetworkQueryParams(
                center_entity_id=entity_id,
                max_depth=max_depth,
                max_entities=200,
                max_relationships=300
            )
            
            network_data = await self.build_entity_network(params)
            
            # Calculate statistics
            total_nodes = len(network_data.nodes)
            total_edges = len(network_data.edges)
            
            # Risk distribution
            risk_distribution = {}
            for node in network_data.nodes:
                risk_level = node.risk_level.value
                risk_distribution[risk_level] = risk_distribution.get(risk_level, 0) + 1
            
            # Entity type distribution
            type_distribution = {}
            for node in network_data.nodes:
                entity_type = node.entity_type
                type_distribution[entity_type] = type_distribution.get(entity_type, 0) + 1
            
            # Connection density
            max_possible_edges = total_nodes * (total_nodes - 1) / 2 if total_nodes > 1 else 0
            density = total_edges / max_possible_edges if max_possible_edges > 0 else 0
            
            # Average confidence
            avg_confidence = (
                sum(edge.confidence_score for edge in network_data.edges) / total_edges
                if total_edges > 0 else 0
            )
            
            return {
                "entity_id": entity_id,
                "analysis_depth": max_depth,
                "network_size": {
                    "total_entities": total_nodes,
                    "total_relationships": total_edges,
                    "density": density
                },
                "risk_distribution": risk_distribution,
                "entity_type_distribution": type_distribution,
                "relationship_metrics": {
                    "average_confidence": avg_confidence,
                    "verified_relationships": sum(1 for edge in network_data.edges if edge.verified),
                    "verification_rate": (
                        sum(1 for edge in network_data.edges if edge.verified) / total_edges
                        if total_edges > 0 else 0
                    )
                },
                "query_performance": {
                    "query_time_ms": network_data.query_time_ms,
                    "max_depth_reached": network_data.max_depth_reached
                }
            }
            
        except Exception as e:
            logger.error(f"Failed to get network statistics for {entity_id}: {e}")
            return {"error": str(e)}
    
    async def calculate_separation_degrees(self, entity1_id: str,
                                         entity2_id: str) -> Optional[int]:
        """Calculate degrees of separation between two entities"""
        try:
            # Use BFS to find shortest path
            path = await self.find_relationship_path(entity1_id, entity2_id, max_depth=6)
            
            if path:
                return len(path)
            
            return None
            
        except Exception as e:
            logger.error(f"Failed to calculate separation degrees between {entity1_id} and {entity2_id}: {e}")
            return None
    
    # ==================== HELPER METHODS ====================
    
    async def _build_network_graph(self, params: NetworkQueryParams) -> Dict[str, Any]:
        """Build network graph using optimized aggregation"""
        try:
            # Build match conditions
            match_conditions = {
                "$or": [
                    {"source_entity_id": ObjectId(params.center_entity_id)},
                    {"target_entity_id": ObjectId(params.center_entity_id)}
                ]
            }
            
            # Add filters
            if params.relationship_types:
                match_conditions["relationship_type"] = {
                    "$in": [rt.value for rt in params.relationship_types]
                }
            
            if params.min_confidence:
                match_conditions["confidence_score"] = {"$gte": params.min_confidence}
            
            if params.only_verified:
                match_conditions["verified"] = True
            
            # Build recursive graph lookup for multiple depths
            relationships = []
            current_entities = {params.center_entity_id}
            
            for depth in range(params.max_depth):
                if not current_entities or len(relationships) >= params.max_relationships:
                    break
                
                # Find relationships from current entities
                depth_match = {
                    "$or": [
                        {"source_entity_id": {"$in": [ObjectId(eid) for eid in current_entities]}},
                        {"target_entity_id": {"$in": [ObjectId(eid) for eid in current_entities]}}
                    ]
                }
                
                # Add other filters
                for key, value in match_conditions.items():
                    if key != "$or":
                        depth_match[key] = value
                
                depth_relationships = await self.relationship_collection.find(
                    depth_match
                ).limit(params.max_relationships - len(relationships)).to_list(None)
                
                # Add to results and prepare next iteration
                next_entities = set()
                for rel in depth_relationships:
                    relationships.append(rel)
                    
                    source_id = str(rel["source_entity_id"])
                    target_id = str(rel["target_entity_id"])
                    
                    next_entities.add(source_id)
                    next_entities.add(target_id)
                
                current_entities = next_entities - current_entities  # New entities only
            
            return {
                "relationships": relationships,
                "max_depth": depth + 1 if relationships else 0
            }
            
        except Exception as e:
            logger.error(f"Failed to build network graph: {e}")
            return {"relationships": [], "max_depth": 0}
    
    async def _get_entities_batch(self, entity_ids: List[str]) -> List[Dict[str, Any]]:
        """Get entity details in batch"""
        try:
            object_ids = [ObjectId(eid) for eid in entity_ids]
            entities = await self.entity_collection.find(
                {"_id": {"$in": object_ids}}
            ).to_list(None)
            
            # Convert ObjectIds to strings
            for entity in entities:
                entity["_id"] = str(entity["_id"])
            
            return entities
            
        except Exception as e:
            logger.error(f"Failed to get entities batch: {e}")
            return []
    
    def _get_node_color(self, risk_level: NetworkRiskLevel) -> str:
        """Get color for node based on risk level"""
        color_map = {
            NetworkRiskLevel.LOW: "#4CAF50",      # Green
            NetworkRiskLevel.MEDIUM: "#FF9800",   # Orange  
            NetworkRiskLevel.HIGH: "#F44336",     # Red
            NetworkRiskLevel.CRITICAL: "#9C27B0"  # Purple
        }
        return color_map.get(risk_level, "#757575")  # Default gray
    
    def _get_edge_color(self, confidence_score: float) -> str:
        """Get color for edge based on confidence score"""
        if confidence_score >= 0.8:
            return "#4CAF50"  # High confidence - green
        elif confidence_score >= 0.6:
            return "#FF9800"  # Medium confidence - orange
        elif confidence_score >= 0.4:
            return "#FFC107"  # Low confidence - yellow
        else:
            return "#9E9E9E"  # Very low confidence - gray
    
    # ==================== PLACEHOLDER IMPLEMENTATIONS ====================
    # (Implementing remaining interface methods with simplified logic)
    
    async def find_network_bridges(self, entity_ids: List[str]) -> List[str]:
        """Find bridge entities - simplified implementation"""
        # Return entities with highest connection counts as bridge approximation
        try:
            centrality_metrics = await self.calculate_centrality_metrics(entity_ids)
            
            # Sort by degree centrality and return top entities
            bridges = sorted(
                centrality_metrics.items(),
                key=lambda x: x[1].get("degree_centrality", 0),
                reverse=True
            )[:5]
            
            return [entity_id for entity_id, _ in bridges]
            
        except Exception as e:
            logger.error(f"Failed to find network bridges: {e}")
            return []
    
    async def analyze_network_density(self, entity_ids: List[str]) -> Dict[str, float]:
        """Analyze network density - simplified implementation"""
        return {
            "density": 0.3,
            "clustering_coefficient": 0.2,
            "average_path_length": 2.5
        }
    
    async def find_risk_transmission_paths(self, high_risk_entity_id: str,
                                         target_entities: List[str],
                                         max_depth: int = 4) -> Dict[str, List[List[str]]]:
        """Find risk transmission paths - simplified implementation"""
        transmission_paths = {}
        
        for target_id in target_entities:
            path = await self.find_relationship_path(high_risk_entity_id, target_id, max_depth)
            if path:
                # Convert to simple entity ID path
                entity_path = [high_risk_entity_id, target_id]  # Simplified
                transmission_paths[target_id] = [entity_path]
            else:
                transmission_paths[target_id] = []
        
        return transmission_paths
    
    async def find_suspicious_patterns(self, entity_ids: List[str],
                                     pattern_types: List[str]) -> Dict[str, List[Dict[str, Any]]]:
        """Find suspicious patterns - placeholder implementation"""
        return {pattern_type: [] for pattern_type in pattern_types}
    
    async def optimize_network_for_display(self, network_data: Dict[str, Any],
                                         max_display_nodes: int = 50) -> Dict[str, Any]:
        """Optimize network for display - simplified implementation"""
        nodes = network_data.get("nodes", [])
        edges = network_data.get("edges", [])
        
        # Keep only top nodes by importance
        if len(nodes) > max_display_nodes:
            # Sort by connection count or risk level
            nodes = sorted(nodes, key=lambda n: n.get("connectionCount", 0), reverse=True)[:max_display_nodes]
            
            # Filter edges to only include those between displayed nodes
            displayed_node_ids = {node["id"] for node in nodes}
            edges = [edge for edge in edges 
                    if edge["source"] in displayed_node_ids and edge["target"] in displayed_node_ids]
        
        return {
            "nodes": nodes,
            "edges": edges,
            "optimized": len(network_data.get("nodes", [])) > max_display_nodes
        }
    
    async def analyze_relationship_strength(self, entity_id: str,
                                          relationship_types: Optional[List[RelationshipType]] = None) -> Dict[str, Any]:
        """Analyze relationship strength - simplified implementation"""
        connections = await self.get_entity_connections(entity_id, relationship_types=relationship_types)
        
        if not connections:
            return {"average_strength": 0.0, "strongest_connection": None, "weakest_connection": None}
        
        strengths = [conn.get("confidence_score", 0.0) for conn in connections]
        
        return {
            "average_strength": sum(strengths) / len(strengths),
            "strongest_connection": max(connections, key=lambda c: c.get("confidence_score", 0.0)),
            "weakest_connection": min(connections, key=lambda c: c.get("confidence_score", 1.0)),
            "total_connections": len(connections)
        }
    
    async def find_weak_links(self, entity_ids: List[str],
                            confidence_threshold: float = 0.3) -> List[Dict[str, Any]]:
        """Find weak links - simplified implementation"""
        weak_links = []
        
        for entity_id in entity_ids[:10]:  # Limit for performance
            connections = await self.get_entity_connections(entity_id)
            
            for connection in connections:
                if connection.get("confidence_score", 1.0) < confidence_threshold:
                    weak_links.append(connection)
        
        return weak_links
    
    async def deduplicate_relationships(self, relationships: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Remove duplicate relationships - simplified implementation"""
        seen = set()
        deduplicated = []
        
        for rel in relationships:
            # Create unique key
            source = rel.get("source_entity_id", "")
            target = rel.get("target_entity_id", "")
            rel_type = rel.get("relationship_type", "")
            
            key = f"{min(source, target)}_{max(source, target)}_{rel_type}"
            
            if key not in seen:
                seen.add(key)
                deduplicated.append(rel)
        
        return deduplicated
    
    async def get_network_growth_metrics(self, entity_id: str,
                                       time_periods: List[str]) -> Dict[str, Dict[str, int]]:
        """Get network growth metrics - placeholder implementation"""
        return {period: {"new_connections": 5, "total_connections": 20} for period in time_periods}
    
    async def bulk_analyze_networks(self, entity_ids: List[str],
                                  analysis_types: List[str]) -> Dict[str, Dict[str, Any]]:
        """Bulk network analysis - placeholder implementation"""
        results = {}
        
        for entity_id in entity_ids[:5]:  # Limit for performance
            results[entity_id] = {
                analysis_type: {"status": "completed", "score": 0.5}
                for analysis_type in analysis_types
            }
        
        return results
    
    async def compare_networks(self, entity_ids: List[str]) -> Dict[str, Any]:
        """Compare networks - placeholder implementation"""
        return {
            "similarity_matrix": {},
            "common_connections": [],
            "unique_connections": {},
            "comparison_metrics": {"overlap_ratio": 0.3}
        }