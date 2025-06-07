#!/bin/bash

# AML/KYC Test Suite Runner
# This script runs all tests for the AML/KYC backend implementation

echo "🧪 AML/KYC Test Suite Runner"
echo "=============================="

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    local status=$1
    local message=$2
    case $status in
        "INFO")
            echo -e "${YELLOW}ℹ️  $message${NC}"
            ;;
        "SUCCESS")
            echo -e "${GREEN}✅ $message${NC}"
            ;;
        "ERROR")
            echo -e "${RED}❌ $message${NC}"
            ;;
    esac
}

# Check if we're in the right directory
if [ ! -f "test_aml_api.py" ]; then
    print_status "ERROR" "Please run this script from the tests directory"
    exit 1
fi

# Check Python availability
if ! command -v python3 &> /dev/null; then
    print_status "ERROR" "Python3 is not installed or not in PATH"
    exit 1
fi

# Check required packages
print_status "INFO" "Checking required Python packages..."
python3 -c "import requests, pymongo, python_dotenv" 2>/dev/null
if [ $? -ne 0 ]; then
    print_status "ERROR" "Required packages not installed. Please install: requests pymongo python-dotenv"
    exit 1
fi

print_status "SUCCESS" "Required packages are available"

# Step 1: Test MongoDB Connection and Entities
print_status "INFO" "Step 1: Testing MongoDB connection and entities..."
python3 test_mongodb_entities.py
mongodb_exit_code=$?

if [ $mongodb_exit_code -eq 0 ]; then
    print_status "SUCCESS" "MongoDB tests passed"
else
    print_status "ERROR" "MongoDB tests failed"
    echo ""
    print_status "INFO" "Please ensure:"
    echo "  - MongoDB is running and accessible"
    echo "  - MONGODB_URI is set in .env file" 
    echo "  - Database credentials are correct"
    exit 1
fi

echo ""

# Step 2: Check if AML API server is running
print_status "INFO" "Step 2: Checking if AML API server is running..."
AML_URL="http://localhost:8001"

# Test if server is reachable
curl -s "$AML_URL/test" > /dev/null 2>&1
if [ $? -eq 0 ]; then
    print_status "SUCCESS" "AML API server is running at $AML_URL"
else
    print_status "ERROR" "AML API server is not running at $AML_URL"
    echo ""
    print_status "INFO" "Please start the AML backend server:"
    echo "  cd ../aml-backend"
    echo "  poetry install"
    echo "  poetry run uvicorn main:app --host 0.0.0.0 --port 8001 --reload"
    exit 1
fi

echo ""

# Step 3: Run API Tests
print_status "INFO" "Step 3: Running AML API tests..."
python3 test_aml_api.py --url "$AML_URL"
api_exit_code=$?

if [ $api_exit_code -eq 0 ]; then
    print_status "SUCCESS" "API tests passed"
else
    print_status "ERROR" "API tests failed"
    exit 1
fi

echo ""
echo "🎉 All tests completed successfully!"
echo ""
print_status "INFO" "Test Summary:"
echo "  ✅ MongoDB connection and entities"
echo "  ✅ AML API endpoints"
echo "  ✅ Pagination and error handling"
echo ""
print_status "SUCCESS" "AML/KYC backend is ready for use!"