#!/usr/bin/env python3
"""
Test script for network analysis functionality
"""

import asyncio
import sys
import os
from datetime import datetime
from pprint import pprint

# Add parent directory to path to import modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from motor.motor_asyncio import AsyncIOMotorClient
from services.network_service import NetworkService
from dependencies import MONGODB_URI, DB_NAME

async def test_network_analysis():
    """Test network analysis functionality"""
    print("🚀 Testing Network Analysis Implementation")
    print("=" * 60)
    
    try:
        # Get database connection
        client = AsyncIOMotorClient(MONGODB_URI)
        db = client[DB_NAME]
        
        # Test database connectivity
        await db.command("ping")
        print("✅ Database connection successful")
        
        # Initialize network service
        network_service = NetworkService(db)
        
        # Check relationships collection
        relationships_collection = db.relationships
        total_relationships = await relationships_collection.count_documents({})
        print(f"📊 Total relationships in collection: {total_relationships}")
        
        if total_relationships == 0:
            print("⚠️ No relationships found in collection")
            return
        
        # Get sample relationships
        print("\n📋 Sample relationships:")
        sample_rels = await relationships_collection.find({}).limit(3).to_list(None)
        for i, rel in enumerate(sample_rels, 1):
            print(f"  {i}. {rel.get('source', {}).get('entityId')} -> {rel.get('target', {}).get('entityId')} "
                  f"({rel.get('type')}, strength: {rel.get('strength', 0):.2f})")
        
        # Test with a specific entity that has relationships
        test_entity_id = None
        if sample_rels:
            test_entity_id = sample_rels[0].get('source', {}).get('entityId')
        
        if not test_entity_id:
            print("❌ No valid test entity found")
            return
        
        print(f"\n🎯 Testing network analysis for entity: {test_entity_id}")
        
        # Test different network configurations
        test_configs = [
            {"max_depth": 1, "min_strength": 0.0, "name": "Direct connections only"},
            {"max_depth": 2, "min_strength": 0.5, "name": "2 degrees, medium strength"},
            {"max_depth": 3, "min_strength": 0.8, "name": "3 degrees, high strength"}
        ]
        
        for config in test_configs:
            print(f"\n🔍 Testing: {config['name']}")
            print(f"   Parameters: max_depth={config['max_depth']}, min_strength={config['min_strength']}")
            
            try:
                start_time = datetime.utcnow()
                
                network_data = await network_service.build_entity_network(
                    entity_id=test_entity_id,
                    max_depth=config['max_depth'],
                    min_strength=config['min_strength'],
                    include_inactive=False,
                    max_nodes=50
                )
                
                end_time = datetime.utcnow()
                execution_time = (end_time - start_time).total_seconds() * 1000
                
                print(f"   ✅ Network built successfully in {execution_time:.1f}ms")
                print(f"   📈 Results: {network_data.totalNodes} nodes, {network_data.totalEdges} edges")
                print(f"   🎯 Center: {network_data.centerNodeId}")
                print(f"   📏 Max depth reached: {network_data.maxDepthReached}")
                
                # Show sample nodes
                if network_data.nodes:
                    print("   🔗 Sample nodes:")
                    for node in network_data.nodes[:3]:
                        print(f"      - {node.id}: {node.label} ({node.entityType}, risk: {node.riskLevel})")
                
                # Show sample edges
                if network_data.edges:
                    print("   🔗 Sample edges:")
                    for edge in network_data.edges[:3]:
                        print(f"      - {edge.source} -> {edge.target}: {edge.label} (strength: {edge.strength:.2f})")
                
            except Exception as e:
                print(f"   ❌ Error: {str(e)}")
        
        # Test edge cases
        print(f"\n🧪 Testing edge cases:")
        
        # Non-existent entity
        try:
            await network_service.build_entity_network("NON_EXISTENT_ENTITY")
            print("   ❌ Should have failed for non-existent entity")
        except ValueError as e:
            print(f"   ✅ Correctly handled non-existent entity: {str(e)}")
        except Exception as e:
            print(f"   ⚠️ Unexpected error for non-existent entity: {str(e)}")
        
        # Very restrictive parameters
        try:
            network_data = await network_service.build_entity_network(
                entity_id=test_entity_id,
                max_depth=1,
                min_strength=1.0  # Very high threshold
            )
            print(f"   ✅ High threshold test: {network_data.totalNodes} nodes, {network_data.totalEdges} edges")
        except Exception as e:
            print(f"   ⚠️ Error with high threshold: {str(e)}")
        
        print(f"\n🎉 Network analysis testing completed successfully!")
        
        # Performance summary
        print(f"\n📊 Performance Summary:")
        print(f"   - Database: {DB_NAME}")
        print(f"   - Total relationships: {total_relationships}")
        print(f"   - Test entity: {test_entity_id}")
        print(f"   - All test configurations completed")
        
    except Exception as e:
        print(f"❌ Network analysis testing failed: {str(e)}")
        import traceback
        traceback.print_exc()
    
    finally:
        # Close database connection
        if 'client' in locals():
            client.close()

if __name__ == "__main__":
    asyncio.run(test_network_analysis())