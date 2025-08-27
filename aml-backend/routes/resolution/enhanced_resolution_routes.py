"""
Enhanced Entity Resolution API Routes

Next-generation entity resolution with parallel search, network analysis,
and intelligent classification capabilities.
"""

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from typing import Dict, List, Optional, Any
from datetime import datetime
import asyncio
import time
import logging

from models.core.resolution import ResolutionDecision
from models.api.requests import EntitySearchRequest, UnifiedSearchRequest, CompleteEntitySearchRequest
from models.api.responses import HybridSearchResponse
from services.search.unified_search_service import UnifiedSearchService
from services.search.atlas_search_service import AtlasSearchService
from services.search.vector_search_service import VectorSearchService
from services.search.hybrid_search_service import HybridSearchService
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
from repositories.factory.repository_factory import get_vector_search_repository

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/resolution", tags=["Enhanced Entity Resolution"])

def extract_search_score(entity):
    """
    Extract search score from any entity object, regardless of field name or structure.
    Handles both SearchMatch objects and raw dictionaries.
    """
    if hasattr(entity, 'search_score'):
        return float(entity.search_score) if entity.search_score else 0.0
    elif isinstance(entity, dict):
        # Try all possible score field names
        for field in ['matchScore', 'search_score', 'similarity_score', 'score']:
            if field in entity and entity[field] is not None:
                return float(entity[field])
    return 0.0

def extract_entity_id(entity):
    """
    Extract entity ID consistently, prioritizing business entityId over MongoDB _id.
    """
    if hasattr(entity, 'entity_id'):
        # SearchMatch object - check entity_data first
        entity_data = getattr(entity, 'entity_data', {})
        if isinstance(entity_data, dict) and entity_data.get("entityId"):
            return str(entity_data.get("entityId"))
        return str(entity.entity_id)
    elif isinstance(entity, dict):
        # Raw dictionary - prioritize entityId over _id
        return str(entity.get("entityId") or entity.get("_id") or "")
    return ""


@router.get("/demo-scenarios-enhanced")
async def get_enhanced_demo_scenarios() -> Dict[str, Any]:
    """Get enhanced demo scenarios for testing entity resolution workflows."""
    
    scenarios = [
        # SAFE CATEGORY (Low Risk) - 3 Options
        {
            "id": "safe_individual_1",
            "name": "Safe Individual - Lisa Anderson",
            "description": "Generic low-risk individual from Brazil",
            "entityData": {
                "fullName": "Lisa Anderson",
                "address": "269 Brian Trail, Freybury, 89323, Brazil",
                "entityType": "individual"
            },
            "expectedClassification": "SAFE",
            "networkComplexity": "simple"
        },
        {
            "id": "safe_individual_2",
            "name": "Safe Individual - Simone Weber",
            "description": "Generic low-risk individual from Brazil",
            "entityData": {
                "fullName": "Simone Weber",
                "address": "84 White groves, East Julie, 13119, Brazil",
                "entityType": "individual"
            },
            "expectedClassification": "SAFE",
            "networkComplexity": "simple"
        },
        {
            "id": "safe_individual_3",
            "name": "Safe Individual - Célina Barron",
            "description": "Generic low-risk individual from Canada",
            "entityData": {
                "fullName": "Célina Barron",
                "address": "23220 Brandon Station, Martinezview, PE, 56544, Canada",
                "entityType": "individual"
            },
            "expectedClassification": "SAFE",
            "networkComplexity": "simple"
        },
        
        # DUPLICATE CATEGORY - 3 Options
        {
            "id": "duplicate_individual_1",
            "name": "Duplicate - Mark Santiago",
            "description": "Subtle duplicate cluster member",
            "entityData": {
                "fullName": "Mark Santiago",
                "address": "Studio 53r Green locks, Apt 63B, Ollivierdan, 25708, United Kingdom",
                "entityType": "individual"
            },
            "expectedClassification": "DUPLICATE",
            "networkComplexity": "moderate"
        },
        {
            "id": "duplicate_individual_2", 
            "name": "Duplicate - Chr Luce Benthin",
            "description": "Clear duplicate set member",
            "entityData": {
                "fullName": "Chr Luce Benthin",
                "address": "91 Fox isle, Carre, DC 99565, USA",
                "entityType": "individual"
            },
            "expectedClassification": "DUPLICATE",
            "networkComplexity": "moderate"
        },
        {
            "id": "duplicate_individual_3",
            "name": "Duplicate - Bernadette Griffin",
            "description": "Household set member with address similarity",
            "entityData": {
                "fullName": "Bernadette Griffin",
                "address": "Marlene-Schmidtke-Gasse 8, Saint Alice, ND 57636, USA",
                "entityType": "individual"
            },
            "expectedClassification": "DUPLICATE",
            "networkComplexity": "moderate"
        },
        
        # HIGH RISK CATEGORY - 3 Options
        {
            "id": "high_risk_org_1",
            "name": "High Risk - Strategic Consultants",
            "description": "Shell company candidate from Malta",
            "entityData": {
                "fullName": "Strategic Consultants Ltd. Industries",
                "address": "Flat 28h Evans squares, Moorechester, 26013, Malta",
                "entityType": "organization"
            },
            "expectedClassification": "RISKY",
            "networkComplexity": "complex"
        },
        {
            "id": "high_risk_org_2",
            "name": "High Risk - BrotSequi Enterprises",
            "description": "Sanctioned organization from Syria",
            "entityData": {
                "fullName": "BrotSequi Enterprises",
                "address": "Studio 92 Cooke cove, North Ashley, Y3G 1V1, Syria",
                "entityType": "organization"
            },
            "expectedClassification": "RISKY",
            "networkComplexity": "complex"
        },
        {
            "id": "high_risk_org_3",
            "name": "High Risk - Zorbach Holdings",
            "description": "Sanctioned organization from Panama",
            "entityData": {
                "fullName": "Zorbach Holdings LLC",
                "address": "8207 Alicia Orchard, Nicholasville, K1H 6J6, Panama",
                "entityType": "organization"
            },
            "expectedClassification": "RISKY",
            "networkComplexity": "complex"
        },
        
        # COMPLEX CORPORATE STRUCTURE - 3 Options
        {
            "id": "complex_corp_1",
            "name": "Complex Corp - NoneAbandonner LLC",
            "description": "Complex organizational substructure from Hong Kong",
            "entityData": {
                "fullName": "NoneAbandonner LLC",
                "address": "9754 Michael Extensions Suite 076, Lake Chelseastad, DG0 3ZW, Hong Kong",
                "entityType": "organization"
            },
            "expectedClassification": "RISKY",
            "networkComplexity": "very_complex"
        },
        {
            "id": "complex_corp_2",
            "name": "Complex Corp - Rodriguez Holdings",
            "description": "Complex logistics holding structure",
            "entityData": {
                "fullName": "Rodriguez Holdings Logistics",
                "address": "388 Lopez Squares Apt. 778, West Angela, PO8Y 3GD, Hong Kong",
                "entityType": "organization"
            },
            "expectedClassification": "RISKY",
            "networkComplexity": "very_complex"
        },
        {
            "id": "complex_corp_3",
            "name": "Complex Corp - Deploy Trading",
            "description": "Complex trading corporation from Germany",
            "entityData": {
                "fullName": "deploy Trading Corp.",
                "address": "rue Louis, Potiernec, 01800, Germany",
                "entityType": "organization"
            },
            "expectedClassification": "RISKY",
            "networkComplexity": "very_complex"
        },
        
        # POLITICALLY EXPOSED PERSON (PEP) - 3 Options
        {
            "id": "pep_individual_1",
            "name": "PEP - Betti Arnaude Barton",
            "description": "Politically exposed person from South Africa",
            "entityData": {
                "fullName": "Betti Arnaude Barton",
                "address": "9, avenue de Bouvet, Fritzville, J2K 7K7, South Africa",
                "entityType": "individual"
            },
            "expectedClassification": "RISKY",
            "networkComplexity": "complex"
        },
        {
            "id": "pep_individual_2",
            "name": "PEP - Karen Gérard Atzler",
            "description": "Politically exposed person from Bahrain",
            "entityData": {
                "fullName": "Karen Gérard Atzler",
                "address": "055 Tiffany Points Suite 709, Hammelburg, Y2N 7T5, Bahrain",
                "entityType": "individual"
            },
            "expectedClassification": "RISKY",
            "networkComplexity": "complex"
        },
        {
            "id": "pep_individual_3",
            "name": "PEP - Charlene Angela Moran",
            "description": "Politically exposed person from Germany",
            "entityData": {
                "fullName": "Charlene Angela Moran",
                "address": "3484 Gonzalez Summit, North Kylemouth, Schleswig-Holstein, 50999, Germany",
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
    atlas_search_service: AtlasSearchService = Depends(get_atlas_search_service),
    vector_search_service: VectorSearchService = Depends(get_vector_search_service),
    vector_search_repo = Depends(get_vector_search_repository),
) -> Dict[str, Any]:
    """
    Perform Atlas, Vector, and Hybrid searches - returns all three result sets
    """
    try:
        request_entity_data = request.get("entity", {})
        search_config = request.get("searchConfig", {})
        
        # Create proper request object with all expected fields for Atlas Search
        search_request = CompleteEntitySearchRequest(
            entity_name=request_entity_data.get('fullName', ''),
            entity_type=request_entity_data.get('entityType', 'individual'),
            fuzzy_matching=True,
            address=request_entity_data.get('address'),
            phone=request_entity_data.get('phone'),
            email=request_entity_data.get('email'),
            limit=search_config.get('maxResults', 10)  # Reduced to 10
        )
        
        # Generate embedding from entity onboarding data for vector search
        logger.info("Generating embedding for entity onboarding data")
        query_embedding = await vector_search_repo.generate_entity_embedding(request_entity_data)
        
        # Execute parallel searches
        atlas_task = asyncio.create_task(
            atlas_search_service.find_entity_matches(search_request)
        )
        
        # Use proper vector search with generated embeddings
        if query_embedding:
            logger.info(f"Using vector search with {len(query_embedding)}-dimensional embedding")
            vector_task = asyncio.create_task(
                vector_search_repo.find_similar_by_vector(
                    query_vector=query_embedding,
                    limit=search_config.get('maxResults', 10),
                    similarity_threshold=search_config.get('confidenceThreshold', 0.3),
                    filters={"entityType": request_entity_data.get('entityType', 'individual')}
                )
            )
        else:
            logger.warning("Failed to generate embedding, falling back to text search")
            # Fallback to text search if embedding generation fails
            search_text = f"{request_entity_data.get('fullName', '')} {request_entity_data.get('address', '')}".strip()
            vector_task = asyncio.create_task(
                vector_search_service.find_similar_entities_by_text(
                    query_text=search_text,
                    limit=search_config.get('maxResults', 10),
                    similarity_threshold=search_config.get('confidenceThreshold', 0.3),
                    filters={"entity_type": request_entity_data.get('entityType', 'individual')}
                )
            )
        
        # Wait for both searches to complete
        atlas_results, vector_results = await asyncio.gather(atlas_task, vector_task)
        
        # Process and correlate results with proper null checking
        atlas_entities = []
        vector_entities = []
        
        if atlas_results and hasattr(atlas_results, 'success') and atlas_results.success and atlas_results.data:
            atlas_entities = atlas_results.data
        
        # Handle vector results from repository (list of documents) or service (SearchResponse)
        if vector_results:
            if isinstance(vector_results, list):
                # Direct repository results - list of MongoDB documents with similarity scores
                vector_entities = vector_results
            elif hasattr(vector_results, 'success') and vector_results.success and vector_results.data:
                # Service results - SearchResponse object
                vector_entities = vector_results.data
        
        
        # Convert SearchMatch objects to dictionaries for response
        atlas_results_dict = []
        for match in atlas_entities:
            # Handle both SearchMatch objects and raw MongoDB documents - same logic as vector search
            if hasattr(match, 'entity_id'):
                # SearchMatch object
                entity_id = match.entity_id
                entity_data = getattr(match, 'entity_data', {})
                search_score = getattr(match, 'search_score', 0)
                match_reasons = getattr(match, 'match_reasons', ["Atlas search"])
            elif isinstance(match, dict):
                # Raw MongoDB document
                entity_id = match.get("entityId", "")
                entity_data = match
                search_score = match.get("search_score", 0)
                match_reasons = ["Atlas search"]
            else:
                continue
                
            # Extract name - handle both simple string and nested object
            name = ""
            if isinstance(entity_data, dict):
                name_obj = entity_data.get("name", {})
                if isinstance(name_obj, dict):
                    name = name_obj.get("full", "") or name_obj.get("display", "")
                else:
                    name = str(name_obj) if name_obj else ""
            
            # Extract risk assessment
            risk_assessment = entity_data.get("riskAssessment", {}) if isinstance(entity_data, dict) else {}
            overall_risk = risk_assessment.get("overall", {}) if isinstance(risk_assessment, dict) else {}
            risk_score = overall_risk.get("score", 0) if isinstance(overall_risk, dict) else 0
            risk_level = overall_risk.get("level", "unknown") if isinstance(overall_risk, dict) else "unknown"
            
            atlas_results_dict.append({
                "entityId": entity_id,
                "name": name,
                "entityType": entity_data.get("entityType", "Unknown") if isinstance(entity_data, dict) else "Unknown",
                "matchScore": search_score,
                "entityData": entity_data,
                "riskAssessment": {
                    "overall": {
                        "score": risk_score,
                        "level": risk_level
                    }
                }
            })
        
        vector_results_dict = []
        for match in vector_entities:
            # Handle both SearchMatch objects and raw MongoDB documents
            if hasattr(match, 'entity_id'):
                # SearchMatch object
                entity_id = match.entity_id
                entity_data = getattr(match, 'entity_data', {})
                search_score = getattr(match, 'search_score', 0)
                match_reasons = getattr(match, 'match_reasons', ["Vector similarity"])
            elif isinstance(match, dict):
                # Raw MongoDB document
                entity_id = match.get("entityId", "")
                entity_data = match
                search_score = match.get("similarity_score", 0)
                match_reasons = ["Vector similarity"]
            else:
                continue
                
            # Extract name - handle both simple string and nested object
            name = ""
            if isinstance(entity_data, dict):
                name_obj = entity_data.get("name", {})
                if isinstance(name_obj, dict):
                    name = name_obj.get("full", "") or name_obj.get("display", "")
                else:
                    name = str(name_obj) if name_obj else ""
            
            # Extract risk assessment
            risk_assessment = entity_data.get("riskAssessment", {}) if isinstance(entity_data, dict) else {}
            overall_risk = risk_assessment.get("overall", {}) if isinstance(risk_assessment, dict) else {}
            risk_score = overall_risk.get("score", 0) if isinstance(overall_risk, dict) else 0
            risk_level = overall_risk.get("level", "unknown") if isinstance(overall_risk, dict) else "unknown"
            
            vector_results_dict.append({
                "entityId": entity_id,
                "name": name,
                "entityType": entity_data.get("entityType", "Unknown") if isinstance(entity_data, dict) else "Unknown",
                "matchScore": search_score,
                "entityData": entity_data,
                "riskAssessment": {
                    "overall": {
                        "score": risk_score,
                        "level": risk_level
                    }
                }
            })
        
        # HYBRID SEARCH using $rankFusion
        hybrid_results = []
        hybrid_search_time = 0
        
        try:
            # Prepare hybrid search parameters - use original request entity data
            name_text = request_entity_data.get('fullName', '')
            address_text = request_entity_data.get('address', '')
            
            query_text = f"{name_text} {address_text}".strip()
            
            # Skip hybrid search if no query text
            if not query_text:
                logger.error(f"❌ Cannot perform hybrid search: no valid query text found. Request entity data keys: {list(request_entity_data.keys())}")
                raise Exception("No valid query text found for hybrid search")
            
            max_results = search_config.get('maxResults', 10)
            atlas_weight = search_config.get('atlasWeight', 1)
            vector_weight = search_config.get('vectorWeight', 1)
            
            logger.info(f"🔀 Starting hybrid search with query: '{query_text}', weights: atlas={atlas_weight}, vector={vector_weight}")
            
            # Get entity collection from vector search repository
            entity_collection = vector_search_repo.collection
            
            # Create hybrid search service
            hybrid_service = HybridSearchService(entity_collection)
            
            # Perform hybrid search using $rankFusion
            hybrid_start = time.time()
            hybrid_response = await hybrid_service.hybrid_entity_search(
                query_text=query_text,
                query_embedding=query_embedding,
                limit=max_results,
                atlas_weight=atlas_weight,
                vector_weight=vector_weight
            )
            hybrid_search_time = (time.time() - hybrid_start) * 1000
            
            # Convert hybrid results to dictionary format for frontend
            for result in hybrid_response.hybridResults:
                entity_data_dict = result.entity_data
                
                # Convert ObjectIds to strings for JSON serialization
                if isinstance(entity_data_dict, dict):
                    if "_id" in entity_data_dict:
                        entity_data_dict["_id"] = str(entity_data_dict["_id"])
                    if "entityId" in entity_data_dict:
                        entity_data_dict["entityId"] = str(entity_data_dict["entityId"])
                
                # Extract name - handle both simple string and nested object
                name = ""
                if isinstance(entity_data_dict, dict):
                    name_obj = entity_data_dict.get("name", {})
                    if isinstance(name_obj, dict):
                        name = name_obj.get("full", "") or name_obj.get("display", "")
                    else:
                        name = str(name_obj) if name_obj else ""
                
                # Extract risk assessment
                risk_assessment = entity_data_dict.get("riskAssessment", {}) if isinstance(entity_data_dict, dict) else {}
                overall_risk = risk_assessment.get("overall", {}) if isinstance(risk_assessment, dict) else {}
                risk_score = overall_risk.get("score", 0) if isinstance(overall_risk, dict) else 0
                risk_level = overall_risk.get("level", "unknown") if isinstance(overall_risk, dict) else "unknown"
                
                hybrid_results.append({
                    "entityId": str(result.entity_id),
                    "name": name,
                    "entityType": entity_data_dict.get("entityType", "Unknown") if isinstance(entity_data_dict, dict) else "Unknown",
                    "hybridScore": result.hybrid_score,
                    "atlasScore": result.atlas_score,
                    "vectorScore": result.vector_score,
                    "text_contribution_percent": result.text_contribution_percent,
                    "vector_contribution_percent": result.vector_contribution_percent,
                    "entityData": entity_data_dict,
                    "rankFusionDetails": result.rank_fusion_details,
                    "riskAssessment": {
                        "overall": {
                            "score": risk_score,
                            "level": risk_level
                        }
                    }
                })
            
            logger.info(f"✅ Hybrid search completed in {hybrid_search_time:.2f}ms, found {len(hybrid_results)} results")
            
        except Exception as e:
            logger.error(f"❌ Hybrid search failed: {str(e)}")
            # Continue without hybrid results if it fails
            pass
        
        return {
            "atlasResults": atlas_results_dict,
            "vectorResults": vector_results_dict,
            "hybridResults": hybrid_results,
            "searchMetrics": {
                "recordsProcessed": len(atlas_results_dict) + len(vector_results_dict),
                "hybridSearchTime": f"{hybrid_search_time:.2f}ms" if hybrid_search_time > 0 else "N/A"
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
        correlation = search_results.get("correlationAnalysis", {})
        
        # Analyze patterns
        patterns = []
        risk_indicators = []
        insights = []
        recommendations = []
        
        # Pattern: High concentration of high-risk entities
        all_results = atlas_results + vector_results
        high_risk_count = sum(1 for e in all_results if e.get("riskAssessment", {}).get("overall", {}).get("score", 0) >= 70)
        if high_risk_count > len(all_results) * 0.3:
            patterns.append({
                "type": "High Risk Concentration",
                "description": f"{high_risk_count} out of {len(all_results)} matches have high risk scores",
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
        if any(e.get("watchlistMatches", []) for e in all_results[:5]):
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
        atlas_results = search_results.get("atlasResults", [])
        vector_results = search_results.get("vectorResults", [])
        all_results = atlas_results + vector_results
        high_confidence_matches = [e for e in all_results if e.get("matchScore", 0) > 0.85]
        
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

@router.post("/hybrid-network-risk-analysis")
async def analyze_hybrid_search_network_risk(
    request: Dict[str, Any],
    network_service: NetworkAnalysisService = Depends(get_network_analysis_service)
) -> Dict[str, Any]:
    """
    Analyze network risks for the top-ranked entity from hybrid search results
    
    This endpoint implements the enhanced network risk analysis workflow that:
    1. Targets the FIRST entity from hybrid search results (highest ranked match)
    2. Performs comprehensive relationship + transaction network analysis
    3. Detects suspicious patterns and problematic links
    4. Returns actionable risk assessment with recommendations
    
    Key Enhancement: Instead of analyzing the input entity, this analyzes the
    most relevant search match to provide meaningful risk intelligence.
    """
    try:
        logger.info("🔍 Starting hybrid network risk analysis for top search result")
        
        # Extract request data
        hybrid_results = request.get("hybrid_results", [])
        analysis_config = request.get("analysis_config", {})
        
        if not hybrid_results:
            raise HTTPException(status_code=400, detail="No hybrid search results provided")
        
        # Step 1: Extract first (top-ranked) entity from hybrid results
        top_entity = hybrid_results[0]
        target_entity_id = extract_entity_id(top_entity)
        
        if not target_entity_id:
            raise HTTPException(status_code=400, detail="Unable to extract entity ID from top search result")
        
        logger.info(f"🎯 Analyzing network risks for top hybrid result: {target_entity_id}")
        
        # Step 2: Comprehensive relationship network analysis
        max_depth = analysis_config.get("max_relationship_depth", 3)
        risk_threshold = analysis_config.get("risk_threshold", 0.6)
        
        relationship_risk_analysis = await network_service.calculate_network_risk_score(
            entity_id=target_entity_id,
            analysis_depth=max_depth
        )
        
        # Step 3: Enhanced centrality and hub analysis
        centrality_analysis = await network_service.analyze_network_centrality([target_entity_id])
        
        # Step 4: Suspicious pattern detection
        suspicious_patterns = await network_service.detect_suspicious_patterns(
            entity_ids=[target_entity_id],
            pattern_types=["circular_relationships", "hub_entities", "isolated_clusters"]
        )
        
        # Step 5: Calculate comprehensive network risk score
        base_risk = relationship_risk_analysis.get("risk_analysis", {}).get("base_risk_score", 0) if relationship_risk_analysis.get("success") else 0
        network_risk = relationship_risk_analysis.get("risk_analysis", {}).get("network_risk_score", 0) if relationship_risk_analysis.get("success") else 0
        
        # Pattern risk scoring
        pattern_risk_score = 0
        if suspicious_patterns.get("success") and suspicious_patterns.get("patterns_detected"):
            pattern_count = suspicious_patterns.get("total_patterns", 0)
            if pattern_count > 0:
                pattern_risk_score = min(pattern_count * 15, 40)  # Max 40 points from patterns
        
        # Centrality risk scoring
        centrality_risk_score = 0
        if centrality_analysis.get("success") and centrality_analysis.get("key_entities"):
            key_entity_count = len(centrality_analysis.get("key_entities", []))
            if key_entity_count > 0:
                centrality_risk_score = min(key_entity_count * 10, 20)  # Max 20 points from centrality
        
        # Comprehensive risk calculation (0-100 scale)
        comprehensive_risk_score = min(
            base_risk * 0.3 +  # Base entity risk (30%)
            network_risk * 0.4 +  # Network connection risk (40%)
            pattern_risk_score * 0.2 +  # Suspicious patterns (20%)
            centrality_risk_score * 0.1,  # Centrality influence (10%)
            100.0
        )
        
        # Step 6: Risk level categorization
        if comprehensive_risk_score >= 80:
            risk_level = "critical"
        elif comprehensive_risk_score >= 60:
            risk_level = "high"
        elif comprehensive_risk_score >= 40:
            risk_level = "medium"
        else:
            risk_level = "low"
        
        # Step 7: Identify problematic relationships
        problematic_relationships = []
        if relationship_risk_analysis.get("success"):
            high_risk_connections = relationship_risk_analysis.get("risk_analysis", {}).get("high_risk_connections", 0)
            if high_risk_connections > 0:
                problematic_relationships.append({
                    "type": "high_risk_connections",
                    "count": high_risk_connections,
                    "description": f"Entity has {high_risk_connections} connections to high-risk entities",
                    "severity": "high" if high_risk_connections > 3 else "medium"
                })
        
        # Add suspicious pattern relationships
        if suspicious_patterns.get("success") and suspicious_patterns.get("patterns_detected"):
            for pattern_type, patterns in suspicious_patterns.get("patterns_detected", {}).items():
                if patterns:
                    problematic_relationships.append({
                        "type": pattern_type,
                        "count": len(patterns),
                        "description": f"Detected {len(patterns)} instances of {pattern_type.replace('_', ' ')}",
                        "severity": "high" if pattern_type == "circular_relationships" else "medium"
                    })
        
        # Step 8: Generate actionable recommendations
        recommendations = []
        
        if risk_level == "critical":
            recommendations.extend([
                {
                    "title": "Immediate Investigation Required",
                    "description": "Critical risk indicators detected in network analysis",
                    "priority": "critical",
                    "action": "Escalate to senior compliance team immediately"
                },
                {
                    "title": "Enhanced Monitoring",
                    "description": "Implement continuous monitoring of all network connections",
                    "priority": "high",
                    "action": "Configure real-time network risk alerts"
                }
            ])
        elif risk_level == "high":
            recommendations.extend([
                {
                    "title": "Enhanced Due Diligence",
                    "description": "High-risk network connections require detailed investigation",
                    "priority": "high",
                    "action": "Conduct enhanced KYC procedures"
                },
                {
                    "title": "Network Relationship Review",
                    "description": "Analyze all high-risk relationship connections",
                    "priority": "medium",
                    "action": "Document and verify all business relationships"
                }
            ])
        elif risk_level == "medium":
            recommendations.append({
                "title": "Standard Enhanced Review",
                "description": "Some network risk indicators detected",
                "priority": "medium",
                "action": "Perform additional verification of key relationships"
            })
        else:
            recommendations.append({
                "title": "Proceed with Standard Process",
                "description": "No significant network risk indicators detected",
                "priority": "low",
                "action": "Continue with standard onboarding procedures"
            })
        
        # Step 9: Fetch actual network data for visualization
        network_data = None
        transaction_analysis = {}
        
        try:
            from repositories.interfaces.network_repository import NetworkQueryParams
            
            # Build actual network for visualization
            query_params = NetworkQueryParams(
                center_entity_id=target_entity_id,
                max_depth=min(max_depth, 2),  # Limit depth for performance
                min_confidence=0.4,
                only_active=True,
                max_entities=50  # Reasonable limit for visualization
            )
            
            network_response = await network_service.network_repo.build_entity_network(query_params)
            
            if network_response and network_response.nodes:
                # Convert NetworkNode and NetworkEdge objects to dictionaries for JSON serialization
                nodes = []
                for node in network_response.nodes:
                    nodes.append({
                        "id": node.entity_id,
                        "label": node.entity_name,
                        "type": node.entity_type,
                        "riskLevel": node.risk_level.value if hasattr(node.risk_level, 'value') else str(node.risk_level),
                        "riskScore": getattr(node, 'risk_score', 0) * 100,  # Convert to 0-100 scale
                        "isCenter": getattr(node, 'is_center', False),
                        "connectionCount": getattr(node, 'connection_count', 0),
                        "entityType": node.entity_type
                    })
                
                edges = []
                for edge in network_response.edges:
                    edges.append({
                        "id": f"{edge.source_id}-{edge.target_id}",
                        "source": edge.source_id,
                        "target": edge.target_id,
                        "relationshipType": edge.relationship_type.value if hasattr(edge.relationship_type, 'value') else str(edge.relationship_type),
                        "confidence": edge.confidence,
                        "weight": edge.weight,
                        "verified": edge.verified
                    })
                
                network_data = {
                    "nodes": nodes,
                    "edges": edges,
                    "metadata": {
                        "centerEntityId": target_entity_id,
                        "totalEntities": network_response.total_entities,
                        "totalRelationships": network_response.total_relationships,
                        "maxDepthReached": network_response.max_depth_reached
                    },
                    "statistics": network_response.statistics or {}  # Include statistics for frontend
                }
                
                logger.info(f"🕸️ Network data fetched for visualization: {len(nodes)} nodes, {len(edges)} edges")
            
        except Exception as e:
            logger.warning(f"Failed to fetch network data for visualization: {e}")
            # Continue without network data - the risk analysis is still valuable
        
        # Step 9b: Add basic transaction analysis (simplified for now)
        try:
            # Enhanced transaction analysis using actual transactionsv2 collection
            from repositories.impl.transaction_repository import TransactionRepository
            from dependencies import get_database
            
            # Get transaction repository to query transactionsv2 collection
            db = get_database()
            transactions_collection = db.transactionsv2
            transaction_repo = TransactionRepository(transactions_collection)
            
            # Get transaction activity for the target entity
            transaction_activity = await transaction_repo.get_entity_transactions(
                entity_id=target_entity_id,
                limit=100,  # Analyze up to 100 recent transactions
                skip=0
            )
            
            # Calculate transaction risk metrics
            transactions = transaction_activity.transactions if transaction_activity else []
            total_volume = sum(t.amount for t in transactions)
            high_risk_count = sum(1 for t in transactions if getattr(t, 'risk_score', 0) >= 70)
            avg_risk_score = sum(getattr(t, 'risk_score', 0) for t in transactions) / len(transactions) if transactions else 0
            
            # Enhanced transaction analysis with real data
            transaction_analysis = {
                "transaction_risk_score": int(avg_risk_score),
                "high_risk_transactions": high_risk_count,
                "transaction_volume": int(total_volume),
                "total_transactions": len(transactions),
                "avg_transaction_amount": int(total_volume / len(transactions)) if transactions else 0,
                "analysis_note": f"Analyzed {len(transactions)} transactions from transactionsv2 collection"
            }
            
            logger.info(f"📊 Real transaction analysis completed for entity {target_entity_id}: {len(transactions)} transactions, ${total_volume:,.2f} volume, {high_risk_count} high-risk")
            
        except Exception as e:
            logger.warning(f"Failed to analyze transactions from transactionsv2: {e}")
            # Fallback to basic analysis
            transaction_analysis = {
                "transaction_risk_score": 0,
                "high_risk_transactions": 0,
                "transaction_volume": 0,
                "total_transactions": 0,
                "analysis_note": f"Transaction analysis not available: {str(e)}"
            }

        # Step 10: Prepare comprehensive response
        response = {
            "success": True,
            "target_entity": {
                "entity_id": target_entity_id,
                "entity_name": top_entity.get("name", "Unknown"),
                "entity_type": top_entity.get("entityType", "unknown"),
                "hybrid_score": top_entity.get("hybridScore", 0),
                "rank_in_results": 1  # Always first result
            },
            "network_data": network_data,  # Add network data for visualization
            "comprehensive_risk_analysis": {
                "overall_risk_score": comprehensive_risk_score,
                "risk_level": risk_level,
                "confidence": 0.85,
                "risk_breakdown": {
                    "base_entity_risk": base_risk,
                    "relationship_network_risk": network_risk,
                    "suspicious_pattern_risk": pattern_risk_score,
                    "centrality_influence_risk": centrality_risk_score
                }
            },
            "relationship_analysis": relationship_risk_analysis.get("risk_analysis", {}) if relationship_risk_analysis.get("success") else {},
            "transaction_analysis": transaction_analysis,  # Add transaction analysis
            "centrality_analysis": centrality_analysis if centrality_analysis.get("success") else {},
            "suspicious_patterns": suspicious_patterns.get("patterns_detected", {}) if suspicious_patterns.get("success") else {},
            "problematic_relationships": problematic_relationships,
            "recommendations": recommendations,
            "analysis_metadata": {
                "analysis_timestamp": datetime.now().isoformat(),
                "target_entity_source": "first_hybrid_search_result",
                "analysis_depth": max_depth,
                "risk_threshold_used": risk_threshold,
                "total_network_entities_analyzed": relationship_risk_analysis.get("risk_analysis", {}).get("total_connections", 0) if relationship_risk_analysis.get("success") else 0
            }
        }
        
        logger.info(f"✅ Hybrid network risk analysis completed - Risk Level: {risk_level}, Score: {comprehensive_risk_score:.1f}")
        
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Hybrid network risk analysis failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Network risk analysis failed: {str(e)}")

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
        atlas_results = search_results.get("atlasResults", [])
        vector_results = search_results.get("vectorResults", [])
        total_matches = len(atlas_results) + len(vector_results)
        if total_matches > 0:
            timeline_analysis.append({
                "title": "Database Matches Found",
                "type": "search",
                "description": f"Found {total_matches} potential matches in the system",
                "timestamp": datetime.now().isoformat(),
                "impact": "medium" if total_matches > 5 else "low"
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