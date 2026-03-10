"use client";

import { useState } from 'react';
import Card from '@leafygreen-ui/card';
import Badge from '@leafygreen-ui/badge';
import { Body, Subtitle, H3 } from '@leafygreen-ui/typography';
import Banner from '@leafygreen-ui/banner';
import Callout from '@leafygreen-ui/callout';
import ExpandableCard from '@leafygreen-ui/expandable-card';
import Code from '@leafygreen-ui/code';
import Icon from '@leafygreen-ui/icon';
import { palette } from '@leafygreen-ui/palette';
import { spacing } from '@leafygreen-ui/tokens';

const FONT = "'Euclid Circular A', sans-serif";

const DETAIL_TABS = [
  { key: 'summary', label: 'Summary' },
  { key: 'evidence', label: 'Evidence' },
  { key: 'narrative', label: 'Narrative' },
  { key: 'audit', label: 'Audit Trail' },
];

const AGENT_COLORS = {
  triage: palette.blue.base,
  data_gathering: palette.purple.base,
  data_gathering_dispatch: palette.purple.base,
  fetch_entity_profile: palette.purple.light1,
  fetch_transactions: palette.purple.light1,
  fetch_network: palette.purple.light1,
  fetch_watchlist: palette.purple.light1,
  assemble_case: palette.green.dark1,
  network_analyst: palette.yellow.dark2,
  temporal_analyst: palette.yellow.dark2,
  trail_follower: palette.blue.dark2,
  sub_investigation_dispatch: palette.purple.base,
  narrative: palette.green.base,
  validation: palette.blue.dark1,
  human_review: palette.red.base,
  finalize: palette.green.dark2,
  auto_close: palette.gray.dark1,
};

function getRiskLevel(score) {
  if (score >= 75) return { label: 'Critical', color: palette.red.base, bg: palette.red.light3 };
  if (score >= 50) return { label: 'High', color: palette.red.dark1, bg: palette.red.light3 };
  if (score >= 25) return { label: 'Moderate', color: palette.yellow.dark2, bg: palette.yellow.light3 };
  return { label: 'Low', color: palette.green.dark1, bg: palette.green.light3 };
}

export default function InvestigationDetail({ investigation }) {
  const [activeTab, setActiveTab] = useState('summary');

  if (!investigation) {
    return (
      <Card style={{ padding: spacing[5], textAlign: 'center' }}>
        <Body style={{ color: palette.gray.dark1, fontFamily: FONT }}>
          Select an investigation from the list to view details.
        </Body>
      </Card>
    );
  }

  const {
    case_id,
    created_at,
    entity_id,
    investigation_status,
    alert_data,
    triage_decision,
    case_file,
    typology,
    network_analysis,
    temporal_analysis,
    trail_analysis,
    sub_investigation_findings,
    narrative,
    validation_result,
    human_decision,
    agent_audit_log,
    tool_trace_log,
    pipeline_metrics,
  } = investigation;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[3] }}>
      {/* Header */}
      <Card style={{ padding: spacing[3], border: `1px solid ${palette.gray.light2}` }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginBottom: spacing[2],
        }}>
          <H3 style={{ fontFamily: FONT, margin: 0 }}>{case_id}</H3>
          <StatusBadgeDetail status={investigation_status} />
        </div>
        <div style={{ display: 'flex', gap: spacing[4], flexWrap: 'wrap' }}>
          <InfoPair label="Entity" value={investigation.entity_name || case_file?.entity?.name || entity_id || alert_data?.entity_id} />
          <InfoPair label="Alert Type" value={alert_data?.alert_type} />
          <InfoPair label="Created" value={created_at ? new Date(created_at).toLocaleString() : 'N/A'} />
          {triage_decision?.risk_score !== undefined && (
            <InfoPair label="Risk Score" value={triage_decision.risk_score} color={getRiskLevel(triage_decision.risk_score).color} />
          )}
        </div>
      </Card>

      {/* Tab Navigation */}
      <div style={{
        display: 'flex', gap: 0,
        borderBottom: `2px solid ${palette.gray.light2}`,
      }}>
        {DETAIL_TABS.map(tab => {
          const isActive = activeTab === tab.key;
          const hasContent = tab.key === 'summary' || tab.key === 'audit'
            || (tab.key === 'evidence' && (case_file || network_analysis || typology))
            || (tab.key === 'narrative' && narrative?.introduction);
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                padding: '10px 20px',
                fontFamily: FONT,
                fontSize: 13,
                fontWeight: isActive ? 600 : 400,
                color: isActive ? palette.green.dark2 : palette.gray.dark1,
                background: 'transparent',
                border: 'none',
                borderBottom: isActive ? `2px solid ${palette.green.dark2}` : '2px solid transparent',
                marginBottom: -2,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                opacity: hasContent ? 1 : 0.5,
              }}
            >
              {tab.label}
              {tab.key === 'audit' && agent_audit_log?.length > 0 && (
                <span style={{
                  marginLeft: 6, fontSize: 10, padding: '1px 5px', borderRadius: 8,
                  background: palette.gray.light2, color: palette.gray.dark1,
                }}>
                  {agent_audit_log.length}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {activeTab === 'summary' && (
        <SummaryTab
          triage={triage_decision}
          typology={typology}
          validation={validation_result}
          humanDecision={human_decision}
          networkAnalysis={network_analysis}
          temporalAnalysis={temporal_analysis}
          trailAnalysis={trail_analysis}
          subInvestigationFindings={sub_investigation_findings}
        />
      )}

      {activeTab === 'evidence' && (
        <EvidenceTab
          caseFile={case_file}
          typology={typology}
          networkAnalysis={network_analysis}
          temporalAnalysis={temporal_analysis}
          trailAnalysis={trail_analysis}
          subFindings={sub_investigation_findings}
        />
      )}

      {activeTab === 'narrative' && (
        <NarrativeTab narrative={narrative} />
      )}

      {activeTab === 'audit' && (
        <AuditTab auditLog={agent_audit_log} toolTrace={tool_trace_log} metrics={pipeline_metrics} />
      )}

      {/* MongoDB Document Viewer */}
      <ExpandableCard
        title="View MongoDB Document"
        description="See the raw investigation document as stored in MongoDB"
        style={{ marginTop: spacing[1] }}
      >
        <div style={{
          padding: spacing[2], borderRadius: 6, marginBottom: spacing[2],
          background: palette.green.light3, border: `1px solid ${palette.green.light1}`,
          fontSize: 12, fontFamily: FONT, color: palette.green.dark2,
        }}>
          <strong>Schema Flexibility in Action:</strong> This single document contains the entire investigation lifecycle
          &mdash; nested triage decisions, variable-length evidence arrays, dynamic typology fields, and the full audit
          trail. No rigid table schemas, no migrations, no 15-table JOIN to reconstruct.
        </div>
        <Code language="json" style={{ maxHeight: 500, overflow: 'auto' }}>
          {JSON.stringify(investigation, null, 2)}
        </Code>
      </ExpandableCard>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Summary Tab
// ---------------------------------------------------------------------------

function SummaryTab({ triage, typology, validation, humanDecision, networkAnalysis, temporalAnalysis, trailAnalysis, subInvestigationFindings }) {
  const riskScore = triage?.risk_score;
  const risk = riskScore != null ? getRiskLevel(riskScore) : null;
  const conf = typology?.confidence;
  const confPct = conf != null ? Math.round(conf * 100) : null;
  const [expandedReasoning, setExpandedReasoning] = useState(false);
  const triageReasoning = triage?.reasoning || '';
  const truncateReasoning = triageReasoning.length > 200;
  const hasAnalysis = (networkAnalysis?.network_size > 0) || temporalAnalysis?.timeline_summary || (trailAnalysis?.leads?.length > 0);
  const hasValidationOrDecision = validation || (humanDecision && Object.keys(humanDecision).length > 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[3] }}>
      {/* Hero Banner: Risk + Typology */}
      {(risk || typology?.primary_typology) && (
        <Card style={{
          padding: spacing[4],
          border: `1px solid ${palette.gray.light2}`,
          borderLeft: risk ? `4px solid ${risk.color}` : undefined,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing[4], flexWrap: 'wrap' }}>
            {risk && (
              <div style={{ display: 'flex', alignItems: 'center', gap: spacing[3] }}>
                <div style={{
                  width: 64, height: 64, borderRadius: '50%',
                  border: `4px solid ${risk.color}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: '#fff', flexShrink: 0,
                }}>
                  <span style={{ fontSize: 24, fontWeight: 700, fontFamily: FONT, color: risk.color }}>
                    {riskScore}
                  </span>
                </div>
                <div>
                  <span style={{
                    fontSize: 12, padding: '3px 10px', borderRadius: 4,
                    background: risk.bg, color: risk.color, fontFamily: FONT, fontWeight: 600,
                    display: 'inline-block', marginBottom: 6,
                  }}>
                    {risk.label} Risk
                  </span>
                  {triage?.disposition && (
                    <div>
                      <Badge variant={triage.disposition === 'auto_close' ? 'lightgray' : 'blue'}>
                        {triage.disposition}
                      </Badge>
                    </div>
                  )}
                </div>
              </div>
            )}

            {typology?.primary_typology && (
              <div style={{ textAlign: risk ? 'right' : 'left' }}>
                <div style={{ fontSize: 11, color: palette.gray.base, fontFamily: FONT, textTransform: 'uppercase', marginBottom: 6, letterSpacing: '0.5px' }}>
                  Typology
                </div>
                <Badge variant="yellow">{typology.primary_typology}</Badge>
                {confPct !== null && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: risk ? 'flex-end' : 'flex-start', marginTop: 8 }}>
                    <div style={{ width: 80, height: 6, borderRadius: 3, background: palette.gray.light2, overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', borderRadius: 3, width: `${confPct}%`,
                        background: confPct > 70 ? palette.green.dark1 : palette.yellow.base,
                      }} />
                    </div>
                    <span style={{ fontSize: 12, fontFamily: FONT, fontWeight: 600 }}>{confPct}%</span>
                  </div>
                )}
                {typology.red_flags?.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 8, justifyContent: risk ? 'flex-end' : 'flex-start' }}>
                    {typology.red_flags.map((flag, i) => (
                      <span key={i} style={{
                        fontSize: 10, fontFamily: FONT, padding: '2px 6px',
                        borderRadius: 3, background: palette.red.light3, color: palette.red.dark2,
                      }}>
                        {flag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {triageReasoning && (
            <div style={{ marginTop: spacing[3], paddingTop: spacing[2], borderTop: `1px solid ${palette.gray.light2}` }}>
              <Body style={{ fontSize: '12px', fontFamily: FONT, color: palette.gray.dark1, lineHeight: 1.6 }}>
                {truncateReasoning && !expandedReasoning
                  ? <>{triageReasoning.slice(0, 200)}...{' '}
                      <span
                        onClick={() => setExpandedReasoning(true)}
                        style={{ color: palette.blue.base, cursor: 'pointer', fontWeight: 500 }}
                      >Read more</span>
                    </>
                  : triageReasoning
                }
                {truncateReasoning && expandedReasoning && (
                  <span
                    onClick={() => setExpandedReasoning(false)}
                    style={{ color: palette.blue.base, cursor: 'pointer', fontWeight: 500, marginLeft: 4 }}
                  >Show less</span>
                )}
              </Body>
            </div>
          )}

          {typology?.reasoning && typology.reasoning !== triageReasoning && (
            <Body style={{ fontSize: '12px', fontFamily: FONT, color: palette.gray.dark1, lineHeight: 1.6, marginTop: spacing[1] }}>
              {typology.reasoning}
            </Body>
          )}
        </Card>
      )}

      {/* Analysis Strips: Network / Temporal / Trail in one compact card */}
      {hasAnalysis && (
        <Card style={{ padding: 0, border: `1px solid ${palette.gray.light2}`, overflow: 'hidden' }}>
          <div style={{ padding: `${spacing[2]}px ${spacing[3]}px`, borderBottom: `1px solid ${palette.gray.light2}`, background: palette.gray.light3 }}>
            <Subtitle style={{ fontFamily: FONT, fontSize: '13px', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px', color: palette.gray.dark1 }}>
              Analysis
            </Subtitle>
          </div>

          {networkAnalysis && networkAnalysis.network_size > 0 && (
            <div style={{
              padding: `${spacing[2]}px ${spacing[3]}px`,
              borderBottom: (temporalAnalysis?.timeline_summary || trailAnalysis?.leads?.length > 0) ? `1px solid ${palette.gray.light2}` : 'none',
            }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: spacing[3], flexWrap: 'wrap' }}>
                <span style={{ fontSize: 12, fontWeight: 600, fontFamily: FONT, color: palette.blue.dark2, minWidth: 70 }}>Network</span>
                <MetricInline label="Size" value={networkAnalysis.network_size} />
                <MetricInline label="High-Risk" value={networkAnalysis.high_risk_connections} />
                <MetricInline label="Centrality" value={networkAnalysis.degree_centrality?.toFixed(3)} />
                <MetricInline label="Risk" value={networkAnalysis.network_risk_score != null ? `${networkAnalysis.network_risk_score.toFixed(1)}/100` : undefined} />
              </div>
              {networkAnalysis.summary && (
                <Body style={{ fontSize: '12px', fontFamily: FONT, color: palette.gray.dark1, lineHeight: 1.5, marginTop: 4 }} title={networkAnalysis.summary}>
                  {networkAnalysis.summary.length > 140 ? networkAnalysis.summary.slice(0, 140) + '...' : networkAnalysis.summary}
                </Body>
              )}
            </div>
          )}

          {temporalAnalysis && temporalAnalysis.timeline_summary && (
            <div style={{
              padding: `${spacing[2]}px ${spacing[3]}px`,
              borderBottom: trailAnalysis?.leads?.length > 0 ? `1px solid ${palette.gray.light2}` : 'none',
            }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: spacing[3], flexWrap: 'wrap' }}>
                <span style={{ fontSize: 12, fontWeight: 600, fontFamily: FONT, color: palette.yellow.dark2, minWidth: 70 }}>Temporal</span>
                <MetricInline label="Structuring" value={temporalAnalysis.structuring_indicators?.length || 0} />
                <MetricInline label="Velocity" value={temporalAnalysis.velocity_anomalies?.length || 0} />
                <MetricInline label="Round-Trips" value={temporalAnalysis.round_trip_patterns?.length || 0} />
                <MetricInline label="Dormancy" value={temporalAnalysis.dormancy_bursts?.length || 0} />
              </div>
              <Body style={{ fontSize: '12px', fontFamily: FONT, color: palette.gray.dark1, lineHeight: 1.5, marginTop: 4 }} title={temporalAnalysis.timeline_summary}>
                {temporalAnalysis.timeline_summary.length > 140 ? temporalAnalysis.timeline_summary.slice(0, 140) + '...' : temporalAnalysis.timeline_summary}
              </Body>
            </div>
          )}

          {trailAnalysis && trailAnalysis.leads?.length > 0 && (
            <div style={{ padding: `${spacing[2]}px ${spacing[3]}px` }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: spacing[3], flexWrap: 'wrap' }}>
                <span style={{ fontSize: 12, fontWeight: 600, fontFamily: FONT, color: palette.green.dark2, minWidth: 70 }}>Trail</span>
                <MetricInline label="Leads" value={trailAnalysis.leads.length} />
                <MetricInline label="Ownership" value={trailAnalysis.ownership_chains?.length || 0} />
                <MetricInline label="Shells" value={trailAnalysis.shell_patterns?.length || 0} />
              </div>
              {trailAnalysis.shell_patterns?.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                  {trailAnalysis.shell_patterns.map((p, i) => (
                    <span key={i} style={{
                      fontSize: 10, fontFamily: FONT, padding: '2px 6px',
                      borderRadius: 3, background: palette.red.light3, color: palette.red.dark2,
                    }}>{p}</span>
                  ))}
                </div>
              )}
              {trailAnalysis.summary && (
                <Body style={{ fontSize: '12px', fontFamily: FONT, color: palette.gray.dark1, lineHeight: 1.5, marginTop: 4 }} title={trailAnalysis.summary}>
                  {trailAnalysis.summary.length > 140 ? trailAnalysis.summary.slice(0, 140) + '...' : trailAnalysis.summary}
                </Body>
              )}
            </div>
          )}
        </Card>
      )}

      {/* Validation + Decision side-by-side with accent borders */}
      {hasValidationOrDecision && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: validation && humanDecision && Object.keys(humanDecision).length > 0 ? '1fr 1fr' : '1fr',
          gap: spacing[2],
        }}>
          {validation && (
            <Card style={{
              padding: spacing[3],
              border: `1px solid ${palette.gray.light2}`,
              borderLeft: `3px solid ${validation.is_valid ? palette.green.dark1 : palette.yellow.dark2}`,
            }}>
              <div style={{ fontSize: 11, color: palette.gray.base, fontFamily: FONT, textTransform: 'uppercase', marginBottom: 6, letterSpacing: '0.5px' }}>
                Validation
              </div>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 6 }}>
                <Badge variant={validation.is_valid ? 'green' : 'yellow'}>
                  {validation.is_valid ? 'Passed' : 'Issues Found'}
                </Badge>
                {validation.score != null && (
                  <span style={{ fontSize: 14, fontFamily: FONT, fontWeight: 600 }}>
                    {Math.round(validation.score * 100)}%
                  </span>
                )}
              </div>
              {validation.issues?.length > 0 && (
                <ul style={{ margin: 0, paddingLeft: 16 }}>
                  {validation.issues.map((issue, i) => (
                    <li key={i} style={{ fontSize: 13, fontFamily: FONT, color: palette.yellow.dark2, lineHeight: 1.6 }}>
                      {issue}
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          )}

          {humanDecision && Object.keys(humanDecision).length > 0 && (
            <Card style={{
              padding: spacing[3],
              border: `1px solid ${palette.gray.light2}`,
              borderLeft: `3px solid ${
                humanDecision.decision === 'approve' ? palette.green.dark1
                : humanDecision.decision === 'reject' ? palette.red.base
                : palette.blue.base
              }`,
            }}>
              <div style={{ fontSize: 11, color: palette.gray.base, fontFamily: FONT, textTransform: 'uppercase', marginBottom: 6, letterSpacing: '0.5px' }}>
                Analyst Decision
              </div>
              <Badge variant={humanDecision.decision === 'approve' ? 'green' : humanDecision.decision === 'reject' ? 'red' : 'blue'}>
                {humanDecision.decision}
              </Badge>
              {humanDecision.analyst_notes && (
                <Body style={{ fontSize: '13px', fontFamily: FONT, color: palette.gray.dark1, marginTop: 8, lineHeight: 1.6 }}>
                  {humanDecision.analyst_notes}
                </Body>
              )}
            </Card>
          )}
        </div>
      )}

      {/* Sub-Investigations: derived from raw findings */}
      {subInvestigationFindings && Object.keys(subInvestigationFindings).length > 0 && (() => {
        const entries = Object.values(subInvestigationFindings);
        const highRisk = entries.filter(e => e.risk_level === 'high' || e.risk_level === 'critical');
        return (
          <Card style={{ padding: spacing[3], border: `1px solid ${palette.gray.light2}` }}>
            <div style={{ fontSize: 11, color: palette.gray.base, fontFamily: FONT, textTransform: 'uppercase', marginBottom: 8, letterSpacing: '0.5px' }}>
              Sub-Investigations
            </div>
            <div style={{ display: 'flex', gap: spacing[4], flexWrap: 'wrap', marginBottom: spacing[2] }}>
              <InfoPair label="Leads Investigated" value={entries.length} />
              <InfoPair label="High-Risk Leads" value={highRisk.length} />
            </div>
            {highRisk.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: spacing[2] }}>
                {highRisk.flatMap(e => e.red_flags || []).map((f, i) => (
                  <span key={i} style={{
                    fontSize: 11, fontFamily: FONT, padding: '2px 8px',
                    borderRadius: 3, background: palette.red.light3, color: palette.red.dark2,
                  }}>{f}</span>
                ))}
              </div>
            )}
          </Card>
        );
      })()}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Evidence Tab
// ---------------------------------------------------------------------------

function EvidenceTab({ caseFile, typology, networkAnalysis, temporalAnalysis, trailAnalysis, subFindings }) {
  if (!caseFile && !networkAnalysis) {
    return (
      <Card style={{ padding: spacing[4], textAlign: 'center' }}>
        <Body style={{ color: palette.gray.dark1, fontFamily: FONT }}>No evidence data available for this investigation.</Body>
      </Card>
    );
  }

  const entity = caseFile?.entity;
  const txns = caseFile?.transactions;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[3] }}>
      {/* KPI Strip */}
      {(entity || txns || networkAnalysis) && (
        <div style={{ display: 'flex', gap: spacing[2], flexWrap: 'wrap' }}>
          {entity?.name && <MetricCard label="Entity" value={entity.name} />}
          {entity?.risk_score != null && <MetricCard label="Risk Score" value={entity.risk_score} />}
          {txns?.total_count != null && <MetricCard label="Transactions" value={txns.total_count} />}
          {txns?.total_volume != null && <MetricCard label="Volume" value={`$${txns.total_volume.toLocaleString()}`} />}
          {networkAnalysis?.network_size > 0 && <MetricCard label="Network Size" value={networkAnalysis.network_size} />}
          {networkAnalysis?.high_risk_connections > 0 && <MetricCard label="High-Risk Links" value={networkAnalysis.high_risk_connections} />}
        </div>
      )}

      {/* Network Analysis */}
      {networkAnalysis && networkAnalysis.network_size > 0 && (
        <Section title="Network Analysis" icon="Diagram2" accentColor={palette.blue.dark1}>
          <div style={{ display: 'flex', gap: spacing[4], flexWrap: 'wrap', marginBottom: spacing[2] }}>
            <InfoPair label="Network Size" value={networkAnalysis.network_size} />
            <InfoPair label="High-Risk Connections" value={networkAnalysis.high_risk_connections} />
            <InfoPair label="Max Depth" value={networkAnalysis.max_depth_reached} />
            <InfoPair label="Degree Centrality" value={networkAnalysis.degree_centrality?.toFixed(3)} />
            <InfoPair label="Network Risk" value={networkAnalysis.network_risk_score != null ? `${networkAnalysis.network_risk_score.toFixed(1)}/100` : undefined} />
          </div>
          {networkAnalysis.shell_structure_indicators?.length > 0 && (
            <div style={{ marginBottom: spacing[2] }}>
              <Body style={{ fontWeight: 600, fontSize: '13px', fontFamily: FONT, marginBottom: spacing[1] }}>
                Shell Structure Indicators
              </Body>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {networkAnalysis.shell_structure_indicators.map((ind, i) => (
                  <Badge key={i} variant="red">{ind}</Badge>
                ))}
              </div>
            </div>
          )}
          {networkAnalysis.summary && (
            <Body style={{ fontSize: '13px', fontFamily: FONT, color: palette.gray.dark1, lineHeight: 1.6 }}>
              {networkAnalysis.summary}
            </Body>
          )}
        </Section>
      )}

      {/* Temporal Pattern Analysis: summary + top-3 per type */}
      {temporalAnalysis && temporalAnalysis.timeline_summary && (
        <Section title="Temporal Pattern Analysis" icon="Clock" accentColor={palette.yellow.dark2}>
          <Body style={{ fontSize: '14px', fontFamily: FONT, color: palette.gray.dark1, lineHeight: 1.7, marginBottom: spacing[2] }}>
            {temporalAnalysis.timeline_summary}
          </Body>

          <PatternGroup
            title="Structuring Patterns"
            items={temporalAnalysis.structuring_indicators}
            colorBg={palette.red.light3}
            colorText={palette.red.dark2}
            renderItem={(s) => `${s.date}: ${s.count} transactions totalling $${s.total?.toLocaleString()}`}
          />
          <PatternGroup
            title="Velocity Spikes"
            items={temporalAnalysis.velocity_anomalies}
            colorBg={palette.yellow.light3}
            colorText={palette.yellow.dark2}
            renderItem={(v) => `${v.week}: ${v.transaction_count} txns (z-score: ${v.z_score}, baseline: ${v.baseline_avg})`}
          />
          <PatternGroup
            title="Round-Trip Fund Flows"
            items={temporalAnalysis.round_trip_patterns}
            colorBg={palette.red.light3}
            colorText={palette.red.dark2}
            renderItem={(r) => `${r.counterparty}: Out $${r.outgoing_amount?.toLocaleString()} → Return $${r.return_amount?.toLocaleString()}`}
          />
          <PatternGroup
            title="Dormancy-Burst Patterns"
            items={temporalAnalysis.dormancy_bursts}
            colorBg={palette.yellow.light3}
            colorText={palette.yellow.dark2}
            renderItem={(d) => `${d.dormancy_days} days dormant → ${d.burst_transaction_count} transactions ($${d.burst_volume?.toLocaleString()})`}
          />
        </Section>
      )}

      {/* Trail Leads: compact rows */}
      {trailAnalysis && trailAnalysis.leads?.length > 0 && (
        <Section title="Trail Analysis — Investigation Leads" icon="ArrowRight" accentColor={palette.green.dark2}>
          {trailAnalysis.summary && (
            <Body style={{ fontSize: '14px', fontFamily: FONT, color: palette.gray.dark1, lineHeight: 1.7, marginBottom: spacing[2] }}>
              {trailAnalysis.summary}
            </Body>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {trailAnalysis.leads.map((lead, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
                padding: '6px 10px', borderRadius: 4,
                background: lead.priority === 'high' ? palette.red.light3 : 'transparent',
                borderBottom: `1px solid ${palette.gray.light2}`,
              }}>
                <Badge variant={lead.priority === 'high' ? 'red' : lead.priority === 'medium' ? 'yellow' : 'lightgray'}>
                  {lead.priority}
                </Badge>
                <span style={{ fontSize: 13, fontWeight: 600, fontFamily: FONT }}>{lead.entity_name || lead.entity_id}</span>
                {lead.reason && (
                  <span style={{ fontSize: 12, fontFamily: FONT, color: palette.gray.dark1 }}>
                    — {lead.reason.length > 80 ? lead.reason.slice(0, 80) + '...' : lead.reason}
                  </span>
                )}
                {lead.risk_indicators?.length > 0 && lead.risk_indicators.map((ind, j) => (
                  <span key={j} style={{
                    fontSize: 10, fontFamily: FONT, padding: '1px 5px',
                    borderRadius: 3, background: palette.red.light3, color: palette.red.dark2,
                  }}>{ind}</span>
                ))}
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Sub-Investigation Findings: compact table rows */}
      {subFindings && Object.keys(subFindings).length > 0 && (
        <Section title="Sub-Investigation Findings" icon="Beaker">
          <div style={{ border: `1px solid ${palette.gray.light2}`, borderRadius: 6, overflow: 'hidden' }}>
            {Object.entries(subFindings).map(([entityId, assessment], idx) => (
              <div key={entityId} style={{
                padding: `${spacing[2]}px ${spacing[2]}px`,
                borderBottom: idx < Object.keys(subFindings).length - 1 ? `1px solid ${palette.gray.light2}` : 'none',
                background: assessment.risk_level === 'critical' ? palette.red.light3 : assessment.risk_level === 'high' ? '#fff5f5' : '#fff',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: assessment.key_findings?.length > 0 ? 6 : 0 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, fontFamily: FONT }}>
                    {assessment.entity_name || entityId}
                  </span>
                  <Badge variant={assessment.risk_level === 'critical' || assessment.risk_level === 'high' ? 'red' : assessment.risk_level === 'medium' ? 'yellow' : 'green'}>
                    {assessment.risk_level} ({assessment.risk_score})
                  </Badge>
                  <Badge variant={
                    assessment.recommendation === 'escalate' || assessment.recommendation === 'investigate_further' ? 'red'
                    : assessment.recommendation === 'monitor' ? 'yellow' : 'lightgray'
                  }>
                    {assessment.recommendation}
                  </Badge>
                  {assessment.watchlist_hits > 0 && (
                    <Badge variant="red">{assessment.watchlist_hits} watchlist hit{assessment.watchlist_hits > 1 ? 's' : ''}</Badge>
                  )}
                  {assessment.red_flags?.length > 0 && assessment.red_flags.map((flag, fi) => (
                    <span key={fi} style={{
                      fontSize: 10, fontFamily: FONT, padding: '1px 5px',
                      borderRadius: 3, background: palette.red.light3, color: palette.red.dark2,
                    }}>{flag}</span>
                  ))}
                </div>
                {assessment.key_findings?.length > 0 && (
                  <ul style={{ margin: 0, paddingLeft: 16 }}>
                    {assessment.key_findings.map((f, i) => (
                      <li key={i} style={{ fontSize: 13, fontFamily: FONT, lineHeight: 1.6 }}>{f}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Key Findings */}
      {caseFile?.key_findings?.length > 0 && (
        <Section title="Key Findings" icon="ImportantWithCircle" accentColor={palette.green.dark1}>
          <ul style={{ margin: 0, paddingLeft: spacing[3] }}>
            {caseFile.key_findings.map((finding, i) => (
              <li key={i}>
                <Body style={{ fontSize: '14px', fontFamily: FONT, lineHeight: 1.7 }}>{finding}</Body>
              </li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Narrative Tab
// ---------------------------------------------------------------------------

function NarrativeTab({ narrative }) {
  const [copied, setCopied] = useState(false);

  if (!narrative?.introduction) {
    return (
      <Card style={{ padding: spacing[4], textAlign: 'center' }}>
        <Body style={{ color: palette.gray.dark1, fontFamily: FONT }}>No narrative generated for this investigation.</Body>
      </Card>
    );
  }

  const handleCopy = () => {
    const text = [narrative.introduction, narrative.body, narrative.conclusion].filter(Boolean).join('\n\n');
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <Card style={{ padding: spacing[4], border: `1px solid ${palette.gray.light2}` }}>
      {/* Document header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing[3], paddingBottom: spacing[2], borderBottom: `1px solid ${palette.gray.light2}` }}>
        <H3 style={{ fontFamily: FONT, margin: 0, fontSize: 18 }}>SAR Narrative</H3>
        <button
          onClick={handleCopy}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '6px 12px', borderRadius: 4, border: `1px solid ${palette.gray.light2}`,
            background: copied ? palette.green.light3 : '#fff',
            color: copied ? palette.green.dark2 : palette.gray.dark1,
            fontSize: 12, fontFamily: FONT, cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          <Icon glyph="Copy" size={14} />
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>

      {/* Introduction — accented left border */}
      {narrative.introduction && (
        <div style={{
          borderLeft: `3px solid ${palette.green.dark1}`,
          paddingLeft: spacing[3],
          marginBottom: spacing[4],
        }}>
          <Body style={{
            fontSize: '15px', fontFamily: FONT, lineHeight: '1.7',
            color: palette.gray.dark2, whiteSpace: 'pre-wrap',
          }}>
            {narrative.introduction}
          </Body>
        </div>
      )}

      {/* Body */}
      {narrative.body && (
        <div style={{ marginBottom: spacing[4] }}>
          <Body style={{
            fontSize: '14px', fontFamily: FONT, lineHeight: '1.7',
            color: palette.gray.dark2, whiteSpace: 'pre-wrap',
          }}>
            {narrative.body}
          </Body>
        </div>
      )}

      {/* Conclusion — subtle separator + faint background */}
      {narrative.conclusion && (
        <div style={{
          borderTop: `1px solid ${palette.gray.light2}`,
          paddingTop: spacing[3],
          marginBottom: spacing[3],
          background: palette.green.light3,
          marginLeft: -spacing[4],
          marginRight: -spacing[4],
          paddingLeft: spacing[4],
          paddingRight: spacing[4],
          paddingBottom: spacing[3],
        }}>
          <Body style={{
            fontSize: '14px', fontFamily: FONT, lineHeight: '1.7',
            color: palette.gray.dark2, whiteSpace: 'pre-wrap',
          }}>
            {narrative.conclusion}
          </Body>
        </div>
      )}

      {/* Numbered footnote citations */}
      {narrative.cited_evidence?.length > 0 && (
        <div style={{ borderTop: `1px solid ${palette.gray.light2}`, paddingTop: spacing[2] }}>
          <Body style={{
            fontWeight: 600, fontSize: '12px', fontFamily: FONT, marginBottom: spacing[2],
            textTransform: 'uppercase', letterSpacing: '0.5px', color: palette.gray.dark1,
          }}>
            References
          </Body>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {narrative.cited_evidence.map((cite, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'baseline' }}>
                <span style={{
                  fontSize: 12, fontFamily: FONT, fontWeight: 600,
                  color: palette.blue.dark1, minWidth: 28, flexShrink: 0,
                }}>
                  [{i + 1}]
                </span>
                <span style={{
                  fontSize: 13, fontFamily: FONT, color: palette.gray.dark1, lineHeight: 1.6,
                }}>
                  {cite}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Audit Trail Tab (enhanced visual timeline with metrics)
// ---------------------------------------------------------------------------

function MetricCard({ label, value, sub }) {
  return (
    <div style={{
      padding: `${spacing[2]}px ${spacing[3]}px`,
      background: palette.gray.light3,
      borderRadius: 6,
      textAlign: 'center',
      minWidth: 100,
    }}>
      <div style={{ fontSize: 20, fontWeight: 700, fontFamily: FONT, color: palette.gray.dark2 }}>
        {value ?? '—'}
      </div>
      <div style={{ fontSize: 10, color: palette.gray.base, fontFamily: FONT, textTransform: 'uppercase', marginTop: 2 }}>
        {label}
      </div>
      {sub && <div style={{ fontSize: 10, color: palette.gray.dark1, fontFamily: FONT, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function ToolTraceRow({ trace }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div style={{
      borderRadius: 4,
      border: `1px solid ${palette.blue.light2}`,
      background: palette.blue.light3,
      fontSize: 11,
      fontFamily: FONT,
      marginBottom: 4,
    }}>
      <div
        onClick={() => setExpanded(!expanded)}
        style={{ padding: '4px 8px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
      >
        <span style={{ fontWeight: 600, color: palette.blue.dark1 }}>
          {trace.tool}
          {trace.agent && <span style={{ fontWeight: 400, color: palette.gray.base }}> ({trace.agent})</span>}
        </span>
        <span style={{ color: palette.gray.base }}>
          {expanded ? '▼' : '▶'}
        </span>
      </div>
      {expanded && (
        <div style={{ padding: '4px 8px 6px', borderTop: `1px solid ${palette.blue.light2}`, wordBreak: 'break-word' }}>
          {trace.input && (
            <div style={{ marginBottom: 4 }}>
              <span style={{ fontWeight: 600, color: palette.gray.dark1 }}>Input: </span>
              <span style={{ color: palette.gray.dark2 }}>
                {typeof trace.input === 'string' ? trace.input.slice(0, 400) : JSON.stringify(trace.input).slice(0, 400)}
              </span>
            </div>
          )}
          {trace.output && (
            <div>
              <span style={{ fontWeight: 600, color: palette.gray.dark1 }}>Output: </span>
              <span style={{ color: palette.gray.dark2 }}>
                {typeof trace.output === 'string' ? trace.output.slice(0, 400) : JSON.stringify(trace.output).slice(0, 400)}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function getAgentColor(agentName) {
  if (AGENT_COLORS[agentName]) return AGENT_COLORS[agentName];
  if (agentName?.startsWith('mini_investigate:')) return palette.purple.light1;
  return palette.gray.dark1;
}

function DurationBar({ entries }) {
  const filtered = entries.filter(e => e.duration_ms > 0);
  const totalMs = filtered.reduce((s, e) => s + (e.duration_ms || 0), 0) || 1;
  const fmtTotal = totalMs > 60000 ? `${(totalMs / 60000).toFixed(1)}m` : `${(totalMs / 1000).toFixed(1)}s`;

  return (
    <div>
      <div style={{
        display: 'flex', height: 22, borderRadius: 6, overflow: 'hidden',
        background: palette.gray.light2, position: 'relative',
      }}>
        {filtered.map((entry, i) => {
          const pct = Math.max((entry.duration_ms / totalMs) * 100, 2);
          const showLabel = pct > 10;
          const dur = entry.duration_ms > 1000
            ? `${(entry.duration_ms / 1000).toFixed(1)}s`
            : `${entry.duration_ms}ms`;
          return (
            <div key={i} style={{
              width: `${pct}%`,
              background: getAgentColor(entry.agent),
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              overflow: 'hidden', position: 'relative',
            }} title={`${entry.agent}: ${dur}`}>
              {showLabel && (
                <span style={{
                  fontSize: 8, color: '#fff', fontFamily: FONT, fontWeight: 600,
                  whiteSpace: 'nowrap', textShadow: '0 1px 2px rgba(0,0,0,0.3)',
                }}>
                  {entry.agent} {dur}
                </span>
              )}
            </div>
          );
        })}
      </div>
      <div style={{
        display: 'flex', justifyContent: 'space-between', marginTop: 4,
        fontSize: 9, fontFamily: FONT, color: palette.gray.base,
      }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {filtered.map((entry, i) => (
            <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              <span style={{
                width: 6, height: 6, borderRadius: '50%',
                background: getAgentColor(entry.agent),
                display: 'inline-block',
              }} />
              {entry.agent}
            </span>
          ))}
        </div>
        <span style={{ fontWeight: 600 }}>Total: {fmtTotal}</span>
      </div>
    </div>
  );
}

function AuditTab({ auditLog, toolTrace, metrics }) {
  if (!auditLog || auditLog.length === 0) {
    return (
      <Card style={{ padding: spacing[4], textAlign: 'center' }}>
        <Body style={{ color: palette.gray.dark1, fontFamily: FONT }}>No audit trail entries recorded.</Body>
      </Card>
    );
  }

  const totalDuration = metrics?.total_node_duration_ms;
  const formattedDuration = totalDuration != null
    ? totalDuration > 60000 ? `${(totalDuration / 60000).toFixed(1)}m` : `${(totalDuration / 1000).toFixed(1)}s`
    : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[2] }}>
      <Banner variant="success">
        <strong>Append-Only Audit Trail as Nested Array:</strong> Each agent node appends its audit entry to a
        single array within the investigation document. MongoDB&apos;s <code>$push</code> operator and flexible schema
        make this natural &mdash; no separate audit tables, no foreign keys, no JOIN to reconstruct the timeline.
      </Banner>

      {/* Metrics Summary */}
      {metrics && (
        <Card style={{ padding: spacing[3], border: `1px solid ${palette.gray.light2}` }}>
          <Subtitle style={{ fontFamily: FONT, marginBottom: spacing[2], fontSize: '14px' }}>
            Pipeline Metrics
          </Subtitle>
          <div style={{ display: 'flex', gap: spacing[2], flexWrap: 'wrap', marginBottom: spacing[2] }}>
            <MetricCard label="LLM Calls" value={metrics.llm_calls_count} />
            <MetricCard label="Tool Calls" value={metrics.tool_calls_count} />
            <MetricCard label="Nodes" value={auditLog.length} />
            {metrics.validation_loops > 0 && (
              <MetricCard label="Validation Loops" value={metrics.validation_loops} />
            )}
            {metrics.total_input_tokens > 0 && (
              <MetricCard label="Input Tokens" value={metrics.total_input_tokens.toLocaleString()} />
            )}
            {metrics.total_output_tokens > 0 && (
              <MetricCard label="Output Tokens" value={metrics.total_output_tokens.toLocaleString()} />
            )}
            {metrics.total_tokens > 0 && (
              <MetricCard label="Total Tokens" value={metrics.total_tokens.toLocaleString()} />
            )}
          </div>
        </Card>
      )}

      {/* Timeline */}
      <Card style={{ padding: spacing[3], border: `1px solid ${palette.gray.light2}` }}>
        <Subtitle style={{ fontFamily: FONT, marginBottom: spacing[3], fontSize: '14px' }}>
          Execution Timeline ({auditLog.length} entries)
        </Subtitle>
        <div style={{ maxHeight: 600, overflowY: 'auto' }}>
          {auditLog.map((entry, i) => {
            const agentColor = getAgentColor(entry.agent);
            const isHuman = entry.agent === 'human_review';
            const isLast = i === auditLog.length - 1;

            return (
              <div key={i} style={{ display: 'flex', minHeight: 44 }}>
                {/* Timeline rail */}
                <div style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  width: 32, flexShrink: 0,
                }}>
                  <div style={{
                    width: isHuman ? 14 : 10,
                    height: isHuman ? 14 : 10,
                    borderRadius: '50%',
                    background: agentColor,
                    flexShrink: 0,
                    marginTop: 6,
                    border: isHuman ? `2px solid ${palette.yellow.base}` : 'none',
                  }} />
                  {!isLast && (
                    <div style={{
                      flex: 1, width: 2, background: palette.gray.light2,
                      marginTop: 4, marginBottom: 0,
                    }} />
                  )}
                </div>

                {/* Entry content */}
                <div style={{
                  flex: 1, paddingLeft: 8, paddingBottom: isLast ? 0 : 10,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <Badge
                      variant={isHuman ? 'yellow' : 'lightgray'}
                      style={{ fontSize: 10 }}
                    >
                      {entry.agent}
                    </Badge>
                    <span style={{
                      fontSize: 10, color: palette.gray.base, fontFamily: FONT,
                      fontVariantNumeric: 'tabular-nums',
                    }}>
                      {entry.timestamp ? new Date(entry.timestamp).toLocaleTimeString() : ''}
                    </span>
                    {entry.llm_model && (
                      <span style={{
                        fontSize: 9, padding: '1px 5px', borderRadius: 3,
                        background: palette.purple.light3, color: palette.purple.dark2, fontFamily: FONT,
                      }}>
                        LLM
                      </span>
                    )}
                    {entry.token_usage?.total_tokens > 0 && (
                      <span style={{
                        fontSize: 9, padding: '1px 5px', borderRadius: 3,
                        background: palette.yellow.light3, color: palette.yellow.dark2, fontFamily: FONT,
                      }}>
                        {entry.token_usage.total_tokens.toLocaleString()} tokens
                      </span>
                    )}
                    {entry.forced_escalation && (
                      <Badge variant="red" style={{ fontSize: 9 }}>FORCED ESCALATION</Badge>
                    )}
                  </div>

                  {/* Decision / routing info */}
                  <div style={{
                    fontSize: 12, fontFamily: FONT, color: palette.gray.dark2,
                    marginTop: 2, lineHeight: 1.5,
                  }}>
                    {entry.decision && typeof entry.decision === 'object' && entry.decision.disposition && (
                      <span>Disposition: <strong>{entry.decision.disposition}</strong> (score: {entry.decision.risk_score})</span>
                    )}
                    {entry.decision && typeof entry.decision === 'string' && (
                      <span>Decision: <strong>{entry.decision}</strong></span>
                    )}
                    {entry.route_to && (
                      <span>{entry.decision ? ' · ' : ''}Routed to <strong>{entry.route_to}</strong></span>
                    )}
                    {entry.case_id && !entry.decision && !entry.route_to && (
                      <span>Case: <strong>{entry.case_id}</strong></span>
                    )}
                    {entry.analyst_decision && (
                      <span>Analyst: <strong>{entry.analyst_decision}</strong></span>
                    )}
                  </div>

                  {/* Reasoning */}
                  {entry.reasoning && (
                    <div style={{
                      fontSize: 11, fontFamily: FONT, color: palette.gray.dark1,
                      marginTop: 3, lineHeight: 1.5, fontStyle: 'italic',
                    }}>
                      {entry.reasoning}
                    </div>
                  )}

                  {/* Output summary */}
                  {entry.output_summary && (
                    <div style={{
                      fontSize: 10, fontFamily: FONT, color: palette.gray.base,
                      marginTop: 2,
                    }}>
                      {entry.output_summary}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Tool Trace Log */}
      {toolTrace && toolTrace.length > 0 && (
        <Card style={{ padding: spacing[3], border: `1px solid ${palette.gray.light2}` }}>
          <Subtitle style={{ fontFamily: FONT, marginBottom: spacing[2], fontSize: '14px' }}>
            Tool Call Traces ({toolTrace.length})
          </Subtitle>
          <div style={{ maxHeight: 400, overflowY: 'auto' }}>
            {toolTrace.map((trace, i) => (
              <ToolTraceRow key={i} trace={trace} />
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared sub-components
// ---------------------------------------------------------------------------

function StatusBadgeDetail({ status }) {
  const variants = {
    filed: 'green', closed: 'gray', closed_false_positive: 'lightgray',
    forced_escalation: 'red',
    reviewed_by_analyst: 'blue', pending_review: 'yellow', narrative_generated: 'blue',
  };
  return <Badge variant={variants[status] || 'lightgray'}>{status || 'Unknown'}</Badge>;
}

function Section({ title, subtitle, icon, accentColor, children }) {
  return (
    <Card style={{
      padding: spacing[3],
      border: `1px solid ${palette.gray.light2}`,
      borderLeft: accentColor ? `3px solid ${accentColor}` : undefined,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: subtitle ? 4 : spacing[2] }}>
        {icon && <Icon glyph={icon} size={16} style={{ color: accentColor || palette.gray.dark1, flexShrink: 0 }} />}
        <Subtitle style={{ fontFamily: FONT, fontSize: '14px', margin: 0 }}>
          {title}
        </Subtitle>
      </div>
      {subtitle && (
        <Body style={{ fontSize: '12px', fontFamily: FONT, color: palette.gray.dark1, marginBottom: spacing[2] }}>
          {subtitle}
        </Body>
      )}
      {children}
    </Card>
  );
}

function InfoPair({ label, value, color }) {
  return (
    <div>
      <Body style={{
        fontSize: '11px', color: palette.gray.base, fontFamily: FONT,
        textTransform: 'uppercase', letterSpacing: '0.5px',
      }}>
        {label}
      </Body>
      <Body style={{
        fontSize: '14px', fontFamily: FONT, fontWeight: 600,
        color: color || undefined,
      }}>
        {value ?? 'N/A'}
      </Body>
    </div>
  );
}

function MetricInline({ label, value }) {
  if (value == null) return null;
  return (
    <span style={{ fontSize: 12, fontFamily: FONT }}>
      <span style={{ color: palette.gray.base }}>{label}:&nbsp;</span>
      <span style={{ fontWeight: 600, color: palette.gray.dark2 }}>{value}</span>
    </span>
  );
}

function PatternGroup({ title, items, colorBg, colorText, renderItem }) {
  const [showAll, setShowAll] = useState(false);
  if (!items?.length) return null;
  const visible = showAll ? items : items.slice(0, 3);
  const remaining = items.length - 3;
  return (
    <div style={{ marginBottom: spacing[2] }}>
      <Body style={{ fontWeight: 600, fontSize: '13px', fontFamily: FONT, marginBottom: 4 }}>
        {title} ({items.length})
      </Body>
      {visible.map((item, i) => (
        <div key={i} style={{
          fontSize: 12, fontFamily: FONT, padding: '5px 10px', marginBottom: 3,
          borderRadius: 4, background: colorBg, color: colorText, lineHeight: 1.5,
        }}>
          {renderItem(item)}
        </div>
      ))}
      {remaining > 0 && !showAll && (
        <span
          onClick={() => setShowAll(true)}
          style={{ fontSize: 12, fontFamily: FONT, color: palette.blue.base, cursor: 'pointer', marginTop: 2, display: 'inline-block' }}
        >
          and {remaining} more {title.toLowerCase()}
        </span>
      )}
    </div>
  );
}
