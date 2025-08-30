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
        
        {!isEmbedded && onClose && (
          <Button
            size="xsmall"
            variant="default"
            onClick={onClose}
          >
            <Icon glyph="X" size="small" />
          </Button>
        )}
      </div>

      {/* Connection Error */}
      {connectionError && (
        <div className="p-3 bg-red-50 border-b border-red-200">
          <div className="flex items-center space-x-2 text-red-700 text-sm">
            <Icon glyph="Warning" size="small" />
            <span>{connectionError}</span>
          </div>
        </div>
      )}

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
                • Centralized state management (Phase 2)
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

            {/* Connected Agent Status (Phase 3A) */}
            <ConnectedAgentStatus connectedAgents={connectedAgents} />

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
              onClear={onClearHistory}
            />

            {/* Controls */}
            <div className="flex justify-between items-center pt-3 border-t border-gray-200">
              <div className="text-xs text-gray-500">
                Thread: {threadId ? `${threadId.substring(0, 8)}...` : 'None'}
              </div>
              <div className="flex space-x-2">
                <Button
                  size="xsmall"
                  variant="default"
                  onClick={onClearHistory}
                  disabled={!isConnected || !onClearHistory}
                >
                  Clear
                </Button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Phase 2 Debug Info */}
      {process.env.NODE_ENV === 'development' && (
        <div className="p-2 bg-gray-100 border-t text-xs text-gray-600">
          Phase 2: Pure Presentational | Events: {events.length} | Tools: {toolCalls.length} | Status: {agentStatus}
        </div>
      )}
    </div>
  );
};

export default AgentObservabilityDashboard;