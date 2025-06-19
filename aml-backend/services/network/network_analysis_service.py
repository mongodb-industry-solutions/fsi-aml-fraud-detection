"""
Network Analysis Service - Comprehensive graph analysis and relationship insights

Provides advanced network analysis capabilities using $graphLookup operations,
relationship pattern detection, and risk assessment through network topology.
"""

import logging
from typing import Dict, List, Optional, Any, Set, Tuple
from datetime import datetime
import asyncio

from repositories.impl.network_relationship_repository import NetworkRelationshipRepository
from repositories.interfaces.entity_repository import EntityRepositoryInterface
from models.core.relationship import (
    RelationshipType, NetworkRelationship, EntityNetwork, 
    EntityReference, NetworkRelationshipSummary
)

logger = logging.getLogger(__name__)


class NetworkAnalysisService:
    """
    Advanced network analysis service for relationship graphs
    
    Provides comprehensive graph analysis including:
    - Multi-hop entity relationship discovery
    - Network risk assessment
    - Pattern detection and clustering
    - Shortest path analysis
    - Network topology insights
    """
    
    def __init__(self, 
                 network_repo: NetworkRelationshipRepository,
                 entity_repo: EntityRepositoryInterface):
        """
        Initialize network analysis service
        
        Args:
            network_repo: Network relationship repository
            entity_repo: Entity repository for entity details
        """
        self.network_repo = network_repo
        self.entity_repo = entity_repo
        
        # Analysis configuration
        self.max_network_depth = 4
        self.min_confidence_threshold = 0.3
        self.risk_weight_factors = {
            "transactional_counterparty_high_risk": 0.9,
            "business_associate_suspected": 0.7,
            "potential_beneficial_owner_of": 0.8,
            "confirmed_same_entity": 0.95,
            "director_of": 0.6,
            "shareholder_of": 0.5
        }
        
        logger.info("Network Analysis Service initialized")
    
    # ==================== COMPREHENSIVE NETWORK ANALYSIS ====================
    
    async def analyze_entity_network(self, entity_id: str, 
                                   analysis_depth: int = 3,
                                   include_risk_assessment: bool = True) -> Dict[str, Any]:
        """
        Comprehensive entity network analysis
        
        Args:
            entity_id: Starting entity ID
            analysis_depth: Maximum traversal depth
            include_risk_assessment: Include risk scoring
            
        Returns:
            Dict: Complete network analysis results
        """
        start_time = datetime.utcnow()
        
        try:
            logger.info(f"Starting comprehensive network analysis for entity {entity_id}")
            
            # Build the entity network
            entity_network = await self.network_repo.build_entity_network(
                entity_id=entity_id,
                max_depth=analysis_depth,
                min_confidence=self.min_confidence_threshold
            )
            
            # Perform parallel analysis tasks
            analysis_tasks = [
                self._analyze_network_topology(entity_network),
                self._detect_relationship_patterns(entity_network),
                self._calculate_centrality_metrics(entity_id, entity_network),
                self._identify_high_risk_connections(entity_network)
            ]
            
            if include_risk_assessment:
                analysis_tasks.append(self._assess_network_risk(entity_network))
            
            # Execute all analysis tasks in parallel
            results = await asyncio.gather(*analysis_tasks, return_exceptions=True)
            
            # Combine results
            topology_analysis = results[0] if len(results) > 0 and not isinstance(results[0], Exception) else {}
            pattern_analysis = results[1] if len(results) > 1 and not isinstance(results[1], Exception) else {}
            centrality_analysis = results[2] if len(results) > 2 and not isinstance(results[2], Exception) else {}
            risk_connections = results[3] if len(results) > 3 and not isinstance(results[3], Exception) else {}
            risk_assessment = results[4] if len(results) > 4 and not isinstance(results[4], Exception) else {}
            
            processing_time = (datetime.utcnow() - start_time).total_seconds() * 1000
            
            comprehensive_analysis = {
                "entity_id": entity_id,
                "analysis_timestamp": datetime.utcnow().isoformat(),
                "processing_time_ms": processing_time,
                
                # Core network data
                "network": {
                    "total_relationships": entity_network.total_relationships,
                    "relationship_types": [rt.value for rt in entity_network.relationship_types],
                    "average_strength": entity_network.average_strength,
                    "average_confidence": entity_network.average_confidence,
                    "verified_count": entity_network.verified_count,
                    "max_depth_reached": entity_network.max_depth_reached
                },
                
                # Analysis results
                "topology": topology_analysis,
                "patterns": pattern_analysis,
                "centrality": centrality_analysis,
                "risk_connections": risk_connections,
                "risk_assessment": risk_assessment,
                
                # Recommendations
                "recommendations": await self._generate_analysis_recommendations(
                    entity_network, topology_analysis, pattern_analysis, risk_assessment
                )
            }
            
            logger.info(f"Completed network analysis for {entity_id} in {processing_time:.2f}ms")
            return comprehensive_analysis
            
        except Exception as e:
            logger.error(f"Network analysis failed for entity {entity_id}: {e}")
            return {
                "entity_id": entity_id,
                "error": str(e),
                "analysis_timestamp": datetime.utcnow().isoformat()
            }
    
    async def find_connection_paths(self, source_entity_id: str, 
                                  target_entity_id: str,
                                  max_depth: int = 6) -> Dict[str, Any]:
        """
        Find and analyze connection paths between two entities
        
        Args:
            source_entity_id: Starting entity ID
            target_entity_id: Target entity ID
            max_depth: Maximum path length
            
        Returns:
            Dict: Connection path analysis
        """
        try:
            logger.info(f"Finding connection paths from {source_entity_id} to {target_entity_id}")
            
            # Find shortest path
            shortest_path = await self.network_repo.find_shortest_path(
                source_entity_id, target_entity_id, max_depth
            )
            
            # Analyze path characteristics
            path_analysis = {
                "source_entity_id": source_entity_id,
                "target_entity_id": target_entity_id,
                "path_found": shortest_path is not None,
                "path_length": len(shortest_path) if shortest_path else 0,
                "path_details": [],
                "risk_score": 0.0,
                "connection_strength": 0.0
            }
            
            if shortest_path:
                # Analyze each relationship in the path
                total_strength = 0.0
                total_risk = 0.0
                
                for i, relationship in enumerate(shortest_path):
                    rel_strength = relationship.get("strength", 0.0)
                    rel_confidence = relationship.get("confidence", 0.0)
                    rel_type = relationship.get("type", "unknown")
                    
                    # Calculate risk weight for this relationship type
                    risk_weight = self.risk_weight_factors.get(rel_type, 0.3)
                    
                    total_strength += rel_strength
                    total_risk += risk_weight
                    
                    path_details = {
                        "step": i + 1,
                        "relationship_type": rel_type,
                        "strength": rel_strength,
                        "confidence": rel_confidence,
                        "risk_weight": risk_weight,
                        "source_entity": relationship.get("source", {}),
                        "target_entity": relationship.get("target", {}),
                        "verified": relationship.get("verified", False)
                    }
                    
                    path_analysis["path_details"].append(path_details)
                
                # Calculate aggregate metrics
                path_analysis["connection_strength"] = total_strength / len(shortest_path)
                path_analysis["risk_score"] = total_risk / len(shortest_path)
                path_analysis["path_confidence"] = min(rel.get("confidence", 0.0) for rel in shortest_path)
            
            return path_analysis
            
        except Exception as e:
            logger.error(f"Failed to find connection paths: {e}")
            return {
                "source_entity_id": source_entity_id,
                "target_entity_id": target_entity_id,
                "error": str(e)
            }
    
    async def detect_network_clusters(self, min_cluster_size: int = 3) -> Dict[str, Any]:
        """
        Detect clusters of highly connected entities
        
        Args:
            min_cluster_size: Minimum entities in a cluster
            
        Returns:
            Dict: Cluster analysis results
        """
        try:
            logger.info(f"Detecting network clusters with minimum size {min_cluster_size}")
            
            clusters = await self.network_repo.detect_relationship_clusters(min_cluster_size)
            
            # Analyze each cluster
            cluster_analysis = []
            
            for i, cluster_entities in enumerate(clusters):
                cluster_info = {
                    "cluster_id": f"cluster_{i+1}",
                    "entity_count": len(cluster_entities),
                    "entities": cluster_entities,
                    "cluster_metrics": await self._analyze_cluster_metrics(cluster_entities),
                    "risk_indicators": await self._identify_cluster_risks(cluster_entities)
                }
                
                cluster_analysis.append(cluster_info)
            
            return {
                "total_clusters": len(clusters),
                "cluster_analysis": cluster_analysis,
                "analysis_timestamp": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Failed to detect network clusters: {e}")
            return {"error": str(e)}
    
    # ==================== RISK ASSESSMENT AND PATTERN DETECTION ====================
    
    async def assess_entity_risk_through_network(self, entity_id: str) -> Dict[str, Any]:
        """
        Assess entity risk based on network topology and connections
        
        Args:
            entity_id: Entity ID to assess
            
        Returns:
            Dict: Risk assessment results
        """
        try:
            logger.info(f"Assessing network-based risk for entity {entity_id}")
            
            # Get entity network
            entity_network = await self.network_repo.build_entity_network(
                entity_id=entity_id,
                max_depth=3
            )
            
            # Calculate various risk factors
            risk_factors = {
                "high_risk_connections": 0,
                "unverified_connections": 0,
                "suspicious_patterns": 0,
                "beneficial_ownership_chains": 0,
                "pep_connections": 0,
                "sanctioned_connections": 0
            }
            
            connection_risks = []
            
            for relationship in entity_network.relationships:
                rel_type = relationship.get("type", "")
                confidence = relationship.get("confidence", 0.0)
                verified = relationship.get("verified", False)
                
                # Identify high-risk relationship types
                if rel_type in ["transactional_counterparty_high_risk", "business_associate_suspected"]:
                    risk_factors["high_risk_connections"] += 1
                    connection_risks.append({
                        "relationship_id": relationship.get("relationshipId"),
                        "type": rel_type,
                        "risk_level": "high",
                        "confidence": confidence
                    })
                
                if not verified and confidence < 0.6:
                    risk_factors["unverified_connections"] += 1
                
                if rel_type in ["potential_beneficial_owner_of", "ubo_of"]:
                    risk_factors["beneficial_ownership_chains"] += 1
            
            # Calculate overall risk score
            total_connections = entity_network.total_relationships
            risk_score = 0.0
            
            if total_connections > 0:
                high_risk_ratio = risk_factors["high_risk_connections"] / total_connections
                unverified_ratio = risk_factors["unverified_connections"] / total_connections
                
                risk_score = (
                    high_risk_ratio * 0.5 +
                    unverified_ratio * 0.2 +
                    (risk_factors["beneficial_ownership_chains"] / max(total_connections, 1)) * 0.3
                )
            
            risk_level = "low"
            if risk_score > 0.7:
                risk_level = "critical"
            elif risk_score > 0.5:
                risk_level = "high"
            elif risk_score > 0.3:
                risk_level = "medium"
            
            return {
                "entity_id": entity_id,
                "risk_score": risk_score,
                "risk_level": risk_level,
                "risk_factors": risk_factors,
                "connection_risks": connection_risks,
                "total_connections": total_connections,
                "analysis_timestamp": datetime.utcnow().isoformat(),
                "recommendations": self._generate_risk_recommendations(risk_score, risk_factors)
            }
            
        except Exception as e:
            logger.error(f"Risk assessment failed for entity {entity_id}: {e}")
            return {"entity_id": entity_id, "error": str(e)}
    
    # ==================== HELPER METHODS ====================
    
    async def _analyze_network_topology(self, network: EntityNetwork) -> Dict[str, Any]:
        """Analyze network topology characteristics"""
        topology = {
            "density": 0.0,
            "clustering_coefficient": 0.0,
            "average_path_length": 0.0,
            "connected_components": 1,
            "diameter": 0
        }
        
        if network.total_relationships > 0:
            unique_entities = set()
            for rel in network.relationships:
                unique_entities.add(rel["source"]["entityId"])
                unique_entities.add(rel["target"]["entityId"])
            
            num_entities = len(unique_entities)
            max_possible_edges = num_entities * (num_entities - 1) / 2
            
            if max_possible_edges > 0:
                topology["density"] = network.total_relationships / max_possible_edges
        
        return topology
    
    async def _detect_relationship_patterns(self, network: EntityNetwork) -> Dict[str, Any]:
        """Detect common relationship patterns"""
        patterns = {
            "corporate_hierarchies": 0,
            "beneficial_ownership_chains": 0,
            "household_clusters": 0,
            "duplicate_entity_groups": 0,
            "high_risk_networks": 0
        }
        
        for rel in network.relationships:
            rel_type = rel.get("type", "")
            
            if rel_type in ["director_of", "shareholder_of", "parent_of_subsidiary"]:
                patterns["corporate_hierarchies"] += 1
            elif rel_type in ["ubo_of", "potential_beneficial_owner_of"]:
                patterns["beneficial_ownership_chains"] += 1
            elif rel_type == "household_member":
                patterns["household_clusters"] += 1
            elif rel_type in ["confirmed_same_entity", "potential_duplicate"]:
                patterns["duplicate_entity_groups"] += 1
            elif rel_type in ["transactional_counterparty_high_risk", "business_associate_suspected"]:
                patterns["high_risk_networks"] += 1
        
        return patterns
    
    async def _calculate_centrality_metrics(self, entity_id: str, network: EntityNetwork) -> Dict[str, Any]:
        """Calculate centrality metrics for the entity"""
        degree_centrality = 0
        betweenness_centrality = 0.0
        
        # Simple degree centrality calculation
        for rel in network.relationships:
            if rel["source"]["entityId"] == entity_id or rel["target"]["entityId"] == entity_id:
                degree_centrality += 1
        
        return {
            "degree_centrality": degree_centrality,
            "betweenness_centrality": betweenness_centrality,
            "normalized_degree": degree_centrality / max(network.total_relationships, 1)
        }
    
    async def _identify_high_risk_connections(self, network: EntityNetwork) -> List[Dict[str, Any]]:
        """Identify high-risk connections in the network"""
        high_risk_connections = []
        
        for rel in network.relationships:
            risk_weight = self.risk_weight_factors.get(rel.get("type", ""), 0.0)
            
            if risk_weight > 0.6:  # High-risk threshold
                high_risk_connections.append({
                    "relationship_id": rel.get("relationshipId"),
                    "type": rel.get("type"),
                    "risk_weight": risk_weight,
                    "confidence": rel.get("confidence", 0.0),
                    "verified": rel.get("verified", False),
                    "source_entity": rel.get("source", {}),
                    "target_entity": rel.get("target", {})
                })
        
        return high_risk_connections
    
    async def _assess_network_risk(self, network: EntityNetwork) -> Dict[str, Any]:
        """Assess overall network risk"""
        total_risk_weight = 0.0
        high_risk_count = 0
        
        for rel in network.relationships:
            risk_weight = self.risk_weight_factors.get(rel.get("type", ""), 0.3)
            total_risk_weight += risk_weight
            
            if risk_weight > 0.6:
                high_risk_count += 1
        
        average_risk = total_risk_weight / max(network.total_relationships, 1)
        
        return {
            "average_risk_weight": average_risk,
            "high_risk_relationship_count": high_risk_count,
            "risk_distribution": self._calculate_risk_distribution(network),
            "overall_risk_level": "high" if average_risk > 0.6 else "medium" if average_risk > 0.4 else "low"
        }
    
    def _calculate_risk_distribution(self, network: EntityNetwork) -> Dict[str, int]:
        """Calculate distribution of risk levels"""
        distribution = {"low": 0, "medium": 0, "high": 0}
        
        for rel in network.relationships:
            risk_weight = self.risk_weight_factors.get(rel.get("type", ""), 0.3)
            
            if risk_weight > 0.6:
                distribution["high"] += 1
            elif risk_weight > 0.4:
                distribution["medium"] += 1
            else:
                distribution["low"] += 1
        
        return distribution
    
    async def _generate_analysis_recommendations(self, network: EntityNetwork, 
                                               topology: Dict[str, Any],
                                               patterns: Dict[str, Any],
                                               risk_assessment: Dict[str, Any]) -> List[str]:
        """Generate actionable recommendations based on analysis"""
        recommendations = []
        
        if network.verified_count / max(network.total_relationships, 1) < 0.5:
            recommendations.append("Verify more relationships to improve network reliability")
        
        if risk_assessment.get("high_risk_relationship_count", 0) > 0:
            recommendations.append("Review high-risk relationships for compliance")
        
        if patterns.get("beneficial_ownership_chains", 0) > 2:
            recommendations.append("Investigate complex beneficial ownership structures")
        
        if topology.get("density", 0) > 0.8:
            recommendations.append("High network density may indicate shell company structures")
        
        return recommendations
    
    def _generate_risk_recommendations(self, risk_score: float, risk_factors: Dict[str, Any]) -> List[str]:
        """Generate risk-specific recommendations"""
        recommendations = []
        
        if risk_score > 0.7:
            recommendations.append("Immediate compliance review required")
        
        if risk_factors.get("high_risk_connections", 0) > 0:
            recommendations.append("Investigate high-risk relationship connections")
        
        if risk_factors.get("beneficial_ownership_chains", 0) > 1:
            recommendations.append("Map complete beneficial ownership structure")
        
        return recommendations
    
    async def _analyze_cluster_metrics(self, cluster_entities: List[str]) -> Dict[str, Any]:
        """Analyze metrics for a cluster of entities"""
        return {
            "entity_count": len(cluster_entities),
            "avg_connectivity": 0.0,  # Simplified
            "cluster_density": 0.0     # Simplified
        }
    
    async def _identify_cluster_risks(self, cluster_entities: List[str]) -> List[str]:
        """Identify risk indicators for a cluster"""
        risk_indicators = []
        
        if len(cluster_entities) > 10:
            risk_indicators.append("Large cluster may indicate shell company network")
        
        return risk_indicators