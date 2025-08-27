"""
Vector Search Repository Interface - Clean contract for vector search operations

Defines the interface for MongoDB Vector Search operations based on
analysis of current vector_search.py service usage patterns.
"""

from abc import ABC, abstractmethod
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass


@dataclass
class VectorSearchParams:
    """Parameters for vector search queries"""
    query_vector: List[float]
    num_candidates: int = 100
    limit: int = 10
    filters: Optional[Dict[str, Any]] = None
    similarity_threshold: Optional[float] = None


@dataclass
class VectorSearchResult:
    """Vector search result with similarity score"""
    document: Dict[str, Any]
    similarity_score: float
    vector_distance: Optional[float] = None


@dataclass
class EmbeddingStats:
    """Statistics about embeddings in the collection"""
    total_documents: int
    documents_with_embeddings: int
    embedding_dimensions: int
    average_embedding_length: float
    embedding_coverage_percentage: float


class VectorSearchRepositoryInterface(ABC):
    """Interface for vector search repository operations"""
    
    # ==================== CORE VECTOR SEARCH OPERATIONS ====================
    
    @abstractmethod
    async def vector_search(self, params: VectorSearchParams) -> List[VectorSearchResult]:
        """
        Perform vector similarity search
        
        Args:
            params: Vector search parameters
            
        Returns:
            List[VectorSearchResult]: Similar documents with scores
        """
        pass
    
    @abstractmethod
    async def find_similar_by_vector(self, query_vector: List[float],
                                   limit: int = 10,
                                   filters: Optional[Dict[str, Any]] = None,
                                   similarity_threshold: Optional[float] = None) -> List[Dict[str, Any]]:
        """
        Find similar entities by vector embedding
        
        Args:
            query_vector: Query vector embedding
            limit: Maximum number of results
            filters: Optional filters to apply
            similarity_threshold: Minimum similarity threshold
            
        Returns:
            List[Dict]: Similar entities with similarity scores
        """
        pass
    
    @abstractmethod
    async def find_similar_by_text(self, query_text: str,
                                 limit: int = 10,
                                 filters: Optional[Dict[str, Any]] = None,
                                 similarity_threshold: Optional[float] = None) -> List[Dict[str, Any]]:
        """
        Find similar entities by generating embedding from text
        
        Args:
            query_text: Text to convert to embedding and search
            limit: Maximum number of results
            filters: Optional filters to apply
            similarity_threshold: Minimum similarity threshold
            
        Returns:
            List[Dict]: Similar entities with similarity scores
        """
        pass
    
    @abstractmethod
    async def find_similar_by_entity_id(self, entity_id: str,
                                      limit: int = 10,
                                      filters: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        """
        Find entities similar to a specific entity
        
        Args:
            entity_id: Entity to find similar entities for
            limit: Maximum number of results  
            filters: Optional filters to apply
            
        Returns:
            List[Dict]: Similar entities with similarity scores
        """
        pass
    
    # ==================== EMBEDDING MANAGEMENT ====================
    
    @abstractmethod
    async def store_embedding(self, entity_id: str, embedding: List[float],
                            metadata: Optional[Dict[str, Any]] = None) -> bool:
        """
        Store or update embedding for an entity
        
        Args:
            entity_id: Entity identifier
            embedding: Vector embedding
            metadata: Optional embedding metadata
            
        Returns:
            bool: True if storage successful
        """
        pass
    
    @abstractmethod
    async def get_embedding(self, entity_id: str) -> Optional[List[float]]:
        """
        Get embedding for an entity
        
        Args:
            entity_id: Entity identifier
            
        Returns:
            Optional[List[float]]: Entity embedding or None if not found
        """
        pass
    
    @abstractmethod
    async def delete_embedding(self, entity_id: str) -> bool:
        """
        Delete embedding for an entity
        
        Args:
            entity_id: Entity identifier
            
        Returns:
            bool: True if deletion successful
        """
        pass
    
    @abstractmethod
    async def bulk_store_embeddings(self, embeddings: Dict[str, List[float]]) -> Dict[str, int]:
        """
        Store multiple embeddings in bulk
        
        Args:
            embeddings: Dictionary of entity_id -> embedding
            
        Returns:
            Dict[str, int]: Results summary (stored_count, failed_count)
        """
        pass
    
    # ==================== EMBEDDING GENERATION ====================
    
    @abstractmethod
    async def generate_embedding_from_text(self, text: str) -> List[float]:
        """
        Generate embedding from text using configured embedding model
        
        Args:
            text: Text to convert to embedding
            
        Returns:
            List[float]: Generated embedding vector
        """
        pass
    
    @abstractmethod
    async def generate_entity_embedding(self, entity_data: Dict[str, Any]) -> List[float]:
        """
        Generate embedding from entity data
        
        Args:
            entity_data: Entity data dictionary
            
        Returns:
            List[float]: Generated embedding vector
        """
        pass
    
    @abstractmethod
    async def batch_generate_embeddings(self, entities: List[Dict[str, Any]]) -> Dict[str, List[float]]:
        """
        Generate embeddings for multiple entities
        
        Args:
            entities: List of entity data dictionaries
            
        Returns:
            Dict[str, List[float]]: Generated embeddings by entity ID
        """
        pass
    
    # ==================== SIMILARITY ANALYSIS ====================
    
    @abstractmethod
    async def calculate_similarity(self, vector1: List[float], 
                                 vector2: List[float],
                                 similarity_metric: str = "cosine") -> float:
        """
        Calculate similarity between two vectors
        
        Args:
            vector1: First vector
            vector2: Second vector
            similarity_metric: Similarity metric (cosine, euclidean, dot_product)
            
        Returns:
            float: Similarity score
        """
        pass
    
    @abstractmethod
    async def find_nearest_neighbors(self, query_vector: List[float],
                                   k: int = 10,
                                   filters: Optional[Dict[str, Any]] = None) -> List[Tuple[str, float]]:
        """
        Find k-nearest neighbors for a vector
        
        Args:
            query_vector: Query vector
            k: Number of neighbors to find
            filters: Optional filters to apply
            
        Returns:
            List[Tuple[str, float]]: List of (entity_id, distance) tuples
        """
        pass
    
    @abstractmethod
    async def cluster_similar_entities(self, entity_ids: List[str],
                                     similarity_threshold: float = 0.8,
                                     max_cluster_size: int = 50) -> List[List[str]]:
        """
        Cluster entities by vector similarity
        
        Args:
            entity_ids: List of entity IDs to cluster
            similarity_threshold: Minimum similarity for clustering
            max_cluster_size: Maximum entities per cluster
            
        Returns:
            List[List[str]]: Clusters of similar entity IDs
        """
        pass
    
    # ==================== VECTOR SEARCH ANALYTICS ====================
    
    @abstractmethod
    async def get_embedding_statistics(self) -> EmbeddingStats:
        """
        Get statistics about embeddings in the collection
        
        Returns:
            EmbeddingStats: Comprehensive embedding statistics
        """
        pass
    
    @abstractmethod
    async def get_vector_search_performance(self, sample_size: int = 100) -> Dict[str, Any]:
        """
        Measure vector search performance metrics
        
        Args:
            sample_size: Number of sample queries to run
            
        Returns:
            Dict: Performance metrics (avg_query_time, throughput, etc.)
        """
        pass
    
    @abstractmethod
    async def analyze_embedding_quality(self, entity_ids: Optional[List[str]] = None) -> Dict[str, Any]:
        """
        Analyze embedding quality and distribution
        
        Args:
            entity_ids: Optional specific entities to analyze
            
        Returns:
            Dict: Quality analysis results
        """
        pass
    
    # ==================== INDEX MANAGEMENT ====================
    
    @abstractmethod
    async def get_vector_index_info(self, index_name: str) -> Dict[str, Any]:
        """
        Get information about vector search index
        
        Args:
            index_name: Name of vector index
            
        Returns:
            Dict: Index information and statistics
        """
        pass
    
    @abstractmethod
    async def test_vector_index(self, index_name: str,
                              test_vector: Optional[List[float]] = None) -> Dict[str, Any]:
        """
        Test vector search index functionality
        
        Args:
            index_name: Name of index to test
            test_vector: Optional test vector
            
        Returns:
            Dict: Test results and index health
        """
        pass
    
    @abstractmethod
    async def optimize_vector_index(self, index_name: str) -> Dict[str, Any]:
        """
        Optimize vector search index performance
        
        Args:
            index_name: Name of index to optimize
            
        Returns:
            Dict: Optimization results
        """
        pass
    
    # ==================== HYBRID SEARCH ====================
    
    @abstractmethod
    async def hybrid_search(self, text_query: str,
                          vector_query: List[float],
                          text_weight: float = 0.5,
                          vector_weight: float = 0.5,
                          limit: int = 10) -> List[Dict[str, Any]]:
        """
        Perform hybrid text and vector search
        
        Args:
            text_query: Text search query
            vector_query: Vector search query
            text_weight: Weight for text search results
            vector_weight: Weight for vector search results
            limit: Maximum combined results
            
        Returns:
            List[Dict]: Combined and re-ranked results
        """
        pass
    
    @abstractmethod
    async def semantic_search_with_filters(self, query: str,
                                         filters: Dict[str, Any],
                                         boost_factors: Optional[Dict[str, float]] = None,
                                         limit: int = 10) -> List[Dict[str, Any]]:
        """
        Perform semantic search with metadata filtering and boosting
        
        Args:
            query: Semantic search query
            filters: Metadata filters to apply
            boost_factors: Optional field boosting factors
            limit: Maximum results
            
        Returns:
            List[Dict]: Filtered and boosted semantic search results
        """
        pass
    
    # ==================== EMBEDDING MAINTENANCE ====================
    
    @abstractmethod
    async def refresh_embeddings(self, entity_ids: Optional[List[str]] = None,
                               force_regenerate: bool = False) -> Dict[str, int]:
        """
        Refresh embeddings for entities
        
        Args:
            entity_ids: Optional specific entities to refresh
            force_regenerate: Force regeneration even if embedding exists
            
        Returns:
            Dict[str, int]: Refresh results (updated_count, failed_count)
        """
        pass
    
    @abstractmethod
    async def validate_embeddings(self, entity_ids: Optional[List[str]] = None) -> Dict[str, Any]:
        """
        Validate embedding data integrity
        
        Args:
            entity_ids: Optional specific entities to validate
            
        Returns:
            Dict: Validation results and any issues found
        """
        pass
    
    @abstractmethod
    async def cleanup_invalid_embeddings(self) -> Dict[str, int]:
        """
        Clean up invalid or corrupted embeddings
        
        Returns:
            Dict[str, int]: Cleanup results (removed_count, fixed_count)
        """
        pass
    
    # ==================== SEARCH RESULT ENHANCEMENT ====================
    
    @abstractmethod
    async def enhance_search_results(self, results: List[Dict[str, Any]],
                                   include_explanations: bool = False,
                                   include_similar_entities: bool = False) -> List[Dict[str, Any]]:
        """
        Enhance search results with additional information
        
        Args:
            results: Raw search results
            include_explanations: Include similarity explanations
            include_similar_entities: Include related similar entities
            
        Returns:
            List[Dict]: Enhanced search results
        """
        pass
    
    @abstractmethod
    async def explain_similarity(self, entity1_id: str, entity2_id: str) -> Dict[str, Any]:
        """
        Explain why two entities are similar
        
        Args:
            entity1_id: First entity ID
            entity2_id: Second entity ID
            
        Returns:
            Dict: Similarity explanation and contributing factors
        """
        pass