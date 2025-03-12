from typing import List, Dict, Any, Union
import torch
from sentence_transformers import SentenceTransformer
import logging

logger = logging.getLogger(__name__)


class EmbeddingService:
    """Service to create vector embeddings for transactions"""
    
    _instance = None
    model = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(EmbeddingService, cls).__new__(cls)
            try:
                cls._instance.model = SentenceTransformer(
                    'all-MiniLM-L6-v2', 
                    device='cuda' if torch.cuda.is_available() else 'cpu'
                )
                logger.info(f"Embedding model loaded successfully. Using device: {cls._instance.model.device}")
            except Exception as e:
                logger.error(f"Error loading embedding model: {str(e)}")
                raise Exception(f"Failed to load embedding model: {str(e)}")
        return cls._instance
    
    def vectorize_transaction(self, transaction: Dict[str, Any]) -> List[float]:
        """
        Generate a vector embedding for a transaction by combining key fields
        
        Args:
            transaction: The transaction to vectorize
            
        Returns:
            List[float]: The vector embedding as a list of floats
        """
        try:
            # Extract and combine the relevant fields for vectorization
            transaction_text = (
                f"{transaction['amount']} "
                f"{transaction['currency']} "
                f"{transaction['location']['country']}"
            )
            
            # Generate the embedding
            embedding = self.model.encode(transaction_text).tolist()
            return embedding
        except Exception as e:
            logger.error(f"Error vectorizing transaction: {str(e)}")
            raise Exception(f"Failed to vectorize transaction: {str(e)}")


def setup_vector_search_index(collection):
    """
    Create vector search index in MongoDB collection
    
    Args:
        collection: MongoDB collection where index will be created
        
    Returns:
        str: Name of the created index
    """
    from pymongo.operations import SearchIndexModel
    from pymongo.errors import OperationFailure, CollectionInvalid
    import config
    
    try:
        # Force creation of the collection if it doesn't exist
        database = collection.database
        collection_name = collection.name
        
        # Check if collection exists in the database
        collection_names = database.list_collection_names()
        if collection_name not in collection_names:
            logger.warning(f"Collection {collection_name} does not exist in database, will create it")
            
            # MongoDB Atlas requires at least one document to exist before creating vector search indexes
            # Create a dummy document and immediately remove it
            try:
                logger.info(f"Creating collection {collection_name} with a dummy document")
                # Insert a sample document with embedded vector field to ensure proper schema recognition
                dummy_doc = {
                    "_id": "dummy_initialization_doc",
                    "amount": 100.00,
                    "currency": "USD",
                    "location": {"country": "US", "address": "Test Address", "coordinates": [0, 0]},
                    "vectorized_transaction": [0.0] * 384  # Properly formatted vector field
                }
                collection.insert_one(dummy_doc)
                logger.info(f"Successfully created collection {collection_name} with dummy document")
                
                # Keep document for now - MongoDB Atlas sometimes needs document to persist for vector index creation
            except Exception as create_error:
                logger.error(f"Error creating collection: {str(create_error)}")
                # Continue despite error, maybe collection was created in between operations
        
        # Check if index already exists
        try:
            existing_indexes = collection.list_search_indexes()
            for idx in existing_indexes:
                if idx.get("name") == "fraud_detector":
                    logger.info("Vector search index 'fraud_detector' already exists")
                    # Clean up our dummy doc if it still exists
                    collection.delete_one({"_id": "dummy_initialization_doc"})
                    return "fraud_detector"
        except OperationFailure as e:
            if "no such cmd" in str(e) or "Collection not found" in str(e) or "NamespaceNotFound" in str(e):
                logger.warning(f"Could not list search indexes: {str(e)}")
                # Continue to create the index
            else:
                raise
        
        # Wait briefly to ensure MongoDB Atlas has registered the collection properly
        import time
        logger.info("Waiting a moment before creating vector search index...")
        time.sleep(2)
        
        try:
            # Create the index if it doesn't exist
            search_index_model = SearchIndexModel(
                name="fraud_detector",
                type="vectorSearch",
                definition={
                    "fields": [
                        {
                            "type": "vector",
                            "numDimensions": 384,  # Dimensions for all-MiniLM-L6-v2
                            "path": "vectorized_transaction",
                            "similarity": "cosine"
                        }
                    ]
                }
            )
            
            result = collection.create_search_index(model=search_index_model)
            logger.info(f"Vector search index created successfully: {result}")
            
            # Clean up our dummy doc
            collection.delete_one({"_id": "dummy_initialization_doc"})
            return "fraud_detector"
        except Exception as idx_error:
            logger.error(f"Error creating vector search index: {str(idx_error)}")
            # Raise exception - don't allow application to run without vector search
            raise Exception(f"Vector search index creation failed: {str(idx_error)}")
    except Exception as e:
        logger.error(f"Error setting up vector search index: {str(e)}")
        # Raise the exception - don't allow application to run without vector search
        raise Exception(f"Failed to set up vector search: {str(e)}")