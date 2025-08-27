import os
import logging
from typing import Optional, List
from azure.ai.inference import EmbeddingsClient
from azure.identity import DefaultAzureCredential, AzureCliCredential
from azure.core.credentials import AzureKeyCredential
from dotenv import load_dotenv

load_dotenv()

# Set up logging
logging.basicConfig(level=logging.WARNING)
logger = logging.getLogger(__name__)

class AzureFoundryEmbeddings:
    """A class to generate text embeddings using Azure AI Foundry models."""
    
    log: logging.Logger = logging.getLogger("AzureFoundryEmbeddings")
    
    def __init__(
        self,
        endpoint: Optional[str] = None,
        api_key: Optional[str] = None,
        model_name: Optional[str] = None,
        use_cli_credential: bool = True
    ) -> None:
        """
        Initialize the AzureFoundryEmbeddings class.
        
        Args:
            endpoint (str): The Azure AI Foundry endpoint URL
            api_key (str): The API key for authentication (optional)
            model_name (str): The embedding model name (e.g., 'text-embedding-ada-002')
            use_cli_credential (bool): Whether to prefer Azure CLI credential
        """
        # Set up endpoint
        self.endpoint = endpoint or os.getenv("INFERENCE_ENDPOINT")
        if not self.endpoint:
            raise ValueError("Inference endpoint must be provided via parameter or environment variable")
        
        # Set up authentication
        self.api_key = api_key or os.getenv("AZURE_AI_API_KEY")
        self.use_cli_credential = use_cli_credential
        self.credential = self._get_credential()

        # Set up model name
        self.model_name = model_name or os.getenv("EMBEDDING_MODEL")
        if not self.model_name:
            raise ValueError("Model name must be provided via parameter or environment variable")
        
        # Create the Azure client
        try:
            self.embeddings_client = EmbeddingsClient(endpoint=self.endpoint, credential=self.credential)
        except Exception as e:
            self.log.error(f"Failed to create EmbeddingsClient: {e}")
            raise
        
        self.log.info(f"Initialized Azure Foundry Embeddings with model: {self.model_name}")
    
    def _get_credential(self):
        """Get the appropriate Azure credential."""
        if self.api_key:
            self.log.info("Using API Key authentication")
            return AzureKeyCredential(self.api_key)
        
        if self.use_cli_credential:
            try:
                self.log.info("Using Azure CLI authentication")
                return AzureCliCredential()
            except Exception as e:
                self.log.warning(f"Azure CLI credential failed: {e}, falling back to DefaultAzureCredential")
        
        self.log.info("Using DefaultAzureCredential")
        return DefaultAzureCredential()

    def predict(self, text: str) -> List[float]:
        """Generate embedding for a single text."""
        if not text or not text.strip():
            raise ValueError("Text input cannot be empty")
        
        try:
            response = self.embeddings_client.embed(input=[text], model=self.model_name)
            if not response.data or len(response.data) == 0:
                raise ValueError("No embedding data received from Azure AI Foundry")
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
    endpoint = os.getenv("INFERENCE_ENDPOINT")
    embedding_model = os.getenv("EMBEDDING_MODEL")
    api_key = os.getenv("AZURE_AI_API_KEY")
    
    if not endpoint or not embedding_model or not api_key:
        print("Error: Missing required environment variables:")
        print(f"  INFERENCE_ENDPOINT: {'✓' if endpoint else '✗'}")
        print(f"  EMBEDDING_MODEL: {'✓' if embedding_model else '✗'}")
        print(f"  AZURE_AI_API_KEY: {'✓' if api_key else '✗'}")
        exit(1)
    
    try:
        credential = AzureKeyCredential(api_key)

        # Direct usage of the class
        embeddings_client = EmbeddingsClient(
            endpoint=endpoint,
            credential=credential
        )
        
        # Test direct prediction
        sample_text = "This is a sample text for fraud detection in financial transactions."
        result = embeddings_client.embed(input=[sample_text], model=embedding_model)
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
