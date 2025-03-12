from pydantic import BaseModel, Field
from typing import Dict, List, Optional, Tuple, Union
from datetime import datetime
import uuid


class Location(BaseModel):
    address: str
    coordinates: Tuple[float, float]
    country: str


class Transaction(BaseModel):
    transaction_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    sender_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    receiver_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    amount: float
    currency: str
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    location: Location
    fraud_score: Optional[float] = None
    is_flagged_fraud: Optional[bool] = None
    vectorized_transaction: Optional[List[float]] = None
    similarity_fraud_score: Optional[float] = None
    is_flagged_fraud_similarity: Optional[bool] = None

    class Config:
        schema_extra = {
            "example": {
                "transaction_id": "123e4567-e89b-12d3-a456-426614174000",
                "sender_id": "123e4567-e89b-12d3-a456-426614174001",
                "receiver_id": "123e4567-e89b-12d3-a456-426614174002",
                "amount": 1000.0,
                "currency": "USD",
                "timestamp": "2023-01-01T12:00:00.000000",
                "location": {
                    "address": "New York City Hall, 260 Broadway, New York, NY 10000, USA",
                    "coordinates": [40.7127281, -74.0060152],
                    "country": "US"
                }
            }
        }


class TransactionCreate(BaseModel):
    amount: float
    currency: str = "USD"
    location: str
    
    class Config:
        schema_extra = {
            "example": {
                "amount": 1000.0,
                "currency": "USD",
                "location": "US"
            }
        }


class TransactionResponse(BaseModel):
    transaction: Transaction
    similar_transactions: Optional[List[Transaction]] = None