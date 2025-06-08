"""
Unified search service that combines Atlas Search and Vector Search for comprehensive entity resolution.
"""

import asyncio
import logging
import time
from typing import List, Dict, Any, Optional, Tuple, Set
from datetime import datetime

from motor.motor_asyncio import AsyncIOMotorDatabase

from models.unified_search import (
    UnifiedSearchRequest,
    UnifiedSearchResponse,
    CombinedIntelligence,
    CorrelationAnalysis,
    SearchPerformanceMetrics,
    SearchMetadata,
    EntityMatch,
    MatchCorrelationType,
    SearchMethod
)
from models.entity_resolution import NewOnboardingInput, PotentialMatch
from models.vector_search import VectorSearchByTextRequest, SimilarEntity

from services.atlas_search import AtlasSearchService
from services.vector_search import VectorSearchService

logger = logging.getLogger(__name__)

class UnifiedSearchService:
    """Service for coordinating Atlas Search and Vector Search for comprehensive entity resolution."""
    
    def __init__(self, database: AsyncIOMotorDatabase):
        self.database = database
        self.atlas_service = AtlasSearchService(database)
        self.vector_service = VectorSearchService(database)
    
    async def unified_search(
        self, 
        request: UnifiedSearchRequest
    ) -> UnifiedSearchResponse:
        """
        Perform unified search using both Atlas Search and Vector Search.
        
        Args:
            request: Unified search request with parameters for both search methods
            
        Returns:
            UnifiedSearchResponse with correlated results from both methods
        """
        start_time = time.time()
        
        try:
            # Validate request
            if not self._validate_search_request(request):
                raise ValueError("Invalid search request: must provide either traditional search fields or semantic query")
            
            # Prepare performance tracking
            atlas_time = None
            vector_time = None
            
            # Run search methods based on request
            atlas_results = []
            vector_results = []
            
            # Execute searches in parallel for performance
            tasks = []
            
            if SearchMethod.ATLAS in request.search_methods:
                tasks.append(self._execute_atlas_search(request))
            
            if SearchMethod.VECTOR in request.search_methods:
                tasks.append(self._execute_vector_search(request))
            
            # Wait for all searches to complete
            if tasks:
                search_results = await asyncio.gather(*tasks, return_exceptions=True)
                
                # Process results
                for i, result in enumerate(search_results):
                    if isinstance(result, Exception):
                        logger.error(f"Search method {i} failed: {result}")
                        continue
                    
                    method, results, execution_time = result
                    if method == SearchMethod.ATLAS:
                        atlas_results = results
                        atlas_time = execution_time
                    elif method == SearchMethod.VECTOR:
                        vector_results = results
                        vector_time = execution_time
            
            # Correlate results and generate combined intelligence
            correlation_start = time.time()
            combined_intelligence = await self._correlate_results(
                atlas_results, 
                vector_results, 
                request
            )
            correlation_time = (time.time() - correlation_start) * 1000
            
            # Calculate performance metrics
            total_time = (time.time() - start_time) * 1000
            performance_metrics = SearchPerformanceMetrics(
                atlas_search_time_ms=atlas_time,
                vector_search_time_ms=vector_time,
                correlation_time_ms=correlation_time,
                total_search_time_ms=total_time,
                atlas_index_used="entity_resolution_search" if atlas_results else None,
                vector_index_used="entity_vector_search_index" if vector_results else None,
                embedding_model="amazon.titan-embed-text-v1" if vector_results else None
            )
            
            # Build search metadata
            search_metadata = SearchMetadata(
                search_methods_used=request.search_methods,
                performance_metrics=performance_metrics,
                filters_applied=request.filters or {},
                limits_used={
                    "atlas": request.limit if SearchMethod.ATLAS in request.search_methods else 0,
                    "vector": request.limit if SearchMethod.VECTOR in request.search_methods else 0
                }
            )
            
            # Calculate total unique entities
            unique_entity_ids = set()
            for match in atlas_results:
                unique_entity_ids.add(match.entityId)
            for entity in vector_results:
                unique_entity_ids.add(entity.entityId)
            
            return UnifiedSearchResponse(
                query_info={
                    "name_full": request.name_full,
                    "address_full": request.address_full,
                    "date_of_birth": request.date_of_birth,
                    "identifier_value": request.identifier_value,
                    "semantic_query": request.semantic_query,
                    "search_methods": [method.value for method in request.search_methods],
                    "scenario_name": request.scenario_name
                },
                atlas_results=atlas_results,
                vector_results=vector_results,
                combined_intelligence=combined_intelligence,
                search_metadata=search_metadata,
                total_unique_entities=len(unique_entity_ids),
                search_success=True
            )
            
        except Exception as e:
            logger.error(f"Unified search failed: {e}")
            
            # Return error response
            return UnifiedSearchResponse(
                query_info={
                    "error": str(e),
                    "search_methods": [method.value for method in request.search_methods]
                },
                atlas_results=[],
                vector_results=[],
                combined_intelligence=CombinedIntelligence(
                    correlation_analysis=CorrelationAnalysis(
                        total_atlas_results=0,
                        total_vector_results=0,
                        intersection_count=0,
                        atlas_unique_count=0,
                        vector_unique_count=0,
                        correlation_percentage=0.0
                    ),
                    search_comprehensiveness=0.0,
                    confidence_level=0.0
                ),
                search_metadata=SearchMetadata(
                    search_methods_used=request.search_methods,
                    performance_metrics=SearchPerformanceMetrics(
                        correlation_time_ms=0.0,
                        total_search_time_ms=(time.time() - start_time) * 1000
                    )
                ),
                total_unique_entities=0,
                search_success=False,
                error_messages=[str(e)]
            )
    
    def _validate_search_request(self, request: UnifiedSearchRequest) -> bool:
        """Validate that the search request has sufficient parameters."""
        has_traditional_fields = any([
            request.name_full,
            request.address_full,
            request.identifier_value
        ])
        
        has_semantic_query = bool(request.semantic_query)
        
        # Must have either traditional fields for Atlas Search or semantic query for Vector Search
        return has_traditional_fields or has_semantic_query
    
    async def _execute_atlas_search(
        self, 
        request: UnifiedSearchRequest
    ) -> Tuple[SearchMethod, List[PotentialMatch], float]:
        """Execute Atlas Search and return results with timing."""
        start_time = time.time()
        
        try:
            # Validate that we have required fields for Atlas Search
            if not request.name_full or request.name_full.strip() == "":
                logger.warning("Atlas Search requires name_full, but it was empty")
                execution_time = (time.time() - start_time) * 1000
                return SearchMethod.ATLAS, [], execution_time
            
            # Convert unified request to Atlas Search input
            onboarding_input = NewOnboardingInput(
                name_full=request.name_full,
                date_of_birth=request.date_of_birth,
                address_full=request.address_full,
                identifier_value=request.identifier_value
            )
            
            logger.info(f"Executing Atlas Search for name: '{request.name_full}'")
            
            # Execute Atlas Search
            atlas_response = await self.atlas_service.find_entity_matches(
                onboarding_input, 
                limit=request.limit
            )
            
            execution_time = (time.time() - start_time) * 1000
            
            logger.info(f"Atlas Search completed in {execution_time:.2f}ms, found {len(atlas_response.matches)} matches")
            
            return SearchMethod.ATLAS, atlas_response.matches, execution_time
            
        except Exception as e:
            logger.error(f"Atlas Search execution failed: {e}")
            execution_time = (time.time() - start_time) * 1000
            return SearchMethod.ATLAS, [], execution_time
    
    async def _execute_vector_search(
        self, 
        request: UnifiedSearchRequest
    ) -> Tuple[SearchMethod, List[SimilarEntity], float]:
        """Execute Vector Search and return results with timing."""
        start_time = time.time()
        
        try:
            # Use semantic query if provided, otherwise create one from traditional fields
            query_text = request.semantic_query
            if not query_text and request.name_full:
                # Construct a semantic query from traditional fields
                query_parts = []
                if request.name_full:
                    query_parts.append(f"individual named {request.name_full}")
                if request.address_full:
                    query_parts.append(f"residing at {request.address_full}")
                query_text = " ".join(query_parts)
            
            if not query_text:
                logger.warning("No query text available for vector search")
                execution_time = (time.time() - start_time) * 1000
                return SearchMethod.VECTOR, [], execution_time
            
            # Execute Vector Search
            similar_entities = await self.vector_service.find_similar_entities_by_text(
                query_text=query_text,
                limit=request.limit,
                filters=request.filters
            )
            
            execution_time = (time.time() - start_time) * 1000
            
            logger.info(f"Vector Search completed in {execution_time:.2f}ms, found {len(similar_entities)} matches")
            
            # Convert raw MongoDB results to SimilarEntity models if needed
            similar_entity_models = []
            for entity in similar_entities:
                if isinstance(entity, dict):
                    # Raw MongoDB result - convert to SimilarEntity
                    similar_entity_models.append(SimilarEntity(**entity))
                else:
                    # Already a SimilarEntity model
                    similar_entity_models.append(entity)
            
            return SearchMethod.VECTOR, similar_entity_models, execution_time
            
        except Exception as e:
            logger.error(f"Vector Search execution failed: {e}")
            execution_time = (time.time() - start_time) * 1000
            return SearchMethod.VECTOR, [], execution_time
    
    async def _correlate_results(
        self,
        atlas_results: List[PotentialMatch],
        vector_results: List[SimilarEntity],
        request: UnifiedSearchRequest
    ) -> CombinedIntelligence:
        """Correlate Atlas Search and Vector Search results to generate combined intelligence."""
        
        # Build entity ID sets for correlation
        atlas_entity_ids = {match.entityId for match in atlas_results}
        vector_entity_ids = {entity.entityId for entity in vector_results}
        
        # Find intersections and unique results
        intersection_ids = atlas_entity_ids & vector_entity_ids
        atlas_unique_ids = atlas_entity_ids - vector_entity_ids
        vector_unique_ids = vector_entity_ids - atlas_entity_ids
        
        # Create intersection matches (entities found by both methods)
        intersection_matches = []
        for entity_id in intersection_ids:
            atlas_match = next((m for m in atlas_results if m.entityId == entity_id), None)
            vector_match = next((e for e in vector_results if e.entityId == entity_id), None)
            
            if atlas_match and vector_match:
                entity_match = EntityMatch(
                    entity_id=entity_id,
                    entity_type=atlas_match.entityType or "individual",
                    name={"full": atlas_match.name_full or ""},
                    atlas_search_score=atlas_match.searchScore,
                    atlas_match_reasons=atlas_match.matchReasons,
                    vector_search_score=vector_match.vectorSearchScore,
                    semantic_relevance=self._generate_semantic_relevance(vector_match, request),
                    found_by_methods=[SearchMethod.ATLAS, SearchMethod.VECTOR],
                    correlation_type=MatchCorrelationType.INTERSECTION,
                    combined_confidence=self._calculate_combined_confidence(
                        atlas_match.searchScore, 
                        vector_match.vectorSearchScore
                    )
                )
                intersection_matches.append(entity_match)
        
        # Filter unique results
        atlas_unique = [m for m in atlas_results if m.entityId in atlas_unique_ids]
        vector_unique = [e for e in vector_results if e.entityId in vector_unique_ids]
        
        # Calculate correlation analysis
        total_atlas = len(atlas_results)
        total_vector = len(vector_results)
        intersection_count = len(intersection_ids)
        
        correlation_percentage = 0.0
        if total_atlas > 0 or total_vector > 0:
            correlation_percentage = (intersection_count / max(total_atlas, total_vector)) * 100
        
        correlation_analysis = CorrelationAnalysis(
            total_atlas_results=total_atlas,
            total_vector_results=total_vector,
            intersection_count=intersection_count,
            atlas_unique_count=len(atlas_unique_ids),
            vector_unique_count=len(vector_unique_ids),
            correlation_percentage=correlation_percentage,
            recommended_method=self._recommend_search_method(
                total_atlas, total_vector, intersection_count, request
            ),
            reasoning=self._generate_correlation_reasoning(
                total_atlas, total_vector, intersection_count, request
            )
        )
        
        # Generate insights and recommendations
        key_insights = self._generate_key_insights(
            atlas_results, vector_results, intersection_matches, request
        )
        
        recommendations = self._generate_recommendations(
            correlation_analysis, atlas_results, vector_results, request
        )
        
        # Calculate search comprehensiveness and confidence
        search_comprehensiveness = self._calculate_search_comprehensiveness(
            total_atlas, total_vector, intersection_count
        )
        
        confidence_level = self._calculate_overall_confidence(
            atlas_results, vector_results, intersection_matches
        )
        
        return CombinedIntelligence(
            intersection_matches=intersection_matches,
            atlas_unique=atlas_unique,
            vector_unique=vector_unique,
            correlation_analysis=correlation_analysis,
            key_insights=key_insights,
            recommendations=recommendations,
            search_comprehensiveness=search_comprehensiveness,
            confidence_level=confidence_level
        )
    
    def _generate_semantic_relevance(
        self, 
        vector_match: SimilarEntity, 
        request: UnifiedSearchRequest
    ) -> str:
        """Generate explanation of why this entity is semantically relevant."""
        if request.semantic_query:
            return f"Semantically similar to query: '{request.semantic_query[:50]}...'"
        else:
            return f"Profile similarity score: {vector_match.vectorSearchScore:.3f}"
    
    def _calculate_combined_confidence(
        self, 
        atlas_score: float, 
        vector_score: float
    ) -> float:
        """Calculate combined confidence score from both search methods."""
        # Weighted average with slight boost for having both methods agree
        weighted_avg = (atlas_score * 0.6 + vector_score * 0.4)
        agreement_boost = 0.1 if abs(atlas_score - vector_score) < 0.2 else 0.0
        return min(1.0, weighted_avg + agreement_boost)
    
    def _recommend_search_method(
        self,
        atlas_count: int,
        vector_count: int,
        intersection_count: int,
        request: UnifiedSearchRequest
    ) -> Optional[SearchMethod]:
        """Recommend the best search method based on results."""
        if atlas_count > 0 and vector_count > 0:
            if intersection_count / max(atlas_count, vector_count) > 0.5:
                return SearchMethod.BOTH
            elif request.semantic_query:
                return SearchMethod.VECTOR
            else:
                return SearchMethod.ATLAS
        elif atlas_count > 0:
            return SearchMethod.ATLAS
        elif vector_count > 0:
            return SearchMethod.VECTOR
        else:
            return None
    
    def _generate_correlation_reasoning(
        self,
        atlas_count: int,
        vector_count: int,
        intersection_count: int,
        request: UnifiedSearchRequest
    ) -> List[str]:
        """Generate reasoning for search method recommendations."""
        reasoning = []
        
        if intersection_count > 0:
            reasoning.append(f"Both methods found {intersection_count} common entities, indicating strong agreement")
        
        if atlas_count > vector_count:
            reasoning.append("Atlas Search found more matches, good for traditional attribute matching")
        elif vector_count > atlas_count:
            reasoning.append("Vector Search found more matches, good for semantic similarity")
        
        if request.semantic_query:
            reasoning.append("Semantic query provided - Vector Search is optimal for this type of query")
        
        if request.name_full and request.address_full:
            reasoning.append("Traditional search fields provided - Atlas Search excels at exact/fuzzy matching")
        
        return reasoning
    
    def _generate_key_insights(
        self,
        atlas_results: List[PotentialMatch],
        vector_results: List[SimilarEntity],
        intersection_matches: List[EntityMatch],
        request: UnifiedSearchRequest
    ) -> List[str]:
        """Generate key insights from the search results."""
        insights = []
        
        total_unique = len({m.entityId for m in atlas_results} | {e.entityId for e in vector_results})
        
        insights.append(f"Found {total_unique} unique entities across both search methods")
        
        if intersection_matches:
            insights.append(f"{len(intersection_matches)} entities confirmed by both Atlas and Vector search")
            avg_combined_confidence = sum(m.combined_confidence for m in intersection_matches) / len(intersection_matches)
            insights.append(f"Average combined confidence: {avg_combined_confidence:.1%}")
        
        if atlas_results and not vector_results:
            insights.append("Atlas Search found traditional matches - no semantic similarity detected")
        elif vector_results and not atlas_results:
            insights.append("Vector Search found semantic matches - no traditional attribute matches")
        elif atlas_results and vector_results:
            insights.append("Both search methods successful - comprehensive entity coverage achieved")
        
        return insights
    
    def _generate_recommendations(
        self,
        correlation_analysis: CorrelationAnalysis,
        atlas_results: List[PotentialMatch],
        vector_results: List[SimilarEntity],
        request: UnifiedSearchRequest
    ) -> List[str]:
        """Generate actionable recommendations for investigation."""
        recommendations = []
        
        if correlation_analysis.intersection_count > 0:
            recommendations.append("Review intersection matches first - highest confidence entities")
        
        if correlation_analysis.atlas_unique_count > 0:
            recommendations.append("Investigate Atlas-only matches for traditional duplicates")
        
        if correlation_analysis.vector_unique_count > 0:
            recommendations.append("Examine Vector-only matches for behavioral similarities")
        
        if correlation_analysis.correlation_percentage < 20:
            recommendations.append("Low correlation suggests diverse entity types - consider expanding search criteria")
        elif correlation_analysis.correlation_percentage > 80:
            recommendations.append("High correlation indicates consistent entity profiles across methods")
        
        return recommendations
    
    def _calculate_search_comprehensiveness(
        self, 
        atlas_count: int, 
        vector_count: int, 
        intersection_count: int
    ) -> float:
        """Calculate how comprehensive the search was (0-1)."""
        if atlas_count == 0 and vector_count == 0:
            return 0.0
        
        # High comprehensiveness if both methods found results
        if atlas_count > 0 and vector_count > 0:
            return 0.9 + (intersection_count / max(atlas_count, vector_count)) * 0.1
        else:
            # Lower comprehensiveness if only one method found results
            return 0.6
    
    def _calculate_overall_confidence(
        self,
        atlas_results: List[PotentialMatch],
        vector_results: List[SimilarEntity],
        intersection_matches: List[EntityMatch]
    ) -> float:
        """Calculate overall confidence in the search results (0-1)."""
        if not atlas_results and not vector_results:
            return 0.0
        
        confidences = []
        
        # Add Atlas Search confidences
        for match in atlas_results:
            confidences.append(match.searchScore)
        
        # Add Vector Search confidences
        for entity in vector_results:
            confidences.append(entity.vectorSearchScore)
        
        # Boost confidence if we have intersection matches
        if intersection_matches:
            combined_confidences = [m.combined_confidence for m in intersection_matches]
            confidences.extend(combined_confidences)
        
        return sum(confidences) / len(confidences) if confidences else 0.0