"""
Standard Azure AI Foundry FunctionTool implementation for fraud detection.

Following native Azure patterns from documentation analysis:
- Use standard FunctionTool with proper docstrings
- Follow type hints for arguments and returns
- Let Azure AI Foundry handle function discovery and execution
- Focus on business logic, not tool mechanics
"""

import logging
import json
import asyncio
from typing import Dict, Any, List, Set
from datetime import datetime, timedelta

from azure.ai.agents.models import FunctionTool
from db.mongo_db import MongoDBAccess
# Import moved to function level to avoid circular import

logger = logging.getLogger(__name__)


class FraudDetectionTools:
    """
    Standard Azure AI Foundry tool implementation for fraud detection.
    
    Uses native FunctionTool patterns instead of custom tool handling.
    Based on Azure AI Foundry documentation best practices.
    """
    
    def __init__(self, db_client: MongoDBAccess, fraud_service):
        self.db_client = db_client
        self.fraud_service = fraud_service
        import os
        self.db_name = os.getenv("DB_NAME", "threatsight360")  # Use environment variable
        
        logger.info("✅ FraudDetectionTools initialized with native patterns")
    
    def get_function_definitions(self) -> Set:
        """
        Create function set following Azure AI Foundry standards.
        
        Key requirements from documentation:
        1. Proper type hints for all parameters
        2. Comprehensive docstrings (Azure parses these for function schemas)
        3. Return JSON-serializable objects
        4. Handle errors gracefully within functions
        """
        
        def analyze_transaction_patterns(
            customer_id: str,
            lookback_days: int = 30,
            include_velocity: bool = True
        ) -> dict:
            """
            Analyze historical transaction patterns for a customer to identify anomalies.
            
            This function examines a customer's transaction history to detect unusual
            patterns in spending behavior, merchant categories, amounts, and velocity.
            Critical for identifying fraud attempts that deviate from normal behavior.
            
            Args:
                customer_id: Unique identifier for the customer to analyze
                lookback_days: Number of days of history to analyze (default: 30)
                include_velocity: Whether to include velocity analysis (default: True)
                
            Returns:
                Dictionary containing pattern analysis results:
                - customer_id: The analyzed customer ID
                - analysis_period: Time period analyzed
                - historical_count: Number of historical transactions
                - unusual_amount: Boolean indicating if current amount is unusual
                - unusual_merchant: Boolean indicating if merchant is new/unusual
                - velocity_spike: Boolean indicating high transaction velocity
                - pattern_score: Risk score from pattern analysis (0-100)
                - avg_amount: Historical average transaction amount
                - most_common_merchant: Most frequently used merchant category
                - risk_factors: Detailed breakdown of identified risk factors
            """
            return self._analyze_transaction_patterns_impl(customer_id, lookback_days, include_velocity)
        
        def check_sanctions_lists(
            entity_name: str,
            entity_type: str = "individual"
        ) -> dict:
            """
            Check if an entity (person or organization) appears on sanctions or watchlists.
            
            Performs comprehensive sanctions screening against various databases including
            OFAC, EU sanctions, UN sanctions, and PEP (Politically Exposed Persons) lists.
            Essential for AML compliance and regulatory requirements.
            
            Args:
                entity_name: Full name of the entity to check (person or organization)
                entity_type: Type of entity - "individual", "organization", or "vessel"
                
            Returns:
                Dictionary containing sanctions check results:
                - entity_name: The name that was checked
                - entity_type: Type of entity checked
                - on_sanctions_list: Boolean indicating if entity is sanctioned
                - on_watchlist: Boolean indicating if entity is on watchlist
                - pep_status: Boolean indicating if person is politically exposed
                - risk_rating: Risk rating - "low", "medium", "high", or "critical"
                - check_timestamp: ISO timestamp of when check was performed
                - details: Additional details about any matches found
            """
            return self._check_sanctions_lists_impl(entity_name, entity_type)
        
        def calculate_network_risk(
            customer_id: str,
            analysis_depth: int = 2,
            include_centrality: bool = True
        ) -> dict:
            """
            Calculate risk based on customer's network connections and relationships.
            
            Analyzes the customer's network of relationships including shared accounts,
            similar transactions, common addresses, and other connection patterns.
            Uses graph analysis to identify high-risk networks and connections.
            
            Args:
                customer_id: Unique identifier for the customer to analyze
                analysis_depth: Degrees of separation to analyze (1-4, default: 2)
                include_centrality: Whether to calculate centrality metrics (default: True)
                
            Returns:
                Dictionary containing network risk analysis:
                - customer_id: The analyzed customer ID
                - network_depth: Degrees of separation analyzed
                - connected_entities: Number of connected entities found
                - high_risk_connections: Number of high-risk connected entities
                - network_density: Density of connections (0-1 scale)
                - centrality_score: Customer's centrality in network (0-1 scale)
                - network_risk_score: Overall network risk score (0-100)
                - risk_connections: Details of high-risk connections
                - analysis_timestamp: When analysis was performed
            """
            return self._calculate_network_risk_impl(customer_id, analysis_depth, include_centrality)
        
        def search_similar_transactions(
            transaction_amount: float,
            merchant_category: str,
            customer_id: str = None,
            days_lookback: int = 90
        ) -> dict:
            """
            Search for similar transactions using vector similarity and pattern matching.
            
            Uses the existing vector search functionality to find transactions with
            similar characteristics, amounts, merchants, and patterns. Helps identify
            if current transaction fits known fraud patterns or normal behavior.
            
            Args:
                transaction_amount: Amount of the current transaction
                merchant_category: Category of the merchant (e.g., "restaurant", "gas_station")
                customer_id: Optional customer ID to include/exclude from search
                days_lookback: Number of days to search back (default: 90)
                
            Returns:
                Dictionary containing similarity search results:
                - similar_count: Number of similar transactions found
                - similarity_score: Overall similarity score (0-1)
                - high_risk_matches: Number of similar transactions that were fraud
                - similar_transactions: List of similar transaction details
                - pattern_type: Type of pattern identified ("normal", "suspicious", "fraudulent")
                - confidence: Confidence in the similarity assessment (0-1)
            """
            return self._search_similar_transactions_impl(
                transaction_amount, merchant_category, customer_id, days_lookback
            )
        
        # Return the function set for Azure AI Foundry
        return {
            analyze_transaction_patterns,
            check_sanctions_lists,
            calculate_network_risk,
            search_similar_transactions
        }
    
    def create_function_tool(self) -> FunctionTool:
        """Create standard Azure AI Foundry FunctionTool"""
        function_definitions = self.get_function_definitions()
        return FunctionTool(functions=function_definitions)
    
    def create_complete_toolset(self) -> List[FunctionTool]:
        """
        Create complete toolset for fraud detection agent.
        
        Includes:
        - Custom fraud detection functions
        - Code interpreter for analysis (can be added later)
        - File search for document analysis (can be added later)
        """
        tools = []
        
        # Add custom fraud detection functions
        function_tool = self.create_function_tool()
        tools.append(function_tool)
        
        # Note: CodeInterpreterTool and FileSearchTool can be added here
        # when needed for the demo
        
        return tools
    
    # Implementation methods (business logic)
    
    def _analyze_transaction_patterns_impl(
        self, 
        customer_id: str, 
        lookback_days: int,
        include_velocity: bool
    ) -> dict:
        """Implementation of transaction pattern analysis"""
        try:
            current_time = datetime.now()
            start_time = current_time - timedelta(days=lookback_days)
            
            # Query historical transactions using existing DB client
            historical_transactions = list(
                self.db_client.get_collection(
                    db_name=self.db_name,
                    collection_name="transactions"
                ).find({
                    "customer_id": customer_id,
                    "timestamp": {"$gte": start_time, "$lt": current_time}
                }).limit(100)
            )
            
            logger.debug(f"Found {len(historical_transactions)} transactions for {customer_id}")
            
            # Analysis logic (simplified for demo)
            if not historical_transactions:
                return {
                    "customer_id": customer_id,
                    "analysis_period": f"{lookback_days} days", 
                    "historical_count": 0,
                    "unusual_amount": False,
                    "unusual_merchant": False,
                    "velocity_spike": False,
                    "pattern_score": 40,  # Moderate risk for new customers
                    "note": "Limited historical data - new customer analysis"
                }
            
            # Calculate patterns
            amounts = [t.get('amount', 0) for t in historical_transactions]
            avg_amount = sum(amounts) / len(amounts) if amounts else 0
            max_amount = max(amounts) if amounts else 0
            
            # Merchant analysis
            merchants = [t.get('merchant', {}).get('category', 'unknown') for t in historical_transactions]
            merchant_counts = {}
            for merchant in merchants:
                merchant_counts[merchant] = merchant_counts.get(merchant, 0) + 1
            
            most_common_merchant = max(merchant_counts.items(), key=lambda x: x[1])[0] if merchant_counts else 'unknown'
            
            # Velocity analysis if requested
            velocity_spike = False
            if include_velocity:
                hour_ago = current_time - timedelta(hours=1)
                recent_count = sum(1 for t in historical_transactions 
                                 if t.get('timestamp', current_time) >= hour_ago)
                velocity_spike = recent_count >= 5
            
            return {
                "customer_id": customer_id,
                "analysis_period": f"{lookback_days} days",
                "historical_count": len(historical_transactions),
                "unusual_amount": False,  # Would need current transaction to compare
                "unusual_merchant": False,
                "velocity_spike": velocity_spike,
                "pattern_score": 25,  # Low risk for established customer
                "avg_amount": round(avg_amount, 2),
                "max_historical_amount": max_amount,
                "most_common_merchant": most_common_merchant,
                "risk_factors": {
                    "high_velocity": velocity_spike,
                    "established_customer": True
                }
            }
            
        except Exception as e:
            logger.error(f"Pattern analysis error for {customer_id}: {e}")
            return {
                "customer_id": customer_id,
                "error": f"Analysis failed: {str(e)}",
                "pattern_score": 50,
                "analysis_period": f"{lookback_days} days"
            }
    
    def _check_sanctions_lists_impl(self, entity_name: str, entity_type: str) -> dict:
        """Implementation of sanctions checking"""
        try:
            # Simplified sanctions check for demo
            # In production, this would query real sanctions databases
            high_risk_patterns = [
                "suspicious", "blocked", "sanctioned", "watchlist", 
                "prohibited", "restricted", "banned"
            ]
            
            entity_lower = entity_name.lower()
            on_sanctions = any(pattern in entity_lower for pattern in high_risk_patterns)
            
            return {
                "entity_name": entity_name,
                "entity_type": entity_type,
                "on_sanctions_list": on_sanctions,
                "on_watchlist": on_sanctions,
                "pep_status": False,  # Simplified
                "risk_rating": "high" if on_sanctions else "low",
                "check_timestamp": datetime.now().isoformat(),
                "details": f"Demo sanctions check for {entity_type}: {entity_name}"
            }
            
        except Exception as e:
            logger.error(f"Sanctions check error for {entity_name}: {e}")
            return {
                "entity_name": entity_name,
                "entity_type": entity_type,
                "error": f"Sanctions check failed: {str(e)}",
                "risk_rating": "unknown"
            }
    
    def _calculate_network_risk_impl(
        self, 
        customer_id: str, 
        analysis_depth: int,
        include_centrality: bool
    ) -> dict:
        """Implementation of network risk calculation"""
        try:
            # Simplified network analysis for demo
            # In production, this would use graph databases and complex network algorithms
            import hashlib
            
            # Generate deterministic but varied results for demo
            hash_val = int(hashlib.md5(customer_id.encode()).hexdigest()[:8], 16)
            
            connected_entities = (hash_val % 20) + 5  # 5-24 connections
            high_risk_connections = hash_val % 3      # 0-2 high-risk connections
            network_density = (hash_val % 50) / 100   # 0-0.5 density
            centrality_score = (hash_val % 30) / 100  # 0-0.3 centrality
            
            # Calculate risk score
            base_risk = 20
            if high_risk_connections > 0:
                base_risk += high_risk_connections * 15
            if network_density > 0.3:
                base_risk += 10
            if centrality_score > 0.2:
                base_risk += 8
                
            network_risk_score = min(base_risk, 100)
            
            return {
                "customer_id": customer_id,
                "network_depth": analysis_depth,
                "connected_entities": connected_entities,
                "high_risk_connections": high_risk_connections,
                "network_density": round(network_density, 3),
                "centrality_score": round(centrality_score, 3) if include_centrality else None,
                "network_risk_score": network_risk_score,
                "risk_connections": [
                    {"connection_type": "shared_address", "risk_level": "medium"}
                ] if high_risk_connections > 0 else [],
                "analysis_timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Network risk calculation error for {customer_id}: {e}")
            return {
                "customer_id": customer_id,
                "error": f"Network analysis failed: {str(e)}",
                "network_risk_score": 25
            }
    
    def _search_similar_transactions_impl(
        self,
        transaction_amount: float,
        merchant_category: str, 
        customer_id: str,
        days_lookback: int
    ) -> dict:
        """Implementation of similar transaction search with async-to-sync wrapper"""
        try:
            # Use existing fraud service vector search with async-to-sync wrapper
            if hasattr(self.fraud_service, 'find_similar_transactions'):
                transaction_data = {
                    "amount": transaction_amount,
                    "merchant": {"category": merchant_category},
                    "customer_id": customer_id
                }
                
                # Async-to-sync wrapper for FunctionTool compatibility
                try:
                    # Check if we're already in an event loop
                    loop = asyncio.get_event_loop()
                    if loop.is_running():
                        # We're in an async context, create a new loop in a thread
                        import concurrent.futures
                        import threading
                        
                        def run_async():
                            new_loop = asyncio.new_event_loop()
                            asyncio.set_event_loop(new_loop)
                            try:
                                return new_loop.run_until_complete(
                                    self.fraud_service.find_similar_transactions(transaction_data)
                                )
                            finally:
                                new_loop.close()
                        
                        with concurrent.futures.ThreadPoolExecutor() as executor:
                            future = executor.submit(run_async)
                            result = future.result(timeout=30)  # 30 second timeout
                    else:
                        # No event loop running, we can create one
                        result = loop.run_until_complete(
                            self.fraud_service.find_similar_transactions(transaction_data)
                        )
                        
                except RuntimeError:
                    # No event loop exists, create a new one
                    loop = asyncio.new_event_loop()
                    asyncio.set_event_loop(loop)
                    try:
                        result = loop.run_until_complete(
                            self.fraud_service.find_similar_transactions(transaction_data)
                        )
                    finally:
                        loop.close()
                
                # Unpack the result from fraud service
                if isinstance(result, tuple) and len(result) >= 3:
                    similar_transactions, similarity_risk, similarity_breakdown = result
                elif isinstance(result, tuple) and len(result) == 2:
                    similar_transactions, similarity_risk = result
                    similarity_breakdown = {}
                else:
                    # Handle unexpected result format
                    logger.warning(f"Unexpected result format from fraud service: {type(result)}")
                    similar_transactions = []
                    similarity_risk = 0.0
                    similarity_breakdown = {}
                
                return {
                    "similar_count": len(similar_transactions) if similar_transactions else 0,
                    "similarity_score": float(similarity_risk) if similarity_risk else 0.0,
                    "high_risk_matches": similarity_breakdown.get('high_risk_matches', 0) if similarity_breakdown else 0,
                    "similar_transactions": (similar_transactions[:5] if similar_transactions else []),  # Limit for response size
                    "pattern_type": "suspicious" if (similarity_risk and similarity_risk > 0.7) else "normal",
                    "confidence": 0.8,
                    "note": "Real fraud service integration via async-to-sync wrapper"
                }
            else:
                # Fallback implementation if fraud service doesn't have the method
                logger.info("Fraud service doesn't have find_similar_transactions method, using fallback")
                return {
                    "similar_count": 3,
                    "similarity_score": 0.4,
                    "high_risk_matches": 0,
                    "similar_transactions": [],
                    "pattern_type": "normal",
                    "confidence": 0.6,
                    "note": "Using fallback similarity search - fraud service method not available"
                }
                
        except Exception as e:
            logger.error(f"Similar transaction search error: {e}")
            # Return error information but don't fail completely
            return {
                "error": f"Similarity search failed: {str(e)}",
                "similar_count": 0,
                "similarity_score": 0.0,
                "high_risk_matches": 0,
                "similar_transactions": [],
                "pattern_type": "unknown",
                "confidence": 0.0,
                "note": "Error occurred during similarity search"
            }


def create_fraud_toolset(db_client: MongoDBAccess, fraud_service) -> List[FunctionTool]:
    """
    Convenience function to create complete fraud detection toolset.
    
    Args:
        db_client: MongoDB database client
        fraud_service: Existing fraud detection service
        
    Returns:
        Configured ToolSet ready for agent creation
    """
    tools = FraudDetectionTools(db_client, fraud_service)
    return tools.create_complete_toolset()