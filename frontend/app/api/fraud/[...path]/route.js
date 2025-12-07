/**
 * Fraud Backend Proxy Route
 *
 * Proxies requests from browser to Fraud backend sidecar container
 * Browser -> Next.js (port 8080) -> Fraud Backend (port 8000)
 */

import { NextResponse } from 'next/server';

const FRAUD_BACKEND_URL = process.env.FRAUD_BACKEND_URL || 'http://localhost:8000';

export async function GET(request, { params }) {
  try {
    const { path } = params;
    const pathString = Array.isArray(path) ? path.join('/') : path;

    // Get search params from request
    const searchParams = request.nextUrl.searchParams;
    const queryString = searchParams.toString();

    // Construct full URL
    const url = `${FRAUD_BACKEND_URL}/${pathString}${queryString ? `?${queryString}` : ''}`;

    console.log(`[Fraud Proxy] GET ${url}`);

    // Forward request to Fraud backend
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('[Fraud Proxy] Error:', error);
    return NextResponse.json(
      { error: 'Failed to proxy request to Fraud backend', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request, { params }) {
  try {
    const { path } = params;
    const pathString = Array.isArray(path) ? path.join('/') : path;

    // Get request body
    const body = await request.json();

    // Construct full URL
    const url = `${FRAUD_BACKEND_URL}/${pathString}`;

    console.log(`[Fraud Proxy] POST ${url}`);

    // Forward request to Fraud backend
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('[Fraud Proxy] Error:', error);
    return NextResponse.json(
      { error: 'Failed to proxy request to Fraud backend', details: error.message },
      { status: 500 }
    );
  }
}
