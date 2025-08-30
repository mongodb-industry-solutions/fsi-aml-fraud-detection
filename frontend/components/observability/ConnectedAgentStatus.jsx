/**
 * Connected Agent Status Component (Phase 3A)
 * Shows simple indicator when connected agents (like SAR file reader) are active
 */

'use client';

import React from 'react';
import Badge from '@leafygreen-ui/badge';
import Icon from '@leafygreen-ui/icon';
import Card from '@leafygreen-ui/card';
import { Body, H3 } from '@leafygreen-ui/typography';
import { palette } from '@leafygreen-ui/palette';
import { spacing } from '@leafygreen-ui/tokens';
import { Spinner } from '@leafygreen-ui/loading-indicator';

export const ConnectedAgentStatus = ({ connectedAgents = [] }) => {
  // Don't render if no connected agents
  if (connectedAgents.length === 0) {
    return null;
  }

  const getAgentStatusConfig = (status) => {
    switch (status) {
      case 'started':
      case 'in_progress':
        return {
          color: 'blue',
          icon: 'Refresh',
          label: 'Analyzing',
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
          icon: 'Clock',
          label: 'Unknown',
          showSpinner: false
        };
    }
  };

  return (
    <Card style={{ background: palette.purple.light3, padding: spacing[3], marginBottom: spacing[3] }}>
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        marginBottom: spacing[2] 
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2] }}>
          <Icon glyph="Connect" size={16} fill={palette.purple.base} />
          <H3 style={{ margin: 0, fontSize: '14px', color: palette.purple.dark2 }}>
            Connected Analysis
          </H3>
        </div>
        <Badge variant="purple" style={{ fontSize: '11px' }}>
          {connectedAgents.length} active
        </Badge>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[2] }}>
        {connectedAgents.map((agent, index) => {
          const statusConfig = getAgentStatusConfig(agent.status);
          
          return (
            <div
              key={agent.connected_thread_id || index}
              style={{
                background: palette.white,
                borderRadius: '6px',
                border: `1px solid ${palette.purple.light2}`,
                padding: spacing[2],
                display: 'flex',
                alignItems: 'center',
                gap: spacing[2]
              }}
            >
              {/* Status Indicator */}
              <div style={{ display: 'flex', alignItems: 'center', gap: spacing[1] }}>
                {statusConfig.showSpinner ? (
                  <Spinner size="small" />
                ) : (
                  <Icon 
                    glyph={statusConfig.icon} 
                    size={14} 
                    fill={statusConfig.color === 'green' ? palette.green.base : 
                          statusConfig.color === 'red' ? palette.red.base : 
                          palette.blue.base} 
                  />
                )}
                <Badge variant={statusConfig.color} style={{ fontSize: '10px' }}>
                  {statusConfig.label}
                </Badge>
              </div>

              {/* Agent Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <Body size="small" weight="medium" style={{ 
                  margin: 0, 
                  color: palette.purple.dark2,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>
                  {agent.connected_agent_name || 'Connected Agent'}
                </Body>
                <Body size="small" style={{ 
                  margin: 0, 
                  color: palette.gray.dark1,
                  fontSize: '11px'
                }}>
                  {agent.analysis_type || 'SAR Analysis'}
                  {agent.progress_message && ` - ${agent.progress_message}`}
                </Body>
              </div>

              {/* Progress Indicator */}
              {agent.progress_percentage !== undefined && (
                <div style={{ 
                  width: '40px', 
                  fontSize: '10px', 
                  color: palette.purple.dark1,
                  textAlign: 'right'
                }}>
                  {Math.round(agent.progress_percentage)}%
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
};