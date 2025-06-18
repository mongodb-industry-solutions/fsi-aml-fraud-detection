"""
Core entity routes - Basic entity operations and resolution workflows

Focused routes for core entity management functionality:
- Entity CRUD operations using new service architecture
- Entity resolution workflows using orchestrated services
"""

# Import routers with error handling for development
try:
    from .entities import router as entities_router
except ImportError as e:
    print(f"Warning: Could not import entities router: {e}")
    entities_router = None

try:
    from .entity_resolution import router as entity_resolution_router
except ImportError as e:
    print(f"Warning: Could not import entity_resolution router: {e}")
    entity_resolution_router = None

__all__ = [
    "entities_router",
    "entity_resolution_router",
]