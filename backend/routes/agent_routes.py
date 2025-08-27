"""
FastAPI routes for Azure AI Foundry Agent integration
"""

import logging
from typing import Dict, Any, Optional
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field

from services.agent_service import agent_service, get_agent_service, AgentService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/agent", tags=["AI Agent"])

# Request/Response models
class TransactionAnalysisRequest(BaseModel):
    transaction_id: str = Field(..., description="Unique transaction identifier")
    customer_id: str = Field(..., description="Customer identifier")
    timestamp: str = Field(..., description="Transaction timestamp")
    amount: float = Field(..., gt=0, description="Transaction amount")
    currency: str = Field(default="USD", description="Transaction currency")
    merchant: Dict[str, Any] = Field(..., description="Merchant information")
    location: Dict[str, Any] = Field(..., description="Transaction location")
    device_info: Dict[str, Any] = Field(..., description="Device information")
    transaction_type: str = Field(..., description="Type of transaction")
    payment_method: str = Field(..., description="Payment method used")
    status: str = Field(default="completed", description="Transaction status")
    
    class Config:
        json_schema_extra = {
            "example": {
                "transaction_id": "tx_12345",
                "customer_id": "cust_67890",
                "timestamp": "2024-01-01T12:00:00Z", 
                "amount": 1500.00,
                "currency": "USD",
                "merchant": {
                    "category": "electronics",
                    "name": "Best Buy",
                    "id": "m_12345"
                },
                "location": {
                    "country": "US",
                    "city": "New York",
                    "state": "NY",
                    "coordinates": {
                        "type": "Point",
                        "coordinates": [-74.0, 40.7]
                    }
                },
                "device_info": {
                    "device_id": "device_123",
                    "type": "mobile",
                    "os": "iOS",
                    "browser": "Safari",
                    "ip": "192.168.1.1"
                },
                "transaction_type": "purchase",
                "payment_method": "credit_card",
                "status": "completed"
            }
        }

class AgentAnalysisResponse(BaseModel):
    transaction_id: str
    decision: str = Field(..., description="APPROVE, BLOCK, INVESTIGATE, or ESCALATE")
    risk_level: str = Field(..., description="LOW, MEDIUM, HIGH, or CRITICAL") 
    risk_score: float = Field(..., ge=0, le=100, description="Risk score 0-100")
    confidence: float = Field(..., ge=0, le=1, description="Confidence 0-1")
    stage_completed: int = Field(..., description="1 or 2 indicating which stage completed analysis")
    reasoning: str = Field(..., description="Human-readable reasoning")
    processing_time_ms: float = Field(..., description="Processing time in milliseconds")
    thread_id: Optional[str] = Field(None, description="Thread ID (optional)")

class AgentStatusResponse(BaseModel):
    initialized: bool
    status: str
    metrics: Dict[str, Any] = None
    error: str = None

@router.post("/initialize", summary="Initialize AI Agent")
async def initialize_agent():
    """Initialize the Azure AI Foundry agent"""
    try:
        success = await agent_service.initialize()
        if success:
            return {"status": "success", "message": "Agent initialized successfully"}
        else:
            raise HTTPException(status_code=500, detail="Failed to initialize agent")
    except Exception as e:
        logger.error(f"Agent initialization failed: {e}")
        raise HTTPException(status_code=500, detail=f"Initialization error: {str(e)}")

@router.get("/status", response_model=AgentStatusResponse, summary="Get Agent Status")
async def get_agent_status():
    """Get current agent status and metrics"""
    try:
        status = await agent_service.get_agent_status()
        return AgentStatusResponse(**status)
    except Exception as e:
        logger.error(f"Failed to get agent status: {e}")
        raise HTTPException(status_code=500, detail=f"Status error: {str(e)}")

@router.post("/analyze", response_model=AgentAnalysisResponse, summary="Analyze Transaction")
async def analyze_transaction(
    request: TransactionAnalysisRequest,
    service: AgentService = Depends(get_agent_service)
):
    """
    Analyze a transaction for fraud using the two-stage AI agent
    
    - **Stage 1**: Rules + Basic ML (fast triage)
    - **Stage 2**: Vector search + AI analysis (deep analysis for edge cases)
    """
    try:
        # Convert request to dict
        transaction_data = request.dict()
        
        logger.info(f"🔍 Analyzing transaction {transaction_data['transaction_id']}")
        
        # Run agent analysis
        result = await service.analyze_transaction(transaction_data)
        
        logger.info(f"✅ Analysis complete: {result['decision']} (Stage {result['stage_completed']})")
        
        return AgentAnalysisResponse(**result)
        
    except RuntimeError as e:
        logger.error(f"Agent not initialized: {e}")
        raise HTTPException(status_code=503, detail="Agent service not available. Try initializing first.")
    except Exception as e:
        logger.error(f"Transaction analysis failed: {e}")
        raise HTTPException(status_code=500, detail=f"Analysis error: {str(e)}")

@router.post("/analyze/batch", summary="Batch Analyze Transactions")
async def analyze_transactions_batch(
    transactions: list[TransactionAnalysisRequest],
    service: AgentService = Depends(get_agent_service)
):
    """Analyze multiple transactions in batch"""
    try:
        results = []
        for transaction in transactions:
            transaction_data = transaction.dict()
            result = await service.analyze_transaction(transaction_data)
            results.append(result)
        
        return {
            "total_processed": len(results),
            "results": results
        }
        
    except Exception as e:
        logger.error(f"Batch analysis failed: {e}")
        raise HTTPException(status_code=500, detail=f"Batch analysis error: {str(e)}")

@router.post("/test", summary="Test Agent with Sample Transaction")
async def test_agent(service: AgentService = Depends(get_agent_service)):
    """Test the agent with a sample transaction"""
    sample_transaction = {
        "transaction_id": "test_sample_001",
        "customer_id": "67d2a82a654c7f1b869c4adb",  # Known customer in DB
        "amount": 899.99,
        "currency": "USD", 
        "merchant": {
            "category": "electronics",
            "name": "Apple Store"
        },
        "location": {
            "country": "US",
            "city": "Cupertino"
        }
    }
    
    try:
        result = await service.analyze_transaction(sample_transaction)
        return {
            "test_status": "success",
            "sample_transaction": sample_transaction,
            "agent_analysis": result
        }
    except Exception as e:
        logger.error(f"Agent test failed: {e}")
        raise HTTPException(status_code=500, detail=f"Test error: {str(e)}")

@router.delete("/cleanup", summary="Cleanup Agent Resources")
async def cleanup_agent():
    """Cleanup agent resources"""
    try:
        await agent_service.cleanup()
        return {"status": "success", "message": "Agent resources cleaned up"}
    except Exception as e:
        logger.error(f"Agent cleanup failed: {e}")
        raise HTTPException(status_code=500, detail=f"Cleanup error: {str(e)}")