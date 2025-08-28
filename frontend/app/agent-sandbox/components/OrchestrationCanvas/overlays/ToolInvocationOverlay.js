'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { palette } from '@leafygreen-ui/palette';
import { spacing } from '@leafygreen-ui/tokens';
import { Body, Overline } from '@leafygreen-ui/typography';
import Badge from '@leafygreen-ui/badge';
import Card from '@leafygreen-ui/card';

/**
 * Tool Invocation Overlay
 * Implements MAS Research directive: "Treat tool calls as first-class, inspectable events"
 * Shows real-time tool invocations with distinct iconography and performance metrics
 */
const ToolInvocationOverlay = ({ 
  nodes, 
  isSimulationRunning, 
  simulationSpeed = 1,
  onToolInvocation 
}) => {
  const [activeToolCalls, setActiveToolCalls] = useState([]);
  const [toolCallHistory, setToolCallHistory] = useState([]);
  const [performanceMetrics, setPerformanceMetrics] = useState({});

  // Tool type configurations with distinct iconography
  const toolTypes = {
    database: { 
      icon: '🗄️', 
      color: palette.blue.base, 
      name: 'Database Query',
      description: 'SQL/NoSQL database operations'
    },
    api: { 
      icon: '🌐', 
      color: palette.green.base, 
      name: 'API Call',
      description: 'External API integrations'
    },
    ml_model: { 
      icon: '🧠', 
      color: palette.purple.base, 
      name: 'ML Model',
      description: 'Machine learning inference'
    },
    file_system: { 
      icon: '📁', 
      color: palette.yellow.base, 
      name: 'File System',
      description: 'File read/write operations'
    },
    analysis: { 
      icon: '📊', 
      color: palette.red.base, 
      name: 'Data Analysis',
      description: 'Statistical analysis tools'
    },
    validation: { 
      icon: '✅', 
      color: palette.gray.base, 
      name: 'Validation',
      description: 'Data validation and verification'
    },
    notification: { 
      icon: '📧', 
      color: palette.blue.dark1, 
      name: 'Notification',
      description: 'Alert and notification systems'
    },
    compliance: { 
      icon: '⚖️', 
      color: palette.red.dark1, 
      name: 'Compliance',
      description: 'Regulatory compliance checks'
    }
  };

  // Generate realistic tool invocation data
  const generateToolInvocation = useCallback((agentId) => {
    const toolTypeKeys = Object.keys(toolTypes);
    const randomToolType = toolTypeKeys[Math.floor(Math.random() * toolTypeKeys.length)];
    const toolConfig = toolTypes[randomToolType];
    
    const toolInvocation = {
      id: `tool-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      agentId,
      toolType: randomToolType,
      toolName: generateToolName(randomToolType),
      icon: toolConfig.icon,
      color: toolConfig.color,
      status: 'pending',
      startTime: Date.now(),
      endTime: null,
      duration: null,
      input: generateToolInput(randomToolType),
      output: null,
      success: null,
      errorMessage: null
    };

    return toolInvocation;
  }, [toolTypes]);

  // Generate tool names based on type
  const generateToolName = (toolType) => {
    const toolNames = {
      database: ['Customer Lookup', 'Transaction Query', 'Risk Score Retrieval', 'Account History'],
      api: ['Credit Bureau API', 'KYC Verification', 'Sanctions Screening', 'Address Validation'],
      ml_model: ['Fraud Detection Model', 'Risk Scoring Engine', 'Pattern Recognition', 'Anomaly Detection'],
      file_system: ['Log File Reader', 'Config Parser', 'Report Generator', 'Evidence Storage'],
      analysis: ['Statistical Analysis', 'Correlation Engine', 'Trend Analysis', 'Risk Calculator'],
      validation: ['Data Validator', 'Format Checker', 'Compliance Verifier', 'Input Sanitizer'],
      notification: ['Email Service', 'SMS Gateway', 'Alert System', 'Report Delivery'],
      compliance: ['AML Checker', 'KYC Validator', 'GDPR Compliance', 'Audit Logger']
    };
    
    const names = toolNames[toolType] || ['Generic Tool'];
    return names[Math.floor(Math.random() * names.length)];
  };

  // Generate realistic tool inputs
  const generateToolInput = (toolType) => {
    const inputs = {
      database: { query: "SELECT * FROM transactions WHERE amount > 10000", params: { limit: 50 } },
      api: { endpoint: "/api/v1/kyc/verify", payload: { customerId: "CUST_12345" } },
      ml_model: { features: [0.75, 0.23, 0.91, 0.45], model_version: "v2.1.3" },
      file_system: { path: "/logs/fraud_detection.log", mode: "read" },
      analysis: { dataset: "transaction_patterns", algorithm: "correlation_matrix" },
      validation: { schema: "customer_schema", data: { name: "John Doe", age: 35 } },
      notification: { recipients: ["compliance@bank.com"], subject: "High Risk Alert" },
      compliance: { ruleset: "AML_RULES_2024", entity: { id: "ENT_789", type: "individual" } }
    };
    
    return inputs[toolType] || { data: "sample_input" };
  };

  // Simulate tool invocations during simulation
  useEffect(() => {
    if (!isSimulationRunning || nodes.length === 0) return;

    const interval = setInterval(() => {
      // Select random agent
      const agentNodes = nodes.filter(node => 
        ['manager', 'analyzer', 'investigator', 'validator', 'compliance'].includes(node.type)
      );
      
      if (agentNodes.length === 0) return;
      
      const randomAgent = agentNodes[Math.floor(Math.random() * agentNodes.length)];
      const toolCall = generateToolInvocation(randomAgent.id);
      
      // Add to active tool calls
      setActiveToolCalls(prev => [...prev, toolCall]);
      
      // Simulate tool execution duration (1-5 seconds based on tool type)
      const executionTime = Math.random() * 4000 + 1000; // 1-5 seconds
      
      setTimeout(() => {
        const isSuccess = Math.random() > 0.1; // 90% success rate
        const endTime = Date.now();
        const duration = endTime - toolCall.startTime;
        
        const completedToolCall = {
          ...toolCall,
          status: isSuccess ? 'completed' : 'error',
          endTime,
          duration,
          output: isSuccess ? generateToolOutput(toolCall.toolType) : null,
          success: isSuccess,
          errorMessage: isSuccess ? null : generateErrorMessage(toolCall.toolType)
        };
        
        // Move to history and remove from active
        setToolCallHistory(prev => [completedToolCall, ...prev.slice(0, 19)]); // Keep last 20
        setActiveToolCalls(prev => prev.filter(call => call.id !== toolCall.id));
        
        // Update performance metrics
        setPerformanceMetrics(prev => ({
          ...prev,
          [toolCall.toolType]: {
            totalCalls: (prev[toolCall.toolType]?.totalCalls || 0) + 1,
            successRate: isSuccess 
              ? ((prev[toolCall.toolType]?.successRate || 1) * (prev[toolCall.toolType]?.totalCalls || 0) + 1) / ((prev[toolCall.toolType]?.totalCalls || 0) + 1)
              : ((prev[toolCall.toolType]?.successRate || 1) * (prev[toolCall.toolType]?.totalCalls || 0)) / ((prev[toolCall.toolType]?.totalCalls || 0) + 1),
            avgLatency: prev[toolCall.toolType]?.avgLatency 
              ? (prev[toolCall.toolType].avgLatency + duration) / 2 
              : duration
          }
        }));
        
        // Notify parent component
        onToolInvocation?.(completedToolCall);
        
      }, executionTime / simulationSpeed);
      
    }, (2000 + Math.random() * 3000) / simulationSpeed); // Every 2-5 seconds

    return () => clearInterval(interval);
  }, [isSimulationRunning, nodes, simulationSpeed, generateToolInvocation, onToolInvocation]);

  // Generate realistic tool outputs
  const generateToolOutput = (toolType) => {
    const outputs = {
      database: { rows: 23, executionTime: "0.045s", data: [{ id: 1, amount: 15000, risk: "high" }] },
      api: { status: "verified", confidence: 0.94, data: { verified: true, riskScore: 25 } },
      ml_model: { prediction: 0.87, confidence: 0.92, features_used: 12 },
      file_system: { bytes_read: 2048, lines: 156, last_modified: "2024-01-15T10:30:00Z" },
      analysis: { correlation: 0.78, p_value: 0.023, significant: true },
      validation: { valid: true, errors: [], warnings: ["minor_format_issue"] },
      notification: { sent: true, delivery_id: "MSG_12345", recipients_reached: 3 },
      compliance: { compliant: true, violations: [], risk_level: "low" }
    };
    
    return outputs[toolType] || { result: "success" };
  };

  // Generate error messages
  const generateErrorMessage = (toolType) => {
    const errors = {
      database: "Connection timeout - database unreachable",
      api: "API rate limit exceeded - retry in 60 seconds",
      ml_model: "Model inference failed - invalid input format",
      file_system: "Permission denied - insufficient file access rights",
      analysis: "Insufficient data points for statistical significance",
      validation: "Schema validation failed - missing required fields",
      notification: "SMTP server error - message delivery failed",
      compliance: "Rule engine timeout - compliance check incomplete"
    };
    
    return errors[toolType] || "Unknown error occurred";
  };

  if (!isSimulationRunning && activeToolCalls.length === 0) {
    return null;
  }

  return (
    <div style={{
      position: 'absolute',
      top: spacing[4],
      right: spacing[4],
      width: '320px',
      maxHeight: '400px',
      overflowY: 'auto',
      zIndex: 1000,
      pointerEvents: 'auto'
    }}>
      {/* Active Tool Calls */}
      {activeToolCalls.length > 0 && (
        <Card style={{
          padding: spacing[3],
          marginBottom: spacing[2],
          background: `linear-gradient(135deg, ${palette.white}, ${palette.blue.light3}20)`,
          border: `2px solid ${palette.blue.base}`
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: spacing[2],
            marginBottom: spacing[2]
          }}>
            <div style={{
              width: '20px',
              height: '20px',
              borderRadius: '4px',
              background: palette.blue.base,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '10px'
            }}>
              🔧
            </div>
            <Body style={{
              fontSize: '12px',
              fontWeight: 600,
              color: palette.blue.dark2,
              margin: 0
            }}>
              Active Tool Calls ({activeToolCalls.length})
            </Body>
          </div>
          
          <div style={{ display: 'grid', gap: spacing[1] }}>
            {activeToolCalls.map(toolCall => (
              <div
                key={toolCall.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: spacing[1],
                  background: palette.white,
                  borderRadius: '6px',
                  border: `1px solid ${toolCall.color}20`,
                  animation: 'toolPulse 2s ease-in-out infinite'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: spacing[1] }}>
                  <span style={{ fontSize: '12px' }}>{toolCall.icon}</span>
                  <div>
                    <Body style={{
                      fontSize: '10px',
                      fontWeight: 600,
                      color: palette.gray.dark3,
                      margin: 0
                    }}>
                      {toolCall.toolName}
                    </Body>
                    <Overline style={{
                      fontSize: '8px',
                      color: palette.gray.base,
                      margin: 0
                    }}>
                      Agent: {toolCall.agentId}
                    </Overline>
                  </div>
                </div>
                <div style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  background: `conic-gradient(${toolCall.color} 0deg, ${toolCall.color}40 360deg)`,
                  animation: 'spin 1s linear infinite'
                }} />
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Recent Tool Calls History */}
      {toolCallHistory.length > 0 && (
        <Card style={{
          padding: spacing[3],
          background: palette.white,
          border: `1px solid ${palette.gray.light2}`
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: spacing[2]
          }}>
            <Body style={{
              fontSize: '12px',
              fontWeight: 600,
              color: palette.gray.dark3,
              margin: 0
            }}>
              Recent Tool Calls
            </Body>
            <Badge variant="lightgray" style={{ fontSize: '8px' }}>
              {toolCallHistory.length}
            </Badge>
          </div>
          
          <div style={{ display: 'grid', gap: spacing[1], maxHeight: '200px', overflowY: 'auto' }}>
            {toolCallHistory.slice(0, 8).map(toolCall => (
              <div
                key={toolCall.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: spacing[1],
                  background: toolCall.success ? palette.green.light3 : palette.red.light3,
                  borderRadius: '4px',
                  border: `1px solid ${toolCall.success ? palette.green.light2 : palette.red.light2}`
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: spacing[1] }}>
                  <span style={{ fontSize: '10px' }}>{toolCall.icon}</span>
                  <div>
                    <Body style={{
                      fontSize: '9px',
                      fontWeight: 600,
                      color: palette.gray.dark3,
                      margin: 0
                    }}>
                      {toolCall.toolName}
                    </Body>
                    <Overline style={{
                      fontSize: '7px',
                      color: palette.gray.base,
                      margin: 0
                    }}>
                      {toolCall.duration}ms • {toolCall.agentId}
                    </Overline>
                  </div>
                </div>
                <div style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: toolCall.success ? palette.green.base : palette.red.base
                }} />
              </div>
            ))}
          </div>
        </Card>
      )}

      <style jsx>{`
        @keyframes toolPulse {
          0%, 100% { 
            opacity: 1; 
            transform: scale(1); 
          }
          50% { 
            opacity: 0.8; 
            transform: scale(1.02); 
          }
        }
        
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default ToolInvocationOverlay;