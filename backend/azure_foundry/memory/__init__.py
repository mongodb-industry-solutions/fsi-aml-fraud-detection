"""
Native MongoDB Atlas vector store integration
Uses MongoDB Atlas as intended by Azure AI Foundry for RAG and learning patterns
"""

from .mongodb_vector_store import MongoDBAtlasIntegration, create_mongodb_vector_store

__all__ = ["MongoDBAtlasIntegration", "create_mongodb_vector_store"]