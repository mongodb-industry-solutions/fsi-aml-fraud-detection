"""
Relationship manager service for handling entity relationships and network analysis
"""

import logging
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime

from motor.motor_asyncio import AsyncIOMotorDatabase
from pymongo.errors import PyMongoError
from bson import ObjectId

from models.relationship import (
    Relationship,
    CreateRelationshipRequest,
    UpdateRelationshipRequest,
    RelationshipQueryParams,
    RelationshipListResponse,
    RelationshipStats,
    EntityNetwork,
    NetworkNode,
    NetworkEdge,
    RelationshipOperationResponse,
    EntityReference,
    RelationshipEvidence
)

logger = logging.getLogger(__name__)

class RelationshipManagerService:
    """Service for managing entity relationships and network analysis"""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.relationships_collection = db.relationships
        self.entities_collection = db.entities
    
    async def create_relationship(self, request: CreateRelationshipRequest) -> RelationshipOperationResponse:
        """Create a new relationship between entities"""
        try:
            # Validate entities exist
            source_entity = await self.entities_collection.find_one({"entityId": request.sourceEntityId})
            target_entity = await self.entities_collection.find_one({"entityId": request.targetEntityId})
            
            if not source_entity:
                return RelationshipOperationResponse(
                    success=False,
                    message=f"Source entity {request.sourceEntityId} not found"
                )
            
            if not target_entity:
                return RelationshipOperationResponse(
                    success=False,
                    message=f"Target entity {request.targetEntityId} not found"
                )
            
            # Check for existing relationship
            existing = await self._find_existing_relationship(
                request.sourceEntityId, 
                request.targetEntityId, 
                request.type
            )
            
            if existing:
                return RelationshipOperationResponse(
                    success=False,
                    message="Relationship already exists between these entities",
                    relationshipId=str(existing["_id"])
                )
            
            # Create relationship object
            relationship_data = {
                "source": EntityReference(
                    entityId=request.sourceEntityId,
                    entityType=source_entity.get("entityType", "individual"),
                    entityName=source_entity.get("name", {}).get("full", "")
                ).dict(),
                "target": EntityReference(
                    entityId=request.targetEntityId,
                    entityType=target_entity.get("entityType", "individual"),
                    entityName=target_entity.get("name", {}).get("full", "")
                ).dict(),
                "type": request.type,
                "direction": request.direction,
                "strength": request.strength,
                "evidence": request.evidence.dict() if request.evidence else RelationshipEvidence().dict(),
                "datasource": request.datasource,
                "createdAt": datetime.utcnow(),
                "createdBy": request.createdBy,
                "status": "active",
                "notes": request.notes
            }
            
            # Insert relationship
            result = await self.relationships_collection.insert_one(relationship_data)
            
            logger.info(f"Created relationship {result.inserted_id} between {request.sourceEntityId} and {request.targetEntityId}")
            
            return RelationshipOperationResponse(
                success=True,
                message="Relationship created successfully",
                relationshipId=str(result.inserted_id),
                affectedEntityIds=[request.sourceEntityId, request.targetEntityId]
            )
            
        except Exception as e:
            logger.error(f"Error creating relationship: {e}")
            return RelationshipOperationResponse(
                success=False,
                message=f"Failed to create relationship: {str(e)}"
            )
    
    async def update_relationship(
        self, 
        relationship_id: str, 
        request: UpdateRelationshipRequest
    ) -> RelationshipOperationResponse:
        """Update an existing relationship"""
        try:
            # Validate relationship exists
            existing = await self.relationships_collection.find_one({"_id": ObjectId(relationship_id)})
            if not existing:
                return RelationshipOperationResponse(
                    success=False,
                    message="Relationship not found",
                    relationshipId=relationship_id
                )
            
            # Build update data
            update_data = {"$set": {"updatedAt": datetime.utcnow()}}
            
            if request.type is not None:
                update_data["$set"]["type"] = request.type
            if request.direction is not None:
                update_data["$set"]["direction"] = request.direction
            if request.strength is not None:
                update_data["$set"]["strength"] = request.strength
            if request.evidence is not None:
                update_data["$set"]["evidence"] = request.evidence.dict()
            if request.status is not None:
                update_data["$set"]["status"] = request.status
            if request.notes is not None:
                update_data["$set"]["notes"] = request.notes
            if request.updatedBy is not None:
                update_data["$set"]["updatedBy"] = request.updatedBy
            
            # Update relationship
            result = await self.relationships_collection.update_one(
                {"_id": ObjectId(relationship_id)},
                update_data
            )
            
            if result.modified_count == 0:
                return RelationshipOperationResponse(
                    success=False,
                    message="No changes made to relationship",
                    relationshipId=relationship_id
                )
            
            # Get affected entity IDs
            affected_entities = [existing["source"]["entityId"], existing["target"]["entityId"]]
            
            return RelationshipOperationResponse(
                success=True,
                message="Relationship updated successfully",
                relationshipId=relationship_id,
                affectedEntityIds=affected_entities
            )
            
        except Exception as e:
            logger.error(f"Error updating relationship {relationship_id}: {e}")
            return RelationshipOperationResponse(
                success=False,
                message=f"Failed to update relationship: {str(e)}",
                relationshipId=relationship_id
            )
    
    async def delete_relationship(self, relationship_id: str) -> RelationshipOperationResponse:
        """Delete a relationship"""
        try:
            # Get relationship before deletion for response
            existing = await self.relationships_collection.find_one({"_id": ObjectId(relationship_id)})
            if not existing:
                return RelationshipOperationResponse(
                    success=False,
                    message="Relationship not found",
                    relationshipId=relationship_id
                )
            
            # Delete relationship
            result = await self.relationships_collection.delete_one({"_id": ObjectId(relationship_id)})
            
            if result.deleted_count == 0:
                return RelationshipOperationResponse(
                    success=False,
                    message="Failed to delete relationship",
                    relationshipId=relationship_id
                )
            
            affected_entities = [existing["source"]["entityId"], existing["target"]["entityId"]]
            
            return RelationshipOperationResponse(
                success=True,
                message="Relationship deleted successfully",
                relationshipId=relationship_id,
                affectedEntityIds=affected_entities
            )
            
        except Exception as e:
            logger.error(f"Error deleting relationship {relationship_id}: {e}")
            return RelationshipOperationResponse(
                success=False,
                message=f"Failed to delete relationship: {str(e)}",
                relationshipId=relationship_id
            )
    
    async def get_relationships(self, params: RelationshipQueryParams) -> RelationshipListResponse:
        """Get relationships based on query parameters"""
        try:
            # Build query filter
            query_filter = {}
            
            if params.entityId:
                query_filter["$or"] = [
                    {"source.entityId": params.entityId},
                    {"target.entityId": params.entityId}
                ]
            
            if params.type:
                query_filter["type"] = params.type
            
            if params.status:
                query_filter["status"] = params.status
            
            if params.minStrength is not None:
                query_filter["strength"] = {"$gte": params.minStrength}
            
            if params.datasource:
                query_filter["datasource"] = params.datasource
            
            if params.createdBy:
                query_filter["createdBy"] = params.createdBy
            
            if params.createdAfter:
                query_filter["createdAt"] = {"$gte": params.createdAfter}
            
            # Get total count
            total_count = await self.relationships_collection.count_documents(query_filter)
            
            # Get relationships with pagination
            cursor = self.relationships_collection.find(query_filter)
            cursor = cursor.skip(params.skip).limit(params.limit)
            cursor = cursor.sort("createdAt", -1)  # Most recent first
            
            raw_relationships = await cursor.to_list(length=params.limit)
            
            # Convert to Relationship models
            relationships = []
            for rel_data in raw_relationships:
                try:
                    rel_data["id"] = str(rel_data["_id"])
                    relationship = Relationship(**rel_data)
                    relationships.append(relationship)
                except Exception as e:
                    logger.warning(f"Failed to convert relationship to model: {e}")
                    continue
            
            # Calculate pagination info
            page = (params.skip // params.limit) + 1
            has_more = (params.skip + len(relationships)) < total_count
            
            return RelationshipListResponse(
                relationships=relationships,
                totalCount=total_count,
                page=page,
                pageSize=len(relationships),
                hasMore=has_more
            )
            
        except Exception as e:
            logger.error(f"Error getting relationships: {e}")
            return RelationshipListResponse(
                relationships=[],
                totalCount=0,
                page=1,
                pageSize=0,
                hasMore=False
            )
    
    async def get_relationship_stats(self) -> RelationshipStats:
        """Get statistics about relationships"""
        try:
            # Total relationships
            total = await self.relationships_collection.count_documents({})
            
            # Count by type
            type_pipeline = [
                {"$group": {"_id": "$type", "count": {"$sum": 1}}},
                {"$sort": {"count": -1}}
            ]
            type_cursor = self.relationships_collection.aggregate(type_pipeline)
            type_results = await type_cursor.to_list(length=None)
            relationships_by_type = {item["_id"]: item["count"] for item in type_results}
            
            # Count by status
            status_pipeline = [
                {"$group": {"_id": "$status", "count": {"$sum": 1}}},
                {"$sort": {"count": -1}}
            ]
            status_cursor = self.relationships_collection.aggregate(status_pipeline)
            status_results = await status_cursor.to_list(length=None)
            relationships_by_status = {item["_id"]: item["count"] for item in status_results}
            
            # Average strength
            avg_pipeline = [
                {"$group": {"_id": None, "avgStrength": {"$avg": "$strength"}}}
            ]
            avg_cursor = self.relationships_collection.aggregate(avg_pipeline)
            avg_results = await avg_cursor.to_list(length=1)
            average_strength = avg_results[0]["avgStrength"] if avg_results else 0.0
            
            # High confidence count (>0.8)
            high_confidence = await self.relationships_collection.count_documents({"strength": {"$gt": 0.8}})
            
            return RelationshipStats(
                totalRelationships=total,
                relationshipsByType=relationships_by_type,
                relationshipsByStatus=relationships_by_status,
                averageStrength=average_strength,
                highConfidenceCount=high_confidence
            )
            
        except Exception as e:
            logger.error(f"Error getting relationship stats: {e}")
            return RelationshipStats(
                totalRelationships=0,
                relationshipsByType={},
                relationshipsByStatus={},
                averageStrength=0.0,
                highConfidenceCount=0
            )
    
    async def get_entity_network(
        self, 
        entity_id: str, 
        max_depth: int = 2, 
        min_strength: float = 0.5
    ) -> EntityNetwork:
        """Get network of relationships for an entity"""
        try:
            # Get all relationships within depth and strength threshold
            visited_entities = set()
            all_relationships = []
            
            # BFS to find connected entities
            queue = [(entity_id, 0)]  # (entity_id, depth)
            visited_entities.add(entity_id)
            
            while queue and len(visited_entities) < 100:  # Limit network size
                current_entity, depth = queue.pop(0)
                
                if depth >= max_depth:
                    continue
                
                # Find relationships for current entity
                relationships_cursor = self.relationships_collection.find({
                    "$or": [
                        {"source.entityId": current_entity},
                        {"target.entityId": current_entity}
                    ],
                    "strength": {"$gte": min_strength},
                    "status": "active"
                })
                
                entity_relationships = await relationships_cursor.to_list(length=None)
                all_relationships.extend(entity_relationships)
                
                # Add connected entities to queue
                for rel in entity_relationships:
                    source_id = rel["source"]["entityId"]
                    target_id = rel["target"]["entityId"]
                    
                    # Add the other entity to queue if not visited
                    other_entity = target_id if source_id == current_entity else source_id
                    if other_entity not in visited_entities:
                        visited_entities.add(other_entity)
                        queue.append((other_entity, depth + 1))
            
            # Get entity details for all visited entities
            entity_details = {}
            if visited_entities:
                entities_cursor = self.entities_collection.find(
                    {"entityId": {"$in": list(visited_entities)}}
                )
                entities = await entities_cursor.to_list(length=None)
                entity_details = {entity["entityId"]: entity for entity in entities}
            
            # Create network nodes
            nodes = []
            for entity_id in visited_entities:
                entity_data = entity_details.get(entity_id, {})
                risk_score = entity_data.get("riskAssessment", {}).get("overall", {}).get("score", 0)
                
                node = NetworkNode(
                    entityId=entity_id,
                    entityType=entity_data.get("entityType", "individual"),
                    entityName=entity_data.get("name", {}).get("full", entity_id),
                    riskScore=risk_score,
                    nodeSize=self._calculate_node_size(risk_score),
                    color=self._get_risk_color(risk_score)
                )
                nodes.append(node)
            
            # Create network edges
            edges = []
            for rel in all_relationships:
                edge = NetworkEdge(
                    source=rel["source"]["entityId"],
                    target=rel["target"]["entityId"],
                    relationshipType=rel["type"],
                    strength=rel["strength"],
                    width=self._calculate_edge_width(rel["strength"]),
                    color=self._get_relationship_color(rel["type"])
                )
                edges.append(edge)
            
            # Calculate network stats
            stats = await self.get_relationship_stats()
            
            return EntityNetwork(
                centerEntityId=entity_id,
                nodes=nodes,
                edges=edges,
                totalNodes=len(nodes),
                totalEdges=len(edges),
                maxDepth=max_depth,
                stats=stats
            )
            
        except Exception as e:
            logger.error(f"Error getting entity network for {entity_id}: {e}")
            return EntityNetwork(
                centerEntityId=entity_id,
                nodes=[],
                edges=[],
                totalNodes=0,
                totalEdges=0,
                maxDepth=max_depth,
                stats=RelationshipStats(
                    totalRelationships=0,
                    relationshipsByType={},
                    relationshipsByStatus={},
                    averageStrength=0.0,
                    highConfidenceCount=0
                )
            )
    
    async def _find_existing_relationship(
        self, 
        source_id: str, 
        target_id: str, 
        relationship_type: str
    ) -> Optional[Dict[str, Any]]:
        """Find existing relationship between two entities"""
        try:
            return await self.relationships_collection.find_one({
                "$or": [
                    {"source.entityId": source_id, "target.entityId": target_id},
                    {"source.entityId": target_id, "target.entityId": source_id}
                ],
                "type": relationship_type,
                "status": {"$ne": "deleted"}
            })
        except Exception as e:
            logger.error(f"Error finding existing relationship: {e}")
            return None
    
    def _calculate_node_size(self, risk_score: Optional[float]) -> float:
        """Calculate node size based on risk score"""
        if risk_score is None:
            return 10.0
        
        # Scale from 8 to 20 based on risk score
        return 8.0 + (risk_score / 100.0) * 12.0
    
    def _get_risk_color(self, risk_score: Optional[float]) -> str:
        """Get color based on risk score"""
        if risk_score is None:
            return "#gray"
        
        if risk_score >= 75:
            return "#red"
        elif risk_score >= 50:
            return "#orange"
        elif risk_score >= 25:
            return "#yellow"
        else:
            return "#green"
    
    def _calculate_edge_width(self, strength: float) -> float:
        """Calculate edge width based on relationship strength"""
        return 1.0 + (strength * 4.0)  # Scale from 1 to 5
    
    def _get_relationship_color(self, relationship_type: str) -> str:
        """Get color based on relationship type"""
        color_map = {
            "confirmed_same_entity": "#blue",
            "potential_duplicate": "#purple",
            "business_associate": "#green",
            "family_member": "#pink",
            "shared_address": "#orange",
            "shared_identifier": "#cyan"
        }
        return color_map.get(relationship_type, "#gray")