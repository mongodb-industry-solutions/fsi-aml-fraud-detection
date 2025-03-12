from fastapi import APIRouter, Depends, HTTPException
from typing import Dict, Any
from models.fraud_rules import FraudDetectionRules, FraudDetectionRulesUpdate
from db.mongo_db import MongoDBAccess
import config
import logging

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/fraud-rules",
    tags=["fraud-rules"],
    responses={404: {"description": "Not found"}},
)


def get_rules_collection():
    """
    Dependency to get the fraud rules collection
    """
    try:
        # Connect to MongoDB
        mongo_client = MongoDBAccess(config.MONGODB_URI)
        
        # Get collection
        rules_collection = mongo_client.get_collection(
            config.DB_NAME, config.RULES_COLLECTION
        )
        
        # Ensure default rules exist
        if rules_collection.count_documents({}) == 0:
            rules_collection.insert_one(config.DEFAULT_RULES)
        
        return rules_collection
    except Exception as e:
        logger.error(f"Error getting rules collection: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


@router.get("/", response_model=FraudDetectionRules)
async def get_fraud_rules(
    rules_collection = Depends(get_rules_collection)
):
    """
    Get the current fraud detection rules
    """
    try:
        rules = rules_collection.find_one({})
        if not rules:
            # Insert default rules if none exist
            rules = config.DEFAULT_RULES
            rules_collection.insert_one(rules)
        
        # Remove MongoDB _id field
        if "_id" in rules:
            del rules["_id"]
            
        return rules
    except Exception as e:
        logger.error(f"Error in get_fraud_rules: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/", response_model=FraudDetectionRules)
async def update_fraud_rules(
    rules_update: FraudDetectionRulesUpdate,
    rules_collection = Depends(get_rules_collection)
):
    """
    Update the fraud detection rules
    """
    try:
        # Get current rules
        current_rules = rules_collection.find_one({})
        if not current_rules:
            # Insert default rules if none exist
            current_rules = config.DEFAULT_RULES
            rules_collection.insert_one(current_rules)
            current_rules = rules_collection.find_one({})
        
        # Prepare update dictionary
        update_dict = {}
        
        if rules_update.high_risk_locations:
            update_dict["high_risk_locations"] = rules_update.high_risk_locations.dict()
        
        if rules_update.amount_threshold:
            update_dict["amount_threshold"] = rules_update.amount_threshold.dict()
        
        if not update_dict:
            # Nothing to update
            if "_id" in current_rules:
                del current_rules["_id"]
            return current_rules
        
        # Apply update
        rules_collection.update_one({}, {"$set": update_dict})
        
        # Get updated rules
        updated_rules = rules_collection.find_one({})
        if "_id" in updated_rules:
            del updated_rules["_id"]
            
        return updated_rules
    except Exception as e:
        logger.error(f"Error in update_fraud_rules: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/reset", response_model=FraudDetectionRules)
async def reset_fraud_rules(
    rules_collection = Depends(get_rules_collection)
):
    """
    Reset fraud detection rules to defaults
    """
    try:
        # Delete all existing rules
        rules_collection.delete_many({})
        
        # Insert default rules
        rules_collection.insert_one(config.DEFAULT_RULES)
        
        # Get inserted rules
        rules = rules_collection.find_one({})
        if "_id" in rules:
            del rules["_id"]
            
        return rules
    except Exception as e:
        logger.error(f"Error in reset_fraud_rules: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))