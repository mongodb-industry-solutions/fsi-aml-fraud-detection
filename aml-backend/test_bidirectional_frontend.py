#!/usr/bin/env python3
"""
Test Bidirectional Frontend Data - Verify the complete data structure for frontend
"""

import asyncio
import httpx
import json

async def test_bidirectional_frontend_data():
    """Test the bidirectional relationship data sent to frontend"""
    
    # Test the route endpoint
    url = "http://localhost:8001/network/CDI12A-259FFFD2B9"
    params = {
        "max_depth": 2,
        "min_strength": 0.1,
        "include_inactive": "false",
        "max_nodes": 100,
        "include_risk_analysis": "true"
    }
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(url, params=params, timeout=30.0)
            
            if response.status_code == 200:
                data = response.json()
                
                print("✅ Bidirectional Test Results:")
                print(f"Total nodes: {len(data.get('nodes', []))}")
                print(f"Total edges: {len(data.get('edges', []))}")
                
                print(f"\n=== Node Data ===")
                for node in data.get('nodes', []):
                    print(f"Node {node['id']}: {node['label']}")
                    print(f"  Type: {node.get('type')}")
                    print(f"  Risk Score: {node.get('riskScore')}")
                    print(f"  Centrality: {node.get('centrality')}")
                    print(f"  Is Center: {node.get('isCenter')}")
                
                print(f"\n=== Edge Data ===")
                for edge in data.get('edges', []):
                    print(f"Edge {edge['id']}:")
                    print(f"  {edge['source']} -> {edge['target']}")
                    print(f"  Type: {edge.get('relationshipType')}")
                    print(f"  Direction: {edge.get('direction')}")
                    print(f"  Bidirectional: {edge.get('bidirectional')}")
                    print(f"  Confidence: {edge.get('confidence'):.3f}")
                    print(f"  Risk Weight: {edge.get('riskWeight')}")
                    print("")
                
                # Check if bidirectional data is correctly set
                bidirectional_edges = [e for e in data.get('edges', []) if e.get('bidirectional')]
                print(f"✅ Found {len(bidirectional_edges)} bidirectional edge(s)")
                
                directed_edges = [e for e in data.get('edges', []) if not e.get('bidirectional')]
                print(f"✅ Found {len(directed_edges)} directed edge(s)")
                
                if bidirectional_edges:
                    print(f"\n🎯 Bidirectional edges will show arrows on BOTH ends:")
                    for edge in bidirectional_edges:
                        print(f"  {edge['source']} ↔ {edge['target']} ({edge['relationshipType']})")
                
                if directed_edges:
                    print(f"\n➡️ Directed edges will show arrow only at target:")
                    for edge in directed_edges:
                        print(f"  {edge['source']} → {edge['target']} ({edge['relationshipType']})")
                
            else:
                print(f"❌ Error: {response.status_code}")
                print(f"Response: {response.text}")
                
    except Exception as e:
        print(f"❌ Request failed: {e}")

if __name__ == "__main__":
    asyncio.run(test_bidirectional_frontend_data())