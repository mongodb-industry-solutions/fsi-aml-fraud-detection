import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;

const client = new MongoClient(uri);
let db = null;

export async function connectToDatabase(dbName, collectionName) {
  if (db && client.topology && client.topology.isConnected()) {
    return db.collection(collectionName);
  }

  try {
    await client.connect();
    console.log("Connected successfully to MongoDB Atlas");
    db = client.db(dbName);
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
