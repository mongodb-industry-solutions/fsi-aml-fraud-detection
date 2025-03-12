// API route for generating sample transactions
import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const { count = 10 } = await request.json().catch(() => ({}));
    
    // Add detailed logging
    console.log(`Frontend API: Attempting to generate ${count} sample transactions`);
    console.log(`Making request to: http://localhost:8000/transactions/generate-samples?count=${count}`);
    
    // Check if backend is running first
    try {
      const healthCheck = await fetch('http://localhost:8000/');
      if (!healthCheck.ok) {
        console.error(`Backend health check failed with status: ${healthCheck.status}`);
        throw new Error('Backend service is not available. Please ensure the backend server is running.');
      }
    } catch (connectionError) {
      console.error(`Backend connection error: ${connectionError.message}`);
      throw new Error('Cannot connect to the backend service. Please ensure the backend server is running.');
    }
    
    // Main request
    const response = await fetch(`http://localhost:8000/transactions/generate-samples?count=${count}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    console.log(`Received response with status: ${response.status}`);
    
    if (!response.ok) {
      let errorMessage = 'Error generating sample transactions';
      
      // Try to get response body
      const responseText = await response.text();
      console.error(`Error response body: ${responseText}`);
      
      try {
        // Try to parse as JSON
        if (responseText) {
          const errorData = JSON.parse(responseText);
          if (errorData.detail) {
            console.error(`Detailed error: ${JSON.stringify(errorData.detail)}`);
            errorMessage = typeof errorData.detail === 'string' 
              ? errorData.detail 
              : JSON.stringify(errorData.detail);
          }
        }
      } catch (jsonError) {
        console.error(`Failed to parse error response: ${jsonError.message}`);
        // Use the raw text if JSON parsing fails
        if (responseText) {
          errorMessage = `Server error: ${responseText.substring(0, 200)}`;
        }
      }
      
      throw new Error(errorMessage);
    }
    
    const result = await response.json();
    console.log(`Successfully generated ${Array.isArray(result) ? result.length : 0} sample transactions`);
    
    if (!Array.isArray(result)) {
      console.error(`Unexpected response format. Expected array, got:`, result);
      throw new Error('Unexpected response format from the server');
    }
    
    if (result.length === 0) {
      console.warn(`Server returned empty array of transactions`);
    }
    
    return NextResponse.json(result);
  } catch (error) {
    console.error(`Error in generate-samples API route: ${error.message}`, error);
    return NextResponse.json({ 
      error: error.message,
      timestamp: new Date().toISOString(),
      path: '/api/generate-samples'
    }, { status: 500 });
  }
}