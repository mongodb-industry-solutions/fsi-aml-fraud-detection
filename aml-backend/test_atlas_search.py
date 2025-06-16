#!/usr/bin/env python3
"""
Comprehensive test suite for Atlas Search faceted endpoints
"""

import asyncio
import json
import time
from typing import Dict, Any
import aiohttp

API_BASE = "http://localhost:8001"

class AtlasSearchTester:
    def __init__(self):
        self.session = None
        self.test_results = []
    
    async def __aenter__(self):
        self.session = aiohttp.ClientSession()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()
    
    def log_result(self, test_name: str, success: bool, details: str = "", response_data: Dict = None):
        """Log test result"""
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}")
        if details:
            print(f"    {details}")
        if response_data and not success:
            print(f"    Response: {json.dumps(response_data, indent=2)[:500]}")
        
        self.test_results.append({
            "test": test_name,
            "success": success,
            "details": details
        })
        print()
    
    async def test_health_check(self):
        """Test if AML backend is running"""
        try:
            async with self.session.get(f"{API_BASE}/health") as response:
                data = await response.json()
                success = response.status == 200 and data.get("status") == "healthy"
                self.log_result("Health Check", success, f"Status: {response.status}")
                return success
        except Exception as e:
            self.log_result("Health Check", False, f"Error: {e}")
            return False
    
    async def test_search_stats(self):
        """Test /search/stats endpoint"""
        try:
            async with self.session.get(f"{API_BASE}/entities/search/stats") as response:
                data = await response.json()
                
                if response.status != 200:
                    self.log_result("Search Stats", False, f"HTTP {response.status}", data)
                    return False
                
                # Validate response structure
                required_fields = ["total_entities", "search_index", "facet_fields", "autocomplete_fields", "risk_score_distribution"]
                missing_fields = [field for field in required_fields if field not in data]
                
                if missing_fields:
                    self.log_result("Search Stats", False, f"Missing fields: {missing_fields}", data)
                    return False
                
                total_entities = data["total_entities"]
                search_index = data["search_index"]
                facet_fields = data["facet_fields"]
                
                success = (
                    total_entities > 0 and
                    search_index == "entity_search_index_v2" and
                    len(facet_fields) >= 6
                )
                
                details = f"Total entities: {total_entities}, Index: {search_index}, Facet fields: {len(facet_fields)}"
                self.log_result("Search Stats", success, details)
                return success
                
        except Exception as e:
            self.log_result("Search Stats", False, f"Exception: {e}")
            return False
    
    async def test_filter_options(self):
        """Test /search/filters endpoint"""
        try:
            async with self.session.get(f"{API_BASE}/entities/search/filters") as response:
                data = await response.json()
                
                if response.status != 200:
                    self.log_result("Filter Options", False, f"HTTP {response.status}", data)
                    return False
                
                # Validate response structure
                required_fields = ["entity_types", "risk_levels", "statuses", "countries", "business_types", "scenario_keys", "risk_score_distribution"]
                missing_fields = [field for field in required_fields if field not in data]
                
                if missing_fields:
                    self.log_result("Filter Options", False, f"Missing fields: {missing_fields}", data)
                    return False
                
                # Check that we have data for core filters
                entity_types_count = len(data["entity_types"])
                risk_levels_count = len(data["risk_levels"])
                statuses_count = len(data["statuses"])
                countries_count = len(data["countries"])
                
                success = (
                    entity_types_count >= 2 and  # individual, organization
                    risk_levels_count >= 1 and   # low, medium
                    statuses_count >= 4 and      # active, inactive, etc.
                    countries_count >= 1         # should have some countries
                )
                
                details = f"EntityTypes: {entity_types_count}, RiskLevels: {risk_levels_count}, Statuses: {statuses_count}, Countries: {countries_count}"
                self.log_result("Filter Options", success, details)
                
                # Log sample data for inspection
                if data["entity_types"]:
                    print(f"    Sample entity types: {[et['id'] for et in data['entity_types'][:3]]}")
                if data["countries"]:
                    print(f"    Sample countries: {[c['id'] for c in data['countries'][:5]]}")
                if data["business_types"]:
                    print(f"    Sample business types: {[bt['id'] for bt in data['business_types'][:3]]}")
                
                return success
                
        except Exception as e:
            self.log_result("Filter Options", False, f"Exception: {e}")
            return False
    
    async def test_autocomplete(self):
        """Test /search/autocomplete endpoint"""
        test_queries = [
            "Sam",
            "Miller", 
            "John",
            "Corp"
        ]
        
        overall_success = True
        
        for query in test_queries:
            try:
                payload = {"query": query, "limit": 5}
                async with self.session.post(f"{API_BASE}/entities/search/autocomplete", json=payload) as response:
                    data = await response.json()
                    
                    if response.status != 200:
                        self.log_result(f"Autocomplete '{query}'", False, f"HTTP {response.status}", data)
                        overall_success = False
                        continue
                    
                    suggestions = data.get("suggestions", [])
                    
                    # For common names, we should get suggestions
                    if query in ["Sam", "Miller", "John"]:
                        success = len(suggestions) > 0
                        details = f"Found {len(suggestions)} suggestions"
                    else:
                        # For "Corp", might or might not have results
                        success = True
                        details = f"Found {len(suggestions)} suggestions (acceptable for '{query}')"
                    
                    if suggestions:
                        sample_names = [s.get("name_full", "")[:30] for s in suggestions[:2]]
                        details += f", samples: {sample_names}"
                    
                    self.log_result(f"Autocomplete '{query}'", success, details)
                    if not success:
                        overall_success = False
                        
            except Exception as e:
                self.log_result(f"Autocomplete '{query}'", False, f"Exception: {e}")
                overall_success = False
        
        return overall_success
    
    async def test_faceted_search_basic(self):
        """Test basic faceted search without filters"""
        try:
            payload = {"skip": 0, "limit": 5}
            async with self.session.post(f"{API_BASE}/entities/search/faceted", json=payload) as response:
                data = await response.json()
                
                if response.status != 200:
                    self.log_result("Faceted Search Basic", False, f"HTTP {response.status}", data)
                    return False
                
                entities = data.get("entities", [])
                facets = data.get("facets", {})
                total_count = data.get("total_count", 0)
                
                success = (
                    len(entities) == 5 and
                    total_count > 0 and
                    "entityType" in facets and
                    "riskLevel" in facets
                )
                
                details = f"Entities: {len(entities)}, Total: {total_count}, Facets: {len(facets)}"
                self.log_result("Faceted Search Basic", success, details)
                return success
                
        except Exception as e:
            self.log_result("Faceted Search Basic", False, f"Exception: {e}")
            return False
    
    async def test_faceted_search_entity_type_filter(self):
        """Test faceted search with entity type filter"""
        for entity_type in ["individual", "organization"]:
            try:
                payload = {"entity_type": entity_type, "skip": 0, "limit": 3}
                async with self.session.post(f"{API_BASE}/entities/search/faceted", json=payload) as response:
                    data = await response.json()
                    
                    if response.status != 200:
                        self.log_result(f"Entity Type Filter '{entity_type}'", False, f"HTTP {response.status}", data)
                        continue
                    
                    entities = data.get("entities", [])
                    total_count = data.get("total_count", 0)
                    
                    # Verify all returned entities have the correct type
                    correct_types = all(e.get("entityType") == entity_type for e in entities)
                    
                    success = (
                        len(entities) > 0 and
                        total_count > 0 and
                        correct_types
                    )
                    
                    details = f"Found {len(entities)} {entity_type}s, Total: {total_count}"
                    self.log_result(f"Entity Type Filter '{entity_type}'", success, details)
                    
            except Exception as e:
                self.log_result(f"Entity Type Filter '{entity_type}'", False, f"Exception: {e}")
    
    async def test_faceted_search_risk_level_filter(self):
        """Test faceted search with risk level filter"""
        for risk_level in ["low", "medium"]:
            try:
                payload = {"risk_level": risk_level, "skip": 0, "limit": 3}
                async with self.session.post(f"{API_BASE}/entities/search/faceted", json=payload) as response:
                    data = await response.json()
                    
                    if response.status != 200:
                        self.log_result(f"Risk Level Filter '{risk_level}'", False, f"HTTP {response.status}", data)
                        continue
                    
                    entities = data.get("entities", [])
                    total_count = data.get("total_count", 0)
                    
                    # Verify all returned entities have the correct risk level
                    correct_risk = all(e.get("risk_level") == risk_level for e in entities)
                    
                    success = (
                        len(entities) > 0 and
                        total_count > 0 and
                        correct_risk
                    )
                    
                    details = f"Found {len(entities)} {risk_level} risk entities, Total: {total_count}"
                    self.log_result(f"Risk Level Filter '{risk_level}'", success, details)
                    
            except Exception as e:
                self.log_result(f"Risk Level Filter '{risk_level}'", False, f"Exception: {e}")
    
    async def test_faceted_search_combined_filters(self):
        """Test faceted search with multiple filters"""
        try:
            payload = {
                "entity_type": "individual",
                "risk_level": "low",
                "skip": 0,
                "limit": 5
            }
            async with self.session.post(f"{API_BASE}/entities/search/faceted", json=payload) as response:
                data = await response.json()
                
                if response.status != 200:
                    self.log_result("Combined Filters", False, f"HTTP {response.status}", data)
                    return False
                
                entities = data.get("entities", [])
                total_count = data.get("total_count", 0)
                
                # Verify all entities match both filters
                correct_filters = all(
                    e.get("entityType") == "individual" and e.get("risk_level") == "low"
                    for e in entities
                )
                
                success = (
                    len(entities) > 0 and
                    total_count > 0 and
                    correct_filters
                )
                
                details = f"Found {len(entities)} individual low-risk entities, Total: {total_count}"
                self.log_result("Combined Filters", success, details)
                return success
                
        except Exception as e:
            self.log_result("Combined Filters", False, f"Exception: {e}")
            return False
    
    async def test_risk_score_range_filter(self):
        """Test risk score range filtering"""
        test_cases = [
            {"risk_score_min": 0, "risk_score_max": 25, "description": "0-25 range"},
            {"risk_score_min": 50, "risk_score_max": 100, "description": "50-100 range"},
            {"risk_score_min": 75, "description": "75+ range"}
        ]
        
        overall_success = True
        
        for case in test_cases:
            try:
                payload = {
                    "skip": 0,
                    "limit": 3,
                    **{k: v for k, v in case.items() if k != "description"}
                }
                
                async with self.session.post(f"{API_BASE}/entities/search/faceted", json=payload) as response:
                    data = await response.json()
                    
                    if response.status != 200:
                        self.log_result(f"Risk Score Range {case['description']}", False, f"HTTP {response.status}", data)
                        overall_success = False
                        continue
                    
                    entities = data.get("entities", [])
                    total_count = data.get("total_count", 0)
                    
                    # Verify risk scores are in range
                    min_score = case.get("risk_score_min")
                    max_score = case.get("risk_score_max")
                    
                    correct_range = True
                    for entity in entities:
                        score = entity.get("risk_score", 0)
                        if min_score is not None and score < min_score:
                            correct_range = False
                        if max_score is not None and score > max_score:
                            correct_range = False
                    
                    success = total_count >= 0 and correct_range  # Allow 0 results for narrow ranges
                    
                    details = f"Found {len(entities)} entities in {case['description']}, Total: {total_count}"
                    if entities:
                        sample_scores = [e.get("risk_score", 0) for e in entities[:2]]
                        details += f", sample scores: {sample_scores}"
                    
                    self.log_result(f"Risk Score Range {case['description']}", success, details)
                    if not success:
                        overall_success = False
                        
            except Exception as e:
                self.log_result(f"Risk Score Range {case['description']}", False, f"Exception: {e}")
                overall_success = False
        
        return overall_success
    
    async def test_text_search(self):
        """Test text search functionality"""
        test_queries = [
            "Miller",
            "Corporation",
            "Smith"
        ]
        
        overall_success = True
        
        for query in test_queries:
            try:
                payload = {"search_query": query, "skip": 0, "limit": 5}
                async with self.session.post(f"{API_BASE}/entities/search/faceted", json=payload) as response:
                    data = await response.json()
                    
                    if response.status != 200:
                        self.log_result(f"Text Search '{query}'", False, f"HTTP {response.status}", data)
                        overall_success = False
                        continue
                    
                    entities = data.get("entities", [])
                    total_count = data.get("total_count", 0)
                    
                    # For common names like Miller, Smith, we should get results
                    if query in ["Miller", "Smith"]:
                        success = total_count > 0
                        details = f"Found {total_count} entities matching '{query}'"
                    else:
                        # For Corporation, might get results or not
                        success = True  # Any result count is acceptable
                        details = f"Found {total_count} entities matching '{query}' (any count acceptable)"
                    
                    if entities:
                        sample_names = [e.get("name_full", "")[:30] for e in entities[:2]]
                        details += f", samples: {sample_names}"
                    
                    self.log_result(f"Text Search '{query}'", success, details)
                    if not success:
                        overall_success = False
                        
            except Exception as e:
                self.log_result(f"Text Search '{query}'", False, f"Exception: {e}")
                overall_success = False
        
        return overall_success
    
    async def run_all_tests(self):
        """Run all tests in sequence"""
        print("🚀 Starting Atlas Search Backend Tests\n")
        start_time = time.time()
        
        # Test health first
        if not await self.test_health_check():
            print("❌ Backend not available, stopping tests")
            return
        
        # Core endpoint tests
        await self.test_search_stats()
        await self.test_filter_options()
        
        # Autocomplete tests
        await self.test_autocomplete()
        
        # Faceted search tests
        await self.test_faceted_search_basic()
        await self.test_faceted_search_entity_type_filter()
        await self.test_faceted_search_risk_level_filter()
        await self.test_faceted_search_combined_filters()
        await self.test_risk_score_range_filter()
        await self.test_text_search()
        
        # Summary
        end_time = time.time()
        total_tests = len(self.test_results)
        passed_tests = sum(1 for result in self.test_results if result["success"])
        failed_tests = total_tests - passed_tests
        
        print(f"📊 Test Summary")
        print(f"    Total tests: {total_tests}")
        print(f"    Passed: {passed_tests}")
        print(f"    Failed: {failed_tests}")
        print(f"    Duration: {end_time - start_time:.2f}s")
        
        if failed_tests > 0:
            print(f"\n❌ Failed tests:")
            for result in self.test_results:
                if not result["success"]:
                    print(f"    - {result['test']}: {result['details']}")
        else:
            print(f"\n✅ All tests passed!")


async def main():
    async with AtlasSearchTester() as tester:
        await tester.run_all_tests()


if __name__ == "__main__":
    asyncio.run(main())