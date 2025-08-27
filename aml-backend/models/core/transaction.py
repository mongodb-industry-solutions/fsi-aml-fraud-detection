"""
Transaction Models - Core models for transaction activity and network analysis

Models for individual transactions and transaction networks based on the
transactionsv2 MongoDB collection schema.
"""

from datetime import datetime
from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field


class TransactionActivity(BaseModel):
    """Individual transaction record for activity display"""
    
    transaction_id: str
    counterparty_id: str
    counterparty_name: str
    counterparty_type: str
    direction: str  # "sent" or "received"
    
    # Transaction details
    amount: float
    currency: str
    transaction_type: str
    payment_method: str
    timestamp: datetime
    status: str
    channel: str
    description: str
    
    # Risk indicators
    risk_score: float
    flagged: bool
    tags: List[str] = Field(default_factory=list)


class TransactionNetworkNode(BaseModel):
    """Node in transaction network representing an entity"""
    
    entity_id: str
    entity_name: str
    entity_type: str
    
    # Transaction metrics
    total_sent: float = 0.0
    total_received: float = 0.0
    transaction_count: int = 0
    avg_risk_score: float = 0.0


class TransactionNetworkEdge(BaseModel):
    """Edge in transaction network representing transaction flow"""
    
    from_entity_id: str
    to_entity_id: str
    
    # Flow metrics
    transaction_count: int
    total_amount: float
    avg_amount: float
    currency: str
    avg_risk_score: float
    
    # Latest transaction info
    latest_transaction: datetime
    primary_transaction_type: str


class TransactionNetwork(BaseModel):
    """Complete transaction network for visualization"""
    
    center_entity_id: str
    nodes: List[TransactionNetworkNode]
    edges: List[TransactionNetworkEdge]
    
    # Network summary (all transactions in network)
    total_transactions: int
    total_volume: float
    
    # Center entity specific metrics (for comparison with table)
    center_entity_transaction_count: int = Field(default=0, description="Transactions directly involving center entity")
    center_entity_volume: float = Field(default=0.0, description="Volume of transactions directly involving center entity")
    
    max_depth: int
    
    # Generation metadata
    generated_at: datetime = Field(default_factory=datetime.utcnow)


class TransactionActivityResponse(BaseModel):
    """Response for transaction activity endpoint"""
    
    entity_id: str
    transactions: List[TransactionActivity]
    total_count: int
    page_size: int
    current_page: int