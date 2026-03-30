"""
Atlas Embedding API wrapper for the agentic investigation pipeline.

Uses voyage-4 via the Atlas Embedding API (ai.mongodb.com) for:
- Typology library RAG
- Compliance policy RAG
- Past investigation similarity search
"""

import os
import logging
from typing import List

import httpx
from langchain_core.embeddings import Embeddings

logger = logging.getLogger(__name__)

ATLAS_EMBEDDINGS_URL = "https://ai.mongodb.com/v1/embeddings"
VOYAGE_MODEL = "voyage-4"


class AtlasVoyageEmbeddings(Embeddings):
    """LangChain-compatible wrapper around voyage-4 via the Atlas Embedding API."""

    def __init__(self, api_key: str | None = None, model: str = VOYAGE_MODEL):
        self.model = model
        self._api_key = api_key or os.getenv("VOYAGE_API_KEY")
        if not self._api_key:
            raise ValueError("VOYAGE_API_KEY environment variable is required")
        self._client = httpx.Client(
            base_url=ATLAS_EMBEDDINGS_URL,
            headers={
                "Authorization": f"Bearer {self._api_key}",
                "Content-Type": "application/json",
            },
            timeout=60.0,
        )
        logger.info("AtlasVoyageEmbeddings initialised with model=%s", self.model)

    def _embed(self, texts: List[str], input_type: str) -> List[List[float]]:
        response = self._client.post(
            "",
            json={"input": texts, "model": self.model, "input_type": input_type},
        )
        response.raise_for_status()
        data = response.json()
        return [item["embedding"] for item in data["data"]]

    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        return self._embed(texts, input_type="document")

    def embed_query(self, text: str) -> List[float]:
        return self._embed([text], input_type="query")[0]


_instance: AtlasVoyageEmbeddings | None = None


def get_voyage_embeddings() -> AtlasVoyageEmbeddings:
    """Singleton accessor matching existing codebase conventions."""
    global _instance
    if _instance is None:
        _instance = AtlasVoyageEmbeddings()
    return _instance
