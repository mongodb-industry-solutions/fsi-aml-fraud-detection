"use client";

import React, { useState, useEffect, useRef } from 'react';
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
  
  // Phase 2: Centralized Observability State (moved from AgentObservabilityDashboard)
  const [observabilityState, setObservabilityState] = useState({
    isConnected: false,
    events: [],
    agentStatus: 'idle',
    currentRun: null,
    toolCalls: [],
    decisions: [],
    performanceMetrics: {},
    connectionError: null,
    lastEventId: null,
    processedEventIds: new Set(),
    connectedAgents: []  // Phase 3A: Connected agent tracking
  });
  
  const pollingIntervalRef = useRef(null);
  const lastEventIdRef = useRef(null); // Fix: Immediate update for lastEventId

  // Reset results when modal opens  
  useEffect(() => {
    if (open && agentResults) {
      setAgentResults(null);
      setActiveTab(0);
      setObservabilityActive(false);
      setThreadId(null);
      // Reset observability state
      lastEventIdRef.current = null; // Reset ref
      setObservabilityState({
        isConnected: false,
        events: [],
        agentStatus: 'idle',
        currentRun: null,
        toolCalls: [],
        decisions: [],
        performanceMetrics: {},
        connectionError: null,
        lastEventId: null,
        processedEventIds: new Set()
      });
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

  // Phase 2: Centralized Observability Polling (moved from AgentObservabilityDashboard)
  useEffect(() => {
    console.log(`🔄 ParentModal: threadId=${threadId}, observabilityActive=${observabilityActive}`);
    
    // Start polling when we have a thread and observability is active
    if (threadId && observabilityActive) {
      console.log('✅ Starting centralized polling for thread:', threadId);
      startPolling();
    } else {
      console.log('🛑 No thread or inactive, stopping centralized polling');
      stopPolling();
    }

    return () => {
      console.log('🧹 Parent cleanup: Stopping centralized polling');
      stopPolling();
    };
  }, [threadId, observabilityActive]);

  const startPolling = () => {
    if (pollingIntervalRef.current) {
      console.log('⚠️ Centralized polling already active');
      return;
    }

    console.log('✅ Starting centralized HTTP polling');
    setObservabilityState(prev => ({ ...prev, isConnected: true, connectionError: null }));
    
    // Start immediate poll
    pollForEvents();
    
    // Set up recurring polling every 500ms
    pollingIntervalRef.current = setInterval(() => {
      console.log('📡 Centralized polling tick');
      pollForEvents();
    }, 500);
  };

  const stopPolling = () => {
    if (pollingIntervalRef.current) {
      console.log('🛑 Stopping centralized HTTP polling');
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
      setObservabilityState(prev => ({ ...prev, isConnected: false }));
    }
  };

  const pollForEvents = async () => {
    if (!threadId) return;
    
    try {
      const params = new URLSearchParams();
      if (lastEventIdRef.current) {
        params.append('last_event_id', lastEventIdRef.current);
        console.log(`🔍 Using lastEventId: ${lastEventIdRef.current}`);
      } else {
        console.log('🔍 No lastEventId - fetching all events');
      }
      
      const response = await axios.get(
        `${API_BASE_URL}/observability/events/${threadId}?${params.toString()}`
      );
      
      if (response.data.events && response.data.events.length > 0) {
        // Use functional update to get current state and avoid closure issues
        setObservabilityState(prevState => {
          // Filter new events that haven't been processed using current state
          const newEvents = response.data.events.filter(event => 
            event.id && !prevState.processedEventIds.has(event.id)
          );
        
          if (newEvents.length > 0) {
            console.log(`🆕 Centralized processing ${newEvents.length} new events`);
            
            // Process each event and update state atomically
            let updatedState = { ...prevState };
            
            newEvents.forEach(event => {
              console.log(`📝 Processing event: ${event.event_type} (ID: ${event.id})`);
              // Process event and update state
              updatedState = processObservabilityEvent(event, updatedState);
            });
            
            // Update processed event IDs and last event ID
            const newProcessedIds = new Set(prevState.processedEventIds);
            newEvents.forEach(event => newProcessedIds.add(event.id));
            
            const lastEvent = newEvents[newEvents.length - 1];
            
            // Fix: Update ref immediately for next poll
            lastEventIdRef.current = lastEvent.id;
            console.log(`✅ Updated lastEventId to: ${lastEvent.id}`);
            
            return {
              ...updatedState,
              processedEventIds: newProcessedIds,
              lastEventId: lastEvent.id,
              connectionError: null
            };
          } else {
            console.log('📭 No new events (all processed)');
            return prevState; // No changes
          }
        });
      } else {
        console.log('📭 No events received');
      }
    } catch (error) {
      console.error('❌ Centralized polling error:', error);
      setObservabilityState(prev => ({ 
        ...prev, 
        connectionError: 'Failed to fetch events' 
      }));
    }
  };

  // Atomic event processing function to prevent duplicates
  const processObservabilityEvent = (eventData, currentState) => {
    const { event_type, data, timestamp, run_id, agent_id } = eventData;
    
    // Start with current state
    let updatedState = { ...currentState };
    
    // Add to events log (avoid duplicates by checking if already exists)
    const eventExists = updatedState.events.some(existingEvent => existingEvent.id === eventData.id);
    if (!eventExists) {
      updatedState.events = [
        ...updatedState.events.slice(-99), // Keep last 100 events
        { ...eventData, id: eventData.id || Date.now() + Math.random() }
      ];
    }

    // Update state based on event type
    switch (event_type) {
      case 'agent_run_started':
        updatedState.agentStatus = 'running';
        updatedState.currentRun = {
          run_id,
          agent_id,
          started_at: timestamp,
          status: 'in_progress'
        };
        break;

      case 'agent_run_completed':
        updatedState.agentStatus = 'completed';
        updatedState.currentRun = updatedState.currentRun ? {
          ...updatedState.currentRun,
          completed_at: timestamp,
          status: 'completed',
          response: data.response
        } : null;
        break;

      case 'tool_call_initiated':
        updatedState.toolCalls = [
          ...updatedState.toolCalls,
          {
            id: data.tool_call_id,
            name: data.tool_name,
            arguments: data.arguments,
            status: 'initiated',
            started_at: timestamp
          }
        ];
        break;

      case 'tool_call_completed':
        updatedState.toolCalls = updatedState.toolCalls.map(call =>
          call.id === data.tool_call_id
            ? {
                ...call,
                status: 'completed',
                result: data.result,
                completed_at: timestamp,
                execution_time_ms: data.execution_time_ms
              }
            : call
        );
        break;

      case 'decision_made':
        const newDecision = {
          run_id,
          agent_id,
          decision_type: data.decision_type,
          decision_summary: data.decision_summary,
          confidence_score: data.confidence_score,
          reasoning: data.reasoning || [],
          timestamp
        };
        
        // Avoid duplicate decisions
        const decisionExists = updatedState.decisions.some(d => 
          d.run_id === run_id && d.timestamp === timestamp
        );
        if (!decisionExists) {
          updatedState.decisions = [...updatedState.decisions, newDecision];
        }
        break;

      case 'performance_metrics':
        updatedState.performanceMetrics = {
          ...updatedState.performanceMetrics,
          [agent_id]: data
        };
        break;

      // Connected Agent Events (Phase 3A)
      case 'connected_agent_started':
        updatedState.connectedAgents = [
          ...updatedState.connectedAgents.filter(agent => 
            agent.connected_thread_id !== data.connected_thread_id
          ),
          {
            connected_agent_name: data.connected_agent_name,
            connected_thread_id: data.connected_thread_id,
            analysis_type: data.analysis_type,
            status: data.status,
            started_at: timestamp
          }
        ];
        break;

      case 'connected_agent_completed':
        updatedState.connectedAgents = updatedState.connectedAgents.map(agent =>
          agent.connected_thread_id === data.connected_thread_id
            ? {
                ...agent,
                status: data.status,
                analysis_results: data.analysis_results,
                execution_time_ms: data.execution_time_ms,
                completed_at: timestamp
              }
            : agent
        );
        break;

      case 'connected_agent_progress':
        updatedState.connectedAgents = updatedState.connectedAgents.map(agent =>
          agent.connected_thread_id === data.connected_thread_id
            ? {
                ...agent,
                progress_message: data.progress_message,
                progress_percentage: data.progress_percentage,
                status: 'in_progress'
              }
            : agent
        );
        break;

      case 'connected_agent_failed':
        updatedState.connectedAgents = updatedState.connectedAgents.map(agent =>
          agent.connected_thread_id === data.connected_thread_id
            ? {
                ...agent,
                status: 'failed',
                error: data.error || 'Analysis failed'
              }
            : agent
        );
        break;

      default:
        console.log('📡 Processed observability event:', event_type, data);
    }
    
    return updatedState;
  };


  const clearObservabilityHistory = async () => {
    try {
      if (threadId) {
        await axios.delete(`${API_BASE_URL}/observability/history/${threadId}`);
      }
      lastEventIdRef.current = null; // Reset ref
      setObservabilityState(prev => ({
        ...prev,
        events: [],
        toolCalls: [],
        decisions: [],
        performanceMetrics: {},
        lastEventId: null,
        processedEventIds: new Set(),
        connectedAgents: []  // Phase 3A: Clear connected agents too
      }));
    } catch (error) {
      console.error('Failed to clear history:', error);
    }
  };

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

  // Removed renderLoadingContent - now integrated into first tab of renderTabsContent

  // Render agent evaluation header with status
  const renderAgentHeader = () => {
    const getAgentStatus = () => {
      if (loading) return { 
        iconGlyph: 'Bulb', 
        text: 'Agent Analyzing', 
        color: palette.blue.base, 
        badge: 'blue' 
      };
      if (agentResults?.decision === 'APPROVE') return { 
        iconGlyph: 'Checkmark', 
        text: 'Analysis Complete', 
        color: palette.green.dark1, 
        badge: 'green' 
      };
      if (agentResults?.decision === 'REJECT') return { 
        iconGlyph: 'X', 
        text: 'High Risk Detected', 
        color: palette.red.base, 
        badge: 'red' 
      };
      if (agentResults?.decision === 'INVESTIGATE') return { 
        iconGlyph: 'Warning', 
        text: 'Investigation Required', 
        color: palette.yellow.dark2, 
        badge: 'yellow' 
      };
      return { 
        iconGlyph: 'Clock', 
        text: 'Initializing', 
        color: palette.gray.base, 
        badge: 'gray' 
      };
    };

    const status = getAgentStatus();
    
    return (
      <Card style={{ marginBottom: spacing[3], background: `linear-gradient(135deg, ${palette.blue.light3}, ${palette.white})` }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          padding: spacing[3]
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2] }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: status.color,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Icon glyph={status.iconGlyph} fill={palette.white} size={20} />
            </div>
            <div>
              <H2 style={{ margin: 0, color: status.color, display: 'flex', alignItems: 'center', gap: spacing[2] }}>
                ThreatSight AI Agent
                <Badge variant={status.badge} style={{ fontSize: '12px' }}>
                  {status.text}
                </Badge>
              </H2>
              <Body style={{ margin: 0, color: palette.gray.dark1 }}>
                {loading 
                  ? `Two-stage fraud detection in progress • ${processingStage || 'Initializing...'}`
                  : agentResults
                    ? `Analysis completed in ${agentResults.processing_time_ms}ms • Risk Score: ${Math.round(agentResults.risk_score)}%`
                    : 'Ready to analyze transaction'
                }
              </Body>
            </div>
          </div>
          
          {/* Real-time indicators */}
          <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2] }}>
            {loading && (
              <div style={{ display: 'flex', alignItems: 'center', gap: spacing[1] }}>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                <Body size="small" style={{ color: palette.blue.dark1 }}>Live</Body>
              </div>
            )}
            {threadId && (
              <Badge variant="lightgray" style={{ fontFamily: 'monospace', fontSize: '10px' }}>
                {threadId.substring(0, 8)}...
              </Badge>
            )}
          </div>
        </div>
      </Card>
    );
  };

  // Render enhanced tabs with modern design
  const renderTabsContent = () => {
    return (
      <div>
        {/* Agent Header */}
        {renderAgentHeader()}
        
        {/* Enhanced Tabs */}
        <div style={{ padding: spacing[3] }}>
          <Tabs
            selected={activeTab}
            setSelected={setActiveTab}
            aria-label="Agent analysis tabs"
          >
            <Tab name={loading ? "Live Analysis" : "Agent Decision"}>
            <div style={{ marginTop: spacing[3] }}>
              {loading ? (
                // Enhanced loading state with stage progression
                <div>
                  {/* Two-stage pipeline visualization */}
                  <Card style={{ marginBottom: spacing[3], background: palette.blue.light3 }}>
                    <H3 style={{ color: palette.blue.dark2, marginBottom: spacing[3], display: 'flex', alignItems: 'center', gap: spacing[2] }}>
                      <Icon glyph="Diagram" fill={palette.blue.base} size={20} />
                      Two-Stage Fraud Detection Pipeline
                    </H3>
                    
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      gap: spacing[3]
                    }}>
                      <div style={{ 
                        background: palette.white, 
                        padding: spacing[3], 
                        borderRadius: '12px',
                        border: `2px solid ${palette.blue.base}`,
                        flex: 1,
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2], marginBottom: spacing[2] }}>
                          <div style={{ fontSize: '18px' }}>🏛️</div>
                          <Body weight="bold" style={{ color: palette.blue.dark2 }}>
                            Stage 1: ML Detection
                          </Body>
                          <Badge variant="blue" style={{ fontSize: '10px' }}>
                            RULES ENGINE
                          </Badge>
                        </div>
                        <Body size="small" style={{ color: palette.blue.dark1, lineHeight: 1.4 }}>
                          Historical pattern matching, velocity analysis, and risk scoring using machine learning models
                        </Body>
                      </div>
                      
                      <div style={{ display: 'flex', alignItems: 'center', fontSize: '20px' }}>
                        <Icon glyph="ArrowRight" fill={palette.blue.base} />
                      </div>
                      
                      <div style={{ 
                        background: palette.white, 
                        padding: spacing[3], 
                        borderRadius: '12px',
                        border: `2px solid ${palette.purple.base}`,
                        flex: 1,
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2], marginBottom: spacing[2] }}>
                          <Icon glyph="Bulb" fill={palette.purple.base} size={20} />
                          <Body weight="bold" style={{ color: palette.purple.dark2 }}>
                            Stage 2: AI Agent Analysis
                          </Body>
                          <Badge variant="darkgray" style={{ fontSize: '10px' }}>
                            VECTOR SEARCH
                          </Badge>
                        </div>
                        <Body size="small" style={{ color: palette.purple.dark1, lineHeight: 1.4 }}>
                          Semantic similarity search and agent-powered reasoning with comprehensive tool usage
                        </Body>
                      </div>
                    </div>
                  </Card>
                  
                  {/* Live guidance */}
                  <Card style={{ background: `linear-gradient(135deg, ${palette.green.light3}, ${palette.white})` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2], marginBottom: spacing[2] }}>
                      <Icon glyph="ActivityFeed" fill={palette.green.base} size={20} />
                      <Body weight="bold" style={{ color: palette.green.dark2 }}>
                        Live Agent Observability Available
                      </Body>
                    </div>
                    <Body style={{ color: palette.green.dark1, marginBottom: spacing[2] }}>
                      Switch to the <strong>Real-time Observability</strong> tab to monitor agent execution in real-time
                    </Body>
                    <div style={{ display: 'flex', gap: spacing[2], flexWrap: 'wrap' }}>
                      <Badge variant="green" style={{ fontSize: '11px' }}>Tool Execution</Badge>
                      <Badge variant="green" style={{ fontSize: '11px' }}>Decision Process</Badge>
                      <Badge variant="green" style={{ fontSize: '11px' }}>Performance Metrics</Badge>
                      <Badge variant="green" style={{ fontSize: '11px' }}>Event Timeline</Badge>
                    </div>
                  </Card>
                  
                  {/* Simulated Status Display */}
                  <Card style={{ 
                    marginBottom: spacing[3], 
                    background: `linear-gradient(135deg, ${palette.blue.light3}, ${palette.white})`,
                    border: `2px solid ${palette.blue.base}`
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2], marginBottom: spacing[3] }}>
                      <Icon glyph="ActivityFeed" fill={palette.blue.base} size={20} />
                      <H3 style={{ margin: 0, color: palette.blue.dark2 }}>
                        Live Analysis Progress
                      </H3>
                      <Badge variant="blue" style={{ fontSize: '11px' }}>
                        SIMULATED STATUS
                      </Badge>
                    </div>
                    
                    {/* Stage Progress Indicators */}
                    <div style={{ marginBottom: spacing[3] }}>
                      <div style={{ display: 'flex', alignItems: 'center', marginBottom: spacing[2] }}>
                        <div style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          background: palette.green.base,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginRight: spacing[2]
                        }}>
                          <Icon glyph="Checkmark" fill={palette.white} size={16} />
                        </div>
                        <Body weight="medium" style={{ color: palette.green.dark2, flex: 1 }}>
                          Stage 1: Rules + Basic ML Analysis
                        </Body>
                        <Badge variant="green" style={{ fontSize: '10px' }}>COMPLETED</Badge>
                      </div>
                      
                      <div style={{ display: 'flex', alignItems: 'center', marginBottom: spacing[2] }}>
                        <div style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          background: palette.yellow.base,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginRight: spacing[2],
                          animation: 'pulse 2s infinite'
                        }}>
                          <div style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            background: palette.white,
                            animation: 'pulse 1s infinite'
                          }} />
                        </div>
                        <Body weight="medium" style={{ color: palette.yellow.dark2, flex: 1 }}>
                          Stage 2: AI Agent Analysis in Progress
                        </Body>
                        <Badge variant="yellow" style={{ fontSize: '10px' }}>IN PROGRESS</Badge>
                      </div>
                      
                      <div style={{ marginLeft: spacing[4], paddingLeft: spacing[2], borderLeft: `2px solid ${palette.gray.light1}` }}>
                        <div style={{ display: 'flex', alignItems: 'center', marginBottom: spacing[1] }}>
                          <Icon glyph="Target" fill={palette.blue.base} size={16} />
                          <Body size="small" style={{ color: palette.blue.dark1, marginLeft: spacing[1] }}>
                            Analyzing transaction patterns...
                          </Body>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', marginBottom: spacing[1] }}>
                          <Icon glyph="MagnifyingGlass" fill={palette.purple.base} size={16} />
                          <Body size="small" style={{ color: palette.purple.dark1, marginLeft: spacing[1] }}>
                            Searching similar transactions...
                          </Body>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', marginBottom: spacing[1] }}>
                          <Icon glyph="Connect" fill={palette.purple.base} size={16} />
                          <Body size="small" style={{ color: palette.purple.dark1, marginLeft: spacing[1] }}>
                            Evaluating connected agent requirements...
                          </Body>
                        </div>
                      </div>
                    </div>
                    
                    {/* Current Activity */}
                    <div style={{ 
                      background: `linear-gradient(135deg, ${palette.gray.light3}, ${palette.white})`,
                      padding: spacing[2],
                      borderRadius: '8px',
                      border: `1px solid ${palette.gray.light1}`
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2] }}>
                        <div style={{
                          width: '16px',
                          height: '16px',
                          borderRadius: '50%',
                          background: palette.blue.base,
                          animation: 'pulse 1s infinite'
                        }} />
                        <Body size="small" weight="medium" style={{ color: palette.blue.dark2 }}>
                          Azure AI Agent processing transaction...
                        </Body>
                      </div>
                      <Body size="small" style={{ color: palette.gray.dark1, marginTop: spacing[1] }}>
                        The AI agent is analyzing the transaction using strategic tool selection. 
                        This process typically takes 2-5 seconds depending on complexity.
                      </Body>
                    </div>
                  </Card>
                </div>
              ) : agentResults ? (
                // Enhanced results display
                <div>
                  {/* Decision Summary Card */}
                  <Card style={{ 
                    marginBottom: spacing[3], 
                    background: `linear-gradient(135deg, ${
                      agentResults.decision === 'APPROVE' ? palette.green.light3 :
                      agentResults.decision === 'REJECT' ? palette.red.light3 :
                      palette.yellow.light3
                    }, ${palette.white})`
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: spacing[3], marginBottom: spacing[3] }}>
                      <div style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '50%',
                        background: agentResults.decision === 'APPROVE' ? palette.green.base :
                                   agentResults.decision === 'REJECT' ? palette.red.base : palette.yellow.base,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <Icon 
                          glyph={agentResults.decision === 'APPROVE' ? 'Checkmark' :
                                agentResults.decision === 'REJECT' ? 'X' : 'Warning'}
                          fill={palette.white}
                          size={24}
                        />
                      </div>
                      <div style={{ flex: 1 }}>
                        <H2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: spacing[2] }}>
                          Agent Decision
                          {renderDecisionBadge(agentResults.decision)}
                          {renderRiskLevelBadge(agentResults.risk_level)}
                        </H2>
                        <Body style={{ margin: 0, color: palette.gray.dark1 }}>
                          {agentResults.decision === 'APPROVE' ? 'Transaction approved - Low risk detected' :
                           agentResults.decision === 'REJECT' ? 'Transaction rejected - High fraud risk' :
                           'Manual review required - Suspicious patterns detected'}
                        </Body>
                      </div>
                    </div>
                  </Card>
                  
                  {/* Performance Metrics Grid */}
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', 
                    gap: spacing[2],
                    marginBottom: spacing[3]
                  }}>
                    <Card style={{ textAlign: 'center', background: palette.blue.light3 }}>
                      <Icon glyph="Target" fill={palette.blue.base} size={28} style={{ marginBottom: spacing[1] }} />
                      <H3 style={{ margin: 0, color: palette.blue.dark2, fontSize: '24px' }}>
                        {Math.round(agentResults.risk_score)}%
                      </H3>
                      <Body size="small" style={{ color: palette.blue.dark1, fontWeight: 'bold' }}>
                        Risk Score
                      </Body>
                    </Card>
                    
                    <Card style={{ textAlign: 'center', background: palette.green.light3 }}>
                      <Icon glyph="ChartLine" fill={palette.green.base} size={28} style={{ marginBottom: spacing[1] }} />
                      <H3 style={{ margin: 0, color: palette.green.dark2, fontSize: '24px' }}>
                        {(agentResults.confidence * 100).toFixed(1)}%
                      </H3>
                      <Body size="small" style={{ color: palette.green.dark1, fontWeight: 'bold' }}>
                        Confidence
                      </Body>
                    </Card>
                    
                    <Card style={{ textAlign: 'center', background: palette.purple.light3 }}>
                      <Icon glyph="Clock" fill={palette.purple.base} size={28} style={{ marginBottom: spacing[1] }} />
                      <H3 style={{ margin: 0, color: palette.purple.dark2, fontSize: '24px' }}>
                        {agentResults.processing_time_ms}ms
                      </H3>
                      <Body size="small" style={{ color: palette.purple.dark1, fontWeight: 'bold' }}>
                        Processing Time
                      </Body>
                    </Card>
                    
                    <Card style={{ textAlign: 'center', background: palette.yellow.light3 }}>
                      <Icon glyph="Building" fill={palette.yellow.base} size={28} style={{ marginBottom: spacing[1] }} />
                      <H3 style={{ margin: 0, color: palette.yellow.dark2, fontSize: '24px' }}>
                        {agentResults.stage_completed}
                      </H3>
                      <Body size="small" style={{ color: palette.yellow.dark1, fontWeight: 'bold' }}>
                        Stage Completed
                      </Body>
                    </Card>
                  </div>
                  
                  {/* Agent Reasoning */}
                  <Card style={{ background: palette.gray.light3 }}>
                    <H3 style={{ color: palette.gray.dark3, marginBottom: spacing[2], display: 'flex', alignItems: 'center', gap: spacing[2] }}>
                      <Icon glyph="Bulb" fill={palette.gray.base} size={20} />
                      Agent Reasoning
                    </H3>
                    <div style={{ 
                      background: palette.white,
                      padding: spacing[3],
                      borderRadius: '8px',
                      borderLeft: `4px solid ${
                        agentResults.decision === 'APPROVE' ? palette.green.base :
                        agentResults.decision === 'REJECT' ? palette.red.base :
                        palette.yellow.base
                      }`
                    }}>
                      <Body style={{ lineHeight: 1.6, color: palette.gray.dark2 }}>
                        {agentResults.reasoning || 'No detailed reasoning provided by the agent.'}
                      </Body>
                    </div>
                  </Card>
                </div>
              ) : (
                // No results yet - this shouldn't show since we handle loading above
                <div style={{ textAlign: 'center', padding: spacing[4] }}>
                  <Body style={{ color: palette.gray.dark1 }}>
                    Analysis will appear here once completed.
                  </Body>
                </div>
              )}
            </div>
          </Tab>

          <Tab name="Technical Deep-Dive">
            <div style={{ marginTop: spacing[3] }}>
              {/* Enhanced technical architecture header */}
              <Card style={{ 
                marginBottom: spacing[3], 
                background: `linear-gradient(135deg, ${palette.gray.light3}, ${palette.white})`,
                border: `2px solid ${palette.gray.base}`
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2], marginBottom: spacing[2] }}>
                  <Icon glyph="Settings" fill={palette.gray.dark2} size={24} />
                  <H3 style={{ margin: 0, color: palette.gray.dark3 }}>
                    Technical Architecture Deep-Dive
                  </H3>
                  <Badge variant="lightgray" style={{ fontSize: '11px' }}>
                    TWO-STAGE PIPELINE
                  </Badge>
                </div>
                <Body style={{ color: palette.gray.dark1 }}>
                  Comprehensive technical overview of the multi-stage fraud detection architecture and agent capabilities
                </Body>
              </Card>

              {/* Enhanced stage flow visualization */}
              <Card style={{ marginBottom: spacing[4] }}>
                <H3 style={{ marginBottom: spacing[3], display: 'flex', alignItems: 'center', gap: spacing[2] }}>
                  <Icon glyph="Diagram" fill={palette.blue.base} />
                  Processing Pipeline
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
                    background: `linear-gradient(135deg, ${palette.blue.light2}, ${palette.blue.light3})`,
                    padding: spacing[3], 
                    borderRadius: '12px',
                    flex: '1 1 280px',
                    margin: spacing[1],
                    border: `2px solid ${palette.blue.base}`,
                    boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: spacing[2] }}>
                      <div style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        background: palette.blue.base,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: spacing[2]
                      }}>
                        <Icon glyph="University" fill={palette.white} size={18} />
                      </div>
                      <div>
                        <Body weight="bold" style={{ color: palette.blue.dark2, margin: 0 }}>
                          Stage 1: Rules + Basic ML
                        </Body>
                        <Body size="small" style={{ color: palette.blue.dark1, margin: 0 }}>
                          Fast triage (70-80% of transactions)
                        </Body>
                      </div>
                    </div>
                    <Body size="small" style={{ color: palette.blue.dark1, lineHeight: 1.4 }}>
                      Rules-based analysis combined with basic ML scoring for immediate approve/block decisions. Edge cases (25-85 risk score) proceed to Stage 2.
                    </Body>
                    <div style={{ marginTop: spacing[2], paddingTop: spacing[2], borderTop: `1px solid ${palette.blue.light1}` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Body size="small" weight="medium" style={{ color: palette.blue.dark2 }}>Processing Time</Body>
                        <Badge variant="blue" style={{ fontSize: '10px' }}>~200ms</Badge>
                      </div>
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', padding: `0 ${spacing[2]}px` }}>
                    <Icon glyph="ArrowRight" fill={palette.gray.dark1} size={20} />
                  </div>
                  
                  <div style={{ 
                    background: `linear-gradient(135deg, ${palette.purple.light2}, ${palette.purple.light3})`,
                    padding: spacing[3], 
                    borderRadius: '12px',
                    flex: '1 1 280px',
                    margin: spacing[1],
                    border: `2px solid ${palette.purple.base}`,
                    boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: spacing[2] }}>
                      <div style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        background: palette.purple.base,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: spacing[2]
                      }}>
                        <Icon glyph="Diagram" fill={palette.white} size={18} />
                      </div>
                      <div>
                        <Body weight="bold" style={{ color: palette.purple.dark2, margin: 0 }}>
                          Stage 2: AI Agent Analysis
                        </Body>
                        <Body size="small" style={{ color: palette.purple.dark1, margin: 0 }}>
                          Deep investigation (20-30% of transactions)
                        </Body>
                      </div>
                    </div>
                    <Body size="small" style={{ color: palette.purple.dark1, lineHeight: 1.4 }}>
                      Azure AI Foundry agent with strategic tool selection: transaction patterns, vector search, network analysis, sanctions checks, and connected SAR analysis.
                    </Body>
                    <div style={{ marginTop: spacing[2], paddingTop: spacing[2], borderTop: `1px solid ${palette.purple.light1}` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Body size="small" weight="medium" style={{ color: palette.purple.dark2 }}>Processing Time</Body>
                        <Badge variant="lightgray" style={{ fontSize: '10px' }}>~2-5s</Badge>
                      </div>
                    </div>
                  </div>
                </div>

              </Card>

              {/* Enhanced agent capabilities grid */}
              <Card style={{ marginBottom: spacing[4] }}>
                <H3 style={{ marginBottom: spacing[3], display: 'flex', alignItems: 'center', gap: spacing[2] }}>
                  <Icon glyph="Beaker" fill={palette.green.base} />
                  Agent Capabilities Matrix
                </H3>
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
                  gap: spacing[3]
                }}>
                  <div style={{ 
                    background: `linear-gradient(135deg, ${palette.green.light3}, ${palette.green.light2})`,
                    padding: spacing[3],
                    borderRadius: '8px',
                    borderLeft: `4px solid ${palette.green.base}`,
                    boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: spacing[2] }}>
                      <Icon glyph="Target" fill={palette.green.base} size={20} />
                      <Body weight="bold" style={{ color: palette.green.dark2, marginLeft: spacing[1] }}>
                        Real-time Decision Making
                      </Body>
                    </div>
                    <Body size="small" style={{ color: palette.green.dark1, lineHeight: 1.4, marginBottom: spacing[2] }}>
                      Instant transaction approval/rejection based on multi-stage analysis with confidence scoring
                    </Body>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Body size="small" weight="medium" style={{ color: palette.green.dark2 }}>Response Time</Body>
                      <Badge variant="green" style={{ fontSize: '10px' }}>Sub-second</Badge>
                    </div>
                  </div>
                  
                  <div style={{ 
                    background: `linear-gradient(135deg, ${palette.yellow.light3}, ${palette.yellow.light2})`,
                    padding: spacing[3],
                    borderRadius: '8px',
                    borderLeft: `4px solid ${palette.yellow.base}`,
                    boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: spacing[2] }}>
                      <Icon glyph="Charts" fill={palette.yellow.base} size={20} />
                      <Body weight="bold" style={{ color: palette.yellow.dark2, marginLeft: spacing[1] }}>
                        Risk Quantification
                      </Body>
                    </div>
                    <Body size="small" style={{ color: palette.yellow.dark1, lineHeight: 1.4, marginBottom: spacing[2] }}>
                      Precise risk scoring with confidence levels and detailed reasoning chains
                    </Body>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Body size="small" weight="medium" style={{ color: palette.yellow.dark2 }}>Accuracy</Body>
                      <Badge variant="yellow" style={{ fontSize: '10px' }}>94.7%</Badge>
                    </div>
                  </div>
                  
                  <div style={{ 
                    background: `linear-gradient(135deg, ${palette.blue.light3}, ${palette.blue.light2})`,
                    padding: spacing[3],
                    borderRadius: '8px',
                    borderLeft: `4px solid ${palette.blue.base}`,
                    boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: spacing[2] }}>
                      <Icon glyph="MagnifyingGlass" fill={palette.blue.base} size={20} />
                      <Body weight="bold" style={{ color: palette.blue.dark2, marginLeft: spacing[1] }}>
                        Pattern Recognition
                      </Body>
                    </div>
                    <Body size="small" style={{ color: palette.blue.dark1, lineHeight: 1.4, marginBottom: spacing[2] }}>
                      Advanced vector similarity matching against comprehensive fraud pattern database
                    </Body>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Body size="small" weight="medium" style={{ color: palette.blue.dark2 }}>Pattern DB</Body>
                      <Badge variant="blue" style={{ fontSize: '10px' }}>50K+ patterns</Badge>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Connected Agent Architecture (Phase 3A) */}
              <Card style={{ marginBottom: spacing[4] }}>
                <H3 style={{ marginBottom: spacing[3], display: 'flex', alignItems: 'center', gap: spacing[2] }}>
                  <Icon glyph="Connect" fill={palette.purple.base} />
                  Connected Agent Architecture
                  <Badge variant="lightgray" style={{ fontSize: '11px' }}>PHASE 3A</Badge>
                </H3>
                <Body style={{ color: palette.gray.dark1, marginBottom: spacing[3] }}>
                  Multi-agent collaboration for complex fraud investigations using specialized connected agents.
                </Body>
                
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
                  gap: spacing[3]
                }}>
                  {/* Main Agent */}
                  <div style={{ 
                    background: `linear-gradient(135deg, ${palette.blue.light3}, ${palette.blue.light2})`,
                    padding: spacing[3],
                    borderRadius: '8px',
                    border: `2px solid ${palette.blue.base}`,
                    boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: spacing[2] }}>
                      <Icon glyph="Diagram" fill={palette.blue.base} size={20} />
                      <Body weight="bold" style={{ color: palette.blue.dark2, marginLeft: spacing[1] }}>
                        Primary Fraud Agent
                      </Body>
                    </div>
                    <Body size="small" style={{ color: palette.blue.dark1, lineHeight: 1.4, marginBottom: spacing[2] }}>
                      Orchestrates analysis with strategic tool selection using 4 custom functions plus Connected Agent capability
                    </Body>
                    <div style={{ paddingTop: spacing[1], borderTop: `1px solid ${palette.blue.light1}` }}>
                      <Body size="small" weight="medium" style={{ color: palette.blue.dark2 }}>Function Tools: 4 + Connected Agents</Body>
                    </div>
                  </div>

                  {/* Connected Agent */}
                  <div style={{ 
                    background: `linear-gradient(135deg, ${palette.purple.light3}, ${palette.purple.light2})`,
                    padding: spacing[3],
                    borderRadius: '8px',
                    border: `2px solid ${palette.purple.base}`,
                    boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: spacing[2] }}>
                      <Icon glyph="File" fill={palette.purple.base} size={20} />
                      <Body weight="bold" style={{ color: palette.purple.dark2, marginLeft: spacing[1] }}>
                        SuspiciousReportsAgent
                      </Body>
                    </div>
                    <Body size="small" style={{ color: palette.purple.dark1, lineHeight: 1.4, marginBottom: spacing[2] }}>
                      Specialized SAR (Suspicious Activity Reports) analysis with file access and code interpreter capabilities
                    </Body>
                    <div style={{ paddingTop: spacing[1], borderTop: `1px solid ${palette.purple.light1}` }}>
                      <Body size="small" weight="medium" style={{ color: palette.purple.dark2 }}>Tools: File Reader + Code Interpreter</Body>
                    </div>
                  </div>
                </div>

                {/* Agent Communication Flow */}
                <div style={{ 
                  marginTop: spacing[4], 
                  padding: spacing[3], 
                  background: palette.gray.light3, 
                  borderRadius: '8px',
                  border: `1px solid ${palette.gray.light1}`
                }}>
                  <Body weight="bold" style={{ color: palette.gray.dark2, marginBottom: spacing[2] }}>
                    Multi-Thread Communication Flow
                  </Body>
                  <Body size="small" style={{ color: palette.gray.dark1, lineHeight: 1.5 }}>
                    1. Primary agent analyzes transaction and identifies complex patterns<br/>
                    2. Creates dedicated thread for SuspiciousReportsAgent when criteria met<br/>
                    3. Passes transaction context and preliminary findings<br/>
                    4. SAR agent performs historical analysis and returns insights<br/>
                    5. Primary agent integrates findings for final decision
                  </Body>
                </div>
              </Card>

              {/* Agent Tools Detail */}
              <Card style={{ marginBottom: spacing[4] }}>
                <H3 style={{ marginBottom: spacing[3], display: 'flex', alignItems: 'center', gap: spacing[2] }}>
                  <Icon glyph="Wrench" fill={palette.green.base} />
                  Agent Tools & Capabilities
                </H3>
                
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', 
                  gap: spacing[4]
                }}>
                  {/* Primary Agent Tools */}
                  <div>
                    <div style={{ 
                      background: `linear-gradient(135deg, ${palette.blue.light3}, ${palette.blue.light2})`,
                      padding: spacing[3],
                      borderRadius: '8px',
                      border: `2px solid ${palette.blue.base}`,
                      marginBottom: spacing[3]
                    }}>
                      <Body weight="bold" style={{ color: palette.blue.dark2, marginBottom: spacing[2] }}>
                        🏛️ Primary Fraud Agent - Function Tools
                      </Body>
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[2] }}>
                      <div style={{ 
                        background: palette.gray.light3, 
                        padding: spacing[2], 
                        borderRadius: '6px',
                        borderLeft: `3px solid ${palette.green.base}`
                      }}>
                        <Body size="small" weight="bold" style={{ color: palette.gray.dark2 }}>
                          analyze_transaction_patterns()
                        </Body>
                        <Body size="small" style={{ color: palette.gray.dark1 }}>
                          Customer behavioral analysis and anomaly detection
                        </Body>
                      </div>
                      
                      <div style={{ 
                        background: palette.gray.light3, 
                        padding: spacing[2], 
                        borderRadius: '6px',
                        borderLeft: `3px solid ${palette.blue.base}`
                      }}>
                        <Body size="small" weight="bold" style={{ color: palette.gray.dark2 }}>
                          search_similar_transactions()
                        </Body>
                        <Body size="small" style={{ color: palette.gray.dark1 }}>
                          Vector similarity search against historical fraud patterns
                        </Body>
                      </div>
                      
                      <div style={{ 
                        background: palette.gray.light3, 
                        padding: spacing[2], 
                        borderRadius: '6px',
                        borderLeft: `3px solid ${palette.red.base}`
                      }}>
                        <Body size="small" weight="bold" style={{ color: palette.gray.dark2 }}>
                          calculate_network_risk()
                        </Body>
                        <Body size="small" style={{ color: palette.gray.dark1 }}>
                          Network analysis for fraud rings and suspicious connections
                        </Body>
                      </div>
                      
                      <div style={{ 
                        background: palette.gray.light3, 
                        padding: spacing[2], 
                        borderRadius: '6px',
                        borderLeft: `3px solid ${palette.yellow.base}`
                      }}>
                        <Body size="small" weight="bold" style={{ color: palette.gray.dark2 }}>
                          check_sanctions_lists()
                        </Body>
                        <Body size="small" style={{ color: palette.gray.dark1 }}>
                          PEP and sanctions screening for regulatory compliance
                        </Body>
                      </div>
                      
                      <div style={{ 
                        background: palette.gray.light3, 
                        padding: spacing[2], 
                        borderRadius: '6px',
                        borderLeft: `3px solid ${palette.purple.base}`
                      }}>
                        <Body size="small" weight="bold" style={{ color: palette.gray.dark2 }}>
                          ConnectedAgentTool
                        </Body>
                        <Body size="small" style={{ color: palette.gray.dark1 }}>
                          Ability to create and communicate with specialized connected agents
                        </Body>
                      </div>
                    </div>
                  </div>
                  
                  {/* Connected Agent Tools */}
                  <div>
                    <div style={{ 
                      background: `linear-gradient(135deg, ${palette.purple.light3}, ${palette.purple.light2})`,
                      padding: spacing[3],
                      borderRadius: '8px',
                      border: `2px solid ${palette.purple.base}`,
                      marginBottom: spacing[3]
                    }}>
                      <Body weight="bold" style={{ color: palette.purple.dark2, marginBottom: spacing[2] }}>
                        📄 SuspiciousReportsAgent - Built-in Tools
                      </Body>
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[2] }}>
                      <div style={{ 
                        background: palette.gray.light3, 
                        padding: spacing[2], 
                        borderRadius: '6px',
                        borderLeft: `3px solid ${palette.purple.base}`
                      }}>
                        <Body size="small" weight="bold" style={{ color: palette.gray.dark2 }}>
                          File Reader
                        </Body>
                        <Body size="small" style={{ color: palette.gray.dark1 }}>
                          Access to historical SAR files and regulatory documents for pattern analysis
                        </Body>
                      </div>
                      
                      <div style={{ 
                        background: palette.gray.light3, 
                        padding: spacing[2], 
                        borderRadius: '6px',
                        borderLeft: `3px solid ${palette.purple.base}`
                      }}>
                        <Body size="small" weight="bold" style={{ color: palette.gray.dark2 }}>
                          Code Interpreter
                        </Body>
                        <Body size="small" style={{ color: palette.gray.dark1 }}>
                          Advanced data analysis and statistical computations for complex pattern matching
                        </Body>
                      </div>
                      
                      <div style={{ 
                        background: `linear-gradient(135deg, ${palette.purple.light2}, ${palette.purple.light1})`, 
                        padding: spacing[2], 
                        borderRadius: '6px',
                        border: `1px solid ${palette.purple.base}`
                      }}>
                        <Body size="small" weight="bold" style={{ color: palette.purple.dark2, marginBottom: spacing[1] }}>
                          Specialization: Historical SAR Analysis
                        </Body>
                        <Body size="small" style={{ color: palette.purple.dark1 }}>
                          Reviews historical suspicious activity reports to identify patterns and provide contextual analysis for current transactions
                        </Body>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Tool Strategy Guide */}
              <Card style={{ marginBottom: spacing[4] }}>
                <H3 style={{ marginBottom: spacing[3], display: 'flex', alignItems: 'center', gap: spacing[2] }}>
                  <Icon glyph="Bulb" fill={palette.yellow.base} />
                  Strategic Tool Selection
                </H3>
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
                  gap: spacing[3]
                }}>
                  <div style={{ 
                    background: `linear-gradient(135deg, ${palette.green.light3}, ${palette.green.light2})`,
                    padding: spacing[3],
                    borderRadius: '8px',
                    borderLeft: `4px solid ${palette.green.base}`,
                  }}>
                    <Body weight="bold" style={{ color: palette.green.dark2, marginBottom: spacing[1] }}>
                      analyze_transaction_patterns()
                    </Body>
                    <Body size="small" style={{ color: palette.green.dark1, lineHeight: 1.4 }}>
                      Always used first - establishes customer behavioral baseline and identifies anomalies
                    </Body>
                  </div>
                  
                  <div style={{ 
                    background: `linear-gradient(135deg, ${palette.blue.light3}, ${palette.blue.light2})`,
                    padding: spacing[3],
                    borderRadius: '8px',
                    borderLeft: `4px solid ${palette.blue.base}`,
                  }}>
                    <Body weight="bold" style={{ color: palette.blue.dark2, marginBottom: spacing[1] }}>
                      search_similar_transactions()
                    </Body>
                    <Body size="small" style={{ color: palette.blue.dark1, lineHeight: 1.4 }}>
                      Vector similarity search - used when patterns appear anomalous for historical context
                    </Body>
                  </div>

                  <div style={{ 
                    background: `linear-gradient(135deg, ${palette.purple.light3}, ${palette.purple.light2})`,
                    padding: spacing[3],
                    borderRadius: '8px',
                    borderLeft: `4px solid ${palette.purple.base}`,
                  }}>
                    <Body weight="bold" style={{ color: palette.purple.dark2, marginBottom: spacing[1] }}>
                      SuspiciousReportsAgent
                    </Body>
                    <Body size="small" style={{ color: palette.purple.dark1, lineHeight: 1.4 }}>
                      Called for high-value transactions ($10K+), multiple risk flags, or complex patterns
                    </Body>
                  </div>

                  <div style={{ 
                    background: `linear-gradient(135deg, ${palette.red.light3}, ${palette.red.light2})`,
                    padding: spacing[3],
                    borderRadius: '8px',
                    borderLeft: `4px solid ${palette.red.base}`,
                  }}>
                    <Body weight="bold" style={{ color: palette.red.dark2, marginBottom: spacing[1] }}>
                      calculate_network_risk()
                    </Body>
                    <Body size="small" style={{ color: palette.red.dark1, lineHeight: 1.4 }}>
                      Network analysis for fraud rings and suspicious entity connections
                    </Body>
                  </div>

                  <div style={{ 
                    background: `linear-gradient(135deg, ${palette.yellow.light3}, ${palette.yellow.light2})`,
                    padding: spacing[3],
                    borderRadius: '8px',
                    borderLeft: `4px solid ${palette.yellow.base}`,
                  }}>
                    <Body weight="bold" style={{ color: palette.yellow.dark2, marginBottom: spacing[1] }}>
                      check_sanctions_lists()
                    </Body>
                    <Body size="small" style={{ color: palette.yellow.dark1, lineHeight: 1.4 }}>
                      PEP and sanctions screening for compliance requirements
                    </Body>
                  </div>
                </div>
              </Card>

            </div>
          </Tab>

          <Tab name="Real-time Observability">
            <div style={{ marginTop: spacing[3] }}>
              {/* Enhanced observability header */}
              <Card style={{ 
                marginBottom: spacing[3], 
                background: `linear-gradient(135deg, ${palette.blue.light3}, ${palette.white})`,
                border: `2px solid ${palette.blue.base}`
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2], marginBottom: spacing[2] }}>
                  <Icon glyph="ActivityFeed" fill={palette.blue.dark2} size={24} />
                  <H3 style={{ margin: 0, color: palette.blue.dark2 }}>
                    Live Agent Observability Dashboard
                  </H3>
                  <Badge variant="blue" style={{ fontSize: '11px' }}>
                    PHASE 2 ARCHITECTURE
                  </Badge>
                </div>
                <Body style={{ color: palette.blue.dark1 }}>
                  Real-time monitoring of agent execution with centralized state management and event streaming
                </Body>
              </Card>
              
              {/* Phase 2: Pure Presentational Dashboard */}
              <AgentObservabilityDashboard
                observabilityState={observabilityState}
                isWaitingForAnalysis={loading && !threadId}
                onClearHistory={clearObservabilityHistory}
                threadId={threadId}
                isEmbedded={true}
              />
            </div>
          </Tab>

          <Tab name="Chat with Agent">
            <div style={{ marginTop: spacing[3] }}>
              {/* Enhanced chat interface header */}
              <Card style={{ 
                marginBottom: spacing[3], 
                background: `linear-gradient(135deg, ${palette.green.light3}, ${palette.white})`,
                border: `2px solid ${palette.green.base}`
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2], marginBottom: spacing[2] }}>
                  <Icon glyph="Support" fill={palette.green.dark2} size={24} />
                  <H3 style={{ margin: 0, color: palette.green.dark2 }}>
                    Interactive Agent Conversation
                  </H3>
                  <Badge variant="green" style={{ fontSize: '11px' }}>
                    {threadId ? 'CONNECTED' : 'INITIALIZING'}
                  </Badge>
                </div>
                <Body style={{ color: palette.green.dark1 }}>
                  Chat directly with the fraud detection agent to explore decisions, ask questions, and get detailed explanations
                </Body>
              </Card>
              
              {/* Agent status indicator */}
              {threadId && (
                <Card style={{ marginBottom: spacing[3], background: palette.gray.light3 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2] }}>
                      <div style={{
                        width: '12px',
                        height: '12px',
                        borderRadius: '50%',
                        background: palette.green.base,
                        animation: 'pulse 2s ease-in-out infinite'
                      }} />
                      <Body size="small" weight="medium" style={{ color: palette.gray.dark2 }}>
                        Agent Ready - Thread ID: {threadId.slice(0, 12)}...
                      </Body>
                    </div>
                    <Badge variant="green" style={{ fontSize: '10px' }}>ACTIVE</Badge>
                  </div>
                </Card>
              )}
              
              <AgentChatInterface
                threadId={threadId}
                backendUrl={API_BASE_URL}
                agentDecision={agentResults}
              />
            </div>
          </Tab>
        </Tabs>
        </div>
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

      {/* Combined tabbed content (loading + results) */}
      {renderTabsContent()}

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