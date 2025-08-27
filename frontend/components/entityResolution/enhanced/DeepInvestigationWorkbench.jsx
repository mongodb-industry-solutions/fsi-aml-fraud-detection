"use client";

import React, { useState } from 'react';
import Card from '@leafygreen-ui/card';
import Button from '@leafygreen-ui/button';
import { H2, H3, Body, Label } from '@leafygreen-ui/typography';
import { Tabs, Tab } from '@leafygreen-ui/tabs';
import Icon from '@leafygreen-ui/icon';
import Badge from '@leafygreen-ui/badge';
import Banner from '@leafygreen-ui/banner';
import Code from '@leafygreen-ui/code';
import ExpandableCard from '@leafygreen-ui/expandable-card';
import { palette } from '@leafygreen-ui/palette';
import { spacing } from '@leafygreen-ui/tokens';

/**
 * Deep Investigation Workbench
 * 
 * Comprehensive investigation results with timeline analysis, pattern correlations,
 * risk projections, and expert recommendations for final decision making.
 */
function DeepInvestigationWorkbench({ investigation, workflowData, onReset }) {
  const [selectedTab, setSelectedTab] = useState(0); // 0: Overview, 1: Timeline, 2: Patterns, 3: Compliance

  if (!investigation) {
    return (
      <Card style={{ padding: spacing[4] }}>
        <div style={{ textAlign: 'center', color: palette.gray.base, padding: spacing[4] }}>
          <Icon glyph="MagnifyingGlass" size={48} style={{ marginBottom: spacing[2] }} />
          <Body>Deep investigation results will appear here</Body>
        </div>
      </Card>
    );
  }

  const {
    investigationReport = {},
    timelineAnalysis = [],
    patternCorrelations = [],
    riskProjections = {},
    detailedFindings = [],
    expertRecommendations = [],
    complianceAssessment = {},
    actionableInsights = []
  } = investigation;

  /**
   * Render investigation overview
   */
  const renderOverview = () => {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[4] }}>
        
        {/* Investigation Summary */}
        <Card style={{ 
          padding: spacing[4],
          background: 'linear-gradient(135deg, #EBF8FF 0%, #F0FDF4 100%)',
          border: '1px solid #E5E7EB'
        }}>
          <H3 style={{ 
            marginBottom: spacing[3],
            display: 'flex',
            alignItems: 'center',
            gap: spacing[2]
          }}>
            <Icon glyph="DocumentMagnifyingGlass" style={{ color: palette.blue.base }} />
            Investigation Summary
          </H3>
          
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
            gap: spacing[4],
            marginBottom: spacing[4]
          }}>
            <div style={{ textAlign: 'center' }}>
              <Body weight="medium" style={{ fontSize: '24px', color: palette.blue.base }}>
                {investigationReport.overallRiskScore || 'N/A'}
              </Body>
              <Body style={{ fontSize: '12px', color: palette.gray.dark1 }}>
                Overall Risk Score
              </Body>
            </div>
            <div style={{ textAlign: 'center' }}>
              <Body weight="medium" style={{ fontSize: '24px', color: palette.purple.base }}>
                {detailedFindings.length}
              </Body>
              <Body style={{ fontSize: '12px', color: palette.gray.dark1 }}>
                Key Findings
              </Body>
            </div>
            <div style={{ textAlign: 'center' }}>
              <Body weight="medium" style={{ fontSize: '24px', color: palette.green.base }}>
                {expertRecommendations.length}
              </Body>
              <Body style={{ fontSize: '12px', color: palette.gray.dark1 }}>
                Recommendations
              </Body>
            </div>
            <div style={{ textAlign: 'center' }}>
              <Badge variant={investigationReport.finalClassification === 'SAFE' ? 'green' : 
                              investigationReport.finalClassification === 'DUPLICATE' ? 'yellow' : 'red'}>
                {investigationReport.finalClassification || 'PENDING'}
              </Badge>
              <Body style={{ fontSize: '12px', color: palette.gray.dark1, marginTop: spacing[1] }}>
                Final Classification
              </Body>
            </div>
          </div>

          {investigationReport.executiveSummary && (
            <Card style={{ 
              padding: spacing[3],
              backgroundColor: 'rgba(255, 255, 255, 0.8)',
              border: '1px solid #E5E7EB'
            }}>
              <Body style={{ fontSize: '13px', lineHeight: '1.5' }}>
                {investigationReport.executiveSummary}
              </Body>
            </Card>
          )}
        </Card>

        {/* Key Findings */}
        <Card style={{ padding: spacing[4] }}>
          <H3 style={{ 
            marginBottom: spacing[3],
            display: 'flex',
            alignItems: 'center',
            gap: spacing[2]
          }}>
            <Icon glyph="ImportantWithCircle" style={{ color: palette.red.base }} />
            Key Findings
          </H3>
          
          {detailedFindings.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[3] }}>
              {detailedFindings.map((finding, index) => (
                <Card key={index} style={{ 
                  padding: spacing[3],
                  border: `1px solid ${finding.severity === 'high' ? palette.red.light1 : 
                                      finding.severity === 'medium' ? palette.yellow.light1 : palette.blue.light1}`,
                  backgroundColor: finding.severity === 'high' ? palette.red.light3 : 
                                  finding.severity === 'medium' ? palette.yellow.light3 : palette.blue.light3
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2], marginBottom: spacing[2] }}>
                        <Icon 
                          glyph={finding.severity === 'high' ? 'Warning' : 
                                 finding.severity === 'medium' ? 'InfoWithCircle' : 'Lightbulb'} 
                          style={{ 
                            color: finding.severity === 'high' ? palette.red.base : 
                                   finding.severity === 'medium' ? palette.yellow.dark2 : palette.blue.base
                          }} 
                        />
                        <H3 style={{ margin: 0, fontSize: '14px' }}>
                          {finding.title || 'Finding'}
                        </H3>
                      </div>
                      <Body style={{ fontSize: '13px', lineHeight: '1.4', marginBottom: spacing[2] }}>
                        {finding.description || 'No description available'}
                      </Body>
                      {finding.evidence && (
                        <Body style={{ fontSize: '12px', color: palette.gray.dark1 }}>
                          <strong>Evidence:</strong> {finding.evidence}
                        </Body>
                      )}
                      {finding.impact && (
                        <Body style={{ fontSize: '12px', color: palette.gray.dark1, marginTop: spacing[1] }}>
                          <strong>Impact:</strong> {finding.impact}
                        </Body>
                      )}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'end', gap: spacing[1] }}>
                      <Badge variant={finding.severity === 'high' ? 'red' : 
                                    finding.severity === 'medium' ? 'yellow' : 'blue'}>
                        {finding.severity || 'info'}
                      </Badge>
                      {finding.confidence && (
                        <Body style={{ fontSize: '11px', color: palette.gray.dark1 }}>
                          {(finding.confidence * 100).toFixed(0)}% confident
                        </Body>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: spacing[3] }}>
              <Body style={{ color: palette.gray.base }}>No critical findings identified</Body>
            </div>
          )}
        </Card>

        {/* Actionable Insights */}
        {actionableInsights.length > 0 && (
          <Card style={{ padding: spacing[4] }}>
            <H3 style={{ 
              marginBottom: spacing[3],
              display: 'flex',
              alignItems: 'center',
              gap: spacing[2]
            }}>
              <Icon glyph="Lightbulb" style={{ color: palette.yellow.dark2 }} />
              Actionable Insights
            </H3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[2] }}>
              {actionableInsights.map((insight, index) => (
                <Card key={index} style={{ 
                  padding: spacing[3],
                  backgroundColor: palette.yellow.light3,
                  border: `1px solid ${palette.yellow.light1}`
                }}>
                  <div style={{ display: 'flex', gap: spacing[2] }}>
                    <Icon glyph="Warning" style={{ color: palette.yellow.dark2, marginTop: '2px' }} />
                    <div>
                      <Body weight="medium" style={{ fontSize: '13px', marginBottom: spacing[1] }}>
                        {insight.title || 'Insight'}
                      </Body>
                      <Body style={{ fontSize: '12px', lineHeight: '1.4' }}>
                        {insight.description || insight}
                      </Body>
                      {insight.action && (
                        <Body style={{ 
                          fontSize: '12px', 
                          color: palette.yellow.dark2, 
                          marginTop: spacing[1],
                          fontWeight: '600'
                        }}>
                          Action: {insight.action}
                        </Body>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </Card>
        )}
      </div>
    );
  };

  /**
   * Render timeline analysis
   */
  const renderTimelineAnalysis = () => {
    if (!timelineAnalysis || timelineAnalysis.length === 0) {
      return (
        <div style={{ textAlign: 'center', padding: spacing[4] }}>
          <Icon glyph="Clock" size={48} style={{ color: palette.gray.base, marginBottom: spacing[2] }} />
          <Body style={{ color: palette.gray.base }}>No timeline data available</Body>
        </div>
      );
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[3] }}>
        {timelineAnalysis.map((event, index) => (
          <Card key={index} style={{ 
            padding: spacing[3],
            border: `1px solid ${palette.blue.light1}`,
            position: 'relative'
          }}>
            {/* Timeline connector */}
            {index < timelineAnalysis.length - 1 && (
              <div style={{
                position: 'absolute',
                left: '24px',
                bottom: '-12px',
                width: '2px',
                height: '24px',
                backgroundColor: palette.blue.light2,
                zIndex: 1
              }} />
            )}
            
            <div style={{ display: 'flex', gap: spacing[3] }}>
              <div style={{
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                backgroundColor: palette.blue.base,
                marginTop: '4px',
                flexShrink: 0,
                zIndex: 2
              }} />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                  <div>
                    <Body weight="medium" style={{ fontSize: '13px', marginBottom: spacing[1] }}>
                      {event.title || event.type || 'Event'}
                    </Body>
                    <Body style={{ fontSize: '12px', color: palette.gray.dark1, lineHeight: '1.4' }}>
                      {event.description || 'No description available'}
                    </Body>
                  </div>
                  <Body style={{ fontSize: '11px', color: palette.gray.base }}>
                    {event.timestamp || event.date || 'Unknown date'}
                  </Body>
                </div>
                {event.impact && (
                  <Badge 
                    variant={event.impact === 'high' ? 'red' : event.impact === 'medium' ? 'yellow' : 'green'}
                    style={{ marginTop: spacing[1] }}
                  >
                    {event.impact} impact
                  </Badge>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
    );
  };

  /**
   * Render pattern correlations
   */
  const renderPatternCorrelations = () => {
    if (!patternCorrelations || patternCorrelations.length === 0) {
      return (
        <div style={{ textAlign: 'center', padding: spacing[4] }}>
          <Icon glyph="Diagram3" size={48} style={{ color: palette.gray.base, marginBottom: spacing[2] }} />
          <Body style={{ color: palette.gray.base }}>No pattern correlations detected</Body>
        </div>
      );
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[3] }}>
        {patternCorrelations.map((pattern, index) => (
          <ExpandableCard
            key={index}
            title={pattern.type || 'Pattern Correlation'}
            description={pattern.summary || 'Pattern correlation analysis'}
          >
            <div style={{ padding: spacing[3] }}>
              <Body style={{ fontSize: '13px', lineHeight: '1.4', marginBottom: spacing[2] }}>
                {pattern.description || 'No detailed description available'}
              </Body>
              
              {pattern.entities && pattern.entities.length > 0 && (
                <div>
                  <Label style={{ fontSize: '12px', marginBottom: spacing[1] }}>
                    Related Entities ({pattern.entities.length})
                  </Label>
                  <div style={{ 
                    display: 'flex', 
                    flexWrap: 'wrap', 
                    gap: spacing[1] 
                  }}>
                    {pattern.entities.slice(0, 5).map((entity, entityIndex) => (
                      <Badge key={entityIndex} variant="lightgray">
                        {entity.name || entity.entityId || `Entity ${entityIndex + 1}`}
                      </Badge>
                    ))}
                    {pattern.entities.length > 5 && (
                      <Badge variant="lightgray">
                        +{pattern.entities.length - 5} more
                      </Badge>
                    )}
                  </div>
                </div>
              )}
              
              {pattern.confidence && (
                <div style={{ marginTop: spacing[2] }}>
                  <Label style={{ fontSize: '12px' }}>
                    Confidence: {(pattern.confidence * 100).toFixed(1)}%
                  </Label>
                </div>
              )}
            </div>
          </ExpandableCard>
        ))}
      </div>
    );
  };

  /**
   * Render compliance assessment
   */
  const renderComplianceAssessment = () => {
    const compliance = complianceAssessment || {};
    
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[4] }}>
        
        {/* Compliance Overview */}
        <Card style={{ 
          padding: spacing[4],
          backgroundColor: compliance.overallStatus === 'COMPLIANT' ? palette.green.light3 : 
                           compliance.overallStatus === 'NON_COMPLIANT' ? palette.red.light3 : 
                           palette.yellow.light3,
          border: `1px solid ${compliance.overallStatus === 'COMPLIANT' ? palette.green.light1 : 
                                 compliance.overallStatus === 'NON_COMPLIANT' ? palette.red.light1 : 
                                 palette.yellow.light1}`
        }}>
          <H3 style={{ 
            marginBottom: spacing[3],
            display: 'flex',
            alignItems: 'center',
            gap: spacing[2]
          }}>
            <Icon 
              glyph={compliance.overallStatus === 'COMPLIANT' ? 'CheckmarkWithCircle' : 
                     compliance.overallStatus === 'NON_COMPLIANT' ? 'XWithCircle' : 'Warning'} 
              style={{ 
                color: compliance.overallStatus === 'COMPLIANT' ? palette.green.base : 
                       compliance.overallStatus === 'NON_COMPLIANT' ? palette.red.base : 
                       palette.yellow.dark2 
              }} 
            />
            Compliance Assessment
          </H3>
          
          <div style={{ textAlign: 'center', marginBottom: spacing[3] }}>
            <Badge 
              variant={compliance.overallStatus === 'COMPLIANT' ? 'green' : 
                       compliance.overallStatus === 'NON_COMPLIANT' ? 'red' : 'yellow'}
              style={{ fontSize: '14px', padding: '8px 16px' }}
            >
              {compliance.overallStatus || 'UNDER REVIEW'}
            </Badge>
            {compliance.complianceScore && (
              <Body style={{ marginTop: spacing[2], fontSize: '14px' }}>
                Compliance Score: {compliance.complianceScore}/100
              </Body>
            )}
          </div>
          
          {compliance.summary && (
            <Body style={{ fontSize: '13px', lineHeight: '1.5', textAlign: 'center' }}>
              {compliance.summary}
            </Body>
          )}
        </Card>

        {/* Expert Recommendations */}
        <Card style={{ padding: spacing[4] }}>
          <H3 style={{ 
            marginBottom: spacing[3],
            display: 'flex',
            alignItems: 'center',
            gap: spacing[2]
          }}>
            <Icon glyph="University" style={{ color: palette.purple.base }} />
            Expert Recommendations
          </H3>
          
          {expertRecommendations.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[3] }}>
              {expertRecommendations.map((rec, index) => (
                <Card key={index} style={{ 
                  padding: spacing[3],
                  border: `1px solid ${palette.purple.light1}`,
                  backgroundColor: palette.purple.light3
                }}>
                  <div style={{ display: 'flex', gap: spacing[2] }}>
                    <Icon glyph="Megaphone" style={{ color: palette.purple.base, marginTop: '2px' }} />
                    <div style={{ flex: 1 }}>
                      <Body weight="medium" style={{ fontSize: '13px', marginBottom: spacing[1] }}>
                        {rec.title || rec.recommendation || 'Expert Recommendation'}
                      </Body>
                      <Body style={{ fontSize: '12px', lineHeight: '1.4', marginBottom: spacing[2] }}>
                        {rec.description || rec.rationale || 'No description available'}
                      </Body>
                      {rec.action && (
                        <Body style={{ 
                          fontSize: '12px', 
                          color: palette.purple.dark2, 
                          fontWeight: '600'
                        }}>
                          Recommended Action: {rec.action}
                        </Body>
                      )}
                    </div>
                    {rec.priority && (
                      <Badge variant={rec.priority === 'critical' ? 'red' : 
                                    rec.priority === 'high' ? 'yellow' : 'blue'}>
                        {rec.priority}
                      </Badge>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: spacing[3] }}>
              <Body style={{ color: palette.gray.base }}>No expert recommendations available</Body>
            </div>
          )}
        </Card>
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[4] }}>
      
      {/* Header */}
      <Card style={{ 
        padding: spacing[4],
        background: 'linear-gradient(135deg, #F3E8FF 0%, #FEF3C7 100%)',
        border: '1px solid #E5E7EB'
      }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center'
        }}>
          <div>
            <H2 style={{ 
              margin: 0,
              display: 'flex',
              alignItems: 'center',
              gap: spacing[2]
            }}>
              <Icon glyph="University" style={{ color: palette.purple.base }} />
              Deep Investigation Report
            </H2>
            <Body style={{ color: palette.gray.dark1, marginTop: spacing[1] }}>
              Comprehensive analysis and expert recommendations for final decision making
            </Body>
          </div>
          <Button
            variant="default"
            onClick={onReset}
            leftGlyph={<Icon glyph="Refresh" />}
          >
            New Investigation
          </Button>
        </div>
      </Card>

      {/* Investigation Tabs */}
      <Card style={{ padding: spacing[4] }}>
        <Tabs selected={selectedTab} setSelected={setSelectedTab}>
          <Tab name="Overview & Findings">
            <div style={{ marginTop: spacing[3] }}>
              {renderOverview()}
            </div>
          </Tab>
          
          <Tab name="Timeline Analysis">
            <div style={{ marginTop: spacing[3] }}>
              {renderTimelineAnalysis()}
            </div>
          </Tab>
          
          <Tab name="Pattern Correlations">
            <div style={{ marginTop: spacing[3] }}>
              {renderPatternCorrelations()}
            </div>
          </Tab>
          
          <Tab name="Compliance & Recommendations">
            <div style={{ marginTop: spacing[3] }}>
              {renderComplianceAssessment()}
            </div>
          </Tab>
        </Tabs>
      </Card>

      {/* Investigation Data Export */}
      <Card style={{ padding: spacing[4] }}>
        <H3 style={{ 
          marginBottom: spacing[3],
          display: 'flex',
          alignItems: 'center',
          gap: spacing[2]
        }}>
          <Icon glyph="Download" style={{ color: palette.blue.base }} />
          Investigation Data
        </H3>
        
        <ExpandableCard
          title="Complete Investigation Dataset"
          description="View the complete investigation data structure for audit and compliance purposes"
        >
          <div style={{ padding: spacing[3] }}>
            <Code 
              language="json" 
              copyable={true}
              style={{ 
                fontSize: '11px',
                maxHeight: '400px',
                overflow: 'auto'
              }}
            >
              {JSON.stringify({
                investigationSummary: investigationReport,
                workflowData: {
                  classification: workflowData?.classification,
                  searchResults: workflowData?.searchResults ? {
                    totalAtlasResults: workflowData.searchResults.atlasResults?.length,
                    totalVectorResults: workflowData.searchResults.vectorResults?.length,
                    topMatchesCount: workflowData.searchResults.topMatches?.length
                  } : null,
                  networkAnalysis: workflowData?.networkAnalysis ? {
                    totalNodes: workflowData.networkAnalysis.networkData?.nodes?.length,
                    totalEdges: workflowData.networkAnalysis.networkData?.edges?.length,
                    riskScore: workflowData.networkAnalysis.riskPropagation?.networkRiskScore
                  } : null
                },
                investigation: {
                  findingsCount: detailedFindings.length,
                  recommendationsCount: expertRecommendations.length,
                  complianceStatus: complianceAssessment.overallStatus,
                  patternCorrelations: patternCorrelations.length
                }
              }, null, 2)}
            </Code>
          </div>
        </ExpandableCard>
      </Card>
    </div>
  );
}

export default DeepInvestigationWorkbench;