"""
Azure AI Foundry Run Step Inspector
Provides detailed monitoring and analysis of agent run steps and tool calls
"""

import time
import json
import logging
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime, timezone
from dataclasses import dataclass, asdict

from .telemetry_config import create_span

logger = logging.getLogger(__name__)

@dataclass
class ToolCallDetail:
    """Details of a single tool call within a run step"""
    id: str
    type: str  # 'function', 'connected_agent', etc.
    name: Optional[str] = None
    arguments: Optional[str] = None
    agent_id: Optional[str] = None  # For connected agents
    status: Optional[str] = None
    output: Optional[str] = None
    execution_time_ms: Optional[float] = None

@dataclass
class RunStepDetail:
    """Comprehensive details of a single run step"""
    step_id: str
    step_type: str
    status: str
    created_at: str
    completed_at: Optional[str] = None
    execution_time_ms: Optional[float] = None
    tool_calls: List[ToolCallDetail] = None
    error_message: Optional[str] = None
    metadata: Dict[str, Any] = None

    def __post_init__(self):
        if self.tool_calls is None:
            self.tool_calls = []

@dataclass
class RunInspectionResult:
    """Complete analysis of an agent run execution"""
    run_id: str
    thread_id: str
    agent_id: str
    status: str
    created_at: str
    completed_at: Optional[str] = None
    total_execution_time_ms: Optional[float] = None
    steps: List[RunStepDetail] = None
    total_tool_calls: int = 0
    function_calls: int = 0
    connected_agent_calls: int = 0
    successful_calls: int = 0
    failed_calls: int = 0
    summary: Dict[str, Any] = None

    def __post_init__(self):
        if self.steps is None:
            self.steps = []
        if self.summary is None:
            self.summary = {}

class RunStepInspector:
    """
    Inspects and analyzes Azure AI Foundry agent run steps for observability
    """
    
    def __init__(self, agents_client):
        """
        Initialize the run step inspector.
        
        Args:
            agents_client: Azure AI agents client for API calls
        """
        self.agents_client = agents_client
        self.inspection_cache = {}
    
    async def wait_for_run_and_inspect(
        self, 
        thread_id: str, 
        run_id: str, 
        poll_interval: float = 1.0,
        max_wait_time: int = 300,
        enable_real_time_logging: bool = True
    ) -> RunInspectionResult:
        """
        Wait for a run to complete and perform comprehensive inspection.
        
        Args:
            thread_id: Azure AI thread ID
            run_id: Azure AI run ID
            poll_interval: How often to poll for updates (seconds)
            max_wait_time: Maximum time to wait for completion (seconds)
            enable_real_time_logging: Whether to log progress in real-time
            
        Returns:
            RunInspectionResult with complete analysis
        """
        start_time = datetime.now(timezone.utc)
        
        with create_span("agent_run_inspection", {
            "thread_id": thread_id,
            "run_id": run_id,
            "max_wait_time": max_wait_time
        }) as span:
            
            try:
                # Poll until run is complete
                run = await self._poll_until_complete(
                    thread_id, run_id, poll_interval, max_wait_time, enable_real_time_logging
                )
                
                # Get detailed run steps
                steps = await self._inspect_run_steps(thread_id, run_id, enable_real_time_logging)
                
                # Calculate metrics
                end_time = datetime.now(timezone.utc)
                total_time_ms = (end_time - start_time).total_seconds() * 1000
                
                # Build comprehensive result
                result = self._build_inspection_result(
                    run, steps, total_time_ms, start_time.isoformat()
                )
                
                # Cache result for future reference
                self.inspection_cache[run_id] = result
                
                # Log summary
                if enable_real_time_logging:
                    self._log_inspection_summary(result)
                
                # Add tracing attributes
                span.set_attribute("run.status", result.status)
                span.set_attribute("run.total_tool_calls", result.total_tool_calls)
                span.set_attribute("run.execution_time_ms", result.total_execution_time_ms or 0)
                
                return result
                
            except Exception as e:
                logger.error(f"❌ Run inspection failed for {run_id}: {e}")
                span.set_attribute("error", str(e))
                raise
    
    async def _poll_until_complete(
        self, 
        thread_id: str, 
        run_id: str, 
        poll_interval: float, 
        max_wait_time: int,
        enable_logging: bool
    ):
        """Poll the run until it's complete or times out"""
        start_time = time.time()
        
        while True:
            run = self.agents_client.runs.get(thread_id=thread_id, run_id=run_id)
            
            if run.status in ("completed", "failed", "cancelled", "expired"):
                if enable_logging:
                    logger.info(f"✅ Run {run_id} completed with status: {run.status}")
                return run
            
            if time.time() - start_time > max_wait_time:
                logger.error(f"⏰ Run {run_id} timed out after {max_wait_time} seconds")
                raise TimeoutError(f"Run timed out after {max_wait_time} seconds")
            
            if enable_logging and run.status == "requires_action":
                logger.info(f"🔄 Run {run_id} requires action: {getattr(run, 'required_action', 'Unknown')}")
            
            time.sleep(poll_interval)
    
    async def _inspect_run_steps(
        self, 
        thread_id: str, 
        run_id: str,
        enable_logging: bool
    ) -> List[RunStepDetail]:
        """Get detailed information about each run step"""
        try:
            raw_steps = list(self.agents_client.runs.list_run_steps(
                thread_id=thread_id, 
                run_id=run_id
            ))
            
            steps = []
            for raw_step in raw_steps:
                step_detail = self._parse_run_step(raw_step, enable_logging)
                steps.append(step_detail)
            
            return steps
            
        except Exception as e:
            logger.error(f"❌ Failed to inspect run steps for {run_id}: {e}")
            return []
    
    def _parse_run_step(self, raw_step, enable_logging: bool) -> RunStepDetail:
        """Parse a raw run step into our detailed format"""
        try:
            step_detail = RunStepDetail(
                step_id=raw_step.id,
                step_type=raw_step.type,
                status=raw_step.status,
                created_at=getattr(raw_step, 'created_at', datetime.now(timezone.utc).isoformat()),
                completed_at=getattr(raw_step, 'completed_at', None),
                metadata={}
            )
            
            # Calculate execution time if both timestamps are available
            if step_detail.completed_at:
                try:
                    created = datetime.fromisoformat(step_detail.created_at.replace('Z', '+00:00'))
                    completed = datetime.fromisoformat(step_detail.completed_at.replace('Z', '+00:00'))
                    step_detail.execution_time_ms = (completed - created).total_seconds() * 1000
                except:
                    pass
            
            # Parse tool calls if present
            if hasattr(raw_step, 'step_details') and raw_step.step_details:
                tool_calls = getattr(raw_step.step_details, 'tool_calls', None)
                if tool_calls:
                    for tool_call in tool_calls:
                        tool_detail = self._parse_tool_call(tool_call)
                        step_detail.tool_calls.append(tool_detail)
                        
                        if enable_logging:
                            logger.info(f"🔧 Tool call: {tool_detail.name} ({tool_detail.type})")
            
            return step_detail
            
        except Exception as e:
            logger.error(f"❌ Failed to parse run step: {e}")
            return RunStepDetail(
                step_id=getattr(raw_step, 'id', 'unknown'),
                step_type="unknown",
                status="error",
                created_at=datetime.now(timezone.utc).isoformat(),
                error_message=str(e)
            )
    
    def _parse_tool_call(self, tool_call) -> ToolCallDetail:
        """Parse a tool call into our detailed format"""
        try:
            tool_detail = ToolCallDetail(
                id=tool_call.id,
                type=tool_call.type
            )
            
            # Handle function calls
            if tool_call.type == "function" and hasattr(tool_call, 'function'):
                tool_detail.name = getattr(tool_call.function, 'name', None)
                tool_detail.arguments = getattr(tool_call.function, 'arguments', None)
            
            # Handle connected agent calls
            elif tool_call.type == "connected_agent" and hasattr(tool_call, 'connected_agent'):
                tool_detail.name = getattr(tool_call.connected_agent, 'name', None)
                tool_detail.agent_id = getattr(tool_call.connected_agent, 'agent_id', None)
            
            return tool_detail
            
        except Exception as e:
            logger.error(f"❌ Failed to parse tool call: {e}")
            return ToolCallDetail(
                id=getattr(tool_call, 'id', 'unknown'),
                type="error",
                name=f"parse_error: {str(e)}"
            )
    
    def _build_inspection_result(
        self, 
        run, 
        steps: List[RunStepDetail], 
        total_time_ms: float,
        created_at: str
    ) -> RunInspectionResult:
        """Build comprehensive inspection result"""
        
        # Count different types of tool calls
        total_tool_calls = 0
        function_calls = 0
        connected_agent_calls = 0
        successful_calls = 0
        failed_calls = 0
        
        for step in steps:
            for tool_call in step.tool_calls:
                total_tool_calls += 1
                if tool_call.type == "function":
                    function_calls += 1
                elif tool_call.type == "connected_agent":
                    connected_agent_calls += 1
                
                if tool_call.status == "completed":
                    successful_calls += 1
                elif tool_call.status in ("failed", "error"):
                    failed_calls += 1
        
        # Build summary
        summary = {
            "total_steps": len(steps),
            "avg_step_time_ms": total_time_ms / len(steps) if steps else 0,
            "tool_call_success_rate": successful_calls / total_tool_calls if total_tool_calls > 0 else 0,
            "most_used_tool_type": "function" if function_calls >= connected_agent_calls else "connected_agent"
        }
        
        return RunInspectionResult(
            run_id=run.id,
            thread_id=getattr(run, 'thread_id', 'unknown'),
            agent_id=getattr(run, 'assistant_id', getattr(run, 'agent_id', 'unknown')),
            status=run.status,
            created_at=created_at,
            completed_at=datetime.now(timezone.utc).isoformat(),
            total_execution_time_ms=total_time_ms,
            steps=steps,
            total_tool_calls=total_tool_calls,
            function_calls=function_calls,
            connected_agent_calls=connected_agent_calls,
            successful_calls=successful_calls,
            failed_calls=failed_calls,
            summary=summary
        )
    
    def _log_inspection_summary(self, result: RunInspectionResult):
        """Log a comprehensive summary of the inspection results"""
        logger.info(f"""
🔍 AGENT RUN INSPECTION SUMMARY
============================================
Run ID: {result.run_id}
Agent ID: {result.agent_id}
Status: {result.status}
Total Execution Time: {result.total_execution_time_ms:.2f}ms

📊 TOOL CALL ANALYSIS:
  • Total Tool Calls: {result.total_tool_calls}
  • Function Calls: {result.function_calls}
  • Connected Agent Calls: {result.connected_agent_calls}
  • Success Rate: {result.summary['tool_call_success_rate']:.1%}

⚡ PERFORMANCE METRICS:
  • Total Steps: {len(result.steps)}
  • Average Step Time: {result.summary['avg_step_time_ms']:.2f}ms
  • Most Used Tool Type: {result.summary['most_used_tool_type']}

🔧 STEP BREAKDOWN:""")
        
        for i, step in enumerate(result.steps, 1):
            logger.info(f"  Step {i}: {step.step_type} ({step.status}) - {len(step.tool_calls)} tool calls")
    
    def export_inspection_data(self, run_id: str, file_path: str = None) -> str:
        """
        Export inspection data to JSON file for offline analysis.
        
        Args:
            run_id: Run ID to export
            file_path: Optional file path (defaults to run_id.json)
            
        Returns:
            File path where data was exported
        """
        if run_id not in self.inspection_cache:
            raise ValueError(f"No inspection data found for run {run_id}")
        
        result = self.inspection_cache[run_id]
        
        if not file_path:
            file_path = f"agent_run_{run_id}_inspection.json"
        
        try:
            with open(file_path, 'w') as f:
                json.dump(asdict(result), f, indent=2, default=str)
            
            logger.info(f"✅ Inspection data exported to {file_path}")
            return file_path
            
        except Exception as e:
            logger.error(f"❌ Failed to export inspection data: {e}")
            raise