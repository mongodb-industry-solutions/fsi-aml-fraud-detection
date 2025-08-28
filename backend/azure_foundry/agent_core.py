"""
Core Azure AI Foundry Two-Stage Agent
Simplified implementation optimized for demo purposes
"""

import logging
from datetime import datetime
from typing import Dict, Any, Optional, List, Tuple

from azure.ai.agents import AgentsClient
from azure.identity import DefaultAzureCredential

from .models import (
    TransactionInput, AgentDecision, AgentConfig, DecisionType, RiskLevel,
    PerformanceMetrics, AgentError, AzureAIError
)
from .config import get_demo_agent_config, get_agent_instructions
from .conversation import NativeConversationHandler
# Moved to function level to avoid circular import
from .memory import create_mongodb_vector_store

logger = logging.getLogger(__name__)


class TwoStageAgentCore:
    """
    Simplified Two-Stage Fraud Detection Agent using Azure AI Foundry
    
    Architecture:
    - Stage 1: Rules + Basic ML (Fast triage for 70-80% of transactions)
    - Stage 2: Vector Search + AI Analysis (Deep analysis for edge cases)
    """
    
    def __init__(
        self, 
        db_client,
        config: Optional[AgentConfig] = None,
        agent_name: str = "demo_fraud_agent"
    ):
        """Initialize the two-stage agent"""
        self.agent_name = agent_name
        self.db_client = db_client
        self.config = config or get_demo_agent_config()
        
        # Performance tracking
        self.metrics = PerformanceMetrics()
        
        # Initialize Azure AI Foundry client
        self.credential = DefaultAzureCredential()
        self.agents_client = None
        self.agent = None
        self.agent_id = None
        
        # Initialize analyzers
        self.stage1_analyzer = None
        self.stage2_analyzer = None
        
        # Native Azure AI Foundry components (Phase 2 enhancements)
        self.conversation_handler: NativeConversationHandler = None
        self.mongodb_vector_store = None
        self.fraud_toolset = None
        
        # Thread management for conversation memory
        self.thread_cache: Dict[str, str] = {}  # transaction_id -> thread_id
        
        # Track if we're using an existing agent (to avoid deleting it on cleanup)
        self.is_reused_agent = False
        
        logger.info(f"Initializing TwoStageAgentCore: {agent_name}")
    
    async def initialize(self):
        """Initialize the agent and all components"""
        try:
            # Initialize Azure AI Foundry client
            await self._init_azure_client()
            
            # Initialize analyzers
            await self._init_analyzers()
            
            # Initialize native Azure AI Foundry enhancements (Phase 2)
            await self._init_native_enhancements()
            
            # Create the Azure AI agent with tools
            await self._init_azure_agent()
            
            logger.info(f"✅ TwoStageAgentCore '{self.agent_name}' initialized successfully")
            
        except Exception as e:
            logger.error(f"❌ Failed to initialize TwoStageAgentCore: {e}")
            raise AgentError(f"Initialization failed: {str(e)}")
    
    async def _init_azure_client(self):
        """Initialize Azure AI Foundry agents client"""
        try:
            self.agents_client = AgentsClient(
                endpoint=self.config.project_endpoint,
                credential=self.credential
            )
            logger.info("✅ Azure AI Foundry agents client initialized")
            
        except Exception as e:
            raise AzureAIError(f"Failed to initialize Azure client: {str(e)}")
    
    async def _init_analyzers(self):
        """Initialize Stage 1 and Stage 2 analyzers"""
        # Import here to avoid circular imports
        from .stage1_analyzer import Stage1Analyzer
        from .stage2_analyzer import Stage2Analyzer
        
        self.stage1_analyzer = Stage1Analyzer(
            db_client=self.db_client,
            config=self.config
        )
        await self.stage1_analyzer.initialize()
        
        self.stage2_analyzer = Stage2Analyzer(
            db_client=self.db_client,
            agents_client=self.agents_client,
            config=self.config
        )
        await self.stage2_analyzer.initialize()
        
        logger.info("✅ Stage analyzers initialized")
    
    async def _init_native_enhancements(self):
        """Initialize native Azure AI Foundry enhancements from Phase 2"""
        try:
            # Initialize native conversation handler
            # Will be set after agent creation
            
            # Create fraud detection toolset (import locally to avoid circular import)
            from services.fraud_detection import FraudDetectionService
            from .tools import create_fraud_toolset
            
            fraud_service = FraudDetectionService(self.db_client)

            # Initialize MongoDB vector store for learning patterns (uses Azure embeddings)
            self.mongodb_vector_store = create_mongodb_vector_store(fraud_service)
            
            # Setup vector indexes for learning patterns
            await self.mongodb_vector_store.setup_vector_indexes()            
            
            self.fraud_toolset = create_fraud_toolset(
                db_client=self.db_client,
                fraud_service=fraud_service
            )
            
            logger.info("✅ Native Azure AI Foundry enhancements initialized")
            
        except Exception as e:
            logger.warning(f"⚠️ Native enhancements initialization failed (demo mode): {e}")
            # Continue in degraded mode for demo purposes
            self.mongodb_vector_store = None
            self.fraud_toolset = None
    
    async def _init_azure_agent(self):
        """Get existing Azure AI Foundry agent or create new one if needed"""
        try:
            # Get the existing agent ID from config or environment variable
            import os
            EXISTING_AGENT_ID = os.getenv("AZURE_AGENT_ID", "asst_Q6FO8w2G1h81QnSI5giqHX9M")
            
            try:
                # First, try to get the existing agent
                self.agent = self.agents_client.get_agent(EXISTING_AGENT_ID)
                self.agent_id = self.agent.id
                self.is_reused_agent = True  # Mark as reused agent
                logger.info(f"✅ Reusing existing Azure AI agent with ID: {self.agent_id}")
                
                # For reused agents, we don't need to enable function calls here
                # We'll pass the tools directly to the run() method instead
                if self.fraud_toolset:
                    logger.info(f"🛠️ Fraud toolset available with {len(self.fraud_toolset)} tools for reused agent")
                else:
                    logger.warning("⚠️ No fraud toolset available - functions may not work")
                
            except Exception as get_error:
                logger.warning(f"Could not retrieve existing agent {EXISTING_AGENT_ID}: {get_error}")
                logger.info("Creating new agent as fallback...")
                
                # Fallback: Create new agent with native tools if available
                agent_kwargs = {
                    "model": self.config.model_deployment,
                    "name": self.agent_name,
                    "instructions": get_agent_instructions(),
                    "temperature": self.config.agent_temperature,
                    "top_p": 0.95
                }
                
                # Add tools if available (Phase 2 enhancement) - CORRECT AZURE AI FOUNDRY PATTERN
                if self.fraud_toolset:
                    # Use the TOOLSET approach as documented in Azure AI Foundry research
                    from azure.ai.agents.models import ToolSet
                    
                    toolset = ToolSet()
                    for tool in self.fraud_toolset:
                        toolset.add(tool)
                    
                    # Enable auto function calls with the toolset (CRITICAL step from docs)
                    self.agents_client.enable_auto_function_calls(toolset)
                    
                    # Pass toolset to agent creation (NOT tools parameter)
                    agent_kwargs["toolset"] = toolset
                    logger.info(f"🛠️ Creating fallback agent with toolset containing {len(self.fraud_toolset)} fraud detection tools")
                else:
                    logger.info("🛠️ Creating fallback agent without tools (degraded mode)")
                
                self.agent = self.agents_client.create_agent(**agent_kwargs)
                self.agent_id = self.agent.id
                logger.info(f"✅ Created fallback Azure AI agent with ID: {self.agent_id}")
            
            # Initialize native conversation handler now that agent exists
            if self.agents_client and self.agent_id:
                self.conversation_handler = NativeConversationHandler(
                    agents_client=self.agents_client,
                    agent_id=self.agent_id
                )
                logger.info("✅ Native conversation handler initialized")
            
        except Exception as e:
            raise AzureAIError(f"Failed to initialize Azure AI agent: {str(e)}")
    
    async def analyze_transaction(self, transaction_data: Dict[str, Any]) -> AgentDecision:
        """
        Main analysis method - routes through Stage 1 and potentially Stage 2
        
        Args:
            transaction_data: Transaction to analyze
            
        Returns:
            AgentDecision with risk assessment and recommendations
        """
        start_time = datetime.now()
        
        # Convert to standardized input
        transaction = TransactionInput(
            transaction_id=str(transaction_data.get('transaction_id', transaction_data.get('_id', 'unknown'))),
            customer_id=str(transaction_data.get('customer_id', 'unknown')),
            amount=float(transaction_data.get('amount', 0)),
            currency=transaction_data.get('currency', 'USD'),
            merchant_category=transaction_data.get('merchant', {}).get('category', 'unknown'),
            location_country=transaction_data.get('location', {}).get('country', 'US')
        )
        
        logger.info(f"🔍 Analyzing transaction {transaction.transaction_id} (${transaction.amount:,.2f})")
        
        try:
            # ============================================================
            # STAGE 1: RULES + BASIC ML ANALYSIS
            # ============================================================
            stage1_result = await self.stage1_analyzer.analyze(transaction, transaction_data)
            
            logger.info(
                f"Stage 1 complete - Score: {stage1_result.combined_score:.1f}, "
                f"Needs Stage 2: {stage1_result.needs_stage2}"
            )
            
            # Check if Stage 1 decision is sufficient
            if not stage1_result.needs_stage2:
                # Make Stage 1 decision
                decision_type, confidence = self._make_stage1_decision(stage1_result)
                
                final_decision = AgentDecision(
                    transaction_id=transaction.transaction_id,
                    decision=decision_type,
                    confidence=confidence,
                    risk_score=stage1_result.combined_score,
                    risk_level=self._calculate_risk_level(stage1_result.combined_score),
                    stage_completed=1,
                    stage1_result=stage1_result,
                    reasoning=self._build_stage1_reasoning(stage1_result),
                    total_processing_time_ms=(datetime.now() - start_time).total_seconds() * 1000
                )
                
                # Update metrics
                self.metrics.stage1_decisions += 1
            
            else:
                # ============================================================
                # STAGE 2: VECTOR SEARCH + AI ANALYSIS (Enhanced with Native Patterns)
                # ============================================================
                logger.info(f"Proceeding to Stage 2 analysis for {transaction.transaction_id}")
                
                # Get or create conversation thread for this transaction
                thread_id = await self._get_or_create_thread(transaction.transaction_id)
                
                # Store historical decision for meta-learning (if vector store available)
                await self._store_learning_context(transaction, transaction_data, stage1_result)
                
                # Run Stage 2 analysis with enhanced patterns
                stage2_result = await self.stage2_analyzer.analyze(
                    transaction=transaction,
                    transaction_data=transaction_data,
                    stage1_result=stage1_result,
                    thread_id=thread_id,
                    agent_id=self.agent_id,
                    conversation_handler=self.conversation_handler,  # Pass native handler
                    fraud_toolset=self.fraud_toolset  # CRITICAL: Pass fraud tools for reused agents
                )
                
                logger.info(
                    f"Stage 2 complete - AI recommendation: {stage2_result.ai_recommendation}, "
                    f"Similar transactions: {stage2_result.similar_transactions_count}"
                )
                
                # Make final decision combining Stage 1 and Stage 2 results
                decision_type, confidence = self._make_stage2_decision(stage1_result, stage2_result)
                final_risk_score = self._calculate_final_risk_score(stage1_result, stage2_result)
                
                final_decision = AgentDecision(
                    transaction_id=transaction.transaction_id,
                    decision=decision_type,
                    confidence=confidence,
                    risk_score=final_risk_score,
                    risk_level=self._calculate_risk_level(final_risk_score),
                    stage_completed=2,
                    stage1_result=stage1_result,
                    stage2_result=stage2_result,
                    reasoning=self._build_stage2_reasoning(stage1_result, stage2_result),
                    thread_id=thread_id,
                    total_processing_time_ms=(datetime.now() - start_time).total_seconds() * 1000
                )
                
                # Update metrics
                self.metrics.stage2_decisions += 1
            
            # Store final decision for meta-learning (if vector store available)
            await self._store_final_decision(final_decision, transaction_data)
            
            # Update overall metrics
            self._update_metrics(final_decision)
            
            logger.info(
                f"✅ Analysis complete: {transaction.transaction_id} → {final_decision.decision.value} "
                f"(Stage {final_decision.stage_completed}, {final_decision.total_processing_time_ms:.0f}ms)"
            )
            
            return final_decision
            
        except Exception as e:
            logger.error(f"❌ Error analyzing transaction {transaction.transaction_id}: {e}")
            
            # Return error decision
            return AgentDecision(
                transaction_id=transaction.transaction_id,
                decision=DecisionType.ESCALATE,
                confidence=0.3,
                risk_score=75.0,
                risk_level=self._calculate_risk_level(75.0),
                stage_completed=1,
                reasoning=f"Analysis failed: {str(e)}",
                total_processing_time_ms=(datetime.now() - start_time).total_seconds() * 1000
            )
    
    def _make_stage1_decision(self, stage1_result) -> Tuple[DecisionType, float]:
        """Make decision based on Stage 1 results only"""
        score = stage1_result.combined_score
        
        if score < self.config.stage1_auto_approve_threshold:
            return DecisionType.APPROVE, 0.85
        elif score > self.config.stage1_auto_block_threshold:
            return DecisionType.BLOCK, 0.9
        else:
            # This shouldn't happen if thresholds are configured correctly
            return DecisionType.INVESTIGATE, 0.6
    
    def _make_stage2_decision(self, stage1_result, stage2_result) -> Tuple[DecisionType, float]:
        """Make final decision based on both Stage 1 and Stage 2 results"""
        # If AI has a strong recommendation, respect it
        if stage2_result.ai_recommendation:
            ai_rec = stage2_result.ai_recommendation
            
            # High confidence for AI recommendations
            if ai_rec == DecisionType.BLOCK:
                return DecisionType.BLOCK, 0.88
            elif ai_rec == DecisionType.APPROVE:
                return DecisionType.APPROVE, 0.82
            elif ai_rec == DecisionType.ESCALATE:
                return DecisionType.ESCALATE, 0.85
        
        # Fall back to combined score-based decision
        final_score = self._calculate_final_risk_score(stage1_result, stage2_result)
        
        if final_score > 80:
            return DecisionType.BLOCK, 0.85
        elif final_score > 65:
            return DecisionType.ESCALATE, 0.78
        elif final_score < 35:
            return DecisionType.APPROVE, 0.75
        else:
            return DecisionType.INVESTIGATE, 0.70
    
    def _calculate_risk_level(self, risk_score: float) -> RiskLevel:
        """Calculate risk level from risk score"""
        if risk_score >= 80:
            return RiskLevel.CRITICAL
        elif risk_score >= 60:
            return RiskLevel.HIGH
        elif risk_score >= 40:
            return RiskLevel.MEDIUM
        else:
            return RiskLevel.LOW
    
    def _calculate_final_risk_score(self, stage1_result, stage2_result) -> float:
        """Calculate final risk score combining both stages"""
        stage1_score = stage1_result.combined_score
        
        # Adjust based on Stage 2 findings
        stage2_adjustment = 0
        if stage2_result.similarity_risk_score > 60:
            stage2_adjustment += 15
        elif stage2_result.similarity_risk_score > 40:
            stage2_adjustment += 8
        
        if stage2_result.similar_transactions_count > 10:
            stage2_adjustment += 5
        
        # AI analysis can add or subtract points
        if "high risk" in stage2_result.ai_analysis_summary.lower():
            stage2_adjustment += 10
        elif "low risk" in stage2_result.ai_analysis_summary.lower():
            stage2_adjustment -= 8
        
        final_score = min(100, max(0, stage1_score + stage2_adjustment))
        return final_score
    
    def _build_stage1_reasoning(self, stage1_result) -> str:
        """Build reasoning for Stage 1 only decisions"""
        reasoning = f"Stage 1 Analysis: Combined score {stage1_result.combined_score:.1f}/100"
        reasoning += f" (Rules: {stage1_result.rule_score:.1f}"
        
        if stage1_result.basic_ml_score:
            reasoning += f", ML: {stage1_result.basic_ml_score:.1f}"
        reasoning += ")"
        
        if stage1_result.rule_flags:
            reasoning += f". Rule flags: {', '.join(stage1_result.rule_flags)}"
        else:
            reasoning += ". No rule violations detected"
        
        return reasoning
    
    def _build_stage2_reasoning(self, stage1_result, stage2_result) -> str:
        """Build comprehensive reasoning for Stage 2 decisions"""
        reasoning = self._build_stage1_reasoning(stage1_result)
        
        reasoning += f". Stage 2: Found {stage2_result.similar_transactions_count} similar transactions"
        reasoning += f" with {stage2_result.similarity_risk_score:.1f}/100 similarity risk"
        
        if stage2_result.ai_recommendation:
            reasoning += f". AI recommends: {stage2_result.ai_recommendation.value}"
        
        if stage2_result.ai_analysis_summary:
            # Add first sentence of AI analysis
            summary = stage2_result.ai_analysis_summary.split('.')[0][:100]
            reasoning += f". AI insight: {summary}"
        
        return reasoning
    
    def _update_metrics(self, decision: AgentDecision):
        """Update performance metrics"""
        self.metrics.total_transactions += 1
        self.metrics.decision_breakdown[decision.decision.value] += 1
        
        # Update averages
        total = self.metrics.total_transactions
        self.metrics.avg_processing_time_ms = (
            (self.metrics.avg_processing_time_ms * (total - 1) + decision.total_processing_time_ms) / total
        )
        self.metrics.avg_confidence = (
            (self.metrics.avg_confidence * (total - 1) + decision.confidence) / total
        )
    
    async def _get_or_create_thread(self, transaction_id: str) -> str:
        """Get existing thread or create new one for conversation memory"""
        # Check cache first
        if transaction_id in self.thread_cache:
            return self.thread_cache[transaction_id]
        
        try:
            # Create new thread using correct API method
            thread = self.agents_client.threads.create()
            thread_id = thread.id
            
            # Cache it
            self.thread_cache[transaction_id] = thread_id
            
            logger.debug(f"Created new thread {thread_id} for transaction {transaction_id}")
            return thread_id
            
        except Exception as e:
            logger.error(f"Failed to create thread for {transaction_id}: {e}")
            # Return a fallback thread ID or raise exception
            raise AzureAIError(f"Thread creation failed: {str(e)}")
    
    async def _store_learning_context(
        self, 
        transaction: TransactionInput, 
        transaction_data: Dict[str, Any], 
        stage1_result
    ):
        """Store transaction context for meta-learning (Phase 2 enhancement)"""
        if not self.mongodb_vector_store:
            return  # Skip if vector store not available
        
        try:
            # Create learning context document
            context = {
                "transaction_analysis": {
                    "stage1_score": stage1_result.combined_score,
                    "rule_flags": stage1_result.rule_flags,
                    "needs_deeper_analysis": stage1_result.needs_stage2
                },
                "transaction_features": {
                    "amount": transaction.amount,
                    "merchant_category": transaction.merchant_category,
                    "location_country": transaction.location_country
                }
            }
            
            # Store preliminary analysis pattern
            await self.mongodb_vector_store.store_learning_pattern(
                pattern_type="preliminary_analysis",
                pattern_data=context,
                effectiveness_score=0.5  # Will be updated after final decision
            )
            
        except Exception as e:
            logger.debug(f"Learning context storage failed (non-critical): {e}")
    
    async def _store_final_decision(
        self, 
        final_decision: AgentDecision, 
        transaction_data: Dict[str, Any]
    ):
        """Store final agent decision for meta-learning (Phase 2 enhancement)"""
        if not self.mongodb_vector_store:
            return  # Skip if vector store not available
        
        try:
            # Convert AgentDecision to dictionary for storage
            decision_dict = {
                "decision": final_decision.decision.value,
                "confidence": final_decision.confidence,
                "risk_score": final_decision.risk_score,
                "reasoning": final_decision.reasoning,
                "stage_completed": final_decision.stage_completed,
                "processing_time_ms": final_decision.total_processing_time_ms
            }
            
            # Store the decision for future learning
            await self.mongodb_vector_store.store_agent_decision(
                agent_decision=decision_dict,
                transaction_data=transaction_data,
                context={
                    "stage1_analysis": final_decision.stage1_result.__dict__ if final_decision.stage1_result else None,
                    "stage2_analysis": final_decision.stage2_result.__dict__ if final_decision.stage2_result else None
                }
            )
            
            logger.debug(f"Decision stored for learning: {final_decision.transaction_id}")
            
        except Exception as e:
            logger.debug(f"Final decision storage failed (non-critical): {e}")
    
    async def get_metrics(self) -> Dict[str, Any]:
        """Get current performance metrics"""
        return {
            "agent_name": self.agent_name,
            "total_transactions": self.metrics.total_transactions,
            "stage1_decisions": self.metrics.stage1_decisions,
            "stage2_decisions": self.metrics.stage2_decisions,
            "stage1_efficiency_percent": self.metrics.stage1_efficiency,
            "avg_processing_time_ms": round(self.metrics.avg_processing_time_ms, 2),
            "avg_confidence": round(self.metrics.avg_confidence, 3),
            "decision_breakdown": self.metrics.decision_breakdown,
            "agent_id": self.agent_id,
            "is_reused_agent": self.is_reused_agent,
            "model_deployment": self.config.model_deployment,
            "demo_mode": self.config.demo_mode,
            "native_enhancements_enabled": {
                "conversation_handler": self.conversation_handler is not None,
                "mongodb_vector_store": self.mongodb_vector_store is not None,
                "fraud_toolset": self.fraud_toolset is not None
            }
        }
    
    async def cleanup(self):
        """Clean up resources"""
        try:
            # Only delete Azure AI agent if we created it (not reused)
            if self.agent_id and self.agents_client and not self.is_reused_agent:
                self.agents_client.delete_agent(self.agent_id)
                logger.info(f"Deleted agent {self.agent_id}")
            elif self.is_reused_agent:
                logger.info(f"Skipping deletion of reused agent {self.agent_id}")
            
            # Clean up analyzers
            if self.stage1_analyzer:
                await self.stage1_analyzer.cleanup()
            
            if self.stage2_analyzer:
                await self.stage2_analyzer.cleanup()
            
            logger.info(f"✅ TwoStageAgentCore '{self.agent_name}' cleaned up")
            
        except Exception as e:
            logger.error(f"Cleanup error: {e}")
    
    async def get_similar_decisions(
        self, 
        transaction_data: Dict[str, Any], 
        limit: int = 5
    ) -> List[Dict[str, Any]]:
        """Get similar past decisions for context (Phase 2 enhancement)"""
        if not self.mongodb_vector_store:
            return []
        
        try:
            similar_decisions = await self.mongodb_vector_store.retrieve_similar_decisions(
                current_transaction=transaction_data,
                similarity_threshold=0.7,
                limit=limit
            )
            
            return similar_decisions
            
        except Exception as e:
            logger.debug(f"Similar decision retrieval failed: {e}")
            return []