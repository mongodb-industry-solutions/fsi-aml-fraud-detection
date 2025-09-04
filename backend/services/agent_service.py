"""
Azure AI Foundry Agent Service Integration
Manages the TwoStageAgentCore lifecycle within FastAPI
"""

import os
from typing import Dict, Any, Optional
from contextlib import asynccontextmanager

from azure_foundry.agent_core import TwoStageAgentCore
from db.mongo_db import MongoDBAccess
from logging_setup import get_logger

logger = get_logger(__name__)

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
            # First, get Stage 1 results immediately
            stage1_decision = await self.agent.analyze_stage1_only(transaction_data)
            
            # Convert Stage 1 to API-friendly format
            result = {
                "transaction_id": stage1_decision.transaction_id,
                "decision": stage1_decision.decision.value if stage1_decision.decision else "PENDING",
                "risk_level": stage1_decision.risk_level.value if stage1_decision.risk_level else "LOW",
                "risk_score": stage1_decision.risk_score,
                "confidence": stage1_decision.confidence,
                "stage_completed": 1,
                "reasoning": stage1_decision.reasoning,
                "processing_time_ms": stage1_decision.total_processing_time_ms,
                "thread_id": None
            }
            
            # Include Stage 1 details
            if stage1_decision.stage1_result:
                result["stage1_result"] = {
                    "rule_score": stage1_decision.stage1_result.rule_score,
                    "basic_ml_score": stage1_decision.stage1_result.basic_ml_score,
                    "combined_score": stage1_decision.stage1_result.combined_score,
                    "rule_flags": stage1_decision.stage1_result.rule_flags,
                    "needs_stage2": stage1_decision.stage1_result.needs_stage2,
                    "processing_time_ms": stage1_decision.stage1_result.processing_time_ms
                }
                
                # If Stage 2 is needed, continue processing asynchronously
                if stage1_decision.stage1_result.needs_stage2:
                    # Create thread for Stage 2 processing
                    thread_id = await self.agent._get_or_create_thread(
                        stage1_decision.transaction_id, 
                        transaction_data.get('customer_id')
                    )
                    result["thread_id"] = thread_id
                    result["stage_completed"] = 1  # Still Stage 1 for now
                    result["reasoning"] += " - AI analysis in progress"
                    
                    logger.info(f"✅ Stage 1 complete, Stage 2 thread created: {thread_id}")
                    
                    # Trigger Stage 2 processing asynchronously (don't await)
                    import asyncio
                    asyncio.create_task(self._run_stage2_async(transaction_data, thread_id))
                    
                else:
                    # Stage 1 was sufficient - final decision
                    result["stage_completed"] = 1
                    logger.info(f"✅ Stage 1 complete - no Stage 2 needed")
            
            return result
            
        except Exception as e:
            logger.error(f"Transaction analysis failed: {e}")
            raise
    
    async def _run_stage2_async(self, transaction_data: Dict[str, Any], thread_id: str):
        """Run Stage 2 analysis asynchronously and store results in thread"""
        try:
            logger.info(f"🔄 Starting async Stage 2 processing for thread {thread_id}")
            
            # Run the full agent analysis (which will do Stage 1 + Stage 2)
            # But we'll only use the Stage 2 results since Stage 1 was already returned
            full_decision = await self.agent.analyze_transaction(transaction_data)
            
            logger.info(f"✅ Stage 2 processing complete for thread {thread_id}")
            
            # The conversation should now be complete in the thread
            # Frontend can poll /api/agent/decision/{thread_id} to get results
            
        except Exception as e:
            logger.error(f"❌ Stage 2 async processing failed for thread {thread_id}: {e}")
    
    
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