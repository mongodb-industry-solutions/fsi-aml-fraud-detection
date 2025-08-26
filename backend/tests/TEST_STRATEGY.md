# Azure AI Foundry Two-Stage Agent - Test Strategy Plan

## Overview
Comprehensive testing strategy for the enhanced Azure AI Foundry two-stage fraud detection agent implementation. Tests progress from basic component validation to full integration testing.

## Test Categories

### 1. **Basic Component Tests** (Level 1) ⭐
**Goal**: Verify individual components work in isolation
**Files**: `test_01_basic_components.py`

- ✅ Azure AI Foundry client initialization
- ✅ Azure embeddings service connectivity
- ✅ MongoDB connection and basic operations
- ✅ Environment variable loading
- ✅ Import validation for all new modules

### 2. **Azure AI Foundry Integration Tests** (Level 2) ⭐⭐
**Goal**: Test Azure AI Foundry native capabilities
**Files**: `test_02_azure_integration.py`

- ✅ AgentsClient initialization with real credentials
- ✅ Thread creation and management
- ✅ Agent creation with FunctionTool integration
- ✅ Message creation and basic conversation flow
- ✅ Native conversation handler functionality

### 3. **Tools and Functions Tests** (Level 3) ⭐⭐
**Goal**: Validate fraud detection tools and functions
**Files**: `test_03_tools_functions.py`

- ✅ FraudDetectionTools initialization
- ✅ Each fraud function individual testing:
  - `analyze_transaction_patterns`
  - `check_sanctions_lists`
  - `calculate_network_risk`
  - `search_similar_transactions`
- ✅ FunctionTool creation and registration
- ✅ Tool response format validation

### 4. **Vector Store and Memory Tests** (Level 4) ⭐⭐⭐
**Goal**: Test MongoDB Atlas vector store and learning capabilities
**Files**: `test_04_vector_memory.py`

- ✅ MongoDB Atlas vector store initialization
- ✅ Vector index setup simulation
- ✅ Decision storage with Azure embeddings
- ✅ Similar decision retrieval
- ✅ Learning pattern storage
- ✅ Hybrid memory system functionality

### 5. **Agent Core Integration Tests** (Level 5) ⭐⭐⭐⭐
**Goal**: Test enhanced agent core with native patterns
**Files**: `test_05_agent_core.py`

- ✅ TwoStageAgentCore initialization with enhancements
- ✅ Stage 1 analysis (rules + ML)
- ✅ Stage 2 analysis (vector search + AI)
- ✅ Native conversation integration
- ✅ Learning pattern storage during analysis
- ✅ Thread management and caching

### 6. **End-to-End Workflow Tests** (Level 6) ⭐⭐⭐⭐⭐
**Goal**: Full fraud detection workflow testing
**Files**: `test_06_e2e_workflow.py`

- ✅ Complete transaction analysis workflow
- ✅ Decision making with AI recommendations
- ✅ Learning from decisions
- ✅ Metrics and performance tracking
- ✅ Error handling and graceful degradation

## Test Implementation Strategy

### Phase 1: Foundation Testing
1. **Start Simple**: Basic component tests first
2. **Validate Setup**: Ensure all credentials and connections work
3. **Build Confidence**: Each test builds on previous success

### Phase 2: Integration Testing
4. **Azure Native Features**: Test Azure AI Foundry capabilities
5. **Business Logic**: Fraud detection functions and tools
6. **Learning Systems**: Vector store and memory integration

### Phase 3: Comprehensive Testing
7. **Agent Core**: Full agent functionality
8. **End-to-End**: Complete workflows and edge cases
9. **Performance**: Load testing and optimization

## Test Data Strategy

### Mock Transaction Data
```python
SAMPLE_TRANSACTIONS = [
    {
        "transaction_id": "txn_001",
        "customer_id": "cust_12345",
        "amount": 1500.00,
        "currency": "USD",
        "merchant": {"category": "restaurant", "name": "Joe's Diner"},
        "location": {"country": "US", "city": "New York"},
        "timestamp": "2025-01-26T15:30:00Z"
    },
    {
        "transaction_id": "txn_002", 
        "customer_id": "cust_67890",
        "amount": 15000.00,  # High amount - suspicious
        "currency": "USD",
        "merchant": {"category": "online", "name": "Suspicious Store"},
        "location": {"country": "RU", "city": "Moscow"},  # Unusual location
        "timestamp": "2025-01-26T15:35:00Z"
    }
]
```

### Expected Outcomes
- **Low Risk Transaction**: Stage 1 approval (txn_001)
- **High Risk Transaction**: Stage 2 analysis with AI reasoning (txn_002)
- **Learning**: Both decisions stored for meta-learning

## Test Environment Requirements

### Required Environment Variables
```bash
# MongoDB
MONGODB_URI=mongodb+srv://...
DB_NAME=fsi-threatsight360

# Azure AI Foundry
PROJECT_ENDPOINT=https://...
AZURE_AI_API_KEY=...
INFERENCE_ENDPOINT=https://...
EMBEDDING_MODEL=text-embedding-ada-002

# Agent Configuration
AGENT_MODEL_DEPLOYMENT=gpt-4o
DEMO_MODE=true
```

### Test Database Strategy
- **Isolated Collections**: Use test-specific collection names
- **Cleanup**: Each test cleans up after itself
- **Non-destructive**: Tests don't affect production data

## Success Criteria

### Level 1 (Basic): ✅ All Components Initialize
- All imports work
- Connections established
- Environment loaded

### Level 2 (Integration): ✅ Azure Features Work
- Agent creation successful
- Thread management functional
- Basic conversations work

### Level 3 (Functions): ✅ Business Logic Validated
- All fraud functions execute
- Reasonable outputs generated
- Error handling works

### Level 4 (Memory): ✅ Learning Systems Functional
- Vector storage works
- Similarity search functional
- Decision history tracked

### Level 5 (Agent): ✅ Enhanced Agent Operational
- Two-stage analysis complete
- Native patterns integrated
- Metrics collected

### Level 6 (E2E): ✅ Production Ready
- Full workflows successful
- Performance acceptable
- Error recovery robust

## Test Execution Plan

### Sequential Execution
```bash
# Run tests in order, stopping on first failure
cd backend
poetry run python -m pytest tests/azure_foundry/test_01_basic_components.py -v
poetry run python -m pytest tests/azure_foundry/test_02_azure_integration.py -v
poetry run python -m pytest tests/azure_foundry/test_03_tools_functions.py -v
poetry run python -m pytest tests/azure_foundry/test_04_vector_memory.py -v
poetry run python -m pytest tests/azure_foundry/test_05_agent_core.py -v
poetry run python -m pytest tests/azure_foundry/test_06_e2e_workflow.py -v
```

### Parallel Execution (Once All Pass)
```bash
# Run all tests for continuous validation
poetry run python -m pytest tests/azure_foundry/ -v --tb=short
```

## Test Implementation Priority

1. **🟢 IMMEDIATE**: Level 1 (Basic Components)
2. **🟡 HIGH**: Level 2 (Azure Integration) 
3. **🟡 HIGH**: Level 3 (Tools/Functions)
4. **🟠 MEDIUM**: Level 4 (Vector/Memory)
5. **🔴 COMPLEX**: Level 5 (Agent Core)
6. **🔴 COMPREHENSIVE**: Level 6 (End-to-End)

Let's start with Level 1 basic component testing and build up systematically!