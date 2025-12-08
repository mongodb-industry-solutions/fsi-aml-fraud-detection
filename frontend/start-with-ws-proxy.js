/**
 * Startup script that runs both Next.js and WebSocket proxy
 *
 * Starts:
 * - Next.js server on port 8080 (or PORT env var)
 * - WebSocket proxy on port 8081 (or WS_PROXY_PORT env var)
 */

const { spawn } = require('child_process');

// Start Next.js server
const nextServer = spawn('npm', ['run', 'start:next'], {
  stdio: 'inherit',
  shell: true,
});

// Start WebSocket proxy server
const wsProxy = spawn('npm', ['run', 'start:ws-proxy'], {
  stdio: 'inherit',
  shell: true,
});

// Handle process termination
function cleanup() {
  console.log('Shutting down servers...');
  nextServer.kill();
  wsProxy.kill();
  process.exit(0);
}

process.on('SIGTERM', cleanup);
process.on('SIGINT', cleanup);

nextServer.on('error', (err) => {
  console.error('Next.js server error:', err);
  cleanup();
});

wsProxy.on('error', (err) => {
  console.error('WebSocket proxy error:', err);
  cleanup();
});

nextServer.on('exit', (code) => {
  console.log(`Next.js server exited with code ${code}`);
  cleanup();
});

wsProxy.on('exit', (code) => {
  console.log(`WebSocket proxy exited with code ${code}`);
  cleanup();
});

console.log('Starting Next.js server and WebSocket proxy...');
