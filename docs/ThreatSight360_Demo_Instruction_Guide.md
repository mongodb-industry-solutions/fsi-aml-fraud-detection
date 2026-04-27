# ThreatSight360 Demo Instruction Guide

## Purpose & Value Proposition

ThreatSight360 demonstrates how MongoDB's Developer Data Platform enables financial institutions to detect and prevent fraud in real-time while adapting quickly to emerging fraud patterns. This demo showcases an end-to-end solution that leverages MongoDB Atlas to help financial organizations reduce fraud losses, minimize false positives, streamline risk model management, and ensure AML/KYC compliance.

The demo illustrates how MongoDB's unified platform eliminates the need for fragmented technologies by combining operational transaction processing, semantic search capabilities, entity resolution, network analysis, flexible schema design, and AI-powered agentic investigation in a single solution.

Beyond detection and compliance, ThreatSight360 introduces an **Agentic Investigation Pipeline** — a fully autonomous, multi-agent system built on LangGraph that conducts end-to-end SAR (Suspicious Activity Report) investigations with durable human-in-the-loop review. A conversational **ThreatSight Copilot** powered by Claude on AWS Bedrock gives analysts natural-language access to entities, transactions, networks, and past investigations — available globally on every page regardless of role.

---

## Product Functionality Overview

ThreatSight360 offers a comprehensive fraud detection, AML compliance, and risk management solution with five modules and a global AI copilot:

1. **Transaction Monitoring with Vector Search:** This module enables real-time fraud detection through a transaction simulation environment. It combines traditional rule-based analysis with advanced vector search capabilities to identify suspicious transactions based on semantic pattern matching rather than just explicit rules. The system maintains comprehensive customer profiles (Customer 360) and evaluates transactions against both known patterns and historical behavior.

2. **Risk Model Management:** This complementary module allows financial institutions to dynamically create, edit, version, reset, and activate risk models. It enables fraud teams to adapt rapidly to emerging fraud patterns by modifying risk factors, weights, and thresholds without requiring technical database changes or downtime.

3. **Entity Management and Resolution:** This advanced module provides AI-powered entity resolution with hybrid search capabilities (Full-text + Vector + $rankFusion), enabling financial institutions to identify related entities, detect duplicate records, and visualize complex relationship and transaction networks (with $graphLookup).

4. **Enhanced Entity Resolution / KYC:** A dedicated onboarding and duplicate-detection workflow that walks through a 5-step pipeline: entity input, parallel search (Atlas Search + Vector Search + $rankFusion hybrid), top-3 network comparison with Cytoscape graph visualization, streaming AI classification via Claude on AWS Bedrock, and full case investigation report generation.

5. **Agentic Investigation Pipeline:** A fully autonomous LangGraph StateGraph (11 logical stages / 17 compiled nodes, counting dispatcher and fan-out worker nodes) that conducts SAR investigations end-to-end — from alert triage through data gathering, network and temporal analysis, sub-investigations, narrative generation, validation, and human-in-the-loop review before finalization. Investigations are persisted with MongoDBSaver checkpoints, surviving backend restarts.

6. **ThreatSight Copilot (Global):** A floating conversational AI assistant available on every page. Powered by a LangGraph ReAct agent with 15 specialized tools, the Copilot lets analysts research entities, trace fund flows, analyze networks, search AML typologies, and query past investigations through natural language. Rich artifacts (Markdown reports, Mermaid diagrams, interactive HTML dashboards) are rendered in a dedicated side panel.

These modules work together (in production systems, not in the demo) to create a closed-loop fraud detection and compliance system: the **Transaction Monitoring** identifies potential fraud, the **Risk Model Management** allows continuous refinement of detection algorithms, the **Entity Management** and **Entity Resolution** ensure accurate identification and tracking of individuals and organizations, the **Agentic Investigation Pipeline** autonomously investigates flagged entities and generates FinCEN-compliant SAR narratives, and the **ThreatSight Copilot** empowers analysts with instant, natural-language access to the full data landscape. All six leverage MongoDB's document model, schema flexibility, real-time capabilities, and native search to provide a comprehensive platform for fraud prevention and AML compliance.

---

## Target Audience

- Financial Services Security Leaders
- Fraud Prevention Teams
- Risk Management Directors
- AML/KYC Compliance Officers
- Investigation & SAR Filing Teams
- Data Science & Machine Learning Teams
- IT Decision Makers in Banking and Financial Services
- FinTech Product Managers

---

## MongoDB Technologies Showcased

- **Atlas Vector Search** - For semantic similarity search across transaction patterns, entity matching, and copilot tool queries
- **Atlas Text Search** - For fuzzy text matching in entity resolution, entity management autocomplete, and investigation search
- **MongoDB $rankFusion** - For hybrid search combining text and vector results with native reciprocal rank fusion score transparency
- **Aggregation Framework** - For complex network analysis, graph operations, investigation analytics ($facet), and risk propagation
- **$graphLookup** - For multi-depth relationship network traversal and entity network analysis without pre-computed graph tables
- **Change Streams** - For real-time notifications and UI updates of risk model changes, investigation progress, and alert ingestion
- **Document Model** - For comprehensive customer 360 profiles, dynamic risk models, entity documents with nested addresses/identifiers, and investigation case documents — all without complex joins
- **Schema Flexibility** - For evolving risk models, entity schemas, and investigation state without migrations or downtime
- **MongoDBSaver** (LangGraph Checkpointer) - For durable persistence of agentic pipeline state and chat thread history, surviving backend restarts
- **MongoDBStore** (LangGraph Memory) - For cross-investigation learning and long-term agent memory
- **$facets** - For investigation analytics: status distribution, typology breakdown, risk score statistics

---

## Role-Based Access

ThreatSight360 uses role-based access control. On first visit, users select a role:

| Role | Accessible Modules |
|------|-------------------|
| **Risk Analyst** | Home, Agentic Investigation, Entity Management, Entity Resolution / KYC, Transaction Simulator |
| **Risk Manager** | Home, Risk Models |

> **Note:** The **ThreatSight Copilot** is a floating global component available on every page regardless of role — it is not gated by `ROUTE_ROLES`. The **Home** page (`/`) is also accessible to all roles.

> **Demo Tip:** Start as a **Risk Analyst** to access the majority of the demo (modules 3-8 below). Switch to **Risk Manager** when demonstrating Risk Model Management (module 4).

---

## Step-by-Step Instructions

### 1. Launch the Application

Navigate to the ThreatSight360 demo URL.

On first visit, a **User Selection Modal** appears. Select your role:
- **Risk Analyst** — for investigation, entity management, entity resolution, and transaction monitoring demos
- **Risk Manager** — for risk model configuration demos

**Talking Points:**

- "Today I'll demonstrate how MongoDB enables financial institutions to detect fraud in real-time, investigate suspicious activity autonomously with AI agents, and adapt to evolving fraud patterns — all on a single unified platform."
- "This solution combines transaction monitoring with advanced vector search, dynamic risk model management, AI-powered entity resolution, an autonomous agentic investigation pipeline, and a conversational copilot for analysts — all powered by MongoDB Atlas."

---

### 2. Overview the Architecture

While the demo loads, take a moment to explain the high-level architecture.

**Module 1 & 2: Transaction Simulator and Risk Model Management**

*(Architecture diagram: User Interface Layer → Application Layer (Fraud Detection Engine, Risk Model Engine) → MongoDB (Customer 360, Transactions, Risk Models collections) with AWS Bedrock for embeddings and Change Streams for real-time updates)*

**Module 3 & 4: Entity Management and Entity Resolution**

*(Architecture diagram: User Interface Layer → Application Layer (Entity Resolution Engine) → MongoDB (Entities, Transactions, Relationships collections) with AWS Bedrock for embeddings, Vector Search, Hybrid Search, Graph Traversal, and Claude for AI Risk Classification)*

**Module 5 & 6: Agentic Investigation Pipeline and ThreatSight Copilot**

The agentic system contains two subsystems sharing common infrastructure:

| Aspect | Investigation Pipeline | ThreatSight Copilot |
|--------|----------------------|---------------------|
| **Architecture** | LangGraph `StateGraph` (11 nodes) | LangGraph `create_react_agent` (ReAct loop) |
| **LLM** | Claude Haiku 4.5 (default) via AWS Bedrock | Claude Haiku 4.5 (default) via AWS Bedrock |
| **Persistence** | MongoDBSaver checkpoints | MongoDBSaver checkpoints |
| **Human-in-Loop** | `interrupt_before` at human_review node | N/A (conversational) |
| **Output** | SAR narrative + case document | Markdown, Mermaid, HTML artifacts |
| **Streaming** | SSE events per pipeline node | SSE tokens + artifact events |
| **Tools** | Node-internal MongoDB queries | 15 `@tool`-decorated functions |

**Talking Points:**

- **Customer Pain Point:** "Financial institutions face growing challenges with sophisticated fraud schemes, complex money laundering networks, and evolving regulatory requirements. Traditional systems often miss connections between entities, struggle to adapt to new patterns, and leave analysts drowning in manual investigation work."
- **MongoDB Advantage:** "MongoDB's flexible document model allows you to store comprehensive customer profiles, transaction histories, entity relationships, risk models, and full investigation case files in a unified platform without complex data integrations or ETL processes. Native vector search, text search, $rankFusion hybrid search, and $graphLookup graph traversal all run inside the same database — no separate Elasticsearch cluster, graph database, or vector store required."

---

### 3. Transaction Simulator with Vector Search

**Module Overview:** The Transaction Simulator module simulates the core functionality of a financial fraud detection system. It processes incoming transactions, evaluates them against multiple risk factors, and produces a comprehensive risk assessment in real-time.

The system stands apart from traditional fraud detection solutions by incorporating vector search technology that can identify semantically similar fraud patterns based on meaning rather than just explicit matches. This capability allows the system to detect novel fraud variants that would bypass conventional rule-based systems.

#### 3.1 Navigate to Transaction Simulator

1. Click on "Transaction Simulator" in the main navigation menu
2. Point out the comprehensive customer profile displayed

**Talking Points:**

- **Technology Highlight:** "Notice how we have a complete customer profile in a single document — including account details, behavioral patterns, device history, and location data. This is MongoDB's document model advantage."
- **Competitive Advantage:** "Unlike relational databases that would require joins across multiple tables, MongoDB provides this entire customer view in one query, improving performance and simplifying application code."

#### 3.2 Demonstrate Customer 360 Profile

1. Select a customer from the dropdown menu (ensure the customers you select demonstrate the strengths of vector search, covered ahead)
2. Point out the comprehensive customer information displayed
3. Highlight the account risk score baseline and behavioral patterns

**Talking Points:**

- "This complete customer view provides the context needed for accurate fraud detection — including historical spending patterns, typical merchants visited, preferred payment methods, and known devices."
- "In traditional systems, assembling this customer profile would require complex joins across many tables with significant performance overhead."

#### 3.3 Run Fraud Detection Scenarios

1. **Normal Transaction:**
   - Select "Normal Transaction" scenario
   - Uses default settings with amount equal to the customer's average, known location and device
   - Evaluate Transaction and show low risk score results (classical rules based risk calculation)
   - Click on the "Vector Search Fraud Assessment" tab to show the vector embedding + search process. The system retrieves the top 15 most similar historical transactions via Atlas Vector Search, with the top 5 surfaced in the UI for visual inspection while all 15 are used in the weighted risk scoring calculation

2. **Amount Anomaly Detection:**
   - Select "Unusual Amount" scenario
   - Point out how the amount automatically increases to unusual level
   - Submit and show elevated risk score

3. **Location Anomaly Detection:**
   - Select "Unusual Location" scenario
   - Toggle "Use Common Location" off
   - Enter coordinates far from customer's usual locations
   - Submit and show elevated risk score

4. **Multiple Risk Factors:**
   - Select "Multiple Red Flags" scenario (10x average amount, random location and random device)
   - Evaluate transaction and show the "Vector Search Fraud Assessment" tab

#### 3.4 Vector Search Scoring Deep Dive (if required!)

After running the Multiple Risk Factors scenario, explain the vector search scoring calculation:

- **Match Distribution Summary** — Shows breakdown of high, medium, and low risk matches from 15 total
- **Step 1: Weight Calculation for Each Match** — `Weight = Similarity x (1 + Risk Flags x 0.1)`
- **Step 2: Calculate Weighted Average** — `Weighted Average = Sum of Contributions / Sum of Weights`

**Talking Points:**

- **Vector Search Process:** "The system converts the current transaction into a 1536-dimensional vector using AWS Bedrock's embedding model. This vector captures the semantic meaning of the transaction details."
- **Similarity Scoring:** "MongoDB Atlas Vector Search uses cosine similarity to find the most similar historical transactions. The similarity scores range from 0 to 1, where 1 indicates identical transactions."
- **Risk Score Calculation:** "The vector search risk score is calculated by:
  - Finding the top 15 most similar transactions from our fraud pattern database
  - Weighting each match by its similarity score (0.67-1.0 range typically)
  - Averaging the risk levels of matched fraudulent transactions
  - Advantages: 'This approach can detect new fraud variants that share semantic similarities with known fraud patterns, even if they don't match exact rules or thresholds.'"

**Note** - for structured transactions data, specific embedding models that are not sentence transformers like text-embedding models, would not perform as well as those specifically trained on structured data. Some examples include TabPFN, SAINT etc.

---

### 4. Risk Model Management

**Module Overview:** The Risk Model Management module complements the Transaction Simulator system by providing a flexible interface for creating, editing, versioning, resetting, and activating the risk models that power fraud detection. This module allows fraud teams to continuously refine their detection algorithms based on emerging fraud patterns and operational feedback without requiring database schema changes or system downtime.

> **Note:** This module requires the **Risk Manager** role. Switch roles via the user profile icon in the top-right corner.

#### 4.1 Access Risk Model Management

1. Click on "Risk Models" in the main navigation
2. Explore the existing models with their status indicators (active, inactive, draft)
3. Show the comprehensive risk model document with multiple risk factors with varying thresholds/weights
4. Point out the WebSocket connection indicator blinking "Live" (Change Streams)
5. Scroll down to see the multiple risk factors in the selected risk model in table form

**Talking Points:**

- **MongoDB Advantage:** "Change Streams provide real-time notifications about data changes without polling. The risk model service automatically updates when a new model version is activated — impossible with traditional SQL databases."

#### 4.2 Demonstrate Schema Flexibility

1. Select a model to edit
2. Click "Edit Model"
3. Add a new risk factor:
   - ID: "change_in_device"
   - Description: "A rapid change in device(s) being used to transact"
   - Threshold: 1.7
   - Active: checked
4. Click "Add Factor"
5. Showcase real-time updates in the change streams panel
6. Scroll down to the Risk Factors table and show the added risk factor

**Talking Points:**

- **Technology Highlight:** "We just added a new risk factor without any database schema migrations or downtime. MongoDB's flexible schema allows us to evolve our models instantly."
- **Competitive Advantage:** "In a traditional SQL database, this would require schema migrations, table alterations, application downtime, and complex update scripts across multiple tables."
- **Business Value:** "This flexibility enables financial institutions to respond to new fraud patterns within minutes instead of days or weeks, dramatically reducing potential losses."

#### 4.3 Version Management and Reset Functionality

1. Edit an active model
2. Show how a new version is automatically created
3. Demonstrate activating different versions
4. Click on "Reset Models" button to restore default risk models, point out the change streams showing the reset operation

**Talking Points:**

- **Reset Capability:** "The reset feature allows teams to quickly revert to baseline configurations if experimental changes cause issues or during system testing."
- **Version Management:** "MongoDB's document model makes version management straightforward — each version is a complete standalone document."
- **Business Value:** "Complete version history with easy rollbacks and reset capabilities provides audit trails critical for regulatory compliance and quick recovery if issues arise."

---

### 5. Entity Management and Resolution

**Module Overview:** The Entity Management and Resolution module provides comprehensive AML/KYC compliance capabilities through AI-powered entity resolution, relationship network analysis, and duplicate detection. This module leverages MongoDB's native $rankFusion to combine text and vector search results, providing unparalleled accuracy in entity matching while maintaining complete transparency of the search process.

> **Note:** Switch back to the **Risk Analyst** role for this module and all remaining modules.

#### 5.1 Navigate to Entity Management

1. Click on "Entities" in the main navigation menu
2. Show the entity list with risk indicators and basic information
3. Point out the search (autocomplete) and filter ($facets) capabilities

#### 5.2 Explore Advanced Filters

The entity list supports advanced faceted filtering:
- Entity Type (Individual / Organization)
- Business Type
- Risk Level (Low / Medium / High)
- Nationality
- Residency
- Jurisdiction

**Talking Points:**

- **MongoDB Advantage:** "These faceted filters use MongoDB's $facet aggregation stage to compute filter counts and results in a single query — no separate facet engine required."

#### 5.3 Navigate to Entity Detail

1. Go to a specific Entity (entities are categorized by demo scenarios like clear duplicate, household member, watchlist match, sanctioned org, complex substructure etc)
2. Show the Entity 360 view with:
   - Basic Information (Entity ID, Type, Status, Demo Scenario, Source System)
   - Risk Score ring gauge with trend indicator
   - Personal Information (name, aliases, name components for search)
   - Addresses (nested documents with verification status)
   - Schema Flexibility callout note
   - MongoDB Document viewer (expandable/fullscreen)

**Talking Points:**

- **Document Model:** "The entity document contains nested addresses, dynamic identifier types, and optional fields — all without rigid table schemas or migrations. New compliance requirement? Add fields immediately without downtime."
- **MongoDB Advantage:** "Arrays of addresses and contacts stored naturally as nested documents. PostgreSQL would require separate tables with foreign keys, making queries complex and slower."

#### 5.4 Similar Profiles (Vector Search)

1. On the Entity Detail page, locate the "Similar Profiles" panel on the left
2. Click "Find Similar Profiles"
3. Show results with cosine similarity percentages
4. Click "View Details" on a similar entity to compare

**Talking Points:**

- **Vector Search:** "This uses MongoDB Atlas Vector Search on pre-computed profile embeddings (1536 dimensions). It finds semantically similar entities — even when names are spelled differently or aliases are used."

#### 5.5 Relationship Network Analysis Tab

1. Navigate to the "Relationship Network Analysis" tab
2. Configure network depth (1-4 degrees of separation) and minimum confidence filter
3. Click "Update Network"
4. Show the interactive Cytoscape.js network graph (layout: hierarchical works best)
5. Point out the Network Legend:
   - Risk Levels: High Risk (60+) red, Medium Risk (40-59) orange, Low Risk (0-39) green
   - Node Types: Central Entity (you), Individual (circle), Organization (square)
   - Relationships: Corporate (blue), High Risk (red)

**Talking Points:**

- **$graphLookup:** "MongoDB's aggregation pipeline rebuilds this network instantly as you adjust depth and confidence filters — no pre-computed graph tables or cache invalidation needed."
- **Competitive Advantage:** "Traditional approaches require a separate graph database (Neo4j, Neptune) synchronized via ETL. With MongoDB's $graphLookup, network analysis lives alongside operational data in the same database."

#### 5.6 Transaction Activity Analysis Tab

1. Navigate to the "Transaction Activity Analysis" tab
2. Show the transaction network graph (layout: circular works best)
3. Point out entity-to-entity transaction flows with color-coded risk edges

---

### 6. Enhanced Entity Resolution / KYC

**Module Overview:** The Enhanced Entity Resolution module provides a dedicated, step-by-step onboarding workflow for intelligent entity matching and risk classification. Unlike the Entity Management module (which manages existing entities), this module simulates the KYC onboarding process — answering the question: "When a new entity is being onboarded, does it already exist in our system, and what risk does it pose?"

This module showcases MongoDB's $rankFusion hybrid search, parallel Atlas + Vector search with full query transparency, $graphLookup network analysis, and streaming AI classification via Claude on AWS Bedrock.

#### 6.1 Navigate to Entity Resolution

1. Click on "Entity Resolution" in the main navigation menu
2. Observe the 5-step workflow indicator at the top

#### 6.2 Enter Entity Information (Step 1)

1. The onboarding form asks for three fields only: **Entity Type**, **Full Name**, and **Address**
2. Below the form, browse the **Demo Scenarios** organized into categories:
   - **Safe** — entities with no matches
   - **Duplicate** — clear duplicate detection scenarios
   - **High Risk** — sanctioned entities, watchlist matches
   - **Complex Corporate** — multi-layered corporate structures
   - **PEP** — Politically Exposed Persons
3. Click a demo scenario card to auto-populate the form
4. Click "Search for Matches"

**Talking Points:**

- **Simplicity:** "The onboarding form only requires searchable fields — name and address. MongoDB's text and vector search can find matches from just these inputs, without requiring structured identifier fields upfront."

#### 6.3 Parallel Search Results (Step 2)

The system executes three search strategies simultaneously:

1. **Atlas Search Tab** — Full-text fuzzy matching on `name.full`, `name.aliases`, `addresses.full`
2. **Vector Search Tab** — AI embedding-based semantic similarity (1536-dimensional vectors)
3. **Hybrid ($rankFusion) Tab** — Combines both using MongoDB's native reciprocal rank fusion

For each result in the Hybrid tab, observe:
- **Hybrid Score** — Combined relevance score
- **Text Contribution %** and **Vector Contribution %** — Transparency into which search method contributed more
- Expandable **Search Query Details** card showing the actual MongoDB aggregation queries executed

**Talking Points:**

- **$rankFusion:** "MongoDB's native $rankFusion combines text and vector search results in a single aggregation query. No external orchestration, no manual score normalization — the database handles it."
- **Query Transparency:** "We expose the exact MongoDB queries to the audience. You can see the compound Atlas Search query with fuzzy matching and the $vectorSearch pipeline side by side."
- **Competitive Advantage:** "Other platforms require separate Elasticsearch clusters for text search and Pinecone/Weaviate for vector search, then custom application logic to merge results. MongoDB does it all natively in one query."

#### 6.4 Top-3 Network Comparison (Step 3)

1. The system automatically takes the top 3 hybrid results and runs parallel network analysis
2. For each entity, a **Cytoscape.js network graph** is rendered showing:
   - Relationship network (depth 2) via `$graphLookup`
   - Transaction network (depth 1)
   - Centrality metrics (betweenness, degree, weighted)
   - Network risk score
3. Side-by-side comparison cards show entity rank, hybrid score, and risk breakdown

**Talking Points:**

- **$graphLookup in Action:** "For each of the top 3 matches, MongoDB traverses the relationship graph in real-time using $graphLookup — no pre-computed graph tables needed."
- **Risk Propagation:** "Network risk isn't just the entity's own score. It factors in connected entities' risk levels, relationship types, and suspicious patterns across the network."

#### 6.5 Streaming AI Classification (Step 4)

1. The system sends entity data, search results, and network analysis to Claude on AWS Bedrock
2. Observe the **streaming classification interface**:
   - **Prompt Visibility** — The exact prompt sent to the LLM is shown
   - **Live Streaming** — LLM response streams token by token
   - **Classification Result** — One of: `SAFE`, `DUPLICATE`, or `RISKY`
3. The classification includes:
   - Risk score and confidence level
   - Detailed risk factors and suspicious indicators
   - Recommended actions

**Talking Points:**

- **Transparency:** "We show the full LLM prompt and stream the response in real-time. No black boxes — the analyst sees exactly how the AI reached its conclusion."
- **MongoDB + AI:** "The AI classification is powered by the rich data MongoDB provides: search results, network analysis, and entity profiles. The LLM adds reasoning on top of MongoDB's data platform."

#### 6.6 Case Investigation Report (Step 5)

1. A comprehensive investigation case is generated with tabs:
   - **Executive Summary** — Case metrics, findings, recommended actions
   - **AI Classification Analysis** — Risk scores, confidence metrics, breakdowns
   - **Search & Network Data** — Hybrid results, relationship analysis
   - **MongoDB Export** — Raw investigation document as JSON
2. Case ID is generated for audit trail

**Talking Points:**

- **Business Value:** "In seconds, we've gone from a name and address to a full risk assessment with network analysis, AI classification, and an auditable case file — all powered by MongoDB."
- **Compliance:** "The exported MongoDB document serves as a complete audit trail for regulatory review."

---

### 7. Agentic Investigation Pipeline

**Module Overview:** The Agentic Investigation Pipeline is a fully autonomous, multi-agent system that conducts SAR (Suspicious Activity Report) investigations end-to-end. Built on **LangGraph** with **Claude Haiku 4.5** on AWS Bedrock, the pipeline processes an alert through 11 logical stages (compiled as 17 nodes — the extra nodes are dispatcher and fan-out worker nodes for data gathering and sub-investigations) — from initial triage through data gathering, network and temporal analysis, sub-investigations, narrative generation, quality validation, and human-in-the-loop review before finalization.

Key LangGraph patterns showcased:
- **`Command(goto=...)`** for dynamic routing (triage decides investigation path)
- **`Send` API** for parallel fan-out (data gathering, sub-investigations)
- **`interrupt_before`** for durable human-in-the-loop pauses
- **`MongoDBSaver`** for checkpoint persistence (state survives backend restarts)
- **Pydantic `with_structured_output()`** for all LLM responses

#### 7.1 Navigate to Investigations

1. Click on "Agentic Investigation" in the main navigation menu
2. Observe the three-panel layout:
   - **Left Sidebar** — Investigation list with status filters (All, Active, Review, Completed, Closed), search, and KPI summary cards
   - **Center Workspace** — Investigation launcher or detail view
   - **Right Panel** — Investigation analytics (when no investigation is selected)

#### 7.2 Investigation Dashboard & Analytics

1. Show the **KPI Summary Cards** at the top of the sidebar:
   - Total investigations count
   - Active (in-progress) count
   - Awaiting Review count
   - Completed count
2. Click the analytics icon to show the **Investigation Analytics** panel:
   - Status distribution breakdown
   - Typology breakdown (what types of AML patterns have been investigated)
   - Risk score statistics (average, min, max)

**Talking Points:**

- **MongoDB Advantage:** "These analytics use MongoDB's $facet aggregation to compute multiple statistical views in a single query — status distribution, typology breakdown, and risk statistics all in one round trip."

#### 7.3 Launch an Investigation (Demo Scenarios)

1. In the Investigation Launcher, browse the **Demo Scenarios** organized by entity type and risk profile
2. Select an entity to investigate (e.g., a sanctioned organization or PEP)
3. Click "Launch Investigation"
4. Observe the **SSE Progress Stream** — real-time events appear as the pipeline executes:
   - `alert_ingested` — Alert created in MongoDB
   - `pipeline_started` — Triage begins
   - `agent_start` / `agent_end` — Each node's execution
   - `tool_start` / `tool_end` — Individual tool invocations within nodes
   - When the pipeline reaches `human_review`, it pauses via LangGraph's `interrupt_before` checkpoint (no dedicated SSE event — the stream simply stops emitting node events and the frontend detects the interrupted state from the checkpoint)

#### 7.4 Pipeline Visualization (11-Node Graph)

1. While the investigation runs, show the **AgenticPipelineGraph** — a ReactFlow visualization of the 11-node pipeline:
   - **Triage** — LLM risk assessment and routing (auto-close low-risk vs. full investigation)
   - **Data Gathering (Fan-out)** — Parallel fetch of entity profile, transactions, network, watchlist data
   - **Case Assembly** — Merge gathered data + AML typology classification
   - **Network Analysis** — $graphLookup relationship traversal and risk propagation
   - **Temporal Analysis** — Structuring detection, velocity spikes, round-trip patterns, dormancy analysis
   - **Trail Following** — LLM selects high-risk leads from network/temporal findings
   - **Sub-Investigations (Fan-out)** — Mini-investigations on selected leads
   - **SAR Narrative** — FinCEN-compliant narrative generation
   - **Validation (Evaluator-Optimizer)** — Quality checks with max 2 revision loops
   - **Human Review** — Durable pause for analyst approval
   - **Finalize** — Persist completed investigation to MongoDB
2. Nodes glow and animate as they execute in real-time
3. Active nodes show a pulsing indicator

**Talking Points:**

- **LangGraph Patterns:** "This pipeline uses LangGraph's `Send` API for parallel fan-out — data gathering fetches entity, transaction, network, and watchlist data concurrently. The `Command` primitive handles dynamic routing at triage and validation."
- **MongoDBSaver:** "The entire pipeline state is checkpointed to MongoDB after every node. If the backend crashes mid-investigation, it resumes exactly where it left off — no data loss, no re-execution."
- **MongoDB Advantage:** "Every tool in the pipeline queries MongoDB directly — entity profiles, transaction history, relationship networks via $graphLookup, watchlist checks. The database is the single source of truth."

#### 7.5 Human-in-the-Loop Review

1. When the pipeline reaches the `human_review` node, it pauses with `interrupt_before`
2. The **Human Review Panel** appears with:
   - Investigation summary and risk score
   - Key findings from the analysis
   - SAR narrative preview
3. The analyst can:
   - **Approve** — Finalize the investigation and persist the case
   - **Reject** — Close the investigation with rejection reason
   - **Request Changes** — Send the investigation back for revision with notes
4. Click "Approve" and observe the pipeline resume and finalize

**Talking Points:**

- **Durable Pause:** "This isn't a timeout or polling mechanism. LangGraph's `interrupt_before` creates a durable checkpoint in MongoDB. The analyst can review hours or days later — the state is preserved."
- **Business Value:** "Autonomous investigation handles 90% of the work, but the human analyst retains final authority. This satisfies regulatory requirements for human oversight while dramatically reducing manual effort."

#### 7.6 Investigation Detail View

1. Click on a completed investigation in the sidebar list
2. The **InvestigationDetail** view shows:
   - **Risk Ring Gauge** — Conic-gradient visualization of the overall risk score
   - **Summary Tab** — Executive summary with key metrics, typology match, and recommended actions
   - **Analysis Tab** — Network analysis findings, temporal anomaly detection results, sub-investigation summaries
   - **Narrative Tab** — Full FinCEN-compliant SAR narrative text
   - **Timeline Tab** — Chronological execution timeline of all pipeline nodes
   - **Evidence Tab** — Raw evidence collected during the investigation

**Talking Points:**

- **Complete Audit Trail:** "Every step of the investigation is recorded — which nodes ran, what data was gathered, what the LLM decided, and why. This is critical for regulatory review and compliance auditing."
- **MongoDB Document Model:** "The entire investigation — case metadata, analysis results, narrative, evidence, timeline — is stored as a single MongoDB document. No joins, no scattered data across tables."

#### 7.7 Change Stream Console

1. At the bottom of the Investigations page, toggle open the **Change Stream Console**
2. Show real-time MongoDB Change Stream events:
   - Investigation inserts (new cases)
   - Investigation updates (status changes, analysis results)
   - Alert ingestion events
3. Events stream via WebSocket with 30-second heartbeat

**Talking Points:**

- **Change Streams:** "MongoDB Change Streams push real-time notifications to the frontend via WebSocket. Multiple analysts can watch the same investigation dashboard and see updates instantly — no polling, no stale data."

---

### 8. ThreatSight Copilot

**Module Overview:** The ThreatSight Copilot is a conversational AI assistant that floats on every page of the application. Powered by a LangGraph `create_react_agent` with Claude Haiku 4.5 on AWS Bedrock, it gives analysts natural-language access to 15 specialized tools spanning entity research, transaction analysis, network traversal, AML typology lookup, and investigation queries.

The Copilot produces rich **artifacts** — Markdown reports, Mermaid flowcharts/diagrams, and interactive HTML dashboards — rendered in a dedicated side panel.

#### 8.1 Open the Copilot

1. Click the floating chat icon in the bottom-right corner of any page
2. The chat panel opens with:
   - Message history (persisted via localStorage + MongoDB checkpoints)
   - Thread management (create new threads, switch between past conversations)
   - Input box with send button
3. Point out that the Copilot is available globally — it can be used on any page

#### 8.2 Entity Research Demo

Try these example prompts:

- **"Tell me about entity PEP4-2161AD6330"** — Triggers `get_entity_profile` tool, returns full entity 360
- **"Search for entities named Harrison"** — Triggers `search_entities` tool with text search
- **"Find entities similar to Nancy Harrison"** — Triggers `find_similar_entities` tool with vector search
- **"Screen entity PEP4-2161AD6330 against watchlists"** — Triggers `screen_watchlists` tool

Observe:
- Tool execution status labels appear while tools run (e.g., "Searching entities...", "Fetching entity profile...")
- Follow-up suggestions appear as clickable buttons after each response

**Talking Points:**

- **15 Tools:** "The Copilot has 15 specialized tools that query MongoDB directly — entity profiles, transaction histories, network analysis via $graphLookup, AML typology lookup, and past investigation search."
- **ReAct Pattern:** "The agent uses a Reasoning + Acting loop. It reads the question, decides which tools to call, executes them, reads the results, and reasons about the answer. You can see the tool calls in real-time."

#### 8.3 Network & Transaction Analysis Demo

Try these prompts:

- **"Analyze the network around entity CDI1A-04FCDCFBA9"** — Triggers `analyze_entity_network` tool ($graphLookup)
- **"Show me the transactions for entity PEP4-2161AD6330"** — Triggers `query_entity_transactions` tool
- **"Trace the flow of funds from entity X over 3 hops"** — Triggers `trace_fund_flow` tool for multi-hop money tracing
- **"Analyze temporal patterns for entity X"** — Triggers `analyze_temporal_patterns` for structuring, velocity, round-trip, and dormancy detection

#### 8.4 Artifact Generation Demo

Ask the Copilot to generate rich artifacts:

- **"Give me a comprehensive risk assessment of entity PEP4-2161AD6330"** — Triggers `assess_entity_risk` tool (combines profile + watchlists + transactions + network), then generates a **Markdown artifact** with structured risk report
- **"Compare entities X and Y"** — Triggers `compare_entities` tool, may generate a comparison table artifact
- **"Create a diagram showing the investigation flow"** — May generate a **Mermaid artifact** with flowchart

When an artifact is generated:
1. The **ArtifactPanel** slides open on the right side
2. Toggle between **Preview** and **Source** views
3. Use **Copy** and **Download** buttons
4. For Mermaid: rendered as SVG diagram
5. For HTML: rendered in a sandboxed iframe with Tailwind CSS styling

**Talking Points:**

- **Rich Output:** "The Copilot doesn't just return text — it can generate structured Markdown reports, Mermaid diagrams, and interactive HTML dashboards. These are rendered in a dedicated panel and can be downloaded or copied."
- **MongoDB as the Foundation:** "Every artifact is built on data queried from MongoDB in real-time. The LLM doesn't hallucinate numbers — it uses actual entity profiles, transaction data, and network analysis from the database."

#### 8.5 Investigation & Compliance Queries

- **"Search for past investigations on entity X"** — Triggers `search_investigations` tool
- **"What AML typologies involve trade-based laundering?"** — Triggers `search_typologies` tool
- **"Look up the smurfing typology"** — Triggers `lookup_typology` tool
- **"Search compliance policies about PEPs"** — Triggers `search_compliance_policies` tool

#### 8.6 Thread Persistence

1. Start a conversation and close the chat panel
2. Navigate to a different page
3. Reopen the Copilot — the conversation is preserved
4. Show thread history in the sidebar (up to 30 threads stored in localStorage)
5. Create a new thread to start a fresh conversation

**Talking Points:**

- **MongoDBSaver:** "Chat thread state is checkpointed to MongoDB via LangGraph's MongoDBSaver. Even if the backend restarts, the conversation resumes exactly where it left off."
- **Business Value:** "Analysts can start a research thread, leave for a meeting, come back hours later, and continue the investigation conversation. No context is lost."

---

## Appendix A: MongoDB Technologies Quick Reference

| Technology | Where Used | Value |
|-----------|-----------|-------|
| **Atlas Vector Search** | Transaction Simulator (fraud pattern matching), Entity Management (similar profiles), Entity Resolution (semantic matching), Copilot tools | Find semantically similar records without exact text matches |
| **Atlas Text Search** | Entity Management (autocomplete, fuzzy search), Entity Resolution (full-text matching), Copilot (entity/investigation search) | Fast, fuzzy text search with relevance scoring |
| **$rankFusion** | Entity Resolution (hybrid search combining Atlas + Vector) | Native hybrid search in one aggregation — no external orchestration |
| **$graphLookup** | Entity Management (relationship networks), Entity Resolution (top-3 network comparison), Investigation Pipeline (network analysis node), Copilot (network tool) | Multi-depth graph traversal without a separate graph database |
| **$facet** | Entity Management (advanced filters), Investigation Analytics (status/typology/risk breakdowns) | Multiple aggregation views in a single query |
| **Change Streams** | Risk Models (real-time model updates), Investigations (live progress), Alerts (ingestion monitoring) | Push-based real-time notifications without polling |
| **Document Model** | Customer 360, Entity profiles, Risk models, Investigation cases, Chat history | Complex nested data without joins or foreign keys |
| **Schema Flexibility** | Risk Models (add factors on-the-fly), Entities (dynamic identifier types), Investigation state | Evolve schemas without migrations or downtime |
| **MongoDBSaver** | Investigation Pipeline (checkpoint persistence), Copilot (thread history) | Durable LangGraph state — survives backend restarts |
| **MongoDBStore** | Investigation Pipeline (cross-investigation memory) | Long-term learning across separate investigations |
| **Aggregation Framework** | Throughout — risk scoring, network analysis, analytics, centrality metrics | Complex server-side data processing in one round trip |

---

## Appendix B: Environment Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `MONGODB_URI` | *(required)* | MongoDB Atlas connection string |
| `DB_NAME` | `fsi-threatsight360` | Database name |
| `AWS_REGION` | `us-east-1` | AWS region for Bedrock |
| `LLM_MODEL_ARN` | Haiku 4.5 inference profile | Override default LLM model for agents and classification |
| `ATLAS_SEARCH_INDEX` | `entity_resolution_search` | Atlas Search index name |
| `ENTITY_VECTOR_INDEX` | `entity_vector_search_index` | Vector Search index name |
| `RATE_LIMIT_INVESTIGATE` | `10` | Max investigation launches per 60 seconds |
| `RATE_LIMIT_CHAT` | `30` | Max chat messages per 60 seconds |

---

## Appendix C: Demo Scenario Quick Reference

### Transaction Simulator Scenarios
| Scenario | What It Shows |
|----------|--------------|
| Normal Transaction | Low risk score, vector search finds similar low-risk transactions |
| Unusual Amount | Amount anomaly detection, elevated risk score |
| Unusual Location | Geographic anomaly detection, location-based risk |
| New Device | Unknown device fingerprint detection |
| Multiple Red Flags | Combined risk factors, high risk score, rich vector search results |

### Entity Resolution Demo Scenarios
| Category | Examples | What It Shows |
|----------|----------|--------------|
| Safe | Clean individual/organization | No matches, SAFE classification |
| Duplicate | Name variations, alias matches | $rankFusion finds duplicates, DUPLICATE classification |
| High Risk | Sanctioned entities, watchlist hits | Vector search catches semantic matches, RISKY classification |
| Complex Corporate | Multi-layered corporate structures | $graphLookup network traversal, complex substructure analysis |
| PEP | Politically Exposed Persons | PEP screening, enhanced due diligence recommendations |

### Investigation Demo Scenarios
Entities available for investigation are grouped by scenario type (sanctioned org, PEP, complex substructure, etc.) and can be launched directly from the Investigation Launcher.

---

## Appendix D: Copilot Tool Reference

| Category | Tool | Description |
|----------|------|-------------|
| **Entity** | `get_entity_profile` | Full entity 360 lookup |
| | `screen_watchlists` | Check watchlist/sanctions flags |
| | `search_entities` | Text search + risk level filtering |
| | `find_similar_entities` | Vector search on profile embeddings |
| **Transaction** | `query_entity_transactions` | Transaction history with filters |
| | `trace_fund_flow` | Multi-hop money tracing (up to N hops) |
| | `analyze_temporal_patterns` | Structuring, velocity, round-trips, dormancy |
| **Network** | `analyze_entity_network` | $graphLookup network analysis |
| **Policy** | `lookup_typology` | Get AML typology by name |
| | `search_typologies` | Regex search across typology library |
| | `search_compliance_policies` | Regex policy search |
| **Investigation** | `search_investigations` | Find past cases by entity/status |
| | `get_investigation_detail` | Retrieve full case document |
| | `compare_entities` | Side-by-side entity comparison |
| | `assess_entity_risk` | Comprehensive risk dossier |
