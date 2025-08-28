# Azure AI Foundry Agent Observability System

This module provides comprehensive observability and monitoring for Azure AI Foundry agents, including tool call tracking, decision analysis, and performance metrics.

## Features

- **Real-time Agent Monitoring**: Track agent conversations, tool calls, and performance metrics
- **Decision Tracking**: Monitor agent decision-making patterns and reasoning chains
- **OpenTelemetry Integration**: Full tracing support with Azure Monitor
- **Run Step Inspection**: Detailed analysis of individual agent run steps
- **Performance Analytics**: Comprehensive metrics and reporting

## Quick Start

### 1. Basic Setup

```python
from azure_foundry.observability import configure_observability
from azure_foundry.conversation.native_conversation import NativeConversationHandler
from azure.ai.agents import AgentsClient

# Configure observability (optional but recommended)
configure_observability(
    connection_string="your_azure_monitor_connection_string",
    enable_console_export=True,
    service_name="threatsight-360-agents"
)

# Initialize conversation handler with observability
agents_client = AgentsClient(...)
handler = NativeConversationHandler(
    agents_client=agents_client,
    agent_id="your_agent_id",
    enable_observability=True,
    observability_config={
        "configure_telemetry": True,
        "azure_monitor_connection_string": "your_connection_string",
        "enable_console_export": True
    }
)
```

### 2. Running Monitored Conversations

```python
# Run a conversation with observability tracking
response = await handler.run_conversation_native(
    thread_id="thread_123",
    message="Analyze this transaction for fraud",
    conversation_context={
        "transaction": {
            "amount": 1500.0,
            "merchant": "Online Store",
            "risk_score": 75.5,
            "fraud_indicators": ["velocity_exceeded", "new_merchant"]
        },
        "user_id": "user_456",
        "analysis_type": "fraud_detection"
    }
)
```

### 3. Accessing Observability Data

```python
# Get real-time metrics
metrics = handler.get_observability_metrics()
print(f"Agent success rate: {metrics['agent_metrics']['success_rate']:.1%}")
print(f"Average execution time: {metrics['agent_metrics']['avg_execution_time_ms']:.2f}ms")

# Export detailed reports
exported_files = await handler.export_observability_data("agent_analysis_2024")
print(f"Metrics exported to: {exported_files['metrics']}")
print(f"Decisions exported to: {exported_files['decisions']}")
```

## Core Components

### AgentObserver

Provides high-level monitoring of agent operations and conversations.

```python
from azure_foundry.observability import AgentObserver

observer = AgentObserver(agents_client)

# Start monitoring a conversation
context = await observer.start_conversation_monitoring(
    thread_id="thread_123",
    agent_id="agent_456",
    context={"analysis_type": "fraud_detection"}
)

# Monitor a specific run
result = await observer.monitor_agent_run(
    thread_id="thread_123",
    run_id="run_789",
    enable_real_time_logging=True,
    custom_context={"transaction_id": "txn_999"}
)

# Get comprehensive metrics
metrics = observer.get_agent_metrics("agent_456")
```

### DecisionTracker

Tracks agent decision-making patterns and reasoning.

```python
from azure_foundry.observability import DecisionTracker, DecisionType, ConfidenceLevel

tracker = DecisionTracker()

# Track a fraud assessment decision
decision_id = tracker.track_fraud_assessment_decision(
    thread_id="thread_123",
    run_id="run_789",
    agent_id="agent_456",
    transaction_data={
        "amount": 1500.0,
        "merchant": "Online Store",
        "customer_id": "cust_789"
    },
    risk_score=75.5,
    fraud_indicators=["velocity_exceeded", "new_merchant"],
    reasoning=[
        "Transaction amount exceeds normal pattern",
        "New merchant detected",
        "Velocity threshold exceeded"
    ],
    tools_used=["analyze_transaction_patterns", "check_sanctions_lists"]
)

# Update with actual outcome (for validation)
tracker.update_decision_outcome(
    decision_id=decision_id,
    actual_outcome="confirmed_fraud",
    outcome_accuracy=0.95
)

# Get decision analytics
analytics = tracker.get_decision_analytics("agent_456")
print(f"Decision accuracy: {analytics['success_rate']:.1%}")
```

### RunStepInspector

Provides detailed inspection of individual agent runs.

```python
from azure_foundry.observability import RunStepInspector

inspector = RunStepInspector(agents_client)

# Wait for run completion and inspect
result = await inspector.wait_for_run_and_inspect(
    thread_id="thread_123",
    run_id="run_789",
    poll_interval=1.0,
    max_wait_time=300,
    enable_real_time_logging=True
)

# Analyze the results
print(f"Total tool calls: {result.total_tool_calls}")
print(f"Success rate: {result.summary['tool_call_success_rate']:.1%}")
print(f"Execution time: {result.total_execution_time_ms:.2f}ms")

# Export detailed inspection data
inspector.export_inspection_data(result.run_id, "detailed_analysis.json")
```

## Configuration Options

### Environment Variables

```bash
# Azure Monitor (optional)
AZURE_MONITOR_CONNECTION_STRING="InstrumentationKey=..."

# Service configuration
SERVICE_NAME="threatsight-360-agents"
SERVICE_VERSION="1.0.0"
```

### Observability Config

```python
observability_config = {
    "configure_telemetry": True,  # Enable OpenTelemetry setup
    "azure_monitor_connection_string": "your_connection_string",
    "enable_console_export": True,  # Export to console for debugging
    "service_name": "threatsight-360-agents",
    "service_version": "1.0.0"
}
```

## Advanced Usage

### Custom Decision Tracking

```python
from azure_foundry.observability import DecisionFactor

# Track a custom decision with detailed factors
factors = [
    DecisionFactor(
        factor_type="risk_score",
        description="Transaction risk score exceeds threshold",
        weight=0.7,
        value=75.5,
        impact="negative"
    ),
    DecisionFactor(
        factor_type="velocity_pattern",
        description="Transaction velocity increased 300%",
        weight=0.5,
        value=3.0,
        impact="negative"
    )
]

decision_id = tracker.track_decision(
    thread_id="thread_123",
    run_id="run_789",
    agent_id="agent_456",
    decision_type=DecisionType.RISK_SCORING,
    decision_summary="High risk transaction identified",
    confidence_level=ConfidenceLevel.HIGH,
    confidence_score=0.85,
    input_context={"transaction": transaction_data},
    reasoning_chain=[
        "Analyzed transaction patterns",
        "Checked velocity thresholds", 
        "Applied risk scoring model",
        "Determined high risk classification"
    ],
    decision_factors=factors,
    tools_used=["analyze_transaction_patterns", "calculate_network_risk"],
    processing_time_ms=1250.0
)
```

### Streaming with Observability

```python
# Real-time monitoring of streaming conversations
async for chunk in handler.run_conversation_streaming(
    thread_id="thread_123",
    message="Analyze this suspicious transaction",
    temperature=0.1
):
    print(chunk, end="", flush=True)

# Metrics are automatically tracked during streaming
final_metrics = handler.get_observability_metrics()
```

### Batch Analysis

```python
# Analyze multiple agent decisions
decisions = tracker.get_agent_decisions(
    agent_id="agent_456",
    decision_type=DecisionType.FRAUD_ASSESSMENT,
    limit=100
)

# Calculate success patterns
high_confidence_decisions = [
    d for d in decisions 
    if d.confidence_level == ConfidenceLevel.HIGH
]

accuracy_scores = [
    d.outcome_accuracy for d in high_confidence_decisions 
    if d.outcome_accuracy is not None
]

if accuracy_scores:
    avg_accuracy = sum(accuracy_scores) / len(accuracy_scores)
    print(f"High confidence decision accuracy: {avg_accuracy:.1%}")
```

## Data Export and Analysis

### JSON Export Format

The system exports comprehensive data in structured JSON format:

```json
{
  "generated_at": "2024-08-28T10:30:00Z",
  "agent_metrics": {
    "agent_456": {
      "total_runs": 150,
      "successful_runs": 142,
      "success_rate": 0.947,
      "avg_execution_time_ms": 2340.5,
      "most_used_tools": ["analyze_transaction_patterns", "check_sanctions_lists"]
    }
  },
  "decision_analytics": {
    "total_decisions": 89,
    "avg_confidence_score": 0.78,
    "success_rate": 0.91,
    "decision_type_distribution": {
      "fraud_assessment": 45,
      "risk_scoring": 28,
      "tool_selection": 16
    }
  },
  "conversation_history": [...],
  "patterns": {...}
}
```

## Integration with Existing Systems

### FastAPI Integration

```python
from fastapi import FastAPI, BackgroundTasks
from azure_foundry.observability import configure_observability

app = FastAPI()

# Initialize observability on startup
@app.on_event("startup")
async def setup_observability():
    configure_observability(
        connection_string=os.getenv("AZURE_MONITOR_CONNECTION_STRING"),
        service_name="fraud-detection-api"
    )

@app.post("/analyze-transaction")
async def analyze_transaction(
    transaction_data: dict,
    background_tasks: BackgroundTasks
):
    handler = NativeConversationHandler(
        agents_client=get_agents_client(),
        agent_id=os.getenv("FRAUD_AGENT_ID"),
        enable_observability=True
    )
    
    response = await handler.run_conversation_native(
        thread_id=create_thread(),
        message=f"Analyze transaction: {transaction_data}",
        conversation_context={"transaction": transaction_data}
    )
    
    # Export metrics in background
    background_tasks.add_task(
        handler.export_observability_data,
        f"transaction_{transaction_data.get('id')}"
    )
    
    return {"analysis": response}
```

## Troubleshooting

### Common Issues

1. **OpenTelemetry Import Errors**: Ensure observability dependencies are installed
   ```bash
   poetry install
   ```

2. **Azure Monitor Connection**: Verify connection string format
   ```python
   # Correct format
   "InstrumentationKey=12345678-1234-1234-1234-123456789abc"
   ```

3. **Memory Usage**: For long-running applications, export data periodically
   ```python
   # Export every 1000 decisions
   if len(tracker.decisions) > 1000:
       await tracker.export_decision_history()
       tracker.decisions.clear()  # Clear old data
   ```

### Performance Considerations

- Enable observability selectively in production
- Use background tasks for data export
- Configure appropriate polling intervals for run inspection
- Set reasonable limits for conversation history retention

## Dependencies

Required packages (automatically added to pyproject.toml):
- `azure-monitor-opentelemetry ^1.8.0`
- `opentelemetry-sdk ^1.25.0`
- `opentelemetry-api ^1.25.0`
- `opentelemetry-exporter-otlp ^1.25.0`