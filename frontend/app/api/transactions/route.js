// API route for transactions
import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    const response = await fetch('http://localhost:8000/transactions');
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching transactions:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const data = await request.json();
    
    const response = await fetch('http://localhost:8000/transactions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Error creating transaction');
    }
    
    const result = await response.json();
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error creating transaction:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}