/**
 * Artifact utilities — type detection, download helpers, MIME constants.
 */

export const ARTIFACT_TYPES = {
  MARKDOWN: 'text/markdown',
  HTML: 'text/html',
  MERMAID: 'application/vnd.mermaid',
};

const TYPE_META = {
  [ARTIFACT_TYPES.MARKDOWN]: { label: 'Report', icon: '📄', ext: '.md', color: '#3b82f6' },
  [ARTIFACT_TYPES.HTML]:     { label: 'HTML',   icon: '🌐', ext: '.html', color: '#f59e0b' },
  [ARTIFACT_TYPES.MERMAID]:  { label: 'Diagram', icon: '📊', ext: '.mmd', color: '#10b981' },
};

export function getArtifactMeta(type) {
  return TYPE_META[type] || { label: 'Artifact', icon: '📎', ext: '.txt', color: '#6b7280' };
}

/**
 * Trigger a browser download of text content.
 */
export function downloadArtifact(content, filename, mimeType = 'text/plain') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Build a safe filename from an artifact identifier + type.
 */
export function artifactFilename(identifier, type) {
  const meta = getArtifactMeta(type);
  const safe = (identifier || '').replace(/[^a-zA-Z0-9_-]/g, '_') || 'artifact';
  return `${safe}${meta.ext}`;
}

/**
 * Download the rendered SVG from a mermaid diagram container.
 */
export function downloadSvgElement(svgElement, filename) {
  const serializer = new XMLSerializer();
  const svgStr = serializer.serializeToString(svgElement);
  downloadArtifact(svgStr, filename, 'image/svg+xml');
}

/**
 * Copy text content to clipboard.
 */
export async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
