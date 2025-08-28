'use client';

import React, { useState, useEffect, useRef } from 'react';
import { palette } from '@leafygreen-ui/palette';
import { spacing } from '@leafygreen-ui/tokens';

const MessageFlowOverlay = ({ 
  nodes, 
  edges, 
  isSimulationRunning, 
  simulationSpeed = 1,
  onMessageComplete,
  messageCorrelationManager
}) => {
  const [activeMessages, setActiveMessages] = useState([]);
  const [messageIdCounter, setMessageIdCounter] = useState(0);
  const overlayRef = useRef(null);

  // Clear messages when simulation stops
  useEffect(() => {
    if (!isSimulationRunning) {
      setActiveMessages([]);
      setMessageIdCounter(0);
    }
  }, [isSimulationRunning]);

  // Message types with different visual styles
  const messageTypes = {
    'transaction_data': {
      color: palette.blue.base,
      icon: '📊',
      size: 'large',
      priority: 'high'
    },
    'risk_assessment': {
      color: palette.yellow.dark1,
      icon: '⚠️',
      size: 'medium',
      priority: 'medium'
    },
    'validation_result': {
      color: palette.green.base,
      icon: '✅',
      size: 'medium',
      priority: 'medium'
    },
    'investigation_data': {
      color: palette.red.base,
      icon: '🔍',
      size: 'medium',
      priority: 'high'
    },
    'control_signal': {
      color: palette.gray.dark2,
      icon: '⚡',
      size: 'small',
      priority: 'low'
    },
    'consensus_vote': {
      color: palette.blue.dark2,
      icon: '🗳️',
      size: 'medium',
      priority: 'high'
    },
    'backtrack_request': {
      color: palette.yellow.base,
      icon: '↩️',
      size: 'small',
      priority: 'medium'
    }
  };

  // Generate realistic message flows based on fraud detection patterns
  const generateMessageFlow = () => {
    if (!isSimulationRunning || !nodes.length || !edges.length) return;

    const activeEdges = edges.filter(edge => 
      edge.data?.activity === 'high' || edge.data?.activity === 'medium'
    );

    if (activeEdges.length === 0) return;

    // Select a random active edge for message flow
    const edge = activeEdges[Math.floor(Math.random() * activeEdges.length)];
    const sourceNode = nodes.find(n => n.id === edge.source);
    const targetNode = nodes.find(n => n.id === edge.target);

    if (!sourceNode || !targetNode) return;

    // Determine message type based on edge data and agent types
    let messageType = 'control_signal';
    
    if (edge.data?.type === 'data') {
      const messageOptions = ['transaction_data', 'risk_assessment', 'investigation_data'];
      messageType = messageOptions[Math.floor(Math.random() * messageOptions.length)];
    } else if (edge.data?.type === 'debate') {
      messageType = 'consensus_vote';
    } else if (edge.data?.type === 'backtrack') {
      messageType = 'backtrack_request';
    } else if (sourceNode.data?.type === 'validator') {
      messageType = 'validation_result';
    }

    // Create new message
    const newMessage = {
      id: `msg_${messageIdCounter}`,
      sourceId: edge.source,
      targetId: edge.target,
      type: messageType,
      startTime: Date.now(),
      timestamp: Date.now(),
      duration: (2000 / simulationSpeed) + Math.random() * (1000 / simulationSpeed), // 2-3 seconds base
      sourcePosition: { x: sourceNode.position.x, y: sourceNode.position.y },
      targetPosition: { x: targetNode.position.x, y: targetNode.position.y },
      priority: messageTypes[messageType].priority,
      payload: generateMessagePayload(messageType, sourceNode.data, targetNode.data),
      latency: Math.random() * 200 + 50,
      success: Math.random() > 0.1, // 90% success rate
      correlationId: Math.random() > 0.7 ? `corr_${Date.now()}` : null // 30% chance of correlation ID
    };

    setActiveMessages(prev => [...prev, newMessage]);
    setMessageIdCounter(prev => prev + 1);

    // Add to correlation manager for sequence tracking
    if (messageCorrelationManager) {
      messageCorrelationManager.processMessage(newMessage);
    }
  };

  // Generate realistic message payload data
  const generateMessagePayload = (type, sourceData, targetData) => {
    const payloads = {
      'transaction_data': {
        amount: '$12,847.50',
        risk_score: Math.round(Math.random() * 40 + 60),
        location: 'Singapore',
        merchant: 'TechCorp Intl'
      },
      'risk_assessment': {
        risk_level: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'][Math.floor(Math.random() * 4)],
        confidence: Math.round(Math.random() * 30 + 70) + '%',
        factors: Math.floor(Math.random() * 5 + 3)
      },
      'validation_result': {
        status: Math.random() > 0.3 ? 'APPROVED' : 'REJECTED',
        compliance_score: Math.round(Math.random() * 20 + 80) + '%',
        rules_checked: Math.floor(Math.random() * 15 + 10)
      },
      'investigation_data': {
        network_depth: Math.floor(Math.random() * 3 + 2),
        connected_entities: Math.floor(Math.random() * 12 + 5),
        suspicious_patterns: Math.floor(Math.random() * 3 + 1)
      },
      'control_signal': {
        command: ['START', 'PAUSE', 'CONTINUE', 'ESCALATE'][Math.floor(Math.random() * 4)],
        priority: ['LOW', 'NORMAL', 'HIGH'][Math.floor(Math.random() * 3)]
      },
      'consensus_vote': {
        vote: Math.random() > 0.5 ? 'APPROVE' : 'REJECT',
        confidence: Math.round(Math.random() * 25 + 75) + '%',
        reasoning: 'Pattern analysis complete'
      },
      'backtrack_request': {
        reason: 'Low confidence threshold',
        alternative_strategy: 'Enhanced validation',
        retry_count: Math.floor(Math.random() * 3 + 1)
      }
    };

    return payloads[type] || { data: 'Generic message' };
  };

  // Animation update loop - only run when simulation is active and there are messages
  useEffect(() => {
    if (!isSimulationRunning || activeMessages.length === 0) {
      return;
    }

    const interval = setInterval(() => {
      setActiveMessages(prev => {
        const now = Date.now();
        return prev.filter(message => {
          const elapsed = now - message.startTime;
          if (elapsed >= message.duration) {
            if (onMessageComplete) {
              onMessageComplete(message);
            }
            return false;
          }
          return true;
        });
      });
    }, 50); // 20fps update

    return () => clearInterval(interval);
  }, [isSimulationRunning, activeMessages.length, onMessageComplete]);

  // Message generation based on simulation speed
  useEffect(() => {
    if (!isSimulationRunning) return;

    const baseInterval = 3000; // Base 3 seconds between messages
    const interval = setInterval(generateMessageFlow, baseInterval / simulationSpeed);

    return () => clearInterval(interval);
  }, [isSimulationRunning, simulationSpeed, nodes, edges, messageIdCounter]);

  // Calculate message position along path
  const calculateMessagePosition = (message) => {
    const now = Date.now();
    const elapsed = now - message.startTime;
    const progress = Math.min(elapsed / message.duration, 1);

    // Easing function for smooth movement
    const easedProgress = 1 - Math.pow(1 - progress, 3); // Ease-out cubic

    const x = message.sourcePosition.x + (message.targetPosition.x - message.sourcePosition.x) * easedProgress;
    const y = message.sourcePosition.y + (message.targetPosition.y - message.sourcePosition.y) * easedProgress;

    return { x, y, progress: easedProgress };
  };

  // Get message style based on type and priority
  const getMessageStyle = (message, position) => {
    const messageConfig = messageTypes[message.type];
    const baseSize = messageConfig.size === 'large' ? 32 : messageConfig.size === 'medium' ? 24 : 16;
    
    // Scale based on priority and progress
    const priorityScale = messageConfig.priority === 'high' ? 1.2 : messageConfig.priority === 'medium' ? 1.0 : 0.8;
    const progressScale = 1 + Math.sin(position.progress * Math.PI) * 0.2; // Gentle scaling during transit
    
    const size = baseSize * priorityScale * progressScale;

    return {
      position: 'absolute',
      left: position.x - size / 2,
      top: position.y - size / 2,
      width: size,
      height: size,
      borderRadius: '50%',
      background: `linear-gradient(135deg, ${messageConfig.color}, ${messageConfig.color}dd)`,
      border: `2px solid ${palette.white}`,
      boxShadow: `0 2px 8px ${messageConfig.color}40, 0 0 16px ${messageConfig.color}20`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: size * 0.4,
      zIndex: 100,
      animation: `messageFloat 2s ease-in-out infinite`,
      transition: 'all 0.1s ease',
      cursor: 'pointer'
    };
  };

  return (
    <div
      ref={overlayRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 50
      }}
    >
      {activeMessages.map(message => {
        const position = calculateMessagePosition(message);
        const messageConfig = messageTypes[message.type];
        
        return (
          <div
            key={message.id}
            style={{
              ...getMessageStyle(message, position),
              pointerEvents: 'all'
            }}
            title={`${message.type}: ${Object.entries(message.payload).map(([k,v]) => `${k}: ${v}`).join(', ')}`}
          >
            <span>{messageConfig.icon}</span>
            
            {/* Message trail effect */}
            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '200%',
                height: '200%',
                borderRadius: '50%',
                background: `radial-gradient(circle, ${messageConfig.color}15, transparent)`,
                animation: 'messageTrail 1s ease-out infinite',
                zIndex: -1
              }}
            />
          </div>
        );
      })}

      {/* Message Statistics Panel */}
      {isSimulationRunning && activeMessages.length > 0 && (
        <div
          style={{
            position: 'absolute',
            top: spacing[2],
            right: spacing[2],
            background: `${palette.white}f0`,
            backdropFilter: 'blur(8px)',
            border: `1px solid ${palette.gray.light2}`,
            borderRadius: '8px',
            padding: spacing[2],
            pointerEvents: 'all',
            minWidth: '150px'
          }}
        >
          <div style={{
            fontSize: '11px',
            fontWeight: 600,
            color: palette.gray.dark3,
            marginBottom: spacing[1],
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            Active Messages
          </div>
          
          {Object.entries(
            activeMessages.reduce((acc, msg) => {
              acc[msg.type] = (acc[msg.type] || 0) + 1;
              return acc;
            }, {})
          ).map(([type, count]) => (
            <div key={type} style={{
              display: 'flex',
              alignItems: 'center',
              gap: spacing[1],
              fontSize: '10px',
              color: palette.gray.dark1,
              marginBottom: '2px'
            }}>
              <span>{messageTypes[type]?.icon}</span>
              <span style={{ flex: 1, textTransform: 'capitalize' }}>
                {type.replace('_', ' ')}
              </span>
              <span style={{ 
                fontWeight: 600, 
                color: messageTypes[type]?.color 
              }}>
                {count}
              </span>
            </div>
          ))}
        </div>
      )}

      <style jsx>{`
        @keyframes messageFloat {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-2px); }
        }
        
        @keyframes messageTrail {
          0% { opacity: 0.3; transform: translate(-50%, -50%) scale(1); }
          100% { opacity: 0; transform: translate(-50%, -50%) scale(2); }
        }
      `}</style>
    </div>
  );
};

export default MessageFlowOverlay;