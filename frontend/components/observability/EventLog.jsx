/**
 * Event Log Component
 * Shows chronological log of all observability events
 */

'use client';

import React, { useState, useEffect, useRef } from 'react';
import Badge from '@leafygreen-ui/badge';
import Button from '@leafygreen-ui/button';
import Icon from '@leafygreen-ui/icon';
import Card from '@leafygreen-ui/card';
import { Body, H3 } from '@leafygreen-ui/typography';
import { palette } from '@leafygreen-ui/palette';
import { spacing } from '@leafygreen-ui/tokens';

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
        return { icon: 'Play', color: palette.blue.base };
      case 'agent_run_completed':
        return { icon: 'Checkmark', color: palette.green.base };
      case 'agent_run_failed':
        return { icon: 'X', color: palette.red.base };
      case 'tool_call_initiated':
        return { icon: 'Refresh', color: palette.blue.base };
      case 'tool_call_completed':
        return { icon: 'CheckmarkWithCircle', color: palette.green.base };
      case 'tool_call_failed':
        return { icon: 'Warning', color: palette.red.base };
      case 'decision_made':
        return { icon: 'Bulb', color: palette.purple.base };
      case 'performance_metrics':
        return { icon: 'Charts', color: palette.yellow.base };
      case 'status_update':
        return { icon: 'InfoWithCircle', color: palette.blue.base };
      case 'error_occurred':
        return { icon: 'Warning', color: palette.red.base };
      case 'connection_established':
        return { icon: 'Connect', color: palette.green.base };
      default:
        return { icon: 'Calendar', color: palette.gray.base };
    }
  };

  const getEventTypeLabel = (eventType) => {
    return eventType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const formatEventData = (event) => {
    const { event_type, data } = event;

    try {
      switch (event_type) {
        case 'agent_run_started':
          return `Started processing: "${data?.message?.substring(0, 50)}..."`;
        
        case 'agent_run_completed':
          return `Completed successfully: ${data?.response?.length || 0} character response`;
        
        case 'tool_call_initiated':
          return `Initiated ${data?.tool_name} with ${Object.keys(data?.arguments || {}).length} parameters`;
        
        case 'tool_call_completed':
          return `Completed ${data?.tool_name}`;
        
        case 'decision_made':
          return `Made ${data?.decision_type} with ${Math.round((data?.confidence_score || 0) * 100)}% confidence`;
        
        case 'performance_metrics':
          return `Performance metrics updated`;
        
        case 'status_update':
          return data?.message || `Status: ${data?.status}`;
        
        case 'error_occurred':
          return `Error: ${data?.error_message}`;
        
        default:
          // Better formatting for unknown event types
          if (typeof data === 'object' && data !== null) {
            const keys = Object.keys(data);
            if (keys.length === 0) return 'No additional data';
            if (keys.length === 1) return `${keys[0]}: ${data[keys[0]]}`;
            return keys.slice(0, 3).map(key => `${key}: ${data[key]}`).join(', ') + 
                   (keys.length > 3 ? '...' : '');
          }
          return String(data);
      }
    } catch (error) {
      return 'Error parsing event data';
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
      <Card style={{ background: palette.gray.light3, padding: spacing[3] }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing[3] }}>
          <H3 style={{ margin: 0, fontSize: '14px', color: palette.gray.dark3 }}>Event Log</H3>
          <Badge variant={isConnected ? 'green' : 'red'} style={{ fontSize: '11px' }}>
            {isConnected ? 'Live' : 'Disconnected'}
          </Badge>
        </div>
        <div style={{ textAlign: 'center', color: palette.gray.dark1, padding: `${spacing[4]}px 0` }}>
          <Body size="small">No events yet. Waiting for agent activity...</Body>
        </div>
      </Card>
    );
  }

  return (
    <Card style={{ background: palette.gray.light3, padding: spacing[3] }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing[3] }}>
        <H3 style={{ margin: 0, fontSize: '14px', color: palette.gray.dark3 }}>Event Log</H3>
        <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2] }}>
          <Badge variant="blue" style={{ fontSize: '11px' }}>
            {filteredEvents.length} events
          </Badge>
          <Badge variant={isConnected ? 'green' : 'red'} style={{ fontSize: '11px' }}>
            {isConnected ? 'Live' : 'Disconnected'}
          </Badge>
        </div>
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing[3] }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2] }}>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            style={{ 
              fontSize: '12px', 
              border: `1px solid ${palette.gray.light2}`, 
              borderRadius: '4px', 
              padding: `${spacing[1]}px ${spacing[2]}px`,
              background: palette.white
            }}
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
        
        <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2] }}>
          <Button
            size="xsmall"
            variant={isAutoScroll ? "primary" : "default"}
            onClick={() => setIsAutoScroll(!isAutoScroll)}
            leftGlyph={<Icon glyph={isAutoScroll ? "Pause" : "Play"} />}
          >
            {isAutoScroll ? 'Pause' : 'Play'}
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
        style={{ 
          background: palette.white, 
          borderRadius: '4px', 
          border: `1px solid ${palette.gray.light2}`, 
          maxHeight: '300px', 
          overflowY: 'auto' 
        }}
      >
        {filteredEvents.length === 0 ? (
          <div style={{ textAlign: 'center', color: palette.gray.dark1, padding: spacing[4] }}>
            <Body size="small">No events match the current filter</Body>
          </div>
        ) : (
          <div>
            {filteredEvents.map((event, index) => {
              const eventConfig = getEventIcon(event.event_type);
              
              return (
                <div
                  key={event.id}
                  style={{
                    padding: spacing[3],
                    borderBottom: index < filteredEvents.length - 1 ? `1px solid ${palette.gray.light2}` : 'none',
                    cursor: 'default'
                  }}
                  onMouseEnter={(e) => e.target.style.background = palette.gray.light3}
                  onMouseLeave={(e) => e.target.style.background = 'transparent'}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: spacing[2] }}>
                    <Icon
                      glyph={eventConfig.icon}
                      size={16}
                      fill={eventConfig.color}
                      style={{ marginTop: '2px', flexShrink: 0 }}
                    />
                    
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ marginBottom: spacing[1] }}>
                        <Body size="small" weight="medium" style={{ 
                          color: palette.gray.dark3, 
                          margin: 0,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}>
                          {getEventTypeLabel(event.event_type)}
                        </Body>
                      </div>
                      
                      <Body size="small" style={{ 
                        color: palette.gray.dark1, 
                        margin: 0,
                        wordBreak: 'break-word',
                        lineHeight: 1.4
                      }}>
                        {formatEventData(event)}
                      </Body>
                      
                      {/* Additional Context */}
                      {event.run_id && (
                        <Body size="small" style={{ 
                          color: palette.gray.base, 
                          margin: `${spacing[1]}px 0 0 0`,
                          fontFamily: 'monospace',
                          fontSize: '11px'
                        }}>
                          Run: {event.run_id.substring(0, 8)}...
                        </Body>
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
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        marginTop: spacing[3], 
        paddingTop: spacing[3], 
        borderTop: `1px solid ${palette.gray.light2}`,
        fontSize: '12px',
        color: palette.gray.dark1
      }}>
        <Body size="small" style={{ margin: 0, color: palette.gray.dark1 }}>
          Showing {filteredEvents.length} of {events.length} events
        </Body>
        <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2] }}>
          {isAutoScroll && (
            <div style={{ display: 'flex', alignItems: 'center', gap: spacing[1] }}>
              <div style={{
                width: '8px',
                height: '8px',
                background: palette.green.base,
                borderRadius: '50%',
                animation: 'pulse 2s ease-in-out infinite'
              }} />
              <Body size="small" style={{ margin: 0, color: palette.gray.dark1 }}>Auto-scroll</Body>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};