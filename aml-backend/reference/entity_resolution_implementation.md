# Entity Resolution System - Detailed Implementation Guide

## Table of Contents
1. [System Overview](#system-overview)
2. [Architecture](#architecture)
3. [Implementation Steps](#implementation-steps)
4. [Core Components](#core-components)
5. [API Reference](#api-reference)
6. [Configuration Guide](#configuration-guide)
7. [Usage Examples](#usage-examples)
8. [Performance Optimization](#performance-optimization)
9. [Best Practices](#best-practices)
10. [Troubleshooting](#troubleshooting)

## 1. System Overview

The Entity Resolution System is designed to intelligently match, deduplicate, and manage entities (individuals and organizations) using multiple matching strategies. It prevents duplicate records, maintains data quality, and provides a unified view of entities.

### Key Features
- **Multi-Strategy Matching**: Combines 5 different matching techniques
- **Confidence Scoring**: Provides match confidence levels
- **Entity Lifecycle Management**: Create, update, merge, and link entities
- **Audit Trail**: Tracks all resolution decisions
- **Scalable Architecture**: Handles millions of entities

### Use Cases
- Customer Master Data Management (MDM)
- Fraud Prevention
- Compliance Screening
- Data Quality Management
- M&A Due Diligence

## 2. Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                    Entity Resolution System                  │
├─────────────────────────────────────────────────────────────┤
│                         API Layer                            │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │  Resolution  │  │    Entity    │  │    Analytics     │  │
│  │  Endpoints   │  │  Management  │  │    Endpoints     │  │
│  └──────┬──────┘  └──────┬───────┘  └────────┬─────────┘  │
├─────────┴─────────────────┴──────────────────┴─────────────┤
│                    Business Logic Layer                      │
│  ┌──────────────────────────────────────────────────────┐  │
│  │            Entity Resolution Engine                   │  │
│  ├──────────────────────────────────────────────────────┤  │
│  │ • Identifier Matching    • Fuzzy Text Matching       │  │
│  │ • Phonetic Matching      • Vector Semantic Matching  │  │
│  │ • Graph Relationship Matching                        │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Entity Manager                           │  │
│  │ • Create  • Update  • Merge  • Link  • Archive      │  │
│  └──────────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│                      Data Layer                              │
│  ┌──────────────┐  ┌────────────────┐  ┌───────────────┐  │
│  │   Entities    │  │   Resolution   │  │    Merge      │  │
│  │  Collection   │  │    History     │  │   History     │  │
│  └──────────────┘  └────────────────┘  └───────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

```
New Entity Input
     │
     ▼
┌─────────────┐
│ Validation  │
└─────┬───────┘
      │
      ▼
┌─────────────────────┐     ┌──────────────────┐
│ Resolution Engine   │────▶│ Matching         │
│                     │     │ Strategies       │
└─────┬───────────────┘     └──────────────────┘
      │                              │
      │                              ▼
      │                     ┌──────────────────┐
      │                     │ Score            │
      │                     │ Consolidation    │
      │                     └────────┬─────────┘
      │                              │
      ▼                              ▼
┌─────────────────────┐     ┌──────────────────┐
│ Confidence Level    │◀────│ Match Results    │
│ Determination       │     │                  │
└─────┬───────────────┘     └──────────────────┘
      │
      ▼
┌─────────────────────┐
│ Action Decision     │
│ • Create New        │
│ • Update Existing   │
│ • Merge Entities    │
│ • Manual Review     │
└─────────────────────┘
```

## 3. Implementation Steps

### Prerequisites
```bash
# System requirements
- Python 3.8+
- MongoDB 4.4+ (with text search enabled)
- Redis (optional, for caching)
- AWS Account (optional, for AI features)

# Install dependencies
pip install motor pymongo fastapi uvicorn boto3 numpy \
    fuzzywuzzy python-Levenshtein jellyfish redis
```

### Step 1: MongoDB Setup
```javascript
// Create database
use entity_resolution

// Enable text search
db.adminCommand({setParameter: 1, textSearchEnabled: true})

// Create collections
db.createCollection("entities")
db.createCollection("resolution_history")
db.createCollection("merge_history")
db.createCollection("entity_relationships")

// Create indexes
db.entities.createIndex({
    "name": "text",
    "alternate_names": "text"
}, {
    weights: {
        "name": 10,
        "alternate_names": 5
    }
})

db.entities.createIndex({"identifiers.passport": 1})
db.entities.createIndex({"identifiers.national_id": 1})
db.entities.createIndex({"identifiers.tax_id": 1})
db.entities.createIndex({"phonetic_codes.metaphone": 1})
db.entities.createIndex({"phonetic_codes.soundex": 1})
db.entities.createIndex({"entity_type": 1, "status": 1})
db.entities.createIndex({"created_date": -1})

// Compound indexes for performance
db.entities.createIndex({
    "entity_type": 1,
    "nationality": 1,
    "status": 1
})
```

### Step 2: Configuration
```python
# config.py
from typing import Dict, Any

class ResolutionConfig:
    """Configuration for Entity Resolution System"""
    
    # Database Configuration
    MONGODB_URI = "mongodb://localhost:27017"
    DATABASE_NAME = "entity_resolution"
    
    # AWS Configuration (optional)
    AWS_REGION = "us-east-1"
    AWS_BEDROCK_MODEL = "amazon.titan-embed-text-v1"
    
    # Matching Configuration
    MATCHING_CONFIG = {
        "use_ai_matching": True,
        "max_matches": 20,
        "enable_caching": True,
        "cache_ttl": 3600,  # 1 hour
        
        "thresholds": {
            "exact_match": 0.95,
            "high_confidence": 0.85,
            "medium_confidence": 0.70,
            "low_confidence": 0.50
        },
        
        "weights": {
            "exact": 1.0,
            "identifier": 0.95,
            "fuzzy_high": 0.85,
            "fuzzy_medium": 0.70,
            "fuzzy_low": 0.50,
            "vector": 0.75,
            "phonetic": 0.60,
            "graph": 0.55
        },
        
        "fuzzy_settings": {
            "min_ratio": 70,
            "use_partial_ratio": True,
            "use_token_sort": True,
            "use_token_set": True
        },
        
        "phonetic_algorithms": [
            "metaphone",
            "soundex",
            "nysiis",
            "match_rating"
        ]
    }
    
    # Performance Configuration
    PERFORMANCE_CONFIG = {
        "batch_size": 100,
        "max_concurrent_matches": 5,
        "resolution_timeout": 30,  # seconds
        "enable_profiling": False
    }
    
    # Logging Configuration
    LOGGING_CONFIG = {
        "level": "INFO",
        "format": "%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        "file": "entity_resolution.log"
    }
```

### Step 3: Initialize the System
```python
# main.py
from fastapi import FastAPI
from entity_resolution_system import app as er_app
from config import ResolutionConfig
import uvicorn

# Initialize configuration
config = ResolutionConfig()

# Start the application
if __name__ == "__main__":
    uvicorn.run(
        er_app,
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_config=config.LOGGING_CONFIG
    )
```

## 4. Core Components

### Entity Resolution Engine

The resolution engine implements five matching strategies:

#### 1. Identifier Matching
```python
async def identifier_matching(self, identifiers: Dict[str, str]) -> List[Dict]:
    """
    Exact matching on unique identifiers
    - Highest confidence (0.95-1.0)
    - Used for: passports, SSN, tax IDs, registration numbers
    """
    matches = []
    for id_type, id_value in identifiers.items():
        results = await self.collection.find({
            f"identifiers.{id_type}": id_value
        }).to_list(10)
        
        for result in results:
            result["match_confidence"] = 1.0
            result["match_reason"] = f"Exact {id_type} match"
            matches.append(result)
    
    return matches
```

#### 2. Fuzzy Text Matching
```python
async def fuzzy_text_matching(self, names: List[str]) -> List[Dict]:
    """
    Advanced text matching with multiple algorithms
    - Confidence varies (0.5-0.95)
    - Handles: typos, abbreviations, missing parts
    """
    # MongoDB text search
    text_matches = await self.text_search(names)
    
    # Apply fuzzy algorithms
    for match in text_matches:
        scores = {
            "ratio": fuzz.ratio(name, match["name"]),
            "partial": fuzz.partial_ratio(name, match["name"]),
            "token_sort": fuzz.token_sort_ratio(name, match["name"]),
            "token_set": fuzz.token_set_ratio(name, match["name"])
        }
        match["fuzzy_scores"] = scores
        match["match_confidence"] = max(scores.values()) / 100
    
    return text_matches
```

#### 3. Phonetic Matching
```python
async def phonetic_matching(self, names: List[str]) -> List[Dict]:
    """
    Match similar-sounding names
    - Confidence: 0.5-0.8
    - Handles: different spellings of same pronunciation
    """
    phonetic_matches = []
    
    for name in names:
        # Generate phonetic codes
        codes = {
            "metaphone": jellyfish.metaphone(name),
            "soundex": jellyfish.soundex(name),
            "nysiis": jellyfish.nysiis(name)
        }
        
        # Search by phonetic codes
        matches = await self.collection.find({
            "$or": [
                {f"phonetic_codes.{algo}": code}
                for algo, code in codes.items()
            ]
        }).to_list(20)
        
        phonetic_matches.extend(matches)
    
    return phonetic_matches
```

#### 4. Vector Semantic Matching
```python
async def vector_semantic_matching(self, entity_description: str) -> List[Dict]:
    """
    AI-powered semantic matching
    - Confidence: 0.6-0.9
    - Handles: contextual similarity, different languages
    """
    # Generate embedding
    embedding = await self.generate_embedding(entity_description)
    
    # Vector search
    pipeline = [
        {
            "$vectorSearch": {
                "index": "entity_embeddings",
                "path": "description_embedding",
                "queryVector": embedding,
                "numCandidates": 100,
                "limit": 20
            }
        }
    ]
    
    matches = await self.collection.aggregate(pipeline).to_list(None)
    return matches
```

#### 5. Graph Relationship Matching
```python
async def graph_relationship_matching(self, 
    associated_entities: List[str]) -> List[Dict]:
    """
    Find entities through relationships
    - Confidence: 0.4-0.7
    - Handles: network connections, hidden relationships
    """
    # Find associates first
    associates = await self.find_entities_by_names(associated_entities)
    
    # Graph lookup
    pipeline = [
        {"$match": {"_id": {"$in": [a["_id"] for a in associates]}}},
        {
            "$graphLookup": {
                "from": "entities",
                "startWith": "$connected_entities",
                "connectFromField": "connected_entities",
                "connectToField": "_id",
                "as": "network",
                "maxDepth": 2
            }
        }
    ]
    
    results = await self.collection.aggregate(pipeline).to_list(None)
    return self.extract_network_matches(results)
```

### Entity Manager

Handles entity lifecycle operations:

```python
class EntityManager:
    """Manages entity lifecycle operations"""
    
    async def create_entity(self, entity_data: Dict) -> Dict:
        """Create new entity with validation"""
        # Validate data
        self.validate_entity_data(entity_data)
        
        # Generate phonetic codes
        entity_data["phonetic_codes"] = self.generate_phonetic_codes(
            entity_data["name"]
        )
        
        # Generate embedding if enabled
        if self.config["use_ai_matching"]:
            entity_data["embedding"] = await self.generate_embedding(
                entity_data
            )
        
        # Add metadata
        entity_data["created_date"] = datetime.utcnow()
        entity_data["version"] = 1
        entity_data["status"] = "active"
        
        # Insert
        result = await self.collection.insert_one(entity_data)
        entity_data["_id"] = str(result.inserted_id)
        
        return entity_data
    
    async def merge_entities(self, source_id: str, target_id: str,
                           strategy: str = "combine") -> Dict:
        """Merge two entities with audit trail"""
        # Get entities
        source = await self.get_entity(source_id)
        target = await self.get_entity(target_id)
        
        # Apply merge strategy
        if strategy == "combine":
            merged = self.combine_entities(source, target)
        elif strategy == "prefer_source":
            merged = self.prefer_source_merge(source, target)
        else:
            merged = self.prefer_target_merge(source, target)
        
        # Update target
        await self.update_entity(target_id, merged)
        
        # Deactivate source
        await self.deactivate_entity(source_id, f"Merged into {target_id}")
        
        # Record merge history
        await self.record_merge(source_id, target_id, strategy)
        
        return merged
```

## 5. API Reference

### Resolution Endpoints

#### POST /api/resolve
Resolve an entity against the database.

**Request:**
```json
{
    "name": "John Smith",
    "alternate_names": ["J. Smith"],
    "entity_type": "individual",
    "identifiers": {
        "passport": "US123456789"
    },
    "nationality": "United States",
    "associated_entities": ["ABC Corp"]
}
```

**Response:**
```json
{
    "resolution_id": "res_abc123",
    "best_match": {
        "entity": {
            "_id": "507f1f77bcf86cd799439011",
            "name": "John Michael Smith",
            "entity_type": "individual"
        },
        "confidence_score": 0.92,
        "match_types": ["identifier", "fuzzy_high"]
    },
    "matches": [...],
    "confidence_level": "high_confidence",
    "processing_time_ms": 127
}
```

#### POST /api/resolve-or-create
Resolve and create if no match found.

**Response Actions:**
- `matched`: High confidence match found
- `created`: No match, new entity created
- `review_needed`: Medium confidence, manual review required

#### POST /api/entities
Create entity without resolution.

#### PUT /api/entities/{entity_id}
Update existing entity.

#### POST /api/entities/merge
Merge two entities.

**Request:**
```json
{
    "source_entity_id": "507f1f77bcf86cd799439011",
    "target_entity_id": "507f1f77bcf86cd799439012",
    "merge_strategy": "combine",
    "reason": "Duplicate entities"
}
```

#### POST /api/entities/link
Create relationship between entities.

#### GET /api/entities/{entity_id}/matches
Find potential matches for existing entity.

### Analytics Endpoints

#### GET /api/analytics/resolution-stats
Get resolution statistics.

**Response:**
```json
{
    "period_days": 30,
    "total_resolutions": 1543,
    "confidence_distribution": [
        {"_id": "exact_match", "count": 234, "avg_matches": 1.2},
        {"_id": "high_confidence", "count": 567, "avg_matches": 2.5},
        {"_id": "medium_confidence", "count": 432, "avg_matches": 4.1},
        {"_id": "low_confidence", "count": 210, "avg_matches": 6.7},
        {"_id": "no_match", "count": 100, "avg_matches": 0}
    ]
}
```

## 6. Configuration Guide

### Basic Configuration
```python
# Minimal configuration
config = {
    "mongodb_uri": "mongodb://localhost:27017",
    "database_name": "entity_resolution",
    "use_ai_matching": False,  # Disable AI features
    "thresholds": {
        "exact_match": 0.95,
        "high_confidence": 0.85,
        "medium_confidence": 0.70,
        "low_confidence": 0.50
    }
}
```

### Advanced Configuration
```python
# Full configuration with all features
config = {
    # Database
    "mongodb_uri": "mongodb://localhost:27017",
    "database_name": "entity_resolution",
    "redis_url": "redis://localhost:6379",
    
    # AI Features
    "use_ai_matching": True,
    "aws_region": "us-east-1",
    "bedrock_model": "amazon.titan-embed-text-v1",
    "embedding_dimensions": 1536,
    
    # Matching
    "matching": {
        "max_matches": 20,
        "timeout_seconds": 30,
        "parallel_strategies": True,
        
        "thresholds": {
            "exact_match": 0.95,
            "high_confidence": 0.85,
            "medium_confidence": 0.70,
            "low_confidence": 0.50
        },
        
        "weights": {
            "exact": 1.0,
            "identifier": 0.95,
            "fuzzy_high": 0.85,
            "fuzzy_medium": 0.70,
            "fuzzy_low": 0.50,
            "vector": 0.75,
            "phonetic": 0.60,
            "graph": 0.55
        },
        
        "fuzzy": {
            "min_ratio": 70,
            "algorithms": ["ratio", "partial", "token_sort", "token_set"],
            "check_alternate_names": True
        },
        
        "phonetic": {
            "algorithms": ["metaphone", "soundex", "nysiis"],
            "min_length": 3
        },
        
        "graph": {
            "max_depth": 2,
            "include_indirect": True
        }
    },
    
    # Performance
    "performance": {
        "cache_enabled": True,
        "cache_ttl": 3600,
        "batch_size": 100,
        "connection_pool_size": 10,
        "enable_profiling": True
    },
    
    # Logging
    "logging": {
        "level": "INFO",
        "file": "entity_resolution.log",
        "max_size": "100MB",
        "backup_count": 5
    }
}
```

### Environment-Specific Configuration
```python
# development.py
DEV_CONFIG = {
    "mongodb_uri": "mongodb://localhost:27017",
    "use_ai_matching": False,
    "logging": {"level": "DEBUG"}
}

# production.py
PROD_CONFIG = {
    "mongodb_uri": os.environ["MONGODB_URI"],
    "use_ai_matching": True,
    "aws_region": os.environ["AWS_REGION"],
    "logging": {"level": "WARNING"}
}
```

## 7. Usage Examples

### Example 1: Basic Entity Resolution
```python
import asyncio
import httpx

async def resolve_customer():
    """Basic customer resolution"""
    customer = {
        "name": "Robert Johnson",
        "entity_type": "individual",
        "identifiers": {
            "ssn": "123-45-6789"
        }
    }
    
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "http://localhost:8000/api/resolve",
            json=customer
        )
        
        result = response.json()
        
        if result["confidence_level"] == "exact_match":
            print(f"Found exact match: {result['best_match']['entity']['_id']}")
        elif result["confidence_level"] in ["high_confidence", "medium_confidence"]:
            print(f"Found potential match with {result['confidence_level']}")
            print(f"Match score: {result['best_match']['confidence_score']}")
        else:
            print("No significant match found")

asyncio.run(resolve_customer())
```

### Example 2: Handling Name Variations
```python
async def resolve_with_variations():
    """Resolution with multiple name variations"""
    entity = {
        "name": "Mohammad Al-Rahman",
        "alternate_names": [
            "Mohammed Alrahman",
            "Muhammad Al Rahman",
            "M. Al-Rahman",
            "Mohamed Al Rahmann"  # With typo
        ],
        "entity_type": "individual",
        "nationality": "Saudi Arabia"
    }
    
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "http://localhost:8000/api/resolve",
            json=entity
        )
        
        result = response.json()
        
        # Analyze matches
        print(f"Found {len(result['matches'])} potential matches")
        
        for match in result['matches'][:3]:
            print(f"\nMatch: {match['entity']['name']}")
            print(f"Score: {match['confidence_score']}")
            print(f"Types: {', '.join(match['match_types'])}")
            
            # Show match evidence
            for evidence in match['match_evidence']:
                print(f"  - {evidence['match_type']}: {evidence['match_details']}")
```

### Example 3: Organization with Subsidiaries
```python
async def resolve_organization_network():
    """Resolve organization with network relationships"""
    org = {
        "name": "Tech Innovations Inc",
        "alternate_names": ["Tech Innovations", "TII"],
        "entity_type": "organization",
        "identifiers": {
            "ein": "12-3456789",
            "duns": "123456789"
        },
        "associated_entities": [
            "Tech Innovations Europe Ltd",
            "Tech Innovations Asia Pte",
            "John Smith (CEO)",
            "Mary Johnson (CFO)"
        ],
        "address": {
            "street": "100 Tech Plaza",
            "city": "San Francisco",
            "state": "CA",
            "country": "United States"
        }
    }
    
    async with httpx.AsyncClient() as client:
        # First resolve
        resolution = await client.post(
            "http://localhost:8000/api/resolve-or-create",
            json=org
        )
        
        result = resolution.json()
        org_id = result["entity_id"]
        
        # Find network connections
        network = await client.get(
            f"http://localhost:8000/api/entities/{org_id}/network"
        )
        
        connections = network.json()
        print(f"Organization network: {len(connections['entities'])} connected entities")
```

### Example 4: Batch Processing
```python
async def batch_resolve_entities(entities: List[Dict]):
    """Batch resolution with deduplication"""
    results = []
    duplicates_found = 0
    
    async with httpx.AsyncClient() as client:
        for entity in entities:
            # Resolve each entity
            response = await client.post(
                "http://localhost:8000/api/resolve-or-create",
                json=entity
            )
            
            result = response.json()
            results.append(result)
            
            if result["action"] == "matched":
                duplicates_found += 1
                print(f"Duplicate found: {entity['name']} → {result['entity_id']}")
    
    print(f"\nBatch processing complete:")
    print(f"Total entities: {len(entities)}")
    print(f"Duplicates found: {duplicates_found}")
    print(f"New entities: {len(entities) - duplicates_found}")
    
    return results
```

### Example 5: Entity Merge Workflow
```python
async def interactive_merge_workflow():
    """Interactive entity merge with review"""
    
    async with httpx.AsyncClient() as client:
        # Find potential duplicates for an entity
        entity_id = "507f1f77bcf86cd799439011"
        
        matches = await client.get(
            f"http://localhost:8000/api/entities/{entity_id}/matches"
        )
        
        potential_duplicates = matches.json()["matches"]
        
        if potential_duplicates:
            print(f"Found {len(potential_duplicates)} potential duplicates:")
            
            for i, dup in enumerate(potential_duplicates[:5]):
                print(f"\n{i+1}. {dup['entity']['name']}")
                print(f"   Confidence: {dup['confidence_score']}")
                print(f"   Match types: {', '.join(dup['match_types'])}")
            
            # In real application, get user input
            selected = 0  # First match
            
            if potential_duplicates[selected]["confidence_score"] > 0.85:
                # Perform merge
                merge_response = await client.post(
                    "http://localhost:8000/api/entities/merge",
                    json={
                        "source_entity_id": potential_duplicates[selected]["entity"]["_id"],
                        "target_entity_id": entity_id,
                        "merge_strategy": "combine",
                        "reason": "Confirmed duplicate by user"
                    }
                )
                
                print(f"\nMerge completed: {merge_response.json()['status']}")
```

## 8. Performance Optimization

### Database Optimization

#### 1. Indexing Strategy
```javascript
// Compound indexes for common queries
db.entities.createIndex({
    "entity_type": 1,
    "status": 1,
    "created_date": -1
})

// Partial indexes for large collections
db.entities.createIndex(
    {"nationality": 1},
    {partialFilterExpression: {"entity_type": "individual"}}
)

// TTL index for temporary data
db.resolution_history.createIndex(
    {"created_date": 1},
    {expireAfterSeconds: 2592000}  // 30 days
)
```

#### 2. Query Optimization
```python
# Use projection to limit returned fields
async def get_entity_summary(entity_id: str):
    return await collection.find_one(
        {"_id": ObjectId(entity_id)},
        {
            "name": 1,
            "entity_type": 1,
            "risk_level": 1,
            "last_updated": 1
        }
    )

# Use aggregation pipeline for complex queries
pipeline = [
    {"$match": {"status": "active"}},  # Filter early
    {"$project": {"name": 1, "type": 1}},  # Limit fields
    {"$limit": 100}  # Limit results
]
```

### Caching Strategy

```python
import redis
import json
from functools import wraps

class ResolutionCache:
    """Caching layer for resolution results"""
    
    def __init__(self, redis_url: str):
        self.redis = redis.from_url(redis_url)
        self.ttl = 3600  # 1 hour
    
    def cache_key(self, entity_data: Dict) -> str:
        """Generate cache key from entity data"""
        # Use identifiers if available
        if entity_data.get("identifiers"):
            key_parts = []
            for id_type, id_value in sorted(entity_data["identifiers"].items()):
                key_parts.append(f"{id_type}:{id_value}")
            return f"resolution:{':'.join(key_parts)}"
        
        # Fall back to name
        return f"resolution:name:{entity_data['name'].lower()}"
    
    async def get_cached_resolution(self, entity_data: Dict) -> Optional[Dict]:
        """Get cached resolution result"""
        key = self.cache_key(entity_data)
        cached = self.redis.get(key)
        
        if cached:
            return json.loads(cached)
        return None
    
    async def cache_resolution(self, entity_data: Dict, result: Dict):
        """Cache resolution result"""
        key = self.cache_key(entity_data)
        self.redis.setex(
            key,
            self.ttl,
            json.dumps(result)
        )

# Decorator for caching
def with_cache(cache: ResolutionCache):
    def decorator(func):
        @wraps(func)
        async def wrapper(self, entity_data: Dict):
            # Check cache
            cached = await cache.get_cached_resolution(entity_data)
            if cached:
                return cached
            
            # Execute resolution
            result = await func(self, entity_data)
            
            # Cache result
            await cache.cache_resolution(entity_data, result)
            
            return result
        return wrapper
    return decorator
```

### Parallel Processing

```python
async def parallel_resolution(entities: List[Dict], max_concurrent: int = 5):
    """Process multiple entities in parallel"""
    semaphore = asyncio.Semaphore(max_concurrent)
    
    async def resolve_with_semaphore(entity):
        async with semaphore:
            return await resolve_entity(entity)
    
    tasks = [resolve_with_semaphore(entity) for entity in entities]
    results = await asyncio.gather(*tasks, return_exceptions=True)
    
    return results
```

### Connection Pooling

```python
# MongoDB connection pooling
client = AsyncIOMotorClient(
    "mongodb://localhost:27017",
    maxPoolSize=50,
    minPoolSize=10,
    maxIdleTimeMS=30000,
    waitQueueTimeoutMS=5000
)
```

## 9. Best Practices

### 1. Data Quality
```python
# Always validate input data
def validate_entity_data(entity_data: Dict):
    """Validate entity data before processing"""
    # Required fields
    if not entity_data.get("name"):
        raise ValueError("Entity name is required")
    
    if not entity_data.get("entity_type"):
        raise ValueError("Entity type is required")
    
    # Validate entity type
    valid_types = ["individual", "organization"]
    if entity_data["entity_type"] not in valid_types:
        raise ValueError(f"Invalid entity type. Must be one of: {valid_types}")
    
    # Validate identifiers format
    if entity_data.get("identifiers"):
        for id_type, id_value in entity_data["identifiers"].items():
            if not isinstance(id_value, str) or not id_value.strip():
                raise ValueError(f"Invalid identifier value for {id_type}")
    
    # Normalize data
    entity_data["name"] = entity_data["name"].strip()
    entity_data["alternate_names"] = [
        name.strip() for name in entity_data.get("alternate_names", [])
        if name.strip()
    ]
    
    return entity_data
```

### 2. Matching Strategy Selection
```python
def select_matching_strategies(entity_data: Dict) -> List[str]:
    """Select appropriate matching strategies based on available data"""
    strategies = []
    
    # Always use fuzzy text matching
    strategies.append("fuzzy_text")
    
    # Use identifier matching if identifiers available
    if entity_data.get("identifiers"):
        strategies.append("identifier")
    
    # Use phonetic for individual names
    if entity_data.get("entity_type") == "individual":
        strategies.append("phonetic")
    
    # Use graph if associations available
    if entity_data.get("associated_entities"):
        strategies.append("graph")
    
    # Use vector if AI enabled and description available
    if config.get("use_ai_matching") and has_description(entity_data):
        strategies.append("vector")
    
    return strategies
```

### 3. Confidence Score Interpretation
```python
def interpret_confidence_score(score: float) -> Dict[str, Any]:
    """Interpret confidence score for business decisions"""
    if score >= 0.95:
        return {
            "level": "exact_match",
            "action": "auto_merge",
            "review_required": False,
            "description": "Exact match found, safe to merge automatically"
        }
    elif score >= 0.85:
        return {
            "level": "high_confidence",
            "action": "auto_update",
            "review_required": False,
            "description": "High confidence match, update existing entity"
        }
    elif score >= 0.70:
        return {
            "level": "medium_confidence",
            "action": "manual_review",
            "review_required": True,
            "description": "Potential match found, requires manual review"
        }
    elif score >= 0.50:
        return {
            "level": "low_confidence",
            "action": "flag_for_review",
            "review_required": True,
            "description": "Possible match, flag for later review"
        }
    else:
        return {
            "level": "no_match",
            "action": "create_new",
            "review_required": False,
            "description": "No match found, create new entity"
        }
```

### 4. Audit Trail
```python
async def log_resolution_decision(
    entity_input: Dict,
    resolution_result: Dict,
    action_taken: str,
    user_id: Optional[str] = None
):
    """Log all resolution decisions for audit"""
    audit_entry = {
        "timestamp": datetime.utcnow(),
        "entity_input": entity_input,
        "resolution_result": {
            "best_match": resolution_result.get("best_match"),
            "confidence_level": resolution_result.get("confidence_level"),
            "match_count": len(resolution_result.get("matches", []))
        },
        "action_taken": action_taken,
        "user_id": user_id or "system",
        "ip_address": get_client_ip(),
        "session_id": get_session_id()
    }
    
    await audit_collection.insert_one(audit_entry)
```

### 5. Error Handling
```python
class ResolutionError(Exception):
    """Base exception for resolution errors"""
    pass

class NoMatchFoundError(ResolutionError):
    """No match found when one was expected"""
    pass

class DuplicateMatchError(ResolutionError):
    """Multiple exact matches found"""
    pass

async def safe_resolve_entity(entity_data: Dict):
    """Resolve entity with comprehensive error handling"""
    try:
        # Validate input
        entity_data = validate_entity_data(entity_data)
        
        # Attempt resolution
        result = await resolve_entity(entity_data)
        
        # Check for issues
        if result["confidence_level"] == "exact_match":
            # Check for multiple exact matches
            exact_matches = [
                m for m in result["matches"]
                if m["confidence_score"] >= 0.95
            ]
            if len(exact_matches) > 1:
                raise DuplicateMatchError(
                    f"Found {len(exact_matches)} exact matches"
                )
        
        return result
        
    except ValidationError as e:
        logger.error(f"Validation error: {e}")
        raise
    except DuplicateMatchError as e:
        logger.warning(f"Duplicate match: {e}")
        # Handle duplicate scenario
        return handle_duplicates(result)
    except Exception as e:
        logger.error(f"Resolution error: {e}")
        # Fall back to creating new entity
        return create_new_entity_fallback(entity_data)
```

## 10. Troubleshooting

### Common Issues and Solutions

#### 1. Poor Match Quality
**Symptoms:** Getting too many false positives or missing obvious matches

**Solutions:**
```python
# Adjust matching thresholds
config["thresholds"]["high_confidence"] = 0.88  # Increase from 0.85

# Fine-tune fuzzy matching
config["fuzzy_settings"]["min_ratio"] = 75  # Increase from 70

# Add more weight to exact identifiers
config["weights"]["identifier"] = 0.98  # Increase from 0.95
```

#### 2. Slow Resolution Performance
**Symptoms:** Resolution taking > 1 second per entity

**Diagnostics:**
```python
import time

async def profile_resolution(entity_data: Dict):
    """Profile resolution performance"""
    timings = {}
    
    start = time.time()
    
    # Identifier matching
    t0 = time.time()
    id_matches = await identifier_matching(entity_data.get("identifiers", {}))
    timings["identifier"] = time.time() - t0
    
    # Fuzzy matching
    t0 = time.time()
    fuzzy_matches = await fuzzy_matching(entity_data.get("name"))
    timings["fuzzy"] = time.time() - t0
    
    # Continue for other strategies...
    
    timings["total"] = time.time() - start
    
    print("Resolution timings:")
    for strategy, duration in timings.items():
        print(f"  {strategy}: {duration*1000:.2f}ms")
    
    return timings
```

**Solutions:**
- Add missing indexes
- Enable caching
- Reduce max_matches limit
- Use projection in queries
- Implement connection pooling

#### 3. Memory Issues with Large Datasets
**Solutions:**
```python
# Use cursor instead of to_list()
async def process_large_collection():
    cursor = collection.find({"status": "active"})
    
    async for document in cursor:
        # Process one at a time
        await process_entity(document)

# Batch processing
async def batch_process(batch_size: int = 100):
    skip = 0
    while True:
        batch = await collection.find(
            {"status": "active"}
        ).skip(skip).limit(batch_size).to_list(None)
        
        if not batch:
            break
            
        await process_batch(batch)
        skip += batch_size
```

#### 4. Inconsistent Phonetic Matches
**Solutions:**
```python
# Use multiple phonetic algorithms
def generate_phonetic_variants(name: str) -> List[str]:
    """Generate multiple phonetic representations"""
    variants = set()
    
    # Basic algorithms
    variants.add(jellyfish.metaphone(name))
    variants.add(jellyfish.soundex(name))
    variants.add(jellyfish.nysiis(name))
    
    # Handle hyphenated names
    if "-" in name:
        parts = name.split("-")
        for part in parts:
            variants.add(jellyfish.metaphone(part))
    
    # Handle common variations
    name_lower = name.lower()
    if name_lower.startswith("mc"):
        variants.add(jellyfish.metaphone("mac" + name[2:]))
    
    return list(variants)
```

### Monitoring and Logging

```python
import logging
from datetime import datetime

class ResolutionMonitor:
    """Monitor resolution system health"""
    
    def __init__(self):
        self.metrics = {
            "total_resolutions": 0,
            "successful_matches": 0,
            "failed_resolutions": 0,
            "avg_response_time": 0,
            "cache_hit_rate": 0
        }
    
    async def log_resolution(self, 
                           entity_data: Dict,
                           result: Dict,
                           duration: float):
        """Log resolution metrics"""
        self.metrics["total_resolutions"] += 1
        
        if result.get("best_match"):
            self.metrics["successful_matches"] += 1
        
        # Update average response time
        current_avg = self.metrics["avg_response_time"]
        total = self.metrics["total_resolutions"]
        self.metrics["avg_response_time"] = (
            (current_avg * (total - 1) + duration) / total
        )
        
        # Log if slow
        if duration > 1.0:
            logger.warning(
                f"Slow resolution: {duration:.2f}s for {entity_data.get('name')}"
            )
    
    def get_health_status(self) -> Dict[str, Any]:
        """Get system health status"""
        match_rate = (
            self.metrics["successful_matches"] / 
            self.metrics["total_resolutions"]
            if self.metrics["total_resolutions"] > 0 else 0
        )
        
        return {
            "status": "healthy" if match_rate > 0.7 else "degraded",
            "metrics": self.metrics,
            "match_rate": match_rate,
            "timestamp": datetime.utcnow()
        }
```

### Debug Mode

```python
# Enable debug mode for detailed logging
DEBUG_MODE = os.environ.get("DEBUG_RESOLUTION", "false").lower() == "true"

async def resolve_with_debug(entity_data: Dict):
    """Resolution with debug information"""
    debug_info = {
        "input": entity_data,
        "strategies": {},
        "timings": {},
        "matches_by_strategy": {}
    }
    
    if DEBUG_MODE:
        print(f"\n{'='*50}")
        print(f"RESOLVING: {entity_data.get('name')}")
        print(f"{'='*50}")
    
    # Run each strategy with timing
    for strategy in ["identifier", "fuzzy", "phonetic", "vector", "graph"]:
        start = time.time()
        
        matches = await run_strategy(strategy, entity_data)
        
        duration = time.time() - start
        debug_info["timings"][strategy] = duration
        debug_info["matches_by_strategy"][strategy] = len(matches)
        
        if DEBUG_MODE:
            print(f"\n{strategy.upper()} MATCHING:")
            print(f"  Time: {duration*1000:.2f}ms")
            print(f"  Matches: {len(matches)}")
            if matches:
                print(f"  Best score: {matches[0].get('confidence_score', 0):.3f}")
    
    # Consolidate results
    final_result = consolidate_matches(debug_info["matches_by_strategy"])
    
    if DEBUG_MODE:
        print(f"\nFINAL RESULT:")
        print(f"  Confidence: {final_result['confidence_level']}")
        print(f"  Total matches: {len(final_result['matches'])}")
    
    return final_result, debug_info
```

## Conclusion

The Entity Resolution System provides a robust foundation for managing entity data with high accuracy and performance. By following this implementation guide, you can:

1. **Achieve high match accuracy** through multiple matching strategies
2. **Scale to millions of entities** with proper optimization
3. **Maintain data quality** through validation and deduplication
4. **Ensure compliance** with comprehensive audit trails
5. **Integrate seamlessly** with other systems through REST APIs

Remember to:
- Start with basic configuration and add features as needed
- Monitor system performance and adjust thresholds
- Regularly review and merge duplicate entities
- Keep your indexes optimized
- Test with your specific data patterns

For additional support or advanced features, refer to the MongoDB documentation and the entity resolution system source code.
