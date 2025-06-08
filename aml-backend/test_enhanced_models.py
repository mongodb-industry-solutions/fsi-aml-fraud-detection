"""
Test script for enhanced entity models
Tests the new comprehensive models against real database documents
"""

import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv
import json
from models.entity_enhanced import EntityEnhanced, EntityBasicEnhanced
from pydantic import ValidationError

async def test_enhanced_models():
    """Test enhanced models with real database documents"""
    load_dotenv()
    client = AsyncIOMotorClient(os.getenv('MONGODB_URI'))
    db = client[os.getenv('DB_NAME', 'fsi-threatsight360')]
    
    print("🧪 Testing Enhanced Entity Models")
    print("=" * 50)
    
    # Test with individual entity
    print("\n1. Testing Individual Entity:")
    individual = await db.entities.find_one({'entityType': 'individual'})
    if individual:
        try:
            # Remove MongoDB _id for testing
            if '_id' in individual:
                del individual['_id']
            
            entity_enhanced = EntityEnhanced(**individual)
            print(f"✅ Individual entity parsed successfully: {entity_enhanced.name.full}")
            print(f"   - Entity ID: {entity_enhanced.entityId}")
            print(f"   - Scenario: {entity_enhanced.scenarioKey}")
            print(f"   - Risk Score: {entity_enhanced.riskAssessment.overall.score if entity_enhanced.riskAssessment else 'N/A'}")
            print(f"   - Addresses: {len(entity_enhanced.addresses)}")
            print(f"   - Contact Info: {len(entity_enhanced.contactInfo)}")
            print(f"   - Identifiers: {len(entity_enhanced.identifiers)}")
            print(f"   - Watchlist Matches: {len(entity_enhanced.watchlistMatches)}")
            
            # Test EntityBasicEnhanced
            basic_data = {
                'entityId': entity_enhanced.entityId,
                'scenarioKey': entity_enhanced.scenarioKey,
                'entityType': entity_enhanced.entityType,
                'status': entity_enhanced.status,
                'name_full': entity_enhanced.name.full,
                'risk_score': entity_enhanced.riskAssessment.overall.score if entity_enhanced.riskAssessment else None,
                'risk_level': entity_enhanced.riskAssessment.overall.level if entity_enhanced.riskAssessment else None,
                'watchlist_matches_count': len(entity_enhanced.watchlistMatches),
                'resolution_status': entity_enhanced.resolution.status if entity_enhanced.resolution else None
            }
            entity_basic = EntityBasicEnhanced(**basic_data)
            print(f"✅ Basic model conversion successful")
            
        except ValidationError as e:
            print(f"❌ Validation error for individual: {e}")
            print(f"   Problematic fields: {[error['loc'] for error in e.errors]}")
        except Exception as e:
            print(f"❌ Unexpected error for individual: {e}")
    
    # Test with organization entity
    print("\n2. Testing Organization Entity:")
    organization = await db.entities.find_one({'entityType': 'organization'})
    if organization:
        try:
            # Remove MongoDB _id for testing
            if '_id' in organization:
                del organization['_id']
            
            entity_enhanced = EntityEnhanced(**organization)
            print(f"✅ Organization entity parsed successfully: {entity_enhanced.name.full}")
            print(f"   - Entity ID: {entity_enhanced.entityId}")
            print(f"   - Scenario: {entity_enhanced.scenarioKey}")
            print(f"   - Industry: {entity_enhanced.customerInfo.industry if entity_enhanced.customerInfo else 'N/A'}")
            print(f"   - Incorporation: {entity_enhanced.incorporationDate}")
            print(f"   - UBOs: {len(entity_enhanced.uboInfo)}")
            print(f"   - Risk Score: {entity_enhanced.riskAssessment.overall.score if entity_enhanced.riskAssessment else 'N/A'}")
            print(f"   - Watchlist Matches: {len(entity_enhanced.watchlistMatches)}")
            
        except ValidationError as e:
            print(f"❌ Validation error for organization: {e}")
            print(f"   Problematic fields: {[error['loc'] for error in e.errors]}")
        except Exception as e:
            print(f"❌ Unexpected error for organization: {e}")
    
    # Test with multiple entities
    print("\n3. Testing Multiple Entities (Sample):")
    entities = await db.entities.find().limit(5).to_list(length=5)
    success_count = 0
    error_count = 0
    
    for entity_doc in entities:
        try:
            if '_id' in entity_doc:
                del entity_doc['_id']
            
            entity_enhanced = EntityEnhanced(**entity_doc)
            success_count += 1
        except Exception as e:
            error_count += 1
            print(f"❌ Error with entity {entity_doc.get('entityId', 'unknown')}: {str(e)[:100]}...")
    
    print(f"✅ Successfully parsed: {success_count}/{len(entities)} entities")
    print(f"❌ Errors: {error_count}/{len(entities)} entities")
    
    # Test scenario key distribution
    print("\n4. Testing Scenario Key Distribution:")
    scenario_keys = await db.entities.distinct('scenarioKey')
    print(f"   Found {len(scenario_keys)} unique scenario keys:")
    for key in scenario_keys[:10]:  # Show first 10
        count = await db.entities.count_documents({'scenarioKey': key})
        print(f"   - {key}: {count} entities")
    if len(scenario_keys) > 10:
        print(f"   ... and {len(scenario_keys) - 10} more")
    
    # Test entity status distribution
    print("\n5. Testing Entity Status Distribution:")
    statuses = await db.entities.distinct('status')
    for status in statuses:
        count = await db.entities.count_documents({'status': status})
        print(f"   - {status}: {count} entities")
    
    # Test risk level distribution
    print("\n6. Testing Risk Level Distribution:")
    risk_levels = await db.entities.distinct('riskAssessment.overall.level')
    for level in risk_levels:
        count = await db.entities.count_documents({'riskAssessment.overall.level': level})
        print(f"   - {level}: {count} entities")
    
    print("\n" + "=" * 50)
    print("🎉 Enhanced Model Testing Complete!")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(test_enhanced_models())