"""
Routes package - Organized route modules with clean separation of concerns

Route organization:
- core/ - Entity operations and resolution workflows
- search/ - Atlas, Vector, and Unified search functionality  
- network/ - Network analysis and graph operations
- debug/ - Development and troubleshooting endpoints
- relationships_updated.py - Enhanced relationship management
"""

# Import organized route modules with error handling

# Core routes
try:
    from .core.entities import router as core_entities_router
    from .core.entity_resolution import router as core_entity_resolution_router
except ImportError as e:
    print(f"Warning: Could not import core routes: {e}")
    core_entities_router = None
    core_entity_resolution_router = None

# Search routes  
try:
    from .search.atlas_search import router as atlas_search_router
    from .search.vector_search import router as vector_search_router
    from .search.unified_search import router as unified_search_router
    from .search.entity_search import router as entity_search_router  # Phase 7 Stage 2
except ImportError as e:
    print(f"Warning: Could not import search routes: {e}")
    atlas_search_router = None
    vector_search_router = None
    unified_search_router = None
    entity_search_router = None

# Network routes
try:
    from .network.network_analysis import router as network_analysis_router
except ImportError as e:
    print(f"Warning: Could not import network routes: {e}")
    network_analysis_router = None

# Debug routes
try:
    from .debug.search_debug import router as search_debug_router
except ImportError as e:
    print(f"Warning: Could not import debug routes: {e}")
    search_debug_router = None

# Updated relationship routes
try:
    from .relationships_updated import router as relationships_router
except ImportError as e:
    print(f"Warning: Could not import updated relationships routes: {e}")
    relationships_router = None

# Enhanced entity resolution routes
try:
    from .resolution.enhanced_resolution_routes import router as enhanced_resolution_router
except ImportError as e:
    print(f"Warning: Could not import enhanced resolution routes: {e}")
    enhanced_resolution_router = None

# Transaction routes
try:
    from .transactions import router as transactions_router
except ImportError as e:
    print(f"Warning: Could not import transaction routes: {e}")
    transactions_router = None

# LLM routes
try:
    from .llm.classification_routes import router as llm_classification_router
    from .llm.investigation_routes import router as llm_investigation_router
except ImportError as e:
    print(f"Warning: Could not import LLM routes: {e}")
    llm_classification_router = None
    llm_investigation_router = None

__all__ = [
    "core_entities_router",
    "core_entity_resolution_router", 
    "atlas_search_router",
    "vector_search_router",
    "unified_search_router",
    "entity_search_router",  # Phase 7 Stage 2
    "network_analysis_router",
    "search_debug_router",
    "relationships_router",
    "enhanced_resolution_router",
    "transactions_router",
    "llm_classification_router",
    "llm_investigation_router"
]