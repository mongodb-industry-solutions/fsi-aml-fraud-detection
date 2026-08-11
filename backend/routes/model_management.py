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

# Collection names. Renamed twice: 2026-07-29 by the leafy_bank_bian migration
# (risk_models -> threatsightRiskModels), then 2026-08-06 by the BIAN mapping
# (threatsightRiskModels -> fraudModel, SD FraudModel / CR FraudModelSpecification).
# `threatsightModelPerformance` is NOT BIAN-mapped and keeps its name and shape.
#
# These are constants rather than inline strings for one specific reason: the
# change-stream $match at get_model_updates() filters on `ns.coll` by NAME. A
# db.watch() pipeline whose collection name has drifted matches NOTHING and fails
# SILENTLY -- no error, no log, just a dead update feed. Binding the watch and the
# reads to the same constant makes that drift impossible.
RISK_MODELS_COLLECTION = "fraudModel"
MODEL_PERFORMANCE_COLLECTION = "threatsightModelPerformance"

# The BIAN mapping changed the STORED shape, not the wire contract:
#
#   stored (fraudModel)                     wire (unchanged, what the UI reads)
#   ------------------------------------    -----------------------------------
#   usageGuidelines.thresholds              thresholds
#   usageGuidelines.weights                 weights
#   usageGuidelines.riskFactors             riskFactors
#   testResult                              performance
#   version: "2"  (string)                  version: 2  (int)
#
# Translation happens HERE, at the DB boundary, so the frontend is untouched.
# Rationale: `usageGuidelines` maps to BIAN BQ Production -> RuleSet and `testResult`
# to BQ Testing -> ModelTest, but every property on those is `format: Text` -- there
# is no numeric slot for a weight or an error rate. So the model's IDENTITY is
# BIAN-named and its CONTENTS stay demo-specific under a BIAN-named parent. Pushing
# that nesting out to the UI would buy nothing and would mean editing three separate
# request-body builders in ModelAdminPanel.js that each duplicate the flat shape.
#
# `version` is a string in storage because BIAN FraudModelVersion is `format: Text`.
# It is converted back to an int at the boundary because `threatsightModelPerformance`
# stores `modelVersion` as an int and is joined on it -- see get_model_performance.
STORED_ONLY_FIELDS = ("usageGuidelines", "testResult", "sourceSystem")


def to_wire(doc: Dict[str, Any]) -> Dict[str, Any]:
    """fraudModel storage shape -> the flat shape the API and UI speak."""
    if not doc:
        return doc
    guidelines = doc.get("usageGuidelines") or {}
    out = {k: v for k, v in doc.items() if k not in STORED_ONLY_FIELDS}
    out["thresholds"] = guidelines.get("thresholds") or {}
    out["weights"] = guidelines.get("weights") or {}
    out["riskFactors"] = guidelines.get("riskFactors") or []
    out["performance"] = doc.get("testResult")
    if "version" in out:
        out["version"] = version_int(out["version"])
    return out


def to_stored(doc: Dict[str, Any]) -> Dict[str, Any]:
    """Flat API shape -> fraudModel storage shape. Inverse of to_wire()."""
    out = {k: v for k, v in doc.items()
           if k not in ("thresholds", "weights", "riskFactors", "performance")}
    out["usageGuidelines"] = {
        "thresholds": doc.get("thresholds") or {},
        "weights": doc.get("weights") or {},
        "riskFactors": doc.get("riskFactors") or [],
    }
    out["testResult"] = doc.get("performance")
    if "version" in out:
        out["version"] = version_str(out["version"])
    # Every row this service writes is ThreatSight's. `fraudModel` lives in the shared
    # leafy_bank_bian DB, so the tag is what keeps the migration's counts honest.
    out["sourceSystem"] = "threatsight360"
    return out


def version_str(value) -> str:
    return str(value)


def version_int(value) -> int:
    """Stored versions are strings; tolerate ints from rows written before the mapping."""
    try:
        return int(value)
    except (TypeError, ValueError):
        return 0


async def find_latest(collection, query: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """
    Highest-versioned document matching `query`, or None.

    NOT `sort=[("version", -1)]`: `version` is a string in storage, so a Mongo sort is
    lexicographic and would rank "9" above "10". The max is taken numerically in Python
    instead -- safe because a model has a handful of versions, not thousands.
    """
    candidates = [doc async for doc in collection.find(query)]
    if not candidates:
        return None
    return max(candidates, key=lambda d: version_int(d.get("version")))

router = APIRouter(
    prefix="/models",
    tags=["risk_models"],
    responses={404: {"description": "Not found"}},
)

# Active WebSocket connections for Change Stream updates
active_connections = []
# Last connection cleanup time
last_cleanup_time = datetime.now()
# Activation lock to prevent race conditions
activation_lock = asyncio.Lock()

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

# WebSocket Connection Management
async def cleanup_stale_connections():
    """Remove disconnected websocket connections."""
    global active_connections
    old_count = len(active_connections)
    
    # Test each connection with a small ping and remove if it fails
    still_active = []
    for ws in active_connections:
        try:
            # Try a ping to see if the connection is still open
            pong_waiter = await ws.ping()
            await asyncio.wait_for(pong_waiter, timeout=1.0)
            still_active.append(ws)
        except (asyncio.TimeoutError, WebSocketDisconnect, Exception):
            # Connection is stale, don't add to the active list
            pass
    
    active_connections = still_active
    removed = old_count - len(active_connections)
    if removed > 0:
        logger = logging.getLogger(__name__)
        logger.info(f"Cleaned up {removed} stale WebSocket connections")

# Endpoints
@router.get("/", response_model=List[RiskModelResponse])
@router.get("", response_model=List[RiskModelResponse])
async def get_risk_models(
    status: Optional[str] = Query(None, description="Filter by model status (active, archived, draft)"),
    skip: int = Query(0, description="Number of records to skip for pagination"),
    limit: int = Query(50, description="Maximum number of records to return"),
    db = Depends(get_database)
):
    """Get all risk models with optional status filter and pagination."""
    query = {}
    if status:
        query["status"] = status
    
    # Get risk_models collection
    risk_models_collection = db[RISK_MODELS_COLLECTION]
    
    # Convert cursor to list with pagination
    models = []
    cursor = risk_models_collection.find(query).skip(skip).limit(limit).sort("updatedAt", -1)
    async for document in cursor:
        models.append(RiskModelResponse.from_mongo(to_wire(document)))
    
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
        query["version"] = version_str(version)
    else:
        # Get latest version if version not specified
        query["status"] = {"$ne": "archived"}

    # Get risk_models collection
    risk_models_collection = db[RISK_MODELS_COLLECTION]

    # If looking for the latest non-archived version, pick the highest version
    if "status" in query and query["status"] == {"$ne": "archived"}:
        model = await find_latest(risk_models_collection, query)
    else:
        model = await risk_models_collection.find_one(query)

    if not model:
        raise HTTPException(status_code=404, detail="Risk model not found")

    return RiskModelResponse.from_mongo(to_wire(model))

@router.post("/", response_model=RiskModelResponse)
@router.post("", response_model=RiskModelResponse)
async def create_risk_model(
    model: RiskModelCreate,
    db = Depends(get_database)
):
    """Create a new risk model."""
    # Get risk_models collection
    risk_models_collection = db[RISK_MODELS_COLLECTION]
    
    # Check if model ID already exists. find_latest, not find_one: `modelId` is not
    # unique (that is why the collection's unique index is modelId+version), so
    # find_one could return v1 while v2 exists and mint a duplicate version.
    existing = await find_latest(risk_models_collection, {"modelId": model.modelId})
    if existing:
        # Create a new version
        version = version_int(existing["version"]) + 1
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
    
    stored = to_stored(new_model)
    result = await risk_models_collection.insert_one(stored)
    new_model["_id"] = result.inserted_id

    return RiskModelResponse.from_mongo(new_model)

@router.put("/{model_id}", response_model=RiskModelResponse)
async def update_risk_model(
    model_id: str,
    update: RiskModelUpdate,
    db = Depends(get_database)
):
    """
    Update an existing risk model.
    
    Behavior:
    - For active models: Creates a new version with changes (status remains 'draft')
    - For draft/inactive models: Updates the model in-place
    - For archived models: Not allowed (will return 400 error)
    """
    # Get risk_models collection
    risk_models_collection = db[RISK_MODELS_COLLECTION]
    
    # Find the model - get the latest version (numerically, see find_latest)
    model = await find_latest(
        risk_models_collection,
        {"modelId": model_id, "status": {"$ne": "archived"}}
    )
    if not model:
        raise HTTPException(status_code=404, detail="Risk model not found")

    # Don't allow updating active models directly, create a new version instead
    if model["status"] == "active" and update.status != "archived":
        # Create a new version with the updates
        new_version = version_int(model["version"]) + 1

        # Start with the existing model, flattened, and apply updates
        new_model = to_wire(model)
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
        
        result = await risk_models_collection.insert_one(to_stored(new_model))
        new_model["_id"] = result.inserted_id

        return RiskModelResponse.from_mongo(new_model)
    else:
        # For draft models, update directly. Dot-notation paths so a partial update
        # touches one sub-key without replacing the whole usageGuidelines block.
        updates = {}
        if update.description:
            updates["description"] = update.description
        if update.weights:
            updates["usageGuidelines.weights"] = update.weights
        if update.thresholds:
            updates["usageGuidelines.thresholds"] = update.thresholds
        if update.riskFactors:
            updates["usageGuidelines.riskFactors"] = [factor.dict() for factor in update.riskFactors]
        if update.status:
            # Don't allow changing status to 'active' here - that should go through the activate endpoint
            if update.status == "active":
                raise HTTPException(
                    status_code=400, 
                    detail="Use the dedicated /activate endpoint to activate a model"
                )
            updates["status"] = update.status
        
        updates["updatedAt"] = datetime.now()
        
        result = await risk_models_collection.update_one(
            {"_id": model["_id"]},
            {"$set": updates}
        )
        
        if result.modified_count == 0:
            raise HTTPException(status_code=400, detail="Model update failed")
        
        updated_model = await risk_models_collection.find_one({"_id": model["_id"]})
        return RiskModelResponse.from_mongo(to_wire(updated_model))

@router.delete("/{model_id}")
async def archive_risk_model(
    model_id: str,
    version: Optional[int] = None,
    db = Depends(get_database)
):
    """Archive a risk model (soft delete)."""
    # Get risk_models collection
    risk_models_collection = db[RISK_MODELS_COLLECTION]
    
    query = {"modelId": model_id}
    if version:
        query["version"] = version_str(version)

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

@router.post("/{model_id}/restore")
async def restore_archived_model(
    model_id: str,
    version: Optional[int] = None,
    db = Depends(get_database)
):
    """Restore an archived risk model to 'inactive' status."""
    # Get risk_models collection
    risk_models_collection = db[RISK_MODELS_COLLECTION]
    
    query = {"modelId": model_id, "status": "archived"}
    if version:
        query["version"] = version_str(version)

    model = await risk_models_collection.find_one(query)
    if not model:
        raise HTTPException(status_code=404, detail="Archived risk model not found")
    
    # Restore the model to inactive status
    result = await risk_models_collection.update_one(
        {"_id": model["_id"]},
        {"$set": {"status": "inactive", "updatedAt": datetime.now()}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=400, detail="Failed to restore model")
    
    return {"message": f"Model {model_id} restored successfully"}

@router.post("/{model_id}/activate")
async def activate_risk_model(
    model_id: str,
    version: Optional[int] = None,
    db = Depends(get_database)
):
    """
    Activate a specific risk model, deactivating all others.
    This function uses a lock to prevent race conditions when multiple activate requests are made.
    """
    # Use a lock to prevent race conditions
    async with activation_lock:
        # Get risk_models collection
        risk_models_collection = db[RISK_MODELS_COLLECTION]
        
        query = {"modelId": model_id}
        if version:
            query["version"] = version_str(version)

        model = await risk_models_collection.find_one(query)
        if not model:
            raise HTTPException(status_code=404, detail="Risk model not found")
        
        # Check if model is already active
        if model["status"] == "active":
            return {"message": f"Model {model_id} is already active"}
        
        if model["status"] == "archived":
            raise HTTPException(status_code=400, detail="Cannot activate an archived model")
        
        # Use a transaction to ensure atomic operations for activation
        async with await db.client.start_session() as session:
            async with session.start_transaction():
                # Deactivate all currently active models
                await risk_models_collection.update_many(
                    {"status": "active"},
                    {"$set": {"status": "inactive", "updatedAt": datetime.now()}},
                    session=session
                )
                
                # Activate the selected model
                result = await risk_models_collection.update_one(
                    {"_id": model["_id"]},
                    {"$set": {"status": "active", "updatedAt": datetime.now()}},
                    session=session
                )
        
        if result.modified_count == 0:
            raise HTTPException(status_code=400, detail="Failed to activate model")
        
        return {"message": f"Model {model_id} activated successfully"}

@router.post("/reset")
async def reset_risk_models(db = Depends(get_database)):
    """
    Reset risk models to clean state:
    - Delete all models with version 2
    - Set default-risk-model status to 'active' 
    - Set behavioral-risk-model status to 'inactive'
    """
    # Get risk_models collection
    risk_models_collection = db[RISK_MODELS_COLLECTION]
    
    try:
        # Use a transaction to ensure all operations succeed or fail together
        async with await db.client.start_session() as session:
            async with session.start_transaction():
                # 1. Delete all models with version 2 (stored as a string, see to_stored)
                delete_result = await risk_models_collection.delete_many(
                    {"version": version_str(2)},
                    session=session
                )
                
                # 2. Set default-risk-model to active
                default_result = await risk_models_collection.update_one(
                    {"modelId": "default-risk-model"},
                    {"$set": {"status": "active", "updatedAt": datetime.now()}},
                    session=session
                )
                
                # 3. Set behavioral-risk-model to inactive
                behavioral_result = await risk_models_collection.update_one(
                    {"modelId": "behavioral-risk-model"},
                    {"$set": {"status": "inactive", "updatedAt": datetime.now()}},
                    session=session
                )
        
        # Prepare response message
        messages = []
        messages.append(f"Deleted {delete_result.deleted_count} models with version 2")
        
        if default_result.modified_count > 0:
            messages.append("Set default-risk-model to active")
        elif default_result.matched_count > 0:
            messages.append("default-risk-model was already active")
        else:
            messages.append("default-risk-model not found")
            
        if behavioral_result.modified_count > 0:
            messages.append("Set behavioral-risk-model to inactive")
        elif behavioral_result.matched_count > 0:
            messages.append("behavioral-risk-model was already inactive")
        else:
            messages.append("behavioral-risk-model not found")
        
        return {
            "message": "Models reset successfully",
            "details": messages,
            "deletedCount": delete_result.deleted_count,
            "defaultModelUpdated": default_result.modified_count > 0,
            "behavioralModelUpdated": behavioral_result.modified_count > 0
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to reset models: {str(e)}"
        )

@router.get("/{model_id}/performance", response_model=Dict[str, Any])
async def get_model_performance(
    model_id: str,
    version: Optional[int] = None,
    timeframe: Optional[str] = Query("24h", description="Performance timeframe (24h, 7d, 30d, all)"),
    db = Depends(get_database)
):
    """Get performance metrics for a risk model."""
    # Get collections
    risk_models_collection = db[RISK_MODELS_COLLECTION]
    model_performance_collection = db[MODEL_PERFORMANCE_COLLECTION]
    
    query = {"modelId": model_id}
    if version:
        query["version"] = version_str(version)

    model = to_wire(await risk_models_collection.find_one(query))
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
    elif timeframe == "all":
        # No time filter, get all data
        start_time = None
    else:
        start_time = now - timedelta(hours=24)  # Default to 24h
    
    # Build the time filter query
    time_query = {}
    if start_time:
        time_query = {"timestamp": {"$gte": start_time}}
    
    # Combine filters. `modelVersion` here is an INT: threatsightModelPerformance is not
    # BIAN-mapped and keeps its original types, so the join needs the wire-side int, not
    # the string that fraudModel stores. to_wire() has already converted it.
    performance_query = {
        "modelId": model_id,
        "modelVersion": model.get("version", 1),
        **time_query
    }
    
    # Get model usage records
    usage_records = []
    cursor = model_performance_collection.find(performance_query)
    
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
    model_performance_collection = db[MODEL_PERFORMANCE_COLLECTION]
    
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

@router.get("/{model_id}/compare/{comparison_model_id}")
async def compare_models(
    model_id: str,
    comparison_model_id: str,
    timeframe: Optional[str] = Query("7d", description="Performance timeframe (24h, 7d, 30d, all)"),
    db = Depends(get_database)
):
    """Compare performance metrics between two models."""
    # Get performance data for both models
    model1_perf = await get_model_performance(model_id, None, timeframe, db)
    model2_perf = await get_model_performance(comparison_model_id, None, timeframe, db)
    
    # Calculate differences
    differences = {}
    for key in ["avgRiskScore", "falsePositiveRate", "falseNegativeRate"]:
        if model1_perf.get(key) is not None and model2_perf.get(key) is not None:
            differences[key] = model1_perf[key] - model2_perf[key]
    
    # Compare risk factor distribution
    rf_diff = {}
    for factor, pct in model1_perf.get("riskFactorDistribution", {}).items():
        other_pct = model2_perf.get("riskFactorDistribution", {}).get(factor, 0)
        rf_diff[factor] = pct - other_pct
    
    return {
        "timeframe": timeframe,
        "model1": {
            "id": model_id,
            "performance": model1_perf
        },
        "model2": {
            "id": comparison_model_id,
            "performance": model2_perf
        },
        "differences": differences,
        "riskFactorDifferences": rf_diff
    }

@router.websocket("/change-stream")
async def websocket_endpoint(websocket: WebSocket, db = Depends(get_database)):
    """WebSocket endpoint for real-time model updates using MongoDB Change Streams."""
    await websocket.accept()
    active_connections.append(websocket)
    
    # Check if we need to clean up stale connections
    global last_cleanup_time
    now = datetime.now()
    if (now - last_cleanup_time).total_seconds() > 300:  # Clean up every 5 minutes
        await cleanup_stale_connections()
        last_cleanup_time = now
    
    try:
        # Set up pipeline to watch for risk model changes
        pipeline = [
            {"$match": {"operationType": {"$in": ["insert", "update", "replace", "delete"]}}},
            # Filters a DATABASE-level stream down to one collection by name. If this
            # name drifts from RISK_MODELS_COLLECTION the stream matches nothing and
            # the feed dies silently -- hence the shared constant.
            {"$match": {"ns.coll": RISK_MODELS_COLLECTION}}
        ]

        # Create a change stream on the risk models collection
        async with db.watch(
            pipeline=pipeline,
            full_document='updateLookup'
        ) as change_stream:
            # Send initial models to establish baseline
            cursor = db[RISK_MODELS_COLLECTION].find({})
            models = []
            async for document in cursor:
                # to_wire BEFORE serializing: this feed bypasses RiskModelResponse, so
                # without it the UI receives the stored nesting and its field-diffing
                # (ModelAdminPanel reads event.document.thresholds/.weights/.riskFactors)
                # silently sees every field as absent.
                serializable_doc = convert_to_json_serializable(to_wire(document))
                models.append(serializable_doc)
            
            await websocket.send_json({
                "type": "initial",
                "models": models
            })
            
            # Send heartbeat every 30 seconds to keep connection alive
            heartbeat_task = asyncio.create_task(
                send_heartbeats(websocket)
            )
            
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
                    doc = convert_to_json_serializable(to_wire(change["fullDocument"]))
                    change_data["document"] = doc
                elif change["operationType"] == "delete":
                    doc_id = change["documentKey"]["_id"]
                    if isinstance(doc_id, ObjectId):
                        doc_id = str(doc_id)
                    change_data["documentId"] = doc_id
                
                # Send the change notification
                await websocket.send_json(change_data)
    
    except WebSocketDisconnect:
        if websocket in active_connections:
            active_connections.remove(websocket)
        if 'heartbeat_task' in locals():
            heartbeat_task.cancel()
    except Exception as e:
        # Log the error but don't crash
        logger = logging.getLogger(__name__)
        logger.error(f"WebSocket error: {str(e)}")
        try:
            if websocket in active_connections:
                active_connections.remove(websocket)
            if 'heartbeat_task' in locals():
                heartbeat_task.cancel()
        except (ValueError, Exception):
            pass

async def send_heartbeats(websocket: WebSocket):
    """Send periodic heartbeats to keep WebSocket connections alive."""
    try:
        while True:
            await asyncio.sleep(30)
            await websocket.send_json({"type": "heartbeat", "timestamp": datetime.now().isoformat()})
    except (WebSocketDisconnect, asyncio.CancelledError):
        # Connection closed or task cancelled
        pass
    except Exception as e:
        logger = logging.getLogger(__name__)
        logger.error(f"Error sending heartbeat: {str(e)}")