from typing import Dict, List, Optional, Any
import uuid
from datetime import datetime
import logging
from pymongo.collection import Collection
from services.fraud_detection_service import FraudDetectionService
from services.embedding_service import setup_vector_search_index

logger = logging.getLogger(__name__)


class TransactionService:
    """Service to manage transactions and apply fraud detection"""
    
    def __init__(self, transactions_collection: Collection, rules_collection: Collection):
        self.transactions_collection = transactions_collection
        self.rules_collection = rules_collection
        
        # Ensure vector search index exists
        # This will throw an exception if vector search setup fails
        logger.info("Setting up vector search index...")
        index_name = setup_vector_search_index(transactions_collection)
        logger.info(f"Vector search index '{index_name}' is ready")
        
        # Initialize fraud detection service
        self.fraud_detection_service = FraudDetectionService(
            transactions_collection, 
            rules_collection
        )
    
    def get_sample_location(self, country_code: str) -> Dict[str, Any]:
        """
        Get a sample location for a given country code
        
        Args:
            country_code: Two-letter country code
            
        Returns:
            Dict: Location information including address, coordinates, and country
        """
        locations = {
            'us': {
                "address": "New York City Hall, 260 Broadway, New York, NY 10000, United States of America",
                "coordinates": (40.7127281, -74.0060152),
                "country": "US"
            },
            'uk': {
                "address": "49-59 Old Street, London, EC1V 9HX, United Kingdom",
                "coordinates": (51.524011455948596, -0.09680209634765014),
                "country": "UK"
            },
            'ly': {
                "address": "Tarhuna-Khadra Road, Khadra - Tarhuna, Libya",
                "coordinates": (32.4071058, 13.8621903),
                "country": "LY"
            },
            'hk': {
                "address": "China, Hong Kong, Hong Kong Island, Wan Chai, Johnston Road, 九頭鳥米線",
                "coordinates": (22.27708637129596, 114.1752336489606),
                "country": "HK"
            }
        }
        return locations.get(country_code.lower())
    
    def generate_transaction(self, amount: float, currency: str, location: str) -> Dict[str, Any]:
        """
        Generate a transaction with the given parameters
        
        Args:
            amount: Transaction amount
            currency: Currency code (USD, EUR, GBP, INR)
            location: Country code (US, UK, LY, HK)
            
        Returns:
            Dict: The generated transaction
        """
        return {
            "transaction_id": str(uuid.uuid4()),
            "sender_id": str(uuid.uuid4()),
            "receiver_id": str(uuid.uuid4()),
            "amount": amount,
            "currency": currency,
            "timestamp": datetime.utcnow().isoformat(),
            "location": self.get_sample_location(location),
        }
    
    def create_transaction(self, amount: float, currency: str, 
                          location: str) -> Dict[str, Any]:
        """
        Create a new transaction, apply fraud detection, and save to database
        
        Args:
            amount: Transaction amount
            currency: Currency code
            location: Country code
            
        Returns:
            Dict: The processed transaction with fraud detection results
        """
        try:
            # Generate the transaction
            transaction = self.generate_transaction(amount, currency, location)
            
            # Apply fraud detection
            processed_transaction, similar_transactions = self.fraud_detection_service.detect_fraud(transaction)
            
            # Save to database
            self.transactions_collection.insert_one(processed_transaction)
            
            return {
                "transaction": processed_transaction,
                "similar_transactions": similar_transactions
            }
        except Exception as e:
            logger.error(f"Error creating transaction: {str(e)}")
            raise Exception(f"Failed to create transaction: {str(e)}")
    
    def get_transactions(self, limit: int = 100, skip: int = 0) -> List[Dict[str, Any]]:
        """
        Get transactions from the database with pagination
        
        Args:
            limit: Maximum number of transactions to return
            skip: Number of transactions to skip
            
        Returns:
            List[Dict]: List of transactions
        """
        try:
            cursor = self.transactions_collection.find({}).sort("timestamp", -1).skip(skip).limit(limit)
            return list(cursor)
        except Exception as e:
            logger.error(f"Error retrieving transactions: {str(e)}")
            raise Exception(f"Failed to retrieve transactions: {str(e)}")
    
    def get_transaction_by_id(self, transaction_id: str) -> Optional[Dict[str, Any]]:
        """
        Get a transaction by ID
        
        Args:
            transaction_id: The ID of the transaction to retrieve
            
        Returns:
            Optional[Dict]: The transaction if found, None otherwise
        """
        try:
            return self.transactions_collection.find_one({"transaction_id": transaction_id})
        except Exception as e:
            logger.error(f"Error retrieving transaction {transaction_id}: {str(e)}")
            raise Exception(f"Failed to retrieve transaction: {str(e)}")
    
    def generate_sample_transactions(self, count: int = 10) -> List[Dict[str, Any]]:
        """
        Generate sample transactions and save to database
        
        Args:
            count: Number of transactions to generate
            
        Returns:
            List[Dict]: List of generated transactions
        """
        import random
        import traceback
        
        countries = ["US", "UK", "LY", "HK"]
        currencies = ["USD", "EUR", "GBP", "INR"]
        
        transactions = []
        success_count = 0
        error_count = 0
        
        try:
            logger.info(f"=== START: Generating {count} sample transactions ===")
            logger.info(f"MongoDB Collection: {self.transactions_collection.full_name}")
            
            # Verify the collection exists and is accessible
            try:
                collection_count = self.transactions_collection.count_documents({})
                logger.info(f"Current transaction count: {collection_count}")
            except Exception as coll_error:
                logger.error(f"Error accessing collection: {str(coll_error)}")
                raise Exception(f"Cannot access transactions collection: {str(coll_error)}")

            # Generate transactions one by one
            for i in range(count):
                try:
                    amount = round(random.uniform(100, 10000), 2)
                    currency = random.choice(currencies)
                    location = random.choice(countries)
                    
                    logger.info(f"Generating transaction {i+1}/{count}: {amount} {currency} from {location}")
                    
                    # Generate transaction
                    transaction = self.generate_transaction(amount, currency, location)
                    logger.info(f"Transaction generated with ID: {transaction['transaction_id']}")
                    
                    # Apply fraud detection
                    logger.info(f"Applying fraud detection to transaction {transaction['transaction_id']}")
                    processed_transaction, similar_transactions = self.fraud_detection_service.detect_fraud(transaction)
                    
                    logger.info(f"Fraud detection successful. Rules score: {processed_transaction.get('fraud_score')}, " 
                               f"Vector score: {processed_transaction.get('similarity_fraud_score')}")
                    
                    transactions.append(processed_transaction)
                    success_count += 1
                except Exception as e:
                    error_stack = traceback.format_exc()
                    logger.error(f"Error processing sample transaction {i}:\n{error_stack}")
                    error_count += 1
                    continue
            
            logger.info(f"Processing complete: {success_count} successful, {error_count} failed")
            
            # Insert all transactions
            if transactions:
                try:
                    logger.info(f"Inserting {len(transactions)} transactions into MongoDB")
                    inserted = self.transactions_collection.insert_many(transactions)
                    logger.info(f"Successfully inserted {len(inserted.inserted_ids)} transactions with IDs: {inserted.inserted_ids}")
                except Exception as insert_error:
                    error_stack = traceback.format_exc()
                    logger.error(f"Error inserting transactions into database:\n{error_stack}")
                    raise Exception(f"Failed to insert transactions: {str(insert_error)}")
            else:
                logger.warning(f"No transactions to insert - all {count} sample generations failed")
                raise Exception("No transactions were successfully generated to insert")
            
            logger.info(f"=== END: Sample generation complete, returning {len(transactions)} transactions ===")
            return transactions
        except Exception as e:
            error_stack = traceback.format_exc()
            logger.error(f"Critical error in generate_sample_transactions:\n{error_stack}")
            raise Exception(f"Failed to generate sample transactions: {str(e)}")