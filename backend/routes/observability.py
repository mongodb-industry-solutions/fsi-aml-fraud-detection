"""
FastAPI Routes for Real-time Agent Observability
WebSocket endpoints and REST API for streaming agent monitoring data
"""

# IMPORTANT: Import and configure logging FIRST
from logging_setup import setup_logging, get_logger
setup_logging()  # Configure logging

from typing import Dict, Any, List, Optional
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException, Depends, Query
from fastapi.responses import JSONResponse

from azure_foundry.streaming.websocket_handler import websocket_handler
from azure_foundry.streaming.observability_streamer import observability_streamer

logger = get_logger(__name__)

router = APIRouter(prefix="/observability", tags=["Agent Observability"])

@router.websocket("/stream/{thread_id}")
async def websocket_observability_stream(websocket: WebSocket, thread_id: str):
    """
    WebSocket endpoint for real-time agent observability streaming
    
    Connect to this endpoint to receive real-time updates about agent execution:
    - Agent run lifecycle events  
    - Tool call progress and results
    - Decision tracking with reasoning
    - Performance metrics
    - Error notifications
    
    Args:
        thread_id: Azure AI Foundry thread ID to monitor
    """
    logger.info(f"🔌 WebSocket connection request for thread: {thread_id}")
    
    try:
        await websocket_handler.websocket_endpoint(websocket, thread_id)
    except Exception as e:
        logger.error(f"WebSocket endpoint error for thread {thread_id}: {e}")

@router.get("/events/{thread_id}")
async def get_thread_events_polling(
    thread_id: str,
    last_event_id: Optional[str] = Query(None, description="Get events after this ID"),
    limit: int = Query(10, description="Maximum number of events to return")
) -> Dict[str, Any]:
    """
    Get new observability events for HTTP polling (0.5 second intervals)
    
    Args:
        thread_id: Thread ID to get events for
        last_event_id: Only return events after this event ID
        limit: Maximum number of events to return
        
    Returns:
        Dictionary containing new events since last_event_id
    """
    try:
        all_events = observability_streamer.get_thread_history(thread_id)
        
        # Filter to only events after last_event_id
        if last_event_id:
            last_event_index = -1
            for i, event in enumerate(all_events):
                if event.get('id') == last_event_id:
                    last_event_index = i
                    break
            
            # Get events after the last known event
            if last_event_index >= 0:
                new_events = all_events[last_event_index + 1:]
            else:
                new_events = all_events  # If event ID not found, return all
        else:
            new_events = all_events
        
        # Apply limit (get first N new events, not last N)
        if limit > 0:
            new_events = new_events[:limit]
        
        return {
            "thread_id": thread_id,
            "events": new_events,
            "has_more": False,
            "polling_interval_ms": 500
        }
    
    except Exception as e:
        logger.error(f"Error retrieving events for thread {thread_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to retrieve events: {str(e)}")

@router.get("/history/{thread_id}")
async def get_thread_observability_history(
    thread_id: str,
    limit: int = Query(50, description="Maximum number of events to return")
) -> Dict[str, Any]:
    """
    Get observability event history for a specific thread
    
    Args:
        thread_id: Thread ID to get history for
        limit: Maximum number of events to return
        
    Returns:
        Dictionary containing event history and metadata
    """
    try:
        history = observability_streamer.get_thread_history(thread_id)
        
        # Apply limit
        if limit > 0:
            history = history[-limit:]
        
        return {
            "thread_id": thread_id,
            "total_events": len(history),
            "events": history,
            "has_active_connections": len(observability_streamer.active_connections.get(thread_id, [])) > 0
        }
    
    except Exception as e:
        logger.error(f"Error retrieving history for thread {thread_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to retrieve history: {str(e)}")

@router.get("/active-connections")
async def get_active_connections() -> Dict[str, Any]:
    """
    Get information about active WebSocket connections
    
    Returns:
        Dictionary with active connection statistics
    """
    try:
        connections_info = {}
        total_connections = 0
        
        for thread_id, connections in observability_streamer.active_connections.items():
            connections_info[thread_id] = {
                "connection_count": len(connections),
                "event_history_count": len(observability_streamer.event_history.get(thread_id, []))
            }
            total_connections += len(connections)
        
        return {
            "total_active_connections": total_connections,
            "threads_with_connections": len(connections_info),
            "connections_by_thread": connections_info
        }
    
    except Exception as e:
        logger.error(f"Error retrieving active connections: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to retrieve connections: {str(e)}")

@router.post("/emit-test-event/{thread_id}")
async def emit_test_event(
    thread_id: str,
    event_data: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Emit a test observability event (for testing purposes)
    
    Args:
        thread_id: Thread ID to emit event for
        event_data: Event data to emit
        
    Returns:
        Confirmation of event emission
    """
    try:
        from azure_foundry.streaming.observability_streamer import ObservabilityEvent, EventType
        
        # Create test event
        event = ObservabilityEvent(
            event_type=EventType.STATUS_UPDATE,
            thread_id=thread_id,
            run_id="test_run",
            data=event_data
        )
        
        await observability_streamer.emit_event(event)
        
        return {
            "success": True,
            "message": f"Test event emitted for thread {thread_id}",
            "event": event.to_dict()
        }
    
    except Exception as e:
        logger.error(f"Error emitting test event: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to emit test event: {str(e)}")

@router.delete("/history/{thread_id}")
async def clear_thread_history(thread_id: str) -> Dict[str, Any]:
    """
    Clear observability history for a specific thread
    
    Args:
        thread_id: Thread ID to clear history for
        
    Returns:
        Confirmation of history clearing
    """
    try:
        observability_streamer.cleanup_thread_history(thread_id)
        
        return {
            "success": True,
            "message": f"History cleared for thread {thread_id}",
            "thread_id": thread_id
        }
    
    except Exception as e:
        logger.error(f"Error clearing history for thread {thread_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to clear history: {str(e)}")

@router.get("/health")
async def observability_health_check() -> Dict[str, Any]:
    """
    Health check endpoint for observability system
    
    Returns:
        System health status and statistics
    """
    try:
        total_connections = sum(
            len(connections) 
            for connections in observability_streamer.active_connections.values()
        )
        
        total_events = sum(
            len(events)
            for events in observability_streamer.event_history.values()
        )
        
        return {
            "status": "healthy",
            "observability_system": "operational",
            "active_connections": total_connections,
            "total_events_stored": total_events,
            "threads_being_monitored": len(observability_streamer.active_connections)
        }
    
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return {
            "status": "unhealthy",
            "error": str(e)
        }