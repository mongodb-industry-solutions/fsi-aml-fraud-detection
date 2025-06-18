"""
Relationship Repository Interface - Clean contract for relationship data access

Defines the interface for relationship-related database operations based on
analysis of current services layer usage patterns.
"""

from abc import ABC, abstractmethod
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime

from models.core.network import EntityRelationship, RelationshipType, RelationshipStrength


class RelationshipQueryParams:
    """Parameters for relationship queries"""
    
    def __init__(self,
                 source_entity_id: Optional[str] = None,
                 target_entity_id: Optional[str] = None,
                 relationship_types: Optional[List[RelationshipType]] = None,
                 min_confidence: Optional[float] = None,
                 verified_only: bool = False,
                 limit: int = 20,
                 offset: int = 0,
                 sort_by: str = "created_date",
                 sort_order: str = "desc"):
        self.source_entity_id = source_entity_id
        self.target_entity_id = target_entity_id
        self.relationship_types = relationship_types or []
        self.min_confidence = min_confidence
        self.verified_only = verified_only
        self.limit = limit
        self.offset = offset
        self.sort_by = sort_by
        self.sort_order = sort_order


class RelationshipStats:
    """Relationship statistics result"""
    
    def __init__(self,
                 total_relationships: int = 0,
                 by_type: Optional[Dict[str, int]] = None,
                 by_strength: Optional[Dict[str, int]] = None,
                 average_confidence: float = 0.0,
                 verified_count: int = 0,
                 recent_count: int = 0):
        self.total_relationships = total_relationships
        self.by_type = by_type or {}
        self.by_strength = by_strength or {}
        self.average_confidence = average_confidence
        self.verified_count = verified_count
        self.recent_count = recent_count


class RelationshipRepositoryInterface(ABC):
    """Interface for relationship repository operations"""
    
    # ==================== CORE RELATIONSHIP OPERATIONS ====================
    
    @abstractmethod
    async def create(self, relationship_data: Dict[str, Any]) -> str:
        """
        Create a new relationship
        
        Args:
            relationship_data: Relationship data dictionary
            
        Returns:
            str: Created relationship ID
            
        Raises:
            RepositoryError: If creation fails
        """
        pass
    
    @abstractmethod
    async def find_by_id(self, relationship_id: str) -> Optional[Dict[str, Any]]:
        """
        Find relationship by ID
        
        Args:
            relationship_id: Relationship identifier
            
        Returns:
            Optional[Dict]: Relationship data or None if not found
        """
        pass
    
    @abstractmethod
    async def update(self, relationship_id: str, update_data: Dict[str, Any]) -> bool:
        """
        Update relationship data
        
        Args:
            relationship_id: Relationship identifier
            update_data: Fields to update
            
        Returns:
            bool: True if update successful
        """
        pass
    
    @abstractmethod
    async def delete(self, relationship_id: str) -> bool:
        """
        Delete relationship
        
        Args:
            relationship_id: Relationship identifier
            
        Returns:
            bool: True if deletion successful
        """
        pass
    
    # ==================== RELATIONSHIP DISCOVERY ====================
    
    @abstractmethod
    async def find_by_criteria(self, params: RelationshipQueryParams) -> Dict[str, Any]:
        """
        Find relationships by search criteria with pagination
        
        Args:
            params: Query parameters
            
        Returns:
            Dict: Contains 'relationships', 'total_count', 'has_more'
        """
        pass
    
    @abstractmethod
    async def find_existing_relationship(self, source_entity_id: str, 
                                       target_entity_id: str,
                                       relationship_type: RelationshipType) -> Optional[Dict[str, Any]]:
        """
        Find existing relationship between two entities of specific type
        
        Args:
            source_entity_id: Source entity ID
            target_entity_id: Target entity ID  
            relationship_type: Type of relationship
            
        Returns:
            Optional[Dict]: Existing relationship or None
        """
        pass
    
    @abstractmethod
    async def find_bidirectional_relationship(self, entity_a_id: str, 
                                            entity_b_id: str,
                                            relationship_type: Optional[RelationshipType] = None) -> Optional[Dict[str, Any]]:
        """
        Find relationship between two entities (in either direction)
        
        Args:
            entity_a_id: First entity ID
            entity_b_id: Second entity ID
            relationship_type: Optional relationship type filter
            
        Returns:
            Optional[Dict]: Relationship found in either direction
        """
        pass
    
    @abstractmethod
    async def get_entity_relationships(self, entity_id: str, 
                                     relationship_types: Optional[List[RelationshipType]] = None,
                                     min_confidence: Optional[float] = None,
                                     limit: int = 50) -> List[Dict[str, Any]]:
        """
        Get all relationships for an entity (as source or target)
        
        Args:
            entity_id: Entity identifier
            relationship_types: Filter by relationship types
            min_confidence: Minimum confidence threshold
            limit: Maximum number of results
            
        Returns:
            List[Dict]: Entity relationships
        """
        pass
    
    @abstractmethod
    async def get_connected_entities(self, entity_id: str,
                                   relationship_types: Optional[List[RelationshipType]] = None,
                                   max_depth: int = 2,
                                   min_confidence: Optional[float] = None) -> List[Dict[str, Any]]:
        """
        Get entities connected to this entity through relationships
        
        Args:
            entity_id: Starting entity ID
            relationship_types: Filter by relationship types
            max_depth: Maximum relationship depth to traverse
            min_confidence: Minimum confidence threshold
            
        Returns:
            List[Dict]: Connected entities with relationship paths
        """
        pass
    
    # ==================== RELATIONSHIP VERIFICATION ====================
    
    @abstractmethod
    async def verify_relationship(self, relationship_id: str, 
                                verified_by: str, evidence: Optional[str] = None) -> bool:
        """
        Mark relationship as verified
        
        Args:
            relationship_id: Relationship identifier
            verified_by: User/system that verified the relationship
            evidence: Optional verification evidence
            
        Returns:
            bool: True if verification successful
        """
        pass
    
    @abstractmethod
    async def add_evidence(self, relationship_id: str, evidence: str) -> bool:
        """
        Add evidence to support a relationship
        
        Args:
            relationship_id: Relationship identifier
            evidence: Evidence text
            
        Returns:
            bool: True if evidence added successfully
        """
        pass
    
    @abstractmethod
    async def update_confidence(self, relationship_id: str, 
                              new_confidence: float, reason: Optional[str] = None) -> bool:
        """
        Update relationship confidence score
        
        Args:
            relationship_id: Relationship identifier
            new_confidence: New confidence score (0.0-1.0)
            reason: Optional reason for confidence change
            
        Returns:
            bool: True if update successful
        """
        pass
    
    # ==================== RELATIONSHIP ANALYTICS ====================
    
    @abstractmethod
    async def get_statistics(self, entity_id: Optional[str] = None,
                           start_date: Optional[datetime] = None,
                           end_date: Optional[datetime] = None) -> RelationshipStats:
        """
        Get relationship statistics
        
        Args:
            entity_id: Optional entity to focus statistics on
            start_date: Optional start date filter
            end_date: Optional end date filter
            
        Returns:
            RelationshipStats: Comprehensive statistics
        """
        pass
    
    @abstractmethod
    async def count_by_type(self, relationship_types: Optional[List[RelationshipType]] = None) -> Dict[str, int]:
        """
        Count relationships by type
        
        Args:
            relationship_types: Optional types to filter by
            
        Returns:
            Dict[str, int]: Count by relationship type
        """
        pass
    
    @abstractmethod
    async def get_most_connected_entities(self, limit: int = 10) -> List[Dict[str, Any]]:
        """
        Get entities with the most relationships
        
        Args:
            limit: Maximum number of results
            
        Returns:
            List[Dict]: Entities with relationship counts
        """
        pass
    
    @abstractmethod
    async def calculate_relationship_strength_distribution(self) -> Dict[str, int]:
        """
        Calculate distribution of relationship strengths
        
        Returns:
            Dict[str, int]: Count by strength level
        """
        pass
    
    # ==================== RESOLUTION WORKFLOW SUPPORT ====================
    
    @abstractmethod
    async def create_resolution_relationship(self, source_entity_id: str,
                                           target_entity_id: str,
                                           resolution_type: str,
                                           confidence: float,
                                           resolution_id: str) -> str:
        """
        Create relationship from entity resolution process
        
        Args:
            source_entity_id: Source entity ID
            target_entity_id: Target entity ID
            resolution_type: Type of resolution (matched, duplicate, etc.)
            confidence: Resolution confidence
            resolution_id: Resolution process ID
            
        Returns:
            str: Created relationship ID
        """
        pass
    
    @abstractmethod
    async def get_resolution_relationships(self, resolution_id: str) -> List[Dict[str, Any]]:
        """
        Get relationships created during a resolution process
        
        Args:
            resolution_id: Resolution process ID
            
        Returns:
            List[Dict]: Resolution relationships
        """
        pass
    
    # ==================== GRAPH OPERATIONS ====================
    
    @abstractmethod
    async def find_shortest_path(self, source_entity_id: str, 
                               target_entity_id: str,
                               max_depth: int = 6) -> Optional[List[Dict[str, Any]]]:
        """
        Find shortest path between two entities
        
        Args:
            source_entity_id: Starting entity ID
            target_entity_id: Target entity ID
            max_depth: Maximum path length
            
        Returns:
            Optional[List[Dict]]: Path of relationships or None if no path
        """
        pass
    
    @abstractmethod
    async def detect_relationship_loops(self, entity_id: str, 
                                      max_depth: int = 4) -> List[List[str]]:
        """
        Detect circular relationship patterns
        
        Args:
            entity_id: Starting entity ID
            max_depth: Maximum loop size to detect
            
        Returns:
            List[List[str]]: List of entity ID loops found
        """
        pass
    
    @abstractmethod
    async def get_relationship_clusters(self, min_cluster_size: int = 3) -> List[List[str]]:
        """
        Find clusters of highly connected entities
        
        Args:
            min_cluster_size: Minimum entities in a cluster
            
        Returns:
            List[List[str]]: Clusters of entity IDs
        """
        pass
    
    # ==================== BULK OPERATIONS ====================
    
    @abstractmethod
    async def bulk_create(self, relationships_data: List[Dict[str, Any]]) -> List[str]:
        """
        Create multiple relationships in bulk
        
        Args:
            relationships_data: List of relationship data dictionaries
            
        Returns:
            List[str]: List of created relationship IDs
        """
        pass
    
    @abstractmethod
    async def bulk_update_confidence(self, updates: List[Tuple[str, float]]) -> int:
        """
        Update confidence scores for multiple relationships
        
        Args:
            updates: List of (relationship_id, new_confidence) tuples
            
        Returns:
            int: Number of relationships updated
        """
        pass
    
    @abstractmethod
    async def bulk_verify(self, relationship_ids: List[str], 
                         verified_by: str) -> int:
        """
        Verify multiple relationships in bulk
        
        Args:
            relationship_ids: List of relationship IDs
            verified_by: User/system verifying relationships
            
        Returns:
            int: Number of relationships verified
        """
        pass
    
    # ==================== DATA INTEGRITY ====================
    
    @abstractmethod
    async def validate_relationship_integrity(self, relationship_id: str) -> Dict[str, Any]:
        """
        Validate relationship data integrity
        
        Args:
            relationship_id: Relationship identifier
            
        Returns:
            Dict: Validation results and any issues found
        """
        pass
    
    @abstractmethod
    async def cleanup_orphaned_relationships(self) -> int:
        """
        Clean up relationships pointing to non-existent entities
        
        Returns:
            int: Number of orphaned relationships removed
        """
        pass
    
    @abstractmethod
    async def deduplicate_relationships(self) -> Dict[str, int]:
        """
        Remove duplicate relationships
        
        Returns:
            Dict[str, int]: Deduplication results (duplicates_found, duplicates_removed)
        """
        pass