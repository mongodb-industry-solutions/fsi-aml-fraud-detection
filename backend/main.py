from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi import APIRouter
import logging
import config
from db.mongo_db import MongoDBAccess
from routers import transactions, fraud_rules

# Configure logging
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="MongoDB Fraud Detection API",
    description="API for fraud detection using MongoDB and vector search",
    version="1.0.0",
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create base router
router = APIRouter()

# Include routers
app.include_router(transactions.router)
app.include_router(fraud_rules.router)


@app.get("/")
async def read_root(request: Request):
    return {"message": "Fraud Detection API is running"}


@app.on_event("startup")
async def startup():
    """
    Application startup: initialize database and create vector search index if needed
    """
    try:
        # Initialize MongoDB connection
        mongo_client = MongoDBAccess(config.MONGODB_URI)
        
        # Get collections
        transactions_collection = mongo_client.get_collection(
            config.DB_NAME, config.TRANSACTIONS_COLLECTION
        )
        rules_collection = mongo_client.get_collection(
            config.DB_NAME, config.RULES_COLLECTION
        )
        
        # Ensure default rules exist
        if rules_collection.count_documents({}) == 0:
            logger.info("Initializing default fraud detection rules")
            rules_collection.insert_one(config.DEFAULT_RULES)
        
        # Create vector search index (handled in transaction service)
        from services.transaction_service import TransactionService
        TransactionService(transactions_collection, rules_collection)
        
        logger.info("Application startup completed successfully")
    except Exception as e:
        logger.error(f"Error during application startup: {str(e)}")
        # We don't want to crash the app, just log the error
        pass