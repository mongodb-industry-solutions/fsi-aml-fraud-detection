"use client";

import React, { useState } from 'react';
import { spacing } from '@leafygreen-ui/tokens';
import { palette } from '@leafygreen-ui/palette';
import { Body, Subtitle, H3, InlineCode } from '@leafygreen-ui/typography';
import Card from '@leafygreen-ui/card';
import Button from '@leafygreen-ui/button';
import Icon from '@leafygreen-ui/icon';
import ExpandableCard from '@leafygreen-ui/expandable-card';
import Badge from '@leafygreen-ui/badge';

export default function VectorSearchCalculationBreakdown({ 
  calculationBreakdown,
  similarityRiskScore 
}) {
  const [expanded, setExpanded] = useState(false);

  if (!calculationBreakdown) {
    return null;
  }

  const {
    method,
    steps,
    high_risk_matches = 0,
    medium_risk_matches = 0,
    low_risk_matches = 0,
    total_matches = 0,
    components = {}
  } = calculationBreakdown;

  // Color coding for different calculation methods
  const getMethodColor = (method) => {
    if (method.includes('High Risk')) return palette.red.base;
    if (method.includes('Low Risk')) return palette.green.base;
    if (method.includes('Mixed Risk')) return palette.yellow.dark1;
    if (method.includes('No Similar')) return palette.gray.dark1;
    return palette.blue.base;
  };

  const methodColor = getMethodColor(method);

  // Format individual weight details for display with detailed explanations
  const renderWeightDetails = (weightDetails) => {
    if (!weightDetails || !Array.isArray(weightDetails)) return null;

    return (
      <div style={{ marginTop: spacing[4] }}>
        <div style={{
          marginBottom: spacing[3],
          padding: spacing[3],
          background: palette.blue.light3,
          borderRadius: '6px',
          border: `1px solid ${palette.blue.light1}`
        }}>
          <H3 style={{ marginBottom: spacing[2], color: palette.blue.dark2 }}>
            🔍 Step 1: Weight Calculation for Each Match
          </H3>
          <Body style={{ marginBottom: spacing[2] }}>
            Each similar transaction gets a <strong>weight</strong> based on how similar it is and how many risk flags it has:
          </Body>
          <div style={{
            fontFamily: 'monospace',
            background: 'white',
            padding: spacing[2],
            borderRadius: '4px',
            border: '1px solid #e8edeb',
            textAlign: 'center'
          }}>
            <Body weight="medium">Weight = Similarity × (1 + Risk Flags × 0.1)</Body>
          </div>
          <Body size="small" style={{ marginTop: spacing[2], fontStyle: 'italic' }}>
            💡 <strong>Why this works:</strong> More similar transactions get higher weight, and transactions with more risk indicators get even higher weight.
          </Body>
        </div>

        <div style={{ 
          display: 'grid', 
          gap: spacing[3],
          maxHeight: '400px',
          overflowY: 'auto'
        }}>
          {weightDetails.map((detail, index) => (
            <div key={index} style={{
              padding: spacing[3],
              background: 'white',
              borderRadius: '6px',
              border: '2px solid #e8edeb',
              boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: spacing[2] }}>
                <H3 style={{ color: palette.blue.dark1 }}>Match #{detail.match}</H3>
                <Badge 
                  variant={detail.flags > 3 ? "red" : detail.flags > 1 ? "yellow" : "green"}
                  style={{ marginLeft: spacing[2] }}
                >
                  {detail.flags || 0} flags
                </Badge>
              </div>
              
              {/* Step-by-step calculation for this match */}
              <div style={{ marginBottom: spacing[3] }}>
                <Body size="small" weight="medium" style={{ marginBottom: spacing[1] }}>Calculation:</Body>
                <div style={{
                  fontFamily: 'monospace',
                  background: palette.gray.light3,
                  padding: spacing[2],
                  borderRadius: '4px',
                  fontSize: '14px'
                }}>
                  <div>Weight = {detail.similarity?.toFixed(4)} × (1 + {detail.flags || 0} × 0.1)</div>
                  <div>Weight = {detail.similarity?.toFixed(4)} × {(1 + (detail.flags || 0) * 0.1).toFixed(1)}</div>
                  <div style={{ color: palette.blue.dark1, fontWeight: 'bold' }}>
                    Weight = {detail.weight?.toFixed(4)}
                  </div>
                </div>
              </div>

              {/* Key metrics grid */}
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', 
                gap: spacing[2],
                marginBottom: spacing[2]
              }}>
                <div style={{ textAlign: 'center', padding: spacing[2], background: palette.gray.light2, borderRadius: '4px' }}>
                  <Body size="small" style={{ color: palette.gray.dark1 }}>Similarity</Body>
                  <Body weight="medium">{(detail.similarity * 100)?.toFixed(1)}%</Body>
                </div>
                <div style={{ textAlign: 'center', padding: spacing[2], background: palette.gray.light2, borderRadius: '4px' }}>
                  <Body size="small" style={{ color: palette.gray.dark1 }}>Risk Score</Body>
                  <Body weight="medium">{(detail.risk_score * 100)?.toFixed(0)}%</Body>
                </div>
                <div style={{ textAlign: 'center', padding: spacing[2], background: palette.blue.light3, borderRadius: '4px' }}>
                  <Body size="small" style={{ color: palette.blue.dark1 }}>Final Weight</Body>
                  <Body weight="medium" style={{ color: palette.blue.dark1 }}>{detail.weight?.toFixed(4)}</Body>
                </div>
                <div style={{ textAlign: 'center', padding: spacing[2], background: palette.green.light3, borderRadius: '4px' }}>
                  <Body size="small" style={{ color: palette.green.dark1 }}>Contribution</Body>
                  <Body weight="medium" style={{ color: palette.green.dark1 }}>{detail.contribution?.toFixed(4)}</Body>
                </div>
              </div>

              {/* Explanation for this match */}
              <div style={{
                padding: spacing[2],
                background: palette.yellow.light3,
                borderRadius: '4px',
                border: `1px solid ${palette.yellow.light1}`
              }}>
                <Body size="small">
                  <strong>Why this matters:</strong> This transaction is{' '}
                  {detail.similarity > 0.8 ? 'very similar' : detail.similarity > 0.6 ? 'moderately similar' : 'somewhat similar'}{' '}
                  ({(detail.similarity * 100).toFixed(1)}%) to a{' '}
                  {detail.risk_score > 0.8 ? 'high-risk' : detail.risk_score > 0.5 ? 'medium-risk' : 'low-risk'}{' '}
                  transaction with {detail.flags || 0} risk flag{detail.flags !== 1 ? 's' : ''}.{' '}
                  {detail.flags > 2 ? 'Multiple flags make this match especially concerning.' : ''}
                </Body>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderComponents = () => {
    if (!components || Object.keys(components).length === 0) return null;

    return (
      <div style={{ marginTop: spacing[3] }}>
        <Subtitle style={{ marginBottom: spacing[2] }}>Calculation Components:</Subtitle>
        <div style={{
          padding: spacing[3],
          background: palette.gray.light2,
          borderRadius: '4px',
          border: '1px solid #e8edeb'
        }}>
          {/* Weighted Average */}
          {components.weighted_average !== undefined && (
            <div style={{ marginBottom: spacing[2] }}>
              <Body weight="medium">Weighted Average: </Body>
              <span style={{ 
                fontFamily: 'monospace', 
                backgroundColor: palette.gray.light3, 
                padding: '2px 6px', 
                borderRadius: '3px',
                fontWeight: 'bold',
                color: palette.blue.dark1
              }}>
                {components.weighted_average.toFixed(4)}
              </span>
            </div>
          )}

          {/* Multiple Match Boost */}
          {components.multiple_match_boost !== undefined && (
            <div style={{ marginBottom: spacing[2] }}>
              <Body weight="medium">Multiple Match Boost: </Body>
              <span style={{ 
                fontFamily: 'monospace', 
                backgroundColor: palette.gray.light3, 
                padding: '2px 6px', 
                borderRadius: '3px',
                fontWeight: 'bold',
                color: palette.green.dark1
              }}>
                +{components.multiple_match_boost.toFixed(4)}
              </span>
            </div>
          )}

          {/* Average Similarity */}
          {components.average_similarity !== undefined && (
            <div style={{ marginBottom: spacing[2] }}>
              <Body weight="medium">Average Similarity: </Body>
              <span style={{ 
                fontFamily: 'monospace', 
                backgroundColor: palette.gray.light3, 
                padding: '2px 6px', 
                borderRadius: '3px',
                fontWeight: 'bold',
                color: palette.blue.dark1
              }}>
                {components.average_similarity.toFixed(4)}
              </span>
            </div>
          )}

          {/* Inverse Factor */}
          {components.inverse_factor !== undefined && (
            <div style={{ marginBottom: spacing[2] }}>
              <Body weight="medium">Inverse Factor: </Body>
              <span style={{ 
                fontFamily: 'monospace', 
                backgroundColor: palette.gray.light3, 
                padding: '2px 6px', 
                borderRadius: '3px',
                fontWeight: 'bold',
                color: palette.blue.dark1
              }}>
                {components.inverse_factor.toFixed(4)}
              </span>
            </div>
          )}

          {/* Total Weighted Sum and Weight */}
          {components.total_weighted_sum !== undefined && components.total_weight !== undefined && (
            <div style={{ marginBottom: spacing[2] }}>
              <Body weight="medium">Calculation: </Body>
              <span style={{ 
                fontFamily: 'monospace', 
                backgroundColor: palette.gray.light3, 
                padding: '2px 6px', 
                borderRadius: '3px',
                fontWeight: 'bold',
                color: palette.blue.dark1
              }}>
                {components.total_weighted_sum.toFixed(4)} ÷ {components.total_weight.toFixed(4)}
              </span>
            </div>
          )}

          {/* Transaction Count */}
          {components.transaction_count !== undefined && (
            <div style={{ marginBottom: spacing[2] }}>
              <Body weight="medium">Total Transactions in Database: </Body>
              <span style={{ 
                fontFamily: 'monospace', 
                backgroundColor: palette.gray.light3, 
                padding: '2px 6px', 
                borderRadius: '3px',
                fontWeight: 'bold',
                color: palette.blue.dark1
              }}>
                {components.transaction_count}
              </span>
            </div>
          )}

          {/* Error Message */}
          {components.error && (
            <div style={{ marginBottom: spacing[2] }}>
              <Body weight="medium" style={{ color: palette.red.base }}>Error: </Body>
              <span style={{ 
                fontFamily: 'monospace', 
                backgroundColor: palette.red.light3, 
                padding: '2px 6px', 
                borderRadius: '3px',
                fontWeight: 'bold',
                color: palette.red.dark1
              }}>
                {components.error}
              </span>
            </div>
          )}

          {/* Fallback Reason */}
          {components.fallback_reason && (
            <div>
              <Body weight="medium" style={{ color: palette.yellow.dark2 }}>Fallback Reason: </Body>
              <Body size="small">{components.fallback_reason}</Body>
            </div>
          )}
        </div>

        {/* Render weight details if available */}
        {components.weight_details && renderWeightDetails(components.weight_details)}
      </div>
    );
  };

  return (
    <div style={{ marginTop: spacing[3] }}>
      <ExpandableCard
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2] }}>
            <Icon glyph="Math" fill={methodColor} />
            <div>
              <Subtitle>Vector Search Risk Score Calculation</Subtitle>
            </div>
            <div style={{ marginLeft: 'auto' }}>
              <Badge variant="blue">
                Score: {Math.round(similarityRiskScore * 100)}
              </Badge>
            </div>
          </div>
        }
        description="Click to see the detailed mathematical breakdown of how the vector search risk score was calculated"
        isOpen={expanded}
        onClick={() => setExpanded(!expanded)}
      >
        <div style={{ padding: spacing[3] }}>
          {/* Match Distribution Summary */}
          <div style={{ 
            marginBottom: spacing[4],
            padding: spacing[3],
            background: palette.blue.light3,
            borderRadius: '6px',
            border: `1px solid ${palette.blue.light1}`
          }}>
            <H3 style={{ marginBottom: spacing[2], color: palette.blue.dark2 }}>
              Match Distribution Summary
            </H3>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', 
              gap: spacing[2] 
            }}>
              <div style={{ textAlign: 'center' }}>
                <Body weight="medium" style={{ color: palette.red.dark1 }}>High Risk</Body>
                <H3 style={{ color: palette.red.base }}>{high_risk_matches}</H3>
              </div>
              <div style={{ textAlign: 'center' }}>
                <Body weight="medium" style={{ color: palette.yellow.dark2 }}>Medium Risk</Body>
                <H3 style={{ color: palette.yellow.dark1 }}>{medium_risk_matches}</H3>
              </div>
              <div style={{ textAlign: 'center' }}>
                <Body weight="medium" style={{ color: palette.green.dark1 }}>Low Risk</Body>
                <H3 style={{ color: palette.green.base }}>{low_risk_matches}</H3>
              </div>
              <div style={{ textAlign: 'center' }}>
                <Body weight="medium" style={{ color: palette.blue.dark1 }}>Total Matches</Body>
                <H3 style={{ color: palette.blue.base }}>{total_matches}</H3>
              </div>
            </div>
          </div>


          {/* Enhanced Step-by-Step Calculation - Only for High Risk */}
          {method.includes('High Risk') && components.weight_details && (
            <div style={{ marginBottom: spacing[4] }}>
              <H3 style={{ marginBottom: spacing[3], color: palette.green.dark2 }}>
                📊 Step-by-Step Calculation Process
              </H3>
              
              <div>
                {/* Step 1: Individual Weight Details */}
                {renderWeightDetails(components.weight_details)}

                {/* Step 2: Weighted Average */}
                <div style={{
                  marginBottom: spacing[3],
                  padding: spacing[3],
                  background: palette.green.light3,
                  borderRadius: '6px',
                  border: `1px solid ${palette.green.light1}`
                }}>
                  <H3 style={{ marginBottom: spacing[2], color: palette.green.dark2 }}>
                    ⚖️ Step 2: Calculate Weighted Average
                  </H3>
                  <Body style={{ marginBottom: spacing[2] }}>
                    Now we combine all the weighted contributions to get an average risk score:
                  </Body>
                  
                  <div style={{
                    fontFamily: 'monospace',
                    background: 'white',
                    padding: spacing[3],
                    borderRadius: '4px',
                    border: '1px solid #e8edeb',
                    marginBottom: spacing[2]
                  }}>
                    <div style={{ marginBottom: spacing[1] }}>
                      <Body weight="medium">Weighted Average = Sum of Contributions ÷ Sum of Weights</Body>
                    </div>
                    <div style={{ color: palette.blue.dark1 }}>
                      Weighted Average = {components.total_weighted_sum?.toFixed(4)} ÷ {components.total_weight?.toFixed(4)}
                    </div>
                    <div style={{ color: palette.green.dark1, fontWeight: 'bold', fontSize: '16px' }}>
                      Weighted Average = {components.weighted_average?.toFixed(4)}
                    </div>
                  </div>
                  
                  <Body size="small" style={{ fontStyle: 'italic' }}>
                    💡 <strong>Why weighted average?</strong> This ensures transactions that are more similar and have more risk flags have greater influence on the final score.
                  </Body>
                </div>

                {/* Step 3: Multiple Match Boost */}
                <div style={{
                  marginBottom: spacing[3],
                  padding: spacing[3],
                  background: palette.red.light3,
                  borderRadius: '6px',
                  border: `1px solid ${palette.red.light1}`
                }}>
                  <H3 style={{ marginBottom: spacing[2], color: palette.red.dark2 }}>
                    🚨 Step 3: Multiple High-Risk Match Boost
                  </H3>
                  <Body style={{ marginBottom: spacing[2] }}>
                    Since we found <strong>{high_risk_matches} high-risk matches</strong>, we add a boost because multiple concerning patterns is especially risky:
                  </Body>
                  
                  <div style={{
                    fontFamily: 'monospace',
                    background: 'white',
                    padding: spacing[3],
                    borderRadius: '4px',
                    border: '1px solid #e8edeb',
                    marginBottom: spacing[2]
                  }}>
                    <div style={{ marginBottom: spacing[1] }}>
                      <Body weight="medium">Boost = min(0.2, Number of High-Risk Matches × 0.05)</Body>
                    </div>
                    <div style={{ color: palette.blue.dark1 }}>
                      Boost = min(0.2, {high_risk_matches} × 0.05)
                    </div>
                    <div style={{ color: palette.blue.dark1 }}>
                      Boost = min(0.2, {(high_risk_matches * 0.05).toFixed(2)})
                    </div>
                    <div style={{ color: palette.red.dark1, fontWeight: 'bold', fontSize: '16px' }}>
                      Boost = {components.multiple_match_boost?.toFixed(4)}
                    </div>
                  </div>
                  
                  <Body size="small" style={{ fontStyle: 'italic' }}>
                    💡 <strong>Why the boost?</strong> Finding multiple high-risk similar transactions is unusual and indicates the current transaction follows a concerning pattern.
                  </Body>
                </div>

                {/* Step 4: Final Score */}
                <div style={{
                  marginBottom: spacing[3],
                  padding: spacing[4],
                  background: `linear-gradient(135deg, ${palette.blue.light3}, ${palette.green.light3})`,
                  borderRadius: '8px',
                  border: `2px solid ${palette.blue.base}`,
                  textAlign: 'center'
                }}>
                  <H3 style={{ marginBottom: spacing[2], color: palette.blue.dark2 }}>
                    🎯 Step 4: Final Risk Score
                  </H3>
                  
                  <div style={{
                    fontFamily: 'monospace',
                    background: 'white',
                    padding: spacing[3],
                    borderRadius: '6px',
                    border: '1px solid #e8edeb',
                    marginBottom: spacing[2],
                    fontSize: '18px'
                  }}>
                    <div style={{ marginBottom: spacing[2] }}>
                      <Body weight="medium">Final Score = Weighted Average + Boost</Body>
                    </div>
                    <div style={{ color: palette.blue.dark1, marginBottom: spacing[1] }}>
                      Final Score = {components.weighted_average?.toFixed(4)} + {components.multiple_match_boost?.toFixed(4)}
                    </div>
                    <div style={{ 
                      color: palette.red.dark1, 
                      fontWeight: 'bold', 
                      fontSize: '24px',
                      padding: spacing[2],
                      background: palette.yellow.light3,
                      borderRadius: '4px'
                    }}>
                      Final Score = {Math.round(similarityRiskScore * 100)}%
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Enhanced Result Summary and Algorithm Explanation - Only for High Risk */}
          {method.includes('High Risk') && (
            <div style={{ 
              marginTop: spacing[4],
              padding: spacing[4],
              background: `linear-gradient(135deg, ${palette.yellow.light3}, ${palette.green.light3})`,
              borderRadius: '8px',
              border: `2px solid ${palette.yellow.base}`
            }}>
              <H3 style={{ marginBottom: spacing[3], color: palette.yellow.dark2, textAlign: 'center' }}>
                🎯 Why This Algorithm Works & What The Result Means
              </H3>
              
              <div>
                <div style={{
                  marginBottom: spacing[3],
                  padding: spacing[3],
                  background: 'white',
                  borderRadius: '6px',
                  border: '1px solid #e8edeb'
                }}>
                  <H3 style={{ marginBottom: spacing[2], color: palette.red.dark1 }}>
                    🚨 Final Result: {Math.round(similarityRiskScore * 100)}% Risk Score
                  </H3>
                  <Body style={{ marginBottom: spacing[2] }}>
                    This transaction scored <strong>{Math.round(similarityRiskScore * 100)}%</strong> because it's similar to{' '}
                    <strong>{high_risk_matches} different high-risk transactions</strong> that had concerning patterns.
                  </Body>
                  
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                    gap: spacing[2],
                    marginTop: spacing[2]
                  }}>
                    <div style={{ padding: spacing[2], background: palette.red.light3, borderRadius: '4px' }}>
                      <Body size="small" weight="medium">Similarity Range:</Body>
                      <Body size="small">
                        {components.weight_details && 
                          `${Math.min(...components.weight_details.map(d => d.similarity * 100)).toFixed(0)}% - ${Math.max(...components.weight_details.map(d => d.similarity * 100)).toFixed(0)}%`}
                      </Body>
                    </div>
                    <div style={{ padding: spacing[2], background: palette.red.light3, borderRadius: '4px' }}>
                      <Body size="small" weight="medium">Risk Flags:</Body>
                      <Body size="small">
                        {components.weight_details && 
                          `${Math.min(...components.weight_details.map(d => d.flags))} - ${Math.max(...components.weight_details.map(d => d.flags))} per match`}
                      </Body>
                    </div>
                    <div style={{ padding: spacing[2], background: palette.red.light3, borderRadius: '4px' }}>
                      <Body size="small" weight="medium">Pattern Boost:</Body>
                      <Body size="small">+{Math.round((components.multiple_match_boost || 0) * 100)}% for multiple matches</Body>
                    </div>
                  </div>
                </div>

                <div style={{
                  marginBottom: spacing[3],
                  padding: spacing[3],
                  background: palette.blue.light3,
                  borderRadius: '6px',
                  border: `1px solid ${palette.blue.light1}`
                }}>
                  <H3 style={{ marginBottom: spacing[2], color: palette.blue.dark2 }}>
                    Why This Algorithm Is Effective
                  </H3>
                  <div style={{ display: 'grid', gap: spacing[2] }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: spacing[2] }}>
                      <span style={{ fontSize: '20px' }}>⚖️</span>
                      <div>
                        <Body weight="medium">Smart Weighting:</Body>
                        <Body size="small">More similar transactions and those with more risk flags get higher influence on the final score.</Body>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: spacing[2] }}>
                      <span style={{ fontSize: '20px' }}>📊</span>
                      <div>
                        <Body weight="medium">Pattern Recognition:</Body>
                        <Body size="small">Multiple high-risk matches indicate a concerning behavioral pattern, not just coincidence.</Body>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: spacing[2] }}>
                      <span style={{ fontSize: '20px' }}>🎯</span>
                      <div>
                        <Body weight="medium">Prevents False Positives:</Body>
                        <Body size="small">Single outliers don't dominate - the algorithm considers the overall pattern of evidence.</Body>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: spacing[2] }}>
                      <span style={{ fontSize: '20px' }}>🔍</span>
                      <div>
                        <Body weight="medium">Context Awareness:</Body>
                        <Body size="small">The system understands that finding multiple concerning patterns is exponentially more risky.</Body>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </ExpandableCard>
    </div>
  );
}