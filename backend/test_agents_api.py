#!/usr/bin/env python3
"""
Test Azure AI Agents API methods to understand the correct interface.
"""

import os
from dotenv import load_dotenv
from azure.core.credentials import AzureKeyCredential
from azure.identity import DefaultAzureCredential

load_dotenv()

def test_agents_api_methods():
    """Test what methods are available on AgentsClient"""
    print("🔍 Testing Azure AI Agents API Methods...")
    
    try:
        from azure.ai.agents import AgentsClient
        
        project_endpoint = os.getenv('AZURE_AI_PROJECT_ENDPOINT')
        api_key = os.getenv('AZURE_AI_API_KEY')
        
        print(f"Project Endpoint: {project_endpoint}")
        print(f"API Key: {'[SET]' if api_key else '[MISSING]'}")
        
        # Try different authentication methods
        print("\n🔑 Testing Authentication Methods...")
        
        # Method 1: AzureKeyCredential
        try:
            credential = AzureKeyCredential(api_key)
            client = AgentsClient(endpoint=project_endpoint, credential=credential)
            print("✅ AzureKeyCredential client created")
            
            # List available methods
            methods = [method for method in dir(client) if not method.startswith('_')]
            print(f"📋 Available methods: {sorted(methods)}")
            
        except Exception as e:
            print(f"❌ AzureKeyCredential failed: {e}")
        
        # Method 2: DefaultAzureCredential
        try:
            credential = DefaultAzureCredential()
            client = AgentsClient(endpoint=project_endpoint, credential=credential)
            print("✅ DefaultAzureCredential client created")
            
        except Exception as e:
            print(f"❌ DefaultAzureCredential failed: {e}")
        
        # Test specific methods if client was created
        if 'client' in locals():
            print("\n🧪 Testing Available Methods...")
            
            # Check for agent-related methods
            agent_methods = [method for method in dir(client) if 'agent' in method.lower()]
            print(f"Agent methods: {agent_methods}")
            
            # Check for thread-related methods
            thread_methods = [method for method in dir(client) if 'thread' in method.lower()]
            print(f"Thread methods: {thread_methods}")
            
            # Check for run-related methods
            run_methods = [method for method in dir(client) if 'run' in method.lower()]
            print(f"Run methods: {run_methods}")
            
            # Check if it has sub-clients
            if hasattr(client, 'agents'):
                print("✅ Has agents sub-client")
                agent_sub_methods = [method for method in dir(client.agents) if not method.startswith('_')]
                print(f"Agent sub-methods: {sorted(agent_sub_methods)}")
            
            if hasattr(client, 'threads'):
                print("✅ Has threads sub-client")
                thread_sub_methods = [method for method in dir(client.threads) if not method.startswith('_')]
                print(f"Thread sub-methods: {sorted(thread_sub_methods)}")
            
            if hasattr(client, 'runs'):
                print("✅ Has runs sub-client")
                run_sub_methods = [method for method in dir(client.runs) if not method.startswith('_')]
                print(f"Run sub-methods: {sorted(run_sub_methods)}")
            
            if hasattr(client, 'messages'):
                print("✅ Has messages sub-client")
                message_sub_methods = [method for method in dir(client.messages) if not method.startswith('_')]
                print(f"Message sub-methods: {sorted(message_sub_methods)}")
        
    except Exception as e:
        print(f"❌ Failed to test agents API: {e}")
        return False
    
    return True

if __name__ == "__main__":
    print("🧪 Testing Azure AI Agents API Methods")
    print("=" * 50)
    test_agents_api_methods()