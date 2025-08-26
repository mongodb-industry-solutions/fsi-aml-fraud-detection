"""
Stage 1 Analyzer: Rules + Basic ML Analysis
Fast triage for the majority of transactions
"""

import asyncio
import logging
from datetime import datetime
from typing import Dict, Any, Optional

from .models import (
    TransactionInput, Stage1Result, AgentConfig, 
    Stage1Error
)

logger = logging.getLogger(__name__)


class Stage1Analyzer:
    """
    Stage 1: Rules-based analysis with basic ML scoring
    
    Goal: Fast decisions for 70-80% of transactions
    - Clear approvals (low risk, normal patterns)
    - Clear blocks (high risk, obvious fraud patterns)
    - Edge cases proceed to Stage 2
    """
    
    def __init__(self, db_client, config: AgentConfig):
        self.db_client = db_client
        self.config = config
        self.fraud_service = None
        
        logger.info("Initializing Stage1Analyzer")
    
    async def initialize(self):
        """Initialize the Stage 1 analyzer"""
        try:
            # Import and initialize existing fraud detection service
            from services.fraud_detection import FraudDetectionService
            
            self.fraud_service = FraudDetectionService(
                self.db_client, 
                db_name=self.db_client.db_name if hasattr(self.db_client, 'db_name') else "fsi-threatsight360"
            )
            
            logger.info("✅ Stage 1 analyzer initialized")
            
        except Exception as e:
            logger.error(f"Failed to initialize Stage 1 analyzer: {e}")
            raise Stage1Error(f"Stage 1 initialization failed: {str(e)}")
    
    async def analyze(
        self, 
        transaction: TransactionInput, 
        transaction_data: Dict[str, Any]
    ) -> Stage1Result:
        """
        Perform Stage 1 analysis: rules + basic ML
        
        Args:
            transaction: Standardized transaction input
            transaction_data: Original transaction data for fraud service
            
        Returns:
            Stage1Result with scoring and routing decision
        """
        start_time = datetime.now()
        
        try:
            logger.debug(f"Starting Stage 1 analysis for {transaction.transaction_id}")
            
            # ============================================================
            # RULES ANALYSIS using existing fraud detection service
            # ============================================================
            if asyncio.iscoroutinefunction(self.fraud_service.evaluate_transaction):
                rule_assessment = await self.fraud_service.evaluate_transaction(transaction_data)
            else:
                # If not async, run in thread pool
                rule_assessment = await asyncio.get_event_loop().run_in_executor(
                    None, self.fraud_service.evaluate_transaction, transaction_data
                )
            
            rule_score = rule_assessment.get('score', 50.0)
            rule_flags = rule_assessment.get('flags', [])
            
            logger.debug(f"Rules analysis: score={rule_score}, flags={rule_flags}")
            
            # ============================================================
            # BASIC ML ANALYSIS (Demo Mode)
            # ============================================================
            basic_ml_score = None
            if self.config.mock_ml_scoring:
                basic_ml_score = await self._mock_ml_analysis(transaction, rule_assessment)
            # In production, this would call Azure ML endpoint
            # else:
            #     basic_ml_score = await self._azure_ml_analysis(transaction, rule_assessment)
            
            logger.debug(f"Basic ML analysis: score={basic_ml_score}")
            
            # ============================================================
            # STAGE 1 DECISION LOGIC
            # ============================================================
            result = Stage1Result(
                rule_score=rule_score,
                rule_flags=rule_flags,
                basic_ml_score=basic_ml_score,
                processing_time_ms=(datetime.now() - start_time).total_seconds() * 1000
            )
            
            # Determine if Stage 2 is needed
            result.needs_stage2 = self._should_proceed_to_stage2(result)
            
            logger.debug(
                f"Stage 1 complete: combined_score={result.combined_score:.1f}, "
                f"needs_stage2={result.needs_stage2}"
            )
            
            return result
            
        except Exception as e:
            logger.error(f"Stage 1 analysis failed for {transaction.transaction_id}: {e}")
            raise Stage1Error(f"Stage 1 analysis failed: {str(e)}")
    
    def _should_proceed_to_stage2(self, result: Stage1Result) -> bool:
        """
        Determine if transaction needs Stage 2 analysis
        
        Logic:
        - Score < 25: Auto approve (no Stage 2)
        - Score > 85: Auto block (no Stage 2)
        - Score 25-85: Proceed to Stage 2
        - Critical flags: May override and skip Stage 2
        """
        score = result.combined_score
        flags = result.rule_flags
        
        # Critical flags that warrant immediate action
        critical_flags = {
            "structuring", 
            "money_laundering", 
            "terrorist_financing",
            "sanctions_hit"
        }
        
        # If we have critical flags, don't proceed to Stage 2 - take immediate action
        if any(flag in critical_flags for flag in flags):
            logger.debug(f"Critical flags detected {flags} - skipping Stage 2")
            return False
        
        # Clear cases - no Stage 2 needed
        if score < self.config.stage1_auto_approve_threshold:
            logger.debug(f"Score {score} below auto-approve threshold - no Stage 2")
            return False
        
        if score > self.config.stage1_auto_block_threshold:
            logger.debug(f"Score {score} above auto-block threshold - no Stage 2") 
            return False
        
        # Edge case - proceed to Stage 2
        logger.debug(f"Score {score} in edge case range - proceeding to Stage 2")
        return True
    
    async def _mock_ml_analysis(
        self, 
        transaction: TransactionInput, 
        rule_assessment: Dict[str, Any]
    ) -> float:
        """
        Mock ML analysis for demo purposes
        
        Simulates basic statistical analysis based on:
        - Transaction amount patterns
        - Merchant category risk
        - Time of day patterns
        - Customer behavior (if available)
        """
        try:
            base_score = rule_assessment.get('score', 50.0)
            amount = transaction.amount
            category = transaction.merchant_category
            
            # Amount-based risk adjustment
            amount_adjustment = 0
            if amount > 10000:
                amount_adjustment = 15  # High amounts increase risk
            elif amount < 1:
                amount_adjustment = 10  # Very low amounts might be test transactions
            elif amount > 5000:
                amount_adjustment = 8   # Moderate high amounts
            elif 50 <= amount <= 200:
                amount_adjustment = -5  # Normal purchase range
            
            # Category-based risk adjustment
            category_risk_map = {
                'cash_advance': 25,
                'gambling': 20,
                'cryptocurrency': 15,
                'money_transfer': 12,
                'atm': 8,
                'gas_station': -3,
                'grocery': -5,
                'restaurant': -5,
                'retail': -3,
                'pharmacy': -2
            }
            
            category_adjustment = category_risk_map.get(category.lower(), 0)
            
            # Time-based patterns (simplified)
            hour = datetime.now().hour
            time_adjustment = 0
            if 1 <= hour <= 5:  # Late night transactions
                time_adjustment = 5
            elif 9 <= hour <= 17:  # Business hours
                time_adjustment = -2
            
            # Location risk (simplified)
            location_adjustment = 0
            if transaction.location_country not in ['US', 'CA', 'UK', 'DE', 'FR']:
                location_adjustment = 8
            
            # Calculate final ML score
            ml_score = base_score + amount_adjustment + category_adjustment + time_adjustment + location_adjustment
            
            # Add some randomness to simulate ML uncertainty
            import random
            noise = random.uniform(-3, 3)
            ml_score += noise
            
            # Clamp to 0-100 range
            ml_score = max(0, min(100, ml_score))
            
            logger.debug(
                f"Mock ML: base={base_score}, amount_adj={amount_adjustment}, "
                f"category_adj={category_adjustment}, final={ml_score:.1f}"
            )
            
            return ml_score
            
        except Exception as e:
            logger.warning(f"Mock ML analysis failed: {e}")
            return rule_assessment.get('score', 50.0)  # Fall back to rule score
    
    async def _azure_ml_analysis(
        self, 
        transaction: TransactionInput, 
        rule_assessment: Dict[str, Any]
    ) -> Optional[float]:
        """
        Real Azure ML analysis (not implemented in demo)
        
        This would:
        1. Prepare features for ML model
        2. Call Azure ML endpoint
        3. Return risk score
        """
        # Placeholder for real ML integration
        logger.debug("Azure ML analysis not implemented in demo mode")
        return None
    
    async def cleanup(self):
        """Clean up Stage 1 resources"""
        logger.debug("Stage 1 analyzer cleanup complete")