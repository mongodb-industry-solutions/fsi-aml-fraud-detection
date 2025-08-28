"""
Demo configuration for Azure AI Foundry Two-Stage Agent
Simplified settings optimized for demonstration purposes
"""

import os
from typing import Dict, Any
from .models import AgentConfig
from datetime import datetime

def get_demo_agent_config() -> AgentConfig:
    """Get demo-optimized agent configuration"""
    
    # Required Azure AI Foundry settings
    project_endpoint = os.getenv("AZURE_FOUNDRY_PROJECT_ENDPOINT")
    if not project_endpoint:
        raise ValueError(
            "AZURE_FOUNDRY_PROJECT_ENDPOINT environment variable is required. "
            "Set this to your Azure AI Foundry project endpoint URL."
        )
    
    return AgentConfig(
        # Azure AI Foundry settings
        project_endpoint=project_endpoint,
        model_deployment=os.getenv("MODEL_DEPLOYMENT_NAME"),
        agent_temperature=0.3,  # Lower temperature for consistent results
        
        # Demo-optimized thresholds
        stage1_auto_approve_threshold=25.0,
        stage1_auto_block_threshold=85.0,
        
        # Demo behavior settings
        enable_thread_memory=True,
        max_thread_messages=20,  # Reduced for demo
        default_timeout_seconds=30,
        
        # Demo mode enabled
        demo_mode=True,
        verbose_logging=True,
        mock_ml_scoring=True  # Use mock ML for demo reliability
    )


def get_stage1_thresholds() -> Dict[str, float]:
    """Get Stage 1 decision thresholds"""
    return {
        "auto_approve": 25.0,    # Scores < 25: immediate approval
        "auto_block": 85.0,      # Scores > 85: immediate block
        "stage2_min": 25.0,      # Scores 25-85: proceed to Stage 2
        "stage2_max": 85.0
    }


def get_agent_instructions() -> str:
    """Get the system instructions for the Azure AI agent"""
    return """
You are an advanced fraud detection AI agent for financial transaction monitoring.

Your role:
1. Analyze transactions for fraud patterns using historical data
2. Identify suspicious patterns that rule-based systems might miss
3. Provide clear risk assessments with specific reasoning
4. Focus on actionable insights for fraud prevention

Key capabilities available to you:
- Historical transaction pattern analysis
- Customer behavior profiling
- Network relationship analysis
- Sanctions and watchlist checking

Decision framework:
- APPROVE: Low risk, normal patterns, high confidence (score < 40)
- INVESTIGATE: Moderate risk, needs manual review (score 40-65)
- ESCALATE: High risk, urgent attention required (score 65-85)
- BLOCK: Critical risk, immediate action needed (score > 85)

Guidelines:
- Always provide specific reasoning for your assessment
- Cite concrete risk factors and evidence
- Consider customer history and behavioral patterns
- Be concise but thorough in your analysis
- Focus on fraud prevention while minimizing false positives

Remember: You are analyzing edge cases that weren't clear from rule-based analysis alone.
"""


def get_demo_environment_info() -> Dict[str, Any]:
    """Get information about the demo environment setup"""
    return {
        "azure_ai_foundry": {
            "required_vars": [
                "AZURE_AI_PROJECT_ENDPOINT",
                "AZURE_OPENAI_DEPLOYMENT"
            ],
            "optional_vars": [
                "AZURE_SUBSCRIPTION_ID",
                "AZURE_RESOURCE_GROUP"
            ]
        },
        "mongodb": {
            "required_vars": [
                "MONGODB_URI",
                "DB_NAME"
            ]
        },
        "demo_settings": {
            "mock_ml_enabled": True,
            "simplified_tools": True,
            "reduced_complexity": True,
            "focus": "core_fraud_detection"
        }
    }


# Demo test cases for validation

PAUL_TEST_TRANSACTIONS = [
    {
        "transaction_id": "test_001_approve",
        "customer_id": "67d2a82a654c7f1b869c4adb",  # Joseph Patterson - low risk (20.12)
        "amount": 85.50,  # Within normal range (avg: $181.08, std: $90.64)
        "currency": "USD",
        "merchant": {
            "name": "Local Grocery Store",
            "category": "grocery"  # One of his common categories
        },
        "transaction_type": "purchase",
        "payment_method": "card",
        "timestamp": datetime.now(),
        "location": {
            "city": "North Hailey",
            "state": "New York", 
            "country": "US",
            "coordinates": {
                "type": "Point",
                "coordinates": [-44.443468, 27.9144955]  # His usual location
            }
        },
        "device_info": {
            "device_id": "1df2d6c6-12f7-445c-bec8-fff7b6bd62bc",  # His known device
            "type": "tablet",
            "os": "Android",
            "browser": "Edge",
            "ip": "137.196.45.34"  # One of his known IPs
        },
        "expected_stage": 1,
        "expected_decision": "APPROVE",
        "expected_score_range": "< 25",
        "description": "Low-risk customer, normal amount, known device, usual location, common merchant category"
    },

    {
        "transaction_id": "test_002_block", 
        "customer_id": "67d2a82a654c7f1b869c4afb",  # Erin Fitzgerald - very high risk (94.63)
        "amount": 8500.00,  # Extremely high vs avg $110.21
        "currency": "USD",
        "merchant": {
            "name": "Overseas Wire Transfer",
            "category": "money_transfer"  # High-risk category
        },
        "transaction_type": "wire_transfer",
        "payment_method": "wire",
        "timestamp": datetime.now(),
        "location": {
            "city": "Unknown Location",
            "state": "Unknown State",
            "country": "RU",  # Suspicious country
            "coordinates": {
                "type": "Point", 
                "coordinates": [55.7558, 37.6176]  # Moscow coordinates - very far from usual
            }
        },
        "device_info": {
            "device_id": "unknown-device-12345",  # Unknown device
            "type": "desktop",
            "os": "Linux", 
            "browser": "Tor Browser",  # Suspicious browser
            "ip": "95.142.45.123"  # Foreign IP
        },
        "expected_stage": 1,
        "expected_decision": "BLOCK", 
        "expected_score_range": "> 85",
        "description": "High-risk customer, massive amount anomaly, unknown device, suspicious location, high-risk merchant"
    },

    {
        "transaction_id": "test_003_investigate",
        "customer_id": "67d2a82a654c7f1b869c4ae6",  # Brenda Wong - medium risk (65.45)  
        "amount": 450.00,  # Moderately high vs her avg $207.22
        "currency": "USD",
        "merchant": {
            "name": "Electronics Megastore", 
            "category": "electronics"  # Not in her usual categories (grocery, utilities, healthcare, gas, travel)
        },
        "transaction_type": "purchase",
        "payment_method": "card",
        "timestamp": datetime.now(),
        "location": {
            "city": "Denver",
            "state": "Colorado",
            "country": "US", 
            "coordinates": {
                "type": "Point",
                "coordinates": [-104.9903, 39.7392]  # Different from her usual Connecticut location
            }
        },
        "device_info": {
            "device_id": "partial-match-device-789",  # Partially suspicious device
            "type": "mobile",
            "os": "iOS",  # Different from her usual
            "browser": "Safari",
            "ip": "172.16.254.100"  # Different IP range
        },
        "expected_stage": 2,
        "expected_decision": "INVESTIGATE",
        "expected_score_range": "25-85", 
        "description": "Medium-risk customer, unusual merchant category, different location, amount moderately high - needs AI analysis"
    }
]

DEMO_TEST_TRANSACTIONS = [
    # {
    #     "transaction_id": "demo_001_low_risk",
    #     "customer_id": "67d2a82a654c7f1b869c4adb",
    #     "amount": 45.99,
    #     "currency": "USD",
    #     "merchant_category": "restaurant",
    #     "location_country": "US",
    #     "timestamp": datetime.now(),
    #     # Add proper location coordinates matching customer's usual location
    #     "location": {
    #         "city": "North Hailey",
    #         "state": "New York", 
    #         "country": "US",
    #         "coordinates": {
    #             "type": "Point",
    #             "coordinates": [-44.443468, 27.9144955]  # Customer's usual location coordinates
    #         }
    #     },
    #     # Add device information matching customer's known device
    #     "device_info": {
    #         "device_id": "1df2d6c6-12f7-445c-bec8-fff7b6bd62bc",  # Customer's known device ID
    #         "type": "tablet",  # Matches customer's device type
    #         "os": "Android",   # Matches customer's device OS
    #         "browser": "Edge", # Matches customer's device browser
    #         "ip": "137.196.45.34"  # One of customer's known IP addresses
    #     },
    #     # Add customer profile information
    #     "customer_profile": {
    #         "risk_score": 15.0,  # Low risk customer
    #         "avg_transaction_amount": 181.08,  # Match customer's actual average
    #         "usual_merchants": ["travel", "entertainment", "grocery"],  # Customer's actual merchants
    #         "usual_locations": ["US"],
    #         "known_devices": ["1df2d6c6-12f7-445c-bec8-fff7b6bd62bc"]
    #     },
    #     "expected_stage": 1,
    #     "expected_decision": "APPROVE",
    #     "description": "Small amount, familiar merchant, known device, usual location - should be approved in Stage 1"
    # },
        {
        "transaction_id": "demo_002_high_risk",
        "customer_id": "customer_456",
        "amount": 9999.99,
        "currency": "USD",
        "merchant_category": "cash_advance",
        "location_country": "XX",
        "timestamp": datetime.now(),
        "location": {
            "city": "Unknown City",
            "state": "Unknown State",
            "country": "XX",
            "coordinates": {
                "type": "Point",
                "coordinates": [0.0, 0.0]  # Unknown location
            }
        },
        "device_info": {
            "device_id": "unknown_device_xyz",
            "type": "desktop",
            "os": "Unknown",
            "browser": "Unknown",
            "ip": "10.0.0.1"
        },
        "customer_profile": {
            "risk_score": 75.0,
            "avg_transaction_amount": 100.0,
            "usual_merchants": ["grocery", "gas_station"],
            "usual_locations": ["US"],
            "known_devices": ["known_device_456"]
        },
        "expected_stage": 1,
        "expected_decision": "BLOCK",
        "description": "High amount, risky category, unknown device, unknown location - should be blocked in Stage 1"
    },
    {
        "transaction_id": "demo_003_edge_case",
        "customer_id": "customer_789",
        "amount": 1500.00,
        "currency": "USD",
        "merchant_category": "electronics",
        "location_country": "US",
        "timestamp": datetime.now(),
        "location": {
            "city": "Different City",
            "state": "Different State", 
            "country": "US",
            "coordinates": {
                "type": "Point",
                "coordinates": [-45.0, 28.0]  # Different location but same country
            }
        },
        "device_info": {
            "device_id": "mixed_device_789",
            "type": "tablet",
            "os": "iOS",
            "browser": "Safari",
            "ip": "172.16.1.50"
        },
        "customer_profile": {
            "risk_score": 45.0,
            "avg_transaction_amount": 200.0,
            "usual_merchants": ["retail", "electronics"],
            "usual_locations": ["US"],
            "known_devices": ["known_device_789"]
        },
        "expected_stage": 2,
        "expected_decision": "INVESTIGATE",
        "description": "Medium risk - should proceed to Stage 2 for AI analysis"
    }
    # {
    #     "transaction_id": "demo_003_edge_case",
    #     "customer_id": "customer_789",
    #     "amount": 1500.00,
    #     "merchant_category": "electronics",
    #     "location_country": "US",
    #     "expected_stage": 2,
    #     "expected_decision": "INVESTIGATE",
    #     "description": "Medium risk - should proceed to Stage 2 for AI analysis"
    # }
]


def validate_environment() -> Dict[str, Any]:
    """Validate that the environment is properly configured for demo"""
    env_status = {
        "valid": True,
        "missing_vars": [],
        "warnings": []
    }
    
    # Check required variables
    required_vars = [
        "AZURE_FOUNDRY_PROJECT_ENDPOINT",
        "MONGODB_URI",
        "DB_NAME"
    ]
    
    for var in required_vars:
        if not os.getenv(var):
            env_status["missing_vars"].append(var)
            env_status["valid"] = False
    
    # Check optional but recommended variables
    optional_vars = [
        "AZURE_OPENAI_DEPLOYMENT",
        "AZURE_SUBSCRIPTION_ID"
    ]
    
    for var in optional_vars:
        if not os.getenv(var):
            env_status["warnings"].append(f"Optional variable {var} not set - using defaults")
    
    return env_status