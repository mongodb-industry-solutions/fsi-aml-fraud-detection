"use client";

import React from 'react';
import { Handle, Position } from 'reactflow';
import { palette } from '@leafygreen-ui/palette';
import { spacing } from '@leafygreen-ui/tokens';
import { Body, Overline } from '@leafygreen-ui/typography';
import Badge from '@leafygreen-ui/badge';
import Icon from '@leafygreen-ui/icon';

const StageNode = ({ data }) => {
  const { label, description, stage, color, isActive, isCompleted } = data;

  // Get color palette based on custom color or default stage-based colors
  const getColorPalette = () => {
    if (color === 'yellow') return palette.yellow;
    if (color === 'red') return palette.red;
    if (color === 'green') return palette.green;
    if (color === 'blue') return palette.blue;
    // Default fallback based on stage
    return stage === 1 ? palette.yellow : palette.blue; // Changed default Stage 1 to yellow
  };

  const colorPalette = getColorPalette();

  const getStageColor = () => {
    if (isCompleted) return colorPalette.base;
    if (isActive) return colorPalette.dark1;
    return colorPalette.light1;
  };

  const getBackgroundColor = () => {
    if (isActive) return `linear-gradient(135deg, ${colorPalette.light2}, ${colorPalette.light3})`;
    if (isCompleted) return `linear-gradient(135deg, ${colorPalette.light3}, ${palette.white})`;
    return palette.gray.light3;
  };

  const getStageIcon = () => {
    return stage === 1 ? 'University' : 'Cloud'; // Azure AI Foundry represented by Cloud icon
  };

  return (
    <div style={{
      background: getBackgroundColor(),
      border: `2px solid ${getStageColor()}`,
      borderRadius: '16px',
      padding: spacing[4],
      minWidth: '250px',
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
          background: `linear-gradient(90deg, transparent, ${colorPalette.light1}, transparent)`,
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
        background: getStageColor(),
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        animation: isActive ? 'pulse 1.5s infinite' : 'none'
      }}>
        {isCompleted && (
          <Icon glyph="Checkmark" fill={palette.white} size={10} />
        )}
      </div>

      {/* Content */}
      <div style={{ position: 'relative', zIndex: 1 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2], marginBottom: spacing[2] }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: getStageColor(),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Icon glyph={getStageIcon()} fill={palette.white} size={16} />
          </div>
          <div>
            <Overline style={{ color: getStageColor(), fontWeight: 'bold', margin: 0 }}>
              {label}
            </Overline>
            <Body size="small" style={{ color: palette.gray.dark1, margin: 0 }}>
              {description}
            </Body>
          </div>
        </div>

        {/* Stage info */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Badge 
            variant={color === 'yellow' ? 'yellow' : color === 'red' ? 'red' : stage === 1 ? 'yellow' : 'blue'} 
            style={{ fontSize: '11px' }}
          >
            STAGE {stage}
          </Badge>
          
          <Badge 
            variant={isCompleted ? "green" : isActive ? "blue" : "lightgray"} 
            style={{ fontSize: '10px' }}
          >
            {isCompleted ? 'COMPLETED' : isActive ? 'PROCESSING' : 'PENDING'}
          </Badge>
        </div>
      </div>

      {/* Handles */}
      <Handle
        type="target"
        position={Position.Top}
        style={{
          background: getStageColor(),
          width: '12px',
          height: '12px',
          border: `2px solid ${palette.white}`
        }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        style={{
          background: getStageColor(),
          width: '12px',
          height: '12px',
          border: `2px solid ${palette.white}`
        }}
      />
      {/* Right handle for Stage 1 ML connection */}
      {stage === 1 && (
        <Handle
          type="source"
          position={Position.Right}
          id="right"
          style={{
            background: getStageColor(),
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

export default StageNode;
