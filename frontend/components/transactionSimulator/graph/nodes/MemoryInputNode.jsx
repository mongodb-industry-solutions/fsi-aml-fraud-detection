"use client";

import React from 'react';
import { Handle, Position } from 'reactflow';
import Icon from '@leafygreen-ui/icon';
import { Body, Overline } from '@leafygreen-ui/typography';
import { palette } from '@leafygreen-ui/palette';
import { spacing } from '@leafygreen-ui/tokens';

const MemoryInputNode = ({ data }) => {
  const { label, description, amount, merchant, isCompleted } = data;

  const getBackgroundColor = () => {
    if (isCompleted) return `linear-gradient(135deg, ${palette.green.light3}, ${palette.white})`;
    return palette.gray.light3;
  };

  const getBorderColor = () => {
    if (isCompleted) return palette.green.base;
    return palette.gray.base;
  };

  return (
    <div style={{
      background: getBackgroundColor(),
      border: `2px solid ${getBorderColor()}`,
      borderRadius: '12px',
      padding: spacing[3],
      minWidth: '200px',
      maxWidth: '260px',
      position: 'relative',
      boxShadow: '0 2px 6px rgba(0,0,0,0.08)'
    }}>
      {/* Header with icon */}
      <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2], marginBottom: spacing[2] }}>
        <div style={{
          width: '32px',
          height: '32px',
          borderRadius: '8px',
          background: palette.green.base,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <Icon glyph="CreditCard" fill={palette.white} size={16} />
        </div>
        <div>
          <Overline style={{ 
            color: palette.green.dark2, 
            fontWeight: 'bold', 
            margin: 0,
            fontSize: '12px'
          }}>
            {label}
          </Overline>
        </div>
      </div>

      {/* Description */}
      <Body size="small" style={{ 
        color: palette.gray.dark2, 
        marginBottom: spacing[2],
        fontSize: '11px',
        lineHeight: 1.4
      }}>
        {description}
      </Body>

      {/* Transaction details */}
      <div style={{ 
        background: palette.white,
        borderRadius: '6px',
        padding: spacing[2],
        border: `1px solid ${palette.green.light1}`
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: spacing[1] }}>
          <Body size="xsmall" style={{ color: palette.gray.dark1, fontWeight: 'medium' }}>
            Amount:
          </Body>
          <Body size="xsmall" style={{ color: palette.green.dark2, fontWeight: 'bold' }}>
            ${amount?.toLocaleString() || '5,000'}
          </Body>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <Body size="xsmall" style={{ color: palette.gray.dark1, fontWeight: 'medium' }}>
            Merchant:
          </Body>
          <Body size="xsmall" style={{ color: palette.gray.dark2, fontWeight: 'medium' }}>
            {merchant || 'Sample Store'}
          </Body>
        </div>
      </div>

      {/* Right handle for outgoing connections */}
      <Handle
        type="source"
        position={Position.Right}
        style={{
          width: '12px',
          height: '12px',
          background: palette.green.base,
          border: `2px solid ${palette.white}`
        }}
      />
      
      {/* Bottom handle for outgoing connections */}
      <Handle
        type="source"
        position={Position.Bottom}
        style={{
          width: '12px',
          height: '12px',
          background: palette.green.base,
          border: `2px solid ${palette.white}`,
          left: '50%',
          transform: 'translateX(-50%)'
        }}
      />
    </div>
  );
};

export default MemoryInputNode;
