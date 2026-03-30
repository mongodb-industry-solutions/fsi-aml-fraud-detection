"use client";

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import Button from '@leafygreen-ui/button';
import Badge from '@leafygreen-ui/badge';
import { Body, Subtitle } from '@leafygreen-ui/typography';
import { palette } from '@leafygreen-ui/palette';
import { spacing } from '@leafygreen-ui/tokens';
import { useStickToBottom } from 'use-stick-to-bottom';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { sendChatMessage, getChatHistory } from '@/lib/agent-api';
import { getArtifactMeta } from '@/lib/artifact-utils';
import ArtifactPanel from './ArtifactPanel';

const FONT = "'Euclid Circular A', sans-serif";
const MAX_ARTIFACT_RETRIES = 15;

const RISK_COLORS = {
  critical: { bg: '#fce4ec', text: '#b71c1c', border: '#ef9a9a' },
  high:     { bg: '#fff3e0', text: '#e65100', border: '#ffcc80' },
  medium:   { bg: '#fff8e1', text: '#f57f17', border: '#fff176' },
  low:      { bg: '#e8f5e9', text: '#2e7d32', border: '#a5d6a7' },
};

const TOOL_STATUS_LABELS = {
  search_entities:           'Searching entities',
  search_investigations:     'Searching investigations',
  get_entity_profile:        'Loading entity profile',
  get_investigation_detail:  'Loading case details',
  assess_entity_risk:        'Assessing entity risk',
  compare_entities:          'Comparing entities',
  trace_fund_flow:           'Tracing fund flows',
  find_similar_entities:     'Finding similar entities',
  analyze_temporal_patterns: 'Analyzing temporal patterns',
  query_entity_transactions: 'Querying transactions',
  analyze_entity_network:    'Analyzing network',
  screen_watchlists:         'Screening watchlists',
  search_typologies:         'Searching typologies',
  lookup_typology:           'Looking up typology',
  search_compliance_policies:'Searching policies',
};

// ─── localStorage thread history helpers ──────────────────────────────────

const THREADS_STORAGE_KEY = 'aml-chat-threads';

function loadThreads() {
  try { return JSON.parse(localStorage.getItem(THREADS_STORAGE_KEY) || '[]'); }
  catch { return []; }
}

function persistThreads(threads) {
  localStorage.setItem(THREADS_STORAGE_KEY, JSON.stringify(threads.slice(0, 30)));
}

function upsertThread(threadId, title) {
  const threads = loadThreads();
  const idx = threads.findIndex(t => t.threadId === threadId);
  const entry = { threadId, title: (title || 'Untitled').slice(0, 80), updatedAt: Date.now() };
  if (idx >= 0) Object.assign(threads[idx], entry);
  else threads.unshift(entry);
  threads.sort((a, b) => b.updatedAt - a.updatedAt);
  persistThreads(threads);
}

// ─── JSON parse helper ────────────────────────────────────────────────────

function tryParseJSON(val) {
  if (val && typeof val === 'object') return val;
  if (!val || typeof val !== 'string') return null;
  try { return JSON.parse(val); } catch { return null; }
}

// ─── Derive follow-up suggestions from tool calls ────────────────────────

function deriveFollowUps(toolCalls) {
  if (!toolCalls?.length) return [];
  const suggestions = [];

  for (const tc of toolCalls) {
    const data = tryParseJSON(tc.output);
    if (!data) continue;

    if (tc.tool === 'search_entities' && data.entities?.length) {
      const first = data.entities[0];
      const label = first.name?.full || first.entityId;
      suggestions.push(`Show risk summary for ${label}`);
      if (data.entities.length > 1) {
        const second = data.entities[1];
        suggestions.push(`Compare ${first.name?.full || first.entityId} and ${second.name?.full || second.entityId}`);
      }
      suggestions.push(`Trace fund flows for ${label}`);
    }
    if (tc.tool === 'search_investigations' && data.investigations?.length) {
      suggestions.push(`Show details for case ${data.investigations[0].case_id}`);
    }
    if (tc.tool === 'get_entity_profile' && (data.entityId || data.entity_id)) {
      const eid = data.entityId || data.entity_id;
      suggestions.push(`Screen watchlists for ${eid}`);
      suggestions.push(`Analyze transactions for ${eid}`);
      suggestions.push(`Find entities similar to ${eid}`);
    }
    if (tc.tool === 'assess_entity_risk' && data.entity_id) {
      suggestions.push(`Trace fund flows for ${data.entity_id}`);
      suggestions.push(`Analyze temporal patterns for ${data.entity_id}`);
    }
    if (tc.tool === 'get_investigation_detail' && data.entity_id) {
      suggestions.push(`Show entity profile for ${data.entity_id}`);
    }
    if (tc.tool === 'trace_fund_flow' && data.entity_id) {
      suggestions.push(`Analyze temporal patterns for ${data.entity_id}`);
    }
  }

  return [...new Set(suggestions)].slice(0, 3);
}

// ─── Extract LLM-generated suggestions from message content ──────────────

function extractSuggestions(content) {
  const match = content?.match(/<!--suggestions:(\[[\s\S]*?\])-->/);
  if (!match) return { clean: content, suggestions: [] };
  const stripped = content.replace(/<!--suggestions:\[[\s\S]*?\]-->/g, '').trimEnd();
  try {
    const parsed = JSON.parse(match[1]);
    if (!Array.isArray(parsed)) return { clean: stripped, suggestions: [] };
    return {
      clean: stripped,
      suggestions: parsed.filter(s => typeof s === 'string').slice(0, 3),
    };
  } catch { return { clean: stripped, suggestions: [] }; }
}

// ─── Extract artifact blocks from message content ────────────────────────

const ARTIFACT_TAG_RE = /<artifact\s+(?=.*?identifier\s*=\s*"([^"]*)")(?=.*?type\s*=\s*"([^"]*)")(?=.*?title\s*=\s*"([^"]*)")[\s\S]*?>([\s\S]*?)<\/artifact>/g;

function extractArtifactsFromContent(content) {
  if (!content) return { clean: content, artifacts: [] };
  const artifacts = [];
  let clean = content;

  let match;
  // Reset regex state
  ARTIFACT_TAG_RE.lastIndex = 0;
  while ((match = ARTIFACT_TAG_RE.exec(content)) !== null) {
    artifacts.push({
      identifier: match[1],
      type: match[2],
      title: match[3],
      content: match[4].trim(),
      status: 'complete',
    });
  }

  if (artifacts.length > 0) {
    // Remove all artifact tags from the display content
    clean = content.replace(/<artifact\s+[\s\S]*?<\/artifact>/g, '').trim();
  }

  return { clean, artifacts };
}

// ─── Styles ───────────────────────────────────────────────────────────────

const markdownStyles = `
.chat-md h1, .chat-md h2, .chat-md h3 {
  margin: 6px 0 4px;
  font-size: 13px;
  font-weight: 700;
  line-height: 1.4;
}
.chat-md h1 { font-size: 15px; }
.chat-md h2 { font-size: 14px; }
.chat-md p { margin: 4px 0; }
.chat-md ul, .chat-md ol { margin: 4px 0; padding-left: 18px; }
.chat-md li { margin: 2px 0; }
.chat-md code {
  background: rgba(0,0,0,0.06);
  border-radius: 3px;
  padding: 1px 4px;
  font-size: 12px;
}
.chat-md pre { margin: 6px 0; overflow-x: auto; }
.chat-md pre code { display: block; padding: 6px 8px; }
.chat-md hr { margin: 8px 0; border: none; border-top: 1px solid rgba(0,0,0,0.1); }
.chat-md strong { font-weight: 600; }
.chat-md a { color: ${palette.blue.dark1}; text-decoration: none; }
.chat-md table { border-collapse: collapse; margin: 6px 0; font-size: 12px; }
.chat-md th, .chat-md td { border: 1px solid rgba(0,0,0,0.1); padding: 3px 6px; }
.chat-input-wrap:focus-within { border-color: ${palette.blue.light1} !important; box-shadow: 0 0 0 1px ${palette.blue.light1}; }
`;

const miniActionBtn = {
  background: 'none',
  border: `1px solid ${palette.gray.light2}`,
  borderRadius: 4,
  cursor: 'pointer',
  padding: '1px 5px',
  fontSize: 11,
  color: palette.gray.dark1,
  fontFamily: FONT,
  lineHeight: 1.6,
  transition: 'background 0.12s, border-color 0.12s',
};

// ─── Micro-components ─────────────────────────────────────────────────────

function RiskBadge({ level, score }) {
  const key = (level || '').toLowerCase();
  const colors = RISK_COLORS[key] || { bg: palette.gray.light3, text: palette.gray.dark1, border: palette.gray.light2 };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 3,
      padding: '1px 6px', borderRadius: 4, fontSize: 10, fontWeight: 600,
      background: colors.bg, color: colors.text, border: `1px solid ${colors.border}`,
      fontFamily: FONT, textTransform: 'uppercase', letterSpacing: '0.3px',
      whiteSpace: 'nowrap',
    }}>
      {level || '—'}{score != null ? ` · ${score}` : ''}
    </span>
  );
}

function EntityCard({ entity, onAction }) {
  const name = entity.name?.full || entity.entityId || '—';
  const risk = entity.riskAssessment?.overall || {};
  const isOrg = (entity.entityType || '').toLowerCase() === 'organization';

  return (
    <div style={{
      padding: '6px 8px', borderRadius: 6,
      border: `1px solid ${palette.gray.light2}`, background: '#fff',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
      display: 'flex', alignItems: 'center', gap: 8,
      marginBottom: 4, fontSize: 11, fontFamily: FONT,
    }}>
      <span style={{ fontSize: 14, flexShrink: 0 }}>{isOrg ? '🏢' : '👤'}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontWeight: 600, color: palette.gray.dark3,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>{name}</div>
        <div style={{ color: palette.gray.base, fontSize: 10 }}>
          {entity.entityId}
          {entity.scenarioKey ? ` · ${entity.scenarioKey}` : ''}
        </div>
      </div>
      <RiskBadge level={risk.level} score={risk.score} />
      {onAction && (
        <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
          <button onClick={() => onAction(`Show risk summary for ${entity.entityId}`)}
            style={miniActionBtn} title="Risk summary">📊</button>
          <button onClick={() => onAction(`Trace fund flows for ${entity.entityId}`)}
            style={miniActionBtn} title="Trace funds">💸</button>
        </div>
      )}
    </div>
  );
}

function InvestigationRow({ inv, onAction }) {
  const disposition = inv.triage_disposition || inv.status || 'unknown';
  const badgeVariant = disposition === 'file_sar' || disposition === 'filed'
    ? 'green' : disposition === 'escalate' ? 'red' : 'lightgray';

  return (
    <div style={{
      padding: '5px 8px', borderRadius: 6,
      border: `1px solid ${palette.gray.light2}`, background: '#fff',
      marginBottom: 4, fontSize: 11, fontFamily: FONT,
      display: 'flex', alignItems: 'center', gap: 8,
    }}>
      <span style={{ fontSize: 12, flexShrink: 0 }}>📋</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <span
          style={{ fontWeight: 600, color: palette.blue.dark1, cursor: onAction ? 'pointer' : 'default' }}
          onClick={() => onAction?.(`Show details for case ${inv.case_id}`)}
        >
          {inv.case_id}
        </span>
        {inv.typology && <span style={{ color: palette.gray.base, marginLeft: 6 }}>{inv.typology}</span>}
      </div>
      {inv.risk_score != null && (
        <span style={{ fontSize: 10, color: palette.gray.dark1 }}>Risk {inv.risk_score}</span>
      )}
      <Badge variant={badgeVariant} style={{ fontSize: 9 }}>{disposition}</Badge>
    </div>
  );
}

function RiskSummaryCard({ data }) {
  const risk = data.risk_assessment?.overall || data.risk_assessment || {};
  return (
    <div style={{
      marginTop: 4, padding: '6px 8px', borderRadius: 6,
      border: `1px solid ${palette.gray.light2}`, background: '#fff',
      fontSize: 11, fontFamily: FONT,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <span style={{ fontWeight: 600, color: palette.gray.dark3 }}>{data.name || data.entity_id}</span>
        <RiskBadge level={risk.level} score={risk.score} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3px 12px', fontSize: 10, color: palette.gray.dark1 }}>
        <div>Watchlist hits: <strong>{data.watchlist_hits ?? 0}</strong></div>
        <div>Flagged txns: <strong>{data.transaction_stats?.flagged_count ?? 0}</strong></div>
        <div>Total volume: <strong>${(data.transaction_stats?.total_volume ?? 0).toLocaleString()}</strong></div>
        <div>Network size: <strong>{data.network_stats?.total_relationships ?? 0}</strong></div>
      </div>
    </div>
  );
}

// ─── Rich tool output renderer ────────────────────────────────────────────

function RichToolOutput({ tool, output, onAction }) {
  const data = tryParseJSON(output);
  if (!data) return null;

  if (tool === 'search_entities' && 'entities' in data) {
    if (data.count === 0) {
      const diag = data.diagnostics;
      return (
        <div style={{ fontSize: 11, fontFamily: FONT, color: palette.gray.dark1, padding: '4px 0' }}>
          <div style={{ fontWeight: 500 }}>No entities matched.</div>
          {diag && (
            <div style={{ fontSize: 10, color: palette.gray.base, marginTop: 2 }}>
              {diag.total_entities_in_collection} entities in database
              {diag.available_risk_levels?.length > 0 &&
                ` · Levels: ${diag.available_risk_levels.join(', ')}`}
            </div>
          )}
        </div>
      );
    }
    return (
      <div style={{ marginTop: 4 }}>
        <div style={{ fontSize: 10, color: palette.gray.base, fontFamily: FONT, marginBottom: 3 }}>
          {data.count} entit{data.count === 1 ? 'y' : 'ies'} found
          {data.note && <span style={{ fontStyle: 'italic' }}> — {data.note}</span>}
        </div>
        {data.entities.slice(0, 8).map((e, i) => (
          <EntityCard key={e.entityId || i} entity={e} onAction={onAction} />
        ))}
        {data.entities.length > 8 && (
          <div style={{ fontSize: 10, color: palette.gray.base, fontFamily: FONT, paddingTop: 2 }}>
            +{data.entities.length - 8} more
          </div>
        )}
      </div>
    );
  }

  if (tool === 'search_investigations' && 'investigations' in data) {
    if (!data.investigations?.length) return null;
    return (
      <div style={{ marginTop: 4 }}>
        <div style={{ fontSize: 10, color: palette.gray.base, fontFamily: FONT, marginBottom: 3 }}>
          {data.count} investigation{data.count === 1 ? '' : 's'} found
        </div>
        {data.investigations.slice(0, 6).map((inv, i) => (
          <InvestigationRow key={inv.case_id || i} inv={inv} onAction={onAction} />
        ))}
      </div>
    );
  }

  if (tool === 'assess_entity_risk' && (data.risk_assessment || data.entity_id)) {
    return <RiskSummaryCard data={data} />;
  }

  return null;
}

// ─── Tool call indicator (updated with rich output + raw toggle) ──────────

function ToolCallIndicator({ tool, input, output, collapsed, onToggle, onAction }) {
  const [showRaw, setShowRaw] = useState(false);
  const richContent = !collapsed ? <RichToolOutput tool={tool} output={output} onAction={onAction} /> : null;
  const hasRich = richContent !== null;

  return (
    <div style={{
      margin: `${spacing[1]}px 0`,
      borderRadius: 6,
      border: `1px solid ${palette.blue.light2}`,
      borderLeft: `3px solid ${palette.blue.base}`,
      background: palette.blue.light3,
      fontSize: 11,
      fontFamily: FONT,
      overflow: 'hidden',
    }}>
      <div
        onClick={onToggle}
        style={{
          padding: '4px 8px',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span style={{ color: palette.blue.dark1, fontWeight: 600 }}>
          🔧 {tool}
        </span>
        <span style={{
          color: palette.blue.base, fontSize: 10,
          display: 'inline-flex', alignItems: 'center',
          transition: 'transform 0.15s',
          transform: collapsed ? 'rotate(0deg)' : 'rotate(180deg)',
        }}>▾</span>
      </div>
      {!collapsed && (
        <div style={{ padding: '4px 8px 6px', borderTop: `1px solid ${palette.blue.light2}` }}>
          {input && (
            <div style={{ marginBottom: 4 }}>
              <span style={{ fontWeight: 600, color: palette.gray.dark1 }}>Input: </span>
              <span style={{ color: palette.gray.dark2, wordBreak: 'break-word' }}>
                {typeof input === 'string' ? input : JSON.stringify(input)}
              </span>
            </div>
          )}

          {/* Rich rendering (default) or raw JSON */}
          {hasRich && !showRaw ? (
            richContent
          ) : output ? (
            <div>
              <span style={{ fontWeight: 600, color: palette.gray.dark1 }}>Output: </span>
              <span style={{ color: palette.gray.dark2, wordBreak: 'break-word' }}>
                {typeof output === 'string'
                  ? (output.length > 500 ? output.slice(0, 500) + '...' : output)
                  : JSON.stringify(output).slice(0, 500)}
              </span>
            </div>
          ) : null}

          {output && hasRich && (
            <button
              onClick={(e) => { e.stopPropagation(); setShowRaw(r => !r); }}
              style={{
                marginTop: 4, background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 10, color: palette.blue.base, fontFamily: FONT, padding: 0,
              }}
            >
              {showRaw ? 'Show formatted' : 'Show raw JSON'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Streaming status indicator ───────────────────────────────────────────

function StreamingStatus({ activeTool }) {
  const label = activeTool
    ? (TOOL_STATUS_LABELS[activeTool] || activeTool)
    : 'Thinking';

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6, padding: 4,
      fontSize: 11, color: palette.gray.dark1, fontFamily: FONT,
    }}>
      <span className="chat-spinner" style={{
        display: 'inline-block', width: 12, height: 12,
        border: `2px solid ${palette.gray.light2}`,
        borderTopColor: palette.green.dark1,
        borderRadius: '50%',
        animation: 'chat-spin 0.7s linear infinite',
      }} />
      <span>{label}…</span>
    </div>
  );
}

const spinnerKeyframes = `
@keyframes chat-spin {
  to { transform: rotate(360deg); }
}
@keyframes bubble-pulse {
  0%, 100% { box-shadow: 0 4px 16px rgba(0,0,0,0.2), 0 0 0 0 rgba(0,98,68,0.4); }
  50% { box-shadow: 0 4px 16px rgba(0,0,0,0.2), 0 0 0 4px rgba(0,98,68,0); }
}
`;

// ─── Follow-up suggestions ────────────────────────────────────────────────

function FollowUpSuggestions({ suggestions, onSelect }) {
  if (!suggestions?.length) return null;
  return (
    <div style={{
      display: 'flex', flexWrap: 'wrap', gap: 4,
      padding: `${spacing[1]}px 0`,
    }}>
      {suggestions.map((s) => (
        <button
          key={s}
          onClick={() => onSelect(s)}
          style={{
            background: palette.gray.light3,
            border: `1px solid ${palette.gray.light2}`,
            borderRadius: 12,
            padding: '3px 10px',
            fontSize: 11,
            fontFamily: FONT,
            color: palette.blue.dark1,
            cursor: 'pointer',
            transition: 'background 0.12s, border-color 0.12s',
            whiteSpace: 'nowrap',
            maxWidth: '100%',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = palette.blue.light3; e.currentTarget.style.borderColor = palette.blue.light2; }}
          onMouseLeave={e => { e.currentTarget.style.background = palette.gray.light3; e.currentTarget.style.borderColor = palette.gray.light2; }}
        >
          {s}
        </button>
      ))}
    </div>
  );
}

// ─── Inline artifact reference card ────────────────────────────────────────

function ArtifactReferenceCard({ artifact, onClick, isActive }) {
  const [hovered, setHovered] = useState(false);
  const meta = getArtifactMeta(artifact.type);
  const isStreaming = artifact.status === 'streaming';

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        width: '100%', textAlign: 'left',
        padding: '8px 10px', margin: `${spacing[1]}px 0`,
        borderRadius: 8,
        border: `1px solid ${isActive ? palette.green.dark1 : hovered ? palette.green.light1 : palette.gray.light2}`,
        background: isActive ? palette.green.light3 : hovered ? '#f8faf8' : '#fff',
        cursor: 'pointer',
        fontFamily: FONT, fontSize: 12,
        transition: 'all 0.15s ease',
        boxShadow: isActive ? `0 0 0 1px ${palette.green.dark1}` : '0 1px 3px rgba(0,0,0,0.04)',
      }}
    >
      <div style={{
        width: 32, height: 32, borderRadius: 6,
        background: `${meta.color}14`,
        border: `1px solid ${meta.color}30`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 16, flexShrink: 0,
      }}>
        {meta.icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontWeight: 600, color: palette.gray.dark3,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {artifact.title}
        </div>
        <div style={{ fontSize: 10, color: palette.gray.dark1, marginTop: 1 }}>
          {meta.label}
          {isStreaming && (
            <span style={{ color: palette.green.dark1, marginLeft: 6 }}>
              generating...
            </span>
          )}
          {artifact.status === 'truncated' && (
            <span style={{ color: '#b45309', marginLeft: 6 }}>
              truncated
            </span>
          )}
          {artifact.status === 'error' && (
            <span style={{ color: '#991b1b', marginLeft: 6 }}>
              failed
            </span>
          )}
        </div>
      </div>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
        stroke={isActive ? palette.green.dark1 : palette.gray.base}
        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        style={{ flexShrink: 0 }}>
        <polyline points="9 18 15 12 9 6" />
      </svg>
    </button>
  );
}

// ─── Thread picker dropdown ───────────────────────────────────────────────

function ThreadPicker({ currentThreadId, onSelect, onNew }) {
  const [open, setOpen] = useState(false);
  const [threads, setThreads] = useState([]);
  const ref = useRef(null);

  useEffect(() => {
    if (open) setThreads(loadThreads());
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        title="Conversation history"
        style={{
          background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 4,
          color: '#fff', cursor: 'pointer', padding: '2px 8px', fontSize: 11,
          fontFamily: FONT, display: 'flex', alignItems: 'center', gap: 3,
        }}
      >
        <span style={{ fontSize: 13 }}>☰</span> History
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: '100%', right: 0, marginTop: 4,
          width: 260, maxHeight: 300, overflowY: 'auto',
          background: '#fff', borderRadius: 8,
          border: `1px solid ${palette.gray.light2}`,
          boxShadow: '0 4px 16px rgba(0,0,0,0.06), 0 8px 24px rgba(0,0,0,0.1)',
          zIndex: 10,
        }}>
          <div style={{
            padding: '8px 10px', borderBottom: `1px solid ${palette.gray.light3}`,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <span style={{ fontSize: 12, fontWeight: 600, fontFamily: FONT, color: palette.gray.dark2 }}>
              Recent Conversations
            </span>
            <button onClick={() => { onNew(); setOpen(false); }} style={{
              background: palette.green.dark1, color: '#fff', border: 'none', borderRadius: 4,
              fontSize: 10, padding: '2px 8px', cursor: 'pointer', fontFamily: FONT,
            }}>+ New</button>
          </div>

          {threads.length === 0 ? (
            <div style={{ padding: 12, fontSize: 11, color: palette.gray.base, fontFamily: FONT, textAlign: 'center' }}>
              No previous conversations
            </div>
          ) : (
            threads.map(t => (
              <div
                key={t.threadId}
                onClick={() => { onSelect(t.threadId); setOpen(false); }}
                style={{
                  padding: '8px 10px', cursor: 'pointer',
                  borderBottom: `1px solid ${palette.gray.light3}`,
                  background: t.threadId === currentThreadId ? palette.blue.light3 : 'transparent',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={e => { if (t.threadId !== currentThreadId) e.currentTarget.style.background = palette.blue.light3; }}
                onMouseLeave={e => { if (t.threadId !== currentThreadId) e.currentTarget.style.background = 'transparent'; }}
              >
                <div style={{
                  fontSize: 12, fontFamily: FONT, fontWeight: 500,
                  color: palette.gray.dark2, overflow: 'hidden',
                  textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {t.title}
                </div>
                <div style={{ fontSize: 10, color: palette.gray.base, fontFamily: FONT, marginTop: 1 }}>
                  {new Date(t.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  {t.threadId === currentThreadId && ' · current'}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ─── Page context banner ──────────────────────────────────────────────────

function PageContextBanner({ context }) {
  if (!context) return null;
  const label = context.type === 'investigation'
    ? `Viewing case ${context.caseId}${context.entityId ? ` · Entity ${context.entityId}` : ''}`
    : context.type === 'entity'
      ? `Viewing entity ${context.entityId}${context.entityName ? ` (${context.entityName})` : ''}`
      : null;
  if (!label) return null;

  return (
    <div style={{
      padding: '4px 8px', fontSize: 10, fontFamily: FONT,
      background: palette.blue.light3, color: palette.blue.dark1,
      borderBottom: `1px solid ${palette.blue.light2}`,
      display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0,
    }}>
      <span style={{ fontSize: 12 }}>📌</span>
      {label}
    </div>
  );
}

// ─── Message bubble ───────────────────────────────────────────────────────

function MessageBubble({ msg, onAction, isLast, streaming, artifacts, activeArtifactId, onArtifactClick }) {
  const [toolCollapsed, setToolCollapsed] = useState({});

  if (msg.role === 'user') {
    return (
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: spacing[1] }}>
        <div style={{
          maxWidth: '85%',
          padding: `${spacing[1]}px ${spacing[2]}px`,
          borderRadius: '12px 12px 4px 12px',
          background: palette.green.dark1,
          color: '#fff',
          fontSize: 13,
          fontFamily: FONT,
          lineHeight: 1.5,
          whiteSpace: 'pre-wrap',
        }}>
          {msg.content}
        </div>
      </div>
    );
  }

  const { clean: displayContent, suggestions: llmSuggestions } = extractSuggestions(msg.content);
  const followUps = isLast && !streaming
    ? (llmSuggestions.length > 0 ? llmSuggestions : deriveFollowUps(msg.toolCalls))
    : [];
  const msgArtifacts = artifacts?.filter(a => msg.artifactIds?.includes(a.identifier)) || [];

  return (
    <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: spacing[1], gap: 8 }}>
      <div style={{
        width: 26, height: 26, borderRadius: 6, flexShrink: 0, marginTop: 2,
        background: `linear-gradient(135deg, ${palette.green.dark2}, ${palette.green.dark1})`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
        </svg>
      </div>
      <div style={{ maxWidth: '88%', minWidth: 0 }}>
        {msg.toolCalls?.map((tc, i) => (
          <ToolCallIndicator
            key={i}
            tool={tc.tool}
            input={tc.input}
            output={tc.output}
            collapsed={toolCollapsed[i] !== false}
            onToggle={() => setToolCollapsed(prev => ({ ...prev, [i]: prev[i] === false ? true : false }))}
            onAction={onAction}
          />
        ))}
        {msg.content && (
          <div className="chat-md" style={{
            padding: `${spacing[1]}px ${spacing[2]}px`,
            borderRadius: '12px 12px 12px 4px',
            background: '#fff',
            color: palette.gray.dark2,
            fontSize: 13,
            fontFamily: FONT,
            lineHeight: 1.6,
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
            border: `1px solid ${palette.gray.light2}`,
          }}>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {displayContent}
            </ReactMarkdown>
          </div>
        )}
        {msgArtifacts.map(a => (
          <ArtifactReferenceCard
            key={a.identifier}
            artifact={a}
            isActive={a.identifier === activeArtifactId}
            onClick={() => onArtifactClick?.(a.identifier)}
          />
        ))}
        <FollowUpSuggestions suggestions={followUps} onSelect={onAction} />
      </div>
    </div>
  );
}

// ─── Categorised empty-state prompts ──────────────────────────────────────

const PROMPT_CATEGORIES = [
  {
    label: 'Entity Research',
    icon: '👤',
    prompts: [
      'Which entities have the highest risk scores and why?',
      'Find entities similar to a high-risk entity and compare their profiles',
    ],
  },
  {
    label: 'Fund Flow & Patterns',
    icon: '💸',
    prompts: [
      'Trace the money trail for the most recently escalated entity and flag suspicious hops',
      'Are there any entities showing structuring or velocity spike patterns?',
    ],
  },
  {
    label: 'Network & Watchlists',
    icon: '🔗',
    prompts: [
      'Map the network around a recently flagged entity and check for sanctions hits',
      'Which entities are within 2 hops of a watchlist match?',
    ],
  },
  {
    label: 'Investigations',
    icon: '📋',
    prompts: [
      'Summarize investigations that resulted in SAR filings',
      "What's the status and evidence for the most recent escalated case?",
    ],
  },
  {
    label: 'Reports & Diagrams',
    icon: '📄',
    prompts: [
      'Generate a SAR narrative report for the highest-risk entity',
      'Create a flowchart showing the layering money laundering typology',
    ],
  },
];

// ─── Main component ───────────────────────────────────────────────────────

export default function ChatBubble({ embedded = false, pageContext = null, initialPrompt = null }) {
  const [open, setOpen] = useState(embedded);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [threadId, setThreadId] = useState(null);
  const [activeTool, setActiveTool] = useState(null);
  const [artifacts, setArtifacts] = useState([]);
  const [activeArtifactId, setActiveArtifactId] = useState(null);
  const [splitPct, setSplitPct] = useState(55); // chat panel percentage
  const [artifactRetries, setArtifactRetries] = useState({});
  const inputRef = useRef(null);
  const activeThreadRef = useRef(null);
  const containerRef = useRef(null);
  const splitPctRef = useRef(splitPct);
  const isDraggingRef = useRef(false);
  const dragListenersRef = useRef({ onMove: null, onUp: null });
  const { scrollRef, contentRef, scrollToBottom, isAtBottom } = useStickToBottom({ initial: false });

  const activeArtifact = useMemo(
    () => artifacts.find(a => a.identifier === activeArtifactId) || null,
    [artifacts, activeArtifactId]
  );

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
  }, [open]);

  const sendMessage = useCallback(async (text) => {
    text = (text || '').trim();
    if (!text || streaming) return;

    setInput('');
    const userMsg = { role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    setStreaming(true);
    setActiveTool(null);
    scrollToBottom();

    let assistantContent = '';
    const toolCalls = [];
    let currentToolIdx = -1;
    const msgArtifactIds = [];

    const messageWithContext = pageContext
      ? `[Context: ${pageContext.type === 'investigation'
          ? `Currently viewing investigation ${pageContext.caseId}${pageContext.entityId ? ` for entity ${pageContext.entityId}` : ''}`
          : `Currently viewing entity ${pageContext.entityId}${pageContext.entityName ? ` (${pageContext.entityName})` : ''}`
        }]\n${text}`
      : text;

    setMessages(prev => [...prev, { role: 'assistant', content: '', toolCalls: [], artifactIds: [] }]);

    const updateLastMsg = () => {
      setMessages(prev => {
        const msgs = [...prev];
        msgs[msgs.length - 1] = {
          role: 'assistant',
          content: assistantContent,
          toolCalls: [...toolCalls],
          artifactIds: [...msgArtifactIds],
        };
        return msgs;
      });
    };

    try {
      await sendChatMessage(messageWithContext, threadId, (event) => {
        if (event.type === 'thread_id') {
          setThreadId(event.thread_id);
          upsertThread(event.thread_id, text);
        } else if (event.type === 'token') {
          assistantContent += event.content;
          updateLastMsg();
          setActiveTool(null);
        } else if (event.type === 'tool_call') {
          currentToolIdx = toolCalls.length;
          toolCalls.push({ tool: event.tool, input: event.input, output: null });
          setActiveTool(event.tool);
          updateLastMsg();
        } else if (event.type === 'tool_result') {
          if (currentToolIdx >= 0 && currentToolIdx < toolCalls.length) {
            toolCalls[currentToolIdx].output = event.output;
          }
          setActiveTool(null);
          updateLastMsg();

        } else if (event.type === 'artifact_start') {
          msgArtifactIds.push(event.identifier);
          setArtifacts(prev => [
            ...prev.filter(a => a.identifier !== event.identifier),
            {
              identifier: event.identifier,
              type: event.artifact_type,
              title: event.title,
              content: '',
              status: 'streaming',
            },
          ]);
          setActiveArtifactId(event.identifier);
          updateLastMsg();
        } else if (event.type === 'artifact_delta') {
          setArtifacts(prev => prev.map(a =>
            a.identifier === event.identifier
              ? { ...a, content: a.content + event.content }
              : a
          ));
        } else if (event.type === 'artifact_end') {
          setArtifacts(prev => prev.map(a =>
            a.identifier === event.identifier
              ? { ...a, status: event.truncated ? 'truncated' : 'complete' }
              : a
          ));

        } else if (event.type === 'error') {
          assistantContent += `\n⚠ Error: ${event.message}`;
          updateLastMsg();
          setArtifacts(prev => prev.map(a =>
            a.status === 'streaming' ? { ...a, status: 'error' } : a
          ));
        }
      });
    } catch (err) {
      setMessages(prev => {
        const msgs = [...prev];
        msgs[msgs.length - 1] = {
          role: 'assistant',
          content: assistantContent || `Error: ${err.message}`,
          toolCalls: [...toolCalls],
          artifactIds: [...msgArtifactIds],
        };
        return msgs;
      });
      setArtifacts(prev => prev.map(a =>
        a.status === 'streaming' ? { ...a, status: 'error' } : a
      ));
    } finally {
      setStreaming(false);
      setActiveTool(null);
    }
  }, [streaming, threadId, scrollToBottom, pageContext]);

  // Handle external prompt injection from parent (e.g. capability cards)
  const lastPromptTs = useRef(null);
  useEffect(() => {
    if (initialPrompt?.text && initialPrompt.ts !== lastPromptTs.current && !streaming) {
      lastPromptTs.current = initialPrompt.ts;
      sendMessage(initialPrompt.text);
    }
  }, [initialPrompt, sendMessage, streaming]);

  const handleSend = useCallback(() => { sendMessage(input); }, [input, sendMessage]);

  const handleAction = useCallback((text) => {
    if (streaming) return;
    setInput(text);
    setTimeout(() => sendMessage(text), 0);
  }, [streaming, sendMessage]);

  const handleNewChat = useCallback(() => {
    activeThreadRef.current = null;
    setMessages([]);
    setThreadId(null);
    setActiveTool(null);
    setArtifacts([]);
    setActiveArtifactId(null);
    setArtifactRetries({});
  }, []);

  const handleSwitchThread = useCallback(async (tid) => {
    if (streaming) return;
    activeThreadRef.current = tid;
    setMessages([]);
    setThreadId(tid);
    setActiveTool(null);
    setArtifacts([]);
    setActiveArtifactId(null);
    setArtifactRetries({});

    try {
      const { messages: history } = await getChatHistory(tid);
      if (activeThreadRef.current !== tid) return; // user switched again
      if (history?.length) {
        const restoredArtifacts = [];
        const cleaned = history.map(msg => {
          if (msg.role === 'assistant' && msg.content) {
            // Extract and strip suggestion tags
            const { clean: noSuggestions } = extractSuggestions(msg.content);
            // Extract and strip artifact blocks, reconstruct artifact objects
            const { clean: finalContent, artifacts: msgArtifacts } = extractArtifactsFromContent(noSuggestions);
            const artifactIds = msgArtifacts.map(a => a.identifier);
            restoredArtifacts.push(...msgArtifacts);
            return { ...msg, content: finalContent, artifactIds };
          }
          return msg;
        });
        setMessages(cleaned);
        if (restoredArtifacts.length > 0) {
          setArtifacts(restoredArtifacts);
        }
      }
    } catch {
      // History unavailable — user can still send new messages in this thread
    }
  }, [streaming]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  useEffect(() => { splitPctRef.current = splitPct; }, [splitPct]);

  const handleDragStart = useCallback((e) => {
    e.preventDefault();
    isDraggingRef.current = true;
    const startX = e.clientX;
    const startPct = splitPctRef.current;
    const container = containerRef.current;
    if (!container) return;
    const containerWidth = container.offsetWidth;

    // Prevent text selection and iframe event stealing during drag
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';
    const iframes = container.querySelectorAll('iframe');
    iframes.forEach(f => { f.style.pointerEvents = 'none'; });

    const onMove = (moveEvt) => {
      if (!isDraggingRef.current) return;
      const delta = moveEvt.clientX - startX;
      // Account for the 6px handle: usable width = containerWidth - 6
      const usable = containerWidth - 6;
      const newPct = Math.min(80, Math.max(25, startPct + (delta / usable) * 100));
      setSplitPct(newPct);
    };
    const onUp = () => {
      isDraggingRef.current = false;
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
      iframes.forEach(f => { f.style.pointerEvents = ''; });
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    dragListenersRef.current = { onMove, onUp };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, []);

  // Cleanup drag listeners on unmount
  useEffect(() => {
    return () => {
      if (isDraggingRef.current) {
        isDraggingRef.current = false;
        document.body.style.userSelect = '';
        document.body.style.cursor = '';
        const container = containerRef.current;
        if (container) container.querySelectorAll('iframe').forEach(f => { f.style.pointerEvents = ''; });
      }
      const { onMove, onUp } = dragListenersRef.current;
      if (onMove) document.removeEventListener('mousemove', onMove);
      if (onUp) document.removeEventListener('mouseup', onUp);
    };
  }, []);

  // Refs for artifact auto-correction to keep the callback stable
  const streamingRef = useRef(streaming);
  useEffect(() => { streamingRef.current = streaming; }, [streaming]);
  const artifactRetriesRef = useRef(artifactRetries);
  useEffect(() => { artifactRetriesRef.current = artifactRetries; }, [artifactRetries]);
  const artifactsRef = useRef(artifacts);
  useEffect(() => { artifactsRef.current = artifacts; }, [artifacts]);
  const sendMessageRef = useRef(sendMessage);
  useEffect(() => { sendMessageRef.current = sendMessage; }, [sendMessage]);

  // Auto-correct artifact errors by sending the error back to the LLM
  // Stable callback (empty deps) — reads from refs to avoid recreation cascades
  const handleArtifactError = useCallback((artifactId, errorMessage) => {
    if (streamingRef.current) return;

    const currentCount = artifactRetriesRef.current[artifactId] || 0;
    if (currentCount >= MAX_ARTIFACT_RETRIES) return;

    setArtifactRetries(prev => ({ ...prev, [artifactId]: (prev[artifactId] || 0) + 1 }));

    const artifact = artifactsRef.current.find(a => a.identifier === artifactId);
    const artifactType = artifact?.type || 'unknown';
    const artifactTitle = artifact?.title || artifactId;
    const safeError = String(errorMessage).slice(0, 500).replace(/[\u0000-\u001F]/g, ' ');

    const correctionPrompt =
      `The ${artifactType === 'application/vnd.mermaid' ? 'Mermaid diagram' : 'HTML artifact'} ` +
      `"${artifactTitle}" (identifier: ${artifactId}) failed to render with this error:\n\n` +
      `${safeError}\n\n` +
      `Please fix the syntax error and regenerate the artifact using the same identifier "${artifactId}". ` +
      `This is auto-correction attempt ${currentCount + 1}/${MAX_ARTIFACT_RETRIES}.`;
    sendMessageRef.current(correctionPrompt);
  }, []);

  if (!open && !embedded) {
    return (
      <>
        <style>{spinnerKeyframes}</style>
        <div
          onClick={() => setOpen(true)}
          style={{
            position: 'fixed', bottom: 24, right: 24,
            width: 60, height: 60, borderRadius: '50%',
            background: `linear-gradient(135deg, ${palette.green.dark1} 0%, ${palette.green.dark2} 100%)`,
            color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
            zIndex: 1000, transition: 'transform 0.15s ease',
            animation: 'bubble-pulse 3s ease-in-out infinite',
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.1)'; }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
          title="ThreatSight Copilot"
        >
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2a7 7 0 0 1 7 7c0 3-1.5 5-3 6.5V18a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1v-2.5C6.5 14 5 12 5 9a7 7 0 0 1 7-7z"/>
            <line x1="9" y1="22" x2="15" y2="22"/>
            <line x1="10" y1="19" x2="14" y2="19"/>
          </svg>
        </div>
      </>
    );
  }

  const hasArtifact = !!activeArtifact;

  const chatPanel = (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      width: '100%',
      minWidth: 0,
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: `10px ${spacing[3]}px`,
        background: `linear-gradient(135deg, ${palette.green.dark2} 0%, ${palette.green.dark1} 100%)`,
        color: '#fff',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 30, height: 30, borderRadius: 8,
            background: 'rgba(255,255,255,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, flexShrink: 0,
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
            </svg>
          </div>
          <div>
            <Subtitle style={{ fontFamily: FONT, color: '#fff', fontSize: 14, margin: 0, lineHeight: 1.2 }}>
              ThreatSight Copilot
            </Subtitle>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', fontFamily: FONT, display: 'flex', alignItems: 'center', gap: 4, marginTop: 1 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#4caf50', display: 'inline-block' }} />
              15 tools available
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <ThreadPicker
            currentThreadId={threadId}
            onSelect={handleSwitchThread}
            onNew={handleNewChat}
          />
          <button
            onClick={handleNewChat}
            title="New conversation"
            style={{
              background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 4,
              color: '#fff', cursor: 'pointer', padding: '2px 8px', fontSize: 11,
              fontFamily: FONT,
            }}
          >
            New
          </button>
          {!embedded && (
            <button
              onClick={() => setOpen(false)}
              style={{
                background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 4,
                color: '#fff', cursor: 'pointer', padding: '2px 8px', fontSize: 16,
              }}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Page context banner */}
      <PageContextBanner context={pageContext} />

      {/* Messages area */}
      <div
        ref={scrollRef}
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          background: '#fafbfc',
          position: 'relative',
        }}
      >
        <div
          ref={contentRef}
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: messages.length === 0 ? 'flex-start' : 'flex-end',
            minHeight: '100%',
            padding: spacing[2],
          }}
        >
          {messages.length === 0 && (
            <div style={{ padding: `${spacing[3]}px ${spacing[1]}px`, maxWidth: 420, margin: '0 auto' }}>
              <div style={{ textAlign: 'center', marginBottom: spacing[3] }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 12, margin: '0 auto 8px',
                  background: `linear-gradient(135deg, ${palette.green.light3}, ${palette.green.light2}40)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: `1px solid ${palette.green.light1}`,
                }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={palette.green.dark1} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
                  </svg>
                </div>
                <Body style={{ fontFamily: FONT, color: palette.gray.dark2, fontSize: 14, fontWeight: 600, margin: 0 }}>
                  ThreatSight Copilot
                </Body>
                <Body style={{ fontFamily: FONT, color: palette.gray.dark1, fontSize: 12, marginTop: 4 }}>
                  Trace fund flows, assess risk, screen watchlists, analyze patterns, and generate reports.
                </Body>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {PROMPT_CATEGORIES.map(cat => (
                  <div key={cat.label} style={{
                    borderRadius: 10, padding: '10px 12px',
                    background: '#fff', border: `1px solid ${palette.gray.light2}`,
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                  }}>
                    <div style={{
                      fontSize: 11, fontWeight: 600, fontFamily: FONT, color: palette.gray.dark2,
                      marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6,
                    }}>
                      <span style={{ fontSize: 20, opacity: 0.85 }}>{cat.icon}</span> {cat.label}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {cat.prompts.map(q => (
                        <button
                          key={q}
                          onClick={() => handleAction(q)}
                          style={{
                            background: palette.gray.light3,
                            border: `1px solid ${palette.gray.light2}`,
                            borderRadius: 8, padding: '7px 10px', fontSize: 12, fontFamily: FONT,
                            color: palette.gray.dark2, cursor: 'pointer', textAlign: 'left',
                            transition: 'all 0.15s ease',
                            display: 'flex', alignItems: 'center', gap: 6,
                          }}
                          onMouseEnter={e => { e.currentTarget.style.background = palette.green.light3; e.currentTarget.style.borderColor = palette.green.light1; e.currentTarget.style.color = palette.green.dark2; }}
                          onMouseLeave={e => { e.currentTarget.style.background = palette.gray.light3; e.currentTarget.style.borderColor = palette.gray.light2; e.currentTarget.style.color = palette.gray.dark2; }}
                        >
                          <span style={{ color: palette.gray.base, fontSize: 11, flexShrink: 0 }}>&#8594;</span>
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {messages.map((msg, i) => (
            <MessageBubble
              key={i}
              msg={msg}
              onAction={handleAction}
              isLast={i === messages.length - 1}
              streaming={streaming}
              artifacts={artifacts}
              activeArtifactId={activeArtifactId}
              onArtifactClick={(id) => setActiveArtifactId(prev => prev === id ? null : id)}
            />
          ))}
          {streaming && (
            <StreamingStatus activeTool={activeTool} />
          )}
        </div>
        {!isAtBottom && (
          <button
            onClick={() => scrollToBottom()}
            style={{
              position: 'sticky', bottom: 8, left: '50%', transform: 'translateX(-50%)',
              display: 'block', margin: '0 auto',
              width: 32, height: 32, borderRadius: '50%',
              border: `1px solid ${palette.gray.light2}`,
              background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
              cursor: 'pointer', fontSize: 16, lineHeight: '32px', textAlign: 'center',
              color: palette.gray.dark1,
            }}
            title="Scroll to bottom"
          >
            ↓
          </button>
        )}
      </div>

      {/* Input area */}
      <div style={{
        padding: '10px 12px',
        borderTop: `1px solid ${palette.gray.light2}`,
        background: '#fff',
        flexShrink: 0,
      }}>
        <div className="chat-input-wrap" style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '6px 6px 6px 14px',
          borderRadius: 10,
          border: `1px solid ${palette.gray.light2}`,
          background: '#fafbfc',
          transition: 'border-color 0.15s, box-shadow 0.15s',
        }}>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about entities, fund flows, risk, investigations..."
            disabled={streaming}
            style={{
              flex: 1,
              padding: '6px 0',
              border: 'none',
              background: 'transparent',
              fontSize: 13,
              fontFamily: FONT,
              outline: 'none',
              color: palette.gray.dark3,
            }}
          />
          <button
            onClick={handleSend}
            disabled={streaming || !input.trim()}
            style={{
              width: 34, height: 34, borderRadius: 8, border: 'none',
              background: streaming || !input.trim() ? palette.gray.light2 : palette.green.dark1,
              color: '#fff', cursor: streaming || !input.trim() ? 'default' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background 0.15s', flexShrink: 0,
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div ref={containerRef} style={{
      ...(embedded
        ? { width: '100%', height: '100%' }
        : { position: 'fixed', bottom: 24, right: 24, width: activeArtifact ? 860 : 420, height: activeArtifact ? 620 : 560, zIndex: 1000, boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }
      ),
      borderRadius: 12,
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'row',
      border: `1px solid ${palette.gray.light2}`,
      background: '#fff',
      transition: hasArtifact ? 'none' : 'width 0.2s ease, height 0.2s ease',
    }}>
      <style>{markdownStyles}{spinnerKeyframes}</style>

      <div style={{
        flex: hasArtifact ? `0 0 calc(${splitPct}% - 3px)` : '1 1 100%',
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
      }}>
        {chatPanel}
      </div>

      {hasArtifact && (
        <>
          {/* Drag handle */}
          <div
            onMouseDown={handleDragStart}
            style={{
              width: 6, cursor: 'col-resize', flexShrink: 0,
              background: isDraggingRef.current ? palette.green.light1 : palette.gray.light2,
              position: 'relative',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = palette.green.light1; }}
            onMouseLeave={e => { if (!isDraggingRef.current) e.currentTarget.style.background = palette.gray.light2; }}
          >
            <div style={{
              width: 2, height: 24, borderRadius: 1,
              background: palette.gray.base, opacity: 0.5,
            }} />
          </div>
          <div style={{
            flex: `0 0 calc(${100 - splitPct}% - 3px)`,
            minWidth: 0,
            height: '100%',
            overflow: 'hidden',
          }}>
            <ArtifactPanel
              artifact={activeArtifact}
              onClose={() => setActiveArtifactId(null)}
              onError={handleArtifactError}
              retryCount={activeArtifact ? (artifactRetries[activeArtifact.identifier] || 0) : 0}
              maxRetries={MAX_ARTIFACT_RETRIES}
            />
          </div>
        </>
      )}
    </div>
  );
}
