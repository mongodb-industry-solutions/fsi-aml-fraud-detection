"""
Simplified MongoDB Memory Store for AI Agent Learning
Only 3 collections for clarity and power:
1. agent_memory - Complete conversation context
2. agent_decisions - Decision tracking and outcomes
3. agent_patterns - Discovered patterns and insights
"""

import logging
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime, timedelta
import hashlib
import json
import os
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
import numpy as np

logger = logging.getLogger(__name__)


class SimpleMemoryStore:
    """
    Simplified memory store with just 3 essential collections:
    1. agent_memory - Full conversation and context
    2. agent_decisions - Decisions with outcomes for learning
    3. agent_patterns - Discovered patterns and meta-learning
    
    Why MongoDB?
    - Document model naturally represents conversations
    - Flexible schema adapts as agent learns
    - Rich queries enable pattern discovery
    - Vector search for similarity matching
    - Aggregation pipeline for complex analysis
    """
    
    def __init__(self, db_client):
        """Initialize simplified memory store with Motor async MongoDB"""
        self.db_client = db_client
        
        # Create async Motor client
        mongodb_uri = os.getenv("MONGODB_URI")
        self.motor_client = AsyncIOMotorClient(mongodb_uri)
        
        # Get database
        db_name = os.getenv("DB_NAME", "threatsight360")
        self.db: AsyncIOMotorDatabase = self.motor_client[db_name]
        
        # Only 3 collections - simple and powerful
        self.memory_collection = self.db["agent_memory"]
        self.decisions_collection = self.db["agent_decisions"]
        self.patterns_collection = self.db["agent_patterns"]
        
        logger.info("✅ Simple Memory Store initialized with 3 MongoDB collections")
    
    async def initialize(self):
        """Create indexes for optimal performance"""
        try:
            # Memory collection indexes - check if they exist first
            await self._create_index_if_not_exists(self.memory_collection, [("thread_id", 1)], "thread_id_1")
            await self._create_index_if_not_exists(self.memory_collection, [("transaction_id", 1)], "transaction_id_1")
            await self._create_index_if_not_exists(self.memory_collection, [("context.customer.id", 1)], "context.customer.id_1")
            await self._create_index_if_not_exists(self.memory_collection, [("created_at", -1)], "created_at_-1")
            await self._create_index_if_not_exists(self.memory_collection, [("tags", 1)], "tags_1")
            
            # Decisions collection indexes
            await self._create_index_if_not_exists(self.decisions_collection, [("transaction_id", 1)], "transaction_id_1")
            await self._create_index_if_not_exists(self.decisions_collection, [("decision.action", 1)], "decision.action_1")
            await self._create_index_if_not_exists(self.decisions_collection, [("decision.risk_score", 1)], "decision.risk_score_1")
            await self._create_index_if_not_exists(self.decisions_collection, [("outcome.actual", 1)], "outcome.actual_1")
            await self._create_index_if_not_exists(self.decisions_collection, [("created_at", -1)], "created_at_-1")
            
            # Patterns collection indexes
            await self._create_index_if_not_exists(self.patterns_collection, [("pattern_id", 1)], "pattern_id_1", unique=True)
            await self._create_index_if_not_exists(self.patterns_collection, [("pattern.type", 1)], "pattern.type_1")
            await self._create_index_if_not_exists(self.patterns_collection, [("effectiveness.current_score", -1)], "effectiveness.current_score_-1")
            await self._create_index_if_not_exists(self.patterns_collection, [("effectiveness.usage_count", -1)], "effectiveness.usage_count_-1")
            
            logger.info("✅ MongoDB indexes created for optimal retrieval")
            
        except Exception as e:
            logger.warning(f"Index creation warning: {e}")
            
    async def _create_index_if_not_exists(self, collection, keys, name, unique=False):
        """Create index only if it doesn't exist"""
        try:
            existing_indexes = await collection.list_indexes().to_list(length=None)
            index_names = [idx["name"] for idx in existing_indexes]
            
            if name not in index_names:
                await collection.create_index(keys, name=name, unique=unique)
                logger.debug(f"Created index {name}")
            else:
                logger.debug(f"Index {name} already exists")
        except Exception as e:
            logger.debug(f"Index creation for {name}: {e}")
    
    # ==================== MEMORY OPERATIONS ====================
    
    async def store_memory(
        self,
        thread_id: str,
        transaction_id: str,
        transaction_data: Dict[str, Any],
        messages: List[Dict[str, Any]] = None,
        stage1_result: Dict[str, Any] = None,
        stage2_result: Dict[str, Any] = None
    ) -> str:
        """
        Store complete conversation memory with context
        
        This is the core of agent memory - everything about the interaction
        """
        try:
            memory_id = f"mem_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{transaction_id[:8]}"
            
            # Extract context from transaction
            context = {
                "amount": transaction_data.get("amount"),
                "currency": transaction_data.get("currency", "USD"),
                "merchant": {
                    "name": transaction_data.get("merchant", {}).get("name"),
                    "category": transaction_data.get("merchant", {}).get("category"),
                    "risk_level": self._get_merchant_risk_level(
                        transaction_data.get("merchant", {}).get("category")
                    )
                },
                "customer": {
                    "id": transaction_data.get("customer_id"),
                    "age_days": transaction_data.get("customer_age_days", 0),
                    "previous_transactions": transaction_data.get("previous_transactions", 0)
                },
                "location": {
                    "country": transaction_data.get("location", {}).get("country"),
                    "unusual": transaction_data.get("location", {}).get("unusual", False)
                }
            }
            
            # Build stages information
            stages = {}
            if stage1_result:
                stages["stage1"] = {
                    "completed": True,
                    "score": stage1_result.get("combined_score", 0),
                    "flags": stage1_result.get("rule_flags", [])
                }
            
            if stage2_result:
                stages["stage2"] = {
                    "completed": True,
                    "ai_tools": stage2_result.get("tools_used", []),
                    "similar_frauds_found": stage2_result.get("similar_transactions_count", 0)
                }
            
            # Generate tags for easy retrieval
            tags = self._generate_tags(context, stages)
            
            # Create memory document
            memory_doc = {
                "memory_id": memory_id,
                "thread_id": thread_id,
                "transaction_id": transaction_id,
                
                "conversation": {
                    "started_at": datetime.utcnow(),
                    "messages": messages or [],
                    "total_messages": len(messages) if messages else 0,
                    "processing_time_ms": (
                        stage1_result.get("processing_time_ms", 0) + 
                        stage2_result.get("processing_time_ms", 0)
                    ) if stage1_result and stage2_result else 0
                },
                
                "context": context,
                "stages": stages,
                "tags": tags,
                
                "created_at": datetime.utcnow(),
                "expires_at": datetime.utcnow() + timedelta(days=90)  # 3-month retention
            }
            
            # Store in MongoDB
            await self.memory_collection.replace_one(
                {"transaction_id": transaction_id},
                memory_doc,
                upsert=True
            )
            
            logger.debug(f"Stored memory {memory_id} for transaction {transaction_id}")
            return memory_id
            
        except Exception as e:
            logger.error(f"Failed to store memory: {e}")
            return None
    
    async def get_memory(self, transaction_id: str = None, thread_id: str = None) -> Dict[str, Any]:
        """Retrieve memory by transaction or thread ID"""
        try:
            query = {}
            if transaction_id:
                query["transaction_id"] = transaction_id
            elif thread_id:
                query["thread_id"] = thread_id
            else:
                return None
            
            memory = await self.memory_collection.find_one(query)
            return memory
            
        except Exception as e:
            logger.error(f"Failed to retrieve memory: {e}")
            return None
    
    async def add_message_to_memory(
        self,
        transaction_id: str,
        role: str,
        content: str,
        tools_used: List[str] = None
    ):
        """Add a message to existing memory"""
        try:
            message = {
                "role": role,
                "content": content,
                "timestamp": datetime.utcnow(),
                "tools_used": tools_used or []
            }
            
            await self.memory_collection.update_one(
                {"transaction_id": transaction_id},
                {
                    "$push": {"conversation.messages": message},
                    "$inc": {"conversation.total_messages": 1}
                }
            )
            
            logger.debug(f"Added {role} message to memory for {transaction_id}")
            
        except Exception as e:
            logger.error(f"Failed to add message: {e}")
    
    # ==================== DECISION OPERATIONS ====================
    
    async def store_decision(
        self,
        transaction_id: str,
        memory_id: str,
        decision: Dict[str, Any],
        features: Dict[str, Any],
        thread_id: str = None,
        embedding: List[float] = None
    ) -> str:
        """
        Store a decision for learning and tracking
        
        Decisions are how the agent learns from outcomes
        """
        try:
            decision_id = f"dec_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{transaction_id[:8]}"
            
            # Normalize features for similarity matching
            normalized_features = self._normalize_features(features)
            
            decision_doc = {
                "decision_id": decision_id,
                "memory_id": memory_id,
                "transaction_id": transaction_id,
                "thread_id": thread_id,
                
                "decision": {
                    "action": decision.get("decision"),  # APPROVE, BLOCK, REVIEW
                    "confidence": decision.get("confidence", 0),
                    "risk_score": decision.get("risk_score", 0),
                    "reasoning": decision.get("reasoning", "").split(". ")[:3]  # Top 3 reasons
                },
                
                "features": normalized_features,
                "embedding": embedding or self._generate_mock_embedding(normalized_features),
                
                # Outcome will be updated later when known
                "outcome": {
                    "actual": None,
                    "feedback_received": None,
                    "effectiveness_score": None,
                    "notes": None
                },
                
                # Learning metrics
                "learning": {
                    "similar_decisions_before": 0,  # Will be calculated
                    "pattern_confidence": 0,
                    "contributed_to_patterns": []
                },
                
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
            
            # Count similar decisions seen before
            similar_count = await self.decisions_collection.count_documents({
                "features.merchant_risk": {"$gte": normalized_features["merchant_risk"] - 0.1,
                                          "$lte": normalized_features["merchant_risk"] + 0.1},
                "created_at": {"$lt": datetime.utcnow()}
            })
            decision_doc["learning"]["similar_decisions_before"] = similar_count
            
            # Store in MongoDB
            result = await self.decisions_collection.replace_one(
                {"transaction_id": transaction_id},
                decision_doc,
                upsert=True
            )
            
            logger.info(f"🔍 MEMORY DEBUG: Stored decision {decision_id} for transaction {transaction_id}")
            logger.info(f"🔍 MEMORY DEBUG: Thread ID: {thread_id}")
            logger.info(f"🔍 MEMORY DEBUG: MongoDB result - upserted_id: {result.upserted_id}, modified_count: {result.modified_count}")
            logger.info(f"🔍 MEMORY DEBUG: Decision action: {decision.get('decision')}, risk_score: {decision.get('risk_score')}")
            
            # Verify the decision was stored
            stored_decision = await self.decisions_collection.find_one({"transaction_id": transaction_id})
            if stored_decision:
                logger.info(f"✅ MEMORY DEBUG: Decision verified in database with ID: {stored_decision['_id']}")
            else:
                logger.error(f"❌ MEMORY DEBUG: Decision NOT found in database after storage!")
            
            return decision_id
            
        except Exception as e:
            logger.error(f"Failed to store decision: {e}")
            return None
    
    async def update_decision_outcome(
        self,
        transaction_id: str,
        actual_outcome: str,  # fraud_confirmed, false_positive, legitimate
        notes: str = None
    ):
        """Update decision with actual outcome for learning"""
        try:
            # Calculate effectiveness based on outcome
            decision = await self.decisions_collection.find_one({"transaction_id": transaction_id})
            if not decision:
                logger.warning(f"Decision not found for {transaction_id}")
                return
            
            effectiveness = self._calculate_effectiveness(
                decision["decision"]["action"],
                actual_outcome
            )
            
            # Update decision
            await self.decisions_collection.update_one(
                {"transaction_id": transaction_id},
                {
                    "$set": {
                        "outcome.actual": actual_outcome,
                        "outcome.feedback_received": datetime.utcnow(),
                        "outcome.effectiveness_score": effectiveness,
                        "outcome.notes": notes,
                        "updated_at": datetime.utcnow()
                    }
                }
            )
            
            # If highly effective or ineffective, contribute to pattern discovery
            if effectiveness >= 0.8 or effectiveness <= 0.3:
                await self._contribute_to_pattern(decision, effectiveness)
            
            logger.info(f"Updated decision outcome for {transaction_id}: {actual_outcome} (effectiveness: {effectiveness})")
            
        except Exception as e:
            logger.error(f"Failed to update decision outcome: {e}")
    
    async def get_similar_decisions(
        self,
        features: Dict[str, Any],
        limit: int = 5
    ) -> List[Dict[str, Any]]:
        """Get similar past decisions for meta-learning"""
        try:
            normalized_features = self._normalize_features(features)
            
            # Simple similarity based on feature ranges
            # In production, would use vector similarity search
            pipeline = [
                {
                    "$match": {
                        "outcome.actual": {"$exists": True},  # Only decisions with known outcomes
                        "features.amount_normalized": {
                            "$gte": normalized_features["amount_normalized"] - 0.2,
                            "$lte": normalized_features["amount_normalized"] + 0.2
                        }
                    }
                },
                {
                    "$addFields": {
                        "similarity_score": {
                            "$subtract": [
                                1,
                                {
                                    "$abs": {
                                        "$subtract": [
                                            "$features.merchant_risk",
                                            normalized_features["merchant_risk"]
                                        ]
                                    }
                                }
                            ]
                        }
                    }
                },
                {"$sort": {"similarity_score": -1}},
                {"$limit": limit}
            ]
            
            cursor = self.decisions_collection.aggregate(pipeline)
            similar_decisions = await cursor.to_list(length=limit)
            
            return similar_decisions
            
        except Exception as e:
            logger.error(f"Failed to get similar decisions: {e}")
            return []
    
    # ==================== PATTERN OPERATIONS ====================
    
    async def discover_pattern(
        self,
        pattern_name: str,
        pattern_type: str,  # fraud_indicator, safe_pattern, edge_case
        criteria: Dict[str, Any],
        supporting_decisions: List[str]
    ) -> str:
        """
        Discover and store a new pattern
        
        Patterns are the meta-learning insights that improve future decisions
        """
        try:
            pattern_id = f"pattern_{pattern_name.lower().replace(' ', '_')}"
            
            # Calculate statistics from supporting decisions
            stats = await self._calculate_pattern_statistics(supporting_decisions)
            
            pattern_doc = {
                "pattern_id": pattern_id,
                
                "pattern": {
                    "name": pattern_name,
                    "type": pattern_type,
                    "description": self._generate_pattern_description(pattern_name, criteria, stats),
                    "criteria": criteria,
                    "statistics": stats
                },
                
                "pattern_embedding": self._generate_mock_embedding(criteria),
                
                "effectiveness": {
                    "current_score": stats["accuracy"],
                    "trend": "stable",
                    "last_30_days_accuracy": stats["accuracy"],
                    "usage_count": 0,
                    "last_used": None
                },
                
                "supporting_decisions": supporting_decisions[:10],  # Top 10
                
                "discovered_at": datetime.utcnow(),
                "updated_at": datetime.utcnow(),
                "expires_at": datetime.utcnow() + timedelta(days=180),  # 6-month expiry
                
                "recommendations": self._generate_recommendations(pattern_type, stats)
            }
            
            # Store in MongoDB
            await self.patterns_collection.replace_one(
                {"pattern_id": pattern_id},
                pattern_doc,
                upsert=True
            )
            
            logger.info(f"Discovered pattern: {pattern_name}")
            return pattern_id
            
        except Exception as e:
            logger.error(f"Failed to discover pattern: {e}")
            return None
    
    async def get_applicable_patterns(
        self,
        transaction_features: Dict[str, Any],
        min_effectiveness: float = 0.75
    ) -> List[Dict[str, Any]]:
        """Get patterns applicable to current transaction"""
        try:
            # Find patterns that match the transaction features
            applicable_patterns = []
            
            cursor = self.patterns_collection.find({
                "effectiveness.current_score": {"$gte": min_effectiveness},
                "pattern.type": {"$in": ["fraud_indicator", "edge_case"]}
            }).sort([("effectiveness.current_score", -1)])
            
            patterns = await cursor.to_list(length=10)
            
            # Check which patterns apply
            for pattern in patterns:
                if self._pattern_matches(pattern["pattern"]["criteria"], transaction_features):
                    applicable_patterns.append(pattern)
                    
                    # Update usage count
                    await self.patterns_collection.update_one(
                        {"_id": pattern["_id"]},
                        {
                            "$inc": {"effectiveness.usage_count": 1},
                            "$set": {"effectiveness.last_used": datetime.utcnow()}
                        }
                    )
            
            return applicable_patterns
            
        except Exception as e:
            logger.error(f"Failed to get applicable patterns: {e}")
            return []
    
    # ==================== ANALYTICS OPERATIONS ====================
    
    async def get_memory_stats(self) -> Dict[str, Any]:
        """Get statistics about the memory system"""
        try:
            stats = {
                "memory_count": await self.memory_collection.count_documents({}),
                "decision_count": await self.decisions_collection.count_documents({}),
                "pattern_count": await self.patterns_collection.count_documents({}),
                
                "decisions_with_outcomes": await self.decisions_collection.count_documents({
                    "outcome.actual": {"$exists": True}
                }),
                
                "effective_patterns": await self.patterns_collection.count_documents({
                    "effectiveness.current_score": {"$gte": 0.8}
                }),
                
                "last_updated": datetime.utcnow().isoformat()
            }
            
            # Get decision distribution
            pipeline = [
                {"$group": {
                    "_id": "$decision.action",
                    "count": {"$sum": 1}
                }}
            ]
            cursor = self.decisions_collection.aggregate(pipeline)
            distribution = await cursor.to_list(length=10)
            stats["decision_distribution"] = {d["_id"]: d["count"] for d in distribution}
            
            return stats
            
        except Exception as e:
            logger.error(f"Failed to get memory stats: {e}")
            return {}
    
    async def get_learning_insights(self) -> Dict[str, Any]:
        """Get insights about agent learning progress"""
        try:
            # Calculate learning metrics
            insights = {
                "accuracy_trend": [],
                "pattern_discovery_rate": 0,
                "decision_improvement": 0,
                "top_patterns": []
            }
            
            # Get accuracy trend (last 7 days)
            for days_ago in range(7, -1, -1):
                date = datetime.utcnow() - timedelta(days=days_ago)
                next_date = date + timedelta(days=1)
                
                pipeline = [
                    {
                        "$match": {
                            "outcome.feedback_received": {
                                "$gte": date,
                                "$lt": next_date
                            }
                        }
                    },
                    {
                        "$group": {
                            "_id": None,
                            "avg_effectiveness": {"$avg": "$outcome.effectiveness_score"}
                        }
                    }
                ]
                
                cursor = self.decisions_collection.aggregate(pipeline)
                result = await cursor.to_list(length=1)
                
                if result:
                    insights["accuracy_trend"].append({
                        "date": date.strftime("%Y-%m-%d"),
                        "accuracy": result[0]["avg_effectiveness"]
                    })
            
            # Get top patterns
            cursor = self.patterns_collection.find({}).sort([
                ("effectiveness.usage_count", -1)
            ]).limit(3)
            
            patterns = await cursor.to_list(length=3)
            insights["top_patterns"] = [
                {
                    "name": p["pattern"]["name"],
                    "type": p["pattern"]["type"],
                    "effectiveness": p["effectiveness"]["current_score"],
                    "usage": p["effectiveness"]["usage_count"]
                }
                for p in patterns
            ]
            
            return insights
            
        except Exception as e:
            logger.error(f"Failed to get learning insights: {e}")
            return {}
    
    # ==================== HELPER METHODS ====================
    
    def _get_merchant_risk_level(self, category: str) -> str:
        """Determine merchant risk level"""
        high_risk = ["gambling", "cryptocurrency", "adult", "gaming"]
        medium_risk = ["travel", "electronics", "jewelry"]
        
        if category in high_risk:
            return "high"
        elif category in medium_risk:
            return "medium"
        return "low"
    
    def _generate_tags(self, context: Dict[str, Any], stages: Dict[str, Any]) -> List[str]:
        """Generate searchable tags"""
        tags = []
        
        # Add merchant category
        if context["merchant"]["category"]:
            tags.append(context["merchant"]["category"])
        
        # Add risk level
        if context["merchant"]["risk_level"]:
            tags.append(f"{context['merchant']['risk_level']}_risk")
        
        # Add customer status
        if context["customer"]["age_days"] < 7:
            tags.append("new_customer")
        
        # Add amount range
        amount = context["amount"]
        if amount > 10000:
            tags.append("high_value")
        elif amount > 1000:
            tags.append("medium_value")
        else:
            tags.append("low_value")
        
        # Add stage flags
        if stages.get("stage1", {}).get("flags"):
            tags.extend(stages["stage1"]["flags"][:3])  # Top 3 flags
        
        return list(set(tags))  # Remove duplicates
    
    def _normalize_features(self, features: Dict[str, Any]) -> Dict[str, Any]:
        """Normalize features to 0-1 range"""
        return {
            "amount_normalized": min(features.get("amount", 0) / 10000, 1.0),
            "merchant_risk": {"high": 0.9, "medium": 0.5, "low": 0.1}.get(
                features.get("merchant_risk", "low"), 0.5
            ),
            "customer_age_days": min(features.get("customer_age_days", 0) / 365, 1.0),
            "location_risk": 0.7 if features.get("unusual_location") else 0.3,
            "pattern_match_score": features.get("pattern_match_score", 0.5)
        }
    
    def _generate_mock_embedding(self, data: Dict[str, Any]) -> List[float]:
        """Generate mock embedding vector (in production, use real embeddings)"""
        # Simple hash-based mock embedding
        data_str = json.dumps(data, sort_keys=True)
        hash_val = hashlib.md5(data_str.encode()).hexdigest()
        
        # Convert to vector-like format (384 dimensions to match typical embedding size)
        embedding = []
        for i in range(48):  # 48 * 8 = 384
            chunk = hash_val[i % len(hash_val)]
            val = ord(chunk) / 255.0  # Normalize to 0-1
            embedding.extend([val] * 8)
        
        return embedding
    
    def _calculate_effectiveness(self, action: str, outcome: str) -> float:
        """Calculate decision effectiveness score"""
        if outcome == "fraud_confirmed":
            return 1.0 if action in ["BLOCK", "REVIEW"] else 0.0
        elif outcome == "false_positive":
            return 0.3 if action == "BLOCK" else 0.7
        elif outcome == "legitimate":
            return 1.0 if action == "APPROVE" else 0.2
        return 0.5  # Unknown
    
    async def _contribute_to_pattern(self, decision: Dict[str, Any], effectiveness: float):
        """Contribute decision to pattern discovery"""
        # This would trigger pattern discovery algorithms
        # For now, just log it
        logger.debug(f"Decision {decision['decision_id']} contributes to pattern discovery (effectiveness: {effectiveness})")
    
    async def _calculate_pattern_statistics(self, decision_ids: List[str]) -> Dict[str, Any]:
        """Calculate statistics for a pattern"""
        # Get decisions
        cursor = self.decisions_collection.find({
            "decision_id": {"$in": decision_ids}
        })
        decisions = await cursor.to_list(length=100)
        
        if not decisions:
            return {
                "total_cases": 0,
                "fraud_cases": 0,
                "false_positives": 0,
                "accuracy": 0
            }
        
        # Calculate stats
        total = len(decisions)
        fraud = sum(1 for d in decisions if d.get("outcome", {}).get("actual") == "fraud_confirmed")
        false_positive = sum(1 for d in decisions if d.get("outcome", {}).get("actual") == "false_positive")
        
        accuracy = sum(d.get("outcome", {}).get("effectiveness_score", 0) for d in decisions) / total if total > 0 else 0
        
        return {
            "total_cases": total,
            "fraud_cases": fraud,
            "false_positives": false_positive,
            "accuracy": accuracy,
            "confidence_interval": [max(0, accuracy - 0.1), min(1, accuracy + 0.1)]
        }
    
    def _generate_pattern_description(self, name: str, criteria: Dict[str, Any], stats: Dict[str, Any]) -> str:
        """Generate human-readable pattern description"""
        accuracy_pct = stats["accuracy"] * 100
        return f"{name} with {accuracy_pct:.0f}% accuracy based on {stats['total_cases']} cases"
    
    def _generate_recommendations(self, pattern_type: str, stats: Dict[str, Any]) -> Dict[str, Any]:
        """Generate actionable recommendations"""
        if pattern_type == "fraud_indicator" and stats["accuracy"] >= 0.85:
            return {
                "action": "AUTO_BLOCK",
                "min_confidence_required": 0.80,
                "human_review_if_amount_above": 5000
            }
        elif pattern_type == "safe_pattern" and stats["accuracy"] >= 0.90:
            return {
                "action": "AUTO_APPROVE",
                "min_confidence_required": 0.85,
                "human_review_if_amount_above": 10000
            }
        else:
            return {
                "action": "REVIEW",
                "min_confidence_required": 0.70,
                "human_review_if_amount_above": 1000
            }
    
    def _pattern_matches(self, criteria: Dict[str, Any], features: Dict[str, Any]) -> bool:
        """Check if pattern criteria matches transaction features"""
        # Simple matching logic - would be more sophisticated in production
        for key, value in criteria.items():
            if key not in features:
                return False
            
            if isinstance(value, dict):
                # Handle range queries
                if "$gte" in value and features[key] < value["$gte"]:
                    return False
                if "$lte" in value and features[key] > value["$lte"]:
                    return False
            elif features[key] != value:
                return False
        
        return True
    
    async def close(self):
        """Close MongoDB connection"""
        try:
            self.motor_client.close()
            logger.info("✅ Simple Memory Store connection closed")
        except Exception as e:
            logger.warning(f"Error closing connection: {e}")