'use client';

import React, { memo, useState, useRef, useEffect } from 'react';
import { Handle, Position } from 'reactflow';
import { palette } from '@leafygreen-ui/palette';
import { spacing } from '@leafygreen-ui/tokens';
import { Body, Overline } from '@leafygreen-ui/typography';
import Badge from '@leafygreen-ui/badge';
import Button from '@leafygreen-ui/button';
import Icon from '@leafygreen-ui/icon';

const EnhancedAgentNode = ({ data = {}, isConnectable, selected, id, xPos, yPos, highlighted = false }) => {
  const { 
    name = 'Unknown Agent', 
    description = 'No description available', 
    type = 'agent', 
    status = 'idle', 
    confidence = 75, 
    metrics = {},
    isSelected = false,
    capabilities = [],
    currentTask = null,
    messageQueue = 0,
    connections = []
  } = data;

  const [showContextMenu, setShowContextMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [animationPhase, setAnimationPhase] = useState(0);
  const nodeRef = useRef(null);

  // Animation cycle for active agents
  useEffect(() => {
    if (status === 'processing' || status === 'active') {
      const interval = setInterval(() => {
        setAnimationPhase(prev => (prev + 1) % 4);
      }, 800);
      return () => clearInterval(interval);
    }
  }, [status]);

  // Agent type icons with more variety
  const getAgentIcon = (agentType) => {
    switch (agentType) {
      case 'manager': return '👔';
      case 'facilitator': return '🎯';
      case 'analyzer': return '🔍';
      case 'validator': return '✅';
      case 'investigator': return '🕵️';
      case 'compliance': return '⚖️';
      case 'coordinator': return '🎭';
      case 'monitor': return '📡';
      case 'decision_maker': return '🧠';
      default: return '🤖';
    }
  };

  // Enhanced status colors with gradients
  const getStatusStyle = (status) => {
    switch (status) {
      case 'active': 
        return {
          border: `2px solid ${palette.green.base}`,
          background: `linear-gradient(135deg, ${palette.green.light3}, ${palette.white})`,
          glow: palette.green.base
        };
      case 'processing': 
        return {
          border: `2px solid ${palette.blue.base}`,
          background: `linear-gradient(135deg, ${palette.blue.light3}, ${palette.white})`,
          glow: palette.blue.base
        };
      case 'backtracking': 
        return {
          border: `2px solid ${palette.yellow.base}`,
          background: `linear-gradient(135deg, ${palette.yellow.light3}, ${palette.white})`,
          glow: palette.yellow.base
        };
      case 'complete': 
        return {
          border: `2px solid ${palette.green.dark1}`,
          background: `linear-gradient(135deg, ${palette.green.light3}, ${palette.green.light3})`,
          glow: palette.green.dark1
        };
      case 'error': 
        return {
          border: `2px solid ${palette.red.base}`,
          background: `linear-gradient(135deg, ${palette.red.light3}, ${palette.white})`,
          glow: palette.red.base
        };
      case 'waiting': 
        return {
          border: `2px solid ${palette.yellow.dark1}`,
          background: `linear-gradient(135deg, ${palette.yellow.light3}, ${palette.white})`,
          glow: palette.yellow.dark1
        };
      case 'idle': 
      default: 
        return {
          border: `2px solid ${palette.gray.light2}`,
          background: palette.white,
          glow: null
        };
    }
  };

  const statusStyle = getStatusStyle(status);

  // Confidence level indicator with more granular colors
  const getConfidenceVariant = (confidence) => {
    if (confidence >= 95) return 'green';
    if (confidence >= 85) return 'blue';
    if (confidence >= 70) return 'yellow';
    if (confidence >= 50) return 'yellow';
    return 'red';
  };

  // Handle context menu
  const handleContextMenu = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setMenuPosition({ x: e.clientX, y: e.clientY });
    setShowContextMenu(true);
  };

  const handleContextMenuAction = (action) => {
    setShowContextMenu(false);
    console.log(`Agent ${name}: ${action}`);
    // TODO: Implement actual actions
  };

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showContextMenu && !event.target.closest('.context-menu')) {
        setShowContextMenu(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showContextMenu]);

  // Get animation styles based on status
  const getAnimationStyles = () => {
    if (highlighted) {
      return {
        animation: 'correlationPulse 2s ease-in-out infinite',
      };
    }
    if (status === 'processing') {
      return {
        transform: `scale(${1 + Math.sin(animationPhase) * 0.02})`,
        transition: 'transform 0.8s ease-in-out'
      };
    }
    return {};
  };

  // Activity indicator styles
  const getActivityIndicator = () => {
    if (status === 'processing' || status === 'active') {
      return (
        <div style={{
          position: 'absolute',
          top: '-4px',
          right: '-4px',
          width: '12px',
          height: '12px',
          borderRadius: '50%',
          background: statusStyle.glow,
          animation: 'pulse 1.5s ease-in-out infinite',
          boxShadow: `0 0 8px ${statusStyle.glow}40`
        }} />
      );
    }
    return null;
  };

  // Message queue indicator
  const getMessageQueueIndicator = () => {
    if (messageQueue > 0) {
      return (
        <div style={{
          position: 'absolute',
          top: '-8px',
          left: '-8px',
          background: palette.red.base,
          color: palette.white,
          borderRadius: '50%',
          width: '20px',
          height: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '10px',
          fontWeight: 600,
          boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
        }}>
          {messageQueue > 9 ? '9+' : messageQueue}
        </div>
      );
    }
    return null;
  };

  return (
    <>
      <div
        ref={nodeRef}
        onContextMenu={handleContextMenu}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onDoubleClick={() => setShowDetails(!showDetails)}
        style={{
          minWidth: '220px',
          maxWidth: '300px',
          background: statusStyle.background,
          borderRadius: '16px',
          padding: spacing[3],
          boxShadow: highlighted
            ? `0 0 0 4px ${palette.yellow.light2}, 0 0 40px ${palette.yellow.base}60, 0 12px 32px rgba(0,0,0,0.2)`
            : isSelected 
            ? `0 0 0 3px ${palette.blue.light2}, 0 12px 32px rgba(0,0,0,0.2)`
            : isHovered
            ? `0 8px 24px rgba(0,0,0,0.15), ${statusStyle.glow ? `0 0 20px ${statusStyle.glow}20` : ''}`
            : '0 4px 12px rgba(0,0,0,0.1)',
          border: highlighted 
            ? `3px solid ${palette.yellow.base}` 
            : isSelected ? `2px solid ${palette.blue.base}` : statusStyle.border,
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          cursor: 'pointer',
          position: 'relative',
          ...getAnimationStyles()
        }}
      >
        {/* Activity Indicator */}
        {getActivityIndicator()}
        
        {/* Message Queue Indicator */}
        {getMessageQueueIndicator()}

        {/* Enhanced Connection Handles */}
        <Handle
          type="target"
          position={Position.Top}
          isConnectable={isConnectable}
          style={{
            background: statusStyle.glow || palette.gray.base,
            width: '14px',
            height: '14px',
            border: `3px solid ${palette.white}`,
            boxShadow: `0 2px 6px rgba(0,0,0,0.2)`,
            transition: 'all 0.2s ease'
          }}
        />
        <Handle
          type="source"
          position={Position.Bottom}
          isConnectable={isConnectable}
          style={{
            background: statusStyle.glow || palette.gray.base,
            width: '14px',
            height: '14px',
            border: `3px solid ${palette.white}`,
            boxShadow: `0 2px 6px rgba(0,0,0,0.2)`,
            transition: 'all 0.2s ease'
          }}
        />

        {/* Left and Right Handles for better connectivity */}
        <Handle
          type="source"
          position={Position.Right}
          id="right"
          isConnectable={isConnectable}
          style={{
            background: statusStyle.glow || palette.gray.base,
            width: '12px',
            height: '12px',
            border: `2px solid ${palette.white}`
          }}
        />
        <Handle
          type="target"
          position={Position.Left}
          id="left"
          isConnectable={isConnectable}
          style={{
            background: statusStyle.glow || palette.gray.base,
            width: '12px',
            height: '12px',
            border: `2px solid ${palette.white}`
          }}
        />

        {/* Header with enhanced styling */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: spacing[2],
          marginBottom: spacing[2]
        }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            background: statusStyle.glow 
              ? `linear-gradient(135deg, ${statusStyle.glow}20, ${palette.white})`
              : `linear-gradient(135deg, ${palette.blue.light3}, ${palette.green.light3})`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '24px',
            flexShrink: 0,
            border: `2px solid ${statusStyle.glow || palette.gray.light2}`,
            transition: 'all 0.3s ease'
          }}>
            {getAgentIcon(type)}
          </div>
          
          <div style={{ flex: 1, minWidth: 0 }}>
            <Body style={{
              fontSize: '15px',
              fontWeight: 700,
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
              marginTop: '4px'
            }}>
              <div style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                background: statusStyle.glow || palette.gray.base,
                flexShrink: 0,
                animation: (status === 'processing' || status === 'active') ? 'pulse 2s ease-in-out infinite' : 'none'
              }} />
              <Overline style={{
                fontSize: '11px',
                color: palette.gray.dark1,
                margin: 0,
                textTransform: 'capitalize',
                fontWeight: 600
              }}>
                {status}
              </Overline>
              {currentTask && (
                <Overline style={{
                  fontSize: '10px',
                  color: palette.gray.dark1,
                  margin: 0,
                  opacity: 0.7
                }}>
                  • {currentTask}
                </Overline>
              )}
            </div>
          </div>

          {/* Enhanced Confidence Badge */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: spacing[1] }}>
            <Badge 
              variant={getConfidenceVariant(confidence)}
              style={{ flexShrink: 0 }}
            >
              {confidence}%
            </Badge>
            {connections.length > 0 && (
              <div style={{
                fontSize: '10px',
                color: palette.gray.dark1,
                display: 'flex',
                alignItems: 'center',
                gap: '2px'
              }}>
                <Icon glyph="Connect" size={10} />
                {connections.length}
              </div>
            )}
          </div>
        </div>

        {/* Description */}
        <Body style={{
          fontSize: '12px',
          color: palette.gray.dark1,
          lineHeight: '1.4',
          margin: `0 0 ${spacing[2]}px 0`,
          overflow: 'hidden',
          display: '-webkit-box',
          WebkitLineClamp: showDetails ? 4 : 2,
          WebkitBoxOrient: 'vertical',
          transition: 'all 0.3s ease'
        }}>
          {description}
        </Body>

        {/* Capabilities Pills */}
        {capabilities.length > 0 && (
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: spacing[1],
            marginBottom: spacing[2]
          }}>
            {capabilities.slice(0, showDetails ? capabilities.length : 3).map((capability, index) => (
              <div
                key={index}
                style={{
                  padding: `2px ${spacing[1]}px`,
                  background: palette.blue.light3,
                  borderRadius: '8px',
                  fontSize: '9px',
                  color: palette.blue.dark2,
                  textTransform: 'uppercase',
                  fontWeight: 600,
                  letterSpacing: '0.5px'
                }}
              >
                {capability}
              </div>
            ))}
            {!showDetails && capabilities.length > 3 && (
              <div style={{
                padding: `2px ${spacing[1]}px`,
                background: palette.gray.light2,
                borderRadius: '8px',
                fontSize: '9px',
                color: palette.gray.dark1,
                cursor: 'pointer'
              }}>
                +{capabilities.length - 3}
              </div>
            )}
          </div>
        )}

        {/* Enhanced Metrics */}
        {metrics && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: showDetails ? 'repeat(2, 1fr)' : 'repeat(2, 1fr)',
            gap: spacing[2],
            marginTop: spacing[2],
            paddingTop: spacing[2],
            borderTop: `1px solid ${palette.gray.light2}`
          }}>
            <div style={{
              textAlign: 'center',
              padding: spacing[1],
              background: palette.gray.light3,
              borderRadius: '6px'
            }}>
              <div style={{
                fontSize: '16px',
                fontWeight: 700,
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
            
            <div style={{
              textAlign: 'center',
              padding: spacing[1],
              background: palette.green.light3,
              borderRadius: '6px'
            }}>
              <div style={{
                fontSize: '16px',
                fontWeight: 700,
                color: palette.green.dark2,
                lineHeight: 1
              }}>
                {metrics.accuracy}%
              </div>
              <Overline style={{
                fontSize: '9px',
                color: palette.green.dark1,
                margin: 0
              }}>
                Accuracy
              </Overline>
            </div>
            
            {showDetails && (
              <>
                <div style={{
                  textAlign: 'center',
                  padding: spacing[1],
                  background: palette.blue.light3,
                  borderRadius: '6px'
                }}>
                  <div style={{
                    fontSize: '16px',
                    fontWeight: 700,
                    color: palette.blue.dark2,
                    lineHeight: 1
                  }}>
                    {Math.round(metrics.throughput)}
                  </div>
                  <Overline style={{
                    fontSize: '9px',
                    color: palette.blue.dark1,
                    margin: 0
                  }}>
                    Ops/sec
                  </Overline>
                </div>
                
                <div style={{
                  textAlign: 'center',
                  padding: spacing[1],
                  background: palette.yellow.light3,
                  borderRadius: '6px'
                }}>
                  <div style={{
                    fontSize: '16px',
                    fontWeight: 700,
                    color: palette.yellow.dark2,
                    lineHeight: 1
                  }}>
                    {metrics.memoryUtilization}%
                  </div>
                  <Overline style={{
                    fontSize: '9px',
                    color: palette.yellow.dark1,
                    margin: 0
                  }}>
                    Memory
                  </Overline>
                </div>
              </>
            )}
          </div>
        )}

        {/* Expand/Collapse Button */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          marginTop: spacing[2]
        }}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowDetails(!showDetails);
            }}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px 8px',
              borderRadius: '4px',
              fontSize: '10px',
              color: palette.gray.dark1,
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.target.style.background = palette.gray.light2;
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'none';
            }}
          >
            {showDetails ? '▲ Less' : '▼ More'}
          </button>
        </div>

        <style jsx>{`
          @keyframes pulse {
            0%, 100% { opacity: 0.7; transform: scale(1); }
            50% { opacity: 1; transform: scale(1.05); }
          }
          
          @keyframes correlationPulse {
            0%, 100% { 
              transform: scale(1);
              box-shadow: 0 0 0 4px ${palette.yellow.light2}, 0 0 40px ${palette.yellow.base}60;
            }
            50% { 
              transform: scale(1.02);
              box-shadow: 0 0 0 8px ${palette.yellow.light1}, 0 0 60px ${palette.yellow.base}80;
            }
          }
        `}</style>
      </div>

      {/* Context Menu */}
      {showContextMenu && (
        <div
          className="context-menu"
          style={{
            position: 'fixed',
            top: menuPosition.y,
            left: menuPosition.x,
            background: palette.white,
            border: `1px solid ${palette.gray.light2}`,
            borderRadius: '8px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
            zIndex: 1000,
            minWidth: '180px',
            padding: spacing[1]
          }}
        >
          <div
            onClick={() => handleContextMenuAction('inspect')}
            style={{
              padding: `${spacing[1]}px ${spacing[2]}px`,
              cursor: 'pointer',
              borderRadius: '4px',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: spacing[1]
            }}
            onMouseEnter={(e) => {
              e.target.style.background = palette.gray.light3;
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'transparent';
            }}
          >
            <Icon glyph="MagnifyingGlass" size={14} />
            Inspect Agent
          </div>
          <div
            onClick={() => handleContextMenuAction('pause')}
            style={{
              padding: `${spacing[1]}px ${spacing[2]}px`,
              cursor: 'pointer',
              borderRadius: '4px',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: spacing[1]
            }}
            onMouseEnter={(e) => {
              e.target.style.background = palette.gray.light3;
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'transparent';
            }}
          >
            <Icon glyph="Pause" size={14} />
            Pause Agent
          </div>
          <div
            onClick={() => handleContextMenuAction('restart')}
            style={{
              padding: `${spacing[1]}px ${spacing[2]}px`,
              cursor: 'pointer',
              borderRadius: '4px',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: spacing[1]
            }}
            onMouseEnter={(e) => {
              e.target.style.background = palette.gray.light3;
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'transparent';
            }}
          >
            <Icon glyph="Refresh" size={14} />
            Restart Agent
          </div>
          <div
            onClick={() => handleContextMenuAction('debug')}
            style={{
              padding: `${spacing[1]}px ${spacing[2]}px`,
              cursor: 'pointer',
              borderRadius: '4px',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: spacing[1]
            }}
            onMouseEnter={(e) => {
              e.target.style.background = palette.gray.light3;
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'transparent';
            }}
          >
            <Icon glyph="Bug" size={14} />
            Debug Mode
          </div>
          <div
            onClick={() => handleContextMenuAction('logs')}
            style={{
              padding: `${spacing[1]}px ${spacing[2]}px`,
              cursor: 'pointer',
              borderRadius: '4px',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: spacing[1]
            }}
            onMouseEnter={(e) => {
              e.target.style.background = palette.gray.light3;
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'transparent';
            }}
          >
            <Icon glyph="Menu" size={14} />
            View Logs
          </div>
        </div>
      )}
    </>
  );
};

export default memo(EnhancedAgentNode);