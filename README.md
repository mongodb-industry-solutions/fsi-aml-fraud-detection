# ThreatSight 360 - Financial Fraud Detection System

ThreatSight 360 is an enterprise-grade fraud detection platform for financial institutions, leveraging MongoDB Atlas for data storage and AWS Bedrock for AI-powered risk assessment.

![ThreatSight 360 Platform](https://your-image-url-here.png)

## System Overview

ThreatSight 360 provides comprehensive fraud detection capabilities through two integrated components:

1. **Backend**: FastAPI-powered service for advanced fraud detection with MongoDB Vector Search, Change Streams and Atlas integration
2. **Frontend**: Responsive Next.js application with MongoDB's LeafyGreen UI for transaction simulation and real-time monitoring of risk models

## Key Features

- **Real-time Fraud Detection**: Process and evaluate transactions instantly with multi-strategy detection algorithms
- **Interactive Transaction Simulator**: Test different fraud scenarios with a highly configurable interface
- **Comprehensive Risk Assessment**: Multi-factor risk scoring based on transaction patterns, behavior analysis, and anomaly detection
- **Vector-based Fraud Pattern Recognition**: Leverages MongoDB Atlas Vector Search for semantic matching of transactions against known patterns
- **Bedrock-Powered AI**: Uses Amazon Bedrock Titan embeddings for high-quality semantic understanding and pattern recognition
- **Risk Model Management**: Dynamic risk model configuration with MongoDB-powered real-time updates, schema flexibility, and version control

## Prerequisites

- Python 3.10+
- Node.js 18+
- MongoDB Atlas account (or local MongoDB installation)
- AWS account with Bedrock access configured
- Docker (optional for containerized deployment)

## Setup Instructions

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/threatsight360.git
cd threatsight360
```

### 2. Backend Setup

#### Environment Configuration

Create a `.env` file in the `backend` directory:

```
# MongoDB Connection
MONGODB_URI=mongodb://localhost:27017
DB_NAME=threatsight360

# AWS Bedrock Credentials
AWS_ACCESS_KEY_ID=your_aws_access_key_here
AWS_SECRET_ACCESS_KEY=your_aws_secret_key_here
AWS_REGION=us-east-1

# Server Configuration
HOST=0.0.0.0
PORT=8000

# Frontend URL for CORS
FRONTEND_URL=http://localhost:3000
```

Replace with your actual MongoDB URI and AWS credentials.

#### Install Dependencies

```bash
cd backend
pip install poetry
poetry install
```

#### Start the Backend Server

```bash
poetry run uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

The backend API will be available at http://localhost:8000

### 3. Frontend Setup

#### Environment Configuration

Create a `.env.local` file in the `frontend` directory:

```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

#### Install Dependencies

```bash
cd frontend
npm install
```

#### Start the Frontend Development Server

```bash
npm run dev
```

The frontend application will be available at http://localhost:3000

## Using the Transaction Simulator

1. Navigate to http://localhost:3000/transaction-simulator
2. Select a customer from the dropdown
3. Choose a fraud scenario or configure your own:
   - Normal Transaction
   - Unusual Amount
   - Unusual Location
   - New Device
   - Multiple Red Flags
4. Customize transaction details if needed:
   - Transaction type (purchase, withdrawal, transfer, deposit)
   - Payment method
   - Amount
   - Merchant category
   - Location information
   - Device information
5. Click "Evaluate Transaction" to analyze the risk profile
6. Review the comprehensive risk assessment, including:
   - Traditional risk assessment based on rules and patterns
   - Advanced vector search for similar suspicious transactions
   - Multi-factor risk scoring with detailed breakdown
   - Context-aware filtering that prioritizes relevant transactions

## Using the Risk Model Management

1. Navigate to http://localhost:3000/risk-models
2. View and select from available risk models in the system
3. Key capabilities include:
   - **Dynamic Risk Factor Management**: Add or modify risk factors without system changes
   - **Real-Time Updates**: See changes instantly using MongoDB Change Streams
   - **Version Control**: Create and manage multiple versions of risk models
   - **Model Activation**: Easily switch between different models
   - **Performance Metrics**: Track effectiveness with false positive/negative rates
   - **Custom Thresholds**: Configure flag and block thresholds for each model
4. To create a new risk model:
   - Click "Create New Model"
   - Configure basic information (name, description)
   - Add risk factors with appropriate weights and thresholds
   - Set overall model thresholds
   - Save and optionally activate the model
5. All changes are reflected in real-time across all connected sessions thanks to MongoDB Change Streams

## Data Seeding

To seed initial customer profiles, transaction history, and fraud patterns:

```bash
cd backend
poetry run python scripts/seed_data.py
```

## Docker Deployment

For containerized deployment, use Docker Compose:

```bash
docker-compose up -d
```

This will build and run both frontend and backend containers with proper networking.


## Technology Stack

### Backend
- **FastAPI**: High-performance API framework
- **MongoDB Atlas**: Cloud database with vector search capabilities
- **AWS Bedrock**: AI foundation models for embeddings and analysis
- **Poetry**: Python dependency management
- **PyTest**: Testing framework

### Frontend
- **Next.js**: React framework with server-side rendering
- **LeafyGreen UI**: MongoDB's design system components
- **Axios**: HTTP client for API communication
- **React Hooks**: State management and side effects

## Architecture

### Backend Components

- **Fraud Detection Service**: Core detection engine with multiple strategies
- **Risk Model Service**: Dynamic risk model management with real-time updates
- **MongoDB Integration**: Data access layer for customer and transaction data
- **Bedrock AI Integration**: Vector embeddings for pattern matching
- **API Endpoints**: RESTful interface for transaction processing
- **WebSocket Service**: Real-time updates using MongoDB Change Streams

### Frontend Components

- **Transaction Simulator**: Interactive tool for testing fraud scenarios
- **Risk Model Management UI**: Admin interface for configuring and deploying risk models
- **LeafyGreen UI**: MongoDB's design system for consistent look and feel
- **Next.js Application**: Modern React framework for frontend development

## MongoDB Vector Search Implementation

ThreatSight 360 leverages MongoDB Atlas Vector Search for advanced pattern recognition:

1. Transaction descriptions are converted to vector embeddings using AWS Bedrock's Titan model
2. These embeddings capture semantic patterns that simple rule-based systems might miss
3. When evaluating a transaction, the system finds similar transactions by vector similarity
4. Results are filtered based on context and risk level to provide relevant insights
5. A composite risk score is calculated from vector similarity, amount correlation, and historical risk levels

To enable vector search in your MongoDB Atlas cluster:

1. Navigate to your database's "Search" tab
2. Click "Create Search Index"
3. Choose JSON editor and use the following configuration:

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

4. Name your index "transaction_vector_index"
5. Create the index

## Risk Model Management

ThreatSight 360 includes a flexible risk model management system that allows you to:

- Create and configure different risk assessment models
- Adjust risk thresholds and weights for various factors
- Test models against historical data
- Deploy models to production with version control
- Monitor model performance over time


## Architecture Diagram

```
┌─────────────────┐     ┌───────────────────┐     ┌─────────────────┐
│                 │     │                   │     │                 │
│  Next.js        │────▶│  FastAPI Backend  │────▶│  MongoDB Atlas  │
│  Frontend       │◀────│  with AI Models   │◀────│  with Vector    │
│                 │     │                   │     │  Search         │
└─────────────────┘     └───────────────────┘     └─────────────────┘
                                 │                        
                                 ▼                        
                        ┌─────────────────┐              
                        │                 │              
                        │  AWS Bedrock    │              
                        │  Foundation     │              
                        │  Models         │              
                        │                 │              
                        └─────────────────┘              
```

## Demo Scenarios

The Transaction Simulator includes pre-configured scenarios for testing:

1. **Normal Transaction**: A transaction matching the customer's typical behavior pattern
2. **Unusual Amount**: A transaction with an amount significantly above the customer's average
3. **Unusual Location**: A transaction originating from a location outside the customer's normal geographic patterns
4. **New Device**: A transaction from a device not previously associated with the customer
5. **Multiple Red Flags**: A high-risk transaction combining multiple suspicious indicators

## Troubleshooting

- **Database Connection Issues**: Verify your MongoDB connection string and network access settings
- **AWS Bedrock Errors**: Ensure your AWS credentials are valid and have appropriate permissions
- **Frontend API Errors**: Check that the backend server is running and CORS is properly configured
- **Docker Deployment Issues**: Verify port mappings and network settings in docker-compose.yml

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
