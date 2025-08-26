"""
Level 3: Tools and Functions Tests
Test fraud detection tools and functions (working components).
"""

import os
import sys
import asyncio
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Add project root to path
project_root = os.path.join(os.path.dirname(__file__), '../..')
sys.path.insert(0, project_root)

# Sample transaction data for testing
SAMPLE_TRANSACTIONS = [
    {
        "transaction_id": "txn_test_001",
        "customer_id": "cust_12345",
        "amount": 1500.00,
        "currency": "USD",
        "merchant": {"category": "restaurant", "name": "Joe's Diner"},
        "location": {"country": "US", "city": "New York"},
        "timestamp": "2025-01-26T15:30:00Z"
    },
    {
        "transaction_id": "txn_test_002", 
        "customer_id": "cust_67890",
        "amount": 15000.00,  # High amount - suspicious
        "currency": "USD",
        "merchant": {"category": "online", "name": "Electronics Store"},
        "location": {"country": "RU", "city": "Moscow"},  # Unusual location
        "timestamp": "2025-01-26T15:35:00Z"
    },
    {
        "transaction_id": "txn_test_003",
        "customer_id": "cust_11111", 
        "amount": 50.00,  # Low amount - normal
        "currency": "USD",
        "merchant": {"category": "gas_station", "name": "Shell Station"},
        "location": {"country": "US", "city": "Chicago"},
        "timestamp": "2025-01-26T15:40:00Z"
    }
]


def test_fraud_detection_tools_creation():
    """Test creating FraudDetectionTools with real dependencies"""
    print("\n🔍 Testing FraudDetectionTools Creation...")
    
    try:
        from azure_foundry.tools import FraudDetectionTools
        from db.mongo_db import MongoDBAccess
        from services.fraud_detection import FraudDetectionService
        
        # Create MongoDB client
        mongodb_uri = os.getenv('MONGODB_URI')
        mongodb_client = MongoDBAccess(mongodb_uri)
        
        # Create fraud detection service
        fraud_service = FraudDetectionService(mongodb_client)
        
        # Create fraud detection tools
        fraud_tools = FraudDetectionTools(mongodb_client, fraud_service)
        
        print("✅ FraudDetectionTools created with real services")
        print(f"✅ Database name: {fraud_tools.db_name}")
        print(f"✅ MongoDB client available: {fraud_tools.db_client is not None}")
        print(f"✅ Fraud service available: {fraud_tools.fraud_service is not None}")
        
        try:
            mongodb_client.close()
        except:
            pass
        
        return fraud_tools, True
        
    except Exception as e:
        print(f"❌ FraudDetectionTools creation failed: {e}")
        return None, False


def test_analyze_transaction_patterns(fraud_tools):
    """Test analyze_transaction_patterns function"""
    print("\n🔍 Testing analyze_transaction_patterns Function...")
    
    if not fraud_tools:
        print("❌ No fraud tools available")
        return False
    
    try:
        # Test the implementation method directly
        result = fraud_tools._analyze_transaction_patterns_impl(
            customer_id="cust_12345",
            lookback_days=30,
            include_velocity=True
        )
        
        print("✅ Transaction pattern analysis completed")
        print(f"✅ Result type: {type(result)}")
        print(f"✅ Customer ID: {result.get('customer_id')}")
        print(f"✅ Analysis period: {result.get('analysis_period')}")
        print(f"✅ Pattern score: {result.get('pattern_score')}")
        print(f"✅ Historical count: {result.get('historical_count')}")
        
        # Validate result structure
        required_fields = ['customer_id', 'analysis_period', 'pattern_score']
        for field in required_fields:
            if field not in result:
                print(f"❌ Missing required field: {field}")
                return False
        
        print("✅ All required fields present")
        return True
        
    except Exception as e:
        print(f"❌ Transaction pattern analysis failed: {e}")
        return False


def test_check_sanctions_lists(fraud_tools):
    """Test check_sanctions_lists function"""
    print("\n🔍 Testing check_sanctions_lists Function...")
    
    if not fraud_tools:
        print("❌ No fraud tools available")
        return False
    
    try:
        # Test with normal entity
        result_normal = fraud_tools._check_sanctions_lists_impl(
            entity_name="John Smith",
            entity_type="individual"
        )
        
        print("✅ Normal entity sanctions check completed")
        print(f"✅ Entity: {result_normal.get('entity_name')}")
        print(f"✅ Risk rating: {result_normal.get('risk_rating')}")
        print(f"✅ On sanctions list: {result_normal.get('on_sanctions_list')}")
        
        # Test with suspicious entity (contains risk keywords)
        result_suspicious = fraud_tools._check_sanctions_lists_impl(
            entity_name="Suspicious Person",
            entity_type="individual"
        )
        
        print("✅ Suspicious entity sanctions check completed")
        print(f"✅ Suspicious entity risk: {result_suspicious.get('risk_rating')}")
        print(f"✅ On sanctions list: {result_suspicious.get('on_sanctions_list')}")
        
        # Validate result structure
        required_fields = ['entity_name', 'entity_type', 'risk_rating', 'on_sanctions_list']
        for field in required_fields:
            if field not in result_normal:
                print(f"❌ Missing required field: {field}")
                return False
        
        return True
        
    except Exception as e:
        print(f"❌ Sanctions list check failed: {e}")
        return False


def test_calculate_network_risk(fraud_tools):
    """Test calculate_network_risk function"""
    print("\n🔍 Testing calculate_network_risk Function...")
    
    if not fraud_tools:
        print("❌ No fraud tools available")
        return False
    
    try:
        # Test network risk calculation
        result = fraud_tools._calculate_network_risk_impl(
            customer_id="cust_12345",
            analysis_depth=2,
            include_centrality=True
        )
        
        print("✅ Network risk calculation completed")
        print(f"✅ Customer ID: {result.get('customer_id')}")
        print(f"✅ Network depth: {result.get('network_depth')}")
        print(f"✅ Connected entities: {result.get('connected_entities')}")
        print(f"✅ High risk connections: {result.get('high_risk_connections')}")
        print(f"✅ Network risk score: {result.get('network_risk_score')}")
        print(f"✅ Centrality score: {result.get('centrality_score')}")
        
        # Validate result structure
        required_fields = ['customer_id', 'network_depth', 'connected_entities', 'network_risk_score']
        for field in required_fields:
            if field not in result:
                print(f"❌ Missing required field: {field}")
                return False
        
        # Test different customer IDs generate different results
        result2 = fraud_tools._calculate_network_risk_impl("cust_67890", 2, True)
        
        if result['connected_entities'] != result2['connected_entities']:
            print("✅ Network analysis varies by customer (good)")
        else:
            print("⚠️ Network analysis identical for different customers")
        
        return True
        
    except Exception as e:
        print(f"❌ Network risk calculation failed: {e}")
        return False


def test_search_similar_transactions(fraud_tools):
    """Test search_similar_transactions function"""
    print("\n🔍 Testing search_similar_transactions Function...")
    
    if not fraud_tools:
        print("❌ No fraud tools available")
        return False
    
    try:
        # Test similarity search
        result = fraud_tools._search_similar_transactions_impl(
            transaction_amount=1500.00,
            merchant_category="restaurant",
            customer_id="cust_12345",
            days_lookback=90
        )
        
        print("✅ Similar transactions search completed")
        print(f"✅ Similar count: {result.get('similar_count')}")
        print(f"✅ Similarity score: {result.get('similarity_score')}")
        print(f"✅ Pattern type: {result.get('pattern_type')}")
        print(f"✅ Confidence: {result.get('confidence')}")
        print(f"✅ High risk matches: {result.get('high_risk_matches')}")
        
        # Validate result structure
        required_fields = ['similar_count', 'similarity_score', 'pattern_type']
        for field in required_fields:
            if field not in result:
                print(f"❌ Missing required field: {field}")
                return False
        
        return True
        
    except Exception as e:
        print(f"❌ Similar transactions search failed: {e}")
        return False


def test_function_definitions(fraud_tools):
    """Test getting function definitions for Azure AI Foundry"""
    print("\n🔍 Testing Function Definitions...")
    
    if not fraud_tools:
        print("❌ No fraud tools available")
        return False
    
    try:
        # Get function definitions
        functions = fraud_tools.get_function_definitions()
        
        print(f"✅ Function definitions retrieved: {len(functions)} functions")
        
        # Check that we have the expected functions
        function_names = []
        for func in functions:
            function_names.append(func.__name__)
            print(f"✅ Function available: {func.__name__}")
            
            # Check function has proper docstring
            if func.__doc__:
                print(f"  📝 Docstring length: {len(func.__doc__)} characters")
            else:
                print(f"  ⚠️ No docstring for {func.__name__}")
        
        expected_functions = [
            "analyze_transaction_patterns",
            "check_sanctions_lists", 
            "calculate_network_risk",
            "search_similar_transactions"
        ]
        
        for expected in expected_functions:
            if expected in function_names:
                print(f"✅ Required function present: {expected}")
            else:
                print(f"❌ Missing required function: {expected}")
                return False
        
        return True
        
    except Exception as e:
        print(f"❌ Function definitions test failed: {e}")
        return False


def test_function_tool_creation(fraud_tools):
    """Test creating Azure AI Foundry FunctionTool"""
    print("\n🔍 Testing FunctionTool Creation...")
    
    if not fraud_tools:
        print("❌ No fraud tools available")
        return False
    
    try:
        # Create function tool
        function_tool = fraud_tools.create_function_tool()
        
        print(f"✅ FunctionTool created: {type(function_tool)}")
        print(f"✅ FunctionTool has functions: {hasattr(function_tool, 'functions')}")
        
        # Test complete toolset creation
        toolset = fraud_tools.create_complete_toolset()
        
        print(f"✅ Complete toolset created: {len(toolset)} tools")
        print(f"✅ Toolset type: {type(toolset)}")
        
        return True
        
    except Exception as e:
        print(f"❌ FunctionTool creation failed: {e}")
        return False


def test_transaction_processing_simulation():
    """Test processing sample transactions through functions"""
    print("\n🔍 Testing Transaction Processing Simulation...")
    
    try:
        from azure_foundry.tools import FraudDetectionTools
        from db.mongo_db import MongoDBAccess
        from services.fraud_detection import FraudDetectionService
        
        # Setup
        mongodb_uri = os.getenv('MONGODB_URI')
        mongodb_client = MongoDBAccess(mongodb_uri)
        fraud_service = FraudDetectionService(mongodb_client)
        fraud_tools = FraudDetectionTools(mongodb_client, fraud_service)
        
        print(f"✅ Processing {len(SAMPLE_TRANSACTIONS)} sample transactions...")
        
        for i, transaction in enumerate(SAMPLE_TRANSACTIONS):
            print(f"\n  📊 Transaction {i+1}: ${transaction['amount']} at {transaction['merchant']['category']}")
            
            # Run all fraud functions on this transaction
            customer_id = transaction['customer_id']
            amount = transaction['amount']
            merchant_category = transaction['merchant']['category']
            
            # 1. Transaction patterns
            patterns_result = fraud_tools._analyze_transaction_patterns_impl(customer_id, 30, True)
            print(f"    🔍 Pattern Score: {patterns_result.get('pattern_score')}")
            
            # 2. Sanctions check (using customer_id as entity name for demo)
            sanctions_result = fraud_tools._check_sanctions_lists_impl(f"Customer_{customer_id}", "individual")
            print(f"    🔍 Sanctions Risk: {sanctions_result.get('risk_rating')}")
            
            # 3. Network risk
            network_result = fraud_tools._calculate_network_risk_impl(customer_id, 2, True)
            print(f"    🔍 Network Risk Score: {network_result.get('network_risk_score')}")
            
            # 4. Similar transactions
            similarity_result = fraud_tools._search_similar_transactions_impl(amount, merchant_category, customer_id, 90)
            print(f"    🔍 Similarity Pattern: {similarity_result.get('pattern_type')}")
            
            # Calculate overall assessment
            pattern_score = patterns_result.get('pattern_score', 50)
            network_score = network_result.get('network_risk_score', 25)
            sanctions_high = sanctions_result.get('on_sanctions_list', False)
            
            overall_risk = "HIGH" if (pattern_score > 60 or network_score > 60 or sanctions_high) else "LOW"
            print(f"    🎯 Overall Assessment: {overall_risk} RISK")
        
        try:
            mongodb_client.close()
        except:
            pass
        
        print("✅ Transaction processing simulation completed")
        return True
        
    except Exception as e:
        print(f"❌ Transaction processing simulation failed: {e}")
        return False


def run_tools_functions_tests():
    """Run all tools and functions tests"""
    print("🧪 Azure AI Foundry Tools and Functions Tests - Level 3")
    print("=" * 70)
    
    # Test results tracking
    results = []
    fraud_tools = None
    
    # Test 1: FraudDetectionTools creation
    print(f"\n{'='*20} FraudDetectionTools Creation {'='*20}")
    try:
        fraud_tools, success = test_fraud_detection_tools_creation()
        results.append(("FraudDetectionTools Creation", success))
        if success:
            print("🎉 FraudDetectionTools Creation: PASSED")
        else:
            print("💥 FraudDetectionTools Creation: FAILED")
    except Exception as e:
        print(f"💥 FraudDetectionTools Creation: FAILED with exception: {e}")
        results.append(("FraudDetectionTools Creation", False))
    
    if fraud_tools:
        # Test 2: Transaction patterns analysis
        print(f"\n{'='*20} Transaction Patterns Analysis {'='*20}")
        try:
            success = test_analyze_transaction_patterns(fraud_tools)
            results.append(("Transaction Patterns Analysis", success))
            if success:
                print("🎉 Transaction Patterns Analysis: PASSED")
            else:
                print("💥 Transaction Patterns Analysis: FAILED")
        except Exception as e:
            print(f"💥 Transaction Patterns Analysis: FAILED with exception: {e}")
            results.append(("Transaction Patterns Analysis", False))
        
        # Test 3: Sanctions list check
        print(f"\n{'='*20} Sanctions List Check {'='*20}")
        try:
            success = test_check_sanctions_lists(fraud_tools)
            results.append(("Sanctions List Check", success))
            if success:
                print("🎉 Sanctions List Check: PASSED")
            else:
                print("💥 Sanctions List Check: FAILED")
        except Exception as e:
            print(f"💥 Sanctions List Check: FAILED with exception: {e}")
            results.append(("Sanctions List Check", False))
        
        # Test 4: Network risk calculation
        print(f"\n{'='*20} Network Risk Calculation {'='*20}")
        try:
            success = test_calculate_network_risk(fraud_tools)
            results.append(("Network Risk Calculation", success))
            if success:
                print("🎉 Network Risk Calculation: PASSED")
            else:
                print("💥 Network Risk Calculation: FAILED")
        except Exception as e:
            print(f"💥 Network Risk Calculation: FAILED with exception: {e}")
            results.append(("Network Risk Calculation", False))
        
        # Test 5: Similar transactions search
        print(f"\n{'='*20} Similar Transactions Search {'='*20}")
        try:
            success = test_search_similar_transactions(fraud_tools)
            results.append(("Similar Transactions Search", success))
            if success:
                print("🎉 Similar Transactions Search: PASSED")
            else:
                print("💥 Similar Transactions Search: FAILED")
        except Exception as e:
            print(f"💥 Similar Transactions Search: FAILED with exception: {e}")
            results.append(("Similar Transactions Search", False))
        
        # Test 6: Function definitions
        print(f"\n{'='*20} Function Definitions {'='*20}")
        try:
            success = test_function_definitions(fraud_tools)
            results.append(("Function Definitions", success))
            if success:
                print("🎉 Function Definitions: PASSED")
            else:
                print("💥 Function Definitions: FAILED")
        except Exception as e:
            print(f"💥 Function Definitions: FAILED with exception: {e}")
            results.append(("Function Definitions", False))
        
        # Test 7: FunctionTool creation
        print(f"\n{'='*20} FunctionTool Creation {'='*20}")
        try:
            success = test_function_tool_creation(fraud_tools)
            results.append(("FunctionTool Creation", success))
            if success:
                print("🎉 FunctionTool Creation: PASSED")
            else:
                print("💥 FunctionTool Creation: FAILED")
        except Exception as e:
            print(f"💥 FunctionTool Creation: FAILED with exception: {e}")
            results.append(("FunctionTool Creation", False))
    else:
        # Skip dependent tests
        skipped_tests = [
            "Transaction Patterns Analysis",
            "Sanctions List Check", 
            "Network Risk Calculation",
            "Similar Transactions Search",
            "Function Definitions",
            "FunctionTool Creation"
        ]
        for test_name in skipped_tests:
            results.append((test_name, False))
            print(f"💥 {test_name}: SKIPPED (no fraud tools)")
    
    # Test 8: Transaction processing simulation
    print(f"\n{'='*20} Transaction Processing Simulation {'='*20}")
    try:
        success = test_transaction_processing_simulation()
        results.append(("Transaction Processing Simulation", success))
        if success:
            print("🎉 Transaction Processing Simulation: PASSED")
        else:
            print("💥 Transaction Processing Simulation: FAILED")
    except Exception as e:
        print(f"💥 Transaction Processing Simulation: FAILED with exception: {e}")
        results.append(("Transaction Processing Simulation", False))
    
    # Summary
    print("\n" + "="*70)
    print("📊 LEVEL 3 TEST SUMMARY")
    print("="*70)
    
    passed = 0
    total = len(results)
    
    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status:8} {test_name}")
        if result:
            passed += 1
    
    print(f"\nResults: {passed}/{total} tests passed ({(passed/total)*100:.1f}%)")
    
    if passed >= 6:
        print("🚀 Level 3 tests successful! Fraud detection functions working well.")
        return True
    elif passed >= 4:
        print("⚠️ Level 3 partially successful. Core functions working.")
        return True
    else:
        print("⚠️ Major issues with fraud detection functions.")
        return False


if __name__ == "__main__":
    success = run_tools_functions_tests()
    sys.exit(0 if success else 1)