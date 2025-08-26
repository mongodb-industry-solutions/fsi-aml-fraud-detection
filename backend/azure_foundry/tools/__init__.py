"""
Standard Azure AI Foundry tool implementations
Following native FunctionTool patterns from Azure documentation
"""

from .native_tools import FraudDetectionTools, create_fraud_toolset

__all__ = ["FraudDetectionTools", "create_fraud_toolset"]