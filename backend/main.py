from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi import APIRouter
from dotenv import load_dotenv
import os
import logging
from datetime import datetime

# Import routes
from routes.customer import router as customer_router
from routes.transaction import router as transaction_router
from routes.fraud_pattern import router as fraud_pattern_router
from routes.model_management import router as model_management_router

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# Create FastAPI app
app = FastAPI(
    title="ThreatSight 360",
    description="Fraud Detection API for Financial Services",
    version="1.0.0",
    # Disable automatic redirects for trailing slashes
    redirect_slashes=False,
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
    return {"status": "Server is running!"}

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

# if __name__ == "__main__":
#     import uvicorn
    
#     host = os.getenv("HOST", "0.0.0.0")
#     port = int(os.getenv("PORT", "8000"))
    
#     logger.info(f"Starting ThreatSight 360 API on {host}:{port}")
#     uvicorn.run("main:app", host=host, port=port, reload=True, log_level="debug")