/**
 * Phase 2: Pure Presentational Agent Observability Dashboard
 * Displays observability data passed from parent component
 */

'use client';

import React from 'react';
import Badge from '@leafygreen-ui/badge';
import Button from '@leafygreen-ui/button';
import Card from '@leafygreen-ui/card';
import { Spinner } from '@leafygreen-ui/loading-indicator';
import Icon from '@leafygreen-ui/icon';
import { spacing } from '@leafygreen-ui/tokens';
import { AgentStatusIndicator } from './AgentStatusIndicator';
import { ToolCallProgress } from './ToolCallProgress';
import { DecisionTracker } from './DecisionTracker';
import { PerformanceMetrics } from './PerformanceMetrics';
import { EventLog } from './EventLog';
import { ConnectedAgentStatus } from './ConnectedAgentStatus';

const AgentObservabilityDashboard = ({ 
  observabilityState = {},
  isWaitingForAnalysis = false,
  onClearHistory,
  threadId,
  isEmbedded = false,
  onClose
}) => {
  console.log('🎨 Pure Presentational Dashboard render:', { 
    threadId, 
    isWaitingForAnalysis,
    eventsCount: observabilityState.events?.length,
    toolCallsCount: observabilityState.toolCalls?.length,
    isConnected: observabilityState.isConnected
  });

  // Extract data from centralized observability state
  const {
    isConnected = false,
    events = [],
    agentStatus = 'idle',
    currentRun = null,
    toolCalls = [],
    decisions = [],
    performanceMetrics = {},
    connectionError = null,
    connectedAgents = []  // Phase 3A: Connected agent tracking
  } = observabilityState;

  const containerClasses = isEmbedded 
    ? "w-full bg-white border border-gray-200 rounded-lg"
    : "fixed top-4 right-4 w-96 max-h-[90vh] bg-white shadow-2xl border border-gray-200 rounded-lg";

  return (
    <div className={containerClasses} style={isEmbedded ? {} : { zIndex: 1100 }}>

      {/* Connection Error */}
      {connectionError && (
        <div className="p-3 bg-red-50 border-b border-red-200">
          <div className="flex items-center space-x-2 text-red-700 text-sm">
            <Icon glyph="Warning" size="small" />
            <span>{connectionError}</span>
          </div>
        </div>
      )}

      <div style={{ padding: spacing[4], maxHeight: '80vh', overflowY: 'auto' }}>
        {/* Waiting for Analysis State */}
        {isWaitingForAnalysis ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          </div>
        ) : (
          <>
            {/* Agent Status */}
            <div style={{ marginBottom: spacing[4] }}>
              <AgentStatusIndicator 
                status={agentStatus}
                currentRun={currentRun}
                isConnected={isConnected}
              />
            </div>

            {/* Connected Agent Status (Phase 3A) */}
            <div style={{ marginBottom: spacing[4] }}>
              <ConnectedAgentStatus connectedAgents={connectedAgents} />
            </div>

            {/* Event Log */}
            <div style={{ marginBottom: spacing[4] }}>
              <EventLog 
                events={events}
                isConnected={isConnected}
                onClear={null}
              />
            </div>

            {/* Tool Call Progress */}
            {toolCalls.length > 0 && (
              <div style={{ marginBottom: spacing[4] }}>
                <ToolCallProgress 
                  toolCalls={toolCalls}
                  isActive={agentStatus === 'running'}
                />
              </div>
            )}

            {/* Decision Tracker */}
            {decisions.length > 0 && (
              <div style={{ marginBottom: spacing[4] }}>
                <DecisionTracker decisions={decisions} />
              </div>
            )}

            {/* Performance Metrics */}
            {Object.keys(performanceMetrics).length > 0 && (
              <div style={{ marginBottom: spacing[4] }}>
                <PerformanceMetrics metrics={performanceMetrics} />
              </div>
            )}

          </>
        )}
      </div>

    </div>
  );
};

export default AgentObservabilityDashboard;