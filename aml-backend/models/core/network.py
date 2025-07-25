"""
Network and Relationship Models - Clean graph relationship models

Models for entity relationships, network analysis, and graph operations.
Simplified and focused on essential network functionality.
"""

from datetime import datetime
from enum import Enum
from typing import Dict, List, Optional, Any, Set
from pydantic import BaseModel, Field, validator


# ==================== ENUMS ====================

class RelationshipType(str, Enum):
    """Types of relationships between entities based on relationships collection data"""
    
    # Entity Resolution Links (High Priority for AML/KYC)
    SAME_ENTITY = "confirmed_same_entity"  # Alias for backward compatibility
    CONFIRMED_SAME_ENTITY = "confirmed_same_entity"
    POTENTIAL_DUPLICATE = "potential_duplicate"
    
    # Corporate Structure Links
    DIRECTOR_OF = "director_of"
    UBO_OF = "ubo_of"  # Ultimate Beneficial Owner
    PARENT_OF_SUBSIDIARY = "parent_of_subsidiary"
    SHAREHOLDER_OF = "shareholder_of"
    
    # Household Links
    HOUSEHOLD_MEMBER = "household_member"
    
    # High-Risk Network Links (Critical for AML monitoring)
    BUSINESS_ASSOCIATE_SUSPECTED = "business_associate_suspected"
    POTENTIAL_BENEFICIAL_OWNER_OF = "potential_beneficial_owner_of"
    TRANSACTIONAL_COUNTERPARTY_HIGH_RISK = "transactional_counterparty_high_risk"
    
    # Generic & Historical Links
    PROFESSIONAL_COLLEAGUE_PUBLIC = "professional_colleague_public"
    SOCIAL_MEDIA_CONNECTION_PUBLIC = "social_media_connection_public"
    
    # Legacy/Backward Compatibility Types (needed by NetworkAnalysisService)
    BUSINESS_ASSOCIATE = "business_associate"
    FAMILY_MEMBER = "family_member"
    SHARED_ADDRESS = "shared_address"
    SHARED_IDENTIFIER = "shared_identifier"
    TRANSACTION_COUNTERPARTY = "transaction_counterparty"
    CORPORATE_STRUCTURE = "corporate_structure"
    
    # Fallback
    UNKNOWN = "unknown"


class RelationshipStrength(str, Enum):
    """Strength/confidence of relationship"""
    CONFIRMED = "confirmed"
    LIKELY = "likely"
    POSSIBLE = "possible"
    SUSPECTED = "suspected"


class NetworkRiskLevel(str, Enum):
    """Risk level for network analysis"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


# ==================== CORE RELATIONSHIP MODELS ====================

class EntityRelationship(BaseModel):
    """Relationship between two entities"""
    
    # Core relationship data
    source_entity_id: str
    target_entity_id: str
    relationship_type: RelationshipType
    
    # Relationship metadata
    strength: RelationshipStrength = RelationshipStrength.POSSIBLE
    confidence_score: float = Field(0.5, ge=0, le=1)
    
    # Descriptive information
    description: Optional[str] = None
    evidence: List[str] = Field(default_factory=list)
    
    # Directional information
    is_bidirectional: bool = False
    
    # Source and validation
    data_source: Optional[str] = None
    verified: bool = False
    verified_by: Optional[str] = None
    verified_date: Optional[datetime] = None
    
    # System metadata
    created_date: datetime = Field(default_factory=datetime.utcnow)
    updated_date: Optional[datetime] = None
    created_by: Optional[str] = None
    
    # Additional attributes
    attributes: Dict[str, Any] = Field(default_factory=dict)
    
    @validator('confidence_score')
    def validate_confidence_score(cls, v, values):
        """Adjust confidence based on strength"""
        strength = values.get('strength')
        if strength == RelationshipStrength.CONFIRMED and v < 0.8:
            return 0.9
        elif strength == RelationshipStrength.LIKELY and v < 0.6:
            return 0.7
        elif strength == RelationshipStrength.POSSIBLE and v < 0.4:
            return 0.5
        elif strength == RelationshipStrength.SUSPECTED and v > 0.4:
            return 0.3
        return v
    
    @property
    def risk_indicator(self) -> bool:
        """Check if this relationship type indicates potential AML/KYC risk"""
        risk_types = {
            # High-risk relationship types for AML compliance
            RelationshipType.BUSINESS_ASSOCIATE_SUSPECTED,
            RelationshipType.POTENTIAL_BENEFICIAL_OWNER_OF,
            RelationshipType.TRANSACTIONAL_COUNTERPARTY_HIGH_RISK,
            RelationshipType.POTENTIAL_DUPLICATE,
            RelationshipType.SAME_ENTITY,
            RelationshipType.UBO_OF,
            RelationshipType.BENEFICIAL_OWNER,
            RelationshipType.SHARED_IDENTIFIER
        }
        return self.relationship_type in risk_types
    
    def add_evidence(self, evidence_text: str) -> None:
        """Add evidence supporting this relationship"""
        if evidence_text and evidence_text not in self.evidence:
            self.evidence.append(evidence_text)
            self.updated_date = datetime.utcnow()


# ==================== NETWORK ANALYSIS MODELS ====================

class NetworkNode(BaseModel):
    """Node in entity network for visualization and analysis"""
    
    entity_id: str
    entity_name: str
    entity_type: str
    
    # Risk information
    risk_level: NetworkRiskLevel = NetworkRiskLevel.LOW
    risk_score: float = Field(0.0, ge=0, le=1)
    
    # Network position metrics
    centrality_score: Optional[float] = Field(None, ge=0, le=1)
    connection_count: int = 0
    
    # Visual properties for network display
    size: Optional[int] = None
    color: Optional[str] = None
    
    # Additional node attributes
    attributes: Dict[str, Any] = Field(default_factory=dict)


class NetworkEdge(BaseModel):
    """Edge in entity network representing relationship"""
    
    source_id: str
    target_id: str
    relationship_type: str  # Changed to str to store original type directly
    
    # Edge properties
    strength: RelationshipStrength
    confidence: float = Field(..., ge=0, le=1)
    weight: float = Field(1.0, ge=0)
    
    # Visual properties
    color: Optional[str] = None
    thickness: Optional[int] = None
    
    # Edge metadata
    verified: bool = False
    evidence_count: int = 0
    direction: Optional[str] = "directed"  # "directed", "bidirectional", "undirected"


class EntityNetwork(BaseModel):
    """Complete network representation"""
    
    # Network components
    nodes: List[NetworkNode] = Field(default_factory=list)
    edges: List[NetworkEdge] = Field(default_factory=list)
    
    # Network metadata
    center_entity_id: Optional[str] = None
    max_depth: int = 2
    total_entities: int = 0
    total_relationships: int = 0
    
    # Risk analysis
    high_risk_entities: List[str] = Field(default_factory=list)
    suspicious_patterns: List[str] = Field(default_factory=list)
    
    # Generation metadata
    generated_date: datetime = Field(default_factory=datetime.utcnow)
    generation_time_ms: float = 0
    
    @property
    def entity_ids(self) -> Set[str]:
        """Get all entity IDs in network"""
        return {node.entity_id for node in self.nodes}
    
    @property
    def has_high_risk_entities(self) -> bool:
        """Check if network contains high-risk entities"""
        return bool(self.high_risk_entities)
    
    def get_node(self, entity_id: str) -> Optional[NetworkNode]:
        """Get node by entity ID"""
        for node in self.nodes:
            if node.entity_id == entity_id:
                return node
        return None
    
    def get_connections(self, entity_id: str) -> List[NetworkEdge]:
        """Get all edges connected to an entity"""
        return [
            edge for edge in self.edges
            if edge.source_id == entity_id or edge.target_id == entity_id
        ]


# ==================== NETWORK ANALYSIS RESULTS ====================

class CentralityAnalysis(BaseModel):
    """Centrality analysis results for network"""
    
    # Centrality scores by entity
    degree_centrality: Dict[str, float] = Field(default_factory=dict)
    betweenness_centrality: Dict[str, float] = Field(default_factory=dict)
    closeness_centrality: Dict[str, float] = Field(default_factory=dict)
    
    # Key entities
    most_central_entities: List[str] = Field(default_factory=list)
    bridge_entities: List[str] = Field(default_factory=list)
    
    # Analysis metadata
    analysis_date: datetime = Field(default_factory=datetime.utcnow)
    network_size: int = 0


class CommunityDetection(BaseModel):
    """Community detection results"""
    
    # Communities found
    communities: List[List[str]] = Field(default_factory=list)
    
    # Community metadata
    community_count: int = 0
    largest_community_size: int = 0
    modularity_score: Optional[float] = None
    
    # Inter-community connections
    bridge_relationships: List[EntityRelationship] = Field(default_factory=list)
    
    @property
    def has_isolated_communities(self) -> bool:
        """Check if there are isolated communities"""
        return len(self.communities) > 1 and not self.bridge_relationships


class RiskPropagation(BaseModel):
    """Risk propagation analysis through network"""
    
    # Risk scores after propagation
    propagated_scores: Dict[str, float] = Field(default_factory=dict)
    
    # Risk paths
    high_risk_paths: List[List[str]] = Field(default_factory=list)
    risk_transmission_routes: Dict[str, List[str]] = Field(default_factory=dict)
    
    # Analysis parameters
    propagation_factor: float = Field(0.5, ge=0, le=1)
    max_hops: int = 3
    
    # Results metadata
    entities_affected: int = 0
    risk_increased_count: int = 0


# ==================== SEARCH AND DISCOVERY MODELS ====================

class NetworkSearchCriteria(BaseModel):
    """Criteria for network search and discovery"""
    
    # Starting point
    center_entity_id: str
    max_depth: int = Field(2, ge=1, le=5)
    
    # Relationship filters
    relationship_types: List[RelationshipType] = Field(default_factory=list)
    min_confidence: float = Field(0.3, ge=0, le=1)
    only_verified: bool = False
    
    # Entity filters
    include_entity_types: List[str] = Field(default_factory=list)
    exclude_entity_types: List[str] = Field(default_factory=list)
    min_risk_level: Optional[NetworkRiskLevel] = None
    
    # Size limits
    max_entities: int = Field(100, ge=10, le=1000)
    max_relationships: int = Field(200, ge=20, le=2000)


class NetworkDiscoveryResult(BaseModel):
    """Result of network discovery operation"""
    
    network: EntityNetwork
    search_criteria: NetworkSearchCriteria
    
    # Discovery statistics
    entities_discovered: int = 0
    relationships_discovered: int = 0
    depth_reached: int = 0
    
    # Analysis insights
    centrality_analysis: Optional[CentralityAnalysis] = None
    community_detection: Optional[CommunityDetection] = None
    risk_propagation: Optional[RiskPropagation] = None
    
    # Processing metadata
    discovery_time_ms: float = 0
    analysis_time_ms: float = 0
    total_time_ms: float = 0


# ==================== RELATIONSHIP MANAGEMENT ====================

class RelationshipCreationRequest(BaseModel):
    """Request to create new relationship"""
    
    source_entity_id: str
    target_entity_id: str
    relationship_type: RelationshipType
    
    strength: RelationshipStrength = RelationshipStrength.POSSIBLE
    description: Optional[str] = None
    evidence: List[str] = Field(default_factory=list)
    data_source: Optional[str] = None
    
    # Creator information
    created_by: Optional[str] = None
    requires_verification: bool = True


class RelationshipUpdateRequest(BaseModel):
    """Request to update existing relationship"""
    
    relationship_id: str
    
    # Updatable fields
    relationship_type: Optional[RelationshipType] = None
    strength: Optional[RelationshipStrength] = None
    description: Optional[str] = None
    evidence: Optional[List[str]] = None
    
    # Verification
    verified: Optional[bool] = None
    verified_by: Optional[str] = None
    
    # Update metadata
    updated_by: Optional[str] = None
    update_reason: Optional[str] = None


class BulkRelationshipOperation(BaseModel):
    """Bulk operation on relationships"""
    
    operation: str = Field(..., pattern="^(create|update|delete|verify)$")
    relationships: List[Dict[str, Any]]
    
    # Operation metadata
    batch_id: Optional[str] = None
    performed_by: Optional[str] = None
    reason: Optional[str] = None
    
    # Processing options
    skip_validation: bool = False
    continue_on_error: bool = True


# ==================== VISUALIZATION MODELS ====================

class NetworkVisualizationConfig(BaseModel):
    """Configuration for network visualization"""
    
    # Layout settings
    layout_algorithm: str = Field("force", pattern="^(force|hierarchical|circular|grid)$")
    node_size_factor: float = Field(1.0, ge=0.5, le=3.0)
    edge_thickness_factor: float = Field(1.0, ge=0.5, le=3.0)
    
    # Color schemes
    risk_color_scheme: Dict[str, str] = Field(default_factory=lambda: {
        "low": "#28a745",
        "medium": "#ffc107", 
        "high": "#fd7e14",
        "critical": "#dc3545"
    })
    
    relationship_color_scheme: Dict[str, str] = Field(default_factory=lambda: {
        "confirmed": "#007bff",
        "likely": "#17a2b8",
        "possible": "#6c757d",
        "suspected": "#dc3545"
    })
    
    # Display options
    show_entity_labels: bool = True
    show_relationship_labels: bool = False
    show_risk_indicators: bool = True
    show_confidence_scores: bool = False
    
    # Filtering
    min_confidence_display: float = Field(0.3, ge=0, le=1)
    max_entities_display: int = Field(50, ge=10, le=200)


# ==================== RELATIONSHIP UTILITIES ====================

def get_relationship_risk_weight(rel_type: RelationshipType) -> float:
    """Get risk weight for different relationship types based on AML significance"""
    risk_weights = {
        # Entity Resolution (Highest risk - potential identity fraud)
        RelationshipType.CONFIRMED_SAME_ENTITY: 1.0,
        RelationshipType.POTENTIAL_DUPLICATE: 0.9,
        
        # Corporate Structure (High risk - beneficial ownership concealment)
        RelationshipType.UBO_OF: 0.8,
        RelationshipType.DIRECTOR_OF: 0.7,
        RelationshipType.PARENT_OF_SUBSIDIARY: 0.7,
        RelationshipType.SHAREHOLDER_OF: 0.6,
        
        # High-Risk Network (High risk - suspicious associations)
        RelationshipType.POTENTIAL_BENEFICIAL_OWNER_OF: 0.8,
        RelationshipType.TRANSACTIONAL_COUNTERPARTY_HIGH_RISK: 0.9,
        RelationshipType.BUSINESS_ASSOCIATE_SUSPECTED: 0.6,
        
        # Household (Medium risk - related party transactions)
        RelationshipType.HOUSEHOLD_MEMBER: 0.5,
        
        # Generic/Historical (Lower risk - public information)
        RelationshipType.PROFESSIONAL_COLLEAGUE_PUBLIC: 0.3,
        RelationshipType.SOCIAL_MEDIA_CONNECTION_PUBLIC: 0.2,
        
        # Fallback
        RelationshipType.UNKNOWN: 0.4,
    }
    return risk_weights.get(rel_type, 0.4)


def get_relationship_color_category(rel_type: RelationshipType) -> str:
    """Get color category for relationship visualization"""
    color_categories = {
        # Entity Resolution - Green spectrum (identity verification)
        RelationshipType.CONFIRMED_SAME_ENTITY: "identity_confirmed",
        RelationshipType.POTENTIAL_DUPLICATE: "identity_suspected",
        
        # Corporate Structure - Blue spectrum (ownership structure)
        RelationshipType.DIRECTOR_OF: "corporate_control",
        RelationshipType.UBO_OF: "corporate_control", 
        RelationshipType.PARENT_OF_SUBSIDIARY: "corporate_hierarchy",
        RelationshipType.SHAREHOLDER_OF: "corporate_ownership",
        
        # High-Risk Network - Red spectrum (high-risk associations)
        RelationshipType.POTENTIAL_BENEFICIAL_OWNER_OF: "high_risk",
        RelationshipType.TRANSACTIONAL_COUNTERPARTY_HIGH_RISK: "high_risk",
        RelationshipType.BUSINESS_ASSOCIATE_SUSPECTED: "medium_risk",
        
        # Household - Purple (family/residential)
        RelationshipType.HOUSEHOLD_MEMBER: "household",
        
        # Generic/Historical - Gray spectrum (low priority)
        RelationshipType.PROFESSIONAL_COLLEAGUE_PUBLIC: "public_record",
        RelationshipType.SOCIAL_MEDIA_CONNECTION_PUBLIC: "public_record",
        
        # Fallback
        RelationshipType.UNKNOWN: "unknown",
    }
    return color_categories.get(rel_type, "unknown")


# ==================== ALIASES FOR COMPATIBILITY ====================

# Alias for common imports
Relationship = EntityRelationship