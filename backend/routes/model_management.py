# routes/model_management.py
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Body, Query, WebSocket, WebSocketDisconnect
from pymongo import MongoClient 
from motor.motor_asyncio import AsyncIOMotorDatabase
from datetime import datetime, timedelta
from bson import ObjectId, json_util
from pydantic import BaseModel, Field
import json
import asyncio
import logging
from datetime import datetime

from dependencies import get_database, get_risk_model_service
from services.risk_model_service import RiskModelService

router = APIRouter(
    prefix="/models",
    tags=["risk_models"],
    responses={404: {"description": "Not found"}},
)

# Active WebSocket connections for Change Stream updates
active_connections = []

# Helper function to convert MongoDB documents to JSON-serializable format
def convert_to_json_serializable(obj):
    """Convert MongoDB document to JSON-serializable format."""
    if isinstance(obj, datetime):
        return obj.isoformat()
    elif isinstance(obj, ObjectId):
        return str(obj)
    elif isinstance(obj, dict):
        return {k: convert_to_json_serializable(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [convert_to_json_serializable(item) for item in obj]
    return obj

# Models
class RiskFactor(BaseModel):
    id: str
    description: str
    threshold: float = None
    distanceThreshold: float = None
    active: bool = True

class RiskModelCreate(BaseModel):
    modelId: str
    description: str
    weights: Dict[str, float]
    thresholds: Dict[str, float]
    riskFactors: List[RiskFactor]

class RiskModelUpdate(BaseModel):
    description: Optional[str] = None
    weights: Optional[Dict[str, float]] = None
    thresholds: Optional[Dict[str, float]] = None
    riskFactors: Optional[List[RiskFactor]] = None
    status: Optional[str] = None

class RiskModelResponse(BaseModel):
    id: str = Field(..., alias="_id")
    modelId: str
    version: int
    status: str
    createdAt: datetime
    updatedAt: datetime
    description: str
    weights: Dict[str, float]
    thresholds: Dict[str, float]
    riskFactors: List[Dict[str, Any]]
    performance: Optional[Dict[str, Any]] = None
    
    class Config:
        arbitrary_types_allowed = True
        json_encoders = {
            ObjectId: str
        }
        
    @classmethod
    def from_mongo(cls, data):
        """
        Convert MongoDB document to Pydantic model
        """
        if data.get("_id") and isinstance(data["_id"], ObjectId):
            data["_id"] = str(data["_id"])
        return cls(**data)

# Endpoints
@router.get("/", response_model=List[RiskModelResponse])
async def get_risk_models(
    status: Optional[str] = Query(None, description="Filter by model status (active, archived, draft)"),
    db = Depends(get_database)
):
    """Get all risk models with optional status filter."""
    query = {}
    if status:
        query["status"] = status
    
    # Get risk_models collection
    risk_models_collection = db["risk_models"]
    
    # Convert cursor to list
    models = []
    cursor = risk_models_collection.find(query)
    async for document in cursor:
        models.append(RiskModelResponse.from_mongo(document))
    
    return models

@router.get("/{model_id}", response_model=RiskModelResponse)
async def get_risk_model(
    model_id: str,
    version: Optional[int] = None,
    db = Depends(get_database)
):
    """Get a specific risk model by ID and optional version."""
    query = {"modelId": model_id}
    if version:
        query["version"] = version
    else:
        # Get latest version if version not specified
        query["status"] = {"$ne": "archived"}
    
    # Get risk_models collection
    risk_models_collection = db["risk_models"]
    
    model = await risk_models_collection.find_one(query)
    if not model:
        raise HTTPException(status_code=404, detail="Risk model not found")
    
    return RiskModelResponse.from_mongo(model)

@router.post("/", response_model=RiskModelResponse)
async def create_risk_model(
    model: RiskModelCreate,
    db = Depends(get_database)
):
    """Create a new risk model."""
    # Get risk_models collection
    risk_models_collection = db["risk_models"]
    
    # Check if model ID already exists
    existing = await risk_models_collection.find_one({"modelId": model.modelId})
    if existing:
        # Create a new version
        version = existing["version"] + 1
    else:
        version = 1
    
    # Format the new model
    new_model = {
        "modelId": model.modelId,
        "version": version,
        "status": "draft",  # New models start as drafts
        "createdAt": datetime.now(),
        "updatedAt": datetime.now(),
        "description": model.description,
        "weights": model.weights,
        "thresholds": model.thresholds,
        "riskFactors": [factor.dict() for factor in model.riskFactors],
        "performance": {
            "falsePositiveRate": None,
            "falseNegativeRate": None,
            "avgProcessingTime": None
        }
    }
    
    result = await risk_models_collection.insert_one(new_model)
    new_model["_id"] = result.inserted_id
    
    return RiskModelResponse.from_mongo(new_model)

@router.put("/{model_id}", response_model=RiskModelResponse)
async def update_risk_model(
    model_id: str,
    update: RiskModelUpdate,
    db = Depends(get_database)
):
    """Update an existing risk model."""
    # Get risk_models collection
    risk_models_collection = db["risk_models"]
    
    # Find the model
    model = await risk_models_collection.find_one({"modelId": model_id, "status": {"$ne": "archived"}})
    if not model:
        raise HTTPException(status_code=404, detail="Risk model not found")
    
    # Don't allow updating active models directly, create a new version instead
    if model["status"] == "active" and update.status != "archived":
        # Create a new version with the updates
        new_version = model["version"] + 1
        
        # Start with the existing model and apply updates
        new_model = {**model}
        new_model.pop("_id")  # Remove the MongoDB _id
        new_model["version"] = new_version
        new_model["status"] = "draft"
        new_model["updatedAt"] = datetime.now()
        
        # Apply updates
        if update.description:
            new_model["description"] = update.description
        if update.weights:
            new_model["weights"] = update.weights
        if update.thresholds:
            new_model["thresholds"] = update.thresholds
        if update.riskFactors:
            new_model["riskFactors"] = [factor.dict() for factor in update.riskFactors]
        
        # Reset performance metrics for the new version
        new_model["performance"] = {
            "falsePositiveRate": None,
            "falseNegativeRate": None,
            "avgProcessingTime": None
        }
        
        result = await risk_models_collection.insert_one(new_model)
        new_model["_id"] = result.inserted_id
        
        return RiskModelResponse.from_mongo(new_model)
    else:
        # For draft models, update directly
        updates = {}
        if update.description:
            updates["description"] = update.description
        if update.weights:
            updates["weights"] = update.weights
        if update.thresholds:
            updates["thresholds"] = update.thresholds
        if update.riskFactors:
            updates["riskFactors"] = [factor.dict() for factor in update.riskFactors]
        if update.status:
            updates["status"] = update.status
        
        updates["updatedAt"] = datetime.now()
        
        # If activating a model, deactivate all other active models
        if update.status == "active":
            await risk_models_collection.update_many(
                {"status": "active", "modelId": {"$ne": model_id}},
                {"$set": {"status": "inactive", "updatedAt": datetime.now()}}
            )
        
        result = await risk_models_collection.update_one(
            {"_id": model["_id"]},
            {"$set": updates}
        )
        
        if result.modified_count == 0:
            raise HTTPException(status_code=400, detail="Model update failed")
        
        updated_model = await risk_models_collection.find_one({"_id": model["_id"]})
        return RiskModelResponse.from_mongo(updated_model)

@router.delete("/{model_id}")
async def archive_risk_model(
    model_id: str,
    version: Optional[int] = None,
    db = Depends(get_database)
):
    """Archive a risk model (soft delete)."""
    # Get risk_models collection
    risk_models_collection = db["risk_models"]
    
    query = {"modelId": model_id}
    if version:
        query["version"] = version
    
    model = await risk_models_collection.find_one(query)
    if not model:
        raise HTTPException(status_code=404, detail="Risk model not found")
    
    # Don't allow archiving the only active model
    if model["status"] == "active":
        active_count = await risk_models_collection.count_documents({"status": "active"})
        if active_count <= 1:
            raise HTTPException(
                status_code=400, 
                detail="Cannot archive the only active model. Activate another model first."
            )
    
    result = await risk_models_collection.update_one(
        {"_id": model["_id"]},
        {"$set": {"status": "archived", "updatedAt": datetime.now()}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=400, detail="Failed to archive model")
    
    return {"message": f"Model {model_id} archived successfully"}

@router.post("/{model_id}/activate")
async def activate_risk_model(
    model_id: str,
    version: Optional[int] = None,
    db = Depends(get_database)
):
    """Activate a specific risk model, deactivating all others."""
    # Get risk_models collection
    risk_models_collection = db["risk_models"]
    
    query = {"modelId": model_id}
    if version:
        query["version"] = version
    
    model = await risk_models_collection.find_one(query)
    if not model:
        raise HTTPException(status_code=404, detail="Risk model not found")
    
    if model["status"] == "archived":
        raise HTTPException(status_code=400, detail="Cannot activate an archived model")
    
    # Deactivate all currently active models
    await risk_models_collection.update_many(
        {"status": "active"},
        {"$set": {"status": "inactive", "updatedAt": datetime.now()}}
    )
    
    # Activate the selected model
    result = await risk_models_collection.update_one(
        {"_id": model["_id"]},
        {"$set": {"status": "active", "updatedAt": datetime.now()}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=400, detail="Failed to activate model")
    
    return {"message": f"Model {model_id} activated successfully"}

@router.get("/{model_id}/performance", response_model=Dict[str, Any])
async def get_model_performance(
    model_id: str,
    version: Optional[int] = None,
    timeframe: Optional[str] = Query("24h", description="Performance timeframe (24h, 7d, 30d)"),
    db = Depends(get_database)
):
    """Get performance metrics for a risk model."""
    # Get collections
    risk_models_collection = db["risk_models"]
    model_performance_collection = db["model_performance"]
    
    query = {"modelId": model_id}
    if version:
        query["version"] = version
    
    model = await risk_models_collection.find_one(query)
    if not model:
        raise HTTPException(status_code=404, detail="Risk model not found")
    
    # Calculate time range for the query
    now = datetime.now()
    if timeframe == "24h":
        start_time = now - timedelta(hours=24)
    elif timeframe == "7d":
        start_time = now - timedelta(days=7)
    elif timeframe == "30d":
        start_time = now - timedelta(days=30)
    else:
        start_time = now - timedelta(hours=24)  # Default to 24h
    
    # Get model usage records
    usage_records = []
    cursor = model_performance_collection.find({
        "modelId": model_id,
        "modelVersion": model.get("version", 1),
        "timestamp": {"$gte": start_time}
    })
    
    async for document in cursor:
        usage_records.append(document)
    
    # If no records found
    if not usage_records:
        return {
            "modelId": model_id,
            "version": model.get("version", 1),
            "timeframe": timeframe,
            "totalEvaluations": 0,
            "avgRiskScore": None,
            "riskFactorDistribution": {},
            "falsePositiveRate": None,
            "falseNegativeRate": None,
            "avgProcessingTime": None
        }
    
    # Calculate metrics
    total_evaluations = len(usage_records)
    avg_risk_score = sum(r["riskScore"] for r in usage_records) / total_evaluations
    
    # Count occurrences of each risk factor
    risk_factor_counts = {}
    for record in usage_records:
        for factor in record.get("riskFactors", []):
            risk_factor_counts[factor] = risk_factor_counts.get(factor, 0) + 1
    
    # Format risk factor distribution as percentages
    risk_factor_distribution = {
        factor: (count / total_evaluations) * 100 
        for factor, count in risk_factor_counts.items()
    }
    
    # Calculate false positive/negative rates (if outcome data exists)
    records_with_outcome = [r for r in usage_records if r.get("outcome") is not None]
    
    false_positive_rate = None
    false_negative_rate = None
    
    if records_with_outcome:
        false_positives = sum(1 for r in records_with_outcome 
                             if r["riskScore"] >= model["thresholds"]["flag"] and r["outcome"] == "legitimate")
        
        false_negatives = sum(1 for r in records_with_outcome 
                             if r["riskScore"] < model["thresholds"]["flag"] and r["outcome"] == "fraud")
        
        total_with_outcome = len(records_with_outcome)
        false_positive_rate = (false_positives / total_with_outcome) * 100
        false_negative_rate = (false_negatives / total_with_outcome) * 100
    
    return {
        "modelId": model_id,
        "version": model.get("version", 1),
        "timeframe": timeframe,
        "totalEvaluations": total_evaluations,
        "avgRiskScore": avg_risk_score,
        "riskFactorDistribution": risk_factor_distribution,
        "falsePositiveRate": false_positive_rate,
        "falseNegativeRate": false_negative_rate,
        "avgProcessingTime": model.get("performance", {}).get("avgProcessingTime")
    }

@router.post("/{model_id}/feedback")
async def provide_transaction_feedback(
    model_id: str,
    transaction_id: str,
    outcome: str = Body(..., description="Actual outcome: 'legitimate' or 'fraud'"),
    db = Depends(get_database)
):
    """Provide feedback on transaction outcomes to improve model accuracy."""
    # Get model_performance collection
    model_performance_collection = db["model_performance"]
    
    # Validate outcome
    if outcome not in ["legitimate", "fraud"]:
        raise HTTPException(status_code=400, detail="Outcome must be 'legitimate' or 'fraud'")
    
    # Update the model performance record
    result = await model_performance_collection.update_one(
        {"modelId": model_id, "transactionId": transaction_id},
        {"$set": {"outcome": outcome, "feedbackTime": datetime.now()}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Transaction record not found")
    
    return {"message": "Feedback recorded successfully"}

@router.websocket("/change-stream")
async def websocket_endpoint(websocket: WebSocket, db = Depends(get_database)):
    """WebSocket endpoint for real-time model updates using MongoDB Change Streams."""
    await websocket.accept()
    active_connections.append(websocket)
    
    try:
        # Set up pipeline to watch for risk model changes
        pipeline = [
            {"$match": {"operationType": {"$in": ["insert", "update", "replace", "delete"]}}},
            {"$match": {"ns.coll": "risk_models"}}
        ]
        
        # Create a change stream on the risk_models collection
        # Don't require full_document_before_change since it may not be configured
        async with db.watch(
            pipeline=pipeline,
            full_document='updateLookup'
        ) as change_stream:
            # Send initial models to establish baseline
            cursor = db.risk_models.find({})
            models = []
            async for document in cursor:
                # Convert the document to JSON-serializable format
                serializable_doc = convert_to_json_serializable(document)
                models.append(serializable_doc)
            
            await websocket.send_json({
                "type": "initial",
                "models": models
            })
            
            # Process real-time changes
            async for change in change_stream:
                # Prepare the change data with timestamp
                change_data = {
                    "type": "change",
                    "operationType": change["operationType"],
                    "timestamp": datetime.now().isoformat()
                }
                
                # Add relevant document data based on operation type
                if change["operationType"] in ["insert", "update", "replace"]:
                    # Convert the document to JSON-serializable format
                    doc = convert_to_json_serializable(change["fullDocument"])
                    change_data["document"] = doc
                elif change["operationType"] == "delete":
                    doc_id = change["documentKey"]["_id"]
                    if isinstance(doc_id, ObjectId):
                        doc_id = str(doc_id)
                    change_data["documentId"] = doc_id
                
                # Send the change notification
                await websocket.send_json(change_data)
    
    except WebSocketDisconnect:
        active_connections.remove(websocket)
    except Exception as e:
        # Log the error but don't crash
        logger = logging.getLogger(__name__)
        logger.error(f"WebSocket error: {str(e)}")
        try:
            active_connections.remove(websocket)
        except ValueError:
            pass