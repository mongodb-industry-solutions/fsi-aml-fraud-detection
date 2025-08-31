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
import Card from '@leafygreen-ui/card';
import { Body, H3 } from '@leafygreen-ui/typography';
import { palette } from '@leafygreen-ui/palette';
import { spacing } from '@leafygreen-ui/tokens';

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

  const toggleToolExpansion = (uniqueKey) => {
    setExpandedTool(expandedTool === uniqueKey ? null : uniqueKey);
  };

  if (!toolCalls.length) {
    return null;
  }

  return (
    <Card style={{ background: palette.gray.light3, padding: spacing[3] }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing[3] }}>
        <H3 style={{ margin: 0, fontSize: '14px', color: palette.gray.dark3 }}>Tool Calls</H3>
        <Badge variant="blue" style={{ fontSize: '11px' }}>
          {toolCalls.length} tools
        </Badge>
      </div>

      <div>
        {toolCalls.map((toolCall, index) => {
          const statusConfig = getToolStatusConfig(toolCall.status);
          // Create unique key combining tool_call_id with status and index
          const uniqueKey = `${toolCall.id}-${toolCall.status}-${index}`;
          const isExpanded = expandedTool === uniqueKey;

          return (
            <div
              key={uniqueKey}
              style={{
                background: palette.white,
                borderRadius: '6px',
                border: `1px solid ${palette.gray.light2}`,
                padding: spacing[3],
                marginBottom: spacing[2],
                transition: 'all 0.2s ease'
              }}
            >
              {/* Tool Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: spacing[3], flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2] }}>
                    {statusConfig.showSpinner ? (
                      <Spinner size="small" />
                    ) : (
                      <Icon glyph={statusConfig.icon} size={16} fill={statusConfig.color === 'green' ? palette.green.base : statusConfig.color === 'red' ? palette.red.base : palette.blue.base} />
                    )}
                    <Badge variant={statusConfig.color} style={{ fontSize: '11px' }}>
                      {statusConfig.label}
                    </Badge>
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Body weight="medium" size="small" style={{ 
                      margin: 0, 
                      color: palette.gray.dark3,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {formatToolName(toolCall.name)}
                    </Body>
                    <Body size="small" style={{ 
                      margin: 0, 
                      color: palette.gray.dark1,
                      fontSize: '11px'
                    }}>
                      {/* Duration removed */}
                    </Body>
                  </div>
                </div>

                <Button
                  size="xsmall"
                  variant="default"
                  onClick={() => toggleToolExpansion(uniqueKey)}
                  leftGlyph={<Icon glyph={isExpanded ? "ChevronUp" : "ChevronDown"} />}
                />
              </div>

              {/* Expanded Tool Details */}
              {isExpanded && (
                <div style={{ 
                  marginTop: spacing[3], 
                  paddingTop: spacing[3], 
                  borderTop: `1px solid ${palette.gray.light2}` 
                }}>
                  {/* Arguments */}
                  {toolCall.arguments && (
                    <div style={{ marginBottom: spacing[3] }}>
                      <Body size="small" weight="medium" style={{ 
                        color: palette.gray.dark2, 
                        margin: `0 0 ${spacing[1]}px 0`,
                        fontSize: '11px'
                      }}>
                        Arguments:
                      </Body>
                      <div style={{ 
                        background: palette.gray.light3, 
                        borderRadius: '4px', 
                        padding: spacing[2], 
                        fontFamily: 'monospace', 
                        fontSize: '11px', 
                        overflowX: 'auto' 
                      }}>
                        <pre style={{ 
                          whiteSpace: 'pre-wrap', 
                          margin: 0, 
                          color: palette.gray.dark3 
                        }}>
                          {JSON.stringify(toolCall.arguments, null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}

                  {/* Result */}
                  {toolCall.result && toolCall.status === 'completed' && (
                    <div style={{ marginBottom: spacing[3] }}>
                      <Body size="small" weight="medium" style={{ 
                        color: palette.gray.dark2, 
                        margin: `0 0 ${spacing[1]}px 0`,
                        fontSize: '11px'
                      }}>
                        Result:
                      </Body>
                      <div style={{ 
                        background: palette.green.light3, 
                        borderRadius: '4px', 
                        padding: spacing[2], 
                        fontFamily: 'monospace', 
                        fontSize: '11px', 
                        overflowX: 'auto',
                        maxHeight: '128px',
                        overflowY: 'auto'
                      }}>
                        <pre style={{ 
                          whiteSpace: 'pre-wrap', 
                          margin: 0, 
                          color: palette.green.dark2 
                        }}>
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
                    <div style={{ marginBottom: spacing[3] }}>
                      <Body size="small" weight="medium" style={{ 
                        color: palette.red.base, 
                        margin: `0 0 ${spacing[1]}px 0`,
                        fontSize: '11px'
                      }}>
                        Error:
                      </Body>
                      <div style={{ 
                        background: palette.red.light3, 
                        borderRadius: '4px', 
                        padding: spacing[2], 
                        fontSize: '11px', 
                        color: palette.red.dark2 
                      }}>
                        {toolCall.error}
                      </div>
                    </div>
                  )}

                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Summary */}
      <div style={{ 
        marginTop: spacing[3], 
        paddingTop: spacing[3], 
        borderTop: `1px solid ${palette.gray.light2}` 
      }}>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: '1fr 1fr 1fr', 
          gap: spacing[2], 
          textAlign: 'center'
        }}>
          <div>
            <Body weight="medium" style={{ 
              color: palette.blue.base, 
              margin: 0,
              fontSize: '18px',
              lineHeight: 1
            }}>
              {toolCalls.filter(tc => tc.status === 'initiated').length}
            </Body>
            <Body size="small" style={{ color: palette.gray.dark1, margin: 0, fontSize: '11px' }}>
              Running
            </Body>
          </div>
          <div>
            <Body weight="medium" style={{ 
              color: palette.green.base, 
              margin: 0,
              fontSize: '18px',
              lineHeight: 1
            }}>
              {toolCalls.filter(tc => tc.status === 'completed').length}
            </Body>
            <Body size="small" style={{ color: palette.gray.dark1, margin: 0, fontSize: '11px' }}>
              Completed
            </Body>
          </div>
          <div>
            <Body weight="medium" style={{ 
              color: palette.red.base, 
              margin: 0,
              fontSize: '18px',
              lineHeight: 1
            }}>
              {toolCalls.filter(tc => tc.status === 'failed').length}
            </Body>
            <Body size="small" style={{ color: palette.gray.dark1, margin: 0, fontSize: '11px' }}>
              Failed
            </Body>
          </div>
        </div>
      </div>
    </Card>
  );
};