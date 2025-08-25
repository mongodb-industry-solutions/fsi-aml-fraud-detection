# Transaction Agent Documentation

## Overview

The **Simplified Multi-Stage Transaction Monitoring System** is an AI-powered, agentic fraud detection system that uses progressive investigation to monitor financial transactions for money laundering and fraud patterns. It integrates with Azure AI Foundry, MongoDB Atlas Vector Search, and Memorizz for intelligent, learning-based decision making.

## Architecture Overview

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Transaction   │───▶│  Agent Analysis  │───▶│   Final         │
│   Input         │    │  (3 Stages)      │    │   Decision      │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                              │
                       ┌──────▼──────┐
                       │   Memory    │
                       │  & Learning │
                       └─────────────┘
```

### Core Components

1. **Multi-Stage Investigation Engine**
   - Stage 1: Quick Triage (Customer Vector Search)
   - Stage 2: Pattern Analysis (Global Vector Search) 
   - Stage 3: Deep Investigation (ML + AI Analysis)

2. **MongoDB Atlas Vector Search**
   - Native vector similarity search (no manual cosine similarity)
   - Customer-specific and global pattern matching
   - Automatic embedding generation for new transactions

3. **Azure AI Integration**
   - Azure ML for transaction scoring
   - Azure OpenAI for embeddings
   - Azure AI Foundry for orchestration

4. **Memorizz Agent System** (Agentic Component)
   - Memory storage and retrieval
   - Learning from past decisions
   - AI-powered pattern analysis
   - Persona-based decision making

## Agentic Aspects

### 1. **Intelligent Memory System (Memorizz)**

The agent uses Memorizz to maintain persistent memory across transactions:

```python
# Memory storage after each decision
self.mem_agent.store_memory(
    content=memory_content,
    memory_type="task",
    metadata={
        'transaction_id': transaction.transaction_id,
        'risk_score': decision.final_score,
        'decision': decision.decision,
        'patterns': decision.patterns,
        'similar_count': decision.similar_transactions_found,
        'atlas_search': True
    }
)
```

### 2. **AI-Powered Pattern Analysis**

In Stage 3, the agent uses AI to analyze complex patterns:

```python
async def _ai_pattern_analysis(self, transaction, customer, stage1_result, stage2_result, similar_transactions):
    context = f"""
    Analyze this transaction for money laundering risk:
    
    MongoDB Atlas Vector Search Results:
    - Found {len(similar_transactions)} similar transactions
    - Fraud matches: {sum(1 for t in similar_transactions if t.is_fraud)}
    - Average Atlas similarity score: {np.mean([t.similarity_score for t in similar_transactions]):.2f}
    
    Assess the risk considering the MongoDB Atlas vector similarity patterns.
    """
    
    response = self.mem_agent.run(context)  # AI analysis
```

### 3. **Learning and Adaptation**

The agent learns from each transaction to improve future decisions:

- **Memory Retrieval**: Accesses past similar cases for context
- **Pattern Recognition**: Identifies evolving fraud patterns
- **Decision Refinement**: Improves risk scoring based on outcomes

### 4. **Persona-Based Decision Making**

The agent operates with a specific persona:

```python
monitor_persona = Persona(
    name=f"{agent_name}_monitor",
    role="AML Compliance Specialist",
    goals="Detect financial crimes using pattern recognition and vector similarity",
    background="Expert in AML compliance with advanced pattern detection capabilities"
)
```

## Progressive Investigation Stages

### Stage 1: Quick Triage
- **Purpose**: Fast initial assessment using customer history
- **Data**: Customer-specific vector search (5 similar transactions)
- **Checks**: Amount risk, merchant risk, geographic risk, similarity risk
- **Decision**: Auto-approve safe transactions, escalate suspicious ones

### Stage 2: Pattern Analysis  
- **Purpose**: Broader pattern detection across all customers
- **Data**: Global vector search (10 similar transactions, 90-day window)
- **Checks**: Structuring, behavioral anomalies, velocity spikes
- **Decision**: Investigate medium-risk transactions

### Stage 3: Deep Investigation
- **Purpose**: Comprehensive analysis with ML and AI
- **Data**: All similar transactions + ML scoring + AI analysis
- **Checks**: Historical analysis, network analysis, AI pattern analysis
- **Decision**: Final risk assessment with high confidence

## Data Flow

```
1. Transaction Input
   ↓
2. Generate Embedding (Azure OpenAI)
   ↓
3. Stage 1: Customer Vector Search (Atlas)
   ↓
4. Risk Assessment → Continue to Stage 2?
   ↓
5. Stage 2: Global Vector Search (Atlas)
   ↓
6. Pattern Analysis → Continue to Stage 3?
   ↓
7. Stage 3: ML Scoring + AI Analysis
   ↓
8. Final Decision + Memory Storage
```

## Key Features

### MongoDB Atlas Vector Search Integration
- **Native Similarity**: Uses MongoDB's built-in vector search
- **No Manual Calculation**: Eliminates manual cosine similarity computation
- **Optimized Performance**: Single aggregation queries for similarity search
- **Rich Filtering**: Time windows, confidence thresholds, customer-specific searches

### Risk Scoring Framework
- **0-100 Scale**: Consistent risk scoring across all stages
- **Weighted Combination**: Configurable weights for different risk factors
- **Progressive Refinement**: Each stage refines the risk assessment
- **Confidence Tracking**: Maintains confidence levels throughout analysis

### Decision Framework
- **Automated Decisions**: Auto-approve, approve with monitoring, investigate
- **Escalation Rules**: Block transactions, escalate to humans, generate SARs
- **Pattern-Based**: Specific rules for structuring, fraud similarity, etc.
- **Explainable**: Detailed explanations for all decisions

## Configuration

### Azure ML Configuration
```python
azure_ml_config = {
    'subscription_id': 'your-subscription-id',
    'resource_group': 'your-resource-group', 
    'workspace_name': 'your-ml-workspace',
    'openai_endpoint': 'https://your-openai.openai.azure.com/',
    'openai_api_key': 'your-azure-openai-api-key',
    'model_name': 'transaction_risk_model',
    'endpoint_name': 'transaction-risk-endpoint'
}
```

### Decision Thresholds
```python
thresholds = {
    'stage1': {
        'auto_approve': 25,
        'needs_stage2': 70,
        'auto_escalate': 85
    },
    'stage2': {
        'approve': 35,
        'needs_stage3': 65,
        'escalate': 80
    },
    'stage3': {
        'approve': 45,
        'investigate': 70,
        'block': 85
    }
}
```

## Usage Example

```python
# Initialize the agent
monitor = SimplifiedTransactionMonitor(
    agent_name='TM_Agent_001',
    mongodb_uri='mongodb+srv://...',
    azure_ml_config=azure_ml_config,
    openai_api_key='your-openai-key',
    enable_ml_scoring=True
)

# Monitor a transaction
decision = await monitor.monitor_transaction(transaction_data)

print(f"Risk Score: {decision.final_score}/100")
print(f"Decision: {decision.decision}")
print(f"Patterns: {decision.patterns}")
print(f"Similar Transactions: {decision.similar_transactions_found}")
```

## Integration Points

### With Transaction Simulator
- **Real-time Monitoring**: Process transactions as they're generated
- **Risk Feedback**: Provide risk scores back to simulator
- **Pattern Detection**: Identify and flag suspicious simulation patterns

### With Existing Backend
- **API Integration**: RESTful endpoints for transaction monitoring  
- **Database Sharing**: Same MongoDB collections for transactions and customers
- **Model Reuse**: Leverage existing Pydantic models and validation

## Performance Characteristics

- **Stage 1**: ~50-100ms (customer vector search)
- **Stage 2**: ~200-300ms (global vector search + patterns)
- **Stage 3**: ~500-1000ms (ML scoring + AI analysis)
- **Memory Storage**: ~10-20ms (MongoDB operations)

## Monitoring and Metrics

- **Transactions Processed**: Total volume handled
- **Decision Distribution**: Breakdown by decision type
- **Stage Utilization**: How often each stage is used
- **Processing Time**: Performance metrics per stage
- **Pattern Detection Rate**: Frequency of pattern identification

## Future Enhancements

1. **Real-time Learning**: Dynamic threshold adjustment based on outcomes
2. **Federated Learning**: Share patterns across multiple agent instances  
3. **Explainable AI**: Enhanced explanation generation for decisions
4. **Advanced Patterns**: Detection of new fraud patterns through unsupervised learning
5. **Integration Expansion**: Connect with additional data sources and ML models