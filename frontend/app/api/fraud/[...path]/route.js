/**
 * Fraud Backend Proxy Route
 *
 * Proxies requests from browser to Fraud backend sidecar container
 * Browser -> Next.js (port 8080) -> Fraud Backend (port 8000)
 */

import { NextResponse } from 'next/server';

const FRAUD_BACKEND_URL = process.env.FRAUD_BACKEND_URL || 'http://localhost:8000';

/**
 * Build the upstream URL, preserving the incoming query string.
 *
 * Every method needs this, not just GET: POST /models/:id/activate,
 * POST /models/:id/restore and DELETE /models/:id all take a `version` query
 * param. Dropping it made the backend fall back to resolving the model by id
 * alone, which silently targeted the wrong version — activation of a draft
 * reported "already active" because it had resolved the currently-active
 * version instead. Local dev talks to the backend directly and never hit this.
 */
const buildTargetUrl = (request, path) => {
  const pathString = Array.isArray(path) ? path.join('/') : path;
  const queryString = request.nextUrl.searchParams.toString();
  return `${FRAUD_BACKEND_URL}/${pathString}${queryString ? `?${queryString}` : ''}`;
};

export async function GET(request, { params }) {
  try {
    const { path } = params;
    const url = buildTargetUrl(request, path);

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
    const url = buildTargetUrl(request, path);

    console.log(`[Fraud Proxy] POST ${url}`);

    // Try to get body, handle empty bodies gracefully
    let body = null;
    const contentType = request.headers.get('content-type');
    const contentLength = request.headers.get('content-length');

    // Only try to parse JSON if there's actually a body
    if (contentLength && parseInt(contentLength) > 0 && contentType?.includes('application/json')) {
      try {
        body = await request.json();
      } catch (e) {
        console.log('[Fraud Proxy] Failed to parse JSON body:', e.message);
      }
    }

    // Forward request to Fraud backend
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
    console.error('[Fraud Proxy] Error:', error);
    return NextResponse.json(
      { error: 'Failed to proxy request to Fraud backend', details: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(request, { params }) {
  try {
    const { path } = params;
    const url = buildTargetUrl(request, path);

    console.log(`[Fraud Proxy] PUT ${url}`);

    // Try to get body, handle empty bodies gracefully
    let body = null;
    const contentType = request.headers.get('content-type');
    const contentLength = request.headers.get('content-length');

    // Only try to parse JSON if there's actually a body
    if (contentLength && parseInt(contentLength) > 0 && contentType?.includes('application/json')) {
      try {
        body = await request.json();
      } catch (e) {
        console.log('[Fraud Proxy] Failed to parse JSON body:', e.message);
      }
    }

    // Forward request to Fraud backend
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
    console.error('[Fraud Proxy] Error:', error);
    return NextResponse.json(
      { error: 'Failed to proxy request to Fraud backend', details: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    const { path } = params;
    const url = buildTargetUrl(request, path);

    console.log(`[Fraud Proxy] DELETE ${url}`);

    // Forward request to Fraud backend
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
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
    console.error('[Fraud Proxy] Error:', error);
    return NextResponse.json(
      { error: 'Failed to proxy request to Fraud backend', details: error.message },
      { status: 500 }
    );
  }
}
