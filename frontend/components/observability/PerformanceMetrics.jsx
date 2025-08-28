/**
 * Performance Metrics Component
 * Displays agent execution performance metrics and statistics
 */

'use client';

import React from 'react';
import Badge from '@leafygreen-ui/badge';
import Icon from '@leafygreen-ui/icon';

export const PerformanceMetrics = ({ metrics }) => {
  const formatDuration = (ms) => {
    if (!ms) return '0ms';
    if (ms < 1000) return `${Math.round(ms)}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${Math.floor(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`;
  };

  const getPerformanceRating = (executionTimeMs) => {
    if (!executionTimeMs) return { color: 'gray', label: 'Unknown' };
    if (executionTimeMs < 2000) return { color: 'green', label: 'Excellent' };
    if (executionTimeMs < 5000) return { color: 'blue', label: 'Good' };
    if (executionTimeMs < 10000) return { color: 'yellow', label: 'Fair' };
    return { color: 'red', label: 'Slow' };
  };

  const performanceRating = getPerformanceRating(metrics.total_execution_time_ms);

  if (!metrics || Object.keys(metrics).length === 0) {
    return null;
  }

  return (
    <div className="bg-gray-50 rounded-lg p-3 border">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-sm text-gray-800">Performance Metrics</h3>
        <Badge variant={performanceRating.color} className="text-xs">
          {performanceRating.label}
        </Badge>
      </div>

      {/* Main Metrics Grid */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        {/* Execution Time */}
        {metrics.total_execution_time_ms && (
          <div className="bg-white rounded-md border p-3">
            <div className="flex items-center space-x-2 mb-1">
              <Icon glyph="Clock" size="small" />
              <span className="text-xs font-medium text-gray-600">Execution Time</span>
            </div>
            <div className="text-lg font-bold text-gray-800">
              {formatDuration(metrics.total_execution_time_ms)}
            </div>
            <div className="text-xs text-gray-500">
              Total processing time
            </div>
          </div>
        )}

        {/* Success Rate */}
        {metrics.conversation_success !== undefined && (
          <div className="bg-white rounded-md border p-3">
            <div className="flex items-center space-x-2 mb-1">
              <Icon glyph="Checkmark" size="small" />
              <span className="text-xs font-medium text-gray-600">Status</span>
            </div>
            <div className="text-lg font-bold text-green-600">
              {metrics.conversation_success ? 'Success' : 'Failed'}
            </div>
            <div className="text-xs text-gray-500">
              Conversation result
            </div>
          </div>
        )}

        {/* Response Length */}
        {metrics.response_length && (
          <div className="bg-white rounded-md border p-3">
            <div className="flex items-center space-x-2 mb-1">
              <Icon glyph="Edit" size="small" />
              <span className="text-xs font-medium text-gray-600">Response Size</span>
            </div>
            <div className="text-lg font-bold text-gray-800">
              {metrics.response_length.toLocaleString()}
            </div>
            <div className="text-xs text-gray-500">
              Characters in response
            </div>
          </div>
        )}

        {/* Tool Calls (if available) */}
        {metrics.tool_calls_count && (
          <div className="bg-white rounded-md border p-3">
            <div className="flex items-center space-x-2 mb-1">
              <Icon glyph="Settings" size="small" />
              <span className="text-xs font-medium text-gray-600">Tool Calls</span>
            </div>
            <div className="text-lg font-bold text-gray-800">
              {metrics.tool_calls_count}
            </div>
            <div className="text-xs text-gray-500">
              Functions executed
            </div>
          </div>
        )}
      </div>

      {/* Performance Indicators */}
      <div className="bg-white rounded-md border p-3">
        <div className="text-xs font-medium text-gray-600 mb-2">
          Performance Analysis
        </div>
        
        {/* Execution Time Analysis */}
        {metrics.total_execution_time_ms && (
          <div className="mb-3">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-gray-500">Response Time</span>
              <span className="font-medium">{performanceRating.label}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-300 ${
                  performanceRating.color === 'green' ? 'bg-green-500' :
                  performanceRating.color === 'blue' ? 'bg-blue-500' :
                  performanceRating.color === 'yellow' ? 'bg-yellow-500' :
                  'bg-red-500'
                }`}
                style={{ 
                  width: `${Math.min(100, Math.max(10, 100 - (metrics.total_execution_time_ms / 100)))}%` 
                }}
              />
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {metrics.total_execution_time_ms < 2000 && "Excellent response time - agent is performing optimally"}
              {metrics.total_execution_time_ms >= 2000 && metrics.total_execution_time_ms < 5000 && "Good response time - within acceptable range"}
              {metrics.total_execution_time_ms >= 5000 && metrics.total_execution_time_ms < 10000 && "Fair response time - may indicate complex processing"}
              {metrics.total_execution_time_ms >= 10000 && "Slow response time - consider optimizing tools or reducing complexity"}
            </div>
          </div>
        )}

        {/* Additional Metrics */}
        <div className="grid grid-cols-2 gap-4 text-xs pt-2 border-t border-gray-100">
          {metrics.timestamp && (
            <div>
              <span className="text-gray-500">Measured At:</span>
              <div className="font-mono text-gray-700">
                {new Date(metrics.timestamp).toLocaleTimeString()}
              </div>
            </div>
          )}
          {metrics.last_updated && (
            <div>
              <span className="text-gray-500">Last Update:</span>
              <div className="font-mono text-gray-700">
                {new Date(metrics.last_updated).toLocaleTimeString()}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Performance Tips */}
      {metrics.total_execution_time_ms > 10000 && (
        <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
          <div className="flex items-start space-x-2">
            <Icon glyph="Bulb" size="small" className="text-yellow-600 mt-0.5" />
            <div>
              <div className="font-medium text-yellow-800 mb-1">Performance Tip:</div>
              <div className="text-yellow-700">
                Consider simplifying the query or reducing the number of tools used to improve response time.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Success Indicators */}
      {metrics.conversation_success && metrics.total_execution_time_ms < 5000 && (
        <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded text-xs">
          <div className="flex items-start space-x-2">
            <Icon glyph="Checkmark" size="small" className="text-green-600 mt-0.5" />
            <div>
              <div className="font-medium text-green-800 mb-1">Optimal Performance:</div>
              <div className="text-green-700">
                Agent completed successfully with excellent response time.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};