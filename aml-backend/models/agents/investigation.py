"""
Pydantic structured-output models used by every agent node.

Each model is passed to `model.with_structured_output(...)` so the LLM
returns typed, schema-validated JSON that drives downstream logic.
"""

from __future__ import annotations

from enum import Enum
from typing import List, Literal, Optional

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------

class CrimeTypology(str, Enum):
    STRUCTURING = "structuring"
    LAYERING = "layering"
    FUNNEL_ACCOUNT = "funnel_account"
    TRADE_BASED_ML = "trade_based_money_laundering"
    TERRORIST_FINANCING = "terrorist_financing"
    FRAUD_SCHEME = "fraud_scheme"
    SANCTIONS_EVASION = "sanctions_evasion"
    CRYPTO_MIXING = "crypto_mixing"
    ELDER_EXPLOITATION = "elder_exploitation"
    SHELL_COMPANY = "shell_company"
    UNKNOWN = "unknown"


# ---------------------------------------------------------------------------
# Triage
# ---------------------------------------------------------------------------

class TriageDecision(BaseModel):
    risk_score: float = Field(ge=0, le=100, description="Composite risk score 0-100")
    disposition: Literal["auto_close", "investigate", "escalate_urgent"] = Field(
        description="Routing decision for the alert"
    )
    reasoning: str = Field(description="Explanation supporting the disposition")
    typology_hint: str = Field(
        default="", description="Suspected typology if any signal is present"
    )


# ---------------------------------------------------------------------------
# Case File (assembled by the data-gathering fan-in)
# ---------------------------------------------------------------------------

class EntityProfile(BaseModel):
    entity_id: str = ""
    name: str = ""
    entity_type: str = ""
    risk_score: float = 0
    risk_level: str = "unknown"
    addresses: List[str] = Field(default_factory=list)
    watchlist_hits: List[str] = Field(default_factory=list)

class TransactionSummary(BaseModel):
    total_count: int = 0
    total_volume: float = 0
    avg_amount: float = 0
    high_risk_count: int = 0
    flagged_transactions: List[dict] = Field(default_factory=list)

class SanctionsScreening(BaseModel):
    screened: bool = False
    hits: List[dict] = Field(default_factory=list)
    clean: bool = True

class CaseFile(BaseModel):
    """360-degree profile assembled from all gathered data."""
    entity: EntityProfile = Field(default_factory=EntityProfile)
    transactions: TransactionSummary = Field(default_factory=TransactionSummary)
    sanctions: SanctionsScreening = Field(default_factory=SanctionsScreening)
    adverse_media: List[str] = Field(default_factory=list)
    similar_past_cases: List[str] = Field(default_factory=list)
    network_summary: str = ""
    key_findings: List[str] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# Typology
# ---------------------------------------------------------------------------

class TypologyResult(BaseModel):
    primary_typology: CrimeTypology = CrimeTypology.UNKNOWN
    confidence: float = Field(ge=0, le=1, default=0)
    secondary_typologies: List[CrimeTypology] = Field(default_factory=list)
    red_flags: List[str] = Field(default_factory=list)
    supporting_evidence: List[str] = Field(default_factory=list)
    reasoning: str = ""


# ---------------------------------------------------------------------------
# Network Analysis
# ---------------------------------------------------------------------------

class NetworkRiskProfile(BaseModel):
    network_size: int = 0
    high_risk_connections: int = 0
    max_depth_reached: int = 0
    shell_structure_indicators: List[str] = Field(default_factory=list)
    degree_centrality: float = Field(default=0, description="Computed from actual connection counts, normalized 0-1")
    network_risk_score: float = Field(default=0, description="Composite risk: base entity risk + connection risk factor (0-100)")
    base_entity_risk: float = Field(default=0, description="Entity's own riskAssessment.overall.score (0-100)")
    key_connections: List[dict] = Field(default_factory=list)
    summary: str = ""


# ---------------------------------------------------------------------------
# Temporal Analysis
# ---------------------------------------------------------------------------

class TemporalAnalysis(BaseModel):
    structuring_indicators: List[dict] = Field(default_factory=list)
    velocity_anomalies: List[dict] = Field(default_factory=list)
    round_trip_patterns: List[dict] = Field(default_factory=list)
    time_anomalies: List[dict] = Field(default_factory=list)
    dormancy_bursts: List[dict] = Field(default_factory=list)
    timeline_summary: str = ""


# ---------------------------------------------------------------------------
# Trail Analysis & Investigation Leads
# ---------------------------------------------------------------------------

class InvestigationLead(BaseModel):
    entity_id: str
    entity_name: str = ""
    reason: str = ""
    risk_indicators: List[str] = Field(default_factory=list)
    relationship_to_subject: str = ""
    priority: Literal["high", "medium", "low"] = "medium"


class TrailAnalysis(BaseModel):
    ownership_chains: List[dict] = Field(default_factory=list)
    shell_patterns: List[str] = Field(default_factory=list)
    leads: List[InvestigationLead] = Field(default_factory=list)
    summary: str = ""


# ---------------------------------------------------------------------------
# Sub-Investigation (Mini-Investigate)
# ---------------------------------------------------------------------------

class LeadAssessment(BaseModel):
    entity_id: str = ""
    entity_name: str = ""
    risk_level: Literal["low", "medium", "high", "critical"] = "medium"
    risk_score: float = Field(ge=0, le=100, default=0)
    watchlist_hits: int = 0
    connection_to_subject: str = ""
    key_findings: List[str] = Field(default_factory=list)
    red_flags: List[str] = Field(default_factory=list)
    recommendation: Literal[
        "no_concern", "monitor", "escalate", "investigate_further"
    ] = "monitor"
    summary: str = ""


class SubInvestigationSummary(BaseModel):
    total_leads_investigated: int = 0
    high_risk_leads: List[dict] = Field(default_factory=list)
    confirmed_connections: List[str] = Field(default_factory=list)
    updated_risk_factors: List[str] = Field(default_factory=list)
    narrative_threads: List[str] = Field(default_factory=list)
    summary: str = ""


# ---------------------------------------------------------------------------
# SAR Narrative
# ---------------------------------------------------------------------------

class SARNarrative(BaseModel):
    introduction: str = Field(
        default="", description="Reason for filing and summary"
    )
    body: str = Field(
        default="", description="Chronological detail of suspicious activity"
    )
    conclusion: str = Field(
        default="", description="Actions taken, documents available"
    )
    cited_evidence: List[str] = Field(
        default_factory=list,
        description="Source references for every factual claim",
    )


# ---------------------------------------------------------------------------
# Validation
# ---------------------------------------------------------------------------

class ValidationResult(BaseModel):
    is_valid: bool = False
    score: float = Field(ge=0, le=1, default=0)
    issues: List[str] = Field(default_factory=list)
    missing_data: List[str] = Field(default_factory=list)
    factual_errors: List[str] = Field(default_factory=list)
    route_to: Literal[
        "data_gathering", "narrative", "human_review", "finalize"
    ] = "human_review"
