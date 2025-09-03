#!/usr/bin/env python3
"""
Step-by-step agent debugging script
Test each component individually to find where the agent gets stuck
"""

# IMPORTANT: Import and configure logging FIRST
from logging_setup import setup_logging, get_logger
setup_logging()  # Configure logging


import asyncio
import os
import sys
import logging
from datetime import datetime

# Add the backend directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from services.agent_service import agent_service
from db.mongo_db import MongoDBAccess

# Configure logging to see what's happening
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = get_logger(__name__)

async def test_step_1_agent_initialization():
    """Step 1: Test if agent service initializes properly"""
    print("🔍 STEP 1: Testing Agent Service Initialization")
    print("-" * 50)
    
    try:
        # Check if already initialized
        if agent_service._initialized:
            print("✅ Agent service already initialized")
        else:
            print("Initializing agent service...")
            success = await agent_service.initialize()
            print(f"Initialization result: {success}")
        
        # Get status
        status = await agent_service.get_agent_status()
        print(f"Agent Status: {status}")
        
        return True
        
    except Exception as e:
        print(f"❌ Step 1 failed: {e}")
        import traceback
        traceback.print_exc()
        return False

async def test_step_2_simple_transaction():
    """Step 2: Test with a very simple transaction (no functions)"""
    print("\n🔍 STEP 2: Testing Simple Transaction Analysis")
    print("-" * 50)
    
    try:
        # Very simple transaction data
        simple_transaction = {
            "transaction_id": "debug_test_001",
            "customer_id": "test_customer_123",
            "amount": 100.0,
            "currency": "USD",
            "merchant": {
                "name": "Test Store",
                "category": "retail",
                "id": "merchant_test"
            },
            "location": {
                "city": "Test City",
                "state": "Test State", 
                "country": "US"
            },
            "device_info": {
                "device_id": "test_device",
                "type": "mobile",
                "os": "iOS",
                "browser": "Safari",
                "ip": "192.168.1.1"
            },
            "transaction_type": "purchase",
            "payment_method": "credit_card",
            "status": "completed",
            "timestamp": datetime.now().isoformat()
        }
        
        print(f"Testing transaction: {simple_transaction['transaction_id']}")
        print(f"Amount: ${simple_transaction['amount']}")
        print(f"Customer: {simple_transaction['customer_id']}")
        
        # Set a timeout for the analysis
        print("Starting analysis (30 second timeout)...")
        
        result = await asyncio.wait_for(
            agent_service.analyze_transaction(simple_transaction),
            timeout=30.0
        )
        
        print("✅ Analysis completed!")
        print(f"Decision: {result['decision']}")
        print(f"Risk Score: {result['risk_score']}")
        print(f"Stage: {result['stage_completed']}")
        print(f"Processing Time: {result['processing_time_ms']}ms")
        print(f"Reasoning: {result['reasoning'][:200]}...")
        
        return True
        
    except asyncio.TimeoutError:
        print("❌ Step 2 failed: Analysis timed out after 30 seconds")
        return False
    except Exception as e:
        print(f"❌ Step 2 failed: {e}")
        import traceback
        traceback.print_exc()
        return False

async def test_step_3_check_functions():
    """Step 3: Check if functions are properly registered"""
    print("\n🔍 STEP 3: Checking Function Registration")
    print("-" * 50)
    
    try:
        # Access the agent core directly
        agent_core = agent_service.agent
        
        if not agent_core:
            print("❌ Agent core not available")
            return False
        
        print(f"Agent ID: {agent_core.agent_id}")
        print(f"Is reused agent: {getattr(agent_core, 'is_reused_agent', 'unknown')}")
        
        # Check if toolset exists
        if hasattr(agent_core, 'fraud_toolset') and agent_core.fraud_toolset:
            print(f"✅ Fraud toolset exists with {len(agent_core.fraud_toolset)} tools")
            
            # Try to examine the functions
            for i, tool in enumerate(agent_core.fraud_toolset):
                print(f"  Tool {i+1}: {type(tool).__name__}")
        else:
            print("❌ No fraud toolset found")
        
        # Check native enhancements
        metrics = await agent_core.get_metrics()
        native_status = metrics.get('native_enhancements_enabled', {})
        print(f"Native enhancements: {native_status}")
        
        return True
        
    except Exception as e:
        print(f"❌ Step 3 failed: {e}")
        import traceback
        traceback.print_exc()
        return False

async def test_step_4_individual_functions():
    """Step 4: Test individual function implementations"""
    print("\n🔍 STEP 4: Testing Individual Functions")
    print("-" * 50)
    
    try:
        # Test the function implementations directly
        from azure_foundry.tools.native_tools import FraudDetectionTools
        from services.fraud_detection import FraudDetectionService
        
        # Initialize components
        mongodb_uri = os.getenv('MONGODB_URI')
        db_client = MongoDBAccess(mongodb_uri)
        fraud_service = FraudDetectionService(db_client)
        
        tools = FraudDetectionTools(db_client, fraud_service)
        
        # Test analyze_transaction_patterns
        print("Testing analyze_transaction_patterns...")
        pattern_result = tools._analyze_transaction_patterns_impl(
            customer_id="test_customer_123",
            lookback_days=30,
            include_velocity=True
        )
        print(f"✅ Pattern analysis result: {pattern_result.get('pattern_score', 'no score')}")
        
        # Test check_sanctions_lists
        print("Testing check_sanctions_lists...")
        sanctions_result = tools._check_sanctions_lists_impl(
            entity_name="Test Customer",
            entity_type="individual"
        )
        print(f"✅ Sanctions check result: {sanctions_result.get('risk_rating', 'no rating')}")
        
        # Test calculate_network_risk
        print("Testing calculate_network_risk...")
        network_result = tools._calculate_network_risk_impl(
            customer_id="test_customer_123",
            analysis_depth=2,
            include_centrality=True
        )
        print(f"✅ Network risk result: {network_result.get('network_risk_score', 'no score')}")
        
        return True
        
    except Exception as e:
        print(f"❌ Step 4 failed: {e}")
        import traceback
        traceback.print_exc()
        return False

async def main():
    """Run all debugging steps"""
    print("🚀 AGENT DEBUGGING - STEP BY STEP")
    print("=" * 60)
    
    steps = [
        ("Agent Initialization", test_step_1_agent_initialization),
        ("Simple Transaction", test_step_2_simple_transaction),
        ("Function Registration", test_step_3_check_functions),
        ("Individual Functions", test_step_4_individual_functions),
    ]
    
    results = {}
    
    for step_name, step_func in steps:
        try:
            result = await step_func()
            results[step_name] = result
            
            if not result:
                print(f"\n⚠️ {step_name} failed - stopping here for investigation")
                break
                
        except Exception as e:
            print(f"\n💥 {step_name} crashed: {e}")
            results[step_name] = False
            break
    
    print(f"\n📊 DEBUGGING SUMMARY")
    print("=" * 30)
    for step_name, success in results.items():
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{step_name}: {status}")
    
    # Cleanup
    try:
        await agent_service.cleanup()
        print("\n🧹 Cleanup completed")
    except:
        pass

if __name__ == "__main__":
    asyncio.run(main())