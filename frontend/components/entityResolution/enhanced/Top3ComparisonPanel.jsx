"use client";

import React, { useState } from 'react';
import Card from '@leafygreen-ui/card';
import { H2, H3, Body, Label } from '@leafygreen-ui/typography';
import { Tabs, Tab } from '@leafygreen-ui/tabs';
import Badge from '@leafygreen-ui/badge';
import Icon from '@leafygreen-ui/icon';
import { palette } from '@leafygreen-ui/palette';
import { spacing } from '@leafygreen-ui/tokens';

// Import existing components for reuse
import CytoscapeNetworkComponent from '../../entities/CytoscapeNetworkComponent';
import TransactionNetworkGraph from '../../entities/TransactionNetworkGraph';

/**
 * Top 3 Comparison Panel
 * 
 * Displays side-by-side comparison of the top 3 hybrid search results
 * with their relationship networks, transaction networks, and risk summaries.
 */
function Top3ComparisonPanel({ networkAnalysis }) {
  const [selectedTab, setSelectedTab] = useState(0); // 0: Relationships, 1: Transactions, 2: Risk Summary
  
  if (!networkAnalysis?.entityAnalyses || networkAnalysis.entityAnalyses.length === 0) {
    return (
      <Card style={{ padding: spacing[4] }}>
        <div style={{ textAlign: 'center', color: palette.gray.base }}>
          <Icon glyph="Warning" size={48} style={{ marginBottom: spacing[2] }} />
          <Body>No network analysis data available</Body>
        </div>
      </Card>
    );
  }

  const entityAnalyses = networkAnalysis.entityAnalyses;

  /**
   * Get risk badge variant based on score
   */
  const getRiskBadgeVariant = (riskScore) => {
    if (riskScore >= 80) return 'red';
    if (riskScore >= 60) return 'yellow';  
    if (riskScore >= 40) return 'lightgray';
    return 'green';
  };

  /**
   * Render entity header with basic info and hybrid search details
   */
  const renderEntityHeader = (entityAnalysis) => (
    <div style={{ marginBottom: spacing[3] }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: spacing[2]
      }}>
        <div>
          <H3 style={{ margin: 0, fontSize: '16px' }}>
            #{entityAnalysis.entityRank} {entityAnalysis.entityName}
          </H3>
          <Body style={{ fontSize: '12px', color: palette.gray.dark1, fontFamily: 'monospace' }}>
            {entityAnalysis.entityId}
          </Body>
        </div>
        <Badge variant="blue" style={{ fontSize: '12px' }}>
          Score: {entityAnalysis.hybridScore?.toFixed(4)}
        </Badge>
      </div>
      
      {/* Search contribution breakdown */}
      <div style={{ display: 'flex', gap: spacing[2], marginBottom: spacing[2] }}>
        <Badge variant={null} style={{ 
          backgroundColor: '#00593F20', 
          color: '#00593F',
          fontSize: '11px'
        }}>
          Text: {entityAnalysis.textContribution?.toFixed(1)}%
        </Badge>
        <Badge variant={null} style={{ 
          backgroundColor: '#016BF820', 
          color: '#016BF8',
          fontSize: '11px'
        }}>
          Vector: {entityAnalysis.vectorContribution?.toFixed(1)}%
        </Badge>
      </div>

      {/* Overall risk level */}
      <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2] }}>
        <Label style={{ fontSize: '12px' }}>Risk Level:</Label>
        <Badge variant={getRiskBadgeVariant(entityAnalysis.overallRiskScore)}>
          {entityAnalysis.riskLevel?.toUpperCase()} ({entityAnalysis.overallRiskScore}/100)
        </Badge>
      </div>
    </div>
  );

  /**
   * Render relationship network tab content
   */
  const renderRelationshipNetworks = () => (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${entityAnalyses.length}, 1fr)`, gap: spacing[4] }}>
      {entityAnalyses.map((entityAnalysis, index) => (
        <Card key={index} style={{ padding: spacing[3] }}>
          {renderEntityHeader(entityAnalysis)}
          
          {/* Network Visualization */}
          <div style={{ marginBottom: spacing[3] }}>
            <Label style={{ fontSize: '12px', marginBottom: spacing[2] }}>
              Relationship Network (Depth 2)
            </Label>
            <div style={{ 
              height: '400px', 
              width: '100%',
              overflow: 'hidden',
              border: '1px solid #E5E7EB',
              borderRadius: '8px'
            }}>
              <CytoscapeNetworkComponent
                networkData={entityAnalysis.relationshipNetwork}
                centerNodeId={entityAnalysis.entityId}
                layout="forceDirected"
                showControls={false}
                showLegend={false}
                showStatistics={false}
                style={{ 
                  height: '100%', 
                  width: '100%',
                  maxHeight: '400px',
                  maxWidth: '100%'
                }}
              />
            </div>
          </div>
          
          {/* Network Statistics */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[1] }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <Body style={{ fontSize: '11px', color: palette.gray.dark1 }}>Total Nodes:</Body>
              <Body style={{ fontSize: '11px', fontWeight: '600' }}>
                {entityAnalysis.relationshipNetwork?.nodes?.length || 0}
              </Body>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <Body style={{ fontSize: '11px', color: palette.gray.dark1 }}>Total Edges:</Body>
              <Body style={{ fontSize: '11px', fontWeight: '600' }}>
                {entityAnalysis.relationshipNetwork?.edges?.length || 0}
              </Body>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <Body style={{ fontSize: '11px', color: palette.gray.dark1 }}>Network Risk:</Body>
              <Badge variant={getRiskBadgeVariant(entityAnalysis.networkRiskScore)}>
                {entityAnalysis.networkRiskScore}/100
              </Badge>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );

  /**
   * Render transaction networks tab content  
   */
  const renderTransactionNetworks = () => (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${entityAnalyses.length}, 1fr)`, gap: spacing[4] }}>
      {entityAnalyses.map((entityAnalysis, index) => (
        <Card key={index} style={{ padding: spacing[3] }}>
          {renderEntityHeader(entityAnalysis)}
          
          {/* Transaction Network Visualization */}
          <div style={{ marginBottom: spacing[3] }}>
            <Label style={{ fontSize: '12px', marginBottom: spacing[2] }}>
              Transaction Network (Depth 1)
            </Label>
            <div style={{ 
              height: '400px', 
              width: '100%',
              overflow: 'hidden',
              border: '1px solid #E5E7EB',
              borderRadius: '8px'
            }}>
              <TransactionNetworkGraph 
                entityId={entityAnalysis.entityId}
                onError={(error) => console.error('Transaction network error:', error)}
              />
            </div>
          </div>
          
          {/* Transaction Statistics */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[1] }}>
            {/* Removed transaction statistics - keeping only the network visualization */}
          </div>
        </Card>
      ))}
    </div>
  );

  /**
   * Render risk summary comparison
   */
  const renderRiskSummary = () => (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${entityAnalyses.length}, 1fr)`, gap: spacing[4] }}>
      {entityAnalyses.map((entityAnalysis, index) => (
        <Card key={index} style={{ padding: spacing[3] }}>
          {renderEntityHeader(entityAnalysis)}
          
          {/* Risk Breakdown */}
          <div style={{ marginBottom: spacing[3] }}>
            <Label style={{ fontSize: '12px', marginBottom: spacing[2] }}>Risk Analysis Breakdown</Label>
            
            {/* Overall Risk */}
            <div style={{ 
              padding: spacing[3],
              backgroundColor: palette.gray.light3,
              borderRadius: '8px',
              marginBottom: spacing[2]
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing[2] }}>
                <Body style={{ fontSize: '14px', fontWeight: '600' }}>Overall Risk Score</Body>
                <div style={{ 
                  fontSize: '24px', 
                  fontWeight: 'bold', 
                  color: getRiskBadgeVariant(entityAnalysis.overallRiskScore) === 'red' ? palette.red.base :
                         getRiskBadgeVariant(entityAnalysis.overallRiskScore) === 'yellow' ? palette.yellow.base :
                         getRiskBadgeVariant(entityAnalysis.overallRiskScore) === 'lightgray' ? palette.gray.base : palette.green.base
                }}>
                  {entityAnalysis.overallRiskScore}
                </div>
              </div>
              <Badge variant={getRiskBadgeVariant(entityAnalysis.overallRiskScore)}>
                {entityAnalysis.riskLevel?.toUpperCase()} RISK
              </Badge>
            </div>

            {/* Component Risk Breakdown */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[2] }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Body style={{ fontSize: '11px', color: palette.gray.dark1 }}>Base Entity Risk:</Body>
                <Body style={{ fontSize: '11px', fontWeight: '600' }}>
                  {entityAnalysis.riskAnalysis?.riskAnalysis?.baseEntityRisk || entityAnalysis.overallRiskScore}/100
                </Body>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Body style={{ fontSize: '11px', color: palette.gray.dark1 }}>Network Risk:</Body>
                <Body style={{ fontSize: '11px', fontWeight: '600' }}>
                  {entityAnalysis.networkRiskScore}/100
                </Body>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Body style={{ fontSize: '11px', color: palette.gray.dark1 }}>Transaction Risk:</Body>
                <Body style={{ fontSize: '11px', fontWeight: '600' }}>
                  {entityAnalysis.transactionRiskScore}/100
                </Body>
              </div>
            </div>
          </div>

          {/* Key Insights */}
          {entityAnalysis.riskAnalysis?.riskAnalysis?.keyInsights && (
            <div>
              <Label style={{ fontSize: '12px', marginBottom: spacing[2] }}>Key Risk Insights</Label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[1] }}>
                {entityAnalysis.riskAnalysis.riskAnalysis.keyInsights.slice(0, 3).map((insight, idx) => (
                  <div key={idx} style={{ 
                    padding: spacing[2], 
                    backgroundColor: palette.yellow.light3,
                    borderRadius: '4px'
                  }}>
                    <Body style={{ fontSize: '11px', color: palette.yellow.dark2 }}>
                      {insight}
                    </Body>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      ))}
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[4] }}>
      {/* Header */}
      <Card style={{ padding: spacing[4], backgroundColor: palette.blue.light3 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: spacing[3] }}>
          <Icon glyph="Diagram3" size={32} style={{ color: palette.blue.base }} />
          <div>
            <H2 style={{ margin: 0, color: palette.blue.dark2 }}>
              Top 3 Entity Comparison Analysis
            </H2>
            <Body style={{ color: palette.blue.dark1, marginTop: spacing[1] }}>
              Comprehensive network and risk analysis of the top {entityAnalyses.length} hybrid search matches
            </Body>
          </div>
        </div>
      </Card>

      {/* Tabs for different views */}
      <Card style={{ padding: spacing[4] }}>
        <Tabs selected={selectedTab} setSelected={setSelectedTab}>
          <Tab name="Relationship Networks">
            <div style={{ marginTop: spacing[3] }}>
              {renderRelationshipNetworks()}
            </div>
          </Tab>
          
          <Tab name="Transaction Networks">
            <div style={{ marginTop: spacing[3] }}>
              {renderTransactionNetworks()}
            </div>
          </Tab>
          
          <Tab name="Risk Summary">
            <div style={{ marginTop: spacing[3] }}>
              {renderRiskSummary()}
            </div>
          </Tab>
        </Tabs>
      </Card>
    </div>
  );
}

export default Top3ComparisonPanel;