"""
Real-time Observability Event Streamer
Manages real-time streaming of agent observability data via WebSocket connections
"""

# IMPORTANT: Import and configure logging FIRST
from logging_setup import setup_logging, get_logger
setup_logging()  # Configure logging

import asyncio
import json
import logging
from typing import Dict, Any, List, Optional, Set
from datetime import datetime, timezone
from dataclasses import dataclass, asdict
from enum import Enum

logger = get_logger(__name__)

class EventType(Enum):
    """Types of observability events that can be streamed"""
    AGENT_RUN_STARTED = "agent_run_started"
    AGENT_RUN_COMPLETED = "agent_run_completed"
    AGENT_RUN_FAILED = "agent_run_failed"
    
    TOOL_CALL_INITIATED = "tool_call_initiated"
    TOOL_CALL_COMPLETED = "tool_call_completed"
    TOOL_CALL_FAILED = "tool_call_failed"
    
    DECISION_MADE = "decision_made"
    PERFORMANCE_METRICS = "performance_metrics"
    
    CONVERSATION_STARTED = "conversation_started"
    CONVERSATION_ENDED = "conversation_ended"
    
    # Connected Agent Events (Phase 3A)
    CONNECTED_AGENT_STARTED = "connected_agent_started"
    CONNECTED_AGENT_COMPLETED = "connected_agent_completed"
    CONNECTED_AGENT_FAILED = "connected_agent_failed"
    CONNECTED_AGENT_PROGRESS = "connected_agent_progress"
    
    STATUS_UPDATE = "status_update"
    ERROR_OCCURRED = "error_occurred"

@dataclass
class ObservabilityEvent:
    """Structure for observability events streamed to frontend"""
    event_type: EventType
    timestamp: str
    thread_id: str
    run_id: Optional[str] = None
    agent_id: Optional[str] = None
    data: Dict[str, Any] = None
    id: Optional[str] = None
    
    def __post_init__(self):
        if self.data is None:
            self.data = {}
        if not self.timestamp:
            self.timestamp = datetime.now(timezone.utc).isoformat()
        if not self.id:
            import uuid
            self.id = str(uuid.uuid4())[:8]  # Short UUID for events

    def to_dict(self) -> Dict[str, Any]:
        """Convert event to dictionary for JSON serialization"""
        return {
            "id": self.id,
            "event_type": self.event_type.value,
            "timestamp": self.timestamp,
            "thread_id": self.thread_id,
            "run_id": self.run_id,
            "agent_id": self.agent_id,
            "data": self.data
        }

class ObservabilityStreamer:
    """
    Real-time observability event streamer for agent monitoring
    Manages WebSocket connections and broadcasts events to connected clients
    """
    
    def __init__(self):
        """Initialize the observability streamer"""
        self.active_connections: Dict[str, Set[object]] = {}  # thread_id -> websocket connections
        self.event_history: Dict[str, List[ObservabilityEvent]] = {}  # thread_id -> events
        self.max_history_per_thread = 100
        
    async def add_connection(self, thread_id: str, websocket):
        """Add a WebSocket connection for a specific thread"""
        if thread_id not in self.active_connections:
            self.active_connections[thread_id] = set()
        
        self.active_connections[thread_id].add(websocket)
        
        # Send historical events to the new connection
        if thread_id in self.event_history:
            for event in self.event_history[thread_id]:
                try:
                    await websocket.send_text(json.dumps(event.to_dict()))
                except Exception as e:
                    logger.warning(f"Failed to send historical event: {e}")
        
        logger.info(f"✅ Added WebSocket connection for thread: {thread_id}")
    
    async def remove_connection(self, thread_id: str, websocket):
        """Remove a WebSocket connection"""
        if thread_id in self.active_connections:
            self.active_connections[thread_id].discard(websocket)
            
            # Clean up empty connection sets
            if not self.active_connections[thread_id]:
                del self.active_connections[thread_id]
        
        logger.info(f"🔌 Removed WebSocket connection for thread: {thread_id}")
    
    async def emit_event(self, event: ObservabilityEvent):
        """Emit an observability event - store in history for HTTP polling"""
        thread_id = event.thread_id
        
        # Store event in history (this is what HTTP polling reads)
        if thread_id not in self.event_history:
            self.event_history[thread_id] = []
        
        self.event_history[thread_id].append(event)
        
        # Limit history size
        if len(self.event_history[thread_id]) > self.max_history_per_thread:
            self.event_history[thread_id] = self.event_history[thread_id][-self.max_history_per_thread:]
        
        # Skip WebSocket broadcasting to prevent hanging issues
        # HTTP polling will read from event_history instead
        logger.debug(f"📡 Stored {event.event_type.value} event for thread: {thread_id} (HTTP polling)")
        
        # Broadcast to connected clients (DISABLED to prevent hanging)
        # if thread_id in self.active_connections:
        #     disconnected_connections = set()
        #     event_json = json.dumps(event.to_dict())
        #     
        #     for websocket in self.active_connections[thread_id]:
        #         try:
        #             # Add timeout to prevent hanging
        #             await asyncio.wait_for(websocket.send_text(event_json), timeout=1.0)
        #         except asyncio.TimeoutError:
        #             logger.warning(f"WebSocket send timed out for thread {thread_id}")
        #             disconnected_connections.add(websocket)
        #         except Exception as e:
        #             logger.warning(f"Failed to send event to WebSocket: {e}")
        #             disconnected_connections.add(websocket)
        #     
        #     # Clean up disconnected connections
        #     for websocket in disconnected_connections:
        #         self.active_connections[thread_id].discard(websocket)
    
    async def emit_agent_run_started(
        self, 
        thread_id: str, 
        run_id: str, 
        agent_id: str,
        message: str,
        context: Dict[str, Any] = None
    ):
        """Emit agent run started event"""
        event = ObservabilityEvent(
            event_type=EventType.AGENT_RUN_STARTED,
            timestamp=datetime.now(timezone.utc).isoformat(),
            thread_id=thread_id,
            run_id=run_id,
            agent_id=agent_id,
            data={
                "message": message,
                "context": context or {},
                "status": "started"
            }
        )
        await self.emit_event(event)
    
    async def emit_agent_run_completed(
        self,
        thread_id: str,
        run_id: str,
        agent_id: str,
        response: str,
        metrics: Dict[str, Any] = None
    ):
        """Emit agent run completed event"""
        event = ObservabilityEvent(
            event_type=EventType.AGENT_RUN_COMPLETED,
            timestamp=datetime.now(timezone.utc).isoformat(),
            thread_id=thread_id,
            run_id=run_id,
            agent_id=agent_id,
            data={
                "response": response,
                "status": "completed",
                "metrics": metrics or {}
            }
        )
        await self.emit_event(event)
    
    async def emit_tool_call_initiated(
        self,
        thread_id: str,
        run_id: str,
        tool_call_id: str,
        tool_name: str,
        arguments: Dict[str, Any]
    ):
        """Emit tool call initiated event"""
        event = ObservabilityEvent(
            event_type=EventType.TOOL_CALL_INITIATED,
            timestamp=datetime.now(timezone.utc).isoformat(),
            thread_id=thread_id,
            run_id=run_id,
            data={
                "tool_call_id": tool_call_id,
                "tool_name": tool_name,
                "arguments": arguments,
                "status": "initiated"
            }
        )
        await self.emit_event(event)
    
    async def emit_tool_call_completed(
        self,
        thread_id: str,
        run_id: str,
        tool_call_id: str,
        tool_name: str,
        result: Any,
        execution_time_ms: float = None
    ):
        """Emit tool call completed event"""
        event = ObservabilityEvent(
            event_type=EventType.TOOL_CALL_COMPLETED,
            timestamp=datetime.now(timezone.utc).isoformat(),
            thread_id=thread_id,
            run_id=run_id,
            data={
                "tool_call_id": tool_call_id,
                "tool_name": tool_name,
                "result": result,
                "execution_time_ms": execution_time_ms,
                "status": "completed"
            }
        )
        await self.emit_event(event)
    
    async def emit_decision_made(
        self,
        thread_id: str,
        run_id: str,
        agent_id: str,
        decision_type: str,
        decision_summary: str,
        confidence_score: float,
        reasoning: List[str] = None
    ):
        """Emit agent decision made event"""
        event = ObservabilityEvent(
            event_type=EventType.DECISION_MADE,
            timestamp=datetime.now(timezone.utc).isoformat(),
            thread_id=thread_id,
            run_id=run_id,
            agent_id=agent_id,
            data={
                "decision_type": decision_type,
                "decision_summary": decision_summary,
                "confidence_score": confidence_score,
                "reasoning": reasoning or []
            }
        )
        await self.emit_event(event)
    
    async def emit_status_update(
        self,
        thread_id: str,
        run_id: str,
        status: str,
        message: str = None,
        progress: Dict[str, Any] = None
    ):
        """Emit general status update event"""
        event = ObservabilityEvent(
            event_type=EventType.STATUS_UPDATE,
            timestamp=datetime.now(timezone.utc).isoformat(),
            thread_id=thread_id,
            run_id=run_id,
            data={
                "status": status,
                "message": message,
                "progress": progress or {}
            }
        )
        await self.emit_event(event)
    
    async def emit_performance_metrics(
        self,
        thread_id: str,
        run_id: str,
        agent_id: str,
        metrics: Dict[str, Any]
    ):
        """Emit performance metrics event"""
        event = ObservabilityEvent(
            event_type=EventType.PERFORMANCE_METRICS,
            timestamp=datetime.now(timezone.utc).isoformat(),
            thread_id=thread_id,
            run_id=run_id,
            agent_id=agent_id,
            data=metrics
        )
        await self.emit_event(event)
    
    async def emit_error(
        self,
        thread_id: str,
        run_id: str,
        error_type: str,
        error_message: str,
        stack_trace: str = None
    ):
        """Emit error event"""
        event = ObservabilityEvent(
            event_type=EventType.ERROR_OCCURRED,
            timestamp=datetime.now(timezone.utc).isoformat(),
            thread_id=thread_id,
            run_id=run_id,
            data={
                "error_type": error_type,
                "error_message": error_message,
                "stack_trace": stack_trace
            }
        )
        await self.emit_event(event)
    
    # Connected Agent Event Methods (Phase 3A)
    async def emit_connected_agent_started(
        self,
        thread_id: str,
        run_id: str,
        connected_agent_name: str,
        connected_thread_id: str,
        analysis_type: str = "SAR Analysis"
    ):
        """Emit connected agent started event"""
        event = ObservabilityEvent(
            event_type=EventType.CONNECTED_AGENT_STARTED,
            timestamp=datetime.now(timezone.utc).isoformat(),
            thread_id=thread_id,
            run_id=run_id,
            data={
                "connected_agent_name": connected_agent_name,
                "connected_thread_id": connected_thread_id,
                "analysis_type": analysis_type,
                "status": "started"
            }
        )
        await self.emit_event(event)
    
    async def emit_connected_agent_completed(
        self,
        thread_id: str,
        run_id: str,
        connected_agent_name: str,
        connected_thread_id: str,
        analysis_results: Dict[str, Any],
        execution_time_ms: float = None
    ):
        """Emit connected agent completed event"""
        event = ObservabilityEvent(
            event_type=EventType.CONNECTED_AGENT_COMPLETED,
            timestamp=datetime.now(timezone.utc).isoformat(),
            thread_id=thread_id,
            run_id=run_id,
            data={
                "connected_agent_name": connected_agent_name,
                "connected_thread_id": connected_thread_id,
                "analysis_results": analysis_results,
                "execution_time_ms": execution_time_ms,
                "status": "completed"
            }
        )
        await self.emit_event(event)
    
    async def emit_connected_agent_progress(
        self,
        thread_id: str,
        run_id: str,
        connected_agent_name: str,
        connected_thread_id: str,
        progress_message: str,
        progress_percentage: Optional[float] = None
    ):
        """Emit connected agent progress event"""
        event = ObservabilityEvent(
            event_type=EventType.CONNECTED_AGENT_PROGRESS,
            timestamp=datetime.now(timezone.utc).isoformat(),
            thread_id=thread_id,
            run_id=run_id,
            data={
                "connected_agent_name": connected_agent_name,
                "connected_thread_id": connected_thread_id,
                "progress_message": progress_message,
                "progress_percentage": progress_percentage,
                "status": "in_progress"
            }
        )
        await self.emit_event(event)
    
    def get_thread_history(self, thread_id: str) -> List[Dict[str, Any]]:
        """Get event history for a specific thread"""
        if thread_id in self.event_history:
            return [event.to_dict() for event in self.event_history[thread_id]]
        return []
    
    def cleanup_thread_history(self, thread_id: str):
        """Clean up history for a completed thread"""
        if thread_id in self.event_history:
            del self.event_history[thread_id]
        
        if thread_id in self.active_connections:
            del self.active_connections[thread_id]
        
        logger.info(f"🧹 Cleaned up history for thread: {thread_id}")

# Global instance for use across the application
observability_streamer = ObservabilityStreamer()