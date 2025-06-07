# AML/KYC Backend Test Suite

This directory contains comprehensive test scripts for the AML/KYC backend implementation.

## Test Files

### `test_mongodb_entities.py`

- **Purpose**: Tests MongoDB connection and entity data setup
- **Features**:
  - Verifies MongoDB connectivity
  - Checks entities collection status
  - Creates sample entity data if needed
  - Tests basic collection operations
- **Usage**: `python3 test_mongodb_entities.py`

### `test_aml_api.py`

- **Purpose**: Comprehensive API endpoint testing
- **Features**:
  - Health check endpoints (`/`, `/health`, `/test`)
  - Entity listing with pagination (`/entities/`)
  - Entity detail retrieval (`/entities/{entity_id}`)
  - Error handling (404 for missing entities)
  - Edge cases and validation
- **Usage**: `python3 test_aml_api.py [--url http://localhost:8001]`

### `run_tests.sh`

- **Purpose**: Automated test suite runner
- **Features**:
  - Runs all tests in correct sequence
  - Checks prerequisites and dependencies
  - Verifies AML API server is running
  - Provides colored output and clear status reporting
- **Usage**: `./run_tests.sh`

## Prerequisites

### Required Software

- Python 3.10+
- MongoDB (local or Atlas)
- AML backend server running on port 8001

### Required Python Packages

```bash
pip install requests pymongo python-dotenv
```

### Environment Setup

Ensure these environment variables are configured:

```bash
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/
DB_NAME=fsi-threatsight360
```

## Quick Start

1. **Set up environment**:

   ```bash
   cd aml-backend
   cp .env.example .env
   # Edit .env with your MongoDB connection details
   ```

2. **Start AML backend**:

   ```bash
   cd aml-backend
   poetry install
   poetry run uvicorn main:app --host 0.0.0.0 --port 8001 --reload
   ```

3. **Run all tests**:
   ```bash
   cd tests
   ./run_tests.sh
   ```

## Individual Test Execution (use poetry instead of python3)

### MongoDB Tests Only

```bash
python3 test_mongodb_entities.py
```

### API Tests Only

```bash
python3 test_aml_api.py
```

### API Tests with Custom URL

```bash
python3 test_aml_api.py --url http://localhost:8001
```

## Test Coverage

### Health Endpoints

- ✅ Root endpoint (`/`)
- ✅ Health check (`/health`)
- ✅ Test endpoint (`/test`)

### Entity Management

- ✅ List entities with pagination (`GET /entities/`)
- ✅ Filter entities by type and risk level
- ✅ Get entity details (`GET /entities/{entity_id}`)
- ✅ Handle missing entities (404 errors)

### Data Validation

- ✅ Pagination parameters (skip, limit)
- ✅ Entity data structure validation
- ✅ MongoDB connection stability
- ✅ Error response formats

### Edge Cases

- ✅ Invalid pagination parameters
- ✅ Large limit values
- ✅ Nonexistent entity IDs
- ✅ Empty collections

## Sample Test Data

The MongoDB test creates sample entities with different risk profiles:

1. **ENT_001** - John Smith (LOW risk individual)
2. **ENT_002** - Maria Garcia (HIGH risk individual with PEP status)
3. **ENT_003** - Tech Solutions Inc (MEDIUM risk organization)

## Troubleshooting

### Common Issues

**MongoDB Connection Failed**

- Verify MONGODB_URI in .env file
- Check network connectivity to MongoDB Atlas
- Ensure IP whitelist includes your address

**AML API Server Not Running**

- Start the server: `poetry run uvicorn main:app --host 0.0.0.0 --port 8001 --reload`
- Check port 8001 is not in use by another process
- Verify dependencies are installed: `poetry install`

**Missing Python Packages**

```bash
pip install requests pymongo python-dotenv
```

**Permission Denied on run_tests.sh**

```bash
chmod +x run_tests.sh
```

### Test Output Interpretation

**✅ PASS**: Test completed successfully
**❌ FAIL**: Test failed - check error message for details
**⚠️ WARNING**: Test completed with warnings

## Contributing

When adding new tests:

1. Follow the existing naming convention
2. Include comprehensive error handling
3. Provide clear status messages
4. Update this README with new test descriptions
