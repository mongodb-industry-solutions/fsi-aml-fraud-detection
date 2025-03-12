import { NextResponse } from "next/server";
import { connectToDatabase, closeDatabase } from "@/lib/mongodb";

export async function GET() {
  const dbName = process.env.DB_NAME;
  const collectionName = process.env.COLLECTION_NAME;

  try {
    const collection = await connectToDatabase(dbName, collectionName);
    const documents = await collection.find({}).toArray();

    return NextResponse.json(documents);
  } catch (error) {
    console.error("Error fetching documents:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  } finally {
    await closeDatabase();
  }
}
