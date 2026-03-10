"use client";

import { useState, useCallback, useEffect, useMemo } from 'react';
import { H2, Body, Subtitle } from '@leafygreen-ui/typography';
import Card from '@leafygreen-ui/card';
import Button from '@leafygreen-ui/button';
import Badge from '@leafygreen-ui/badge';
import Icon from '@leafygreen-ui/icon';
import { palette } from '@leafygreen-ui/palette';
import { spacing } from '@leafygreen-ui/tokens';
import { Spinner } from '@leafygreen-ui/loading-indicator';

import { listInvestigations, seedAgentCollections, connectInvestigationStream } from '@/lib/agent-api';
import InvestigationLauncher from './InvestigationLauncher';
import InvestigationDetail from './InvestigationDetail';
import AgenticPipelineGraph from './AgenticPipelineGraph';
import InvestigationAnalytics from './InvestigationAnalytics';
import ChangeStreamConsole from './ChangeStreamConsole';
import ChatBubble from '@/components/chat/ChatBubble';

const FONT = "'Euclid Circular A', sans-serif";

const STATUS_BADGES = {
  filed: { variant: 'green', label: 'SAR Filed' },
  closed: { variant: 'gray', label: 'Closed' },
  closed_false_positive: { variant: 'lightgray', label: 'Auto-Closed (FP)' },
  forced_escalation: { variant: 'red', label: 'Forced Escalation' },
  reviewed_by_analyst: { variant: 'blue', label: 'Reviewed' },
  pending_review: { variant: 'yellow', label: 'Pending Review' },
  narrative_generated: { variant: 'blue', label: 'Narrative Ready' },
};

const STATUS_FILTERS = [
  { value: null, label: 'All' },
  { value: 'pending_review', label: 'Pending Review' },
  { value: 'filed', label: 'Filed' },
  { value: 'closed_false_positive', label: 'Auto-Closed' },
  { value: 'forced_escalation', label: 'Escalated' },
];

function StatusBadge({ status }) {
  const config = STATUS_BADGES[status] || { variant: 'lightgray', label: status || 'Unknown' };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

export default function InvestigationsPage() {
  const [activeView, setActiveView] = useState('launcher');
  const [selectedCase, setSelectedCase] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const [investigations, setInvestigations] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState(null);

  const fetchInvestigations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listInvestigations(null, 50, 0);
      setInvestigations(data.investigations || []);
      setTotal(data.total || 0);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInvestigations();
  }, [fetchInvestigations, refreshKey]);

  useEffect(() => {
    let handle;
    try {
      handle = connectInvestigationStream((event) => {
        if (event.type === 'change') {
          setRefreshKey(k => k + 1);
        }
      });
    } catch { /* stream unavailable */ }
    return () => { handle?.close(); };
  }, []);

  const handleChangeStreamInvestigation = useCallback(() => {
    setRefreshKey(k => k + 1);
  }, []);

  const handleSeed = async () => {
    setSeeding(true);
    try {
      await seedAgentCollections();
      setRefreshKey(k => k + 1);
    } catch (err) {
      setError(`Seed failed: ${err.message}`);
    } finally {
      setSeeding(false);
    }
  };

  const handleInvestigationComplete = useCallback((result) => {
    setRefreshKey((k) => k + 1);
  }, []);

  const handleViewDetail = useCallback((investigation) => {
    setSelectedCase(investigation);
    setActiveView('detail');
  }, []);

  const handleNewInvestigation = useCallback(() => {
    setSelectedCase(null);
    setActiveView('launcher');
  }, []);

  const filteredInvestigations = useMemo(() => {
    if (!statusFilter) return investigations;
    return investigations.filter(inv => inv.investigation_status === statusFilter);
  }, [investigations, statusFilter]);

  const kpis = useMemo(() => ({
    total: investigations.length,
    filed: investigations.filter(i => i.investigation_status === 'filed').length,
  }), [investigations]);

  return (
    <div>
      <div style={{ marginBottom: spacing[3] }}>
        <H2 style={{ fontFamily: FONT, margin: 0, fontSize: '22px' }}>
          Agentic Investigations
        </H2>
        <Body style={{
          color: palette.gray.dark1, fontFamily: FONT, fontSize: '13px', marginTop: 2,
        }}>
          AI-powered multi-agent pipeline for automated SAR investigation, typology classification, and narrative generation.
        </Body>
      </div>

      <div style={{ display: 'flex', gap: spacing[3], minHeight: 'calc(100vh - 220px)' }}>
        {/* LEFT SIDEBAR */}
        <aside
          aria-label="Investigation list"
          style={{
            width: 340,
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: spacing[2],
          }}
        >
          {/* KPI Summary */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            {[
              { label: 'Total', value: kpis.total, color: palette.gray.dark2 },
              { label: 'SARs Filed', value: kpis.filed, color: palette.green.dark1 },
            ].map(kpi => (
              <div key={kpi.label} style={{
                padding: '8px 10px',
                borderRadius: 6,
                background: palette.gray.light3,
                border: `1px solid ${palette.gray.light2}`,
              }}>
                <div style={{
                  fontSize: 20, fontWeight: 700, fontFamily: FONT, color: kpi.color,
                  fontVariantNumeric: 'tabular-nums',
                }}>
                  {loading ? '-' : kpi.value}
                </div>
                <div style={{ fontSize: 10, color: palette.gray.dark1, fontFamily: FONT }}>
                  {kpi.label}
                </div>
              </div>
            ))}
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: 6 }}>
            <Button
              size="small"
              variant="baseGreen"
              onClick={handleNewInvestigation}
              style={{ flex: 1 }}
            >
              New Investigation
            </Button>
            <Button
              size="xsmall"
              onClick={() => setActiveView(v => v === 'analytics' ? 'launcher' : 'analytics')}
              aria-label="Analytics"
            >
              <Icon glyph="Charts" size={14} />
            </Button>
            <Button size="xsmall" onClick={() => setRefreshKey(k => k + 1)} aria-label="Refresh list">
              <Icon glyph="Refresh" size={14} />
            </Button>
            <Button size="xsmall" onClick={handleSeed} disabled={seeding} aria-label="Seed test data">
              {seeding ? '...' : 'Seed'}
            </Button>
          </div>

          {/* Status Filters */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }} role="group" aria-label="Filter by status">
            {STATUS_FILTERS.map(f => (
              <button
                key={f.label}
                onClick={() => setStatusFilter(f.value)}
                aria-pressed={statusFilter === f.value}
                style={{
                  fontSize: 10,
                  fontFamily: FONT,
                  padding: '3px 8px',
                  borderRadius: 4,
                  border: `1px solid ${statusFilter === f.value ? palette.blue.base : palette.gray.light2}`,
                  background: statusFilter === f.value ? palette.blue.light3 : '#fff',
                  color: statusFilter === f.value ? palette.blue.dark1 : palette.gray.dark1,
                  cursor: 'pointer',
                  fontWeight: statusFilter === f.value ? 600 : 400,
                  transition: 'all 0.15s ease',
                }}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Investigation List */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
          }}>
            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: spacing[4] }}>
                <Spinner />
              </div>
            ) : error ? (
              <div style={{
                padding: spacing[2],
                borderRadius: 6,
                background: palette.red.light3,
                border: `1px solid ${palette.red.light1}`,
                fontSize: 12, fontFamily: FONT, color: palette.red.dark2,
              }}>
                {error}
              </div>
            ) : filteredInvestigations.length === 0 ? (
              <div style={{
                padding: spacing[3],
                textAlign: 'center',
                color: palette.gray.dark1,
                fontSize: 13, fontFamily: FONT,
              }}>
                {statusFilter
                  ? 'No investigations match this filter.'
                  : 'No investigations yet. Launch one to get started.'}
              </div>
            ) : (
              filteredInvestigations.map(inv => {
                const isSelected = selectedCase?.case_id === inv.case_id && activeView === 'detail';
                const riskScore = inv.triage_decision?.risk_score;
                return (
                  <div
                    key={inv.case_id}
                    onClick={() => handleViewDetail(inv)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleViewDetail(inv); }}
                    style={{
                      padding: '10px 12px',
                      borderRadius: 6,
                      cursor: 'pointer',
                      border: `1px solid ${isSelected ? palette.blue.base : palette.gray.light2}`,
                      background: isSelected ? palette.blue.light3 : '#fff',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      marginBottom: 4,
                    }}>
                      <span style={{
                        fontSize: 12, fontWeight: 600, fontFamily: FONT, color: palette.gray.dark3,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 180,
                      }}>
                        {inv.case_id}
                      </span>
                      <StatusBadge status={inv.investigation_status} />
                    </div>
                    <div style={{
                      fontSize: 11, color: palette.gray.dark1, fontFamily: FONT,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {inv.entity_name || inv.case_file?.entity?.name || inv.entity_id || inv.alert_data?.entity_id || 'N/A'}
                      {riskScore !== undefined && (
                        <span style={{
                          marginLeft: 6, fontWeight: 600,
                          color: riskScore > 70 ? palette.red.base
                            : riskScore > 25 ? palette.yellow.dark2
                            : palette.green.dark1,
                        }}>
                          Risk: {riskScore}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 10, color: palette.gray.base, fontFamily: FONT, marginTop: 2 }}>
                      {inv.created_at ? new Date(inv.created_at).toLocaleString() : ''}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* View Toggles */}
          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
            <Button
              size="xsmall"
              variant={activeView === 'assistant' ? 'baseGreen' : 'default'}
              onClick={() => setActiveView(v => v === 'assistant' ? 'launcher' : 'assistant')}
              style={{ flex: 1 }}
            >
              <Icon glyph="Wizard" size={14} style={{ marginRight: 4 }} />
              {activeView === 'assistant' ? 'Hide Assistant' : 'AML Assistant'}
            </Button>
            <Button
              size="xsmall"
              variant="default"
              onClick={() => setActiveView(v => v === 'pipeline' ? 'launcher' : 'pipeline')}
              style={{ flex: 1 }}
            >
              <Icon glyph="Diagram3" size={14} style={{ marginRight: 4 }} />
              {activeView === 'pipeline' ? 'Hide Pipeline' : 'Pipeline'}
            </Button>
          </div>

          {/* Change Stream Console */}
          <ChangeStreamConsole onInvestigationChange={handleChangeStreamInvestigation} />

        </aside>

        {/* RIGHT WORKSPACE */}
        <section aria-label="Investigation workspace" style={{ flex: 1, minWidth: 0 }}>
          {activeView === 'launcher' && (
            <InvestigationLauncher onComplete={handleInvestigationComplete} />
          )}
          {activeView === 'detail' && (
            <InvestigationDetail investigation={selectedCase} />
          )}
          {activeView === 'analytics' && (
            <InvestigationAnalytics />
          )}
          {activeView === 'assistant' && (
            <div style={{ display: 'flex', gap: spacing[3], height: '100%', minHeight: 'calc(100vh - 280px)' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <ChatBubble
                  embedded={true}
                  pageContext={selectedCase ? {
                    type: 'investigation',
                    caseId: selectedCase.case_id,
                    entityId: selectedCase.entity_id,
                  } : null}
                />
              </div>
              <aside style={{
                width: 280, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: spacing[2],
              }}>
                <Card style={{ padding: spacing[2] }}>
                  <Subtitle style={{ fontFamily: FONT, fontSize: 13, margin: 0, marginBottom: spacing[1] }}>
                    Capabilities
                  </Subtitle>
                  {[
                    { icon: '🏢', label: 'Entity profiles & risk scoring' },
                    { icon: '💸', label: 'Transaction queries & analysis' },
                    { icon: '🕸️', label: 'Network traversal ($graphLookup)' },
                    { icon: '🔍', label: 'Typology & compliance search (Atlas Search)' },
                    { icon: '📋', label: 'Investigation lookup & summaries' },
                    { icon: '⚖️', label: 'SAR filing guidance' },
                  ].map(cap => (
                    <div key={cap.label} style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '4px 0', fontSize: 12, fontFamily: FONT,
                      color: palette.gray.dark2,
                    }}>
                      <span>{cap.icon}</span>
                      <span>{cap.label}</span>
                    </div>
                  ))}
                </Card>
                <Card style={{ padding: spacing[2] }}>
                  <Subtitle style={{ fontFamily: FONT, fontSize: 13, margin: 0, marginBottom: spacing[1] }}>
                    MongoDB Under the Hood
                  </Subtitle>
                  {[
                    { badge: 'MongoDBSaver', desc: 'Durable conversation memory — close the browser, come back tomorrow, and the conversation continues.' },
                    { badge: 'Atlas Search', desc: 'RAG over typology library and compliance policies with fuzzy matching.' },
                    { badge: '$graphLookup', desc: 'Recursive network traversal to map entity connections.' },
                    { badge: 'aggregate()', desc: 'Complex transaction analysis with pipeline stages.' },
                  ].map(item => (
                    <div key={item.badge} style={{
                      padding: '6px 0', borderBottom: `1px solid ${palette.gray.light3}`,
                      fontSize: 11, fontFamily: FONT,
                    }}>
                      <span style={{
                        display: 'inline-block', fontSize: 9, padding: '1px 5px', borderRadius: 3,
                        background: palette.green.dark1, color: '#fff', fontWeight: 600,
                        fontFamily: 'monospace', marginBottom: 3,
                      }}>
                        {item.badge}
                      </span>
                      <Body style={{
                        fontSize: 11, fontFamily: FONT, color: palette.gray.dark1,
                        lineHeight: 1.4, margin: 0,
                      }}>
                        {item.desc}
                      </Body>
                    </div>
                  ))}
                </Card>
                <div style={{
                  padding: '8px 12px', borderRadius: 6,
                  background: '#1a1a2e', color: palette.green.light1,
                  fontSize: 10, fontFamily: FONT, lineHeight: 1.5,
                  border: `1px solid ${palette.green.dark2}44`,
                }}>
                  <strong style={{ color: palette.green.light2 }}>12 tools</strong> querying MongoDB collections in real-time.
                  Each tool call maps to a MongoDB operation — <code style={{ color: palette.green.light2 }}>findOne()</code>,{' '}
                  <code style={{ color: palette.green.light2 }}>aggregate()</code>,{' '}
                  <code style={{ color: palette.green.light2 }}>$graphLookup</code>, or{' '}
                  <code style={{ color: palette.green.light2 }}>Atlas Search</code>.
                </div>
              </aside>
            </div>
          )}
          {activeView === 'pipeline' && (
            <Card style={{ padding: spacing[3], height: '100%', minHeight: 600 }}>
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                marginBottom: spacing[2],
              }}>
                <div>
                  <Subtitle style={{ fontFamily: FONT, margin: 0 }}>
                    Agentic Investigation Pipeline
                  </Subtitle>
                  <Body style={{ color: palette.gray.dark1, fontSize: '12px', fontFamily: FONT, marginTop: 2 }}>
                    LangGraph multi-agent workflow with Command routing, Send fan-out, and interrupt-based human review.
                  </Body>
                </div>
              </div>
              <div style={{
                height: 'calc(100% - 60px)',
                borderRadius: 8,
                overflow: 'hidden',
                border: `1px solid ${palette.gray.light2}`,
              }}>
                <AgenticPipelineGraph showTools={true} />
              </div>
            </Card>
          )}
        </section>
      </div>

      {/* Powered by MongoDB footer */}
      <div style={{
        marginTop: spacing[4], padding: `${spacing[3]}px 0`, textAlign: 'center',
        borderTop: `1px solid ${palette.gray.light2}`,
      }}>
        <Body style={{ fontSize: '12px', fontFamily: FONT, fontWeight: 600, color: palette.gray.dark1, marginBottom: 4 }}>
          Powered by MongoDB
        </Body>
        <Body style={{ fontSize: '11px', fontFamily: FONT, color: palette.gray.base, maxWidth: 700, margin: '0 auto' }}>
          MongoDBSaver for durable agent state &nbsp;|&nbsp; <code>$graphLookup</code> for network traversal &nbsp;|&nbsp;
          Atlas Search for RAG &nbsp;|&nbsp; Flexible document model for investigation storage &nbsp;|&nbsp;
          Aggregation pipelines for evidence analysis &nbsp;|&nbsp; Change Streams for real-time updates
        </Body>
      </div>
    </div>
  );
}
