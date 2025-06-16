#!/usr/bin/env python3

import asyncio
import os
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

load_dotenv()

async def test_atlas_search_with_correct_queries():
    """Test Atlas Search with correct query structure"""
    
    client = AsyncIOMotorClient(os.getenv('MONGODB_URI'))
    db = client['fsi-threatsight360']
    collection = db['entities']
    
    print("🔍 Testing Atlas Search with correct query structure\n")
    
    # Test 1: Text search for Miller
    try:
        pipeline = [
            {
                "$search": {
                    "index": "entity_search_index_v2",
                    "text": {
                        "query": "Miller",
                        "path": "name.full"
                    }
                }
            },
            {"$limit": 5},
            {"$project": {"entityId": 1, "name.full": 1, "score": {"$meta": "searchScore"}}}
        ]
        
        cursor = collection.aggregate(pipeline)
        results = await cursor.to_list(length=5)
        print(f"✅ Text search 'Miller': Found {len(results)} entities")
        for r in results:
            print(f"    {r.get('name', {}).get('full', 'N/A')} (score: {r.get('score', 0):.2f})")
        print()
    except Exception as e:
        print(f"❌ Text search 'Miller' failed: {e}\n")
    
    # Test 2: Text search for Sam
    try:
        pipeline = [
            {
                "$search": {
                    "index": "entity_search_index_v2",
                    "text": {
                        "query": "Sam",
                        "path": "name.full"
                    }
                }
            },
            {"$limit": 5},
            {"$project": {"entityId": 1, "name.full": 1, "score": {"$meta": "searchScore"}}}
        ]
        
        cursor = collection.aggregate(pipeline)
        results = await cursor.to_list(length=5)
        print(f"✅ Text search 'Sam': Found {len(results)} entities")
        for r in results:
            print(f"    {r.get('name', {}).get('full', 'N/A')} (score: {r.get('score', 0):.2f})")
        print()
    except Exception as e:
        print(f"❌ Text search 'Sam' failed: {e}\n")
    
    # Test 3: Autocomplete for Sam
    try:
        pipeline = [
            {
                "$search": {
                    "index": "entity_search_index_v2",
                    "autocomplete": {
                        "query": "Sam",
                        "path": "name.full"
                    }
                }
            },
            {"$limit": 5},
            {"$project": {"entityId": 1, "name.full": 1, "score": {"$meta": "searchScore"}}}
        ]
        
        cursor = collection.aggregate(pipeline)
        results = await cursor.to_list(length=5)
        print(f"✅ Autocomplete 'Sam': Found {len(results)} suggestions")
        for r in results:
            print(f"    {r.get('name', {}).get('full', 'N/A')} (score: {r.get('score', 0):.2f})")
        print()
    except Exception as e:
        print(f"❌ Autocomplete 'Sam' failed: {e}\n")
    
    # Test 4: Faceting with entity type filter
    try:
        pipeline = [
            {
                "$searchMeta": {
                    "index": "entity_search_index_v2",
                    "facet": {
                        "operator": {
                            "exists": {"path": "entityType"}
                        },
                        "facets": {
                            "entityTypes": {
                                "type": "string",
                                "path": "entityType"
                            },
                            "riskLevels": {
                                "type": "string",
                                "path": "riskAssessment.overall.level"
                            },
                            "countries": {
                                "type": "string",
                                "path": "addresses.structured.country"
                            }
                        }
                    }
                }
            }
        ]
        
        cursor = collection.aggregate(pipeline)
        results = await cursor.to_list(length=1)
        
        if results and "facet" in results[0]:
            facets = results[0]["facet"]
            print(f"✅ Multi-faceting successful:")
            
            entity_types = facets.get("entityTypes", {}).get("buckets", [])
            print(f"    Entity Types: {[(b['_id'], b['count']) for b in entity_types]}")
            
            risk_levels = facets.get("riskLevels", {}).get("buckets", [])
            print(f"    Risk Levels: {[(b['_id'], b['count']) for b in risk_levels]}")
            
            countries = facets.get("countries", {}).get("buckets", [])[:5]  # Top 5
            print(f"    Countries (top 5): {[(b['_id'], b['count']) for b in countries]}")
            print()
        else:
            print(f"❌ Multi-faceting failed: {results}\n")
    except Exception as e:
        print(f"❌ Multi-faceting failed: {e}\n")
    
    # Test 5: Combined search with filters
    try:
        pipeline = [
            {
                "$search": {
                    "index": "entity_search_index_v2",
                    "compound": {
                        "must": [
                            {
                                "equals": {
                                    "path": "entityType",
                                    "value": "individual"
                                }
                            },
                            {
                                "equals": {
                                    "path": "riskAssessment.overall.level",
                                    "value": "low"
                                }
                            }
                        ]
                    }
                }
            },
            {"$limit": 3},
            {"$project": {"entityId": 1, "entityType": 1, "name.full": 1, "riskAssessment.overall.level": 1}}
        ]
        
        cursor = collection.aggregate(pipeline)
        results = await cursor.to_list(length=3)
        print(f"✅ Combined filter search: Found {len(results)} low-risk individuals")
        for r in results:
            risk_level = r.get('riskAssessment', {}).get('overall', {}).get('level', 'N/A')
            print(f"    {r.get('name', {}).get('full', 'N/A')} - {r.get('entityType')} - {risk_level}")
        print()
    except Exception as e:
        print(f"❌ Combined filter search failed: {e}\n")

if __name__ == "__main__":
    asyncio.run(test_atlas_search_with_correct_queries())