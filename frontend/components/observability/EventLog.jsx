/**
 * Event Log Component
 * Shows chronological log of all observability events
 */

'use client';

import React, { useState, useEffect, useRef } from 'react';
import Badge from '@leafygreen-ui/badge';
import Button from '@leafygreen-ui/button';
import Icon from '@leafygreen-ui/icon';

export const EventLog = ({ events, isConnected, onClear }) => {
  const [isAutoScroll, setIsAutoScroll] = useState(true);
  const [filterType, setFilterType] = useState('all');
  const logContainerRef = useRef(null);

  // Auto-scroll to bottom when new events arrive
  useEffect(() => {
    if (isAutoScroll && logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [events, isAutoScroll]);

  const getEventIcon = (eventType) => {
    switch (eventType) {
      case 'agent_run_started':
        return { icon: 'Play', color: 'text-blue-600' };
      case 'agent_run_completed':
        return { icon: 'Checkmark', color: 'text-green-600' };
      case 'agent_run_failed':
        return { icon: 'X', color: 'text-red-600' };
      case 'tool_call_initiated':
        return { icon: 'Refresh', color: 'text-blue-600' };
      case 'tool_call_completed':
        return { icon: 'CheckmarkWithCircle', color: 'text-green-600' };
      case 'tool_call_failed':
        return { icon: 'Warning', color: 'text-red-600' };
      case 'decision_made':
        return { icon: 'Bulb', color: 'text-purple-600' };
      case 'performance_metrics':
        return { icon: 'ChartLine', color: 'text-orange-600' };
      case 'status_update':
        return { icon: 'InfoWithCircle', color: 'text-blue-600' };
      case 'error_occurred':
        return { icon: 'Warning', color: 'text-red-600' };
      case 'connection_established':
        return { icon: 'Connect', color: 'text-green-600' };
      default:
        return { icon: 'Calendar', color: 'text-gray-600' };
    }
  };

  const getEventTypeLabel = (eventType) => {
    return eventType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const formatEventData = (event) => {
    const { event_type, data } = event;

    switch (event_type) {
      case 'agent_run_started':
        return `Started processing: "${data.message?.substring(0, 50)}..."`;
      
      case 'agent_run_completed':
        return `Completed successfully: ${data.response?.length || 0} character response`;
      
      case 'tool_call_initiated':
        return `Initiated ${data.tool_name} with ${Object.keys(data.arguments || {}).length} parameters`;
      
      case 'tool_call_completed':
        return `Completed ${data.tool_name} in ${data.execution_time_ms?.toFixed(0)}ms`;
      
      case 'decision_made':
        return `Made ${data.decision_type} with ${Math.round(data.confidence_score * 100)}% confidence`;
      
      case 'performance_metrics':
        return `Execution time: ${data.total_execution_time_ms?.toFixed(0)}ms`;
      
      case 'status_update':
        return data.message || `Status: ${data.status}`;
      
      case 'error_occurred':
        return `Error: ${data.error_message}`;
      
      default:
        return JSON.stringify(data, null, 2);
    }
  };

  const getFilteredEvents = () => {
    if (filterType === 'all') return events;
    
    const filterMap = {
      'runs': ['agent_run_started', 'agent_run_completed', 'agent_run_failed'],
      'tools': ['tool_call_initiated', 'tool_call_completed', 'tool_call_failed'],
      'decisions': ['decision_made'],
      'metrics': ['performance_metrics'],
      'errors': ['error_occurred', 'agent_run_failed', 'tool_call_failed'],
      'status': ['status_update', 'connection_established']
    };

    return events.filter(event => filterMap[filterType]?.includes(event.event_type));
  };

  const filteredEvents = getFilteredEvents();

  if (!events.length) {
    return (
      <div className="bg-gray-50 rounded-lg p-3 border">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm text-gray-800">Event Log</h3>
          <Badge variant={isConnected ? 'green' : 'red'} className="text-xs">
            {isConnected ? 'Live' : 'Disconnected'}
          </Badge>
        </div>
        <div className="text-center text-gray-500 text-sm py-6">
          No events yet. Waiting for agent activity...
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 rounded-lg p-3 border">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-sm text-gray-800">Event Log</h3>
        <div className="flex items-center space-x-2">
          <Badge variant="blue" className="text-xs">
            {filteredEvents.length} events
          </Badge>
          <Badge variant={isConnected ? 'green' : 'red'} className="text-xs">
            {isConnected ? 'Live' : 'Disconnected'}
          </Badge>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="text-xs border border-gray-300 rounded px-2 py-1"
          >
            <option value="all">All Events</option>
            <option value="runs">Runs</option>
            <option value="tools">Tool Calls</option>
            <option value="decisions">Decisions</option>
            <option value="metrics">Metrics</option>
            <option value="errors">Errors</option>
            <option value="status">Status</option>
          </select>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            size="xsmall"
            variant={isAutoScroll ? "primary" : "default"}
            onClick={() => setIsAutoScroll(!isAutoScroll)}
          >
            <Icon glyph={isAutoScroll ? "Pause" : "Play"} size="small" />
          </Button>
          <Button
            size="xsmall"
            variant="default"
            onClick={onClear}
            disabled={!isConnected}
          >
            Clear
          </Button>
        </div>
      </div>

      {/* Event Log Container */}
      <div
        ref={logContainerRef}
        className="bg-white rounded border max-h-64 overflow-y-auto"
      >
        {filteredEvents.length === 0 ? (
          <div className="text-center text-gray-500 text-sm py-4">
            No events match the current filter
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredEvents.map((event) => {
              const eventConfig = getEventIcon(event.event_type);
              
              return (
                <div
                  key={event.id}
                  className="p-3 hover:bg-gray-50 transition-colors duration-150"
                >
                  <div className="flex items-start space-x-3">
                    <Icon
                      glyph={eventConfig.icon}
                      size="small"
                      className={`${eventConfig.color} mt-0.5 flex-shrink-0`}
                    />
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <div className="text-xs font-medium text-gray-800 truncate">
                          {getEventTypeLabel(event.event_type)}
                        </div>
                        <div className="text-xs text-gray-500 flex-shrink-0 ml-2">
                          {event.timestamp ? new Date(event.timestamp).toLocaleTimeString() : 'Unknown'}
                        </div>
                      </div>
                      
                      <div className="text-xs text-gray-600 break-words">
                        {formatEventData(event)}
                      </div>
                      
                      {/* Additional Context */}
                      {event.run_id && (
                        <div className="text-xs text-gray-400 mt-1 font-mono">
                          Run: {event.run_id.substring(0, 8)}...
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-200 text-xs text-gray-500">
        <div>
          Showing {filteredEvents.length} of {events.length} events
        </div>
        <div className="flex items-center space-x-2">
          {isAutoScroll && (
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>Auto-scroll</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};