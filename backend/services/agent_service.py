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