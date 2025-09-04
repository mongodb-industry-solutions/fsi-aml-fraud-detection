"use client";

import React from 'react';
import { Handle, Position } from 'reactflow';
import { palette } from '@leafygreen-ui/palette';
import { spacing } from '@leafygreen-ui/tokens';
import { Body, Overline } from '@leafygreen-ui/typography';
import Badge from '@leafygreen-ui/badge';
import Icon from '@leafygreen-ui/icon';

const AgentNode = ({ data }) => {
  const { label, model, description, isActive, isCompleted, isConnected } = data;

  const getAgentColor = () => {
    if (isConnected) {
      if (isCompleted) return palette.purple.base;
      if (isActive) return palette.purple.dark1;
      return palette.purple.light1;
    } else {
      if (isCompleted) return palette.blue.base;
      if (isActive) return palette.blue.dark1;
      return palette.blue.light1;
    }
  };

  const getBackgroundColor = () => {
    const baseColor = isConnected ? palette.purple : palette.blue;
    if (isActive) return `linear-gradient(135deg, ${baseColor.light2}, ${baseColor.light3})`;
    if (isCompleted) return `linear-gradient(135deg, ${baseColor.light3}, ${palette.white})`;
    return palette.gray.light3;
  };

  const getAgentIcon = () => {
    return isConnected ? 'File' : 'Diagram';
  };

  const getModelBadgeVariant = () => {
    if (model === 'GPT-4o') return 'blue';
    if (model === 'GPT-4-mini') return 'darkgray';
    return 'lightgray';
  };

  return (
    <div style={{
      background: getBackgroundColor(),
      border: `2px solid ${getAgentColor()}`,
      borderRadius: '16px',
      padding: spacing[4],
      minWidth: '280px',
      position: 'relative',
      boxShadow: isActive ? '0 6px 16px rgba(0,0,0,0.15)' : '0 3px 8px rgba(0,0,0,0.08)',
      overflow: 'hidden'
    }}>
      {/* Active shimmer effect */}
      {isActive && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: '-100%',
          width: '100%',
          height: '100%',
          background: `linear-gradient(90deg, transparent, ${isConnected ? palette.purple.light1 : palette.blue.light1}, transparent)`,
          animation: 'shimmer 2s infinite',
          pointerEvents: 'none'
        }} />
      )}

      {/* Status indicator */}
      <div style={{
        position: 'absolute',
        top: spacing[2],
        right: spacing[2],
        width: '16px',
        height: '16px',
        borderRadius: '50%',
        background: getAgentColor(),
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        animation: isActive ? 'pulse 1.5s infinite' : 'none'
      }}>
        {isCompleted ? (
          <Icon glyph="Checkmark" fill={palette.white} size={10} />
        ) : isActive ? (
          <Icon glyph="Refresh" fill={palette.white} size={10} />
        ) : (
          <Icon glyph="Clock" fill={palette.white} size={10} />
        )}
      </div>

      {/* Content */}
      <div style={{ position: 'relative', zIndex: 1 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2], marginBottom: spacing[2] }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            background: getAgentColor(),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Icon glyph={getAgentIcon()} fill={palette.white} size={18} />
          </div>
          <div style={{ flex: 1 }}>
            <Overline style={{ color: getAgentColor(), fontWeight: 'bold', margin: 0 }}>
              {label}
            </Overline>
            <Body size="small" style={{ color: palette.gray.dark1, margin: 0 }}>
              {description}
            </Body>
          </div>
        </div>

        {/* Model and status info */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: spacing[2]
        }}>
          <Badge variant={getModelBadgeVariant()} style={{ fontSize: '11px' }}>
            {model}
          </Badge>
          
          <Badge 
            variant={isCompleted ? "green" : isActive ? "blue" : "lightgray"} 
            style={{ fontSize: '10px' }}
          >
            {isCompleted ? 'COMPLETED' : isActive ? 'ANALYZING' : isConnected ? 'ON-DEMAND' : 'READY'}
          </Badge>
        </div>

        {/* Connected agent indicator */}
        {isConnected && (
          <div style={{
            background: `linear-gradient(135deg, ${palette.white}, ${palette.purple.light3})`,
            padding: spacing[2],
            borderRadius: '6px',
            border: `1px solid ${palette.purple.light1}`
          }}>
            <Body size="small" style={{ color: palette.purple.dark1, margin: 0, fontSize: '10px' }}>
              🔗 Connected Agent • Specialized Analysis
            </Body>
          </div>
        )}
      </div>

      {/* Handles */}
      <Handle
        type="target"
        position={Position.Top}
        style={{
          background: getAgentColor(),
          width: '12px',
          height: '12px',
          border: `2px solid ${palette.white}`
        }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        style={{
          background: getAgentColor(),
          width: '12px',
          height: '12px',
          border: `2px solid ${palette.white}`
        }}
      />
      {isConnected && (
        <Handle
          type="target"
          position={Position.Left}
          style={{
            background: getAgentColor(),
            width: '12px',
            height: '12px',
            border: `2px solid ${palette.white}`
          }}
        />
      )}

      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
        
        @keyframes shimmer {
          0% { left: -100%; }
          100% { left: 100%; }
        }
      `}</style>
    </div>
  );
};

export default AgentNode;

