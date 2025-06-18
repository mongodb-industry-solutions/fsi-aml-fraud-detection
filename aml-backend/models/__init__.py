"""
Consolidated Model Imports - Clean, organized model access

This provides clean imports for the new consolidated model structure while
maintaining backward compatibility during migration.
"""

# ==================== NEW CONSOLIDATED IMPORTS ====================

# Core domain models
from .core.entity import (
    Entity,
    ContactInfo,
    RiskAssessment,
    WatchlistMatch,
    EntitySummary,
    EntityDetail,
    EntityType,
    EntityStatus,
    RiskLevel,
    WatchlistType,
    validate_entity_data
)

from .core.resolution import (
    ResolutionResult,
    ResolutionInput,
    ResolutionDecisionInput,
    PotentialMatch,
    MatchEvidence,
    SearchCriteria,
    SearchResult,
    MergeRequest,
    MergeResult,
    MatchingConfig,
    ResolutionDecision,
    ResolutionStatus,
    MatchType,
    ConfidenceLevel
)

from .core.network import (
    EntityRelationship,
    NetworkNode,
    NetworkEdge,
    EntityNetwork,
    NetworkSearchCriteria,
    NetworkDiscoveryResult,
    RelationshipCreationRequest,
    RelationshipUpdateRequest,
    RelationshipType,
    RelationshipStrength,
    NetworkRiskLevel
)

# API models
from .api.requests import (
    EntityCreateRequest,
    EntityUpdateRequest,
    EntitySearchRequest,
    ResolutionRequest,
    NetworkDiscoveryRequest,
    RelationshipCreateRequest as APIRelationshipCreateRequest,
    AdvancedSearchRequest,
    BulkEntityOperation
)

from .api.responses import (
    StandardResponse,
    ErrorResponse,
    EntityResponse,
    EntitiesListResponse,
    ResolutionResponse,
    NetworkResponse,
    SearchResponse,
    PaginationInfo,
    create_success_response,
    create_error_response,
    create_pagination_info
)

# Database models
from .database.collections import (
    EntityCollection,
    ResolutionHistoryCollection,
    RelationshipCollection,
    AuditLogCollection,
    get_all_collection_configs,
    get_text_search_indexes,
    get_vector_search_configs
)

# ==================== BACKWARD COMPATIBILITY ====================

# Import legacy compatibility layer for existing code
from .legacy_compatibility import (
    # Legacy entity aliases
    EntityBasic,
    EntityEnhanced,
    EntityBasicEnhanced,
    OverallRisk,
    Name,
    Address,
    
    # Legacy resolution aliases  
    NewOnboardingInput,
    FindMatchesResponse,
    
    # Legacy relationship aliases
    Relationship,
    
    # Migration utilities
    get_migration_suggestions,
    check_for_legacy_usage,
    IMPORT_MAPPING
)

# ==================== MAIN EXPORTS ====================

__all__ = [
    # ===== CORE MODELS =====
    # Entity models
    "Entity",
    "ContactInfo", 
    "RiskAssessment",
    "WatchlistMatch",
    "EntitySummary",
    "EntityDetail",
    "EntityType",
    "EntityStatus", 
    "RiskLevel",
    "WatchlistType",
    "validate_entity_data",
    
    # Resolution models
    "ResolutionResult",
    "ResolutionInput",
    "ResolutionDecisionInput", 
    "PotentialMatch",
    "MatchEvidence",
    "SearchCriteria",
    "SearchResult",
    "MergeRequest",
    "MergeResult",
    "MatchingConfig",
    "ResolutionDecision",
    "ResolutionStatus",
    "MatchType",
    "ConfidenceLevel",
    
    # Network models
    "EntityRelationship",
    "NetworkNode",
    "NetworkEdge", 
    "EntityNetwork",
    "NetworkSearchCriteria",
    "NetworkDiscoveryResult",
    "RelationshipCreationRequest",
    "RelationshipUpdateRequest", 
    "RelationshipType",
    "RelationshipStrength",
    "NetworkRiskLevel",
    
    # ===== API MODELS =====
    # Request models
    "EntityCreateRequest",
    "EntityUpdateRequest",
    "EntitySearchRequest", 
    "ResolutionRequest",
    "NetworkDiscoveryRequest",
    "APIRelationshipCreateRequest",
    "AdvancedSearchRequest",
    "BulkEntityOperation",
    
    # Response models
    "StandardResponse",
    "ErrorResponse",
    "EntityResponse", 
    "EntitiesListResponse",
    "ResolutionResponse",
    "NetworkResponse",
    "SearchResponse",
    "PaginationInfo",
    "create_success_response",
    "create_error_response", 
    "create_pagination_info",
    
    # ===== DATABASE MODELS =====
    "EntityCollection",
    "ResolutionHistoryCollection",
    "RelationshipCollection", 
    "AuditLogCollection",
    "get_all_collection_configs",
    "get_text_search_indexes",
    "get_vector_search_configs",
    
    # ===== LEGACY COMPATIBILITY =====
    # Legacy model aliases (deprecated)
    "EntityBasic",
    "EntityEnhanced",
    "EntityBasicEnhanced", 
    "OverallRisk",
    "Name",
    "Address",
    "NewOnboardingInput",
    "FindMatchesResponse",
    "Relationship",
    
    # Migration utilities
    "get_migration_suggestions",
    "check_for_legacy_usage",
    "IMPORT_MAPPING"
]

# ==================== CONVENIENCE IMPORTS ====================

# Commonly used model groups for easy importing
ENTITY_MODELS = [
    Entity, ContactInfo, RiskAssessment, WatchlistMatch, 
    EntitySummary, EntityDetail
]

RESOLUTION_MODELS = [
    ResolutionResult, ResolutionInput, PotentialMatch, 
    MatchEvidence, SearchCriteria, SearchResult
]

NETWORK_MODELS = [
    EntityRelationship, NetworkNode, NetworkEdge, 
    EntityNetwork, NetworkSearchCriteria
]

API_REQUEST_MODELS = [
    EntityCreateRequest, EntityUpdateRequest, EntitySearchRequest,
    ResolutionRequest, NetworkDiscoveryRequest
]

API_RESPONSE_MODELS = [
    StandardResponse, ErrorResponse, EntityResponse,
    EntitiesListResponse, ResolutionResponse, NetworkResponse
]

# ==================== MODEL VALIDATION ====================

def validate_all_models():
    """Validate all model definitions for consistency"""
    validation_results = {
        "entity_models": [],
        "resolution_models": [],
        "network_models": [],
        "api_models": [],
        "database_models": [],
        "errors": []
    }
    
    try:
        # Test entity model creation
        test_entity = Entity(
            name="Test Entity",
            entity_type=EntityType.INDIVIDUAL
        )
        validation_results["entity_models"].append("Entity: OK")
        
        # Test resolution model creation
        test_resolution = ResolutionInput(
            name="Test Resolution",
            entity_type=EntityType.INDIVIDUAL
        )
        validation_results["resolution_models"].append("ResolutionInput: OK")
        
        # Test network model creation
        test_relationship = EntityRelationship(
            source_entity_id="test1",
            target_entity_id="test2", 
            relationship_type=RelationshipType.BUSINESS_ASSOCIATE
        )
        validation_results["network_models"].append("EntityRelationship: OK")
        
        # Test API model creation
        test_request = EntityCreateRequest(
            name="Test API Request",
            entity_type=EntityType.INDIVIDUAL
        )
        validation_results["api_models"].append("EntityCreateRequest: OK")
        
        test_response = create_success_response(data={"test": "data"})
        validation_results["api_models"].append("StandardResponse: OK")
        
        # Test database config
        entity_collection = EntityCollection()
        validation_results["database_models"].append("EntityCollection: OK")
        
    except Exception as e:
        validation_results["errors"].append(f"Validation error: {str(e)}")
    
    return validation_results


# ==================== MIGRATION STATUS ====================

def get_migration_status():
    """Get current migration status and recommendations"""
    return {
        "phase": "Phase 1: Model Consolidation", 
        "status": "Complete",
        "new_models_available": True,
        "legacy_compatibility": True,
        "next_phase": "Phase 2: Repository Pattern Implementation",
        "recommendations": [
            "Update imports to use new consolidated models",
            "Test functionality with new model structure",
            "Begin updating services to use new models",
            "Plan repository pattern implementation"
        ],
        "legacy_usage_check": "Use check_for_legacy_usage() to scan files",
        "migration_guide": "See get_migration_suggestions() for detailed guidance"
    }


# ==================== MODULE METADATA ====================

__version__ = "2.0.0"
__author__ = "AML Migration Team"
__description__ = "Consolidated entity resolution models with clean architecture"

# Issue startup message about new model structure
import warnings
warnings.warn(
    "New consolidated model structure is now available! "
    "Update your imports to use the new models from models.core, models.api, and models.database. "
    "Use get_migration_status() for guidance.",
    UserWarning,
    stacklevel=1
)