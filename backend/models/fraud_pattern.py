from pydantic import BaseModel, Field
from typing import List, Optional
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


class FraudPatternModel(BaseModel):
    id: Optional[PyObjectId] = Field(default_factory=PyObjectId, alias="_id")
    pattern_name: str
    description: str
    severity: str  # low, medium, high, critical
    indicators: List[str]
    detection_rate: float
    false_positive_rate: float
    vector_embedding: List[float]

    model_config = {
        "populate_by_name": True,
        "arbitrary_types_allowed": True,
        "json_encoders": {
            ObjectId: str
        }
    }


class FraudPatternResponse(BaseModel):
    id: str = Field(..., alias="_id")
    pattern_name: str
    description: str
    severity: str
    indicators: List[str]
    detection_rate: float
    false_positive_rate: float
    # Note: vector_embedding may be excluded for API responses to reduce payload size
    # We've included it here for completeness
    vector_embedding: List[float]

    model_config = {
        "populate_by_name": True,
        "json_schema_extra": {
            "example": {
                "_id": "67d2a849654c7f1b869d1878",
                "pattern_name": "Account Takeover",
                "description": "New device login followed by unusual transactions and settings changes",
                "severity": "high",
                "indicators": [
                    "new_device",
                    "unusual_location",
                    "settings_change",
                    "high_value_transaction"
                ],
                "detection_rate": 0.83,
                "false_positive_rate": 0.05,
                "vector_embedding": [
                    -0.0201416015625,
                    0.00531005859375,
                    # ... additional embedding values
                ]
            }
        }
    }