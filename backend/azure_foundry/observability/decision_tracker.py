"""
Azure AI Foundry Decision Tracker
Tracks agent decision-making patterns, reasoning, and outcomes for fraud detection analysis
"""

import json
import logging
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime, timezone
from dataclasses import dataclass, asdict
from enum import Enum

from .telemetry_config import create_span

logger = logging.getLogger(__name__)

class DecisionType(Enum):
    """Types of decisions an agent can make"""
    FRAUD_ASSESSMENT = "fraud_assessment"
    RISK_SCORING = "risk_scoring"
    TOOL_SELECTION = "tool_selection"
    ANALYSIS_APPROACH = "analysis_approach"
    RECOMMENDATION = "recommendation"
    ESCALATION = "escalation"

class ConfidenceLevel(Enum):
    """Confidence levels for agent decisions"""
    VERY_LOW = "very_low"
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    VERY_HIGH = "very_high"

@dataclass
class DecisionFactor:
    """A factor that influenced an agent's decision"""
    factor_type: str  # "data_point", "rule", "pattern", "historical"
    description: str
    weight: float  # 0.0 to 1.0
    value: Any
    impact: str  # "positive", "negative", "neutral"

@dataclass
class AgentDecision:
    """Comprehensive record of an agent decision"""
    decision_id: str
    thread_id: str
    run_id: str
    agent_id: str
    decision_type: DecisionType
    timestamp: str
    
    # Decision content
    decision_summary: str
    confidence_level: ConfidenceLevel
    confidence_score: float  # 0.0 to 1.0
    
    # Context and reasoning
    input_context: Dict[str, Any]
    decision_factors: List[DecisionFactor]
    reasoning_chain: List[str]  # Step-by-step reasoning
    alternative_considered: List[str]
    
    # Tool usage
    tools_used: List[str]
    tool_outputs: Dict[str, Any]
    
    # Outcomes and validation
    predicted_outcome: Optional[str] = None
    actual_outcome: Optional[str] = None
    outcome_accuracy: Optional[float] = None  # When actual vs predicted is known
    
    # Metadata
    processing_time_ms: Optional[float] = None
    error_occurred: bool = False
    error_message: Optional[str] = None
    
    def __post_init__(self):
        if self.decision_factors is None:
            self.decision_factors = []
        if self.reasoning_chain is None:
            self.reasoning_chain = []
        if self.alternative_considered is None:
            self.alternative_considered = []
        if self.tools_used is None:
            self.tools_used = []
        if self.tool_outputs is None:
            self.tool_outputs = {}

@dataclass
class DecisionPattern:
    """Pattern analysis for agent decision-making"""
    pattern_type: str
    frequency: int
    success_rate: float
    avg_confidence: float
    common_factors: List[str]
    typical_tools_used: List[str]
    example_decisions: List[str]  # Decision IDs for examples

class DecisionTracker:
    """
    Tracks and analyzes agent decision-making patterns for fraud detection optimization
    """
    
    def __init__(self):
        """Initialize the decision tracker"""
        self.decisions: Dict[str, AgentDecision] = {}
        self.decision_patterns: Dict[str, DecisionPattern] = {}
        self.agent_decision_history: Dict[str, List[str]] = {}  # agent_id -> decision_ids
        
    def track_decision(
        self,
        thread_id: str,
        run_id: str,
        agent_id: str,
        decision_type: DecisionType,
        decision_summary: str,
        confidence_level: ConfidenceLevel,
        confidence_score: float,
        input_context: Dict[str, Any],
        reasoning_chain: List[str] = None,
        decision_factors: List[DecisionFactor] = None,
        tools_used: List[str] = None,
        tool_outputs: Dict[str, Any] = None,
        processing_time_ms: float = None
    ) -> str:
        """
        Track a new agent decision.
        
        Args:
            thread_id: Azure AI thread ID
            run_id: Run ID where decision was made
            agent_id: Agent that made the decision
            decision_type: Type of decision made
            decision_summary: Summary of the decision
            confidence_level: Agent's confidence level
            confidence_score: Numeric confidence (0.0-1.0)
            input_context: Context data that influenced the decision
            reasoning_chain: Step-by-step reasoning process
            decision_factors: Factors that influenced the decision
            tools_used: Tools used to make the decision
            tool_outputs: Outputs from tools used
            processing_time_ms: Time taken to make the decision
            
        Returns:
            Decision ID for tracking
        """
        with create_span("track_agent_decision", {
            "thread_id": thread_id,
            "run_id": run_id,
            "agent_id": agent_id,
            "decision_type": decision_type.value
        }) as span:
            
            decision_id = f"{thread_id}_{run_id}_{decision_type.value}_{datetime.now().strftime('%H%M%S%f')}"
            
            decision = AgentDecision(
                decision_id=decision_id,
                thread_id=thread_id,
                run_id=run_id,
                agent_id=agent_id,
                decision_type=decision_type,
                timestamp=datetime.now(timezone.utc).isoformat(),
                decision_summary=decision_summary,
                confidence_level=confidence_level,
                confidence_score=confidence_score,
                input_context=input_context or {},
                decision_factors=decision_factors or [],
                reasoning_chain=reasoning_chain or [],
                alternative_considered=[],
                tools_used=tools_used or [],
                tool_outputs=tool_outputs or {},
                processing_time_ms=processing_time_ms
            )
            
            # Store decision
            self.decisions[decision_id] = decision
            
            # Track for agent
            if agent_id not in self.agent_decision_history:
                self.agent_decision_history[agent_id] = []
            self.agent_decision_history[agent_id].append(decision_id)
            
            # Update patterns
            self._update_decision_patterns(decision)
            
            span.set_attribute("decision.id", decision_id)
            span.set_attribute("decision.confidence_score", confidence_score)
            span.set_attribute("decision.tools_count", len(tools_used or []))
            
            logger.info(f"🎯 Tracked decision: {decision_type.value} | Confidence: {confidence_score:.2f} | Agent: {agent_id}")
            
            return decision_id
    
    def update_decision_outcome(
        self,
        decision_id: str,
        actual_outcome: str,
        outcome_accuracy: float = None
    ):
        """
        Update a decision with its actual outcome for validation.
        
        Args:
            decision_id: ID of the decision to update
            actual_outcome: What actually happened
            outcome_accuracy: Accuracy score (0.0-1.0) if calculable
        """
        if decision_id not in self.decisions:
            logger.warning(f"Decision {decision_id} not found for outcome update")
            return
        
        decision = self.decisions[decision_id]
        decision.actual_outcome = actual_outcome
        decision.outcome_accuracy = outcome_accuracy
        
        logger.info(f"📊 Updated decision outcome: {decision_id} | Accuracy: {outcome_accuracy or 'N/A'}")
    
    def track_fraud_assessment_decision(
        self,
        thread_id: str,
        run_id: str,
        agent_id: str,
        transaction_data: Dict[str, Any],
        risk_score: float,
        fraud_indicators: List[str],
        reasoning: List[str],
        tools_used: List[str] = None,
        processing_time_ms: float = None
    ) -> str:
        """
        Specialized method for tracking fraud assessment decisions.
        
        Args:
            thread_id: Thread ID
            run_id: Run ID  
            agent_id: Agent ID
            transaction_data: Transaction being assessed
            risk_score: Calculated risk score
            fraud_indicators: List of fraud indicators found
            reasoning: Reasoning chain for the assessment
            tools_used: Tools used in assessment
            processing_time_ms: Processing time
            
        Returns:
            Decision ID
        """
        # Determine confidence based on risk score and indicators
        confidence_score = min(len(fraud_indicators) * 0.2 + (risk_score / 100), 1.0)
        confidence_level = self._score_to_confidence_level(confidence_score)
        
        # Create decision factors
        factors = []
        for indicator in fraud_indicators:
            factors.append(DecisionFactor(
                factor_type="fraud_indicator",
                description=indicator,
                weight=0.8 / len(fraud_indicators) if fraud_indicators else 0.1,
                value=True,
                impact="negative"
            ))
        
        factors.append(DecisionFactor(
            factor_type="risk_score",
            description="Calculated risk score",
            weight=0.7,
            value=risk_score,
            impact="negative" if risk_score > 50 else "neutral"
        ))
        
        decision_summary = (
            f"Fraud assessment: Risk score {risk_score:.1f}, "
            f"{len(fraud_indicators)} indicators detected"
        )
        
        return self.track_decision(
            thread_id=thread_id,
            run_id=run_id,
            agent_id=agent_id,
            decision_type=DecisionType.FRAUD_ASSESSMENT,
            decision_summary=decision_summary,
            confidence_level=confidence_level,
            confidence_score=confidence_score,
            input_context={
                "transaction": transaction_data,
                "risk_score": risk_score,
                "fraud_indicators": fraud_indicators
            },
            reasoning_chain=reasoning,
            decision_factors=factors,
            tools_used=tools_used,
            processing_time_ms=processing_time_ms
        )
    
    def _score_to_confidence_level(self, score: float) -> ConfidenceLevel:
        """Convert numeric confidence score to confidence level"""
        if score >= 0.9:
            return ConfidenceLevel.VERY_HIGH
        elif score >= 0.7:
            return ConfidenceLevel.HIGH
        elif score >= 0.5:
            return ConfidenceLevel.MEDIUM
        elif score >= 0.3:
            return ConfidenceLevel.LOW
        else:
            return ConfidenceLevel.VERY_LOW
    
    def _update_decision_patterns(self, decision: AgentDecision):
        """Update decision patterns based on new decision"""
        pattern_key = f"{decision.agent_id}_{decision.decision_type.value}"
        
        if pattern_key not in self.decision_patterns:
            self.decision_patterns[pattern_key] = DecisionPattern(
                pattern_type=decision.decision_type.value,
                frequency=0,
                success_rate=0.0,
                avg_confidence=0.0,
                common_factors=[],
                typical_tools_used=[],
                example_decisions=[]
            )
        
        pattern = self.decision_patterns[pattern_key]
        pattern.frequency += 1
        
        # Update average confidence
        pattern.avg_confidence = (
            pattern.avg_confidence * (pattern.frequency - 1) + decision.confidence_score
        ) / pattern.frequency
        
        # Track common factors
        factor_types = [f.factor_type for f in decision.decision_factors]
        pattern.common_factors.extend(factor_types)
        pattern.common_factors = list(set(pattern.common_factors))  # Remove duplicates
        
        # Track typical tools
        pattern.typical_tools_used.extend(decision.tools_used)
        pattern.typical_tools_used = list(set(pattern.typical_tools_used))  # Remove duplicates
        
        # Keep recent examples (max 5)
        pattern.example_decisions.append(decision.decision_id)
        if len(pattern.example_decisions) > 5:
            pattern.example_decisions = pattern.example_decisions[-5:]
    
    def get_agent_decisions(
        self, 
        agent_id: str, 
        decision_type: DecisionType = None,
        limit: int = 50
    ) -> List[AgentDecision]:
        """
        Get decisions made by a specific agent.
        
        Args:
            agent_id: Agent ID to filter by
            decision_type: Optional decision type filter
            limit: Maximum number of decisions to return
            
        Returns:
            List of agent decisions
        """
        if agent_id not in self.agent_decision_history:
            return []
        
        decision_ids = self.agent_decision_history[agent_id]
        decisions = [self.decisions[did] for did in decision_ids if did in self.decisions]
        
        if decision_type:
            decisions = [d for d in decisions if d.decision_type == decision_type]
        
        # Sort by timestamp (most recent first)
        decisions.sort(key=lambda d: d.timestamp, reverse=True)
        
        return decisions[:limit]
    
    def get_decision_analytics(self, agent_id: str = None) -> Dict[str, Any]:
        """
        Get comprehensive analytics about agent decision-making.
        
        Args:
            agent_id: Optional agent ID filter
            
        Returns:
            Analytics data
        """
        decisions = []
        if agent_id:
            decisions = self.get_agent_decisions(agent_id)
        else:
            decisions = list(self.decisions.values())
        
        if not decisions:
            return {"total_decisions": 0}
        
        # Calculate analytics
        total_decisions = len(decisions)
        avg_confidence = sum(d.confidence_score for d in decisions) / total_decisions
        
        decision_type_counts = {}
        confidence_distribution = {level.value: 0 for level in ConfidenceLevel}
        tool_usage = {}
        
        for decision in decisions:
            # Decision type counts
            dt = decision.decision_type.value
            decision_type_counts[dt] = decision_type_counts.get(dt, 0) + 1
            
            # Confidence distribution
            confidence_distribution[decision.confidence_level.value] += 1
            
            # Tool usage
            for tool in decision.tools_used:
                tool_usage[tool] = tool_usage.get(tool, 0) + 1
        
        # Calculate success rate (where outcome is known)
        decisions_with_outcomes = [d for d in decisions if d.actual_outcome is not None]
        success_rate = 0.0
        if decisions_with_outcomes:
            accurate_decisions = [d for d in decisions_with_outcomes if d.outcome_accuracy and d.outcome_accuracy > 0.7]
            success_rate = len(accurate_decisions) / len(decisions_with_outcomes)
        
        return {
            "total_decisions": total_decisions,
            "avg_confidence_score": avg_confidence,
            "success_rate": success_rate,
            "decision_type_distribution": decision_type_counts,
            "confidence_level_distribution": confidence_distribution,
            "most_used_tools": sorted(tool_usage.items(), key=lambda x: x[1], reverse=True)[:10],
            "decisions_with_known_outcomes": len(decisions_with_outcomes),
            "pattern_count": len(self.decision_patterns)
        }
    
    def export_decision_history(
        self, 
        file_path: str = None, 
        agent_id: str = None,
        include_patterns: bool = True
    ) -> str:
        """
        Export decision history to JSON file for analysis.
        
        Args:
            file_path: Optional file path
            agent_id: Optional agent ID filter
            include_patterns: Whether to include pattern analysis
            
        Returns:
            File path where data was exported
        """
        if not file_path:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            agent_suffix = f"_{agent_id}" if agent_id else ""
            file_path = f"agent_decisions{agent_suffix}_{timestamp}.json"
        
        try:
            decisions_to_export = []
            if agent_id:
                decisions_to_export = [asdict(d) for d in self.get_agent_decisions(agent_id)]
            else:
                decisions_to_export = [asdict(d) for d in self.decisions.values()]
            
            export_data = {
                "exported_at": datetime.now(timezone.utc).isoformat(),
                "agent_filter": agent_id,
                "total_decisions": len(decisions_to_export),
                "decisions": decisions_to_export,
                "analytics": self.get_decision_analytics(agent_id)
            }
            
            if include_patterns:
                patterns_to_export = {}
                for pattern_key, pattern in self.decision_patterns.items():
                    if not agent_id or agent_id in pattern_key:
                        patterns_to_export[pattern_key] = asdict(pattern)
                export_data["patterns"] = patterns_to_export
            
            with open(file_path, 'w') as f:
                json.dump(export_data, f, indent=2, default=str)
            
            logger.info(f"✅ Decision history exported to {file_path}")
            return file_path
            
        except Exception as e:
            logger.error(f"❌ Failed to export decision history: {e}")
            raise