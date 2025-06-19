"""
Network Repository Implementation - Streamlined version with only essential methods

Focused, production-ready implementation using mongodb_core_lib with only
the methods that are actually used in the application.
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
    Streamlined network repository implementation using mongodb_core_lib
    
    Contains only the essential methods that are actually used in the application,
    removing ~500 lines of unused placeholder implementations.
    """
    
    def __init__(self, mongodb_repo: MongoDBRepository, 
                 entity_collection: str = "entities",
                 relationship_collection: str = "relationships"):
        """Initialize Network repository"""
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
                # Use new schema field mappings
                source_id = str(relationship["source"]["entityId"])
                target_id = str(relationship["target"]["entityId"])
                
                entity_ids.add(source_id)
                entity_ids.add(target_id)
                
                # Create edge with new schema fields and correct field mappings
                from models.core.network import RelationshipStrength
                
                # Map strength value to enum
                strength_value = relationship.get("strength", 0.5)
                if isinstance(strength_value, (int, float)):
                    if strength_value >= 0.8:
                        strength_enum = RelationshipStrength.CONFIRMED
                    elif strength_value >= 0.6:
                        strength_enum = RelationshipStrength.LIKELY
                    elif strength_value >= 0.4:
                        strength_enum = RelationshipStrength.POSSIBLE
                    else:
                        strength_enum = RelationshipStrength.WEAK
                else:
                    strength_enum = RelationshipStrength.POSSIBLE
                
                edge = NetworkEdge(
                    source_id=source_id,
                    target_id=target_id,
                    relationship_type=RelationshipType(relationship.get("type", "unknown")),
                    weight=relationship.get("strength", 0.5),
                    confidence=relationship.get("confidence", 0.5),
                    verified=relationship.get("verified", False),
                    strength=strength_enum,
                    direction=relationship.get("direction", "directed")
                )
                edges.append(edge)
            
            # Get entity details in batch
            entities = await self._get_entities_batch(list(entity_ids))
            entity_lookup = {entity["entityId"]: entity for entity in entities}
            
            # Create nodes
            for entity_id in entity_ids:
                entity = entity_lookup.get(entity_id, {})
                
                # Handle entity name
                entity_name = entity.get("name", "Unknown")
                if isinstance(entity_name, dict):
                    entity_name = entity_name.get("full", entity_name.get("display", "Unknown"))
                
                # Map risk level and score
                risk_assessment = entity.get("riskAssessment", {}).get("overall", {})
                risk_level_str = risk_assessment.get("level", "low")
                risk_score_raw = risk_assessment.get("score", 0)
                
                try:
                    risk_level = NetworkRiskLevel(risk_level_str.lower())
                except ValueError:
                    risk_level = NetworkRiskLevel.LOW
                
                # Convert risk score to 0-1 scale (assuming backend scores are 0-100)
                risk_score = min(1.0, max(0.0, float(risk_score_raw) / 100.0))
                
                # Count connections for this entity
                connection_count = sum(1 for edge in edges 
                                     if edge.source_id == entity_id or edge.target_id == entity_id)
                
                node = NetworkNode(
                    entity_id=entity_id,
                    entity_name=str(entity_name),
                    entity_type=entity.get("entityType", "unknown"),
                    risk_level=risk_level,
                    risk_score=risk_score,  # Include actual risk score
                    is_center=(entity_id == params.center_entity_id),
                    connection_count=connection_count,
                    size=max(10, min(50, connection_count * 5))  # Scale node size
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
            logger.error(f"Failed to build entity network: {e}")
            import traceback
            traceback.print_exc()
            return NetworkDataResponse(
                nodes=[], edges=[], center_entity_id=params.center_entity_id,
                total_entities=0, total_relationships=0, max_depth_reached=0, query_time_ms=0
            )
    
    async def get_entity_connections(self, entity_id: str,
                                   max_depth: int = 1,
                                   relationship_types: Optional[List[RelationshipType]] = None,
                                   min_confidence: Optional[float] = None) -> List[Dict[str, Any]]:
        """Get direct connections for an entity"""
        try:
            # Build match conditions with new schema
            match_conditions = {
                "$or": [
                    {"source.entityId": entity_id},
                    {"target.entityId": entity_id}
                ]
            }
            
            # Add filters
            if relationship_types:
                match_conditions["type"] = {"$in": [rt.value for rt in relationship_types]}
            
            if min_confidence:
                match_conditions["confidence"] = {"$gte": min_confidence}
            
            # Always filter for active relationships
            match_conditions["active"] = True
            
            # Execute query with entity lookup
            pipeline = [
                {"$match": match_conditions},
                {"$sort": {"confidence": -1}},
                {"$limit": 100}  # Reasonable limit for connections
            ]
            
            relationships = await self.repo.execute_pipeline(self.relationship_collection_name, pipeline)
            
            connections = []
            connected_entity_ids = set()
            
            for rel in relationships:
                # Use new schema field mappings
                source_id = str(rel["source"]["entityId"])
                target_id = str(rel["target"]["entityId"])
                
                # Determine connected entity (the one that's not the input entity)
                connected_id = target_id if source_id == entity_id else source_id
                
                if connected_id not in connected_entity_ids:
                    connected_entity_ids.add(connected_id)
                    
                    connections.append({
                        "connected_entity_id": connected_id,
                        "relationship_type": rel.get("type", "unknown"),
                        "confidence_score": rel.get("confidence", 0.0),
                        "verified": rel.get("verified", False),
                        "strength": rel.get("strength", 0.0),
                        "direction": rel.get("direction", "undirected"),
                        "relationship_id": str(rel.get("_id", ""))
                    })
            
            # Get entity details for connected entities
            if connected_entity_ids:
                entities = await self._get_entities_batch(list(connected_entity_ids))
                entity_lookup = {entity["entityId"]: entity for entity in entities}
                
                # Add entity details to connections
                for connection in connections:
                    entity = entity_lookup.get(connection["connected_entity_id"], {})
                    
                    # Handle entity name
                    entity_name = entity.get("name", "Unknown")
                    if isinstance(entity_name, dict):
                        entity_name = entity_name.get("full", entity_name.get("display", "Unknown"))
                    
                    connection["entity_name"] = str(entity_name)
                    connection["entity_type"] = entity.get("entityType", "unknown")
                    connection["risk_level"] = entity.get("riskAssessment", {}).get("overall", {}).get("level", "low")
            
            logger.debug(f"Found {len(connections)} connections for entity {entity_id}")
            return connections
            
        except Exception as e:
            logger.error(f"Failed to get entity connections for {entity_id}: {e}")
            return []
    
    async def find_relationship_path(self, source_entity_id: str,
                                   target_entity_id: str,
                                   max_depth: int = 6,
                                   relationship_types: Optional[List[RelationshipType]] = None) -> Optional[List[Dict[str, Any]]]:
        """Find path between two entities using BFS"""
        try:
            if source_entity_id == target_entity_id:
                return []
            
            # BFS to find shortest path
            queue = deque([(source_entity_id, [])])
            visited = {source_entity_id}
            
            while queue:
                current_entity, path = queue.popleft()
                
                if len(path) >= max_depth:
                    continue
                
                # Get connections from current entity
                connections = await self.get_entity_connections(
                    current_entity, 
                    max_depth=1,
                    relationship_types=relationship_types
                )
                
                for connection in connections:
                    connected_id = connection["connected_entity_id"]
                    
                    if connected_id == target_entity_id:
                        # Found target! Return the path
                        final_path = path + [{
                            "source_entity_id": current_entity,
                            "target_entity_id": connected_id,
                            "relationship_type": connection["relationship_type"],
                            "confidence": connection["confidence_score"]
                        }]
                        return final_path
                    
                    if connected_id not in visited:
                        visited.add(connected_id)
                        new_path = path + [{
                            "source_entity_id": current_entity,
                            "target_entity_id": connected_id,
                            "relationship_type": connection["relationship_type"],
                            "confidence": connection["confidence_score"]
                        }]
                        queue.append((connected_id, new_path))
            
            return None  # No path found
            
        except Exception as e:
            logger.error(f"Failed to find relationship path from {source_entity_id} to {target_entity_id}: {e}")
            return None
    
    # ==================== NETWORK ANALYSIS ====================
    
    async def calculate_centrality_metrics(self, entity_ids: List[str], 
                                         max_depth: int = 2,
                                         include_advanced: bool = True) -> Dict[str, Dict[str, float]]:
        """Calculate comprehensive centrality metrics for entities using new schema"""
        try:
            logger.info(f"Calculating centrality metrics for {len(entity_ids)} entities")
            centrality_metrics = {}
            
            # Build network graph for advanced centrality calculations
            network_graph = await self._build_network_graph_for_centrality(entity_ids, max_depth)
            total_entities = len(network_graph)
            
            for entity_id in entity_ids:
                logger.debug(f"Calculating centrality for entity: {entity_id}")
                
                # Get direct connections for basic metrics
                connections = await self.get_entity_connections(entity_id, max_depth=1)
                
                # Basic degree centrality
                degree_centrality = len(connections)
                normalized_degree = degree_centrality / max(1, total_entities - 1) if total_entities > 1 else 0
                
                # Weighted centrality based on confidence scores and relationship types
                weighted_centrality = 0.0
                high_confidence_connections = 0
                risk_weighted_centrality = 0.0
                
                for conn in connections:
                    confidence = conn.get("confidence_score", 0.0)
                    weighted_centrality += confidence
                    
                    if confidence >= 0.8:
                        high_confidence_connections += 1
                    
                    # Apply relationship type risk weighting
                    rel_type = conn.get("relationship_type")
                    if rel_type:
                        try:
                            from models.core.network import get_relationship_risk_weight
                            rel_type_enum = RelationshipType(rel_type)
                            risk_weight = get_relationship_risk_weight(rel_type_enum)
                            risk_weighted_centrality += confidence * risk_weight
                        except ValueError:
                            risk_weighted_centrality += confidence * 0.5  # Default weight
                
                # Closeness centrality (if advanced metrics requested)
                closeness_centrality = 0.0
                betweenness_centrality = 0.0
                eigenvector_centrality = 0.0
                
                if include_advanced and entity_id in network_graph:
                    closeness_centrality = await self._calculate_closeness_centrality(
                        entity_id, network_graph, max_depth
                    )
                    betweenness_centrality = await self._calculate_betweenness_centrality(
                        entity_id, network_graph
                    )
                    eigenvector_centrality = await self._calculate_eigenvector_centrality(
                        entity_id, network_graph
                    )
                
                centrality_metrics[entity_id] = {
                    "degree_centrality": degree_centrality,
                    "normalized_degree_centrality": normalized_degree,
                    "weighted_centrality": weighted_centrality,
                    "risk_weighted_centrality": risk_weighted_centrality,
                    "high_confidence_connections": high_confidence_connections,
                    "closeness_centrality": closeness_centrality,
                    "betweenness_centrality": betweenness_centrality,
                    "eigenvector_centrality": eigenvector_centrality,
                    "centrality_score": (
                        normalized_degree * 0.3 + 
                        (weighted_centrality / max(1, degree_centrality)) * 0.3 +
                        closeness_centrality * 0.2 +
                        betweenness_centrality * 0.2
                    ) if degree_centrality > 0 else 0.0
                }
                
                logger.debug(
                    f"Entity {entity_id} centrality: degree={degree_centrality}, "
                    f"weighted={weighted_centrality:.2f}, closeness={closeness_centrality:.3f}"
                )
            
            logger.info(f"Centrality calculation completed for {len(centrality_metrics)} entities")
            return centrality_metrics
            
        except Exception as e:
            logger.error(f"Failed to calculate centrality metrics: {e}")
            import traceback
            traceback.print_exc()
            return {}
    
    async def detect_hub_entities(self, min_connections: int = 5,
                                connection_types: Optional[List[RelationshipType]] = None,
                                include_risk_analysis: bool = True) -> List[Dict[str, Any]]:
        """Detect hub entities with many connections using new schema"""
        try:
            logger.info(f"Detecting hub entities with min_connections={min_connections}")
            
            # Build aggregation pipeline to count connections using new schema
            match_conditions = {"active": True}
            if connection_types:
                match_conditions["type"] = {
                    "$in": [rt.value for rt in connection_types]
                }
            
            # Count outgoing connections
            outgoing_pipeline = [
                {"$match": match_conditions},
                {
                    "$group": {
                        "_id": "$source.entityId",
                        "outgoing_count": {"$sum": 1},
                        "avg_confidence": {"$avg": "$confidence"},
                        "relationship_types": {"$addToSet": "$type"}
                    }
                }
            ]
            
            # Count incoming connections
            incoming_pipeline = [
                {"$match": match_conditions},
                {
                    "$group": {
                        "_id": "$target.entityId",
                        "incoming_count": {"$sum": 1},
                        "avg_confidence": {"$avg": "$confidence"},
                        "relationship_types": {"$addToSet": "$type"}
                    }
                }
            ]
            
            # Execute both pipelines
            outgoing_results = await self.repo.execute_pipeline(self.relationship_collection_name, outgoing_pipeline)
            incoming_results = await self.repo.execute_pipeline(self.relationship_collection_name, incoming_pipeline)
            
            # Combine results to get total connection counts
            entity_connections = {}
            
            for result in outgoing_results:
                entity_id = result["_id"]
                entity_connections[entity_id] = {
                    "entity_id": entity_id,
                    "outgoing_count": result["outgoing_count"],
                    "incoming_count": 0,
                    "total_connections": result["outgoing_count"],
                    "avg_confidence": result["avg_confidence"],
                    "relationship_types": result["relationship_types"]
                }
            
            for result in incoming_results:
                entity_id = result["_id"]
                if entity_id in entity_connections:
                    entity_connections[entity_id]["incoming_count"] = result["incoming_count"]
                    entity_connections[entity_id]["total_connections"] += result["incoming_count"]
                    # Average the confidence scores
                    entity_connections[entity_id]["avg_confidence"] = (
                        entity_connections[entity_id]["avg_confidence"] + result["avg_confidence"]
                    ) / 2
                    # Merge relationship types
                    entity_connections[entity_id]["relationship_types"].extend(result["relationship_types"])
                    entity_connections[entity_id]["relationship_types"] = list(set(entity_connections[entity_id]["relationship_types"]))
                else:
                    entity_connections[entity_id] = {
                        "entity_id": entity_id,
                        "outgoing_count": 0,
                        "incoming_count": result["incoming_count"],
                        "total_connections": result["incoming_count"],
                        "avg_confidence": result["avg_confidence"],
                        "relationship_types": result["relationship_types"]
                    }
            
            # Filter entities with minimum connections
            hub_entities = [
                entity_data for entity_data in entity_connections.values()
                if entity_data["total_connections"] >= min_connections
            ]
            
            # Sort by total connections (descending)
            hub_entities.sort(key=lambda x: x["total_connections"], reverse=True)
            
            # Add risk analysis if requested
            if include_risk_analysis:
                for hub in hub_entities:
                    entity_id = hub["entity_id"]
                    
                    # Get entity details for risk assessment
                    entity = await self.entity_collection.find_one({"entityId": entity_id})
                    if entity:
                        risk_assessment = entity.get("riskAssessment", {})
                        hub["risk_level"] = risk_assessment.get("overall", {}).get("level", "unknown")
                        hub["risk_score"] = risk_assessment.get("overall", {}).get("score", 0.0)
                        
                        # Handle entity name
                        entity_name = entity.get("name", "Unknown")
                        if isinstance(entity_name, dict):
                            entity_name = entity_name.get("full", entity_name.get("display", "Unknown"))
                        hub["entity_name"] = str(entity_name)
                        hub["entity_type"] = entity.get("entityType", "unknown")
                    else:
                        hub["risk_level"] = "unknown"
                        hub["risk_score"] = 0.0
                        hub["entity_name"] = "Unknown"
                        hub["entity_type"] = "unknown"
                    
                    # Calculate hub influence score
                    hub["hub_influence_score"] = (
                        hub["total_connections"] * 0.4 +
                        hub["avg_confidence"] * 30 * 0.3 +
                        len(hub["relationship_types"]) * 5 * 0.2 +
                        hub["risk_score"] * 10 * 0.1
                    )
            
            logger.info(f"Found {len(hub_entities)} hub entities")
            return hub_entities[:20]  # Return top 20 hubs
            
        except Exception as e:
            logger.error(f"Failed to detect hub entities: {e}")
            import traceback
            traceback.print_exc()
            return []
    
    # ==================== RISK PROPAGATION ====================
    
    async def propagate_risk_scores(self, source_entity_id: str,
                                  max_depth: int = 3,
                                  propagation_factor: float = 0.5,
                                  min_propagated_score: float = 0.1,
                                  relationship_types: Optional[List[RelationshipType]] = None) -> Dict[str, float]:
        """Propagate risk scores through network relationships using new schema"""
        try:
            # Get source entity risk score using entityId field
            source_entity = await self.entity_collection.find_one({"entityId": source_entity_id})
            if not source_entity:
                logger.warning(f"Source entity {source_entity_id} not found for risk propagation")
                return {}
            
            # Extract risk score from new schema format
            initial_risk = source_entity.get("riskAssessment", {}).get("overall", {}).get("score", 0.0)
            if initial_risk < min_propagated_score:
                logger.debug(f"Initial risk {initial_risk} below threshold {min_propagated_score}")
                return {}
            
            # Initialize risk propagation data structures
            risk_scores = {source_entity_id: initial_risk}
            visited = set([source_entity_id])
            propagation_paths = {source_entity_id: []}
            
            logger.info(f"Starting risk propagation from {source_entity_id} (risk: {initial_risk})")
            
            # Breadth-first propagation through network
            for depth in range(1, max_depth + 1):
                current_depth_entities = []
                
                # Find entities at previous depth to expand from
                for entity_id, score in risk_scores.items():
                    if len(propagation_paths[entity_id]) == depth - 1:
                        current_depth_entities.append(entity_id)
                
                if not current_depth_entities:
                    break
                
                new_propagations = 0
                
                for entity_id in current_depth_entities:
                    # Get connections with new schema-aware method
                    connections = await self.get_entity_connections(
                        entity_id, 
                        max_depth=1, 
                        relationship_types=relationship_types
                    )
                    
                    current_entity_risk = risk_scores[entity_id]
                    
                    for connection in connections:
                        connected_id = connection["connected_entity_id"]
                        
                        if connected_id not in visited:
                            # Calculate propagated risk using relationship confidence and type risk weight
                            relationship_confidence = connection.get("confidence_score", 0.5)
                            relationship_type = connection.get("relationship_type")
                            
                            # Apply relationship type risk weighting
                            from models.core.network import get_relationship_risk_weight
                            type_risk_weight = 1.0
                            if relationship_type:
                                try:
                                    rel_type_enum = RelationshipType(relationship_type)
                                    type_risk_weight = get_relationship_risk_weight(rel_type_enum)
                                except ValueError:
                                    logger.warning(f"Unknown relationship type: {relationship_type}")
                            
                            # Calculate propagated risk with depth decay, confidence, and type weighting
                            depth_factor = propagation_factor ** depth
                            propagated_risk = (
                                current_entity_risk * 
                                depth_factor * 
                                relationship_confidence * 
                                type_risk_weight
                            )
                            
                            if propagated_risk >= min_propagated_score:
                                risk_scores[connected_id] = propagated_risk
                                visited.add(connected_id)
                                propagation_paths[connected_id] = propagation_paths[entity_id] + [connection]
                                new_propagations += 1
                                
                                logger.debug(
                                    f"Risk propagated to {connected_id}: {propagated_risk:.3f} "
                                    f"(depth={depth}, confidence={relationship_confidence:.2f}, "
                                    f"type_weight={type_risk_weight:.2f})"
                                )
                
                logger.info(f"Depth {depth}: {new_propagations} new risk propagations")
                
                if new_propagations == 0:
                    break
            
            logger.info(f"Risk propagation completed: {len(risk_scores)} entities affected")
            return risk_scores
            
        except Exception as e:
            logger.error(f"Failed to propagate risk scores from {source_entity_id}: {e}")
            import traceback
            traceback.print_exc()
            return {}
    
    async def calculate_network_risk_score(self, entity_id: str,
                                         analysis_depth: int = 2) -> Dict[str, Any]:
        """Calculate overall network risk score for an entity using new schema"""
        try:
            # Get entity's own risk using entityId field
            entity = await self.entity_collection.find_one({"entityId": entity_id})
            if not entity:
                return {"error": "Entity not found"}
            
            base_risk = entity.get("riskAssessment", {}).get("overall", {}).get("score", 0.0)
            
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
    
    # ==================== SIMPLIFIED USED METHODS ====================
    
    async def find_network_bridges(self, entity_ids: List[str]) -> List[str]:
        """Find bridge entities - uses centrality metrics"""
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
    
    async def detect_communities(self, entity_ids: List[str],
                               min_community_size: int = 3,
                               resolution: float = 1.0) -> List[List[str]]:
        """Detect communities within entity network - simplified implementation"""
        try:
            communities = []
            unassigned = set(entity_ids)
            
            while unassigned and len(communities) < 10:  # Limit communities
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
    
    async def prepare_network_for_visualization(self, params: NetworkQueryParams,
                                              layout_algorithm: str = "force") -> Dict[str, Any]:
        """Prepare network data optimized for visualization - simplified"""
        try:
            # Build network data
            network_response = await self.build_entity_network(params)
            
            # Prepare visualization-ready data
            viz_nodes = []
            for node in network_response.nodes:
                viz_node = {
                    "id": node.entity_id,
                    "name": node.entity_name,
                    "type": node.entity_type,
                    "riskLevel": node.risk_level.value,
                    "size": node.size,
                    "isCenter": node.is_center,
                    "connectionCount": node.connection_count,
                    "x": 0,  # Simplified positioning
                    "y": 0,
                    "color": self._get_node_color(node.risk_level)
                }
                viz_nodes.append(viz_node)
            
            viz_edges = []
            for edge in network_response.edges:
                viz_edge = {
                    "source": edge.source_id,
                    "target": edge.target_id,
                    "type": edge.relationship_type.value,
                    "weight": edge.weight,
                    "confidence": edge.confidence,
                    "verified": edge.verified,
                    "color": self._get_edge_color(edge.confidence),
                    "thickness": max(1, edge.confidence * 5)
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
        """Calculate optimal positions for network nodes - simplified"""
        try:
            positions = {}
            
            # Simple circular layout
            for i, node in enumerate(nodes):
                angle = 2 * math.pi * i / len(nodes)
                radius = 150 if not node.is_center else 0
                positions[node.entity_id] = (
                    radius * math.cos(angle),
                    radius * math.sin(angle)
                )
            
            return positions
            
        except Exception as e:
            logger.error(f"Failed to calculate node positions: {e}")
            # Fallback to simple positions
            return {node.entity_id: (0, 0) for node in nodes}
    
    # ==================== HELPER METHODS ====================
    
    async def _build_network_graph(self, params: NetworkQueryParams) -> Dict[str, Any]:
        """Build network graph using optimized aggregation"""
        try:
            # Build match conditions with new schema
            match_conditions = {
                "$or": [
                    {"source.entityId": params.center_entity_id},
                    {"target.entityId": params.center_entity_id}
                ]
            }
            
            # Add filters with new schema fields
            if params.relationship_types:
                match_conditions["type"] = {
                    "$in": [rt.value for rt in params.relationship_types]
                }
            
            if params.min_confidence:
                match_conditions["confidence"] = {"$gte": params.min_confidence}
            
            if params.only_verified:
                match_conditions["verified"] = True
            
            if params.only_active:
                match_conditions["active"] = True
            
            # Build recursive graph lookup for multiple depths
            relationships = []
            relationship_ids_seen = set()  # Track relationship IDs to prevent duplicates
            current_entities = {params.center_entity_id}
            
            for depth in range(params.max_depth):
                if not current_entities or len(relationships) >= params.max_relationships:
                    break
                
                # Find relationships from current entities with new schema
                depth_match = {
                    "$or": [
                        {"source.entityId": {"$in": list(current_entities)}},
                        {"target.entityId": {"$in": list(current_entities)}}
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
                    # Skip if we've already seen this relationship (prevents bidirectional duplicates)
                    rel_id = str(rel["_id"])
                    if rel_id in relationship_ids_seen:
                        continue
                    
                    relationship_ids_seen.add(rel_id)
                    relationships.append(rel)
                    
                    # Use new schema field mappings
                    source_id = str(rel["source"]["entityId"])
                    target_id = str(rel["target"]["entityId"])
                    
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
            entities = await self.entity_collection.find(
                {"entityId": {"$in": entity_ids}}
            ).to_list(None)
            
            # Ensure consistent string representation
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
    
    # ==================== CENTRALITY HELPER METHODS ====================
    
    async def _build_network_graph_for_centrality(self, entity_ids: List[str], 
                                                 max_depth: int = 2) -> Dict[str, Dict[str, float]]:
        """Build adjacency-list network graph for centrality calculations"""
        try:
            network_graph = {entity_id: {} for entity_id in entity_ids}
            
            # Get all relationships among these entities
            match_conditions = {
                "$and": [
                    {"active": True},
                    {"$or": [
                        {"source.entityId": {"$in": entity_ids}},
                        {"target.entityId": {"$in": entity_ids}}
                    ]}
                ]
            }
            
            relationships = await self.relationship_collection.find(match_conditions).to_list(None)
            
            # Build adjacency list with confidence weights
            for rel in relationships:
                source_id = str(rel["source"]["entityId"])
                target_id = str(rel["target"]["entityId"])
                confidence = rel.get("confidence", 0.5)
                
                # Add both entities to graph if they're in our target set
                if source_id in entity_ids and target_id in entity_ids:
                    if source_id not in network_graph:
                        network_graph[source_id] = {}
                    if target_id not in network_graph:
                        network_graph[target_id] = {}
                    
                    # Add weighted edges (bidirectional for undirected graph)
                    network_graph[source_id][target_id] = confidence
                    network_graph[target_id][source_id] = confidence
            
            logger.debug(f"Built network graph with {len(network_graph)} nodes for centrality calculation")
            return network_graph
            
        except Exception as e:
            logger.error(f"Failed to build network graph for centrality: {e}")
            return {}
    
    async def _calculate_closeness_centrality(self, entity_id: str, 
                                            network_graph: Dict[str, Dict[str, float]], 
                                            max_depth: int = 2) -> float:
        """Calculate closeness centrality using BFS shortest paths"""
        try:
            if entity_id not in network_graph:
                return 0.0
            
            # BFS to find shortest paths to all other nodes
            distances = {entity_id: 0}
            queue = deque([(entity_id, 0)])
            visited = {entity_id}
            
            while queue:
                current_node, current_dist = queue.popleft()
                
                if current_dist >= max_depth:
                    continue
                    
                # Explore neighbors
                for neighbor, edge_weight in network_graph.get(current_node, {}).items():
                    if neighbor not in visited:
                        visited.add(neighbor)
                        new_distance = current_dist + (1.0 / max(edge_weight, 0.1))  # Weighted distance
                        distances[neighbor] = new_distance
                        queue.append((neighbor, new_distance))
            
            # Calculate closeness centrality
            if len(distances) <= 1:
                return 0.0
            
            total_distance = sum(distances.values())
            if total_distance == 0:
                return 1.0
            
            # Normalized closeness centrality
            n_reachable = len(distances) - 1  # Exclude self
            if n_reachable == 0:
                return 0.0
                
            closeness = n_reachable / total_distance
            
            # Normalize by maximum possible closeness
            n_total = len(network_graph) - 1
            if n_total > 0:
                max_closeness = n_total
                closeness = closeness / max_closeness
            
            return min(closeness, 1.0)
            
        except Exception as e:
            logger.error(f"Failed to calculate closeness centrality for {entity_id}: {e}")
            return 0.0
    
    async def _calculate_betweenness_centrality(self, entity_id: str, 
                                              network_graph: Dict[str, Dict[str, float]]) -> float:
        """Calculate betweenness centrality using path counting"""
        try:
            if entity_id not in network_graph or len(network_graph) <= 2:
                return 0.0
            
            betweenness = 0.0
            nodes = list(network_graph.keys())
            
            # For each pair of nodes (excluding target entity)
            for i, source in enumerate(nodes):
                if source == entity_id:
                    continue
                    
                for j, target in enumerate(nodes[i+1:], i+1):
                    if target == entity_id or target == source:
                        continue
                    
                    # Find shortest paths between source and target
                    paths_through_entity = await self._count_shortest_paths_through_node(
                        source, target, entity_id, network_graph
                    )
                    total_paths = await self._count_total_shortest_paths(source, target, network_graph)
                    
                    if total_paths > 0:
                        betweenness += paths_through_entity / total_paths
            
            # Normalize betweenness centrality
            n = len(network_graph)
            if n > 2:
                normalization_factor = (n - 1) * (n - 2) / 2
                betweenness = betweenness / normalization_factor
            
            return min(betweenness, 1.0)
            
        except Exception as e:
            logger.error(f"Failed to calculate betweenness centrality for {entity_id}: {e}")
            return 0.0
    
    async def _calculate_eigenvector_centrality(self, entity_id: str, 
                                              network_graph: Dict[str, Dict[str, float]]) -> float:
        """Calculate eigenvector centrality using power iteration"""
        try:
            if entity_id not in network_graph or len(network_graph) <= 1:
                return 0.0
            
            nodes = list(network_graph.keys())
            n = len(nodes)
            node_index = {node: i for i, node in enumerate(nodes)}
            
            if entity_id not in node_index:
                return 0.0
            
            # Initialize eigenvector with equal values
            eigenvector = [1.0 / n] * n
            
            # Power iteration (simplified - limited iterations for performance)
            max_iterations = 10
            tolerance = 1e-4
            
            for iteration in range(max_iterations):
                new_eigenvector = [0.0] * n
                
                # Matrix-vector multiplication
                for i, node in enumerate(nodes):
                    for neighbor, weight in network_graph.get(node, {}).items():
                        j = node_index.get(neighbor)
                        if j is not None:
                            new_eigenvector[i] += weight * eigenvector[j]
                
                # Normalize
                norm = math.sqrt(sum(x * x for x in new_eigenvector))
                if norm > 0:
                    new_eigenvector = [x / norm for x in new_eigenvector]
                
                # Check convergence
                diff = sum(abs(new_eigenvector[i] - eigenvector[i]) for i in range(n))
                eigenvector = new_eigenvector
                
                if diff < tolerance:
                    break
            
            # Return eigenvector centrality for target entity
            target_index = node_index[entity_id]
            return eigenvector[target_index]
            
        except Exception as e:
            logger.error(f"Failed to calculate eigenvector centrality for {entity_id}: {e}")
            return 0.0
    
    async def _count_shortest_paths_through_node(self, source: str, target: str, 
                                               intermediate: str, 
                                               network_graph: Dict[str, Dict[str, float]]) -> int:
        """Count shortest paths from source to target that pass through intermediate node"""
        try:
            # Simple path counting - check if shortest path includes intermediate
            path_via_intermediate = await self._find_shortest_path_length(source, intermediate, network_graph)
            path_intermediate_target = await self._find_shortest_path_length(intermediate, target, network_graph)
            direct_path = await self._find_shortest_path_length(source, target, network_graph)
            
            if (path_via_intermediate is not None and path_intermediate_target is not None and 
                direct_path is not None):
                total_via_intermediate = path_via_intermediate + path_intermediate_target
                
                # If path through intermediate equals shortest direct path, count it
                if abs(total_via_intermediate - direct_path) < 0.01:
                    return 1
            
            return 0
            
        except Exception as e:
            logger.debug(f"Error counting paths through {intermediate}: {e}")
            return 0
    
    async def _count_total_shortest_paths(self, source: str, target: str, 
                                        network_graph: Dict[str, Dict[str, float]]) -> int:
        """Count total number of shortest paths between source and target"""
        # Simplified - assume 1 shortest path exists if connected
        try:
            path_length = await self._find_shortest_path_length(source, target, network_graph)
            return 1 if path_length is not None else 0
        except Exception:
            return 0
    
    async def _find_shortest_path_length(self, source: str, target: str, 
                                       network_graph: Dict[str, Dict[str, float]]) -> Optional[float]:
        """Find shortest path length between two nodes using Dijkstra's algorithm"""
        try:
            if source not in network_graph or target not in network_graph:
                return None
            
            if source == target:
                return 0.0
            
            # Dijkstra's algorithm
            distances = {node: float('inf') for node in network_graph}
            distances[source] = 0.0
            unvisited = set(network_graph.keys())
            
            while unvisited:
                # Find unvisited node with minimum distance
                current = min(unvisited, key=lambda node: distances[node])
                
                if distances[current] == float('inf'):
                    break
                
                if current == target:
                    return distances[target]
                
                unvisited.remove(current)
                
                # Update distances to neighbors
                for neighbor, weight in network_graph.get(current, {}).items():
                    if neighbor in unvisited:
                        # Use inverse weight as distance (higher confidence = shorter distance)
                        edge_distance = 1.0 / max(weight, 0.1)
                        new_distance = distances[current] + edge_distance
                        
                        if new_distance < distances[neighbor]:
                            distances[neighbor] = new_distance
            
            return distances[target] if distances[target] != float('inf') else None
            
        except Exception as e:
            logger.debug(f"Error finding shortest path from {source} to {target}: {e}")
            return None