from fastapi import APIRouter, Body, HTTPException, status, Depends, Query
from fastapi.responses import JSONResponse
from fastapi.encoders import jsonable_encoder
from typing import List, Optional, Dict, Any
import os
import logging

from models.fraud_pattern import FraudPatternModel, FraudPatternResponse
from db.mongo_db import MongoDBAccess
from bedrock.embeddings import get_embedding

# Set up logging
logger = logging.getLogger(__name__)

# Environment variables
MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME", "fsi-threatsight360")
PATTERN_COLLECTION = "fraud_patterns"

router = APIRouter(
    prefix="/fraud-patterns",
    tags=["fraud patterns"],
    responses={404: {"description": "Not found"}},
)

# Dependency to get MongoDB client
def get_db():
    import logging
    logger = logging.getLogger(__name__)
    
    # Re-read environment variables to ensure we have the most current values
    from dotenv import load_dotenv
    load_dotenv()
    
    # Get the MongoDB URI from environment
    mongodb_uri = os.getenv("MONGODB_URI", "mongodb+srv://fsi-demos:C0tG65bD18Ef9MvF@ist-shared.n0kts.mongodb.net")
    logger.info(f"Connecting to MongoDB with URI: {'mongodb+srv:***@ist-shared.n0kts.mongodb.net' if 'mongodb+srv' in mongodb_uri else mongodb_uri}")
    
    db = MongoDBAccess(mongodb_uri)
    try:
        yield db
    finally:
        # Clean up and close connection when done
        del db

@router.post("/", response_description="Add new fraud pattern", response_model=FraudPatternResponse)
async def create_fraud_pattern(pattern: FraudPatternModel = Body(...), db: MongoDBAccess = Depends(get_db)):
    pattern_json = jsonable_encoder(pattern)
    
    # Generate embeddings for the pattern description using Amazon Bedrock Titan
    if "vector_embedding" not in pattern_json or not pattern_json["vector_embedding"]:
        pattern_description = pattern_json["description"]
        try:
            # Call Titan Embeddings model to get vector representation
            embedding = await get_embedding(pattern_description)
            pattern_json["vector_embedding"] = embedding
            logger.info(f"Generated embedding for pattern: {pattern_description[:50]}...")
        except Exception as e:
            error_msg = f"Failed to generate embedding: {str(e)}"
            logger.error(error_msg)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=error_msg
            )
    
    new_pattern = db.insert_one(
        db_name=DB_NAME,
        collection_name=PATTERN_COLLECTION,
        document=pattern_json
    )
    created_pattern = db.get_collection(
        db_name=DB_NAME,
        collection_name=PATTERN_COLLECTION
    ).find_one({"_id": new_pattern.inserted_id})
    
    return JSONResponse(status_code=status.HTTP_201_CREATED, content=created_pattern)

@router.get("/", response_description="List fraud patterns", response_model=List[FraudPatternResponse])
async def list_fraud_patterns(
    db: MongoDBAccess = Depends(get_db), 
    limit: int = 20, 
    skip: int = 0,
    severity: Optional[str] = Query(None, description="Filter by severity (low, medium, high, critical)"),
    indicator: Optional[str] = Query(None, description="Filter patterns that include this indicator")
):
    query = {}
    
    if severity:
        query["severity"] = severity
    
    if indicator:
        query["indicators"] = {"$in": [indicator]}
    
    patterns = list(db.get_collection(
        db_name=DB_NAME,
        collection_name=PATTERN_COLLECTION
    ).find(query).skip(skip).limit(limit))
    
    return patterns

@router.get("/{pattern_id}", response_description="Get a single fraud pattern", response_model=FraudPatternResponse)
async def get_fraud_pattern(pattern_id: str, db: MongoDBAccess = Depends(get_db)):
    if (pattern := db.get_collection(
        db_name=DB_NAME,
        collection_name=PATTERN_COLLECTION
    ).find_one({"_id": pattern_id})) is not None:
        return pattern
    
    raise HTTPException(status_code=404, detail=f"Fraud pattern with ID {pattern_id} not found")

@router.put("/{pattern_id}", response_description="Update a fraud pattern", response_model=FraudPatternResponse)
async def update_fraud_pattern(pattern_id: str, pattern: FraudPatternModel = Body(...), db: MongoDBAccess = Depends(get_db)):
    pattern_dict = {k: v for k, v in pattern.dict().items() if v is not None}
    
    # Check if description was updated, if so, regenerate embeddings
    should_update_embedding = "description" in pattern_dict and pattern_dict["description"]
    
    if should_update_embedding:
        try:
            # Generate new embeddings with Titan model
            embedding = await get_embedding(pattern_dict["description"])
            pattern_dict["vector_embedding"] = embedding
            logger.info(f"Updated embedding for pattern ID {pattern_id}")
        except Exception as e:
            error_msg = f"Failed to update embedding: {str(e)}"
            logger.error(error_msg)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=error_msg
            )
    
    if len(pattern_dict) >= 1:
        update_result = db.get_collection(
            db_name=DB_NAME,
            collection_name=PATTERN_COLLECTION
        ).update_one({"_id": pattern_id}, {"$set": pattern_dict})
        
        if update_result.modified_count == 0:
            raise HTTPException(status_code=404, detail=f"Fraud pattern with ID {pattern_id} not found")
    
    if (updated_pattern := db.get_collection(
        db_name=DB_NAME,
        collection_name=PATTERN_COLLECTION
    ).find_one({"_id": pattern_id})) is not None:
        return updated_pattern
    
    raise HTTPException(status_code=404, detail=f"Fraud pattern with ID {pattern_id} not found")

@router.delete("/{pattern_id}", response_description="Delete a fraud pattern")
async def delete_fraud_pattern(pattern_id: str, db: MongoDBAccess = Depends(get_db)):
    delete_result = db.get_collection(
        db_name=DB_NAME,
        collection_name=PATTERN_COLLECTION
    ).delete_one({"_id": pattern_id})
    
    if delete_result.deleted_count == 1:
        return JSONResponse(status_code=status.HTTP_204_NO_CONTENT)
    
    raise HTTPException(status_code=404, detail=f"Fraud pattern with ID {pattern_id} not found")

@router.post("/similar-search", response_description="Find similar patterns using vector search")
async def similar_patterns_search(
    query: Dict[str, Any] = Body(..., example={"text": "Unusual login followed by money transfers to new accounts"}),
    db: MongoDBAccess = Depends(get_db),
    limit: int = 5
):
    """
    Perform a similarity search using vector embeddings to find fraud patterns similar to the input text.
    
    This endpoint generates embeddings using the Amazon Titan embedding model and
    then performs a vector search in MongoDB to find similar patterns.
    """
    if "text" not in query:
        raise HTTPException(status_code=400, detail="Query must include 'text' field")
    
    query_text = query["text"]
    
    try:
        # Generate embeddings for the query text using Titan model
        query_embedding = await get_embedding(query_text)
        logger.info(f"Generated embedding for query: {query_text[:50]}...")
        
        # Check if the MongoDB database supports vector search
        # If using MongoDB Atlas with vector search enabled:
        collection = db.get_collection(
            db_name=DB_NAME,
            collection_name=PATTERN_COLLECTION
        )
        
        # Check if vector search index exists
        has_vector_index = False
        for index in collection.index_information().values():
            if index.get("name", "").startswith("vector_"):
                has_vector_index = True
                break
        
        if has_vector_index:
            # Use vector search with MongoDB Atlas
            pipeline = [
                {
                    "$vectorSearch": {
                        "index": "vector_index",  # Must match your actual index name
                        "path": "vector_embedding",
                        "queryVector": query_embedding,
                        "numCandidates": limit * 10,  # Scan more candidates for better results
                        "limit": limit
                    }
                }
            ]
            patterns = list(collection.aggregate(pipeline))
            logger.info(f"Vector search found {len(patterns)} matches")
        else:
            # Fallback to $text search if vector search not available
            logger.warning("Vector search index not found, falling back to text search")
            patterns = list(collection.find(
                {"$text": {"$search": query_text}} if "text" in collection.index_information() else {}
            ).limit(limit))
            
            if not patterns:
                # If no patterns found with text search, return most recent patterns
                patterns = list(collection.find().limit(limit))
                
        return {"results": patterns}
    
    except Exception as e:
        error_msg = f"Error in similarity search: {str(e)}"
        logger.error(error_msg)
        raise HTTPException(status_code=500, detail=error_msg)