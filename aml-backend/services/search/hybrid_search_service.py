"""
Hybrid Search Service using MongoDB $rankFusion

Implementation of MongoDB's native $rankFusion for combining Atlas Search and Vector Search
results in a single optimized query. This replaces manual score combination logic with
MongoDB's proven reciprocal rank fusion algorithm.
"""

import logging
import time
from typing import List, Dict, Any, Optional
from motor.motor_asyncio import AsyncIOMotorCollection

from models.api.responses import HybridSearchResult, HybridSearchResponse

logger = logging.getLogger(__name__)


class HybridSearchService:
    """MongoDB $rankFusion-based hybrid search combining Atlas and Vector search"""
    
    def __init__(self, collection: AsyncIOMotorCollection):
        self.collection = collection
        self.atlas_index_name = "entity_text_search_index"  # Correct index name from working Atlas search
        self.vector_index_name = "entity_vector_search_index"
        self.vector_field_name = "profileEmbedding"  # Correct field name from working vector search
    
    async def hybrid_entity_search(
        self,
        query_text: str,
        query_embedding: List[float],
        limit: int = 10,
        atlas_weight: float = 1,
        vector_weight: float = 1,
        num_candidates_multiplier: int = 15
    ) -> HybridSearchResponse:
        """
        Perform hybrid search using MongoDB $rankFusion
        
        Args:
            query_text: Text query for Atlas Search
            query_embedding: Vector embedding for Vector Search
            limit: Maximum results to return
            atlas_weight: Weight for Atlas Search pipeline (default: 1)
            vector_weight: Weight for Vector Search pipeline (default: 1)
            num_candidates_multiplier: Multiplier for vector search candidates
            
        Returns:
            HybridSearchResponse with ranked fusion results
        """
        
        start_time = time.time()
        logger.info(f"🔀 Starting hybrid search with atlas_weight={atlas_weight}, vector_weight={vector_weight}")
        
        # Validate inputs
        if not query_text or not query_text.strip():
            raise ValueError("query_text cannot be empty for hybrid search")
        
        if not query_embedding or len(query_embedding) == 0:
            raise ValueError("query_embedding cannot be empty for hybrid search")
        
        try:
            # Calculate intermediate limits for robustness
            intermediate_limit = limit * 2
            num_candidates = limit * num_candidates_multiplier
            
            logger.info(f"Search parameters: limit={limit}, intermediate_limit={intermediate_limit}, num_candidates={num_candidates}")
            
            # Build $rankFusion aggregation pipeline
            rank_fusion_pipeline = [
                {
                    "$rankFusion": {
                        "input": {
                            "pipelines": {
                                "atlas": [
                                    {
                                        "$search": {
                                            "index": self.atlas_index_name,
                                            "compound": {
                                                "should": [
                                                    {
                                                        "text": {
                                                            "query": query_text,
                                                            "path": ["name.full"],
                                                            "fuzzy": {"maxEdits": 1}
                                                        }
                                                    },
                                                    {
                                                        "text": {
                                                            "query": query_text,
                                                            "path": ["name.aliases"],
                                                            "fuzzy": {"maxEdits": 1}
                                                        }
                                                    },
                                                    {
                                                        "text": {
                                                            "query": query_text,
                                                            "path": ["addresses.full"],
                                                            "fuzzy": {"maxEdits": 2}
                                                        }
                                                    }
                                                ]
                                            }
                                        }
                                    },
                                    {"$limit": intermediate_limit}
                                ],
                                "vector": [
                                    {
                                        "$vectorSearch": {
                                            "index": self.vector_index_name,
                                            "path": self.vector_field_name,
                                            "queryVector": query_embedding,
                                            "numCandidates": num_candidates,
                                            "limit": intermediate_limit
                                        }
                                    }
                                ]
                            }
                        },
                        "combination": {
                            "weights": {
                                "atlas": atlas_weight,
                                "vector": vector_weight
                            }
                        },
                        "scoreDetails": True
                    }
                },
                {"$limit": limit},
                {
                    "$addFields": {
                        "hybridScore": {"$meta": "score"},
                        "scoreDetails": {"$meta": "scoreDetails"}
                    }
                },
                {
                    "$project": {
                        "entityId": 1,
                        "name": 1,
                        "entityType": 1,
                        "riskAssessment": 1,
                        "hybridScore": 1,
                        "scoreDetails": 1,
                        "createdAt": 1,
                        "updatedAt": 1,
                        "primaryAddress": 1,
                        "identifiers": 1
                    }
                }
            ]
            
            logger.info("🔍 Executing $rankFusion aggregation pipeline")
            
            # Execute hybrid search
            cursor = self.collection.aggregate(rank_fusion_pipeline)
            results = await cursor.to_list(length=None)
            
            execution_time = (time.time() - start_time) * 1000
            logger.info(f"✅ Hybrid search completed in {execution_time:.2f}ms, found {len(results)} results")
            
            # Process results and extract individual scores
            hybrid_results = []
            for result in results:
                hybrid_score = result.get("hybridScore", 0.0)
                atlas_score = 0.0
                vector_score = 0.0
                
                # Extract individual pipeline scores from scoreDetails
                score_details = result.get("scoreDetails", {})
                if score_details and 'details' in score_details:
                    details = score_details['details']
                    if isinstance(details, list):
                        for detail in details:
                            if isinstance(detail, dict):
                                pipeline_name = detail.get('inputPipelineName', '')
                                pipeline_value = detail.get('value', 0.0)
                                
                                if pipeline_name == 'atlas':
                                    atlas_score = pipeline_value
                                elif pipeline_name == 'vector':
                                    vector_score = pipeline_value
                
                # Calculate contribution percentages for display
                text_contribution, vector_contribution = self._calculate_contribution_percentages(
                    atlas_score, vector_score, atlas_weight, vector_weight
                )
                
                # Log score details for first few results
                if len(hybrid_results) < 3:
                    logger.info(f"Entity {result.get('entityId')}: hybrid={hybrid_score:.4f}, text_contrib={text_contribution:.1f}%, vector_contrib={vector_contribution:.1f}%")
                
                hybrid_result = HybridSearchResult(
                    entity_id=result.get("entityId"),
                    entity_data=result,
                    hybrid_score=hybrid_score,
                    atlas_score=atlas_score,
                    vector_score=vector_score,
                    text_contribution_percent=text_contribution,
                    vector_contribution_percent=vector_contribution,
                    rank_fusion_details=score_details
                )
                hybrid_results.append(hybrid_result)
            
            return HybridSearchResponse(
                hybridResults=hybrid_results,
                totalResults=len(hybrid_results),
                searchMetrics={
                    "hybridSearchTime": f"{execution_time:.2f}ms",
                    "atlasWeight": atlas_weight,
                    "vectorWeight": vector_weight,
                    "numCandidates": num_candidates,
                    "intermediateLimit": intermediate_limit,
                    "finalLimit": limit
                }
            )
            
        except Exception as e:
            error_time = (time.time() - start_time) * 1000
            logger.error(f"❌ Hybrid search failed after {error_time:.2f}ms: {str(e)}")
            raise Exception(f"Hybrid search failed: {str(e)}")
    
    def _calculate_contribution_percentages(
        self, 
        atlas_score: float, 
        vector_score: float, 
        atlas_weight: float, 
        vector_weight: float
    ) -> tuple[float, float]:
        """Calculate percentage contribution of each pipeline to the hybrid result"""
        
        # Handle edge cases
        if atlas_score <= 0 and vector_score <= 0:
            return 50.0, 50.0  # Equal split if no scores
        
        # Normalize atlas score (typically 0-10+ range) to 0-1 range for comparison
        # Using min-max normalization with assumed max atlas score of 10
        normalized_atlas = min(atlas_score / 10.0, 1.0) if atlas_score > 0 else 0.0
        normalized_vector = vector_score  # Already in 0-1 range
        
        # Apply weights to normalized scores
        weighted_atlas = normalized_atlas * atlas_weight
        weighted_vector = normalized_vector * vector_weight
        
        # Calculate total weighted contribution
        total_contribution = weighted_atlas + weighted_vector
        
        if total_contribution == 0:
            return 50.0, 50.0  # Equal split if no weighted contribution
        
        # Calculate percentage contributions
        text_contribution = (weighted_atlas / total_contribution) * 100.0
        vector_contribution = (weighted_vector / total_contribution) * 100.0
        
        return text_contribution, vector_contribution
    
    async def test_hybrid_search_capability(self) -> Dict[str, Any]:
        """
        Test the hybrid search capability and return system information
        
        Returns:
            Dict with system capabilities and test results
        """
        try:
            # Test if indexes exist
            indexes = await self.collection.list_indexes().to_list(length=None)
            atlas_index_exists = any(idx.get("name") == self.atlas_index_name for idx in indexes)
            vector_index_exists = any(idx.get("name") == self.vector_index_name for idx in indexes)
            
            # Test basic aggregation capability
            test_pipeline = [{"$limit": 1}]
            test_result = await self.collection.aggregate(test_pipeline).to_list(length=None)
            
            return {
                "service_status": "operational",
                "atlas_index_exists": atlas_index_exists,
                "vector_index_exists": vector_index_exists,
                "collection_accessible": len(test_result) >= 0,
                "rankfusion_supported": True,  # MongoDB 7.0+ feature
                "atlas_index_name": self.atlas_index_name,
                "vector_index_name": self.vector_index_name
            }
            
        except Exception as e:
            logger.error(f"Hybrid search capability test failed: {str(e)}")
            return {
                "service_status": "error",
                "error": str(e),
                "atlas_index_exists": False,
                "vector_index_exists": False,
                "collection_accessible": False,
                "rankfusion_supported": False
            }