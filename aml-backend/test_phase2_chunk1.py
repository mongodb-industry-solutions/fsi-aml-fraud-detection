#!/usr/bin/env python3
"""
Test script for Phase 2 Chunk 1: Risk Propagation & Shortest Path
Tests advanced graph operations with new relationships collection schema
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


async def test_risk_propagation():
    """Test enhanced risk propagation with new schema"""
    print("🔥 Testing Risk Propagation Analysis")
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
        
        # Find entities with relationships for testing
        relationships_collection = mongodb_repo.collection("relationships")
        entities_with_rels = await relationships_collection.distinct("source.entityId")
        
        if not entities_with_rels:
            print("❌ No entities with relationships found")
            return
        
        # Test with first entity
        test_entity_id = entities_with_rels[0]
        print(f"🎯 Testing risk propagation from entity: {test_entity_id}")
        
        # Test basic risk propagation
        start_time = datetime.utcnow()
        risk_scores = await network_repo.propagate_risk_scores(
            source_entity_id=test_entity_id,
            max_depth=3,
            propagation_factor=0.6,
            min_propagated_score=0.05
        )
        end_time = datetime.utcnow()
        
        execution_time = (end_time - start_time).total_seconds() * 1000
        
        print(f"⏱️  Risk propagation completed in {execution_time:.2f}ms")
        print(f"📊 Risk Propagation Results:")
        print(f"   • Entities affected: {len(risk_scores)}")
        
        if risk_scores:
            # Sort by risk score
            sorted_risks = sorted(risk_scores.items(), key=lambda x: x[1], reverse=True)
            
            print(f"📋 Top Risk Entities:")
            for i, (entity_id, risk_score) in enumerate(sorted_risks[:5]):
                print(f"   {i+1}. {entity_id}: {risk_score:.4f}")
            
            # Test with relationship type filtering
            print(f"\\n🔍 Testing risk propagation with relationship type filtering...")
            
            # Get available relationship types
            sample_rels = await relationships_collection.find(
                {"$or": [
                    {"source.entityId": test_entity_id}, 
                    {"target.entityId": test_entity_id}
                ]}
            ).limit(5).to_list(None)
            
            rel_types_in_data = set()
            for rel in sample_rels:
                rel_types_in_data.add(rel.get("type", "unknown"))
            
            print(f"   Available relationship types: {list(rel_types_in_data)}")
            
            if rel_types_in_data:
                test_rel_type = list(rel_types_in_data)[0]
                try:
                    rel_type_enum = RelationshipType(test_rel_type)
                    filtered_risk_scores = await network_repo.propagate_risk_scores(
                        source_entity_id=test_entity_id,
                        max_depth=2,
                        relationship_types=[rel_type_enum],
                        min_propagated_score=0.05
                    )
                    print(f"   Filtered propagation ({test_rel_type}): {len(filtered_risk_scores)} entities")
                except ValueError:
                    print(f"   ⚠️  Relationship type '{test_rel_type}' not in enum")
            
            print("\\n✅ Risk propagation test completed successfully!")
        else:
            print("⚠️  No risk propagation occurred (entity may have low base risk)")
            
    except Exception as e:
        print(f"❌ Risk propagation test failed: {e}")
        import traceback
        traceback.print_exc()


async def test_shortest_path():
    """Test enhanced shortest path finding with new schema"""
    print("\\n🛤️  Testing Shortest Path Finding")
    print("=" * 50)
    
    try:
        # Initialize MongoDB connection
        mongodb_uri = os.getenv("MONGODB_URI")
        db_name = os.getenv("DB_NAME", "fsi-threatsight360")
        
        mongodb_repo = MongoDBRepository(mongodb_uri, db_name)
        network_repo = NetworkRepository(mongodb_repo)
        
        # Get entities with relationships for path testing
        relationships_collection = mongodb_repo.collection("relationships")
        entities_with_rels = await relationships_collection.distinct("source.entityId")
        
        if len(entities_with_rels) < 2:
            print("❌ Need at least 2 entities with relationships for path testing")
            return
        
        # Test path finding between different entities
        source_entity = entities_with_rels[0]
        target_entity = entities_with_rels[1] if len(entities_with_rels) > 1 else entities_with_rels[0]
        
        print(f"🎯 Finding path from {source_entity} to {target_entity}")
        
        # Test basic path finding
        start_time = datetime.utcnow()
        path = await network_repo.find_relationship_path(
            source_entity_id=source_entity,
            target_entity_id=target_entity,
            max_depth=4
        )
        end_time = datetime.utcnow()
        
        execution_time = (end_time - start_time).total_seconds() * 1000
        
        print(f"⏱️  Path finding completed in {execution_time:.2f}ms")
        
        if path:
            print(f"📊 Path Found:")
            print(f"   • Path length: {len(path)} steps")
            print(f"   • Path details:")
            for i, step in enumerate(path):
                print(f"     {i+1}. {step['source_entity_id']} → {step['target_entity_id']}")
                print(f"        Type: {step['relationship_type']}, Confidence: {step['confidence']:.2f}")
        else:
            print("📊 No direct path found between entities")
            
            # Try finding paths between entities that are connected
            print("\\n🔍 Testing path finding between connected entities...")
            
            # Get entities connected to source
            connections = await network_repo.get_entity_connections(source_entity, max_depth=1)
            
            if connections:
                connected_entity = connections[0]["connected_entity_id"]
                print(f"   Testing path: {source_entity} → {connected_entity}")
                
                direct_path = await network_repo.find_relationship_path(
                    source_entity_id=source_entity,
                    target_entity_id=connected_entity,
                    max_depth=2
                )
                
                if direct_path:
                    print(f"   ✅ Direct path found: {len(direct_path)} steps")
                    for i, step in enumerate(direct_path):
                        print(f"     {i+1}. {step['relationship_type']} (confidence: {step['confidence']:.2f})")
                else:
                    print("   ❌ No path found even between connected entities")
        
        # Test with relationship type filtering
        print(f"\\n🔍 Testing path finding with relationship type filtering...")
        
        # Get available relationship types
        sample_rels = await relationships_collection.find().limit(10).to_list(None)
        rel_types_in_data = set()
        for rel in sample_rels:
            rel_types_in_data.add(rel.get("type", "unknown"))
        
        if rel_types_in_data:
            test_rel_type = list(rel_types_in_data)[0]
            try:
                rel_type_enum = RelationshipType(test_rel_type)
                filtered_path = await network_repo.find_relationship_path(
                    source_entity_id=source_entity,
                    target_entity_id=target_entity,
                    max_depth=3,
                    relationship_types=[rel_type_enum]
                )
                
                if filtered_path:
                    print(f"   Filtered path ({test_rel_type}): {len(filtered_path)} steps")
                else:
                    print(f"   No path found using only {test_rel_type} relationships")
                    
            except ValueError:
                print(f"   ⚠️  Relationship type '{test_rel_type}' not in enum")
        
        print("\\n✅ Shortest path test completed successfully!")
        
    except Exception as e:
        print(f"❌ Shortest path test failed: {e}")
        import traceback
        traceback.print_exc()


async def test_network_risk_calculation():
    """Test network risk score calculation"""
    print("\\n📊 Testing Network Risk Score Calculation")
    print("=" * 50)
    
    try:
        # Initialize MongoDB connection
        mongodb_uri = os.getenv("MONGODB_URI")
        db_name = os.getenv("DB_NAME", "fsi-threatsight360")
        
        mongodb_repo = MongoDBRepository(mongodb_uri, db_name)
        network_repo = NetworkRepository(mongodb_repo)
        
        # Get entities with relationships
        relationships_collection = mongodb_repo.collection("relationships")
        entities_with_rels = await relationships_collection.distinct("source.entityId")
        
        if not entities_with_rels:
            print("❌ No entities with relationships found")
            return
        
        test_entity_id = entities_with_rels[0]
        print(f"🎯 Calculating network risk for entity: {test_entity_id}")
        
        start_time = datetime.utcnow()
        risk_analysis = await network_repo.calculate_network_risk_score(
            entity_id=test_entity_id,
            analysis_depth=2
        )
        end_time = datetime.utcnow()
        
        execution_time = (end_time - start_time).total_seconds() * 1000
        
        print(f"⏱️  Network risk calculation completed in {execution_time:.2f}ms")
        
        if "error" in risk_analysis:
            print(f"❌ Error: {risk_analysis['error']}")
        else:
            print(f"📊 Network Risk Analysis:")
            print(f"   • Entity ID: {risk_analysis.get('entity_id')}")
            print(f"   • Base Risk Score: {risk_analysis.get('base_risk_score', 0.0):.3f}")
            print(f"   • Network Risk Score: {risk_analysis.get('network_risk_score', 0.0):.3f}")
            print(f"   • Connection Risk Factor: {risk_analysis.get('connection_risk_factor', 0.0):.3f}")
            print(f"   • High Risk Connections: {risk_analysis.get('high_risk_connections', 0)}")
            print(f"   • Total Connections: {risk_analysis.get('total_connections', 0)}")
            print(f"   • Risk Level: {risk_analysis.get('risk_level', 'unknown')}")
        
        print("\\n✅ Network risk calculation test completed successfully!")
        
    except Exception as e:
        print(f"❌ Network risk calculation test failed: {e}")
        import traceback
        traceback.print_exc()


async def main():
    """Run all Phase 2 Chunk 1 tests"""
    print("🚀 Phase 2 Chunk 1: Risk Propagation & Shortest Path Tests")
    print("=" * 70)
    
    await test_risk_propagation()
    await test_shortest_path() 
    await test_network_risk_calculation()
    
    print("\\n🎉 All Phase 2 Chunk 1 tests completed!")


if __name__ == "__main__":
    asyncio.run(main())