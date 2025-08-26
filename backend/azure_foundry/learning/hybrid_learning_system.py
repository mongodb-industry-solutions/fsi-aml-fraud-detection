"""
Hybrid Learning System for Azure AI Foundry Agent

Combines Azure AI Foundry's native thread memory with MongoDB Atlas vector learning
following the REVISED_ENHANCEMENT_PLAN approach.

Key Principles:
- Azure handles conversation memory (thread-based, up to 100,000 messages)
- MongoDB stores learning patterns and historical decision analysis
- Vector similarity search for contextual learning and meta-analysis
- Complements rather than replaces Azure's native capabilities
"""

import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
from dataclasses import dataclass

from azure.ai.agents import AgentsClient
from azure.core.exceptions import HttpResponseError

logger = logging.getLogger(__name__)


@dataclass
class LearningInsight:
    """Structured learning insight from historical analysis"""
    insight_type: str  # "pattern", "anomaly", "improvement"
    confidence: float  # 0-1
    description: str
    supporting_evidence: List[Dict[str, Any]]
    actionable_recommendation: str


@dataclass
class HybridMemoryState:
    """Current state of hybrid memory system"""
    azure_thread_count: int
    mongodb_decisions_stored: int
    mongodb_patterns_learned: int
    last_learning_update: datetime
    learning_effectiveness_score: float  # 0-1


class HybridLearningSystem:
    """
    Hybrid learning system that leverages both Azure AI Foundry native capabilities
    and MongoDB Atlas vector search for comprehensive fraud detection learning.
    
    Architecture:
    - Azure AI Foundry: Native thread memory for conversation context
    - MongoDB Atlas: Vector search for historical decision patterns
    - Hybrid: Combines both for enhanced decision-making
    """
    
    def __init__(
        self, 
        agents_client: AgentsClient,
        mongodb_vector_store,
        agent_id: str
    ):
        self.agents_client = agents_client
        self.mongodb_vector_store = mongodb_vector_store
        self.agent_id = agent_id
        
        # Learning state tracking
        self.learning_state = HybridMemoryState(
            azure_thread_count=0,
            mongodb_decisions_stored=0,
            mongodb_patterns_learned=0,
            last_learning_update=datetime.now(),
            learning_effectiveness_score=0.5
        )
        
        logger.info("✅ Hybrid learning system initialized")
    
    async def enhance_transaction_analysis(
        self,
        transaction_data: Dict[str, Any],
        stage1_result,
        thread_id: str
    ) -> Dict[str, Any]:
        """
        Enhance transaction analysis using hybrid learning approach.
        
        Combines:
        1. Azure native thread memory for conversation context
        2. MongoDB vector search for similar historical decisions
        3. Learning pattern analysis for improved decision-making
        
        Args:
            transaction_data: Current transaction being analyzed
            stage1_result: Results from Stage 1 analysis
            thread_id: Azure AI Foundry thread for conversation memory
            
        Returns:
            Enhanced analysis context with learning insights
        """
        try:
            logger.debug(f"🧠 Enhancing analysis for transaction with hybrid learning")
            
            # Step 1: Get Azure native thread context
            azure_context = await self._get_azure_thread_context(thread_id)
            
            # Step 2: Get MongoDB historical insights
            mongodb_insights = await self._get_mongodb_learning_insights(
                transaction_data, stage1_result
            )
            
            # Step 3: Combine contexts for comprehensive analysis
            hybrid_context = self._combine_learning_contexts(
                azure_context, mongodb_insights, transaction_data
            )
            
            # Step 4: Generate learning-enhanced recommendations
            learning_recommendations = await self._generate_learning_recommendations(
                hybrid_context
            )
            
            return {
                "azure_thread_context": azure_context,
                "mongodb_learning_insights": mongodb_insights,
                "hybrid_analysis": hybrid_context,
                "learning_recommendations": learning_recommendations,
                "learning_confidence": self._calculate_learning_confidence(hybrid_context)
            }
            
        except Exception as e:
            logger.error(f"❌ Hybrid learning enhancement failed: {e}")
            return {
                "error": str(e),
                "fallback_mode": True,
                "azure_thread_context": {},
                "mongodb_learning_insights": []
            }
    
    async def update_learning_from_decision(
        self,
        transaction_data: Dict[str, Any],
        agent_decision: Dict[str, Any],
        thread_id: str
    ):
        """
        Update hybrid learning system based on agent decision.
        
        Updates both:
        1. Azure thread memory (automatically handled by Azure)
        2. MongoDB learning patterns with decision outcome
        """
        try:
            # Step 1: Azure thread memory is automatically updated by Azure AI Foundry
            logger.debug(f"📝 Azure thread memory automatically updated: {thread_id}")
            
            # Step 2: Update MongoDB learning patterns
            await self._update_mongodb_learning_patterns(
                transaction_data, agent_decision, thread_id
            )
            
            # Step 3: Analyze learning effectiveness
            await self._analyze_learning_effectiveness(agent_decision)
            
            # Step 4: Update learning state
            self.learning_state.last_learning_update = datetime.now()
            self.learning_state.mongodb_decisions_stored += 1
            
            logger.debug(f"✅ Hybrid learning updated for decision: {agent_decision.get('decision')}")
            
        except Exception as e:
            logger.error(f"❌ Learning update failed: {e}")
    
    async def get_learning_insights_for_context(
        self,
        transaction_data: Dict[str, Any],
        context_window_days: int = 30
    ) -> List[LearningInsight]:
        """Get actionable learning insights for current transaction context"""
        try:
            insights = []
            
            # Get similar historical decisions from MongoDB
            similar_decisions = await self.mongodb_vector_store.retrieve_similar_decisions(
                current_transaction=transaction_data,
                similarity_threshold=0.6,
                limit=10
            )
            
            if similar_decisions:
                # Analyze patterns in similar decisions
                pattern_insight = self._analyze_decision_patterns(similar_decisions)
                if pattern_insight:
                    insights.append(pattern_insight)
                
                # Look for anomalies or unusual patterns
                anomaly_insight = self._detect_decision_anomalies(similar_decisions)
                if anomaly_insight:
                    insights.append(anomaly_insight)
            
            # Get recent learning patterns
            recent_patterns = await self._get_recent_learning_patterns(context_window_days)
            if recent_patterns:
                improvement_insight = self._identify_improvement_opportunities(recent_patterns)
                if improvement_insight:
                    insights.append(improvement_insight)
            
            logger.debug(f"🔍 Generated {len(insights)} learning insights")
            return insights
            
        except Exception as e:
            logger.error(f"❌ Learning insights generation failed: {e}")
            return []
    
    async def get_hybrid_memory_status(self) -> Dict[str, Any]:
        """Get current status of hybrid memory system"""
        try:
            # Get Azure thread statistics
            azure_stats = await self._get_azure_memory_stats()
            
            # Get MongoDB learning statistics
            mongodb_stats = await self._get_mongodb_learning_stats()
            
            return {
                "hybrid_learning_state": {
                    "azure_thread_count": azure_stats.get("active_threads", 0),
                    "mongodb_decisions_stored": mongodb_stats.get("total_decisions", 0),
                    "mongodb_patterns_learned": mongodb_stats.get("learning_patterns", 0),
                    "last_learning_update": self.learning_state.last_learning_update.isoformat(),
                    "learning_effectiveness_score": self.learning_state.learning_effectiveness_score
                },
                "azure_memory": azure_stats,
                "mongodb_learning": mongodb_stats,
                "system_health": "healthy" if self.learning_state.learning_effectiveness_score > 0.6 else "degraded"
            }
            
        except Exception as e:
            logger.error(f"❌ Memory status retrieval failed: {e}")
            return {"error": str(e), "system_health": "error"}
    
    # Private implementation methods
    
    async def _get_azure_thread_context(self, thread_id: str) -> Dict[str, Any]:
        """Get conversation context from Azure AI Foundry thread"""
        try:
            # Get recent messages from thread for context
            messages = self.agents_client.messages.list(
                thread_id=thread_id,
                limit=5  # Get last 5 messages for context
            )
            
            context = {
                "thread_id": thread_id,
                "message_count": len(messages) if messages else 0,
                "recent_messages": [
                    {
                        "role": msg.role,
                        "content_preview": str(msg.content)[:100] if msg.content else "",
                        "timestamp": msg.created_at.isoformat() if hasattr(msg, 'created_at') else None
                    }
                    for msg in messages[:3]  # Last 3 messages
                ] if messages else [],
                "context_type": "azure_native_thread"
            }
            
            return context
            
        except Exception as e:
            logger.debug(f"Azure thread context retrieval failed: {e}")
            return {"thread_id": thread_id, "error": str(e), "context_type": "azure_native_thread"}
    
    async def _get_mongodb_learning_insights(
        self, 
        transaction_data: Dict[str, Any], 
        stage1_result
    ) -> List[Dict[str, Any]]:
        """Get learning insights from MongoDB vector search"""
        if not self.mongodb_vector_store:
            return []
        
        try:
            # Get similar past decisions
            similar_decisions = await self.mongodb_vector_store.retrieve_similar_decisions(
                current_transaction=transaction_data,
                similarity_threshold=0.7,
                limit=5
            )
            
            insights = []
            
            for decision in similar_decisions:
                insight = {
                    "decision_id": decision.get("decision_id"),
                    "similarity_score": decision.get("similarity_score"),
                    "historical_decision": decision.get("agent_decision"),
                    "context_relevance": self._calculate_context_relevance(
                        decision, transaction_data
                    ),
                    "learning_value": decision.get("similarity_score", 0) * 0.8  # Weighted learning value
                }
                insights.append(insight)
            
            return insights
            
        except Exception as e:
            logger.debug(f"MongoDB learning insights failed: {e}")
            return []
    
    def _combine_learning_contexts(
        self, 
        azure_context: Dict[str, Any],
        mongodb_insights: List[Dict[str, Any]],
        transaction_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Combine Azure and MongoDB contexts for hybrid analysis"""
        
        # Calculate hybrid confidence
        azure_confidence = 0.7 if azure_context.get("message_count", 0) > 0 else 0.3
        mongodb_confidence = min(0.9, len(mongodb_insights) * 0.15) if mongodb_insights else 0.2
        
        combined_confidence = (azure_confidence + mongodb_confidence) / 2
        
        return {
            "hybrid_confidence": combined_confidence,
            "azure_contribution": azure_confidence / combined_confidence if combined_confidence > 0 else 0,
            "mongodb_contribution": mongodb_confidence / combined_confidence if combined_confidence > 0 else 0,
            "context_richness": len(mongodb_insights) + (1 if azure_context.get("message_count", 0) > 0 else 0),
            "learning_sources": {
                "azure_thread_memory": azure_context.get("message_count", 0) > 0,
                "mongodb_historical_patterns": len(mongodb_insights) > 0
            }
        }
    
    async def _generate_learning_recommendations(
        self, 
        hybrid_context: Dict[str, Any]
    ) -> List[str]:
        """Generate actionable recommendations based on hybrid learning"""
        recommendations = []
        
        confidence = hybrid_context.get("hybrid_confidence", 0.5)
        context_richness = hybrid_context.get("context_richness", 0)
        
        if confidence > 0.8:
            recommendations.append("High confidence analysis - leverage both conversation history and pattern matching")
        elif confidence > 0.6:
            recommendations.append("Moderate confidence - consider additional context gathering")
        else:
            recommendations.append("Low confidence - escalate for human review")
        
        if context_richness >= 3:
            recommendations.append("Rich context available - utilize comprehensive analysis")
        elif context_richness >= 1:
            recommendations.append("Limited context - focus on key indicators")
        else:
            recommendations.append("Minimal context - apply conservative approach")
        
        return recommendations
    
    def _calculate_learning_confidence(self, hybrid_context: Dict[str, Any]) -> float:
        """Calculate overall learning confidence from hybrid context"""
        base_confidence = hybrid_context.get("hybrid_confidence", 0.5)
        
        # Adjust based on context richness
        richness_bonus = min(0.2, hybrid_context.get("context_richness", 0) * 0.05)
        
        return min(1.0, base_confidence + richness_bonus)
    
    async def _update_mongodb_learning_patterns(
        self,
        transaction_data: Dict[str, Any],
        agent_decision: Dict[str, Any],
        thread_id: str
    ):
        """Update MongoDB with new learning patterns"""
        if not self.mongodb_vector_store:
            return
        
        try:
            # Store the decision for future learning
            await self.mongodb_vector_store.store_agent_decision(
                agent_decision=agent_decision,
                transaction_data=transaction_data,
                context={"thread_id": thread_id}
            )
            
        except Exception as e:
            logger.debug(f"MongoDB pattern update failed: {e}")
    
    async def _analyze_learning_effectiveness(self, agent_decision: Dict[str, Any]):
        """Analyze how effective the learning system is"""
        try:
            # Simple effectiveness calculation based on decision confidence
            decision_confidence = agent_decision.get("confidence", 0.5)
            
            # Update running average of effectiveness
            current_effectiveness = self.learning_state.learning_effectiveness_score
            new_effectiveness = (current_effectiveness * 0.8) + (decision_confidence * 0.2)
            
            self.learning_state.learning_effectiveness_score = new_effectiveness
            
        except Exception as e:
            logger.debug(f"Learning effectiveness analysis failed: {e}")
    
    def _analyze_decision_patterns(self, similar_decisions: List[Dict[str, Any]]) -> Optional[LearningInsight]:
        """Analyze patterns in similar historical decisions"""
        if len(similar_decisions) < 2:
            return None
        
        # Analyze decision consistency
        decisions = [d.get("agent_decision", {}).get("decision") for d in similar_decisions]
        unique_decisions = set(filter(None, decisions))
        
        if len(unique_decisions) == 1:
            consistent_decision = list(unique_decisions)[0]
            return LearningInsight(
                insight_type="pattern",
                confidence=0.8,
                description=f"Consistent historical pattern: similar transactions typically result in '{consistent_decision}'",
                supporting_evidence=similar_decisions[:3],
                actionable_recommendation=f"Consider '{consistent_decision}' based on historical pattern"
            )
        
        return None
    
    def _detect_decision_anomalies(self, similar_decisions: List[Dict[str, Any]]) -> Optional[LearningInsight]:
        """Detect anomalies in decision patterns"""
        if len(similar_decisions) < 3:
            return None
        
        # Look for outlier risk scores
        risk_scores = [d.get("agent_decision", {}).get("risk_score", 50) for d in similar_decisions]
        avg_risk = sum(risk_scores) / len(risk_scores)
        
        outliers = [score for score in risk_scores if abs(score - avg_risk) > 20]
        
        if outliers:
            return LearningInsight(
                insight_type="anomaly",
                confidence=0.7,
                description=f"Anomalous risk scores detected in similar transactions (avg: {avg_risk:.1f})",
                supporting_evidence=[d for d in similar_decisions if abs(d.get("agent_decision", {}).get("risk_score", 50) - avg_risk) > 20],
                actionable_recommendation="Review for potential risk calculation inconsistencies"
            )
        
        return None
    
    async def _get_recent_learning_patterns(self, days: int) -> List[Dict[str, Any]]:
        """Get recent learning patterns from MongoDB"""
        # Simplified implementation - would query MongoDB for recent patterns
        return []
    
    def _identify_improvement_opportunities(self, recent_patterns: List[Dict[str, Any]]) -> Optional[LearningInsight]:
        """Identify opportunities for improvement based on recent patterns"""
        # Simplified implementation
        return None
    
    def _calculate_context_relevance(self, decision: Dict[str, Any], transaction_data: Dict[str, Any]) -> float:
        """Calculate how relevant a historical decision is to current context"""
        # Simplified relevance calculation
        similarity_score = decision.get("similarity_score", 0)
        return min(1.0, similarity_score + 0.2)  # Boost relevance slightly
    
    async def _get_azure_memory_stats(self) -> Dict[str, Any]:
        """Get Azure thread memory statistics"""
        try:
            # In a real implementation, this would query Azure for thread statistics
            return {
                "active_threads": self.learning_state.azure_thread_count,
                "memory_utilization": "native_azure_managed",
                "thread_capacity": "100000_messages_per_thread"
            }
        except Exception:
            return {"error": "Azure stats unavailable"}
    
    async def _get_mongodb_learning_stats(self) -> Dict[str, Any]:
        """Get MongoDB learning statistics"""
        try:
            return {
                "total_decisions": self.learning_state.mongodb_decisions_stored,
                "learning_patterns": self.learning_state.mongodb_patterns_learned,
                "vector_indexes": "configured",
                "storage_health": "healthy"
            }
        except Exception:
            return {"error": "MongoDB stats unavailable"}


def create_hybrid_learning_system(
    agents_client: AgentsClient,
    mongodb_vector_store,
    agent_id: str
) -> HybridLearningSystem:
    """
    Convenience function to create hybrid learning system.
    
    Args:
        agents_client: Azure AI Foundry agents client
        mongodb_vector_store: MongoDB Atlas vector store integration
        agent_id: Azure AI Foundry agent ID
        
    Returns:
        Configured HybridLearningSystem ready for use
    """
    return HybridLearningSystem(
        agents_client=agents_client,
        mongodb_vector_store=mongodb_vector_store,
        agent_id=agent_id
    )