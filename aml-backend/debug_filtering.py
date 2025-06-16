#!/usr/bin/env python3

import os
from dotenv import load_dotenv
from db.mongo_db import MongoDBAccess

load_dotenv()

db = MongoDBAccess(os.getenv('MONGODB_URI'))

def test_filtering():
    """Test each filter to see what's working and what's not"""
    
    print("=== TESTING ENTITY FILTERING ===\n")
    
    # 1. Test basic query (no filters)
    print("1. Basic query (no filters):")
    docs, total = db.find_entities_paginated('fsi-threatsight360', 'entities', skip=0, limit=5)
    print(f"   Found {total} total entities")
    print(f"   First 5 entity types: {[doc.get('entityType') for doc in docs[:5]]}")
    print()
    
    # 2. Test entity type filter
    print("2. Entity type filter (individual):")
    docs, total = db.find_entities_paginated(
        'fsi-threatsight360', 'entities', 
        skip=0, limit=5, 
        filter_dict={"entityType": "individual"}
    )
    print(f"   Found {total} individual entities")
    print(f"   Entity types: {[doc.get('entityType') for doc in docs[:5]]}")
    print()
    
    print("3. Entity type filter (organization):")
    docs, total = db.find_entities_paginated(
        'fsi-threatsight360', 'entities', 
        skip=0, limit=5, 
        filter_dict={"entityType": "organization"}
    )
    print(f"   Found {total} organization entities")
    print(f"   Entity types: {[doc.get('entityType') for doc in docs[:5]]}")
    print()
    
    # 3. Test risk level filter
    print("4. Risk level filter (low):")
    docs, total = db.find_entities_paginated(
        'fsi-threatsight360', 'entities', 
        skip=0, limit=5, 
        filter_dict={"riskAssessment.overall.level": "low"}
    )
    print(f"   Found {total} low risk entities")
    if docs:
        print(f"   Risk levels: {[doc.get('riskAssessment', {}).get('overall', {}).get('level') for doc in docs[:5]]}")
    print()
    
    print("5. Risk level filter (medium):")
    docs, total = db.find_entities_paginated(
        'fsi-threatsight360', 'entities', 
        skip=0, limit=5, 
        filter_dict={"riskAssessment.overall.level": "medium"}
    )
    print(f"   Found {total} medium risk entities")
    if docs:
        print(f"   Risk levels: {[doc.get('riskAssessment', {}).get('overall', {}).get('level') for doc in docs[:5]]}")
    print()
    
    # 4. Test status filter
    print("6. Status filter (active):")
    docs, total = db.find_entities_paginated(
        'fsi-threatsight360', 'entities', 
        skip=0, limit=5, 
        filter_dict={"status": "active"}
    )
    print(f"   Found {total} active entities")
    print(f"   Statuses: {[doc.get('status') for doc in docs[:5]]}")
    print()
    
    # 5. Test scenario key filter
    print("7. Scenario key filter (clear_duplicate_set0_1):")
    docs, total = db.find_entities_paginated(
        'fsi-threatsight360', 'entities', 
        skip=0, limit=5, 
        filter_dict={"scenarioKey": "clear_duplicate_set0_1"}
    )
    print(f"   Found {total} entities with scenario clear_duplicate_set0_1")
    print(f"   Scenario keys: {[doc.get('scenarioKey') for doc in docs[:5]]}")
    print()
    
    # 6. Test combination filters
    print("8. Combination filter (individual + low risk):")
    docs, total = db.find_entities_paginated(
        'fsi-threatsight360', 'entities', 
        skip=0, limit=5, 
        filter_dict={
            "entityType": "individual",
            "riskAssessment.overall.level": "low"
        }
    )
    print(f"   Found {total} individual low-risk entities")
    if docs:
        print(f"   Types: {[doc.get('entityType') for doc in docs[:3]]}")
        print(f"   Risk levels: {[doc.get('riskAssessment', {}).get('overall', {}).get('level') for doc in docs[:3]]}")
    print()
    
    # 7. Get available distinct values
    print("9. Available distinct values:")
    entity_types = db.get_distinct_values('fsi-threatsight360', 'entities', 'entityType')
    print(f"   Entity types: {sorted(entity_types)}")
    
    risk_levels = db.get_distinct_values('fsi-threatsight360', 'entities', 'riskAssessment.overall.level')
    print(f"   Risk levels: {sorted([rl for rl in risk_levels if rl])}")
    
    statuses = db.get_distinct_values('fsi-threatsight360', 'entities', 'status')
    print(f"   Statuses: {sorted(statuses)}")
    
    scenario_keys = db.get_distinct_values('fsi-threatsight360', 'entities', 'scenarioKey')
    print(f"   Scenario keys (first 10): {sorted(scenario_keys)[:10]}")
    print()

if __name__ == "__main__":
    test_filtering()