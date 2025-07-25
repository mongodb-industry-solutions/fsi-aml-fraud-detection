# Hybrid Search with $rankFusion Migration Plan

## Executive Summary

This document outlines the migration from our current manual combined results implementation to MongoDB's native `$rankFusion` for hybrid search. This will eliminate complex manual score processing and leverage MongoDB's optimized hybrid search capabilities.

## Current Implementation Analysis

### Backend Components to Remove

#### 1. Enhanced Resolution Routes (`/aml-backend/routes/resolution/enhanced_resolution_routes.py`)

**Lines 113-180**: Current combined results logic that manually merges Atlas and Vector results:

```python
# REMOVE: Manual combination logic
combined_results = []
atlas_entities_by_id = {entity.get('entityId'): entity for entity in atlas_results}
vector_entities_by_id = {entity.get('entityId'): entity for entity in vector_results}

# Complex manual merging and scoring logic
# This entire section will be replaced by $rankFusion
```

**Helper Functions to Remove**:

- `normalize_score_for_sorting()` - Line 37-47
- Manual entity processing loops - Lines 140-180

#### 2. Search Response Models (`/aml-backend/models/api/responses.py`)

**Current SearchMatch Model** (Lines 8-15):

```python
class SearchMatch(BaseModel):
    entity_id: str
    entity_data: Dict[str, Any]
    search_score: float
    match_reasons: List[str] = []
```

**Enhanced Search Response** (Lines 25-35):

```python
class EnhancedSearchResponse(BaseModel):
    atlasResults: List[SearchMatch] = []
    vectorResults: List[SearchMatch] = []
    combinedResults: List[SearchMatch] = []  # REMOVE
    searchMetrics: SearchMetrics = SearchMetrics()
    correlationAnalysis: Dict[str, Any] = {}
```

### Frontend Components to Remove

#### 1. Combined Results Tab Logic (`/frontend/components/entityResolution/enhanced/ParallelSearchInterface.jsx`)

**Lines 180-260**: `renderCombinedResultsTable()` function
**Lines 428-450**: Debug panel for combined results
**Lines 371-454**: Combined results tab content
**Lines 228-241**: Combined results score display logic

#### 2. API Integration (`/frontend/lib/enhanced-entity-resolution-api.js`)

**Lines 49**: `combinedResults: data.combinedResults || []`

#### 3. Page Integration (`/frontend/components/entityResolution/EnhancedEntityResolutionPage.jsx`)

**Lines referenced in workflow data handling for combined results**

## MongoDB $rankFusion Implementation Plan

### 1. New Hybrid Search Service

**File**: `/aml-backend/services/search/hybrid_search_service.py`

```python
from typing import List, Dict, Any, Optional
from motor.motor_asyncio import AsyncIOMotorCollection
from ..core.entity_service import EntityService
from ...models.api.responses import HybridSearchResult, HybridSearchResponse

class HybridSearchService:
    """MongoDB $rankFusion-based hybrid search combining Atlas and Vector search"""

    def __init__(self, collection: AsyncIOMotorCollection):
        self.collection = collection
        self.atlas_index_name = "entity_resolution_search"
        self.vector_index_name = "entity_vector_search_index"
        self.vector_field_name = "embedding"

    async def hybrid_entity_search(
        self,
        query_text: str,
        query_embedding: List[float],
        limit: int = 10,
        atlas_weight: float = 1,
        vector_weight: float = 1,
        num_candidates_multiplier: int = 15
    ) -> HybridSearchResponse:
        """
        Perform hybrid search using MongoDB $rankFusion

        Args:
            query_text: Text query for Atlas Search
            query_embedding: Vector embedding for Vector Search
            limit: Maximum results to return
            atlas_weight: Weight for Atlas Search pipeline (0-1)
            vector_weight: Weight for Vector Search pipeline (0-1)
            num_candidates_multiplier: Multiplier for vector search candidates
        """

        # Calculate intermediate limits for robustness
        intermediate_limit = limit * 2
        num_candidates = limit * num_candidates_multiplier

        # Build $rankFusion aggregation pipeline
        rank_fusion_pipeline = [
            {
                "$rankFusion": {
                    "input": {
                        "pipelines": {
                            "atlas": [
                                {
                                    "$search": {
                                        "index": self.atlas_index_name,
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
                                },
                                {"$limit": intermediate_limit}
                            ],
                            "vector": [
                                {
                                    "$vectorSearch": {
                                        "index": self.vector_index_name,
                                        "path": self.vector_field_name,
                                        "queryVector": query_embedding,
                                        "numCandidates": num_candidates,
                                        "limit": intermediate_limit
                                    }
                                }
                            ]
                        }
                    },
                    "combination": {
                        "weights": {
                            "atlas": atlas_weight,
                            "vector": vector_weight
                        }
                    },
                    "scoreDetails": True
                }
            },
            {"$limit": limit},
            {
                "$addFields": {
                    "hybridScore": {"$meta": "score"},
                    "scoreDetails": {"$meta": "scoreDetails"}
                }
            },
            {
                "$project": {
                    "entityId": 1,
                    "name": 1,
                    "entityType": 1,
                    "riskAssessment": 1,
                    "hybridScore": 1,
                    "scoreDetails": 1,
                    "createdAt": 1,
                    "updatedAt": 1
                }
            }
        ]

        # Execute hybrid search
        results = list(await self.collection.aggregate(rank_fusion_pipeline).to_list(length=None))

        # Process results and extract individual scores
        hybrid_results = []
        for result in results:
            hybrid_score = result.get("hybridScore", 0.0)
            atlas_score = 0.0
            vector_score = 0.0

            # Extract individual pipeline scores from scoreDetails
            score_details = result.get("scoreDetails", {})
            if score_details and 'details' in score_details:
                details = score_details['details']
                if isinstance(details, list):
                    for detail in details:
                        if isinstance(detail, dict):
                            pipeline_name = detail.get('inputPipelineName', '')
                            pipeline_value = detail.get('value', 0.0)

                            if pipeline_name == 'atlas':
                                atlas_score = pipeline_value
                            elif pipeline_name == 'vector':
                                vector_score = pipeline_value

            hybrid_result = HybridSearchResult(
                entity_id=result.get("entityId"),
                entity_data=result,
                hybrid_score=hybrid_score,
                atlas_score=atlas_score,
                vector_score=vector_score,
                rank_fusion_details=score_details,
                match_reasons=self._generate_match_reasons(atlas_score, vector_score)
            )
            hybrid_results.append(hybrid_result)

        return HybridSearchResponse(
            hybridResults=hybrid_results,
            totalResults=len(hybrid_results),
            searchMetrics={
                "hybridSearchTime": "TBD",
                "atlasWeight": atlas_weight,
                "vectorWeight": vector_weight,
                "numCandidates": num_candidates
            }
        )

    def _generate_match_reasons(self, atlas_score: float, vector_score: float) -> List[str]:
        """Generate match reasons based on score breakdown"""
        reasons = []

        if atlas_score > 0.5:
            reasons.append("Strong text similarity match")
        elif atlas_score > 0.2:
            reasons.append("Moderate text similarity")

        if vector_score > 0.7:
            reasons.append("High semantic similarity")
        elif vector_score > 0.4:
            reasons.append("Moderate semantic similarity")

        return reasons
```

### 2. New Response Models

**File**: `/aml-backend/models/api/responses.py` (Updated)

```python
class HybridSearchResult(BaseModel):
    """Result from MongoDB $rankFusion hybrid search"""

    entity_id: str
    entity_data: Dict[str, Any]
    hybrid_score: float
    atlas_score: float
    vector_score: float
    rank_fusion_details: Dict[str, Any] = {}
    match_reasons: List[str] = []

class HybridSearchResponse(BaseModel):
    """Response for hybrid search using $rankFusion"""

    hybridResults: List[HybridSearchResult] = []
    totalResults: int = 0
    searchMetrics: Dict[str, Any] = {}

    # Remove these fields:
    # atlasResults: List[SearchMatch] = []
    # vectorResults: List[SearchMatch] = []
    # combinedResults: List[SearchMatch] = []
```

### 3. Updated Enhanced Resolution Route

**File**: `/aml-backend/routes/resolution/enhanced_resolution_routes.py` (Simplified)

```python
@router.post("/comprehensive-search", response_model=HybridSearchResponse)
async def comprehensive_hybrid_search(request: ComprehensiveSearchRequest):
    """
    Simplified comprehensive search using MongoDB $rankFusion
    """
    try:
        start_time = time.time()

        # Generate embedding for vector search
        embedding_service = EmbeddingService()
        query_text = f"{request.entity.get('fullName', '')} {request.entity.get('address', '')}"
        query_embedding = await embedding_service.generate_entity_embedding(request.entity)

        # Perform hybrid search using $rankFusion
        hybrid_service = HybridSearchService(entity_collection)
        hybrid_response = await hybrid_service.hybrid_entity_search(
            query_text=query_text,
            query_embedding=query_embedding,
            limit=request.searchConfig.get('maxResults', 10),
            atlas_weight=request.searchConfig.get('atlasWeight', 0.6),
            vector_weight=request.searchConfig.get('vectorWeight', 0.4)
        )

        # Add timing metrics
        total_time = (time.time() - start_time) * 1000
        hybrid_response.searchMetrics["totalProcessingTime"] = f"{total_time:.2f}ms"

        return hybrid_response

    except Exception as e:
        logger.error(f"Comprehensive hybrid search failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")
```

## Frontend Updates

### 1. Updated Parallel Search Interface

**File**: `/frontend/components/entityResolution/enhanced/HybridSearchInterface.jsx`

```jsx
function HybridSearchInterface({ searchResults, isLoading = false }) {
  const [selectedTab, setSelectedTab] = useState(0); // 0: Hybrid Results, 1: Score Breakdown

  const { hybridResults = [], searchMetrics = {} } =
    searchResults || {};

  const renderHybridResultsTable = (results) => {
    return (
      <Table>
        <TableHead>
          <HeaderRow>
            <HeaderCell style={{ width: '30%' }}>Entity</HeaderCell>
            <HeaderCell style={{ width: '15%' }}>
              Hybrid Score
            </HeaderCell>
            <HeaderCell style={{ width: '15%' }}>
              Atlas Score
            </HeaderCell>
            <HeaderCell style={{ width: '15%' }}>
              Vector Score
            </HeaderCell>
            <HeaderCell style={{ width: '25%' }}>
              Match Reasons
            </HeaderCell>
          </HeaderRow>
        </TableHead>
        <TableBody>
          {results.map((entity, index) => (
            <Row key={entity.entity_id || index}>
              <Cell>
                <div style={{ padding: spacing[2] }}>
                  <Body weight="medium">
                    {entity.entity_data.name?.full}
                  </Body>
                  <Body
                    style={{
                      fontSize: '11px',
                      color: palette.gray.dark1,
                    }}
                  >
                    ID: {entity.entity_id}
                  </Body>
                </div>
              </Cell>
              <Cell>
                <Badge variant="blue">
                  {entity.hybrid_score.toFixed(3)}
                </Badge>
              </Cell>
              <Cell>
                <Badge variant="green">
                  {entity.atlas_score.toFixed(3)}
                </Badge>
              </Cell>
              <Cell>
                <Badge variant="purple">
                  {entity.vector_score.toFixed(3)}
                </Badge>
              </Cell>
              <Cell>
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: spacing[1],
                  }}
                >
                  {entity.match_reasons.map((reason, idx) => (
                    <Badge
                      key={idx}
                      variant="lightgray"
                      style={{ fontSize: '10px' }}
                    >
                      {reason}
                    </Badge>
                  ))}
                </div>
              </Cell>
            </Row>
          ))}
        </TableBody>
      </Table>
    );
  };

  // Component implementation continues...
}
```

### 2. Updated API Integration

**File**: `/frontend/lib/enhanced-entity-resolution-api.js` (Updated)

```javascript
async performHybridSearch(entityData) {
  try {
    const response = await fetch(`${this.baseURL}/api/v1/resolution/comprehensive-search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        entity: entityData,
        searchConfig: {
          maxResults: 10,
          atlasWeight: 1,
          vectorWeight: 1,
          includeScoreBreakdown: true
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Hybrid search failed: ${response.status}`);
    }

    const data = await response.json();

    return {
      hybridResults: data.hybridResults || [],
      searchMetrics: data.searchMetrics || {}
    };

  } catch (error) {
    console.error('❌ Hybrid search failed:', error);
    throw error;
  }
}
```

## Migration Steps

### Phase 1: Backend Preparation

1. ✅ Create new `HybridSearchService` with $rankFusion implementation
2. ✅ Update response models to support hybrid results
3. ✅ Create new hybrid search endpoint
4. ✅ Test $rankFusion functionality with sample data

### Phase 2: Backend Migration

1. ✅ Remove combined results logic from enhanced resolution routes
2. ✅ Remove helper functions for manual score processing
3. ✅ Update enhanced resolution endpoint to use hybrid search
4. ✅ Remove unused SearchMatch fields

### Phase 3: Frontend Migration

1. ✅ Create new `HybridSearchInterface` component
2. ✅ Update API client to call hybrid search endpoint
3. ✅ Remove combined results tab logic
4. ✅ Remove debug panels and manual score display
5. ✅ Update main page to use hybrid interface

### Phase 4: Testing & Validation

1. ✅ Test hybrid search accuracy vs. current implementation
2. ✅ Validate score details extraction
3. ✅ Performance testing and optimization
4. ✅ User acceptance testing

## Implementation Completion Summary

### ✅ **MIGRATION SUCCESSFULLY COMPLETED** - July 25, 2025

The MongoDB $rankFusion hybrid search implementation has been successfully deployed and is operational. All phases completed with the following achievements:

#### Final Implementation Status
- **Hybrid Search Service**: `/aml-backend/services/search/hybrid_search_service.py` - ✅ **DEPLOYED**
- **API Response Models**: Updated `HybridSearchResult` and `HybridSearchResponse` models - ✅ **DEPLOYED**
- **Backend Routes**: Enhanced resolution routes with hybrid search endpoint - ✅ **DEPLOYED**
- **Frontend Interface**: Three-tab interface (Atlas, Vector, Hybrid) - ✅ **DEPLOYED**
- **API Integration**: Updated frontend API client - ✅ **DEPLOYED**

#### Performance Metrics (Production Test Results)
- **Search Execution Time**: ~625ms for 10 results
- **MongoDB $rankFusion**: Successfully combining Atlas and Vector pipelines
- **Score Extraction**: Individual Atlas and Vector scores properly extracted from `scoreDetails`
- **Result Quality**: Hybrid scores showing expected reciprocal rank fusion behavior

#### Key Technical Achievements
1. **Native MongoDB $rankFusion**: Replaced manual score combination with MongoDB's optimized RRF algorithm
2. **Proper Field Configuration**: Fixed vector field name (`profileEmbedding`) and Atlas index name (`entity_text_search_index`)
3. **Score Transparency**: Full score breakdown with hybrid, atlas, and vector scores displayed separately
4. **ObjectId Serialization**: Resolved serialization issues with proper string conversion
5. **Error Handling**: Robust validation for empty query text and missing embeddings

#### Sample Production Results
```
Entity CGI125-23A87E5BA6: hybrid=0.0328, atlas=4.2068, vector=0.9151
Entity PEP3-397036C76D: hybrid=0.0301, atlas=1.7650, vector=0.7847
```

#### Configuration Successfully Applied
- **Atlas Weight**: 1.0 (Equal weighting with vector search)
- **Vector Weight**: 1.0 (Equal weighting with atlas search)
- **Score Details**: Enabled for individual pipeline score extraction
- **Result Limit**: 10 entities with proper ranking

#### Migration Impact
- **Removed Components**: Combined results logic, manual score normalization (~265 lines removed)
- **Added Components**: Native $rankFusion service, hybrid result models, three-tab frontend
- **Performance Improvement**: Leveraging MongoDB's optimized ranking algorithms
- **Maintenance Reduction**: No custom score combination logic to maintain

### Next Steps (Optional)
1. **Weight Optimization**: Consider A/B testing different atlas/vector weight ratios based on use case
2. **Advanced Features**: Implement dynamic weight adjustment based on query characteristics
3. **Monitoring**: Add performance metrics collection for hybrid search analytics

## Configuration Options

### Search Weights

```python
# Default configuration
ATLAS_WEIGHT = 0.6  # Text similarity emphasis
VECTOR_WEIGHT = 0.4  # Semantic similarity emphasis

# High precision scenario
ATLAS_WEIGHT = 0.8
VECTOR_WEIGHT = 0.2

# Semantic discovery scenario
ATLAS_WEIGHT = 0.3
VECTOR_WEIGHT = 0.7
```
