"""
Enhanced Entity Search Service - Phase 7 Implementation

Comprehensive entity search service leveraging the full Atlas Search index with
advanced faceted filtering, autocomplete, and intelligent search capabilities.

This service provides:
- Unified entity search with comprehensive faceted filtering
- Autocomplete using the dedicated name.full field
- Advanced faceted search with numeric range filtering
- Identifier-specific search functionality
- Search enhancement and suggestion capabilities
"""

import logging
import os
from typing import Dict, List, Optional, Any, Tuple

from repositories.impl.atlas_search_repository import AutocompleteParams
from repositories.interfaces.entity_repository import EntityRepositoryInterface
from repositories.impl.atlas_search_repository import AtlasSearchRepository

logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)


class EntitySearchService:
    """
    Enhanced entity search service implementing Phase 7 requirements
    
    Leverages the comprehensive Atlas Search index with all available facet fields:
    - entityType, nationality, residency, jurisdiction
    - addresses.structured.country/city
    - identifiers.type, customerInfo.businessType
    - riskAssessment.overall.level/score
    - scenarioKey for demo filtering
    """
    
    def __init__(self, 
                 atlas_search_repo: AtlasSearchRepository,
                 entity_repo: EntityRepositoryInterface):
        """
        Initialize EntitySearchService with repository dependencies
        
        Args:
            atlas_search_repo: Atlas Search repository for search operations
            entity_repo: Entity repository for data enhancement
        """
        self.atlas_search = atlas_search_repo
        self.entity_repo = entity_repo
        self.index_name = os.getenv('ATLAS_SEARCH_INDEX', 'entity_search_index_v2')
        
        # Facet configuration matching corrected Atlas Search index (only stringFacet and numberFacet fields)
        self.facet_config = {
            # Top-level stringFacet fields
            "entityType": {"type": "string", "path": "entityType"},
            "nationality": {"type": "string", "path": "nationality"},
            "residency": {"type": "string", "path": "residency"},
            "jurisdiction": {"type": "string", "path": "jurisdictionOfIncorporation"},
            
            # Nested document stringFacet fields (now properly indexed)
            "riskLevel": {"type": "string", "path": "riskAssessment.overall.level"},
            "businessType": {"type": "string", "path": "customerInfo.businessType"},
            
            # Nested document numberFacet field
            "riskScore": {"type": "number", "path": "riskAssessment.overall.score", 
                         "boundaries": [0.0, 15.0, 25.0, 50.0, 100.0]}
            
            # Note: addresses.structured.country/city and identifiers.type are indexed as 'string' 
            # with keyword analyzer, not 'stringFacet', so they can't be used for faceting
            # but can still be used in compound search queries
        }
        
        # Field path mapping for compound queries (includes non-facet fields for search functionality)
        self.facet_path_map = {
            # Facetable fields
            "entityType": "entityType",
            "nationality": "nationality",
            "residency": "residency",
            "jurisdiction": "jurisdictionOfIncorporation",
            "riskLevel": "riskAssessment.overall.level",
            "businessType": "customerInfo.businessType",
            
            
            # Non-facetable but searchable fields (string with keyword analyzer)
            "country": "addresses.structured.country",
            "city": "addresses.structured.city",
            "identifierType": "identifiers.type",
            "scenarioKey": "scenarioKey"
        }
        
        logger.info(f"EntitySearchService initialized with index: {self.index_name}")
    
    async def unified_entity_search(self, 
                                  query: str = "",
                                  filters: Dict[str, Any] = None,
                                  facets: bool = True,
                                  autocomplete: bool = False,
                                  limit: int = 20) -> Dict[str, Any]:
        """
        Unified entity search using repository abstractions - delegates complex logic to repositories
        
        Args:
            query: Search query string
            filters: Dictionary of filter criteria
            facets: Whether to include facet counts
            autocomplete: Whether this is an autocomplete request
            limit: Maximum number of results
            
        Returns:
            Dictionary containing results, facets, and metadata
        """
        try:
            logger.info(f"Unified entity search: query='{query}', filters={filters}, facets={facets}")
            
            # Handle autocomplete requests - simple delegation
            if autocomplete and len(query) >= 2:
                suggestions = await self.autocomplete_entity_names(query, limit)
                return {
                    "results": [],
                    "facets": {},
                    "total_count": 0,
                    "query": query,
                    "filters": filters or {},
                    "suggestions": suggestions,
                    "autocomplete": True
                }
            
            # Use simple faceted search (now properly delegates to repository)
            search_results = await self.simple_faceted_search(
                search_query=query,
                selected_facets=filters,
                limit=limit
            )
            
            # Add facets if requested (delegate to repository)
            result_facets = {}
            if facets:
                result_facets = await self.get_available_facets()
            
            # Clean, simplified response
            result = {
                "results": search_results.get("results", []),
                "facets": result_facets,
                "total_count": search_results.get("total_results", 0),
                "query": query,
                "filters": filters or {},
                "suggestions": []  # Could be enhanced later
            }
            
            logger.info(f"Unified search completed: {result['total_count']} results")
            return result
            
        except Exception as e:
            logger.error(f"Unified entity search failed: {e}")
            return {
                "results": [],
                "facets": {},
                "total_count": 0,
                "query": query,
                "filters": filters or {},
                "suggestions": [],
                "error": str(e)
            }
    
    async def autocomplete_entity_names(self, 
                                      partial_name: str, 
                                      limit: int = 10) -> List[Dict[str, Any]]:
        """
        Get autocomplete suggestions with entity IDs using the configured name.full field
        
        Args:
            partial_name: Partial entity name to complete
            limit: Maximum number of suggestions
            
        Returns:
            List of dictionaries with entityId and name keys for direct navigation
        """
        try:
            logger.info(f"Autocomplete search for: '{partial_name}'")
            
            if len(partial_name) < 2:
                return []
            
            params = AutocompleteParams(
                query=partial_name,
                field="name.full",  # Use the dedicated autocomplete field
                limit=limit,
                fuzzy=True,
                max_edits=1
            )
            
            suggestions = await self.atlas_search.autocomplete_search(params)
            logger.info(f"Autocomplete completed: {len(suggestions)} suggestions")
            return suggestions
            
        except Exception as e:
            logger.error(f"Autocomplete search failed for '{partial_name}': {e}")
            return []
    
    async def simple_faceted_search(self, 
                                   search_query: str = "",
                                   selected_facets: Dict[str, str] = None,
                                   limit: int = 50) -> Dict[str, Any]:
        """
        Simplified faceted search using repository abstractions only - 90+ lines reduced to 25 lines!
        
        Args:
            search_query: Optional text search query
            selected_facets: Dictionary of facet_field -> single_value
            limit: Maximum number of results
            
        Returns:
            Dictionary containing search results and metadata
        """
        try:
            logger.info(f"Simple faceted search: query='{search_query}', facets={selected_facets}")
            
            # Pass original facet field names to repository - let repository handle field mapping
            repository_filters = {}
            if selected_facets:
                for facet_field, value in selected_facets.items():
                    if value and facet_field in self.facet_path_map:
                        # Keep original facet field names - repository will map to database fields
                        repository_filters[facet_field] = value
                        logger.debug(f"Added filter: {facet_field} = {value}")
            
            logger.debug(f"Repository filters to apply: {repository_filters}")
            
            # Pure repository approach - let repository handle Atlas Search + fallback
            entities, total_count = await self.entity_repo.get_entities_paginated(
                skip=0, limit=limit, filters=repository_filters
            )
            
            # Repository now handles Atlas Search with robust fallback (Phase 1 fix)
            return {
                "results": entities,
                "total_results": total_count,
                "search_type": "repository_managed",
                "query": search_query,
                "filters_applied": len(repository_filters)
            }
            
        except Exception as e:
            logger.error(f"Simple faceted search failed: {e}")
            return {"results": [], "total_results": 0, "error": str(e)}
    
    async def search_by_identifier(self, 
                                 identifier_value: str,
                                 identifier_type: str = None) -> List[Dict[str, Any]]:
        """
        Search entities by identifier using exact keyword matching
        
        Args:
            identifier_value: The identifier value to search for
            identifier_type: Optional specific identifier type
            
        Returns:
            List of matching entities
        """
        try:
            logger.info(f"Identifier search: value='{identifier_value}', type={identifier_type}")
            
            must_conditions = [{
                "text": {
                    "query": identifier_value,
                    "path": "identifiers.value"
                }
            }]
            
            if identifier_type:
                must_conditions.append({
                    "text": {
                        "query": identifier_type,
                        "path": "identifiers.type"
                    }
                })
            
            result = await self.atlas_search.compound_search(
                must=must_conditions,
                limit=20
            )
            
            results = result.get("results", [])
            logger.info(f"Identifier search completed: {len(results)} results")
            return results
            
        except Exception as e:
            logger.error(f"Identifier search failed: {e}")
            return []
    
    # ==================== HELPER METHODS ====================
    
    async def _autocomplete_search(self, query: str, limit: int) -> Dict[str, Any]:
        """Handle autocomplete search requests"""
        suggestions = await self.autocomplete_entity_names(query, limit)
        return {
            "results": [],
            "facets": {},
            "total_count": 0,
            "query": query,
            "filters": {},
            "suggestions": suggestions,
            "autocomplete": True
        }
    
    async def _enhance_search_results(self, results: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Enhance search results with additional entity data
        
        Args:
            results: Raw search results from Atlas Search
            
        Returns:
            Enhanced results with additional entity information
        """
        try:
            # For now, return results as-is
            # In the future, this could add additional entity details,
            # relationship counts, recent activity, etc.
            enhanced = []
            for result in results:
                # Convert ObjectId to string if present
                if "_id" in result and hasattr(result["_id"], "str"):
                    result["_id"] = str(result["_id"])
                enhanced.append(result)
            
            return enhanced
            
        except Exception as e:
            logger.error(f"Error enhancing search results: {e}")
            return results
    
    async def _get_search_suggestions(self, query: str) -> List[str]:
        """
        Get intelligent search suggestions based on query
        
        Args:
            query: Current search query
            
        Returns:
            List of search suggestions
        """
        try:
            # Use Atlas Search suggestions if available
            suggestions = await self.atlas_search.get_search_suggestions(query, limit=5)
            return suggestions
            
        except Exception as e:
            logger.error(f"Error getting search suggestions: {e}")
            return []
    
    # ==================== FACET UTILITY METHODS ====================
    
    async def get_available_facets(self) -> Dict[str, Any]:
        """
        Get all available facet values with counts
        
        Returns:
            Dictionary of facet fields with their available values and counts
        """
        try:
            # Execute a faceted search with no query to get all facet counts
            result = await self.atlas_search.faceted_search(
                query="*",
                facets=self.facet_config,
                limit=1  # We only need the facets, not the results
            )
            
            return result.get("facets", {})
            
        except Exception as e:
            logger.error(f"Error getting available facets: {e}")
            return {}
    
    
