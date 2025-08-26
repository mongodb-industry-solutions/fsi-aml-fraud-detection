# Azure AI Foundry Agents: Comprehensive Developer Documentation

## What are Azure AI Foundry Agents?

Azure AI Foundry agents are **semi-autonomous software systems** designed to achieve specific goals without requiring predefined steps or processes. They represent a fundamental shift from traditional assistants that support people to agents that complete goals independently through decision-making, tool invocation, and workflow participation.

Each agent consists of three core components:

- **Model (LLM)**: Powers reasoning and language understanding using models like GPT-4o, GPT-4, Llama, or custom models
- **Instructions**: Define the agent's goals, behavior, and constraints through system prompts
- **Tools**: Enable knowledge retrieval and real-world actions through various connectors and APIs

The platform operates on an "Agent Factory" metaphor - an assembly line approach where different specialized stations shape agents into production-ready systems through six stages: Models, Customization, AI Tools, Orchestration, Trust, and Observability.

## Architecture and System Design

### High-Level Architecture

Azure AI Foundry employs a layered architecture with clear separation of concerns:

**Resource Hierarchy:**

- **Azure AI Foundry Resource**: Top-level resource (Microsoft.CognitiveServices/account)
- **Azure AI Foundry Project**: Child resource for project-level isolation
- **Control Plane**: Management operations including security configuration and deployments
- **Data Plane**: Development activities including building agents and running evaluations

**Core Runtime Components:**
The Azure AI Foundry Agent Service serves as the central runtime that connects models, tools, and frameworks into a single runtime. It manages threads and conversation state, orchestrates tool calls and handles retries, enforces content safety and security policies, and integrates with identity, networking, and observability systems.

**Execution Model:**
The platform uses a Thread-Run-Message model where Threads act as conversation containers maintaining context, Runs are individual execution instances within a thread, and Messages are input/output units within the conversation. This architecture enables stateful conversations with automatic context management and truncation when approaching model limits.

## Types of Agents Available

### By Interaction Pattern

- **Single Agents**: Standalone agents handling specific tasks with focused capabilities
- **Connected Agents**: Point-to-point agent interactions for task delegation using natural language routing
- **Multi-Agent Workflows**: Stateful orchestration of multiple agents for complex, long-running processes

### By Specialization

- **Knowledge Agents**: Focus on information retrieval and analysis using Azure AI Search, SharePoint, or Bing
- **Action Agents**: Execute real-world actions through Azure Logic Apps, Functions, or custom APIs
- **Orchestrator Agents**: Coordinate and manage other agents in complex workflows
- **Domain-Specific Agents**: Specialized for industries like legal, finance, or healthcare

### By Deployment Model

- **Basic Agent Setup**: Microsoft-managed storage with logical separation for quick starts
- **Standard Agent Setup**: Bring-your-own storage for enhanced data isolation and compliance
- **Private Network Setup**: Full network isolation with virtual network integration

## Setting Up and Configuring Agents

### Prerequisites

**Azure Subscription Requirements:**

- Azure subscription with appropriate permissions
- Azure AI Account Owner role at subscription scope for creating accounts
- Azure AI User role for creating agents within projects
- For standard setup: Role Based Access Administrator permissions

### Environment Setup

**Portal Setup (Quickest):**

1. Navigate to https://ai.azure.com
2. Click "Create an agent" for fastest setup
3. Enter project name and configure options
4. Resources automatically created include Azure AI Foundry account, GPT-4o deployment, and default agent

**Command Line Setup:**

```bash
# Install Azure Developer CLI
azd init --template https://github.com/Azure-Samples/get-started-with-ai-agents
azd up

# Set environment variables
export PROJECT_ENDPOINT="https://<AIFoundryResourceName>.services.ai.azure.com/api/projects/<ProjectName>"
export MODEL_DEPLOYMENT_NAME="gpt-4o-mini"
```

### SDK Installation

**Python:**

```bash
pip install azure-ai-projects azure-identity
```

**JavaScript/TypeScript:**

```bash
npm install @azure/ai-agents @azure/identity
```

**.NET:**

```bash
dotnet add package Azure.AI.Agents.Persistent
dotnet add package Azure.Identity
```

## Creating Custom Agents

### Basic Agent Creation (Python)

```python
import os
from azure.ai.projects import AIProjectClient
from azure.identity import DefaultAzureCredential

# Initialize client
project_client = AIProjectClient(
    endpoint=os.environ["PROJECT_ENDPOINT"],
    credential=DefaultAzureCredential()
)

# Create agent with custom instructions
agent = project_client.agents.create_agent(
    model=os.environ["MODEL_DEPLOYMENT_NAME"],
    name="customer-support-agent",
    instructions="""You are a customer support agent.
    Help users with inquiries, troubleshoot issues, and provide solutions.
    Always be polite, ask clarifying questions, and provide step-by-step guidance."""
)

# Create conversation thread
thread = project_client.agents.threads.create()

# Send message and get response
message = project_client.agents.messages.create(
    thread_id=thread.id,
    role="user",
    content="How can I reset my password?"
)

# Execute agent
run = project_client.agents.runs.create_and_process(
    thread_id=thread.id,
    agent_id=agent.id
)
```

### Agent with File Search Capability

```python
from azure.ai.agents.models import FileSearchTool

# Upload knowledge base
file = project_client.files.upload_and_poll(
    file_path="knowledge_base.pdf",
    purpose="assistants"
)

# Create vector store
vector_store = project_client.vector_stores.create_and_poll(
    file_ids=[file.id],
    name="knowledge_store"
)

# Configure file search tool
file_search = FileSearchTool(vector_store_ids=[vector_store.id])

# Create agent with file search
agent = project_client.agents.create_agent(
    model="gpt-4o",
    name="knowledge-agent",
    instructions="Search through uploaded documents to answer questions accurately.",
    tools=file_search.definitions,
    tool_resources=file_search.resources
)
```

## Agent Capabilities and Features

### Built-in Capabilities

- **Autonomous Decision Making**: Agents make decisions and invoke tools independently based on context
- **Multi-turn Conversation Management**: Maintains context across interactions through thread storage
- **Tool Orchestration**: Automatic tool calling with structured logging
- **Content Safety**: Built-in filters with prompt injection protection
- **Thread Management**: Secure conversation history with full visibility
- **Retry Logic**: Built-in error handling for robust operation

### Available Tools

**Knowledge Tools:**

- **Azure AI Search**: Vector and textual data retrieval from search indexes
- **SharePoint Integration**: Secure document access with identity passthrough
- **Microsoft Fabric**: Structured data insights with built-in AI
- **Bing Search**: Real-time web search results and grounding
- **File Search**: Document processing and analysis

**Action Tools:**

- **Azure Functions**: Custom stateful function execution
- **Azure Logic Apps**: Low-code/no-code workflow integration with 1,400+ connectors
- **OpenAPI Spec Tool**: Existing API integration
- **Function Calling**: Custom stateless function development
- **Browser Automation**: Real-world browser task execution

**Analysis Tools:**

- **Code Interpreter**: Secure Python code execution environment
- **Content Filters**: Injection attack mitigation
- **Deep Research Tool**: Web-based research pipeline

## Integration with Azure AI Services

### Azure OpenAI Integration

The platform provides seamless integration with Azure OpenAI Service through unified API access, native function calling support, and model deployment integration:

```python
# Configure Azure OpenAI models
agent = project_client.agents.create_agent(
    model="gpt-4o",  # or gpt-4, gpt-3.5-turbo
    name="openai-agent",
    instructions="You are powered by Azure OpenAI models.",
    temperature=0.7,
    top_p=0.9
)
```

### Cognitive Services Integration

Azure AI Foundry integrates with multiple Cognitive Services:

- **Azure AI Content Safety**: Detects unsafe content in text and images
- **Speech Services**: Text-to-speech and speech-to-text capabilities
- **Vision Services**: Image analysis and computer vision
- **Language Services**: Natural language processing
- **Document Intelligence**: Document processing and extraction

### Model Support

The platform supports an extensive model catalog including:

- **Azure OpenAI**: GPT-4o, GPT-4, GPT-3.5, DALL·E
- **Meta**: Llama 3 series
- **Mistral**: Various models including Mistral Large
- **xAI**: Grok models
- **Open Source**: 1,600+ models from various providers

## Agent Orchestration and Workflows

### Orchestration Patterns

**Sequential Orchestration:**
Used for linear, dependent processes like document approval workflows:

```
Input → Agent 1 → Agent 2 → Agent 3 → Result
```

**Concurrent Orchestration:**
For parallel analysis requiring diverse perspectives:

```
Input → [Agent 1, Agent 2, Agent 3] → Aggregated Result
```

**Group Chat Orchestration:**
Collaborative decision-making with multiple agents participating in shared conversation threads.

**Handoff Orchestration:**
Dynamic routing based on emerging requirements with intelligent task delegation.

### Connected Agents Implementation

```python
# Create specialized agents
research_agent = project_client.agents.create_agent(
    model="gpt-4o",
    name="research-agent",
    instructions="You specialize in researching topics thoroughly."
)

analysis_agent = project_client.agents.create_agent(
    model="gpt-4o",
    name="analysis-agent",
    instructions="You analyze research findings and provide insights."
)

# Main orchestrator agent with connected agents as tools
from azure.ai.agents.models import ConnectedAgentTool

connected_tools = [
    ConnectedAgentTool(
        id=research_agent.id,
        name="research_specialist",
        description="Conducts detailed research on topics"
    ),
    ConnectedAgentTool(
        id=analysis_agent.id,
        name="analysis_specialist",
        description="Analyzes research and provides insights"
    )
]

orchestrator = project_client.agents.create_agent(
    model="gpt-4o",
    name="orchestrator",
    instructions="Coordinate research and analysis tasks using specialized agents.",
    tools=connected_tools
)
```

## Working with Prompts and Agent Instructions

### Prompt Engineering Best Practices

**System Instructions Structure:**

```python
instructions = """
**Objective**: [Clear statement of the agent's primary purpose]

**Capabilities**:
- [Specific capability 1 with context]
- [Specific capability 2 with context]

**Instructions**:
1. [Specific behavioral instruction]
2. [Interaction guidelines]
3. [Output format requirements]

**Constraints**:
- [Limitations and boundaries]
- [Security and compliance requirements]
"""
```

### Instruction Optimization Techniques

- **Progressive Refinement**: Start with basic instructions and refine based on performance
- **Domain-Specific Prompts**: Customize with specialized vocabulary and context
- **Behavioral Encoding**: Use real interaction data to improve instructions
- **Context Awareness**: Include relevant history and user preferences

## Using Agents with Different Models and Endpoints

### Model Configuration

```python
# Configure different models for different agents
lightweight_agent = project_client.agents.create_agent(
    model="gpt-4o-mini",  # Fast, cost-effective
    name="quick-response-agent"
)

powerful_agent = project_client.agents.create_agent(
    model="gpt-4",  # More capable but slower
    name="complex-reasoning-agent"
)

custom_model_agent = project_client.agents.create_agent(
    model="llama-3-70b",  # Open source model
    name="open-source-agent"
)
```

### Endpoint Management

**Deployment Options:**

- **Regional Deployments**: Single region processing for low latency
- **Global Standard**: Dynamic routing across data centers for resilience
- **Provisioned Throughput (PTU)**: Dedicated capacity for predictable performance

## Agent Tools and Function Calling

### Custom Function Implementation

```python
from azure.ai.agents.models import FunctionTool

def calculate_loan_payment(principal: float, rate: float, years: int) -> dict:
    """Calculate monthly loan payment."""
    monthly_rate = rate / 12 / 100
    months = years * 12
    payment = principal * (monthly_rate * (1 + monthly_rate)**months) / \
              ((1 + monthly_rate)**months - 1)
    return {"monthly_payment": round(payment, 2), "total_payment": round(payment * months, 2)}

# Create function tool
functions = FunctionTool(functions={calculate_loan_payment})

# Create agent with custom function
agent = project_client.agents.create_agent(
    model="gpt-4o",
    name="loan-calculator",
    instructions="Help users calculate loan payments using the provided function.",
    tools=functions.definitions
)
```

### Azure Functions Integration

```python
from azure.ai.agents.models import AzureFunctionTool

azure_function_tool = AzureFunctionTool(
    name="data_processor",
    description="Process large datasets",
    function_app_name="my-function-app",
    function_name="ProcessData",
    authentication={"type": "system_assigned_managed_identity"}
)

agent = project_client.agents.create_agent(
    model="gpt-4o",
    name="data-agent",
    instructions="Process data using Azure Functions.",
    tools=[azure_function_tool]
)
```

## Memory and Context Management

### Thread-Based Memory Architecture

Threads serve as conversation sessions that store messages (max 100,000 per thread) and handle automatic truncation when approaching model context limits:

```python
# Create persistent thread for user session
thread = project_client.agents.threads.create()

# Store thread ID for session persistence
user_threads[user_id] = thread.id

# Retrieve thread for continuing conversation
existing_thread_id = user_threads.get(user_id)
if existing_thread_id:
    # Continue existing conversation
    project_client.agents.messages.create(
        thread_id=existing_thread_id,
        role="user",
        content="Follow-up question"
    )
```

### Context Window Management

The platform automatically handles context window constraints through intelligent truncation, compression of older conversation segments, and prioritization of recent and relevant context. For advanced scenarios, you can implement custom context optimization:

```python
def optimize_context(thread_id, max_tokens=8000):
    messages = project_client.agents.messages.list(thread_id=thread_id, limit=50)

    optimized = []
    token_count = 0

    for message in reversed(messages.data):
        message_tokens = estimate_tokens(message.content)
        if token_count + message_tokens <= max_tokens:
            optimized.append(message)
            token_count += message_tokens
        else:
            break

    return list(reversed(optimized))
```

## Multi-Agent Systems and Coordination

### Communication Protocols

**Agent-to-Agent (A2A) Protocol:**
Enables agents from different platforms to coordinate tasks seamlessly with task delegation and result aggregation across distributed systems.

**Model Context Protocol (MCP):**
Open standard for defining tool capabilities and I/O schemas enabling dynamic discovery and invocation of tools at runtime.

### Multi-Agent Implementation

```python
# Create specialized agents
data_agent = project_client.agents.create_agent(
    model="gpt-4o",
    name="data-analyst",
    instructions="Analyze data and generate insights."
)

viz_agent = project_client.agents.create_agent(
    model="gpt-4o",
    name="visualization-specialist",
    instructions="Create data visualizations and charts."
)

report_agent = project_client.agents.create_agent(
    model="gpt-4o",
    name="report-writer",
    instructions="Write comprehensive reports based on analysis."
)

# Orchestrator with connected agents
orchestrator = project_client.agents.create_agent(
    model="gpt-4o",
    name="project-manager",
    instructions="Coordinate data analysis workflow using specialized agents.",
    tools=[
        ConnectedAgentTool(data_agent.id, "analyze_data"),
        ConnectedAgentTool(viz_agent.id, "create_visualization"),
        ConnectedAgentTool(report_agent.id, "write_report")
    ]
)
```

### Coordination Patterns

**Maker-Checker Loop:**

```python
# Maker creates content
maker_response = maker_agent.process(user_input)

# Checker reviews and validates
checker_response = checker_agent.review(maker_response)

# Iterate until approval
while not checker_response.approved:
    maker_response = maker_agent.revise(checker_response.feedback)
    checker_response = checker_agent.review(maker_response)
```

## Code Examples and Implementation Patterns

### Streaming Response Implementation

```python
from azure.ai.agents.models import AgentStreamEvent

# Stream agent responses
thread = project_client.agents.threads.create()
message = project_client.agents.messages.create(
    thread_id=thread.id,
    role="user",
    content="Explain quantum computing"
)

with project_client.agents.runs.stream(
    thread_id=thread.id,
    agent_id=agent.id
) as stream:
    for event_type, event_data, _ in stream:
        if event_type == "thread.message.delta":
            print(event_data.text, end="", flush=True)
        elif event_type == AgentStreamEvent.DONE:
            print("\nStream completed.")
            break
```

### Async/Await Pattern

```python
import asyncio
from azure.ai.agents.aio import AgentsClient

async def process_agent_request(query: str):
    async with AgentsClient(
        endpoint=os.environ["PROJECT_ENDPOINT"],
        credential=DefaultAzureCredential()
    ) as client:

        agent = await client.create_agent(
            model="gpt-4o",
            name="async-agent",
            instructions="You are an async assistant."
        )

        thread = await client.threads.create()

        message = await client.messages.create(
            thread_id=thread.id,
            role="user",
            content=query
        )

        run = await client.runs.create_and_process(
            thread_id=thread.id,
            agent_id=agent.id
        )

        messages = await client.messages.list(thread_id=thread.id)
        return messages.data[0].content

# Run async function
response = asyncio.run(process_agent_request("What is AI?"))
```

### Error Handling Pattern

```python
from azure.core.exceptions import HttpResponseError, ClientAuthenticationError
import time

def robust_agent_operation(max_retries=3):
    for attempt in range(max_retries):
        try:
            return project_client.agents.create_agent(
                model="gpt-4o",
                name="robust-agent",
                instructions="You are a reliable assistant."
            )
        except ClientAuthenticationError:
            print("Authentication failed. Check credentials.")
            raise
        except HttpResponseError as e:
            if e.status_code == 429:  # Rate limit
                wait_time = 2 ** attempt  # Exponential backoff
                print(f"Rate limited. Waiting {wait_time} seconds...")
                time.sleep(wait_time)
            else:
                raise
        except Exception as e:
            print(f"Unexpected error: {e}")
            if attempt == max_retries - 1:
                raise
```

## Best Practices for Agent Development

### Design Principles

**Single Responsibility**: Design agents with focused, well-defined roles rather than creating monolithic agents that try to do everything.

**Composability**: Build agents as composable units that can work together, enabling complex workflows through simple agent combinations.

**Fail-Safe Design**: Implement proper error handling, fallback mechanisms, and human escalation paths for critical decisions.

### Development Workflow

1. **Define Clear Objectives**: Start with specific, measurable goals for each agent
2. **Iterative Refinement**: Begin with simple implementations and progressively enhance
3. **Test Early and Often**: Use built-in evaluators to measure quality and safety
4. **Monitor Performance**: Track token usage, response times, and error rates
5. **Optimize Incrementally**: Focus optimization efforts on bottlenecks identified through monitoring

### Code Organization

```
azure-ai-agent-project/
├── agents/
│   ├── base_agent.py        # Base agent class
│   ├── specialized/          # Domain-specific agents
│   └── orchestrators/        # Multi-agent coordinators
├── tools/
│   ├── custom_functions.py  # Custom function implementations
│   └── connectors/           # External API integrations
├── prompts/
│   ├── templates/            # Reusable prompt templates
│   └── instructions/         # Agent-specific instructions
├── config/
│   └── settings.py           # Configuration management
└── tests/
    ├── unit/                 # Unit tests
    └── integration/          # Integration tests
```

## Testing and Debugging Agents

### Built-in Evaluators

Azure AI Foundry provides comprehensive evaluators for agentic workflows:

**Quality Evaluators:**

- **Intent Resolution**: Measures if agents correctly identify user intent (1-5 scale)
- **Tool Call Accuracy**: Evaluates correctness of function calls (0-1 passing rate)
- **Task Adherence**: Measures adherence to system instructions (1-5 scale)

**Implementation:**

```python
from azure.ai.evaluation import AIAgentConverter, IntentResolutionEvaluator

# Convert agent data for evaluation
converter = AIAgentConverter(project_client)
converted_data = converter.convert(thread_id, run_id)

# Evaluate agent performance
evaluator = IntentResolutionEvaluator(model_config)
result = evaluator(**converted_data)
print(f"Intent resolution score: {result.score}")
```

### Debugging Techniques

**Tracing and Observability:**

```python
# Enable comprehensive tracing
from azure.monitor.opentelemetry import configure_azure_monitor

configure_azure_monitor(
    connection_string=os.environ["APPLICATIONINSIGHTS_CONNECTION_STRING"]
)

# Access thread traces
traces = project_client.agents.get_thread_traces(thread_id)
for trace in traces:
    print(f"Step: {trace.step}, Tool: {trace.tool}, Duration: {trace.duration_ms}ms")
```

## Performance Optimization

### Latency Optimization

**Model Selection**: Choose appropriate models based on requirements - GPT-4o-mini for lowest latency, GPT-4 for complex reasoning.

**Streaming Responses**: Implement streaming for improved perceived latency in user-facing applications.

**Tool Optimization**: Minimize connected knowledge stores and tools, design prompts to guide efficient resource usage.

### Throughput Optimization

**Deployment Strategies:**

- **Pay-as-you-go**: For variable workloads with unpredictable patterns
- **Provisioned Throughput (PTU)**: For consistent high-volume usage
- **Global Deployments**: For geographic distribution and resilience

**Caching Strategies:**

```python
from functools import lru_cache

@lru_cache(maxsize=100)
def cached_agent_response(query_hash):
    return project_client.agents.process_query(query_hash)

# Use semantic similarity for cache keys
def get_cached_response(query):
    query_hash = compute_semantic_hash(query)
    return cached_agent_response(query_hash)
```

## API References and SDKs

### REST API Endpoints

**Base URL Format:**

```
https://<AIFoundryResourceName>.services.ai.azure.com/api/projects/<ProjectName>
```

**Core Operations:**

- `POST /agents` - Create agent
- `GET /agents/{agent_id}` - Retrieve agent
- `PUT /agents/{agent_id}` - Update agent
- `DELETE /agents/{agent_id}` - Delete agent
- `POST /threads` - Create thread
- `POST /threads/{thread_id}/messages` - Add message
- `POST /threads/{thread_id}/runs` - Execute agent

### SDK Support

**Python SDK:**

```python
from azure.ai.projects import AIProjectClient
from azure.identity import DefaultAzureCredential

client = AIProjectClient(
    endpoint=endpoint,
    credential=DefaultAzureCredential()
)
```

**JavaScript/TypeScript SDK:**

```javascript
import { AgentsClient } from '@azure/ai-agents';
import { DefaultAzureCredential } from '@azure/identity';

const client = new AgentsClient(
  process.env.PROJECT_ENDPOINT,
  new DefaultAzureCredential()
);
```

**.NET SDK:**

```csharp
using Azure.AI.Agents.Persistent;
using Azure.Identity;

var client = new PersistentAgentsClient(
    Environment.GetEnvironmentVariable("PROJECT_ENDPOINT"),
    new DefaultAzureCredential()
);
```

## Common Use Cases and Scenarios

### Customer Service Automation

**Implementation Example:**

```python
# Create customer service agent with knowledge base
customer_agent = project_client.agents.create_agent(
    model="gpt-4o",
    name="customer-service",
    instructions="""You are a customer service representative.
    - Answer product questions using the knowledge base
    - Help with order tracking and returns
    - Escalate complex issues to human agents
    - Be polite and professional""",
    tools=[file_search_tool, order_lookup_function]
)
```

### Data Analysis and Reporting

**Multi-Agent Analysis System:**

```python
# Data collection agent
data_collector = create_agent("Collect data from multiple sources")

# Analysis agent with code interpreter
analyst = create_agent("Analyze data and generate insights",
                      tools=[code_interpreter])

# Visualization agent
visualizer = create_agent("Create charts and visualizations",
                         tools=[code_interpreter])

# Report writer
reporter = create_agent("Write comprehensive reports")

# Orchestrate workflow
orchestrator = create_agent("Coordinate analysis workflow",
                           tools=[connected_agents])
```

### Document Processing Pipeline

```python
# OCR and extraction agent
extractor = create_agent("Extract text from documents",
                        tools=[document_intelligence])

# Classification agent
classifier = create_agent("Classify documents by type")

# Processing agent
processor = create_agent("Process based on document type",
                        tools=[custom_processing_functions])

# Storage agent
storage_agent = create_agent("Store processed documents",
                            tools=[azure_storage_connector])
```

## Troubleshooting Common Issues

### Authentication Errors

**Issue**: "Unauthorized. Access token is missing, invalid, or expired"
**Solution**: Verify RBAC role assignments and ensure proper authentication:

```python
# Check credential chain
from azure.identity import DefaultAzureCredential, AzureCliCredential

try:
    credential = DefaultAzureCredential()
except:
    # Fallback to Azure CLI
    credential = AzureCliCredential()
```

### Rate Limiting

**Issue**: HTTP 429 errors
**Solution**: Implement exponential backoff:

```python
def handle_rate_limit(func, max_retries=5):
    for i in range(max_retries):
        try:
            return func()
        except HttpResponseError as e:
            if e.status_code == 429:
                wait_time = min(2 ** i, 60)
                time.sleep(wait_time)
            else:
                raise
```

### Model Deployment Issues

**Issue**: "DeploymentNotFound (404)"
**Solution**: Verify deployment exists and use correct name:

```python
# List available deployments
deployments = project_client.models.list_deployments()
for deployment in deployments:
    print(f"Name: {deployment.name}, Model: {deployment.model}")
```

### Context Window Limits

**Issue**: Token limit exceeded
**Solution**: Implement context management:

```python
def manage_context(messages, max_tokens=8000):
    # Prioritize recent messages
    if calculate_tokens(messages) > max_tokens:
        # Summarize older messages
        summary = summarize_messages(messages[:-10])
        return [summary] + messages[-10:]
    return messages
```

## Migration and Compatibility

### Hub-Based to Foundry Projects

Azure AI Foundry has transitioned from hub-based projects to unified Foundry projects. Key differences include simplified resource management, access to latest features like Agent Service, and unified SDK support.

**Migration Steps:**

1. Create new Foundry project using existing AI Foundry resource
2. Document existing agent configurations
3. Recreate agents using updated SDK methods
4. Re-upload files and configure vector stores
5. Update code to use latest SDK versions

### OpenAI Compatibility

Azure AI Foundry maintains compatibility with OpenAI's Assistant API while adding enterprise features:

```python
# OpenAI-compatible code works with minimal changes
agent = project_client.agents.create_agent(
    model="gpt-4o",
    name="assistant",
    instructions="You are a helpful assistant.",
    tools=[{"type": "code_interpreter"}],
    temperature=0.7
)
```

## Advanced Topics

### Custom Tool Development

```python
class CustomTool:
    def __init__(self, name, description, function):
        self.name = name
        self.description = description
        self.function = function

    def to_definition(self):
        return {
            "type": "function",
            "function": {
                "name": self.name,
                "description": self.description,
                "parameters": self._extract_parameters()
            }
        }

    def _extract_parameters(self):
        # Extract parameters from function signature
        import inspect
        sig = inspect.signature(self.function)
        params = {
            "type": "object",
            "properties": {},
            "required": []
        }
        for param_name, param in sig.parameters.items():
            if param_name != "self":
                params["properties"][param_name] = {
                    "type": "string",
                    "description": f"Parameter {param_name}"
                }
                if param.default == inspect.Parameter.empty:
                    params["required"].append(param_name)
        return params
```

### Dynamic Agent Creation

```python
def create_dynamic_agent(task_description, available_tools):
    # Generate instructions based on task
    instructions = f"""You are an agent specialized in: {task_description}

    Available tools: {', '.join([t.name for t in available_tools])}

    Use tools efficiently to accomplish tasks."""

    # Select appropriate model based on complexity
    model = "gpt-4o" if "complex" in task_description.lower() else "gpt-4o-mini"

    return project_client.agents.create_agent(
        model=model,
        name=f"dynamic-{task_description[:20]}",
        instructions=instructions,
        tools=[t.to_definition() for t in available_tools]
    )
```

### Performance Monitoring

```python
import time
from dataclasses import dataclass
from typing import Dict, List

@dataclass
class PerformanceMetrics:
    response_time: float
    token_usage: Dict[str, int]
    tool_calls: List[str]
    error_rate: float

class AgentMonitor:
    def __init__(self):
        self.metrics = []

    def track_execution(self, func):
        def wrapper(*args, **kwargs):
            start_time = time.time()
            try:
                result = func(*args, **kwargs)
                response_time = time.time() - start_time

                # Extract metrics from result
                metrics = PerformanceMetrics(
                    response_time=response_time,
                    token_usage=result.usage,
                    tool_calls=result.tool_calls,
                    error_rate=0
                )
                self.metrics.append(metrics)
                return result
            except Exception as e:
                self.metrics.append(PerformanceMetrics(
                    response_time=time.time() - start_time,
                    token_usage={},
                    tool_calls=[],
                    error_rate=1
                ))
                raise
        return wrapper

    def get_summary(self):
        if not self.metrics:
            return {}

        avg_response_time = sum(m.response_time for m in self.metrics) / len(self.metrics)
        total_tokens = sum(m.token_usage.get('total_tokens', 0) for m in self.metrics)
        error_rate = sum(m.error_rate for m in self.metrics) / len(self.metrics)

        return {
            "avg_response_time": avg_response_time,
            "total_tokens": total_tokens,
            "error_rate": error_rate,
            "total_executions": len(self.metrics)
        }
```

## Conclusion

Azure AI Foundry agents provide a comprehensive platform for building enterprise-grade AI applications with sophisticated capabilities. The platform combines the flexibility of modern AI development with enterprise requirements for security, scalability, and governance. Through its extensive SDK support, rich tooling ecosystem, and flexible orchestration patterns, developers can build complex multi-agent systems that solve real-world business problems.

Key strengths include the unified development experience across multiple languages, seamless integration with Azure services, production-ready infrastructure with automatic scaling, and comprehensive monitoring and debugging capabilities. Whether building simple single-agent applications or complex multi-agent orchestrations, Azure AI Foundry provides the tools and patterns necessary for successful implementation.

The platform continues to evolve with new features and capabilities, making it an excellent choice for organizations looking to leverage AI agents for automation, analysis, and intelligent decision-making at scale.
