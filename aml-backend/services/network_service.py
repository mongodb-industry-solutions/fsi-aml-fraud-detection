"""
Network service for building entity relationship networks using MongoDB $graphLookup
"""

from typing import List, Dict, Any, Optional, Set, Tuple
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId
import logging
from datetime import datetime

from models.network import NetworkNode, NetworkEdge, NetworkDataResponse, NetworkQueryParams
from models.entity import EntityDetail

logger = logging.getLogger(__name__)


class NetworkService:
    """Service for building and analyzing entity relationship networks"""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.entities_collection = db.entities
        self.relationships_collection = db.relationships
    
    async def build_entity_network(
        self,
        entity_id: str,
        max_depth: int = 2,
        min_strength: float = 0.5,
        include_inactive: bool = False,
        max_nodes: int = 100
    ) -> NetworkDataResponse:
        """
        Build a network graph for an entity using MongoDB $graphLookup
        
        Args:
            entity_id: Starting entity ID
            max_depth: Maximum traversal depth (1-4)
            min_strength: Minimum relationship strength (0.0-1.0)
            include_inactive: Whether to include inactive relationships
            max_nodes: Maximum number of nodes to return
            
        Returns:
            NetworkDataResponse with nodes and edges
        """
        start_time = datetime.utcnow()
        
        try:
            # First, verify the entity exists
            entity = await self.entities_collection.find_one({"entityId": entity_id})
            if not entity:
                raise ValueError(f"Entity {entity_id} not found")
            
            # Get all relationships using $graphLookup
            # Since relationships are bidirectional, we need to handle both directions
            relationships = await self._get_relationships_graph(
                entity_id, max_depth, min_strength, include_inactive
            )
            
            # Extract unique entity IDs from relationships
            entity_ids = self._extract_entity_ids(entity_id, relationships)
            
            # Limit the number of entities if needed
            if len(entity_ids) > max_nodes:
                # Keep the center entity and closest nodes
                entity_ids = {entity_id} | set(list(entity_ids - {entity_id})[:max_nodes - 1])
            
            # Fetch entity details for all nodes
            entities = await self._fetch_entities(list(entity_ids))
            
            # Build nodes and edges
            nodes = self._build_nodes(entities)
            edges = self._build_edges(relationships, entity_ids)
            
            # Calculate metadata
            max_depth_reached = self._calculate_max_depth(relationships)
            execution_time_ms = int((datetime.utcnow() - start_time).total_seconds() * 1000)
            
            return NetworkDataResponse(
                nodes=nodes,
                edges=edges,
                centerNodeId=entity_id,
                totalNodes=len(nodes),
                totalEdges=len(edges),
                maxDepthReached=max_depth_reached,
                searchMetadata={
                    "executionTimeMs": execution_time_ms,
                    "maxDepthRequested": max_depth,
                    "minStrengthFilter": min_strength,
                    "includeInactive": include_inactive,
                    "totalRelationshipsFound": len(relationships)
                }
            )
            
        except Exception as e:
            logger.error(f"Error building network for entity {entity_id}: {str(e)}")
            raise
    
    async def _get_relationships_graph(
        self,
        entity_id: str,
        max_depth: int,
        min_strength: float,
        include_inactive: bool
    ) -> List[Dict[str, Any]]:
        """
        Get relationships using $graphLookup, handling bidirectional relationships
        """
        # Build match criteria for relationship filtering
        match_criteria = {
            "strength": {"$gte": min_strength}
        }
        if not include_inactive:
            match_criteria["active"] = True
        
        # Since relationships can be bidirectional, we need to search from both source and target
        # We'll use $graphLookup twice and combine results
        
        # Pipeline for relationships where entity is the source
        pipeline_source = [
            {"$match": {"source.entityId": entity_id, **match_criteria}},
            {
                "$graphLookup": {
                    "from": "relationships",
                    "startWith": "$target.entityId",
                    "connectFromField": "target.entityId",
                    "connectToField": "source.entityId",
                    "as": "graph",
                    "maxDepth": max_depth - 1,  # -1 because we already have the first level
                    "depthField": "depth",
                    "restrictSearchWithMatch": match_criteria
                }
            },
            {
                "$project": {
                    "relationships": {
                        "$concatArrays": [
                            [{"$mergeObjects": ["$$ROOT", {"depth": 0}]}],
                            "$graph"
                        ]
                    }
                }
            },
            {"$unwind": "$relationships"},
            {"$replaceRoot": {"newRoot": "$relationships"}}
        ]
        
        # Pipeline for relationships where entity is the target
        pipeline_target = [
            {"$match": {"target.entityId": entity_id, **match_criteria}},
            {
                "$graphLookup": {
                    "from": "relationships",
                    "startWith": "$source.entityId",
                    "connectFromField": "source.entityId",
                    "connectToField": "target.entityId",
                    "as": "graph",
                    "maxDepth": max_depth - 1,
                    "depthField": "depth",
                    "restrictSearchWithMatch": match_criteria
                }
            },
            {
                "$project": {
                    "relationships": {
                        "$concatArrays": [
                            [{"$mergeObjects": ["$$ROOT", {"depth": 0}]}],
                            "$graph"
                        ]
                    }
                }
            },
            {"$unwind": "$relationships"},
            {"$replaceRoot": {"newRoot": "$relationships"}}
        ]
        
        # Execute both pipelines
        relationships_source = await self.relationships_collection.aggregate(pipeline_source).to_list(None)
        relationships_target = await self.relationships_collection.aggregate(pipeline_target).to_list(None)
        
        # Combine and deduplicate relationships
        all_relationships = relationships_source + relationships_target
        unique_relationships = self._deduplicate_relationships(all_relationships)
        
        return unique_relationships
    
    def _deduplicate_relationships(self, relationships: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Remove duplicate relationships based on relationshipId
        """
        seen = set()
        unique = []
        
        for rel in relationships:
            rel_id = rel.get('relationshipId') or str(rel.get('_id', ''))
            if rel_id and rel_id not in seen:
                seen.add(rel_id)
                unique.append(rel)
        
        return unique
    
    def _extract_entity_ids(self, center_id: str, relationships: List[Dict[str, Any]]) -> Set[str]:
        """
        Extract all unique entity IDs from relationships
        """
        entity_ids = {center_id}
        
        for rel in relationships:
            source_id = rel.get('source', {}).get('entityId')
            target_id = rel.get('target', {}).get('entityId')
            
            if source_id:
                entity_ids.add(source_id)
            if target_id:
                entity_ids.add(target_id)
        
        return entity_ids
    
    async def _fetch_entities(self, entity_ids: List[str]) -> List[Dict[str, Any]]:
        """
        Fetch entity details for all entity IDs
        """
        cursor = self.entities_collection.find(
            {"entityId": {"$in": entity_ids}},
            {
                "entityId": 1,
                "name": 1,
                "entityType": 1,
                "riskAssessment": 1,
                "resolution": 1
            }
        )
        
        return await cursor.to_list(None)
    
    def _build_nodes(self, entities: List[Dict[str, Any]]) -> List[NetworkNode]:
        """
        Convert entities to NetworkNode objects with visual styling
        """
        nodes = []
        
        for entity in entities:
            entity_id = entity.get('entityId', '')
            entity_type = entity.get('entityType', 'unknown')
            
            # Extract name
            name = entity.get('name', {})
            if isinstance(name, dict):
                label = name.get('full', entity_id)
            else:
                label = str(name) if name else entity_id
            
            # Extract risk information
            risk_assessment = entity.get('riskAssessment', {})
            overall_risk = risk_assessment.get('overall', {})
            risk_score = overall_risk.get('score', 0)
            risk_level = overall_risk.get('level', 'unknown')
            
            # Calculate node size based on risk score
            node_size = self._calculate_node_size(risk_score)
            
            # Determine node color based on risk level
            color = self._get_risk_color(risk_level)
            
            nodes.append(NetworkNode(
                id=entity_id,
                label=label,
                entityType=entity_type,
                riskScore=risk_score,
                riskLevel=risk_level,
                nodeSize=node_size,
                color=color
            ))
        
        return nodes
    
    def _build_edges(self, relationships: List[Dict[str, Any]], entity_ids: Set[str]) -> List[NetworkEdge]:
        """
        Convert relationships to NetworkEdge objects with visual styling
        """
        edges = []
        seen_edges = set()
        
        for rel in relationships:
            source_id = rel.get('source', {}).get('entityId')
            target_id = rel.get('target', {}).get('entityId')
            
            # Only include edges where both nodes are in our entity set
            if not (source_id and target_id and 
                    source_id in entity_ids and target_id in entity_ids):
                continue
            
            # Create a unique edge key to avoid duplicates
            edge_key = tuple(sorted([source_id, target_id]))
            if edge_key in seen_edges:
                continue
            seen_edges.add(edge_key)
            
            rel_id = rel.get('relationshipId') or str(rel.get('_id', ''))
            rel_type = rel.get('type', 'unknown')
            direction = rel.get('direction', 'bidirectional')
            strength = rel.get('strength', 0.5)
            verified = rel.get('verified', False)
            
            # Format label
            label = self._format_relationship_label(rel_type)
            
            # Calculate edge styling
            edge_style = self._calculate_edge_style(rel_type, strength, verified)
            
            edges.append(NetworkEdge(
                id=rel_id,
                source=source_id,
                target=target_id,
                label=label,
                direction=direction,
                strength=strength,
                verified=verified,
                edgeStyle=edge_style
            ))
        
        return edges
    
    def _calculate_node_size(self, risk_score: float) -> float:
        """
        Calculate node size based on risk score (0-100)
        """
        # Base size 40, max size 80
        return 40 + (risk_score / 100) * 40
    
    def _get_risk_color(self, risk_level: str) -> str:
        """
        Get color based on risk level
        """
        colors = {
            'high': '#E32D22',      # Red
            'medium': '#FEF7C8',    # Yellow
            'low': '#13AA52',       # Green
            'unknown': '#89979B'    # Gray
        }
        return colors.get(risk_level.lower(), colors['unknown'])
    
    def _format_relationship_label(self, rel_type: str) -> str:
        """
        Format relationship type for display
        """
        # Convert snake_case to Title Case
        return rel_type.replace('_', ' ').title()
    
    def _calculate_edge_style(self, rel_type: str, strength: float, verified: bool) -> Dict[str, Any]:
        """
        Calculate edge styling based on relationship properties
        """
        # Base styling
        style = {
            "strokeWidth": max(2, strength * 6),  # 2-6 pixels based on strength
            "strokeDasharray": "0" if verified else "5 5",  # Dashed if unverified
        }
        
        # Color based on relationship type
        type_colors = {
            'confirmed_same_entity': '#13AA52',     # Green
            'potential_duplicate': '#FEF7C8',       # Yellow
            'business_associate': '#3F73F4',        # Blue
            'family_member': '#8A4AF7',             # Purple
            'shared_address': '#00B4B8',            # Teal
            'shared_identifier': '#F94144',         # Red
            'transaction_counterparty': '#F3922B',  # Orange
            'corporate_structure': '#5C6C7C'        # Gray
        }
        
        style["stroke"] = type_colors.get(rel_type, '#89979B')
        
        return style
    
    def _calculate_max_depth(self, relationships: List[Dict[str, Any]]) -> int:
        """
        Calculate the maximum depth reached in the graph
        """
        if not relationships:
            return 0
        
        max_depth = 0
        for rel in relationships:
            depth = rel.get('depth', 0)
            max_depth = max(max_depth, depth)
        
        return max_depth