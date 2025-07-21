# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

ThreatSight 360 is a comprehensive financial fraud detection system with a **dual-backend microservices architecture**:

- **Main Backend** (port 8000): Real-time fraud detection, transaction processing, risk assessment
- **AML Backend** (port 8001): AML/KYC compliance, entity resolution, network analysis  
- **Frontend** (port 3000): Next.js 15+ with MongoDB LeafyGreen UI components

## Essential Development Commands

### Quick Start
```bash
# Install Poetry (if needed)
make install_poetry

# Setup all components
make setup_all

# Start all services in development
make dev_all

# Or start individual services
make dev_fraud      # Main backend (port 8000)
make dev_aml        # AML backend (port 8001)  
make dev_frontend   # Frontend (port 3000)
```

### Testing Commands
```bash
# Test MongoDB connectivity
make test_mongodb

# Test AML API endpoints  
make test_aml_api

# Test entity resolution
make test_entity_resolution

# Run all tests
make test_all
```

### Frontend Commands
```bash
cd frontend
npm run dev    # Development server
npm run build  # Production build
npm run lint   # Run linter
npm start      # Production server (after build)
```

### Backend Commands
```bash
cd backend  # or cd aml-backend
poetry install                                      # Install dependencies
poetry run uvicorn main:app --reload --port 8000  # Development server
```

## Architecture & Code Structure

### Frontend Architecture (Next.js 15+)

**Key Components:**
- `app/`: Next.js App Router pages
  - `entities/`: Entity management UI with network visualization
  - `entity-resolution/`: AI-powered entity resolution workflows
  - `transaction-simulator/`: Interactive fraud testing
  - `risk-models/`: Risk model configuration
  
- `components/`: React components using LeafyGreen UI
  - `entities/NetworkGraphComponent.jsx`: Reagraph-based network visualization
  - `entities/EntityDetail.jsx`: Main entity detail view with tabs
  - `entityResolution/`: Resolution workflows and matching UI
  
- `lib/`: API client libraries
  - `aml-api.js`: AML backend integration (port 8001)
  - `mongodb.js`: Direct MongoDB connection

**Frontend State Management:**
- React hooks (useState, useEffect)
- No global state management library
- API data fetching with error boundaries

### Main Backend Architecture (FastAPI)

**Structure:**
- `models/`: Pydantic models for transactions, customers, fraud patterns
- `routes/`: API endpoints for fraud detection, risk assessment
- `services/`: Business logic including fraud detection algorithms
- `bedrock/`: AWS Bedrock AI integration for embeddings and analysis

**Key Services:**
- `fraud_detection.py`: Real-time transaction risk scoring
- `risk_model_service.py`: Dynamic risk model management

### AML Backend Architecture (Clean Architecture)

**Three-Layer Model Architecture:**
1. `models/core/`: Domain models (Entity, Resolution, Network, Relationship)
2. `models/api/`: Request/Response DTOs
3. `models/database/`: MongoDB collection schemas

**Repository Pattern:**
- `repositories/interfaces/`: Abstract repository contracts
- `repositories/impl/`: MongoDB implementations (Motor/PyMongo)
- `repositories/factory/`: Factory pattern for repository creation

**Service Layer:**
- `services/core/`: Entity resolution, matching, confidence scoring
- `services/search/`: Atlas Search, Vector Search, Unified Search
- `services/network/`: Graph analysis with NetworkAnalysisService

**MongoDB Core Library** (`reference/mongodb_core_lib.py`):
- Fluent aggregation builder pattern
- Connection pooling and management
- Graph operations utilities

## Critical Field Naming Conventions

**MongoDB Collections use camelCase:**
```javascript
{
  "entityId": "...",
  "entityType": "individual",
  "riskAssessment": {
    "overall": {
      "score": 75,
      "level": "high"
    }
  },
  "createdAt": "...",
  "updatedAt": "..."
}
```

**Relationship Schema** (CRITICAL - per relationship.md):
```javascript
{
  "relationshipId": "...",
  "source": { "entityId": "...", "entityType": "..." },
  "target": { "entityId": "...", "entityType": "..." },
  "type": "director_of",
  "direction": "bidirectional",  // or "directed"
  "strength": 0.8,
  "confidence": 0.9,
  "active": true,
  "verified": true
}
```

## Network Visualization (Cytoscape.js)

**Frontend Network Components:**
- `CytoscapeNetworkComponent.jsx`: Main network visualization using Cytoscape.js (replaced Reagraph)
- `cytoscape/dataTransformation.js`: Transforms backend data to Cytoscape format
- `cytoscape/cytoscapeStyles.js`: Node and edge styling for risk levels and relationship types
- `cytoscape/cytoscapeLayouts.js`: Layout algorithms (force-directed, hierarchical, circular)

**Critical Implementation Details:**
- **Bidirectional Relationships**: Create TWO separate directed edges for bidirectional display
- **Risk-based Styling**: Nodes colored by risk level (green=low, yellow=medium, red=high, dark red=critical)
- **Relationship Type Styling**: Edges styled by relationship type (corporate=blue, household=green, suspicious=red)

**Bidirectional Edge Handling:**
```javascript
// For bidirectional relationships, create two edges (one in each direction)
if (bidirectional) {
  elements.push({
    data: { id: edge.id, source: edge.source, target: edge.target, ...baseEdgeData },
    classes: 'directed'
  });
  elements.push({
    data: { id: edge.id + '_reverse', source: edge.target, target: edge.source, ...baseEdgeData },
    classes: 'directed'
  });
}
```

## MongoDB Atlas Requirements

**Required Indexes:**
- `entity_resolution_search`: Full-text search with faceting
- `entity_vector_search_index`: Vector similarity search
- `transaction_vector_index`: Fraud pattern vectors

**Atlas Search Features Used:**
- Faceted search with dynamic facets
- Autocomplete for entity names
- Vector search for semantic similarity
- Text search with fuzzy matching

## Environment Variables

```bash
# MongoDB
MONGODB_URI=mongodb+srv://...
DB_NAME=fsi-threatsight360

# AWS Bedrock
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1

# Atlas Search Indexes
ATLAS_SEARCH_INDEX=entity_resolution_search
ENTITY_VECTOR_INDEX=entity_vector_search_index
TRANSACTION_VECTOR_INDEX=transaction_vector_index

# Server Configuration
BACKEND_URL=http://localhost:8000
AML_BACKEND_URL=http://localhost:8001
```

## Common Development Patterns

### Adding New API Endpoints

**AML Backend:**
1. Define request/response models in `models/api/`
2. Create route in appropriate `routes/` subdirectory
3. Implement business logic in service layer
4. Use dependency injection for services

**Main Backend:**
1. Add Pydantic models in `models/`
2. Create route in `routes/`
3. Implement logic in `services/`

### Working with MongoDB Aggregations

**Always use the fluent builder pattern:**
```python
pipeline = (self.repo.aggregation()
    .match({"entityType": "individual"})
    .lookup("relationships", "entityId", "source.entityId", "connections")
    .project({"name": 1, "connections": 1})
    .sort({"createdAt": -1})
    .limit(50)
    .build())
```

### Frontend API Integration

**Use the established patterns in lib/:**
```javascript
// AML API calls
import { amlAPI } from '@/lib/aml-api';
const response = await amlAPI.searchEntities(searchParams);

// Error handling with useAMLAPIError hook
const { error, clearError } = useAMLAPIError();
```

## Performance Considerations

- Network graphs limited to 100-500 nodes for performance
- Use pagination for entity lists (20-50 items per page)
- Atlas Search queries optimized with proper indexes
- Vector search limited to top-K results (typically K=10-20)

## Testing Patterns

**Frontend Testing:**
- No test framework currently configured
- Manual testing through UI interactions
- API mocking not implemented

**Backend Testing:**
- Integration tests in `test_*.py` files
- Focus on MongoDB operations and API endpoints
- Use pytest for test execution

## Key Dependencies

**Frontend:**
- Next.js 15+ with App Router
- React 18.2
- MongoDB LeafyGreen UI (extensive component library)
- Cytoscape.js for network visualization
- Axios for API calls

**Backend (both):**
- FastAPI for REST APIs
- Motor/PyMongo for MongoDB
- AWS Bedrock for AI capabilities
- Poetry for dependency management
- Pydantic for data validation

## Network Analysis Implementation

### Backend Graph Operations

**Core Repository Methods:**
- `build_entity_network()`: Main network building using MongoDB $graphLookup
- `calculate_centrality_metrics()`: Multi-metric centrality analysis (degree, betweenness, closeness, eigenvector)
- `detect_hub_entities()`: Hub detection with influence scoring
- `propagate_risk_scores()`: Risk propagation with relationship type weighting
- `find_relationship_path()`: Shortest path finding between entities

**Advanced Graph Algorithms:**
- BFS for shortest paths and connected components
- Dijkstra's algorithm for weighted shortest paths
- Power iteration for eigenvector centrality
- Risk-weighted scoring using relationship type factors

### Frontend Network Visualization

**Component Structure:**
- `EntityDetail.jsx`: Main container with network analysis tab
- `CytoscapeNetworkComponent.jsx`: Cytoscape.js network renderer
- `AdvancedInvestigationPanel.jsx`: Advanced investigation results display

**Network Controls:**
- Network depth (1-4 degrees of separation)
- Minimum confidence filtering (0-100%)
- Advanced investigation with centrality analysis

## Risk Score Conventions

**CRITICAL**: All risk scores use 0-100 scale consistently throughout the system:

**Backend Risk Calculation:**
- `base_risk_score`: 0-100 (from MongoDB riskAssessment.overall.score)
- `connection_risk_factor`: 0-100 (converted from 0-1 internal calculation)
- `network_risk_score`: 0-100 (sum of base + connection, capped at 100)

**Risk Level Thresholds:**
- Critical: >= 80
- High: >= 60  
- Medium: >= 40
- Low: < 40

**Frontend Display:**
- All risk values displayed as percentages without additional conversion
- Risk level badges use consistent color coding (red=high, yellow=medium, green=low)

## Important Implementation Notes

### Network Analysis Recent Changes

**Migration to Native MongoDB Operations:**
- Replaced manual iterative graph building with MongoDB $graphLookup
- Achieved 95% MongoDB utilization (from 35% previously)
- Removed ~265 lines of legacy manual graph algorithms
- All network operations now use native MongoDB aggregation pipelines

**Cytoscape.js Integration:**
- Replaced Reagraph with Cytoscape.js for better performance and control
- Custom data transformation handles bidirectional relationships correctly
- Risk-based styling and relationship type categorization implemented
- Supports interactive features (zoom, pan, selection, context menus)

**Risk Propagation Analysis:**
- Comprehensive risk analysis panels implemented
- Shows network risk breakdown with MongoDB operation visibility
- Advanced investigation results with tabbed interface
- All calculations use consistent 0-100 risk score scale

### Common Pitfalls to Avoid

1. **Risk Score Scale Confusion**: Always use 0-100 scale, never multiply by 100 if already in percentage
2. **Field Name Inconsistency**: Use camelCase for MongoDB fields, snake_case for Python variables
3. **Bidirectional Edge Display**: Always create two separate directed edges for bidirectional relationships
4. **MongoDB Aggregation**: Always use fluent AggregationBuilder pattern, avoid raw pipeline arrays
5. **Component Circular Imports**: Pass components as props to avoid webpack module resolution errors