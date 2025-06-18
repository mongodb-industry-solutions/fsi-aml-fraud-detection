"""
AtlasSearchBuilder - Enhanced AggregationBuilder for MongoDB Atlas Search

Extends the mongodb_core_lib AggregationBuilder with Atlas Search-specific methods
to eliminate manual pipeline construction and reduce code duplication.
"""

from typing import Dict, List, Optional, Any, Union
from reference.mongodb_core_lib import AggregationBuilder, AggregationStage


class AtlasSearchBuilder(AggregationBuilder):
    """
    Enhanced AggregationBuilder with Atlas Search-specific methods
    
    Provides fluent interface for building Atlas Search pipelines with:
    - Compound search operations
    - Autocomplete functionality  
    - Faceted search with $searchMeta
    - Geospatial search
    - Common search patterns (search + score + sort + paginate)
    """
    
    def __init__(self, index_name: str = "default_search_index"):
        """
        Initialize AtlasSearchBuilder with default search index
        
        Args:
            index_name: Default Atlas Search index name
        """
        super().__init__()
        self.default_index = index_name
        
    # ==================== ATLAS SEARCH STAGES ====================
    
    def compound_search(self, 
                       must: Optional[List[Dict]] = None,
                       must_not: Optional[List[Dict]] = None, 
                       should: Optional[List[Dict]] = None,
                       filters: Optional[List[Dict]] = None,
                       index: Optional[str] = None) -> 'AtlasSearchBuilder':
        """
        Add a compound search stage with multiple conditions
        
        Args:
            must: Conditions that must match
            must_not: Conditions that must not match
            should: Conditions that should match (for scoring)
            filters: Filter conditions that don't affect scoring
            index: Search index name (defaults to default_index)
            
        Returns:
            Self for method chaining
        """
        compound_query = {}
        
        if must:
            compound_query["must"] = must
        if must_not:
            compound_query["mustNot"] = must_not
        if should:
            compound_query["should"] = should
        if filters:
            compound_query["filter"] = filters
            
        search_stage = {
            "$search": {
                "index": index or self.default_index,
                "compound": compound_query
            }
        }
        
        self.pipeline.append(search_stage)
        return self
        
    def autocomplete(self, 
                    query: str,
                    path: str,
                    fuzzy: Optional[Dict[str, Any]] = None,
                    index: Optional[str] = None) -> 'AtlasSearchBuilder':
        """
        Add an autocomplete search stage
        
        Args:
            query: Autocomplete query string
            path: Field path for autocomplete
            fuzzy: Fuzzy matching configuration
            index: Search index name
            
        Returns:
            Self for method chaining
        """
        autocomplete_stage = {
            "autocomplete": {
                "query": query,
                "path": path,
                "tokenOrder": "sequential"
            }
        }
        
        if fuzzy:
            autocomplete_stage["autocomplete"]["fuzzy"] = fuzzy
            
        search_stage = {
            "$search": {
                "index": index or self.default_index,
                **autocomplete_stage
            }
        }
        
        self.pipeline.append(search_stage)
        return self
        
    def text_search_atlas(self,
                         query: str,
                         path: Union[str, List[str]],
                         fuzzy: Optional[Dict[str, Any]] = None,
                         boost: Optional[Dict[str, Any]] = None,
                         index: Optional[str] = None) -> 'AtlasSearchBuilder':
        """
        Add an Atlas text search stage (enhanced version)
        
        Args:
            query: Search query string
            path: Field path(s) to search
            fuzzy: Fuzzy matching configuration
            boost: Score boosting configuration  
            index: Search index name
            
        Returns:
            Self for method chaining
        """
        text_stage = {
            "text": {
                "query": query,
                "path": path if isinstance(path, list) else [path]
            }
        }
        
        if fuzzy:
            text_stage["text"]["fuzzy"] = fuzzy
        if boost:
            text_stage["text"]["score"] = {"boost": boost}
            
        search_stage = {
            "$search": {
                "index": index or self.default_index,
                **text_stage
            }
        }
        
        self.pipeline.append(search_stage)
        return self
        
    def search_meta(self,
                   facets: Optional[Dict[str, Dict[str, Any]]] = None,
                   operator: Optional[Dict[str, Any]] = None,
                   index: Optional[str] = None) -> 'AtlasSearchBuilder':
        """
        Add a $searchMeta stage for faceted search
        
        Args:
            facets: Facet configuration dictionary
            operator: Search operator for filtered facets
            index: Search index name
            
        Returns:
            Self for method chaining
        """
        search_meta = {
            "$searchMeta": {
                "index": index or self.default_index,
                "facet": {}
            }
        }
        
        if operator:
            search_meta["$searchMeta"]["facet"]["operator"] = operator
        if facets:
            search_meta["$searchMeta"]["facet"]["facets"] = facets
            
        self.pipeline.append(search_meta)
        return self
        
    def geo_search_atlas(self,
                        geometry: Dict[str, Any],
                        path: str = "location.coordinates",
                        relation: str = "within",
                        index: Optional[str] = None) -> 'AtlasSearchBuilder':
        """
        Add Atlas geospatial search stage
        
        Args:
            geometry: GeoJSON geometry object
            path: Field path for geo coordinates
            relation: Spatial relation (within, intersects, etc.)
            index: Search index name
            
        Returns:
            Self for method chaining
        """
        geo_stage = {
            f"geo{relation.title()}": {
                "path": path,
                "geometry": geometry
            }
        }
        
        search_stage = {
            "$search": {
                "index": index or self.default_index,
                **geo_stage
            }
        }
        
        self.pipeline.append(search_stage)
        return self
        
    # ==================== SEARCH UTILITY METHODS ====================
    
    def add_search_score(self, field_name: str = "search_score") -> 'AtlasSearchBuilder':
        """
        Add search score metadata field
        
        Args:
            field_name: Name for the search score field
            
        Returns:
            Self for method chaining
        """
        return self.add_fields({field_name: {"$meta": "searchScore"}})
        
    def add_vector_search_score(self, field_name: str = "vector_score") -> 'AtlasSearchBuilder':
        """
        Add vector search score metadata field
        
        Args:
            field_name: Name for the vector search score field
            
        Returns:
            Self for method chaining
        """
        return self.add_fields({field_name: {"$meta": "vectorSearchScore"}})
        
    def sort_by_score(self, score_field: str = "search_score", direction: int = -1) -> 'AtlasSearchBuilder':
        """
        Sort by search score (descending by default)
        
        Args:
            score_field: Search score field name
            direction: Sort direction (1 for ascending, -1 for descending)
            
        Returns:
            Self for method chaining
        """
        return self.sort({score_field: direction})
        
    def paginate(self, offset: int = 0, limit: int = 20) -> 'AtlasSearchBuilder':
        """
        Add pagination stages (skip + limit)
        
        Args:
            offset: Number of documents to skip
            limit: Maximum number of documents to return
            
        Returns:
            Self for method chaining
        """
        if offset > 0:
            self.skip(offset)
        return self.limit(limit)
        
    def format_object_ids(self, id_field: str = "_id") -> 'AtlasSearchBuilder':
        """
        Add stage to convert ObjectId to string for JSON serialization
        
        Args:
            id_field: ObjectId field name to convert
            
        Returns:
            Self for method chaining
        """
        return self.add_fields({
            id_field: {"$toString": f"${id_field}"}
        })
        
    # ==================== COMMON SEARCH PATTERNS ====================
    
    def search_and_score(self,
                        search_stage: Dict[str, Any],
                        score_field: str = "search_score",
                        sort_direction: int = -1,
                        index: Optional[str] = None) -> 'AtlasSearchBuilder':
        """
        Common pattern: Add search stage + score + sort
        
        Args:
            search_stage: Atlas Search stage configuration
            score_field: Search score field name
            sort_direction: Sort direction for scores
            index: Search index name
            
        Returns:
            Self for method chaining
        """
        # Add the search stage
        full_search_stage = {
            "$search": {
                "index": index or self.default_index,
                **search_stage
            }
        }
        self.pipeline.append(full_search_stage)
        
        # Add score and sort
        return self.add_search_score(score_field).sort_by_score(score_field, sort_direction)
        
    def text_search_paginated(self,
                             query: str,
                             path: Union[str, List[str]],
                             offset: int = 0,
                             limit: int = 20,
                             fuzzy: Optional[Dict[str, Any]] = None,
                             index: Optional[str] = None) -> 'AtlasSearchBuilder':
        """
        Complete text search with scoring, sorting, and pagination
        
        Args:
            query: Search query string
            path: Field path(s) to search
            offset: Number of documents to skip
            limit: Maximum documents to return
            fuzzy: Fuzzy matching configuration
            index: Search index name
            
        Returns:
            Self for method chaining
        """
        return (self
                .text_search_atlas(query, path, fuzzy=fuzzy, index=index)
                .add_search_score()
                .sort_by_score()
                .paginate(offset, limit)
                .format_object_ids())
                
    def compound_search_paginated(self,
                                 must: Optional[List[Dict]] = None,
                                 should: Optional[List[Dict]] = None,
                                 filters: Optional[List[Dict]] = None,
                                 offset: int = 0,
                                 limit: int = 20,
                                 index: Optional[str] = None) -> 'AtlasSearchBuilder':
        """
        Complete compound search with scoring, sorting, and pagination
        
        Args:
            must: Required conditions
            should: Optional conditions for scoring
            filters: Filter conditions
            offset: Number of documents to skip
            limit: Maximum documents to return
            index: Search index name
            
        Returns:
            Self for method chaining
        """
        return (self
                .compound_search(must=must, should=should, filters=filters, index=index)
                .add_search_score()
                .sort_by_score()
                .paginate(offset, limit)
                .format_object_ids())
                
    def faceted_search_complete(self,
                               query: Optional[str] = None,
                               path: Optional[Union[str, List[str]]] = None,
                               facets: Optional[Dict[str, Dict[str, Any]]] = None,
                               index: Optional[str] = None) -> 'AtlasSearchBuilder':
        """
        Complete faceted search with optional text search operator
        
        Args:
            query: Optional text search query
            path: Field path(s) for text search
            facets: Facet configuration
            index: Search index name
            
        Returns:
            Self for method chaining
        """
        operator = None
        if query and path:
            operator = {
                "text": {
                    "query": query,
                    "path": path if isinstance(path, list) else [path]
                }
            }
            
        return self.search_meta(facets=facets, operator=operator, index=index)