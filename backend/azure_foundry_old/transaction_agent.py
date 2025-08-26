"""
================================================================================
<<<<<<< Updated upstream
REFACTORED TRANSACTION MONITORING SYSTEM WITH BEHAVIORAL ANOMALY DETECTION
ThreatSight360 FRAML Platform 

Database: fsi-threatsight360
Model: Behavioral Anomaly Detection (Customer-Specific)
Features: 3-stage progressive investigation with ML scoring

Key Updates:
- Customer-specific behavioral anomaly detection
- Integration with Databricks transaction_behavioral_anomaly_model
- Personalized risk assessment based on customer patterns
- MongoDB vector search for similarity analysis
=======
SIMPLIFIED MULTI-STAGE TRANSACTION MONITORING SYSTEM
ThreatSight AML Platform - Complete Implementation with MongoDB Atlas Vector Search

This implementation demonstrates:
- Multi-stage progressive investigation
- Azure AI Foundry orchestration and embeddings
- Databricks ML integration (ready to activate)
- Memorizz memory management (CORRECTED IMPLEMENTATION)
- MongoDB Atlas Vector Search (NO MANUAL COSINE SIMILARITY)
- Customer-specific and global pattern matching

Key Features:
- 3-stage progressive investigation
- MongoDB Atlas native vector similarity search
- Azure text embeddings for new transactions
- Databricks ML scoring (commented but complete)
- Clear decision branching with explanations

MEMORIZZ FIXES APPLIED:
- Using MemAgent instead of MemorizzClient
- Correct import paths from memorizz library
- Memory operations through agent instance
>>>>>>> Stashed changes
================================================================================
"""

import asyncio
import json
import numpy as np
from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta
from dataclasses import dataclass, asdict, field
from enum import Enum
import logging
from collections import defaultdict
import os
from dotenv import load_dotenv

load_dotenv()

# =====================================
# AZURE AI FOUNDRY IMPORTS
<<<<<<< Updated upstream
# =====================================
=======
# These provide orchestration and AI capabilities
# =====================================
<<<<<<< HEAD:Agentic Docs/transaction agent.py
from azure.ai.ml import MLClient
from azure.ai.ml.entities import (
    OnlineEndpoint,
    OnlineDeployment,
    ManagedOnlineEndpoint,
    ManagedOnlineDeployment,
    Model,
    Environment,
    CodeConfiguration,
    AmlCompute
)
from azure.identity import DefaultAzureCredential
from azure.core.credentials import AzureKeyCredential

# Azure AI Services for embeddings (KEEP)
from azure.ai.textanalytics import TextAnalyticsClient
from azure.ai.language.questionanswering import QuestionAnsweringClient
from azure.ai.openai import AzureOpenAIClient
=======
>>>>>>> Stashed changes
# from azure.ai.ml import MLClient
# from azure.ai.ml.entities import (
#     ManagedOnlineEndpoint,
#     ManagedOnlineDeployment,
#     Model,
#     Environment,
#     CodeConfiguration
# )
from azure.identity import DefaultAzureCredential
from azure.ai.agents import AgentsClient
from azure_foundry.embeddings import get_embedding
<<<<<<< Updated upstream

# =====================================
# DATABRICKS IMPORTS (via Azure ML)
# =====================================
=======
>>>>>>> 39958064063354271e054884b0e7095dbbebd12e:backend/azure_foundry/transaction_agent.py

# =====================================
# MEMORIZZ IMPORTS - CORRECTED
# Memory and learning capabilities
# =====================================
<<<<<<< HEAD:Agentic Docs/transaction agent.py
from memorizz.memagent import MemAgent
from memorizz.memory_provider.mongodb.provider import MongoDBConfig, MongoDBProvider
from memorizz.llms.openai import OpenAI as MemorizzOpenAI
from memorizz.persona import Persona
=======
>>>>>>> Stashed changes
import mlflow
from mlflow.tracking import MlflowClient

# =====================================
# MEMORIZZ IMPORTS
# =====================================
try:
    from memorizz.memory_provider.mongodb.provider import MongoDBConfig, MongoDBProvider
    from memorizz.memagent import MemAgent
    from memorizz.llms.openai import OpenAI

    # from memorizz.memory_provider.mongodb.provider import MongoDBConfig, MongoDBProvider
    # from memorizz.memagent import MemAgent
    # from memorizz.llms.openai import OpenAI as MemorizzOpenAI
    from memorizz.long_term_memory.semantic.persona import Persona, RoleType
    MEMORIZZ_AVAILABLE = True
except ImportError:
    MEMORIZZ_AVAILABLE = False
    logger = logging.getLogger(__name__)
    logger.warning("Memorizz not available, using fallback memory system")
<<<<<<< Updated upstream

# =====================================
# MONGODB IMPORTS
=======
>>>>>>> 39958064063354271e054884b0e7095dbbebd12e:backend/azure_foundry/transaction_agent.py

# =====================================
# MONGODB IMPORTS
# Direct database access and vector search
>>>>>>> Stashed changes
# =====================================
import motor.motor_asyncio
from pymongo import MongoClient, ASCENDING, DESCENDING, TEXT
from bson import ObjectId
import pymongo

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


# =============================================================================
# SECTION 1: CORE DATA STRUCTURES
# =============================================================================

@dataclass
class Transaction:
    """
    Represents a financial transaction to monitor.
<<<<<<< Updated upstream
    Matches the ThreatSight360 schema from MongoDB.
=======
    Matches the ThreatSight schema from MongoDB.
>>>>>>> Stashed changes
    """
    transaction_id: str
    customer_id: str
    timestamp: datetime
    amount: float
    currency: str
    merchant: Dict[str, Any]  # name, category, id
    location: Dict[str, Any]  # city, state, country, coordinates
    device_info: Dict[str, Any]  # device_id, type, os, browser, ip
    transaction_type: str
    payment_method: str
    vector_embedding: List[float]  # Will be generated if not present

@dataclass
class Customer:
<<<<<<< Updated upstream
    """Customer profile from ThreatSight360 database."""
=======
    """Customer profile from ThreatSight database."""
>>>>>>> Stashed changes
    customer_id: str
    risk_score: float
    avg_transaction_amount: float
    std_transaction_amount: float
    common_merchant_categories: List[str]
<<<<<<< Updated upstream
    usual_locations: List[str]  # Customer's typical transaction countries
    known_devices: List[str]  # Customer's known device IDs
=======
>>>>>>> Stashed changes
    credit_score: int
    account_status: str

@dataclass
class VectorSearchResult:
    """
<<<<<<< Updated upstream
    Result from vector similarity search.
    Contains matched transaction and similarity score.
    """
    transaction_id: str
    similarity_score: float  # 0-1, higher is more similar
    transaction_data: Dict[str, Any]
    is_fraud: bool  # Was this transaction fraudulent?
    pattern_type: Optional[str] = None  # What pattern it represents
=======
    Result from MongoDB Atlas vector similarity search.
    Contains matched transaction and Atlas-calculated similarity score.
    """
    transaction_id: str
    similarity_score: float  # 0-1, calculated by MongoDB Atlas
    transaction_data: Dict[str, Any]
    is_fraud: bool  # Was this transaction fraudulent?
    pattern_type: Optional[str] = None  # What pattern it represents
    search_score: float = 0.0  # Raw score from Atlas vector search
>>>>>>> Stashed changes

@dataclass
class StageResult:
    """Result from each investigation stage."""
    stage_number: int
    risk_score: float
    confidence: float
    patterns_detected: List[str]
<<<<<<< Updated upstream
    similar_transactions: List[VectorSearchResult]
=======
    similar_transactions: List[VectorSearchResult]  # Similar past transactions found
>>>>>>> Stashed changes
    should_continue: bool
    processing_time: float
    checks_performed: List[str]

@dataclass
class DatabricksMLScore:
    """
<<<<<<< Updated upstream
    Result from Databricks Behavioral Anomaly ML model.
=======
    Result from Databricks ML model scoring.
    This structure holds ML model predictions.
>>>>>>> Stashed changes
    """
    model_version: str
    risk_score: float  # 0-100
    fraud_probability: float  # 0-1
    feature_importance: Dict[str, float]
    explanation: str
    confidence: float

@dataclass
class MonitoringDecision:
    """Final decision from the monitoring system."""
    transaction_id: str
    final_score: float
    confidence: float
    risk_level: str
    decision: str
    stages_completed: int
    patterns: List[str]
<<<<<<< Updated upstream
    similar_transactions_found: int
    ml_score: Optional[float]
=======
    similar_transactions_found: int  # How many similar transactions we found
    ml_score: Optional[float]  # From Databricks if available
>>>>>>> Stashed changes
    explanation: str
    processing_time: float
    timestamp: datetime

# =============================================================================
# SECTION 2: ENUMS
# =============================================================================

class RiskLevel(Enum):
    """Risk levels for transactions"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class Decision(Enum):
    """Possible decisions for a transaction"""
    AUTO_APPROVE = "auto_approve"
    APPROVE_WITH_MONITORING = "approve_with_monitoring"
    INVESTIGATE = "investigate"
    ESCALATE = "escalate"
    BLOCK = "block"
    GENERATE_SAR = "generate_sar"

class PatternType(Enum):
    """Core AML patterns we detect"""
    STRUCTURING = "structuring"
<<<<<<< Updated upstream
    UNUSUAL_MERCHANT = "unusual_merchant"  # Changed from HIGH_RISK_MERCHANT
    UNUSUAL_AMOUNT = "unusual_amount"
    UNUSUAL_LOCATION = "unusual_location"  # Changed from GEOGRAPHIC_RISK
    SIMILAR_TO_FRAUD = "similar_to_fraud"
    VELOCITY_SPIKE = "velocity_spike"
    UNKNOWN_DEVICE = "unknown_device"  # New pattern
    BEHAVIORAL_ANOMALY = "behavioral_anomaly"  # New pattern

# =============================================================================
# SECTION 3: DATABRICKS BEHAVIORAL ANOMALY ML INTEGRATION
# =============================================================================

class DatabricksMLScoring:
    """
    Integrates Databricks Behavioral Anomaly ML model through Azure ML.
=======
    HIGH_RISK_MERCHANT = "high_risk_merchant"
    UNUSUAL_AMOUNT = "unusual_amount"
    GEOGRAPHIC_RISK = "geographic_risk"
    SIMILAR_TO_FRAUD = "similar_to_fraud"  # Found via vector search
    VELOCITY_SPIKE = "velocity_spike"

# =============================================================================
# SECTION 3: DATABRICKS ML INTEGRATION
# =============================================================================

class AzureMLScoring:
    """
    Pure Azure ML model scoring implementation.
    Models are deployed to Azure ML managed online endpoints.
>>>>>>> Stashed changes
    """
    
    def __init__(
        self,
<<<<<<< Updated upstream
        project_endpoint: str,
        databricks_workspace_url: str,
        model_name: str = "transaction_behavioral_anomaly_model"
    ):
        """
        Initialize Databricks ML scoring for behavioral anomaly detection.
        """
        # Initialize Azure ML client
=======
<<<<<<< HEAD:Agentic Docs/transaction agent.py
        workspace_name: str,
        resource_group: str,
        subscription_id: str,
        model_name: str = "transaction_risk_model",
        endpoint_name: Optional[str] = None
=======
        project_endpoint: str,
        databricks_workspace_url: str,
        model_name: str = "transaction_behavioral_anomaly_model"
>>>>>>> 39958064063354271e054884b0e7095dbbebd12e:backend/azure_foundry/transaction_agent.py
    ):
        """
        Initialize Azure ML scoring with managed online endpoints.
        
        Args:
            workspace_name: Azure ML workspace name
            resource_group: Azure resource group
            subscription_id: Azure subscription ID
            model_name: Name of the model in Azure ML registry
            endpoint_name: Name of the online endpoint (auto-generated if not provided)
        """
        # Initialize Azure ML client only
>>>>>>> Stashed changes
        self.credential = DefaultAzureCredential()
        
        self.agents_client = AgentsClient(
            endpoint=project_endpoint, 
            credential=self.credential
        )
        
<<<<<<< Updated upstream
        # Initialize MLflow for Databricks
        mlflow.set_tracking_uri(databricks_workspace_url)
        self.mlflow_client = MlflowClient()
        
        # Model configuration
        self.model_name = model_name
        self.endpoint_name = "transaction-anomaly-endpoint"
        self.deployment_name = "blue"
        
        # Encoding mappings for categorical features
        self.merchant_encodings = {
            'grocery': 0, 'entertainment': 1, 'travel': 2, 
            'gas': 3, 'restaurant': 4, 'retail': 5,
            'healthcare': 6, 'education': 7, 'other': 8
        }
        
        self.payment_encodings = {
            'credit_card': 0, 'debit_card': 1, 
            'wire_transfer': 2, 'wire': 2,  # alias
            'crypto': 3, 'cash': 4
        }
        
        self.device_encodings = {
            'mobile': 0, 'desktop': 1, 'tablet': 2, 'other': 3
        }
        
        self.tx_type_encodings = {
            'purchase': 0, 'transfer': 1, 
            'withdrawal': 2, 'deposit': 3, 'other': 4
        }
        
        logger.info(f"Databricks Behavioral Anomaly ML initialized: {model_name}")
=======
        # Model and endpoint configuration
        self.model_name = model_name
        self.endpoint_name = endpoint_name or f"{model_name}-endpoint"
        self.deployment_name = "blue"  # Azure ML uses blue/green deployments
        
        # Cache endpoint URL after first retrieval
        self._endpoint_url = None
        self._scoring_uri = None
        
        logger.info(f"Azure ML scoring initialized for model: {model_name}")
    
    async def ensure_endpoint_deployed(self) -> str:
        """
        Ensure the model endpoint is deployed and return the scoring URI.
        For demo purposes, this creates the endpoint if it doesn't exist.
        """
        try:
            # Check if endpoint exists
            endpoint = self.ml_client.online_endpoints.get(name=self.endpoint_name)
            self._scoring_uri = endpoint.scoring_uri
            logger.info(f"Using existing endpoint: {self.endpoint_name}")
            return self._scoring_uri
            
        except Exception:
            # For demo: Create endpoint if it doesn't exist
            logger.info(f"Creating new endpoint: {self.endpoint_name}")
            
            # Create managed online endpoint
            endpoint = ManagedOnlineEndpoint(
                name=self.endpoint_name,
                description=f"Endpoint for {self.model_name}",
                auth_mode="key"  # Use key auth for demo simplicity
            )
            
            self.ml_client.online_endpoints.begin_create_or_update(endpoint).result()
            
            # Get the latest model version from Azure ML registry
            latest_model = self._get_latest_model_version()
            
            # Create deployment
            deployment = ManagedOnlineDeployment(
                name=self.deployment_name,
                endpoint_name=self.endpoint_name,
                model=latest_model,
                instance_type="Standard_DS2_v2",  # Small instance for demo
                instance_count=1,
                request_settings={
                    "request_timeout_ms": 60000,
                    "max_concurrent_requests_per_instance": 2
                }
            )
            
            self.ml_client.online_deployments.begin_create_or_update(deployment).result()
            
            # Set traffic to 100% for the deployment
            endpoint.traffic = {self.deployment_name: 100}
            self.ml_client.online_endpoints.begin_create_or_update(endpoint).result()
            
            # Get scoring URI
            endpoint = self.ml_client.online_endpoints.get(name=self.endpoint_name)
            self._scoring_uri = endpoint.scoring_uri
            
            logger.info(f"Endpoint created successfully: {self._scoring_uri}")
            return self._scoring_uri
>>>>>>> Stashed changes
    
    async def score_transaction(
        self,
        transaction: Transaction,
        customer: Customer,
        similar_transactions: List[VectorSearchResult]
<<<<<<< Updated upstream
    ) -> DatabricksMLScore:
        """
        Score a transaction using Behavioral Anomaly ML model.
        """
        try:
            # Prepare features for behavioral anomaly model
            features = self._prepare_behavioral_features(
                transaction, customer, similar_transactions
            )
            
            # Prepare request data
            request_data = {"data": [features]}
            
            # Call Azure ML endpoint
            response = self.ml_client.online_endpoints.invoke(
                endpoint_name=self.endpoint_name,
                deployment_name=self.deployment_name,
                request_body=json.dumps(request_data)
            )
            
            # Parse response
            result = json.loads(response)
            if isinstance(result, list):
                result = result[0]
            
            # Extract results
            risk_score = float(result.get('risk_score', 50))
            fraud_probability = float(result.get('fraud_probability', 0.5))
            
            # Generate behavioral anomaly explanation
            explanation = self._generate_behavioral_explanation(
                transaction, customer, features, result
            )
            
            # Calculate confidence
            confidence = self._calculate_behavioral_confidence(
                features, similar_transactions
            )
            
            return DatabricksMLScore(
                model_version=result.get('model_version', 'behavioral_anomaly_v1.0'),
                risk_score=risk_score,
                fraud_probability=fraud_probability,
                feature_importance=self._get_feature_importance(),
                explanation=explanation,
                confidence=confidence
            )
            
        except Exception as e:
            logger.error(f"Databricks ML scoring failed: {e}")
            return self._get_fallback_score()
    
    def _prepare_behavioral_features(
=======
    ) -> DatabricksMLScore:  # Keep the same return type for compatibility
        """
        Score a transaction using Azure ML managed online endpoint.
        
        Args:
            transaction: Transaction to score
            customer: Customer profile
            similar_transactions: Similar transactions from vector search
            
        Returns:
            ML scoring result
        """
        # Ensure endpoint is deployed
        if not self._scoring_uri:
            self._scoring_uri = await self.ensure_endpoint_deployed()
        
        # Prepare features
        features = self._prepare_features(transaction, customer, similar_transactions)
        
        # Prepare request payload
        payload = {
            "data": [features]  # Azure ML expects data in this format
        }
        
        try:
            # Get endpoint key for authentication
            keys = self.ml_client.online_endpoints.get_keys(name=self.endpoint_name)
            
            # Make scoring request
            async with aiohttp.ClientSession() as session:
                headers = {
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {keys.primary_key}",
                    "azureml-model-deployment": self.deployment_name
                }
                
                async with session.post(
                    self._scoring_uri,
                    json=payload,
                    headers=headers
                ) as response:
                    if response.status == 200:
                        result = await response.json()
                        
                        # Parse Azure ML response
                        predictions = result.get("predictions", [{}])[0]
                        risk_score = float(predictions.get("risk_score", 50))
                        fraud_probability = float(predictions.get("fraud_probability", 0.5))
                        
                        return DatabricksMLScore(
                            model_version=self._get_model_version_string(),
                            risk_score=risk_score,
                            fraud_probability=fraud_probability,
                            feature_importance=predictions.get("feature_importance", {}),
                            explanation=self._generate_ml_explanation(
                                risk_score, fraud_probability, 
                                predictions.get("feature_importance", {})
                            ),
                            confidence=self._calculate_ml_confidence(
                                features, similar_transactions
                            )
                        )
                    else:
                        error_text = await response.text()
                        logger.error(f"Scoring failed: {response.status} - {error_text}")
                        return self._get_fallback_score()
                        
        except Exception as e:
            logger.error(f"Azure ML scoring failed: {e}")
            return self._get_fallback_score()
    
    def _get_latest_model_version(self) -> str:
        """Get the latest model version from Azure ML registry."""
        try:
            # List all versions of the model
            models = self.ml_client.models.list(name=self.model_name)
            latest_model = max(models, key=lambda x: int(x.version))
            return f"{self.model_name}:{latest_model.version}"
        except Exception:
            # For demo, return version 1 if no models exist
            return f"{self.model_name}:1"
    
    def _get_model_version_string(self) -> str:
        """Get model version string for response."""
        try:
            models = self.ml_client.models.list(name=self.model_name)
            latest_model = max(models, key=lambda x: int(x.version))
            return f"v{latest_model.version}"
        except:
            return "v1"
    
    def _prepare_features(
>>>>>>> Stashed changes
        self,
        transaction: Transaction,
        customer: Customer,
        similar_transactions: List[VectorSearchResult]
    ) -> Dict[str, Any]:
        """
<<<<<<< Updated upstream
        Prepare exactly 17 features for behavioral anomaly model.
        """
        # Calculate amount-based features
        amount_zscore = self._calculate_zscore(
            transaction.amount,
            customer.avg_transaction_amount,
            customer.std_transaction_amount
        )
        
        # Behavioral features
        is_typical_merchant = 1 if transaction.merchant.get('category', '').lower() in [
            cat.lower() for cat in customer.common_merchant_categories
        ] else 0
        
        is_known_device = 1 if transaction.device_info.get('device_id') in customer.known_devices else 0
        
        is_typical_location = 1 if transaction.location.get('country') in customer.usual_locations else 0
        
        # Encode categorical features
        merchant_category = transaction.merchant.get('category', 'other').lower()
        merchant_encoded = self.merchant_encodings.get(
            merchant_category, 
            self.merchant_encodings['other']
        )
        
        payment_method = transaction.payment_method.lower()
        payment_encoded = self.payment_encodings.get(
            payment_method,
            self.payment_encodings.get('cash', 4)
        )
        
        device_type = transaction.device_info.get('type', 'other').lower()
        device_encoded = self.device_encodings.get(
            device_type,
            self.device_encodings['other']
        )
        
        tx_type = transaction.transaction_type.lower()
        tx_type_encoded = self.tx_type_encodings.get(
            tx_type,
            self.tx_type_encodings['other']
        )
        
        # Build feature dictionary (17 features)
        features = {
            # Amount features (5)
            'amount': float(transaction.amount),
            'amount_zscore': float(amount_zscore),
            'amount_deviation': float(abs(amount_zscore)),
            'is_round_amount': 1 if transaction.amount % 100 == 0 else 0,
            'is_large_amount': 1 if transaction.amount > customer.avg_transaction_amount * 3 else 0,
            
            # Behavioral anomaly features (3)
            'is_typical_merchant': is_typical_merchant,
            'is_known_device': is_known_device,
            'is_typical_location': is_typical_location,
            
            # Customer profile features (4)
            'customer_risk_normalized': float(customer.risk_score / 100),
            'credit_score_normalized': float(customer.credit_score / 850),
            'avg_transaction_amount': float(customer.avg_transaction_amount),
            'std_transaction_amount': float(customer.std_transaction_amount),
            
            # Encoded categorical features (4)
            'merchant_category_encoded': merchant_encoded,
            'payment_method_encoded': payment_encoded,
            'device_type_encoded': device_encoded,
            'transaction_type_encoded': tx_type_encoded
=======
        Prepare features for ML model (unchanged from original).
        """
        features = {
            # Transaction features
            'amount': transaction.amount,
            'amount_zscore': self._calculate_zscore(
                transaction.amount,
                customer.avg_transaction_amount,
                customer.std_transaction_amount
            ),
            
            # Customer features
            'customer_risk_score': customer.risk_score,
            'credit_score': customer.credit_score,
            
            # Similarity features from vector search
            'max_similarity_score': max(
                [r.similarity_score for r in similar_transactions],
                default=0
            ),
            'fraud_neighbor_count': sum(
                1 for r in similar_transactions if r.is_fraud
            ),
            'avg_neighbor_similarity': np.mean(
                [r.similarity_score for r in similar_transactions]
            ) if similar_transactions else 0,
            
            # Merchant features
            'is_high_risk_merchant': transaction.merchant['category'] in [
                'cryptocurrency', 'gambling', 'money_transfer'
            ],
            
            # Temporal features
            'hour': transaction.timestamp.hour,
            'day_of_week': transaction.timestamp.weekday(),
>>>>>>> Stashed changes
        }
        
        return features
    
<<<<<<< Updated upstream
    def _generate_behavioral_explanation(
        self,
        transaction: Transaction,
        customer: Customer,
        features: Dict[str, Any],
        result: Dict
    ) -> str:
        """Generate explanation focused on behavioral anomalies."""
        anomalies = []
        
        if features['is_typical_merchant'] == 0:
            anomalies.append(f"Unusual merchant category '{transaction.merchant.get('category')}' for this customer")
        
        if features['is_known_device'] == 0:
            anomalies.append("Transaction from unknown device")
        
        if features['is_typical_location'] == 0:
            anomalies.append(f"Unusual location '{transaction.location.get('country')}'")
        
        if features['amount_deviation'] > 2:
            anomalies.append(f"Amount ${transaction.amount:.2f} is {features['amount_deviation']:.1f}σ from normal")
        
        if features['is_large_amount'] == 1:
            anomalies.append("Unusually large amount for customer")
        
        # Build explanation
        if anomalies:
            base_explanation = f"Behavioral anomalies: {'; '.join(anomalies)}. "
        else:
            base_explanation = "Transaction matches customer's typical behavior. "
        
        # Add risk assessment
        risk_score = result.get('risk_score', 50)
        if risk_score > 70:
            base_explanation += "HIGH RISK - Multiple behavioral deviations."
        elif risk_score > 40:
            base_explanation += "MODERATE RISK - Some irregularities detected."
        else:
            base_explanation += "LOW RISK - Consistent with profile."
        
        return base_explanation
    
    def _calculate_behavioral_confidence(
        self,
        features: Dict,
        similar_transactions: List[VectorSearchResult]
    ) -> float:
        """Calculate confidence based on behavioral patterns."""
        confidence = 0.5
        
        # More historical data = higher confidence
        if len(similar_transactions) > 20:
            confidence += 0.2
        elif len(similar_transactions) > 10:
            confidence += 0.1
        
        # Clear behavioral signals = higher confidence
        behavioral_signals = [
            features['is_typical_merchant'],
            features['is_known_device'],
            features['is_typical_location']
        ]
        
        if all(s == 1 for s in behavioral_signals):
            confidence += 0.2  # Clearly normal
        elif all(s == 0 for s in behavioral_signals):
            confidence += 0.2  # Clearly anomalous
        
        if features['amount_deviation'] > 3:
            confidence += 0.1
        
        return min(0.95, confidence)
    
    def _get_feature_importance(self) -> Dict[str, float]:
        """Return feature importance from trained model."""
        return {
            'amount_deviation': 0.18,
            'is_typical_merchant': 0.16,
            'is_known_device': 0.14,
            'is_typical_location': 0.12,
            'amount_zscore': 0.10,
            'customer_risk_normalized': 0.08,
            'is_large_amount': 0.06,
            'credit_score_normalized': 0.05,
            'other_features': 0.11
        }
    
=======
>>>>>>> Stashed changes
    def _calculate_zscore(self, value: float, mean: float, std: float) -> float:
        """Calculate z-score for normalization."""
        if std == 0:
            return 0
        return (value - mean) / std
    
<<<<<<< Updated upstream
=======
    def _generate_ml_explanation(
        self,
        risk_score: float,
        fraud_prob: float,
        features: Dict
    ) -> str:
        """Generate human-readable explanation from ML results."""
        explanation = f"ML Risk Score: {risk_score:.1f}, Fraud Probability: {fraud_prob:.2%}. "
        
        if features:
            top_features = sorted(
                features.items(),
                key=lambda x: abs(x[1]),
                reverse=True
            )[:3]
            explanation += f"Key factors: {', '.join(f[0] for f in top_features)}."
        
        return explanation
    
    def _calculate_ml_confidence(
        self,
        features: Dict,
        similar_transactions: List[VectorSearchResult]
    ) -> float:
        """Calculate confidence in ML prediction."""
        confidence = 0.5
        
        if len(similar_transactions) > 10:
            confidence += 0.2
        elif len(similar_transactions) > 5:
            confidence += 0.1
        
        if similar_transactions:
            avg_similarity = np.mean([r.similarity_score for r in similar_transactions])
            if avg_similarity > 0.9:
                confidence += 0.2
            elif avg_similarity > 0.8:
                confidence += 0.1
        
        return min(0.95, confidence)
    
>>>>>>> Stashed changes
    def _get_fallback_score(self) -> DatabricksMLScore:
        """Fallback score when ML is unavailable."""
        return DatabricksMLScore(
            model_version="fallback",
            risk_score=50.0,
            fraud_probability=0.5,
<<<<<<< Updated upstream
            feature_importance=self._get_feature_importance(),
            explanation="ML unavailable, using rule-based assessment",
=======
            feature_importance={},
            explanation="ML scoring unavailable, using fallback",
>>>>>>> Stashed changes
            confidence=0.3
        )

# =============================================================================
# SECTION 4: AZURE EMBEDDING SERVICE
# =============================================================================

class AzureEmbeddingService:
    """
<<<<<<< Updated upstream
    Generate text embeddings using Azure OpenAI.
    """    
=======
<<<<<<< HEAD:Agentic Docs/transaction agent.py
    Generate text embeddings using Azure AI Services.
    
    This creates vector representations of transactions
    for similarity search.
    """
    
    def __init__(
        self,
        endpoint: str,
        api_key: str,
        deployment_name: str = "text-embedding-ada-002"
    ):
        """
        Initialize Azure OpenAI embedding service.
        
        Args:
            endpoint: Azure OpenAI endpoint
            api_key: API key for authentication
            deployment_name: Name of the embedding model deployment
        """
        self.client = AzureOpenAIClient(
            endpoint=endpoint,
            credential=AzureKeyCredential(api_key)
        )
        self.deployment_name = deployment_name
        
        logger.info(f"Azure Embedding Service initialized with deployment: {deployment_name}")
    
    async def generate_embedding(self, text: str) -> List[float]:
        """
        Generate embedding for text.
        
        Args:
            text: Text to embed
            
        Returns:
            Embedding vector (1536 dimensions for ada-002)
        """
        try:
            response = await self.client.embeddings.create(
                input=text,
                model=self.deployment_name
            )
            return response.data[0].embedding
        except Exception as e:
            logger.error(f"Embedding generation failed: {e}")
            # Return random embedding as fallback (for demo)
            return [np.random.random() for _ in range(1536)]
    
=======
    Generate text embeddings using Azure OpenAI.
    """    
>>>>>>> 39958064063354271e054884b0e7095dbbebd12e:backend/azure_foundry/transaction_agent.py
>>>>>>> Stashed changes
    async def generate_transaction_embedding(
        self,
        transaction: Transaction
    ) -> List[float]:
<<<<<<< Updated upstream
        """Generate embedding for a transaction."""
        text = self._transaction_to_text(transaction)
        return await get_embedding(text)
    
    def _transaction_to_text(self, transaction: Transaction) -> str:
        """Convert transaction to text for embedding."""
=======
        """
        Generate embedding specifically for a transaction.
        
        Creates a text representation of the transaction
        and generates its embedding.
        """
        # Create text representation of transaction
        text = self._transaction_to_text(transaction)
<<<<<<< HEAD:Agentic Docs/transaction agent.py
        
        # Generate embedding
        embedding = await self.generate_embedding(text)
        
        return embedding
=======
        return await get_embedding(text)
>>>>>>> 39958064063354271e054884b0e7095dbbebd12e:backend/azure_foundry/transaction_agent.py
    
    def _transaction_to_text(self, transaction: Transaction) -> str:
        """
        Convert transaction to text for embedding.
        
        This creates a rich text representation that captures
        all important aspects of the transaction.
        """
>>>>>>> Stashed changes
        text = (
            f"Transaction amount {transaction.amount} {transaction.currency} "
            f"from customer {transaction.customer_id} "
            f"to merchant {transaction.merchant['name']} "
            f"category {transaction.merchant['category']} "
            f"location {transaction.location['city']} {transaction.location['country']} "
            f"payment method {transaction.payment_method} "
            f"transaction type {transaction.transaction_type} "
            f"device {transaction.device_info['type']} "
            f"timestamp {transaction.timestamp.isoformat()}"
        )
        return text

# =============================================================================
<<<<<<< Updated upstream
# SECTION 5: VECTOR SEARCH ENGINE
# =============================================================================

class VectorSearchEngine:
    """
    Performs vector similarity search in MongoDB.
    """
    
    def __init__(self, db: motor.motor_asyncio.AsyncIOMotorDatabase):
        """Initialize vector search engine."""
        self.db = db
        self.transactions_collection = db['transactions']
        
        logger.info("Vector Search Engine initialized")
=======
# SECTION 5: MONGODB ATLAS VECTOR SEARCH ENGINE
# =============================================================================

class AtlasVectorSearchEngine:
    """
    Performs vector similarity search using MongoDB Atlas Vector Search.
    
    This uses Atlas's native vector search capabilities instead of
    calculating cosine similarity manually.
    """
    
    def __init__(
        self,
        db: motor.motor_asyncio.AsyncIOMotorDatabase,
        vector_index_name: str = "vector_index"
    ):
        """
        Initialize Atlas vector search engine.
        
        Args:
            db: MongoDB database connection
            vector_index_name: Name of the vector search index in Atlas
        """
        self.db = db
        self.transactions_collection = db['transactions']
        self.vector_index_name = vector_index_name
        
        logger.info(f"Atlas Vector Search Engine initialized with index: {vector_index_name}")
>>>>>>> Stashed changes
    
    async def search_customer_transactions(
        self,
        customer_id: str,
        query_embedding: List[float],
        limit: int = 10,
        exclude_transaction_id: Optional[str] = None
    ) -> List[VectorSearchResult]:
<<<<<<< Updated upstream
        """Search similar transactions for a specific customer."""
        # Build query
        query = {'customer_id': customer_id}
        if exclude_transaction_id:
            if len(exclude_transaction_id) == 24:
                query['_id'] = {'$ne': ObjectId(exclude_transaction_id)}
            else:
                query['transaction_id'] = {'$ne': exclude_transaction_id}
        
        # Get customer's transactions
        cursor = self.transactions_collection.find(query).limit(limit * 2)
        transactions = await cursor.to_list(None)
        
        # Calculate similarities
        results = []
        for txn in transactions:
            if 'vector_embedding' in txn and txn['vector_embedding']:
                similarity = self._calculate_cosine_similarity(
                    query_embedding,
                    txn['vector_embedding']
                )
                
                results.append(VectorSearchResult(
                    transaction_id=str(txn.get('_id', txn.get('transaction_id'))),
                    similarity_score=similarity,
                    transaction_data=txn,
                    is_fraud=txn.get('risk_assessment', {}).get('transaction_type') == 'fraud',
                    pattern_type=self._extract_pattern_type(txn)
                ))
        
        # Sort by similarity and return top results
        results.sort(key=lambda x: x.similarity_score, reverse=True)
        return results[:limit]
=======
        """
        Search similar transactions for a specific customer using Atlas Vector Search.
        
        Args:
            customer_id: Customer to search
            query_embedding: Embedding vector to search for
            limit: Maximum results
            exclude_transaction_id: Transaction to exclude (the current one)
            
        Returns:
            List of similar transactions with Atlas-calculated similarity scores
        """
        # Build Atlas vector search pipeline
        pipeline = [
            # Stage 1: Vector search with customer filter
            {
                "$vectorSearch": {
                    "index": self.vector_index_name,
                    "path": "vector_embedding",
                    "queryVector": query_embedding,
                    "numCandidates": limit * 10,  # Cast wider net for filtering
                    "limit": limit * 2,  # Get extra for post-filtering
                    "filter": {
                        "customer_id": customer_id
                    }
                }
            },
            # Stage 2: Add search score
            {
                "$addFields": {
                    "search_score": {"$meta": "vectorSearchScore"}
                }
            },
            # Stage 3: Exclude current transaction if specified
            {
                "$match": {
                    "_id": {"$ne": ObjectId(exclude_transaction_id)} if exclude_transaction_id else {"$exists": True}
                }
            },
            # Stage 4: Sort by similarity score
            {
                "$sort": {"search_score": -1}
            },
            # Stage 5: Limit final results
            {
                "$limit": limit
            }
        ]
        
        try:
            # Execute vector search
            cursor = self.transactions_collection.aggregate(pipeline)
            transactions = await cursor.to_list(None)
            
            # Convert to VectorSearchResult objects
            results = []
            for txn in transactions:
                similarity_score = txn.get('search_score', 0.0)
                
                results.append(VectorSearchResult(
                    transaction_id=str(txn['_id']),
                    similarity_score=similarity_score,  # Atlas-calculated score
                    transaction_data=txn,
                    is_fraud=txn.get('risk_assessment', {}).get('transaction_type') == 'fraud',
                    pattern_type=self._extract_pattern_type(txn),
                    search_score=similarity_score  # Keep raw score for reference
                ))
            
            logger.debug(f"Customer vector search found {len(results)} similar transactions")
            return results
            
        except Exception as e:
            logger.error(f"Atlas vector search failed for customer {customer_id}: {e}")
            # Return empty list on error
            return []
>>>>>>> Stashed changes
    
    async def search_all_transactions(
        self,
        query_embedding: List[float],
        limit: int = 20,
        min_similarity: float = 0.7,
        time_window_days: int = 90
    ) -> List[VectorSearchResult]:
<<<<<<< Updated upstream
        """Search similar transactions across all customers."""
        # Calculate time boundary
        since_date = datetime.now() - timedelta(days=time_window_days)
        
        # MongoDB aggregation pipeline
        pipeline = [
            {
                '$match': {
                    'timestamp': {'$gte': since_date.isoformat()}
                }
            },
            {'$sample': {'size': 1000}},  # Sample for performance
            {
                '$project': {
                    '_id': 1,
                    'transaction_id': 1,
                    'amount': 1,
                    'merchant': 1,
                    'risk_assessment': 1,
                    'vector_embedding': 1,
                    'customer_id': 1,
                    'timestamp': 1,
                    'device_info': 1
                }
            }
        ]
        
        # Execute pipeline
        cursor = self.transactions_collection.aggregate(pipeline)
        transactions = await cursor.to_list(None)
        
        # Calculate similarities
        results = []
        for txn in transactions:
            if 'vector_embedding' in txn and txn['vector_embedding']:
                similarity = self._calculate_cosine_similarity(
                    query_embedding,
                    txn['vector_embedding']
                )
                
                if similarity >= min_similarity:
                    results.append(VectorSearchResult(
                        transaction_id=str(txn.get('_id', txn.get('transaction_id'))),
                        similarity_score=similarity,
                        transaction_data=txn,
                        is_fraud=txn.get('risk_assessment', {}).get('transaction_type') == 'fraud',
                        pattern_type=self._extract_pattern_type(txn)
                    ))
        
        # Sort by similarity
        results.sort(key=lambda x: x.similarity_score, reverse=True)
        return results[:limit]
    
    def _calculate_cosine_similarity(
        self,
        vec1: List[float],
        vec2: List[float]
    ) -> float:
        """Calculate cosine similarity between two vectors."""
        if not vec1 or not vec2 or len(vec1) != len(vec2):
            return 0.0
        
        v1 = np.array(vec1)
        v2 = np.array(vec2)
        
        dot_product = np.dot(v1, v2)
        norm1 = np.linalg.norm(v1)
        norm2 = np.linalg.norm(v2)
        
        if norm1 == 0 or norm2 == 0:
            return 0.0
        
        similarity = dot_product / (norm1 * norm2)
        
        return float(max(0, min(1, similarity)))
    
    def _extract_pattern_type(self, transaction: Dict) -> Optional[str]:
        """Extract pattern type from transaction if labeled."""
=======
        """
        Search similar transactions across all customers using Atlas Vector Search.
        
        This helps identify fraud patterns that span multiple accounts.
        
        Args:
            query_embedding: Embedding vector to search for
            limit: Maximum results
            min_similarity: Minimum similarity threshold
            time_window_days: Only search recent transactions
            
        Returns:
            List of similar transactions from any customer
        """
        # Calculate time boundary
        since_date = datetime.now() - timedelta(days=time_window_days)
        
        # Build Atlas vector search pipeline with time filter
        pipeline = [
            # Stage 1: Vector search with time filter
            {
                "$vectorSearch": {
                    "index": self.vector_index_name,
                    "path": "vector_embedding",
                    "queryVector": query_embedding,
                    "numCandidates": limit * 20,  # Larger candidate pool
                    "limit": limit * 3,  # Get extra for filtering
                    "filter": {
                        "timestamp": {"$gte": since_date.isoformat()}
                    }
                }
            },
            # Stage 2: Add search score
            {
                "$addFields": {
                    "search_score": {"$meta": "vectorSearchScore"}
                }
            },
            # Stage 3: Filter by minimum similarity
            {
                "$match": {
                    "search_score": {"$gte": min_similarity}
                }
            },
            # Stage 4: Add additional fields for analysis
            {
                "$project": {
                    "_id": 1,
                    "amount": 1,
                    "merchant": 1,
                    "risk_assessment": 1,
                    "customer_id": 1,
                    "timestamp": 1,
                    "vector_embedding": 1,
                    "search_score": 1,
                    "location": 1,
                    "device_info": 1
                }
            },
            # Stage 5: Sort by similarity score
            {
                "$sort": {"search_score": -1}
            },
            # Stage 6: Limit final results
            {
                "$limit": limit
            }
        ]
        
        try:
            # Execute vector search
            cursor = self.transactions_collection.aggregate(pipeline)
            transactions = await cursor.to_list(None)
            
            # Convert to VectorSearchResult objects
            results = []
            for txn in transactions:
                similarity_score = txn.get('search_score', 0.0)
                
                results.append(VectorSearchResult(
                    transaction_id=str(txn['_id']),
                    similarity_score=similarity_score,  # Atlas-calculated score
                    transaction_data=txn,
                    is_fraud=txn.get('risk_assessment', {}).get('transaction_type') == 'fraud',
                    pattern_type=self._extract_pattern_type(txn),
                    search_score=similarity_score
                ))
            
            logger.debug(f"Global vector search found {len(results)} similar transactions")
            return results
            
        except Exception as e:
            logger.error(f"Atlas global vector search failed: {e}")
            # Return empty list on error
            return []
    

    
    def _extract_pattern_type(self, transaction: Dict) -> Optional[str]:
        """
        Extract pattern type from transaction if labeled.
        """
>>>>>>> Stashed changes
        risk = transaction.get('risk_assessment', {})
        flags = risk.get('flags', [])
        
        if 'structuring' in flags:
            return PatternType.STRUCTURING.value
<<<<<<< Updated upstream
        elif 'unusual_merchant' in flags:
            return PatternType.UNUSUAL_MERCHANT.value
=======
        elif 'high_risk_merchant' in flags:
            return PatternType.HIGH_RISK_MERCHANT.value
>>>>>>> Stashed changes
        
        return None

# =============================================================================
<<<<<<< Updated upstream
# SECTION 6: MAIN MONITORING SYSTEM
=======
# SECTION 6: MAIN MONITORING SYSTEM 
>>>>>>> Stashed changes
# =============================================================================

class SimplifiedTransactionMonitor:
    """
<<<<<<< Updated upstream
    Multi-stage transaction monitoring system with behavioral anomaly detection.
=======
    Multi-stage transaction monitoring system with MongoDB Atlas Vector Search.
    
    This orchestrates the entire monitoring process including:
    - Progressive investigation stages
    - MongoDB Atlas native vector similarity search
    - ML scoring (when enabled)
    - Memory and learning 
>>>>>>> Stashed changes
    """
    
    def __init__(
        self,
        agent_name: str,
        mongodb_uri: str,
<<<<<<< Updated upstream
        azure_ai_foundry_config: Dict[str, str],
        databricks_config: Optional[Dict[str, str]] = None,
        database_name: str = "fsi-threatsight360"  # Updated database name
    ):
        """Initialize the monitoring system."""
        self.agent_name = agent_name
        self.database_name = database_name
        
        # =====================================
        # Initialize MongoDB
        # =====================================
        logger.info(f"Connecting to MongoDB database: {database_name}...")
        self.mongo_client = motor.motor_asyncio.AsyncIOMotorClient(mongodb_uri)
        self.db = self.mongo_client[database_name]
        
        # Collections
=======
<<<<<<< HEAD:Agentic Docs/transaction agent.py
        azure_ml_config: Dict[str, str],
        database_name: str = "threatsight_aml",
        openai_api_key: Optional[str] = None,
        vector_index_name: str = "vector_index",
        enable_ml_scoring: bool = True  # Simple flag to enable/disable ML
=======
        azure_ai_foundry_config: Dict[str, str],
        databricks_config: Optional[Dict[str, str]] = None,
        database_name: str = "fsi-threatsight360"  # Updated database name
>>>>>>> 39958064063354271e054884b0e7095dbbebd12e:backend/azure_foundry/transaction_agent.py
    ):
        """
        Initialize the monitoring system with Azure ML.
        
        Args:
            agent_name: Unique name for this agent
            mongodb_uri: MongoDB Atlas connection string
            azure_ml_config: Azure ML configuration
            database_name: MongoDB database name
            openai_api_key: OpenAI API key for Memorizz
            vector_index_name: Name of the vector search index in Atlas
            enable_ml_scoring: Whether to enable ML scoring (for demo control)
        """
        self.agent_name = agent_name
        self.database_name = database_name
        
        # Initialize MongoDB Atlas Connection 
        logger.info("Connecting to MongoDB Atlas...")
        self.mongo_client = motor.motor_asyncio.AsyncIOMotorClient(mongodb_uri)
        self.db = self.mongo_client[database_name]
        
        # Collections 
>>>>>>> Stashed changes
        self.customers_collection = self.db['customers']
        self.transactions_collection = self.db['transactions']
        self.decisions_collection = self.db['decisions']
        
<<<<<<< Updated upstream
=======
<<<<<<< HEAD:Agentic Docs/transaction agent.py
        # Initialize Azure ML Client
        logger.info("Initializing Azure ML Client...")
        self.credential = DefaultAzureCredential()
        self.ml_client = MLClient(
            credential=self.credential,
            subscription_id=azure_ml_config['subscription_id'],
            resource_group_name=azure_ml_config['resource_group'],
            workspace_name=azure_ml_config['workspace_name']
        )
        
        # Initialize Embedding Service
        logger.info("Setting up Azure Embedding Service...")
        self.embedding_service = AzureEmbeddingService(
            endpoint=azure_ml_config['openai_endpoint'],
            api_key=azure_ml_config['openai_api_key'],
            deployment_name=azure_ml_config.get('embedding_deployment', 'text-embedding-ada-002')
        )
        
        # Initialize Atlas Vector Search Engine 
        logger.info(f"Initializing MongoDB Atlas Vector Search with index '{vector_index_name}'...")
        self.vector_search = AtlasVectorSearchEngine(self.db, vector_index_name)
        
        # Initialize Azure ML Scoring 
        self.azure_ml = None
        if enable_ml_scoring:
            logger.info("Setting up Azure ML Scoring...")
            self.azure_ml = AzureMLScoring(
                workspace_name=azure_ml_config['workspace_name'],
                resource_group=azure_ml_config['resource_group'],
                subscription_id=azure_ml_config['subscription_id'],
                model_name=azure_ml_config.get('model_name', 'transaction_risk_model'),
                endpoint_name=azure_ml_config.get('endpoint_name')  # Optional
            )
        
        # Initialize Memorizz Memory System 
        logger.info("Setting up Memorizz memory system...")
        if openai_api_key:
            os.environ["OPENAI_API_KEY"] = openai_api_key
        
        # Configure MongoDB for Memorizz
        self.memory_config = MongoDBConfig(
            uri=mongodb_uri,
            database_name=f"{database_name}_memory"  # Use separate DB for memory
        )
        
        # Initialize memory provider
        self.memory_provider = MongoDBProvider(self.memory_config)
        
        # Create Memorizz agent with correct class
        self.mem_agent = MemAgent(
            model=MemorizzOpenAI(model="gpt-3.5-turbo"),  # Using Memorizz's OpenAI class
            instruction=self._get_agent_instructions(),
            memory_provider=self.memory_provider
        )
        
        # Set agent persona
        monitor_persona = Persona(
            name=f"{agent_name}_monitor",
            role="AML Compliance Specialist",  # Simple string role
            goals="Detect financial crimes using pattern recognition and vector similarity",
            background="Expert in AML compliance with advanced pattern detection capabilities"
        )
        self.mem_agent.set_persona(monitor_persona)
        
        # Save the agent configuration
        self.mem_agent.save()
=======
>>>>>>> Stashed changes
        # =============================================
        # Initialize Azure AI Foundry Embedding Service
        # =============================================
        logger.info("Setting up Azure Embedding Service...")
        self.embedding_service = AzureEmbeddingService()

        # =====================================
        # Initialize Vector Search Engine
        # =====================================
        logger.info("Initializing Vector Search Engine...")
        self.vector_search = VectorSearchEngine(self.db)
        
        # =====================================
        # Initialize Databricks Behavioral ML
        # =====================================
        self.databricks_ml = None
        if databricks_config:
            logger.info("Setting up Databricks Behavioral Anomaly ML...")
            self.databricks_ml = DatabricksMLScoring(
                workspace_name=azure_ai_foundry_config['project_endpoint'],
                databricks_workspace_url=databricks_config['workspace_url'],
                model_name='transaction_behavioral_anomaly_model'  # Updated model name
            )
        
        # ===========================================================
        # Initialize Memory System (Fallback if Memorizz unavailable)
        # ===========================================================
        logger.info("Setting up memory system...")
        self.memory_provider = None
        self.mem_agent = None
        
        if MEMORIZZ_AVAILABLE:
            try:
                self.memory_config = MongoDBConfig(
                    uri=mongodb_uri,
                    database=database_name,
                    collection=f"agent_memory_{agent_name}"
                )
                self.memory_provider = MongoDBProvider(self.memory_config)
                
                # Create Memorizz agent
                self.mem_agent = MemAgent(
                    model=OpenAI(model="gpt-4o"),
                    instruction=self._get_agent_instructions(),
                    memory_provider=self.memory_provider
                )
                
                # Set agent persona
                self.mem_agent.set_persona(Persona(
                    name=f"{agent_name}_monitor",
                    role=RoleType.TECHNICAL_EXPERT,
                    goals="Detect financial crimes using behavioral analysis",
                    background="Expert in customer-specific pattern detection"
                ))
                logger.info("Memorizz agent initialized successfully")
            except Exception as e:
                logger.warning(f"Memorizz initialization failed: {e}, using fallback")
                MEMORIZZ_AVAILABLE = False
<<<<<<< Updated upstream
=======
>>>>>>> 39958064063354271e054884b0e7095dbbebd12e:backend/azure_foundry/transaction_agent.py
>>>>>>> Stashed changes
        
        # =====================================
        # Decision Thresholds
        # =====================================
        self.thresholds = {
            'stage1': {
                'auto_approve': 25,
                'needs_stage2': 70,
                'auto_escalate': 85
            },
            'stage2': {
                'approve': 35,
                'needs_stage3': 65,
                'escalate': 80
            },
            'stage3': {
                'approve': 45,
                'investigate': 70,
                'block': 85
            }
        }
        
        # Statistics tracking
        self.stats = defaultdict(int)
        
<<<<<<< Updated upstream
        logger.info(f"Transaction Monitor '{agent_name}' initialized successfully")
=======
        logger.info(f"Transaction Monitor '{agent_name}' initialized successfully with Azure ML")
>>>>>>> Stashed changes
    
    def _get_agent_instructions(self) -> str:
        """Instructions for the Memorizz agent."""
        return """
<<<<<<< Updated upstream
        You are an advanced transaction monitoring specialist focusing on behavioral anomaly detection.
        
        Your responsibilities:
        1. Analyze transactions for deviations from customer's normal behavior
        2. Use vector similarity to find related patterns
        3. Identify when customers act outside their typical patterns
        4. Make personalized risk assessments
        5. Learn from each customer's unique behavior
        
        Key capabilities:
        - Customer-specific behavioral analysis
        - Pattern recognition using embeddings
        - Multi-stage progressive investigation
        - Integration with behavioral ML models
        
        Focus on detecting when transactions deviate from what is normal for each specific customer.
=======
        You are an advanced transaction monitoring specialist with MongoDB Atlas vector search capabilities.
        
        Your responsibilities:
        1. Analyze transactions for money laundering patterns
        2. Use Atlas vector similarity to find related suspicious transactions
        3. Identify behavioral anomalies using historical patterns
        4. Make risk-based decisions with high accuracy
        5. Learn from patterns to improve detection
        
        Key capabilities:
        - MongoDB Atlas native vector similarity search
        - Pattern recognition using embeddings
        - Multi-stage progressive investigation
        - Integration with ML models for advanced scoring
        
        Focus on minimizing false positives while maintaining high detection rates.
        Atlas provides the similarity scores directly, ensuring optimal performance.
>>>>>>> Stashed changes
        """
    
    # =============================================================================
    # MAIN MONITORING PIPELINE
    # =============================================================================
    
    async def monitor_transaction(
        self,
        transaction_data: Dict[str, Any]
    ) -> MonitoringDecision:
        """
        Main entry point for monitoring a transaction.
<<<<<<< Updated upstream
=======
        
        Orchestrates multi-stage investigation with Atlas vector search.
>>>>>>> Stashed changes
        """
        start_time = datetime.now()
        logger.info(f"Starting monitoring for transaction {transaction_data.get('_id')}")
        
        # Parse transaction
        transaction = self._parse_transaction(transaction_data)
        
        # =====================================
        # Generate embedding if not present
        # =====================================
<<<<<<< Updated upstream
        if not transaction.vector_embedding or len(transaction.vector_embedding) == 0:
=======
        if not transaction.vector_embedding:
>>>>>>> Stashed changes
            logger.info("Generating embedding for new transaction...")
            
            transaction.vector_embedding = await self.embedding_service.generate_transaction_embedding(
                transaction
            )
<<<<<<< Updated upstream
=======
            
            # Store embedding back to database for future use
            await self.transactions_collection.update_one(
                {"_id": ObjectId(transaction.transaction_id)},
                {"$set": {"vector_embedding": transaction.vector_embedding}}
            )
>>>>>>> Stashed changes
        
        # Get customer profile
        customer = await self._get_customer_profile(transaction.customer_id)
        if not customer:
            logger.warning(f"Customer {transaction.customer_id} not found")
            return self._create_default_decision(transaction, "Customer not found")
        
        # Track all similar transactions found
        all_similar_transactions = []
        
        # =====================================
<<<<<<< Updated upstream
        # STAGE 1: Quick Triage with Customer Behavioral Analysis
        # =====================================
        logger.info("Stage 1: Customer behavioral analysis...")
        
        # Search customer's past transactions
=======
        # STAGE 1: Quick Triage with Customer Vector Search
        # =====================================
        logger.info("Stage 1: Quick triage with Atlas customer similarity search...")
        
        # Search customer's past transactions using Atlas Vector Search
>>>>>>> Stashed changes
        customer_similar = await self.vector_search.search_customer_transactions(
            customer_id=transaction.customer_id,
            query_embedding=transaction.vector_embedding,
            limit=5,
            exclude_transaction_id=transaction.transaction_id
        )
        all_similar_transactions.extend(customer_similar)
        
        stage1_result = await self._stage1_quick_triage(
            transaction, customer, customer_similar
        )
        
        # Initialize tracking variables
        final_score = stage1_result.risk_score
        final_confidence = stage1_result.confidence
        stages_completed = 1
        all_patterns = stage1_result.patterns_detected.copy()
        ml_score = None
        
        # =====================================
        # Decision Point: Do we need Stage 2?
        # =====================================
        if self._should_continue_to_stage2(stage1_result):
            logger.info("Stage 1 uncertain, proceeding to Stage 2...")
            
            # =====================================
<<<<<<< Updated upstream
            # STAGE 2: Pattern Analysis
            # =====================================
            
            # Search across ALL transactions
=======
            # STAGE 2: Pattern Analysis with Broader Atlas Vector Search
            # =====================================
            
            # Search across ALL transactions using Atlas Vector Search
>>>>>>> Stashed changes
            global_similar = await self.vector_search.search_all_transactions(
                query_embedding=transaction.vector_embedding,
                limit=10,
                min_similarity=0.75,
                time_window_days=90
            )
            all_similar_transactions.extend(global_similar)
            
            stage2_result = await self._stage2_pattern_analysis(
                transaction, customer, stage1_result, global_similar
            )
            
            # Update assessment
            final_score = self._combine_scores(
                stage1_result.risk_score,
                stage2_result.risk_score,
                weights=(0.4, 0.6)
            )
            final_confidence = stage2_result.confidence
            stages_completed = 2
            all_patterns.extend(stage2_result.patterns_detected)
            
            # =====================================
            # Decision Point: Do we need Stage 3?
            # =====================================
            if self._should_continue_to_stage3(stage2_result, all_patterns):
<<<<<<< Updated upstream
                logger.info("Stage 2 uncertain, proceeding to Stage 3...")
=======
                logger.info("Stage 2 still uncertain, proceeding to Stage 3...")
>>>>>>> Stashed changes
                
                # =====================================
                # STAGE 3: Deep Investigation with ML
                # =====================================
                
<<<<<<< Updated upstream
                # Use Databricks Behavioral ML
                if self.databricks_ml:
                    logger.info("Running Databricks Behavioral ML scoring...")
=======
                # Use Databricks ML if available
                if self.databricks_ml:
                    logger.info("Running Databricks ML scoring...")
>>>>>>> Stashed changes
                    databricks_score = await self.databricks_ml.score_transaction(
                        transaction, customer, all_similar_transactions
                    )
                    ml_score = databricks_score.risk_score
                
                stage3_result = await self._stage3_deep_investigation(
                    transaction, customer, stage1_result, stage2_result,
                    all_similar_transactions, ml_score
                )
                
                # Final assessment
                final_score = self._combine_scores(
                    stage1_result.risk_score,
                    stage2_result.risk_score,
                    stage3_result.risk_score,
                    weights=(0.2, 0.3, 0.5)
                )
                final_confidence = stage3_result.confidence
                stages_completed = 3
                all_patterns.extend(stage3_result.patterns_detected)
        
        # Make final decision
        decision = self._make_final_decision(
            final_score, final_confidence, all_patterns, all_similar_transactions
        )
        
        # Determine risk level
        risk_level = self._determine_risk_level(final_score)
        
        # Create explanation
        explanation = self._generate_explanation(
            final_score, final_confidence, all_patterns,
            stages_completed, all_similar_transactions
        )
        
        # Calculate processing time
        processing_time = (datetime.now() - start_time).total_seconds()
        
        # Create decision object
        monitoring_decision = MonitoringDecision(
            transaction_id=transaction.transaction_id,
            final_score=final_score,
            confidence=final_confidence,
            risk_level=risk_level,
            decision=decision,
            stages_completed=stages_completed,
            patterns=list(set(all_patterns)),
            similar_transactions_found=len(all_similar_transactions),
            ml_score=ml_score,
            explanation=explanation,
            processing_time=processing_time,
            timestamp=datetime.now()
        )
        
<<<<<<< Updated upstream
        # Store decision
=======
        # Store decision and learn
>>>>>>> Stashed changes
        await self._store_decision(monitoring_decision, transaction)
        
        # Update statistics
        self.stats['transactions_processed'] += 1
        self.stats[f'decision_{decision}'] += 1
        self.stats[f'stages_{stages_completed}'] += 1
        
        logger.info(
            f"Monitoring complete: {decision} "
            f"(score={final_score:.1f}, confidence={final_confidence:.2f}, "
            f"stages={stages_completed}, similar_found={len(all_similar_transactions)}, "
            f"time={processing_time:.3f}s)"
        )
        
        return monitoring_decision
    
    # =============================================================================
<<<<<<< Updated upstream
    # STAGE 1: BEHAVIORAL ANALYSIS
=======
    # STAGE 1: QUICK TRIAGE
>>>>>>> Stashed changes
    # =============================================================================
    
    async def _stage1_quick_triage(
        self,
        transaction: Transaction,
        customer: Customer,
        customer_similar: List[VectorSearchResult]
    ) -> StageResult:
        """
<<<<<<< Updated upstream
        Stage 1: Quick triage with customer behavioral analysis.
=======
        Stage 1: Quick triage with customer similarity analysis.
        
        Uses Atlas vector search results in risk assessment.
>>>>>>> Stashed changes
        """
        start_time = datetime.now()
        checks_performed = []
        patterns = []
        
<<<<<<< Updated upstream
        logger.debug("Stage 1: Customer behavioral analysis...")
        
        # Check if amount is unusual for customer
        amount_risk = self._check_amount_anomaly(transaction, customer)
        checks_performed.append('amount_anomaly_check')
        if amount_risk > 0.7:
            patterns.append(PatternType.UNUSUAL_AMOUNT.value)
        
        # Check if merchant is typical for customer
        merchant_risk = self._check_merchant_anomaly(transaction, customer)
        checks_performed.append('merchant_anomaly_check')
        if merchant_risk > 0.7:
            patterns.append(PatternType.UNUSUAL_MERCHANT.value)
        
        # Check if location is typical for customer
        location_risk = self._check_location_anomaly(transaction, customer)
        checks_performed.append('location_anomaly_check')
        if location_risk > 0.7:
            patterns.append(PatternType.UNUSUAL_LOCATION.value)
        
        # Check if device is known
        device_risk = self._check_device_anomaly(transaction, customer)
        checks_performed.append('device_anomaly_check')
        if device_risk > 0.7:
            patterns.append(PatternType.UNKNOWN_DEVICE.value)
        
        # Vector similarity risk
        similarity_risk = self._assess_similarity_risk(customer_similar)
        checks_performed.append('vector_similarity_check')
        if similarity_risk > 0.7:
            patterns.append(PatternType.SIMILAR_TO_FRAUD.value)
        
        # Customer trust factor
=======
        logger.debug("Stage 1: Starting quick checks with Atlas similarity...")
        
        # Standard risk checks
        amount_risk = self._check_amount_risk(transaction, customer)
        checks_performed.append('amount_check')
        if amount_risk > 0.7:
            patterns.append(PatternType.UNUSUAL_AMOUNT.value)
        
        merchant_risk = self._check_merchant_risk(transaction)
        checks_performed.append('merchant_check')
        if merchant_risk > 0.7:
            patterns.append(PatternType.HIGH_RISK_MERCHANT.value)
        
        geo_risk = self._check_geographic_risk(transaction)
        checks_performed.append('geographic_check')
        if geo_risk > 0.7:
            patterns.append(PatternType.GEOGRAPHIC_RISK.value)
        
        # =====================================
        # Atlas vector similarity risk assessment
        # =====================================
        similarity_risk = self._assess_similarity_risk(customer_similar)
        checks_performed.append('atlas_vector_similarity_check')
        if similarity_risk > 0.7:
            patterns.append(PatternType.SIMILAR_TO_FRAUD.value)
        
        # Customer trust
>>>>>>> Stashed changes
        trust_factor = self._calculate_customer_trust(customer)
        checks_performed.append('trust_check')
        
        # Calculate Stage 1 risk score
        risk_score = self._calculate_stage1_score(
<<<<<<< Updated upstream
            amount_risk, merchant_risk, location_risk,
            device_risk, similarity_risk, trust_factor
        )
        
        # Calculate confidence
        confidence = self._calculate_stage1_confidence(
            amount_risk, merchant_risk, location_risk,
            device_risk, customer_similar
=======
            amount_risk, merchant_risk, geo_risk, 
            similarity_risk, trust_factor
        )
        
        # Calculate confidence based on Atlas results
        confidence = self._calculate_stage1_confidence(
            amount_risk, merchant_risk, geo_risk, customer_similar
>>>>>>> Stashed changes
        )
        
        # Determine if we need Stage 2
        should_continue = (
            (risk_score >= 30 and risk_score <= 70) or
            confidence < 0.7 or
<<<<<<< Updated upstream
            len(customer_similar) < 2
=======
            len(customer_similar) < 2  # Need more data
>>>>>>> Stashed changes
        )
        
        processing_time = (datetime.now() - start_time).total_seconds()
        
        return StageResult(
            stage_number=1,
            risk_score=risk_score,
            confidence=confidence,
            patterns_detected=patterns,
            similar_transactions=customer_similar,
            should_continue=should_continue,
            processing_time=processing_time,
            checks_performed=checks_performed
        )
    
<<<<<<< Updated upstream
    def _check_amount_anomaly(self, transaction: Transaction, customer: Customer) -> float:
        """Check if amount is unusual for this customer."""
=======
    def _assess_similarity_risk(
        self,
        similar_transactions: List[VectorSearchResult]
    ) -> float:
        """
        Assess risk based on Atlas vector search results.
        
        High similarity to fraud transactions = high risk.
        Similarity scores come directly from MongoDB Atlas.
        """
        if not similar_transactions:
            return 0.3  # No history is slightly suspicious
        
        # Check if any highly similar transactions were fraud
        fraud_count = sum(1 for t in similar_transactions if t.is_fraud)
        high_similarity_count = sum(
            1 for t in similar_transactions 
            if t.similarity_score > 0.9  # Atlas similarity score
        )
        
        if fraud_count > 0:
            # Similar to known fraud (using Atlas scores)
            if similar_transactions[0].similarity_score > 0.95:
                return 0.95  # Very similar to fraud
            elif similar_transactions[0].similarity_score > 0.85:
                return 0.8
            else:
                return 0.6
        elif high_similarity_count > 3:
            # Many similar legitimate transactions
            return 0.1  # Likely safe
        else:
            return 0.3  # Neutral
    
    def _calculate_stage1_score(
        self,
        amount_risk: float,
        merchant_risk: float,
        geo_risk: float,
        similarity_risk: float,
        trust_factor: float
    ) -> float:
        """
        Calculate Stage 1 risk score including Atlas vector similarity.
        """
        # Weight the different factors
        raw_score = (
            amount_risk * 25 +
            merchant_risk * 20 +
            geo_risk * 20 +
            similarity_risk * 30  # Atlas vector similarity is important
        )
        
        # Apply trust modifier
        trust_modifier = 2.0 - trust_factor
        final_score = raw_score * trust_modifier * 0.5
        
        return min(100, final_score)
    
    def _calculate_stage1_confidence(
        self,
        amount_risk: float,
        merchant_risk: float,
        geo_risk: float,
        similar_transactions: List[VectorSearchResult]
    ) -> float:
        """
        Calculate confidence including Atlas vector search results.
        """
        risks = [amount_risk, merchant_risk, geo_risk]
        
        # Clear signals = high confidence
        if all(r < 0.2 for r in risks):
            confidence = 0.95
        elif all(r > 0.8 for r in risks):
            confidence = 0.95
        else:
            # Mixed signals
            std_dev = np.std(risks)
            confidence = 0.7 - (std_dev * 0.5)
        
        # Adjust based on Atlas search results
        if len(similar_transactions) > 5:
            confidence += 0.1  # Good history from Atlas
        elif len(similar_transactions) == 0:
            confidence -= 0.1  # No history found by Atlas
        
        return max(0.3, min(0.95, confidence))
    
    # =============================================================================
    # STAGE 2: PATTERN ANALYSIS
    # =============================================================================
    
    async def _stage2_pattern_analysis(
        self,
        transaction: Transaction,
        customer: Customer,
        stage1_result: StageResult,
        global_similar: List[VectorSearchResult]
    ) -> StageResult:
        """
        Stage 2: Pattern analysis with global Atlas vector search.
        
        Looks for patterns across all customers using Atlas.
        """
        start_time = datetime.now()
        checks_performed = []
        patterns = []
        
        logger.debug("Stage 2: Pattern analysis with Atlas global search...")
        
        # Check for structuring
        structuring_risk = await self._check_structuring(transaction, customer)
        checks_performed.append('structuring_check')
        if structuring_risk > 0.6:
            patterns.append(PatternType.STRUCTURING.value)
        
        # Check behavioral anomaly
        anomaly_score = self._check_behavioral_anomaly(transaction, customer)
        checks_performed.append('behavioral_check')
        
        # Check velocity
        velocity_risk = await self._check_velocity(transaction, customer)
        checks_performed.append('velocity_check')
        if velocity_risk > 0.7:
            patterns.append(PatternType.VELOCITY_SPIKE.value)
        
        # =====================================
        # Global pattern analysis using Atlas results
        # =====================================
        global_pattern_risk = self._analyze_global_patterns(global_similar)
        checks_performed.append('atlas_global_pattern_analysis')
        
        # Calculate Stage 2 risk score
        risk_score = self._calculate_stage2_score(
            stage1_result.risk_score,
            structuring_risk,
            anomaly_score,
            velocity_risk,
            global_pattern_risk,
            len(patterns)
        )
        
        # Calculate confidence with Atlas results
        confidence = self._calculate_stage2_confidence(
            stage1_result.confidence,
            patterns,
            global_similar
        )
        
        # Determine if we need Stage 3
        should_continue = (
            (risk_score >= 40 and risk_score <= 65) or
            PatternType.STRUCTURING.value in patterns or
            confidence < 0.65 or
            sum(1 for t in global_similar if t.is_fraud) > 2  # Multiple fraud matches from Atlas
        )
        
        processing_time = (datetime.now() - start_time).total_seconds()
        
        # Combine similar transactions from both stages
        all_similar = stage1_result.similar_transactions + global_similar
        
        return StageResult(
            stage_number=2,
            risk_score=risk_score,
            confidence=confidence,
            patterns_detected=patterns,
            similar_transactions=all_similar,
            should_continue=should_continue,
            processing_time=processing_time,
            checks_performed=checks_performed
        )
    
    def _analyze_global_patterns(
        self,
        global_similar: List[VectorSearchResult]
    ) -> float:
        """
        Analyze patterns from Atlas global vector search.
        
        Identifies cross-customer fraud patterns using Atlas results.
        """
        if not global_similar:
            return 0.2
        
        # Count different pattern types found by Atlas
        pattern_counts = defaultdict(int)
        for txn in global_similar:
            if txn.pattern_type:
                pattern_counts[txn.pattern_type] += 1
        
        # High concentration of specific patterns is risky
        if pattern_counts.get(PatternType.STRUCTURING.value, 0) >= 2:
            return 0.9
        
        # Multiple fraud matches from Atlas
        fraud_count = sum(1 for t in global_similar if t.is_fraud)
        if fraud_count >= 3:
            return 0.85
        elif fraud_count >= 1:
            return 0.6
        
        # High similarity scores from Atlas (possible pattern)
        high_similarity = sum(1 for t in global_similar if t.similarity_score > 0.85)
        if high_similarity >= 5:
            return 0.5
        
        return 0.2
    
    def _calculate_stage2_score(
        self,
        stage1_score: float,
        structuring: float,
        anomaly: float,
        velocity: float,
        global_pattern: float,
        pattern_count: int
    ) -> float:
        """
        Calculate Stage 2 score with Atlas global pattern analysis.
        """
        score = stage1_score * 0.3
        
        score += structuring * 25
        score += anomaly * 15
        score += velocity * 10
        score += global_pattern * 20  # Atlas global patterns are important
        score += pattern_count * 8
        
        return min(100, score)
    
    def _calculate_stage2_confidence(
        self,
        stage1_confidence: float,
        patterns: List[str],
        global_similar: List[VectorSearchResult]
    ) -> float:
        """
        Calculate Stage 2 confidence with Atlas global search results.
        """
        confidence = stage1_confidence * 0.3
        
        # More checks increase confidence
        confidence += len(patterns) * 0.1
        
        # Atlas global matches increase confidence
        if len(global_similar) > 10:
            confidence += 0.2
        elif len(global_similar) > 5:
            confidence += 0.1
        
        # Structuring pattern gives high confidence
        if PatternType.STRUCTURING.value in patterns:
            confidence += 0.15
        
        return min(0.95, confidence)
    
    # =============================================================================
    # STAGE 3: DEEP INVESTIGATION
    # =============================================================================
    
    async def _stage3_deep_investigation(
        self,
        transaction: Transaction,
        customer: Customer,
        stage1_result: StageResult,
        stage2_result: StageResult,
        all_similar: List[VectorSearchResult],
        ml_score: Optional[float] = None
    ) -> StageResult:
        """
        Stage 3: Deep investigation with ML and comprehensive analysis.
        
        Uses all Atlas vector search results for final assessment.
        """
        start_time = datetime.now()
        checks_performed = []
        patterns = []
        
        logger.debug("Stage 3: Deep investigation with full Atlas results...")
        
        # Historical analysis
        historical_risk = await self._analyze_history(transaction, customer)
        checks_performed.append('historical_analysis')
        
        # Network analysis
        network_risk = await self._analyze_network(transaction)
        checks_performed.append('network_analysis')
        
        # AI pattern analysis using Memorizz agent with Atlas results
        ai_assessment = await self._ai_pattern_analysis(
            transaction, customer, stage1_result, stage2_result, all_similar
        )
        checks_performed.append('ai_analysis')
        
        # =====================================
        # Deep pattern analysis of all Atlas results
        # =====================================
        deep_pattern_risk = self._deep_pattern_analysis(all_similar)
        checks_performed.append('atlas_deep_pattern_analysis')
        
        # Use Azure ML if available (UPDATED)
        if self.azure_ml:
            logger.info("Running Azure ML scoring...")
            azure_ml_score = await self.azure_ml.score_transaction(
                transaction, customer, all_similar
            )
            ml_score = azure_ml_score.risk_score
            checks_performed.append('azure_ml_scoring')
        
        # Calculate final Stage 3 score
        risk_score = self._calculate_stage3_score(
            stage2_result.risk_score,
            historical_risk,
            network_risk,
            ai_assessment,
            deep_pattern_risk,
            ml_score
        )
        
        # High confidence after deep investigation
        confidence = 0.85
        if ml_score:
            confidence = 0.9  # Even higher with ML
        
        processing_time = (datetime.now() - start_time).total_seconds()
        
        return StageResult(
            stage_number=3,
            risk_score=risk_score,
            confidence=confidence,
            patterns_detected=patterns,
            similar_transactions=all_similar,
            should_continue=False,
            processing_time=processing_time,
            checks_performed=checks_performed
        )
    
    def _deep_pattern_analysis(
        self,
        all_similar: List[VectorSearchResult]
    ) -> float:
        """
        Deep analysis of all Atlas vector search results.
        
        Looks for complex patterns across all Atlas-found transactions.
        """
        if len(all_similar) < 3:
            return 0.2
        
        # Analyze Atlas similarity score distribution
        similarities = [t.similarity_score for t in all_similar]
        avg_similarity = np.mean(similarities)
        
        # Check fraud concentration in Atlas results
        fraud_transactions = [t for t in all_similar if t.is_fraud]
        fraud_ratio = len(fraud_transactions) / len(all_similar)
        
        # Very high Atlas similarity to multiple frauds
        if fraud_ratio > 0.5 and avg_similarity > 0.85:
            return 0.95
        
        # Moderate fraud presence in Atlas results
        elif fraud_ratio > 0.2:
            return 0.7
        
        # Low fraud but high Atlas similarity (unusual pattern)
        elif avg_similarity > 0.9 and len(all_similar) > 10:
            return 0.5
        
        return 0.2
    
    def _calculate_stage3_score(
        self,
        stage2_score: float,
        historical_risk: float,
        network_risk: float,
        ai_assessment: float,
        deep_pattern_risk: float,
        ml_score: Optional[float]
    ) -> float:
        """
        Calculate final Stage 3 score with all factors including Atlas patterns.
        """
        score = stage2_score * 0.2
        
        score += historical_risk * 20
        score += network_risk * 15
        score += ai_assessment * 20
        score += deep_pattern_risk * 25  # Atlas deep patterns
        
        # Include ML score if available
        if ml_score:
            score = score * 0.7 + ml_score * 0.3
        
        return min(100, score)
    
    async def _ai_pattern_analysis(
        self,
        transaction: Transaction,
        customer: Customer,
        stage1_result: StageResult,
        stage2_result: StageResult,
        similar_transactions: List[VectorSearchResult]
    ) -> float:
        """
        Enhanced AI analysis with Atlas vector search context using Memorizz agent.
        """
        # Prepare enhanced context with Atlas results
        context = f"""
        Analyze this transaction for money laundering risk:
        
        Transaction:
        - Amount: ${transaction.amount}
        - Merchant: {transaction.merchant['category']}
        - Country: {transaction.location['country']}
        
        Customer Profile:
        - Risk Score: {customer.risk_score}
        - Credit Score: {customer.credit_score}
        
        MongoDB Atlas Vector Search Results:
        - Found {len(similar_transactions)} similar transactions
        - Fraud matches: {sum(1 for t in similar_transactions if t.is_fraud)}
        - Average Atlas similarity score: {np.mean([t.similarity_score for t in similar_transactions]):.2f}
        - Highest similarity: {max([t.similarity_score for t in similar_transactions], default=0):.2f}
        
        Previous Analysis:
        - Stage 1 Score: {stage1_result.risk_score}
        - Stage 2 Score: {stage2_result.risk_score}
        - Patterns: {stage2_result.patterns_detected}
        
        Assess the risk considering the MongoDB Atlas vector similarity patterns.
        Atlas has already calculated the similarity scores using cosine similarity.
        """
        
        try:
            # Use Memorizz agent for analysis
            response = self.mem_agent.run(context)
            
            if "high risk" in response.lower() or "fraud" in response.lower():
                return 0.8
            elif "medium risk" in response.lower():
                return 0.5
            elif "low risk" in response.lower():
                return 0.2
        except Exception as e:
            logger.error(f"AI analysis failed: {e}")
        
        return 0.3
    
    # =============================================================================
    # HELPER METHODS
    # =============================================================================
    
    def _check_amount_risk(self, transaction: Transaction, customer: Customer) -> float:
        """Check if transaction amount is risky."""
>>>>>>> Stashed changes
        if customer.std_transaction_amount > 0:
            z_score = abs(
                (transaction.amount - customer.avg_transaction_amount) /
                customer.std_transaction_amount
            )
            if z_score > 3:
                return 0.9
            elif z_score > 2:
<<<<<<< Updated upstream
                return 0.6
            elif z_score > 1.5:
                return 0.3
        
        # Also check for structuring
=======
                return 0.5
        
>>>>>>> Stashed changes
        if 9000 <= transaction.amount < 10000:
            return 0.8
        
        return 0.1
    
<<<<<<< Updated upstream
    def _check_merchant_anomaly(self, transaction: Transaction, customer: Customer) -> float:
        """Check if merchant is unusual for this customer."""
        merchant_category = transaction.merchant.get('category', '').lower()
        
        if customer.common_merchant_categories:
            common_categories_lower = [cat.lower() for cat in customer.common_merchant_categories]
            if merchant_category not in common_categories_lower:
                # Unusual merchant for this customer
                return 0.8
            else:
                # Normal merchant for this customer
                return 0.1
        
        # No history, slightly elevated risk
        return 0.3
    
    def _check_location_anomaly(self, transaction: Transaction, customer: Customer) -> float:
        """Check if location is unusual for this customer."""
        country = transaction.location.get('country', 'US')
        
        if customer.usual_locations:
            if country not in customer.usual_locations:
                # Unusual country for this customer
                if country in ['KY', 'PA', 'MC', 'VG', 'BS']:  # Offshore financial centers
                    return 0.95
                else:
                    return 0.7
        else:
            # No location history, check if high-risk
            if country in ['KY', 'PA', 'MC']:
                return 0.8
        
        return 0.1
    
    def _check_device_anomaly(self, transaction: Transaction, customer: Customer) -> float:
        """Check if device is known for this customer."""
        device_id = transaction.device_info.get('device_id', '')
        
        if customer.known_devices:
            if device_id not in customer.known_devices:
                # Unknown device
                return 0.75
            else:
                # Known device
                return 0.05
        
        # No device history
        return 0.3
    
    def _assess_similarity_risk(
        self,
        similar_transactions: List[VectorSearchResult]
    ) -> float:
        """Assess risk based on similar transactions."""
        if not similar_transactions:
            return 0.3
        
        # Check if any highly similar transactions were fraud
        fraud_count = sum(1 for t in similar_transactions if t.is_fraud)
        high_similarity_count = sum(
            1 for t in similar_transactions 
            if t.similarity_score > 0.9
        )
        
        if fraud_count > 0:
            if similar_transactions[0].similarity_score > 0.95:
                return 0.95
            elif similar_transactions[0].similarity_score > 0.85:
                return 0.8
            else:
                return 0.6
        elif high_similarity_count > 3:
            return 0.1  # Many similar legitimate transactions
        else:
            return 0.3
=======
    def _check_merchant_risk(self, transaction: Transaction) -> float:
        """Check if merchant category is risky."""
        high_risk_categories = {
            'cryptocurrency': 0.9,
            'gambling': 0.85,
            'money_transfer': 0.8,
            'cash_advance': 0.75
        }
        
        category = transaction.merchant.get('category', '').lower()
        return high_risk_categories.get(category, 0.1)
    
    def _check_geographic_risk(self, transaction: Transaction) -> float:
        """Check if transaction involves high-risk countries."""
        high_risk_countries = {
            'IR': 1.0, 'KP': 1.0, 'SY': 1.0,
            'AF': 0.8, 'YE': 0.8,
            'KY': 0.6, 'MC': 0.4
        }
        
        country = transaction.location.get('country', 'US')
        return high_risk_countries.get(country, 0.1)
>>>>>>> Stashed changes
    
    def _calculate_customer_trust(self, customer: Customer) -> float:
        """Calculate customer trust score."""
        trust = 0.5
        
        if customer.credit_score > 700:
            trust += 0.2
        elif customer.credit_score < 500:
            trust -= 0.2
        
        if customer.risk_score < 20:
            trust += 0.2
        elif customer.risk_score > 70:
            trust -= 0.3
        
        if customer.account_status == 'active':
            trust += 0.1
        
        return max(0.0, min(1.0, trust))
    
<<<<<<< Updated upstream
    def _calculate_stage1_score(
        self,
        amount_risk: float,
        merchant_risk: float,
        location_risk: float,
        device_risk: float,
        similarity_risk: float,
        trust_factor: float
    ) -> float:
        """Calculate Stage 1 risk score with behavioral factors."""
        # Weight the different factors
        raw_score = (
            amount_risk * 20 +
            merchant_risk * 20 +
            location_risk * 15 +
            device_risk * 15 +
            similarity_risk * 30
        )
        
        # Apply trust modifier
        trust_modifier = 2.0 - trust_factor
        final_score = raw_score * trust_modifier * 0.5
        
        return min(100, final_score)
    
    def _calculate_stage1_confidence(
        self,
        amount_risk: float,
        merchant_risk: float,
        location_risk: float,
        device_risk: float,
        similar_transactions: List[VectorSearchResult]
    ) -> float:
        """Calculate confidence for Stage 1."""
        risks = [amount_risk, merchant_risk, location_risk, device_risk]
        
        # Clear signals = high confidence
        if all(r < 0.2 for r in risks):
            confidence = 0.95
        elif all(r > 0.8 for r in risks):
            confidence = 0.95
        else:
            # Mixed signals
            std_dev = np.std(risks)
            confidence = 0.7 - (std_dev * 0.5)
        
        # Adjust based on similar transactions
        if len(similar_transactions) > 5:
            confidence += 0.1
        elif len(similar_transactions) == 0:
            confidence -= 0.1
        
        return max(0.3, min(0.95, confidence))
    
    # =============================================================================
    # STAGE 2: PATTERN ANALYSIS
    # =============================================================================
    
    async def _stage2_pattern_analysis(
        self,
        transaction: Transaction,
        customer: Customer,
        stage1_result: StageResult,
        global_similar: List[VectorSearchResult]
    ) -> StageResult:
        """
        Stage 2: Pattern analysis with global search.
        """
        start_time = datetime.now()
        checks_performed = []
        patterns = []
        
        logger.debug("Stage 2: Pattern analysis...")
        
        # Check for structuring
        structuring_risk = await self._check_structuring(transaction, customer)
        checks_performed.append('structuring_check')
        if structuring_risk > 0.6:
            patterns.append(PatternType.STRUCTURING.value)
        
        # Check behavioral anomaly score
        anomaly_score = self._calculate_behavioral_anomaly_score(transaction, customer)
        checks_performed.append('behavioral_anomaly_check')
        if anomaly_score > 0.7:
            patterns.append(PatternType.BEHAVIORAL_ANOMALY.value)
        
        # Check velocity
        velocity_risk = await self._check_velocity(transaction, customer)
        checks_performed.append('velocity_check')
        if velocity_risk > 0.7:
            patterns.append(PatternType.VELOCITY_SPIKE.value)
        
        # Global pattern analysis
        global_pattern_risk = self._analyze_global_patterns(global_similar)
        checks_performed.append('global_pattern_analysis')
        
        # Calculate Stage 2 risk score
        risk_score = self._calculate_stage2_score(
            stage1_result.risk_score,
            structuring_risk,
            anomaly_score,
            velocity_risk,
            global_pattern_risk,
            len(patterns)
        )
        
        # Calculate confidence
        confidence = self._calculate_stage2_confidence(
            stage1_result.confidence,
            patterns,
            global_similar
        )
        
        # Determine if we need Stage 3
        should_continue = (
            (risk_score >= 40 and risk_score <= 65) or
            PatternType.STRUCTURING.value in patterns or
            confidence < 0.65 or
            sum(1 for t in global_similar if t.is_fraud) > 2
        )
        
        processing_time = (datetime.now() - start_time).total_seconds()
        
        # Combine similar transactions
        all_similar = stage1_result.similar_transactions + global_similar
        
        return StageResult(
            stage_number=2,
            risk_score=risk_score,
            confidence=confidence,
            patterns_detected=patterns,
            similar_transactions=all_similar,
            should_continue=should_continue,
            processing_time=processing_time,
            checks_performed=checks_performed
        )
    
=======
>>>>>>> Stashed changes
    async def _check_structuring(
        self,
        transaction: Transaction,
        customer: Customer
    ) -> float:
        """Check for structuring patterns."""
        if transaction.amount < 8000 or transaction.amount >= 10000:
            return 0.0
        
        one_day_ago = datetime.now() - timedelta(days=1)
        
        recent_count = await self.transactions_collection.count_documents({
            'customer_id': transaction.customer_id,
            'timestamp': {'$gte': one_day_ago.isoformat()},
            'amount': {'$gte': 8000, '$lt': 10000}
        })
        
        if recent_count >= 3:
            return 0.9
        elif recent_count >= 2:
            return 0.6
        
        return 0.2
    
<<<<<<< Updated upstream
    def _calculate_behavioral_anomaly_score(
=======
    def _check_behavioral_anomaly(
>>>>>>> Stashed changes
        self,
        transaction: Transaction,
        customer: Customer
    ) -> float:
<<<<<<< Updated upstream
        """Calculate overall behavioral anomaly score."""
        anomaly_score = 0.0
        
        # Check merchant category
=======
        """Check for behavioral anomalies."""
        anomaly_score = 0.0
        
>>>>>>> Stashed changes
        if customer.common_merchant_categories:
            if transaction.merchant['category'] not in customer.common_merchant_categories:
                anomaly_score += 0.3
        
<<<<<<< Updated upstream
        # Check amount ratio
=======
>>>>>>> Stashed changes
        if customer.avg_transaction_amount > 0:
            ratio = transaction.amount / customer.avg_transaction_amount
            if ratio > 5:
                anomaly_score += 0.4
            elif ratio > 3:
                anomaly_score += 0.2
        
<<<<<<< Updated upstream
        # Check location
        if customer.usual_locations:
            if transaction.location['country'] not in customer.usual_locations:
                anomaly_score += 0.2
        
        # Check device
        if customer.known_devices:
            if transaction.device_info['device_id'] not in customer.known_devices:
                anomaly_score += 0.1
        
=======
>>>>>>> Stashed changes
        return min(1.0, anomaly_score)
    
    async def _check_velocity(
        self,
        transaction: Transaction,
        customer: Customer
    ) -> float:
        """Check transaction velocity."""
        one_hour_ago = datetime.now() - timedelta(hours=1)
        
        recent_count = await self.transactions_collection.count_documents({
            'customer_id': transaction.customer_id,
            'timestamp': {'$gte': one_hour_ago.isoformat()}
        })
        
        if recent_count > 10:
            return 0.9
        elif recent_count > 5:
            return 0.5
        elif recent_count > 3:
            return 0.2
        
        return 0.0
    
<<<<<<< Updated upstream
    def _analyze_global_patterns(
        self,
        global_similar: List[VectorSearchResult]
    ) -> float:
        """Analyze patterns from global search."""
        if not global_similar:
            return 0.2
        
        # Count pattern types
        pattern_counts = defaultdict(int)
        for txn in global_similar:
            if txn.pattern_type:
                pattern_counts[txn.pattern_type] += 1
        
        # High concentration of specific patterns
        if pattern_counts.get(PatternType.STRUCTURING.value, 0) >= 2:
            return 0.9
        
        # Multiple fraud matches
        fraud_count = sum(1 for t in global_similar if t.is_fraud)
        if fraud_count >= 3:
            return 0.85
        elif fraud_count >= 1:
            return 0.6
        
        # High similarity to many transactions
        high_similarity = sum(1 for t in global_similar if t.similarity_score > 0.85)
        if high_similarity >= 5:
            return 0.5
        
        return 0.2
    
    def _calculate_stage2_score(
        self,
        stage1_score: float,
        structuring: float,
        anomaly: float,
        velocity: float,
        global_pattern: float,
        pattern_count: int
    ) -> float:
        """Calculate Stage 2 score."""
        score = stage1_score * 0.3
        
        score += structuring * 25
        score += anomaly * 20
        score += velocity * 10
        score += global_pattern * 15
        score += pattern_count * 8
        
        return min(100, score)
    
    def _calculate_stage2_confidence(
        self,
        stage1_confidence: float,
        patterns: List[str],
        global_similar: List[VectorSearchResult]
    ) -> float:
        """Calculate Stage 2 confidence."""
        confidence = stage1_confidence * 0.3
        
        confidence += len(patterns) * 0.1
        
        if len(global_similar) > 10:
            confidence += 0.2
        elif len(global_similar) > 5:
            confidence += 0.1
        
        if PatternType.STRUCTURING.value in patterns:
            confidence += 0.15
        
        return min(0.95, confidence)
    
    # =============================================================================
    # STAGE 3: DEEP INVESTIGATION
    # =============================================================================
    
    async def _stage3_deep_investigation(
        self,
        transaction: Transaction,
        customer: Customer,
        stage1_result: StageResult,
        stage2_result: StageResult,
        all_similar: List[VectorSearchResult],
        ml_score: Optional[float]
    ) -> StageResult:
        """
        Stage 3: Deep investigation with ML.
        """
        start_time = datetime.now()
        checks_performed = []
        patterns = []
        
        logger.debug("Stage 3: Deep investigation...")
        
        # Historical analysis
        historical_risk = await self._analyze_history(transaction, customer)
        checks_performed.append('historical_analysis')
        
        # Network analysis
        network_risk = await self._analyze_network(transaction)
        checks_performed.append('network_analysis')
        
        # AI pattern analysis
        ai_assessment = await self._ai_pattern_analysis(
            transaction, customer, stage1_result, stage2_result, all_similar
        )
        checks_performed.append('ai_analysis')
        
        # Deep pattern analysis
        deep_pattern_risk = self._deep_pattern_analysis(all_similar)
        checks_performed.append('deep_pattern_analysis')
        
        # Include ML score if available
        if ml_score:
            checks_performed.append('databricks_behavioral_ml')
        
        # Calculate final Stage 3 score
        risk_score = self._calculate_stage3_score(
            stage2_result.risk_score,
            historical_risk,
            network_risk,
            ai_assessment,
            deep_pattern_risk,
            ml_score
        )
        
        # High confidence after deep investigation
        confidence = 0.85
        if ml_score:
            confidence = 0.9
        
        processing_time = (datetime.now() - start_time).total_seconds()
        
        return StageResult(
            stage_number=3,
            risk_score=risk_score,
            confidence=confidence,
            patterns_detected=patterns,
            similar_transactions=all_similar,
            should_continue=False,
            processing_time=processing_time,
            checks_performed=checks_performed
        )
    
=======
>>>>>>> Stashed changes
    async def _analyze_history(
        self,
        transaction: Transaction,
        customer: Customer
    ) -> float:
        """Analyze customer's transaction history."""
        thirty_days_ago = datetime.now() - timedelta(days=30)
        
        history = await self.transactions_collection.find({
            'customer_id': transaction.customer_id,
            'timestamp': {'$gte': thirty_days_ago.isoformat()}
        }).to_list(100)
        
        if not history:
            return 0.3
        
<<<<<<< Updated upstream
        amounts = [t.get('amount', 0) for t in history]
=======
        amounts = [t['amount'] for t in history]
>>>>>>> Stashed changes
        if len(amounts) > 5:
            recent_avg = np.mean(amounts[-5:])
            older_avg = np.mean(amounts[:-5])
            
            if older_avg > 0 and recent_avg / older_avg > 3:
                return 0.7
        
        return 0.1
    
    async def _analyze_network(self, transaction: Transaction) -> float:
        """Check if device has been used suspiciously."""
        device_id = transaction.device_info.get('device_id')
        
        if device_id:
<<<<<<< Updated upstream
            # Get distinct customer IDs using this device
            pipeline = [
                {'$match': {'device_info.device_id': device_id}},
                {'$group': {'_id': '$customer_id'}},
                {'$count': 'customer_count'}
            ]
            
            result = await self.transactions_collection.aggregate(pipeline).to_list(1)
            
            if result and result[0]['customer_count'] > 5:
                return 0.8
            elif result and result[0]['customer_count'] > 2:
=======
            account_count = await self.transactions_collection.distinct(
                'customer_id',
                {'device_info.device_id': device_id}
            )
            
            if len(account_count) > 5:
                return 0.8
            elif len(account_count) > 2:
>>>>>>> Stashed changes
                return 0.4
        
        return 0.1
    
<<<<<<< Updated upstream
=======
<<<<<<< HEAD:Agentic Docs/transaction agent.py
=======
>>>>>>> Stashed changes
    async def _ai_pattern_analysis(
        self,
        transaction: Transaction,
        customer: Customer,
        stage1_result: StageResult,
        stage2_result: StageResult,
        similar_transactions: List[VectorSearchResult]
    ) -> float:
        """AI analysis with behavioral context and historical memory."""
        if not self.mem_agent:
            # Fallback analysis without Memorizz
            return self._fallback_analysis(
                transaction, customer, similar_transactions
            )
        
        # Retrieve relevant historical decisions for this customer
        historical_context = ""
        try:
            # Query for similar customer transactions in memory
            query = f"Customer {customer.customer_id} transaction analysis behavioral patterns"
            historical_memories = self.mem_agent.retrieve_long_term_memory_by_query(
                query=query,
                namespace="transaction_decisions",
                limit=5
            )
            
            if historical_memories:
                historical_context = "\n\nHistorical Transaction Patterns:\n"
                for memory in historical_memories:
                    historical_context += f"- {memory.get('content', '')}\n"
        except Exception as e:
            logger.warning(f"Failed to retrieve historical context: {e}")
        
        # Prepare comprehensive context
        context = f"""
        You are an expert fraud detection analyst. Analyze this transaction for behavioral anomalies using the customer's profile and historical patterns.
        
        Current Transaction:
        - Transaction ID: {transaction.transaction_id}
        - Customer ID: {customer.customer_id}
        - Amount: ${transaction.amount:.2f}
        - Merchant Category: {transaction.merchant.get('category', 'Unknown')}
        - Location: {transaction.location.get('country', 'Unknown')}
        - Device Type: {transaction.device_info.get('type', 'Unknown')}
        
        Customer Profile:
        - Average Transaction Amount: ${customer.avg_transaction_amount:.2f}
        - Risk Score: {customer.risk_score}
        - Credit Score: {customer.credit_score}
        - Usual Merchants: {', '.join(customer.common_merchant_categories) if customer.common_merchant_categories else 'None recorded'}
        - Usual Locations: {', '.join(customer.usual_locations) if customer.usual_locations else 'None recorded'}
        
        Current Analysis Results:
        - Stage 1 Risk Score: {stage1_result.risk_score:.1f}
        - Stage 2 Risk Score: {stage2_result.risk_score:.1f}
        - Detected Patterns: {', '.join(stage2_result.patterns_detected) if stage2_result.patterns_detected else 'None'}
        - Similar Transactions Found: {len(similar_transactions)}
        - Fraud Matches in Similar: {sum(1 for t in similar_transactions if t.is_fraud)}
        {historical_context}
        
        Based on this comprehensive analysis, assess the behavioral anomaly risk level:
        - Consider deviations from customer's normal patterns
        - Evaluate the significance of detected anomalies
        - Factor in historical transaction decisions for this customer
        - Account for the similarity to known fraud patterns
        
        Respond with one of: HIGH_RISK, MODERATE_RISK, LOW_RISK, NORMAL
        Then provide a brief explanation of your reasoning.
        """
        
        try:
            response = self.mem_agent.run(context)
            response_lower = response.lower()
            
            # Parse AI response for risk assessment
            if "high_risk" in response_lower or "high risk" in response_lower:
                return 0.9
            elif "moderate_risk" in response_lower or "moderate risk" in response_lower:
                return 0.6
            elif "low_risk" in response_lower or "low risk" in response_lower:
                return 0.3
            elif "normal" in response_lower:
                return 0.1
            else:
                # Fallback: look for key risk indicators in response
                risk_indicators = ["suspicious", "anomaly", "unusual", "concerning", "fraud"]
                positive_indicators = ["normal", "typical", "expected", "legitimate"]
                
                risk_count = sum(1 for indicator in risk_indicators if indicator in response_lower)
                positive_count = sum(1 for indicator in positive_indicators if indicator in response_lower)
                
                if risk_count > positive_count:
                    return 0.7
                elif positive_count > risk_count:
                    return 0.2
                else:
                    return 0.4
                
        except Exception as e:
            logger.error(f"AI analysis failed: {e}")
            return self._fallback_analysis(transaction, customer, similar_transactions)
        
    
    def _fallback_analysis(
        self,
        transaction: Transaction,
        customer: Customer,
        similar_transactions: List[VectorSearchResult]
    ) -> float:
        """Fallback analysis without AI agent."""
        risk = 0.0
        
        # Amount deviation
        if customer.std_transaction_amount > 0:
            z_score = abs(
                (transaction.amount - customer.avg_transaction_amount) /
                customer.std_transaction_amount
            )
            if z_score > 3:
                risk += 0.3
        
        # Merchant anomaly
        if transaction.merchant['category'] not in customer.common_merchant_categories:
            risk += 0.3
        
        # Fraud similarity
        fraud_count = sum(1 for t in similar_transactions if t.is_fraud)
        if fraud_count > 0:
            risk += 0.2 * fraud_count / len(similar_transactions) if similar_transactions else 0
        
        return min(1.0, risk)
    
    def _deep_pattern_analysis(
        self,
        all_similar: List[VectorSearchResult]
    ) -> float:
        """Deep analysis of all similar transactions."""
        if len(all_similar) < 3:
            return 0.2
        
        # Analyze similarity distribution
        similarities = [t.similarity_score for t in all_similar]
        avg_similarity = np.mean(similarities)
        
        # Check fraud concentration
        fraud_transactions = [t for t in all_similar if t.is_fraud]
        fraud_ratio = len(fraud_transactions) / len(all_similar)
        
        # Very high similarity to multiple frauds
        if fraud_ratio > 0.5 and avg_similarity > 0.85:
            return 0.95
        
        # Moderate fraud presence
        elif fraud_ratio > 0.2:
            return 0.7
        
        # Low fraud but high similarity
        elif avg_similarity > 0.9 and len(all_similar) > 10:
            return 0.5
        
        return 0.2
    
    def _calculate_stage3_score(
        self,
        stage2_score: float,
        historical_risk: float,
        network_risk: float,
        ai_assessment: float,
        deep_pattern_risk: float,
        ml_score: Optional[float]
    ) -> float:
        """Calculate final Stage 3 score."""
        score = stage2_score * 0.2
        
        score += historical_risk * 20
        score += network_risk * 15
        score += ai_assessment * 20
        score += deep_pattern_risk * 25
        
        # Include ML score if available
        if ml_score:
            score = score * 0.7 + ml_score * 0.3
        
        return min(100, score)
    
    # =============================================================================
    # HELPER METHODS
    # =============================================================================
    
<<<<<<< Updated upstream
=======
>>>>>>> 39958064063354271e054884b0e7095dbbebd12e:backend/azure_foundry/transaction_agent.py
>>>>>>> Stashed changes
    def _should_continue_to_stage2(self, stage1_result: StageResult) -> bool:
        """Determine if we need Stage 2."""
        if 30 <= stage1_result.risk_score <= 70:
            return True
        
        if stage1_result.confidence < 0.7:
            return True
        
        return False
    
    def _should_continue_to_stage3(
        self,
        stage2_result: StageResult,
        all_patterns: List[str]
    ) -> bool:
        """Determine if we need Stage 3."""
        if PatternType.STRUCTURING.value in all_patterns:
            return True
        
        if 40 <= stage2_result.risk_score <= 65:
            return True
        
        if stage2_result.confidence < 0.65:
            return True
        
<<<<<<< Updated upstream
        # Many similar frauds found
=======
        # Many similar frauds found by Atlas
>>>>>>> Stashed changes
        fraud_count = sum(
            1 for t in stage2_result.similar_transactions 
            if t.is_fraud
        )
        if fraud_count >= 2:
            return True
        
        return False
    
    def _combine_scores(self, *scores, weights=None) -> float:
        """Combine multiple scores with weights."""
        if weights is None:
            weights = [1.0 / len(scores)] * len(scores)
        
        weighted_sum = sum(s * w for s, w in zip(scores, weights))
        return min(100, weighted_sum)
    
    def _make_final_decision(
        self,
        score: float,
        confidence: float,
        patterns: List[str],
        similar_transactions: List[VectorSearchResult]
    ) -> str:
<<<<<<< Updated upstream
        """Make final decision based on all factors."""
        # Check for structuring
        if PatternType.STRUCTURING.value in patterns and score > 60:
            return Decision.GENERATE_SAR.value
        
        # Multiple behavioral anomalies
        behavioral_patterns = [
            PatternType.UNUSUAL_MERCHANT.value,
            PatternType.UNUSUAL_LOCATION.value,
            PatternType.UNKNOWN_DEVICE.value,
            PatternType.BEHAVIORAL_ANOMALY.value
        ]
        behavioral_count = sum(1 for p in patterns if p in behavioral_patterns)
        
        if behavioral_count >= 3 and score > 60:
            return Decision.ESCALATE.value
        
        # High similarity to multiple frauds
=======
        """Make final decision based on all factors including Atlas results."""
        # Check for structuring + SAR
        if PatternType.STRUCTURING.value in patterns and score > 60:
            return Decision.GENERATE_SAR.value
        
        # High similarity to multiple frauds (from Atlas)
>>>>>>> Stashed changes
        fraud_count = sum(1 for t in similar_transactions if t.is_fraud)
        if fraud_count >= 3 and score > 50:
            return Decision.ESCALATE.value
        
        # Standard decision based on score and confidence
        if confidence > 0.75:
            if score < 30:
                return Decision.AUTO_APPROVE.value
            elif score < 45:
                return Decision.APPROVE_WITH_MONITORING.value
            elif score < 70:
                return Decision.INVESTIGATE.value
            elif score < 85:
                return Decision.ESCALATE.value
            else:
                return Decision.BLOCK.value
        elif confidence > 0.6:
            if score < 35:
                return Decision.APPROVE_WITH_MONITORING.value
            elif score < 65:
                return Decision.INVESTIGATE.value
            else:
                return Decision.ESCALATE.value
        else:
            return Decision.INVESTIGATE.value
    
    def _determine_risk_level(self, score: float) -> str:
        """Convert score to risk level."""
        if score < 30:
            return RiskLevel.LOW.value
        elif score < 60:
            return RiskLevel.MEDIUM.value
        elif score < 85:
            return RiskLevel.HIGH.value
        else:
            return RiskLevel.CRITICAL.value
    
    def _generate_explanation(
        self,
        score: float,
        confidence: float,
        patterns: List[str],
        stages: int,
        similar_transactions: List[VectorSearchResult]
    ) -> str:
<<<<<<< Updated upstream
        """Generate comprehensive explanation."""
        explanation = f"Risk Score: {score:.1f}/100 (Confidence: {confidence:.0%}). "
        explanation += f"Analysis depth: {stages} stage(s). "
        
        # Add similarity findings
        if similar_transactions:
            fraud_count = sum(1 for t in similar_transactions if t.is_fraud)
            explanation += f"Found {len(similar_transactions)} similar transactions"
            if fraud_count > 0:
                explanation += f" ({fraud_count} fraudulent)"
            explanation += ". "
        
        # Add behavioral anomalies
        behavioral_patterns = [
            p for p in patterns if p in [
                PatternType.UNUSUAL_MERCHANT.value,
                PatternType.UNUSUAL_LOCATION.value,
                PatternType.UNKNOWN_DEVICE.value,
                PatternType.BEHAVIORAL_ANOMALY.value
            ]
        ]
        
        if behavioral_patterns:
            explanation += f"Behavioral anomalies: {', '.join(behavioral_patterns)}. "
        
        if patterns:
            explanation += f"All patterns: {', '.join(patterns)}. "
        
        if score < 30:
            explanation += "Transaction appears normal for this customer."
        elif score < 60:
            explanation += "Transaction shows some deviations from normal behavior."
        elif score < 85:
            explanation += "Transaction shows significant behavioral anomalies."
        else:
            explanation += "Transaction shows critical deviations from customer profile."
=======
        """Generate comprehensive explanation including Atlas search results."""
        explanation = f"Risk Score: {score:.1f}/100 (Confidence: {confidence:.0%}). "
        explanation += f"Analysis depth: {stages} stage(s). "
        
        # Add Atlas similarity findings
        if similar_transactions:
            fraud_count = sum(1 for t in similar_transactions if t.is_fraud)
            avg_similarity = np.mean([t.similarity_score for t in similar_transactions])
            explanation += f"Atlas found {len(similar_transactions)} similar transactions "
            explanation += f"(avg similarity: {avg_similarity:.2f}"
            if fraud_count > 0:
                explanation += f", {fraud_count} fraudulent"
            explanation += "). "
        
        if patterns:
            explanation += f"Detected patterns: {', '.join(patterns)}. "
        
        if score < 30:
            explanation += "Transaction appears safe based on Atlas analysis."
        elif score < 60:
            explanation += "Transaction shows moderate risk indicators per Atlas search."
        elif score < 85:
            explanation += "Transaction shows high risk indicators in Atlas patterns."
        else:
            explanation += "Transaction shows critical risk indicators from Atlas vector search."
>>>>>>> Stashed changes
        
        return explanation
    
    def _parse_transaction(self, data: Dict[str, Any]) -> Transaction:
        """Parse raw transaction data."""
<<<<<<< Updated upstream
        # Handle timestamp parsing
        timestamp = data.get('timestamp')
        if isinstance(timestamp, str):
            timestamp = datetime.fromisoformat(timestamp)
        elif not isinstance(timestamp, datetime):
            timestamp = datetime.now()
        
        # Extract vector embedding
        vector_embedding = data.get('vector_embedding', [])
        if vector_embedding and isinstance(vector_embedding[0], dict):
            # Handle MongoDB NumberDouble format
            vector_embedding = [float(v.get('$numberDouble', v)) for v in vector_embedding]
        
        return Transaction(
            transaction_id=str(data.get('_id', data.get('transaction_id'))),
            customer_id=str(data.get('customer_id')),
            timestamp=timestamp,
            amount=float(data.get('amount', 0)),
            currency=data.get('currency', 'USD'),
            merchant=data.get('merchant', {}),
            location=data.get('location', {}),
            device_info=data.get('device_info', {}),
            transaction_type=data.get('transaction_type', 'purchase'),
            payment_method=data.get('payment_method', 'card'),
            vector_embedding=vector_embedding
        )
    
    async def _get_customer_profile(self, customer_id: str) -> Optional[Customer]:
        """Retrieve customer profile with behavioral patterns."""
        # Try to find customer by ObjectId or string ID
        if len(customer_id) == 24:
            query = {'_id': ObjectId(customer_id)}
        else:
            query = {'_id': customer_id}
        
        customer_data = await self.customers_collection.find_one(query)
        
        if not customer_data:
            # Try as string if ObjectId failed
            customer_data = await self.customers_collection.find_one({'_id': customer_id})
=======
        return Transaction(
            transaction_id=str(data.get('_id', data.get('transaction_id'))),
            customer_id=data['customer_id'],
            timestamp=datetime.fromisoformat(data['timestamp']) 
                      if isinstance(data['timestamp'], str) 
                      else data['timestamp'],
            amount=data['amount'],
            currency=data.get('currency', 'USD'),
            merchant=data['merchant'],
            location=data['location'],
            device_info=data['device_info'],
            transaction_type=data.get('transaction_type', 'purchase'),
            payment_method=data.get('payment_method', 'card'),
            vector_embedding=data.get('vector_embedding', [])
        )
    
    async def _get_customer_profile(self, customer_id: str) -> Optional[Customer]:
        """Retrieve customer profile."""
        customer_data = await self.customers_collection.find_one({
            '_id': ObjectId(customer_id) if len(customer_id) == 24 else customer_id
        })
>>>>>>> Stashed changes
        
        if not customer_data:
            return None
        
<<<<<<< Updated upstream
        # Extract behavioral profile
=======
>>>>>>> Stashed changes
        behavioral = customer_data.get('behavioral_profile', {})
        patterns = behavioral.get('transaction_patterns', {})
        risk = customer_data.get('risk_profile', {})
        account = customer_data.get('account_info', {})
        
<<<<<<< Updated upstream
        # Extract usual locations from transaction patterns
        usual_locations = []
        for loc in patterns.get('usual_transaction_locations', []):
            country = loc.get('country')
            if country and country not in usual_locations:
                usual_locations.append(country)
        
        # Extract known devices
        known_devices = []
        for device in behavioral.get('devices', []):
            device_id = device.get('device_id')
            if device_id:
                known_devices.append(device_id)
        
        return Customer(
            customer_id=str(customer_data['_id']),
            risk_score=float(risk.get('overall_risk_score', 50)),
            avg_transaction_amount=float(patterns.get('avg_transaction_amount', 100)),
            std_transaction_amount=float(patterns.get('std_transaction_amount', 50)),
            common_merchant_categories=patterns.get('common_merchant_categories', []),
            usual_locations=usual_locations,
            known_devices=known_devices,
            credit_score=int(account.get('credit_score', 600)),
=======
        return Customer(
            customer_id=str(customer_data['_id']),
            risk_score=risk.get('overall_risk_score', 50),
            avg_transaction_amount=patterns.get('avg_transaction_amount', 100),
            std_transaction_amount=patterns.get('std_transaction_amount', 50),
            common_merchant_categories=patterns.get('common_merchant_categories', []),
            credit_score=account.get('credit_score', 600),
>>>>>>> Stashed changes
            account_status=account.get('status', 'active')
        )
    
    def _create_default_decision(
        self,
        transaction: Transaction,
        reason: str
    ) -> MonitoringDecision:
        """Create default decision for error cases."""
        return MonitoringDecision(
            transaction_id=transaction.transaction_id,
            final_score=50,
            confidence=0.5,
            risk_level=RiskLevel.MEDIUM.value,
            decision=Decision.INVESTIGATE.value,
            stages_completed=1,
            patterns=[],
            similar_transactions_found=0,
            ml_score=None,
            explanation=f"Manual review required: {reason}",
            processing_time=0.0,
            timestamp=datetime.now()
        )
    
    async def _store_decision(
        self,
        decision: MonitoringDecision,
        transaction: Transaction
    ):
<<<<<<< Updated upstream
=======
<<<<<<< HEAD:Agentic Docs/transaction agent.py
        """Store decision in database and memory using corrected Memorizz."""
        # Store in MongoDB
        await self.decisions_collection.insert_one(asdict(decision))
        
        # Store in Memorizz agent memory (CORRECTED)
        memory_content = (
            f"Transaction {transaction.transaction_id}: "
            f"Amount ${transaction.amount}, "
            f"Risk {decision.final_score:.1f}, "
            f"Decision {decision.decision}, "
            f"Atlas similar found: {decision.similar_transactions_found}"
        )
        
        # Use agent's store_memory method, not the provider's
        self.mem_agent.store_memory(
            content=memory_content,
            memory_type="task",  # Using simple string as memory type
            metadata={
                'transaction_id': transaction.transaction_id,
                'risk_score': decision.final_score,
                'decision': decision.decision,
                'patterns': decision.patterns,
                'similar_count': decision.similar_transactions_found,
                'timestamp': decision.timestamp.isoformat(),
                'atlas_search': True  # Flag that Atlas was used
            }
        )
        
        # Save agent state
        self.mem_agent.save()
        
        logger.debug(f"Decision stored for transaction {transaction.transaction_id}")
=======
>>>>>>> Stashed changes
        """Store decision in database and memory for AI agent learning."""
        await self.decisions_collection.insert_one(asdict(decision))
        
        # Store in memorizz long-term memory for AI analysis
        if self.mem_agent and MEMORIZZ_AVAILABLE:
            memory_content = (
                f"Transaction Analysis: ID {transaction.transaction_id}, "
                f"Customer {transaction.customer_id}, Amount ${transaction.amount:.2f}, "
                f"Risk Score {decision.final_score:.1f}/100, Decision: {decision.decision}. "
                f"Behavioral patterns detected: {', '.join(decision.patterns) if decision.patterns else 'None'}. "
                f"Found {decision.similar_transactions_found} similar transactions. "
                f"Processing stages: {decision.stages_completed}. "
                f"Merchant: {transaction.merchant.get('category', 'Unknown')}, "
                f"Location: {transaction.location.get('country', 'Unknown')}, "
                f"Device: {transaction.device_info.get('type', 'Unknown')}."
            )
            
            try:
                # Store as long-term memory for future AI analysis
                self.mem_agent.add_long_term_memory(
                    content=memory_content,
                    namespace="transaction_decisions"
                )
                logger.debug(f"Stored transaction decision in agent memory: {transaction.transaction_id}")
            except Exception as e:
                logger.warning(f"Failed to store memory: {e}")
<<<<<<< Updated upstream
=======
>>>>>>> 39958064063354271e054884b0e7095dbbebd12e:backend/azure_foundry/transaction_agent.py
>>>>>>> Stashed changes

# =============================================================================
# SECTION 7: USAGE EXAMPLE
# =============================================================================

<<<<<<< Updated upstream
=======
<<<<<<< HEAD:Agentic Docs/transaction agent.py
async def main():
    """Example usage with pure Azure ML endpoints."""
=======
>>>>>>> Stashed changes
async def memorizz_test():
    """Test function to verify memorizz library functionality."""
    
    try:
        memory_content = (
            f"Transaction Analysis: ID 123, "
            f"Customer 123, Amount $100, "
            f"Risk Score 30/100, Decision: INVESTIGATE. "
            f"Behavioral patterns detected: None. "
            f"Found 0 similar transactions. "
            f"Processing stages: 2. "
            f"Merchant: Unknown, "
            f"Location: Unknown, "
            f"Device: Unknown."
        )

        memory_config = MongoDBConfig(
            uri=os.getenv("MONGODB_URI"),
        )

        memory_provider = MongoDBProvider(memory_config)

        mem_agent = MemAgent(
            model=OpenAI(model="gpt-4o"),
            instruction="You are an advanced transaction monitoring specialist focusing on behavioral anomaly detection.",
            memory_provider=memory_provider
        )
        
        mem_agent.set_persona(Persona(
            name=f"Test_Agent_001_monitor",
            role=RoleType.TECHNICAL_EXPERT,
            goals="Detect financial crimes using behavioral analysis",
            background="Expert in customer-specific pattern detection"
        ))
        logger.info("Memorizz agent initialized successfully")

        mem_agent.add_long_term_memory(memory_content, namespace="transaction_decisions")

        logger.debug(f"Stored transaction decision in agent memory: {memory_content}")
    except Exception as e:
        logger.warning(f"Memorizz initialization failed: {e}, using fallback")

async def usage_example():
    """Example usage with behavioral anomaly detection."""
<<<<<<< Updated upstream
    
    # Configuration
    config = {
        'agent_name': 'TM_Agent_001',
        'mongodb_uri': 'mongodb://localhost:27017',
        'database_name': 'fsi-threatsight360',  # Your database
=======
>>>>>>> 39958064063354271e054884b0e7095dbbebd12e:backend/azure_foundry/transaction_agent.py
    
    # Configuration (SIMPLIFIED)
    config = {
        'agent_name': 'TM_Agent_001',
        'mongodb_uri': 'mongodb+srv://username:password@cluster.mongodb.net/',
>>>>>>> Stashed changes
        'azure_ml_config': {
            'subscription_id': 'your-subscription-id',
            'resource_group': 'your-resource-group',
            'workspace_name': 'your-ml-workspace',
            'openai_endpoint': 'https://your-openai.openai.azure.com/',
<<<<<<< Updated upstream
            'openai_api_key': 'your-api-key',
            'embedding_deployment': 'text-embedding-ada-002'
        },
        'databricks_config': {
            'workspace_url': 'https://your-databricks-workspace.azuredatabricks.net',
            'model_name': 'transaction_behavioral_anomaly_model'
        }
    }
    
    # Initialize monitor
    print("Initializing Transaction Monitor with Behavioral Anomaly Detection...")
    monitor = SimplifiedTransactionMonitor(**config)
    
    # Test scenarios with real customer ID from your database
    test_scenarios = [
        {
            "name": "Normal Customer Behavior",
            "transaction": {
                "_id": "TEST_TXN_001",
                "customer_id": "67d2a82a654c7f1b869c4adb",  # Real customer from your data
                "timestamp": datetime.now().isoformat(),
                "amount": 180.00,  # Close to customer's average
                "currency": "USD",
                "merchant": {"name": "Walmart", "category": "grocery", "id": "M001"},
                "location": {"city": "New York", "state": "NY", "country": "US"},
                "device_info": {
                    "device_id": "1df2d6c6-12f7-445c-bec8-fff7b6bd62bc",  # Known device
                    "type": "tablet",
                    "ip": "192.168.1.1"
                },
                "transaction_type": "purchase",
                "payment_method": "debit_card",
                "vector_embedding": None
            }
        },
        {
            "name": "Multiple Behavioral Anomalies",
            "transaction": {
                "_id": "TEST_TXN_002",
                "customer_id": "67d2a82a654c7f1b869c4adb",
                "timestamp": datetime.now().isoformat(),
                "amount": 5000.00,  # Way above normal
                "currency": "USD",
                "merchant": {"name": "CryptoEx", "category": "cryptocurrency", "id": "M002"},
                "location": {"city": "Georgetown", "state": "KY", "country": "KY"},  # Cayman Islands
                "device_info": {
                    "device_id": "unknown_device_xyz",  # Unknown device
                    "type": "desktop",
                    "ip": "10.0.0.1"
                },
                "transaction_type": "transfer",
                "payment_method": "wire_transfer",
                "vector_embedding": None
=======
            'openai_api_key': 'your-azure-openai-api-key',
            'embedding_deployment': 'text-embedding-ada-002',
            'model_name': 'transaction_risk_model',  # Model in Azure ML registry
            'endpoint_name': 'transaction-risk-endpoint'  # Optional endpoint name
        },
        'openai_api_key': 'your-openai-api-key',
        'vector_index_name': 'vector_index',
        'enable_ml_scoring': True  # Easy toggle for demo
    }
    
    # Initialize monitor with Azure ML
    print("Initializing Transaction Monitor with Azure ML...")
    monitor = SimplifiedTransactionMonitor(
        agent_name=config['agent_name'],
        mongodb_uri=config['mongodb_uri'],
        azure_ml_config=config['azure_ml_config'],
        openai_api_key=config['openai_api_key'],
        vector_index_name=config['vector_index_name'],
        enable_ml_scoring=config['enable_ml_scoring']
    )
    
    # Test scenarios
    test_scenarios = [
        {
            "name": "Safe Transaction",
            "transaction": {
                "_id": "TXN_001",
                "customer_id": "CUST_001",
                "timestamp": datetime.now().isoformat(),
                "amount": 125.50,
                "currency": "USD",
                "merchant": {"name": "Walmart", "category": "grocery", "id": "M001"},
                "location": {"city": "New York", "state": "NY", "country": "US"},
                "device_info": {"device_id": "D001", "type": "mobile", "ip": "192.168.1.1"},
                "transaction_type": "purchase",
                "payment_method": "debit_card",
                "vector_embedding": None  # Will be generated
            }
        },
        {
            "name": "Suspicious Transaction",
            "transaction": {
                "_id": "TXN_002",
                "customer_id": "CUST_002",
                "timestamp": datetime.now().isoformat(),
                "amount": 9500.00,
                "currency": "USD",
                "merchant": {"name": "CryptoEx", "category": "cryptocurrency", "id": "M002"},
                "location": {"city": "Georgetown", "state": "KY", "country": "KY"},
                "device_info": {"device_id": "D002", "type": "desktop", "ip": "10.0.0.1"},
                "transaction_type": "transfer",
                "payment_method": "wire",
                "vector_embedding": None  # Will be generated
>>>>>>> Stashed changes
            }
        }
    ]
    
    for scenario in test_scenarios:
        print(f"\n{'='*60}")
        print(f"Testing: {scenario['name']}")
        print(f"{'='*60}")
        
        decision = await monitor.monitor_transaction(scenario['transaction'])
        
        print(f"\nResults:")
        print(f"  Risk Score: {decision.final_score:.1f}/100")
        print(f"  Confidence: {decision.confidence:.0%}")
        print(f"  Risk Level: {decision.risk_level}")
        print(f"  Decision: {decision.decision}")
        print(f"  Stages Used: {decision.stages_completed}")
<<<<<<< Updated upstream
        print(f"  Patterns Detected: {decision.patterns}")
        print(f"  Similar Transactions Found: {decision.similar_transactions_found}")
        if decision.ml_score:
            print(f"  ML Score (Behavioral): {decision.ml_score:.1f}")
        print(f"  Processing Time: {decision.processing_time:.3f}s")
        print(f"\nExplanation: {decision.explanation}")
=======
        print(f"  Patterns: {decision.patterns}")
        print(f"  Atlas Similar Transactions Found: {decision.similar_transactions_found}")
        if decision.ml_score:
            print(f"  ML Score: {decision.ml_score:.1f}")
        print(f"  Time: {decision.processing_time:.3f}s")
        print(f"\nExplanation: {decision.explanation}")
    
    # Demonstrate memory retrieval
    print(f"\n{'='*60}")
    print("Retrieving stored memories...")
    print(f"{'='*60}")
    
    memories = monitor.mem_agent.retrieve_memories(
        query="recent transactions with Atlas",
        memory_type="task",
        limit=5
    )
    
    for memory in memories:
        print(f"Memory: {memory}")
    
    print("\n✅ MongoDB Atlas Vector Search is handling all similarity calculations!")
    print("   No manual cosine similarity computation required.")
>>>>>>> Stashed changes

async def main():
    # await usage_example()
    await memorizz_test()

if __name__ == "__main__":
    asyncio.run(main())