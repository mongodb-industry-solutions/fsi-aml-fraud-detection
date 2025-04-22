# services/risk_model_service.py
from typing import Dict, Any, List, Optional
import asyncio
import logging
from datetime import datetime
from pymongo import MongoClient
from pymongo.collection import Collection
from pymongo.change_stream import ChangeStream

logger = logging.getLogger(__name__)

class RiskModelService:
    """Service for managing and applying risk models with real-time updates."""
    
    def __init__(self, db_client: MongoClient):
        """Initialize the risk model service with MongoDB client."""
        self.db = db_client.get_database("fraud_detection_demo")
        self.risk_models_collection = self.db.get_collection("risk_models")
        self.current_model: Dict[str, Any] = {}
        self.change_stream: Optional[ChangeStream] = None
        self.is_running = False
    
    async def start(self):
        """Start the risk model service and listen for model updates."""
        if self.is_running:
            return
        
        # Load the active model
        await self.load_active_model()
        
        # Start listening for changes
        await self.start_change_stream()
        
        self.is_running = True
        logger.info("Risk model service started")
    
    async def stop(self):
        """Stop the change stream and service."""
        if self.change_stream:
            self.change_stream.close()
        self.is_running = False
        logger.info("Risk model service stopped")
    
    async def load_active_model(self):
        """Load the currently active risk model."""
        model = await self.db.risk_models.find_one({"status": "active"})
        if not model:
            # Load default model if no active model exists
            model = self._create_default_model()
            await self.db.risk_models.insert_one(model)
        
        self.current_model = model
        logger.info(f"Loaded active risk model: {model['modelId']} (v{model['version']})")
        return self.current_model
    
    async def start_change_stream(self):
        """Start listening for changes to the risk models collection."""
        pipeline = [
            {"$match": {"operationType": {"$in": ["insert", "update", "replace"]}}},
            {"$match": {"fullDocument.status": "active"}}
        ]
        
        # Set up change stream in a separate task
        async def watch_changes():
            async with self.db.risk_models.watch(pipeline) as stream:
                async for change in stream:
                    try:
                        new_model = change["fullDocument"]
                        self.current_model = new_model
                        logger.info(f"Risk model updated: {new_model['modelId']} (v{new_model['version']})")
                    except Exception as e:
                        logger.error(f"Error processing model change: {str(e)}")
        
        asyncio.create_task(watch_changes())
    
    def evaluate_risk(self, transaction: Dict[str, Any], customer_profile: Dict[str, Any]) -> Dict[str, Any]:
        """
        Evaluate transaction risk using the current active model.
        Returns risk assessment with score and factors.
        """
        if not self.current_model:
            logger.warning("No active risk model loaded, using default evaluation")
            return self._default_risk_evaluation(transaction)
        
        # Initialize risk factors and base score
        risk_factors = []
        risk_score = 0
        
        # Get weights from current model
        weights = self.current_model.get("weights", {})
        
        # Check amount anomaly
        avg_amount = customer_profile["behavioralProfile"]["transactionPatterns"]["averageTransactionAmount"]
        amount_ratio = transaction["amount"] / avg_amount if avg_amount > 0 else 0
        
        amount_threshold_high = self._get_risk_factor_threshold("amount_anomaly_high")
        amount_threshold_medium = self._get_risk_factor_threshold("amount_anomaly_medium")
        
        if amount_ratio > amount_threshold_high:
            risk_factors.append("amount_anomaly_high")
            risk_score += weights.get("amount_anomaly_high", 30)
        elif amount_ratio > amount_threshold_medium:
            risk_factors.append("amount_anomaly_medium")
            risk_score += weights.get("amount_anomaly_medium", 15)
        
        # Check location anomaly (simplified)
        merchant_location = transaction["merchantInfo"]["location"]["coordinates"]
        common_locations = customer_profile["behavioralProfile"]["transactionPatterns"]["commonGeolocations"]
        
        location_match = False
        for loc in common_locations:
            common_loc = loc["coordinates"]
            # Simple distance calculation (in real app, use proper geospatial distance)
            distance = ((merchant_location[0] - common_loc[0])**2 + 
                       (merchant_location[1] - common_loc[1])**2)**0.5
            
            location_threshold = self._get_risk_factor_threshold("location_anomaly", field="distanceThreshold")
            # Convert rough coordinate distance to km (very approximate)
            distance_km = distance * 111  # 1 degree is roughly 111km
            
            if distance_km < location_threshold:
                location_match = True
                break
        
        if not location_match:
            risk_factors.append("location_anomaly")
            risk_score += weights.get("location_anomaly", 25)
        
        # Apply additional risk checks...
        # (Merchant category, device, velocity, etc. checks would go here)
        
        # Cap at 100
        risk_score = min(100, risk_score)
        
        # Format risk assessment
        risk_assessment = {
            "riskScore": risk_score,
            "riskFactors": risk_factors,
            "evaluatedWith": {
                "modelId": self.current_model.get("modelId", "unknown"),
                "modelVersion": self.current_model.get("version", 0)
            }
        }
        
        # Record model usage for performance tracking
        self._record_model_usage(transaction["customerId"], risk_assessment, transaction["_id"])
        
        return risk_assessment
    
    def _get_risk_factor_threshold(self, factor_id: str, field: str = "threshold") -> float:
        """Get the threshold for a specific risk factor from the current model."""
        if not self.current_model:
            return self._get_default_threshold(factor_id)
        
        for factor in self.current_model.get("riskFactors", []):
            if factor.get("id") == factor_id and factor.get("active", True):
                return factor.get(field, self._get_default_threshold(factor_id))
        
        return self._get_default_threshold(factor_id)
    
    def _get_default_threshold(self, factor_id: str) -> float:
        """Return default thresholds for risk factors."""
        defaults = {
            "amount_anomaly_high": 3.0,
            "amount_anomaly_medium": 2.0,
            "location_anomaly": 100.0,  # km
            "velocity_anomaly": 5  # transactions
        }
        return defaults.get(factor_id, 1.0)
    
    async def _record_model_usage(self, customer_id: str, 
                                 risk_assessment: Dict[str, Any], 
                                 transaction_id: Any) -> None:
        """Record model usage for performance tracking."""
        try:
            performance_record = {
                "modelId": self.current_model.get("modelId"),
                "modelVersion": self.current_model.get("version"),
                "customerId": customer_id,
                "transactionId": str(transaction_id),
                "riskScore": risk_assessment["riskScore"],
                "riskFactors": risk_assessment["riskFactors"],
                "timestamp": datetime.now(),
                "outcome": None  # To be updated later with true outcome (fraud/not fraud)
            }
            
            await self.db.model_performance.insert_one(performance_record)
        except Exception as e:
            logger.error(f"Error recording model usage: {str(e)}")
    
    def _create_default_model(self) -> Dict[str, Any]:
        """Create a default risk model if none exists."""
        return {
            "modelId": "default-risk-model-v1",
            "version": 1,
            "status": "active",
            "createdAt": datetime.now(),
            "updatedAt": datetime.now(),
            "description": "Default risk scoring model",
            "thresholds": {
                "flag": 60,
                "block": 85
            },
            "weights": {
                "amount_anomaly_high": 30,
                "amount_anomaly_medium": 15,
                "location_anomaly": 25,
                "merchant_category_anomaly": 10,
                "unknown_device": 35,
                "velocity_anomaly": 20,
                "time_of_day_anomaly": 15
            },
            "riskFactors": [
                {
                    "id": "amount_anomaly_high",
                    "description": "Transaction amount significantly higher than customer average",
                    "threshold": 3.0,
                    "active": True
                },
                {
                    "id": "amount_anomaly_medium",
                    "description": "Transaction amount moderately higher than customer average",
                    "threshold": 2.0,
                    "active": True
                },
                {
                    "id": "location_anomaly",
                    "description": "Transaction from unusual location",
                    "distanceThreshold": 100,  # km
                    "active": True
                },
                {
                    "id": "merchant_category_anomaly",
                    "description": "Transaction in unusual merchant category",
                    "active": True
                },
                {
                    "id": "unknown_device",
                    "description": "Transaction from unknown device",
                    "active": True
                },
                {
                    "id": "velocity_anomaly",
                    "description": "Multiple transactions in short timeframe",
                    "threshold": 5,  # transactions per hour
                    "active": True
                }
            ],
            "performance": {
                "falsePositiveRate": None,
                "falseNegativeRate": None,
                "avgProcessingTime": None
            }
        }
    
    def _default_risk_evaluation(self, transaction: Dict[str, Any]) -> Dict[str, Any]:
        """Fallback risk evaluation when no model is available."""
        return {
            "riskScore": 50,  # Default middle score
            "riskFactors": [],
            "evaluatedWith": {
                "modelId": "default-fallback",
                "modelVersion": 0
            }
        }