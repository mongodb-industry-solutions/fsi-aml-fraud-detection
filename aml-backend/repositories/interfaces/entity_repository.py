"""
Entity Repository Interface - Clean contract for entity data access

Defines the interface for entity-related database operations based on
analysis of current services layer usage patterns.
"""

from abc import ABC, abstractmethod
from typing import Dict, List, Optional, Any
from datetime import datetime

from models.core.entity import Entity
from models.core.resolution import ResolutionResult


class EntityRepositoryInterface(ABC):
    """Interface for entity repository operations"""
    
    # ==================== CORE ENTITY OPERATIONS ====================
    
    @abstractmethod
    async def create(self, entity_data: Dict[str, Any]) -> str:
        """
        Create a new entity
        
        Args:
            entity_data: Entity data dictionary
            
        Returns:
            str: Created entity ID
            
        Raises:
            RepositoryError: If creation fails
        """
        pass
    
    @abstractmethod
    async def get_entities_paginated(self, skip: int = 0, limit: int = 20, 
                                   filters: Optional[Dict[str, Any]] = None) -> tuple[List[Dict[str, Any]], int]:
        """
        Get paginated list of entities with optional filtering
        
        Args:
            skip: Number of entities to skip
            limit: Maximum number of entities to return
            filters: Optional filter criteria
            
        Returns:
            tuple: (entities_list, total_count)
        """
        pass
    
    @abstractmethod
    async def get_available_filter_values(self) -> Dict[str, List[str]]:
        """
        Get available filter values for frontend filtering
        
        Returns:
            Dict: Available values for each filterable field
        """
        pass
    
    @abstractmethod
    async def find_by_id(self, entity_id: str) -> Optional[Dict[str, Any]]:
        """
        Find entity by ID
        
        Args:
            entity_id: Entity identifier
            
        Returns:
            Optional[Dict]: Entity data or None if not found
        """
        pass
    
    @abstractmethod
    async def find_multiple_by_ids(self, entity_ids: List[str]) -> List[Dict[str, Any]]:
        """
        Find multiple entities by IDs (for batch operations)
        
        Args:
            entity_ids: List of entity identifiers
            
        Returns:
            List[Dict]: List of entity data dictionaries
        """
        pass
    
    @abstractmethod
    async def update(self, entity_id: str, update_data: Dict[str, Any]) -> bool:
        """
        Update entity data
        
        Args:
            entity_id: Entity identifier
            update_data: Fields to update
            
        Returns:
            bool: True if update successful
        """
        pass
    
    @abstractmethod
    async def delete(self, entity_id: str) -> bool:
        """
        Delete entity (soft delete - set status to archived)
        
        Args:
            entity_id: Entity identifier
            
        Returns:
            bool: True if deletion successful
        """
        pass
    
    # ==================== SEARCH AND DISCOVERY ====================
    
    @abstractmethod
    async def find_by_criteria(self, criteria: Dict[str, Any], 
                             limit: int = 20, offset: int = 0) -> Dict[str, Any]:
        """
        Find entities by search criteria with pagination
        
        Args:
            criteria: Search criteria dictionary
            limit: Maximum number of results
            offset: Number of results to skip
            
        Returns:
            Dict: Contains 'entities', 'total_count', 'has_more'
        """
        pass
    
    @abstractmethod
    async def find_by_identifiers(self, identifiers: Dict[str, str]) -> List[Dict[str, Any]]:
        """
        Find entities by unique identifiers (exact matching)
        
        Args:
            identifiers: Dictionary of identifier type -> value
            
        Returns:
            List[Dict]: Matching entities
        """
        pass
    
    @abstractmethod
    async def find_by_phonetic_codes(self, phonetic_codes: Dict[str, str]) -> List[Dict[str, Any]]:
        """
        Find entities by phonetic name codes (for name matching)
        
        Args:
            phonetic_codes: Dictionary of algorithm -> code
            
        Returns:
            List[Dict]: Matching entities
        """
        pass
    
    # ==================== ENTITY RESOLUTION OPERATIONS ====================
    
    @abstractmethod
    async def update_resolution_status(self, entity_id: str, 
                                     resolution_data: Dict[str, Any]) -> bool:
        """
        Update entity resolution status and linked entities
        
        Args:
            entity_id: Entity identifier
            resolution_data: Resolution status and linked entity information
            
        Returns:
            bool: True if update successful
        """
        pass
    
    @abstractmethod
    async def add_linked_entity(self, master_entity_id: str, 
                              linked_entity_id: str, link_type: str = "resolved") -> bool:
        """
        Add a linked entity relationship
        
        Args:
            master_entity_id: Primary entity ID
            linked_entity_id: Linked entity ID
            link_type: Type of link (resolved, duplicate, etc.)
            
        Returns:
            bool: True if link added successfully
        """
        pass
    
    @abstractmethod
    async def get_linked_entities(self, entity_id: str) -> List[Dict[str, Any]]:
        """
        Get all entities linked to this entity
        
        Args:
            entity_id: Entity identifier
            
        Returns:
            List[Dict]: Linked entity data
        """
        pass
    
    # ==================== RISK AND COMPLIANCE ====================
    
    @abstractmethod
    async def update_risk_assessment(self, entity_id: str, 
                                   risk_data: Dict[str, Any]) -> bool:
        """
        Update entity risk assessment
        
        Args:
            entity_id: Entity identifier  
            risk_data: Risk assessment data
            
        Returns:
            bool: True if update successful
        """
        pass
    
    @abstractmethod
    async def add_watchlist_match(self, entity_id: str, 
                                match_data: Dict[str, Any]) -> bool:
        """
        Add watchlist match to entity
        
        Args:
            entity_id: Entity identifier
            match_data: Watchlist match information
            
        Returns:
            bool: True if match added successfully
        """
        pass
    
    @abstractmethod
    async def get_high_risk_entities(self, risk_threshold: float = 0.7, 
                                   limit: int = 100) -> List[Dict[str, Any]]:
        """
        Get entities with high risk scores
        
        Args:
            risk_threshold: Minimum risk score threshold
            limit: Maximum number of results
            
        Returns:
            List[Dict]: High-risk entities
        """
        pass
    
    # ==================== EMBEDDING AND AI OPERATIONS ====================
    
    @abstractmethod
    async def update_embedding(self, entity_id: str, embedding: List[float]) -> bool:
        """
        Update entity embedding vector for semantic search
        
        Args:
            entity_id: Entity identifier
            embedding: Vector embedding
            
        Returns:
            bool: True if update successful
        """
        pass
    
    @abstractmethod
    async def count_entities_with_embeddings(self) -> int:
        """
        Count entities that have embedding vectors
        
        Returns:
            int: Number of entities with embeddings
        """
        pass
    
    @abstractmethod
    async def get_entities_without_embeddings(self, limit: int = 100) -> List[Dict[str, Any]]:
        """
        Get entities that need embedding generation
        
        Args:
            limit: Maximum number of results
            
        Returns:
            List[Dict]: Entities without embeddings
        """
        pass
    
    # ==================== STATISTICS AND ANALYTICS ====================
    
    @abstractmethod
    async def get_entity_stats(self) -> Dict[str, Any]:
        """
        Get entity collection statistics
        
        Returns:
            Dict: Statistics including counts by type, status, risk level
        """
        pass
    
    @abstractmethod
    async def get_recent_entities(self, days: int = 7, limit: int = 50) -> List[Dict[str, Any]]:
        """
        Get recently created entities
        
        Args:
            days: Number of days to look back
            limit: Maximum number of results
            
        Returns:
            List[Dict]: Recent entities
        """
        pass
    
    @abstractmethod
    async def count_by_criteria(self, criteria: Dict[str, Any]) -> int:
        """
        Count entities matching criteria
        
        Args:
            criteria: Search criteria
            
        Returns:
            int: Count of matching entities
        """
        pass
    
    # ==================== BULK OPERATIONS ====================
    
    @abstractmethod
    async def bulk_create(self, entities_data: List[Dict[str, Any]]) -> List[str]:
        """
        Create multiple entities in bulk
        
        Args:
            entities_data: List of entity data dictionaries
            
        Returns:
            List[str]: List of created entity IDs
        """
        pass
    
    @abstractmethod
    async def bulk_update(self, updates: List[Dict[str, Any]]) -> Dict[str, int]:
        """
        Update multiple entities in bulk
        
        Args:
            updates: List of update operations
            
        Returns:
            Dict[str, int]: Results summary (updated_count, failed_count)
        """
        pass
    
    # ==================== DATA INTEGRITY ====================
    
    @abstractmethod
    async def validate_entity_integrity(self, entity_id: str) -> Dict[str, Any]:
        """
        Validate entity data integrity
        
        Args:
            entity_id: Entity identifier
            
        Returns:
            Dict: Validation results and any issues found
        """
        pass
    
    @abstractmethod
    async def cleanup_orphaned_data(self) -> Dict[str, int]:
        """
        Clean up orphaned entity data
        
        Returns:
            Dict[str, int]: Cleanup results (removed_count, etc.)
        """
        pass