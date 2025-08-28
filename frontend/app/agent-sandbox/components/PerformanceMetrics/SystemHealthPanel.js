'use client';

import React from 'react';
import { H3, Body, Overline } from '@leafygreen-ui/typography';
import { palette } from '@leafygreen-ui/palette';
import { spacing } from '@leafygreen-ui/tokens';
import Card from '@leafygreen-ui/card';
import Badge from '@leafygreen-ui/badge';

const SystemHealthPanel = ({ metrics, historicalData, isSimulationRunning }) => {
  // System health calculations
  const getHealthStatus = (value, thresholds) => {
    if (value <= thresholds.excellent) return { status: 'excellent', color: palette.green.base, variant: 'green' };
    if (value <= thresholds.good) return { status: 'good', color: palette.blue.base, variant: 'blue' };
    if (value <= thresholds.warning) return { status: 'warning', color: palette.yellow.base, variant: 'yellow' };
    return { status: 'critical', color: palette.red.base, variant: 'red' };
  };

  const latencyHealth = getHealthStatus(metrics.avgLatency, { excellent: 500, good: 800, warning: 1200 });
  const loadHealth = getHealthStatus(metrics.systemLoad, { excellent: 60, good: 75, warning: 85 });
  const memoryHealth = getHealthStatus(metrics.memoryUtilization, { excellent: 70, good: 80, warning: 90 });

  // Generate system components health
  const systemComponents = [
    {
      name: 'Agent Orchestrator',
      status: 'healthy',
      uptime: '99.98%',
      responseTime: '23ms',
      load: '67%',
      color: palette.green.base
    },
    {
      name: 'MongoDB Atlas',
      status: 'healthy', 
      uptime: '99.99%',
      responseTime: '18ms',
      load: '43%',
      color: palette.green.base
    },
    {
      name: 'Vector Search Engine',
      status: 'healthy',
      uptime: '99.95%',
      responseTime: '31ms',
      load: '78%',
      color: palette.green.base
    },
    {
      name: 'Rule Engine',
      status: metrics.systemLoad > 85 ? 'warning' : 'healthy',
      uptime: '99.92%',
      responseTime: '156ms',
      load: `${Math.round(metrics.systemLoad)}%`,
      color: metrics.systemLoad > 85 ? palette.yellow.base : palette.green.base
    },
    {
      name: 'Azure AI Foundry',
      status: 'healthy',
      uptime: '99.97%',
      responseTime: '89ms', 
      load: '52%',
      color: palette.green.base
    },
    {
      name: 'API Gateway',
      status: metrics.avgLatency > 1000 ? 'warning' : 'healthy',
      uptime: '99.94%',
      responseTime: `${metrics.avgLatency}ms`,
      load: '71%',
      color: metrics.avgLatency > 1000 ? palette.yellow.base : palette.green.base
    }
  ];

  // Network and infrastructure metrics
  const infrastructureMetrics = {
    networkLatency: Math.round(12 + Math.random() * 8),
    diskIO: Math.round(2.3 + Math.random() * 1.5, 1),
    cpuCores: 16,
    activeCores: Math.round(metrics.systemLoad / 100 * 16),
    bandwidth: '1.2 Gbps',
    connections: Math.round(450 + Math.random() * 100)
  };

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
      gap: spacing[4]
    }}>
      {/* System Health Overview */}
      <Card style={{ padding: spacing[3] }}>
        <H3 style={{
          fontSize: '16px',
          color: palette.gray.dark3,
          marginBottom: spacing[3],
          fontFamily: "'Euclid Circular A', sans-serif"
        }}>
          System Health Overview
        </H3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[3] }}>
          {/* Overall Health Score */}
          <div style={{
            padding: spacing[3],
            background: palette.green.light3,
            borderRadius: '8px',
            textAlign: 'center',
            border: `1px solid ${palette.green.light2}`
          }}>
            <div style={{
              fontSize: '36px',
              fontWeight: 700,
              color: palette.green.dark2,
              marginBottom: spacing[1],
              lineHeight: 1
            }}>
              98.2%
            </div>
            <Body style={{
              fontSize: '14px',
              color: palette.green.dark1,
              margin: 0
            }}>
              Overall System Health
            </Body>
          </div>

          {/* Component Health Indicators */}
          <div>
            <Overline style={{
              fontSize: '11px',
              color: palette.gray.dark1,
              margin: `0 0 ${spacing[2]}px 0`
            }}>
              Key Metrics
            </Overline>

            <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[2] }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: spacing[2],
                background: palette.gray.light3,
                borderRadius: '6px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2] }}>
                  <div style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: latencyHealth.color
                  }} />
                  <Body style={{ fontSize: '12px', color: palette.gray.dark1, margin: 0 }}>
                    Response Time
                  </Body>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: spacing[1] }}>
                  <Body style={{ fontSize: '13px', fontWeight: 600, color: palette.gray.dark3, margin: 0 }}>
                    {metrics.avgLatency}ms
                  </Body>
                  <Badge variant={latencyHealth.variant} size="small">
                    {latencyHealth.status}
                  </Badge>
                </div>
              </div>

              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: spacing[2],
                background: palette.gray.light3,
                borderRadius: '6px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2] }}>
                  <div style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: loadHealth.color
                  }} />
                  <Body style={{ fontSize: '12px', color: palette.gray.dark1, margin: 0 }}>
                    System Load
                  </Body>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: spacing[1] }}>
                  <Body style={{ fontSize: '13px', fontWeight: 600, color: palette.gray.dark3, margin: 0 }}>
                    {metrics.systemLoad}%
                  </Body>
                  <Badge variant={loadHealth.variant} size="small">
                    {loadHealth.status}
                  </Badge>
                </div>
              </div>

              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: spacing[2],
                background: palette.gray.light3,
                borderRadius: '6px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2] }}>
                  <div style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: memoryHealth.color
                  }} />
                  <Body style={{ fontSize: '12px', color: palette.gray.dark1, margin: 0 }}>
                    Memory Usage
                  </Body>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: spacing[1] }}>
                  <Body style={{ fontSize: '13px', fontWeight: 600, color: palette.gray.dark3, margin: 0 }}>
                    {metrics.memoryUtilization}%
                  </Body>
                  <Badge variant={memoryHealth.variant} size="small">
                    {memoryHealth.status}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Component Status */}
      <Card style={{ padding: spacing[3] }}>
        <H3 style={{
          fontSize: '16px',
          color: palette.gray.dark3,
          marginBottom: spacing[3],
          fontFamily: "'Euclid Circular A', sans-serif"
        }}>
          Component Status
        </H3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[2] }}>
          {systemComponents.map((component, index) => (
            <div
              key={index}
              style={{
                padding: spacing[2],
                background: palette.white,
                border: `1px solid ${palette.gray.light2}`,
                borderRadius: '6px'
              }}
            >
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: spacing[1]
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2] }}>
                  <div style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: component.color
                  }} />
                  <Body style={{
                    fontSize: '13px',
                    fontWeight: 600,
                    color: palette.gray.dark3,
                    margin: 0
                  }}>
                    {component.name}
                  </Body>
                </div>
                <Badge variant={component.status === 'healthy' ? 'green' : 'yellow'} size="small">
                  {component.status}
                </Badge>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr',
                gap: spacing[1],
                marginTop: spacing[1]
              }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    color: palette.gray.dark3,
                    lineHeight: 1
                  }}>
                    {component.uptime}
                  </div>
                  <Overline style={{
                    fontSize: '8px',
                    color: palette.gray.dark1,
                    margin: 0
                  }}>
                    Uptime
                  </Overline>
                </div>

                <div style={{ textAlign: 'center' }}>
                  <div style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    color: palette.gray.dark3,
                    lineHeight: 1
                  }}>
                    {component.responseTime}
                  </div>
                  <Overline style={{
                    fontSize: '8px',
                    color: palette.gray.dark1,
                    margin: 0
                  }}>
                    Response
                  </Overline>
                </div>

                <div style={{ textAlign: 'center' }}>
                  <div style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    color: palette.gray.dark3,
                    lineHeight: 1
                  }}>
                    {component.load}
                  </div>
                  <Overline style={{
                    fontSize: '8px',
                    color: palette.gray.dark1,
                    margin: 0
                  }}>
                    Load
                  </Overline>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Infrastructure Metrics */}
      <Card style={{ padding: spacing[3] }}>
        <H3 style={{
          fontSize: '16px',
          color: palette.gray.dark3,
          marginBottom: spacing[3],
          fontFamily: "'Euclid Circular A', sans-serif"
        }}>
          Infrastructure Metrics
        </H3>

        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: spacing[3]
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{
              fontSize: '20px',
              fontWeight: 600,
              color: palette.blue.dark2,
              marginBottom: spacing[1],
              lineHeight: 1
            }}>
              {infrastructureMetrics.networkLatency}ms
            </div>
            <Overline style={{
              fontSize: '10px',
              color: palette.gray.dark1,
              margin: 0
            }}>
              Network Latency
            </Overline>
          </div>

          <div style={{ textAlign: 'center' }}>
            <div style={{
              fontSize: '20px',
              fontWeight: 600,
              color: palette.green.dark2,
              marginBottom: spacing[1],
              lineHeight: 1
            }}>
              {infrastructureMetrics.diskIO}ms
            </div>
            <Overline style={{
              fontSize: '10px',
              color: palette.gray.dark1,
              margin: 0
            }}>
              Disk I/O Latency
            </Overline>
          </div>

          <div style={{ textAlign: 'center' }}>
            <div style={{
              fontSize: '20px',
              fontWeight: 600,
              color: palette.yellow.dark2,
              marginBottom: spacing[1],
              lineHeight: 1
            }}>
              {infrastructureMetrics.activeCores}/{infrastructureMetrics.cpuCores}
            </div>
            <Overline style={{
              fontSize: '10px',
              color: palette.gray.dark1,
              margin: 0
            }}>
              CPU Cores Active
            </Overline>
          </div>

          <div style={{ textAlign: 'center' }}>
            <div style={{
              fontSize: '20px',
              fontWeight: 600,
              color: palette.red.dark2,
              marginBottom: spacing[1],
              lineHeight: 1
            }}>
              {infrastructureMetrics.connections}
            </div>
            <Overline style={{
              fontSize: '10px',
              color: palette.gray.dark1,
              margin: 0
            }}>
              Active Connections
            </Overline>
          </div>
        </div>

        {/* Network Bandwidth */}
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
            {infrastructureMetrics.bandwidth} Available
          </Body>
          <Overline style={{
            fontSize: '10px',
            color: palette.gray.dark1,
            margin: 0
          }}>
            Network Bandwidth
          </Overline>
        </div>
      </Card>

      {/* Performance Trend (Historical) */}
      {historicalData.length > 0 && (
        <Card style={{ padding: spacing[3] }}>
          <H3 style={{
            fontSize: '16px',
            color: palette.gray.dark3,
            marginBottom: spacing[3],
            fontFamily: "'Euclid Circular A', sans-serif"
          }}>
            Performance Trend
          </H3>

          {/* Latency Trend Mini Chart */}
          <div style={{ marginBottom: spacing[3] }}>
            <Overline style={{
              fontSize: '11px',
              color: palette.gray.dark1,
              margin: `0 0 ${spacing[1]}px 0`
            }}>
              Response Time Trend (Last {historicalData.length} Updates)
            </Overline>
            
            <div style={{
              display: 'flex',
              alignItems: 'end',
              gap: '2px',
              height: '60px',
              marginBottom: spacing[1]
            }}>
              {historicalData.map((data, index) => (
                <div
                  key={index}
                  style={{
                    flex: 1,
                    minWidth: '2px',
                    height: `${Math.min(100, (data.avgLatency / 2000) * 100)}%`,
                    background: data.avgLatency > 1200 ? palette.red.base : 
                               data.avgLatency > 800 ? palette.yellow.base : palette.green.base,
                    borderRadius: '1px 1px 0 0'
                  }}
                  title={`${data.avgLatency}ms at ${data.timestamp.toLocaleTimeString()}`}
                />
              ))}
            </div>
            
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '9px',
              color: palette.gray.dark1
            }}>
              <span>0ms</span>
              <span>2000ms</span>
            </div>
          </div>

          {/* System Load Trend */}
          <div>
            <Overline style={{
              fontSize: '11px',
              color: palette.gray.dark1,
              margin: `0 0 ${spacing[1]}px 0`
            }}>
              System Load Trend
            </Overline>
            
            <div style={{
              display: 'flex',
              alignItems: 'end',
              gap: '2px',
              height: '40px',
              marginBottom: spacing[1]
            }}>
              {historicalData.map((data, index) => (
                <div
                  key={index}
                  style={{
                    flex: 1,
                    minWidth: '2px',
                    height: `${data.systemLoad}%`,
                    background: data.systemLoad > 85 ? palette.red.base : 
                               data.systemLoad > 75 ? palette.yellow.base : palette.green.base,
                    borderRadius: '1px 1px 0 0'
                  }}
                  title={`${data.systemLoad}% at ${data.timestamp.toLocaleTimeString()}`}
                />
              ))}
            </div>
            
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '9px',
              color: palette.gray.dark1
            }}>
              <span>0%</span>
              <span>100%</span>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

export default SystemHealthPanel;