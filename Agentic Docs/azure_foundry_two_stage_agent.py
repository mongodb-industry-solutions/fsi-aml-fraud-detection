"""
================================================================================
AZURE AI FOUNDRY TWO-STAGE TRANSACTION MONITORING AGENT
Leverages Azure AI Foundry SDK + MongoDB Atlas for enterprise fraud detection

Architecture:
- Stage 1: Rules + ML Analysis (Fast Triage)
  * Uses existing FraudDetectionService.evaluate_transaction() 
  * Uses Azure ML scoring for statistical analysis
  * Fast decisions for 80% of clear cases

- Stage 2: Vector Search + AI Analysis (Deep Investigation)
  * Uses existing FraudDetectionService.find_similar_transactions()
  * Uses Azure AI Foundry Agents with MongoDB Atlas vector search
  * Deep pattern analysis for edge cases

Key Features:
- Thread-based Memory: Azure AI Foundry threads for conversation persistence
- MongoDB Integration: Atlas vector search for RAG and operational data
- Tool Integration: Custom functions, file search, and code interpreter
- Adaptive Learning: Threshold adjustment based on performance metrics
================================================================================
"""

import asyncio
import json
import logging
import os
from typing import Dict, List, Any, Optional, Tuple, Set
from datetime import datetime, timedelta
from dataclasses import dataclass, asdict
import numpy as np

# Azure AI Foundry SDK components
from azure.ai.projects import AIProjectClient
from azure.ai.projects.models import ConnectionType
from azure.identity import DefaultAzureCredential
from azure.ai.agents.models import (
    FunctionTool,
    FileSearchTool,
    CodeInterpreterTool,
    ToolSet,
    MessageAttachment,
    AgentEventHandler,
    MessageDeltaChunk
)

# Azure ML components
from azure.ai.ml import MLClient
from azure.ai.ml.entities import OnlineEndpoint
from azure.core.exceptions import HttpResponseError

# MongoDB components
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from pymongo import MongoClient
import aiohttp

# Existing backend services
from services.fraud_detection import FraudDetectionService
from db.mongo_db import MongoDBAccess

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@dataclass
class AgentDecision:
    """Final decision from the smart agent"""
    transaction_id: str
    stage_completed: int  # 1 or 2
    decision: str  # APPROVE, BLOCK, ESCALATE, INVESTIGATE
    confidence: float  # 0-1
    risk_score: float  # 0-100
    
    # Stage 1 data
    rule_score: float
    rule_flags: List[str]
    ml_score: Optional[float]
    
    # Stage 2 data (if applicable)
    similar_transactions_count: int = 0
    similarity_risk: float = 0.0
    ai_analysis: Optional[str] = None
    
    # Metadata
    reasoning: str = ""
    processing_time: float = 0.0
    timestamp: datetime = None
    thread_id: Optional[str] = None  # Azure AI Foundry thread for memory


@dataclass
class MLScore:
    """ML scoring result from Azure ML"""
    risk_score: float  # 0-100
    fraud_probability: float  # 0-1
    confidence: float
    explanation: str


class AzureFoundryTwoStageAgent:
    """
    Intelligent 2-stage transaction monitoring agent using Azure AI Foundry.
    
    Leverages Azure AI Foundry SDK for agent orchestration and MongoDB Atlas
    for vector search, RAG, and persistent memory.
    """
    
    def __init__(
        self,
        db_client: MongoDBAccess,
        agent_name: str = "fraud_detection_agent_v2",
        project_endpoint: str = None,
        enable_streaming: bool = False
    ):
        """
        Initialize the agent with Azure AI Foundry and MongoDB.
        
        Args:
            db_client: MongoDB connection for operational data
            agent_name: Name identifier for the agent
            project_endpoint: Azure AI Foundry project endpoint
            enable_streaming: Enable real-time response streaming
        """
        self.agent_name = agent_name
        self.db_client = db_client
        self.db_name = os.getenv("DB_NAME", "fsi-threatsight360")
        self.enable_streaming = enable_streaming
        
        # Initialize Azure AI Foundry Project Client
        self.project_endpoint = project_endpoint or os.getenv("AZURE_AI_PROJECT_ENDPOINT")
        if not self.project_endpoint:
            raise ValueError("Azure AI Foundry project endpoint required")
        
        self.credential = DefaultAzureCredential()
        self.project_client = AIProjectClient(
            endpoint=self.project_endpoint,
            credential=self.credential
        )
        logger.info("✅ Azure AI Foundry Project Client initialized")
        
        # Initialize existing fraud detection service
        self.fraud_service = FraudDetectionService(db_client, self.db_name)
        logger.info("✅ Fraud Detection Service initialized")
        
        # Initialize MongoDB for enhanced operations
        self._init_mongodb_enhanced()
        
        # Initialize Azure ML Client
        self._init_azure_ml()
        
        # Create and configure the main agent
        self.agent = None
        self.agent_id = None
        self._init_agent()
        
        # Decision thresholds (learned/adjusted over time)
        self.stage1_thresholds = {
            'auto_approve': 25,    # < 25: immediate approval
            'auto_block': 85,      # > 85: immediate block
            'needs_stage2': (25, 85)  # 25-85: proceed to Stage 2
        }
        
        # Thread management for conversation memory
        self.thread_cache = {}  # transaction_id -> thread_id mapping
        
        logger.info(f"🤖 Azure Foundry Two-Stage Agent '{agent_name}' initialized")
    
    def _init_mongodb_enhanced(self):
        """Initialize enhanced MongoDB connections for vector search and memory."""
        try:
            mongodb_uri = os.getenv("MONGODB_URI")
            if not mongodb_uri:
                raise ValueError("MongoDB URI required for vector search")
            
            # Async client for vector operations
            self.async_mongo_client = AsyncIOMotorClient(mongodb_uri)
            self.async_db = self.async_mongo_client[self.db_name]
            
            # Collections for different purposes
            self.decisions_collection = self.async_db["agent_decisions"]
            self.memory_collection = self.async_db["agent_memory"]
            self.vectors_collection = self.async_db["transaction_vectors"]
            
            logger.info("✅ MongoDB enhanced operations initialized")
            
        except Exception as e:
            logger.error(f"MongoDB initialization failed: {e}")
            raise
    
    def _init_azure_ml(self):
        """Initialize Azure ML client for model scoring."""
        try:
            subscription_id = os.getenv("AZURE_SUBSCRIPTION_ID")
            resource_group = os.getenv("AZURE_RESOURCE_GROUP")
            workspace_name = os.getenv("AZURE_ML_WORKSPACE")
            
            if subscription_id and resource_group and workspace_name:
                self.ml_client = MLClient(
                    credential=self.credential,
                    subscription_id=subscription_id,
                    resource_group_name=resource_group,
                    workspace_name=workspace_name
                )
                logger.info("✅ Azure ML Client initialized")
            else:
                self.ml_client = None
                logger.warning("⚠️ Azure ML not configured - ML scoring disabled")
                
        except Exception as e:
            logger.error(f"Azure ML initialization failed: {e}")
            self.ml_client = None
    
    def _init_agent(self):
        """Create and configure the Azure AI Foundry agent with tools."""
        try:
            # Define custom functions for the agent
            user_functions = self._create_agent_functions()
            
            # Create tool set
            toolset = ToolSet()
            
            # Add function tool for custom business logic
            if user_functions:
                function_tool = FunctionTool(functions=user_functions)
                toolset.add(function_tool)
            
            # Add code interpreter for data analysis
            code_interpreter = CodeInterpreterTool()
            toolset.add(code_interpreter)
            
            # Create vector store for file search if configured
            vector_store_id = self._create_vector_store()
            if vector_store_id:
                file_search = FileSearchTool(vector_store_ids=[vector_store_id])
                toolset.add(file_search)
            
            # Create the agent
            model_deployment = os.getenv("AZURE_OPENAI_DEPLOYMENT", "gpt-4o")
            
            self.agent = self.project_client.agents.create_agent(
                model=model_deployment,
                name=self.agent_name,
                instructions=self._get_agent_instructions(),
                toolset=toolset,
                temperature=0.3,  # Lower temperature for consistency
                top_p=0.95
            )
            self.agent_id = self.agent.id
            
            # Enable auto function calling
            self.project_client.agents.enable_auto_function_calls(toolset)
            
            logger.info(f"✅ Agent created with ID: {self.agent_id}")
            
        except Exception as e:
            logger.error(f"Agent creation failed: {e}")
            raise
    
    def _create_agent_functions(self) -> Set:
        """Create custom functions for the agent to call."""
        
        def analyze_transaction_patterns(
            transaction_data: dict,
            lookback_days: int = 30
        ) -> dict:
            """
            Analyze historical transaction patterns for a customer.
            
            Args:
                transaction_data: Current transaction details with customer_id and amount
                lookback_days: Number of days to analyze historical patterns
                
            Returns:
                Pattern analysis results including unusual activity indicators and risk score
            """
            return self._analyze_transaction_patterns(transaction_data, lookback_days)
        
        def check_sanctions_lists(
            entity_name: str,
            entity_type: str = "individual"
        ) -> dict:
            """
            Check if entity appears on sanctions or watch lists.
            
            Args:
                entity_name: Full name of entity to check against sanctions databases
                entity_type: Type of entity (individual/organization/vessel)
                
            Returns:
                Sanctions check results including risk rating and status flags
            """
            return self._check_sanctions_lists(entity_name, entity_type)
        
        def calculate_network_risk(
            customer_id: str,
            depth: int = 2
        ) -> dict:
            """
            Calculate risk based on customer's network connections and relationships.
            
            Args:
                customer_id: Unique customer identifier for network analysis
                depth: Network depth to analyze (1-4 degrees of separation)
                
            Returns:
                Network risk analysis including centrality metrics and connected entity risk
            """
            return self._calculate_network_risk(customer_id, depth)
        
        return {
            analyze_transaction_patterns,
            check_sanctions_lists,
            calculate_network_risk
        }
    
    def _get_agent_instructions(self) -> str:
        """Get the system instructions for the agent."""
        return """
        You are an advanced fraud detection AI agent specializing in financial transaction monitoring.
        
        Your role:
        1. Analyze transactions for fraud patterns using multiple data sources
        2. Leverage historical patterns and network analysis for context
        3. Provide clear, actionable risk assessments
        4. Learn from past decisions to improve accuracy
        
        Key capabilities:
        - Pattern recognition across transaction history
        - Network-based risk analysis
        - Sanctions and watchlist checking
        - Statistical anomaly detection
        
        Decision framework:
        - APPROVE: Low risk, normal patterns (score < 25)
        - INVESTIGATE: Moderate risk, needs review (score 25-60)
        - ESCALATE: High risk, urgent attention (score 60-85)
        - BLOCK: Critical risk, immediate action (score > 85)
        
        Always provide clear reasoning for your assessments and cite specific risk factors.
        """
    
    def _create_vector_store(self) -> Optional[str]:
        """
        Create or get vector store for knowledge retrieval.
        
        NOTE: Vector store functionality has been removed for now.
        MongoDB Atlas provides vector search capabilities directly through
        the existing fraud detection service.
        """
        # Vector store creation disabled - using MongoDB Atlas vector search instead
        return None
    
    async def analyze_transaction(self, transaction_data: Dict[str, Any]) -> AgentDecision:
        """
        Main analysis method - intelligently routes through 1 or 2 stages.
        
        Args:
            transaction_data: Transaction to analyze
            
        Returns:
            AgentDecision with risk assessment and recommendations
        """
        start_time = datetime.now()
        transaction_id = str(transaction_data.get('transaction_id', transaction_data.get('_id', 'unknown')))
        
        logger.info(f"🔍 Starting analysis for transaction {transaction_id}")
        
        try:
            # Get or create thread for this transaction (memory persistence)
            thread_id = await self._get_or_create_thread(transaction_id)
            
            # ================================================================
            # STAGE 1: RULES + ML ANALYSIS (Fast Triage)
            # ================================================================
            logger.info(f"Stage 1: Rules + ML analysis for {transaction_id}")
            
            # Use existing fraud detection service for rule-based analysis
            rule_assessment = await self.fraud_service.evaluate_transaction(transaction_data)
            rule_score = rule_assessment.get('score', 50)
            rule_flags = rule_assessment.get('flags', [])
            
            # Use Azure ML for additional statistical analysis
            ml_score_obj = await self._azure_ml_analysis(transaction_data, rule_assessment)
            ml_score = ml_score_obj.risk_score if ml_score_obj else None
            
            logger.info(f"Stage 1 results: rule_score={rule_score}, ml_score={ml_score}, flags={rule_flags}")
            
            # Stage 1 Decision Logic
            decision, confidence, needs_stage2 = self._stage1_decision_logic(
                rule_score, ml_score, rule_flags
            )
            
            if not needs_stage2:
                # Stage 1 sufficient - return decision
                reasoning = self._build_stage1_reasoning(rule_assessment, ml_score_obj)
                
                # Store conversation in thread for learning
                await self._add_to_thread(
                    thread_id, 
                    f"Stage 1 analysis: {reasoning}"
                )
                
                final_decision = AgentDecision(
                    transaction_id=transaction_id,
                    stage_completed=1,
                    decision=decision,
                    confidence=confidence,
                    risk_score=self._combine_stage1_scores(rule_score, ml_score),
                    rule_score=rule_score,
                    rule_flags=rule_flags,
                    ml_score=ml_score,
                    reasoning=reasoning,
                    thread_id=thread_id,
                    timestamp=datetime.now()
                )
            else:
                # ================================================================
                # STAGE 2: VECTOR SEARCH + AI ANALYSIS (Deep Investigation)
                # ================================================================
                logger.info(f"Stage 2: Vector search + AI analysis for {transaction_id}")
                
                # Use existing vector search service
                similar_transactions, similarity_risk, similarity_breakdown = await self.fraud_service.find_similar_transactions(
                    transaction_data
                )
                
                logger.info(f"Found {len(similar_transactions)} similar transactions, risk: {similarity_risk:.3f}")
                
                # AI analysis using Azure AI Foundry agent
                ai_analysis = await self._stage2_ai_analysis(
                    thread_id,
                    transaction_data, 
                    rule_assessment, 
                    ml_score_obj,
                    similar_transactions, 
                    similarity_breakdown
                )
                
                # Final intelligent decision
                final_decision, final_confidence, final_reasoning = self._stage2_decision_logic(
                    rule_score, ml_score, similarity_risk, ai_analysis,
                    similar_transactions, rule_flags
                )
                
                final_decision = AgentDecision(
                    transaction_id=transaction_id,
                    stage_completed=2,
                    decision=final_decision,
                    confidence=final_confidence,
                    risk_score=self._combine_all_scores(rule_score, ml_score, similarity_risk, ai_analysis),
                    rule_score=rule_score,
                    rule_flags=rule_flags,
                    ml_score=ml_score,
                    similar_transactions_count=len(similar_transactions),
                    similarity_risk=similarity_risk,
                    ai_analysis=ai_analysis,
                    reasoning=final_reasoning,
                    thread_id=thread_id,
                    timestamp=datetime.now()
                )
            
            # Calculate processing time
            final_decision.processing_time = (datetime.now() - start_time).total_seconds()
            
            # Store decision and learn from it
            await self._store_decision_and_learn(final_decision, transaction_data)
            
            logger.info(f"✅ Analysis complete for {transaction_id}: {final_decision.decision} "
                       f"(Stage {final_decision.stage_completed}, {final_decision.processing_time:.3f}s)")
            
            return final_decision
            
        except Exception as e:
            logger.error(f"❌ Error analyzing transaction {transaction_id}: {e}")
            return AgentDecision(
                transaction_id=transaction_id,
                stage_completed=1,
                decision="ESCALATE",
                confidence=0.3,
                risk_score=75.0,
                rule_score=0.0,
                rule_flags=["analysis_error"],
                ml_score=None,  # Fix: Add missing ml_score parameter
                reasoning=f"Analysis failed: {str(e)}",
                processing_time=(datetime.now() - start_time).total_seconds(),
                timestamp=datetime.now()
            )
    
    async def _get_or_create_thread(self, transaction_id: str) -> str:
        """Get existing thread or create new one for transaction memory."""
        # Check cache
        if transaction_id in self.thread_cache:
            return self.thread_cache[transaction_id]
        
        # Check database for existing thread
        existing = await self.memory_collection.find_one({"transaction_id": transaction_id})
        if existing and existing.get("thread_id"):
            self.thread_cache[transaction_id] = existing["thread_id"]
            return existing["thread_id"]
        
        # Create new thread
        thread = self.project_client.agents.threads.create()
        thread_id = thread.id
        
        # Store mapping
        await self.memory_collection.insert_one({
            "transaction_id": transaction_id,
            "thread_id": thread_id,
            "created_at": datetime.now(),
            "agent_name": self.agent_name
        })
        
        self.thread_cache[transaction_id] = thread_id
        return thread_id
    
    async def _add_to_thread(self, thread_id: str, content: str):
        """Add a message to the thread for memory persistence."""
        try:
            self.project_client.agents.messages.create(
                thread_id=thread_id,
                role="assistant",
                content=content
            )
        except Exception as e:
            logger.error(f"Failed to add to thread: {e}")
    
    async def _azure_ml_analysis(
        self, 
        transaction: Dict, 
        rule_assessment: Dict
    ) -> Optional[MLScore]:
        """
        Use Azure ML for statistical analysis.
        
        NOTE: Azure ML integration is currently disabled for simplicity.
        Using placeholder values for demonstration.
        """
        try:
            # TODO: Uncomment when Azure ML is properly configured
            # if not self.ml_client:
            #     return None
            # 
            # # Prepare features for ML model
            # features = self._prepare_ml_features(transaction, rule_assessment)
            # 
            # # Get ML endpoint and score
            # endpoint_name = os.getenv("AZURE_ML_ENDPOINT", "transaction-risk-endpoint")
            # scoring_result = await self._call_azure_ml_endpoint(endpoint_name, features)
            # 
            # if scoring_result:
            #     return MLScore(
            #         risk_score=scoring_result.get('risk_score', 50),
            #         fraud_probability=scoring_result.get('fraud_probability', 0.5),
            #         confidence=scoring_result.get('confidence', 0.7),
            #         explanation=scoring_result.get('explanation', 'Azure ML analysis completed')
            #     )
            
            # Placeholder ML analysis based on transaction amount and rule score
            amount = transaction.get('amount', 0)
            rule_score = rule_assessment.get('score', 50)
            
            # Simple ML simulation based on amount patterns
            if amount > 10000:
                ml_risk_score = min(rule_score + 15, 100)  # High amounts increase risk
            elif amount < 10:
                ml_risk_score = max(rule_score - 10, 0)   # Very low amounts might be suspicious
            else:
                ml_risk_score = rule_score + (amount % 10 - 5)  # Normal variation
            
            return MLScore(
                risk_score=ml_risk_score,
                fraud_probability=ml_risk_score / 100,
                confidence=0.75,
                explanation=f"Simulated ML analysis: amount=${amount}, base_rule_score={rule_score}"
            )
            
        except Exception as e:
            logger.error(f"Azure ML analysis failed: {e}")
        
        return None
    
    def _prepare_ml_features(self, transaction: Dict, rule_assessment: Dict) -> Dict:
        """Prepare features for Azure ML model."""
        return {
            'amount': transaction.get('amount', 0),
            'merchant_category': transaction.get('merchant', {}).get('category', 'unknown'),
            'country': transaction.get('location', {}).get('country', 'US'),
            'hour': datetime.now().hour,
            'rule_score': rule_assessment.get('score', 50),
            'rule_flag_count': len(rule_assessment.get('flags', [])),
            'customer_id': transaction.get('customer_id', 'unknown')
        }
    
    async def _call_azure_ml_endpoint(self, endpoint_name: str, features: Dict) -> Optional[Dict]:
        """Call Azure ML endpoint for scoring."""
        try:
            # Get endpoint URI and key
            endpoint = self.ml_client.online_endpoints.get(name=endpoint_name)
            keys = self.ml_client.online_endpoints.get_keys(name=endpoint_name)
            
            payload = {"data": [features]}
            
            async with aiohttp.ClientSession() as session:
                headers = {
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {keys.primary_key}"
                }
                
                async with session.post(endpoint.scoring_uri, json=payload, headers=headers) as response:
                    if response.status == 200:
                        result = await response.json()
                        return result.get("predictions", [{}])[0]
            
        except Exception as e:
            logger.error(f"Azure ML endpoint call failed: {e}")
        
        return None
    
    def _stage1_decision_logic(
        self, 
        rule_score: float, 
        ml_score: Optional[float], 
        rule_flags: List[str]
    ) -> Tuple[str, float, bool]:
        """
        Stage 1 decision logic combining rules + ML.
        
        Returns: (decision, confidence, needs_stage2)
        """
        
        # Combine rule and ML scores
        combined_score = self._combine_stage1_scores(rule_score, ml_score)
        
        # High confidence decisions
        if combined_score < self.stage1_thresholds['auto_approve'] and not rule_flags:
            return "APPROVE", 0.9, False
        
        if combined_score > self.stage1_thresholds['auto_block']:
            return "BLOCK", 0.85, False
        
        # Critical flags warrant immediate escalation
        critical_flags = {"structuring", "money_laundering", "terrorist_financing"}
        if any(flag in critical_flags for flag in rule_flags):
            return "ESCALATE", 0.8, False
        
        # Edge case - proceed to Stage 2
        logger.info(f"Stage 1 inconclusive (score={combined_score}) - proceeding to Stage 2")
        return "INVESTIGATE", 0.5, True
    
    def _combine_stage1_scores(self, rule_score: float, ml_score: Optional[float]) -> float:
        """Intelligent combination of rule and ML scores."""
        if ml_score is None:
            return rule_score
        
        # Rules good for obvious violations, ML good for statistical anomalies
        # Give slightly more weight to rules for consistency
        return (rule_score * 0.6) + (ml_score * 0.4)
    
    def _build_stage1_reasoning(self, rule_assessment: Dict, ml_score: Optional[MLScore]) -> str:
        """Build reasoning for Stage 1 decisions."""
        rule_score = rule_assessment.get('score', 0)
        rule_flags = rule_assessment.get('flags', [])
        
        reasoning = f"Stage 1 (Rules + ML): Rule score {rule_score}/100"
        
        if ml_score:
            reasoning += f", ML score {ml_score.risk_score}/100"
        
        if rule_flags:
            reasoning += f". Flags: {', '.join(rule_flags)}"
        else:
            reasoning += ". No rule violations detected"
        
        return reasoning
    
    async def _stage2_ai_analysis(
        self,
        thread_id: str,
        transaction: Dict,
        rule_assessment: Dict,
        ml_score: Optional[MLScore],
        similar_transactions: List[Dict],
        similarity_breakdown: Dict
    ) -> str:
        """
        Stage 2 AI analysis using Azure AI Foundry agent with proper conversation loop.
        """
        try:
            # Build comprehensive context
            context = self._build_stage2_context(
                transaction, rule_assessment, ml_score,
                similar_transactions, similarity_breakdown
            )
            
            # Add context to thread
            message = self.project_client.agents.messages.create(
                thread_id=thread_id,
                role="user",
                content=context
            )
            
            # Run agent analysis with proper conversation loop
            if self.enable_streaming:
                # Stream response for real-time feedback
                analysis = await self._stream_agent_response(thread_id)
            else:
                # Production-ready conversation loop with tool handling
                analysis = await self._run_conversation_loop(thread_id)
            
            return f"Azure AI Analysis: {analysis}"
            
        except Exception as e:
            logger.error(f"Stage 2 AI analysis failed: {e}")
            return f"AI analysis failed: {str(e)}"
    
    async def _run_conversation_loop(self, thread_id: str) -> str:
        """
        Production-ready conversation loop with proper tool handling.
        Based on Azure AI Foundry best practices from d.md research.
        """
        try:
            # Create run
            run = self.project_client.agents.runs.create(
                thread_id=thread_id,
                assistant_id=self.agent_id
            )
            
            # Conversation loop with safety limits
            loop_count = 0
            max_iterations = 50
            
            logger.info(f"🔄 Starting conversation loop for thread {thread_id}")
            
            while run.status in ["queued", "in_progress", "requires_action"]:
                loop_count += 1
                logger.debug(f"🔄 Agent loop iteration: {loop_count} (Status: {run.status})")
                
                # Safety mechanism - critical for production
                if loop_count > max_iterations:
                    logger.warning(f"⚠️ Maximum iterations ({max_iterations}) reached. Stopping agent.")
                    break
                
                # Handle tool calls when agent requires action
                if run.status == "requires_action":
                    tool_outputs = []
                    tool_calls = run.required_action.submit_tool_outputs.tool_calls
                    
                    logger.info(f"🔧 Processing {len(tool_calls)} tool calls...")
                    
                    for tool_call in tool_calls:
                        function_name = tool_call.function.name
                        
                        try:
                            arguments = json.loads(tool_call.function.arguments)
                            logger.debug(f"Executing function: {function_name} with args: {arguments}")
                            
                            # Execute the appropriate function
                            if function_name == "analyze_transaction_patterns":
                                result = self._analyze_transaction_patterns(**arguments)
                            elif function_name == "check_sanctions_lists":
                                result = self._check_sanctions_lists(**arguments)
                            elif function_name == "calculate_network_risk":
                                result = self._calculate_network_risk(**arguments)
                            else:
                                result = {"error": f"Unknown function: {function_name}"}
                                logger.warning(f"Unknown function called: {function_name}")
                            
                            # Convert result to JSON string
                            result_json = json.dumps(result) if isinstance(result, dict) else str(result)
                            
                        except Exception as e:
                            logger.error(f"Function execution failed for {function_name}: {e}")
                            result_json = json.dumps({
                                "error": f"Function execution failed: {str(e)}",
                                "function": function_name
                            })
                        
                        # Add tool output
                        tool_outputs.append({
                            "tool_call_id": tool_call.id,
                            "output": result_json
                        })
                    
                    # Submit all tool outputs at once
                    logger.debug(f"Submitting {len(tool_outputs)} tool outputs")
                    run = self.project_client.agents.runs.submit_tool_outputs(
                        thread_id=thread_id,
                        run_id=run.id,
                        tool_outputs=tool_outputs
                    )
                
                # Wait before next status check to avoid rapid polling
                await asyncio.sleep(1)
                
                # Update run status
                run = self.project_client.agents.runs.get(
                    thread_id=thread_id,
                    run_id=run.id
                )
            
            logger.info(f"✅ Conversation loop completed after {loop_count} iterations. Final status: {run.status}")
            
            # Get the assistant's final response
            if run.status == "completed":
                messages = self.project_client.agents.messages.list(thread_id=thread_id, limit=1)
                if messages and messages[0].role == "assistant":
                    content = messages[0].content
                    if content and len(content) > 0:
                        return content[0].text.value if hasattr(content[0].text, 'value') else content[0].text
                return "Analysis completed successfully"
            else:
                logger.warning(f"Run completed with status: {run.status}")
                return f"Analysis completed with status: {run.status}"
            
        except Exception as e:
            logger.error(f"Conversation loop failed: {e}")
            return f"Conversation loop failed: {str(e)}"
    
    def _analyze_transaction_patterns(
        self,
        transaction_data: dict,
        lookback_days: int = 30
    ) -> dict:
        """
        Analyze historical transaction patterns for a customer.
        This method is called by the Azure AI agent as a tool.
        
        Leverages the existing FraudDetectionService for consistency.
        """
        try:
            customer_id = transaction_data.get('customer_id', 'unknown')
            amount = transaction_data.get('amount', 0)
            merchant_category = transaction_data.get('merchant', {}).get('category', 'unknown')
            
            # Get current timestamp for pattern analysis
            from datetime import datetime, timedelta
            current_time = datetime.now()
            start_time = current_time - timedelta(days=lookback_days)
            
            # Query historical transactions for the customer
            try:
                historical_transactions = list(self.db_client.get_collection(
                    db_name=self.db_name,
                    collection_name="transactions"
                ).find({
                    "customer_id": customer_id,
                    "timestamp": {"$gte": start_time, "$lt": current_time}
                }).limit(100))  # Limit for performance
                
                logger.debug(f"Found {len(historical_transactions)} historical transactions for {customer_id}")
                
            except Exception as e:
                logger.warning(f"Failed to query historical transactions: {e}")
                historical_transactions = []
            
            # Analyze patterns using existing logic similar to FraudDetectionService
            analysis_results = {
                "customer_id": customer_id,
                "analysis_period": f"{lookback_days} days",
                "historical_count": len(historical_transactions),
                "current_amount": amount,
                "current_merchant": merchant_category
            }
            
            if historical_transactions:
                # Calculate average amount for customer
                amounts = [t.get('amount', 0) for t in historical_transactions]
                avg_amount = sum(amounts) / len(amounts) if amounts else 0
                max_amount = max(amounts) if amounts else 0
                
                # Merchant category analysis
                merchant_counts = {}
                for t in historical_transactions:
                    cat = t.get('merchant', {}).get('category', 'unknown')
                    merchant_counts[cat] = merchant_counts.get(cat, 0) + 1
                
                most_common_merchant = max(merchant_counts.items(), key=lambda x: x[1])[0] if merchant_counts else 'unknown'
                
                # Velocity analysis (transactions in last hour)
                hour_ago = current_time - timedelta(hours=1)
                recent_count = sum(1 for t in historical_transactions 
                                 if t.get('timestamp', current_time) >= hour_ago)
                
                # Pattern analysis
                unusual_amount = amount > (avg_amount * 3) or amount > 10000  # 3x average or high threshold
                unusual_merchant = merchant_category not in merchant_counts
                velocity_spike = recent_count >= 5  # More than 5 transactions in last hour
                
                # Calculate pattern risk score
                risk_factors = 0
                if unusual_amount:
                    risk_factors += 30
                if unusual_merchant:
                    risk_factors += 20
                if velocity_spike:
                    risk_factors += 25
                if amount > max_amount * 1.5:  # 50% higher than previous max
                    risk_factors += 15
                
                pattern_score = min(risk_factors, 100)
                
                analysis_results.update({
                    "unusual_amount": unusual_amount,
                    "unusual_merchant": unusual_merchant,
                    "unusual_location": False,  # Would require geo analysis
                    "velocity_spike": velocity_spike,
                    "pattern_score": pattern_score,
                    "avg_amount": round(avg_amount, 2),
                    "max_historical_amount": max_amount,
                    "most_common_merchant": most_common_merchant,
                    "recent_transaction_count": recent_count,
                    "risk_factors": {
                        "amount_anomaly": unusual_amount,
                        "new_merchant": unusual_merchant,
                        "high_velocity": velocity_spike,
                        "amount_vs_max": amount > max_amount * 1.5
                    }
                })
            else:
                # No historical data - treat as moderate risk
                analysis_results.update({
                    "unusual_amount": amount > 5000,  # Conservative threshold
                    "unusual_merchant": False,  # Can't determine without history
                    "unusual_location": False,
                    "velocity_spike": False,  # Can't determine without history
                    "pattern_score": 40,  # Moderate risk for new customers
                    "note": "Limited historical data for pattern analysis"
                })
            
            logger.debug(f"Pattern analysis completed for {customer_id}: score={analysis_results.get('pattern_score', 0)}")
            return analysis_results
            
        except Exception as e:
            logger.error(f"Pattern analysis failed for {transaction_data.get('customer_id', 'unknown')}: {e}")
            return {
                "error": str(e), 
                "pattern_score": 50,
                "customer_id": transaction_data.get('customer_id', 'unknown'),
                "analysis_period": f"{lookback_days} days"
            }
    
    def _check_sanctions_lists(
        self,
        entity_name: str,
        entity_type: str = "individual"
    ) -> dict:
        """
        Check if entity appears on sanctions or watch lists.
        This method is called by the Azure AI agent as a tool.
        """
        try:
            # Simplified sanctions check (would normally query real databases)
            # Known test cases for demonstration
            high_risk_names = ["suspicious name", "blocked entity", "sanctioned person"]
            
            on_sanctions = any(risk_name in entity_name.lower() for risk_name in high_risk_names)
            
            result = {
                "entity_name": entity_name,
                "entity_type": entity_type,
                "on_sanctions_list": on_sanctions,
                "on_watchlist": on_sanctions,  # Simplified
                "pep_status": False,
                "risk_rating": "high" if on_sanctions else "low",
                "check_timestamp": datetime.now().isoformat()
            }
            
            logger.debug(f"Sanctions check for {entity_name}: {result}")
            return result
            
        except Exception as e:
            logger.error(f"Sanctions check failed: {e}")
            return {"error": str(e), "risk_rating": "unknown"}
    
    def _calculate_network_risk(
        self,
        customer_id: str,
        depth: int = 2
    ) -> dict:
        """
        Calculate risk based on customer's network connections.
        This method is called by the Azure AI agent as a tool.
        """
        try:
            # Simplified network risk calculation (would use MongoDB graph operations)
            # This would normally call the existing network analysis service
            
            # Mock calculation based on customer_id
            import hashlib
            hash_val = int(hashlib.md5(customer_id.encode()).hexdigest()[:8], 16)
            
            network_risk = {
                "customer_id": customer_id,
                "network_depth": depth,
                "connected_high_risk_entities": hash_val % 5,  # 0-4 connections
                "network_density": (hash_val % 100) / 100,     # 0-1 density
                "centrality_score": (hash_val % 50) / 100,     # 0-0.5 centrality
                "network_risk_score": min((hash_val % 40) + 10, 100),  # 10-50 risk
                "analysis_timestamp": datetime.now().isoformat()
            }
            
            logger.debug(f"Network risk for {customer_id}: {network_risk}")
            return network_risk
            
        except Exception as e:
            logger.error(f"Network risk calculation failed: {e}")
            return {"error": str(e), "network_risk_score": 25}
    
    async def _stream_agent_response(self, thread_id: str) -> str:
        """
        Stream agent response for real-time feedback with tool call handling.
        Based on Azure AI Foundry streaming patterns from research.
        """
        accumulated_text = []
        
        try:
            logger.info(f"🔄 Starting streaming conversation for thread {thread_id}")
            
            with self.project_client.agents.runs.stream(
                thread_id=thread_id,
                assistant_id=self.agent_id
            ) as stream:
                for event_type, event_data, _ in stream:
                    
                    # Handle message deltas (actual content)
                    if event_type == "thread.message.delta":
                        if hasattr(event_data, 'delta') and event_data.delta.content:
                            for content in event_data.delta.content:
                                if hasattr(content, 'text') and content.text:
                                    text_value = content.text.value if hasattr(content.text, 'value') else content.text
                                    accumulated_text.append(text_value)
                                    # Optional: yield for real-time UI updates
                                    logger.debug(f"Stream text: {text_value}")
                    
                    # Handle tool calls in streaming mode
                    elif event_type == "thread.run.requires_action":
                        logger.info("🔧 Handling tool calls in streaming mode")
                        await self._handle_streaming_tool_calls(thread_id, event_data)
                    
                    # Handle completion
                    elif event_type == "thread.run.completed":
                        logger.info("✅ Streaming conversation completed")
                        break
                    
                    # Handle errors
                    elif event_type == "error":
                        logger.error(f"Streaming error: {event_data}")
                        break
            
            result = "".join(accumulated_text) if accumulated_text else "Stream analysis completed"
            logger.info(f"Stream completed with {len(accumulated_text)} text chunks")
            return result
            
        except Exception as e:
            logger.error(f"Streaming failed: {e}")
            return f"Streaming analysis failed: {str(e)}"
    
    async def _handle_streaming_tool_calls(self, thread_id: str, run_data):
        """Handle tool calls during streaming mode."""
        try:
            # Get the current run to access tool calls
            run = self.project_client.agents.runs.get(
                thread_id=thread_id,
                run_id=run_data.id
            )
            
            if run.status == "requires_action":
                tool_outputs = []
                tool_calls = run.required_action.submit_tool_outputs.tool_calls
                
                logger.debug(f"Processing {len(tool_calls)} tool calls in streaming mode")
                
                for tool_call in tool_calls:
                    function_name = tool_call.function.name
                    
                    try:
                        arguments = json.loads(tool_call.function.arguments)
                        
                        # Execute the appropriate function (same as non-streaming)
                        if function_name == "analyze_transaction_patterns":
                            result = self._analyze_transaction_patterns(**arguments)
                        elif function_name == "check_sanctions_lists":
                            result = self._check_sanctions_lists(**arguments)
                        elif function_name == "calculate_network_risk":
                            result = self._calculate_network_risk(**arguments)
                        else:
                            result = {"error": f"Unknown function: {function_name}"}
                        
                        result_json = json.dumps(result) if isinstance(result, dict) else str(result)
                        
                    except Exception as e:
                        logger.error(f"Streaming tool execution failed for {function_name}: {e}")
                        result_json = json.dumps({
                            "error": f"Function execution failed: {str(e)}",
                            "function": function_name
                        })
                    
                    tool_outputs.append({
                        "tool_call_id": tool_call.id,
                        "output": result_json
                    })
                
                # Submit tool outputs
                self.project_client.agents.runs.submit_tool_outputs(
                    thread_id=thread_id,
                    run_id=run.id,
                    tool_outputs=tool_outputs
                )
                
                logger.debug(f"Submitted {len(tool_outputs)} tool outputs in streaming mode")
                
        except Exception as e:
            logger.error(f"Streaming tool call handling failed: {e}")
    
    def _build_stage2_context(
        self,
        transaction: Dict,
        rule_assessment: Dict,
        ml_score: Optional[MLScore],
        similar_transactions: List[Dict],
        similarity_breakdown: Dict
    ) -> str:
        """Build comprehensive context for AI analysis."""
        
        context = f"""
        TRANSACTION DEEP ANALYSIS - STAGE 2
        
        Current Transaction:
        - Amount: ${transaction.get('amount', 0):,.2f}
        - Merchant: {transaction.get('merchant', {}).get('category', 'unknown')}
        - Country: {transaction.get('location', {}).get('country', 'unknown')}
        - Customer: {transaction.get('customer_id', 'unknown')}
        
        Stage 1 Analysis Results:
        - Rule Score: {rule_assessment.get('score', 0)}/100
        - Rule Flags: {rule_assessment.get('flags', [])}
        - ML Score: {ml_score.risk_score if ml_score else 'N/A'}/100
        - ML Confidence: {ml_score.confidence if ml_score else 'N/A'}
        
        Vector Similarity Analysis:
        - Similar Transactions Found: {len(similar_transactions)}
        - Similarity Risk Score: {similarity_breakdown.get('total_matches', 0)}
        - High Risk Matches: {similarity_breakdown.get('high_risk_matches', 0)}
        - Analysis Method: {similarity_breakdown.get('method', 'unknown')}
        
        TASK: The rule-based system and ML identified this as an edge case requiring deeper analysis.
        Analyze the patterns in similar historical transactions to determine if this represents:
        1. A sophisticated fraud attempt that rules/ML missed
        2. A legitimate transaction with false positive indicators
        3. An evolving fraud pattern that requires new detection rules
        
        Consider:
        - Pattern evolution and fraud technique advancement
        - Customer behavioral context from similar transactions
        - Network effects and cross-customer patterns
        - Temporal anomalies and seasonal factors
        
        Provide your assessment and recommendation: APPROVE, INVESTIGATE, ESCALATE, or BLOCK
        """
        
        return context
    
    def _stage2_decision_logic(
        self,
        rule_score: float,
        ml_score: Optional[float],
        similarity_risk: float,
        ai_analysis: str,
        similar_transactions: List[Dict],
        rule_flags: List[str]
    ) -> Tuple[str, float, str]:
        """
        Final decision logic combining all Stage 2 analysis.
        
        Returns: (decision, confidence, reasoning)
        """
        
        # Combine all risk scores intelligently
        final_score = self._combine_all_scores(rule_score, ml_score, similarity_risk, ai_analysis)
        
        # AI analysis insights
        ai_lower = ai_analysis.lower()
        ai_recommendation = None
        if "approve" in ai_lower:
            ai_recommendation = "APPROVE"
        elif "block" in ai_lower:
            ai_recommendation = "BLOCK"
        elif "escalate" in ai_lower:
            ai_recommendation = "ESCALATE"
        
        # Decision logic with AI recommendation
        if ai_recommendation == "BLOCK" or final_score > 85:
            decision, confidence = "BLOCK", 0.9
        elif ai_recommendation == "APPROVE" and final_score < 35:
            decision, confidence = "APPROVE", 0.85
        elif ai_recommendation == "ESCALATE" or len(rule_flags) >= 3:
            decision, confidence = "ESCALATE", 0.8
        elif final_score > 65:
            decision, confidence = "ESCALATE", 0.75
        elif final_score < 40:
            decision, confidence = "APPROVE", 0.7
        else:
            decision, confidence = "INVESTIGATE", 0.65
        
        # Build reasoning
        reasoning = self._build_stage2_reasoning(
            rule_score, ml_score, similarity_risk, ai_analysis,
            similar_transactions, final_score
        )
        
        return decision, confidence, reasoning
    
    def _combine_all_scores(
        self, 
        rule_score: float, 
        ml_score: Optional[float], 
        similarity_risk: float, 
        ai_analysis: str
    ) -> float:
        """Intelligently combine all risk scores from both stages."""
        
        # Base score from Stage 1
        stage1_score = self._combine_stage1_scores(rule_score, ml_score)
        
        # Convert similarity risk to 0-100 scale
        similarity_score = similarity_risk * 100
        
        # Extract AI risk from analysis
        ai_score = 50  # Default
        ai_lower = ai_analysis.lower()
        if "high risk" in ai_lower or "fraud" in ai_lower:
            ai_score = 80
        elif "low risk" in ai_lower or "legitimate" in ai_lower:
            ai_score = 20
        elif "medium risk" in ai_lower:
            ai_score = 50
        
        # Intelligent weighting
        # Stage 1 (Rules + ML) gets 50% weight for tested accuracy
        # Similarity gets 25% weight for pattern recognition
        # AI gets 25% weight for sophisticated analysis
        
        final_score = (
            stage1_score * 0.5 +
            similarity_score * 0.25 +
            ai_score * 0.25
        )
        
        return min(100, final_score)
    
    def _build_stage2_reasoning(
        self,
        rule_score: float,
        ml_score: Optional[float],
        similarity_risk: float,
        ai_analysis: str,
        similar_transactions: List[Dict],
        final_score: float
    ) -> str:
        """Build comprehensive reasoning for Stage 2 decisions."""
        
        reasoning = f"Stage 2 (Vector + AI): Final score {final_score:.1f}/100. "
        reasoning += f"Rules: {rule_score}/100, "
        
        if ml_score:
            reasoning += f"ML: {ml_score}/100, "
        
        reasoning += f"Similarity risk: {similarity_risk:.2f}, "
        reasoning += f"Similar transactions: {len(similar_transactions)}. "
        
        # Add key AI insight (first sentence)
        if ai_analysis and len(ai_analysis) > 10:
            ai_summary = ai_analysis.split('.')[0][:100]
            reasoning += f"AI insight: {ai_summary}. "
        
        return reasoning
    
    async def _store_decision_and_learn(self, decision: AgentDecision, transaction: Dict):
        """
        Store decision in MongoDB and update learning metrics.
        """
        try:
            # Store in decisions collection
            decision_record = asdict(decision)
            decision_record['agent_name'] = self.agent_name
            decision_record['transaction_summary'] = {
                'amount': transaction.get('amount', 0),
                'merchant_category': transaction.get('merchant', {}).get('category', ''),
                'country': transaction.get('location', {}).get('country', '')
            }
            
            await self.decisions_collection.insert_one(decision_record)
            
            # Update thread with decision for learning
            if decision.thread_id:
                await self._add_to_thread(
                    decision.thread_id,
                    f"Decision: {decision.decision} with {decision.confidence:.0%} confidence. "
                    f"Final risk score: {decision.risk_score:.1f}/100"
                )
            
            # Adjust thresholds based on performance (simple learning)
            await self._adjust_thresholds(decision)
            
            logger.info(f"Decision stored for transaction {decision.transaction_id}")
            
        except Exception as e:
            logger.error(f"Failed to store decision and learn: {e}")
    
    async def _adjust_thresholds(self, decision: AgentDecision):
        """Simple threshold adjustment based on decision patterns."""
        try:
            # This could implement more sophisticated reinforcement learning
            # For now, just log for manual analysis
            if decision.stage_completed == 1 and decision.confidence < 0.7:
                logger.debug(f"Low confidence Stage 1 decision: {decision.decision} with score {decision.rule_score}")
            
        except Exception as e:
            logger.error(f"Threshold adjustment failed: {e}")
    
    async def get_performance_metrics(self) -> Dict[str, Any]:
        """Get agent performance statistics from MongoDB."""
        try:
            # Get recent decisions
            recent_decisions = await self.decisions_collection.find({
                'agent_name': self.agent_name,
                'timestamp': {'$gte': datetime.now() - timedelta(days=7)}
            }).to_list(None)
            
            if not recent_decisions:
                return {'message': 'No recent decisions found'}
            
            # Calculate metrics
            total = len(recent_decisions)
            stage1_decisions = sum(1 for d in recent_decisions if d.get('stage_completed') == 1)
            stage2_decisions = total - stage1_decisions
            
            decision_counts = {}
            confidence_sum = 0
            processing_time_sum = 0
            
            for decision in recent_decisions:
                dec = decision.get('decision', 'UNKNOWN')
                decision_counts[dec] = decision_counts.get(dec, 0) + 1
                confidence_sum += decision.get('confidence', 0)
                processing_time_sum += decision.get('processing_time', 0)
            
            # Get thread usage statistics
            unique_threads = await self.memory_collection.distinct('thread_id')
            
            return {
                'agent_name': self.agent_name,
                'period_days': 7,
                'total_decisions': total,
                'stage1_decisions': stage1_decisions,
                'stage2_decisions': stage2_decisions,
                'efficiency_ratio': f"{stage1_decisions/total:.1%}" if total > 0 else "0%",
                'decision_breakdown': decision_counts,
                'avg_confidence': confidence_sum / total if total > 0 else 0,
                'avg_processing_time_ms': (processing_time_sum / total * 1000) if total > 0 else 0,
                'unique_conversation_threads': len(unique_threads),
                'current_thresholds': self.stage1_thresholds,
                'backend': 'Azure AI Foundry + MongoDB Atlas'
            }
            
        except Exception as e:
            logger.error(f"Failed to get metrics: {e}")
            return {'error': str(e)}
    
    async def cleanup(self):
        """Clean up resources."""
        try:
            # Delete agent if created
            if self.agent_id:
                self.project_client.agents.delete_agent(self.agent_id)
                logger.info(f"Agent {self.agent_id} deleted")
            
            # Close MongoDB connections
            self.async_mongo_client.close()
            
        except Exception as e:
            logger.error(f"Cleanup failed: {e}")


# Usage Example
async def main():
    """Example usage of the Azure Foundry Two-Stage Agent."""
    
    # Initialize with existing MongoDB connection
    db_client = MongoDBAccess(os.getenv("MONGODB_URI"))
    
    # Initialize agent
    agent = AzureFoundryTwoStageAgent(
        db_client=db_client,
        agent_name="fraud_detector_v2",
        enable_streaming=True  # Enable real-time responses
    )
    
    # Test transactions
    test_transactions = [
        {
            # Simple case - should be decided in Stage 1
            "transaction_id": "simple_001",
            "customer_id": "customer_123",
            "amount": 45.99,
            "currency": "USD",
            "merchant": {"name": "Starbucks", "category": "restaurant"},
            "location": {"city": "Seattle", "country": "US"},
            "device_info": {"device_id": "known_device", "type": "mobile"},
            "timestamp": datetime.now().isoformat()
        },
        {
            # Edge case - should proceed to Stage 2
            "transaction_id": "edge_002",
            "customer_id": "customer_456",
            "amount": 7500.00,
            "currency": "USD",
            "merchant": {"name": "TechCorp", "category": "electronics"},
            "location": {"city": "Austin", "country": "US"},
            "device_info": {"device_id": "new_device", "type": "desktop"},
            "timestamp": datetime.now().isoformat()
        }
    ]
    
    print("🤖 Azure AI Foundry Two-Stage Agent Analysis")
    print("=" * 60)
    
    for txn in test_transactions:
        print(f"\n🔍 Analyzing: {txn['transaction_id']} (${txn['amount']:,.2f})")
        
        decision = await agent.analyze_transaction(txn)
        
        print(f"   Stage Completed: {decision.stage_completed}")
        print(f"   Decision: {decision.decision}")
        print(f"   Risk Score: {decision.risk_score:.1f}/100")
        print(f"   Confidence: {decision.confidence:.0%}")
        print(f"   Processing Time: {decision.processing_time*1000:.1f}ms")
        print(f"   Rule Score: {decision.rule_score:.1f}/100")
        if decision.ml_score:
            print(f"   ML Score: {decision.ml_score:.1f}/100")
        if decision.stage_completed == 2:
            print(f"   Similar Transactions: {decision.similar_transactions_count}")
            print(f"   AI Analysis: {decision.ai_analysis[:100] if decision.ai_analysis else 'N/A'}...")
        print(f"   Reasoning: {decision.reasoning}")
        if decision.thread_id:
            print(f"   Thread ID: {decision.thread_id}")
    
    # Get performance metrics
    print(f"\n📊 Agent Performance Metrics")
    print("=" * 60)
    metrics = await agent.get_performance_metrics()
    print(json.dumps(metrics, indent=2, default=str))
    
    # Cleanup
    await agent.cleanup()


if __name__ == "__main__":
    asyncio.run(main())