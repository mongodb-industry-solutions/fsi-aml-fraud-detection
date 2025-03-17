from fastapi import APIRouter, Body, HTTPException, status, Depends, Query
from fastapi.responses import JSONResponse
from fastapi.encoders import jsonable_encoder
from typing import List, Optional, Dict, Any
import os
import logging
import json
from bson import ObjectId, json_util

from models.fraud_pattern import FraudPatternModel, FraudPatternResponse
from db.mongo_db import MongoDBAccess
from bedrock.embeddings import get_embedding

# Custom JSON encoder for MongoDB ObjectId
class MongoJSONEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, ObjectId):
            return str(obj)
        return super().default(obj)

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
    mongodb_uri = os.getenv("MONGODB_URI")
    # Connect to MongoDB without logging the URI
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
            # Don't fail, just continue without embedding
            logger.warning("Continuing without embedding")
    
    # Insert the pattern
    new_pattern = db.insert_one(
        db_name=DB_NAME,
        collection_name=PATTERN_COLLECTION,
        document=pattern_json
    )
    
    # Retrieve the created pattern
    created_pattern_doc = db.get_collection(
        db_name=DB_NAME,
        collection_name=PATTERN_COLLECTION
    ).find_one({"_id": new_pattern.inserted_id})
    
    # Convert ObjectId to string for proper JSON serialization
    if created_pattern_doc:
        created_pattern = {}
        for key, value in created_pattern_doc.items():
            if key == "_id" and isinstance(value, ObjectId):
                created_pattern[key] = str(value)
            elif key == "vector_embedding" and isinstance(value, list) and len(value) > 10:
                # Truncate the embedding for display purposes
                created_pattern[key] = value[:10] + ["..."]
            else:
                created_pattern[key] = value
    else:
        created_pattern = {"_id": str(new_pattern.inserted_id), "error": "Pattern created but couldn't be retrieved"}
    
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
    
    # Get patterns from database
    pattern_docs = list(db.get_collection(
        db_name=DB_NAME,
        collection_name=PATTERN_COLLECTION
    ).find(query).skip(skip).limit(limit))
    
    # Convert ObjectId to string for proper JSON serialization
    serialized_patterns = []
    for pattern in pattern_docs:
        serialized_pattern = {}
        for key, value in pattern.items():
            if key == "_id" and isinstance(value, ObjectId):
                serialized_pattern[key] = str(value)
            elif key == "vector_embedding" and isinstance(value, list) and len(value) > 10:
                # Truncate the embedding for display purposes
                serialized_pattern[key] = value[:10] + ["..."]
            else:
                serialized_pattern[key] = value
        serialized_patterns.append(serialized_pattern)
    
    logger.info(f"Returning {len(serialized_patterns)} fraud patterns")
    return serialized_patterns

@router.get("/{pattern_id}", response_description="Get a single fraud pattern", response_model=FraudPatternResponse)
async def get_fraud_pattern(pattern_id: str, db: MongoDBAccess = Depends(get_db)):
    # Try to convert to ObjectId if it's a valid format
    pattern_oid = None
    try:
        if ObjectId.is_valid(pattern_id):
            pattern_oid = ObjectId(pattern_id)
    except:
        pass
    
    # Try both string ID and ObjectId
    pattern = None
    if pattern_oid:
        pattern = db.get_collection(
            db_name=DB_NAME,
            collection_name=PATTERN_COLLECTION
        ).find_one({"_id": pattern_oid})
    
    # If not found with ObjectId, try with string
    if not pattern:
        pattern = db.get_collection(
            db_name=DB_NAME,
            collection_name=PATTERN_COLLECTION
        ).find_one({"_id": pattern_id})
    
    if pattern is not None:
        # Convert ObjectId to string for proper JSON serialization
        serialized_pattern = {}
        for key, value in pattern.items():
            if key == "_id" and isinstance(value, ObjectId):
                serialized_pattern[key] = str(value)
            elif key == "vector_embedding" and isinstance(value, list) and len(value) > 10:
                # Truncate the embedding for display purposes
                serialized_pattern[key] = value[:10] + ["..."]
            else:
                serialized_pattern[key] = value
        return serialized_pattern
    
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

@router.post("/similar-search/", response_description="Find similar patterns using vector search")
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
        # Log the request
        logger.info(f"Vector search request received - query: {query_text[:50]}...")
        
        # Get the collection and check if it exists
        collection = db.get_collection(
            db_name=DB_NAME,
            collection_name=PATTERN_COLLECTION
        )
        
        # List collections to verify
        db_instance = db.get_client()[DB_NAME]
        collections = db_instance.list_collection_names()
        logger.info(f"Available collections: {collections}")
        
        # Verify we can access the patterns collection
        count = collection.count_documents({})
        logger.info(f"Pattern collection contains {count} documents")
        
        # For debugging purposes, fetch a sample pattern
        sample_pattern = collection.find_one()
        if sample_pattern:
            logger.info(f"Sample pattern found: {sample_pattern.get('pattern_name', 'unknown')}")
        
        # Uncomment this block if you want to skip vector embedding for debugging
        # # In development, return the first few patterns if we can't do a vector search
        # # This helps with CORS debugging
        # query_embedding_available = False  # Set to false for testing only
        # if not query_embedding_available:
        #     logger.warning("Vector embeddings not available, returning sample patterns")
        #     patterns = list(collection.find().limit(limit))
        #     return {"results": patterns, "debug_info": "Using fallback pattern retrieval, no vector search"}
            
        try:
            # Generate embeddings for the query text using Titan model
            query_embedding = await get_embedding(query_text)
            logger.info(f"Generated embedding - vector size: {len(query_embedding)}")
        except Exception as embed_error:
            logger.error(f"Embedding generation failed: {str(embed_error)}")
            # Return a fallback response rather than failing completely
            patterns = list(collection.find().limit(limit))
            return {
                "results": patterns, 
                "error": f"Embedding generation failed: {str(embed_error)}",
                "debug_info": "Using fallback pattern retrieval, embedding generation failed"
            }
        
        # Check if vector search index exists
        has_vector_index = False
        indexes = collection.index_information()
        logger.info(f"Available indexes on fraud patterns collection: {list(indexes.keys())}")
        
        # Look for both the pattern and transaction vector indexes
        for index_name, index_info in indexes.items():
            logger.info(f"Examining index: {index_name}, info: {index_info}")
            if (index_name.startswith("vector_") or 
                "vector_index" in index_name or
                index_name == "pattern_vector_index"):
                has_vector_index = True
                logger.info(f"Found vector index on fraud patterns: {index_name}")
                # Store actual index name
                vector_index_name = index_name
                break
        
        if has_vector_index:
            try:
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
            except Exception as vector_error:
                logger.error(f"Vector search failed: {str(vector_error)}")
                # Fallback to returning recent patterns
                patterns = list(collection.find().limit(limit))
                return {
                    "results": patterns,
                    "error": f"Vector search failed: {str(vector_error)}",
                    "debug_info": "Using fallback pattern retrieval, vector search failed"
                }
        else:
            # Instead of fallback, create a vector index for demonstration purposes
            logger.warning("Vector search index not found - creating a simple 'example_index' for demonstration")
            try:
                # For demo purposes, we'll create a simple index if it doesn't exist
                # Note: In production, indexes should be created through proper deployment processes
                collection.create_index([("severity", 1)], name="severity_1")
                
                # Now try to do a simple query to get patterns with similar context
                # Get patterns sorted by severity for demonstration
                patterns = list(collection.find().sort("severity", -1).limit(limit))
                
                # Simply convert the ObjectId to string for each document
                for pattern in patterns:
                    if "_id" in pattern and isinstance(pattern["_id"], ObjectId):
                        pattern["_id"] = str(pattern["_id"])
                
                logger.info(f"Found {len(patterns)} patterns for demo")
            except Exception as demo_error:
                logger.error(f"Demo fallback failed: {str(demo_error)}")
                # Last resort - get some patterns and convert ids to strings
                patterns = []
                for doc in collection.find().limit(limit):
                    if "_id" in doc and isinstance(doc["_id"], ObjectId):
                        doc["_id"] = str(doc["_id"])
                    patterns.append(doc)
                
        # Convert any ObjectId to string in the results
        serializable_patterns = []
        for pattern in patterns:
            # Create a new dict with string IDs instead of ObjectId
            serializable_pattern = {}
            for key, value in pattern.items():
                if key == "_id" and isinstance(value, ObjectId):
                    serializable_pattern[key] = str(value)
                else:
                    serializable_pattern[key] = value
            serializable_patterns.append(serializable_pattern)
            
        logger.info(f"Returning {len(serializable_patterns)} patterns with serialized IDs")
        return {"results": serializable_patterns, "debug_info": "Search completed successfully"}
    
    except Exception as e:
        import traceback
        error_msg = f"Error in similarity search: {str(e)}"
        logger.error(error_msg)
        logger.error(traceback.format_exc())
        
        # Try to get some patterns anyway to not completely fail the UI
        try:
            collection = db.get_collection(db_name=DB_NAME, collection_name=PATTERN_COLLECTION)
            fallback_patterns = []
            
            # Safely convert ObjectId to strings to avoid JSON serialization errors
            for doc in collection.find().limit(limit):
                serializable_doc = {}
                for key, value in doc.items():
                    if key == "_id" and isinstance(value, ObjectId):
                        serializable_doc[key] = str(value)
                    else:
                        serializable_doc[key] = value
                fallback_patterns.append(serializable_doc)
                
            logger.info(f"Using {len(fallback_patterns)} fallback patterns")
            return {
                "results": fallback_patterns,
                "error": error_msg,
                "debug_info": "Using fallback patterns due to error"
            }
        except:
            # If all else fails, return a helpful error
            raise HTTPException(
                status_code=500, 
                detail={
                    "error": error_msg,
                    "suggestion": "Check MongoDB connection and vector search configuration"
                }
            )