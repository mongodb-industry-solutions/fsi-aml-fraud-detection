"""
FastAPI routes for Agent Memory and Meta-Learning
"""

import logging
from typing import Dict, Any, Optional, List
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from datetime import datetime, timedelta

from services.agent_service import agent_service, get_agent_service, AgentService
from db.mongo_db import MongoDBAccess
import os

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/agent/memory", tags=["Agent Memory"])

# Request/Response models
class MemoryStatsResponse(BaseModel):
    threads_count: int
    conversations_count: int
    decisions_count: int
    event_logs_count: int
    learning_patterns_count: int
    last_updated: Optional[str]

class ThreadDetailsResponse(BaseModel):
    thread_id: str
    transaction_id: str
    customer_id: Optional[str]
    created_at: str
    last_accessed: str
    messages_count: int
    metadata: Dict[str, Any]

class DecisionAnalysisRequest(BaseModel):
    transaction_id: str
    actual_outcome: str = Field(..., description="confirmed_fraud, false_positive, or legitimate")
    feedback: Optional[Dict[str, Any]] = Field(default=None, description="Additional feedback")

@router.get("/stats", response_model=MemoryStatsResponse, summary="Get Memory Statistics")
async def get_memory_stats():
    """Get statistics about stored agent memory"""
    try:
        # Connect to MongoDB
        mongodb_uri = os.getenv("MONGODB_URI")
        db_client = MongoDBAccess(mongodb_uri)
        db_name = os.getenv("DB_NAME", "threatsight360")
        db = db_client.get_database(db_name)
        
        # Count documents in each collection
        stats = {
            "threads_count": db["agent_threads"].count_documents({}),
            "conversations_count": db["agent_conversations"].count_documents({}),
            "decisions_count": db["agent_decisions"].count_documents({}),
            "event_logs_count": db["agent_event_logs"].count_documents({}),
            "learning_patterns_count": db["agent_learning_patterns"].count_documents({}),
            "last_updated": datetime.utcnow().isoformat()
        }
        
        return MemoryStatsResponse(**stats)
        
    except Exception as e:
        logger.error(f"Failed to get memory stats: {e}")
        raise HTTPException(status_code=500, detail=f"Stats error: {str(e)}")

@router.get("/threads", summary="List All Threads")
async def list_threads(limit: int = 20):
    """List all stored threads with details"""
    try:
        mongodb_uri = os.getenv("MONGODB_URI")
        db_client = MongoDBAccess(mongodb_uri)
        db_name = os.getenv("DB_NAME", "threatsight360")
        db = db_client.get_database(db_name)
        
        # Get threads sorted by last accessed
        threads = list(db["agent_threads"].find().sort("last_accessed", -1).limit(limit))
        
        result = []
        for thread in threads:
            # Count messages for this thread
            msg_count = db["agent_conversations"].count_documents({"thread_id": thread.get("thread_id")})
            
            result.append({
                "thread_id": thread.get("thread_id"),
                "transaction_id": thread.get("transaction_id"),
                "customer_id": thread.get("customer_id"),
                "created_at": thread.get("created_at", "").isoformat() if thread.get("created_at") else None,
                "last_accessed": thread.get("last_accessed", "").isoformat() if thread.get("last_accessed") else None,
                "messages_count": msg_count,
                "metadata": thread.get("metadata", {})
            })
        
        return {"threads": result, "total": len(result)}
        
    except Exception as e:
        logger.error(f"Failed to list threads: {e}")
        raise HTTPException(status_code=500, detail=f"List error: {str(e)}")

@router.get("/thread/{thread_id}/conversations", summary="Get Thread Conversations")
async def get_thread_conversations(thread_id: str, limit: int = 50):
    """Get all conversations for a specific thread"""
    try:
        mongodb_uri = os.getenv("MONGODB_URI")
        db_client = MongoDBAccess(mongodb_uri)
        db_name = os.getenv("DB_NAME", "threatsight360")
        db = db_client.get_database(db_name)
        
        # Get conversations for this thread
        messages = list(db["agent_conversations"].find(
            {"thread_id": thread_id}
        ).sort("timestamp", 1).limit(limit))
        
        # Format messages
        formatted_messages = []
        for msg in messages:
            formatted_messages.append({
                "role": msg.get("role"),
                "content": msg.get("content", "")[:500],  # Truncate for display
                "timestamp": msg.get("timestamp", "").isoformat() if msg.get("timestamp") else None,
                "metadata": msg.get("metadata", {})
            })
        
        return {
            "thread_id": thread_id,
            "messages": formatted_messages,
            "total": len(formatted_messages)
        }
        
    except Exception as e:
        logger.error(f"Failed to get thread conversations: {e}")
        raise HTTPException(status_code=500, detail=f"Conversation error: {str(e)}")

@router.get("/transaction/{transaction_id}/events", summary="Get Transaction Event Logs")
async def get_transaction_events(transaction_id: str):
    """Get all event logs for a specific transaction"""
    try:
        mongodb_uri = os.getenv("MONGODB_URI")
        db_client = MongoDBAccess(mongodb_uri)
        db_name = os.getenv("DB_NAME", "threatsight360")
        db = db_client.get_database(db_name)
        
        # Get events for this transaction
        events = list(db["agent_event_logs"].find(
            {"transaction_id": transaction_id}
        ).sort("timestamp", 1))
        
        # Format events
        formatted_events = []
        for event in events:
            formatted_events.append({
                "event_type": event.get("event_type"),
                "event_data": event.get("event_data", {}),
                "timestamp": event.get("timestamp", "").isoformat() if event.get("timestamp") else None,
                "thread_id": event.get("thread_id")
            })
        
        return {
            "transaction_id": transaction_id,
            "events": formatted_events,
            "total": len(formatted_events)
        }
        
    except Exception as e:
        logger.error(f"Failed to get transaction events: {e}")
        raise HTTPException(status_code=500, detail=f"Events error: {str(e)}")

@router.get("/decisions/recent", summary="Get Recent Decisions")
async def get_recent_decisions(limit: int = 10):
    """Get recent agent decisions with full context"""
    try:
        mongodb_uri = os.getenv("MONGODB_URI")
        db_client = MongoDBAccess(mongodb_uri)
        db_name = os.getenv("DB_NAME", "threatsight360")
        db = db_client.get_database(db_name)
        
        # Get recent decisions
        decisions = list(db["agent_decisions"].find().sort("created_at", -1).limit(limit))
        
        # Format decisions
        formatted_decisions = []
        for decision in decisions:
            formatted_decisions.append({
                "transaction_id": decision.get("transaction_id"),
                "thread_id": decision.get("thread_id"),
                "decision": decision.get("decision"),
                "risk_score": decision.get("risk_score"),
                "risk_level": decision.get("risk_level"),
                "confidence": decision.get("confidence"),
                "stage_completed": decision.get("stage_completed"),
                "reasoning": decision.get("reasoning", "")[:200],  # Truncate
                "created_at": decision.get("created_at", "").isoformat() if decision.get("created_at") else None,
                "effectiveness_score": decision.get("effectiveness_score"),
                "actual_outcome": decision.get("actual_outcome")
            })
        
        return {
            "decisions": formatted_decisions,
            "total": len(formatted_decisions)
        }
        
    except Exception as e:
        logger.error(f"Failed to get recent decisions: {e}")
        raise HTTPException(status_code=500, detail=f"Decisions error: {str(e)}")

@router.get("/patterns", summary="Get Learning Patterns")
async def get_learning_patterns(pattern_type: Optional[str] = None, min_effectiveness: float = 0.6):
    """Get stored learning patterns"""
    try:
        mongodb_uri = os.getenv("MONGODB_URI")
        db_client = MongoDBAccess(mongodb_uri)
        db_name = os.getenv("DB_NAME", "threatsight360")
        db = db_client.get_database(db_name)
        
        # Build query
        query = {"effectiveness_score": {"$gte": min_effectiveness}}
        if pattern_type:
            query["pattern_type"] = pattern_type
        
        # Get patterns
        patterns = list(db["agent_learning_patterns"].find(query).sort([
            ("effectiveness_score", -1),
            ("usage_count", -1)
        ]).limit(20))
        
        # Format patterns
        formatted_patterns = []
        for pattern in patterns:
            formatted_patterns.append({
                "pattern_type": pattern.get("pattern_type"),
                "effectiveness_score": pattern.get("effectiveness_score"),
                "usage_count": pattern.get("usage_count", 0),
                "pattern_data": pattern.get("pattern_data", {}),
                "created_at": pattern.get("created_at", "").isoformat() if pattern.get("created_at") else None,
                "last_used": pattern.get("last_used", "").isoformat() if pattern.get("last_used") else None
            })
        
        return {
            "patterns": formatted_patterns,
            "total": len(formatted_patterns)
        }
        
    except Exception as e:
        logger.error(f"Failed to get learning patterns: {e}")
        raise HTTPException(status_code=500, detail=f"Patterns error: {str(e)}")

@router.post("/decision/analyze", summary="Analyze Decision Effectiveness")
async def analyze_decision_effectiveness(request: DecisionAnalysisRequest):
    """Update a decision with actual outcome for meta-learning"""
    try:
        # Initialize enhanced memory if agent is available
        if agent_service._initialized and agent_service.agent and agent_service.agent.enhanced_memory:
            await agent_service.agent.enhanced_memory.analyze_decision_effectiveness(
                transaction_id=request.transaction_id,
                actual_outcome=request.actual_outcome,
                feedback=request.feedback
            )
            return {
                "status": "success",
                "message": f"Decision effectiveness analyzed for {request.transaction_id}"
            }
        else:
            # Direct MongoDB update if agent not initialized
            mongodb_uri = os.getenv("MONGODB_URI")
            db_client = MongoDBAccess(mongodb_uri)
            db_name = os.getenv("DB_NAME", "threatsight360")
            db = db_client.get_database(db_name)
            
            # Calculate effectiveness
            effectiveness = 0.5
            if request.actual_outcome == "confirmed_fraud":
                effectiveness = 0.9
            elif request.actual_outcome == "false_positive":
                effectiveness = 0.3
            elif request.actual_outcome == "legitimate":
                effectiveness = 0.8
            
            # Update decision
            result = db["agent_decisions"].update_one(
                {"transaction_id": request.transaction_id},
                {
                    "$set": {
                        "actual_outcome": request.actual_outcome,
                        "effectiveness_score": effectiveness,
                        "feedback": request.feedback or {},
                        "evaluated_at": datetime.utcnow()
                    }
                }
            )
            
            if result.modified_count > 0:
                return {
                    "status": "success",
                    "message": f"Decision updated with effectiveness score {effectiveness}"
                }
            else:
                raise HTTPException(status_code=404, detail="Decision not found")
        
    except Exception as e:
        logger.error(f"Failed to analyze decision effectiveness: {e}")
        raise HTTPException(status_code=500, detail=f"Analysis error: {str(e)}")

@router.delete("/cleanup/old", summary="Cleanup Old Memory Data")
async def cleanup_old_memory(days_old: int = 30):
    """Remove memory data older than specified days"""
    try:
        mongodb_uri = os.getenv("MONGODB_URI")
        db_client = MongoDBAccess(mongodb_uri)
        db_name = os.getenv("DB_NAME", "threatsight360")
        db = db_client.get_database(db_name)
        
        cutoff_date = datetime.utcnow() - timedelta(days=days_old)
        
        # Delete old data from each collection
        results = {
            "threads": db["agent_threads"].delete_many({"created_at": {"$lt": cutoff_date}}).deleted_count,
            "conversations": db["agent_conversations"].delete_many({"timestamp": {"$lt": cutoff_date}}).deleted_count,
            "event_logs": db["agent_event_logs"].delete_many({"timestamp": {"$lt": cutoff_date}}).deleted_count,
            "decisions": db["agent_decisions"].delete_many({"created_at": {"$lt": cutoff_date}}).deleted_count,
            "patterns": db["agent_learning_patterns"].delete_many(
                {"$and": [
                    {"created_at": {"$lt": cutoff_date}},
                    {"usage_count": {"$lt": 5}}  # Keep frequently used patterns
                ]}
            ).deleted_count
        }
        
        return {
            "status": "success",
            "deleted": results,
            "cutoff_date": cutoff_date.isoformat()
        }
        
    except Exception as e:
        logger.error(f"Failed to cleanup old memory: {e}")
        raise HTTPException(status_code=500, detail=f"Cleanup error: {str(e)}")