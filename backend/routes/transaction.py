from fastapi import APIRouter, Body, HTTPException, status, Depends, Query
from fastapi.responses import JSONResponse
from fastapi.encoders import jsonable_encoder
from typing import List, Optional, Dict, Any
import os
import logging
from datetime import datetime, timedelta

from models.transaction import TransactionModel
from db.mongo_db import MongoDBAccess
from db.scope import scoped
from db.serialize import mongo_json
from db.txn_shape import build_transaction
from services.fraud_detection import FraudDetectionService

# Set up logging
logger = logging.getLogger(__name__)

# Environment variables
MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME", "leafy_bank_bian")
TRANSACTION_COLLECTION = "transactions"

# vector_embedding is 1536 floats — 92% of each document (~21 KB of 23 KB). No route
# returns it, and a 50-row page would otherwise ship ~1.1 MB instead of ~90 KB.
WITHOUT_EMBEDDING = {"vector_embedding": 0}

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
    mongodb_uri = os.getenv("MONGODB_URI")
    # Connect to MongoDB without logging the URI
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

@router.post("/", response_description="Add new transaction")
async def create_transaction(
    transaction: TransactionModel = Body(...),
    db: MongoDBAccess = Depends(get_db),
    fraud_service: FraudDetectionService = Depends(get_fraud_detection_service)
):
    # Convert transaction to a dictionary. This is the inbound wire shape (snake_case).
    transaction_dict = jsonable_encoder(transaction)

    # If transaction doesn't have a risk assessment, evaluate it
    if "risk_assessment" not in transaction_dict or not transaction_dict["risk_assessment"]:
        # Perform fraud detection
        risk_assessment = await fraud_service.evaluate_transaction(transaction_dict)
        transaction_dict["risk_assessment"] = risk_assessment
        logger.info(f"Transaction evaluated with risk score: {risk_assessment['score']}, level: {risk_assessment['level']}")

    # Translate to the stored shape. build_transaction mirrors the migration's builder and
    # stamps sourceSystem, so the row is visible to this app's scoped reads and excluded
    # from the ledger change stream's ingest filter.
    payer_name = None
    customer = fraud_service._find_customer(transaction_dict.get("customer_id"))
    if customer:
        payer_name = (customer.get("identification") or {}).get("legalName")

    document = build_transaction(transaction_dict, payer_name=payer_name)

    new_transaction = db.insert_one(
        db_name=DB_NAME,
        collection_name=TRANSACTION_COLLECTION,
        document=document
    )

    created_transaction = db.get_collection(
        db_name=DB_NAME,
        collection_name=TRANSACTION_COLLECTION
    ).find_one({"_id": new_transaction.inserted_id}, WITHOUT_EMBEDDING)

    return JSONResponse(status_code=status.HTTP_201_CREATED, content=mongo_json(created_transaction))

@router.post("/evaluate", response_description="Evaluate transaction for fraud without storing it")
async def evaluate_transaction(
    transaction: Dict[str, Any] = Body(...),
    fraud_service: FraudDetectionService = Depends(get_fraud_detection_service)
):
    """
    Evaluate a transaction for potential fraud without storing it in the database.
    This endpoint is useful for pre-screening transactions or simulating fraud detection.
    
    Supports both customer_id (legacy) and entity_id (new) fields.
    If entity_id is provided, it will be used as customer_id for compatibility.
    """
    # Support both entity_id and customer_id for backward compatibility
    if "entity_id" in transaction and not transaction.get("customer_id"):
        transaction["customer_id"] = transaction["entity_id"]
    
    # Find similar transactions using vector search
    similar_transactions, similarity_risk_score, calculation_breakdown = await fraud_service.find_similar_transactions(transaction)
    
    # Perform fraud detection (traditional rules-based)
    risk_assessment = await fraud_service.evaluate_transaction(transaction)
    
    # Smart filtering based on the transaction scenario
    display_transactions = []
    
    # Check if this is a normal or unusual transaction based on risk_assessment
    is_unusual = risk_assessment.get("level", "medium") in ["medium", "high"] or len(risk_assessment.get("flags", [])) > 0
    
    if is_unusual:
        # For unusual transactions, prioritize medium and high risk transactions in results
        # First, categorize transactions by risk level
        high_risk = [t for t in similar_transactions if t.get("risk_assessment", {}).get("level") == "high"]
        medium_risk = [t for t in similar_transactions if t.get("risk_assessment", {}).get("level") == "medium"]
        low_risk = [t for t in similar_transactions if t.get("risk_assessment", {}).get("level") == "low"]
        
        # Build display list prioritizing medium and high risk
        display_transactions = high_risk + medium_risk + low_risk
    else:
        # For normal transactions, prioritize low risk transactions
        # First, categorize transactions by risk level
        low_risk = [t for t in similar_transactions if t.get("risk_assessment", {}).get("level") == "low"]
        medium_risk = [t for t in similar_transactions if t.get("risk_assessment", {}).get("level") == "medium"]
        high_risk = [t for t in similar_transactions if t.get("risk_assessment", {}).get("level") == "high"]
        
        # Build display list prioritizing low risk
        display_transactions = low_risk + medium_risk + high_risk
    
    # Limit to top 5 after reordering
    display_transactions = display_transactions[:5] if len(display_transactions) > 5 else display_transactions
    
    # Log the filtering results for debugging
    logger.info(f"Transaction evaluation - Is unusual: {is_unusual}, " +
               f"High risk matches shown: {len([t for t in display_transactions if t.get('risk_assessment', {}).get('level') == 'high'])}, " +
               f"Medium risk matches shown: {len([t for t in display_transactions if t.get('risk_assessment', {}).get('level') == 'medium'])}, " +
               f"Low risk matches shown: {len([t for t in display_transactions if t.get('risk_assessment', {}).get('level') == 'low'])}")
    
    # Recalculate similarity risk score based only on displayed transactions
    recalculated_similarity_risk_score = similarity_risk_score  # Default to original value
    
    if display_transactions:
        # Get current transaction amount for amount comparisons
        current_amount = transaction.get("amount", 0)
        
        # Score categories for different risk levels
        high_risk_scores = []
        medium_risk_scores = []
        low_risk_scores = []
        
        # Process displayed transactions only
        for idx, t in enumerate(display_transactions):
            # Get the similarity score
            similarity = t.get("score", 0.5)  # Default to 0.5 if not available
            
            # Apply a stronger position weight for the filtered top 5 transactions
            # First result gets full weight, last (5th) gets 0.6 weight
            position_weight = 1.0 - (idx * 0.1)  # Creates weights: 1.0, 0.9, 0.8, 0.7, 0.6
            weighted_similarity = similarity * position_weight
            
            # Get risk information
            risk_assessment = t.get("risk_assessment", {})
            risk_level = risk_assessment.get("level", "unknown")
            risk_score = risk_assessment.get("score", 50) / 100.0  # Normalize to 0-1 range
            risk_flags = risk_assessment.get("flags", [])
            
            # Get amount for comparison
            similar_amount = t.get("amount", 0)
            
            # Calculate amount similarity (if both amounts are valid)
            amount_similarity = 1.0
            if similar_amount > 0 and current_amount > 0:
                # Calculate ratio of smaller to larger amount (gives 0.0-1.0)
                amount_ratio = min(current_amount, similar_amount) / max(current_amount, similar_amount)
                
                # Strong weight for very similar amounts
                if amount_ratio > 0.95:  # Very similar
                    amount_similarity = 1.0
                elif amount_ratio > 0.8:  # Somewhat similar
                    amount_similarity = 0.8
                elif amount_ratio > 0.5:  # Moderately different
                    amount_similarity = 0.6
                else:  # Very different
                    amount_similarity = 0.4
            
            # Adjust similarity score based on amount
            final_similarity = weighted_similarity * 0.7 + amount_similarity * 0.3
            
            # Create score object with relevant information
            score_entry = {
                "similarity": final_similarity,
                "risk_score": risk_score,
                "flags": len(risk_flags),
                "position": idx + 1,
                "raw_similarity": similarity,
                "position_weight": position_weight,
                "weighted_similarity": weighted_similarity,
                "amount_similarity": amount_similarity
            }
            
            # Categorize by risk level
            if risk_level == "high":
                high_risk_scores.append(score_entry)
            elif risk_level == "medium":
                medium_risk_scores.append(score_entry)
            elif risk_level == "low":
                low_risk_scores.append(score_entry)
            else:
                # Put unknown in medium risk by default
                medium_risk_scores.append(score_entry)
        
        # Calculate final risk score based on displayed transactions
        if high_risk_scores:
            # With high risk matches, focus on them using weighted average
            total_weight = 0
            weighted_sum = 0
            
            for score in high_risk_scores:
                # Higher similarity and more flags = higher weight
                weight = score["similarity"] * (1 + score["flags"] * 0.1)
                weighted_sum += score["risk_score"] * weight
                total_weight += weight
                
            # Calculate weighted risk and add premium for multiple high-risk matches
            high_risk_factor = min(1.0, weighted_sum / max(1, total_weight))
            high_risk_boost = min(0.2, len(high_risk_scores) * 0.05)  # Up to 0.2 boost
            recalculated_similarity_risk_score = min(1.0, high_risk_factor + high_risk_boost)
            
        elif low_risk_scores and not medium_risk_scores:
            # Only low risk matches - likely safe
            avg_similarity = sum(s["similarity"] for s in low_risk_scores) / len(low_risk_scores)
            recalculated_similarity_risk_score = max(0.05, 1.0 - (avg_similarity ** 1.5))
            
        else:
            # Mixed risk or medium risk - use weighted calculation across all scores
            all_scores = high_risk_scores + medium_risk_scores + low_risk_scores
            
            if all_scores:
                # Calculate weighted average of all risk scores
                total_weight = 0
                weighted_sum = 0
                
                for score in all_scores:
                    # Balance between similarity and risk factors
                    weight = score["similarity"] * (1 + 0.2 * score["flags"])
                    weighted_sum += score["risk_score"] * weight
                    total_weight += weight
                    
                # Normalize to get final score
                if total_weight > 0:
                    recalculated_similarity_risk_score = weighted_sum / total_weight
                else:
                    recalculated_similarity_risk_score = 0.5
            else:
                # Fallback if no categorized scores
                recalculated_similarity_risk_score = 0.5
        
        # Ensure score is in bounds
        recalculated_similarity_risk_score = max(0.0, min(1.0, recalculated_similarity_risk_score))
        logger.info(f"Recalculated similarity risk score (top 5 only): {recalculated_similarity_risk_score:.3f} (original: {similarity_risk_score:.3f})")
        
        # Log detailed weight information for debugging
        logger.info(f"Position weights applied to top 5: " + 
                   ", ".join([f"{i+1}: {1.0 - (i * 0.1):.1f}" for i in range(min(5, len(display_transactions)))]))
        
        # Log transaction risk score contributions
        contribution_log = "Transaction risk contributions:\n"
        for risk_type, scores in [("High risk", high_risk_scores), ("Medium risk", medium_risk_scores), ("Low risk", low_risk_scores)]:
            if scores:
                contribution_log += f"{risk_type} transactions ({len(scores)}):\n"
                for score in scores:
                    contribution_log += (f"  Pos {score['position']}: raw_sim={score['raw_similarity']:.2f}, " +
                                       f"pos_weight={score['position_weight']:.1f}, " +
                                       f"amount_sim={score['amount_similarity']:.1f}, " +
                                       f"final_sim={score['similarity']:.2f}, " +
                                       f"risk={score['risk_score']:.2f}, " +
                                       f"flags={score['flags']}\n")
        logger.info(contribution_log)
    
    # Return the risk assessment with similar transactions
    return {
        "transaction": {
            "amount": transaction.get("amount"),
            "merchant": transaction.get("merchant", {}).get("category"),
            "transaction_type": transaction.get("transaction_type")
        },
        "risk_assessment": risk_assessment,
        "similar_transactions": display_transactions,
        "similar_transactions_count": len(similar_transactions),  # Include total count for context
        "similarity_risk_score": recalculated_similarity_risk_score,
        "vector_search_calculation": calculation_breakdown  # Include calculation breakdown for transparency
    }

# Responses are the stored (camelCase) documents. No response_model: the migrated shape
# is payer/payee/txnId/createdAt/riskAssessment/transactionStatus, which the legacy
# snake_case TransactionResponse could not express. The one place the wire stays snake is
# POST /evaluate, whose composed payload the frontend reads.
@router.get("/", response_description="List transactions")
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
    transaction_type: Optional[str] = Query(None, description="Filter by transaction type (purchase, withdrawal, transfer, payment, refund)"),
    status: Optional[str] = Query(None, description="Filter by transactionStatus. Migrated data carries only 'Completed' (capitalised)")
):
    # Build query filters
    query = {}

    if customer_id:
        # The customer reference on a transaction is the payer's account id
        query["payer.accountId"] = customer_id

    if start_date or end_date:
        date_query = {}
        if start_date:
            date_query["$gte"] = start_date
        if end_date:
            date_query["$lte"] = end_date
        if date_query:
            query["createdAt"] = date_query

    if min_amount is not None or max_amount is not None:
        amount_query = {}
        if min_amount is not None:
            amount_query["$gte"] = min_amount
        if max_amount is not None:
            amount_query["$lte"] = max_amount
        if amount_query:
            query["amount"] = amount_query

    if risk_level:
        query["riskAssessment.level"] = risk_level

    if transaction_type:
        query["transactionTypeSource"] = transaction_type

    if status:
        query["transactionStatus"] = status

    # Get transactions with filters
    transactions = list(db.get_collection(
        db_name=DB_NAME,
        collection_name=TRANSACTION_COLLECTION
    ).find(scoped(query), WITHOUT_EMBEDDING).sort("createdAt", -1).skip(skip).limit(limit))

    return mongo_json(transactions)

@router.get("/{transaction_id}", response_description="Get a single transaction")
async def get_transaction(transaction_id: str, db: MongoDBAccess = Depends(get_db)):
    # `$type: "string"` is not redundant. txnId_1 is a PARTIAL unique index
    # (partialFilterExpression {txnId: {$type: "string"}}, needed because Leafy Bank's
    # payments carry no txnId and plain unique would collide on nulls). Mongo only uses a
    # partial index when the query predicate is a subset of that filter, and an equality on
    # a string literal does not prove the type to the planner — without this the lookup
    # COLLSCANs all 21k documents.
    txn_query = scoped({"txnId": {"$eq": transaction_id, "$type": "string"}})

    if (transaction := db.get_collection(
        db_name=DB_NAME,
        collection_name=TRANSACTION_COLLECTION
    ).find_one(txn_query, WITHOUT_EMBEDDING)) is not None:
        return mongo_json(transaction)

    raise HTTPException(status_code=404, detail=f"Transaction with ID {transaction_id} not found")

@router.get("/customer/{customer_id}", response_description="Get customer transactions")
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
    ).find(scoped({
        "payer.accountId": customer_id,
        "createdAt": {"$gte": start_date}
    }), WITHOUT_EMBEDDING).sort("createdAt", -1).skip(skip).limit(limit))

    return mongo_json(transactions)

@router.get("/risk/high", response_description="Get high-risk transactions")
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
    ).find(scoped({
        "riskAssessment.level": "high",
        "createdAt": {"$gte": start_date}
    }), WITHOUT_EMBEDDING).sort("createdAt", -1).skip(skip).limit(limit))

    return mongo_json(transactions)

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
    ).find(scoped({
        "riskAssessment.flags": flag_type,
        "createdAt": {"$gte": start_date}
    }), WITHOUT_EMBEDDING).sort("createdAt", -1).skip(skip).limit(limit))

    return mongo_json(transactions)