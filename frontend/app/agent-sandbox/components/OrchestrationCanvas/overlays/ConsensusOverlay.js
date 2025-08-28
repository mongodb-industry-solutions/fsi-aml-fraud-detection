'use client';

import React, { useState, useEffect } from 'react';
import { palette } from '@leafygreen-ui/palette';
import { spacing } from '@leafygreen-ui/tokens';
import { Body, Overline } from '@leafygreen-ui/typography';

const ConsensusOverlay = ({ 
  nodes, 
  edges, 
  isSimulationRunning, 
  selectedScenario,
  onConsensusUpdate 
}) => {
  const [consensusState, setConsensusState] = useState({});
  const [votingRounds, setVotingRounds] = useState([]);
  const [currentRound, setCurrentRound] = useState(null);
  const [showConsensusPanel, setShowConsensusPanel] = useState(false);

  // Clear consensus state when simulation stops
  useEffect(() => {
    if (!isSimulationRunning) {
      setConsensusState({});
      setVotingRounds([]);
      setCurrentRound(null);
      setShowConsensusPanel(false);
    }
  }, [isSimulationRunning]);

  // Consensus states
  const consensusStates = {
    'agreement': {
      color: palette.green.base,
      icon: '✅',
      label: 'Agreement',
      confidence: 0.9
    },
    'disagreement': {
      color: palette.red.base,
      icon: '❌',
      label: 'Disagreement',
      confidence: 0.3
    },
    'partial_agreement': {
      color: palette.yellow.dark1,
      icon: '⚠️',
      label: 'Partial Agreement',
      confidence: 0.7
    },
    'debate_active': {
      color: palette.blue.base,
      icon: '💬',
      label: 'Active Debate',
      confidence: 0.5
    },
    'consensus_reached': {
      color: palette.green.dark2,
      icon: '🎯',
      label: 'Consensus Reached',
      confidence: 0.95
    }
  };

  // Generate realistic consensus scenarios based on fraud detection
  const generateConsensusScenario = () => {
    if (!isSimulationRunning || !nodes.length) return;

    // Filter agents that can participate in consensus
    const participatingAgents = nodes.filter(node => 
      ['analyzer', 'validator', 'investigator', 'compliance', 'tech-analyst', 'risk-assessor'].includes(node.data?.type)
    );

    if (participatingAgents.length < 2) return;

    // Create a new voting round
    const roundId = `round_${Date.now()}`;
    const topic = generateConsensusTopic(selectedScenario);
    
    const newRound = {
      id: roundId,
      topic,
      participants: participatingAgents.map(agent => ({
        id: agent.id,
        name: agent.data.name,
        type: agent.data.type,
        position: agent.position,
        vote: null,
        confidence: null,
        reasoning: null
      })),
      startTime: Date.now(),
      phase: 'initial_voting', // initial_voting -> debate -> final_voting -> resolved
      consensus: null,
      disagreements: []
    };

    setCurrentRound(newRound);
    setVotingRounds(prev => [...prev, newRound]);
    setShowConsensusPanel(true);

    // Start the consensus process
    setTimeout(() => initiateVoting(newRound), 1000);
  };

  // Generate realistic consensus topics
  const generateConsensusTopic = (scenario) => {
    const topics = {
      'money-laundering-ring': [
        'Transaction flagging for cross-border transfers',
        'Risk threshold for shell company connections',
        'Escalation level for network depth analysis',
        'Confidence threshold for AML alert generation'
      ],
      'credit-card-testing': [
        'Micro-transaction pattern thresholds',
        'Velocity-based blocking criteria',
        'Card testing detection sensitivity',
        'False positive tolerance levels'
      ],
      'account-takeover': [
        'Device fingerprinting weight in scoring',
        'Geographic anomaly significance',
        'Behavioral pattern deviation thresholds',
        'Account lockdown trigger conditions'
      ]
    };

    const scenarioTopics = topics[scenario?.id] || [
      'Risk assessment methodology',
      'Detection threshold optimization',
      'Alert prioritization criteria',
      'Investigation resource allocation'
    ];

    return scenarioTopics[Math.floor(Math.random() * scenarioTopics.length)];
  };

  // Simulate voting process
  const initiateVoting = (round) => {
    const participants = [...round.participants];
    
    // Simulate initial votes with realistic agent behaviors
    participants.forEach((participant, index) => {
      setTimeout(() => {
        const vote = generateAgentVote(participant.type, round.topic);
        updateParticipantVote(round.id, participant.id, vote);
      }, (index + 1) * 800 + Math.random() * 500);
    });

    // Check for consensus after all votes
    setTimeout(() => {
      evaluateConsensus(round.id);
    }, participants.length * 1000 + 2000);
  };

  // Generate realistic agent votes based on agent type and topic
  const generateAgentVote = (agentType, topic) => {
    const voteOptions = ['approve', 'reject', 'abstain'];
    const confidenceBase = 0.6 + Math.random() * 0.3;
    
    // Agent type influences voting patterns
    let voteBias = 0.5; // neutral
    
    switch (agentType) {
      case 'validator':
      case 'compliance':
        voteBias = 0.7; // More conservative, tends to approve stricter measures
        break;
      case 'analyzer':
      case 'tech-analyst':
        voteBias = 0.6; // Slightly conservative but data-driven
        break;
      case 'investigator':
      case 'risk-assessor':
        voteBias = 0.4; // More aggressive, tends to flag more
        break;
    }

    const voteValue = Math.random() < voteBias ? 'approve' : Math.random() < 0.8 ? 'reject' : 'abstain';
    
    return {
      vote: voteValue,
      confidence: confidenceBase,
      reasoning: generateVoteReasoning(agentType, voteValue, topic),
      timestamp: Date.now()
    };
  };

  // Generate reasoning for votes
  const generateVoteReasoning = (agentType, vote, topic) => {
    const reasonings = {
      'validator': {
        'approve': 'Complies with regulatory framework',
        'reject': 'Potential compliance risk identified',
        'abstain': 'Insufficient regulatory guidance'
      },
      'analyzer': {
        'approve': 'Pattern analysis supports decision',
        'reject': 'Data indicates higher risk threshold needed',
        'abstain': 'Conflicting signal patterns observed'
      },
      'investigator': {
        'approve': 'Investigation methodology validated',
        'reject': 'Requires additional investigation depth',
        'abstain': 'Case complexity requires specialized review'
      }
    };

    return reasonings[agentType]?.[vote] || `${vote} based on ${agentType} analysis`;
  };

  // Update participant vote in current round
  const updateParticipantVote = (roundId, participantId, voteData) => {
    setVotingRounds(prev => prev.map(round => {
      if (round.id === roundId) {
        const updatedParticipants = round.participants.map(p => 
          p.id === participantId ? { ...p, ...voteData } : p
        );
        return { ...round, participants: updatedParticipants };
      }
      return round;
    }));

    setCurrentRound(prev => {
      if (prev?.id === roundId) {
        const updatedParticipants = prev.participants.map(p => 
          p.id === participantId ? { ...p, ...voteData } : p
        );
        return { ...prev, participants: updatedParticipants };
      }
      return prev;
    });
  };

  // Evaluate consensus from votes
  const evaluateConsensus = (roundId) => {
    const round = votingRounds.find(r => r.id === roundId);
    if (!round) return;

    const votes = round.participants.filter(p => p.vote).map(p => p.vote);
    const approvals = votes.filter(v => v === 'approve').length;
    const rejections = votes.filter(v => v === 'reject').length;
    const abstentions = votes.filter(v => v === 'abstain').length;

    let consensus = 'disagreement';
    let confidence = 0.3;

    // Determine consensus
    if (approvals >= votes.length * 0.75) {
      consensus = 'consensus_reached';
      confidence = 0.95;
    } else if (approvals >= votes.length * 0.6) {
      consensus = 'agreement';
      confidence = 0.8;
    } else if (rejections >= votes.length * 0.6) {
      consensus = 'disagreement';
      confidence = 0.7;
    } else {
      consensus = 'partial_agreement';
      confidence = 0.6;
    }

    // Update round with final consensus
    setVotingRounds(prev => prev.map(r => 
      r.id === roundId ? { 
        ...r, 
        phase: 'resolved', 
        consensus,
        confidence,
        endTime: Date.now()
      } : r
    ));

    setCurrentRound(prev => {
      if (prev?.id === roundId) {
        return { 
          ...prev, 
          phase: 'resolved', 
          consensus,
          confidence,
          endTime: Date.now()
        };
      }
      return prev;
    });

    // Update consensus state for visualization
    setConsensusState({
      state: consensus,
      confidence,
      topic: round.topic,
      timestamp: Date.now()
    });

    if (onConsensusUpdate) {
      onConsensusUpdate({ consensus, confidence, topic: round.topic });
    }

    // Auto-hide panel after showing results
    setTimeout(() => {
      setShowConsensusPanel(false);
      setCurrentRound(null);
    }, 8000);
  };

  // Trigger consensus scenarios during simulation
  useEffect(() => {
    if (!isSimulationRunning) return;

    const interval = setInterval(() => {
      if (Math.random() < 0.3) { // 30% chance every interval
        generateConsensusScenario();
      }
    }, 12000); // Check every 12 seconds

    return () => clearInterval(interval);
  }, [isSimulationRunning, nodes, selectedScenario]);

  // Render consensus visualization on nodes
  const renderNodeConsensus = (node) => {
    if (!currentRound || !showConsensusPanel) return null;

    const participant = currentRound.participants.find(p => p.id === node.id);
    if (!participant) return null;

    const hasVoted = participant.vote !== null;
    const vote = participant.vote;

    return (
      <div
        style={{
          position: 'absolute',
          top: node.position.y - 15,
          left: node.position.x + 100,
          transform: 'translateX(-50%)',
          zIndex: 12
        }}
      >
        {hasVoted ? (
          <div
            style={{
              background: vote === 'approve' ? palette.green.base : 
                         vote === 'reject' ? palette.red.base : palette.yellow.base,
              color: palette.white,
              borderRadius: '12px',
              padding: '4px 8px',
              fontSize: '10px',
              fontWeight: 600,
              boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            {vote === 'approve' ? '✅' : vote === 'reject' ? '❌' : '❔'}
            {Math.round(participant.confidence * 100)}%
          </div>
        ) : (
          <div
            style={{
              background: palette.blue.base,
              color: palette.white,
              borderRadius: '12px',
              padding: '4px 8px',
              fontSize: '10px',
              fontWeight: 600,
              boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
              animation: 'pulse 1.5s ease-in-out infinite'
            }}
          >
            Voting...
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {/* Node consensus indicators */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: 11
        }}
      >
        {nodes.map(node => renderNodeConsensus(node))}
      </div>

      {/* Consensus Panel */}
      {showConsensusPanel && currentRound && (
        <div
          style={{
            position: 'absolute',
            top: spacing[3],
            left: spacing[3],
            background: palette.white,
            border: `1px solid ${palette.gray.light2}`,
            borderRadius: '12px',
            padding: spacing[3],
            minWidth: '320px',
            maxWidth: '400px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
            zIndex: 12,
            pointerEvents: 'all'
          }}
        >
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            marginBottom: spacing[2] 
          }}>
            <div>
              <Body style={{
                fontSize: '14px',
                fontWeight: 700,
                color: palette.gray.dark3,
                margin: 0,
                fontFamily: "'Euclid Circular A', sans-serif"
              }}>
                Agent Consensus
              </Body>
              <Overline style={{
                fontSize: '10px',
                color: palette.gray.dark1,
                margin: 0,
                textTransform: 'uppercase'
              }}>
                {currentRound.phase.replace('_', ' ')}
              </Overline>
            </div>
            <button
              onClick={() => setShowConsensusPanel(false)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: palette.gray.dark1,
                fontSize: '16px'
              }}
            >
              ×
            </button>
          </div>

          <Body style={{
            fontSize: '12px',
            color: palette.gray.dark2,
            margin: `0 0 ${spacing[3]}px 0`,
            lineHeight: '1.4'
          }}>
            <strong>Topic:</strong> {currentRound.topic}
          </Body>

          <div style={{ marginBottom: spacing[2] }}>
            <Overline style={{
              fontSize: '10px',
              color: palette.gray.dark1,
              margin: `0 0 ${spacing[1]}px 0`,
              textTransform: 'uppercase'
            }}>
              Voting Status ({currentRound.participants.filter(p => p.vote).length}/{currentRound.participants.length})
            </Overline>
            
            {currentRound.participants.map(participant => (
              <div
                key={participant.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: `${spacing[1]}px 0`,
                  borderBottom: `1px solid ${palette.gray.light2}`,
                  fontSize: '11px'
                }}
              >
                <span style={{ color: palette.gray.dark2 }}>
                  {participant.name}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: spacing[1] }}>
                  {participant.vote ? (
                    <>
                      <span style={{
                        color: participant.vote === 'approve' ? palette.green.dark2 : 
                               participant.vote === 'reject' ? palette.red.dark2 : palette.yellow.dark2
                      }}>
                        {participant.vote === 'approve' ? '✅ Approve' : 
                         participant.vote === 'reject' ? '❌ Reject' : '❔ Abstain'}
                      </span>
                      <span style={{ color: palette.gray.dark1, fontSize: '10px' }}>
                        ({Math.round(participant.confidence * 100)}%)
                      </span>
                    </>
                  ) : (
                    <span style={{ color: palette.blue.dark2 }}>
                      ⏳ Voting...
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {currentRound.phase === 'resolved' && (
            <div
              style={{
                padding: spacing[2],
                background: consensusStates[currentRound.consensus]?.color + '15',
                border: `1px solid ${consensusStates[currentRound.consensus]?.color}40`,
                borderRadius: '6px',
                textAlign: 'center'
              }}
            >
              <div style={{
                fontSize: '16px',
                marginBottom: spacing[1]
              }}>
                {consensusStates[currentRound.consensus]?.icon}
              </div>
              <Body style={{
                fontSize: '12px',
                fontWeight: 600,
                color: consensusStates[currentRound.consensus]?.color,
                margin: 0
              }}>
                {consensusStates[currentRound.consensus]?.label}
              </Body>
              <Overline style={{
                fontSize: '10px',
                color: palette.gray.dark1,
                margin: 0
              }}>
                Confidence: {Math.round(currentRound.confidence * 100)}%
              </Overline>
            </div>
          )}
        </div>
      )}

      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </>
  );
};

export default ConsensusOverlay;