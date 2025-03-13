# ThreatSight 360 - Fraud Detection System

ThreatSight 360 is an advanced fraud detection system for financial transactions, using MongoDB for data storage and AWS Bedrock for AI-powered risk assessment.

## System Overview

The system consists of two main components:

1. **Backend**: FastAPI application with fraud detection algorithms and MongoDB integration
2. **Frontend**: Next.js application with LeafyGreen UI components for transaction simulation and monitoring

## Features

- **Real-time Fraud Detection**: Evaluate transactions instantly using multiple detection strategies
- **Transaction Simulator**: Test different fraud scenarios with a user-friendly interface
- **Risk Assessment**: Comprehensive risk scoring based on multiple factors
- **Vector Similarity Search**: Find patterns similar to known fraud cases using Amazon Bedrock Titan embeddings

## Prerequisites

- Python 3.10+
- Node.js 18+
- MongoDB (local installation or Atlas cluster)
- AWS account with Bedrock access
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
4. Customize transaction details if needed
5. Click "Evaluate Transaction" to analyze without storing
6. Review the risk assessment results
7. Optionally, use "Submit & Store Transaction" to save the transaction

## Data Seeding

To seed initial customer and fraud pattern data:

```bash
cd backend
poetry run python scripts/seed_data.py
```

## Docker Deployment

Build and run with Docker Compose:

```bash
docker-compose up -d
```

## Documentation

- [Transaction Simulator Documentation](./TransactionSimulator-Documentation.md)
- [Fraud Detection Implementation](./ThreatSight360-Implementation.md)
- [API Documentation](http://localhost:8000/docs) (when backend is running)

## Testing

### Backend Tests

```bash
cd backend
poetry run pytest
```

### Frontend Tests

```bash
cd frontend
npm test
```

## Demo Scenarios

The Transaction Simulator includes several pre-configured scenarios:

1. **Normal Transaction**: A typical transaction that matches the customer's usual behavior
2. **Unusual Amount**: A transaction amount significantly higher than the customer's average
3. **Unusual Location**: A transaction from a geographic location far from usual areas
4. **New Device**: A transaction originating from a previously unused device
5. **Multiple Red Flags**: A transaction combining several suspicious indicators

## Architecture

### Backend Components

- **Fraud Detection Service**: Core detection engine with multiple strategies
- **MongoDB Integration**: Data access layer for customer and transaction data
- **Bedrock AI Integration**: Vector embeddings for pattern matching
- **API Endpoints**: RESTful interface for transaction processing

### Frontend Components

- **Transaction Simulator**: Interactive tool for testing fraud scenarios
- **LeafyGreen UI**: MongoDB's design system for consistent look and feel
- **Next.js Application**: Modern React framework for frontend development

## Troubleshooting

- **Backend Connection Issues**: Ensure MongoDB is running and credentials are correct
- **AWS Bedrock Errors**: Verify AWS credentials and region settings
- **Frontend API Errors**: Check the NEXT_PUBLIC_API_URL is correctly set

## License

This project is licensed under the MIT License - see the LICENSE file for details.
