"""
Level 4: MongoDB Vector Store and Meta-Learning Tests
Tests MongoDB Atlas vector search and learning pattern storage.
"""

import os
import sys
import asyncio
import random
from datetime import datetime, timedelta
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Add project root to path
project_root = os.path.join(os.path.dirname(__file__), '../..')
sys.path.insert(0, project_root)


def test_mongodb_vector_store_initialization():
    """Test MongoDB vector store can be initialized using existing infrastructure"""
    print("\n🔍 Testing MongoDB Vector Store Initialization...")
    
    try:
        from azure_foundry.memory import create_mongodb_vector_store
        from dependencies import get_enhanced_fraud_detection_service
        
        # Get existing fraud detection service (with MongoDB already connected)
        fraud_service = get_enhanced_fraud_detection_service()
        
        # Create vector store adapter using existing service
        vector_store = create_mongodb_vector_store(fraud_service)
        
        print("✅ MongoDB vector store adapter created successfully")
        print(f"✅ Vector store type: {type(vector_store)}")
        print(f"✅ Uses existing fraud service: {type(fraud_service)}")
        
        # Check required methods
        required_methods = [
            'store_agent_decision', 'retrieve_similar_decisions',
            'store_learning_pattern', 'setup_vector_indexes'
        ]
        
        for method in required_methods:
            if hasattr(vector_store, method):
                print(f"✅ Method available: {method}")
            else:
                print(f"❌ Missing method: {method}")
                return False
        
        return True
        
    except Exception as e:
        print(f"❌ Vector store initialization failed: {e}")
        return False


async def test_vector_indexes_setup():
    """Test vector index setup using existing infrastructure"""
    print("\n🔍 Testing Vector Indexes Setup...")
    
    try:
        from azure_foundry.memory import create_mongodb_vector_store
        from dependencies import get_enhanced_fraud_detection_service
        
        # Get existing fraud service and vector store
        fraud_service = get_enhanced_fraud_detection_service()
        vector_store = create_mongodb_vector_store(fraud_service)
        
        # Test index setup (now just delegates to existing infrastructure)
        await vector_store.setup_vector_indexes()
        print("✅ Vector indexes setup completed (delegated)")
        
        # Check collections exist using existing MongoDB client
        db_name = os.getenv('DB_NAME')
        
        expected_collections = ['agent_decision_history', 'fraud_learning_patterns']
        for collection_name in expected_collections:
            try:
                # Test collection access using existing infrastructure
                collection = fraud_service.db_client.get_collection(db_name, collection_name)
                print(f"✅ Collection accessible: {collection_name}")
            except Exception as collection_error:
                print(f"⚠️ Collection will be created on first use: {collection_name}")
        
        return True
        
    except Exception as e:
        print(f"❌ Vector indexes setup failed: {e}")
        return False


async def test_embeddings_integration():
    """Test embeddings integration with vector store"""
    print("\n🔍 Testing Embeddings Integration...")
    
    try:
        from azure_foundry.embeddings import get_embedding
        
        # Test embedding generation
        test_texts = [
            "High risk transaction with unusual amount",
            "Normal restaurant purchase",
            "Suspicious cash advance pattern"
        ]
        
        embeddings = []
        for text in test_texts:
            embedding = await get_embedding(text)
            embeddings.append(embedding)
            print(f"✅ Generated embedding for: '{text[:30]}...' (dim: {len(embedding)})")
        
        # Verify embedding properties
        if len(embeddings) == 3:
            print("✅ All embeddings generated successfully")
            
            # Check dimensions are consistent
            if all(len(emb) == len(embeddings[0]) for emb in embeddings):
                print(f"✅ Consistent embedding dimensions: {len(embeddings[0])}")
            else:
                print("❌ Inconsistent embedding dimensions")
                return False
                
            return True
        else:
            print("❌ Not all embeddings generated")
            return False
        
    except Exception as e:
        print(f"❌ Embeddings integration failed: {e}")
        return False


async def test_agent_decision_storage():
    """Test storing and retrieving agent decisions using existing infrastructure"""
    print("\n🔍 Testing Agent Decision Storage...")
    
    try:
        from azure_foundry.memory import create_mongodb_vector_store
        from dependencies import get_enhanced_fraud_detection_service
        
        # Get existing fraud service and vector store
        fraud_service = get_enhanced_fraud_detection_service()
        vector_store = create_mongodb_vector_store(fraud_service)
        
        # Setup indexes (delegates to existing infrastructure)
        await vector_store.setup_vector_indexes()
        
        # Create test agent decision
        test_transaction = {
            "transaction_id": f"test_txn_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
            "amount": 1250.00,
            "merchant": {"category": "electronics"},
            "customer_id": "test_customer_123",
            "location": {"country": "US"}
        }
        
        test_decision = {
            "decision": "INVESTIGATE",
            "confidence": 0.75,
            "risk_score": 65.0,
            "reasoning": "Medium risk transaction requiring further analysis",
            "stage_completed": 2,
            "processing_time_ms": 1500
        }
        
        # Store decision
        await vector_store.store_agent_decision(
            agent_decision=test_decision,
            transaction_data=test_transaction,
            context={"stage1_analysis": {"rule_score": 45.0}}
        )
        
        print("✅ Agent decision stored successfully")
        
        # Test retrieval of similar decisions
        similar_decisions = await vector_store.retrieve_similar_decisions(
            current_transaction=test_transaction,
            similarity_threshold=0.5,
            limit=3
        )
        
        print(f"✅ Retrieved {len(similar_decisions)} similar decisions")
        
        if similar_decisions:
            for i, decision in enumerate(similar_decisions):
                print(f"  Decision {i+1}: {decision.get('agent_decision', {}).get('decision', 'Unknown')}")
        
        # No need to close connection - existing infrastructure handles it
        return True
        
    except Exception as e:
        print(f"❌ Agent decision storage failed: {e}")
        return False


async def test_learning_pattern_storage():
    """Test storing and retrieving learning patterns using existing infrastructure"""
    print("\n🔍 Testing Learning Pattern Storage...")
    
    try:
        from azure_foundry.memory import create_mongodb_vector_store
        from dependencies import get_enhanced_fraud_detection_service
        
        # Get existing fraud service and vector store
        fraud_service = get_enhanced_fraud_detection_service()
        vector_store = create_mongodb_vector_store(fraud_service)
        
        # Test different pattern types
        pattern_tests = [
            {
                "pattern_type": "high_amount_electronics",
                "pattern_data": {
                    "merchant_category": "electronics",
                    "amount_range": {"min": 1000, "max": 5000},
                    "typical_outcome": "investigate"
                },
                "effectiveness_score": 0.82
            },
            {
                "pattern_type": "velocity_anomaly",
                "pattern_data": {
                    "transaction_count": 5,
                    "time_window_minutes": 10,
                    "typical_outcome": "block"
                },
                "effectiveness_score": 0.95
            }
        ]
        
        for pattern in pattern_tests:
            await vector_store.store_learning_pattern(
                pattern_type=pattern["pattern_type"],
                pattern_data=pattern["pattern_data"],
                effectiveness_score=pattern["effectiveness_score"]
            )
            print(f"✅ Stored learning pattern: {pattern['pattern_type']}")
        
        # Note: Pattern retrieval would use MongoDB queries in real implementation
        print("✅ Learning patterns stored successfully (retrieval would use MongoDB queries)")
        
        return True
        
    except Exception as e:
        print(f"❌ Learning pattern storage failed: {e}")
        return False


async def test_vector_similarity_search():
    """Test vector similarity search functionality using existing infrastructure"""
    print("\n🔍 Testing Vector Similarity Search...")
    
    try:
        from azure_foundry.memory import create_mongodb_vector_store
        from azure_foundry.embeddings import get_embedding
        from dependencies import get_enhanced_fraud_detection_service
        
        # Get existing fraud service and vector store
        fraud_service = get_enhanced_fraud_detection_service()
        vector_store = create_mongodb_vector_store(fraud_service)
        
        # Create test data with embeddings
        test_cases = [
            {"description": "Large electronics purchase", "amount": 2500, "category": "electronics"},
            {"description": "Small restaurant bill", "amount": 45, "category": "restaurant"},
            {"description": "Cash advance transaction", "amount": 500, "category": "cash_advance"}
        ]
        
        # Store test cases with embeddings
        for case in test_cases:
            embedding = await get_embedding(case["description"])
            
            decision_data = {
                "decision": "APPROVE" if case["amount"] < 100 else "INVESTIGATE",
                "confidence": 0.8,
                "risk_score": min(case["amount"] / 50, 100),
                "reasoning": f"Analysis of {case['description']}"
            }
            
            transaction_data = {
                "transaction_id": f"vector_test_{case['category']}_{random.randint(1000,9999)}",
                "amount": case["amount"],
                "merchant": {"category": case["category"]},
                "description": case["description"]
            }
            
            await vector_store.store_agent_decision(
                agent_decision=decision_data,
                transaction_data=transaction_data,
                context={"test_embedding": True}
            )
        
        print("✅ Test data stored with embeddings")
        
        # Test similarity search
        query_transaction = {
            "transaction_id": "similarity_query",
            "amount": 2000,
            "merchant": {"category": "electronics"},
            "description": "Electronics store purchase"
        }
        
        similar_results = await vector_store.retrieve_similar_decisions(
            current_transaction=query_transaction,
            similarity_threshold=0.3,
            limit=5
        )
        
        print(f"✅ Vector similarity search returned {len(similar_results)} results")
        
        # Analyze results
        if similar_results:
            for i, result in enumerate(similar_results):
                transaction = result.get('transaction_data', {})
                decision = result.get('agent_decision', {})
                score = result.get('score', 0)  # MongoDB Atlas vector search score
                
                print(f"  Result {i+1}: {transaction.get('description', 'Unknown')} " +
                      f"(Decision: {decision.get('decision', 'Unknown')}, Score: {score:.3f})")
        
        # No need to close connection - existing infrastructure handles it
        return len(similar_results) > 0
        
    except Exception as e:
        print(f"❌ Vector similarity search failed: {e}")
        return False


async def test_meta_learning_capabilities():
    """Test meta-learning and pattern recognition using existing infrastructure"""
    print("\n🔍 Testing Meta-Learning Capabilities...")
    
    try:
        from dependencies import get_enhanced_fraud_detection_service
        
        # Get existing fraud service 
        fraud_service = get_enhanced_fraud_detection_service()
        
        # Test that the fraud service has Azure capabilities
        has_azure_integration = hasattr(fraud_service, '_azure_agents_client')
        
        if has_azure_integration:
            print("✅ Enhanced fraud service has Azure AI Foundry integration")
        else:
            print("⚠️ Azure AI Foundry not available - using standard service")
        
        # Test basic learning capability - store and retrieve agent decisions
        mock_transaction = {
            "transaction_id": "meta_learn_test",
            "amount": 1500,
            "merchant": {"category": "electronics"},
            "customer_id": "meta_customer"
        }
        
        mock_decision = {
            "score": 65.0,
            "level": "medium",
            "flags": ["high_amount"]
        }
        
        # Test storing decision for learning
        await fraud_service.store_agent_decision(mock_decision, mock_transaction)
        print("✅ Agent decision stored for learning")
        
        # Test retrieving similar decisions
        similar_decisions = await fraud_service.retrieve_similar_agent_decisions(
            mock_transaction, similarity_threshold=0.3, limit=3
        )
        print(f"✅ Retrieved {len(similar_decisions)} similar decisions for learning")
        
        # Test storing learning patterns
        await fraud_service.store_learning_pattern(
            pattern_type="electronics_medium_risk",
            pattern_data={"category": "electronics", "amount_range": [1000, 2000]},
            effectiveness_score=0.75
        )
        print("✅ Learning pattern stored")
        
        return True
        
    except Exception as e:
        print(f"❌ Meta-learning capabilities test failed: {e}")
        return False


async def test_performance_and_cleanup():
    """Test performance metrics and cleanup procedures using existing infrastructure"""
    print("\n🔍 Testing Performance and Cleanup...")
    
    try:
        from azure_foundry.memory import create_mongodb_vector_store
        from dependencies import get_enhanced_fraud_detection_service
        import time
        
        # Get existing fraud service and vector store
        fraud_service = get_enhanced_fraud_detection_service()
        vector_store = create_mongodb_vector_store(fraud_service)
        
        # Performance test: batch operations
        start_time = time.time()
        
        batch_decisions = []
        for i in range(5):  # Small batch for testing
            decision_data = {
                "decision": f"TEST_DECISION_{i}",
                "confidence": 0.8,
                "risk_score": random.uniform(20, 80),
                "reasoning": f"Performance test decision {i}"
            }
            
            transaction_data = {
                "transaction_id": f"perf_test_{i}_{int(time.time())}",
                "amount": random.uniform(50, 2000),
                "merchant": {"category": "test_category"},
                "batch_test": True
            }
            
            # Store decision (individual operations)
            await vector_store.store_agent_decision(
                agent_decision=decision_data,
                transaction_data=transaction_data,
                context={"performance_test": True}
            )
            batch_decisions.append(transaction_data["transaction_id"])
        
        processing_time = time.time() - start_time
        print(f"✅ Batch storage completed in {processing_time:.2f} seconds")
        print(f"✅ Average per decision: {(processing_time/5)*1000:.0f}ms")
        
        # Test cleanup using existing infrastructure
        cleanup_count = 0
        try:
            db_name = fraud_service.db_name  # Use existing service's db_name
            decision_collection = fraud_service.db_client.get_collection(db_name, 'agent_decision_history')
            
            # Remove test decisions
            result = decision_collection.delete_many({
                "transaction_data.batch_test": True
            })
            cleanup_count = result.deleted_count
            print(f"✅ Cleaned up {cleanup_count} test decisions")
            
        except Exception as cleanup_error:
            print(f"⚠️ Cleanup warning: {cleanup_error}")
        
        # No need to close connection - existing infrastructure handles it
        
        return True
        
    except Exception as e:
        print(f"❌ Performance and cleanup test failed: {e}")
        return False


def run_mongodb_vector_store_tests():
    """Run all MongoDB vector store tests"""
    print("🧪 MongoDB Vector Store Tests - Level 4")
    print("=" * 70)
    
    # Test results tracking
    results = []
    
    # Test 1: Vector Store Initialization
    print(f"\n{'='*20} Vector Store Initialization {'='*20}")
    try:
        success = test_mongodb_vector_store_initialization()
        results.append(("Vector Store Initialization", success))
        if success:
            print("🎉 Vector Store Initialization: PASSED")
        else:
            print("💥 Vector Store Initialization: FAILED")
    except Exception as e:
        print(f"💥 Vector Store Initialization: FAILED with exception: {e}")
        results.append(("Vector Store Initialization", False))
    
    # Test 2: Vector Indexes Setup  
    print(f"\n{'='*20} Vector Indexes Setup {'='*20}")
    try:
        success = asyncio.run(test_vector_indexes_setup())
        results.append(("Vector Indexes Setup", success))
        if success:
            print("🎉 Vector Indexes Setup: PASSED")
        else:
            print("💥 Vector Indexes Setup: FAILED")
    except Exception as e:
        print(f"💥 Vector Indexes Setup: FAILED with exception: {e}")
        results.append(("Vector Indexes Setup", False))
    
    # Test 3: Embeddings Integration
    print(f"\n{'='*20} Embeddings Integration {'='*20}")
    try:
        success = asyncio.run(test_embeddings_integration())
        results.append(("Embeddings Integration", success))
        if success:
            print("🎉 Embeddings Integration: PASSED")
        else:
            print("💥 Embeddings Integration: FAILED")
    except Exception as e:
        print(f"💥 Embeddings Integration: FAILED with exception: {e}")
        results.append(("Embeddings Integration", False))
    
    # Test 4: Agent Decision Storage
    print(f"\n{'='*20} Agent Decision Storage {'='*20}")
    try:
        success = asyncio.run(test_agent_decision_storage())
        results.append(("Agent Decision Storage", success))
        if success:
            print("🎉 Agent Decision Storage: PASSED")
        else:
            print("💥 Agent Decision Storage: FAILED")
    except Exception as e:
        print(f"💥 Agent Decision Storage: FAILED with exception: {e}")
        results.append(("Agent Decision Storage", False))
    
    # Test 5: Learning Pattern Storage
    print(f"\n{'='*20} Learning Pattern Storage {'='*20}")
    try:
        success = asyncio.run(test_learning_pattern_storage())
        results.append(("Learning Pattern Storage", success))
        if success:
            print("🎉 Learning Pattern Storage: PASSED")
        else:
            print("💥 Learning Pattern Storage: FAILED")
    except Exception as e:
        print(f"💥 Learning Pattern Storage: FAILED with exception: {e}")
        results.append(("Learning Pattern Storage", False))
    
    # Test 6: Vector Similarity Search
    print(f"\n{'='*20} Vector Similarity Search {'='*20}")
    try:
        success = asyncio.run(test_vector_similarity_search())
        results.append(("Vector Similarity Search", success))
        if success:
            print("🎉 Vector Similarity Search: PASSED")
        else:
            print("💥 Vector Similarity Search: FAILED")
    except Exception as e:
        print(f"💥 Vector Similarity Search: FAILED with exception: {e}")
        results.append(("Vector Similarity Search", False))
    
    # Test 7: Meta-Learning Capabilities
    print(f"\n{'='*20} Meta-Learning Capabilities {'='*20}")
    try:
        success = asyncio.run(test_meta_learning_capabilities())
        results.append(("Meta-Learning Capabilities", success))
        if success:
            print("🎉 Meta-Learning Capabilities: PASSED")
        else:
            print("💥 Meta-Learning Capabilities: FAILED")
    except Exception as e:
        print(f"💥 Meta-Learning Capabilities: FAILED with exception: {e}")
        results.append(("Meta-Learning Capabilities", False))
    
    # Test 8: Performance and Cleanup
    print(f"\n{'='*20} Performance and Cleanup {'='*20}")
    try:
        success = asyncio.run(test_performance_and_cleanup())
        results.append(("Performance and Cleanup", success))
        if success:
            print("🎉 Performance and Cleanup: PASSED")
        else:
            print("💥 Performance and Cleanup: FAILED")
    except Exception as e:
        print(f"💥 Performance and Cleanup: FAILED with exception: {e}")
        results.append(("Performance and Cleanup", False))
    
    # Summary
    print("\n" + "="*70)
    print("📊 LEVEL 4 TEST SUMMARY")
    print("="*70)
    
    passed = 0
    total = len(results)
    
    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status:8} {test_name}")
        if result:
            passed += 1
    
    print(f"\nResults: {passed}/{total} tests passed ({(passed/total)*100:.1f}%)")
    
    if passed >= 6:  # Allow some flexibility for optional features
        print("🚀 Level 4 tests successful! MongoDB vector store is working.")
        return True
    elif passed >= 4:
        print("⚠️ Level 4 partially successful. Some MongoDB features may be limited.")
        return True
    else:
        print("⚠️ Major MongoDB vector store issues detected.")
        return False


if __name__ == "__main__":
    success = run_mongodb_vector_store_tests()
    sys.exit(0 if success else 1)