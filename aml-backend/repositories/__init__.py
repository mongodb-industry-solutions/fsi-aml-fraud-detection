# Repository Layer - Clean data access abstraction using mongodb_core_lib
from .interfaces import (
    EntityRepositoryInterface,
    RelationshipRepositoryInterface,
    AtlasSearchRepositoryInterface,
    VectorSearchRepositoryInterface,
    NetworkRepositoryInterface
)
from .impl import (
    EntityRepository,
    RelationshipRepository,
    AtlasSearchRepository,
    VectorSearchRepository
)
from .factory import RepositoryFactory

__all__ = [
    # Interfaces
    "EntityRepositoryInterface",
    "RelationshipRepositoryInterface", 
    "AtlasSearchRepositoryInterface",
    "VectorSearchRepositoryInterface",
    "NetworkRepositoryInterface",
    
    # Implementations (only ones that exist)
    "EntityRepository",
    "RelationshipRepository",
    "AtlasSearchRepository",
    "VectorSearchRepository",
    
    # Factory
    "RepositoryFactory"
]