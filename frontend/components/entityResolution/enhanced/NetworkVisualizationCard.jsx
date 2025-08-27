"use client";

import React, { useState } from 'react';
import Card from '@leafygreen-ui/card';
import Button from '@leafygreen-ui/button';
import { H3, Body } from '@leafygreen-ui/typography';
import Icon from '@leafygreen-ui/icon';
import Badge from '@leafygreen-ui/badge';
import { Tabs, Tab } from '@leafygreen-ui/tabs';
import { palette } from '@leafygreen-ui/palette';
import { spacing } from '@leafygreen-ui/tokens';

// Import the enhanced Cytoscape component
import CytoscapeNetworkComponent from '@/components/entities/CytoscapeNetworkComponent';

/**
 * Network Visualization Card
 * 
 * Displays network analysis results using Cytoscape visualization
 * with enhanced controls and network statistics for entity resolution.
 */
function NetworkVisualizationCard({ 
  networkData, 
  centerEntityId,
  networkStatistics,
  riskPropagation,
  centralityMetrics 
}) {
  const [selectedTab, setSelectedTab] = useState(0); // 0: Visualization, 1: Statistics, 2: Risk Analysis

  if (!networkData || !networkData.nodes || networkData.nodes.length === 0) {
    return (
      <Card style={{ padding: spacing[4] }}>
        <div style={{ 
          textAlign: 'center', 
          padding: spacing[5],
          color: palette.gray.base
        }}>
          <Icon glyph="Diagram3" size={64} style={{ marginBottom: spacing[3] }} />
          <H3 style={{ color: palette.gray.dark1 }}>No Network Data</H3>
          <Body>Network analysis results will appear here once processing is complete.</Body>
        </div>
      </Card>
    );
  }

  /**
   * Render network statistics
   */
  const renderNetworkStatistics = () => {
    const stats = networkStatistics || {};
    // Access the statistics from the correct nested structure
    const networkStats = networkData?.statistics || {};
    
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[4] }}>
        
        {/* Basic Network Metrics */}
        <Card style={{ padding: spacing[3], backgroundColor: palette.blue.light3 }}>
          <H3 style={{ marginBottom: spacing[3], fontSize: '14px' }}>Network Overview</H3>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', 
            gap: spacing[3]
          }}>
            <div style={{ textAlign: 'center' }}>
              <Body weight="medium" style={{ fontSize: '18px' }}>
                {networkData.nodes.length}
              </Body>
              <Body style={{ fontSize: '12px', color: palette.gray.dark1 }}>
                Total Nodes
              </Body>
            </div>
            <div style={{ textAlign: 'center' }}>
              <Body weight="medium" style={{ fontSize: '18px' }}>
                {networkData.edges.length}
              </Body>
              <Body style={{ fontSize: '12px', color: palette.gray.dark1 }}>
                Relationships
              </Body>
            </div>
            <div style={{ textAlign: 'center' }}>
              <Body weight="medium" style={{ fontSize: '18px' }}>
                {networkStats.network_density ? (networkStats.network_density * 100).toFixed(1) : 'N/A'}%
              </Body>
              <Body style={{ fontSize: '12px', color: palette.gray.dark1 }}>
                Density
              </Body>
            </div>
            <div style={{ textAlign: 'center' }}>
              <Body weight="medium" style={{ fontSize: '18px' }}>
                {networkStats.basic_metrics?.avg_risk_score ? networkStats.basic_metrics.avg_risk_score.toFixed(1) : 'N/A'}
              </Body>
              <Body style={{ fontSize: '12px', color: palette.gray.dark1 }}>
                Avg Risk
              </Body>
            </div>
          </div>
        </Card>

        {/* Risk Distribution */}
        {stats.riskDistribution && (
          <Card style={{ padding: spacing[3] }}>
            <H3 style={{ marginBottom: spacing[3], fontSize: '14px' }}>Risk Distribution</H3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[2] }}>
              {Object.entries(stats.riskDistribution).map(([level, count]) => (
                <div key={level} style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  padding: spacing[2],
                  backgroundColor: level === 'high' ? palette.red.light3 : 
                                 level === 'medium' ? palette.yellow.light3 : 
                                 level === 'low' ? palette.green.light3 : palette.gray.light3,
                  borderRadius: '6px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2] }}>
                    <div style={{
                      width: '12px',
                      height: '12px',
                      borderRadius: '50%',
                      backgroundColor: level === 'high' ? palette.red.base : 
                                     level === 'medium' ? palette.yellow.base : 
                                     level === 'low' ? palette.green.base : palette.gray.base
                    }} />
                    <Body style={{ textTransform: 'capitalize', fontSize: '13px' }}>{level} Risk</Body>
                  </div>
                  <Badge variant={level === 'high' ? 'red' : level === 'medium' ? 'yellow' : 'green'}>
                    {count}
                  </Badge>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Entity Type Distribution */}
        {stats.entityTypeDistribution && (
          <Card style={{ padding: spacing[3] }}>
            <H3 style={{ marginBottom: spacing[3], fontSize: '14px' }}>Entity Types</H3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[2] }}>
              {Object.entries(stats.entityTypeDistribution).map(([type, count]) => (
                <div key={type} style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  padding: spacing[2],
                  border: `1px solid ${palette.gray.light2}`,
                  borderRadius: '6px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2] }}>
                    <Icon 
                      glyph={type === 'individual' ? 'Person' : 'Building'} 
                      style={{ color: type === 'individual' ? palette.blue.base : palette.purple.base }}
                      size={16}
                    />
                    <Body style={{ textTransform: 'capitalize', fontSize: '13px' }}>{type}</Body>
                  </div>
                  <Body weight="medium">{count}</Body>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    );
  };

  /**
   * Render risk analysis
   */
  const renderRiskAnalysis = () => {
    const risks = riskPropagation || {};
    const centrality = centralityMetrics || {};
    
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[4] }}>
        
        {/* Risk Propagation Summary */}
        <Card style={{ padding: spacing[3], backgroundColor: palette.red.light3 }}>
          <H3 style={{ marginBottom: spacing[3], fontSize: '14px' }}>
            <Icon glyph="Warning" style={{ color: palette.red.base, marginRight: spacing[1] }} />
            Risk Propagation Analysis
          </H3>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', 
            gap: spacing[3]
          }}>
            <div style={{ textAlign: 'center' }}>
              <Body weight="medium" style={{ fontSize: '16px' }}>
                {risks.networkRiskScore || 'N/A'}
              </Body>
              <Body style={{ fontSize: '12px', color: palette.gray.dark1 }}>
                Network Risk Score
              </Body>
            </div>
            <div style={{ textAlign: 'center' }}>
              <Body weight="medium" style={{ fontSize: '16px' }}>
                {risks.highRiskConnections || 0}
              </Body>
              <Body style={{ fontSize: '12px', color: palette.gray.dark1 }}>
                High Risk Connections
              </Body>
            </div>
            <div style={{ textAlign: 'center' }}>
              <Body weight="medium" style={{ fontSize: '16px' }}>
                {risks.riskClusters?.length || 0}
              </Body>
              <Body style={{ fontSize: '12px', color: palette.gray.dark1 }}>
                Risk Clusters
              </Body>
            </div>
          </div>
        </Card>

        {/* Centrality Metrics */}
        {centrality && Object.keys(centrality).length > 0 && (
          <Card style={{ padding: spacing[3] }}>
            <H3 style={{ marginBottom: spacing[3], fontSize: '14px' }}>
              <Icon glyph="Diagram3" style={{ color: palette.blue.base, marginRight: spacing[1] }} />
              Network Centrality Analysis
            </H3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[2] }}>
              
              {/* Show actual centrality metrics if available */}
              {centrality.centrality_metrics && Object.keys(centrality.centrality_metrics).length > 0 && (
                <div>
                  <Body style={{ fontSize: '12px', fontWeight: '600', marginBottom: spacing[2] }}>
                    Entity Centrality Scores
                  </Body>
                  {Object.entries(centrality.centrality_metrics).map(([entityId, metrics]) => (
                    <div key={entityId} style={{ marginBottom: spacing[2] }}>
                      <Body style={{ fontSize: '11px', color: palette.gray.dark1, marginBottom: spacing[1] }}>
                        {entityId}
                      </Body>
                      {Object.entries(metrics).map(([metricName, metricValue]) => (
                        <div key={metricName} style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'center',
                          padding: spacing[1],
                          backgroundColor: palette.blue.light3,
                          borderRadius: '4px',
                          marginBottom: spacing[1]
                        }}>
                          <Body style={{ fontSize: '11px' }}>
                            {metricName.replace(/_/g, ' ').replace(/([A-Z])/g, ' $1').trim()}
                          </Body>
                          <Body weight="medium" style={{ fontSize: '11px' }}>
                            {typeof metricValue === 'number' ? metricValue.toFixed(3) : String(metricValue)}
                          </Body>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
              
              {/* Show key entities */}
              {centrality.key_entities && centrality.key_entities.length > 0 && (
                <div>
                  <Body style={{ fontSize: '12px', fontWeight: '600', marginBottom: spacing[1] }}>
                    Key Network Entities: {centrality.key_entities.length}
                  </Body>
                  {centrality.key_entities.slice(0, 3).map((entity, idx) => (
                    <div key={idx} style={{ 
                      padding: spacing[1],
                      backgroundColor: palette.yellow.light3,
                      borderRadius: '4px',
                      marginBottom: spacing[1]
                    }}>
                      <Body style={{ fontSize: '11px' }}>
                        {entity.entity_id} (Score: {entity.importance_score?.toFixed(3) || 'N/A'})
                      </Body>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Show insights */}
              {centrality.insights && centrality.insights.length > 0 && (
                <div>
                  <Body style={{ fontSize: '12px', fontWeight: '600', marginBottom: spacing[1] }}>
                    Network Insights
                  </Body>
                  {centrality.insights.map((insight, idx) => (
                    <div key={idx} style={{ 
                      padding: spacing[2],
                      backgroundColor: palette.green.light3,
                      borderRadius: '4px',
                      marginBottom: spacing[1]
                    }}>
                      <Body style={{ fontSize: '11px' }}>
                        {insight}
                      </Body>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Show total entities analyzed */}
              {centrality.total_entities && (
                <div style={{ 
                  padding: spacing[2],
                  backgroundColor: palette.gray.light3,
                  borderRadius: '4px',
                  textAlign: 'center'
                }}>
                  <Body style={{ fontSize: '11px', color: palette.gray.dark1 }}>
                    Analyzed {centrality.total_entities} entities in network
                  </Body>
                </div>
              )}
              
            </div>
          </Card>
        )}

        {/* Risk Clusters */}
        {risks.riskClusters && risks.riskClusters.length > 0 && (
          <Card style={{ padding: spacing[3] }}>
            <H3 style={{ marginBottom: spacing[3], fontSize: '14px' }}>
              <Icon glyph="Folder" style={{ color: palette.yellow.base, marginRight: spacing[1] }} />
              Identified Risk Clusters
            </H3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[2] }}>
              {risks.riskClusters.map((cluster, index) => (
                <Card key={index} style={{ 
                  padding: spacing[2], 
                  border: `1px solid ${palette.yellow.light1}`,
                  backgroundColor: palette.yellow.light3
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                    <div>
                      <Body weight="medium" style={{ fontSize: '12px' }}>
                        Cluster {index + 1}
                      </Body>
                      <Body style={{ fontSize: '11px', color: palette.gray.dark1 }}>
                        {cluster.entities?.length || 0} entities, Risk: {cluster.avgRiskScore || 'N/A'}
                      </Body>
                    </div>
                    <Badge variant="yellow">
                      {cluster.riskLevel || 'Medium'}
                    </Badge>
                  </div>
                  {cluster.description && (
                    <Body style={{ fontSize: '11px', marginTop: spacing[1], lineHeight: '1.3' }}>
                      {cluster.description}
                    </Body>
                  )}
                </Card>
              ))}
            </div>
          </Card>
        )}
      </div>
    );
  };

  return (
    <Card style={{ padding: spacing[4] }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: spacing[3]
      }}>
        <H3 style={{ 
          margin: 0,
          display: 'flex',
          alignItems: 'center',
          gap: spacing[2]
        }}>
          <Icon glyph="Diagram3" style={{ color: palette.green.base }} />
          Network Analysis
        </H3>
        
        <Body style={{ fontSize: '12px', color: palette.gray.dark1 }}>
          {networkData.nodes.length} nodes • {networkData.edges.length} relationships
        </Body>
      </div>

      {/* Tab Navigation */}
      <Tabs selected={selectedTab} setSelected={setSelectedTab}>
        <Tab name="Network Visualization">
          <div style={{ marginTop: spacing[3] }}>
            <CytoscapeNetworkComponent
              networkData={networkData}
              centerNodeId={centerEntityId}
              layout="forceDirected"
              showControls={true}
              showLegend={true}
              style={{ height: '600px' }}
            />
            
            {/* Network Insights */}
            <Card style={{ 
              padding: spacing[3], 
              marginTop: spacing[3],
              backgroundColor: palette.green.light3
            }}>
              <Body style={{ fontSize: '12px', color: palette.green.dark2 }}>
                <Icon glyph="InfoWithCircle" style={{ marginRight: spacing[1] }} />
                <strong>Network Visualization:</strong> Interactive graph showing entity relationships and risk propagation. 
                Node size represents importance, colors indicate risk levels, and edge thickness shows relationship strength.
              </Body>
            </Card>
          </div>
        </Tab>
        
        <Tab name="Statistics">
          <div style={{ marginTop: spacing[3] }}>
            {renderNetworkStatistics()}
          </div>
        </Tab>
        
        <Tab name="Risk Analysis">
          <div style={{ marginTop: spacing[3] }}>
            {renderRiskAnalysis()}
          </div>
        </Tab>
      </Tabs>
    </Card>
  );
}

export default NetworkVisualizationCard;