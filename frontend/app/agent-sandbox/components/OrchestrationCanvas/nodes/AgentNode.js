'use client';

import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { palette } from '@leafygreen-ui/palette';
import { spacing } from '@leafygreen-ui/tokens';
import { Body, Overline } from '@leafygreen-ui/typography';
import Badge from '@leafygreen-ui/badge';

const AgentNode = ({ data, isConnectable, selected }) => {
  const { 
    name, 
    description, 
    type, 
    status, 
    confidence, 
    metrics,
    isSelected 
  } = data;

  // Agent type icons
  const getAgentIcon = (agentType) => {
    switch (agentType) {
      case 'manager': return '👔';
      case 'facilitator': return '🎯';
      case 'analyzer': return '🔍';
      case 'validator': return '✅';
      case 'investigator': return '🕵️';
      case 'compliance': return '⚖️';
      default: return '🤖';
    }
  };

  // Status colors
  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return palette.green.base;
      case 'processing': return palette.blue.base;
      case 'backtracking': return palette.yellow.base;
      case 'complete': return palette.green.dark1;
      case 'error': return palette.red.base;
      case 'idle': 
      default: return palette.gray.base;
    }
  };

  // Confidence level indicator
  const getConfidenceVariant = (confidence) => {
    if (confidence >= 90) return 'green';
    if (confidence >= 70) return 'blue';
    if (confidence >= 50) return 'yellow';
    return 'red';
  };

  return (
    <div
      style={{
        minWidth: '200px',
        maxWidth: '280px',
        background: palette.white,
        borderRadius: '12px',
        padding: spacing[3],
        boxShadow: isSelected 
          ? `0 0 0 3px ${palette.blue.light2}, 0 8px 24px rgba(0,0,0,0.15)`
          : '0 4px 12px rgba(0,0,0,0.1)',
        border: `2px solid ${isSelected ? palette.blue.base : palette.gray.light2}`,
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
          background: palette.gray.base,
          width: '12px',
          height: '12px',
          border: `2px solid ${palette.white}`
        }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        isConnectable={isConnectable}
        style={{
          background: palette.gray.base,
          width: '12px',
          height: '12px',
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
          width: '40px',
          height: '40px',
          borderRadius: '50%',
          background: `linear-gradient(135deg, ${palette.blue.light3}, ${palette.green.light3})`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '20px',
          flexShrink: 0
        }}>
          {getAgentIcon(type)}
        </div>
        
        <div style={{ flex: 1, minWidth: 0 }}>
          <Body style={{
            fontSize: '14px',
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
          
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: spacing[1],
            marginTop: '2px'
          }}>
            <div style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: getStatusColor(status),
              flexShrink: 0
            }} />
            <Overline style={{
              fontSize: '10px',
              color: palette.gray.dark1,
              margin: 0,
              textTransform: 'capitalize'
            }}>
              {status}
            </Overline>
          </div>
        </div>

        {/* Confidence Badge */}
        <Badge 
          variant={getConfidenceVariant(confidence)}
          style={{ flexShrink: 0 }}
        >
          {confidence}%
        </Badge>
      </div>

      {/* Description */}
      <Body style={{
        fontSize: '12px',
        color: palette.gray.dark1,
        lineHeight: '1.4',
        margin: `0 0 ${spacing[2]}px 0`,
        overflow: 'hidden',
        display: '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical'
      }}>
        {description}
      </Body>

      {/* Metrics */}
      {metrics && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: spacing[2],
          marginTop: spacing[2],
          paddingTop: spacing[2],
          borderTop: `1px solid ${palette.gray.light2}`
        }}>
          <div>
            <div style={{
              fontSize: '14px',
              fontWeight: 600,
              color: palette.gray.dark3,
              lineHeight: 1
            }}>
              {metrics.avgLatency}ms
            </div>
            <Overline style={{
              fontSize: '9px',
              color: palette.gray.dark1,
              margin: 0
            }}>
              Latency
            </Overline>
          </div>
          
          <div>
            <div style={{
              fontSize: '14px',
              fontWeight: 600,
              color: palette.gray.dark3,
              lineHeight: 1
            }}>
              {metrics.accuracy}%
            </div>
            <Overline style={{
              fontSize: '9px',
              color: palette.gray.dark1,
              margin: 0
            }}>
              Accuracy
            </Overline>
          </div>
          
          <div>
            <div style={{
              fontSize: '14px',
              fontWeight: 600,
              color: palette.gray.dark3,
              lineHeight: 1
            }}>
              {Math.round(metrics.throughput)}
            </div>
            <Overline style={{
              fontSize: '9px',
              color: palette.gray.dark1,
              margin: 0
            }}>
              Ops/sec
            </Overline>
          </div>
          
          <div>
            <div style={{
              fontSize: '14px',
              fontWeight: 600,
              color: palette.gray.dark3,
              lineHeight: 1
            }}>
              {metrics.memoryUtilization}%
            </div>
            <Overline style={{
              fontSize: '9px',
              color: palette.gray.dark1,
              margin: 0
            }}>
              Memory
            </Overline>
          </div>
        </div>
      )}

      {/* Processing Animation */}
      {status === 'processing' && (
        <div style={{
          position: 'absolute',
          top: '-2px',
          left: '-2px',
          right: '-2px',
          bottom: '-2px',
          borderRadius: '12px',
          background: `linear-gradient(45deg, ${palette.blue.base}40, ${palette.green.base}40)`,
          animation: 'pulse 2s ease-in-out infinite',
          zIndex: -1
        }} />
      )}

      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.7; }
        }
      `}</style>
    </div>
  );
};

export default memo(AgentNode);