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
DB_NAME=fsi-threatsight360

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
```

### 3. MongoDB Atlas Search Setup

The AML backend requires MongoDB Atlas Search indexes for optimal performance:

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

## Usage Examples

### Entity Search with Filters

```bash
# Search entities by name with risk level filter
curl "http://localhost:8001/entities/search/unified?q=john&riskLevel=HIGH&limit=10"

# Autocomplete entity names
curl "http://localhost:8001/entities/search/autocomplete?q=joh&limit=5"

# Get available facets
curl "http://localhost:8001/entities/search/facets"
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

## Testing

The AML backend includes comprehensive test coverage using both unit tests and integration tests.

### Running Tests

```bash
# Run all tests
make test_all

# Individual test suites
make test_mongodb           # MongoDB connectivity and entities
make test_aml_api          # AML API endpoints
make test_entity_resolution # Entity resolution and Atlas Search

# Run tests directly
cd aml-backend
python test_models.py                    # Model validation tests
python test_repository_pattern.py       # Repository pattern tests
python test_embedding_generation.py     # AWS Bedrock embedding tests
python test_network_analysis.py         # Network analysis tests
```

### Test Coverage

- **MongoDB Integration**: Database connectivity, collection operations, indexing
- **API Endpoints**: All REST endpoints with various scenarios
- **Entity Resolution**: Fuzzy matching, confidence scoring, duplicate detection
- **Search Operations**: Atlas Search, Vector Search, autocomplete
- **Network Analysis**: Graph construction, traversal, relationship mapping
- **Repository Pattern**: Interface compliance, factory pattern, dependency injection

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
│   ├── search/                     # Search services
│   │   ├── entity_search_service.py # Unified entity search
│   │   ├── atlas_search_service.py # Atlas Search operations
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

### Configuration Tuning

```bash
# Environment variables for performance tuning
ATLAS_SEARCH_TIMEOUT=30000          # Atlas Search timeout (ms)
MAX_SEARCH_RESULTS=1000              # Maximum search results
VECTOR_SEARCH_LIMIT=100              # Vector search result limit
CONNECTION_POOL_SIZE=50              # MongoDB connection pool size
```

## Security Considerations

### Input Validation

- All inputs validated using Pydantic models
- SQL injection prevention through parameterized queries
- XSS protection with output encoding

### Authentication & Authorization

- CORS configuration for frontend integration
- Environment-based configuration for sensitive data
- AWS IAM roles for Bedrock access

### Data Protection

- Sensitive PII handling with field-level encryption options
- Audit trails for all entity modifications
- Compliance with data retention policies

## Deployment

### Docker Deployment

Create a `Dockerfile.aml-backend`:

```dockerfile
FROM python:3.10-slim

WORKDIR /app

# Install Poetry
RUN pip install poetry

# Copy dependency files
COPY pyproject.toml poetry.lock ./

# Configure Poetry and install dependencies
RUN poetry config virtualenvs.create false \
    && poetry install --no-dev --no-interaction --no-ansi

# Copy application code
COPY . .

# Expose port
EXPOSE 8001

# Start the application
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001"]
```

### Production Checklist

- [ ] Environment variables configured for production
- [ ] MongoDB Atlas production cluster configured
- [ ] Atlas Search indexes created and optimized
- [ ] AWS Bedrock access configured with appropriate IAM roles
- [ ] Logging level set appropriately (`INFO` or `WARNING`)
- [ ] Health check endpoints configured for load balancer
- [ ] Monitoring and alerting configured
- [ ] Backup and disaster recovery procedures in place

## Troubleshooting

### Common Issues

**MongoDB Connection Failed**

```bash
# Check connection string and network access
poetry run python -c "from dependencies import get_mongodb_access; print('Connected:', get_mongodb_access().admin.command('ping'))"
```

**Atlas Search Not Working**

- Verify search indexes are created and built
- Check index names match configuration
- Ensure documents are properly indexed

**AWS Bedrock Access Denied**

- Verify AWS credentials and permissions
- Check Bedrock service availability in your region
- Ensure IAM policies include Bedrock access

**Import Errors**

```bash
# Reinstall dependencies
poetry install --no-cache
```

### Debugging Tools

```bash
# Test entity resolution
curl -X POST "http://localhost:8001/entities/onboarding/find_matches" \
  -H "Content-Type: application/json" \
  -d '{"entity_name": "test", "entity_type": "INDIVIDUAL"}'

# Check search debug information
curl "http://localhost:8001/debug/search/test"

# Health check with details
curl "http://localhost:8001/health"
```

## Contributing

1. Follow the established clean architecture patterns
2. Add comprehensive tests for new features
3. Update documentation for API changes
4. Use type hints and docstrings for all functions
5. Follow the repository pattern for data access
6. Add integration tests for new endpoints

## Additional Resources

- [MongoDB Atlas Search Documentation](https://www.mongodb.com/docs/atlas/atlas-search/)
- [AWS Bedrock Documentation](https://docs.aws.amazon.com/bedrock/)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Poetry Documentation](https://python-poetry.org/docs/)
- [Pydantic Documentation](https://docs.pydantic.dev/)

## License

This project is licensed under the MIT License - see the [LICENSE](../LICENSE) file for details.
