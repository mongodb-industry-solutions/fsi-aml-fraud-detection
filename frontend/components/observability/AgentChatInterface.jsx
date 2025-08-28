/**
 * Agent Chat Interface Component
 * Allows continued conversation with the agent after transaction analysis
 */

'use client';

import React, { useState, useRef, useEffect } from 'react';
import Button from '@leafygreen-ui/button';
import TextInput from '@leafygreen-ui/text-input';
import { Spinner } from '@leafygreen-ui/loading-indicator';
import Icon from '@leafygreen-ui/icon';

const AgentChatInterface = ({ threadId, backendUrl, agentDecision }) => {
  const [messages, setMessages] = useState([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initialize with agent's decision
  useEffect(() => {
    if (agentDecision && messages.length === 0) {
      setMessages([
        {
          id: 'initial',
          type: 'assistant',
          content: `I've completed my analysis of transaction ${agentDecision.transaction_id}. My decision was to **${agentDecision.decision}** with **${agentDecision.risk_level}** risk level (${agentDecision.risk_score}% risk score) and ${Math.round(agentDecision.confidence * 100)}% confidence.\n\n**My reasoning:** ${agentDecision.reasoning}\n\nFeel free to ask me any questions about this decision or request additional analysis.`,
          timestamp: new Date().toISOString()
        }
      ]);
    }
  }, [agentDecision, messages.length]);

  const sendMessage = async () => {
    if (!currentMessage.trim() || isLoading) return;

    const userMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: currentMessage.trim(),
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setCurrentMessage('');
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${backendUrl}/api/agent/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          thread_id: threadId,
          message: userMessage.content
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      const assistantMessage = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: data.response,
        timestamp: new Date().toISOString(),
        responseTime: Math.round(data.response_time_ms)
      };

      setMessages(prev => [...prev, assistantMessage]);

    } catch (err) {
      console.error('Chat error:', err);
      setError(`Failed to send message: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (!threadId) {
    return (
      <div className="bg-gray-100 rounded-lg p-4 text-center">
        <Icon glyph="InfoWithCircle" size="large" className="text-gray-400 mb-2" />
        <p className="text-gray-600 text-sm">
          Chat is available after Stage 2 analysis when a thread is created
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border h-96 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b bg-gray-50 rounded-t-lg">
        <div className="flex items-center space-x-2">
          <Icon glyph="Chat" size="small" />
          <span className="font-semibold text-sm">Chat with Agent</span>
        </div>
        <div className="text-xs text-gray-500 font-mono">
          Thread: {threadId.substring(0, 12)}...
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] p-3 rounded-lg ${
                message.type === 'user'
                  ? 'bg-blue-500 text-white ml-auto'
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              <div className="text-sm whitespace-pre-wrap">{message.content}</div>
              <div className={`text-xs mt-1 opacity-70 ${
                message.type === 'user' ? 'text-blue-100' : 'text-gray-500'
              }`}>
                {new Date(message.timestamp).toLocaleTimeString()}
                {message.responseTime && ` • ${message.responseTime}ms`}
              </div>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 text-gray-800 p-3 rounded-lg">
              <div className="flex items-center space-x-2">
                <Spinner size="small" />
                <span className="text-sm">Agent is thinking...</span>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="flex justify-center">
            <div className="bg-red-100 text-red-700 p-3 rounded-lg text-sm">
              {error}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t p-3">
        <div className="flex items-end space-x-2">
          <div className="flex-1">
            <TextInput
              aria-label="Chat message"
              placeholder="Ask the agent about its decision..."
              value={currentMessage}
              onChange={(e) => setCurrentMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={isLoading}
            />
          </div>
          <Button
            size="default"
            variant="primary"
            onClick={sendMessage}
            disabled={!currentMessage.trim() || isLoading}
          >
            <Icon glyph="ArrowRight" size="small" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AgentChatInterface;