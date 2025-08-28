'use client';

import React, { useState, useEffect } from 'react';
import { H3, Body, Overline } from '@leafygreen-ui/typography';
import { palette } from '@leafygreen-ui/palette';
import { spacing } from '@leafygreen-ui/tokens';
import Card from '@leafygreen-ui/card';
import Button from '@leafygreen-ui/button';
import Badge from '@leafygreen-ui/badge';
import Code from '@leafygreen-ui/code';
import Icon from '@leafygreen-ui/icon';

/**
 * Tool Inspector Panel
 * Implements MAS Research directive: "Expandable Nodes with detailed view containing 
 * full function call, exact input parameters, complete raw data returned"
 * Provides comprehensive tool invocation inspection and debugging capabilities
 */
const ToolInspectorPanel = ({ 
  toolCallHistory = [],
  isSimulationRunning,
  selectedToolCall,
  onToolCallSelect
}) => {
  const [expandedToolCalls, setExpandedToolCalls] = useState(new Set());
  const [filterType, setFilterType] = useState('all');
  const [sortBy, setSortBy] = useState('timestamp');
  const [performanceStats, setPerformanceStats] = useState({});

  // Calculate performance statistics
  useEffect(() => {
    if (toolCallHistory.length === 0) return;

    const stats = toolCallHistory.reduce((acc, toolCall) => {
      const type = toolCall.toolType;
      if (!acc[type]) {
        acc[type] = {
          totalCalls: 0,
          successCalls: 0,
          totalLatency: 0,
          minLatency: Infinity,
          maxLatency: 0,
          avgLatency: 0,
          successRate: 0,
          errorCount: 0
        };
      }

      acc[type].totalCalls += 1;
      if (toolCall.success) acc[type].successCalls += 1;
      else acc[type].errorCount += 1;

      if (toolCall.duration) {
        acc[type].totalLatency += toolCall.duration;
        acc[type].minLatency = Math.min(acc[type].minLatency, toolCall.duration);
        acc[type].maxLatency = Math.max(acc[type].maxLatency, toolCall.duration);
        acc[type].avgLatency = acc[type].totalLatency / acc[type].totalCalls;
      }

      acc[type].successRate = (acc[type].successCalls / acc[type].totalCalls) * 100;

      return acc;
    }, {});

    setPerformanceStats(stats);
  }, [toolCallHistory]);

  const toggleExpansion = (toolCallId) => {
    setExpandedToolCalls(prev => {
      const newSet = new Set(prev);
      if (newSet.has(toolCallId)) {
        newSet.delete(toolCallId);
      } else {
        newSet.add(toolCallId);
      }
      return newSet;
    });
  };

  const getToolTypeColor = (toolType) => {
    const colors = {
      database: palette.blue.base,
      api: palette.green.base,
      ml_model: palette.purple.base,
      file_system: palette.yellow.base,
      analysis: palette.red.base,
      validation: palette.gray.base,
      notification: palette.blue.dark1,
      compliance: palette.red.dark1
    };
    return colors[toolType] || palette.gray.base;
  };

  const getToolIcon = (toolType) => {
    const icons = {
      database: '🗄️',
      api: '🌐',
      ml_model: '🧠',
      file_system: '📁',
      analysis: '📊',
      validation: '✅',
      notification: '📧',
      compliance: '⚖️'
    };
    return icons[toolType] || '🔧';
  };

  const filteredAndSortedToolCalls = toolCallHistory
    .filter(toolCall => filterType === 'all' || toolCall.toolType === filterType)
    .sort((a, b) => {
      switch (sortBy) {
        case 'timestamp':
          return b.startTime - a.startTime;
        case 'duration':
          return (b.duration || 0) - (a.duration || 0);
        case 'name':
          return a.toolName.localeCompare(b.toolName);
        case 'status':
          return a.success === b.success ? 0 : a.success ? 1 : -1;
        default:
          return 0;
      }
    });

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const formatDuration = (duration) => {
    if (!duration) return 'N/A';
    if (duration < 1000) return `${duration}ms`;
    return `${(duration / 1000).toFixed(2)}s`;
  };

  const formatJSON = (obj) => {
    return JSON.stringify(obj, null, 2);
  };

  return (
    <div style={{
      display: 'grid',
      gridTemplateRows: 'auto auto 1fr',
      height: '100%',
      maxHeight: '100%'
    }}>
      {/* Tool Inspector Header */}
      <div style={{
        padding: spacing[3],
        background: `linear-gradient(135deg, ${palette.yellow.light3}20, ${palette.gray.light3}20)`,
        borderRadius: '12px',
        border: `2px solid ${palette.yellow.base}`,
        marginBottom: spacing[3]
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: spacing[2]
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '8px',
              background: `linear-gradient(135deg, ${palette.yellow.base}, ${palette.yellow.dark1})`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px'
            }}>
              🔧
            </div>
            <div>
              <H3 style={{
                fontSize: '20px',
                color: palette.yellow.dark2,
                margin: 0,
                fontFamily: "'Euclid Circular A', sans-serif"
              }}>
                Tool Inspector
              </H3>
              <Body style={{
                fontSize: '14px',
                color: palette.gray.dark1,
                margin: 0
              }}>
                First-class tool invocation debugging with expandable call details and performance metrics
              </Body>
            </div>
          </div>
          <Badge variant={isSimulationRunning ? "green" : "lightgray"}>
            {toolCallHistory.length} CALLS
          </Badge>
        </div>

        {/* Filters and Controls */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: spacing[2],
          marginTop: spacing[3],
          padding: spacing[2],
          background: palette.white,
          borderRadius: '8px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: spacing[1] }}>
            <Body style={{ fontSize: '12px', color: palette.gray.dark1, margin: 0 }}>Filter:</Body>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              style={{
                padding: '4px 8px',
                fontSize: '11px',
                borderRadius: '4px',
                border: `1px solid ${palette.gray.light2}`,
                background: palette.white
              }}
            >
              <option value="all">All Tools</option>
              <option value="database">Database</option>
              <option value="api">API</option>
              <option value="ml_model">ML Model</option>
              <option value="file_system">File System</option>
              <option value="analysis">Analysis</option>
              <option value="validation">Validation</option>
              <option value="notification">Notification</option>
              <option value="compliance">Compliance</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: spacing[1] }}>
            <Body style={{ fontSize: '12px', color: palette.gray.dark1, margin: 0 }}>Sort:</Body>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={{
                padding: '4px 8px',
                fontSize: '11px',
                borderRadius: '4px',
                border: `1px solid ${palette.gray.light2}`,
                background: palette.white
              }}
            >
              <option value="timestamp">Latest First</option>
              <option value="duration">Duration</option>
              <option value="name">Name</option>
              <option value="status">Status</option>
            </select>
          </div>
        </div>
      </div>

      {/* Performance Summary */}
      {Object.keys(performanceStats).length > 0 && (
        <Card style={{
          padding: spacing[3],
          marginBottom: spacing[3],
          background: palette.gray.light3
        }}>
          <Body style={{
            fontSize: '12px',
            fontWeight: 600,
            color: palette.gray.dark3,
            marginBottom: spacing[2]
          }}>
            Performance Summary
          </Body>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: spacing[2]
          }}>
            {Object.entries(performanceStats).map(([toolType, stats]) => (
              <div
                key={toolType}
                style={{
                  padding: spacing[1],
                  background: palette.white,
                  borderRadius: '6px',
                  border: `1px solid ${getToolTypeColor(toolType)}20`
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: spacing[1], marginBottom: spacing[1] }}>
                  <span style={{ fontSize: '10px' }}>{getToolIcon(toolType)}</span>
                  <Body style={{ fontSize: '10px', fontWeight: 600, color: palette.gray.dark3, margin: 0 }}>
                    {toolType.replace('_', ' ').toUpperCase()}
                  </Body>
                </div>
                <div style={{ fontSize: '8px', color: palette.gray.dark1 }}>
                  Calls: {stats.totalCalls} | Success: {stats.successRate.toFixed(1)}%<br/>
                  Avg: {formatDuration(stats.avgLatency)} | Max: {formatDuration(stats.maxLatency)}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Tool Call List */}
      <div style={{
        overflowY: 'auto',
        display: 'grid',
        gap: spacing[2],
        padding: spacing[2]
      }}>
        {filteredAndSortedToolCalls.length === 0 ? (
          <Card style={{
            padding: spacing[4],
            textAlign: 'center',
            background: palette.gray.light3
          }}>
            <Body style={{ color: palette.gray.dark1 }}>
              {isSimulationRunning 
                ? 'Waiting for tool invocations...' 
                : 'No tool calls recorded. Start simulation to see tool invocations.'}
            </Body>
          </Card>
        ) : (
          filteredAndSortedToolCalls.map(toolCall => {
            const isExpanded = expandedToolCalls.has(toolCall.id);
            const toolColor = getToolTypeColor(toolCall.toolType);
            
            return (
              <Card
                key={toolCall.id}
                style={{
                  border: `2px solid ${toolColor}20`,
                  overflow: 'hidden',
                  background: toolCall.success ? palette.white : palette.red.light3
                }}
              >
                {/* Tool Call Header */}
                <div
                  onClick={() => toggleExpansion(toolCall.id)}
                  style={{
                    padding: spacing[2],
                    background: `linear-gradient(135deg, ${toolColor}10, ${palette.white})`,
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderBottom: isExpanded ? `1px solid ${palette.gray.light2}` : 'none'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2] }}>
                    <div style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '6px',
                      background: toolColor,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '12px'
                    }}>
                      {getToolIcon(toolCall.toolType)}
                    </div>
                    <div>
                      <Body style={{
                        fontSize: '12px',
                        fontWeight: 600,
                        color: palette.gray.dark3,
                        margin: 0
                      }}>
                        {toolCall.toolName}
                      </Body>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: spacing[2],
                        marginTop: '2px'
                      }}>
                        <Overline style={{
                          fontSize: '8px',
                          color: palette.gray.base,
                          margin: 0
                        }}>
                          {formatTimestamp(toolCall.startTime)} • {toolCall.agentId}
                        </Overline>
                        {toolCall.duration && (
                          <Badge
                            variant="lightgray"
                            style={{
                              fontSize: '7px',
                              background: toolCall.success ? palette.green.light2 : palette.red.light2,
                              color: toolCall.success ? palette.green.dark1 : palette.red.dark1
                            }}
                          >
                            {formatDuration(toolCall.duration)}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: spacing[1] }}>
                    <div style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: toolCall.success ? palette.green.base : palette.red.base
                    }} />
                    <span style={{ fontSize: '12px', color: palette.gray.base }}>
                      {isExpanded ? '▼' : '▶'}
                    </span>
                  </div>
                </div>

                {/* Expanded Tool Call Details */}
                {isExpanded && (
                  <div style={{ padding: spacing[3] }}>
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: spacing[3],
                      marginBottom: spacing[3]
                    }}>
                      {/* Input Parameters */}
                      <div>
                        <Body style={{
                          fontSize: '11px',
                          fontWeight: 600,
                          color: palette.gray.dark2,
                          margin: `0 0 ${spacing[1]}px 0`
                        }}>
                          📥 Input Parameters
                        </Body>
                        <Code
                          language="json"
                          style={{
                            fontSize: '9px',
                            maxHeight: '120px',
                            overflowY: 'auto'
                          }}
                        >
                          {formatJSON(toolCall.input)}
                        </Code>
                      </div>

                      {/* Output/Error */}
                      <div>
                        <Body style={{
                          fontSize: '11px',
                          fontWeight: 600,
                          color: palette.gray.dark2,
                          margin: `0 0 ${spacing[1]}px 0`
                        }}>
                          {toolCall.success ? '📤 Output Data' : '❌ Error Details'}
                        </Body>
                        <Code
                          language="json"
                          style={{
                            fontSize: '9px',
                            maxHeight: '120px',
                            overflowY: 'auto'
                          }}
                        >
                          {formatJSON(toolCall.success ? toolCall.output : {
                            error: toolCall.errorMessage,
                            timestamp: toolCall.endTime,
                            duration: toolCall.duration
                          })}
                        </Code>
                      </div>
                    </div>

                    {/* Execution Metrics */}
                    <div style={{
                      padding: spacing[2],
                      background: palette.gray.light3,
                      borderRadius: '6px'
                    }}>
                      <Body style={{
                        fontSize: '11px',
                        fontWeight: 600,
                        color: palette.gray.dark2,
                        margin: `0 0 ${spacing[1]}px 0`
                      }}>
                        ⚡ Execution Metrics
                      </Body>
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                        gap: spacing[2],
                        fontSize: '9px',
                        color: palette.gray.dark1
                      }}>
                        <div><strong>Start Time:</strong> {formatTimestamp(toolCall.startTime)}</div>
                        <div><strong>End Time:</strong> {toolCall.endTime ? formatTimestamp(toolCall.endTime) : 'Running'}</div>
                        <div><strong>Duration:</strong> {formatDuration(toolCall.duration)}</div>
                        <div><strong>Status:</strong> {toolCall.success ? '✅ Success' : '❌ Failed'}</div>
                        <div><strong>Agent:</strong> {toolCall.agentId}</div>
                        <div><strong>Tool Type:</strong> {toolCall.toolType.replace('_', ' ')}</div>
                      </div>
                    </div>
                  </div>
                )}
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
};

export default ToolInspectorPanel;