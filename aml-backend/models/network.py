"""
Pydantic models for network visualization and graph data structures
"""

from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class NetworkNode(BaseModel):
    """Node representation for network visualization"""
    id: str = Field(..., description="Entity ID")
    label: str = Field(..., description="Entity name or label")
    entityType: str = Field(..., description="Entity type (individual/organization)")
    riskScore: Optional[float] = Field(None, description="Risk assessment score")
    riskLevel: Optional[str] = Field(None, description="Risk level (high/medium/low)")
    nodeSize: Optional[float] = Field(None, description="Calculated node size for visualization")
    color: Optional[str] = Field(None, description="Node color based on risk/type")
    
    class Config:
        json_schema_extra = {
            "example": {
                "id": "CDI-431BB609EB",
                "label": "Samantha Miller",
                "entityType": "individual",
                "riskScore": 68.5,
                "riskLevel": "medium",
                "nodeSize": 60,
                "color": "#FEF7C8"
            }
        }

class NetworkEdge(BaseModel):
    """Edge representation for network visualization"""
    id: str = Field(..., description="Relationship ID")
    source: str = Field(..., description="Source entity ID")
    target: str = Field(..., description="Target entity ID")
    label: str = Field(..., description="Relationship type label")
    direction: str = Field(..., description="Relationship direction")
    strength: float = Field(..., description="Relationship strength/confidence")
    verified: Optional[bool] = Field(None, description="Whether relationship is verified")
    edgeStyle: Optional[Dict[str, Any]] = Field(None, description="Visual styling properties")
    
    class Config:
        json_schema_extra = {
            "example": {
                "id": "REL-FDED5F85F8",
                "source": "CDI-431BB609EB",
                "target": "CDI-982BDB7D7B",
                "label": "confirmed_same_entity",
                "direction": "bidirectional",
                "strength": 1.0,
                "verified": True,
                "edgeStyle": {
                    "strokeWidth": 4,
                    "stroke": "#13AA52",
                    "strokeDasharray": "0"
                }
            }
        }

class NetworkDataResponse(BaseModel):
    """Complete network data response for visualization"""
    nodes: List[NetworkNode] = Field(..., description="Network nodes")
    edges: List[NetworkEdge] = Field(..., description="Network edges")
    centerNodeId: str = Field(..., description="Center entity ID")
    totalNodes: int = Field(..., description="Total node count")
    totalEdges: int = Field(..., description="Total edge count")
    maxDepthReached: int = Field(..., description="Maximum depth traversed")
    searchMetadata: Dict[str, Any] = Field(default_factory=dict, description="Search execution metadata")
    
    class Config:
        json_schema_extra = {
            "example": {
                "nodes": [
                    {
                        "id": "CDI-431BB609EB",
                        "label": "Samantha Miller",
                        "entityType": "individual",
                        "riskLevel": "medium"
                    },
                    {
                        "id": "CDI-982BDB7D7B",
                        "label": "Sam Brittany Miller",
                        "entityType": "individual",
                        "riskLevel": "medium"
                    }
                ],
                "edges": [
                    {
                        "id": "REL-FDED5F85F8",
                        "source": "CDI-431BB609EB",
                        "target": "CDI-982BDB7D7B",
                        "label": "confirmed_same_entity",
                        "strength": 1.0
                    }
                ],
                "centerNodeId": "CDI-431BB609EB",
                "totalNodes": 2,
                "totalEdges": 1,
                "maxDepthReached": 1,
                "searchMetadata": {
                    "executionTimeMs": 87,
                    "maxDepthRequested": 2,
                    "minStrengthFilter": 0.5
                }
            }
        }

class NetworkQueryParams(BaseModel):
    """Query parameters for network visualization requests"""
    max_depth: int = Field(default=2, ge=1, le=4, description="Maximum traversal depth")
    min_strength: float = Field(default=0.5, ge=0.0, le=1.0, description="Minimum relationship strength")
    include_inactive: bool = Field(default=False, description="Include inactive relationships")
    max_nodes: int = Field(default=100, ge=10, le=500, description="Maximum number of nodes to return")
    
    class Config:
        json_schema_extra = {
            "example": {
                "max_depth": 2,
                "min_strength": 0.5,
                "include_inactive": False,
                "max_nodes": 100
            }
        }