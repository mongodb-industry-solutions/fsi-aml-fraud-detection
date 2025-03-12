// API route for fraud rules
import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    const response = await fetch('http://localhost:8000/fraud-rules');
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching fraud rules:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const data = await request.json();
    
    const response = await fetch('http://localhost:8000/fraud-rules', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Error updating fraud rules');
    }
    
    const result = await response.json();
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error updating fraud rules:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}