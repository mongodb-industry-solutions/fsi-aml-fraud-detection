'use client';

import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { palette } from '@leafygreen-ui/palette';
import { spacing } from '@leafygreen-ui/tokens';
import { Body, Overline } from '@leafygreen-ui/typography';

const ToolNode = ({ data, isConnectable, selected }) => {
  const { name, description, isSelected } = data;

  return (
    <div
      style={{
        minWidth: '140px',
        maxWidth: '180px',
        background: `linear-gradient(135deg, ${palette.white}, ${palette.yellow.light3})`,
        borderRadius: '10px',
        padding: spacing[2],
        boxShadow: isSelected 
          ? `0 0 0 3px ${palette.yellow.light2}, 0 8px 24px rgba(0,0,0,0.15)`
          : '0 4px 12px rgba(0,0,0,0.1)',
        border: `2px solid ${isSelected ? palette.yellow.base : palette.yellow.light1}`,
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        cursor: 'pointer'
      }}
    >
      {/* Connection handles */}
      <Handle
        type="target"
        position={Position.Top}
        isConnectable={isConnectable}
        style={{
          background: palette.yellow.base,
          width: '8px',
          height: '8px',
          border: `2px solid ${palette.white}`
        }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        isConnectable={isConnectable}
        style={{
          background: palette.yellow.base,
          width: '8px',
          height: '8px',
          border: `2px solid ${palette.white}`
        }}
      />

      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: spacing[1],
        marginBottom: spacing[1]
      }}>
        <div style={{
          width: '24px',
          height: '24px',
          borderRadius: '6px',
          background: `linear-gradient(135deg, ${palette.yellow.base}, ${palette.yellow.dark1})`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '12px',
          color: palette.white,
          flexShrink: 0
        }}>
          🔧
        </div>
        
        <Body style={{
          fontSize: '12px',
          fontWeight: 600,
          color: palette.gray.dark3,
          margin: 0,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          fontFamily: "'Euclid Circular A', sans-serif"
        }}>
          {name}
        </Body>
      </div>

      {/* Description */}
      {description && (
        <Body style={{
          fontSize: '10px',
          color: palette.gray.dark1,
          lineHeight: '1.3',
          margin: 0,
          overflow: 'hidden',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical'
        }}>
          {description}
        </Body>
      )}

      {/* Tool type indicator */}
      <div style={{
        marginTop: spacing[1],
        paddingTop: spacing[1],
        borderTop: `1px solid ${palette.yellow.light1}`,
        textAlign: 'center'
      }}>
        <Overline style={{
          fontSize: '8px',
          color: palette.gray.dark1,
          margin: 0,
          textTransform: 'uppercase',
          letterSpacing: '0.5px'
        }}>
          Tool
        </Overline>
      </div>
    </div>
  );
};

export default memo(ToolNode);