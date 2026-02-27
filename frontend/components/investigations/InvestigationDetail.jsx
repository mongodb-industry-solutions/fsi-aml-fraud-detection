"use client";

import { useState } from 'react';
import Card from '@leafygreen-ui/card';
import Badge from '@leafygreen-ui/badge';
import { Body, Subtitle, H3 } from '@leafygreen-ui/typography';
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
  fetch_entity_profile: palette.purple.light1,
  fetch_transactions: palette.purple.light1,
  fetch_network: palette.purple.light1,
  fetch_watchlist: palette.purple.light1,
  assemble_case: palette.green.dark1,
  typology: palette.yellow.dark2,
  network_analyst: palette.yellow.dark2,
  narrative: palette.green.base,
  validation: palette.blue.dark1,
  human_review: palette.red.base,
  finalize: palette.green.dark2,
  auto_close: palette.gray.dark1,
  urgent_escalation: palette.red.dark2,
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
    narrative,
    validation_result,
    human_decision,
    agent_audit_log,
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
        />
      )}

      {activeTab === 'evidence' && (
        <EvidenceTab
          caseFile={case_file}
          typology={typology}
          networkAnalysis={network_analysis}
        />
      )}

      {activeTab === 'narrative' && (
        <NarrativeTab narrative={narrative} />
      )}

      {activeTab === 'audit' && (
        <AuditTab auditLog={agent_audit_log} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Summary Tab
// ---------------------------------------------------------------------------

function SummaryTab({ triage, typology, validation, humanDecision, networkAnalysis }) {
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
              <Badge variant={triage.disposition === 'auto_close' ? 'lightgray' : triage.disposition === 'escalate_urgent' ? 'red' : 'blue'}>
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
    </div>
  );
}

// ---------------------------------------------------------------------------
// Evidence Tab
// ---------------------------------------------------------------------------

function EvidenceTab({ caseFile, typology, networkAnalysis }) {
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
// Audit Trail Tab (visual timeline)
// ---------------------------------------------------------------------------

function AuditTab({ auditLog }) {
  if (!auditLog || auditLog.length === 0) {
    return (
      <Card style={{ padding: spacing[4], textAlign: 'center' }}>
        <Body style={{ color: palette.gray.dark1, fontFamily: FONT }}>No audit trail entries recorded.</Body>
      </Card>
    );
  }

  return (
    <Card style={{ padding: spacing[3], border: `1px solid ${palette.gray.light2}` }}>
      <Subtitle style={{ fontFamily: FONT, marginBottom: spacing[3], fontSize: '14px' }}>
        Execution Timeline ({auditLog.length} entries)
      </Subtitle>
      <div style={{ maxHeight: 500, overflowY: 'auto' }}>
        {auditLog.map((entry, i) => {
          const agentColor = AGENT_COLORS[entry.agent] || palette.gray.dark1;
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
                flex: 1, paddingLeft: 8, paddingBottom: isLast ? 0 : 8,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
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
                  {entry.forced_escalation && (
                    <Badge variant="red" style={{ fontSize: 9 }}>FORCED ESCALATION</Badge>
                  )}
                </div>
                <div style={{
                  fontSize: 12, fontFamily: FONT, color: palette.gray.dark2,
                  marginTop: 2, lineHeight: 1.5,
                }}>
                  {entry.decision && (
                    <span>Decision: <strong>{typeof entry.decision === 'string' ? entry.decision : JSON.stringify(entry.decision)}</strong></span>
                  )}
                  {entry.route_to && (
                    <span>{entry.decision ? ' · ' : ''}Routed to <strong>{entry.route_to}</strong></span>
                  )}
                  {entry.case_id && !entry.decision && !entry.route_to && (
                    <span>Case: <strong>{entry.case_id}</strong></span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Shared sub-components
// ---------------------------------------------------------------------------

function StatusBadgeDetail({ status }) {
  const variants = {
    filed: 'green', closed: 'gray', closed_false_positive: 'lightgray',
    urgent_escalation: 'red', forced_escalation: 'red',
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
