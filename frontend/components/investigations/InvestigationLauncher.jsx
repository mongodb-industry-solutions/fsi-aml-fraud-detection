"use client";

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import Card from '@leafygreen-ui/card';
import Button from '@leafygreen-ui/button';
import TextInput from '@leafygreen-ui/text-input';
import Badge from '@leafygreen-ui/badge';
import Icon from '@leafygreen-ui/icon';
import { Body, Subtitle, H3, InlineCode } from '@leafygreen-ui/typography';
import { palette } from '@leafygreen-ui/palette';
import { spacing } from '@leafygreen-ui/tokens';

import Banner from '@leafygreen-ui/banner';
import Callout from '@leafygreen-ui/callout';

import { launchInvestigation, resumeInvestigation, fetchInvestigableEntities, fetchTypologies } from '@/lib/agent-api';
import AgenticPipelineGraph from './AgenticPipelineGraph';
import InvestigationInsightsPanel from './InvestigationInsightsPanel';

const FONT = "'Euclid Circular A', sans-serif";

const DEMO_SCENARIOS = [
  {
    id: 'auto_close_fp',
    title: 'Auto-Close False Positive',
    description: 'Low-risk generic individual — tests the 70-80% FP auto-closure path.',
    entity_id: 'generic_individual',
    alert_type: 'routine_monitoring',
    badge: { variant: 'green', label: 'Low Risk' },
  },
  {
    id: 'shell_company',
    title: 'Shell Company Investigation',
    description: 'Nominee directors, layering transactions, shell-to-shell flows. Full pipeline.',
    entity_id: 'shell_company_candidate_var0',
    alert_type: 'suspicious_structure',
    badge: { variant: 'red', label: 'High Risk' },
  },
  {
    id: 'pep_investigation',
    title: 'PEP Investigation',
    description: 'PEP with 0.99 watchlist match, offshore transactions. Urgent escalation path.',
    entity_id: 'pep_individual_varied_0',
    alert_type: 'pep_alert',
    badge: { variant: 'yellow', label: 'PEP' },
  },
];

const AGENT_LABELS = {
  triage: { label: 'Triage Agent', icon: '🔍', color: palette.blue.base, desc: 'Risk scoring and disposition routing' },
  data_gathering: { label: 'Data Gathering', icon: '📊', color: palette.purple.base, desc: 'Parallel evidence collection via Send API' },
  fetch_entity_profile: { label: 'Fetching Entity', icon: '👤', color: palette.purple.light1, desc: 'Loading entity profile and KYC data' },
  fetch_transactions: { label: 'Fetching Transactions', icon: '💳', color: palette.purple.light1, desc: 'Querying transaction history and patterns' },
  fetch_network: { label: 'Analyzing Network', icon: '🕸', color: palette.purple.light1, desc: 'Running $graphLookup network traversal' },
  fetch_watchlist: { label: 'Screening Watchlists', icon: '🛡', color: palette.purple.light1, desc: 'Checking sanctions and PEP databases' },
  assemble_case: { label: 'Assembling Case File', icon: '📁', color: palette.green.dark1, desc: 'LLM-powered 360° profile synthesis' },
  typology: { label: 'Typology Classification', icon: '🏷', color: palette.yellow.dark2, desc: 'RAG-powered crime typology mapping' },
  network_analyst: { label: 'Network Risk Analysis', icon: '🔗', color: palette.yellow.dark2, desc: 'Graph centrality and risk scoring' },
  narrative: { label: 'SAR Narrative Generation', icon: '📝', color: palette.green.base, desc: 'FinCEN 5Ws narrative with citations' },
  validation: { label: 'Validation Agent', icon: '✓', color: palette.blue.dark1, desc: 'Quality gate with fact-checking' },
  human_review: { label: 'Human Review', icon: '👁', color: palette.red.base, desc: 'interrupt() durable pause for analyst' },
  finalize: { label: 'Finalizing Case', icon: '📋', color: palette.green.dark2, desc: 'Persist investigation to MongoDB' },
  auto_close: { label: 'Auto-Closing', icon: '✕', color: palette.gray.dark1, desc: 'False positive auto-closure' },
  urgent_escalation: { label: 'Urgent Escalation', icon: '⚠', color: palette.red.dark2, desc: 'High-risk immediate escalation' },
};

const TOOL_FRIENDLY_NAMES = {
  get_entity_profile: 'Fetching Entity Profile (db.entities.findOne)',
  query_entity_transactions: 'Querying Transactions (aggregate pipeline)',
  analyze_entity_network: 'Analyzing Entity Network ($graphLookup)',
  screen_watchlists: 'Screening Watchlists (db.entities.find)',
  search_typologies: 'Searching Typology Library (Atlas Search RAG)',
  search_compliance_policies: 'Searching Compliance Policies (Atlas Search RAG)',
  compute_network_metrics: 'Computing Network Metrics ($graphLookup)',
};

const PIPELINE_STEPS = [
  'Triage the alert and score risk (state checkpointed via MongoDBSaver)',
  'Gather entity, transactions, network ($graphLookup), and watchlist data in parallel',
  'Assemble a 360° case file (flexible document model)',
  'Classify crime typology via Atlas Search RAG and analyze network risk',
  'Generate FinCEN-compliant SAR narrative with compliance policy RAG',
  'Validate quality and route for human review (durable interrupt via MongoDBSaver)',
];

// ---------------------------------------------------------------------------
// Event → Steps reducer
// ---------------------------------------------------------------------------

function buildSteps(events) {
  const steps = [];
  const stepMap = {};

  for (const evt of events) {
    if (evt.type === 'pipeline_started' || evt.type === 'pipeline_resumed') {
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
// SegmentedRiskBar
// ---------------------------------------------------------------------------

function SegmentedRiskBar({ score, height = 8 }) {
  const segments = [
    { max: 25, color: palette.green.base, label: 'Low' },
    { max: 50, color: palette.yellow.base, label: 'Moderate' },
    { max: 75, color: '#ed6c02', label: 'High' },
    { max: 100, color: palette.red.base, label: 'Critical' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{
        display: 'flex', height, borderRadius: height / 2, overflow: 'hidden',
        background: palette.gray.light2,
      }}>
        {segments.map((seg, i) => {
          const segStart = i === 0 ? 0 : segments[i - 1].max;
          const segEnd = seg.max;
          const filled = Math.max(0, Math.min(score - segStart, segEnd - segStart));
          const width = (segEnd - segStart);
          return (
            <div key={seg.label} style={{ flex: width, position: 'relative' }}>
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

function ProgressHeader({ steps, running, startTime }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!startTime) return;
    const tick = () => setElapsed(Date.now() - startTime);
    tick();
    if (running) {
      const id = setInterval(tick, 200);
      return () => clearInterval(id);
    }
  }, [running, startTime]);

  const completed = steps.filter((s) => s.status === 'complete').length;
  const total = steps.filter((s) => s.status !== 'error').length;
  const pct = total > 0 ? (completed / total) * 100 : 0;

  return (
    <div style={{ marginBottom: spacing[3] }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 6, fontFamily: FONT, fontSize: 12, color: palette.gray.dark1,
      }}>
        <span>
          {completed}/{total} agents complete
          {running && (
            <span style={{ marginLeft: 8, color: palette.blue.base, fontWeight: 600 }}>
              Running
              <span className="pulse-text">...</span>
            </span>
          )}
        </span>
        <span style={{ fontVariantNumeric: 'tabular-nums' }}>
          {(elapsed / 1000).toFixed(1)}s elapsed
        </span>
      </div>
      <div style={{
        height: 6, borderRadius: 3, background: palette.gray.light2, overflow: 'hidden',
      }}>
        <div style={{
          height: '100%', borderRadius: 3,
          background: running
            ? `linear-gradient(90deg, ${palette.blue.base}, ${palette.blue.light1})`
            : palette.green.dark1,
          width: `${pct}%`,
          transition: 'width 0.4s ease',
        }} />
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
        }}
      >
        <span style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: 14, height: 14, fontSize: 8, transition: 'transform 0.15s',
          transform: open ? 'rotate(90deg)' : 'rotate(0deg)',
          color: palette.gray.dark1,
        }}>&#9654;</span>
        <span style={{ fontWeight: 500 }}>{friendlyName}</span>
        {isRunning ? (
          <span style={{
            fontSize: 10, padding: '1px 6px', borderRadius: 3,
            background: palette.blue.light3, color: palette.blue.base,
            fontWeight: 500, animation: 'shimmer 1.5s ease-in-out infinite',
          }}>
            processing...
          </span>
        ) : (
          <span style={{ fontSize: 10, color: palette.green.dark1 }}>
            {((new Date(tool.endTime) - new Date(tool.startTime)) / 1000).toFixed(1)}s
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
              <div style={{
                fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px',
                color: palette.blue.dark1, marginBottom: 4,
              }}>Input</div>
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
              <div style={{
                fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px',
                color: palette.green.dark2, marginBottom: 4,
              }}>Output</div>
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
            <Badge variant={td.disposition === 'auto_close' ? 'lightgray' : td.disposition === 'escalate_urgent' ? 'red' : 'blue'}>
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
        {na.summary && (
          <div style={{ fontSize: 12, color: palette.gray.dark2, fontFamily: FONT, lineHeight: 1.5 }}>
            {na.summary}
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{
      fontFamily: "'Source Code Pro', monospace", fontSize: 10,
      color: palette.gray.dark1, lineHeight: 1.5,
      maxHeight: 160, overflowY: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
    }}>
      {JSON.stringify(output, null, 2)}
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

function AgentStepCard({ step, isLast }) {
  const [expanded, setExpanded] = useState(false);
  const [reasoningOpen, setReasoningOpen] = useState(false);
  const info = AGENT_LABELS[step.agent] || { label: step.agent, icon: '●', color: palette.gray.dark1 };
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
    <div style={{ display: 'flex', minHeight: 48 }}>
      {/* Timeline rail */}
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        width: 28, flexShrink: 0, position: 'relative',
      }}>
        <div style={{
          width: dotSize, height: dotSize, borderRadius: '50%', flexShrink: 0,
          background: isComplete ? info.color : isRunning ? 'transparent' : palette.gray.light2,
          border: isRunning ? `2px solid ${info.color}` : 'none',
          boxShadow: isRunning ? `0 0 0 3px ${info.color}33` : 'none',
          animation: isRunning ? 'pulse-dot 1.5s ease-in-out infinite' : 'none',
          marginTop: 6,
        }} />
        {!isLast && (
          <div style={{
            flex: 1, width: 2, background: lineColor, marginTop: 4, marginBottom: 0,
            opacity: isComplete ? 0.5 : 0.25,
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
          <span style={{ fontSize: 16 }}>{info.icon}</span>
          <span style={{
            fontSize: 13, fontWeight: 600, fontFamily: FONT, color: info.color,
          }}>
            {info.label}
          </span>
          {isRunning && (
            <span style={{
              fontSize: 10, fontFamily: FONT, color: palette.blue.base,
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
            <Badge variant="lightgray" style={{ fontSize: 9 }}>{step.statusLabel}</Badge>
          )}
          {step.duration != null && (
            <span style={{
              fontSize: 10, fontFamily: FONT, color: palette.gray.base,
              fontVariantNumeric: 'tabular-nums', marginLeft: 'auto',
            }}>
              {(step.duration / 1000).toFixed(1)}s
            </span>
          )}
          {hasDetail && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: 16, height: 16, fontSize: 9, color: palette.gray.dark1,
              transition: 'transform 0.15s',
              transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
              marginLeft: step.duration == null ? 'auto' : 0,
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
            marginTop: 8, marginLeft: 0, padding: 12, borderRadius: 6,
            background: palette.gray.light3, border: `1px solid ${palette.gray.light2}`,
          }}>
            {step.tools.length > 0 && (
              <div style={{ marginBottom: step.llmOutputs.length > 0 || step.structuredOutput ? 10 : 0 }}>
                <div style={{
                  fontSize: 10, fontWeight: 600, fontFamily: FONT,
                  color: palette.gray.dark1, marginBottom: 6,
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
      <ProgressHeader steps={nonErrorSteps} running={running} startTime={startTime} />
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
            />
          );
        })}
      </div>

      <style>{`
        @keyframes pulse-dot {
          0%, 100% { box-shadow: 0 0 0 3px rgba(0,104,74,0.15); }
          50% { box-shadow: 0 0 0 6px rgba(0,104,74,0.08); }
        }
        @keyframes shimmer {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// IntentPreviewCard
// ---------------------------------------------------------------------------

function IntentPreviewCard({ entityId, alertType, title, onProceed, onCancel }) {
  return (
    <Card style={{
      padding: spacing[4],
      border: `2px solid ${palette.blue.light1}`,
      background: '#fff',
      marginBottom: spacing[3],
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: spacing[3] }}>
        <div style={{
          width: 40, height: 40, borderRadius: 8,
          background: palette.blue.light3, display: 'flex',
          alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <Icon glyph="Visibility" size={20} fill={palette.blue.base} />
        </div>
        <div style={{ flex: 1 }}>
          <Subtitle style={{ fontFamily: FONT, margin: 0, fontSize: '15px', color: palette.blue.dark2 }}>
            Investigation Plan Preview
          </Subtitle>
          <Body style={{ fontFamily: FONT, fontSize: '13px', color: palette.gray.dark1, marginTop: 4 }}>
            {title ? `Scenario: ${title}` : 'Custom Investigation'}
          </Body>

          <div style={{
            marginTop: spacing[2], padding: spacing[2], borderRadius: 6,
            background: palette.gray.light3, border: `1px solid ${palette.gray.light2}`,
          }}>
            <div style={{ display: 'flex', gap: spacing[3], marginBottom: spacing[2], flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: 10, color: palette.gray.base, fontFamily: FONT, textTransform: 'uppercase' }}>Entity ID</div>
                <InlineCode>{entityId}</InlineCode>
              </div>
              <div>
                <div style={{ fontSize: 10, color: palette.gray.base, fontFamily: FONT, textTransform: 'uppercase' }}>Alert Type</div>
                <InlineCode>{alertType}</InlineCode>
              </div>
            </div>

            <div style={{ fontSize: 11, color: palette.gray.dark1, fontFamily: FONT, marginBottom: 4 }}>
              The agent pipeline will execute the following steps:
            </div>
            <ol style={{ margin: 0, paddingLeft: 18 }}>
              {PIPELINE_STEPS.map((step, i) => (
                <li key={i} style={{
                  fontSize: 11, fontFamily: FONT, color: palette.gray.dark2,
                  lineHeight: 1.6, paddingLeft: 4,
                }}>
                  {step}
                </li>
              ))}
            </ol>
          </div>

          <div style={{ display: 'flex', gap: spacing[2], marginTop: spacing[3] }}>
            <Button variant="baseGreen" onClick={onProceed}>
              Proceed with Investigation
            </Button>
            <Button variant="default" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </div>
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
      border: `2px solid ${palette.yellow.base}`,
      background: palette.yellow.light3,
      marginBottom: spacing[3],
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
              marginBottom: 6, borderRadius: 6,
              background: 'rgba(255,255,255,0.6)',
              border: `1px solid ${palette.yellow.light1}`,
              overflow: 'hidden',
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
        >
          Approve & File SAR
        </Button>
        <Button variant="default" onClick={() => onDecision('request_changes')} disabled={disabled}>
          Request Changes
        </Button>
        <Button variant="dangerOutline" onClick={() => onDecision('reject')} disabled={disabled}>
          Reject & Close
        </Button>
      </div>
      {!evidenceReviewed && (
        <div style={{ fontSize: 10, color: palette.yellow.dark2, fontFamily: FONT, marginTop: 6 }}>
          You must confirm evidence review before approving.
        </div>
      )}

      <Callout variant="note" style={{ marginTop: spacing[3] }}>
        <strong>Durable Pause with MongoDBSaver:</strong> The entire pipeline state &mdash; gathered evidence, triage
        decision, case file, and audit trail &mdash; is checkpointed to MongoDB as a single document. This investigation
        can be resumed hours or days later, even after server restarts. Traditional approaches require Redis for state +
        Kafka for event replay + PostgreSQL for data &mdash; MongoDB replaces all three.
      </Callout>

      {/* Checkpoint Explorer */}
      <CheckpointExplorer accumulatedEvidence={accumulatedEvidence} />
    </Card>
  );
}

function CheckpointExplorer({ accumulatedEvidence }) {
  const [expanded, setExpanded] = useState(false);

  const checkpoints = [];
  if (accumulatedEvidence?.triage_decision) checkpoints.push({ node: 'triage', label: 'Triage Decision', keys: Object.keys(accumulatedEvidence.triage_decision) });
  if (accumulatedEvidence?.gathered_data) checkpoints.push({ node: 'data_gathering', label: 'Data Gathering (4 parallel)', keys: ['entity_profile', 'transactions', 'network', 'watchlist'] });
  if (accumulatedEvidence?.case_file) checkpoints.push({ node: 'assemble_case', label: 'Case File Assembly', keys: Object.keys(accumulatedEvidence.case_file) });
  if (accumulatedEvidence?.typology) checkpoints.push({ node: 'typology', label: 'Typology Classification', keys: Object.keys(accumulatedEvidence.typology) });
  if (accumulatedEvidence?.narrative) checkpoints.push({ node: 'narrative', label: 'SAR Narrative', keys: Object.keys(accumulatedEvidence.narrative) });
  if (accumulatedEvidence?.validation_result) checkpoints.push({ node: 'validation', label: 'Quality Validation', keys: Object.keys(accumulatedEvidence.validation_result) });
  checkpoints.push({ node: 'human_review', label: 'Human Review (current)', keys: ['interrupt()', 'full_state_persisted'] });

  const totalKeys = checkpoints.reduce((s, c) => s + c.keys.length, 0);

  return (
    <div style={{ marginTop: spacing[2] }}>
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '8px 12px', borderRadius: 6,
          background: '#1a1a2e', color: palette.green.light1,
          border: `1px solid ${palette.green.dark2}44`,
          cursor: 'pointer', fontFamily: FONT, fontSize: 12, fontWeight: 600,
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 14 }}>🗄</span>
          MongoDBSaver Checkpoint Explorer
          <span style={{
            fontSize: 9, padding: '1px 5px', borderRadius: 4,
            background: palette.green.dark2, color: palette.green.light3,
          }}>
            {checkpoints.length} checkpoints
          </span>
        </span>
        <span style={{ fontSize: 10, transition: 'transform 0.15s', transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
          ▼
        </span>
      </button>

      {expanded && (
        <div style={{
          padding: '10px 12px', background: '#1a1a2e',
          borderRadius: '0 0 6px 6px', borderTop: `1px solid ${palette.green.dark2}22`,
          border: `1px solid ${palette.green.dark2}44`, borderTopWidth: 0,
        }}>
          <div style={{
            display: 'flex', gap: spacing[2], marginBottom: spacing[2], flexWrap: 'wrap',
          }}>
            <div style={{ padding: '4px 10px', borderRadius: 4, background: `${palette.purple.dark2}33`, textAlign: 'center' }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: palette.purple.light1, fontFamily: FONT }}>{checkpoints.length}</div>
              <div style={{ fontSize: 9, color: palette.gray.light1, fontFamily: FONT }}>Checkpoints</div>
            </div>
            <div style={{ padding: '4px 10px', borderRadius: 4, background: `${palette.blue.dark1}33`, textAlign: 'center' }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: palette.blue.light1, fontFamily: FONT }}>{totalKeys}</div>
              <div style={{ fontSize: 9, color: palette.gray.light1, fontFamily: FONT }}>State Keys</div>
            </div>
            <div style={{ flex: 1, padding: '4px 10px', borderRadius: 4, background: `${palette.green.dark2}33` }}>
              <div style={{ fontSize: 9, color: palette.green.light2, fontFamily: FONT, fontWeight: 600, marginBottom: 2 }}>
                Resumable from any point
              </div>
              <div style={{ fontSize: 9, color: palette.gray.light1, fontFamily: FONT, lineHeight: 1.4 }}>
                If the server crashes, the pipeline resumes from the last checkpoint &mdash; not from scratch.
              </div>
            </div>
          </div>

          {/* Checkpoint timeline */}
          {checkpoints.map((cp, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 16, flexShrink: 0 }}>
                <div style={{
                  width: 8, height: 8, borderRadius: '50%', marginTop: 4,
                  background: cp.node === 'human_review' ? palette.yellow.base : palette.green.light1,
                  border: cp.node === 'human_review' ? `2px solid ${palette.yellow.base}` : 'none',
                }} />
                {i < checkpoints.length - 1 && (
                  <div style={{ flex: 1, width: 1, background: palette.gray.dark1, marginTop: 2, minHeight: 16 }} />
                )}
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: palette.green.light2, fontFamily: FONT }}>
                  {cp.label}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginTop: 2 }}>
                  {cp.keys.slice(0, 6).map((k, j) => (
                    <span key={j} style={{
                      fontSize: 8, fontFamily: "'Source Code Pro', monospace",
                      padding: '1px 4px', borderRadius: 2,
                      background: `${palette.green.dark2}44`, color: palette.gray.light1,
                    }}>
                      {k}
                    </span>
                  ))}
                  {cp.keys.length > 6 && (
                    <span style={{ fontSize: 8, color: palette.gray.light1 }}>+{cp.keys.length - 6} more</span>
                  )}
                </div>
              </div>
            </div>
          ))}

          <div style={{
            marginTop: spacing[2], padding: '6px 8px', borderRadius: 4,
            background: `${palette.green.dark2}22`, fontSize: 10, fontFamily: FONT,
            color: palette.gray.light1, lineHeight: 1.4,
          }}>
            Without MongoDB: Redis for state serialization + Kafka for event sourcing + PostgreSQL for data persistence + custom recovery logic.
            <strong style={{ color: palette.green.light2 }}> With MongoDBSaver: one database, zero custom code.</strong>
          </div>
        </div>
      )}
    </div>
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
  const { status, typology, narrative, triage_decision } = result;
  const risk = triage_decision?.risk_score != null ? getRiskLevel(triage_decision.risk_score) : null;

  return (
    <Card style={{
      padding: spacing[3],
      border: `1px solid ${palette.green.light1}`,
      background: palette.green.light3,
    }}>
      <Subtitle style={{ fontFamily: FONT, marginBottom: spacing[2], fontSize: '14px', color: palette.green.dark2 }}>
        Investigation Complete
      </Subtitle>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: spacing[3], marginBottom: spacing[2] }}>
        <div>
          <Body style={{ fontSize: '12px', color: palette.gray.base, fontFamily: FONT }}>Status</Body>
          <Badge variant={status === 'filed' ? 'green' : status === 'closed_false_positive' ? 'lightgray' : 'blue'}>
            {status}
          </Badge>
        </div>
        {risk && (
          <div>
            <Body style={{ fontSize: '12px', color: palette.gray.base, fontFamily: FONT }}>Risk Score</Body>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Body style={{ fontWeight: 700, fontFamily: FONT, color: risk.color }}>
                {triage_decision.risk_score}
              </Body>
              <span style={{
                fontSize: 9, padding: '1px 5px', borderRadius: 3,
                background: risk.bg, color: risk.color, fontFamily: FONT,
              }}>{risk.label}</span>
            </div>
          </div>
        )}
        {typology?.primary_typology && (
          <div>
            <Body style={{ fontSize: '12px', color: palette.gray.base, fontFamily: FONT }}>Typology</Body>
            <Body style={{ fontWeight: 600, fontFamily: FONT }}>{typology.primary_typology}</Body>
          </div>
        )}
      </div>

      {narrative?.introduction && (
        <div style={{ marginTop: spacing[2] }}>
          <Body style={{ fontSize: '12px', color: palette.gray.base, fontFamily: FONT, marginBottom: spacing[1] }}>
            Narrative Summary
          </Body>
          <Body style={{ fontSize: '13px', fontFamily: FONT, color: palette.gray.dark2, lineHeight: '1.5' }}>
            {narrative.introduction}
          </Body>
        </div>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function InvestigationLauncher({ onComplete }) {
  const [customEntityId, setCustomEntityId] = useState('');
  const [running, setRunning] = useState(false);
  const [events, setEvents] = useState([]);
  const [finalResult, setFinalResult] = useState(null);
  const [needsReview, setNeedsReview] = useState(false);
  const [reviewPayload, setReviewPayload] = useState(null);
  const [analystNotes, setAnalystNotes] = useState('');
  const [startTime, setStartTime] = useState(null);
  const [previewData, setPreviewData] = useState(null);

  // Scenario Simulator state
  const [simEntities, setSimEntities] = useState([]);
  const [simTypologies, setSimTypologies] = useState([]);
  const [simSelectedEntity, setSimSelectedEntity] = useState(null);
  const [simSelectedTypology, setSimSelectedTypology] = useState(null);
  const [simLoading, setSimLoading] = useState(false);
  const [simExpanded, setSimExpanded] = useState(false);

  useEffect(() => {
    if (!simExpanded) return;
    let cancelled = false;
    setSimLoading(true);
    Promise.all([fetchInvestigableEntities(), fetchTypologies()])
      .then(([entRes, typRes]) => {
        if (cancelled) return;
        setSimEntities(entRes.entities || []);
        setSimTypologies(typRes.typologies || []);
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setSimLoading(false); });
    return () => { cancelled = true; };
  }, [simExpanded]);

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

  const [showLivePipeline, setShowLivePipeline] = useState(false);

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
    setPreviewData(null);
    setStartTime(Date.now());

    try {
      await launchInvestigation({ entity_id: entityId, alert_type: alertType }, handleEvent);
    } catch (err) {
      handleEvent({ type: 'error', message: err.message });
    }
  };

  const handlePreview = (entityId, alertType, title) => {
    setPreviewData({ entityId, alertType, title });
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

  // If showing intent preview, render it
  if (previewData && !running && events.length === 0) {
    return (
      <IntentPreviewCard
        entityId={previewData.entityId}
        alertType={previewData.alertType}
        title={previewData.title}
        onProceed={() => launch(previewData.entityId, previewData.alertType)}
        onCancel={() => setPreviewData(null)}
      />
    );
  }

  return (
    <div>
      {/* Demo Scenarios */}
      {events.length === 0 && !running && (
        <>
          <Banner variant="info" style={{ marginBottom: spacing[3] }}>
            <strong>MongoDB + LangGraph for Agentic AI:</strong> MongoDB serves as the backbone for this multi-agent
            investigation pipeline &mdash; <code>MongoDBSaver</code> checkpoints durable agent state enabling
            human-in-the-loop pause/resume, the flexible document model stores evolving investigation evidence without
            schema migrations, and <code>$graphLookup</code> powers real-time network traversal. No Redis, no Kafka, no
            separate graph database.
          </Banner>

          <Subtitle style={{ fontFamily: FONT, marginBottom: spacing[2] }}>
            Demo Scenarios
          </Subtitle>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: spacing[2],
            marginBottom: spacing[4],
          }}>
            {DEMO_SCENARIOS.map((scenario) => (
              <Card key={scenario.id} style={{
                padding: spacing[3],
                border: `1px solid ${palette.gray.light2}`,
              }}>
                <div style={{
                  display: 'flex', justifyContent: 'space-between',
                  alignItems: 'flex-start', marginBottom: spacing[2],
                }}>
                  <Subtitle style={{ fontFamily: FONT, fontSize: '14px', margin: 0 }}>
                    {scenario.title}
                  </Subtitle>
                  <Badge variant={scenario.badge.variant}>{scenario.badge.label}</Badge>
                </div>
                <Body style={{
                  fontSize: '13px', color: palette.gray.dark1,
                  fontFamily: FONT, marginBottom: spacing[2],
                }}>
                  {scenario.description}
                </Body>
                <Body style={{
                  fontSize: '12px', color: palette.gray.base,
                  fontFamily: FONT, marginBottom: spacing[2],
                }}>
                  Entity: <code>{scenario.entity_id}</code>
                </Body>
                <Button
                  size="small" variant="baseGreen"
                  onClick={() => handlePreview(scenario.entity_id, scenario.alert_type, scenario.title)}
                  disabled={running}
                >
                  Launch
                </Button>
              </Card>
            ))}
          </div>

          {/* Scenario Simulator */}
          <Card style={{
            padding: spacing[3], marginBottom: spacing[4],
            border: `1px solid ${palette.gray.light2}`,
          }}>
            <div
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
              onClick={() => setSimExpanded(v => !v)}
            >
              <Subtitle style={{ fontFamily: FONT, fontSize: '14px', margin: 0 }}>
                Scenario Simulator
              </Subtitle>
              <Body style={{ fontSize: '12px', color: palette.gray.base, fontFamily: FONT }}>
                {simExpanded ? '▲ Collapse' : '▼ Select entity + red-flag scenario'}
              </Body>
            </div>

            {simExpanded && (
              <div style={{ marginTop: spacing[3] }}>
                <div style={{
                  padding: '8px 12px', borderRadius: 6, marginBottom: spacing[2],
                  background: palette.green.light3, border: `1px solid ${palette.green.light1}`,
                  fontSize: 12, fontFamily: FONT, color: palette.green.dark2,
                }}>
                  <strong>MongoDB Aggregation:</strong> The entity list is built from a <code>$lookup</code> pipeline
                  joining <code>entities</code> with <code>transactionsv2</code>, grouping by red-flag tags. The
                  typology picker queries the <code>typology_library</code> collection &mdash; 12 AML typologies seeded
                  with regulatory references. No ETL, no data warehouse.
                </div>
                {simLoading ? (
                  <Body style={{ fontFamily: FONT, fontSize: '13px', color: palette.gray.dark1 }}>
                    Loading entities and typologies...
                  </Body>
                ) : (
                  <>
                    {/* Entity selector */}
                    <div style={{ marginBottom: spacing[3] }}>
                      <Body style={{
                        fontSize: '12px', fontWeight: 600, fontFamily: FONT,
                        color: palette.gray.dark1, marginBottom: spacing[1],
                        textTransform: 'uppercase', letterSpacing: '0.5px',
                      }}>
                        Select Entity
                      </Body>
                      <div style={{
                        maxHeight: 200, overflowY: 'auto',
                        border: `1px solid ${palette.gray.light2}`, borderRadius: 6,
                      }}>
                        {simEntities.map((ent) => {
                          const isSelected = simSelectedEntity?.entityId === ent.entityId;
                          const riskLevel = ent.riskAssessment?.overall?.level || 'unknown';
                          const riskVariant = riskLevel === 'critical' || riskLevel === 'high' ? 'red'
                            : riskLevel === 'medium' ? 'yellow' : 'green';
                          return (
                            <div
                              key={ent.entityId}
                              onClick={() => { setSimSelectedEntity(ent); setSimSelectedTypology(null); }}
                              style={{
                                padding: `${spacing[1]}px ${spacing[2]}px`,
                                cursor: 'pointer',
                                background: isSelected ? palette.green.light3 : 'transparent',
                                borderBottom: `1px solid ${palette.gray.light3}`,
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                              }}
                            >
                              <div>
                                <Body style={{ fontSize: '13px', fontFamily: FONT, fontWeight: isSelected ? 600 : 400 }}>
                                  {ent.name?.full || ent.entityId}
                                </Body>
                                <Body style={{ fontSize: '11px', fontFamily: FONT, color: palette.gray.base }}>
                                  {ent.entityType} &middot; {ent.scenarioKey || 'N/A'}
                                </Body>
                              </div>
                              <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexShrink: 0 }}>
                                <Badge variant={riskVariant} style={{ fontSize: 10 }}>{riskLevel}</Badge>
                                {ent.red_flag_tags?.length > 0 && (
                                  <Badge variant="lightgray" style={{ fontSize: 9 }}>
                                    {ent.red_flag_tags.length} flags
                                  </Badge>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Typology selector -- shown after entity is picked */}
                    {simSelectedEntity && (
                      <div style={{ marginBottom: spacing[3] }}>
                        <Body style={{
                          fontSize: '12px', fontWeight: 600, fontFamily: FONT,
                          color: palette.gray.dark1, marginBottom: spacing[1],
                          textTransform: 'uppercase', letterSpacing: '0.5px',
                        }}>
                          Red-Flag Scenario
                        </Body>
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                          gap: spacing[1],
                        }}>
                          {simTypologies.map((typ) => {
                            const isSelected = simSelectedTypology?.typology_id === typ.typology_id;
                            return (
                              <div
                                key={typ.typology_id}
                                onClick={() => setSimSelectedTypology(typ)}
                                style={{
                                  padding: spacing[2],
                                  borderRadius: 6,
                                  cursor: 'pointer',
                                  border: `1.5px solid ${isSelected ? palette.green.dark1 : palette.gray.light2}`,
                                  background: isSelected ? palette.green.light3 : 'transparent',
                                }}
                              >
                                <Body style={{ fontSize: '13px', fontFamily: FONT, fontWeight: 600 }}>
                                  {typ.name}
                                </Body>
                                <Body style={{ fontSize: '11px', fontFamily: FONT, color: palette.gray.dark1, marginTop: 2 }}>
                                  {typ.red_flags?.slice(0, 2).join(' · ')}
                                </Body>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Launch */}
                    {simSelectedEntity && simSelectedTypology && (
                      <Button
                        variant="baseGreen"
                        onClick={() => handlePreview(
                          simSelectedEntity.entityId,
                          simSelectedTypology.typology_id,
                          `${simSelectedTypology.name} — ${simSelectedEntity.name?.full || simSelectedEntity.entityId}`,
                        )}
                        disabled={running}
                      >
                        Launch Investigation
                      </Button>
                    )}
                  </>
                )}
              </div>
            )}
          </Card>

          {/* Custom Launch */}
          <Card style={{
            padding: spacing[3], marginBottom: spacing[4],
            border: `1px solid ${palette.gray.light2}`,
          }}>
            <Subtitle style={{ fontFamily: FONT, marginBottom: spacing[2], fontSize: '14px' }}>
              Custom Investigation
            </Subtitle>
            <div style={{ display: 'flex', gap: spacing[2], alignItems: 'flex-end' }}>
              <TextInput
                label="Entity ID"
                placeholder="e.g. sanctioned_org_varied_0"
                value={customEntityId}
                onChange={(e) => setCustomEntityId(e.target.value)}
                style={{ flex: 1 }}
              />
              <Button
                variant="baseGreen"
                onClick={() => handlePreview(customEntityId, 'custom', null)}
                disabled={running || !customEntityId.trim()}
              >
                Investigate
              </Button>
            </div>
          </Card>
        </>
      )}

      {/* Live Pipeline Graph Toggle */}
      {events.length > 0 && (
        <div style={{ marginBottom: spacing[2] }}>
          <Button
            size="xsmall"
            variant="default"
            onClick={() => setShowLivePipeline(v => !v)}
            style={{ marginBottom: spacing[2] }}
          >
            {showLivePipeline ? 'Hide' : 'Show'} Live Pipeline
          </Button>
          {showLivePipeline && (
            <div style={{
              height: 400, marginBottom: spacing[2], borderRadius: 8,
              overflow: 'hidden', border: `1px solid ${palette.gray.light2}`,
            }}>
              <AgenticPipelineGraph showTools={false} activeAgents={activeAgents} />
            </div>
          )}
        </div>
      )}

      {/* Agent Pipeline Progress */}
      {events.length > 0 && (
        <AgentStepTimeline events={events} running={running} startTime={startTime} />
      )}

      {/* MongoDB Operations Insights Panel */}
      {events.length > 0 && (
        <InvestigationInsightsPanel events={events} running={running} />
      )}

      {/* Human Review Panel */}
      {needsReview && reviewPayload && (
        <HumanReviewPanel
          payload={reviewPayload}
          accumulatedEvidence={accumulatedEvidence}
          analystNotes={analystNotes}
          onNotesChange={setAnalystNotes}
          onDecision={handleResume}
          disabled={running}
        />
      )}

      {/* Final Result Summary */}
      {finalResult && !needsReview && (
        <>
          <FinalResultCard result={finalResult} />
          <Callout variant="tip" style={{ marginTop: spacing[2] }}>
            <strong>Single Document, Complete Investigation:</strong> The final investigation &mdash; entity profile,
            360&deg; case file, typology classification, network analysis, SAR narrative, validation results, human
            decision, and full audit trail &mdash; is stored as one rich MongoDB document. In a relational database, this
            would be scattered across 12&ndash;15 normalized tables with complex JOIN queries for every retrieval.
          </Callout>
        </>
      )}
    </div>
  );
}
