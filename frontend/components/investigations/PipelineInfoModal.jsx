"use client";

import React, { useState } from 'react';
import Modal from '@leafygreen-ui/modal';
import { Tabs, Tab } from '@leafygreen-ui/tabs';
import Button from '@leafygreen-ui/button';
import Badge from '@leafygreen-ui/badge';
import Icon from '@leafygreen-ui/icon';
import { Body, Subtitle } from '@leafygreen-ui/typography';
import { palette } from '@leafygreen-ui/palette';
import { spacing } from '@leafygreen-ui/tokens';
import { uiTokens } from './investigationTokens';

const FONT = uiTokens.font;
const MONO = uiTokens.monoFont;

// ---------------------------------------------------------------------------
// Data: Pipeline Agents
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
      },
      {
        number: 3, name: 'Case Analyst', glyph: 'Folder',
        color: palette.green.dark1, type: 'LLM + RAG', typeBg: palette.green.light3, typeColor: palette.green.dark2,
        role: '360° profile synthesis + crime typology classification',
        detail: 'Single LLM call produces CaseFile + TypologyResult. RAG retrieval from typology_library via Atlas Search.',
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
      },
      {
        number: 5, name: 'Temporal Analyst', glyph: 'Clock',
        color: palette.yellow.dark2, type: 'MongoDB Query', typeBg: palette.yellow.light3, typeColor: palette.yellow.dark2,
        role: 'Time-series suspicious pattern detection',
        detail: 'Runs in parallel with Network Analyst. Uses $setWindowFields for structuring, velocity, round-trips, dormancy.',
      },
      {
        number: 6, name: 'Trail Follower', glyph: 'ArrowRight',
        color: palette.blue.dark2, type: 'LLM Agent', typeBg: palette.blue.light3, typeColor: palette.blue.dark2,
        role: 'Lead selection from converged network + temporal analysis',
        detail: 'Conditional LLM call — skipped for simple cases. Uses $graphLookup to trace ownership chains.',
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
      },
      {
        number: 9, name: 'Compliance QA', glyph: 'Checkmark',
        color: palette.blue.dark1, type: 'LLM Judge', typeBg: palette.blue.light3, typeColor: palette.blue.dark2,
        role: 'Hallucination prevention + regulatory compliance gate',
        detail: 'Validates completeness, factual accuracy, citations. Command routing to re-draft, escalate, or approve.',
      },
      {
        number: 10, name: 'Human Review', glyph: 'Visibility',
        color: palette.red.base, type: 'HITL', typeBg: palette.red.light3, typeColor: palette.red.dark2,
        role: 'Durable analyst pause/resume checkpoint',
        detail: 'interrupt_before halts pipeline. Full state saved to MongoDBSaver. Analyst approves, rejects, or requests changes.',
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
      },
      {
        number: 12, name: 'Chat Co-Pilot', glyph: 'Sparkle',
        color: palette.blue.base, type: 'ReAct Agent', typeBg: palette.blue.light3, typeColor: palette.blue.dark2,
        role: 'Conversational investigation assistant with 15 tools',
        detail: 'create_react_agent from LangGraph prebuilt. Supports artifacts: Markdown reports, Mermaid diagrams, HTML dashboards.',
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Data: LangGraph Features
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
  },
  {
    title: 'Parallel Execution',
    features: [
      { name: 'Send API', desc: 'Fan-out dispatcher spawning concurrent workers with independent state slices', where: 'Data Gathering (4×), Sub-Investigations (N×)' },
      { name: 'Parallel edges + join', desc: 'Network + Temporal analysts run concurrently; Trail Follower waits for both', where: 'Analysis stage' },
    ],
  },
  {
    title: 'LLM Integration',
    features: [
      { name: 'with_structured_output()', desc: 'Type-safe Pydantic model outputs on all 6 LLM-calling nodes', where: 'Triage, Case Analyst, Trail Follower, etc.' },
      { name: 'ChatBedrockConverse', desc: 'Claude model via AWS Bedrock with singleton pattern and retry wrapper', where: 'All LLM calls' },
      { name: 'create_react_agent', desc: 'Prebuilt ReAct loop with 15 tools for conversational investigation', where: 'Chat Co-Pilot' },
      { name: '@tool decorators', desc: '13+ MongoDB-backed tool functions callable by agents', where: 'Entity, transaction, network, policy tools' },
    ],
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
// ---------------------------------------------------------------------------

const MONGODB_FEATURES = [
  { name: '$graphLookup', desc: 'Recursive network traversal across relationship collections. Powers entity network analysis, shell structure detection, and ownership chain tracing.', agent: 'Network Analyst, Trail Follower' },
  { name: '$setWindowFields', desc: 'Sliding-window analytics on time-series transaction data. Detects structuring, velocity anomalies, round-trip patterns, and dormancy bursts.', agent: 'Temporal Analyst' },
  { name: '$facet', desc: 'Multi-dimensional analytics aggregation in a single pipeline — status distribution, typology counts, risk stats, and 7-day trends.', agent: 'Analytics Dashboard' },
  { name: 'Atlas Search', desc: 'Full-text + vector search powering RAG retrieval from typology_library (12 typologies) and compliance_policies (6 policies).', agent: 'Case Analyst, SAR Author' },
  { name: 'Change Streams', desc: 'Real-time event triggers — watches alerts collection for new inserts, automatically kicks off triage pipeline. Also powers live UI updates.', agent: 'Pipeline Entry Point' },
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

function AgentCard({ agent }) {
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
        <div style={{ fontSize: 10, color: palette.gray.base, fontFamily: FONT, lineHeight: 1.4 }}>
          {agent.detail}
        </div>
      </div>
    </div>
  );
}

function FeatureRow({ feature, isLast = false }) {
  return (
    <div style={{
      display: 'flex', gap: 12, padding: '6px 0',
      borderBottom: isLast ? 'none' : `1px solid ${palette.gray.light3}`,
      alignItems: 'flex-start',
    }}>
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

function MongoFeatureCard({ feature }) {
  return (
    <div style={{
      padding: '12px 14px', borderRadius: 6,
      background: '#fff',
      border: `1px solid ${uiTokens.borderDefault}`,
      borderLeft: `3px solid ${palette.green.dark1}`,
    }}>
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
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab Panels
// ---------------------------------------------------------------------------

function AgentPipelineTab() {
  return (
    <div style={{ padding: `${spacing[2]}px 0` }}>
      <Body style={{ fontSize: 12, fontFamily: FONT, color: palette.gray.dark1, marginBottom: spacing[2] }}>
        12 specialized agents orchestrated by LangGraph StateGraph — from alert triage to SAR filing.
      </Body>
      {PIPELINE_STAGES.map((stage) => (
        <div key={stage.stage}>
          <SectionHeader>{stage.stage}</SectionHeader>
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: spacing[2], marginBottom: spacing[1],
          }}>
            {stage.agents.map((agent) => (
              <AgentCard key={agent.number} agent={agent} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function LangGraphTab() {
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
              <FeatureRow key={f.name} feature={f} isLast={idx === section.features.length - 1} />
            ))}
          </div>
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

function MongoDBTab() {
  return (
    <div style={{ padding: `${spacing[2]}px 0` }}>
      <Body style={{ fontSize: 12, fontFamily: FONT, color: palette.gray.dark1, marginBottom: spacing[2] }}>
        MongoDB capabilities powering the investigation pipeline — from graph traversal to durable checkpointing.
      </Body>
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
        gap: spacing[2],
      }}>
        {MONGODB_FEATURES.map((f) => (
          <MongoFeatureCard key={f.name} feature={f} />
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Export
// ---------------------------------------------------------------------------

export default function PipelineInfoButton() {
  const [open, setOpen] = useState(false);
  const [selectedTab, setSelectedTab] = useState(0);

  return (
    <>
      <Button
        size="small"
        variant="default"
        leftGlyph={<Icon glyph="InfoWithCircle" />}
        onClick={() => setOpen(true)}
        style={{ fontFamily: FONT }}
      >
        Pipeline Architecture
      </Button>

      <Modal
        open={open}
        setOpen={(nextOpen) => {
          setOpen(nextOpen);
          if (!nextOpen) setSelectedTab(0);
        }}
        size="large"
      >
        <div style={{ padding: `0 ${spacing[2]}px ${spacing[3]}px` }}>
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

          {/* Tabbed content */}
          <Tabs
            selected={selectedTab}
            setSelected={setSelectedTab}
            aria-label="Pipeline information"
          >
            <Tab name="Agent Pipeline">
              <AgentPipelineTab />
            </Tab>
            <Tab name="LangGraph Features">
              <LangGraphTab />
            </Tab>
            <Tab name="Human-in-the-Loop">
              <HITLTab />
            </Tab>
            <Tab name="MongoDB">
              <MongoDBTab />
            </Tab>
          </Tabs>
        </div>
      </Modal>
    </>
  );
}
