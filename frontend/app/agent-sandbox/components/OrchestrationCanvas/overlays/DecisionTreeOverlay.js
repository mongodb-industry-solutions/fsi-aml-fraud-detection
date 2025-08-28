'use client';

import React, { useState, useEffect } from 'react';
import { palette } from '@leafygreen-ui/palette';
import { spacing } from '@leafygreen-ui/tokens';
import { H3, Body, Overline } from '@leafygreen-ui/typography';

const DecisionTreeOverlay = ({ 
  nodes, 
  isSimulationRunning, 
  selectedScenario,
  onDecisionUpdate 
}) => {
  const [activeDecisions, setActiveDecisions] = useState([]);
  const [decisionHistory, setDecisionHistory] = useState([]);
  const [expandedNodes, setExpandedNodes] = useState(new Set());
  const [chainOfThoughts, setChainOfThoughts] = useState(new Map());
  const [backtrackingPaths, setBacktrackingPaths] = useState(new Map());
  const [landscapeView, setLandscapeView] = useState(false);

  // Clear decision state when simulation stops
  useEffect(() => {
    if (!isSimulationRunning) {
      setActiveDecisions([]);
      setDecisionHistory([]);
      setExpandedNodes(new Set());
    }
  }, [isSimulationRunning]);

  // Enhanced decision tree node types with confidence weighting
  const decisionTypes = {
    'risk_threshold': {
      icon: '⚠️',
      color: palette.yellow.dark1,
      branches: ['LOW_RISK', 'MEDIUM_RISK', 'HIGH_RISK', 'CRITICAL_RISK'],
      reasoning_weight: 0.8,
      complexity: 'high'
    },
    'transaction_pattern': {
      icon: '📊',
      color: palette.blue.base,
      branches: ['NORMAL', 'UNUSUAL', 'SUSPICIOUS', 'FRAUDULENT'],
      reasoning_weight: 0.7,
      complexity: 'medium'
    },
    'behavioral_analysis': {
      icon: '👤',
      color: palette.green.base,
      branches: ['CONSISTENT', 'DEVIATION', 'ANOMALY', 'THREAT']
    },
    'network_analysis': {
      icon: '🕸️',
      color: palette.red.base,
      branches: ['ISOLATED', 'CONNECTED', 'HUB', 'CRIMINAL_NETWORK']
    },
    'compliance_check': {
      icon: '✅',
      color: palette.green.dark1,
      branches: ['COMPLIANT', 'MINOR_ISSUE', 'VIOLATION', 'SERIOUS_BREACH']
    },
    'investigation_depth': {
      icon: '🔍',
      color: palette.red.dark1,
      branches: ['SURFACE', 'DETAILED', 'DEEP_DIVE', 'FORENSIC']
    }
  };

  // Generate decision tree based on agent type and scenario
  const generateDecisionTree = (agentType, scenarioId) => {
    const decisionOptions = {
      'analyzer': ['risk_threshold', 'transaction_pattern', 'behavioral_analysis'],
      'investigator': ['network_analysis', 'investigation_depth', 'behavioral_analysis'],
      'compliance': ['compliance_check', 'risk_threshold', 'transaction_pattern'],
      'validator': ['compliance_check', 'risk_threshold', 'network_analysis']
    };

    const agentDecisions = decisionOptions[agentType] || ['risk_threshold'];
    return agentDecisions[Math.floor(Math.random() * agentDecisions.length)];
  };

  // MAS Research: Chain-of-Thought Processor
  const generateChainOfThought = (decisionType, agentData) => {
    const thoughtSteps = [];
    const decisionConfig = decisionTypes[decisionType];
    
    // Generate reasoning steps leading to decision
    const stepCount = Math.floor(Math.random() * 4) + 3; // 3-6 steps
    const semanticVectors = []; // For landscape visualization
    
    for (let i = 0; i < stepCount; i++) {
      const step = {
        id: `step_${i}`,
        type: i === 0 ? 'initial_assessment' : i === stepCount - 1 ? 'final_decision' : 'reasoning',
        content: generateReasoningContent(decisionType, i, stepCount),
        confidence: 0.3 + (Math.random() * 0.5), // Confidence builds over steps
        timestamp: Date.now() + (i * 200),
        semantic_vector: generateSemanticVector(), // For landscape view
        alternatives_considered: i > 0 ? Math.floor(Math.random() * 3) + 1 : 0,
        backtrack_probability: i > 1 ? Math.random() * 0.3 : 0
      };
      thoughtSteps.push(step);
      semanticVectors.push(step.semantic_vector);
    }
    
    return {
      steps: thoughtSteps,
      semantic_vectors: semanticVectors,
      reasoning_pattern: analyzeReasoningPattern(thoughtSteps),
      total_confidence: thoughtSteps[thoughtSteps.length - 1].confidence
    };
  };

  // Generate semantic vectors for landscape visualization
  const generateSemanticVector = () => ({
    x: Math.random() * 200 - 100, // -100 to 100
    y: Math.random() * 200 - 100,
    cluster: Math.floor(Math.random() * 3), // 0-2 for different reasoning clusters
    magnitude: Math.random() * 50 + 10
  });

  // Analyze reasoning patterns (correct vs incorrect)
  const analyzeReasoningPattern = (steps) => {
    const confidenceProgression = steps.map(s => s.confidence);
    const isWandering = confidenceProgression.some((conf, i) => 
      i > 0 && Math.abs(conf - confidenceProgression[i-1]) > 0.2
    );
    const finalConfidence = confidenceProgression[confidenceProgression.length - 1];
    
    return {
      pattern_type: isWandering ? (finalConfidence > 0.7 ? 'correct_wandering' : 'incorrect_wandering') 
                                : (finalConfidence > 0.7 ? 'correct_convergent' : 'incorrect_convergent'),
      wandering_score: isWandering ? 0.8 : 0.2,
      convergence_speed: steps.length,
      confidence_variance: Math.sqrt(confidenceProgression.reduce((sum, conf, i) => {
        const mean = confidenceProgression.reduce((a, b) => a + b) / confidenceProgression.length;
        return sum + Math.pow(conf - mean, 2);
      }, 0) / confidenceProgression.length)
    };
  };

  // Generate realistic reasoning content
  const generateReasoningContent = (decisionType, stepIndex, totalSteps) => {
    const contentTemplates = {
      'risk_threshold': [
        'Initial transaction data assessment...',
        'Comparing against historical patterns...',
        'Evaluating velocity and geographic factors...',
        'Cross-referencing with known fraud signatures...',
        'Calculating final risk score...',
        'Decision: Risk threshold determination complete'
      ],
      'transaction_pattern': [
        'Analyzing transaction sequence...',
        'Identifying pattern deviations...',
        'Checking merchant risk profiles...',
        'Evaluating time-based clustering...',
        'Pattern classification in progress...',
        'Decision: Pattern categorization complete'
      ],
      'behavioral_analysis': [
        'Establishing behavioral baseline...',
        'Detecting anomalous behaviors...',
        'Analyzing contextual factors...',
        'Scoring behavioral consistency...',
        'Integrating multi-factor analysis...',
        'Decision: Behavioral assessment complete'
      ]
    };

    const templates = contentTemplates[decisionType] || contentTemplates['risk_threshold'];
    return templates[Math.min(stepIndex, templates.length - 1)];
  };

  // MAS Research: Backtracking Visualization
  const handleBacktracking = (decisionId, fromStep, reason) => {
    setBacktrackingPaths(prev => {
      const newPaths = new Map(prev);
      const backtrackEvent = {
        id: `backtrack_${Date.now()}`,
        decisionId,
        fromStep,
        reason,
        timestamp: Date.now(),
        recovery_path: []
      };
      newPaths.set(decisionId, [...(newPaths.get(decisionId) || []), backtrackEvent]);
      return newPaths;
    });

    // Animate backtracking in decision tree
    setTimeout(() => {
      setActiveDecisions(prev => prev.map(decision => {
        if (decision.id === decisionId) {
          return {
            ...decision,
            phase: 'backtracking',
            current_step: Math.max(0, fromStep - 1),
            backtrack_reason: reason
          };
        }
        return decision;
      }));
    }, 500);
  };

  // Generate realistic decision branches
  const generateDecisionBranches = (decisionType, agentData) => {
    const config = decisionTypes[decisionType];
    if (!config) return [];

    return config.branches.map((branch, index) => {
      const probability = Math.random();
      const confidence = 0.4 + Math.random() * 0.5; // 40-90% confidence
      
      // Weight probabilities based on agent type and scenario context
      let weightedProbability = probability;
      if (agentData.type === 'validator' && branch.includes('COMPLIANT')) {
        weightedProbability += 0.2;
      } else if (agentData.type === 'investigator' && branch.includes('SUSPICIOUS')) {
        weightedProbability += 0.15;
      }

      return {
        id: `${decisionType}_${branch}_${Date.now()}_${index}`,
        label: branch.replace('_', ' '),
        probability: Math.min(weightedProbability, 1),
        confidence,
        reasoning: generateDecisionReasoning(decisionType, branch, agentData.type),
        outcome: probability > 0.6 ? 'likely' : probability > 0.3 ? 'possible' : 'unlikely',
        impact: Math.random() > 0.5 ? 'high' : 'medium'
      };
    });
  };

  // Generate reasoning for decision branches
  const generateDecisionReasoning = (decisionType, branch, agentType) => {
    const reasoningTemplates = {
      'risk_threshold': {
        'LOW_RISK': 'Transaction patterns within normal parameters',
        'MEDIUM_RISK': 'Some unusual indicators detected',
        'HIGH_RISK': 'Multiple risk factors identified',
        'CRITICAL_RISK': 'Severe risk indicators present'
      },
      'transaction_pattern': {
        'NORMAL': 'Consistent with user history',
        'UNUSUAL': 'Deviates from typical behavior',
        'SUSPICIOUS': 'Pattern matches known fraud signatures',
        'FRAUDULENT': 'Clear indicators of fraudulent activity'
      },
      'behavioral_analysis': {
        'CONSISTENT': 'Behavior matches established profile',
        'DEVIATION': 'Minor changes in behavior patterns',
        'ANOMALY': 'Significant behavioral inconsistencies',
        'THREAT': 'Behavior indicates potential threat'
      },
      'network_analysis': {
        'ISOLATED': 'Limited network connections',
        'CONNECTED': 'Normal network associations',
        'HUB': 'Central position in transaction network',
        'CRIMINAL_NETWORK': 'Connected to known criminal entities'
      },
      'compliance_check': {
        'COMPLIANT': 'Meets all regulatory requirements',
        'MINOR_ISSUE': 'Small compliance gaps identified',
        'VIOLATION': 'Clear regulatory violation detected',
        'SERIOUS_BREACH': 'Major compliance breach identified'
      },
      'investigation_depth': {
        'SURFACE': 'Basic investigation sufficient',
        'DETAILED': 'Requires thorough examination',
        'DEEP_DIVE': 'Comprehensive investigation needed',
        'FORENSIC': 'Full forensic analysis required'
      }
    };

    return reasoningTemplates[decisionType]?.[branch] || `${agentType} analysis indicates ${branch}`;
  };

  // Enhanced decision tree expansion with chain-of-thought
  const createDecisionNode = (agentNode) => {
    if (!agentNode.data || !['analyzer', 'investigator', 'compliance', 'validator'].includes(agentNode.data.type)) {
      return null;
    }

    const decisionType = generateDecisionTree(agentNode.data.type, selectedScenario?.id);
    const branches = generateDecisionBranches(decisionType, agentNode.data);
    
    // Generate chain-of-thought for this decision
    const chainOfThought = generateChainOfThought(agentNode.data.type, decisionType, branches);
    const reasoningPattern = analyzeReasoningPattern(chainOfThought, branches);
    
    const decisionNode = {
      id: `decision_${agentNode.id}_${Date.now()}`,
      agentId: agentNode.id,
      agentName: agentNode.data.name,
      agentType: agentNode.data.type,
      position: { 
        x: agentNode.position.x + 150, 
        y: agentNode.position.y - 50 
      },
      decisionType,
      branches,
      startTime: Date.now(),
      phase: 'analyzing', // analyzing -> deciding -> resolved
      selectedBranch: null,
      confidence: null,
      // Enhanced MAS Research Features
      chainOfThought,
      reasoningPattern,
      semanticVector: generateSemanticVector(chainOfThought),
      alternativePaths: branches.map(branch => ({
        ...branch,
        rejectionReason: branch.probability < 0.6 ? 
          `Low confidence: ${(branch.probability * 100).toFixed(1)}% probability` : null
      })),
      backtrackingTriggers: []
    };

    // Store in chain-of-thought state for landscape view
    setChainOfThoughts(prev => ({
      ...prev,
      [decisionNode.id]: {
        agent: agentNode.data.name,
        reasoning: chainOfThought,
        pattern: reasoningPattern,
        timestamp: Date.now(),
        position: decisionNode.position
      }
    }));

    return decisionNode;
  };

  // Enhanced process decision making with backtracking
  const processDecision = (decisionId) => {
    setActiveDecisions(prev => prev.map(decision => {
      if (decision.id === decisionId && decision.phase === 'analyzing') {
        // Simulate decision making delay
        setTimeout(() => {
          const selectedBranch = decision.branches.reduce((best, branch) => 
            branch.probability > best.probability ? branch : best
          );
          
          // Check for backtracking conditions
          const shouldBacktrack = selectedBranch.confidence < 0.4 || 
            (Math.random() < 0.15 && selectedBranch.confidence < 0.7); // 15% chance to backtrack on low confidence
          
          if (shouldBacktrack) {
            handleBacktracking(decision, selectedBranch);
            return;
          }
          
          setActiveDecisions(current => current.map(d => 
            d.id === decisionId ? {
              ...d,
              phase: 'resolved',
              selectedBranch,
              confidence: selectedBranch.confidence,
              endTime: Date.now(),
              // Update chain-of-thought with final reasoning
              finalReasoning: generateReasoningContent(
                selectedBranch.action, 
                d.alternativePaths.filter(path => path.action !== selectedBranch.action),
                selectedBranch.confidence
              )
            } : d
          ));

          // Update chain-of-thought state with resolution
          setChainOfThoughts(prev => ({
            ...prev,
            [decisionId]: {
              ...prev[decisionId],
              resolved: true,
              selectedAction: selectedBranch.action,
              finalConfidence: selectedBranch.confidence,
              resolutionTime: Date.now()
            }
          }));

          // Move to history after resolution
          setTimeout(() => {
            setActiveDecisions(current => current.filter(d => d.id !== decisionId));
            setDecisionHistory(history => [{
              ...decision,
              selectedBranch,
              confidence: selectedBranch.confidence,
              endTime: Date.now(),
              chainOfThought: decision.chainOfThought,
              reasoningPattern: decision.reasoningPattern
            }, ...history.slice(0, 9)]); // Keep last 10
          }, 3000);

          if (onDecisionUpdate) {
            onDecisionUpdate({
              agentId: decision.agentId,
              decision: selectedBranch,
              confidence: selectedBranch.confidence,
              reasoningPattern: decision.reasoningPattern
            });
          }
        }, 2000 + Math.random() * 3000);

        return { ...decision, phase: 'deciding' };
      }
      return decision;
    }));
  };

  // Generate decision trees during simulation - ONLY when simulation just started
  useEffect(() => {
    if (!isSimulationRunning) {
      // Clear active decisions when simulation stops
      setActiveDecisions([]);
      setDecisionHistory([]);
      setChainOfThoughts({});
      return;
    }

    // Wait 3 seconds after simulation starts, then create initial decisions
    const startupTimer = setTimeout(() => {
      // Create one initial decision for each eligible agent type
      const eligibleAgents = nodes.filter(node => 
        ['analyzer', 'investigator', 'compliance', 'validator'].includes(node.data?.type)
      ).slice(0, 2); // Limit to 2 agents max to prevent UI overload

      eligibleAgents.forEach((agent, index) => {
        setTimeout(() => {
          const newDecision = createDecisionNode(agent);
          if (newDecision) {
            setActiveDecisions(prev => [...prev, newDecision]);
            // Start processing after a delay
            setTimeout(() => processDecision(newDecision.id), 2000);
          }
        }, index * 1500); // Stagger creation
      });
    }, 3000);

    return () => clearTimeout(startupTimer);
  }, [isSimulationRunning]); // Removed problematic dependencies

  // Toggle node expansion
  const toggleNodeExpansion = (nodeId) => {
    setExpandedNodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId);
      } else {
        newSet.add(nodeId);
      }
      return newSet;
    });
  };

  // Render decision tree node
  const renderDecisionNode = (decision) => {
    const isExpanded = expandedNodes.has(decision.id);
    const config = decisionTypes[decision.decisionType];

    return (
      <div
        key={decision.id}
        style={{
          position: 'absolute',
          left: decision.position.x,
          top: decision.position.y,
          zIndex: 15,
          maxWidth: '280px'
        }}
      >
        {/* Main Decision Node */}
        <div
          onClick={() => toggleNodeExpansion(decision.id)}
          style={{
            background: palette.white,
            border: `2px solid ${config.color}`,
            borderRadius: '12px',
            padding: spacing[2],
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            transition: 'all 0.3s ease',
            transform: isExpanded ? 'scale(1.02)' : 'scale(1)'
          }}
        >
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: spacing[1],
            marginBottom: spacing[1]
          }}>
            <span style={{ fontSize: '16px' }}>{config.icon}</span>
            <Body style={{
              fontSize: '12px',
              fontWeight: 600,
              color: palette.gray.dark3,
              margin: 0
            }}>
              Decision Analysis
            </Body>
            <span style={{
              fontSize: '12px',
              color: isExpanded ? palette.blue.base : palette.gray.base,
              transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.3s ease'
            }}>
              ▼
            </span>
          </div>
          
          <Overline style={{
            fontSize: '10px',
            color: config.color,
            margin: 0,
            textTransform: 'uppercase'
          }}>
            {decision.decisionType.replace('_', ' ')} • {decision.phase}
          </Overline>
          
          <Body style={{
            fontSize: '11px',
            color: palette.gray.dark1,
            margin: `${spacing[1]}px 0 0 0`
          }}>
            {decision.agentName} ({decision.agentType})
          </Body>
        </div>

        {/* Decision Branches */}
        {isExpanded && (
          <div style={{
            marginTop: spacing[1],
            background: palette.white,
            border: `1px solid ${palette.gray.light2}`,
            borderRadius: '8px',
            overflow: 'hidden',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}>
            {decision.branches.map((branch, index) => (
              <div
                key={branch.id}
                style={{
                  padding: `${spacing[1]}px ${spacing[2]}px`,
                  borderBottom: index < decision.branches.length - 1 ? `1px solid ${palette.gray.light2}` : 'none',
                  background: decision.selectedBranch?.id === branch.id ? 
                    `${config.color}15` : 'transparent',
                  borderLeft: decision.selectedBranch?.id === branch.id ? 
                    `3px solid ${config.color}` : 'none'
                }}
              >
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '2px'
                }}>
                  <Body style={{
                    fontSize: '11px',
                    fontWeight: decision.selectedBranch?.id === branch.id ? 600 : 400,
                    color: decision.selectedBranch?.id === branch.id ? 
                      config.color : palette.gray.dark2,
                    margin: 0
                  }}>
                    {branch.label}
                  </Body>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{
                      fontSize: '9px',
                      color: branch.outcome === 'likely' ? palette.green.dark1 :
                             branch.outcome === 'possible' ? palette.yellow.dark1 : palette.gray.dark1,
                      fontWeight: 600
                    }}>
                      {Math.round(branch.probability * 100)}%
                    </span>
                    {decision.selectedBranch?.id === branch.id && (
                      <span style={{ fontSize: '10px', color: config.color }}>✓</span>
                    )}
                  </div>
                </div>
                <Overline style={{
                  fontSize: '9px',
                  color: palette.gray.dark1,
                  margin: 0,
                  lineHeight: '1.3'
                }}>
                  {branch.reasoning}
                </Overline>
              </div>
            ))}
            
            {/* Chain-of-Thought Panel */}
            {decision.chainOfThought && (
              <div style={{
                padding: spacing[2],
                borderTop: `1px solid ${palette.gray.light2}`,
                background: `${palette.blue.light3}10`
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: spacing[1],
                  marginBottom: spacing[1]
                }}>
                  <span style={{ fontSize: '12px' }}>🧠</span>
                  <Body style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    color: palette.blue.dark1,
                    margin: 0
                  }}>
                    Chain-of-Thought Analysis
                  </Body>
                  {decision.reasoningPattern && (
                    <span style={{
                      fontSize: '9px',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      background: palette.blue.base,
                      color: palette.white,
                      textTransform: 'uppercase',
                      fontWeight: 600
                    }}>
                      {decision.reasoningPattern}
                    </span>
                  )}
                </div>
                
                <div style={{
                  maxHeight: '120px',
                  overflowY: 'auto',
                  fontSize: '10px',
                  lineHeight: 1.4,
                  color: palette.gray.dark2
                }}>
                  {decision.chainOfThought.map((thought, index) => (
                    <div key={index} style={{
                      marginBottom: spacing[1],
                      paddingLeft: spacing[1],
                      borderLeft: `2px solid ${palette.blue.light2}`,
                      background: index === decision.chainOfThought.length - 1 && decision.phase === 'resolved' ?
                        `${palette.green.light3}20` : 'transparent'
                    }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '4px'
                      }}>
                        <span style={{
                          color: palette.blue.base,
                          fontWeight: 600,
                          minWidth: '20px'
                        }}>
                          {index + 1}.
                        </span>
                        <span>{thought}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Alternative Paths Rejected */}
                {decision.alternativePaths?.some(path => path.rejectionReason) && (
                  <div style={{ marginTop: spacing[1] }}>
                    <Overline style={{
                      fontSize: '9px',
                      color: palette.yellow.dark1,
                      margin: '0 0 4px 0',
                      textTransform: 'uppercase'
                    }}>
                      Alternative Paths Considered
                    </Overline>
                    {decision.alternativePaths
                      .filter(path => path.rejectionReason)
                      .map((path, index) => (
                        <div key={index} style={{
                          fontSize: '9px',
                          color: palette.gray.base,
                          marginBottom: '2px',
                          paddingLeft: spacing[1]
                        }}>
                          <span style={{ textDecoration: 'line-through' }}>
                            {path.action}
                          </span>
                          <span style={{ 
                            color: palette.yellow.dark1,
                            marginLeft: '4px',
                            fontStyle: 'italic'
                          }}>
                            ({path.rejectionReason})
                          </span>
                        </div>
                      ))}
                  </div>
                )}

                {/* Backtracking Triggers */}
                {decision.backtrackingTriggers?.length > 0 && (
                  <div style={{
                    marginTop: spacing[1],
                    padding: spacing[1],
                    background: `${palette.yellow.light3}20`,
                    borderRadius: '4px'
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      marginBottom: '4px'
                    }}>
                      <span style={{ fontSize: '10px' }}>↩️</span>
                      <Overline style={{
                        fontSize: '9px',
                        color: palette.yellow.dark2,
                        margin: 0,
                        textTransform: 'uppercase'
                      }}>
                        Backtracking Events
                      </Overline>
                    </div>
                    {decision.backtrackingTriggers.map((trigger, index) => (
                      <div key={index} style={{
                        fontSize: '9px',
                        color: palette.yellow.dark1,
                        marginBottom: '2px'
                      }}>
                        • {trigger}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{
      width: '100%',
      marginTop: spacing[2]
    }}>
      {/* Decision Analysis Panel */}
      <div style={{
        background: palette.white,
        border: `1px solid ${palette.gray.light2}`,
        borderRadius: '8px',
        padding: spacing[3]
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: spacing[1],
          marginBottom: spacing[2]
        }}>
          <span style={{ fontSize: '16px' }}>🧠</span>
          <H3 style={{
            fontSize: '16px',
            color: palette.gray.dark2,
            margin: 0,
            fontFamily: "'Euclid Circular A', sans-serif"
          }}>
            Decision Analysis
          </H3>
          {activeDecisions.length > 0 && (
            <span style={{
              fontSize: '11px',
              padding: '2px 6px',
              borderRadius: '4px',
              background: palette.blue.base,
              color: palette.white,
              fontWeight: 600
            }}>
              {activeDecisions.length} active
            </span>
          )}
          {Object.keys(chainOfThoughts).length > 0 && (
            <button
              onClick={() => setLandscapeView(!landscapeView)}
              style={{
                background: landscapeView ? palette.blue.base : `${palette.blue.light3}80`,
                color: landscapeView ? palette.white : palette.blue.dark1,
                border: 'none',
                borderRadius: '6px',
                padding: `${spacing[1]}px ${spacing[2]}px`,
                cursor: 'pointer',
                fontSize: '10px',
                fontWeight: 600,
                marginLeft: 'auto'
              }}
            >
              🗺️ Reasoning Landscape {landscapeView ? '✓' : ''}
            </button>
          )}
        </div>

        {/* Active Decisions Display */}
        {activeDecisions.length === 0 ? (
          <Body style={{
            color: palette.gray.base,
            fontStyle: 'italic',
            margin: 0
          }}>
            No active decision processes
          </Body>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: spacing[2]
          }}>
            {activeDecisions.map(decision => (
              <div key={decision.id} style={{
                border: `2px solid ${decisionTypes[decision.decisionType]?.color || palette.blue.base}`,
                borderRadius: '8px',
                overflow: 'hidden',
                background: palette.white
              }}>
                <div style={{
                  padding: spacing[2],
                  background: `${decisionTypes[decision.decisionType]?.color || palette.blue.base}10`,
                  borderBottom: `1px solid ${palette.gray.light2}`
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: spacing[1]
                  }}>
                    <span style={{ fontSize: '14px' }}>
                      {decisionTypes[decision.decisionType]?.icon}
                    </span>
                    <Body style={{
                      fontSize: '12px',
                      fontWeight: 600,
                      color: palette.gray.dark3,
                      margin: 0
                    }}>
                      {decision.agentName} - {decision.decisionType.replace('_', ' ')}
                    </Body>
                    <span style={{
                      fontSize: '10px',
                      padding: '1px 6px',
                      borderRadius: '3px',
                      background: decision.phase === 'resolved' ? palette.green.base : 
                                 decision.phase === 'deciding' ? palette.yellow.base : palette.blue.base,
                      color: palette.white,
                      textTransform: 'uppercase',
                      fontWeight: 600
                    }}>
                      {decision.phase}
                    </span>
                  </div>
                </div>

                {/* Decision Branches */}
                <div style={{ padding: spacing[2] }}>
                  <div style={{
                    display: 'grid',
                    gap: spacing[1],
                    marginBottom: spacing[2]
                  }}>
                    {decision.branches?.map((branch, index) => (
                      <div
                        key={branch.id}
                        style={{
                          padding: `${spacing[1]}px ${spacing[2]}px`,
                          background: decision.selectedBranch?.id === branch.id ? 
                            `${decisionTypes[decision.decisionType]?.color}15` : palette.gray.light3,
                          borderRadius: '4px',
                          borderLeft: decision.selectedBranch?.id === branch.id ? 
                            `3px solid ${decisionTypes[decision.decisionType]?.color}` : 'none'
                        }}
                      >
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}>
                          <Body style={{
                            fontSize: '11px',
                            fontWeight: decision.selectedBranch?.id === branch.id ? 600 : 400,
                            margin: 0
                          }}>
                            {branch.label}
                          </Body>
                          <span style={{
                            fontSize: '10px',
                            fontWeight: 600,
                            color: branch.probability > 0.7 ? palette.green.dark1 : 
                                   branch.probability > 0.4 ? palette.yellow.dark1 : palette.red.dark1
                          }}>
                            {(branch.probability * 100).toFixed(0)}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Chain-of-Thought Section */}
                  {decision.chainOfThought && (
                    <div style={{
                      padding: spacing[2],
                      background: `${palette.blue.light3}10`,
                      borderRadius: '6px',
                      borderTop: `2px solid ${palette.blue.light2}`
                    }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: spacing[1],
                        marginBottom: spacing[1]
                      }}>
                        <span style={{ fontSize: '12px' }}>🧠</span>
                        <Body style={{
                          fontSize: '11px',
                          fontWeight: 600,
                          color: palette.blue.dark1,
                          margin: 0
                        }}>
                          Reasoning Process
                        </Body>
                      </div>
                      
                      <div style={{
                        maxHeight: '100px',
                        overflowY: 'auto',
                        fontSize: '10px',
                        lineHeight: 1.3,
                        color: palette.gray.dark2
                      }}>
                        {decision.chainOfThought.slice(0, 3).map((thought, index) => (
                          <div key={index} style={{
                            marginBottom: '3px',
                            paddingLeft: spacing[1],
                            borderLeft: `2px solid ${palette.blue.light2}`
                          }}>
                            <span style={{ fontWeight: 600, color: palette.blue.base }}>
                              {index + 1}.
                            </span>
                            {' ' + thought}
                          </div>
                        ))}
                        {decision.chainOfThought.length > 3 && (
                          <div style={{
                            color: palette.gray.base,
                            fontStyle: 'italic',
                            textAlign: 'center',
                            marginTop: '4px'
                          }}>
                            +{decision.chainOfThought.length - 3} more steps...
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Decision History Summary */}
        {decisionHistory.length > 0 && (
          <div style={{
            marginTop: spacing[3],
            padding: spacing[2],
            background: `${palette.gray.light3}20`,
            borderRadius: '8px',
            border: `1px solid ${palette.gray.light2}`
          }}>
            <Overline style={{
              fontSize: '11px',
              color: palette.gray.dark3,
              margin: `0 0 ${spacing[1]}px 0`,
              textTransform: 'uppercase'
            }}>
              Recent Decisions ({decisionHistory.length})
            </Overline>
            
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
              gap: spacing[1]
            }}>
              {decisionHistory.slice(0, 4).map(decision => (
                <div
                  key={decision.id}
                  style={{
                    padding: spacing[1],
                    background: palette.white,
                    borderRadius: '4px',
                    border: `1px solid ${palette.gray.light2}`
                  }}
                >
                  <div style={{
                    fontSize: '10px',
                    fontWeight: 600,
                    color: palette.gray.dark2,
                    marginBottom: '2px'
                  }}>
                    {decision.agentName}
                  </div>
                  <div style={{
                    fontSize: '9px',
                    color: palette.gray.dark1
                  }}>
                    {decision.selectedBranch?.label}
                  </div>
                  <div style={{
                    fontSize: '8px',
                    color: decisionTypes[decision.decisionType]?.color,
                    fontWeight: 600,
                    marginTop: '2px'
                  }}>
                    {Math.round(decision.confidence * 100)}% confidence
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Chain-of-Thought Landscape View */}
      {landscapeView && Object.keys(chainOfThoughts).length > 0 && (
        <div style={{
          marginTop: spacing[2]
        }}>
        <div
          style={{
            width: '100%',
            background: `${palette.white}f5`,
            backdropFilter: 'blur(12px)',
            border: `2px solid ${palette.blue.light2}`,
            borderRadius: '12px',
            padding: spacing[3],
            pointerEvents: 'all',
            maxHeight: '70%',
            overflowY: 'auto',
            zIndex: 20
          }}
        >
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: spacing[2]
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: spacing[1]
            }}>
              <span style={{ fontSize: '16px' }}>🗺️</span>
              <H3 style={{
                fontSize: '16px',
                color: palette.blue.dark2,
                margin: 0
              }}>
                Reasoning Landscape
              </H3>
              <span style={{
                fontSize: '11px',
                padding: '2px 6px',
                borderRadius: '4px',
                background: palette.blue.base,
                color: palette.white,
                fontWeight: 600
              }}>
                {Object.keys(chainOfThoughts).length} Decisions
              </span>
            </div>
            <button
              onClick={() => setLandscapeView(false)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: '14px',
                color: palette.gray.base,
                padding: spacing[1]
              }}
            >
              ✕
            </button>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: spacing[2]
          }}>
            {Object.entries(chainOfThoughts).map(([decisionId, thought]) => (
              <div
                key={decisionId}
                style={{
                  background: palette.white,
                  border: `1px solid ${palette.gray.light2}`,
                  borderRadius: '8px',
                  padding: spacing[2],
                  position: 'relative'
                }}
              >
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: spacing[1]
                }}>
                  <div>
                    <Body style={{
                      fontSize: '12px',
                      fontWeight: 600,
                      color: palette.gray.dark3,
                      margin: 0
                    }}>
                      {thought.agent}
                    </Body>
                    <Overline style={{
                      fontSize: '10px',
                      color: palette.gray.base,
                      margin: 0,
                      textTransform: 'uppercase'
                    }}>
                      {thought.pattern}
                    </Overline>
                  </div>
                  <div style={{
                    fontSize: '9px',
                    color: palette.gray.base,
                    textAlign: 'right'
                  }}>
                    {new Date(thought.timestamp).toLocaleTimeString()}
                    {thought.resolved && (
                      <div style={{
                        color: palette.green.dark1,
                        fontWeight: 600,
                        marginTop: '2px'
                      }}>
                        ✓ Resolved ({thought.finalConfidence}% confidence)
                      </div>
                    )}
                  </div>
                </div>

                {/* Reasoning Chain Visualization */}
                <div style={{
                  background: `${palette.blue.light3}10`,
                  borderRadius: '6px',
                  padding: spacing[1],
                  marginBottom: spacing[1]
                }}>
                  <div style={{
                    fontSize: '10px',
                    lineHeight: 1.4,
                    color: palette.gray.dark2
                  }}>
                    {thought.reasoning?.slice(0, 3).map((step, index) => (
                      <div key={index} style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '4px',
                        marginBottom: '4px'
                      }}>
                        <span style={{
                          color: palette.blue.base,
                          fontWeight: 600,
                          minWidth: '14px'
                        }}>
                          {index + 1}.
                        </span>
                        <span>{step}</span>
                      </div>
                    ))}
                    {thought.reasoning?.length > 3 && (
                      <div style={{
                        color: palette.gray.base,
                        fontStyle: 'italic',
                        textAlign: 'center',
                        marginTop: '4px'
                      }}>
                        +{thought.reasoning.length - 3} more steps...
                      </div>
                    )}
                  </div>
                </div>

                {/* Semantic Position Visualization */}
                <div style={{
                  height: '40px',
                  background: `linear-gradient(45deg, ${palette.blue.light3}20, ${palette.green.light3}20)`,
                  borderRadius: '4px',
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  {/* Semantic vector position (simplified 2D projection) */}
                  <div style={{
                    position: 'absolute',
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background: thought.resolved ? palette.green.base : palette.blue.base,
                    left: `${Math.abs(Math.sin(thought.timestamp)) * 85 + 5}%`,
                    top: `${Math.abs(Math.cos(thought.timestamp)) * 70 + 10}%`,
                    transform: 'translate(-50%, -50%)',
                    boxShadow: `0 0 8px ${thought.resolved ? palette.green.base : palette.blue.base}40`
                  }} />
                  <div style={{
                    position: 'absolute',
                    bottom: '2px',
                    left: '4px',
                    fontSize: '8px',
                    color: palette.gray.base,
                    fontWeight: 600
                  }}>
                    Semantic Space
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Landscape Controls */}
          <div style={{
            marginTop: spacing[2],
            padding: spacing[2],
            background: `${palette.gray.light3}20`,
            borderRadius: '8px',
            display: 'flex',
            gap: spacing[2],
            alignItems: 'center',
            flexWrap: 'wrap'
          }}>
            <button
              onClick={() => setChainOfThoughts({})}
              style={{
                padding: `${spacing[1]}px ${spacing[2]}px`,
                background: palette.red.light3,
                color: palette.red.dark2,
                border: 'none',
                borderRadius: '4px',
                fontSize: '10px',
                cursor: 'pointer',
                fontWeight: 600
              }}
            >
              Clear All
            </button>
            <span style={{
              fontSize: '10px',
              color: palette.gray.dark1
            }}>
              Patterns: {[...new Set(Object.values(chainOfThoughts).map(t => t.pattern))].join(', ')}
            </span>
          </div>
        </div>
        </div>
      )}

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes slideIn {
          from { transform: translateX(20px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default DecisionTreeOverlay;