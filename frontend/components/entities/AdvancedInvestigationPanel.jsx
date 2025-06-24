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

  // Centrality Analysis Panel
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

    const { centrality_metrics = {}, bridge_entities = [] } = data;

    return (
      <div style={{ padding: spacing[3] }}>
        <div style={{ marginBottom: spacing[4] }}>
          <H3 style={{ fontSize: '16px' }}>Network Centrality Metrics</H3>
          <Body style={{ color: palette.gray.dark1, marginBottom: spacing[3] }}>
            Analysis of entity importance within the network using MongoDB aggregation pipelines
          </Body>

          {Object.keys(centrality_metrics).length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[2] }}>
              {Object.entries(centrality_metrics).slice(0, 8).map(([entityId, metrics]) => (
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
                      color: entityId === centerEntityId ? palette.blue.dark2 : 'inherit'
                    }}>
                      {entityId === centerEntityId ? '🎯 ' : ''}{entityId}
                    </Body>
                    <div style={{ display: 'flex', gap: spacing[2], alignItems: 'center' }}>
                      <Badge variant="lightgray" style={{ fontSize: '10px' }}>
                        Degree: {((metrics.degree_centrality || 0) * 100).toFixed(0)}%
                      </Badge>
                      <Badge variant="blue" style={{ fontSize: '10px' }}>
                        Between: {((metrics.betweenness_centrality || 0) * 100).toFixed(0)}%
                      </Badge>
                      <Badge variant="green" style={{ fontSize: '10px' }}>
                        Close: {((metrics.closeness_centrality || 0) * 100).toFixed(0)}%
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Body style={{ color: palette.gray.dark1 }}>No centrality metrics available</Body>
          )}
        </div>

        {bridge_entities.length > 0 && (
          <div>
            <H3 style={{ fontSize: '16px' }}>Bridge Entities</H3>
            <Body style={{ color: palette.gray.dark1, marginBottom: spacing[2] }}>
              Entities that connect different parts of the network
            </Body>
            <div style={{ display: 'flex', gap: spacing[1], flexWrap: 'wrap' }}>
              {bridge_entities.slice(0, 10).map((bridge, index) => (
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

  // Suspicious Patterns Panel
  const SuspiciousPatternPanel = ({ data }) => {
    if (!data || !data.success) {
      return (
        <div style={{ padding: spacing[3], textAlign: 'center' }}>
          <Icon glyph="Shield" size={32} fill={palette.green.base} />
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
          backgroundColor: palette.red.light3, 
          borderRadius: '6px',
          textAlign: 'center'
        }}>
          <Icon glyph="Warning" size={24} fill={palette.red.base} />
          <Body style={{ fontWeight: 'bold', marginTop: spacing[1] }}>
            Risk Analysis
          </Body>
          <Body style={{ fontSize: '12px', color: palette.red.dark2 }}>
            {riskAnalysis?.success ? 'Completed' : 'Not Available'}
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
            Centrality
          </Body>
          <Body style={{ fontSize: '12px', color: palette.green.dark2 }}>
            {centralityAnalysis?.success ? 'Completed' : 'Not Available'}
          </Body>
        </div>

        <div style={{ 
          padding: spacing[3], 
          backgroundColor: palette.purple.light3, 
          borderRadius: '6px',
          textAlign: 'center'
        }}>
          <Icon glyph="Shield" size={24} fill={palette.purple.base} />
          <Body style={{ fontWeight: 'bold', marginTop: spacing[1] }}>
            Pattern Detection
          </Body>
          <Body style={{ fontSize: '12px', color: palette.purple.dark2 }}>
            {suspiciousPatterns?.success ? 'Completed' : 'Not Available'}
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
        
        <Tab name="Risk Analysis">
          {RiskPropagationComponent ? (
            <RiskPropagationComponent 
              data={riskAnalysis} 
              centerEntityId={centerEntityId} 
            />
          ) : (
            <div style={{ padding: spacing[3], textAlign: 'center' }}>
              <Icon glyph="InformationWithCircle" size={32} fill={palette.gray.light1} />
              <Body style={{ color: palette.gray.dark1, marginTop: spacing[2] }}>
                Risk analysis component not available
              </Body>
            </div>
          )}
        </Tab>
        
        <Tab name="Centrality Analysis">
          <CentralityAnalysisPanel data={centralityAnalysis} />
        </Tab>
        
        <Tab name="Pattern Detection">
          <SuspiciousPatternPanel data={suspiciousPatterns} />
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