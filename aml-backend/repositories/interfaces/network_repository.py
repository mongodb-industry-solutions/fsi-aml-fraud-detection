"""
Network Repository Interface - Clean contract for network and graph operations

Defines the interface for network analysis and graph operations based on
analysis of current network_service.py usage patterns.
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
    """Interface for network repository operations"""
    
    # ==================== CORE NETWORK OPERATIONS ====================
    
    @abstractmethod
    async def build_entity_network(self, params: NetworkQueryParams) -> NetworkDataResponse:
        """
        Build entity network around a center entity
        
        Args:
            params: Network query parameters
            
        Returns:
            NetworkDataResponse: Complete network data
        """
        pass
    
    @abstractmethod
    async def get_entity_connections(self, entity_id: str,
                                   max_depth: int = 1,
                                   relationship_types: Optional[List[RelationshipType]] = None,
                                   min_confidence: Optional[float] = None) -> List[Dict[str, Any]]:
        """
        Get direct connections for an entity
        
        Args:
            entity_id: Entity identifier
            max_depth: Maximum relationship depth
            relationship_types: Filter by relationship types
            min_confidence: Minimum confidence threshold
            
        Returns:
            List[Dict]: Connected entities with relationship info
        """
        pass
    
    @abstractmethod
    async def find_relationship_path(self, source_entity_id: str,
                                   target_entity_id: str,
                                   max_depth: int = 6,
                                   relationship_types: Optional[List[RelationshipType]] = None) -> Optional[List[Dict[str, Any]]]:
        """
        Find path between two entities through relationships
        
        Args:
            source_entity_id: Starting entity ID
            target_entity_id: Target entity ID
            max_depth: Maximum path length
            relationship_types: Allowed relationship types
            
        Returns:
            Optional[List[Dict]]: Path of relationships or None
        """
        pass
    
    # ==================== GRAPH TRAVERSAL OPERATIONS ====================
    
    @abstractmethod
    async def graph_lookup_relationships(self, entity_id: str,
                                       max_depth: int = 3,
                                       follow_types: Optional[List[RelationshipType]] = None) -> GraphTraversalResult:
        """
        Perform graph lookup using MongoDB $graphLookup
        
        Args:
            entity_id: Starting entity ID
            max_depth: Maximum traversal depth
            follow_types: Relationship types to follow
            
        Returns:
            GraphTraversalResult: Traversal results
        """
        pass
    
    @abstractmethod
    async def traverse_network_bfs(self, entity_id: str,
                                 max_depth: int = 3,
                                 relationship_types: Optional[List[RelationshipType]] = None,
                                 visit_function: Optional[callable] = None) -> GraphTraversalResult:
        """
        Traverse network using breadth-first search
        
        Args:
            entity_id: Starting entity ID
            max_depth: Maximum traversal depth
            relationship_types: Relationship types to follow
            visit_function: Optional function to call for each visited entity
            
        Returns:
            GraphTraversalResult: Traversal results
        """
        pass
    
    @abstractmethod
    async def traverse_network_dfs(self, entity_id: str,
                                 max_depth: int = 3,
                                 relationship_types: Optional[List[RelationshipType]] = None,
                                 visit_function: Optional[callable] = None) -> GraphTraversalResult:
        """
        Traverse network using depth-first search
        
        Args:
            entity_id: Starting entity ID
            max_depth: Maximum traversal depth
            relationship_types: Relationship types to follow
            visit_function: Optional function to call for each visited entity
            
        Returns:
            GraphTraversalResult: Traversal results
        """
        pass
    
    # ==================== NETWORK ANALYSIS ====================
    
    @abstractmethod
    async def calculate_centrality_metrics(self, entity_ids: List[str]) -> Dict[str, Dict[str, float]]:
        """
        Calculate centrality metrics for entities
        
        Args:
            entity_ids: List of entity IDs to analyze
            
        Returns:
            Dict: Centrality metrics by entity ID
        """
        pass
    
    @abstractmethod
    async def detect_communities(self, entity_ids: List[str],
                               min_community_size: int = 3,
                               resolution: float = 1.0) -> List[List[str]]:
        """
        Detect communities within entity network
        
        Args:
            entity_ids: List of entity IDs to analyze
            min_community_size: Minimum entities per community
            resolution: Community detection resolution parameter
            
        Returns:
            List[List[str]]: Communities of entity IDs
        """
        pass
    
    @abstractmethod
    async def find_network_bridges(self, entity_ids: List[str]) -> List[str]:
        """
        Find bridge entities that connect different network components
        
        Args:
            entity_ids: List of entity IDs to analyze
            
        Returns:
            List[str]: Bridge entity IDs
        """
        pass
    
    @abstractmethod
    async def analyze_network_density(self, entity_ids: List[str]) -> Dict[str, float]:
        """
        Analyze network density and connectivity
        
        Args:
            entity_ids: List of entity IDs to analyze
            
        Returns:
            Dict: Network density metrics
        """
        pass
    
    # ==================== RISK PROPAGATION ====================
    
    @abstractmethod
    async def propagate_risk_scores(self, source_entity_id: str,
                                  max_depth: int = 3,
                                  propagation_factor: float = 0.5,
                                  min_propagated_score: float = 0.1) -> Dict[str, float]:
        """
        Propagate risk scores through network relationships
        
        Args:
            source_entity_id: Entity with initial risk score
            max_depth: Maximum propagation depth
            propagation_factor: Risk reduction factor per hop
            min_propagated_score: Minimum score to propagate
            
        Returns:
            Dict[str, float]: Propagated risk scores by entity ID
        """
        pass
    
    @abstractmethod
    async def find_risk_transmission_paths(self, high_risk_entity_id: str,
                                         target_entities: List[str],
                                         max_depth: int = 4) -> Dict[str, List[List[str]]]:
        """
        Find paths through which risk could be transmitted
        
        Args:
            high_risk_entity_id: High-risk source entity
            target_entities: Target entities to check paths to
            max_depth: Maximum path length
            
        Returns:
            Dict: Risk transmission paths by target entity
        """
        pass
    
    @abstractmethod
    async def calculate_network_risk_score(self, entity_id: str,
                                         analysis_depth: int = 2) -> Dict[str, Any]:
        """
        Calculate overall network risk score for an entity
        
        Args:
            entity_id: Entity to analyze
            analysis_depth: Depth of network analysis
            
        Returns:
            Dict: Network risk analysis results
        """
        pass
    
    # ==================== PATTERN DETECTION ====================
    
    @abstractmethod
    async def detect_circular_relationships(self, entity_id: str,
                                          max_cycle_length: int = 6) -> List[List[str]]:
        """
        Detect circular relationship patterns
        
        Args:
            entity_id: Starting entity for cycle detection
            max_cycle_length: Maximum cycle length to detect
            
        Returns:
            List[List[str]]: Detected cycles as entity ID sequences
        """
        pass
    
    @abstractmethod
    async def find_suspicious_patterns(self, entity_ids: List[str],
                                     pattern_types: List[str]) -> Dict[str, List[Dict[str, Any]]]:
        """
        Find suspicious network patterns
        
        Args:
            entity_ids: Entities to analyze for patterns
            pattern_types: Types of patterns to detect
            
        Returns:
            Dict: Detected patterns by type
        """
        pass
    
    @abstractmethod
    async def detect_hub_entities(self, min_connections: int = 10,
                                connection_types: Optional[List[RelationshipType]] = None) -> List[Dict[str, Any]]:
        """
        Detect hub entities with many connections
        
        Args:
            min_connections: Minimum connections to be considered a hub
            connection_types: Types of connections to count
            
        Returns:
            List[Dict]: Hub entities with connection counts
        """
        pass
    
    # ==================== NETWORK VISUALIZATION SUPPORT ====================
    
    @abstractmethod
    async def prepare_network_for_visualization(self, params: NetworkQueryParams,
                                              layout_algorithm: str = "force") -> Dict[str, Any]:
        """
        Prepare network data optimized for visualization
        
        Args:
            params: Network query parameters
            layout_algorithm: Preferred layout algorithm
            
        Returns:
            Dict: Visualization-ready network data
        """
        pass
    
    @abstractmethod
    async def calculate_node_positions(self, nodes: List[NetworkNode],
                                     edges: List[NetworkEdge],
                                     algorithm: str = "force") -> Dict[str, Tuple[float, float]]:
        """
        Calculate optimal positions for network nodes
        
        Args:
            nodes: Network nodes
            edges: Network edges
            algorithm: Layout algorithm to use
            
        Returns:
            Dict: Node positions as (x, y) coordinates
        """
        pass
    
    @abstractmethod
    async def optimize_network_for_display(self, network_data: Dict[str, Any],
                                         max_display_nodes: int = 50) -> Dict[str, Any]:
        """
        Optimize network data for display by reducing complexity
        
        Args:
            network_data: Original network data
            max_display_nodes: Maximum nodes to display
            
        Returns:
            Dict: Optimized network data
        """
        pass
    
    # ==================== RELATIONSHIP ANALYSIS ====================
    
    @abstractmethod
    async def analyze_relationship_strength(self, entity_id: str,
                                          relationship_types: Optional[List[RelationshipType]] = None) -> Dict[str, Any]:
        """
        Analyze strength of relationships for an entity
        
        Args:
            entity_id: Entity to analyze
            relationship_types: Types of relationships to include
            
        Returns:
            Dict: Relationship strength analysis
        """
        pass
    
    @abstractmethod
    async def find_weak_links(self, entity_ids: List[str],
                            confidence_threshold: float = 0.3) -> List[Dict[str, Any]]:
        """
        Find weak links in entity network
        
        Args:
            entity_ids: Entities to analyze
            confidence_threshold: Threshold for weak links
            
        Returns:
            List[Dict]: Weak relationship links
        """
        pass
    
    @abstractmethod
    async def deduplicate_relationships(self, relationships: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Remove duplicate relationships from network data
        
        Args:
            relationships: List of relationship data
            
        Returns:
            List[Dict]: Deduplicated relationships
        """
        pass
    
    # ==================== NETWORK STATISTICS ====================
    
    @abstractmethod
    async def get_network_statistics(self, entity_id: str,
                                   max_depth: int = 2) -> Dict[str, Any]:
        """
        Get comprehensive network statistics for an entity
        
        Args:
            entity_id: Entity to analyze
            max_depth: Analysis depth
            
        Returns:
            Dict: Network statistics
        """
        pass
    
    @abstractmethod
    async def calculate_separation_degrees(self, entity1_id: str,
                                         entity2_id: str) -> Optional[int]:
        """
        Calculate degrees of separation between two entities
        
        Args:
            entity1_id: First entity ID
            entity2_id: Second entity ID
            
        Returns:
            Optional[int]: Degrees of separation or None if not connected
        """
        pass
    
    @abstractmethod
    async def get_network_growth_metrics(self, entity_id: str,
                                       time_periods: List[str]) -> Dict[str, Dict[str, int]]:
        """
        Get network growth metrics over time
        
        Args:
            entity_id: Entity to analyze
            time_periods: Time periods for analysis
            
        Returns:
            Dict: Network growth metrics by time period
        """
        pass
    
    # ==================== BULK NETWORK OPERATIONS ====================
    
    @abstractmethod
    async def bulk_analyze_networks(self, entity_ids: List[str],
                                  analysis_types: List[str]) -> Dict[str, Dict[str, Any]]:
        """
        Perform bulk network analysis for multiple entities
        
        Args:
            entity_ids: List of entity IDs to analyze
            analysis_types: Types of analysis to perform
            
        Returns:
            Dict: Analysis results by entity ID
        """
        pass
    
    @abstractmethod
    async def compare_networks(self, entity_ids: List[str]) -> Dict[str, Any]:
        """
        Compare networks of multiple entities
        
        Args:
            entity_ids: Entity IDs to compare
            
        Returns:
            Dict: Network comparison results
        """
        pass