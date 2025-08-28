'use client';

import React, { useState, useEffect } from 'react';
import { H3, Body, Overline } from '@leafygreen-ui/typography';
import { palette } from '@leafygreen-ui/palette';
import { spacing } from '@leafygreen-ui/tokens';
import Card from '@leafygreen-ui/card';
import Badge from '@leafygreen-ui/badge';
import Button from '@leafygreen-ui/button';

const TemporalMemoryPanel = ({ vectorMemory, exploreMode, isSimulationRunning }) => {
  const [timeRange, setTimeRange] = useState('24h');
  const [selectedTimeSlot, setSelectedTimeSlot] = useState(null);

  // Generate mock temporal memory data
  const generateTemporalData = () => {
    const timeSlots = [];
    const now = new Date();
    const ranges = {
      '1h': { slots: 12, interval: 5 * 60 * 1000, label: 'min' }, // 5-minute slots
      '24h': { slots: 24, interval: 60 * 60 * 1000, label: 'hour' }, // 1-hour slots  
      '7d': { slots: 7, interval: 24 * 60 * 60 * 1000, label: 'day' }, // 1-day slots
      '30d': { slots: 30, interval: 24 * 60 * 60 * 1000, label: 'day' } // 1-day slots
    };

    const config = ranges[timeRange];
    
    for (let i = 0; i < config.slots; i++) {
      const slotTime = new Date(now.getTime() - (config.slots - i - 1) * config.interval);
      const memoryActivity = Math.max(0, Math.round(80 + (Math.random() - 0.5) * 40));
      const decayRate = Math.max(0, Math.min(100, Math.round(5 + Math.random() * 15)));
      const consolidations = Math.floor(Math.random() * 8);
      
      timeSlots.push({
        id: i,
        time: slotTime,
        memoryActivity,
        decayRate,
        consolidations,
        newVectors: Math.floor(Math.random() * 500),
        prunedVectors: Math.floor(Math.random() * 200),
        similarity: Math.round(75 + Math.random() * 20)
      });
    }

    return timeSlots;
  };

  const [temporalData, setTemporalData] = useState(generateTemporalData());

  // Regenerate data when time range changes
  useEffect(() => {
    setTemporalData(generateTemporalData());
    setSelectedTimeSlot(null);
  }, [timeRange]);

  // Update data during simulation
  useEffect(() => {
    if (!isSimulationRunning) return;

    const interval = setInterval(() => {
      setTemporalData(generateTemporalData());
    }, 5000);

    return () => clearInterval(interval);
  }, [isSimulationRunning, timeRange]);

  // Get activity color based on intensity
  const getActivityColor = (activity) => {
    if (activity >= 80) return palette.green.base;
    if (activity >= 60) return palette.blue.base;
    if (activity >= 40) return palette.yellow.base;
    return palette.gray.base;
  };

  // Get decay color (higher decay = more red)
  const getDecayColor = (decay) => {
    if (decay >= 15) return palette.red.base;
    if (decay >= 10) return palette.yellow.base;
    if (decay >= 5) return palette.blue.base;
    return palette.green.base;
  };

  // Format time label based on range
  const formatTimeLabel = (time) => {
    switch (timeRange) {
      case '1h':
        return time.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
      case '24h':
        return time.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit' }) + 'h';
      case '7d':
        return time.toLocaleDateString('en-US', { weekday: 'short' });
      case '30d':
        return time.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      default:
        return time.toLocaleString();
    }
  };

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: exploreMode ? '2fr 1fr' : '1fr',
      gap: spacing[4],
      height: '100%'
    }}>
      {/* Main Temporal Visualization */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing[3] }}>
          <H3 style={{
            fontSize: '18px',
            color: palette.gray.dark3,
            margin: 0,
            fontFamily: "'Euclid Circular A', sans-serif"
          }}>
            Temporal Memory Analysis
          </H3>

          {/* Time Range Selector */}
          <div style={{ display: 'flex', gap: spacing[1] }}>
            {['1h', '24h', '7d', '30d'].map(range => (
              <Button
                key={range}
                variant={timeRange === range ? 'primary' : 'default'}
                size="xsmall"
                onClick={() => setTimeRange(range)}
              >
                {range}
              </Button>
            ))}
          </div>
        </div>

        {/* Memory Activity Timeline */}
        <Card style={{ padding: spacing[3], marginBottom: spacing[4] }}>
          <H3 style={{
            fontSize: '14px',
            color: palette.gray.dark3,
            marginBottom: spacing[3],
            fontFamily: "'Euclid Circular A', sans-serif"
          }}>
            Memory Activity Over Time
          </H3>

          <div style={{
            display: 'flex',
            alignItems: 'end',
            gap: '2px',
            height: '120px',
            marginBottom: spacing[2]
          }}>
            {temporalData.map(slot => (
              <div
                key={slot.id}
                style={{
                  flex: 1,
                  minWidth: '8px',
                  height: `${slot.memoryActivity}%`,
                  background: getActivityColor(slot.memoryActivity),
                  borderRadius: '2px 2px 0 0',
                  cursor: exploreMode ? 'pointer' : 'default',
                  transition: 'all 0.2s ease',
                  opacity: selectedTimeSlot?.id === slot.id ? 1 : 0.8,
                  transform: selectedTimeSlot?.id === slot.id ? 'scale(1.05)' : 'scale(1)'
                }}
                onClick={() => exploreMode && setSelectedTimeSlot(slot)}
                title={`${formatTimeLabel(slot.time)}: ${slot.memoryActivity}% activity`}
              />
            ))}
          </div>

          {/* Time Labels */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '10px',
            color: palette.gray.dark1
          }}>
            <span>{formatTimeLabel(temporalData[0]?.time)}</span>
            <span>{formatTimeLabel(temporalData[Math.floor(temporalData.length / 2)]?.time)}</span>
            <span>{formatTimeLabel(temporalData[temporalData.length - 1]?.time)}</span>
          </div>
        </Card>

        {/* Time Decay Analysis */}
        <Card style={{ padding: spacing[3], marginBottom: spacing[4] }}>
          <H3 style={{
            fontSize: '14px',
            color: palette.gray.dark3,
            marginBottom: spacing[3],
            fontFamily: "'Euclid Circular A', sans-serif"
          }}>
            Memory Decay Patterns
          </H3>

          <div style={{
            display: 'flex',
            alignItems: 'end',
            gap: '2px',
            height: '80px',
            marginBottom: spacing[2]
          }}>
            {temporalData.map(slot => (
              <div
                key={slot.id}
                style={{
                  flex: 1,
                  minWidth: '8px',
                  height: `${slot.decayRate * 4}%`, // Scale for visualization
                  background: getDecayColor(slot.decayRate),
                  borderRadius: '2px 2px 0 0',
                  cursor: exploreMode ? 'pointer' : 'default',
                  transition: 'all 0.2s ease',
                  opacity: selectedTimeSlot?.id === slot.id ? 1 : 0.8
                }}
                onClick={() => exploreMode && setSelectedTimeSlot(slot)}
                title={`${formatTimeLabel(slot.time)}: ${slot.decayRate}% decay rate`}
              />
            ))}
          </div>

          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <Body style={{
              fontSize: '11px',
              color: palette.gray.dark1,
              margin: 0
            }}>
              Memory decay rate over {timeRange}
            </Body>
            <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2] }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <div style={{ width: '8px', height: '8px', background: palette.green.base, borderRadius: '2px' }} />
                <span style={{ fontSize: '10px', color: palette.gray.dark1 }}>Low</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <div style={{ width: '8px', height: '8px', background: palette.yellow.base, borderRadius: '2px' }} />
                <span style={{ fontSize: '10px', color: palette.gray.dark1 }}>Medium</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <div style={{ width: '8px', height: '8px', background: palette.red.base, borderRadius: '2px' }} />
                <span style={{ fontSize: '10px', color: palette.gray.dark1 }}>High</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Memory Consolidation Events */}
        <Card style={{ padding: spacing[3] }}>
          <H3 style={{
            fontSize: '14px',
            color: palette.gray.dark3,
            marginBottom: spacing[3],
            fontFamily: "'Euclid Circular A', sans-serif"
          }}>
            Memory Consolidation Events
          </H3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[2] }}>
            {temporalData
              .filter(slot => slot.consolidations > 0)
              .slice(0, 5) // Show top 5 consolidation events
              .map(slot => (
                <div
                  key={slot.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: spacing[2],
                    background: palette.gray.light3,
                    borderRadius: '6px',
                    cursor: exploreMode ? 'pointer' : 'default',
                    border: selectedTimeSlot?.id === slot.id ? `2px solid ${palette.blue.base}` : 'none'
                  }}
                  onClick={() => exploreMode && setSelectedTimeSlot(slot)}
                >
                  <div>
                    <Body style={{
                      fontSize: '12px',
                      fontWeight: 600,
                      color: palette.gray.dark3,
                      margin: 0,
                      marginBottom: '2px'
                    }}>
                      {slot.consolidations} Consolidations
                    </Body>
                    <Body style={{
                      fontSize: '11px',
                      color: palette.gray.dark1,
                      margin: 0
                    }}>
                      {formatTimeLabel(slot.time)} • {slot.similarity}% similarity threshold
                    </Body>
                  </div>
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'end',
                    gap: '2px'
                  }}>
                    <Badge variant="blue" size="small">
                      +{slot.newVectors}
                    </Badge>
                    <Badge variant="red" size="small">
                      -{slot.prunedVectors}
                    </Badge>
                  </div>
                </div>
              ))}
          </div>
        </Card>
      </div>

      {/* Explore Panel (only visible in explore mode) */}
      {exploreMode && (
        <div>
          <H3 style={{
            fontSize: '18px',
            color: palette.gray.dark3,
            marginBottom: spacing[3],
            fontFamily: "'Euclid Circular A', sans-serif"
          }}>
            Temporal Analysis
          </H3>

          {/* Overall Temporal Stats */}
          <Card style={{ padding: spacing[3], marginBottom: spacing[3] }}>
            <H3 style={{
              fontSize: '14px',
              color: palette.gray.dark3,
              marginBottom: spacing[2],
              fontFamily: "'Euclid Circular A', sans-serif"
            }}>
              {timeRange} Overview
            </H3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[2] }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <Body style={{ fontSize: '12px', color: palette.gray.dark1, margin: 0 }}>
                  Average Activity
                </Body>
                <Body style={{ fontSize: '12px', fontWeight: 600, color: palette.gray.dark3, margin: 0 }}>
                  {Math.round(temporalData.reduce((sum, slot) => sum + slot.memoryActivity, 0) / temporalData.length)}%
                </Body>
              </div>

              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <Body style={{ fontSize: '12px', color: palette.gray.dark1, margin: 0 }}>
                  Peak Activity
                </Body>
                <Body style={{ fontSize: '12px', fontWeight: 600, color: palette.gray.dark3, margin: 0 }}>
                  {Math.max(...temporalData.map(slot => slot.memoryActivity))}%
                </Body>
              </div>

              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <Body style={{ fontSize: '12px', color: palette.gray.dark1, margin: 0 }}>
                  Total Consolidations
                </Body>
                <Body style={{ fontSize: '12px', fontWeight: 600, color: palette.gray.dark3, margin: 0 }}>
                  {temporalData.reduce((sum, slot) => sum + slot.consolidations, 0)}
                </Body>
              </div>

              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <Body style={{ fontSize: '12px', color: palette.gray.dark1, margin: 0 }}>
                  Average Decay Rate
                </Body>
                <Body style={{ fontSize: '12px', fontWeight: 600, color: palette.gray.dark3, margin: 0 }}>
                  {Math.round(temporalData.reduce((sum, slot) => sum + slot.decayRate, 0) / temporalData.length)}%
                </Body>
              </div>
            </div>
          </Card>

          {/* Selected Time Slot Details */}
          {selectedTimeSlot ? (
            <Card style={{ padding: spacing[3] }}>
              <H3 style={{
                fontSize: '14px',
                color: palette.gray.dark3,
                marginBottom: spacing[2],
                fontFamily: "'Euclid Circular A', sans-serif"
              }}>
                Time Slot Analysis
              </H3>

              <div style={{
                padding: spacing[2],
                background: palette.blue.light3,
                borderRadius: '6px',
                marginBottom: spacing[2]
              }}>
                <Body style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: palette.blue.dark2,
                  margin: 0,
                  marginBottom: '4px'
                }}>
                  {formatTimeLabel(selectedTimeSlot.time)}
                </Body>
                <Body style={{
                  fontSize: '11px',
                  color: palette.gray.dark1,
                  margin: 0
                }}>
                  Memory Activity: {selectedTimeSlot.memoryActivity}%
                </Body>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[2] }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: spacing[1],
                  background: palette.gray.light3,
                  borderRadius: '4px'
                }}>
                  <Body style={{ fontSize: '11px', color: palette.gray.dark1, margin: 0 }}>
                    Decay Rate
                  </Body>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <div style={{
                      width: '8px',
                      height: '8px',
                      background: getDecayColor(selectedTimeSlot.decayRate),
                      borderRadius: '2px'
                    }} />
                    <Body style={{ fontSize: '11px', fontWeight: 600, color: palette.gray.dark3, margin: 0 }}>
                      {selectedTimeSlot.decayRate}%
                    </Body>
                  </div>
                </div>

                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: spacing[1],
                  background: palette.gray.light3,
                  borderRadius: '4px'
                }}>
                  <Body style={{ fontSize: '11px', color: palette.gray.dark1, margin: 0 }}>
                    New Vectors
                  </Body>
                  <Badge variant="blue" size="small">
                    +{selectedTimeSlot.newVectors}
                  </Badge>
                </div>

                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: spacing[1],
                  background: palette.gray.light3,
                  borderRadius: '4px'
                }}>
                  <Body style={{ fontSize: '11px', color: palette.gray.dark1, margin: 0 }}>
                    Pruned Vectors
                  </Body>
                  <Badge variant="red" size="small">
                    -{selectedTimeSlot.prunedVectors}
                  </Badge>
                </div>

                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: spacing[1],
                  background: palette.gray.light3,
                  borderRadius: '4px'
                }}>
                  <Body style={{ fontSize: '11px', color: palette.gray.dark1, margin: 0 }}>
                    Consolidations
                  </Body>
                  <Body style={{ fontSize: '11px', fontWeight: 600, color: palette.gray.dark3, margin: 0 }}>
                    {selectedTimeSlot.consolidations}
                  </Body>
                </div>
              </div>

              <div style={{
                marginTop: spacing[2],
                padding: spacing[2],
                background: palette.green.light3,
                borderRadius: '6px',
                border: `1px solid ${palette.green.light2}`
              }}>
                <Overline style={{
                  fontSize: '10px',
                  color: palette.green.dark2,
                  margin: `0 0 ${spacing[1]}px 0`,
                  textTransform: 'uppercase'
                }}>
                  Temporal Memory Insights
                </Overline>
                <Body style={{
                  fontSize: '11px',
                  color: palette.gray.dark1,
                  margin: 0
                }}>
                  Memory activity was {selectedTimeSlot.memoryActivity >= 70 ? 'high' : 'moderate'} during this period.
                  {selectedTimeSlot.consolidations > 0 && ` ${selectedTimeSlot.consolidations} consolidation events occurred, improving memory efficiency.`}
                  Decay rate indicates {selectedTimeSlot.decayRate < 10 ? 'good' : 'normal'} memory retention.
                </Body>
              </div>
            </Card>
          ) : (
            <Card style={{ padding: spacing[4], textAlign: 'center' }}>
              <div style={{ fontSize: '32px', marginBottom: spacing[2] }}>⏱️</div>
              <Body style={{
                fontSize: '14px',
                color: palette.gray.dark1,
                fontFamily: "'Euclid Circular A', sans-serif"
              }}>
                Click on a time slot in the charts to see detailed temporal analysis.
              </Body>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};

export default TemporalMemoryPanel;