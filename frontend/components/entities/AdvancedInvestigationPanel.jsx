/**
 * AdvancedInvestigationPanel.jsx
 * 
 * Displays comprehensive MongoDB advanced investigation results
 * Combines multiple MongoDB graph analysis operations
 */

"use client";

import React, { useState } from 'react';
import Card from '@leafygreen-ui/card';
import { Body, H3, Label } from '@leafygreen-ui/typography';
import { Tabs, Tab } from '@leafygreen-ui/tabs';
import Icon from '@leafygreen-ui/icon';
import Badge from '@leafygreen-ui/badge';
import Button from '@leafygreen-ui/button';
import Code from '@leafygreen-ui/code';
import { palette } from '@leafygreen-ui/palette';
import { spacing } from '@leafygreen-ui/tokens';

const AdvancedInvestigationPanel = ({ results, centerEntityId, RiskPropagationComponent }) => {
  const [activeTab, setActiveTab] = useState(0);
  const [showRawData, setShowRawData] = useState(false);

  if (!results) return null;

  const {
    entityId,
    investigationScope = 'comprehensive',
    networkData,
    riskAnalysis,
    centralityAnalysis,
    suspiciousPatterns,
    communityAnalysis,
    investigationTimestamp,
    investigationId
  } = results;

  // Enhanced Centrality Analysis Panel
  const CentralityAnalysisPanel = ({ data }) => {
    if (!data || !data.success) {
      return (
        <div style={{ padding: spacing[3], textAlign: 'center' }}>
          <Icon glyph="InformationWithCircle" size={32} fill={palette.gray.light1} />
          <Body style={{ color: palette.gray.dark1, marginTop: spacing[2] }}>
            Centrality analysis data not available
          </Body>
        </div>
      );
    }

    const { centrality_metrics = {}, key_entities = [], insights = [] } = data;

    return (
      <div style={{ padding: spacing[3] }}>
        {/* Analysis Summary */}
        <div style={{ marginBottom: spacing[4] }}>
          <H3 style={{ fontSize: '16px' }}>Network Centrality Analysis</H3>
          <Body style={{ color: palette.gray.dark1, marginBottom: spacing[3] }}>
            Advanced MongoDB centrality analysis measuring entity importance and connectivity patterns
          </Body>
          
          <div style={{ 
            padding: spacing[3],
            backgroundColor: palette.blue.light3,
            borderRadius: '8px',
            border: `1px solid ${palette.blue.light2}`,
            marginBottom: spacing[3]
          }}>
            <Body style={{ fontWeight: 'bold', color: palette.blue.dark2, marginBottom: spacing[2] }}>
              📊 Analysis Summary
            </Body>
            <Body style={{ fontSize: '13px', color: palette.blue.dark1 }}>
              Analyzed {data.total_entities} entities with {key_entities.length} key entities identified
            </Body>
          </div>
        </div>

        {/* Key Insights */}
        {insights.length > 0 && (
          <div style={{ marginBottom: spacing[4] }}>
            <H3 style={{ fontSize: '14px', marginBottom: spacing[2] }}>Key Insights</H3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[2] }}>
              {insights.map((insight, index) => (
                <div key={index} style={{
                  padding: spacing[2],
                  backgroundColor: palette.green.light3,
                  borderRadius: '6px',
                  border: `1px solid ${palette.green.light2}`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: spacing[2]
                }}>
                  <Icon glyph="Lightbulb" size={16} fill={palette.green.base} />
                  <Body style={{ fontSize: '13px', color: palette.green.dark2 }}>
                    {insight}
                  </Body>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Key Entities Analysis */}
        {key_entities.length > 0 && (
          <div style={{ marginBottom: spacing[4] }}>
            <H3 style={{ fontSize: '14px', marginBottom: spacing[2] }}>Key Entities by Importance</H3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[2] }}>
              {key_entities.map((entity, index) => (
                <div key={index} style={{
                  padding: spacing[3],
                  backgroundColor: entity.entity_id === centerEntityId ? palette.blue.light3 : palette.gray.light3,
                  borderRadius: '8px',
                  border: entity.entity_id === centerEntityId ? `2px solid ${palette.blue.base}` : '1px solid #E5E7EB'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing[2] }}>
                    <div>
                      <Body style={{ 
                        fontWeight: 'bold', 
                        fontSize: '14px',
                        color: entity.entity_id === centerEntityId ? palette.blue.dark2 : 'inherit'
                      }}>
                        {entity.entity_id === centerEntityId ? '🎯 ' : `#${index + 1} `}{entity.entity_id}
                      </Body>
                      <Body style={{ fontSize: '12px', color: palette.gray.dark1, marginTop: spacing[1] }}>
                        {entity.key_reason}
                      </Body>
                    </div>
                    <Badge variant={entity.entity_id === centerEntityId ? 'blue' : 'gray'} style={{ fontSize: '11px' }}>
                      Score: {entity.importance_score?.toFixed(2)}
                    </Badge>
                  </div>
                  
                  {/* Detailed Metrics Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: spacing[2] }}>
                    <div style={{ textAlign: 'center', padding: spacing[1] }}>
                      <Body style={{ fontSize: '12px', fontWeight: 'bold' }}>
                        {entity.metrics.degree_centrality}
                      </Body>
                      <Body style={{ fontSize: '10px', color: palette.gray.dark1 }}>Degree</Body>
                    </div>
                    <div style={{ textAlign: 'center', padding: spacing[1] }}>
                      <Body style={{ fontSize: '12px', fontWeight: 'bold' }}>
                        {entity.metrics.betweenness_centrality?.toFixed(1)}
                      </Body>
                      <Body style={{ fontSize: '10px', color: palette.gray.dark1 }}>Betweenness</Body>
                    </div>
                    <div style={{ textAlign: 'center', padding: spacing[1] }}>
                      <Body style={{ fontSize: '12px', fontWeight: 'bold' }}>
                        {entity.metrics.closeness_centrality?.toFixed(2)}
                      </Body>
                      <Body style={{ fontSize: '10px', color: palette.gray.dark1 }}>Closeness</Body>
                    </div>
                    <div style={{ textAlign: 'center', padding: spacing[1] }}>
                      <Body style={{ fontSize: '12px', fontWeight: 'bold' }}>
                        {entity.metrics.eigenvector_centrality?.toFixed(2)}
                      </Body>
                      <Body style={{ fontSize: '10px', color: palette.gray.dark1 }}>Eigenvector</Body>
                    </div>
                  </div>
                  
                  {/* Additional Metrics */}
                  <div style={{ marginTop: spacing[2], paddingTop: spacing[2], borderTop: `1px solid ${palette.gray.light2}` }}>
                    <div style={{ display: 'flex', gap: spacing[2], flexWrap: 'wrap' }}>
                      <Badge variant="lightgray" style={{ fontSize: '10px' }}>
                        Weighted: {entity.metrics.weighted_centrality?.toFixed(2)}
                      </Badge>
                      <Badge variant="yellow" style={{ fontSize: '10px' }}>
                        Risk Weighted: {entity.metrics.risk_weighted_centrality?.toFixed(2)}
                      </Badge>
                      <Badge variant="green" style={{ fontSize: '10px' }}>
                        High Conf: {entity.metrics.high_confidence_connections}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* All Entities Detailed View */}
        {Object.keys(centrality_metrics).length > 0 && (
          <div>
            <H3 style={{ fontSize: '14px', marginBottom: spacing[2] }}>All Entities Centrality Metrics</H3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[2] }}>
              {Object.entries(centrality_metrics).map(([entityId, metrics]) => (
                <div key={entityId} style={{
                  padding: spacing[2],
                  backgroundColor: entityId === centerEntityId ? palette.blue.light3 : palette.gray.light3,
                  borderRadius: '6px',
                  border: entityId === centerEntityId ? `1px solid ${palette.blue.base}` : 'none'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Body style={{ 
                      fontFamily: 'monospace', 
                      fontWeight: entityId === centerEntityId ? 'bold' : 'normal',
                      color: entityId === centerEntityId ? palette.blue.dark2 : 'inherit',
                      fontSize: '13px'
                    }}>
                      {entityId === centerEntityId ? '🎯 ' : ''}{entityId}
                    </Body>
                    <div style={{ display: 'flex', gap: spacing[1], alignItems: 'center', flexWrap: 'wrap' }}>
                      <Badge variant="gray" style={{ fontSize: '9px' }}>
                        D: {metrics.degree_centrality}
                      </Badge>
                      <Badge variant="blue" style={{ fontSize: '9px' }}>
                        B: {metrics.betweenness_centrality?.toFixed(1)}
                      </Badge>
                      <Badge variant="green" style={{ fontSize: '9px' }}>
                        C: {metrics.closeness_centrality?.toFixed(2)}
                      </Badge>
                      <Badge variant="purple" style={{ fontSize: '9px' }}>
                        E: {metrics.eigenvector_centrality?.toFixed(2)}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Suspicious Patterns Panel
  const SuspiciousPatternPanel = ({ data }) => {
    if (!data || !data.success) {
      return (
        <div style={{ padding: spacing[3], textAlign: 'center' }}>
          <Icon glyph="Dashboard" size={32} fill={palette.green.base} />
          <Body style={{ color: palette.gray.dark1, marginTop: spacing[2] }}>
            No suspicious patterns detected
          </Body>
        </div>
      );
    }

    const { suspicious_patterns = [], pattern_summary = {} } = data;

    return (
      <div style={{ padding: spacing[3] }}>
        <H3 style={{ fontSize: '16px' }}>Suspicious Pattern Detection</H3>
        <Body style={{ color: palette.gray.dark1, marginBottom: spacing[3] }}>
          MongoDB-powered analysis of suspicious network patterns and behaviors
        </Body>

        {suspicious_patterns.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[3] }}>
            {suspicious_patterns.map((pattern, index) => (
              <div key={index} style={{
                padding: spacing[3],
                border: `1px solid ${palette.red.light2}`,
                borderRadius: '6px',
                backgroundColor: palette.red.light3
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing[2] }}>
                  <Badge variant="red">
                    {pattern.pattern_type || 'Suspicious Pattern'}
                  </Badge>
                  <Body style={{ fontSize: '12px', fontWeight: 'bold', color: palette.red.dark2 }}>
                    Risk: {((pattern.risk_score || 0) * 100).toFixed(0)}%
                  </Body>
                </div>
                <Body style={{ fontSize: '13px' }}>
                  {pattern.description || 'Suspicious network pattern detected'}
                </Body>
                {pattern.entities && (
                  <div style={{ marginTop: spacing[2] }}>
                    <Label>Involved Entities:</Label>
                    <div style={{ display: 'flex', gap: spacing[1], flexWrap: 'wrap', marginTop: spacing[1] }}>
                      {pattern.entities.slice(0, 5).map((entity, idx) => (
                        <Badge key={idx} variant="lightgray" style={{ fontSize: '10px' }}>
                          {entity}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div style={{ 
            padding: spacing[4],
            textAlign: 'center',
            backgroundColor: palette.green.light3,
            borderRadius: '6px',
            border: `1px solid ${palette.green.light2}`
          }}>
            <Icon glyph="Checkmark" size={24} fill={palette.green.base} />
            <Body style={{ color: palette.green.dark2, marginTop: spacing[1] }}>
              No suspicious patterns detected in the network
            </Body>
          </div>
        )}
      </div>
    );
  };

  // Network Statistics Panel
  const NetworkStatisticsPanel = ({ statistics }) => {
    if (!statistics) {
      return (
        <div style={{ padding: spacing[3], textAlign: 'center' }}>
          <Icon glyph="InformationWithCircle" size={32} fill={palette.gray.light1} />
          <Body style={{ color: palette.gray.dark1, marginTop: spacing[2] }}>
            Network statistics not available
          </Body>
        </div>
      );
    }

    return (
      <div style={{ padding: spacing[3] }}>
        <H3 style={{ fontSize: '16px' }}>Network Statistics</H3>
        <Body style={{ color: palette.gray.dark1, marginBottom: spacing[3] }}>
          Comprehensive MongoDB aggregation analysis of network structure
        </Body>

        {/* Basic Metrics */}
        <div style={{ marginBottom: spacing[4] }}>
          <H3 style={{ fontSize: '14px', marginBottom: spacing[2] }}>Network Overview</H3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: spacing[2] }}>
            <div style={{ padding: spacing[2], backgroundColor: palette.blue.light3, borderRadius: '6px', textAlign: 'center' }}>
              <Body style={{ fontWeight: 'bold' }}>{statistics.basic_metrics?.total_nodes || 0}</Body>
              <Body style={{ fontSize: '12px', color: palette.blue.dark2 }}>Entities</Body>
            </div>
            <div style={{ padding: spacing[2], backgroundColor: palette.green.light3, borderRadius: '6px', textAlign: 'center' }}>
              <Body style={{ fontWeight: 'bold' }}>{statistics.basic_metrics?.total_edges || 0}</Body>
              <Body style={{ fontSize: '12px', color: palette.green.dark2 }}>Relationships</Body>
            </div>
            <div style={{ padding: spacing[2], backgroundColor: palette.purple.light3, borderRadius: '6px', textAlign: 'center' }}>
              <Body style={{ fontWeight: 'bold' }}>{(statistics.network_density * 100).toFixed(1)}%</Body>
              <Body style={{ fontSize: '12px', color: palette.purple.dark2 }}>Density</Body>
            </div>
            <div style={{ padding: spacing[2], backgroundColor: palette.yellow.light3, borderRadius: '6px', textAlign: 'center' }}>
              <Body style={{ fontWeight: 'bold' }}>{statistics.avg_connections?.toFixed(1) || 0}</Body>
              <Body style={{ fontSize: '12px', color: palette.yellow.dark2 }}>Avg Connections</Body>
            </div>
          </div>
        </div>

        {/* Risk Score Metrics */}
        {statistics.basic_metrics && (
          <div style={{ marginBottom: spacing[4] }}>
            <H3 style={{ fontSize: '14px', marginBottom: spacing[2] }}>Risk Score Analysis</H3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: spacing[2] }}>
              <div style={{ padding: spacing[2], backgroundColor: palette.gray.light3, borderRadius: '6px', textAlign: 'center' }}>
                <Body style={{ fontWeight: 'bold' }}>{statistics.basic_metrics.avg_risk_score?.toFixed(1) || 0}</Body>
                <Body style={{ fontSize: '12px', color: palette.gray.dark2 }}>Avg Risk</Body>
              </div>
              <div style={{ padding: spacing[2], backgroundColor: palette.red.light3, borderRadius: '6px', textAlign: 'center' }}>
                <Body style={{ fontWeight: 'bold' }}>{statistics.basic_metrics.max_risk_score || 0}</Body>
                <Body style={{ fontSize: '12px', color: palette.red.dark2 }}>Max Risk</Body>
              </div>
              <div style={{ padding: spacing[2], backgroundColor: palette.green.light3, borderRadius: '6px', textAlign: 'center' }}>
                <Body style={{ fontWeight: 'bold' }}>{statistics.basic_metrics.min_risk_score || 0}</Body>
                <Body style={{ fontSize: '12px', color: palette.green.dark2 }}>Min Risk</Body>
              </div>
            </div>
          </div>
        )}

        {/* Relationship Distribution */}
        {statistics.relationship_distribution && statistics.relationship_distribution.length > 0 && (
          <div style={{ marginBottom: spacing[4] }}>
            <H3 style={{ fontSize: '14px', marginBottom: spacing[2] }}>Relationship Types Analysis</H3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[2] }}>
              {statistics.relationship_distribution.slice(0, 6).map((rel, index) => (
                <div key={index} style={{
                  padding: spacing[2],
                  backgroundColor: palette.gray.light3,
                  borderRadius: '6px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div>
                    <Body style={{ fontWeight: 'bold', fontSize: '13px' }}>
                      {rel.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </Body>
                    <Body style={{ fontSize: '11px', color: palette.gray.dark1 }}>
                      {rel.verified_count}/{rel.count} verified • {rel.bidirectional_count} bidirectional
                    </Body>
                  </div>
                  <div style={{ display: 'flex', gap: spacing[1], alignItems: 'center' }}>
                    <Badge variant="gray" style={{ fontSize: '10px' }}>
                      {rel.count} total
                    </Badge>
                    <Badge variant="blue" style={{ fontSize: '10px' }}>
                      {(rel.avg_confidence * 100).toFixed(0)}% conf
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Prominent Entities */}
        {statistics.prominent_entities && statistics.prominent_entities.length > 0 && (
          <div style={{ marginBottom: spacing[4] }}>
            <H3 style={{ fontSize: '14px', marginBottom: spacing[2] }}>Most Prominent Entities</H3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[2] }}>
              {statistics.prominent_entities.slice(0, 5).map((entity, index) => (
                <div key={index} style={{
                  padding: spacing[2],
                  backgroundColor: entity.entityId === centerEntityId ? palette.blue.light3 : palette.gray.light3,
                  borderRadius: '6px',
                  border: entity.entityId === centerEntityId ? `1px solid ${palette.blue.base}` : 'none'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <Body style={{ 
                        fontWeight: 'bold', 
                        fontSize: '13px',
                        color: entity.entityId === centerEntityId ? palette.blue.dark2 : 'inherit'
                      }}>
                        {entity.entityId === centerEntityId ? '🎯 ' : ''}{entity.name?.full || entity.entityId}
                      </Body>
                      <Body style={{ fontSize: '11px', color: palette.gray.dark1 }}>
                        {entity.entityId}
                      </Body>
                    </div>
                    <div style={{ display: 'flex', gap: spacing[1], alignItems: 'center' }}>
                      <Body style={{ fontSize: '11px', fontWeight: 'bold' }}>
                        Risk: {entity.risk_score}
                      </Body>
                      <Body style={{ fontSize: '11px' }}>
                        Score: {(entity.prominence_score * 100).toFixed(1)}
                      </Body>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Entity Type Distribution */}
        {statistics.entity_type_distribution && (
          <div style={{ marginBottom: spacing[4] }}>
            <H3 style={{ fontSize: '14px', marginBottom: spacing[2] }}>Entity Types</H3>
            <div style={{ display: 'flex', gap: spacing[2], flexWrap: 'wrap' }}>
              {Object.entries(statistics.entity_type_distribution).map(([type, count]) => (
                <Badge key={type} variant="lightgray" style={{ fontSize: '11px' }}>
                  {type.replace('_', ' ')}: {count}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Risk Distribution */}
        {statistics.risk_distribution && (
          <div style={{ marginBottom: spacing[4] }}>
            <H3 style={{ fontSize: '14px', marginBottom: spacing[2] }}>Risk Distribution</H3>
            <div style={{ display: 'flex', gap: spacing[2], flexWrap: 'wrap' }}>
              {Object.entries(statistics.risk_distribution).map(([level, count]) => {
                const variant = level === 'high' ? 'red' : level === 'medium' ? 'yellow' : 'green';
                return (
                  <Badge key={level} variant={variant} style={{ fontSize: '11px' }}>
                    {level}: {count}
                  </Badge>
                );
              })}
            </div>
          </div>
        )}

        {/* Hub Entities */}
        {statistics.hub_entities && statistics.hub_entities.length > 0 && (
          <div style={{ marginBottom: spacing[4] }}>
            <H3 style={{ fontSize: '14px', marginBottom: spacing[2] }}>Hub Entities</H3>
            <div style={{ display: 'flex', gap: spacing[2], flexWrap: 'wrap' }}>
              {statistics.hub_entities.slice(0, 8).map((hub, index) => (
                <Badge key={index} variant="blue" style={{ fontSize: '11px' }}>
                  🔗 {hub.entity_id || hub}: {hub.connection_count || '?'} connections
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Bridge Entities */}
        {statistics.bridge_entities && statistics.bridge_entities.length > 0 && (
          <div>
            <H3 style={{ fontSize: '14px', marginBottom: spacing[2] }}>Bridge Entities</H3>
            <div style={{ display: 'flex', gap: spacing[2], flexWrap: 'wrap' }}>
              {statistics.bridge_entities.slice(0, 8).map((bridge, index) => (
                <Badge key={index} variant="purple" style={{ fontSize: '11px' }}>
                  ◆ {bridge.entity_id || bridge}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Investigation Summary Panel
  const InvestigationSummaryPanel = () => (
    <div style={{ padding: spacing[3] }}>
      <H3 style={{ fontSize: '16px' }}>Investigation Summary</H3>
      <Body style={{ color: palette.gray.dark1, marginBottom: spacing[3] }}>
        Comprehensive MongoDB graph analysis results
      </Body>

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
        gap: spacing[3],
        marginBottom: spacing[4]
      }}>
        <div style={{ 
          padding: spacing[3], 
          backgroundColor: palette.blue.light3, 
          borderRadius: '6px',
          textAlign: 'center'
        }}>
          <Icon glyph="Diagram3" size={24} fill={palette.blue.base} />
          <Body style={{ fontWeight: 'bold', marginTop: spacing[1] }}>
            Network Analysis
          </Body>
          <Body style={{ fontSize: '12px', color: palette.blue.dark2 }}>
            {networkData?.nodes?.length || 0} entities, {networkData?.edges?.length || 0} relationships
          </Body>
        </div>

        <div style={{ 
          padding: spacing[3], 
          backgroundColor: palette.green.light3, 
          borderRadius: '6px',
          textAlign: 'center'
        }}>
          <Icon glyph="Charts" size={24} fill={palette.green.base} />
          <Body style={{ fontWeight: 'bold', marginTop: spacing[1] }}>
            Centrality Analysis
          </Body>
          <Body style={{ fontSize: '12px', color: palette.green.dark2 }}>
            {centralityAnalysis?.success ? 'Completed' : 'Not Available'}
          </Body>
        </div>

        <div style={{ 
          padding: spacing[3], 
          backgroundColor: palette.yellow.light3, 
          borderRadius: '6px',
          textAlign: 'center'
        }}>
          <Icon glyph="BarChart" size={24} fill={palette.yellow.base} />
          <Body style={{ fontWeight: 'bold', marginTop: spacing[1] }}>
            Network Statistics
          </Body>
          <Body style={{ fontSize: '12px', color: palette.yellow.dark2 }}>
            {networkData?.statistics ? 'Available' : 'Not Available'}
          </Body>
        </div>
      </div>

      <div style={{ 
        padding: spacing[3],
        backgroundColor: palette.gray.light3,
        borderRadius: '6px',
        border: `1px solid ${palette.gray.light2}`
      }}>
        <Body style={{ fontSize: '12px', color: palette.gray.dark2 }}>
          <strong>Investigation ID:</strong> {investigationId} <br />
          <strong>Scope:</strong> {investigationScope} <br />
          <strong>Timestamp:</strong> {new Date(investigationTimestamp).toLocaleString()} <br />
          <strong>MongoDB Operations:</strong> Multiple $graphLookup and aggregation pipeline operations
        </Body>
      </div>
    </div>
  );

  return (
    <Card style={{ marginTop: spacing[4] }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        padding: `${spacing[3]} ${spacing[4]} 0 ${spacing[4]}`
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2] }}>
          <Icon glyph="Beaker" fill={palette.blue.base} />
          <H3 style={{ margin: 0 }}>Advanced Investigation Results</H3>
          <Badge variant="blue" style={{ fontSize: '10px' }}>
            {investigationScope}
          </Badge>
        </div>
        <Button
          variant="default"
          size="xsmall"
          leftGlyph={<Icon glyph="Code" />}
          onClick={() => setShowRawData(!showRawData)}
        >
          {showRawData ? 'Hide' : 'Show'} Raw Data
        </Button>
      </div>

      <Tabs selected={activeTab} setSelected={setActiveTab}>
        <Tab name="Summary">
          <InvestigationSummaryPanel />
        </Tab>
        
        <Tab name="Network Statistics">
          <NetworkStatisticsPanel statistics={networkData?.statistics} />
        </Tab>
        
        <Tab name="Centrality Analysis">
          <CentralityAnalysisPanel data={centralityAnalysis} />
        </Tab>
      </Tabs>

      {/* Raw Data Display */}
      {showRawData && (
        <div style={{ margin: spacing[4], marginTop: spacing[3] }}>
          <H3 style={{ fontSize: '16px' }}>Raw Investigation Data</H3>
          <Code language="json" copyable={true}>
            {JSON.stringify(results, null, 2)}
          </Code>
        </div>
      )}
    </Card>
  );
};

export default AdvancedInvestigationPanel;