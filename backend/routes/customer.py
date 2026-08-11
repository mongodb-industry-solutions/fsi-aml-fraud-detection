from fastapi import APIRouter, Body, HTTPException, status, Depends
from fastapi.responses import JSONResponse
from fastapi.encoders import jsonable_encoder
from typing import List, Optional
import os

from models.customer import CustomerModel, CustomerResponse
from db.mongo_db import MongoDBAccess
from db.scope import scoped, stamped
from db.serialize import mongo_json

# Environment variables
MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME", "leafy_bank_bian")
CUSTOMER_COLLECTION = "customers"

# The three 1536-float embeddings are 87% of each document (~64 KB of 74 KB) and no
# route returns them. Excluding them here keeps them off the Mongo→app hop too;
# CustomerResponse independently keeps them off the app→client hop.
WITHOUT_EMBEDDINGS = {
    "profileEmbedding": 0,
    "behavioralEmbedding": 0,
    "identifierEmbedding": 0,
    "behavioralText": 0,
    "profileSummaryText": 0,
    "identifierText": 0,
}

router = APIRouter(
    prefix="/customers",
    tags=["customers"],
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

@router.post("/", response_description="Add new customer", response_model=CustomerResponse)
async def create_customer(customer: CustomerModel = Body(...), db: MongoDBAccess = Depends(get_db)):
    customer = stamped(jsonable_encoder(customer))
    new_customer = db.insert_one(
        db_name=DB_NAME,
        collection_name=CUSTOMER_COLLECTION,
        document=customer
    )
    created_customer = db.get_collection(
        db_name=DB_NAME,
        collection_name=CUSTOMER_COLLECTION
    ).find_one({"_id": new_customer.inserted_id})

    return JSONResponse(status_code=status.HTTP_201_CREATED, content=mongo_json(created_customer))

@router.get("/", response_description="List all customers", response_model=List[CustomerResponse])
async def list_customers(
    db: MongoDBAccess = Depends(get_db),
    limit: int = 5,
    skip: int = 0,
    sort_by_risk: bool = False,
    behavioral_source: Optional[str] = None,
):
    import logging
    logger = logging.getLogger(__name__)
    
    try:
        # Log what we're trying to do
        logger.info(f"Attempting to access collection '{CUSTOMER_COLLECTION}' in database '{DB_NAME}'")
        
        # Get the collection
        collection = db.get_collection(
            db_name=DB_NAME,
            collection_name=CUSTOMER_COLLECTION
        )
        
        # `customers` holds two cohorts merged by the SD-1 transform, told apart by
        # behavioralProfile.source: "aml" (504, from `entities`) and "fraud" (50, migrated
        # from the old fraud `customers`, which own all 21,449 transactions).
        query = scoped(
            {"behavioralProfile.source": behavioral_source} if behavioral_source else None
        )

        # Counted on the same filter, so the log says how many the caller could page
        # through rather than how big the collection is.
        logger.info(f"Found {collection.count_documents(query)} documents matching {query}")

        # createdAt descending by default, matching the AML endpoint this picker used to
        # read (`entity_repository.py:343` sorts the same way). That ordering is what the
        # deployed demo's dropdown shows — newest first, so Noémi Rosario then Colin Stone.
        # Natural load order would start at Chr Luce Benthin instead.
        cursor = collection.find(query, WITHOUT_EMBEDDINGS).sort(
            "riskProfile.overall.score" if sort_by_risk else "createdAt", -1
        )
        customers = list(cursor.skip(skip).limit(limit))
        logger.info(f"Retrieved {len(customers)} customers")

        return mongo_json(customers)
    
    except Exception as e:
        import traceback
        logger.error(f"Error retrieving customers: {str(e)}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.get("/{customer_id}", response_description="Get a single customer", response_model=CustomerResponse)
async def get_customer(customer_id: str, db: MongoDBAccess = Depends(get_db)):
    if (customer := db.get_collection(
        db_name=DB_NAME,
        collection_name=CUSTOMER_COLLECTION
    ).find_one(scoped({"customerId": customer_id}), WITHOUT_EMBEDDINGS)) is not None:
        return mongo_json(customer)

    raise HTTPException(status_code=404, detail=f"Customer with ID {customer_id} not found")

@router.put("/{customer_id}", response_description="Update a customer", response_model=CustomerResponse)
async def update_customer(customer_id: str, customer: CustomerModel = Body(...), db: MongoDBAccess = Depends(get_db)):
    customer = {k: v for k, v in customer.dict().items() if v is not None}
    
    if len(customer) >= 1:
        update_result = db.get_collection(
            db_name=DB_NAME,
            collection_name=CUSTOMER_COLLECTION
        ).update_one(scoped({"customerId": customer_id}), {"$set": customer})
        
        if update_result.modified_count == 0:
            raise HTTPException(status_code=404, detail=f"Customer with ID {customer_id} not found")
    
    if (updated_customer := db.get_collection(
        db_name=DB_NAME,
        collection_name=CUSTOMER_COLLECTION
    ).find_one(scoped({"customerId": customer_id}), WITHOUT_EMBEDDINGS)) is not None:
        return mongo_json(updated_customer)
    
    raise HTTPException(status_code=404, detail=f"Customer with ID {customer_id} not found")

@router.delete("/{customer_id}", response_description="Delete a customer")
async def delete_customer(customer_id: str, db: MongoDBAccess = Depends(get_db)):
    delete_result = db.get_collection(
        db_name=DB_NAME,
        collection_name=CUSTOMER_COLLECTION
    ).delete_one(scoped({"customerId": customer_id}))
    
    if delete_result.deleted_count == 1:
        return JSONResponse(status_code=status.HTTP_204_NO_CONTENT)
    
    raise HTTPException(status_code=404, detail=f"Customer with ID {customer_id} not found")
