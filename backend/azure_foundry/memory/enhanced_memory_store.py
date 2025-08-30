"""
Enhanced MongoDB Memory Store for Meta-Learning (Motor Async Version)
Comprehensive storage and retrieval of agent memory including:
- Thread management and persistence
- Conversation history with prompts/responses
- Event logs and decision tracking
- Meta-learning pattern recognition
"""

import logging
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime, timedelta
import hashlib
import json
import os
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

logger = logging.getLogger(__name__)


class EnhancedMemoryStore:
    """
    Enhanced memory store that properly utilizes MongoDB Motor for async operations:
    1. Thread persistence and management
    2. Conversation history storage
    3. Event logging and tracking
    4. Meta-learning pattern retrieval
    """
    
    def __init__(self, db_client):
        """
        Initialize enhanced memory store with Motor async MongoDB collections
        
        Args:
            db_client: MongoDB client with database access (will create Motor client)
        """
        self.db_client = db_client
        # Create async Motor client from existing connection URI
        mongodb_uri = os.getenv("MONGODB_URI")
        self.motor_client = AsyncIOMotorClient(mongodb_uri)
        
        # Get async database
        db_name = os.getenv("DB_NAME", "threatsight360")
        self.db: AsyncIOMotorDatabase = self.motor_client[db_name]
        
        # Collections for different memory aspects
        self.threads_collection = self.db["agent_threads"]
        self.conversations_collection = self.db["agent_conversations"]
        self.event_logs_collection = self.db["agent_event_logs"]
        self.decisions_collection = self.db["agent_decisions"]
        self.learning_patterns_collection = self.db["agent_learning_patterns"]
        
        logger.info("✅ Enhanced Memory Store initialized with Motor async MongoDB collections")
    
    async def initialize(self):
        """Initialize async components like indexes"""
        try:
            await self._ensure_indexes()
            logger.info("✅ Enhanced Memory Store async initialization complete")
        except Exception as e:
            logger.warning(f"Async initialization warning: {e}")
    
    async def _ensure_indexes(self):
        """Create necessary indexes for efficient querying"""
        try:
            # Thread indexes
            await self.threads_collection.create_index([("transaction_id", 1)], unique=True)
            await self.threads_collection.create_index([("created_at", -1)])
            await self.threads_collection.create_index([("last_accessed", -1)])
            
            # Conversation indexes
            await self.conversations_collection.create_index([("thread_id", 1)])
            await self.conversations_collection.create_index([("transaction_id", 1)])
            await self.conversations_collection.create_index([("timestamp", -1)])
            
            # Event log indexes
            await self.event_logs_collection.create_index([("transaction_id", 1)])
            await self.event_logs_collection.create_index([("event_type", 1)])
            await self.event_logs_collection.create_index([("timestamp", -1)])
            
            # Decision indexes
            await self.decisions_collection.create_index([("transaction_id", 1)])
            await self.decisions_collection.create_index([("decision", 1)])
            await self.decisions_collection.create_index([("risk_score", 1)])
            await self.decisions_collection.create_index([("created_at", -1)])
            
            # Learning pattern indexes (including text and vector search)
            await self.learning_patterns_collection.create_index([("pattern_type", 1)])
            await self.learning_patterns_collection.create_index([("effectiveness_score", -1)])
            await self.learning_patterns_collection.create_index([("created_at", -1)])
            
            logger.debug("MongoDB indexes ensured for all memory collections")
            
        except Exception as e:
            logger.warning(f"Index creation warning: {e}")
    
    async def get_or_create_thread(
        self, 
        transaction_id: str,
        customer_id: str = None,
        metadata: Dict[str, Any] = None
    ) -> str:
        """
        Get existing thread or create new one, persisted in MongoDB
        
        Args:
            transaction_id: Unique transaction identifier
            customer_id: Optional customer identifier
            metadata: Optional additional metadata
            
        Returns:
            Thread ID (Azure thread ID) or None if not found
        """
        try:
            # Check if thread exists in MongoDB
            existing_thread = await self.threads_collection.find_one(
                {"transaction_id": transaction_id}
            )
            
            if existing_thread:
                # Update last accessed time
                await self.threads_collection.update_one(
                    {"_id": existing_thread["_id"]},
                    {"$set": {"last_accessed": datetime.utcnow()}}
                )
                logger.debug(f"Retrieved existing thread {existing_thread['thread_id']} for transaction {transaction_id}")
                return existing_thread["thread_id"]
            
            # Thread doesn't exist, will be created by agent_core
            # We'll store it after creation
            return None
            
        except Exception as e:
            logger.error(f"Error retrieving thread for {transaction_id}: {e}")
            return None
    
    async def store_thread(
        self,
        transaction_id: str,
        thread_id: str,
        customer_id: str = None,
        metadata: Dict[str, Any] = None
    ):
        """
        Store thread information in MongoDB
        
        Args:
            transaction_id: Transaction identifier
            thread_id: Azure thread ID
            customer_id: Optional customer identifier
            metadata: Optional additional metadata
        """
        try:
            thread_doc = {
                "transaction_id": transaction_id,
                "thread_id": thread_id,
                "customer_id": customer_id,
                "metadata": metadata or {},
                "created_at": datetime.utcnow(),
                "last_accessed": datetime.utcnow()
            }
            
            # Upsert to handle duplicates
            await self.threads_collection.replace_one(
                {"transaction_id": transaction_id},
                thread_doc,
                upsert=True
            )
            
            logger.debug(f"Stored thread {thread_id} for transaction {transaction_id}")
            
        except Exception as e:
            logger.error(f"Failed to store thread: {e}")
    
    async def store_conversation_message(
        self,
        thread_id: str,
        transaction_id: str,
        role: str,  # "user" or "assistant"
        content: str,
        metadata: Dict[str, Any] = None
    ):
        """
        Store conversation message in MongoDB
        
        Args:
            thread_id: Azure thread ID
            transaction_id: Transaction identifier
            role: Message role (user/assistant)
            content: Message content
            metadata: Optional metadata (tokens, processing time, etc.)
        """
        try:
            message_doc = {
                "thread_id": thread_id,
                "transaction_id": transaction_id,
                "role": role,
                "content": content,
                "metadata": metadata or {},
                "timestamp": datetime.utcnow()
            }
            
            # Generate content hash for deduplication
            content_hash = hashlib.md5(content.encode()).hexdigest()
            message_doc["content_hash"] = content_hash
            
            # Store message
            await self.conversations_collection.insert_one(message_doc)
            
            logger.debug(f"Stored {role} message for thread {thread_id}")
            
        except Exception as e:
            logger.error(f"Failed to store conversation message: {e}")
    
    async def store_event_log(
        self,
        transaction_id: str,
        event_type: str,  # "analysis_start", "stage1_complete", "stage2_complete", etc.
        event_data: Dict[str, Any],
        thread_id: str = None
    ):
        """
        Store event log for tracking agent behavior
        
        Args:
            transaction_id: Transaction identifier
            event_type: Type of event
            event_data: Event details
            thread_id: Optional thread ID
        """
        try:
            event_doc = {
                "transaction_id": transaction_id,
                "thread_id": thread_id,
                "event_type": event_type,
                "event_data": event_data,
                "timestamp": datetime.utcnow()
            }
            
            await self.event_logs_collection.insert_one(event_doc)
            
            logger.debug(f"Logged event {event_type} for transaction {transaction_id}")
            
        except Exception as e:
            logger.error(f"Failed to store event log: {e}")
    
    async def store_decision_with_context(
        self,
        transaction_id: str,
        decision: Dict[str, Any],
        transaction_data: Dict[str, Any],
        stage1_result: Dict[str, Any] = None,
        stage2_result: Dict[str, Any] = None,
        thread_id: str = None
    ):
        """
        Store decision with full context for meta-learning
        
        Args:
            transaction_id: Transaction identifier
            decision: Agent decision details
            transaction_data: Original transaction data
            stage1_result: Stage 1 analysis results
            stage2_result: Stage 2 analysis results (if applicable)
            thread_id: Associated thread ID
        """
        try:
            # Create comprehensive decision document with serializable data
            decision_doc = {
                "transaction_id": transaction_id,
                "thread_id": thread_id,
                "decision": self._extract_value(decision.get("decision")),
                "confidence": decision.get("confidence"),
                "risk_score": decision.get("risk_score"),
                "risk_level": self._extract_value(decision.get("risk_level")),
                "reasoning": decision.get("reasoning"),
                "stage_completed": decision.get("stage_completed", 1),
                "processing_time_ms": decision.get("total_processing_time_ms"),
                
                # Transaction features for similarity matching
                "transaction_features": {
                    "amount": transaction_data.get("amount"),
                    "currency": transaction_data.get("currency"),
                    "merchant_category": transaction_data.get("merchant", {}).get("category"),
                    "location_country": transaction_data.get("location", {}).get("country"),
                    "customer_id": transaction_data.get("customer_id")
                },
                
                # Analysis context (ensure serializable)
                "stage1_analysis": self._make_serializable(stage1_result) if stage1_result else None,
                "stage2_analysis": self._make_serializable(stage2_result) if stage2_result else None,
                
                # Metadata
                "created_at": datetime.utcnow()
            }
            
            # Generate embedding for similarity search (placeholder - would use Bedrock)
            # decision_doc["embedding"] = await self._generate_embedding(decision_doc)
            
            await self.decisions_collection.insert_one(decision_doc)
            
            logger.debug(f"Stored decision with context for transaction {transaction_id}")
            
        except Exception as e:
            logger.error(f"Failed to store decision with context: {e}")
    
    async def retrieve_similar_decisions(
        self,
        transaction_data: Dict[str, Any],
        limit: int = 5,
        time_window_days: int = 30
    ) -> List[Dict[str, Any]]:
        """
        Retrieve similar past decisions for meta-learning
        
        Args:
            transaction_data: Current transaction data
            limit: Maximum number of similar decisions to retrieve
            time_window_days: Look back window in days
            
        Returns:
            List of similar past decisions with their outcomes
        """
        try:
            # Define similarity criteria
            amount = transaction_data.get("amount", 0)
            merchant_category = transaction_data.get("merchant", {}).get("category")
            customer_id = transaction_data.get("customer_id")
            
            # Build query for similar transactions
            query = {
                "created_at": {"$gte": datetime.utcnow() - timedelta(days=time_window_days)}
            }
            
            # Add similarity filters
            if merchant_category:
                query["transaction_features.merchant_category"] = merchant_category
            
            if customer_id:
                query["transaction_features.customer_id"] = customer_id
            
            # Find similar decisions
            cursor = self.decisions_collection.find(query).sort([
                ("created_at", -1)
            ]).limit(limit)
            similar_decisions = await cursor.to_list(length=limit)
            
            # Calculate similarity scores
            for decision in similar_decisions:
                # Simple similarity based on amount difference
                decision_amount = decision.get("transaction_features", {}).get("amount", 0)
                amount_diff = abs(decision_amount - amount)
                similarity_score = max(0, 1 - (amount_diff / max(amount, 1)))
                decision["similarity_score"] = similarity_score
            
            # Sort by similarity score
            similar_decisions.sort(key=lambda x: x.get("similarity_score", 0), reverse=True)
            
            logger.debug(f"Retrieved {len(similar_decisions)} similar decisions")
            return similar_decisions
            
        except Exception as e:
            logger.error(f"Failed to retrieve similar decisions: {e}")
            return []
    
    async def get_customer_history(
        self,
        customer_id: str,
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        """
        Get customer's transaction history for context
        
        Args:
            customer_id: Customer identifier
            limit: Maximum number of transactions to retrieve
            
        Returns:
            List of customer's past transactions and decisions
        """
        try:
            cursor = self.decisions_collection.find(
                {"transaction_features.customer_id": customer_id}
            ).sort([
                ("created_at", -1)
            ]).limit(limit)
            customer_decisions = await cursor.to_list(length=limit)
            
            return customer_decisions
            
        except Exception as e:
            logger.error(f"Failed to retrieve customer history: {e}")
            return []
    
    async def store_learning_pattern(
        self,
        pattern_type: str,
        pattern_data: Dict[str, Any],
        effectiveness_score: float,
        transaction_ids: List[str] = None
    ):
        """
        Store identified learning pattern for future use
        
        Args:
            pattern_type: Type of pattern (fraud_pattern, false_positive, etc.)
            pattern_data: Pattern details
            effectiveness_score: How effective this pattern is (0-1)
            transaction_ids: Related transaction IDs
        """
        try:
            pattern_doc = {
                "pattern_type": pattern_type,
                "pattern_data": pattern_data,
                "effectiveness_score": effectiveness_score,
                "transaction_ids": transaction_ids or [],
                "usage_count": 0,
                "created_at": datetime.utcnow(),
                "last_used": None
            }
            
            await self.learning_patterns_collection.insert_one(pattern_doc)
            
            logger.debug(f"Stored learning pattern of type {pattern_type}")
            
        except Exception as e:
            logger.error(f"Failed to store learning pattern: {e}")
    
    async def get_relevant_patterns(
        self,
        transaction_data: Dict[str, Any],
        pattern_types: List[str] = None,
        min_effectiveness: float = 0.6
    ) -> List[Dict[str, Any]]:
        """
        Retrieve relevant learning patterns for current transaction
        
        Args:
            transaction_data: Current transaction data
            pattern_types: Filter by pattern types
            min_effectiveness: Minimum effectiveness score
            
        Returns:
            List of relevant patterns
        """
        try:
            query = {
                "effectiveness_score": {"$gte": min_effectiveness}
            }
            
            if pattern_types:
                query["pattern_type"] = {"$in": pattern_types}
            
            cursor = self.learning_patterns_collection.find(query).sort([
                ("effectiveness_score", -1),
                ("usage_count", -1)
            ]).limit(10)
            patterns = await cursor.to_list(length=10)
            
            # Update usage count for retrieved patterns
            pattern_ids = [p["_id"] for p in patterns]
            if pattern_ids:
                await self.learning_patterns_collection.update_many(
                    {"_id": {"$in": pattern_ids}},
                    {
                        "$inc": {"usage_count": 1},
                        "$set": {"last_used": datetime.utcnow()}
                    }
                )
            
            return patterns
            
        except Exception as e:
            logger.error(f"Failed to retrieve patterns: {e}")
            return []
    
    async def sync_thread_messages_from_azure(
        self,
        thread_id: str,
        transaction_id: str,
        agents_client,
        limit: int = 50
    ):
        """
        Sync thread messages from Azure AI Foundry to MongoDB
        
        Args:
            thread_id: Azure thread ID
            transaction_id: Transaction identifier
            agents_client: Azure AI Foundry agents client
            limit: Maximum messages to sync
        """
        try:
            # Retrieve messages from Azure
            messages = agents_client.messages.list(
                thread_id=thread_id,
                limit=limit
            )
            
            # Store each message in MongoDB
            for msg in messages:
                content_text = ""
                if hasattr(msg, 'content') and msg.content:
                    for content_block in msg.content:
                        if hasattr(content_block, 'text') and content_block.text:
                            if hasattr(content_block.text, 'value'):
                                content_text += content_block.text.value
                            else:
                                content_text += str(content_block.text)
                
                if content_text:
                    await self.store_conversation_message(
                        thread_id=thread_id,
                        transaction_id=transaction_id,
                        role=msg.role,
                        content=content_text,
                        metadata={
                            "message_id": msg.id,
                            "created_at": msg.created_at.isoformat() if hasattr(msg, 'created_at') and msg.created_at else None
                        }
                    )
            
            logger.info(f"Synced {len(list(messages))} messages from Azure for thread {thread_id}")
            
        except Exception as e:
            logger.error(f"Failed to sync thread messages: {e}")
    
    async def get_thread_conversations(
        self,
        thread_id: str,
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        """
        Get conversation history for a thread from MongoDB
        
        Args:
            thread_id: Thread identifier
            limit: Maximum messages to retrieve
            
        Returns:
            List of conversation messages
        """
        try:
            cursor = self.conversations_collection.find(
                {"thread_id": thread_id}
            ).sort([
                ("timestamp", 1)
            ]).limit(limit)
            messages = await cursor.to_list(length=limit)
            
            return messages
            
        except Exception as e:
            logger.error(f"Failed to retrieve thread conversations: {e}")
            return []
    
    async def analyze_decision_effectiveness(
        self,
        transaction_id: str,
        actual_outcome: str = None,
        feedback: Dict[str, Any] = None
    ):
        """
        Analyze and update decision effectiveness for meta-learning
        
        Args:
            transaction_id: Transaction identifier
            actual_outcome: Actual outcome (if known)
            feedback: Additional feedback data
        """
        try:
            # Find the decision
            decision = await self.decisions_collection.find_one(
                {"transaction_id": transaction_id}
            )
            
            if not decision:
                logger.warning(f"Decision not found for transaction {transaction_id}")
                return
            
            # Calculate effectiveness based on outcome
            effectiveness = 0.5  # Default neutral
            if actual_outcome:
                if actual_outcome == "confirmed_fraud" and decision["decision"] in ["BLOCK", "ESCALATE"]:
                    effectiveness = 1.0
                elif actual_outcome == "false_positive" and decision["decision"] == "BLOCK":
                    effectiveness = 0.2
                elif actual_outcome == "legitimate" and decision["decision"] == "APPROVE":
                    effectiveness = 0.9
            
            # Update decision with effectiveness
            await self.decisions_collection.update_one(
                {"_id": decision["_id"]},
                {
                    "$set": {
                        "actual_outcome": actual_outcome,
                        "effectiveness_score": effectiveness,
                        "feedback": feedback or {},
                        "evaluated_at": datetime.utcnow()
                    }
                }
            )
            
            # Create learning pattern if highly effective or ineffective
            if effectiveness >= 0.8 or effectiveness <= 0.3:
                pattern_type = "successful_detection" if effectiveness >= 0.8 else "improvement_needed"
                await self.store_learning_pattern(
                    pattern_type=pattern_type,
                    pattern_data={
                        "decision": decision["decision"],
                        "risk_score": decision["risk_score"],
                        "features": decision["transaction_features"],
                        "reasoning": decision["reasoning"]
                    },
                    effectiveness_score=effectiveness,
                    transaction_ids=[transaction_id]
                )
            
            logger.info(f"Updated decision effectiveness for {transaction_id}: {effectiveness}")
            
        except Exception as e:
            logger.error(f"Failed to analyze decision effectiveness: {e}")
    
    async def get_meta_learning_context(
        self,
        transaction_data: Dict[str, Any],
        customer_id: str = None
    ) -> Dict[str, Any]:
        """
        Get comprehensive meta-learning context for transaction analysis
        
        Args:
            transaction_data: Current transaction data
            customer_id: Customer identifier
            
        Returns:
            Dict containing similar decisions, patterns, and customer history
        """
        try:
            context = {
                "similar_decisions": [],
                "relevant_patterns": [],
                "customer_history": [],
                "statistics": {}
            }
            
            # Get similar past decisions
            context["similar_decisions"] = await self.retrieve_similar_decisions(
                transaction_data, limit=5
            )
            
            # Get relevant learning patterns
            context["relevant_patterns"] = await self.get_relevant_patterns(
                transaction_data, min_effectiveness=0.7
            )
            
            # Get customer history if available
            if customer_id:
                context["customer_history"] = await self.get_customer_history(
                    customer_id, limit=5
                )
            
            # Calculate statistics
            if context["similar_decisions"]:
                decisions = [d["decision"] for d in context["similar_decisions"]]
                context["statistics"]["most_common_decision"] = max(
                    set(decisions), key=decisions.count
                )
                context["statistics"]["avg_risk_score"] = sum(
                    d["risk_score"] for d in context["similar_decisions"] if d.get("risk_score")
                ) / len(context["similar_decisions"])
            
            return context
            
        except Exception as e:
            logger.error(f"Failed to get meta-learning context: {e}")
            return {
                "similar_decisions": [],
                "relevant_patterns": [],
                "customer_history": [],
                "statistics": {}
            }
    
    def _extract_value(self, obj):
        """Extract value from enum or return object as-is"""
        if hasattr(obj, 'value'):  # Enum
            return obj.value
        return obj
    
    def _make_serializable(self, obj):
        """Convert objects to JSON-serializable format"""
        if hasattr(obj, '__dict__'):
            result = {}
            for key, value in obj.__dict__.items():
                if hasattr(value, 'value'):  # Enum
                    result[key] = value.value
                elif isinstance(value, datetime):
                    result[key] = value.isoformat()
                elif isinstance(value, (list, tuple)):
                    result[key] = [self._make_serializable(item) for item in value]
                elif hasattr(value, '__dict__'):
                    result[key] = self._make_serializable(value)
                else:
                    result[key] = value
            return result
        elif hasattr(obj, 'value'):  # Enum
            return obj.value
        elif isinstance(obj, datetime):
            return obj.isoformat()
        elif isinstance(obj, (list, tuple)):
            return [self._make_serializable(item) for item in obj]
        else:
            return obj
    
    async def close(self):
        """Close the Motor client connection"""
        try:
            self.motor_client.close()
            logger.info("✅ Enhanced Memory Store Motor client closed")
        except Exception as e:
            logger.warning(f"Error closing Motor client: {e}")