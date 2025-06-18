"""
Search services module - Search and discovery services using repository pattern

Contains focused services for:
- Atlas Search operations using AtlasSearchRepository
- Vector Search operations using VectorSearchRepository  
- Unified search orchestration and result aggregation
"""

# Search service imports
from .atlas_search_service import AtlasSearchService
from .vector_search_service import VectorSearchService
from .unified_search_service import UnifiedSearchService

__all__ = [
    "AtlasSearchService",
    "VectorSearchService",
    "UnifiedSearchService",
]