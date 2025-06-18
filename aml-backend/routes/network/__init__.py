"""
Network routes - Network analysis and graph visualization

Focused routes for network analysis functionality:
- Network analysis endpoints using NetworkAnalysisService
- Graph visualization and traversal operations
"""

# Import routers with error handling for development
try:
    from .network_analysis import router as network_analysis_router
except ImportError as e:
    print(f"Warning: Could not import network_analysis router: {e}")
    network_analysis_router = None

__all__ = [
    "network_analysis_router",
]