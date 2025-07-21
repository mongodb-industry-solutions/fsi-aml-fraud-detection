"""
Enhanced Entity Resolution API Routes

Next-generation entity resolution with parallel search, network analysis,
and intelligent classification capabilities.
"""

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from typing import Dict, List, Optional, Any
from datetime import datetime
import asyncio
import logging

from models.core.resolution import ResolutionDecision
from models.api.requests import EntitySearchRequest, UnifiedSearchRequest
from services.search.unified_search_service import UnifiedSearchService
from services.search.atlas_search_service import AtlasSearchService
from services.search.vector_search_service import VectorSearchService
from services.core.entity_resolution_service import EntityResolutionService
from services.network.network_analysis_service import NetworkAnalysisService
from services.dependencies import (
    get_entity_repository, 
    get_relationship_repository,
    get_unified_search_service, 
    get_network_analysis_service,
    get_atlas_search_service,
    get_vector_search_service
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/resolution", tags=["Enhanced Entity Resolution"])

@router.get("/demo-scenarios-enhanced")
async def get_enhanced_demo_scenarios() -> Dict[str, Any]:
    """Get enhanced demo scenarios for testing entity resolution workflows."""
    
    scenarios = [
        {
            "id": "enhanced_safe_individual",
            "name": "Safe Individual - Low Risk",
            "description": "Clean individual with no risk indicators",
            "entityData": {
                "fullName": "Jennifer Sarah Wilson",
                "dateOfBirth": "1985-03-15",
                "address": "123 Oak Street, Portland, OR 97201",
                "primaryIdentifier": "SSN:555-12-3456",
                "entityType": "individual"
            },
            "expectedClassification": "SAFE",
            "networkComplexity": "simple"
        },
        {
            "id": "enhanced_duplicate_individual", 
            "name": "Potential Duplicate - High Similarity",
            "description": "Individual with high similarity to existing record",
            "entityData": {
                "fullName": "Robert J. Smith",
                "dateOfBirth": "1975-08-22",
                "address": "456 Pine Ave, Seattle, WA 98101",
                "primaryIdentifier": "DL:WA-567890123",
                "entityType": "individual"
            },
            "expectedClassification": "DUPLICATE",
            "networkComplexity": "moderate"
        },
        {
            "id": "enhanced_risky_individual",
            "name": "High Risk Individual - Multiple Indicators",
            "description": "Individual with multiple risk factors and suspicious network",
            "entityData": {
                "fullName": "Alexander Petrov",
                "dateOfBirth": "1970-12-01",
                "address": "789 International Blvd, Miami, FL 33101",
                "primaryIdentifier": "PASSPORT:555123456",
                "entityType": "individual"
            },
            "expectedClassification": "RISKY",
            "networkComplexity": "complex"
        },
        {
            "id": "enhanced_complex_organization",
            "name": "Complex Corporate Structure",
            "description": "Organization with intricate ownership network",
            "entityData": {
                "fullName": "Global Trading Solutions LLC",
                "entityType": "organization",
                "address": "1000 Corporate Plaza, New York, NY 10001",
                "primaryIdentifier": "EIN:12-3456789"
            },
            "expectedClassification": "RISKY",
            "networkComplexity": "very_complex"
        },
        {
            "id": "enhanced_pep_individual",
            "name": "Politically Exposed Person",
            "description": "Individual with political connections and elevated risk",
            "entityData": {
                "fullName": "Victoria Chen-Martinez",
                "dateOfBirth": "1968-07-10",
                "address": "555 Embassy Row, Washington, DC 20001",
                "primaryIdentifier": "PASSPORT:D123456789",
                "entityType": "individual"
            },
            "expectedClassification": "RISKY",
            "networkComplexity": "complex"
        }
    ]
    
    return {"scenarios": scenarios}

@router.post("/comprehensive-search")
async def perform_comprehensive_search(
    request: Dict[str, Any],
    unified_search_service: UnifiedSearchService = Depends(get_unified_search_service),
    atlas_search_service: AtlasSearchService = Depends(get_atlas_search_service),
    vector_search_service: VectorSearchService = Depends(get_vector_search_service),
) -> Dict[str, Any]:
    """
    Perform parallel Atlas and Vector search with intelligence correlation.
    """
    try:
        entity_data = request.get("entity", {})
        search_config = request.get("searchConfig", {})
        
        # Prepare search queries
        search_text = f"{entity_data.get('fullName', '')} {entity_data.get('address', '')}".strip()
        
        # Create a simple request object with the expected fields
        class SimpleEntitySearchRequest:
            def __init__(self, entity_name, entity_type, fuzzy_matching=True, address=None, phone=None, email=None, limit=50):
                self.entity_name = entity_name
                self.entity_type = entity_type
                self.fuzzy_matching = fuzzy_matching
                self.address = address
                self.phone = phone
                self.email = email
                self.limit = limit
        
        # Execute parallel searches
        atlas_task = asyncio.create_task(
            atlas_search_service.find_entity_matches(
                SimpleEntitySearchRequest(
                    entity_name=entity_data.get('fullName', ''),
                    entity_type=entity_data.get('entityType', 'individual'),
                    fuzzy_matching=True,
                    address=entity_data.get('address'),
                    limit=search_config.get('maxResults', 50)
                )
            )
        )
        
        vector_task = asyncio.create_task(
            vector_search_service.find_similar_entities_by_text(
                query_text=search_text,
                limit=search_config.get('maxResults', 50),
                similarity_threshold=search_config.get('confidenceThreshold', 0.3),
                filters={"entity_type": entity_data.get('entityType', 'individual')}
            )
        )
        
        # Wait for both searches to complete
        atlas_results, vector_results = await asyncio.gather(atlas_task, vector_task)
        
        # Process and correlate results with proper null checking
        atlas_entities = []
        vector_entities = []
        
        if atlas_results and hasattr(atlas_results, 'success') and atlas_results.success and atlas_results.data:
            atlas_entities = atlas_results.data
        
        if vector_results and hasattr(vector_results, 'success') and vector_results.success and vector_results.data:
            vector_entities = vector_results.data
        
        # Find intersection matches
        atlas_ids = {getattr(e, 'entity_id', None) for e in atlas_entities if hasattr(e, 'entity_id') and e.entity_id}
        vector_ids = {getattr(e, 'entity_id', None) for e in vector_entities if hasattr(e, 'entity_id') and e.entity_id}
        intersection_ids = atlas_ids & vector_ids
        
        # Combine results with deduplication
        combined_map = {}
        
        # Add Atlas results
        for match in atlas_entities:
            entity_id = getattr(match, 'entity_id', None)
            if entity_id:
                entity_data = getattr(match, 'entity_data', {})
                combined_map[entity_id] = {
                    "entityId": entity_id,
                    "name": entity_data.get("name", "") if isinstance(entity_data, dict) else "",
                    "entityType": entity_data.get("entity_type", "") if isinstance(entity_data, dict) else "",
                    "matchScore": getattr(match, 'confidence', None) or getattr(match, 'search_score', 0),
                    "score": getattr(match, 'search_score', 0),
                    "searchMethods": ["atlas"],
                    "isIntersection": entity_id in intersection_ids,
                    "matchReasons": getattr(match, 'match_reasons', []),
                    "entityData": entity_data
                }
        
        # Merge Vector results
        for match in vector_entities:
            entity_id = getattr(match, 'entity_id', None)
            if entity_id:
                entity_data = getattr(match, 'entity_data', {})
                score = getattr(match, 'confidence', None) or getattr(match, 'search_score', 0)
                if entity_id in combined_map:
                    # Merge scores and add vector method
                    combined_map[entity_id]["matchScore"] = (
                        combined_map[entity_id]["matchScore"] + score
                    ) / 2
                    combined_map[entity_id]["searchMethods"].append("vector")
                    combined_map[entity_id]["vectorScore"] = score
                else:
                    combined_map[entity_id] = {
                        "entityId": entity_id,
                        "name": entity_data.get("name", "") if isinstance(entity_data, dict) else "",
                        "entityType": entity_data.get("entity_type", "") if isinstance(entity_data, dict) else "",
                        "matchScore": score,
                        "score": getattr(match, 'search_score', 0),
                        "searchMethods": ["vector"],
                        "isIntersection": False,
                        "matchReasons": getattr(match, 'match_reasons', []),
                        "entityData": entity_data
                    }
        
        # Sort combined results by score
        combined_results = sorted(
            combined_map.values(),
            key=lambda x: (x.get("isIntersection", False), x.get("matchScore", 0)),
            reverse=True
        )
        
        # Calculate correlation metrics
        total_unique = len(combined_map)
        intersection_count = len(intersection_ids)
        correlation_percentage = (intersection_count / total_unique * 100) if total_unique > 0 else 0
        
        # Convert SearchMatch objects to dictionaries for response
        atlas_results_dict = []
        for match in atlas_entities:
            entity_data = getattr(match, 'entity_data', {})
            atlas_results_dict.append({
                "entityId": getattr(match, 'entity_id', ''),
                "name": entity_data.get("name", "") if isinstance(entity_data, dict) else "",
                "entityType": entity_data.get("entity_type", "") if isinstance(entity_data, dict) else "",
                "score": getattr(match, 'confidence', None) or getattr(match, 'search_score', 0),
                "matchReasons": getattr(match, 'match_reasons', []),
                "entityData": entity_data
            })
        
        vector_results_dict = []
        for match in vector_entities:
            entity_data = getattr(match, 'entity_data', {})
            vector_results_dict.append({
                "entityId": getattr(match, 'entity_id', ''),
                "name": entity_data.get("name", "") if isinstance(entity_data, dict) else "",
                "entityType": entity_data.get("entity_type", "") if isinstance(entity_data, dict) else "",
                "score": getattr(match, 'confidence', None) or getattr(match, 'search_score', 0),
                "matchReasons": getattr(match, 'match_reasons', []),
                "entityData": entity_data
            })
        
        return {
            "atlasResults": atlas_results_dict,
            "vectorResults": vector_results_dict,
            "combinedResults": combined_results,
            "topMatches": combined_results[:10],  # Top 10 matches
            "searchMetrics": {
                "atlasSearchTime": f"{getattr(atlas_results, 'search_time_ms', 0) or 0:.0f}ms",
                "vectorSearchTime": f"{getattr(vector_results, 'search_time_ms', 0) or 0:.0f}ms",
                "totalProcessingTime": f"{(getattr(atlas_results, 'search_time_ms', 0) or 0) + (getattr(vector_results, 'search_time_ms', 0) or 0):.0f}ms",
                "recordsProcessed": total_unique
            },
            "correlationAnalysis": {
                "intersectionCount": intersection_count,
                "atlasUniqueCount": len(atlas_ids - intersection_ids),
                "vectorUniqueCount": len(vector_ids - intersection_ids),
                "totalUniqueEntities": total_unique,
                "correlationPercentage": correlation_percentage,
                "confidenceScore": min(1.0, correlation_percentage / 100 + 0.3)
            }
        }
        
    except Exception as e:
        logger.error(f"Comprehensive search failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/analyze-intelligence")
async def analyze_intelligence(
    request: Dict[str, Any]
) -> Dict[str, Any]:
    """Analyze combined intelligence from search results."""
    
    try:
        search_results = request.get("searchResults", {})
        analysis_config = request.get("analysisConfig", {})
        
        # Extract results
        atlas_results = search_results.get("atlasResults", [])
        vector_results = search_results.get("vectorResults", [])
        combined_results = search_results.get("combinedResults", [])
        correlation = search_results.get("correlationAnalysis", {})
        
        # Analyze patterns
        patterns = []
        risk_indicators = []
        insights = []
        recommendations = []
        
        # Pattern: High concentration of high-risk entities
        high_risk_count = sum(1 for e in combined_results if e.get("riskAssessment", {}).get("overall", {}).get("score", 0) >= 70)
        if high_risk_count > len(combined_results) * 0.3:
            patterns.append({
                "type": "High Risk Concentration",
                "description": f"{high_risk_count} out of {len(combined_results)} matches have high risk scores",
                "severity": "high",
                "matchCount": high_risk_count,
                "confidence": 0.85
            })
            risk_indicators.append({
                "type": "Elevated Risk Network",
                "description": "The entity appears to be connected to multiple high-risk individuals",
                "level": "high",
                "score": 85
            })
        
        # Pattern: Name variations detected
        if correlation.get("correlationPercentage", 0) < 50:
            patterns.append({
                "type": "Name Variation Pattern",
                "description": "Low correlation between search methods suggests possible name variations or aliases",
                "severity": "medium",
                "confidence": 0.7
            })
            insights.append({
                "text": "Consider checking for aliases and alternate spellings. The low correlation between search methods indicates potential name variations.",
                "confidence": 0.75
            })
        
        # Generate insights based on results
        if correlation.get("intersectionCount", 0) > 5:
            insights.append({
                "text": f"Strong match confidence with {correlation['intersectionCount']} entities appearing in both search methods",
                "confidence": 0.9
            })
        
        # Risk assessment
        if any(e.get("watchlistMatches", []) for e in combined_results[:5]):
            risk_indicators.append({
                "type": "Watchlist Match",
                "description": "One or more potential matches appear on watchlists",
                "level": "high",
                "score": 90
            })
            recommendations.append({
                "title": "Enhanced Due Diligence Required",
                "description": "Watchlist matches detected. Recommend comprehensive background check and enhanced due diligence procedures.",
                "priority": "high",
                "action": "Escalate to compliance team for review"
            })
        
        # Recommendations based on analysis
        if correlation.get("correlationPercentage", 0) > 70:
            recommendations.append({
                "title": "High Confidence Match",
                "description": "Strong correlation between search methods suggests reliable matching. Consider automated processing.",
                "priority": "medium",
                "action": "Proceed with standard onboarding workflow"
            })
        else:
            recommendations.append({
                "title": "Manual Review Recommended",
                "description": "Low correlation between search methods. Manual review recommended to ensure accuracy.",
                "priority": "high",
                "action": "Route to manual review queue"
            })
        
        return {
            "correlationMatrix": {
                "overlapPercentage": correlation.get("correlationPercentage", 0),
                "confidenceScore": correlation.get("confidenceScore", 0),
                "intersectionCount": correlation.get("intersectionCount", 0),
                "divergenceCount": correlation.get("atlasUniqueCount", 0) + correlation.get("vectorUniqueCount", 0)
            },
            "patterns": patterns,
            "riskIndicators": risk_indicators,
            "confidenceMetrics": {
                "overall": correlation.get("confidenceScore", 0),
                "atlasConfidence": 0.8,  # Simulated
                "vectorConfidence": 0.75  # Simulated
            },
            "recommendations": recommendations,
            "insights": insights
        }
        
    except Exception as e:
        logger.error(f"Intelligence analysis failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/network-analysis")
async def perform_network_analysis(
    request: Dict[str, Any],
    network_service: NetworkAnalysisService = Depends(get_network_analysis_service)
) -> Dict[str, Any]:
    """Perform graph traversal and network analysis."""
    
    try:
        center_entity = request.get("centerEntity", {})
        related_entities = request.get("relatedEntities", [])
        analysis_config = request.get("analysisConfig", {})
        
        # Create a temporary entity ID for the new entity
        temp_entity_id = f"temp_{center_entity.get('fullName', '').replace(' ', '_')}_{datetime.now().timestamp()}"
        
        # Get entity IDs from related entities (top matches)
        entity_ids = [e.get("entityId") for e in related_entities if e.get("entityId")][:10]
        
        if not entity_ids:
            # Return empty network if no matches
            return {
                "networkData": {"nodes": [], "edges": []},
                "centralityMetrics": {},
                "riskPropagation": {},
                "networkStatistics": {},
                "hubEntities": [],
                "riskClusters": []
            }
        
        # Build network for the matched entities
        network_data = await network_service.build_entity_network(
            center_entity_id=entity_ids[0],  # Use first match as center
            max_depth=analysis_config.get("maxDepth", 2),
            min_confidence=analysis_config.get("minConfidence", 0.5),
            include_inactive=False,
            max_nodes=analysis_config.get("maxNodes", 100)
        )
        
        # Calculate centrality metrics
        centrality_metrics = await network_service.calculate_centrality_metrics(entity_ids)
        
        # Detect hub entities
        hub_entities = await network_service.detect_hub_entities(
            entity_ids=entity_ids,
            min_connections=2,
            limit=5
        )
        
        # Risk propagation analysis
        risk_propagation = await network_service.propagate_risk_scores(
            center_entity_id=entity_ids[0],
            network_data=network_data,
            propagation_depth=2
        )
        
        # Calculate network statistics
        total_nodes = len(network_data.get("nodes", []))
        total_edges = len(network_data.get("edges", []))
        
        # Risk distribution
        risk_distribution = {}
        for node in network_data.get("nodes", []):
            risk_level = node.get("riskLevel", "unknown").lower()
            risk_distribution[risk_level] = risk_distribution.get(risk_level, 0) + 1
        
        # Entity type distribution
        entity_type_distribution = {}
        for node in network_data.get("nodes", []):
            entity_type = node.get("entityType", "unknown")
            entity_type_distribution[entity_type] = entity_type_distribution.get(entity_type, 0) + 1
        
        return {
            "networkData": network_data,
            "centralityMetrics": centrality_metrics,
            "riskPropagation": {
                "networkRiskScore": risk_propagation.get("network_risk_score", 0),
                "highRiskConnections": len([n for n in network_data.get("nodes", []) if n.get("riskScore", 0) >= 70]),
                "riskClusters": []  # Simplified for now
            },
            "networkStatistics": {
                "basic_metrics": {
                    "total_nodes": total_nodes,
                    "total_edges": total_edges,
                    "avg_risk_score": sum(n.get("riskScore", 0) for n in network_data.get("nodes", [])) / max(total_nodes, 1)
                },
                "risk_distribution": risk_distribution,
                "entity_type_distribution": entity_type_distribution,
                "networkDensity": (2 * total_edges) / (total_nodes * (total_nodes - 1)) if total_nodes > 1 else 0
            },
            "hubEntities": hub_entities,
            "riskClusters": []
        }
        
    except Exception as e:
        logger.error(f"Network analysis failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/classify-entity")
async def classify_entity(
    request: Dict[str, Any]
) -> Dict[str, Any]:
    """Classify entity based on comprehensive analysis."""
    
    try:
        entity_data = request.get("entity", {})
        search_results = request.get("searchResults", {})
        intelligence = request.get("intelligence", {})
        network_analysis = request.get("networkAnalysis", {})
        classification_config = request.get("classificationConfig", {})
        
        # Initialize classification factors
        risk_factors = []
        suspicious_indicators = []
        risk_score = 0
        duplicate_probability = 0
        
        # Check for exact matches (potential duplicates)
        combined_results = search_results.get("combinedResults", [])
        high_confidence_matches = [e for e in combined_results if e.get("matchScore", 0) > 0.85]
        
        if high_confidence_matches:
            duplicate_probability = high_confidence_matches[0].get("matchScore", 0)
            if duplicate_probability > 0.9:
                classification = "DUPLICATE"
                reasoning = f"Found {len(high_confidence_matches)} high-confidence matches with similarity scores above 90%"
            else:
                # Check risk factors
                risk_indicators = intelligence.get("riskIndicators", [])
                high_risk_indicators = [r for r in risk_indicators if r.get("level") == "high"]
                
                if high_risk_indicators:
                    classification = "RISKY"
                    risk_score = max(r.get("score", 0) for r in high_risk_indicators)
                    reasoning = f"Identified {len(high_risk_indicators)} high-risk indicators"
                    
                    for indicator in high_risk_indicators:
                        risk_factors.append({
                            "type": indicator.get("type"),
                            "description": indicator.get("description"),
                            "severity": "high",
                            "score": indicator.get("score", 0),
                            "impact": "Requires enhanced due diligence"
                        })
                else:
                    classification = "SAFE"
                    reasoning = "No significant risk indicators found, low duplicate probability"
        else:
            # No matches found - likely safe new entity
            classification = "SAFE"
            reasoning = "No matching entities found in the system"
            risk_score = 20  # Low baseline risk
        
        # Add network risk factors
        network_risk = network_analysis.get("riskPropagation", {}).get("networkRiskScore", 0)
        if network_risk > 70:
            if classification != "RISKY":
                classification = "RISKY"
            risk_factors.append({
                "type": "High Network Risk",
                "description": f"Connected to high-risk network with score {network_risk}",
                "severity": "high",
                "score": network_risk
            })
        
        # Calculate final risk score
        if risk_factors:
            risk_score = max(risk_score, max(f.get("score", 0) for f in risk_factors))
        
        # Generate recommendations based on classification
        recommendations = []
        next_steps = []
        
        if classification == "SAFE":
            recommendations.append({
                "title": "Proceed with Standard Onboarding",
                "description": "Entity appears safe for standard onboarding process",
                "priority": "low"
            })
            next_steps.append({
                "action": "Complete KYC verification",
                "description": "Proceed with standard KYC documentation collection"
            })
            
        elif classification == "DUPLICATE":
            recommendations.append({
                "title": "Review Existing Records",
                "description": "High probability this is an existing customer. Review matches before proceeding.",
                "priority": "high"
            })
            next_steps.append({
                "action": "Merge or update existing record",
                "description": "Determine if this is the same entity and merge records if confirmed"
            })
            
        elif classification == "RISKY":
            recommendations.append({
                "title": "Enhanced Due Diligence Required",
                "description": "Multiple risk indicators detected. Escalate to compliance team.",
                "priority": "critical"
            })
            next_steps.append({
                "action": "Compliance team review",
                "description": "Route to compliance team for enhanced due diligence procedures"
            })
            suspicious_indicators.extend([
                {
                    "type": factor.get("type"),
                    "description": factor.get("description"),
                    "confidence": 0.8
                }
                for factor in risk_factors if factor.get("severity") == "high"
            ])
        
        return {
            "classification": classification,
            "confidence": 0.85 if classification != "SAFE" else 0.95,
            "riskScore": risk_score,
            "riskFactors": risk_factors,
            "duplicateProbability": duplicate_probability,
            "suspiciousIndicators": suspicious_indicators,
            "reasoning": reasoning,
            "recommendations": recommendations,
            "nextSteps": next_steps
        }
        
    except Exception as e:
        logger.error(f"Entity classification failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/deep-investigation")
async def perform_deep_investigation(
    request: Dict[str, Any]
) -> Dict[str, Any]:
    """Perform deep investigation with comprehensive analysis."""
    
    try:
        workflow_data = request.get("workflowData", {})
        investigation_config = request.get("investigationConfig", {})
        
        # Extract data from workflow
        entity_data = workflow_data.get("entityInput", {})
        search_results = workflow_data.get("searchResults", {})
        classification = workflow_data.get("classification", {})
        network_analysis = workflow_data.get("networkAnalysis", {})
        
        # Build investigation report
        investigation_report = {
            "overallRiskScore": classification.get("riskScore", 0),
            "finalClassification": classification.get("classification", "UNKNOWN"),
            "executiveSummary": f"Entity '{entity_data.get('fullName', 'Unknown')}' has been classified as {classification.get('classification', 'UNKNOWN')} "
                              f"with {classification.get('confidence', 0) * 100:.1f}% confidence. "
                              f"{classification.get('reasoning', 'No specific reasoning provided.')}",
            "investigationDate": datetime.now().isoformat()
        }
        
        # Timeline analysis
        timeline_analysis = [
            {
                "title": "Entity Onboarding Initiated",
                "type": "onboarding",
                "description": f"New {entity_data.get('entityType', 'entity')} onboarding request received",
                "timestamp": datetime.now().isoformat(),
                "impact": "low"
            }
        ]
        
        # Add search results to timeline
        if search_results.get("combinedResults"):
            timeline_analysis.append({
                "title": "Database Matches Found",
                "type": "search",
                "description": f"Found {len(search_results['combinedResults'])} potential matches in the system",
                "timestamp": datetime.now().isoformat(),
                "impact": "medium" if len(search_results['combinedResults']) > 5 else "low"
            })
        
        # Pattern correlations
        pattern_correlations = []
        if search_results.get("correlationAnalysis", {}).get("correlationPercentage", 0) < 50:
            pattern_correlations.append({
                "type": "Search Method Divergence",
                "summary": "Low correlation between Atlas and Vector search results",
                "description": "The entity shows different matching patterns across search methods, suggesting possible aliases or data quality issues",
                "confidence": 0.7,
                "entities": search_results.get("topMatches", [])[:3]
            })
        
        # Risk projections
        current_risk = classification.get("riskScore", 0)
        risk_projections = {
            "currentRisk": current_risk,
            "projectedRisk6Months": min(100, current_risk * 1.1),
            "projectedRisk1Year": min(100, current_risk * 1.2),
            "riskTrend": "increasing" if current_risk > 50 else "stable",
            "factors": [
                "Network connections",
                "Geographic risk factors",
                "Industry exposure"
            ]
        }
        
        # Detailed findings
        detailed_findings = []
        for risk_factor in classification.get("riskFactors", []):
            detailed_findings.append({
                "title": risk_factor.get("type", "Risk Factor"),
                "description": risk_factor.get("description", ""),
                "severity": risk_factor.get("severity", "medium"),
                "evidence": f"Detected during {classification.get('classification', '')} classification",
                "impact": risk_factor.get("impact", "Requires review"),
                "confidence": 0.8
            })
        
        # Expert recommendations
        expert_recommendations = []
        if classification.get("classification") == "RISKY":
            expert_recommendations.extend([
                {
                    "title": "Implement Enhanced Monitoring",
                    "recommendation": "Place entity under enhanced transaction monitoring for 12 months",
                    "rationale": "High risk indicators require ongoing surveillance",
                    "priority": "critical",
                    "action": "Configure enhanced monitoring rules"
                },
                {
                    "title": "Restricted Product Access",
                    "recommendation": "Limit access to high-risk products and services",
                    "rationale": "Minimize exposure until risk profile improves",
                    "priority": "high",
                    "action": "Apply product restrictions in core banking system"
                }
            ])
        elif classification.get("classification") == "DUPLICATE":
            expert_recommendations.append({
                "title": "Data Consolidation",
                "recommendation": "Merge duplicate records to maintain data integrity",
                "rationale": "Prevent operational issues from duplicate customer records",
                "priority": "high",
                "action": "Execute data merge procedure"
            })
        else:
            expert_recommendations.append({
                "title": "Standard Onboarding",
                "recommendation": "Proceed with standard onboarding procedures",
                "rationale": "No significant risk factors identified",
                "priority": "medium",
                "action": "Complete KYC documentation"
            })
        
        # Compliance assessment
        compliance_assessment = {
            "overallStatus": "COMPLIANT" if classification.get("classification") != "RISKY" else "REQUIRES_REVIEW",
            "complianceScore": 85 if classification.get("classification") == "SAFE" else 65,
            "summary": "Entity has been assessed according to AML/KYC regulations. " +
                      ("No compliance issues identified." if classification.get("classification") == "SAFE" 
                       else "Enhanced due diligence required for final compliance determination.")
        }
        
        # Actionable insights
        actionable_insights = [
            {
                "title": "Immediate Action Required",
                "description": expert_recommendations[0]["recommendation"] if expert_recommendations else "Complete standard review",
                "action": expert_recommendations[0]["action"] if expert_recommendations else "Proceed with onboarding"
            }
        ]
        
        if network_analysis.get("hubEntities"):
            actionable_insights.append({
                "title": "Network Influence",
                "description": f"Entity is connected to {len(network_analysis['hubEntities'])} influential entities in the network",
                "action": "Review network connections for additional risk factors"
            })
        
        return {
            "investigationReport": investigation_report,
            "timelineAnalysis": timeline_analysis,
            "patternCorrelations": pattern_correlations,
            "riskProjections": risk_projections,
            "detailedFindings": detailed_findings,
            "expertRecommendations": expert_recommendations,
            "complianceAssessment": compliance_assessment,
            "actionableInsights": actionable_insights
        }
        
    except Exception as e:
        logger.error(f"Deep investigation failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))