"""
Search routes - Comprehensive search functionality using refactored services

Focused routes for different search modalities:
- Atlas Search endpoints using AtlasSearchService
- Vector Search endpoints using VectorSearchService  
- Unified Search endpoints using UnifiedSearchService
"""

# Import routers with error handling for development
try:
    from .atlas_search import router as atlas_search_router
except ImportError as e:
    print(f"Warning: Could not import atlas_search router: {e}")
    atlas_search_router = None

try:
    from .vector_search import router as vector_search_router
except ImportError as e:
    print(f"Warning: Could not import vector_search router: {e}")
    vector_search_router = None

try:
    from .unified_search import router as unified_search_router
except ImportError as e:
    print(f"Warning: Could not import unified_search router: {e}")
    unified_search_router = None

__all__ = [
    "atlas_search_router",
    "vector_search_router", 
    "unified_search_router",
]