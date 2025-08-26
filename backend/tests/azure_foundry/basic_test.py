"""
Simple basic test without pytest - checking core functionality
"""

import os
import sys
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Add project root to path
project_root = os.path.join(os.path.dirname(__file__), '../..')
sys.path.insert(0, project_root)

def test_environment_setup():
    """Test that environment variables are properly configured"""
    print("\n🔍 Testing Environment Setup...")
    
    # MongoDB
    mongodb_uri = os.getenv('MONGODB_URI')
    db_name = os.getenv('DB_NAME')
    print(f"✅ MongoDB URI: {mongodb_uri[:30]}..." if mongodb_uri else "❌ MongoDB URI missing")
    print(f"✅ DB Name: {db_name}" if db_name else "❌ DB Name missing")
    
    # Azure AI Foundry
    project_endpoint = os.getenv('AZURE_AI_PROJECT_ENDPOINT')
    api_key = os.getenv('AZURE_AI_API_KEY')
    inference_endpoint = os.getenv('INFERENCE_ENDPOINT')
    embedding_model = os.getenv('EMBEDDING_MODEL')
    
    print(f"✅ Project Endpoint: {project_endpoint}" if project_endpoint else "❌ Project Endpoint missing")
    print(f"✅ API Key: {'[CONFIGURED]' if api_key else '❌ API Key missing'}")
    print(f"✅ Inference Endpoint: {inference_endpoint}" if inference_endpoint else "❌ Inference Endpoint missing")
    print(f"✅ Embedding Model: {embedding_model}" if embedding_model else "❌ Embedding Model missing")
    
    return all([mongodb_uri, db_name, project_endpoint, api_key, inference_endpoint, embedding_model])

def test_imports():
    """Test that all modules can be imported"""
    print("\n🔍 Testing Imports...")
    
    try:
        from azure_foundry.conversation import NativeConversationHandler
        print("✅ Conversation module imported")
    except Exception as e:
        print(f"❌ Conversation import failed: {e}")
        return False
    
    try:
        from azure_foundry.tools import create_fraud_toolset, FraudDetectionTools
        print("✅ Tools module imported")
    except Exception as e:
        print(f"❌ Tools import failed: {e}")
        return False
    
    try:
        from azure_foundry.memory import create_mongodb_vector_store, MongoDBAtlasIntegration
        print("✅ Memory module imported")
    except Exception as e:
        print(f"❌ Memory import failed: {e}")
        return False
    
    try:
        from azure_foundry.learning import create_hybrid_learning_system, HybridLearningSystem
        print("✅ Learning module imported")
    except Exception as e:
        print(f"❌ Learning import failed: {e}")
        return False
    
    try:
        from azure_foundry.embeddings import get_embedding, AzureFoundryEmbeddings
        print("✅ Embeddings module imported")
    except Exception as e:
        print(f"❌ Embeddings import failed: {e}")
        return False
    
    try:
        from azure_foundry.agent_core import TwoStageAgentCore
        print("✅ Agent core module imported")
    except Exception as e:
        print(f"❌ Agent core import failed: {e}")
        return False
    
    return True

def test_azure_clients():
    """Test Azure client imports"""
    print("\n🔍 Testing Azure Client Imports...")
    
    try:
        from azure.ai.agents import AgentsClient
        from azure.ai.agents.models import FunctionTool
        print("✅ Azure AI Agents client imported")
    except Exception as e:
        print(f"❌ Azure Agents client import failed: {e}")
        return False
    
    try:
        from azure.ai.inference import EmbeddingsClient
        print("✅ Azure AI Inference client imported")
    except Exception as e:
        print(f"❌ Azure Inference client import failed: {e}")
        return False
    
    try:
        from azure.identity import DefaultAzureCredential
        from azure.core.credentials import AzureKeyCredential
        print("✅ Azure credentials imported")
    except Exception as e:
        print(f"❌ Azure credentials import failed: {e}")
        return False
    
    return True

def test_mongodb_connection():
    """Test MongoDB connection"""
    print("\n🔍 Testing MongoDB Connection...")
    
    try:
        from db.mongo_db import MongoDBAccess
        mongodb_uri = os.getenv('MONGODB_URI')
        mongodb_client = MongoDBAccess(mongodb_uri)
        print("✅ MongoDB client created")
        
        # Test basic collection access
        db_name = os.getenv('DB_NAME')
        test_collection = mongodb_client.get_collection(db_name, 'test_connection')
        print(f"✅ MongoDB collection access successful: {db_name}")
        
        try:
            mongodb_client.close()
        except:
            pass
        
        return True
    except Exception as e:
        print(f"❌ MongoDB connection failed: {e}")
        return False

def test_embeddings_service():
    """Test Azure embeddings service initialization"""
    print("\n🔍 Testing Azure Embeddings Service...")
    
    try:
        from azure_foundry.embeddings import AzureFoundryEmbeddings, get_embedding_model
        
        # Test initialization (won't connect, just create object)
        model = get_embedding_model()
        print("✅ Azure embeddings model initialized")
        
        # Check configuration
        print(f"✅ Endpoint configured: {model.endpoint is not None}")
        print(f"✅ Model name: {model.model_name}")
        
        return True
    except Exception as e:
        print(f"❌ Azure embeddings initialization failed: {e}")
        return False

def test_component_initialization():
    """Test component initialization without full connection"""
    print("\n🔍 Testing Component Initialization...")
    
    try:
        # Test tools initialization
        from azure_foundry.tools import FraudDetectionTools
        from db.mongo_db import MongoDBAccess
        
        mongodb_uri = os.getenv('MONGODB_URI')
        mongodb_client = MongoDBAccess(mongodb_uri)
        
        # Mock fraud service
        class MockFraudService:
            def __init__(self, db_client):
                self.db_client = db_client
        
        fraud_service = MockFraudService(mongodb_client)
        tools = FraudDetectionTools(mongodb_client, fraud_service)
        print("✅ FraudDetectionTools initialized")
        
        # Test vector store initialization
        from azure_foundry.memory import MongoDBAtlasIntegration
        vector_store = MongoDBAtlasIntegration(mongodb_client)
        print("✅ MongoDB vector store initialized")
        
        # Test agent config
        from azure_foundry.config import get_demo_agent_config
        config = get_demo_agent_config()
        print("✅ Agent configuration created")
        print(f"✅ Model: {config.model_deployment}")
        
        try:
            mongodb_client.close()
        except:
            pass
        
        return True
    except Exception as e:
        print(f"❌ Component initialization failed: {e}")
        return False

def run_all_tests():
    """Run all basic tests"""
    print("🧪 Azure AI Foundry Two-Stage Agent - Basic Component Tests")
    print("=" * 70)
    
    tests = [
        ("Environment Setup", test_environment_setup),
        ("Module Imports", test_imports),
        ("Azure Client Imports", test_azure_clients),
        ("MongoDB Connection", test_mongodb_connection),
        ("Embeddings Service", test_embeddings_service),
        ("Component Initialization", test_component_initialization)
    ]
    
    results = []
    for test_name, test_func in tests:
        print(f"\n{'='*20} {test_name} {'='*20}")
        try:
            result = test_func()
            results.append((test_name, result))
            if result:
                print(f"🎉 {test_name}: PASSED")
            else:
                print(f"💥 {test_name}: FAILED")
        except Exception as e:
            print(f"💥 {test_name}: FAILED with exception: {e}")
            results.append((test_name, False))
    
    # Summary
    print("\n" + "="*70)
    print("📊 TEST SUMMARY")
    print("="*70)
    
    passed = 0
    total = len(results)
    
    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status:8} {test_name}")
        if result:
            passed += 1
    
    print(f"\nResults: {passed}/{total} tests passed ({(passed/total)*100:.1f}%)")
    
    if passed == total:
        print("🚀 All basic tests passed! Ready for Level 2 tests.")
        return True
    else:
        print("⚠️  Some tests failed. Fix issues before proceeding to Level 2.")
        return False

if __name__ == "__main__":
    success = run_all_tests()
    sys.exit(0 if success else 1)