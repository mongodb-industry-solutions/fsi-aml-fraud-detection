"""
Vector Search Service - Refactored to use repository pattern

Clean service focused on business logic for vector search operations,
using VectorSearchRepository for all data access and embedding operations.
"""

import logging
from typing import List, Dict, Any, Optional
from datetime import datetime

from repositories.interfaces.vector_search_repository import VectorSearchRepositoryInterface
from models.api.requests import VectorSearchRequest, SimilaritySearchRequest
from models.api.responses import SearchResponse, SearchMatch
from models.core.entity import Entity

logger = logging.getLogger(__name__)


class VectorSearchService:
    """
    Vector Search service using repository pattern
    
    Focuses on business logic for vector similarity operations while delegating
    all data access and embedding generation to VectorSearchRepository.
    """
    
    def __init__(self, vector_search_repo: VectorSearchRepositoryInterface):
        """
        Initialize Vector Search service
        
        Args:
            vector_search_repo: VectorSearchRepository for data access and embeddings
        """
        self.vector_search_repo = vector_search_repo
        
        # Business logic configuration
        self.default_limit = 10
        self.similarity_threshold = 0.7
        self.confidence_threshold = 0.3
        
        logger.info("Vector Search service initialized with repository pattern")
    
    # ==================== ENTITY SIMILARITY OPERATIONS ====================
    
    async def find_similar_entities_by_id(self, entity_id: str, 
                                        limit: Optional[int] = None,
                                        similarity_threshold: Optional[float] = None,
                                        filters: Optional[Dict[str, Any]] = None) -> SearchResponse:
        """
        Find entities similar to a given entity using vector similarity
        
        Args:
            entity_id: Entity ID to find similar entities for
            limit: Maximum number of results
            similarity_threshold: Minimum similarity score
            filters: Additional filters for results
            
        Returns:
            SearchResponse: Similar entities with similarity scores
        """
        start_time = datetime.utcnow()
        
        try:
            logger.info(f"Finding similar entities for entity ID: {entity_id}")
            
            # Use repository to find similar entities
            similar_entities = await self.vector_search_repo.find_similar_by_entity_id(
                entity_id=entity_id,
                limit=limit or self.default_limit,
                similarity_threshold=similarity_threshold or self.similarity_threshold,
                filters=filters
            )
            
            # Process similarity results
            processed_matches = []
            for entity_data in similar_entities:
                match = await self._process_similarity_match(entity_data, "entity_similarity")
                if match and match.confidence_score >= self.confidence_threshold:
                    processed_matches.append(match)
            
            # Sort by similarity score (highest first)
            processed_matches.sort(key=lambda x: x.relevance_score, reverse=True)
            
            # Calculate search metadata
            processing_time = (datetime.utcnow() - start_time).total_seconds() * 1000
            metadata = {
                "search_type": "vector_entity_similarity",
                "processing_time_ms": processing_time,
                "source_entity_id": entity_id,
                "similarity_threshold": similarity_threshold or self.similarity_threshold,
                "total_matches": len(processed_matches),
                "filters_applied": filters is not None
            }
            
            logger.info(f"Found {len(processed_matches)} similar entities for {entity_id}")
            
            return SearchResponse(
                success=True,
                matches=processed_matches,
                total_matches=len(processed_matches),
                search_metadata=metadata
            )
            
        except Exception as e:
            logger.error(f"Entity similarity search failed for {entity_id}: {e}")
            
            processing_time = (datetime.utcnow() - start_time).total_seconds() * 1000
            return SearchResponse(
                success=False,
                matches=[],
                total_matches=0,
                error_message=f"Similarity search failed: {str(e)}",
                search_metadata={"processing_time_ms": processing_time}
            )
    
    async def find_similar_entities_by_text(self, query_text: str,
                                          limit: Optional[int] = None,
                                          similarity_threshold: Optional[float] = None,
                                          filters: Optional[Dict[str, Any]] = None) -> SearchResponse:
        """
        Find entities similar to provided text using semantic search
        
        Args:
            query_text: Text to search for similar entities
            limit: Maximum number of results
            similarity_threshold: Minimum similarity score
            filters: Additional filters for results
            
        Returns:
            SearchResponse: Entities similar to the query text
        """
        start_time = datetime.utcnow()
        
        try:
            logger.info(f"Finding entities similar to text: {query_text[:100]}...")
            
            # Use repository to find similar entities by text
            similar_entities = await self.vector_search_repo.find_similar_by_text(
                query_text=query_text,
                limit=limit or self.default_limit,
                similarity_threshold=similarity_threshold or self.similarity_threshold,
                filters=filters
            )
            
            # Process semantic search results
            processed_matches = []
            for entity_data in similar_entities:
                match = await self._process_similarity_match(entity_data, "semantic_search")
                if match and match.confidence_score >= self.confidence_threshold:
                    processed_matches.append(match)
            
            # Sort by relevance score
            processed_matches.sort(key=lambda x: x.relevance_score, reverse=True)
            
            # Calculate search metadata
            processing_time = (datetime.utcnow() - start_time).total_seconds() * 1000
            metadata = {
                "search_type": "vector_semantic_search",
                "processing_time_ms": processing_time,
                "query_text_length": len(query_text),
                "similarity_threshold": similarity_threshold or self.similarity_threshold,
                "total_matches": len(processed_matches),
                "embedding_generated": True
            }
            
            logger.info(f"Found {len(processed_matches)} entities similar to text query")
            
            return SearchResponse(
                success=True,
                matches=processed_matches,
                total_matches=len(processed_matches),
                search_metadata=metadata
            )
            
        except Exception as e:
            logger.error(f"Semantic search failed for text '{query_text}': {e}")
            
            processing_time = (datetime.utcnow() - start_time).total_seconds() * 1000
            return SearchResponse(
                success=False,
                matches=[],
                total_matches=0,
                error_message=f"Semantic search failed: {str(e)}",
                search_metadata={"processing_time_ms": processing_time}
            )
    
    async def find_similar_entities_by_vector(self, query_vector: List[float],
                                            limit: Optional[int] = None,
                                            similarity_threshold: Optional[float] = None,
                                            filters: Optional[Dict[str, Any]] = None) -> SearchResponse:
        """
        Find entities similar to provided vector
        
        Args:
            query_vector: Vector to search with
            limit: Maximum number of results
            similarity_threshold: Minimum similarity score
            filters: Additional filters for results
            
        Returns:
            SearchResponse: Entities similar to the query vector
        """
        start_time = datetime.utcnow()
        
        try:
            logger.info(f"Finding entities similar to {len(query_vector)}-dimensional vector")
            
            # Use repository for direct vector search
            similar_entities = await self.vector_search_repo.find_similar_by_vector(
                query_vector=query_vector,
                limit=limit or self.default_limit,
                similarity_threshold=similarity_threshold or self.similarity_threshold,
                filters=filters
            )
            
            # Process vector search results
            processed_matches = []
            for entity_data in similar_entities:
                match = await self._process_similarity_match(entity_data, "vector_search")
                if match and match.confidence_score >= self.confidence_threshold:
                    processed_matches.append(match)
            
            # Sort by similarity score
            processed_matches.sort(key=lambda x: x.relevance_score, reverse=True)
            
            # Calculate search metadata
            processing_time = (datetime.utcnow() - start_time).total_seconds() * 1000
            metadata = {
                "search_type": "direct_vector_search",
                "processing_time_ms": processing_time,
                "vector_dimensions": len(query_vector),
                "similarity_threshold": similarity_threshold or self.similarity_threshold,
                "total_matches": len(processed_matches)
            }
            
            logger.info(f"Found {len(processed_matches)} entities similar to vector")
            
            return SearchResponse(
                success=True,
                matches=processed_matches,
                total_matches=len(processed_matches),
                search_metadata=metadata
            )
            
        except Exception as e:
            logger.error(f"Vector search failed: {e}")
            
            processing_time = (datetime.utcnow() - start_time).total_seconds() * 1000
            return SearchResponse(
                success=False,
                matches=[],
                total_matches=0,
                error_message=f"Vector search failed: {str(e)}",
                search_metadata={"processing_time_ms": processing_time}
            )
    
    # ==================== SIMILARITY ANALYSIS ====================
    
    async def calculate_entity_similarity(self, entity1_id: str, entity2_id: str) -> Dict[str, Any]:
        """
        Calculate similarity score between two entities
        
        Args:
            entity1_id: First entity ID
            entity2_id: Second entity ID
            
        Returns:
            Dict: Similarity analysis results
        """
        try:
            logger.info(f"Calculating similarity between {entity1_id} and {entity2_id}")
            
            # Get embeddings for both entities
            embedding1 = await self.vector_search_repo.get_embedding(entity1_id)
            embedding2 = await self.vector_search_repo.get_embedding(entity2_id)
            
            if not embedding1 or not embedding2:
                return {
                    "success": False,
                    "error": "Could not retrieve embeddings for one or both entities"
                }
            
            # Calculate similarity using repository
            similarity_score = await self.vector_search_repo.calculate_similarity(
                vector1=embedding1,
                vector2=embedding2,
                metric="cosine"  # Default to cosine similarity
            )
            
            # Analyze similarity level
            similarity_level = self._categorize_similarity(similarity_score)
            
            return {
                "success": True,
                "entity1_id": entity1_id,
                "entity2_id": entity2_id,
                "similarity_score": similarity_score,
                "similarity_level": similarity_level,
                "similarity_metric": "cosine",
                "is_similar": similarity_score >= self.similarity_threshold
            }
            
        except Exception as e:
            logger.error(f"Similarity calculation failed: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    async def find_entity_clusters(self, entity_ids: List[str], 
                                 similarity_threshold: Optional[float] = None) -> Dict[str, Any]:
        """
        Find clusters of similar entities from a list
        
        Args:
            entity_ids: List of entity IDs to cluster
            similarity_threshold: Minimum similarity for clustering
            
        Returns:
            Dict: Clustering results
        """
        try:
            logger.info(f"Finding clusters among {len(entity_ids)} entities")
            
            threshold = similarity_threshold or self.similarity_threshold
            
            # Get embeddings for all entities
            embeddings_data = []
            for entity_id in entity_ids:
                embedding = await self.vector_search_repo.get_embedding(entity_id)
                if embedding:
                    embeddings_data.append({
                        "entity_id": entity_id,
                        "embedding": embedding
                    })
            
            # Perform clustering analysis
            clusters = await self._perform_clustering_analysis(embeddings_data, threshold)
            
            return {
                "success": True,
                "total_entities": len(entity_ids),
                "entities_with_embeddings": len(embeddings_data),
                "total_clusters": len(clusters),
                "clusters": clusters,
                "similarity_threshold": threshold
            }
            
        except Exception as e:
            logger.error(f"Entity clustering failed: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    # ==================== EMBEDDING MANAGEMENT ====================
    
    async def generate_entity_embedding(self, entity_id: str, 
                                       force_regenerate: bool = False) -> Dict[str, Any]:
        """
        Generate or update embedding for an entity
        
        Args:
            entity_id: Entity ID to generate embedding for
            force_regenerate: Whether to regenerate existing embedding
            
        Returns:
            Dict: Embedding generation results
        """
        try:
            logger.info(f"Generating embedding for entity: {entity_id}")
            
            # Check if embedding already exists
            existing_embedding = await self.vector_search_repo.get_embedding(entity_id)
            
            if existing_embedding and not force_regenerate:
                return {
                    "success": True,
                    "entity_id": entity_id,
                    "action": "existing_embedding_found",
                    "embedding_dimensions": len(existing_embedding),
                    "regenerated": False
                }
            
            # Generate new embedding through repository
            embedding = await self.vector_search_repo.generate_entity_embedding(entity_id)
            
            if not embedding:
                return {
                    "success": False,
                    "entity_id": entity_id,
                    "error": "Failed to generate embedding"
                }
            
            return {
                "success": True,
                "entity_id": entity_id,
                "action": "embedding_generated",
                "embedding_dimensions": len(embedding),
                "regenerated": force_regenerate
            }
            
        except Exception as e:
            logger.error(f"Embedding generation failed for {entity_id}: {e}")
            return {
                "success": False,
                "entity_id": entity_id,
                "error": str(e)
            }
    
    # ==================== HELPER METHODS ====================
    
    async def _process_similarity_match(self, entity_data: Dict[str, Any], 
                                       search_type: str) -> Optional[SearchMatch]:
        """
        Process raw similarity match data into SearchMatch model
        
        Args:
            entity_data: Raw entity data with similarity score
            search_type: Type of search performed
            
        Returns:
            SearchMatch: Processed match or None if invalid
        """
        try:
            # Extract entity information
            entity_id = entity_data.get("_id") or entity_data.get("entityId")
            if not entity_id:
                return None
            
            # Extract similarity score (from vector search)
            similarity_score = entity_data.get("score", 0.0)
            
            # Calculate confidence based on similarity score and search type
            confidence_score = self._calculate_similarity_confidence(similarity_score, search_type)
            
            # Create SearchMatch model
            return SearchMatch(
                entity_id=str(entity_id),
                entity_name=entity_data.get("name", ""),
                entity_type=entity_data.get("entity_type", "unknown"),
                confidence_score=confidence_score,
                relevance_score=similarity_score,
                match_reasons=[f"Vector {search_type}"],
                entity_data=entity_data
            )
            
        except Exception as e:
            logger.warning(f"Failed to process similarity match: {e}")
            return None
    
    def _calculate_similarity_confidence(self, similarity_score: float, search_type: str) -> float:
        """
        Calculate confidence score based on similarity score
        
        Args:
            similarity_score: Raw similarity score
            search_type: Type of search performed
            
        Returns:
            float: Confidence score between 0 and 1
        """
        try:
            # Base confidence from similarity score
            confidence = min(similarity_score, 1.0)
            
            # Adjust based on search type
            if search_type == "entity_similarity":
                # Entity-to-entity similarity is typically more reliable
                confidence = min(confidence + 0.1, 1.0)
            elif search_type == "semantic_search":
                # Semantic search might be less precise
                confidence = max(confidence - 0.05, 0.0)
            
            return round(confidence, 3)
            
        except Exception:
            return 0.0
    
    def _categorize_similarity(self, similarity_score: float) -> str:
        """
        Categorize similarity score into levels
        
        Args:
            similarity_score: Similarity score
            
        Returns:
            str: Similarity level category
        """
        if similarity_score >= 0.9:
            return "very_high"
        elif similarity_score >= 0.8:
            return "high"
        elif similarity_score >= 0.7:
            return "medium"
        elif similarity_score >= 0.5:
            return "low"
        else:
            return "very_low"
    
    async def _perform_clustering_analysis(self, embeddings_data: List[Dict[str, Any]], 
                                         threshold: float) -> List[Dict[str, Any]]:
        """
        Perform simple clustering analysis on embeddings data
        
        Args:
            embeddings_data: List of entities with embeddings
            threshold: Similarity threshold for clustering
            
        Returns:
            List[Dict]: Cluster information
        """
        try:
            clusters = []
            processed_entities = set()
            
            for i, entity1 in enumerate(embeddings_data):
                if entity1["entity_id"] in processed_entities:
                    continue
                
                # Start a new cluster
                cluster = {
                    "cluster_id": len(clusters),
                    "entities": [entity1["entity_id"]],
                    "center_entity": entity1["entity_id"]
                }
                
                processed_entities.add(entity1["entity_id"])
                
                # Find similar entities for this cluster
                for j, entity2 in enumerate(embeddings_data[i+1:], i+1):
                    if entity2["entity_id"] in processed_entities:
                        continue
                    
                    # Calculate similarity
                    similarity = await self.vector_search_repo.calculate_similarity(
                        vector1=entity1["embedding"],
                        vector2=entity2["embedding"],
                        metric="cosine"
                    )
                    
                    if similarity >= threshold:
                        cluster["entities"].append(entity2["entity_id"])
                        processed_entities.add(entity2["entity_id"])
                
                # Only add cluster if it has more than 1 entity
                if len(cluster["entities"]) > 1:
                    clusters.append(cluster)
            
            return clusters
            
        except Exception as e:
            logger.error(f"Clustering analysis failed: {e}")
            return []