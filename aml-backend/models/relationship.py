"""
Pydantic models for entity relationships and relationship management
"""

from typing import List, Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field
from bson import ObjectId
from enum import Enum

class RelationshipType(str, Enum):
    """Types of relationships between entities"""
    CONFIRMED_SAME_ENTITY = "confirmed_same_entity"
    POTENTIAL_DUPLICATE = "potential_duplicate"
    BUSINESS_ASSOCIATE = "business_associate"
    FAMILY_MEMBER = "family_member"
    SHARED_ADDRESS = "shared_address"
    SHARED_IDENTIFIER = "shared_identifier"
    TRANSACTION_COUNTERPARTY = "transaction_counterparty"
    CORPORATE_STRUCTURE = "corporate_structure"

class RelationshipDirection(str, Enum):
    """Relationship direction options"""
    BIDIRECTIONAL = "bidirectional"
    SOURCE_TO_TARGET = "source_to_target"
    TARGET_TO_SOURCE = "target_to_source"

class RelationshipStatus(str, Enum):
    """Relationship status options"""
    ACTIVE = "active"
    DISMISSED = "dismissed"
    PENDING_REVIEW = "pending_review"
    ARCHIVED = "archived"

class EntityReference(BaseModel):
    """Reference to an entity in a relationship"""
    entityId: str = Field(..., description="Entity identifier")
    entityType: str = Field(..., description="Type of entity (individual, organization)")
    entityName: Optional[str] = Field(None, description="Display name of the entity")

class RelationshipEvidence(BaseModel):
    """Evidence supporting a relationship between entities"""
    matchedAttributes: List[str] = Field(default_factory=list, description="Attributes that match between entities")
    searchScore: Optional[float] = Field(None, ge=0.0, le=1.0, description="Atlas Search score")
    manualConfidence: Optional[float] = Field(None, ge=0.0, le=1.0, description="Manual confidence assessment")
    similarities: Optional[Dict[str, float]] = Field(default_factory=dict, description="Similarity scores for specific attributes")
    differences: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Key differences between entities")
    additionalData: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Additional supporting data")

class Relationship(BaseModel):
    """Model for relationships between entities"""
    id: Optional[str] = Field(None, alias="_id", description="MongoDB ObjectId as string")
    source: EntityReference = Field(..., description="Source entity")
    target: EntityReference = Field(..., description="Target entity")
    type: RelationshipType = Field(..., description="Type of relationship")
    direction: RelationshipDirection = Field(default=RelationshipDirection.BIDIRECTIONAL)
    strength: float = Field(..., ge=0.0, le=1.0, description="Relationship strength/confidence")
    evidence: RelationshipEvidence = Field(default_factory=RelationshipEvidence)
    datasource: str = Field(default="analyst_resolution_workbench", description="Source of the relationship")
    createdAt: datetime = Field(default_factory=datetime.utcnow)
    createdBy: Optional[str] = Field(None, description="User who created the relationship")
    updatedAt: Optional[datetime] = Field(None, description="Last update timestamp")
    updatedBy: Optional[str] = Field(None, description="User who last updated the relationship")
    status: RelationshipStatus = Field(default=RelationshipStatus.ACTIVE)
    notes: Optional[str] = Field(None, description="Additional notes about the relationship")
    
    class Config:
        allow_population_by_field_name = True
        json_encoders = {ObjectId: str}
        schema_extra = {
            "example": {
                "source": {
                    "entityId": "C123456",
                    "entityType": "individual",
                    "entityName": "John Smith"
                },
                "target": {
                    "entityId": "C789012", 
                    "entityType": "individual",
                    "entityName": "Jon Smith"
                },
                "type": "confirmed_same_entity",
                "direction": "bidirectional",
                "strength": 0.95,
                "evidence": {
                    "matchedAttributes": ["name", "address", "date_of_birth"],
                    "searchScore": 0.87,
                    "manualConfidence": 0.95,
                    "similarities": {
                        "name_similarity": 0.89,
                        "address_similarity": 0.95,
                        "dob_exact_match": 1.0
                    }
                },
                "datasource": "analyst_resolution_workbench",
                "status": "active"
            }
        }

class CreateRelationshipRequest(BaseModel):
    """Request model for creating a new relationship"""
    sourceEntityId: str = Field(..., description="Source entity ID")
    targetEntityId: str = Field(..., description="Target entity ID")
    type: RelationshipType = Field(..., description="Type of relationship")
    direction: RelationshipDirection = Field(default=RelationshipDirection.BIDIRECTIONAL)
    strength: float = Field(..., ge=0.0, le=1.0, description="Relationship strength")
    evidence: Optional[RelationshipEvidence] = Field(default_factory=RelationshipEvidence)
    datasource: Optional[str] = Field(default="analyst_resolution_workbench")
    createdBy: Optional[str] = Field(None, description="User creating the relationship")
    notes: Optional[str] = Field(None, description="Additional notes")

class UpdateRelationshipRequest(BaseModel):
    """Request model for updating an existing relationship"""
    type: Optional[RelationshipType] = Field(None, description="Type of relationship")
    direction: Optional[RelationshipDirection] = Field(None)
    strength: Optional[float] = Field(None, ge=0.0, le=1.0, description="Relationship strength")
    evidence: Optional[RelationshipEvidence] = Field(None)
    status: Optional[RelationshipStatus] = Field(None)
    notes: Optional[str] = Field(None, description="Additional notes")
    updatedBy: Optional[str] = Field(None, description="User updating the relationship")

class RelationshipQueryParams(BaseModel):
    """Query parameters for searching relationships"""
    entityId: Optional[str] = Field(None, description="Find relationships for specific entity")
    type: Optional[RelationshipType] = Field(None, description="Filter by relationship type")
    status: Optional[RelationshipStatus] = Field(None, description="Filter by status")
    minStrength: Optional[float] = Field(None, ge=0.0, le=1.0, description="Minimum strength threshold")
    datasource: Optional[str] = Field(None, description="Filter by data source")
    createdBy: Optional[str] = Field(None, description="Filter by creator")
    createdAfter: Optional[datetime] = Field(None, description="Filter by creation date")
    limit: int = Field(default=50, ge=1, le=1000, description="Maximum number of results")
    skip: int = Field(default=0, ge=0, description="Number of results to skip")

class RelationshipListResponse(BaseModel):
    """Response model for relationship listing"""
    relationships: List[Relationship] = Field(..., description="List of relationships")
    totalCount: int = Field(..., description="Total number of relationships matching criteria")
    page: int = Field(..., description="Current page number")
    pageSize: int = Field(..., description="Number of items per page")
    hasMore: bool = Field(..., description="Whether there are more results available")

class RelationshipStats(BaseModel):
    """Statistics about relationships"""
    totalRelationships: int = Field(..., description="Total number of relationships")
    relationshipsByType: Dict[str, int] = Field(..., description="Count by relationship type")
    relationshipsByStatus: Dict[str, int] = Field(..., description="Count by status")
    averageStrength: float = Field(..., description="Average relationship strength")
    highConfidenceCount: int = Field(..., description="Number of high confidence relationships (>0.8)")

class NetworkNode(BaseModel):
    """Node in a relationship network"""
    entityId: str = Field(..., description="Entity identifier")
    entityType: str = Field(..., description="Entity type")
    entityName: Optional[str] = Field(None, description="Entity display name")
    riskScore: Optional[float] = Field(None, description="Entity risk score")
    nodeSize: Optional[float] = Field(None, description="Node size for visualization")
    color: Optional[str] = Field(None, description="Node color based on risk or type")

class NetworkEdge(BaseModel):
    """Edge in a relationship network"""
    source: str = Field(..., description="Source entity ID")
    target: str = Field(..., description="Target entity ID")
    relationshipType: RelationshipType = Field(..., description="Type of relationship")
    strength: float = Field(..., description="Relationship strength")
    width: Optional[float] = Field(None, description="Edge width for visualization")
    color: Optional[str] = Field(None, description="Edge color based on type")

class EntityNetwork(BaseModel):
    """Complete network structure for an entity"""
    centerEntityId: str = Field(..., description="Central entity ID")
    nodes: List[NetworkNode] = Field(..., description="All nodes in the network")
    edges: List[NetworkEdge] = Field(..., description="All edges in the network")
    totalNodes: int = Field(..., description="Total number of nodes")
    totalEdges: int = Field(..., description="Total number of edges")
    maxDepth: int = Field(..., description="Maximum depth from center entity")
    stats: RelationshipStats = Field(..., description="Network statistics")

class RelationshipOperationResponse(BaseModel):
    """Generic response for relationship operations"""
    success: bool = Field(..., description="Whether the operation was successful")
    message: str = Field(..., description="Status message")
    relationshipId: Optional[str] = Field(None, description="ID of the affected relationship")
    affectedEntityIds: List[str] = Field(default_factory=list, description="IDs of affected entities")
    
    class Config:
        schema_extra = {
            "example": {
                "success": True,
                "message": "Relationship created successfully",
                "relationshipId": "60f1b2b3c4d5e6f7g8h9i0j1",
                "affectedEntityIds": ["C123456", "C789012"]
            }
        }