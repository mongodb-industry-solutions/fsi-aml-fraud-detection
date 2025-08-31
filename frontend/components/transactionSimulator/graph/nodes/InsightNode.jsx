"use client";

import React from 'react';
import { Handle, Position } from 'reactflow';
import Icon from '@leafygreen-ui/icon';
import Badge from '@leafygreen-ui/badge';
import { Body, Overline } from '@leafygreen-ui/typography';
import { palette } from '@leafygreen-ui/palette';
import { spacing } from '@leafygreen-ui/tokens';

const InsightNode = ({ data }) => {
  const { label, description, insight_types, confidence, isCompleted } = data;

  const getBackgroundColor = () => {
    if (isCompleted) return `linear-gradient(135deg, ${palette.blue.light3}, ${palette.white})`;
    return palette.gray.light3;
  };

  const getBorderColor = () => {
    if (isCompleted) return palette.blue.dark1;
    return palette.gray.base;
  };

  return (
    <div style={{
      background: getBackgroundColor(),
      border: `3px solid ${getBorderColor()}`,
      borderRadius: '12px',
      padding: spacing[3],
      minWidth: '260px',
      maxWidth: '320px',
      position: 'relative',
      boxShadow: isCompleted ? '0 4px 12px rgba(0,0,0,0.15)' : '0 2px 6px rgba(0,0,0,0.08)'
    }}>
      {/* Header with enhanced styling */}
      <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2], marginBottom: spacing[2] }}>
        <div style={{
          width: '32px',
          height: '32px',
          borderRadius: '8px',
          background: `linear-gradient(135deg, ${palette.blue.dark1}, ${palette.blue.base})`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <Icon glyph="Bulb" fill={palette.white} size={18} />
        </div>
        <div style={{ flex: 1 }}>
          <Overline style={{ 
            color: getBorderColor(), 
            fontWeight: 'bold', 
            margin: 0,
            fontSize: '13px',
            lineHeight: 1.2
          }}>
            {label}
          </Overline>
        </div>
        <Badge variant="blue" style={{ fontSize: '9px', fontWeight: 'bold' }}>
          INSIGHTS
        </Badge>
      </div>

      {/* Description */}
      <Body size="small" style={{ 
        color: palette.gray.dark2, 
        marginBottom: spacing[3],
        fontSize: '12px',
        lineHeight: 1.4,
        fontWeight: '500'
      }}>
        {description}
      </Body>

      {/* Insight types */}
      <div style={{ 
        background: palette.white,
        borderRadius: '8px',
        padding: spacing[2],
        border: `1px solid ${palette.blue.light1}`,
        marginBottom: spacing[2]
      }}>
        <Body size="xsmall" style={{ 
          color: palette.gray.dark1, 
          fontWeight: 'medium', 
          marginBottom: spacing[1] 
        }}>
          Insight Types:
        </Body>
        
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: spacing[1] }}>
          {insight_types?.map((type, index) => (
            <div
              key={index}
              style={{
                background: `linear-gradient(90deg, ${palette.blue.light2}, ${palette.blue.light3})`,
                borderRadius: '4px',
                padding: `${spacing[1]}px ${spacing[2]}px`,
                border: `1px solid ${palette.blue.light1}`
              }}
            >
              <Body size="xsmall" style={{ 
                color: palette.blue.dark2, 
                fontWeight: 'bold',
                fontSize: '10px'
              }}>
                {type}
              </Body>
            </div>
          )) || (
            <Body size="xsmall" style={{ color: palette.gray.dark2 }}>
              Patterns, Anomalies, Improvements
            </Body>
          )}
        </div>
      </div>

      {/* Confidence indicator */}
      <div style={{ 
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: `linear-gradient(90deg, ${palette.blue.light2}, ${palette.blue.light3})`,
        borderRadius: '6px',
        padding: spacing[2]
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: spacing[1] }}>
          <Icon glyph="Charts" fill={palette.blue.dark1} size={14} />
          <Body size="xsmall" style={{ color: palette.blue.dark2, fontWeight: 'medium' }}>
            Confidence:
          </Body>
        </div>
        <Body size="small" style={{ color: palette.blue.dark1, fontWeight: 'bold' }}>
          {confidence || '90%'}
        </Body>
      </div>

      {/* Input handle */}
      <Handle
        type="target"
        position={Position.Left}
        style={{
          width: '14px',
          height: '14px',
          background: palette.blue.dark1,
          border: `2px solid ${palette.white}`
        }}
      />
    </div>
  );
};

export default InsightNode;
