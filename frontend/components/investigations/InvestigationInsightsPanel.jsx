"use client";

import { useState, useMemo } from 'react';
import Icon from '@leafygreen-ui/icon';
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

const TABS = [
  { id: 'operations', label: 'Operations Feed' },
  { id: 'checkpoints', label: 'Checkpoints' },
  { id: 'summary', label: 'Summary' },
];

export default function InvestigationInsightsPanel({ events = [], running = false, accumulatedEvidence }) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('operations');

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

  const checkpointData = useMemo(() => {
    const cps = [];
    if (accumulatedEvidence?.triage_decision) cps.push({ node: 'triage', label: 'Triage Decision', keys: Object.keys(accumulatedEvidence.triage_decision) });
    if (accumulatedEvidence?.gathered_data) cps.push({ node: 'data_gathering', label: 'Data Gathering (4 parallel)', keys: ['entity_profile', 'transactions', 'network', 'watchlist'] });
    if (accumulatedEvidence?.case_file) cps.push({ node: 'assemble_case', label: 'Case File Assembly', keys: Object.keys(accumulatedEvidence.case_file) });
    if (accumulatedEvidence?.typology) cps.push({ node: 'typology', label: 'Typology Classification', keys: Object.keys(accumulatedEvidence.typology) });
    if (accumulatedEvidence?.narrative) cps.push({ node: 'narrative', label: 'SAR Narrative', keys: Object.keys(accumulatedEvidence.narrative) });
    if (accumulatedEvidence?.validation_result) cps.push({ node: 'validation', label: 'Quality Validation', keys: Object.keys(accumulatedEvidence.validation_result) });
    return cps;
  }, [accumulatedEvidence]);

  if (events.length === 0) return null;

  return (
    <div style={{
      position: 'relative',
      marginTop: spacing[2],
      borderRadius: 8,
      overflow: 'hidden',
      border: `1px solid ${palette.gray.light2}`,
      background: '#fff',
      fontFamily: FONT,
    }}>
      {/* Header */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '8px 14px', cursor: 'pointer',
          background: palette.gray.light3,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Icon glyph="Sparkle" size={16} fill={palette.green.dark1} />
          <span style={{ fontSize: 12, fontWeight: 600, color: palette.gray.dark3, letterSpacing: '0.5px' }}>
            MongoDB Operations
          </span>
          <span style={{
            fontSize: 10, padding: '1px 6px', borderRadius: 8,
            background: palette.green.light3, color: palette.green.dark2,
            border: `1px solid ${palette.green.light1}`,
          }}>
            {operations.length}
          </span>
          {running && (
            <span style={{
              fontSize: 10, color: palette.blue.base,
              animation: 'mdb-pulse 1.5s ease-in-out infinite',
            }}>
              ● live
            </span>
          )}
        </div>
        <span style={{ fontSize: 10, color: palette.gray.dark1, transition: 'transform 0.15s', transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>
          ▼
        </span>
      </div>

      {/* Content */}
      {isOpen && (
        <div style={{ padding: '0 14px 12px' }}>
          {/* Tabs */}
          <div style={{
            display: 'flex', gap: 0, marginTop: spacing[2], marginBottom: spacing[2],
            borderBottom: `1px solid ${palette.gray.light2}`,
          }}>
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: '6px 14px',
                  fontSize: 11, fontWeight: activeTab === tab.id ? 600 : 400,
                  fontFamily: FONT,
                  color: activeTab === tab.id ? palette.green.dark2 : palette.gray.dark1,
                  background: 'transparent',
                  border: 'none',
                  borderBottom: activeTab === tab.id ? `2px solid ${palette.green.dark1}` : '2px solid transparent',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Operations Feed Tab */}
          {activeTab === 'operations' && (
            <div style={{ maxHeight: 300, overflowY: 'auto' }}>
              {operations.map((op, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'flex-start', gap: 8,
                  padding: '4px 0',
                  borderBottom: i < operations.length - 1 ? `1px solid ${palette.gray.light3}` : 'none',
                }}>
                  <span style={{
                    fontSize: 9, color: palette.gray.dark1, fontFamily: "'Source Code Pro', monospace",
                    minWidth: 60, flexShrink: 0, marginTop: 2,
                    fontVariantNumeric: 'tabular-nums',
                  }}>
                    {op.timestamp ? new Date(op.timestamp).toLocaleTimeString() : ''}
                  </span>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <span style={{
                        fontSize: 11, fontFamily: "'Source Code Pro', monospace",
                        color: op.type === 'checkpoint' ? palette.purple.dark2 : op.type === 'query_complete' ? palette.green.dark1 : palette.blue.dark1,
                        fontWeight: 500,
                      }}>
                        {op.label}
                      </span>
                      <FeatureBadge feature={op.feature} />
                    </div>
                    <div style={{ fontSize: 10, color: palette.gray.dark1, marginTop: 1 }}>
                      {op.desc}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Checkpoints Tab */}
          {activeTab === 'checkpoints' && (
            <div>
              {checkpointData.length === 0 ? (
                <Body style={{ fontSize: '12px', color: palette.gray.dark1, fontFamily: FONT, padding: spacing[2] }}>
                  No checkpoint data available yet. Checkpoints appear as agents complete their work.
                </Body>
              ) : (
                <>
                  <div style={{
                    display: 'flex', gap: spacing[2], marginBottom: spacing[2], flexWrap: 'wrap',
                  }}>
                    <div style={{ padding: '6px 12px', borderRadius: 6, background: palette.purple.light3, textAlign: 'center' }}>
                      <div style={{ fontSize: 18, fontWeight: 700, color: palette.purple.dark2, fontFamily: FONT }}>{checkpointData.length}</div>
                      <div style={{ fontSize: 9, color: palette.gray.dark1, fontFamily: FONT }}>Checkpoints</div>
                    </div>
                    <div style={{ padding: '6px 12px', borderRadius: 6, background: palette.blue.light3, textAlign: 'center' }}>
                      <div style={{ fontSize: 18, fontWeight: 700, color: palette.blue.dark1, fontFamily: FONT }}>
                        {checkpointData.reduce((s, c) => s + c.keys.length, 0)}
                      </div>
                      <div style={{ fontSize: 9, color: palette.gray.dark1, fontFamily: FONT }}>State Keys</div>
                    </div>
                    <div style={{ flex: 1, padding: '6px 12px', borderRadius: 6, background: palette.green.light3 }}>
                      <div style={{ fontSize: 10, color: palette.green.dark2, fontFamily: FONT, fontWeight: 600, marginBottom: 2 }}>
                        Resumable from any point
                      </div>
                      <div style={{ fontSize: 10, color: palette.gray.dark1, fontFamily: FONT, lineHeight: 1.4 }}>
                        If the server crashes, the pipeline resumes from the last checkpoint — not from scratch.
                      </div>
                    </div>
                  </div>

                  {checkpointData.map((cp, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 16, flexShrink: 0 }}>
                        <div style={{
                          width: 8, height: 8, borderRadius: '50%', marginTop: 4,
                          background: palette.green.dark1,
                        }} />
                        {i < checkpointData.length - 1 && (
                          <div style={{ flex: 1, width: 1, background: palette.gray.light2, marginTop: 2, minHeight: 16 }} />
                        )}
                      </div>
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 600, color: palette.gray.dark3, fontFamily: FONT }}>
                          {cp.label}
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginTop: 2 }}>
                          {cp.keys.slice(0, 6).map((k, j) => (
                            <span key={j} style={{
                              fontSize: 8, fontFamily: "'Source Code Pro', monospace",
                              padding: '1px 4px', borderRadius: 2,
                              background: palette.gray.light3, color: palette.gray.dark1,
                              border: `1px solid ${palette.gray.light2}`,
                            }}>
                              {k}
                            </span>
                          ))}
                          {cp.keys.length > 6 && (
                            <span style={{ fontSize: 8, color: palette.gray.dark1 }}>+{cp.keys.length - 6} more</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}

                  <div style={{
                    marginTop: spacing[2], padding: '6px 8px', borderRadius: 4,
                    background: palette.gray.light3, fontSize: 10, fontFamily: FONT,
                    color: palette.gray.dark1, lineHeight: 1.4,
                    border: `1px solid ${palette.gray.light2}`,
                  }}>
                    Without MongoDB: Redis for state serialization + Kafka for event sourcing + PostgreSQL for data persistence + custom recovery logic.
                    <strong style={{ color: palette.green.dark2 }}> With MongoDBSaver: one database, zero custom code.</strong>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Summary Tab */}
          {activeTab === 'summary' && (
            <div style={{
              padding: '8px 12px', borderRadius: 6,
              background: palette.green.light3,
              border: `1px solid ${palette.green.light1}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <Icon glyph="Sparkle" size={12} fill={palette.green.dark1} />
                <span style={{ fontSize: 11, fontWeight: 600, color: palette.green.dark2 }}>
                  MongoDB Advantage
                </span>
              </div>
              <Body style={{ fontSize: '11px', color: palette.gray.dark2, lineHeight: 1.5 }}>
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
          )}
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
