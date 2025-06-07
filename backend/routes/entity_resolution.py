from fastapi import APIRouter, Body, HTTPException, status, Depends
from fastapi.responses import JSONResponse
from fastapi.encoders import jsonable_encoder
from typing import List, Optional, Dict, Any
from datetime import datetime, date
import os
import logging
from bson import ObjectId

from db.mongo_db import MongoDBAccess

# Environment variables
MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME", "fsi-threatsight360")
ENTITIES_COLLECTION = "entities"

router = APIRouter(
    prefix="/entities",
    tags=["entity-resolution"],
    responses={404: {"description": "Not found"}},
)

logger = logging.getLogger(__name__)

# Dependency to get MongoDB client
def get_db():
    from dotenv import load_dotenv
    load_dotenv()
    
    mongodb_uri = os.getenv("MONGODB_URI")
    db = MongoDBAccess(mongodb_uri)
    try:
        yield db
    finally:
        del db

@router.post("/onboarding/find_matches", response_description="Find potential entity matches")
async def find_entity_matches(
    onboarding_data: Dict[str, Any] = Body(...),
    limit: int = 10,
    db: MongoDBAccess = Depends(get_db)
):
    """
    Find potential entity matches using Atlas Search with fuzzy matching.
    Works with existing date index by using compound search queries.
    """
    try:
        logger.info(f"Finding matches for: {onboarding_data}")
        
        collection = db.get_collection(
            db_name=DB_NAME,
            collection_name=ENTITIES_COLLECTION
        )
        
        # Build search query that works with existing date index
        search_clauses = []
        
        # Name search - primary fuzzy matching
        if onboarding_data.get("name_full"):
            search_clauses.append({
                "text": {
                    "query": onboarding_data["name_full"],
                    "path": "name.full",
                    "fuzzy": {
                        "maxEdits": 2,
                        "prefixLength": 1
                    }
                }
            })
        
        # Address search  
        if onboarding_data.get("address_full"):
            search_clauses.append({
                "text": {
                    "query": onboarding_data["address_full"],
                    "path": "addresses.full",
                    "fuzzy": {
                        "maxEdits": 2
                    }
                }
            })
        
        # Date of birth - use range query for date index
        date_filter = None
        if onboarding_data.get("date_of_birth"):
            try:
                # Parse the input date
                input_date = datetime.strptime(onboarding_data["date_of_birth"], "%Y-%m-%d").date()
                
                # Create a range filter for +/- 1 year to catch potential data entry errors
                from datetime import timedelta
                start_date = input_date.replace(year=input_date.year - 1)
                end_date = input_date.replace(year=input_date.year + 1)
                
                date_filter = {
                    "range": {
                        "path": "dateOfBirth",
                        "gte": start_date.isoformat(),
                        "lte": end_date.isoformat()
                    }
                }
            except ValueError:
                logger.warning(f"Invalid date format: {onboarding_data['date_of_birth']}")
        
        # Identifier search
        if onboarding_data.get("identifier_value"):
            search_clauses.append({
                "text": {
                    "query": onboarding_data["identifier_value"],
                    "path": "identifiers.value"
                }
            })
        
        # Build compound search query
        if not search_clauses:
            return JSONResponse(
                status_code=400,
                content={"error": "At least one search field (name_full, address_full, identifier_value) is required"}
            )
        
        # Create the aggregation pipeline
        pipeline = [
            {
                "$search": {
                    "index": "entity_resolution_search",
                    "compound": {
                        "should": search_clauses,
                        "minimumShouldMatch": 1
                    }
                }
            },
            {
                "$addFields": {
                    "searchScore": {"$meta": "searchScore"}
                }
            }
        ]
        
        # Add date filter as a separate stage if provided
        if date_filter:
            pipeline.insert(1, {
                "$match": {
                    "dateOfBirth": {
                        "$gte": date_filter["range"]["gte"],
                        "$lte": date_filter["range"]["lte"]
                    }
                }
            })
        
        # Add sorting and limiting
        pipeline.extend([
            {"$sort": {"searchScore": -1}},
            {"$limit": limit}
        ])
        
        logger.info(f"Executing search pipeline: {pipeline}")
        
        # Execute search
        results = list(collection.aggregate(pipeline))
        
        logger.info(f"Found {len(results)} potential matches")
        
        # Convert ObjectId to string for JSON serialization
        for result in results:
            if "_id" in result:
                result["_id"] = str(result["_id"])
        
        return {
            "matches": results,
            "total_found": len(results),
            "search_params": onboarding_data,
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error in find_entity_matches: {str(e)}")
        logger.error(f"Pipeline that failed: {pipeline if 'pipeline' in locals() else 'Pipeline not created'}")
        raise HTTPException(
            status_code=500,
            detail=f"Search failed: {str(e)}"
        )

@router.post("/resolve", response_description="Resolve entity relationships")
async def resolve_entities(
    resolution_data: Dict[str, Any] = Body(...),
    db: MongoDBAccess = Depends(get_db)
):
    """
    Resolve entity relationships by creating resolution records.
    """
    try:
        logger.info(f"Resolving entities: {resolution_data}")
        
        collection = db.get_collection(
            db_name=DB_NAME,
            collection_name="entity_resolutions"
        )
        
        # Create resolution record
        resolution_record = {
            "sourceEntityId": resolution_data.get("sourceEntityId"),
            "targetMasterEntityId": resolution_data.get("targetMasterEntityId"),
            "decision": resolution_data.get("decision"),
            "matchConfidence": resolution_data.get("matchConfidence", 0.0),
            "matchedAttributes": resolution_data.get("matchedAttributes", []),
            "resolvedBy": resolution_data.get("resolvedBy", "system"),
            "notes": resolution_data.get("notes", ""),
            "createdAt": datetime.now().isoformat(),
            "status": "active"
        }
        
        # Insert resolution record
        result = collection.insert_one(resolution_record)
        
        # If it's a confirmed match, create relationship in entities collection
        if resolution_data.get("decision") == "confirmed_match":
            entities_collection = db.get_collection(
                db_name=DB_NAME,
                collection_name=ENTITIES_COLLECTION
            )
            
            # Update the target entity with relationship info
            entities_collection.update_one(
                {"entityId": resolution_data.get("targetMasterEntityId")},
                {
                    "$addToSet": {
                        "relatedEntities": {
                            "entityId": resolution_data.get("sourceEntityId"),
                            "relationship": "duplicate_of",
                            "confidence": resolution_data.get("matchConfidence", 0.0),
                            "resolvedAt": datetime.now().isoformat()
                        }
                    }
                }
            )
        
        logger.info(f"Resolution completed with ID: {result.inserted_id}")
        
        return {
            "resolution_id": str(result.inserted_id),
            "status": "completed",
            "decision": resolution_data.get("decision"),
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error in resolve_entities: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Resolution failed: {str(e)}"
        )

@router.get("/resolutions", response_description="Get entity resolutions")
async def get_entity_resolutions(
    limit: int = 50,
    skip: int = 0,
    db: MongoDBAccess = Depends(get_db)
):
    """
    Get entity resolution history.
    """
    try:
        collection = db.get_collection(
            db_name=DB_NAME,
            collection_name="entity_resolutions"
        )
        
        resolutions = list(
            collection.find()
            .sort("createdAt", -1)
            .skip(skip)
            .limit(limit)
        )
        
        # Convert ObjectId to string
        for resolution in resolutions:
            if "_id" in resolution:
                resolution["_id"] = str(resolution["_id"])
        
        return {
            "resolutions": resolutions,
            "total": len(resolutions)
        }
        
    except Exception as e:
        logger.error(f"Error getting resolutions: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get resolutions: {str(e)}"
        )