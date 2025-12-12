/**
 * WebSocket Proxy Server for Backend Sidecars
 *
 * Next.js App Router doesn't support WebSocket upgrades in API routes,
 * so we run a separate WebSocket proxy server on port 8081.
 *
 * Routes:
 * - /ws/fraud/* -> http://localhost:8000/*
 * - /ws/aml/* -> http://localhost:8001/*
 */

const http = require('http');
const httpProxy = require('http-proxy');

const FRAUD_BACKEND_URL = process.env.FRAUD_BACKEND_URL || 'http://localhost:8000';
const AML_BACKEND_URL = process.env.AML_BACKEND_URL || 'http://localhost:8001';
const WS_PORT = process.env.PORT || 8080;  // Use same port as Next.js

// Create proxy instances for each backend
const fraudProxy = httpProxy.createProxyServer({
  target: FRAUD_BACKEND_URL,
  ws: true,
  changeOrigin: true,
});

const amlProxy = httpProxy.createProxyServer({
  target: AML_BACKEND_URL,
  ws: true,
  changeOrigin: true,
});

// Handle proxy errors
fraudProxy.on('error', (err, req, res) => {
  console.error('[Fraud WS Proxy] Error:', err.message);
  if (res.writeHead) {
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('Fraud WebSocket proxy error');
  }
});

amlProxy.on('error', (err, req, res) => {
  console.error('[AML WS Proxy] Error:', err.message);
  if (res.writeHead) {
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('AML WebSocket proxy error');
  }
});

// No HTTP server needed - we'll hook into Next.js server's upgrade event
// This module exports the upgrade handler to be used by Next.js custom server

// Handle WebSocket upgrade requests
server.on('upgrade', (req, socket, head) => {
  const url = req.url;

  console.log(`[WS Proxy] Upgrade request: ${url}`);

  if (url.startsWith('/ws/fraud/')) {
    // Remove /ws/fraud prefix and proxy to fraud backend
    req.url = url.replace('/ws/fraud', '');
    console.log(`[WS Proxy] Routing to fraud backend: ${req.url}`);
    fraudProxy.ws(req, socket, head);
  } else if (url.startsWith('/ws/aml/')) {
    // Remove /ws/aml prefix and proxy to AML backend
    req.url = url.replace('/ws/aml', '');
    console.log(`[WS Proxy] Routing to AML backend: ${req.url}`);
    amlProxy.ws(req, socket, head);
  } else {
    console.error(`[WS Proxy] Unknown route: ${url}`);
    socket.destroy();
  }
});

server.listen(WS_PORT, () => {
  console.log(`WebSocket proxy server listening on port ${WS_PORT}`);
  console.log(`- /ws/fraud/* -> ${FRAUD_BACKEND_URL}`);
  console.log(`- /ws/aml/* -> ${AML_BACKEND_URL}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, closing WebSocket proxy server...');
  server.close(() => {
    console.log('WebSocket proxy server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, closing WebSocket proxy server...');
  server.close(() => {
    console.log('WebSocket proxy server closed');
    process.exit(0);
  });
});
