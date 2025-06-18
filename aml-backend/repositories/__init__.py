# Repository Layer - Simplified data access using mongodb_core_lib
from .interfaces import (
    EntityRepositoryInterface,
    RelationshipRepositoryInterface,
    VectorSearchRepositoryInterface,
    NetworkRepositoryInterface
)
from .impl import (
    EntityRepository,
    RelationshipRepository,
    AtlasSearchRepository,  # Now concrete class only
    VectorSearchRepository
)
from .factory import RepositoryFactory

__all__ = [
    # Interfaces (reduced by 1)
    "EntityRepositoryInterface",
    "RelationshipRepositoryInterface", 
    "VectorSearchRepositoryInterface",
    "NetworkRepositoryInterface",
    
    # Implementations (AtlasSearchRepository now concrete)
    "EntityRepository",
    "RelationshipRepository",
    "AtlasSearchRepository",
    "VectorSearchRepository",
    
    # Factory
    "RepositoryFactory"
]