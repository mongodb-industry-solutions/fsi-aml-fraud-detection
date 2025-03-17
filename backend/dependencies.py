from fastapi import Depends
from pymongo import MongoClient
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv
import logging

# Load environment variables
load_dotenv()

logger = logging.getLogger(__name__)

# MongoDB connection
MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME")

# Create client instances
_mongo_client = None
_motor_client = None

def get_mongo_client():
    """Get synchronous MongoDB client"""
    global _mongo_client
    if _mongo_client is None:
        _mongo_client = MongoClient(MONGODB_URI)
    return _mongo_client

def get_motor_client():
    """Get asynchronous MongoDB client"""
    global _motor_client
    if _motor_client is None:
        _motor_client = AsyncIOMotorClient(MONGODB_URI)
    return _motor_client

def get_database():
    """Get database from motor client for async operations"""
    return get_motor_client()[DB_NAME]

# Access to specific collections
async def get_customers_collection():
    db = get_database()
    return db.customers

async def get_transactions_collection():
    db = get_database()
    return db.transactions

async def get_risk_models_collection():
    db = get_database()
    return db.risk_models

async def get_model_performance_collection():
    db = get_database()
    return db.model_performance

# Import services
from services.risk_model_service import RiskModelService

# Service instances
_risk_model_service = None

async def get_risk_model_service():
    global _risk_model_service
    if _risk_model_service is None:
        client = get_mongo_client()  # We'll continue using the sync client for the service
        _risk_model_service = RiskModelService(client)
        await _risk_model_service.start()
    return _risk_model_service