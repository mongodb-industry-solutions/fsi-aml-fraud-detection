"""
Investigation API Routes - Simple case investigation endpoints

REST API endpoints for creating case investigations from workflow data.
"""

import logging
from typing import Dict, Any
from fastapi import APIRouter, Depends, HTTPException

from services.llm.investigation_service import InvestigationService
from services.dependencies import get_investigation_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/llm/investigation", tags=["investigation"])


@router.post("/create-case")
async def create_case_investigation(
    request: Dict[str, Any],
    investigation_service: InvestigationService = Depends(get_investigation_service)
):
    """
    Create case investigation from workflow data
    
    Args:
        request: Request containing workflow_data from entity resolution steps 0-3
        
    Returns:
        Case investigation result with MongoDB document and LLM summary
    """
    try:
        logger.info("Creating case investigation from workflow data")
        
        # Validate request
        workflow_data = request.get("workflow_data")
        if not workflow_data:
            raise HTTPException(
                status_code=400,
                detail="Missing workflow_data in request"
            )
        
        # Validate required workflow components
        required_keys = ["entityInput", "searchResults", "classification"]
        missing_keys = [key for key in required_keys if key not in workflow_data]
        
        if missing_keys:
            raise HTTPException(
                status_code=400,
                detail=f"Missing required workflow data: {', '.join(missing_keys)}"
            )
        
        # Create case investigation
        investigation_result = await investigation_service.create_case_investigation(workflow_data)
        
        logger.info(f"Case investigation created successfully: {investigation_result.get('case_id')}")
        
        return investigation_result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating case investigation: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to create case investigation: {str(e)}"
        )


@router.get("/health")
async def investigation_service_health():
    """Investigation service health check"""
    return {
        "status": "healthy",
        "service": "investigation_service",
        "version": "simple_case_investigation_v1"
    }