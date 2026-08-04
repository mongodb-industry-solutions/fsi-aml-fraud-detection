"""Customer request/response models for the migrated `leafy_bank_bian.customers` shape.

Top-level fields are camelCase (`identification`, `identifiers`, `riskProfile`,
`behavioralProfile`). The nested keys *inside* `behavioralProfile` stay snake_case —
the migration preserved them, so `transaction_patterns.avg_transaction_amount` and
`devices[].device_id` are the real stored names, not an oversight.

`CustomerResponse` deliberately omits `profileEmbedding` / `behavioralEmbedding` /
`identifierEmbedding`. Those three 1536-float arrays are 87% of each document (~64 KB
of 74 KB); declaring them out of the response model keeps the simulator's 50-customer
fetch near 500 KB instead of ~3.7 MB. Anything not declared here is dropped from the
response, so add a field before the frontend can read it.
"""

from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any
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


class LocationModel(BaseModel):
    type: str = "Point"
    coordinates: List[float]


class UsualLocationModel(BaseModel):
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    location: Optional[LocationModel] = None
    frequency: Optional[float] = None


class DeviceModel(BaseModel):
    device_id: Optional[str] = None
    type: Optional[str] = None
    os: Optional[str] = None
    browser: Optional[str] = None
    ip_range: List[str] = []
    usual_locations: List[UsualLocationModel] = []


class TransactionTimeModel(BaseModel):
    day_of_week: Optional[int] = None  # 0-6, where 0 is Monday
    hour_range: List[int] = []


class TransactionPatternsModel(BaseModel):
    avg_transaction_amount: Optional[float] = None
    std_transaction_amount: Optional[float] = None
    avg_transactions_per_day: Optional[float] = None
    common_merchant_categories: List[str] = []
    usual_transaction_times: List[TransactionTimeModel] = []
    usual_transaction_locations: List[UsualLocationModel] = []


class BehavioralProfileModel(BaseModel):
    """Sub-keys stay snake_case — that is how they are stored."""
    source: Optional[str] = None
    devices: List[DeviceModel] = []
    transaction_patterns: Optional[TransactionPatternsModel] = None
    location_patterns: List[UsualLocationModel] = []
    time_of_day_patterns: Optional[Dict[str, Any]] = None
    frequency_patterns: Optional[Dict[str, Any]] = None
    ip_addresses: List[Dict[str, Any]] = []  # {ip, country, frequency, ...}, not bare strings


class IdentificationModel(BaseModel):
    legalName: Optional[str] = None
    firstName: Optional[str] = None
    lastName: Optional[str] = None
    middleName: Optional[str] = None
    dateOfBirth: Optional[str] = None
    nationality: Optional[str] = None


class IdentifierModel(BaseModel):
    type: Optional[str] = None
    value: Optional[str] = None
    country: Optional[str] = None
    verified: Optional[bool] = None


class RiskOverallModel(BaseModel):
    score: Optional[float] = None
    level: Optional[str] = None
    trend: Optional[str] = None


class RiskProfileModel(BaseModel):
    overall: Optional[RiskOverallModel] = None
    components: Optional[Dict[str, Any]] = None
    assessedAt: Optional[str] = None
    history: List[Dict[str, Any]] = []


class ContactModel(BaseModel):
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[Dict[str, Any]] = None


class ScreeningModel(BaseModel):
    """Only the fields a client needs. `screening` also carries watchlistMatches and the
    resolution block; those stay out of the response until something asks for them.

    scenarioKey is what the simulator's picker groups on. It is a real field on every
    AML-sourced customer — it just sits under `screening` here, where an AML entity had it
    at the top level. Declaring it is what makes it survive `response_model` filtering.
    """

    scenarioKey: Optional[str] = None
    sourceSystem: Optional[str] = None


class CustomerModel(BaseModel):
    """Request body for create/update."""
    id: Optional[PyObjectId] = Field(default_factory=PyObjectId, alias="_id")
    customerId: str
    identification: IdentificationModel
    identifiers: List[IdentifierModel] = []
    contact: Optional[ContactModel] = None
    riskProfile: Optional[RiskProfileModel] = None
    behavioralProfile: Optional[BehavioralProfileModel] = None
    status: Optional[str] = None
    type: Optional[str] = None
    segment: Optional[str] = None

    model_config = {
        "populate_by_name": True,
        "arbitrary_types_allowed": True,
        "json_encoders": {ObjectId: str},
    }


class CustomerResponse(BaseModel):
    id: str = Field(..., alias="_id")
    customerId: str
    identification: Optional[IdentificationModel] = None
    identifiers: List[IdentifierModel] = []
    contact: Optional[ContactModel] = None
    riskProfile: Optional[RiskProfileModel] = None
    behavioralProfile: Optional[BehavioralProfileModel] = None
    screening: Optional[ScreeningModel] = None
    status: Optional[str] = None
    type: Optional[str] = None
    segment: Optional[str] = None

    model_config = {
        "populate_by_name": True,
        "json_schema_extra": {
            "example": {
                "_id": "67d2a82a654c7f1b869c4ada",
                "customerId": "CUST-1ea73383",
                "identification": {
                    "legalName": "Chr Luce Benthin",
                    "firstName": "Chr",
                    "lastName": "Benthin",
                    "dateOfBirth": "1991-11-07",
                },
                "identifiers": [
                    {"type": "accountNumber", "value": "PHTF58949498616337", "verified": True}
                ],
                "riskProfile": {"overall": {"score": 10, "level": "low", "trend": "worsening"}},
                "behavioralProfile": {
                    "devices": [
                        {
                            "device_id": "85400fd6-e0d1-46fa-ab34-d758e5516ada",
                            "type": "laptop",
                            "os": "Linux",
                            "browser": "Safari",
                        }
                    ],
                    "transaction_patterns": {
                        "avg_transaction_amount": 364.06,
                        "std_transaction_amount": 80.15,
                        "common_merchant_categories": ["healthcare", "restaurant"],
                    },
                },
                "status": "active",
            }
        },
    }
