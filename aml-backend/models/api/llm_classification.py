"""
LLM Classification Models - Request/Response models for AI-powered entity classification

Data models for LLM-powered classification and investigation workflows.
"""

from datetime import datetime
from enum import Enum
from typing import Dict, List, Optional, Any, Union
from pydantic import BaseModel, Field, validator


# ==================== ENUMS ====================

class RecommendedAction(str, Enum):
    """LLM recommended actions for entity"""
    APPROVE = "approve"
    REVIEW = "review" 
    REJECT = "reject"
    INVESTIGATE = "investigate"


class NetworkClassification(str, Enum):
    """Entity network positioning classification"""
    HUB = "hub"
    BRIDGE = "bridge"
    LEAF = "leaf"
    ISOLATED = "isolated"


class ConfidenceLevel(str, Enum):
    """LLM confidence level categories"""
    HIGH = "high"         # >= 80%
    MEDIUM = "medium"     # 60-79%
    LOW = "low"          # < 60%


# ==================== REQUEST MODELS ====================

class ClassificationRequest(BaseModel):
    """Request for LLM entity classification"""
    workflow_data: Dict[str, Any] = Field(..., description="Complete workflow data from steps 0-2")
    model_preference: str = Field(default="claude-3-sonnet", description="AWS Bedrock model to use")
    analysis_depth: str = Field(default="comprehensive", description="Analysis depth: basic, standard, comprehensive")
    
    class Config:
        schema_extra = {
            "example": {
                "workflow_data": {
                    "entityInput": {"fullName": "John Smith", "entityType": "individual"},
                    "searchResults": {"hybridResults": [{"entityId": "ent_123", "hybridScore": 0.85}]},
                    "networkAnalysis": {"entitiesAnalyzed": 3, "entityAnalyses": []}
                },
                "model_preference": "claude-3-sonnet",
                "analysis_depth": "comprehensive"
            }
        }


# ==================== RESPONSE MODELS ====================

class AMLKYCFlags(BaseModel):
    """AML/KYC compliance flags identified by LLM"""
    sanctions_risk: bool = False
    pep_risk: bool = False
    high_volume_transactions: bool = False
    suspicious_network_connections: bool = False
    geographic_risk: bool = False
    identity_verification_gaps: bool = False
    
    additional_flags: List[str] = Field(default_factory=list)
    flag_explanations: Dict[str, str] = Field(default_factory=dict)


class DataQualityAssessment(BaseModel):
    """Data quality and completeness assessment"""
    completeness_score: float = Field(..., ge=0, le=100, description="Data completeness percentage")
    reliability_score: float = Field(..., ge=0, le=100, description="Data reliability percentage")
    consistency_score: float = Field(..., ge=0, le=100, description="Data consistency percentage")
    
    missing_critical_fields: List[str] = Field(default_factory=list)
    data_conflicts: List[str] = Field(default_factory=list)
    quality_recommendations: List[str] = Field(default_factory=list)


class RiskFactorAnalysis(BaseModel):
    """Detailed risk factor breakdown"""
    primary_risk_factors: List[str] = Field(default_factory=list)
    secondary_risk_factors: List[str] = Field(default_factory=list)
    mitigating_factors: List[str] = Field(default_factory=list)
    
    risk_probability_assessment: Dict[str, float] = Field(default_factory=dict)
    potential_impact_analysis: Dict[str, str] = Field(default_factory=dict)


class EntityClassificationResult(BaseModel):
    """Comprehensive LLM classification result"""
    
    # Overall Classification
    overall_risk_level: str = Field(..., description="Critical/High/Medium/Low")
    risk_score: float = Field(..., ge=0, le=100, description="Overall risk score 0-100")
    risk_rationale: str = Field(..., description="LLM reasoning for risk assessment")
    
    # Entity Type Validation
    entity_type_confidence: float = Field(..., ge=0, le=1, description="Confidence in entity type classification")
    entity_type_validation: str = Field(..., description="LLM validation of entity type")
    entity_type_concerns: List[str] = Field(default_factory=list)
    
    # AML/KYC Compliance
    aml_kyc_flags: AMLKYCFlags
    compliance_concerns: List[str] = Field(default_factory=list)
    regulatory_implications: List[str] = Field(default_factory=list)
    
    # Network Analysis
    network_classification: NetworkClassification
    network_influence_score: float = Field(..., ge=0, le=100, description="Network influence/centrality score")
    network_risk_indicators: List[str] = Field(default_factory=list)
    
    # Data Quality
    data_quality_assessment: DataQualityAssessment
    
    # Action Recommendations
    recommended_action: RecommendedAction
    action_rationale: str = Field(..., description="Reasoning for recommended action")
    action_conditions: List[str] = Field(default_factory=list, description="Conditions or restrictions")
    
    # Risk Analysis
    risk_factor_analysis: RiskFactorAnalysis
    
    # Confidence and Metadata
    confidence_score: float = Field(..., ge=0, le=100, description="Overall LLM confidence in classification")
    confidence_level: ConfidenceLevel = Field(default=ConfidenceLevel.MEDIUM, description="Confidence level category")
    confidence_factors: List[str] = Field(default_factory=list, description="Factors affecting confidence")
    
    # LLM Processing Details
    llm_analysis: str = Field(..., description="Full LLM reasoning and analysis")
    classification_timestamp: datetime = Field(default_factory=datetime.utcnow)
    classification_model: str = Field(..., description="AWS Bedrock model used")
    processing_time_ms: Optional[int] = Field(None, description="Processing time in milliseconds")
    
    # Search Results Analysis
    search_effectiveness_analysis: Dict[str, Any] = Field(default_factory=dict)
    match_quality_assessment: Dict[str, Any] = Field(default_factory=dict)
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }
    
    @validator('confidence_level', pre=True, always=True)
    def set_confidence_level(cls, v, values):
        """Automatically set confidence level based on confidence score"""
        if v is not None:
            return v
        if 'confidence_score' in values:
            score = values['confidence_score']
            if score >= 80:
                return ConfidenceLevel.HIGH
            elif score >= 60:
                return ConfidenceLevel.MEDIUM
            else:
                return ConfidenceLevel.LOW
        return ConfidenceLevel.MEDIUM
    
    @validator('risk_score')
    def validate_risk_score(cls, v):
        """Ensure risk score is in valid range"""
        if not 0 <= v <= 100:
            raise ValueError("Risk score must be between 0 and 100")
        return round(v, 2)
    
    @property
    def requires_review(self) -> bool:
        """Determine if this classification requires human review"""
        return (
            self.recommended_action in [RecommendedAction.REVIEW, RecommendedAction.INVESTIGATE] or
            self.confidence_level == ConfidenceLevel.LOW or
            self.risk_score >= 75 or
            len(self.compliance_concerns) > 0
        )
    
    @property
    def high_risk_indicators(self) -> List[str]:
        """Get list of high risk indicators"""
        indicators = []
        if self.risk_score >= 75:
            indicators.append(f"High risk score ({self.risk_score}/100)")
        if self.aml_kyc_flags.sanctions_risk:
            indicators.append("Sanctions risk identified")
        if self.aml_kyc_flags.pep_risk:
            indicators.append("PEP risk identified")
        if self.network_classification == NetworkClassification.HUB and self.network_influence_score >= 70:
            indicators.append("High-influence network hub")
        return indicators


# ==================== WORKFLOW INTEGRATION MODELS ====================

class WorkflowClassificationSummary(BaseModel):
    """Summary of classification for workflow integration"""
    entity_name: str
    entity_id: Optional[str] = None
    classification_result: EntityClassificationResult
    workflow_step: int = Field(default=3, description="Workflow step number")
    next_recommended_step: str = Field(..., description="Next step recommendation")
    requires_intervention: bool = Field(..., description="Whether human intervention is required")
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


# ==================== ERROR HANDLING MODELS ====================

class ClassificationError(BaseModel):
    """Classification error details"""
    error_type: str
    error_message: str
    error_details: Dict[str, Any] = Field(default_factory=dict)
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class ClassificationResponse(BaseModel):
    """Wrapper response for classification operations"""
    success: bool
    result: Optional[EntityClassificationResult] = None
    error: Optional[ClassificationError] = None
    processing_metadata: Dict[str, Any] = Field(default_factory=dict)
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }