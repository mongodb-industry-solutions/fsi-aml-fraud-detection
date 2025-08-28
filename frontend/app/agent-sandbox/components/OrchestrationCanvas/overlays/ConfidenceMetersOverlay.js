'use client';

import React, { useState, useEffect } from 'react';
import { palette } from '@leafygreen-ui/palette';
import { spacing } from '@leafygreen-ui/tokens';
import { Body, Overline } from '@leafygreen-ui/typography';

const ConfidenceMetersOverlay = ({ 
  nodes, 
  isSimulationRunning, 
  simulationSpeed = 1,
  onConfidenceUpdate 
}) => {
  const [confidenceData, setConfidenceData] = useState(new Map());
  const [showMeters, setShowMeters] = useState(true);

  // Reset confidence data when simulation stops
  useEffect(() => {
    if (!isSimulationRunning) {
      // Keep the confidence data but stop updates - don't clear it completely
      // as it provides useful static information
    }
  }, [isSimulationRunning]);

  // Confidence level thresholds and styling
  const confidenceLevels = {
    'critical': { threshold: 90, color: palette.red.dark2, label: 'Critical' },
    'high': { threshold: 75, color: palette.green.base, label: 'High' },
    'medium': { threshold: 50, color: palette.yellow.dark1, label: 'Medium' },
    'low': { threshold: 25, color: palette.red.base, label: 'Low' },
    'very_low': { threshold: 0, color: palette.red.dark1, label: 'Very Low' }
  };

  // Get confidence level styling
  const getConfidenceLevel = (confidence) => {
    for (const [level, config] of Object.entries(confidenceLevels)) {
      if (confidence >= config.threshold) {
        return config;
      }
    }
    return confidenceLevels.very_low;
  };

  // Generate realistic confidence fluctuations based on agent type
  const generateConfidenceUpdate = (node) => {
    const agentType = node.data?.type;
    const currentStatus = node.data?.status;
    const baseConfidence = confidenceData.get(node.id)?.current || (60 + Math.random() * 30);
    
    let changeRange = 2; // Base change range
    let bias = 0; // Positive = increase, negative = decrease
    
    // Agent type influences confidence patterns
    switch (agentType) {
      case 'analyzer':
        changeRange = 3;
        bias = currentStatus === 'processing' ? 0.5 : 0;
        break;
      case 'validator':
        changeRange = 1.5;
        bias = 0.2; // Generally more stable and confident
        break;
      case 'investigator':
        changeRange = 4;
        bias = currentStatus === 'processing' ? -0.2 : 0; // Dips during investigation
        break;
      case 'compliance':
        changeRange = 2.5;
        bias = 0.1;
        break;
      case 'manager':
      case 'facilitator':
        changeRange = 1;
        bias = 0.15;
        break;
    }

    // Status affects confidence changes
    if (currentStatus === 'error') {
      bias = -2;
      changeRange = 5;
    } else if (currentStatus === 'complete') {
      bias = 1;
      changeRange = 1;
    }

    const change = (Math.random() - 0.5) * changeRange + bias;
    const newConfidence = Math.max(10, Math.min(100, baseConfidence + change));
    
    return {
      previous: baseConfidence,
      current: newConfidence,
      change,
      trend: change > 0 ? 'increasing' : change < 0 ? 'decreasing' : 'stable',
      timestamp: Date.now()
    };
  };

  // Initialize confidence data for all agents
  useEffect(() => {
    const newConfidenceData = new Map();
    
    nodes.forEach(node => {
      if (['analyzer', 'validator', 'investigator', 'compliance', 'manager', 'facilitator'].includes(node.data?.type)) {
        const initialConfidence = 50 + Math.random() * 40; // 50-90% initial
        newConfidenceData.set(node.id, {
          current: initialConfidence,
          previous: initialConfidence,
          change: 0,
          trend: 'stable',
          timestamp: Date.now(),
          history: [initialConfidence]
        });
      }
    });

    setConfidenceData(newConfidenceData);
  }, [nodes]);

  // Update confidence levels during simulation
  useEffect(() => {
    if (!isSimulationRunning) return;

    const interval = setInterval(() => {
      setConfidenceData(prev => {
        const updated = new Map(prev);
        
        nodes.forEach(node => {
          if (updated.has(node.id)) {
            const update = generateConfidenceUpdate(node);
            const existingData = updated.get(node.id);
            
            updated.set(node.id, {
              ...update,
              history: [...existingData.history.slice(-19), update.current] // Keep last 20 values
            });

            if (onConfidenceUpdate) {
              onConfidenceUpdate({
                agentId: node.id,
                agentName: node.data?.name,
                confidence: update.current,
                change: update.change,
                trend: update.trend
              });
            }
          }
        });
        
        return updated;
      });
    }, Math.max(2000, 5000 / simulationSpeed)); // Reduced frequency to prevent freezing

    return () => clearInterval(interval);
  }, [isSimulationRunning, simulationSpeed, nodes, onConfidenceUpdate]);

  // Render confidence meter for a single agent
  const renderConfidenceMeter = (node) => {
    const confidence = confidenceData.get(node.id);
    if (!confidence) return null;

    const level = getConfidenceLevel(confidence.current);
    const meterWidth = 80;
    const meterHeight = 8;
    const fillWidth = (confidence.current / 100) * meterWidth;
    
    return (
      <div
        key={node.id}
        style={{
          position: 'absolute',
          left: node.position.x - 40,
          top: node.position.y - 35,
          zIndex: 120,
          background: `${palette.white}f0`,
          backdropFilter: 'blur(4px)',
          border: `1px solid ${palette.gray.light2}`,
          borderRadius: '6px',
          padding: '4px 6px',
          minWidth: '90px',
          pointerEvents: 'all',
          cursor: 'pointer',
          transition: 'all 0.3s ease'
        }}
        onClick={() => {
          // Toggle detailed view or perform action
          console.log('Confidence details for:', node.data?.name, confidence);
        }}
      >
        {/* Agent Name */}
        <div style={{
          fontSize: '9px',
          color: palette.gray.dark2,
          marginBottom: '2px',
          fontWeight: 600
        }}>
          {node.data?.name?.split(' ')[0] || 'Agent'}
        </div>

        {/* Confidence Bar */}
        <div style={{ position: 'relative', marginBottom: '2px' }}>
          {/* Background bar */}
          <div style={{
            width: meterWidth,
            height: meterHeight,
            background: palette.gray.light2,
            borderRadius: '4px',
            overflow: 'hidden'
          }}>
            {/* Fill bar */}
            <div style={{
              width: fillWidth,
              height: '100%',
              background: `linear-gradient(90deg, ${level.color}, ${level.color}cc)`,
              borderRadius: '4px',
              transition: 'width 0.5s ease',
              position: 'relative'
            }}>
              {/* Animated highlight */}
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '50%',
                background: `linear-gradient(90deg, transparent, ${palette.white}40, transparent)`,
                borderRadius: '4px 4px 0 0',
                animation: confidence.trend !== 'stable' ? 'shimmer 2s ease-in-out infinite' : 'none'
              }} />
            </div>
          </div>
        </div>

        {/* Confidence Value and Trend */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span style={{
            fontSize: '10px',
            color: level.color,
            fontWeight: 700
          }}>
            {Math.round(confidence.current)}%
          </span>
          
          {/* Trend Indicator */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '2px'
          }}>
            {confidence.trend === 'increasing' && (
              <span style={{ fontSize: '8px', color: palette.green.base }}>↗</span>
            )}
            {confidence.trend === 'decreasing' && (
              <span style={{ fontSize: '8px', color: palette.red.base }}>↘</span>
            )}
            {confidence.trend === 'stable' && (
              <span style={{ fontSize: '8px', color: palette.gray.base }}>→</span>
            )}
            
            {Math.abs(confidence.change) > 0.1 && (
              <span style={{
                fontSize: '8px',
                color: confidence.change > 0 ? palette.green.dark1 : palette.red.dark1
              }}>
                {confidence.change > 0 ? '+' : ''}{confidence.change.toFixed(1)}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Render mini sparkline chart for confidence history
  const renderSparkline = (history, nodeId) => {
    if (!history || history.length < 2) return null;
    
    const maxValue = Math.max(...history);
    const minValue = Math.min(...history);
    const range = maxValue - minValue || 1;
    
    const points = history.map((value, index) => {
      const x = (index / (history.length - 1)) * 60; // 60px wide
      const y = 20 - ((value - minValue) / range) * 20; // 20px high, inverted
      return `${x},${y}`;
    }).join(' ');

    return (
      <svg
        width="60"
        height="20"
        style={{ marginLeft: '4px' }}
      >
        <polyline
          points={points}
          fill="none"
          stroke={getConfidenceLevel(history[history.length - 1]).color}
          strokeWidth="1"
          opacity="0.7"
        />
      </svg>
    );
  };

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 110
      }}
    >
      {/* Confidence Meters */}
      {showMeters && nodes.map(node => {
        if (['analyzer', 'validator', 'investigator', 'compliance', 'manager', 'facilitator'].includes(node.data?.type)) {
          return renderConfidenceMeter(node);
        }
        return null;
      })}

      {/* Global Confidence Summary */}
      {isSimulationRunning && confidenceData.size > 0 && (
        <div
          style={{
            position: 'absolute',
            top: spacing[2],
            left: spacing[2],
            background: `${palette.white}f0`,
            backdropFilter: 'blur(8px)',
            border: `1px solid ${palette.gray.light2}`,
            borderRadius: '8px',
            padding: spacing[2],
            pointerEvents: 'all',
            minWidth: '180px'
          }}
        >
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: spacing[1]
          }}>
            <Overline style={{
              fontSize: '10px',
              color: palette.gray.dark3,
              margin: 0,
              textTransform: 'uppercase',
              fontWeight: 600
            }}>
              Confidence Levels
            </Overline>
            <button
              onClick={() => setShowMeters(!showMeters)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: '12px',
                color: palette.gray.dark1
              }}
            >
              {showMeters ? '👁️' : '👁️‍🗨️'}
            </button>
          </div>

          {Array.from(confidenceData.entries()).map(([nodeId, confidence]) => {
            const node = nodes.find(n => n.id === nodeId);
            if (!node) return null;
            
            const level = getConfidenceLevel(confidence.current);
            
            return (
              <div
                key={nodeId}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '2px 0',
                  borderBottom: `1px solid ${palette.gray.light2}`,
                  fontSize: '10px'
                }}
              >
                <span style={{ color: palette.gray.dark2 }}>
                  {node.data?.name?.split(' ')[0]}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ color: level.color, fontWeight: 600 }}>
                    {Math.round(confidence.current)}%
                  </span>
                  {renderSparkline(confidence.history, nodeId)}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <style jsx>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
      `}</style>
    </div>
  );
};

export default ConfidenceMetersOverlay;