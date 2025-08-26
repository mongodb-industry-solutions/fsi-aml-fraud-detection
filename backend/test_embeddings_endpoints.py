#!/usr/bin/env python3
"""
Test different Azure embedding endpoint configurations to find the correct one.
"""

import os
from dotenv import load_dotenv
from azure.core.credentials import AzureKeyCredential

load_dotenv()

# Test configurations
TEST_TEXT = "fraud detection test"

def test_azure_ai_inference():
    """Test with Azure AI Inference client"""
    print("🔍 Testing Azure AI Inference Client...")
    try:
        from azure.ai.inference import EmbeddingsClient
        
        endpoint = os.getenv('EMBEDDING_TARGET_URI')
        api_key = os.getenv('AZURE_AI_API_KEY')
        model = os.getenv('EMBEDDING_MODEL')
        
        print(f"Endpoint: {endpoint}")
        print(f"Model: {model}")
        
        credential = AzureKeyCredential(api_key)
        client = EmbeddingsClient(endpoint=endpoint, credential=credential)
        
        result = client.embed(input=[TEST_TEXT], model=model)
        print(f"✅ Success with Azure AI Inference: {len(result.data[0].embedding)} dimensions")
        return True
        
    except Exception as e:
        print(f"❌ Azure AI Inference failed: {e}")
        return False

def test_azure_openai():
    """Test with Azure OpenAI client"""
    print("\n🔍 Testing Azure OpenAI Client...")
    try:
        from openai import AzureOpenAI
        
        endpoint = os.getenv('AZURE_OPENAI_ENDPOINT')
        api_key = os.getenv('AZURE_OPENAI_API_KEY')
        deployment = os.getenv('AZURE_OPENAI_EMBEDDING_DEPLOYMENT')
        api_version = os.getenv('AZURE_OPENAI_EMBEDDING_API_VERSION')
        
        print(f"Endpoint: {endpoint}")
        print(f"Deployment: {deployment}")
        print(f"API Version: {api_version}")
        
        client = AzureOpenAI(
            azure_endpoint=endpoint,
            api_key=api_key,
            api_version=api_version
        )
        
        result = client.embeddings.create(
            input=[TEST_TEXT],
            model=deployment
        )
        print(f"✅ Success with Azure OpenAI: {len(result.data[0].embedding)} dimensions")
        return True
        
    except Exception as e:
        print(f"❌ Azure OpenAI failed: {e}")
        return False

def test_base_endpoint():
    """Test with base Azure OpenAI endpoint (no query params)"""
    print("\n🔍 Testing Base Endpoint...")
    try:
        from azure.ai.inference import EmbeddingsClient
        
        # Use base endpoint without query params
        base_endpoint = os.getenv('AZURE_OPENAI_ENDPOINT')
        api_key = os.getenv('AZURE_AI_API_KEY')
        model = os.getenv('EMBEDDING_MODEL')
        
        print(f"Base Endpoint: {base_endpoint}")
        print(f"Model: {model}")
        
        credential = AzureKeyCredential(api_key)
        client = EmbeddingsClient(endpoint=base_endpoint, credential=credential)
        
        result = client.embed(input=[TEST_TEXT], model=model)
        print(f"✅ Success with base endpoint: {len(result.data[0].embedding)} dimensions")
        return True
        
    except Exception as e:
        print(f"❌ Base endpoint failed: {e}")
        return False

if __name__ == "__main__":
    print("🧪 Testing Azure Embedding Endpoints")
    print("=" * 50)
    
    # Show environment variables
    print("\n📋 Environment Variables:")
    print(f"AZURE_OPENAI_ENDPOINT: {os.getenv('AZURE_OPENAI_ENDPOINT')}")
    print(f"AZURE_AI_API_KEY: {'[SET]' if os.getenv('AZURE_AI_API_KEY') else '[MISSING]'}")
    print(f"EMBEDDING_TARGET_URI: {os.getenv('EMBEDDING_TARGET_URI')}")
    print(f"EMBEDDING_MODEL: {os.getenv('EMBEDDING_MODEL')}")
    print(f"AZURE_OPENAI_EMBEDDING_DEPLOYMENT: {os.getenv('AZURE_OPENAI_EMBEDDING_DEPLOYMENT')}")
    
    # Run tests
    results = []
    results.append(("Azure AI Inference", test_azure_ai_inference()))
    results.append(("Azure OpenAI", test_azure_openai()))
    results.append(("Base Endpoint", test_base_endpoint()))
    
    # Summary
    print("\n" + "=" * 50)
    print("📊 Test Results:")
    for name, success in results:
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {name}")
    
    # Recommendation
    successful_tests = [name for name, success in results if success]
    if successful_tests:
        print(f"\n🎯 Recommendation: Use {successful_tests[0]} approach")
    else:
        print("\n⚠️ No successful configurations found. Check credentials and endpoints.")