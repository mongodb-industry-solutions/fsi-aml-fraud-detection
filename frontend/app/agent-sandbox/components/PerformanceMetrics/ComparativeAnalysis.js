'use client';

import React, { useState } from 'react';
import { H3, Body, Overline } from '@leafygreen-ui/typography';
import { palette } from '@leafygreen-ui/palette';
import { spacing } from '@leafygreen-ui/tokens';
import Card from '@leafygreen-ui/card';
import Badge from '@leafygreen-ui/badge';
import Button from '@leafygreen-ui/button';

const ComparativeAnalysis = ({ metrics, historicalData, isSimulationRunning }) => {
  const [selectedTimeframe, setSelectedTimeframe] = useState('7d');
  const [selectedComparison, setSelectedComparison] = useState('patterns');

  // Generate trend data based on historical performance
  const generateTrendData = (timeframe) => {
    const baseData = {
      accuracy: metrics.accuracy,
      latency: metrics.avgLatency,
      throughput: metrics.throughput,
      falsePositives: metrics.falsePositiveRate,
      systemLoad: metrics.systemLoad
    };

    const dataPoints = timeframe === '7d' ? 7 : timeframe === '30d' ? 30 : 90;
    const trendData = [];

    for (let i = 0; i < dataPoints; i++) {
      const variance = Math.random() * 4 - 2; // ±2% variance
      trendData.push({
        day: i + 1,
        accuracy: Math.max(90, Math.min(100, baseData.accuracy + variance)),
        latency: Math.max(200, baseData.latency + (Math.random() * 200 - 100)),
        throughput: Math.max(1000, baseData.throughput + (Math.random() * 500 - 250)),
        falsePositives: Math.max(0, Math.min(10, baseData.falsePositives + (Math.random() * 1 - 0.5))),
        systemLoad: Math.max(30, Math.min(100, baseData.systemLoad + (Math.random() * 10 - 5)))
      });
    }

    return trendData;
  };

  const trendData = generateTrendData(selectedTimeframe);
  const latest = trendData[trendData.length - 1];
  const previous = trendData[trendData.length - 2];

  // Pattern performance comparison
  const patternComparison = [
    {
      name: 'Magentic Orchestration',
      accuracy: 96.2,
      avgLatency: 890,
      throughput: 2340,
      complexity: 'Medium',
      bestFor: 'Sequential fraud analysis',
      color: palette.blue.base
    },
    {
      name: 'Group Chat Collaboration',
      accuracy: 94.8,
      avgLatency: 1120,
      throughput: 1890,
      complexity: 'High',
      bestFor: 'Complex case debates',
      color: palette.green.base
    },
    {
      name: 'Concurrent Processing',
      accuracy: 95.5,
      avgLatency: 650,
      throughput: 3200,
      complexity: 'Low',
      bestFor: 'High-volume processing',
      color: palette.yellow.dark1
    }
  ];

  // Scenario performance comparison
  const scenarioComparison = [
    {
      name: 'Money Laundering Detection',
      detectionRate: 97.1,
      avgProcessingTime: 2.3,
      confidenceScore: 94.2,
      alertsGenerated: 127,
      severity: 'Critical'
    },
    {
      name: 'Card Testing Prevention',
      detectionRate: 98.5,
      avgProcessingTime: 0.8,
      confidenceScore: 96.8,
      alertsGenerated: 89,
      severity: 'High'
    },
    {
      name: 'Account Takeover Defense',
      detectionRate: 93.2,
      avgProcessingTime: 1.5,
      confidenceScore: 91.7,
      alertsGenerated: 156,
      severity: 'High'
    }
  ];

  // Calculate trend indicators
  const getTrendIndicator = (current, previous) => {
    const diff = current - previous;
    const percentage = Math.abs((diff / previous) * 100).toFixed(1);
    return {
      direction: diff > 0 ? 'up' : diff < 0 ? 'down' : 'stable',
      percentage,
      isPositive: diff > 0
    };
  };

  const trends = {
    accuracy: getTrendIndicator(latest.accuracy, previous.accuracy),
    latency: getTrendIndicator(latest.latency, previous.latency),
    throughput: getTrendIndicator(latest.throughput, previous.throughput),
    falsePositives: getTrendIndicator(latest.falsePositives, previous.falsePositives)
  };

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '1fr',
      gap: spacing[4]
    }}>
      {/* Controls and Filters */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: spacing[3],
        background: palette.gray.light3,
        borderRadius: '8px'
      }}>
        <div style={{ display: 'flex', gap: spacing[2] }}>
          <Button
            variant={selectedTimeframe === '7d' ? 'primary' : 'default'}
            size="small"
            onClick={() => setSelectedTimeframe('7d')}
          >
            7 Days
          </Button>
          <Button
            variant={selectedTimeframe === '30d' ? 'primary' : 'default'}
            size="small"
            onClick={() => setSelectedTimeframe('30d')}
          >
            30 Days
          </Button>
          <Button
            variant={selectedTimeframe === '90d' ? 'primary' : 'default'}
            size="small"
            onClick={() => setSelectedTimeframe('90d')}
          >
            90 Days
          </Button>
        </div>
        
        <div style={{ display: 'flex', gap: spacing[2] }}>
          <Button
            variant={selectedComparison === 'patterns' ? 'primary' : 'default'}
            size="small"
            onClick={() => setSelectedComparison('patterns')}
          >
            Patterns
          </Button>
          <Button
            variant={selectedComparison === 'scenarios' ? 'primary' : 'default'}
            size="small"
            onClick={() => setSelectedComparison('scenarios')}
          >
            Scenarios
          </Button>
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
        gap: spacing[4]
      }}>
        {/* Performance Trends */}
        <Card style={{ padding: spacing[3] }}>
          <H3 style={{
            fontSize: '16px',
            color: palette.gray.dark3,
            marginBottom: spacing[3],
            fontFamily: "'Euclid Circular A', sans-serif"
          }}>
            Performance Trends ({selectedTimeframe})
          </H3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[3] }}>
            {/* Accuracy Trend */}
            <div style={{
              padding: spacing[2],
              border: `1px solid ${palette.gray.light2}`,
              borderRadius: '6px'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: spacing[1]
              }}>
                <Body style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: palette.gray.dark3,
                  margin: 0
                }}>
                  Detection Accuracy
                </Body>
                <div style={{ display: 'flex', alignItems: 'center', gap: spacing[1] }}>
                  <span style={{
                    fontSize: '10px',
                    color: trends.accuracy.isPositive ? palette.green.base : palette.red.base,
                    fontWeight: 600
                  }}>
                    {trends.accuracy.direction === 'up' ? '↗' : trends.accuracy.direction === 'down' ? '↘' : '→'}
                    {trends.accuracy.percentage}%
                  </span>
                  <Body style={{
                    fontSize: '14px',
                    fontWeight: 700,
                    color: palette.green.dark2,
                    margin: 0
                  }}>
                    {latest.accuracy.toFixed(1)}%
                  </Body>
                </div>
              </div>
              <div style={{
                height: '4px',
                background: palette.gray.light2,
                borderRadius: '2px',
                overflow: 'hidden'
              }}>
                <div style={{
                  height: '100%',
                  width: `${latest.accuracy}%`,
                  background: palette.green.base,
                  transition: 'width 0.5s ease'
                }} />
              </div>
            </div>

            {/* Latency Trend */}
            <div style={{
              padding: spacing[2],
              border: `1px solid ${palette.gray.light2}`,
              borderRadius: '6px'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: spacing[1]
              }}>
                <Body style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: palette.gray.dark3,
                  margin: 0
                }}>
                  Average Latency
                </Body>
                <div style={{ display: 'flex', alignItems: 'center', gap: spacing[1] }}>
                  <span style={{
                    fontSize: '10px',
                    color: !trends.latency.isPositive ? palette.green.base : palette.red.base,
                    fontWeight: 600
                  }}>
                    {trends.latency.direction === 'up' ? '↗' : trends.latency.direction === 'down' ? '↘' : '→'}
                    {trends.latency.percentage}%
                  </span>
                  <Body style={{
                    fontSize: '14px',
                    fontWeight: 700,
                    color: palette.blue.dark2,
                    margin: 0
                  }}>
                    {Math.round(latest.latency)}ms
                  </Body>
                </div>
              </div>
              <div style={{
                height: '4px',
                background: palette.gray.light2,
                borderRadius: '2px',
                overflow: 'hidden'
              }}>
                <div style={{
                  height: '100%',
                  width: `${Math.min(100, (2000 - latest.latency) / 2000 * 100)}%`,
                  background: palette.blue.base,
                  transition: 'width 0.5s ease'
                }} />
              </div>
            </div>

            {/* Throughput Trend */}
            <div style={{
              padding: spacing[2],
              border: `1px solid ${palette.gray.light2}`,
              borderRadius: '6px'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: spacing[1]
              }}>
                <Body style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: palette.gray.dark3,
                  margin: 0
                }}>
                  Processing Throughput
                </Body>
                <div style={{ display: 'flex', alignItems: 'center', gap: spacing[1] }}>
                  <span style={{
                    fontSize: '10px',
                    color: trends.throughput.isPositive ? palette.green.base : palette.red.base,
                    fontWeight: 600
                  }}>
                    {trends.throughput.direction === 'up' ? '↗' : trends.throughput.direction === 'down' ? '↘' : '→'}
                    {trends.throughput.percentage}%
                  </span>
                  <Body style={{
                    fontSize: '14px',
                    fontWeight: 700,
                    color: palette.yellow.dark2,
                    margin: 0
                  }}>
                    {Math.round(latest.throughput)}
                  </Body>
                </div>
              </div>
              <div style={{
                height: '4px',
                background: palette.gray.light2,
                borderRadius: '2px',
                overflow: 'hidden'
              }}>
                <div style={{
                  height: '100%',
                  width: `${Math.min(100, latest.throughput / 4000 * 100)}%`,
                  background: palette.yellow.base,
                  transition: 'width 0.5s ease'
                }} />
              </div>
            </div>

            {/* False Positives Trend */}
            <div style={{
              padding: spacing[2],
              border: `1px solid ${palette.gray.light2}`,
              borderRadius: '6px'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: spacing[1]
              }}>
                <Body style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: palette.gray.dark3,
                  margin: 0
                }}>
                  False Positive Rate
                </Body>
                <div style={{ display: 'flex', alignItems: 'center', gap: spacing[1] }}>
                  <span style={{
                    fontSize: '10px',
                    color: !trends.falsePositives.isPositive ? palette.green.base : palette.red.base,
                    fontWeight: 600
                  }}>
                    {trends.falsePositives.direction === 'up' ? '↗' : trends.falsePositives.direction === 'down' ? '↘' : '→'}
                    {trends.falsePositives.percentage}%
                  </span>
                  <Body style={{
                    fontSize: '14px',
                    fontWeight: 700,
                    color: palette.red.dark2,
                    margin: 0
                  }}>
                    {latest.falsePositives.toFixed(1)}%
                  </Body>
                </div>
              </div>
              <div style={{
                height: '4px',
                background: palette.gray.light2,
                borderRadius: '2px',
                overflow: 'hidden'
              }}>
                <div style={{
                  height: '100%',
                  width: `${Math.max(0, 100 - (latest.falsePositives * 10))}%`,
                  background: latest.falsePositives < 3 ? palette.green.base : palette.yellow.base,
                  transition: 'width 0.5s ease'
                }} />
              </div>
            </div>
          </div>
        </Card>

        {/* Comparative Performance Analysis */}
        <Card style={{ padding: spacing[3] }}>
          <H3 style={{
            fontSize: '16px',
            color: palette.gray.dark3,
            marginBottom: spacing[3],
            fontFamily: "'Euclid Circular A', sans-serif"
          }}>
            {selectedComparison === 'patterns' ? 'Orchestration Pattern' : 'Fraud Scenario'} Comparison
          </H3>

          {selectedComparison === 'patterns' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[2] }}>
              {patternComparison.map((pattern, index) => (
                <div
                  key={pattern.name}
                  style={{
                    padding: spacing[3],
                    border: `1px solid ${pattern.color}`,
                    borderRadius: '8px',
                    background: `${pattern.color}08`
                  }}
                >
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: spacing[2]
                  }}>
                    <Body style={{
                      fontSize: '14px',
                      fontWeight: 600,
                      color: palette.gray.dark3,
                      margin: 0
                    }}>
                      {pattern.name}
                    </Body>
                    <Badge variant={index === 0 ? 'green' : 'blue'} size="small">
                      {pattern.complexity}
                    </Badge>
                  </div>

                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: spacing[2],
                    marginBottom: spacing[2]
                  }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{
                        fontSize: '16px',
                        fontWeight: 700,
                        color: pattern.color
                      }}>
                        {pattern.accuracy}%
                      </div>
                      <Overline style={{
                        fontSize: '9px',
                        color: palette.gray.dark1,
                        margin: 0
                      }}>
                        Accuracy
                      </Overline>
                    </div>

                    <div style={{ textAlign: 'center' }}>
                      <div style={{
                        fontSize: '16px',
                        fontWeight: 700,
                        color: pattern.color
                      }}>
                        {pattern.avgLatency}ms
                      </div>
                      <Overline style={{
                        fontSize: '9px',
                        color: palette.gray.dark1,
                        margin: 0
                      }}>
                        Latency
                      </Overline>
                    </div>

                    <div style={{ textAlign: 'center' }}>
                      <div style={{
                        fontSize: '16px',
                        fontWeight: 700,
                        color: pattern.color
                      }}>
                        {pattern.throughput}
                      </div>
                      <Overline style={{
                        fontSize: '9px',
                        color: palette.gray.dark1,
                        margin: 0
                      }}>
                        Throughput
                      </Overline>
                    </div>
                  </div>

                  <Body style={{
                    fontSize: '11px',
                    color: palette.gray.dark1,
                    margin: 0,
                    fontStyle: 'italic'
                  }}>
                    Best for: {pattern.bestFor}
                  </Body>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[2] }}>
              {scenarioComparison.map((scenario, index) => (
                <div
                  key={scenario.name}
                  style={{
                    padding: spacing[3],
                    border: `1px solid ${palette.gray.light2}`,
                    borderRadius: '8px',
                    background: palette.white
                  }}
                >
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: spacing[2]
                  }}>
                    <Body style={{
                      fontSize: '14px',
                      fontWeight: 600,
                      color: palette.gray.dark3,
                      margin: 0
                    }}>
                      {scenario.name}
                    </Body>
                    <Badge variant={scenario.severity === 'Critical' ? 'red' : 'yellow'} size="small">
                      {scenario.severity}
                    </Badge>
                  </div>

                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: spacing[2]
                  }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{
                        fontSize: '14px',
                        fontWeight: 700,
                        color: scenario.detectionRate > 95 ? palette.green.dark2 : palette.yellow.dark2
                      }}>
                        {scenario.detectionRate}%
                      </div>
                      <Overline style={{
                        fontSize: '9px',
                        color: palette.gray.dark1,
                        margin: 0
                      }}>
                        Detection
                      </Overline>
                    </div>

                    <div style={{ textAlign: 'center' }}>
                      <div style={{
                        fontSize: '14px',
                        fontWeight: 700,
                        color: palette.blue.dark2
                      }}>
                        {scenario.avgProcessingTime}s
                      </div>
                      <Overline style={{
                        fontSize: '9px',
                        color: palette.gray.dark1,
                        margin: 0
                      }}>
                        Time
                      </Overline>
                    </div>

                    <div style={{ textAlign: 'center' }}>
                      <div style={{
                        fontSize: '14px',
                        fontWeight: 700,
                        color: palette.green.dark2
                      }}>
                        {scenario.confidenceScore}%
                      </div>
                      <Overline style={{
                        fontSize: '9px',
                        color: palette.gray.dark1,
                        margin: 0
                      }}>
                        Confidence
                      </Overline>
                    </div>

                    <div style={{ textAlign: 'center' }}>
                      <div style={{
                        fontSize: '14px',
                        fontWeight: 700,
                        color: palette.yellow.dark2
                      }}>
                        {scenario.alertsGenerated}
                      </div>
                      <Overline style={{
                        fontSize: '9px',
                        color: palette.gray.dark1,
                        margin: 0
                      }}>
                        Alerts
                      </Overline>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Performance Insights */}
        <Card style={{ padding: spacing[3] }}>
          <H3 style={{
            fontSize: '16px',
            color: palette.gray.dark3,
            marginBottom: spacing[3],
            fontFamily: "'Euclid Circular A', sans-serif"
          }}>
            Performance Insights
          </H3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[3] }}>
            {/* Key Insight */}
            <div style={{
              padding: spacing[3],
              background: palette.green.light3,
              borderRadius: '8px',
              border: `1px solid ${palette.green.light2}`
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2], marginBottom: spacing[2] }}>
                <div style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: palette.green.base,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px'
                }}>
                  ✓
                </div>
                <Body style={{
                  fontSize: '14px',
                  fontWeight: 600,
                  color: palette.green.dark2,
                  margin: 0
                }}>
                  Optimal Performance Detected
                </Body>
              </div>
              <Body style={{
                fontSize: '12px',
                color: palette.gray.dark1,
                margin: 0
              }}>
                Your fraud detection accuracy has improved by 2.3% over the last {selectedTimeframe}, 
                while maintaining consistent latency under 1000ms.
              </Body>
            </div>

            {/* Recommendation */}
            <div style={{
              padding: spacing[3],
              background: palette.blue.light3,
              borderRadius: '8px',
              border: `1px solid ${palette.blue.light2}`
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2], marginBottom: spacing[2] }}>
                <div style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: palette.blue.base,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  color: palette.white
                }}>
                  💡
                </div>
                <Body style={{
                  fontSize: '14px',
                  fontWeight: 600,
                  color: palette.blue.dark2,
                  margin: 0
                }}>
                  Optimization Recommendation
                </Body>
              </div>
              <Body style={{
                fontSize: '12px',
                color: palette.gray.dark1,
                margin: 0
              }}>
                Consider implementing Concurrent Processing for high-volume periods to increase 
                throughput by up to 37% while maintaining detection accuracy above 95%.
              </Body>
            </div>

            {/* Warning */}
            {latest.falsePositives > 4 && (
              <div style={{
                padding: spacing[3],
                background: palette.yellow.light3,
                borderRadius: '8px',
                border: `1px solid ${palette.yellow.light2}`
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2], marginBottom: spacing[2] }}>
                  <div style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    background: palette.yellow.base,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '12px'
                  }}>
                    ⚠
                  </div>
                  <Body style={{
                    fontSize: '14px',
                    fontWeight: 600,
                    color: palette.yellow.dark2,
                    margin: 0
                  }}>
                    False Positive Rate Alert
                  </Body>
                </div>
                <Body style={{
                  fontSize: '12px',
                  color: palette.gray.dark1,
                  margin: 0
                }}>
                  False positive rate is above optimal threshold. Consider adjusting model sensitivity 
                  or implementing additional validation steps.
                </Body>
              </div>
            )}
          </div>

          <div style={{
            marginTop: spacing[3],
            display: 'flex',
            justifyContent: 'center',
            gap: spacing[2]
          }}>
            <Button variant="default" size="small">
              Generate Report
            </Button>
            <Button variant="default" size="small">
              Export Data
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default ComparativeAnalysis;