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
import ArchitectureReferencePanel from './ArchitectureReferencePanel';
import ChatBubble from '@/components/chat/ChatBubble';
import { uiTokens, getRiskAccentColor, GLOBAL_KEYFRAMES } from './investigationTokens';

const FONT = uiTokens.font;

const CAPABILITY_CATEGORIES = [
  {
    id: 'entity',
    label: 'Entity Research',
    icon: 'Person',
    tools: [
      { name: 'search_entities', desc: 'Filter entities by type, risk level, or name', op: 'find()' },
      { name: 'get_entity_profile', desc: 'Retrieve full entity profile by ID', op: 'findOne()' },
      { name: 'find_similar_entities', desc: 'Vector similarity search on behavioral embeddings', op: '$vectorSearch' },
      { name: 'compare_entities', desc: 'Side-by-side entity comparison with txn and network stats', op: 'aggregate()' },
      { name: 'screen_watchlists', desc: 'Screen entity against sanctions and PEP watchlists', op: 'findOne()' },
    ],
  },
  {
    id: 'txn',
    label: 'Transaction Analysis',
    icon: 'CreditCard',
    tools: [
      { name: 'query_entity_transactions', desc: 'Query and rank transaction history by risk', op: 'find()' },
      { name: 'trace_fund_flow', desc: 'Follow money trail across entity chains', op: 'find()' },
      { name: 'analyze_temporal_patterns', desc: 'Detect structuring, velocity spikes, dormancy', op: 'aggregate()' },
    ],
  },
  {
    id: 'network',
    label: 'Network Analysis',
    icon: 'Diagram2',
    tools: [
      { name: 'analyze_entity_network', desc: 'Recursive graph traversal of entity connections', op: '$graphLookup' },
    ],
  },
  {
    id: 'compliance',
    label: 'Compliance & Typology',
    icon: 'Lock',
    tools: [
      { name: 'search_typologies', desc: 'Search typology library by keyword', op: '$regex' },
      { name: 'lookup_typology', desc: 'Retrieve specific typology definition', op: 'findOne()' },
      { name: 'search_compliance_policies', desc: 'Search compliance policies and SAR guidelines', op: '$regex' },
    ],
  },
  {
    id: 'investigation',
    label: 'Investigation Mgmt',
    icon: 'Folder',
    tools: [
      { name: 'search_investigations', desc: 'Search past investigation cases', op: 'find()' },
      { name: 'get_investigation_detail', desc: 'Full case detail with evidence and audit trail', op: 'findOne()' },
      { name: 'assess_entity_risk', desc: 'Rapid entity risk dossier: profile, txn stats, network, watchlists', op: 'aggregate()' },
    ],
  },
];

const CAPABILITY_CARDS = [
  { id: 'trace', label: 'Trace Money Trails', icon: 'Diagram2',
    desc: 'Follow multi-hop fund flows across entity chains',
    prompt: 'Trace the money trail for the most recently escalated entity and flag suspicious hops' },
  { id: 'sar', label: 'Generate SAR Reports', icon: 'File',
    desc: 'Create structured SAR narratives with evidence citations',
    prompt: 'Generate a SAR narrative report for the highest-risk entity' },
  { id: 'risk', label: 'Assess Entity Risk', icon: 'Warning',
    desc: 'Rapid risk dossier combining profile, transactions, network, and watchlists',
    prompt: 'Which entities have the highest risk scores and why?' },
  { id: 'network', label: 'Visualize Networks', icon: 'Connect',
    desc: 'Map entity connections and identify hidden relationships',
    prompt: 'Map the network around the highest-risk entity and check for sanctions hits' },
  { id: 'watchlist', label: 'Screen Watchlists', icon: 'Lock',
    desc: 'Screen entities against sanctions, PEP, and adverse media lists',
    prompt: 'Which entities are within 2 hops of a watchlist match?' },
];

const ARTIFACT_SHOWCASE = [
  { label: 'Reports', icon: '\u{1F4C4}', desc: 'SAR narratives, risk assessments' },
  { label: 'Diagrams', icon: '\u{1F4CA}', desc: 'Flowcharts, entity networks' },
  { label: 'Dashboards', icon: '\u{1F310}', desc: 'Interactive tables, visualizations' },
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

const WORKSPACE_TABS = [
  { key: 'launcher', icon: 'Play', label: 'Launch' },
  { key: 'detail', icon: 'File', label: 'Case' },
  { key: 'analytics', icon: 'Charts', label: 'Analytics' },
  { key: 'assistant', icon: 'Sparkle', label: 'Copilot' },
  { key: 'pipeline', icon: 'Diagram3', label: 'Pipeline' },
  { key: 'architecture', icon: 'University', label: 'Architecture' },
];

function StatusBadge({ status }) {
  const config = STATUS_BADGES[status] || { variant: 'lightgray', label: status || 'Unknown' };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

function getContextualSubtitle(activeView, selectedCase) {
  switch (activeView) {
    case 'launcher': return 'Select a scenario to investigate';
    case 'detail': return selectedCase ? `Reviewing ${selectedCase.case_id}` : 'Select a case from the queue';
    case 'analytics': return 'Pipeline metrics and investigation analytics';
    case 'assistant': return 'Investigate entities, trace fund flows, and generate reports with ThreatSight';
    case 'pipeline': return 'LangGraph multi-agent architecture';
    case 'architecture': return '12 LangGraph agents powered by MongoDB, with durable human-in-the-loop review';
    default: return '';
  }
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
  const [pendingPrompt, setPendingPrompt] = useState(null);
  const [showAllTools, setShowAllTools] = useState(true);

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
        if (event.type === '_max_retries') {
          console.warn('Investigation stream: max reconnection attempts reached');
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
    total: total || investigations.length,
    filed: investigations.filter(i => i.investigation_status === 'filed').length,
  }), [investigations, total]);

  return (
    <div>
      <style>{GLOBAL_KEYFRAMES}</style>
      {/* Page Header with contextual subtitle */}
      <div style={{
        paddingBottom: spacing[2], marginBottom: spacing[3],
        borderBottom: `1px solid ${uiTokens.borderDefault}`,
      }}>
        <H2 style={{
          fontFamily: FONT, margin: 0, fontSize: '22px',
          fontWeight: 600, letterSpacing: '-0.02em',
        }}>
          Agentic Investigations
        </H2>
        <span style={{
          display: 'block', width: 40, height: 2,
          background: palette.green.dark1, borderRadius: 1, marginTop: 6,
        }} />
        <Body style={{
          color: palette.gray.dark1, fontFamily: FONT, fontSize: `${uiTokens.bodySize}px`, marginTop: 6,
          lineHeight: 1.6, maxWidth: 700,
        }}>
          {getContextualSubtitle(activeView, selectedCase)}
        </Body>
      </div>

      <div style={{ display: 'flex', gap: 0, minHeight: 'calc(100vh - 220px)' }}>
        {/* LEFT SIDEBAR — Overview + Queue + Live */}
        <aside
          aria-label="Investigation list"
          style={{
            width: 340,
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: 0,
            background: uiTokens.railBg,
            border: `1px solid ${uiTokens.borderDefault}`,
            borderRadius: 8,
            padding: `${spacing[3]}px ${spacing[3]}px ${spacing[2]}px`,
            marginRight: spacing[3],
            boxShadow: '0 1px 0 rgba(0,0,0,0.04)',
          }}
        >
          {/* Section: OVERVIEW */}
          <div style={{
            fontSize: uiTokens.captionSize, fontWeight: 600, fontFamily: FONT, color: palette.gray.base,
            textTransform: 'uppercase', letterSpacing: '0.06em',
            marginBottom: 8,
          }}>
            Overview
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: spacing[3] }}>
            <div style={{
              padding: '12px 14px', borderRadius: 8,
              background: uiTokens.surface1,
              border: `1px solid ${uiTokens.borderDefault}`,
              boxShadow: uiTokens.shadowCard,
            }}>
              <div style={{
                fontSize: 28, fontWeight: 700, fontFamily: FONT, color: palette.gray.dark3,
                fontVariantNumeric: 'tabular-nums', fontFeatureSettings: '"tnum"', lineHeight: 1.1,
              }}>
                {loading ? '\u2014' : kpis.total}
              </div>
              <div style={{
                fontSize: uiTokens.captionSize, color: palette.gray.base, fontFamily: FONT,
                marginTop: 4, letterSpacing: '0.02em',
              }}>
                Total Cases
              </div>
            </div>
            <div style={{
              padding: '12px 14px', borderRadius: 8,
              background: palette.green.light3,
              border: `1px solid ${palette.green.light1}`,
              borderLeft: `3px solid ${palette.green.dark1}`,
              boxShadow: uiTokens.shadowCard,
            }}>
              <div style={{
                fontSize: 28, fontWeight: 700, fontFamily: FONT, color: palette.green.dark2,
                fontVariantNumeric: 'tabular-nums', fontFeatureSettings: '"tnum"', lineHeight: 1.1,
              }}>
                {loading ? '\u2014' : kpis.filed}
              </div>
              <div style={{
                fontSize: uiTokens.captionSize, color: palette.green.dark1, fontFamily: FONT,
                marginTop: 4, letterSpacing: '0.02em',
              }}>
                SARs Filed
              </div>
            </div>
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
            <Button size="xsmall" onClick={() => setRefreshKey(k => k + 1)} aria-label="Refresh list">
              <Icon glyph="Refresh" size={14} />
            </Button>
            <Button size="xsmall" onClick={handleSeed} disabled={seeding} aria-label="Seed test data">
              {seeding ? '...' : <Icon glyph="Database" size={14} />}
            </Button>
          </div>

          {/* Divider */}
          <div style={{
            height: 1, background: uiTokens.borderDefault,
            margin: `0 0 ${spacing[2]}px`,
            flexShrink: 0,
          }} />
          {/* Section: QUEUE */}
          <div style={{
            fontSize: uiTokens.captionSize, fontWeight: 600, fontFamily: FONT, color: palette.gray.base,
            textTransform: 'uppercase', letterSpacing: '0.06em',
            marginBottom: 8,
          }}>
            Queue
          </div>

          {/* Status Filters */}
          <div
            style={{
              display: 'flex', flexWrap: 'wrap', gap: 0,
              background: palette.gray.light2, borderRadius: 8,
              padding: 3, marginBottom: spacing[3],
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
                    fontSize: uiTokens.captionSize,
                    fontFamily: FONT,
                    padding: '6px 10px',
                    borderRadius: 6,
                    border: isActive ? `1px solid ${uiTokens.borderDefault}` : '1px solid transparent',
                    background: isActive ? uiTokens.surface1 : 'transparent',
                    boxShadow: isActive ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                    color: isActive ? palette.gray.dark3 : palette.gray.dark1,
                    cursor: 'pointer',
                    fontWeight: isActive ? 600 : 500,
                    transition: uiTokens.transitionInteractive,
                    flex: '1 0 auto',
                  }}
                  onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.7)'; }}
                  onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
                >
                  {f.label}
                </button>
              );
            })}
          </div>

          {/* Cases sub-label */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            marginBottom: spacing[2],
          }}>
            <span style={{
              fontSize: uiTokens.captionSize, fontWeight: 600, fontFamily: FONT, color: palette.gray.base,
              textTransform: 'uppercase', letterSpacing: '0.06em',
            }}>
              Cases
            </span>
            <span style={{
              fontSize: uiTokens.captionSize, fontFamily: FONT, color: palette.gray.base,
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
                fontSize: uiTokens.labelSize, fontFamily: FONT, color: palette.red.dark2,
              }}>
                {error}
              </div>
            ) : filteredInvestigations.length === 0 ? (
              <div style={{
                padding: spacing[4],
                textAlign: 'center',
                color: palette.gray.dark1,
                fontSize: uiTokens.bodySize, fontFamily: FONT,
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
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleViewDetail(inv); } }}
                    className="inv-list-card"
                    style={{
                      display: 'flex',
                      borderRadius: 6,
                      cursor: 'pointer',
                      border: isSelected
                        ? `1px solid ${palette.blue.base}`
                        : `1px solid ${uiTokens.borderDefault}`,
                      borderLeft: isSelected
                        ? `3px solid ${palette.blue.base}`
                        : undefined,
                      background: isSelected ? palette.blue.light3 : uiTokens.surface1,
                      boxShadow: isSelected
                        ? uiTokens.shadowSelected
                        : uiTokens.shadowCard,
                      transition: uiTokens.transitionInteractive,
                      overflow: 'hidden',
                      outline: 'none',
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
                        e.currentTarget.style.boxShadow = uiTokens.shadowCard;
                        e.currentTarget.style.borderColor = uiTokens.borderDefault;
                      }
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.outline = `2px solid ${palette.blue.base}`;
                      e.currentTarget.style.outlineOffset = '2px';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.outline = 'none';
                    }}
                  >
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
                          fontSize: uiTokens.bodySize, fontWeight: 600, fontFamily: FONT, color: palette.gray.dark3,
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 180,
                        }}>
                          {inv.case_id}
                        </span>
                        <StatusBadge status={inv.investigation_status} />
                      </div>
                      <div style={{
                        fontSize: uiTokens.labelSize, color: palette.gray.dark1, fontFamily: FONT,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {inv.entity_name || inv.case_file?.entity?.name || inv.entity_id || inv.alert_data?.entity_id || 'N/A'}
                        {riskScore !== undefined && (
                          <span style={{
                            marginLeft: 8, fontWeight: 600, fontSize: uiTokens.captionSize,
                            color: riskScore > 70 ? palette.red.dark2
                              : riskScore > 25 ? palette.yellow.dark2
                              : palette.green.dark1,
                          }}>
                            Risk {riskScore}
                          </span>
                        )}
                      </div>
                      <div style={{
                        fontSize: uiTokens.captionSize, color: palette.gray.base, fontFamily: FONT, marginTop: 3,
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
              padding: '6px 8px', flexShrink: 0,
              background: palette.gray.light3, borderRadius: 6,
              border: `1px solid ${uiTokens.borderDefault}`,
              marginTop: spacing[2],
            }}>
              <button
                onClick={() => setListPage(p => Math.max(0, p - 1))}
                disabled={listPage === 0}
                style={{
                  fontSize: uiTokens.captionSize, fontFamily: FONT, padding: '6px 12px', borderRadius: 6,
                  minWidth: 72,
                  border: `1px solid ${uiTokens.borderDefault}`, background: uiTokens.surface1,
                  color: listPage === 0 ? palette.gray.light1 : palette.gray.dark1,
                  cursor: listPage === 0 ? 'not-allowed' : 'pointer',
                  opacity: listPage === 0 ? 0.45 : 1,
                  transition: uiTokens.transitionInteractive,
                }}
              >
                Prev
              </button>
              <span style={{
                fontSize: uiTokens.captionSize, fontFamily: FONT, color: palette.gray.dark2,
                fontVariantNumeric: 'tabular-nums',
              }}>
                Page {listPage + 1} of {totalPages}
              </span>
              <button
                onClick={() => setListPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={listPage >= totalPages - 1}
                style={{
                  fontSize: uiTokens.captionSize, fontFamily: FONT, padding: '6px 12px', borderRadius: 6,
                  minWidth: 72,
                  border: `1px solid ${uiTokens.borderDefault}`, background: uiTokens.surface1,
                  color: listPage >= totalPages - 1 ? palette.gray.light1 : palette.gray.dark1,
                  cursor: listPage >= totalPages - 1 ? 'not-allowed' : 'pointer',
                  opacity: listPage >= totalPages - 1 ? 0.45 : 1,
                  transition: uiTokens.transitionInteractive,
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

          {/* Section: LIVE */}
          <div style={{
            fontSize: uiTokens.captionSize, fontWeight: 600, fontFamily: FONT, color: palette.gray.base,
            textTransform: 'uppercase', letterSpacing: '0.06em',
            marginBottom: 8, flexShrink: 0,
          }}>
            Live
          </div>
          <ChangeStreamConsole onInvestigationChange={handleChangeStreamInvestigation} />

        </aside>

        {/* RIGHT WORKSPACE */}
        <section aria-label="Investigation workspace" style={{ flex: 1, minWidth: 0 }}>
          {/* Workspace Tab Bar */}
          <div role="tablist" style={{
            display: 'flex', gap: 0, marginBottom: spacing[3],
            borderBottom: `2px solid ${uiTokens.borderDefault}`,
            background: uiTokens.surface1,
            borderRadius: '8px 8px 0 0',
            padding: '0 4px',
          }}>
            {WORKSPACE_TABS.map(tab => {
              const isActive = activeView === tab.key;
              const isDisabled = tab.key === 'detail' && !selectedCase;
              return (
                <button
                  key={tab.key}
                  onClick={() => !isDisabled && setActiveView(tab.key)}
                  disabled={isDisabled}
                  aria-selected={isActive}
                  role="tab"
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '10px 16px',
                    fontFamily: FONT,
                    fontSize: uiTokens.labelSize,
                    fontWeight: isActive ? 600 : 400,
                    color: isActive ? palette.green.dark2 : isDisabled ? palette.gray.light1 : palette.gray.dark1,
                    background: 'transparent',
                    border: 'none',
                    borderBottom: isActive ? `3px solid ${palette.green.dark1}` : '3px solid transparent',
                    marginBottom: -2,
                    cursor: isDisabled ? 'default' : 'pointer',
                    transition: `all ${uiTokens.transitionFast}`,
                    opacity: isDisabled ? 0.4 : 1,
                  }}
                  onMouseEnter={e => { if (!isActive && !isDisabled) e.currentTarget.style.background = palette.gray.light3; }}
                  onMouseLeave={e => { if (!isActive && !isDisabled) e.currentTarget.style.background = 'transparent'; }}
                >
                  <Icon glyph={tab.icon} size={14} />
                  {tab.label}
                </button>
              );
            })}
          </div>

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
            <div style={{ display: 'flex', gap: spacing[3], height: 'calc(100vh - 180px)', overflow: 'hidden' }}>
              <div style={{ flex: 1, minWidth: 0, height: '100%' }}>
                <ChatBubble
                  embedded={true}
                  pageContext={selectedCase ? {
                    type: 'investigation',
                    caseId: selectedCase.case_id,
                    entityId: selectedCase.entity_id,
                  } : null}
                  initialPrompt={pendingPrompt}
                />
              </div>
              <aside style={{
                width: 280, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: spacing[2],
                overflowY: 'auto', height: '100%', minHeight: 0,
              }}>
                {/* Section 1: What I Can Do */}
                <Card style={{ padding: spacing[2], flexShrink: 0 }}>
                  <Subtitle style={{ fontFamily: FONT, fontSize: uiTokens.bodySize, margin: 0, marginBottom: spacing[1] }}>
                    What I Can Do
                  </Subtitle>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {CAPABILITY_CARDS.map(cap => (
                      <button
                        key={cap.id}
                        onClick={() => setPendingPrompt({ text: cap.prompt, ts: Date.now() })}
                        style={{
                          display: 'flex', alignItems: 'flex-start', gap: 8,
                          padding: '8px 10px', borderRadius: 8,
                          background: '#fff', border: `1px solid ${palette.gray.light2}`,
                          cursor: 'pointer', textAlign: 'left',
                          transition: uiTokens.transitionInteractive,
                        }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = palette.green.light1; e.currentTarget.style.background = palette.green.light3 + '40'; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = palette.gray.light2; e.currentTarget.style.background = '#fff'; }}
                      >
                        <Icon glyph={cap.icon} size={16} style={{ color: palette.green.dark1, flexShrink: 0, marginTop: 1 }} />
                        <div>
                          <div style={{ fontSize: uiTokens.labelSize, fontFamily: FONT, fontWeight: 600, color: palette.gray.dark2 }}>
                            {cap.label}
                          </div>
                          <div style={{ fontSize: uiTokens.captionSize, fontFamily: FONT, color: palette.gray.dark1, lineHeight: 1.4, marginTop: 1 }}>
                            {cap.desc}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </Card>

                {/* Section 2: Output Types */}
                <Card style={{ padding: spacing[2], flexShrink: 0 }}>
                  <Subtitle style={{ fontFamily: FONT, fontSize: uiTokens.bodySize, margin: 0, marginBottom: spacing[1] }}>
                    Output Types
                  </Subtitle>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {ARTIFACT_SHOWCASE.map(at => (
                      <div key={at.label} style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '8px 10px', borderRadius: 8,
                        background: palette.gray.light3, border: `1px solid ${palette.gray.light2}`,
                        fontFamily: FONT,
                      }}>
                        <div style={{
                          width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                          background: '#fff', border: `1px solid ${palette.gray.light2}`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 16,
                        }}>
                          {at.icon}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 600, color: palette.gray.dark2, fontSize: uiTokens.labelSize }}>{at.label}</div>
                          <div style={{ color: palette.gray.dark1, fontSize: uiTokens.captionSize, lineHeight: 1.3 }}>{at.desc}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>

                {/* Section 3: All Tools (open by default) */}
                <Card style={{ padding: spacing[2], flex: '1 1 0', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                  <button
                    onClick={() => setShowAllTools(prev => !prev)}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: 0, background: 'none', border: 'none', cursor: 'pointer',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Subtitle style={{ fontFamily: FONT, fontSize: uiTokens.bodySize, margin: 0 }}>
                        All Tools
                      </Subtitle>
                      <span style={{
                        fontSize: uiTokens.captionSize, fontFamily: FONT, fontWeight: 600,
                        padding: '2px 6px', borderRadius: 4,
                        background: palette.green.light3, color: palette.green.dark1,
                        border: `1px solid ${palette.green.light1}`,
                      }}>
                        {CAPABILITY_CATEGORIES.reduce((n, c) => n + c.tools.length, 0)}
                      </span>
                    </div>
                    <Icon glyph={showAllTools ? 'ChevronDown' : 'ChevronRight'} size={12} />
                  </button>
                  {showAllTools && (
                    <div style={{ marginTop: spacing[1], overflowY: 'auto', flex: '1 1 0', minHeight: 0 }}>
                      {CAPABILITY_CATEGORIES.map(cat => {
                        const isExpanded = expandedCaps[cat.id];
                        return (
                          <div key={cat.id} style={{ marginBottom: 2 }}>
                            <button
                              onClick={() => setExpandedCaps(prev => ({ ...prev, [cat.id]: !prev[cat.id] }))}
                              style={{
                                width: '100%', display: 'flex', alignItems: 'center', gap: 6,
                                padding: '6px 4px', fontSize: uiTokens.labelSize, fontFamily: FONT, fontWeight: 500,
                                color: palette.gray.dark2, background: 'none', border: 'none',
                                cursor: 'pointer', borderRadius: 4,
                                transition: uiTokens.transitionInteractive,
                              }}
                              onMouseEnter={e => { e.currentTarget.style.background = palette.gray.light3; }}
                              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                            >
                              <Icon glyph={cat.icon} size={14} />
                              <span style={{ flex: 1, textAlign: 'left' }}>{cat.label}</span>
                              <span style={{
                                fontSize: uiTokens.captionSize, color: palette.gray.base, fontWeight: 400,
                                marginRight: 4,
                              }}>
                                {cat.tools.length}
                              </span>
                              <Icon glyph={isExpanded ? 'ChevronDown' : 'ChevronRight'} size={12} />
                            </button>
                            {isExpanded && (
                              <div style={{ paddingLeft: 24, paddingBottom: 4 }}>
                                {cat.tools.map(tool => (
                                  <div key={tool.name} style={{
                                    padding: '4px 0',
                                    borderBottom: `1px solid ${palette.gray.light3}`,
                                    fontSize: uiTokens.captionSize, fontFamily: FONT,
                                  }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}>
                                      <code style={{
                                        fontSize: 10, fontFamily: uiTokens.monoFont,
                                        color: palette.blue.dark1, fontWeight: 600,
                                      }}>
                                        {tool.name}
                                      </code>
                                      <span style={{
                                        fontSize: 10, padding: '0px 4px', borderRadius: 3,
                                        background: palette.green.light3, color: palette.green.dark2,
                                        fontFamily: uiTokens.monoFont, fontWeight: 600,
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
                    </div>
                  )}
                </Card>
              </aside>
            </div>
          )}
          {/* Keep Architecture panel mounted across workspace tab switches so user's
              sub-tab selection, highlight state, and scroll position are preserved.
              The `active` prop lets the panel pause timers/scroll effects while hidden. */}
          <div style={{ display: activeView === 'architecture' ? 'block' : 'none' }}>
            <ArchitectureReferencePanel active={activeView === 'architecture'} />
          </div>
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
                  <Body style={{ color: palette.gray.dark1, fontSize: `${uiTokens.labelSize}px`, fontFamily: FONT, marginTop: 2 }}>
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
                <AgenticPipelineGraph />
              </div>
            </Card>
          )}
        </section>
      </div>

    </div>
  );
}
