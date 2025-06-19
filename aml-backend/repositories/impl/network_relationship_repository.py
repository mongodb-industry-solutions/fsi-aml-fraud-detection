"""
Network Relationship Repository - Streamlined implementation for graph operations

Optimized repository for the relationships collection using $graphLookup and 
advanced MongoDB graph operations for network analysis.
"""

import logging
import os
from datetime import datetime
from typing import Dict, List, Optional, Any, Set
from bson import ObjectId

from repositories.interfaces.relationship_repository import (
    RelationshipRepositoryInterface, RelationshipQueryParams, RelationshipStats
)
from reference.mongodb_core_lib import MongoDBRepository, AggregationBuilder, GraphOperations
from models.core.relationship import RelationshipType, NetworkRelationship, EntityNetwork

logger = logging.getLogger(__name__)


class NetworkRelationshipRepository(RelationshipRepositoryInterface):
    """
    Network-focused relationship repository using mongodb_core_lib
    
    Optimized for graph operations with $graphLookup, network traversal,
    and relationship analytics using the relationships collection.
    """
    
    def __init__(self, mongodb_repo: MongoDBRepository):
        """
        Initialize network relationship repository
        
        Args:
            mongodb_repo: MongoDB repository instance from core lib
        """
        self.repo = mongodb_repo
        self.collection_name = os.getenv("RELATIONSHIPS_COLLECTION", "relationships")
        self.collection = self.repo.collection(self.collection_name)
        
        # Initialize graph operations
        self.graph_ops = self.repo.graph(self.collection_name)
        self.aggregation = self.repo.aggregation
        
        logger.info(f"Network relationship repository initialized for collection: {self.collection_name}")
    
    # ==================== CORE RELATIONSHIP OPERATIONS ====================
    
    async def create(self, relationship_data: Dict[str, Any]) -> str:
        """Create a new network relationship"""
        try:
            # Ensure required fields match network schema
            if not relationship_data.get("relationshipId"):
                relationship_data["relationshipId"] = self._generate_relationship_id()
            
            # Validate schema compliance
            required_fields = ["source", "target", "type", "direction", "strength", "confidence"]
            for field in required_fields:
                if field not in relationship_data:
                    raise ValueError(f"Missing required field: {field}")
            
            # Set defaults
            relationship_data.update({
                "active": relationship_data.get("active", True),
                "verified": relationship_data.get("verified", False),
                "evidence": relationship_data.get("evidence", [])
            })
            
            result = await self.collection.insert_one(relationship_data)
            
            logger.info(f"Created network relationship: {result.inserted_id}")
            return str(result.inserted_id)
            
        except Exception as e:
            logger.error(f"Failed to create network relationship: {e}")
            raise Exception(f"Network relationship creation failed: {e}")
    
    async def find_by_id(self, relationship_id: str) -> Optional[Dict[str, Any]]:
        """Find relationship by ID"""
        try:
            result = await self.collection.find_one({"_id": ObjectId(relationship_id)})
            if result:
                result["_id"] = str(result["_id"])
            return result
            
        except Exception as e:
            logger.error(f"Failed to find relationship {relationship_id}: {e}")
            return None
    
    async def update(self, relationship_id: str, update_data: Dict[str, Any]) -> bool:
        """Update relationship"""
        try:
            result = await self.collection.update_one(
                {"_id": ObjectId(relationship_id)},
                {"$set": update_data}
            )
            
            success = result.modified_count > 0
            if success:
                logger.info(f"Updated network relationship {relationship_id}")
            
            return success
            
        except Exception as e:
            logger.error(f"Failed to update relationship {relationship_id}: {e}")
            return False
    
    async def delete(self, relationship_id: str) -> bool:
        """Delete relationship"""
        try:
            result = await self.collection.delete_one({"_id": ObjectId(relationship_id)})
            
            success = result.deleted_count > 0
            if success:
                logger.info(f"Deleted network relationship {relationship_id}")
            
            return success
            
        except Exception as e:
            logger.error(f"Failed to delete relationship {relationship_id}: {e}")
            return False
    
    # ==================== ADVANCED GRAPH OPERATIONS ====================
    
    async def build_entity_network(self, entity_id: str, 
                                 max_depth: int = 3,
                                 relationship_types: Optional[List[RelationshipType]] = None,
                                 min_confidence: Optional[float] = None) -> EntityNetwork:
        """
        Build comprehensive entity network using $graphLookup
        
        Args:
            entity_id: Starting entity ID
            max_depth: Maximum traversal depth
            relationship_types: Filter by relationship types
            min_confidence: Minimum confidence threshold
            
        Returns:
            EntityNetwork: Complete network graph
        """
        try:
            logger.info(f"Building network for entity {entity_id} with depth {max_depth}")
            
            # Build match filter for active relationships
            match_filter = {"active": True}
            if relationship_types:
                match_filter["type"] = {"$in": [rt.value for rt in relationship_types]}
            if min_confidence:
                match_filter["confidence"] = {"$gte": min_confidence}
            
            # Use $graphLookup to traverse network from source perspective
            outgoing_pipeline = [
                {
                    "$graphLookup": {
                        "from": self.collection_name,
                        "startWith": entity_id,
                        "connectFromField": "target.entityId",
                        "connectToField": "source.entityId",
                        "as": "outgoing_relationships",
                        "maxDepth": max_depth - 1,
                        "restrictSearchWithMatch": match_filter
                    }
                }
            ]
            
            # Use $graphLookup to traverse network from target perspective  
            incoming_pipeline = [
                {
                    "$graphLookup": {
                        "from": self.collection_name,
                        "startWith": entity_id,
                        "connectFromField": "source.entityId", 
                        "connectToField": "target.entityId",
                        "as": "incoming_relationships",
                        "maxDepth": max_depth - 1,
                        "restrictSearchWithMatch": match_filter
                    }
                }
            ]
            
            # Start with a dummy document to enable $graphLookup
            dummy_doc = {"_id": ObjectId(), "entityId": entity_id}
            
            # Execute both graph lookups
            outgoing_results = await self.repo.execute_pipeline(
                "temp_collection", 
                [{"$documents": [dummy_doc]}] + outgoing_pipeline
            )
            
            incoming_results = await self.repo.execute_pipeline(
                "temp_collection",
                [{"$documents": [dummy_doc]}] + incoming_pipeline  
            )
            
            # Combine and deduplicate relationships
            all_relationships = []
            relationship_ids = set()
            
            if outgoing_results:
                for rel in outgoing_results[0].get("outgoing_relationships", []):
                    rel_id = str(rel.get("_id"))
                    if rel_id not in relationship_ids:
                        relationship_ids.add(rel_id)
                        rel["_id"] = rel_id
                        all_relationships.append(rel)
            
            if incoming_results:
                for rel in incoming_results[0].get("incoming_relationships", []):
                    rel_id = str(rel.get("_id"))
                    if rel_id not in relationship_ids:
                        relationship_ids.add(rel_id)
                        rel["_id"] = rel_id
                        all_relationships.append(rel)
            
            # Calculate network statistics
            network_stats = self._calculate_network_stats(all_relationships)
            relationship_types_found = list(set(rel.get("type") for rel in all_relationships))
            
            return EntityNetwork(
                center_entity_id=entity_id,
                relationships=all_relationships,
                total_relationships=len(all_relationships),
                relationship_types=[RelationshipType(rt) for rt in relationship_types_found if rt],
                average_strength=network_stats["avg_strength"],
                average_confidence=network_stats["avg_confidence"],
                verified_count=network_stats["verified_count"],
                max_depth_reached=network_stats["max_depth"]
            )
            
        except Exception as e:
            logger.error(f"Failed to build entity network for {entity_id}: {e}")
            return EntityNetwork(
                center_entity_id=entity_id,
                relationships=[],
                total_relationships=0,
                relationship_types=[],
                average_strength=0.0,
                average_confidence=0.0,
                verified_count=0,
                max_depth_reached=0
            )
    
    async def find_shortest_path(self, source_entity_id: str, 
                               target_entity_id: str,
                               max_depth: int = 6) -> Optional[List[Dict[str, Any]]]:
        """
        Find shortest path between two entities using BFS with MongoDB
        
        Args:
            source_entity_id: Starting entity ID
            target_entity_id: Target entity ID
            max_depth: Maximum path length
            
        Returns:
            Optional[List[Dict]]: Path of relationships or None
        """
        try:
            logger.info(f"Finding shortest path from {source_entity_id} to {target_entity_id}")
            
            # Use BFS algorithm with MongoDB aggregation
            visited = set()
            queue = [(source_entity_id, [])]
            
            for depth in range(max_depth):
                if not queue:
                    break
                
                next_queue = []
                
                for current_entity, path in queue:
                    if current_entity == target_entity_id and path:
                        return path
                    
                    if current_entity in visited:
                        continue
                    
                    visited.add(current_entity)
                    
                    # Find all relationships for current entity
                    neighbors_pipeline = [
                        {
                            "$match": {
                                "$or": [
                                    {"source.entityId": current_entity},
                                    {"target.entityId": current_entity}
                                ],
                                "active": True
                            }
                        }
                    ]
                    
                    relationships = await self.repo.execute_pipeline(
                        self.collection_name, neighbors_pipeline
                    )
                    
                    for rel in relationships:
                        # Determine next entity
                        if rel["source"]["entityId"] == current_entity:
                            next_entity = rel["target"]["entityId"]
                        else:
                            next_entity = rel["source"]["entityId"]
                        
                        if next_entity not in visited:
                            new_path = path + [rel]
                            if next_entity == target_entity_id:
                                return new_path
                            next_queue.append((next_entity, new_path))
                
                queue = next_queue
            
            return None
            
        except Exception as e:
            logger.error(f"Failed to find shortest path: {e}")
            return None
    
    async def detect_relationship_clusters(self, min_cluster_size: int = 3) -> List[List[str]]:
        """
        Detect clusters of highly connected entities using $graphLookup
        
        Args:
            min_cluster_size: Minimum entities in a cluster
            
        Returns:
            List[List[str]]: Clusters of entity IDs
        """
        try:
            logger.info(f"Detecting relationship clusters with min size {min_cluster_size}")
            
            # Get all unique entity IDs
            entity_pipeline = [
                {
                    "$group": {
                        "_id": None,
                        "entities": {
                            "$addToSet": {
                                "$concatArrays": [
                                    ["$source.entityId"],
                                    ["$target.entityId"]
                                ]
                            }
                        }
                    }
                },
                {"$unwind": "$entities"},
                {"$unwind": "$entities"},
                {"$group": {"_id": "$entities"}}
            ]
            
            entity_results = await self.repo.execute_pipeline(self.collection_name, entity_pipeline)
            all_entities = [result["_id"] for result in entity_results]
            
            visited_entities = set()
            clusters = []
            
            for entity_id in all_entities:
                if entity_id in visited_entities:
                    continue
                
                # Use $graphLookup to find connected component
                connected_pipeline = [
                    {"$documents": [{"entityId": entity_id}]},
                    {
                        "$graphLookup": {
                            "from": self.collection_name,
                            "startWith": "$entityId",
                            "connectFromField": "connected_entities",
                            "connectToField": "source.entityId",
                            "as": "component",
                            "maxDepth": 10,
                            "restrictSearchWithMatch": {"active": True}
                        }
                    }
                ]
                
                component_results = await self.repo.execute_pipeline("temp", connected_pipeline)
                
                if component_results:
                    component_entities = set([entity_id])
                    for rel in component_results[0].get("component", []):
                        component_entities.add(rel["source"]["entityId"])
                        component_entities.add(rel["target"]["entityId"])
                    
                    if len(component_entities) >= min_cluster_size:
                        clusters.append(list(component_entities))
                    
                    visited_entities.update(component_entities)
            
            logger.info(f"Detected {len(clusters)} relationship clusters")
            return clusters
            
        except Exception as e:
            logger.error(f"Failed to detect relationship clusters: {e}")
            return []
    
    # ==================== HELPER METHODS ====================
    
    def _generate_relationship_id(self) -> str:
        """Generate unique relationship ID"""
        import random
        import string
        
        suffix = ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))
        return f"REL{suffix}"
    
    def _calculate_network_stats(self, relationships: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Calculate network statistics"""
        if not relationships:
            return {
                "avg_strength": 0.0,
                "avg_confidence": 0.0, 
                "verified_count": 0,
                "max_depth": 0
            }
        
        strengths = [rel.get("strength", 0.0) for rel in relationships]
        confidences = [rel.get("confidence", 0.0) for rel in relationships]
        verified_count = sum(1 for rel in relationships if rel.get("verified", False))
        
        return {
            "avg_strength": sum(strengths) / len(strengths),
            "avg_confidence": sum(confidences) / len(confidences),
            "verified_count": verified_count,
            "max_depth": len(relationships)  # Simplified calculation
        }
    
    # ==================== INTERFACE COMPLIANCE METHODS ====================
    # (Simplified implementations for interface compliance)
    
    async def find_by_criteria(self, params: RelationshipQueryParams) -> Dict[str, Any]:
        """Find relationships by criteria"""
        try:
            match_conditions = {}
            
            if params.source_entity_id:
                match_conditions["source.entityId"] = params.source_entity_id
            if params.target_entity_id:
                match_conditions["target.entityId"] = params.target_entity_id
            if params.relationship_types:
                match_conditions["type"] = {"$in": [rt.value for rt in params.relationship_types]}
            if params.min_confidence:
                match_conditions["confidence"] = {"$gte": params.min_confidence}
            if params.verified_only:
                match_conditions["verified"] = True
            
            pipeline = []
            if match_conditions:
                pipeline.append({"$match": match_conditions})
            
            # Get total count
            count_pipeline = pipeline + [{"$count": "total"}]
            count_result = await self.repo.execute_pipeline(self.collection_name, count_pipeline)
            total_count = count_result[0]["total"] if count_result else 0
            
            # Get results with pagination
            results_pipeline = (pipeline + 
                              [{"$sort": {params.sort_by: 1 if params.sort_order == "asc" else -1}},
                               {"$skip": params.offset},
                               {"$limit": params.limit}])
            
            relationships = await self.repo.execute_pipeline(self.collection_name, results_pipeline)
            
            # Convert ObjectIds to strings
            for rel in relationships:
                rel["_id"] = str(rel["_id"])
            
            return {
                "relationships": relationships,
                "total_count": total_count,
                "has_more": params.offset + len(relationships) < total_count,
                "limit": params.limit,
                "offset": params.offset
            }
            
        except Exception as e:
            logger.error(f"Failed to find relationships by criteria: {e}")
            return {"relationships": [], "total_count": 0, "has_more": False, "limit": params.limit, "offset": params.offset}
    
    # Stub implementations for remaining interface methods
    async def find_existing_relationship(self, source_entity_id: str, target_entity_id: str, relationship_type: RelationshipType) -> Optional[Dict[str, Any]]:
        """Find existing relationship"""
        result = await self.collection.find_one({
            "source.entityId": source_entity_id,
            "target.entityId": target_entity_id,
            "type": relationship_type.value
        })
        if result:
            result["_id"] = str(result["_id"])
        return result
    
    async def find_bidirectional_relationship(self, entity_a_id: str, entity_b_id: str, relationship_type: Optional[RelationshipType] = None) -> Optional[Dict[str, Any]]:
        """Find bidirectional relationship"""
        query = {
            "$or": [
                {"source.entityId": entity_a_id, "target.entityId": entity_b_id},
                {"source.entityId": entity_b_id, "target.entityId": entity_a_id}
            ]
        }
        if relationship_type:
            query["type"] = relationship_type.value
        
        result = await self.collection.find_one(query)
        if result:
            result["_id"] = str(result["_id"])
        return result
    
    async def get_entity_relationships(self, entity_id: str, relationship_types: Optional[List[RelationshipType]] = None, min_confidence: Optional[float] = None, limit: int = 50) -> List[Dict[str, Any]]:
        """Get entity relationships"""
        query = {
            "$or": [
                {"source.entityId": entity_id},
                {"target.entityId": entity_id}
            ]
        }
        
        if relationship_types:
            query["type"] = {"$in": [rt.value for rt in relationship_types]}
        if min_confidence:
            query["confidence"] = {"$gte": min_confidence}
        
        cursor = self.collection.find(query).limit(limit)
        results = await cursor.to_list(None)
        
        for result in results:
            result["_id"] = str(result["_id"])
        
        return results
    
    async def get_connected_entities(self, entity_id: str, relationship_types: Optional[List[RelationshipType]] = None, max_depth: int = 2, min_confidence: Optional[float] = None) -> List[Dict[str, Any]]:
        """Get connected entities using simplified approach"""
        network = await self.build_entity_network(entity_id, max_depth, relationship_types, min_confidence)
        
        connected_entities = []
        for rel in network.relationships:
            if rel["source"]["entityId"] == entity_id:
                connected_entities.append({
                    "entity_id": rel["target"]["entityId"],
                    "relationship": rel,
                    "relationship_path_length": 1
                })
            else:
                connected_entities.append({
                    "entity_id": rel["source"]["entityId"], 
                    "relationship": rel,
                    "relationship_path_length": 1
                })
        
        return connected_entities
    
    # Additional stub implementations for interface compliance
    async def verify_relationship(self, relationship_id: str, verified_by: str, evidence: Optional[str] = None) -> bool:
        return await self.update(relationship_id, {"verified": True, "verified_by": verified_by})
    
    async def add_evidence(self, relationship_id: str, evidence: str) -> bool:
        result = await self.collection.update_one(
            {"_id": ObjectId(relationship_id)},
            {"$addToSet": {"evidence": {"type": "manual", "description": evidence, "source": "user_input"}}}
        )
        return result.modified_count > 0
    
    async def update_confidence(self, relationship_id: str, new_confidence: float, reason: Optional[str] = None) -> bool:
        return await self.update(relationship_id, {"confidence": new_confidence})
    
    async def get_statistics(self, entity_id: Optional[str] = None, start_date: Optional[datetime] = None, end_date: Optional[datetime] = None) -> RelationshipStats:
        return RelationshipStats()
    
    async def count_by_type(self, relationship_types: Optional[List[RelationshipType]] = None) -> Dict[str, int]:
        pipeline = [{"$group": {"_id": "$type", "count": {"$sum": 1}}}]
        results = await self.repo.execute_pipeline(self.collection_name, pipeline)
        return {item["_id"]: item["count"] for item in results}
    
    async def get_most_connected_entities(self, limit: int = 10) -> List[Dict[str, Any]]:
        return []
    
    async def calculate_relationship_strength_distribution(self) -> Dict[str, int]:
        return {}
    
    async def create_resolution_relationship(self, source_entity_id: str, target_entity_id: str, resolution_type: str, confidence: float, resolution_id: str) -> str:
        relationship_data = {
            "relationshipId": self._generate_relationship_id(),
            "source": {"entityId": source_entity_id, "entityType": "individual"},
            "target": {"entityId": target_entity_id, "entityType": "individual"},
            "type": f"resolution_{resolution_type}",
            "direction": "bidirectional",
            "strength": confidence,
            "confidence": confidence,
            "active": True,
            "verified": confidence > 0.9,
            "evidence": [{"type": "resolution", "description": f"Created by resolution {resolution_id}", "source": "entity_resolution_system"}],
            "datasource": "entity_resolution_system"
        }
        return await self.create(relationship_data)
    
    async def get_resolution_relationships(self, resolution_id: str) -> List[Dict[str, Any]]:
        return []
    
    async def detect_relationship_loops(self, entity_id: str, max_depth: int = 4) -> List[List[str]]:
        return []
    
    async def get_relationship_clusters(self, min_cluster_size: int = 3) -> List[List[str]]:
        return await self.detect_relationship_clusters(min_cluster_size)
    
    async def bulk_create(self, relationships_data: List[Dict[str, Any]]) -> List[str]:
        try:
            for rel_data in relationships_data:
                if not rel_data.get("relationshipId"):
                    rel_data["relationshipId"] = self._generate_relationship_id()
            
            result = await self.collection.insert_many(relationships_data)
            return [str(oid) for oid in result.inserted_ids]
        except Exception as e:
            logger.error(f"Failed to bulk create relationships: {e}")
            return []
    
    async def bulk_update_confidence(self, updates: List[tuple]) -> int:
        return 0
    
    async def bulk_verify(self, relationship_ids: List[str], verified_by: str) -> int:
        return 0
    
    async def validate_relationship_integrity(self, relationship_id: str) -> Dict[str, Any]:
        return {"valid": True, "issues": []}
    
    async def cleanup_orphaned_relationships(self) -> int:
        return 0
    
    async def deduplicate_relationships(self) -> Dict[str, int]:
        return {"duplicates_found": 0, "duplicates_removed": 0}