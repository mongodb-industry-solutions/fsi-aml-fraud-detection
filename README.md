# MongoDB Fraud Detection Demo

This project demonstrates a modern web application for financial fraud detection using MongoDB Atlas Vector Search capabilities. It showcases a direct comparison between traditional rules-based fraud detection and vector similarity search approaches.

## Features

- Real-time fraud detection using both rules-based and vector similarity search
- Interactive transaction creation and testing
- Visual comparison of detection methods
- MongoDB Atlas Vector Search integration
- Responsive web interface built with Next.js

## Architecture

The application consists of:

- **Backend**: Python FastAPI with MongoDB integration, sentence-transformers for vector embeddings
- **Frontend**: Next.js with React components
- **Database**: MongoDB Atlas with Vector Search indexes

The application features:
- Automatic database and collection creation if they don't exist
- Robust error handling with clear feedback when required components are missing
- Vector search as a mandatory component for operation
- Detailed logging for troubleshooting and diagnostics
- Optimized MongoDB Atlas vector search integration

## Prerequisites

Before you begin, ensure you have:

- Python 3.10 (required for sentence-transformers compatibility)
- Node.js 14 or higher
- Docker and Docker Compose (optional, for containerized deployment)
- MongoDB Atlas account with Vector Search capability

## Setup

### MongoDB Atlas Configuration

1. Create a MongoDB Atlas cluster with Vector Search capability
2. Note your MongoDB connection string for the next steps

Note: The application will automatically create the database and collections if they don't exist. It will also create the required vector search index for the transactions collection.

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Copy the example environment file and configure your MongoDB connection:
   ```bash
   cp .env.example .env
   ```
   Edit the `.env` file with your MongoDB Atlas connection string

3. Set up a Python virtual environment using Poetry:
   ```bash
   make poetry_start
   make poetry_install
   ```

4. Start the backend server:
   ```bash
   poetry run uvicorn main:app --reload
   ```
   The API will be available at http://localhost:8000

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```
   The web interface will be available at http://localhost:3000

### Docker Deployment

To run the entire application using Docker:

1. Configure your MongoDB Atlas connection string in `backend/.env`

2. Build and start the containers:
   ```bash
   make build
   ```

3. Once the containers are running, access:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000

## Usage

1. Generate sample transactions via the UI or API endpoint
2. Create new transactions with different parameters
3. Observe the fraud detection results from both methods
4. Compare the effectiveness of rules-based vs. vector similarity approaches

## Troubleshooting

### Common Issues

1. **MongoDB Connection Issues**
   - Ensure your MongoDB Atlas connection string is correct in the `.env` file
   - The application automatically creates necessary database objects, but requires proper connection credentials
   - Check MongoDB Atlas network access settings to ensure your IP is whitelisted

2. **Vector Search Setup**
   - MongoDB Atlas M0 (free) clusters don't support vector search capabilities
   - Ensure your cluster has Vector Search enabled in the Atlas dashboard
   - The application will attempt to create the vector search index automatically
   - Vector search is required for the application to function properly
   - The application will fail with a clear error message if vector search is not available

3. **Sample Data Generation**
   - If generating sample data fails initially, try again as the system may now have created the required indexes
   - The system will attempt to create and return as many transactions as possible, even if some fail
   - Check the backend logs for detailed error information if sample generation is consistently failing

4. **Frontend API Communication**
   - If the frontend can't connect to the backend, check that the backend is running on port 8000
   - API routes in Next.js require a proper restart when modified
   - The frontend includes enhanced error handling to provide better feedback about backend issues

## License

This project is licensed under the MIT License - see the LICENSE file for details.
