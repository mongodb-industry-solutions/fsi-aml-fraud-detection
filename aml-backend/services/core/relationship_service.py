"""
Relationship Service - Refactored to use repository pattern

Clean service focused on business logic for relationship management operations,
using RelationshipRepository for all data access operations.
"""

import logging
from typing import List, Dict, Any, Optional
from datetime import datetime

from repositories.interfaces.relationship_repository import RelationshipRepositoryInterface
from repositories.interfaces.entity_repository import EntityRepositoryInterface
from models.api.requests import RelationshipCreateRequest, RelationshipUpdateRequest, RelationshipQueryRequest
from models.api.responses import StandardResponse, RelationshipResponse, RelationshipListResponse
from models.core.network import Relationship, RelationshipType, RelationshipStrength

logger = logging.getLogger(__name__)


class RelationshipService:
    """
    Relationship service using repository pattern
    
    Focuses on business logic for relationship management while delegating
    all data access to RelationshipRepository and EntityRepository.
    """
    
    def __init__(self, 
                 relationship_repo: RelationshipRepositoryInterface,
                 entity_repo: EntityRepositoryInterface):
        """
        Initialize Relationship service
        
        Args:
            relationship_repo: RelationshipRepository for relationship data access
            entity_repo: EntityRepository for entity validation
        """
        self.relationship_repo = relationship_repo
        self.entity_repo = entity_repo
        
        # Business logic configuration
        self.max_relationships_per_entity = 1000
        self.default_confidence_threshold = 0.5
        self.auto_verify_threshold = 0.9
        
        logger.info("Relationship service initialized with repository pattern")
    
    # ==================== RELATIONSHIP CRUD OPERATIONS ====================
    
    async def create_relationship(self, request: RelationshipCreateRequest) -> RelationshipResponse:
        """
        Create a new relationship between entities
        
        Args:
            request: Relationship creation request
            
        Returns:
            RelationshipResponse: Creation results
        """
        start_time = datetime.utcnow()
        
        try:
            logger.info(f"Creating relationship between {request.source_entity_id} and {request.target_entity_id}")
            
            # Validate entities exist
            validation_result = await self._validate_entities_exist(
                request.source_entity_id, 
                request.target_entity_id
            )
            
            if not validation_result["valid"]:
                return RelationshipResponse(
                    success=False,
                    error_message=validation_result["error"],
                    relationship=None
                )
            
            # Check for existing relationship
            existing_check = await self._check_existing_relationship(
                request.source_entity_id,
                request.target_entity_id,
                request.relationship_type
            )
            
            if existing_check["exists"]:
                return RelationshipResponse(
                    success=False,
                    error_message=f"Relationship already exists: {existing_check['relationship_id']}",
                    relationship=None
                )
            
            # Validate relationship limits
            limit_check = await self._check_relationship_limits(request.source_entity_id)
            if not limit_check["allowed"]:
                return RelationshipResponse(
                    success=False,
                    error_message=f"Entity exceeds maximum relationships limit ({self.max_relationships_per_entity})",
                    relationship=None
                )
            
            # Prepare relationship data
            relationship_data = await self._prepare_relationship_data(request, validation_result)
            
            # Create relationship through repository
            relationship_id = await self.relationship_repo.create(relationship_data)
            
            # Get created relationship for response
            created_relationship = await self.relationship_repo.find_by_id(relationship_id)
            
            processing_time = (datetime.utcnow() - start_time).total_seconds() * 1000
            
            logger.info(f"Successfully created relationship {relationship_id} in {processing_time:.2f}ms")
            
            return RelationshipResponse(
                success=True,
                relationship=created_relationship,
                metadata={
                    "processing_time_ms": processing_time,
                    "auto_verified": relationship_data.get("verified", False),
                    "confidence_score": relationship_data.get("confidence_score", 0.0)
                }
            )
            
        except Exception as e:
            logger.error(f"Relationship creation failed: {e}")
            
            processing_time = (datetime.utcnow() - start_time).total_seconds() * 1000
            return RelationshipResponse(
                success=False,
                error_message=f"Failed to create relationship: {str(e)}",
                relationship=None,
                metadata={"processing_time_ms": processing_time}
            )
    
    async def update_relationship(self, relationship_id: str, 
                                request: RelationshipUpdateRequest) -> RelationshipResponse:
        """
        Update an existing relationship
        
        Args:
            relationship_id: ID of relationship to update
            request: Update request data
            
        Returns:
            RelationshipResponse: Update results
        """
        start_time = datetime.utcnow()
        
        try:
            logger.info(f"Updating relationship {relationship_id}")
            
            # Validate relationship exists
            existing_relationship = await self.relationship_repo.find_by_id(relationship_id)
            if not existing_relationship:
                return RelationshipResponse(
                    success=False,
                    error_message=f"Relationship {relationship_id} not found",
                    relationship=None
                )
            
            # Prepare update data
            update_data = await self._prepare_update_data(request, existing_relationship)
            
            # Update relationship through repository
            success = await self.relationship_repo.update(relationship_id, update_data)
            
            if not success:
                return RelationshipResponse(
                    success=False,
                    error_message="Failed to update relationship",
                    relationship=None
                )
            
            # Get updated relationship for response
            updated_relationship = await self.relationship_repo.find_by_id(relationship_id)
            
            processing_time = (datetime.utcnow() - start_time).total_seconds() * 1000
            
            logger.info(f"Successfully updated relationship {relationship_id}")
            
            return RelationshipResponse(
                success=True,
                relationship=updated_relationship,
                metadata={
                    "processing_time_ms": processing_time,
                    "updated_fields": list(update_data.keys())
                }
            )
            
        except Exception as e:
            logger.error(f"Relationship update failed for {relationship_id}: {e}")
            
            processing_time = (datetime.utcnow() - start_time).total_seconds() * 1000
            return RelationshipResponse(
                success=False,
                error_message=f"Failed to update relationship: {str(e)}",
                relationship=None,
                metadata={"processing_time_ms": processing_time}
            )
    
    async def delete_relationship(self, relationship_id: str) -> StandardResponse:
        """
        Delete a relationship
        
        Args:
            relationship_id: ID of relationship to delete
            
        Returns:
            StandardResponse: Deletion results
        """
        start_time = datetime.utcnow()
        
        try:
            logger.info(f"Deleting relationship {relationship_id}")
            
            # Validate relationship exists and get affected entities
            existing_relationship = await self.relationship_repo.find_by_id(relationship_id)
            if not existing_relationship:
                return StandardResponse(
                    success=False,
                    error=f"Relationship {relationship_id} not found"
                )
            
            # Extract affected entity IDs before deletion
            affected_entities = [
                existing_relationship.get("source_entity_id"),
                existing_relationship.get("target_entity_id")
            ]
            
            # Delete relationship through repository
            success = await self.relationship_repo.delete(relationship_id)
            
            if not success:
                return StandardResponse(
                    success=False,
                    error="Failed to delete relationship"
                )
            
            processing_time = (datetime.utcnow() - start_time).total_seconds() * 1000
            
            logger.info(f"Successfully deleted relationship {relationship_id}")
            
            return StandardResponse(
                success=True,
                data={
                    "relationship_id": relationship_id,
                    "affected_entities": affected_entities
                },
                metadata={
                    "processing_time_ms": processing_time,
                    "operation": "delete"
                }
            )
            
        except Exception as e:
            logger.error(f"Relationship deletion failed for {relationship_id}: {e}")
            
            processing_time = (datetime.utcnow() - start_time).total_seconds() * 1000
            return StandardResponse(
                success=False,
                error=f"Failed to delete relationship: {str(e)}",
                metadata={"processing_time_ms": processing_time}
            )
    
    # ==================== RELATIONSHIP QUERY OPERATIONS ====================
    
    async def get_relationship(self, relationship_id: str) -> RelationshipResponse:
        """
        Get a single relationship by ID
        
        Args:
            relationship_id: Relationship ID
            
        Returns:
            RelationshipResponse: Relationship data
        """
        try:
            logger.info(f"Getting relationship {relationship_id}")
            
            relationship = await self.relationship_repo.find_by_id(relationship_id)
            
            if not relationship:
                return RelationshipResponse(
                    success=False,
                    error_message=f"Relationship {relationship_id} not found",
                    relationship=None
                )
            
            return RelationshipResponse(
                success=True,
                relationship=relationship
            )
            
        except Exception as e:
            logger.error(f"Failed to get relationship {relationship_id}: {e}")
            return RelationshipResponse(
                success=False,
                error_message=f"Failed to retrieve relationship: {str(e)}",
                relationship=None
            )
    
    async def find_relationships(self, query: RelationshipQueryRequest) -> RelationshipListResponse:
        """
        Find relationships based on query parameters
        
        Args:
            query: Relationship query parameters
            
        Returns:
            RelationshipListResponse: List of matching relationships
        """
        start_time = datetime.utcnow()
        
        try:
            logger.info(f"Finding relationships with query: {query.entity_id or 'all entities'}")
            
            # Build search criteria from query
            criteria = await self._build_search_criteria(query)
            
            # Find relationships through repository
            relationships = await self.relationship_repo.find_by_criteria(
                criteria=criteria,
                limit=query.limit,
                offset=query.offset
            )
            
            # Get total count for pagination
            total_count = await self.relationship_repo.count_by_criteria(criteria)
            
            # Calculate pagination metadata
            page = (query.offset // query.limit) + 1 if query.limit > 0 else 1
            has_more = (query.offset + len(relationships)) < total_count
            
            processing_time = (datetime.utcnow() - start_time).total_seconds() * 1000
            
            logger.info(f"Found {len(relationships)} relationships in {processing_time:.2f}ms")
            
            return RelationshipListResponse(
                success=True,
                relationships=relationships,
                total_count=total_count,
                page=page,
                page_size=len(relationships),
                has_more=has_more,
                metadata={
                    "processing_time_ms": processing_time,
                    "search_criteria": criteria
                }
            )
            
        except Exception as e:
            logger.error(f"Relationship search failed: {e}")
            
            processing_time = (datetime.utcnow() - start_time).total_seconds() * 1000
            return RelationshipListResponse(
                success=False,
                relationships=[],
                total_count=0,
                page=1,
                page_size=0,
                has_more=False,
                error_message=f"Search failed: {str(e)}",
                metadata={"processing_time_ms": processing_time}
            )
    
    async def get_entity_relationships(self, entity_id: str, 
                                     relationship_types: Optional[List[RelationshipType]] = None,
                                     include_details: bool = True) -> Dict[str, Any]:
        """
        Get all relationships for a specific entity
        
        Args:
            entity_id: Entity ID to get relationships for
            relationship_types: Filter by relationship types
            include_details: Include detailed relationship information
            
        Returns:
            Dict: Entity relationships data
        """
        try:
            logger.info(f"Getting relationships for entity {entity_id}")
            
            # Get relationships through repository
            relationships = await self.relationship_repo.find_entity_relationships(
                entity_id=entity_id,
                relationship_types=relationship_types,
                include_bidirectional=True
            )
            
            # Process relationship data
            relationship_summary = await self._process_entity_relationships(
                relationships, entity_id, include_details
            )
            
            return {
                "success": True,
                "entity_id": entity_id,
                "total_relationships": len(relationships),
                "relationship_summary": relationship_summary,
                "relationships": relationships if include_details else None
            }
            
        except Exception as e:
            logger.error(f"Failed to get entity relationships for {entity_id}: {e}")
            return {
                "success": False,
                "entity_id": entity_id,
                "error": str(e)
            }
    
    # ==================== RELATIONSHIP VERIFICATION ====================
    
    async def verify_relationship(self, relationship_id: str, 
                                evidence: Optional[Dict[str, Any]] = None) -> RelationshipResponse:
        """
        Verify a relationship with optional evidence
        
        Args:
            relationship_id: Relationship ID to verify
            evidence: Optional verification evidence
            
        Returns:
            RelationshipResponse: Verification results
        """
        try:
            logger.info(f"Verifying relationship {relationship_id}")
            
            # Get current relationship
            relationship = await self.relationship_repo.find_by_id(relationship_id)
            if not relationship:
                return RelationshipResponse(
                    success=False,
                    error_message=f"Relationship {relationship_id} not found",
                    relationship=None
                )
            
            # Verify relationship through repository
            verification_result = await self.relationship_repo.verify_relationship(
                relationship_id=relationship_id,
                evidence=evidence or {}
            )
            
            if not verification_result:
                return RelationshipResponse(
                    success=False,
                    error_message="Failed to verify relationship",
                    relationship=None
                )
            
            # Get updated relationship
            verified_relationship = await self.relationship_repo.find_by_id(relationship_id)
            
            logger.info(f"Successfully verified relationship {relationship_id}")
            
            return RelationshipResponse(
                success=True,
                relationship=verified_relationship,
                metadata={
                    "verification_timestamp": datetime.utcnow().isoformat(),
                    "evidence_provided": evidence is not None
                }
            )
            
        except Exception as e:
            logger.error(f"Relationship verification failed for {relationship_id}: {e}")
            return RelationshipResponse(
                success=False,
                error_message=f"Verification failed: {str(e)}",
                relationship=None
            )
    
    # ==================== RELATIONSHIP ANALYTICS ====================
    
    async def get_relationship_statistics(self, entity_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Get relationship statistics
        
        Args:
            entity_id: Optional entity ID to filter statistics
            
        Returns:
            Dict: Relationship statistics
        """
        try:
            logger.info(f"Getting relationship statistics for {entity_id or 'all entities'}")
            
            # Get statistics through repository
            stats = await self.relationship_repo.get_relationship_statistics(entity_id)
            
            # Add business logic analysis
            analysis = await self._analyze_relationship_patterns(stats, entity_id)
            
            return {
                "success": True,
                "statistics": stats,
                "analysis": analysis,
                "generated_at": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Failed to get relationship statistics: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    # ==================== HELPER METHODS ====================
    
    async def _validate_entities_exist(self, source_id: str, target_id: str) -> Dict[str, Any]:
        """
        Validate that both entities exist
        
        Args:
            source_id: Source entity ID
            target_id: Target entity ID
            
        Returns:
            Dict: Validation results
        """
        try:
            # Check both entities exist
            source_entity = await self.entity_repo.find_by_id(source_id)
            target_entity = await self.entity_repo.find_by_id(target_id)
            
            if not source_entity:
                return {
                    "valid": False,
                    "error": f"Source entity {source_id} not found"
                }
            
            if not target_entity:
                return {
                    "valid": False,
                    "error": f"Target entity {target_id} not found"
                }
            
            return {
                "valid": True,
                "source_entity": source_entity,
                "target_entity": target_entity
            }
            
        except Exception as e:
            return {
                "valid": False,
                "error": f"Entity validation failed: {str(e)}"
            }
    
    async def _check_existing_relationship(self, source_id: str, target_id: str, 
                                         relationship_type: RelationshipType) -> Dict[str, Any]:
        """
        Check if relationship already exists
        
        Args:
            source_id: Source entity ID
            target_id: Target entity ID
            relationship_type: Type of relationship
            
        Returns:
            Dict: Existence check results
        """
        try:
            # Check for existing relationship
            existing = await self.relationship_repo.find_by_entities_and_type(
                source_entity_id=source_id,
                target_entity_id=target_id,
                relationship_type=relationship_type
            )
            
            if existing:
                return {
                    "exists": True,
                    "relationship_id": existing.get("_id") or existing.get("id")
                }
            
            return {"exists": False}
            
        except Exception as e:
            logger.warning(f"Error checking existing relationship: {e}")
            return {"exists": False}
    
    async def _check_relationship_limits(self, entity_id: str) -> Dict[str, Any]:
        """
        Check if entity is within relationship limits
        
        Args:
            entity_id: Entity ID to check
            
        Returns:
            Dict: Limit check results
        """
        try:
            # Count existing relationships for entity
            relationship_count = await self.relationship_repo.count_entity_relationships(entity_id)
            
            return {
                "allowed": relationship_count < self.max_relationships_per_entity,
                "current_count": relationship_count,
                "limit": self.max_relationships_per_entity
            }
            
        except Exception as e:
            logger.warning(f"Error checking relationship limits: {e}")
            return {"allowed": True}  # Allow by default if check fails
    
    async def _prepare_relationship_data(self, request: RelationshipCreateRequest, 
                                       validation_result: Dict[str, Any]) -> Dict[str, Any]:
        """
        Prepare relationship data for creation
        
        Args:
            request: Creation request
            validation_result: Entity validation results
            
        Returns:
            Dict: Prepared relationship data
        """
        # Calculate confidence score
        confidence_score = self._calculate_relationship_confidence(request)
        
        # Auto-verify if confidence is high enough
        auto_verified = confidence_score >= self.auto_verify_threshold
        
        relationship_data = {
            "source_entity_id": request.source_entity_id,
            "target_entity_id": request.target_entity_id,
            "relationship_type": request.relationship_type,
            "strength": request.strength or RelationshipStrength.POSSIBLE,
            "confidence_score": confidence_score,
            "verified": auto_verified,
            "evidence": request.evidence or {},
            "source": request.source or "api",
            "created_by": request.created_by,
            "notes": request.notes
        }
        
        return relationship_data
    
    async def _prepare_update_data(self, request: RelationshipUpdateRequest, 
                                 existing: Dict[str, Any]) -> Dict[str, Any]:
        """
        Prepare update data for relationship
        
        Args:
            request: Update request
            existing: Existing relationship data
            
        Returns:
            Dict: Prepared update data
        """
        update_data = {}
        
        if request.strength is not None:
            update_data["strength"] = request.strength
        
        if request.evidence is not None:
            update_data["evidence"] = request.evidence
        
        if request.notes is not None:
            update_data["notes"] = request.notes
        
        if request.verified is not None:
            update_data["verified"] = request.verified
        
        # Update modified timestamp
        update_data["updated_at"] = datetime.utcnow()
        update_data["updated_by"] = request.updated_by
        
        return update_data
    
    async def _build_search_criteria(self, query: RelationshipQueryRequest) -> Dict[str, Any]:
        """
        Build search criteria from query request
        
        Args:
            query: Query request
            
        Returns:
            Dict: Search criteria
        """
        criteria = {}
        
        if query.entity_id:
            criteria["entity_id"] = query.entity_id
        
        if query.relationship_types:
            criteria["relationship_types"] = query.relationship_types
        
        if query.min_confidence is not None:
            criteria["min_confidence"] = query.min_confidence
        
        if query.verified_only:
            criteria["verified"] = True
        
        if query.created_after:
            criteria["created_after"] = query.created_after
        
        return criteria
    
    async def _process_entity_relationships(self, relationships: List[Dict[str, Any]], 
                                          entity_id: str, include_details: bool) -> Dict[str, Any]:
        """
        Process and summarize entity relationships
        
        Args:
            relationships: List of relationships
            entity_id: Entity ID
            include_details: Whether to include detailed analysis
            
        Returns:
            Dict: Processed relationship summary
        """
        summary = {
            "total_relationships": len(relationships),
            "by_type": {},
            "by_strength": {},
            "verified_count": 0,
            "unverified_count": 0
        }
        
        for rel in relationships:
            # Count by type
            rel_type = rel.get("relationship_type", "unknown")
            summary["by_type"][rel_type] = summary["by_type"].get(rel_type, 0) + 1
            
            # Count by strength
            strength = rel.get("strength", "unknown")
            summary["by_strength"][strength] = summary["by_strength"].get(strength, 0) + 1
            
            # Count verification status
            if rel.get("verified", False):
                summary["verified_count"] += 1
            else:
                summary["unverified_count"] += 1
        
        return summary
    
    def _calculate_relationship_confidence(self, request: RelationshipCreateRequest) -> float:
        """
        Calculate confidence score for relationship
        
        Args:
            request: Relationship creation request
            
        Returns:
            float: Confidence score
        """
        base_confidence = 0.5
        
        # Adjust based on strength
        if request.strength == RelationshipStrength.CONFIRMED:
            base_confidence += 0.3
        elif request.strength == RelationshipStrength.LIKELY:
            base_confidence += 0.2
        elif request.strength == RelationshipStrength.POSSIBLE:
            base_confidence += 0.1
        
        # Adjust based on evidence
        if request.evidence:
            base_confidence += 0.2
        
        # Adjust based on source reliability
        if request.source in ["manual_verification", "government_record"]:
            base_confidence += 0.2
        elif request.source in ["public_record", "official_document"]:
            base_confidence += 0.1
        
        return min(base_confidence, 1.0)
    
    async def _analyze_relationship_patterns(self, stats: Dict[str, Any], 
                                           entity_id: Optional[str]) -> Dict[str, Any]:
        """
        Analyze relationship patterns for insights
        
        Args:
            stats: Relationship statistics
            entity_id: Optional entity ID
            
        Returns:
            Dict: Pattern analysis
        """
        analysis = {
            "patterns_detected": [],
            "recommendations": [],
            "risk_indicators": []
        }
        
        # Analyze for common patterns
        total_relationships = stats.get("total_relationships", 0)
        
        if total_relationships > 100:
            analysis["patterns_detected"].append("High connectivity entity")
        
        verified_ratio = stats.get("verified_ratio", 0.0)
        if verified_ratio < 0.3:
            analysis["risk_indicators"].append("Low verification ratio")
            analysis["recommendations"].append("Review and verify relationships")
        
        return analysis