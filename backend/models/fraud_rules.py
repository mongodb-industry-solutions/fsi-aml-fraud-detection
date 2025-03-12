from pydantic import BaseModel
from typing import Dict, List, Union, Optional


class RuleValue(BaseModel):
    values: Union[List[str], float]
    weight: float


class FraudDetectionRules(BaseModel):
    high_risk_locations: RuleValue
    amount_threshold: RuleValue

    class Config:
        schema_extra = {
            "example": {
                "high_risk_locations": {
                    "values": ["LY", "HK"],
                    "weight": 0.5
                },
                "amount_threshold": {
                    "values": 5000,
                    "weight": 0.3
                }
            }
        }


class FraudDetectionRulesUpdate(BaseModel):
    high_risk_locations: Optional[RuleValue] = None
    amount_threshold: Optional[RuleValue] = None