#!/usr/bin/env python3
"""
Debug Network Data - Investigate what's in the relationships collection
"""

import asyncio
import os
import logging
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import MongoClient

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def debug_relationships_collection():
    """Debug what's actually in the relationships collection"""
    
    # MongoDB connection
    MONGODB_URI = os.getenv('MONGODB_URI', 'mongodb+srv://username:password@cluster.mongodb.net')
    DB_NAME = os.getenv('DB_NAME', 'fsi-threatsight360')
    
    client = AsyncIOMotorClient(MONGODB_URI)
    db = client[DB_NAME]
    
    try:
        # Check if relationships collection exists and has data
        collections = await db.list_collection_names()
        logger.info(f"Available collections: {collections}")
        
        if "relationships" not in collections:
            logger.error("relationships collection does not exist!")
            return
        
        relationships_collection = db["relationships"]
        entities_collection = db["entities"]
        
        # Get basic statistics
        total_relationships = await relationships_collection.count_documents({})
        total_entities = await entities_collection.count_documents({})
        active_relationships = await relationships_collection.count_documents({"active": True})
        
        logger.info(f"Total relationships: {total_relationships}")
        logger.info(f"Total entities: {total_entities}")
        logger.info(f"Active relationships: {active_relationships}")
        
        # Sample some relationships to see structure
        logger.info("\n=== Sample Relationships ===")
        sample_relationships = await relationships_collection.find({}).limit(3).to_list(None)
        
        for i, rel in enumerate(sample_relationships):
            logger.info(f"\nRelationship {i+1}:")
            logger.info(f"  ID: {rel.get('_id')}")
            logger.info(f"  relationshipId: {rel.get('relationshipId')}")
            logger.info(f"  type: {rel.get('type')}")
            logger.info(f"  source: {rel.get('source')}")
            logger.info(f"  target: {rel.get('target')}")
            logger.info(f"  strength: {rel.get('strength')}")
            logger.info(f"  confidence: {rel.get('confidence')}")
            logger.info(f"  active: {rel.get('active')}")
            logger.info(f"  verified: {rel.get('verified')}")
            logger.info(f"  direction: {rel.get('direction')}")
        
        # Check specific test entities
        test_entity_ids = ["COPS1_0-DA7E4DC0B3", "CDI12A-259FFFD2B9"]
        
        for entity_id in test_entity_ids:
            logger.info(f"\n=== Checking relationships for entity: {entity_id} ===")
            
            # Check if entity exists
            entity = await entities_collection.find_one({"entityId": entity_id})
            if entity:
                logger.info(f"✅ Entity found: {entity.get('name')} ({entity.get('entityType')})")
            else:
                logger.info(f"❌ Entity not found in entities collection")
                continue
            
            # Find relationships involving this entity
            relationships = await relationships_collection.find({
                "$or": [
                    {"source.entityId": entity_id},
                    {"target.entityId": entity_id}
                ]
            }).to_list(None)
            
            logger.info(f"Found {len(relationships)} relationships for {entity_id}")
            
            for rel in relationships:
                source = rel.get("source", {})
                target = rel.get("target", {})
                logger.info(f"  {source.get('entityId')} --[{rel.get('type')}]--> {target.get('entityId')} "
                           f"(confidence: {rel.get('confidence')}, active: {rel.get('active')})")
        
        # Get some entity IDs that actually have relationships
        logger.info(f"\n=== Finding entities with relationships ===")
        pipeline = [
            {"$group": {"_id": "$source.entityId", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
            {"$limit": 5}
        ]
        
        top_entities = await relationships_collection.aggregate(pipeline).to_list(None)
        logger.info("Top 5 entities by outgoing relationships:")
        for entity_info in top_entities:
            entity_id = entity_info["_id"]
            count = entity_info["count"]
            
            # Get entity details
            entity = await entities_collection.find_one({"entityId": entity_id})
            name = "Unknown"
            if entity:
                entity_name = entity.get("name", "Unknown")
                if isinstance(entity_name, dict):
                    name = entity_name.get("full", entity_name.get("display", "Unknown"))
                else:
                    name = str(entity_name)
            
            logger.info(f"  {entity_id}: {count} relationships ({name})")
        
        # Test network building for an entity with relationships
        if top_entities:
            test_entity_with_rels = top_entities[0]["_id"]
            logger.info(f"\n=== Testing network building for {test_entity_with_rels} ===")
            
            # Simulate the repository query
            match_conditions = {
                "$or": [
                    {"source.entityId": test_entity_with_rels},
                    {"target.entityId": test_entity_with_rels}
                ],
                "active": True
            }
            
            test_relationships = await relationships_collection.find(match_conditions).to_list(None)
            logger.info(f"Found {len(test_relationships)} active relationships")
            
            # Extract connected entity IDs
            connected_entities = set()
            for rel in test_relationships:
                source_id = rel["source"]["entityId"]
                target_id = rel["target"]["entityId"]
                connected_entities.add(source_id)
                connected_entities.add(target_id)
            
            logger.info(f"Connected entities: {list(connected_entities)[:10]}")  # Show first 10
        
    except Exception as e:
        logger.error(f"Error debugging relationships: {e}")
        import traceback
        traceback.print_exc()
    
    finally:
        client.close()

if __name__ == "__main__":
    asyncio.run(debug_relationships_collection())