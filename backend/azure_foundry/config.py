"""
Demo configuration for Azure AI Foundry Two-Stage Agent
Simplified settings optimized for demonstration purposes
"""

import os
from typing import Dict, Any
from .models import AgentConfig


def get_demo_agent_config() -> AgentConfig:
    """Get demo-optimized agent configuration"""
    
    # Required Azure AI Foundry settings
    project_endpoint = os.getenv("AZURE_FOUNDRY_PROJECT_ENDPOINT")
    if not project_endpoint:
        raise ValueError(
            "AZURE_AI_PROJECT_ENDPOINT environment variable is required. "
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
DEMO_TEST_TRANSACTIONS = [
    {
        "transaction_id": "demo_001_low_risk",
        "customer_id": "customer_123",
        "amount": 45.99,
        "merchant_category": "restaurant",
        "location_country": "US",
        "expected_stage": 1,
        "expected_decision": "APPROVE",
        "description": "Small amount, familiar merchant - should be approved in Stage 1"
    },
    {
        "transaction_id": "demo_002_high_risk",
        "customer_id": "customer_456",
        "amount": 9999.99,
        "merchant_category": "cash_advance",
        "location_country": "XX",
        "expected_stage": 1,
        "expected_decision": "BLOCK",
        "description": "High amount, risky category - should be blocked in Stage 1"
    },
    {
        "transaction_id": "demo_003_edge_case",
        "customer_id": "customer_789",
        "amount": 1500.00,
        "merchant_category": "electronics",
        "location_country": "US",
        "expected_stage": 2,
        "expected_decision": "INVESTIGATE",
        "description": "Medium risk - should proceed to Stage 2 for AI analysis"
    }
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