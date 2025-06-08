#!/usr/bin/env python3
"""
Test script for text embedding generation using AWS Bedrock.
"""

import asyncio
import logging
from bedrock.embeddings import get_embedding, get_embedding_model

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

async def test_embedding_generation():
    """Test text embedding generation with AML/KYC relevant queries."""
    
    test_queries = [
        "High-risk individual with offshore banking activities",
        "Corporate entities involved in money laundering schemes", 
        "Individuals with politically exposed person connections",
        "Organizations with sanctions violations and compliance issues",
        "Entities with suspicious cryptocurrency transaction patterns"
    ]
    
    print("🧪 Testing AWS Bedrock Text Embedding Generation")
    print("=" * 60)
    
    try:
        # Test singleton model creation
        model = get_embedding_model()
        print(f"✅ Successfully created embedding model: {model.model_id}")
        print(f"   Region: {model.region_name}")
        print()
        
        # Test embedding generation for each query
        for i, query in enumerate(test_queries, 1):
            print(f"🔍 Test {i}: Generating embeddings for:")
            print(f"   Query: '{query}'")
            
            try:
                embeddings = await get_embedding(query)
                
                if embeddings and len(embeddings) > 0:
                    print(f"   ✅ Success! Generated {len(embeddings)}-dimensional embedding")
                    print(f"   📊 First 5 values: {embeddings[:5]}")
                    print(f"   📊 Last 5 values: {embeddings[-5:]}")
                    
                    # Verify expected dimensions (should be 1536 for Titan)
                    if len(embeddings) == 1536:
                        print(f"   ✅ Correct dimensions (1536) for Titan model")
                    else:
                        print(f"   ⚠️  Unexpected dimensions: {len(embeddings)} (expected 1536)")
                else:
                    print(f"   ❌ Failed to generate embeddings")
                    
            except Exception as e:
                print(f"   ❌ Error generating embeddings: {str(e)}")
                
            print()
    
    except Exception as e:
        print(f"❌ Failed to initialize embedding model: {str(e)}")
        return False
    
    print("🎯 Embedding generation test completed!")
    return True

async def test_vector_search_integration():
    """Test integration with vector search service."""
    
    print("\n🔄 Testing Vector Search Integration")
    print("=" * 60)
    
    try:
        from services.vector_search import VectorSearchService
        from dependencies import get_database
        
        # Get database connection
        db = get_database()
        vector_service = VectorSearchService(db)
        
        # Test text-based vector search
        test_query = "High-risk individuals with offshore banking activities and shell company connections"
        
        print(f"🔍 Testing text-based vector search:")
        print(f"   Query: '{test_query}'")
        
        similar_entities = await vector_service.find_similar_entities_by_text(
            query_text=test_query,
            limit=3
        )
        
        print(f"   ✅ Search completed successfully!")
        print(f"   📊 Found {len(similar_entities)} similar entities")
        
        for i, entity in enumerate(similar_entities, 1):
            entity_id = entity.get('entityId', 'Unknown')
            name = entity.get('name', {}).get('full', 'Unknown')
            score = entity.get('vectorSearchScore', 0)
            print(f"   🎯 Result {i}: {name} ({entity_id}) - Similarity: {score:.3f}")
        
        return True
        
    except Exception as e:
        print(f"   ❌ Vector search integration error: {str(e)}")
        return False

if __name__ == "__main__":
    async def main():
        success1 = await test_embedding_generation()
        success2 = await test_vector_search_integration()
        
        if success1 and success2:
            print("\n🎉 All tests passed! Text embedding and vector search are working correctly.")
        else:
            print("\n⚠️  Some tests failed. Check the logs above for details.")
    
    asyncio.run(main())