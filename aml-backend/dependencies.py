from fastapi import Depends
from pymongo import MongoClient
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv
import logging
from db.mongo_db import MongoDBAccess

# Load environment variables
load_dotenv()

logger = logging.getLogger(__name__)

# MongoDB connection
MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME", "fsi-threatsight360")

# Create client instances
_mongo_client = None
_motor_client = None
_mongodb_access = None

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

def get_mongodb_access():
    """Get MongoDB access instance for AML operations"""
    global _mongodb_access
    if _mongodb_access is None:
        _mongodb_access = MongoDBAccess(MONGODB_URI)
    return _mongodb_access

# Access to specific collections
async def get_entities_collection():
    """Get entities collection for async operations"""
    db = get_database()
    return db.entities

# Dependencies for getting MongoDB access in FastAPI routes
def get_db_dependency():
    """Dependency for injecting MongoDB access into FastAPI routes"""
    return get_mongodb_access()

def get_async_db_dependency():
    """Dependency for injecting async MongoDB database into FastAPI routes"""
    return get_database()

# Configuration constants
ENTITIES_COLLECTION = "entities"
DEFAULT_PAGE_SIZE = 20
MAX_PAGE_SIZE = 100