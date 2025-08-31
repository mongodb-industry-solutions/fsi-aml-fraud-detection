from fastapi import APIRouter, HTTPException, Query
from typing import List, Dict, Any, Optional
from datetime import datetime
from pydantic import BaseModel
import os
from motor.motor_asyncio import AsyncIOMotorClient

router = APIRouter(prefix="/api/memory", tags=["memory"])

# Response Models
class MemoryItemResponse(BaseModel):
    id: str
    thread_id: str
    timestamp: datetime
    content_type: str
    content: Dict[str, Any]
    metadata: Dict[str, Any]

class DecisionResponse(BaseModel):
    id: str
    thread_id: str
    timestamp: datetime
    decision_type: str
    input_context: Dict[str, Any]
    output_result: Dict[str, Any]
    confidence: float
    outcome: Optional[str] = None
    metadata: Dict[str, Any]

class PatternResponse(BaseModel):
    id: str
    pattern_type: str
    description: str
    confidence: float
    evidence_count: int
    last_updated: datetime
    pattern_data: Dict[str, Any]
    metadata: Dict[str, Any]

class MemoryOverviewResponse(BaseModel):
    total_memories: int
    total_decisions: int
    total_patterns: int
    active_threads: int
    latest_activity: Optional[datetime] = None

# Initialize MongoDB connection
async def get_memory_collections():
    mongodb_uri = os.getenv("MONGODB_URI")
    motor_client = AsyncIOMotorClient(mongodb_uri)
    db_name = os.getenv("DB_NAME", "threatsight360")
    db = motor_client[db_name]
    
    return {
        "memory": db["agent_memory"],
        "decisions": db["agent_decisions"],
        "patterns": db["agent_patterns"]
    }

@router.get("/overview", response_model=MemoryOverviewResponse)
async def get_memory_overview():
    """Get overview statistics of the agent's memory system"""
    try:
        collections = await get_memory_collections()
        
        # Count documents in each collection
        memory_count = await collections["memory"].count_documents({})
        decisions_count = await collections["decisions"].count_documents({})
        patterns_count = await collections["patterns"].count_documents({})
        
        # Count active threads (unique thread_ids in memory)
        active_threads_pipeline = [
            {"$group": {"_id": "$thread_id"}},
            {"$count": "total"}
        ]
        active_threads_result = await collections["memory"].aggregate(active_threads_pipeline).to_list(1)
        active_threads = active_threads_result[0]["total"] if active_threads_result else 0
        
        # Get latest activity timestamp
        latest_activity = None
        latest_memory = await collections["memory"].find_one({}, sort=[("timestamp", -1)])
        if latest_memory and "timestamp" in latest_memory:
            latest_activity = latest_memory["timestamp"]
        
        return MemoryOverviewResponse(
            total_memories=memory_count,
            total_decisions=decisions_count,
            total_patterns=patterns_count,
            active_threads=active_threads,
            latest_activity=latest_activity
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching memory overview: {str(e)}")

@router.get("/conversations", response_model=List[MemoryItemResponse])
async def get_agent_conversations(
    thread_id: Optional[str] = Query(None, description="Filter by specific thread ID"),
    limit: int = Query(50, description="Maximum number of items to return"),
    skip: int = Query(0, description="Number of items to skip")
):
    """Get agent conversation memories (prompts, responses, context)"""
    try:
        collections = await get_memory_collections()
        
        # Build query filter
        query_filter = {}
        if thread_id:
            query_filter["thread_id"] = thread_id
        
        # Fetch memories with pagination
        cursor = collections["memory"].find(query_filter).sort("timestamp", -1).skip(skip).limit(limit)
        memories = await cursor.to_list(length=limit)
        
        # Transform to response format
        response_items = []
        for memory in memories:
            response_items.append(MemoryItemResponse(
                id=str(memory["_id"]),
                thread_id=memory.get("thread_id", ""),
                timestamp=memory.get("timestamp", datetime.now()),
                content_type=memory.get("content_type", "unknown"),
                content=memory.get("content", {}),
                metadata=memory.get("metadata", {})
            ))
        
        return response_items
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching conversations: {str(e)}")

@router.get("/decisions", response_model=List[DecisionResponse])
async def get_agent_decisions(
    thread_id: Optional[str] = Query(None, description="Filter by specific thread ID"),
    decision_type: Optional[str] = Query(None, description="Filter by decision type"),
    limit: int = Query(50, description="Maximum number of items to return"),
    skip: int = Query(0, description="Number of items to skip")
):
    """Get agent decision records with outcomes and learning data"""
    try:
        collections = await get_memory_collections()
        
        # Build query filter
        query_filter = {}
        if thread_id:
            query_filter["thread_id"] = thread_id
        if decision_type:
            query_filter["decision_type"] = decision_type
        
        # Debug: Log the query
        from logging import getLogger
        logger = getLogger(__name__)
        logger.info(f"🔍 DECISIONS API DEBUG: Query filter: {query_filter}")
        logger.info(f"🔍 DECISIONS API DEBUG: Limit: {limit}, Skip: {skip}")
        
        # Count total decisions first
        total_count = await collections["decisions"].count_documents(query_filter)
        logger.info(f"🔍 DECISIONS API DEBUG: Total decisions found: {total_count}")
        
        # Fetch decisions with pagination
        cursor = collections["decisions"].find(query_filter).sort("created_at", -1).skip(skip).limit(limit)
        decisions = await cursor.to_list(length=limit)
        logger.info(f"🔍 DECISIONS API DEBUG: Retrieved {len(decisions)} decisions")
        
        # Transform to response format
        response_items = []
        for decision in decisions:
            # Extract data from the actual structure stored by SimpleMemoryStore
            decision_info = decision.get("decision", {})
            outcome_info = decision.get("outcome", {})
            
            response_items.append(DecisionResponse(
                id=str(decision["_id"]),
                thread_id=decision.get("thread_id", ""),
                timestamp=decision.get("created_at", datetime.now()),
                decision_type=decision_info.get("action", "unknown"),
                input_context=decision.get("features", {}),
                output_result={
                    "action": decision_info.get("action", ""),
                    "confidence": decision_info.get("confidence", 0.0),
                    "risk_score": decision_info.get("risk_score", 0),
                    "reasoning": decision_info.get("reasoning", "")
                },
                confidence=decision_info.get("confidence", 0.0),
                outcome=outcome_info.get("actual"),
                metadata=decision.get("learning", {})
            ))
        
        return response_items
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching decisions: {str(e)}")

@router.get("/patterns", response_model=List[PatternResponse])
async def get_learned_patterns(
    pattern_type: Optional[str] = Query(None, description="Filter by pattern type"),
    min_confidence: float = Query(0.0, description="Minimum confidence threshold"),
    limit: int = Query(50, description="Maximum number of items to return"),
    skip: int = Query(0, description="Number of items to skip")
):
    """Get learned patterns and insights from agent's experience"""
    try:
        collections = await get_memory_collections()
        
        # Build query filter
        query_filter = {}
        if pattern_type:
            query_filter["pattern_type"] = pattern_type
        if min_confidence > 0:
            query_filter["confidence"] = {"$gte": min_confidence}
        
        # Fetch patterns with pagination
        cursor = collections["patterns"].find(query_filter).sort("confidence", -1).skip(skip).limit(limit)
        patterns = await cursor.to_list(length=limit)
        
        # Transform to response format
        response_items = []
        for pattern in patterns:
            response_items.append(PatternResponse(
                id=str(pattern["_id"]),
                pattern_type=pattern.get("pattern_type", "unknown"),
                description=pattern.get("description", ""),
                confidence=pattern.get("confidence", 0.0),
                evidence_count=pattern.get("evidence_count", 0),
                last_updated=pattern.get("last_updated", datetime.now()),
                pattern_data=pattern.get("pattern_data", {}),
                metadata=pattern.get("metadata", {})
            ))
        
        return response_items
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching patterns: {str(e)}")

@router.get("/threads")
async def get_active_threads():
    """Get list of active conversation threads"""
    try:
        collections = await get_memory_collections()
        
        # Aggregate unique thread IDs with latest activity and message counts
        pipeline = [
            {
                "$group": {
                    "_id": "$thread_id",
                    "latest_activity": {"$max": "$timestamp"},
                    "message_count": {"$sum": 1},
                    "content_types": {"$addToSet": "$content_type"}
                }
            },
            {
                "$sort": {"latest_activity": -1}
            },
            {
                "$limit": 100
            }
        ]
        
        threads = await collections["memory"].aggregate(pipeline).to_list(100)
        
        # Transform response
        response_threads = []
        for thread in threads:
            response_threads.append({
                "thread_id": thread["_id"],
                "latest_activity": thread.get("latest_activity"),
                "message_count": thread.get("message_count", 0),
                "content_types": thread.get("content_types", [])
            })
        
        return {"threads": response_threads}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching threads: {str(e)}")

@router.delete("/thread/{thread_id}")
async def delete_thread_memory(thread_id: str):
    """Delete all memory data for a specific thread"""
    try:
        collections = await get_memory_collections()
        
        # Delete from all collections
        memory_result = await collections["memory"].delete_many({"thread_id": thread_id})
        decisions_result = await collections["decisions"].delete_many({"thread_id": thread_id})
        
        return {
            "message": f"Thread {thread_id} memory deleted",
            "deleted_memories": memory_result.deleted_count,
            "deleted_decisions": decisions_result.deleted_count
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting thread memory: {str(e)}")

@router.get("/educational-info")
async def get_memory_system_info():
    """Get educational information about the MongoDB memory system"""
    return {
        "system_overview": {
            "title": "AI Agent Memory Management with MongoDB",
            "description": "This system demonstrates how MongoDB's document model provides ideal storage for AI agent learning and memory management."
        },
        "collections": {
            "agent_memory": {
                "purpose": "Stores conversation history, context, and interactions",
                "why_mongodb": "Flexible schema allows storing diverse conversation formats, from simple text to complex structured data",
                "key_features": ["Thread-based organization", "Timestamp-based retrieval", "Content type categorization"]
            },
            "agent_decisions": {
                "purpose": "Records agent decisions with input context and outcomes",
                "why_mongodb": "Document model naturally captures the full decision context without complex joins",
                "key_features": ["Decision type classification", "Confidence scoring", "Outcome tracking for learning"]
            },
            "agent_patterns": {
                "purpose": "Stores learned insights and patterns from experience",
                "why_mongodb": "Allows complex pattern data structures with embedded evidence and metadata",
                "key_features": ["Pattern confidence scoring", "Evidence counting", "Similarity search ready"]
            }
        },
        "mongodb_advantages": [
            "Document Model: Perfect for storing complex, nested AI conversation data",
            "Flexible Schema: Adapts as agent capabilities and data structures evolve", 
            "Vector Search: Built-in similarity search for finding related memories and patterns",
            "Aggregation Pipeline: Powerful querying for pattern analysis and learning insights",
            "TTL Indexes: Automatic cleanup of old memory data",
            "Horizontal Scaling: Grows with your agent's memory needs"
        ],
        "learning_capabilities": [
            "Context Retrieval: Find similar past situations to inform current decisions",
            "Pattern Recognition: Identify recurring themes and successful strategies",
            "Outcome Learning: Track decision effectiveness to improve future performance",
            "Meta-Learning: Learn how to learn better from accumulated experience"
        ]
    }