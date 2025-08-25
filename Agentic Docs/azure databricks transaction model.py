# Databricks notebook source
# =============================================================================
# TRANSACTION ANOMALY DETECTION - UNSUPERVISED LEARNING
# Simplified unsupervised model for FSI demo with MongoDB integration
# 
# Using Isolation Forest and Local Outlier Factor for anomaly detection
# No fraud labels needed - perfect for real-world scenarios
# =============================================================================

# COMMAND ----------

# CELL 1: Setup and Configuration
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import json
from typing import Dict, List, Tuple, Optional
import warnings
warnings.filterwarnings('ignore')

# MongoDB
from pymongo import MongoClient
import pymongo

# ML libraries for unsupervised learning
from sklearn.ensemble import IsolationForest
from sklearn.neighbors import LocalOutlierFactor
from sklearn.cluster import DBSCAN
from sklearn.preprocessing import StandardScaler, RobustScaler
from sklearn.decomposition import PCA
from sklearn.model_selection import train_test_split
from sklearn.metrics import silhouette_score, calinski_harabasz_score

# For model persistence
import joblib
import pickle

# Azure ML and MLflow
import mlflow
import mlflow.sklearn
from mlflow.tracking import MlflowClient
from azure.ai.ml import MLClient
from azure.identity import DefaultAzureCredential
from azure.ai.ml.entities import Model, ManagedOnlineEndpoint, ManagedOnlineDeployment

# Visualization
import matplotlib.pyplot as plt
import seaborn as sns
import plotly.graph_objects as go
import plotly.express as px
from plotly.subplots import make_subplots

# Set style
plt.style.use('seaborn-v0_8-darkgrid')
sns.set_palette("husl")

print("✓ Libraries imported successfully")

# COMMAND ----------

# CELL 2: MongoDB Configuration (Simple for Demo)
# For demo purposes - in production, use secrets management
MONGODB_URI = "mongodb+srv://username:password@cluster.mongodb.net"  # Replace with your URI
DATABASE_NAME = "fsi-threatsight360"
TRANSACTIONS_COLLECTION = "transactions"
CUSTOMERS_COLLECTION = "customers"

# Azure ML Configuration (you can still use secrets for this if you want)
try:
    AZURE_SUBSCRIPTION_ID = dbutils.secrets.get(scope="azure", key="subscription_id")
    AZURE_RESOURCE_GROUP = dbutils.secrets.get(scope="azure", key="resource_group")
    AZURE_ML_WORKSPACE = dbutils.secrets.get(scope="azure", key="ml_workspace")
except:
    # Fallback for local testing
    AZURE_SUBSCRIPTION_ID = "your-subscription-id"
    AZURE_RESOURCE_GROUP = "your-resource-group"
    AZURE_ML_WORKSPACE = "your-ml-workspace"

print(f"✓ Configuration loaded")
print(f"  Database: {DATABASE_NAME}")

# COMMAND ----------

# CELL 3: Load Data from MongoDB using Pandas
def load_mongodb_data(uri, database_name):
    """Load data directly into pandas from MongoDB"""
    
    print("Connecting to MongoDB...")
    client = MongoClient(uri)
    db = client[database_name]
    
    # Load transactions
    print("Loading transactions...")
    transactions = list(db[TRANSACTIONS_COLLECTION].find())
    df_transactions = pd.DataFrame(transactions)
    
    # Load customers
    print("Loading customers...")
    customers = list(db[CUSTOMERS_COLLECTION].find())
    df_customers = pd.DataFrame(customers)
    
    print(f"✓ Loaded {len(df_transactions):,} transactions")
    print(f"✓ Loaded {len(df_customers):,} customers")
    
    client.close()
    
    return df_transactions, df_customers

# Load data
df_transactions, df_customers = load_mongodb_data(MONGODB_URI, DATABASE_NAME)

# COMMAND ----------

# CELL 4: Feature Engineering for Anomaly Detection
def engineer_features(df_transactions, df_customers):
    """
    Engineer features specifically for unsupervised anomaly detection.
    Focus on behavioral patterns and statistical deviations.
    """
    
    print("Starting feature engineering for anomaly detection...")
    
    # Parse transaction fields
    df_transactions['amount'] = df_transactions['amount'].astype(float)
    df_transactions['customer_id'] = df_transactions['customer_id'].astype(str)
    df_transactions['merchant_category'] = df_transactions['merchant'].apply(lambda x: x.get('category', 'unknown') if isinstance(x, dict) else 'unknown')
    df_transactions['merchant_name'] = df_transactions['merchant'].apply(lambda x: x.get('name', 'unknown') if isinstance(x, dict) else 'unknown')
    df_transactions['location_country'] = df_transactions['location'].apply(lambda x: x.get('country', 'US') if isinstance(x, dict) else 'US')
    df_transactions['location_city'] = df_transactions['location'].apply(lambda x: x.get('city', 'unknown') if isinstance(x, dict) else 'unknown')
    df_transactions['device_type'] = df_transactions['device_info'].apply(lambda x: x.get('type', 'unknown') if isinstance(x, dict) else 'unknown')
    df_transactions['device_id'] = df_transactions['device_info'].apply(lambda x: x.get('device_id', 'unknown') if isinstance(x, dict) else 'unknown')
    
    # Parse timestamp
    if 'timestamp' in df_transactions.columns:
        df_transactions['timestamp'] = pd.to_datetime(df_transactions['timestamp'])
        df_transactions['hour'] = df_transactions['timestamp'].dt.hour
        df_transactions['day_of_week'] = df_transactions['timestamp'].dt.dayofweek
        df_transactions['is_weekend'] = (df_transactions['day_of_week'] >= 5).astype(int)
    else:
        df_transactions['hour'] = 12
        df_transactions['day_of_week'] = 1
        df_transactions['is_weekend'] = 0
    
    # Parse customer features
    customer_features = []
    for _, customer in df_customers.iterrows():
        cust_id = str(customer['_id'])
        behavioral = customer.get('behavioral_profile', {}) if pd.notna(customer.get('behavioral_profile')) else {}
        patterns = behavioral.get('transaction_patterns', {}) if behavioral else {}
        risk = customer.get('risk_profile', {}) if pd.notna(customer.get('risk_profile')) else {}
        account = customer.get('account_info', {}) if pd.notna(customer.get('account_info')) else {}
        
        cust_feat = {
            'customer_id': cust_id,
            'avg_transaction_amount': patterns.get('avg_transaction_amount', 100) if patterns else 100,
            'std_transaction_amount': patterns.get('std_transaction_amount', 50) if patterns else 50,
            'typical_transaction_count': patterns.get('typical_monthly_transactions', 20) if patterns else 20,
            'credit_score': account.get('credit_score', 600) if account else 600,
            'account_age_days': account.get('account_age_days', 365) if account else 365,
            'customer_risk_score': risk.get('overall_risk_score', 50) if risk else 50
        }
        customer_features.append(cust_feat)
    
    df_customer_features = pd.DataFrame(customer_features)
    
    # Merge with transactions
    df = pd.merge(df_transactions, df_customer_features, on='customer_id', how='left')
    
    # Fill missing values
    df['avg_transaction_amount'] = df['avg_transaction_amount'].fillna(100)
    df['std_transaction_amount'] = df['std_transaction_amount'].fillna(50)
    df['credit_score'] = df['credit_score'].fillna(600)
    df['customer_risk_score'] = df['customer_risk_score'].fillna(50)
    
    # ANOMALY DETECTION FEATURES
    
    # 1. Amount-based anomaly features
    df['amount_zscore'] = (df['amount'] - df['avg_transaction_amount']) / (df['std_transaction_amount'] + 1e-5)
    df['amount_deviation'] = np.abs(df['amount_zscore'])
    df['amount_ratio'] = df['amount'] / (df['avg_transaction_amount'] + 1e-5)
    df['is_round_amount'] = (df['amount'] % 100 == 0).astype(int)
    df['is_large_amount'] = (df['amount'] > df['avg_transaction_amount'] * 3).astype(int)
    
    # 2. Temporal anomaly features
    df['is_night_transaction'] = ((df['hour'] < 6) | (df['hour'] > 22)).astype(int)
    df['is_business_hours'] = ((df['hour'] >= 9) & (df['hour'] <= 17) & (df['is_weekend'] == 0)).astype(int)
    
    # 3. Frequency-based features (how common is this pattern?)
    merchant_freq = df['merchant_category'].value_counts() / len(df)
    df['merchant_category_frequency'] = df['merchant_category'].map(merchant_freq).fillna(0.001)
    
    location_freq = df['location_country'].value_counts() / len(df)
    df['location_frequency'] = df['location_country'].map(location_freq).fillna(0.001)
    
    device_freq = df['device_type'].value_counts() / len(df)
    df['device_frequency'] = df['device_type'].map(device_freq).fillna(0.001)
    
    # 4. Customer behavior deviation
    df['customer_risk_normalized'] = df['customer_risk_score'] / 100
    df['credit_score_normalized'] = df['credit_score'] / 850
    
    # 5. Interaction features
    df['high_amount_low_credit'] = ((df['amount'] > 1000) & (df['credit_score'] < 600)).astype(int)
    df['night_high_amount'] = (df['is_night_transaction'] * df['is_large_amount'])
    
    # 6. Statistical features
    df['amount_log'] = np.log1p(df['amount'])
    df['amount_squared'] = df['amount'] ** 2
    
    print(f"✓ Created {len(df.columns)} total features")
    
    return df

# Engineer features
df_features = engineer_features(df_transactions, df_customers)

# COMMAND ----------

# CELL 5: Prepare Features for Unsupervised Learning
def prepare_features_for_anomaly_detection(df):
    """
    Select and prepare features for unsupervised anomaly detection.
    """
    
    # Select numerical features for anomaly detection
    anomaly_features = [
        # Amount features
        'amount', 'amount_zscore', 'amount_deviation', 'amount_ratio',
        'amount_log', 'is_round_amount', 'is_large_amount',
        
        # Temporal features
        'hour', 'day_of_week', 'is_weekend', 'is_night_transaction', 
        'is_business_hours',
        
        # Frequency features (rarity indicators)
        'merchant_category_frequency', 'location_frequency', 'device_frequency',
        
        # Customer features
        'customer_risk_normalized', 'credit_score_normalized',
        
        # Interaction features
        'high_amount_low_credit', 'night_high_amount'
    ]
    
    # Create feature matrix
    X = df[anomaly_features].fillna(0)
    
    # Store transaction IDs for reference
    transaction_ids = df['_id'].values if '_id' in df.columns else df.index.values
    
    print(f"✓ Prepared {X.shape[0]} transactions with {X.shape[1]} features")
    print(f"Features used: {anomaly_features}")
    
    return X, anomaly_features, transaction_ids

X, feature_names, transaction_ids = prepare_features_for_anomaly_detection(df_features)

# COMMAND ----------

# CELL 6: Split Data for Evaluation
# Even in unsupervised learning, we split to evaluate consistency
X_train, X_test, ids_train, ids_test = train_test_split(
    X, transaction_ids, test_size=0.2, random_state=42
)

print(f"✓ Training set: {X_train.shape}")
print(f"✓ Test set: {X_test.shape}")

# COMMAND ----------

# CELL 7: Scale Features for Better Anomaly Detection
# Use RobustScaler as it's less sensitive to outliers
scaler = RobustScaler()
X_train_scaled = scaler.fit_transform(X_train)
X_test_scaled = scaler.transform(X_test)

print("✓ Features scaled using RobustScaler")

# Save scaler for production use
joblib.dump(scaler, '/tmp/robust_scaler.pkl')

# COMMAND ----------

# CELL 8: Train Multiple Anomaly Detection Models
mlflow.set_experiment("/Shared/UnsupervisedAnomalyDetection_Demo")

with mlflow.start_run(run_name="anomaly_detection_ensemble"):
    
    # Log basic information
    mlflow.log_param("database", DATABASE_NAME)
    mlflow.log_param("num_transactions", len(X_train))
    mlflow.log_param("num_features", len(feature_names))
    mlflow.log_param("contamination", 0.05)  # Expected proportion of anomalies
    
    # ========================================
    # 1. ISOLATION FOREST
    # ========================================
    print("\n1. Training Isolation Forest...")
    
    iso_forest = IsolationForest(
        contamination=0.05,  # Expect 5% anomalies
        random_state=42,
        n_estimators=100,
        max_samples='auto',
        n_jobs=-1
    )
    
    iso_forest.fit(X_train_scaled)
    
    # Predict anomalies (-1 for anomaly, 1 for normal)
    train_predictions_iso = iso_forest.predict(X_train_scaled)
    test_predictions_iso = iso_forest.predict(X_test_scaled)
    
    # Get anomaly scores (lower = more anomalous)
    train_scores_iso = iso_forest.score_samples(X_train_scaled)
    test_scores_iso = iso_forest.score_samples(X_test_scaled)
    
    # Convert to risk scores (0-100, higher = more risky)
    train_risk_iso = (1 - (train_scores_iso - train_scores_iso.min()) / 
                      (train_scores_iso.max() - train_scores_iso.min())) * 100
    test_risk_iso = (1 - (test_scores_iso - test_scores_iso.min()) / 
                     (test_scores_iso.max() - test_scores_iso.min())) * 100
    
    print(f"  Anomalies detected in train: {(train_predictions_iso == -1).sum()} ({(train_predictions_iso == -1).mean():.2%})")
    print(f"  Anomalies detected in test: {(test_predictions_iso == -1).sum()} ({(test_predictions_iso == -1).mean():.2%})")
    
    mlflow.log_metric("iso_forest_train_anomalies", (train_predictions_iso == -1).mean())
    mlflow.log_metric("iso_forest_test_anomalies", (test_predictions_iso == -1).mean())
    
    # ========================================
    # 2. LOCAL OUTLIER FACTOR
    # ========================================
    print("\n2. Training Local Outlier Factor...")
    
    lof = LocalOutlierFactor(
        n_neighbors=20,
        contamination=0.05,
        novelty=True,  # Enable prediction on new data
        n_jobs=-1
    )
    
    lof.fit(X_train_scaled)
    
    # Predict anomalies
    train_predictions_lof = lof.predict(X_train_scaled)
    test_predictions_lof = lof.predict(X_test_scaled)
    
    # Get anomaly scores
    train_scores_lof = lof.score_samples(X_train_scaled)
    test_scores_lof = lof.score_samples(X_test_scaled)
    
    # Convert to risk scores
    train_risk_lof = (1 - (train_scores_lof - train_scores_lof.min()) / 
                      (train_scores_lof.max() - train_scores_lof.min())) * 100
    test_risk_lof = (1 - (test_scores_lof - test_scores_lof.min()) / 
                     (test_scores_lof.max() - test_scores_lof.min())) * 100
    
    print(f"  Anomalies detected in train: {(train_predictions_lof == -1).sum()} ({(train_predictions_lof == -1).mean():.2%})")
    print(f"  Anomalies detected in test: {(test_predictions_lof == -1).sum()} ({(test_predictions_lof == -1).mean():.2%})")
    
    mlflow.log_metric("lof_train_anomalies", (train_predictions_lof == -1).mean())
    mlflow.log_metric("lof_test_anomalies", (test_predictions_lof == -1).mean())
    
    # ========================================
    # 3. ENSEMBLE APPROACH
    # ========================================
    print("\n3. Creating Ensemble Model...")
    
    # Combine predictions (majority voting)
    train_ensemble_votes = (train_predictions_iso == -1).astype(int) + (train_predictions_lof == -1).astype(int)
    test_ensemble_votes = (test_predictions_iso == -1).astype(int) + (test_predictions_lof == -1).astype(int)
    
    # Consider anomaly if at least one model flags it
    train_ensemble_pred = (train_ensemble_votes >= 1).astype(int)
    test_ensemble_pred = (test_ensemble_votes >= 1).astype(int)
    
    # Combine risk scores (average)
    train_risk_ensemble = (train_risk_iso + train_risk_lof) / 2
    test_risk_ensemble = (test_risk_iso + test_risk_lof) / 2
    
    print(f"  Ensemble anomalies in train: {train_ensemble_pred.sum()} ({train_ensemble_pred.mean():.2%})")
    print(f"  Ensemble anomalies in test: {test_ensemble_pred.sum()} ({test_ensemble_pred.mean():.2%})")
    
    mlflow.log_metric("ensemble_train_anomalies", train_ensemble_pred.mean())
    mlflow.log_metric("ensemble_test_anomalies", test_ensemble_pred.mean())
    
    # ========================================
    # 4. ANALYZE ANOMALIES
    # ========================================
    print("\n4. Analyzing Detected Anomalies...")
    
    # Get indices of anomalies in test set
    anomaly_indices = np.where(test_ensemble_pred == 1)[0]
    normal_indices = np.where(test_ensemble_pred == 0)[0]
    
    if len(anomaly_indices) > 0:
        # Compare feature distributions
        anomaly_features_df = pd.DataFrame(X_test.iloc[anomaly_indices], columns=feature_names)
        normal_features_df = pd.DataFrame(X_test.iloc[normal_indices], columns=feature_names)
        
        # Find most distinguishing features
        feature_diffs = {}
        for col in feature_names:
            anomaly_mean = anomaly_features_df[col].mean()
            normal_mean = normal_features_df[col].mean()
            diff = abs(anomaly_mean - normal_mean) / (normal_mean + 1e-5)
            feature_diffs[col] = diff
        
        # Sort by difference
        important_features = sorted(feature_diffs.items(), key=lambda x: x[1], reverse=True)[:10]
        
        print("\nTop distinguishing features for anomalies:")
        for feat, diff in important_features:
            print(f"  {feat}: {diff:.2f}x difference")
        
        # Log important features
        mlflow.log_dict({f: float(d) for f, d in important_features}, "important_features.json")
    
    # ========================================
    # 5. SAVE MODELS
    # ========================================
    print("\n5. Saving Models...")
    
    # Save Isolation Forest
    mlflow.sklearn.log_model(
        iso_forest,
        "isolation_forest",
        input_example=X_train.iloc[:5],
        registered_model_name="transaction_anomaly_isolation_forest"
    )
    
    # Save LOF
    mlflow.sklearn.log_model(
        lof,
        "lof_model",
        input_example=X_train.iloc[:5],
        registered_model_name="transaction_anomaly_lof"
    )
    
    # Save scaler
    mlflow.sklearn.log_model(
        scaler,
        "scaler",
        input_example=X_train.iloc[:5]
    )
    
    # Save feature names
    mlflow.log_dict({"features": feature_names}, "feature_names.json")
    
    print("✓ Models saved to MLflow")

# COMMAND ----------

# CELL 9: Visualize Anomaly Detection Results
# Create comprehensive visualization
fig = make_subplots(
    rows=2, cols=2,
    subplot_titles=('Risk Score Distribution', 'Anomaly Detection Comparison',
                    'Feature Space (PCA)', 'Risk Score by Transaction Amount'),
    specs=[[{'type': 'histogram'}, {'type': 'bar'}],
           [{'type': 'scatter'}, {'type': 'scatter'}]]
)

# 1. Risk Score Distribution
fig.add_trace(
    go.Histogram(x=test_risk_ensemble, nbinsx=30, name='Risk Scores'),
    row=1, col=1
)

# 2. Model Comparison
model_names = ['Isolation Forest', 'LOF', 'Ensemble']
anomaly_rates = [
    (test_predictions_iso == -1).mean() * 100,
    (test_predictions_lof == -1).mean() * 100,
    test_ensemble_pred.mean() * 100
]

fig.add_trace(
    go.Bar(x=model_names, y=anomaly_rates, name='Anomaly Rate (%)'),
    row=1, col=2
)

# 3. PCA Visualization
pca = PCA(n_components=2)
X_test_pca = pca.fit_transform(X_test_scaled)

fig.add_trace(
    go.Scatter(
        x=X_test_pca[:, 0],
        y=X_test_pca[:, 1],
        mode='markers',
        marker=dict(
            color=test_risk_ensemble,
            colorscale='RdYlBu_r',
            size=5,
            colorbar=dict(title="Risk Score", x=0.45)
        ),
        text=[f"Risk: {r:.1f}" for r in test_risk_ensemble],
        name='Transactions'
    ),
    row=2, col=1
)

# 4. Risk vs Amount
fig.add_trace(
    go.Scatter(
        x=X_test['amount'],
        y=test_risk_ensemble,
        mode='markers',
        marker=dict(
            color=test_ensemble_pred,
            colorscale='RdBu',
            size=5,
            colorbar=dict(title="Anomaly", x=1.02)
        ),
        text=[f"Amount: ${a:.2f}<br>Risk: {r:.1f}" 
              for a, r in zip(X_test['amount'], test_risk_ensemble)],
        name='Risk vs Amount'
    ),
    row=2, col=2
)

# Update layout
fig.update_layout(
    height=800,
    showlegend=False,
    title_text="Unsupervised Anomaly Detection Results"
)

fig.update_xaxes(title_text="Risk Score", row=1, col=1)
fig.update_yaxes(title_text="Count", row=1, col=1)
fig.update_yaxes(title_text="Anomaly Rate (%)", row=1, col=2)
fig.update_xaxes(title_text="First Principal Component", row=2, col=1)
fig.update_yaxes(title_text="Second Principal Component", row=2, col=1)
fig.update_xaxes(title_text="Transaction Amount ($)", row=2, col=2)
fig.update_yaxes(title_text="Risk Score", row=2, col=2)

fig.show()

# Save figure
fig.write_html("/tmp/anomaly_detection_dashboard.html")
print("✓ Dashboard saved")

# COMMAND ----------

# CELL 10: Create Production-Ready Anomaly Detector Class
class TransactionAnomalyDetector(mlflow.pyfunc.PythonModel):
    """
    Production-ready anomaly detector using ensemble approach.
    Returns risk scores and explanations.
    """
    
    def __init__(self, iso_forest, lof, scaler, feature_names):
        self.iso_forest = iso_forest
        self.lof = lof
        self.scaler = scaler
        self.feature_names = feature_names
    
    def predict(self, context, model_input):
        """
        Detect anomalies and return risk scores with explanations.
        """
        try:
            # Ensure DataFrame
            if not isinstance(model_input, pd.DataFrame):
                model_input = pd.DataFrame(model_input)
            
            # Check and add missing features
            for feat in self.feature_names:
                if feat not in model_input.columns:
                    model_input[feat] = 0
            
            # Select and order features
            X = model_input[self.feature_names].fillna(0)
            
            # Scale features
            X_scaled = self.scaler.transform(X)
            
            # Get predictions from both models
            iso_pred = self.iso_forest.predict(X_scaled)
            iso_scores = self.iso_forest.score_samples(X_scaled)
            
            lof_pred = self.lof.predict(X_scaled)
            lof_scores = self.lof.score_samples(X_scaled)
            
            # Convert to risk scores (0-100)
            iso_risk = (1 - (iso_scores - iso_scores.min()) / 
                       (iso_scores.max() - iso_scores.min() + 1e-5)) * 100
            lof_risk = (1 - (lof_scores - lof_scores.min()) / 
                       (lof_scores.max() - lof_scores.min() + 1e-5)) * 100
            
            # Ensemble risk score
            risk_score = (iso_risk + lof_risk) / 2
            
            # Determine if anomaly (at least one model flags it)
            is_anomaly = ((iso_pred == -1) | (lof_pred == -1)).astype(int)
            
            # Generate explanations
            explanations = []
            for idx in range(len(X)):
                row = X.iloc[idx]
                risk = risk_score[idx]
                anomaly = is_anomaly[idx]
                
                if anomaly:
                    # Find top contributing features
                    feature_values = row.values
                    feature_importance = np.abs(feature_values - np.median(X.values, axis=0))
                    top_features_idx = np.argsort(feature_importance)[-3:]
                    top_features = [self.feature_names[i] for i in top_features_idx]
                    
                    explanation = f"Anomaly detected (risk: {risk:.1f}%). Key factors: {', '.join(top_features)}"
                else:
                    explanation = f"Normal transaction (risk: {risk:.1f}%)"
                
                explanations.append(explanation)
            
            # Return results
            return pd.DataFrame({
                'risk_score': risk_score,
                'is_anomaly': is_anomaly,
                'isolation_forest_anomaly': (iso_pred == -1).astype(int),
                'lof_anomaly': (lof_pred == -1).astype(int),
                'explanation': explanations
            })
            
        except Exception as e:
            # Return error response
            return pd.DataFrame({
                'risk_score': [50.0],
                'is_anomaly': [0],
                'isolation_forest_anomaly': [0],
                'lof_anomaly': [0],
                'explanation': [f'Error: {str(e)}']
            })

# Create and log the custom model
with mlflow.start_run(run_name="anomaly_detector_custom"):
    
    # Create detector instance
    detector = TransactionAnomalyDetector(
        iso_forest=iso_forest,
        lof=lof,
        scaler=scaler,
        feature_names=feature_names
    )
    
    # Test the detector
    test_sample = X_test.iloc[:5]
    test_results = detector.predict(None, test_sample)
    print("\nTest Results from Custom Detector:")
    print(test_results)
    
    # Log the custom model
    mlflow.pyfunc.log_model(
        "anomaly_detector",
        python_model=detector,
        input_example=X_test.iloc[:5],
        registered_model_name="transaction_anomaly_detector_ensemble",
        conda_env={
            'channels': ['defaults'],
            'dependencies': [
                'python=3.8',
                'pip',
                {
                    'pip': [
                        'mlflow',
                        'scikit-learn==1.0.2',
                        'pandas',
                        'numpy',
                        'joblib'
                    ]
                }
            ]
        }
    )
    
    print("✓ Custom anomaly detector logged to MLflow")

# COMMAND ----------

# CELL 11: Deploy to Azure ML
# Initialize Azure ML client
credential = DefaultAzureCredential()
ml_client = MLClient(
    credential=credential,
    subscription_id=AZURE_SUBSCRIPTION_ID,
    resource_group_name=AZURE_RESOURCE_GROUP,
    workspace_name=AZURE_ML_WORKSPACE
)

print(f"✓ Connected to Azure ML Workspace: {AZURE_ML_WORKSPACE}")

# COMMAND ----------

# CELL 12: Register Model and Create Endpoint
from mlflow.tracking import MlflowClient

client = MlflowClient()

# Get the latest model version
model_name = "transaction_anomaly_detector_ensemble"
try:
    latest_version = client.get_latest_versions(model_name)[0].version
    model_uri = f"models:/{model_name}/{latest_version}"
    print(f"✓ Model URI: {model_uri}")
    
    # Create Azure ML model
    azure_model = Model(
        path=model_uri,
        name="transaction-anomaly-detector",
        description="Unsupervised anomaly detection using Isolation Forest and LOF ensemble",
        type="mlflow_model",
        version=latest_version
    )
    
    # Register in Azure ML
    registered_model = ml_client.models.create_or_update(azure_model)
    print(f"✓ Model registered in Azure ML: {registered_model.name} v{registered_model.version}")
    
except Exception as e:
    print(f"⚠️ Model registration skipped: {e}")
    print("  (This is normal if you haven't registered the model yet)")

# COMMAND ----------

# CELL 13: Create Deployment
endpoint_name = "transaction-anomaly-unsupervised"

try:
    # Create endpoint
    endpoint = ManagedOnlineEndpoint(
        name=endpoint_name,
        description="Unsupervised anomaly detection for transactions",
        auth_mode="key"
    )
    
    ml_client.online_endpoints.begin_create_or_update(endpoint).result()
    print(f"✓ Endpoint created: {endpoint_name}")
    
    # Create deployment
    deployment = ManagedOnlineDeployment(
        name="blue",
        endpoint_name=endpoint_name,
        model=registered_model,
        instance_type="Standard_DS3_v2",
        instance_count=1,
        request_settings={
            "request_timeout_ms": 60000,
            "max_concurrent_requests_per_instance": 2
        }
    )
    
    ml_client.online_deployments.begin_create_or_update(deployment).result()
    
    # Set traffic
    endpoint.traffic = {"blue": 100}
    ml_client.online_endpoints.begin_create_or_update(endpoint).result()
    
    print(f"✓ Model deployed to endpoint: {endpoint_name}")
    
except Exception as e:
    print(f"⚠️ Deployment skipped: {e}")
    print("  (You can deploy manually through Azure ML Studio)")

# COMMAND ----------

# CELL 14: Test the Deployed Model
# Create test data representing different anomaly patterns
test_scenarios = [
    {
        "name": "Normal Transaction",
        "data": {
            "amount": 150,
            "amount_zscore": 0.5,
            "amount_deviation": 0.5,
            "amount_ratio": 1.2,
            "amount_log": np.log1p(150),
            "is_round_amount": 0,
            "is_large_amount": 0,
            "hour": 14,
            "day_of_week": 2,
            "is_weekend": 0,
            "is_night_transaction": 0,
            "is_business_hours": 1,
            "merchant_category_frequency": 0.15,
            "location_frequency": 0.30,
            "device_frequency": 0.25,
            "customer_risk_normalized": 0.3,
            "credit_score_normalized": 0.7,
            "high_amount_low_credit": 0,
            "night_high_amount": 0
        }
    },
    {
        "name": "Suspicious Transaction (High Amount at Night)",
        "data": {
            "amount": 5000,
            "amount_zscore": 4.5,
            "amount_deviation": 4.5,
            "amount_ratio": 10,
            "amount_log": np.log1p(5000),
            "is_round_amount": 1,
            "is_large_amount": 1,
            "hour": 3,
            "day_of_week": 0,
            "is_weekend": 0,
            "is_night_transaction": 1,
            "is_business_hours": 0,
            "merchant_category_frequency": 0.01,  # Rare merchant
            "location_frequency": 0.005,  # Rare location
            "device_frequency": 0.02,  # Uncommon device
            "customer_risk_normalized": 0.7,
            "credit_score_normalized": 0.4,
            "high_amount_low_credit": 1,
            "night_high_amount": 1
        }
    }
]

print("\nTesting Anomaly Detection:\n" + "="*50)

for scenario in test_scenarios:
    # Prepare test data
    test_df = pd.DataFrame([scenario["data"]])
    
    # Get predictions using the detector
    results = detector.predict(None, test_df)
    
    print(f"\n{scenario['name']}:")
    print(f"  Risk Score: {results['risk_score'].iloc[0]:.1f}%")
    print(f"  Is Anomaly: {'Yes' if results['is_anomaly'].iloc[0] else 'No'}")
    print(f"  Explanation: {results['explanation'].iloc[0]}")

# COMMAND ----------

# CELL 15: Summary and Analysis
# Analyze what types of transactions are being flagged
anomaly_analysis = pd.DataFrame({
    'transaction_id': ids_test[test_ensemble_pred == 1],
    'risk_score': test_risk_ensemble[test_ensemble_pred == 1],
    'amount': X_test.iloc[test_ensemble_pred == 1]['amount'].values,
    'amount_deviation': X_test.iloc[test_ensemble_pred == 1]['amount_deviation'].values,
    'hour': X_test.iloc[test_ensemble_pred == 1]['hour'].values,
    'merchant_freq': X_test.iloc[test_ensemble_pred == 1]['merchant_category_frequency'].values
})

print("""
================================================================================
UNSUPERVISED ANOMALY DETECTION - SUMMARY
================================================================================

✅ Models Trained:
-----------------
1. Isolation Forest - Detects global anomalies
2. Local Outlier Factor - Detects local anomalies
3. Ensemble Model - Combines both approaches

📊 Performance Metrics:
----------------------""")
print(f"• Isolation Forest: {(test_predictions_iso == -1).mean():.2%} anomaly rate")
print(f"• LOF: {(test_predictions_lof == -1).mean():.2%} anomaly rate")
print(f"• Ensemble: {test_ensemble_pred.mean():.2%} anomaly rate")

print(f"""
🎯 Anomaly Characteristics:
---------------------------
• Average amount in anomalies: ${anomaly_analysis['amount'].mean():.2f}
• Average amount deviation: {anomaly_analysis['amount_deviation'].mean():.2f}σ
• Most common hour: {anomaly_analysis['hour'].mode().values[0] if len(anomaly_analysis) > 0 else 'N/A'}

🔍 Key Advantages of Unsupervised Approach:
-------------------------------------------
• No labeled fraud data required
• Detects novel fraud patterns
• Adapts to changing behavior
• Lower false positive rate
• Explainable results

🚀 Integration Ready:
--------------------
• Model: transaction_anomaly_detector_ensemble
• Endpoint: transaction-anomaly-unsupervised
• Input: 20 behavioral features
• Output: Risk score (0-100) + explanation

⚠️ Note for Production:
-----------------------
• Retrain periodically with new data
• Monitor anomaly rate drift
• Adjust contamination parameter based on business needs
• Consider feedback loop for confirmed fraud cases

================================================================================
""")

# COMMAND ----------

# CELL 16: Save Key Artifacts
# Save important artifacts for later use
artifacts = {
    'feature_names': feature_names,
    'model_performance': {
        'isolation_forest_anomaly_rate': float((test_predictions_iso == -1).mean()),
        'lof_anomaly_rate': float((test_predictions_lof == -1).mean()),
        'ensemble_anomaly_rate': float(test_ensemble_pred.mean())
    },
    'threshold_settings': {
        'contamination': 0.05,
        'iso_forest_estimators': 100,
        'lof_neighbors': 20
    }
}

with open('/tmp/anomaly_detection_artifacts.json', 'w') as f:
    json.dump(artifacts, f, indent=2)

print("✓ Artifacts saved to /tmp/anomaly_detection_artifacts.json")

# Save the models separately for backup
joblib.dump(iso_forest, '/tmp/isolation_forest.pkl')
joblib.dump(lof, '/tmp/lof_model.pkl')
print("✓ Models saved as pickle files for backup")