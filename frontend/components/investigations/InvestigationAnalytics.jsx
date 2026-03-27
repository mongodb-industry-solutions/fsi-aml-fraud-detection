"use client";

import { useState, useEffect } from 'react';
import Card from '@leafygreen-ui/card';
import Badge from '@leafygreen-ui/badge';
import ExpandableCard from '@leafygreen-ui/expandable-card';
import Code from '@leafygreen-ui/code';
import { Body, Subtitle, H3 } from '@leafygreen-ui/typography';
import { palette } from '@leafygreen-ui/palette';
import { spacing } from '@leafygreen-ui/tokens';

import { fetchInvestigationAnalytics } from '@/lib/agent-api';
import { uiTokens } from './investigationTokens';

const FONT = uiTokens.font;

const STATUS_COLORS = {
  filed: palette.green.dark1,
  closed: palette.gray.dark1,
  closed_false_positive: palette.gray.base,
  forced_escalation: palette.red.dark2,
  pending_review: palette.yellow.dark2,
  reviewed_by_analyst: palette.blue.base,
  narrative_generated: palette.blue.dark1,
};

function MetricBox({ label, value, sub, color }) {
  return (
    <div style={{
      padding: spacing[3], borderRadius: 8, background: '#fff',
      border: `1px solid ${palette.gray.light2}`,
      textAlign: 'center', minWidth: 120,
    }}>
      <div style={{
        fontSize: 28, fontWeight: 700, fontFamily: FONT,
        color: color || palette.gray.dark2,
      }}>
        {value ?? '—'}
      </div>
      <div style={{
        fontSize: 10, color: palette.gray.base, fontFamily: FONT,
        textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: 2,
      }}>
        {label}
      </div>
      {sub && <div style={{ fontSize: 10, color: palette.gray.dark1, fontFamily: FONT, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function HorizontalBar({ items, colorMap }) {
  const total = items.reduce((s, i) => s + i.count, 0) || 1;
  return (
    <div>
      <div style={{ display: 'flex', height: 24, borderRadius: 6, overflow: 'hidden', background: palette.gray.light2 }}>
        {items.map((item, i) => (
          <div
            key={i}
            style={{
              width: `${Math.max((item.count / total) * 100, 2)}%`,
              background: colorMap[item._id] || palette.gray.dark1,
              transition: 'width 0.5s ease',
            }}
            title={`${item._id}: ${item.count}`}
          />
        ))}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: spacing[2], marginTop: spacing[2] }}>
        {items.map((item, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{
              width: 10, height: 10, borderRadius: 2,
              background: colorMap[item._id] || palette.gray.dark1,
            }} />
            <span style={{ fontSize: 11, fontFamily: FONT, color: palette.gray.dark2 }}>
              {item._id || 'unknown'}: <strong>{item.count}</strong>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function InvestigationAnalytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchInvestigationAnalytics()
      .then(d => { if (!cancelled) setData(d); })
      .catch(e => { if (!cancelled) setError(e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <Card style={{ padding: spacing[4], textAlign: 'center' }}>
        <Body style={{ fontFamily: FONT, color: palette.gray.dark1 }}>
          Computing analytics via MongoDB aggregation pipeline...
        </Body>
      </Card>
    );
  }

  if (error) {
    return (
      <Card style={{ padding: spacing[4] }}>
        <Body style={{ fontFamily: FONT, color: palette.red.dark2 }}>
          Failed to load analytics: {error}
        </Body>
      </Card>
    );
  }

  if (!data) return null;

  const { by_status = [], by_typology = [], risk_stats = {}, recent_7d = 0, aggregation_pipeline } = data;

  const typologyColors = {};
  const hues = [palette.blue.base, palette.yellow.dark2, palette.red.base, palette.purple.base, palette.green.dark1, '#ed6c02', palette.blue.dark1, palette.red.dark2, palette.green.base, palette.yellow.base];
  by_typology.forEach((t, i) => { typologyColors[t._id] = hues[i % hues.length]; });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[3] }}>
      <div>
        <H3 style={{ fontFamily: FONT, margin: 0, marginBottom: 4 }}>Investigation Analytics</H3>
        <Body style={{ fontSize: '12px', fontFamily: FONT, color: palette.gray.dark1 }}>
          Real-time analytics computed using MongoDB aggregation pipelines
        </Body>
      </div>

      {/* MongoDB compact strip */}
      <div style={{
        display: 'flex', borderRadius: 6, overflow: 'hidden',
        border: `1px solid ${palette.gray.light2}`, fontSize: uiTokens.captionSize, fontFamily: FONT,
      }}>
        <div style={{
          flex: 1, padding: '8px 12px',
          background: palette.green.light3, borderRight: `1px solid ${palette.gray.light2}`,
        }}>
          <span style={{ fontWeight: 700, color: palette.green.dark2, fontFamily: uiTokens.monoFont, fontSize: 10 }}>MongoDB </span>
          <span style={{ color: palette.green.dark1 }}>Single <code>$facet</code> pipeline — <code>$group</code>, <code>$avg</code>, <code>$sort</code>, <code>$count</code> in parallel</span>
        </div>
        <div style={{ flex: 1, padding: '8px 12px', background: palette.gray.light3 }}>
          <span style={{ fontWeight: 700, color: palette.gray.dark1, fontSize: 10 }}>Traditional </span>
          <span style={{ color: palette.gray.base }}>Materialized views + OLAP database + ETL jobs</span>
        </div>
      </div>

      {/* KPI Row */}
      <div style={{ display: 'flex', gap: spacing[2], flexWrap: 'wrap' }}>
        <MetricBox
          label="Total Investigations"
          value={risk_stats.total_scored || by_status.reduce((s, i) => s + i.count, 0)}
        />
        <MetricBox
          label="Avg Risk Score"
          value={risk_stats.avg}
          color={risk_stats.avg > 50 ? palette.red.base : palette.yellow.dark2}
        />
        <MetricBox
          label="Max Risk Score"
          value={risk_stats.max}
          color={palette.red.base}
        />
        <MetricBox
          label="Last 7 Days"
          value={recent_7d}
          color={palette.blue.base}
        />
      </div>

      {/* SAR Funnel */}
      {by_status.length > 0 && (() => {
        const totalCount = by_status.reduce((s, i) => s + i.count, 0);
        const filedCount = by_status.find(s => s._id === 'filed')?.count || 0;
        const closedFP = by_status.find(s => s._id === 'closed_false_positive')?.count || 0;
        const pendingCount = by_status.find(s => s._id === 'pending_review')?.count || 0;
        const escalated = by_status.find(s => s._id === 'forced_escalation')?.count || 0;
        const funnelSteps = [
          { label: 'Alerts Triaged', count: totalCount, color: palette.blue.base },
          { label: 'Auto-Closed (FP)', count: closedFP, color: palette.gray.base },
          { label: 'Full Investigation', count: totalCount - closedFP, color: palette.yellow.dark2 },
          { label: 'Pending Review', count: pendingCount, color: palette.yellow.base },
          { label: 'Escalated', count: escalated, color: palette.red.base },
          { label: 'SAR Filed', count: filedCount, color: palette.green.dark1 },
        ];
        return (
          <Card style={{ padding: spacing[3], border: `1px solid ${palette.gray.light2}` }}>
            <Subtitle style={{ fontFamily: FONT, fontSize: '14px', marginBottom: spacing[2] }}>
              SAR Investigation Funnel
            </Subtitle>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {funnelSteps.map((step, i) => {
                const widthPct = totalCount > 0 ? Math.max((step.count / totalCount) * 100, 8) : 8;
                return (
                  <div key={step.label} style={{ display: 'flex', alignItems: 'center', gap: spacing[2] }}>
                    <span style={{
                      fontSize: uiTokens.captionSize, fontFamily: FONT, color: palette.gray.dark1,
                      width: 130, textAlign: 'right', flexShrink: 0,
                    }}>
                      {step.label}
                    </span>
                    <div style={{
                      flex: 1, height: 24, borderRadius: 4,
                      background: palette.gray.light2, overflow: 'hidden',
                    }}>
                      <div style={{
                        width: `${widthPct}%`, height: '100%', borderRadius: 4,
                        background: step.color,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'width 0.5s ease',
                        minWidth: 32,
                      }}>
                        <span style={{
                          fontSize: 10, fontWeight: 700, color: '#fff', fontFamily: FONT,
                          textShadow: '0 1px 2px rgba(0,0,0,0.2)',
                        }}>
                          {step.count}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        );
      })()}

      {/* Status Distribution */}
      {by_status.length > 0 && (
        <Card style={{ padding: spacing[3], border: `1px solid ${palette.gray.light2}` }}>
          <Subtitle style={{ fontFamily: FONT, fontSize: '14px', marginBottom: spacing[2] }}>
            Investigations by Status
          </Subtitle>
          <HorizontalBar items={by_status} colorMap={STATUS_COLORS} />
          <div style={{
            marginTop: spacing[2], fontSize: 10, fontFamily: FONT, color: palette.gray.base,
          }}>
            Computed via <code>$group</code> by <code>investigation_status</code>
          </div>
        </Card>
      )}

      {/* Typology Distribution */}
      {by_typology.length > 0 && (
        <Card style={{ padding: spacing[3], border: `1px solid ${palette.gray.light2}` }}>
          <Subtitle style={{ fontFamily: FONT, fontSize: '14px', marginBottom: spacing[2] }}>
            Top Typologies
          </Subtitle>
          <HorizontalBar items={by_typology} colorMap={typologyColors} />
          <div style={{
            marginTop: spacing[2], fontSize: 10, fontFamily: FONT, color: palette.gray.base,
          }}>
            Computed via <code>$group</code> on <code>typology.primary_typology</code> + <code>$sort</code> + <code>$limit 10</code>
          </div>
        </Card>
      )}

      {/* Show Pipeline */}
      {aggregation_pipeline && (
        <ExpandableCard
          title="View Aggregation Pipeline"
          description="The MongoDB $facet pipeline powering these analytics"
        >
          <Code language="json" style={{ maxHeight: 400, overflow: 'auto' }}>
            {aggregation_pipeline}
          </Code>
        </ExpandableCard>
      )}
    </div>
  );
}
