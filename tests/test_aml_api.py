#!/usr/bin/env python3
"""
Comprehensive test script for the AML/KYC API endpoints.

This script tests all the endpoints and functionality of the AML backend:
- Health check endpoints
- Entity listing with pagination
- Entity detail retrieval
- Error handling for missing entities
- Pagination edge cases

Prerequisites:
1. AML backend server should be running (typically on port 8001)
2. MongoDB should be connected and have entities collection
3. Required Python packages: requests

Usage:
    python test_aml_api.py
"""

import requests
import json
import sys
from typing import Dict, List, Any
import time

class AMLAPITester:
    def __init__(self, base_url: str = "http://localhost:8001"):
        self.base_url = base_url
        self.session = requests.Session()
        self.test_results = []
        
    def log_test(self, test_name: str, success: bool, message: str = "", response_data: Any = None):
        """Log test result"""
        status = "✅ PASS" if success else "❌ FAIL"
        self.test_results.append({
            "test": test_name,
            "success": success,
            "message": message,
            "response_data": response_data
        })
        print(f"{status}: {test_name}")
        if message:
            print(f"    {message}")
        if not success and response_data:
            print(f"    Response: {response_data}")
        print()
    
    def test_health_endpoints(self):
        """Test health check endpoints"""
        print("=== Testing Health Endpoints ===")
        
        # Test root endpoint
        try:
            response = self.session.get(f"{self.base_url}/")
            if response.status_code == 200:
                data = response.json()
                self.log_test(
                    "Root endpoint",
                    True,
                    f"Status: {data.get('status')}, Service: {data.get('service')}"
                )
            else:
                self.log_test("Root endpoint", False, f"Status code: {response.status_code}")
        except Exception as e:
            self.log_test("Root endpoint", False, f"Exception: {str(e)}")
        
        # Test health endpoint
        try:
            response = self.session.get(f"{self.base_url}/health")
            if response.status_code == 200:
                data = response.json()
                self.log_test(
                    "Health endpoint",
                    True,
                    f"Database: {data.get('database')}, Collections: {len(data.get('collections', []))}"
                )
            else:
                self.log_test("Health endpoint", False, f"Status code: {response.status_code}")
        except Exception as e:
            self.log_test("Health endpoint", False, f"Exception: {str(e)}")
        
        # Test simple test endpoint
        try:
            response = self.session.get(f"{self.base_url}/test")
            if response.status_code == 200:
                data = response.json()
                env_info = data.get('environment', {})
                self.log_test(
                    "Test endpoint",
                    True,
                    f"MongoDB configured: {env_info.get('mongodb_uri_configured')}"
                )
            else:
                self.log_test("Test endpoint", False, f"Status code: {response.status_code}")
        except Exception as e:
            self.log_test("Test endpoint", False, f"Exception: {str(e)}")
    
    def test_entities_list(self):
        """Test entities listing endpoint"""
        print("=== Testing Entities List Endpoint ===")
        
        # Test basic entities list
        try:
            response = self.session.get(f"{self.base_url}/entities/")
            if response.status_code == 200:
                data = response.json()
                entities = data.get('entities', [])
                total_count = data.get('total_count', 0)
                self.log_test(
                    "Basic entities list",
                    True,
                    f"Retrieved {len(entities)} entities, Total: {total_count}"
                )
                
                # Store first entity ID for detailed tests
                self.first_entity_id = entities[0]['entityId'] if entities else None
                
            else:
                self.log_test("Basic entities list", False, f"Status code: {response.status_code}")
        except Exception as e:
            self.log_test("Basic entities list", False, f"Exception: {str(e)}")
        
        # Test pagination - first page
        try:
            response = self.session.get(f"{self.base_url}/entities/?skip=0&limit=5")
            if response.status_code == 200:
                data = response.json()
                entities = data.get('entities', [])
                page = data.get('page')
                has_next = data.get('has_next')
                self.log_test(
                    "Pagination - first page",
                    True,
                    f"Page {page}, Entities: {len(entities)}, Has next: {has_next}"
                )
            else:
                self.log_test("Pagination - first page", False, f"Status code: {response.status_code}")
        except Exception as e:
            self.log_test("Pagination - first page", False, f"Exception: {str(e)}")
        
        # Test pagination - second page
        try:
            response = self.session.get(f"{self.base_url}/entities/?skip=5&limit=5")
            if response.status_code == 200:
                data = response.json()
                entities = data.get('entities', [])
                page = data.get('page')
                has_previous = data.get('has_previous')
                self.log_test(
                    "Pagination - second page",
                    True,
                    f"Page {page}, Entities: {len(entities)}, Has previous: {has_previous}"
                )
            else:
                self.log_test("Pagination - second page", False, f"Status code: {response.status_code}")
        except Exception as e:
            self.log_test("Pagination - second page", False, f"Exception: {str(e)}")
        
        # Test filtering by entity type (if entities exist)
        try:
            response = self.session.get(f"{self.base_url}/entities/?entity_type=INDIVIDUAL")
            if response.status_code == 200:
                data = response.json()
                entities = data.get('entities', [])
                self.log_test(
                    "Filter by entity type",
                    True,
                    f"Found {len(entities)} INDIVIDUAL entities"
                )
            else:
                self.log_test("Filter by entity type", False, f"Status code: {response.status_code}")
        except Exception as e:
            self.log_test("Filter by entity type", False, f"Exception: {str(e)}")
    
    def test_entity_detail(self):
        """Test entity detail endpoint"""
        print("=== Testing Entity Detail Endpoint ===")
        
        if hasattr(self, 'first_entity_id') and self.first_entity_id:
            # Test valid entity ID
            try:
                response = self.session.get(f"{self.base_url}/entities/{self.first_entity_id}")
                if response.status_code == 200:
                    data = response.json()
                    entity_id = data.get('entityId')
                    entity_type = data.get('entityType')
                    name = data.get('name', {}).get('full', 'Unknown')
                    self.log_test(
                        "Valid entity detail",
                        True,
                        f"ID: {entity_id}, Type: {entity_type}, Name: {name}"
                    )
                else:
                    self.log_test("Valid entity detail", False, f"Status code: {response.status_code}")
            except Exception as e:
                self.log_test("Valid entity detail", False, f"Exception: {str(e)}")
        else:
            self.log_test("Valid entity detail", False, "No entity ID available for testing")
        
        # Test invalid entity ID (should return 404)
        try:
            response = self.session.get(f"{self.base_url}/entities/nonexistent-entity-id")
            if response.status_code == 404:
                self.log_test(
                    "Invalid entity ID (404 test)",
                    True,
                    "Correctly returned 404 for nonexistent entity"
                )
            else:
                self.log_test(
                    "Invalid entity ID (404 test)",
                    False,
                    f"Expected 404, got {response.status_code}"
                )
        except Exception as e:
            self.log_test("Invalid entity ID (404 test)", False, f"Exception: {str(e)}")
    
    def test_edge_cases(self):
        """Test edge cases and error scenarios"""
        print("=== Testing Edge Cases ===")
        
        # Test invalid pagination parameters
        try:
            response = self.session.get(f"{self.base_url}/entities/?skip=-1")
            # Should either work (treating negative as 0) or return validation error
            success = response.status_code in [200, 422]
            self.log_test(
                "Negative skip parameter",
                success,
                f"Status code: {response.status_code}"
            )
        except Exception as e:
            self.log_test("Negative skip parameter", False, f"Exception: {str(e)}")
        
        # Test very large limit
        try:
            response = self.session.get(f"{self.base_url}/entities/?limit=1000")
            # Should be capped at MAX_PAGE_SIZE or return validation error
            success = response.status_code in [200, 422]
            self.log_test(
                "Large limit parameter",
                success,
                f"Status code: {response.status_code}"
            )
        except Exception as e:
            self.log_test("Large limit parameter", False, f"Exception: {str(e)}")
    
    def run_all_tests(self):
        """Run all test suites"""
        print("🧪 Starting AML/KYC API Tests")
        print("=" * 50)
        
        start_time = time.time()
        
        # Run test suites
        self.test_health_endpoints()
        self.test_entities_list()
        self.test_entity_detail()
        self.test_edge_cases()
        
        # Summary
        total_tests = len(self.test_results)
        passed_tests = sum(1 for result in self.test_results if result['success'])
        failed_tests = total_tests - passed_tests
        
        end_time = time.time()
        duration = end_time - start_time
        
        print("=" * 50)
        print("📊 TEST SUMMARY")
        print(f"Total Tests: {total_tests}")
        print(f"✅ Passed: {passed_tests}")
        print(f"❌ Failed: {failed_tests}")
        print(f"⏱️  Duration: {duration:.2f}s")
        print(f"Success Rate: {(passed_tests/total_tests)*100:.1f}%")
        
        if failed_tests > 0:
            print("\n❌ FAILED TESTS:")
            for result in self.test_results:
                if not result['success']:
                    print(f"  - {result['test']}: {result['message']}")
        
        return failed_tests == 0

def main():
    """Main function to run tests"""
    import argparse
    
    parser = argparse.ArgumentParser(description="Test AML/KYC API endpoints")
    parser.add_argument(
        "--url",
        default="http://localhost:8001",
        help="Base URL for the AML API (default: http://localhost:8001)"
    )
    
    args = parser.parse_args()
    
    tester = AMLAPITester(args.url)
    
    try:
        success = tester.run_all_tests()
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n⚠️  Tests interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n💥 Unexpected error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()