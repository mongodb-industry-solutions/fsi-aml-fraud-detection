#!/usr/bin/env python3
"""
Test Network Endpoint - Direct test of the network endpoint functionality
"""

import asyncio
import os
import logging
from motor.motor_asyncio import AsyncIOMotorClient
from repositories.impl.network_repository import NetworkRepository
from repositories.interfaces.network_repository import NetworkQueryParams
from reference.mongodb_core_lib import MongoDBRepository

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def test_network_endpoint():
    """Test the network endpoint functionality directly"""
    
    # MongoDB connection
    MONGODB_URI = os.getenv('MONGODB_URI', 'mongodb+srv://username:password@cluster.mongodb.net')
    DB_NAME = os.getenv('DB_NAME', 'fsi-threatsight360')
    
    try:
        # Initialize repository
        mongodb_repo = MongoDBRepository(MONGODB_URI, DB_NAME)
        network_repo = NetworkRepository(mongodb_repo)
        
        # Direct client for some queries
        client = AsyncIOMotorClient(MONGODB_URI)
        db = client[DB_NAME]
        
        # Test entities that have relationships
        test_entities = [
            "COPS1_0-DA7E4DC0B3",  # Has 3 relationships
            "CDI12A-259FFFD2B9",   # Has 1 relationship
            "COPP2-D1007510F1"     # Has 4 relationships
        ]
        
        for entity_id in test_entities:
            logger.info(f"\n=== Testing network for {entity_id} ===")
            
            # Test with different confidence thresholds
            for min_confidence in [0.1, 0.5, 0.8]:
                logger.info(f"\nTesting with min_confidence={min_confidence}")
                
                query_params = NetworkQueryParams(
                    center_entity_id=entity_id,
                    max_depth=2,
                    min_confidence=min_confidence,
                    only_active=True,
                    max_entities=100
                )
                
                try:
                    network_data = await network_repo.build_entity_network(query_params)
                    
                    logger.info(f"✅ Success: {network_data.total_entities} nodes, {network_data.total_relationships} edges")
                    logger.info(f"   Query time: {network_data.query_time_ms:.2f}ms")
                    logger.info(f"   Max depth reached: {network_data.max_depth_reached}")
                    
                    # Show some details
                    if network_data.nodes:
                        center_node = next((n for n in network_data.nodes if n.entity_id == entity_id), None)
                        if center_node:
                            logger.info(f"   Center entity: {center_node.entity_name} ({center_node.entity_type})")
                        
                        logger.info(f"   Connected entities: {[n.entity_name for n in network_data.nodes if n.entity_id != entity_id][:3]}")
                    
                    if network_data.edges:
                        logger.info(f"   Relationship types: {[e.relationship_type.value for e in network_data.edges[:3]]}")
                        logger.info(f"   Confidence range: {min([e.confidence for e in network_data.edges]):.3f} - {max([e.confidence for e in network_data.edges]):.3f}")
                    
                except Exception as e:
                    logger.error(f"❌ Failed: {e}")
        
        # Test the exact frontend call parameters
        logger.info(f"\n=== Testing exact frontend parameters ===")
        entity_id = "COPS1_0-DA7E4DC0B3"
        
        # Simulate exact frontend call: /network/COPS1_0-DA7E4DC0B3?max_depth=2&min_strength=0.5&include_inactive=false&max_nodes=100&include_risk_analysis=true
        query_params = NetworkQueryParams(
            center_entity_id=entity_id,
            max_depth=2,
            min_confidence=0.5,  # This was min_strength=0.5 in frontend
            only_active=True,     # This was include_inactive=false
            max_entities=100      # This was max_nodes=100
        )
        
        network_data = await network_repo.build_entity_network(query_params)
        
        logger.info(f"Frontend simulation result:")
        logger.info(f"  Nodes: {network_data.total_entities}")
        logger.info(f"  Edges: {network_data.total_relationships}")
        logger.info(f"  Query time: {network_data.query_time_ms:.2f}ms")
        
        if network_data.total_entities == 0:
            logger.info("  ❌ No results - investigating further...")
            
            # Check what relationships exist at different confidence levels
            relationships_collection = db["relationships"]
            
            for min_conf in [0.0, 0.3, 0.5, 0.8, 0.9]:
                match_conditions = {
                    "$or": [
                        {"source.entityId": entity_id},
                        {"target.entityId": entity_id}
                    ],
                    "active": True,
                    "confidence": {"$gte": min_conf}
                }
                
                count = await relationships_collection.count_documents(match_conditions)
                logger.info(f"    Relationships with confidence >= {min_conf}: {count}")
                
                if count > 0:
                    sample = await relationships_collection.find_one(match_conditions)
                    logger.info(f"      Sample: confidence={sample.get('confidence'):.3f}, type={sample.get('type')}")
        
    except Exception as e:
        logger.error(f"Error testing network endpoint: {e}")
        import traceback
        traceback.print_exc()
    
    finally:
        if 'client' in locals():
            client.close()

if __name__ == "__main__":
    asyncio.run(test_network_endpoint())