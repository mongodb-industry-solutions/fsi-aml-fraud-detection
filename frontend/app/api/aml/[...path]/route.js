/**
 * AML Backend Proxy Route
 *
 * Proxies requests from browser to AML backend sidecar container
 * Browser -> Next.js (port 8080) -> AML Backend (port 8001)
 */

import { NextResponse } from 'next/server';

const AML_BACKEND_URL = process.env.AML_BACKEND_URL || 'http://localhost:8001';

export async function GET(request, { params }) {
  try {
    const { path } = params;
    const pathString = Array.isArray(path) ? path.join('/') : path;

    // Get search params from request
    const searchParams = request.nextUrl.searchParams;
    const queryString = searchParams.toString();

    // Construct full URL
    const url = `${AML_BACKEND_URL}/${pathString}${queryString ? `?${queryString}` : ''}`;

    console.log(`[AML Proxy] GET ${url}`);

    // Forward request to AML backend
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('[AML Proxy] Error:', error);
    return NextResponse.json(
      { error: 'Failed to proxy request to AML backend', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request, { params }) {
  try {
    const { path } = params;
    const pathString = Array.isArray(path) ? path.join('/') : path;
    const url = `${AML_BACKEND_URL}/${pathString}`;

    console.log(`[AML Proxy] POST ${url}`);

    // Try to get body, handle empty bodies gracefully
    let body = null;
    const contentType = request.headers.get('content-type');
    const contentLength = request.headers.get('content-length');

    // Only try to parse JSON if there's actually a body
    if (contentLength && parseInt(contentLength) > 0 && contentType?.includes('application/json')) {
      try {
        body = await request.json();
      } catch (e) {
        console.log('[AML Proxy] Failed to parse JSON body:', e.message);
      }
    }

    // Forward request to AML backend
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    // Handle response - might be JSON or plain text
    const responseContentType = response.headers.get('content-type');
    if (responseContentType?.includes('application/json')) {
      const data = await response.json();
      return NextResponse.json(data, { status: response.status });
    } else {
      const text = await response.text();
      return new NextResponse(text, {
        status: response.status,
        headers: { 'Content-Type': 'text/plain' }
      });
    }
  } catch (error) {
    console.error('[AML Proxy] Error:', error);
    return NextResponse.json(
      { error: 'Failed to proxy request to AML backend', details: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(request, { params }) {
  try {
    const { path } = params;
    const pathString = Array.isArray(path) ? path.join('/') : path;
    const url = `${AML_BACKEND_URL}/${pathString}`;

    console.log(`[AML Proxy] PUT ${url}`);

    // Try to get body, handle empty bodies gracefully
    let body = null;
    const contentType = request.headers.get('content-type');
    const contentLength = request.headers.get('content-length');

    // Only try to parse JSON if there's actually a body
    if (contentLength && parseInt(contentLength) > 0 && contentType?.includes('application/json')) {
      try {
        body = await request.json();
      } catch (e) {
        console.log('[AML Proxy] Failed to parse JSON body:', e.message);
      }
    }

    // Forward request to AML backend
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    // Handle response - might be JSON or plain text
    const responseContentType = response.headers.get('content-type');
    if (responseContentType?.includes('application/json')) {
      const data = await response.json();
      return NextResponse.json(data, { status: response.status });
    } else {
      const text = await response.text();
      return new NextResponse(text, {
        status: response.status,
        headers: { 'Content-Type': 'text/plain' }
      });
    }
  } catch (error) {
    console.error('[AML Proxy] Error:', error);
    return NextResponse.json(
      { error: 'Failed to proxy request to AML backend', details: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    const { path } = params;
    const pathString = Array.isArray(path) ? path.join('/') : path;

    // Construct full URL
    const url = `${AML_BACKEND_URL}/${pathString}`;

    console.log(`[AML Proxy] DELETE ${url}`);

    // Forward request to AML backend
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('[AML Proxy] Error:', error);
    return NextResponse.json(
      { error: 'Failed to proxy request to AML backend', details: error.message },
      { status: 500 }
    );
  }
}
