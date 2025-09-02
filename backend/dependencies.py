from fastapi import Depends
from pymongo import MongoClient
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv

from logging_setup import get_logger

# Load environment variables
load_dotenv()

logger = get_logger(__name__)

# MongoDB connection
MONGODB_URI = os.getenv("MONGODB_URI")
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

# Azure AI Foundry collections for agent decisions and learning
async def get_agent_decisions_collection():
    db = get_database()
    return db.agent_decision_history

async def get_learning_patterns_collection():
    db = get_database()
    return db.fraud_learning_patterns

# Import services
from services.risk_model_service import RiskModelService

# Service instances
_risk_model_service = None
_azure_agents_client = None

async def get_risk_model_service():
    global _risk_model_service
    if _risk_model_service is None:
        client = get_mongo_client()  # We'll continue using the sync client for the service
        _risk_model_service = RiskModelService(client)
        await _risk_model_service.start()
    return _risk_model_service

# Azure AI Foundry service instances
def get_azure_agents_client():
    """Get Azure AI Foundry agents client (requires Azure CLI authentication)"""
    global _azure_agents_client
    if _azure_agents_client is None:
        try:
            from azure.ai.agents import AgentsClient
            from azure.identity import DefaultAzureCredential
            
            project_endpoint = os.getenv('AZURE_AI_PROJECT_ENDPOINT')
            if not project_endpoint:
                logger.warning("AZURE_AI_PROJECT_ENDPOINT not configured - Azure AI Foundry agents unavailable")
                return None
                
            credential = DefaultAzureCredential()
            _azure_agents_client = AgentsClient(endpoint=project_endpoint, credential=credential)
            logger.info("✅ Azure AI Foundry agents client initialized")
            
        except Exception as e:
            logger.error(f"Failed to initialize Azure AI Foundry client: {e}")
            _azure_agents_client = None
    
    return _azure_agents_client

# Enhanced fraud detection service with Azure AI Foundry integration
from services.fraud_detection import FraudDetectionService
from db.mongo_db import MongoDBAccess

_enhanced_fraud_service = None

def get_enhanced_fraud_detection_service():
    """Get fraud detection service with Azure AI Foundry capabilities"""
    global _enhanced_fraud_service
    if _enhanced_fraud_service is None:
        # Use existing MongoDB client wrapper for compatibility
        mongo_client = get_mongo_client()
        db_wrapper = MongoDBAccess(MONGODB_URI)
        
        # Create enhanced service
        _enhanced_fraud_service = FraudDetectionService(
            db_client=db_wrapper,
            db_name=DB_NAME
        )
        
        # Add Azure AI Foundry client if available
        azure_client = get_azure_agents_client()
        if azure_client:
            # Extend service with Azure capabilities
            _enhanced_fraud_service._azure_agents_client = azure_client
            logger.info("✅ Enhanced fraud detection service with Azure AI Foundry")
        else:
            logger.info("✅ Standard fraud detection service (no Azure AI Foundry)")
    
    return _enhanced_fraud_service