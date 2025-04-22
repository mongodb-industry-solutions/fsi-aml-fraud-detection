# MongoDB Vector Search Implementation

This document outlines how MongoDB Vector Search is implemented in the ThreatSight360 Fraud Detection application.

## Overview

MongoDB Vector Search powers the semantic search capabilities in our fraud detection system, allowing us to match transactions against both:
1. Known fraud patterns based on meaning rather than just keywords
2. Historical transactions for context-aware risk evaluation

## Architecture

1. **Embedding Generation**: AWS Bedrock (Amazon Titan) generates 1536-dimensional vectors from text descriptions
2. **Vector Storage**: 
   - Embeddings are stored in the `fraud_patterns` collection in the `vector_embedding` field
   - Transaction embeddings are stored in the `transactions` collection in the `vector_embedding` field
3. **Vector Search**: MongoDB aggregation pipeline with `$vectorSearch` operator performs similarity search against both collections

## Backend Implementation

### Vector Search Endpoint

The `/fraud-patterns/similar-search` endpoint in `routes/fraud_pattern.py` handles vector search:

```python
@router.post("/similar-search", response_description="Find similar patterns using vector search")
async def similar_patterns_search(
    query: Dict[str, Any] = Body(...),
    db: MongoDBAccess = Depends(get_db),
    limit: int = 5
):
    """
    Perform a similarity search using vector embeddings to find fraud patterns similar to the input text.
    
    This endpoint generates embeddings using the Amazon Titan embedding model and
    then performs a vector search in MongoDB to find similar patterns.
    """
    if "text" not in query:
        raise HTTPException(status_code=400, detail="Query must include 'text' field")
    
    query_text = query["text"]
    
    try:
        # Generate embeddings for the query text using Titan model
        query_embedding = await get_embedding(query_text)
        
        # Check if vector search index exists
        collection = db.get_collection(db_name=DB_NAME, collection_name=PATTERN_COLLECTION)
        has_vector_index = False
        for index in collection.index_information().values():
            if index.get("name", "").startswith("vector_"):
                has_vector_index = True
                break
        
        if has_vector_index:
            # Use vector search with MongoDB Atlas
            pipeline = [
                {
                    "$vectorSearch": {
                        "index": "vector_index",
                        "path": "vector_embedding",
                        "queryVector": query_embedding,
                        "numCandidates": limit * 10,
                        "limit": limit
                    }
                }
            ]
            patterns = list(collection.aggregate(pipeline))
        else:
            # Fallback to text search if vector search not available
            patterns = list(collection.find(
                {"$text": {"$search": query_text}} if "text" in collection.index_information() else {}
            ).limit(limit))
            
        return {"results": patterns}
    
    except Exception as e:
        error_msg = f"Error in similarity search: {str(e)}"
        raise HTTPException(status_code=500, detail=error_msg)
```

### Fraud Detection Integration

Vector search is used in the fraud detection process (`services/fraud_detection.py`) to match transactions against known fraud patterns:

```python
async def _check_pattern_match(self, transaction: Dict[str, Any], flags: List[str]) -> Tuple[bool, float]:
    """
    Check if transaction matches known fraud patterns using vector embeddings.
    """
    # Generate transaction description for embedding
    description = f"Transaction {transaction_type} of ${amount} using {payment_method} to {merchant_category} merchant with flags: {', '.join(flags)}"
    
    # Generate embedding for transaction
    transaction_embedding = await get_embedding(description)
    
    # Query fraud patterns collection for vector similarity
    collection = self.db_client.get_collection(
        db_name=self.db_name,
        collection_name=self.fraud_pattern_collection
    )
    
    # Use vector search if available
    if has_vector_index:
        pipeline = [
            {
                "$vectorSearch": {
                    "index": "vector_index",
                    "path": "vector_embedding",
                    "queryVector": transaction_embedding,
                    "numCandidates": 10,
                    "limit": 3
                }
            },
            {
                "$project": {
                    "pattern_name": 1,
                    "description": 1,
                    "severity": 1,
                    "indicators": 1,
                    "score": {"$meta": "vectorSearchScore"}
                }
            }
        ]
        matching_patterns = list(collection.aggregate(pipeline))
        
        # Check for strong matches
        if matching_patterns:
            highest_score = matching_patterns[0]["score"]
            is_anomalous = highest_score > SIMILARITY_THRESHOLD
            risk_score = min(1.0, highest_score)
            return is_anomalous, risk_score
    
    # Fall back to basic query if vector search unavailable
    return False, 0.0
```

## Frontend Implementation

### Vector Search UI

The frontend integrates vector search in the `TransactionSimulator` component, displaying results in a dedicated tab.

Key functions:

```javascript
// Perform vector search with transaction description
const performVectorSearch = async (transactionDescription) => {
  setVectorSearchLoading(true);
  try {
    const response = await axios.post(`${API_BASE_URL}/fraud-patterns/similar-search`, {
      text: transactionDescription
    });
    
    setVectorSearchResults(response.data.results || []);
  } catch (err) {
    console.error('Error in vector search:', err);
    setVectorSearchResults([]);
  } finally {
    setVectorSearchLoading(false);
  }
};

// Generate a descriptive text of the transaction for vector search
const generateTransactionDescription = (transaction, riskAssessment) => {
  const flags = riskAssessment?.flags || [];
  const merchant = transaction.merchant?.category || 'unknown';
  const amount = transaction.amount || 0;
  const transType = transaction.transaction_type || 'purchase';
  
  return `${transType} transaction for $${amount} at ${merchant} merchant with` + 
    (flags.length > 0 ? ` the following risk indicators: ${flags.join(', ')}` : ' no suspicious indicators');
};
```

The UI includes:
- Transaction description display
- Vector embedding process visualization
- Results with similarity scores and severity indicators

## MongoDB Atlas Configuration

For vector search to work, you need:

1. A MongoDB Atlas cluster (M10 or higher)
2. Vector search enabled on the cluster
3. A vector search index on the `fraud_patterns` collection:

```json
{
  "fields": [
    {
      "type": "vector",
      "path": "vector_embedding",
      "numDimensions": 1536,
      "similarity": "cosine"
    }
  ]
}
```

## Demo Walkthrough

When demonstrating the Vector Search feature:

1. Create a transaction (especially an unusual one)
2. View the results modal and click on the "Vector Search" tab
3. Observe:
   - The transaction description in natural language
   - The vector embedding process visualization
   - Similar fraud patterns matched via MongoDB vector search
   - The semantic matching capabilities that go beyond keyword matching

## Enhanced Transaction-Based Vector Search

The system now includes enhanced transaction-based vector search capabilities, allowing for sophisticated context-aware risk assessment by comparing new transactions to historical data.

### Implementation Details

In the `FraudDetectionService` class, the `find_similar_transactions` method performs an optimized vector search against the entire transactions collection:

```python
async def find_similar_transactions(self, transaction: Dict[str, Any]) -> Tuple[List[Dict[str, Any]], float]:
    """
    Find similar historical transactions using vector search.
    
    This method converts the current transaction to an embedding on-the-fly using
    the same text representation as stored transactions and performs a vector 
    search against existing transactions in the database.
    """
    # Create a text representation matching how stored transactions were embedded
    transaction_text = self._create_transaction_text_representation(transaction)
    
    # Generate embedding for the transaction
    transaction_embedding = await get_embedding(transaction_text)
    
    # Perform vector search against ALL transactions (not filtering by customer)
    pipeline = [
        {
            "$vectorSearch": {
                "index": "transaction_vector_index",
                "path": "vector_embedding",
                "queryVector": transaction_embedding,
                "numCandidates": 200,  # Cast a wide net for better matches
                "limit": 15  # Return more matches for comprehensive analysis
            }
        }
    ]
    
    # Process search results through sophisticated risk scoring algorithm
    # that considers:
    # - Vector similarity scores
    # - Amount similarity
    # - Risk levels of matched transactions
    # - Number of risk flags
    # - Result ranking position
```

### Advanced Risk Scoring

The system employs a sophisticated risk scoring algorithm that:

1. **Categorizes matches by risk level**: Separates similar transactions into high, medium, and low risk buckets based on their historical risk assessment.

2. **Applies weighted scoring**: Gives more weight to:
   - Higher vector similarity matches (semantic matching)
   - Transactions with similar amounts (75% match or better)
   - Earlier results in the search ranking
   - Transactions with multiple risk flags

3. **Risk-based calculation strategies**:
   - For high-risk matches: Applies a weighted average with a bonus for multiple high-risk transactions
   - For only low-risk matches: Uses an inverse power curve to reduce risk based on similarity strength
   - For mixed or medium risk: Uses a balanced weighted average across all matched transactions

4. **Result set expansion**: Analyzes 15 similar transactions (not just 5) to make more informed risk decisions

### Frontend Integration

The frontend displays a curated set of similar transactions in a dedicated tab, showing:
- Intelligently filtered similar transactions based on the scenario:
  - For unusual/suspicious transactions: prioritizing high and medium risk matches
  - For normal transactions: prioritizing low risk matches
- The top 5 most relevant transactions (filtered from a larger set of 15 analyzed in the backend)
- The total number of matches found and analyzed
- A sophisticated similarity-based risk score
- Transaction details including amount, date, risk level, and flags
- Similarity percentages between the current and historical transactions

## Benefits

1. **Semantic Understanding**: Matches on meaning rather than exact keywords
2. **Pattern Discovery**: Can find previously unknown connections between transactions
3. **Reduced False Negatives**: Catches more fraud attempts even with variations
4. **Improved Explainability**: Provides similarity scores and matching patterns
5. **Context-Aware Risk Assessment**: Evaluates risk based on customer's specific transaction history
6. **Dual-Layer Search**: Combines pattern-based and transaction-based vector search for more robust detection