"""
Transaction Analysis Service - Clean Stage 1/2 Separation
Orchestrates fraud detection workflow with clear separation of concerns
"""

from typing import Dict, Any, Tuple, Optional
from datetime import datetime
import asyncio

from services.fraud_detection import FraudDetectionService
from services.agent_service import AgentService
from logging_setup import get_logger

logger = get_logger(__name__)


class TransactionAnalysisService:
    """
    Orchestrates transaction analysis with clean Stage 1/2 separation
    
    Stage 1: Rules + ML (traditional fraud detection)
    Stage 2: AI Analysis (only when needed)
    """
    
    def __init__(self, db_client):
        self.db_client = db_client
        self.fraud_service = None
        self.agent_service = None
        
        # Stage 1 thresholds
        self.STAGE1_AUTO_APPROVE_THRESHOLD = 25.0  # < 25: auto approve
        self.STAGE1_AUTO_BLOCK_THRESHOLD = 85.0    # > 85: auto block
        # 25-85: proceed to Stage 2 AI analysis
        
    async def initialize(self):
        """Initialize fraud detection and agent services"""
        try:
            # Initialize Stage 1 fraud detection service
            import os
            self.fraud_service = FraudDetectionService(
                self.db_client,
                db_name=self.db_client.db_name if hasattr(self.db_client, 'db_name') 
                else os.getenv("DB_NAME", "threatsight360")
            )
            
            # Initialize Stage 2 agent service
            self.agent_service = AgentService()
            await self.agent_service.initialize()
            
            logger.info("✅ TransactionAnalysisService initialized")
            return True
            
        except Exception as e:
            logger.error(f"❌ Failed to initialize TransactionAnalysisService: {e}")
            return False
    
    async def analyze_transaction(self, transaction_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Analyze transaction with clean Stage 1/2 separation
        
        Returns:
            Stage 1 results immediately, with optional Stage 2 thread_id
        """
        transaction_id = transaction_data.get('transaction_id', 'unknown')
        start_time = datetime.now()
        
        logger.info(f"🔍 Transaction Analysis: {transaction_id}")
        
        # ============================================================
        # STAGE 1: RULES + ML ANALYSIS (Traditional Fraud Detection)
        # ============================================================
        stage1_result = await self._run_stage1_analysis(transaction_data)
        
        # Create base response with Stage 1 results
        response = {
            "transaction_id": transaction_id,
            "stage_completed": 1,
            "processing_time_ms": (datetime.now() - start_time).total_seconds() * 1000,
            "stage1_result": {
                "rule_score": stage1_result["rule_score"],
                "ml_score": stage1_result["ml_score"], 
                "combined_score": stage1_result["combined_score"],
                "rule_flags": stage1_result["rule_flags"],
                "needs_stage2": stage1_result["needs_stage2"],
                "processing_time_ms": stage1_result["processing_time_ms"]
            }
        }
        
        # Determine final decision based on Stage 1
        if not stage1_result["needs_stage2"]:
            # ============================================================
            # STAGE 1 FINAL DECISION (Auto-approve/block)
            # ============================================================
            decision_result = self._make_stage1_decision(stage1_result["combined_score"])
            
            response.update({
                "decision": decision_result["decision"],
                "risk_level": decision_result["risk_level"], 
                "risk_score": stage1_result["combined_score"],
                "confidence": decision_result["confidence"],
                "reasoning": f"Stage 1 analysis: {decision_result['reasoning']}",
                "thread_id": None  # No agent needed
            })
            
            logger.info(f"✅ Stage 1 final decision: {decision_result['decision']} (Score: {stage1_result['combined_score']:.1f})")
            
        else:
            # ============================================================
            # STAGE 2 NEEDED - Trigger AI Analysis
            # ============================================================
            response.update({
                "decision": "ANALYZING",  # Interim status
                "risk_level": self._calculate_risk_level(stage1_result["combined_score"]),
                "risk_score": stage1_result["combined_score"],
                "confidence": 0.5,  # Low confidence until Stage 2 complete
                "reasoning": "Stage 1 complete - proceeding to AI analysis",
                "thread_id": None  # Will be set below
            })
            
            # Create thread and trigger Stage 2 asynchronously
            thread_id = await self._trigger_stage2_analysis(transaction_data, stage1_result)
            response["thread_id"] = thread_id
            
            logger.info(f"✅ Stage 1 complete, Stage 2 triggered: {thread_id} (Score: {stage1_result['combined_score']:.1f})")
        
        return response
    
    async def _run_stage1_analysis(self, transaction_data: Dict[str, Any]) -> Dict[str, Any]:
        """Run pure Stage 1 fraud detection (rules + ML)"""
        start_time = datetime.now()
        
        try:
            # ============================================================
            # RULES ANALYSIS
            # ============================================================
            if asyncio.iscoroutinefunction(self.fraud_service.evaluate_transaction):
                rule_assessment = await self.fraud_service.evaluate_transaction(transaction_data)
            else:
                rule_assessment = await asyncio.get_event_loop().run_in_executor(
                    None, self.fraud_service.evaluate_transaction, transaction_data
                )
            
            if rule_assessment is None:
                rule_assessment = {'score': 50.0, 'flags': []}
                
            rule_score = rule_assessment.get('score', 50.0) or 50.0
            rule_flags = rule_assessment.get('flags', []) or []
            
            # ============================================================
            # MOCK ML ANALYSIS (Demo Mode)
            # ============================================================
            ml_score = await self._run_mock_ml_analysis(transaction_data, rule_assessment)
            
            # ============================================================ 
            # COMBINE SCORES
            # ============================================================
            if ml_score is not None:
                combined_score = (rule_score * 0.6) + (ml_score * 0.4)
            else:
                combined_score = rule_score
            
            # ============================================================
            # STAGE 2 DECISION LOGIC
            # ============================================================
            needs_stage2 = self._should_proceed_to_stage2(combined_score, rule_flags)
            
            processing_time = (datetime.now() - start_time).total_seconds() * 1000
            
            return {
                "rule_score": rule_score,
                "ml_score": ml_score,
                "combined_score": combined_score,
                "rule_flags": rule_flags,
                "needs_stage2": needs_stage2,
                "processing_time_ms": processing_time
            }
            
        except Exception as e:
            logger.error(f"❌ Stage 1 analysis failed: {e}")
            # Return safe defaults
            return {
                "rule_score": 85.0,
                "ml_score": 85.0,
                "combined_score": 85.0,
                "rule_flags": ["system_error"],
                "needs_stage2": False,  # Block immediately on error
                "processing_time_ms": (datetime.now() - start_time).total_seconds() * 1000
            }
    
    async def _run_mock_ml_analysis(self, transaction_data: Dict[str, Any], rule_assessment: Dict[str, Any]) -> Optional[float]:
        """Mock ML analysis (same logic as original Stage1Analyzer)"""
        try:
            base_score = rule_assessment.get('score', 50.0) or 50.0
            amount = transaction_data.get('amount', 0)
            category = transaction_data.get('merchant', {}).get('category', 'unknown')
            
            # Amount-based adjustment
            amount_adjustment = 0
            if amount > 10000:
                amount_adjustment = 15
            elif amount < 1:
                amount_adjustment = 10
            elif amount > 5000:
                amount_adjustment = 8
            elif 50 <= amount <= 200:
                amount_adjustment = -5
            
            # Category-based adjustment
            category_risk_map = {
                'cash_advance': 25, 'gambling': 20, 'cryptocurrency': 15,
                'money_transfer': 12, 'atm': 8, 'gas_station': -3,
                'grocery': -5, 'restaurant': -5, 'retail': -3, 'pharmacy': -2
            }
            category_adjustment = category_risk_map.get(category.lower(), 0)
            
            # Time and location adjustments
            hour = datetime.now().hour
            time_adjustment = 5 if 1 <= hour <= 5 else -2 if 9 <= hour <= 17 else 0
            
            location_country = transaction_data.get('location', {}).get('country', 'US')
            location_adjustment = 8 if location_country not in ['US', 'CA', 'UK', 'DE', 'FR'] else 0
            
            # Calculate ML score
            ml_score = base_score + amount_adjustment + category_adjustment + time_adjustment + location_adjustment
            
            # Add randomness and clamp
            import random
            ml_score += random.uniform(-2, 2)
            ml_score = max(0, min(100, ml_score))
            
            return ml_score
            
        except Exception as e:
            logger.error(f"Mock ML analysis failed: {e}")
            return None
    
    def _should_proceed_to_stage2(self, score: float, flags: list) -> bool:
        """Determine if Stage 2 AI analysis is needed"""
        # Critical flags warrant immediate action (no Stage 2)
        critical_flags = {"structuring", "money_laundering", "terrorist_financing", "sanctions_hit"}
        if any(flag in critical_flags for flag in flags):
            return False
        
        # Score-based decision
        if score < self.STAGE1_AUTO_APPROVE_THRESHOLD or score > self.STAGE1_AUTO_BLOCK_THRESHOLD:
            return False
        
        return True  # Edge case - needs AI analysis
    
    def _make_stage1_decision(self, score: float) -> Dict[str, Any]:
        """Make Stage 1 decision (approve/block only)"""
        if score < self.STAGE1_AUTO_APPROVE_THRESHOLD:
            return {
                "decision": "APPROVE",
                "risk_level": self._calculate_risk_level(score),
                "confidence": 0.85,
                "reasoning": f"Low risk score ({score:.1f}) - automatic approval"
            }
        elif score > self.STAGE1_AUTO_BLOCK_THRESHOLD:
            return {
                "decision": "BLOCK",
                "risk_level": self._calculate_risk_level(score), 
                "confidence": 0.9,
                "reasoning": f"High risk score ({score:.1f}) - automatic block"
            }
        else:
            # This shouldn't happen if thresholds are correct
            return {
                "decision": "INVESTIGATE",
                "risk_level": self._calculate_risk_level(score),
                "confidence": 0.6,
                "reasoning": f"Score ({score:.1f}) requires investigation"
            }
    
    def _calculate_risk_level(self, risk_score: float) -> str:
        """Calculate risk level from score"""
        if risk_score >= 80:
            return "CRITICAL"
        elif risk_score >= 60:
            return "HIGH"
        elif risk_score >= 40:
            return "MEDIUM"
        else:
            return "LOW"
    
    async def _trigger_stage2_analysis(self, transaction_data: Dict[str, Any], stage1_result: Dict[str, Any]) -> str:
        """Trigger Stage 2 AI analysis and return thread_id"""
        try:
            # Use existing agent service for Stage 2
            # But pass it the Stage 1 results to avoid re-computation
            enhanced_transaction_data = transaction_data.copy()
            enhanced_transaction_data["stage1_result"] = stage1_result
            
            # Use agent service to create proper Azure AI Foundry thread
            thread_id = await self.agent_service.agent._get_or_create_thread(
                transaction_data.get('transaction_id'),
                transaction_data.get('customer_id')
            )
            
            # Trigger Stage 2 processing in background
            asyncio.create_task(self._run_stage2_async(enhanced_transaction_data, thread_id))
            
            return thread_id
            
        except Exception as e:
            logger.error(f"Failed to trigger Stage 2: {e}")
            raise
    
    async def _run_stage2_async(self, transaction_data: Dict[str, Any], thread_id: str):
        """Run Stage 2 AI analysis asynchronously"""
        try:
            logger.info(f"🤖 Starting Stage 2 AI analysis: {thread_id}")
            
            # For now, use existing agent service
            # TODO: This should be refactored to use only Stage 2 logic
            result = await self.agent_service.analyze_transaction(transaction_data)
            
            logger.info(f"✅ Stage 2 complete: {thread_id}")
            
        except Exception as e:
            logger.error(f"❌ Stage 2 async processing failed: {e}")


# Global service instance
transaction_analysis_service = None

async def get_transaction_analysis_service():
    """Get initialized transaction analysis service"""
    global transaction_analysis_service
    
    if transaction_analysis_service is None:
        from db.mongo_db import MongoDBAccess
        import os
        
        db_client = MongoDBAccess(os.getenv('MONGODB_URI'))
        transaction_analysis_service = TransactionAnalysisService(db_client)
        await transaction_analysis_service.initialize()
    
    return transaction_analysis_service