"""
Repository Factory - Clean dependency injection for repositories

Provides centralized creation and management of repository instances using
mongodb_core_lib, ensuring consistent configuration and optimal resource usage.
"""

import logging
from typing import Dict, Any, Optional
import os

from reference.mongodb_core_lib import MongoDBRepository
from repositories.impl.entity_repository import EntityRepository
from repositories.impl.relationship_repository import RelationshipRepository
from repositories.impl.atlas_search_repository import AtlasSearchRepository
from repositories.impl.vector_search_repository import VectorSearchRepository
from repositories.impl.network_repository import NetworkRepository

logger = logging.getLogger(__name__)


class RepositoryFactory:
    """
    Factory for creating and managing repository instances
    
    Provides clean dependency injection pattern with singleton repository instances
    that share a common MongoDB connection and configuration.
    """
    
    def __init__(self, 
                 connection_string: Optional[str] = None,
                 database_name: Optional[str] = None,
                 bedrock_client: Optional[Any] = None):
        """
        Initialize repository factory
        
        Args:
            connection_string: MongoDB connection string
            database_name: Database name
            bedrock_client: Optional AWS Bedrock client for AI features
        """
        # Use environment variables as defaults
        self.connection_string = connection_string or os.getenv("MONGODB_URI")
        self.database_name = database_name or os.getenv("DB_NAME", "fsi-threatsight360")
        self.bedrock_client = bedrock_client
        
        # Initialize core MongoDB repository
        self.mongodb_repo = MongoDBRepository(
            connection_string=self.connection_string,
            database_name=self.database_name,
            bedrock_client=self.bedrock_client
        )
        
        # Repository instances cache
        self._repositories: Dict[str, Any] = {}
        
        logger.info(f"Initialized RepositoryFactory for database: {self.database_name}")
    
    # ==================== REPOSITORY GETTERS ====================
    
    def get_entity_repository(self) -> EntityRepository:
        """
        Get or create EntityRepository instance
        
        Returns:
            EntityRepository: Configured entity repository
        """
        if "entity" not in self._repositories:
            self._repositories["entity"] = EntityRepository(
                mongodb_repo=self.mongodb_repo,
                collection_name="entities"
            )
            logger.debug("Created EntityRepository instance")
        
        return self._repositories["entity"]
    
    def get_relationship_repository(self) -> RelationshipRepository:
        """
        Get or create RelationshipRepository instance
        
        Returns:
            RelationshipRepository: Configured relationship repository
        """
        if "relationship" not in self._repositories:
            self._repositories["relationship"] = RelationshipRepository(
                mongodb_repo=self.mongodb_repo,
                collection_name="entity_relationships"
            )
            logger.debug("Created RelationshipRepository instance")
        
        return self._repositories["relationship"]
    
    def get_atlas_search_repository(self) -> AtlasSearchRepository:
        """
        Get or create AtlasSearchRepository instance
        
        Returns:
            AtlasSearchRepository: Configured Atlas Search repository
        """
        if "atlas_search" not in self._repositories:
            self._repositories["atlas_search"] = AtlasSearchRepository(
                mongodb_repo=self.mongodb_repo,
                collection_name="entities",
                search_index_name="entity_resolution_search"
            )
            logger.debug("Created AtlasSearchRepository instance")
        
        return self._repositories["atlas_search"]
    
    def get_vector_search_repository(self) -> VectorSearchRepository:
        """
        Get or create VectorSearchRepository instance
        
        Returns:
            VectorSearchRepository: Configured vector search repository
        """
        if "vector_search" not in self._repositories:
            self._repositories["vector_search"] = VectorSearchRepository(
                mongodb_repo=self.mongodb_repo,
                collection_name="entities",
                vector_index_name="entity_vector_search_index"
            )
            logger.debug("Created VectorSearchRepository instance")
        
        return self._repositories["vector_search"]
    
    def get_network_repository(self) -> NetworkRepository:
        """
        Get or create NetworkRepository instance
        
        Returns:
            NetworkRepository: Configured network repository
        """
        if "network" not in self._repositories:
            self._repositories["network"] = NetworkRepository(
                mongodb_repo=self.mongodb_repo,
                entity_collection="entities",
                relationship_collection="entity_relationships"
            )
            logger.debug("Created NetworkRepository instance")
        
        return self._repositories["network"]
    
    # ==================== UTILITY METHODS ====================
    
    def get_mongodb_repository(self) -> MongoDBRepository:
        """
        Get the underlying MongoDBRepository instance
        
        Returns:
            MongoDBRepository: Core MongoDB repository
        """
        return self.mongodb_repo
    
    def configure_repositories(self, config: Dict[str, Any]) -> None:
        """
        Configure repository settings
        
        Args:
            config: Configuration dictionary with repository settings
        """
        # Apply configuration to repositories
        for repo_name, repo_instance in self._repositories.items():
            if hasattr(repo_instance, 'configure'):
                repo_config = config.get(repo_name, {})
                repo_instance.configure(repo_config)
                logger.debug(f"Applied configuration to {repo_name} repository")
    
    def get_all_repositories(self) -> Dict[str, Any]:
        """
        Get all repository instances
        
        Returns:
            Dict[str, Any]: Dictionary of repository instances
        """
        repos = {
            "entity": self.get_entity_repository(),
            "relationship": self.get_relationship_repository(),
            "atlas_search": self.get_atlas_search_repository(),
            "vector_search": self.get_vector_search_repository()
        }
        
        # Include all implemented repositories
        repos["network"] = self.get_network_repository()
            
        return repos
    
    def health_check(self) -> Dict[str, Any]:
        """
        Perform health check on all repositories
        
        Returns:
            Dict[str, Any]: Health status of all repositories
        """
        health_status = {
            "mongodb_connection": "unknown",
            "repositories": {},
            "timestamp": "unknown"
        }
        
        try:
            from datetime import datetime
            health_status["timestamp"] = datetime.utcnow().isoformat()
            
            # Test MongoDB connection
            collections = ["entities", "entity_relationships"]
            for collection_name in collections:
                collection = self.mongodb_repo.collection(collection_name)
                # Simple ping test
                count = collection.count_documents({}, limit=1)
                health_status["mongodb_connection"] = "healthy"
            
            # Test repository instances
            repositories = self.get_all_repositories()
            for repo_name, repo_instance in repositories.items():
                if hasattr(repo_instance, 'health_check'):
                    health_status["repositories"][repo_name] = repo_instance.health_check()
                else:
                    health_status["repositories"][repo_name] = "available"
            
        except Exception as e:
            logger.error(f"Health check failed: {e}")
            health_status["mongodb_connection"] = f"error: {str(e)}"
        
        return health_status
    
    def cleanup(self) -> None:
        """
        Cleanup repository resources
        """
        try:
            # Close MongoDB connection
            if hasattr(self.mongodb_repo, 'close'):
                self.mongodb_repo.close()
            
            # Clear repository cache
            self._repositories.clear()
            
            logger.info("Repository factory cleanup completed")
            
        except Exception as e:
            logger.error(f"Error during cleanup: {e}")
    
    # ==================== ADVANCED FEATURES ====================
    
    def create_repository_with_config(self, repo_type: str, config: Dict[str, Any]) -> Any:
        """
        Create repository with custom configuration
        
        Args:
            repo_type: Type of repository to create
            config: Custom configuration
            
        Returns:
            Repository instance with custom config
        """
        if repo_type == "entity":
            return EntityRepository(
                mongodb_repo=self.mongodb_repo,
                collection_name=config.get("collection_name", "entities")
            )
        elif repo_type == "relationship":
            return RelationshipRepository(
                mongodb_repo=self.mongodb_repo,
                collection_name=config.get("collection_name", "entity_relationships")
            )
        elif repo_type == "atlas_search":
            return AtlasSearchRepository(
                mongodb_repo=self.mongodb_repo,
                collection_name=config.get("collection_name", "entities"),
                search_index_name=config.get("search_index_name", "entity_resolution_search")
            )
        elif repo_type == "vector_search":
            return VectorSearchRepository(
                mongodb_repo=self.mongodb_repo,
                collection_name=config.get("collection_name", "entities"),
                vector_index_name=config.get("vector_index_name", "entity_vector_search_index")
            )
        elif repo_type == "network":
            return NetworkRepository(
                mongodb_repo=self.mongodb_repo,
                entity_collection=config.get("entity_collection", "entities"),
                relationship_collection=config.get("relationship_collection", "entity_relationships")
            )
        else:
            raise ValueError(f"Unknown repository type: {repo_type}")
    
    def get_repository_stats(self) -> Dict[str, Any]:
        """
        Get statistics about repository usage
        
        Returns:
            Dict[str, Any]: Repository usage statistics
        """
        return {
            "active_repositories": len(self._repositories),
            "repository_types": list(self._repositories.keys()),
            "database_name": self.database_name,
            "has_bedrock_client": self.bedrock_client is not None
        }
    
    # ==================== CONTEXT MANAGER SUPPORT ====================
    
    def __enter__(self):
        """Context manager entry"""
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit with cleanup"""
        self.cleanup()
    
    async def __aenter__(self):
        """Async context manager entry"""
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit with cleanup"""
        self.cleanup()


# ==================== FACTORY CONFIGURATION ====================

class RepositoryConfig:
    """Configuration helper for repository factory"""
    
    @staticmethod
    def development_config() -> Dict[str, Any]:
        """Get development configuration"""
        return {
            "mongodb_uri": "mongodb://localhost:27017",
            "database_name": "fsi-threatsight360-dev",
            "enable_ai_features": False,
            "logging_level": "DEBUG"
        }
    
    @staticmethod
    def production_config() -> Dict[str, Any]:
        """Get production configuration"""
        return {
            "mongodb_uri": os.getenv("MONGODB_URI"),
            "database_name": os.getenv("DB_NAME", "fsi-threatsight360"),
            "enable_ai_features": True,
            "logging_level": "INFO",
            "connection_pool_size": 50,
            "timeout_ms": 30000
        }
    
    @staticmethod
    def testing_config() -> Dict[str, Any]:
        """Get testing configuration"""
        return {
            "mongodb_uri": "mongodb://localhost:27017",
            "database_name": "fsi-threatsight360-test",
            "enable_ai_features": False,
            "logging_level": "WARNING"
        }


# ==================== GLOBAL FACTORY INSTANCE ====================

# Global factory instance for easy access (optional)
_global_factory: Optional[RepositoryFactory] = None


def get_global_repository_factory() -> RepositoryFactory:
    """
    Get or create global repository factory instance
    
    Returns:
        RepositoryFactory: Global factory instance
    """
    global _global_factory
    
    if _global_factory is None:
        _global_factory = RepositoryFactory()
        logger.info("Created global repository factory")
    
    return _global_factory


def set_global_repository_factory(factory: RepositoryFactory) -> None:
    """
    Set global repository factory instance
    
    Args:
        factory: Repository factory to set as global
    """
    global _global_factory
    _global_factory = factory
    logger.info("Set global repository factory")


def cleanup_global_factory() -> None:
    """Cleanup global factory instance"""
    global _global_factory
    
    if _global_factory:
        _global_factory.cleanup()
        _global_factory = None
        logger.info("Cleaned up global repository factory")