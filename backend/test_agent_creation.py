#!/usr/bin/env python3
"""
Test agent creation with different authentication methods.
"""

import os
from dotenv import load_dotenv
from azure.core.credentials import AzureKeyCredential
from azure.identity import DefaultAzureCredential

load_dotenv()

def test_agent_creation():
    """Test creating agents with different auth methods"""
    print("🔍 Testing Agent Creation...")
    
    try:
        from azure.ai.agents import AgentsClient
        
        project_endpoint = os.getenv('AZURE_AI_PROJECT_ENDPOINT')
        api_key = os.getenv('AZURE_AI_API_KEY')
        model_deployment = os.getenv('AGENT_MODEL_DEPLOYMENT', 'gpt-4o')
        
        print(f"Endpoint: {project_endpoint}")
        print(f"Model: {model_deployment}")
        
        # Test with AzureKeyCredential
        print("\n🔑 Testing AzureKeyCredential...")
        try:
            credential = AzureKeyCredential(api_key)
            client = AgentsClient(endpoint=project_endpoint, credential=credential)
            
            agent = client.create_agent(
                model=model_deployment,
                name="test-fraud-agent-key",
                instructions="You are a fraud detection assistant.",
                temperature=0.3
            )
            print(f"✅ Agent created with API key: {agent.id}")
            
            # Clean up
            try:
                client.delete_agent(agent.id)
                print(f"✅ Agent deleted: {agent.id}")
            except:
                pass
                
        except Exception as e:
            print(f"❌ AzureKeyCredential failed: {e}")
        
        # Test with DefaultAzureCredential
        print("\n🔑 Testing DefaultAzureCredential...")
        try:
            credential = DefaultAzureCredential()
            client = AgentsClient(endpoint=project_endpoint, credential=credential)
            
            agent = client.create_agent(
                model=model_deployment,
                name="test-fraud-agent-default",
                instructions="You are a fraud detection assistant.",
                temperature=0.3
            )
            print(f"✅ Agent created with default credential: {agent.id}")
            
            # Clean up
            try:
                client.delete_agent(agent.id)
                print(f"✅ Agent deleted: {agent.id}")
            except:
                pass
                
        except Exception as e:
            print(f"❌ DefaultAzureCredential failed: {e}")
            
        # Test token credential inspection
        print("\n🔍 Inspecting Credential Types...")
        
        key_credential = AzureKeyCredential(api_key)
        default_credential = DefaultAzureCredential()
        
        print(f"AzureKeyCredential methods: {[m for m in dir(key_credential) if not m.startswith('_')]}")
        print(f"DefaultAzureCredential methods: {[m for m in dir(default_credential) if not m.startswith('_')]}")
        
        # Check if get_token exists
        print(f"AzureKeyCredential has get_token: {hasattr(key_credential, 'get_token')}")
        print(f"DefaultAzureCredential has get_token: {hasattr(default_credential, 'get_token')}")
        
    except Exception as e:
        print(f"❌ Failed to test agent creation: {e}")

if __name__ == "__main__":
    print("🧪 Testing Agent Creation")
    print("=" * 50)
    test_agent_creation()