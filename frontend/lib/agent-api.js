/**
 * Agent Investigation API Service
 * Handles communication with the agent investigation endpoints via AML proxy
 */

const AML_API_URL =
  process.env.NEXT_PUBLIC_AML_API_URL ||
  'https://threatsight-aml.api.mongodb-industry-solutions.com';

/**
 * Launch a new investigation with SSE streaming
 * @param {Object} alertData - { entity_id, alert_type, ... }
 * @param {Function} onEvent - callback for each SSE event
 * @returns {Promise<void>}
 */
export async function launchInvestigation(alertData, onEvent) {
  const url = `${AML_API_URL}/agents/investigate`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(alertData),
  });

  if (!response.ok) {
    throw new Error(`Investigation launch failed: ${response.status}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

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
}

/**
 * Resume an investigation after human review
 * @param {Object} resumeData - { thread_id, decision, analyst_notes }
 * @param {Function} onEvent - callback for each SSE event
 */
export async function resumeInvestigation(resumeData, onEvent) {
  const url = `${AML_API_URL}/agents/investigate/resume`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(resumeData),
  });

  if (!response.ok) {
    throw new Error(`Investigation resume failed: ${response.status}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

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
