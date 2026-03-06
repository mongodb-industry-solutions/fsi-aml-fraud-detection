"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import Card from '@leafygreen-ui/card';
import Button from '@leafygreen-ui/button';
import Badge from '@leafygreen-ui/badge';
import { Body, Subtitle } from '@leafygreen-ui/typography';
import { palette } from '@leafygreen-ui/palette';
import { spacing } from '@leafygreen-ui/tokens';
import { Spinner } from '@leafygreen-ui/loading-indicator';

import { listInvestigations, seedAgentCollections } from '@/lib/agent-api';
import AgenticPipelineGraph from './AgenticPipelineGraph';

const STATUS_BADGES = {
  filed: { variant: 'green', label: 'SAR Filed' },
  closed: { variant: 'gray', label: 'Closed' },
  closed_false_positive: { variant: 'lightgray', label: 'Auto-Closed (FP)' },
  forced_escalation: { variant: 'red', label: 'Forced Escalation' },
  reviewed_by_analyst: { variant: 'blue', label: 'Reviewed' },
  pending_review: { variant: 'yellow', label: 'Pending Review' },
  narrative_generated: { variant: 'blue', label: 'Narrative Ready' },
};

function StatusBadge({ status }) {
  const config = STATUS_BADGES[status] || { variant: 'lightgray', label: status || 'Unknown' };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

export default function InvestigationDashboard({ onViewDetail }) {
  const [investigations, setInvestigations] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [error, setError] = useState(null);
  const [showPipeline, setShowPipeline] = useState(true);
  const [showTools, setShowTools] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const fullscreenRef = useRef(null);

  useEffect(() => {
    if (!fullscreen) return;
    const handleKey = (e) => {
      if (e.key === 'Escape') setFullscreen(false);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [fullscreen]);

  const fetchInvestigations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listInvestigations(null, 50, 0);
      setInvestigations(data.investigations || []);
      setTotal(data.total || 0);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInvestigations();
  }, [fetchInvestigations]);

  const handleSeed = async () => {
    setSeeding(true);
    try {
      await seedAgentCollections();
      alert('Agent collections seeded successfully.');
    } catch (err) {
      alert(`Seed failed: ${err.message}`);
    } finally {
      setSeeding(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: spacing[5] }}>
        <Spinner />
      </div>
    );
  }

  return (
    <div>
      {/* Pipeline Architecture Visualization */}
      <Card style={{ padding: spacing[3], marginBottom: spacing[3] }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div>
            <Subtitle style={{ fontFamily: "'Euclid Circular A', sans-serif", margin: 0 }}>
              Agentic Investigation Pipeline
            </Subtitle>
            <Body style={{
              color: palette.gray.dark1,
              fontSize: '12px',
              fontFamily: "'Euclid Circular A', sans-serif",
              marginTop: 2,
            }}>
              LangGraph multi-agent workflow with Command routing, Send fan-out, and interrupt-based human review.
            </Body>
          </div>
          <div style={{ display: 'flex', gap: spacing[2] }}>
            {showPipeline && (
              <>
                <Button
                  size="xsmall"
                  onClick={() => setShowTools((v) => !v)}
                >
                  {showTools ? 'Hide' : 'Show'} Tools
                </Button>
                <Button
                  size="xsmall"
                  onClick={() => setFullscreen(true)}
                >
                  Fullscreen
                </Button>
              </>
            )}
            <Button
              size="small"
              onClick={() => setShowPipeline((v) => !v)}
            >
              {showPipeline ? 'Hide' : 'Show'} Pipeline
            </Button>
          </div>
        </div>
        {showPipeline && (
          <div style={{
            height: 620,
            marginTop: spacing[2],
            borderRadius: 8,
            overflow: 'hidden',
            border: `1px solid ${palette.gray.light2}`,
          }}>
            <AgenticPipelineGraph showTools={showTools} />
          </div>
        )}
      </Card>

      {/* Fullscreen Pipeline Overlay */}
      {fullscreen && (
        <div
          ref={fullscreenRef}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: '#fafafa',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: `${spacing[2]}px ${spacing[3]}px`,
            borderBottom: `1px solid ${palette.gray.light2}`,
            background: '#fff',
          }}>
            <Subtitle style={{ fontFamily: "'Euclid Circular A', sans-serif", margin: 0 }}>
              Agentic Investigation Pipeline
            </Subtitle>
            <div style={{ display: 'flex', gap: spacing[2] }}>
              <Button size="xsmall" onClick={() => setShowTools((v) => !v)}>
                {showTools ? 'Hide' : 'Show'} Tools
              </Button>
              <Button size="small" onClick={() => setFullscreen(false)}>
                Exit Fullscreen
              </Button>
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <AgenticPipelineGraph showTools={showTools} />
          </div>
        </div>
      )}

      {/* Investigation List */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing[3],
      }}>
        <Subtitle style={{ fontFamily: "'Euclid Circular A', sans-serif" }}>
          {total} Investigation{total !== 1 ? 's' : ''}
        </Subtitle>
        <div style={{ display: 'flex', gap: spacing[2] }}>
          <Button size="small" onClick={fetchInvestigations}>
            Refresh
          </Button>
          <Button size="small" variant="baseGreen" onClick={handleSeed} disabled={seeding}>
            {seeding ? 'Seeding...' : 'Seed Collections'}
          </Button>
        </div>
      </div>

      {error && (
        <Card style={{
          padding: spacing[3],
          marginBottom: spacing[3],
          backgroundColor: palette.red.light3,
          border: `1px solid ${palette.red.light1}`,
        }}>
          <Body>{error}</Body>
        </Card>
      )}

      {investigations.length === 0 ? (
        <Card style={{ padding: spacing[5], textAlign: 'center' }}>
          <Body style={{
            color: palette.gray.dark1,
            fontFamily: "'Euclid Circular A', sans-serif",
          }}>
            No investigations yet. Launch one from the &quot;Launch Investigation&quot; tab.
          </Body>
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[2] }}>
          {investigations.map((inv) => (
            <Card
              key={inv.case_id}
              style={{
                padding: spacing[3],
                cursor: 'pointer',
                transition: 'box-shadow 0.15s ease',
                border: `1px solid ${palette.gray.light2}`,
              }}
              onClick={() => onViewDetail(inv)}
            >
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: spacing[2],
                    marginBottom: spacing[1],
                  }}>
                    <Subtitle style={{
                      fontFamily: "'Euclid Circular A', sans-serif",
                      fontSize: '14px',
                      margin: 0,
                    }}>
                      {inv.case_id}
                    </Subtitle>
                    <StatusBadge status={inv.investigation_status} />
                  </div>
                  <Body style={{
                    color: palette.gray.dark1,
                    fontSize: '13px',
                    fontFamily: "'Euclid Circular A', sans-serif",
                  }}>
                    Entity: {inv.entity_id || inv.alert_data?.entity_id || 'N/A'}
                    {inv.typology?.primary_typology && (
                      <span> &middot; Typology: {inv.typology.primary_typology}</span>
                    )}
                    {inv.triage_decision?.risk_score !== undefined && (
                      <span> &middot; Risk: {inv.triage_decision.risk_score}</span>
                    )}
                  </Body>
                </div>
                <Body style={{
                  color: palette.gray.base,
                  fontSize: '12px',
                  fontFamily: "'Euclid Circular A', sans-serif",
                  whiteSpace: 'nowrap',
                }}>
                  {inv.created_at ? new Date(inv.created_at).toLocaleString() : ''}
                </Body>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
