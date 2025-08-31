"use client";

import React from 'react';
import { Handle, Position } from 'reactflow';
import Icon from '@leafygreen-ui/icon';
import Badge from '@leafygreen-ui/badge';
import { Body, Overline } from '@leafygreen-ui/typography';
import { palette } from '@leafygreen-ui/palette';
import { spacing } from '@leafygreen-ui/tokens';

const VectorSearchNode = ({ data }) => {
  const { label, description, algorithm, dimensions, color, isCompleted } = data;

  const getSearchColor = () => {
    const colorMap = {
      blue: palette.blue,
      green: palette.green,
      purple: palette.purple
    };
    return colorMap[color] || palette.blue;
  };

  const getBackgroundColor = () => {
    const searchColor = getSearchColor();
    if (isCompleted) return `linear-gradient(135deg, ${searchColor.light3}, ${palette.white})`;
    return palette.gray.light3;
  };

  const getBorderColor = () => {
    if (isCompleted) return getSearchColor().base;
    return palette.gray.base;
  };

  return (
    <div style={{
      background: getBackgroundColor(),
      border: `2px solid ${getBorderColor()}`,
      borderRadius: '12px',
      padding: spacing[3],
      minWidth: '240px',
      maxWidth: '300px',
      position: 'relative',
      boxShadow: '0 2px 6px rgba(0,0,0,0.08)'
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2], marginBottom: spacing[2] }}>
        <div style={{
          width: '28px',
          height: '28px',
          borderRadius: '6px',
          background: getBorderColor(),
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <Icon glyph="MagnifyingGlass" fill={palette.white} size={14} />
        </div>
        <div style={{ flex: 1 }}>
          <Overline style={{ 
            color: getBorderColor(), 
            fontWeight: 'bold', 
            margin: 0,
            fontSize: '12px',
            lineHeight: 1.2
          }}>
            {label}
          </Overline>
        </div>
        <Badge variant="blue" style={{ fontSize: '9px' }}>VECTOR</Badge>
      </div>

      {/* Description */}
      <Body size="small" style={{ 
        color: palette.gray.dark2, 
        marginBottom: spacing[2],
        fontSize: '11px',
        lineHeight: 1.4,
        fontWeight: '500'
      }}>
        {description}
      </Body>

      {/* Technical details */}
      <div style={{ 
        background: palette.white,
        borderRadius: '6px',
        padding: spacing[2],
        border: `1px solid ${getSearchColor().light1}`
      }}>
        <div style={{ marginBottom: spacing[1] }}>
          <Body size="xsmall" style={{ color: palette.gray.dark1, fontWeight: 'medium' }}>
            Algorithm:
          </Body>
          <Body size="xsmall" style={{ color: getBorderColor(), fontWeight: 'bold', marginTop: '2px' }}>
            {algorithm}
          </Body>
        </div>
        
        <div>
          <Body size="xsmall" style={{ color: palette.gray.dark1, fontWeight: 'medium' }}>
            Vector Dimensions:
          </Body>
          <Body size="xsmall" style={{ color: palette.gray.dark2, fontWeight: 'medium', marginTop: '2px' }}>
            {dimensions}
          </Body>
        </div>
      </div>

      {/* Performance indicator */}
      <div style={{ 
        marginTop: spacing[2],
        display: 'flex',
        alignItems: 'center',
        gap: spacing[1],
        background: `linear-gradient(90deg, ${getSearchColor().light2}, ${getSearchColor().light3})`,
        borderRadius: '4px',
        padding: `${spacing[1]}px ${spacing[2]}px`
      }}>
        <div style={{ 
          width: '6px', 
          height: '6px', 
          borderRadius: '50%', 
          background: getSearchColor().base 
        }} />
        <Body size="xsmall" style={{ color: getSearchColor().dark2, fontWeight: 'medium' }}>
          Fast semantic similarity matching
        </Body>
      </div>

      {/* Input handle */}
      <Handle
        type="target"
        position={Position.Left}
        style={{
          width: '12px',
          height: '12px',
          background: getBorderColor(),
          border: `2px solid ${palette.white}`
        }}
      />

      {/* Output handle */}
      <Handle
        type="source"
        position={Position.Right}
        style={{
          width: '12px',
          height: '12px',
          background: getBorderColor(),
          border: `2px solid ${palette.white}`
        }}
      />
    </div>
  );
};

export default VectorSearchNode;
