"""
Service Dependencies - FastAPI dependency injection for services using repository pattern

Provides clean dependency injection for all service layers, ensuring consistent
repository access and configuration across the application.
"""

import logging
import os
from typing import Optional
from functools import lru_cache

from fastapi import Depends

from repositories.factory.repository_factory import RepositoryFactory

logger = logging.getLogger(__name__)


# ==================== REPOSITORY FACTORY DEPENDENCIES ====================

@lru_cache()
def get_repository_factory() -> RepositoryFactory:
    """
    Get or create repository factory instance
    
    Uses LRU cache to ensure singleton behavior for repository factory,
    providing consistent database connections and repository instances.
    
    Returns:
        RepositoryFactory: Configured repository factory
    """
    try:
        factory = RepositoryFactory(
            connection_string=os.getenv("MONGODB_URI"),
            database_name=os.getenv("DB_NAME", "fsi-threatsight360"),
            # Bedrock client will be added when needed for AI features
        )
        logger.info("Repository factory initialized successfully")
        return factory
        
    except Exception as e:
        logger.error(f"Failed to initialize repository factory: {e}")
        raise


@lru_cache()
def get_entity_repository():
    """Get EntityRepository through factory (cached singleton)"""
    factory = get_repository_factory()
    return factory.get_entity_repository()


@lru_cache()
def get_relationship_repository():
    """Get RelationshipRepository through factory (cached singleton)"""
    factory = get_repository_factory()
    return factory.get_relationship_repository()


@lru_cache()
def get_atlas_search_repository():
    """Get AtlasSearchRepository through factory (cached singleton)"""
    factory = get_repository_factory()
    return factory.get_atlas_search_repository()


@lru_cache()
def get_vector_search_repository():
    """Get VectorSearchRepository through factory (cached singleton)"""
    factory = get_repository_factory()
    return factory.get_vector_search_repository()


@lru_cache()
def get_network_repository():
    """Get NetworkRepository through factory (cached singleton)"""
    factory = get_repository_factory()
    return factory.get_network_repository()


async def get_matching_service(
    entity_repo = Depends(get_entity_repository),
    atlas_search_repo = Depends(get_atlas_search_repository),
    vector_search_repo = Depends(get_vector_search_repository)
):
    """Get MatchingService with injected repositories"""
    from services.core.matching_service import MatchingService
    return MatchingService(
        entity_repo=entity_repo,
        atlas_search_repo=atlas_search_repo,
        vector_search_repo=vector_search_repo
    )


async def get_confidence_service():
    """Get ConfidenceService (stateless service)"""
    from services.core.confidence_service import ConfidenceService
    return ConfidenceService()


async def get_merge_service(
    entity_repo = Depends(get_entity_repository),
    relationship_repo = Depends(get_relationship_repository)
):
    """Get MergeService with injected repositories"""
    from services.core.merge_service import MergeService
    return MergeService(
        entity_repo=entity_repo,
        relationship_repo=relationship_repo
    )


async def get_entity_resolution_service(
    matching_service = Depends(get_matching_service),
    confidence_service = Depends(get_confidence_service),
    merge_service = Depends(get_merge_service)
):
    """Get EntityResolutionService with injected service dependencies"""
    from services.core.entity_resolution_service import EntityResolutionService
    return EntityResolutionService(
        matching_service=matching_service,
        confidence_service=confidence_service,
        merge_service=merge_service
    )


# ==================== SEARCH SERVICE DEPENDENCIES ====================

async def get_atlas_search_service(
    atlas_search_repo = Depends(get_atlas_search_repository)
):
    """Get AtlasSearchService with injected repository"""
    from services.search.atlas_search_service import AtlasSearchService
    return AtlasSearchService(atlas_search_repo=atlas_search_repo)


async def get_vector_search_service(
    vector_search_repo = Depends(get_vector_search_repository)
):
    """Get VectorSearchService with injected repository"""
    from services.search.vector_search_service import VectorSearchService
    return VectorSearchService(vector_search_repo=vector_search_repo)


async def get_unified_search_service(
    atlas_search_service = Depends(get_atlas_search_service),
    vector_search_service = Depends(get_vector_search_service)
):
    """Get UnifiedSearchService with injected search services"""
    from services.search.unified_search_service import UnifiedSearchService
    return UnifiedSearchService(
        atlas_search_service=atlas_search_service,
        vector_search_service=vector_search_service
    )


def get_entity_search_service(
    atlas_search_repo = Depends(get_atlas_search_repository),
    entity_repo = Depends(get_entity_repository)
):
    """Get EntitySearchService with injected repositories - Phase 7 Implementation"""
    from services.search.entity_search_service import EntitySearchService
    return EntitySearchService(
        atlas_search_repo=atlas_search_repo,
        entity_repo=entity_repo
    )


# ==================== CORE SERVICE DEPENDENCIES ====================

async def get_relationship_service(
    relationship_repo = Depends(get_relationship_repository),
    entity_repo = Depends(get_entity_repository)
):
    """Get RelationshipService with injected repositories"""
    from services.core.relationship_service import RelationshipService
    return RelationshipService(
        relationship_repo=relationship_repo,
        entity_repo=entity_repo
    )


# ==================== NETWORK SERVICE DEPENDENCIES ====================

async def get_network_analysis_service(
    network_repo = Depends(get_network_repository)
):
    """Get NetworkAnalysisService with injected repository"""
    from services.network.network_analysis_service import NetworkAnalysisService
    return NetworkAnalysisService(network_repo=network_repo)


# ==================== LLM SERVICE DEPENDENCIES ====================

@lru_cache()
def get_bedrock_client():
    """Get AWS Bedrock client (cached singleton)"""
    from bedrock.client import BedrockClient
    return BedrockClient()


async def get_streaming_classification_service(
    bedrock_client = Depends(get_bedrock_client)
):
    """Get StreamingClassificationService with injected Bedrock client"""
    from services.llm.streaming_classification_service import StreamingClassificationService
    return StreamingClassificationService(bedrock_client=bedrock_client)


async def get_investigation_service(
    bedrock_client = Depends(get_bedrock_client)
):
    """Get InvestigationService with injected Bedrock client"""
    from services.llm.investigation_service import InvestigationService
    return InvestigationService(bedrock_client=bedrock_client)


# ==================== UTILITY FUNCTIONS ====================

async def health_check_services() -> dict:
    """
    Perform health check on all service dependencies
    
    Returns:
        dict: Health status of repositories and services
    """
    try:
        factory = get_repository_factory()
        health_status = factory.health_check()
        
        # Add service-specific health checks here
        health_status["services"] = {
            "dependency_injection": "healthy",
            "factory_pattern": "healthy"
        }
        
        return health_status
        
    except Exception as e:
        logger.error(f"Service health check failed: {e}")
        return {
            "status": "unhealthy",
            "error": str(e)
        }


def cleanup_service_dependencies():
    """Cleanup service dependencies and repository factory"""
    try:
        # Clear the cache to force recreation of factory
        get_repository_factory.cache_clear()
        logger.info("Service dependencies cleaned up")
        
    except Exception as e:
        logger.error(f"Error during service cleanup: {e}")


# ==================== CONFIGURATION ====================

class ServiceConfig:
    """Configuration helper for service dependencies"""
    
    @staticmethod
    def get_development_config():
        """Get development configuration for services"""
        return {
            "enable_caching": True,
            "log_level": "DEBUG",
            "repository_timeout": 30000,
            "enable_ai_features": False
        }
    
    @staticmethod  
    def get_production_config():
        """Get production configuration for services"""
        return {
            "enable_caching": True,
            "log_level": "INFO", 
            "repository_timeout": 10000,
            "enable_ai_features": True,
            "connection_pool_size": 50
        }