"""
================================================================================
SMART TWO-STAGE TRANSACTION MONITORING AGENT
Leverages existing backend services + adds agentic intelligence

Architecture:
- Stage 1: Rules + ML Analysis (Fast Triage)
  * Uses existing FraudDetectionService.evaluate_transaction() 
  * Uses Azure ML scoring for statistical analysis
  * Fast decisions for 80% of clear cases

- Stage 2: Vector Search + AI Analysis (Deep Investigation)
  * Uses existing FraudDetectionService.find_similar_transactions()
  * Uses Azure AI Foundry + Memorizz for intelligent analysis
  * Deep pattern analysis for edge cases

Key Agentic Features:
- Memory: Memorizz for learning from past decisions
- Intelligence: Azure AI Foundry for sophisticated pattern analysis
- Adaptation: Threshold adjustment based on performance
================================================================================
"""

import asyncio
import json
import logging
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime, timedelta
from dataclasses import dataclass, asdict
import os
import numpy as np

# Existing backend services - leverage what's already built and tested
from services.fraud_detection import FraudDetectionService
from db.mongo_db import MongoDBAccess

# Azure components from original agent
from azure.ai.ml import MLClient
from azure.ai.ml.entities import OnlineEndpoint
from azure.identity import DefaultAzureCredential
from azure.core.credentials import AzureKeyCredential
from azure.ai.openai import AzureOpenAIClient
import aiohttp

# Memorizz components from original agent
from memorizz.memagent import MemAgent
from memorizz.memory_provider.mongodb.provider import MongoDBConfig, MongoDBProvider
from memorizz.llms.openai import OpenAI as MemorizzOpenAI
from memorizz.persona import Persona

# Azure AI Foundry Agent (if available)
try:
    from services.fraud_detection_agent import FraudDetectionAgent
    AZURE_AI_AGENT_AVAILABLE = True
except ImportError:
    AZURE_AI_AGENT_AVAILABLE = False
    logging.warning("Azure AI Agent not available. Using basic AI analysis.")

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

@dataclass
class MLScore:
    """ML scoring result from Azure ML"""
    risk_score: float  # 0-100
    fraud_probability: float  # 0-1
    confidence: float
    explanation: str

class SmartTwoStageAgent:
    """
    Intelligent 2-stage transaction monitoring agent.
    
    Leverages existing services + adds agentic intelligence:
    - Stage 1: Existing FraudDetectionService + Azure ML
    - Stage 2: Existing vector search + Azure AI + Memorizz
    """
    
    def __init__(
        self,
        db_client: MongoDBAccess,
        agent_name: str = "smart_agent_v1",
        azure_config: Dict[str, str] = None,
        enable_azure_ai: bool = True
    ):
        """Initialize the smart agent with existing services + Azure components"""
        self.agent_name = agent_name
        self.db_client = db_client
        self.db_name = os.getenv("DB_NAME", "fsi-threatsight360")
        
        # Initialize existing fraud detection service
        self.fraud_service = FraudDetectionService(db_client, self.db_name)
        logger.info("✅ Existing FraudDetectionService initialized")
        
        # Initialize Azure components
        self.azure_config = azure_config or {}
        self._initialize_azure_components()
        
        # Initialize Memorizz for learning
        self._initialize_memorizz()
        
        # Initialize Azure AI Foundry agent if available
        self.ai_agent = None
        if enable_azure_ai and AZURE_AI_AGENT_AVAILABLE:
            try:
                self.ai_agent = FraudDetectionAgent()
                logger.info("✅ Azure AI Foundry Agent initialized")
            except Exception as e:
                logger.warning(f"Azure AI Agent failed to initialize: {e}")
        
        # Decision thresholds (learned/adjusted over time)
        self.stage1_thresholds = {
            'auto_approve': 25,    # < 25: immediate approval
            'auto_block': 85,      # > 85: immediate block
            'needs_stage2': (25, 85)  # 25-85: proceed to Stage 2
        }
        
        # Memory collections
        self.decisions_collection = "agent_decisions"
        self.insights_collection = "agent_insights"
        
        logger.info(f"🤖 Smart Two-Stage Agent '{agent_name}' initialized successfully")
    
    def _initialize_azure_components(self):
        """Initialize Azure ML and embedding services"""
        try:
            # Azure ML Client
            if self.azure_config.get('subscription_id'):
                self.credential = DefaultAzureCredential()
                self.ml_client = MLClient(
                    credential=self.credential,
                    subscription_id=self.azure_config['subscription_id'],
                    resource_group_name=self.azure_config.get('resource_group'),
                    workspace_name=self.azure_config.get('workspace_name')
                )
                logger.info("✅ Azure ML Client initialized")
            else:
                self.ml_client = None
                logger.info("⚠️ Azure ML not configured")
            
            # Azure OpenAI for embeddings
            if self.azure_config.get('openai_endpoint'):
                self.embedding_client = AzureOpenAIClient(
                    endpoint=self.azure_config['openai_endpoint'],
                    credential=AzureKeyCredential(self.azure_config.get('openai_api_key', ''))
                )
                self.embedding_deployment = self.azure_config.get('embedding_deployment', 'text-embedding-ada-002')
                logger.info("✅ Azure OpenAI embedding service initialized")
            else:
                self.embedding_client = None
                logger.info("⚠️ Azure OpenAI not configured")
                
        except Exception as e:
            logger.error(f"Azure components initialization failed: {e}")
            self.ml_client = None
            self.embedding_client = None
    
    def _initialize_memorizz(self):
        """Initialize Memorizz memory system for learning"""
        try:
            mongodb_uri = os.getenv("MONGODB_URI")
            openai_api_key = os.getenv("OPENAI_API_KEY")
            
            if not mongodb_uri or not openai_api_key:
                logger.warning("⚠️ Memorizz not configured (missing MongoDB URI or OpenAI key)")
                self.mem_agent = None
                return
            
            # Configure MongoDB for Memorizz
            memory_config = MongoDBConfig(
                uri=mongodb_uri,
                database_name=f"{self.db_name}_memory"
            )
            
            # Initialize memory provider
            memory_provider = MongoDBProvider(memory_config)
            
            # Create Memorizz agent
            self.mem_agent = MemAgent(
                model=MemorizzOpenAI(model="gpt-3.5-turbo"),
                instruction=self._get_memorizz_instructions(),
                memory_provider=memory_provider
            )
            
            # Set agent persona
            persona = Persona(
                name=f"{self.agent_name}_monitor",
                role="Advanced AML Compliance Specialist",
                goals="Detect sophisticated financial fraud patterns using AI and vector similarity",
                background="Expert in transaction monitoring with deep learning capabilities"
            )
            self.mem_agent.set_persona(persona)
            self.mem_agent.save()
            
            logger.info("✅ Memorizz memory system initialized")
            
        except Exception as e:
            logger.error(f"Memorizz initialization failed: {e}")
            self.mem_agent = None
    
    def _get_memorizz_instructions(self) -> str:
        """Instructions for the Memorizz agent"""
        return """
        You are an advanced transaction monitoring AI with memory and learning capabilities.
        
        Your role:
        1. Analyze complex transaction patterns that traditional rules might miss
        2. Learn from historical decisions to improve future analysis
        3. Identify sophisticated fraud techniques using vector similarity patterns
        4. Provide detailed reasoning for risk assessments
        
        Key strengths:
        - Memory of past similar cases and their outcomes
        - Pattern recognition across large transaction datasets
        - Ability to detect evolving fraud techniques
        - Integration with ML models and vector search results
        
        Always provide clear reasoning for your risk assessments and learn from feedback.
        """
    
    async def analyze_transaction(self, transaction_data: Dict[str, Any]) -> AgentDecision:
        """
        Main analysis method - intelligently routes through 1 or 2 stages.
        """
        start_time = datetime.now()
        transaction_id = str(transaction_data.get('transaction_id', transaction_data.get('_id', 'unknown')))
        
        logger.info(f"🔍 Starting analysis for transaction {transaction_id}")
        
        try:
            # =================================================================
            # STAGE 1: RULES + ML ANALYSIS (Fast Triage)
            # =================================================================
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
                    timestamp=datetime.now()
                )
            else:
                # =================================================================
                # STAGE 2: VECTOR SEARCH + AI ANALYSIS (Deep Investigation)
                # =================================================================
                logger.info(f"Stage 2: Vector search + AI analysis for {transaction_id}")
                
                # Use existing vector search service
                similar_transactions, similarity_risk, similarity_breakdown = await self.fraud_service.find_similar_transactions(transaction_data)
                
                logger.info(f"Found {len(similar_transactions)} similar transactions, risk: {similarity_risk:.3f}")
                
                # AI analysis of patterns using Azure AI + Memorizz
                ai_analysis = await self._stage2_ai_analysis(
                    transaction_data, rule_assessment, ml_score_obj, 
                    similar_transactions, similarity_breakdown
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
                    timestamp=datetime.now()
                )
            
            # Calculate processing time
            final_decision.processing_time = (datetime.now() - start_time).total_seconds()
            
            # Store decision and learn from it (agentic learning)
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
                reasoning=f"Analysis failed: {str(e)}",
                processing_time=(datetime.now() - start_time).total_seconds(),
                timestamp=datetime.now()
            )
    
    async def _azure_ml_analysis(
        self, 
        transaction: Dict, 
        rule_assessment: Dict
    ) -> Optional[MLScore]:
        """Use Azure ML for statistical analysis"""
        try:
            if not self.ml_client:
                return None
            
            # Prepare features for ML model
            features = self._prepare_ml_features(transaction, rule_assessment)
            
            # Get ML endpoint and score
            endpoint_name = self.azure_config.get('ml_endpoint', 'transaction-risk-endpoint')
            scoring_result = await self._call_azure_ml_endpoint(endpoint_name, features)
            
            if scoring_result:
                return MLScore(
                    risk_score=scoring_result.get('risk_score', 50),
                    fraud_probability=scoring_result.get('fraud_probability', 0.5),
                    confidence=scoring_result.get('confidence', 0.7),
                    explanation=scoring_result.get('explanation', 'Azure ML analysis completed')
                )
            
        except Exception as e:
            logger.error(f"Azure ML analysis failed: {e}")
        
        return None
    
    def _prepare_ml_features(self, transaction: Dict, rule_assessment: Dict) -> Dict:
        """Prepare features for Azure ML model"""
        return {
            'amount': transaction.get('amount', 0),
            'merchant_category': transaction.get('merchant', {}).get('category', 'unknown'),
            'country': transaction.get('location', {}).get('country', 'US'),
            'hour': datetime.now().hour,  # Simplified
            'rule_score': rule_assessment.get('score', 50),
            'rule_flag_count': len(rule_assessment.get('flags', [])),
            'customer_id': transaction.get('customer_id', 'unknown')
        }
    
    async def _call_azure_ml_endpoint(self, endpoint_name: str, features: Dict) -> Optional[Dict]:
        """Call Azure ML endpoint for scoring"""
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
        """Intelligent combination of rule and ML scores"""
        if ml_score is None:
            return rule_score
        
        # Rules good for obvious violations, ML good for statistical anomalies
        # Give slightly more weight to rules for consistency
        return (rule_score * 0.6) + (ml_score * 0.4)
    
    def _build_stage1_reasoning(self, rule_assessment: Dict, ml_score: Optional[MLScore]) -> str:
        """Build reasoning for Stage 1 decisions"""
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
        transaction: Dict,
        rule_assessment: Dict,
        ml_score: Optional[MLScore],
        similar_transactions: List[Dict],
        similarity_breakdown: Dict
    ) -> str:
        """
        Stage 2 AI analysis using Azure AI Foundry + Memorizz.
        
        This is the key agentic component - sophisticated pattern analysis.
        """
        try:
            # Build rich context for AI analysis
            context = self._build_stage2_context(
                transaction, rule_assessment, ml_score, 
                similar_transactions, similarity_breakdown
            )
            
            # Try Azure AI Foundry agent first
            if self.ai_agent:
                try:
                    ai_result = await self.ai_agent.evaluate_transaction(transaction)
                    return f"Azure AI: {ai_result.get('reasoning', 'Analysis completed')}"
                except Exception as e:
                    logger.error(f"Azure AI analysis failed: {e}")
            
            # Fall back to Memorizz agent
            if self.mem_agent:
                try:
                    response = self.mem_agent.run(context)
                    return f"Memorizz AI: {response}"
                except Exception as e:
                    logger.error(f"Memorizz analysis failed: {e}")
            
            # Basic pattern analysis as last resort
            return self._basic_pattern_analysis(similar_transactions, similarity_breakdown)
            
        except Exception as e:
            logger.error(f"Stage 2 AI analysis failed: {e}")
            return f"AI analysis failed: {str(e)}"
    
    def _build_stage2_context(
        self,
        transaction: Dict,
        rule_assessment: Dict,
        ml_score: Optional[MLScore],
        similar_transactions: List[Dict],
        similarity_breakdown: Dict
    ) -> str:
        """Build comprehensive context for AI analysis"""
        
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
    
    def _basic_pattern_analysis(self, similar_transactions: List[Dict], similarity_breakdown: Dict) -> str:
        """Basic pattern analysis when AI agents unavailable"""
        total = len(similar_transactions)
        if total == 0:
            return "No similar transactions found - potentially unique pattern"
        
        # Count risk levels in similar transactions
        high_risk = similarity_breakdown.get('high_risk_matches', 0)
        medium_risk = similarity_breakdown.get('medium_risk_matches', 0)
        
        if high_risk > total * 0.5:
            return f"High risk pattern: {high_risk}/{total} similar transactions were high risk"
        elif high_risk > 0:
            return f"Mixed pattern: {high_risk} high risk, {medium_risk} medium risk out of {total} similar"
        else:
            return f"Low risk pattern: {total} similar transactions, mostly legitimate"
    
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
        """Intelligently combine all risk scores from both stages"""
        
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
        """Build comprehensive reasoning for Stage 2 decisions"""
        
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
        Store decision and learn from it - key agentic capability.
        """
        try:
            # Store in decisions collection
            decisions_collection = self.db_client.get_collection(
                db_name=self.db_name,
                collection_name=self.decisions_collection
            )
            
            decision_record = asdict(decision)
            decision_record['agent_name'] = self.agent_name
            decision_record['transaction_summary'] = {
                'amount': transaction.get('amount', 0),
                'merchant_category': transaction.get('merchant', {}).get('category', ''),
                'country': transaction.get('location', {}).get('country', '')
            }
            
            decisions_collection.insert_one(decision_record)
            
            # Learn from decision using Memorizz
            if self.mem_agent:
                memory_content = (
                    f"Transaction {decision.transaction_id}: "
                    f"${transaction.get('amount', 0)} {transaction.get('merchant', {}).get('category', 'unknown')} "
                    f"transaction. Stage {decision.stage_completed} analysis resulted in {decision.decision} "
                    f"with {decision.confidence:.0%} confidence. "
                    f"Key factors: rules={decision.rule_score:.0f}, "
                    f"{'ML=' + str(int(decision.ml_score)) + ', ' if decision.ml_score else ''}"
                    f"similar_count={decision.similar_transactions_count}"
                )
                
                self.mem_agent.store_memory(
                    content=memory_content,
                    memory_type="decision",
                    metadata={
                        'transaction_id': decision.transaction_id,
                        'decision': decision.decision,
                        'stage': decision.stage_completed,
                        'confidence': decision.confidence,
                        'timestamp': decision.timestamp.isoformat()
                    }
                )
                
                self.mem_agent.save()
            
            # Adjust thresholds based on performance (simple learning)
            await self._adjust_thresholds(decision)
            
        except Exception as e:
            logger.error(f"Failed to store decision and learn: {e}")
    
    async def _adjust_thresholds(self, decision: AgentDecision):
        """Simple threshold adjustment based on decision patterns"""
        try:
            # This could implement more sophisticated reinforcement learning
            # For now, just log for manual analysis
            if decision.stage_completed == 1 and decision.confidence < 0.7:
                logger.debug(f"Low confidence Stage 1 decision: {decision.decision} with score {decision.rule_score}")
            
        except Exception as e:
            logger.error(f"Threshold adjustment failed: {e}")
    
    async def get_performance_metrics(self) -> Dict[str, Any]:
        """Get agent performance statistics"""
        try:
            decisions_collection = self.db_client.get_collection(
                db_name=self.db_name,
                collection_name=self.decisions_collection
            )
            
            # Get recent decisions
            recent_decisions = list(decisions_collection.find({
                'agent_name': self.agent_name,
                'timestamp': {'$gte': datetime.now() - timedelta(days=7)}
            }))
            
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
            
            return {
                'agent_name': self.agent_name,
                'period_days': 7,
                'total_decisions': total,
                'stage1_decisions': stage1_decisions,
                'stage2_decisions': stage2_decisions,
                'efficiency_ratio': f"{stage1_decisions/total:.1%}",  # Higher = more efficient
                'decision_breakdown': decision_counts,
                'avg_confidence': confidence_sum / total,
                'avg_processing_time_ms': (processing_time_sum / total) * 1000,
                'current_thresholds': self.stage1_thresholds
            }
            
        except Exception as e:
            logger.error(f"Failed to get metrics: {e}")
            return {'error': str(e)}

# Usage Example
async def main():
    """Example usage of the smart two-stage agent"""
    
    # Configuration
    azure_config = {
        'subscription_id': os.getenv('AZURE_SUBSCRIPTION_ID', ''),
        'resource_group': os.getenv('AZURE_RESOURCE_GROUP', ''),
        'workspace_name': os.getenv('AZURE_ML_WORKSPACE', ''),
        'ml_endpoint': os.getenv('AZURE_ML_ENDPOINT', 'transaction-risk-endpoint'),
        'openai_endpoint': os.getenv('AZURE_OPENAI_ENDPOINT', ''),
        'openai_api_key': os.getenv('AZURE_OPENAI_API_KEY', ''),
        'embedding_deployment': os.getenv('AZURE_EMBEDDING_DEPLOYMENT', 'text-embedding-ada-002')
    }
    
    # Initialize with existing MongoDB connection
    db_client = MongoDBAccess(os.getenv("MONGODB_URI"))
    agent = SmartTwoStageAgent(db_client, "smart_agent_v1", azure_config)
    
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
    
    print("🤖 Smart Two-Stage Agent Analysis")
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
    
    # Get performance metrics
    print(f"\n📊 Agent Performance Metrics")
    print("=" * 60)
    metrics = await agent.get_performance_metrics()
    print(json.dumps(metrics, indent=2, default=str))

if __name__ == "__main__":
    asyncio.run(main())