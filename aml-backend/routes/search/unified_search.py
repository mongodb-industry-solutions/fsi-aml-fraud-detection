"""
Unified Search Routes - Combined Atlas and Vector Search orchestration

Focused routes for unified search capabilities using UnifiedSearchService:
- Combined Atlas Search and Vector Search intelligence
- Correlation analysis and intersection discovery
- Search method recommendation and optimization
- Comprehensive entity discovery workflows
"""

import logging
from typing import Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException, status

from models.unified_search import (
    UnifiedSearchRequest,
    UnifiedSearchResponse,
    DemoScenario,
    DemoScenarioResponse
)
from models.api.responses import ErrorResponse
from services.dependencies import get_unified_search_service
from services.search.unified_search_service import UnifiedSearchService

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/search/unified",
    tags=["Unified Search"],
    responses={
        400: {"model": ErrorResponse, "description": "Bad request"},
        500: {"model": ErrorResponse, "description": "Internal server error"}
    }
)


@router.post("/search", response_model=UnifiedSearchResponse)
async def unified_entity_search(
    request: UnifiedSearchRequest,
    unified_search_service: UnifiedSearchService = Depends(get_unified_search_service)
):
    """
    Perform unified entity search using both Atlas Search and Vector Search
    
    Uses the refactored UnifiedSearchService to orchestrate AtlasSearchService
    and VectorSearchService for comprehensive entity discovery with advanced
    correlation analysis and combined intelligence.
    
    **Unified Search Excellence:**
    - **Service Orchestration**: Clean coordination of Atlas + Vector search services
    - **Repository Pattern**: All data access through repository abstractions
    - **Advanced Analytics**: Sophisticated correlation analysis and intersection discovery
    - **Combined Intelligence**: Merged confidence scoring and recommendation engine
    
    **Search Method Combinations:**
    - `["atlas"]`: Traditional fuzzy matching excellence
    - `["vector"]`: AI-powered semantic similarity magic
    - `["atlas", "vector"]`: Combined intelligence with correlation analysis (recommended)
    
    **Use Cases:**
    - **Traditional Entity Resolution**: Atlas Search for name/address variations
    - **Advanced Investigation**: Vector Search for behavioral pattern discovery
    - **Comprehensive Due Diligence**: Combined approach for maximum coverage
    - **Demo Excellence**: Showcase MongoDB's complete search platform
    
    Args:
        request: Unified search request with parameters for both search methods
        
    Returns:
        UnifiedSearchResponse: Correlated results with combined intelligence
    """
    try:
        logger.info(f"Executing unified search with methods: {request.search_methods}")
        
        # Validate search request
        if not request.search_methods:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="At least one search method must be specified"
            )
        
        # Execute unified search through orchestrated service
        response = await unified_search_service.unified_search(request)
        
        # Log comprehensive search summary
        atlas_count = len(response.atlas_results) if response.atlas_results else 0
        vector_count = len(response.vector_results) if response.vector_results else 0
        intersection_count = (
            response.combined_intelligence.correlation_analysis.intersection_count 
            if response.combined_intelligence and response.combined_intelligence.correlation_analysis 
            else 0
        )
        
        logger.info(f"Unified search completed successfully: {atlas_count} Atlas + {vector_count} Vector = {intersection_count} intersection matches")
        
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unified search failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unified search failed: {str(e)}"
        )


@router.get("/demo_scenarios")
async def get_unified_search_demo_scenarios():
    """
    Get predefined demo scenarios for showcasing unified search capabilities
    
    Provides comprehensive demo scenarios designed to demonstrate the strengths
    of each search method and their combined intelligence capabilities using
    the enhanced service architecture.
    
    Returns:
        Demo scenarios with expected results and service architecture benefits
    """
    try:
        scenarios = [
            DemoScenario(
                scenario_id="atlas_search_excellence",
                name="Atlas Search Excellence",
                description="Showcase Atlas Search handling real-world data variations with repository pattern",
                search_request=UnifiedSearchRequest(
                    name_full="Sam Brittany Miller",
                    address_full="Oak St Portland",
                    search_methods=["atlas"],
                    limit=5,
                    scenario_name="atlas_search_excellence"
                ),
                expected_atlas_count=4,
                expected_vector_count=0,
                expected_intersection=0,
                key_demonstrations=[
                    "Fuzzy name matching: 'Sam' → 'Samantha' through repository pattern",
                    "Address normalization: 'Oak St' → 'Oak Street' with enhanced data access",
                    "High-confidence exact matches despite variations",
                    "Traditional data quality issue resolution with service architecture"
                ],
                business_value=[
                    "Handles real-world data entry variations efficiently",
                    "Reduces false negatives from typos and abbreviations",
                    "Fast, scalable traditional search with repository benefits",
                    "Clean service architecture for maintainable code"
                ],
                wow_factor="Finds exact entity despite name and address variations using clean service architecture"
            ),
            DemoScenario(
                scenario_id="vector_search_magic",
                name="Vector Search AI Magic",
                description="Demonstrate semantic understanding and AI-powered entity discovery with service orchestration",
                search_request=UnifiedSearchRequest(
                    semantic_query="High-risk individual with offshore banking activities and shell company connections",
                    search_methods=["vector"],
                    limit=5,
                    scenario_name="vector_search_magic"
                ),
                expected_atlas_count=0,
                expected_vector_count=5,
                expected_intersection=0,
                key_demonstrations=[
                    "Semantic query understanding without name/address through AI integration",
                    "Risk profile pattern recognition using repository-based vector search",
                    "Behavioral similarity detection with service orchestration",
                    "AI-powered investigation support with clean architecture"
                ],
                business_value=[
                    "Discovers hidden connections through AI understanding",
                    "Uncovers entities with similar risk characteristics efficiently",
                    "Goes beyond traditional text matching with semantic intelligence",
                    "Service architecture enables complex investigation workflows"
                ],
                wow_factor="Finds entities by meaning and behavior, not just text similarity, using AI service integration"
            ),
            DemoScenario(
                scenario_id="combined_intelligence",
                name="Combined Intelligence Power",
                description="Show the best of both worlds with comprehensive entity resolution and service orchestration",
                search_request=UnifiedSearchRequest(
                    name_full="John Smith",
                    semantic_query="offshore shell companies high risk",
                    search_methods=["atlas", "vector"],
                    limit=10,
                    scenario_name="combined_intelligence"
                ),
                expected_atlas_count=8,
                expected_vector_count=6,
                expected_intersection=2,
                key_demonstrations=[
                    "Atlas Search finds all John Smiths (traditional matching with repository pattern)",
                    "Vector Search finds high-risk offshore entities (semantic with AI integration)",
                    "Intersection reveals John Smiths with offshore risk patterns",
                    "Combined intelligence identifies most relevant candidates through service orchestration"
                ],
                business_value=[
                    "Comprehensive entity resolution that misses nothing",
                    "Precision through sophisticated intersection analysis",
                    "Complete investigation workflow support with clean architecture",
                    "MongoDB's unified search platform advantage with service orchestration"
                ],
                wow_factor="Intelligence amplification through dual search methods and sophisticated service orchestration"
            )
        ]
        
        return {
            "scenarios": scenarios,
            "total_scenarios": len(scenarios),
            "description": "Demo scenarios showcasing MongoDB Atlas Search + Vector Search with enhanced service architecture",
            "service_architecture_benefits": [
                "Repository pattern for clean, efficient data access",
                "Service orchestration with dependency injection",
                "Advanced correlation analysis and intersection discovery",
                "Combined intelligence generation with sophisticated algorithms",
                "Consistent error handling and comprehensive logging"
            ],
            "usage": "Use POST /search/unified/search with the search_request from any scenario to experience the enhanced architecture"
        }
        
    except Exception as e:
        logger.error(f"Error getting unified search demo scenarios: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get demo scenarios: {str(e)}"
        )


@router.post("/demo_scenario/{scenario_id}", response_model=DemoScenarioResponse)
async def execute_unified_search_demo_scenario(
    scenario_id: str,
    unified_search_service: UnifiedSearchService = Depends(get_unified_search_service)
):
    """
    Execute a specific unified search demo scenario
    
    Uses the refactored UnifiedSearchService to execute predefined demo scenarios
    that showcase the combined power of Atlas Search and Vector Search with
    sophisticated service orchestration and correlation analysis.
    
    **Available Demo Scenarios:**
    - `atlas_search_excellence`: Traditional fuzzy matching excellence demo
    - `vector_search_magic`: AI-powered semantic similarity demo
    - `combined_intelligence`: Dual-search comprehensive intelligence demo
    
    Args:
        scenario_id: Demo scenario identifier
        
    Returns:
        DemoScenarioResponse: Demo results with insights and performance metrics
    """
    try:
        logger.info(f"Executing unified search demo scenario: {scenario_id}")
        
        # Get demo scenarios
        scenarios_response = await get_unified_search_demo_scenarios()
        scenarios = scenarios_response["scenarios"]
        
        # Find the requested scenario
        scenario = next((s for s in scenarios if s.scenario_id == scenario_id), None)
        if not scenario:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Demo scenario '{scenario_id}' not found"
            )
        
        # Execute the unified search through orchestrated service
        search_results = await unified_search_service.unified_search(scenario.search_request)
        
        # Generate demo-specific insights with service architecture details
        demo_insights = _generate_enhanced_demo_insights(scenario, search_results)
        
        # Calculate success metrics including service performance
        success_metrics = _calculate_enhanced_demo_success_metrics(scenario, search_results)
        
        logger.info(f"Demo scenario '{scenario_id}' executed successfully with service orchestration")
        
        return DemoScenarioResponse(
            scenario=scenario,
            search_results=search_results,
            demo_insights=demo_insights,
            success_metrics=success_metrics,
            service_architecture_notes=[
                "Repository pattern provides clean data access abstraction",
                "Service orchestration enables sophisticated correlation analysis",
                "Dependency injection ensures consistent, testable architecture",
                "Enhanced error handling and logging throughout the stack"
            ]
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error executing demo scenario '{scenario_id}': {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Demo scenario execution failed: {str(e)}"
        )


@router.get("/search_recommendations")
async def get_search_method_recommendations(
    query_type: str,
    has_structured_data: bool = True,
    has_semantic_context: bool = False
):
    """
    Get recommendations for optimal search method selection
    
    Provides intelligent recommendations for choosing between Atlas Search,
    Vector Search, or combined approaches based on query characteristics
    and the enhanced service architecture capabilities.
    
    **Search Method Selection Guide:**
    - **Atlas Search**: Traditional data quality issues, exact matching needs
    - **Vector Search**: Behavioral patterns, risk profiling, semantic queries
    - **Combined Search**: Comprehensive discovery, investigation workflows
    
    Args:
        query_type: Type of query (exact_match, fuzzy_match, semantic_search, investigation)
        has_structured_data: Whether query has structured fields (name, address, etc.)
        has_semantic_context: Whether query includes semantic/behavioral context
        
    Returns:
        Recommendations for optimal search method selection
    """
    try:
        recommendations = {
            "exact_match": {
                "recommended_method": "atlas",
                "reasoning": "Atlas Search excels at exact identifier matching with highest confidence",
                "service_benefits": "Repository pattern provides optimized exact match queries"
            },
            "fuzzy_match": {
                "recommended_method": "atlas",
                "reasoning": "Atlas Search handles name variations and typos exceptionally well",
                "service_benefits": "Enhanced fuzzy matching through repository abstraction"
            },
            "semantic_search": {
                "recommended_method": "vector",
                "reasoning": "Vector Search provides AI-powered semantic understanding",
                "service_benefits": "Service orchestration enables complex semantic analysis"
            },
            "investigation": {
                "recommended_method": "combined",
                "reasoning": "Combined approach provides comprehensive coverage for investigations",
                "service_benefits": "Service orchestration enables sophisticated correlation analysis"
            }
        }
        
        base_recommendation = recommendations.get(query_type, recommendations["investigation"])
        
        # Adjust recommendation based on data characteristics
        if has_structured_data and not has_semantic_context:
            base_recommendation["adjusted_method"] = "atlas"
            base_recommendation["adjustment_reason"] = "Structured data favors Atlas Search optimization"
        elif has_semantic_context and not has_structured_data:
            base_recommendation["adjusted_method"] = "vector"
            base_recommendation["adjustment_reason"] = "Semantic context requires Vector Search AI capabilities"
        elif has_structured_data and has_semantic_context:
            base_recommendation["adjusted_method"] = "combined"
            base_recommendation["adjustment_reason"] = "Mixed data types benefit from unified search orchestration"
        
        return {
            "query_analysis": {
                "query_type": query_type,
                "has_structured_data": has_structured_data,
                "has_semantic_context": has_semantic_context
            },
            "recommendation": base_recommendation,
            "service_architecture_advantages": [
                "Repository pattern abstracts data access complexity",
                "Service orchestration enables intelligent method combination",
                "Dependency injection provides consistent, testable patterns",
                "Enhanced performance through optimized query execution"
            ]
        }
        
    except Exception as e:
        logger.error(f"Error generating search recommendations: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate search recommendations: {str(e)}"
        )


def _generate_enhanced_demo_insights(scenario: DemoScenario, results: UnifiedSearchResponse) -> List[str]:
    """Generate enhanced insights specific to the demo scenario with service architecture details."""
    insights = []
    
    atlas_count = len(results.atlas_results) if results.atlas_results else 0
    vector_count = len(results.vector_results) if results.vector_results else 0
    intersection_count = (
        results.combined_intelligence.correlation_analysis.intersection_count 
        if results.combined_intelligence and results.combined_intelligence.correlation_analysis 
        else 0
    )
    
    if scenario.scenario_id == "atlas_search_excellence":
        insights.append(f"Atlas Search found {atlas_count} matches using repository-based fuzzy matching")
        if atlas_count > 0:
            insights.append("Successfully handled name/address variations through enhanced service architecture")
            insights.append("Repository pattern provides optimized Atlas Search performance")
    
    elif scenario.scenario_id == "vector_search_magic":
        insights.append(f"Vector Search found {vector_count} semantically similar entities using AI integration")
        if vector_count > 0:
            insights.append("Discovered entities through AI understanding via service orchestration")
            insights.append("Repository pattern enables efficient vector similarity operations")
    
    elif scenario.scenario_id == "combined_intelligence":
        insights.append(f"Combined search: {atlas_count} Atlas + {vector_count} Vector = {intersection_count} intersection via service orchestration")
        if intersection_count > 0:
            insights.append("Intersection matches demonstrate sophisticated correlation analysis")
            insights.append("Service orchestration enables advanced combined intelligence generation")
    
    # Add service architecture performance insights
    if results.search_metadata and results.search_metadata.performance_metrics:
        search_time = results.search_metadata.performance_metrics.total_search_time_ms
        insights.append(f"Total search completed in {search_time:.1f}ms with enhanced service architecture")
    
    return insights


def _calculate_enhanced_demo_success_metrics(scenario: DemoScenario, results: UnifiedSearchResponse) -> Dict[str, Any]:
    """Calculate enhanced metrics showing demo success with service architecture performance."""
    atlas_count = len(results.atlas_results) if results.atlas_results else 0
    vector_count = len(results.vector_results) if results.vector_results else 0
    intersection_count = (
        results.combined_intelligence.correlation_analysis.intersection_count 
        if results.combined_intelligence and results.combined_intelligence.correlation_analysis 
        else 0
    )
    
    base_metrics = {
        "expected_vs_actual": {
            "atlas_expected": scenario.expected_atlas_count,
            "atlas_actual": atlas_count,
            "vector_expected": scenario.expected_vector_count,
            "vector_actual": vector_count,
            "intersection_expected": scenario.expected_intersection,
            "intersection_actual": intersection_count
        },
        "performance_metrics": {
            "total_search_time_ms": (
                results.search_metadata.performance_metrics.total_search_time_ms 
                if results.search_metadata and results.search_metadata.performance_metrics 
                else 0
            ),
            "search_success": results.search_success,
            "total_unique_entities": results.total_unique_entities
        },
        "demo_effectiveness": {
            "met_expectations": (
                atlas_count >= (scenario.expected_atlas_count or 0) and 
                vector_count >= (scenario.expected_vector_count or 0)
            ),
            "comprehensiveness_score": (
                results.combined_intelligence.search_comprehensiveness 
                if results.combined_intelligence 
                else 0.0
            ),
            "confidence_level": (
                results.combined_intelligence.confidence_level 
                if results.combined_intelligence 
                else 0.0
            )
        }
    }
    
    # Add service architecture performance metrics
    base_metrics["service_architecture_performance"] = {
        "repository_pattern_benefits": "Clean data access with optimized queries",
        "service_orchestration_efficiency": "Sophisticated coordination of multiple search methods",
        "dependency_injection_advantages": "Consistent, testable, maintainable architecture",
        "error_handling_robustness": "Comprehensive error management throughout the stack"
    }
    
    return base_metrics