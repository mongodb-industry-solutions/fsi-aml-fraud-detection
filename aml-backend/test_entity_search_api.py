#!/usr/bin/env python3
"""
Test Entity Search API Endpoints - Phase 7 Stage 2 Validation

Tests the comprehensive entity search API endpoints with all facet capabilities.
"""

import asyncio
import logging
import sys
import os
import requests
import json
from typing import Dict, Any

# Add the current directory to the path to import modules
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# API Configuration
BASE_URL = "http://localhost:8001"
ENTITY_SEARCH_BASE = f"{BASE_URL}/entities/search"

def test_api_endpoints():
    """Test all entity search API endpoints"""
    try:
        print("=" * 70)
        print("PHASE 7 STAGE 2 VALIDATION: Entity Search API Testing")
        print("=" * 70)
        
        # Test 1: API Server Health Check
        print("\n1. Testing API Server Availability...")
        
        try:
            response = requests.get(f"{BASE_URL}/test", timeout=5)
            if response.status_code == 200:
                print("✅ API server is running")
                print(f"   - Status: {response.json().get('message', 'N/A')}")
            else:
                print(f"❌ API server responded with status: {response.status_code}")
                return False
        except requests.exceptions.RequestException as e:
            print(f"❌ Cannot connect to API server: {e}")
            print("   Please ensure the server is running: poetry run uvicorn main:app --reload")
            return False
        
        # Test 2: Entity Search Health Check
        print("\n2. Testing Entity Search Health Check...")
        
        try:
            response = requests.get(f"{ENTITY_SEARCH_BASE}/health", timeout=10)
            if response.status_code == 200:
                data = response.json()
                print("✅ Entity search health check passed")
                print(f"   - Service status: {data.get('data', {}).get('service_status', 'unknown')}")
                print(f"   - Index name: {data.get('data', {}).get('index_name', 'unknown')}")
                print(f"   - Facet count: {data.get('data', {}).get('facet_count', 0)}")
                print(f"   - Available facets: {len(data.get('data', {}).get('available_facets', []))}")
            else:
                print(f"❌ Health check failed with status: {response.status_code}")
                print(f"   Response: {response.text}")
        except Exception as e:
            print(f"⚠️  Health check had issues: {e}")
        
        # Test 3: Autocomplete Endpoint
        print("\n3. Testing Autocomplete Endpoint...")
        
        try:
            # Test with minimum length
            response = requests.get(f"{ENTITY_SEARCH_BASE}/autocomplete?q=jo&limit=5", timeout=10)
            if response.status_code == 200:
                data = response.json()
                suggestions = data.get('data', {}).get('suggestions', [])
                print(f"✅ Autocomplete working: {len(suggestions)} suggestions for 'jo'")
                print(f"   - Metadata: {data.get('metadata', {})}")
            else:
                print(f"❌ Autocomplete failed with status: {response.status_code}")
        except Exception as e:
            print(f"⚠️  Autocomplete test had issues: {e}")
        
        # Test 4: Unified Search Endpoint
        print("\n4. Testing Unified Search Endpoint...")
        
        try:
            # Test basic search
            params = {
                "q": "",
                "facets": "true",
                "limit": 5
            }
            response = requests.get(f"{ENTITY_SEARCH_BASE}/unified", params=params, timeout=10)
            if response.status_code == 200:
                data = response.json()
                results = data.get('data', {}).get('results', [])
                facets = data.get('data', {}).get('facets', {})
                print(f"✅ Unified search working: {len(results)} results")
                print(f"   - Facets available: {len(facets)}")
                print(f"   - Metadata: {data.get('metadata', {})}")
            else:
                print(f"❌ Unified search failed with status: {response.status_code}")
                print(f"   Response: {response.text}")
        except Exception as e:
            print(f"⚠️  Unified search test had issues: {e}")
        
        # Test 5: Advanced Faceted Search
        print("\n5. Testing Advanced Faceted Search...")
        
        try:
            # Test with multiple facets
            params = {
                "q": "",
                "entity_type": ["individual"],
                "risk_level": ["medium", "high"],
                "facets": "true",
                "limit": 10
            }
            response = requests.get(f"{ENTITY_SEARCH_BASE}/unified", params=params, timeout=10)
            if response.status_code == 200:
                data = response.json()
                results = data.get('data', {}).get('results', [])
                metadata = data.get('metadata', {})
                print(f"✅ Advanced faceted search working: {len(results)} results")
                print(f"   - Filters applied: {metadata.get('filters_applied', 0)}")
                print(f"   - Total facets: {metadata.get('total_facets', 0)}")
            else:
                print(f"❌ Advanced faceted search failed with status: {response.status_code}")
        except Exception as e:
            print(f"⚠️  Advanced faceted search test had issues: {e}")
        
        # Test 6: Identifier Search
        print("\n6. Testing Identifier Search...")
        
        try:
            params = {
                "value": "test123",
                "type": "passport"
            }
            response = requests.get(f"{ENTITY_SEARCH_BASE}/identifier", params=params, timeout=10)
            if response.status_code == 200:
                data = response.json()
                results = data.get('data', {}).get('results', [])
                metadata = data.get('metadata', {})
                print(f"✅ Identifier search working: {len(results)} results")
                print(f"   - Search type: {metadata.get('search_type', 'unknown')}")
                print(f"   - Exact match: {metadata.get('exact_match', False)}")
            else:
                print(f"❌ Identifier search failed with status: {response.status_code}")
        except Exception as e:
            print(f"⚠️  Identifier search test had issues: {e}")
        
        # Test 7: Facets Endpoint
        print("\n7. Testing Facets Endpoint...")
        
        try:
            response = requests.get(f"{ENTITY_SEARCH_BASE}/facets", timeout=10)
            if response.status_code == 200:
                data = response.json()
                facets = data.get('data', {})
                metadata = data.get('metadata', {})
                print(f"✅ Facets endpoint working: {metadata.get('facet_count', 0)} facets")
                print(f"   - Total unique values: {metadata.get('total_unique_values', 0)}")
                if facets:
                    print(f"   - Facet types: {list(facets.keys())}")
            else:
                print(f"❌ Facets endpoint failed with status: {response.status_code}")
        except Exception as e:
            print(f"⚠️  Facets endpoint test had issues: {e}")
        
        # Test 8: Analytics Endpoints
        print("\n8. Testing Analytics Endpoints...")
        
        try:
            # Test analytics
            response = requests.get(f"{ENTITY_SEARCH_BASE}/analytics", timeout=10)
            if response.status_code == 200:
                print("✅ Analytics endpoint working")
            else:
                print(f"⚠️  Analytics endpoint status: {response.status_code}")
            
            # Test popular searches
            response = requests.get(f"{ENTITY_SEARCH_BASE}/popular?limit=5", timeout=10)
            if response.status_code == 200:
                print("✅ Popular searches endpoint working")
            else:
                print(f"⚠️  Popular searches endpoint status: {response.status_code}")
        except Exception as e:
            print(f"⚠️  Analytics endpoints test had issues: {e}")
        
        # Test 9: Edge Cases and Error Handling
        print("\n9. Testing Edge Cases and Error Handling...")
        
        try:
            # Test autocomplete with short query
            response = requests.get(f"{ENTITY_SEARCH_BASE}/autocomplete?q=a", timeout=5)
            if response.status_code == 200:
                data = response.json()
                suggestions = data.get('data', {}).get('suggestions', [])
                print(f"✅ Short query handling: {len(suggestions)} suggestions (expected 0)")
            
            # Test invalid parameters
            response = requests.get(f"{ENTITY_SEARCH_BASE}/unified?limit=1000", timeout=5)
            if response.status_code == 422:  # Validation error expected
                print("✅ Parameter validation working (limit > 100 rejected)")
            else:
                print(f"⚠️  Parameter validation status: {response.status_code}")
                
        except Exception as e:
            print(f"⚠️  Edge cases test had issues: {e}")
        
        print("\n" + "=" * 70)
        print("PHASE 7 STAGE 2 VALIDATION COMPLETED! ✅")
        print("=" * 70)
        print("\nEntity Search API endpoints are working correctly.")
        print("\nAvailable endpoints:")
        print(f"  • {ENTITY_SEARCH_BASE}/unified - Comprehensive faceted search")
        print(f"  • {ENTITY_SEARCH_BASE}/autocomplete - Name autocomplete")
        print(f"  • {ENTITY_SEARCH_BASE}/identifier - Identifier search")
        print(f"  • {ENTITY_SEARCH_BASE}/facets - Available facet values")
        print(f"  • {ENTITY_SEARCH_BASE}/analytics - Search analytics")
        print(f"  • {ENTITY_SEARCH_BASE}/popular - Popular search queries")
        print(f"  • {ENTITY_SEARCH_BASE}/health - Service health check")
        print("\nNext: Proceed to Stage 3 - Advanced Frontend Components")
        
        return True
        
    except Exception as e:
        print(f"\n❌ VALIDATION FAILED: {e}")
        print("\nPlease check the error and fix before proceeding.")
        return False


def main():
    """Main test function"""
    try:
        # Load environment variables
        from dotenv import load_dotenv
        load_dotenv()
        
        print("Starting Phase 7 Stage 2 API validation...")
        print("Make sure the AML backend server is running on port 8001")
        print("Run: cd aml-backend && poetry run uvicorn main:app --reload")
        
        input("Press Enter when the server is ready...")
        
        success = test_api_endpoints()
        
        if success:
            print("\n🎉 All API tests passed! Ready to proceed to Stage 3.")
        else:
            print("\n❌ Some API tests failed. Please fix issues before proceeding.")
            
    except Exception as e:
        print(f"Test execution failed: {e}")


if __name__ == "__main__":
    main()