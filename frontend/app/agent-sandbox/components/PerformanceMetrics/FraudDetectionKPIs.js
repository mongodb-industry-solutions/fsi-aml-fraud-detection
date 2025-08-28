'use client';

import React from 'react';
import { H3, Body, Overline } from '@leafygreen-ui/typography';
import { palette } from '@leafygreen-ui/palette';
import { spacing } from '@leafygreen-ui/tokens';
import Card from '@leafygreen-ui/card';
import Badge from '@leafygreen-ui/badge';

const FraudDetectionKPIs = ({ metrics, selectedScenario, isSimulationRunning }) => {
  // Calculate derived metrics
  const truePositiveRate = Math.round((metrics.accuracy + Math.random() * 2 - 1) * 100) / 100;
  const precisionRate = Math.round((96 + Math.random() * 3) * 100) / 100;
  const recallRate = Math.round((93 + Math.random() * 4) * 100) / 100;
  const f1Score = Math.round((2 * (precisionRate * recallRate) / (precisionRate + recallRate)) * 100) / 100;

  // Risk distribution simulation
  const riskDistribution = {
    critical: Math.round(3 + Math.random() * 2),
    high: Math.round(12 + Math.random() * 5),
    medium: Math.round(25 + Math.random() * 8),
    low: Math.round(60 + Math.random() * 10)
  };

  // Transaction volume simulation
  const transactionVolume = {
    processed: Math.round(85000 + Math.random() * 15000),
    flagged: Math.round(2100 + Math.random() * 400),
    blocked: Math.round(180 + Math.random() * 40),
    reviewed: Math.round(420 + Math.random() * 80)
  };

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
      gap: spacing[4]
    }}>
      {/* Detection Performance Metrics */}
      <Card style={{ padding: spacing[3] }}>
        <H3 style={{
          fontSize: '16px',
          color: palette.gray.dark3,
          marginBottom: spacing[3],
          fontFamily: "'Euclid Circular A', sans-serif"
        }}>
          Detection Performance
        </H3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[3] }}>
          {/* Accuracy */}
          <div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: spacing[1]
            }}>
              <Overline style={{
                fontSize: '11px',
                color: palette.gray.dark1,
                margin: 0
              }}>
                Overall Accuracy
              </Overline>
              <Body style={{
                fontSize: '14px',
                fontWeight: 600,
                color: palette.green.dark2,
                margin: 0
              }}>
                {metrics.accuracy}%
              </Body>
            </div>
            <div style={{
              height: '6px',
              borderRadius: '3px',
              background: palette.gray.light2,
              overflow: 'hidden'
            }}>
              <div style={{
                height: '100%',
                width: `${metrics.accuracy}%`,
                background: palette.green.base,
                transition: 'width 0.5s ease'
              }} />
            </div>
          </div>

          {/* Precision */}
          <div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: spacing[1]
            }}>
              <Overline style={{
                fontSize: '11px',
                color: palette.gray.dark1,
                margin: 0
              }}>
                Precision
              </Overline>
              <Body style={{
                fontSize: '14px',
                fontWeight: 600,
                color: palette.blue.dark2,
                margin: 0
              }}>
                {precisionRate}%
              </Body>
            </div>
            <div style={{
              height: '6px',
              borderRadius: '3px',
              background: palette.gray.light2,
              overflow: 'hidden'
            }}>
              <div style={{
                height: '100%',
                width: `${precisionRate}%`,
                background: palette.blue.base,
                transition: 'width 0.5s ease'
              }} />
            </div>
          </div>

          {/* Recall */}
          <div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: spacing[1]
            }}>
              <Overline style={{
                fontSize: '11px',
                color: palette.gray.dark1,
                margin: 0
              }}>
                Recall (Sensitivity)
              </Overline>
              <Body style={{
                fontSize: '14px',
                fontWeight: 600,
                color: palette.yellow.dark2,
                margin: 0
              }}>
                {recallRate}%
              </Body>
            </div>
            <div style={{
              height: '6px',
              borderRadius: '3px',
              background: palette.gray.light2,
              overflow: 'hidden'
            }}>
              <div style={{
                height: '100%',
                width: `${recallRate}%`,
                background: palette.yellow.base,
                transition: 'width 0.5s ease'
              }} />
            </div>
          </div>

          {/* F1 Score */}
          <div style={{
            padding: spacing[2],
            background: palette.green.light3,
            borderRadius: '6px',
            textAlign: 'center'
          }}>
            <Body style={{
              fontSize: '18px',
              fontWeight: 700,
              color: palette.green.dark2,
              margin: 0,
              marginBottom: '4px'
            }}>
              {f1Score}%
            </Body>
            <Overline style={{
              fontSize: '10px',
              color: palette.green.dark1,
              margin: 0
            }}>
              F1 Score (Harmonic Mean)
            </Overline>
          </div>
        </div>
      </Card>

      {/* Risk Level Distribution */}
      <Card style={{ padding: spacing[3] }}>
        <H3 style={{
          fontSize: '16px',
          color: palette.gray.dark3,
          marginBottom: spacing[3],
          fontFamily: "'Euclid Circular A', sans-serif"
        }}>
          Risk Level Distribution
        </H3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[2] }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: spacing[2],
            background: palette.red.light3,
            borderRadius: '6px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2] }}>
              <Badge variant="red" size="small">Critical</Badge>
              <Body style={{ fontSize: '12px', color: palette.gray.dark1, margin: 0 }}>
                Immediate action required
              </Body>
            </div>
            <Body style={{ fontSize: '16px', fontWeight: 600, color: palette.red.dark2, margin: 0 }}>
              {riskDistribution.critical}%
            </Body>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: spacing[2],
            background: palette.yellow.light3,
            borderRadius: '6px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2] }}>
              <Badge variant="yellow" size="small">High</Badge>
              <Body style={{ fontSize: '12px', color: palette.gray.dark1, margin: 0 }}>
                Manual review recommended
              </Body>
            </div>
            <Body style={{ fontSize: '16px', fontWeight: 600, color: palette.yellow.dark2, margin: 0 }}>
              {riskDistribution.high}%
            </Body>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: spacing[2],
            background: palette.blue.light3,
            borderRadius: '6px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2] }}>
              <Badge variant="blue" size="small">Medium</Badge>
              <Body style={{ fontSize: '12px', color: palette.gray.dark1, margin: 0 }}>
                Automated monitoring
              </Body>
            </div>
            <Body style={{ fontSize: '16px', fontWeight: 600, color: palette.blue.dark2, margin: 0 }}>
              {riskDistribution.medium}%
            </Body>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: spacing[2],
            background: palette.green.light3,
            borderRadius: '6px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2] }}>
              <Badge variant="green" size="small">Low</Badge>
              <Body style={{ fontSize: '12px', color: palette.gray.dark1, margin: 0 }}>
                Normal processing
              </Body>
            </div>
            <Body style={{ fontSize: '16px', fontWeight: 600, color: palette.green.dark2, margin: 0 }}>
              {riskDistribution.low}%
            </Body>
          </div>
        </div>
      </Card>

      {/* Transaction Volume Analytics */}
      <Card style={{ padding: spacing[3] }}>
        <H3 style={{
          fontSize: '16px',
          color: palette.gray.dark3,
          marginBottom: spacing[3],
          fontFamily: "'Euclid Circular A', sans-serif"
        }}>
          Transaction Volume (24h)
        </H3>

        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: spacing[3]
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{
              fontSize: '24px',
              fontWeight: 700,
              color: palette.blue.dark2,
              marginBottom: spacing[1],
              lineHeight: 1
            }}>
              {transactionVolume.processed.toLocaleString()}
            </div>
            <Overline style={{
              fontSize: '10px',
              color: palette.gray.dark1,
              margin: 0
            }}>
              Total Processed
            </Overline>
          </div>

          <div style={{ textAlign: 'center' }}>
            <div style={{
              fontSize: '24px',
              fontWeight: 700,
              color: palette.yellow.dark2,
              marginBottom: spacing[1],
              lineHeight: 1
            }}>
              {transactionVolume.flagged.toLocaleString()}
            </div>
            <Overline style={{
              fontSize: '10px',
              color: palette.gray.dark1,
              margin: 0
            }}>
              Flagged for Review
            </Overline>
          </div>

          <div style={{ textAlign: 'center' }}>
            <div style={{
              fontSize: '24px',
              fontWeight: 700,
              color: palette.red.dark2,
              marginBottom: spacing[1],
              lineHeight: 1
            }}>
              {transactionVolume.blocked.toLocaleString()}
            </div>
            <Overline style={{
              fontSize: '10px',
              color: palette.gray.dark1,
              margin: 0
            }}>
              Blocked
            </Overline>
          </div>

          <div style={{ textAlign: 'center' }}>
            <div style={{
              fontSize: '24px',
              fontWeight: 700,
              color: palette.green.dark2,
              marginBottom: spacing[1],
              lineHeight: 1
            }}>
              {transactionVolume.reviewed.toLocaleString()}
            </div>
            <Overline style={{
              fontSize: '10px',
              color: palette.gray.dark1,
              margin: 0
            }}>
              Manual Reviews
            </Overline>
          </div>
        </div>

        {/* Processing Rate Indicator */}
        <div style={{
          marginTop: spacing[3],
          padding: spacing[2],
          background: palette.gray.light3,
          borderRadius: '6px',
          textAlign: 'center'
        }}>
          <Body style={{
            fontSize: '14px',
            fontWeight: 600,
            color: palette.gray.dark3,
            margin: 0,
            marginBottom: '4px'
          }}>
            {Math.round(transactionVolume.processed / 24).toLocaleString()} TPS Average
          </Body>
          <Overline style={{
            fontSize: '10px',
            color: palette.gray.dark1,
            margin: 0
          }}>
            Transactions Per Hour
          </Overline>
        </div>
      </Card>

      {/* Model Performance Breakdown */}
      <Card style={{ padding: spacing[3] }}>
        <H3 style={{
          fontSize: '16px',
          color: palette.gray.dark3,
          marginBottom: spacing[3],
          fontFamily: "'Euclid Circular A', sans-serif"
        }}>
          Model Performance by Type
        </H3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[3] }}>
          {[
            { name: 'Credit Card Fraud', accuracy: 97.2, color: palette.blue.base },
            { name: 'Money Laundering', accuracy: 94.8, color: palette.green.base },
            { name: 'Account Takeover', accuracy: 92.1, color: palette.yellow.base },
            { name: 'Synthetic Identity', accuracy: 89.5, color: palette.red.base }
          ].map(model => (
            <div key={model.name}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: spacing[1]
              }}>
                <Body style={{
                  fontSize: '12px',
                  color: palette.gray.dark1,
                  margin: 0
                }}>
                  {model.name}
                </Body>
                <Body style={{
                  fontSize: '13px',
                  fontWeight: 600,
                  color: palette.gray.dark3,
                  margin: 0
                }}>
                  {model.accuracy}%
                </Body>
              </div>
              <div style={{
                height: '4px',
                borderRadius: '2px',
                background: palette.gray.light2,
                overflow: 'hidden'
              }}>
                <div style={{
                  height: '100%',
                  width: `${model.accuracy}%`,
                  background: model.color,
                  transition: 'width 0.5s ease'
                }} />
              </div>
            </div>
          ))}
        </div>

        {/* Current Scenario Highlight */}
        {selectedScenario && (
          <div style={{
            marginTop: spacing[3],
            padding: spacing[2],
            background: palette.blue.light3,
            borderRadius: '6px',
            border: `1px solid ${palette.blue.light2}`
          }}>
            <Overline style={{
              fontSize: '10px',
              color: palette.blue.dark2,
              margin: `0 0 ${spacing[1]}px 0`,
              textTransform: 'uppercase'
            }}>
              Active Scenario
            </Overline>
            <Body style={{
              fontSize: '12px',
              fontWeight: 600,
              color: palette.gray.dark3,
              margin: 0,
              marginBottom: '4px'
            }}>
              {selectedScenario.name}
            </Body>
            <Body style={{
              fontSize: '11px',
              color: palette.gray.dark1,
              margin: 0
            }}>
              Expected accuracy: {selectedScenario.expectedOutcome.confidence}% • 
              Risk level: {selectedScenario.riskLevel}
            </Body>
          </div>
        )}
      </Card>
    </div>
  );
};

export default FraudDetectionKPIs;