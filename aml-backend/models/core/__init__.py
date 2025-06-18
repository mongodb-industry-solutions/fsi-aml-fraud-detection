# Core domain models - clean, focused data structures
from .entity import (
    Entity,
    ContactInfo,
    RiskAssessment,
    WatchlistMatch,
    EntityType,
    EntityStatus,
    RiskLevel
)
from .resolution import (
    ResolutionResult,
    ResolutionDecision,
    ResolutionStatus,
    PotentialMatch,
    MatchEvidence
)
from .network import (
    EntityRelationship,
    RelationshipType,
    NetworkNode
)

__all__ = [
    # Entity models
    "Entity",
    "ContactInfo", 
    "RiskAssessment",
    "WatchlistMatch",
    "EntityType",
    "EntityStatus", 
    "RiskLevel",
    
    # Resolution models
    "ResolutionResult",
    "ResolutionDecision",
    "ResolutionStatus",
    "PotentialMatch",
    "MatchEvidence",
    
    # Network models
    "EntityRelationship",
    "RelationshipType",
    "NetworkNode"
]