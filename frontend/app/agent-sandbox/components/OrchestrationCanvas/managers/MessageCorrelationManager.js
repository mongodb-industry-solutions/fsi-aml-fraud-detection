'use client';

import { useState, useCallback, useRef } from 'react';

/**
 * Message Correlation Manager
 * Handles bidirectional linking between node-graph and sequence diagram
 * Research Directive: "Click node to filter sequence, click message to highlight agents"
 */
export const useMessageCorrelation = () => {
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [highlightedNodes, setHighlightedNodes] = useState(new Set());
  const [highlightedEdges, setHighlightedEdges] = useState(new Set());
  const [messageHistory, setMessageHistory] = useState([]);
  const correlationTimeouts = useRef(new Map());

  // Handle node selection from graph -> filter sequence
  const handleNodeSelection = useCallback((nodeId) => {
    if (selectedAgent === nodeId) {
      // Deselect if clicking the same node
      setSelectedAgent(null);
      setHighlightedNodes(new Set());
      setHighlightedEdges(new Set());
    } else {
      setSelectedAgent(nodeId);
      
      // Highlight related nodes and edges
      const relatedMessages = messageHistory.filter(msg => 
        msg.sourceId === nodeId || msg.targetId === nodeId
      );
      
      const relatedNodes = new Set([nodeId]);
      const relatedEdges = new Set();
      
      relatedMessages.forEach(msg => {
        relatedNodes.add(msg.sourceId);
        relatedNodes.add(msg.targetId);
        relatedEdges.add(`${msg.sourceId}-${msg.targetId}`);
      });
      
      setHighlightedNodes(relatedNodes);
      setHighlightedEdges(relatedEdges);
    }
    
    // Clear message selection when changing node selection
    setSelectedMessage(null);
  }, [selectedAgent, messageHistory]);

  // Handle message selection from sequence -> highlight graph
  const handleMessageSelection = useCallback((messageId) => {
    if (selectedMessage === messageId) {
      // Deselect if clicking the same message
      setSelectedMessage(null);
      setHighlightedNodes(new Set());
      setHighlightedEdges(new Set());
    } else {
      setSelectedMessage(messageId);
      
      const message = messageHistory.find(msg => msg.id === messageId);
      if (message) {
        // Highlight the specific message participants
        setHighlightedNodes(new Set([message.sourceId, message.targetId]));
        setHighlightedEdges(new Set([`${message.sourceId}-${message.targetId}`]));
        
        // Temporarily pulse the nodes with animation
        const timeoutId = setTimeout(() => {
          setHighlightedNodes(prev => new Set());
          setHighlightedEdges(prev => new Set());
        }, 3000);
        
        // Clear any existing timeout for this message
        if (correlationTimeouts.current.has(messageId)) {
          clearTimeout(correlationTimeouts.current.get(messageId));
        }
        correlationTimeouts.current.set(messageId, timeoutId);
      }
    }
  }, [selectedMessage, messageHistory]);

  // Add new message to history
  const addMessage = useCallback((message) => {
    setMessageHistory(prev => {
      // Prevent duplicates
      if (prev.some(m => m.id === message.id)) {
        return prev;
      }
      
      // Keep only last 100 messages for performance
      const updatedHistory = [...prev, message];
      return updatedHistory.slice(-100);
    });
  }, []);

  // Clear all messages (reset)
  const clearMessages = useCallback(() => {
    setMessageHistory([]);
    setSelectedAgent(null);
    setSelectedMessage(null);
    setHighlightedNodes(new Set());
    setHighlightedEdges(new Set());
    
    // Clear any pending timeouts
    correlationTimeouts.current.forEach(timeout => clearTimeout(timeout));
    correlationTimeouts.current.clear();
  }, []);

  // Get correlation state for rendering
  const getCorrelationState = useCallback(() => {
    return {
      selectedAgent,
      selectedMessage,
      highlightedNodes,
      highlightedEdges,
      messageHistory,
      hasMessages: messageHistory.length > 0
    };
  }, [selectedAgent, selectedMessage, highlightedNodes, highlightedEdges, messageHistory]);

  // Enhanced message processing with rich metadata
  const processMessage = useCallback((rawMessage) => {
    const processedMessage = {
      id: rawMessage.id || `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      sourceId: rawMessage.sourceId,
      targetId: rawMessage.targetId,
      type: rawMessage.type || 'data_query',
      timestamp: rawMessage.timestamp || Date.now(),
      payload: rawMessage.payload || {},
      latency: rawMessage.latency || Math.random() * 200 + 50,
      success: rawMessage.success !== false,
      priority: rawMessage.priority || 'medium',
      correlationId: rawMessage.correlationId, // For request-response pairing
      parentMessageId: rawMessage.parentMessageId, // For message threading
      metadata: {
        payloadSize: JSON.stringify(rawMessage.payload || {}).length,
        retryCount: rawMessage.retryCount || 0,
        source: rawMessage.source || 'system',
        ...rawMessage.metadata
      }
    };

    addMessage(processedMessage);
    return processedMessage;
  }, [addMessage]);

  // Find related messages (request-response pairs, threading)
  const findRelatedMessages = useCallback((messageId) => {
    const targetMessage = messageHistory.find(msg => msg.id === messageId);
    if (!targetMessage) return [];

    const related = [];

    // Find by correlation ID (request-response pairs)
    if (targetMessage.correlationId) {
      const correlatedMessages = messageHistory.filter(msg => 
        msg.correlationId === targetMessage.correlationId && msg.id !== messageId
      );
      related.push(...correlatedMessages);
    }

    // Find threaded messages (parent-child relationships)
    if (targetMessage.parentMessageId) {
      const parentMessage = messageHistory.find(msg => msg.id === targetMessage.parentMessageId);
      if (parentMessage) related.push(parentMessage);
    }

    // Find child messages
    const childMessages = messageHistory.filter(msg => msg.parentMessageId === messageId);
    related.push(...childMessages);

    return related;
  }, [messageHistory]);

  // Get message flow statistics
  const getMessageStats = useCallback(() => {
    const stats = {
      total: messageHistory.length,
      byType: {},
      byAgent: {},
      averageLatency: 0,
      successRate: 0,
      messageRate: 0 // messages per second
    };

    if (messageHistory.length === 0) return stats;

    // Calculate by type
    messageHistory.forEach(msg => {
      stats.byType[msg.type] = (stats.byType[msg.type] || 0) + 1;
      stats.byAgent[msg.sourceId] = (stats.byAgent[msg.sourceId] || 0) + 1;
    });

    // Calculate averages
    const totalLatency = messageHistory.reduce((sum, msg) => sum + msg.latency, 0);
    stats.averageLatency = totalLatency / messageHistory.length;

    const successfulMessages = messageHistory.filter(msg => msg.success).length;
    stats.successRate = successfulMessages / messageHistory.length;

    // Calculate message rate (last 60 seconds)
    const now = Date.now();
    const recentMessages = messageHistory.filter(msg => now - msg.timestamp < 60000);
    stats.messageRate = recentMessages.length / 60;

    return stats;
  }, [messageHistory]);

  return {
    // Selection handlers
    handleNodeSelection,
    handleMessageSelection,
    
    // Message management
    addMessage,
    processMessage,
    clearMessages,
    
    // State getters
    getCorrelationState,
    findRelatedMessages,
    getMessageStats,
    
    // Direct state access (for performance)
    selectedAgent,
    selectedMessage,
    highlightedNodes,
    highlightedEdges,
    messageHistory
  };
};

/**
 * Message Type Analyzer
 * Automatically categorizes and enriches message data
 */
export class MessageAnalyzer {
  static messagePatterns = {
    task_delegation: {
      keywords: ['assign', 'task', 'delegate', 'execute', 'perform'],
      payloadKeys: ['task', 'instructions', 'deadline', 'priority']
    },
    data_query: {
      keywords: ['get', 'fetch', 'query', 'retrieve', 'request'],
      payloadKeys: ['query', 'parameters', 'filters']
    },
    result_return: {
      keywords: ['result', 'response', 'data', 'output', 'completed'],
      payloadKeys: ['result', 'data', 'status', 'metrics']
    },
    validation_request: {
      keywords: ['validate', 'verify', 'check', 'confirm'],
      payloadKeys: ['validation', 'rules', 'criteria']
    },
    consensus_vote: {
      keywords: ['vote', 'consensus', 'agree', 'disagree', 'decision'],
      payloadKeys: ['vote', 'confidence', 'reasoning']
    },
    tool_invocation: {
      keywords: ['tool', 'invoke', 'call', 'execute', 'api'],
      payloadKeys: ['tool', 'function', 'parameters', 'endpoint']
    },
    error_report: {
      keywords: ['error', 'fail', 'exception', 'problem'],
      payloadKeys: ['error', 'stack', 'code', 'message']
    }
  };

  static analyzeMessage(message) {
    const analysis = {
      suggestedType: 'data_query',
      confidence: 0,
      keywords: [],
      payloadAnalysis: {}
    };

    const messageText = JSON.stringify(message).toLowerCase();
    const payload = message.payload || {};

    let bestMatch = { type: 'data_query', score: 0 };

    // Analyze against each pattern
    Object.entries(this.messagePatterns).forEach(([type, pattern]) => {
      let score = 0;
      const foundKeywords = [];

      // Check keywords in message content
      pattern.keywords.forEach(keyword => {
        if (messageText.includes(keyword)) {
          score += 1;
          foundKeywords.push(keyword);
        }
      });

      // Check payload structure
      pattern.payloadKeys.forEach(key => {
        if (payload[key] !== undefined) {
          score += 2; // Payload keys are weighted higher
        }
      });

      if (score > bestMatch.score) {
        bestMatch = { type, score };
        analysis.keywords = foundKeywords;
      }
    });

    analysis.suggestedType = bestMatch.type;
    analysis.confidence = Math.min(bestMatch.score / 5, 1); // Normalize to 0-1

    // Additional payload analysis
    analysis.payloadAnalysis = {
      size: JSON.stringify(payload).length,
      complexity: this.calculateComplexity(payload),
      hasNestedObjects: this.hasNestedObjects(payload)
    };

    return analysis;
  }

  static calculateComplexity(obj) {
    if (!obj || typeof obj !== 'object') return 0;
    
    let complexity = 0;
    Object.values(obj).forEach(value => {
      if (Array.isArray(value)) {
        complexity += value.length;
      } else if (typeof value === 'object' && value !== null) {
        complexity += 1 + this.calculateComplexity(value);
      } else {
        complexity += 1;
      }
    });
    
    return complexity;
  }

  static hasNestedObjects(obj) {
    if (!obj || typeof obj !== 'object') return false;
    
    return Object.values(obj).some(value => 
      (typeof value === 'object' && value !== null && !Array.isArray(value))
    );
  }
}

export default useMessageCorrelation;