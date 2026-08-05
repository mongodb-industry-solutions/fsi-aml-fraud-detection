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
DB_NAME = os.getenv("DB_NAME", "leafy_bank_bian")

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
    """Get the party collection for async operations.

    Returns the raw BIAN `customers` collection -- callers must apply
    `entity_fields.scoped()` themselves, since this collection is shared with
    the Leafy Bank payments demo.
    """
    db = get_database()
    return db[ENTITIES_COLLECTION]

# Dependencies for getting MongoDB access in FastAPI routes
def get_db_dependency():
    """
    Dependency for injecting MongoDB access into FastAPI routes.
    Returns MongoDBAccess wrapper object (legacy pattern).
    Use get_async_db_dependency() for new routes.
    """
    return get_mongodb_access()

def get_async_db_dependency():
    """
    Dependency for injecting async MongoDB database into FastAPI routes.
    Returns AsyncIOMotorDatabase object directly (recommended pattern).
    Use this for all new routes and services.
    """
    return get_database()

# Configuration constants
#
# Phase-2 step 3: parties now come from the BIAN `customers` collection. The
# collection is SHARED with the Leafy Bank payments demo (558 docs, 554 ours),
# so every read must be scoped -- see repositories/entity_fields.py `scoped()`
# and `search_scope_clause()`.
#
# ⚠️ Like RELATIONSHIPS_COLLECTION, this is injected from the
# `fsi-fraud-detection-bian` Kanopy secret in staging and prod, and the SECRET
# VALUE WINS OVER THIS DEFAULT. Deploying without flipping the secret points the
# new code at `threatsightEntities`, whose documents have none of the BIAN paths
# -- every field renders blank and nothing errors.
ENTITIES_COLLECTION = os.getenv("ENTITIES_COLLECTION", "customers")

# BIAN `relationships` (phase 2). Several agent tools used to inline the literal
# "threatsightRelationships"; they now import this so the collection flip reaches
# every consumer at once. Field paths for these documents live in
# repositories/relationship_fields.py.
RELATIONSHIPS_COLLECTION = os.getenv("RELATIONSHIPS_COLLECTION", "relationships")

# LangGraph checkpoint collections. Both the investigation graph (services/agents/graph.py)
# and the chat agent (services/agents/chat_agent.py) share these, which preserves the
# pre-rename behaviour where both used the library defaults.
#
# These MUST be passed to MongoDBSaver explicitly. Its first argument is a MongoClient,
# and its defaults are db_name="checkpointing_db" / "checkpoints" / "checkpoint_writes";
# passing a Database instead of a client made `client[db_name]` resolve to a COLLECTION
# named "checkpointing_db", so the writes landed in dot-namespaced sub-collections
# `checkpointing_db.checkpoints` and `checkpointing_db.checkpoint_writes`.
CHECKPOINTS_COLLECTION = "threatsightCheckpoints"
CHECKPOINT_WRITES_COLLECTION = "threatsightCheckpointWrites"
DEFAULT_PAGE_SIZE = 20
MAX_PAGE_SIZE = 100

# Vector Search Configuration
ENTITY_VECTOR_SEARCH_INDEX = os.getenv("ENTITY_VECTOR_SEARCH_INDEX", "entity_vector_search_index")