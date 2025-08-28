'use client';

import React, { useState, useEffect } from 'react';
import { H1, H2, Body, Overline } from '@leafygreen-ui/typography';
import { palette } from '@leafygreen-ui/palette';
import { spacing } from '@leafygreen-ui/tokens';
import Button from '@leafygreen-ui/button';
import Card from '@leafygreen-ui/card';
import Badge from '@leafygreen-ui/badge';
import Icon from '@leafygreen-ui/icon';
import { Tabs, Tab } from '@leafygreen-ui/tabs';
import { fraudScenarios, orchestrationPatterns, generatePerformanceMetrics } from './utils/mockDataGenerator';

// Import components
import OrchestrationCanvas from './components/OrchestrationCanvas/OrchestrationCanvas';
import MemoryVisualization from './components/MemoryVisualization/MemoryVisualization';
import PerformanceMetrics from './components/PerformanceMetrics/PerformanceMetrics';
import TimelineView from './components/TimelineView/TimelineView';
import InteractiveDebug from './components/InteractiveDebug/InteractiveDebug';
import ExportToolbar from './components/ExportToolbar/ExportToolbar';

export default function AgentSandbox() {
  // State management
  const [activeView, setActiveView] = useState('orchestration');
  const [selectedScenario, setSelectedScenario] = useState(fraudScenarios[0]);
  const [orchestrationMode, setOrchestrationMode] = useState('magentic');
  const [isSimulationRunning, setIsSimulationRunning] = useState(false);
  const [simulationSpeed, setSimulationSpeed] = useState(1);
  const [performanceMetrics, setPerformanceMetrics] = useState(generatePerformanceMetrics());
  const [debugPanelOpen, setDebugPanelOpen] = useState(false);
  const [selectedNode, setSelectedNode] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredData, setFilteredData] = useState(null);

  // Performance metrics update disabled to prevent re-renders
  // useEffect(() => {
  //   const interval = setInterval(() => {
  //     setPerformanceMetrics(generatePerformanceMetrics());
  //   }, 3000);
  //   return () => clearInterval(interval);
  // }, []);

  // Search handler
  const handleSearch = (term) => {
    setSearchTerm(term);
    // TODO: Implement actual filtering logic based on active view
    if (term.trim()) {
      setFilteredData({ searchTerm: term, activeView });
    } else {
      setFilteredData(null);
    }
  };

  // Prepare data for export
  const getExportData = () => {
    return {
      activeView,
      selectedScenario,
      orchestrationMode,
      isSimulationRunning,
      simulationSpeed,
      metrics: performanceMetrics,
      searchTerm,
      exportedAt: new Date().toISOString(),
      // Add more context data as needed
      timelineEvents: [], // Would be populated from actual timeline data
      memoryData: {}, // Would be populated from actual memory data
      debugMessages: [] // Would be populated from actual debug messages
    };
  };

  // Header component
  const SandboxHeader = () => (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing[4],
      padding: spacing[3],
      background: `linear-gradient(135deg, ${palette.blue.light3}, ${palette.green.light3})`,
      borderRadius: '12px',
      border: `1px solid ${palette.gray.light2}`
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: spacing[3] }}>
        <div style={{
          width: '60px',
          height: '60px',
          borderRadius: '12px',
          background: `linear-gradient(135deg, ${palette.blue.base}, ${palette.blue.dark1})`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '24px'
        }}>
          🚀
        </div>
        <div>
          <H1 style={{
            fontSize: '32px',
            margin: 0,
            background: `linear-gradient(135deg, ${palette.blue.dark2}, ${palette.green.dark2})`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            fontFamily: "'Euclid Circular A', sans-serif"
          }}>
            Agent Sandbox
          </H1>
          <Body style={{
            color: palette.gray.dark1,
            margin: 0,
            fontFamily: "'Euclid Circular A', sans-serif"
          }}>
            Advanced Multi-Agent Orchestration for Fraud Detection
          </Body>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2] }}>
        <Badge variant={isSimulationRunning ? 'green' : 'lightgray'}>
          {isSimulationRunning ? 'SIMULATION ACTIVE' : 'READY'}
        </Badge>
        <Button
          variant={debugPanelOpen ? 'primary' : 'default'}
          size="small"
          leftGlyph={<Icon glyph="MagnifyingGlass" />}
          onClick={() => setDebugPanelOpen(!debugPanelOpen)}
        >
          Debug Panel
        </Button>
      </div>
    </div>
  );

  // Scenario Selection Panel
  const ScenarioPanel = () => (
    <Card style={{ marginBottom: spacing[4] }}>
      <div style={{ padding: spacing[3] }}>
        <H2 style={{ 
          fontSize: '18px', 
          marginBottom: spacing[3],
          color: palette.gray.dark3,
          fontFamily: "'Euclid Circular A', sans-serif"
        }}>
          Fraud Detection Scenarios
        </H2>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: spacing[3]
        }}>
          {fraudScenarios.map(scenario => (
            <Card
              key={scenario.id}
              style={{
                padding: spacing[3],
                cursor: 'pointer',
                border: selectedScenario?.id === scenario.id 
                  ? `2px solid ${palette.blue.base}` 
                  : `1px solid ${palette.gray.light2}`,
                background: selectedScenario?.id === scenario.id 
                  ? palette.blue.light3 
                  : palette.white,
                transition: 'all 0.2s ease'
              }}
              onClick={() => setSelectedScenario(scenario)}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing[2] }}>
                <H2 style={{ 
                  fontSize: '16px', 
                  margin: 0,
                  color: palette.gray.dark3,
                  fontFamily: "'Euclid Circular A', sans-serif"
                }}>
                  {scenario.name}
                </H2>
                <Badge variant={
                  scenario.riskLevel === 'critical' ? 'red' :
                  scenario.riskLevel === 'high' ? 'yellow' :
                  scenario.riskLevel === 'medium' ? 'blue' : 'green'
                }>
                  {scenario.riskLevel.toUpperCase()}
                </Badge>
              </div>
              <Body style={{ 
                fontSize: '14px', 
                color: palette.gray.dark1,
                marginBottom: spacing[2],
                fontFamily: "'Euclid Circular A', sans-serif"
              }}>
                {scenario.description}
              </Body>
              <div style={{ display: 'flex', gap: spacing[2], flexWrap: 'wrap' }}>
                <div style={{ 
                  padding: `${spacing[1]}px ${spacing[2]}px`,
                  background: palette.gray.light3,
                  borderRadius: '4px',
                  fontSize: '12px',
                  color: palette.gray.dark1
                }}>
                  {scenario.agentCount} Agents
                </div>
                <div style={{ 
                  padding: `${spacing[1]}px ${spacing[2]}px`,
                  background: palette.gray.light3,
                  borderRadius: '4px',
                  fontSize: '12px',
                  color: palette.gray.dark1
                }}>
                  ~{scenario.estimatedDuration}s
                </div>
                <div style={{ 
                  padding: `${spacing[1]}px ${spacing[2]}px`,
                  background: palette.gray.light3,
                  borderRadius: '4px',
                  fontSize: '12px',
                  color: palette.gray.dark1
                }}>
                  {scenario.complexity} complexity
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </Card>
  );

  // Control Panel
  const ControlPanel = () => (
    <Card style={{ marginBottom: spacing[4] }}>
      <div style={{ 
        padding: spacing[3],
        display: 'flex',
        alignItems: 'center',
        gap: spacing[4],
        flexWrap: 'wrap'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2] }}>
          <Body style={{ 
            fontSize: '14px', 
            fontWeight: 600,
            color: palette.gray.dark2,
            fontFamily: "'Euclid Circular A', sans-serif"
          }}>
            Orchestration Pattern:
          </Body>
          <div style={{ display: 'flex', gap: spacing[1] }}>
            {Object.entries(orchestrationPatterns).map(([key, pattern]) => (
              <Button
                key={key}
                variant={orchestrationMode === key ? 'primary' : 'default'}
                size="small"
                onClick={() => setOrchestrationMode(key)}
              >
                {pattern.name}
              </Button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2] }}>
          <Body style={{ 
            fontSize: '14px', 
            fontWeight: 600,
            color: palette.gray.dark2,
            fontFamily: "'Euclid Circular A', sans-serif"
          }}>
            Simulation:
          </Body>
          <Button
            variant={isSimulationRunning ? 'danger' : 'primary'}
            size="small"
            leftGlyph={<Icon glyph={isSimulationRunning ? "Pause" : "Play"} />}
            onClick={() => setIsSimulationRunning(!isSimulationRunning)}
          >
            {isSimulationRunning ? 'Pause' : 'Start'}
          </Button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2] }}>
          <Body style={{ 
            fontSize: '14px', 
            fontWeight: 600,
            color: palette.gray.dark2,
            fontFamily: "'Euclid Circular A', sans-serif"
          }}>
            Speed:
          </Body>
          <input
            type="range"
            min="0.25"
            max="3"
            step="0.25"
            value={simulationSpeed}
            onChange={(e) => setSimulationSpeed(parseFloat(e.target.value))}
            style={{
              width: '120px',
              height: '4px',
              borderRadius: '2px',
              background: palette.gray.light2,
              outline: 'none',
              appearance: 'none'
            }}
          />
          <Body style={{ 
            fontSize: '12px', 
            color: palette.gray.dark1,
            minWidth: '30px'
          }}>
            {simulationSpeed}x
          </Body>
        </div>
      </div>
    </Card>
  );

  // Quick Metrics Display
  const QuickMetrics = () => (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
      gap: spacing[3],
      marginBottom: spacing[4]
    }}>
      <Card style={{ padding: spacing[3], textAlign: 'center' }}>
        <div style={{ 
          fontSize: '24px', 
          fontWeight: 700, 
          color: palette.blue.dark2,
          marginBottom: spacing[1]
        }}>
          {performanceMetrics.avgLatency}ms
        </div>
        <Body style={{ 
          fontSize: '12px', 
          color: palette.gray.dark1,
          textTransform: 'uppercase',
          letterSpacing: '0.5px'
        }}>
          Avg Latency
        </Body>
      </Card>

      <Card style={{ padding: spacing[3], textAlign: 'center' }}>
        <div style={{ 
          fontSize: '24px', 
          fontWeight: 700, 
          color: palette.green.dark2,
          marginBottom: spacing[1]
        }}>
          {performanceMetrics.accuracy}%
        </div>
        <Body style={{ 
          fontSize: '12px', 
          color: palette.gray.dark1,
          textTransform: 'uppercase',
          letterSpacing: '0.5px'
        }}>
          Accuracy
        </Body>
      </Card>

      <Card style={{ padding: spacing[3], textAlign: 'center' }}>
        <div style={{ 
          fontSize: '24px', 
          fontWeight: 700, 
          color: palette.yellow.dark2,
          marginBottom: spacing[1]
        }}>
          {Math.round(performanceMetrics.throughput)}
        </div>
        <Body style={{ 
          fontSize: '12px', 
          color: palette.gray.dark1,
          textTransform: 'uppercase',
          letterSpacing: '0.5px'
        }}>
          Decisions/Hour
        </Body>
      </Card>

      <Card style={{ padding: spacing[3], textAlign: 'center' }}>
        <div style={{ 
          fontSize: '24px', 
          fontWeight: 700, 
          color: palette.red.dark2,
          marginBottom: spacing[1]
        }}>
          ${(performanceMetrics.fraudPrevented / 1000000).toFixed(1)}M
        </div>
        <Body style={{ 
          fontSize: '12px', 
          color: palette.gray.dark1,
          textTransform: 'uppercase',
          letterSpacing: '0.5px'
        }}>
          Fraud Prevented
        </Body>
      </Card>
    </div>
  );

  // Node selection handler
  const handleNodeSelect = (node) => {
    setSelectedNode(node);
    if (node && !debugPanelOpen) {
      setDebugPanelOpen(true);
    }
  };

  // Main orchestration canvas component
  const MainCanvas = () => (
    <div>
      {/* Canvas Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: spacing[3],
        padding: spacing[3],
        background: palette.white,
        borderRadius: '8px',
        border: `1px solid ${palette.gray.light2}`
      }}>
        <div>
          <H2 style={{ 
            fontSize: '18px',
            color: palette.gray.dark2, 
            margin: 0,
            fontFamily: "'Euclid Circular A', sans-serif"
          }}>
            {orchestrationPatterns[orchestrationMode].name}
          </H2>
          <Body style={{ 
            fontSize: '14px',
            color: palette.gray.dark1,
            margin: 0,
            fontFamily: "'Euclid Circular A', sans-serif"
          }}>
            {orchestrationPatterns[orchestrationMode].description}
          </Body>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2] }}>
          <Body style={{ 
            fontSize: '12px',
            color: palette.gray.dark1,
            fontFamily: "'Euclid Circular A', sans-serif"
          }}>
            Scenario: <strong>{selectedScenario.name}</strong>
          </Body>
          <Badge variant={isSimulationRunning ? 'green' : 'lightgray'}>
            {orchestrationPatterns[orchestrationMode].agents.length} Agents
          </Badge>
        </div>
      </div>

      {/* ReactFlow Canvas */}
      <OrchestrationCanvas
        pattern={orchestrationPatterns[orchestrationMode]}
        selectedNode={selectedNode?.id}
        onNodeSelect={handleNodeSelect}
        isSimulationRunning={isSimulationRunning}
        simulationSpeed={simulationSpeed}
      />
    </div>
  );

  return (
    <div style={{
      maxWidth: '1400px',
      margin: '0 auto',
      padding: spacing[3]
    }}>
      <SandboxHeader />
      
      <ExportToolbar
        activeView={activeView}
        data={getExportData()}
        onSearch={handleSearch}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
      />
      
      <Tabs 
        selected={activeView} 
        setSelected={setActiveView}
        style={{ marginBottom: spacing[4] }}
      >
        <Tab name="orchestration" label="Orchestration">
          <ScenarioPanel />
          <ControlPanel />
          <QuickMetrics />
          <MainCanvas />
        </Tab>
        
        <Tab name="memory" label="Memory Architecture">
          <MemoryVisualization 
            selectedScenario={selectedScenario}
            isSimulationRunning={isSimulationRunning}
          />
        </Tab>
        
        <Tab name="metrics" label="Performance Metrics">
          <PerformanceMetrics 
            selectedScenario={selectedScenario}
            isSimulationRunning={isSimulationRunning}
          />
        </Tab>
        
        <Tab name="timeline" label="Processing Timeline">
          <TimelineView 
            selectedScenario={selectedScenario}
            isSimulationRunning={isSimulationRunning}
            metrics={performanceMetrics}
          />
        </Tab>
        
        <Tab name="debug" label="Interactive Debug">
          <InteractiveDebug 
            selectedScenario={selectedScenario}
            isSimulationRunning={isSimulationRunning}
            metrics={performanceMetrics}
            selectedNode={selectedNode}
          />
        </Tab>
      </Tabs>

      {/* Debug Panel (when open) */}
      {debugPanelOpen && (
        <Card style={{
          position: 'fixed',
          right: spacing[3],
          top: '50%',
          transform: 'translateY(-50%)',
          width: '400px',
          maxHeight: '80vh',
          zIndex: 1000,
          overflow: 'auto',
          boxShadow: '0 8px 24px rgba(0,0,0,0.15)'
        }}>
          <div style={{
            padding: spacing[3],
            background: palette.gray.dark3,
            color: palette.white,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <H2 style={{ 
              fontSize: '16px', 
              color: palette.white, 
              margin: 0,
              fontFamily: "'Euclid Circular A', sans-serif"
            }}>
              Debug Panel
            </H2>
            <Button
              variant="default"
              size="xsmall"
              onClick={() => setDebugPanelOpen(false)}
            >
              ✕
            </Button>
          </div>
          <div style={{ padding: spacing[3] }}>
            {selectedNode ? (
              <>
                {/* Node Information */}
                <div style={{ marginBottom: spacing[3] }}>
                  <H2 style={{ 
                    fontSize: '14px', 
                    color: palette.gray.dark3, 
                    margin: `0 0 ${spacing[2]}px 0`,
                    fontFamily: "'Euclid Circular A', sans-serif"
                  }}>
                    Node Inspector
                  </H2>
                  
                  <div style={{
                    padding: spacing[2],
                    background: palette.gray.light3,
                    borderRadius: '6px',
                    marginBottom: spacing[2]
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2], marginBottom: spacing[1] }}>
                      <div style={{ fontSize: '20px' }}>
                        {selectedNode.type === 'manager' && '👔'}
                        {selectedNode.type === 'facilitator' && '🎯'}
                        {selectedNode.type === 'analyzer' && '🔍'}
                        {selectedNode.type === 'validator' && '✅'}
                        {selectedNode.type === 'investigator' && '🕵️'}
                        {selectedNode.type === 'compliance' && '⚖️'}
                      </div>
                      <div>
                        <Body style={{ 
                          fontSize: '13px',
                          fontWeight: 600,
                          color: palette.gray.dark3,
                          margin: 0,
                          fontFamily: "'Euclid Circular A', sans-serif"
                        }}>
                          {selectedNode.name}
                        </Body>
                        <Overline style={{
                          fontSize: '10px',
                          color: palette.gray.dark1,
                          margin: 0,
                          textTransform: 'capitalize'
                        }}>
                          {selectedNode.type} • {selectedNode.status}
                        </Overline>
                      </div>
                    </div>
                    
                    <Body style={{
                      fontSize: '11px',
                      color: palette.gray.dark1,
                      margin: 0,
                      lineHeight: 1.4
                    }}>
                      {selectedNode.description}
                    </Body>
                  </div>

                  {/* Confidence and Metrics */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: spacing[2],
                    marginBottom: spacing[3]
                  }}>
                    <div style={{
                      padding: spacing[2],
                      background: palette.white,
                      borderRadius: '6px',
                      border: `1px solid ${palette.gray.light2}`,
                      textAlign: 'center'
                    }}>
                      <div style={{
                        fontSize: '18px',
                        fontWeight: 700,
                        color: selectedNode.confidence >= 80 ? palette.green.base : 
                               selectedNode.confidence >= 60 ? palette.yellow.base : palette.red.base,
                        lineHeight: 1
                      }}>
                        {selectedNode.confidence}%
                      </div>
                      <Overline style={{
                        fontSize: '9px',
                        color: palette.gray.dark1,
                        margin: 0
                      }}>
                        Confidence
                      </Overline>
                    </div>

                    <div style={{
                      padding: spacing[2],
                      background: palette.white,
                      borderRadius: '6px',
                      border: `1px solid ${palette.gray.light2}`,
                      textAlign: 'center'
                    }}>
                      <div style={{
                        fontSize: '18px',
                        fontWeight: 700,
                        color: palette.blue.base,
                        lineHeight: 1
                      }}>
                        {selectedNode.metrics?.avgLatency || 0}ms
                      </div>
                      <Overline style={{
                        fontSize: '9px',
                        color: palette.gray.dark1,
                        margin: 0
                      }}>
                        Latency
                      </Overline>
                    </div>
                  </div>

                  {/* Capabilities */}
                  {selectedNode.capabilities && selectedNode.capabilities.length > 0 && (
                    <div style={{ marginBottom: spacing[3] }}>
                      <Overline style={{
                        fontSize: '10px',
                        color: palette.gray.dark1,
                        margin: `0 0 ${spacing[1]}px 0`,
                        textTransform: 'uppercase'
                      }}>
                        Capabilities
                      </Overline>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: spacing[1] }}>
                        {selectedNode.capabilities.map(capability => (
                          <div
                            key={capability}
                            style={{
                              padding: `${spacing[1]}px ${spacing[2]}px`,
                              background: palette.blue.light3,
                              color: palette.blue.dark2,
                              borderRadius: '12px',
                              fontSize: '10px',
                              fontWeight: 500
                            }}
                          >
                            {capability.replace(/_/g, ' ')}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Real-time Metrics */}
                  {selectedNode.metrics && (
                    <div>
                      <Overline style={{
                        fontSize: '10px',
                        color: palette.gray.dark1,
                        margin: `0 0 ${spacing[1]}px 0`,
                        textTransform: 'uppercase'
                      }}>
                        Performance Metrics
                      </Overline>
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: spacing[1]
                      }}>
                        <div style={{ fontSize: '11px' }}>
                          <span style={{ color: palette.gray.dark1 }}>Throughput: </span>
                          <span style={{ fontWeight: 600, color: palette.gray.dark3 }}>
                            {Math.round(selectedNode.metrics.throughput * 10) / 10}
                          </span>
                        </div>
                        <div style={{ fontSize: '11px' }}>
                          <span style={{ color: palette.gray.dark1 }}>Accuracy: </span>
                          <span style={{ fontWeight: 600, color: palette.gray.dark3 }}>
                            {selectedNode.metrics.accuracy}%
                          </span>
                        </div>
                        <div style={{ fontSize: '11px' }}>
                          <span style={{ color: palette.gray.dark1 }}>Memory: </span>
                          <span style={{ fontWeight: 600, color: palette.gray.dark3 }}>
                            {selectedNode.metrics.memoryUtilization}%
                          </span>
                        </div>
                        <div style={{ fontSize: '11px' }}>
                          <span style={{ color: palette.gray.dark1 }}>Tools: </span>
                          <span style={{ fontWeight: 600, color: palette.gray.dark3 }}>
                            {selectedNode.metrics.toolUsageCount}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: spacing[4] }}>
                <div style={{ fontSize: '32px', marginBottom: spacing[2] }}>🔍</div>
                <Body style={{ 
                  fontSize: '14px',
                  color: palette.gray.dark1,
                  fontFamily: "'Euclid Circular A', sans-serif"
                }}>
                  Click on an agent node to inspect its state and metrics.
                </Body>
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}