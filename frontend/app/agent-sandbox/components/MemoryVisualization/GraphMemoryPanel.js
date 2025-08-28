'use client';

import React, { useState } from 'react';
import { H3, Body, Overline } from '@leafygreen-ui/typography';
import { palette } from '@leafygreen-ui/palette';
import { spacing } from '@leafygreen-ui/tokens';
import Card from '@leafygreen-ui/card';
import Badge from '@leafygreen-ui/badge';
import Button from '@leafygreen-ui/button';

const GraphMemoryPanel = ({ graphMemory, exploreMode, isSimulationRunning }) => {
  const [selectedRelationship, setSelectedRelationship] = useState(null);

  // Mock network relationships for visualization
  const mockRelationships = [
    {
      id: 'rel-1',
      source: 'Account: John Smith',
      target: 'Merchant: TechCorp International',
      type: 'transacted_with',
      strength: 0.89,
      frequency: 23,
      riskLevel: 'high',
      lastActivity: new Date(Date.now() - 1000 * 60 * 15)
    },
    {
      id: 'rel-2', 
      source: 'TechCorp International',
      target: 'Shell Company: Apex Holdings',
      type: 'owned_by',
      strength: 0.95,
      frequency: 1,
      riskLevel: 'critical',
      lastActivity: new Date(Date.now() - 1000 * 60 * 5)
    },
    {
      id: 'rel-3',
      source: 'Apex Holdings',
      target: 'Suspicious Network: Ring-447',
      type: 'connected_to',
      strength: 0.67,
      frequency: 8,
      riskLevel: 'critical',
      lastActivity: new Date(Date.now() - 1000 * 60 * 30)
    },
    {
      id: 'rel-4',
      source: 'Account: Sarah Johnson',
      target: 'Digital Store Inc',
      type: 'multiple_attempts',
      strength: 0.78,
      frequency: 47,
      riskLevel: 'high',
      lastActivity: new Date(Date.now() - 1000 * 60 * 2)
    },
    {
      id: 'rel-5',
      source: 'Account: Michael Brown',
      target: 'Location: Moscow, Russia',
      type: 'anomalous_location',
      strength: 0.92,
      frequency: 1,
      riskLevel: 'high',
      lastActivity: new Date(Date.now() - 1000 * 60 * 45)
    }
  ];

  // Get relationship color based on risk level
  const getRiskColor = (riskLevel) => {
    switch (riskLevel) {
      case 'critical': return palette.red.base;
      case 'high': return palette.yellow.base;
      case 'medium': return palette.blue.base;
      case 'low': return palette.green.base;
      default: return palette.gray.base;
    }
  };

  // Get badge variant for risk levels
  const getRiskVariant = (riskLevel) => {
    switch (riskLevel) {
      case 'critical': return 'red';
      case 'high': return 'yellow';
      case 'medium': return 'blue';
      case 'low': return 'green';
      default: return 'lightgray';
    }
  };

  // Get relationship type display name
  const getRelationshipName = (type) => {
    return type.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: exploreMode ? '1fr 1fr' : '1fr',
      gap: spacing[4],
      height: '100%'
    }}>
      {/* Main Graph Network Visualization */}
      <div>
        <H3 style={{
          fontSize: '18px',
          color: palette.gray.dark3,
          marginBottom: spacing[3],
          fontFamily: "'Euclid Circular A', sans-serif"
        }}>
          Graph Memory Network
        </H3>

        {/* Network Overview */}
        <Card style={{ padding: spacing[3], marginBottom: spacing[4] }}>
          <H3 style={{
            fontSize: '14px',
            color: palette.gray.dark3,
            marginBottom: spacing[2],
            fontFamily: "'Euclid Circular A', sans-serif"
          }}>
            Network Topology Analysis
          </H3>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))',
            gap: spacing[3]
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{
                fontSize: '20px',
                fontWeight: 600,
                color: palette.blue.base,
                lineHeight: 1
              }}>
                {graphMemory.nodeCount.toLocaleString()}
              </div>
              <Overline style={{
                fontSize: '9px',
                color: palette.gray.dark1,
                margin: 0
              }}>
                Nodes
              </Overline>
            </div>

            <div style={{ textAlign: 'center' }}>
              <div style={{
                fontSize: '20px',
                fontWeight: 600,
                color: palette.green.base,
                lineHeight: 1
              }}>
                {graphMemory.edgeCount.toLocaleString()}
              </div>
              <Overline style={{
                fontSize: '9px',
                color: palette.gray.dark1,
                margin: 0
              }}>
                Edges
              </Overline>
            </div>

            <div style={{ textAlign: 'center' }}>
              <div style={{
                fontSize: '20px',
                fontWeight: 600,
                color: palette.yellow.base,
                lineHeight: 1
              }}>
                {Math.round(graphMemory.clustering * 100)}%
              </div>
              <Overline style={{
                fontSize: '9px',
                color: palette.gray.dark1,
                margin: 0
              }}>
                Clustering
              </Overline>
            </div>

            <div style={{ textAlign: 'center' }}>
              <div style={{
                fontSize: '20px',
                fontWeight: 600,
                color: palette.red.base,
                lineHeight: 1
              }}>
                {graphMemory.connectedComponents}
              </div>
              <Overline style={{
                fontSize: '9px',
                color: palette.gray.dark1,
                margin: 0
              }}>
                Components
              </Overline>
            </div>
          </div>
        </Card>

        {/* Relationship Network */}
        <H3 style={{
          fontSize: '16px',
          color: palette.gray.dark3,
          marginBottom: spacing[3],
          fontFamily: "'Euclid Circular A', sans-serif"
        }}>
          Active Network Relationships
        </H3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[3] }}>
          {mockRelationships.map(relationship => (
            <Card
              key={relationship.id}
              style={{
                padding: spacing[3],
                cursor: exploreMode ? 'pointer' : 'default',
                border: selectedRelationship?.id === relationship.id 
                  ? `2px solid ${getRiskColor(relationship.riskLevel)}` 
                  : `1px solid ${palette.gray.light2}`,
                background: selectedRelationship?.id === relationship.id 
                  ? `${getRiskColor(relationship.riskLevel)}10` 
                  : palette.white,
                transition: 'all 0.2s ease',
                position: 'relative'
              }}
              onClick={() => exploreMode && setSelectedRelationship(relationship)}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing[2] }}>
                <Badge variant={getRiskVariant(relationship.riskLevel)}>
                  {relationship.riskLevel.toUpperCase()}
                </Badge>
                <div style={{
                  fontSize: '14px',
                  fontWeight: 600,
                  color: getRiskColor(relationship.riskLevel)
                }}>
                  {Math.round(relationship.strength * 100)}% strength
                </div>
              </div>

              {/* Relationship Flow */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: spacing[2],
                marginBottom: spacing[2]
              }}>
                <div style={{
                  flex: 1,
                  padding: spacing[2],
                  background: palette.blue.light3,
                  borderRadius: '6px',
                  textAlign: 'center'
                }}>
                  <Body style={{
                    fontSize: '12px',
                    fontWeight: 600,
                    color: palette.blue.dark2,
                    margin: 0
                  }}>
                    {relationship.source}
                  </Body>
                </div>

                <div style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center',
                  minWidth: '80px'
                }}>
                  <div style={{ fontSize: '16px', color: getRiskColor(relationship.riskLevel) }}>→</div>
                  <Overline style={{
                    fontSize: '8px',
                    color: palette.gray.dark1,
                    margin: 0,
                    textAlign: 'center'
                  }}>
                    {getRelationshipName(relationship.type)}
                  </Overline>
                </div>

                <div style={{
                  flex: 1,
                  padding: spacing[2],
                  background: palette.green.light3,
                  borderRadius: '6px',
                  textAlign: 'center'
                }}>
                  <Body style={{
                    fontSize: '12px',
                    fontWeight: 600,
                    color: palette.green.dark2,
                    margin: 0
                  }}>
                    {relationship.target}
                  </Body>
                </div>
              </div>

              {/* Relationship Stats */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr',
                gap: spacing[2]
              }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{
                    fontSize: '14px',
                    fontWeight: 600,
                    color: palette.gray.dark3,
                    lineHeight: 1
                  }}>
                    {relationship.frequency}
                  </div>
                  <Overline style={{
                    fontSize: '9px',
                    color: palette.gray.dark1,
                    margin: 0
                  }}>
                    Frequency
                  </Overline>
                </div>

                <div style={{ textAlign: 'center' }}>
                  <div style={{
                    fontSize: '14px',
                    fontWeight: 600,
                    color: palette.gray.dark3,
                    lineHeight: 1
                  }}>
                    {Math.round(relationship.strength * 100)}%
                  </div>
                  <Overline style={{
                    fontSize: '9px',
                    color: palette.gray.dark1,
                    margin: 0
                  }}>
                    Strength
                  </Overline>
                </div>

                <div style={{ textAlign: 'center' }}>
                  <div style={{
                    fontSize: '14px',
                    fontWeight: 600,
                    color: palette.gray.dark3,
                    lineHeight: 1
                  }}>
                    {Math.floor((new Date() - relationship.lastActivity) / 60000)}m
                  </div>
                  <Overline style={{
                    fontSize: '9px',
                    color: palette.gray.dark1,
                    margin: 0
                  }}>
                    Last Activity
                  </Overline>
                </div>
              </div>

              {/* Active indicator for critical relationships */}
              {isSimulationRunning && relationship.riskLevel === 'critical' && (
                <div style={{
                  position: 'absolute',
                  top: spacing[1],
                  right: spacing[1],
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: palette.red.base,
                  animation: 'pulse 2s infinite'
                }} />
              )}
            </Card>
          ))}
        </div>
      </div>

      {/* Explore Panel (only visible in explore mode) */}
      {exploreMode && (
        <div>
          <H3 style={{
            fontSize: '18px',
            color: palette.gray.dark3,
            marginBottom: spacing[3],
            fontFamily: "'Euclid Circular A', sans-serif"
          }}>
            Network Analysis
          </H3>

          {/* Network Statistics */}
          <Card style={{ padding: spacing[3], marginBottom: spacing[3] }}>
            <H3 style={{
              fontSize: '14px',
              color: palette.gray.dark3,
              marginBottom: spacing[2],
              fontFamily: "'Euclid Circular A', sans-serif"
            }}>
              Graph Analytics
            </H3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[2] }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: spacing[2],
                background: palette.gray.light3,
                borderRadius: '6px'
              }}>
                <Body style={{
                  fontSize: '12px',
                  color: palette.gray.dark1,
                  margin: 0
                }}>
                  Average Degree Centrality
                </Body>
                <Body style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: palette.gray.dark3,
                  margin: 0
                }}>
                  2.34
                </Body>
              </div>

              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: spacing[2],
                background: palette.gray.light3,
                borderRadius: '6px'
              }}>
                <Body style={{
                  fontSize: '12px',
                  color: palette.gray.dark1,
                  margin: 0
                }}>
                  Betweenness Centrality
                </Body>
                <Body style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: palette.gray.dark3,
                  margin: 0
                }}>
                  0.67
                </Body>
              </div>

              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: spacing[2],
                background: palette.gray.light3,
                borderRadius: '6px'
              }}>
                <Body style={{
                  fontSize: '12px',
                  color: palette.gray.dark1,
                  margin: 0
                }}>
                  Network Density
                </Body>
                <Body style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: palette.gray.dark3,
                  margin: 0
                }}>
                  0.12
                </Body>
              </div>

              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: spacing[2],
                background: palette.gray.light3,
                borderRadius: '6px'
              }}>
                <Body style={{
                  fontSize: '12px',
                  color: palette.gray.dark1,
                  margin: 0
                }}>
                  Shortest Path Length
                </Body>
                <Body style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: palette.gray.dark3,
                  margin: 0
                }}>
                  3.8
                </Body>
              </div>
            </div>
          </Card>

          {/* Selected Relationship Details */}
          {selectedRelationship && (
            <Card style={{ padding: spacing[3] }}>
              <H3 style={{
                fontSize: '14px',
                color: palette.gray.dark3,
                marginBottom: spacing[2],
                fontFamily: "'Euclid Circular A', sans-serif"
              }}>
                Relationship Analysis
              </H3>
              
              <div style={{
                padding: spacing[2],
                background: `${getRiskColor(selectedRelationship.riskLevel)}15`,
                borderRadius: '6px',
                marginBottom: spacing[2]
              }}>
                <Body style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: palette.gray.dark3,
                  margin: 0,
                  marginBottom: spacing[1]
                }}>
                  {getRelationshipName(selectedRelationship.type)}
                </Body>
                <Body style={{
                  fontSize: '11px',
                  color: palette.gray.dark1,
                  margin: 0,
                  lineHeight: 1.4
                }}>
                  {selectedRelationship.source} → {selectedRelationship.target}
                </Body>
              </div>

              <Body style={{
                fontSize: '12px',
                color: palette.gray.dark1,
                marginBottom: spacing[2],
                lineHeight: 1.4
              }}>
                This relationship has been observed {selectedRelationship.frequency} times with a 
                strength of {Math.round(selectedRelationship.strength * 100)}%. Risk level is marked as{' '}
                <strong style={{ color: getRiskColor(selectedRelationship.riskLevel) }}>
                  {selectedRelationship.riskLevel}
                </strong> based on pattern analysis and fraud indicators.
              </Body>

              <div style={{
                padding: spacing[2],
                background: palette.blue.light3,
                borderRadius: '6px',
                border: `1px solid ${palette.blue.light2}`
              }}>
                <Overline style={{
                  fontSize: '10px',
                  color: palette.blue.dark2,
                  margin: `0 0 ${spacing[1]}px 0`,
                  textTransform: 'uppercase'
                }}>
                  Graph Memory Details
                </Overline>
                <Body style={{
                  fontSize: '11px',
                  color: palette.gray.dark1,
                  margin: 0
                }}>
                  • MongoDB Graph Traversal • Multi-hop Analysis • Temporal Patterns<br/>
                  • Last updated {Math.floor((new Date() - selectedRelationship.lastActivity) / 60000)} minutes ago
                </Body>
              </div>
            </Card>
          )}
        </div>
      )}

      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default GraphMemoryPanel;