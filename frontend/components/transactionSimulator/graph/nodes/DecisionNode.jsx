"use client";

import React from 'react';
import { Handle, Position } from 'reactflow';
import { palette } from '@leafygreen-ui/palette';
import { spacing } from '@leafygreen-ui/tokens';
import { Body, Overline } from '@leafygreen-ui/typography';
import Badge from '@leafygreen-ui/badge';
import Icon from '@leafygreen-ui/icon';

const DecisionNode = ({ data }) => {
  const { label, thresholds, isActive, isCompleted } = data;

  const getStatusColor = () => {
    if (isCompleted) return palette.yellow.dark1;
    if (isActive) return palette.yellow.base;
    return palette.yellow.light1;
  };

  const getBackgroundColor = () => {
    if (isActive) return `linear-gradient(135deg, ${palette.yellow.light2}, ${palette.yellow.light3})`;
    if (isCompleted) return `linear-gradient(135deg, ${palette.yellow.light3}, ${palette.white})`;
    return palette.gray.light3;
  };

  return (
    <div style={{
      width: '200px',
      height: '200px',
      background: getBackgroundColor(),
      border: `2px solid ${getStatusColor()}`,
      borderRadius: '0',
      position: 'relative',
      boxShadow: isActive ? '0 4px 12px rgba(0,0,0,0.15)' : '0 2px 6px rgba(0,0,0,0.08)',
      clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      {/* Content container */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        padding: spacing[3],
        maxWidth: '120px' // Constrain width to fit in diamond center
      }}>
        {/* Status indicator */}
        <div style={{
          width: '16px',
          height: '16px',
          borderRadius: '50%',
          background: getStatusColor(),
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: spacing[2],
          animation: isActive ? 'pulse 1.5s infinite' : 'none'
        }}>
          {isCompleted ? (
            <Icon glyph="Checkmark" fill={palette.white} size={10} />
          ) : (
            <Icon glyph="QuestionMarkWithCircle" fill={palette.white} size={10} />
          )}
        </div>

        {/* Header */}
        <Overline style={{ 
          color: getStatusColor(), 
          fontWeight: 'bold', 
          margin: 0,
          marginBottom: spacing[1],
          fontSize: '11px',
          lineHeight: 1.2
        }}>
          {label}
        </Overline>

        {/* Thresholds */}
        {thresholds && (
          <div style={{ marginBottom: spacing[2] }}>
            {thresholds.map((threshold, index) => (
              <Body 
                key={index}
                size="small" 
                style={{ 
                  color: palette.gray.dark2, 
                  margin: 0,
                  fontSize: '9px',
                  lineHeight: 1.3,
                  fontWeight: '500'
                }}
              >
                {threshold}
              </Body>
            ))}
          </div>
        )}

        {/* Status badge */}
        <Badge 
          variant={isCompleted ? "yellow" : isActive ? "yellow" : "lightgray"} 
          style={{ fontSize: '8px' }}
        >
          {isCompleted ? 'DECIDED' : isActive ? 'EVALUATING' : 'PENDING'}
        </Badge>
      </div>

      {/* Handles (positioned for diamond shape) */}
      <Handle
        type="target"
        position={Position.Top}
        style={{
          background: getStatusColor(),
          width: '10px',
          height: '10px',
          border: `2px solid ${palette.white}`,
          top: '-5px',
          left: '50%',
          transform: 'translateX(-50%)'
        }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="continue"
        style={{
          background: getStatusColor(),
          width: '10px',
          height: '10px',
          border: `2px solid ${palette.white}`,
          bottom: '-5px',
          left: '50%',
          transform: 'translateX(-50%)'
        }}
      />
      <Handle
        type="source"
        position={Position.Left}
        id="left"
        style={{
          background: getStatusColor(),
          width: '10px',
          height: '10px',
          border: `2px solid ${palette.white}`,
          left: '-5px',
          top: '50%',
          transform: 'translateY(-50%)'
        }}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        style={{
          background: getStatusColor(),
          width: '10px',
          height: '10px',
          border: `2px solid ${palette.white}`,
          right: '-5px',
          top: '50%',
          transform: 'translateY(-50%)'
        }}
      />

      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
      `}</style>
    </div>
  );
};

export default DecisionNode;
