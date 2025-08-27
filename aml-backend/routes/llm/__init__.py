"""
LLM Routes - API endpoints for AI-powered analysis services

Routes for entity classification, investigation generation, and intelligent
analysis using AWS Bedrock integration.
"""

from .classification_routes import router as classification_router
from .investigation_routes import router as investigation_router

__all__ = [
    "classification_router",
    "investigation_router"
]