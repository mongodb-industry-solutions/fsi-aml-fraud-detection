'use client';

import React, { useState, useEffect } from 'react';
import { H3, Body, Overline } from '@leafygreen-ui/typography';
import { palette } from '@leafygreen-ui/palette';
import { spacing } from '@leafygreen-ui/tokens';
import Card from '@leafygreen-ui/card';
import Button from '@leafygreen-ui/button';
import Badge from '@leafygreen-ui/badge';

/**
 * MAS Memory Architecture Panel
 * Implements MAS Research directive: "Spatial Separation" and "Memory Type Visualization"
 * Shows the complete memory architecture with agent-specific memory compartments
 */
const MASMemoryArchitecturePanel = ({ 
  memoryData, 
  isSimulationRunning, 
  selectedAgent,
  onAgentSelect,
  memoryAccesses = []
}) => {
  const [highlightedMemory, setHighlightedMemory] = useState(null);

  // Simulate memory access animations
  useEffect(() => {
    if (!isSimulationRunning) return;

    const interval = setInterval(() => {
      // Simulate random memory access
      const agents = ['manager', 'analyzer', 'investigator', 'validator', 'compliance'];
      const memoryTypes = ['shared', 'working', 'episodic', 'semantic'];
      
      const randomAgent = agents[Math.floor(Math.random() * agents.length)];
      const randomMemoryType = memoryTypes[Math.floor(Math.random() * memoryTypes.length)];
      const accessType = Math.random() > 0.5 ? 'read' : 'write';

      setHighlightedMemory({
        agent: randomAgent,
        memoryType: randomMemoryType,
        accessType,
        timestamp: Date.now()
      });

      // Clear highlight after animation
      setTimeout(() => setHighlightedMemory(null), 2000);
    }, 3000);

    return () => clearInterval(interval);
  }, [isSimulationRunning]);

  // Agent configurations for memory visualization
  const agents = [
    { 
      id: 'manager', 
      name: 'Fraud Manager', 
      color: palette.blue.base,
      icon: '👨‍💼',
      memoryUsage: {
        working: 75,
        episodic: 45,
        semantic: 90
      }
    },
    { 
      id: 'analyzer', 
      name: 'Risk Analyzer', 
      color: palette.green.base,
      icon: '📊',
      memoryUsage: {
        working: 85,
        episodic: 70,
        semantic: 80
      }
    },
    { 
      id: 'investigator', 
      name: 'Investigator', 
      color: palette.red.base,
      icon: '🔍',
      memoryUsage: {
        working: 60,
        episodic: 95,
        semantic: 60
      }
    },
    { 
      id: 'validator', 
      name: 'Validator', 
      color: palette.yellow.base,
      icon: '✅',
      memoryUsage: {
        working: 70,
        episodic: 55,
        semantic: 85
      }
    },
    { 
      id: 'compliance', 
      name: 'Compliance', 
      color: palette.purple.base,
      icon: '⚖️',
      memoryUsage: {
        working: 80,
        episodic: 65,
        semantic: 95
      }
    }
  ];

  const isMemoryHighlighted = (agentId, memoryType) => {
    return highlightedMemory && 
           highlightedMemory.agent === agentId && 
           highlightedMemory.memoryType === memoryType;
  };

  const getAccessIndicator = (agentId, memoryType) => {
    if (!isMemoryHighlighted(agentId, memoryType)) return null;
    
    return (
      <div style={{
        position: 'absolute',
        top: '-5px',
        right: '-5px',
        width: '16px',
        height: '16px',
        borderRadius: '50%',
        background: highlightedMemory.accessType === 'read' ? palette.blue.base : palette.green.base,
        color: palette.white,
        fontSize: '8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 600,
        animation: 'memoryAccess 2s ease-out',
        zIndex: 10
      }}>
        {highlightedMemory.accessType === 'read' ? 'R' : 'W'}
      </div>
    );
  };

  return (
    <div>
      {/* Architecture Overview Header */}
      <div style={{
        marginBottom: spacing[3],
        padding: spacing[3],
        background: `linear-gradient(135deg, ${palette.blue.light3}20, ${palette.purple.light3}20)`,
        borderRadius: '12px',
        border: `1px solid ${palette.blue.light2}`
      }}>
        <H3 style={{
          fontSize: '20px',
          color: palette.blue.dark2,
          margin: `0 0 ${spacing[1]}px 0`,
          fontFamily: "'Euclid Circular A', sans-serif"
        }}>
          🏗️ MAS Memory Architecture
        </H3>
        <Body style={{
          color: palette.gray.dark1,
          margin: 0,
          fontSize: '14px'
        }}>
          Spatial separation between shared blackboard and private agent memory compartments.
          Real-time visualization of memory access patterns and cross-agent knowledge sharing.
        </Body>
      </div>

      {/* Shared Blackboard (Central) */}
      <div style={{
        marginBottom: spacing[4],
        padding: spacing[3],
        background: `linear-gradient(135deg, ${palette.gray.light3}, ${palette.blue.light3})`,
        borderRadius: '12px',
        border: `2px solid ${palette.blue.base}`,
        position: 'relative'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: spacing[2]
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: spacing[2]
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '8px',
              background: `linear-gradient(135deg, ${palette.blue.base}, ${palette.blue.dark1})`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px'
            }}>
              🔗
            </div>
            <div>
              <H3 style={{
                fontSize: '16px',
                color: palette.blue.dark2,
                margin: 0,
                fontFamily: "'Euclid Circular A', sans-serif"
              }}>
                Shared Blackboard Memory
              </H3>
              <Body style={{
                fontSize: '12px',
                color: palette.gray.dark1,
                margin: 0
              }}>
                Cross-agent knowledge repository • Real-time synchronization
              </Body>
            </div>
          </div>
          {isMemoryHighlighted('shared', 'shared') && (
            <Badge variant="green">
              {highlightedMemory.accessType.toUpperCase()} ACCESS
            </Badge>
          )}
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: spacing[2]
        }}>
          <Card style={{ 
            padding: spacing[2], 
            position: 'relative',
            background: isMemoryHighlighted('shared', 'shared') ? 
              `${palette.blue.light3}40` : palette.white,
            borderColor: isMemoryHighlighted('shared', 'shared') ? 
              palette.blue.base : palette.gray.light2,
            transition: 'all 0.3s ease'
          }}>
            {getAccessIndicator('shared', 'shared')}
            <Overline style={{
              fontSize: '10px',
              color: palette.blue.dark1,
              margin: `0 0 ${spacing[1]}px 0`,
              textTransform: 'uppercase'
            }}>
              Global Context
            </Overline>
            <Body style={{ fontSize: '11px', margin: 0 }}>
              • Current fraud case details<br/>
              • Shared investigation findings<br/>
              • Cross-agent consensus data
            </Body>
          </Card>

          <Card style={{ 
            padding: spacing[2], 
            position: 'relative',
            background: isMemoryHighlighted('shared', 'rules') ? 
              `${palette.green.light3}40` : palette.white,
            transition: 'all 0.3s ease'
          }}>
            <Overline style={{
              fontSize: '10px',
              color: palette.green.dark1,
              margin: `0 0 ${spacing[1]}px 0`,
              textTransform: 'uppercase'
            }}>
              Business Rules
            </Overline>
            <Body style={{ fontSize: '11px', margin: 0 }}>
              • AML compliance policies<br/>
              • Risk thresholds & limits<br/>
              • Regulatory requirements
            </Body>
          </Card>

          <Card style={{ 
            padding: spacing[2],
            position: 'relative',
            background: isMemoryHighlighted('shared', 'patterns') ? 
              `${palette.yellow.light3}40` : palette.white,
            transition: 'all 0.3s ease'
          }}>
            <Overline style={{
              fontSize: '10px',
              color: palette.yellow.dark1,
              margin: `0 0 ${spacing[1]}px 0`,
              textTransform: 'uppercase'
            }}>
              Pattern Library
            </Overline>
            <Body style={{ fontSize: '11px', margin: 0 }}>
              • Known fraud patterns<br/>
              • Historical case templates<br/>
              • Decision tree models
            </Body>
          </Card>
        </div>
      </div>

      {/* Private Agent Memory Compartments */}
      <div>
        <H3 style={{
          fontSize: '16px',
          color: palette.gray.dark2,
          margin: `0 0 ${spacing[2]}px 0`,
          fontFamily: "'Euclid Circular A', sans-serif"
        }}>
          🔐 Private Agent Memory Compartments
        </H3>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: spacing[3]
        }}>
          {agents.map(agent => (
            <Card 
              key={agent.id}
              style={{ 
                padding: spacing[3],
                border: `2px solid ${selectedAgent === agent.id ? agent.color : palette.gray.light2}`,
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
              onClick={() => onAgentSelect?.(agent.id)}
            >
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: spacing[2]
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: spacing[2]
                }}>
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '6px',
                    background: agent.color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '16px'
                  }}>
                    {agent.icon}
                  </div>
                  <div>
                    <Body style={{
                      fontSize: '12px',
                      fontWeight: 600,
                      color: palette.gray.dark3,
                      margin: 0
                    }}>
                      {agent.name}
                    </Body>
                    <Overline style={{
                      fontSize: '10px',
                      color: palette.gray.base,
                      margin: 0
                    }}>
                      Private Memory Space
                    </Overline>
                  </div>
                </div>
                {selectedAgent === agent.id && (
                  <Badge variant="blue">SELECTED</Badge>
                )}
              </div>

              {/* Memory Type Usage Bars */}
              <div style={{ display: 'grid', gap: spacing[1] }}>
                {Object.entries(agent.memoryUsage).map(([memoryType, usage]) => (
                  <div key={memoryType} style={{ position: 'relative' }}>
                    {getAccessIndicator(agent.id, memoryType)}
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '2px'
                    }}>
                      <Overline style={{
                        fontSize: '9px',
                        color: palette.gray.dark1,
                        margin: 0,
                        textTransform: 'capitalize'
                      }}>
                        {memoryType} Memory
                      </Overline>
                      <span style={{
                        fontSize: '9px',
                        fontWeight: 600,
                        color: palette.gray.dark2
                      }}>
                        {usage}%
                      </span>
                    </div>
                    <div style={{
                      width: '100%',
                      height: '4px',
                      background: palette.gray.light3,
                      borderRadius: '2px',
                      overflow: 'hidden',
                      position: 'relative'
                    }}>
                      <div style={{
                        width: `${usage}%`,
                        height: '100%',
                        background: isMemoryHighlighted(agent.id, memoryType) ? 
                          `linear-gradient(90deg, ${agent.color}, ${agent.color}80)` : 
                          agent.color,
                        borderRadius: '2px',
                        transition: 'all 0.3s ease'
                      }} />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      </div>

      <style jsx>{`
        @keyframes memoryAccess {
          0% { 
            transform: scale(0); 
            opacity: 0; 
          }
          50% { 
            transform: scale(1.2); 
            opacity: 1; 
          }
          100% { 
            transform: scale(1); 
            opacity: 0.8; 
          }
        }
      `}</style>
    </div>
  );
};

export default MASMemoryArchitecturePanel;