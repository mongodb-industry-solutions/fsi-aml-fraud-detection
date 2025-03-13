from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any
from datetime import datetime
from bson import ObjectId


class PyObjectId(ObjectId):
    @classmethod
    def validate(cls, v):
        if not ObjectId.is_valid(v):
            raise ValueError("Invalid objectid")
        return ObjectId(v)

    @classmethod
    def __get_pydantic_json_schema__(cls, field_schema):
        field_schema.update(type="string")
        return field_schema


class MerchantModel(BaseModel):
    name: str
    category: str
    id: str


class GeoCoordinates(BaseModel):
    type: str = "Point"
    coordinates: List[float]


class LocationModel(BaseModel):
    city: str
    state: str
    country: str
    coordinates: GeoCoordinates


class DeviceInfoModel(BaseModel):
    device_id: str
    type: str
    os: str
    browser: str
    ip: str


class RiskAssessmentModel(BaseModel):
    score: float
    level: str  # low, medium, high
    flags: List[str]
    transaction_type: str  # legitimate, suspicious, fraudulent


class TransactionModel(BaseModel):
    id: Optional[PyObjectId] = Field(default_factory=PyObjectId, alias="_id")
    customer_id: str
    transaction_id: str
    timestamp: datetime
    amount: float
    currency: str
    merchant: MerchantModel
    location: LocationModel
    device_info: DeviceInfoModel
    transaction_type: str  # purchase, withdrawal, transfer, deposit
    payment_method: str
    status: str  # completed, pending, failed, refunded
    risk_assessment: RiskAssessmentModel

    model_config = {
        "populate_by_name": True,
        "arbitrary_types_allowed": True,
        "json_encoders": {
            ObjectId: str
        }
    }


class TransactionResponse(BaseModel):
    id: str = Field(..., alias="_id")
    customer_id: str
    transaction_id: str
    timestamp: datetime
    amount: float
    currency: str
    merchant: MerchantModel
    location: LocationModel
    device_info: DeviceInfoModel
    transaction_type: str
    payment_method: str
    status: str
    risk_assessment: RiskAssessmentModel

    model_config = {
        "populate_by_name": True,
        "json_schema_extra": {
            "example": {
                "_id": "67d2a83b654c7f1b869cb1c2",
                "customer_id": "67d2a82a654c7f1b869c4ada",
                "transaction_id": "67d2a82b654c7f1b869c4b0c",
                "timestamp": "2024-09-25T17:33:36.479077",
                "amount": 225.17,
                "currency": "USD",
                "merchant": {
                    "name": "Cook, Hill and Woodard",
                    "category": "money_transfer",
                    "id": "3b803226"
                },
                "location": {
                    "city": "Bradleyburgh",
                    "state": "Pennsylvania",
                    "country": "CN",
                    "coordinates": {
                        "type": "Point",
                        "coordinates": [
                            -94.144577,
                            24.8050725
                        ]
                    }
                },
                "device_info": {
                    "device_id": "5b6e68b0-f8f5-436c-89bb-970ebbb78cc1",
                    "type": "tablet",
                    "os": "Linux",
                    "browser": "Firefox",
                    "ip": "115.232.234.151"
                },
                "transaction_type": "purchase",
                "payment_method": "bank_transfer",
                "status": "completed",
                "risk_assessment": {
                    "score": 86.0279076621168,
                    "level": "high",
                    "flags": [
                        "unexpected_location",
                        "unusual_amount",
                        "velocity_alert",
                        "rare_transaction_time"
                    ],
                    "transaction_type": "fraudulent"
                }
            }
        }
    }