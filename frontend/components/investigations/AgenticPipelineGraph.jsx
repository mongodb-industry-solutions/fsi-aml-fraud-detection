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

const FONT = "'Euclid Circular A', sans-serif";

// Map SSE agent names to node IDs
const AGENT_TO_NODE = {
  triage: 'triage',
  auto_close: 'autoClose',
  urgent_escalation: 'urgentEscalation',
  data_gathering: 'dataGathering',
  fetch_entity_profile: 'fetchEntity',
  fetch_transactions: 'fetchTxn',
  fetch_network: 'fetchNetwork',
  fetch_watchlist: 'fetchWatchlist',
  assemble_case: 'assembleCase',
  typology: 'typology',
  network_analyst: 'networkAnalyst',
  temporal_analyst: 'temporalAnalyst',
  trail_follower: 'trailFollower',
  sub_investigation_dispatch: 'subDispatch',
  mini_investigate: 'miniInvestigate',
  collect_sub_findings: 'collectSubFindings',
  narrative: 'narrative',
  validation: 'validation',
  human_review: 'humanReview',
  finalize: 'finalize',
};

// ---------------------------------------------------------------------------
// Custom Node Components (with execution state)
// ---------------------------------------------------------------------------

function TerminalNode({ data }) {
  return (
    <div
      style={{
        background: data.color || palette.gray.dark2,
        color: '#fff',
        borderRadius: '50%',
        width: 52,
        height: 52,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 10,
        fontWeight: 600,
        fontFamily: FONT,
        boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
        textAlign: 'center',
        lineHeight: 1.2,
      }}
    >
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      {data.label}
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
    </div>
  );
}

function AgentNode({ data }) {
  const [hovered, setHovered] = useState(false);
  const execState = data.executionState; // 'active' | 'completed' | 'pending' | undefined

  const borderLeftColor = execState === 'active' ? palette.blue.base
    : execState === 'completed' ? palette.green.dark1
    : data.color || palette.blue.base;

  const bgColor = execState === 'active' ? palette.blue.light3
    : execState === 'completed' ? '#f0faf5'
    : execState === 'pending' ? '#fafafa'
    : '#fff';

  const nodeOpacity = execState === 'pending' ? 0.5 : 1;

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: bgColor,
        borderRadius: 8,
        padding: '10px 16px',
        minWidth: 160,
        textAlign: 'center',
        fontFamily: FONT,
        boxShadow: execState === 'active'
          ? `0 0 0 2px ${palette.blue.base}40, 0 3px 12px rgba(0,0,0,0.1)`
          : hovered
            ? '0 3px 12px rgba(0,0,0,0.12)'
            : '0 1px 4px rgba(0,0,0,0.06)',
        transition: 'all 0.3s ease',
        position: 'relative',
        border: `1px solid ${execState === 'active' ? palette.blue.light1 : palette.gray.light2}`,
        borderLeft: `3px solid ${borderLeftColor}`,
        opacity: nodeOpacity,
        animation: execState === 'active' ? 'node-pulse 2s ease-in-out infinite' : 'none',
      }}
    >
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      <Handle type="target" position={Position.Left} id="left" style={{ opacity: 0 }} />
      <div style={{ fontSize: 15, marginBottom: 2 }}>{data.icon}</div>
      <div style={{ fontSize: 12, fontWeight: 600, color: palette.gray.dark3 }}>
        {data.label}
      </div>
      {data.subtitle && (
        <div style={{ fontSize: 9, color: palette.gray.dark1, marginTop: 2 }}>
          {data.subtitle}
        </div>
      )}
      {execState === 'completed' && (
        <div style={{
          position: 'absolute', top: -4, right: -4,
          width: 16, height: 16, borderRadius: '50%',
          background: palette.green.dark1, color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 10, fontWeight: 700, lineHeight: 1,
          border: '2px solid #fff',
          boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
        }}>
          ✓
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
            <span
              key={t}
              style={{
                fontSize: 8,
                fontFamily: "'Source Code Pro', monospace",
                padding: '1px 5px',
                borderRadius: 3,
                background: `${data.color || palette.blue.base}12`,
                color: data.color || palette.blue.base,
                border: `1px solid ${data.color || palette.blue.base}30`,
                fontWeight: 500,
              }}
            >
              {t}
            </span>
          ))}
        </div>
      )}
      {hovered && data.tooltip && (
        <div
          style={{
            position: 'absolute',
            bottom: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            marginBottom: 10,
            background: palette.gray.dark3,
            color: palette.gray.light3,
            borderRadius: 6,
            padding: '8px 12px',
            fontSize: 11,
            lineHeight: 1.45,
            width: 230,
            zIndex: 100,
            boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
            pointerEvents: 'none',
            textAlign: 'left',
          }}
        >
          {data.tooltip}
          <div
            style={{
              position: 'absolute',
              top: '100%',
              left: '50%',
              transform: 'translateX(-50%)',
              width: 0, height: 0,
              borderLeft: '6px solid transparent',
              borderRight: '6px solid transparent',
              borderTop: `6px solid ${palette.gray.dark3}`,
            }}
          />
        </div>
      )}
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Right} id="right" style={{ opacity: 0 }} />
    </div>
  );
}

function WorkerNode({ data }) {
  const execState = data.executionState;
  const bgColor = execState === 'active' ? palette.blue.light3
    : execState === 'completed' ? '#f0faf5'
    : '#fff';
  const nodeOpacity = execState === 'pending' ? 0.5 : 1;

  return (
    <div
      style={{
        background: bgColor,
        borderRadius: 6,
        padding: '7px 12px',
        minWidth: 120,
        textAlign: 'center',
        fontFamily: FONT,
        boxShadow: execState === 'active'
          ? `0 0 0 2px ${palette.blue.base}30`
          : '0 1px 3px rgba(0,0,0,0.06)',
        border: `1px solid ${execState === 'active' ? palette.blue.light1 : palette.gray.light2}`,
        borderLeft: `3px solid ${execState === 'completed' ? palette.green.dark1 : palette.purple.base}`,
        opacity: nodeOpacity,
        transition: 'all 0.3s ease',
        position: 'relative',
      }}
    >
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      <div style={{ fontSize: 13, marginBottom: 1 }}>{data.icon}</div>
      <div style={{ fontSize: 10, fontWeight: 600, color: palette.gray.dark3 }}>
        {data.label}
      </div>
      {data.toolName && (
        <div
          style={{
            fontSize: 8,
            fontFamily: "'Source Code Pro', monospace",
            padding: '1px 5px',
            borderRadius: 3,
            background: `${palette.purple.base}10`,
            color: palette.purple.dark2,
            border: `1px solid ${palette.purple.base}25`,
            marginTop: 3,
            display: 'inline-block',
            fontWeight: 500,
          }}
        >
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
      {execState === 'completed' && (
        <div style={{
          position: 'absolute', top: -3, right: -3,
          width: 14, height: 14, borderRadius: '50%',
          background: palette.green.dark1, color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 8, fontWeight: 700,
          border: '2px solid #fff',
        }}>
          ✓
        </div>
      )}
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
    </div>
  );
}

function CollectionNode({ data }) {
  return (
    <div
      style={{
        background: palette.gray.light3,
        borderRadius: 4,
        padding: '4px 8px',
        textAlign: 'center',
        fontFamily: "'Source Code Pro', monospace",
        fontSize: 8,
        fontWeight: 500,
        color: palette.gray.dark1,
        border: `1px dashed ${palette.gray.light1}`,
      }}
    >
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
  worker: WorkerNode,
  collection: CollectionNode,
};

// ---------------------------------------------------------------------------
// Layout Constants
// ---------------------------------------------------------------------------

const CX = 300;

// ---------------------------------------------------------------------------
// Nodes
// ---------------------------------------------------------------------------

const INITIAL_NODES = [
  {
    id: 'alertInput',
    type: 'terminal',
    position: { x: CX, y: 0 },
    data: { label: 'Alert\nInput', color: palette.green.dark2 },
  },
  {
    id: 'triage',
    type: 'agent',
    position: { x: CX - 30, y: 80 },
    data: {
      label: 'Triage Agent', icon: '🔍', color: palette.blue.base,
      subtitle: 'TriageDecision → Command',
      mongoBadge: 'MongoDBSaver',
      tooltip: 'Risk scoring with LLM contextual reasoning. MongoDBSaver checkpoints the decision, enabling the graph to branch via Command routing. Without MongoDB: Redis for state + custom serialization code.',
    },
  },
  {
    id: 'autoClose',
    type: 'agent',
    position: { x: 20, y: 195 },
    data: {
      label: 'Auto-Close', icon: '✗', color: palette.gray.dark1,
      subtitle: 'False Positive',
      tooltip: 'Risk < 25, no watchlist hits. Closes investigation automatically.',
    },
  },
  {
    id: 'urgentEscalation',
    type: 'agent',
    position: { x: 560, y: 195 },
    data: {
      label: 'Urgent Escalation', icon: '⚠', color: palette.red.dark2,
      subtitle: 'Risk > 70 / sanctions',
      tooltip: 'Confirmed sanctions hits or PEP with suspicious patterns. Routes directly to human review.',
    },
  },
  {
    id: 'dataGathering',
    type: 'agent',
    position: { x: CX - 30, y: 250 },
    data: {
      label: 'Data Gathering', icon: '📊', color: palette.purple.base,
      subtitle: 'Send API Fan-out',
      tooltip: 'Parallel fan-out via LangGraph Send API. Each worker queries MongoDB directly — entity profiles, transaction aggregations, $graphLookup network traversal, watchlist screening. Without MongoDB: 4 separate databases or microservices.',
    },
  },
  {
    id: 'fetchEntity',
    type: 'worker',
    position: { x: 50, y: 370 },
    data: { label: 'Fetch Entity', icon: '👤', toolName: 'get_entity_profile', mongoBadge: 'findOne()' },
  },
  {
    id: 'fetchTxn',
    type: 'worker',
    position: { x: 195, y: 370 },
    data: { label: 'Fetch Txns', icon: '💳', toolName: 'query_entity_transactions', mongoBadge: 'aggregate()' },
  },
  {
    id: 'fetchNetwork',
    type: 'worker',
    position: { x: 355, y: 370 },
    data: { label: 'Fetch Network', icon: '🕸', toolName: 'analyze_entity_network', mongoBadge: '$graphLookup' },
  },
  {
    id: 'fetchWatchlist',
    type: 'worker',
    position: { x: 510, y: 370 },
    data: { label: 'Fetch Watchlist', icon: '🛡', toolName: 'screen_watchlists', mongoBadge: 'find()' },
  },
  {
    id: 'assembleCase',
    type: 'agent',
    position: { x: CX - 30, y: 480 },
    data: {
      label: 'Assemble Case File', icon: '📁', color: palette.green.dark2,
      subtitle: 'LLM → CaseFile',
      mongoBadge: 'Document Model',
      tooltip: 'Fan-in node. Synthesizes gathered evidence into a structured 360° CaseFile. MongoDB\'s flexible document model stores the nested case file — entity profiles, transaction arrays, network graphs — without rigid schemas.',
    },
  },
  {
    id: 'typology',
    type: 'agent',
    position: { x: CX - 30, y: 585 },
    data: {
      label: 'Typology Classifier', icon: '🏷', color: palette.yellow.dark2,
      subtitle: 'RAG → TypologyResult',
      tools: ['search_typologies'],
      mongoBadge: 'Atlas Search RAG',
      tooltip: 'RAG over typology_library (12 AML typologies) using Atlas Search. Classifies with confidence scores. Same cluster, no Elasticsearch sidecar, no data sync.',
    },
  },
  {
    id: 'networkAnalyst',
    type: 'agent',
    position: { x: CX - 160, y: 690 },
    data: {
      label: 'Network Analyst', icon: '🔗', color: palette.yellow.dark2,
      subtitle: 'Centrality + Risk Scoring',
      tools: ['compute_network_metrics'],
      mongoBadge: '$graphLookup',
      tooltip: 'Computes degree centrality and network risk from real graph data via $graphLookup. No Neo4j needed — MongoDB handles graph traversal natively via aggregation pipelines. Runs in PARALLEL with Temporal Analyst.',
    },
  },
  {
    id: 'temporalAnalyst',
    type: 'agent',
    position: { x: CX + 110, y: 690 },
    data: {
      label: 'Temporal Analyst', icon: '⏱', color: palette.yellow.dark2,
      subtitle: 'Structuring + Velocity + Dormancy',
      tools: ['temporal_analysis'],
      mongoBadge: '$setWindowFields',
      tooltip: 'Pure compute — no LLM. Detects structuring patterns, velocity spikes, round-trip fund flows, off-hours activity, and dormancy bursts via MongoDB aggregation. Runs in PARALLEL with Network Analyst.',
    },
  },
  {
    id: 'trailFollower',
    type: 'agent',
    position: { x: CX - 30, y: 800 },
    data: {
      label: 'Trail Follower', icon: '🔎', color: palette.blue.dark2,
      subtitle: 'LLM Lead Selection',
      tools: ['trace_ownership_chains'],
      mongoBadge: '$graphLookup',
      tooltip: 'Analyses network + temporal results to select top 3 suspicious connected entities for sub-investigation. Traces ownership chains via $graphLookup.',
    },
  },
  {
    id: 'subDispatch',
    type: 'agent',
    position: { x: CX - 30, y: 905 },
    data: {
      label: 'Sub-Investigation Dispatch', icon: '📊', color: palette.purple.base,
      subtitle: 'Send API Fan-out (Leads)',
      tooltip: 'Dispatches parallel mini-investigations for each lead entity via LangGraph Send. Same fan-out pattern as data gathering, applied at a higher level.',
    },
  },
  {
    id: 'miniInvestigate',
    type: 'worker',
    position: { x: CX - 30, y: 1000 },
    data: {
      label: 'Mini-Investigate', icon: '🔬',
      toolName: '4 tools + LLM assess',
      mongoBadge: 'parallel workers',
    },
  },
  {
    id: 'collectSubFindings',
    type: 'agent',
    position: { x: CX - 30, y: 1095 },
    data: {
      label: 'Collect Sub-Findings', icon: '📑', color: palette.green.dark1,
      subtitle: 'LLM Synthesis',
      tooltip: 'Fan-in: consolidates all mini-investigation assessments. Identifies high-risk leads, confirmed connections, and narrative threads for the SAR.',
    },
  },
  {
    id: 'narrative',
    type: 'agent',
    position: { x: CX - 30, y: 1200 },
    data: {
      label: 'Narrative Writer', icon: '📝', color: palette.green.dark1,
      subtitle: 'RAG → SARNarrative (5Ws)',
      tools: ['search_compliance_policies'],
      mongoBadge: 'Atlas Search RAG',
      tooltip: 'Generates FinCEN-compliant SAR narrative from the full evidence corpus — case file, typology, network, temporal, trail, and sub-investigation findings.',
    },
  },
  {
    id: 'validation',
    type: 'agent',
    position: { x: CX - 30, y: 1310 },
    data: {
      label: 'Quality Reviewer', icon: '✓', color: palette.blue.dark1,
      subtitle: 'ValidationResult → Command',
      tooltip: 'LLM-as-Judge quality gate: completeness, factual accuracy, citation quality. Routes via Command. Hard cap at 3 validation loops.',
    },
  },
  {
    id: 'humanReview',
    type: 'agent',
    position: { x: CX - 30, y: 1425 },
    data: {
      label: 'Human Review', icon: '👁', color: palette.red.base,
      subtitle: 'interrupt() → pause/resume',
      mongoBadge: 'MongoDBSaver interrupt()',
      tooltip: 'LangGraph interrupt() durably pauses the pipeline. MongoDBSaver persists the full graph state to MongoDB — resume hours later, even after server restarts.',
    },
  },
  {
    id: 'finalize',
    type: 'agent',
    position: { x: CX - 30, y: 1535 },
    data: {
      label: 'Finalize Case', icon: '📋', color: palette.green.dark2,
      subtitle: 'Persist to MongoDB',
      mongoBadge: 'insertOne()',
      tooltip: 'The complete investigation — evidence, narrative, audit trail, sub-investigation findings — stored as one rich MongoDB document via insertOne().',
    },
  },
  {
    id: 'endNode',
    type: 'terminal',
    position: { x: CX + 20, y: 1635 },
    data: { label: 'END', color: palette.gray.dark2 },
  },
];

const COLLECTION_NODES = [
  { id: 'col-entities', type: 'collection', position: { x: 30, y: 445 }, data: { icon: '🗄', label: 'entities' } },
  { id: 'col-txns', type: 'collection', position: { x: 185, y: 445 }, data: { icon: '🗄', label: 'transactionsv2' } },
  { id: 'col-rels', type: 'collection', position: { x: 345, y: 445 }, data: { icon: '🗄', label: 'relationships' } },
  { id: 'col-watchlist', type: 'collection', position: { x: 510, y: 445 }, data: { icon: '🗄', label: 'entities' } },
  { id: 'col-typology-lib', type: 'collection', position: { x: 70, y: 620 }, data: { icon: '🗄', label: 'typology_library' } },
  { id: 'col-rels2', type: 'collection', position: { x: 30, y: 730 }, data: { icon: '🗄', label: 'entities + relationships' } },
  { id: 'col-txns2', type: 'collection', position: { x: 560, y: 730 }, data: { icon: '🗄', label: 'transactionsv2' } },
  { id: 'col-rels3', type: 'collection', position: { x: 560, y: 840 }, data: { icon: '🗄', label: 'relationships' } },
  { id: 'col-policies', type: 'collection', position: { x: 560, y: 1240 }, data: { icon: '🗄', label: 'compliance_policies' } },
];

const COL_EDGE_STYLE = { strokeWidth: 1, stroke: palette.gray.light1, strokeDasharray: '3 2' };
const COL_EDGE_MARKER = { type: MarkerType.ArrowClosed, width: 8, height: 8, color: palette.gray.light1 };
const COL_LABEL_STYLE = { fontSize: 7, fontWeight: 600, fontFamily: "'Source Code Pro', monospace", fill: palette.green.dark2 };
const COL_LABEL_BG = { fill: palette.green.light3, fillOpacity: 0.92 };

const COLLECTION_EDGES = [
  { id: 'ce-entity', source: 'fetchEntity', target: 'col-entities', style: COL_EDGE_STYLE, markerEnd: COL_EDGE_MARKER, label: 'findOne()', labelStyle: COL_LABEL_STYLE, labelBgStyle: COL_LABEL_BG },
  { id: 'ce-txn', source: 'fetchTxn', target: 'col-txns', style: COL_EDGE_STYLE, markerEnd: COL_EDGE_MARKER, label: 'aggregate()', labelStyle: COL_LABEL_STYLE, labelBgStyle: COL_LABEL_BG },
  { id: 'ce-rels', source: 'fetchNetwork', target: 'col-rels', style: COL_EDGE_STYLE, markerEnd: COL_EDGE_MARKER, label: '$graphLookup', labelStyle: COL_LABEL_STYLE, labelBgStyle: COL_LABEL_BG },
  { id: 'ce-wl', source: 'fetchWatchlist', target: 'col-watchlist', style: COL_EDGE_STYLE, markerEnd: COL_EDGE_MARKER, label: 'find()', labelStyle: COL_LABEL_STYLE, labelBgStyle: COL_LABEL_BG },
  { id: 'ce-typolib', source: 'typology', target: 'col-typology-lib', style: COL_EDGE_STYLE, markerEnd: COL_EDGE_MARKER, label: 'Atlas Search', labelStyle: COL_LABEL_STYLE, labelBgStyle: COL_LABEL_BG },
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
  { id: 'e-triage-autoclose', source: 'triage', target: 'autoClose', label: 'auto_close', labelStyle: { fontSize: 8, fontWeight: 600, fontFamily: FONT }, labelBgStyle: LABEL_BG, ...EDGE_BASE, style: { ...EDGE_BASE.style, stroke: palette.gray.base } },
  { id: 'e-autoclose-end', source: 'autoClose', target: 'endNode', ...EDGE_BASE, type: 'smoothstep', style: { ...EDGE_BASE.style, stroke: palette.gray.light1, strokeDasharray: '4 2' } },
  { id: 'e-triage-urgent', source: 'triage', target: 'urgentEscalation', label: 'escalate_urgent', labelStyle: { fontSize: 8, fontWeight: 600, fontFamily: FONT }, labelBgStyle: LABEL_BG, ...EDGE_BASE, style: { ...EDGE_BASE.style, stroke: palette.red.dark2 } },
  { id: 'e-urgent-humanreview', source: 'urgentEscalation', target: 'humanReview', ...EDGE_BASE, type: 'smoothstep', style: { ...EDGE_BASE.style, stroke: palette.red.dark2, strokeDasharray: '6 3' } },
  { id: 'e-triage-dg', source: 'triage', target: 'dataGathering', label: 'investigate', labelStyle: { fontSize: 8, fontWeight: 600, fontFamily: FONT }, labelBgStyle: LABEL_BG, ...EDGE_BASE, style: { ...EDGE_BASE.style, stroke: palette.blue.base } },
  ...['fetchEntity', 'fetchTxn', 'fetchNetwork', 'fetchWatchlist'].map((target) => ({
    id: `e-dg-${target}`, source: 'dataGathering', target, ...EDGE_BASE, animated: true,
    label: 'Send', labelStyle: { fontSize: 7, fontWeight: 600, fontFamily: FONT, fill: palette.purple.base },
    labelBgStyle: LABEL_BG, style: { ...EDGE_BASE.style, stroke: palette.purple.base, strokeDasharray: '6 3' },
  })),
  ...['fetchEntity', 'fetchTxn', 'fetchNetwork', 'fetchWatchlist'].map((source) => ({
    id: `e-${source}-assemble`, source, target: 'assembleCase', ...EDGE_BASE, style: { ...EDGE_BASE.style, stroke: palette.green.dark2 },
  })),
  { id: 'e-assemble-typo', source: 'assembleCase', target: 'typology', ...EDGE_BASE, style: { ...EDGE_BASE.style, stroke: palette.yellow.dark2 } },
  // Parallel: typology -> [networkAnalyst, temporalAnalyst]
  { id: 'e-typo-network', source: 'typology', target: 'networkAnalyst', label: 'parallel', labelStyle: { fontSize: 7, fontWeight: 600, fontFamily: FONT, fill: palette.yellow.dark2 }, labelBgStyle: LABEL_BG, ...EDGE_BASE, style: { ...EDGE_BASE.style, stroke: palette.yellow.dark2 } },
  { id: 'e-typo-temporal', source: 'typology', target: 'temporalAnalyst', label: 'parallel', labelStyle: { fontSize: 7, fontWeight: 600, fontFamily: FONT, fill: palette.yellow.dark2 }, labelBgStyle: LABEL_BG, ...EDGE_BASE, style: { ...EDGE_BASE.style, stroke: palette.yellow.dark2 } },
  // Both converge into trail_follower
  { id: 'e-network-trail', source: 'networkAnalyst', target: 'trailFollower', ...EDGE_BASE, style: { ...EDGE_BASE.style, stroke: palette.blue.dark2 } },
  { id: 'e-temporal-trail', source: 'temporalAnalyst', target: 'trailFollower', ...EDGE_BASE, style: { ...EDGE_BASE.style, stroke: palette.blue.dark2 } },
  // Trail -> sub-investigation fan-out
  { id: 'e-trail-subdispatch', source: 'trailFollower', target: 'subDispatch', ...EDGE_BASE, style: { ...EDGE_BASE.style, stroke: palette.purple.base } },
  { id: 'e-subdispatch-mini', source: 'subDispatch', target: 'miniInvestigate', ...EDGE_BASE, animated: true, label: 'Send (N leads)', labelStyle: { fontSize: 7, fontWeight: 600, fontFamily: FONT, fill: palette.purple.base }, labelBgStyle: LABEL_BG, style: { ...EDGE_BASE.style, stroke: palette.purple.base, strokeDasharray: '6 3' } },
  { id: 'e-mini-collect', source: 'miniInvestigate', target: 'collectSubFindings', ...EDGE_BASE, style: { ...EDGE_BASE.style, stroke: palette.green.dark1 } },
  // Collect -> narrative -> validation
  { id: 'e-collect-narrative', source: 'collectSubFindings', target: 'narrative', ...EDGE_BASE, style: { ...EDGE_BASE.style, stroke: palette.green.dark1 } },
  { id: 'e-narrative-validation', source: 'narrative', target: 'validation', ...EDGE_BASE, style: { ...EDGE_BASE.style, stroke: palette.blue.dark1 } },
  { id: 'e-validation-hr', source: 'validation', target: 'humanReview', label: 'human_review', labelStyle: { fontSize: 8, fontWeight: 600, fontFamily: FONT }, labelBgStyle: LABEL_BG, ...EDGE_BASE, style: { ...EDGE_BASE.style, stroke: palette.red.base } },
  {
    id: 'e-validation-dg', source: 'validation', sourceHandle: 'right', target: 'dataGathering', targetHandle: 'right',
    label: 'data_gathering', labelStyle: { fontSize: 7, fontWeight: 600, fontFamily: FONT },
    labelBgStyle: { fill: palette.yellow.light3, fillOpacity: 0.95 },
    ...EDGE_BASE, animated: true, style: { ...EDGE_BASE.style, stroke: palette.yellow.dark2, strokeDasharray: '5 3' }, type: 'smoothstep',
  },
  {
    id: 'e-validation-narrative', source: 'validation', sourceHandle: 'right', target: 'narrative', targetHandle: 'right',
    label: 'narrative', labelStyle: { fontSize: 7, fontWeight: 600, fontFamily: FONT },
    labelBgStyle: { fill: palette.yellow.light3, fillOpacity: 0.95 },
    ...EDGE_BASE, animated: true, style: { ...EDGE_BASE.style, stroke: palette.yellow.dark2, strokeDasharray: '5 3' }, type: 'smoothstep',
  },
  {
    id: 'e-validation-finalize', source: 'validation', target: 'finalize',
    label: 'finalize (max loops)', labelStyle: { fontSize: 7, fontWeight: 600, fontFamily: FONT, fill: palette.gray.dark1 },
    labelBgStyle: LABEL_BG, ...EDGE_BASE, style: { ...EDGE_BASE.style, stroke: palette.gray.base, strokeDasharray: '4 2' }, type: 'smoothstep',
  },
  { id: 'e-hr-finalize', source: 'humanReview', target: 'finalize', label: 'resume', labelStyle: { fontSize: 8, fontWeight: 600, fontFamily: FONT }, labelBgStyle: LABEL_BG, ...EDGE_BASE, style: { ...EDGE_BASE.style, stroke: palette.green.dark2 } },
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
    if (nodeId) {
      states[nodeId] = status; // 'active' | 'completed'
    }
  }

  // Mark unreached nodes as pending only if we have at least one active/completed node
  const hasActivity = Object.keys(states).length > 0;
  if (hasActivity) {
    const allAgentNodeIds = Object.values(AGENT_TO_NODE);
    for (const nodeId of allAgentNodeIds) {
      if (!states[nodeId]) {
        states[nodeId] = 'pending';
      }
    }
  }

  return states;
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
        position: 'absolute',
        top: 10,
        right: 10,
        zIndex: 10,
        width: 32,
        height: 32,
        borderRadius: 6,
        border: `1px solid ${palette.gray.light2}`,
        background: '#fff',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
        fontSize: 14,
        color: palette.gray.dark2,
        transition: 'background 0.15s',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = palette.gray.light3; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = '#fff'; }}
    >
      {isFullscreen ? '✕' : '⛶'}
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
      style={{ background: palette.gray.light3, borderRadius: 8 }}
    >
      <Background color={palette.gray.light2} gap={20} size={1} />
      <Controls
        showInteractive={false}
        style={{ borderRadius: 6, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}
      />
      <MiniMap
        nodeColor={(node) => {
          if (node.data?.executionState === 'active') return palette.blue.base;
          if (node.data?.executionState === 'completed') return palette.green.dark1;
          return node.data?.color || palette.gray.base;
        }}
        maskColor="rgba(0,0,0,0.06)"
        style={{ borderRadius: 6, border: `1px solid ${palette.gray.light2}` }}
      />
    </ReactFlow>
  );
}

export default function AgenticPipelineGraph({ showTools = true, activeAgents = null }) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const nodeStates = useMemo(() => computeNodeStates(activeAgents), [activeAgents]);

  const nodes = useMemo(() => {
    const base = INITIAL_NODES.map(node => {
      const execState = nodeStates[node.id];
      if (execState) {
        return {
          ...node,
          data: { ...node.data, executionState: execState },
        };
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

  useEffect(() => {
    setN(nodes);
  }, [nodes, setN]);

  useEffect(() => {
    setE(edges);
  }, [edges, setE]);

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
        <FullscreenButton onClick={() => setIsFullscreen(true)} isFullscreen={false} />
        <PipelineFlowContent {...flowProps} />
      </div>

      {isFullscreen && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(0,0,0,0.6)',
          display: 'flex', flexDirection: 'column',
        }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '12px 20px',
            background: palette.gray.dark3, color: '#fff',
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
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.2)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; }}
            >
              Exit Fullscreen <span style={{ fontSize: 10 }}>ESC</span>
            </button>
          </div>
          <div style={{ flex: 1, position: 'relative' }}>
            <PipelineFlowContent {...flowProps} />
          </div>
        </div>
      )}

      <style>{`
        @keyframes node-pulse {
          0%, 100% { box-shadow: 0 0 0 2px rgba(0,99,235,0.2), 0 3px 12px rgba(0,0,0,0.1); }
          50% { box-shadow: 0 0 0 4px rgba(0,99,235,0.1), 0 3px 12px rgba(0,0,0,0.1); }
        }
      `}</style>
    </>
  );
}
