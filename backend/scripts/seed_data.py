#!/usr/bin/env python3
"""
Seed script to populate the ThreatSight 360 database with sample data.
This script will create sample customer profiles, fraud patterns, and sample transactions.
"""

import os
import json
import logging
import asyncio
from datetime import datetime, timedelta
from dotenv import load_dotenv
from pymongo import MongoClient
from bson import ObjectId

# Add the parent directory to the path so we can import our modules
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from bedrock.embeddings import get_embedding

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# MongoDB connection settings
MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME", "fsi-threatsight360")

# Collection names
CUSTOMER_COLLECTION = "customers"
TRANSACTION_COLLECTION = "transactions"
FRAUD_PATTERN_COLLECTION = "fraud_patterns"

# Sample fraud patterns with descriptions
FRAUD_PATTERNS = [
    {
        "pattern_name": "Account Takeover",
        "description": "New device login followed by unusual transactions and settings changes",
        "severity": "high",
        "indicators": [
            "new_device",
            "unusual_location",
            "settings_change",
            "high_value_transaction"
        ],
        "detection_rate": 0.83,
        "false_positive_rate": 0.05
    },
    {
        "pattern_name": "Transaction Anomaly",
        "description": "Transaction amount significantly higher than customer's average with unusual merchant category",
        "severity": "medium",
        "indicators": [
            "unusual_amount",
            "uncommon_merchant",
            "velocity_alert"
        ],
        "detection_rate": 0.75,
        "false_positive_rate": 0.12
    },
    {
        "pattern_name": "Geographical Anomaly",
        "description": "Transactions from multiple distant locations in a short time period",
        "severity": "high",
        "indicators": [
            "unexpected_location",
            "velocity_alert",
            "impossible_travel"
        ],
        "detection_rate": 0.92,
        "false_positive_rate": 0.08
    },
    {
        "pattern_name": "Card Testing",
        "description": "Multiple small transactions followed by a larger transaction",
        "severity": "medium",
        "indicators": [
            "multiple_small_transactions",
            "increasing_amounts",
            "velocity_alert"
        ],
        "detection_rate": 0.68,
        "false_positive_rate": 0.15
    },
    {
        "pattern_name": "Unauthorized Transfer",
        "description": "Wire transfer to a new recipient with unusual amount and time",
        "severity": "critical",
        "indicators": [
            "unusual_amount",
            "new_recipient",
            "rare_transaction_time",
            "high_risk_method"
        ],
        "detection_rate": 0.95,
        "false_positive_rate": 0.03
    }
]

# Connect to MongoDB
def get_db_connection():
    try:
        client = MongoClient(MONGODB_URI)
        db = client[DB_NAME]
        logger.info(f"Connected to MongoDB: {DB_NAME}")
        return client, db
    except Exception as e:
        logger.error(f"Failed to connect to MongoDB: {e}")
        sys.exit(1)

# Create indexes
def create_indexes(db):
    # Customer collection indexes
    db[CUSTOMER_COLLECTION].create_index("personal_info.email", unique=True)
    db[CUSTOMER_COLLECTION].create_index("account_info.account_number", unique=True)
    
    # Transaction collection indexes
    db[TRANSACTION_COLLECTION].create_index("transaction_id", unique=True)
    db[TRANSACTION_COLLECTION].create_index("customer_id")
    db[TRANSACTION_COLLECTION].create_index("timestamp")
    db[TRANSACTION_COLLECTION].create_index("risk_assessment.level")
    
    # Create text index on fraud patterns for basic text search fallback
    db[FRAUD_PATTERN_COLLECTION].create_index([
        ("pattern_name", "text"),
        ("description", "text"),
        ("indicators", "text")
    ])
    
    logger.info("Created database indexes")

# Load sample customer data
def load_sample_customers(db):
    # Check if we already have customer data
    if db[CUSTOMER_COLLECTION].count_documents({}) > 0:
        logger.info(f"Customer collection already has data. Skipping import.")
        return

    # Load from sample data file if it exists
    sample_data_path = os.path.join(os.path.dirname(__file__), "sample_customers.json")
    if os.path.exists(sample_data_path):
        try:
            with open(sample_data_path, 'r') as f:
                customers = json.load(f)
            
            if customers:
                db[CUSTOMER_COLLECTION].insert_many(customers)
                logger.info(f"Imported {len(customers)} customers from sample file")
                return
        except Exception as e:
            logger.warning(f"Failed to load sample customers from file: {e}")
    
    # If no sample file, create minimal example data
    customers = [{
        "_id": str(ObjectId()),
        "personal_info": {
            "name": "John Smith",
            "email": "john.smith@example.com",
            "phone": "555-123-4567",
            "address": {
                "street": "123 Main St",
                "city": "New York",
                "state": "NY",
                "country": "USA",
                "zip": "10001"
            },
            "dob": "1980-01-01"
        },
        "account_info": {
            "account_number": "ACCT12345678",
            "account_type": "checking",
            "creation_date": datetime.now() - timedelta(days=365),
            "status": "active",
            "credit_score": 750
        },
        "behavioral_profile": {
            "devices": [
                {
                    "device_id": "d-" + str(ObjectId()),
                    "type": "mobile",
                    "os": "iOS",
                    "browser": "Safari",
                    "ip_range": [
                        "192.168.1.1",
                        "192.168.1.2"
                    ],
                    "usual_locations": [
                        {
                            "city": "New York",
                            "state": "NY",
                            "country": "USA",
                            "location": {
                                "type": "Point",
                                "coordinates": [-74.0060, 40.7128]
                            },
                            "frequency": 0.8
                        }
                    ]
                }
            ],
            "transaction_patterns": {
                "avg_transaction_amount": 100.00,
                "std_transaction_amount": 25.00,
                "avg_transactions_per_day": 2.5,
                "common_merchant_categories": [
                    "grocery",
                    "restaurant",
                    "retail"
                ],
                "usual_transaction_times": [
                    {
                        "day_of_week": 1,
                        "hour_range": [9, 17]
                    }
                ],
                "usual_transaction_locations": [
                    {
                        "city": "New York",
                        "state": "NY",
                        "country": "USA",
                        "location": {
                            "type": "Point",
                            "coordinates": [-74.0060, 40.7128]
                        },
                        "frequency": 0.8
                    }
                ]
            }
        },
        "risk_profile": {
            "overall_risk_score": 10.0,
            "last_risk_assessment": datetime.now(),
            "risk_factors": [],
            "last_reported_fraud": None
        },
        "metadata": {
            "last_updated": datetime.now(),
            "created_at": datetime.now() - timedelta(days=365)
        }
    }]
    
    db[CUSTOMER_COLLECTION].insert_many(customers)
    logger.info(f"Created {len(customers)} sample customers")

# Create fraud patterns with embeddings
async def create_fraud_patterns(db):
    # Check if we already have pattern data
    if db[FRAUD_PATTERN_COLLECTION].count_documents({}) > 0:
        logger.info(f"Fraud pattern collection already has data. Skipping import.")
        return

    # Create patterns with embeddings
    for pattern in FRAUD_PATTERNS:
        # Generate embedding 
        try:
            # Use our get_embedding function to generate an embedding for the pattern description
            embedding = await get_embedding(pattern["description"])
            pattern["vector_embedding"] = embedding
            
            # Insert pattern with embedding
            db[FRAUD_PATTERN_COLLECTION].insert_one(pattern)
            logger.info(f"Created fraud pattern: {pattern['pattern_name']}")
            
        except Exception as e:
            logger.error(f"Error generating embedding for pattern {pattern['pattern_name']}: {e}")
            # Insert without embedding as fallback
            pattern["vector_embedding"] = []
            db[FRAUD_PATTERN_COLLECTION].insert_one(pattern)
            logger.warning(f"Created fraud pattern without embedding: {pattern['pattern_name']}")

# Main function to run the seeding process
async def main():
    logger.info("Starting data seed process")
    client, db = get_db_connection()
    
    try:
        # Create database indexes
        create_indexes(db)
        
        # Load sample data
        load_sample_customers(db)
        
        # Create fraud patterns with embeddings
        await create_fraud_patterns(db)
        
        logger.info("Data seeding complete")
        
    except Exception as e:
        logger.error(f"Error during data seeding: {e}")
    finally:
        client.close()

if __name__ == "__main__":
    asyncio.run(main())