"""
Transaction Analysis Routes - Clean Stage 1/2 Architecture
"""

from typing import Dict, Any, Optional
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field

from services.transaction_analysis_service import get_transaction_analysis_service, TransactionAnalysisService
from logging_setup import get_logger

logger = get_logger(__name__)

router = APIRouter(prefix="/api/transaction", tags=["Transaction Analysis"])

# Request model (same as agent routes for compatibility)
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

class TransactionAnalysisResponse(BaseModel):
    transaction_id: str
    decision: str = Field(..., description="APPROVE, BLOCK, INVESTIGATE, or ANALYZING")
    risk_level: str = Field(..., description="LOW, MEDIUM, HIGH, or CRITICAL") 
    risk_score: float = Field(..., ge=0, le=100, description="Risk score 0-100")
    confidence: float = Field(..., ge=0, le=1, description="Confidence 0-1")
    stage_completed: int = Field(..., description="1 or 2 indicating which stage completed")
    reasoning: str = Field(..., description="Human-readable reasoning")
    processing_time_ms: float = Field(..., description="Processing time in milliseconds")
    thread_id: Optional[str] = Field(None, description="Thread ID for Stage 2 polling (optional)")
    stage1_result: Dict[str, Any] = Field(..., description="Stage 1 analysis details")

@router.post("/analyze", response_model=TransactionAnalysisResponse, summary="Analyze Transaction (Clean Architecture)")
async def analyze_transaction_clean(
    request: TransactionAnalysisRequest,
    service: TransactionAnalysisService = Depends(get_transaction_analysis_service)
):
    """
    Analyze transaction with clean Stage 1/2 separation
    
    - **Stage 1**: Rules + ML (traditional fraud detection) - always runs first
    - **Stage 2**: AI Analysis (only for edge cases with scores 25-85)
    
    **Flow:**
    1. Stage 1 results returned immediately
    2. If Stage 2 needed, thread_id provided for polling final results
    """
    try:
        transaction_data = request.dict()
        
        logger.info(f"🔍 Clean analysis for transaction {transaction_data['transaction_id']}")
        
        # Run analysis with clean separation
        result = await service.analyze_transaction(transaction_data)
        
        stage_info = "Stage 1 final" if not result.get('thread_id') else "Stage 1 → Stage 2 triggered"
        logger.info(f"✅ Clean analysis complete: {result['decision']} ({stage_info})")
        
        return TransactionAnalysisResponse(**result)
        
    except Exception as e:
        logger.error(f"Clean transaction analysis failed: {e}")
        raise HTTPException(status_code=500, detail=f"Analysis error: {str(e)}")

@router.get("/status", summary="Get Transaction Analysis Service Status")
async def get_service_status(
    service: TransactionAnalysisService = Depends(get_transaction_analysis_service)
):
    """Get status of transaction analysis service components"""
    try:
        fraud_status = "initialized" if service.fraud_service else "not_initialized"
        agent_status = await service.agent_service.get_agent_status() if service.agent_service else {"initialized": False}
        
        return {
            "service": "transaction_analysis",
            "stage1_fraud_detection": fraud_status,
            "stage2_agent_service": agent_status,
            "thresholds": {
                "auto_approve": f"< {service.STAGE1_AUTO_APPROVE_THRESHOLD}",
                "auto_block": f"> {service.STAGE1_AUTO_BLOCK_THRESHOLD}",
                "ai_analysis": f"{service.STAGE1_AUTO_APPROVE_THRESHOLD}-{service.STAGE1_AUTO_BLOCK_THRESHOLD}"
            }
        }
        
    except Exception as e:
        logger.error(f"Failed to get service status: {e}")
        raise HTTPException(status_code=500, detail=f"Status error: {str(e)}")

@router.post("/test", summary="Test Transaction Analysis with Sample Data")
async def test_transaction_analysis(
    service: TransactionAnalysisService = Depends(get_transaction_analysis_service)
):
    """Test the clean transaction analysis with sample data"""
    
    # Low risk sample (should auto-approve)
    low_risk_sample = {
        "transaction_id": "test_low_risk_001",
        "customer_id": "67d2a82a654c7f1b869c4adb",
        "timestamp": "2024-01-01T12:00:00Z",
        "amount": 45.99,  # Normal amount
        "currency": "USD",
        "merchant": {
            "category": "grocery",
            "name": "Whole Foods"
        },
        "location": {
            "country": "US",
            "city": "Seattle"
        },
        "device_info": {"type": "mobile"},
        "transaction_type": "purchase",
        "payment_method": "credit_card",
        "status": "completed"
    }
    
    # High risk sample (should auto-block)  
    high_risk_sample = {
        "transaction_id": "test_high_risk_001", 
        "customer_id": "67d2a82a654c7f1b869c4adb",
        "timestamp": "2024-01-01T02:30:00Z",
        "amount": 15000.00,  # High amount
        "currency": "USD", 
        "merchant": {
            "category": "cryptocurrency",
            "name": "Crypto Exchange"
        },
        "location": {
            "country": "unknown_country",
            "city": "Unknown"
        },
        "device_info": {"type": "desktop"},
        "transaction_type": "purchase",
        "payment_method": "credit_card", 
        "status": "completed"
    }
    
    # Edge case sample (should trigger Stage 2)
    edge_case_sample = {
        "transaction_id": "test_edge_case_001",
        "customer_id": "67d2a82a654c7f1b869c4adb", 
        "timestamp": "2024-01-01T14:00:00Z",
        "amount": 750.00,  # Medium amount
        "currency": "USD",
        "merchant": {
            "category": "electronics",
            "name": "Best Buy" 
        },
        "location": {
            "country": "US",
            "city": "New York"
        },
        "device_info": {"type": "mobile"},
        "transaction_type": "purchase", 
        "payment_method": "credit_card",
        "status": "completed"
    }
    
    try:
        results = {}
        
        # Test low risk (should be Stage 1 APPROVE)
        results["low_risk"] = await service.analyze_transaction(low_risk_sample)
        
        # Test high risk (should be Stage 1 BLOCK)
        results["high_risk"] = await service.analyze_transaction(high_risk_sample)
        
        # Test edge case (should trigger Stage 2)
        results["edge_case"] = await service.analyze_transaction(edge_case_sample)
        
        return {
            "test_status": "success",
            "samples_tested": 3,
            "results": results,
            "summary": {
                "low_risk_decision": results["low_risk"]["decision"],
                "high_risk_decision": results["high_risk"]["decision"], 
                "edge_case_needs_stage2": bool(results["edge_case"]["thread_id"])
            }
        }
        
    except Exception as e:
        logger.error(f"Transaction analysis test failed: {e}")
        raise HTTPException(status_code=500, detail=f"Test error: {str(e)}")