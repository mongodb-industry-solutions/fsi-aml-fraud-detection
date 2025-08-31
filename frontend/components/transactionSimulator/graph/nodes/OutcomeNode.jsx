"use client";

import React from 'react';
import { Handle, Position } from 'reactflow';
import { palette } from '@leafygreen-ui/palette';
import { spacing } from '@leafygreen-ui/tokens';
import { Body, Overline } from '@leafygreen-ui/typography';
import Badge from '@leafygreen-ui/badge';
import Icon from '@leafygreen-ui/icon';

const OutcomeNode = ({ data }) => {
  const { label, decision, confidence, stage, isActive, isCompleted } = data;

  const getDecisionColor = () => {
    switch (decision?.toLowerCase()) {
      case 'approve': return palette.green.base;
      case 'investigate': return palette.yellow.base;
      case 'escalate': return palette.red.base;
      case 'block': return palette.red.base;
      default: return palette.gray.base;
    }
  };

  const getDecisionIcon = () => {
    switch (decision?.toLowerCase()) {
      case 'approve': return 'Checkmark';
      case 'investigate': return 'MagnifyingGlass';
      case 'escalate': return 'Warning';
      case 'block': return 'X';
      default: return 'Clock';
    }
  };

  const getDecisionVariant = () => {
    switch (decision?.toLowerCase()) {
      case 'approve': return 'green';
      case 'investigate': return 'yellow';
      case 'escalate': return 'red';
      case 'block': return 'red';
      default: return 'lightgray';
    }
  };

  const getBackgroundColor = () => {
    const baseColor = getDecisionColor();
    if (isCompleted) return `radial-gradient(circle, ${baseColor}20, ${palette.white})`;
    if (isActive) return `radial-gradient(circle, ${baseColor}30, ${baseColor}10)`;
    return `radial-gradient(circle, ${palette.gray.light2}, ${palette.white})`;
  };

  return (
    <div style={{
      background: getBackgroundColor(),
      border: `3px solid ${isCompleted ? getDecisionColor() : palette.gray.light1}`,
      borderRadius: '50%',
      width: '160px',
      height: '160px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      boxShadow: '0 3px 8px rgba(0,0,0,0.08)'
    }}>


      {/* Decision icon */}
      <div style={{
        width: '36px',
        height: '36px',
        borderRadius: '50%',
        background: isCompleted ? getDecisionColor() : palette.gray.base,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing[1]
      }}>
        <Icon 
          glyph={getDecisionIcon()} 
          fill={palette.white} 
          size={18} 
        />
      </div>

      {/* Decision label */}
      <Overline style={{ 
        color: isCompleted ? getDecisionColor() : palette.gray.dark1, 
        fontWeight: 'bold', 
        margin: 0,
        textAlign: 'center',
        fontSize: '12px'
      }}>
        {label}
      </Overline>

      {/* Confidence and stage */}
      {confidence && (
        <Body size="small" style={{ 
          color: palette.gray.dark1, 
          margin: 0,
          fontSize: '11px',
          textAlign: 'center'
        }}>
          {confidence}% confidence
        </Body>
      )}

      {/* Stage badge */}
      <Badge 
        variant={isCompleted ? getDecisionVariant() : "lightgray"} 
        style={{ 
          fontSize: '8px',
          marginTop: spacing[1],
          position: 'absolute',
          bottom: '8px'
        }}
      >
        STAGE {stage}
      </Badge>

      {/* Input handle */}
      <Handle
        type="target"
        position={Position.Top}
        style={{
          background: isCompleted ? getDecisionColor() : palette.gray.base,
          width: '10px',
          height: '10px',
          border: `2px solid ${palette.white}`,
          top: '10px'
        }}
      />


    </div>
  );
};

export default OutcomeNode;
