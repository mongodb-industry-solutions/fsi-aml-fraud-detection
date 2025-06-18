"""
Unified Search Service - Refactored to orchestrate repository-based search services

Sophisticated service that coordinates AtlasSearchService and VectorSearchService to provide
comprehensive entity resolution with correlation analysis, performance metrics, and intelligent insights.
"""

import asyncio
import logging
import time
from typing import List, Dict, Any, Optional, Set, Tuple
from datetime import datetime
from collections import defaultdict

from services.search.atlas_search_service import AtlasSearchService
from services.search.vector_search_service import VectorSearchService
from models.api.requests import UnifiedSearchRequest, EntitySearchRequest, VectorSearchRequest
from models.api.responses import UnifiedSearchResponse, SearchResponse
from models.core.entity import Entity

logger = logging.getLogger(__name__)


class UnifiedSearchService:
    """
    Unified Search service using repository pattern
    
    Orchestrates AtlasSearchService and VectorSearchService to provide comprehensive
    entity resolution with advanced correlation analysis and intelligent insights.
    """
    
    def __init__(self, 
                 atlas_search_service: AtlasSearchService,
                 vector_search_service: VectorSearchService):
        """
        Initialize Unified Search service
        
        Args:
            atlas_search_service: Atlas Search service for text-based matching
            vector_search_service: Vector Search service for semantic similarity
        """
        self.atlas_search_service = atlas_search_service
        self.vector_search_service = vector_search_service
        
        # Business logic configuration
        self.correlation_threshold = 0.5
        self.confidence_weights = {
            "atlas": 0.6,
            "vector": 0.4,
            "agreement_boost": 0.1
        }
        self.max_results_per_method = 50
        
        logger.info("Unified Search service initialized with repository-based search services")
    
    # ==================== UNIFIED SEARCH OPERATIONS ====================
    
    async def unified_search(self, request: UnifiedSearchRequest) -> UnifiedSearchResponse:
        """
        Perform comprehensive unified search using both Atlas and Vector search
        
        Args:
            request: Unified search request with parameters for both methods
            
        Returns:
            UnifiedSearchResponse: Correlated results with intelligence analysis
        """
        start_time = time.time()
        
        try:
            logger.info(f"Starting unified search for: {request.query_summary}")
            
            # Validate search request
            validation_result = self._validate_search_request(request)
            if not validation_result["valid"]:
                return await self._create_error_response(
                    validation_result["error"], start_time, request
                )
            
            # Execute search methods in parallel
            search_results = await self._execute_parallel_searches(request)
            
            # Process and correlate results
            correlation_analysis = await self._analyze_search_correlation(
                search_results, request
            )
            
            # Generate unified intelligence and insights
            intelligence = await self._generate_unified_intelligence(
                correlation_analysis, request
            )
            
            # Calculate comprehensive metrics
            metrics = await self._calculate_comprehensive_metrics(
                search_results, correlation_analysis, start_time
            )
            
            # Create unified response
            total_time = (time.time() - start_time) * 1000
            
            logger.info(f"Unified search completed in {total_time:.2f}ms with {intelligence.total_unique_entities} unique entities")
            
            return UnifiedSearchResponse(
                success=True,
                search_results=search_results,
                correlation_analysis=correlation_analysis,
                intelligence=intelligence,
                metrics=metrics,
                total_processing_time_ms=total_time
            )
            
        except Exception as e:
            logger.error(f"Unified search failed: {e}")
            
            total_time = (time.time() - start_time) * 1000
            return await self._create_error_response(str(e), start_time, request)
    
    async def smart_search(self, query: str, 
                         search_context: Optional[Dict[str, Any]] = None,
                         max_results: Optional[int] = None) -> UnifiedSearchResponse:
        """
        Perform intelligent search that automatically determines the best approach
        
        Args:
            query: Natural language search query
            search_context: Optional context for search optimization
            max_results: Maximum number of results
            
        Returns:
            UnifiedSearchResponse: Optimized search results
        """
        try:
            logger.info(f"Starting smart search for query: {query[:100]}...")
            
            # Analyze query to determine optimal search strategy
            search_strategy = await self._analyze_query_for_strategy(query, search_context)
            
            # Build optimized unified search request
            unified_request = await self._build_optimized_request(
                query, search_strategy, search_context, max_results
            )
            
            # Execute unified search with optimizations
            return await self.unified_search(unified_request)
            
        except Exception as e:
            logger.error(f"Smart search failed: {e}")
            return await self._create_error_response(str(e), time.time(), None)
    
    # ==================== PARALLEL SEARCH EXECUTION ====================
    
    async def _execute_parallel_searches(self, request: UnifiedSearchRequest) -> Dict[str, SearchResponse]:
        """
        Execute Atlas and Vector searches in parallel for optimal performance
        
        Args:
            request: Unified search request
            
        Returns:
            Dict: Search results by method
        """
        search_tasks = {}
        search_results = {}
        
        try:
            # Prepare Atlas Search if enabled
            if request.enable_atlas_search:
                atlas_request = await self._prepare_atlas_search_request(request)
                search_tasks["atlas"] = self._execute_atlas_search_with_timing(atlas_request)
            
            # Prepare Vector Search if enabled
            if request.enable_vector_search:
                vector_request = await self._prepare_vector_search_request(request)
                search_tasks["vector"] = self._execute_vector_search_with_timing(vector_request)
            
            # Execute searches in parallel
            if search_tasks:
                logger.info(f"Executing {len(search_tasks)} search methods in parallel")
                
                completed_searches = await asyncio.gather(
                    *search_tasks.values(), 
                    return_exceptions=True
                )
                
                # Process results
                for method, result in zip(search_tasks.keys(), completed_searches):
                    if isinstance(result, Exception):
                        logger.error(f"{method} search failed: {result}")
                        search_results[method] = SearchResponse(
                            success=False,
                            matches=[],
                            total_matches=0,
                            error_message=str(result)
                        )
                    else:
                        search_results[method] = result
            
            return search_results
            
        except Exception as e:
            logger.error(f"Parallel search execution failed: {e}")
            return {}
    
    async def _execute_atlas_search_with_timing(self, request: EntitySearchRequest) -> SearchResponse:
        """
        Execute Atlas Search with performance timing
        
        Args:
            request: Atlas search request
            
        Returns:
            SearchResponse: Atlas search results with timing
        """
        start_time = time.time()
        
        try:
            result = await self.atlas_search_service.find_entity_matches(request)
            
            execution_time = (time.time() - start_time) * 1000
            
            # Add timing to metadata
            if result.search_metadata:
                result.search_metadata["atlas_execution_time_ms"] = execution_time
            
            logger.debug(f"Atlas search completed in {execution_time:.2f}ms with {result.total_matches} matches")
            
            return result
            
        except Exception as e:
            execution_time = (time.time() - start_time) * 1000
            logger.error(f"Atlas search failed in {execution_time:.2f}ms: {e}")
            raise
    
    async def _execute_vector_search_with_timing(self, request: VectorSearchRequest) -> SearchResponse:
        """
        Execute Vector Search with performance timing
        
        Args:
            request: Vector search request
            
        Returns:
            SearchResponse: Vector search results with timing
        """
        start_time = time.time()
        
        try:
            if hasattr(request, 'query_text'):
                result = await self.vector_search_service.find_similar_entities_by_text(
                    query_text=request.query_text,
                    limit=request.limit,
                    similarity_threshold=request.similarity_threshold,
                    filters=request.filters
                )
            else:
                result = await self.vector_search_service.find_similar_entities_by_vector(
                    query_vector=request.query_vector,
                    limit=request.limit,
                    similarity_threshold=request.similarity_threshold,
                    filters=request.filters
                )
            
            execution_time = (time.time() - start_time) * 1000
            
            # Add timing to metadata
            if result.search_metadata:
                result.search_metadata["vector_execution_time_ms"] = execution_time
            
            logger.debug(f"Vector search completed in {execution_time:.2f}ms with {result.total_matches} matches")
            
            return result
            
        except Exception as e:
            execution_time = (time.time() - start_time) * 1000
            logger.error(f"Vector search failed in {execution_time:.2f}ms: {e}")
            raise
    
    # ==================== CORRELATION ANALYSIS ====================
    
    async def _analyze_search_correlation(self, 
                                        search_results: Dict[str, SearchResponse],
                                        request: UnifiedSearchRequest) -> Dict[str, Any]:
        """
        Analyze correlation between different search method results
        
        Args:
            search_results: Results from different search methods
            request: Original search request
            
        Returns:
            Dict: Comprehensive correlation analysis
        """
        try:
            # Extract entity matches from each method
            atlas_matches = search_results.get("atlas", SearchResponse(success=False, matches=[], total_matches=0)).matches
            vector_matches = search_results.get("vector", SearchResponse(success=False, matches=[], total_matches=0)).matches
            
            # Create entity ID sets for intersection analysis
            atlas_entity_ids = {match.entity_id for match in atlas_matches}
            vector_entity_ids = {match.entity_id for match in vector_matches}
            
            # Calculate intersections and unique sets
            intersection_ids = atlas_entity_ids & vector_entity_ids
            atlas_unique_ids = atlas_entity_ids - vector_entity_ids
            vector_unique_ids = vector_entity_ids - atlas_entity_ids
            
            # Calculate correlation metrics
            total_unique_entities = len(atlas_entity_ids | vector_entity_ids)
            correlation_percentage = (len(intersection_ids) / total_unique_entities * 100) if total_unique_entities > 0 else 0
            
            # Analyze intersection matches for confidence boost
            intersection_matches = await self._analyze_intersection_matches(
                atlas_matches, vector_matches, intersection_ids
            )
            
            # Generate correlation insights
            correlation_insights = await self._generate_correlation_insights(
                len(atlas_matches), len(vector_matches), len(intersection_ids), request
            )
            
            return {
                "total_atlas_results": len(atlas_matches),
                "total_vector_results": len(vector_matches),
                "intersection_count": len(intersection_ids),
                "atlas_unique_count": len(atlas_unique_ids),
                "vector_unique_count": len(vector_unique_ids),
                "total_unique_entities": total_unique_entities,
                "correlation_percentage": round(correlation_percentage, 2),
                "intersection_matches": intersection_matches,
                "atlas_unique_matches": [m for m in atlas_matches if m.entity_id in atlas_unique_ids],
                "vector_unique_matches": [m for m in vector_matches if m.entity_id in vector_unique_ids],
                "correlation_insights": correlation_insights,
                "recommended_strategy": self._recommend_search_strategy(
                    len(atlas_matches), len(vector_matches), len(intersection_ids)
                )
            }
            
        except Exception as e:
            logger.error(f"Correlation analysis failed: {e}")
            return {
                "error": str(e),
                "total_unique_entities": 0,
                "correlation_percentage": 0.0
            }
    
    async def _analyze_intersection_matches(self, 
                                          atlas_matches: List[Any], 
                                          vector_matches: List[Any],
                                          intersection_ids: Set[str]) -> List[Dict[str, Any]]:
        """
        Analyze matches that appear in both search results for confidence boosting
        
        Args:
            atlas_matches: Atlas search matches
            vector_matches: Vector search matches
            intersection_ids: Entity IDs that appear in both results
            
        Returns:
            List: Enhanced intersection matches with combined confidence
        """
        intersection_matches = []
        
        try:
            # Create lookup dictionaries for efficient matching
            atlas_by_id = {match.entity_id: match for match in atlas_matches}
            vector_by_id = {match.entity_id: match for match in vector_matches}
            
            for entity_id in intersection_ids:
                atlas_match = atlas_by_id.get(entity_id)
                vector_match = vector_by_id.get(entity_id)
                
                if atlas_match and vector_match:
                    # Calculate combined confidence
                    combined_confidence = self._calculate_combined_confidence(
                        atlas_match.confidence_score,
                        vector_match.confidence_score
                    )
                    
                    # Create enhanced match
                    enhanced_match = {
                        "entity_id": entity_id,
                        "entity_name": atlas_match.entity_name,
                        "entity_type": atlas_match.entity_type,
                        "atlas_confidence": atlas_match.confidence_score,
                        "vector_confidence": vector_match.confidence_score,
                        "combined_confidence": combined_confidence,
                        "atlas_relevance": atlas_match.relevance_score,
                        "vector_relevance": vector_match.relevance_score,
                        "match_reasons": list(set(atlas_match.match_reasons + vector_match.match_reasons)),
                        "agreement_level": self._calculate_agreement_level(
                            atlas_match.confidence_score, vector_match.confidence_score
                        ),
                        "entity_data": atlas_match.entity_data  # Use Atlas data as primary
                    }
                    
                    intersection_matches.append(enhanced_match)
            
            # Sort by combined confidence
            intersection_matches.sort(key=lambda x: x["combined_confidence"], reverse=True)
            
            return intersection_matches
            
        except Exception as e:
            logger.error(f"Intersection analysis failed: {e}")
            return []
    
    # ==================== INTELLIGENCE GENERATION ====================
    
    async def _generate_unified_intelligence(self, 
                                           correlation_analysis: Dict[str, Any],
                                           request: UnifiedSearchRequest) -> Dict[str, Any]:
        """
        Generate unified intelligence and insights from correlation analysis
        
        Args:
            correlation_analysis: Correlation analysis results
            request: Original search request
            
        Returns:
            Dict: Unified intelligence insights
        """
        try:
            intelligence = {
                "total_unique_entities": correlation_analysis.get("total_unique_entities", 0),
                "confidence_distribution": await self._analyze_confidence_distribution(correlation_analysis),
                "search_effectiveness": await self._assess_search_effectiveness(correlation_analysis),
                "key_insights": await self._generate_key_insights(correlation_analysis, request),
                "recommendations": await self._generate_search_recommendations(correlation_analysis, request),
                "quality_assessment": await self._assess_result_quality(correlation_analysis),
                "next_steps": await self._suggest_next_steps(correlation_analysis, request)
            }
            
            return intelligence
            
        except Exception as e:
            logger.error(f"Intelligence generation failed: {e}")
            return {"error": str(e)}
    
    async def _analyze_confidence_distribution(self, correlation_analysis: Dict[str, Any]) -> Dict[str, Any]:
        """
        Analyze confidence score distribution across all matches
        
        Args:
            correlation_analysis: Correlation analysis data
            
        Returns:
            Dict: Confidence distribution analysis
        """
        try:
            all_confidences = []
            
            # Collect confidence scores from intersection matches
            intersection_matches = correlation_analysis.get("intersection_matches", [])
            for match in intersection_matches:
                all_confidences.append(match.get("combined_confidence", 0.0))
            
            # Collect from unique matches
            atlas_unique = correlation_analysis.get("atlas_unique_matches", [])
            vector_unique = correlation_analysis.get("vector_unique_matches", [])
            
            for match in atlas_unique:
                all_confidences.append(match.confidence_score)
            
            for match in vector_unique:
                all_confidences.append(match.confidence_score)
            
            if not all_confidences:
                return {"message": "No confidence scores available"}
            
            # Calculate distribution statistics
            avg_confidence = sum(all_confidences) / len(all_confidences)
            max_confidence = max(all_confidences)
            min_confidence = min(all_confidences)
            
            # Categorize confidence levels
            high_confidence = sum(1 for c in all_confidences if c >= 0.8)
            medium_confidence = sum(1 for c in all_confidences if 0.5 <= c < 0.8)
            low_confidence = sum(1 for c in all_confidences if c < 0.5)
            
            return {
                "average_confidence": round(avg_confidence, 3),
                "max_confidence": round(max_confidence, 3),
                "min_confidence": round(min_confidence, 3),
                "high_confidence_count": high_confidence,
                "medium_confidence_count": medium_confidence,
                "low_confidence_count": low_confidence,
                "total_matches": len(all_confidences)
            }
            
        except Exception as e:
            logger.error(f"Confidence distribution analysis failed: {e}")
            return {"error": str(e)}
    
    async def _assess_search_effectiveness(self, correlation_analysis: Dict[str, Any]) -> Dict[str, Any]:
        """
        Assess the effectiveness of the unified search approach
        
        Args:
            correlation_analysis: Correlation analysis data
            
        Returns:
            Dict: Search effectiveness assessment
        """
        try:
            atlas_count = correlation_analysis.get("total_atlas_results", 0)
            vector_count = correlation_analysis.get("total_vector_results", 0)
            intersection_count = correlation_analysis.get("intersection_count", 0)
            correlation_percentage = correlation_analysis.get("correlation_percentage", 0.0)
            
            # Calculate effectiveness metrics
            coverage_score = min(1.0, (atlas_count + vector_count) / 100)  # Scale based on result volume
            correlation_score = correlation_percentage / 100  # Convert percentage to score
            diversity_score = 1.0 - correlation_score  # Higher diversity with lower correlation
            
            # Overall effectiveness score
            effectiveness_score = (coverage_score * 0.4 + correlation_score * 0.3 + diversity_score * 0.3)
            
            # Determine effectiveness level
            if effectiveness_score >= 0.8:
                effectiveness_level = "excellent"
            elif effectiveness_score >= 0.6:
                effectiveness_level = "good"
            elif effectiveness_score >= 0.4:
                effectiveness_level = "moderate"
            else:
                effectiveness_level = "poor"
            
            return {
                "effectiveness_score": round(effectiveness_score, 3),
                "effectiveness_level": effectiveness_level,
                "coverage_score": round(coverage_score, 3),
                "correlation_score": round(correlation_score, 3),
                "diversity_score": round(diversity_score, 3),
                "analysis": {
                    "result_volume": "high" if (atlas_count + vector_count) > 20 else "moderate" if (atlas_count + vector_count) > 5 else "low",
                    "method_agreement": "high" if correlation_percentage > 60 else "moderate" if correlation_percentage > 30 else "low",
                    "result_diversity": "high" if diversity_score > 0.7 else "moderate" if diversity_score > 0.4 else "low"
                }
            }
            
        except Exception as e:
            logger.error(f"Search effectiveness assessment failed: {e}")
            return {"error": str(e)}
    
    # ==================== HELPER METHODS ====================
    
    def _validate_search_request(self, request: UnifiedSearchRequest) -> Dict[str, Any]:
        """
        Validate unified search request
        
        Args:
            request: Search request to validate
            
        Returns:
            Dict: Validation result
        """
        try:
            # Check if at least one search method is enabled
            if not request.enable_atlas_search and not request.enable_vector_search:
                return {
                    "valid": False,
                    "error": "At least one search method must be enabled"
                }
            
            # Check if Atlas Search has required fields
            if request.enable_atlas_search:
                if not request.entity_name or request.entity_name.strip() == "":
                    return {
                        "valid": False,
                        "error": "Atlas Search requires entity_name field"
                    }
            
            # Check if Vector Search has required fields
            if request.enable_vector_search:
                if not request.semantic_query or request.semantic_query.strip() == "":
                    return {
                        "valid": False,
                        "error": "Vector Search requires semantic_query field"
                    }
            
            return {"valid": True}
            
        except Exception as e:
            return {
                "valid": False,
                "error": f"Validation error: {str(e)}"
            }
    
    async def _prepare_atlas_search_request(self, request: UnifiedSearchRequest) -> EntitySearchRequest:
        """
        Prepare Atlas Search request from unified request
        
        Args:
            request: Unified search request
            
        Returns:
            EntitySearchRequest: Atlas search request
        """
        return EntitySearchRequest(
            entity_name=request.entity_name,
            entity_type=request.entity_type,
            address=request.address,
            phone=request.phone,
            email=request.email,
            fuzzy_matching=request.fuzzy_matching,
            limit=min(request.limit or self.max_results_per_method, self.max_results_per_method)
        )
    
    async def _prepare_vector_search_request(self, request: UnifiedSearchRequest) -> VectorSearchRequest:
        """
        Prepare Vector Search request from unified request
        
        Args:
            request: Unified search request
            
        Returns:
            VectorSearchRequest: Vector search request
        """
        return VectorSearchRequest(
            query_text=request.semantic_query,
            limit=min(request.limit or self.max_results_per_method, self.max_results_per_method),
            similarity_threshold=request.similarity_threshold or 0.7,
            filters=request.filters
        )
    
    def _calculate_combined_confidence(self, atlas_score: float, vector_score: float) -> float:
        """
        Calculate combined confidence score from both search methods
        
        Args:
            atlas_score: Atlas search confidence score
            vector_score: Vector search confidence score
            
        Returns:
            float: Combined confidence score
        """
        try:
            # Weighted average with agreement boost
            weighted_avg = (atlas_score * self.confidence_weights["atlas"] + 
                          vector_score * self.confidence_weights["vector"])
            
            # Agreement boost if scores are similar
            agreement_boost = (self.confidence_weights["agreement_boost"] 
                             if abs(atlas_score - vector_score) < 0.2 else 0.0)
            
            return min(1.0, weighted_avg + agreement_boost)
            
        except Exception:
            return max(atlas_score, vector_score)  # Fallback to higher score
    
    def _calculate_agreement_level(self, atlas_score: float, vector_score: float) -> str:
        """
        Calculate agreement level between search methods
        
        Args:
            atlas_score: Atlas search score
            vector_score: Vector search score
            
        Returns:
            str: Agreement level
        """
        difference = abs(atlas_score - vector_score)
        
        if difference < 0.1:
            return "high"
        elif difference < 0.3:
            return "medium"
        else:
            return "low"
    
    def _recommend_search_strategy(self, atlas_count: int, vector_count: int, intersection_count: int) -> str:
        """
        Recommend optimal search strategy based on results
        
        Args:
            atlas_count: Number of Atlas results
            vector_count: Number of Vector results
            intersection_count: Number of intersecting results
            
        Returns:
            str: Recommended strategy
        """
        total_results = atlas_count + vector_count
        
        if total_results == 0:
            return "broaden_search_criteria"
        
        if intersection_count > 0:
            correlation_ratio = intersection_count / max(atlas_count, vector_count, 1)
            if correlation_ratio > 0.5:
                return "both_methods_effective"
            else:
                return "methods_provide_diverse_results"
        
        if atlas_count > vector_count * 2:
            return "atlas_search_preferred"
        elif vector_count > atlas_count * 2:
            return "vector_search_preferred"
        else:
            return "balanced_approach"
    
    async def _analyze_query_for_strategy(self, query: str, context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Analyze query to determine optimal search strategy
        
        Args:
            query: Search query
            context: Optional context
            
        Returns:
            Dict: Search strategy analysis
        """
        strategy = {
            "enable_atlas_search": True,
            "enable_vector_search": True,
            "primary_method": "both",
            "reasoning": []
        }
        
        # Analyze query characteristics
        query_lower = query.lower()
        
        # Check for structured data indicators
        if any(indicator in query_lower for indicator in ["name:", "address:", "id:", "phone:", "email:"]):
            strategy["primary_method"] = "atlas"
            strategy["reasoning"].append("Query contains structured field indicators")
        
        # Check for semantic search indicators
        if any(indicator in query_lower for indicator in ["similar to", "like", "resembles", "related to"]):
            strategy["primary_method"] = "vector"
            strategy["reasoning"].append("Query indicates semantic similarity search")
        
        # Check query length for semantic appropriateness
        if len(query.split()) > 10:
            strategy["enable_vector_search"] = True
            strategy["reasoning"].append("Long query suitable for semantic search")
        
        return strategy
    
    async def _build_optimized_request(self, query: str, strategy: Dict[str, Any], 
                                     context: Optional[Dict[str, Any]] = None,
                                     max_results: Optional[int] = None) -> UnifiedSearchRequest:
        """
        Build optimized unified search request
        
        Args:
            query: Search query
            strategy: Search strategy
            context: Optional context
            max_results: Maximum results
            
        Returns:
            UnifiedSearchRequest: Optimized request
        """
        # Extract structured information from query if possible
        entity_name = query  # Simplified - could be enhanced with NLP
        semantic_query = query
        
        return UnifiedSearchRequest(
            entity_name=entity_name,
            semantic_query=semantic_query,
            enable_atlas_search=strategy.get("enable_atlas_search", True),
            enable_vector_search=strategy.get("enable_vector_search", True),
            fuzzy_matching=True,
            limit=max_results or 20,
            similarity_threshold=0.7,
            query_summary=query[:100]
        )
    
    async def _generate_correlation_insights(self, atlas_count: int, vector_count: int, 
                                           intersection_count: int, request: UnifiedSearchRequest) -> List[str]:
        """
        Generate insights from correlation analysis
        
        Args:
            atlas_count: Atlas result count
            vector_count: Vector result count
            intersection_count: Intersection count
            request: Original request
            
        Returns:
            List[str]: Generated insights
        """
        insights = []
        
        try:
            if intersection_count > 0:
                correlation_ratio = intersection_count / max(atlas_count, vector_count, 1)
                if correlation_ratio > 0.7:
                    insights.append("High agreement between search methods indicates strong match confidence")
                elif correlation_ratio > 0.3:
                    insights.append("Moderate agreement between search methods provides good validation")
                else:
                    insights.append("Low agreement suggests methods are finding different types of matches")
            
            if atlas_count > vector_count * 2:
                insights.append("Atlas Search found significantly more matches - structured data may be more complete")
            elif vector_count > atlas_count * 2:
                insights.append("Vector Search found significantly more matches - semantic patterns may be stronger")
            
            if atlas_count + vector_count > 50:
                insights.append("Large number of matches found - consider refining search criteria")
            elif atlas_count + vector_count < 5:
                insights.append("Few matches found - consider broadening search criteria or checking data quality")
            
            return insights
            
        except Exception as e:
            logger.error(f"Insight generation failed: {e}")
            return ["Unable to generate correlation insights"]
    
    async def _generate_key_insights(self, correlation_analysis: Dict[str, Any], 
                                   request: UnifiedSearchRequest) -> List[str]:
        """
        Generate key insights from unified search results
        
        Args:
            correlation_analysis: Correlation analysis data
            request: Original request
            
        Returns:
            List[str]: Key insights
        """
        insights = []
        
        try:
            total_entities = correlation_analysis.get("total_unique_entities", 0)
            correlation_percentage = correlation_analysis.get("correlation_percentage", 0.0)
            
            # Entity volume insights
            if total_entities > 20:
                insights.append(f"Comprehensive search found {total_entities} unique entities")
            elif total_entities > 5:
                insights.append(f"Moderate search results with {total_entities} unique entities found")
            else:
                insights.append(f"Limited search results with only {total_entities} entities found")
            
            # Correlation insights
            if correlation_percentage > 60:
                insights.append("Strong correlation between search methods increases confidence in results")
            elif correlation_percentage > 30:
                insights.append("Moderate correlation suggests some overlapping matches with additional unique finds")
            else:
                insights.append("Low correlation indicates diverse matching approaches yielding different results")
            
            # Method-specific insights
            intersection_matches = correlation_analysis.get("intersection_matches", [])
            if intersection_matches:
                highest_confidence = max(match.get("combined_confidence", 0.0) for match in intersection_matches)
                if highest_confidence > 0.9:
                    insights.append("Highest confidence matches show very strong entity matching")
                elif highest_confidence > 0.7:
                    insights.append("Good confidence levels in top matches indicate reliable results")
            
            return insights
            
        except Exception as e:
            logger.error(f"Key insight generation failed: {e}")
            return ["Unable to generate key insights"]
    
    async def _generate_search_recommendations(self, correlation_analysis: Dict[str, Any], 
                                             request: UnifiedSearchRequest) -> List[str]:
        """
        Generate recommendations for search optimization
        
        Args:
            correlation_analysis: Correlation analysis data
            request: Original request
            
        Returns:
            List[str]: Search recommendations
        """
        recommendations = []
        
        try:
            atlas_count = correlation_analysis.get("total_atlas_results", 0)
            vector_count = correlation_analysis.get("total_vector_results", 0)
            intersection_count = correlation_analysis.get("intersection_count", 0)
            
            # Volume-based recommendations
            if atlas_count + vector_count > 50:
                recommendations.append("Consider adding filters to narrow down the large result set")
                recommendations.append("Review high-confidence matches first for efficiency")
            elif atlas_count + vector_count < 5:
                recommendations.append("Try broader search criteria or fuzzy matching")
                recommendations.append("Consider searching with partial information or alternate spellings")
            
            # Method balance recommendations
            if atlas_count == 0 and vector_count > 0:
                recommendations.append("Atlas Search found no matches - verify entity name and structured data")
            elif vector_count == 0 and atlas_count > 0:
                recommendations.append("Vector Search found no matches - try more descriptive semantic queries")
            
            # Correlation-based recommendations
            if intersection_count > 0:
                recommendations.append("Focus on intersection matches as they have highest confidence")
            else:
                recommendations.append("No overlapping matches - review unique results from each method")
            
            return recommendations
            
        except Exception as e:
            logger.error(f"Recommendation generation failed: {e}")
            return ["Unable to generate recommendations"]
    
    async def _assess_result_quality(self, correlation_analysis: Dict[str, Any]) -> Dict[str, Any]:
        """
        Assess overall quality of search results
        
        Args:
            correlation_analysis: Correlation analysis data
            
        Returns:
            Dict: Quality assessment
        """
        try:
            intersection_matches = correlation_analysis.get("intersection_matches", [])
            total_entities = correlation_analysis.get("total_unique_entities", 0)
            correlation_percentage = correlation_analysis.get("correlation_percentage", 0.0)
            
            # Calculate quality metrics
            confidence_quality = 0.0
            if intersection_matches:
                avg_intersection_confidence = sum(match.get("combined_confidence", 0.0) for match in intersection_matches) / len(intersection_matches)
                confidence_quality = avg_intersection_confidence
            
            volume_quality = min(1.0, total_entities / 20)  # Scale based on reasonable result volume
            correlation_quality = correlation_percentage / 100
            
            # Overall quality score
            overall_quality = (confidence_quality * 0.5 + volume_quality * 0.25 + correlation_quality * 0.25)
            
            # Quality level
            if overall_quality >= 0.8:
                quality_level = "excellent"
            elif overall_quality >= 0.6:
                quality_level = "good"
            elif overall_quality >= 0.4:
                quality_level = "fair"
            else:
                quality_level = "poor"
            
            return {
                "overall_quality_score": round(overall_quality, 3),
                "quality_level": quality_level,
                "confidence_quality": round(confidence_quality, 3),
                "volume_quality": round(volume_quality, 3),
                "correlation_quality": round(correlation_quality, 3)
            }
            
        except Exception as e:
            logger.error(f"Quality assessment failed: {e}")
            return {"error": str(e)}
    
    async def _suggest_next_steps(self, correlation_analysis: Dict[str, Any], 
                                request: UnifiedSearchRequest) -> List[str]:
        """
        Suggest next steps based on search results
        
        Args:
            correlation_analysis: Correlation analysis data
            request: Original request
            
        Returns:
            List[str]: Suggested next steps
        """
        next_steps = []
        
        try:
            intersection_matches = correlation_analysis.get("intersection_matches", [])
            total_entities = correlation_analysis.get("total_unique_entities", 0)
            
            if intersection_matches:
                next_steps.append("Review intersection matches first as they have highest confidence")
                if len(intersection_matches) > 1:
                    next_steps.append("Compare top intersection matches to identify the best candidate")
            
            if total_entities > 10:
                next_steps.append("Apply additional filters to narrow down the candidate list")
                next_steps.append("Sort results by confidence score for efficient review")
            elif total_entities > 0:
                next_steps.append("Review all candidates for potential matches")
                next_steps.append("Consider additional data points for validation")
            else:
                next_steps.append("Broaden search criteria or try alternative search terms")
                next_steps.append("Verify data quality and completeness")
            
            return next_steps
            
        except Exception as e:
            logger.error(f"Next steps generation failed: {e}")
            return ["Review search results and refine criteria as needed"]
    
    async def _calculate_comprehensive_metrics(self, search_results: Dict[str, SearchResponse],
                                             correlation_analysis: Dict[str, Any],
                                             start_time: float) -> Dict[str, Any]:
        """
        Calculate comprehensive performance and quality metrics
        
        Args:
            search_results: Search results from different methods
            correlation_analysis: Correlation analysis data
            start_time: Search start time
            
        Returns:
            Dict: Comprehensive metrics
        """
        try:
            total_time = (time.time() - start_time) * 1000
            
            # Extract timing from individual search results
            atlas_time = 0.0
            vector_time = 0.0
            
            if "atlas" in search_results and search_results["atlas"].search_metadata:
                atlas_time = search_results["atlas"].search_metadata.get("atlas_execution_time_ms", 0.0)
            
            if "vector" in search_results and search_results["vector"].search_metadata:
                vector_time = search_results["vector"].search_metadata.get("vector_execution_time_ms", 0.0)
            
            # Calculate efficiency metrics
            parallel_efficiency = 1.0 - (total_time / (atlas_time + vector_time)) if (atlas_time + vector_time) > 0 else 0.0
            
            return {
                "performance_metrics": {
                    "total_execution_time_ms": round(total_time, 2),
                    "atlas_execution_time_ms": round(atlas_time, 2),
                    "vector_execution_time_ms": round(vector_time, 2),
                    "parallel_efficiency": round(parallel_efficiency, 3),
                    "correlation_analysis_time_ms": round((total_time - max(atlas_time, vector_time)), 2)
                },
                "quality_metrics": correlation_analysis.get("quality_assessment", {}),
                "coverage_metrics": {
                    "total_unique_entities": correlation_analysis.get("total_unique_entities", 0),
                    "method_coverage": {
                        "atlas_results": correlation_analysis.get("total_atlas_results", 0),
                        "vector_results": correlation_analysis.get("total_vector_results", 0),
                        "intersection_results": correlation_analysis.get("intersection_count", 0)
                    }
                }
            }
            
        except Exception as e:
            logger.error(f"Metrics calculation failed: {e}")
            return {"error": str(e)}
    
    async def _create_error_response(self, error_message: str, start_time: float, 
                                   request: Optional[UnifiedSearchRequest]) -> UnifiedSearchResponse:
        """
        Create error response for failed unified search
        
        Args:
            error_message: Error message
            start_time: Search start time
            request: Original request (if available)
            
        Returns:
            UnifiedSearchResponse: Error response
        """
        total_time = (time.time() - start_time) * 1000
        
        return UnifiedSearchResponse(
            success=False,
            error_message=error_message,
            search_results={},
            correlation_analysis={
                "total_unique_entities": 0,
                "correlation_percentage": 0.0,
                "error": error_message
            },
            intelligence={
                "total_unique_entities": 0,
                "error": error_message
            },
            metrics={
                "performance_metrics": {
                    "total_execution_time_ms": round(total_time, 2)
                }
            },
            total_processing_time_ms=total_time
        )