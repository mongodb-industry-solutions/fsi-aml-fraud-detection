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
import Card from '@leafygreen-ui/card';
import Badge from '@leafygreen-ui/badge';
import { Body, H3 } from '@leafygreen-ui/typography';
import { palette } from '@leafygreen-ui/palette';
import { spacing } from '@leafygreen-ui/tokens';
import Banner from '@leafygreen-ui/banner';

// Simple markdown renderer for chat messages
const renderMarkdown = (text) => {
  if (!text) return text;
  
  return text
    // Bold text: **text** or __text__
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/__(.*?)__/g, '<strong>$1</strong>')
    // Italic text: *text* or _text_
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/_(.*?)_/g, '<em>$1</em>')
    // Code blocks: `code`
    .replace(/`([^`]+)`/g, '<code style="background-color: #f4f4f4; padding: 2px 4px; border-radius: 3px; font-family: monospace;">$1</code>')
    // Line breaks
    .replace(/\n/g, '<br />');
};

const AgentChatInterface = ({ threadId, backendUrl, agentDecision }) => {
  const [messages, setMessages] = useState([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expandedMessages, setExpandedMessages] = useState(new Set());
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initialize with actual thread messages
  useEffect(() => {
    const fetchThreadMessages = async () => {
      if (threadId) {
        try {
          const response = await fetch(`${backendUrl}/api/agent/thread/${threadId}/messages?limit=50`);
          if (response.ok) {
            const data = await response.json();
            
            // Convert Azure AI Foundry messages to our format
            const formattedMessages = data.messages
              .reverse() // Show in chronological order
              .map((msg, index) => ({
                id: msg.id || `msg-${index}`,
                type: msg.role === 'user' ? 'user' : 'assistant',
                content: msg.content.map(c => c.text).join('\n') || '',
                timestamp: msg.created_at || new Date().toISOString(),
                isOriginalPrompt: msg.role === 'user', // Mark user messages as original prompts
                isDetailedResponse: msg.role === 'assistant' // Mark assistant messages as detailed responses
              }));
            
            setMessages(formattedMessages);
          } else {
            console.warn('Failed to fetch thread messages, falling back to summary');
            // Fallback to summary if API fails
            if (agentDecision) {
              setMessages([
                {
                  id: 'fallback',
                  type: 'assistant',
                  content: `I've completed my analysis of transaction ${agentDecision.transaction_id}. My decision was to **${agentDecision.decision}** with **${agentDecision.risk_level}** risk level (${agentDecision.risk_score}% risk score) and ${Math.round(agentDecision.confidence * 100)}% confidence.\n\n**My reasoning:** ${agentDecision.reasoning}\n\nFeel free to ask me any questions about this decision or request additional analysis.`,
                  timestamp: new Date().toISOString(),
                  isFallback: true
                }
              ]);
            }
          }
        } catch (error) {
          console.error('Error fetching thread messages:', error);
          // Fallback to summary on error
          if (agentDecision) {
            setMessages([
              {
                id: 'error-fallback',
                type: 'assistant',
                content: `I've completed my analysis of transaction ${agentDecision.transaction_id}. My decision was to **${agentDecision.decision}** with **${agentDecision.risk_level}** risk level (${agentDecision.risk_score}% risk score) and ${Math.round(agentDecision.confidence * 100)}% confidence.\n\n**My reasoning:** ${agentDecision.reasoning}\n\nFeel free to ask me any questions about this decision or request additional analysis.`,
                timestamp: new Date().toISOString(),
                isFallback: true
              }
            ]);
          }
        }
      }
    };
    
    fetchThreadMessages();
  }, [threadId, backendUrl, agentDecision]);

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

  const toggleMessageExpansion = (messageId) => {
    setExpandedMessages(prev => {
      const newSet = new Set(prev);
      if (newSet.has(messageId)) {
        newSet.delete(messageId);
      } else {
        newSet.add(messageId);
      }
      return newSet;
    });
  };

  const shouldShowExpandButton = (content) => {
    return content.length > 500; // Show expand button for messages longer than 500 characters
  };

  const getPreviewContent = (content) => {
    if (content.length <= 500) return content;
    return content.substring(0, 500) + '...';
  };

  const getMessageTypeLabel = (message) => {
    if (message.isOriginalPrompt) {
      return 'Original Analysis Prompt';
    } else if (message.isDetailedResponse) {
      return 'AI Analysis Response';
    } else if (message.isFallback) {
      return 'Summary (Fallback)';
    }
    return null;
  };

  if (!threadId) {
    return (
      <Card style={{ background: palette.gray.light3, padding: spacing[4], textAlign: 'center' }}>
        <div style={{ marginBottom: spacing[2] }}>
          <Icon glyph="InfoWithCircle" size={24} fill={palette.gray.base} />
        </div>
        <Body size="small" style={{ color: palette.gray.dark1, margin: 0 }}>
          Chat is available after Stage 2 analysis when a thread is created
        </Body>
      </Card>
    );
  }

  return (
    <Card style={{ background: palette.white, minHeight: '500px', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        padding: spacing[3], 
        borderBottom: `1px solid ${palette.gray.light2}`,
        background: palette.gray.light3,
        borderRadius: '8px 8px 0 0'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2] }}>
          <Icon glyph="Support" size={18} fill={palette.blue.base} />
          <Body weight="medium" size="small" style={{ margin: 0, color: palette.gray.dark3 }}>
            Chat with Agent
          </Body>
        </div>
        <Body size="small" style={{ 
          margin: 0, 
          color: palette.gray.dark1, 
          fontFamily: 'monospace',
          fontSize: '11px'
        }}>
          Thread: {threadId.substring(0, 12)}...
        </Body>
      </div>

      {/* Messages */}
      <div style={{ 
        flex: 1, 
        overflowY: 'auto', 
        padding: spacing[3], 
        minHeight: '300px',
        maxHeight: '600px'
      }}>
        {messages.map((message) => {
          const isExpanded = expandedMessages.has(message.id);
          const showExpandButton = shouldShowExpandButton(message.content);
          const displayContent = isExpanded ? message.content : getPreviewContent(message.content);
          const messageTypeLabel = getMessageTypeLabel(message);

          return (
            <div
              key={message.id}
              style={{
                display: 'flex',
                justifyContent: message.type === 'user' ? 'flex-end' : 'flex-start',
                marginBottom: spacing[4]
              }}
            >
              <div
                style={{
                  maxWidth: '90%',
                  minWidth: showExpandButton ? '60%' : 'auto'
                }}
              >
                {/* Message Type Label */}
                {messageTypeLabel && (
                  <div style={{ 
                    marginBottom: spacing[1],
                    textAlign: message.type === 'user' ? 'right' : 'left'
                  }}>
                    <Badge 
                      variant={message.isOriginalPrompt ? 'blue' : message.isDetailedResponse ? 'green' : 'gray'}
                      style={{ fontSize: '10px' }}
                    >
                      {messageTypeLabel}
                    </Badge>
                  </div>
                )}

                {/* Message Content Card */}
                <Card style={{
                  background: message.type === 'user' 
                    ? palette.blue.light3
                    : palette.white,
                  border: message.type === 'user' 
                    ? `1px solid ${palette.blue.light2}`
                    : `1px solid ${palette.gray.light2}`,
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}>
                  <div style={{ padding: spacing[3] }}>
                    <Body size="small" style={{ 
                      margin: 0, 
                      whiteSpace: 'pre-wrap', 
                      lineHeight: 1.5,
                      wordBreak: 'break-word',
                      color: message.type === 'user' 
                        ? palette.blue.dark2 
                        : palette.gray.dark3,
                      fontFamily: message.isOriginalPrompt ? 'monospace' : 'inherit',
                      fontSize: message.isOriginalPrompt ? '11px' : '13px'
                    }}>
                      <div dangerouslySetInnerHTML={{ __html: renderMarkdown(displayContent) }} />
                    </Body>

                    {/* Expand/Collapse Button */}
                    {showExpandButton && (
                      <div style={{ 
                        marginTop: spacing[2],
                        display: 'flex',
                        justifyContent: 'center'
                      }}>
                        <Button
                          size="xsmall"
                          variant="default"
                          onClick={() => toggleMessageExpansion(message.id)}
                          leftGlyph={<Icon glyph={isExpanded ? "ChevronUp" : "ChevronDown"} />}
                        >
                          {isExpanded ? 'Show Less' : 'Show Full Content'}
                        </Button>
                      </div>
                    )}

                    {/* Message Metadata */}
                    <div style={{ 
                      marginTop: spacing[2],
                      paddingTop: spacing[1],
                      borderTop: `1px solid ${palette.gray.light2}`,
                      fontSize: '11px', 
                      opacity: 0.8,
                      color: message.type === 'user' 
                        ? palette.blue.dark1 
                        : palette.gray.dark1,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <span>{new Date(message.timestamp).toLocaleTimeString()}</span>
                      {message.responseTime && (
                        <span>Response time: {message.responseTime}ms</span>
                      )}
                      {showExpandButton && (
                        <span>{message.content.length.toLocaleString()} characters</span>
                      )}
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          );
        })}

        {isLoading && (
          <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: spacing[3] }}>
            <div style={{
              background: palette.gray.light3,
              color: palette.gray.dark3,
              padding: spacing[3],
              borderRadius: '8px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2] }}>
                <Spinner size="small" />
                <Body size="small" style={{ margin: 0 }}>Agent is thinking...</Body>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: spacing[3] }}>
            <Banner variant="danger" style={{ fontSize: '12px' }}>
              {error}
            </Banner>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div style={{ 
        borderTop: `1px solid ${palette.gray.light2}`, 
        padding: spacing[3],
        background: palette.gray.light3
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: spacing[2] }}>
          <div style={{ flex: 1 }}>
            <TextInput
              aria-label="Chat message"
              placeholder="Ask the agent about its decision..."
              value={currentMessage}
              onChange={(e) => setCurrentMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={isLoading}
              style={{ fontSize: '14px' }}
            />
          </div>
          <Button
            size="default"
            variant="primary"
            onClick={sendMessage}
            disabled={!currentMessage.trim() || isLoading}
            leftGlyph={<Icon glyph="ArrowRight" />}
          >
            Send
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default AgentChatInterface;