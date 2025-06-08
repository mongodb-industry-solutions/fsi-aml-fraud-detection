"""
Vector search service for finding semantically similar entities using MongoDB Atlas Vector Search.
"""

import logging
from typing import List, Dict, Any, Optional, Tuple
from motor.motor_asyncio import AsyncIOMotorClient
from dependencies import ENTITY_VECTOR_SEARCH_INDEX

logger = logging.getLogger(__name__)

class VectorSearchService:
    """Service for performing vector search on entity profiles."""
    
    def __init__(self, database):
        """
        Initialize vector search service with database object.
        
        Args:
            database: AsyncIOMotorDatabase instance
        """
        self.database = database
        self.entities_collection = "entities"
        self.vector_index_name = ENTITY_VECTOR_SEARCH_INDEX
    
    async def find_similar_entities_by_id(
        self, 
        entity_id: str, 
        limit: int = 5,
        filters: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        """
        Find entities similar to the given entity using its profile embedding.
        
        Args:
            entity_id: The ID of the entity to find similar entities for
            limit: Maximum number of results to return
            filters: Optional filters for entity type, risk level, etc.
            
        Returns:
            List of similar entities with vector search scores
        """
        try:
            # Get the source entity and its embedding
            collection = self.database[self.entities_collection]
            
            source_entity = await collection.find_one({"entityId": entity_id})
            if not source_entity:
                logger.warning(f"Entity {entity_id} not found")
                return []
            
            profile_embedding = source_entity.get("profileEmbedding")
            if not profile_embedding:
                logger.warning(f"Entity {entity_id} has no profile embedding")
                return []
            
            return await self._perform_vector_search(
                query_vector=profile_embedding,
                limit=limit,
                filters=filters,
                exclude_entity_id=entity_id
            )
            
        except Exception as e:
            logger.error(f"Error finding similar entities for {entity_id}: {str(e)}")
            return []
    
    async def find_similar_entities_by_text(
        self,
        query_text: str,
        limit: int = 5,
        filters: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        """
        Find entities similar to the given text query using embedding generation.
        
        Args:
            query_text: Text description to search for
            limit: Maximum number of results to return
            filters: Optional filters for entity type, risk level, etc.
            
        Returns:
            List of similar entities with vector search scores
        """
        try:
            from bedrock.embeddings import get_embedding
            
            logger.info(f"Generating embeddings for text query: {query_text[:100]}...")
            
            # Generate embeddings for the query text using AWS Bedrock
            query_vector = await get_embedding(query_text)
            
            if not query_vector:
                logger.warning("Failed to generate embeddings for query text")
                return []
            
            logger.info(f"Generated {len(query_vector)}-dimensional embedding for text query")
            
            # Use the generated embedding to perform vector search
            return await self._perform_vector_search(
                query_vector=query_vector,
                limit=limit,
                filters=filters,
                exclude_entity_id=None
            )
            
        except ImportError as e:
            logger.error(f"Bedrock embeddings service not available: {str(e)}")
            return []
        except Exception as e:
            logger.error(f"Error finding similar entities for text '{query_text}': {str(e)}")
            return []
    
    async def _perform_vector_search(
        self,
        query_vector: List[float],
        limit: int = 5,
        filters: Optional[Dict[str, Any]] = None,
        exclude_entity_id: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Perform vector search using MongoDB Atlas Vector Search.
        
        Args:
            query_vector: The vector to search with
            limit: Maximum number of results
            filters: Optional metadata filters
            exclude_entity_id: Entity ID to exclude from results
            
        Returns:
            List of entities with similarity scores
        """
        try:
            collection = self.database[self.entities_collection]
            
            # Build the vector search pipeline
            pipeline = [
                {
                    "$vectorSearch": {
                        "index": self.vector_index_name,
                        "path": "profileEmbedding",
                        "queryVector": query_vector,
                        "numCandidates": min(100, limit * 10),  # Search more candidates for better results
                        "limit": limit + (1 if exclude_entity_id else 0)  # Account for excluded entity
                    }
                }
            ]
            
            # Add filters if provided
            if filters or exclude_entity_id:
                filter_conditions = {}
                
                if exclude_entity_id:
                    filter_conditions["entityId"] = {"$ne": exclude_entity_id}
                
                if filters:
                    if "entityType" in filters:
                        filter_conditions["entityType"] = filters["entityType"]
                    if "riskLevel" in filters:
                        filter_conditions["riskAssessment.overall.level"] = filters["riskLevel"]
                    if "minRiskScore" in filters or "maxRiskScore" in filters:
                        risk_filter = {}
                        if "minRiskScore" in filters:
                            risk_filter["$gte"] = filters["minRiskScore"]
                        if "maxRiskScore" in filters:
                            risk_filter["$lte"] = filters["maxRiskScore"]
                        filter_conditions["riskAssessment.overall.score"] = risk_filter
                    if "resolutionStatus" in filters:
                        filter_conditions["resolution.status"] = filters["resolutionStatus"]
                
                if filter_conditions:
                    pipeline.append({"$match": filter_conditions})
            
            # Project the fields we need for debugging and verification
            pipeline.append({
                "$project": {
                    "_id": 1,
                    "entityId": 1,
                    "entityType": 1,
                    "name": 1,
                    "addresses": 1,  # Include for debugging
                    "identifiers": 1,  # Include for debugging
                    "dateOfBirth": 1,  # Include for debugging
                    "riskAssessment": 1,
                    "profileSummaryText": 1,
                    "resolution": 1,
                    "lastUpdated": 1,
                    "createdAt": 1,
                    # Add explicit vector search score handling
                    "vectorSearchScore": {"$meta": "vectorSearchScore"},
                    "hasEmbedding": {"$ifNull": [{"$type": "$profileEmbedding"}, "missing"]}
                }
            })
            
            # Limit results
            pipeline.append({"$limit": limit})
            
            # Execute the search with comprehensive logging
            logger.info(f"Executing vector search pipeline: {pipeline}")
            
            similar_entities = []
            entity_count = 0
            async for entity in collection.aggregate(pipeline):
                entity_count += 1
                
                # Log vector search score for debugging
                vector_score = entity.get("vectorSearchScore")
                entity_id = entity.get("entityId", "unknown")
                has_embedding = entity.get("hasEmbedding", "unknown")
                
                logger.debug(f"Entity {entity_id}: vectorSearchScore={vector_score}, hasEmbedding={has_embedding}")
                
                # Convert ObjectId to string for JSON serialization
                if "_id" in entity:
                    entity["_id"] = str(entity["_id"])
                    
                # Handle NaN vector scores
                if vector_score is None or str(vector_score).lower() == 'nan':
                    logger.warning(f"Entity {entity_id} has invalid vector search score: {vector_score}")
                    entity["vectorSearchScore"] = 0.0
                
                similar_entities.append(entity)
            
            logger.info(f"Vector search completed: found {entity_count} entities")
            
            logger.info(f"Found {len(similar_entities)} similar entities using vector search")
            return similar_entities
            
        except Exception as e:
            logger.error(f"Error performing vector search: {str(e)}")
            return []
    
    async def get_vector_search_stats(self) -> Dict[str, Any]:
        """
        Get statistics about vector search capabilities and indexed entities.
        
        Returns:
            Dictionary with vector search statistics
        """
        try:
            collection = self.database[self.entities_collection]
            
            # Count total entities
            total_entities = await collection.count_documents({})
            
            # Count entities with embeddings
            entities_with_embeddings = await collection.count_documents({
                "profileEmbedding": {"$exists": True, "$ne": None, "$not": {"$size": 0}}
            })
            
            # Count by entity type
            entity_type_pipeline = [
                {"$match": {"profileEmbedding": {"$exists": True, "$ne": None}}},
                {"$group": {"_id": "$entityType", "count": {"$sum": 1}}}
            ]
            entity_types = {}
            async for result in collection.aggregate(entity_type_pipeline):
                entity_types[result["_id"]] = result["count"]
            
            # Count by risk level
            risk_level_pipeline = [
                {"$match": {"profileEmbedding": {"$exists": True, "$ne": None}}},
                {"$group": {"_id": "$riskAssessment.overall.level", "count": {"$sum": 1}}}
            ]
            risk_levels = {}
            async for result in collection.aggregate(risk_level_pipeline):
                risk_levels[result["_id"]] = result["count"]
            
            return {
                "total_entities": total_entities,
                "entities_with_embeddings": entities_with_embeddings,
                "embedding_coverage": round(entities_with_embeddings / total_entities * 100, 2) if total_entities > 0 else 0,
                "vector_index_name": self.vector_index_name,
                "entity_types": entity_types,
                "risk_levels": risk_levels
            }
            
        except Exception as e:
            logger.error(f"Error getting vector search stats: {str(e)}")
            return {
                "error": str(e),
                "total_entities": 0,
                "entities_with_embeddings": 0,
                "embedding_coverage": 0
            }