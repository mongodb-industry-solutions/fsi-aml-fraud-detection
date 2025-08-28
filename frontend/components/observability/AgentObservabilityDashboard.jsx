/**
 * Real-time Agent Observability Dashboard
 * Displays live agent execution data via WebSocket connection
 */

'use client';

import React, { useState, useEffect, useRef } from 'react';
import Badge from '@leafygreen-ui/badge';
import Button from '@leafygreen-ui/button';
import Card from '@leafygreen-ui/card';
import { Spinner } from '@leafygreen-ui/loading-indicator';
import Icon from '@leafygreen-ui/icon';
import { AgentStatusIndicator } from './AgentStatusIndicator';
import { ToolCallProgress } from './ToolCallProgress';
import { DecisionTracker } from './DecisionTracker';
import { PerformanceMetrics } from './PerformanceMetrics';
import { EventLog } from './EventLog';

const AgentObservabilityDashboard = ({ 
  threadId, 
  isActive = false, 
  onClose,
  backendUrl = "ws://localhost:8000",
  isWaitingForAnalysis = false,
  isEmbedded = false
}) => {
  const [isConnected, setIsConnected] = useState(false);
  const [events, setEvents] = useState([]);
  const [agentStatus, setAgentStatus] = useState('idle');
  const [currentRun, setCurrentRun] = useState(null);
  const [toolCalls, setToolCalls] = useState([]);
  const [decisions, setDecisions] = useState([]);
  const [performanceMetrics, setPerformanceMetrics] = useState({});
  const [connectionError, setConnectionError] = useState(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const [lastEventId, setLastEventId] = useState(null);
  const [processedEventIds, setProcessedEventIds] = useState(new Set());
  
  const pollingIntervalRef = useRef(null);
  const maxReconnectAttempts = 5;
  const [reconnectAttempts, setReconnectAttempts] = useState(0);

  // Initialize HTTP polling with proper cleanup
  useEffect(() => {
    console.log(`🔄 ObservabilityDashboard: threadId=${threadId}, isActive=${isActive}, isWaiting=${isWaitingForAnalysis}`);
    
    // Clean up any existing polling first
    stopPolling();
    
    if (!isActive) {
      console.log('🛑 Dashboard inactive, stopping polling');
      return;
    }

    if (isWaitingForAnalysis || !threadId) {
      console.log('⏳ Waiting for analysis or thread ID...');
      return;
    }

    console.log('✅ Starting fresh polling for thread:', threadId);
    
    // Clear all previous state for fresh start
    setEvents([]);
    setToolCalls([]);
    setDecisions([]);
    setAgentStatus('connecting');
    setCurrentRun(null);
    setLastEventId(null);
    setProcessedEventIds(new Set());
    setConnectionError(null);

    startPolling();

    return () => {
      console.log('🧹 Cleaning up polling');
      stopPolling();
    };
  }, [threadId, isActive, isWaitingForAnalysis]);

  const startPolling = () => {
    console.log(`🔄 Starting HTTP polling for thread: ${threadId}`);
    setIsConnected(true);
    setConnectionError(null);
    setReconnectAttempts(0);
    
    // Start immediate poll
    pollForEvents();
    
    // Set up recurring polling every 500ms
    pollingIntervalRef.current = setInterval(() => {
      pollForEvents();
    }, 500);
  };

  const pollForEvents = async () => {
    if (!threadId) return;
    
    try {
      const params = new URLSearchParams();
      if (lastEventId) {
        params.append('last_event_id', lastEventId);
      }
      
      const response = await fetch(
        `${backendUrl}/observability/events/${threadId}?${params.toString()}`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.events && data.events.length > 0) {
        // Process only new events that haven't been seen before
        const newEvents = data.events.filter(event => 
          event.id && !processedEventIds.has(event.id)
        );
        
        if (newEvents.length > 0) {
          newEvents.forEach(handleObservabilityEvent);
          
          // Update processed event IDs
          setProcessedEventIds(prev => {
            const newSet = new Set(prev);
            newEvents.forEach(event => newSet.add(event.id));
            return newSet;
          });
          
          // Update last event ID
          const lastEvent = newEvents[newEvents.length - 1];
          if (lastEvent.id) {
            setLastEventId(lastEvent.id);
          }
        }
      }
      
      // Reset connection error if successful
      if (connectionError) {
        setConnectionError(null);
        setReconnectAttempts(0);
      }
      
    } catch (error) {
      console.error('❌ Polling error:', error);
      setConnectionError('Failed to fetch events');
      
      // Attempt reconnect with exponential backoff
      if (reconnectAttempts < maxReconnectAttempts) {
        setReconnectAttempts(prev => prev + 1);
      }
    }
  };

  const stopPolling = () => {
    console.log('🛑 Stopping HTTP polling');
    setIsConnected(false);
    
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  };

  const attemptReconnect = () => {
    if (reconnectAttempts >= maxReconnectAttempts) {
      setConnectionError('Max reconnection attempts reached');
      return;
    }

    const delay = Math.pow(2, reconnectAttempts) * 1000; // Exponential backoff
    console.log(`🔄 Attempting to reconnect in ${delay}ms (attempt ${reconnectAttempts + 1})`);
    
    reconnectTimeoutRef.current = setTimeout(() => {
      setReconnectAttempts(prev => prev + 1);
      connectWebSocket();
    }, delay);
  };

  const handleObservabilityEvent = (eventData) => {
    const { event_type, data, timestamp, run_id, agent_id } = eventData;
    
    // Add to events log
    setEvents(prevEvents => [
      ...prevEvents.slice(-99), // Keep last 100 events
      { ...eventData, id: Date.now() + Math.random() }
    ]);

    // Update state based on event type
    switch (event_type) {
      case 'agent_run_started':
        setAgentStatus('running');
        setCurrentRun({
          run_id,
          agent_id,
          started_at: timestamp,
          status: 'in_progress'
        });
        break;

      case 'agent_run_completed':
        setAgentStatus('completed');
        setCurrentRun(prev => prev ? {
          ...prev,
          completed_at: timestamp,
          status: 'completed',
          response: data.response
        } : null);
        break;

      case 'agent_run_failed':
        setAgentStatus('failed');
        setCurrentRun(prev => prev ? {
          ...prev,
          completed_at: timestamp,
          status: 'failed',
          error: data.error_message
        } : null);
        break;

      case 'tool_call_initiated':
        setToolCalls(prev => [
          ...prev,
          {
            id: data.tool_call_id,
            name: data.tool_name,
            arguments: data.arguments,
            status: 'initiated',
            started_at: timestamp
          }
        ]);
        break;

      case 'tool_call_completed':
        setToolCalls(prev => prev.map(tc => 
          tc.id === data.tool_call_id ? {
            ...tc,
            status: 'completed',
            result: data.result,
            execution_time_ms: data.execution_time_ms,
            completed_at: timestamp
          } : tc
        ));
        break;

      case 'decision_made':
        setDecisions(prev => [
          ...prev,
          {
            id: Date.now() + Math.random(),
            type: data.decision_type,
            summary: data.decision_summary,
            confidence: data.confidence_score,
            reasoning: data.reasoning,
            timestamp
          }
        ]);
        break;

      case 'performance_metrics':
        setPerformanceMetrics(prev => ({
          ...prev,
          ...data,
          last_updated: timestamp
        }));
        break;

      case 'status_update':
        setAgentStatus(data.status);
        break;

      case 'error_occurred':
        console.error('Agent error:', data.error_message);
        break;

      case 'connection_established':
        console.log('✅ Observability connection established');
        break;

      default:
        console.log('📡 Received observability event:', event_type, data);
    }
  };

  const clearHistory = async () => {
    try {
      const response = await fetch(`${backendUrl}/observability/history/${threadId}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        setEvents([]);
        setToolCalls([]);
        setDecisions([]);
        setPerformanceMetrics({});
        setLastEventId(null);
        setProcessedEventIds(new Set()); // Clear processed events when history is cleared
      }
    } catch (error) {
      console.error('Failed to clear history:', error);
    }
  };

  if (!isActive) {
    return null;
  }

  const containerClasses = isEmbedded 
    ? "w-full bg-white border border-gray-200 rounded-lg"
    : `fixed ${isMinimized ? 'bottom-4 right-4' : 'top-4 right-4'} ${isMinimized ? 'w-80' : 'w-96'} max-h-[90vh] bg-white shadow-2xl border border-gray-200 rounded-lg`;

  return (
    <div className={containerClasses} style={isEmbedded ? {} : { zIndex: 1100 }}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50 rounded-t-lg">
        <div className="flex items-center space-x-2">
          <Icon glyph="Visibility" size="small" />
          <span className="font-semibold text-sm">Agent Observability</span>
          <Badge 
            variant={isConnected ? 'green' : 'red'} 
            className="text-xs"
          >
            {isConnected ? 'Live' : 'Disconnected'}
          </Badge>
        </div>
        
        {!isEmbedded && (
          <div className="flex items-center space-x-1">
            <Button
              size="xsmall"
              variant="default"
              onClick={() => setIsMinimized(!isMinimized)}
            >
              <Icon glyph={isMinimized ? "ChevronUp" : "ChevronDown"} size="small" />
            </Button>
            <Button
              size="xsmall"
              variant="default"
              onClick={onClose}
            >
              <Icon glyph="X" size="small" />
            </Button>
          </div>
        )}
      </div>

      {/* Connection Error */}
      {connectionError && (
        <div className="p-3 bg-red-50 border-b border-red-200">
          <div className="flex items-center space-x-2 text-red-700 text-sm">
            <Icon glyph="Warning" size="small" />
            <span>{connectionError}</span>
            <Button
              size="xsmall"
              variant="primary"
              onClick={() => {
                setConnectionError(null);
                startPolling();
              }}
            >
              Retry
            </Button>
          </div>
        </div>
      )}

      {(isEmbedded || !isMinimized) && (
        <div className="p-4 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Waiting for Analysis State */}
          {isWaitingForAnalysis ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <div className="text-sm font-semibold text-gray-700 mb-2">
                🔄 Analysis Starting...
              </div>
              <div className="text-xs text-gray-500 mb-4">
                Agent is initializing. Live observability will begin once thread is created.
              </div>
              <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                <div className="text-xs text-blue-700">
                  <strong>What you'll see:</strong><br/>
                  • Real-time tool call execution<br/>
                  • Decision-making process<br/>
                  • Performance metrics<br/>
                  • HTTP polling every 0.5 seconds
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Agent Status */}
              <AgentStatusIndicator 
                status={agentStatus}
                currentRun={currentRun}
                isConnected={isConnected}
              />

              {/* Tool Call Progress */}
              {toolCalls.length > 0 && (
                <ToolCallProgress 
                  toolCalls={toolCalls}
                  isActive={agentStatus === 'running'}
                />
              )}

              {/* Decision Tracker */}
              {decisions.length > 0 && (
                <DecisionTracker decisions={decisions} />
              )}

              {/* Performance Metrics */}
              {Object.keys(performanceMetrics).length > 0 && (
                <PerformanceMetrics metrics={performanceMetrics} />
              )}

              {/* Event Log */}
              <EventLog 
                events={events}
                isConnected={isConnected}
                onClear={clearHistory}
              />

              {/* Controls */}
              <div className="flex justify-between items-center pt-3 border-t border-gray-200">
                <div className="text-xs text-gray-500">
                  Thread: {threadId?.substring(0, 8)}...
                </div>
                <div className="flex space-x-2">
                  <Button
                    size="xsmall"
                    variant="default"
                    onClick={clearHistory}
                    disabled={!isConnected}
                  >
                    Clear
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {!isEmbedded && isMinimized && (
        <div className="p-3">
          <div className="flex items-center justify-between">
            <AgentStatusIndicator 
              status={agentStatus}
              currentRun={currentRun}
              isConnected={isConnected}
              compact={true}
            />
            <div className="text-xs text-gray-500">
              {toolCalls.filter(tc => tc.status === 'initiated').length} active
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AgentObservabilityDashboard;