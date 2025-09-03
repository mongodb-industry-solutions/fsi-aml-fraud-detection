"""
MongoDB Atlas Vector Store Integration - REFACTORED to reuse existing infrastructure

This is now a simple adapter that integrates with the existing FraudDetectionService
instead of duplicating MongoDB connection and collection management code.
"""

# IMPORTANT: Import and configure logging FIRST
from logging_setup import setup_logging, get_logger
setup_logging()  # Configure logging

import logging
from typing import Dict, Any, List, Optional
from datetime import datetime

logger = get_logger(__name__)


class MongoDBAtlasIntegration:
    """
    Simplified MongoDB Atlas integration adapter.
    
    REFACTORED APPROACH:
    - Delegates to existing FraudDetectionService for actual operations
    - Maintains API compatibility for existing azure_foundry code
    - Eliminates code duplication and connection management
    """
    
    def __init__(self, fraud_service):
        """
        Initialize with existing FraudDetectionService.
        
        Args:
            fraud_service: Existing FraudDetectionService instance with MongoDB access
        """
        self.fraud_service = fraud_service
        self.db_name = fraud_service.db_name
        
        # Use existing service's collection names
        self.decision_history_collection = fraud_service.agent_decisions_collection
        self.learning_patterns_collection = fraud_service.learning_patterns_collection
        
        logger.info("✅ MongoDB Atlas vector store adapter initialized (using existing infrastructure)")
    
    async def setup_vector_indexes(self):
        """
        Setup vector indexes - delegates to existing infrastructure.
        
        Note: Actual index creation should be done via Atlas UI for production.
        This method exists for API compatibility.
        """
        logger.info("Vector indexes setup (delegating to existing infrastructure)")
        # The existing FraudDetectionService already handles vector search
        # No additional setup needed - indexes managed via Atlas UI
        return True
    
    async def store_agent_decision(
        self,
        agent_decision: Dict[str, Any],
        transaction_data: Dict[str, Any],
        context: Dict[str, Any] = None
    ):
        """
        Store agent decision - delegates to existing FraudDetectionService.
        """
        return await self.fraud_service.store_agent_decision(
            agent_decision, transaction_data, context
        )
    
    async def retrieve_similar_decisions(
        self,
        current_transaction: Dict[str, Any],
        similarity_threshold: float = 0.7,
        limit: int = 5
    ) -> List[Dict[str, Any]]:
        """
        Retrieve similar decisions - delegates to existing FraudDetectionService.
        """
        return await self.fraud_service.retrieve_similar_agent_decisions(
            current_transaction, similarity_threshold, limit
        )
    
    async def store_learning_pattern(
        self,
        pattern_type: str,
        pattern_data: Dict[str, Any],
        effectiveness_score: float
    ):
        """
        Store learning pattern - delegates to existing FraudDetectionService.
        """
        return await self.fraud_service.store_learning_pattern(
            pattern_type, pattern_data, effectiveness_score
        )
    
    # Helper methods delegated to existing service
    def _build_decision_context(self, agent_decision: Dict[str, Any], transaction_data: Dict[str, Any]) -> str:
        """Delegates to existing FraudDetectionService."""
        return self.fraud_service._build_decision_context(agent_decision, transaction_data)
    
    def _build_search_context(self, transaction_data: Dict[str, Any]) -> str:
        """Build search context - simplified version."""
        return self._build_decision_context({"score": 50}, transaction_data)


def create_mongodb_vector_store(fraud_service):
    """
    Create MongoDB Atlas vector store using existing FraudDetectionService.
    
    REFACTORED: Now takes FraudDetectionService instead of MongoDBAccess
    to eliminate code duplication and reuse existing infrastructure.
    
    Args:
        fraud_service: Existing FraudDetectionService instance
        
    Returns:
        MongoDBAtlasIntegration: Adapter that delegates to existing service
    """
    return MongoDBAtlasIntegration(fraud_service)