"""Cross-investigation long-term memory backed by MongoDBStore."""

import logging
import os

logger = logging.getLogger(__name__)

_store_instance = None

MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME", "fsi-threatsight360")


def get_memory_store():
    """Singleton accessor for MongoDBStore (long-term cross-investigation memory)."""
    global _store_instance
    if _store_instance is None:
        try:
            from langgraph.store.mongodb import MongoDBStore
            _store_instance = MongoDBStore.from_conn_string(
                MONGODB_URI,
                db_name=DB_NAME,
                collection_name="memory_store",
            )
            logger.info("MongoDBStore initialised for cross-investigation memory")
        except ImportError:
            logger.warning("langgraph-store-mongodb not available, memory disabled")
            _store_instance = None
    return _store_instance
