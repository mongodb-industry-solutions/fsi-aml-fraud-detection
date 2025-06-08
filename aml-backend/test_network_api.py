#!/usr/bin/env python3
"""
Test the network API endpoint directly
"""

import requests
import json

# API configuration
API_BASE_URL = "http://localhost:8001"
TEST_ENTITY_ID = "CDI-431BB609EB"

def test_network_endpoint():
    """Test the network analysis endpoint"""
    print(f"🧪 Testing network endpoint for entity: {TEST_ENTITY_ID}")
    
    # Test parameters
    params = {
        "max_depth": 2,
        "min_strength": 0.5,
        "include_inactive": False,
        "max_nodes": 100
    }
    
    # Make request
    url = f"{API_BASE_URL}/relationships/network/{TEST_ENTITY_ID}"
    print(f"📡 URL: {url}")
    print(f"📊 Parameters: {json.dumps(params, indent=2)}")
    
    try:
        response = requests.get(url, params=params)
        
        print(f"\n📨 Response Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print("✅ Success!")
            print(f"📈 Results:")
            print(f"   - Total Nodes: {data.get('totalNodes', 0)}")
            print(f"   - Total Edges: {data.get('totalEdges', 0)}")
            print(f"   - Center Node: {data.get('centerNodeId', 'N/A')}")
            print(f"   - Max Depth Reached: {data.get('maxDepthReached', 0)}")
            
            # Display sample nodes
            nodes = data.get('nodes', [])
            if nodes:
                print(f"\n🔗 Sample nodes:")
                for node in nodes[:3]:
                    print(f"   - {node['id']}: {node['label']} ({node['entityType']}, risk: {node.get('riskLevel', 'N/A')})")
            
            # Display sample edges
            edges = data.get('edges', [])
            if edges:
                print(f"\n🔗 Sample edges:")
                for edge in edges[:3]:
                    print(f"   - {edge['source']} -> {edge['target']}: {edge['label']} (strength: {edge['strength']})")
                
                # Print full edge structure for debugging
                print(f"\n🔍 Full edge data structure:")
                for i, edge in enumerate(edges[:1]):
                    print(f"Edge {i+1}:")
                    print(json.dumps(edge, indent=2))
        else:
            print(f"❌ Error: {response.status_code}")
            print(f"   Details: {response.text}")
            
    except requests.exceptions.ConnectionError:
        print("❌ Could not connect to API. Is the server running on port 8001?")
    except Exception as e:
        print(f"❌ Unexpected error: {e}")

if __name__ == "__main__":
    test_network_endpoint()