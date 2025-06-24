/**
 * RiskPropagationPanel.jsx
 * 
 * Displays MongoDB-powered risk propagation analysis results
 * Shows risk flow paths through network relationships
 */

"use client";

import React from 'react';
import Card from '@leafygreen-ui/card';
import { Body, H3, Label } from '@leafygreen-ui/typography';
import Icon from '@leafygreen-ui/icon';
import Badge from '@leafygreen-ui/badge';
import { palette } from '@leafygreen-ui/palette';
import { spacing } from '@leafygreen-ui/tokens';

const RiskPropagationPanel = ({ data, centerEntityId }) => {
  if (!data) return null;

  // Extract risk propagation results - handle nested response structure
  const responseData = data?.risk_analysis || data;
  
  const {
    success = data?.success || false,
    network_risk_score = responseData?.network_risk_score || 0,
    risk_classification = responseData?.risk_level || 'unknown',
    propagation_paths = responseData?.propagation_paths || [],
    risk_scores = responseData?.risk_scores || {},
    analysis_depth = responseData?.analysis_depth || 0,
    total_entities_analyzed = responseData?.total_connections || 0,
    base_risk_score = responseData?.base_risk_score || 0,
    connection_risk_factor = responseData?.connection_risk_factor || 0,
    high_risk_connections = responseData?.high_risk_connections || 0,
    total_connections = responseData?.total_connections || 0
  } = responseData;

  if (!success) {
    return (
      <Card style={{ padding: spacing[4], marginTop: spacing[3] }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2], marginBottom: spacing[3] }}>
          <Icon glyph="Warning" fill={palette.yellow.base} />
          <H3 style={{ margin: 0 }}>Risk Propagation Analysis</H3>
        </div>
        <Body style={{ color: palette.gray.dark1 }}>
          Risk propagation analysis could not be completed. This may be due to insufficient network data or analysis constraints.
        </Body>
      </Card>
    );
  }

  // Get risk level color
  const getRiskLevelColor = (classification) => {
    switch (classification?.toLowerCase()) {
      case 'critical': return palette.red.dark2;
      case 'high': return palette.red.base;
      case 'medium': return palette.yellow.base;
      case 'low': return palette.green.base;
      default: return palette.gray.base;
    }
  };

  // Get risk level variant for Badge
  const getRiskLevelVariant = (classification) => {
    switch (classification?.toLowerCase()) {
      case 'critical':
      case 'high': return 'red';
      case 'medium': return 'yellow';
      case 'low': return 'green';
      default: return 'lightgray';
    }
  };

  // Note: Risk propagation paths not implemented in backend yet
  // Will be available in future versions for detailed path analysis

  return (
    <Card style={{ padding: spacing[4], marginTop: spacing[3] }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2], marginBottom: spacing[3] }}>
        <Icon glyph="Diagram3" fill={palette.blue.base} />
        <H3 style={{ margin: 0 }}>Risk Propagation Analysis</H3>
        <Badge variant="blue" style={{ fontSize: '10px' }}>
          MongoDB $graphLookup
        </Badge>
      </div>

      {/* Analysis Summary */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', 
        gap: spacing[3],
        marginBottom: spacing[4],
        padding: spacing[3],
        backgroundColor: palette.gray.light3,
        borderRadius: '8px'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ 
            fontSize: '24px', 
            fontWeight: 'bold', 
            color: getRiskLevelColor(risk_classification),
            marginBottom: spacing[1]
          }}>
            {network_risk_score.toFixed(1)}
          </div>
          <Label>Network Risk Score</Label>
          <div style={{ marginTop: spacing[1] }}>
            <Badge variant={getRiskLevelVariant(risk_classification)}>
              {risk_classification.toUpperCase()}
            </Badge>
          </div>
        </div>

        <div style={{ textAlign: 'center' }}>
          <div style={{ 
            fontSize: '20px', 
            fontWeight: 'bold', 
            color: palette.blue.base,
            marginBottom: spacing[1]
          }}>
            {analysis_depth}
          </div>
          <Label>Analysis Depth</Label>
          <Body style={{ fontSize: '11px', color: palette.gray.dark1, marginTop: '2px' }}>
            Relationship hops
          </Body>
        </div>

        <div style={{ textAlign: 'center' }}>
          <div style={{ 
            fontSize: '20px', 
            fontWeight: 'bold', 
            color: palette.green.base,
            marginBottom: spacing[1]
          }}>
            {total_connections}
          </div>
          <Label>Entities Analyzed</Label>
          <Body style={{ fontSize: '11px', color: palette.gray.dark1, marginTop: '2px' }}>
            Via graph traversal
          </Body>
        </div>

        <div style={{ textAlign: 'center' }}>
          <div style={{ 
            fontSize: '20px', 
            fontWeight: 'bold', 
            color: palette.red.base,
            marginBottom: spacing[1]
          }}>
            {high_risk_connections}
          </div>
          <Label>High Risk Connections</Label>
          <Body style={{ fontSize: '11px', color: palette.gray.dark1, marginTop: '2px' }}>
            Risk relationships
          </Body>
        </div>
      </div>

      {/* Risk Analysis Details */}
      <div>
        <H3 style={{ marginBottom: spacing[3], fontSize: '16px' }}>
          <Icon glyph="Charts" style={{ marginRight: spacing[1] }} />
          Risk Analysis Breakdown
        </H3>
        
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
          gap: spacing[3]
        }}>
          {/* Base Risk Score */}
          <div style={{
            padding: spacing[3],
            border: `1px solid ${palette.blue.light2}`,
            borderRadius: '6px',
            backgroundColor: palette.blue.light3
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing[2] }}>
              <Body style={{ fontWeight: 'bold', color: palette.blue.dark2 }}>Base Risk Score</Body>
              <Badge variant="blue">{base_risk_score.toFixed(1)}%</Badge>
            </div>
            <Body style={{ fontSize: '12px', color: palette.blue.dark1 }}>
              Individual entity risk assessment before network analysis
            </Body>
          </div>

          {/* Connection Risk Factor */}
          <div style={{
            padding: spacing[3],
            border: `1px solid ${palette.yellow.light2}`,
            borderRadius: '6px',
            backgroundColor: palette.yellow.light3
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing[2] }}>
              <Body style={{ fontWeight: 'bold', color: palette.yellow.dark2 }}>Network Risk Factor</Body>
              <Badge variant="yellow">{connection_risk_factor.toFixed(1)}%</Badge>
            </div>
            <Body style={{ fontSize: '12px', color: palette.yellow.dark1 }}>
              Additional risk from high-risk network connections
            </Body>
          </div>

          {/* High Risk Connections Detail */}
          <div style={{
            padding: spacing[3],
            border: `1px solid ${palette.red.light2}`,
            borderRadius: '6px',
            backgroundColor: palette.red.light3
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing[2] }}>
              <Body style={{ fontWeight: 'bold', color: palette.red.dark2 }}>High-Risk Connections</Body>
              <Badge variant="red">{high_risk_connections} of {total_connections}</Badge>
            </div>
            <Body style={{ fontSize: '12px', color: palette.red.dark1 }}>
              Entities with high or critical risk levels in network
            </Body>
          </div>
        </div>

        {/* Risk Calculation Formula */}
        <div style={{ 
          marginTop: spacing[3],
          padding: spacing[3],
          backgroundColor: palette.gray.light3,
          borderRadius: '6px',
          border: `1px solid ${palette.gray.light2}`
        }}>
          <Body style={{ fontSize: '12px', color: palette.gray.dark2, textAlign: 'center' }}>
            <strong>Risk Calculation:</strong> Network Risk = min(Base Risk + Connection Risk Factor, 100%) <br />
            <strong>Formula:</strong> {base_risk_score.toFixed(1)}% + {connection_risk_factor.toFixed(1)}% = {network_risk_score.toFixed(1)}%
          </Body>
        </div>
      </div>


      {/* MongoDB Operation Info */}
      <div style={{ 
        marginTop: spacing[4],
        padding: spacing[2],
        backgroundColor: palette.blue.light3,
        borderRadius: '6px',
        border: `1px solid ${palette.blue.light2}`
      }}>
        <Body style={{ fontSize: '11px', color: palette.blue.dark2 }}>
          <Icon glyph="Database" style={{ marginRight: spacing[1] }} />
          <strong>MongoDB Operation:</strong> Network risk analysis using entity lookup and relationship 
          traversal through {analysis_depth} hops. Combines base entity risk with connection risk factors from {total_connections} network relationships.
        </Body>
      </div>
    </Card>
  );
};

export default RiskPropagationPanel;