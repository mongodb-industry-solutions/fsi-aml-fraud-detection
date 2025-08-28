'use client';

import React, { useState, useEffect } from 'react';
import { H3, Body, Overline } from '@leafygreen-ui/typography';
import { palette } from '@leafygreen-ui/palette';
import { spacing } from '@leafygreen-ui/tokens';
import Card from '@leafygreen-ui/card';
import Button from '@leafygreen-ui/button';
import Badge from '@leafygreen-ui/badge';
import Code from '@leafygreen-ui/code';

/**
 * Shared Blackboard Panel
 * Implements MAS Research directive: Central "Shared Blackboard" with key-value visualization
 * Shows shared knowledge accessible to all agents
 */
const SharedBlackboardPanel = ({ 
  memoryData, 
  isSimulationRunning,
  selectedAgent
}) => {
  const [blackboardData, setBlackboardData] = useState({});
  const [recentUpdates, setRecentUpdates] = useState([]);
  const [expandedItems, setExpandedItems] = useState(new Set());

  // Generate realistic shared blackboard data
  useEffect(() => {
    const generateBlackboardData = () => ({
      // Global Case Context
      'case.current_id': 'FRD-2024-001547',
      'case.priority': 'HIGH',
      'case.status': 'UNDER_INVESTIGATION',
      'case.assigned_agents': ['analyzer', 'investigator', 'validator'],
      
      // Shared Investigation Findings
      'findings.risk_score': 87.5,
      'findings.suspicious_patterns': ['large_cash_deposits', 'cross_border_transfers', 'layered_transactions'],
      'findings.confidence_level': 0.91,
      'findings.flagged_accounts': ['ACC-789456', 'ACC-123789'],
      
      // Cross-Agent Consensus
      'consensus.fraud_likelihood': 'HIGH',
      'consensus.agent_agreement': {
        analyzer: 'AGREE',
        investigator: 'AGREE', 
        validator: 'PENDING',
        compliance: 'AGREE'
      },
      'consensus.next_actions': ['deep_investigation', 'regulatory_notification'],
      
      // Shared Business Rules
      'rules.aml_threshold': 50000,
      'rules.auto_flag_amount': 100000,
      'rules.review_required': true,
      'rules.escalation_criteria': ['amount > 75000', 'cross_border = true'],
      
      // Pattern Knowledge Base
      'patterns.fraud_indicators': [
        'Multiple transactions just under reporting threshold',
        'Rapid movement of funds between accounts',
        'Transactions in high-risk jurisdictions'
      ],
      'patterns.known_entities': {
        'high_risk_countries': ['Country_A', 'Country_B'],
        'suspicious_merchants': ['MERCH_001', 'MERCH_047']
      },
      
      // System Status
      'system.last_update': new Date().toISOString(),
      'system.active_agents': 4,
      'system.total_memory_usage': '156.7 MB',
      'system.sync_status': 'SYNCHRONIZED'
    });

    setBlackboardData(generateBlackboardData());
  }, []);

  // Simulate real-time updates during simulation
  useEffect(() => {
    if (!isSimulationRunning) return;

    const interval = setInterval(() => {
      const updateTargets = [
        'findings.risk_score',
        'findings.confidence_level', 
        'consensus.agent_agreement',
        'system.last_update',
        'system.total_memory_usage'
      ];

      const targetKey = updateTargets[Math.floor(Math.random() * updateTargets.length)];
      const timestamp = new Date().toISOString();
      
      setBlackboardData(prev => {
        const updated = { ...prev };
        
        // Generate realistic updates
        switch (targetKey) {
          case 'findings.risk_score':
            updated[targetKey] = Math.round((Math.random() * 20 + 75) * 10) / 10;
            break;
          case 'findings.confidence_level':
            updated[targetKey] = Math.round((Math.random() * 0.15 + 0.85) * 100) / 100;
            break;
          case 'system.last_update':
            updated[targetKey] = timestamp;
            break;
          case 'system.total_memory_usage':
            updated[targetKey] = `${Math.round((Math.random() * 50 + 140) * 10) / 10} MB`;
            break;
          case 'consensus.agent_agreement':
            const agents = Object.keys(prev[targetKey]);
            const randomAgent = agents[Math.floor(Math.random() * agents.length)];
            const statuses = ['AGREE', 'DISAGREE', 'PENDING'];
            updated[targetKey] = {
              ...prev[targetKey],
              [randomAgent]: statuses[Math.floor(Math.random() * statuses.length)]
            };
            break;
        }
        
        return updated;
      });

      // Track recent updates
      setRecentUpdates(prev => [{
        key: targetKey,
        timestamp,
        agent: selectedAgent || 'system'
      }, ...prev.slice(0, 9)]);

    }, 2000 + Math.random() * 3000);

    return () => clearInterval(interval);
  }, [isSimulationRunning, selectedAgent]);

  const toggleExpansion = (key) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  };

  const formatValue = (value) => {
    if (typeof value === 'object' && value !== null) {
      return JSON.stringify(value, null, 2);
    }
    return String(value);
  };

  const getValueType = (value) => {
    if (typeof value === 'object' && value !== null) return 'object';
    if (typeof value === 'number') return 'number';
    if (typeof value === 'boolean') return 'boolean';
    if (typeof value === 'string' && value.includes('-') && value.length > 15) return 'id';
    return 'string';
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'object': return palette.blue.base;
      case 'number': return palette.green.base;
      case 'boolean': return palette.yellow.base;
      case 'id': return palette.purple.base;
      default: return palette.gray.dark1;
    }
  };

  const groupedData = Object.entries(blackboardData).reduce((acc, [key, value]) => {
    const category = key.split('.')[0];
    if (!acc[category]) acc[category] = [];
    acc[category].push([key, value]);
    return acc;
  }, {});

  return (
    <div>
      {/* Shared Blackboard Header */}
      <div style={{
        marginBottom: spacing[3],
        padding: spacing[3],
        background: `linear-gradient(135deg, ${palette.blue.light3}20, ${palette.gray.light3}20)`,
        borderRadius: '12px',
        border: `2px solid ${palette.blue.base}`
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
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
                fontSize: '20px',
                color: palette.blue.dark2,
                margin: 0,
                fontFamily: "'Euclid Circular A', sans-serif"
              }}>
                Shared Blackboard Memory
              </H3>
              <Body style={{
                fontSize: '14px',
                color: palette.gray.dark1,
                margin: 0
              }}>
                Central knowledge repository accessible to all agents. Key-value store with real-time synchronization.
              </Body>
            </div>
          </div>
          <Badge variant={isSimulationRunning ? "green" : "lightgray"}>
            {Object.keys(blackboardData).length} ENTRIES
          </Badge>
        </div>
      </div>

      {/* Recent Updates Timeline */}
      {recentUpdates.length > 0 && (
        <Card style={{
          padding: spacing[3],
          marginBottom: spacing[3],
          border: `1px solid ${palette.yellow.light2}`
        }}>
          <H3 style={{
            fontSize: '14px',
            color: palette.yellow.dark2,
            margin: `0 0 ${spacing[2]}px 0`,
            display: 'flex',
            alignItems: 'center',
            gap: spacing[1]
          }}>
            ⚡ Recent Updates
          </H3>
          <div style={{
            display: 'grid',
            gap: spacing[1],
            maxHeight: '120px',
            overflowY: 'auto'
          }}>
            {recentUpdates.slice(0, 5).map((update, index) => (
              <div key={index} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: spacing[1],
                background: palette.yellow.light3,
                borderRadius: '4px',
                fontSize: '10px'
              }}>
                <span style={{ fontWeight: 600, color: palette.yellow.dark2 }}>
                  {update.key}
                </span>
                <span style={{ color: palette.gray.base }}>
                  {new Date(update.timestamp).toLocaleTimeString()} by {update.agent}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Blackboard Categories */}
      <div style={{
        display: 'grid',
        gap: spacing[3]
      }}>
        {Object.entries(groupedData).map(([category, entries]) => (
          <Card key={category} style={{ padding: spacing[3] }}>
            <H3 style={{
              fontSize: '16px',
              color: palette.gray.dark3,
              margin: `0 0 ${spacing[2]}px 0`,
              textTransform: 'capitalize',
              display: 'flex',
              alignItems: 'center',
              gap: spacing[1]
            }}>
              {category === 'case' && '📋'}
              {category === 'findings' && '🔍'}
              {category === 'consensus' && '🤝'}
              {category === 'rules' && '⚖️'}
              {category === 'patterns' && '🧩'}
              {category === 'system' && '⚙️'}
              {category.replace('_', ' ')} Memory
            </H3>
            
            <div style={{
              display: 'grid',
              gap: spacing[2]
            }}>
              {entries.map(([key, value]) => {
                const isExpanded = expandedItems.has(key);
                const valueType = getValueType(value);
                const typeColor = getTypeColor(valueType);
                
                return (
                  <div 
                    key={key}
                    style={{
                      border: `1px solid ${palette.gray.light2}`,
                      borderRadius: '6px',
                      overflow: 'hidden'
                    }}
                  >
                    <div 
                      onClick={() => toggleExpansion(key)}
                      style={{
                        padding: spacing[2],
                        background: palette.gray.light3,
                        cursor: 'pointer',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: spacing[1]
                      }}>
                        <Badge 
                          variant="lightgray"
                          style={{
                            fontSize: '8px',
                            background: typeColor,
                            color: palette.white
                          }}
                        >
                          {valueType.toUpperCase()}
                        </Badge>
                        <Body style={{
                          fontSize: '12px',
                          fontWeight: 600,
                          color: palette.gray.dark3,
                          margin: 0,
                          fontFamily: 'monospace'
                        }}>
                          {key.split('.').slice(1).join('.')}
                        </Body>
                      </div>
                      <span style={{
                        fontSize: '12px',
                        color: palette.gray.base
                      }}>
                        {isExpanded ? '▼' : '▶'}
                      </span>
                    </div>
                    
                    {isExpanded && (
                      <div style={{ padding: spacing[2] }}>
                        <Code language="json" style={{ fontSize: '11px' }}>
                          {formatValue(value)}
                        </Code>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default SharedBlackboardPanel;