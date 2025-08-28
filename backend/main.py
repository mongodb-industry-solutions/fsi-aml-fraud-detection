from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi import APIRouter
from contextlib import asynccontextmanager
from dotenv import load_dotenv
import os
import logging
from datetime import datetime

# Import routes
from routes.customer import router as customer_router
from routes.transaction import router as transaction_router
from routes.fraud_pattern import router as fraud_pattern_router
from routes.model_management import router as model_management_router
from routes.agent_routes import router as agent_router
from routes.observability import router as observability_router
# Entity resolution router removed - using enhanced system

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Handle application startup and shutdown"""
    # Startup
    logger.info("🚀 Starting ThreatSight 360 API with Azure AI Agent...")
    
    # Import here to avoid circular imports during startup
    from services.agent_service import agent_service
    
    # Initialize the agent service on startup (optional - can also be done on first request)
    try:
        success = await agent_service.initialize()
        if success:
            logger.info("✅ Azure AI Agent initialized and ready")
        else:
            logger.warning("⚠️ Agent initialization failed - will be available via /api/agent/initialize")
    except Exception as e:
        logger.warning(f"⚠️ Agent initialization failed on startup: {e}")
        logger.info("Agent will be available for manual initialization via /api/agent/initialize")
    
    yield
    
    # Shutdown
    logger.info("🔄 Shutting down ThreatSight 360 API...")
    try:
        await agent_service.cleanup()
        logger.info("✅ Agent resources cleaned up")
    except Exception as e:
        logger.error(f"Error during shutdown: {e}")

# Create FastAPI app with lifespan management
app = FastAPI(
    title="ThreatSight 360",
    description="Fraud Detection API for Financial Services with Azure AI Agent",
    version="1.0.0",
    # Disable automatic redirects for trailing slashes
    redirect_slashes=False,
    lifespan=lifespan,
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    """Root endpoint with system status"""
    from services.agent_service import agent_service
    
    agent_status = await agent_service.get_agent_status()
    
    return {
        "status": "ThreatSight 360 API is running!",
        "version": "1.0.0",
        "agent_status": agent_status.get("status", "unknown"),
        "agent_initialized": agent_status.get("initialized", False),
        "endpoints": {
            "agent_status": "/api/agent/status",
            "agent_analyze": "/api/agent/analyze", 
            "agent_test": "/api/agent/test",
            "docs": "/docs",
            "health": "/test-cors"
        }
    }

# Test endpoint for CORS
@app.get("/test-cors/", tags=["Health"])
async def test_cors():
    import logging
    logger = logging.getLogger(__name__)
    
    try:
        from pymongo import MongoClient
        from pymongo.errors import ConnectionFailure
        import os
        
        # Log the current environment
        mongo_uri = os.getenv("MONGODB_URI", "Not set")
        db_name = os.getenv("DB_NAME", "Not set")
        logger.info(f"Testing connection with DB_NAME={db_name}")
        
        # Mask the password for logging
        masked_uri = mongo_uri
        if ":" in mongo_uri and "@" in mongo_uri:
            parts = mongo_uri.split("@")
            prefix = parts[0].split(":")
            masked_uri = f"{prefix[0]}:***@{parts[1]}"
        logger.info(f"MONGODB_URI={masked_uri}")
        
        # Try a direct MongoDB connection
        client = MongoClient(mongo_uri, serverSelectionTimeoutMS=5000)
        client.admin.command('ping')  # Check connection
        
        # Try to access the database
        db = client[db_name]
        collections = db.list_collection_names()
        logger.info(f"Connected to MongoDB. Collections: {collections}")
        
        return {
            "message": "CORS and MongoDB connection are working!",
            "timestamp": str(datetime.now()),
            "collections": collections
        }
    except ConnectionFailure as e:
        logger.error(f"MongoDB connection error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"MongoDB connection error: {str(e)}")
    except Exception as e:
        import traceback
        logger.error(f"Error in test-cors endpoint: {str(e)}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

# Simple endpoint that doesn't use MongoDB
@app.get("/simple-test/", tags=["Health"])
async def simple_test():
    return {
        "message": "This endpoint doesn't use MongoDB and should work regardless of DB connection",
        "timestamp": str(datetime.now())
    }

# Include all routers
app.include_router(customer_router)
app.include_router(transaction_router)
app.include_router(fraud_pattern_router)
app.include_router(model_management_router)
app.include_router(agent_router)
app.include_router(observability_router)
# Entity resolution router removed - using enhanced system

# if __name__ == "__main__":
#     import uvicorn
    
#     host = os.getenv("HOST", "0.0.0.0")
#     port = int(os.getenv("PORT", "8000"))
    
#     logger.info(f"Starting ThreatSight 360 API on {host}:{port}")
#     uvicorn.run("main:app", host=host, port=port, reload=True, log_level="debug")