# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

This is the **AML/KYC Backend** component of ThreatSight 360, a financial fraud detection system with dual-backend microservices architecture. This backend (port 8001) handles Anti-Money Laundering (AML) and Know Your Customer (KYC) compliance operations including entity management, intelligent entity resolution, and network analysis.

## Commands for Development

### Environment Setup
```bash
# Install dependencies using Poetry
poetry install

# Start development server (port 8001)
poetry run uvicorn main:app --host 0.0.0.0 --port 8001 --reload

# Or use Makefile commands from project root
make setup_aml    # Install dependencies
make dev_aml      # Start development server
```

### Testing Commands
```bash
# Test MongoDB connectivity and entity operations
make test_mongodb

# Test AML API endpoints
make test_aml_api

# Test entity resolution and Atlas Search functionality
make test_entity_resolution

# Test all AML backend functionality
make test_aml_all
```

### Linting and Formatting
```bash
make lint_aml     # Run basic Python linting
make format_aml   # Format code with black
```

## Architecture Patterns

### Clean Architecture with Three Layers

**1. Models Layer (Consolidated)**
- `models/core/`: Domain models (Entity, Resolution, Network, Relationship)
- `models/api/`: Request/Response models for API boundaries
- `models/database/`: MongoDB collection configurations and indexes
- **Key Pattern**: New consolidated model structure eliminates legacy compatibility layer

**2. Repository Layer (Data Access)**
- `repositories/interfaces/`: Abstract repository interfaces
- `repositories/impl/`: Concrete MongoDB implementations (PyMongo/Motor)
- `repositories/factory/`: Factory pattern for repository creation
- **Key Pattern**: Interface segregation with dependency injection

**3. Service Layer (Business Logic)**
- `services/core/`: Entity resolution, matching, confidence scoring
- `services/search/`: Atlas Search, Vector Search, Unified Search
- `services/network/`: Graph analysis and relationship mapping
- **Key Pattern**: Single responsibility with clean dependencies

### Database Architecture

**MongoDB Collections:**
- `entities`: Customer/organization entities with full-text search indexes
- `relationships`: Entity relationships with graph traversal optimization
- `resolution_history`: Audit trail for entity resolution decisions
- `audit_logs`: Comprehensive operation logging

**Atlas Search Indexes:**
- `entity_resolution_search`: Full-text search with faceting and autocomplete
- `entity_vector_search_index`: Vector similarity search for AI matching
- `transaction_vector_index`: Fraud pattern vector search

### Relationship Schema Requirements

**Critical Schema Structure** (as per relationship.md):
```python
# Relationship documents use these field names:
{
    "relationshipId": str,        # Unique identifier
    "source": {                   # Source entity reference
        "entityId": str,
        "entityType": str
    },
    "target": {                   # Target entity reference  
        "entityId": str,
        "entityType": str
    },
    "type": str,                  # Relationship type
    "direction": str,             # "bidirectional" or "directed"
    "strength": float,            # 0.0 to 1.0
    "confidence": float,          # 0.0 to 1.0
    "active": bool,               # Status flag
    "verified": bool,             # Verification status
    "evidence": [],               # Supporting evidence
    "datasource": str             # Data source
}
```

### Key Utilities and Patterns

**MongoDB Core Library** (`reference/mongodb_core_lib.py`):
- `MongoDBRepository`: Base repository with connection pooling
- `AggregationBuilder`: Fluent interface for pipeline construction
- `GraphOperations`: Specialized graph traversal utilities
- **Usage Pattern**: Always use fluent builders instead of raw pipeline arrays

**Service Dependencies** (`services/dependencies.py`):
- Centralized dependency injection for FastAPI
- Singleton pattern for repository instances
- Factory methods for service creation

**Route Organization**:
- `/routes/core/`: Core entity CRUD and resolution workflows
- `/routes/search/`: Multiple search strategies (Atlas, Vector, Unified)
- `/routes/network/`: Graph analysis and relationship mapping
- `/routes/debug/`: Development and debugging tools

## Field Name Conventions

**Critical**: The codebase has inconsistent field naming between database schema and Python models:

**Database Schema (MongoDB):**
- `entityType` (camelCase)
- `relationshipId` (camelCase)
- `createdAt`, `updatedAt` (camelCase)
- `riskAssessment.overall.level` (nested camelCase)

**Python Models (after cleanup):**
- Use schema field names directly in new consolidated models
- Legacy snake_case fields removed from relationship models
- Repository implementations must map field names correctly

## Common Development Tasks

### Adding New Entity Types
1. Update `EntityType` enum in `models/core/entity.py`
2. Modify Atlas Search index mappings if needed
3. Update entity validation logic in repositories
4. Add test cases in `test_mongodb_entities.py`

### Adding New Relationship Types
1. Update `RelationshipType` enum in `models/core/relationship.py`
2. Add relationship validation in relationship service
3. Update network analysis logic if needed
4. Test with `make test_network`

### Adding New Search Capabilities
1. Create new search service in `services/search/`
2. Add corresponding route in `routes/search/`
3. Update unified search service to include new strategy
4. Test with `make test_entity_resolution`

### Working with MongoDB Aggregations
**Always use** the fluent AggregationBuilder:
```python
# Correct pattern
pipeline = (self.repo.aggregation()
    .match({"entityType": "individual"})
    .project({"name": 1, "riskAssessment": 1})
    .sort({"createdAt": -1})
    .limit(50)
    .build())

# Avoid raw pipeline arrays
```

## Configuration Requirements

### Required Environment Variables
```bash
MONGODB_URI=mongodb+srv://...
DB_NAME=fsi-threatsight360
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1
ATLAS_SEARCH_INDEX=entity_resolution_search
ENTITY_VECTOR_INDEX=entity_vector_search_index
```

### MongoDB Atlas Setup Requirements
1. Atlas Search index: `entity_resolution_search` with faceting and autocomplete
2. Vector Search index: `entity_vector_search_index` for semantic matching
3. Proper index field mappings for entity types and risk levels
4. Change streams enabled for real-time updates

## Testing Patterns

**Integration Tests**: Focus on end-to-end workflows
- Entity creation and retrieval
- Atlas Search functionality
- Entity resolution matching
- Network relationship traversal

**Unit Tests**: Service and repository layer validation
- Repository interface compliance
- Service business logic
- Model validation and serialization

**Performance Tests**: Atlas Search and aggregation performance
- Search response times under load
- Complex aggregation pipeline performance
- Vector search similarity accuracy

## Key Dependencies

- **FastAPI**: Web framework with automatic OpenAPI documentation
- **Motor**: Async MongoDB driver for FastAPI compatibility
- **PyMongo**: Sync MongoDB driver for repository implementations
- **Pydantic**: Data validation and serialization
- **Boto3**: AWS Bedrock integration for AI features
- **Poetry**: Dependency management and virtual environments