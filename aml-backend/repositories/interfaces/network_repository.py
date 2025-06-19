"""
Network Repository Interface - Streamlined contract for only used methods

Defines the interface for network analysis and graph operations containing only
the methods that are actually used in the application.
"""

from abc import ABC, abstractmethod
from typing import Dict, List, Optional, Any, Set, Tuple
from dataclasses import dataclass

from models.core.network import (
    EntityNetwork, NetworkNode, NetworkEdge, 
    RelationshipType, NetworkRiskLevel
)


@dataclass
class NetworkQueryParams:
    """Parameters for network queries"""
    center_entity_id: str
    max_depth: int = 2
    relationship_types: Optional[List[RelationshipType]] = None
    min_confidence: float = 0.3
    only_verified: bool = False
    only_active: bool = True  # New field for active relationships
    include_entity_types: Optional[List[str]] = None
    exclude_entity_types: Optional[List[str]] = None
    max_entities: int = 100
    max_relationships: int = 200


@dataclass
class NetworkDataResponse:
    """Response structure for network data"""
    nodes: List[NetworkNode]
    edges: List[NetworkEdge]
    center_entity_id: str
    total_entities: int
    total_relationships: int
    max_depth_reached: int
    query_time_ms: float


@dataclass
class GraphTraversalResult:
    """Result of graph traversal operation"""
    visited_entities: Set[str]
    relationship_paths: List[List[str]]
    depth_reached: int
    total_traversed: int


class NetworkRepositoryInterface(ABC):
    """Streamlined interface for network repository operations containing only used methods"""
    
    # ==================== CORE NETWORK OPERATIONS ====================
    
    @abstractmethod
    async def build_entity_network(self, params: NetworkQueryParams) -> NetworkDataResponse:
        """Build entity network around a center entity"""
        pass
    
    @abstractmethod
    async def get_entity_connections(self, entity_id: str,
                                   max_depth: int = 1,
                                   relationship_types: Optional[List[RelationshipType]] = None,
                                   min_confidence: Optional[float] = None) -> List[Dict[str, Any]]:
        """Get direct connections for an entity"""
        pass
    
    @abstractmethod
    async def find_relationship_path(self, source_entity_id: str,
                                   target_entity_id: str,
                                   max_depth: int = 6,
                                   relationship_types: Optional[List[RelationshipType]] = None) -> Optional[List[Dict[str, Any]]]:
        """Find path between two entities through relationships"""
        pass
    
    # ==================== NETWORK ANALYSIS ====================
    
    @abstractmethod
    async def calculate_centrality_metrics(self, entity_ids: List[str],
                                         max_depth: int = 2,
                                         include_advanced: bool = True) -> Dict[str, Dict[str, float]]:
        """Calculate centrality metrics for entities"""
        pass
    
    @abstractmethod
    async def detect_hub_entities(self, min_connections: int = 5,
                                connection_types: Optional[List[RelationshipType]] = None,
                                include_risk_analysis: bool = True) -> List[Dict[str, Any]]:
        """Detect hub entities with many connections"""
        pass
    
    # ==================== RISK PROPAGATION ====================
    
    @abstractmethod
    async def propagate_risk_scores(self, source_entity_id: str,
                                  max_depth: int = 3,
                                  propagation_factor: float = 0.5,
                                  min_propagated_score: float = 0.1,
                                  relationship_types: Optional[List[RelationshipType]] = None) -> Dict[str, float]:
        """Propagate risk scores through network relationships"""
        pass
    
    @abstractmethod
    async def calculate_network_risk_score(self, entity_id: str,
                                         analysis_depth: int = 2) -> Dict[str, Any]:
        """Calculate overall network risk score for an entity"""
        pass
    
    # ==================== SIMPLIFIED METHODS USED BY SERVICES ====================
    
    @abstractmethod
    async def find_network_bridges(self, entity_ids: List[str]) -> List[str]:
        """Find bridge entities in network"""
        pass
    
    @abstractmethod
    async def detect_communities(self, entity_ids: List[str],
                               min_community_size: int = 3,
                               resolution: float = 1.0) -> List[List[str]]:
        """Detect communities within entity network"""
        pass
    
    @abstractmethod
    async def prepare_network_for_visualization(self, params: NetworkQueryParams,
                                              layout_algorithm: str = "force") -> Dict[str, Any]:
        """Prepare network data optimized for visualization"""
        pass
    
    @abstractmethod
    async def calculate_node_positions(self, nodes: List[NetworkNode],
                                     edges: List[NetworkEdge],
                                     algorithm: str = "force") -> Dict[str, Tuple[float, float]]:
        """Calculate optimal positions for network nodes"""
        pass