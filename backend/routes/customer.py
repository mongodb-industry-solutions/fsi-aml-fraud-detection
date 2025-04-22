from fastapi import APIRouter, Body, HTTPException, status, Depends
from fastapi.responses import JSONResponse
from fastapi.encoders import jsonable_encoder
from typing import List, Optional
import os

from models.customer import CustomerModel, CustomerResponse
from db.mongo_db import MongoDBAccess

# Environment variables
MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME", "fsi-threatsight360")
CUSTOMER_COLLECTION = "customers"

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
    customer = jsonable_encoder(customer)
    new_customer = db.insert_one(
        db_name=DB_NAME,
        collection_name=CUSTOMER_COLLECTION,
        document=customer
    )
    created_customer = db.get_collection(
        db_name=DB_NAME,
        collection_name=CUSTOMER_COLLECTION
    ).find_one({"_id": new_customer.inserted_id})
    
    return JSONResponse(status_code=status.HTTP_201_CREATED, content=created_customer)

@router.get("/", response_description="List all customers", response_model=List[CustomerResponse])
async def list_customers(db: MongoDBAccess = Depends(get_db), limit: int = 5, skip: int = 0):
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
        
        # Try to get a count first to verify connection
        count = collection.count_documents({})
        logger.info(f"Found {count} documents in the collection")
        
        # Get the customers
        customers = list(collection.find().skip(skip).limit(limit))
        logger.info(f"Retrieved {len(customers)} customers")
        
        return customers
    
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
    ).find_one({"_id": customer_id})) is not None:
        return customer
    
    raise HTTPException(status_code=404, detail=f"Customer with ID {customer_id} not found")

@router.put("/{customer_id}", response_description="Update a customer", response_model=CustomerResponse)
async def update_customer(customer_id: str, customer: CustomerModel = Body(...), db: MongoDBAccess = Depends(get_db)):
    customer = {k: v for k, v in customer.dict().items() if v is not None}
    
    if len(customer) >= 1:
        update_result = db.get_collection(
            db_name=DB_NAME,
            collection_name=CUSTOMER_COLLECTION
        ).update_one({"_id": customer_id}, {"$set": customer})
        
        if update_result.modified_count == 0:
            raise HTTPException(status_code=404, detail=f"Customer with ID {customer_id} not found")
    
    if (updated_customer := db.get_collection(
        db_name=DB_NAME,
        collection_name=CUSTOMER_COLLECTION
    ).find_one({"_id": customer_id})) is not None:
        return updated_customer
    
    raise HTTPException(status_code=404, detail=f"Customer with ID {customer_id} not found")

@router.delete("/{customer_id}", response_description="Delete a customer")
async def delete_customer(customer_id: str, db: MongoDBAccess = Depends(get_db)):
    delete_result = db.get_collection(
        db_name=DB_NAME,
        collection_name=CUSTOMER_COLLECTION
    ).delete_one({"_id": customer_id})
    
    if delete_result.deleted_count == 1:
        return JSONResponse(status_code=status.HTTP_204_NO_CONTENT)
    
    raise HTTPException(status_code=404, detail=f"Customer with ID {customer_id} not found")