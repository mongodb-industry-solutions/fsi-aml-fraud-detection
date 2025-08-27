"""
Entity Resolution Service - Refactored core resolution workflow orchestration

Clean orchestration service that coordinates MatchingService, ConfidenceService, and MergeService
to handle entity resolution decisions using repository pattern.
"""

import logging
from typing import Dict, Any, Optional
from datetime import datetime

from services.core.matching_service import MatchingService
from services.core.confidence_service import ConfidenceService
from services.core.merge_service import MergeService
from models.entity_resolution import ResolutionDecisionInput, ResolutionResponse, ResolutionDecision

logger = logging.getLogger(__name__)


class EntityResolutionService:
    """
    Entity Resolution service using repository pattern
    
    Clean orchestration service that coordinates specialized services for
    entity resolution workflow without direct data access.
    """
    
    def __init__(self, 
                 matching_service: MatchingService,
                 confidence_service: ConfidenceService,
                 merge_service: MergeService):
        """
        Initialize Entity Resolution service
        
        Args:
            matching_service: Service for entity matching and validation
            confidence_service: Service for confidence scoring and analysis
            merge_service: Service for entity merging operations
        """
        self.matching_service = matching_service
        self.confidence_service = confidence_service
        self.merge_service = merge_service
        
        logger.info("Entity Resolution service initialized with orchestration pattern")
    
    # ==================== RESOLUTION WORKFLOW ORCHESTRATION ====================
    
    async def resolve_entities(self, decision_input: ResolutionDecisionInput) -> ResolutionResponse:
        """
        Process an entity resolution decision using orchestrated services
        
        Args:
            decision_input: Resolution decision data
            
        Returns:
            ResolutionResponse with operation results
        """
        try:
            logger.info(f"Processing entity resolution: {decision_input.decision} between "
                       f"{decision_input.sourceEntityId} and {decision_input.targetMasterEntityId}")
            
            # Validate entities exist and are suitable for resolution
            validation_result = await self._validate_resolution_entities(decision_input)
            if not validation_result["valid"]:
                return self._create_error_response(decision_input, validation_result["error"])
            
            source_entity = validation_result["source_entity"]
            target_entity = validation_result["target_entity"]
            
            # Route to appropriate resolution handler
            if decision_input.decision == ResolutionDecision.CONFIRMED_MATCH:
                return await self._handle_confirmed_match(decision_input, source_entity, target_entity)
                
            elif decision_input.decision == ResolutionDecision.NOT_A_MATCH:
                return await self._handle_not_a_match(decision_input, source_entity, target_entity)
                
            elif decision_input.decision == ResolutionDecision.NEEDS_REVIEW:
                return await self._handle_needs_review(decision_input, source_entity, target_entity)
                
            else:
                return self._create_error_response(
                    decision_input, f"Unknown resolution decision: {decision_input.decision}"
                )
                
        except Exception as e:
            logger.error(f"Error processing entity resolution: {e}")
            return self._create_error_response(decision_input, f"Processing failed: {str(e)}")
    
    async def _validate_resolution_entities(self, decision_input: ResolutionDecisionInput) -> Dict[str, Any]:
        """Validate entities for resolution using MatchingService"""
        try:
            is_valid, source_entity, target_entity, error_msg = await self.matching_service.validate_entities(
                decision_input.sourceEntityId, decision_input.targetMasterEntityId
            )
            
            return {
                "valid": is_valid,
                "source_entity": source_entity,
                "target_entity": target_entity,
                "error": error_msg
            }
            
        except Exception as e:
            logger.error(f"Error validating entities: {e}")
            return {
                "valid": False,
                "source_entity": None,
                "target_entity": None,
                "error": f"Validation error: {str(e)}"
            }
    
    # ==================== RESOLUTION DECISION HANDLERS ====================
    
    async def _handle_confirmed_match(self, decision_input: ResolutionDecisionInput, 
                                    source_entity: Any, target_entity: Any) -> ResolutionResponse:
        """Handle confirmed match resolution using orchestrated services"""
        try:
            logger.info(f"Handling confirmed match: {source_entity.entity_id} -> {target_entity.entity_id}")
            
            # Analyze match attributes using MatchingService
            match_analysis = await self.matching_service.analyze_match_attributes(source_entity, target_entity)
            
            # Calculate confidence using ConfidenceService
            confidence_result = self.confidence_service.calculate_match_confidence(match_analysis)
            
            # Prepare merge decision data
            merge_decision = {
                "match_confidence": decision_input.matchConfidence or confidence_result.get("confidence_score", 0.8),
                "matched_attributes": decision_input.matchedAttributes or match_analysis.get("matched_attributes", []),
                "resolved_by": decision_input.resolvedBy,
                "notes": decision_input.notes,
                "confidence_analysis": confidence_result
            }
            
            # Execute merge using MergeService
            merge_result = await self.merge_service.merge_entities(
                source_entity, target_entity, merge_decision
            )
            
            if not merge_result.get("success"):
                return self._create_error_response(
                    decision_input, f"Merge failed: {merge_result.get('error', 'Unknown error')}"
                )
            
            # Create successful response
            return ResolutionResponse(
                success=True,
                message="Entities successfully merged",
                sourceEntityId=decision_input.sourceEntityId,
                targetMasterEntityId=decision_input.targetMasterEntityId,
                decision=decision_input.decision,
                relationshipId=merge_result.get("relationship_id"),
                updatedEntities=[
                    merge_result.get("source_entity_id"),
                    merge_result.get("merged_entity_id")
                ],
                mergeResult=merge_result,
                confidenceAnalysis=confidence_result
            )
            
        except Exception as e:
            logger.error(f"Error handling confirmed match: {e}")
            return self._create_error_response(decision_input, f"Confirmed match failed: {str(e)}")
    
    async def _handle_not_a_match(self, decision_input: ResolutionDecisionInput,
                                source_entity: Any, target_entity: Any) -> ResolutionResponse:
        """Handle not-a-match resolution using orchestrated services"""
        try:
            logger.info(f"Handling not-a-match: {source_entity.entity_id} and {target_entity.entity_id}")
            
            # Analyze why this was considered not a match
            match_analysis = await self.matching_service.analyze_match_attributes(source_entity, target_entity)
            confidence_result = self.confidence_service.calculate_match_confidence(match_analysis)
            
            # Create dismissal relationship through MergeService relationship functionality
            dismissal_decision = {
                "match_confidence": 0.0,
                "matched_attributes": [],
                "resolved_by": decision_input.resolvedBy,
                "notes": decision_input.notes or "Marked as not a match",
                "dismissal_reason": decision_input.notes,
                "confidence_analysis": confidence_result
            }
            
            # Note: In a full implementation, MergeService could be extended with dismissal methods
            # For now, we'll create a simple response indicating dismissal
            
            logger.info(f"Marked entities as not matching: {decision_input.sourceEntityId} "
                       f"and {decision_input.targetMasterEntityId}")
            
            return ResolutionResponse(
                success=True,
                message="Entities marked as not matching",
                sourceEntityId=decision_input.sourceEntityId,
                targetMasterEntityId=decision_input.targetMasterEntityId,
                decision=decision_input.decision,
                confidenceAnalysis=confidence_result,
                dismissalReason=dismissal_decision
            )
            
        except Exception as e:
            logger.error(f"Error handling not-a-match: {e}")
            return self._create_error_response(decision_input, f"Not-a-match handling failed: {str(e)}")
    
    async def _handle_needs_review(self, decision_input: ResolutionDecisionInput,
                                 source_entity: Any, target_entity: Any) -> ResolutionResponse:
        """Handle needs review resolution using orchestrated services"""
        try:
            logger.info(f"Handling needs review: {source_entity.entity_id} and {target_entity.entity_id}")
            
            # Analyze match for review insights
            match_analysis = await self.matching_service.analyze_match_attributes(source_entity, target_entity)
            confidence_result = self.confidence_service.calculate_match_confidence(match_analysis)
            
            # Generate review recommendations
            review_data = {
                "match_confidence": decision_input.matchConfidence or confidence_result.get("confidence_score", 0.5),
                "matched_attributes": decision_input.matchedAttributes or match_analysis.get("matched_attributes", []),
                "resolved_by": decision_input.resolvedBy,
                "notes": decision_input.notes or "Marked for manual review",
                "confidence_analysis": confidence_result,
                "review_recommendations": confidence_result.get("recommendation", {}),
                "pending_since": datetime.utcnow().isoformat()
            }
            
            logger.info(f"Marked entities for review: {decision_input.sourceEntityId} "
                       f"and {decision_input.targetMasterEntityId}")
            
            return ResolutionResponse(
                success=True,
                message="Entities marked for review",
                sourceEntityId=decision_input.sourceEntityId,
                targetMasterEntityId=decision_input.targetMasterEntityId,
                decision=decision_input.decision,
                confidenceAnalysis=confidence_result,
                reviewData=review_data
            )
            
        except Exception as e:
            logger.error(f"Error handling needs review: {e}")
            return self._create_error_response(decision_input, f"Needs review handling failed: {str(e)}")
    
    # ==================== ADDITIONAL ORCHESTRATION METHODS ====================
    
    async def find_potential_matches_for_entity(self, entity_id: str, limit: int = 10) -> Dict[str, Any]:
        """
        Find potential matches for an entity using orchestrated services
        
        Args:
            entity_id: Entity ID to find matches for
            limit: Maximum number of matches to return
            
        Returns:
            Dictionary containing potential matches with confidence analysis
        """
        try:
            logger.info(f"Finding potential matches for entity: {entity_id}")
            
            # Validate entity exists
            is_valid, entity, _, error_msg = await self.matching_service.validate_entities(entity_id, entity_id)
            if not is_valid or not entity:
                return {"success": False, "error": error_msg}
            
            # Find potential matches using MatchingService
            potential_matches = await self.matching_service.find_potential_matches(entity, limit)
            
            # Analyze confidence for each match
            matches_with_confidence = []
            for match in potential_matches:
                try:
                    match_entity = match.get("entity_data")
                    if match_entity:
                        # Create a simplified entity object for analysis
                        match_analysis = await self.matching_service.analyze_match_attributes(entity, match_entity)
                        confidence_result = self.confidence_service.calculate_match_confidence(match_analysis)
                        
                        matches_with_confidence.append({
                            "entity_id": match.get("entity_id"),
                            "entity_data": match_entity,
                            "match_methods": match.get("match_methods", [match.get("match_method")]),
                            "search_scores": {
                                "atlas_score": match.get("atlas_score", 0.0),
                                "vector_score": match.get("vector_score", 0.0),
                                "combined_score": match.get("combined_score", 0.0)
                            },
                            "confidence_analysis": confidence_result,
                            "match_analysis": match_analysis
                        })
                        
                except Exception as e:
                    logger.error(f"Error analyzing match confidence for {match.get('entity_id')}: {e}")
                    continue
            
            # Sort by confidence score
            matches_with_confidence.sort(
                key=lambda x: x["confidence_analysis"].get("confidence_score", 0), 
                reverse=True
            )
            
            return {
                "success": True,
                "entity_id": entity_id,
                "potential_matches": matches_with_confidence[:limit],
                "total_found": len(matches_with_confidence),
                "search_timestamp": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error finding potential matches: {e}")
            return {
                "success": False,
                "error": f"Potential match search failed: {str(e)}",
                "entity_id": entity_id
            }
    
    # ==================== UTILITY METHODS ====================
    
    def _create_error_response(self, decision_input: ResolutionDecisionInput, error_message: str) -> ResolutionResponse:
        """Create error response for failed resolution"""
        return ResolutionResponse(
            success=False,
            message=error_message,
            sourceEntityId=decision_input.sourceEntityId,
            targetMasterEntityId=decision_input.targetMasterEntityId,
            decision=decision_input.decision,
            error=error_message
        )