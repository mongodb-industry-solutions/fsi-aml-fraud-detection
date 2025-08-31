/**
 * Decision Tracker Component
 * Shows agent decision-making process with confidence levels and reasoning
 */

'use client';

import React, { useState } from 'react';
import Badge from '@leafygreen-ui/badge';
import Button from '@leafygreen-ui/button';
import Icon from '@leafygreen-ui/icon';
import Card from '@leafygreen-ui/card';
import { Body, H3 } from '@leafygreen-ui/typography';
import { palette } from '@leafygreen-ui/palette';
import { spacing } from '@leafygreen-ui/tokens';

export const DecisionTracker = ({ decisions }) => {
  const [expandedDecision, setExpandedDecision] = useState(null);

  const getConfidenceConfig = (confidence) => {
    if (confidence >= 0.9) return { color: 'green', label: 'Very High' };
    if (confidence >= 0.7) return { color: 'blue', label: 'High' };
    if (confidence >= 0.5) return { color: 'yellow', label: 'Medium' };
    if (confidence >= 0.3) return { color: 'orange', label: 'Low' };
    return { color: 'red', label: 'Very Low' };
  };

  const getDecisionTypeIcon = (type) => {
    switch (type) {
      case 'fraud_assessment':
        return 'Shield';
      case 'risk_scoring':
        return 'Charts';
      case 'tool_selection':
        return 'Settings';
      default:
        return 'Bulb';
    }
  };

  const formatDecisionType = (type) => {
    return type
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
  };

  const toggleDecisionExpansion = (decisionId) => {
    setExpandedDecision(expandedDecision === decisionId ? null : decisionId);
  };

  if (!decisions.length) {
    return null;
  }

  return (
    <Card style={{ background: palette.gray.light3, padding: spacing[3] }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing[3] }}>
        <H3 style={{ margin: 0, fontSize: '14px', color: palette.gray.dark3 }}>Agent Decisions</H3>
        <Badge variant="purple" style={{ fontSize: '11px' }}>
          {decisions.length} decisions
        </Badge>
      </div>

      <div>
        {decisions.map((decision) => {
          const confidenceConfig = getConfidenceConfig(decision.confidence);
          const isExpanded = expandedDecision === decision.id;

          return (
            <div
              key={decision.id}
              style={{
                background: palette.white,
                borderRadius: '6px',
                border: `1px solid ${palette.gray.light2}`,
                padding: spacing[3],
                marginBottom: spacing[2],
                transition: 'all 0.2s ease'
              }}
            >
              {/* Decision Header */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: spacing[3], flex: 1 }}>
                  <Icon 
                    glyph={getDecisionTypeIcon(decision.type)} 
                    size={16}
                    fill={palette.blue.base}
                    style={{ marginTop: '2px' }}
                  />

                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2], marginBottom: spacing[1] }}>
                      <Body weight="medium" size="small" style={{ 
                        margin: 0, 
                        color: palette.gray.dark3 
                      }}>
                        {formatDecisionType(decision.type)}
                      </Body>
                      <Badge variant={confidenceConfig.color} style={{ fontSize: '11px' }}>
                        {confidenceConfig.label} ({Math.round(decision.confidence * 100)}%)
                      </Badge>
                    </div>

                    <Body size="small" style={{ 
                      margin: 0, 
                      color: palette.gray.dark1,
                      marginBottom: spacing[2]
                    }}>
                      {decision.summary}
                    </Body>

                    <Body size="small" style={{ 
                      margin: 0, 
                      color: palette.gray.dark1,
                      fontSize: '11px'
                    }}>
                      {new Date(decision.timestamp).toLocaleTimeString()}
                    </Body>
                  </div>
                </div>

                <Button
                  size="xsmall"
                  variant="default"
                  onClick={() => toggleDecisionExpansion(decision.id)}
                  leftGlyph={<Icon glyph={isExpanded ? "ChevronUp" : "ChevronDown"} />}
                />
              </div>

              {/* Confidence Score Bar */}
              <div style={{ marginTop: spacing[3], marginBottom: spacing[2] }}>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between', 
                  fontSize: '11px', 
                  marginBottom: spacing[1] 
                }}>
                  <Body size="small" style={{ color: palette.gray.dark1, margin: 0 }}>
                    Confidence Level
                  </Body>
                  <Body weight="medium" size="small" style={{ margin: 0 }}>
                    {Math.round(decision.confidence * 100)}%
                  </Body>
                </div>
                <div style={{ 
                  width: '100%', 
                  background: palette.gray.light2, 
                  borderRadius: '8px', 
                  height: '8px' 
                }}>
                  <div
                    style={{
                      height: '8px',
                      borderRadius: '8px',
                      transition: 'all 0.3s ease',
                      width: `${decision.confidence * 100}%`,
                      background: confidenceConfig.color === 'green' ? palette.green.base :
                                confidenceConfig.color === 'blue' ? palette.blue.base :
                                confidenceConfig.color === 'yellow' ? palette.yellow.base :
                                confidenceConfig.color === 'red' ? palette.red.base :
                                palette.red.base
                    }}
                  />
                </div>
              </div>

              {/* Expanded Decision Details */}
              {isExpanded && (
                <div style={{ 
                  marginTop: spacing[3], 
                  paddingTop: spacing[3], 
                  borderTop: `1px solid ${palette.gray.light2}`,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: spacing[3]
                }}>
                  {/* Reasoning Chain */}
                  {decision.reasoning && decision.reasoning.length > 0 && (
                    <div>
                      <Body size="small" weight="medium" style={{ 
                        color: palette.gray.dark2, 
                        margin: `0 0 ${spacing[2]}px 0`,
                        fontSize: '11px'
                      }}>
                        Reasoning Chain:
                      </Body>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[2] }}>
                        {decision.reasoning.map((reason, index) => (
                          <div key={index} style={{ display: 'flex', alignItems: 'flex-start', gap: spacing[2] }}>
                            <div style={{
                              flexShrink: 0,
                              width: '20px',
                              height: '20px',
                              background: palette.blue.light3,
                              borderRadius: '50%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '11px',
                              fontWeight: 'medium',
                              color: palette.blue.dark2,
                              marginTop: '2px'
                            }}>
                              {index + 1}
                            </div>
                            <Body size="small" style={{ 
                              color: palette.gray.dark2, 
                              margin: 0, 
                              flex: 1 
                            }}>
                              {reason}
                            </Body>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Decision Details */}
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: '1fr 1fr', 
                    gap: spacing[4], 
                    fontSize: '11px' 
                  }}>
                    <div>
                      <Body size="small" style={{ color: palette.gray.dark1, margin: 0 }}>
                        Decision Type:
                      </Body>
                      <Body size="small" weight="medium" style={{ 
                        color: palette.gray.dark2, 
                        margin: 0 
                      }}>
                        {formatDecisionType(decision.type)}
                      </Body>
                    </div>
                    <div>
                      <Body size="small" style={{ color: palette.gray.dark1, margin: 0 }}>
                        Timestamp:
                      </Body>
                      <Body size="small" style={{ 
                        fontFamily: 'monospace', 
                        color: palette.gray.dark2, 
                        margin: 0 
                      }}>
                        {new Date(decision.timestamp).toLocaleString()}
                      </Body>
                    </div>
                  </div>

                  {/* Confidence Analysis */}
                  <div style={{ 
                    background: palette.gray.light3, 
                    borderRadius: '4px', 
                    padding: spacing[2] 
                  }}>
                    <Body size="small" weight="medium" style={{ 
                      color: palette.gray.dark2, 
                      margin: `0 0 ${spacing[1]}px 0`,
                      fontSize: '11px'
                    }}>
                      Confidence Analysis:
                    </Body>
                    <Body size="small" style={{ 
                      color: palette.gray.dark2, 
                      margin: 0,
                      fontSize: '11px'
                    }}>
                      The agent expressed <strong>{confidenceConfig.label.toLowerCase()}</strong> confidence 
                      ({Math.round(decision.confidence * 100)}%) in this {formatDecisionType(decision.type).toLowerCase()}.
                      {decision.confidence >= 0.8 && " This indicates high reliability in the assessment."}
                      {decision.confidence < 0.8 && decision.confidence >= 0.6 && " This suggests moderate reliability with some uncertainty."}
                      {decision.confidence < 0.6 && " This indicates lower reliability and may require human review."}
                    </Body>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Decision Summary */}
      <div style={{ 
        marginTop: spacing[3], 
        paddingTop: spacing[3], 
        borderTop: `1px solid ${palette.gray.light2}` 
      }}>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: '1fr 1fr', 
          gap: spacing[4], 
          fontSize: '11px' 
        }}>
          <div>
            <Body size="small" style={{ color: palette.gray.dark1, margin: 0 }}>
              Average Confidence:
            </Body>
            <Body size="small" weight="medium" style={{ 
              color: palette.gray.dark2, 
              margin: 0 
            }}>
              {decisions.length > 0 
                ? Math.round((decisions.reduce((sum, d) => sum + d.confidence, 0) / decisions.length) * 100)
                : 0
              }%
            </Body>
          </div>
          <div>
            <Body size="small" style={{ color: palette.gray.dark1, margin: 0 }}>
              High Confidence:
            </Body>
            <Body size="small" weight="medium" style={{ 
              color: palette.gray.dark2, 
              margin: 0 
            }}>
              {decisions.filter(d => d.confidence >= 0.7).length} of {decisions.length}
            </Body>
          </div>
        </div>
      </div>
    </Card>
  );
};