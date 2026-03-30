/**
 * Agent Investigation API Service
 * Handles communication with the agent investigation endpoints via AML proxy
 */

const AML_API_URL =
  process.env.NEXT_PUBLIC_AML_API_URL ||
  'https://threatsight-aml.api.mongodb-industry-solutions.com';

/**
 * Build a WebSocket URL for AML backend endpoints.
 * In deployment, AML_API_URL is a relative path like /api/aml — route through
 * the /ws/aml proxy so server.js handles the upgrade (Next.js API routes are HTTP-only).
 * In local dev (absolute URL), connect directly to the backend.
 */
function _buildWsUrl(path) {
  if (AML_API_URL.startsWith('/')) {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsPath = AML_API_URL.replace(/^\/api\//, '/ws/');
    return `${protocol}//${host}${wsPath}${path}`;
  }
  return AML_API_URL.replace(/^http/, 'ws') + path;
}

/**
 * Read an SSE stream from a fetch Response, parsing each `data: ...` line
 * and dispatching parsed JSON to the onEvent callback.
 * @param {Response} response - fetch Response with SSE body
 * @param {Function} onEvent - callback for each parsed SSE event
 */
async function readSSEStream(response, onEvent) {
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('data: ')) {
          try {
            const data = JSON.parse(trimmed.slice(6));
            onEvent(data);
          } catch {
            // skip malformed lines
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

/**
 * Launch a new investigation with SSE streaming
 * @param {Object} alertData - { entity_id, alert_type, ... }
 * @param {Function} onEvent - callback for each SSE event
 * @param {AbortSignal} [signal] - optional AbortSignal to cancel the stream
 * @returns {Promise<void>}
 */
export async function launchInvestigation(alertData, onEvent, signal) {
  const url = `${AML_API_URL}/agents/investigate`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(alertData),
    signal,
  });

  if (!response.ok) {
    throw new Error(`Investigation launch failed: ${response.status}`);
  }

  await readSSEStream(response, onEvent);
}

/**
 * Resume an investigation after human review
 * @param {Object} resumeData - { thread_id, decision, analyst_notes }
 * @param {Function} onEvent - callback for each SSE event
 * @param {AbortSignal} [signal] - optional AbortSignal to cancel the stream
 */
export async function resumeInvestigation(resumeData, onEvent, signal) {
  const url = `${AML_API_URL}/agents/investigate/resume`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(resumeData),
    signal,
  });

  if (!response.ok) {
    throw new Error(`Investigation resume failed: ${response.status}`);
  }

  await readSSEStream(response, onEvent);
}

/**
 * List all investigations
 */
export async function listInvestigations(status = null, limit = 20, skip = 0) {
  const params = new URLSearchParams({ limit: String(limit), skip: String(skip) });
  if (status) params.set('status', status);

  const url = `${AML_API_URL}/agents/investigations?${params}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to list investigations: ${response.status}`);
  return response.json();
}

/**
 * Get investigation detail
 */
export async function getInvestigation(caseId) {
  const url = `${AML_API_URL}/agents/investigations/${caseId}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to get investigation: ${response.status}`);
  return response.json();
}

/**
 * Seed agent collections
 */
export async function seedAgentCollections() {
  const url = `${AML_API_URL}/agents/seed`;
  const response = await fetch(url, { method: 'POST' });
  if (!response.ok) throw new Error(`Seed failed: ${response.status}`);
  return response.json();
}

/**
 * Fetch entities available for investigation, grouped by scenarioKey
 */
export async function fetchInvestigableEntities() {
  const url = `${AML_API_URL}/agents/entities/investigable`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch entities: ${response.status}`);
  return response.json();
}

/**
 * Fetch AML typologies from the typology library
 */
export async function fetchTypologies() {
  const url = `${AML_API_URL}/agents/typologies`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch typologies: ${response.status}`);
  return response.json();
}

/**
 * Fetch investigation analytics (aggregation pipeline results)
 */
export async function fetchInvestigationAnalytics() {
  const url = `${AML_API_URL}/agents/investigations/analytics`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch analytics: ${response.status}`);
  return response.json();
}

/**
 * Search investigations by query string
 */
export async function searchInvestigations(query, limit = 20) {
  const params = new URLSearchParams({ q: query, limit: String(limit) });
  const url = `${AML_API_URL}/agents/investigations/search?${params}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to search investigations: ${response.status}`);
  return response.json();
}

/**
 * Create a resilient WebSocket connection with exponential backoff reconnection.
 * Mirrors the retry logic used by the risk model change stream in ModelAdminPanel.
 *
 * @param {string} path - WebSocket endpoint path (e.g. '/agents/alerts/stream')
 * @param {Function} onEvent - callback for each parsed event
 * @param {object} [opts]
 * @param {number} [opts.maxAttempts=20] - max reconnection attempts before giving up
 * @param {number} [opts.maxDelay=30000] - ceiling for backoff delay in ms
 * @returns {{ close: Function }} - control handle; call close() to stop reconnecting
 */
function _connectWithRetry(path, onEvent, { maxAttempts = 20, maxDelay = 30000 } = {}) {
  let ws = null;
  let reconnectTimer = null;
  let attempts = 0;
  let closed = false;

  function connect() {
    if (closed) return;

    const wsUrl = _buildWsUrl(path);
    ws = new WebSocket(wsUrl);
    let hadError = false;

    ws.onopen = () => {
      if (closed) return;
      attempts = 0;
      onEvent({ type: '_connected' });
    };

    ws.onmessage = (event) => {
      if (closed) return;
      try {
        const data = JSON.parse(event.data);
        if (data.type !== 'heartbeat') {
          onEvent(data);
        }
      } catch { /* ignore parse errors */ }
    };

    ws.onerror = () => {
      if (closed) return;
      hadError = true;
      onEvent({ type: '_error' });
    };

    ws.onclose = () => {
      if (closed) return;
      if (!hadError) onEvent({ type: '_disconnected' });

      if (attempts < maxAttempts) {
        const delay = Math.min(1000 * Math.pow(2, attempts), maxDelay);
        onEvent({ type: '_reconnecting', attempt: attempts + 1, maxAttempts, delay });
        reconnectTimer = setTimeout(() => {
          attempts += 1;
          connect();
        }, delay);
      } else {
        onEvent({ type: '_max_retries' });
      }
    };
  }

  connect();

  return {
    close: () => {
      closed = true;
      if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }
      if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
        ws.close();
      }
    },
  };
}

/**
 * Connect to the investigation Change Stream via WebSocket
 * @param {Function} onEvent - callback for each change event
 * @returns {{ close: Function }} - control handle
 */
export function connectInvestigationStream(onEvent) {
  return _connectWithRetry('/agents/investigations/stream', onEvent);
}

/**
 * Connect to the alerts + investigations Change Stream via WebSocket
 * @param {Function} onEvent - callback for each change event
 * @returns {{ close: Function }} - control handle
 */
export function connectAlertStream(onEvent) {
  return _connectWithRetry('/agents/alerts/stream', onEvent);
}

/**
 * Send a chat message to the AML compliance assistant with SSE streaming
 * @param {string} message - The user message
 * @param {string|null} threadId - Existing thread ID for conversation continuity
 * @param {Function} onEvent - Callback for each SSE event
 * @param {AbortSignal} [signal] - optional AbortSignal to cancel the stream
 * @returns {Promise<void>}
 */
export async function sendChatMessage(message, threadId, onEvent, signal) {
  const url = `${AML_API_URL}/agents/chat`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, thread_id: threadId }),
    signal,
  });

  if (!response.ok) {
    throw new Error(`Chat request failed: ${response.status}`);
  }

  await readSSEStream(response, onEvent);
}
