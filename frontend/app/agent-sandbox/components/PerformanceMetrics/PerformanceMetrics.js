'use client';

import React, { useState, useEffect } from 'react';
import { H2, H3, Body, Overline } from '@leafygreen-ui/typography';
import { palette } from '@leafygreen-ui/palette';
import { spacing } from '@leafygreen-ui/tokens';
import Card from '@leafygreen-ui/card';
import Badge from '@leafygreen-ui/badge';
import Button from '@leafygreen-ui/button';
import Icon from '@leafygreen-ui/icon';

import { generatePerformanceMetrics } from '../../utils/mockDataGenerator';
import FraudDetectionKPIs from './FraudDetectionKPIs';
import SystemHealthPanel from './SystemHealthPanel';
import CostAnalysisPanel from './CostAnalysisPanel';
import ComparativeAnalysis from './ComparativeAnalysis';

const PerformanceMetrics = ({ selectedScenario, isSimulationRunning }) => {
  const [metrics, setMetrics] = useState(generatePerformanceMetrics());
  const [activePanel, setActivePanel] = useState('kpis');
  const [historicalData, setHistoricalData] = useState([]);
  const [alertsActive, setAlertsActive] = useState(true);

  // Update metrics periodically
  useEffect(() => {
    const interval = setInterval(() => {
      const newMetrics = generatePerformanceMetrics();
      setMetrics(newMetrics);
      
      // Add to historical data for trends
      setHistoricalData(prev => {
        const updated = [...prev, { ...newMetrics, timestamp: new Date() }];
        return updated.slice(-50); // Keep last 50 data points
      });
    }, 2000); // Update every 2 seconds

    return () => clearInterval(interval);
  }, []);

  // Generate real-time alerts based on metrics
  const generateAlerts = () => {
    const alerts = [];
    
    if (metrics.falsePositiveRate > 4) {
      alerts.push({
        id: 'fp-rate',
        type: 'warning',
        message: `False positive rate elevated at ${metrics.falsePositiveRate}%`,
        action: 'Review model thresholds'
      });
    }
    
    if (metrics.avgLatency > 1200) {
      alerts.push({
        id: 'latency',
        type: 'error',
        message: `High latency detected: ${metrics.avgLatency}ms`,
        action: 'Scale agent resources'
      });
    }
    
    if (metrics.accuracy < 94) {
      alerts.push({
        id: 'accuracy',
        type: 'warning',
        message: `Accuracy below target: ${metrics.accuracy}%`,
        action: 'Retrain models'
      });
    }
    
    if (metrics.systemLoad > 85) {
      alerts.push({
        id: 'load',
        type: 'warning',
        message: `System load high: ${metrics.systemLoad}%`,
        action: 'Monitor resources'
      });
    }

    return alerts;
  };

  const alerts = generateAlerts();

  return (
    <div style={{
      maxWidth: '1400px',
      margin: '0 auto',
      padding: spacing[3]
    }}>
      {/* Performance Dashboard Header */}
      <div style={{
        marginBottom: spacing[4],
        padding: spacing[4],
        background: `linear-gradient(135deg, ${palette.blue.light3}, ${palette.green.light3})`,
        borderRadius: '12px',
        border: `1px solid ${palette.gray.light2}`
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: spacing[3] }}>
            <div style={{
              width: '60px',
              height: '60px',
              borderRadius: '12px',
              background: `linear-gradient(135deg, ${palette.blue.base}, ${palette.green.base})`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '28px',
              color: palette.white
            }}>
              📊
            </div>
            <div>
              <H2 style={{
                fontSize: '28px',
                margin: 0,
                color: palette.gray.dark3,
                fontFamily: "'Euclid Circular A', sans-serif"
              }}>
                Performance Metrics Dashboard
              </H2>
              <Body style={{
                color: palette.gray.dark1,
                margin: 0,
                fontFamily: "'Euclid Circular A', sans-serif"
              }}>
                Real-time Fraud Detection KPIs • System Health • Cost Analysis
              </Body>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2] }}>
            <Badge variant={isSimulationRunning ? 'green' : 'lightgray'}>
              {isSimulationRunning ? 'LIVE MONITORING' : 'STATIC VIEW'}
            </Badge>
            {alerts.length > 0 && (
              <Badge variant="red">
                {alerts.length} Alerts
              </Badge>
            )}
            <Button
              variant={alertsActive ? 'primary' : 'default'}
              size="small"
              leftGlyph={<Icon glyph="Bell" />}
              onClick={() => setAlertsActive(!alertsActive)}
            >
              Alerts {alertsActive ? 'On' : 'Off'}
            </Button>
          </div>
        </div>
      </div>

      {/* Real-time Alerts Panel */}
      {alertsActive && alerts.length > 0 && (
        <div style={{
          marginBottom: spacing[4],
          padding: spacing[3],
          background: palette.red.light3,
          borderRadius: '8px',
          border: `1px solid ${palette.red.light2}`
        }}>
          <H3 style={{
            fontSize: '14px',
            color: palette.red.dark2,
            margin: `0 0 ${spacing[2]}px 0`,
            fontFamily: "'Euclid Circular A', sans-serif"
          }}>
            Active Alerts
          </H3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[2] }}>
            {alerts.map(alert => (
              <div
                key={alert.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: spacing[2],
                  background: palette.white,
                  borderRadius: '6px',
                  border: `1px solid ${alert.type === 'error' ? palette.red.base : palette.yellow.base}`
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2] }}>
                  <Icon 
                    glyph={alert.type === 'error' ? 'Warning' : 'ImportantWithCircle'} 
                    fill={alert.type === 'error' ? palette.red.base : palette.yellow.base}
                    size={16} 
                  />
                  <div>
                    <Body style={{
                      fontSize: '12px',
                      fontWeight: 600,
                      color: palette.gray.dark3,
                      margin: 0
                    }}>
                      {alert.message}
                    </Body>
                    <Body style={{
                      fontSize: '11px',
                      color: palette.gray.dark1,
                      margin: 0
                    }}>
                      Recommended: {alert.action}
                    </Body>
                  </div>
                </div>
                <Button variant="default" size="xsmall">
                  Acknowledge
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Key Performance Indicators Overview */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: spacing[3],
        marginBottom: spacing[4]
      }}>
        <Card style={{ padding: spacing[3], textAlign: 'center' }}>
          <div style={{ 
            fontSize: '32px', 
            fontWeight: 700, 
            color: palette.green.dark2,
            marginBottom: spacing[1],
            lineHeight: 1
          }}>
            {metrics.accuracy}%
          </div>
          <Body style={{ 
            fontSize: '12px', 
            color: palette.gray.dark1,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            margin: 0,
            marginBottom: '4px'
          }}>
            Fraud Detection Accuracy
          </Body>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px'
          }}>
            <Icon glyph="CaretUp" fill={palette.green.base} size={12} />
            <span style={{ fontSize: '10px', color: palette.green.base, fontWeight: 600 }}>
              +0.3%
            </span>
          </div>
        </Card>

        <Card style={{ padding: spacing[3], textAlign: 'center' }}>
          <div style={{ 
            fontSize: '32px', 
            fontWeight: 700, 
            color: palette.blue.dark2,
            marginBottom: spacing[1],
            lineHeight: 1
          }}>
            {metrics.avgLatency}ms
          </div>
          <Body style={{ 
            fontSize: '12px', 
            color: palette.gray.dark1,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            margin: 0,
            marginBottom: '4px'
          }}>
            Average Response Time
          </Body>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px'
          }}>
            <Icon glyph="CaretDown" fill={palette.green.base} size={12} />
            <span style={{ fontSize: '10px', color: palette.green.base, fontWeight: 600 }}>
              -12ms
            </span>
          </div>
        </Card>

        <Card style={{ padding: spacing[3], textAlign: 'center' }}>
          <div style={{ 
            fontSize: '32px', 
            fontWeight: 700, 
            color: palette.red.dark2,
            marginBottom: spacing[1],
            lineHeight: 1
          }}>
            ${(metrics.fraudPrevented / 1000000).toFixed(1)}M
          </div>
          <Body style={{ 
            fontSize: '12px', 
            color: palette.gray.dark1,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            margin: 0,
            marginBottom: '4px'
          }}>
            Fraud Prevented (Month)
          </Body>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px'
          }}>
            <Icon glyph="CaretUp" fill={palette.green.base} size={12} />
            <span style={{ fontSize: '10px', color: palette.green.base, fontWeight: 600 }}>
              +$0.2M
            </span>
          </div>
        </Card>

        <Card style={{ padding: spacing[3], textAlign: 'center' }}>
          <div style={{ 
            fontSize: '32px', 
            fontWeight: 700, 
            color: palette.yellow.dark2,
            marginBottom: spacing[1],
            lineHeight: 1
          }}>
            {Math.round(metrics.throughput)}
          </div>
          <Body style={{ 
            fontSize: '12px', 
            color: palette.gray.dark1,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            margin: 0,
            marginBottom: '4px'
          }}>
            Decisions per Hour
          </Body>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px'
          }}>
            <Icon glyph="CaretUp" fill={palette.green.base} size={12} />
            <span style={{ fontSize: '10px', color: palette.green.base, fontWeight: 600 }}>
              +127
            </span>
          </div>
        </Card>

        <Card style={{ padding: spacing[3], textAlign: 'center' }}>
          <div style={{ 
            fontSize: '32px', 
            fontWeight: 700, 
            color: palette.red.base,
            marginBottom: spacing[1],
            lineHeight: 1
          }}>
            {metrics.falsePositiveRate}%
          </div>
          <Body style={{ 
            fontSize: '12px', 
            color: palette.gray.dark1,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            margin: 0,
            marginBottom: '4px'
          }}>
            False Positive Rate
          </Body>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px'
          }}>
            <Icon glyph="CaretDown" fill={palette.green.base} size={12} />
            <span style={{ fontSize: '10px', color: palette.green.base, fontWeight: 600 }}>
              -0.4%
            </span>
          </div>
        </Card>

        <Card style={{ padding: spacing[3], textAlign: 'center' }}>
          <div style={{ 
            fontSize: '32px', 
            fontWeight: 700, 
            color: palette.gray.dark2,
            marginBottom: spacing[1],
            lineHeight: 1
          }}>
            {metrics.systemLoad}%
          </div>
          <Body style={{ 
            fontSize: '12px', 
            color: palette.gray.dark1,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            margin: 0,
            marginBottom: '4px'
          }}>
            System Load
          </Body>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px'
          }}>
            <Icon glyph="CaretUp" fill={metrics.systemLoad > 80 ? palette.yellow.base : palette.green.base} size={12} />
            <span style={{ 
              fontSize: '10px', 
              color: metrics.systemLoad > 80 ? palette.yellow.base : palette.green.base, 
              fontWeight: 600 
            }}>
              +5%
            </span>
          </div>
        </Card>
      </div>

      {/* Panel Navigation */}
      <div style={{
        display: 'flex',
        gap: spacing[2],
        marginBottom: spacing[4],
        padding: spacing[2],
        background: palette.white,
        borderRadius: '8px',
        border: `1px solid ${palette.gray.light2}`
      }}>
        <Button
          variant={activePanel === 'kpis' ? 'primary' : 'default'}
          size="small"
          leftGlyph={<Icon glyph="Chart" />}
          onClick={() => setActivePanel('kpis')}
        >
          Fraud Detection KPIs
        </Button>
        <Button
          variant={activePanel === 'health' ? 'primary' : 'default'}
          size="small"
          leftGlyph={<Icon glyph="ActivityFeed" />}
          onClick={() => setActivePanel('health')}
        >
          System Health
        </Button>
        <Button
          variant={activePanel === 'cost' ? 'primary' : 'default'}
          size="small"
          leftGlyph={<Icon glyph="CreditCard" />}
          onClick={() => setActivePanel('cost')}
        >
          Cost Analysis
        </Button>
        <Button
          variant={activePanel === 'trends' ? 'primary' : 'default'}
          size="small"
          leftGlyph={<Icon glyph="Charts" />}
          onClick={() => setActivePanel('trends')}
        >
          Trends & Comparison
        </Button>
      </div>

      {/* Active Performance Panel */}
      <div style={{ minHeight: '600px' }}>
        {activePanel === 'kpis' && (
          <FraudDetectionKPIs 
            metrics={metrics}
            selectedScenario={selectedScenario}
            isSimulationRunning={isSimulationRunning}
          />
        )}
        
        {activePanel === 'health' && (
          <SystemHealthPanel 
            metrics={metrics}
            historicalData={historicalData}
            isSimulationRunning={isSimulationRunning}
          />
        )}
        
        {activePanel === 'cost' && (
          <CostAnalysisPanel 
            metrics={metrics}
            selectedScenario={selectedScenario}
            isSimulationRunning={isSimulationRunning}
          />
        )}
        
        {activePanel === 'trends' && (
          <ComparativeAnalysis 
            metrics={metrics}
            historicalData={historicalData}
            isSimulationRunning={isSimulationRunning}
          />
        )}
      </div>
    </div>
  );
};

export default PerformanceMetrics;