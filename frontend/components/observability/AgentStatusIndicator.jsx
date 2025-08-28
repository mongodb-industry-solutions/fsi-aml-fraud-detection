/**
 * Agent Status Indicator Component
 * Shows current agent execution status with visual indicators
 */

'use client';

import React from 'react';
import Badge from '@leafygreen-ui/badge';
import { Spinner } from '@leafygreen-ui/loading-indicator';
import Icon from '@leafygreen-ui/icon';

export const AgentStatusIndicator = ({ 
  status, 
  currentRun, 
  isConnected, 
  compact = false 
}) => {
  const getStatusConfig = (status) => {
    switch (status) {
      case 'running':
        return {
          color: 'blue',
          icon: 'Refresh',
          label: 'Running',
          description: 'Agent is processing your request'
        };
      case 'completed':
        return {
          color: 'green',
          icon: 'Checkmark',
          label: 'Completed',
          description: 'Agent has finished successfully'
        };
      case 'failed':
        return {
          color: 'red',
          icon: 'Warning',
          label: 'Failed',
          description: 'Agent encountered an error'
        };
      case 'idle':
      default:
        return {
          color: 'gray',
          icon: 'Pause',
          label: 'Idle',
          description: 'Agent is ready'
        };
    }
  };

  const statusConfig = getStatusConfig(status);

  if (compact) {
    return (
      <div className="flex items-center space-x-2">
        <div className="flex items-center space-x-1">
          {status === 'running' ? (
            <Spinner size="small" />
          ) : (
            <Icon glyph={statusConfig.icon} size="small" />
          )}
          <Badge variant={statusConfig.color} className="text-xs">
            {statusConfig.label}
          </Badge>
        </div>
        {!isConnected && (
          <Icon glyph="Disconnect" size="small" className="text-red-500" />
        )}
      </div>
    );
  }

  return (
    <div className="bg-gray-50 rounded-lg p-3 border">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-sm text-gray-800">Agent Status</h3>
        {!isConnected && (
          <Badge variant="red" className="text-xs">
            Disconnected
          </Badge>
        )}
      </div>
      
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-2">
          {status === 'running' ? (
            <Spinner size="small" />
          ) : (
            <Icon glyph={statusConfig.icon} size="small" />
          )}
          <Badge variant={statusConfig.color}>
            {statusConfig.label}
          </Badge>
        </div>
        
        <div className="text-sm text-gray-600">
          {statusConfig.description}
        </div>
      </div>

      {/* Current Run Information */}
      {currentRun && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-gray-500">Run ID:</span>
              <div className="font-mono text-gray-800 truncate">
                {currentRun.run_id?.substring(0, 12)}...
              </div>
            </div>
            <div>
              <span className="text-gray-500">Agent:</span>
              <div className="font-mono text-gray-800 truncate">
                {currentRun.agent_id?.substring(0, 12)}...
              </div>
            </div>
          </div>
          
          {currentRun.started_at && (
            <div className="mt-2 text-xs text-gray-500">
              Started: {new Date(currentRun.started_at).toLocaleTimeString()}
            </div>
          )}
          
          {currentRun.completed_at && (
            <div className="text-xs text-gray-500">
              Completed: {new Date(currentRun.completed_at).toLocaleTimeString()}
            </div>
          )}

          {/* Show response preview if completed */}
          {currentRun.status === 'completed' && currentRun.response && (
            <div className="mt-2 p-2 bg-green-50 rounded text-xs">
              <div className="text-green-700 font-medium mb-1">Response Preview:</div>
              <div className="text-green-600 line-clamp-2">
                {currentRun.response.substring(0, 100)}
                {currentRun.response.length > 100 ? '...' : ''}
              </div>
            </div>
          )}

          {/* Show error if failed */}
          {currentRun.status === 'failed' && currentRun.error && (
            <div className="mt-2 p-2 bg-red-50 rounded text-xs">
              <div className="text-red-700 font-medium mb-1">Error:</div>
              <div className="text-red-600">
                {currentRun.error}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};