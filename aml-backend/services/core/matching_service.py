"""
Matching Service - Entity matching strategies and algorithms using repository pattern

Focused service for handling entity matching logic, validation, and match attribute analysis.
Uses repository pattern for clean separation of concerns.
"""

import logging
from typing import Dict, Any, Optional, List, Tuple
from datetime import datetime

from repositories.interfaces.entity_repository import EntityRepositoryInterface
from repositories.interfaces.atlas_search_repository import AtlasSearchRepositoryInterface  
from repositories.interfaces.vector_search_repository import VectorSearchRepositoryInterface
from models.api.requests import EntitySearchRequest
from models.api.responses import StandardResponse
from models.core.entity import Entity

logger = logging.getLogger(__name__)


class MatchingService:
    """
    Entity matching service using repository pattern
    
    Handles entity matching strategies, validation, and match attribute analysis
    using clean repository-based data access.
    """
    
    def __init__(self, 
                 entity_repo: EntityRepositoryInterface,
                 atlas_search_repo: AtlasSearchRepositoryInterface,
                 vector_search_repo: VectorSearchRepositoryInterface):
        """
        Initialize Matching service
        
        Args:
            entity_repo: Entity repository for entity operations
            atlas_search_repo: Atlas Search repository for text-based matching
            vector_search_repo: Vector Search repository for semantic matching
        """
        self.entity_repo = entity_repo
        self.atlas_search_repo = atlas_search_repo
        self.vector_search_repo = vector_search_repo
        
        # Matching configuration
        self.fuzzy_threshold = 0.7
        self.semantic_threshold = 0.6
        self.identifier_exact_match = True
        
        logger.info("Matching service initialized with repository pattern")
    
    # ==================== ENTITY VALIDATION AND FETCHING ====================
    
    async def validate_entities(self, source_entity_id: str, target_entity_id: str) -> Tuple[bool, Optional[Entity], Optional[Entity], str]:
        """
        Validate that both entities exist and are suitable for matching
        
        Args:
            source_entity_id: Source entity ID
            target_entity_id: Target entity ID
            
        Returns:
            Tuple of (is_valid, source_entity, target_entity, error_message)
        """
        try:
            logger.info(f"Validating entities: {source_entity_id} and {target_entity_id}")
            
            # Fetch both entities through repository
            source_entity = await self.entity_repo.get_entity_by_id(source_entity_id)
            target_entity = await self.entity_repo.get_entity_by_id(target_entity_id)
            
            # Validation checks
            if not source_entity:
                return False, None, None, f"Source entity {source_entity_id} not found"
                
            if not target_entity:
                return False, None, None, f"Target entity {target_entity_id} not found"
            
            # Additional validation logic
            if source_entity.entity_id == target_entity.entity_id:
                return False, source_entity, target_entity, "Cannot match entity to itself"
            
            # Check if entities are already resolved
            if hasattr(source_entity, 'resolution') and source_entity.resolution:
                if source_entity.resolution.get('status') == 'resolved':
                    return False, source_entity, target_entity, "Source entity is already resolved"
            
            logger.info(f"Entity validation successful: both entities found and suitable for matching")
            return True, source_entity, target_entity, ""
            
        except Exception as e:
            logger.error(f"Error validating entities: {e}")
            return False, None, None, f"Validation error: {str(e)}"
    
    # ==================== MATCHING ATTRIBUTE ANALYSIS ====================
    
    async def analyze_match_attributes(self, source_entity: Entity, target_entity: Entity) -> Dict[str, Any]:
        """
        Analyze which attributes match between two entities
        
        Args:
            source_entity: Source entity for comparison
            target_entity: Target entity for comparison
            
        Returns:
            Dictionary containing match analysis results
        """
        try:
            logger.info(f"Analyzing match attributes between {source_entity.entity_id} and {target_entity.entity_id}")
            
            match_analysis = {
                "matched_attributes": [],
                "partial_matches": [],
                "no_matches": [],
                "similarity_scores": {},
                "overall_match_score": 0.0
            }
            
            # Name matching analysis
            name_match = await self._analyze_name_match(source_entity, target_entity)
            if name_match["is_match"]:
                match_analysis["matched_attributes"].append("name")
                match_analysis["similarity_scores"]["name"] = name_match["score"]
            elif name_match["is_partial"]:
                match_analysis["partial_matches"].append("name")
                match_analysis["similarity_scores"]["name"] = name_match["score"]
            else:
                match_analysis["no_matches"].append("name")
                match_analysis["similarity_scores"]["name"] = name_match["score"]
            
            # Identifier matching analysis
            identifier_match = await self._analyze_identifier_match(source_entity, target_entity)
            if identifier_match["is_match"]:
                match_analysis["matched_attributes"].append("identifiers")
                match_analysis["similarity_scores"]["identifiers"] = identifier_match["score"]
            elif identifier_match["is_partial"]:
                match_analysis["partial_matches"].append("identifiers")
                match_analysis["similarity_scores"]["identifiers"] = identifier_match["score"]
            else:
                match_analysis["no_matches"].append("identifiers")
                match_analysis["similarity_scores"]["identifiers"] = identifier_match["score"]
            
            # Contact information matching
            contact_match = await self._analyze_contact_match(source_entity, target_entity)
            if contact_match["is_match"]:
                match_analysis["matched_attributes"].append("contact")
                match_analysis["similarity_scores"]["contact"] = contact_match["score"]
            elif contact_match["is_partial"]:
                match_analysis["partial_matches"].append("contact")
                match_analysis["similarity_scores"]["contact"] = contact_match["score"]
            else:
                match_analysis["no_matches"].append("contact")
                match_analysis["similarity_scores"]["contact"] = contact_match["score"]
            
            # Calculate overall match score
            scores = list(match_analysis["similarity_scores"].values())
            match_analysis["overall_match_score"] = sum(scores) / len(scores) if scores else 0.0
            
            logger.info(f"Match analysis complete. Overall score: {match_analysis['overall_match_score']:.3f}")
            return match_analysis
            
        except Exception as e:
            logger.error(f"Error analyzing match attributes: {e}")
            return {
                "matched_attributes": [],
                "partial_matches": [],
                "no_matches": [],
                "similarity_scores": {},
                "overall_match_score": 0.0,
                "error": str(e)
            }
    
    async def _analyze_name_match(self, source_entity: Entity, target_entity: Entity) -> Dict[str, Any]:
        """Analyze name matching between entities"""
        try:
            source_name = getattr(source_entity, 'name', '')
            target_name = getattr(target_entity, 'name', '')
            
            if not source_name or not target_name:
                return {"is_match": False, "is_partial": False, "score": 0.0}
            
            # Exact match
            if source_name.lower().strip() == target_name.lower().strip():
                return {"is_match": True, "is_partial": False, "score": 1.0}
            
            # Fuzzy matching using simple similarity
            similarity = self._calculate_string_similarity(source_name, target_name)
            
            if similarity >= self.fuzzy_threshold:
                return {"is_match": True, "is_partial": False, "score": similarity}
            elif similarity >= 0.5:
                return {"is_match": False, "is_partial": True, "score": similarity}
            else:
                return {"is_match": False, "is_partial": False, "score": similarity}
                
        except Exception as e:
            logger.error(f"Error analyzing name match: {e}")
            return {"is_match": False, "is_partial": False, "score": 0.0}
    
    async def _analyze_identifier_match(self, source_entity: Entity, target_entity: Entity) -> Dict[str, Any]:
        """Analyze identifier matching between entities"""
        try:
            source_identifiers = getattr(source_entity, 'identifiers', {})
            target_identifiers = getattr(target_entity, 'identifiers', {})
            
            if not source_identifiers or not target_identifiers:
                return {"is_match": False, "is_partial": False, "score": 0.0}
            
            exact_matches = 0
            total_comparisons = 0
            
            # Compare identifiers by type
            for id_type, source_value in source_identifiers.items():
                if id_type in target_identifiers:
                    total_comparisons += 1
                    target_value = target_identifiers[id_type]
                    
                    if self.identifier_exact_match:
                        if source_value == target_value:
                            exact_matches += 1
                    else:
                        similarity = self._calculate_string_similarity(source_value, target_value)
                        if similarity >= 0.9:  # Very high threshold for identifiers
                            exact_matches += 1
            
            if total_comparisons == 0:
                return {"is_match": False, "is_partial": False, "score": 0.0}
            
            match_ratio = exact_matches / total_comparisons
            
            if match_ratio == 1.0:
                return {"is_match": True, "is_partial": False, "score": 1.0}
            elif match_ratio >= 0.5:
                return {"is_match": False, "is_partial": True, "score": match_ratio}
            else:
                return {"is_match": False, "is_partial": False, "score": match_ratio}
                
        except Exception as e:
            logger.error(f"Error analyzing identifier match: {e}")
            return {"is_match": False, "is_partial": False, "score": 0.0}
    
    async def _analyze_contact_match(self, source_entity: Entity, target_entity: Entity) -> Dict[str, Any]:
        """Analyze contact information matching between entities"""
        try:
            source_contact = getattr(source_entity, 'contact', None)
            target_contact = getattr(target_entity, 'contact', None)
            
            if not source_contact or not target_contact:
                return {"is_match": False, "is_partial": False, "score": 0.0}
            
            matches = 0
            comparisons = 0
            
            # Compare email
            if hasattr(source_contact, 'email') and hasattr(target_contact, 'email'):
                if source_contact.email and target_contact.email:
                    comparisons += 1
                    if source_contact.email.lower() == target_contact.email.lower():
                        matches += 1
            
            # Compare phone
            if hasattr(source_contact, 'phone') and hasattr(target_contact, 'phone'):
                if source_contact.phone and target_contact.phone:
                    comparisons += 1
                    # Normalize phone numbers for comparison
                    source_phone = ''.join(filter(str.isdigit, source_contact.phone))
                    target_phone = ''.join(filter(str.isdigit, target_contact.phone))
                    if source_phone == target_phone:
                        matches += 1
            
            # Compare address
            if hasattr(source_contact, 'address') and hasattr(target_contact, 'address'):
                if source_contact.address and target_contact.address:
                    comparisons += 1
                    address_similarity = self._calculate_string_similarity(
                        str(source_contact.address), 
                        str(target_contact.address)
                    )
                    if address_similarity >= 0.8:
                        matches += 1
            
            if comparisons == 0:
                return {"is_match": False, "is_partial": False, "score": 0.0}
            
            match_ratio = matches / comparisons
            
            if match_ratio >= 0.8:
                return {"is_match": True, "is_partial": False, "score": match_ratio}
            elif match_ratio >= 0.4:
                return {"is_match": False, "is_partial": True, "score": match_ratio}
            else:
                return {"is_match": False, "is_partial": False, "score": match_ratio}
                
        except Exception as e:
            logger.error(f"Error analyzing contact match: {e}")
            return {"is_match": False, "is_partial": False, "score": 0.0}
    
    # ==================== MATCHING STRATEGY METHODS ====================
    
    async def find_potential_matches(self, entity: Entity, limit: int = 10) -> List[Dict[str, Any]]:
        """
        Find potential matches for an entity using multiple matching strategies
        
        Args:
            entity: Entity to find matches for
            limit: Maximum number of matches to return
            
        Returns:
            List of potential matches with scores and methods
        """
        try:
            logger.info(f"Finding potential matches for entity: {entity.entity_id}")
            
            potential_matches = []
            
            # Atlas Search strategy (fuzzy text matching)
            atlas_matches = await self._find_atlas_matches(entity, limit)
            potential_matches.extend(atlas_matches)
            
            # Vector Search strategy (semantic similarity)
            vector_matches = await self._find_vector_matches(entity, limit)
            potential_matches.extend(vector_matches)
            
            # Deduplicate and score
            deduplicated_matches = self._deduplicate_matches(potential_matches)
            
            # Sort by combined score
            sorted_matches = sorted(
                deduplicated_matches, 
                key=lambda x: x.get('combined_score', 0), 
                reverse=True
            )
            
            return sorted_matches[:limit]
            
        except Exception as e:
            logger.error(f"Error finding potential matches: {e}")
            return []
    
    async def _find_atlas_matches(self, entity: Entity, limit: int) -> List[Dict[str, Any]]:
        """Find matches using Atlas Search"""
        try:
            if not hasattr(entity, 'name') or not entity.name:
                return []
            
            # Create search request
            search_request = EntitySearchRequest(
                name_full=entity.name,
                limit=limit,
                fuzzy=True
            )
            
            # Execute search through repository
            search_results = await self.atlas_search_repo.search_entities(search_request)
            
            matches = []
            for result in search_results.get('entities', []):
                if result.get('entity_id') != entity.entity_id:  # Exclude self
                    matches.append({
                        'entity_id': result.get('entity_id'),
                        'entity_data': result,
                        'match_method': 'atlas_search',
                        'atlas_score': result.get('search_score', 0.0),
                        'vector_score': 0.0,
                        'combined_score': result.get('search_score', 0.0)
                    })
            
            return matches
            
        except Exception as e:
            logger.error(f"Error finding Atlas matches: {e}")
            return []
    
    async def _find_vector_matches(self, entity: Entity, limit: int) -> List[Dict[str, Any]]:
        """Find matches using Vector Search"""
        try:
            # Create semantic query from entity data
            query_text = self._create_semantic_query(entity)
            if not query_text:
                return []
            
            # Execute vector search through repository
            vector_results = await self.vector_search_repo.find_similar_by_text(
                query_text=query_text,
                limit=limit,
                similarity_threshold=self.semantic_threshold
            )
            
            matches = []
            for result in vector_results:
                if result.get('entity_id') != entity.entity_id:  # Exclude self
                    matches.append({
                        'entity_id': result.get('entity_id'),
                        'entity_data': result,
                        'match_method': 'vector_search',
                        'atlas_score': 0.0,
                        'vector_score': result.get('similarity_score', 0.0),
                        'combined_score': result.get('similarity_score', 0.0)
                    })
            
            return matches
            
        except Exception as e:
            logger.error(f"Error finding vector matches: {e}")
            return []
    
    def _create_semantic_query(self, entity: Entity) -> str:
        """Create semantic query from entity data"""
        try:
            query_parts = []
            
            if hasattr(entity, 'name') and entity.name:
                query_parts.append(f"person named {entity.name}")
            
            if hasattr(entity, 'identifiers') and entity.identifiers:
                for id_type, id_value in entity.identifiers.items():
                    query_parts.append(f"{id_type}: {id_value}")
            
            if hasattr(entity, 'contact') and entity.contact:
                if hasattr(entity.contact, 'email') and entity.contact.email:
                    query_parts.append(f"email: {entity.contact.email}")
            
            return " ".join(query_parts)
            
        except Exception as e:
            logger.error(f"Error creating semantic query: {e}")
            return ""
    
    def _deduplicate_matches(self, matches: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Deduplicate matches and combine scores"""
        try:
            entity_matches = {}
            
            for match in matches:
                entity_id = match.get('entity_id')
                if not entity_id:
                    continue
                
                if entity_id not in entity_matches:
                    entity_matches[entity_id] = match.copy()
                else:
                    # Combine scores from different methods
                    existing = entity_matches[entity_id]
                    existing['atlas_score'] = max(existing['atlas_score'], match['atlas_score'])
                    existing['vector_score'] = max(existing['vector_score'], match['vector_score'])
                    
                    # Calculate combined score (weighted average)
                    atlas_weight = 0.6
                    vector_weight = 0.4
                    existing['combined_score'] = (
                        existing['atlas_score'] * atlas_weight + 
                        existing['vector_score'] * vector_weight
                    )
                    
                    # Add method information
                    methods = existing.get('match_methods', [existing.get('match_method', '')])
                    if match.get('match_method') not in methods:
                        methods.append(match.get('match_method'))
                    existing['match_methods'] = methods
            
            return list(entity_matches.values())
            
        except Exception as e:
            logger.error(f"Error deduplicating matches: {e}")
            return matches
    
    # ==================== UTILITY METHODS ====================
    
    def _calculate_string_similarity(self, str1: str, str2: str) -> float:
        """Calculate similarity between two strings using simple algorithm"""
        try:
            if not str1 or not str2:
                return 0.0
            
            str1 = str1.lower().strip()
            str2 = str2.lower().strip()
            
            if str1 == str2:
                return 1.0
            
            # Simple Jaccard similarity using character sets
            set1 = set(str1)
            set2 = set(str2)
            
            intersection = len(set1 & set2)
            union = len(set1 | set2)
            
            return intersection / union if union > 0 else 0.0
            
        except Exception as e:
            logger.error(f"Error calculating string similarity: {e}")
            return 0.0