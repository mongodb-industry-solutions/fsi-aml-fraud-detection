'use client';

import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { palette } from '@leafygreen-ui/palette';
import { spacing } from '@leafygreen-ui/tokens';
import { Body, Overline } from '@leafygreen-ui/typography';
import Badge from '@leafygreen-ui/badge';

const DecisionNode = ({ data, isConnectable, selected }) => {
  const { name, confidence, decision, isSelected } = data;

  // Decision color mapping
  const getDecisionColor = (decision) => {
    switch (decision?.toLowerCase()) {
      case 'approve': return palette.green.base;
      case 'investigate': return palette.yellow.base;
      case 'decline': return palette.red.base;
      case 'review': return palette.blue.base;
      default: return palette.gray.base;
    }
  };

  const getDecisionVariant = (decision) => {
    switch (decision?.toLowerCase()) {
      case 'approve': return 'green';
      case 'investigate': return 'yellow';
      case 'decline': return 'red';
      case 'review': return 'blue';
      default: return 'lightgray';
    }
  };

  return (
    <div
      style={{
        minWidth: '180px',
        maxWidth: '220px',
        background: `linear-gradient(135deg, ${palette.white}, ${palette.red.light3})`,
        borderRadius: '12px',
        padding: spacing[3],
        boxShadow: isSelected 
          ? `0 0 0 3px ${palette.red.light2}, 0 8px 24px rgba(0,0,0,0.15)`
          : '0 4px 12px rgba(0,0,0,0.1)',
        border: `2px solid ${isSelected ? palette.red.base : palette.red.light1}`,
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        cursor: 'pointer',
        position: 'relative'
      }}
    >
      {/* Connection handles */}
      <Handle
        type="target"
        position={Position.Top}
        isConnectable={isConnectable}
        style={{
          background: palette.red.base,
          width: '12px',
          height: '12px',
          border: `2px solid ${palette.white}`
        }}
      />
      
      {/* Multiple output handles for different decision paths */}
      <Handle
        type="source"
        position={Position.Right}
        id="approve"
        isConnectable={isConnectable}
        style={{
          background: palette.green.base,
          width: '10px',
          height: '10px',
          border: `2px solid ${palette.white}`,
          top: '30%'
        }}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="decline"
        isConnectable={isConnectable}
        style={{
          background: palette.red.base,
          width: '10px',
          height: '10px',
          border: `2px solid ${palette.white}`,
          top: '70%'
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
          width: '36px',
          height: '36px',
          borderRadius: '50%',
          background: `linear-gradient(135deg, ${palette.red.base}, ${palette.red.dark1})`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '16px',
          color: palette.white,
          flexShrink: 0
        }}>
          ⚖️
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

      {/* Decision Details */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: spacing[2]
      }}>
        {/* Confidence */}
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
            Confidence:
          </Overline>
          <Body style={{
            fontSize: '13px',
            fontWeight: 600,
            color: palette.gray.dark3,
            margin: 0
          }}>
            {confidence}%
          </Body>
        </div>

        {/* Decision Badge */}
        {decision && (
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
              Decision:
            </Overline>
            <Badge variant={getDecisionVariant(decision)}>
              {decision.toUpperCase()}
            </Badge>
          </div>
        )}

        {/* Confidence Bar */}
        <div style={{
          marginTop: spacing[1]
        }}>
          <div style={{
            height: '6px',
            borderRadius: '3px',
            background: palette.gray.light2,
            overflow: 'hidden'
          }}>
            <div style={{
              height: '100%',
              width: `${confidence}%`,
              background: `linear-gradient(90deg, ${getDecisionColor(decision)}, ${palette.green.base})`,
              transition: 'width 0.5s ease'
            }} />
          </div>
        </div>
      </div>

      {/* Decision paths labels (small) */}
      <div style={{
        position: 'absolute',
        right: '-30px',
        top: '25%',
        fontSize: '8px',
        color: palette.green.base,
        fontWeight: 600
      }}>
        ✓
      </div>
      <div style={{
        position: 'absolute',
        right: '-30px',
        top: '65%',
        fontSize: '8px',
        color: palette.red.base,
        fontWeight: 600
      }}>
        ✗
      </div>

      {/* Decision processing animation */}
      {confidence < 80 && (
        <div style={{
          position: 'absolute',
          top: '-2px',
          left: '-2px',
          right: '-2px',
          bottom: '-2px',
          borderRadius: '12px',
          background: `linear-gradient(45deg, ${palette.yellow.base}30, ${palette.red.base}30)`,
          animation: 'decision-pulse 3s ease-in-out infinite',
          zIndex: -1
        }} />
      )}

      <style jsx>{`
        @keyframes decision-pulse {
          0%, 100% { opacity: 0.2; }
          50% { opacity: 0.6; }
        }
      `}</style>
    </div>
  );
};

export default memo(DecisionNode);