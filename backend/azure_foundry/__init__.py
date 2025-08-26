"""
Azure Foundry integration package for embeddings, AI services, and two-stage fraud detection agent
"""

# Legacy embeddings support
from .embeddings import get_embedding, get_embedding_model, AzureFoundryEmbeddings

# Two-stage agent components
from .agent_core import TwoStageAgentCore
from .models import (
    TransactionInput, 
    AgentDecision, 
    DecisionType, 
    RiskLevel,
    AgentConfig,
    PerformanceMetrics
)
from .config import get_demo_agent_config, validate_environment

__version__ = "1.0.0-demo"

__all__ = [
    # Legacy embeddings
    'get_embedding', 
    'get_embedding_model', 
    'AzureFoundryEmbeddings',
    
    # Two-stage agent
    "TwoStageAgentCore",
    "TransactionInput",
    "AgentDecision", 
    "DecisionType",
    "RiskLevel",
    "AgentConfig",
    "PerformanceMetrics",
    "get_demo_agent_config",
    "validate_environment"
]
