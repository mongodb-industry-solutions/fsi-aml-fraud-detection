"""
Entity resolution service for managing entity merging and resolution decisions
"""

import logging
from typing import Dict, Any, Optional, List
from datetime import datetime

from motor.motor_asyncio import AsyncIOMotorDatabase
from pymongo.errors import PyMongoError
from bson import ObjectId

from models.entity_resolution import (
    ResolutionDecisionInput, 
    ResolutionResponse, 
    ResolutionDecision,
    EntityResolution
)
from models.relationship import (
    Relationship,
    EntityReference,
    RelationshipEvidence,
    RelationshipType,
    RelationshipDirection,
    CreateRelationshipRequest
)

logger = logging.getLogger(__name__)

class EntityResolutionService:
    """Service for handling entity resolution and merging operations"""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.entities_collection = db.entities
        self.relationships_collection = db.relationships
    
    async def resolve_entities(self, decision_input: ResolutionDecisionInput) -> ResolutionResponse:
        """
        Process an entity resolution decision
        
        Args:
            decision_input: Resolution decision data
            
        Returns:
            ResolutionResponse with operation results
        """
        try:
            logger.info(f"Processing entity resolution: {decision_input.decision} between "
                       f"{decision_input.sourceEntityId} and {decision_input.targetMasterEntityId}")
            
            if decision_input.decision == ResolutionDecision.CONFIRMED_MATCH:
                return await self._handle_confirmed_match(decision_input)
            elif decision_input.decision == ResolutionDecision.NOT_A_MATCH:
                return await self._handle_not_a_match(decision_input)
            elif decision_input.decision == ResolutionDecision.NEEDS_REVIEW:
                return await self._handle_needs_review(decision_input)
            else:
                raise ValueError(f"Unknown resolution decision: {decision_input.decision}")
                
        except Exception as e:
            logger.error(f"Error processing entity resolution: {e}")
            return ResolutionResponse(
                success=False,
                message=f"Failed to process resolution: {str(e)}",
                sourceEntityId=decision_input.sourceEntityId,
                targetMasterEntityId=decision_input.targetMasterEntityId,
                decision=decision_input.decision
            )
    
    async def _handle_confirmed_match(self, decision_input: ResolutionDecisionInput) -> ResolutionResponse:
        """Handle confirmed match resolution"""
        updated_entities = []
        relationship_id = None
        
        try:
            # Fetch both entities
            source_entity = await self._get_entity(decision_input.sourceEntityId)
            target_entity = await self._get_entity(decision_input.targetMasterEntityId)
            
            if not source_entity:
                raise ValueError(f"Source entity {decision_input.sourceEntityId} not found")
            if not target_entity:
                raise ValueError(f"Target entity {decision_input.targetMasterEntityId} not found")
            
            # Update source entity resolution status
            source_resolution = EntityResolution(
                status="resolved",
                masterEntityId=decision_input.targetMasterEntityId,
                confidence=decision_input.matchConfidence,
                resolvedBy=decision_input.resolvedBy,
                resolvedAt=datetime.utcnow(),
                linkedEntities=[decision_input.targetMasterEntityId]
            )
            
            await self._update_entity_resolution(
                decision_input.sourceEntityId, 
                source_resolution
            )
            updated_entities.append(decision_input.sourceEntityId)
            
            # Update target entity if it was previously unresolved
            target_resolution = target_entity.get("resolution", {})
            if target_resolution.get("status") != "resolved":
                target_resolution_obj = EntityResolution(
                    status="resolved",
                    masterEntityId=decision_input.targetMasterEntityId,  # Points to itself
                    confidence=1.0,
                    resolvedBy=decision_input.resolvedBy,
                    resolvedAt=datetime.utcnow(),
                    linkedEntities=target_resolution.get("linkedEntities", [])
                )
                
                await self._update_entity_resolution(
                    decision_input.targetMasterEntityId,
                    target_resolution_obj
                )
                updated_entities.append(decision_input.targetMasterEntityId)
            
            # Add source entity to target's linked entities
            await self._add_linked_entity(
                decision_input.targetMasterEntityId,
                decision_input.sourceEntityId
            )
            
            # Create relationship record
            relationship_id = await self._create_resolution_relationship(
                decision_input, source_entity, target_entity
            )
            
            logger.info(f"Successfully resolved entities: {decision_input.sourceEntityId} -> "
                       f"{decision_input.targetMasterEntityId}")
            
            return ResolutionResponse(
                success=True,
                message="Entities successfully merged",
                sourceEntityId=decision_input.sourceEntityId,
                targetMasterEntityId=decision_input.targetMasterEntityId,
                decision=decision_input.decision,
                relationshipId=relationship_id,
                updatedEntities=updated_entities
            )
            
        except Exception as e:
            logger.error(f"Error handling confirmed match: {e}")
            raise
    
    async def _handle_not_a_match(self, decision_input: ResolutionDecisionInput) -> ResolutionResponse:
        """Handle not-a-match resolution"""
        try:
            # Create a dismissed relationship record
            source_entity = await self._get_entity(decision_input.sourceEntityId)
            target_entity = await self._get_entity(decision_input.targetMasterEntityId)
            
            if not source_entity or not target_entity:
                raise ValueError("One or both entities not found")
            
            # Create dismissed relationship
            relationship_id = await self._create_dismissed_relationship(
                decision_input, source_entity, target_entity
            )
            
            logger.info(f"Marked entities as not matching: {decision_input.sourceEntityId} "
                       f"and {decision_input.targetMasterEntityId}")
            
            return ResolutionResponse(
                success=True,
                message="Entities marked as not matching",
                sourceEntityId=decision_input.sourceEntityId,
                targetMasterEntityId=decision_input.targetMasterEntityId,
                decision=decision_input.decision,
                relationshipId=relationship_id
            )
            
        except Exception as e:
            logger.error(f"Error handling not-a-match: {e}")
            raise
    
    async def _handle_needs_review(self, decision_input: ResolutionDecisionInput) -> ResolutionResponse:
        """Handle needs review resolution"""
        try:
            # Create a pending review relationship
            source_entity = await self._get_entity(decision_input.sourceEntityId)
            target_entity = await self._get_entity(decision_input.targetMasterEntityId)
            
            if not source_entity or not target_entity:
                raise ValueError("One or both entities not found")
            
            relationship_id = await self._create_pending_relationship(
                decision_input, source_entity, target_entity
            )
            
            return ResolutionResponse(
                success=True,
                message="Entities marked for review",
                sourceEntityId=decision_input.sourceEntityId,
                targetMasterEntityId=decision_input.targetMasterEntityId,
                decision=decision_input.decision,
                relationshipId=relationship_id
            )
            
        except Exception as e:
            logger.error(f"Error handling needs review: {e}")
            raise
    
    async def _get_entity(self, entity_id: str) -> Optional[Dict[str, Any]]:
        """Get entity by ID"""
        try:
            return await self.entities_collection.find_one({"entityId": entity_id})
        except PyMongoError as e:
            logger.error(f"Error fetching entity {entity_id}: {e}")
            return None
    
    async def _update_entity_resolution(self, entity_id: str, resolution: EntityResolution):
        """Update entity resolution status"""
        try:
            update_data = {
                "$set": {
                    "resolution": resolution.dict(exclude_none=True),
                    "updatedAt": datetime.utcnow()
                }
            }
            
            result = await self.entities_collection.update_one(
                {"entityId": entity_id},
                update_data
            )
            
            if result.modified_count == 0:
                logger.warning(f"No entity updated for ID: {entity_id}")
            else:
                logger.info(f"Updated resolution for entity: {entity_id}")
                
        except PyMongoError as e:
            logger.error(f"Error updating entity resolution for {entity_id}: {e}")
            raise
    
    async def _add_linked_entity(self, master_entity_id: str, linked_entity_id: str):
        """Add an entity to the linked entities list"""
        try:
            await self.entities_collection.update_one(
                {"entityId": master_entity_id},
                {
                    "$addToSet": {"resolution.linkedEntities": linked_entity_id},
                    "$set": {"updatedAt": datetime.utcnow()}
                }
            )
        except PyMongoError as e:
            logger.error(f"Error adding linked entity: {e}")
            raise
    
    async def _create_resolution_relationship(
        self, 
        decision_input: ResolutionDecisionInput,
        source_entity: Dict[str, Any],
        target_entity: Dict[str, Any]
    ) -> str:
        """Create relationship record for confirmed match"""
        evidence = RelationshipEvidence(
            matchedAttributes=decision_input.matchedAttributes,
            manualConfidence=decision_input.matchConfidence,
            additionalData={
                "resolution_notes": decision_input.notes,
                "resolution_timestamp": datetime.utcnow().isoformat()
            }
        )
        
        relationship = Relationship(
            source=EntityReference(
                entityId=decision_input.sourceEntityId,
                entityType=source_entity.get("entityType", "individual"),
                entityName=source_entity.get("name", {}).get("full", "")
            ),
            target=EntityReference(
                entityId=decision_input.targetMasterEntityId,
                entityType=target_entity.get("entityType", "individual"),
                entityName=target_entity.get("name", {}).get("full", "")
            ),
            type=RelationshipType.CONFIRMED_SAME_ENTITY,
            direction=RelationshipDirection.BIDIRECTIONAL,
            strength=decision_input.matchConfidence,
            evidence=evidence,
            datasource="analyst_resolution_workbench",
            createdBy=decision_input.resolvedBy,
            status="active",
            notes=decision_input.notes
        )
        
        try:
            result = await self.relationships_collection.insert_one(
                relationship.dict(exclude={"id"}, by_alias=True)
            )
            logger.info(f"Created resolution relationship: {result.inserted_id}")
            return str(result.inserted_id)
            
        except PyMongoError as e:
            logger.error(f"Error creating resolution relationship: {e}")
            raise
    
    async def _create_dismissed_relationship(
        self,
        decision_input: ResolutionDecisionInput,
        source_entity: Dict[str, Any],
        target_entity: Dict[str, Any]
    ) -> str:
        """Create relationship record for dismissed match"""
        evidence = RelationshipEvidence(
            matchedAttributes=[],  # No matches for dismissed
            manualConfidence=0.0,
            additionalData={
                "dismissal_reason": decision_input.notes,
                "dismissal_timestamp": datetime.utcnow().isoformat()
            }
        )
        
        relationship = EntityRelationship(
            source=EntityReference(
                entityId=decision_input.sourceEntityId,
                entityType=source_entity.get("entityType", "individual"),
                entityName=source_entity.get("name", {}).get("full", "")
            ),
            target=EntityReference(
                entityId=decision_input.targetMasterEntityId,
                entityType=target_entity.get("entityType", "individual"),
                entityName=target_entity.get("name", {}).get("full", "")
            ),
            type=RelationshipType.POTENTIAL_DUPLICATE,
            direction=RelationshipDirection.BIDIRECTIONAL,
            strength=0.0,
            evidence=evidence,
            datasource="analyst_resolution_workbench",
            createdBy=decision_input.resolvedBy,
            status="dismissed",
            notes=decision_input.notes
        )
        
        try:
            result = await self.relationships_collection.insert_one(
                relationship.dict(exclude={"id"}, by_alias=True)
            )
            return str(result.inserted_id)
            
        except PyMongoError as e:
            logger.error(f"Error creating dismissed relationship: {e}")
            raise
    
    async def _create_pending_relationship(
        self,
        decision_input: ResolutionDecisionInput,
        source_entity: Dict[str, Any],
        target_entity: Dict[str, Any]
    ) -> str:
        """Create relationship record for pending review"""
        evidence = RelationshipEvidence(
            matchedAttributes=decision_input.matchedAttributes,
            manualConfidence=decision_input.matchConfidence,
            additionalData={
                "review_notes": decision_input.notes,
                "pending_since": datetime.utcnow().isoformat()
            }
        )
        
        relationship = EntityRelationship(
            source=EntityReference(
                entityId=decision_input.sourceEntityId,
                entityType=source_entity.get("entityType", "individual"),
                entityName=source_entity.get("name", {}).get("full", "")
            ),
            target=EntityReference(
                entityId=decision_input.targetMasterEntityId,
                entityType=target_entity.get("entityType", "individual"),
                entityName=target_entity.get("name", {}).get("full", "")
            ),
            type=RelationshipType.POTENTIAL_DUPLICATE,
            direction=RelationshipDirection.BIDIRECTIONAL,
            strength=decision_input.matchConfidence,
            evidence=evidence,
            datasource="analyst_resolution_workbench",
            createdBy=decision_input.resolvedBy,
            status="pending_review",
            notes=decision_input.notes
        )
        
        try:
            result = await self.relationships_collection.insert_one(
                relationship.dict(exclude={"id"}, by_alias=True)
            )
            return str(result.inserted_id)
            
        except PyMongoError as e:
            logger.error(f"Error creating pending relationship: {e}")
            raise
    
    async def get_entity_resolution_status(self, entity_id: str) -> Optional[Dict[str, Any]]:
        """Get resolution status for an entity"""
        try:
            entity = await self._get_entity(entity_id)
            if entity:
                return entity.get("resolution", {
                    "status": "unresolved",
                    "masterEntityId": None,
                    "confidence": None,
                    "linkedEntities": []
                })
            return None
            
        except Exception as e:
            logger.error(f"Error getting resolution status for {entity_id}: {e}")
            return None
    
    async def get_linked_entities(self, master_entity_id: str) -> List[Dict[str, Any]]:
        """Get all entities linked to a master entity"""
        try:
            master_entity = await self._get_entity(master_entity_id)
            if not master_entity:
                return []
            
            linked_ids = master_entity.get("resolution", {}).get("linkedEntities", [])
            if not linked_ids:
                return []
            
            # Fetch linked entities
            cursor = self.entities_collection.find({"entityId": {"$in": linked_ids}})
            linked_entities = await cursor.to_list(length=None)
            
            return linked_entities
            
        except Exception as e:
            logger.error(f"Error getting linked entities for {master_entity_id}: {e}")
            return []