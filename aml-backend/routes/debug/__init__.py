"""
Debug routes - Development and troubleshooting endpoints

Focused routes for debugging and development support:
- Search debug endpoints for troubleshooting
- Index testing and connectivity validation
- Raw query execution for development
"""

# Import routers with error handling for development
try:
    from .search_debug import router as search_debug_router
except ImportError as e:
    print(f"Warning: Could not import search_debug router: {e}")
    search_debug_router = None

__all__ = [
    "search_debug_router",
]