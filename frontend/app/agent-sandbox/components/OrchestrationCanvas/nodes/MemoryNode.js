'use client';

import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { palette } from '@leafygreen-ui/palette';
import { spacing } from '@leafygreen-ui/tokens';
import { Body, Overline } from '@leafygreen-ui/typography';

const MemoryNode = ({ data, isConnectable, selected }) => {
  const { name, vectorCount, similarity, isSelected } = data;

  return (
    <div
      style={{
        minWidth: '160px',
        maxWidth: '200px',
        background: `linear-gradient(135deg, ${palette.white}, ${palette.gray.light3})`,
        borderRadius: '12px',
        padding: spacing[3],
        boxShadow: isSelected 
          ? `0 0 0 3px ${palette.gray.light2}, 0 8px 24px rgba(0,0,0,0.15)`
          : '0 4px 12px rgba(0,0,0,0.1)',
        border: `2px solid ${isSelected ? palette.gray.base : palette.gray.light2}`,
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
          background: palette.gray.base,
          width: '10px',
          height: '10px',
          border: `2px solid ${palette.white}`
        }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        isConnectable={isConnectable}
        style={{
          background: palette.gray.base,
          width: '10px',
          height: '10px',
          border: `2px solid ${palette.white}`
        }}
      />

      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: spacing[2],
        marginBottom: spacing[2]
      }}>
        <div style={{
          width: '32px',
          height: '32px',
          borderRadius: '8px',
          background: `linear-gradient(135deg, ${palette.gray.base}, ${palette.gray.dark1})`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '16px',
          color: palette.white,
          flexShrink: 0
        }}>
          💾
        </div>
        
        <Body style={{
          fontSize: '13px',
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

      {/* Memory Stats */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: spacing[1]
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <Overline style={{
            fontSize: '10px',
            color: palette.gray.dark1,
            margin: 0
          }}>
            Vectors:
          </Overline>
          <Body style={{
            fontSize: '12px',
            fontWeight: 600,
            color: palette.gray.dark3,
            margin: 0
          }}>
            {vectorCount}
          </Body>
        </div>

        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <Overline style={{
            fontSize: '10px',
            color: palette.gray.dark1,
            margin: 0
          }}>
            Similarity:
          </Overline>
          <Body style={{
            fontSize: '12px',
            fontWeight: 600,
            color: palette.gray.dark3,
            margin: 0
          }}>
            {similarity}
          </Body>
        </div>

        {/* Visual similarity indicator */}
        <div style={{
          marginTop: spacing[1],
          height: '4px',
          borderRadius: '2px',
          background: palette.gray.light2,
          overflow: 'hidden'
        }}>
          <div style={{
            height: '100%',
            width: similarity,
            background: `linear-gradient(90deg, ${palette.gray.base}, ${palette.gray.dark1})`,
            transition: 'width 0.3s ease'
          }} />
        </div>
      </div>

      {/* MongoDB Atlas badge */}
      <div style={{
        marginTop: spacing[2],
        paddingTop: spacing[1],
        borderTop: `1px solid ${palette.gray.light2}`,
        textAlign: 'center'
      }}>
        <Overline style={{
          fontSize: '9px',
          color: palette.gray.dark1,
          margin: 0,
          textTransform: 'uppercase',
          letterSpacing: '0.5px'
        }}>
          MongoDB Atlas
        </Overline>
      </div>
    </div>
  );
};

export default memo(MemoryNode);