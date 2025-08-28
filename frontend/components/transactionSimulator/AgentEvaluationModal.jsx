"use client";

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Card from '@leafygreen-ui/card';
import Button from '@leafygreen-ui/button';
import Banner from '@leafygreen-ui/banner';
import { Body, H2, H3, Subtitle, Error as ErrorText } from '@leafygreen-ui/typography';
import { Tabs, Tab } from '@leafygreen-ui/tabs';
import Icon from '@leafygreen-ui/icon';
import Modal from '@leafygreen-ui/modal';
import { Spinner } from '@leafygreen-ui/loading-indicator';
import { CardSkeleton } from '@leafygreen-ui/skeleton-loader';
import Badge from '@leafygreen-ui/badge';
import { palette } from '@leafygreen-ui/palette';
import { spacing } from '@leafygreen-ui/tokens';
import AgentObservabilityDashboard from '../observability/AgentObservabilityDashboard';
import AgentChatInterface from '../observability/AgentChatInterface';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

function AgentEvaluationModal({ 
  open, 
  setOpen, 
  transactionData, 
  loading, 
  setLoading, 
  error, 
  setError 
}) {
  const [agentResults, setAgentResults] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const [processingStage, setProcessingStage] = useState('');
  const [observabilityActive, setObservabilityActive] = useState(false);
  const [threadId, setThreadId] = useState(null);

  // Reset results when modal opens  
  useEffect(() => {
    if (open && agentResults) {
      setAgentResults(null);
      setActiveTab(0);
      setObservabilityActive(false);
      setThreadId(null);
    }
  }, [open]);

  // Start evaluation when modal opens
  useEffect(() => {
    if (!open || !transactionData || agentResults || loading) {
      return;
    }

    const performAnalysis = async () => {
      setLoading(true);
      setError('');
      setProcessingStage('Initializing agent...');
      
      // Activate observability immediately when analysis starts (waiting mode)
      setObservabilityActive(true);
      
      // Clear any previous thread ID to ensure clean state
      setThreadId(null);
      
      try {
        console.log('Sending transaction data to agent:', transactionData);
        console.log('🔄 Starting observability in waiting mode...');
        
        // Call the agent API
        const response = await axios.post(`${API_BASE_URL}/api/agent/analyze`, transactionData);
        console.log('Agent analysis response:', response.data);
        
        // Extract thread ID for live observability
        if (response.data.thread_id) {
          console.log('🔄 Thread ID available, starting live observability:', response.data.thread_id);
          setThreadId(response.data.thread_id);
        }
        
        console.log('Setting agent results:', response.data);
        setAgentResults(response.data);
        setProcessingStage('');
        console.log('Agent results set, should stop loading now');
      } catch (err) {
        console.error('Error with agent evaluation:', err);
        console.error('Error details:', err.response?.data || err.message);
        setError(`Failed to evaluate transaction with agent: ${err.response?.data?.detail || err.message}`);
        setProcessingStage('');
        // Keep observability active even on error to show any events that occurred
      } finally {
        setLoading(false);
      }
    };

    performAnalysis();
  }, [open, transactionData]);

  // Render risk level badge
  const renderRiskLevelBadge = (level) => {
    const colorMap = {
      low: palette.green.dark1,
      medium: palette.yellow.dark2, 
      high: palette.red.base,
      critical: palette.red.dark1
    };

    const variantMap = {
      low: 'lightgreen',
      medium: 'yellow',
      high: 'red', 
      critical: 'darkgray'
    };

    return (
      <Badge 
        variant={variantMap[level] || 'lightgray'}
        style={{ 
          backgroundColor: colorMap[level] || palette.gray.base,
          color: palette.white,
          textTransform: 'uppercase',
          fontWeight: 'bold'
        }}
      >
        {level}
      </Badge>
    );
  };

  // Render decision badge
  const renderDecisionBadge = (decision) => {
    const color = decision === 'approve' ? palette.green.dark1 : 
                  decision === 'reject' ? palette.red.base : 
                  palette.yellow.dark2;
    
    const variant = decision === 'approve' ? 'lightgreen' :
                   decision === 'reject' ? 'red' :
                   'yellow';

    return (
      <Badge 
        variant={variant}
        style={{ 
          backgroundColor: color,
          color: palette.white,
          textTransform: 'uppercase',
          fontWeight: 'bold'
        }}
      >
        {decision}
      </Badge>
    );
  };

  // Render loading state
  const renderLoadingContent = () => (
    <div style={{ padding: spacing[3], textAlign: 'center' }}>
      <div style={{ marginBottom: spacing[3] }}>
        <Spinner size="large" />
      </div>
      <H3>Agent Analysis in Progress</H3>
      <Body style={{ marginTop: spacing[2], color: palette.gray.dark1 }}>
        {processingStage || 'Processing transaction through two-stage fraud detection...'}
      </Body>
      
      {/* Two-stage progress visualization */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center',
        marginTop: spacing[4],
        gap: spacing[3]
      }}>
        <div style={{ 
          background: palette.blue.light2, 
          padding: spacing[2], 
          borderRadius: '8px',
          border: `2px solid ${palette.blue.base}`,
          minWidth: '120px'
        }}>
          <Body weight="medium" style={{ color: palette.blue.dark2, textAlign: 'center' }}>
            Stage 1: ML Detection
          </Body>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <Icon glyph="ArrowRight" fill={palette.gray.dark1} />
        </div>
        
        <div style={{ 
          background: palette.purple.light2, 
          padding: spacing[2], 
          borderRadius: '8px',
          border: `2px solid ${palette.purple.base}`,
          minWidth: '120px'
        }}>
          <Body weight="medium" style={{ color: palette.purple.dark2, textAlign: 'center' }}>
            Stage 2: Vector Analysis
          </Body>
        </div>
      </div>
    </div>
  );

  // Render results content
  const renderResultsContent = () => {
    if (!agentResults) return null;

    return (
      <div style={{ padding: spacing[3] }}>
        <Tabs
          selected={activeTab}
          setSelected={setActiveTab}
          aria-label="Agent analysis tabs"
        >
          <Tab name="Agent Decision">
            <div style={{ marginTop: spacing[3] }}>
              <Card>
                {/* Header with decision and risk level */}
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  marginBottom: spacing[3]
                }}>
                  <H3 style={{ margin: 0 }}>Agent Decision</H3>
                  <div style={{ display: 'flex', gap: spacing[2], alignItems: 'center' }}>
                    {renderDecisionBadge(agentResults.decision)}
                    {renderRiskLevelBadge(agentResults.risk_level)}
                  </div>
                </div>

                {/* Key metrics */}
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', 
                  gap: spacing[2],
                  marginBottom: spacing[3],
                  padding: spacing[3],
                  background: palette.gray.light3,
                  borderRadius: '4px'
                }}>
                  <div style={{ textAlign: 'center' }}>
                    <Body weight="medium" size="small" style={{ color: palette.gray.dark2 }}>
                      Risk Score
                    </Body>
                    <H3 style={{ margin: 0, color: palette.blue.dark2 }}>
                      {agentResults.risk_score}%
                    </H3>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <Body weight="medium" size="small" style={{ color: palette.gray.dark2 }}>
                      Confidence
                    </Body>
                    <H3 style={{ margin: 0, color: palette.green.dark2 }}>
                      {(agentResults.confidence * 100).toFixed(1)}%
                    </H3>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <Body weight="medium" size="small" style={{ color: palette.gray.dark2 }}>
                      Processing Time
                    </Body>
                    <H3 style={{ margin: 0, color: palette.purple.dark2 }}>
                      {agentResults.processing_time_ms}ms
                    </H3>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <Body weight="medium" size="small" style={{ color: palette.gray.dark2 }}>
                      Stage Completed
                    </Body>
                    <H3 style={{ margin: 0, color: palette.yellow.dark2 }}>
                      {agentResults.stage_completed}
                    </H3>
                  </div>
                </div>

                {/* Reasoning section */}
                <div>
                  <Subtitle style={{ marginBottom: spacing[2] }}>
                    Agent Reasoning
                  </Subtitle>
                  <div style={{ 
                    background: palette.blue.light3,
                    padding: spacing[3],
                    borderRadius: '4px',
                    borderLeft: `4px solid ${palette.blue.base}`
                  }}>
                    <Body style={{ color: palette.blue.dark2, lineHeight: '1.6' }}>
                      {agentResults.reasoning || 'No reasoning provided by the agent.'}
                    </Body>
                  </div>
                </div>

                {/* Thread ID if available */}
                {agentResults.thread_id && (
                  <div style={{ marginTop: spacing[3] }}>
                    <Body size="small" style={{ color: palette.gray.dark1 }}>
                      Thread ID: <code>{agentResults.thread_id}</code>
                    </Body>
                  </div>
                )}
              </Card>
            </div>
          </Tab>

          <Tab name="Two-Stage Analysis">
            <div style={{ marginTop: spacing[3] }}>
              <Card>
                <H3 style={{ marginBottom: spacing[3] }}>
                  Two-Stage Fraud Detection Process
                </H3>

                {/* Stage flow visualization */}
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  marginBottom: spacing[4],
                  flexWrap: 'wrap'
                }}>
                  <div style={{ 
                    background: palette.blue.light2, 
                    padding: spacing[3], 
                    borderRadius: '8px',
                    flex: '1 1 200px',
                    margin: spacing[1],
                    border: `2px solid ${palette.blue.base}`
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: spacing[1] }}>
                      <Icon glyph="University" fill={palette.blue.base} />
                      <Body weight="bold" style={{ color: palette.blue.dark2, marginLeft: spacing[1] }}>
                        Stage 1: ML Detection
                      </Body>
                    </div>
                    <Body size="small" style={{ color: palette.blue.dark1 }}>
                      Machine learning models analyze transaction patterns, customer behavior, and risk indicators
                    </Body>
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', padding: `0 ${spacing[1]}px` }}>
                    <Icon glyph="ArrowRight" fill={palette.gray.dark1} />
                  </div>
                  
                  <div style={{ 
                    background: palette.purple.light2, 
                    padding: spacing[3], 
                    borderRadius: '8px',
                    flex: '1 1 200px',
                    margin: spacing[1],
                    border: `2px solid ${palette.purple.base}`
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: spacing[1] }}>
                      <Icon glyph="Diagram" fill={palette.purple.base} />
                      <Body weight="bold" style={{ color: palette.purple.dark2, marginLeft: spacing[1] }}>
                        Stage 2: Vector Analysis
                      </Body>
                    </div>
                    <Body size="small" style={{ color: palette.purple.dark1 }}>
                      Vector similarity search against known fraud patterns and suspicious transactions
                    </Body>
                  </div>
                </div>

                {/* Agent capabilities */}
                <div>
                  <Subtitle style={{ marginBottom: spacing[2] }}>
                    Agent Capabilities
                  </Subtitle>
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
                    gap: spacing[2]
                  }}>
                    <div style={{ 
                      background: palette.green.light3,
                      padding: spacing[2],
                      borderRadius: '4px',
                      borderLeft: `3px solid ${palette.green.base}`
                    }}>
                      <Body weight="medium" style={{ color: palette.green.dark2 }}>
                        Real-time Decision Making
                      </Body>
                      <Body size="small" style={{ color: palette.green.dark1 }}>
                        Instant transaction approval/rejection based on multi-stage analysis
                      </Body>
                    </div>
                    
                    <div style={{ 
                      background: palette.yellow.light3,
                      padding: spacing[2],
                      borderRadius: '4px',
                      borderLeft: `3px solid ${palette.yellow.base}`
                    }}>
                      <Body weight="medium" style={{ color: palette.yellow.dark2 }}>
                        Risk Quantification
                      </Body>
                      <Body size="small" style={{ color: palette.yellow.dark1 }}>
                        Precise risk scoring with confidence levels and detailed reasoning
                      </Body>
                    </div>
                    
                    <div style={{ 
                      background: palette.blue.light3,
                      padding: spacing[2],
                      borderRadius: '4px',
                      borderLeft: `3px solid ${palette.blue.base}`
                    }}>
                      <Body weight="medium" style={{ color: palette.blue.dark2 }}>
                        Pattern Recognition
                      </Body>
                      <Body size="small" style={{ color: palette.blue.dark1 }}>
                        Advanced vector similarity matching against fraud database
                      </Body>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </Tab>

          <Tab name="Real-time Observability">
            <div style={{ marginTop: spacing[3] }}>
              {/* Embedded Observability Dashboard */}
              <AgentObservabilityDashboard
                threadId={threadId}
                isActive={loading || (observabilityActive && threadId)}
                isWaitingForAnalysis={loading && !threadId}
                backendUrl={API_BASE_URL}
                isEmbedded={true}
              />
            </div>
          </Tab>

          <Tab name="Chat with Agent">
            <div style={{ marginTop: spacing[3] }}>
              <AgentChatInterface
                threadId={threadId}
                backendUrl={API_BASE_URL}
                agentDecision={agentResults}
              />
            </div>
          </Tab>
        </Tabs>
      </div>
    );
  };

  return (
    <Modal
      open={open}
      setOpen={setOpen}
      size="large"
      title="AI Agent Fraud Analysis"
      contentStyle={{ zIndex: 1002 }}
    >
      {/* Error display */}
      {error && (
        <div style={{ padding: spacing[3], paddingBottom: 0 }}>
          <Banner variant="danger">
            <ErrorText>{error}</ErrorText>
          </Banner>
        </div>
      )}

      {/* Loading or results content */}
      {loading ? renderLoadingContent() : renderResultsContent()}

      {/* Footer buttons */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginTop: spacing[3],
        padding: `0 ${spacing[3]}px ${spacing[3]}px`,
        borderTop: `1px solid ${palette.gray.light2}`,
        paddingTop: spacing[3]
      }}>
        <div>
          {agentResults && (
            <Body size="small" style={{ color: palette.gray.dark1 }}>
              Transaction ID: {agentResults.transaction_id}
            </Body>
          )}
        </div>
        
        <div style={{ display: 'flex', gap: spacing[2] }}>
          {/* Observability Toggle */}
          {threadId && (
            <Button 
              variant={observabilityActive ? "primary" : "default"}
              onClick={() => setObservabilityActive(!observabilityActive)}
              leftGlyph={
                <Icon 
                  glyph={observabilityActive ? "Visibility" : "EyeClosed"} 
                  fill={observabilityActive ? palette.white : palette.blue.base} 
                />
              }
              style={{
                backgroundColor: observabilityActive ? palette.blue.base : 'transparent',
                color: observabilityActive ? palette.white : palette.blue.base,
                border: `1px solid ${palette.blue.base}`
              }}
            >
              {observabilityActive ? 'Hide Monitor' : 'Show Monitor'}
            </Button>
          )}
          
          {!loading && agentResults && (
            <Button 
              variant="default"
              onClick={() => {
                setAgentResults(null);
                setActiveTab(0);
                setProcessingStage('');
                // Keep observability active for re-analysis
                // performAnalysis will be triggered by the useEffect
              }}
              leftGlyph={<Icon glyph="Refresh" />}
            >
              Re-analyze
            </Button>
          )}
          
          <Button 
            variant="primary"
            onClick={() => setOpen(false)} 
            leftGlyph={<Icon glyph="X" fill={palette.gray.light3} />}
            style={{ 
              backgroundColor: palette.green.dark2, 
              color: palette.gray.light3
            }}
          >
            Close
          </Button>
        </div>
      </div>
      
    </Modal>
  );
}

export default AgentEvaluationModal;