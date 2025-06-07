# AML/KYC Backend

This is the Anti-Money Laundering (AML) and Know Your Customer (KYC) backend component for ThreatSight 360, providing entity management capabilities separate from the fraud detection system.

## Overview

The AML/KYC backend provides RESTful APIs for managing and querying entity data including individuals and organizations with their risk assessments, watchlist matches, and compliance information.

## Features

- **Entity Management**: List and retrieve entity information
- **Risk Assessment**: Access entity risk scores and levels
- **Pagination**: Efficient data retrieval with pagination support
- **Filtering**: Filter entities by type and risk level
- **Error Handling**: Comprehensive error responses with proper HTTP status codes
- **Health Monitoring**: Health check endpoints for system monitoring

## Quick Start

### Prerequisites

- Python 3.10+
- Poetry for dependency management
- MongoDB (local or Atlas) with `fsi-threatsight360` database
- Environment variables configured

### Installation

1. **Navigate to AML backend directory**:
   ```bash
   cd aml-backend
   ```

2. **Install dependencies**:
   ```bash
   poetry install
   ```

3. **Configure environment**:
   ```bash
   cp .env.example .env
   # Edit .env with your MongoDB connection details
   ```

4. **Start the server**:
   ```bash
   poetry run uvicorn main:app --host 0.0.0.0 --port 8001 --reload
   ```

The API will be available at `http://localhost:8001`

### Environment Configuration

Create a `.env` file with the following variables:

```bash
# MongoDB Connection
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/
DB_NAME=fsi-threatsight360

# Server Configuration  
HOST=0.0.0.0
PORT=8001

# Frontend URL for CORS
FRONTEND_URL=http://localhost:3000
```

## API Endpoints

### Health Endpoints

- `GET /` - Root endpoint with service information
- `GET /health` - Health check with database connectivity
- `GET /test` - Simple connectivity test

### Entity Endpoints

- `GET /entities/` - List entities with pagination and filtering
- `GET /entities/{entity_id}` - Get detailed entity information

### Entity Listing Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `skip` | integer | 0 | Number of entities to skip |
| `limit` | integer | 20 | Maximum entities to return (max: 100) |
| `entity_type` | string | None | Filter by entity type (INDIVIDUAL, ORGANIZATION) |
| `risk_level` | string | None | Filter by risk level (LOW, MEDIUM, HIGH) |

## Data Models

### EntityBasic (List View)
```json
{
  "entityId": "ENT_001",
  "name_full": "John Smith", 
  "entityType": "INDIVIDUAL",
  "risk_score": 0.2,
  "risk_level": "LOW"
}
```

### EntityDetail (Detail View)
```json
{
  "entityId": "ENT_001",
  "entityType": "INDIVIDUAL",
  "name": {
    "full": "John Smith",
    "structured": {
      "first": "John",
      "last": "Smith"
    }
  },
  "dateOfBirth": "1985-03-15T00:00:00",
  "addresses": [...],
  "identifiers": [...],
  "riskAssessment": {
    "overall": {
      "score": 0.2,
      "level": "LOW"
    }
  },
  "watchlistMatches": [...],
  "profileSummaryText": "...",
  "created_at": "2024-01-01T00:00:00",
  "updated_at": "2024-01-01T00:00:00"
}
```

## Example Usage

### List Entities
```bash
curl "http://localhost:8001/entities/?limit=10&skip=0"
```

### Filter by Entity Type
```bash
curl "http://localhost:8001/entities/?entity_type=INDIVIDUAL"
```

### Get Entity Details
```bash
curl "http://localhost:8001/entities/ENT_001"
```

### Health Check
```bash
curl "http://localhost:8001/health"
```

## Testing

The AML backend includes comprehensive test coverage. See the `../tests/` directory for test scripts.

### Run All Tests
```bash
cd ../tests
./run_tests.sh
```

### Run Individual Tests
```bash
# MongoDB tests
python3 test_mongodb_entities.py

# API tests
python3 test_aml_api.py
```

## Project Structure

```
aml-backend/
├── main.py                 # FastAPI application
├── dependencies.py         # Dependencies and configuration
├── pyproject.toml         # Poetry dependencies
├── .env.example           # Environment template
├── models/
│   ├── __init__.py
│   └── entity.py          # Pydantic models
├── routes/
│   ├── __init__.py
│   └── entities.py        # Entity endpoints
└── db/
    └── mongo_db.py        # MongoDB access layer
```

## Error Handling

The API provides structured error responses:

- **404**: Entity not found
- **422**: Validation error (invalid parameters)
- **500**: Internal server error

Example error response:
```json
{
  "detail": "Entity with ID 'nonexistent' not found",
  "error_code": null
}
```

## Development

### Code Style
- Follow existing patterns from the main fraud detection backend
- Use type hints for all functions
- Include comprehensive docstrings
- Handle errors gracefully

### Adding New Endpoints
1. Create route in `routes/` directory
2. Add models in `models/` if needed
3. Update `main.py` to include new routes
4. Add tests in `../tests/`

## Performance Considerations

- **Pagination**: Always use pagination for large datasets
- **Indexing**: Ensure MongoDB has appropriate indexes on `entityId` and commonly filtered fields
- **Connection Pooling**: MongoDB connections are pooled automatically
- **Caching**: Consider adding caching for frequently accessed entities

## Security

- **CORS**: Configured for frontend integration
- **Input Validation**: All inputs validated using Pydantic
- **Error Handling**: Detailed errors only in development mode
- **Environment Variables**: Sensitive data stored in environment variables

## Deployment

For production deployment:

1. Set `reload=False` in uvicorn command
2. Use environment-specific `.env` files
3. Configure proper logging levels
4. Set up monitoring and health checks
5. Use reverse proxy (nginx) for SSL termination

## Troubleshooting

### Common Issues

**MongoDB Connection Failed**
- Check `MONGODB_URI` in `.env`
- Verify network connectivity and IP whitelist
- Ensure database name is correct

**Port Already in Use**
- Change `PORT` in `.env` file
- Kill existing process on port 8001

**Module Import Errors**
- Run `poetry install` to install dependencies
- Ensure you're in the virtual environment

## Support

For issues and questions:
- Check the test suite for examples
- Review the implementation log: `../AML-KYC-Implementation-Log.md`
- Examine the main fraud backend for similar patterns