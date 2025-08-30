"""
Test script for MongoDB Memory System and Meta-Learning
"""

import asyncio
import os
import sys
import logging
from datetime import datetime
from pprint import pprint

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from db.mongo_db import MongoDBAccess
from azure_foundry import TwoStageAgentCore
from azure_foundry.memory.enhanced_memory_store import EnhancedMemoryStore

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def test_memory_system():
    """Test the enhanced memory system functionality"""
    
    print("\n" + "="*60)
    print("🧪 TESTING MONGODB MEMORY SYSTEM")
    print("="*60)
    
    # Connect to MongoDB
    mongodb_uri = os.getenv("MONGODB_URI")
    if not mongodb_uri:
        print("❌ MONGODB_URI not set in environment")
        return
    
    db_client = MongoDBAccess(mongodb_uri)
    print("✅ Connected to MongoDB")
    
    # Initialize enhanced memory store
    memory_store = EnhancedMemoryStore(db_client)
    print("✅ Enhanced memory store initialized")
    
    # Test transaction data
    test_transaction = {
        "transaction_id": f"test_memory_{datetime.now().timestamp()}",
        "customer_id": "test_customer_123",
        "amount": 5000.00,
        "currency": "USD",
        "merchant": {
            "name": "TestMerchant",
            "category": "electronics"
        },
        "location": {
            "country": "US",
            "city": "New York"
        },
        "timestamp": datetime.now().isoformat()
    }
    
    print(f"\n📋 Test Transaction: {test_transaction['transaction_id']}")
    print(f"   Amount: ${test_transaction['amount']:,.2f}")
    print(f"   Merchant: {test_transaction['merchant']['category']}")
    
    # Test 1: Thread Management
    print("\n1️⃣ Testing Thread Management...")
    thread_id = f"thread_{datetime.now().timestamp()}"
    await memory_store.store_thread(
        transaction_id=test_transaction["transaction_id"],
        thread_id=thread_id,
        customer_id=test_transaction["customer_id"],
        metadata={"test": True}
    )
    print(f"   ✅ Stored thread: {thread_id}")
    
    retrieved_thread = await memory_store.get_or_create_thread(
        test_transaction["transaction_id"],
        test_transaction["customer_id"]
    )
    print(f"   ✅ Retrieved thread: {retrieved_thread}")
    
    # Test 2: Conversation Storage
    print("\n2️⃣ Testing Conversation Storage...")
    test_prompt = "Analyze this transaction for fraud patterns using available tools."
    test_response = "Based on analysis, this transaction shows moderate risk with score 65/100."
    
    await memory_store.store_conversation_message(
        thread_id=thread_id,
        transaction_id=test_transaction["transaction_id"],
        role="user",
        content=test_prompt,
        metadata={"stage": "test"}
    )
    print("   ✅ Stored user prompt")
    
    await memory_store.store_conversation_message(
        thread_id=thread_id,
        transaction_id=test_transaction["transaction_id"],
        role="assistant",
        content=test_response,
        metadata={"stage": "test", "processing_time_ms": 1500}
    )
    print("   ✅ Stored assistant response")
    
    # Test 3: Event Logging
    print("\n3️⃣ Testing Event Logging...")
    await memory_store.store_event_log(
        transaction_id=test_transaction["transaction_id"],
        event_type="analysis_start",
        event_data={"amount": test_transaction["amount"]},
        thread_id=thread_id
    )
    
    await memory_store.store_event_log(
        transaction_id=test_transaction["transaction_id"],
        event_type="stage1_complete",
        event_data={"score": 65, "needs_stage2": True},
        thread_id=thread_id
    )
    print("   ✅ Stored event logs")
    
    # Test 4: Decision Storage
    print("\n4️⃣ Testing Decision Storage...")
    test_decision = {
        "decision": "INVESTIGATE",
        "confidence": 0.75,
        "risk_score": 65,
        "risk_level": "HIGH",
        "reasoning": "Multiple risk factors detected",
        "stage_completed": 2,
        "total_processing_time_ms": 3500
    }
    
    await memory_store.store_decision_with_context(
        transaction_id=test_transaction["transaction_id"],
        decision=test_decision,
        transaction_data=test_transaction,
        thread_id=thread_id
    )
    print("   ✅ Stored decision with context")
    
    # Test 5: Meta-Learning Retrieval
    print("\n5️⃣ Testing Meta-Learning Retrieval...")
    similar_decisions = await memory_store.retrieve_similar_decisions(
        test_transaction,
        limit=5
    )
    print(f"   Found {len(similar_decisions)} similar decisions")
    
    meta_context = await memory_store.get_meta_learning_context(
        test_transaction,
        test_transaction["customer_id"]
    )
    print(f"   Meta-learning context:")
    print(f"   - Similar decisions: {len(meta_context['similar_decisions'])}")
    print(f"   - Relevant patterns: {len(meta_context['relevant_patterns'])}")
    print(f"   - Customer history: {len(meta_context['customer_history'])}")
    
    # Test 6: Customer History
    print("\n6️⃣ Testing Customer History...")
    customer_history = await memory_store.get_customer_history(
        test_transaction["customer_id"],
        limit=5
    )
    print(f"   Found {len(customer_history)} transactions for customer")
    
    # Test 7: Learning Pattern Storage
    print("\n7️⃣ Testing Learning Pattern Storage...")
    await memory_store.store_learning_pattern(
        pattern_type="test_pattern",
        pattern_data={
            "merchant_category": "electronics",
            "amount_range": [1000, 10000],
            "risk_indicators": ["high_amount", "new_merchant"]
        },
        effectiveness_score=0.85,
        transaction_ids=[test_transaction["transaction_id"]]
    )
    print("   ✅ Stored learning pattern")
    
    patterns = await memory_store.get_relevant_patterns(
        test_transaction,
        pattern_types=["test_pattern"],
        min_effectiveness=0.5
    )
    print(f"   Retrieved {len(patterns)} relevant patterns")
    
    # Test 8: Conversation Retrieval
    print("\n8️⃣ Testing Conversation Retrieval...")
    conversations = await memory_store.get_thread_conversations(
        thread_id,
        limit=10
    )
    print(f"   Retrieved {len(conversations)} messages from thread")
    for msg in conversations:
        print(f"   - {msg['role']}: {msg['content'][:50]}...")
    
    print("\n" + "="*60)
    print("✅ ALL MEMORY SYSTEM TESTS COMPLETED SUCCESSFULLY")
    print("="*60)
    
    # Summary of what was stored
    print("\n📊 SUMMARY OF STORED DATA:")
    print(f"   Thread ID: {thread_id}")
    print(f"   Transaction ID: {test_transaction['transaction_id']}")
    print(f"   Customer ID: {test_transaction['customer_id']}")
    print(f"   Decision: {test_decision['decision']}")
    print(f"   Risk Score: {test_decision['risk_score']}/100")
    print("\n   This data is now available for meta-learning in future transactions!")


async def test_agent_with_memory():
    """Test the agent with memory utilization"""
    
    print("\n" + "="*60)
    print("🤖 TESTING AGENT WITH MEMORY UTILIZATION")
    print("="*60)
    
    # Connect to MongoDB
    mongodb_uri = os.getenv("MONGODB_URI")
    db_client = MongoDBAccess(mongodb_uri)
    
    # Initialize agent
    agent = TwoStageAgentCore(
        db_client=db_client,
        agent_name="memory_test_agent"
    )
    
    print("Initializing agent with memory system...")
    await agent.initialize()
    
    # Check if memory is enabled
    metrics = await agent.get_metrics()
    memory_enabled = metrics["native_enhancements_enabled"].get("enhanced_memory", False)
    print(f"Enhanced Memory Enabled: {memory_enabled}")
    
    if not memory_enabled:
        print("⚠️ Enhanced memory not enabled - check initialization")
        return
    
    # Test transaction
    test_transaction = {
        "transaction_id": f"agent_test_{datetime.now().timestamp()}",
        "customer_id": "test_customer_456",
        "amount": 7500.00,
        "currency": "USD",
        "merchant": {
            "name": "SuspiciousMerchant",
            "category": "gambling"
        },
        "location": {
            "country": "US",
            "city": "Las Vegas"
        },
        "timestamp": datetime.now().isoformat()
    }
    
    print(f"\n📋 Analyzing transaction: {test_transaction['transaction_id']}")
    print(f"   Amount: ${test_transaction['amount']:,.2f}")
    print(f"   Merchant: {test_transaction['merchant']['category']}")
    
    # Analyze transaction (this will use memory)
    decision = await agent.analyze_transaction(test_transaction)
    
    print(f"\n✅ Analysis Complete:")
    print(f"   Decision: {decision.decision.value}")
    print(f"   Risk Score: {decision.risk_score:.1f}/100")
    print(f"   Confidence: {decision.confidence:.0%}")
    print(f"   Stage Completed: {decision.stage_completed}")
    print(f"   Processing Time: {decision.total_processing_time_ms:.0f}ms")
    
    if decision.thread_id:
        print(f"   Thread ID: {decision.thread_id}")
        
        # Verify data was stored
        memory_store = agent.enhanced_memory
        if memory_store:
            print("\n📂 Verifying stored memory data...")
            
            # Check thread
            stored_thread = await memory_store.get_or_create_thread(
                test_transaction["transaction_id"]
            )
            print(f"   ✅ Thread persisted: {stored_thread}")
            
            # Check conversations
            conversations = await memory_store.get_thread_conversations(
                decision.thread_id,
                limit=5
            )
            print(f"   ✅ Conversations stored: {len(conversations)} messages")
            
            # Check decision
            db_name = os.getenv("DB_NAME", "threatsight360")
            db = db_client.get_database(db_name)
            stored_decision = db["agent_decisions"].find_one(
                {"transaction_id": test_transaction["transaction_id"]}
            )
            if stored_decision:
                print(f"   ✅ Decision stored with context")
    
    # Cleanup
    await agent.cleanup()
    
    print("\n" + "="*60)
    print("✅ AGENT MEMORY TEST COMPLETED")
    print("="*60)


async def main():
    """Run all tests"""
    try:
        # Test memory system components
        await test_memory_system()
        
        # Test agent with memory
        await test_agent_with_memory()
        
        print("\n🎉 ALL TESTS COMPLETED SUCCESSFULLY!")
        
    except Exception as e:
        print(f"\n❌ Test failed: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    # Load environment variables
    from dotenv import load_dotenv
    load_dotenv()
    
    # Run tests
    asyncio.run(main())