# ThreatSight 360 - AML/KYC Backend

![MongoDB](https://img.shields.io/badge/MongoDB-%234ea94b.svg?style=for-the-badge&logo=mongodb&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi)
![Python](https://img.shields.io/badge/python-3670A0?style=for-the-badge&logo=python&logoColor=ffdd54)
![AWS](https://img.shields.io/badge/AWS-%23FF9900.svg?style=for-the-badge&logo=amazon-aws&logoColor=white)

**Advanced Anti-Money Laundering (AML) and Know Your Customer (KYC) Backend Service**

In today's complex regulatory environment, financial institutions must maintain robust AML/KYC systems for compliance and risk management. This backend service provides comprehensive entity management, intelligent resolution, and relationship analysis capabilities designed specifically for financial services compliance operations.

The AML/KYC backend leverages MongoDB Atlas Search, AWS Bedrock AI services, and advanced graph analytics to deliver real-time entity resolution, fuzzy matching, and network analysis capabilities that scale with your compliance operations.

## Key Features

- **🔍 Intelligent Entity Resolution**: AI-powered fuzzy matching and duplicate detection using MongoDB Atlas Search
- **🌐 Network Analysis**: Relationship mapping and connected component analysis for compliance investigations
- **⚡ Real-time Search**: Multi-strategy search with Atlas Search, Vector Search, and Unified Search
- **🎯 Risk Assessment**: Comprehensive entity risk scoring and watchlist matching
- **🔗 Relationship Management**: Entity relationship tracking with audit trails
- **📊 Advanced Analytics**: Performance metrics and search analytics
- **🏗️ Clean Architecture**: Repository pattern with dependency injection and comprehensive testing

## Architecture Overview

The AML backend follows a **clean architecture pattern** with three-layer organization:

### **Models Layer** (Consolidated Architecture)

- **`models/core/`**: Domain models (Entity, Resolution, Network)
- **`models/api/`**: Request/Response models for API boundaries
- **`models/database/`**: Database collection configurations
- **`models/legacy_compatibility.py`**: Migration support with deprecation warnings

### **Repository Layer** (Data Access Abstraction)

- **Interface-driven**: Abstract interfaces in `repositories/interfaces/`
- **Factory Pattern**: Centralized repository creation in `repositories/factory/`
- **Dual MongoDB Support**: Both sync (PyMongo) and async (Motor) drivers
- **Singleton Pattern**: Shared connection pooling

### **Service Layer** (Business Logic)

- **Core Services**: Entity resolution, matching, confidence scoring
- **Search Services**: Atlas Search, Vector Search, Unified Search
- **Network Services**: Graph analysis and relationship mapping
- **Dependencies**: Clean FastAPI dependency injection

### **Route Organization** (API Layer)

- **Core Routes**: `/routes/core/` - Entity CRUD and resolution workflows
- **Search Routes**: `/routes/search/` - Multiple search strategies
- **Network Routes**: `/routes/network/` - Graph analysis
- **Debug Routes**: `/routes/debug/` - Development tools

## Prerequisites

Before you begin, ensure you have the following:

- **Python 3.10+**: Required for the backend service
- **Poetry**: For dependency management and virtual environments
- **MongoDB Atlas Account**: For data storage and Atlas Search capabilities
- **AWS Account with Bedrock Access**: For AI-powered entity resolution features
- **Docker (Optional)**: For containerized deployment

## Quick Start

### 1. Installation

Navigate to the AML backend directory and install dependencies:

```bash
cd aml-backend
poetry install
```

### 2. Environment Configuration

Create a `.env` file in the `aml-backend` directory:

```bash
# MongoDB Connection
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/
DB_NAME=threatsight360

# AWS Bedrock Credentials (for AI features)
AWS_ACCESS_KEY_ID=your_aws_access_key_here
AWS_SECRET_ACCESS_KEY=your_aws_secret_key_here
AWS_REGION=us-east-1

# Server Configuration
HOST=0.0.0.0
PORT=8001

# Frontend URL for CORS
FRONTEND_URL=http://localhost:3000

# Atlas Search Configuration
ATLAS_SEARCH_INDEX=entity_search_index_v2
ENTITY_VECTOR_INDEX=entity_vector_search_index
ENTITY_IDENTIFIER_VECTOR_INDEX=entity_identifier_vector_index
ENTITY_BEHAVIORAL_VECTOR_INDEX=entity_behavioral_vector_index
```

### 3. MongoDB Atlas Search Setup

The AML backend requires MongoDB Atlas Search indexes for optimal performance

#### Entity Resolution Search Index

Create an Atlas Search index named `entity_resolution_search`:

```json
{
  "mappings": {
    "dynamic": false,
    "fields": {
      "name": {
        "type": "document",
        "fields": {
          "full": [
            {
              "type": "string",
              "analyzer": "lucene.standard"
            },
            {
              "type": "autocomplete",
              "tokenization": "edgeGram",
              "minGrams": 2,
              "maxGrams": 15,
              "foldDiacritics": true
            }
          ],
          "aliases": {
            "type": "string",
            "analyzer": "lucene.standard"
          }
        }
      },
      "entityType": {
        "type": "stringFacet"
      },
      "nationality": {
        "type": "stringFacet"
      },
      "residency": {
        "type": "stringFacet"
      },
      "jurisdictionOfIncorporation": {
        "type": "stringFacet"
      },
      "riskAssessment": {
        "type": "document",
        "fields": {
          "overall": {
            "type": "document",
            "fields": {
              "level": {
                "type": "stringFacet"
              },
              "score": {
                "type": "numberFacet",
                "boundaries": [0.0, 15.0, 25.0, 50.0, 100.0]
              }
            }
          }
        }
      },
      "customerInfo": {
        "type": "document",
        "fields": {
          "businessType": {
            "type": "stringFacet"
          }
        }
      },
      "addresses": {
        "type": "document",
        "fields": {
          "structured": {
            "type": "document",
            "fields": {
              "country": {
                "type": "string",
                "analyzer": "lucene.keyword"
              },
              "city": {
                "type": "string",
                "analyzer": "lucene.keyword"
              }
            }
          },
          "full": {
            "type": "string",
            "analyzer": "lucene.standard"
          }
        }
      },
      "identifiers": {
        "type": "document",
        "fields": {
          "type": {
            "type": "string",
            "analyzer": "lucene.keyword"
          },
          "value": {
            "type": "string",
            "analyzer": "lucene.standard"
          }
        }
      },
      "scenarioKey": {
        "type": "string",
        "analyzer": "lucene.keyword"
      }
    }
  }
}
```

#### Vector Search Index (Optional)

For semantic similarity search, create a vector search index named `entity_vector_search_index`:

```json
{
  "type": "vectorSearch",
  "fields": [
    {
      "type": "vector",
      "path": "embedding",
      "numDimensions": 1536,
      "similarity": "cosine"
    }
  ]
}
```

### 4. Start the Server

Launch the AML backend server:

```bash
# Development mode with auto-reload
poetry run uvicorn main:app --host 0.0.0.0 --port 8001 --reload

# Production mode
poetry run uvicorn main:app --host 0.0.0.0 --port 8001
```

The API will be available at [http://localhost:8001](http://localhost:8001)

> [!Note]
> For comprehensive entity data generation, use the [Entity Resolution Synthetic Data Generation notebook](../docs/ThreatSight%20360%20-%20Entity%20Resolution%20Synthetic%20Data%20Generation.ipynb) in [Google Colab](https://colab.research.google.com/) to populate your database with realistic AML/KYC test data including entities, relationships, and risk profiles.

## API Endpoints

### 🏠 System Endpoints

| Endpoint  | Method | Description                             |
| --------- | ------ | --------------------------------------- |
| `/`       | GET    | Service status and feature overview     |
| `/health` | GET    | Health check with database connectivity |
| `/test`   | GET    | Simple connectivity test                |
| `/docs`   | GET    | Interactive API documentation (Swagger) |

### 👥 Core Entity Management

| Endpoint                            | Method | Description                                         |
| ----------------------------------- | ------ | --------------------------------------------------- |
| `/entities/`                        | GET    | List entities with pagination and filtering         |
| `/entities/{entity_id}`             | GET    | Get detailed entity information                     |
| `/entities/onboarding/find_matches` | POST   | Find potential duplicate entities during onboarding |
| `/entities/resolve`                 | POST   | Merge entities after resolution                     |

### 🔍 Search Operations

| Endpoint                        | Method | Description                          |
| ------------------------------- | ------ | ------------------------------------ |
| `/entities/search/unified`      | GET    | Unified multi-strategy entity search |
| `/entities/search/autocomplete` | GET    | Real-time autocomplete suggestions   |
| `/entities/search/facets`       | GET    | Available facet filters with counts  |
| `/search/atlas/{query}`         | GET    | Atlas Search with fuzzy matching     |
| `/search/vector/{query}`        | GET    | Vector similarity search             |
| `/search/unified/{query}`       | GET    | Combined Atlas and Vector search     |

### 🌐 Network Analysis

| Endpoint                                         | Method | Description                    |
| ------------------------------------------------ | ------ | ------------------------------ |
| `/network/{entity_id}`                           | GET    | Entity relationship network    |
| `/network/{entity_id}/connected`                 | GET    | Connected component analysis   |
| `/network/{entity_id}/shortest_path/{target_id}` | GET    | Shortest path between entities |

### 🔗 Relationship Management

| Endpoint                           | Method | Description               |
| ---------------------------------- | ------ | ------------------------- |
| `/relationships/`                  | GET    | List entity relationships |
| `/relationships/`                  | POST   | Create new relationship   |
| `/relationships/{relationship_id}` | GET    | Get relationship details  |
| `/relationships/{relationship_id}` | PUT    | Update relationship       |
| `/relationships/{relationship_id}` | DELETE | Delete relationship       |

## Data Models

### Core Entity Model

```json
{
  "entityId": "ENT_12345",
  "entityType": "INDIVIDUAL",
  "name": {
    "full": "John Smith",
    "structured": {
      "first": "John",
      "middle": "",
      "last": "Smith"
    },
    "aliases": ["Johnny Smith", "J. Smith"]
  },
  "dateOfBirth": "1985-03-15T00:00:00Z",
  "addresses": [
    {
      "structured": {
        "street": "123 Main St",
        "city": "New York",
        "state": "NY",
        "country": "US",
        "postalCode": "10001"
      },
      "full": "123 Main St, New York, NY 10001, US",
      "type": "RESIDENTIAL"
    }
  ],
  "identifiers": [
    {
      "type": "SSN",
      "value": "123-45-6789",
      "country": "US"
    }
  ],
  "riskAssessment": {
    "overall": {
      "score": 25.5,
      "level": "MEDIUM"
    },
    "factors": {
      "pep": false,
      "sanctions": false,
      "adverseMedia": false
    }
  },
  "watchlistMatches": [],
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-15T10:30:00Z"
}
```

### Entity Resolution Response

```json
{
  "success": true,
  "matches": [
    {
      "entityId": "ENT_67890",
      "confidence": 0.85,
      "reasons": [
        "Exact name match",
        "Partial address match",
        "Identifier similarity"
      ],
      "entityData": { ... }
    }
  ],
  "totalMatches": 1,
  "searchMetadata": {
    "searchType": "atlas_entity_search",
    "processingTimeMs": 45,
    "confidenceThreshold": 0.7
  }
}
```

### Network Analysis Response

```json
{
  "success": true,
  "data": {
    "nodes": [
      {
        "id": "ENT_12345",
        "type": "INDIVIDUAL",
        "name": "John Smith",
        "riskLevel": "MEDIUM"
      }
    ],
    "edges": [
      {
        "source": "ENT_12345",
        "target": "ENT_67890",
        "relationship": "FAMILY_MEMBER",
        "strength": 0.8
      }
    ],
    "statistics": {
      "totalNodes": 15,
      "totalEdges": 23,
      "connectedComponents": 3,
      "maxDepth": 4
    }
  }
}
```

### Entity Resolution

```bash
# Find potential matches for new entity
curl -X POST "http://localhost:8001/entities/onboarding/find_matches" \
  -H "Content-Type: application/json" \
  -d '{
    "entity_name": "John Smith",
    "entity_type": "INDIVIDUAL",
    "address": "123 Main St, New York, NY",
    "fuzzy_matching": true,
    "limit": 10
  }'
```

### Network Analysis

```bash
# Get entity network
curl "http://localhost:8001/network/ENT_12345?depth=2"

# Find connected entities
curl "http://localhost:8001/network/ENT_12345/connected"

# Shortest path between entities
curl "http://localhost:8001/network/ENT_12345/shortest_path/ENT_67890"
```

## Project Structure

```
aml-backend/
├── main.py                          # FastAPI application entry point
├── dependencies.py                  # FastAPI dependencies and configuration
├── pyproject.toml                   # Poetry dependencies and project config
├── .env.example                     # Environment variables template
├── README.md                        # This file
├── ARCHITECTURE_ANALYSIS.md         # Architecture documentation
│
├── models/                          # Consolidated data models
│   ├── core/                       # Domain models
│   │   ├── entity.py               # Entity models and validation
│   │   ├── resolution.py           # Resolution result models
│   │   ├── network.py              # Network analysis models
│   │   └── relationship.py         # Relationship models
│   ├── api/                        # Request/Response models
│   │   ├── requests.py             # API request models
│   │   ├── responses.py            # API response models
│   │   └── entity_list.py          # Entity listing models
│   ├── database/                   # Database configuration
│   │   └── collections.py          # Collection schemas
│   └── legacy_compatibility.py     # Migration support
│
├── repositories/                    # Data access layer
│   ├── interfaces/                 # Abstract repository interfaces
│   │   ├── entity_repository.py    # Entity data access interface
│   │   ├── relationship_repository.py # Relationship interface
│   │   ├── vector_search_repository.py # Vector search interface
│   │   └── network_repository.py   # Network analysis interface
│   ├── impl/                       # Repository implementations
│   │   ├── entity_repository.py    # MongoDB entity implementation
│   │   ├── atlas_search_repository.py # Atlas Search implementation
│   │   ├── vector_search_repository.py # Vector search implementation
│   │   ├── relationship_repository.py # Relationship implementation
│   │   └── network_repository.py   # Network analysis implementation
│   └── factory/                    # Repository factory pattern
│       └── repository_factory.py   # Centralized repository creation
│
├── services/                       # Business logic layer
│   ├── core/                       # Core business services
│   │   ├── entity_resolution_service.py # Entity resolution logic
│   │   ├── matching_service.py     # Matching algorithms
│   │   ├── confidence_service.py   # Confidence scoring
│   │   ├── merge_service.py        # Entity merging logic
│   │   └── relationship_service.py # Relationship management
│   ├── search/                     # Search service
│   │   ├── entity_search_service.py # Unified entity search
│   │   ├── atlas_search_service.py # Atlas Search operation
│   │   ├── vector_search_service.py # Vector similarity search
│   │   └── unified_search_service.py # Combined search strategies
│   ├── network/                    # Network analysis services
│   │   └── network_analysis_service.py # Graph analysis
│   └── dependencies.py             # Service dependency injection
│
├── routes/                         # API endpoints
│   ├── core/                       # Core entity operations
│   │   ├── entities.py             # Entity CRUD endpoints
│   │   └── entity_resolution.py    # Resolution endpoints
│   ├── search/                     # Search endpoints
│   │   ├── entity_search.py        # Unified entity search
│   │   ├── atlas_search.py         # Atlas Search endpoints
│   │   ├── vector_search.py        # Vector search endpoints
│   │   └── unified_search.py       # Combined search endpoints
│   ├── network/                    # Network analysis endpoints
│   │   └── network_analysis.py     # Graph analysis endpoints
│   ├── debug/                      # Development and debug endpoints
│   │   └── search_debug.py         # Search debugging tools
│   └── relationships_updated.py    # Relationship management
│
├── reference/                      # Reference implementations
│   ├── mongodb_core_lib.py         # Core MongoDB utilities
│   └── entity_resolution_implementation.md # Implementation guide
│
├── bedrock/                        # AWS Bedrock integration
│   ├── client.py                   # Bedrock client setup
│   └── embeddings.py               # Embedding generation
│
├── utils/                          # Utility modules
│   └── atlas_search_builder.py     # Atlas Search query builder
│
└── db/                             # Database utilities
    └── mongo_db.py                 # MongoDB connection management
```

## Performance Optimization

### MongoDB Indexes

Ensure the following indexes are created for optimal performance:

```javascript
// Entity indexes
db.entities.createIndex({ entityId: 1 });
db.entities.createIndex({ 'name.full': 'text' });
db.entities.createIndex({
  entityType: 1,
  'riskAssessment.overall.level': 1,
});
db.entities.createIndex({
  'identifiers.value': 1,
  'identifiers.type': 1,
});

// Relationship indexes
db.entity_relationships.createIndex({ source_entity_id: 1 });
db.entity_relationships.createIndex({ target_entity_id: 1 });
db.entity_relationships.createIndex({ relationship_type: 1 });
```

## Deployment

### Docker Deployment

Create a `Dockerfile.aml-backend`:

```dockerfile
FROM python:3.10-slim-buster

ENV GET_POETRY_IGNORE_DEPRECATION=1

WORKDIR /

# Poetry dependencies
COPY aml-backend/pyproject.toml aml-backend/poetry.lock ./

# Poetry installation
RUN pip install poetry==1.8.4

# Poetry config & install dependencies
RUN poetry config virtualenvs.create true
RUN poetry config virtualenvs.in-project true
RUN rm -rf .venv  # Remove any copied local venv
RUN poetry lock --no-update
RUN poetry install --no-interaction -v --no-cache --no-root

COPY ./aml-backend/ .

EXPOSE 8001

CMD ["poetry", "run", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001"]
```

## Related Documentation

- [Root README](../README.md) -- Full project overview and setup
- [Solution Architecture](../docs/SOLUTION_ARCHITECTURE.md) -- System architecture diagrams
- [Agentic System Overview](../docs/AGENTIC_SYSTEM_OVERVIEW.md) -- All AI agent capabilities
- [Investigation Pipeline](../docs/AGENTIC_INVESTIGATION_PIPELINE.md) -- LangGraph SAR pipeline deep-dive
- [Copilot Architecture](../docs/COPILOT_ARCHITECTURE.md) -- ReAct chat agent and artifact system
- [Data Model](../docs/DATA_MODEL.md) -- MongoDB collections, indexes, and schemas
- [Fraud Backend](../backend/README.md) -- Companion fraud detection service
- [Frontend](../frontend/README.md) -- Next.js UI application
- [Hybrid Search Scoring](HYBRID_SEARCH_SCORE_CALCULATION_INSIGHTS.md) -- $rankFusion score calculation
- [Entity Resolution](reference/entity_resolution_implementation.md) -- Entity resolution system design

## Additional Resources

- [MongoDB Atlas Search Documentation](https://www.mongodb.com/docs/atlas/atlas-search/)
- [AWS Bedrock Documentation](https://docs.aws.amazon.com/bedrock/)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Poetry Documentation](https://python-poetry.org/docs/)
- [Pydantic Documentation](https://docs.pydantic.dev/)

## License

This project is licensed under the MIT License - see the [LICENSE](../LICENSE) file for details.
