'use client';

import React, { useState, useEffect } from 'react';
import { palette } from '@leafygreen-ui/palette';
import { spacing } from '@leafygreen-ui/tokens';
import { Body, Overline } from '@leafygreen-ui/typography';

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

  // Simulate decision tree expansion
  const createDecisionNode = (agentNode) => {
    if (!agentNode.data || !['analyzer', 'investigator', 'compliance', 'validator'].includes(agentNode.data.type)) {
      return null;
    }

    const decisionType = generateDecisionTree(agentNode.data.type, selectedScenario?.id);
    const branches = generateDecisionBranches(decisionType, agentNode.data);
    
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
      confidence: null
    };

    return decisionNode;
  };

  // Process decision making
  const processDecision = (decisionId) => {
    setActiveDecisions(prev => prev.map(decision => {
      if (decision.id === decisionId && decision.phase === 'analyzing') {
        // Simulate decision making delay
        setTimeout(() => {
          const selectedBranch = decision.branches.reduce((best, branch) => 
            branch.probability > best.probability ? branch : best
          );
          
          setActiveDecisions(current => current.map(d => 
            d.id === decisionId ? {
              ...d,
              phase: 'resolved',
              selectedBranch,
              confidence: selectedBranch.confidence,
              endTime: Date.now()
            } : d
          ));

          // Move to history after resolution
          setTimeout(() => {
            setActiveDecisions(current => current.filter(d => d.id !== decisionId));
            setDecisionHistory(history => [{
              ...decision,
              selectedBranch,
              confidence: selectedBranch.confidence,
              endTime: Date.now()
            }, ...history.slice(0, 9)]); // Keep last 10
          }, 3000);

          if (onDecisionUpdate) {
            onDecisionUpdate({
              agentId: decision.agentId,
              decision: selectedBranch,
              confidence: selectedBranch.confidence
            });
          }
        }, 2000 + Math.random() * 3000);

        return { ...decision, phase: 'deciding' };
      }
      return decision;
    }));
  };

  // Generate decision trees during simulation
  useEffect(() => {
    if (!isSimulationRunning) return;

    const interval = setInterval(() => {
      // Randomly trigger decision trees for active agents
      const eligibleAgents = nodes.filter(node => 
        node.data?.status === 'processing' &&
        ['analyzer', 'investigator', 'compliance', 'validator'].includes(node.data.type) &&
        !activeDecisions.some(d => d.agentId === node.id)
      );

      if (eligibleAgents.length > 0 && Math.random() < 0.25) {
        const selectedAgent = eligibleAgents[Math.floor(Math.random() * eligibleAgents.length)];
        const newDecision = createDecisionNode(selectedAgent);
        
        if (newDecision) {
          setActiveDecisions(prev => [...prev, newDecision]);
          
          // Start processing the decision
          setTimeout(() => processDecision(newDecision.id), 1000);
        }
      }
    }, 8000); // Check every 8 seconds

    return () => clearInterval(interval);
  }, [isSimulationRunning, nodes, activeDecisions, selectedScenario]);

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
          zIndex: 180,
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
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 160
      }}
    >
      {/* Active Decision Trees */}
      <div
        style={{
          pointerEvents: 'all',
          position: 'relative',
          width: '100%',
          height: '100%'
        }}
      >
        {activeDecisions.map(decision => renderDecisionNode(decision))}
      </div>

      {/* Decision History Panel */}
      {decisionHistory.length > 0 && (
        <div
          style={{
            position: 'absolute',
            bottom: spacing[2],
            right: spacing[2],
            background: `${palette.white}f0`,
            backdropFilter: 'blur(8px)',
            border: `1px solid ${palette.gray.light2}`,
            borderRadius: '8px',
            padding: spacing[2],
            pointerEvents: 'all',
            maxWidth: '250px',
            maxHeight: '200px',
            overflowY: 'auto'
          }}
        >
          <Overline style={{
            fontSize: '10px',
            color: palette.gray.dark3,
            margin: `0 0 ${spacing[1]}px 0`,
            textTransform: 'uppercase'
          }}>
            Recent Decisions ({decisionHistory.length})
          </Overline>
          
          {decisionHistory.slice(0, 5).map(decision => (
            <div
              key={decision.id}
              style={{
                padding: `${spacing[1]}px 0`,
                borderBottom: `1px solid ${palette.gray.light2}`,
                fontSize: '10px'
              }}
            >
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span style={{ color: palette.gray.dark2, fontWeight: 600 }}>
                  {decision.agentName}
                </span>
                <span style={{
                  color: decisionTypes[decision.decisionType]?.color,
                  fontSize: '9px'
                }}>
                  {Math.round(decision.confidence * 100)}%
                </span>
              </div>
              <div style={{ color: palette.gray.dark1, marginTop: '2px' }}>
                {decision.selectedBranch?.label}
              </div>
            </div>
          ))}
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