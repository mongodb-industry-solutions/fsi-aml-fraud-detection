"""
Legacy Compatibility Layer

This module provides backward compatibility for existing imports while
the migration is in progress. It maps old imports to new consolidated models.

This file should be removed after migration is complete and all imports are updated.
"""

import warnings
from typing import Any

# Import new models
from .core.entity import (
    Entity as NewEntity,
    ContactInfo as NewContactInfo,
    RiskAssessment as NewRiskAssessment,
    WatchlistMatch as NewWatchlistMatch,
    EntitySummary as NewEntitySummary,
    EntityDetail as NewEntityDetail,
    EntityType,
    EntityStatus,
    RiskLevel
)

from .core.resolution import (
    ResolutionResult as NewResolutionResult,
    ResolutionInput as NewResolutionInput,
    PotentialMatch as NewPotentialMatch,
    MatchEvidence as NewMatchEvidence,
    ResolutionDecision,
    ResolutionStatus,
    MatchType,
    ConfidenceLevel
)

from .core.network import (
    EntityRelationship as NewEntityRelationship,
    RelationshipType,
    RelationshipStrength
)

from .api.responses import (
    StandardResponse,
    ErrorResponse,
    EntitiesListResponse
)


def deprecation_warning(old_name: str, new_name: str) -> None:
    """Issue deprecation warning for legacy imports"""
    warnings.warn(
        f"{old_name} is deprecated. Use {new_name} instead. "
        f"This legacy import will be removed in a future version.",
        DeprecationWarning,
        stacklevel=3
    )


# ==================== LEGACY ENTITY MODEL ALIASES ====================

class EntityBasic(NewEntity):
    """Legacy alias for Entity (from entity.py)"""
    def __init__(self, **data: Any):
        deprecation_warning("EntityBasic", "models.core.entity.Entity")
        super().__init__(**data)


class EntityDetail(NewEntityDetail):
    """Legacy alias for EntityDetail (from entity.py)"""
    def __init__(self, **data: Any):
        deprecation_warning("EntityDetail", "models.core.entity.EntityDetail")
        super().__init__(**data)


class EntityEnhanced(NewEntity):
    """Legacy alias for Entity (from entity_enhanced.py)"""
    def __init__(self, **data: Any):
        deprecation_warning("EntityEnhanced", "models.core.entity.Entity")
        super().__init__(**data)


class EntityBasicEnhanced(NewEntity):
    """Legacy alias for Entity (from entity_enhanced.py)"""
    def __init__(self, **data: Any):
        deprecation_warning("EntityBasicEnhanced", "models.core.entity.Entity")
        super().__init__(**data)


# Legacy nested model aliases
class Name(NewContactInfo):
    """Legacy Name model - now part of ContactInfo"""
    def __init__(self, **data: Any):
        deprecation_warning("Name", "models.core.entity.ContactInfo")
        # Map legacy name fields to contact info
        if 'first_name' in data or 'last_name' in data:
            data['name'] = f"{data.get('first_name', '')} {data.get('last_name', '')}".strip()
        super().__init__(**data)


class Address(NewContactInfo):
    """Legacy Address model - now part of ContactInfo"""
    def __init__(self, **data: Any):
        deprecation_warning("Address", "models.core.entity.ContactInfo")
        super().__init__(**data)


class OverallRisk(NewRiskAssessment):
    """Legacy OverallRisk model - now RiskAssessment"""
    def __init__(self, **data: Any):
        deprecation_warning("OverallRisk", "models.core.entity.RiskAssessment")
        super().__init__(**data)


# ==================== LEGACY RESOLUTION MODEL ALIASES ====================

class NewOnboardingInput(NewResolutionInput):
    """Legacy onboarding input model"""
    def __init__(self, **data: Any):
        deprecation_warning("NewOnboardingInput", "models.core.resolution.ResolutionInput")
        super().__init__(**data)


class FindMatchesResponse(StandardResponse):
    """Legacy find matches response"""
    def __init__(self, **data: Any):
        deprecation_warning("FindMatchesResponse", "models.api.responses.StandardResponse")
        super().__init__(**data)


class ResolutionResponse(StandardResponse):
    """Legacy resolution response"""
    def __init__(self, **data: Any):
        deprecation_warning("ResolutionResponse", "models.api.responses.ResolutionResponse")
        super().__init__(**data)


# ==================== LEGACY RELATIONSHIP ALIASES ====================

class EntityRelationship(NewEntityRelationship):
    """Legacy relationship model"""
    def __init__(self, **data: Any):
        deprecation_warning("EntityRelationship", "models.core.network.EntityRelationship")
        super().__init__(**data)


# Fix the import issue in entity_resolution.py that imports EntityRelationship but should be Relationship
class Relationship(NewEntityRelationship):
    """Legacy relationship alias to fix import issues"""
    def __init__(self, **data: Any):
        deprecation_warning("Relationship", "models.core.network.EntityRelationship")
        super().__init__(**data)


# ==================== LEGACY ENUM ALIASES ====================

# Re-export enums with deprecation warnings where names changed
def get_legacy_enum(enum_class, old_name: str):
    """Create legacy enum alias with deprecation warning"""
    def enum_access():
        deprecation_warning(old_name, f"models.core.{enum_class.__module__.split('.')[-1]}.{enum_class.__name__}")
        return enum_class
    return enum_access


# Legacy enum aliases (these will issue warnings when accessed)
RiskLevelEnum = get_legacy_enum(RiskLevel, "RiskLevelEnum")
EntityTypeEnum = get_legacy_enum(EntityType, "EntityTypeEnum")
ResolutionStatusEnum = get_legacy_enum(ResolutionStatus, "ResolutionStatusEnum")


# ==================== LEGACY FUNCTION ALIASES ====================

def validate_entity_data(data: dict) -> dict:
    """Legacy validation function"""
    deprecation_warning("validate_entity_data", "models.core.entity.validate_entity_data")
    from .core.entity import validate_entity_data as new_validate
    return new_validate(data)


# ==================== IMPORT MAPPING FOR MIGRATION ====================

# This dictionary maps old import paths to new ones for migration scripts
IMPORT_MAPPING = {
    # Old entity imports
    "models.entity.EntityBasic": "models.core.entity.Entity",
    "models.entity.EntityDetail": "models.core.entity.EntityDetail", 
    "models.entity.EntitiesListResponse": "models.api.responses.EntitiesListResponse",
    "models.entity.ErrorResponse": "models.api.responses.ErrorResponse",
    
    # Old entity_enhanced imports  
    "models.entity_enhanced.EntityEnhanced": "models.core.entity.Entity",
    "models.entity_enhanced.EntityBasicEnhanced": "models.core.entity.Entity",
    "models.entity_enhanced.NameEnhanced": "models.core.entity.ContactInfo",
    "models.entity_enhanced.RiskAssessmentEnhanced": "models.core.entity.RiskAssessment",
    
    # Old entity_flexible imports
    "models.entity_flexible.EntityBasic": "models.core.entity.Entity",
    "models.entity_flexible.EntityDetail": "models.core.entity.EntityDetail",
    
    # Old entity_resolution imports
    "models.entity_resolution.NewOnboardingInput": "models.core.resolution.ResolutionInput",
    "models.entity_resolution.PotentialMatch": "models.core.resolution.PotentialMatch",
    "models.entity_resolution.FindMatchesResponse": "models.api.responses.StandardResponse",
    "models.entity_resolution.ResolutionResponse": "models.api.responses.ResolutionResponse",
    "models.entity_resolution.ResolutionStatus": "models.core.resolution.ResolutionStatus",
    "models.entity_resolution.ResolutionDecision": "models.core.resolution.ResolutionDecision",
    
    # Network/relationship imports
    "models.relationship.EntityRelationship": "models.core.network.EntityRelationship",
    "models.network.NetworkNode": "models.core.network.NetworkNode",
}


def get_migration_suggestions() -> dict:
    """Get suggestions for updating imports during migration"""
    return {
        "deprecated_imports": list(IMPORT_MAPPING.keys()),
        "recommended_imports": list(IMPORT_MAPPING.values()),
        "mapping": IMPORT_MAPPING,
        "migration_steps": [
            "1. Update import statements to use new model locations",
            "2. Replace deprecated model names with new names", 
            "3. Update any custom validation or transformation logic",
            "4. Test all functionality with new models",
            "5. Remove legacy_compatibility.py imports"
        ]
    }


# ==================== MIGRATION UTILITIES ====================

def check_for_legacy_usage(file_path: str) -> list:
    """Check a Python file for legacy model usage"""
    legacy_patterns = [
        "from models.entity import",
        "from models.entity_enhanced import", 
        "from models.entity_flexible import",
        "from models.entity_resolution import",
        "EntityBasic",
        "EntityEnhanced", 
        "EntityBasicEnhanced",
        "NewOnboardingInput",
        "OverallRisk"
    ]
    
    issues = []
    try:
        with open(file_path, 'r') as f:
            content = f.read()
            for i, line in enumerate(content.split('\n'), 1):
                for pattern in legacy_patterns:
                    if pattern in line:
                        issues.append({
                            "line": i,
                            "pattern": pattern,
                            "line_content": line.strip(),
                            "suggestion": IMPORT_MAPPING.get(pattern, "Update to use new consolidated models")
                        })
    except FileNotFoundError:
        pass
    
    return issues


# ==================== WARNING SETUP ====================

# Configure warnings to be visible during development
warnings.filterwarnings("default", category=DeprecationWarning, module=__name__)

# Show a startup warning that legacy compatibility is active
warnings.warn(
    "Legacy compatibility layer is active. "
    "Please update imports to use new consolidated models. "
    "See models.legacy_compatibility.get_migration_suggestions() for guidance.",
    DeprecationWarning,
    stacklevel=1
)