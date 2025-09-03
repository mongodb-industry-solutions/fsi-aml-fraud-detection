"""
Demo script for Azure AI Foundry Two-Stage Agent
Simple test runner for demonstration purposes
"""

# IMPORTANT: Import and configure logging FIRST
from logging_setup import setup_logging, get_logger
setup_logging()  # Configure logging


import asyncio
import json
import os
import logging
from datetime import datetime
from typing import Dict, Any

import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from azure_foundry import TwoStageAgentCore, validate_environment
from azure_foundry.config import PAUL_TEST_TRANSACTIONS, DEMO_TEST_TRANSACTIONS
from db.mongo_db import MongoDBAccess

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = get_logger(__name__)


async def run_demo():
    """Run the demo agent with test transactions"""
    
    print("🤖 Azure AI Foundry Two-Stage Agent Demo")
    print("=" * 60)
    
    # Validate environment
    env_status = validate_environment()
    if not env_status["valid"]:
        print("❌ Environment validation failed:")
        for var in env_status["missing_vars"]:
            print(f"   Missing: {var}")
        return
    
    if env_status["warnings"]:
        print("⚠️  Environment warnings:")
        for warning in env_status["warnings"]:
            print(f"   {warning}")
    
    print("✅ Environment validation passed")
    print()
    
    # Initialize database connection
    try:
        mongodb_uri = os.getenv("MONGODB_URI")
        db_client = MongoDBAccess(mongodb_uri)
        print("✅ MongoDB connection initialized")
    except Exception as e:
        print(f"❌ Failed to connect to MongoDB: {e}")
        return
    
    # Initialize the agent
    try:
        agent = TwoStageAgentCore(
            db_client=db_client,
            agent_name="demo_fraud_agent"
        )
        await agent.initialize()
        print("✅ Two-Stage Agent initialized")
        print(f"   Agent ID: {agent.agent_id}")
        print(f"   Model: {agent.config.model_deployment}")
        print()
    except Exception as e:
        print(f"❌ Failed to initialize agent: {e}")
        return
    
    # Run test transactions
    print("📋 Running Demo Test Transactions")
    print("-" * 40)
    
    results = []
    
    for i, test_txn in enumerate(PAUL_TEST_TRANSACTIONS, 1):
        print(f"\n🔍 Test {i}/{len(PAUL_TEST_TRANSACTIONS)}: {test_txn['description']}")
        print(f"   Transaction ID: {test_txn['transaction_id']}")
        print(f"   Amount: ${test_txn['amount']:,.2f}")
        print(f"   Expected: {test_txn['expected_decision']} (Stage {test_txn['expected_stage']})")
        
        try:
            # Analyze the transaction
            decision = await agent.analyze_transaction(test_txn)
            
            # Check if result matches expectations
            stage_match = decision.stage_completed == test_txn['expected_stage']
            decision_match = decision.decision.value == test_txn['expected_decision']
            
            print(f"   ✅ Result: {decision.decision.value} (Stage {decision.stage_completed})")
            print(f"   📊 Risk Score: {decision.risk_score:.1f}/100 ({decision.risk_level.value})")
            print(f"   🎯 Confidence: {decision.confidence:.0%}")
            print(f"   ⏱️  Processing: {decision.total_processing_time_ms:.0f}ms")
            print(f"   🧠 Reasoning: {decision.reasoning[:100]}...")
            
            if stage_match and decision_match:
                print(f"   ✅ Expected outcome achieved")
            else:
                print(f"   ⚠️  Unexpected outcome (Expected: {test_txn['expected_decision']}, Stage {test_txn['expected_stage']})")
            
            results.append({
                "test": test_txn,
                "result": decision,
                "stage_match": stage_match,
                "decision_match": decision_match
            })
            
        except Exception as e:
            print(f"   ❌ Analysis failed: {e}")
            results.append({
                "test": test_txn,
                "error": str(e),
                "stage_match": False,
                "decision_match": False
            })
    
    # Print summary
    print(f"\n📊 Demo Results Summary")
    print("=" * 40)
    
    successful_tests = sum(1 for r in results if "error" not in r)
    stage_matches = sum(1 for r in results if r.get("stage_match", False))
    decision_matches = sum(1 for r in results if r.get("decision_match", False))
    
    print(f"Successful analyses: {successful_tests}/{len(results)}")
    print(f"Stage routing accuracy: {stage_matches}/{len(results)} ({stage_matches/len(results)*100:.0f}%)")
    print(f"Decision accuracy: {decision_matches}/{len(results)} ({decision_matches/len(results)*100:.0f}%)")
    
    # Get agent metrics
    try:
        metrics = await agent.get_metrics()
        print(f"\n🔧 Agent Performance Metrics")
        print("-" * 30)
        print(f"Total transactions: {metrics['total_transactions']}")
        print(f"Stage 1 decisions: {metrics['stage1_decisions']}")
        print(f"Stage 2 decisions: {metrics['stage2_decisions']}")
        print(f"Stage 1 efficiency: {metrics['stage1_efficiency_percent']:.1f}%")
        print(f"Avg processing time: {metrics['avg_processing_time_ms']:.0f}ms")
        print(f"Avg confidence: {metrics['avg_confidence']:.2f}")
        
        print(f"\nDecision breakdown:")
        for decision_type, count in metrics['decision_breakdown'].items():
            print(f"  {decision_type}: {count}")
        
    except Exception as e:
        print(f"Failed to get metrics: {e}")
    
    # Cleanup
    try:
        await agent.cleanup()
        print(f"\n✅ Agent cleanup complete")
    except Exception as e:
        print(f"Cleanup warning: {e}")


async def test_single_transaction():
    """Test a single transaction for debugging"""
    
    # Custom test transaction
    test_transaction = {
        "transaction_id": "debug_001",
        "customer_id": "customer_debug",
        "amount": 2500.00,
        "currency": "USD",
        "merchant": {"name": "ElectronicsStore", "category": "electronics"},
        "location": {"city": "New York", "country": "US"},
        "timestamp": datetime.now().isoformat()
    }
    
    print("🔧 Single Transaction Debug Test")
    print("=" * 40)
    print(f"Transaction: ${test_transaction['amount']:,.2f} - {test_transaction['merchant']['category']}")
    
    # Initialize
    mongodb_uri = os.getenv("MONGODB_URI")
    db_client = MongoDBAccess(mongodb_uri)
    
    agent = TwoStageAgentCore(db_client=db_client, agent_name="debug_agent")
    await agent.initialize()
    
    # Analyze
    decision = await agent.analyze_transaction(test_transaction)
    
    print(f"\nResult: {decision.decision.value}")
    print(f"Stage: {decision.stage_completed}")
    print(f"Risk Score: {decision.risk_score:.1f}/100")
    print(f"Confidence: {decision.confidence:.0%}")
    print(f"Processing Time: {decision.total_processing_time_ms:.0f}ms")
    print(f"Reasoning: {decision.reasoning}")
    
    if decision.stage2_result:
        print(f"\nStage 2 Details:")
        print(f"Similar transactions: {decision.stage2_result.similar_transactions_count}")
        print(f"AI recommendation: {decision.stage2_result.ai_recommendation}")
        print(f"AI analysis: {decision.stage2_result.ai_analysis_summary[:200]}...")
    
    await agent.cleanup()


if __name__ == "__main__":
    # Choose which test to run
    import sys
    
    if len(sys.argv) > 1 and sys.argv[1] == "single":
        asyncio.run(test_single_transaction())
    else:
        asyncio.run(run_demo())