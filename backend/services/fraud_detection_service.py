from typing import Dict, List, Tuple, Any, Optional
import logging
from pymongo.collection import Collection
from services.embedding_service import EmbeddingService

logger = logging.getLogger(__name__)


class FraudDetectionService:
    """Service to detect fraud using rules-based and vector similarity approaches"""
    
    def __init__(self, transactions_collection: Collection, rules_collection: Collection):
        self.transactions_collection = transactions_collection
        self.rules_collection = rules_collection
        # Always initialize embedding service since vector search is required
        self.embedding_service = EmbeddingService()
    
    def apply_rules_based_detection(self, transaction: Dict[str, Any]) -> Dict[str, Any]:
        """
        Apply rules-based fraud detection to a transaction
        
        Args:
            transaction: The transaction to evaluate
            
        Returns:
            Dict: The updated transaction with fraud_score and is_flagged_fraud
        """
        try:
            # Get the rules from the database
            rules = self.rules_collection.find_one({})
            if not rules:
                logger.warning("No fraud detection rules found in database")
                transaction["fraud_score"] = 0.0
                transaction["is_flagged_fraud"] = False
                return transaction
            
            fraud_score = 0.0
            
            # Apply location rule
            if transaction["location"]["country"] in rules["high_risk_locations"]["values"]:
                fraud_score += rules["high_risk_locations"]["weight"]
            
            # Apply amount rule
            if transaction["amount"] > rules["amount_threshold"]["values"]:
                fraud_score += rules["amount_threshold"]["weight"]
            
            # Update transaction with fraud score and flag
            transaction["fraud_score"] = round(fraud_score, 2)
            transaction["is_flagged_fraud"] = fraud_score >= 0.5
            
            return transaction
        except Exception as e:
            logger.error(f"Error applying rules-based detection: {str(e)}")
            raise Exception(f"Failed to apply rules-based detection: {str(e)}")
    
    def apply_similarity_based_detection(self, transaction: Dict[str, Any]) -> Tuple[Dict[str, Any], List[Dict[str, Any]]]:
        """
        Apply similarity-based fraud detection using vector search
        
        Args:
            transaction: The transaction to evaluate
            
        Returns:
            Tuple[Dict, List[Dict]]: The updated transaction and similar transactions
        """
        # Vectorize the transaction
        try:
            logger.info(f"Vectorizing transaction {transaction['transaction_id']}")
            vectorized_transaction = self.embedding_service.vectorize_transaction(transaction)
            transaction["vectorized_transaction"] = vectorized_transaction
            logger.info(f"Successfully vectorized transaction (vector length: {len(vectorized_transaction)})")
        except Exception as e:
            logger.error(f"Error vectorizing transaction: {str(e)}")
            raise Exception(f"Vector embedding failed: {str(e)}")
        
        # Check if we have enough documents before performing vector search
        try:
            count = self.transactions_collection.count_documents({})
            logger.info(f"Found {count} existing transactions in the collection")
            
            # For first transaction, we can't do meaningful vector search
            if count == 0:
                logger.info("First transaction in system - no similarity comparison possible")
                transaction["similarity_fraud_score"] = 0.0
                transaction["is_flagged_fraud_similarity"] = False
                return transaction, []
                
            if count < 5:
                logger.warning(f"Only {count} transactions in database - not enough for meaningful vector search")
                transaction["similarity_fraud_score"] = 0.0
                transaction["is_flagged_fraud_similarity"] = False
                return transaction, []
        except Exception as e:
            logger.error(f"Error counting documents: {str(e)}")
            raise Exception(f"Database error during document count: {str(e)}")
        
        # Execute similarity search
        try:
            logger.info("Executing vector search query")
            query = {
                "$vectorSearch": {
                    "index": "fraud_detector",
                    "path": "vectorized_transaction",
                    "queryVector": vectorized_transaction,
                    "numCandidates": 100,
                    "limit": 5
                }
            }
            
            results = list(self.transactions_collection.aggregate([query]))
            logger.info(f"Vector search returned {len(results)} similar transactions")
            
            # If we have no similar transactions, return zero score
            if not results:
                logger.warning("No similar transactions found in vector search")
                transaction["similarity_fraud_score"] = 0.0
                transaction["is_flagged_fraud_similarity"] = False
                return transaction, []
            
            # Calculate similarity score based on average of similar transactions
            similarity_score = sum(result.get("fraud_score", 0) for result in results) / len(results)
            
            # Update transaction with similarity fraud score and flag
            transaction["similarity_fraud_score"] = round(similarity_score, 2)
            transaction["is_flagged_fraud_similarity"] = similarity_score >= 0.5
            
            logger.info(f"Calculated similarity fraud score: {transaction['similarity_fraud_score']}")
            return transaction, results
        except Exception as e:
            logger.error(f"Error during vector search: {str(e)}")
            raise Exception(f"Vector search operation failed: {str(e)}")
    
    def detect_fraud(self, transaction: Dict[str, Any]) -> Tuple[Dict[str, Any], List[Dict[str, Any]]]:
        """
        Apply both rules-based and similarity-based fraud detection
        
        Args:
            transaction: The transaction to evaluate
            
        Returns:
            Tuple[Dict, List[Dict]]: The updated transaction and similar transactions
        """
        try:
            # Apply rules-based detection
            transaction = self.apply_rules_based_detection(transaction)
            
            # Always apply similarity-based detection
            transaction, similar_transactions = self.apply_similarity_based_detection(transaction)
            
            return transaction, similar_transactions
        except Exception as e:
            logger.error(f"Error in detect_fraud: {str(e)}")
            # Don't silently handle errors - this will propagate up
            raise Exception(f"Fraud detection failed: {str(e)}")