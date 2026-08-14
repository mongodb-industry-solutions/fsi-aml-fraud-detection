# AGENTS.md

Guidance for AI coding agents working in this repository.

ThreatSight 360 is a dual-backend fraud detection and AML/KYC compliance demo:
a fraud detection API, an AML/KYC API with a LangGraph agentic investigation
pipeline, and a Next.js frontend. This file is the compact entry point — for
deep architectural detail, see [docs/CLAUDE.md](docs/CLAUDE.md),
[docs/AGENTIC_SYSTEM_OVERVIEW.md](docs/AGENTIC_SYSTEM_OVERVIEW.md), and
[docs/SOLUTION_ARCHITECTURE.md](docs/SOLUTION_ARCHITECTURE.md).

## Build and test commands

```bash
# Fraud backend (port 8000)
cd backend && poetry install
poetry run uvicorn main:app --host 0.0.0.0 --port 8000 --reload

# AML backend (port 8001) -- needs Python 3.10-3.12, not 3.13
# (voyageai, a transitive dependency, isn't yet compatible with 3.13+)
cd aml-backend && poetry install
poetry run uvicorn main:app --host 0.0.0.0 --port 8001 --reload

# Frontend (port 3000)
cd frontend && npm install && npm run dev
```

**There is no automated test suite in this repository.** Neither backend
declares `pytest` as a dependency and no `test_*.py` files exist, despite
`docs/CLAUDE.md` describing test patterns for both. `npm test` does not exist
for the frontend either. Do not claim tests pass — there are none. To verify a
change, run the affected service and exercise it directly (curl or the UI).

Post-seed maintenance scripts (run once after seeding from the notebooks in
`docs/`, see [EDD.md](EDD.md) for why):

```bash
cd backend && poetry run python scripts/migrate_customers.py
cd aml-backend && poetry run python scripts/fix_collection_names.py
cd aml-backend && poetry run python -m services.agents.seed
```

## Project structure

```
backend/            Fraud detection API (FastAPI, port 8000)
  routes/            customer, transaction, fraud_pattern, model_management, bian
  services/          fraud_detection.py (risk scoring), risk_model_service.py
  db_config.py        Atlas appName -- single source of truth, see below
  scripts/           One-off maintenance scripts (see migrate_customers.py)
aml-backend/         AML/KYC + agentic investigation API (FastAPI, port 8001)
  routes/core/        Entity CRUD and resolution
  routes/search/      Atlas Search, Vector Search, hybrid ($rankFusion)
  routes/agents/      Investigation SSE streaming, Copilot chat
  repositories/       Repository pattern over reference/mongodb_core_lib.py
  services/agents/    LangGraph pipeline: graph.py, nodes/, tools/, seed.py
  db_config.py        Atlas appName, distinct value from backend/'s
  scripts/           fix_collection_names.py
frontend/            Next.js 15 UI (port 3000)
  app/                Pages: entities, entity-resolution/enhanced,
                      transaction-simulator, risk-models, investigations
  lib/                API clients -- aml-api.js, agent-api.js
docs/                Deep-dive docs, data-generation notebooks, DATA_MODEL.md
```

Notable files:

- [backend/db_config.py](backend/db_config.py) and
  [aml-backend/db_config.py](aml-backend/db_config.py) — the only places
  `appName` is defined. Import from here rather than hardcoding a string at a
  new `MongoClient`/`AsyncIOMotorClient` call.
- [aml-backend/reference/mongodb_core_lib.py](aml-backend/reference/mongodb_core_lib.py) —
  despite the directory name, this is live, heavily-used code (fluent
  aggregation builder, the base `MongoDBRepository`), not a reference example.
- [aml-backend/services/agents/seed.py](aml-backend/services/agents/seed.py) —
  seeds `threatsightTypologyLibrary` and `threatsightCompliancePolicies`,
  required before launching an investigation.

## API overview

**Fraud backend** (`:8000`): `/customers/`, `/transactions/`,
`/transactions/evaluate`, `/fraud-patterns/`, `/models/`.

**AML backend** (`:8001`): `/entities/`, `/entities/onboarding/find_matches`,
`/api/v1/resolution/*` (enhanced resolution workflow), `/search/atlas/`,
`/search/vector/`, `/search/unified/`, `/network/`, `/transactions/`,
`/agents/investigate` (SSE), `/agents/chat` (SSE), `/health`, `/docs`.

## Environment variables and configuration

Both backends read `MONGODB_URI`, `DB_NAME`, `AWS_ACCESS_KEY_ID`,
`AWS_SECRET_ACCESS_KEY`, `AWS_REGION`. `aml-backend` additionally reads
`ATLAS_SEARCH_INDEX`, `ATLAS_TEXT_SEARCH_INDEX`, `ENTITY_VECTOR_INDEX`,
`LLM_MODEL_ARN` (optional, overrides the default Haiku 4.5 model),
`RATE_LIMIT_INVESTIGATE` / `RATE_LIMIT_CHAT` (optional). See
[backend/README.md](backend/README.md) and
[aml-backend/README.md](aml-backend/README.md) for the full list and setup
steps, including the five Atlas Search/Vector Search indexes to create.

Constraints worth knowing before you debug a failure:

- **The seed notebooks and the application code disagree on collection
  names, and always have.** The notebooks write `entities`, `relationships`,
  `transactionsv2`, and flat snake_case `customers`; the application queries
  `threatsightEntities`, `threatsightRelationships`, `fraudEvaluation`, and a
  restructured camelCase `customers` shape (see
  [models/customer.py](backend/models/customer.py)). A comment in
  [aml-backend/dependencies.py](aml-backend/dependencies.py) documents a real,
  dated "leafy_bank_bian migration" (2026-07-29) that renamed several
  collections; the seed notebooks were never updated to match. Run the two
  scripts under **Build and test commands** after seeding, or you'll get
  `total_count: 0` from endpoints despite the data being present.
- **`profileEmbedding`, not `embedding`.** The entity vector field the code
  actually queries (`hybrid_search_service.py`, `vector_search_repository.py`)
  is `profileEmbedding`. `models/database/collections.py`'s "legacy" config
  claims the field is `embedding` — that's stale, not a second real path.
- **The fraud-pattern vector index does not exist, on purpose.**
  `services/fraud_detection.py` documents this in a comment: the
  pattern-similarity code path has never been exercised, so building the
  index would enable untested behavior. Semantic fraud-pattern search
  currently falls back to a basic query.
- **`AWS_USE_SSO=true` works, but needs recent `boto3`/`botocore`.** AWS SSO
  sessions created through newer login flows use a credential type that the
  older `botocore` version `backend/pyproject.toml` pins cannot read even with
  `botocore[crt]` installed (`NoCredentialsError` at call time, not client
  creation time). `aml-backend/pyproject.toml` already pins a version that
  works.
- **`AML backend requires Python 3.10-3.12`, not 3.13.** `voyageai` (a
  transitive dependency) isn't compatible with 3.13+ yet, even though the
  fraud backend itself tolerates `>=3.10,<4.0`.
- **`get_voyage_embeddings()` in `aml-backend/services/agents/embeddings.py`
  has no callers.** Typology/policy lookup (`policy_tools.py`) uses
  `$regex`/`$or` text queries, not vector search. Voyage support is present
  but not wired into any live code path.

## MongoDB Skills

Use the official MongoDB agent skills from https://github.com/mongodb/agent-skills
whenever the task is MongoDB-specific and a matching skill exists.

## When To Use EDD.md

Use [EDD.md](./EDD.md) as the source of truth for the MongoDB data model in this repository.
For exhaustive per-collection schemas and index definitions, see
[docs/DATA_MODEL.md](docs/DATA_MODEL.md); EDD.md covers entities, relationships, and the
naming discrepancies above at a glance.

Consult [EDD.md](./EDD.md) before making changes that touch:

- MongoDB collections, document structure, or field names
- FastAPI routes that read or write database records
- Validation, form fields, API payloads, or UI that depend on persisted data
- Schema documentation, Mermaid diagrams, or entity modeling discussions
