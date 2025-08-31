/**
 * Agent Status Indicator Component
 * Shows current agent execution status with visual indicators
 */

'use client';

import React from 'react';
import Badge from '@leafygreen-ui/badge';
import { Spinner } from '@leafygreen-ui/loading-indicator';
import Icon from '@leafygreen-ui/icon';
import Card from '@leafygreen-ui/card';
import { Body, H3 } from '@leafygreen-ui/typography';
import { palette } from '@leafygreen-ui/palette';
import { spacing } from '@leafygreen-ui/tokens';

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
      <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2] }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: spacing[1] }}>
          {status === 'running' ? (
            <Spinner size="small" />
          ) : (
            <Icon glyph={statusConfig.icon} size={16} />
          )}
          <Badge variant={statusConfig.color} style={{ fontSize: '11px' }}>
            {statusConfig.label}
          </Badge>
        </div>
        {!isConnected && (
          <Icon glyph="Disconnect" size={16} fill={palette.red.base} />
        )}
      </div>
    );
  }

  return (
    <Card style={{ background: palette.gray.light3, padding: spacing[3] }}>
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        marginBottom: spacing[2] 
      }}>
        <H3 style={{ margin: 0, fontSize: '14px', color: palette.gray.dark3 }}>
          Agent Status
        </H3>
        {!isConnected && (
          <Badge variant="red" style={{ fontSize: '11px' }}>
            Disconnected
          </Badge>
        )}
      </div>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: spacing[3] }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2] }}>
          {status === 'running' ? (
            <Spinner size="small" />
          ) : (
            <Icon glyph={statusConfig.icon} size={16} />
          )}
          <Badge variant={statusConfig.color}>
            {statusConfig.label}
          </Badge>
        </div>
        
        <Body size="small" style={{ margin: 0, color: palette.gray.dark1 }}>
          {statusConfig.description}
        </Body>
      </div>

      {/* Current Run Information */}
      {currentRun && (
        <div style={{ 
          marginTop: spacing[3], 
          paddingTop: spacing[3], 
          borderTop: `1px solid ${palette.gray.light2}` 
        }}>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: '1fr 1fr', 
            gap: spacing[2], 
            fontSize: '11px' 
          }}>
            <div>
              <Body size="small" style={{ color: palette.gray.dark1, margin: 0 }}>
                Run ID:
              </Body>
              <Body size="small" style={{ 
                fontFamily: 'monospace', 
                color: palette.gray.dark3, 
                margin: 0,
                wordBreak: 'break-all',
                fontSize: '10px'
              }}>
                {currentRun.run_id}
              </Body>
            </div>
            <div>
              <Body size="small" style={{ color: palette.gray.dark1, margin: 0 }}>
                Agent:
              </Body>
              <Body size="small" style={{ 
                fontFamily: 'monospace', 
                color: palette.gray.dark3, 
                margin: 0,
                wordBreak: 'break-all',
                fontSize: '10px'
              }}>
                {currentRun.agent_id}
              </Body>
            </div>
          </div>

          {/* Show error if failed */}
          {currentRun.status === 'failed' && currentRun.error && (
            <div style={{ 
              marginTop: spacing[2], 
              padding: spacing[2], 
              background: palette.red.light3, 
              borderRadius: '4px' 
            }}>
              <Body size="small" weight="medium" style={{ 
                color: palette.red.dark2, 
                margin: `0 0 ${spacing[1]}px 0`,
                fontSize: '11px'
              }}>
                Error:
              </Body>
              <Body size="small" style={{ 
                color: palette.red.dark1, 
                margin: 0,
                fontSize: '11px'
              }}>
                {currentRun.error}
              </Body>
            </div>
          )}
        </div>
      )}
    </Card>
  );
};