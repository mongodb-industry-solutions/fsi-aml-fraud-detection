from pydantic import BaseModel, Field, EmailStr
from typing import List, Dict, Optional, Any, Union
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


class AddressModel(BaseModel):
    street: str
    city: str
    state: str
    country: str
    zip: str


class PersonalInfoModel(BaseModel):
    name: str
    email: str  # Consider using EmailStr with pydantic[email] installed
    phone: str
    address: AddressModel
    dob: str


class AccountInfoModel(BaseModel):
    account_number: str
    account_type: str
    creation_date: datetime
    status: str
    credit_score: int


class LocationModel(BaseModel):
    type: str = "Point"
    coordinates: List[float]


class UsualLocationModel(BaseModel):
    city: str
    state: str
    country: str
    location: LocationModel
    frequency: float


class DeviceModel(BaseModel):
    device_id: str
    type: str
    os: str
    browser: str
    ip_range: List[str]
    usual_locations: List[UsualLocationModel]


class TransactionTimeModel(BaseModel):
    day_of_week: int  # 0-6, where 0 is Monday
    hour_range: List[int]  # [start_hour, end_hour]


class TransactionLocationModel(BaseModel):
    city: str
    state: str
    country: str
    location: LocationModel
    frequency: float


class TransactionPatternsModel(BaseModel):
    avg_transaction_amount: float
    std_transaction_amount: float
    avg_transactions_per_day: float
    common_merchant_categories: List[str]
    usual_transaction_times: List[TransactionTimeModel]
    usual_transaction_locations: List[TransactionLocationModel]


class BehavioralProfileModel(BaseModel):
    devices: List[DeviceModel]
    transaction_patterns: TransactionPatternsModel


class RiskProfileModel(BaseModel):
    overall_risk_score: float
    last_risk_assessment: datetime
    risk_factors: List[str]
    last_reported_fraud: Optional[datetime] = None


class MetadataModel(BaseModel):
    last_updated: datetime
    created_at: datetime


class CustomerModel(BaseModel):
    id: Optional[PyObjectId] = Field(default_factory=PyObjectId, alias="_id")
    personal_info: PersonalInfoModel
    account_info: AccountInfoModel
    behavioral_profile: BehavioralProfileModel
    risk_profile: RiskProfileModel
    metadata: MetadataModel

    model_config = {
        "populate_by_name": True,
        "arbitrary_types_allowed": True,
        "json_encoders": {
            ObjectId: str
        }
    }


class CustomerResponse(BaseModel):
    id: str = Field(..., alias="_id")
    personal_info: PersonalInfoModel
    account_info: AccountInfoModel
    behavioral_profile: BehavioralProfileModel
    risk_profile: RiskProfileModel
    metadata: MetadataModel

    model_config = {
        "populate_by_name": True,
        "json_schema_extra": {
            "example": {
                "_id": "67d2a82a654c7f1b869c4ada",
                "personal_info": {
                    "name": "Stephen Burns",
                    "email": "utrujillo@example.net",
                    "phone": "651.841.2654x4649",
                    "address": {
                        "street": "3737 Ross Spring",
                        "city": "Davidtown",
                        "state": "South Carolina",
                        "country": "Luxembourg",
                        "zip": "45639"
                    },
                    "dob": "1946-07-31"
                },
                "account_info": {
                    "account_number": "PHTF58949498616337",
                    "account_type": "checking",
                    "creation_date": "2015-05-10T18:09:28.249815",
                    "status": "active",
                    "credit_score": 371
                },
                "behavioral_profile": {
                    "devices": [
                        {
                            "device_id": "f67129f1-24a9-4711-ab22-1ece3be1afc4",
                            "type": "desktop",
                            "os": "macOS",
                            "browser": "Firefox",
                            "ip_range": [
                                "90.58.120.143",
                                "50.131.224.95"
                            ],
                            "usual_locations": [
                                {
                                    "city": "North David",
                                    "state": "New York",
                                    "country": "DM",
                                    "location": {
                                        "type": "Point",
                                        "coordinates": [
                                            84.521719,
                                            -58.3850145
                                        ]
                                    },
                                    "frequency": 0.10507815554635425
                                }
                            ]
                        }
                    ],
                    "transaction_patterns": {
                        "avg_transaction_amount": 58.33,
                        "std_transaction_amount": 38.81,
                        "avg_transactions_per_day": 2.8,
                        "common_merchant_categories": [
                            "healthcare",
                            "restaurant",
                            "gas"
                        ],
                        "usual_transaction_times": [
                            {
                                "day_of_week": 6,
                                "hour_range": [
                                    11,
                                    14
                                ]
                            }
                        ],
                        "usual_transaction_locations": [
                            {
                                "city": "Williamsborough",
                                "state": "Louisiana",
                                "country": "NL",
                                "location": {
                                    "type": "Point",
                                    "coordinates": [
                                        -54.507031,
                                        -31.370201
                                    ]
                                },
                                "frequency": 0.31441543005607714
                            }
                        ]
                    }
                },
                "risk_profile": {
                    "overall_risk_score": 15.73,
                    "last_risk_assessment": "2025-02-27T11:30:33.193978",
                    "risk_factors": [
                        "velocity_alert",
                        "strange_time_pattern"
                    ],
                    "last_reported_fraud": None
                },
                "metadata": {
                    "last_updated": "2025-03-13T09:40:58.859380",
                    "created_at": "2018-04-30T13:06:33.865223"
                }
            }
        }
    }