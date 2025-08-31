"use client";

import React from 'react';
import { Handle, Position } from 'reactflow';
import { palette } from '@leafygreen-ui/palette';
import { spacing } from '@leafygreen-ui/tokens';
import { Body, Overline } from '@leafygreen-ui/typography';
import Badge from '@leafygreen-ui/badge';
import Icon from '@leafygreen-ui/icon';

const InputNode = ({ data }) => {
  const { label, transactionData, isActive, isCompleted } = data;

  const getStatusColor = () => {
    if (isCompleted) return palette.green.base;
    if (isActive) return palette.blue.base;
    return palette.gray.base;
  };

  const getBackgroundColor = () => {
    if (isActive) return `linear-gradient(135deg, ${palette.blue.light2}, ${palette.blue.light3})`;
    if (isCompleted) return `linear-gradient(135deg, ${palette.green.light3}, ${palette.white})`;
    return palette.gray.light3;
  };

  return (
    <div style={{
      background: getBackgroundColor(),
      border: `2px solid ${getStatusColor()}`,
      borderRadius: '12px',
      padding: spacing[3],
      minWidth: '200px',
      position: 'relative',
      boxShadow: isActive ? '0 4px 12px rgba(0,0,0,0.15)' : '0 2px 6px rgba(0,0,0,0.08)'
    }}>
      {/* Status indicator */}
      <div style={{
        position: 'absolute',
        top: spacing[2],
        right: spacing[2],
        width: '12px',
        height: '12px',
        borderRadius: '50%',
        background: getStatusColor(),
        animation: isActive ? 'pulse 2s infinite' : 'none'
      }} />

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2], marginBottom: spacing[2] }}>
        <Icon glyph="CreditCard" fill={getStatusColor()} size={20} />
        <Overline style={{ color: getStatusColor(), fontWeight: 'bold' }}>
          {label}
        </Overline>
      </div>

      {/* Transaction details */}
      {transactionData && (
        <div style={{ marginBottom: spacing[2] }}>
          <Body size="small" style={{ color: palette.gray.dark2, marginBottom: spacing[1] }}>
            ${transactionData.amount?.toLocaleString() || 'N/A'} • {transactionData.merchant?.category || 'Unknown'}
          </Body>
          <Body size="small" style={{ color: palette.gray.dark1 }}>
            {transactionData.location?.country || 'Unknown Location'}
          </Body>
        </div>
      )}

      {/* Status badge */}
      <Badge 
        variant={isCompleted ? "green" : isActive ? "blue" : "lightgray"} 
        style={{ fontSize: '10px' }}
      >
        {isCompleted ? 'PROCESSED' : isActive ? 'PROCESSING' : 'READY'}
      </Badge>

      {/* Output handle */}
      <Handle
        type="source"
        position={Position.Bottom}
        style={{
          background: getStatusColor(),
          width: '12px',
          height: '12px',
          border: `2px solid ${palette.white}`
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

export default InputNode;
