'use client';

import React from 'react';
import { EdgeLabelRenderer, getBezierPath, EdgeProps } from 'reactflow';
import { palette } from '@leafygreen-ui/palette';

const EnhancedEdge = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  data = {}
}) => {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  // Enhanced edge styling based on data flow type
  const getEdgeStyle = () => {
    const { type = 'default', activity = 'low', confidence = 0.8 } = data;
    
    let baseStyle = {
      strokeWidth: 3,
      stroke: palette.gray.base,
      opacity: 0.7,
      ...style
    };

    // Style based on connection type
    switch (type) {
      case 'control':
        baseStyle.stroke = palette.blue.base;
        baseStyle.strokeDasharray = '0';
        break;
      case 'data':
        baseStyle.stroke = palette.green.base;
        baseStyle.strokeDasharray = '0';
        break;
      case 'memory':
        baseStyle.stroke = palette.yellow.dark1;
        baseStyle.strokeDasharray = '5,5';
        break;
      case 'debate':
        baseStyle.stroke = palette.red.base;
        baseStyle.strokeDasharray = '10,5';
        baseStyle.strokeWidth = 2;
        break;
      case 'backtrack':
        baseStyle.stroke = palette.yellow.base;
        baseStyle.strokeDasharray = '8,3,2,3';
        break;
      default:
        baseStyle.stroke = palette.gray.base;
    }

    // Adjust opacity based on activity level
    switch (activity) {
      case 'high':
        baseStyle.opacity = 1;
        baseStyle.strokeWidth = Math.max(baseStyle.strokeWidth, 4);
        break;
      case 'medium':
        baseStyle.opacity = 0.8;
        baseStyle.strokeWidth = Math.max(baseStyle.strokeWidth, 3);
        break;
      case 'low':
        baseStyle.opacity = 0.5;
        baseStyle.strokeWidth = 2;
        break;
    }

    // Add glow effect for high activity
    if (activity === 'high') {
      baseStyle.filter = `drop-shadow(0 0 6px ${baseStyle.stroke}40)`;
    }

    return baseStyle;
  };

  const edgeStyle = getEdgeStyle();

  // Animation for active connections
  const getAnimation = () => {
    if (data.activity === 'high') {
      return 'flowAnimation 2s linear infinite';
    }
    return 'none';
  };

  // Message indicator for data flow
  const MessageFlow = () => {
    if (data.messageCount > 0 && data.activity !== 'low') {
      return (
        <div
          style={{
            position: 'absolute',
            background: edgeStyle.stroke,
            color: palette.white,
            borderRadius: '10px',
            padding: '2px 6px',
            fontSize: '10px',
            fontWeight: 600,
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
            animation: getAnimation(),
            zIndex: 10
          }}
        >
          {data.messageCount}
        </div>
      );
    }
    return null;
  };

  // Connection type label
  const ConnectionLabel = () => {
    if (data.showLabel && data.type) {
      return (
        <div
          style={{
            position: 'absolute',
            background: palette.white,
            border: `1px solid ${edgeStyle.stroke}`,
            borderRadius: '4px',
            padding: '2px 4px',
            fontSize: '9px',
            color: edgeStyle.stroke,
            textTransform: 'uppercase',
            fontWeight: 600,
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}
        >
          {data.type}
        </div>
      );
    }
    return null;
  };

  return (
    <>
      {/* Main edge path */}
      <path
        id={id}
        style={edgeStyle}
        className="react-flow__edge-path"
        d={edgePath}
        markerEnd={markerEnd}
      />
      
      {/* Animated overlay for high activity */}
      {data.activity === 'high' && (
        <path
          style={{
            ...edgeStyle,
            strokeWidth: edgeStyle.strokeWidth + 2,
            opacity: 0.3,
            animation: 'pulse 1.5s ease-in-out infinite'
          }}
          d={edgePath}
          fill="none"
        />
      )}

      {/* Edge label renderer for custom elements */}
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            fontSize: 12,
            pointerEvents: 'all',
          }}
          className="nodrag nopan"
        >
          <MessageFlow />
          <ConnectionLabel />
        </div>
      </EdgeLabelRenderer>

      {/* Add CSS animations */}
      <style jsx>{`
        @keyframes flowAnimation {
          0% { transform: translateX(-10px); opacity: 0; }
          50% { opacity: 1; }
          100% { transform: translateX(10px); opacity: 0; }
        }
        
        @keyframes pulse {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.1; }
        }
      `}</style>
    </>
  );
};

export default EnhancedEdge;