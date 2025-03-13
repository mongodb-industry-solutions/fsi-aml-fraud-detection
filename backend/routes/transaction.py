from fastapi import APIRouter, Body, HTTPException, status, Depends, Query
from fastapi.responses import JSONResponse
from fastapi.encoders import jsonable_encoder
from typing import List, Optional, Dict, Any
import os
import logging
from datetime import datetime, timedelta

from models.transaction import TransactionModel, TransactionResponse
from db.mongo_db import MongoDBAccess
from services.fraud_detection import FraudDetectionService

# Set up logging
logger = logging.getLogger(__name__)

# Environment variables
MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME", "fsi-threatsight360")
TRANSACTION_COLLECTION = "transactions"

router = APIRouter(
    prefix="/transactions",
    tags=["transactions"],
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
    mongodb_uri = os.getenv("MONGODB_URI", "mongodb+srv://username:password@cluster.mongodb.net")
    logger.info(f"Connecting to MongoDB with URI: {'mongodb+srv:***@ist-shared.n0kts.mongodb.net' if 'mongodb+srv' in mongodb_uri else mongodb_uri}")
    
    db = MongoDBAccess(mongodb_uri)
    try:
        yield db
    finally:
        # Clean up and close connection when done
        del db

# Dependency to get fraud detection service
def get_fraud_detection_service(db: MongoDBAccess = Depends(get_db)):
    service = FraudDetectionService(db_client=db, db_name=DB_NAME)
    return service

@router.post("/", response_description="Add new transaction", response_model=TransactionResponse)
async def create_transaction(
    transaction: TransactionModel = Body(...), 
    db: MongoDBAccess = Depends(get_db),
    fraud_service: FraudDetectionService = Depends(get_fraud_detection_service)
):
    # Convert transaction to a dictionary
    transaction_dict = jsonable_encoder(transaction)
    
    # If transaction doesn't have a risk assessment, evaluate it
    if "risk_assessment" not in transaction_dict or not transaction_dict["risk_assessment"]:
        # Perform fraud detection
        risk_assessment = await fraud_service.evaluate_transaction(transaction_dict)
        transaction_dict["risk_assessment"] = risk_assessment
        logger.info(f"Transaction evaluated with risk score: {risk_assessment['score']}, level: {risk_assessment['level']}")
    
    # Store the transaction
    new_transaction = db.insert_one(
        db_name=DB_NAME,
        collection_name=TRANSACTION_COLLECTION,
        document=transaction_dict
    )
    
    created_transaction = db.get_collection(
        db_name=DB_NAME,
        collection_name=TRANSACTION_COLLECTION
    ).find_one({"_id": new_transaction.inserted_id})
    
    return JSONResponse(status_code=status.HTTP_201_CREATED, content=created_transaction)

@router.post("/evaluate", response_description="Evaluate transaction for fraud without storing it")
async def evaluate_transaction(
    transaction: Dict[str, Any] = Body(...),
    fraud_service: FraudDetectionService = Depends(get_fraud_detection_service)
):
    """
    Evaluate a transaction for potential fraud without storing it in the database.
    This endpoint is useful for pre-screening transactions or simulating fraud detection.
    """
    # Perform fraud detection
    risk_assessment = await fraud_service.evaluate_transaction(transaction)
    
    # Return the risk assessment
    return {
        "transaction": {
            "amount": transaction.get("amount"),
            "merchant": transaction.get("merchant", {}).get("category"),
            "transaction_type": transaction.get("transaction_type")
        },
        "risk_assessment": risk_assessment
    }

@router.get("/", response_description="List transactions", response_model=List[TransactionResponse])
async def list_transactions(
    db: MongoDBAccess = Depends(get_db), 
    limit: int = 10, 
    skip: int = 0,
    customer_id: Optional[str] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    min_amount: Optional[float] = None,
    max_amount: Optional[float] = None,
    risk_level: Optional[str] = Query(None, description="Filter by risk level (low, medium, high)"),
    transaction_type: Optional[str] = Query(None, description="Filter by transaction type (purchase, withdrawal, transfer, deposit)"),
    status: Optional[str] = Query(None, description="Filter by status (completed, pending, failed, refunded)")
):
    # Build query filters
    query = {}
    
    if customer_id:
        query["customer_id"] = customer_id
    
    if start_date or end_date:
        date_query = {}
        if start_date:
            date_query["$gte"] = start_date
        if end_date:
            date_query["$lte"] = end_date
        if date_query:
            query["timestamp"] = date_query
    
    if min_amount is not None or max_amount is not None:
        amount_query = {}
        if min_amount is not None:
            amount_query["$gte"] = min_amount
        if max_amount is not None:
            amount_query["$lte"] = max_amount
        if amount_query:
            query["amount"] = amount_query
    
    if risk_level:
        query["risk_assessment.level"] = risk_level
    
    if transaction_type:
        query["transaction_type"] = transaction_type
    
    if status:
        query["status"] = status
    
    # Get transactions with filters
    transactions = list(db.get_collection(
        db_name=DB_NAME,
        collection_name=TRANSACTION_COLLECTION
    ).find(query).sort("timestamp", -1).skip(skip).limit(limit))
    
    return transactions

@router.get("/{transaction_id}", response_description="Get a single transaction", response_model=TransactionResponse)
async def get_transaction(transaction_id: str, db: MongoDBAccess = Depends(get_db)):
    if (transaction := db.get_collection(
        db_name=DB_NAME,
        collection_name=TRANSACTION_COLLECTION
    ).find_one({"transaction_id": transaction_id})) is not None:
        return transaction
    
    raise HTTPException(status_code=404, detail=f"Transaction with ID {transaction_id} not found")

@router.get("/customer/{customer_id}", response_description="Get customer transactions", response_model=List[TransactionResponse])
async def get_customer_transactions(
    customer_id: str, 
    db: MongoDBAccess = Depends(get_db),
    limit: int = 50,
    skip: int = 0,
    days: int = Query(30, description="Number of days to look back")
):
    start_date = datetime.now() - timedelta(days=days)
    
    transactions = list(db.get_collection(
        db_name=DB_NAME,
        collection_name=TRANSACTION_COLLECTION
    ).find({
        "customer_id": customer_id,
        "timestamp": {"$gte": start_date}
    }).sort("timestamp", -1).skip(skip).limit(limit))
    
    return transactions

@router.get("/risk/high", response_description="Get high-risk transactions", response_model=List[TransactionResponse])
async def get_high_risk_transactions(
    db: MongoDBAccess = Depends(get_db),
    limit: int = 50,
    skip: int = 0,
    days: int = Query(7, description="Number of days to look back")
):
    start_date = datetime.now() - timedelta(days=days)
    
    transactions = list(db.get_collection(
        db_name=DB_NAME,
        collection_name=TRANSACTION_COLLECTION
    ).find({
        "risk_assessment.level": "high",
        "timestamp": {"$gte": start_date}
    }).sort("timestamp", -1).skip(skip).limit(limit))
    
    return transactions

@router.get("/flags/{flag_type}", response_description="Get transactions with specific fraud flags")
async def get_transactions_by_flag(
    flag_type: str,
    db: MongoDBAccess = Depends(get_db),
    limit: int = 50,
    skip: int = 0,
    days: int = Query(30, description="Number of days to look back")
):
    """
    Get transactions that have a specific fraud flag.
    Common flags include: unusual_amount, unexpected_location, unknown_device, velocity_alert, matches_fraud_pattern
    """
    start_date = datetime.now() - timedelta(days=days)
    
    transactions = list(db.get_collection(
        db_name=DB_NAME,
        collection_name=TRANSACTION_COLLECTION
    ).find({
        "risk_assessment.flags": flag_type,
        "timestamp": {"$gte": start_date}
    }).sort("timestamp", -1).skip(skip).limit(limit))
    
    return transactions