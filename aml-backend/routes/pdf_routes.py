"""
PDF Generation Routes - API endpoints for generating PDF reports
"""

import logging
from fastapi import APIRouter, HTTPException, Response
from pydantic import BaseModel
from typing import Dict, Any, Optional
from services.pdf_generation_service import get_pdf_generator

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/pdf", tags=["PDF Generation"])


class PDFReportRequest(BaseModel):
    """Request model for PDF report generation"""
    caseId: str
    caseStatus: str
    createdAt: str
    investigationSummary: Optional[str] = None
    workflowData: Dict[str, Any]
    workflowSummary: Optional[Dict[str, Any]] = None


@router.post("/generate-case-report")
async def generate_case_report(request: PDFReportRequest):
    """
    Generate a PDF report for a case investigation
    
    Args:
        request: Case data including workflow and investigation details
        
    Returns:
        PDF file as binary response
    """
    try:
        logger.info(f"Generating PDF report for case: {request.caseId}")
        
        # Convert request to dict for PDF generator
        case_data = request.dict()
        
        # Get PDF generator service
        pdf_generator = get_pdf_generator()
        
        # Generate PDF
        pdf_bytes = pdf_generator.generate_case_report(case_data)
        
        # Return PDF as response
        filename = f"case_report_{request.caseId}.pdf"
        
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename={filename}",
                "Content-Type": "application/pdf",
                "Content-Length": str(len(pdf_bytes))
            }
        )
        
    except Exception as e:
        logger.error(f"Failed to generate PDF report: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate PDF report: {str(e)}"
        )