"use client";

import React, { useState } from 'react';
import Card from '@leafygreen-ui/card';
import Button from '@leafygreen-ui/button';
import { H3, Body, Label } from '@leafygreen-ui/typography';
import Icon from '@leafygreen-ui/icon';
import Badge from '@leafygreen-ui/badge';
import Banner from '@leafygreen-ui/banner';
import { Spinner } from '@leafygreen-ui/loading-indicator';
import { palette } from '@leafygreen-ui/palette';
import { spacing } from '@leafygreen-ui/tokens';

/**
 * Intelligence Analysis Panel
 * 
 * Displays correlation analysis, pattern detection, risk indicators,
 * and AI-generated insights from combined search intelligence.
 */
function IntelligenceAnalysisPanel({ 
  intelligence, 
  onNetworkAnalysis, 
  isLoading = false 
}) {
  const [selectedSection, setSelectedSection] = useState(0); // 0: Overview, 1: Patterns, 2: Risks, 3: Insights

  if (isLoading) {
    return (
      <Card style={{ padding: spacing[4] }}>
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column',
          alignItems: 'center', 
          justifyContent: 'center',
          minHeight: '300px',
          gap: spacing[3]
        }}>
          <Spinner />
          <Body>Analyzing combined intelligence...</Body>
        </div>
      </Card>
    );
  }

  if (!intelligence) {
    return (
      <Card style={{ padding: spacing[4] }}>
        <div style={{ textAlign: 'center', color: palette.gray.base, padding: spacing[4] }}>
          <Icon glyph="Lightbulb" size={48} style={{ marginBottom: spacing[2] }} />
          <Body>Intelligence analysis will appear here</Body>
        </div>
      </Card>
    );
  }

  const {
    correlationMatrix = {},
    patterns = [],
    riskIndicators = [],
    confidenceMetrics = {},
    recommendations = [],
    insights = []
  } = intelligence;

  /**
   * Render correlation matrix visualization
   */
  const renderCorrelationMatrix = () => {
    if (!correlationMatrix || Object.keys(correlationMatrix).length === 0) {
      return (
        <div style={{ textAlign: 'center', padding: spacing[3] }}>
          <Body style={{ color: palette.gray.base }}>No correlation data available</Body>
        </div>
      );
    }

    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: spacing[3] }}>
        <Card style={{ padding: spacing[3], backgroundColor: palette.blue.light3 }}>
          <div style={{ textAlign: 'center' }}>
            <Icon glyph="Diagram2" style={{ color: palette.blue.base, marginBottom: spacing[1] }} />
            <H3 style={{ margin: 0, fontSize: '18px' }}>
              {correlationMatrix.overlapPercentage || 0}%
            </H3>
            <Body style={{ fontSize: '12px', color: palette.gray.dark1 }}>
              Search Overlap
            </Body>
          </div>
        </Card>
        
        <Card style={{ padding: spacing[3], backgroundColor: palette.green.light3 }}>
          <div style={{ textAlign: 'center' }}>
            <Icon glyph="CheckmarkWithCircle" style={{ color: palette.green.base, marginBottom: spacing[1] }} />
            <H3 style={{ margin: 0, fontSize: '18px' }}>
              {correlationMatrix.confidenceScore || 0}
            </H3>
            <Body style={{ fontSize: '12px', color: palette.gray.dark1 }}>
              Confidence Score
            </Body>
          </div>
        </Card>
        
        <Card style={{ padding: spacing[3], backgroundColor: palette.purple.light3 }}>
          <div style={{ textAlign: 'center' }}>
            <Icon glyph="Connect" style={{ color: palette.purple.base, marginBottom: spacing[1] }} />
            <H3 style={{ margin: 0, fontSize: '18px' }}>
              {correlationMatrix.intersectionCount || 0}
            </H3>
            <Body style={{ fontSize: '12px', color: palette.gray.dark1 }}>
              Common Matches
            </Body>
          </div>
        </Card>
        
        <Card style={{ padding: spacing[3], backgroundColor: palette.yellow.light3 }}>
          <div style={{ textAlign: 'center' }}>
            <Icon glyph="Warning" style={{ color: palette.yellow.dark2, marginBottom: spacing[1] }} />
            <H3 style={{ margin: 0, fontSize: '18px' }}>
              {correlationMatrix.divergenceCount || 0}
            </H3>
            <Body style={{ fontSize: '12px', color: palette.gray.dark1 }}>
              Unique Results
            </Body>
          </div>
        </Card>
      </div>
    );
  };

  /**
   * Render detected patterns
   */
  const renderPatterns = () => {
    if (!patterns || patterns.length === 0) {
      return (
        <div style={{ textAlign: 'center', padding: spacing[3] }}>
          <Icon glyph="Diagram3" style={{ color: palette.gray.base, marginBottom: spacing[2] }} />
          <Body style={{ color: palette.gray.base }}>No patterns detected</Body>
        </div>
      );
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[2] }}>
        {patterns.map((pattern, index) => (
          <Card key={index} style={{ 
            padding: spacing[3], 
            border: `1px solid ${palette.gray.light2}`
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
              <div style={{ flex: 1 }}>
                <Body weight="medium" style={{ fontSize: '13px', marginBottom: spacing[1] }}>
                  {pattern.type || 'Pattern'}
                </Body>
                <Body style={{ fontSize: '12px', color: palette.gray.dark1, lineHeight: '1.4' }}>
                  {pattern.description || 'No description available'}
                </Body>
              </div>
              <Badge variant={pattern.severity === 'high' ? 'red' : pattern.severity === 'medium' ? 'yellow' : 'green'}>
                {pattern.severity || 'low'}
              </Badge>
            </div>
            {pattern.matchCount && (
              <Body style={{ fontSize: '11px', color: palette.gray.base, marginTop: spacing[1] }}>
                Found in {pattern.matchCount} entities
              </Body>
            )}
          </Card>
        ))}
      </div>
    );
  };

  /**
   * Render risk indicators
   */
  const renderRiskIndicators = () => {
    if (!riskIndicators || riskIndicators.length === 0) {
      return (
        <div style={{ textAlign: 'center', padding: spacing[3] }}>
          <Icon glyph="Shield" style={{ color: palette.green.base, marginBottom: spacing[2] }} />
          <Body style={{ color: palette.gray.base }}>No risk indicators identified</Body>
        </div>
      );
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[2] }}>
        {riskIndicators.map((indicator, index) => (
          <Card key={index} style={{ 
            padding: spacing[3],
            border: `1px solid ${indicator.level === 'high' ? palette.red.light1 : 
                                 indicator.level === 'medium' ? palette.yellow.light1 : palette.gray.light2}`,
            backgroundColor: indicator.level === 'high' ? palette.red.light3 : 
                           indicator.level === 'medium' ? palette.yellow.light3 : 'transparent'
          }}>
            <div style={{ display: 'flex', alignItems: 'start', gap: spacing[2] }}>
              <Icon 
                glyph={indicator.level === 'high' ? 'Warning' : 
                       indicator.level === 'medium' ? 'InfoWithCircle' : 'Checkmark'} 
                style={{ 
                  color: indicator.level === 'high' ? palette.red.base : 
                         indicator.level === 'medium' ? palette.yellow.dark2 : palette.green.base,
                  marginTop: '2px'
                }} 
              />
              <div style={{ flex: 1 }}>
                <Body weight="medium" style={{ fontSize: '13px', marginBottom: spacing[1] }}>
                  {indicator.type || 'Risk Indicator'}
                </Body>
                <Body style={{ fontSize: '12px', color: palette.gray.dark1, lineHeight: '1.4' }}>
                  {indicator.description || 'No description available'}
                </Body>
                {indicator.score && (
                  <div style={{ marginTop: spacing[1] }}>
                    <Label style={{ fontSize: '11px' }}>Risk Score: {indicator.score}/100</Label>
                  </div>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
    );
  };

  /**
   * Render AI insights and recommendations
   */
  const renderInsights = () => {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[3] }}>
        
        {/* AI Insights */}
        {insights && insights.length > 0 && (
          <div>
            <H3 style={{ fontSize: '14px', marginBottom: spacing[2] }}>
              AI-Generated Insights
            </H3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[2] }}>
              {insights.map((insight, index) => (
                <Card key={index} style={{ 
                  padding: spacing[3], 
                  backgroundColor: palette.blue.light3,
                  border: `1px solid ${palette.blue.light1}`
                }}>
                  <div style={{ display: 'flex', gap: spacing[2] }}>
                    <Icon glyph="Lightbulb" style={{ color: palette.blue.base, marginTop: '2px' }} />
                    <div>
                      <Body style={{ fontSize: '12px', lineHeight: '1.4' }}>
                        {insight.text || insight}
                      </Body>
                      {insight.confidence && (
                        <Body style={{ fontSize: '11px', color: palette.gray.dark1, marginTop: spacing[1] }}>
                          Confidence: {(insight.confidence * 100).toFixed(1)}%
                        </Body>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Recommendations */}
        {recommendations && recommendations.length > 0 && (
          <div>
            <H3 style={{ fontSize: '14px', marginBottom: spacing[2] }}>
              Recommendations
            </H3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[2] }}>
              {recommendations.map((rec, index) => (
                <Card key={index} style={{ 
                  padding: spacing[3], 
                  backgroundColor: palette.green.light3,
                  border: `1px solid ${palette.green.light1}`
                }}>
                  <div style={{ display: 'flex', gap: spacing[2] }}>
                    <Icon glyph="Target" style={{ color: palette.green.base, marginTop: '2px' }} />
                    <div>
                      <Body weight="medium" style={{ fontSize: '12px', marginBottom: spacing[1] }}>
                        {rec.title || 'Recommendation'}
                      </Body>
                      <Body style={{ fontSize: '12px', lineHeight: '1.4' }}>
                        {rec.description || rec}
                      </Body>
                      {rec.priority && (
                        <Badge 
                          variant={rec.priority === 'high' ? 'red' : rec.priority === 'medium' ? 'yellow' : 'green'}
                          style={{ marginTop: spacing[1] }}
                        >
                          {rec.priority} priority
                        </Badge>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const sections = [
    { id: 0, label: 'Overview', icon: 'Diagram2' },
    { id: 1, label: 'Patterns', icon: 'Diagram3' },
    { id: 2, label: 'Risk Indicators', icon: 'Warning' },
    { id: 3, label: 'Insights', icon: 'Lightbulb' }
  ];

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
          <Icon glyph="Lightbulb" style={{ color: palette.purple.base }} />
          Intelligence Analysis
        </H3>
        
        {/* Confidence Metrics */}
        {confidenceMetrics && Object.keys(confidenceMetrics).length > 0 && (
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: spacing[2],
            fontSize: '12px'
          }}>
            <Body style={{ color: palette.gray.dark1 }}>Overall Confidence:</Body>
            <Badge variant={confidenceMetrics.overall > 0.8 ? 'green' : 
                           confidenceMetrics.overall > 0.6 ? 'yellow' : 'red'}>
              {(confidenceMetrics.overall * 100).toFixed(1)}%
            </Badge>
          </div>
        )}
      </div>

      {/* Section Navigation */}
      <div style={{ 
        display: 'flex', 
        borderBottom: `1px solid ${palette.gray.light2}`,
        marginBottom: spacing[3]
      }}>
        {sections.map((section) => (
          <button
            key={section.id}
            onClick={() => setSelectedSection(section.id)}
            style={{
              padding: `${spacing[2]}px ${spacing[3]}px`,
              border: 'none',
              backgroundColor: 'transparent',
              borderBottom: selectedSection === section.id ? `2px solid ${palette.purple.base}` : '2px solid transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: spacing[1],
              color: selectedSection === section.id ? palette.purple.base : palette.gray.dark1,
              fontWeight: selectedSection === section.id ? '600' : '400',
              fontSize: '13px'
            }}
          >
            <Icon 
              glyph={section.icon} 
              size={14} 
              fill={selectedSection === section.id ? palette.purple.base : palette.gray.base} 
            />
            {section.label}
          </button>
        ))}
      </div>

      {/* Section Content */}
      <div style={{ minHeight: '300px' }}>
        {selectedSection === 0 && renderCorrelationMatrix()}
        {selectedSection === 1 && renderPatterns()}
        {selectedSection === 2 && renderRiskIndicators()}
        {selectedSection === 3 && renderInsights()}
      </div>

      {/* Action Section */}
      <div style={{ 
        marginTop: spacing[4],
        paddingTop: spacing[3],
        borderTop: `1px solid ${palette.gray.light2}`
      }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center'
        }}>
          <div>
            <Body weight="medium" style={{ fontSize: '13px' }}>Next Step: Network Analysis</Body>
            <Body style={{ fontSize: '12px', color: palette.gray.dark1 }}>
              Analyze entity networks and relationships for comprehensive risk assessment
            </Body>
          </div>
          <Button
            variant="primary"
            onClick={onNetworkAnalysis}
            leftGlyph={<Icon glyph="Diagram3" />}
            disabled={!intelligence || isLoading}
          >
            Analyze Network
          </Button>
        </div>
      </div>
    </Card>
  );
}

export default IntelligenceAnalysisPanel;