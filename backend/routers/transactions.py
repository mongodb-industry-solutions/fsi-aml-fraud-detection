from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional, Dict, Any
from models.transaction import Transaction, TransactionCreate, TransactionResponse
from services.transaction_service import TransactionService
from db.mongo_db import MongoDBAccess
import config
import logging

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/transactions",
    tags=["transactions"],
    responses={404: {"description": "Not found"}},
)


def get_transaction_service():
    """
    Dependency to get the transaction service instance
    """
    try:
        # Connect to MongoDB
        mongo_client = MongoDBAccess(config.MONGODB_URI)
        
        # Ensure database exists (will be created automatically when we use it)
        db = mongo_client.get_database(config.DB_NAME)
        
        # Get collections
        transactions_collection = mongo_client.get_collection(
            config.DB_NAME, config.TRANSACTIONS_COLLECTION
        )
        rules_collection = mongo_client.get_collection(
            config.DB_NAME, config.RULES_COLLECTION
        )
        
        # Check if collections exist by trying to access them
        try:
            # This will throw an error if the collection doesn't exist
            rules_count = rules_collection.count_documents({})
            logger.info(f"Rules collection exists with {rules_count} documents")
            
            # Ensure default rules exist
            if rules_count == 0:
                logger.info("Inserting default rules")
                rules_collection.insert_one(config.DEFAULT_RULES)
        except Exception as e:
            logger.info(f"Rules collection might not exist, creating it: {str(e)}")
            # Create collection by inserting default rules
            rules_collection.insert_one(config.DEFAULT_RULES)
            logger.info("Default rules inserted successfully")
        
        # Create and return transaction service
        transaction_service = TransactionService(transactions_collection, rules_collection)
        return transaction_service
    except Exception as e:
        logger.error(f"Error creating transaction service: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


@router.post("/", response_model=TransactionResponse)
async def create_transaction(
    transaction: TransactionCreate,
    transaction_service: TransactionService = Depends(get_transaction_service)
):
    """
    Create a new transaction and apply fraud detection
    """
    try:
        result = transaction_service.create_transaction(
            amount=transaction.amount,
            currency=transaction.currency,
            location=transaction.location
        )
        return result
    except Exception as e:
        logger.error(f"Error in create_transaction: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/", response_model=List[Transaction])
async def get_transactions(
    limit: int = Query(100, ge=1, le=1000),
    skip: int = Query(0, ge=0),
    transaction_service: TransactionService = Depends(get_transaction_service)
):
    """
    Get a list of transactions with pagination
    """
    try:
        transactions = transaction_service.get_transactions(limit=limit, skip=skip)
        return transactions
    except Exception as e:
        logger.error(f"Error in get_transactions: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{transaction_id}", response_model=Transaction)
async def get_transaction(
    transaction_id: str,
    transaction_service: TransactionService = Depends(get_transaction_service)
):
    """
    Get a transaction by ID
    """
    try:
        transaction = transaction_service.get_transaction_by_id(transaction_id)
        if not transaction:
            raise HTTPException(status_code=404, detail="Transaction not found")
        return transaction
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in get_transaction: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/generate-samples", response_model=List[Transaction])
async def generate_sample_transactions(
    count: int = Query(10, ge=1, le=100),
    transaction_service: TransactionService = Depends(get_transaction_service)
):
    """
    Generate sample transactions for testing
    """
    import traceback
    
    try:
        logger.info(f"API: Generating {count} sample transactions")
        transactions = transaction_service.generate_sample_transactions(count=count)
        logger.info(f"API: Successfully generated {len(transactions)} transactions")
        return transactions
    except Exception as e:
        error_trace = traceback.format_exc()
        logger.error(f"API Error in generate_sample_transactions: {str(e)}\n{error_trace}")
        
        # Create detailed error message
        error_detail = {
            "message": str(e),
            "error_type": type(e).__name__,
            "context": f"Error occurred while trying to generate {count} sample transactions"
        }
        
        raise HTTPException(status_code=500, detail=str(error_detail))