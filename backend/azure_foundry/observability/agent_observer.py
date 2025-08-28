"""
Azure AI Foundry Agent Observer
Provides high-level monitoring and observability for agent operations and tool calls
"""

import time
import json
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
from dataclasses import dataclass, asdict

from .telemetry_config import create_span
from .run_inspector import RunStepInspector, RunInspectionResult

logger = logging.getLogger(__name__)

@dataclass
class AgentMetrics:
    """Agent performance and usage metrics"""
    agent_id: str
    total_runs: int = 0
    successful_runs: int = 0
    failed_runs: int = 0
    total_tool_calls: int = 0
    avg_execution_time_ms: float = 0.0
    success_rate: float = 0.0
    most_used_tools: List[str] = None
    
    def __post_init__(self):
        if self.most_used_tools is None:
            self.most_used_tools = []

@dataclass
class ConversationContext:
    """Context information for a conversation session"""
    thread_id: str
    agent_id: str
    conversation_start: str
    total_messages: int = 0
    tool_calls_count: int = 0
    avg_response_time_ms: float = 0.0
    conversation_status: str = "active"  # active, completed, failed
    
class AgentObserver:
    """
    High-level observer for monitoring agent operations, conversations, and tool usage
    """
    
    def __init__(self, agents_client):
        """
        Initialize the agent observer.
        
        Args:
            agents_client: Azure AI agents client for API calls
        """
        self.agents_client = agents_client
        self.run_inspector = RunStepInspector(agents_client)
        self.active_conversations: Dict[str, ConversationContext] = {}
        self.agent_metrics: Dict[str, AgentMetrics] = {}
        self.conversation_history: List[Dict[str, Any]] = []
        
    async def start_conversation_monitoring(
        self, 
        thread_id: str, 
        agent_id: str,
        context: Dict[str, Any] = None
    ) -> ConversationContext:
        """
        Start monitoring a new conversation session.
        
        Args:
            thread_id: Azure AI thread ID
            agent_id: Agent ID being used
            context: Additional context information
            
        Returns:
            ConversationContext for the new session
        """
        with create_span("start_conversation_monitoring", {
            "thread_id": thread_id,
            "agent_id": agent_id
        }) as span:
            
            conversation = ConversationContext(
                thread_id=thread_id,
                agent_id=agent_id,
                conversation_start=datetime.now(timezone.utc).isoformat()
            )
            
            self.active_conversations[thread_id] = conversation
            
            # Initialize agent metrics if not exists
            if agent_id not in self.agent_metrics:
                self.agent_metrics[agent_id] = AgentMetrics(agent_id=agent_id)
            
            logger.info(f"🎬 Started conversation monitoring: thread={thread_id}, agent={agent_id}")
            
            span.set_attribute("conversation.started", True)
            return conversation
    
    async def monitor_agent_run(
        self,
        thread_id: str,
        run_id: str,
        enable_real_time_logging: bool = True,
        custom_context: Dict[str, Any] = None
    ) -> RunInspectionResult:
        """
        Monitor a complete agent run with comprehensive analysis.
        
        Args:
            thread_id: Azure AI thread ID
            run_id: Run ID to monitor
            enable_real_time_logging: Whether to log progress in real-time
            custom_context: Additional context for this run
            
        Returns:
            Complete RunInspectionResult with monitoring data
        """
        with create_span("monitor_agent_run", {
            "thread_id": thread_id,
            "run_id": run_id,
            "has_custom_context": custom_context is not None
        }) as span:
            
            try:
                # Use run inspector for detailed analysis
                result = await self.run_inspector.wait_for_run_and_inspect(
                    thread_id=thread_id,
                    run_id=run_id,
                    enable_real_time_logging=enable_real_time_logging
                )
                
                # Update conversation context
                if thread_id in self.active_conversations:
                    self._update_conversation_context(thread_id, result)
                
                # Update agent metrics
                self._update_agent_metrics(result.agent_id, result)
                
                # Store run data for analysis
                run_data = {
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "thread_id": thread_id,
                    "run_id": run_id,
                    "agent_id": result.agent_id,
                    "status": result.status,
                    "execution_time_ms": result.total_execution_time_ms,
                    "tool_calls": result.total_tool_calls,
                    "success": result.status == "completed",
                    "custom_context": custom_context
                }
                self.conversation_history.append(run_data)
                
                # Add observability attributes
                span.set_attribute("run.agent_id", result.agent_id)
                span.set_attribute("run.status", result.status)
                span.set_attribute("run.tool_calls", result.total_tool_calls)
                span.set_attribute("run.success", result.status == "completed")
                
                if enable_real_time_logging:
                    self._log_run_monitoring_summary(result, custom_context)
                
                return result
                
            except Exception as e:
                logger.error(f"❌ Agent run monitoring failed: {e}")
                span.set_attribute("error", str(e))
                raise
    
    def _update_conversation_context(self, thread_id: str, result: RunInspectionResult):
        """Update conversation context with run results"""
        if thread_id not in self.active_conversations:
            return
            
        context = self.active_conversations[thread_id]
        context.total_messages += 1
        context.tool_calls_count += result.total_tool_calls
        
        # Update average response time
        if result.total_execution_time_ms:
            if context.avg_response_time_ms == 0:
                context.avg_response_time_ms = result.total_execution_time_ms
            else:
                context.avg_response_time_ms = (
                    context.avg_response_time_ms + result.total_execution_time_ms
                ) / 2
    
    def _update_agent_metrics(self, agent_id: str, result: RunInspectionResult):
        """Update agent metrics with run results"""
        if agent_id not in self.agent_metrics:
            self.agent_metrics[agent_id] = AgentMetrics(agent_id=agent_id)
        
        metrics = self.agent_metrics[agent_id]
        metrics.total_runs += 1
        metrics.total_tool_calls += result.total_tool_calls
        
        if result.status == "completed":
            metrics.successful_runs += 1
        else:
            metrics.failed_runs += 1
        
        # Update success rate
        metrics.success_rate = metrics.successful_runs / metrics.total_runs
        
        # Update average execution time
        if result.total_execution_time_ms:
            if metrics.avg_execution_time_ms == 0:
                metrics.avg_execution_time_ms = result.total_execution_time_ms
            else:
                metrics.avg_execution_time_ms = (
                    metrics.avg_execution_time_ms + result.total_execution_time_ms
                ) / 2
        
        # Track most used tools
        tool_names = []
        for step in result.steps:
            for tool_call in step.tool_calls:
                if tool_call.name:
                    tool_names.append(tool_call.name)
        
        # Update most used tools list (keep top 5)
        from collections import Counter
        all_tools = metrics.most_used_tools + tool_names
        top_tools = Counter(all_tools).most_common(5)
        metrics.most_used_tools = [tool for tool, _ in top_tools]
    
    async def end_conversation_monitoring(self, thread_id: str, status: str = "completed"):
        """
        End monitoring for a conversation session.
        
        Args:
            thread_id: Thread ID to stop monitoring
            status: Final conversation status
        """
        with create_span("end_conversation_monitoring", {
            "thread_id": thread_id,
            "status": status
        }) as span:
            
            if thread_id in self.active_conversations:
                context = self.active_conversations[thread_id]
                context.conversation_status = status
                
                logger.info(f"🏁 Ended conversation monitoring: thread={thread_id}, status={status}")
                
                # Move to history and remove from active
                conversation_summary = {
                    "thread_id": thread_id,
                    "agent_id": context.agent_id,
                    "duration_ms": (
                        datetime.now(timezone.utc) - 
                        datetime.fromisoformat(context.conversation_start.replace('Z', '+00:00'))
                    ).total_seconds() * 1000,
                    "total_messages": context.total_messages,
                    "tool_calls_count": context.tool_calls_count,
                    "avg_response_time_ms": context.avg_response_time_ms,
                    "final_status": status
                }
                self.conversation_history.append(conversation_summary)
                
                del self.active_conversations[thread_id]
                
                span.set_attribute("conversation.ended", True)
                span.set_attribute("conversation.final_status", status)
    
    def get_agent_metrics(self, agent_id: str = None) -> Dict[str, Any]:
        """
        Get performance metrics for agents.
        
        Args:
            agent_id: Specific agent ID, or None for all agents
            
        Returns:
            Agent metrics data
        """
        if agent_id:
            return asdict(self.agent_metrics.get(agent_id, AgentMetrics(agent_id=agent_id)))
        
        return {aid: asdict(metrics) for aid, metrics in self.agent_metrics.items()}
    
    def get_active_conversations(self) -> Dict[str, Dict[str, Any]]:
        """Get information about currently active conversations"""
        return {tid: asdict(context) for tid, context in self.active_conversations.items()}
    
    def get_conversation_history(self, limit: int = 50) -> List[Dict[str, Any]]:
        """Get recent conversation history"""
        return self.conversation_history[-limit:] if limit else self.conversation_history
    
    def _log_run_monitoring_summary(self, result: RunInspectionResult, custom_context: Dict[str, Any]):
        """Log a summary of the monitored run"""
        context_info = f" | Context: {json.dumps(custom_context, indent=2)}" if custom_context else ""
        
        logger.info(f"""
🎯 AGENT RUN MONITORING SUMMARY
============================================
Thread: {result.thread_id}
Run: {result.run_id}
Agent: {result.agent_id}
Status: {result.status}
Execution Time: {result.total_execution_time_ms:.2f}ms
Tool Calls: {result.total_tool_calls}
Success Rate: {result.summary.get('tool_call_success_rate', 0):.1%}{context_info}
""")
    
    def export_metrics_report(self, file_path: str = None) -> str:
        """
        Export comprehensive metrics report to JSON file.
        
        Args:
            file_path: Optional file path (defaults to timestamp-based name)
            
        Returns:
            File path where report was exported
        """
        if not file_path:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            file_path = f"agent_metrics_report_{timestamp}.json"
        
        try:
            report_data = {
                "generated_at": datetime.now(timezone.utc).isoformat(),
                "agent_metrics": self.get_agent_metrics(),
                "active_conversations": self.get_active_conversations(),
                "conversation_history": self.get_conversation_history(),
                "summary": {
                    "total_agents_monitored": len(self.agent_metrics),
                    "active_conversations_count": len(self.active_conversations),
                    "total_conversation_history": len(self.conversation_history)
                }
            }
            
            with open(file_path, 'w') as f:
                json.dump(report_data, f, indent=2, default=str)
            
            logger.info(f"✅ Metrics report exported to {file_path}")
            return file_path
            
        except Exception as e:
            logger.error(f"❌ Failed to export metrics report: {e}")
            raise