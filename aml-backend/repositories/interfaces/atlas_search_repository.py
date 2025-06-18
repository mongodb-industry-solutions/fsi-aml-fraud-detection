"""
Atlas Search Repository Interface - Clean contract for Atlas Search operations

Defines the interface for MongoDB Atlas Search operations based on
analysis of current atlas_search.py service usage patterns.
"""

from abc import ABC, abstractmethod
from typing import Dict, List, Optional, Any
from dataclasses import dataclass


@dataclass
class SearchQueryParams:
    """Parameters for Atlas Search queries"""
    query: str
    fields: Optional[List[str]] = None
    fuzzy: bool = True
    max_edits: int = 2
    prefix_length: int = 0
    max_expansions: int = 50
    boost: Optional[Dict[str, float]] = None
    filters: Optional[Dict[str, Any]] = None
    limit: int = 20
    offset: int = 0


@dataclass
class AutocompleteParams:
    """Parameters for autocomplete queries"""
    query: str
    field: str
    fuzzy: bool = True
    max_edits: int = 1
    limit: int = 10


@dataclass
class SearchIndexInfo:
    """Information about search index"""
    name: str
    status: str
    definition: Dict[str, Any]
    stats: Optional[Dict[str, Any]] = None


class AtlasSearchRepositoryInterface(ABC):
    """Interface for Atlas Search repository operations"""
    
    # ==================== CORE SEARCH OPERATIONS ====================
    
    @abstractmethod
    async def text_search(self, params: SearchQueryParams) -> Dict[str, Any]:
        """
        Perform text search using Atlas Search
        
        Args:
            params: Search parameters
            
        Returns:
            Dict: Search results with metadata
        """
        pass
    
    @abstractmethod
    async def compound_search(self, must: Optional[List[Dict]] = None,
                            must_not: Optional[List[Dict]] = None,
                            should: Optional[List[Dict]] = None,
                            filters: Optional[List[Dict]] = None,
                            limit: int = 20) -> Dict[str, Any]:
        """
        Perform compound search with multiple conditions
        
        Args:
            must: Conditions that must match
            must_not: Conditions that must not match
            should: Conditions that should match (boost score)
            filters: Filter conditions (don't affect score)
            limit: Maximum results
            
        Returns:
            Dict: Search results with scoring information
        """
        pass
    
    @abstractmethod
    async def autocomplete_search(self, params: AutocompleteParams) -> List[str]:
        """
        Perform autocomplete search
        
        Args:
            params: Autocomplete parameters
            
        Returns:
            List[str]: Autocomplete suggestions
        """
        pass
    
    @abstractmethod
    async def fuzzy_match(self, query: str, field: str,
                         max_edits: int = 2, prefix_length: int = 0,
                         limit: int = 20) -> List[Dict[str, Any]]:
        """
        Perform fuzzy text matching
        
        Args:
            query: Search query
            field: Field to search in
            max_edits: Maximum edit distance
            prefix_length: Prefix length that must match exactly
            limit: Maximum results
            
        Returns:
            List[Dict]: Fuzzy match results
        """
        pass
    
    # ==================== ENTITY-SPECIFIC SEARCHES ====================
    
    @abstractmethod
    async def find_entity_matches(self, entity_name: str,
                                entity_type: Optional[str] = None,
                                additional_fields: Optional[Dict[str, str]] = None,
                                fuzzy: bool = True,
                                limit: int = 20) -> List[Dict[str, Any]]:
        """
        Find potential entity matches using optimized search pipeline
        
        Args:
            entity_name: Primary entity name to search
            entity_type: Optional entity type filter
            additional_fields: Additional fields for compound search
            fuzzy: Enable fuzzy matching
            limit: Maximum results
            
        Returns:
            List[Dict]: Potential entity matches with scores
        """
        pass
    
    @abstractmethod
    async def search_by_identifiers(self, identifiers: Dict[str, str],
                                  boost_exact_matches: bool = True,
                                  limit: int = 10) -> List[Dict[str, Any]]:
        """
        Search entities by identifier fields with exact matching
        
        Args:
            identifiers: Dictionary of identifier types and values
            boost_exact_matches: Boost exact identifier matches
            limit: Maximum results
            
        Returns:
            List[Dict]: Entities with matching identifiers
        """
        pass
    
    @abstractmethod
    async def search_alternate_names(self, names: List[str],
                                   fuzzy: bool = True,
                                   limit: int = 20) -> List[Dict[str, Any]]:
        """
        Search entities by alternate names
        
        Args:
            names: List of alternate names to search
            fuzzy: Enable fuzzy matching
            limit: Maximum results
            
        Returns:
            List[Dict]: Entities matching alternate names
        """
        pass
    
    # ==================== ADVANCED SEARCH FEATURES ====================
    
    @abstractmethod
    async def geo_search(self, location: Dict[str, float], 
                        max_distance: float,
                        additional_criteria: Optional[Dict[str, Any]] = None,
                        limit: int = 20) -> List[Dict[str, Any]]:
        """
        Search entities by geographic location
        
        Args:
            location: Geographic coordinates (lat, lng)
            max_distance: Maximum distance in meters
            additional_criteria: Additional search criteria
            limit: Maximum results
            
        Returns:
            List[Dict]: Entities within geographic range
        """
        pass
    
    @abstractmethod
    async def date_range_search(self, field: str,
                              start_date: Optional[str] = None,
                              end_date: Optional[str] = None,
                              additional_criteria: Optional[Dict[str, Any]] = None,
                              limit: int = 20) -> List[Dict[str, Any]]:
        """
        Search entities by date range
        
        Args:
            field: Date field to search on
            start_date: Start date (ISO format)
            end_date: End date (ISO format)
            additional_criteria: Additional search criteria
            limit: Maximum results
            
        Returns:
            List[Dict]: Entities within date range
        """
        pass
    
    @abstractmethod
    async def faceted_search(self, query: str,
                           facets: Dict[str, Dict[str, Any]],
                           limit: int = 20) -> Dict[str, Any]:
        """
        Perform faceted search with aggregated counts
        
        Args:
            query: Search query
            facets: Facet configuration
            limit: Maximum results
            
        Returns:
            Dict: Search results with facet counts
        """
        pass
    
    # ==================== SEARCH ANALYTICS ====================
    
    @abstractmethod
    async def get_search_analytics(self, start_date: Optional[str] = None,
                                 end_date: Optional[str] = None) -> Dict[str, Any]:
        """
        Get search analytics and metrics
        
        Args:
            start_date: Start date for analytics
            end_date: End date for analytics
            
        Returns:
            Dict: Search analytics data
        """
        pass
    
    @abstractmethod
    async def get_popular_queries(self, limit: int = 10) -> List[Dict[str, Any]]:
        """
        Get most popular search queries
        
        Args:
            limit: Maximum results
            
        Returns:
            List[Dict]: Popular queries with counts
        """
        pass
    
    @abstractmethod
    async def get_search_performance_metrics(self) -> Dict[str, Any]:
        """
        Get search performance metrics
        
        Returns:
            Dict: Performance metrics (avg response time, etc.)
        """
        pass
    
    # ==================== INDEX MANAGEMENT ====================
    
    @abstractmethod
    async def get_search_indexes(self) -> List[SearchIndexInfo]:
        """
        Get information about available search indexes
        
        Returns:
            List[SearchIndexInfo]: Search index information
        """
        pass
    
    @abstractmethod
    async def test_search_index(self, index_name: str,
                              test_query: Optional[str] = None) -> Dict[str, Any]:
        """
        Test search index functionality
        
        Args:
            index_name: Name of index to test
            test_query: Optional test query
            
        Returns:
            Dict: Test results and index health information
        """
        pass
    
    @abstractmethod
    async def get_index_statistics(self, index_name: str) -> Dict[str, Any]:
        """
        Get statistics for a specific search index
        
        Args:
            index_name: Name of the index
            
        Returns:
            Dict: Index statistics and usage metrics
        """
        pass
    
    # ==================== QUERY BUILDING UTILITIES ====================
    
    @abstractmethod
    async def build_entity_search_pipeline(self, search_terms: Dict[str, Any],
                                         boost_config: Optional[Dict[str, float]] = None,
                                         filters: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        """
        Build optimized search pipeline for entity matching
        
        Args:
            search_terms: Dictionary of fields and search values
            boost_config: Field boost configuration
            filters: Additional filters to apply
            
        Returns:
            List[Dict]: MongoDB aggregation pipeline
        """
        pass
    
    @abstractmethod
    async def build_compound_query(self, conditions: Dict[str, List[Dict]]) -> Dict[str, Any]:
        """
        Build compound search query
        
        Args:
            conditions: Dictionary with 'must', 'should', 'must_not', 'filter' keys
            
        Returns:
            Dict: Compound query structure
        """
        pass
    
    # ==================== SEARCH SUGGESTIONS ====================
    
    @abstractmethod
    async def get_search_suggestions(self, partial_query: str,
                                   field: str = "name",
                                   limit: int = 5) -> List[str]:
        """
        Get search suggestions for partial queries
        
        Args:
            partial_query: Partial search query
            field: Field to get suggestions from
            limit: Maximum suggestions
            
        Returns:
            List[str]: Search suggestions
        """
        pass
    
    @abstractmethod
    async def get_spell_corrections(self, query: str,
                                  field: str = "name") -> List[str]:
        """
        Get spelling corrections for search queries
        
        Args:
            query: Original query
            field: Field to check spelling against
            
        Returns:
            List[str]: Spelling correction suggestions
        """
        pass
    
    # ==================== RESULT ENHANCEMENT ====================
    
    @abstractmethod
    async def add_search_highlights(self, results: List[Dict[str, Any]],
                                  query: str,
                                  fields: List[str]) -> List[Dict[str, Any]]:
        """
        Add search result highlights
        
        Args:
            results: Search results to enhance
            query: Original search query
            fields: Fields to highlight
            
        Returns:
            List[Dict]: Results with highlight information
        """
        pass
    
    @abstractmethod
    async def calculate_relevance_scores(self, results: List[Dict[str, Any]],
                                       query_context: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Calculate and add relevance scores to results
        
        Args:
            results: Search results
            query_context: Context for relevance calculation
            
        Returns:
            List[Dict]: Results with relevance scores
        """
        pass