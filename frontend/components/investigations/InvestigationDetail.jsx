"use client";

import { useState } from 'react';
import Card from '@leafygreen-ui/card';
import Badge from '@leafygreen-ui/badge';
import { Body, Subtitle, H3 } from '@leafygreen-ui/typography';
import Banner from '@leafygreen-ui/banner';
import Callout from '@leafygreen-ui/callout';
import ExpandableCard from '@leafygreen-ui/expandable-card';
import Code from '@leafygreen-ui/code';
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
  typology: palette.yellow.dark2,
  network_analyst: palette.yellow.dark2,
  temporal_analyst: palette.yellow.dark2,
  trail_follower: palette.blue.dark2,
  sub_investigation_dispatch: palette.purple.base,
  collect_sub_findings: palette.green.dark1,
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
    sub_investigation_summary,
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
          <InfoPair label="Entity" value={entity_id || alert_data?.entity_id} />
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
          subInvestigationSummary={sub_investigation_summary}
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
          subSummary={sub_investigation_summary}
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

function SummaryTab({ triage, typology, validation, humanDecision, networkAnalysis, temporalAnalysis, trailAnalysis, subInvestigationSummary }) {
  const riskScore = triage?.risk_score;
  const risk = riskScore != null ? getRiskLevel(riskScore) : null;
  const conf = typology?.confidence;
  const confPct = conf != null ? Math.round(conf * 100) : null;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: spacing[2] }}>
      {/* Risk Score Card */}
      {risk && (
        <Card style={{ padding: spacing[3], border: `1px solid ${palette.gray.light2}` }}>
          <div style={{ fontSize: 10, color: palette.gray.base, fontFamily: FONT, textTransform: 'uppercase', marginBottom: 4 }}>
            Risk Assessment
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 28, fontWeight: 700, fontFamily: FONT, color: risk.color }}>
              {riskScore}
            </span>
            <span style={{
              fontSize: 11, padding: '2px 8px', borderRadius: 4,
              background: risk.bg, color: risk.color, fontFamily: FONT, fontWeight: 500,
            }}>
              {risk.label}
            </span>
          </div>
          {triage?.disposition && (
            <div style={{ marginBottom: 4 }}>
              <Badge variant={triage.disposition === 'auto_close' ? 'lightgray' : 'blue'}>
                {triage.disposition}
              </Badge>
            </div>
          )}
          {triage?.reasoning && (
            <Body style={{ fontSize: '12px', fontFamily: FONT, color: palette.gray.dark1, lineHeight: 1.5, marginTop: 6 }}>
              {triage.reasoning}
            </Body>
          )}
        </Card>
      )}

      {/* Typology Card */}
      {typology?.primary_typology && (
        <Card style={{ padding: spacing[3], border: `1px solid ${palette.gray.light2}` }}>
          <div style={{ fontSize: 10, color: palette.gray.base, fontFamily: FONT, textTransform: 'uppercase', marginBottom: 4 }}>
            Typology Classification
          </div>
          <Badge variant="yellow" style={{ marginBottom: 8 }}>{typology.primary_typology}</Badge>
          {confPct !== null && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <div style={{ width: 80, height: 6, borderRadius: 3, background: palette.gray.light2, overflow: 'hidden' }}>
                <div style={{
                  height: '100%', borderRadius: 3, width: `${confPct}%`,
                  background: confPct > 70 ? palette.green.dark1 : palette.yellow.base,
                }} />
              </div>
              <span style={{ fontSize: 12, fontFamily: FONT, fontWeight: 600 }}>{confPct}% confidence</span>
            </div>
          )}
          {typology.red_flags?.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 6 }}>
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
          {typology.reasoning && (
            <Body style={{ fontSize: '12px', fontFamily: FONT, color: palette.gray.dark1, lineHeight: 1.5 }}>
              {typology.reasoning}
            </Body>
          )}
        </Card>
      )}

      {/* Validation Card */}
      {validation && (
        <Card style={{ padding: spacing[3], border: `1px solid ${palette.gray.light2}` }}>
          <div style={{ fontSize: 10, color: palette.gray.base, fontFamily: FONT, textTransform: 'uppercase', marginBottom: 4 }}>
            Validation
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 6 }}>
            <Badge variant={validation.is_valid ? 'green' : 'yellow'}>
              {validation.is_valid ? 'Passed' : 'Issues Found'}
            </Badge>
            {validation.score != null && (
              <span style={{ fontSize: 13, fontFamily: FONT, fontWeight: 600 }}>
                {Math.round(validation.score * 100)}%
              </span>
            )}
          </div>
          {validation.issues?.length > 0 && (
            <ul style={{ margin: 0, paddingLeft: 16 }}>
              {validation.issues.map((issue, i) => (
                <li key={i} style={{ fontSize: 12, fontFamily: FONT, color: palette.yellow.dark2, lineHeight: 1.5 }}>
                  {issue}
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      {/* Human Decision Card */}
      {humanDecision && Object.keys(humanDecision).length > 0 && (
        <Card style={{ padding: spacing[3], border: `1px solid ${palette.gray.light2}` }}>
          <div style={{ fontSize: 10, color: palette.gray.base, fontFamily: FONT, textTransform: 'uppercase', marginBottom: 4 }}>
            Analyst Decision
          </div>
          <Badge variant={humanDecision.decision === 'approve' ? 'green' : humanDecision.decision === 'reject' ? 'red' : 'blue'}>
            {humanDecision.decision}
          </Badge>
          {humanDecision.analyst_notes && (
            <Body style={{ fontSize: '12px', fontFamily: FONT, color: palette.gray.dark1, marginTop: 6 }}>
              {humanDecision.analyst_notes}
            </Body>
          )}
        </Card>
      )}

      {/* Network Summary Card */}
      {networkAnalysis && networkAnalysis.network_size > 0 && (
        <Card style={{ padding: spacing[3], border: `1px solid ${palette.gray.light2}`, gridColumn: '1 / -1' }}>
          <div style={{ fontSize: 10, color: palette.gray.base, fontFamily: FONT, textTransform: 'uppercase', marginBottom: 4 }}>
            Network Analysis
          </div>
          <div style={{ display: 'flex', gap: spacing[4], flexWrap: 'wrap' }}>
            <InfoPair label="Network Size" value={networkAnalysis.network_size} />
            <InfoPair label="High-Risk Connections" value={networkAnalysis.high_risk_connections} />
            <InfoPair label="Degree Centrality" value={networkAnalysis.degree_centrality?.toFixed(3)} />
            <InfoPair label="Network Risk" value={networkAnalysis.network_risk_score != null ? `${networkAnalysis.network_risk_score.toFixed(1)}/100` : undefined} />
          </div>
          {networkAnalysis.summary && (
            <Body style={{ fontSize: '12px', fontFamily: FONT, color: palette.gray.dark1, marginTop: 8, lineHeight: 1.5 }}>
              {networkAnalysis.summary}
            </Body>
          )}
        </Card>
      )}

      {/* Temporal Analysis Card */}
      {temporalAnalysis && temporalAnalysis.timeline_summary && (
        <Card style={{ padding: spacing[3], border: `1px solid ${palette.gray.light2}` }}>
          <div style={{ fontSize: 10, color: palette.gray.base, fontFamily: FONT, textTransform: 'uppercase', marginBottom: 4 }}>
            Temporal Analysis
          </div>
          <div style={{ display: 'flex', gap: spacing[4], flexWrap: 'wrap', marginBottom: 6 }}>
            <InfoPair label="Structuring Patterns" value={temporalAnalysis.structuring_indicators?.length || 0} />
            <InfoPair label="Velocity Spikes" value={temporalAnalysis.velocity_anomalies?.length || 0} />
            <InfoPair label="Round-Trips" value={temporalAnalysis.round_trip_patterns?.length || 0} />
            <InfoPair label="Dormancy Bursts" value={temporalAnalysis.dormancy_bursts?.length || 0} />
          </div>
          <Body style={{ fontSize: '12px', fontFamily: FONT, color: palette.gray.dark1, lineHeight: 1.5 }}>
            {temporalAnalysis.timeline_summary}
          </Body>
        </Card>
      )}

      {/* Trail Analysis Card */}
      {trailAnalysis && trailAnalysis.leads?.length > 0 && (
        <Card style={{ padding: spacing[3], border: `1px solid ${palette.gray.light2}` }}>
          <div style={{ fontSize: 10, color: palette.gray.base, fontFamily: FONT, textTransform: 'uppercase', marginBottom: 4 }}>
            Trail Analysis
          </div>
          <div style={{ display: 'flex', gap: spacing[4], flexWrap: 'wrap', marginBottom: 6 }}>
            <InfoPair label="Leads Selected" value={trailAnalysis.leads.length} />
            <InfoPair label="Ownership Chains" value={trailAnalysis.ownership_chains?.length || 0} />
            <InfoPair label="Shell Patterns" value={trailAnalysis.shell_patterns?.length || 0} />
          </div>
          {trailAnalysis.shell_patterns?.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 6 }}>
              {trailAnalysis.shell_patterns.map((p, i) => (
                <span key={i} style={{
                  fontSize: 10, fontFamily: FONT, padding: '2px 6px',
                  borderRadius: 3, background: palette.red.light3, color: palette.red.dark2,
                }}>
                  {p}
                </span>
              ))}
            </div>
          )}
          {trailAnalysis.summary && (
            <Body style={{ fontSize: '12px', fontFamily: FONT, color: palette.gray.dark1, lineHeight: 1.5 }}>
              {trailAnalysis.summary}
            </Body>
          )}
        </Card>
      )}

      {/* Sub-Investigation Summary Card */}
      {subInvestigationSummary && subInvestigationSummary.total_leads_investigated > 0 && (
        <Card style={{ padding: spacing[3], border: `1px solid ${palette.gray.light2}`, gridColumn: '1 / -1' }}>
          <div style={{ fontSize: 10, color: palette.gray.base, fontFamily: FONT, textTransform: 'uppercase', marginBottom: 4 }}>
            Sub-Investigations
          </div>
          <div style={{ display: 'flex', gap: spacing[4], flexWrap: 'wrap', marginBottom: 6 }}>
            <InfoPair label="Leads Investigated" value={subInvestigationSummary.total_leads_investigated} />
            <InfoPair label="High-Risk Leads" value={subInvestigationSummary.high_risk_leads?.length || 0} />
            <InfoPair label="Confirmed Connections" value={subInvestigationSummary.confirmed_connections?.length || 0} />
          </div>
          {subInvestigationSummary.updated_risk_factors?.length > 0 && (
            <div style={{ marginBottom: 6 }}>
              <Body style={{ fontWeight: 600, fontSize: '11px', fontFamily: FONT, marginBottom: 4, color: palette.gray.dark1 }}>
                Updated Risk Factors
              </Body>
              <ul style={{ margin: 0, paddingLeft: 16 }}>
                {subInvestigationSummary.updated_risk_factors.map((f, i) => (
                  <li key={i} style={{ fontSize: 12, fontFamily: FONT, color: palette.red.dark2, lineHeight: 1.5 }}>{f}</li>
                ))}
              </ul>
            </div>
          )}
          {subInvestigationSummary.summary && (
            <Body style={{ fontSize: '12px', fontFamily: FONT, color: palette.gray.dark1, lineHeight: 1.5 }}>
              {subInvestigationSummary.summary}
            </Body>
          )}
        </Card>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Evidence Tab
// ---------------------------------------------------------------------------

function EvidenceTab({ caseFile, typology, networkAnalysis, temporalAnalysis, trailAnalysis, subFindings, subSummary }) {
  if (!caseFile && !networkAnalysis) {
    return (
      <Card style={{ padding: spacing[4], textAlign: 'center' }}>
        <Body style={{ color: palette.gray.dark1, fontFamily: FONT }}>No evidence data available for this investigation.</Body>
      </Card>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[2] }}>
      {/* Entity Profile */}
      {caseFile?.entity && (
        <Section title="Entity Profile">
          <div style={{ display: 'flex', gap: spacing[4], flexWrap: 'wrap', marginBottom: spacing[2] }}>
            <InfoPair label="Entity" value={caseFile.entity.name || caseFile.entity.entity_id} />
            <InfoPair label="Type" value={caseFile.entity.entity_type} />
            <InfoPair label="Risk Score" value={caseFile.entity.risk_score} />
            <InfoPair label="Risk Level" value={caseFile.entity.risk_level} />
          </div>
        </Section>
      )}

      {/* Transactions */}
      {caseFile?.transactions && (
        <Section title="Transaction Summary">
          <div style={{ display: 'flex', gap: spacing[4], flexWrap: 'wrap' }}>
            <InfoPair label="Total Transactions" value={caseFile.transactions.total_count} />
            <InfoPair label="Total Volume" value={`$${(caseFile.transactions.total_volume || 0).toLocaleString()}`} />
            <InfoPair label="High-Risk Count" value={caseFile.transactions.high_risk_count} />
          </div>
        </Section>
      )}

      {/* Network */}
      {networkAnalysis && networkAnalysis.network_size > 0 && (
        <Section title="Network Analysis">
          <div style={{ display: 'flex', gap: spacing[4], flexWrap: 'wrap', marginBottom: spacing[2] }}>
            <InfoPair label="Network Size" value={networkAnalysis.network_size} />
            <InfoPair label="High-Risk Connections" value={networkAnalysis.high_risk_connections} />
            <InfoPair label="Max Depth" value={networkAnalysis.max_depth_reached} />
            <InfoPair label="Degree Centrality" value={networkAnalysis.degree_centrality?.toFixed(3)} />
            <InfoPair label="Network Risk" value={networkAnalysis.network_risk_score != null ? `${networkAnalysis.network_risk_score.toFixed(1)}/100` : undefined} />
          </div>
          {networkAnalysis.shell_structure_indicators?.length > 0 && (
            <div style={{ marginBottom: spacing[2] }}>
              <Body style={{ fontWeight: 600, fontSize: '12px', fontFamily: FONT, marginBottom: spacing[1] }}>
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
            <Body style={{ fontSize: '13px', fontFamily: FONT, color: palette.gray.dark1, lineHeight: 1.5 }}>
              {networkAnalysis.summary}
            </Body>
          )}
        </Section>
      )}

      {/* Temporal Analysis */}
      {temporalAnalysis && temporalAnalysis.timeline_summary && (
        <Section title="Temporal Pattern Analysis">
          <Body style={{ fontSize: '13px', fontFamily: FONT, color: palette.gray.dark1, lineHeight: 1.5, marginBottom: spacing[2] }}>
            {temporalAnalysis.timeline_summary}
          </Body>

          {temporalAnalysis.structuring_indicators?.length > 0 && (
            <div style={{ marginBottom: spacing[2] }}>
              <Body style={{ fontWeight: 600, fontSize: '12px', fontFamily: FONT, marginBottom: 4 }}>
                Structuring Patterns ({temporalAnalysis.structuring_indicators.length})
              </Body>
              {temporalAnalysis.structuring_indicators.map((s, i) => (
                <div key={i} style={{
                  fontSize: 11, fontFamily: FONT, padding: '4px 8px', marginBottom: 2,
                  borderRadius: 4, background: palette.red.light3, color: palette.red.dark2,
                }}>
                  {s.date}: {s.count} transactions totalling ${s.total?.toLocaleString()}
                </div>
              ))}
            </div>
          )}

          {temporalAnalysis.velocity_anomalies?.length > 0 && (
            <div style={{ marginBottom: spacing[2] }}>
              <Body style={{ fontWeight: 600, fontSize: '12px', fontFamily: FONT, marginBottom: 4 }}>
                Velocity Spikes ({temporalAnalysis.velocity_anomalies.length})
              </Body>
              {temporalAnalysis.velocity_anomalies.map((v, i) => (
                <div key={i} style={{
                  fontSize: 11, fontFamily: FONT, padding: '4px 8px', marginBottom: 2,
                  borderRadius: 4, background: palette.yellow.light3, color: palette.yellow.dark2,
                }}>
                  {v.week}: {v.transaction_count} txns (z-score: {v.z_score}, baseline: {v.baseline_avg})
                </div>
              ))}
            </div>
          )}

          {temporalAnalysis.round_trip_patterns?.length > 0 && (
            <div style={{ marginBottom: spacing[2] }}>
              <Body style={{ fontWeight: 600, fontSize: '12px', fontFamily: FONT, marginBottom: 4 }}>
                Round-Trip Fund Flows ({temporalAnalysis.round_trip_patterns.length})
              </Body>
              {temporalAnalysis.round_trip_patterns.map((r, i) => (
                <div key={i} style={{
                  fontSize: 11, fontFamily: FONT, padding: '4px 8px', marginBottom: 2,
                  borderRadius: 4, background: palette.red.light3, color: palette.red.dark2,
                }}>
                  {r.counterparty}: Out ${r.outgoing_amount?.toLocaleString()} → Return ${r.return_amount?.toLocaleString()}
                </div>
              ))}
            </div>
          )}

          {temporalAnalysis.dormancy_bursts?.length > 0 && (
            <div>
              <Body style={{ fontWeight: 600, fontSize: '12px', fontFamily: FONT, marginBottom: 4 }}>
                Dormancy-Burst Patterns ({temporalAnalysis.dormancy_bursts.length})
              </Body>
              {temporalAnalysis.dormancy_bursts.map((d, i) => (
                <div key={i} style={{
                  fontSize: 11, fontFamily: FONT, padding: '4px 8px', marginBottom: 2,
                  borderRadius: 4, background: palette.yellow.light3, color: palette.yellow.dark2,
                }}>
                  {d.dormancy_days} days dormant → {d.burst_transaction_count} transactions (${d.burst_volume?.toLocaleString()})
                </div>
              ))}
            </div>
          )}
        </Section>
      )}

      {/* Trail Analysis — Leads */}
      {trailAnalysis && trailAnalysis.leads?.length > 0 && (
        <Section title="Trail Analysis — Investigation Leads">
          {trailAnalysis.summary && (
            <Body style={{ fontSize: '13px', fontFamily: FONT, color: palette.gray.dark1, lineHeight: 1.5, marginBottom: spacing[2] }}>
              {trailAnalysis.summary}
            </Body>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[1] }}>
            {trailAnalysis.leads.map((lead, i) => (
              <div key={i} style={{
                padding: spacing[2], borderRadius: 6,
                border: `1px solid ${lead.priority === 'high' ? palette.red.light1 : palette.gray.light2}`,
                background: lead.priority === 'high' ? palette.red.light3 : '#fff',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <Badge variant={lead.priority === 'high' ? 'red' : lead.priority === 'medium' ? 'yellow' : 'lightgray'}>
                    {lead.priority}
                  </Badge>
                  <span style={{ fontSize: 13, fontWeight: 600, fontFamily: FONT }}>{lead.entity_name || lead.entity_id}</span>
                </div>
                {lead.reason && (
                  <Body style={{ fontSize: '12px', fontFamily: FONT, color: palette.gray.dark1, lineHeight: 1.5 }}>
                    {lead.reason}
                  </Body>
                )}
                {lead.risk_indicators?.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginTop: 4 }}>
                    {lead.risk_indicators.map((ind, j) => (
                      <span key={j} style={{
                        fontSize: 10, fontFamily: FONT, padding: '1px 5px',
                        borderRadius: 3, background: palette.red.light3, color: palette.red.dark2,
                      }}>
                        {ind}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Sub-Investigation Findings */}
      {subFindings && Object.keys(subFindings).length > 0 && (
        <Section title="Sub-Investigation Findings">
          {subSummary?.summary && (
            <Body style={{ fontSize: '13px', fontFamily: FONT, color: palette.gray.dark1, lineHeight: 1.5, marginBottom: spacing[2] }}>
              {subSummary.summary}
            </Body>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[1] }}>
            {Object.entries(subFindings).map(([entityId, assessment]) => (
              <div key={entityId} style={{
                padding: spacing[2], borderRadius: 6,
                border: `1px solid ${assessment.risk_level === 'high' || assessment.risk_level === 'critical' ? palette.red.light1 : palette.gray.light2}`,
                background: assessment.risk_level === 'critical' ? palette.red.light3 : assessment.risk_level === 'high' ? '#fff5f5' : '#fff',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 13, fontWeight: 600, fontFamily: FONT }}>
                    {assessment.entity_name || entityId}
                  </span>
                  <Badge variant={assessment.risk_level === 'critical' ? 'red' : assessment.risk_level === 'high' ? 'red' : assessment.risk_level === 'medium' ? 'yellow' : 'green'}>
                    {assessment.risk_level} ({assessment.risk_score})
                  </Badge>
                  <Badge variant={
                    assessment.recommendation === 'escalate' || assessment.recommendation === 'investigate_further' ? 'red'
                    : assessment.recommendation === 'monitor' ? 'yellow' : 'lightgray'
                  }>
                    {assessment.recommendation}
                  </Badge>
                  {assessment.watchlist_hits > 0 && (
                    <Badge variant="red">
                      {assessment.watchlist_hits} watchlist hit{assessment.watchlist_hits > 1 ? 's' : ''}
                    </Badge>
                  )}
                </div>
                {assessment.key_findings?.length > 0 && (
                  <ul style={{ margin: 0, paddingLeft: 16, marginBottom: 4 }}>
                    {assessment.key_findings.map((f, i) => (
                      <li key={i} style={{ fontSize: 12, fontFamily: FONT, lineHeight: 1.5 }}>{f}</li>
                    ))}
                  </ul>
                )}
                {assessment.red_flags?.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                    {assessment.red_flags.map((flag, i) => (
                      <span key={i} style={{
                        fontSize: 10, fontFamily: FONT, padding: '1px 5px',
                        borderRadius: 3, background: palette.red.light3, color: palette.red.dark2,
                      }}>
                        {flag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Key Findings */}
      {caseFile?.key_findings?.length > 0 && (
        <Section title="Key Findings">
          <ul style={{ margin: 0, paddingLeft: spacing[3] }}>
            {caseFile.key_findings.map((finding, i) => (
              <li key={i}>
                <Body style={{ fontSize: '13px', fontFamily: FONT, lineHeight: 1.6 }}>{finding}</Body>
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
  if (!narrative?.introduction) {
    return (
      <Card style={{ padding: spacing[4], textAlign: 'center' }}>
        <Body style={{ color: palette.gray.dark1, fontFamily: FONT }}>No narrative generated for this investigation.</Body>
      </Card>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[2] }}>
      <Section title="SAR Narrative">
        <NarrativeSection label="Introduction" content={narrative.introduction} />
        <NarrativeSection label="Body" content={narrative.body} />
        <NarrativeSection label="Conclusion" content={narrative.conclusion} />

        {narrative.cited_evidence?.length > 0 && (
          <div style={{ marginTop: spacing[3] }}>
            <Body style={{
              fontWeight: 600, fontSize: '12px', fontFamily: FONT, marginBottom: spacing[1],
              textTransform: 'uppercase', letterSpacing: '0.5px', color: palette.gray.dark1,
            }}>
              Evidence Citations ({narrative.cited_evidence.length})
            </Body>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: spacing[1] }}>
              {narrative.cited_evidence.map((cite, i) => (
                <span key={i} style={{
                  fontSize: 11, fontFamily: FONT, padding: '3px 10px',
                  borderRadius: 4, background: palette.blue.light3,
                  color: palette.blue.dark1, border: `1px solid ${palette.blue.light1}`,
                }}>
                  {cite}
                </span>
              ))}
            </div>
          </div>
        )}
      </Section>
    </div>
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
          {trace.duration_ms != null ? `${trace.duration_ms}ms` : ''} {expanded ? '▼' : '▶'}
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
            <MetricCard label="Total Duration" value={formattedDuration} />
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
          <DurationBar entries={auditLog} />
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
                    {entry.duration_ms != null && (
                      <span style={{
                        fontSize: 9, padding: '1px 5px', borderRadius: 3,
                        background: palette.gray.light2, color: palette.gray.dark1, fontFamily: FONT,
                      }}>
                        {entry.duration_ms > 1000 ? `${(entry.duration_ms / 1000).toFixed(1)}s` : `${entry.duration_ms}ms`}
                      </span>
                    )}
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

function Section({ title, children }) {
  return (
    <Card style={{ padding: spacing[3], border: `1px solid ${palette.gray.light2}` }}>
      <Subtitle style={{ fontFamily: FONT, marginBottom: spacing[2], fontSize: '14px' }}>
        {title}
      </Subtitle>
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

function NarrativeSection({ label, content }) {
  if (!content) return null;
  return (
    <div style={{ marginBottom: spacing[2] }}>
      <Body style={{
        fontWeight: 600, fontSize: '12px', fontFamily: FONT,
        color: palette.gray.dark1, marginBottom: spacing[1],
        textTransform: 'uppercase', letterSpacing: '0.5px',
      }}>
        {label}
      </Body>
      <Body style={{
        fontSize: '13px', fontFamily: FONT, lineHeight: '1.6',
        color: palette.gray.dark2, whiteSpace: 'pre-wrap',
      }}>
        {content}
      </Body>
    </div>
  );
}
