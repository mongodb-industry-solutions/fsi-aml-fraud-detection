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
import { uiTokens, getRiskAccentColor, GLOBAL_KEYFRAMES } from './investigationTokens';

const FONT = uiTokens.font;

const CAPABILITY_CATEGORIES = [
  {
    id: 'entity',
    label: 'Entity Research',
    icon: '👤',
    tools: [
      { name: 'search_entities', desc: 'Full-text search across entity collection', op: 'find()' },
      { name: 'get_entity_profile', desc: 'Retrieve full entity profile with risk data', op: 'findOne()' },
      { name: 'find_similar_entities', desc: 'Find entities matching risk/behavior patterns', op: 'aggregate()' },
      { name: 'compare_entities', desc: 'Side-by-side entity comparison', op: 'find()' },
    ],
  },
  {
    id: 'txn',
    label: 'Transaction Analysis',
    icon: '💸',
    tools: [
      { name: 'query_entity_transactions', desc: 'Query and aggregate transaction history', op: 'aggregate()' },
      { name: 'trace_fund_flow', desc: 'Follow money trail across entity chains', op: '$graphLookup' },
      { name: 'analyze_temporal_patterns', desc: 'Detect structuring, velocity spikes, dormancy', op: '$setWindowFields' },
    ],
  },
  {
    id: 'network',
    label: 'Network Analysis',
    icon: '🕸',
    tools: [
      { name: 'analyze_entity_network', desc: 'Recursive graph traversal of entity connections', op: '$graphLookup' },
    ],
  },
  {
    id: 'compliance',
    label: 'Compliance & Typology',
    icon: '⚖️',
    tools: [
      { name: 'search_typologies', desc: 'RAG search over typology library', op: 'Atlas Search' },
      { name: 'lookup_typology', desc: 'Retrieve specific typology definition', op: 'findOne()' },
      { name: 'search_compliance_policies', desc: 'Search compliance policies and SAR guidelines', op: 'Atlas Search' },
    ],
  },
  {
    id: 'investigation',
    label: 'Investigation Mgmt',
    icon: '📋',
    tools: [
      { name: 'search_investigations', desc: 'Search past investigation cases', op: 'find()' },
      { name: 'get_investigation_detail', desc: 'Full case detail with evidence and audit trail', op: 'findOne()' },
      { name: 'get_risk_summary', desc: 'Consolidated risk assessment across data sources', op: 'aggregate()' },
      { name: 'expand_investigation_lead', desc: 'Follow up on a lead from an existing case', op: 'aggregate()' },
      { name: 'screen_watchlists', desc: 'Screen entity against sanctions and watchlists', op: 'find()' },
    ],
  },
];

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
  const [listPage, setListPage] = useState(0);
  const [expandedCaps, setExpandedCaps] = useState({});

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

  const LIST_PAGE_SIZE = 5;
  const totalPages = Math.max(1, Math.ceil(filteredInvestigations.length / LIST_PAGE_SIZE));
  const pagedInvestigations = useMemo(() => {
    const start = listPage * LIST_PAGE_SIZE;
    return filteredInvestigations.slice(start, start + LIST_PAGE_SIZE);
  }, [filteredInvestigations, listPage]);

  useEffect(() => { setListPage(0); }, [statusFilter]);

  const kpis = useMemo(() => ({
    total: investigations.length,
    filed: investigations.filter(i => i.investigation_status === 'filed').length,
  }), [investigations]);

  return (
    <div>
      <style>{GLOBAL_KEYFRAMES}</style>
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

      <div style={{ display: 'flex', gap: 0, minHeight: 'calc(100vh - 220px)' }}>
        {/* LEFT SIDEBAR */}
        <aside
          aria-label="Investigation list"
          style={{
            width: 340,
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: 0,
            background: uiTokens.railBg,
            borderRight: `1px solid ${uiTokens.borderDefault}`,
            padding: `${spacing[3]}px ${spacing[3]}px ${spacing[2]}px`,
            marginRight: spacing[3],
          }}
        >
          {/* KPI Summary */}
          <div style={{
            display: 'flex',
            borderRadius: 8,
            background: uiTokens.surface1,
            border: `1px solid ${uiTokens.borderDefault}`,
            boxShadow: uiTokens.shadowCard,
            overflow: 'hidden',
            marginBottom: spacing[3],
          }}>
            {[
              { label: 'Total Cases', value: kpis.total, color: palette.gray.dark3 },
              { label: 'SARs Filed', value: kpis.filed, color: palette.green.dark1 },
            ].map((kpi, i) => (
              <div key={kpi.label} style={{
                flex: 1,
                padding: '12px 14px',
                borderRight: i === 0 ? `1px solid ${uiTokens.borderDefault}` : 'none',
              }}>
                <div style={{
                  fontSize: 28, fontWeight: 700, fontFamily: FONT, color: kpi.color,
                  fontVariantNumeric: 'tabular-nums', lineHeight: 1.1,
                }}>
                  {loading ? '\u2014' : kpi.value}
                </div>
                <div style={{
                  fontSize: 11, color: palette.gray.base, fontFamily: FONT,
                  marginTop: 4, letterSpacing: '0.02em',
                }}>
                  {kpi.label}
                </div>
              </div>
            ))}
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: 6, marginBottom: spacing[3] }}>
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
              {seeding ? '...' : <Icon glyph="Database" size={14} />}
            </Button>
          </div>

          {/* Section label */}
          <div style={{
            fontSize: 11, fontWeight: 600, fontFamily: FONT, color: palette.gray.dark1,
            textTransform: 'uppercase', letterSpacing: '0.04em',
            marginBottom: spacing[2],
          }}>
            Status
          </div>

          {/* Status Filters — segmented control */}
          <div
            style={{
              display: 'flex', flexWrap: 'wrap', gap: 0,
              background: palette.gray.light3, borderRadius: 6,
              padding: 2, marginBottom: spacing[3],
            }}
            role="group"
            aria-label="Filter by status"
          >
            {STATUS_FILTERS.map(f => {
              const isActive = statusFilter === f.value;
              return (
                <button
                  key={f.label}
                  onClick={() => setStatusFilter(f.value)}
                  aria-pressed={isActive}
                  style={{
                    fontSize: 10,
                    fontFamily: FONT,
                    padding: '4px 10px',
                    borderRadius: 4,
                    border: 'none',
                    background: isActive ? uiTokens.surface1 : 'transparent',
                    boxShadow: isActive ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                    color: isActive ? palette.gray.dark3 : palette.gray.dark1,
                    cursor: 'pointer',
                    fontWeight: isActive ? 600 : 400,
                    transition: `all ${uiTokens.transitionFast}`,
                    flex: '1 0 auto',
                  }}
                >
                  {f.label}
                </button>
              );
            })}
          </div>

          {/* Cases section label */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            marginBottom: spacing[2],
          }}>
            <span style={{
              fontSize: 11, fontWeight: 600, fontFamily: FONT, color: palette.gray.dark1,
              textTransform: 'uppercase', letterSpacing: '0.04em',
            }}>
              Cases
            </span>
            <span style={{
              fontSize: 10, fontFamily: FONT, color: palette.gray.base,
              fontVariantNumeric: 'tabular-nums',
            }}>
              {filteredInvestigations.length} result{filteredInvestigations.length !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Investigation List */}
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
            minHeight: 0,
            overflowY: 'auto',
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
                padding: spacing[4],
                textAlign: 'center',
                color: palette.gray.dark1,
                fontSize: 13, fontFamily: FONT,
              }}>
                {statusFilter
                  ? 'No investigations match this filter.'
                  : 'No investigations yet. Launch one to get started.'}
              </div>
            ) : (
              pagedInvestigations.map((inv, idx) => {
                const isSelected = selectedCase?.case_id === inv.case_id && activeView === 'detail';
                const riskScore = inv.triage_decision?.risk_score;
                const accentColor = getRiskAccentColor(riskScore);
                return (
                  <div
                    key={inv.case_id}
                    onClick={() => handleViewDetail(inv)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleViewDetail(inv); }}
                    className="inv-list-card"
                    style={{
                      display: 'flex',
                      borderRadius: 6,
                      cursor: 'pointer',
                      border: isSelected
                        ? `1px solid ${palette.green.dark1}`
                        : `1px solid ${uiTokens.borderDefault}`,
                      background: isSelected ? '#f0faf5' : uiTokens.surface1,
                      boxShadow: isSelected
                        ? `0 0 0 1px ${palette.green.dark1}, ${uiTokens.shadowSelected}`
                        : 'none',
                      transition: `all ${uiTokens.transitionFast}`,
                      overflow: 'hidden',
                      animation: `fadeSlideIn 220ms ease both`,
                      animationDelay: `${idx * 30}ms`,
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.transform = 'translateY(-1px)';
                        e.currentTarget.style.boxShadow = uiTokens.shadowHover;
                        e.currentTarget.style.borderColor = uiTokens.borderStrong;
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = 'none';
                        e.currentTarget.style.borderColor = uiTokens.borderDefault;
                      }
                    }}
                  >
                    {/* Risk accent strip */}
                    <div style={{
                      width: 3, flexShrink: 0,
                      background: accentColor,
                      borderRadius: '3px 0 0 3px',
                    }} />
                    <div style={{ flex: 1, padding: '10px 12px', lineHeight: 1.45 }}>
                      <div style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        marginBottom: 4,
                      }}>
                        <span style={{
                          fontSize: 13, fontWeight: 600, fontFamily: FONT, color: palette.gray.dark3,
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 180,
                        }}>
                          {inv.case_id}
                        </span>
                        <StatusBadge status={inv.investigation_status} />
                      </div>
                      <div style={{
                        fontSize: 12, color: palette.gray.dark1, fontFamily: FONT,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {inv.entity_name || inv.case_file?.entity?.name || inv.entity_id || inv.alert_data?.entity_id || 'N/A'}
                        {riskScore !== undefined && (
                          <span style={{
                            marginLeft: 8, fontWeight: 600, fontSize: 11,
                            color: riskScore > 70 ? palette.red.dark2
                              : riskScore > 25 ? palette.yellow.dark2
                              : palette.green.dark1,
                          }}>
                            Risk {riskScore}
                          </span>
                        )}
                      </div>
                      <div style={{
                        fontSize: 10, color: palette.gray.base, fontFamily: FONT, marginTop: 3,
                        fontVariantNumeric: 'tabular-nums',
                      }}>
                        {inv.created_at ? new Date(inv.created_at).toLocaleString() : ''}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Pagination Controls */}
          {!loading && filteredInvestigations.length > LIST_PAGE_SIZE && (
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: `${spacing[2]}px 0`, flexShrink: 0,
              borderTop: `1px solid ${uiTokens.borderDefault}`,
              marginTop: spacing[2],
            }}>
              <button
                onClick={() => setListPage(p => Math.max(0, p - 1))}
                disabled={listPage === 0}
                style={{
                  fontSize: 11, fontFamily: FONT, padding: '4px 12px', borderRadius: 4,
                  border: `1px solid ${uiTokens.borderDefault}`, background: uiTokens.surface1,
                  color: listPage === 0 ? palette.gray.light1 : palette.gray.dark1,
                  cursor: listPage === 0 ? 'default' : 'pointer',
                  transition: `all ${uiTokens.transitionFast}`,
                }}
              >
                Prev
              </button>
              <span style={{
                fontSize: 10, fontFamily: FONT, color: palette.gray.dark1,
                fontVariantNumeric: 'tabular-nums',
              }}>
                {listPage + 1} / {totalPages}
              </span>
              <button
                onClick={() => setListPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={listPage >= totalPages - 1}
                style={{
                  fontSize: 11, fontFamily: FONT, padding: '4px 12px', borderRadius: 4,
                  border: `1px solid ${uiTokens.borderDefault}`, background: uiTokens.surface1,
                  color: listPage >= totalPages - 1 ? palette.gray.light1 : palette.gray.dark1,
                  cursor: listPage >= totalPages - 1 ? 'default' : 'pointer',
                  transition: `all ${uiTokens.transitionFast}`,
                }}
              >
                Next
              </button>
            </div>
          )}

          {/* Divider */}
          <div style={{
            height: 1, background: uiTokens.borderDefault,
            margin: `${spacing[2]}px 0`,
            flexShrink: 0,
          }} />

          {/* View Toggles — segmented control */}
          <div style={{
            display: 'flex', gap: 0,
            background: palette.gray.light3, borderRadius: 6,
            padding: 2, flexShrink: 0, marginBottom: spacing[2],
          }}>
            {[
              { key: 'assistant', icon: 'Wizard', label: 'Assistant' },
              { key: 'pipeline', icon: 'Diagram3', label: 'Pipeline' },
            ].map(toggle => {
              const isActive = activeView === toggle.key;
              return (
                <button
                  key={toggle.key}
                  onClick={() => setActiveView(v => v === toggle.key ? 'launcher' : toggle.key)}
                  style={{
                    flex: 1,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                    padding: '6px 8px',
                    borderRadius: 4,
                    border: 'none',
                    background: isActive ? uiTokens.surface1 : 'transparent',
                    boxShadow: isActive ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                    color: isActive ? palette.green.dark2 : palette.gray.dark1,
                    cursor: 'pointer',
                    fontFamily: FONT,
                    fontSize: 11,
                    fontWeight: isActive ? 600 : 400,
                    transition: `all ${uiTokens.transitionFast}`,
                  }}
                >
                  <Icon glyph={toggle.icon} size={14} />
                  {toggle.label}
                </button>
              );
            })}
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
            <div style={{ display: 'flex', gap: spacing[3], height: 'calc(100vh - 280px)', overflow: 'hidden' }}>
              <div style={{ flex: 1, minWidth: 0, height: '100%' }}>
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
                overflowY: 'auto',
              }}>
                <Card style={{ padding: spacing[2] }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing[1] }}>
                    <Subtitle style={{ fontFamily: FONT, fontSize: 13, margin: 0 }}>
                      Tools &amp; Capabilities
                    </Subtitle>
                    <span style={{
                      fontSize: 9, fontFamily: FONT, fontWeight: 600,
                      padding: '2px 6px', borderRadius: 4,
                      background: palette.green.light3, color: palette.green.dark1,
                      border: `1px solid ${palette.green.light1}`,
                    }}>
                      {CAPABILITY_CATEGORIES.reduce((n, c) => n + c.tools.length, 0)} tools
                    </span>
                  </div>
                  {CAPABILITY_CATEGORIES.map(cat => {
                    const isExpanded = expandedCaps[cat.id];
                    return (
                      <div key={cat.id} style={{ marginBottom: 2 }}>
                        <button
                          onClick={() => setExpandedCaps(prev => ({ ...prev, [cat.id]: !prev[cat.id] }))}
                          style={{
                            width: '100%', display: 'flex', alignItems: 'center', gap: 6,
                            padding: '6px 4px', fontSize: 12, fontFamily: FONT, fontWeight: 500,
                            color: palette.gray.dark2, background: 'none', border: 'none',
                            cursor: 'pointer', borderRadius: 4,
                            transition: 'background 0.12s',
                          }}
                          onMouseEnter={e => { e.currentTarget.style.background = palette.gray.light3; }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                        >
                          <span style={{ fontSize: 14 }}>{cat.icon}</span>
                          <span style={{ flex: 1, textAlign: 'left' }}>{cat.label}</span>
                          <span style={{
                            fontSize: 9, color: palette.gray.base, fontWeight: 400,
                            marginRight: 4,
                          }}>
                            {cat.tools.length}
                          </span>
                          <span style={{ fontSize: 9, color: palette.gray.base }}>
                            {isExpanded ? '▼' : '▶'}
                          </span>
                        </button>
                        {isExpanded && (
                          <div style={{ paddingLeft: 24, paddingBottom: 4 }}>
                            {cat.tools.map(tool => (
                              <div key={tool.name} style={{
                                padding: '4px 0',
                                borderBottom: `1px solid ${palette.gray.light3}`,
                                fontSize: 10, fontFamily: FONT,
                              }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}>
                                  <code style={{
                                    fontSize: 9, fontFamily: "'Source Code Pro', monospace",
                                    color: palette.blue.dark1, fontWeight: 600,
                                  }}>
                                    {tool.name}
                                  </code>
                                  <span style={{
                                    fontSize: 8, padding: '0px 4px', borderRadius: 3,
                                    background: palette.green.light3, color: palette.green.dark2,
                                    fontFamily: "'Source Code Pro', monospace", fontWeight: 600,
                                    border: `1px solid ${palette.green.light1}`,
                                  }}>
                                    {tool.op}
                                  </span>
                                </div>
                                <div style={{ color: palette.gray.dark1, lineHeight: 1.4 }}>
                                  {tool.desc}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </Card>
                <div style={{
                  padding: '8px 12px', borderRadius: 6,
                  background: '#1a1a2e', color: palette.green.light1,
                  fontSize: 10, fontFamily: FONT, lineHeight: 1.5,
                  border: `1px solid ${palette.green.dark2}44`,
                }}>
                  Every tool call maps to a MongoDB operation:{' '}
                  <code style={{ color: palette.green.light2 }}>findOne()</code>,{' '}
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
        borderTop: `1px solid ${uiTokens.borderDefault}`,
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
