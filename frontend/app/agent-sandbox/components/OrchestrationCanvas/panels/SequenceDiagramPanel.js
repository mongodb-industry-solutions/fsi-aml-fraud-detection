'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { palette } from '@leafygreen-ui/palette';
import { spacing } from '@leafygreen-ui/tokens';
import { Body, Overline } from '@leafygreen-ui/typography';
import Button from '@leafygreen-ui/button';

const SequenceDiagramPanel = ({
  nodes = [],
  messages = [],
  isSimulationRunning = false,
  selectedAgent = null,
  onAgentSelect,
  onMessageSelect,
  selectedMessage = null
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  // Removed filteredMessages state - now computed directly with useMemo
  const [timeRange, setTimeRange] = useState({ start: null, end: null });
  const scrollContainerRef = useRef(null);

  // Message types with enhanced styling
  const messageTypes = {
    'task_delegation': {
      color: palette.blue.base,
      icon: '📋',
      label: 'Task Delegation',
      priority: 'high'
    },
    'data_query': {
      color: palette.green.base,
      icon: '❓',
      label: 'Data Query',
      priority: 'medium'
    },
    'result_return': {
      color: palette.yellow.dark1,
      icon: '📊',
      label: 'Result Return',
      priority: 'medium'
    },
    'validation_request': {
      color: palette.red.base,
      icon: '🔍',
      label: 'Validation Request',
      priority: 'high'
    },
    'consensus_vote': {
      color: palette.blue.dark2,
      icon: '🗳️',
      label: 'Consensus Vote',
      priority: 'high'
    },
    'tool_invocation': {
      color: palette.gray.dark2,
      icon: '🔧',
      label: 'Tool Invocation',
      priority: 'critical'
    },
    'backtrack_signal': {
      color: palette.yellow.base,
      icon: '↩️',
      label: 'Backtrack Signal',
      priority: 'low'
    },
    'error_report': {
      color: palette.red.dark2,
      icon: '⚠️',
      label: 'Error Report',
      priority: 'critical'
    }
  };

  // Process and sort messages chronologically - simplified to avoid dependency loops
  const processedMessages = useMemo(() => {
    if (!messages || messages.length === 0) return [];

    return messages
      .map((msg, index) => ({
        ...msg,
        id: msg.id || `msg_${index}`,
        timestamp: msg.timestamp || Date.now() - (messages.length - index) * 1000,
        type: msg.type || 'data_query',
        sourceAgent: msg.sourceAgent || msg.sourceId, // Use provided names or fallback to ID
        targetAgent: msg.targetAgent || msg.targetId,
        payload: msg.payload || {},
        latency: msg.latency || Math.random() * 200 + 50,
        success: msg.success !== false
      }))
      .sort((a, b) => a.timestamp - b.timestamp);
  }, [messages]); // Only depend on messages, not nodes

  // Filter messages based on selected agent - computed directly to avoid useEffect loops
  const filteredMessages = useMemo(() => {
    if (!selectedAgent) return processedMessages;
    
    return processedMessages.filter(msg => 
      msg.sourceId === selectedAgent || msg.targetId === selectedAgent
    );
  }, [processedMessages, selectedAgent]);

  // Auto-scroll to latest message
  useEffect(() => {
    if (autoScroll && scrollContainerRef.current && isSimulationRunning) {
      const container = scrollContainerRef.current;
      container.scrollTop = container.scrollHeight;
    }
  }, [filteredMessages, autoScroll, isSimulationRunning]);

  // Calculate time range for the timeline
  useEffect(() => {
    if (filteredMessages.length > 0) {
      const timestamps = filteredMessages.map(msg => msg.timestamp);
      setTimeRange({
        start: Math.min(...timestamps),
        end: Math.max(...timestamps)
      });
    }
  }, [filteredMessages]);

  // Render agent swimlane headers
  const renderAgentHeaders = () => {
    const activeAgents = nodes.filter(node => 
      filteredMessages.some(msg => 
        msg.sourceId === node.id || msg.targetId === node.id
      )
    );

    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        padding: `${spacing[2]}px ${spacing[3]}px`,
        borderBottom: `1px solid ${palette.gray.light2}`,
        background: palette.gray.light3,
        gap: spacing[4],
        minHeight: '60px'
      }}>
        <div style={{ minWidth: '80px', fontSize: '11px', fontWeight: 600, color: palette.gray.dark2 }}>
          TIME
        </div>
        {activeAgents.map(agent => (
          <div
            key={agent.id}
            onClick={() => onAgentSelect?.(agent.id === selectedAgent ? null : agent.id)}
            style={{
              flex: 1,
              minWidth: '120px',
              padding: `${spacing[1]}px ${spacing[2]}px`,
              textAlign: 'center',
              borderRadius: '6px',
              background: agent.id === selectedAgent ? palette.blue.light3 : palette.white,
              border: `1px solid ${agent.id === selectedAgent ? palette.blue.base : palette.gray.light2}`,
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}
          >
            <Body style={{
              fontSize: '12px',
              fontWeight: 600,
              color: agent.id === selectedAgent ? palette.blue.dark2 : palette.gray.dark3,
              margin: 0
            }}>
              {agent.data?.name || agent.id}
            </Body>
            <Overline style={{
              fontSize: '9px',
              color: palette.gray.dark1,
              margin: 0,
              textTransform: 'uppercase'
            }}>
              {agent.data?.type || 'agent'}
            </Overline>
          </div>
        ))}
      </div>
    );
  };

  // Render sequence message
  const renderMessage = (message, index) => {
    const messageConfig = messageTypes[message.type] || messageTypes.data_query;
    const isSelected = selectedMessage === message.id;
    
    const sourceAgent = nodes.find(n => n.id === message.sourceId);
    const targetAgent = nodes.find(n => n.id === message.targetId);
    
    if (!sourceAgent || !targetAgent) return null;

    const relativeTime = timeRange.start ? message.timestamp - timeRange.start : 0;
    const timeLabel = new Date(message.timestamp).toLocaleTimeString('en-US', {
      hour12: false,
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 1
    });

    return (
      <div
        key={message.id}
        onClick={() => onMessageSelect?.(message.id)}
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: `${spacing[2]}px ${spacing[3]}px`,
          borderBottom: `1px solid ${palette.gray.light2}`,
          background: isSelected ? `${messageConfig.color}15` : 
                     index % 2 === 0 ? palette.white : palette.gray.light3,
          borderLeft: isSelected ? `4px solid ${messageConfig.color}` : 'none',
          cursor: 'pointer',
          transition: 'all 0.3s ease',
          gap: spacing[4]
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = isSelected ? `${messageConfig.color}25` : `${messageConfig.color}10`;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = isSelected ? `${messageConfig.color}15` : 
                                           index % 2 === 0 ? palette.white : palette.gray.light3;
        }}
      >
        {/* Timestamp */}
        <div style={{
          minWidth: '80px',
          fontSize: '10px',
          color: palette.gray.dark1,
          fontFamily: 'monospace'
        }}>
          {timeLabel}
        </div>

        {/* Message Flow Visualization */}
        <div style={{
          flex: 1,
          position: 'relative',
          minHeight: '40px',
          display: 'flex',
          alignItems: 'center'
        }}>
          {/* Message Arrow */}
          <div style={{
            position: 'absolute',
            left: '10%',
            right: '10%',
            height: '2px',
            background: `linear-gradient(90deg, ${messageConfig.color}, ${messageConfig.color}aa)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            {/* Arrow Head */}
            <div style={{
              position: 'absolute',
              right: 0,
              width: 0,
              height: 0,
              borderLeft: `8px solid ${messageConfig.color}`,
              borderTop: '4px solid transparent',
              borderBottom: '4px solid transparent'
            }} />
            
            {/* Message Content Badge */}
            <div style={{
              background: messageConfig.color,
              color: palette.white,
              borderRadius: '12px',
              padding: '2px 8px',
              fontSize: '10px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
            }}>
              <span>{messageConfig.icon}</span>
              <span>{messageConfig.label}</span>
            </div>
          </div>

          {/* Source and Target Labels */}
          <div style={{
            position: 'absolute',
            left: 0,
            fontSize: '10px',
            color: palette.gray.dark2,
            fontWeight: 600
          }}>
            {message.sourceAgent}
          </div>
          <div style={{
            position: 'absolute',
            right: 0,
            fontSize: '10px',
            color: palette.gray.dark2,
            fontWeight: 600
          }}>
            {message.targetAgent}
          </div>
        </div>

        {/* Message Metadata */}
        <div style={{
          minWidth: '80px',
          fontSize: '9px',
          color: palette.gray.dark1,
          textAlign: 'right'
        }}>
          <div>{Math.round(message.latency)}ms</div>
          {message.success ? (
            <span style={{ color: palette.green.base }}>✓ Success</span>
          ) : (
            <span style={{ color: palette.red.base }}>✗ Failed</span>
          )}
        </div>
      </div>
    );
  };

  // Render expanded message details
  const renderMessageDetails = () => {
    if (!selectedMessage) return null;

    const message = filteredMessages.find(m => m.id === selectedMessage);
    if (!message) return null;

    const messageConfig = messageTypes[message.type] || messageTypes.data_query;

    return (
      <div style={{
        borderTop: `2px solid ${messageConfig.color}`,
        background: `${messageConfig.color}08`,
        padding: spacing[3]
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: spacing[2]
        }}>
          <div>
            <Body style={{
              fontSize: '14px',
              fontWeight: 700,
              color: palette.gray.dark3,
              margin: 0
            }}>
              Message Details
            </Body>
            <Overline style={{
              fontSize: '10px',
              color: messageConfig.color,
              margin: 0,
              textTransform: 'uppercase'
            }}>
              {messageConfig.label} • ID: {message.id}
            </Overline>
          </div>
          <Button
            size="xsmall"
            variant="baseGray"
            onClick={() => onMessageSelect?.(null)}
          >
            Close
          </Button>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: spacing[2],
          marginBottom: spacing[2]
        }}>
          <div>
            <Overline style={{
              fontSize: '9px',
              color: palette.gray.dark2,
              margin: `0 0 ${spacing[1]}px 0`,
              textTransform: 'uppercase'
            }}>
              Routing
            </Overline>
            <div style={{ fontSize: '11px', color: palette.gray.dark1 }}>
              <div><strong>From:</strong> {message.sourceAgent}</div>
              <div><strong>To:</strong> {message.targetAgent}</div>
              <div><strong>Latency:</strong> {Math.round(message.latency)}ms</div>
            </div>
          </div>

          <div>
            <Overline style={{
              fontSize: '9px',
              color: palette.gray.dark2,
              margin: `0 0 ${spacing[1]}px 0`,
              textTransform: 'uppercase'
            }}>
              Timing
            </Overline>
            <div style={{ fontSize: '11px', color: palette.gray.dark1 }}>
              <div><strong>Timestamp:</strong> {new Date(message.timestamp).toLocaleString()}</div>
              <div><strong>Status:</strong> {message.success ? 'Success' : 'Failed'}</div>
            </div>
          </div>
        </div>

        <div>
          <Overline style={{
            fontSize: '9px',
            color: palette.gray.dark2,
            margin: `0 0 ${spacing[1]}px 0`,
            textTransform: 'uppercase'
          }}>
            Payload Data
          </Overline>
          <pre style={{
            background: palette.gray.light2,
            padding: spacing[2],
            borderRadius: '6px',
            fontSize: '10px',
            color: palette.gray.dark3,
            fontFamily: 'Monaco, Menlo, monospace',
            overflow: 'auto',
            maxHeight: '150px',
            margin: 0
          }}>
            {JSON.stringify(message.payload, null, 2)}
          </pre>
        </div>
      </div>
    );
  };

  return (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      background: palette.white,
      border: `1px solid ${palette.gray.light2}`,
      borderRadius: '12px 12px 0 0',
      boxShadow: '0 -4px 20px rgba(0,0,0,0.1)',
      zIndex: 1000,
      transform: isExpanded ? 'translateY(0)' : 'translateY(calc(100% - 60px))',
      transition: 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
      maxHeight: '70vh'
    }}>
      {/* Panel Header */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: `${spacing[2]}px ${spacing[3]}px`,
          background: palette.gray.light3,
          borderRadius: '12px 12px 0 0',
          cursor: 'pointer',
          borderBottom: `1px solid ${palette.gray.light2}`
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2] }}>
          <Body style={{
            fontSize: '14px',
            fontWeight: 700,
            color: palette.gray.dark3,
            margin: 0
          }}>
            Message Sequence Timeline
          </Body>
          <div style={{
            background: palette.blue.base,
            color: palette.white,
            borderRadius: '12px',
            padding: '2px 8px',
            fontSize: '10px',
            fontWeight: 600
          }}>
            {filteredMessages.length} messages
          </div>
          {selectedAgent && (
            <div style={{
              background: palette.green.base,
              color: palette.white,
              borderRadius: '12px',
              padding: '2px 8px',
              fontSize: '10px',
              fontWeight: 600
            }}>
              Filtered: {nodes.find(n => n.id === selectedAgent)?.data?.name}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2] }}>
          <Button
            size="xsmall"
            variant={autoScroll ? 'primary' : 'baseGray'}
            onClick={(e) => {
              e.stopPropagation();
              setAutoScroll(!autoScroll);
            }}
          >
            Auto-scroll
          </Button>
          <span style={{
            fontSize: '16px',
            color: palette.gray.base,
            transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.3s ease'
          }}>
            ▼
          </span>
        </div>
      </div>

      {/* Sequence Content */}
      {isExpanded && (
        <div style={{ height: 'calc(70vh - 120px)', display: 'flex', flexDirection: 'column' }}>
          {renderAgentHeaders()}
          
          <div
            ref={scrollContainerRef}
            style={{
              flex: 1,
              overflowY: 'auto',
              background: palette.white
            }}
          >
            {filteredMessages.length === 0 ? (
              <div style={{
                padding: spacing[4],
                textAlign: 'center',
                color: palette.gray.dark1
              }}>
                <div style={{ fontSize: '48px', marginBottom: spacing[2] }}>💬</div>
                <Body style={{ margin: 0, fontSize: '14px' }}>
                  {selectedAgent ? 'No messages for selected agent' : 'Start simulation to see message flow'}
                </Body>
              </div>
            ) : (
              filteredMessages.map((message, index) => renderMessage(message, index))
            )}
          </div>

          {selectedMessage && renderMessageDetails()}
        </div>
      )}
    </div>
  );
};

export default SequenceDiagramPanel;