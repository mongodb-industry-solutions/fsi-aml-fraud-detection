"""
Atlas Search Service - Refactored to use repository pattern

Clean service focused on business logic for Atlas Search operations,
using AtlasSearchRepository for all data access operations.
"""

import logging
from typing import List, Dict, Any, Optional
from datetime import datetime

from repositories.impl.atlas_search_repository import AtlasSearchRepository
from models.api.requests import EntitySearchRequest
from models.api.responses import SearchResponse, SearchMatch
from models.core.entity import Entity

logger = logging.getLogger(__name__)


class AtlasSearchService:
    """
    Atlas Search service using repository pattern
    
    Focuses on business logic for entity search operations while delegating
    all data access to AtlasSearchRepository. Provides clean interfaces for
    entity matching, identifier search, and fuzzy text matching.
    """
    
    def __init__(self, atlas_search_repo: AtlasSearchRepository):
        """
        Initialize Atlas Search service
        
        Args:
            atlas_search_repo: AtlasSearchRepository for data access
        """
        self.atlas_search_repo = atlas_search_repo
        
        # Business logic configuration
        self.default_limit = 20
        self.fuzzy_max_edits = 2
        
        logger.info("Atlas Search service initialized with repository pattern")
    
    # ==================== ENTITY MATCHING OPERATIONS ====================
    
    async def find_entity_matches(self, search_request: EntitySearchRequest) -> SearchResponse:
        """
        Find potential entity matches using Atlas Search
        
        Args:
            search_request: Search criteria and parameters
            
        Returns:
            SearchResponse: Search results with matches and metadata
        """
        start_time = datetime.utcnow()
        
        try:
            logger.info(f"Finding entity matches for: {search_request.entity_name}")
            
            # Prepare additional search fields
            additional_fields = {}
            if search_request.address:
                additional_fields["address"] = search_request.address
            if search_request.phone:
                additional_fields["phone"] = search_request.phone
            if search_request.email:
                additional_fields["email"] = search_request.email
            
            # Execute entity matching through repository
            raw_matches = await self.atlas_search_repo.find_entity_matches(
                entity_name=search_request.entity_name,
                entity_type=search_request.entity_type,
                additional_fields=additional_fields if additional_fields else None,
                fuzzy=search_request.fuzzy_matching,
                limit=search_request.limit or self.default_limit
            )
            
            # Process matches
            processed_matches = []
            for match_data in raw_matches:
                match = await self._process_search_match(match_data, search_request)
                if match:
                    processed_matches.append(match)
            
            # Sort by search score (highest first)
            processed_matches.sort(key=lambda x: x.search_score, reverse=True)
            
            # Calculate search metadata
            processing_time = (datetime.utcnow() - start_time).total_seconds() * 1000
            metadata = {
                "search_type": "atlas_entity_search",
                "processing_time_ms": processing_time,
                "total_raw_matches": len(raw_matches),
                "filtered_matches": len(processed_matches),
                "fuzzy_enabled": search_request.fuzzy_matching
            }
            
            logger.info(f"Found {len(processed_matches)} qualifying matches for {search_request.entity_name}")
            
            return SearchResponse(
                success=True,
                data=processed_matches,
                total_matches=len(processed_matches),
                search_metadata=metadata
            )
            
        except Exception as e:
            logger.error(f"Entity matching failed for {search_request.entity_name}: {e}")
            
            processing_time = (datetime.utcnow() - start_time).total_seconds() * 1000
            return SearchResponse(
                success=False,
                data=[],
                total_matches=0,
                error_message=f"Search failed: {str(e)}",
                search_metadata={"processing_time_ms": processing_time}
            )
    
    async def search_by_identifiers(self, identifiers: Dict[str, str], 
                                  limit: Optional[int] = None) -> SearchResponse:
        """
        Search entities by specific identifiers
        
        Args:
            identifiers: Dictionary of identifier types and values
            limit: Maximum number of results
            
        Returns:
            SearchResponse: Search results for identifier matches
        """
        start_time = datetime.utcnow()
        
        try:
            logger.info(f"Searching by identifiers: {list(identifiers.keys())}")
            
            # Use repository for identifier search
            raw_matches = await self.atlas_search_repo.search_by_identifiers(
                identifiers=identifiers,
                boost_exact_matches=True,
                limit=limit or self.default_limit
            )
            
            # Process identifier matches (these should have high confidence)
            processed_matches = []
            for match_data in raw_matches:
                match = await self._process_identifier_match(match_data, identifiers)
                if match:
                    processed_matches.append(match)
            
            # Sort by search score
            processed_matches.sort(key=lambda x: x.search_score, reverse=True)
            
            processing_time = (datetime.utcnow() - start_time).total_seconds() * 1000
            metadata = {
                "search_type": "identifier_search",
                "processing_time_ms": processing_time,
                "identifier_types": list(identifiers.keys()),
                "exact_match_boost": True
            }
            
            logger.info(f"Found {len(processed_matches)} identifier matches")
            
            return SearchResponse(
                success=True,
                data=processed_matches,
                total_matches=len(processed_matches),
                search_metadata=metadata
            )
            
        except Exception as e:
            logger.error(f"Identifier search failed: {e}")
            
            processing_time = (datetime.utcnow() - start_time).total_seconds() * 1000
            return SearchResponse(
                success=False,
                data=[],
                total_matches=0,
                error_message=f"Identifier search failed: {str(e)}",
                search_metadata={"processing_time_ms": processing_time}
            )
    
    # ==================== FUZZY MATCHING OPERATIONS ====================
    
    async def fuzzy_name_search(self, name: str, max_edits: Optional[int] = None,
                               limit: Optional[int] = None) -> SearchResponse:
        """
        Perform fuzzy name matching
        
        Args:
            name: Name to search for
            max_edits: Maximum edit distance for fuzzy matching
            limit: Maximum number of results
            
        Returns:
            SearchResponse: Fuzzy matching results
        """
        start_time = datetime.utcnow()
        
        try:
            logger.info(f"Performing fuzzy name search for: {name}")
            
            # Use repository for fuzzy matching
            raw_matches = await self.atlas_search_repo.fuzzy_match(
                query=name,
                field="name",  # Assuming name field
                max_edits=max_edits or self.fuzzy_max_edits,
                limit=limit or self.default_limit
            )
            
            # Process fuzzy matches
            processed_matches = []
            for match_data in raw_matches:
                match = await self._process_fuzzy_match(match_data, name)
                if match:
                    processed_matches.append(match)
            
            # Sort by search score
            processed_matches.sort(key=lambda x: x.search_score, reverse=True)
            
            processing_time = (datetime.utcnow() - start_time).total_seconds() * 1000
            metadata = {
                "search_type": "fuzzy_name_search",
                "processing_time_ms": processing_time,
                "max_edits": max_edits or self.fuzzy_max_edits,
                "search_query": name
            }
            
            logger.info(f"Found {len(processed_matches)} fuzzy matches for: {name}")
            
            return SearchResponse(
                success=True,
                data=processed_matches,
                total_matches=len(processed_matches),
                search_metadata=metadata
            )
            
        except Exception as e:
            logger.error(f"Fuzzy search failed for {name}: {e}")
            
            processing_time = (datetime.utcnow() - start_time).total_seconds() * 1000
            return SearchResponse(
                success=False,
                data=[],
                total_matches=0,
                error_message=f"Fuzzy search failed: {str(e)}",
                search_metadata={"processing_time_ms": processing_time}
            )
    
    # ==================== AUTOCOMPLETE OPERATIONS ====================
    
    async def autocomplete_entity_names(self, partial_name: str, 
                                       limit: Optional[int] = None) -> List[str]:
        """
        Get autocomplete suggestions for entity names
        
        Args:
            partial_name: Partial name for autocomplete
            limit: Maximum suggestions
            
        Returns:
            List[str]: Autocomplete suggestions
        """
        try:
            from repositories.impl.atlas_search_repository import AutocompleteParams
            
            params = AutocompleteParams(
                query=partial_name,
                field="name",  # Assuming name field for autocomplete
                fuzzy=True,
                limit=limit or 10
            )
            
            suggestions = await self.atlas_search_repo.autocomplete_search(params)
            
            logger.debug(f"Generated {len(suggestions)} autocomplete suggestions for: {partial_name}")
            return suggestions
            
        except Exception as e:
            logger.error(f"Autocomplete failed for {partial_name}: {e}")
            return []
    
    # ==================== HELPER METHODS ====================
    
    async def _process_search_match(self, match_data: Dict[str, Any], 
                                  search_request: EntitySearchRequest) -> Optional[SearchMatch]:
        """
        Process raw search match data into SearchMatch model
        
        Args:
            match_data: Raw match data from repository
            search_request: Original search request
            
        Returns:
            SearchMatch: Processed match or None if invalid
        """
        try:
            # Extract entity information
            entity_id = match_data.get("_id") or match_data.get("entityId")
            if not entity_id:
                return None
            
            # Debug logging to see what's in match_data
            logger.debug(f"Processing match_data keys: {list(match_data.keys())}")
            logger.debug(f"search_score value: {match_data.get('search_score')}, score value: {match_data.get('score')}")
            
            # Extract relevance score from Atlas Search (MongoDB adds it as search_score)
            relevance_score = match_data.get("search_score", 0.0) or match_data.get("score", 0.0)
            
            logger.debug(f"Final relevance_score: {relevance_score}")
            
            # Create SearchMatch model (using correct field names)
            return SearchMatch(
                entity_id=str(entity_id),
                search_score=relevance_score,
                match_reasons=self._identify_match_reasons(match_data, search_request),
                entity_data=match_data
            )
            
        except Exception as e:
            logger.warning(f"Failed to process search match: {e}")
            return None
    
    async def _process_identifier_match(self, match_data: Dict[str, Any], 
                                      identifiers: Dict[str, str]) -> Optional[SearchMatch]:
        """
        Process identifier match with high confidence
        
        Args:
            match_data: Raw match data
            identifiers: Search identifiers
            
        Returns:
            SearchMatch: Processed identifier match
        """
        try:
            entity_id = match_data.get("_id") or match_data.get("entityId")
            if not entity_id:
                return None
            
            relevance_score = match_data.get("search_score", 0.0) or match_data.get("score", 1.0)
            
            # Identify which identifiers matched
            matched_identifiers = []
            entity_identifiers = match_data.get("identifiers", {})
            for id_type, id_value in identifiers.items():
                if entity_identifiers.get(id_type) == id_value:
                    matched_identifiers.append(id_type)
            
            return SearchMatch(
                entity_id=str(entity_id),
                search_score=relevance_score,
                match_reasons=[f"Exact {id_type} match" for id_type in matched_identifiers],
                entity_data=match_data
            )
            
        except Exception as e:
            logger.warning(f"Failed to process identifier match: {e}")
            return None
    
    async def _process_fuzzy_match(self, match_data: Dict[str, Any], 
                                 search_name: str) -> Optional[SearchMatch]:
        """
        Process fuzzy match data
        
        Args:
            match_data: Raw fuzzy match data
            search_name: Original search name
            
        Returns:
            SearchMatch: Processed fuzzy match
        """
        try:
            entity_id = match_data.get("_id") or match_data.get("entityId")
            if not entity_id:
                return None
            
            relevance_score = match_data.get("search_score", 0.0) or match_data.get("score", 0.0)
            
            return SearchMatch(
                entity_id=str(entity_id),
                search_score=relevance_score,
                match_reasons=["Fuzzy name match"],
                entity_data=match_data
            )
            
        except Exception as e:
            logger.warning(f"Failed to process fuzzy match: {e}")
            return None
    
    def _calculate_confidence_score(self, match_data: Dict[str, Any], 
                                  search_request: Any) -> float:
        """
        Calculate confidence score for a match
        
        Args:
            match_data: Match data
            search_request: Search request
            
        Returns:
            float: Confidence score between 0 and 1
        """
        try:
            # Atlas Search score is in search_score field (from $meta: searchScore)
            search_score = match_data.get("search_score", 0.0)
            base_score = match_data.get("score", 0.0)
            
            # Use search_score if available, fallback to score
            actual_score = search_score if search_score > 0 else base_score
            
            # Use raw confidence score without normalization
            confidence = actual_score
            
            # Debug logging
            logger.debug(f"Confidence calculation: base_score={base_score}, search_score={search_score}, actual_score={actual_score}, initial_confidence={confidence}")
            
            # Boost for exact name matches
            entity_name = match_data.get("name", {})
            if isinstance(entity_name, dict):
                entity_name_str = entity_name.get("full", "").lower()
            else:
                entity_name_str = str(entity_name).lower()
            
            search_name = getattr(search_request, 'entity_name', '').lower()
            
            logger.debug(f"Name comparison: entity_name={entity_name_str}, search_name={search_name}")
            
            if entity_name_str and search_name and entity_name_str == search_name:
                confidence = min(confidence + 0.2, 1.0)
                logger.debug(f"Exact name match boost applied, confidence now: {confidence}")
            
            # Boost for entity type match
            entity_type = match_data.get("entityType", match_data.get("entity_type", ""))
            search_entity_type = getattr(search_request, 'entity_type', None)
            
            if search_entity_type and entity_type == search_entity_type:
                confidence = min(confidence + 0.1, 1.0)
                logger.debug(f"Entity type match boost applied, confidence now: {confidence}")
            
            final_confidence = round(confidence, 3)
            logger.debug(f"Final confidence score: {final_confidence}")
            
            return final_confidence
            
        except Exception:
            return 0.0
    
    def _calculate_fuzzy_confidence(self, search_name: str, entity_name: str) -> float:
        """
        Calculate confidence for fuzzy matches based on string similarity
        
        Args:
            search_name: Original search name
            entity_name: Entity name from results
            
        Returns:
            float: Confidence score
        """
        try:
            # Simple similarity calculation (can be enhanced)
            search_lower = search_name.lower().strip()
            entity_lower = entity_name.lower().strip()
            
            # Exact match
            if search_lower == entity_lower:
                return 1.0
            
            # Calculate basic similarity (placeholder for more sophisticated algorithm)
            longer = max(len(search_lower), len(entity_lower))
            if longer == 0:
                return 0.0
            
            # Calculate edit distance (simplified)
            shorter = min(len(search_lower), len(entity_lower))
            similarity = shorter / longer
            
            # Additional bonus for common prefixes
            common_prefix = 0
            for i in range(min(len(search_lower), len(entity_lower))):
                if search_lower[i] == entity_lower[i]:
                    common_prefix += 1
                else:
                    break
            
            prefix_bonus = (common_prefix / longer) * 0.2
            return min(similarity + prefix_bonus, 1.0)
            
        except Exception:
            return 0.0
    
    def _identify_match_reasons(self, match_data: Dict[str, Any], 
                              search_request: EntitySearchRequest) -> List[str]:
        """
        Identify reasons why this entity matched
        
        Args:
            match_data: Match data
            search_request: Search request
            
        Returns:
            List[str]: List of match reasons
        """
        reasons = []
        
        try:
            # Name match
            entity_name = match_data.get("name", "").lower()
            search_name = search_request.entity_name.lower()
            if entity_name == search_name:
                reasons.append("Exact name match")
            elif search_name in entity_name or entity_name in search_name:
                reasons.append("Partial name match")
            else:
                reasons.append("Fuzzy name match")
            
            # Entity type match
            if (search_request.entity_type and 
                match_data.get("entity_type") == search_request.entity_type):
                reasons.append("Entity type match")
            
            # Additional field matches
            if search_request.address and match_data.get("address"):
                reasons.append("Address information available")
            
            # Identifier matches
            entity_identifiers = match_data.get("identifiers", {})
            if entity_identifiers:
                reasons.append("Has identifier information")
            
            return reasons
            
        except Exception:
            return ["Atlas Search match"]