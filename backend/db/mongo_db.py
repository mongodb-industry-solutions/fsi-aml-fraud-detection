from pymongo import MongoClient
from typing import Dict, List


class MongoDBAccess:
    """  
    A class to provide access to a MongoDB database.  
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
        except Exception as e:
            raise Exception(
                "The following error occurred: ", e)

    def __del__(self):
        """ 
        Destructor function to close the database connection.  
        
        This method is called when the object is about to be destroyed.  
        """
        self.client.close()

    def get_client(self):
        """ 
        Retrieves the MongoDB client.  
        
        Returns:  
            MongoClient: The MongoDB client instance.  
        """  
        client = self.client
        return client

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
        if redefined_id:
            # Assign "id" to "_id" for the document
            document['_id'] = document[id_attribute]
            del document[id_attribute]

        result = self.client[db_name][collection_name].insert_one(document)
        return result

    def insert_many(self, db_name: str, collection_name: str, documents: List[Dict],
                    redefined_id: bool = False, id_attribute: str = None):
        """ 
        Inserts multiple documents into a collection.  
        
        Args:  
            db_name (str): The name of the database.  
            collection_name (str): The name of the collection.  
            documents (List[Dict]): The list of documents to insert.  
            redefined_id (bool): Whether to redefine the _id field. Defaults to False.  
            id_attribute (str): The attribute to use as the _id field if redefined_id is True. Defaults to None.  
        
        Returns:  
            InsertManyResult: The result of the insertion operation.  
        """  
        if redefined_id:
            # Assign "id" to "_id" for each document
            for doc in documents:
                doc['_id'] = doc[id_attribute]
                del doc[id_attribute]

        result = self.client[db_name][collection_name].insert_many(documents)
        return result
