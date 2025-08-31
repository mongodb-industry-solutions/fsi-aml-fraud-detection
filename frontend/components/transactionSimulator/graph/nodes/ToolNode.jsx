"use client";

import React from 'react';
import { Handle, Position } from 'reactflow';
import { palette } from '@leafygreen-ui/palette';
import { spacing } from '@leafygreen-ui/tokens';
import { Body, Overline } from '@leafygreen-ui/typography';
import Badge from '@leafygreen-ui/badge';
import Icon from '@leafygreen-ui/icon';

const ToolNode = ({ data }) => {
  const { label, description, priority, color, isActive, isCompleted, isBuiltIn } = data;

  const getToolColor = () => {
    const colorMap = {
      yellow: palette.yellow,
      purple: { 
        base: '#9333EA', 
        dark1: '#7C2D12', 
        light1: '#DDD6FE', 
        light2: '#F9EBFF', 
        light3: '#FEFAFF' 
      },
      blue: { 
        base: '#2563EB', 
        dark1: '#1E40AF', 
        light1: '#DBEAFE', 
        light2: '#C3E7FE', 
        light3: '#F0F9FF' 
      },
      yellowCustom: { 
        base: '#EAB308', 
        dark1: '#CA8A04', 
        light1: '#FEF3C7', 
        light2: '#FFEC9E', 
        light3: '#FFFBEB' 
      },
      red: { 
        base: '#DC2626', 
        dark1: '#B91C1C', 
        light1: '#FEE2E2', 
        light2: '#FECACA', 
        light3: '#FEF2F2' 
      }
      // Using custom purple, blue, yellow, and red colors for tools
    };
    
    const colorPalette = colorMap[color] || colorMap.purple;
    
    if (isCompleted) return colorPalette.base;
    if (isActive) return colorPalette.dark1;
    return colorPalette.light1;
  };

  const getBackgroundColor = () => {
    const colorMap = {
      yellow: palette.yellow,
      purple: { 
        base: '#9333EA', 
        dark1: '#7C2D12', 
        light1: '#DDD6FE', 
        light2: '#F9EBFF', 
        light3: '#FEFAFF' 
      },
      blue: { 
        base: '#2563EB', 
        dark1: '#1E40AF', 
        light1: '#DBEAFE', 
        light2: '#C3E7FE', 
        light3: '#F0F9FF' 
      },
      yellowCustom: { 
        base: '#EAB308', 
        dark1: '#CA8A04', 
        light1: '#FEF3C7', 
        light2: '#FFEC9E', 
        light3: '#FFFBEB' 
      },
      red: { 
        base: '#DC2626', 
        dark1: '#B91C1C', 
        light1: '#FEE2E2', 
        light2: '#FECACA', 
        light3: '#FEF2F2' 
      }
      // Using custom purple, blue, yellow, and red colors for tools
    };
    
    const colorPalette = colorMap[color] || colorMap.purple;
    
    if (isActive) return `linear-gradient(135deg, ${colorPalette.light2}, ${colorPalette.light3})`;
    if (isCompleted) return `linear-gradient(135deg, ${colorPalette.light3}, ${palette.white})`;
    return palette.gray.light3;
  };

  const getToolIcon = () => {
    if (label.includes('patterns')) return 'Camera';
    if (label.includes('similar')) return 'Database'; // MongoDB Vector Search
    if (label.includes('network')) return 'Connect';
    if (label.includes('sanctions')) return 'Warning';
    if (label.includes('ML Risk') || label.includes('Databricks')) return 'Charts'; // Databricks ML
    if (label.includes('File Search')) return 'File';
    if (label.includes('Code Interpreter')) return 'Code';
    return 'Wrench';
  };

  const getPriorityVariant = () => {
    if (priority === 'Always first') return 'green';
    if (priority === 'Enterprise knowledge') return 'darkgray';
    return 'lightgray';
  };

  return (
    <div style={{
      background: getBackgroundColor(),
      border: `2px solid ${getToolColor()}`,
      borderRadius: '12px',
      padding: spacing[3],
      minWidth: '240px',
      maxWidth: '280px',
      position: 'relative',
      boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
      opacity: 1
    }}>


      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: spacing[2], marginBottom: spacing[2] }}>
        <div style={{
          width: '24px',
          height: '24px',
          borderRadius: '6px',
          background: getToolColor(),
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0
        }}>
          <Icon glyph={getToolIcon()} fill={palette.white} size={12} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <Overline style={{ 
            color: getToolColor(), 
            fontWeight: 'bold', 
            margin: 0,
            fontSize: '13px',
            lineHeight: 1.3
          }}>
            {label}
          </Overline>
        </div>
      </div>

      {/* Description */}
      <Body size="small" style={{ 
        color: palette.gray.dark2, 
        margin: 0,
        marginBottom: spacing[2],
        fontSize: '11px',
        lineHeight: 1.4,
        fontWeight: '500',
        display: 'flex',
        alignItems: 'center',
        gap: spacing[1]
      }}>
        {description === 'MongoDB Vector Search' && (
          <span style={{
            display: 'inline-block',
            width: '14px',
            height: '14px',
            background: '#00ED64',
            borderRadius: '2px',
            position: 'relative',
            flexShrink: 0
          }}>
            <span style={{
              position: 'absolute',
              top: '2px',
              left: '2px',
              width: '10px',
              height: '10px',
              background: '#001E2B',
              borderRadius: '50% 0 50% 50%',
              transform: 'rotate(-45deg)'
            }} />
          </span>
        )}
        {description}
      </Body>

      {/* Priority and status */}
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column',
        gap: spacing[1]
      }}>
        <Badge variant={getPriorityVariant()} style={{ fontSize: '10px' }}>
          {priority}
        </Badge>
        
        {isBuiltIn && (
          <Badge variant="darkgray" style={{ fontSize: '9px' }}>
            BUILT-IN TOOL
          </Badge>
        )}
        
        {isActive && (
          <Badge 
            variant={color} 
            style={{ fontSize: '9px' }}
          >
            RUNNING
          </Badge>
        )}
      </div>

      {/* Handles */}
      <Handle
        type="target"
        position={Position.Top}
        style={{
          background: getToolColor(),
          width: '8px',
          height: '8px',
          border: `2px solid ${palette.white}`
        }}
      />
      
      {/* Only show output handle if this tool can trigger others */}
      {(label.includes('patterns') || isBuiltIn) && (
        <Handle
          type="source"
          position={Position.Bottom}
          style={{
            background: getToolColor(),
            width: '8px',
            height: '8px',
            border: `2px solid ${palette.white}`
          }}
        />
      )}


    </div>
  );
};

export default ToolNode;
