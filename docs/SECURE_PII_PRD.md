# SECURE_PII_PRD — PII Protection Product Requirements Document
**ThreatSight 360 · FSI AML Fraud Detection Platform**



| Attribute | Value |
|-----------|-------|
| Status | Draft |
| Owner | Engineering / Security |
| Created | 2026-05-18 |
| Applicable Regulations | GDPR, CCPA, GLBA, FinCEN SAR |

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [System Architecture Overview](#2-system-architecture-overview)
3. [PII Inventory — Collections & Fields](#3-pii-inventory--collections--fields)
4. [PII Usage Map by Component](#4-pii-usage-map-by-component)
   - 4.1 [Frontend (Next.js / React)](#41-frontend-nextjs--react)
   - 4.2 [Backend (Fraud Detection — port 8000)](#42-backend-fraud-detection--port-8000)
   - 4.3 [AML Backend (KYC / Agentic — port 8001)](#43-aml-backend-kyc--agentic--port-8001)
5. [Critical PII Exposure Points](#5-critical-pii-exposure-points)
6. [Risk Matrix](#6-risk-matrix)
7. [Protection Strategy](#7-protection-strategy)
   - 7.1 [MongoDB Queryable Encryption (QE)](#71-mongodb-queryable-encryption-qe)
   - 7.2 [API Response Masking](#72-api-response-masking)
   - 7.3 [LLM Data Minimization](#73-llm-data-minimization)
   - 7.4 [Access Control & RBAC](#74-access-control--rbac)
   - 7.5 [Data Retention & Right-to-Erasure](#75-data-retention--right-to-erasure)
8. [Implementation Plan (Phased, Non-Breaking)](#8-implementation-plan-phased-non-breaking)
9. [Backward-Compatibility Rules](#9-backward-compatibility-rules)
10. [Success Metrics & Acceptance Criteria](#10-success-metrics--acceptance-criteria)
11. [Open Questions & Decisions](#11-open-questions--decisions)

---

## 1. Executive Summary

ThreatSight 360 is a financial crime detection platform that stores, processes, and transmits
comprehensive personal data about individuals under investigation for AML/KYC compliance.
The system currently stores full PII in plaintext across 16 MongoDB collections and sends
unredacted personal data to an external LLM (AWS Bedrock / Claude) on every investigation.

This document is the canonical reference for the **PII Protection initiative**. It:

- Maps every PII field in the database to its collection, type, and risk level.
- Traces every place in the codebase (file + method) where those fields are read, written, returned, or sent externally.
- Proposes a concrete protection strategy using **MongoDB Queryable Encryption (QE)**, API-level masking, LLM data minimization, and RBAC — without breaking existing search, vector, or agentic pipeline functionality.
- Defines a phased implementation plan with clear backward-compatibility rules.

**Bottom line:** The two highest-risk changes required are:
1. Encrypt government-issued IDs (`identifiers[].value`, `ssn`, `passport`, etc.) at rest using MongoDB QE.
2. Redact/tokenize entity names and contact details before sending them to AWS Bedrock.

All other measures (API masking, retention policies, RBAC) are important but secondary.

---

## 2. System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│              Next.js Frontend  (port 3000)                          │
│  Entity Management · Investigation View · Copilot Chat              │
└──────────────┬─────────────────────────────┬────────────────────────┘
               │ REST / SSE / WebSocket      │
     ┌─────────▼──────────┐      ┌───────────▼──────────────┐
     │  Fraud Backend     │      │  AML Backend             │
     │  FastAPI  :8000    │      │  FastAPI  :8001          │
     │                    │      │                          │
     │  · Fraud detection │      │  · Entity resolution     │
     │  · Risk scoring    │      │  · Network analysis      │
     │  · Transaction eval│      │  · LangGraph pipeline    │
     │  · Risk models     │      │  · Copilot ReAct agent   │
     └────────┬───────────┘      └──────────┬───────────────┘
              │                             │
              └──────────────┬──────────────┘
                             │
          ┌──────────────────┼────────────────────┐
          │                  │                    │
   ┌──────▼───────┐  ┌───────▼──────┐  ┌──────────▼──────────┐
   │  MongoDB     │  │  AWS Bedrock │  │  Atlas Embedding API│
   │  Atlas       │  │  Claude Haiku│  │  (Voyage-4 / Titan) │
   │  (16 colls.) │  │  (LLM infer.)│  │  (vector generation)│
   └──────────────┘  └──────────────┘  └─────────────────────┘
```

**Component summary:**

| Component | Language | Key Libraries | PII Role |
|-----------|----------|---------------|----------|
| Frontend | TypeScript / React / Next.js 15 | LeafyGreen, Cytoscape.js, React Flow | Displays and collects PII |
| Fraud Backend | Python 3.10 / FastAPI | PyMongo, Motor, Pydantic | Stores/queries customer PII |
| AML Backend | Python 3.10 / FastAPI | LangGraph, LangChain-AWS, Motor | Stores/queries/sends entity PII to LLM |
| MongoDB Atlas | MongoDB 7.x | Atlas Search, Vector Search, $graphLookup | Persists all PII |
| AWS Bedrock | External API | Claude Haiku 4.5 | **Receives full unredacted PII** |
| Atlas Embedding API | External API | Voyage-4 | Receives entity text for embedding |

---

## 3. PII Inventory — Collections & Fields

The system uses **16 MongoDB collections**. The table below lists every field with PII,
its risk tier, and the collection it belongs to.

**Risk tiers:**

| Tier | Label | Examples |
|------|-------|---------|
| P0 | Critical | Government IDs (SSN, passport, national ID, tax ID) |
| P1 | High | Full name, date of birth, address, email, phone, vector embeddings |
| P2 | Medium | IP address, device ID, transaction amounts, timestamps |
| P3 | Indirect | Entity/customer reference IDs that link to P0–P2 fields |

---

### 3.1 Collection: `customers` (Fraud Backend)

| Field Path | Type | PII Tier | Notes |
|-----------|------|----------|-------|
| `personal_info.name` | String | **P1** | Full legal name |
| `personal_info.email` | String | **P1** | Email address |
| `personal_info.phone` | String | **P1** | Phone number |
| `personal_info.dob` | String | **P1** | Date of birth |
| `personal_info.address.street` | String | **P1** | Street address |
| `personal_info.address.city` | String | **P1** | City |
| `personal_info.address.state` | String | **P1** | State / Province |
| `personal_info.address.zip` | String | **P1** | Postal code |
| `personal_info.address.country` | String | **P2** | Country |
| `account_info.account_number` | String | **P1** | Bank / account number |
| `device_fingerprints[].device_id` | String | **P2** | Device identifier |
| `usual_locations.coordinates` | Array[Float] | **P2** | Geographic coordinates |
| `transaction_behavior.*` | Object | **P2** | Behavioral patterns (re-ID risk) |
| `customer_id` | String | **P3** | Internal reference |

---

### 3.2 Collection: `transactions` (Fraud Backend)

| Field Path | Type | PII Tier | Notes |
|-----------|------|----------|-------|
| `customer_id` | String | **P3** | Link to customer record |
| `amount` | Float | **P2** | Transaction amount |
| `device.device_id` | String | **P2** | Device identifier |
| `merchant.location.coordinates` | Array[Float] | **P2** | Transaction location |
| `timestamp` | Date | **P2** | Transaction time |
| `vector_embedding` | Array[Float] | **P1** | 1536-dim re-identification vector |

---

### 3.3 Collection: `entities` (AML Backend) — **Highest PII density**

| Field Path | Type | PII Tier | Notes |
|-----------|------|----------|-------|
| `name.full` | String | **P1** | Full legal name |
| `name.first` | String | **P1** | First name |
| `name.last` | String | **P1** | Last name |
| `name.aliases[]` | Array[String] | **P1** | Alternative names |
| `dateOfBirth` | String | **P1** | Date of birth |
| `placeOfBirth` | String | **P1** | Place of birth |
| `addresses[].full` | String | **P1** | Full street address |
| `addresses[].city` | String | **P1** | City |
| `addresses[].state` | String | **P2** | State / Province |
| `addresses[].country` | String | **P2** | Country |
| `addresses[].coordinates` | Object | **P2** | Geospatial coordinates |
| `identifiers[].value` | String | **P0** | SSN / passport / national ID / tax ID — **CRITICAL** |
| `identifiers[].type` | String | P3 | ID type label |
| `contactInfo[].value` | String | **P1** | Email or phone value |
| `uboInfo.*` | Object | **P1** | Ultimate Beneficial Owner data |
| `profileEmbedding` | Array[Float] | **P1** | Full-profile re-ID vector |
| `identifierEmbedding` | Array[Float] | **P0** | Identifier-derived re-ID vector |
| `identifierText` | String | **P0** | Concatenated raw ID text |
| `behavioralEmbedding` | Array[Float] | **P2** | Behavioral re-ID vector |
| `behavioralAnalytics.ip_addresses[].ip` | String | **P2** | IP address |
| `behavioralAnalytics.devices[].device_id` | String | **P2** | Device identifier |
| `behavioralAnalytics.location_patterns[].coordinates` | Object | **P2** | Location pattern |

---

### 3.4 Collection: `relationships` (AML Backend)

| Field Path | Type | PII Tier | Notes |
|-----------|------|----------|-------|
| `source.entityId` | String | **P3** | Reference to entity with PII |
| `target.entityId` | String | **P3** | Reference to entity with PII |
| `evidence[]` | Array | **P2** | Relationship evidence (variable content) |

---

### 3.5 Collection: `transactionsv2` (AML Backend)

| Field Path | Type | PII Tier | Notes |
|-----------|------|----------|-------|
| `entityId` | String | **P3** | Reference to entity with PII |
| `counterpartyEntityId` | String | **P3** | Reference to counterparty entity |
| `amount` | Float | **P2** | Transaction amount |
| `timestamp` | Date | **P2** | Transaction time |

---

### 3.6 Collection: `investigations` (Agentic Pipeline)

| Field Path | Type | PII Tier | Notes |
|-----------|------|----------|-------|
| `case_file.entity.name` | String | **P1** | Entity name in case |
| `case_file.entity.addresses` | Array | **P1** | Addresses in case |
| `case_file.transactions` | Object | **P2** | Transaction details |
| `narrative.who` | String | **P1** | Entity identification narrative |
| `narrative.what/when/where` | Strings | **P2** | Investigation context |
| `trail_analysis.leads[].name` | String | **P1** | Related entity names |
| `sub_investigation_findings` | Array | **P1** | Lead entity profiles |
| `human_review.analyst_comments` | String | **P2** | Analyst notes |
| `entity_id` | String | **P3** | Reference to entity |

---

### 3.7 Collection: `resolution_history` (AML Backend)

| Field Path | Type | PII Tier | Notes |
|-----------|------|----------|-------|
| `input_data.name` | String | **P1** | Searched entity name |
| `input_data.address` | String | **P1** | Searched address |
| `best_match.entity.name` | String | **P1** | Matched entity name |
| `decision_reasoning` | String | **P2** | Resolution notes |

---

### 3.8 Collection: `checkpoints` (LangGraph State)

| Field Path | Type | PII Tier | Notes |
|-----------|------|----------|-------|
| `channel_values` | Object | **P0–P2** | Full investigation state; contains all accumulated PII from all agent nodes |

> **Note:** `checkpoints` and `checkpoint_writes` are the most PII-dense collections in the system
> because they store the entire `InvestigationState` graph at each of 11+ pipeline nodes.

---

### 3.9 Collection: `memory_store` (Cross-Investigation Memory)

| Field Path | Type | PII Tier | Notes |
|-----------|------|----------|-------|
| `value` | Object | **P1–P2** | Stored investigation facts; can contain entity names and risk assessments |

---

### 3.10 Collections: `audit_logs` / `merge_history`

| Field Path | Type | PII Tier | Notes |
|-----------|------|----------|-------|
| `ip_address` | String | **P2** | User IP in audit log |
| `user_agent` | String | **P2** | Browser fingerprint |
| `entity_id` | String | **P3** | Entity referenced in action |
| `user_id` | String | **P3** | Analyst identifier |

---

### 3.11 Collections with NO PII

- `fraud_patterns` — generic pattern descriptions
- `typology_library` — AML crime type definitions
- `compliance_policies` — regulatory policy text

---

## 4. PII Usage Map by Component

### 4.1 Frontend (Next.js / React)

#### Sub-component: API Service Layer

| File | Method / Function | PII Fields | Operation | Risk |
|------|-------------------|-----------|-----------|------|
| `frontend/lib/entity-resolution-api.js` | (module-level) `findEntityMatches()` | `name_full`, `date_of_birth`, `address_full`, `identifier_value` | POST to `/entities/onboarding/find_matches` | **HIGH** — raw PII in request body |
| `frontend/lib/entity-resolution-api.js` | `getDemoData()` (lines 144–162) | Full demo records: name, DOB, address, SSN | Hard-coded in source | **CRITICAL** — real-looking PII in source code |
| `frontend/lib/enhanced-entity-resolution-api.js` | `getEnhancedDemoScenarios()` (lines 231–289) | `fullName`, `dateOfBirth`, `address`, `SSN`, `DL`, `PASSPORT` | Demo data + POST to `/api/v1/resolution/comprehensive-search` | **CRITICAL** — government IDs in source |
| `frontend/lib/aml-api.js` | `getPrimaryIdentifier()` (line 1358) | `identifiers[]` (SSN, passport, tax_id) | Read from API response, displayed | **HIGH** |
| `frontend/lib/aml-api.js` | `getPrimaryContact()` (line 1224) | `email`, `phone` | Read from response | **HIGH** |
| `frontend/lib/aml-api.js` | `getPrimaryAddress()` (line 1338) | `address` objects | Read from response | **HIGH** |

#### Sub-component: Display Components

| File | Method / Function | PII Fields Displayed | Masked? | Risk |
|------|-------------------|---------------------|---------|------|
| `frontend/src/components/EntityDetail.jsx` | Component render (lines 789–855) | `name.full`, `name.first`, `name.last`, `name.aliases`, `dateOfBirth`, `placeOfBirth` | **No** | **HIGH** |
| `frontend/src/components/EntityDetail.jsx` | Addresses section (lines 858–988) | `address.full`, `address.city`, `address.coordinates` | **No** | **HIGH** |
| `frontend/src/components/EntityDetail.jsx` | Contact section (line 1010) | `contactInfo[].value` (email, phone — raw) | **No** | **CRITICAL** |
| `frontend/src/components/EntityDetail.jsx` | Identifiers section (line 1081) | `identifiers[].value` (SSN, passport — raw) | **No** | **CRITICAL** |
| `frontend/src/components/SimilarProfilesSection.jsx` | `SimilarProfilesSection()` (line 335) | `name.full`, full entity JSON at line 418 | **No** | **HIGH** |
| `frontend/src/components/EntityList.jsx` | `EntityRow()` (line 148) | `name_full` (EntityLink) | **No** | **MEDIUM** |
| `frontend/src/components/TransactionActivityTable.jsx` | Render (line 30) | `transaction_id`, `amount`, `date`, `counterparty` | **No** | **MEDIUM** |
| `frontend/src/components/TransactionNetworkGraph.jsx` | Node render (lines 60, 78) | `fullName`, `entityId` as node labels | **No** | **MEDIUM** |
| `frontend/src/components/CytoscapeNetworkComponent.jsx` | Node data (line 66) | `entityId`, `displayName` | **No** | **MEDIUM** |

#### Sub-component: Form Components

| File | Method / Function | PII Fields Collected | Sent to API | Risk |
|------|-------------------|---------------------|-------------|------|
| `frontend/src/components/ModernOnboardingForm.jsx` | `handleSubmit()` | `fullName`, `address`, `entityType` | POST unencrypted form body | **HIGH** |

#### Sub-component: Search Components

| File | Method / Function | PII Fields | Risk |
|------|-------------------|-----------|------|
| `frontend/src/components/EnhancedSearchBar.jsx` | `onQueryChange()` (line 49) | Free-text query (can contain name/ID) → `GET /entities/search/autocomplete?q=` | **MEDIUM** — query logged server-side |

> **Finding:** There are **zero masking/redaction utilities** in the frontend.
> All PII is displayed raw and unmasked throughout the application.

---

### 4.2 Backend (Fraud Detection — port 8000)

#### Sub-component: Models

| File | Class / Field | PII Fields Defined | Risk |
|------|--------------|-------------------|------|
| `backend/models/customer.py` | `PersonalInfoModel` (lines 28–33) | `name`, `email`, `phone`, `address` (nested), `dob` | **P1** definitions |
| `backend/models/customer.py` | `AccountInfoModel` (line 36) | `account_number` | **P1** definition |
| `backend/models/customer.py` | `CustomerResponse` (lines 134–230) | All personal fields with example values including real-looking account numbers | **HIGH** — example data in schema |
| `backend/models/transaction.py` | `DeviceInfoModel` (lines 38–43) | `device_id`, `ip` | **P2** definition |

#### Sub-component: Routes

| File | Function | PII Fields | Operation | Risk |
|------|----------|-----------|-----------|------|
| `backend/routes/customer.py` | `create_customer()` (line 40) | All `PersonalInfoModel` + `AccountInfoModel` fields | POST — receives and stores full customer | **HIGH** |
| `backend/routes/customer.py` | `list_customers()` (line 55) | All fields, no projection, no field exclusion | GET — returns up to limit customers with all PII | **CRITICAL** — no field filtering |
| `backend/routes/customer.py` | `get_customer()` (line 86) | Full customer document | GET — returns full record | **HIGH** |
| `backend/routes/customer.py` | `update_customer()` (line 96) | All fields | PUT — updates and returns full record | **HIGH** |
| `backend/routes/customer.py` | `delete_customer()` (line 117) | `_id` | DELETE — hard-delete (no soft-delete/audit) | **MEDIUM** |
| `backend/routes/transaction.py` | `list_transactions()` (line 292) | `customer_id`, `device`, `location` | GET with `customer_id` filter | **MEDIUM** |
| `backend/routes/transaction.py` | `get_customer_transactions()` (line 357) | Full transaction list for customer | GET — returns 50 transactions with device+location | **MEDIUM** |

#### Sub-component: Services

| File | Method | PII Fields | Operation | Risk |
|------|--------|-----------|-----------|------|
| `backend/services/fraud_detection.py` | `evaluate_transaction()` (line 51) | `personal_info.name`, `account_info.account_number`, behavioral profile | Queries full customer, uses location + device for scoring | **HIGH** |
| `backend/services/fraud_detection.py` | `evaluate_transaction()` (line 140) | `personal_info.name` | **Logged to application logs** — `logger.info("Customer/entity name: {name}")` | **HIGH** — PII in logs |
| `backend/services/fraud_detection.py` | `_check_location_anomaly()` (line 286) | `usual_transaction_locations` (city, coordinates) | Reads behavioral location data | **P2** |
| `backend/services/fraud_detection.py` | `_check_device_anomaly()` (line 344) | `devices[].device_id`, `devices[].ip_range` | Reads device fingerprints | **P2** |
| `backend/services/fraud_detection.py` | `_check_transaction_velocity()` (line 401) | `customer_id` | Query filter on customer | **P3** |

---

### 4.3 AML Backend (KYC / Agentic — port 8001)

#### Sub-component: Models

| File | Class / Field | PII Fields Defined | Risk |
|------|--------------|-------------------|------|
| `aml-backend/models/core/entity.py` | `Entity` (line 140) | `name`, `alternate_names`, `identifiers` (Dict[str,str]), `contact` (email, phone, address, city, country), `nationality`, `account_info` | All P0–P1 definitions |
| `aml-backend/models/entity_resolution.py` | `EntityResolutionInput` | `dateOfBirth` (line 58), `primaryAddress_full` (line 59) | **P1** fields used in resolution |
| `aml-backend/models/database/collections.py` | Indexes (lines 45–49) | `identifiers.ssn`, `identifiers.passport`, `identifiers.national_id`, `identifiers.tax_id`, `identifiers.ein` | **P0** — indexed for fast PII-based lookups |

#### Sub-component: Routes

| File | Function | PII Fields | Operation | Risk |
|------|----------|-----------|-----------|------|
| `aml-backend/routes/core/entities.py` | `list_entities()` (line 42) | All entity fields via `Entity` model | GET — paginated list with all fields | **HIGH** |
| `aml-backend/routes/core/entities.py` | `get_entity()` (line 108) | Complete `EntityDetailedResponse` | GET — full entity with identifiers, addresses, contacts | **CRITICAL** |

#### Sub-component: Services

| File | Method | PII Fields | Operation | Risk |
|------|--------|-----------|-----------|------|
| `aml-backend/services/search/atlas_search_service.py` | `search_by_identifiers()` (line 120) | `identifiers.ssn`, `identifiers.passport`, `identifiers.national_id`, `identifiers.tax_id` | **Query by government ID** — returns matched entities | **P0** |
| `aml-backend/services/search/entity_search_service.py` | (search methods) (lines 266–275) | `identifiers.value`, `identifiers.type` | Full-text and faceted search on identifiers | **P0** |
| `aml-backend/repositories/impl/vector_search_repository.py` | `_build_entity_text()` (lines 404–406) | `dateOfBirth` embedded in text for vector generation | **Sent to Atlas Embedding API** | **HIGH** |
| `aml-backend/repositories/impl/vector_search_repository.py` | `_build_identifier_text()` (lines 591–596) | DOB, SSN label embedded in identifier text | **Sent to Atlas Embedding API** | **P0** |
| `aml-backend/services/pdf_generation_service.py` | `generate_pdf()` (lines 215, 325) | `entity.name`, `entity.type`, address, email, phone, risk scores | PDF generation — full PII in document | **HIGH** |
| `aml-backend/services/llm/streaming_classification_service.py` | `_build_comprehensive_prompt()` (lines 226–300) | `fullName`, `dateOfBirth`, `addresses[]`, `contactInfo[]`, `identifiers[]`, `name.aliases[]` | **SENT TO AWS BEDROCK (Claude)** | **CRITICAL** |
| `aml-backend/services/llm/investigation_service.py` | `_generate_investigation_summary()` (lines 216–219) | `fullName`, `address` | **SENT TO AWS BEDROCK** | **HIGH** |

#### Sub-component: Agent Tools (LangGraph — all send data to LLM)

| File | Tool Function | PII Fields Returned to Agent/LLM | Risk |
|------|---------------|----------------------------------|------|
| `aml-backend/services/agents/tools/entity_tools.py` | `get_entity_profile()` (lines 11–39) | `dateOfBirth`, `addresses[]`, `identifiers[]`, `contactInfo[]`, `uboInfo`, `riskAssessment`, `watchlistMatches` | **CRITICAL** — all P0/P1 fields available to LLM via this tool |
| `aml-backend/services/agents/tools/entity_tools.py` | `screen_watchlists()` (line 52) | `name.full` | **HIGH** |
| `aml-backend/services/agents/tools/chat_tools.py` | `search_entities()` (line 80) | `name`, `riskAssessment.overall` | **HIGH** |
| `aml-backend/services/agents/tools/chat_tools.py` | `assess_entity_risk()` (lines 175–265) | `name`, `riskAssessment`, `watchlistMatches` | **HIGH** |
| `aml-backend/services/agents/tools/chat_tools.py` | `compare_entities()` (lines 269–318) | `name`, `entityType`, `riskAssessment` | **MEDIUM** |
| `aml-backend/services/agents/tools/chat_tools.py` | `find_similar_entities()` (lines 401–450) | `name`, `profileEmbedding` query, returns `name` | **HIGH** |
| `aml-backend/services/agents/tools/network_tools.py` | `analyze_entity_network()` | Entity IDs → resolves to full entity data via $graphLookup | **HIGH** |
| `aml-backend/services/agents/tools/transaction_tools.py` | `query_entity_transactions()` | `amount`, `timestamp`, `counterpartyEntityId` | **MEDIUM** |
| `aml-backend/services/agents/tools/policy_tools.py` | `lookup_typology()`, `search_compliance_policies()` | Typology/policy text — **no PII** | LOW |

#### Sub-component: Agent Pipeline Nodes

| File | Node Function | PII Handling | Risk |
|------|---------------|-------------|------|
| `aml-backend/services/agents/nodes/data_gatherer.py` | `fetch_entity_profile_node()` (line 122) | Calls `get_entity_profile()`, stores full entity in `gathered_data` state | **CRITICAL** — accumulates full PII in graph state |
| `aml-backend/services/agents/nodes/data_gatherer.py` | `assemble_case_node()` (lines 150–223) | Assembles case file from gathered data: name, addresses (line 60) | **HIGH** |
| `aml-backend/services/agents/nodes/narrative.py` | `narrative_node()` (lines 24–61) | Passes full `case_file` (up to 18,000 chars) to Claude via `truncate_payload()` | **CRITICAL** |
| `aml-backend/services/agents/nodes/sub_investigator.py` | `mini_investigate()` (line 143) | Calls `get_entity_profile()` for each lead entity; sends to LLM | **HIGH** |
| `aml-backend/services/agents/nodes/trail_follower.py` | `trail_follower_node()` (line 96) | Reads `case_file` containing entity profiles | **HIGH** |
| `aml-backend/services/agents/state.py` | State object | `gathered_data`, `case_file`, `sub_investigation_findings` all carry full PII through the pipeline | **CRITICAL** — entire state persisted to `checkpoints` collection |

---

## 5. Critical PII Exposure Points

The following exposure points are ranked by severity. "Exposure" here means PII leaving
the MongoDB database boundary and reaching an external party or being stored without
the appropriate safeguards.

### EP-1 — AWS Bedrock Claude LLM (CRITICAL)

**What:** Full entity profiles including name, DOB, address, government IDs, watchlist hits, transaction details.

**Where sent:** 6–8 times per investigation across:
- `streaming_classification_service.py` → `_build_comprehensive_prompt()`
- `investigation_service.py` → `_generate_investigation_summary()`
- `nodes/narrative.py` → `narrative_node()` (up to 18,000 chars)
- `nodes/trail_follower.py` → condition-based LLM call
- `nodes/sub_investigator.py` → mini-investigate per lead (×3)
- All chat Copilot turns via `get_entity_profile` tool

**Why risky:** AWS may retain inputs for 30 days for abuse detection (check AWS DPA).
No tokenization or masking is applied before sending.

**Mitigation target:** See Section 7.3 (LLM Data Minimization).

---

### EP-2 — MongoDB `checkpoints` Collection (CRITICAL)

**What:** Entire `InvestigationState` graph stored at each of 11+ pipeline nodes.
Contains all accumulated PII from all preceding steps.

**Why risky:** Checkpoints are stored indefinitely by default; no retention policy.
They hold more PII than any single collection because they accumulate across all pipeline steps.

**Mitigation target:** Retention policy (Section 7.5) + QE encryption (Section 7.1).

---

### EP-3 — API Endpoints Returning Full Documents (HIGH)

**What:** `GET /customers`, `GET /entities/{id}`, `GET /entities/` — all return full
documents with no field-level projection or role-based filtering.

**Why risky:** Any authenticated caller can retrieve complete PII.
No masking of SSN, passport, email, phone, DOB in responses.

**Mitigation target:** API response masking (Section 7.2).

---

### EP-4 — Atlas Embedding API / Voyage-4 (HIGH)

**What:** Entity name + address text, DOB, and identifier-derived text sent for embedding generation.

**Why risky:** External HTTP call to `ai.mongodb.com`; request logs may retain input text.

**Mitigation target:** Strip P0 fields from embedding text (only use non-identifying features).

---

### EP-5 — Application Logs (MEDIUM)

**What:** `fraud_detection.py` line 140 logs `customer.personal_info.name` on every fraud evaluation.

**Why risky:** Application logs often flow to centralized logging systems (Datadog, ELK)
with weaker access controls than MongoDB.

**Mitigation target:** Remove or hash PII in log statements.

---

### EP-6 — Hard-Coded Demo PII in Frontend Source (HIGH)

**What:** `entity-resolution-api.js` and `enhanced-entity-resolution-api.js` contain hard-coded
demo scenarios with realistic names, DOBs, addresses, and government ID numbers
(e.g., `"SSN:555-12-3456"`, `"PASSPORT:555123456"`).

**Why risky:** Source code is version-controlled and may be exposed in public repositories,
CI/CD logs, or error reports.

**Mitigation target:** Replace with clearly fictional placeholder data (e.g., `"SSN:000-00-0001"`).

---

## 6. Risk Matrix

| Exposure Point | Likelihood | Impact | Overall Risk | Priority |
|----------------|-----------|--------|-------------|----------|
| LLM data (EP-1) | High | Critical | **CRITICAL** | P0 |
| Checkpoints (EP-2) | High | Critical | **CRITICAL** | P0 |
| Full API responses (EP-3) | High | High | **HIGH** | P1 |
| Embedding API (EP-4) | Medium | High | **HIGH** | P1 |
| Demo PII in source (EP-6) | Medium | High | **HIGH** | P1 |
| Application logs (EP-5) | Medium | Medium | **MEDIUM** | P2 |
| Behavioral embeddings (re-ID) | Low | Critical | **HIGH** | P1 |
| Retention policy absence | Medium | High | **HIGH** | P1 |
| No RBAC on collections | Medium | High | **HIGH** | P1 |

---

## 7. Protection Strategy

### 7.1 MongoDB Queryable Encryption (QE)

**What it is:** MongoDB's client-side field-level encryption (CSFLE / QE) encrypts specific fields
before they leave the application process. The database stores only ciphertext; decryption keys
never touch the MongoDB server.

**Why QE and not standard CSFLE:** QE supports equality queries on encrypted fields,
which is required for the identifier search patterns (`search_by_identifiers()`, Atlas Search on `identifiers.value`).

**Fields to encrypt with QE (P0 tier):**

| Collection | Field | QE Algorithm | Queryable? |
|-----------|-------|-------------|-----------|
| `entities` | `identifiers[].value` | Randomized + Equality | Yes |
| `entities` | `identifierText` | Deterministic | No |
| `customers` | `personal_info.name` | Randomized | No |
| `customers` | `account_info.account_number` | Deterministic | No |
| `customers` | `personal_info.dob` | Randomized | No |
| `entities` | `dateOfBirth` | Randomized | No |
| `entities` | `name.full` | Deterministic | No (search via Atlas Search index on encrypted form) |

**Fields to encrypt at rest only (QE Randomized, P1 tier):**

| Collection | Fields |
|-----------|-------|
| `entities` | `contactInfo[].value` (email, phone), `addresses[].full`, `uboInfo.*` |
| `investigations` | `narrative.who`, `case_file.entity.name`, `case_file.entity.addresses` |
| `checkpoints` | `channel_values` (entire document — encrypt at document level) |

**Impact on existing functionality:**

| Feature | Impact | Mitigation |
|---------|--------|-----------|
| Atlas Search on `name` | ~~Atlas Search cannot index encrypted fields~~ → Requires maintaining a hashed/tokenized search field | Add `name_token` (SHA-256 truncated) field alongside encrypted `name.full`; index `name_token` |
| Vector Search on `profileEmbedding` | No impact — embeddings are generated from plaintext before encryption | No change needed |
| `$graphLookup` on `relationships` | Searches on `entityId` (P3) — not encrypted | No impact |
| `identifiers` equality search | Use QE equality query on encrypted `identifiers[].value` | Requires PyMongo 4.x QE API |
| PDF generation | Decrypt fields before generating PDF inside the application | Automatic via QE-aware client |

**Key Management:** Use AWS KMS (Customer Master Key) to wrap data encryption keys.
Keys stored in `key_vault` collection in a separate MongoDB database.

---

### 7.2 API Response Masking

**Goal:** Prevent raw PII from reaching frontend or unauthorized API consumers.

**Masking rules by field:**

| Field | Display Rule | Example |
|-------|-------------|---------|
| `identifiers[].value` (SSN) | Last 4 digits only | `***-**-4321` |
| `identifiers[].value` (passport) | First + last 2 chars | `P***5678` |
| `contactInfo[].value` (email) | Domain + first char | `j***@example.com` |
| `contactInfo[].value` (phone) | Last 4 digits | `***-***-5678` |
| `name.full` | Full display only for `compliance` role; initials for `analyst` role | `J. D.` |
| `dateOfBirth` | Age only for `analyst` role | `Age 42` |
| `addresses[].full` | City + Country only for `analyst` role | `Boston, US` |
| `account_number` | Last 4 digits | `****6337` |

**Implementation approach (non-breaking):**

1. Create a `PIIMaskingMixin` Pydantic mixin with a `mask(role: str)` method.
2. Apply to `EntityDetailedResponse` and `CustomerResponse`.
3. Pass user role from JWT claims; default to `analyst` masking if role missing.
4. `compliance` role (investigators filing SARs) receives unmasked fields.
5. Existing clients that call the API with a `compliance` role token see no change.

---

### 7.3 LLM Data Minimization

**Goal:** Prevent government IDs, exact DOBs, and exact addresses from being sent to AWS Bedrock.

**Strategy: Tokenization + Pseudonymization before LLM calls**

**Step 1 — Token generation:** Before any investigation starts, generate a case-scoped token map:
```
{
  "entity_name": "<ENTITY-001>",
  "dob": "<DOB-1985>",           # year only
  "address": "<ADDRESS-IL>",     # state/country only
  "ssn": "<ID-SSN-MASKED>",      # never sent
  "passport": "<ID-PASS-MASKED>" # never sent
}
```

**Step 2 — Prompt construction:** Replace real values with tokens in all prompts
sent to `_build_comprehensive_prompt()`, `narrative_node()`, and sub-investigator nodes.

**Step 3 — De-tokenization:** After LLM returns SAR narrative (stored in `investigations`),
replace tokens with real values in the stored document. The LLM-generated text never
contains real PII; only the final stored document does.

**What still gets sent (risk-based, not PII-identifying):**
- Risk scores and levels
- Transaction amounts and date ranges (not exact timestamps)
- Relationship types (not names of related parties)
- Typology classification
- Watchlist hit status (yes/no, not the raw hit details)

**Files requiring changes:**

| File | Method | Change |
|------|--------|--------|
| `aml-backend/services/llm/streaming_classification_service.py` | `_build_comprehensive_prompt()` | Apply tokenization before building prompt |
| `aml-backend/services/llm/investigation_service.py` | `_generate_investigation_summary()` | Apply tokenization |
| `aml-backend/services/agents/nodes/narrative.py` | `narrative_node()` | Apply tokenization to `evidence_payload` before `truncate_payload()` |
| `aml-backend/services/agents/nodes/sub_investigator.py` | `mini_investigate()` | Apply tokenization to entity profile before LLM call |
| `aml-backend/services/agents/tools/entity_tools.py` | `get_entity_profile()` | Return tokenized version when called from within LangGraph context |

---

### 7.4 Access Control & RBAC

**Current state:** No role-based field filtering at the application layer.
No MongoDB RBAC defined in the codebase.

**Proposed roles:**

| Role | Description | Access Level |
|------|-------------|-------------|
| `analyst` | Fraud/AML analyst | Masked PII, can view investigations |
| `compliance` | Compliance officer filing SARs | Unmasked PII, can approve/reject human review |
| `admin` | System administrator | Full access, requires MFA |
| `readonly` | Reporting / BI | Aggregated only, no individual records |
| `system` | Backend service accounts | Full access, internal only |

**MongoDB RBAC implementation:**
- Create custom MongoDB roles in Atlas for each application role.
- Use `readWrite` on collections without PII fields for `analyst`.
- Use field-level projection in all `find()` queries based on role.
- Enforce at the repository layer (not at the route layer).

---

### 7.5 Data Retention & Right-to-Erasure

**Proposed TTL policies:**

| Collection | Current TTL | Proposed TTL | Reason |
|-----------|------------|-------------|--------|
| `checkpoints` | Indefinite | 90 days after investigation completion | Investigation state no longer needed after SAR filed |
| `checkpoint_writes` | Indefinite | 30 days | System operational data |
| `memory_store` | Indefinite | 180 days | Cross-investigation memory |
| `audit_logs` | 7 years | 7 years (unchanged) | Regulatory requirement |
| `resolution_history` | 2 years | 2 years (unchanged) | Regulatory requirement |
| `entities` (archived) | 1 year | 1 year (unchanged) | Standard retention |

**Right-to-Erasure (GDPR Article 17):**
- Implement a `PII_ERASURE` API endpoint `DELETE /entities/{entityId}/pii`.
- Endpoint pseudonymizes rather than hard-deletes (preserves audit trail integrity):
  - Replaces `name.full`, `name.first`, `name.last` with `"[ERASED]"`.
  - Deletes `identifiers[]`, `contactInfo[]`, `addresses[]`, `dateOfBirth`.
  - Nullifies `profileEmbedding`, `identifierEmbedding`, `behavioralEmbedding`.
  - Leaves `entityId`, `riskAssessment`, `relationships` intact for audit purposes.
- SAR investigation documents referencing the entity are flagged with `pii_erased: true`.

---

## 8. Implementation Plan (Phased, Non-Breaking)

### Phase 0 — Immediate Fixes (1–2 days, zero risk)

These changes have no functional impact and can be shipped today.

| Task | File | Change | Risk |
|------|------|--------|------|
| Remove PII from application logs | `backend/services/fraud_detection.py:140` | Replace name with `customer_id` in log statement | Zero |
| Remove realistic demo PII from source | `frontend/lib/entity-resolution-api.js` (lines 144–162) | Replace with clearly fictional data (`"Test Person"`, `"SSN:000-00-0000"`) | Zero |
| Remove realistic demo PII from source | `frontend/lib/enhanced-entity-resolution-api.js` (lines 231–289) | Same as above | Zero |
| Add `identifiers` exclusion to `list_entities` projection | `aml-backend/routes/core/entities.py:42` | Add `{"identifiers": 0}` to list projection | Low — list view does not need full IDs |

---

### Phase 1 — API Response Masking (1 week)

Goal: Prevent raw P0/P1 fields from reaching the frontend without authorization.

**Step 1.1 — Create masking utility:**

```python
# aml-backend/utils/pii_masking.py  (new file)

def mask_email(value: str) -> str:
    local, _, domain = value.partition("@")
    return f"{local[0]}***@{domain}" if local else "***"

def mask_phone(value: str) -> str:
    digits = re.sub(r"\D", "", value)
    return f"***-***-{digits[-4:]}" if len(digits) >= 4 else "***"

def mask_identifier(id_type: str, value: str) -> str:
    if id_type.lower() in ("ssn", "social_security"):
        return f"***-**-{value[-4:]}" if len(value) >= 4 else "***"
    return f"{value[:2]}***{value[-2:]}" if len(value) >= 4 else "***"

def mask_address(address: dict, role: str) -> dict:
    if role == "compliance":
        return address
    return {"city": address.get("city"), "country": address.get("country"), "type": address.get("type")}
```

**Step 1.2 — Apply masking in response serialization:**
- Modify `EntityDetailedResponse.from_entity(entity, role)` to call masking utils.
- Pass role from JWT claim in all route handlers.
- Default to `analyst` masking for unauthenticated or unknown role.

**Step 1.3 — Frontend update:**
- Display masked values as-is (no frontend changes required).
- Show lock icon next to masked fields to indicate "requires elevated access".

**Backward-compatibility guarantee:**
- Existing `compliance` role tokens see identical data.
- Only `analyst` role tokens see masked data (new behavior for new role).

---

### Phase 2 — LLM Data Minimization (2 weeks)

Goal: Remove P0 fields from all Bedrock API calls.

**Step 2.1 — Create tokenization service:**

```python
# aml-backend/services/pii_tokenizer.py  (new file)

class CaseTokenizer:
    """Generates and resolves case-scoped PII tokens."""

    def __init__(self, case_id: str):
        self.case_id = case_id
        self._map: dict[str, str] = {}
        self._reverse: dict[str, str] = {}

    def tokenize_entity(self, entity: dict) -> dict:
        """Return a copy of entity with P0/P1 fields replaced by tokens."""
        token = self._get_or_create_token("entity", entity.get("entityId"))
        return {
            "entityRef": token,
            "entityType": entity.get("entityType"),
            "riskLevel": entity.get("riskAssessment", {}).get("overall", {}).get("level"),
            "riskScore": entity.get("riskAssessment", {}).get("overall", {}).get("score"),
            "watchlistHit": bool(entity.get("watchlistMatches")),
            # DOB: year only
            "birthYear": str(entity.get("dateOfBirth", ""))[:4] or None,
            # Address: country + state only
            "addressRegion": self._coarse_address(entity.get("addresses", [])),
        }
```

**Step 2.2 — Inject tokenizer into investigation pipeline:**
- Instantiate `CaseTokenizer(case_id)` at the start of each investigation thread.
- Pass tokenizer through `InvestigationState` as a non-serialized context object.
- Apply `tokenizer.tokenize_entity()` in `data_gatherer.py:assemble_case_node()` before
  writing to `case_file`.
- The `case_file` stored in `InvestigationState` (and checkpointed to MongoDB) contains tokens.
- Real PII is only in the `entities` collection (encrypted at rest in Phase 3).

**Step 2.3 — De-tokenize before final storage:**
- In `nodes/finalize.py`, before writing to `investigations` collection,
  re-substitute tokens with real values from the `entities` collection.
- The stored investigation document contains real PII (encrypted via QE in Phase 3).

**Backward-compatibility guarantee:**
- SAR narratives still reference entity names (compliance requirement preserved).
- LLM receives tokens → generates narrative with tokens → de-tokenized before storage.
- Human review analysts see real names (they have `compliance` role).

---

### Phase 3 — MongoDB Queryable Encryption (4–6 weeks)

Goal: Encrypt P0 fields at rest; maintain searchability.

**Step 3.1 — Set up KMS and key vault:**
- Create AWS KMS Customer Master Key (CMK) for data encryption keys.
- Create `key_vault` collection in `aml_pii_keys` database (separate from operational DB).
- Generate one Data Encryption Key (DEK) per collection.

**Step 3.2 — Update PyMongo clients to use encrypted client:**

```python
# aml-backend/db/encrypted_client.py  (new file)

from pymongo.encryption_options import AutoEncryptionOpts
from pymongo import MongoClient

def get_encrypted_client(connection_string: str, kms_provider: dict) -> MongoClient:
    key_vault_namespace = "aml_pii_keys.key_vault"
    encrypted_fields_map = {
        "aml_db.entities": {
            "fields": [
                {"path": "identifiers.value", "bsonType": "string",
                 "queries": [{"queryType": "equality"}]},
                {"path": "name.full", "bsonType": "string"},
                {"path": "dateOfBirth", "bsonType": "string"},
                {"path": "contactInfo.value", "bsonType": "string"},
            ]
        },
        "aml_db.checkpoints": {
            "fields": [
                {"path": "channel_values", "bsonType": "object"},
            ]
        }
    }
    opts = AutoEncryptionOpts(
        kms_providers=kms_provider,
        key_vault_namespace=key_vault_namespace,
        encrypted_fields_map=encrypted_fields_map,
    )
    return MongoClient(connection_string, auto_encryption_opts=opts)
```

**Step 3.3 — Migration strategy (zero-downtime):**
1. Deploy new encrypted client alongside existing plain client.
2. Write new entities to encrypted collection; read from both.
3. Background migration script encrypts existing documents in batches.
4. After migration: switch all reads to encrypted client; decommission plain client.
5. Total migration window: 2–4 hours for ~500 entities.

**Step 3.4 — Atlas Search on encrypted fields:**
- For `name.full` (deterministic encryption): add `name_token` field (HMAC-SHA256 of lowercase name).
- Update Atlas Search index to include `name_token`.
- Modify `atlas_search_service.py` to query on `name_token` when searching by name.
- Fuzzy/autocomplete search: pre-compute n-grams of `name_token` and index them.

**Backward-compatibility guarantee:**
- QE is fully transparent at the application layer — PyMongo auto-encrypts on write, auto-decrypts on read.
- No changes to repository methods beyond switching to encrypted client.
- Atlas Search queries on `name_token` are functionally equivalent to queries on `name.full`.

---

### Phase 4 — Retention Policies & RBAC (2 weeks)

**Checkpoint TTL:**
```python
# In collections.py, after Phase 3
db.checkpoints.create_index(
    "completed_at",
    expireAfterSeconds=90 * 24 * 60 * 60  # 90 days
)
```

**MongoDB Atlas RBAC:**
- Create `analyst_role` with `read` on all collections + field-level exclusion on `identifiers`, `contactInfo`, `dateOfBirth`.
- Create `compliance_role` with `readWrite` on all collections (full access).
- Create `system_role` for service accounts.
- Enforce via MongoDB connection string + X.509 certificate per service.

---

## 9. Backward-Compatibility Rules

The following invariants must be preserved throughout all phases:

| Rule | Rationale |
|------|-----------|
| SAR narratives must identify the subject entity by name | FinCEN requirement; use real names in stored investigations, tokens only during LLM processing |
| Atlas Search on entity names must continue to work | Core search feature; use `name_token` alongside encrypted `name.full` |
| Vector search on `profileEmbedding` must continue to work | Embeddings are generated from plaintext before encryption; no change needed |
| `$graphLookup` on relationships must continue to work | Traverses on `entityId` (P3 — not encrypted) |
| Investigation resume (LangGraph checkpoint restore) must work | Checkpoints will be encrypted; QE client decrypts on read transparently |
| Existing API clients with `compliance` role must see identical data | Masking only activates for `analyst` role |
| Fraud detection scoring logic must remain unchanged | No PII fields are used in ML scoring formulas; only behavioral aggregates |
| PDF generation must include real names | De-tokenization happens before PDF generation; compliance role required to request PDF |

---

## 10. Success Metrics & Acceptance Criteria

| Metric | Baseline | Target | Measurement |
|--------|----------|--------|-------------|
| P0 fields stored in plaintext | 5 collections, 8 fields | 0 | MongoDB collection scan |
| P0 fields sent to Bedrock | Per investigation: SSN, passport, DOB, name | 0 government IDs; pseudonymized names only | Bedrock API call audit log |
| PII in application logs | At least 1 known instance (customer name) | 0 | Log scan for PII patterns |
| Hard-coded PII in source | 13+ demo records with realistic IDs | 0 real-looking IDs | Source code scan (PII regex) |
| API responses returning raw SSN/passport | 100% of entity GET responses | 0% (for `analyst` role) | Integration test |
| Checkpoint retention (days) | Indefinite | ≤ 90 days post-completion | MongoDB TTL index verification |
| RBAC enforced on entity collection | No | Yes | Role-based integration test |
| QE encryption coverage (P0 fields) | 0% | 100% | Encrypted field map validation |

---

## 11. Open Questions & Decisions

| # | Question | Options | Owner | Decision Needed By |
|---|----------|---------|-------|-------------------|
| Q1 | Should SAR narratives use tokens or real names? | (a) Real names — FinCEN compliant, higher storage risk; (b) Tokens in storage, real names only in printed/exported SARs | Legal / Compliance | Phase 2 start |
| Q2 | QE key management: AWS KMS vs. HashiCorp Vault? | AWS KMS (simpler, already using Bedrock); HashiCorp Vault (more control) | Security | Phase 3 start |
| Q3 | Should `memory_store` be encrypted? | Memory can contain entity names from past investigations — yes, recommended | Architecture | Phase 3 |
| Q4 | Should `behavioralEmbedding` be treated as P0 (biometric proxy)? | Yes under GDPR Recital 26; No under strict definition | Legal | Before Phase 3 |
| Q5 | Right-to-erasure scope: does it extend to `investigations`? | SAR documents have regulatory retention requirements; erasure may conflict with FinCEN obligations | Legal | Phase 4 |
| Q6 | Voyage-4 embedding API: is there a data processing agreement in place? | MongoDB Atlas DPA covers Atlas operations; separate DPA may be needed for Voyage endpoint | Legal | Before Phase 3 |
| Q7 | Should the demo environment use synthetic data only? | Yes — create a separate seed dataset with Faker-generated entities | Engineering | Phase 0 |

---

*End of document.*
