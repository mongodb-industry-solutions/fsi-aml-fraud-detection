#!/usr/bin/env python3
"""
Debug Bidirectional Relationships - Investigate how bidirectional relationships are being processed
"""

import asyncio
import os
import logging
from motor.motor_asyncio import AsyncIOMotorClient

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def debug_bidirectional_relationships():
    """Debug bidirectional relationship handling"""
    
    # MongoDB connection
    MONGODB_URI = os.getenv('MONGODB_URI', 'mongodb+srv://username:password@cluster.mongodb.net')
    DB_NAME = os.getenv('DB_NAME', 'fsi-threatsight360')
    
    client = AsyncIOMotorClient(MONGODB_URI)
    db = client[DB_NAME]
    
    try:
        relationships_collection = db["relationships"]
        
        # Test with CDI12A-259FFFD2B9 which showed the duplicate issue
        test_entity = "CDI12A-259FFFD2B9"
        
        logger.info(f"=== Investigating relationships for {test_entity} ===")
        
        # Find all relationships involving this entity
        relationships = await relationships_collection.find({
            "$or": [
                {"source.entityId": test_entity},
                {"target.entityId": test_entity}
            ]
        }).to_list(None)
        
        logger.info(f"Found {len(relationships)} relationships:")
        
        for i, rel in enumerate(relationships):
            source = rel.get("source", {})
            target = rel.get("target", {})
            direction = rel.get("direction", "unknown")
            rel_type = rel.get("type", "unknown")
            confidence = rel.get("confidence", 0)
            
            logger.info(f"\nRelationship {i+1}:")
            logger.info(f"  ID: {rel.get('_id')}")
            logger.info(f"  Source: {source.get('entityId')} ({source.get('entityType')})")
            logger.info(f"  Target: {target.get('entityId')} ({target.get('entityType')})")
            logger.info(f"  Type: {rel_type}")
            logger.info(f"  Direction: {direction}")
            logger.info(f"  Confidence: {confidence}")
            logger.info(f"  Active: {rel.get('active')}")
            logger.info(f"  Verified: {rel.get('verified')}")
        
        # Check for potential duplicates
        logger.info(f"\n=== Checking for relationship patterns ===")
        
        # Group by entity pairs to see if we have duplicates
        entity_pairs = {}
        for rel in relationships:
            source_id = rel["source"]["entityId"]
            target_id = rel["target"]["entityId"]
            
            # Create a normalized key (always put smaller ID first)
            pair_key = tuple(sorted([source_id, target_id]))
            
            if pair_key not in entity_pairs:
                entity_pairs[pair_key] = []
            
            entity_pairs[pair_key].append({
                "source": source_id,
                "target": target_id,
                "type": rel.get("type"),
                "direction": rel.get("direction"),
                "confidence": rel.get("confidence"),
                "_id": str(rel.get("_id"))
            })
        
        for pair_key, rels in entity_pairs.items():
            if len(rels) > 1:
                logger.info(f"\nEntity pair {pair_key[0]} <-> {pair_key[1]} has {len(rels)} relationships:")
                for rel in rels:
                    logger.info(f"  {rel['source']} -> {rel['target']} | {rel['type']} | {rel['direction']} | conf:{rel['confidence']:.3f}")
        
        # Test how our repository processes this
        logger.info(f"\n=== Testing repository processing ===")
        
        # Simulate what our build_network_graph method does
        match_conditions = {
            "$or": [
                {"source.entityId": test_entity},
                {"target.entityId": test_entity}
            ],
            "active": True
        }
        
        test_relationships = await relationships_collection.find(match_conditions).to_list(None)
        
        logger.info(f"Repository would process {len(test_relationships)} relationships:")
        
        edges_created = []
        for rel in test_relationships:
            source_id = rel["source"]["entityId"]
            target_id = rel["target"]["entityId"]
            rel_type = rel.get("type")
            direction = rel.get("direction")
            
            # This is what our current code does
            edge_id = f"{source_id}-{target_id}-{rel_type}"
            
            edges_created.append({
                "edge_id": edge_id,
                "source": source_id,
                "target": target_id,
                "type": rel_type,
                "direction": direction
            })
        
        # Check for duplicate edge IDs
        edge_ids = [edge["edge_id"] for edge in edges_created]
        duplicate_ids = [eid for eid in edge_ids if edge_ids.count(eid) > 1]
        
        if duplicate_ids:
            logger.warning(f"DUPLICATE EDGE IDs FOUND: {set(duplicate_ids)}")
            for dup_id in set(duplicate_ids):
                logger.warning(f"  Edges with ID '{dup_id}':")
                for edge in edges_created:
                    if edge["edge_id"] == dup_id:
                        logger.warning(f"    {edge}")
        else:
            logger.info("No duplicate edge IDs found")
        
        logger.info(f"\nEdges that would be created:")
        for edge in edges_created:
            logger.info(f"  {edge}")
        
    except Exception as e:
        logger.error(f"Error debugging bidirectional relationships: {e}")
        import traceback
        traceback.print_exc()
    
    finally:
        client.close()

if __name__ == "__main__":
    asyncio.run(debug_bidirectional_relationships())