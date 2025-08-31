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

// Enhanced markdown renderer with POML support for chat messages
const renderMarkdown = (text) => {
  if (!text) return text;
  
  // Check if this is POML content
  const isPOML = text.includes('<poml>') && text.includes('</poml>');
  
  if (isPOML) {
    return text
      // POML root tag
      .replace(/<poml>/g, '<div style="background: linear-gradient(135deg, #FFF9E6, #FFFBF0); border: 2px solid #F59E0B; border-radius: 8px; padding: 16px; margin: 8px 0; font-family: monospace;">')
      .replace(/<\/poml>/g, '</div>')
      
      // Agent tag
      .replace(/<agent name="([^"]+)">/g, '<div style="background: #EBF8FF; border-left: 4px solid #3B82F6; padding: 12px; margin: 8px 0; border-radius: 4px;"><div style="font-weight: bold; color: #1E40AF; margin-bottom: 8px; font-size: 14px;">🤖 Agent: $1</div>')
      .replace(/<\/agent>/g, '</div>')
      
      // Role section
      .replace(/<role>/g, '<div style="background: #F0FDF4; border-left: 3px solid #10B981; padding: 10px; margin: 6px 0; border-radius: 4px;"><div style="font-weight: bold; color: #059669; margin-bottom: 6px; font-size: 13px;">📋 Role</div><div style="color: #065F46; line-height: 1.4;">')
      .replace(/<\/role>/g, '</div></div>')
      
      // Task section
      .replace(/<task>/g, '<div style="background: #FEF3C7; border-left: 3px solid #F59E0B; padding: 10px; margin: 6px 0; border-radius: 4px;"><div style="font-weight: bold; color: #D97706; margin-bottom: 6px; font-size: 13px;">🎯 Task</div><div style="color: #92400E; line-height: 1.4;">')
      .replace(/<\/task>/g, '</div></div>')
      
      // Capabilities section
      .replace(/<capabilities>/g, '<div style="background: #EDE9FE; border-left: 3px solid #8B5CF6; padding: 10px; margin: 6px 0; border-radius: 4px;"><div style="font-weight: bold; color: #7C3AED; margin-bottom: 6px; font-size: 13px;">⚡ Capabilities</div><ul style="margin: 0; padding-left: 16px; color: #5B21B6;">')
      .replace(/<\/capabilities>/g, '</ul></div>')
      
      // Decision Framework section
      .replace(/<decisionFramework>/g, '<div style="background: #FEE2E2; border-left: 3px solid #EF4444; padding: 10px; margin: 6px 0; border-radius: 4px;"><div style="font-weight: bold; color: #DC2626; margin-bottom: 6px; font-size: 13px;">⚖️ Decision Framework</div><div style="color: #991B1B;">')
      .replace(/<\/decisionFramework>/g, '</div></div>')
      
      // Guidelines section
      .replace(/<guidelines>/g, '<div style="background: #F0F9FF; border-left: 3px solid #0EA5E9; padding: 10px; margin: 6px 0; border-radius: 4px;"><div style="font-weight: bold; color: #0284C7; margin-bottom: 6px; font-size: 13px;">📖 Guidelines</div><ul style="margin: 0; padding-left: 16px; color: #0C4A6E;">')
      .replace(/<\/guidelines>/g, '</ul></div>')
      
      // Response Template section
      .replace(/<responseTemplate>/g, '<div style="background: #F3E8FF; border-left: 3px solid #A855F7; padding: 10px; margin: 6px 0; border-radius: 4px;"><div style="font-weight: bold; color: #9333EA; margin-bottom: 6px; font-size: 13px;">📝 Response Template</div><div style="color: #6B21A8; font-family: monospace; background: #FAF5FF; padding: 8px; border-radius: 4px; white-space: pre-line;">')
      .replace(/<\/responseTemplate>/g, '</div></div>')
      
      // Example section
      .replace(/<example>/g, '<div style="background: #ECFDF5; border-left: 3px solid #22C55E; padding: 10px; margin: 6px 0; border-radius: 4px;"><div style="font-weight: bold; color: #16A34A; margin-bottom: 6px; font-size: 13px;">💡 Example</div>')
      .replace(/<\/example>/g, '</div>')
      
      // Input/Output within examples
      .replace(/<input>/g, '<div style="background: #FEF7FF; border: 1px solid #D8B4FE; padding: 8px; margin: 4px 0; border-radius: 4px;"><div style="font-weight: bold; color: #7C3AED; font-size: 12px; margin-bottom: 4px;">Input:</div><div style="color: #5B21B6; font-size: 12px; line-height: 1.3;">')
      .replace(/<\/input>/g, '</div></div>')
      
      .replace(/<output>/g, '<div style="background: #F0FDF4; border: 1px solid #BBF7D0; padding: 8px; margin: 4px 0; border-radius: 4px;"><div style="font-weight: bold; color: #16A34A; font-size: 12px; margin-bottom: 4px;">Output:</div><div style="color: #15803D; font-size: 12px; line-height: 1.3; font-family: monospace;">')
      .replace(/<\/output>/g, '</div></div>')
      
      // Items within lists
      .replace(/<item>/g, '<li style="margin: 2px 0; line-height: 1.3;">')
      .replace(/<\/item>/g, '</li>')
      
      // Options within decision framework
      .replace(/<option name="([^"]+)">/g, '<div style="background: #FFF1F2; border: 1px solid #FECACA; padding: 6px; margin: 3px 0; border-radius: 3px;"><span style="font-weight: bold; color: #DC2626;">$1:</span> ')
      .replace(/<\/option>/g, '</div>')
      
      // Line breaks
      .replace(/\n/g, '<br />');
  }
  
  // Regular markdown processing for non-POML content
  return text
    // Headers: #### then ### then ##
    .replace(/^#### (.*$)/gm, '<h4 style="font-size: 16px; font-weight: bold; margin: 12px 0 8px 0; color: #1f2937;">$1</h4>')
    .replace(/^### (.*$)/gm, '<h3 style="font-size: 18px; font-weight: bold; margin: 16px 0 12px 0; color: #1f2937;">$1</h3>')
    .replace(/^## (.*$)/gm, '<h2 style="font-size: 20px; font-weight: bold; margin: 20px 0 16px 0; color: #1f2937;">$1</h2>')
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
            
            // Add system prompt as the first message
            const systemPrompt = {
              id: 'system-prompt',
              type: 'system',
              content: `<poml>
  <agent name="PrimaryFraudAgent">
    <role>
      You are an advanced AI agent specializing in financial fraud detection. 
      Your mission is to identify fraud patterns that rule-based systems miss, 
      providing clear, evidence-based risk assessments.
    </role>

    <task>
      - Analyze transactions using historical, behavioral, and contextual data.  
      - Detect subtle or emerging fraud typologies.  
      - Assign a risk score (0–100) and classify outcome.  
      - Deliver actionable recommendations that balance fraud prevention with minimizing false positives.  
    </task>

    <capabilities>
      <item>Historical transaction pattern analysis</item>
      <item>Customer behavior profiling</item>
      <item>Network & relationship analysis</item>
      <item>Sanctions, PEP, and watchlist screening</item>
    </capabilities>

    <decisionFramework>
      <option name="APPROVE">0–39: Low risk. Normal behavior. High confidence.</option>
      <option name="INVESTIGATE">40–65: Moderate risk. Manual review recommended.</option>
      <option name="ESCALATE">66–85: High risk. Urgent review needed.</option>
      <option name="BLOCK">86–100: Critical risk. Immediate action required.</option>
    </decisionFramework>

    <guidelines>
      <item>Always state your decision clearly.</item>
      <item>Support with concrete risk factors and evidence.</item>
      <item>Reference historical or behavioral context.</item>
      <item>Be concise but thorough: short narrative + key points.</item>
      <item>Focus on edge cases where rules are inconclusive.</item>
    </guidelines>

    <responseTemplate>
      - Decision: (APPROVE / INVESTIGATE / ESCALATE / BLOCK)  
      - Risk Score: (0–100)  
      - Key Risk Factors: (bullet points citing concrete evidence)  
      - Assessment Summary: (2–3 sentences explaining reasoning)  
      - Recommendation: (specific next action)  
    </responseTemplate>

    <example>
      <input>
        Transaction: $18,500 transfer from a new device to an overseas account in a high-risk jurisdiction.  
        Customer History: Typically transacts <$1,000, all local merchants. No prior international transfers.  
      </input>
      <output>
        - Decision: ESCALATE  
        - Risk Score: 78  
        - Key Risk Factors:  
          • First-time international transfer  
          • High-risk jurisdiction  
          • Unusual transaction amount vs. historical pattern  
          • New device, raising account takeover risk  
        - Assessment Summary: Transaction deviates significantly from historical profile. High-value transfer, unusual geography, and device change increase suspicion.  
        - Recommendation: Escalate to fraud operations team for urgent review.  
      </output>
    </example>
  </agent>
</poml>`,
              timestamp: new Date().toISOString()
            };
            
            setMessages([systemPrompt, ...formattedMessages]);
          } else {
            console.warn('Failed to fetch thread messages, falling back to summary');
            // Fallback to summary if API fails
            if (agentDecision) {
              const systemPrompt = {
                id: 'system-prompt',
                type: 'system',
                content: `<poml>
  <agent name="PrimaryFraudAgent">
    <role>
      You are an advanced AI agent specializing in financial fraud detection. 
      Your mission is to identify fraud patterns that rule-based systems miss, 
      providing clear, evidence-based risk assessments.
    </role>

    <task>
      - Analyze transactions using historical, behavioral, and contextual data.  
      - Detect subtle or emerging fraud typologies.  
      - Assign a risk score (0–100) and classify outcome.  
      - Deliver actionable recommendations that balance fraud prevention with minimizing false positives.  
    </task>

    <capabilities>
      <item>Historical transaction pattern analysis</item>
      <item>Customer behavior profiling</item>
      <item>Network & relationship analysis</item>
      <item>Sanctions, PEP, and watchlist screening</item>
    </capabilities>

    <decisionFramework>
      <option name="APPROVE">0–39: Low risk. Normal behavior. High confidence.</option>
      <option name="INVESTIGATE">40–65: Moderate risk. Manual review recommended.</option>
      <option name="ESCALATE">66–85: High risk. Urgent review needed.</option>
      <option name="BLOCK">86–100: Critical risk. Immediate action required.</option>
    </decisionFramework>

    <guidelines>
      <item>Always state your decision clearly.</item>
      <item>Support with concrete risk factors and evidence.</item>
      <item>Reference historical or behavioral context.</item>
      <item>Be concise but thorough: short narrative + key points.</item>
      <item>Focus on edge cases where rules are inconclusive.</item>
    </guidelines>

    <responseTemplate>
      - Decision: (APPROVE / INVESTIGATE / ESCALATE / BLOCK)  
      - Risk Score: (0–100)  
      - Key Risk Factors: (bullet points citing concrete evidence)  
      - Assessment Summary: (2–3 sentences explaining reasoning)  
      - Recommendation: (specific next action)  
    </responseTemplate>

    <example>
      <input>
        Transaction: $18,500 transfer from a new device to an overseas account in a high-risk jurisdiction.  
        Customer History: Typically transacts <$1,000, all local merchants. No prior international transfers.  
      </input>
      <output>
        - Decision: ESCALATE  
        - Risk Score: 78  
        - Key Risk Factors:  
          • First-time international transfer  
          • High-risk jurisdiction  
          • Unusual transaction amount vs. historical pattern  
          • New device, raising account takeover risk  
        - Assessment Summary: Transaction deviates significantly from historical profile. High-value transfer, unusual geography, and device change increase suspicion.  
        - Recommendation: Escalate to fraud operations team for urgent review.  
      </output>
    </example>
  </agent>
</poml>`,
                timestamp: new Date().toISOString()
              };

              setMessages([
                systemPrompt,
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
            const systemPrompt = {
              id: 'system-prompt',
              type: 'system',
              content: `<poml>
  <agent name="PrimaryFraudAgent">
    <role>
      You are an advanced AI agent specializing in financial fraud detection. 
      Your mission is to identify fraud patterns that rule-based systems miss, 
      providing clear, evidence-based risk assessments.
    </role>

    <task>
      - Analyze transactions using historical, behavioral, and contextual data.  
      - Detect subtle or emerging fraud typologies.  
      - Assign a risk score (0–100) and classify outcome.  
      - Deliver actionable recommendations that balance fraud prevention with minimizing false positives.  
    </task>

    <capabilities>
      <item>Historical transaction pattern analysis</item>
      <item>Customer behavior profiling</item>
      <item>Network & relationship analysis</item>
      <item>Sanctions, PEP, and watchlist screening</item>
    </capabilities>

    <decisionFramework>
      <option name="APPROVE">0–39: Low risk. Normal behavior. High confidence.</option>
      <option name="INVESTIGATE">40–65: Moderate risk. Manual review recommended.</option>
      <option name="ESCALATE">66–85: High risk. Urgent review needed.</option>
      <option name="BLOCK">86–100: Critical risk. Immediate action required.</option>
    </decisionFramework>

    <guidelines>
      <item>Always state your decision clearly.</item>
      <item>Support with concrete risk factors and evidence.</item>
      <item>Reference historical or behavioral context.</item>
      <item>Be concise but thorough: short narrative + key points.</item>
      <item>Focus on edge cases where rules are inconclusive.</item>
    </guidelines>

    <responseTemplate>
      - Decision: (APPROVE / INVESTIGATE / ESCALATE / BLOCK)  
      - Risk Score: (0–100)  
      - Key Risk Factors: (bullet points citing concrete evidence)  
      - Assessment Summary: (2–3 sentences explaining reasoning)  
      - Recommendation: (specific next action)  
    </responseTemplate>

    <example>
      <input>
        Transaction: $18,500 transfer from a new device to an overseas account in a high-risk jurisdiction.  
        Customer History: Typically transacts <$1,000, all local merchants. No prior international transfers.  
      </input>
      <output>
        - Decision: ESCALATE  
        - Risk Score: 78  
        - Key Risk Factors:  
          • First-time international transfer  
          • High-risk jurisdiction  
          • Unusual transaction amount vs. historical pattern  
          • New device, raising account takeover risk  
        - Assessment Summary: Transaction deviates significantly from historical profile. High-value transfer, unusual geography, and device change increase suspicion.  
        - Recommendation: Escalate to fraud operations team for urgent review.  
      </output>
    </example>
  </agent>
</poml>`,
              timestamp: new Date().toISOString()
            };

            setMessages([
              systemPrompt,
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
    if (message.type === 'system') {
      return 'System Prompt';
    } else if (message.isOriginalPrompt) {
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
            Chat with Fraud Detection Agent
          </Body>
        </div>
        <Body size="small" style={{ 
          margin: 0, 
          color: palette.gray.dark1, 
          fontFamily: 'monospace',
          fontSize: '10px',
          wordBreak: 'break-all',
          maxWidth: '200px'
        }}>
          Thread: {threadId}
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
                justifyContent: message.type === 'user' ? 'flex-end' : message.type === 'system' ? 'center' : 'flex-start',
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
                    textAlign: message.type === 'user' ? 'right' : message.type === 'system' ? 'center' : 'left'
                  }}>
                    <Badge 
                      variant={message.type === 'system' ? 'yellow' : message.isOriginalPrompt ? 'blue' : message.isDetailedResponse ? 'green' : 'gray'}
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
                    : message.type === 'system'
                    ? palette.yellow.light3
                    : palette.white,
                  border: message.type === 'user' 
                    ? `1px solid ${palette.blue.light2}`
                    : message.type === 'system'
                    ? `1px solid ${palette.yellow.light2}`
                    : `1px solid ${palette.gray.light2}`,
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}>
                  <div style={{ padding: spacing[3] }}>
                    <Body size="small" style={{ 
                      margin: 0, 
                      whiteSpace: message.type === 'system' ? 'normal' : 'pre-wrap', 
                      lineHeight: 1.5,
                      wordBreak: 'break-word',
                      color: message.type === 'user' 
                        ? palette.blue.dark2 
                        : message.type === 'system'
                        ? palette.gray.dark3
                        : palette.gray.dark3,
                      fontFamily: message.isOriginalPrompt ? 'monospace' : message.type === 'system' ? 'inherit' : 'inherit',
                      fontSize: message.isOriginalPrompt ? '11px' : message.type === 'system' ? '12px' : '13px'
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
                        : message.type === 'system'
                        ? palette.yellow.dark1
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
          <div style={{ width: '95%' }}>
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