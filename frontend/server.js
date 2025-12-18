/**
 * Custom Next.js server with WebSocket proxy support
 *
 * Handles:
 * - HTTP requests via Next.js (port 8080)
 * - WebSocket upgrades to backend sidecars
 *   - /ws/fraud/* -> http://localhost:8000/*
 *   - /ws/aml/* -> http://localhost:8001/*
 */

const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const httpProxy = require('http-proxy');

const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.HOSTNAME || '0.0.0.0';
const port = parseInt(process.env.PORT || '8080', 10);

const FRAUD_BACKEND_URL = process.env.FRAUD_BACKEND_URL || 'http://localhost:8000';
const AML_BACKEND_URL = process.env.AML_BACKEND_URL || 'http://localhost:8001';

// Initialize Next.js app
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// Create WebSocket proxy instances
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
  if (res && res.writeHead) {
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('Fraud WebSocket proxy error');
  }
});

amlProxy.on('error', (err, req, res) => {
  console.error('[AML WS Proxy] Error:', err.message);
  if (res && res.writeHead) {
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('AML WebSocket proxy error');
  }
});

app.prepare().then(() => {
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  });

  // Handle WebSocket upgrade requests
  server.on('upgrade', (req, socket, head) => {
    const { pathname } = parse(req.url);

    console.log(`[WS Proxy] Upgrade request: ${pathname}`);

    if (pathname.startsWith('/ws/fraud/')) {
      // Remove /ws/fraud prefix and proxy to fraud backend
      req.url = pathname.replace('/ws/fraud', '');
      console.log(`[WS Proxy] Routing to fraud backend: ${req.url}`);
      fraudProxy.ws(req, socket, head);
    } else if (pathname.startsWith('/ws/aml/')) {
      // Remove /ws/aml prefix and proxy to AML backend
      req.url = pathname.replace('/ws/aml', '');
      console.log(`[WS Proxy] Routing to AML backend: ${req.url}`);
      amlProxy.ws(req, socket, head);
    } else {
      console.error(`[WS Proxy] Unknown WebSocket route: ${pathname}`);
      socket.destroy();
    }
  });

  server.listen(port, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://${hostname}:${port}`);
    console.log(`> WebSocket proxy enabled:`);
    console.log(`  - /ws/fraud/* -> ${FRAUD_BACKEND_URL}`);
    console.log(`  - /ws/aml/* -> ${AML_BACKEND_URL}`);
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('SIGTERM received, closing server...');
    server.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
  });

  process.on('SIGINT', () => {
    console.log('SIGINT received, closing server...');
    server.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
  });
});
