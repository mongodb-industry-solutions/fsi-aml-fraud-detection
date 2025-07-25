# MongoDB $rankFusion Score Calculation Insights

## Overview

This document explains how MongoDB's $rankFusion calculates scores in our hybrid search implementation that combines Atlas Search (text) and Vector Search (semantic similarity).

## Score Calculation Breakdown

### 1. Atlas Pipeline Score (Traditional Text Search)

**Algorithm**: TF-IDF + BM25 scoring
**Implementation**:
```javascript
"atlas": [
  {
    "$search": {
      "index": "entity_text_search_index",
      "compound": {
        "should": [
          {
            "text": {
              "query": query_text,
              "path": ["name.full", "name.first", "name.last"],
              "fuzzy": {"maxEdits": 1}
            }
          },
          {
            "text": {
              "query": query_text, 
              "path": ["primaryAddress.full", "address.street"],
              "fuzzy": {"maxEdits": 2}
            }
          }
        ]
      }
    }
  }
]
```

**Score Characteristics**:
- **Name matching**: Fuzzy text matching with 1 character edit tolerance
- **Address matching**: Fuzzy text matching with 2 character edit tolerance  
- **Compound scoring**: MongoDB combines both should clauses using compound query scoring
- **Score Range**: Typically 0-10+ (higher = better text similarity)
- **Use Case**: Exact and near-exact text matches, typo tolerance

### 2. Vector Pipeline Score (Semantic Similarity)

**Algorithm**: Cosine Similarity
**Implementation**:
```javascript
"vector": [
  {
    "$vectorSearch": {
      "index": "entity_vector_search_index",
      "path": "profileEmbedding",
      "queryVector": query_embedding,
      "numCandidates": num_candidates,
      "limit": intermediate_limit
    }
  }
]
```

**Score Characteristics**:
- **Similarity Metric**: Cosine similarity between query embedding and entity embeddings
- **Semantic Understanding**: AI-generated embeddings capture meaning beyond literal text
- **Score Range**: 0.0-1.0 (1.0 = identical semantic meaning, 0.0 = no similarity)
- **Use Case**: Conceptual matches, different phrasings of same entity

### 3. Hybrid Score (MongoDB's Reciprocal Rank Fusion)

**Algorithm**: Reciprocal Rank Fusion (RRF)
**Implementation**:
```javascript
"combination": {
  "weights": {
    "atlas": 1,    // Equal weight for Atlas pipeline
    "vector": 1    // Equal weight for Vector pipeline  
  }
}
```

**RRF Formula**:
```
For each document:
RRF_score = Σ(weight_i / (rank_i + k))

Where:
- weight_i = pipeline weight (atlas=1, vector=1 in our case)
- rank_i = document's rank position in pipeline i (1st place=1, 2nd place=2, etc.)
- k = 60 (MongoDB's default RRF constant)
```

**Key Properties**:
- **Rank-Based**: Uses rank positions, not raw scores
- **Consensus Emphasis**: Documents ranking well in both pipelines get higher scores
- **Score Range**: Typically 0.0-0.1+ (lower numerical values, but higher = better ranking)
- **Stability**: Less sensitive to score scale differences between pipelines

## Production Results Analysis

### Sample Results
```
Entity CGI125-23A87E5BA6: hybrid=0.0328, atlas=4.2068, vector=0.9151
Entity PEP3-397036C76D: hybrid=0.0301, atlas=1.7650, vector=0.7847
```

### Score Interpretation

**Entity CGI125-23A87E5BA6**:
- **Atlas Score: 4.2068** = Strong text similarity (excellent name/address fuzzy matching)
- **Vector Score: 0.9151** = Very high semantic similarity (91.5% cosine similarity)
- **Hybrid Score: 0.0328** = High RRF score indicating top ranking in both pipelines

**Why Hybrid Scores Appear Lower**:
- RRF scores represent **optimized ranking consensus**, not raw similarity
- If entity ranked #1 in both pipelines: `1/(1+60) + 1/(1+60) = 0.0328`
- Higher hybrid scores indicate better **cross-pipeline consistency**

### RRF Advantages Over Manual Score Combination

1. **Scale Independence**: Works regardless of different score ranges (Atlas: 0-10+, Vector: 0-1)
2. **Rank Stability**: Focuses on relative ranking rather than absolute scores
3. **Optimized Fusion**: MongoDB's native implementation is performance-optimized
4. **Proven Algorithm**: RRF is academically validated for search result fusion

## Score Details Extraction

**Implementation**:
```python
score_details = result.get("scoreDetails", {})
if score_details and 'details' in score_details:
    for detail in score_details['details']:
        pipeline_name = detail.get('inputPipelineName', '')  # "atlas" or "vector"
        pipeline_value = detail.get('value', 0.0)           # Original pipeline score
        
        if pipeline_name == 'atlas':
            atlas_score = pipeline_value      # Raw Atlas Search score
        elif pipeline_name == 'vector':  
            vector_score = pipeline_value     # Raw Vector similarity score
```

**Metadata Available**:
- `hybridScore`: Final RRF-calculated ranking score
- `scoreDetails.details[].inputPipelineName`: Which pipeline contributed the score
- `scoreDetails.details[].value`: Original score from that pipeline
- `scoreDetails.details[].weight`: Weight applied to that pipeline

## Configuration Impact

**Current Configuration**:
- **Atlas Weight**: 1.0 (Equal importance)
- **Vector Weight**: 1.0 (Equal importance)
- **Score Details**: Enabled for transparency

**Weight Adjustment Effects**:
- **Atlas-Heavy** (0.8, 0.2): Prioritizes exact text matches
- **Vector-Heavy** (0.2, 0.8): Prioritizes semantic similarity
- **Balanced** (1.0, 1.0): Equal consideration of both methods

## Performance Characteristics

- **Search Execution Time**: ~625ms for 10 results
- **MongoDB Optimization**: Native $rankFusion leverages MongoDB's internal optimizations
- **Memory Efficiency**: No client-side score processing required
- **Scalability**: Handles large result sets without manual merging overhead

## Key Insights

1. **Hybrid scores prioritize ranking consensus** over individual pipeline strengths
2. **Raw pipeline scores remain available** for detailed analysis and debugging
3. **RRF naturally handles score scale differences** between Atlas and Vector search
4. **Performance benefits** from using MongoDB's native fusion vs. manual combination
5. **Flexibility** in weight adjustment allows use case optimization

---

*Document Generated: July 25, 2025*
*Implementation: ThreatSight 360 AML Backend*