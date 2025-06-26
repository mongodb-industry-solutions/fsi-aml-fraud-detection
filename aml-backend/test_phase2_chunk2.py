#!/usr/bin/env python3
"""
Test script for Phase 2 Chunk 2: Centrality Metrics & Hub Detection
Tests enhanced network analysis capabilities with new relationships collection schema
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


async def test_centrality_metrics():
    """Test enhanced centrality metrics calculation"""
    print("📊 Testing Enhanced Centrality Metrics")
    print("=" * 50)
    
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
        
        # Get entities with relationships for testing
        relationships_collection = mongodb_repo.collection("relationships")
        entities_with_rels = await relationships_collection.distinct("source.entityId")
        
        if len(entities_with_rels) < 3:
            print("❌ Need at least 3 entities with relationships for centrality testing")
            return
        
        # Test with first 5 entities for performance
        test_entities = entities_with_rels[:5]
        print(f"🎯 Testing centrality metrics for {len(test_entities)} entities")
        
        # Test basic centrality calculation
        start_time = datetime.utcnow()
        centrality_metrics = await network_repo.calculate_centrality_metrics(
            entity_ids=test_entities,
            max_depth=2,
            include_advanced=True
        )
        end_time = datetime.utcnow()
        
        execution_time = (end_time - start_time).total_seconds() * 1000
        
        print(f"⏱️  Centrality calculation completed in {execution_time:.2f}ms")
        print(f"📊 Centrality Results:")
        print(f"   • Entities analyzed: {len(centrality_metrics)}")
        
        if centrality_metrics:
            print(f"\\n📋 Centrality Metrics Details:")
            for i, (entity_id, metrics) in enumerate(centrality_metrics.items()):
                if i >= 3:  # Show first 3 entities
                    break
                    
                print(f"   {i+1}. Entity: {entity_id}")
                print(f"      • Degree Centrality: {metrics.get('degree_centrality', 0)}")
                print(f"      • Normalized Degree: {metrics.get('normalized_degree_centrality', 0.0):.3f}")
                print(f"      • Weighted Centrality: {metrics.get('weighted_centrality', 0.0):.3f}")
                print(f"      • Risk Weighted: {metrics.get('risk_weighted_centrality', 0.0):.3f}")
                print(f"      • High Confidence Connections: {metrics.get('high_confidence_connections', 0)}")
                print(f"      • Closeness Centrality: {metrics.get('closeness_centrality', 0.0):.3f}")
                print(f"      • Betweenness Centrality: {metrics.get('betweenness_centrality', 0.0):.3f}")
                print(f"      • Eigenvector Centrality: {metrics.get('eigenvector_centrality', 0.0):.3f}")
                print(f"      • Overall Centrality Score: {metrics.get('centrality_score', 0.0):.3f}")
                print()
            
            # Find most central entities
            sorted_entities = sorted(
                centrality_metrics.items(), 
                key=lambda x: x[1].get('centrality_score', 0), 
                reverse=True
            )
            
            print(f"🏆 Most Central Entities:")
            for i, (entity_id, metrics) in enumerate(sorted_entities[:3]):
                score = metrics.get('centrality_score', 0.0)
                degree = metrics.get('degree_centrality', 0)
                print(f"   {i+1}. {entity_id} (score: {score:.3f}, degree: {degree})")
            
            print("\\n✅ Centrality metrics test completed successfully!")
        else:
            print("⚠️  No centrality metrics calculated")
            
    except Exception as e:
        print(f"❌ Centrality metrics test failed: {e}")
        import traceback
        traceback.print_exc()


async def test_hub_detection():
    """Test enhanced hub entity detection"""
    print("\\n🌟 Testing Hub Entity Detection")
    print("=" * 50)
    
    try:
        # Initialize MongoDB connection
        mongodb_uri = os.getenv("MONGODB_URI")
        db_name = os.getenv("DB_NAME", "fsi-threatsight360")
        
        mongodb_repo = MongoDBRepository(mongodb_uri, db_name)
        network_repo = NetworkRepository(mongodb_repo)
        
        print("🎯 Detecting hub entities with enhanced analysis")
        
        # Test basic hub detection
        start_time = datetime.utcnow()
        hub_entities = await network_repo.detect_hub_entities(
            min_connections=1,  # Lower threshold for demo data
            include_risk_analysis=True
        )
        end_time = datetime.utcnow()
        
        execution_time = (end_time - start_time).total_seconds() * 1000
        
        print(f"⏱️  Hub detection completed in {execution_time:.2f}ms")
        print(f"📊 Hub Detection Results:")
        print(f"   • Hub entities found: {len(hub_entities)}")
        
        if hub_entities:
            print(f"\\n📋 Top Hub Entities:")
            for i, hub in enumerate(hub_entities[:5]):  # Show top 5 hubs
                print(f"   {i+1}. {hub.get('entity_name', 'Unknown')} ({hub.get('entity_id', 'N/A')})")
                print(f"      • Total Connections: {hub.get('total_connections', 0)}")
                print(f"      • Outgoing: {hub.get('outgoing_count', 0)}, Incoming: {hub.get('incoming_count', 0)}")
                print(f"      • Average Confidence: {hub.get('avg_confidence', 0.0):.3f}")
                print(f"      • Relationship Types: {len(hub.get('relationship_types', []))}")
                print(f"      • Risk Level: {hub.get('risk_level', 'unknown')}")
                print(f"      • Risk Score: {hub.get('risk_score', 0.0):.3f}")
                print(f"      • Hub Influence Score: {hub.get('hub_influence_score', 0.0):.2f}")
                print(f"      • Entity Type: {hub.get('entity_type', 'unknown')}")
                print()
            
            # Analyze hub characteristics
            total_connections = sum(hub.get('total_connections', 0) for hub in hub_entities)
            avg_connections = total_connections / len(hub_entities) if hub_entities else 0
            
            high_risk_hubs = [hub for hub in hub_entities if hub.get('risk_level') in ['high', 'critical']]
            
            print(f"📈 Hub Analysis:")
            print(f"   • Average connections per hub: {avg_connections:.1f}")
            print(f"   • High-risk hubs: {len(high_risk_hubs)}")
            print(f"   • Total network connections: {total_connections}")
            
            # Test with relationship type filtering
            print(f"\\n🔍 Testing hub detection with relationship type filtering...")
            
            # Get available relationship types
            relationships_collection = mongodb_repo.collection("relationships")
            rel_types_in_data = await relationships_collection.distinct("type")
            
            if rel_types_in_data:
                test_rel_type = rel_types_in_data[0]
                try:
                    rel_type_enum = RelationshipType(test_rel_type)
                    filtered_hubs = await network_repo.detect_hub_entities(
                        min_connections=1,
                        connection_types=[rel_type_enum],
                        include_risk_analysis=False
                    )
                    print(f"   Filtered hubs ({test_rel_type}): {len(filtered_hubs)} entities")
                except ValueError:
                    print(f"   ⚠️  Relationship type '{test_rel_type}' not in enum")
            
            print("\\n✅ Hub detection test completed successfully!")
        else:
            print("⚠️  No hub entities found (try lowering min_connections threshold)")
            
    except Exception as e:
        print(f"❌ Hub detection test failed: {e}")
        import traceback
        traceback.print_exc()


async def test_network_bridges():
    """Test network bridge detection"""
    print("\\n🌉 Testing Network Bridge Detection")
    print("=" * 50)
    
    try:
        # Initialize MongoDB connection
        mongodb_uri = os.getenv("MONGODB_URI")
        db_name = os.getenv("DB_NAME", "fsi-threatsight360")
        
        mongodb_repo = MongoDBRepository(mongodb_uri, db_name)
        network_repo = NetworkRepository(mongodb_repo)
        
        # Get entities for bridge testing
        relationships_collection = mongodb_repo.collection("relationships")
        entities_with_rels = await relationships_collection.distinct("source.entityId")
        
        if len(entities_with_rels) < 5:
            print("❌ Need at least 5 entities for bridge detection testing")
            return
        
        test_entities = entities_with_rels[:10]  # Test with first 10 entities
        print(f"🎯 Finding network bridges among {len(test_entities)} entities")
        
        start_time = datetime.utcnow()
        bridge_entities = await network_repo.find_network_bridges(test_entities)
        end_time = datetime.utcnow()
        
        execution_time = (end_time - start_time).total_seconds() * 1000
        
        print(f"⏱️  Bridge detection completed in {execution_time:.2f}ms")
        print(f"📊 Bridge Detection Results:")
        print(f"   • Bridge entities found: {len(bridge_entities)}")
        
        if bridge_entities:
            print(f"\\n📋 Network Bridge Entities:")
            for i, entity_id in enumerate(bridge_entities):
                print(f"   {i+1}. {entity_id}")
        
        print("\\n✅ Network bridge detection test completed successfully!")
        
    except Exception as e:
        print(f"❌ Network bridge detection test failed: {e}")
        import traceback
        traceback.print_exc()


async def main():
    """Run all Phase 2 Chunk 2 tests"""
    print("🚀 Phase 2 Chunk 2: Centrality Metrics & Hub Detection Tests")
    print("=" * 70)
    
    await test_centrality_metrics()
    await test_hub_detection()
    await test_network_bridges()
    
    print("\\n🎉 All Phase 2 Chunk 2 tests completed!")


if __name__ == "__main__":
    asyncio.run(main())