"use client";

import { useState, useMemo } from 'react';
import Icon from '@leafygreen-ui/icon';
import IconButton from '@leafygreen-ui/icon-button';
import { Body } from '@leafygreen-ui/typography';
import { palette } from '@leafygreen-ui/palette';
import { spacing } from '@leafygreen-ui/tokens';

const FONT = "'Euclid Circular A', sans-serif";

const TOOL_TO_MONGO_OP = {
  get_entity_profile: {
    op: 'db.entities.findOne()',
    desc: 'Fetching entity profile and KYC data from the entities collection',
    feature: 'Document Model',
  },
  query_entity_transactions: {
    op: 'db.transactionsv2.aggregate()',
    desc: 'Aggregation pipeline for transaction history, risk stats, and red-flag tags',
    feature: 'Aggregation Pipeline',
  },
  analyze_entity_network: {
    op: '$graphLookup on relationships',
    desc: 'Multi-hop graph traversal discovering connected entities and shell structures',
    feature: '$graphLookup',
  },
  screen_watchlists: {
    op: 'db.entities.find({ watchlist })',
    desc: 'Querying watchlist matches and sanctions/PEP screening results',
    feature: 'Document Model',
  },
  search_typologies: {
    op: 'Atlas Search on typology_library',
    desc: 'RAG search over 12 AML typologies with red-flag pattern matching',
    feature: 'Atlas Search RAG',
  },
  search_compliance_policies: {
    op: 'Atlas Search on compliance_policies',
    desc: 'RAG search over FinCEN SAR filing requirements and regulatory guidance',
    feature: 'Atlas Search RAG',
  },
  compute_network_metrics: {
    op: 'db.relationships.aggregate()',
    desc: 'Computing degree centrality and network risk scores via aggregation',
    feature: 'Aggregation Pipeline',
  },
};

const AGENT_MONGO_OPS = {
  triage: { op: 'MongoDBSaver checkpoint', feature: 'MongoDBSaver', desc: 'Checkpointing triage decision and risk score to durable state' },
  data_gathering: { op: 'MongoDBSaver checkpoint', feature: 'MongoDBSaver', desc: 'Saving pre-gather state before parallel fan-out' },
  assemble_case: { op: 'MongoDBSaver checkpoint', feature: 'MongoDBSaver', desc: 'Persisting assembled 360° case file to graph state' },
  typology: { op: 'MongoDBSaver checkpoint', feature: 'MongoDBSaver', desc: 'Saving typology classification result' },
  narrative: { op: 'MongoDBSaver checkpoint', feature: 'MongoDBSaver', desc: 'Persisting generated SAR narrative' },
  validation: { op: 'MongoDBSaver checkpoint', feature: 'MongoDBSaver', desc: 'Checkpointing validation result and routing decision' },
  human_review: { op: 'MongoDBSaver interrupt()', feature: 'MongoDBSaver', desc: 'Durable pipeline pause — full state persisted for resume' },
  finalize: { op: 'db.investigations.insertOne()', feature: 'Document Model', desc: 'Persisting complete investigation as a single rich document' },
};

const FEATURE_COLORS = {
  'MongoDBSaver': { bg: palette.purple.light3, fg: palette.purple.dark2, border: palette.purple.light2 },
  '$graphLookup': { bg: palette.blue.light3, fg: palette.blue.dark1, border: palette.blue.light2 },
  'Atlas Search RAG': { bg: palette.yellow.light3, fg: palette.yellow.dark2, border: palette.yellow.light2 },
  'Aggregation Pipeline': { bg: '#e8f5e9', fg: palette.green.dark2, border: palette.green.light1 },
  'Document Model': { bg: palette.green.light3, fg: palette.green.dark2, border: palette.green.light1 },
};

function FeatureBadge({ feature }) {
  const colors = FEATURE_COLORS[feature] || { bg: palette.gray.light3, fg: palette.gray.dark1, border: palette.gray.light2 };
  return (
    <span style={{
      fontSize: 9, fontFamily: "'Source Code Pro', monospace", fontWeight: 600,
      padding: '2px 6px', borderRadius: 3,
      background: colors.bg, color: colors.fg, border: `1px solid ${colors.border}`,
      whiteSpace: 'nowrap',
    }}>
      {feature}
    </span>
  );
}

export default function InvestigationInsightsPanel({ events = [], running = false }) {
  const [isOpen, setIsOpen] = useState(false);

  const operations = useMemo(() => {
    const ops = [];
    for (const evt of events) {
      if (evt.type === 'agent_start' && AGENT_MONGO_OPS[evt.agent]) {
        const info = AGENT_MONGO_OPS[evt.agent];
        ops.push({
          timestamp: evt.timestamp,
          type: 'checkpoint',
          label: info.op,
          desc: info.desc,
          feature: info.feature,
          agent: evt.agent,
        });
      }
      if (evt.type === 'tool_start' && TOOL_TO_MONGO_OP[evt.tool]) {
        const info = TOOL_TO_MONGO_OP[evt.tool];
        ops.push({
          timestamp: evt.timestamp,
          type: 'query',
          label: info.op,
          desc: info.desc,
          feature: info.feature,
          agent: evt.agent,
          tool: evt.tool,
        });
      }
      if (evt.type === 'tool_end' && TOOL_TO_MONGO_OP[evt.tool]) {
        ops.push({
          timestamp: evt.timestamp,
          type: 'query_complete',
          label: `${TOOL_TO_MONGO_OP[evt.tool].op} ✓`,
          desc: 'Query completed',
          feature: TOOL_TO_MONGO_OP[evt.tool].feature,
          agent: evt.agent,
          tool: evt.tool,
        });
      }
    }
    return ops;
  }, [events]);

  const summary = useMemo(() => {
    const checkpoints = operations.filter(o => o.type === 'checkpoint').length;
    const queries = operations.filter(o => o.type === 'query').length;
    const features = new Set(operations.map(o => o.feature));
    return { checkpoints, queries, features: [...features] };
  }, [operations]);

  if (events.length === 0) return null;

  return (
    <div style={{
      position: 'relative',
      marginTop: spacing[2],
      borderRadius: 8,
      overflow: 'hidden',
      border: `1px solid ${palette.gray.light2}`,
      background: '#1a1a2e',
      fontFamily: FONT,
    }}>
      {/* Header */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '8px 14px', cursor: 'pointer',
          background: '#1a1a2e',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Icon glyph="Sparkle" size={16} fill={palette.green.light1} />
          <span style={{ fontSize: 12, fontWeight: 600, color: palette.green.light1, letterSpacing: '0.5px' }}>
            MongoDB Operations
          </span>
          <span style={{
            fontSize: 10, padding: '1px 6px', borderRadius: 8,
            background: palette.green.dark2, color: palette.green.light2,
          }}>
            {operations.length}
          </span>
          {running && (
            <span style={{
              fontSize: 10, color: palette.blue.light1,
              animation: 'mdb-pulse 1.5s ease-in-out infinite',
            }}>
              ● live
            </span>
          )}
        </div>
        <span style={{ fontSize: 10, color: palette.gray.light1, transition: 'transform 0.15s', transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>
          ▼
        </span>
      </div>

      {/* Content */}
      {isOpen && (
        <div style={{ padding: '0 14px 12px' }}>
          {/* MongoDB Advantage summary */}
          <div style={{
            padding: '8px 12px', borderRadius: 6, marginBottom: spacing[2],
            background: `${palette.green.dark2}22`,
            border: `1px solid ${palette.green.dark2}44`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <Icon glyph="Sparkle" size={12} fill={palette.green.light2} />
              <span style={{ fontSize: 11, fontWeight: 600, color: palette.green.light2 }}>
                MongoDB Advantage
              </span>
            </div>
            <Body style={{ fontSize: '11px', color: palette.green.light1, lineHeight: 1.5 }}>
              This investigation used: {summary.checkpoints} MongoDBSaver checkpoint{summary.checkpoints !== 1 ? 's' : ''},
              {' '}{summary.queries} database quer{summary.queries !== 1 ? 'ies' : 'y'}.
              {' '}Features: {summary.features.map((f, i) => (
                <span key={f}>
                  {i > 0 && ', '}
                  <FeatureBadge feature={f} />
                </span>
              ))}.
              {' '}Single database. Zero data movement.
            </Body>
          </div>

          {/* Operations feed */}
          <div style={{ maxHeight: 300, overflowY: 'auto' }}>
            {operations.map((op, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'flex-start', gap: 8,
                padding: '4px 0',
                borderBottom: i < operations.length - 1 ? `1px solid ${palette.gray.dark2}44` : 'none',
              }}>
                <span style={{
                  fontSize: 9, color: palette.gray.light1, fontFamily: "'Source Code Pro', monospace",
                  minWidth: 60, flexShrink: 0, marginTop: 2,
                  fontVariantNumeric: 'tabular-nums',
                }}>
                  {op.timestamp ? new Date(op.timestamp).toLocaleTimeString() : ''}
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <span style={{
                      fontSize: 11, fontFamily: "'Source Code Pro', monospace",
                      color: op.type === 'checkpoint' ? palette.purple.light1 : op.type === 'query_complete' ? palette.green.light1 : palette.blue.light1,
                      fontWeight: 500,
                    }}>
                      {op.label}
                    </span>
                    <FeatureBadge feature={op.feature} />
                  </div>
                  <div style={{ fontSize: 10, color: palette.gray.light1, marginTop: 1 }}>
                    {op.desc}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <style>{`
        @keyframes mdb-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  );
}
