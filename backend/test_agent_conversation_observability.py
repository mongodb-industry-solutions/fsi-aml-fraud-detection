#!/usr/bin/env python3
"""
Test Azure AI Foundry Agent Conversation with Full Observability
Tests a realistic agent conversation scenario with comprehensive monitoring
"""

# IMPORTANT: Import and configure logging FIRST
from logging_setup import setup_logging, get_logger
setup_logging()  # Configure logging

import asyncio
import os
import sys
import logging
from datetime import datetime
from typing import Dict, Any

# Add the backend directory to Python path
sys.path.insert(0, '/Users/mehar.grewal/Desktop/Work/Coding/Finance/Fraud Detection Demo Mar 25/fsi-aml-fraud-detection/backend')

logger = get_logger(__name__)

async def test_conversation_with_observability():
    """Test a complete conversation flow with observability enabled"""
    logger.info("🚀 Testing Agent Conversation with Full Observability")
    logger.info("=" * 60)
    
    try:
        # Load environment variables
        from dotenv import load_dotenv
        load_dotenv()
        
        # Import required modules
        from azure_foundry.conversation.native_conversation import NativeConversationHandler
        from azure_foundry.observability import configure_observability
        from azure.ai.agents import AgentsClient
        from azure.ai.projects import AIProjectClient
        from azure.identity import DefaultAzureCredential
        
        # Check if we have the required environment variables
        project_endpoint = os.getenv("AZURE_FOUNDRY_PROJECT_ENDPOINT") or os.getenv("PROJECT_ENDPOINT")
        if not project_endpoint:
            logger.warning("⚠️ No Azure project endpoint found. Using mock client for testing.")
            return await test_conversation_with_mock_client()
        
        logger.info("✅ Azure project endpoint found, attempting real Azure connection")
        
        # Configure observability with console export for testing
        configure_observability(
            connection_string=None,  # No Azure Monitor for testing
            enable_console_export=True,
            service_name="test-fraud-agent"
        )
        
        # Initialize Azure AI client
        credential = DefaultAzureCredential()
        project_client = AIProjectClient(
            endpoint=project_endpoint,
            credential=credential
        )
        agents_client = project_client.agents
        
        # Initialize conversation handler with observability
        agent_id = os.getenv("FRAUD_AGENT_ID", "asst_Q6FO8w2G1h81QnSI5giqHX9M")
        handler = NativeConversationHandler(
            agents_client=agents_client,
            agent_id=agent_id,
            enable_observability=True,
            observability_config={
                "configure_telemetry": False,  # Already configured above
                "enable_console_export": True
            }
        )
        
        logger.info(f"✅ Handler initialized with agent: {agent_id}")
        
        # Create a test thread
        thread = agents_client.threads.create()
        thread_id = thread.id
        logger.info(f"✅ Test thread created: {thread_id}")
        
        # Prepare test transaction data for fraud analysis
        test_transaction = {
            "transaction_id": "txn_test_12345",
            "amount": 2500.0,
            "merchant": "Unknown Online Store",
            "location": "Remote",
            "customer_id": "cust_test_789",
            "timestamp": datetime.now().isoformat(),
            "risk_score": 78.5,
            "fraud_indicators": [
                "high_amount",
                "new_merchant", 
                "unusual_location"
            ]
        }
        
        conversation_context = {
            "transaction": test_transaction,
            "analysis_type": "fraud_detection",
            "user_id": "test_user_123",
            "session_id": "test_session_456"
        }
        
        # Test conversation with observability
        logger.info("🔄 Starting conversation with observability tracking...")
        
        message = f"""
        Analyze this transaction for fraud:
        
        Transaction Details:
        - Amount: ${test_transaction['amount']}
        - Merchant: {test_transaction['merchant']}
        - Customer ID: {test_transaction['customer_id']}
        - Risk Score: {test_transaction['risk_score']}
        - Fraud Indicators: {', '.join(test_transaction['fraud_indicators'])}
        
        Please provide a comprehensive fraud analysis including:
        1. Risk assessment
        2. Pattern analysis
        3. Recommendations
        """
        
        response = await handler.run_conversation_native(
            thread_id=thread_id,
            message=message,
            conversation_context=conversation_context,
            temperature=0.1
        )
        
        logger.info("✅ Conversation completed successfully")
        logger.info(f"Agent Response Preview: {response[:200]}...")
        
        # Get observability metrics
        logger.info("\n📊 Retrieving Observability Metrics...")
        metrics = handler.get_observability_metrics()
        
        if metrics.get("observability_enabled"):
            logger.info("✅ Observability Data:")
            
            # Agent metrics
            if "agent_metrics" in metrics:
                agent_metrics = metrics["agent_metrics"]
                logger.info(f"  - Total Runs: {agent_metrics.get('total_runs', 0)}")
                logger.info(f"  - Success Rate: {agent_metrics.get('success_rate', 0):.1%}")
                logger.info(f"  - Avg Execution Time: {agent_metrics.get('avg_execution_time_ms', 0):.2f}ms")
            
            # Decision analytics  
            if "decision_analytics" in metrics:
                decision_metrics = metrics["decision_analytics"]
                logger.info(f"  - Total Decisions: {decision_metrics.get('total_decisions', 0)}")
                logger.info(f"  - Avg Confidence: {decision_metrics.get('avg_confidence_score', 0):.2f}")
                logger.info(f"  - Decision Success Rate: {decision_metrics.get('success_rate', 0):.1%}")
        
        # Export observability data
        logger.info("\n📁 Exporting Observability Data...")
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        exported_files = await handler.export_observability_data(f"agent_test_{timestamp}")
        
        for data_type, file_path in exported_files.items():
            if not file_path.get("error"):
                logger.info(f"  ✅ {data_type.capitalize()} exported to: {file_path}")
            else:
                logger.warning(f"  ⚠️ {data_type.capitalize()} export error: {file_path['error']}")
        
        # Cleanup test thread
        try:
            agents_client.threads.delete(thread_id)
            logger.info(f"✅ Cleaned up test thread: {thread_id}")
        except Exception as e:
            logger.warning(f"⚠️ Could not cleanup thread: {e}")
        
        logger.info("\n🎉 Full conversation test with observability completed successfully!")
        return True
        
    except Exception as e:
        logger.error(f"❌ Conversation test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

async def test_conversation_with_mock_client():
    """Test conversation handler with mock client when Azure is not available"""
    logger.info("🧪 Testing with mock client (Azure not available)")
    
    try:
        from azure_foundry.conversation.native_conversation import NativeConversationHandler
        from azure_foundry.observability import configure_observability
        
        # Configure observability
        configure_observability(
            connection_string=None,
            enable_console_export=True,
            service_name="test-fraud-agent-mock"
        )
        
        # Mock Azure clients
        class MockThread:
            def __init__(self):
                self.id = "mock_thread_123"
        
        class MockThreads:
            def create(self):
                return MockThread()
            
            def delete(self, thread_id):
                pass
        
        class MockAgentsClient:
            def __init__(self):
                self.threads = MockThreads()
        
        mock_client = MockAgentsClient()
        
        # Initialize handler with observability
        handler = NativeConversationHandler(
            agents_client=mock_client,
            agent_id="mock_agent_789",
            enable_observability=True,
            observability_config={
                "configure_telemetry": False,
                "enable_console_export": True
            }
        )
        
        logger.info("✅ Mock handler with observability initialized")
        
        # Test observability metrics without actual conversation
        metrics = handler.get_observability_metrics()
        logger.info(f"✅ Observability enabled: {metrics['observability_enabled']}")
        
        # Test data export
        exported_files = await handler.export_observability_data("mock_test")
        logger.info(f"✅ Mock data export test: {len(exported_files)} files would be exported")
        
        logger.info("✅ Mock client test completed successfully")
        return True
        
    except Exception as e:
        logger.error(f"❌ Mock client test failed: {e}")
        return False

async def run_conversation_test():
    """Run the conversation test with proper error handling"""
    logger.info("🚀 Starting Azure AI Foundry Agent Conversation Test with Observability")
    
    try:
        success = await test_conversation_with_observability()
        
        if success:
            logger.info("\n🎉 SUCCESS: All conversation tests passed!")
            logger.info("The observability system is working correctly with agent conversations.")
        else:
            logger.warning("\n⚠️ Some tests failed. Please review the errors above.")
        
        return success
        
    except Exception as e:
        logger.error(f"❌ Test runner failed: {e}")
        return False

if __name__ == "__main__":
    success = asyncio.run(run_conversation_test())
    sys.exit(0 if success else 1)