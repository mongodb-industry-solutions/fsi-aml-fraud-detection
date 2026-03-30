# ThreatSight 360 - Solution Architecture

This document provides comprehensive architecture diagrams for the ThreatSight 360 platform in mermaid format. These diagrams complement the static PNG architecture images in the root README (`Sol Arch 1.png`, `Sol Arch 2.png`) with expanded coverage of the agentic pipeline, Copilot, deployment topology, and frontend architecture.

---

## Table of Contents

1. [High-Level Solution Architecture](#1-high-level-solution-architecture)
2. [Fraud Detection Data Flow](#2-fraud-detection-data-flow)
3. [AML/Entity Resolution Data Flow](#3-amlentity-resolution-data-flow)
4. [MongoDB Data Architecture](#4-mongodb-data-architecture)
5. [Deployment Architecture](#5-deployment-architecture)
6. [Frontend Architecture](#6-frontend-architecture)

---

## 1. High-Level Solution Architecture

Complete system overview showing all three services, external dependencies, and MongoDB's six distinct roles.

```mermaid
flowchart TB
    subgraph Browser["Browser Client"]
        UI["Next.js Frontend<br/>:3000"]
    end

    subgraph NextProxy["Next.js API Proxy Layer"]
        AMLProxy["/api/aml/* proxy"]
        FraudProxy["/api/fraud/* proxy"]
    end

    subgraph FraudBackend["Fraud Backend :8000"]
        FraudAPI["FastAPI App"]
        subgraph FraudServices["Services"]
            FraudDetection["Fraud Detection<br/>Engine"]
            RiskModel["Risk Model<br/>Engine"]
        end
        subgraph FraudRoutes["Routes"]
            CustRoutes["/customers"]
            TxnRoutes["/transactions"]
            PatternRoutes["/fraud-patterns"]
            ModelRoutes["/models"]
        end
    end

    subgraph AMLBackend["AML Backend :8001"]
        AMLAPI["FastAPI App"]
        subgraph AMLServices["Services"]
            EntityRes["Entity Resolution"]
            SearchSvc["Search Services<br/>Atlas / Vector / Hybrid"]
            NetworkSvc["Network Analysis<br/>$graphLookup"]
            LLMSvc["LLM Classification"]
            AgentPipeline["LangGraph<br/>Investigation Pipeline"]
            CopilotAgent["ReAct Copilot<br/>15 Tools"]
        end
        subgraph AMLRoutes["Routes"]
            EntityRoutes["/entities"]
            SearchRoutes["/search/*"]
            NetworkRoutes["/network"]
            AgentRoutes["/agents"]
            LLMRoutes["/llm/*"]
            PDFRoutes["/pdf"]
        end
    end

    subgraph MongoAtlas["MongoDB Atlas"]
        subgraph SixRoles["Six Platform Roles"]
            OpData["1. Operational Data<br/>entities, customers,<br/>transactions, relationships"]
            VectorSearch["2. Vector Search<br/>fraud_patterns,<br/>entity embeddings"]
            GraphTraversal["3. Graph Traversal<br/>$graphLookup on<br/>relationships"]
            StatePersistence["4. State Persistence<br/>MongoDBSaver<br/>checkpoints"]
            LongTermMem["5. Long-term Memory<br/>MongoDBStore<br/>memory_store"]
            CaseRepo["6. Case Repository<br/>investigations, alerts"]
        end
    end

    subgraph AWSBedrock["AWS Bedrock"]
        Claude["Claude Haiku 4.5 /<br/>Sonnet (LLM)"]
        Titan["Amazon Titan<br/>Embeddings"]
    end

    subgraph AtlasEmbedding["Atlas Embedding API"]
        Voyage["Voyage AI<br/>voyage-4"]
    end

    UI -->|"HTTP/SSE"| AMLProxy
    UI -->|"HTTP/WS"| FraudProxy
    UI -.->|"WebSocket"| AMLBackend
    UI -.->|"WebSocket"| FraudBackend
    AMLProxy --> AMLAPI
    FraudProxy --> FraudAPI

    FraudAPI --> FraudServices
    FraudServices --> MongoAtlas
    FraudDetection --> Titan

    AMLAPI --> AMLServices
    AMLServices --> MongoAtlas
    AgentPipeline --> Claude
    AgentPipeline --> Voyage
    CopilotAgent --> Claude
    LLMSvc --> Claude
    EntityRes --> Voyage
```

---

## 2. Fraud Detection Data Flow

Expanded view of the fraud detection flow, complementing `Sol Arch 1.png`. Includes Change Stream integration for real-time risk model updates.

```mermaid
flowchart LR
    subgraph Frontend["Frontend :3000"]
        TxnSim["Transaction<br/>Simulator"]
        ModelAdmin["Risk Model<br/>Admin Panel"]
    end

    subgraph FraudBackend["Fraud Backend :8000"]
        subgraph TxnFlow["Transaction Processing"]
            EvalEndpoint["POST /transactions<br/>/evaluate"]
            FraudEngine["FraudDetectionService"]
            RuleEngine["Rule-based<br/>Risk Scoring"]
            VectorMatch["Vector Search<br/>Pattern Matching"]
            EmbedGen["Embedding<br/>Generation"]
        end
        subgraph ModelFlow["Risk Model Management"]
            ModelCRUD["Model CRUD<br/>API /models"]
            ChangeStreamWS["WebSocket<br/>Change Stream"]
        end
    end

    subgraph MongoDB["MongoDB Atlas"]
        Customers["customers<br/>collection"]
        Transactions["transactions<br/>collection"]
        FraudPatterns["fraud_patterns<br/>collection"]
        RiskModels["risk models<br/>documents"]
    end

    subgraph Bedrock["AWS Bedrock"]
        TitanEmbed["Amazon Titan<br/>Embeddings (1536d)"]
    end

    TxnSim -->|"1. Submit txn"| EvalEndpoint
    EvalEndpoint -->|"2. Lookup profile"| Customers
    EvalEndpoint --> FraudEngine
    FraudEngine --> RuleEngine
    FraudEngine --> VectorMatch
    FraudEngine -->|"3. Generate embedding"| EmbedGen
    EmbedGen --> TitanEmbed
    VectorMatch -->|"4. $vectorSearch"| FraudPatterns
    VectorMatch -->|"5. $vectorSearch"| Transactions
    RuleEngine -->|"6. Apply active model"| RiskModels
    FraudEngine -->|"7. Return risk score"| TxnSim

    ModelAdmin -->|"CRUD"| ModelCRUD
    ModelCRUD --> RiskModels
    RiskModels -.->|"Change Stream"| ChangeStreamWS
    ChangeStreamWS -.->|"WebSocket push"| ModelAdmin
```

### Key Data Flow Steps

1. **Transaction Submission**: User submits a transaction from the simulator
2. **Customer Lookup**: FraudDetectionService retrieves the customer's 360 profile
3. **Embedding Generation**: Transaction text is embedded via Amazon Titan (1536 dimensions)
4. **Pattern Matching**: `$vectorSearch` finds similar fraud patterns and historical transactions
5. **Historical Context**: Similar past transactions provide contextual risk signals
6. **Risk Scoring**: Active risk model weights are applied to compute the final score
7. **Result**: Comprehensive risk assessment returned to the frontend

---

## 3. AML/Entity Resolution Data Flow

Expanded view of the AML flow, complementing `Sol Arch 2.png`. Includes the enhanced resolution workflow with $rankFusion and the agentic investigation pipeline entry point.

```mermaid
flowchart TD
    subgraph Frontend["Frontend :3000"]
        EntityDash["Entity<br/>Dashboard"]
        EnhancedRes["Enhanced Entity<br/>Resolution"]
        InvDash["Investigations<br/>Dashboard"]
    end

    subgraph AMLBackend["AML Backend :8001"]
        subgraph ResolutionFlow["Entity Resolution Engine"]
            OnboardForm["Onboarding<br/>Input"]
            AtlasSearch["Atlas Search<br/>Fuzzy Matching"]
            VectorSearch["Vector Search<br/>Semantic Similarity"]
            HybridSearch["Hybrid Search<br/>$rankFusion"]
            NetworkAnalysis["Network Analysis<br/>$graphLookup (depth 2)"]
            TxnNetwork["Transaction Network<br/>$graphLookup (depth 1)"]
            LLMClassify["LLM Classification<br/>Claude Sonnet"]
            CaseGen["Case Generation<br/>+ PDF Export"]
        end

        subgraph AgenticEntry["Agentic Pipeline"]
            InvestigateAPI["POST /agents<br/>/investigate"]
            LangGraphPipeline["LangGraph<br/>StateGraph"]
        end

        subgraph SearchServices["Search Services"]
            UnifiedSearch["Unified Search"]
            FacetedSearch["Faceted Filtering"]
            AutocompleteSearch["Autocomplete"]
        end
    end

    subgraph MongoDB["MongoDB Atlas"]
        Entities["entities"]
        Relationships["relationships"]
        TransactionsV2["transactionsv2"]
        Investigations["investigations"]
    end

    subgraph Bedrock["AWS Bedrock"]
        ClaudeLLM["Claude Sonnet"]
        VoyageEmbed["Voyage AI<br/>Embeddings"]
    end

    EnhancedRes -->|"Step 0: Input"| OnboardForm
    OnboardForm -->|"Step 1: Parallel Search"| AtlasSearch
    OnboardForm --> VectorSearch
    OnboardForm --> HybridSearch
    AtlasSearch --> Entities
    VectorSearch --> VoyageEmbed
    VectorSearch --> Entities
    HybridSearch -->|"$rankFusion"| Entities

    HybridSearch -->|"Step 2: Top 3 matches"| NetworkAnalysis
    HybridSearch --> TxnNetwork
    NetworkAnalysis -->|"$graphLookup"| Relationships
    TxnNetwork --> TransactionsV2

    NetworkAnalysis -->|"Step 3: Classify"| LLMClassify
    TxnNetwork --> LLMClassify
    LLMClassify --> ClaudeLLM
    LLMClassify -->|"Step 4: Case"| CaseGen

    EntityDash --> SearchServices
    SearchServices --> Entities

    InvDash -->|"Launch"| InvestigateAPI
    InvestigateAPI --> LangGraphPipeline
    LangGraphPipeline --> MongoDB
    LangGraphPipeline --> ClaudeLLM
```

### Enhanced Resolution Workflow Steps

| Step | Action | MongoDB Features Used |
|------|--------|---------------------|
| 0 | Entity input (name, address, type) | -- |
| 1 | Parallel search (Atlas + Vector + Hybrid) | Atlas Search, Vector Search, `$rankFusion` |
| 2 | Network analysis for top 3 matches | `$graphLookup` on `relationships` and `transactionsv2` |
| 3 | LLM classification | Bedrock Claude Sonnet |
| 4 | Case generation + PDF export | Document insert, ReportLab PDF |

---

## 4. MongoDB Data Architecture

All collections across both backends, their relationships, and index types.

```mermaid
erDiagram
    customers {
        string customer_id PK
        object personal_info
        object device_fingerprints
        object transaction_behavior
        object risk_profile
        GeoJSON usual_locations
    }

    transactions {
        string transaction_id PK
        string customer_id FK
        float amount
        string type
        object risk_assessment
        vector vector_embedding "1536d Titan"
        GeoJSON location
    }

    fraud_patterns {
        string pattern_id PK
        string name
        string description
        vector vector_embedding "1536d Titan"
    }

    entities {
        string entityId PK
        string entityType
        object name
        array addresses
        array identifiers
        object riskAssessment
        object customerInfo
        vector profileEmbedding "Voyage"
    }

    relationships {
        string relationshipId PK
        object source FK
        object target FK
        string type
        string direction
        float strength
        float confidence
        boolean active
    }

    transactionsv2 {
        string transactionId PK
        string entityId FK
        float amount
        string type
        datetime timestamp
    }

    investigations {
        string case_id PK
        string entity_id FK
        string status
        object triage_decision
        object case_file
        object typology_result
        object network_analysis
        object temporal_analysis
        object narrative
        object validation
        object human_review
        array audit_trail
    }

    alerts {
        string alert_id PK
        string entity_id FK
        string typology_hint
        float initial_risk_score
    }

    typology_library {
        string typology_id PK
        string name
        string description
        vector embedding "Voyage"
    }

    compliance_policies {
        string policy_id PK
        string title
        string content
        vector embedding "Voyage"
    }

    checkpoints {
        string thread_id PK
        string checkpoint_id
        object channel_values
        object channel_versions
    }

    memory_store {
        string namespace PK
        string key
        object value
    }

    customers ||--o{ transactions : "has"
    entities ||--o{ relationships : "source/target"
    entities ||--o{ transactionsv2 : "has"
    entities ||--o{ investigations : "investigated"
    entities ||--o{ alerts : "triggers"
    typology_library ||--o{ investigations : "classified_by"
```

### Index Summary

| Collection | Index Name | Type | Purpose |
|------------|-----------|------|---------|
| `transactions` | `transaction_vector_index` | Vector Search | Fraud pattern similarity (1536d, cosine) |
| `fraud_patterns` | `transaction_vector_index` | Vector Search | Pattern embedding search |
| `entities` | `entity_resolution_search` | Atlas Search | Faceted search with autocomplete |
| `entities` | `entity_text_search_index` | Atlas Search | Text matching (name, address, identifiers) |
| `entities` | `entity_vector_search_index` | Vector Search | Semantic entity matching (1536d, cosine) |
| `typology_library` | (vector index) | Vector Search | RAG typology retrieval |
| `compliance_policies` | (vector index) | Vector Search | RAG policy retrieval |
| `relationships` | Standard indexes | B-tree | `source.entityId`, `target.entityId` for `$graphLookup` |
| `customers` | Geospatial + standard | 2dsphere, B-tree | Location-based fraud detection |

---

## 5. Deployment Architecture

Three-service topology with ports, container images, and external dependencies.

```mermaid
flowchart TB
    subgraph Internet["External Services"]
        MongoAtlas["MongoDB Atlas<br/>Cluster (M10+)"]
        AWSBedrock["AWS Bedrock<br/>us-east-1"]
        AtlasEmbed["Atlas Embedding API<br/>ai.mongodb.com"]
    end

    subgraph LocalDev["Local Development"]
        FrontendDev["npm run dev<br/>:3000"]
        FraudDev["uvicorn :8000<br/>--reload"]
        AMLDev["uvicorn :8001<br/>--reload"]
    end

    subgraph DockerCompose["Docker Compose (docker/)"]
        FrontendContainer["threatsight-front<br/>node:20.18.0-alpine<br/>:3000"]
        FraudContainer["threatsight-back<br/>python:3.10-slim-buster<br/>:8000"]
    end

    subgraph StandaloneDocker["Standalone Container"]
        AMLContainer["threatsight-aml<br/>python:3.10-slim-buster<br/>:8001"]
    end

    subgraph KubernetesPod["Kubernetes Pod (environment/*.yaml)"]
        subgraph UnifiedPod["Single Pod - Three Containers"]
            K8sFrontend["Frontend Container<br/>:3000"]
            K8sFraud["Fraud Sidecar<br/>:8000"]
            K8sAML["AML Sidecar<br/>:8001"]
        end
    end

    FrontendDev --> MongoAtlas
    FraudDev --> MongoAtlas
    FraudDev --> AWSBedrock
    AMLDev --> MongoAtlas
    AMLDev --> AWSBedrock
    AMLDev --> AtlasEmbed

    FrontendContainer --> MongoAtlas
    FraudContainer --> MongoAtlas
    FraudContainer --> AWSBedrock

    AMLContainer --> MongoAtlas
    AMLContainer --> AWSBedrock
    AMLContainer --> AtlasEmbed

    K8sFrontend --> MongoAtlas
    K8sFraud --> MongoAtlas
    K8sFraud --> AWSBedrock
    K8sAML --> MongoAtlas
    K8sAML --> AWSBedrock
    K8sAML --> AtlasEmbed
```

### Deployment Options

| Method | Config File | Services | Notes |
|--------|------------|----------|-------|
| Local Dev | Manual (3 terminals) | All 3 | `--reload` for hot reloading |
| Docker Compose | `docker/docker-compose.yml` | Frontend + Fraud Backend | AML backend requires separate container |
| Standalone Docker | `Dockerfile.aml-backend` | AML Backend only | Requires AWS credentials mount |
| Kubernetes | `environment/*-combined.yaml` | All 3 (unified pod) | Sidecar pattern, all containers share localhost |

---

## 6. Frontend Architecture

Component hierarchy, routing, API clients, and real-time connection patterns.

```mermaid
flowchart TD
    subgraph AppShell["App Shell (layout.js)"]
        UserProvider["UserProvider<br/>Role Context"]
        ClientLayout["ClientLayout<br/>Header + Nav + Card wrapper"]
    end

    subgraph Pages["App Router Pages"]
        Home["/ Home"]
        Entities["/entities<br/>EntityList"]
        EntityDetail["/entities/[id]<br/>EntityDetail"]
        EnhancedRes["/entity-resolution/enhanced<br/>EnhancedEntityResolutionPage"]
        TxnSim["/transaction-simulator<br/>TransactionSimulator"]
        RiskModels["/risk-models<br/>ModelAdminPanel"]
        Investigations["/investigations<br/>InvestigationsPage"]
    end

    subgraph GlobalWidgets["Global Widgets"]
        ChatBubble["ChatBubble<br/>Copilot + ArtifactPanel"]
        UserModal["UserSelectionModal<br/>Role Picker"]
    end

    subgraph APIClients["API Client Libraries (lib/)"]
        AMLAPI["aml-api.js<br/>AML Backend calls"]
        AgentAPI["agent-api.js<br/>SSE + WebSocket"]
        EnhancedAPI["enhanced-entity-<br/>resolution-api.js"]
    end

    subgraph RealTime["Real-time Connections"]
        SSE["SSE Streams<br/>Investigations + Chat + LLM"]
        WSInv["WebSocket<br/>Investigation Change Stream"]
        WSAlert["WebSocket<br/>Alert Change Stream"]
        WSModel["WebSocket<br/>Model Change Stream"]
    end

    subgraph RBAC["Role-Based Access"]
        RiskAnalyst["risk_analyst<br/>Entities, Investigations,<br/>Transaction Simulator"]
        RiskManager["risk_manager<br/>Risk Models"]
    end

    AppShell --> Pages
    AppShell --> GlobalWidgets

    Entities --> AMLAPI
    EntityDetail --> AMLAPI
    EnhancedRes --> EnhancedAPI
    EnhancedRes --> AMLAPI
    TxnSim --> AMLAPI
    RiskModels --> AMLAPI
    Investigations --> AgentAPI
    ChatBubble --> AgentAPI

    AgentAPI --> SSE
    AgentAPI --> WSInv
    AgentAPI --> WSAlert
    RiskModels --> WSModel

    UserProvider --> RBAC
```

### Route-to-API Mapping

| Route | API Client | Backend | Real-time |
|-------|-----------|---------|-----------|
| `/entities` | `aml-api.js` | AML :8001 | -- |
| `/entities/[id]` | `aml-api.js` | AML :8001 | -- |
| `/entity-resolution/enhanced` | `enhanced-entity-resolution-api.js` + `aml-api.js` | AML :8001 | SSE (LLM classification) |
| `/transaction-simulator` | `axios` (direct) | Fraud :8000 + AML :8001 | -- |
| `/risk-models` | `fetch` (direct) | Fraud :8000 | WebSocket (Change Stream) |
| `/investigations` | `agent-api.js` | AML :8001 | SSE + WebSocket |
| ChatBubble (global) | `agent-api.js` | AML :8001 | SSE |

### Key Frontend Technologies

| Technology | Purpose |
|-----------|---------|
| Next.js 15 (App Router) | Framework and routing |
| React 18 | UI rendering |
| MongoDB LeafyGreen UI | Design system components |
| Cytoscape.js | Entity relationship network graphs |
| React Flow (@xyflow/react) | Agentic pipeline visualization |
| Mermaid | Diagram rendering in Copilot artifacts |
| SSE (EventSource) | Streaming agent and chat responses |
| WebSocket | Change Stream monitoring |
