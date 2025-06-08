from pymongo import MongoClient
from motor.motor_asyncio import AsyncIOMotorClient
from typing import Dict, List
import logging

logger = logging.getLogger(__name__)

class MongoDBAccess:
    """
    A class to provide access to a MongoDB database for AML/KYC operations.
    This class handles the connection to the database and provides methods to interact with collections and documents.
    """

    def __init__(self, uri: str):
        """
        Constructor function to initialize the database connection.
        
        Args:
            uri (str): The connection string URI for the MongoDB database.
        
        Returns:
            None
        """
        self.uri = uri

        try:
            self.client = MongoClient(self.uri)
            # Test the connection
            self.client.admin.command('ping')
            logger.info("Successfully connected to MongoDB")
        except Exception as e:
            logger.error(f"Failed to connect to MongoDB: {e}")
            raise Exception(f"The following error occurred: {e}")

    def __del__(self):
        """
        Destructor function to close the database connection.
        
        This method is called when the object is about to be destroyed.
        """
        if hasattr(self, 'client'):
            self.client.close()

    def get_client(self):
        """
        Retrieves the MongoDB client.
        
        Returns:
            MongoClient: The MongoDB client instance.
        """
        return self.client

    def get_database(self, db_name: str):
        """
        Retrieves a database by name.
        
        Args:
            db_name (str): The name of the database to retrieve.
        
        Returns:
            Database: The database instance corresponding to the provided name.
        """
        database = self.client[db_name]
        return database

    def get_collection(self, db_name: str, collection_name: str):
        """
        Retrieves a collection by name.
        
        Args:
            db_name (str): The name of the database.
            collection_name (str): The name of the collection to retrieve.
        
        Returns:
            Collection: The collection instance corresponding to the provided names.
        """
        collection = self.client[db_name][collection_name]
        return collection

    def insert_one(self, db_name: str, collection_name: str, document: Dict,
                   redefined_id: bool = False, id_attribute: str = None):
        """
        Inserts a single document into a collection.
        
        Args:
            db_name (str): The name of the database.
            collection_name (str): The name of the collection.
            document (Dict): The document to insert.
            redefined_id (bool): Whether to redefine the _id field. Defaults to False.
            id_attribute (str): The attribute to use as the _id field if redefined_id is True. Defaults to None.
        
        Returns:
            InsertOneResult: The result of the insertion operation.
        """
        if redefined_id and id_attribute:
            # Assign "id_attribute" to "_id" for the document
            document['_id'] = document[id_attribute]
            del document[id_attribute]

        result = self.client[db_name][collection_name].insert_one(document)
        return result

    def find_entities_paginated(self, db_name: str, collection_name: str, 
                               skip: int = 0, limit: int = 20, filter_dict: Dict = None):
        """
        Retrieves entities with pagination support.
        
        Args:
            db_name (str): The name of the database.
            collection_name (str): The name of the collection.
            skip (int): Number of documents to skip.
            limit (int): Maximum number of documents to return.
            filter_dict (Dict): Filter criteria for the query.
        
        Returns:
            tuple: (list of documents, total count)
        """
        collection = self.get_collection(db_name, collection_name)
        
        if filter_dict is None:
            filter_dict = {}
        
        # Get total count
        total_count = collection.count_documents(filter_dict)
        
        # Get paginated results
        cursor = collection.find(filter_dict).skip(skip).limit(limit)
        documents = list(cursor)
        
        return documents, total_count

    def find_entity_by_id(self, db_name: str, collection_name: str, entity_id: str):
        """
        Retrieves a single entity by its entityId.
        
        Args:
            db_name (str): The name of the database.
            collection_name (str): The name of the collection.
            entity_id (str): The entity ID to search for.
        
        Returns:
            Dict or None: The entity document if found, None otherwise.
        """
        collection = self.get_collection(db_name, collection_name)
        return collection.find_one({"entityId": entity_id})

    def get_distinct_values(self, db_name: str, collection_name: str, field: str, filter_dict: Dict = None):
        """
        Retrieves distinct values for a specific field in a collection.
        
        Args:
            db_name (str): The name of the database.
            collection_name (str): The name of the collection.
            field (str): The field to get distinct values for.
            filter_dict (Dict): Optional filter criteria for the query.
        
        Returns:
            List: List of distinct values for the specified field.
        """
        collection = self.get_collection(db_name, collection_name)
        
        if filter_dict is None:
            filter_dict = {}
        
        return collection.distinct(field, filter_dict)