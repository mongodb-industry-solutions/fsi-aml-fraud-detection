"""Azure Foundry integration package for embeddings and AI services."""

from .embeddings import get_embedding, get_embedding_model, AzureFoundryEmbeddings

__all__ = ['get_embedding', 'get_embedding_model', 'AzureFoundryEmbeddings']
