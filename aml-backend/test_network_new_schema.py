#!/usr/bin/env python3
"""
Test script for Network Analysis with new relationships collection schema
Tests basic network retrieval functionality after Phase 1 updates
"""

import asyncio
import sys
import os
from datetime import datetime

# Add project root to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from reference.mongodb_core_lib import MongoDBRepository
from repositories.impl.network_repository import NetworkRepository
from repositories.interfaces.network_repository import NetworkQueryParams
from models.core.network import RelationshipType
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv

load_dotenv()


async def test_network_retrieval():
    """Test basic network retrieval with new schema"""
    print("🔍 Testing Network Analysis with New Schema")
    print("=" * 60)
    
    try:
        # Initialize MongoDB connection
        mongodb_uri = os.getenv("MONGODB_URI")
        db_name = os.getenv("DB_NAME", "fsi-threatsight360")
        
        if not mongodb_uri:
            print("❌ MONGODB_URI not found in environment variables")
            return
            
        mongodb_repo = MongoDBRepository(mongodb_uri, db_name)
        network_repo = NetworkRepository(mongodb_repo)
        
        print("✅ MongoDB connection established")
        print(f"✅ Using collection: relationships")
        
        # Check if relationships collection exists and has data
        relationships_collection = mongodb_repo.collection("relationships")
        total_relationships = await relationships_collection.count_documents({})
        print(f"📊 Total relationships in collection: {total_relationships}")
        
        if total_relationships == 0:
            print("⚠️  No relationships found in collection")
            print("   Make sure relationships collection is populated with data")
            return
        
        # Get a sample relationship to check schema
        sample_rel = await relationships_collection.find_one({})
        if sample_rel:
            print("📋 Sample relationship structure:")
            print(f"   Fields: {list(sample_rel.keys())}")
            if "source" in sample_rel:
                print(f"   Source structure: {sample_rel['source']}")
            if "target" in sample_rel:
                print(f"   Target structure: {sample_rel['target']}")
            print(f"   Type: {sample_rel.get('type', 'N/A')}")
            print(f"   Active: {sample_rel.get('active', 'N/A')}")
            print(f"   Confidence: {sample_rel.get('confidence', 'N/A')}")
        
        # Find entities with relationships
        entities_with_rels = await relationships_collection.distinct("source.entityId")
        if not entities_with_rels:
            entities_with_rels = await relationships_collection.distinct("source_entity_id")  # fallback
        
        print(f"🔗 Entities with relationships: {len(entities_with_rels)}")
        
        if entities_with_rels:
            # Test network retrieval with the first entity
            test_entity_id = entities_with_rels[0]
            print(f"\n🎯 Testing network retrieval for entity: {test_entity_id}")
            
            # Create network query parameters
            params = NetworkQueryParams(
                center_entity_id=test_entity_id,
                max_depth=2,
                min_confidence=0.0,  # Lower threshold to get more results
                only_verified=False,
                only_active=True,
                max_entities=50,
                max_relationships=100
            )
            
            # Execute network retrieval
            start_time = datetime.utcnow()
            network_data = await network_repo.build_entity_network(params)
            end_time = datetime.utcnow()
            
            execution_time = (end_time - start_time).total_seconds() * 1000
            
            print(f"⏱️  Network retrieval completed in {execution_time:.2f}ms")
            print(f"📊 Network Results:")
            print(f"   • Nodes: {len(network_data.nodes)}")
            print(f"   • Edges: {len(network_data.edges)}")
            print(f"   • Max depth reached: {network_data.max_depth_reached}")
            print(f"   • Center entity: {network_data.center_entity_id}")
            
            # Display sample nodes and edges
            if network_data.nodes:
                print(f"\n📋 Sample Nodes (first 3):")
                for i, node in enumerate(network_data.nodes[:3]):
                    print(f"   {i+1}. {node.entity_name} ({node.entity_type}) - Risk: {node.risk_level}")
            
            if network_data.edges:
                print(f"\n🔗 Sample Edges (first 3):")
                for i, edge in enumerate(network_data.edges[:3]):
                    print(f"   {i+1}. {edge.relationship_type} - Confidence: {edge.confidence:.2f}")
            
            # Test relationship type filtering
            print(f"\n🔍 Testing relationship type filtering...")
            
            # Get relationship types in the data
            rel_types_in_data = set()
            all_rels = await relationships_collection.find(
                {"$or": [
                    {"source.entityId": test_entity_id}, 
                    {"target.entityId": test_entity_id}
                ]}
            ).to_list(None)
            
            for rel in all_rels:
                rel_types_in_data.add(rel.get("type", "unknown"))
            
            print(f"   Available relationship types: {list(rel_types_in_data)}")
            
            # Test with specific relationship type if available
            if rel_types_in_data:
                test_rel_type = list(rel_types_in_data)[0]
                print(f"   Testing filter for type: {test_rel_type}")
                
                # Convert string to RelationshipType if possible
                try:
                    rel_type_enum = RelationshipType(test_rel_type)
                    filtered_params = NetworkQueryParams(
                        center_entity_id=test_entity_id,
                        max_depth=2,
                        relationship_types=[rel_type_enum],
                        min_confidence=0.0,
                        only_active=True,
                        max_entities=50,
                        max_relationships=100
                    )
                    
                    filtered_network = await network_repo.build_entity_network(filtered_params)
                    print(f"   Filtered results: {len(filtered_network.edges)} edges")
                    
                except ValueError:
                    print(f"   ⚠️  Relationship type '{test_rel_type}' not in enum - may need to add it")
            
            print("\n✅ Network retrieval test completed successfully!")
            
        else:
            print("❌ No entities with relationships found")
            
    except Exception as e:
        print(f"❌ Test failed with error: {e}")
        import traceback
        traceback.print_exc()
    
    finally:
        if 'mongodb_repo' in locals():
            mongodb_repo.client.close()


if __name__ == "__main__":
    asyncio.run(test_network_retrieval())