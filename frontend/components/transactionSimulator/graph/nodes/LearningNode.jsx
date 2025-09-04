"use client";

import React from 'react';
import { Handle, Position } from 'reactflow';
import Icon from '@leafygreen-ui/icon';
import Badge from '@leafygreen-ui/badge';
import { Body, Overline } from '@leafygreen-ui/typography';
import { palette } from '@leafygreen-ui/palette';
import { spacing } from '@leafygreen-ui/tokens';

const LearningNode = ({ data }) => {
  const { label, description, method, effectiveness, sources, impact, color, isCompleted } = data;

  const getLearningIcon = () => {
    if (label.includes('Pattern')) return 'Bulb';
    if (label.includes('Context')) return 'Refresh';
    return 'University';
  };

  const getLearningColor = () => {
    const colorMap = {
      purple: palette.purple,
      green: palette.green,
      blue: palette.blue,
      yellow: palette.yellow
    };
    return colorMap[color] || palette.purple;
  };

  const getBackgroundColor = () => {
    const learningColor = getLearningColor();
    if (isCompleted) return `linear-gradient(135deg, ${learningColor.light3}, ${palette.white})`;
    return palette.gray.light3;
  };

  const getBorderColor = () => {
    if (isCompleted) return getLearningColor().base;
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
          <Icon glyph={getLearningIcon()} fill={palette.white} size={14} />
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
        <Badge variant={color === 'purple' ? 'darkgray' : color} style={{ fontSize: '9px' }}>
          {label.includes('Pattern') ? 'ML' : 'AI'}
        </Badge>
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

      {/* Learning details */}
      <div style={{ 
        background: palette.white,
        borderRadius: '6px',
        padding: spacing[2],
        border: `1px solid ${getLearningColor().light1}`
      }}>
        {/* Method or sources */}
        <div style={{ marginBottom: spacing[1] }}>
          <Body size="xsmall" style={{ color: palette.gray.dark1, fontWeight: 'medium' }}>
            {method ? 'Method:' : 'Sources:'}
          </Body>
          <Body size="xsmall" style={{ color: getBorderColor(), fontWeight: 'bold', marginTop: '2px' }}>
            {method || sources}
          </Body>
        </div>
        
        {/* Effectiveness or impact */}
        <div>
          <Body size="xsmall" style={{ color: palette.gray.dark1, fontWeight: 'medium' }}>
            {effectiveness ? 'Effectiveness:' : 'Impact:'}
          </Body>
          <Body size="xsmall" style={{ color: palette.gray.dark2, fontWeight: 'medium', marginTop: '2px' }}>
            {effectiveness || impact}
          </Body>
        </div>
      </div>

      {/* Learning indicator */}
      <div style={{ 
        marginTop: spacing[2],
        display: 'flex',
        alignItems: 'center',
        gap: spacing[1],
        background: `linear-gradient(90deg, ${getLearningColor().light2}, ${getLearningColor().light3})`,
        borderRadius: '4px',
        padding: `${spacing[1]}px ${spacing[2]}px`
      }}>
        <div style={{ 
          width: '6px', 
          height: '6px', 
          borderRadius: '50%', 
          background: getLearningColor().base 
        }} />
        <Body size="xsmall" style={{ color: getLearningColor().dark2, fontWeight: 'medium' }}>
          {label.includes('Pattern') ? 'Continuous pattern discovery' : 'Context-aware enhancement'}
        </Body>
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

export default LearningNode;

