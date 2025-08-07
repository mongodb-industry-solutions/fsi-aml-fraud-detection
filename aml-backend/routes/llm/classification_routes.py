"""
LLM Classification Routes - API endpoints for AI-powered entity classification

FastAPI routes for entity classification using AWS Bedrock LLM services.
"""

import logging
from typing import Dict, Any
from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.responses import JSONResponse

from models.api.llm_classification import (
    ClassificationRequest,
    ClassificationResponse, 
    WorkflowClassificationSummary,
    EntityClassificationResult
)
from services.llm.entity_classification_service import EntityClassificationService
from services.dependencies import get_entity_classification_service

logger = logging.getLogger(__name__)

# Create router for classification endpoints
router = APIRouter(
    prefix="/llm/classification",
    tags=["LLM Classification"],
    responses={
        404: {"description": "Not found"},
        500: {"description": "Internal server error"}
    }
)


# ==================== CLASSIFICATION ENDPOINTS ====================

@router.post(
    "/classify-entity",
    response_model=ClassificationResponse,
    status_code=status.HTTP_200_OK,
    summary="Classify entity using LLM analysis",
    description="Analyze complete entity resolution workflow data using AWS Bedrock LLM to provide comprehensive risk classification, AML/KYC assessment, and action recommendations."
)
async def classify_entity(
    request: ClassificationRequest,
    classification_service: EntityClassificationService = Depends(get_entity_classification_service)
) -> ClassificationResponse:
    """
    Classify entity using LLM-powered analysis of workflow data
    
    This endpoint processes complete entity resolution workflow data (steps 0-2) through
    AWS Bedrock LLM services to provide comprehensive classification including:
    
    - Risk assessment and scoring (0-100)
    - AML/KYC compliance analysis
    - Network positioning and influence analysis  
    - Data quality assessment
    - Action recommendations (approve/review/reject/investigate)
    - Confidence scoring and factors
    
    Args:
        request: Classification request with workflow data and model preferences
        classification_service: Injected classification service
        
    Returns:
        ClassificationResponse with detailed analysis results or error details
        
    Raises:
        HTTPException: For validation errors, service failures, or invalid requests
    """
    try:
        logger.info(f"Received entity classification request for model: {request.model_preference}")
        
        # Validate request data
        if not request.workflow_data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Workflow data is required for classification"
            )
        
        # Validate required workflow components
        required_components = ["entityInput", "searchResults"]
        missing_components = [comp for comp in required_components 
                            if comp not in request.workflow_data]
        
        if missing_components:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Missing required workflow components: {', '.join(missing_components)}"
            )
        
        # Perform LLM classification
        classification_result = await classification_service.classify_entity(request)
        
        # Handle service errors
        if not classification_result.success:
            error_detail = "Classification service failed"
            if classification_result.error:
                error_detail = f"{error_detail}: {classification_result.error.error_message}"
            
            # Determine appropriate HTTP status code based on error type
            if classification_result.error and classification_result.error.error_type == "validation_error":
                status_code = status.HTTP_400_BAD_REQUEST
            elif classification_result.error and classification_result.error.error_type == "llm_error":
                status_code = status.HTTP_502_BAD_GATEWAY  # Bad Gateway for external service issues
            else:
                status_code = status.HTTP_500_INTERNAL_SERVER_ERROR
            
            raise HTTPException(
                status_code=status_code,
                detail=error_detail
            )
        
        logger.info(f"Entity classification completed successfully - "
                   f"Risk: {classification_result.result.risk_score}/100, "
                   f"Action: {classification_result.result.recommended_action}")
        
        return classification_result
        
    except HTTPException:
        # Re-raise HTTP exceptions as-is
        raise
    except Exception as e:
        logger.error(f"Unexpected error in classify_entity: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error during classification: {str(e)}"
        )


@router.post(
    "/classify-workflow", 
    response_model=WorkflowClassificationSummary,
    status_code=status.HTTP_200_OK,
    summary="Classify entity workflow with summary",
    description="Convenience endpoint that performs classification and returns a workflow-integrated summary suitable for UI display and workflow continuation."
)
async def classify_workflow(
    request: ClassificationRequest,
    classification_service: EntityClassificationService = Depends(get_entity_classification_service)
) -> WorkflowClassificationSummary:
    """
    Classify entity workflow and return workflow-integrated summary
    
    This is a convenience endpoint that performs the same classification as /classify-entity
    but returns results in a format optimized for workflow integration and UI display.
    
    Args:
        request: Classification request with workflow data
        classification_service: Injected classification service
        
    Returns:
        WorkflowClassificationSummary with classification results and workflow guidance
        
    Raises:
        HTTPException: For validation errors or service failures
    """
    try:
        # Perform standard classification
        classification_result = await classification_service.classify_entity(request)
        
        if not classification_result.success:
            error_detail = "Workflow classification failed"
            if classification_result.error:
                error_detail = f"{error_detail}: {classification_result.error.error_message}"
            
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=error_detail
            )
        
        # Extract entity information
        entity_input = request.workflow_data.get("entityInput", {})
        entity_name = entity_input.get("fullName", "Unknown Entity")
        
        # Determine next step based on classification
        result = classification_result.result
        if result.recommended_action.value == "approve":
            next_step = "Entity can proceed to onboarding completion"
        elif result.recommended_action.value == "review":
            next_step = "Manual analyst review required"
        elif result.recommended_action.value == "reject":
            next_step = "Entity should be rejected - see risk factors"
        else:  # investigate
            next_step = "Proceed to deep investigation (Step 4)"
        
        # Create workflow summary
        workflow_summary = WorkflowClassificationSummary(
            entity_name=entity_name,
            entity_id=request.workflow_data.get("searchResults", {}).get("hybridResults", [{}])[0].get("entityId"),
            classification_result=result,
            next_recommended_step=next_step,
            requires_intervention=result.requires_review
        )
        
        logger.info(f"Workflow classification summary created for {entity_name} - "
                   f"Next step: {next_step}")
        
        return workflow_summary
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in classify_workflow: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Workflow classification failed: {str(e)}"
        )


# ==================== UTILITY ENDPOINTS ====================

@router.get(
    "/health",
    summary="Health check for LLM classification service",
    description="Check if the LLM classification service is healthy and can connect to AWS Bedrock"
)
async def health_check(
    classification_service: EntityClassificationService = Depends(get_entity_classification_service)
) -> Dict[str, Any]:
    """
    Health check endpoint for LLM classification service
    
    Returns:
        Service health status and AWS Bedrock connectivity
    """
    try:
        # Basic service health check
        health_status = {
            "service": "llm-classification",
            "status": "healthy",
            "timestamp": logger.info("Health check requested"),
            "bedrock_client": "initialized" if classification_service.bedrock_client else "not_initialized",
            "supported_models": classification_service.supported_models
        }
        
        return health_status
        
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return {
            "service": "llm-classification", 
            "status": "unhealthy",
            "error": str(e)
        }


@router.get(
    "/models",
    summary="List supported LLM models",
    description="Get list of supported AWS Bedrock models for entity classification"
)
async def list_supported_models(
    classification_service: EntityClassificationService = Depends(get_entity_classification_service)
) -> Dict[str, Any]:
    """
    List supported LLM models for classification
    
    Returns:
        List of supported AWS Bedrock models with their capabilities
    """
    try:
        models_info = {
            "supported_models": classification_service.supported_models,
            "default_model": "claude-3-sonnet",
            "model_capabilities": {
                "claude-3-sonnet": {
                    "description": "Most capable model for complex analysis",
                    "max_tokens": 4000,
                    "recommended_for": "comprehensive_analysis"
                },
                "claude-3-haiku": {
                    "description": "Faster model for standard analysis", 
                    "max_tokens": 4000,
                    "recommended_for": "standard_analysis"
                },
                "amazon.titan-text-express-v1": {
                    "description": "Amazon's text generation model",
                    "max_tokens": 4000,
                    "recommended_for": "basic_analysis"
                }
            },
            "analysis_depth_options": ["basic", "standard", "comprehensive"]
        }
        
        return models_info
        
    except Exception as e:
        logger.error(f"Error listing models: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list supported models: {str(e)}"
        )


# ==================== ERROR HANDLERS ====================

# Note: Exception handlers are registered on the main FastAPI app, not on routers
# Global exception handling is handled in main.py