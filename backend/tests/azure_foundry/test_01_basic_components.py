"""
Level 1: Basic Component Tests
Tests individual components work in isolation before integration testing.
"""

import pytest
import os
import sys
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Add project root to path
project_root = os.path.join(os.path.dirname(__file__), '../..')
sys.path.insert(0, project_root)


class TestEnvironmentSetup:
    """Test that environment variables are properly configured"""
    
    def test_mongodb_env_vars(self):
        """Test MongoDB environment variables are set"""
        assert os.getenv('MONGODB_URI'), "MONGODB_URI environment variable not set"
        assert os.getenv('DB_NAME'), "DB_NAME environment variable not set"
        
        # Verify MongoDB URI format
        mongodb_uri = os.getenv('MONGODB_URI')
        assert mongodb_uri.startswith('mongodb'), f"Invalid MongoDB URI format: {mongodb_uri}"
        print(f"✅ MongoDB URI configured: {mongodb_uri[:20]}...")
    
    def test_azure_env_vars(self):
        """Test Azure AI Foundry environment variables are set"""
        assert os.getenv('PROJECT_ENDPOINT'), "PROJECT_ENDPOINT environment variable not set"
        assert os.getenv('AZURE_AI_API_KEY'), "AZURE_AI_API_KEY environment variable not set"
        assert os.getenv('INFERENCE_ENDPOINT'), "INFERENCE_ENDPOINT environment variable not set"
        assert os.getenv('EMBEDDING_MODEL'), "EMBEDDING_MODEL environment variable not set"
        
        # Verify Azure endpoint formats
        project_endpoint = os.getenv('PROJECT_ENDPOINT')
        assert project_endpoint.startswith('https://'), f"Invalid PROJECT_ENDPOINT format: {project_endpoint}"
        
        inference_endpoint = os.getenv('INFERENCE_ENDPOINT')
        assert inference_endpoint.startswith('https://'), f"Invalid INFERENCE_ENDPOINT format: {inference_endpoint}"
        
        print(f"✅ Azure Project Endpoint: {project_endpoint}")
        print(f"✅ Azure Inference Endpoint: {inference_endpoint}")
        print(f"✅ Embedding Model: {os.getenv('EMBEDDING_MODEL')}")
    
    def test_agent_config_env_vars(self):
        """Test agent configuration environment variables"""
        assert os.getenv('AGENT_MODEL_DEPLOYMENT'), "AGENT_MODEL_DEPLOYMENT not set"
        assert os.getenv('DEMO_MODE'), "DEMO_MODE not set"
        assert os.getenv('AGENT_NAME'), "AGENT_NAME not set"
        
        # Verify values
        demo_mode = os.getenv('DEMO_MODE').lower()
        assert demo_mode in ['true', 'false'], f"DEMO_MODE must be 'true' or 'false', got: {demo_mode}"
        
        print(f"✅ Agent Model: {os.getenv('AGENT_MODEL_DEPLOYMENT')}")
        print(f"✅ Demo Mode: {os.getenv('DEMO_MODE')}")
        print(f"✅ Agent Name: {os.getenv('AGENT_NAME')}")


class TestImports:
    """Test that all new modules can be imported without errors"""
    
    def test_conversation_imports(self):
        """Test conversation module imports"""
        from azure_foundry.conversation import NativeConversationHandler
        print("✅ NativeConversationHandler imported successfully")
    
    def test_tools_imports(self):
        """Test tools module imports"""
        from azure_foundry.tools import create_fraud_toolset, FraudDetectionTools
        print("✅ Fraud detection tools imported successfully")
    
    def test_memory_imports(self):
        """Test memory module imports"""
        from azure_foundry.memory import create_mongodb_vector_store, MongoDBAtlasIntegration
        print("✅ MongoDB vector store imported successfully")
    
    def test_learning_imports(self):
        """Test learning module imports"""
        from azure_foundry.learning import create_hybrid_learning_system, HybridLearningSystem
        print("✅ Hybrid learning system imported successfully")
    
    def test_embeddings_imports(self):
        """Test Azure embeddings imports"""
        from azure_foundry.embeddings import get_embedding, get_batch_embeddings, AzureFoundryEmbeddings
        print("✅ Azure embeddings imported successfully")
    
    def test_agent_core_imports(self):
        """Test enhanced agent core imports"""
        from azure_foundry.agent_core import TwoStageAgentCore
        from azure_foundry.models import AgentConfig, TransactionInput, AgentDecision
        print("✅ Enhanced agent core imported successfully")


class TestMongoDBConnection:
    """Test MongoDB connection and basic operations"""
    
    @pytest.fixture
    def mongodb_client(self):
        """Create MongoDB client for testing"""
        from db.mongo_db import MongoDBAccess
        client = MongoDBAccess()
        yield client
        # Cleanup after test
        try:
            client.close()
        except:
            pass
    
    def test_mongodb_connection(self, mongodb_client):
        """Test MongoDB connection establishment"""
        # Test basic connection
        assert mongodb_client is not None, "MongoDB client creation failed"
        
        # Test database access
        db_name = os.getenv('DB_NAME')
        test_collection = mongodb_client.get_collection(db_name, 'test_connection')
        assert test_collection is not None, "Failed to get test collection"
        
        print(f"✅ MongoDB connection successful to database: {db_name}")
    
    def test_mongodb_basic_operations(self, mongodb_client):
        """Test basic MongoDB CRUD operations"""
        db_name = os.getenv('DB_NAME')
        test_collection = mongodb_client.get_collection(db_name, 'test_basic_ops')
        
        # Test insert
        test_doc = {
            "test_id": "basic_test_001",
            "message": "Azure AI Foundry test document",
            "timestamp": "2025-01-26T15:30:00Z"
        }
        
        result = test_collection.insert_one(test_doc)
        assert result.inserted_id is not None, "Failed to insert test document"
        
        # Test find
        found_doc = test_collection.find_one({"test_id": "basic_test_001"})
        assert found_doc is not None, "Failed to find inserted document"
        assert found_doc['message'] == "Azure AI Foundry test document"
        
        # Test delete (cleanup)
        delete_result = test_collection.delete_one({"test_id": "basic_test_001"})
        assert delete_result.deleted_count == 1, "Failed to delete test document"
        
        print("✅ MongoDB basic CRUD operations successful")


class TestAzureCredentials:
    """Test Azure AI Foundry credential setup"""
    
    def test_azure_credential_creation(self):
        """Test Azure credential creation"""
        from azure.identity import DefaultAzureCredential
        from azure.core.credentials import AzureKeyCredential
        
        # Test API Key credential (should work with env vars)
        api_key = os.getenv('AZURE_AI_API_KEY')
        if api_key:
            credential = AzureKeyCredential(api_key)
            assert credential is not None, "Failed to create AzureKeyCredential"
            print("✅ Azure API Key credential created successfully")
        
        # Test Default credential (fallback)
        try:
            default_credential = DefaultAzureCredential()
            assert default_credential is not None, "Failed to create DefaultAzureCredential"
            print("✅ Azure Default credential created successfully")
        except Exception as e:
            print(f"⚠️  DefaultAzureCredential failed (expected in some environments): {e}")
    
    def test_agents_client_import(self):
        """Test Azure AI Agents client can be imported"""
        from azure.ai.agents import AgentsClient
        from azure.ai.agents.models import FunctionTool
        
        print("✅ Azure AI Agents client imported successfully")
        print("✅ FunctionTool model imported successfully")
    
    def test_embeddings_client_import(self):
        """Test Azure AI Inference client can be imported"""
        from azure.ai.inference import EmbeddingsClient
        
        print("✅ Azure AI Inference EmbeddingsClient imported successfully")


class TestComponentInitialization:
    """Test that components can be initialized (but not necessarily connected)"""
    
    def test_fraud_detection_tools_init(self):
        """Test FraudDetectionTools can be initialized"""
        from azure_foundry.tools import FraudDetectionTools
        from db.mongo_db import MongoDBAccess
        
        # Mock dependencies for initialization test
        mongodb_client = MongoDBAccess()
        
        # Create fraud service mock
        class MockFraudService:
            def __init__(self, db_client):
                self.db_client = db_client
        
        fraud_service = MockFraudService(mongodb_client)
        
        # Test tools initialization
        tools = FraudDetectionTools(mongodb_client, fraud_service)
        assert tools is not None, "FraudDetectionTools initialization failed"
        assert tools.db_client is not None, "FraudDetectionTools db_client not set"
        
        print("✅ FraudDetectionTools initialized successfully")
    
    def test_mongodb_vector_store_init(self):
        """Test MongoDBAtlasIntegration can be initialized"""
        from azure_foundry.memory import MongoDBAtlasIntegration
        from db.mongo_db import MongoDBAccess
        
        mongodb_client = MongoDBAccess()
        vector_store = MongoDBAtlasIntegration(mongodb_client)
        
        assert vector_store is not None, "MongoDBAtlasIntegration initialization failed"
        assert vector_store.db_name == "fsi-threatsight360", "Incorrect database name"
        
        print("✅ MongoDB Atlas vector store initialized successfully")
    
    def test_agent_config_creation(self):
        """Test AgentConfig can be created with environment variables"""
        from azure_foundry.config import get_demo_agent_config
        
        config = get_demo_agent_config()
        
        assert config is not None, "AgentConfig creation failed"
        assert config.demo_mode is True, "Demo mode should be True"
        assert config.project_endpoint is not None, "Project endpoint not set in config"
        
        print("✅ Agent configuration created successfully")
        print(f"✅ Config model: {config.model_deployment}")
        print(f"✅ Config temperature: {config.agent_temperature}")


if __name__ == "__main__":
    # Run tests individually for debugging
    import traceback
    
    print("🧪 Starting Level 1: Basic Component Tests")
    print("=" * 60)
    
    test_classes = [
        TestEnvironmentSetup,
        TestImports,
        TestMongoDBConnection,
        TestAzureCredentials,
        TestComponentInitialization
    ]
    
    for test_class in test_classes:
        print(f"\n🔍 Running {test_class.__name__}...")
        test_instance = test_class()
        
        for method_name in dir(test_instance):
            if method_name.startswith('test_'):
                try:
                    print(f"  Running {method_name}...")
                    # Handle pytest fixtures manually for direct execution
                    if method_name in ['test_mongodb_connection', 'test_mongodb_basic_operations']:
                        from db.mongo_db import MongoDBAccess
                        mongodb_client = MongoDBAccess()
                        getattr(test_instance, method_name)(mongodb_client)
                        try:
                            mongodb_client.close()
                        except:
                            pass
                    else:
                        getattr(test_instance, method_name)()
                    print(f"  ✅ {method_name} PASSED")
                except Exception as e:
                    print(f"  ❌ {method_name} FAILED: {e}")
                    traceback.print_exc()
                    break
    
    print("\n🎉 Level 1 Basic Component Tests Completed!")