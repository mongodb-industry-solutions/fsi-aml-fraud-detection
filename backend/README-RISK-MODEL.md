# Risk Model Management System - MongoDB Integration

## Overview
This project implements a Risk Model Management system for fraud detection using MongoDB as the database. The implementation showcases key advantages of MongoDB over traditional SQL databases, particularly:

1. **Schema Flexibility**: Add custom risk factors without schema migrations
2. **Real-Time Updates**: Use Change Streams for instant notifications
3. **Document Model**: Natural data representation with embedded risk factors
4. **Versioning**: Complete model versions stored as separate documents

## Implementation Files

### Backend
- `/backend/routes/model_management.py`: API endpoints for model CRUD operations
- `/backend/services/risk_model_service.py`: Service for managing risk models and Change Streams
- `/backend/dependencies.py`: MongoDB connection and service initialization

### Frontend
- `/frontend/components/ModelAdminPanel.js`: UI component for model management with real-time updates

## Features

### MongoDB-Powered Features
- **Dynamic Risk Factors**: Add new risk factors on-the-fly without schema migrations
- **Real-Time Model Updates**: WebSocket + Change Streams for instant notifications
- **Complete Document Model**: All model data in a single document without JOINs
- **Versioned Models**: Automatic versioning with full model history using MongoDB sort capabilities to ensure proper version sequencing
- **Performance Tracking**: Risk factor distribution and effectiveness metrics

### API Endpoints
- `GET /models/`: List all risk models
- `GET /models/{model_id}`: Get a specific risk model
- `POST /models/`: Create a new risk model
- `PUT /models/{model_id}`: Update an existing model
- `DELETE /models/{model_id}`: Archive a risk model
- `POST /models/{model_id}/activate`: Activate a specific model
- `GET /models/{model_id}/performance`: Get performance metrics
- `POST /models/{model_id}/feedback`: Record transaction outcome feedback
- `WebSocket /models/change-stream`: Real-time model updates via Change Streams

## Demo Flow
For detailed demo instructions, see [RISK_MODEL_MANAGEMENT_IMPLEMENTATION.md](./RISK_MODEL_MANAGEMENT_IMPLEMENTATION.md)

### Quick Demo Steps
1. **Model Selection**: View and select different risk models
2. **Schema Flexibility**: Add a custom risk factor without schema migrations
3. **Real-Time Updates**: See changes instantly across multiple sessions
4. **Document Model**: Examine the complete model structure
5. **Version Management**: Create a new version and activate models
6. **Performance Metrics**: View risk factor distribution and effectiveness

## MongoDB Advantages Highlighted
- Add new fields without migrations vs. SQL ALTER TABLE operations
- Real-time updates via Change Streams vs. SQL polling or triggers
- Natural document structure vs. SQL table joins
- Simple versioning with complete documents vs. SQL change tracking

## Setup Requirements
- MongoDB Atlas cluster (M0 or higher)
- Python 3.9+ with FastAPI and Motor/PyMongo
- Node.js with React for the frontend
- WebSockets enabled (install `websockets` library if needed)

## Running the Application
1. Install dependencies: `poetry install` (backend) and `npm install` (frontend)
2. Configure MongoDB connection in `.env`
3. Start backend: `poetry run uvicorn main:app --reload`
4. Start frontend: `npm run dev`
5. Navigate to Risk Model Management page in the application

For detailed implementation information, see [RISK_MODEL_MANAGEMENT_IMPLEMENTATION.md](./RISK_MODEL_MANAGEMENT_IMPLEMENTATION.md)