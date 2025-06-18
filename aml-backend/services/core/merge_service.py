"""
Merge Service - Entity merging operations using repository pattern

Focused service for handling entity data consolidation, deduplication,
and merge conflict resolution using clean repository-based data access.
"""

import logging
from typing import Dict, Any, Optional, List
from datetime import datetime

from repositories.interfaces.entity_repository import EntityRepositoryInterface
from repositories.interfaces.relationship_repository import RelationshipRepositoryInterface
from models.core.entity import Entity
from models.core.relationship import Relationship, EntityReference, RelationshipEvidence, RelationshipType, RelationshipDirection

logger = logging.getLogger(__name__)


class MergeService:
    """
    Entity merging service using repository pattern
    
    Handles entity data consolidation, relationship creation,
    and merge conflict resolution through repository interfaces.
    """
    
    def __init__(self, 
                 entity_repo: EntityRepositoryInterface,
                 relationship_repo: RelationshipRepositoryInterface):
        """
        Initialize Merge service
        
        Args:
            entity_repo: Entity repository for entity operations
            relationship_repo: Relationship repository for relationship operations
        """
        self.entity_repo = entity_repo
        self.relationship_repo = relationship_repo
        
        # Merge configuration
        self.merge_strategies = {
            "name": "prefer_longer",
            "identifiers": "combine_unique",
            "contact": "prefer_complete",
            "risk_data": "prefer_higher"
        }
        
        logger.info("Merge service initialized with repository pattern")
    
    # ==================== ENTITY MERGING OPERATIONS ====================
    
    async def merge_entities(self, source_entity: Entity, target_entity: Entity, 
                           merge_decision: Dict[str, Any]) -> Dict[str, Any]:
        """
        Merge source entity into target entity with conflict resolution
        
        Args:
            source_entity: Source entity to merge from
            target_entity: Target entity to merge into
            merge_decision: Decision data with merge instructions
            
        Returns:
            Dictionary containing merge results and updated entities
        """
        try:
            logger.info(f"Merging entity {source_entity.entity_id} into {target_entity.entity_id}")
            
            # Analyze merge conflicts
            conflict_analysis = await self._analyze_merge_conflicts(source_entity, target_entity)
            
            # Resolve conflicts and create merged data
            merged_data = await self._resolve_merge_conflicts(
                source_entity, target_entity, conflict_analysis, merge_decision
            )
            
            # Update target entity with merged data
            updated_target = await self._update_target_entity(target_entity, merged_data)
            
            # Update source entity resolution status
            updated_source = await self._update_source_entity_resolution(
                source_entity, target_entity, merge_decision
            )
            
            # Create or update relationships
            relationship_id = await self._create_merge_relationship(
                source_entity, target_entity, merge_decision, conflict_analysis
            )
            
            # Handle linked entities if source was a master
            linked_entities_updated = await self._handle_linked_entities_transfer(
                source_entity, target_entity
            )
            
            merge_result = {
                "success": True,
                "merged_entity_id": target_entity.entity_id,
                "source_entity_id": source_entity.entity_id,
                "relationship_id": relationship_id,
                "conflict_analysis": conflict_analysis,
                "merged_data": merged_data,
                "linked_entities_transferred": linked_entities_updated,
                "merge_timestamp": datetime.utcnow().isoformat()
            }
            
            logger.info(f"Entity merge completed successfully. Relationship: {relationship_id}")
            return merge_result
            
        except Exception as e:
            logger.error(f"Error merging entities: {e}")
            return {
                "success": False,
                "error": str(e),
                "source_entity_id": source_entity.entity_id,
                "target_entity_id": target_entity.entity_id
            }
    
    async def _analyze_merge_conflicts(self, source_entity: Entity, target_entity: Entity) -> Dict[str, Any]:
        """Analyze potential conflicts between entities"""
        try:
            conflicts = {
                "name_conflicts": [],
                "identifier_conflicts": [],
                "contact_conflicts": [],
                "data_conflicts": [],
                "resolution_required": False
            }
            
            # Name conflicts
            if hasattr(source_entity, 'name') and hasattr(target_entity, 'name'):
                if source_entity.name and target_entity.name:
                    if source_entity.name.lower().strip() != target_entity.name.lower().strip():
                        conflicts["name_conflicts"].append({
                            "field": "name",
                            "source_value": source_entity.name,
                            "target_value": target_entity.name,
                            "recommended_action": "manual_review"
                        })
                        conflicts["resolution_required"] = True
            
            # Identifier conflicts
            source_ids = getattr(source_entity, 'identifiers', {})
            target_ids = getattr(target_entity, 'identifiers', {})
            
            for id_type in set(source_ids.keys()) & set(target_ids.keys()):
                if source_ids[id_type] != target_ids[id_type]:
                    conflicts["identifier_conflicts"].append({
                        "field": f"identifiers.{id_type}",
                        "source_value": source_ids[id_type],
                        "target_value": target_ids[id_type],
                        "recommended_action": "investigate"
                    })
                    conflicts["resolution_required"] = True
            
            # Contact conflicts
            source_contact = getattr(source_entity, 'contact', None)
            target_contact = getattr(target_entity, 'contact', None)
            
            if source_contact and target_contact:
                contact_conflicts = self._analyze_contact_conflicts(source_contact, target_contact)
                conflicts["contact_conflicts"].extend(contact_conflicts)
                if contact_conflicts:
                    conflicts["resolution_required"] = True
            
            return conflicts
            
        except Exception as e:
            logger.error(f"Error analyzing merge conflicts: {e}")
            return {"resolution_required": True, "error": str(e)}
    
    def _analyze_contact_conflicts(self, source_contact: Any, target_contact: Any) -> List[Dict[str, Any]]:
        """Analyze conflicts in contact information"""
        conflicts = []
        
        try:
            # Email conflicts
            if hasattr(source_contact, 'email') and hasattr(target_contact, 'email'):
                if (source_contact.email and target_contact.email and 
                    source_contact.email.lower() != target_contact.email.lower()):
                    conflicts.append({
                        "field": "contact.email",
                        "source_value": source_contact.email,
                        "target_value": target_contact.email,
                        "recommended_action": "combine"
                    })
            
            # Phone conflicts
            if hasattr(source_contact, 'phone') and hasattr(target_contact, 'phone'):
                if source_contact.phone and target_contact.phone:
                    # Normalize phones for comparison
                    source_phone = ''.join(filter(str.isdigit, source_contact.phone))
                    target_phone = ''.join(filter(str.isdigit, target_contact.phone))
                    if source_phone != target_phone:
                        conflicts.append({
                            "field": "contact.phone",
                            "source_value": source_contact.phone,
                            "target_value": target_contact.phone,
                            "recommended_action": "combine"
                        })
            
            # Address conflicts
            if hasattr(source_contact, 'address') and hasattr(target_contact, 'address'):
                if (source_contact.address and target_contact.address and 
                    str(source_contact.address) != str(target_contact.address)):
                    conflicts.append({
                        "field": "contact.address",
                        "source_value": str(source_contact.address),
                        "target_value": str(target_contact.address),
                        "recommended_action": "prefer_complete"
                    })
            
        except Exception as e:
            logger.error(f"Error analyzing contact conflicts: {e}")
        
        return conflicts
    
    async def _resolve_merge_conflicts(self, source_entity: Entity, target_entity: Entity,
                                     conflict_analysis: Dict[str, Any], 
                                     merge_decision: Dict[str, Any]) -> Dict[str, Any]:
        """Resolve merge conflicts using configured strategies"""
        try:
            merged_data = {}
            
            # Resolve name conflicts
            merged_data["name"] = self._resolve_name_conflict(
                source_entity, target_entity, merge_decision
            )
            
            # Resolve identifier conflicts
            merged_data["identifiers"] = self._resolve_identifier_conflicts(
                source_entity, target_entity, merge_decision
            )
            
            # Resolve contact conflicts
            merged_data["contact"] = self._resolve_contact_conflicts(
                source_entity, target_entity, merge_decision
            )
            
            # Merge other entity data
            merged_data.update(self._merge_additional_data(source_entity, target_entity))
            
            # Add merge metadata
            merged_data["merge_history"] = {
                "merged_from": source_entity.entity_id,
                "merge_timestamp": datetime.utcnow().isoformat(),
                "merge_method": "service_based_merge",
                "conflicts_detected": conflict_analysis.get("resolution_required", False)
            }
            
            return merged_data
            
        except Exception as e:
            logger.error(f"Error resolving merge conflicts: {e}")
            return {}
    
    def _resolve_name_conflict(self, source_entity: Entity, target_entity: Entity, 
                              merge_decision: Dict[str, Any]) -> str:
        """Resolve name conflicts using strategy"""
        try:
            source_name = getattr(source_entity, 'name', '')
            target_name = getattr(target_entity, 'name', '')
            
            strategy = self.merge_strategies.get("name", "prefer_longer")
            
            if strategy == "prefer_longer":
                return source_name if len(source_name) > len(target_name) else target_name
            elif strategy == "prefer_target":
                return target_name or source_name
            elif strategy == "prefer_source":
                return source_name or target_name
            else:
                return target_name or source_name
                
        except Exception as e:
            logger.error(f"Error resolving name conflict: {e}")
            return getattr(target_entity, 'name', '')
    
    def _resolve_identifier_conflicts(self, source_entity: Entity, target_entity: Entity,
                                    merge_decision: Dict[str, Any]) -> Dict[str, str]:
        """Resolve identifier conflicts using combine strategy"""
        try:
            source_ids = getattr(source_entity, 'identifiers', {})
            target_ids = getattr(target_entity, 'identifiers', {})
            
            merged_identifiers = target_ids.copy()
            
            for id_type, id_value in source_ids.items():
                if id_type not in merged_identifiers:
                    # Add new identifier from source
                    merged_identifiers[id_type] = id_value
                elif merged_identifiers[id_type] != id_value:
                    # Conflict - keep target but log alternative
                    logger.warning(f"Identifier conflict for {id_type}: "
                                 f"target={merged_identifiers[id_type]}, source={id_value}")
                    # Could store alternative identifier with suffix
                    merged_identifiers[f"{id_type}_alt"] = id_value
            
            return merged_identifiers
            
        except Exception as e:
            logger.error(f"Error resolving identifier conflicts: {e}")
            return getattr(target_entity, 'identifiers', {})
    
    def _resolve_contact_conflicts(self, source_entity: Entity, target_entity: Entity,
                                 merge_decision: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Resolve contact information conflicts"""
        try:
            source_contact = getattr(source_entity, 'contact', None)
            target_contact = getattr(target_entity, 'contact', None)
            
            if not source_contact:
                return target_contact.__dict__ if target_contact else None
            if not target_contact:
                return source_contact.__dict__ if source_contact else None
            
            # Combine contact information, preferring more complete data
            merged_contact = {}
            
            # Email - prefer non-empty
            merged_contact["email"] = (
                getattr(target_contact, 'email', None) or 
                getattr(source_contact, 'email', None)
            )
            
            # Phone - prefer non-empty
            merged_contact["phone"] = (
                getattr(target_contact, 'phone', None) or 
                getattr(source_contact, 'phone', None)
            )
            
            # Address - prefer more complete
            target_address = getattr(target_contact, 'address', None)
            source_address = getattr(source_contact, 'address', None)
            
            if target_address and source_address:
                # Compare completeness (simple length comparison)
                if len(str(target_address)) >= len(str(source_address)):
                    merged_contact["address"] = target_address
                else:
                    merged_contact["address"] = source_address
            else:
                merged_contact["address"] = target_address or source_address
            
            return merged_contact
            
        except Exception as e:
            logger.error(f"Error resolving contact conflicts: {e}")
            return getattr(target_entity, 'contact', None)
    
    def _merge_additional_data(self, source_entity: Entity, target_entity: Entity) -> Dict[str, Any]:
        """Merge additional entity data fields"""
        try:
            additional_data = {}
            
            # Risk level - prefer higher risk
            source_risk = getattr(source_entity, 'risk_level', 'low')
            target_risk = getattr(target_entity, 'risk_level', 'low')
            
            risk_order = {'low': 1, 'medium': 2, 'high': 3, 'critical': 4}
            source_risk_value = risk_order.get(source_risk, 1)
            target_risk_value = risk_order.get(target_risk, 1)
            
            if source_risk_value > target_risk_value:
                additional_data["risk_level"] = source_risk
                additional_data["risk_score"] = getattr(source_entity, 'risk_score', None)
            else:
                additional_data["risk_level"] = target_risk
                additional_data["risk_score"] = getattr(target_entity, 'risk_score', None)
            
            # Entity type - should be consistent
            additional_data["entity_type"] = getattr(target_entity, 'entity_type', 'individual')
            
            # Status - prefer active
            source_status = getattr(source_entity, 'status', 'active')
            target_status = getattr(target_entity, 'status', 'active')
            additional_data["status"] = 'active' if 'active' in [source_status, target_status] else target_status
            
            # Updated timestamp
            additional_data["updated_date"] = datetime.utcnow()
            
            return additional_data
            
        except Exception as e:
            logger.error(f"Error merging additional data: {e}")
            return {}
    
    # ==================== ENTITY UPDATE OPERATIONS ====================
    
    async def _update_target_entity(self, target_entity: Entity, merged_data: Dict[str, Any]) -> Entity:
        """Update target entity with merged data"""
        try:
            # Update entity through repository
            updated_entity = await self.entity_repo.update_entity(
                target_entity.entity_id, merged_data
            )
            
            logger.info(f"Updated target entity {target_entity.entity_id} with merged data")
            return updated_entity
            
        except Exception as e:
            logger.error(f"Error updating target entity: {e}")
            raise
    
    async def _update_source_entity_resolution(self, source_entity: Entity, target_entity: Entity,
                                             merge_decision: Dict[str, Any]) -> Entity:
        """Update source entity with resolution status"""
        try:
            resolution_data = {
                "resolution": {
                    "status": "resolved",
                    "master_entity_id": target_entity.entity_id,
                    "confidence": merge_decision.get("match_confidence", 1.0),
                    "resolved_by": merge_decision.get("resolved_by", "merge_service"),
                    "resolved_at": datetime.utcnow().isoformat(),
                    "linked_entities": [target_entity.entity_id]
                },
                "updated_date": datetime.utcnow()
            }
            
            updated_entity = await self.entity_repo.update_entity(
                source_entity.entity_id, resolution_data
            )
            
            logger.info(f"Updated source entity {source_entity.entity_id} resolution status")
            return updated_entity
            
        except Exception as e:
            logger.error(f"Error updating source entity resolution: {e}")
            raise
    
    async def _handle_linked_entities_transfer(self, source_entity: Entity, target_entity: Entity) -> List[str]:
        """Transfer linked entities from source to target if source was a master"""
        try:
            # Check if source entity had linked entities
            source_resolution = getattr(source_entity, 'resolution', {})
            linked_entities = source_resolution.get('linked_entities', [])
            
            if not linked_entities:
                return []
            
            updated_entities = []
            
            # Update each linked entity to point to new master
            for linked_entity_id in linked_entities:
                try:
                    linked_entity = await self.entity_repo.get_entity_by_id(linked_entity_id)
                    if linked_entity:
                        # Update resolution to point to new master
                        resolution_update = {
                            "resolution.master_entity_id": target_entity.entity_id,
                            "updated_date": datetime.utcnow()
                        }
                        
                        await self.entity_repo.update_entity(linked_entity_id, resolution_update)
                        updated_entities.append(linked_entity_id)
                        
                except Exception as e:
                    logger.error(f"Error updating linked entity {linked_entity_id}: {e}")
                    continue
            
            # Update target entity to include all linked entities
            if updated_entities:
                target_resolution = getattr(target_entity, 'resolution', {})
                existing_linked = target_resolution.get('linked_entities', [])
                all_linked = list(set(existing_linked + updated_entities + [source_entity.entity_id]))
                
                await self.entity_repo.update_entity(target_entity.entity_id, {
                    "resolution.linked_entities": all_linked
                })
            
            logger.info(f"Transferred {len(updated_entities)} linked entities to new master")
            return updated_entities
            
        except Exception as e:
            logger.error(f"Error handling linked entities transfer: {e}")
            return []
    
    # ==================== RELATIONSHIP CREATION ====================
    
    async def _create_merge_relationship(self, source_entity: Entity, target_entity: Entity,
                                       merge_decision: Dict[str, Any], 
                                       conflict_analysis: Dict[str, Any]) -> str:
        """Create relationship record for the merge operation"""
        try:
            # Create relationship evidence
            evidence = RelationshipEvidence(
                matched_attributes=merge_decision.get("matched_attributes", []),
                manual_confidence=merge_decision.get("match_confidence", 1.0),
                additional_data={
                    "merge_timestamp": datetime.utcnow().isoformat(),
                    "conflicts_detected": conflict_analysis.get("resolution_required", False),
                    "merge_notes": merge_decision.get("notes", ""),
                    "conflict_summary": conflict_analysis
                }
            )
            
            # Create relationship
            relationship = Relationship(
                source=EntityReference(
                    entity_id=source_entity.entity_id,
                    entity_type=getattr(source_entity, 'entity_type', 'individual'),
                    entity_name=getattr(source_entity, 'name', '')
                ),
                target=EntityReference(
                    entity_id=target_entity.entity_id,
                    entity_type=getattr(target_entity, 'entity_type', 'individual'),
                    entity_name=getattr(target_entity, 'name', '')
                ),
                type=RelationshipType.CONFIRMED_SAME_ENTITY,
                direction=RelationshipDirection.BIDIRECTIONAL,
                strength=merge_decision.get("match_confidence", 1.0),
                evidence=evidence,
                datasource="merge_service",
                created_by=merge_decision.get("resolved_by", "merge_service"),
                status="active",
                notes=merge_decision.get("notes", "Entity merge operation")
            )
            
            # Create relationship through repository
            relationship_id = await self.relationship_repo.create_relationship(relationship)
            
            logger.info(f"Created merge relationship: {relationship_id}")
            return relationship_id
            
        except Exception as e:
            logger.error(f"Error creating merge relationship: {e}")
            raise