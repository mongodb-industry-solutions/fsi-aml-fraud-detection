"use client";

import { useCallback, useMemo, useState, useEffect } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  MarkerType,
  Handle,
  Position,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { palette } from '@leafygreen-ui/palette';
import { uiTokens, GLOBAL_KEYFRAMES } from './investigationTokens';

const FONT = uiTokens.font;

const AGENT_TO_NODE = {
  triage: 'triage',
  auto_close: 'autoClose',
  data_gathering: 'dataGathering',
  fetch_entity_profile: 'fetchEntity',
  fetch_transactions: 'fetchTxn',
  fetch_network: 'fetchNetwork',
  fetch_watchlist: 'fetchWatchlist',
  assemble_case: 'assembleCase',
  network_analyst: 'networkAnalyst',
  temporal_analyst: 'temporalAnalyst',
  trail_follower: 'trailFollower',
  sub_investigation_dispatch: 'subDispatch',
  mini_investigate: 'miniInvestigate',
  narrative: 'narrative',
  validation: 'validation',
  human_review: 'humanReview',
  finalize: 'finalize',
};

// ---------------------------------------------------------------------------
// Shared execution-state helpers
// ---------------------------------------------------------------------------

function execBgColor(execState, defaultBg = '#fff') {
  if (execState === 'active') return palette.blue.light3;
  if (execState === 'completed') return '#f0faf5';
  if (execState === 'pending') return '#fafafa';
  return defaultBg;
}

function CompletedBadge({ size = 16 }) {
  return (
    <div style={{
      position: 'absolute', top: -4, right: -4,
      width: size, height: size, borderRadius: '50%',
      background: palette.green.dark1, color: '#fff',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size - 6, fontWeight: 700, lineHeight: 1,
      border: '2px solid #fff',
      boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
    }}>
      &#10003;
    </div>
  );
}

function TypeBadge({ label, bg, color }) {
  return (
    <div style={{
      fontSize: 7, fontFamily: FONT, fontWeight: 700,
      padding: '1px 5px', borderRadius: 2,
      background: bg, color,
      textTransform: 'uppercase', letterSpacing: '0.5px',
      lineHeight: 1.5,
    }}>
      {label}
    </div>
  );
}

function MongoDBIndicator() {
  return (
    <div style={{
      position: 'absolute', top: -3, left: -3,
      width: 16, height: 16, borderRadius: '50%',
      background: palette.green.dark1,
      border: '2px solid #fff',
      boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 5,
    }}>
      <svg width="8" height="10" viewBox="0 0 8 10" fill="none">
        <path d="M4 0.5C4 0.5 1 3 1 5.5C1 7.5 2.3 9 4 9.5C5.7 9 7 7.5 7 5.5C7 3 4 0.5 4 0.5Z" fill="#fff" />
      </svg>
    </div>
  );
}

function Tooltip({ text }) {
  return (
    <div style={{
      position: 'absolute', bottom: '100%', left: '50%',
      transform: 'translateX(-50%)', marginBottom: 10,
      background: palette.gray.dark3, color: palette.gray.light3,
      borderRadius: 6, padding: '8px 12px', fontSize: 11,
      lineHeight: 1.45, width: 230, zIndex: 100,
      boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
      pointerEvents: 'none', textAlign: 'left',
    }}>
      {text}
      <div style={{
        position: 'absolute', top: '100%', left: '50%',
        transform: 'translateX(-50%)',
        width: 0, height: 0,
        borderLeft: '6px solid transparent',
        borderRight: '6px solid transparent',
        borderTop: `6px solid ${palette.gray.dark3}`,
      }} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Node Components
// ---------------------------------------------------------------------------

function TerminalNode({ data }) {
  return (
    <div style={{
      background: data.color || palette.gray.dark2, color: '#fff',
      borderRadius: '50%', width: 52, height: 52,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 10, fontWeight: 600, fontFamily: FONT,
      boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
      filter: 'drop-shadow(0 2px 6px rgba(20, 23, 26, 0.08))',
      textAlign: 'center', lineHeight: 1.2,
    }}>
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      {data.label}
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
    </div>
  );
}

function AgentNode({ data }) {
  const [hovered, setHovered] = useState(false);
  const execState = data.executionState;
  const accentColor = data.color || palette.blue.base;

  const borderTopColor = execState === 'active' ? palette.blue.base
    : execState === 'completed' ? palette.green.dark1
    : accentColor;

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: execBgColor(execState),
        borderRadius: 8, padding: 0, minWidth: 170,
        textAlign: 'center', fontFamily: FONT,
        boxShadow: execState === 'active'
          ? `0 0 0 4px ${palette.blue.light2}, 0 3px 12px rgba(0,0,0,0.1)`
          : hovered ? '0 3px 12px rgba(0,0,0,0.12)' : '0 1px 4px rgba(0,0,0,0.06)',
        filter: 'drop-shadow(0 2px 6px rgba(20, 23, 26, 0.08))',
        transition: 'all 0.3s ease',
        position: 'relative',
        border: `1px solid ${execState === 'active' ? palette.blue.light1 : palette.gray.light2}`,
        borderTop: `4px solid ${borderTopColor}`,
        opacity: execState === 'pending' ? 0.5 : 1,
        animation: execState === 'active' ? 'nodePulse 2s ease-in-out infinite' : 'none',
        overflow: 'hidden',
      }}
    >
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      <Handle type="target" position={Position.Left} id="left" style={{ opacity: 0 }} />
      <div style={{
        display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 4,
        padding: '4px 12px 2px', background: `${accentColor}0A`,
      }}>
        <TypeBadge label="AGENT" bg={`${accentColor}18`} color={accentColor} />
        <span style={{ fontSize: 7, color: palette.gray.base }}>LLM</span>
      </div>
      <div style={{ padding: '6px 14px 10px' }}>
        <div style={{ fontSize: 15, marginBottom: 2 }}>{data.icon}</div>
        <div style={{ fontSize: 12, fontWeight: 600, color: palette.gray.dark3 }}>
          {data.label}
        </div>
        {data.subtitle && (
          <div style={{ fontSize: 9, color: palette.gray.dark1, marginTop: 2 }}>
            {data.subtitle}
          </div>
        )}
        {data.mongoBadge && (
          <div style={{
            fontSize: 7, fontFamily: "'Source Code Pro', monospace", fontWeight: 600,
            padding: '1px 5px', borderRadius: 3, marginTop: 3, display: 'inline-block',
            background: palette.green.light3, color: palette.green.dark2,
            border: `1px solid ${palette.green.light1}`,
          }}>
            {data.mongoBadge}
          </div>
        )}
        {data.tools && data.tools.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, justifyContent: 'center', marginTop: 4 }}>
            {data.tools.map((t) => (
              <span key={t} style={{
                fontSize: 8, fontFamily: "'Source Code Pro', monospace",
                padding: '1px 5px', borderRadius: 3,
                background: `${accentColor}12`, color: accentColor,
                border: `1px solid ${accentColor}30`, fontWeight: 500,
              }}>
                {t}
              </span>
            ))}
          </div>
        )}
      </div>
      {data.mongoBadge && <MongoDBIndicator />}
      {execState === 'completed' && <CompletedBadge />}
      {hovered && data.tooltip && <Tooltip text={data.tooltip} />}
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Right} id="right" style={{ opacity: 0 }} />
    </div>
  );
}

function ComputeNode({ data }) {
  const [hovered, setHovered] = useState(false);
  const execState = data.executionState;
  const accentColor = data.color || palette.yellow.dark2;

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: execBgColor(execState),
        borderRadius: 8, padding: 0, minWidth: 160,
        textAlign: 'center', fontFamily: FONT,
        boxShadow: execState === 'active'
          ? `0 0 0 4px ${palette.blue.light2}`
          : hovered ? '0 3px 12px rgba(0,0,0,0.12)' : '0 1px 4px rgba(0,0,0,0.06)',
        filter: 'drop-shadow(0 2px 6px rgba(20, 23, 26, 0.08))',
        transition: 'all 0.3s ease',
        position: 'relative',
        border: `1px solid ${execState === 'active' ? palette.blue.light1 : palette.gray.light2}`,
        borderTop: `4px solid ${accentColor}`,
        borderStyle: 'solid solid solid solid',
        opacity: execState === 'pending' ? 0.5 : 1,
        overflow: 'hidden',
      }}
    >
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      <div style={{
        display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 4,
        padding: '4px 12px 2px', background: `${accentColor}0A`,
      }}>
        <TypeBadge label="COMPUTE" bg={`${accentColor}18`} color={accentColor} />
        <span style={{ fontSize: 7, color: palette.gray.base }}>no LLM</span>
      </div>
      <div style={{ padding: '6px 14px 10px' }}>
        <div style={{ fontSize: 15, marginBottom: 2 }}>{data.icon}</div>
        <div style={{ fontSize: 12, fontWeight: 600, color: palette.gray.dark3 }}>
          {data.label}
        </div>
        {data.subtitle && (
          <div style={{ fontSize: 9, color: palette.gray.dark1, marginTop: 2 }}>
            {data.subtitle}
          </div>
        )}
        {data.tools && data.tools.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, justifyContent: 'center', marginTop: 4 }}>
            {data.tools.map((t) => (
              <span key={t} style={{
                fontSize: 8, fontFamily: "'Source Code Pro', monospace",
                padding: '1px 5px', borderRadius: 3,
                background: `${accentColor}12`, color: accentColor,
                border: `1px solid ${accentColor}30`, fontWeight: 500,
              }}>
                {t}
              </span>
            ))}
          </div>
        )}
        {data.mongoBadge && (
          <div style={{
            fontSize: 7, fontFamily: "'Source Code Pro', monospace", fontWeight: 600,
            padding: '1px 5px', borderRadius: 3, marginTop: 3, display: 'inline-block',
            background: palette.green.light3, color: palette.green.dark2,
            border: `1px solid ${palette.green.light1}`,
          }}>
            {data.mongoBadge}
          </div>
        )}
      </div>
      {data.mongoBadge && <MongoDBIndicator />}
      {execState === 'completed' && <CompletedBadge />}
      {hovered && data.tooltip && <Tooltip text={data.tooltip} />}
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
    </div>
  );
}

function WorkerNode({ data }) {
  const execState = data.executionState;

  return (
    <div style={{
      background: execBgColor(execState),
      borderRadius: 6, padding: '7px 12px', minWidth: 120,
      textAlign: 'center', fontFamily: FONT,
      boxShadow: execState === 'active'
        ? `0 0 0 4px ${palette.blue.light2}`
        : '0 1px 3px rgba(0,0,0,0.06)',
      filter: 'drop-shadow(0 2px 6px rgba(20, 23, 26, 0.08))',
      border: `1px dashed ${execState === 'active' ? palette.blue.light1 : palette.purple.light1}`,
      borderLeft: `4px solid ${execState === 'completed' ? palette.green.dark1 : palette.purple.base}`,
      opacity: execState === 'pending' ? 0.5 : 1,
      transition: 'all 0.3s ease',
      position: 'relative',
    }}>
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      <div style={{ marginBottom: 2 }}>
        <TypeBadge label="TOOL" bg={`${palette.purple.base}12`} color={palette.purple.dark2} />
      </div>
      <div style={{ fontSize: 13, marginBottom: 1 }}>{data.icon}</div>
      <div style={{ fontSize: 10, fontWeight: 600, color: palette.gray.dark3 }}>
        {data.label}
      </div>
      {data.toolName && (
        <div style={{
          fontSize: 8, fontFamily: "'Source Code Pro', monospace",
          padding: '1px 5px', borderRadius: 3,
          background: `${palette.purple.base}10`, color: palette.purple.dark2,
          border: `1px solid ${palette.purple.base}25`,
          marginTop: 3, display: 'inline-block', fontWeight: 500,
        }}>
          {data.toolName}
        </div>
      )}
      {data.mongoBadge && (
        <div style={{
          fontSize: 7, fontFamily: "'Source Code Pro', monospace", fontWeight: 600,
          padding: '1px 5px', borderRadius: 3, marginTop: 2, display: 'inline-block',
          background: palette.green.light3, color: palette.green.dark2,
          border: `1px solid ${palette.green.light1}`,
        }}>
          {data.mongoBadge}
        </div>
      )}
      {data.mongoBadge && <MongoDBIndicator />}
      {execState === 'completed' && <CompletedBadge size={14} />}
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
    </div>
  );
}

function WorkflowNode({ data }) {
  const [hovered, setHovered] = useState(false);
  const execState = data.executionState;
  const accentColor = data.color || palette.gray.dark1;

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: execBgColor(execState, palette.gray.light3),
        borderRadius: 20, padding: '8px 16px', minWidth: 140,
        textAlign: 'center', fontFamily: FONT,
        boxShadow: execState === 'active'
          ? `0 0 0 4px ${palette.blue.light2}`
          : '0 1px 3px rgba(0,0,0,0.04)',
        filter: 'drop-shadow(0 2px 6px rgba(20, 23, 26, 0.08))',
        border: `1px solid ${execState === 'active' ? palette.blue.light1 : palette.gray.light2}`,
        opacity: execState === 'pending' ? 0.5 : 1,
        transition: 'all 0.3s ease',
        position: 'relative',
      }}
    >
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      <Handle type="target" position={Position.Left} id="left" style={{ opacity: 0 }} />
      <div style={{ marginBottom: 3 }}>
        <TypeBadge label="WORKFLOW" bg={palette.gray.light2} color={palette.gray.dark1} />
      </div>
      <div style={{ fontSize: 13, marginBottom: 1 }}>{data.icon}</div>
      <div style={{ fontSize: 11, fontWeight: 600, color: palette.gray.dark2 }}>
        {data.label}
      </div>
      {data.subtitle && (
        <div style={{ fontSize: 9, color: palette.gray.base, marginTop: 1 }}>
          {data.subtitle}
        </div>
      )}
      {data.mongoBadge && (
        <div style={{
          fontSize: 7, fontFamily: "'Source Code Pro', monospace", fontWeight: 600,
          padding: '1px 5px', borderRadius: 3, marginTop: 3, display: 'inline-block',
          background: palette.green.light3, color: palette.green.dark2,
          border: `1px solid ${palette.green.light1}`,
        }}>
          {data.mongoBadge}
        </div>
      )}
      {data.mongoBadge && <MongoDBIndicator />}
      {execState === 'completed' && <CompletedBadge size={14} />}
      {hovered && data.tooltip && <Tooltip text={data.tooltip} />}
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Right} id="right" style={{ opacity: 0 }} />
    </div>
  );
}

function CollectionNode({ data }) {
  return (
    <div style={{
      background: palette.gray.light3, borderRadius: 4,
      padding: '4px 8px', textAlign: 'center',
      fontFamily: "'Source Code Pro', monospace",
      fontSize: 8, fontWeight: 500, color: palette.gray.dark1,
      border: `1px dashed ${palette.gray.light1}`,
    }}>
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      <div style={{ fontSize: 10, marginBottom: 1 }}>{data.icon}</div>
      <div>{data.label}</div>
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
    </div>
  );
}

const NODE_TYPES = {
  terminal: TerminalNode,
  agent: AgentNode,
  compute: ComputeNode,
  worker: WorkerNode,
  workflow: WorkflowNode,
  collection: CollectionNode,
};

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

const CX = 300;

// ---------------------------------------------------------------------------
// Nodes
// ---------------------------------------------------------------------------

const INITIAL_NODES = [
  {
    id: 'alertInput', type: 'terminal',
    position: { x: CX, y: 0 },
    data: { label: 'Alert\nInput', color: palette.green.dark2 },
  },
  {
    id: 'triage', type: 'agent',
    position: { x: CX - 30, y: 80 },
    data: {
      label: 'Triage Agent', icon: '🔍', color: palette.blue.base,
      subtitle: 'TriageDecision \u2192 Command',
      mongoBadge: 'MongoDBSaver',
      tooltip: 'LLM risk scoring with contextual reasoning. MongoDBSaver checkpoints the decision, enabling Command routing.',
    },
  },
  {
    id: 'autoClose', type: 'workflow',
    position: { x: 20, y: 195 },
    data: {
      label: 'Auto-Close', icon: '\u2717', color: palette.gray.dark1,
      subtitle: 'False Positive',
      tooltip: 'Risk < 25, no watchlist hits. Sets status to closed_false_positive \u2014 no LLM, no computation.',
    },
  },
  {
    id: 'dataGathering', type: 'workflow',
    position: { x: CX - 30, y: 250 },
    data: {
      label: 'Data Gathering', icon: '📊', color: palette.purple.base,
      subtitle: 'Send API Fan-out',
      tooltip: 'Orchestration dispatcher. Uses LangGraph Send to fan-out 4 parallel tool workers. No LLM \u2014 just routing.',
    },
  },
  {
    id: 'fetchEntity', type: 'worker',
    position: { x: 50, y: 370 },
    data: { label: 'Fetch Entity', icon: '👤', toolName: 'get_entity_profile', mongoBadge: 'findOne()' },
  },
  {
    id: 'fetchTxn', type: 'worker',
    position: { x: 195, y: 370 },
    data: { label: 'Fetch Txns', icon: '💳', toolName: 'query_entity_transactions', mongoBadge: 'aggregate()' },
  },
  {
    id: 'fetchNetwork', type: 'worker',
    position: { x: 355, y: 370 },
    data: { label: 'Fetch Network', icon: '🕸', toolName: 'analyze_entity_network', mongoBadge: '$graphLookup' },
  },
  {
    id: 'fetchWatchlist', type: 'worker',
    position: { x: 510, y: 370 },
    data: { label: 'Fetch Watchlist', icon: '🛡', toolName: 'screen_watchlists', mongoBadge: 'find()' },
  },
  {
    id: 'assembleCase', type: 'agent',
    position: { x: CX - 30, y: 480 },
    data: {
      label: 'Case Analyst Agent', icon: '📁', color: palette.green.dark2,
      subtitle: 'LLM \u2192 CaseFile + TypologyResult',
      tools: ['search_typologies'],
      mongoBadge: 'Document Model + Atlas Search',
      tooltip: 'Fan-in node. LLM synthesizes gathered evidence into a 360\u00b0 CaseFile and classifies typology. RAG over typology_library via Atlas Search.',
    },
  },
  {
    id: 'networkAnalyst', type: 'compute',
    position: { x: CX - 160, y: 590 },
    data: {
      label: 'Network Analyst', icon: '🔗', color: palette.yellow.dark2,
      subtitle: 'Centrality + Risk Scoring',
      tools: ['compute_network_metrics'],
      mongoBadge: '$graphLookup',
      tooltip: 'Pure compute \u2014 no LLM. Computes degree centrality and network risk via $graphLookup. Runs in PARALLEL with Temporal Analyst.',
    },
  },
  {
    id: 'temporalAnalyst', type: 'compute',
    position: { x: CX + 110, y: 590 },
    data: {
      label: 'Temporal Analyst', icon: '\u23F1', color: palette.yellow.dark2,
      subtitle: 'Structuring + Velocity + Dormancy',
      tools: ['temporal_analysis'],
      mongoBadge: '$setWindowFields',
      tooltip: 'Pure compute \u2014 no LLM. Detects structuring, velocity spikes, round-trip flows, dormancy bursts via MongoDB aggregation.',
    },
  },
  {
    id: 'trailFollower', type: 'agent',
    position: { x: CX - 30, y: 700 },
    data: {
      label: 'Trail Follower Agent', icon: '🔎', color: palette.blue.dark2,
      subtitle: 'Conditional LLM Lead Selection',
      tools: ['trace_ownership_chains'],
      mongoBadge: '$graphLookup',
      tooltip: 'LLM analyses network + temporal results to rank and select top suspicious entities for sub-investigation.',
    },
  },
  {
    id: 'subDispatch', type: 'workflow',
    position: { x: CX - 30, y: 800 },
    data: {
      label: 'Sub-Investigation Dispatch', icon: '📊', color: palette.purple.base,
      subtitle: 'Send API Fan-out (Leads)',
      tooltip: 'Orchestration dispatcher. Fans out parallel mini-investigations per lead via LangGraph Send. No LLM.',
    },
  },
  {
    id: 'miniInvestigate', type: 'worker',
    position: { x: CX - 30, y: 895 },
    data: {
      label: 'Mini-Investigate', icon: '🔬',
      toolName: '4 tools + LLM assess',
      mongoBadge: 'parallel workers',
    },
  },
  {
    id: 'narrative', type: 'agent',
    position: { x: CX - 30, y: 990 },
    data: {
      label: 'SAR Author Agent', icon: '📝', color: palette.green.dark1,
      subtitle: 'RAG \u2192 SARNarrative (5Ws)',
      tools: ['search_compliance_policies'],
      mongoBadge: 'Atlas Search RAG',
      tooltip: 'LLM generates FinCEN-compliant SAR narrative from full evidence corpus via RAG over compliance policies.',
    },
  },
  {
    id: 'validation', type: 'agent',
    position: { x: CX - 30, y: 1095 },
    data: {
      label: 'Compliance QA Agent', icon: '\u2713', color: palette.blue.dark1,
      subtitle: 'ValidationResult \u2192 Command',
      tooltip: 'LLM-as-Judge quality gate: completeness, accuracy, citation quality. Routes via Command. Max 3 loops.',
    },
  },
  {
    id: 'humanReview', type: 'workflow',
    position: { x: CX - 30, y: 1205 },
    data: {
      label: 'Human Review', icon: '👁', color: palette.red.base,
      subtitle: 'interrupt() \u2192 pause/resume',
      mongoBadge: 'MongoDBSaver interrupt()',
      tooltip: 'LangGraph interrupt() durably pauses the pipeline. MongoDBSaver persists full state \u2014 resume hours later.',
    },
  },
  {
    id: 'finalize', type: 'workflow',
    position: { x: CX - 30, y: 1315 },
    data: {
      label: 'Finalize Case', icon: '📋', color: palette.green.dark2,
      subtitle: 'Persist to MongoDB',
      mongoBadge: 'insertOne()',
      tooltip: 'Assembles final document and persists to MongoDB via insertOne(). No LLM \u2014 pure persistence.',
    },
  },
  {
    id: 'endNode', type: 'terminal',
    position: { x: CX + 20, y: 1415 },
    data: { label: 'END', color: palette.gray.dark2 },
  },
];

const COLLECTION_NODES = [
  { id: 'col-entities', type: 'collection', position: { x: 30, y: 445 }, data: { icon: '🗄', label: 'entities' } },
  { id: 'col-txns', type: 'collection', position: { x: 185, y: 445 }, data: { icon: '🗄', label: 'transactionsv2' } },
  { id: 'col-rels', type: 'collection', position: { x: 345, y: 445 }, data: { icon: '🗄', label: 'relationships' } },
  { id: 'col-watchlist', type: 'collection', position: { x: 510, y: 445 }, data: { icon: '🗄', label: 'entities' } },
  { id: 'col-typology-lib', type: 'collection', position: { x: 70, y: 540 }, data: { icon: '🗄', label: 'typology_library' } },
  { id: 'col-rels2', type: 'collection', position: { x: 30, y: 635 }, data: { icon: '🗄', label: 'entities + relationships' } },
  { id: 'col-txns2', type: 'collection', position: { x: 560, y: 635 }, data: { icon: '🗄', label: 'transactionsv2' } },
  { id: 'col-rels3', type: 'collection', position: { x: 560, y: 740 }, data: { icon: '🗄', label: 'relationships' } },
  { id: 'col-policies', type: 'collection', position: { x: 560, y: 1030 }, data: { icon: '🗄', label: 'compliance_policies' } },
];

const COL_EDGE_STYLE = { strokeWidth: 1, stroke: palette.gray.light1, strokeDasharray: '3 2' };
const COL_EDGE_MARKER = { type: MarkerType.ArrowClosed, width: 8, height: 8, color: palette.gray.light1 };
const COL_LABEL_STYLE = { fontSize: 10, fontWeight: 600, fontFamily: "'Source Code Pro', monospace", fill: palette.green.dark2 };
const COL_LABEL_BG = { fill: palette.green.light3, fillOpacity: 0.92 };

const COLLECTION_EDGES = [
  { id: 'ce-entity', source: 'fetchEntity', target: 'col-entities', style: COL_EDGE_STYLE, markerEnd: COL_EDGE_MARKER, label: 'findOne()', labelStyle: COL_LABEL_STYLE, labelBgStyle: COL_LABEL_BG },
  { id: 'ce-txn', source: 'fetchTxn', target: 'col-txns', style: COL_EDGE_STYLE, markerEnd: COL_EDGE_MARKER, label: 'aggregate()', labelStyle: COL_LABEL_STYLE, labelBgStyle: COL_LABEL_BG },
  { id: 'ce-rels', source: 'fetchNetwork', target: 'col-rels', style: COL_EDGE_STYLE, markerEnd: COL_EDGE_MARKER, label: '$graphLookup', labelStyle: COL_LABEL_STYLE, labelBgStyle: COL_LABEL_BG },
  { id: 'ce-wl', source: 'fetchWatchlist', target: 'col-watchlist', style: COL_EDGE_STYLE, markerEnd: COL_EDGE_MARKER, label: 'find()', labelStyle: COL_LABEL_STYLE, labelBgStyle: COL_LABEL_BG },
  { id: 'ce-typolib', source: 'assembleCase', target: 'col-typology-lib', style: COL_EDGE_STYLE, markerEnd: COL_EDGE_MARKER, label: 'Atlas Search', labelStyle: COL_LABEL_STYLE, labelBgStyle: COL_LABEL_BG },
  { id: 'ce-network-db', source: 'networkAnalyst', target: 'col-rels2', style: COL_EDGE_STYLE, markerEnd: COL_EDGE_MARKER, label: '$graphLookup', labelStyle: COL_LABEL_STYLE, labelBgStyle: COL_LABEL_BG },
  { id: 'ce-temporal-db', source: 'temporalAnalyst', target: 'col-txns2', style: COL_EDGE_STYLE, markerEnd: COL_EDGE_MARKER, label: '$setWindowFields', labelStyle: COL_LABEL_STYLE, labelBgStyle: COL_LABEL_BG },
  { id: 'ce-trail-db', source: 'trailFollower', target: 'col-rels3', style: COL_EDGE_STYLE, markerEnd: COL_EDGE_MARKER, label: '$graphLookup', labelStyle: COL_LABEL_STYLE, labelBgStyle: COL_LABEL_BG },
  { id: 'ce-policies', source: 'narrative', target: 'col-policies', style: COL_EDGE_STYLE, markerEnd: COL_EDGE_MARKER, label: 'Atlas Search', labelStyle: COL_LABEL_STYLE, labelBgStyle: COL_LABEL_BG },
];

// ---------------------------------------------------------------------------
// Edges
// ---------------------------------------------------------------------------

const MARKER = { type: MarkerType.ArrowClosed, width: 12, height: 12 };
const EDGE_BASE = { style: { strokeWidth: 2 }, markerEnd: MARKER };
const LABEL_BG = { fill: '#fff', fillOpacity: 0.92 };

const INITIAL_EDGES = [
  { id: 'e-start-triage', source: 'alertInput', target: 'triage', ...EDGE_BASE, style: { ...EDGE_BASE.style, stroke: palette.green.dark2 } },
  { id: 'e-triage-autoclose', source: 'triage', target: 'autoClose', label: 'auto_close', labelStyle: { fontSize: 9, fontWeight: 600, fontFamily: FONT }, labelBgStyle: LABEL_BG, ...EDGE_BASE, style: { ...EDGE_BASE.style, stroke: palette.gray.base } },
  { id: 'e-autoclose-end', source: 'autoClose', target: 'endNode', ...EDGE_BASE, type: 'smoothstep', style: { ...EDGE_BASE.style, stroke: palette.gray.light1, strokeDasharray: '4 2' } },
  { id: 'e-triage-dg', source: 'triage', target: 'dataGathering', label: 'investigate', labelStyle: { fontSize: 9, fontWeight: 600, fontFamily: FONT }, labelBgStyle: LABEL_BG, ...EDGE_BASE, style: { ...EDGE_BASE.style, stroke: palette.blue.base } },
  ...['fetchEntity', 'fetchTxn', 'fetchNetwork', 'fetchWatchlist'].map((target) => ({
    id: `e-dg-${target}`, source: 'dataGathering', target, ...EDGE_BASE, animated: true,
    label: 'Send', labelStyle: { fontSize: 9, fontWeight: 600, fontFamily: FONT, fill: palette.purple.base },
    labelBgStyle: LABEL_BG, style: { ...EDGE_BASE.style, stroke: palette.purple.base, strokeDasharray: '6 3' },
  })),
  ...['fetchEntity', 'fetchTxn', 'fetchNetwork', 'fetchWatchlist'].map((source) => ({
    id: `e-${source}-assemble`, source, target: 'assembleCase', ...EDGE_BASE, style: { ...EDGE_BASE.style, stroke: palette.green.dark2 },
  })),
  { id: 'e-assemble-network', source: 'assembleCase', target: 'networkAnalyst', label: 'parallel', labelStyle: { fontSize: 9, fontWeight: 600, fontFamily: FONT, fill: palette.yellow.dark2 }, labelBgStyle: LABEL_BG, ...EDGE_BASE, style: { ...EDGE_BASE.style, stroke: palette.yellow.dark2 } },
  { id: 'e-assemble-temporal', source: 'assembleCase', target: 'temporalAnalyst', label: 'parallel', labelStyle: { fontSize: 9, fontWeight: 600, fontFamily: FONT, fill: palette.yellow.dark2 }, labelBgStyle: LABEL_BG, ...EDGE_BASE, style: { ...EDGE_BASE.style, stroke: palette.yellow.dark2 } },
  { id: 'e-network-trail', source: 'networkAnalyst', target: 'trailFollower', ...EDGE_BASE, style: { ...EDGE_BASE.style, stroke: palette.blue.dark2 } },
  { id: 'e-temporal-trail', source: 'temporalAnalyst', target: 'trailFollower', ...EDGE_BASE, style: { ...EDGE_BASE.style, stroke: palette.blue.dark2 } },
  { id: 'e-trail-subdispatch', source: 'trailFollower', target: 'subDispatch', ...EDGE_BASE, style: { ...EDGE_BASE.style, stroke: palette.purple.base } },
  { id: 'e-subdispatch-mini', source: 'subDispatch', target: 'miniInvestigate', ...EDGE_BASE, animated: true, label: 'Send (N leads)', labelStyle: { fontSize: 9, fontWeight: 600, fontFamily: FONT, fill: palette.purple.base }, labelBgStyle: LABEL_BG, style: { ...EDGE_BASE.style, stroke: palette.purple.base, strokeDasharray: '6 3' } },
  { id: 'e-mini-narrative', source: 'miniInvestigate', target: 'narrative', ...EDGE_BASE, style: { ...EDGE_BASE.style, stroke: palette.green.dark1 } },
  { id: 'e-narrative-validation', source: 'narrative', target: 'validation', ...EDGE_BASE, style: { ...EDGE_BASE.style, stroke: palette.blue.dark1 } },
  { id: 'e-validation-hr', source: 'validation', target: 'humanReview', label: 'human_review', labelStyle: { fontSize: 9, fontWeight: 600, fontFamily: FONT }, labelBgStyle: LABEL_BG, ...EDGE_BASE, style: { ...EDGE_BASE.style, stroke: palette.red.base } },
  {
    id: 'e-validation-dg', source: 'validation', sourceHandle: 'right', target: 'dataGathering', targetHandle: 'right',
    label: 'data_gathering', labelStyle: { fontSize: 9, fontWeight: 600, fontFamily: FONT },
    labelBgStyle: { fill: palette.yellow.light3, fillOpacity: 0.95 },
    ...EDGE_BASE, animated: true, style: { ...EDGE_BASE.style, stroke: palette.yellow.dark2, strokeDasharray: '5 3' }, type: 'smoothstep',
  },
  {
    id: 'e-validation-narrative', source: 'validation', sourceHandle: 'right', target: 'narrative', targetHandle: 'right',
    label: 'narrative', labelStyle: { fontSize: 9, fontWeight: 600, fontFamily: FONT },
    labelBgStyle: { fill: palette.yellow.light3, fillOpacity: 0.95 },
    ...EDGE_BASE, animated: true, style: { ...EDGE_BASE.style, stroke: palette.yellow.dark2, strokeDasharray: '5 3' }, type: 'smoothstep',
  },
  {
    id: 'e-validation-finalize', source: 'validation', target: 'finalize',
    label: 'finalize (max loops)', labelStyle: { fontSize: 9, fontWeight: 600, fontFamily: FONT, fill: palette.gray.dark1 },
    labelBgStyle: LABEL_BG, ...EDGE_BASE, style: { ...EDGE_BASE.style, stroke: palette.gray.base, strokeDasharray: '4 2' }, type: 'smoothstep',
  },
  { id: 'e-hr-finalize', source: 'humanReview', target: 'finalize', label: 'resume', labelStyle: { fontSize: 9, fontWeight: 600, fontFamily: FONT }, labelBgStyle: LABEL_BG, ...EDGE_BASE, style: { ...EDGE_BASE.style, stroke: palette.green.dark2 } },
  { id: 'e-finalize-end', source: 'finalize', target: 'endNode', ...EDGE_BASE, style: { ...EDGE_BASE.style, stroke: palette.gray.dark2 } },
];

// ---------------------------------------------------------------------------
// Compute execution state from events
// ---------------------------------------------------------------------------

function computeNodeStates(activeAgents) {
  if (!activeAgents || Object.keys(activeAgents).length === 0) return {};
  const states = {};
  for (const [agentName, status] of Object.entries(activeAgents)) {
    const nodeId = AGENT_TO_NODE[agentName];
    if (nodeId) states[nodeId] = status;
  }
  if (Object.keys(states).length > 0) {
    for (const nodeId of Object.values(AGENT_TO_NODE)) {
      if (!states[nodeId]) states[nodeId] = 'pending';
    }
  }
  return states;
}

// ---------------------------------------------------------------------------
// Legend
// ---------------------------------------------------------------------------

const LEGEND_ITEMS = [
  { label: 'Agent (LLM)', borderTop: `3px solid ${palette.blue.base}`, bg: '#fff', badge: 'AGENT', badgeBg: `${palette.blue.base}18`, badgeColor: palette.blue.base },
  { label: 'Compute', borderTop: `3px solid ${palette.yellow.dark2}`, bg: '#fff', badge: 'COMPUTE', badgeBg: `${palette.yellow.dark2}18`, badgeColor: palette.yellow.dark2 },
  { label: 'Tool', border: `1px dashed ${palette.purple.light1}`, bg: '#fff', badge: 'TOOL', badgeBg: `${palette.purple.base}12`, badgeColor: palette.purple.dark2 },
  { label: 'Workflow', border: `1px solid ${palette.gray.light2}`, bg: palette.gray.light3, borderRadius: 12, badge: 'WORKFLOW', badgeBg: palette.gray.light2, badgeColor: palette.gray.dark1 },
  { label: 'Collection', border: `1px dashed ${palette.gray.light1}`, bg: palette.gray.light3 },
  { label: 'Uses MongoDB', bg: palette.green.dark1, borderRadius: '50%', isMongo: true },
];

function PipelineLegend({ compact = false }) {
  return (
    <div style={{
      position: 'absolute', top: 10, left: 10, zIndex: 10,
      display: 'flex', flexDirection: 'column', gap: 6,
      padding: compact ? '6px 10px' : '8px 12px', borderRadius: 8,
      background: 'rgba(255,255,255,0.95)',
      border: `1px solid ${uiTokens.borderDefault}`,
      boxShadow: uiTokens.shadowElevated,
      backdropFilter: 'blur(8px)',
      maxWidth: compact ? 200 : 260,
    }}>
      <div style={{
        fontSize: 9, fontWeight: 700, fontFamily: FONT,
        color: palette.gray.dark1, letterSpacing: '0.06em',
        textTransform: 'uppercase',
      }}>
        Node Types
      </div>
      <div style={{
        display: 'grid',
        gridTemplateColumns: compact ? '1fr' : '1fr 1fr',
        gap: compact ? 4 : 6,
      }}>
        {LEGEND_ITEMS.map(item => (
          <div key={item.label} style={{
            display: 'flex', alignItems: 'center', gap: 4,
            fontSize: compact ? 9 : 10, fontFamily: FONT, color: palette.gray.dark1,
          }}>
            <div style={{
              width: compact ? 14 : 20, height: compact ? 10 : 14, flexShrink: 0,
              borderRadius: item.borderRadius || 3,
              background: item.bg,
              border: item.border || 'none',
              borderTop: item.borderTop || item.border || 'none',
            }} />
            {item.badge && (
              <span style={{
                fontSize: 7, fontFamily: FONT, fontWeight: 700,
                padding: '0px 3px', borderRadius: 2,
                background: item.badgeBg, color: item.badgeColor,
                textTransform: 'uppercase',
              }}>
                {item.badge}
              </span>
            )}
            <span>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

function FullscreenButton({ onClick, isFullscreen }) {
  return (
    <button
      onClick={onClick}
      title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
      style={{
        position: 'absolute', top: 10, right: 10, zIndex: 10,
        width: 32, height: 32, borderRadius: 6,
        border: `1px solid ${palette.gray.light2}`,
        background: '#fff', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
        fontSize: 14, color: palette.gray.dark2, transition: 'background 0.15s',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = palette.gray.light3; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = '#fff'; }}
    >
      {isFullscreen ? '\u2715' : '\u26F6'}
    </button>
  );
}

function PipelineFlowContent({ n, e, onNodesChange, onEdgesChange, onInit }) {
  return (
    <ReactFlow
      nodes={n}
      edges={e}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onInit={onInit}
      nodeTypes={NODE_TYPES}
      fitView
      fitViewOptions={{ padding: 0.12 }}
      minZoom={0.2}
      maxZoom={2}
      attributionPosition="bottom-left"
      proOptions={{ hideAttribution: true }}
      nodesDraggable={true}
      nodesConnectable={false}
      elementsSelectable={true}
      panOnScroll={true}
      style={{
        background: palette.gray.light3,
        borderRadius: 8,
        backgroundImage: `linear-gradient(rgba(255,255,255,0.5), rgba(255,255,255,0)), radial-gradient(circle at 1px 1px, ${palette.gray.light1} 0.65px, transparent 0.65px)`,
        backgroundSize: '100% 100%, 14px 14px',
      }}
    >
      <Background color="transparent" gap={20} size={0} />
      <Controls
        showInteractive={false}
        style={{
          borderRadius: 8,
          boxShadow: uiTokens.shadowElevated,
          border: `1px solid ${uiTokens.borderDefault}`,
          background: '#fff',
        }}
      />
      <MiniMap
        nodeColor={(node) => {
          if (node.data?.executionState === 'active') return palette.blue.base;
          if (node.data?.executionState === 'completed') return palette.green.dark1;
          return node.data?.color || palette.gray.base;
        }}
        maskColor="rgba(0, 99, 235, 0.12)"
        style={{
          borderRadius: 8,
          border: `1px solid ${uiTokens.borderDefault}`,
          boxShadow: uiTokens.shadowElevated,
          background: palette.gray.light3,
        }}
      />
    </ReactFlow>
  );
}

export default function AgenticPipelineGraph({ showTools = true, activeAgents = null, compact = false }) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const nodeStates = useMemo(() => computeNodeStates(activeAgents), [activeAgents]);

  const nodes = useMemo(() => {
    const base = INITIAL_NODES.map(node => {
      const execState = nodeStates[node.id];
      if (execState) {
        return { ...node, data: { ...node.data, executionState: execState } };
      }
      return node;
    });
    return showTools ? [...base, ...COLLECTION_NODES] : base;
  }, [showTools, nodeStates]);

  const edges = useMemo(
    () => (showTools ? [...INITIAL_EDGES, ...COLLECTION_EDGES] : INITIAL_EDGES),
    [showTools],
  );

  const [n, setN, onNodesChange] = useNodesState(nodes);
  const [e, setE, onEdgesChange] = useEdgesState(edges);

  useEffect(() => { setN(nodes); }, [nodes, setN]);
  useEffect(() => { setE(edges); }, [edges, setE]);

  const onInit = useCallback((instance) => {
    setTimeout(() => instance.fitView({ padding: 0.12 }), 50);
  }, []);

  useEffect(() => {
    if (!isFullscreen) return;
    const handleKey = (ev) => { if (ev.key === 'Escape') setIsFullscreen(false); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isFullscreen]);

  const flowProps = { n, e, onNodesChange, onEdgesChange, onInit };

  return (
    <>
      <div style={{ position: 'relative', width: '100%', height: '100%' }}>
        <PipelineLegend compact={compact} />
        <FullscreenButton onClick={() => setIsFullscreen(true)} isFullscreen={false} />
        <PipelineFlowContent {...flowProps} />
      </div>

      {isFullscreen && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(20, 23, 26, 0.72)',
          backdropFilter: 'blur(4px)',
          display: 'flex', flexDirection: 'column',
          animation: 'fadeOverlay 180ms ease',
        }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '12px 20px',
            background: palette.gray.dark3, color: '#fff',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 1px 0 rgba(0,0,0,0.2)',
          }}>
            <span style={{ fontFamily: FONT, fontWeight: 600, fontSize: 14 }}>
              Agentic Pipeline {activeAgents ? '(Live)' : '(Architecture)'}
            </span>
            <button
              onClick={() => setIsFullscreen(false)}
              style={{
                background: 'rgba(255,255,255,0.12)', border: 'none', borderRadius: 6,
                color: '#fff', padding: '6px 14px', cursor: 'pointer',
                fontFamily: FONT, fontSize: 12, fontWeight: 500,
                display: 'flex', alignItems: 'center', gap: 6,
              }}
              onMouseEnter={(ev) => { ev.currentTarget.style.background = 'rgba(255,255,255,0.2)'; }}
              onMouseLeave={(ev) => { ev.currentTarget.style.background = 'rgba(255,255,255,0.12)'; }}
            >
              Exit Fullscreen <span style={{ fontSize: 10 }}>ESC</span>
            </button>
          </div>
          <div style={{ flex: 1, position: 'relative' }}>
            <PipelineLegend />
            <PipelineFlowContent {...flowProps} />
          </div>
        </div>
      )}

      <style>{GLOBAL_KEYFRAMES}</style>
    </>
  );
}
