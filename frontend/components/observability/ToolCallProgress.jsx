/**
 * Tool Call Progress Component
 * Shows real-time progress of agent tool executions
 */

'use client';

import React, { useState } from 'react';
import Badge from '@leafygreen-ui/badge';
import Button from '@leafygreen-ui/button';
import { Spinner } from '@leafygreen-ui/loading-indicator';
import Icon from '@leafygreen-ui/icon';

export const ToolCallProgress = ({ toolCalls, isActive }) => {
  const [expandedTool, setExpandedTool] = useState(null);

  const getToolStatusConfig = (status) => {
    switch (status) {
      case 'initiated':
        return {
          color: 'blue',
          icon: 'Refresh',
          label: 'Running',
          showSpinner: true
        };
      case 'completed':
        return {
          color: 'green',
          icon: 'Checkmark',
          label: 'Completed',
          showSpinner: false
        };
      case 'failed':
        return {
          color: 'red',
          icon: 'Warning',
          label: 'Failed',
          showSpinner: false
        };
      default:
        return {
          color: 'gray',
          icon: 'Pause',
          label: 'Unknown',
          showSpinner: false
        };
    }
  };

  const formatToolName = (toolName) => {
    return toolName
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
  };

  const formatExecutionTime = (timeMs) => {
    if (!timeMs) return '';
    if (timeMs < 1000) return `${Math.round(timeMs)}ms`;
    return `${(timeMs / 1000).toFixed(1)}s`;
  };

  const toggleToolExpansion = (toolId) => {
    setExpandedTool(expandedTool === toolId ? null : toolId);
  };

  if (!toolCalls.length) {
    return null;
  }

  return (
    <div className="bg-gray-50 rounded-lg p-3 border">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-sm text-gray-800">Tool Calls</h3>
        <Badge variant="blue" className="text-xs">
          {toolCalls.length} tools
        </Badge>
      </div>

      <div className="space-y-2">
        {toolCalls.map((toolCall) => {
          const statusConfig = getToolStatusConfig(toolCall.status);
          const isExpanded = expandedTool === toolCall.id;

          return (
            <div
              key={toolCall.id}
              className="bg-white rounded-md border p-3 transition-all duration-200"
            >
              {/* Tool Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3 flex-1">
                  <div className="flex items-center space-x-2">
                    {statusConfig.showSpinner ? (
                      <Spinner size="small" />
                    ) : (
                      <Icon glyph={statusConfig.icon} size="small" />
                    )}
                    <Badge variant={statusConfig.color} className="text-xs">
                      {statusConfig.label}
                    </Badge>
                  </div>

                  <div className="flex-1">
                    <div className="font-medium text-sm text-gray-800">
                      {formatToolName(toolCall.name)}
                    </div>
                    <div className="text-xs text-gray-500">
                      {toolCall.started_at && 
                        `Started: ${new Date(toolCall.started_at).toLocaleTimeString()}`
                      }
                      {toolCall.execution_time_ms && (
                        <span className="ml-2">
                          Duration: {formatExecutionTime(toolCall.execution_time_ms)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <Button
                  size="xsmall"
                  variant="default"
                  onClick={() => toggleToolExpansion(toolCall.id)}
                >
                  <Icon 
                    glyph={isExpanded ? "ChevronUp" : "ChevronDown"} 
                    size="small" 
                  />
                </Button>
              </div>

              {/* Expanded Tool Details */}
              {isExpanded && (
                <div className="mt-3 pt-3 border-t border-gray-100 space-y-3">
                  {/* Arguments */}
                  {toolCall.arguments && (
                    <div>
                      <div className="text-xs font-medium text-gray-600 mb-1">
                        Arguments:
                      </div>
                      <div className="bg-gray-50 rounded p-2 font-mono text-xs overflow-x-auto">
                        <pre className="whitespace-pre-wrap">
                          {JSON.stringify(toolCall.arguments, null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}

                  {/* Result */}
                  {toolCall.result && toolCall.status === 'completed' && (
                    <div>
                      <div className="text-xs font-medium text-gray-600 mb-1">
                        Result:
                      </div>
                      <div className="bg-green-50 rounded p-2 font-mono text-xs overflow-x-auto max-h-32 overflow-y-auto">
                        <pre className="whitespace-pre-wrap text-green-800">
                          {typeof toolCall.result === 'string' 
                            ? toolCall.result 
                            : JSON.stringify(toolCall.result, null, 2)
                          }
                        </pre>
                      </div>
                    </div>
                  )}

                  {/* Error */}
                  {toolCall.status === 'failed' && toolCall.error && (
                    <div>
                      <div className="text-xs font-medium text-red-600 mb-1">
                        Error:
                      </div>
                      <div className="bg-red-50 rounded p-2 text-xs text-red-700">
                        {toolCall.error}
                      </div>
                    </div>
                  )}

                  {/* Timing Details */}
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    {toolCall.started_at && (
                      <div>
                        <span className="text-gray-500">Started:</span>
                        <div className="font-mono text-gray-700">
                          {new Date(toolCall.started_at).toLocaleString()}
                        </div>
                      </div>
                    )}
                    {toolCall.completed_at && (
                      <div>
                        <span className="text-gray-500">Completed:</span>
                        <div className="font-mono text-gray-700">
                          {new Date(toolCall.completed_at).toLocaleString()}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Summary */}
      <div className="mt-3 pt-3 border-t border-gray-200">
        <div className="grid grid-cols-3 gap-4 text-xs">
          <div className="text-center">
            <div className="font-medium text-blue-600">
              {toolCalls.filter(tc => tc.status === 'initiated').length}
            </div>
            <div className="text-gray-500">Running</div>
          </div>
          <div className="text-center">
            <div className="font-medium text-green-600">
              {toolCalls.filter(tc => tc.status === 'completed').length}
            </div>
            <div className="text-gray-500">Completed</div>
          </div>
          <div className="text-center">
            <div className="font-medium text-red-600">
              {toolCalls.filter(tc => tc.status === 'failed').length}
            </div>
            <div className="text-gray-500">Failed</div>
          </div>
        </div>
      </div>
    </div>
  );
};