# ThreatSight 360 - Implementation Details

## System Overview

ThreatSight 360 is a fraud detection system for financial services that uses advanced data modeling and AI capabilities to identify suspicious activities. The system leverages MongoDB for data storage and Amazon Bedrock for AI capabilities.

## Architecture

The system consists of:

1. **Backend**: FastAPI application with MongoDB integration and Amazon Bedrock AI
2. **Frontend**: Next.js application (to be implemented)
3. **Database**: MongoDB with collections for customers, transactions, and fraud patterns

## Data Models

### Customer Profiles

Each customer profile contains:

- **Personal information**: Name, email, phone, address, date of birth
- **Account information**: Account number, type, creation date, status, credit score
- **Behavioral profile**:
  - **Devices**: List of devices used, with types, IPs, browsers and usual locations
  - **Transaction patterns**: Average amounts, frequency, merchant categories, common times and locations
- **Risk profile**: Overall risk score, risk factors, last assessment date

### Transactions

Each transaction record contains:

- Transaction metadata: ID, timestamp, amount, currency
- Customer reference
- Merchant information: Name, category, ID
- Location data as GeoJSON Point
- Device information
- Transaction type and payment method
- Risk assessment: Score, level, flags, classification

### Fraud Patterns

Each fraud pattern contains:

- Pattern name and description
- Severity level
- List of indicators
- Detection and false positive rates
- Vector embedding from Amazon Bedrock Titan

## AI Integration

The system uses Amazon Bedrock's Titan embedding model for:

1. **Generating embeddings** for fraud pattern descriptions
2. **Vector similarity search** to find patterns similar to new activities
3. **Anomaly detection** by comparing transaction embeddings to known patterns

Implementation details:

- `BedrockTitanEmbeddings` class interfaces with the Titan model
- Singleton pattern for efficient connection reuse
- Asynchronous functions for non-blocking embedding generation

## Fraud Detection System

The system implements a comprehensive fraud detection service that evaluates transactions across multiple dimensions:

### Detection Strategies

1. **Amount Anomalies**: 
   - Compares transaction amount against customer's normal spending patterns
   - Uses z-score calculation with configurable threshold
   - Flags transactions that deviate significantly from average amounts

2. **Location Anomalies**:
   - Uses geospatial analysis to detect unusual transaction locations
   - Calculates Haversine distance to customer's usual locations
   - Identifies transactions occurring far from usual areas

3. **Device Verification**:
   - Checks if the transaction device is known for the customer
   - Verifies device ID, type, operating system, and browser
   - Also checks IP address against known IP ranges

4. **Transaction Velocity**:
   - Detects unusual frequency of transactions in a short time window
   - Configurable time window (default 60 minutes)
   - Flags patterns like multiple transactions in rapid succession

5. **Pattern Matching**:
   - Uses vector embeddings to compare with known fraud patterns
   - Leverages MongoDB vector search capabilities (when available)
   - Falls back to indicator-based matching when vector search isn't available

### Risk Scoring

- Weighted scoring system for various risk factors
- Configurable thresholds for risk classification
- Automatic customer risk profile updates for high-risk transactions
- Complete model versioning system with proper version sequencing using MongoDB sort capabilities

### Implementation

The fraud detection service is implemented as a modular, injectable service:

```python
class FraudDetectionService:
    def __init__(self, db_client, db_name=None):
        # Initialize with database connection
        
    async def evaluate_transaction(self, transaction):
        # Evaluate transaction across all dimensions
        # Return risk assessment with score and flags
```

The service is used in the transaction API routes to:
1. Evaluate new transactions during creation
2. Allow standalone risk evaluation without storing transactions
3. Automatically update customer risk profiles

## API Endpoints

### Customer Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/customers` | List all customers with pagination |
| GET | `/customers/{id}` | Get a specific customer by ID |
| POST | `/customers` | Create a new customer profile |
| PUT | `/customers/{id}` | Update an existing customer |
| DELETE | `/customers/{id}` | Delete a customer profile |

### Transaction Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/transactions` | List transactions with filtering options |
| GET | `/transactions/{id}` | Get a specific transaction |
| GET | `/transactions/customer/{id}` | Get all transactions for a customer |
| GET | `/transactions/risk/high` | Get high-risk transactions |
| GET | `/transactions/flags/{flag_type}` | Get transactions with specific fraud flags |
| POST | `/transactions` | Record a new transaction with automatic fraud detection |
| POST | `/transactions/evaluate` | Evaluate transaction for fraud without storing it |

### Fraud Pattern Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/fraud-patterns` | List known fraud patterns |
| GET | `/fraud-patterns/{id}` | Get a specific pattern by ID |
| POST | `/fraud-patterns` | Create a new fraud pattern with embeddings |
| PUT | `/fraud-patterns/{id}` | Update a pattern (regenerates embeddings) |
| DELETE | `/fraud-patterns/{id}` | Delete a pattern |
| POST | `/fraud-patterns/similar-search` | Find similar patterns using vector search |

### Risk Model Management Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/models` | List all risk models with optional status filter |
| GET | `/models/{model_id}` | Get a specific risk model with optional version |
| POST | `/models` | Create a new risk model |
| PUT | `/models/{model_id}` | Update a risk model (creates new version for active models) |
| DELETE | `/models/{model_id}` | Archive a risk model |
| POST | `/models/{model_id}/activate` | Activate a specific model version |
| GET | `/models/{model_id}/performance` | Get performance metrics for a model |
| POST | `/models/{model_id}/feedback` | Record transaction outcome feedback |
| WebSocket | `/models/change-stream` | Real-time model updates via MongoDB Change Streams |

## Vector Search Implementation

The system uses MongoDB Atlas vector search for finding similar fraud patterns:

1. When creating or updating a fraud pattern:
   - The system calls Amazon Bedrock Titan model to generate embeddings for the pattern description
   - Embeddings are stored in MongoDB alongside the pattern data

2. When performing a similarity search:
   - The query text is converted to an embedding using Titan
   - MongoDB vector search is used to find patterns with similar embeddings
   - If vector search is not available, it falls back to text search

## Deployment

The application can be deployed using Docker:

- `Dockerfile.backend` for the FastAPI application
- `Dockerfile.frontend` for the Next.js application (to be implemented)
- `docker-compose.yml` for orchestrating both services

## Environment Variables

The application requires the following environment variables:

| Variable | Description |
|----------|-------------|
| `MONGODB_URI` | MongoDB connection string |
| `DB_NAME` | Database name (default: "threatsight360") |
| `AWS_ACCESS_KEY_ID` | AWS access key for Bedrock |
| `AWS_SECRET_ACCESS_KEY` | AWS secret key for Bedrock |
| `AWS_REGION` | AWS region (default: "eu-west-3") |
| `HOST` | Host to run the API on (default: "0.0.0.0") |
| `PORT` | Port to run the API on (default: "8000") |
| `FRONTEND_URL` | URL of the frontend for CORS |

## Next Steps

1. **Frontend Implementation**:
   - Dashboard for monitoring transactions
   - Risk visualization and alerts
   - Case management interface

2. **Advanced Features**:
   - Real-time fraud detection using streaming data
   - Rule-based system integration
   - Notification system for high-risk activities

3. **AI Enhancements**:
   - Fraud prediction models using transaction history
   - Behavior anomaly detection
   - Integration with Amazon Bedrock for conversational fraud analysis