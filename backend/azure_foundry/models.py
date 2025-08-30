"""
Simplified data models for Azure AI Foundry Two-Stage Agent
Focused on demo needs without unnecessary complexity
"""

from dataclasses import dataclass, asdict
from typing import Dict, List, Optional, Any
from datetime import datetime
from enum import Enum


class DecisionType(Enum):
    APPROVE = "APPROVE"
    INVESTIGATE = "INVESTIGATE"
    ESCALATE = "ESCALATE"
    BLOCK = "BLOCK"


class RiskLevel(Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


@dataclass
class TransactionInput:
    """Simplified transaction input for analysis"""
    transaction_id: str
    customer_id: str
    amount: float
    currency: str = "USD"
    merchant_category: str = "unknown"
    location_country: str = "US"
    timestamp: datetime = None
    
    def __post_init__(self):
        if self.timestamp is None:
            self.timestamp = datetime.now()


@dataclass
class Stage1Result:
    """Results from Stage 1 (Rules + Basic ML) analysis"""
    rule_score: float  # 0-100
    rule_flags: List[str]
    basic_ml_score: Optional[float] = None  # 0-100 if available
    combined_score: float = 0.0
    needs_stage2: bool = False
    processing_time_ms: float = 0.0
    
    def __post_init__(self):
        # Calculate combined score
        if self.basic_ml_score is not None:
            self.combined_score = (self.rule_score * 0.6) + (self.basic_ml_score * 0.4)
        else:
            self.combined_score = self.rule_score
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for storage/API responses"""
        return asdict(self)


@dataclass
class Stage2Result:
    """Results from Stage 2 (Vector + AI) analysis"""
    similar_transactions_count: int = 0
    similarity_risk_score: float = 0.0  # 0-100
    ai_analysis_summary: str = ""
    ai_recommendation: Optional[DecisionType] = None
    pattern_insights: List[str] = None
    processing_time_ms: float = 0.0
    
    def __post_init__(self):
        if self.pattern_insights is None:
            self.pattern_insights = []
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for storage/API responses"""
        result = asdict(self)
        # Convert enum to string if present
        if self.ai_recommendation:
            result['ai_recommendation'] = self.ai_recommendation.value
        return result


@dataclass
class AgentDecision:
    """Final decision from the two-stage agent"""
    transaction_id: str
    decision: DecisionType
    confidence: float  # 0-1
    risk_score: float  # 0-100
    risk_level: RiskLevel
    
    # Stage information
    stage_completed: int  # 1 or 2
    stage1_result: Optional[Stage1Result] = None
    stage2_result: Optional[Stage2Result] = None
    
    # Metadata
    reasoning: str = ""
    total_processing_time_ms: float = 0.0
    thread_id: Optional[str] = None
    timestamp: datetime = None
    agent_version: str = "demo-v1"
    
    def __post_init__(self):
        if self.timestamp is None:
            self.timestamp = datetime.now()
        
        # Determine risk level from score
        if self.risk_score >= 80:
            self.risk_level = RiskLevel.CRITICAL
        elif self.risk_score >= 60:
            self.risk_level = RiskLevel.HIGH
        elif self.risk_score >= 40:
            self.risk_level = RiskLevel.MEDIUM
        else:
            self.risk_level = RiskLevel.LOW
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for storage/API responses"""
        result = asdict(self)
        # Convert enums to strings
        result['decision'] = self.decision.value
        result['risk_level'] = self.risk_level.value
        # Convert datetime to ISO string
        result['timestamp'] = self.timestamp.isoformat()
        # Convert stage results using their to_dict methods
        if self.stage1_result:
            result['stage1_result'] = self.stage1_result.to_dict()
        if self.stage2_result:
            result['stage2_result'] = self.stage2_result.to_dict()
        return result


@dataclass
class AgentConfig:
    """Demo configuration for the agent"""
    # Azure AI Foundry settings
    project_endpoint: str
    model_deployment: str = "gpt-4o"
    agent_temperature: float = 0.3
    
    # Stage 1 thresholds (simplified for demo)
    stage1_auto_approve_threshold: float = 25.0  # < 25: auto approve
    stage1_auto_block_threshold: float = 85.0    # > 85: auto block
    # Between 25-85: proceed to Stage 2
    
    # Agent behavior settings
    enable_thread_memory: bool = True
    max_thread_messages: int = 50
    default_timeout_seconds: int = 30
    
    # Demo mode settings
    demo_mode: bool = True
    verbose_logging: bool = True
    mock_ml_scoring: bool = True  # Use simple mock ML instead of Azure ML


@dataclass
class PerformanceMetrics:
    """Simple performance tracking for demo"""
    total_transactions: int = 0
    stage1_decisions: int = 0
    stage2_decisions: int = 0
    avg_processing_time_ms: float = 0.0
    avg_confidence: float = 0.0
    decision_breakdown: Dict[str, int] = None
    
    def __post_init__(self):
        if self.decision_breakdown is None:
            self.decision_breakdown = {
                DecisionType.APPROVE.value: 0,
                DecisionType.INVESTIGATE.value: 0,
                DecisionType.ESCALATE.value: 0,
                DecisionType.BLOCK.value: 0
            }
    
    @property
    def stage1_efficiency(self) -> float:
        """Percentage of decisions made in Stage 1"""
        if self.total_transactions == 0:
            return 0.0
        return (self.stage1_decisions / self.total_transactions) * 100


# Simple error classes
class AgentError(Exception):
    """Base exception for agent errors"""
    pass


class Stage1Error(AgentError):
    """Error in Stage 1 processing"""
    pass


class Stage2Error(AgentError):
    """Error in Stage 2 processing"""
    pass


class AzureAIError(AgentError):
    """Error communicating with Azure AI services"""
    pass