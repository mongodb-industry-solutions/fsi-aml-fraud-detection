#!/usr/bin/env python3
"""
MongoDB Entities Test Script

This script tests MongoDB connectivity and creates sample entity data
for testing the AML/KYC API if no entities exist.

Prerequisites:
1. MongoDB connection string in environment variables or .env file
2. Required Python packages: pymongo, python-dotenv

Usage:
    python test_mongodb_entities.py
"""

import os
import sys
from datetime import datetime
from typing import List, Dict
from dotenv import load_dotenv
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure, ServerSelectionTimeoutError

# Load environment variables - try multiple locations
import pathlib
current_dir = pathlib.Path(__file__).parent.absolute()
project_root = current_dir.parent
aml_backend_dir = project_root / "aml-backend"

# Try to load .env from aml-backend directory first
if (aml_backend_dir / ".env").exists():
    load_dotenv(aml_backend_dir / ".env")
else:
    load_dotenv()

class MongoDBEntityTester:
    def __init__(self):
        self.mongodb_uri = os.getenv("MONGODB_URI")
        self.db_name = os.getenv("DB_NAME", "fsi-threatsight360")
        self.collection_name = "entities"
        self.client = None
        self.db = None
        self.collection = None
        
    def connect(self) -> bool:
        """Establish MongoDB connection"""
        if not self.mongodb_uri:
            print("❌ MONGODB_URI environment variable not set")
            return False
            
        try:
            print(f"🔗 Connecting to MongoDB...")
            self.client = MongoClient(self.mongodb_uri, serverSelectionTimeoutMS=5000)
            
            # Test connection
            self.client.admin.command('ping')
            self.db = self.client[self.db_name]
            self.collection = self.db[self.collection_name]
            
            print(f"✅ Connected to MongoDB database: {self.db_name}")
            return True
            
        except ConnectionFailure as e:
            print(f"❌ Failed to connect to MongoDB: {e}")
            return False
        except ServerSelectionTimeoutError as e:
            print(f"❌ MongoDB server selection timeout: {e}")
            return False
        except Exception as e:
            print(f"❌ Unexpected error connecting to MongoDB: {e}")
            return False
    
    def check_entities_collection(self) -> Dict:
        """Check the entities collection status"""
        try:
            # Check if collection exists
            collections = self.db.list_collection_names()
            exists = self.collection_name in collections
            
            if exists:
                count = self.collection.count_documents({})
                print(f"📊 Entities collection exists with {count} documents")
                
                # Sample a few entities to show structure
                if count > 0:
                    sample = list(self.collection.find().limit(2))
                    print("\n📋 Sample entities:")
                    for i, entity in enumerate(sample, 1):
                        entity_id = entity.get('entityId', 'Unknown')
                        entity_type = entity.get('entityType', 'Unknown')
                        name = entity.get('name', {}).get('full', 'Unknown')
                        risk_score = entity.get('riskAssessment', {}).get('overall', {}).get('score', 0)
                        print(f"  {i}. ID: {entity_id}, Type: {entity_type}, Name: {name}, Risk: {risk_score}")
                
                return {"exists": True, "count": count}
            else:
                print(f"⚠️  Entities collection does not exist")
                return {"exists": False, "count": 0}
                
        except Exception as e:
            print(f"❌ Error checking entities collection: {e}")
            return {"exists": False, "count": 0, "error": str(e)}
    
    def create_sample_entities(self) -> bool:
        """Create sample entities for testing"""
        print("\n🔧 Creating sample entities for testing...")
        
        sample_entities = [
            {
                "entityId": "ENT_001",
                "entityType": "INDIVIDUAL",
                "name": {
                    "full": "John Smith",
                    "structured": {
                        "first": "John",
                        "last": "Smith"
                    }
                },
                "dateOfBirth": datetime(1985, 3, 15),
                "addresses": [
                    {
                        "type": "RESIDENTIAL",
                        "address_line": "123 Main St",
                        "city": "New York",
                        "country": "US",
                        "postal_code": "10001"
                    }
                ],
                "identifiers": [
                    {
                        "type": "SSN",
                        "value": "123-45-6789",
                        "country": "US"
                    }
                ],
                "riskAssessment": {
                    "overall": {
                        "score": 0.2,
                        "level": "LOW"
                    },
                    "factors": {
                        "pep": False,
                        "sanctions": False,
                        "adverse_media": False
                    },
                    "last_updated": datetime.utcnow()
                },
                "watchlistMatches": [],
                "profileSummaryText": "Low-risk individual customer with standard profile",
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            },
            {
                "entityId": "ENT_002", 
                "entityType": "INDIVIDUAL",
                "name": {
                    "full": "Maria Garcia",
                    "structured": {
                        "first": "Maria",
                        "last": "Garcia"
                    }
                },
                "dateOfBirth": datetime(1992, 7, 22),
                "addresses": [
                    {
                        "type": "RESIDENTIAL",
                        "address_line": "456 Oak Ave",
                        "city": "Los Angeles",
                        "country": "US",
                        "postal_code": "90210"
                    }
                ],
                "identifiers": [
                    {
                        "type": "SSN",
                        "value": "987-65-4321",
                        "country": "US"
                    }
                ],
                "riskAssessment": {
                    "overall": {
                        "score": 0.7,
                        "level": "HIGH"
                    },
                    "factors": {
                        "pep": True,
                        "sanctions": False,
                        "adverse_media": True
                    },
                    "last_updated": datetime.utcnow()
                },
                "watchlistMatches": [
                    {
                        "list_name": "PEP_LIST",
                        "match_score": 0.85,
                        "matched_name": "Maria Garcia",
                        "match_details": {
                            "reason": "Political exposure",
                            "source": "Local government database"
                        }
                    }
                ],
                "profileSummaryText": "High-risk individual with political exposure and adverse media",
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            },
            {
                "entityId": "ENT_003",
                "entityType": "ORGANIZATION",
                "name": {
                    "full": "Tech Solutions Inc",
                    "structured": {
                        "legal_name": "Tech Solutions Incorporated",
                        "trade_name": "Tech Solutions Inc"
                    }
                },
                "addresses": [
                    {
                        "type": "BUSINESS",
                        "address_line": "789 Business Blvd",
                        "city": "San Francisco",
                        "country": "US",
                        "postal_code": "94105"
                    }
                ],
                "identifiers": [
                    {
                        "type": "EIN",
                        "value": "12-3456789",
                        "country": "US"
                    }
                ],
                "riskAssessment": {
                    "overall": {
                        "score": 0.4,
                        "level": "MEDIUM"
                    },
                    "factors": {
                        "high_risk_jurisdiction": False,
                        "shell_company_indicators": False,
                        "sanctions": False
                    },
                    "last_updated": datetime.utcnow()
                },
                "watchlistMatches": [],
                "profileSummaryText": "Medium-risk technology company with standard business profile",
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
        ]
        
        try:
            result = self.collection.insert_many(sample_entities)
            print(f"✅ Created {len(result.inserted_ids)} sample entities")
            return True
        except Exception as e:
            print(f"❌ Error creating sample entities: {e}")
            return False
    
    def test_collection_operations(self) -> bool:
        """Test basic collection operations"""
        print("\n🔬 Testing collection operations...")
        
        try:
            # Test find all
            all_entities = list(self.collection.find().limit(5))
            print(f"✅ Find all: Retrieved {len(all_entities)} entities")
            
            # Test find by entity type
            individuals = list(self.collection.find({"entityType": "INDIVIDUAL"}))
            print(f"✅ Find by type: Found {len(individuals)} individuals")
            
            # Test find by risk level
            high_risk = list(self.collection.find({"riskAssessment.overall.level": "HIGH"}))
            print(f"✅ Find by risk level: Found {len(high_risk)} high-risk entities")
            
            # Test find specific entity
            if all_entities:
                entity_id = all_entities[0]['entityId']
                specific = self.collection.find_one({"entityId": entity_id})
                if specific:
                    print(f"✅ Find specific: Found entity {entity_id}")
                else:
                    print(f"❌ Find specific: Could not find entity {entity_id}")
                    return False
            
            return True
            
        except Exception as e:
            print(f"❌ Error testing collection operations: {e}")
            return False
    
    def run_tests(self) -> bool:
        """Run all MongoDB tests"""
        print("🧪 MongoDB Entities Test Suite")
        print("=" * 40)
        
        # Connect to MongoDB
        if not self.connect():
            return False
        
        # Check entities collection
        collection_info = self.check_entities_collection()
        
        # Create sample data if collection is empty
        if collection_info.get("count", 0) == 0:
            print("\n⚠️  No entities found. Creating sample data...")
            if not self.create_sample_entities():
                return False
            # Recheck after creation
            collection_info = self.check_entities_collection()
        
        # Test collection operations
        if not self.test_collection_operations():
            return False
        
        print("\n✅ All MongoDB tests passed!")
        return True
    
    def cleanup(self):
        """Clean up MongoDB connection"""
        if self.client:
            self.client.close()

def main():
    """Main function"""
    tester = MongoDBEntityTester()
    
    try:
        success = tester.run_tests()
        if success:
            print("\n🎉 MongoDB entities are ready for AML API testing!")
        else:
            print("\n💥 MongoDB tests failed!")
        
        return 0 if success else 1
        
    except KeyboardInterrupt:
        print("\n⚠️  Tests interrupted by user")
        return 1
    except Exception as e:
        print(f"\n💥 Unexpected error: {e}")
        return 1
    finally:
        tester.cleanup()

if __name__ == "__main__":
    sys.exit(main())