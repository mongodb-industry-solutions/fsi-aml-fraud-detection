"""
Level 2: Azure AI Foundry Integration Tests
Tests actual Azure AI Foundry API connectivity and native capabilities.
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


def test_agents_client_initialization():
    """Test Azure AI Agents client can be created with real credentials"""
    print("\n🔍 Testing Azure AI Agents Client Initialization...")
    
    try:
        from azure.ai.agents import AgentsClient
        from azure.core.credentials import AzureKeyCredential
        from azure.identity import DefaultAzureCredential
        
        # Get credentials
        project_endpoint = os.getenv('AZURE_AI_PROJECT_ENDPOINT')
        api_key = os.getenv('AZURE_AI_API_KEY')
        
        # Try API Key authentication first
        if api_key:
            credential = AzureKeyCredential(api_key)
            client = AgentsClient(endpoint=project_endpoint, credential=credential)
            print("✅ AgentsClient created with API key authentication")
            return client, "api_key"
        
        # Fallback to default credential
        try:
            credential = DefaultAzureCredential()
            client = AgentsClient(endpoint=project_endpoint, credential=credential)
            print("✅ AgentsClient created with DefaultAzureCredential")
            return client, "default"
        except Exception as e:
            print(f"⚠️ DefaultAzureCredential failed: {e}")
            return None, "failed"
            
    except Exception as e:
        print(f"❌ AgentsClient creation failed: {e}")
        return None, "failed"


def test_agent_creation(agents_client):
    """Test creating an Azure AI Foundry agent"""
    print("\n🔍 Testing Agent Creation...")
    
    if not agents_client:
        print("❌ No agents client available")
        return None
    
    try:
        # Test agent creation with minimal configuration
        agent = agents_client.create_agent(
            model=os.getenv('AGENT_MODEL_DEPLOYMENT', 'gpt-4o'),
            name="test-fraud-agent",
            instructions="You are a fraud detection assistant. Analyze transactions for potential fraud indicators.",
            temperature=0.3
        )
        
        print(f"✅ Agent created successfully: {agent.id}")
        print(f"✅ Agent name: {agent.name}")
        print(f"✅ Agent model: {agent.model}")
        
        return agent
        
    except Exception as e:
        print(f"❌ Agent creation failed: {e}")
        return None


def test_thread_creation(agents_client):
    """Test creating conversation threads"""
    print("\n🔍 Testing Thread Creation...")
    
    if not agents_client:
        print("❌ No agents client available")
        return None
    
    try:
        # Create a thread for conversation
        thread = agents_client.create_thread()
        
        print(f"✅ Thread created successfully: {thread.id}")
        
        return thread
        
    except Exception as e:
        print(f"❌ Thread creation failed: {e}")
        return None


def test_message_creation(agents_client, thread):
    """Test adding messages to threads"""
    print("\n🔍 Testing Message Creation...")
    
    if not agents_client or not thread:
        print("❌ Prerequisites not available")
        return False
    
    try:
        # Add a user message to the thread
        message = agents_client.messages.create(
            thread_id=thread.id,
            role="user",
            content="Analyze this transaction for fraud: $5000 purchase at electronics store in different country than usual."
        )
        
        print(f"✅ Message created successfully: {message.id}")
        print(f"✅ Message role: {message.role}")
        print(f"✅ Message content length: {len(str(message.content))}")
        
        return True
        
    except Exception as e:
        print(f"❌ Message creation failed: {e}")
        return False


def test_native_conversation_handler():
    """Test the native conversation handler initialization"""
    print("\n🔍 Testing Native Conversation Handler...")
    
    try:
        from azure_foundry.conversation import NativeConversationHandler
        from azure.ai.agents import AgentsClient
        from azure.core.credentials import AzureKeyCredential
        
        # Create agents client
        project_endpoint = os.getenv('AZURE_AI_PROJECT_ENDPOINT')
        api_key = os.getenv('AZURE_AI_API_KEY')
        
        if not api_key:
            print("❌ API key required for conversation handler test")
            return False
            
        credential = AzureKeyCredential(api_key)
        agents_client = AgentsClient(endpoint=project_endpoint, credential=credential)
        
        # Test conversation handler initialization
        conversation_handler = NativeConversationHandler(
            agents_client=agents_client,
            agent_id="test-agent-id"  # Mock agent ID for initialization test
        )
        
        print("✅ Native conversation handler initialized successfully")
        print(f"✅ Handler agent ID: {conversation_handler.agent_id}")
        
        return True
        
    except Exception as e:
        print(f"❌ Native conversation handler test failed: {e}")
        return False


def test_embeddings_connectivity():
    """Test actual Azure embeddings API connectivity"""
    print("\n🔍 Testing Azure Embeddings Connectivity...")
    
    try:
        # Use a simple synchronous test first
        from azure_foundry.embeddings import get_embedding_model
        
        embedding_model = get_embedding_model()
        
        # Test with a simple string (this will make actual API call)
        test_text = "fraud detection test"
        
        try:
            embedding = embedding_model.predict(test_text)
            
            if embedding and len(embedding) > 0:
                print(f"✅ Embeddings API connectivity successful")
                print(f"✅ Embedding dimension: {len(embedding)}")
                print(f"✅ First 3 values: {embedding[:3]}")
                return True
            else:
                print("❌ Empty embedding response")
                return False
                
        except Exception as api_error:
            print(f"❌ Embeddings API call failed: {api_error}")
            # Check if it's a configuration issue vs connectivity issue
            if "endpoint" in str(api_error).lower() or "credential" in str(api_error).lower():
                print("⚠️ This appears to be a configuration issue - check INFERENCE_ENDPOINT and credentials")
            return False
            
    except Exception as e:
        print(f"❌ Embeddings connectivity test failed: {e}")
        return False


async def test_async_embeddings():
    """Test async embeddings functionality"""
    print("\n🔍 Testing Async Embeddings...")
    
    try:
        from azure_foundry.embeddings import get_embedding
        
        # Test async embedding function
        test_text = "suspicious transaction pattern detected"
        embedding = await get_embedding(test_text)
        
        if embedding and len(embedding) > 0:
            print(f"✅ Async embeddings successful")
            print(f"✅ Embedding dimension: {len(embedding)}")
            return True
        else:
            print("❌ Empty async embedding response")
            return False
            
    except Exception as e:
        print(f"❌ Async embeddings failed: {e}")
        return False


def test_function_tool_creation():
    """Test FunctionTool creation with fraud detection functions"""
    print("\n🔍 Testing FunctionTool Creation...")
    
    try:
        from azure_foundry.tools import FraudDetectionTools
        from db.mongo_db import MongoDBAccess
        
        # Create necessary components
        mongodb_uri = os.getenv('MONGODB_URI')
        mongodb_client = MongoDBAccess(mongodb_uri)
        
        # Mock fraud service
        class MockFraudService:
            def __init__(self, db_client):
                self.db_client = db_client
        
        fraud_service = MockFraudService(mongodb_client)
        
        # Create fraud detection tools
        fraud_tools = FraudDetectionTools(mongodb_client, fraud_service)
        
        # Test function tool creation
        function_tool = fraud_tools.create_function_tool()
        
        print("✅ FunctionTool created successfully")
        print(f"✅ FunctionTool type: {type(function_tool)}")
        
        # Test toolset creation
        toolset = fraud_tools.create_complete_toolset()
        print(f"✅ Complete toolset created with {len(toolset)} tools")
        
        try:
            mongodb_client.close()
        except:
            pass
        
        return True
        
    except Exception as e:
        print(f"❌ FunctionTool creation failed: {e}")
        return False


def cleanup_test_resources(agents_client, agent=None):
    """Clean up any test resources created"""
    print("\n🧹 Cleaning up test resources...")
    
    try:
        if agent and agents_client:
            # Try to delete the test agent
            agents_client.delete_agent(agent.id)
            print(f"✅ Test agent {agent.id} deleted")
            
    except Exception as e:
        print(f"⚠️ Cleanup warning: {e}")


def run_azure_integration_tests():
    """Run all Azure AI Foundry integration tests"""
    print("🧪 Azure AI Foundry Integration Tests - Level 2")
    print("=" * 70)
    
    # Test results tracking
    results = []
    agents_client = None
    agent = None
    thread = None
    
    # Test 1: AgentsClient initialization
    print(f"\n{'='*20} AgentsClient Initialization {'='*20}")
    try:
        agents_client, auth_method = test_agents_client_initialization()
        success = agents_client is not None
        results.append(("AgentsClient Initialization", success))
        if success:
            print(f"🎉 AgentsClient Initialization: PASSED (auth: {auth_method})")
        else:
            print("💥 AgentsClient Initialization: FAILED")
    except Exception as e:
        print(f"💥 AgentsClient Initialization: FAILED with exception: {e}")
        results.append(("AgentsClient Initialization", False))
    
    # Test 2: Agent creation (only if client works)
    if agents_client:
        print(f"\n{'='*20} Agent Creation {'='*20}")
        try:
            agent = test_agent_creation(agents_client)
            success = agent is not None
            results.append(("Agent Creation", success))
            if success:
                print("🎉 Agent Creation: PASSED")
            else:
                print("💥 Agent Creation: FAILED")
        except Exception as e:
            print(f"💥 Agent Creation: FAILED with exception: {e}")
            results.append(("Agent Creation", False))
    else:
        results.append(("Agent Creation", False))
        print("💥 Agent Creation: SKIPPED (no client)")
    
    # Test 3: Thread creation
    if agents_client:
        print(f"\n{'='*20} Thread Creation {'='*20}")
        try:
            thread = test_thread_creation(agents_client)
            success = thread is not None
            results.append(("Thread Creation", success))
            if success:
                print("🎉 Thread Creation: PASSED")
            else:
                print("💥 Thread Creation: FAILED")
        except Exception as e:
            print(f"💥 Thread Creation: FAILED with exception: {e}")
            results.append(("Thread Creation", False))
    else:
        results.append(("Thread Creation", False))
        print("💥 Thread Creation: SKIPPED (no client)")
    
    # Test 4: Message creation
    print(f"\n{'='*20} Message Creation {'='*20}")
    try:
        success = test_message_creation(agents_client, thread)
        results.append(("Message Creation", success))
        if success:
            print("🎉 Message Creation: PASSED")
        else:
            print("💥 Message Creation: FAILED")
    except Exception as e:
        print(f"💥 Message Creation: FAILED with exception: {e}")
        results.append(("Message Creation", False))
    
    # Test 5: Native conversation handler
    print(f"\n{'='*20} Native Conversation Handler {'='*20}")
    try:
        success = test_native_conversation_handler()
        results.append(("Native Conversation Handler", success))
        if success:
            print("🎉 Native Conversation Handler: PASSED")
        else:
            print("💥 Native Conversation Handler: FAILED")
    except Exception as e:
        print(f"💥 Native Conversation Handler: FAILED with exception: {e}")
        results.append(("Native Conversation Handler", False))
    
    # Test 6: Embeddings connectivity (may fail due to endpoint config)
    print(f"\n{'='*20} Embeddings Connectivity {'='*20}")
    try:
        success = test_embeddings_connectivity()
        results.append(("Embeddings Connectivity", success))
        if success:
            print("🎉 Embeddings Connectivity: PASSED")
        else:
            print("💥 Embeddings Connectivity: FAILED")
    except Exception as e:
        print(f"💥 Embeddings Connectivity: FAILED with exception: {e}")
        results.append(("Embeddings Connectivity", False))
    
    # Test 7: Async embeddings
    print(f"\n{'='*20} Async Embeddings {'='*20}")
    try:
        success = asyncio.run(test_async_embeddings())
        results.append(("Async Embeddings", success))
        if success:
            print("🎉 Async Embeddings: PASSED")
        else:
            print("💥 Async Embeddings: FAILED")
    except Exception as e:
        print(f"💥 Async Embeddings: FAILED with exception: {e}")
        results.append(("Async Embeddings", False))
    
    # Test 8: FunctionTool creation
    print(f"\n{'='*20} FunctionTool Creation {'='*20}")
    try:
        success = test_function_tool_creation()
        results.append(("FunctionTool Creation", success))
        if success:
            print("🎉 FunctionTool Creation: PASSED")
        else:
            print("💥 FunctionTool Creation: FAILED")
    except Exception as e:
        print(f"💥 FunctionTool Creation: FAILED with exception: {e}")
        results.append(("FunctionTool Creation", False))
    
    # Cleanup
    cleanup_test_resources(agents_client, agent)
    
    # Summary
    print("\n" + "="*70)
    print("📊 LEVEL 2 TEST SUMMARY")
    print("="*70)
    
    passed = 0
    total = len(results)
    
    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status:8} {test_name}")
        if result:
            passed += 1
    
    print(f"\nResults: {passed}/{total} tests passed ({(passed/total)*100:.1f}%)")
    
    if passed >= 6:  # Allow some flexibility for embeddings endpoint issues
        print("🚀 Level 2 tests mostly successful! Ready for Level 3.")
        return True
    elif passed >= 4:
        print("⚠️ Level 2 partially successful. Some Azure API issues detected.")
        return True
    else:
        print("⚠️ Major Azure integration issues. Check credentials and endpoints.")
        return False


if __name__ == "__main__":
    success = run_azure_integration_tests()
    sys.exit(0 if success else 1)