import { MongoClient } from "mongodb";

let client = null;
let db = null;

function getClient() {
  if (!client) {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      throw new Error("MONGODB_URI environment variable is not set");
    }
    client = new MongoClient(uri);
  }
  return client;
}

export async function connectToDatabase(dbName, collectionName) {
  const mongoClient = getClient();
  
  if (db && mongoClient.topology && mongoClient.topology.isConnected()) {
    return db.collection(collectionName);
  }

  try {
    await mongoClient.connect();
    console.log("Connected successfully to MongoDB Atlas");
    db = mongoClient.db(dbName);
    return db.collection(collectionName);
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
    throw error;
  }
}

export async function closeDatabase() {
  if (client && client.topology && client.topology.isConnected()) {
    console.log("Closing MongoDB connection");
    try {
      await client.close();
      console.log("MongoDB connection closed successfully");
    } catch (error) {
      console.error("Error closing MongoDB connection:", error);
    }
  } else {
    console.log("MongoDB connection already closed or not initialized");
  }
}
