"use client";

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import Card from '@leafygreen-ui/card';
import Button from '@leafygreen-ui/button';
import TextInput from '@leafygreen-ui/text-input';
import Badge from '@leafygreen-ui/badge';
import Icon from '@leafygreen-ui/icon';
import { Body, Subtitle, H3 } from '@leafygreen-ui/typography';
import { palette } from '@leafygreen-ui/palette';
import { spacing } from '@leafygreen-ui/tokens';

import { Spinner } from '@leafygreen-ui/loading-indicator';

import { launchInvestigation, resumeInvestigation, fetchInvestigableEntities } from '@/lib/agent-api';
import AgenticPipelineGraph from './AgenticPipelineGraph';
import InvestigationInsightsPanel from './InvestigationInsightsPanel';
import { uiTokens } from './investigationTokens';

const FONT = uiTokens.font;

const INVESTIGATION_CATEGORIES = [
  {
    id: 'shell_company',
    title: 'Shell Company Network',
    description: 'Nominee directors, layering transactions, shell-to-shell flows. Triggers full investigation pipeline with network analysis.',
    alert_type: 'suspicious_structure',
    badge: { variant: 'red', label: 'High Risk' },
    entities: [
      { entity_id: 'shell_company_candidate_var0', label: 'Shell Co. Variant 0' },
      { entity_id: 'shell_company_candidate_var1', label: 'Shell Co. Variant 1' },
      { entity_id: 'shell_company_candidate_var2', label: 'Shell Co. Variant 2' },
    ],
    defaultTypology: 'typ_shell_company',
  },
  {
    id: 'pep_exposure',
    title: 'PEP Exposure',
    description: 'Politically exposed persons with high watchlist match scores and offshore transactions. Tests the full investigation pipeline on high-risk PEP entities.',
    alert_type: 'pep_alert',
    badge: { variant: 'yellow', label: 'PEP' },
    entities: [
      { entity_id: 'pep_individual_varied_0', label: 'PEP Individual 0' },
      { entity_id: 'pep_individual_varied_1', label: 'PEP Individual 1' },
      { entity_id: 'pep_individual_varied_2', label: 'PEP Individual 2' },
    ],
    defaultTypology: 'typ_pep_abuse',
  },
  {
    id: 'sanctions_evasion',
    title: 'Sanctions Evasion',
    description: 'Sanctioned organizations with complex corporate structures designed to evade detection. Critical risk entities.',
    alert_type: 'sanctions_alert',
    badge: { variant: 'red', label: 'Critical' },
    entities: [
      { entity_id: 'sanctioned_org_varied_0', label: 'Sanctioned Org 0' },
      { entity_id: 'sanctioned_org_varied_1', label: 'Sanctioned Org 1' },
      { entity_id: 'sanctioned_org_varied_2', label: 'Sanctioned Org 2' },
    ],
    defaultTypology: 'typ_sanctions_evasion',
  },
  {
    id: 'rapid_movement',
    title: 'Rapid Money Movement',
    description: 'Entities with high-velocity transactions just below reporting thresholds. Tests structuring / smurfing detection.',
    alert_type: 'suspicious_activity',
    badge: { variant: 'yellow', label: 'Suspicious' },
    entities: [
      { entity_id: 'rapid_mover_var0', label: 'Rapid Mover 0' },
      { entity_id: 'rapid_mover_var1', label: 'Rapid Mover 1' },
      { entity_id: 'rapid_mover_var2', label: 'Rapid Mover 2' },
    ],
    defaultTypology: 'typ_structuring',
  },
  {
    id: 'false_positive',
    title: 'Low Risk / False Positive',
    description: 'Low-risk routine entities that should be auto-closed by triage. Tests the 70-80% false positive auto-closure path.',
    alert_type: 'routine_monitoring',
    badge: { variant: 'green', label: 'Low Risk' },
    entities: [
      { entity_id: 'generic_individual', label: 'Generic Individual' },
      { entity_id: 'generic_organization', label: 'Generic Organization' },
    ],
    defaultTypology: null,
  },
  {
    id: 'hnwi',
    title: 'High-Net-Worth Investor',
    description: 'HNWI with complex international portfolios and trade-based flows. Tests nuanced risk assessment across jurisdictions.',
    alert_type: 'suspicious_activity',
    badge: { variant: 'blue', label: 'Complex' },
    entities: [
      { entity_id: 'hnwi_global_investor_0', label: 'HNWI Investor 0' },
      { entity_id: 'hnwi_global_investor_1', label: 'HNWI Investor 1' },
      { entity_id: 'hnwi_global_investor_2', label: 'HNWI Investor 2' },
    ],
    defaultTypology: 'typ_trade_based_ml',
  },
];

const AGENT_LABELS = {
  alert_ingestion: { label: 'Alert Ingested', glyph: 'Bell', color: palette.green.dark1, desc: 'Alert written to MongoDB, Change Stream triggers triage' },
  triage: { label: 'Triage Agent', glyph: 'MagnifyingGlass', color: palette.blue.base, desc: 'Risk scoring and disposition routing' },
  data_gathering: { label: 'Data Gathering', glyph: 'Charts', color: palette.purple.base, desc: 'Parallel evidence collection via Send API' },
  fetch_entity_profile: { label: 'Fetching Entity', glyph: 'Person', color: palette.purple.light1, desc: 'Loading entity profile and KYC data' },
  fetch_transactions: { label: 'Fetching Transactions', glyph: 'CreditCard', color: palette.purple.light1, desc: 'Querying transaction history and patterns' },
  fetch_network: { label: 'Analyzing Network', glyph: 'Diagram2', color: palette.purple.light1, desc: 'Running $graphLookup network traversal' },
  fetch_watchlist: { label: 'Screening Watchlists', glyph: 'Lock', color: palette.purple.light1, desc: 'Checking sanctions and PEP databases' },
  assemble_case: { label: 'Case Analyst', glyph: 'Folder', color: palette.green.dark1, desc: 'LLM-powered 360° profile synthesis and crime typology classification' },
  network_analyst: { label: 'Network Risk Analysis', glyph: 'Connect', color: palette.yellow.dark2, desc: 'Graph centrality and risk scoring (parallel)' },
  temporal_analyst: { label: 'Temporal Pattern Analysis', glyph: 'Clock', color: palette.yellow.dark2, desc: 'Structuring, velocity, round-trips, dormancy (parallel)' },
  trail_follower: { label: 'Trail Follower', glyph: 'ArrowRight', color: palette.blue.dark2, desc: 'LLM lead selection from network + temporal' },
  sub_investigation_dispatch: { label: 'Sub-Investigation Dispatch', glyph: 'Beaker', color: palette.purple.base, desc: 'Parallel mini-investigation fan-out' },
  narrative: { label: 'SAR Author', glyph: 'Edit', color: palette.green.base, desc: 'FinCEN 5Ws narrative with full evidence' },
  validation: { label: 'Compliance QA', glyph: 'Checkmark', color: palette.blue.dark1, desc: 'LLM-as-Judge quality gate' },
  human_review: { label: 'Human Review', glyph: 'Visibility', color: palette.red.base, desc: 'interrupt() durable pause for analyst' },
  finalize: { label: 'Finalizing Case', glyph: 'File', color: palette.green.dark2, desc: 'Persist investigation to MongoDB' },
  auto_close: { label: 'Auto-Closing', glyph: 'X', color: palette.gray.dark1, desc: 'False positive auto-closure' },
};

const TYPOLOGY_LABELS = {
  typ_shell_company: 'Shell Company Abuse',
  typ_pep_abuse: 'PEP Corruption / Abuse of Office',
  typ_sanctions_evasion: 'Sanctions Evasion',
  typ_structuring: 'Structuring / Smurfing',
  typ_trade_based_ml: 'Trade-Based Money Laundering',
};

const TOOL_FRIENDLY_NAMES = {
  get_entity_profile: 'Fetching Entity Profile (db.entities.findOne)',
  query_entity_transactions: 'Querying Transactions (aggregate pipeline)',
  analyze_entity_network: 'Analyzing Entity Network ($graphLookup)',
  screen_watchlists: 'Screening Watchlists (db.entities.find)',
  search_typologies: 'Searching Typology Library (Atlas Search RAG)',
  search_compliance_policies: 'Searching Compliance Policies (Atlas Search RAG)',
  compute_network_metrics: 'Computing Network Metrics ($graphLookup)',
  temporal_analysis: 'Temporal Pattern Analysis ($setWindowFields)',
  trace_ownership_chains: 'Tracing Ownership Chains ($graphLookup)',
};

// ---------------------------------------------------------------------------
// Event → Steps reducer
// ---------------------------------------------------------------------------

function buildSteps(events) {
  const steps = [];
  const stepMap = {};

  for (const evt of events) {
    if (evt.type === 'alert_ingested') {
      const step = {
        agent: 'alert_ingestion',
        status: 'complete',
        startTime: evt.timestamp,
        endTime: evt.timestamp,
        duration: 0,
        tools: [],
        llmOutputs: [],
        structuredOutput: { alert_id: evt.alert_id, entity_id: evt.entity_id, alert_type: evt.alert_type },
        statusLabel: `db.alerts.insertOne() — entity=${evt.entity_id || ''}`,
      };
      stepMap['alert_ingestion'] = step;
      steps.push(step);
    } else if (evt.type === 'pipeline_started' || evt.type === 'pipeline_resumed') {
      const agentName = evt.agent || 'triage';
      if (!stepMap[agentName]) {
        const step = {
          agent: agentName,
          status: 'running',
          startTime: evt.timestamp,
          endTime: null,
          duration: null,
          tools: [],
          llmOutputs: [],
          structuredOutput: null,
          statusLabel: '',
        };
        stepMap[agentName] = step;
        steps.push(step);
      }
    } else if (evt.type === 'agent_start') {
      const existing = stepMap[evt.agent];
      if (existing && existing.status === 'running') {
        // Agent restarted (e.g. human_review resumed after HITL pause) -- reuse step
        existing.startTime = evt.timestamp;
        existing.endTime = null;
        existing.duration = null;
        existing.tools = [];
        existing.llmOutputs = [];
        existing.structuredOutput = null;
        existing.statusLabel = '';
      } else {
        const step = {
          agent: evt.agent,
          status: 'running',
          startTime: evt.timestamp,
          endTime: null,
          duration: null,
          tools: [],
          llmOutputs: [],
          structuredOutput: null,
          statusLabel: '',
        };
        stepMap[evt.agent] = step;
        steps.push(step);
      }
    } else if (evt.type === 'agent_end') {
      const step = stepMap[evt.agent];
      if (step) {
        step.status = 'complete';
        step.endTime = evt.timestamp;
        step.statusLabel = evt.status || '';
        if (evt.output && Object.keys(evt.output).length > 0) {
          step.structuredOutput = evt.output;
        }
        if (step.startTime && step.endTime) {
          step.duration = new Date(step.endTime) - new Date(step.startTime);
        }
      }
    } else if (evt.type === 'tool_start') {
      const step = stepMap[evt.agent];
      if (step) {
        step.tools.push({
          tool: evt.tool,
          input: evt.input,
          output: null,
          startTime: evt.timestamp,
          endTime: null,
        });
      }
    } else if (evt.type === 'tool_end') {
      const step = stepMap[evt.agent];
      if (step) {
        const tool = [...step.tools].reverse().find(
          (t) => t.tool === evt.tool && !t.endTime
        );
        if (tool) {
          tool.output = evt.output;
          tool.endTime = evt.timestamp;
        }
      }
    } else if (evt.type === 'llm_end') {
      const step = stepMap[evt.agent];
      if (step) {
        step.llmOutputs.push({ output: evt.output, timestamp: evt.timestamp });
      }
    } else if (evt.type === 'error') {
      steps.push({ agent: '_error', status: 'error', message: evt.message });
    }
  }
  return steps;
}

// ---------------------------------------------------------------------------
// Confidence helpers
// ---------------------------------------------------------------------------

function getRiskLevel(score) {
  if (score >= 75) return { label: 'Critical', color: palette.red.base, bg: palette.red.light3 };
  if (score >= 50) return { label: 'High', color: palette.red.dark1, bg: palette.red.light3 };
  if (score >= 25) return { label: 'Moderate', color: palette.yellow.dark2, bg: palette.yellow.light3 };
  return { label: 'Low', color: palette.green.dark1, bg: palette.green.light3 };
}

function getConfidenceLevel(confidence) {
  if (confidence >= 0.8) return { label: 'High confidence', color: palette.green.dark1 };
  if (confidence >= 0.5) return { label: 'Moderate confidence', color: palette.yellow.dark2 };
  return { label: 'Low — manual review recommended', color: palette.red.base };
}

// ---------------------------------------------------------------------------
// Step categorization for progress counter
// ---------------------------------------------------------------------------

const AGENT_NODES = new Set([
  'triage',
  'assemble_case',
  'network_analyst',
  'temporal_analyst',
  'trail_follower',
  'narrative',
  'validation',
  'human_review',
  'finalize',
]);
const TOOL_NODES = new Set([
  'fetch_entity_profile',
  'fetch_transactions',
  'fetch_network',
  'fetch_watchlist',
  'mini_investigate',
]);

// ---------------------------------------------------------------------------
// SegmentedRiskBar
// ---------------------------------------------------------------------------

function SegmentedRiskBar({ score, height = 10 }) {
  const segments = [
    { max: 25, color: palette.green.base, label: 'Low' },
    { max: 50, color: palette.yellow.base, label: 'Moderate' },
    { max: 75, color: '#ed6c02', label: 'High' },
    { max: 100, color: palette.red.base, label: 'Critical' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ position: 'relative' }}>
        <div style={{
          display: 'flex', height, borderRadius: height / 2, overflow: 'hidden',
          background: palette.gray.light2,
          boxShadow: uiTokens.instrumentInsetShadow,
        }}>
          {segments.map((seg, i) => {
            const segStart = i === 0 ? 0 : segments[i - 1].max;
            const segEnd = seg.max;
            const filled = Math.max(0, Math.min(score - segStart, segEnd - segStart));
            const width = (segEnd - segStart);
            return (
              <div key={seg.label} style={{
                flex: width, position: 'relative',
                boxShadow: i < segments.length - 1 ? `inset -1px 0 0 ${palette.gray.light2}` : 'none',
              }}>
                <div style={{
                  position: 'absolute', inset: 0,
                  background: seg.color,
                  opacity: 0.15,
                }} />
                <div style={{
                  position: 'absolute', top: 0, bottom: 0, left: 0,
                  width: `${(filled / width) * 100}%`,
                  background: seg.color,
                  transition: 'width 0.5s ease',
                }} />
              </div>
            );
          })}
        </div>
        {[25, 50, 75].map(tick => (
          <div key={tick} style={{
            position: 'absolute', top: '50%', left: `${tick}%`,
            transform: 'translate(-50%, -50%)',
            width: 1, height: 4,
            background: 'rgba(20,23,26,0.12)',
            pointerEvents: 'none',
          }} />
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, fontFamily: FONT, color: palette.gray.base }}>
        <span>0</span>
        <span>25</span>
        <span>50</span>
        <span>75</span>
        <span>100</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ProgressHeader
// ---------------------------------------------------------------------------

function ProgressHeader({ steps, running }) {
  const agentSteps = steps.filter((s) => AGENT_NODES.has(s.agent));
  const completedAgents = agentSteps.filter((s) => s.status === 'complete').length;
  const totalAgents = agentSteps.length;

  const totalToolCalls = steps.reduce((sum, s) => sum + (s.tools?.length || 0), 0);

  const allSteps = steps.filter((s) => s.status !== 'error');
  const allCompleted = allSteps.filter((s) => s.status === 'complete').length;
  const pct = allSteps.length > 0 ? (allCompleted / allSteps.length) * 100 : 0;

  return (
    <div style={{ marginBottom: spacing[3] }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 6, fontFamily: FONT, fontSize: 12, color: palette.gray.dark1,
      }}>
        <span>
          {completedAgents}/{totalAgents} agents
          <span style={{ margin: '0 6px', color: palette.gray.light1 }}>·</span>
          {totalToolCalls} tool call{totalToolCalls !== 1 ? 's' : ''}
          {running && (
            <span style={{ marginLeft: 8, color: palette.blue.base, fontWeight: 600 }}>
              Running
              <span style={{ animation: 'shimmerText 1.5s ease-in-out infinite' }}>...</span>
            </span>
          )}
        </span>
      </div>
      <div style={{
        height: 10, borderRadius: 999, background: palette.gray.light2, overflow: 'hidden',
        position: 'relative',
        boxShadow: 'inset 0 1px 2px rgba(20, 23, 26, 0.06)',
      }}>
        <div style={{
          height: '100%', borderRadius: 999,
          background: running
            ? `linear-gradient(90deg, ${palette.green.light1}, ${palette.green.dark1})`
            : palette.green.dark1,
          width: `${pct}%`,
          transition: 'width 0.4s ease',
          position: 'relative',
        }}>
          {running && (
            <div style={{
              position: 'absolute', inset: 0,
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)',
              backgroundSize: '200% 100%',
              animation: 'shimmerBar 1.8s linear infinite',
              borderRadius: 999,
            }} />
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tool call helpers
// ---------------------------------------------------------------------------

function tryParseJSON(val) {
  if (val == null) return null;
  if (typeof val === 'object') return val;
  if (typeof val !== 'string') return null;
  try { return JSON.parse(val); } catch { return null; }
}

function summarizeValue(val) {
  if (val == null) return 'null';
  if (typeof val === 'string') return val.length > 120 ? val.slice(0, 120) + '...' : val;
  if (typeof val === 'number' || typeof val === 'boolean') return String(val);
  if (Array.isArray(val)) return `[${val.length} item${val.length !== 1 ? 's' : ''}]`;
  if (typeof val === 'object') {
    const keys = Object.keys(val);
    return `{${keys.length} field${keys.length !== 1 ? 's' : ''}}`;
  }
  return String(val);
}

function KeyValueRows({ data, labelColor }) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
  const entries = Object.entries(data);
  if (entries.length === 0) return null;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '3px 10px', alignItems: 'baseline' }}>
      {entries.map(([key, val]) => (
        <React.Fragment key={key}>
          <span style={{ color: labelColor, fontWeight: 600, fontSize: 10, whiteSpace: 'nowrap' }}>
            {key}
          </span>
          <span style={{ fontSize: 10, wordBreak: 'break-word' }}>
            {typeof val === 'object' && val !== null ? summarizeValue(val) : String(val ?? '')}
          </span>
        </React.Fragment>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// ToolCallDetail (enhanced)
// ---------------------------------------------------------------------------

function ToolCallDetail({ tool }) {
  const [open, setOpen] = useState(false);
  const [showRawOutput, setShowRawOutput] = useState(false);
  const friendlyName = TOOL_FRIENDLY_NAMES[tool.tool] || tool.tool;
  const isRunning = !tool.endTime;

  const parsedInput = useMemo(() => tryParseJSON(tool.input), [tool.input]);
  const parsedOutput = useMemo(() => tryParseJSON(tool.output), [tool.output]);

  return (
    <div style={{ marginBottom: 6 }}>
      <div
        onClick={() => setOpen(!open)}
        style={{
          display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer',
          fontFamily: FONT, fontSize: 11, color: palette.gray.dark2,
          padding: '2px 0', borderRadius: 4,
          transition: 'background 0.12s',
        }}
        onMouseEnter={e => e.currentTarget.style.background = palette.blue.light3}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
      >
        <span style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: 14, height: 14, transition: 'transform 0.15s',
          transform: open ? 'rotate(90deg)' : 'rotate(0deg)',
          color: palette.blue.base,
        }}>
          <Icon glyph="ChevronRight" size={12} />
        </span>
        <span style={{ fontWeight: 500 }}>{friendlyName}</span>
        {isRunning && (
          <span style={{
            fontSize: 10, padding: '1px 6px', borderRadius: 3,
            background: palette.blue.light3, color: palette.blue.base,
            fontWeight: 500, animation: 'shimmerText 1.5s ease-in-out infinite',
          }}>
            processing...
          </span>
        )}
      </div>
      {open && (
        <div style={{ marginLeft: 20, marginTop: 6, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {/* Input section */}
          {tool.input && (
            <div style={{
              padding: '6px 10px', borderRadius: 4,
              background: palette.blue.light3,
              fontFamily: "'Source Code Pro', monospace",
              lineHeight: 1.6,
            }}>
              <span style={{
                display: 'inline-block', fontSize: 9, fontWeight: 700,
                padding: '2px 6px', borderRadius: 4, marginBottom: 4,
                background: palette.blue.light3, color: palette.blue.dark1,
              }}>IN</span>
              {parsedInput && typeof parsedInput === 'object' && !Array.isArray(parsedInput) ? (
                <KeyValueRows data={parsedInput} labelColor={palette.blue.dark2} />
              ) : (
                <div style={{ fontSize: 10, color: palette.blue.dark2, wordBreak: 'break-word' }}>
                  {typeof tool.input === 'object' ? JSON.stringify(tool.input, null, 2) : tool.input}
                </div>
              )}
            </div>
          )}
          {/* Output section */}
          {tool.output && (
            <div style={{
              padding: '6px 10px', borderRadius: 4,
              background: palette.green.light3,
              fontFamily: "'Source Code Pro', monospace",
              lineHeight: 1.6,
            }}>
              <span style={{
                display: 'inline-block', fontSize: 9, fontWeight: 700,
                padding: '2px 6px', borderRadius: 4, marginBottom: 4,
                background: palette.green.light3, color: palette.green.dark2,
              }}>OUT</span>
              {parsedOutput && typeof parsedOutput === 'object' ? (
                <>
                  <KeyValueRows
                    data={
                      Array.isArray(parsedOutput)
                        ? { items: `${parsedOutput.length} results` }
                        : Object.fromEntries(
                            Object.entries(parsedOutput).map(([k, v]) => [k, summarizeValue(v)])
                          )
                    }
                    labelColor={palette.green.dark2}
                  />
                  <button
                    onClick={(e) => { e.stopPropagation(); setShowRawOutput(!showRawOutput); }}
                    style={{
                      fontSize: 9, fontFamily: FONT, color: palette.green.dark1, background: 'none',
                      border: 'none', cursor: 'pointer', padding: 0, marginTop: 4,
                    }}
                  >
                    {showRawOutput ? 'Hide raw JSON' : 'Show raw JSON'}
                  </button>
                  {showRawOutput && (
                    <div style={{
                      marginTop: 4, padding: '4px 8px', borderRadius: 3,
                      background: palette.gray.dark3, color: palette.gray.light2,
                      fontSize: 9, maxHeight: 180, overflowY: 'auto',
                      whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                    }}>
                      {JSON.stringify(parsedOutput, null, 2)}
                    </div>
                  )}
                </>
              ) : (
                <div style={{
                  fontSize: 10, color: palette.green.dark2, wordBreak: 'break-word',
                  maxHeight: 180, overflowY: 'auto', whiteSpace: 'pre-wrap',
                }}>
                  {typeof tool.output === 'object' ? JSON.stringify(tool.output, null, 2) : tool.output}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// StructuredOutputCard (enhanced with calibrated confidence)
// ---------------------------------------------------------------------------

function StructuredOutputCard({ agent, output }) {
  const [showReasoning, setShowReasoning] = useState(false);
  const [showFallbackRaw, setShowFallbackRaw] = useState(false);

  if (!output || Object.keys(output).length === 0) return null;

  if (output.triage_decision) {
    const td = output.triage_decision;
    const risk = getRiskLevel(td.risk_score);
    return (
      <div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-start', marginBottom: 8 }}>
          <div>
            <div style={{ fontSize: 10, color: palette.gray.base, fontFamily: FONT, marginBottom: 2 }}>Risk Score</div>
            <div style={{
              fontSize: 22, fontWeight: 700, fontFamily: FONT, color: risk.color,
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              {td.risk_score}
              <span style={{
                fontSize: 10, fontWeight: 500, padding: '2px 8px', borderRadius: 4,
                background: risk.bg, color: risk.color,
              }}>
                {risk.label}
              </span>
            </div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: palette.gray.base, fontFamily: FONT, marginBottom: 2 }}>Disposition</div>
            <Badge variant={td.disposition === 'auto_close' ? 'lightgray' : 'blue'}>
              {td.disposition}
            </Badge>
          </div>
        </div>
        <div style={{ marginBottom: 6 }}>
          <SegmentedRiskBar score={td.risk_score} />
        </div>
        {td.reasoning && (
          <div style={{ fontSize: 12, color: palette.gray.dark2, fontFamily: FONT, lineHeight: 1.6 }}>
            {formatReasoning(td.reasoning)}
          </div>
        )}
      </div>
    );
  }

  if (output.typology) {
    const ty = output.typology;
    const conf = ty.confidence != null ? ty.confidence : null;
    const confPct = conf != null ? Math.round(conf * 100) : null;
    const confLevel = conf != null ? getConfidenceLevel(conf) : null;
    return (
      <div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginBottom: 8 }}>
          <Badge variant="yellow">{ty.primary_typology || 'unknown'}</Badge>
          {confPct !== null && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 100, height: 8, borderRadius: 4, background: palette.gray.light2, overflow: 'hidden' }}>
                <div style={{
                  height: '100%', borderRadius: 4, width: `${confPct}%`,
                  background: confLevel.color,
                  transition: 'width 0.5s ease',
                }} />
              </div>
              <span style={{ fontSize: 12, fontFamily: FONT, fontWeight: 600, color: confLevel.color }}>
                {confPct}%
              </span>
              <span style={{ fontSize: 10, fontFamily: FONT, color: confLevel.color }}>
                {confLevel.label}
              </span>
            </div>
          )}
        </div>
        {ty.red_flags?.length > 0 && (
          <div style={{ marginBottom: 6 }}>
            <div style={{ fontSize: 10, color: palette.gray.base, fontFamily: FONT, marginBottom: 4 }}>Red Flags</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {ty.red_flags.map((rf, i) => (
                <span key={i} style={{
                  fontSize: 10, fontFamily: FONT, padding: '2px 8px',
                  borderRadius: 3, background: palette.red.light3, color: palette.red.dark2,
                }}>
                  {rf}
                </span>
              ))}
            </div>
          </div>
        )}
        {ty.reasoning && (
          <ReasoningBlock text={ty.reasoning} open={showReasoning} onToggle={() => setShowReasoning(!showReasoning)} />
        )}
      </div>
    );
  }

  if (output.narrative) {
    const nr = output.narrative;
    return (
      <div>
        {nr.introduction && (
          <div style={{ fontSize: 12, color: palette.gray.dark2, fontFamily: FONT, lineHeight: 1.6 }}>
            {nr.introduction.length > 300 ? nr.introduction.slice(0, 300) + '...' : nr.introduction}
          </div>
        )}
        {nr.cited_evidence?.length > 0 && (
          <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center' }}>
            <span style={{ fontSize: 10, color: palette.gray.base, fontFamily: FONT }}>
              Cited evidence:
            </span>
            {nr.cited_evidence.slice(0, 5).map((cite, i) => (
              <span key={i} style={{
                fontSize: 9, padding: '1px 6px', borderRadius: 3,
                background: palette.blue.light3, color: palette.blue.dark1, fontFamily: FONT,
              }}>
                {cite}
              </span>
            ))}
            {nr.cited_evidence.length > 5 && (
              <span style={{ fontSize: 9, color: palette.gray.base, fontFamily: FONT }}>
                +{nr.cited_evidence.length - 5} more
              </span>
            )}
          </div>
        )}
      </div>
    );
  }

  if (output.validation_result) {
    const vr = output.validation_result;
    const scorePct = vr.score != null ? Math.round(vr.score * 100) : null;
    return (
      <div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', marginBottom: 6 }}>
          <Badge variant={vr.is_valid ? 'green' : 'yellow'}>{vr.is_valid ? 'Passed' : 'Issues Found'}</Badge>
          {scorePct != null && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 60, height: 6, borderRadius: 3, background: palette.gray.light2, overflow: 'hidden' }}>
                <div style={{
                  height: '100%', borderRadius: 3, width: `${scorePct}%`,
                  background: scorePct >= 80 ? palette.green.dark1 : palette.yellow.base,
                }} />
              </div>
              <span style={{ fontSize: 12, fontFamily: FONT, color: palette.gray.dark1 }}>{scorePct}%</span>
            </div>
          )}
          {vr.route_to && (
            <span style={{ fontSize: 10, fontFamily: FONT, color: palette.gray.dark1 }}>
              → routing to <strong>{vr.route_to}</strong>
            </span>
          )}
        </div>
        {vr.issues?.length > 0 && (
          <div>
            {vr.issues.map((issue, i) => (
              <div key={i} style={{ fontSize: 11, fontFamily: FONT, color: palette.yellow.dark2, marginTop: 2 }}>
                • {issue}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (output.network_analysis) {
    const na = output.network_analysis;
    return (
      <div>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 6 }}>
          {na.network_size != null && (
            <div>
              <div style={{ fontSize: 10, color: palette.gray.base, fontFamily: FONT }}>Network Size</div>
              <div style={{ fontSize: 16, fontWeight: 700, fontFamily: FONT }}>{na.network_size}</div>
            </div>
          )}
          {na.high_risk_connections != null && (
            <div>
              <div style={{ fontSize: 10, color: palette.gray.base, fontFamily: FONT }}>High-Risk Links</div>
              <div style={{ fontSize: 16, fontWeight: 700, fontFamily: FONT, color: palette.red.base }}>{na.high_risk_connections}</div>
            </div>
          )}
          {na.degree_centrality != null && (
            <div>
              <div style={{ fontSize: 10, color: palette.gray.base, fontFamily: FONT }}>Degree Centrality</div>
              <div style={{ fontSize: 16, fontWeight: 700, fontFamily: FONT }}>{na.degree_centrality.toFixed(3)}</div>
            </div>
          )}
          {na.network_risk_score != null && (
            <div>
              <div style={{ fontSize: 10, color: palette.gray.base, fontFamily: FONT }}>Network Risk</div>
              <div style={{ fontSize: 16, fontWeight: 700, fontFamily: FONT, color: na.network_risk_score >= 60 ? palette.red.base : palette.gray.dark2 }}>{na.network_risk_score.toFixed(1)}/100</div>
            </div>
          )}
        </div>
        {na.shell_structure_indicators?.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 6 }}>
            {na.shell_structure_indicators.map((ind, i) => (
              <span key={i} style={{
                fontSize: 10, fontFamily: FONT, padding: '2px 6px',
                borderRadius: 3, background: palette.red.light3, color: palette.red.dark2,
              }}>{ind}</span>
            ))}
          </div>
        )}
        {na.summary && (
          <div style={{ fontSize: 12, color: palette.gray.dark2, fontFamily: FONT, lineHeight: 1.5 }}>
            {na.summary}
          </div>
        )}
      </div>
    );
  }

  if (output.temporal_analysis) {
    const ta = output.temporal_analysis;
    const patternCounts = [
      { label: 'Structuring', count: ta.structuring_indicators?.length || 0, color: palette.red.dark2, bg: palette.red.light3 },
      { label: 'Velocity', count: ta.velocity_anomalies?.length || 0, color: palette.yellow.dark2, bg: palette.yellow.light3 },
      { label: 'Round-Trips', count: ta.round_trip_patterns?.length || 0, color: palette.red.dark2, bg: palette.red.light3 },
      { label: 'Dormancy', count: ta.dormancy_bursts?.length || 0, color: palette.yellow.dark2, bg: palette.yellow.light3 },
    ];
    return (
      <div>
        {ta.timeline_summary && (
          <div style={{ fontSize: 12, color: palette.gray.dark2, fontFamily: FONT, lineHeight: 1.6, marginBottom: 8 }}>
            {ta.timeline_summary}
          </div>
        )}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {patternCounts.map((p) => (
            <span key={p.label} style={{
              fontSize: 10, fontFamily: FONT, padding: '3px 8px', borderRadius: 4,
              background: p.count > 0 ? p.bg : palette.gray.light3,
              color: p.count > 0 ? p.color : palette.gray.base,
              fontWeight: p.count > 0 ? 600 : 400,
            }}>
              {p.label}: {p.count}
            </span>
          ))}
        </div>
      </div>
    );
  }

  if (output.trail_analysis) {
    const trail = output.trail_analysis;
    const leads = trail.leads || [];
    return (
      <div>
        <div style={{ display: 'flex', gap: 12, marginBottom: 6 }}>
          <div>
            <div style={{ fontSize: 10, color: palette.gray.base, fontFamily: FONT }}>Leads</div>
            <div style={{ fontSize: 16, fontWeight: 700, fontFamily: FONT }}>{leads.length}</div>
          </div>
          {trail.ownership_chains?.length > 0 && (
            <div>
              <div style={{ fontSize: 10, color: palette.gray.base, fontFamily: FONT }}>Ownership Chains</div>
              <div style={{ fontSize: 16, fontWeight: 700, fontFamily: FONT }}>{trail.ownership_chains.length}</div>
            </div>
          )}
        </div>
        {leads.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {leads.map((lead, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap',
                padding: '4px 8px', borderRadius: 4,
                background: lead.priority === 'high' ? palette.red.light3 : palette.gray.light3,
                fontSize: 11, fontFamily: FONT,
              }}>
                <span style={{
                  fontSize: 9, padding: '1px 5px', borderRadius: 3, fontWeight: 600,
                  background: lead.priority === 'high' ? palette.red.base : lead.priority === 'medium' ? palette.yellow.base : palette.gray.base,
                  color: '#fff',
                }}>{lead.priority}</span>
                <span style={{ fontWeight: 600 }}>{lead.entity_name || lead.entity_id}</span>
                {lead.reason && (
                  <span style={{ color: palette.gray.dark1 }}>
                    — {lead.reason.length > 60 ? lead.reason.slice(0, 60) + '...' : lead.reason}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (output.sub_investigation_findings) {
    const findings = output.sub_investigation_findings;
    const entries = Object.entries(findings);
    return (
      <div>
        {entries.map(([entityId, assessment]) => (
          <div key={entityId} style={{
            padding: '6px 8px', borderRadius: 4, marginBottom: 4,
            background: assessment.risk_level === 'critical' || assessment.risk_level === 'high' ? palette.red.light3 : palette.gray.light3,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: assessment.key_findings?.length > 0 ? 4 : 0 }}>
              <span style={{ fontSize: 11, fontWeight: 600, fontFamily: FONT }}>
                {assessment.entity_name || entityId}
              </span>
              <span style={{
                fontSize: 9, padding: '1px 5px', borderRadius: 3, fontWeight: 600,
                background: assessment.risk_level === 'critical' || assessment.risk_level === 'high' ? palette.red.base : assessment.risk_level === 'medium' ? palette.yellow.base : palette.green.base,
                color: '#fff',
              }}>{assessment.risk_level} ({assessment.risk_score})</span>
              <span style={{
                fontSize: 9, padding: '1px 5px', borderRadius: 3,
                background: assessment.recommendation === 'escalate' ? palette.red.light3 : palette.gray.light2,
                color: assessment.recommendation === 'escalate' ? palette.red.dark2 : palette.gray.dark1,
                fontFamily: FONT,
              }}>{assessment.recommendation}</span>
            </div>
            {assessment.key_findings?.length > 0 && (
              <ul style={{ margin: 0, paddingLeft: 16 }}>
                {assessment.key_findings.slice(0, 3).map((f, i) => (
                  <li key={i} style={{ fontSize: 10, fontFamily: FONT, lineHeight: 1.5, color: palette.gray.dark2 }}>{f}</li>
                ))}
                {assessment.key_findings.length > 3 && (
                  <li style={{ fontSize: 10, fontFamily: FONT, color: palette.gray.base }}>
                    +{assessment.key_findings.length - 3} more
                  </li>
                )}
              </ul>
            )}
          </div>
        ))}
      </div>
    );
  }

  if (output.case_file) {
    const cf = output.case_file;
    const entity = cf.entity;
    const txns = cf.transactions;
    return (
      <div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 8 }}>
          {entity?.name && (
            <div>
              <div style={{ fontSize: 10, color: palette.gray.base, fontFamily: FONT }}>Entity</div>
              <div style={{ fontSize: 13, fontWeight: 600, fontFamily: FONT }}>{entity.name}</div>
            </div>
          )}
          {entity?.risk_score != null && (
            <div>
              <div style={{ fontSize: 10, color: palette.gray.base, fontFamily: FONT }}>Risk Score</div>
              <div style={{ fontSize: 13, fontWeight: 700, fontFamily: FONT, color: getRiskLevel(entity.risk_score).color }}>{entity.risk_score}</div>
            </div>
          )}
          {txns?.total_count != null && (
            <div>
              <div style={{ fontSize: 10, color: palette.gray.base, fontFamily: FONT }}>Transactions</div>
              <div style={{ fontSize: 13, fontWeight: 600, fontFamily: FONT }}>{txns.total_count}</div>
            </div>
          )}
          {cf.key_findings?.length > 0 && (
            <div>
              <div style={{ fontSize: 10, color: palette.gray.base, fontFamily: FONT }}>Key Findings</div>
              <div style={{ fontSize: 13, fontWeight: 600, fontFamily: FONT }}>{cf.key_findings.length}</div>
            </div>
          )}
        </div>
        {output.typology && (() => {
          const ty = output.typology;
          const conf = ty.confidence != null ? ty.confidence : null;
          const confPct = conf != null ? Math.round(conf * 100) : null;
          return (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <Badge variant="yellow">{ty.primary_typology || 'unknown'}</Badge>
              {confPct !== null && (
                <span style={{ fontSize: 11, fontFamily: FONT, fontWeight: 600, color: getConfidenceLevel(conf).color }}>
                  {confPct}% confidence
                </span>
              )}
            </div>
          );
        })()}
      </div>
    );
  }

  return (
    <div>
      <KeyValueRows
        data={Object.fromEntries(Object.entries(output).map(([k, v]) => [k, summarizeValue(v)]))}
        labelColor={palette.gray.dark1}
      />
      <button
        onClick={() => setShowFallbackRaw(!showFallbackRaw)}
        style={{
          fontSize: 9, fontFamily: FONT, color: palette.gray.dark1, background: 'none',
          border: 'none', cursor: 'pointer', padding: 0, marginTop: 6,
        }}
      >
        {showFallbackRaw ? 'Hide raw JSON' : 'Show raw JSON'}
      </button>
      {showFallbackRaw && (
        <div style={{
          marginTop: 4, fontFamily: "'Source Code Pro', monospace", fontSize: 10,
          color: palette.gray.dark1, lineHeight: 1.5,
          maxHeight: 160, overflowY: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
          padding: '4px 8px', borderRadius: 3, background: palette.gray.light3,
        }}>
          {JSON.stringify(output, null, 2)}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Reasoning formatting helper
// ---------------------------------------------------------------------------

function formatReasoning(text) {
  if (!text) return null;

  let paragraphs = text.split(/\n{2,}/);

  if (paragraphs.length === 1 && text.length > 200) {
    const sentences = text.match(/[^.!?]+[.!?]+(\s|$)/g) || [text];
    paragraphs = [];
    let current = '';
    for (const sentence of sentences) {
      current += sentence;
      if (current.length >= 150) {
        paragraphs.push(current.trim());
        current = '';
      }
    }
    if (current.trim()) paragraphs.push(current.trim());
  }

  return paragraphs.map((p, i) => (
    <p key={i} style={{ margin: 0, marginBottom: i < paragraphs.length - 1 ? 8 : 0 }}>
      {p.trim()}
    </p>
  ));
}

// ---------------------------------------------------------------------------
// ReasoningBlock
// ---------------------------------------------------------------------------

function ReasoningBlock({ text, open, onToggle }) {
  if (!text) return null;
  const preview = text.length > 120 ? text.slice(0, 120) + '...' : text;
  return (
    <div style={{ marginTop: 4 }}>
      {!open && (
        <div style={{ fontSize: 12, color: palette.gray.dark1, fontFamily: FONT, lineHeight: 1.6 }}>
          {preview}
        </div>
      )}
      {open && (
        <div style={{ fontSize: 12, color: palette.gray.dark2, fontFamily: FONT, lineHeight: 1.6 }}>
          {formatReasoning(text)}
        </div>
      )}
      {text.length > 120 && (
        <button
          onClick={onToggle}
          style={{
            fontSize: 10, fontFamily: FONT, color: palette.blue.base, background: 'none',
            border: 'none', cursor: 'pointer', padding: 0, marginTop: 2,
          }}
        >
          {open ? 'Show less' : 'Show full reasoning'}
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// AgentStepCard (enhanced with active reasoning indicator)
// ---------------------------------------------------------------------------

function AgentStepCard({ step, isLast, index = 0 }) {
  const [expanded, setExpanded] = useState(false);
  const [reasoningOpen, setReasoningOpen] = useState(false);
  const info = AGENT_LABELS[step.agent]
    || (step.agent?.startsWith('mini_investigate:')
      ? { label: `Mini-Investigate: ${step.agent.split(':')[1] || ''}`, glyph: 'Beaker', color: palette.purple.light1, desc: 'Sub-investigation of connected entity' }
      : { label: step.agent, glyph: 'Ellipsis', color: palette.gray.dark1 });
  const isRunning = step.status === 'running';
  const isComplete = step.status === 'complete';
  const hasDetail = step.tools.length > 0 || step.llmOutputs.length > 0 || step.structuredOutput;

  const dotSize = 12;
  const lineColor = isComplete ? info.color : palette.gray.light2;

  const reasoning = step.structuredOutput?.triage_decision?.reasoning
    || step.structuredOutput?.typology?.reasoning
    || step.structuredOutput?.validation_result?.issues?.join('; ')
    || null;

  return (
    <div style={{
      display: 'flex', minHeight: 48,
      animation: `fadeSlideIn ${uiTokens.transitionMedium} ease both`,
      animationDelay: `${index * 50}ms`,
    }}>
      {/* Timeline rail */}
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        width: 28, flexShrink: 0, position: 'relative',
      }}>
        <div style={{
          width: dotSize, height: dotSize, borderRadius: '50%', flexShrink: 0,
          background: isComplete ? info.color : isRunning ? 'transparent' : 'transparent',
          border: isRunning
            ? `2px solid ${palette.blue.base}`
            : isComplete
              ? 'none'
              : `2px solid ${palette.gray.light1}`,
          boxShadow: isRunning ? `0 0 0 3px ${palette.blue.light2}` : 'none',
          animation: isRunning ? 'dotPulse 1.5s ease-in-out infinite' : 'none',
          marginTop: 6,
        }} />
        {!isLast && (
          <div style={{
            flex: 1, width: 3, borderRadius: 2, background: lineColor, marginTop: 4, marginBottom: 0,
            opacity: isComplete ? 0.5 : 0.2,
          }} />
        )}
      </div>

      {/* Card */}
      <div style={{ flex: 1, paddingBottom: isLast ? 0 : 8, paddingLeft: 8 }}>
        {/* Header */}
        <div
          onClick={() => hasDetail && setExpanded(!expanded)}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            cursor: hasDetail ? 'pointer' : 'default',
            userSelect: 'none',
          }}
        >
          <Icon glyph={info.glyph || 'Ellipsis'} size={16} fill={info.color} />
          <span style={{
            fontSize: uiTokens.bodySize, fontWeight: 600, fontFamily: FONT, color: info.color,
          }}>
            {info.label}
          </span>
          {isRunning && (
            <span style={{
              fontSize: uiTokens.captionSize, fontFamily: FONT, color: palette.blue.base,
              display: 'flex', alignItems: 'center', gap: 4,
            }}>
              <span style={{
                width: 6, height: 6, borderRadius: '50%', background: palette.blue.base,
                animation: 'pulse-dot 1s ease-in-out infinite',
                display: 'inline-block',
              }} />
              {info.desc || 'processing...'}
            </span>
          )}
          {step.statusLabel && isComplete && (
            <Badge variant="lightgray" style={{ fontSize: uiTokens.captionSize }}>{step.statusLabel}</Badge>
          )}
          {hasDetail && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: 16, height: 16, fontSize: 9, color: palette.gray.dark1,
              transition: 'transform 0.15s',
              transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
              marginLeft: 'auto',
            }}>
              <Icon glyph="ChevronDown" size={14} />
            </span>
          )}
        </div>

        {/* Inline reasoning summary when completed (not expanded) */}
        {!expanded && isComplete && reasoning && (
          <div style={{ paddingLeft: 26, marginTop: 2 }}>
            <ReasoningBlock text={reasoning} open={reasoningOpen} onToggle={() => setReasoningOpen(!reasoningOpen)} />
          </div>
        )}

        {/* Inline tool count summary (collapsed) */}
        {!expanded && isComplete && !reasoning && step.tools.length > 0 && (
          <div style={{ fontSize: 10, color: palette.gray.base, fontFamily: FONT, marginTop: 2, paddingLeft: 26 }}>
            {step.tools.length} tool call{step.tools.length !== 1 ? 's' : ''}
            {step.llmOutputs.length > 0 ? ` · ${step.llmOutputs.length} LLM response${step.llmOutputs.length !== 1 ? 's' : ''}` : ''}
          </div>
        )}

        {/* Expanded detail */}
        {expanded && (
          <div style={{
            marginTop: 8, marginLeft: 0, padding: 12, borderRadius: 8,
            background: uiTokens.railBg, border: `1px solid ${uiTokens.borderDefault}`,
            boxShadow: uiTokens.shadowCard,
          }}>
            {step.tools.length > 0 && (
              <div style={{ marginBottom: step.llmOutputs.length > 0 || step.structuredOutput ? 10 : 0 }}>
                <div style={{
                  fontSize: 10, fontWeight: 600, fontFamily: FONT,
                  color: palette.gray.dark1, marginBottom: 6,
                  paddingBottom: 4, borderBottom: `1px solid ${palette.gray.light2}`,
                  textTransform: 'uppercase', letterSpacing: '0.5px',
                }}>
                  Tool Calls ({step.tools.length})
                </div>
                {step.tools.map((t, i) => <ToolCallDetail key={i} tool={t} />)}
              </div>
            )}

            {step.llmOutputs.length > 0 && (
              <div style={{ marginBottom: step.structuredOutput ? 10 : 0 }}>
                <div style={{
                  fontSize: 10, fontWeight: 600, fontFamily: FONT,
                  color: palette.gray.dark1, marginBottom: 6,
                  paddingBottom: 4, borderBottom: `1px solid ${palette.gray.light2}`,
                  textTransform: 'uppercase', letterSpacing: '0.5px',
                }}>
                  LLM Response
                </div>
                {step.llmOutputs.map((llm, i) => (
                  <div key={i} style={{
                    padding: '6px 10px', borderRadius: 4, marginBottom: 4,
                    background: palette.gray.dark3, color: palette.gray.light2,
                    fontFamily: "'Source Code Pro', monospace", fontSize: 10,
                    lineHeight: 1.5, maxHeight: 180, overflowY: 'auto',
                    whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                  }}>
                    {llm.output}
                  </div>
                ))}
              </div>
            )}

            {step.structuredOutput && (
              <div>
                <div style={{
                  fontSize: 10, fontWeight: 600, fontFamily: FONT,
                  color: palette.gray.dark1, marginBottom: 6,
                  paddingBottom: 4, borderBottom: `1px solid ${palette.gray.light2}`,
                  textTransform: 'uppercase', letterSpacing: '0.5px',
                }}>
                  Agent Output
                </div>
                <StructuredOutputCard agent={step.agent} output={step.structuredOutput} />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// AgentStepTimeline
// ---------------------------------------------------------------------------

function AgentStepTimeline({ events, running, startTime }) {
  const steps = useMemo(() => buildSteps(events), [events]);
  const nonErrorSteps = steps.filter((s) => s.status !== 'error');

  if (nonErrorSteps.length === 0 && !steps.some((s) => s.status === 'error')) return null;

  return (
    <Card style={{
      padding: spacing[3], marginBottom: spacing[3],
      border: `1px solid ${palette.gray.light2}`, background: '#fff',
    }}>
      <Subtitle style={{ fontFamily: FONT, marginBottom: spacing[2], fontSize: '14px' }}>
        Agent Pipeline Progress
      </Subtitle>
      <ProgressHeader steps={nonErrorSteps} running={running} />
      <div style={{ maxHeight: 600, overflowY: 'auto', paddingRight: 4 }}>
        {steps.map((step, i) => {
          if (step.status === 'error') {
            return (
              <div key={i} style={{
                padding: '8px 12px', marginBottom: 8, borderRadius: 6,
                background: palette.red.light3, border: `1px solid ${palette.red.light1}`,
              }}>
                <Body style={{ color: palette.red.dark2, fontWeight: 600, fontSize: 12, fontFamily: FONT }}>
                  Error: {step.message}
                </Body>
              </div>
            );
          }
          return (
            <AgentStepCard
              key={`${step.agent}-${i}`}
              step={step}
              isLast={i === steps.length - 1}
              index={i}
            />
          );
        })}
      </div>

    </Card>
  );
}

// ---------------------------------------------------------------------------
// HumanReviewPanel (enhanced with structured evidence review)
// ---------------------------------------------------------------------------

function HumanReviewPanel({ payload, accumulatedEvidence, analystNotes, onNotesChange, onDecision, disabled }) {
  const [evidenceReviewed, setEvidenceReviewed] = useState(false);
  const [expandedSections, setExpandedSections] = useState({});

  const toggleSection = (key) => {
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const riskScore = payload.triage_decision?.risk_score;
  const risk = riskScore != null ? getRiskLevel(riskScore) : null;
  const conf = payload.typology?.confidence;
  const confLevel = conf != null ? getConfidenceLevel(conf) : null;

  const escalationReason = (() => {
    const vr = accumulatedEvidence?.validation_result;
    if (vr?.issues?.length > 0) {
      return `Validation found ${vr.issues.length} issue${vr.issues.length !== 1 ? 's' : ''}: ${vr.issues[0]}`;
    }
    if (conf != null && conf < 0.5) {
      return `Typology confidence is low (${Math.round(conf * 100)}%), requiring manual classification`;
    }
    if (riskScore != null && riskScore > 70) {
      return `High risk score (${riskScore}) triggers mandatory analyst review`;
    }
    return 'Pipeline routed this case for analyst review based on risk and complexity assessment';
  })();

  const caseFile = accumulatedEvidence?.case_file;
  const networkAnalysis = accumulatedEvidence?.network_analysis;

  const evidenceSections = [
    {
      key: 'entity',
      label: 'Entity Profile',
      available: !!caseFile?.entity,
      render: () => caseFile?.entity && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: spacing[3] }}>
          <MiniInfo label="Name" value={caseFile.entity.name || caseFile.entity.entity_id} />
          <MiniInfo label="Type" value={caseFile.entity.entity_type} />
          <MiniInfo label="Risk Level" value={caseFile.entity.risk_level} />
        </div>
      ),
    },
    {
      key: 'transactions',
      label: 'Transaction Summary',
      available: !!caseFile?.transactions,
      render: () => caseFile?.transactions && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: spacing[3] }}>
          <MiniInfo label="Total Count" value={caseFile.transactions.total_count} />
          <MiniInfo label="Volume" value={`$${(caseFile.transactions.total_volume || 0).toLocaleString()}`} />
          <MiniInfo label="High-Risk" value={caseFile.transactions.high_risk_count} />
        </div>
      ),
    },
    {
      key: 'network',
      label: 'Network Analysis',
      available: !!networkAnalysis,
      render: () => networkAnalysis && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: spacing[3] }}>
          <MiniInfo label="Network Size" value={networkAnalysis.network_size} />
          <MiniInfo label="High-Risk Links" value={networkAnalysis.high_risk_connections} />
          <MiniInfo label="Centrality" value={networkAnalysis.degree_centrality?.toFixed(3)} />
          <MiniInfo label="Network Risk" value={networkAnalysis.network_risk_score != null ? `${networkAnalysis.network_risk_score.toFixed(1)}/100` : undefined} />
          {networkAnalysis.shell_structure_indicators?.length > 0 && (
            <div style={{ flex: '1 1 100%' }}>
              <div style={{ fontSize: 10, color: palette.gray.base, fontFamily: FONT, marginBottom: 2 }}>Shell Indicators</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                {networkAnalysis.shell_structure_indicators.map((ind, i) => (
                  <Badge key={i} variant="red">{ind}</Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'findings',
      label: 'Key Findings',
      available: caseFile?.key_findings?.length > 0,
      render: () => (
        <ul style={{ margin: 0, paddingLeft: 16 }}>
          {caseFile.key_findings.map((f, i) => (
            <li key={i} style={{ fontSize: 12, fontFamily: FONT, color: palette.gray.dark2, lineHeight: 1.5 }}>
              {f}
            </li>
          ))}
        </ul>
      ),
    },
  ].filter(s => s.available);

  return (
    <Card style={{
      padding: spacing[4],
      border: `1px solid ${palette.yellow.base}`,
      background: `linear-gradient(180deg, ${palette.yellow.light3} 0%, #fff 48%)`,
      marginBottom: spacing[3],
      animation: 'attentionPulse 2s ease-in-out 3',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2], marginBottom: spacing[2] }}>
        <div style={{
          width: 36, height: 36, borderRadius: 8,
          background: palette.yellow.light2,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ fontSize: 20 }}>👁</span>
        </div>
        <div>
          <H3 style={{ fontFamily: FONT, margin: 0, color: palette.yellow.dark2, fontSize: '16px' }}>
            Human Review Required
          </H3>
          <Body style={{ fontFamily: FONT, fontSize: '11px', color: palette.gray.dark1, margin: 0 }}>
            The pipeline has paused for analyst review.
          </Body>
        </div>
      </div>

      {/* Escalation Context */}
      <div style={{
        padding: '8px 12px', borderRadius: 6, marginBottom: spacing[3],
        background: 'rgba(255,255,255,0.7)',
        border: `1px solid ${palette.yellow.light1}`,
        fontSize: 12, fontFamily: FONT, color: palette.yellow.dark2,
      }}>
        <strong>Escalation reason: </strong>{escalationReason}
      </div>

      {/* Risk Summary */}
      <div style={{
        display: 'flex', gap: spacing[3], marginBottom: spacing[3], flexWrap: 'wrap',
        padding: spacing[2], borderRadius: 6, background: 'rgba(255,255,255,0.6)',
      }}>
        {risk && (
          <div>
            <div style={{ fontSize: 10, color: palette.gray.base, fontFamily: FONT, marginBottom: 2 }}>Risk Score</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 22, fontWeight: 700, fontFamily: FONT, color: risk.color }}>{riskScore}</span>
              <span style={{
                fontSize: 10, padding: '2px 6px', borderRadius: 3,
                background: risk.bg, color: risk.color, fontFamily: FONT,
              }}>{risk.label}</span>
            </div>
          </div>
        )}
        {payload.typology?.primary_typology && (
          <div>
            <div style={{ fontSize: 10, color: palette.gray.base, fontFamily: FONT, marginBottom: 2 }}>Typology</div>
            <Badge variant="yellow">{payload.typology.primary_typology}</Badge>
            {confLevel && (
              <div style={{ fontSize: 10, color: confLevel.color, fontFamily: FONT, marginTop: 2 }}>
                {Math.round(conf * 100)}% — {confLevel.label}
              </div>
            )}
          </div>
        )}
        {payload.triage_decision?.reasoning && (
          <div style={{ flex: '1 1 100%' }}>
            <div style={{ fontSize: 10, color: palette.gray.base, fontFamily: FONT, marginBottom: 2 }}>Agent Reasoning</div>
            <div style={{ fontSize: 12, color: palette.gray.dark2, fontFamily: FONT, lineHeight: 1.6 }}>
              {formatReasoning(payload.triage_decision.reasoning)}
            </div>
          </div>
        )}
      </div>

      {/* Evidence Review Sections */}
      {evidenceSections.length > 0 && (
        <div style={{ marginBottom: spacing[3] }}>
          <div style={{
            fontSize: 11, fontWeight: 600, fontFamily: FONT, color: palette.gray.dark1,
            textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: spacing[1],
          }}>
            Supporting Evidence
          </div>
          {evidenceSections.map(section => (
            <div key={section.key} style={{
              marginBottom: 8, borderRadius: 6,
              background: '#fff',
              border: `1px solid ${palette.gray.light2}`,
              overflow: 'hidden',
              boxShadow: expandedSections[section.key] ? `inset 3px 0 0 ${palette.yellow.base}` : 'none',
            }}>
              <button
                onClick={() => toggleSection(section.key)}
                style={{
                  width: '100%', display: 'flex', justifyContent: 'space-between',
                  alignItems: 'center', padding: '8px 12px',
                  border: 'none', background: 'transparent', cursor: 'pointer',
                  fontFamily: FONT, fontSize: 12, fontWeight: 500, color: palette.gray.dark2,
                }}
              >
                {section.label}
                <span style={{
                  fontSize: 10, transition: 'transform 0.15s',
                  transform: expandedSections[section.key] ? 'rotate(180deg)' : 'rotate(0deg)',
                }}>▼</span>
              </button>
              {expandedSections[section.key] && (
                <div style={{ padding: '0 12px 10px' }}>
                  {section.render()}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Analyst Input */}
      <div style={{ marginBottom: spacing[3] }}>
        <TextInput
          label="Analyst Notes"
          placeholder="Document your review findings and rationale..."
          value={analystNotes}
          onChange={(e) => onNotesChange(e.target.value)}
        />
      </div>

      {/* Evidence Review Acknowledgment */}
      <label style={{
        display: 'flex', alignItems: 'center', gap: spacing[2],
        marginBottom: spacing[3], cursor: 'pointer',
        fontSize: 12, fontFamily: FONT, color: palette.gray.dark2,
      }}>
        <input
          type="checkbox"
          checked={evidenceReviewed}
          onChange={(e) => setEvidenceReviewed(e.target.checked)}
          style={{ width: 16, height: 16 }}
        />
        I have reviewed the supporting evidence and agent reasoning
      </label>

      {/* Decision Buttons */}
      <div style={{ display: 'flex', gap: spacing[2] }}>
        <Button
          variant="baseGreen"
          onClick={() => onDecision('approve')}
          disabled={disabled || !evidenceReviewed}
          style={{ flex: 1.2 }}
        >
          Approve & File SAR
        </Button>
        <Button variant="default" onClick={() => onDecision('request_changes')} disabled={disabled} style={{ flex: 1 }}>
          Request Changes
        </Button>
        <Button variant="dangerOutline" onClick={() => onDecision('reject')} disabled={disabled} style={{ flex: 1 }}>
          Reject & Close
        </Button>
      </div>
      {!evidenceReviewed && (
        <div style={{ fontSize: 10, color: palette.yellow.dark2, fontFamily: FONT, marginTop: 6 }}>
          You must confirm evidence review before approving.
        </div>
      )}

      {/* MongoDB Before/After Strip */}
      <div style={{
        marginTop: spacing[3], display: 'flex', borderRadius: 6, overflow: 'hidden',
        border: `1px solid ${palette.gray.light2}`, fontSize: uiTokens.captionSize, fontFamily: FONT,
      }}>
        <div style={{
          flex: 1, padding: '8px 12px',
          background: palette.green.light3, borderRight: `1px solid ${palette.gray.light2}`,
        }}>
          <div style={{ fontWeight: 700, color: palette.green.dark2, marginBottom: 2, fontFamily: uiTokens.monoFont, fontSize: 10 }}>MongoDBSaver</div>
          <div style={{ color: palette.green.dark1 }}>State checkpoint: 1 document. Resume after hours, days, or server restarts.</div>
        </div>
        <div style={{
          flex: 1, padding: '8px 12px',
          background: palette.gray.light3,
        }}>
          <div style={{ fontWeight: 700, color: palette.gray.dark1, marginBottom: 2, fontSize: 10 }}>Without MongoDB</div>
          <div style={{ color: palette.gray.base }}>Redis for state + Kafka for events + PostgreSQL for data + custom recovery.</div>
        </div>
      </div>

    </Card>
  );
}

function MiniInfo({ label, value }) {
  return (
    <div>
      <div style={{ fontSize: 10, color: palette.gray.base, fontFamily: FONT }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 600, fontFamily: FONT }}>{value ?? 'N/A'}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// FinalResultCard
// ---------------------------------------------------------------------------

function FinalResultCard({ result }) {
  const { status, typology, narrative, triage_decision, case_id, thread_id, human_decision } = result;
  const risk = triage_decision?.risk_score != null ? getRiskLevel(triage_decision.risk_score) : null;

  const decisionColors = {
    approve: { border: palette.green.dark1, bg: palette.green.light3, badge: 'green', label: 'Approved' },
    reject: { border: palette.red.base, bg: palette.red.light3, badge: 'red', label: 'Rejected' },
    request_changes: { border: palette.blue.base, bg: palette.blue.light3, badge: 'blue', label: 'Changes Requested' },
  };
  const decisionInfo = human_decision?.decision ? decisionColors[human_decision.decision] : null;

  return (
    <Card style={{
      padding: 0,
      border: `1px solid ${palette.green.light1}`,
      background: palette.green.light3,
      overflow: 'hidden',
      animation: 'fadeSlideIn 240ms ease, successGlow 600ms ease-out',
    }}>
      <div style={{
        height: 4, borderRadius: '8px 8px 0 0',
        background: `linear-gradient(90deg, ${palette.green.dark1}, ${palette.green.base})`,
      }} />
      <div style={{ padding: spacing[3] }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: spacing[2],
      }}>
        <Subtitle style={{ fontFamily: FONT, fontSize: '14px', color: palette.green.dark2, margin: 0 }}>
          Investigation Complete
        </Subtitle>
        {case_id && (
          <span style={{
            fontSize: 12, fontFamily: "'Source Code Pro', monospace",
            padding: '3px 10px', borderRadius: 4,
            background: '#fff', border: `1px solid ${palette.green.light1}`,
            color: palette.gray.dark2, fontWeight: 600,
            letterSpacing: '0.02em',
          }}>
            {case_id}
          </span>
        )}
      </div>

      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: spacing[2],
        marginBottom: spacing[2],
        padding: spacing[2], borderRadius: 6, background: 'rgba(255,255,255,0.6)',
      }}>
        <div>
          <Body style={{ fontSize: '10px', color: palette.gray.base, fontFamily: FONT, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Status</Body>
          <Badge variant={status === 'filed' ? 'green' : status === 'closed_false_positive' ? 'lightgray' : 'blue'}>
            {status}
          </Badge>
        </div>
        {risk && (
          <div>
            <Body style={{ fontSize: `${uiTokens.captionSize}px`, color: palette.gray.base, fontFamily: FONT, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Risk Score</Body>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {/* Mini Risk Gauge */}
              <div style={{
                width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                background: `conic-gradient(${risk.color} ${(triage_decision.risk_score / 100) * 360}deg, ${palette.gray.light2} ${(triage_decision.risk_score / 100) * 360}deg)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <div style={{
                  width: 30, height: 30, borderRadius: '50%', background: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 700, fontFamily: FONT, color: risk.color,
                }}>
                  {triage_decision.risk_score}
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span style={{
                  fontSize: uiTokens.captionSize, padding: '1px 5px', borderRadius: 3,
                  background: risk.bg, color: risk.color, fontFamily: FONT,
                }}>{risk.label}</span>
                {human_decision?.decision === 'approve' && (
                  <span style={{
                    fontSize: uiTokens.captionSize, padding: '1px 5px', borderRadius: 3,
                    background: palette.green.light3, color: palette.green.dark2, fontFamily: FONT, fontWeight: 600,
                  }}>Analyst Confirmed</span>
                )}
                {human_decision?.decision === 'reject' && (
                  <span style={{
                    fontSize: uiTokens.captionSize, padding: '1px 5px', borderRadius: 3,
                    background: palette.red.light3, color: palette.red.dark2, fontFamily: FONT, fontWeight: 600,
                  }}>Analyst Override</span>
                )}
              </div>
            </div>
          </div>
        )}
        {typology?.primary_typology && (
          <div>
            <Body style={{ fontSize: '10px', color: palette.gray.base, fontFamily: FONT, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Typology</Body>
            <Body style={{ fontWeight: 600, fontFamily: FONT }}>{typology.primary_typology}</Body>
          </div>
        )}
        {thread_id && (
          <div>
            <Body style={{ fontSize: '10px', color: palette.gray.base, fontFamily: FONT, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Thread</Body>
            <Body style={{ fontSize: '11px', fontFamily: "'Source Code Pro', monospace", color: palette.gray.dark1 }}>
              {thread_id.length > 20 ? thread_id.slice(0, 20) + '...' : thread_id}
            </Body>
          </div>
        )}
      </div>

      {/* Analyst Decision Section */}
      {human_decision && decisionInfo && (
        <div style={{
          padding: spacing[2], borderRadius: 6, marginBottom: spacing[2],
          background: decisionInfo.bg,
          borderLeft: `3px solid ${decisionInfo.border}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: human_decision.analyst_notes ? 6 : 0 }}>
            <Body style={{ fontSize: '10px', color: palette.gray.base, fontFamily: FONT, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Analyst Decision
            </Body>
            <Badge variant={decisionInfo.badge}>{decisionInfo.label}</Badge>
          </div>
          {human_decision.analyst_notes && (
            <Body style={{ fontSize: '13px', fontFamily: FONT, color: palette.gray.dark2, lineHeight: '1.6' }}>
              {human_decision.analyst_notes}
            </Body>
          )}
        </div>
      )}

      {narrative?.introduction && (
        <div style={{
          marginTop: spacing[1], padding: spacing[2], borderRadius: 6,
          background: 'rgba(255,255,255,0.6)',
        }}>
          <Body style={{ fontSize: '10px', color: palette.gray.base, fontFamily: FONT, marginBottom: spacing[1], textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Narrative Summary
          </Body>
          <Body style={{ fontSize: '13px', fontFamily: FONT, color: palette.gray.dark2, lineHeight: '1.6' }}>
            {narrative.introduction}
          </Body>
        </div>
      )}
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function InvestigationLauncher({ onComplete }) {
  const [running, setRunning] = useState(false);
  const [events, setEvents] = useState([]);
  const [finalResult, setFinalResult] = useState(null);
  const [needsReview, setNeedsReview] = useState(false);
  const [reviewPayload, setReviewPayload] = useState(null);
  const [analystNotes, setAnalystNotes] = useState('');
  const [startTime, setStartTime] = useState(null);

  const [categoryIndices, setCategoryIndices] = useState(() => {
    const initial = {};
    INVESTIGATION_CATEGORIES.forEach(cat => { initial[cat.id] = 0; });
    return initial;
  });
  const [selectedCategory, setSelectedCategory] = useState('shell_company');
  const [entityNameMap, setEntityNameMap] = useState({});

  useEffect(() => {
    fetchInvestigableEntities()
      .then((data) => {
        const map = {};
        for (const ent of data.entities || []) {
          const key = ent.scenarioKey;
          if (key && ent.name?.full) {
            map[key] = ent.name.full;
          }
        }
        setEntityNameMap(map);
      })
      .catch(() => {});
  }, []);

  const accumulatedEvidence = useMemo(() => {
    const evidence = {};
    for (const evt of events) {
      if (evt.type === 'agent_end' && evt.output) {
        if (evt.output.case_file) evidence.case_file = evt.output.case_file;
        if (evt.output.network_analysis) evidence.network_analysis = evt.output.network_analysis;
        if (evt.output.gathered_data) evidence.gathered_data = evt.output.gathered_data;
        if (evt.output.triage_decision) evidence.triage_decision = evt.output.triage_decision;
        if (evt.output.typology) evidence.typology = evt.output.typology;
        if (evt.output.narrative) evidence.narrative = evt.output.narrative;
        if (evt.output.validation_result) evidence.validation_result = evt.output.validation_result;
      }
    }
    return evidence;
  }, [events]);

  const activeAgents = useMemo(() => {
    const agents = {};
    for (const evt of events) {
      if (evt.type === 'agent_start') {
        agents[evt.agent] = 'active';
      } else if (evt.type === 'agent_end') {
        agents[evt.agent] = 'completed';
      }
    }
    return Object.keys(agents).length > 0 ? agents : null;
  }, [events]);

  const handleEvent = useCallback((data) => {
    setEvents((prev) => [...prev, data]);

    if (data.type === 'investigation_complete' || data.type === 'resume_complete') {
      setFinalResult(data);
      setRunning(false);
      if (data.needs_human_review) {
        setNeedsReview(true);
        setReviewPayload(data);
      }
      onComplete?.(data);
    }
    if (data.type === 'error') {
      setRunning(false);
    }
  }, [onComplete]);

  const launch = async (entityId, alertType) => {
    setRunning(true);
    setEvents([]);
    setFinalResult(null);
    setNeedsReview(false);
    setReviewPayload(null);
    setStartTime(Date.now());

    try {
      await launchInvestigation({ entity_id: entityId, alert_type: alertType }, handleEvent);
    } catch (err) {
      handleEvent({ type: 'error', message: err.message });
    }
  };

  const handleResume = async (decision) => {
    if (!reviewPayload?.thread_id) return;
    setRunning(true);
    setNeedsReview(false);
    setFinalResult(null);
    setStartTime(Date.now());

    try {
      await resumeInvestigation(
        { thread_id: reviewPayload.thread_id, decision, analyst_notes: analystNotes },
        handleEvent,
      );
    } catch (err) {
      handleEvent({ type: 'error', message: err.message });
    }
  };

  const pipelinePhase = useMemo(() => {
    if (events.length === 0 && !running) return 'select';
    if (running) return 'running';
    if (needsReview) return 'review';
    if (finalResult && !needsReview) return 'complete';
    return 'select';
  }, [events.length, running, needsReview, finalResult]);

  return (
    <div>
      {/* Progress Stepper */}
      {(events.length > 0 || running || finalResult) && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 0, marginBottom: spacing[3],
          padding: '10px 16px', borderRadius: 8,
          background: uiTokens.railBg, border: `1px solid ${uiTokens.borderDefault}`,
        }}>
          {[
            { key: 'select', label: 'Select Scenario', glyph: 'Apps' },
            { key: 'running', label: 'Pipeline Running', glyph: 'Play' },
            { key: 'review', label: 'Analyst Review', glyph: 'Visibility' },
            { key: 'complete', label: 'Investigation Filed', glyph: 'Checkmark' },
          ].map((step, i, arr) => {
            const phases = ['select', 'running', 'review', 'complete'];
            const currentIdx = phases.indexOf(pipelinePhase);
            const stepIdx = phases.indexOf(step.key);
            const isActive = step.key === pipelinePhase;
            const isDone = stepIdx < currentIdx;
            return (
              <React.Fragment key={step.key}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  opacity: isDone || isActive ? 1 : 0.4,
                }}>
                  <div style={{
                    width: 24, height: 24, borderRadius: '50%',
                    background: isDone ? palette.green.dark1 : isActive ? palette.blue.base : palette.gray.light2,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.3s ease',
                  }}>
                    <Icon glyph={isDone ? 'Checkmark' : step.glyph} size={12} fill={isDone || isActive ? '#fff' : palette.gray.dark1} />
                  </div>
                  <span style={{
                    fontSize: uiTokens.captionSize, fontFamily: FONT,
                    fontWeight: isActive ? 600 : 400,
                    color: isActive ? palette.gray.dark3 : palette.gray.dark1,
                  }}>
                    {step.label}
                  </span>
                </div>
                {i < arr.length - 1 && (
                  <div style={{
                    flex: 1, height: 2, margin: '0 8px',
                    background: isDone ? palette.green.dark1 : palette.gray.light2,
                    borderRadius: 1,
                    transition: 'background 0.3s ease',
                  }} />
                )}
              </React.Fragment>
            );
          })}
        </div>
      )}

      {/* Demo Scenarios */}
      {events.length === 0 && !running && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: spacing[2] }}>
            <Subtitle style={{ fontFamily: FONT, margin: 0 }}>
              Investigation Scenarios
            </Subtitle>
            <details style={{ fontSize: 11, fontFamily: FONT, color: palette.gray.dark1 }}>
              <summary style={{ cursor: 'pointer', color: palette.blue.base, fontWeight: 500 }}>
                About this pipeline
              </summary>
              <div style={{
                marginTop: spacing[1], padding: spacing[2], borderRadius: 6,
                background: palette.gray.light3, border: `1px solid ${palette.gray.light2}`,
                fontSize: 11, lineHeight: 1.6,
              }}>
                <p style={{ margin: '0 0 6px' }}>
                  <strong>MongoDB + LangGraph:</strong> <code>MongoDBSaver</code> checkpoints durable agent state for
                  human-in-the-loop pause/resume, the flexible document model stores evolving evidence without schema
                  migrations, and <code>$graphLookup</code> powers real-time network traversal.
                </p>
                <p style={{ margin: 0 }}>
                  <strong>Event-Driven Trigger:</strong> In production, a Change Stream on <code>alerts</code> watches
                  for new alerts. When <code>db.alerts.insertOne()</code> fires, triage starts automatically. This demo
                  simulates that flow.
                </p>
              </div>
            </details>
          </div>
          <Body style={{ fontSize: '12px', color: palette.gray.dark1, fontFamily: FONT, marginBottom: spacing[2] }}>
            Select a scenario category, then click to cycle through entity variants. Each category tests a different investigation path.
          </Body>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: spacing[3],
            marginBottom: spacing[4],
          }}>
            {INVESTIGATION_CATEGORIES.map((cat, catIdx) => {
              const idx = categoryIndices[cat.id] || 0;
              const currentEntity = cat.entities[idx];
              const isSelected = selectedCategory === cat.id;
              return (
                <Card key={cat.id} style={{
                  padding: 0,
                  border: isSelected
                    ? `1.5px solid ${palette.green.dark1}`
                    : `1.5px solid ${uiTokens.borderDefault}`,
                  borderLeft: isSelected
                    ? `3px solid ${palette.green.dark1}`
                    : undefined,
                  background: isSelected ? '#f0faf5' : uiTokens.surface1,
                  boxShadow: isSelected
                    ? uiTokens.shadowSelected
                    : uiTokens.shadowCard,
                  cursor: 'pointer',
                  transition: uiTokens.transitionInteractive,
                  overflow: 'hidden',
                  animation: `fadeSlideIn 220ms ease both`,
                  animationDelay: `${catIdx * 40}ms`,
                }}
                  onClick={() => {
                    setSelectedCategory(cat.id);
                    const nextIdx = (idx + 1) % cat.entities.length;
                    setCategoryIndices(prev => ({ ...prev, [cat.id]: nextIdx }));
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.borderColor = palette.green.light1;
                      e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.04)';
                      e.currentTarget.style.transform = 'scale(1.005)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.borderColor = uiTokens.borderDefault;
                      e.currentTarget.style.boxShadow = 'none';
                      e.currentTarget.style.transform = 'scale(1)';
                    }
                  }}
                >
                  {/* Header band */}
                  <div style={{
                    padding: '10px 14px',
                    background: palette.gray.light3,
                    borderBottom: `1px solid ${uiTokens.borderDefault}`,
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  }}>
                    <Subtitle style={{ fontFamily: FONT, fontSize: `${uiTokens.displaySize}px`, margin: 0 }}>
                      {cat.title}
                    </Subtitle>
                    <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexShrink: 0 }}>
                      <Badge variant={cat.badge.variant}>{cat.badge.label}</Badge>
                      <span style={{
                        fontSize: 9, fontFamily: FONT, color: palette.gray.base,
                        padding: '1px 5px', borderRadius: 4,
                        background: uiTokens.surface1, border: `1px solid ${uiTokens.borderDefault}`,
                        fontVariantNumeric: 'tabular-nums',
                      }}>
                        {idx + 1}/{cat.entities.length}
                      </span>
                    </div>
                  </div>
                  {/* Body */}
                  <div style={{ padding: '12px 14px 14px' }}>
                    <Body style={{
                      fontSize: '12px', color: palette.gray.dark1,
                      fontFamily: FONT, marginBottom: spacing[1], lineHeight: 1.5,
                    }}>
                      {cat.description}
                    </Body>
                    <div style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      marginTop: spacing[1],
                    }}>
                      <Body style={{ fontSize: '11px', color: palette.gray.base, fontFamily: FONT }}>
                        Entity: <strong style={{ color: palette.gray.dark1 }}>{entityNameMap[currentEntity.entity_id] || currentEntity.label}</strong>
                      </Body>
                      <span style={{
                        fontSize: 10, color: palette.blue.base, fontFamily: FONT,
                        display: 'flex', alignItems: 'center', gap: 2,
                      }}>
                        <Icon glyph="ChevronRight" size={10} />
                        Click to cycle
                      </span>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Launch selected category */}
          {selectedCategory && (() => {
            const cat = INVESTIGATION_CATEGORIES.find(c => c.id === selectedCategory);
            const idx = categoryIndices[cat.id] || 0;
            const ent = cat.entities[idx];
            return (
              <div style={{
                display: 'flex', gap: spacing[2], alignItems: 'center',
                marginBottom: spacing[3], padding: spacing[3],
                borderRadius: 8, background: uiTokens.railBg,
                border: `1px solid ${uiTokens.borderDefault}`,
                borderTop: `1px solid ${uiTokens.borderDefault}`,
                boxShadow: uiTokens.shadowCard,
              }}>
                <Body style={{ fontSize: '13px', fontFamily: FONT, flex: 1 }}>
                  Ready to investigate <strong>{entityNameMap[ent.entity_id] || ent.label}</strong>
                  {cat.defaultTypology && <> &mdash; {TYPOLOGY_LABELS[cat.defaultTypology] || cat.defaultTypology}</>}
                </Body>
                <Button
                  size="small" variant="baseGreen"
                  onClick={() => launch(ent.entity_id, cat.alert_type)}
                  disabled={running}
                >
                  Launch Investigation
                </Button>
              </div>
            );
          })()}

        </>
      )}

      {/* Initializing state */}
      {running && events.length === 0 && (
        <Card style={{
          padding: spacing[3], marginBottom: spacing[3],
          border: `1px solid ${palette.gray.light2}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2] }}>
            <Spinner />
            <Body style={{ fontFamily: FONT, color: palette.gray.dark1 }}>
              Initializing investigation pipeline...
            </Body>
          </div>
        </Card>
      )}

      {/* Live Pipeline + Timeline split during execution */}
      {events.length > 0 && (
        <div style={{
          display: 'flex', gap: spacing[3], marginBottom: spacing[2],
          alignItems: 'flex-start',
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <AgentStepTimeline events={events} running={running} startTime={startTime} />
          </div>
          <div style={{
            width: 380, flexShrink: 0,
            height: 400, borderRadius: 8,
            overflow: 'hidden', border: `1px solid ${palette.gray.light2}`,
            boxShadow: uiTokens.shadowCard,
          }}>
            <AgenticPipelineGraph showTools={false} activeAgents={activeAgents} compact={true} />
          </div>
        </div>
      )}

      {/* Human Review Panel — sticky at top */}
      {needsReview && reviewPayload && (
        <div style={{ position: 'sticky', top: 0, zIndex: 20 }}>
          <HumanReviewPanel
            payload={reviewPayload}
            accumulatedEvidence={accumulatedEvidence}
            analystNotes={analystNotes}
            onNotesChange={setAnalystNotes}
            onDecision={handleResume}
            disabled={running}
          />
        </div>
      )}

      {/* Final Result Summary */}
      {finalResult && !needsReview && (
        <div style={{ marginBottom: spacing[4], position: 'relative' }}>
          <FinalResultCard result={finalResult} />
          {/* MongoDB Before/After Strip */}
          <div style={{
            marginTop: spacing[3], display: 'flex', borderRadius: 6, overflow: 'hidden',
            border: `1px solid ${palette.gray.light2}`, fontSize: uiTokens.captionSize, fontFamily: FONT,
          }}>
            <div style={{
              flex: 1, padding: '8px 12px',
              background: palette.green.light3, borderRight: `1px solid ${palette.gray.light2}`,
            }}>
              <div style={{ fontWeight: 700, color: palette.green.dark2, marginBottom: 2, fontFamily: uiTokens.monoFont, fontSize: 10 }}>MongoDB</div>
              <div style={{ color: palette.green.dark1 }}>Investigation stored: 1 document, 0 JOINs. Full lifecycle in a single rich document.</div>
            </div>
            <div style={{
              flex: 1, padding: '8px 12px',
              background: palette.gray.light3,
            }}>
              <div style={{ fontWeight: 700, color: palette.gray.dark1, marginBottom: 2, fontSize: 10 }}>Traditional RDBMS</div>
              <div style={{ color: palette.gray.base }}>15 normalized tables, 8 JOINs per retrieval, schema migrations for every change.</div>
            </div>
          </div>
        </div>
      )}

      {/* MongoDB Operations Insights Panel */}
      {events.length > 0 && (
        <InvestigationInsightsPanel events={events} running={running} accumulatedEvidence={accumulatedEvidence} />
      )}
    </div>
  );
}
