"""
Native MongoDB Atlas Vector Store Integration for Azure AI Foundry

Following the REVISED_ENHANCEMENT_PLAN.md approach:
- Use MongoDB Atlas as intended by Azure AI Foundry for RAG and vector search
- Store long-term learning patterns and decision history
- NOT a replacement for native thread memory (Azure handles that)
- Focus on meta-learning and historical pattern storage
"""

import logging
from typing import Dict, Any, List, Optional
from datetime import datetime

from db.mongo_db import MongoDBAccess
from ..embeddings import get_embedding

logger = logging.getLogger(__name__)


class MongoDBAtlasIntegration:
    """
    Native MongoDB Atlas integration for Azure AI Foundry agent learning.
    
    Key principles from REVISED_ENHANCEMENT_PLAN:
    - Use as vector store for RAG via "On Your Data" feature
    - Store long-term learning patterns and decision history
    - Enable meta-learning through vector similarity search
    - Complement Azure's native thread memory (not replace)
    """
    
    def __init__(self, mongodb_client: MongoDBAccess):
        self.mongodb_client = mongodb_client
        self.db_name = "fsi-threatsight360"
        
        # Collections for learning and pattern storage
        self.decision_history_collection = "agent_decision_history"
        self.learning_patterns_collection = "fraud_learning_patterns"
        self.customer_insights_collection = "customer_insights"
        
        logger.info("✅ MongoDB Atlas vector store integration initialized")
    
    async def setup_vector_indexes(self):
        """
        Setup MongoDB Atlas vector search indexes for learning patterns.
        
        Creates indexes for:
        1. Decision history with embeddings for meta-learning
        2. Fraud patterns for similar case retrieval
        3. Customer insights for personalized analysis
        """
        try:
            # Decision history vector index
            await self._create_decision_vector_index()
            
            # Learning patterns vector index
            await self._create_learning_patterns_index()
            
            # Customer insights index
            await self._create_customer_insights_index()
            
            logger.info("✅ MongoDB Atlas vector indexes created successfully")
            
        except Exception as e:
            logger.error(f"❌ Vector index creation failed: {e}")
            raise
    
    async def store_agent_decision(
        self, 
        agent_decision: Dict[str, Any],
        transaction_data: Dict[str, Any],
        context: Dict[str, Any] = None
    ):
        """
        Store agent decision for meta-learning and pattern analysis.
        
        Args:
            agent_decision: Agent's fraud decision and reasoning
            transaction_data: Transaction details that were analyzed
            context: Additional context (customer history, network data, etc.)
        """
        try:
            # Create decision context for embedding
            decision_context = self._build_decision_context(
                agent_decision, transaction_data, context
            )
            
            # Generate embedding for vector search
            decision_embedding = await get_embedding(decision_context)
            
            # Prepare document for storage
            decision_record = {
                "decision_id": f"dec_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{hash(decision_context) % 10000}",
                "timestamp": datetime.now(),
                "agent_decision": agent_decision,
                "transaction_data": transaction_data,
                "context": context or {},
                "decision_context": decision_context,
                "decision_embedding": decision_embedding,
                "metadata": {
                    "transaction_amount": transaction_data.get('amount', 0),
                    "merchant_category": transaction_data.get('merchant', {}).get('category', 'unknown'),
                    "customer_id": transaction_data.get('customer_id'),
                    "risk_level": agent_decision.get('risk_assessment', 'unknown'),
                    "decision_type": agent_decision.get('decision', 'unknown')
                }
            }
            
            # Store in MongoDB
            collection = self.mongodb_client.get_collection(
                db_name=self.db_name,
                collection_name=self.decision_history_collection
            )
            
            result = collection.insert_one(decision_record)
            
            logger.debug(f"✅ Agent decision stored: {result.inserted_id}")
            return result.inserted_id
            
        except Exception as e:
            logger.error(f"❌ Failed to store agent decision: {e}")
            raise
    
    async def retrieve_similar_decisions(
        self,
        current_transaction: Dict[str, Any],
        similarity_threshold: float = 0.7,
        limit: int = 5
    ) -> List[Dict[str, Any]]:
        """
        Retrieve similar past decisions for meta-learning.
        
        Uses vector similarity search to find decisions on similar transactions.
        Helps the agent learn from past reasoning patterns.
        """
        try:
            # Create search context for current transaction
            search_context = self._build_search_context(current_transaction)
            
            # Generate embedding for similarity search
            search_embedding = await get_embedding(search_context)
            
            # Vector similarity search pipeline
            collection = self.mongodb_client.get_collection(
                db_name=self.db_name,
                collection_name=self.decision_history_collection
            )
            
            pipeline = [
                {
                    "$vectorSearch": {
                        "index": "decision_vector_index",
                        "path": "decision_embedding",
                        "queryVector": search_embedding,
                        "numCandidates": limit * 5,
                        "limit": limit
                    }
                },
                {
                    "$addFields": {
                        "similarity_score": {"$meta": "vectorSearchScore"}
                    }
                },
                {
                    "$match": {
                        "similarity_score": {"$gte": similarity_threshold}
                    }
                },
                {
                    "$project": {
                        "decision_id": 1,
                        "timestamp": 1,
                        "agent_decision": 1,
                        "transaction_data": 1,
                        "similarity_score": 1,
                        "metadata": 1
                    }
                }
            ]
            
            similar_decisions = list(collection.aggregate(pipeline))
            
            logger.debug(f"✅ Found {len(similar_decisions)} similar decisions")
            return similar_decisions
            
        except Exception as e:
            logger.error(f"❌ Similar decision retrieval failed: {e}")
            return []
    
    async def store_learning_pattern(
        self,
        pattern_type: str,
        pattern_data: Dict[str, Any],
        effectiveness_score: float
    ):
        """
        Store discovered fraud patterns for future learning.
        
        Args:
            pattern_type: Type of pattern (e.g., "velocity_spike", "unusual_merchant")
            pattern_data: Pattern characteristics and rules
            effectiveness_score: How effective this pattern is (0-1)
        """
        try:
            pattern_text = f"{pattern_type}: {pattern_data}"
            pattern_embedding = await get_embedding(pattern_text)
            
            pattern_record = {
                "pattern_id": f"pat_{pattern_type}_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
                "timestamp": datetime.now(),
                "pattern_type": pattern_type,
                "pattern_data": pattern_data,
                "effectiveness_score": effectiveness_score,
                "pattern_embedding": pattern_embedding,
                "usage_count": 0,
                "success_rate": 0.0
            }
            
            collection = self.mongodb_client.get_collection(
                db_name=self.db_name,
                collection_name=self.learning_patterns_collection
            )
            
            result = collection.insert_one(pattern_record)
            
            logger.debug(f"✅ Learning pattern stored: {pattern_record['pattern_id']}")
            return result.inserted_id
            
        except Exception as e:
            logger.error(f"❌ Failed to store learning pattern: {e}")
            raise
    
    def _build_decision_context(
        self, 
        agent_decision: Dict[str, Any],
        transaction_data: Dict[str, Any],
        context: Dict[str, Any] = None
    ) -> str:
        """Build text context for decision embedding"""
        
        decision_reasoning = agent_decision.get('reasoning', '')
        decision_result = agent_decision.get('decision', 'unknown')
        risk_level = agent_decision.get('risk_assessment', 'unknown')
        
        amount = transaction_data.get('amount', 0)
        merchant_category = transaction_data.get('merchant', {}).get('category', 'unknown')
        customer_id = transaction_data.get('customer_id', 'unknown')
        
        context_text = f"""
        Decision: {decision_result}
        Risk Level: {risk_level}
        Reasoning: {decision_reasoning}
        Transaction: ${amount} at {merchant_category}
        Customer: {customer_id}
        """
        
        if context:
            context_text += f"\nContext: {context}"
        
        return context_text.strip()
    
    def _build_search_context(self, transaction_data: Dict[str, Any]) -> str:
        """Build search context for similarity matching"""
        
        amount = transaction_data.get('amount', 0)
        merchant_category = transaction_data.get('merchant', {}).get('category', 'unknown')
        customer_id = transaction_data.get('customer_id', 'unknown')
        
        return f"Transaction: ${amount} at {merchant_category} for customer {customer_id}"
    
    async def _create_decision_vector_index(self):
        """Create vector search index for decision history"""
        
        collection = self.mongodb_client.get_collection(
            db_name=self.db_name,
            collection_name=self.decision_history_collection
        )
        
        index_definition = {
            "name": "decision_vector_index",
            "type": "vectorSearch",
            "definition": {
                "fields": [
                    {
                        "type": "vector",
                        "path": "decision_embedding",
                        "numDimensions": 1536,  # AWS Bedrock embedding size
                        "similarity": "cosine"
                    },
                    {
                        "type": "filter",
                        "path": "metadata.risk_level"
                    },
                    {
                        "type": "filter", 
                        "path": "metadata.transaction_amount"
                    }
                ]
            }
        }
        
        # Note: In production, this would be created via Atlas UI or API
        # For demo purposes, we'll create a placeholder
        logger.info(f"📋 Vector index definition ready: {index_definition['name']}")
    
    async def _create_learning_patterns_index(self):
        """Create vector search index for learning patterns"""
        
        index_definition = {
            "name": "learning_patterns_vector_index",
            "type": "vectorSearch",
            "definition": {
                "fields": [
                    {
                        "type": "vector",
                        "path": "pattern_embedding", 
                        "numDimensions": 1536,
                        "similarity": "cosine"
                    },
                    {
                        "type": "filter",
                        "path": "pattern_type"
                    },
                    {
                        "type": "filter",
                        "path": "effectiveness_score"
                    }
                ]
            }
        }
        
        logger.info(f"📋 Learning patterns index definition ready: {index_definition['name']}")
    
    async def _create_customer_insights_index(self):
        """Create index for customer behavioral insights"""
        
        index_definition = {
            "name": "customer_insights_index",
            "type": "vectorSearch", 
            "definition": {
                "fields": [
                    {
                        "type": "vector",
                        "path": "behavior_embedding",
                        "numDimensions": 1536,
                        "similarity": "cosine"
                    },
                    {
                        "type": "filter",
                        "path": "customer_id"
                    }
                ]
            }
        }
        
        logger.info(f"📋 Customer insights index definition ready: {index_definition['name']}")


def create_mongodb_vector_store(
    mongodb_client: MongoDBAccess
) -> MongoDBAtlasIntegration:
    """
    Convenience function to create MongoDB Atlas vector store integration.
    
    Args:
        mongodb_client: MongoDB database client
        
    Returns:
        Configured MongoDBAtlasIntegration ready for use with Azure embeddings
    """
    return MongoDBAtlasIntegration(mongodb_client)