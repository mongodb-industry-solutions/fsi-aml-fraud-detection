"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { palette } from '@leafygreen-ui/palette';
import { spacing } from '@leafygreen-ui/tokens';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  ARTIFACT_TYPES,
  getArtifactMeta,
  downloadArtifact,
  artifactFilename,
  downloadSvgElement,
  copyToClipboard,
} from '@/lib/artifact-utils';

import DOMPurify from 'dompurify';

const FONT = "'Euclid Circular A', sans-serif";

const markdownPanelStyles = `
.artifact-md h1, .artifact-md h2, .artifact-md h3 {
  margin: 12px 0 8px;
  font-weight: 700;
  line-height: 1.4;
  color: ${palette.gray.dark3};
}
.artifact-md h1 { font-size: 20px; }
.artifact-md h2 { font-size: 17px; border-bottom: 1px solid ${palette.gray.light2}; padding-bottom: 6px; }
.artifact-md h3 { font-size: 15px; }
.artifact-md p { margin: 8px 0; line-height: 1.7; }
.artifact-md ul, .artifact-md ol { margin: 8px 0; padding-left: 24px; }
.artifact-md li { margin: 4px 0; }
.artifact-md code {
  background: ${palette.gray.light3};
  border-radius: 4px;
  padding: 2px 6px;
  font-size: 12px;
  font-family: 'Source Code Pro', monospace;
}
.artifact-md pre { margin: 12px 0; overflow-x: auto; background: ${palette.gray.light3}; border-radius: 6px; padding: 12px; }
.artifact-md pre code { display: block; padding: 0; background: none; }
.artifact-md hr { margin: 16px 0; border: none; border-top: 1px solid ${palette.gray.light2}; }
.artifact-md strong { font-weight: 600; }
.artifact-md a { color: ${palette.blue.dark1}; text-decoration: none; }
.artifact-md a:hover { text-decoration: underline; }
.artifact-md table { border-collapse: collapse; margin: 12px 0; font-size: 13px; width: 100%; }
.artifact-md th { background: ${palette.gray.light3}; font-weight: 600; text-align: left; }
.artifact-md th, .artifact-md td { border: 1px solid ${palette.gray.light2}; padding: 6px 10px; }
.artifact-md blockquote {
  margin: 12px 0;
  padding: 8px 16px;
  border-left: 3px solid ${palette.green.dark1};
  background: ${palette.green.light3};
  color: ${palette.gray.dark2};
}
`;

// ─── Mermaid renderer ─────────────────────────────────────────────────────

let _mermaidInitialized = false;

function MermaidRenderer({ code }) {
  const containerRef = useRef(null);
  const [error, setError] = useState(null);
  const idRef = useRef(`mermaid-${Math.random().toString(36).slice(2, 10)}`);

  useEffect(() => {
    if (!code) return;
    let cancelled = false;

    (async () => {
      try {
        const mermaid = (await import('mermaid')).default;
        if (!_mermaidInitialized) {
          mermaid.initialize({
            startOnLoad: false,
            theme: 'neutral',
            fontFamily: FONT,
            securityLevel: 'strict',
          });
          _mermaidInitialized = true;
        }
        const { svg } = await mermaid.render(idRef.current, code.trim());
        if (!cancelled && containerRef.current) {
          containerRef.current.innerHTML = DOMPurify.sanitize(svg, {
            USE_PROFILES: { svg: true, svgFilters: true },
            ADD_TAGS: ['foreignObject'],
          });
          setError(null);
        }
      } catch (err) {
        if (!cancelled) setError(err.message || 'Failed to render diagram');
      }
    })();

    return () => { cancelled = true; };
  }, [code]);

  if (error) {
    return (
      <div style={{
        padding: spacing[3], background: '#fef2f2',
        border: '1px solid #fecaca', borderRadius: 6,
        fontSize: 12, color: '#991b1b',
        fontFamily: "'Source Code Pro', monospace",
        whiteSpace: 'pre-wrap',
      }}>
        Diagram error: {error}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      style={{ display: 'flex', justifyContent: 'center', overflow: 'auto', padding: spacing[2] }}
    />
  );
}

// ─── Sandboxed iframe renderer (HTML) ─────────────────────────────────────

function SandboxedRenderer({ code, artifactType, isComplete }) {
  const iframeRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const handler = (event) => {
      if (iframeRef.current && event.source !== iframeRef.current.contentWindow) return;
      const data = event.data;
      if (!data) return;
      if (data.type === 'sandbox_ready') setReady(true);
      if (data.type === 'sandbox_error') setError(data.message);
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  useEffect(() => {
    if (!ready || !code || !iframeRef.current) return;
    if (!isComplete) return;
    iframeRef.current.contentWindow.postMessage(
      { type: 'render', code, artifactType },
      '*'
    );
  }, [ready, code, artifactType, isComplete]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: 300 }}>
      {error && (
        <div style={{
          padding: spacing[3], background: '#fef2f2',
          border: '1px solid #fecaca', borderRadius: 6,
          fontSize: 12, color: '#991b1b', margin: spacing[2],
        }}>
          {error}
        </div>
      )}
      <iframe
        ref={iframeRef}
        src="/artifact-sandbox.html"
        sandbox="allow-scripts"
        style={{
          width: '100%',
          height: '100%',
          minHeight: 300,
          border: 'none',
          borderRadius: 6,
          background: '#fff',
        }}
        title="Artifact preview"
      />
    </div>
  );
}

// ─── Code view (source toggle) ────────────────────────────────────────────

function CodeView({ code }) {
  return (
    <pre style={{
      margin: 0,
      padding: spacing[3],
      background: palette.gray.light3,
      borderRadius: 6,
      fontSize: 12,
      fontFamily: "'Source Code Pro', monospace",
      lineHeight: 1.6,
      overflow: 'auto',
      color: palette.gray.dark2,
      whiteSpace: 'pre-wrap',
      wordBreak: 'break-word',
    }}>
      {code}
    </pre>
  );
}

// ─── Action button ────────────────────────────────────────────────────────

function ActionButton({ label, icon, onClick, active = false }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title={label}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 500,
        fontFamily: FONT, cursor: 'pointer',
        border: `1px solid ${active ? palette.green.dark1 : palette.gray.light2}`,
        background: active ? palette.green.light3 : hovered ? palette.gray.light3 : '#fff',
        color: active ? palette.green.dark2 : palette.gray.dark2,
        transition: 'all 0.15s ease',
      }}
    >
      <span style={{ fontSize: 13, lineHeight: 1 }}>{icon}</span>
      {label}
    </button>
  );
}

// ─── Streaming indicator ──────────────────────────────────────────────────

function StreamingIndicator() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: `${spacing[2]}px ${spacing[3]}px`,
      fontSize: 12, color: palette.gray.dark1, fontFamily: FONT,
    }}>
      <span style={{
        display: 'inline-block', width: 10, height: 10,
        border: `2px solid ${palette.gray.light2}`,
        borderTopColor: palette.green.dark1,
        borderRadius: '50%',
        animation: 'artifact-spin 0.7s linear infinite',
      }} />
      Generating artifact...
    </div>
  );
}

// ─── Main ArtifactPanel ───────────────────────────────────────────────────

export default function ArtifactPanel({ artifact, onClose }) {
  const [showSource, setShowSource] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState(false);
  const containerRef = useRef(null);

  const meta = useMemo(
    () => getArtifactMeta(artifact?.type),
    [artifact?.type]
  );

  const isStreaming = artifact?.status === 'streaming';
  const content = artifact?.content || '';

  const handleDownload = useCallback(() => {
    if (!content) return;
    const filename = artifactFilename(artifact.identifier, artifact.type);

    if (!showSource && artifact.type === ARTIFACT_TYPES.MERMAID) {
      const svg = containerRef.current?.querySelector('svg');
      if (svg) {
        downloadSvgElement(svg, filename.replace('.mmd', '.svg'));
        return;
      }
    }
    downloadArtifact(content, filename, artifact.type);
  }, [content, artifact, showSource]);

  const handleCopy = useCallback(async () => {
    const ok = await copyToClipboard(content);
    if (ok) {
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 1500);
    }
  }, [content]);

  if (!artifact) return null;

  const renderBody = () => {
    if (isStreaming && !content) return <StreamingIndicator />;

    if (showSource) return <CodeView code={content} />;

    switch (artifact.type) {
      case ARTIFACT_TYPES.MARKDOWN:
        return (
          <div className="artifact-md" style={{
            padding: spacing[4],
            fontSize: 14,
            fontFamily: FONT,
            lineHeight: 1.7,
            color: palette.gray.dark2,
          }}>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
          </div>
        );

      case ARTIFACT_TYPES.MERMAID:
        return <MermaidRenderer code={content} />;

      case ARTIFACT_TYPES.HTML:
        return <SandboxedRenderer key={artifact.identifier} code={content} artifactType={artifact.type} isComplete={!isStreaming} />;

      default:
        return <CodeView code={content} />;
    }
  };

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: '100%', width: '100%',
      background: '#fff',
      borderLeft: `1px solid ${palette.gray.light2}`,
      overflow: 'hidden',
    }}>
      <style>{markdownPanelStyles}{`
        @keyframes artifact-spin { to { transform: rotate(360deg); } }
      `}</style>

      {/* Header */}
      <div style={{
        padding: `${spacing[2]}px ${spacing[3]}px`,
        borderBottom: `1px solid ${palette.gray.light2}`,
        display: 'flex', alignItems: 'center', gap: spacing[2],
        flexShrink: 0,
        background: palette.gray.light3,
      }}>
        <div style={{
          width: 28, height: 28, borderRadius: 6,
          background: `${meta.color}18`,
          border: `1px solid ${meta.color}40`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 14, flexShrink: 0,
        }}>
          {meta.icon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontWeight: 600, fontSize: 13, fontFamily: FONT,
            color: palette.gray.dark3,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {artifact.title}
          </div>
          <div style={{ fontSize: 10, color: palette.gray.dark1, fontFamily: FONT, marginTop: 1 }}>
            {meta.label}
            {isStreaming && ' · streaming...'}
          </div>
        </div>
        <button
          onClick={onClose}
          title="Close artifact panel"
          aria-label="Close artifact panel"
          style={{
            width: 28, height: 28, borderRadius: 6,
            border: `1px solid ${palette.gray.light2}`,
            background: '#fff', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14, color: palette.gray.dark1,
            transition: 'all 0.15s ease',
            flexShrink: 0,
          }}
        >
          ✕
        </button>
      </div>

      {/* Toolbar */}
      <div style={{
        padding: `${spacing[1]}px ${spacing[3]}px`,
        borderBottom: `1px solid ${palette.gray.light2}`,
        display: 'flex', gap: spacing[1],
        flexShrink: 0,
        flexWrap: 'wrap',
      }}>
        <ActionButton
          label={showSource ? 'Preview' : 'Source'}
          icon={showSource ? '👁' : '{ }'}
          onClick={() => setShowSource(s => !s)}
          active={showSource}
        />
        <ActionButton
          label={copyFeedback ? 'Copied' : 'Copy'}
          icon={copyFeedback ? '✓' : '📋'}
          onClick={handleCopy}
        />
        <ActionButton
          label="Download"
          icon="↓"
          onClick={handleDownload}
        />
      </div>

      {/* Body */}
      <div
        ref={containerRef}
        style={{
          flex: 1, minHeight: 0,
          overflow: 'auto',
        }}
      >
        {renderBody()}
        {isStreaming && content && <StreamingIndicator />}
      </div>
    </div>
  );
}
