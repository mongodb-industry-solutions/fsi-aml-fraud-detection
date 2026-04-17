"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Tabs, Tab } from '@leafygreen-ui/tabs';
import Badge from '@leafygreen-ui/badge';
import Icon from '@leafygreen-ui/icon';
import Code from '@leafygreen-ui/code';
import { Body, Subtitle } from '@leafygreen-ui/typography';
import { palette } from '@leafygreen-ui/palette';
import { spacing } from '@leafygreen-ui/tokens';
import { uiTokens } from './investigationTokens';

const FONT = uiTokens.font;
const MONO = uiTokens.monoFont;

// Tab indices used for cross-referencing
const TAB_AGENTS = 0;
const TAB_LANGGRAPH = 1;
const TAB_HITL = 2;
const TAB_MONGODB = 3;

// ---------------------------------------------------------------------------
// Data: Hero Stats
// ---------------------------------------------------------------------------

const HERO_STATS = [
  { value: '12', label: 'Specialized Agents', color: palette.blue.base },
  { value: '13+', label: 'MongoDB Tools', color: palette.green.dark1 },
  { value: '6', label: 'Parallel Workers', color: palette.purple.base },
  { value: '8', label: 'MongoDB Features', color: palette.green.dark1 },
  { value: '2×', label: 'Max Validation Loops', color: palette.yellow.dark2 },
  { value: '1', label: 'Unified Data Platform', color: palette.green.dark1 },
  { value: '100%', label: 'Durable HITL', color: palette.red.base },
];

// ---------------------------------------------------------------------------
// Data: Pipeline Agents
// Each agent has `value` (business-value line) and `uses` (cross-ref chips)
// `uses.langgraph` values must match a feature.name in LANGGRAPH_SECTIONS
// `uses.mongodb` values must match a feature.name in MONGODB_FEATURES
// ---------------------------------------------------------------------------

const PIPELINE_STAGES = [
  {
    stage: 'Intake & Triage',
    agents: [
      {
        number: 1, name: 'Triage Agent', glyph: 'MagnifyingGlass',
        color: palette.blue.base, type: 'LLM Agent', typeBg: palette.blue.light3, typeColor: palette.blue.dark2,
        role: 'Risk scoring and disposition routing',
        detail: 'Structured output → TriageDecision. Command-based dynamic routing to auto_close or data_gathering.',
        value: 'Auto-closes ~70% of false positives, freeing analysts for real threats.',
        uses: {
          langgraph: ['Command routing', 'with_structured_output()'],
          mongodb: ['Change Streams'],
        },
      },
    ],
  },
  {
    stage: 'Data Collection',
    agents: [
      {
        number: 2, name: 'Data Gatherer', glyph: 'Charts',
        color: palette.purple.base, type: 'Fan-out', typeBg: palette.purple.light3, typeColor: palette.purple.dark2,
        role: 'Parallel evidence collection dispatcher',
        detail: 'LangGraph Send API fans out 4 concurrent workers: entity, transactions, network, watchlist.',
        value: 'Cuts evidence gathering time by ~75% through true concurrency.',
        uses: {
          langgraph: ['Send API', '_merge_dicts reducer'],
          mongodb: ['Document Model'],
        },
      },
      {
        number: 3, name: 'Case Analyst', glyph: 'Folder',
        color: palette.green.dark1, type: 'LLM + RAG', typeBg: palette.green.light3, typeColor: palette.green.dark2,
        role: '360° profile synthesis + crime typology classification',
        detail: 'Single LLM call produces CaseFile + TypologyResult. RAG retrieval from typology_library via Atlas Search.',
        value: 'Maps every case to a named AML typology — audit-ready classification.',
        uses: {
          langgraph: ['with_structured_output()', 'Atlas Search RAG'],
          mongodb: ['Atlas Search', 'Document Model'],
        },
      },
    ],
  },
  {
    stage: 'Analysis',
    agents: [
      {
        number: 4, name: 'Network Analyst', glyph: 'Connect',
        color: palette.yellow.dark2, type: 'MongoDB Query', typeBg: palette.yellow.light3, typeColor: palette.yellow.dark2,
        role: 'Graph centrality and network risk scoring',
        detail: 'Pure compute — no LLM. Uses $graphLookup for relationship traversal and shell structure detection.',
        value: 'Surfaces shell-company structures that manual review would miss.',
        uses: {
          langgraph: ['Parallel edges + join'],
          mongodb: ['$graphLookup'],
        },
      },
      {
        number: 5, name: 'Temporal Analyst', glyph: 'Clock',
        color: palette.yellow.dark2, type: 'MongoDB Query', typeBg: palette.yellow.light3, typeColor: palette.yellow.dark2,
        role: 'Time-series suspicious pattern detection',
        detail: 'Runs in parallel with Network Analyst. Uses $setWindowFields for structuring, velocity, round-trips, dormancy.',
        value: 'Detects structuring and rapid-movement patterns FinCEN explicitly flags.',
        uses: {
          langgraph: ['Parallel edges + join'],
          mongodb: ['$setWindowFields'],
        },
      },
      {
        number: 6, name: 'Trail Follower', glyph: 'ArrowRight',
        color: palette.blue.dark2, type: 'LLM Agent', typeBg: palette.blue.light3, typeColor: palette.blue.dark2,
        role: 'Lead selection from converged network + temporal analysis',
        detail: 'Conditional LLM call — skipped for simple cases. Uses $graphLookup to trace ownership chains.',
        value: 'Saves compute by skipping the LLM when the case is obviously simple.',
        uses: {
          langgraph: ['with_structured_output()'],
          mongodb: ['$graphLookup'],
        },
      },
    ],
  },
  {
    stage: 'Sub-Investigations',
    agents: [
      {
        number: 7, name: 'Sub-Investigators', glyph: 'Beaker',
        color: palette.purple.base, type: 'Fan-out + LLM', typeBg: palette.purple.light3, typeColor: palette.purple.dark2,
        role: 'Parallel mini-investigations per lead (N×)',
        detail: 'Send API fans out one worker per lead. Each runs 4 tool calls + 1 LLM call → LeadAssessment.',
        value: 'Expands investigations to connected entities automatically — no analyst pivoting.',
        uses: {
          langgraph: ['Send API', '_merge_dicts reducer'],
          mongodb: ['Document Model'],
        },
      },
    ],
  },
  {
    stage: 'Reporting & Review',
    agents: [
      {
        number: 8, name: 'SAR Author', glyph: 'Edit',
        color: palette.green.base, type: 'LLM + RAG', typeBg: palette.green.light3, typeColor: palette.green.dark2,
        role: 'FinCEN-compliant SAR narrative generation',
        detail: 'Generates 5Ws narrative grounded in JSON evidence. RAG from compliance_policies. Temperature 0.1.',
        value: 'Produces filing-ready narratives — analyst reviews instead of writes.',
        uses: {
          langgraph: ['with_structured_output()', 'Atlas Search RAG'],
          mongodb: ['Atlas Search'],
        },
      },
      {
        number: 9, name: 'Compliance QA', glyph: 'Checkmark',
        color: palette.blue.dark1, type: 'LLM Judge', typeBg: palette.blue.light3, typeColor: palette.blue.dark2,
        role: 'Hallucination prevention + regulatory compliance gate',
        detail: 'Validates completeness, factual accuracy, citations. Command routing to re-draft, escalate, or approve.',
        value: 'Blocks hallucinations before they reach the regulator — every claim must be grounded.',
        uses: {
          langgraph: ['Validator routing', 'Command routing'],
          mongodb: [],
        },
      },
      {
        number: 10, name: 'Human Review', glyph: 'Visibility',
        color: palette.red.base, type: 'HITL', typeBg: palette.red.light3, typeColor: palette.red.dark2,
        role: 'Durable analyst pause/resume checkpoint',
        detail: 'interrupt_before halts pipeline. Full state saved to MongoDBSaver. Analyst approves, rejects, or requests changes.',
        value: 'Regulators require human sign-off — we do it without losing state across hours or days.',
        uses: {
          langgraph: ['MongoDBSaver'],
          mongodb: ['MongoDBSaver'],
        },
      },
    ],
  },
  {
    stage: 'Finalization',
    agents: [
      {
        number: 11, name: 'Finalize', glyph: 'File',
        color: palette.green.dark2, type: 'Persistence', typeBg: palette.green.light3, typeColor: palette.green.dark2,
        role: 'Assemble & persist complete investigation document',
        detail: 'Immutable audit trail, pipeline metrics, SAR narrative, all evidence → MongoDB investigations collection.',
        value: 'Examiner-ready: every agent decision is timestamped, typed, and immutable.',
        uses: {
          langgraph: ['_append_only reducer'],
          mongodb: ['Document Model'],
        },
      },
      {
        number: 12, name: 'Chat Co-Pilot', glyph: 'Sparkle',
        color: palette.blue.base, type: 'ReAct Agent', typeBg: palette.blue.light3, typeColor: palette.blue.dark2,
        role: 'Conversational investigation assistant with 15 tools',
        detail: 'create_react_agent from LangGraph prebuilt. Supports artifacts: Markdown reports, Mermaid diagrams, HTML dashboards.',
        value: 'Lets analysts explore cases in natural language — no SQL, no Python, no training.',
        uses: {
          langgraph: ['create_react_agent', '@tool decorators'],
          mongodb: ['Atlas Search', '$graphLookup'],
        },
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Data: LangGraph Features
// Select sections include a code snippet rendered after the feature rows
// ---------------------------------------------------------------------------

const LANGGRAPH_SECTIONS = [
  {
    title: 'Graph Architecture',
    features: [
      { name: 'StateGraph', desc: '15 nodes orchestrated in a directed acyclic graph with typed state', where: 'Core pipeline' },
      { name: 'InvestigationState', desc: 'TypedDict with 18 fields and custom reducers for safe concurrent writes', where: 'All nodes' },
      { name: '_merge_dicts reducer', desc: 'Shallow merge for parallel fan-out results without overwriting', where: 'Data Gathering, Sub-Investigations' },
      { name: '_append_only reducer', desc: 'Immutable append for audit trail — entries can never be removed', where: 'agent_audit_log, tool_trace_log' },
    ],
  },
  {
    title: 'Dynamic Routing',
    features: [
      { name: 'Command routing', desc: 'Inline state update + dynamic goto target in a single return', where: 'Triage → auto_close | data_gathering' },
      { name: 'Validator routing', desc: 'Routes to re-draft, re-gather, human review, or finalize based on QA score', where: 'Compliance QA → 4 possible targets' },
    ],
    snippet: {
      language: 'python',
      code: `# Triage dynamically routes + updates state in one return
return Command(
    goto="data_gathering" if risk_score >= 25 else "auto_close",
    update={
        "triage_decision": decision,
        "agent_audit_log": [audit_entry],
    },
)`,
    },
  },
  {
    title: 'Parallel Execution',
    features: [
      { name: 'Send API', desc: 'Fan-out dispatcher spawning concurrent workers with independent state slices', where: 'Data Gathering (4×), Sub-Investigations (N×)' },
      { name: 'Parallel edges + join', desc: 'Network + Temporal analysts run concurrently; Trail Follower waits for both', where: 'Analysis stage' },
    ],
    snippet: {
      language: 'python',
      code: `# Fan out 4 concurrent workers to gather evidence in parallel
return [
    Send("fetch_entity_profile", {"entity_id": entity_id}),
    Send("fetch_transactions",   {"entity_id": entity_id}),
    Send("fetch_network",        {"entity_id": entity_id}),
    Send("fetch_watchlist",      {"entity_id": entity_id}),
]`,
    },
  },
  {
    title: 'LLM Integration',
    features: [
      { name: 'with_structured_output()', desc: 'Type-safe Pydantic model outputs on all 6 LLM-calling nodes', where: 'Triage, Case Analyst, Trail Follower, etc.' },
      { name: 'ChatBedrockConverse', desc: 'Claude model via AWS Bedrock with singleton pattern and retry wrapper', where: 'All LLM calls' },
      { name: 'create_react_agent', desc: 'Prebuilt ReAct loop with 15 tools for conversational investigation', where: 'Chat Co-Pilot' },
      { name: '@tool decorators', desc: '13+ MongoDB-backed tool functions callable by agents', where: 'Entity, transaction, network, policy tools' },
    ],
    snippet: {
      language: 'python',
      code: `# Every LLM call returns a typed Pydantic model — no string parsing
llm = ChatBedrockConverse(model_id=MODEL_ARN, temperature=0.1)
result = llm.with_structured_output(
    TriageDecision,
    include_raw=True,
).invoke(messages)

decision: TriageDecision = result["parsed"]   # fully typed`,
    },
  },
  {
    title: 'RAG & Retrieval',
    features: [
      { name: 'Atlas Search RAG', desc: 'Retrieves relevant typology patterns and compliance policies for grounded generation', where: 'Case Analyst, SAR Author' },
      { name: 'Typology library', desc: '12 AML crime typologies with red flags and regulatory references', where: 'Case Analyst typology classification' },
      { name: 'Compliance policies', desc: '6 FinCEN/regulatory policy documents for SAR formatting guidance', where: 'SAR Author narrative generation' },
    ],
  },
  {
    title: 'Streaming & Persistence',
    features: [
      { name: 'astream(stream_mode="updates")', desc: 'Real-time node-level state updates streamed via SSE to frontend', where: 'Investigation execution' },
      { name: 'MongoDBSaver', desc: 'Durable checkpoint persistence — survives backend crashes, enables HITL', where: 'All nodes (automatic)' },
      { name: 'MongoDBStore', desc: 'Cross-investigation long-term memory for pattern learning', where: 'Optional graph compilation' },
    ],
    snippet: {
      language: 'python',
      code: `# Durable HITL: interrupt_before + MongoDBSaver = crash-safe pause/resume
graph = builder.compile(
    checkpointer=MongoDBSaver(mongo_client, db_name="threatsight"),
    store=MongoDBStore.from_conn_string(MONGODB_URI),
    interrupt_before=["human_review"],
)`,
    },
  },
];

// ---------------------------------------------------------------------------
// Data: HITL Flow
// ---------------------------------------------------------------------------

const HITL_FLOW_STEPS = [
  { label: 'Pipeline Running', icon: 'Play', color: palette.blue.base, bg: palette.blue.light3 },
  { label: 'interrupt_before', icon: 'Pause', color: palette.red.base, bg: palette.red.light3 },
  { label: 'State → MongoDB', icon: 'Database', color: palette.green.dark1, bg: palette.green.light3 },
  { label: 'Analyst Review', icon: 'Visibility', color: palette.yellow.dark2, bg: palette.yellow.light3 },
  { label: 'Resume', icon: 'Play', color: palette.blue.base, bg: palette.blue.light3 },
  { label: 'Pipeline Continues', icon: 'Checkmark', color: palette.green.dark1, bg: palette.green.light3 },
];

const HITL_MECHANISMS = [
  { title: 'Durable Interrupt', code: 'interrupt_before=["human_review"]', desc: 'Graph pauses before the human_review node at compile time. Execution halts cleanly — no polling, no timeouts.' },
  { title: 'Checkpoint Persistence', code: 'MongoDBSaver', desc: 'Complete investigation state serialized to MongoDB checkpoints collection. Fully recoverable even if backend crashes mid-pipeline.' },
  { title: 'State Resume', code: 'graph.update_state() → graph.astream()', desc: 'Analyst decision injected into graph state, then pipeline resumes from exact checkpoint with full SSE streaming.' },
  { title: 'Analyst Decisions', code: 'approve | reject | request_changes', desc: 'Three decision paths: file SAR, close case, or update and re-review. Each path flows through finalize for audit.' },
  { title: 'Forced Escalation', code: 'MAX_VALIDATION_LOOPS = 2', desc: 'After 2 validation cycles without approval, Compliance QA forces escalation to human review — prevents infinite loops.' },
];

const RISK_TIERS = [
  { range: 'Score < 25', label: 'Auto-Close', desc: 'False positives routed directly to finalize. Human-on-the-loop — analyst monitors dashboards.', color: palette.green.dark1, bg: palette.green.light3 },
  { range: 'Score ≥ 25', label: 'Full HITL', desc: 'Complete investigation with mandatory human review before SAR filing. Analyst sees full evidence + narrative.', color: palette.yellow.dark2, bg: palette.yellow.light3 },
  { range: 'Validation fails ×2', label: 'Forced Escalation', desc: 'Compliance QA cannot validate — forces human review with escalation flag for senior analyst attention.', color: palette.red.base, bg: palette.red.light3 },
];

// ---------------------------------------------------------------------------
// Data: MongoDB Features
// Select features include an aggregation/query snippet
// ---------------------------------------------------------------------------

const MONGODB_FEATURES = [
  {
    name: '$graphLookup',
    desc: 'Recursive network traversal across relationship collections. Powers entity network analysis, shell structure detection, and ownership chain tracing.',
    agent: 'Network Analyst, Trail Follower',
    snippet: {
      language: 'javascript',
      code: `// Recursive ownership traversal — no separate graph DB
db.entities.aggregate([
  { $match: { entityId: alertEntity } },
  { $graphLookup: {
      from: "relationships",
      startWith: "$entityId",
      connectFromField: "target.entityId",
      connectToField: "source.entityId",
      as: "ownership_chain",
      maxDepth: 3,
  }}
])`,
    },
  },
  {
    name: '$setWindowFields',
    desc: 'Sliding-window analytics on time-series transaction data. Detects structuring, velocity anomalies, round-trip patterns, and dormancy bursts.',
    agent: 'Temporal Analyst',
    snippet: {
      language: 'javascript',
      code: `// Rolling 7-day velocity spikes — catches structuring in one pipeline
db.transactionsv2.aggregate([
  { $match: { "source.entityId": entityId } },
  { $setWindowFields: {
      partitionBy: "$source.entityId",
      sortBy: { transactionDate: 1 },
      output: {
        rolling_avg: {
          $avg: "$amount",
          window: { range: [-7, 0], unit: "day" }
        }
  }}}
])`,
    },
  },
  { name: '$facet', desc: 'Multi-dimensional analytics aggregation in a single pipeline — status distribution, typology counts, risk stats, and 7-day trends.', agent: 'Analytics Dashboard' },
  {
    name: 'Atlas Search',
    desc: 'Full-text + vector search powering RAG retrieval from typology_library (12 typologies) and compliance_policies (6 policies).',
    agent: 'Case Analyst, SAR Author',
    snippet: {
      language: 'javascript',
      code: `// RAG retrieval: find relevant AML typology patterns
db.typology_library.aggregate([
  { $search: {
      index: "typology_search",
      text: { query: hint, path: ["name", "red_flags", "description"] }
  }},
  { $limit: 3 }
])`,
    },
  },
  {
    name: 'Change Streams',
    desc: 'Real-time event triggers — watches alerts collection for new inserts, automatically kicks off triage pipeline. Also powers live UI updates.',
    agent: 'Pipeline Entry Point',
    snippet: {
      language: 'python',
      code: `# Real-time alert trigger — no polling, no message queue
async for change in db.alerts.watch([
    {"$match": {"operationType": "insert"}}
]):
    alert = change["fullDocument"]
    await graph.ainvoke({"alert_data": alert}, config)`,
    },
  },
  { name: 'Document Model', desc: 'Flexible schema stores evolving investigation evidence without migrations. Each node appends fields freely — no ALTER TABLE required.', agent: 'All Agents' },
  { name: 'MongoDBSaver', desc: 'LangGraph checkpoint persistence to MongoDB. Enables durable HITL pause/resume and crash recovery. Collections: checkpoints, checkpoint_writes.', agent: 'Human Review (HITL)' },
  { name: 'MongoDBStore', desc: 'Long-term cross-investigation memory store. Enables pattern learning across cases — insights from one investigation inform future triage.', agent: 'Graph Compilation' },
];

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SectionHeader({ children }) {
  return (
    <div style={{
      fontSize: 10, fontFamily: FONT, fontWeight: 700,
      textTransform: 'uppercase', letterSpacing: '1px',
      color: palette.gray.base, marginTop: spacing[3], marginBottom: spacing[2],
      paddingBottom: 4, borderBottom: `1px solid ${palette.gray.light2}`,
    }}>
      {children}
    </div>
  );
}

function HeroStats() {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))',
      gap: 6,
      marginBottom: spacing[3],
      padding: '12px 8px',
      borderRadius: 8,
      background: `linear-gradient(135deg, ${palette.gray.light3} 0%, #fff 100%)`,
      border: `1px solid ${uiTokens.borderDefault}`,
    }}>
      {HERO_STATS.map((stat) => (
        <div key={stat.label} style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          padding: '4px 6px', textAlign: 'center',
        }}>
          <div style={{
            fontSize: 22, fontWeight: 700, fontFamily: FONT,
            color: stat.color, lineHeight: 1.1,
          }}>
            {stat.value}
          </div>
          <div style={{
            fontSize: 9, fontFamily: FONT, fontWeight: 600,
            color: palette.gray.dark1, textTransform: 'uppercase',
            letterSpacing: '0.4px', marginTop: 4, lineHeight: 1.2,
          }}>
            {stat.label}
          </div>
        </div>
      ))}
    </div>
  );
}

function CrossRefChip({ label, variant, onClick }) {
  const palettes = {
    langgraph: { bg: palette.blue.light3, color: palette.blue.dark2, border: palette.blue.light2 },
    mongodb: { bg: palette.green.light3, color: palette.green.dark2, border: palette.green.light2 },
  };
  const p = palettes[variant];
  return (
    <button
      onClick={onClick}
      type="button"
      style={{
        fontSize: 9, fontFamily: MONO, fontWeight: 600,
        padding: '2px 6px', borderRadius: 3,
        background: p.bg, color: p.color,
        border: `1px solid ${p.border}`,
        cursor: 'pointer', whiteSpace: 'nowrap',
        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-1px)';
        e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.08)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      {label}
    </button>
  );
}

function AgentCard({ agent, onNavigate }) {
  const hasChips = (agent.uses?.langgraph?.length || 0) + (agent.uses?.mongodb?.length || 0) > 0;
  return (
    <div style={{
      display: 'flex', gap: 10, padding: '10px 12px',
      borderRadius: 6, background: '#fff',
      border: `1px solid ${uiTokens.borderDefault}`,
      borderLeft: `3px solid ${agent.color}`,
    }}>
      <div style={{
        width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
        background: agent.color, display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 12, fontWeight: 700, color: '#fff', fontFamily: FONT,
      }}>
        {agent.number}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
          <span style={{ fontSize: 13, fontWeight: 600, fontFamily: FONT, color: palette.gray.dark3 }}>
            {agent.name}
          </span>
          <span style={{
            fontSize: 9, fontWeight: 700, fontFamily: FONT,
            padding: '1px 6px', borderRadius: 3,
            background: agent.typeBg, color: agent.typeColor,
            textTransform: 'uppercase', letterSpacing: '0.3px',
            whiteSpace: 'nowrap',
          }}>
            {agent.type}
          </span>
        </div>
        <div style={{ fontSize: 11, color: palette.gray.dark1, fontFamily: FONT, lineHeight: 1.4, marginBottom: 2 }}>
          {agent.role}
        </div>
        <div style={{ fontSize: 10, color: palette.gray.base, fontFamily: FONT, lineHeight: 1.4, marginBottom: agent.value ? 4 : 0 }}>
          {agent.detail}
        </div>
        {agent.value && (
          <div style={{
            fontSize: 10, fontFamily: FONT, fontStyle: 'italic',
            color: palette.green.dark2, lineHeight: 1.4,
            paddingLeft: 6, borderLeft: `2px solid ${palette.green.light2}`,
            marginTop: 6,
          }}>
            {agent.value}
          </div>
        )}
        {hasChips && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
            {agent.uses?.langgraph?.map((name) => (
              <CrossRefChip
                key={`lg-${name}`}
                label={name}
                variant="langgraph"
                onClick={() => onNavigate(TAB_LANGGRAPH, name)}
              />
            ))}
            {agent.uses?.mongodb?.map((name) => (
              <CrossRefChip
                key={`mdb-${name}`}
                label={name}
                variant="mongodb"
                onClick={() => onNavigate(TAB_MONGODB, name)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function FeatureRow({ feature, isLast = false, highlighted = false, refCallback }) {
  return (
    <div
      ref={refCallback}
      style={{
        display: 'flex', gap: 12, padding: '6px 8px',
        borderBottom: isLast || highlighted ? 'none' : `1px solid ${palette.gray.light3}`,
        alignItems: 'flex-start',
        background: highlighted ? palette.yellow.light3 : 'transparent',
        borderRadius: highlighted ? 4 : 0,
        transition: 'background 0.3s ease',
      }}
    >
      <code style={{
        fontSize: 11, fontFamily: MONO, fontWeight: 600,
        color: palette.blue.dark2, background: palette.blue.light3,
        padding: '2px 6px', borderRadius: 3, whiteSpace: 'nowrap', flexShrink: 0,
      }}>
        {feature.name}
      </code>
      <div style={{ flex: 1 }}>
        <span style={{ fontSize: 11, fontFamily: FONT, color: palette.gray.dark2, lineHeight: 1.5 }}>
          {feature.desc}
        </span>
        <span style={{ fontSize: 10, fontFamily: FONT, color: palette.gray.base, marginLeft: 6 }}>
          — {feature.where}
        </span>
      </div>
    </div>
  );
}

function CodeBlock({ snippet }) {
  return (
    <div style={{ marginTop: spacing[2], marginBottom: spacing[2] }}>
      <Code language={snippet.language} copyable>
        {snippet.code}
      </Code>
    </div>
  );
}

function MongoFeatureCard({ feature, highlighted = false, refCallback }) {
  return (
    <div
      ref={refCallback}
      style={{
        padding: '12px 14px', borderRadius: 6,
        background: '#fff',
        border: highlighted ? `2px solid ${palette.yellow.dark2}` : `1px solid ${uiTokens.borderDefault}`,
        borderLeft: highlighted ? `2px solid ${palette.yellow.dark2}` : `3px solid ${palette.green.dark1}`,
        boxShadow: highlighted ? `0 0 0 3px ${palette.yellow.light3}` : 'none',
        transition: 'box-shadow 0.3s ease, border-color 0.3s ease',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <code style={{
          fontSize: 12, fontFamily: MONO, fontWeight: 700,
          color: palette.green.dark2,
        }}>
          {feature.name}
        </code>
      </div>
      <div style={{ fontSize: 11, fontFamily: FONT, color: palette.gray.dark1, lineHeight: 1.5, marginBottom: 4 }}>
        {feature.desc}
      </div>
      <div style={{ fontSize: 10, fontFamily: FONT, color: palette.gray.base }}>
        Used by: <strong style={{ color: palette.gray.dark1 }}>{feature.agent}</strong>
      </div>
      {feature.snippet && (
        <CodeBlock snippet={feature.snippet} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab Panels
// ---------------------------------------------------------------------------

function AgentPipelineTab({ onNavigate }) {
  return (
    <div style={{ padding: `${spacing[2]}px 0` }}>
      <Body style={{ fontSize: 12, fontFamily: FONT, color: palette.gray.dark1, marginBottom: spacing[2] }}>
        12 specialized agents orchestrated by LangGraph StateGraph — from alert triage to SAR filing.
        Click any chip to jump to the feature or operator.
      </Body>
      {PIPELINE_STAGES.map((stage) => (
        <div key={stage.stage}>
          <SectionHeader>{stage.stage}</SectionHeader>
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: spacing[2], marginBottom: spacing[1],
          }}>
            {stage.agents.map((agent) => (
              <AgentCard key={agent.number} agent={agent} onNavigate={onNavigate} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function LangGraphTab({ highlightedItem, registerRef }) {
  return (
    <div style={{ padding: `${spacing[2]}px 0` }}>
      <Body style={{ fontSize: 12, fontFamily: FONT, color: palette.gray.dark1, marginBottom: spacing[2] }}>
        Key LangGraph and LangChain features demonstrated in the agentic pipeline.
      </Body>
      {LANGGRAPH_SECTIONS.map((section) => (
        <div key={section.title}>
          <SectionHeader>{section.title}</SectionHeader>
          <div style={{ marginBottom: spacing[1] }}>
            {section.features.map((f, idx) => (
              <FeatureRow
                key={f.name}
                feature={f}
                isLast={idx === section.features.length - 1}
                highlighted={highlightedItem === f.name}
                refCallback={(el) => registerRef(TAB_LANGGRAPH, f.name, el)}
              />
            ))}
          </div>
          {section.snippet && <CodeBlock snippet={section.snippet} />}
        </div>
      ))}
    </div>
  );
}

function HITLTab() {
  return (
    <div style={{ padding: `${spacing[2]}px 0` }}>
      <Body style={{ fontSize: 12, fontFamily: FONT, color: palette.gray.dark1, marginBottom: spacing[3] }}>
        Durable human-in-the-loop via LangGraph's interrupt mechanism and MongoDB checkpoint persistence.
      </Body>

      {/* Flow diagram */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 0,
        padding: `${spacing[3]}px ${spacing[2]}px`,
        borderRadius: 8, background: palette.gray.light3,
        border: `1px solid ${uiTokens.borderDefault}`,
        marginBottom: spacing[4], overflowX: 'auto',
      }}>
        {HITL_FLOW_STEPS.map((step, i) => (
          <React.Fragment key={step.label}>
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
              minWidth: 80, flex: 1,
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%',
                background: step.bg, border: `2px solid ${step.color}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon glyph={step.icon} size={16} fill={step.color} />
              </div>
              <span style={{
                fontSize: 9, fontFamily: FONT, fontWeight: 600,
                color: step.color, textAlign: 'center', lineHeight: 1.3,
              }}>
                {step.label}
              </span>
            </div>
            {i < HITL_FLOW_STEPS.length - 1 && (
              <div style={{
                width: 24, height: 2, background: palette.gray.light1,
                flexShrink: 0, position: 'relative', top: -8,
              }}>
                <div style={{
                  position: 'absolute', right: -3, top: -3,
                  width: 0, height: 0,
                  borderLeft: `5px solid ${palette.gray.light1}`,
                  borderTop: '4px solid transparent',
                  borderBottom: '4px solid transparent',
                }} />
              </div>
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Key mechanisms */}
      <SectionHeader>Key Mechanisms</SectionHeader>
      <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[2], marginBottom: spacing[3] }}>
        {HITL_MECHANISMS.map((m) => (
          <div key={m.title} style={{
            padding: '10px 14px', borderRadius: 6,
            background: '#fff', border: `1px solid ${uiTokens.borderDefault}`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: 12, fontWeight: 600, fontFamily: FONT, color: palette.gray.dark3 }}>
                {m.title}
              </span>
              <code style={{
                fontSize: 10, fontFamily: MONO, color: palette.red.dark2,
                background: palette.red.light3, padding: '1px 5px', borderRadius: 3,
              }}>
                {m.code}
              </code>
            </div>
            <div style={{ fontSize: 11, fontFamily: FONT, color: palette.gray.dark1, lineHeight: 1.5 }}>
              {m.desc}
            </div>
          </div>
        ))}
      </div>

      {/* Risk-adaptive tiers */}
      <SectionHeader>Risk-Adaptive Oversight</SectionHeader>
      <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[2] }}>
        {RISK_TIERS.map((tier) => (
          <div key={tier.label} style={{
            display: 'flex', alignItems: 'flex-start', gap: 12,
            padding: '10px 14px', borderRadius: 6,
            background: tier.bg, border: `1px solid ${tier.color}`,
          }}>
            <div style={{
              fontSize: 10, fontWeight: 700, fontFamily: MONO,
              color: tier.color, whiteSpace: 'nowrap', paddingTop: 1,
            }}>
              {tier.range}
            </div>
            <div>
              <span style={{ fontSize: 12, fontWeight: 600, fontFamily: FONT, color: tier.color }}>
                {tier.label}
              </span>
              <div style={{ fontSize: 11, fontFamily: FONT, color: palette.gray.dark2, lineHeight: 1.5, marginTop: 2 }}>
                {tier.desc}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MongoDBTab({ highlightedItem, registerRef }) {
  return (
    <div style={{ padding: `${spacing[2]}px 0` }}>
      <Body style={{ fontSize: 12, fontFamily: FONT, color: palette.gray.dark1, marginBottom: spacing[2] }}>
        MongoDB capabilities powering the investigation pipeline — from graph traversal to durable checkpointing.
      </Body>
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
        gap: spacing[2],
      }}>
        {MONGODB_FEATURES.map((f) => (
          <MongoFeatureCard
            key={f.name}
            feature={f}
            highlighted={highlightedItem === f.name}
            refCallback={(el) => registerRef(TAB_MONGODB, f.name, el)}
          />
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Export
// ---------------------------------------------------------------------------

export default function PipelineInfoPanel() {
  const [selectedTab, setSelectedTab] = useState(0);
  const [highlightedItem, setHighlightedItem] = useState(null);
  const itemRefs = useRef({});

  // Clear highlight after 2.5s
  useEffect(() => {
    if (!highlightedItem) return;
    const t = setTimeout(() => setHighlightedItem(null), 2500);
    return () => clearTimeout(t);
  }, [highlightedItem]);

  // Scroll to highlighted item on tab change.
  // Refs populate in the commit phase before this effect runs, so no timeout is needed;
  // the small delay remains as a defensive buffer in case LG Tabs internals change.
  useEffect(() => {
    if (!highlightedItem) return;
    const t = setTimeout(() => {
      const el = itemRefs.current[`${selectedTab}:${highlightedItem}`];
      if (el && typeof el.scrollIntoView === 'function') {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 80);
    return () => clearTimeout(t);
  }, [selectedTab, highlightedItem]);

  // Ref map is keyed by `${tabIdx}:${name}` so that items sharing a name across tabs
  // (e.g. MongoDBSaver appears in both LangGraph and MongoDB tabs) do not collide.
  const registerRef = (tabIdx, name, el) => {
    if (el) itemRefs.current[`${tabIdx}:${name}`] = el;
  };

  const navigate = (tabIdx, itemName) => {
    setSelectedTab(tabIdx);
    setHighlightedItem(itemName);
  };

  return (
    <div style={{
      padding: spacing[3],
      background: '#fff',
      border: `1px solid ${uiTokens.borderDefault}`,
      borderRadius: 8,
      boxShadow: uiTokens.shadowCard,
    }}>
      {/* Header */}
      <div style={{ marginBottom: spacing[3] }}>
        <Subtitle style={{ fontFamily: FONT, fontSize: 18, margin: 0, marginBottom: 4 }}>
          Agentic Investigation Pipeline
        </Subtitle>
        <Body style={{ fontSize: 12, fontFamily: FONT, color: palette.gray.dark1, margin: 0 }}>
          12 AI agents orchestrated by LangGraph, powered by MongoDB — with durable human-in-the-loop review
        </Body>
        <div style={{ display: 'flex', gap: 6, marginTop: spacing[2], flexWrap: 'wrap' }}>
          <Badge variant="blue">LangGraph</Badge>
          <Badge variant="green">MongoDB</Badge>
          <Badge variant="red">Human-in-the-Loop</Badge>
          <Badge variant="purple">Claude on Bedrock</Badge>
          <Badge variant="yellow">Atlas Search RAG</Badge>
        </div>
      </div>

      {/* Hero Stats */}
      <HeroStats />

      {/* Tabbed content */}
      <Tabs
        selected={selectedTab}
        setSelected={setSelectedTab}
        aria-label="Pipeline information"
      >
        <Tab name="Agent Pipeline">
          <AgentPipelineTab onNavigate={navigate} />
        </Tab>
        <Tab name="LangGraph Features">
          <LangGraphTab highlightedItem={highlightedItem} registerRef={registerRef} />
        </Tab>
        <Tab name="Human-in-the-Loop">
          <HITLTab />
        </Tab>
        <Tab name="MongoDB">
          <MongoDBTab highlightedItem={highlightedItem} registerRef={registerRef} />
        </Tab>
      </Tabs>
    </div>
  );
}
