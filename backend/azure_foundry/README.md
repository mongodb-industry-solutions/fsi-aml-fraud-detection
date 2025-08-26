# Azure AI Foundry Two-Stage Agent for Fraud Detection

A sophisticated fraud detection system that combines Azure AI Foundry's native AI agent capabilities with MongoDB Atlas vector search for intelligent, learning-based transaction analysis.

## 🏗️ Architecture Overview

This implementation follows a **two-stage architecture** designed for optimal performance and accuracy:

### Stage 1: Rules + Basic ML (Fast Triage)
- **Purpose**: Process 70-80% of transactions quickly with high confidence
- **Components**: Rule-based scoring + mock ML analysis  
- **Decision Logic**: Auto-approve (< 25 score) or Auto-block (> 85 score)
- **Performance**: Sub-second processing for clear cases

### Stage 2: Vector Search + AI Analysis (Deep Analysis)
- **Purpose**: Handle edge cases requiring nuanced analysis
- **Components**: Vector similarity search + Azure AI Foundry agent reasoning
- **Decision Logic**: AI-powered analysis with historical context
- **Performance**: Enhanced accuracy for complex fraud patterns

### Hybrid Memory Architecture
- **Azure AI Foundry Native**: Thread-based conversation memory (up to 100K messages)
- **MongoDB Atlas Vector Store**: Historical decision patterns and meta-learning
- **Integration**: Complementary systems working together, not replacing each other

## 📁 Component Structure

```
backend/azure_foundry/
├── README.md                    # This documentation
├── 
├── # Core Two-Stage Components
├── agent_core.py               # Main orchestrator - manages both stages
├── stage1_analyzer.py          # Rules + Basic ML analysis  
├── stage2_analyzer.py          # Vector + AI analysis
├── models.py                   # Data models and decision structures
├── config.py                   # Demo configuration and environment setup
├── demo_agent.py              # Complete demo with test cases
├── embeddings.py              # Azure OpenAI embeddings integration
├──
├── # Native Azure AI Foundry Integration
├── conversation/
│   └── native_conversation.py  # Native conversation patterns (no custom polling)
├── tools/
│   └── native_tools.py         # Standard FunctionTool implementation
├── memory/
│   └── mongodb_vector_store.py # MongoDB Atlas vector store (not memory replacement)
├── learning/
│   └── hybrid_learning_system.py # Hybrid learning combining native + MongoDB
├──
└── docs/                       # Implementation documentation
    ├── IMPLEMENTATION_PLAN.md   # Phase 1 implementation log
    ├── REVISED_ENHANCEMENT_PLAN.md # Phase 2 native Azure integration plan
    └── ADVANCED_ENHANCEMENT_PLAN.md # Historical enhancement plan
```

## 🚀 Quick Start

### Prerequisites

1. **Azure AI Foundry Project**:
   - Azure AI Foundry project endpoint
   - Azure OpenAI deployment (GPT-4o recommended)
   - Azure OpenAI embeddings deployment
   - **Authentication**: Azure CLI login required (`az login`)

2. **MongoDB Atlas**:
   - MongoDB Atlas cluster with vector search enabled
   - Collections: `transactions`, `agent_decision_history`, `fraud_learning_patterns`

3. **Python Environment**:
   ```bash
   cd backend
   poetry install  # Install all dependencies including Azure AI SDK
   ```

### Environment Configuration & Authentication

#### Step 1: Azure CLI Authentication
```bash
# Install Azure CLI (macOS with Homebrew)
brew install azure-cli

# Login to Azure (opens browser for authentication)
az login

# Switch to correct subscription if you have multiple
az account list
az account set --subscription "Your-Subscription-Name"
```

#### Step 2: Environment Variables
```bash
# Required Azure AI Foundry Variables
export AZURE_AI_PROJECT_ENDPOINT="https://your-project.services.ai.azure.com/api/projects/your-project"
export AZURE_OPENAI_DEPLOYMENT="gpt-4o"
export AZURE_OPENAI_EMBEDDING_DEPLOYMENT="text-embedding-ada-002"
export AZURE_OPENAI_ENDPOINT="https://your-openai.cognitiveservices.azure.com"
export AZURE_OPENAI_API_KEY="your-api-key"
export AZURE_OPENAI_EMBEDDING_API_VERSION="2023-05-15"

# Required MongoDB Variables  
export MONGODB_URI="mongodb+srv://username:password@cluster.mongodb.net/"
export DB_NAME="fsi-threatsight360"

# Optional Configuration
export AZURE_SUBSCRIPTION_ID="your-subscription-id"
export AZURE_RESOURCE_GROUP="your-resource-group"
```

**⚠️ Important Authentication Notes:**
- Azure AI Foundry Agents requires OAuth authentication (DefaultAzureCredential)
- API keys work for Azure OpenAI embeddings but NOT for agent creation
- You must be logged in via `az login` and in the correct subscription/tenant

### Running the Demo

```python
# Quick test of the two-stage agent
python backend/azure_foundry/demo_agent.py

# Expected output:
# ✅ Environment validation passed
# ✅ TwoStageAgentCore initialized successfully  
# 🔍 Running demo test cases...
# 
# Test 1: Low Risk Transaction
# Stage 1 → APPROVE (confidence: 85%, 45ms)
# 
# Test 2: High Risk Transaction  
# Stage 1 → BLOCK (confidence: 90%, 38ms)
# 
# Test 3: Edge Case Transaction
# Stage 1 → Escalate to Stage 2
# Stage 2 → AI Analysis → INVESTIGATE (confidence: 78%, 1.2s)
# 
# 📊 Performance Summary:
# Stage 1 efficiency: 67% (2/3 decisions)
# Average processing time: 0.43s
```

## 🔧 Core Components Deep Dive

### 1. TwoStageAgentCore (`agent_core.py`)

The main orchestrator that manages the entire fraud detection pipeline:

```python
from azure_foundry import TwoStageAgentCore
from azure_foundry.config import get_demo_agent_config

# Initialize agent
agent = TwoStageAgentCore(
    db_client=mongodb_client,
    config=get_demo_agent_config(),
    agent_name="demo_fraud_agent"
)
await agent.initialize()

# Analyze transaction
transaction_data = {
    "transaction_id": "txn_123",
    "customer_id": "customer_456", 
    "amount": 1500.00,
    "merchant": {"category": "electronics"},
    "location": {"country": "US"}
}

decision = await agent.analyze_transaction(transaction_data)
print(f"Decision: {decision.decision.value}")
print(f"Confidence: {decision.confidence:.2f}")
print(f"Risk Score: {decision.risk_score}/100")
print(f"Reasoning: {decision.reasoning}")
```

**Key Features**:
- Native Azure AI Foundry integration with OAuth authentication (DefaultAzureCredential)
- Automatic Stage 1 → Stage 2 routing based on configurable thresholds
- Performance metrics tracking and decision breakdown
- Fallback error handling with graceful degradation

### 2. Stage1Analyzer (`stage1_analyzer.py`)

Fast rule-based analysis with mock ML scoring:

```python
# Integrated automatically by TwoStageAgentCore
# Processes transactions with:
# - Amount-based risk scoring
# - Merchant category analysis  
# - Location-based adjustments
# - Time-based velocity checks
# - Combined rule + ML scoring (60/40 weight)
```

**Thresholds** (configurable):
- Auto-approve: < 25 score
- Auto-block: > 85 score  
- Stage 2 escalation: 25-85 score range

### 3. Stage2Analyzer (`stage2_analyzer.py`)

Advanced analysis using vector similarity and AI reasoning:

```python
# Features:
# - Integration with existing fraud_detection.py vector search
# - Azure AI Foundry native conversation handling  
# - AI recommendation extraction from natural language responses
# - Historical pattern analysis and insights
# - Thread-based conversation memory for context
```

**AI Analysis Process**:
1. Vector similarity search for similar transactions
2. Context building with Stage 1 results and similar cases
3. Azure AI Foundry agent analysis with native tools
4. AI recommendation extraction and confidence scoring
5. Final decision synthesis combining all factors

### 4. Native Azure AI Foundry Integration

#### Conversation Handler (`conversation/native_conversation.py`)

Uses Azure AI Foundry's native patterns instead of custom polling:

```python
class NativeConversationHandler:
    async def run_conversation_native(self, thread_id: str, message: str) -> str:
        # Add user message to thread
        self.agents_client.messages.create(
            thread_id=thread_id,
            role="user",
            content=message
        )
        
        # Use native create_and_process - handles tools automatically
        run = self.agents_client.runs.create_and_process(
            thread_id=thread_id,
            agent_id=self.agent_id
        )
        
        return self._extract_latest_response(thread_id)
```

#### Native Tools (`tools/native_tools.py`)

Standard Azure AI Foundry FunctionTool implementation:

```python
class FraudDetectionTools:
    def get_function_definitions(self) -> Set:
        def analyze_transaction_patterns(customer_id: str, lookback_days: int = 30) -> dict:
            """Analyze historical transaction patterns for anomalies."""
            return self._analyze_transaction_patterns_impl(customer_id, lookback_days)
        
        def check_sanctions_lists(entity_name: str, entity_type: str = "individual") -> dict:
            """Check entity against sanctions and watchlists."""
            return self._check_sanctions_lists_impl(entity_name, entity_type)
        
        def calculate_network_risk(customer_id: str, analysis_depth: int = 2) -> dict:
            """Calculate risk based on network connections.""" 
            return self._calculate_network_risk_impl(customer_id, analysis_depth)
        
        def search_similar_transactions(transaction_amount: float, merchant_category: str) -> dict:
            """Search for similar transactions using vector similarity."""
            return self._search_similar_transactions_impl(transaction_amount, merchant_category)
        
        return {analyze_transaction_patterns, check_sanctions_lists, calculate_network_risk, search_similar_transactions}
```

### 5. MongoDB Atlas Vector Store (`memory/mongodb_vector_store.py`)

Used correctly as a vector store for learning patterns, not as replacement for native memory:

```python
class MongoDBAtlasIntegration:
    async def store_agent_decision(self, agent_decision: Dict, transaction_data: Dict):
        """Store decision for meta-learning with vector embeddings."""
        decision_context = self._build_decision_context(agent_decision, transaction_data)
        decision_embedding = await get_embedding(decision_context)
        
        decision_record = {
            "decision_id": f"dec_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
            "agent_decision": agent_decision,
            "transaction_data": transaction_data, 
            "decision_embedding": decision_embedding,
            "metadata": {
                "transaction_amount": transaction_data.get('amount'),
                "merchant_category": transaction_data.get('merchant', {}).get('category'),
                "risk_level": agent_decision.get('risk_assessment')
            }
        }
        
        await self.decision_history_collection.insert_one(decision_record)
    
    async def retrieve_similar_decisions(self, current_transaction: Dict, limit: int = 5):
        """Use MongoDB Atlas vector search for similar past decisions."""
        search_embedding = await get_embedding(self._build_search_context(current_transaction))
        
        pipeline = [{
            "$vectorSearch": {
                "index": "decision_vector_index",
                "path": "decision_embedding", 
                "queryVector": search_embedding,
                "numCandidates": limit * 5,
                "limit": limit
            }
        }]
        
        return list(self.decision_history_collection.aggregate(pipeline))
```

### 6. Hybrid Learning System (`learning/hybrid_learning_system.py`)

Combines Azure native thread memory with MongoDB learning patterns:

```python
class HybridLearningSystem:
    async def enhance_transaction_analysis(self, transaction_data: Dict, stage1_result, thread_id: str):
        """Combine native Azure thread context with MongoDB learning insights."""
        
        # Step 1: Get Azure native thread context
        azure_context = await self._get_azure_thread_context(thread_id)
        
        # Step 2: Get MongoDB historical insights  
        mongodb_insights = await self._get_mongodb_learning_insights(transaction_data, stage1_result)
        
        # Step 3: Combine for hybrid analysis
        hybrid_context = self._combine_learning_contexts(azure_context, mongodb_insights, transaction_data)
        
        return {
            "azure_thread_context": azure_context,
            "mongodb_learning_insights": mongodb_insights, 
            "hybrid_analysis": hybrid_context,
            "learning_recommendations": await self._generate_learning_recommendations(hybrid_context)
        }
```

## ⚙️ Configuration

### Demo Configuration (`config.py`)

```python
def get_demo_agent_config() -> AgentConfig:
    return AgentConfig(
        # Azure AI Foundry settings
        project_endpoint=os.getenv("AZURE_AI_PROJECT_ENDPOINT"),
        model_deployment="gpt-4o",
        agent_temperature=0.3,
        
        # Demo-optimized thresholds
        stage1_auto_approve_threshold=25.0,  # < 25: immediate approval
        stage1_auto_block_threshold=85.0,    # > 85: immediate block
        
        # Demo behavior
        demo_mode=True,
        verbose_logging=True,
        mock_ml_scoring=True  # Use mock ML for demo reliability
    )
```

### Test Cases

The configuration includes pre-defined test cases for validation:

```python
DEMO_TEST_TRANSACTIONS = [
    {
        "transaction_id": "demo_001_low_risk",
        "amount": 45.99,
        "merchant_category": "restaurant", 
        "expected_stage": 1,
        "expected_decision": "APPROVE"
    },
    {
        "transaction_id": "demo_002_high_risk", 
        "amount": 9999.99,
        "merchant_category": "cash_advance",
        "expected_stage": 1,
        "expected_decision": "BLOCK"
    },
    {
        "transaction_id": "demo_003_edge_case",
        "amount": 1500.00,
        "merchant_category": "electronics",
        "expected_stage": 2, 
        "expected_decision": "INVESTIGATE"
    }
]
```

## 🔍 Data Models

### Core Decision Model (`models.py`)

```python
@dataclass
class AgentDecision:
    transaction_id: str
    decision: DecisionType  # APPROVE, INVESTIGATE, ESCALATE, BLOCK
    confidence: float       # 0-1
    risk_score: float      # 0-100
    risk_level: RiskLevel  # LOW, MEDIUM, HIGH, CRITICAL
    
    # Stage information
    stage_completed: int   # 1 or 2
    stage1_result: Optional[Stage1Result]
    stage2_result: Optional[Stage2Result]
    
    # Metadata
    reasoning: str
    total_processing_time_ms: float
    thread_id: Optional[str]  # Azure AI Foundry thread ID
    timestamp: datetime
```

### Decision Types & Risk Levels

```python
class DecisionType(Enum):
    APPROVE = "APPROVE"      # Low risk, proceed with transaction
    INVESTIGATE = "INVESTIGATE"  # Moderate risk, manual review
    ESCALATE = "ESCALATE"    # High risk, urgent attention  
    BLOCK = "BLOCK"         # Critical risk, block immediately

class RiskLevel(Enum):
    LOW = "LOW"         # < 40 score
    MEDIUM = "MEDIUM"   # 40-59 score  
    HIGH = "HIGH"       # 60-79 score
    CRITICAL = "CRITICAL"  # >= 80 score
```

## 📊 Performance Metrics

The system tracks comprehensive performance metrics:

```python
await agent.get_metrics()
# Returns:
{
    "agent_name": "demo_fraud_agent",
    "total_transactions": 150,
    "stage1_decisions": 105,           # 70% efficiency
    "stage2_decisions": 45,            # 30% requiring AI analysis
    "stage1_efficiency_percent": 70.0,
    "avg_processing_time_ms": 425.6,
    "avg_confidence": 0.847,
    "decision_breakdown": {
        "APPROVE": 89,
        "INVESTIGATE": 23, 
        "ESCALATE": 28,
        "BLOCK": 10
    },
    "native_enhancements_enabled": {
        "conversation_handler": True,
        "mongodb_vector_store": True, 
        "fraud_toolset": True
    }
}
```

## 🛠️ Integration with Existing Backend

### Fraud Detection Service Integration

The agent integrates seamlessly with the existing fraud detection service:

```python
# In agent_core.py initialization
from services.fraud_detection import FraudDetectionService

fraud_service = FraudDetectionService(self.db_client)
self.fraud_toolset = create_fraud_toolset(
    db_client=self.db_client,
    fraud_service=fraud_service
)
```

### MongoDB Collections Used

- **`transactions`**: Historical transaction data for pattern analysis
- **`agent_decision_history`**: Agent decisions with embeddings for learning
- **`fraud_learning_patterns`**: Discovered fraud patterns and effectiveness scores
- **`customer_insights`**: Customer behavioral profiles for personalized analysis

### Vector Search Indexes Required

```javascript
// MongoDB Atlas vector search indexes
{
  "name": "decision_vector_index",
  "type": "vectorSearch",
  "definition": {
    "fields": [{
      "type": "vector",
      "path": "decision_embedding",
      "numDimensions": 1536,  // Azure OpenAI text-embedding-ada-002
      "similarity": "cosine"
    }]
  }
}
```

## 🚀 Advanced Usage

### Custom Agent Configuration

```python
from azure_foundry.models import AgentConfig

custom_config = AgentConfig(
    project_endpoint="https://your-project.cognitiveservices.azure.com/",
    model_deployment="gpt-4o",
    agent_temperature=0.2,
    stage1_auto_approve_threshold=20.0,  # More conservative
    stage1_auto_block_threshold=90.0,     # Higher block threshold
    enable_thread_memory=True,
    max_thread_messages=50,
    demo_mode=False,                     # Production mode
    mock_ml_scoring=False               # Use real ML if available
)

agent = TwoStageAgentCore(db_client, config=custom_config)
```

### Streaming Analysis

```python
async def stream_analysis(transaction_data):
    """Stream real-time analysis results"""
    async for chunk in agent.analyze_transaction_streaming(transaction_data):
        print(f"Analysis chunk: {chunk}")
        # Process streaming results in real-time
```

### Learning from Outcomes

```python
# Update learning based on actual fraud outcomes
await agent.mongodb_vector_store.update_decision_outcome(
    transaction_id="txn_123",
    actual_outcome="confirmed_fraud",
    feedback_source="manual_review"
)

# Get learning insights
insights = await agent.hybrid_learning.get_learning_insights_for_context(
    transaction_data, context_window_days=30
)
```

## 🔐 Security Considerations

- **Azure Identity**: Uses `DefaultAzureCredential` for secure OAuth authentication (requires `az login`)
- **Authentication Method**: Azure CLI authentication preferred over API keys for agent operations
- **Dual Authentication**: API keys for Azure OpenAI embeddings, OAuth tokens for AI Foundry agents
- **Data Privacy**: No sensitive transaction data stored in logs
- **Thread Isolation**: Each transaction uses isolated Azure AI Foundry threads
- **Error Handling**: Graceful fallback without exposing internal details

## 🧪 Testing

### Environment Validation

```python
from azure_foundry.config import validate_environment

status = validate_environment()
if not status["valid"]:
    print("Missing required environment variables:")
    for var in status["missing_vars"]:
        print(f"  - {var}")
```

### Manual Testing

```python
# Test individual components
stage1 = Stage1Analyzer(db_client, config)
result = await stage1.analyze(transaction_input)
print(f"Stage 1 score: {result.combined_score}")
print(f"Needs Stage 2: {result.needs_stage2}")
```

## 📈 Monitoring & Observability

### Performance Monitoring

```python
# Get real-time performance metrics
metrics = await agent.get_metrics()
print(f"Stage 1 efficiency: {metrics['stage1_efficiency_percent']}%")
print(f"Average processing time: {metrics['avg_processing_time_ms']}ms")

# Monitor learning effectiveness
learning_status = await agent.hybrid_learning.get_hybrid_memory_status()
print(f"Learning effectiveness: {learning_status['learning_effectiveness_score']}")
```

### Debug Mode

Set `verbose_logging=True` in config for detailed processing logs:

```
2025-01-26 10:15:23 INFO     🔍 Analyzing transaction txn_123 ($1,500.00)
2025-01-26 10:15:23 INFO     Stage 1 complete - Score: 65.2, Needs Stage 2: True
2025-01-26 10:15:23 INFO     Proceeding to Stage 2 analysis for txn_123
2025-01-26 10:15:24 INFO     ✅ Found 3 similar transactions with 0.78 similarity
2025-01-26 10:15:25 INFO     Stage 2 complete - AI recommendation: INVESTIGATE
2025-01-26 10:15:25 INFO     ✅ Analysis complete: txn_123 → INVESTIGATE (Stage 2, 1,247ms)
```

## 🤝 Contributing

### Code Organization Principles

1. **Native First**: Use Azure AI Foundry native capabilities where possible
2. **Single Responsibility**: Each component has a clear, focused purpose  
3. **Defensive Programming**: Graceful error handling and fallback modes
4. **Demo Optimized**: Simplified for demonstration while maintaining core intelligence

### Adding New Tools

```python
# In tools/native_tools.py
def new_analysis_function(parameter: str) -> dict:
    """
    Description of what this tool does.
    
    Args:
        parameter: Description of parameter
        
    Returns:
        Dictionary with analysis results
    """
    # Implementation here
    return {"result": "analysis"}

# Add to function set in get_function_definitions()
```

### Extending Learning Capabilities

```python
# In learning/hybrid_learning_system.py  
async def new_learning_pattern(self, pattern_data: Dict):
    """Add new learning pattern type"""
    await self.mongodb_vector_store.store_learning_pattern(
        pattern_type="new_pattern_type",
        pattern_data=pattern_data,
        effectiveness_score=0.5
    )
```

## 📚 Additional Resources

- **Azure AI Foundry Documentation**: [Official Azure AI Foundry docs](https://docs.microsoft.com/azure/ai/)
- **MongoDB Atlas Vector Search**: [Vector search documentation](https://docs.atlas.mongodb.com/atlas-vector-search/)
- **Implementation Plan**: See `docs/IMPLEMENTATION_PLAN.md` for detailed development history
- **Native Integration Plan**: See `docs/REVISED_ENHANCEMENT_PLAN.md` for Azure native approach

## 🐛 Troubleshooting

### Common Issues

**1. Azure AI Project Endpoint Error**
```
ValueError: AZURE_AI_PROJECT_ENDPOINT environment variable is required
```
**Solution**: Set the correct Azure AI Foundry project endpoint URL

**2. MongoDB Connection Issues**
```
pymongo.errors.ServerSelectionTimeoutError
```
**Solution**: Verify MongoDB Atlas connection string and network access

**3. Agent Creation Failures**
```
AzureKeyCredential object has no attribute 'get_token'
HttpResponseError: (403) Insufficient permissions
```
**Solution**: 
- Azure AI Foundry Agents requires OAuth authentication, not API keys
- Run `az login` to authenticate with Azure CLI
- Ensure you're in the correct subscription: `az account set --subscription "Your-Subscription"`
- Verify Azure credentials have proper AI Foundry permissions

**4. Vector Index Missing**
```
OperationFailure: index not found: decision_vector_index
```
**Solution**: Create required MongoDB Atlas vector search indexes

### Debug Commands

```python
# Test Azure CLI authentication status
import subprocess
result = subprocess.run(['az', 'account', 'show'], capture_output=True, text=True)
print(f"Current Azure account: {result.stdout}")

# Test Azure AI Foundry connection (requires az login)
from azure_foundry.agent_core import TwoStageAgentCore
agent = TwoStageAgentCore(db_client)
await agent._init_azure_client()  # Should complete without error

# Test MongoDB connection  
from azure_foundry.memory.mongodb_vector_store import create_mongodb_vector_store
vector_store = create_mongodb_vector_store(db_client)
await vector_store.setup_vector_indexes()

# Test embeddings (uses API key authentication)
from azure_foundry.embeddings import get_embedding
embedding = await get_embedding("test text")
print(f"Embedding dimensions: {len(embedding)}")  # Should be 1536

# Test agent creation specifically
from azure.ai.agents import AgentsClient
from azure.identity import DefaultAzureCredential
credential = DefaultAzureCredential()
client = AgentsClient(endpoint="your-endpoint", credential=credential)
agent = client.create_agent(model="gpt-4o", name="test-agent")
print(f"Agent created: {agent.id}")
client.delete_agent(agent.id)  # Cleanup
```

---

## 📄 License

This implementation is part of the FSI AML/Fraud Detection demo system. See the main project README for license information.

## 🏷️ Version

**Current Version**: 1.2.0  
**Last Updated**: January 2025  
**Azure AI Foundry SDK**: Compatible with latest Azure AI SDK
**Python Requirements**: 3.8+