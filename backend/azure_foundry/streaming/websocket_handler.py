"""
WebSocket Handler for Real-time Agent Observability
Manages WebSocket connections and routes for streaming agent data to frontend
"""

import json
import logging
from typing import Dict, Any
from fastapi import WebSocket, WebSocketDisconnect
from .observability_streamer import observability_streamer, ObservabilityEvent, EventType

logger = logging.getLogger(__name__)

class WebSocketObservabilityHandler:
    """
    Handles WebSocket connections for real-time agent observability streaming
    """
    
    def __init__(self):
        """Initialize the WebSocket handler"""
        self.active_connections: Dict[str, WebSocket] = {}
    
    async def connect(self, websocket: WebSocket, thread_id: str):
        """Accept a WebSocket connection and add it to the streamer"""
        await websocket.accept()
        
        # Store connection reference
        connection_id = f"{thread_id}_{id(websocket)}"
        self.active_connections[connection_id] = websocket
        
        # Add to observability streamer
        await observability_streamer.add_connection(thread_id, websocket)
        
        logger.info(f"✅ WebSocket connected for thread: {thread_id}")
        
        # Send initial connection confirmation
        await websocket.send_text(json.dumps({
            "event_type": "connection_established",
            "thread_id": thread_id,
            "timestamp": "now",
            "data": {"status": "connected", "message": "Real-time observability active"}
        }))
    
    async def disconnect(self, websocket: WebSocket, thread_id: str):
        """Handle WebSocket disconnection"""
        connection_id = f"{thread_id}_{id(websocket)}"
        
        # Remove from active connections
        if connection_id in self.active_connections:
            del self.active_connections[connection_id]
        
        # Remove from observability streamer
        await observability_streamer.remove_connection(thread_id, websocket)
        
        logger.info(f"🔌 WebSocket disconnected for thread: {thread_id}")
    
    async def handle_client_message(self, websocket: WebSocket, thread_id: str, data: Dict[str, Any]):
        """Handle messages from the client (optional - for client commands)"""
        try:
            command = data.get("command")
            
            if command == "get_history":
                # Send thread history to client
                history = observability_streamer.get_thread_history(thread_id)
                await websocket.send_text(json.dumps({
                    "event_type": "history_data",
                    "thread_id": thread_id,
                    "data": {"history": history}
                }))
            
            elif command == "ping":
                # Respond to ping
                await websocket.send_text(json.dumps({
                    "event_type": "pong",
                    "thread_id": thread_id,
                    "data": {"message": "Connection alive"}
                }))
            
            elif command == "clear_history":
                # Clear thread history (admin command)
                observability_streamer.cleanup_thread_history(thread_id)
                await websocket.send_text(json.dumps({
                    "event_type": "history_cleared",
                    "thread_id": thread_id,
                    "data": {"message": "History cleared"}
                }))
            
        except Exception as e:
            logger.error(f"Error handling client message: {e}")
            await websocket.send_text(json.dumps({
                "event_type": "error",
                "thread_id": thread_id,
                "data": {"error": str(e)}
            }))
    
    async def websocket_endpoint(self, websocket: WebSocket, thread_id: str):
        """Main WebSocket endpoint handler"""
        try:
            await self.connect(websocket, thread_id)
            
            while True:
                try:
                    # Listen for client messages
                    message = await websocket.receive_text()
                    data = json.loads(message)
                    await self.handle_client_message(websocket, thread_id, data)
                    
                except WebSocketDisconnect:
                    break
                except json.JSONDecodeError:
                    logger.warning("Invalid JSON received from WebSocket client")
                except Exception as e:
                    logger.error(f"Error in WebSocket message handling: {e}")
                    await websocket.send_text(json.dumps({
                        "event_type": "error",
                        "thread_id": thread_id,
                        "data": {"error": "Message processing error"}
                    }))
        
        except WebSocketDisconnect:
            logger.info(f"WebSocket client disconnected: {thread_id}")
        except Exception as e:
            logger.error(f"WebSocket endpoint error: {e}")
        finally:
            await self.disconnect(websocket, thread_id)

# Global handler instance
websocket_handler = WebSocketObservabilityHandler()