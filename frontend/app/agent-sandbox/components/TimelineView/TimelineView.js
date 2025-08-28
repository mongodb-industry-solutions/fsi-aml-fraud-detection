'use client';

import React, { useState, useEffect } from 'react';
import { H2, H3, Body, Overline } from '@leafygreen-ui/typography';
import { palette } from '@leafygreen-ui/palette';
import { spacing } from '@leafygreen-ui/tokens';
import Card from '@leafygreen-ui/card';
import Badge from '@leafygreen-ui/badge';
import Button from '@leafygreen-ui/button';
import Icon from '@leafygreen-ui/icon';

const TimelineView = ({ selectedScenario, isSimulationRunning, metrics }) => {
  const [selectedCase, setSelectedCase] = useState('case_001');
  const [timelineScale, setTimelineScale] = useState('detailed'); // 'overview', 'detailed', 'critical'
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  // Generate realistic fraud case timeline data
  const generateCaseTimeline = (caseId, scenario) => {
    const events = [];
    const startTime = Date.now() - (5 * 60 * 1000); // 5 minutes ago
    
    // Initial transaction detection
    events.push({
      id: 'tx_init',
      timestamp: startTime,
      type: 'transaction',
      agent: 'Transaction Monitor',
      action: 'Transaction received',
      details: `${scenario.name} pattern detected - Amount: $${Math.round(Math.random() * 50000 + 1000).toLocaleString()}`,
      confidence: 0.72,
      criticality: 'medium',
      duration: 0.05
    });

    // Risk analysis phase
    events.push({
      id: 'risk_analysis',
      timestamp: startTime + 150,
      type: 'analysis',
      agent: 'Risk Analyzer',
      action: 'Risk assessment initiated',
      details: 'Historical pattern matching, velocity checks, geographic analysis',
      confidence: 0.85,
      criticality: 'high',
      duration: 1.2
    });

    // Memory retrieval
    events.push({
      id: 'memory_lookup',
      timestamp: startTime + 850,
      type: 'memory',
      agent: 'Memory Agent',
      action: 'Vector similarity search',
      details: 'Retrieved 847 similar cases from MongoDB Atlas, 92% confidence match',
      confidence: 0.92,
      criticality: 'medium',
      duration: 0.8
    });

    // Agent collaboration (varies by pattern)
    if (scenario.orchestrationPattern === 'groupchat') {
      events.push({
        id: 'agent_debate',
        timestamp: startTime + 1950,
        type: 'collaboration',
        agent: 'Agent Collaboration',
        action: 'Multi-agent debate initiated',
        details: 'Risk Analyst (HIGH risk), Compliance Officer (MEDIUM risk), Pattern Expert (HIGH risk)',
        confidence: 0.88,
        criticality: 'critical',
        duration: 2.3
      });
    } else if (scenario.orchestrationPattern === 'concurrent') {
      events.push({
        id: 'parallel_analysis',
        timestamp: startTime + 1200,
        type: 'analysis',
        agent: 'Concurrent Processors',
        action: 'Parallel analysis execution',
        details: 'AML screening, sanctions check, behavioral analysis running concurrently',
        confidence: 0.94,
        criticality: 'high',
        duration: 1.1
      });
    } else {
      events.push({
        id: 'sequential_validation',
        timestamp: startTime + 1800,
        type: 'validation',
        agent: 'Sequential Validator',
        action: 'Step-by-step validation',
        details: 'Identity verification → Risk scoring → Compliance check → Final decision',
        confidence: 0.91,
        criticality: 'high',
        duration: 1.8
      });
    }

    // Final decision
    const finalDecision = Math.random() > 0.15 ? 'BLOCK' : 'APPROVE_WITH_MONITORING';
    events.push({
      id: 'final_decision',
      timestamp: startTime + 4200,
      type: 'decision',
      agent: 'Decision Engine',
      action: `Transaction ${finalDecision}`,
      details: `Final confidence: ${(Math.random() * 0.15 + 0.85).toFixed(2)} | Risk score: ${Math.round(Math.random() * 25 + 75)}`,
      confidence: finalDecision === 'BLOCK' ? 0.95 : 0.78,
      criticality: finalDecision === 'BLOCK' ? 'critical' : 'medium',
      duration: 0.3
    });

    return {
      caseId,
      scenario: scenario.name,
      totalDuration: 4.5,
      outcome: finalDecision,
      events
    };
  };

  const [caseData, setCaseData] = useState(() => 
    generateCaseTimeline('case_001', selectedScenario)
  );

  // Timeline playback effect
  useEffect(() => {
    if (isPlaying && isSimulationRunning) {
      const interval = setInterval(() => {
        setCurrentTime(prev => {
          const newTime = prev + (0.1 * playbackSpeed);
          if (newTime >= caseData.totalDuration) {
            setIsPlaying(false);
            return caseData.totalDuration;
          }
          return newTime;
        });
      }, 100);

      return () => clearInterval(interval);
    }
  }, [isPlaying, playbackSpeed, caseData.totalDuration, isSimulationRunning]);

  // Get current active events
  const getCurrentEvents = () => {
    return caseData.events.filter(event => {
      const eventStart = (event.timestamp - caseData.events[0].timestamp) / 1000;
      const eventEnd = eventStart + event.duration;
      return currentTime >= eventStart && currentTime <= eventEnd;
    });
  };

  // Calculate critical path
  const calculateCriticalPath = () => {
    const criticalEvents = caseData.events.filter(event => 
      event.criticality === 'critical' || event.criticality === 'high'
    );
    
    const totalCriticalTime = criticalEvents.reduce((sum, event) => sum + event.duration, 0);
    const criticalPathPercentage = (totalCriticalTime / caseData.totalDuration) * 100;
    
    return {
      events: criticalEvents,
      totalTime: totalCriticalTime,
      percentage: criticalPathPercentage
    };
  };

  const criticalPath = calculateCriticalPath();
  const currentActiveEvents = getCurrentEvents();

  const getEventIcon = (type) => {
    switch (type) {
      case 'transaction': return '💳';
      case 'analysis': return '🔍';
      case 'memory': return '🧠';
      case 'collaboration': return '👥';
      case 'validation': return '✅';
      case 'decision': return '⚖️';
      default: return '📊';
    }
  };

  const getCriticalityColor = (criticality) => {
    switch (criticality) {
      case 'critical': return palette.red.base;
      case 'high': return palette.yellow.dark1;
      case 'medium': return palette.blue.base;
      default: return palette.gray.base;
    }
  };

  return (
    <div style={{
      maxWidth: '1400px',
      margin: '0 auto',
      padding: spacing[3]
    }}>
      {/* Timeline Header */}
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
              fontSize: '28px'
            }}>
              ⏱️
            </div>
            <div>
              <H2 style={{
                fontSize: '28px',
                margin: 0,
                color: palette.gray.dark3,
                fontFamily: "'Euclid Circular A', sans-serif"
              }}>
                Timeline Analysis
              </H2>
              <Body style={{
                color: palette.gray.dark1,
                margin: 0,
                fontFamily: "'Euclid Circular A', sans-serif"
              }}>
                Critical Path Visualization • Agent Coordination • Time-Travel Debug
              </Body>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2] }}>
            <Badge variant={isSimulationRunning ? 'green' : 'lightgray'}>
              {isSimulationRunning ? 'LIVE TIMELINE' : 'STATIC VIEW'}
            </Badge>
            <Badge variant="blue">
              Case: {selectedCase.toUpperCase()}
            </Badge>
          </div>
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: '2fr 1fr',
        gap: spacing[4]
      }}>
        {/* Main Timeline Visualization */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[4] }}>
          {/* Timeline Controls */}
          <Card style={{ padding: spacing[3] }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing[3] }}>
              <H3 style={{
                fontSize: '16px',
                color: palette.gray.dark3,
                margin: 0,
                fontFamily: "'Euclid Circular A', sans-serif"
              }}>
                Playback Controls
              </H3>
              <div style={{ display: 'flex', gap: spacing[2] }}>
                <Button
                  variant={timelineScale === 'overview' ? 'primary' : 'default'}
                  size="xsmall"
                  onClick={() => setTimelineScale('overview')}
                >
                  Overview
                </Button>
                <Button
                  variant={timelineScale === 'detailed' ? 'primary' : 'default'}
                  size="xsmall"
                  onClick={() => setTimelineScale('detailed')}
                >
                  Detailed
                </Button>
                <Button
                  variant={timelineScale === 'critical' ? 'primary' : 'default'}
                  size="xsmall"
                  onClick={() => setTimelineScale('critical')}
                >
                  Critical Only
                </Button>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: spacing[3] }}>
              <div style={{ display: 'flex', gap: spacing[2] }}>
                <Button
                  variant={isPlaying ? 'default' : 'primary'}
                  size="small"
                  leftGlyph={<Icon glyph={isPlaying ? 'Pause' : 'Play'} />}
                  onClick={() => setIsPlaying(!isPlaying)}
                  disabled={!isSimulationRunning}
                >
                  {isPlaying ? 'Pause' : 'Play'}
                </Button>
                <Button
                  variant="default"
                  size="small"
                  leftGlyph={<Icon glyph="Rewind" />}
                  onClick={() => {
                    setCurrentTime(0);
                    setIsPlaying(false);
                  }}
                >
                  Reset
                </Button>
              </div>

              <div style={{
                flex: 1,
                height: '8px',
                background: palette.gray.light2,
                borderRadius: '4px',
                overflow: 'hidden',
                position: 'relative'
              }}>
                <div style={{
                  height: '100%',
                  width: `${(currentTime / caseData.totalDuration) * 100}%`,
                  background: palette.blue.base,
                  transition: 'width 0.1s ease'
                }} />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2] }}>
                <Body style={{
                  fontSize: '12px',
                  color: palette.gray.dark1,
                  margin: 0,
                  minWidth: '80px'
                }}>
                  {currentTime.toFixed(1)}s / {caseData.totalDuration.toFixed(1)}s
                </Body>
                <select
                  value={playbackSpeed}
                  onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
                  style={{
                    padding: `${spacing[1]}px ${spacing[2]}px`,
                    fontSize: '12px',
                    border: `1px solid ${palette.gray.light2}`,
                    borderRadius: '4px'
                  }}
                >
                  <option value={0.5}>0.5x</option>
                  <option value={1}>1x</option>
                  <option value={2}>2x</option>
                  <option value={5}>5x</option>
                </select>
              </div>
            </div>
          </Card>

          {/* Timeline Events */}
          <Card style={{ padding: spacing[3] }}>
            <H3 style={{
              fontSize: '16px',
              color: palette.gray.dark3,
              marginBottom: spacing[3],
              fontFamily: "'Euclid Circular A', sans-serif"
            }}>
              Event Timeline - {caseData.scenario}
            </H3>

            <div style={{
              position: 'relative',
              paddingLeft: spacing[4]
            }}>
              {/* Timeline line */}
              <div style={{
                position: 'absolute',
                left: spacing[2],
                top: 0,
                bottom: 0,
                width: '2px',
                background: palette.gray.light2
              }} />

              {caseData.events.map((event, index) => {
                const eventStart = (event.timestamp - caseData.events[0].timestamp) / 1000;
                const isActive = currentActiveEvents.some(e => e.id === event.id);
                const isPast = currentTime > (eventStart + event.duration);
                const isFuture = currentTime < eventStart;

                if (timelineScale === 'critical' && event.criticality !== 'critical' && event.criticality !== 'high') {
                  return null;
                }

                return (
                  <div
                    key={event.id}
                    style={{
                      position: 'relative',
                      marginBottom: spacing[3],
                      opacity: isFuture ? 0.4 : 1,
                      transform: isActive ? 'scale(1.02)' : 'scale(1)',
                      transition: 'all 0.3s ease'
                    }}
                  >
                    {/* Event marker */}
                    <div style={{
                      position: 'absolute',
                      left: `-${spacing[3]}px`,
                      top: spacing[2],
                      width: '16px',
                      height: '16px',
                      borderRadius: '50%',
                      background: isActive ? getCriticalityColor(event.criticality) : 
                                isPast ? palette.green.base : palette.gray.base,
                      border: `2px solid ${palette.white}`,
                      boxShadow: isActive ? `0 0 8px ${getCriticalityColor(event.criticality)}40` : 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '8px',
                      animation: isActive ? 'pulse 2s infinite' : 'none'
                    }}>
                      {isPast && !isActive && '✓'}
                    </div>

                    {/* Event card */}
                    <div style={{
                      padding: spacing[3],
                      background: isActive ? `${getCriticalityColor(event.criticality)}08` : 
                                isPast ? palette.green.light3 : palette.white,
                      border: `1px solid ${isActive ? getCriticalityColor(event.criticality) : 
                              isPast ? palette.green.light2 : palette.gray.light2}`,
                      borderRadius: '8px',
                      marginLeft: spacing[2]
                    }}>
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        marginBottom: spacing[2]
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2] }}>
                          <span style={{ fontSize: '16px' }}>
                            {getEventIcon(event.type)}
                          </span>
                          <div>
                            <Body style={{
                              fontSize: '14px',
                              fontWeight: 600,
                              color: palette.gray.dark3,
                              margin: 0
                            }}>
                              {event.action}
                            </Body>
                            <Body style={{
                              fontSize: '11px',
                              color: palette.gray.dark1,
                              margin: 0
                            }}>
                              {event.agent} • {eventStart.toFixed(1)}s • {event.duration}s duration
                            </Body>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: spacing[1] }}>
                          <Badge variant={event.criticality === 'critical' ? 'red' : 
                                         event.criticality === 'high' ? 'yellow' : 'blue'} 
                                 size="small">
                            {event.criticality}
                          </Badge>
                          <Badge variant="lightgray" size="small">
                            {Math.round(event.confidence * 100)}%
                          </Badge>
                        </div>
                      </div>
                      <Body style={{
                        fontSize: '12px',
                        color: palette.gray.dark1,
                        margin: 0
                      }}>
                        {event.details}
                      </Body>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        {/* Critical Path Analysis Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[4] }}>
          {/* Case Summary */}
          <Card style={{ padding: spacing[3] }}>
            <H3 style={{
              fontSize: '16px',
              color: palette.gray.dark3,
              marginBottom: spacing[3],
              fontFamily: "'Euclid Circular A', sans-serif"
            }}>
              Case Summary
            </H3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[3] }}>
              <div style={{
                padding: spacing[2],
                background: caseData.outcome === 'BLOCK' ? palette.red.light3 : palette.yellow.light3,
                borderRadius: '6px',
                textAlign: 'center'
              }}>
                <Body style={{
                  fontSize: '18px',
                  fontWeight: 700,
                  color: caseData.outcome === 'BLOCK' ? palette.red.dark2 : palette.yellow.dark2,
                  margin: 0,
                  marginBottom: '4px'
                }}>
                  {caseData.outcome}
                </Body>
                <Overline style={{
                  fontSize: '10px',
                  color: palette.gray.dark1,
                  margin: 0
                }}>
                  Final Decision
                </Overline>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: spacing[2]
              }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{
                    fontSize: '20px',
                    fontWeight: 700,
                    color: palette.blue.dark2
                  }}>
                    {caseData.totalDuration.toFixed(1)}s
                  </div>
                  <Overline style={{
                    fontSize: '10px',
                    color: palette.gray.dark1,
                    margin: 0
                  }}>
                    Total Time
                  </Overline>
                </div>

                <div style={{ textAlign: 'center' }}>
                  <div style={{
                    fontSize: '20px',
                    fontWeight: 700,
                    color: palette.green.dark2
                  }}>
                    {caseData.events.length}
                  </div>
                  <Overline style={{
                    fontSize: '10px',
                    color: palette.gray.dark1,
                    margin: 0
                  }}>
                    Events
                  </Overline>
                </div>
              </div>
            </div>
          </Card>

          {/* Critical Path Analysis */}
          <Card style={{ padding: spacing[3] }}>
            <H3 style={{
              fontSize: '16px',
              color: palette.gray.dark3,
              marginBottom: spacing[3],
              fontFamily: "'Euclid Circular A', sans-serif"
            }}>
              Critical Path Analysis
            </H3>

            <div style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: spacing[3]
            }}>
              <div style={{
                fontSize: '32px',
                fontWeight: 700,
                color: palette.red.dark2
              }}>
                {criticalPath.percentage.toFixed(0)}%
              </div>
              <div style={{
                marginLeft: spacing[2],
                padding: `${spacing[1]}px ${spacing[2]}px`,
                background: palette.red.light3,
                borderRadius: '12px'
              }}>
                <Body style={{
                  fontSize: '10px',
                  color: palette.red.dark2,
                  margin: 0,
                  textTransform: 'uppercase',
                  fontWeight: 600
                }}>
                  Critical Path
                </Body>
              </div>
            </div>

            <div style={{ marginBottom: spacing[3] }}>
              <Body style={{
                fontSize: '12px',
                color: palette.gray.dark1,
                textAlign: 'center',
                margin: 0
              }}>
                {criticalPath.totalTime.toFixed(1)}s of {caseData.totalDuration.toFixed(1)}s total duration
              </Body>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[2] }}>
              {criticalPath.events.map(event => (
                <div
                  key={event.id}
                  style={{
                    padding: spacing[2],
                    border: `1px solid ${getCriticalityColor(event.criticality)}`,
                    borderRadius: '6px',
                    background: `${getCriticalityColor(event.criticality)}08`
                  }}
                >
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
                      {event.action}
                    </Body>
                    <Body style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      color: getCriticalityColor(event.criticality),
                      margin: 0
                    }}>
                      {event.duration}s
                    </Body>
                  </div>
                  <Body style={{
                    fontSize: '10px',
                    color: palette.gray.dark1,
                    margin: 0
                  }}>
                    {event.agent}
                  </Body>
                </div>
              ))}
            </div>
          </Card>

          {/* Active Events */}
          {currentActiveEvents.length > 0 && (
            <Card style={{ padding: spacing[3] }}>
              <H3 style={{
                fontSize: '16px',
                color: palette.gray.dark3,
                marginBottom: spacing[3],
                fontFamily: "'Euclid Circular A', sans-serif"
              }}>
                Currently Active
              </H3>

              {currentActiveEvents.map(event => (
                <div
                  key={event.id}
                  style={{
                    padding: spacing[3],
                    background: `${getCriticalityColor(event.criticality)}15`,
                    border: `2px solid ${getCriticalityColor(event.criticality)}`,
                    borderRadius: '8px',
                    marginBottom: spacing[2],
                    animation: 'pulse 2s infinite'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2], marginBottom: spacing[2] }}>
                    <span style={{ fontSize: '20px' }}>
                      {getEventIcon(event.type)}
                    </span>
                    <Body style={{
                      fontSize: '14px',
                      fontWeight: 600,
                      color: palette.gray.dark3,
                      margin: 0
                    }}>
                      {event.action}
                    </Body>
                  </div>
                  <Body style={{
                    fontSize: '11px',
                    color: palette.gray.dark1,
                    margin: 0
                  }}>
                    {event.agent} • Confidence: {Math.round(event.confidence * 100)}%
                  </Body>
                </div>
              ))}
            </Card>
          )}
        </div>
      </div>

      {/* Add CSS animation */}
      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
      `}</style>
    </div>
  );
};

export default TimelineView;