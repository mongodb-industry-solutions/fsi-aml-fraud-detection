# Repository Interfaces - Clean contracts for data access
from .entity_repository import EntityRepositoryInterface
from .relationship_repository import RelationshipRepositoryInterface
from .atlas_search_repository import AtlasSearchRepositoryInterface
from .vector_search_repository import VectorSearchRepositoryInterface
from .network_repository import NetworkRepositoryInterface

__all__ = [
    "EntityRepositoryInterface",
    "RelationshipRepositoryInterface",
    "AtlasSearchRepositoryInterface", 
    "VectorSearchRepositoryInterface",
    "NetworkRepositoryInterface"
]