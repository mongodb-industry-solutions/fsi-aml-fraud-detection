# ThreatSight 360 - Agentic System Overview

This document provides a consolidated view of all AI agent capabilities in ThreatSight 360. For the deep-dive on the investigation pipeline, see [AGENTIC_INVESTIGATION_PIPELINE.md](AGENTIC_INVESTIGATION_PIPELINE.md). For the Copilot architecture, see [COPILOT_ARCHITECTURE.md](COPILOT_ARCHITECTURE.md).

---

## Table of Contents

1. [Agentic System Landscape](#1-agentic-system-landscape)
2. [Investigation Pipeline Node Graph](#2-investigation-pipeline-node-graph)
3. [Human-in-the-Loop Workflow](#3-human-in-the-loop-workflow)
4. [Investigation State Evolution](#4-investigation-state-evolution)
5. [Shared Infrastructure](#5-shared-infrastructure)

---

## 1. Agentic System Landscape

ThreatSight 360 contains two agentic subsystems that share common infrastructure but serve different user workflows.

```mermaid
flowchart TB
    subgraph SharedInfra["Shared Infrastructure"]
        LLM["ChatBedrockConverse<br/>Claude Haiku 4.5 / Sonnet"]
        Saver["MongoDBSaver<br/>Checkpoint Persistence"]
        Store["MongoDBStore<br/>Long-term Memory"]
        RateLimit["Rate Limiter<br/>Sliding Window"]
        Tracing["InvestigationTracingHandler<br/>Structured JSON Logging"]
        Embeddings["AtlasVoyageEmbeddings<br/>voyage-4 via Atlas API"]
    end

    subgraph InvestigationPipeline["Investigation Pipeline"]
        direction TB
        IPDesc["Autonomous SAR Investigation"]
        IPType["LangGraph StateGraph"]
        IPNodes["11 Agent Nodes"]
        IPPatterns["Command routing, Send fan-out,<br/>interrupt_before human review"]
        IPOutput["FinCEN-compliant SAR narrative<br/>+ audit trail"]
    end

    subgraph CopilotAgent["ThreatSight Copilot"]
        direction TB
        CPDesc["Analyst Chat Assistant"]
        CPType["LangGraph create_react_agent"]
        CPTools["15 LangChain Tools"]
        CPPatterns["ReAct loop, artifact streaming,<br/>thread persistence"]
        CPOutput["Analysis + Markdown / Mermaid /<br/>HTML artifacts"]
    end

    subgraph Endpoints["API Endpoints"]
        InvAPI["POST /agents/investigate<br/>POST /agents/investigate/resume<br/>GET /agents/investigations/*<br/>WS /agents/investigations/stream"]
        ChatAPI["POST /agents/chat<br/>WS /agents/alerts/stream"]
    end

    subgraph Frontend["Frontend Components"]
        InvUI["InvestigationsPage<br/>InvestigationLauncher<br/>InvestigationDetail<br/>AgenticPipelineGraph"]
        ChatUI["ChatBubble<br/>ArtifactPanel"]
    end

    InvestigationPipeline --> SharedInfra
    CopilotAgent --> SharedInfra

    InvestigationPipeline --> InvAPI
    CopilotAgent --> ChatAPI

    InvAPI --> InvUI
    ChatAPI --> ChatUI
```

### Side-by-Side Comparison

| Aspect | Investigation Pipeline | ThreatSight Copilot |
|--------|----------------------|---------------------|
| **Architecture** | `StateGraph` (11 nodes) | `create_react_agent` (ReAct loop) |
| **Trigger** | `POST /agents/investigate` | `POST /agents/chat` |
| **LLM** | Claude Haiku 4.5 (default) | Claude Haiku 4.5 (default) |
| **State** | `InvestigationState` TypedDict | ReAct agent state |
| **Persistence** | `MongoDBSaver` checkpoints | `MongoDBSaver` checkpoints |
| **Memory** | `MongoDBStore` (cross-investigation) | Thread-scoped |
| **Parallelism** | `Send` API fan-out (data gathering, sub-investigations) | Sequential tool calls |
| **Human-in-loop** | `interrupt_before` at `human_review` node | N/A (conversational) |
| **Output** | SAR narrative + case document | Markdown, Mermaid, HTML artifacts |
| **Streaming** | SSE events per node | SSE tokens + artifact events |
| **Rate Limit** | `RATE_LIMIT_INVESTIGATE` (10/60s) | `RATE_LIMIT_CHAT` (30/60s) |
| **Tools** | Node-internal MongoDB queries | 15 `@tool`-decorated functions |

---

## 2. Investigation Pipeline Node Graph

Detailed view of the LangGraph `StateGraph` with LangGraph primitives annotated.

```mermaid
flowchart TD
    Start(["START<br/>alert_data input"]) --> Triage

    subgraph TriagePhase["Phase 1: Triage"]
        Triage["triage_node<br/>LLM → TriageDecision<br/>with_structured_output"]
    end

    Triage -->|"Command: auto_close<br/>risk < 25, no watchlist"| AutoClose["auto_close_node"]
    Triage -->|"Command: data_gathering<br/>risk >= 25"| DGDispatch

    subgraph GatherPhase["Phase 2: Data Gathering (Send fan-out)"]
        DGDispatch["data_gathering_dispatch<br/>Emits 4 Send commands"]
        FetchEntity["fetch_entity_profile"]
        FetchTxn["fetch_transactions"]
        FetchNetwork["fetch_network"]
        FetchWatchlist["fetch_watchlist"]
        Assemble["assemble_case<br/>Merges gathered_data"]

        DGDispatch -->|"Send"| FetchEntity
        DGDispatch -->|"Send"| FetchTxn
        DGDispatch -->|"Send"| FetchNetwork
        DGDispatch -->|"Send"| FetchWatchlist
        FetchEntity --> Assemble
        FetchTxn --> Assemble
        FetchNetwork --> Assemble
        FetchWatchlist --> Assemble
    end

    subgraph AnalysisPhase["Phase 3: Case Assembly"]
        CaseAnalyst["case_analyst_node<br/>LLM → CaseFile + TypologyResult"]
    end

    Assemble --> CaseAnalyst

    subgraph ParallelAnalysis["Phase 4: Parallel Analysis"]
        NetworkAnalyst["network_analyst_node<br/>$graphLookup + aggregation<br/>→ NetworkRiskProfile"]
        TemporalAnalyst["temporal_analyst_node<br/>MongoDB aggregation<br/>→ TemporalAnalysis"]
    end

    CaseAnalyst --> NetworkAnalyst
    CaseAnalyst --> TemporalAnalyst

    subgraph TrailPhase["Phase 5: Trail Following"]
        TrailFollower["trail_follower_node<br/>$graphLookup + conditional LLM<br/>→ TrailAnalysis (leads)"]
    end

    NetworkAnalyst --> TrailFollower
    TemporalAnalyst --> TrailFollower

    subgraph SubInvPhase["Phase 6: Sub-Investigations (Send fan-out)"]
        SubDispatch["sub_investigation_dispatch"]
        MiniInv1["mini_investigate (lead 1)"]
        MiniInv2["mini_investigate (lead 2)"]
        MiniInvN["mini_investigate (lead N)"]
        SubAssemble["assemble_sub_investigations"]

        SubDispatch -->|"Send per lead"| MiniInv1
        SubDispatch -->|"Send per lead"| MiniInv2
        SubDispatch -->|"Send per lead"| MiniInvN
        MiniInv1 --> SubAssemble
        MiniInv2 --> SubAssemble
        MiniInvN --> SubAssemble
    end

    TrailFollower --> SubDispatch

    subgraph NarrativePhase["Phase 7: SAR Narrative"]
        SARAuthor["narrative_node<br/>LLM → SARNarrative<br/>who/what/when/where/why/how"]
    end

    SubAssemble --> SARAuthor

    subgraph ValidationPhase["Phase 8: Compliance QA (evaluator-optimizer loop)"]
        Validator["validator_node<br/>LLM → ValidationResult<br/>MAX_LOOPS = 2"]
    end

    SARAuthor --> Validator

    Validator -->|"Command: data_gathering<br/>Missing evidence"| DGDispatch
    Validator -->|"Command: narrative<br/>Quality issues"| SARAuthor
    Validator -->|"Command: human_review<br/>Passed / max loops"| HumanReview

    subgraph ReviewPhase["Phase 9: Human Review"]
        HumanReview["human_review_node<br/>interrupt_before pause"]
    end

    subgraph FinalPhase["Phase 10: Finalize"]
        Finalize["finalize_node<br/>Persist to MongoDB<br/>investigations collection"]
    end

    HumanReview -->|"Resume with<br/>analyst decision"| Finalize
    AutoClose --> Finalize
    Finalize --> EndNode(["END"])
```

### LangGraph Primitives Used

| Primitive | Where Used | Purpose |
|-----------|-----------|---------|
| `Command(goto=...)` | Triage, Validator | Dynamic routing based on LLM decisions |
| `Send(node, state)` | Data Gathering Dispatch, Sub-Investigation Dispatch | Parallel fan-out to worker nodes |
| `interrupt_before` | `human_review` node (compile-time) | Durable pause for analyst review |
| `MongoDBSaver` | Graph compilation | Checkpoint persistence across all nodes |
| `MongoDBStore` | Graph compilation | Cross-investigation memory (optional) |
| `with_structured_output` | All LLM-calling nodes | Pydantic-typed LLM responses |

---

## 3. Human-in-the-Loop Workflow

Sequence diagram showing the full lifecycle of a human review interaction.

```mermaid
sequenceDiagram
    participant Analyst as Analyst (Browser)
    participant Frontend as Next.js Frontend
    participant Proxy as /api/aml Proxy
    participant Backend as FastAPI Backend
    participant Graph as LangGraph StateGraph
    participant Saver as MongoDBSaver
    participant DB as MongoDB Atlas

    Analyst->>Frontend: Click "Launch Investigation"
    Frontend->>Proxy: POST /agents/investigate (SSE)
    Proxy->>Backend: Forward request
    Backend->>Graph: graph.astream(alert_data, config)

    loop Each node execution
        Graph->>Saver: Save checkpoint
        Saver->>DB: Write to checkpoints collection
        Graph-->>Backend: Yield node event
        Backend-->>Frontend: SSE event (node_start / node_complete)
        Frontend-->>Analyst: Update pipeline graph + progress
    end

    Note over Graph: Reaches human_review node
    Graph->>Saver: Save checkpoint (interrupted)
    Graph-->>Backend: SSE event (human_review_required)
    Backend-->>Frontend: SSE event with case summary
    Frontend-->>Analyst: Show review panel (approve/reject/request changes)

    Note over Analyst: Hours or days may pass

    Analyst->>Frontend: Click "Approve" with comments
    Frontend->>Proxy: POST /agents/investigate/resume
    Proxy->>Backend: Forward with decision payload
    Backend->>Graph: graph.update_state(config, decision, as_node="human_review")
    Backend->>Graph: graph.astream(None, config)

    Note over Graph: Resumes from checkpoint
    Graph->>Graph: finalize_node
    Graph->>DB: Insert investigation document
    Graph-->>Backend: SSE event (investigation_complete)
    Backend-->>Frontend: SSE final event
    Frontend-->>Analyst: Show completed investigation
```

### Key Properties

- **Durability**: The `interrupt_before` mechanism uses `MongoDBSaver` checkpoints, so the investigation state survives backend restarts
- **Asynchronous**: The analyst can review and resume hours or days later
- **State Injection**: Resume uses `graph.update_state()` to inject the analyst's decision into the graph state as if `human_review` node produced it
- **Audit Trail**: The decision is appended to the `audit_trail` state key via the `_append_only` reducer

---

## 4. Investigation State Evolution

How the `InvestigationState` TypedDict evolves as it passes through each pipeline node.

```mermaid
sequenceDiagram
    participant S as InvestigationState

    Note over S: Initial State
    Note right of S: alert_data, config

    rect rgb(200, 220, 255)
        Note over S: triage_node
        S->>S: + triage_decision (TriageDecision)
        S->>S: + audit_trail entry
    end

    rect rgb(220, 200, 255)
        Note over S: data_gathering (fan-out)
        S->>S: + gathered_data.entity_profile
        S->>S: + gathered_data.transactions
        S->>S: + gathered_data.network
        S->>S: + gathered_data.watchlist
        Note right of S: _merge_dicts reducer combines parallel results
    end

    rect rgb(200, 240, 200)
        Note over S: case_analyst_node
        S->>S: + case_file (CaseFile)
        S->>S: + typology_result (TypologyResult)
        S->>S: + audit_trail entry
    end

    rect rgb(255, 230, 200)
        Note over S: network_analyst + temporal_analyst (parallel)
        S->>S: + network_analysis (NetworkRiskProfile)
        S->>S: + temporal_analysis (TemporalAnalysis)
    end

    rect rgb(200, 230, 255)
        Note over S: trail_follower_node
        S->>S: + trail_analysis (TrailAnalysis with leads)
    end

    rect rgb(220, 200, 255)
        Note over S: sub_investigation (fan-out)
        S->>S: + sub_investigations (list of findings)
        Note right of S: _merge_dicts reducer merges parallel mini-investigations
    end

    rect rgb(200, 255, 200)
        Note over S: narrative_node
        S->>S: + narrative (SARNarrative)
    end

    rect rgb(255, 255, 200)
        Note over S: validator_node
        S->>S: + validation (ValidationResult)
        S->>S: + validation_loops += 1
        Note right of S: May loop back to data_gathering or narrative
    end

    rect rgb(255, 200, 200)
        Note over S: human_review_node
        S->>S: + human_review (analyst decision)
        Note right of S: interrupt_before pauses here
    end

    rect rgb(200, 240, 200)
        Note over S: finalize_node
        S->>S: Persists complete state to investigations collection
    end
```

### State Keys Reference

| Key | Type | Set By | Reducer |
|-----|------|--------|---------|
| `alert_data` | dict | Input | Default (overwrite) |
| `triage_decision` | TriageDecision | triage_node | Default |
| `gathered_data` | dict | data_gathering workers | `_merge_dicts` |
| `case_file` | CaseFile | case_analyst_node | Default |
| `typology_result` | TypologyResult | case_analyst_node | Default |
| `network_analysis` | NetworkRiskProfile | network_analyst_node | Default |
| `temporal_analysis` | TemporalAnalysis | temporal_analyst_node | Default |
| `trail_analysis` | TrailAnalysis | trail_follower_node | Default |
| `sub_investigations` | list[dict] | sub_investigation workers | `_merge_dicts` |
| `narrative` | SARNarrative | narrative_node | Default |
| `validation` | ValidationResult | validator_node | Default |
| `validation_loops` | int | validator_node | Default |
| `human_review` | dict | human_review_node | Default |
| `audit_trail` | list[dict] | All LLM nodes | `_append_only` |

---

## 5. Shared Infrastructure

### LLM Configuration

```
services/agents/llm.py
├── get_llm()          → ChatBedrockConverse singleton
├── get_model_id()     → Model ARN string for audit logging
└── invoke_with_retry()→ tenacity retry (3 attempts, exponential backoff)
```

- **Default model**: Claude Haiku 4.5 via AWS Bedrock inference profile
- **Override**: Set `LLM_MODEL_ARN` environment variable to use a different model
- **Retry**: 3 attempts with exponential backoff on transient failures

### Checkpoint Persistence

Both agents use `MongoDBSaver` from `langgraph-checkpoint-mongodb`:
- Stores checkpoint data in the application database (same `MONGODB_URI` / `DB_NAME`)
- Creates `checkpoints` and `checkpoint_writes` collections automatically
- Thread isolation via `thread_id` in the LangGraph config

### Rate Limiting

```
services/agents/rate_limit.py
├── Sliding-window in-memory rate limiter
├── RATE_LIMIT_INVESTIGATE = 10 requests / 60s
└── RATE_LIMIT_CHAT = 30 requests / 60s
```

Applied via FastAPI `Depends()` on the `/agents/investigate` and `/agents/chat` endpoints.

### Tracing

```
services/agents/tracing.py
└── InvestigationTracingHandler (BaseCallbackHandler)
    ├── on_llm_start / on_llm_end
    ├── on_tool_start / on_tool_end
    └── Structured JSON logging of all LLM/tool interactions
```

Wired via `config["callbacks"]` at graph invocation time.
