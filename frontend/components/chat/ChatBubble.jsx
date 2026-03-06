"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import Card from '@leafygreen-ui/card';
import Button from '@leafygreen-ui/button';
import Badge from '@leafygreen-ui/badge';
import Icon from '@leafygreen-ui/icon';
import TextInput from '@leafygreen-ui/text-input';
import { Body, Subtitle } from '@leafygreen-ui/typography';
import { palette } from '@leafygreen-ui/palette';
import { spacing } from '@leafygreen-ui/tokens';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { sendChatMessage } from '@/lib/agent-api';

const FONT = "'Euclid Circular A', sans-serif";

const markdownStyles = `
.chat-md h1, .chat-md h2, .chat-md h3 {
  margin: 6px 0 4px;
  font-size: 13px;
  font-weight: 700;
  line-height: 1.4;
}
.chat-md h1 { font-size: 15px; }
.chat-md h2 { font-size: 14px; }
.chat-md p { margin: 4px 0; }
.chat-md ul, .chat-md ol { margin: 4px 0; padding-left: 18px; }
.chat-md li { margin: 2px 0; }
.chat-md code {
  background: rgba(0,0,0,0.06);
  border-radius: 3px;
  padding: 1px 4px;
  font-size: 12px;
}
.chat-md pre { margin: 6px 0; overflow-x: auto; }
.chat-md pre code { display: block; padding: 6px 8px; }
.chat-md hr { margin: 8px 0; border: none; border-top: 1px solid rgba(0,0,0,0.1); }
.chat-md strong { font-weight: 600; }
.chat-md a { color: #007bff; text-decoration: none; }
.chat-md table { border-collapse: collapse; margin: 6px 0; font-size: 12px; }
.chat-md th, .chat-md td { border: 1px solid rgba(0,0,0,0.1); padding: 3px 6px; }
`;

function ToolCallIndicator({ tool, input, output, collapsed, onToggle }) {
  return (
    <div style={{
      margin: `${spacing[1]}px 0`,
      borderRadius: 6,
      border: `1px solid ${palette.blue.light2}`,
      background: palette.blue.light3,
      fontSize: 11,
      fontFamily: FONT,
      overflow: 'hidden',
    }}>
      <div
        onClick={onToggle}
        style={{
          padding: `4px 8px`,
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span style={{ color: palette.blue.dark1, fontWeight: 600 }}>
          🔧 {tool}
        </span>
        <span style={{ color: palette.gray.base, fontSize: 10 }}>
          {collapsed ? '▶' : '▼'}
        </span>
      </div>
      {!collapsed && (
        <div style={{ padding: `4px 8px 6px`, borderTop: `1px solid ${palette.blue.light2}` }}>
          {input && (
            <div style={{ marginBottom: 4 }}>
              <span style={{ fontWeight: 600, color: palette.gray.dark1 }}>Input: </span>
              <span style={{ color: palette.gray.dark2, wordBreak: 'break-word' }}>
                {typeof input === 'string' ? input : JSON.stringify(input)}
              </span>
            </div>
          )}
          {output && (
            <div>
              <span style={{ fontWeight: 600, color: palette.gray.dark1 }}>Output: </span>
              <span style={{ color: palette.gray.dark2, wordBreak: 'break-word' }}>
                {typeof output === 'string'
                  ? (output.length > 300 ? output.slice(0, 300) + '...' : output)
                  : JSON.stringify(output).slice(0, 300)}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function MessageBubble({ msg }) {
  const [toolCollapsed, setToolCollapsed] = useState({});

  if (msg.role === 'user') {
    return (
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: spacing[1] }}>
        <div style={{
          maxWidth: '85%',
          padding: `${spacing[1]}px ${spacing[2]}px`,
          borderRadius: '12px 12px 4px 12px',
          background: palette.green.dark1,
          color: '#fff',
          fontSize: 13,
          fontFamily: FONT,
          lineHeight: 1.5,
          whiteSpace: 'pre-wrap',
        }}>
          {msg.content}
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: spacing[1] }}>
      <div style={{ maxWidth: '90%' }}>
        {msg.toolCalls?.map((tc, i) => (
          <ToolCallIndicator
            key={i}
            tool={tc.tool}
            input={tc.input}
            output={tc.output}
            collapsed={toolCollapsed[i] !== false}
            onToggle={() => setToolCollapsed(prev => ({ ...prev, [i]: prev[i] === false ? true : false }))}
          />
        ))}
        {msg.content && (
          <div className="chat-md" style={{
            padding: `${spacing[1]}px ${spacing[2]}px`,
            borderRadius: '12px 12px 12px 4px',
            background: palette.gray.light3,
            color: palette.gray.dark2,
            fontSize: 13,
            fontFamily: FONT,
            lineHeight: 1.6,
          }}>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {msg.content}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ChatBubble() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [threadId, setThreadId] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streaming]);

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || streaming) return;

    setInput('');
    const userMsg = { role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    setStreaming(true);

    let assistantContent = '';
    const toolCalls = [];
    let currentToolIdx = -1;

    setMessages(prev => [...prev, { role: 'assistant', content: '', toolCalls: [] }]);

    try {
      await sendChatMessage(text, threadId, (event) => {
        if (event.type === 'thread_id') {
          setThreadId(event.thread_id);
        } else if (event.type === 'token') {
          assistantContent += event.content;
          setMessages(prev => {
            const msgs = [...prev];
            msgs[msgs.length - 1] = {
              role: 'assistant',
              content: assistantContent,
              toolCalls: [...toolCalls],
            };
            return msgs;
          });
        } else if (event.type === 'tool_call') {
          currentToolIdx = toolCalls.length;
          toolCalls.push({ tool: event.tool, input: event.input, output: null });
          setMessages(prev => {
            const msgs = [...prev];
            msgs[msgs.length - 1] = {
              role: 'assistant',
              content: assistantContent,
              toolCalls: [...toolCalls],
            };
            return msgs;
          });
        } else if (event.type === 'tool_result') {
          if (currentToolIdx >= 0 && currentToolIdx < toolCalls.length) {
            toolCalls[currentToolIdx].output = event.output;
          }
          setMessages(prev => {
            const msgs = [...prev];
            msgs[msgs.length - 1] = {
              role: 'assistant',
              content: assistantContent,
              toolCalls: [...toolCalls],
            };
            return msgs;
          });
        } else if (event.type === 'error') {
          assistantContent += `\n⚠ Error: ${event.message}`;
          setMessages(prev => {
            const msgs = [...prev];
            msgs[msgs.length - 1] = {
              role: 'assistant',
              content: assistantContent,
              toolCalls: [...toolCalls],
            };
            return msgs;
          });
        }
      });
    } catch (err) {
      setMessages(prev => {
        const msgs = [...prev];
        msgs[msgs.length - 1] = {
          role: 'assistant',
          content: assistantContent || `Error: ${err.message}`,
          toolCalls: [...toolCalls],
        };
        return msgs;
      });
    } finally {
      setStreaming(false);
    }
  }, [input, streaming, threadId]);

  const handleNewChat = () => {
    setMessages([]);
    setThreadId(null);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!open) {
    return (
      <div
        onClick={() => setOpen(true)}
        style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          width: 56,
          height: 56,
          borderRadius: '50%',
          background: palette.green.dark1,
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
          zIndex: 1000,
          transition: 'transform 0.15s ease',
          fontSize: 24,
        }}
        onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.08)'; }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
        title="AML Compliance Assistant"
      >
        💬
      </div>
    );
  }

  return (
    <div style={{
      position: 'fixed',
      bottom: 24,
      right: 24,
      width: 420,
      height: 560,
      zIndex: 1000,
      borderRadius: 12,
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
      border: `1px solid ${palette.gray.light2}`,
      background: '#fff',
    }}>
      <style>{markdownStyles}</style>
      {/* Header */}
      <div style={{
        padding: `${spacing[2]}px ${spacing[3]}px`,
        background: palette.green.dark1,
        color: '#fff',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Subtitle style={{ fontFamily: FONT, color: '#fff', fontSize: 14, margin: 0 }}>
            AML Assistant
          </Subtitle>
          <Badge variant="green" style={{ fontSize: 9 }}>AI</Badge>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          <button
            onClick={handleNewChat}
            title="New conversation"
            style={{
              background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 4,
              color: '#fff', cursor: 'pointer', padding: '2px 8px', fontSize: 11,
              fontFamily: FONT,
            }}
          >
            New
          </button>
          <button
            onClick={() => setOpen(false)}
            style={{
              background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 4,
              color: '#fff', cursor: 'pointer', padding: '2px 8px', fontSize: 16,
            }}
          >
            ✕
          </button>
        </div>
      </div>

      {/* Messages */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: spacing[2],
        background: '#fafbfc',
      }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', padding: spacing[4] }}>
            <Body style={{ fontFamily: FONT, color: palette.gray.dark1, fontSize: 13, marginBottom: spacing[2] }}>
              Ask me about entities, transactions, investigations, typologies, or compliance policies.
            </Body>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[
                'Show me high-risk entities',
                'What are the red flags for structuring?',
                'Summarize recent investigations',
              ].map((q) => (
                <button
                  key={q}
                  onClick={() => { setInput(q); }}
                  style={{
                    background: palette.gray.light3, border: `1px solid ${palette.gray.light2}`,
                    borderRadius: 8, padding: '6px 10px', fontSize: 12, fontFamily: FONT,
                    color: palette.gray.dark2, cursor: 'pointer', textAlign: 'left',
                  }}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((msg, i) => (
          <MessageBubble key={i} msg={msg} />
        ))}
        {streaming && (
          <div style={{ display: 'flex', gap: 4, padding: 4 }}>
            <span style={{ fontSize: 11, color: palette.gray.base, fontFamily: FONT }}>Thinking...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div style={{
        padding: spacing[2],
        borderTop: `1px solid ${palette.gray.light2}`,
        background: '#fff',
        display: 'flex',
        gap: spacing[1],
        flexShrink: 0,
      }}>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about entities, transactions, compliance..."
          disabled={streaming}
          style={{
            flex: 1,
            padding: '8px 12px',
            borderRadius: 8,
            border: `1px solid ${palette.gray.light2}`,
            fontSize: 13,
            fontFamily: FONT,
            outline: 'none',
          }}
        />
        <Button
          size="small"
          variant="baseGreen"
          onClick={handleSend}
          disabled={streaming || !input.trim()}
        >
          Send
        </Button>
      </div>
    </div>
  );
}
