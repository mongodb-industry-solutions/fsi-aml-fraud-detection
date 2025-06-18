"""
Network Models - Data models for network analysis and relationship mapping

Models for entity relationship networks, graph analysis, and
network visualization data structures.
"""

from datetime import datetime
from typing import Dict, List, Optional, Any, Literal
from pydantic import BaseModel, Field


class NetworkNode(BaseModel):
    """Individual node in an entity network"""
    
    entity_id: str
    entity_type: str
    name: str
    
    # Node attributes
    risk_level: Optional[str] = None
    risk_score: Optional[float] = None
    status: Optional[str] = None
    
    # Network metrics
    centrality: Optional[float] = None
    degree: Optional[int] = None
    cluster_id: Optional[str] = None
    
    # Visualization attributes
    color: Optional[str] = None
    size: Optional[float] = None
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class NetworkEdge(BaseModel):
    """Connection between two entities in the network"""
    
    source_entity_id: str
    target_entity_id: str
    relationship_type: str
    
    # Edge attributes
    strength: Optional[float] = None
    confidence: Optional[float] = None
    evidence: Optional[List[str]] = None
    
    # Temporal information
    created_date: Optional[datetime] = None
    last_verified: Optional[datetime] = None
    
    # Visualization attributes
    weight: Optional[float] = None
    color: Optional[str] = None
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class EntityNetwork(BaseModel):
    """Complete entity network with nodes and edges"""
    
    center_entity_id: str
    nodes: List[NetworkNode]
    edges: List[NetworkEdge]
    
    # Network statistics
    total_entities: int
    total_relationships: int
    max_depth: int
    density: Optional[float] = None
    
    # Analysis results
    clusters: Optional[List[Dict[str, Any]]] = None
    key_connectors: Optional[List[str]] = None
    risk_propagation: Optional[Dict[str, Any]] = None
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class NetworkAnalysisRequest(BaseModel):
    """Request for network analysis operations"""
    
    center_entity_id: str
    max_depth: int = Field(default=2, ge=1, le=5)
    max_entities: int = Field(default=100, ge=1, le=500)
    
    # Analysis options
    include_risk_analysis: bool = True
    include_clusters: bool = True
    relationship_types: Optional[List[str]] = None
    
    # Filter options
    min_confidence: Optional[float] = None
    exclude_entity_types: Optional[List[str]] = None
    
    class Config:
        json_schema_extra = {
            "example": {
                "center_entity_id": "ENT123456",
                "max_depth": 2,
                "max_entities": 50,
                "include_risk_analysis": True
            }
        }


class NetworkDiscoveryResult(BaseModel):
    """Result of network discovery analysis"""
    
    network: EntityNetwork
    analysis_summary: Dict[str, Any]
    computation_time_ms: float
    
    # Discovery insights
    suspicious_patterns: Optional[List[Dict[str, Any]]] = None
    high_risk_paths: Optional[List[List[str]]] = None
    recommendations: Optional[List[str]] = None
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class PathAnalysisRequest(BaseModel):
    """Request for analyzing paths between entities"""
    
    source_entity_id: str
    target_entity_id: str
    max_path_length: int = Field(default=4, ge=1, le=8)
    
    # Path filtering
    relationship_types: Optional[List[str]] = None
    min_confidence: Optional[float] = None
    
    class Config:
        json_schema_extra = {
            "example": {
                "source_entity_id": "ENT123456",
                "target_entity_id": "ENT789012",
                "max_path_length": 4
            }
        }


class EntityPath(BaseModel):
    """Path between two entities through the network"""
    
    entities: List[str]  # Entity IDs in path order
    relationships: List[NetworkEdge]
    total_strength: float
    path_confidence: float
    
    # Path analysis
    risk_score: Optional[float] = None
    suspicious_indicators: Optional[List[str]] = None
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class PathAnalysisResponse(BaseModel):
    """Response for path analysis between entities"""
    
    source_entity_id: str
    target_entity_id: str
    paths_found: List[EntityPath]
    shortest_path_length: Optional[int] = None
    analysis_time_ms: float
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class NetworkDataResponse(BaseModel):
    """Response containing network data for visualization"""
    
    nodes: List[NetworkNode]
    edges: List[NetworkEdge]
    metadata: Dict[str, Any]
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class NetworkQueryParams(BaseModel):
    """Query parameters for network operations"""
    
    max_depth: int = Field(default=2, ge=1, le=5)
    max_entities: int = Field(default=100, ge=1, le=500)
    include_risk_analysis: bool = True
    relationship_types: Optional[List[str]] = None
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }