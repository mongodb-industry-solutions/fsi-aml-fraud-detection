#!/usr/bin/env python3
"""
Comprehensive test script for Entity Resolution functionality
Tests Atlas Search integration, entity resolution workflows, and relationship management
"""

import requests
import json
import time
import sys
from datetime import datetime
from typing import Dict, List, Any, Optional
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Test configuration
AML_API_BASE_URL = "http://localhost:8001"
TIMEOUT = 30  # seconds

class Colors:
    """ANSI color codes for terminal output"""
    HEADER = '\033[95m'
    OKBLUE = '\033[94m'
    OKCYAN = '\033[96m'
    OKGREEN = '\033[92m'
    WARNING = '\033[93m'
    FAIL = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'
    UNDERLINE = '\033[4m'

class TestEntityResolution:
    """Comprehensive test suite for entity resolution functionality"""
    
    def __init__(self, base_url: str = AML_API_BASE_URL):
        self.base_url = base_url
        self.session = requests.Session()
        self.session.timeout = TIMEOUT
        
        # Test data storage
        self.test_entities = []
        self.test_relationships = []
        self.test_results = {
            "passed": 0,
            "failed": 0,
            "errors": []
        }
    
    def log_result(self, test_name: str, passed: bool, message: str = "", response_data: Any = None):
        """Log test result with colored output"""
        if passed:
            print(f"{Colors.OKGREEN}✓ PASS{Colors.ENDC}: {test_name}")
            if message:
                print(f"  {Colors.OKCYAN}→ {message}{Colors.ENDC}")
            self.test_results["passed"] += 1
        else:
            print(f"{Colors.FAIL}✗ FAIL{Colors.ENDC}: {test_name}")
            if message:
                print(f"  {Colors.WARNING}→ {message}{Colors.ENDC}")
            self.test_results["failed"] += 1
            self.test_results["errors"].append(f"{test_name}: {message}")
        
        if response_data and not passed:
            print(f"  {Colors.WARNING}Response: {json.dumps(response_data, indent=2)[:200]}...{Colors.ENDC}")
    
    def make_request(self, method: str, endpoint: str, **kwargs) -> requests.Response:
        """Make HTTP request with error handling"""
        url = f"{self.base_url}{endpoint}"
        try:
            response = self.session.request(method, url, **kwargs)
            return response
        except requests.exceptions.RequestException as e:
            logger.error(f"Request failed: {method} {url} - {e}")
            raise
    
    def test_api_connectivity(self):
        """Test basic API connectivity and health"""
        print(f"\n{Colors.HEADER}=== Testing API Connectivity ==={Colors.ENDC}")
        
        # Test root endpoint
        try:
            response = self.make_request("GET", "/")
            if response.status_code == 200:
                data = response.json()
                self.log_result(
                    "API Root Endpoint",
                    True,
                    f"Version: {data.get('version', 'unknown')}, Features: {len(data.get('features', []))}"
                )
            else:
                self.log_result("API Root Endpoint", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_result("API Root Endpoint", False, f"Error: {str(e)}")
        
        # Test health endpoint
        try:
            response = self.make_request("GET", "/health")
            if response.status_code == 200:
                data = response.json()
                db_status = data.get('database', 'unknown')
                collections = data.get('collections', [])
                self.log_result(
                    "Health Check",
                    db_status == "connected",
                    f"Database: {db_status}, Collections: {len(collections)}"
                )
            else:
                self.log_result("Health Check", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_result("Health Check", False, f"Error: {str(e)}")
    
    def test_atlas_search_integration(self):
        """Test Atlas Search index and functionality"""
        print(f"\n{Colors.HEADER}=== Testing Atlas Search Integration ==={Colors.ENDC}")
        
        # Test Atlas Search index
        try:
            response = self.make_request("POST", "/entities/search/test")
            if response.status_code == 200:
                data = response.json()
                search_test = data.get('searchIndexTest', {})
                index_accessible = search_test.get('index_accessible', False)
                self.log_result(
                    "Atlas Search Index Test",
                    index_accessible,
                    f"Index: {search_test.get('index_name', 'unknown')}, Accessible: {index_accessible}"
                )
            else:
                self.log_result("Atlas Search Index Test", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_result("Atlas Search Index Test", False, f"Error: {str(e)}")
        
        # Test search suggestions
        try:
            response = self.make_request("GET", "/entities/search/suggestions", params={
                "query": "john",
                "field": "name.full",
                "limit": 5
            })
            if response.status_code == 200:
                data = response.json()
                suggestions = data.get('suggestions', [])
                self.log_result(
                    "Search Suggestions",
                    True,
                    f"Query: 'john', Suggestions: {len(suggestions)}"
                )
            else:
                self.log_result("Search Suggestions", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_result("Search Suggestions", False, f"Error: {str(e)}")
    
    def test_entity_onboarding_scenarios(self):
        """Test entity onboarding and match finding scenarios"""
        print(f"\n{Colors.HEADER}=== Testing Entity Onboarding Scenarios ==={Colors.ENDC}")
        
        # Test scenarios from instruction
        test_scenarios = [
            {
                "name": "Exact Name Match - Samantha Miller",
                "input": {
                    "name_full": "Samantha Miller",
                    "date_of_birth": "1985-03-15",
                    "address_full": "123 Oak Street, Portland, OR 97205"
                },
                "expected_matches": True
            },
            {
                "name": "Fuzzy Name Match - Sam Miller",
                "input": {
                    "name_full": "Sam Miller",
                    "date_of_birth": "1985-03-15",
                    "identifier_value": "SSN-123-45-6789"
                },
                "expected_matches": True
            },
            {
                "name": "Address Match - Shared Address",
                "input": {
                    "name_full": "John Doe",
                    "address_full": "123 Oak Street, Portland, OR 97205"
                },
                "expected_matches": True
            },
            {
                "name": "No Match - Unique Entity",
                "input": {
                    "name_full": "Unique Test Person",
                    "date_of_birth": "2000-01-01",
                    "address_full": "999 Nonexistent Street, Nowhere, XX 00000"
                },
                "expected_matches": False
            },
            {
                "name": "Invalid Input - Empty Name",
                "input": {
                    "name_full": "",
                    "address_full": "123 Test Street"
                },
                "expected_error": True
            }
        ]
        
        for scenario in test_scenarios:
            try:
                response = self.make_request(
                    "POST",
                    "/entities/onboarding/find_matches",
                    json=scenario["input"],
                    params={"limit": 10}
                )
                
                if scenario.get("expected_error"):
                    # Expecting an error response
                    success = response.status_code >= 400
                    self.log_result(
                        scenario["name"],
                        success,
                        f"Expected error, got status: {response.status_code}"
                    )
                elif response.status_code == 200:
                    data = response.json()
                    matches = data.get("matches", [])
                    total_matches = data.get("totalMatches", 0)
                    
                    if scenario["expected_matches"]:
                        success = total_matches > 0
                        message = f"Found {total_matches} matches"
                        if matches:
                            top_match = matches[0]
                            message += f", top score: {top_match.get('searchScore', 0):.3f}"
                    else:
                        success = total_matches == 0
                        message = f"Found {total_matches} matches (expected 0)"
                    
                    self.log_result(scenario["name"], success, message)
                    
                    # Store match data for resolution testing
                    if matches:
                        self.test_entities.extend([
                            {
                                "scenario": scenario["name"],
                                "input": scenario["input"],
                                "match": match
                            }
                            for match in matches[:2]  # Store top 2 matches
                        ])
                else:
                    self.log_result(
                        scenario["name"],
                        False,
                        f"HTTP {response.status_code}: {response.text[:100]}"
                    )
            except Exception as e:
                self.log_result(scenario["name"], False, f"Error: {str(e)}")
    
    def test_entity_resolution_decisions(self):
        """Test entity resolution decision workflows"""
        print(f"\n{Colors.HEADER}=== Testing Entity Resolution Decisions ==={Colors.ENDC}")
        
        if not self.test_entities:
            print(f"{Colors.WARNING}No test entities available for resolution testing{Colors.ENDC}")
            return
        
        # Test confirmed match resolution
        for i, test_entity in enumerate(self.test_entities[:2]):
            try:
                resolution_input = {
                    "sourceEntityId": f"TEST_SOURCE_{i}",
                    "targetMasterEntityId": test_entity["match"]["entityId"],
                    "decision": "confirmed_match",
                    "matchConfidence": 0.95,
                    "matchedAttributes": ["name", "address"],
                    "resolvedBy": "test_analyst",
                    "notes": f"Test resolution for scenario: {test_entity['scenario']}"
                }
                
                response = self.make_request(
                    "POST",
                    "/entities/resolve",
                    json=resolution_input
                )
                
                if response.status_code == 200:
                    data = response.json()
                    success = data.get("success", False)
                    relationship_id = data.get("relationshipId")
                    
                    self.log_result(
                        f"Confirmed Match Resolution #{i+1}",
                        success,
                        f"Decision: {data.get('decision')}, Relationship: {relationship_id[:8] if relationship_id else 'None'}..."
                    )
                    
                    if relationship_id:
                        self.test_relationships.append(relationship_id)
                else:
                    self.log_result(
                        f"Confirmed Match Resolution #{i+1}",
                        False,
                        f"HTTP {response.status_code}"
                    )
            except Exception as e:
                self.log_result(f"Confirmed Match Resolution #{i+1}", False, f"Error: {str(e)}")
        
        # Test not-a-match resolution
        if len(self.test_entities) > 2:
            try:
                test_entity = self.test_entities[2]
                resolution_input = {
                    "sourceEntityId": "TEST_SOURCE_NOT_MATCH",
                    "targetMasterEntityId": test_entity["match"]["entityId"],
                    "decision": "not_a_match",
                    "matchConfidence": 0.1,
                    "matchedAttributes": [],
                    "resolvedBy": "test_analyst",
                    "notes": "Test dismissal - entities are not the same"
                }
                
                response = self.make_request(
                    "POST",
                    "/entities/resolve",
                    json=resolution_input
                )
                
                if response.status_code == 200:
                    data = response.json()
                    success = data.get("success", False)
                    self.log_result(
                        "Not-a-Match Resolution",
                        success,
                        f"Decision: {data.get('decision')}"
                    )
                else:
                    self.log_result("Not-a-Match Resolution", False, f"HTTP {response.status_code}")
            except Exception as e:
                self.log_result("Not-a-Match Resolution", False, f"Error: {str(e)}")
        
        # Test needs review resolution
        if len(self.test_entities) > 3:
            try:
                test_entity = self.test_entities[3]
                resolution_input = {
                    "sourceEntityId": "TEST_SOURCE_REVIEW",
                    "targetMasterEntityId": test_entity["match"]["entityId"],
                    "decision": "needs_review",
                    "matchConfidence": 0.6,
                    "matchedAttributes": ["name"],
                    "resolvedBy": "test_analyst",
                    "notes": "Test needs review - uncertain match"
                }
                
                response = self.make_request(
                    "POST",
                    "/entities/resolve",
                    json=resolution_input
                )
                
                if response.status_code == 200:
                    data = response.json()
                    success = data.get("success", False)
                    self.log_result(
                        "Needs Review Resolution",
                        success,
                        f"Decision: {data.get('decision')}"
                    )
                else:
                    self.log_result("Needs Review Resolution", False, f"HTTP {response.status_code}")
            except Exception as e:
                self.log_result("Needs Review Resolution", False, f"Error: {str(e)}")
    
    def test_relationship_management(self):
        """Test relationship CRUD operations"""
        print(f"\n{Colors.HEADER}=== Testing Relationship Management ==={Colors.ENDC}")
        
        # Test relationship creation
        try:
            create_request = {
                "sourceEntityId": "TEST_ENTITY_1",
                "targetEntityId": "TEST_ENTITY_2",
                "type": "business_associate",
                "strength": 0.8,
                "evidence": {
                    "matchedAttributes": ["shared_address"],
                    "manualConfidence": 0.8
                },
                "createdBy": "test_analyst",
                "notes": "Test relationship creation"
            }
            
            response = self.make_request(
                "POST",
                "/relationships",
                json=create_request
            )
            
            if response.status_code == 200:
                data = response.json()
                success = data.get("success", False)
                relationship_id = data.get("relationshipId")
                
                self.log_result(
                    "Create Relationship",
                    success,
                    f"Created relationship: {relationship_id[:8] if relationship_id else 'None'}..."
                )
                
                if relationship_id:
                    self.test_relationships.append(relationship_id)
            else:
                self.log_result("Create Relationship", False, f"HTTP {response.status_code}")
        except Exception as e:
            self.log_result("Create Relationship", False, f"Error: {str(e)}")
        
        # Test relationship listing
        try:
            response = self.make_request(
                "GET",
                "/relationships",
                params={"limit": 10, "skip": 0}
            )
            
            if response.status_code == 200:
                data = response.json()
                relationships = data.get("relationships", [])
                total_count = data.get("totalCount", 0)
                
                self.log_result(
                    "List Relationships",
                    True,
                    f"Found {len(relationships)} relationships (total: {total_count})"
                )
            else:
                self.log_result("List Relationships", False, f"HTTP {response.status_code}")
        except Exception as e:
            self.log_result("List Relationships", False, f"Error: {str(e)}")
        
        # Test relationship statistics
        try:
            response = self.make_request("GET", "/relationships/stats")
            
            if response.status_code == 200:
                data = response.json()
                total = data.get("totalRelationships", 0)
                avg_strength = data.get("averageStrength", 0)
                
                self.log_result(
                    "Relationship Statistics",
                    True,
                    f"Total: {total}, Avg Strength: {avg_strength:.3f}"
                )
            else:
                self.log_result("Relationship Statistics", False, f"HTTP {response.status_code}")
        except Exception as e:
            self.log_result("Relationship Statistics", False, f"Error: {str(e)}")
    
    def test_network_analysis(self):
        """Test entity network analysis"""
        print(f"\n{Colors.HEADER}=== Testing Network Analysis ==={Colors.ENDC}")
        
        # Use first available entity for network testing
        test_entity_id = None
        if self.test_entities:
            test_entity_id = self.test_entities[0]["match"]["entityId"]
        else:
            # Fallback to a common test entity ID
            test_entity_id = "TEST_ENTITY_1"
        
        try:
            response = self.make_request(
                "GET",
                f"/relationships/network/{test_entity_id}",
                params={"max_depth": 2, "min_strength": 0.5}
            )
            
            if response.status_code == 200:
                data = response.json()
                nodes = data.get("nodes", [])
                edges = data.get("edges", [])
                total_nodes = data.get("totalNodes", 0)
                total_edges = data.get("totalEdges", 0)
                
                self.log_result(
                    "Entity Network Analysis",
                    True,
                    f"Entity: {test_entity_id}, Nodes: {total_nodes}, Edges: {total_edges}"
                )
            else:
                # Network might be empty for test entities, which is ok
                self.log_result(
                    "Entity Network Analysis",
                    response.status_code in [200, 404],
                    f"HTTP {response.status_code} (may be empty network)"
                )
        except Exception as e:
            self.log_result("Entity Network Analysis", False, f"Error: {str(e)}")
        
        # Test entity relationship summary
        try:
            response = self.make_request(
                "GET",
                f"/relationships/entity/{test_entity_id}/summary"
            )
            
            if response.status_code == 200:
                data = response.json()
                total_rels = data.get("totalRelationships", 0)
                avg_strength = data.get("averageStrength", 0)
                
                self.log_result(
                    "Entity Relationship Summary",
                    True,
                    f"Entity: {test_entity_id}, Relationships: {total_rels}, Avg Strength: {avg_strength:.3f}"
                )
            else:
                self.log_result("Entity Relationship Summary", False, f"HTTP {response.status_code}")
        except Exception as e:
            self.log_result("Entity Relationship Summary", False, f"Error: {str(e)}")
    
    def test_error_handling(self):
        """Test error handling scenarios"""
        print(f"\n{Colors.HEADER}=== Testing Error Handling ==={Colors.ENDC}")
        
        # Test invalid entity resolution
        try:
            invalid_resolution = {
                "sourceEntityId": "INVALID_SOURCE",
                "targetMasterEntityId": "INVALID_TARGET",
                "decision": "confirmed_match",
                "matchConfidence": 1.5,  # Invalid confidence > 1.0
                "matchedAttributes": []
            }
            
            response = self.make_request(
                "POST",
                "/entities/resolve",
                json=invalid_resolution
            )
            
            success = response.status_code >= 400
            self.log_result(
                "Invalid Resolution Input",
                success,
                f"Expected error, got status: {response.status_code}"
            )
        except Exception as e:
            self.log_result("Invalid Resolution Input", False, f"Error: {str(e)}")
        
        # Test nonexistent relationship
        try:
            response = self.make_request(
                "GET",
                "/relationships/network/NONEXISTENT_ENTITY"
            )
            
            # Should handle gracefully, not crash
            success = response.status_code in [200, 404]
            self.log_result(
                "Nonexistent Entity Network",
                success,
                f"Handled gracefully with status: {response.status_code}"
            )
        except Exception as e:
            self.log_result("Nonexistent Entity Network", False, f"Error: {str(e)}")
    
    def test_demo_endpoints(self):
        """Test demo and utility endpoints"""
        print(f"\n{Colors.HEADER}=== Testing Demo Endpoints ==={Colors.ENDC}")
        
        # Test demo endpoint
        try:
            response = self.make_request("POST", "/entities/onboarding/demo")
            
            if response.status_code == 200:
                data = response.json()
                scenarios = data.get("demo_scenarios", [])
                
                self.log_result(
                    "Demo Scenarios",
                    len(scenarios) > 0,
                    f"Found {len(scenarios)} demo scenarios"
                )
            else:
                self.log_result("Demo Scenarios", False, f"HTTP {response.status_code}")
        except Exception as e:
            self.log_result("Demo Scenarios", False, f"Error: {str(e)}")
    
    def run_all_tests(self):
        """Run complete test suite"""
        print(f"{Colors.BOLD}{Colors.HEADER}🧪 Entity Resolution Test Suite{Colors.ENDC}")
        print(f"Testing AML API at: {self.base_url}")
        print(f"Start time: {datetime.now().isoformat()}")
        
        start_time = time.time()
        
        # Run all test categories
        self.test_api_connectivity()
        self.test_atlas_search_integration()
        self.test_entity_onboarding_scenarios()
        self.test_entity_resolution_decisions()
        self.test_relationship_management()
        self.test_network_analysis()
        self.test_error_handling()
        self.test_demo_endpoints()
        
        # Final results
        end_time = time.time()
        duration = end_time - start_time
        
        print(f"\n{Colors.BOLD}{Colors.HEADER}📊 Test Results Summary{Colors.ENDC}")
        print(f"Duration: {duration:.2f} seconds")
        print(f"{Colors.OKGREEN}Passed: {self.test_results['passed']}{Colors.ENDC}")
        print(f"{Colors.FAIL}Failed: {self.test_results['failed']}{Colors.ENDC}")
        
        if self.test_results["errors"]:
            print(f"\n{Colors.WARNING}❌ Failed Tests:{Colors.ENDC}")
            for error in self.test_results["errors"]:
                print(f"  • {error}")
        
        # Overall status
        total_tests = self.test_results["passed"] + self.test_results["failed"]
        success_rate = (self.test_results["passed"] / total_tests * 100) if total_tests > 0 else 0
        
        if success_rate >= 90:
            status_color = Colors.OKGREEN
            status_icon = "🎉"
        elif success_rate >= 75:
            status_color = Colors.WARNING
            status_icon = "⚠️"
        else:
            status_color = Colors.FAIL
            status_icon = "🚨"
        
        print(f"\n{status_color}{status_icon} Overall Success Rate: {success_rate:.1f}%{Colors.ENDC}")
        
        return success_rate >= 75

def main():
    """Main test execution"""
    if len(sys.argv) > 1:
        base_url = sys.argv[1]
    else:
        base_url = AML_API_BASE_URL
    
    print(f"Entity Resolution Test Suite")
    print(f"Base URL: {base_url}")
    print(f"Timeout: {TIMEOUT} seconds")
    
    tester = TestEntityResolution(base_url)
    
    try:
        success = tester.run_all_tests()
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print(f"\n{Colors.WARNING}Test interrupted by user{Colors.ENDC}")
        sys.exit(1)
    except Exception as e:
        print(f"\n{Colors.FAIL}Test suite failed with error: {e}{Colors.ENDC}")
        sys.exit(1)

if __name__ == "__main__":
    main()