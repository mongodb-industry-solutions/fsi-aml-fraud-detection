"""
Azure AI Foundry Agent Service Integration
Manages the TwoStageAgentCore lifecycle within FastAPI
"""

import logging
import os
from typing import Dict, Any, Optional
from contextlib import asynccontextmanager

from azure_foundry.agent_core import TwoStageAgentCore
from db.mongo_db import MongoDBAccess

logger = logging.getLogger(__name__)

class AgentService:
    """Singleton service for managing the TwoStageAgentCore agent"""
    
    def __init__(self):
        self.agent: Optional[TwoStageAgentCore] = None
        self.db_client: Optional[MongoDBAccess] = None
        self._initialized = False
    
    async def initialize(self) -> bool:
        """Initialize the agent service"""
        if self._initialized:
            logger.info("Agent service already initialized")
            return True
            
        try:
            logger.info("🚀 Initializing Agent Service...")
            
            # Initialize database connection
            mongodb_uri = os.getenv('MONGODB_URI')
            if not mongodb_uri:
                raise ValueError("MONGODB_URI environment variable is required")
                
            self.db_client = MongoDBAccess(mongodb_uri)
            logger.info("✅ Database client initialized")
            
            # Initialize the two-stage agent
            self.agent = TwoStageAgentCore(self.db_client, agent_name="fraud_detection_agent")
            await self.agent.initialize()
            
            self._initialized = True
            logger.info("✅ Agent Service initialized successfully")
            
            # Log agent capabilities
            metrics = await self.agent.get_metrics()
            logger.info(f"Agent ID: {metrics['agent_id']}")
            logger.info(f"Model: {metrics['model_deployment']}")
            native_status = metrics['native_enhancements_enabled']
            logger.info(f"Native enhancements: {sum(native_status.values())}/3 enabled")
            
            return True
            
        except Exception as e:
            logger.error(f"❌ Failed to initialize agent service: {e}")
            self._initialized = False
            return False
    
    async def analyze_transaction(self, transaction_data: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze a transaction using the agent"""
        if not self._initialized or not self.agent:
            raise RuntimeError("Agent service not initialized. Call initialize() first.")
        
        try:
            # Run the agent analysis
            decision = await self.agent.analyze_transaction(transaction_data)
            
            # Convert to API-friendly format
            return {
                "transaction_id": decision.transaction_id,
                "decision": decision.decision.value,
                "risk_level": decision.risk_level.value,
                "risk_score": decision.risk_score,
                "confidence": decision.confidence,
                "stage_completed": decision.stage_completed,
                "reasoning": decision.reasoning,
                "processing_time_ms": decision.total_processing_time_ms,
                "thread_id": getattr(decision, 'thread_id', None)
            }
            
        except Exception as e:
            logger.error(f"Transaction analysis failed: {e}")
            raise
    
    async def extract_decision_from_thread(self, thread_id: str) -> Dict[str, Any]:
        """Extract AI decision and risk score from completed conversation thread"""
        if not self._initialized or not self.agent:
            raise RuntimeError("Agent service not initialized. Call initialize() first.")
        
        try:
            # Get conversation messages from the thread
            messages = self.agent.conversation_handler.agents_client.messages.list(
                thread_id=thread_id, 
                order="desc", 
                limit=10
            )
            
            # Find the last assistant message (final AI response)
            ai_response = None
            for message in messages:
                if message.role == "assistant" and message.content:
                    # Extract text content from message
                    if hasattr(message.content, '__iter__'):
                        for content_block in message.content:
                            if hasattr(content_block, 'text') and hasattr(content_block.text, 'value'):
                                ai_response = content_block.text.value
                                break
                    elif hasattr(message.content, 'text'):
                        ai_response = message.content.text.value if hasattr(message.content.text, 'value') else str(message.content.text)
                    else:
                        ai_response = str(message.content)
                    
                    if ai_response:
                        break
            
            if not ai_response:
                raise ValueError(f"No AI response found in thread {thread_id}")
            
            logger.info(f"🔍 Extracting decision from AI response: {len(ai_response)} characters")
            logger.info(f"🔍 AI response preview: {ai_response[:300]}...")
            
            # Extract decision and risk score using the same methods from stage2_analyzer
            decision = self._extract_ai_decision(ai_response)
            risk_score = self._extract_ai_risk_score(ai_response)
            
            logger.info(f"✅ Extracted: decision={decision}, risk_score={risk_score}")
            
            if not decision:
                raise ValueError("Could not extract decision from AI response")
            if risk_score is None:
                raise ValueError("Could not extract risk score from AI response")
            
            # Calculate risk level from score
            if risk_score >= 80:
                risk_level = "CRITICAL"
            elif risk_score >= 60:
                risk_level = "HIGH"
            elif risk_score >= 40:
                risk_level = "MEDIUM"
            else:
                risk_level = "LOW"
            
            return {
                "decision": decision.value if hasattr(decision, 'value') else str(decision),
                "risk_score": float(risk_score),
                "risk_level": risk_level,
                "ai_response_preview": ai_response[:500],
                "thread_id": thread_id,
                "extraction_source": "completed_conversation"
            }
            
        except Exception as e:
            logger.error(f"Failed to extract decision from thread {thread_id}: {e}")
            raise
    
    def _extract_ai_decision(self, ai_response: str):
        """Extract AI decision from response text"""
        import re
        from azure_foundry.models import DecisionType
        
        if not ai_response:
            return None
            
        # Look for explicit decision patterns
        decision_patterns = [
            r"decision:?\s*(approve|investigate|escalate|block)",
            r"recommendation:?\s*(approve|investigate|escalate|block)",
            r"final decision:?\s*(approve|investigate|escalate|block)",
        ]
        
        for pattern in decision_patterns:
            match = re.search(pattern, ai_response, re.IGNORECASE)
            if match:
                decision_text = match.group(1).upper()
                try:
                    return DecisionType(decision_text)
                except ValueError:
                    continue
        
        logger.warning(f"Could not extract decision from AI response")
        return None
    
    def _extract_ai_risk_score(self, ai_response: str):
        """Extract AI risk score from response text"""
        import re
        
        if not ai_response:
            return None
            
        # Look for risk score patterns
        risk_patterns = [
            r"risk score:?\s*(\d+(?:\.\d+)?)/100",
            r"risk score:?\s*(\d+(?:\.\d+)?)\s*(?:/100)?",
            r"risk:?\s*(\d+(?:\.\d+)?)/100",
            r"score:?\s*(\d+(?:\.\d+)?)/100",
        ]
        
        for pattern in risk_patterns:
            match = re.search(pattern, ai_response, re.IGNORECASE)
            if match:
                try:
                    score = float(match.group(1))
                    # Ensure score is in 0-100 range
                    if 0 <= score <= 100:
                        return score
                except ValueError:
                    continue
        
        logger.warning(f"Could not extract risk score from AI response")
        return None
    
    async def get_agent_status(self) -> Dict[str, Any]:
        """Get current agent status and metrics"""
        if not self._initialized or not self.agent:
            return {
                "initialized": False,
                "status": "not_initialized"
            }
        
        try:
            metrics = await self.agent.get_metrics()
            return {
                "initialized": True,
                "status": "ready",
                "metrics": metrics
            }
        except Exception as e:
            logger.error(f"Failed to get agent status: {e}")
            return {
                "initialized": self._initialized,
                "status": "error",
                "error": str(e)
            }
    
    async def cleanup(self):
        """Cleanup agent resources"""
        if self.agent:
            try:
                await self.agent.cleanup()
                logger.info("✅ Agent cleaned up successfully")
            except Exception as e:
                logger.error(f"Error during agent cleanup: {e}")
        
        if self.db_client:
            try:
                self.db_client.client.close()
                logger.info("✅ Database connection closed")
            except Exception as e:
                logger.error(f"Error closing database: {e}")
        
        self._initialized = False
        self.agent = None
        self.db_client = None

# Global agent service instance
agent_service = AgentService()

async def get_agent_service() -> AgentService:
    """Dependency injection for agent service"""
    if not agent_service._initialized:
        await agent_service.initialize()
    
    return agent_service