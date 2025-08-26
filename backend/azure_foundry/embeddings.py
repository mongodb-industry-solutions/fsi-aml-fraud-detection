import os
import logging
from typing import Optional, List
from openai import AzureOpenAI
from azure.identity import DefaultAzureCredential, AzureCliCredential
from azure.core.credentials import AzureKeyCredential
from dotenv import load_dotenv

load_dotenv()

# Set up logging
logging.basicConfig(level=logging.WARNING)
logger = logging.getLogger(__name__)

class AzureFoundryEmbeddings:
    """A class to generate text embeddings using Azure OpenAI models."""
    
    log: logging.Logger = logging.getLogger("AzureFoundryEmbeddings")
    
    def __init__(
        self,
        endpoint: Optional[str] = None,
        api_key: Optional[str] = None,
        model_deployment: Optional[str] = None,
        api_version: Optional[str] = None
    ) -> None:
        """
        Initialize the AzureFoundryEmbeddings class.
        
        Args:
            endpoint (str): The Azure OpenAI endpoint URL
            api_key (str): The API key for authentication
            model_deployment (str): The embedding model deployment name (e.g., 'text-embedding-ada-002')
            api_version (str): The API version to use
        """
        # Set up endpoint
        self.endpoint = endpoint or os.getenv("AZURE_OPENAI_ENDPOINT")
        if not self.endpoint:
            raise ValueError("Azure OpenAI endpoint must be provided via parameter or environment variable")
        
        # Set up authentication
        self.api_key = api_key or os.getenv("AZURE_OPENAI_API_KEY")
        if not self.api_key:
            raise ValueError("Azure OpenAI API key must be provided via parameter or environment variable")

        # Set up model deployment
        self.model_deployment = model_deployment or os.getenv("AZURE_OPENAI_EMBEDDING_DEPLOYMENT")
        if not self.model_deployment:
            raise ValueError("Model deployment must be provided via parameter or environment variable")
        
        # Set up API version
        self.api_version = api_version or os.getenv("AZURE_OPENAI_EMBEDDING_API_VERSION")
        if not self.api_version:
            raise ValueError("API version must be provided via parameter or environment variable")
        
        # Create the Azure OpenAI client
        try:
            self.embeddings_client = AzureOpenAI(
                azure_endpoint=self.endpoint,
                api_key=self.api_key,
                api_version=self.api_version
            )
        except Exception as e:
            self.log.error(f"Failed to create AzureOpenAI client: {e}")
            raise
        
        self.log.info(f"Initialized Azure OpenAI Embeddings with deployment: {self.model_deployment}")
    
    def predict(self, text: str) -> List[float]:
        """Generate embedding for a single text."""
        if not text or not text.strip():
            raise ValueError("Text input cannot be empty")
        
        try:
            response = self.embeddings_client.embeddings.create(
                input=[text], 
                model=self.model_deployment
            )
            if not response.data or len(response.data) == 0:
                raise ValueError("No embedding data received from Azure OpenAI")
            return response.data[0].embedding
        except Exception as e:
            self.log.error(f"Error generating embedding: {e}")
            raise

# Singleton instance for reuse across API calls
_embedding_model = None

def get_embedding_model() -> AzureFoundryEmbeddings:
    """Get singleton embedding model instance."""
    global _embedding_model
    if _embedding_model is None:
        _embedding_model = AzureFoundryEmbeddings()
    return _embedding_model

async def get_embedding(text: str) -> List[float]:
    """
    Generate embeddings for the given text using Azure AI Foundry.
    
    Args:
        text (str): The text to generate embeddings for
        
    Returns:
        List[float]: The embeddings vector
        
    Raises:
        Exception: If there's an error generating the embeddings
    """
    try:
        model = get_embedding_model()
        return model.predict(text)
    except Exception as e:
        logger.error(f"Error generating embeddings with Azure AI Foundry: {str(e)}")
        raise

async def get_batch_embeddings(texts: List[str]) -> List[List[float]]:
    """
    Generate embeddings for a batch of texts.
    
    Args:
        texts (List[str]): List of texts to generate embeddings for
        
    Returns:
        List[List[float]]: List of embedding vectors
    """
    results = []
    for text in texts:
        embedding = await get_embedding(text)
        results.append(embedding)
    return results

if __name__ == '__main__':
    import asyncio
    
    # Example usage
    endpoint = os.getenv("AZURE_OPENAI_ENDPOINT")
    embedding_deployment = os.getenv("AZURE_OPENAI_EMBEDDING_DEPLOYMENT")
    api_key = os.getenv("AZURE_OPENAI_API_KEY")
    api_version = os.getenv("AZURE_OPENAI_EMBEDDING_API_VERSION")
    
    if not endpoint or not embedding_deployment or not api_key or not api_version:
        print("Error: Missing required environment variables:")
        print(f"  AZURE_OPENAI_ENDPOINT: {'✓' if endpoint else '✗'}")
        print(f"  AZURE_OPENAI_EMBEDDING_DEPLOYMENT: {'✓' if embedding_deployment else '✗'}")
        print(f"  AZURE_OPENAI_API_KEY: {'✓' if api_key else '✗'}")
        print(f"  AZURE_OPENAI_EMBEDDING_API_VERSION: {'✓' if api_version else '✗'}")
        exit(1)
    
    try:
        # Direct usage of Azure OpenAI client
        embeddings_client = AzureOpenAI(
            azure_endpoint=endpoint,
            api_key=api_key,
            api_version=api_version
        )
        
        # Test direct prediction
        sample_text = "This is a sample text for fraud detection in financial transactions."
        result = embeddings_client.embeddings.create(input=[sample_text], model=embedding_deployment)
        print(f"Direct embedding result (first 5 values): {result.data[0].embedding[:5]}... (total length: {len(result.data[0].embedding)})")
        
        # Test the async wrapper function
        async def test_get_embedding():
            try:
                result = await get_embedding("Suspicious login from new IP address followed by large wire transfer.")
                print(f"Async embedding result (first 5 values): {result[:5]}... (total length: {len(result)})")
                
                batch_results = await get_batch_embeddings([
                    "Customer account accessed from unusual location", 
                    "Multiple failed login attempts before successful authentication"
                ])
                print(f"Batch embedding results: {len(batch_results)} embeddings generated")
                for i, embedding in enumerate(batch_results):
                    print(f"  Embedding {i+1}: first 3 values = {embedding[:3]}... (length: {len(embedding)})")
            except Exception as e:
                print(f"Error in async test: {e}")
        
        # Run the async test
        asyncio.run(test_get_embedding())
        
    except Exception as e:
        print(f"Error during testing: {e}")
        exit(1)
