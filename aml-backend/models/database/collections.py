"""
Database Collection Models - MongoDB-specific schemas and indexes

Database models that define collection structures, indexes, and
database-specific operations. These are separate from domain models
to maintain clean separation of concerns.
"""

from datetime import datetime
from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field


# ==================== COLLECTION CONFIGURATIONS ====================

class CollectionConfig(BaseModel):
    """Base configuration for MongoDB collections"""
    
    collection_name: str
    indexes: List[Dict[str, Any]] = Field(default_factory=list)
    text_search_fields: Optional[Dict[str, int]] = None  # field: weight
    vector_search_config: Optional[Dict[str, Any]] = None
    validation_schema: Optional[Dict[str, Any]] = None


# ==================== ENTITY COLLECTION ====================

class EntityCollection(CollectionConfig):
    """Configuration for entities collection"""
    
    collection_name: str = "entities"
    
    # Indexes for optimal performance
    indexes: List[Dict[str, Any]] = Field(default_factory=lambda: [
        # Single field indexes
        {"key": [("entity_type", 1)], "name": "entity_type_1"},
        {"key": [("status", 1)], "name": "status_1"},
        {"key": [("risk_assessment.level", 1)], "name": "risk_level_1"},
        {"key": [("created_date", -1)], "name": "created_date_-1"},
        {"key": [("updated_date", -1)], "name": "updated_date_-1"},
        {"key": [("nationality", 1)], "name": "nationality_1"},
        
        # Identifier indexes
        {"key": [("identifiers.passport", 1)], "name": "identifiers_passport_1", "sparse": True},
        {"key": [("identifiers.national_id", 1)], "name": "identifiers_national_id_1", "sparse": True},
        {"key": [("identifiers.tax_id", 1)], "name": "identifiers_tax_id_1", "sparse": True},
        {"key": [("identifiers.ssn", 1)], "name": "identifiers_ssn_1", "sparse": True},
        {"key": [("identifiers.ein", 1)], "name": "identifiers_ein_1", "sparse": True},
        
        # Phonetic indexes for name matching
        {"key": [("phonetic_codes.metaphone", 1)], "name": "phonetic_metaphone_1", "sparse": True},
        {"key": [("phonetic_codes.soundex", 1)], "name": "phonetic_soundex_1", "sparse": True},
        {"key": [("phonetic_codes.nysiis", 1)], "name": "phonetic_nysiis_1", "sparse": True},
        
        # Compound indexes for common queries
        {
            "key": [("entity_type", 1), ("status", 1), ("created_date", -1)],
            "name": "entity_type_status_created_compound"
        },
        {
            "key": [("entity_type", 1), ("nationality", 1), ("risk_assessment.level", 1)],
            "name": "entity_type_nationality_risk_compound"
        },
        {
            "key": [("risk_assessment.level", 1), ("risk_assessment.overall_score", -1)],
            "name": "risk_level_score_compound"
        },
        
        # Geospatial index for address-based queries
        {
            "key": [("contact.location", "2dsphere")],
            "name": "contact_location_2dsphere",
            "sparse": True
        },
        
        # TTL index for archived entities (optional)
        {
            "key": [("archived_date", 1)],
            "name": "archived_date_ttl",
            "expireAfterSeconds": 31536000,  # 1 year
            "partialFilterExpression": {"status": "archived"}
        }
    ])
    
    # Text search configuration
    text_search_fields: Dict[str, int] = Field(default_factory=lambda: {
        "name": 10,
        "alternate_names": 5,
        "contact.email": 3,
        "attributes.description": 2,
        "attributes.notes": 1
    })
    
    # Vector search configuration for semantic matching
    vector_search_config: Dict[str, Any] = Field(default_factory=lambda: {
        "index_name": "entity_vector_index",
        "path": "embedding",
        "num_dimensions": 1536,  # OpenAI/Titan embedding size
        "similarity": "cosine",
        "filters": ["entity_type", "status", "nationality"]
    })
    
    # JSON Schema validation
    validation_schema: Dict[str, Any] = Field(default_factory=lambda: {
        "bsonType": "object",
        "required": ["name", "entity_type", "status", "created_date"],
        "properties": {
            "name": {
                "bsonType": "string",
                "minLength": 1,
                "maxLength": 500
            },
            "entity_type": {
                "enum": ["individual", "organization"]
            },
            "status": {
                "enum": ["active", "inactive", "archived", "under_review"]
            },
            "risk_assessment": {
                "bsonType": "object",
                "properties": {
                    "overall_score": {
                        "bsonType": "double",
                        "minimum": 0,
                        "maximum": 1
                    },
                    "level": {
                        "enum": ["low", "medium", "high", "critical"]
                    }
                }
            },
            "identifiers": {
                "bsonType": "object"
            },
            "created_date": {
                "bsonType": "date"
            }
        }
    })


# ==================== RESOLUTION HISTORY COLLECTION ====================

class ResolutionHistoryCollection(CollectionConfig):
    """Configuration for resolution_history collection"""
    
    collection_name: str = "resolution_history"
    
    indexes: List[Dict[str, Any]] = Field(default_factory=lambda: [
        # Basic indexes
        {"key": [("created_date", -1)], "name": "created_date_-1"},
        {"key": [("resolution_id", 1)], "name": "resolution_id_1", "unique": True},
        {"key": [("status", 1)], "name": "status_1"},
        {"key": [("confidence_level", 1)], "name": "confidence_level_1"},
        
        # User and session tracking
        {"key": [("input_data.requested_by", 1)], "name": "requested_by_1", "sparse": True},
        {"key": [("input_data.session_id", 1)], "name": "session_id_1", "sparse": True},
        
        # Performance tracking
        {"key": [("processing_time_ms", 1)], "name": "processing_time_1"},
        
        # Entity type analysis
        {"key": [("input_data.entity_type", 1), ("confidence_level", 1)], "name": "entity_type_confidence_compound"},
        
        # Date range queries
        {"key": [("created_date", -1), ("confidence_level", 1)], "name": "date_confidence_compound"},
        
        # TTL index for cleanup (keep resolution history for 2 years)
        {
            "key": [("created_date", 1)],
            "name": "resolution_history_ttl",
            "expireAfterSeconds": 63072000  # 2 years
        }
    ])
    
    # Text search for resolution analysis
    text_search_fields: Dict[str, int] = Field(default_factory=lambda: {
        "input_data.name": 10,
        "decision_reasoning": 5,
        "best_match.entity.name": 8
    })


# ==================== RELATIONSHIP COLLECTION ====================

class RelationshipCollection(CollectionConfig):
    """Configuration for entity_relationships collection"""
    
    collection_name: str = "entity_relationships"
    
    indexes: List[Dict[str, Any]] = Field(default_factory=lambda: [
        # Core relationship indexes
        {"key": [("source_entity_id", 1)], "name": "source_entity_id_1"},
        {"key": [("target_entity_id", 1)], "name": "target_entity_id_1"},
        {"key": [("relationship_type", 1)], "name": "relationship_type_1"},
        {"key": [("strength", 1)], "name": "strength_1"},
        {"key": [("confidence_score", -1)], "name": "confidence_score_-1"},
        {"key": [("verified", 1)], "name": "verified_1"},
        {"key": [("created_date", -1)], "name": "created_date_-1"},
        
        # Compound indexes for graph traversal
        {
            "key": [("source_entity_id", 1), ("relationship_type", 1)],
            "name": "source_relationship_type_compound"
        },
        {
            "key": [("target_entity_id", 1), ("relationship_type", 1)],
            "name": "target_relationship_type_compound"
        },
        {
            "key": [("source_entity_id", 1), ("confidence_score", -1)],
            "name": "source_confidence_compound"
        },
        {
            "key": [("target_entity_id", 1), ("confidence_score", -1)],
            "name": "target_confidence_compound"
        },
        
        # Bidirectional relationship index
        {
            "key": [("source_entity_id", 1), ("target_entity_id", 1)],
            "name": "source_target_compound",
            "unique": True
        },
        
        # Verification tracking
        {
            "key": [("verified", 1), ("strength", 1), ("relationship_type", 1)],
            "name": "verified_strength_type_compound"
        },
        
        # Risk analysis indexes
        {
            "key": [("relationship_type", 1), ("confidence_score", -1)],
            "name": "type_confidence_compound"
        }
    ])
    
    # Text search for relationship descriptions
    text_search_fields: Dict[str, int] = Field(default_factory=lambda: {
        "description": 10,
        "evidence": 5,
        "data_source": 3
    })


# ==================== AUDIT LOG COLLECTION ====================

class AuditLogCollection(CollectionConfig):
    """Configuration for audit_logs collection"""
    
    collection_name: str = "audit_logs"
    
    indexes: List[Dict[str, Any]] = Field(default_factory=lambda: [
        # Basic audit indexes
        {"key": [("timestamp", -1)], "name": "timestamp_-1"},
        {"key": [("action", 1)], "name": "action_1"},
        {"key": [("entity_id", 1)], "name": "entity_id_1", "sparse": True},
        {"key": [("user_id", 1)], "name": "user_id_1", "sparse": True},
        {"key": [("session_id", 1)], "name": "session_id_1", "sparse": True},
        {"key": [("ip_address", 1)], "name": "ip_address_1", "sparse": True},
        
        # Compound indexes for audit queries
        {
            "key": [("entity_id", 1), ("timestamp", -1)],
            "name": "entity_timestamp_compound"
        },
        {
            "key": [("user_id", 1), ("timestamp", -1)],
            "name": "user_timestamp_compound"
        },
        {
            "key": [("action", 1), ("timestamp", -1)],
            "name": "action_timestamp_compound"
        },
        
        # Security monitoring indexes
        {
            "key": [("ip_address", 1), ("timestamp", -1)],
            "name": "ip_timestamp_compound"
        },
        {
            "key": [("action", 1), ("success", 1), ("timestamp", -1)],
            "name": "action_success_timestamp_compound"
        },
        
        # TTL index for log retention (keep logs for 7 years for compliance)
        {
            "key": [("timestamp", 1)],
            "name": "audit_logs_ttl",
            "expireAfterSeconds": 220752000  # 7 years
        }
    ])
    
    # Text search for audit analysis
    text_search_fields: Dict[str, int] = Field(default_factory=lambda: {
        "action": 10,
        "details.description": 5,
        "error_message": 8,
        "user_agent": 3
    })


# ==================== ADDITIONAL COLLECTIONS ====================

class MergeHistoryCollection(CollectionConfig):
    """Configuration for merge_history collection"""
    
    collection_name: str = "merge_history"
    
    indexes: List[Dict[str, Any]] = Field(default_factory=lambda: [
        {"key": [("source_entity_id", 1)], "name": "source_entity_id_1"},
        {"key": [("target_entity_id", 1)], "name": "target_entity_id_1"},
        {"key": [("performed_date", -1)], "name": "performed_date_-1"},
        {"key": [("performed_by", 1)], "name": "performed_by_1", "sparse": True},
        {"key": [("merge_strategy", 1)], "name": "merge_strategy_1"},
        
        # Compound index for entity merge history
        {
            "key": [("target_entity_id", 1), ("performed_date", -1)],
            "name": "target_date_compound"
        }
    ])


class VectorSearchMetadataCollection(CollectionConfig):
    """Configuration for vector search metadata and performance tracking"""
    
    collection_name: str = "vector_search_metadata"
    
    indexes: List[Dict[str, Any]] = Field(default_factory=lambda: [
        {"key": [("query_hash", 1)], "name": "query_hash_1"},
        {"key": [("created_date", -1)], "name": "created_date_-1"},
        {"key": [("search_time_ms", 1)], "name": "search_time_1"},
        {"key": [("result_count", 1)], "name": "result_count_1"},
        
        # TTL for search cache
        {
            "key": [("created_date", 1)],
            "name": "vector_metadata_ttl",
            "expireAfterSeconds": 3600  # 1 hour
        }
    ])


# ==================== INDEX CREATION UTILITIES ====================

def get_all_collection_configs() -> List[CollectionConfig]:
    """Get all collection configurations"""
    return [
        EntityCollection(),
        ResolutionHistoryCollection(),
        RelationshipCollection(),
        AuditLogCollection(),
        MergeHistoryCollection(),
        VectorSearchMetadataCollection()
    ]


def get_text_search_indexes() -> Dict[str, Dict[str, int]]:
    """Get text search index configurations for all collections"""
    configs = get_all_collection_configs()
    return {
        config.collection_name: config.text_search_fields
        for config in configs
        if config.text_search_fields
    }


def get_vector_search_configs() -> Dict[str, Dict[str, Any]]:
    """Get vector search configurations"""
    configs = get_all_collection_configs()
    return {
        config.collection_name: config.vector_search_config
        for config in configs
        if config.vector_search_config
    }


# ==================== DATABASE SCHEMA VALIDATION ====================

def get_validation_schemas() -> Dict[str, Dict[str, Any]]:
    """Get JSON schema validation rules for all collections"""
    configs = get_all_collection_configs()
    return {
        config.collection_name: config.validation_schema
        for config in configs
        if config.validation_schema
    }


# ==================== PERFORMANCE RECOMMENDATIONS ====================

class PerformanceRecommendations:
    """Performance recommendations for MongoDB operations"""
    
    # Recommended batch sizes for different operations
    BATCH_SIZES = {
        "bulk_insert": 1000,
        "bulk_update": 500,
        "bulk_delete": 100,
        "aggregation_limit": 10000,
        "search_limit": 100
    }
    
    # Connection pool settings
    CONNECTION_POOL = {
        "min_pool_size": 5,
        "max_pool_size": 50,
        "max_idle_time_ms": 30000,
        "wait_queue_timeout_ms": 5000,
        "server_selection_timeout_ms": 30000
    }
    
    # Query optimization hints
    QUERY_HINTS = {
        "entity_by_type_status": {"entity_type": 1, "status": 1},
        "entity_by_risk": {"risk_assessment.level": 1, "risk_assessment.overall_score": -1},
        "relationship_by_source": {"source_entity_id": 1, "confidence_score": -1},
        "resolution_by_date": {"created_date": -1}
    }
    
    # Aggregation pipeline optimizations
    AGGREGATION_TIPS = [
        "Use $match as early as possible in pipeline",
        "Use $project to limit fields before expensive operations",
        "Use $limit to reduce documents processed",
        "Use compound indexes for multi-field filters",
        "Consider $facet for multiple aggregations on same data"
    ]