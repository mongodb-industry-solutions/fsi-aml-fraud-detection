'use client';

import React, { useState, useRef, useEffect } from 'react';
import { H2, H3, Body, Overline } from '@leafygreen-ui/typography';
import { palette } from '@leafygreen-ui/palette';
import { spacing } from '@leafygreen-ui/tokens';
import Card from '@leafygreen-ui/card';
import Badge from '@leafygreen-ui/badge';
import Button from '@leafygreen-ui/button';
import Icon from '@leafygreen-ui/icon';
import TextInput from '@leafygreen-ui/text-input';

const InteractiveDebug = ({ selectedScenario, isSimulationRunning, metrics, selectedNode }) => {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [debugMode, setDebugMode] = useState('conversation'); // 'conversation', 'inspector', 'timeline'
  const [selectedAgent, setSelectedAgent] = useState('risk_analyzer');
  const [debugContext, setDebugContext] = useState(null);
  const messagesEndRef = useRef(null);

  // Initialize with welcome message
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([{
        id: 'welcome',
        type: 'system',
        content: 'Welcome to Interactive Agent Debugging! Ask me about agent states, decision logic, or explore the processing timeline. Try commands like "explain risk analysis" or "show memory retrieval".',
        timestamp: new Date(),
        agent: 'Debug Assistant'
      }]);
    }
  }, [messages.length]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Simulate agent responses based on input
  const generateAgentResponse = (input) => {
    const lowerInput = input.toLowerCase();
    
    if (lowerInput.includes('risk') || lowerInput.includes('analysis')) {
      return {
        type: 'agent',
        content: `The Risk Analyzer is currently processing ${selectedScenario.name} with confidence ${(Math.random() * 0.2 + 0.8).toFixed(2)}. Key factors:\n\n• Transaction velocity: ${Math.random() > 0.5 ? 'HIGH' : 'NORMAL'}\n• Geographic anomaly: ${Math.random() > 0.7 ? 'DETECTED' : 'NONE'}\n• Historical patterns: ${Math.round(Math.random() * 20 + 80)}% match\n• Risk score: ${Math.round(metrics.accuracy + Math.random() * 10)}/100`,
        agent: 'Risk Analyzer',
        confidence: 0.94,
        debugData: {
          state: 'processing',
          memory: '847 similar cases loaded',
          tools: ['pattern_matcher', 'velocity_checker', 'geo_analyzer']
        }
      };
    }
    
    if (lowerInput.includes('memory') || lowerInput.includes('retrieval')) {
      return {
        type: 'agent',
        content: `Memory Agent has retrieved ${Math.round(Math.random() * 500 + 500)} similar cases from MongoDB Atlas vector search:\n\n• Vector similarity: 92.4%\n• Time range: Last 90 days\n• Pattern matches: ${Math.round(Math.random() * 15 + 10)}\n• Confidence decay: Applied (time-weighted)\n• Memory consolidation: ${Math.random() > 0.6 ? 'Active' : 'Inactive'}`,
        agent: 'Memory Agent',
        confidence: 0.89,
        debugData: {
          vectorSpace: '1.2M+ embeddings',
          queryTime: '0.8s',
          clusters: 12,
          memoryType: 'episodic'
        }
      };
    }
    
    if (lowerInput.includes('decision') || lowerInput.includes('final')) {
      const decision = Math.random() > 0.2 ? 'BLOCK' : 'APPROVE';
      return {
        type: 'agent',
        content: `Decision Engine final output: **${decision}**\n\nDecision factors:\n• Risk threshold: ${decision === 'BLOCK' ? 'EXCEEDED' : 'WITHIN LIMITS'}\n• Consensus score: ${(Math.random() * 0.15 + 0.85).toFixed(2)}\n• False positive likelihood: ${(Math.random() * 5 + 2).toFixed(1)}%\n• Regulatory compliance: ${'PASS'}\n• Final confidence: ${(Math.random() * 0.1 + 0.9).toFixed(2)}`,
        agent: 'Decision Engine',
        confidence: 0.96,
        debugData: {
          thresholds: { risk: 75, confidence: 0.8 },
          compliance: ['AML', 'KYC', 'GDPR'],
          appealable: decision === 'BLOCK'
        }
      };
    }
    
    if (lowerInput.includes('timeline') || lowerInput.includes('flow')) {
      return {
        type: 'agent',
        content: `Current processing timeline for Case #${Math.random().toString(36).substr(2, 9).toUpperCase()}:\n\n1. Transaction received → 0.05s\n2. Risk analysis → 1.2s\n3. Memory retrieval → 0.8s\n4. Agent collaboration → 2.3s\n5. Final decision → 0.3s\n\nTotal processing time: 4.65s\nCritical path: Agent collaboration (49.5% of total time)`,
        agent: 'Timeline Analyzer',
        confidence: 0.91,
        debugData: {
          bottleneck: 'agent_collaboration',
          optimization: 'Consider concurrent processing',
          criticalPath: 2.3
        }
      };
    }
    
    if (lowerInput.includes('help') || lowerInput.includes('commands')) {
      return {
        type: 'system',
        content: `Available debug commands:\n\n• "explain risk analysis" - Get risk assessment details\n• "show memory retrieval" - View memory system status\n• "timeline analysis" - See processing flow\n• "decision logic" - Understand final decisions\n• "agent state [agent_name]" - Inspect specific agent\n• "performance metrics" - View current KPIs\n• "clear" - Clear conversation history`,
        agent: 'Debug Assistant'
      };
    }
    
    if (lowerInput.includes('performance') || lowerInput.includes('metrics')) {
      return {
        type: 'agent',
        content: `Current Performance Metrics:\n\n• Accuracy: ${metrics.accuracy}%\n• Average Latency: ${metrics.avgLatency}ms\n• Throughput: ${Math.round(metrics.throughput)} decisions/hour\n• False Positive Rate: ${metrics.falsePositiveRate}%\n• System Load: ${metrics.systemLoad}%\n• Fraud Prevented: $${(metrics.fraudPrevented / 1000000).toFixed(1)}M`,
        agent: 'Performance Monitor',
        confidence: 0.99,
        debugData: {
          trend: 'improving',
          alerts: metrics.systemLoad > 85 ? 1 : 0,
          optimization: 'optimal'
        }
      };
    }
    
    // Default response for unrecognized input
    return {
      type: 'agent',
      content: `I'm analyzing "${input}" in the context of ${selectedScenario.name}. Could you be more specific? Try asking about:\n\n• Risk analysis process\n• Memory retrieval results\n• Decision logic\n• Processing timeline\n• Agent states\n\nOr type "help" for more commands.`,
      agent: 'Debug Assistant',
      confidence: 0.75
    };
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;
    
    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: inputValue,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);
    
    // Handle special commands
    if (inputValue.toLowerCase().trim() === 'clear') {
      setTimeout(() => {
        setMessages([]);
        setIsTyping(false);
      }, 500);
      return;
    }
    
    // Simulate typing delay
    setTimeout(() => {
      const response = generateAgentResponse(inputValue);
      const agentMessage = {
        id: Date.now() + 1,
        timestamp: new Date(),
        ...response
      };
      
      setMessages(prev => [...prev, agentMessage]);
      setIsTyping(false);
    }, 1000 + Math.random() * 1000);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const getAgentColor = (agent) => {
    const colors = {
      'Risk Analyzer': palette.red.base,
      'Memory Agent': palette.blue.base,
      'Decision Engine': palette.green.base,
      'Timeline Analyzer': palette.yellow.dark1,
      'Performance Monitor': palette.gray.dark2,
      'Debug Assistant': palette.gray.dark1
    };
    return colors[agent] || palette.gray.base;
  };

  const getAgentIcon = (agent) => {
    const icons = {
      'Risk Analyzer': '🛡️',
      'Memory Agent': '🧠',
      'Decision Engine': '⚖️',
      'Timeline Analyzer': '⏱️',
      'Performance Monitor': '📊',
      'Debug Assistant': '🔍'
    };
    return icons[agent] || '🤖';
  };

  return (
    <div style={{
      maxWidth: '1400px',
      margin: '0 auto',
      padding: spacing[3]
    }}>
      {/* Debug Header */}
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
              🔍
            </div>
            <div>
              <H2 style={{
                fontSize: '28px',
                margin: 0,
                color: palette.gray.dark3,
                fontFamily: "'Euclid Circular A', sans-serif"
              }}>
                Interactive Debug Console
              </H2>
              <Body style={{
                color: palette.gray.dark1,
                margin: 0,
                fontFamily: "'Euclid Circular A', sans-serif"
              }}>
                Conversational Debugging • Time-Travel Analysis • Agent State Inspection
              </Body>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2] }}>
            <Badge variant={isSimulationRunning ? 'green' : 'lightgray'}>
              {isSimulationRunning ? 'LIVE DEBUG' : 'STATIC MODE'}
            </Badge>
            <Badge variant="blue">
              {selectedScenario.name}
            </Badge>
          </div>
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: '2fr 1fr',
        gap: spacing[4]
      }}>
        {/* Main Chat Interface */}
        <Card style={{
          padding: 0,
          display: 'flex',
          flexDirection: 'column',
          height: '700px'
        }}>
          {/* Chat Header */}
          <div style={{
            padding: spacing[3],
            borderBottom: `1px solid ${palette.gray.light2}`,
            background: palette.gray.light3
          }}>
            <H3 style={{
              fontSize: '16px',
              color: palette.gray.dark3,
              margin: 0,
              fontFamily: "'Euclid Circular A', sans-serif"
            }}>
              Debug Conversation
            </H3>
            <Body style={{
              fontSize: '12px',
              color: palette.gray.dark1,
              margin: 0
            }}>
              Ask questions about agent behavior, decision logic, or processing flow
            </Body>
          </div>

          {/* Messages Area */}
          <div style={{
            flex: 1,
            padding: spacing[3],
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: spacing[3]
          }}>
            {messages.map(message => (
              <div
                key={message.id}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: spacing[2],
                  flexDirection: message.type === 'user' ? 'row-reverse' : 'row'
                }}
              >
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: message.type === 'user' ? 
                    palette.blue.base : 
                    getAgentColor(message.agent),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '16px',
                  color: palette.white,
                  flexShrink: 0
                }}>
                  {message.type === 'user' ? '👤' : getAgentIcon(message.agent)}
                </div>

                <div style={{
                  maxWidth: '70%',
                  padding: spacing[3],
                  borderRadius: '12px',
                  background: message.type === 'user' ? 
                    palette.blue.light3 : 
                    message.type === 'system' ? 
                    palette.yellow.light3 : 
                    palette.white,
                  border: `1px solid ${message.type === 'user' ? 
                    palette.blue.light2 : 
                    message.type === 'system' ? 
                    palette.yellow.light2 : 
                    palette.gray.light2}`
                }}>
                  {message.agent && message.type !== 'user' && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: spacing[2],
                      marginBottom: spacing[1]
                    }}>
                      <Body style={{
                        fontSize: '11px',
                        fontWeight: 600,
                        color: getAgentColor(message.agent),
                        margin: 0,
                        textTransform: 'uppercase'
                      }}>
                        {message.agent}
                      </Body>
                      {message.confidence && (
                        <Badge variant="lightgray" size="xsmall">
                          {Math.round(message.confidence * 100)}%
                        </Badge>
                      )}
                    </div>
                  )}
                  
                  <Body style={{
                    fontSize: '13px',
                    color: palette.gray.dark3,
                    margin: 0,
                    whiteSpace: 'pre-line'
                  }}>
                    {message.content}
                  </Body>

                  {message.debugData && (
                    <div style={{
                      marginTop: spacing[2],
                      padding: spacing[2],
                      background: palette.gray.light3,
                      borderRadius: '6px',
                      fontSize: '11px'
                    }}>
                      <Overline style={{
                        fontSize: '9px',
                        color: palette.gray.dark1,
                        margin: `0 0 ${spacing[1]}px 0`,
                        textTransform: 'uppercase'
                      }}>
                        Debug Data
                      </Overline>
                      <Body style={{
                        fontSize: '11px',
                        color: palette.gray.dark2,
                        margin: 0,
                        fontFamily: 'monospace'
                      }}>
                        {JSON.stringify(message.debugData, null, 2)}
                      </Body>
                    </div>
                  )}

                  <div style={{
                    marginTop: spacing[1],
                    fontSize: '10px',
                    color: palette.gray.dark1,
                    textAlign: message.type === 'user' ? 'right' : 'left'
                  }}>
                    {message.timestamp.toLocaleTimeString()}
                  </div>
                </div>
              </div>
            ))}

            {isTyping && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: spacing[2]
              }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: palette.gray.base,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '16px'
                }}>
                  🤖
                </div>
                <div style={{
                  padding: spacing[2],
                  background: palette.gray.light3,
                  borderRadius: '12px',
                  animation: 'pulse 1.5s infinite'
                }}>
                  <Body style={{
                    fontSize: '13px',
                    color: palette.gray.dark1,
                    margin: 0
                  }}>
                    Agent is thinking...
                  </Body>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div style={{
            padding: spacing[3],
            borderTop: `1px solid ${palette.gray.light2}`,
            background: palette.gray.light3
          }}>
            <div style={{ display: 'flex', gap: spacing[2] }}>
              <TextInput
                label=""
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask about agent states, decision logic, or type 'help' for commands..."
                style={{ flex: 1 }}
                disabled={isTyping}
              />
              <Button
                variant="primary"
                onClick={handleSendMessage}
                disabled={!inputValue.trim() || isTyping}
                leftGlyph={<Icon glyph="ArrowRight" />}
              >
                Send
              </Button>
            </div>
          </div>
        </Card>

        {/* Debug Tools Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[4] }}>
          {/* Quick Commands */}
          <Card style={{ padding: spacing[3] }}>
            <H3 style={{
              fontSize: '16px',
              color: palette.gray.dark3,
              marginBottom: spacing[3],
              fontFamily: "'Euclid Circular A', sans-serif"
            }}>
              Quick Commands
            </H3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[2] }}>
              <Button
                variant="default"
                size="small"
                onClick={() => setInputValue('explain risk analysis')}
                leftGlyph={<Icon glyph="Shield" />}
              >
                Risk Analysis
              </Button>
              <Button
                variant="default"
                size="small"
                onClick={() => setInputValue('show memory retrieval')}
                leftGlyph={<Icon glyph="Cloud" />}
              >
                Memory System
              </Button>
              <Button
                variant="default"
                size="small"
                onClick={() => setInputValue('timeline analysis')}
                leftGlyph={<Icon glyph="Clock" />}
              >
                Processing Flow
              </Button>
              <Button
                variant="default"
                size="small"
                onClick={() => setInputValue('decision logic')}
                leftGlyph={<Icon glyph="Checkmark" />}
              >
                Decision Logic
              </Button>
              <Button
                variant="default"
                size="small"
                onClick={() => setInputValue('performance metrics')}
                leftGlyph={<Icon glyph="Charts" />}
              >
                Performance
              </Button>
            </div>
          </Card>

          {/* Agent Status */}
          <Card style={{ padding: spacing[3] }}>
            <H3 style={{
              fontSize: '16px',
              color: palette.gray.dark3,
              marginBottom: spacing[3],
              fontFamily: "'Euclid Circular A', sans-serif"
            }}>
              Agent Status
            </H3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[2] }}>
              {[
                { name: 'Risk Analyzer', status: 'active', load: 78 },
                { name: 'Memory Agent', status: 'active', load: 65 },
                { name: 'Decision Engine', status: 'active', load: 45 },
                { name: 'Timeline Analyzer', status: 'idle', load: 12 }
              ].map(agent => (
                <div
                  key={agent.name}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: spacing[2],
                    border: `1px solid ${palette.gray.light2}`,
                    borderRadius: '6px',
                    cursor: 'pointer'
                  }}
                  onClick={() => setInputValue(`agent state ${agent.name.toLowerCase().replace(' ', '_')}`)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2] }}>
                    <div style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: agent.status === 'active' ? palette.green.base : palette.gray.base
                    }} />
                    <Body style={{
                      fontSize: '12px',
                      fontWeight: 600,
                      color: palette.gray.dark3,
                      margin: 0
                    }}>
                      {agent.name}
                    </Body>
                  </div>
                  <Body style={{
                    fontSize: '11px',
                    color: palette.gray.dark1,
                    margin: 0
                  }}>
                    {agent.load}% load
                  </Body>
                </div>
              ))}
            </div>
          </Card>

          {/* Current Context */}
          <Card style={{ padding: spacing[3] }}>
            <H3 style={{
              fontSize: '16px',
              color: palette.gray.dark3,
              marginBottom: spacing[3],
              fontFamily: "'Euclid Circular A', sans-serif"
            }}>
              Debug Context
            </H3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[2] }}>
              <div style={{
                padding: spacing[2],
                background: palette.blue.light3,
                borderRadius: '6px'
              }}>
                <Body style={{
                  fontSize: '11px',
                  color: palette.blue.dark2,
                  margin: 0,
                  fontWeight: 600
                }}>
                  Active Scenario
                </Body>
                <Body style={{
                  fontSize: '12px',
                  color: palette.gray.dark3,
                  margin: 0
                }}>
                  {selectedScenario.name}
                </Body>
              </div>

              <div style={{
                padding: spacing[2],
                background: palette.green.light3,
                borderRadius: '6px'
              }}>
                <Body style={{
                  fontSize: '11px',
                  color: palette.green.dark2,
                  margin: 0,
                  fontWeight: 600
                }}>
                  Simulation Status
                </Body>
                <Body style={{
                  fontSize: '12px',
                  color: palette.gray.dark3,
                  margin: 0
                }}>
                  {isSimulationRunning ? 'Running' : 'Paused'}
                </Body>
              </div>

              <div style={{
                padding: spacing[2],
                background: palette.yellow.light3,
                borderRadius: '6px'
              }}>
                <Body style={{
                  fontSize: '11px',
                  color: palette.yellow.dark2,
                  margin: 0,
                  fontWeight: 600
                }}>
                  Current Accuracy
                </Body>
                <Body style={{
                  fontSize: '12px',
                  color: palette.gray.dark3,
                  margin: 0
                }}>
                  {metrics.accuracy}%
                </Body>
              </div>
            </div>

            <div style={{
              marginTop: spacing[3],
              display: 'flex',
              justifyContent: 'center'
            }}>
              <Button
                variant="default"
                size="small"
                onClick={() => setInputValue('clear')}
              >
                Clear History
              </Button>
            </div>
          </Card>
        </div>
      </div>

      {/* Add CSS animation */}
      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
      `}</style>
    </div>
  );
};

export default InteractiveDebug;