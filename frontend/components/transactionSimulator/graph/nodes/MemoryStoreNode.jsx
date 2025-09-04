"use client";

import React from 'react';
import { Handle, Position } from 'reactflow';
import Icon from '@leafygreen-ui/icon';
import Badge from '@leafygreen-ui/badge';
import { Body, Overline } from '@leafygreen-ui/typography';
import { palette } from '@leafygreen-ui/palette';
import { spacing } from '@leafygreen-ui/tokens';

const MemoryStoreNode = ({ data }) => {
  const { label, description, type, capacity, count, retention, color, isCompleted } = data;

  const getStoreIcon = () => {
    if (type === 'azure_foundry') return 'Cloud';
    if (type === 'mongodb_collection') return 'Database';
    return 'Folder';
  };

  const getStoreColor = () => {
    const colorMap = {
      blue: palette.blue,
      green: palette.green,
      yellow: palette.yellow,
      purple: palette.purple
    };
    return colorMap[color] || palette.blue;
  };

  const getBackgroundColor = () => {
    const storeColor = getStoreColor();
    if (isCompleted) return `linear-gradient(135deg, ${storeColor.light3}, ${palette.white})`;
    return palette.gray.light3;
  };

  const getBorderColor = () => {
    if (isCompleted) return getStoreColor().base;
    return palette.gray.base;
  };

  return (
    <div style={{
      background: getBackgroundColor(),
      border: `2px solid ${getBorderColor()}`,
      borderRadius: '12px',
      padding: spacing[3],
      minWidth: '220px',
      maxWidth: '280px',
      position: 'relative',
      boxShadow: '0 2px 6px rgba(0,0,0,0.08)'
    }}>
      {/* Header with icon and type */}
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
          <Icon glyph={getStoreIcon()} fill={palette.white} size={14} />
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
        {type === 'azure_foundry' && (
          <Badge variant="blue" style={{ fontSize: '9px' }}>AZURE</Badge>
        )}
        {type === 'mongodb_collection' && (
          <Badge variant="darkgray" style={{ fontSize: '9px' }}>MONGODB</Badge>
        )}
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

      {/* Stats container */}
      <div style={{ 
        background: palette.white,
        borderRadius: '6px',
        padding: spacing[2],
        border: `1px solid ${getStoreColor().light1}`
      }}>
        {/* Capacity or count */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: spacing[1] }}>
          <Body size="xsmall" style={{ color: palette.gray.dark1, fontWeight: 'medium' }}>
            {capacity ? 'Capacity:' : 'Documents:'}
          </Body>
          <Body size="xsmall" style={{ color: getBorderColor(), fontWeight: 'bold' }}>
            {capacity || count?.toLocaleString() || '0'}
          </Body>
        </div>
        
        {/* Retention */}
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <Body size="xsmall" style={{ color: palette.gray.dark1, fontWeight: 'medium' }}>
            Retention:
          </Body>
          <Body size="xsmall" style={{ color: palette.gray.dark2, fontWeight: 'medium' }}>
            {retention}
          </Body>
        </div>
      </div>

      {/* Input handles */}
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
      
      <Handle
        type="target"
        position={Position.Top}
        style={{
          width: '12px',
          height: '12px',
          background: getBorderColor(),
          border: `2px solid ${palette.white}`,
          left: '50%',
          transform: 'translateX(-50%)'
        }}
      />

      {/* Output handles */}
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
      
      <Handle
        type="source"
        position={Position.Bottom}
        style={{
          width: '12px',
          height: '12px',
          background: getBorderColor(),
          border: `2px solid ${palette.white}`,
          left: '50%',
          transform: 'translateX(-50%)'
        }}
      />
    </div>
  );
};

export default MemoryStoreNode;

