# ThreatSight 360 - Fraud Detection Backend

![MongoDB](https://img.shields.io/badge/MongoDB-%234ea94b.svg?style=for-the-badge&logo=mongodb&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi)
![Python](https://img.shields.io/badge/python-3670A0?style=for-the-badge&logo=python&logoColor=ffdd54)
![AWS](https://img.shields.io/badge/AWS-%23FF9900.svg?style=for-the-badge&logo=amazon-aws&logoColor=white)

**Real-time Financial Fraud Detection and Risk Assessment Backend Service**

This backend service provides comprehensive real-time fraud detection, transaction screening, and dynamic risk model management capabilities designed specifically for financial institutions requiring robust fraud prevention systems.

The fraud detection backend leverages [MongoDB Atlas Vector Search](https://www.mongodb.com/docs/atlas/atlas-vector-search/vector-search-overview/), [AWS Bedrock AI services](https://aws.amazon.com/bedrock/), and [MongoDB Change Streams](https://www.mongodb.com/docs/manual/changeStreams/) to deliver real-time fraud pattern recognition, intelligent risk scoring, and dynamic risk model management that scales with your transaction volume.

## Key Features

- **🎯 Real-time Fraud Detection**: Multi-factor risk assessment with pattern recognition
- **🔍 Vector-based Pattern Matching**: AI-powered similarity analysis using MongoDB Atlas Vector Search
- **⚡ Dynamic Risk Models**: Configurable risk models with real-time updates via MongoDB Change Streams
- **🤖 AI-Powered Analysis**: AWS Bedrock integration for embedding generation and fraud pattern analysis
- **📊 Transaction Screening**: Real-time transaction evaluation against historical patterns
- **🔄 Live Model Updates**: Hot-reload risk models without service restart
- **📈 Performance Metrics**: False positive/negative tracking and model effectiveness analysis

## Architecture Overview

The fraud detection backend follows a **modular architecture** with clear separation of concerns:

### **Models Layer** (Data Structures)

- **`models/transaction.py`**: Transaction data models with fraud indicators
- **`models/customer.py`**: Customer profiles and transaction history
- **`models/fraud_pattern.py`**: Fraud pattern definitions and risk indicators

### **Services Layer** (Business Logic)

- **`services/fraud_detection.py`**: Core fraud detection algorithms and risk scoring
- **`services/risk_model_service.py`**: Dynamic risk model management with Change Streams
- **`bedrock/embeddings.py`**: AWS Bedrock integration for vector embeddings
- **`bedrock/chat_completions.py`**: AI-powered fraud analysis and explanations

### **Routes Layer** (API Endpoints)

- **`routes/transaction.py`**: Transaction evaluation and fraud screening
- **`routes/model_management.py`**: Risk model CRUD operations
- **`routes/customer.py`**: Customer profile management
- **`routes/fraud_pattern.py`**: Fraud pattern management

### **Database Layer** (MongoDB Integration)

- **`db/mongo_db.py`**: MongoDB connection management with connection pooling
- **Vector Search Integration**: Atlas Vector Search for pattern matching
- **Change Streams**: Real-time model synchronization

## Prerequisites

Before you begin, ensure you have the following:

- **Python 3.10+**: Required for the backend service
- **Poetry**: For dependency management and virtual environments
- **MongoDB Atlas Account**: For data storage and vector search capabilities
- **AWS Account with Bedrock Access**: For AI-powered fraud detection features
- **Docker (Optional)**: For containerized deployment

## Quick Start

### 1. Installation

Navigate to the backend directory and install dependencies:

```bash
cd backend
poetry install
```

### 2. Environment Configuration

Create a `.env` file in the `backend` directory:

```bash
# MongoDB Connection
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/
DB_NAME=fsi-threatsight360

# AWS Bedrock Credentials
AWS_ACCESS_KEY_ID=your_aws_access_key_here
AWS_SECRET_ACCESS_KEY=your_aws_secret_key_here
AWS_REGION=us-east-1

# Server Configuration
HOST=0.0.0.0
PORT=8000

# Frontend URL for CORS
FRONTEND_URL=http://localhost:3000

# Risk Assessment Thresholds
AMOUNT_THRESHOLD_MULTIPLIER=2.5
MAX_LOCATION_DISTANCE_KM=100
VELOCITY_TIME_WINDOW_MINUTES=10
VELOCITY_THRESHOLD=5
SIMILARITY_THRESHOLD=0.8

# Risk Weights
WEIGHT_AMOUNT=0.25
WEIGHT_LOCATION=0.25
WEIGHT_DEVICE=0.20
WEIGHT_VELOCITY=0.15
WEIGHT_PATTERN=0.15
```

### 3. Start Development Server

```bash
# Using Poetry
poetry run uvicorn main:app --host 0.0.0.0 --port 8000 --reload

# Or directly with Python
python main.py
```

The API will be available at [http://localhost:8000](http://localhost:8000) with interactive documentation at [http://localhost:8000/docs](http://localhost:8000/docs).

## MongoDB Atlas Configuration

### Required Indexes

#### 1. Transaction Vector Index

Create a vector search index named `transaction_vector_index` on the `transactions` collection:

```json
{
  "mappings": {
    "dynamic": true,
    "fields": {
      "vector_embedding": {
        "type": "knnVector",
        "dimensions": 1536,
        "similarity": "cosine"
      }
    }
  }
}
```

#### 2. Enable Change Streams

Ensure your MongoDB Atlas cluster has Change Streams enabled (available in all tiers including M0 free tier).

## Key API Endpoints

### Transaction Evaluation

**POST** `/api/v1/transactions/evaluate`

Evaluates a transaction for fraud risk in real-time:

```json
{
  "transactionId": "TXN-001",
  "customerId": "CUST-001", 
  "amount": 5000.00,
  "transactionType": "purchase",
  "merchantCategory": "electronics",
  "location": {
    "latitude": 40.7128,
    "longitude": -74.0060,
    "city": "New York",
    "country": "US"
  },
  "deviceInfo": {
    "deviceId": "device-123",
    "ipAddress": "192.168.1.1",
    "userAgent": "Mozilla/5.0..."
  }
}
```

**Response includes:**
- Overall risk score (0-100)
- Risk level (low/medium/high/critical)
- Individual risk factor scores
- Vector similarity analysis
- Recommended action (approve/review/block)

### Risk Model Management

**GET** `/api/v1/risk-models`
- Retrieve all available risk models

**GET** `/api/v1/risk-models/active`
- Get the currently active risk model

**POST** `/api/v1/risk-models`
- Create a new risk model

**PUT** `/api/v1/risk-models/{model_id}`
- Update an existing risk model

**POST** `/api/v1/risk-models/{model_id}/activate`
- Activate a specific risk model

### Customer Management

**GET** `/api/v1/customers/{customer_id}`
- Retrieve customer profile and transaction history

**POST** `/api/v1/customers`
- Create new customer profile

**PUT** `/api/v1/customers/{customer_id}`
- Update customer information

### Fraud Pattern Management

**GET** `/api/v1/fraud-patterns`
- Retrieve all fraud patterns

**POST** `/api/v1/fraud-patterns`
- Create new fraud pattern

**DELETE** `/api/v1/fraud-patterns/{pattern_id}`
- Remove fraud pattern

## Risk Model Configuration

Risk models are dynamically configurable and support:

### Risk Factors

- **Amount Analysis**: Unusual transaction amounts based on customer history
- **Location Analysis**: Geographic anomalies and impossible travel detection
- **Device Analysis**: New or suspicious device detection
- **Velocity Analysis**: Transaction frequency and pattern analysis
- **Pattern Matching**: Vector similarity against known fraud patterns

### Model Structure

```json
{
  "name": "Enhanced Fraud Detection Model",
  "version": 2,
  "active": true,
  "riskFactors": [
    {
      "name": "amount_analysis",
      "weight": 0.25,
      "enabled": true,
      "config": {
        "threshold_multiplier": 2.5
      }
    },
    {
      "name": "location_analysis", 
      "weight": 0.25,
      "enabled": true,
      "config": {
        "max_distance_km": 100
      }
    }
  ],
  "thresholds": {
    "flag": 60,
    "block": 80
  }
}
```

## Vector Search Implementation

The backend uses MongoDB Atlas Vector Search for advanced fraud pattern recognition:

### Features

- **Semantic Similarity**: Identifies similar transaction patterns using AI embeddings
- **Real-time Processing**: Sub-second pattern matching on large datasets
- **Contextual Analysis**: Considers multiple transaction attributes simultaneously
- **Adaptive Learning**: Continuously improves with new fraud patterns

### Implementation Details

1. **Embedding Generation**: AWS Bedrock Titan generates 1536-dimensional vectors
2. **Vector Storage**: MongoDB stores embeddings with transaction data
3. **Similarity Search**: Atlas Vector Search finds similar patterns
4. **Risk Scoring**: Combines vector similarity with traditional rules

## Development Tools

### Data Seeding

We provide comprehensive synthetic data generation through Google Colab notebooks:

#### Transaction Data Generation (Recommended)

Use the [Transaction Synthetic Data Generation notebook](../docs/ThreatSight360%20-%20Transaction%20Synthetic%20Data%20Generation.ipynb) in Google Colab:

1. Upload the notebook to [Google Colab](https://colab.research.google.com/)
2. Configure your MongoDB connection string in the notebook
3. Run all cells to generate realistic transaction data

The notebook provides:
- **Configurable Data Generation**: Adjust customer counts, transaction volumes, and fraud ratios
- **Realistic Transaction Patterns**: Normal spending behaviors vs. fraud scenarios  
- **Advanced Fraud Simulation**: Complex multi-factor fraud patterns
- **Vector Embedding Generation**: Pre-computed embeddings for vector search testing
- **Risk Model Variations**: Multiple risk model configurations

This generates:
- Sample customer profiles (configurable count)
- Transaction history with fraud patterns
- Risk models with different configurations
- Vector embeddings for pattern matching

### Testing

Run the test suite:

```bash
# Run all tests
poetry run pytest

# Run with coverage
poetry run pytest --cov=.

# Run specific test file
poetry run pytest tests/test_fraud_detection.py
```

### Linting and Formatting

```bash
# Format code with black
poetry run black .

# Check with flake8
poetry run flake8 .

# Type checking with mypy
poetry run mypy .
```

## Docker Deployment

Build and run with Docker:

```bash
# Build image
docker build -t threatsight360-fraud-backend .

# Run container
docker run -p 8000:8000 --env-file .env threatsight360-fraud-backend
```

## Performance Optimization

### Connection Pooling

The backend uses MongoDB connection pooling for optimal performance:

```python
# Configured in db/mongo_db.py
maxPoolSize=50
minPoolSize=10
maxIdleTimeMS=30000
```

### Caching Strategy

- Risk models cached in memory with Change Stream updates
- Customer profiles cached with TTL
- Vector embeddings pre-computed for known patterns

### Monitoring

Key metrics to monitor:

- Transaction evaluation latency (<100ms target)
- Vector search response time (<50ms target)
- Risk model update propagation (<1s target)
- False positive/negative rates

## Integration with Frontend

The fraud detection backend integrates with the frontend application through:

1. **Transaction Simulator**: Interactive testing of fraud scenarios
2. **Risk Model Management UI**: Visual configuration of risk models
3. **Real-time Updates**: WebSocket connections for live model changes
4. **Analytics Dashboard**: Performance metrics and model effectiveness

## Related Documentation

- [MongoDB Atlas Vector Search](https://www.mongodb.com/docs/atlas/atlas-vector-search/)
- [AWS Bedrock Documentation](https://docs.aws.amazon.com/bedrock/)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [MongoDB Change Streams](https://www.mongodb.com/docs/manual/changeStreams/)

## License

This project is licensed under the MIT License - see the [LICENSE](../LICENSE) file for details.