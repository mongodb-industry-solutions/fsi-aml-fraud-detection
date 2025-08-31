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
import AgentArchitectureGraph from './AgentArchitectureGraph';
import MemoryArchitectureGraph from './MemoryArchitectureGraph';

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
  const [memoryData, setMemoryData] = useState(null);
  const [memoryLoading, setMemoryLoading] = useState(false);

  // Reload memory data when threadId becomes available
  useEffect(() => {
    if (threadId && agentResults?.transaction_id) {
      console.log('ThreadId available, reloading memory data with threadId:', threadId);
      loadMemoryData(agentResults.transaction_id);
    }
  }, [threadId, agentResults?.transaction_id]);
  
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
      setMemoryData(null);
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
        processedEventIds: new Set(),
        connectedAgents: []  // Phase 3A: Connected agent tracking
      });
    }
  }, [open]);

  // Complete cleanup when modal closes
  useEffect(() => {
    if (!open) {
      console.log('🧹 Modal closing - performing complete cleanup');
      
      // Stop any active polling immediately
      if (pollingIntervalRef.current) {
        console.log('🛑 Stopping polling on modal close');
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      
      // Reset all state completely
      setAgentResults(null);
      setActiveTab(0);
      setProcessingStage('');
      setObservabilityActive(false);
      setThreadId(null);
      setMemoryData(null);
      setMemoryLoading(false);
      
      // Reset parent loading and error states
      setLoading(false);
      setError('');
      
      // Reset refs
      lastEventIdRef.current = null;
      
      // Complete observability state reset
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
        processedEventIds: new Set(),
        connectedAgents: []
      });
      
      console.log('✅ Modal cleanup complete');
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
        
        // Call the agent API to start analysis (only gets thread_id, not final results)
        const response = await axios.post(`${API_BASE_URL}/api/agent/analyze`, transactionData);
        
        // Extract thread ID for live observability (but don't set results yet!)
        if (response.data.thread_id) {
          console.log('🔄 Thread ID available, starting live observability:', response.data.thread_id);
          setThreadId(response.data.thread_id);
          setProcessingStage('AI analysis in progress...');
          
          // Start polling for the final decision after a delay to let conversation complete
          setTimeout(() => {
            fetchFinalDecision(response.data.thread_id);
          }, 5000); // Wait 5 seconds for conversation to progress
        } else {
          console.error('❌ No thread ID received from analysis');
          setError('Failed to start AI analysis - no thread ID received');
        }
        
        // Load memory data after analysis completes
        if (response.data.transaction_id) {
          loadMemoryData(response.data.transaction_id);
        }
      } catch (err) {
        console.error('Error with agent evaluation:', err);
        console.error('Error details:', err.response?.data || err.message);
        
        // Handle specific error cases
        if (err.response?.status === 503) {
          setError('Agent service is not available. Please ensure the backend is running and the agent is initialized.');
        } else if (err.response?.status === 500) {
          setError(`Agent analysis failed: ${err.response?.data?.detail || 'Internal server error'}`);
        } else {
        setError(`Failed to evaluate transaction with agent: ${err.response?.data?.detail || err.message}`);
        }
        setProcessingStage('');
        // Keep observability active even on error to show any events that occurred
      } finally {
        setLoading(false);
      }
    };

    performAnalysis();
  }, [open]);

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
      setObservabilityState(prev => ({ 
        ...prev, 
        isConnected: false,
        connectionError: null 
      }));
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

  const fetchFinalDecision = async (threadId) => {
    try {
      console.log('🎯 Attempting to fetch final decision from thread:', threadId);
      
      const decisionResponse = await axios.get(`${API_BASE_URL}/api/agent/decision/${threadId}`);
      console.log('✅ Final decision extracted:', decisionResponse.data);
      
      // Set the actual AI results (not calculated ones)
      setAgentResults({
        transaction_id: transactionData.transaction_id,
        decision: decisionResponse.data.decision,
        risk_level: decisionResponse.data.risk_level, 
        risk_score: decisionResponse.data.risk_score,
        thread_id: threadId,
        reasoning: `AI Analysis: ${decisionResponse.data.ai_response_preview}`,
        confidence: 0.95, // High confidence since this is direct from AI
        stage_completed: 2,
        processing_time_ms: 0,
        extraction_source: decisionResponse.data.extraction_source
      });
      
      setProcessingStage('');
      setLoading(false);
      console.log('✅ Final AI decision set successfully');
      
    } catch (error) {
      console.error('❌ Failed to fetch final decision:', error);
      
      // Retry after a delay if conversation might still be completing
      if (error.response?.status === 404) {
        console.log('🔄 Decision not ready yet, retrying in 3 seconds...');
        setTimeout(() => {
          fetchFinalDecision(threadId);
        }, 3000);
      } else {
        setError(`Failed to extract final AI decision: ${error.response?.data?.detail || error.message}`);
        setLoading(false);
      }
    }
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

  // Load memory data using simplified 3-collection system
  const loadMemoryData = async (transactionId) => {
    setMemoryLoading(true);
    try {
      console.log('Loading memory data for transaction:', transactionId, 'threadId:', threadId);
      
      // Fetch simplified memory data in parallel
      const [overviewResponse, conversationsResponse, decisionsResponse, patternsResponse] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/memory/overview`),
        // Fetch conversations for specific threadId if available
        threadId ? axios.get(`${API_BASE_URL}/api/memory/conversations?thread_id=${threadId}&limit=20`) : Promise.resolve({data: []}),
        // Always fetch recent decisions for display, but also include current thread decisions
        axios.get(`${API_BASE_URL}/api/memory/decisions?limit=5`),
        axios.get(`${API_BASE_URL}/api/memory/patterns?limit=5`)
      ]);

      console.log('Memory API responses:', {
        overview: overviewResponse.data,
        conversations: conversationsResponse.data,
        decisions: decisionsResponse.data,
        patterns: patternsResponse.data
      });

      setMemoryData({
        overview: overviewResponse.data,
        conversations: Array.isArray(conversationsResponse.data) ? conversationsResponse.data : [],
        decisions: Array.isArray(decisionsResponse.data) ? decisionsResponse.data : [],
        patterns: Array.isArray(patternsResponse.data) ? patternsResponse.data : [],
        transactionId
      });
    } catch (error) {
      console.error('Failed to load memory data:', error);
      setMemoryData({
        overview: { total_memories: 0, total_decisions: 0, total_patterns: 0, active_threads: 0 },
        conversations: [],
        decisions: [],
        patterns: [],
        transactionId,
        error: 'Failed to load memory data'
      });
    } finally {
      setMemoryLoading(false);
    }
  };

  // Render memory data tab content
  const renderMemoryContent = () => {
    if (memoryLoading) {
      return (
        <div style={{ textAlign: 'center', padding: spacing[4] }}>
          <Spinner size={24} />
          <Body style={{ marginTop: spacing[2], color: palette.gray.dark1 }}>
            Loading memory data...
          </Body>
        </div>
      );
    }

    if (!memoryData) {
      return (
        <div style={{ textAlign: 'center', padding: spacing[4] }}>
          <Body style={{ color: palette.gray.dark1 }}>
            Memory data will be available after transaction analysis.
          </Body>
        </div>
      );
    }

    const { overview, conversations, decisions, patterns, error } = memoryData;

    if (error) {
      return (
        <Card style={{ background: palette.red.light3, border: `1px solid ${palette.red.light1}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2] }}>
            <Icon glyph="Warning" fill={palette.red.base} size={20} />
            <Body style={{ color: palette.red.dark2 }}>{error}</Body>
          </div>
        </Card>
      );
    }

    return (
      <MemoryArchitectureGraph
        loading={memoryLoading}
        memoryData={memoryData}
        overview={overview}
        conversations={conversations}
        decisions={decisions}
        patterns={patterns}
      />
    );
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
      if (agentResults?.decision === 'BLOCK') return { 
        iconGlyph: 'X', 
        text: 'High Risk Detected', 
        color: palette.red.base, 
        badge: 'red' 
      };
      if (agentResults?.decision === 'ESCALATE') return { 
        iconGlyph: 'Warning', 
        text: 'Escalation Required', 
        color: palette.red.dark1, 
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
                    ? `Analysis completed • Risk Score: ${Math.round(agentResults.risk_score)}%`
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
              <Badge 
                variant="lightgray" 
                style={{ 
                  fontFamily: 'monospace', 
                  fontSize: '8px',
                  maxWidth: '120px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}
                title={threadId}
              >
                {threadId}
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
      <div style={{ padding: spacing[3] }}>
        <Tabs
          selected={activeTab}
          setSelected={setActiveTab}
          aria-label="Agent analysis tabs"
        >
          <Tab name="Agent Architecture">
            <div style={{ marginTop: spacing[3] }}>
              {/* Interactive Decision Tree Graph - Always Visible */}
              <AgentArchitectureGraph
                loading={loading}
                agentResults={agentResults}
                processingStage={processingStage}
                stage1Result={null}
                stage2Progress={null}
                transactionData={transactionData}
              />

            </div>
          </Tab>

          <Tab name="Chat with Fraud Detection Agent">
            <div style={{ marginTop: spacing[3] }}>
              <AgentChatInterface
                threadId={threadId}
                backendUrl={API_BASE_URL}
                agentDecision={agentResults}
              />
            </div>
          </Tab>

          <Tab name="Observability">
            <div style={{ marginTop: spacing[3] }}>
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

          <Tab name="Memory & Learning">
            <div style={{ marginTop: spacing[3] }}>
              {renderMemoryContent()}
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
      key="agent-evaluation-modal"
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