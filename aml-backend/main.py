from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os
import logging
from datetime import datetime

# Import organized routes with error handling
import sys

# Import organized routes from updated routes package
from routes import (
    core_entities_router,
    core_entity_resolution_router,
    atlas_search_router,
    vector_search_router,
    unified_search_router,
    entity_search_router,  # Phase 7 Stage 2
    network_analysis_router,
    search_debug_router,
    relationships_router,
    enhanced_resolution_router,
    transactions_router,
    llm_classification_router,
    llm_investigation_router
)

# Note: Fallback routes removed after successful migration to organized structure

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
    title="ThreatSight 360 - AML/KYC API",
    description="""
    Comprehensive Anti-Money Laundering and Know Your Customer API for Financial Services
    
    ## Features
    
    ### Entity Management
    - Entity CRUD operations with flexible schema support
    - Risk assessment and scoring
    - Watchlist matching and compliance screening
    
    ### Intelligent Entity Resolution
    - Atlas Search powered fuzzy matching
    - Duplicate detection during onboarding
    - Entity merging and master data management
    - Confidence scoring and match reasoning
    
    ### Relationship Management
    - Entity relationship tracking and analysis
    - Network graph construction and traversal
    - Relationship evidence and audit trails
    - Connected component analysis
    
    ### Core Capabilities
    - MongoDB Atlas Search integration for fuzzy matching
    - Configurable matching algorithms with boost factors
    - Real-time entity resolution workflows
    - Comprehensive audit trails and compliance reporting
    """,
    version="1.1.0",
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
    """Root endpoint to check API status"""
    return {
        "status": "AML/KYC API with Entity Resolution is running!",
        "service": "ThreatSight 360 - AML/KYC",
        "version": "1.1.0",
        "features": [
            "Entity Management",
            "Intelligent Entity Resolution", 
            "Atlas Search Integration",
            "Relationship Management",
            "Network Analysis"
        ],
        "endpoints": {
            "core": {
                "entities": "/entities/",
                "entity_resolution": "/entities/onboarding/find_matches",
                "entity_merging": "/entities/resolve"
            },
            "enhanced_resolution": {
                "demo_scenarios": "/api/v1/resolution/demo-scenarios-enhanced",
                "comprehensive_search": "/api/v1/resolution/comprehensive-search",
                "analyze_intelligence": "/api/v1/resolution/analyze-intelligence",
                "network_analysis": "/api/v1/resolution/network-analysis",
                "classify_entity": "/api/v1/resolution/classify-entity",
                "deep_investigation": "/api/v1/resolution/deep-investigation"
            },
            "llm_classification": {
                "classify_entity": "/llm/classification/classify-entity",
                "classify_workflow": "/llm/classification/classify-workflow",
                "health": "/llm/classification/health",
                "models": "/llm/classification/models"
            },
            "llm_investigation": {
                "create_case": "/llm/investigation/create-case",
                "health": "/llm/investigation/health"
            },
            "search": {
                "atlas_search": "/search/atlas/",
                "vector_search": "/search/vector/",
                "unified_search": "/search/unified/",
                "entity_search": "/entities/search/"
            },
            "network": {
                "analysis": "/network/",
                "entity_network": "/network/{entity_id}"
            },
            "transactions": {
                "entity_transactions": "/transactions/{entity_id}/transactions",
                "transaction_network": "/transactions/{entity_id}/transaction_network"
            },
            "relationships": "/relationships/",
            "debug": "/debug/",
            "system": {
                "health": "/health",
                "docs": "/docs"
            }
        },
        "timestamp": datetime.now().isoformat()
    }

@app.get("/health", tags=["Health"])
async def health_check():
    """Health check endpoint"""
    try:
        from dependencies import get_mongodb_access, DB_NAME
        
        # Test database connection
        db = get_mongodb_access()
        database = db.get_database(DB_NAME)
        
        # Try to list collections to verify connection
        collections = database.list_collection_names()
        
        return {
            "status": "healthy",
            "service": "AML/KYC API",
            "database": "connected",
            "database_name": DB_NAME,
            "collections": collections,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Health check failed: {str(e)}"
        )

# Test endpoint for basic connectivity
@app.get("/test", tags=["Health"])
async def test_endpoint():
    """Simple test endpoint that doesn't require database connection"""
    return {
        "message": "AML/KYC API test endpoint is working",
        "timestamp": datetime.now().isoformat(),
        "environment": {
            "mongodb_uri_configured": bool(os.getenv("MONGODB_URI")),
            "db_name": os.getenv("DB_NAME", "Not configured"),
            "host": os.getenv("HOST", "0.0.0.0"),
            "port": os.getenv("PORT", "8001")
        }
    }

# Helper function to safely include routers
def include_router_safely(app_instance, router, router_name):
    """Safely include router with error handling"""
    if router is not None:
        try:
            app_instance.include_router(router)
            logger.info(f"Successfully included {router_name} router")
        except Exception as e:
            logger.error(f"Failed to include {router_name} router: {e}")
    else:
        logger.warning(f"{router_name} router is None, skipping inclusion")

# Include routes in priority order (most specific first)

# 1. Search routes (most specific prefixes)
include_router_safely(app, atlas_search_router, "Atlas Search")
include_router_safely(app, vector_search_router, "Vector Search") 
include_router_safely(app, unified_search_router, "Unified Search")
include_router_safely(app, entity_search_router, "Entity Search - Phase 7")  # Phase 7 Stage 2

# 2. Network analysis routes
include_router_safely(app, network_analysis_router, "Network Analysis")

# 2.5. Transaction routes
include_router_safely(app, transactions_router, "Transactions")

# 3. Debug routes
include_router_safely(app, search_debug_router, "Search Debug")

# 4. Core entity resolution routes (before general entity routes)
include_router_safely(app, core_entity_resolution_router, "Core Entity Resolution")

# 4.5. Enhanced entity resolution routes (new advanced workflows)
include_router_safely(app, enhanced_resolution_router, "Enhanced Entity Resolution")

# 4.6. LLM Classification routes (AI-powered analysis)
include_router_safely(app, llm_classification_router, "LLM Classification")

# 4.7. LLM Investigation routes (Case investigation generation)
include_router_safely(app, llm_investigation_router, "LLM Investigation")

# 5. Core entity routes (has catch-all routes, so include after more specific routes)  
include_router_safely(app, core_entities_router, "Core Entities")

# 6. Relationship management routes
include_router_safely(app, relationships_router, "Updated Relationships")

logger.info("Route registration completed")

if __name__ == "__main__":
    import uvicorn
    
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", "8001"))
    
    logger.info(f"Starting ThreatSight 360 AML/KYC API on {host}:{port}")
    uvicorn.run("main:app", host=host, port=port, reload=True, log_level="info")