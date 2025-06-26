#!/usr/bin/env python3
"""
Test Bidirectional Fix - Verify the fix for duplicate relationship processing
"""

import asyncio
import os
import logging
from repositories.impl.network_repository import NetworkRepository
from repositories.interfaces.network_repository import NetworkQueryParams
from reference.mongodb_core_lib import MongoDBRepository

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def test_bidirectional_fix():
    """Test that bidirectional relationships are handled correctly"""
    
    # MongoDB connection
    MONGODB_URI = os.getenv('MONGODB_URI', 'mongodb+srv://username:password@cluster.mongodb.net')
    DB_NAME = os.getenv('DB_NAME', 'fsi-threatsight360')
    
    try:
        # Initialize repository
        mongodb_repo = MongoDBRepository(MONGODB_URI, DB_NAME)
        network_repo = NetworkRepository(mongodb_repo)
        
        # Test the entity that showed bidirectional issues
        entity_id = "CDI12A-259FFFD2B9"
        
        logger.info(f"=== Testing bidirectional fix for {entity_id} ===")
        
        query_params = NetworkQueryParams(
            center_entity_id=entity_id,
            max_depth=4,  # Higher depth to trigger the duplicate issue
            min_confidence=0.1,
            only_active=True,
            max_entities=100
        )
        
        network_data = await network_repo.build_entity_network(query_params)
        
        logger.info(f"✅ Network built successfully:")
        logger.info(f"   Nodes: {network_data.total_entities}")
        logger.info(f"   Edges: {network_data.total_relationships}")
        logger.info(f"   Max depth: {network_data.max_depth_reached}")
        
        # Check for duplicate edges by examining edge sources/targets
        edge_pairs = []
        unique_relationships = set()
        
        for edge in network_data.edges:
            source = edge.source_id
            target = edge.target_id
            rel_type = edge.relationship_type.value if hasattr(edge.relationship_type, 'value') else str(edge.relationship_type)
            
            # Create normalized pair key
            pair = tuple(sorted([source, target]))
            relationship_key = f"{pair}-{rel_type}"
            
            edge_pairs.append(f"{source} -> {target} ({rel_type})")
            
            if relationship_key in unique_relationships:
                logger.warning(f"❌ DUPLICATE: {relationship_key}")
            else:
                unique_relationships.add(relationship_key)
        
        logger.info(f"\nEdges created:")
        for edge_pair in edge_pairs:
            logger.info(f"   {edge_pair}")
        
        # Check if fix worked
        if len(edge_pairs) == len(unique_relationships):
            logger.info(f"✅ SUCCESS: No duplicate relationships found!")
        else:
            logger.warning(f"❌ ISSUE: Found {len(edge_pairs)} edges but only {len(unique_relationships)} unique relationships")
        
        # Also test directionality
        logger.info(f"\n=== Checking edge directionality ===")
        for edge in network_data.edges:
            logger.info(f"   {edge.source_id} -> {edge.target_id} | Type: {edge.relationship_type}")
        
    except Exception as e:
        logger.error(f"Error testing bidirectional fix: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_bidirectional_fix())