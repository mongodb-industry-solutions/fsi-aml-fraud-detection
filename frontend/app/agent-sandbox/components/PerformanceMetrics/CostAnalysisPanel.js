'use client';

import React from 'react';
import { H3, Body, Overline } from '@leafygreen-ui/typography';
import { palette } from '@leafygreen-ui/palette';
import { spacing } from '@leafygreen-ui/tokens';
import Card from '@leafygreen-ui/card';
import Badge from '@leafygreen-ui/badge';
import Button from '@leafygreen-ui/button';

const CostAnalysisPanel = ({ metrics, selectedScenario, isSimulationRunning }) => {
  // Calculate cost metrics based on current performance
  const monthlyVolume = Math.round(metrics.throughput * 24 * 30); // Monthly transaction volume
  const costPerDecision = 0.023; // $0.023 per fraud decision
  const monthlyCost = monthlyVolume * costPerDecision;
  
  // ROI calculations
  const fraudPrevented = metrics.fraudPrevented;
  const operatingCost = monthlyCost;
  const netSavings = fraudPrevented - operatingCost;
  const roi = Math.round((netSavings / operatingCost) * 100);
  
  // Cost breakdown simulation
  const costBreakdown = {
    agentProcessing: Math.round(monthlyCost * 0.45),
    modelInference: Math.round(monthlyCost * 0.30),
    dataStorage: Math.round(monthlyCost * 0.15),
    networkOps: Math.round(monthlyCost * 0.10)
  };
  
  // Historical cost trends (simulated)
  const historicalData = [
    { month: 'Jan', cost: 89000, prevented: 2.1, roi: 2250 },
    { month: 'Feb', cost: 92000, prevented: 2.3, roi: 2400 },
    { month: 'Mar', cost: 87000, prevented: 2.4, roi: 2650 },
    { month: 'Apr', cost: 94000, prevented: 2.2, roi: 2240 },
    { month: 'May', cost: Math.round(monthlyCost), prevented: fraudPrevented / 1000000, roi: roi }
  ];
  
  // Cost efficiency metrics
  const avgDetectionCost = costPerDecision * 1000; // Cost per 1000 decisions
  const falsePosRevCost = (metrics.falsePositiveRate / 100) * avgDetectionCost * 0.3; // Revenue impact
  const manualReviewCost = 45; // $45 per manual review
  const totalReviewCost = Math.round((monthlyVolume * (metrics.falsePositiveRate / 100) * manualReviewCost) / 1000);

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
      gap: spacing[4]
    }}>
      {/* ROI Overview */}
      <Card style={{ padding: spacing[3] }}>
        <H3 style={{
          fontSize: '16px',
          color: palette.gray.dark3,
          marginBottom: spacing[3],
          fontFamily: "'Euclid Circular A', sans-serif"
        }}>
          Return on Investment
        </H3>

        <div style={{
          textAlign: 'center',
          padding: spacing[3],
          background: `linear-gradient(135deg, ${palette.green.light3}, ${palette.blue.light3})`,
          borderRadius: '8px',
          marginBottom: spacing[3]
        }}>
          <div style={{
            fontSize: '36px',
            fontWeight: 700,
            color: palette.green.dark2,
            marginBottom: spacing[1],
            lineHeight: 1
          }}>
            {roi}:1
          </div>
          <Overline style={{
            fontSize: '11px',
            color: palette.green.dark1,
            margin: 0
          }}>
            Investment Return Ratio
          </Overline>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: spacing[2]
        }}>
          <div style={{
            padding: spacing[2],
            background: palette.green.light3,
            borderRadius: '6px',
            textAlign: 'center'
          }}>
            <div style={{
              fontSize: '18px',
              fontWeight: 700,
              color: palette.green.dark2,
              marginBottom: '4px'
            }}>
              ${(fraudPrevented / 1000000).toFixed(1)}M
            </div>
            <Overline style={{
              fontSize: '10px',
              color: palette.green.dark1,
              margin: 0
            }}>
              Fraud Prevented
            </Overline>
          </div>

          <div style={{
            padding: spacing[2],
            background: palette.yellow.light3,
            borderRadius: '6px',
            textAlign: 'center'
          }}>
            <div style={{
              fontSize: '18px',
              fontWeight: 700,
              color: palette.yellow.dark2,
              marginBottom: '4px'
            }}>
              ${(operatingCost / 1000).toFixed(0)}K
            </div>
            <Overline style={{
              fontSize: '10px',
              color: palette.yellow.dark1,
              margin: 0
            }}>
              Operating Cost
            </Overline>
          </div>
        </div>

        <div style={{
          marginTop: spacing[3],
          padding: spacing[2],
          background: palette.gray.light3,
          borderRadius: '6px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <Body style={{
            fontSize: '12px',
            color: palette.gray.dark1,
            margin: 0
          }}>
            Net Savings (Monthly)
          </Body>
          <Body style={{
            fontSize: '16px',
            fontWeight: 700,
            color: palette.green.dark2,
            margin: 0
          }}>
            ${(netSavings / 1000000).toFixed(1)}M
          </Body>
        </div>
      </Card>

      {/* Cost Breakdown */}
      <Card style={{ padding: spacing[3] }}>
        <H3 style={{
          fontSize: '16px',
          color: palette.gray.dark3,
          marginBottom: spacing[3],
          fontFamily: "'Euclid Circular A', sans-serif"
        }}>
          Monthly Cost Breakdown
        </H3>

        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          marginBottom: spacing[3]
        }}>
          <div style={{
            fontSize: '28px',
            fontWeight: 700,
            color: palette.blue.dark2
          }}>
            ${(monthlyCost / 1000).toFixed(0)}K
          </div>
          <div style={{
            marginLeft: spacing[2],
            padding: `${spacing[1]}px ${spacing[2]}px`,
            background: palette.blue.light3,
            borderRadius: '12px'
          }}>
            <Body style={{
              fontSize: '10px',
              color: palette.blue.dark2,
              margin: 0,
              textTransform: 'uppercase',
              fontWeight: 600
            }}>
              Total Monthly
            </Body>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[2] }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: spacing[2],
            background: palette.blue.light3,
            borderRadius: '6px'
          }}>
            <div>
              <Body style={{
                fontSize: '12px',
                fontWeight: 600,
                color: palette.gray.dark3,
                margin: 0
              }}>
                Agent Processing
              </Body>
              <Body style={{
                fontSize: '10px',
                color: palette.gray.dark1,
                margin: 0
              }}>
                45% of total cost
              </Body>
            </div>
            <Body style={{
              fontSize: '14px',
              fontWeight: 700,
              color: palette.blue.dark2,
              margin: 0
            }}>
              ${(costBreakdown.agentProcessing / 1000).toFixed(0)}K
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
            <div>
              <Body style={{
                fontSize: '12px',
                fontWeight: 600,
                color: palette.gray.dark3,
                margin: 0
              }}>
                Model Inference
              </Body>
              <Body style={{
                fontSize: '10px',
                color: palette.gray.dark1,
                margin: 0
              }}>
                30% of total cost
              </Body>
            </div>
            <Body style={{
              fontSize: '14px',
              fontWeight: 700,
              color: palette.green.dark2,
              margin: 0
            }}>
              ${(costBreakdown.modelInference / 1000).toFixed(0)}K
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
            <div>
              <Body style={{
                fontSize: '12px',
                fontWeight: 600,
                color: palette.gray.dark3,
                margin: 0
              }}>
                Data Storage & Memory
              </Body>
              <Body style={{
                fontSize: '10px',
                color: palette.gray.dark1,
                margin: 0
              }}>
                15% of total cost
              </Body>
            </div>
            <Body style={{
              fontSize: '14px',
              fontWeight: 700,
              color: palette.yellow.dark2,
              margin: 0
            }}>
              ${(costBreakdown.dataStorage / 1000).toFixed(0)}K
            </Body>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: spacing[2],
            background: palette.gray.light3,
            borderRadius: '6px'
          }}>
            <div>
              <Body style={{
                fontSize: '12px',
                fontWeight: 600,
                color: palette.gray.dark3,
                margin: 0
              }}>
                Network Operations
              </Body>
              <Body style={{
                fontSize: '10px',
                color: palette.gray.dark1,
                margin: 0
              }}>
                10% of total cost
              </Body>
            </div>
            <Body style={{
              fontSize: '14px',
              fontWeight: 700,
              color: palette.gray.dark2,
              margin: 0
            }}>
              ${(costBreakdown.networkOps / 1000).toFixed(0)}K
            </Body>
          </div>
        </div>
      </Card>

      {/* Cost Efficiency Metrics */}
      <Card style={{ padding: spacing[3] }}>
        <H3 style={{
          fontSize: '16px',
          color: palette.gray.dark3,
          marginBottom: spacing[3],
          fontFamily: "'Euclid Circular A', sans-serif"
        }}>
          Cost Efficiency Analysis
        </H3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[3] }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: spacing[2],
            border: `1px solid ${palette.gray.light2}`,
            borderRadius: '6px'
          }}>
            <div>
              <Body style={{
                fontSize: '12px',
                fontWeight: 600,
                color: palette.gray.dark3,
                margin: 0
              }}>
                Cost Per Decision
              </Body>
              <Body style={{
                fontSize: '10px',
                color: palette.gray.dark1,
                margin: 0
              }}>
                Average processing cost
              </Body>
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: spacing[2]
            }}>
              <Badge variant="blue" size="small">Optimal</Badge>
              <Body style={{
                fontSize: '14px',
                fontWeight: 700,
                color: palette.blue.dark2,
                margin: 0
              }}>
                $0.023
              </Body>
            </div>
          </div>

          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: spacing[2],
            border: `1px solid ${palette.gray.light2}`,
            borderRadius: '6px'
          }}>
            <div>
              <Body style={{
                fontSize: '12px',
                fontWeight: 600,
                color: palette.gray.dark3,
                margin: 0
              }}>
                False Positive Impact
              </Body>
              <Body style={{
                fontSize: '10px',
                color: palette.gray.dark1,
                margin: 0
              }}>
                Revenue loss from FP blocks
              </Body>
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: spacing[2]
            }}>
              <Badge variant={falsePosRevCost > 8 ? "yellow" : "green"} size="small">
                {falsePosRevCost > 8 ? "Moderate" : "Low"}
              </Badge>
              <Body style={{
                fontSize: '14px',
                fontWeight: 700,
                color: falsePosRevCost > 8 ? palette.yellow.dark2 : palette.green.dark2,
                margin: 0
              }}>
                ${falsePosRevCost.toFixed(1)}K
              </Body>
            </div>
          </div>

          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: spacing[2],
            border: `1px solid ${palette.gray.light2}`,
            borderRadius: '6px'
          }}>
            <div>
              <Body style={{
                fontSize: '12px',
                fontWeight: 600,
                color: palette.gray.dark3,
                margin: 0
              }}>
                Manual Review Cost
              </Body>
              <Body style={{
                fontSize: '10px',
                color: palette.gray.dark1,
                margin: 0
              }}>
                Human analyst overhead
              </Body>
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: spacing[2]
            }}>
              <Badge variant={totalReviewCost > 15 ? "red" : "green"} size="small">
                {totalReviewCost > 15 ? "High" : "Manageable"}
              </Badge>
              <Body style={{
                fontSize: '14px',
                fontWeight: 700,
                color: totalReviewCost > 15 ? palette.red.dark2 : palette.green.dark2,
                margin: 0
              }}>
                ${totalReviewCost}K
              </Body>
            </div>
          </div>
        </div>

        <div style={{
          marginTop: spacing[3],
          padding: spacing[2],
          background: `linear-gradient(135deg, ${palette.green.light3}, ${palette.blue.light3})`,
          borderRadius: '6px'
        }}>
          <Body style={{
            fontSize: '11px',
            color: palette.gray.dark2,
            textAlign: 'center',
            margin: 0
          }}>
            Overall Cost Efficiency Score: <strong>92/100</strong> - Excellent performance with optimized resource utilization
          </Body>
        </div>
      </Card>

      {/* Historical Cost Trends */}
      <Card style={{ padding: spacing[3] }}>
        <H3 style={{
          fontSize: '16px',
          color: palette.gray.dark3,
          marginBottom: spacing[3],
          fontFamily: "'Euclid Circular A', sans-serif"
        }}>
          Historical Cost Performance
        </H3>

        <div style={{ marginBottom: spacing[3] }}>
          {historicalData.map((data, index) => (
            <div key={data.month} style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: spacing[2],
              marginBottom: spacing[1],
              background: index === historicalData.length - 1 ? palette.blue.light3 : palette.gray.light3,
              borderRadius: '6px',
              border: index === historicalData.length - 1 ? `1px solid ${palette.blue.base}` : 'none'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2] }}>
                <Body style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: palette.gray.dark3,
                  margin: 0,
                  minWidth: '30px'
                }}>
                  {data.month}
                </Body>
                {index === historicalData.length - 1 && (
                  <Badge variant="blue" size="small">Current</Badge>
                )}
              </div>
              
              <div style={{ display: 'flex', gap: spacing[3] }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{
                    fontSize: '12px',
                    fontWeight: 700,
                    color: palette.yellow.dark2
                  }}>
                    ${(data.cost / 1000).toFixed(0)}K
                  </div>
                  <Overline style={{
                    fontSize: '9px',
                    color: palette.gray.dark1,
                    margin: 0
                  }}>
                    Cost
                  </Overline>
                </div>
                
                <div style={{ textAlign: 'center' }}>
                  <div style={{
                    fontSize: '12px',
                    fontWeight: 700,
                    color: palette.green.dark2
                  }}>
                    ${data.prevented.toFixed(1)}M
                  </div>
                  <Overline style={{
                    fontSize: '9px',
                    color: palette.gray.dark1,
                    margin: 0
                  }}>
                    Prevented
                  </Overline>
                </div>
                
                <div style={{ textAlign: 'center' }}>
                  <div style={{
                    fontSize: '12px',
                    fontWeight: 700,
                    color: palette.blue.dark2
                  }}>
                    {data.roi}:1
                  </div>
                  <Overline style={{
                    fontSize: '9px',
                    color: palette.gray.dark1,
                    margin: 0
                  }}>
                    ROI
                  </Overline>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: spacing[2]
        }}>
          <Button variant="default" size="small">
            Export Report
          </Button>
          <Button variant="default" size="small">
            Cost Optimization
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default CostAnalysisPanel;