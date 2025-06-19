# Repository Implementations - Concrete implementations using mongodb_core_lib
from .entity_repository import EntityRepository
from .network_relationship_repository import NetworkRelationshipRepository
from .atlas_search_repository import AtlasSearchRepository
from .vector_search_repository import VectorSearchRepository

# Alias for backward compatibility
RelationshipRepository = NetworkRelationshipRepository

__all__ = [
    "EntityRepository",
    "NetworkRelationshipRepository",
    "RelationshipRepository",  # Backward compatibility alias
    "AtlasSearchRepository",
    "VectorSearchRepository"
]