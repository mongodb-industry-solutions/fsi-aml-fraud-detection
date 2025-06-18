"""
Core services module - Core business services using repository pattern

Contains specialized services for entity resolution workflow:
- EntityResolutionService: Resolution workflow orchestration
- MatchingService: Entity matching strategies and validation
- ConfidenceService: Confidence scoring and threshold management
- MergeService: Entity merging and conflict resolution
- RelationshipService: Relationship management operations
"""

# Core service imports
from .entity_resolution_service import EntityResolutionService
from .matching_service import MatchingService
from .confidence_service import ConfidenceService
from .merge_service import MergeService
from .relationship_service import RelationshipService

__all__ = [
    "EntityResolutionService",
    "MatchingService", 
    "ConfidenceService",
    "MergeService",
    "RelationshipService",
]