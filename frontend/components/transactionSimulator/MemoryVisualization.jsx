"use client";

import React, { useState } from 'react';
import Card from '@leafygreen-ui/card';
import { Body, H3 } from '@leafygreen-ui/typography';
import Icon from '@leafygreen-ui/icon';
import Badge from '@leafygreen-ui/badge';
import ExpandableCard from '@leafygreen-ui/expandable-card';
import Code from '@leafygreen-ui/code';
import { palette } from '@leafygreen-ui/palette';
import { spacing } from '@leafygreen-ui/tokens';

const MemoryVisualization = ({ overview, conversations, decisions, patterns }) => {
  const [expandedCards, setExpandedCards] = useState({
    conversations: false,
    decisions: false,
    patterns: false
  });

  const toggleCard = (cardType) => {
    setExpandedCards(prev => ({
      ...prev,
      [cardType]: !prev[cardType]
    }));
  };

  // Memory Flow Diagram Component
  const MemoryFlowDiagram = () => (
    <Card style={{ 
      marginBottom: spacing[4], 
      background: `linear-gradient(135deg, ${palette.gray.light3}, ${palette.white})`,
      border: `2px solid ${palette.gray.base}`
    }}>
      <H3 style={{ marginBottom: spacing[3], display: 'flex', alignItems: 'center', gap: spacing[2] }}>
        <Icon glyph="Diagram" fill={palette.gray.dark2} size={24} />
        AI Agent Memory Flow
        <Badge variant="lightgray" style={{ fontSize: '11px' }}>STORAGE → RETRIEVAL → LEARNING</Badge>
      </H3>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: spacing[3], alignItems: 'center' }}>
        {/* Step 1: Storage */}
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            background: `linear-gradient(135deg, ${palette.green.base}, ${palette.green.dark1})`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto',
            marginBottom: spacing[2],
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
          }}>
            <Icon glyph="Save" fill={palette.white} size={28} />
          </div>
          <Body weight="bold" style={{ color: palette.green.dark2, marginBottom: spacing[1] }}>
            1. STORAGE
          </Body>
          <Body size="small" style={{ color: palette.gray.dark1, lineHeight: 1.4 }}>
            Agent stores transaction context, decisions, and patterns in 3 MongoDB collections
          </Body>
        </div>

        {/* Arrow 1 */}
        <div style={{ textAlign: 'center', color: palette.blue.base, fontSize: '24px' }}>
          →
        </div>

        {/* Step 2: Retrieval */}
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            background: `linear-gradient(135deg, ${palette.blue.base}, ${palette.blue.dark1})`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto',
            marginBottom: spacing[2],
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
          }}>
            <Icon glyph="MagnifyingGlass" fill={palette.white} size={28} />
          </div>
          <Body weight="bold" style={{ color: palette.blue.dark2, marginBottom: spacing[1] }}>
            2. RETRIEVAL
          </Body>
          <Body size="small" style={{ color: palette.gray.dark1, lineHeight: 1.4 }}>
            Vector similarity search finds relevant past experiences for current decisions
          </Body>
        </div>

        {/* Arrow 2 */}
        <div style={{ textAlign: 'center', color: palette.purple.base, fontSize: '24px' }}>
          →
        </div>

        {/* Step 3: Learning */}
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            background: `linear-gradient(135deg, ${palette.purple.base}, ${palette.purple.dark1})`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto',
            marginBottom: spacing[2],
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
          }}>
            <Icon glyph="Bulb" fill={palette.white} size={28} />
          </div>
          <Body weight="bold" style={{ color: palette.purple.dark2, marginBottom: spacing[1] }}>
            3. LEARNING
          </Body>
          <Body size="small" style={{ color: palette.gray.dark1, lineHeight: 1.4 }}>
            Agent improves decisions by learning from patterns and outcomes over time
          </Body>
        </div>
      </div>

      {/* MongoDB Advantage Callout */}
      <div style={{ 
        marginTop: spacing[4], 
        padding: spacing[3], 
        background: `linear-gradient(135deg, ${palette.blue.light3}, ${palette.white})`,
        borderRadius: '12px',
        border: `2px solid ${palette.blue.light1}`
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2], marginBottom: spacing[2] }}>
          <Icon glyph="Database" fill={palette.blue.dark2} size={20} />
          <Body weight="bold" style={{ color: palette.blue.dark2 }}>
            Why MongoDB for AI Memory?
          </Body>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: spacing[2] }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: spacing[1] }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: palette.green.base }} />
            <Body size="small" style={{ color: palette.gray.dark2 }}>Flexible JSON documents</Body>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: spacing[1] }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: palette.blue.base }} />
            <Body size="small" style={{ color: palette.gray.dark2 }}>Vector similarity search</Body>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: spacing[1] }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: palette.purple.base }} />
            <Body size="small" style={{ color: palette.gray.dark2 }}>Powerful aggregations</Body>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: spacing[1] }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: palette.red.base }} />
            <Body size="small" style={{ color: palette.gray.dark2 }}>Horizontal scalability</Body>
          </div>
        </div>
      </div>
    </Card>
  );

  return (
    <div>
      {/* Memory Flow Diagram */}
      <MemoryFlowDiagram />

      {/* 3-Collection System Overview */}
      <Card style={{ 
        marginBottom: spacing[4], 
        background: `linear-gradient(135deg, ${palette.blue.light3}, ${palette.white})`,
        border: `2px solid ${palette.blue.base}`
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2], marginBottom: spacing[3] }}>
          <Icon glyph="Database" fill={palette.blue.dark2} size={24} />
          <H3 style={{ margin: 0, color: palette.blue.dark2 }}>3-Collection Memory System Status</H3>
          <Badge variant="blue" style={{ fontSize: '11px' }}>MONGODB COLLECTIONS</Badge>
        </div>
        
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', 
          gap: spacing[3]
        }}>
          <div style={{ 
            textAlign: 'center', 
            padding: spacing[3], 
            background: palette.white, 
            borderRadius: '12px',
            border: `2px solid ${palette.green.light1}`,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            ':hover': { transform: 'translateY(-2px)', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }
          }}>
            <Icon glyph="Chat" fill={palette.green.dark2} size={24} style={{ marginBottom: spacing[1] }} />
            <H3 style={{ margin: 0, color: palette.green.dark2, fontSize: '28px' }}>{overview.total_memories}</H3>
            <Body size="small" style={{ color: palette.green.dark1, fontWeight: 'bold' }}>agent_memory</Body>
            <Body size="xsmall" style={{ color: palette.gray.dark1, marginTop: spacing[1] }}>Conversations & Context</Body>
          </div>
          <div style={{ 
            textAlign: 'center', 
            padding: spacing[3], 
            background: palette.white, 
            borderRadius: '12px',
            border: `2px solid ${palette.yellow.light1}`,
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}>
            <Icon glyph="Bulb" fill={palette.yellow.dark2} size={24} style={{ marginBottom: spacing[1] }} />
            <H3 style={{ margin: 0, color: palette.yellow.dark2, fontSize: '28px' }}>{overview.total_decisions}</H3>
            <Body size="small" style={{ color: palette.yellow.dark1, fontWeight: 'bold' }}>agent_decisions</Body>
            <Body size="xsmall" style={{ color: palette.gray.dark1, marginTop: spacing[1] }}>Outcomes & Learning</Body>
          </div>
          <div style={{ 
            textAlign: 'center', 
            padding: spacing[3], 
            background: palette.white, 
            borderRadius: '12px',
            border: `2px solid ${palette.purple.light1}`,
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}>
            <Icon glyph="Cloud" fill={palette.purple.dark2} size={24} style={{ marginBottom: spacing[1] }} />
            <H3 style={{ margin: 0, color: palette.purple.dark2, fontSize: '28px' }}>{overview.total_patterns}</H3>
            <Body size="small" style={{ color: palette.purple.dark1, fontWeight: 'bold' }}>agent_patterns</Body>
            <Body size="xsmall" style={{ color: palette.gray.dark1, marginTop: spacing[1] }}>Learned Insights</Body>
          </div>
        </div>
        
        <div style={{ 
          marginTop: spacing[3], 
          padding: spacing[3], 
          background: `linear-gradient(135deg, ${palette.gray.light2}, ${palette.white})`,
          borderRadius: '12px',
          border: `1px solid ${palette.gray.light1}`,
          textAlign: 'center'
        }}>
          <Body size="small" style={{ color: palette.gray.dark2, fontWeight: 'medium' }}>
            <Icon glyph="Clock" fill={palette.gray.base} size={16} style={{ marginRight: spacing[1] }} />
            Active Threads: <strong>{overview.active_threads}</strong> | 
            {overview.latest_activity ? ` Latest Activity: ${new Date(overview.latest_activity).toLocaleString()}` : ' No recent activity'}
          </Body>
        </div>
      </Card>

      {/* Agent Memory Collection - Expandable Cards */}
      <Card style={{ marginBottom: spacing[3] }}>
        <H3 style={{ marginBottom: spacing[3], display: 'flex', alignItems: 'center', gap: spacing[2] }}>
          <Icon glyph="Chat" fill={palette.green.base} size={20} />
          agent_memory Collection ({conversations.length} documents)
          <Badge variant="green" style={{ fontSize: '10px' }}>CONVERSATIONS & CONTEXT</Badge>
        </H3>
        
        {conversations.length === 0 ? (
          <Body style={{ color: palette.gray.dark1, textAlign: 'center', padding: spacing[4] }}>
            No memory documents yet. Agent conversations will appear here after analysis starts.
          </Body>
        ) : (
          <div>
            {conversations.slice(0, 3).map((conversation, index) => (
              <ExpandableCard
                key={index}
                title={
                  <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2] }}>
                    <Icon glyph="Chat" fill={palette.green.base} size={16} />
                    <span style={{ display: 'flex', alignItems: 'center', gap: spacing[1] }}>
                      <span style={{ color: palette.green.base, fontSize: '16px' }}>{'{'}</span>
                      <span style={{ fontSize: '13px', fontWeight: 'medium' }}>
                        Memory Document {index + 1}
                      </span>
                      <span style={{ color: palette.green.base, fontSize: '16px' }}>{'}'}</span>
                    </span>
                    <Badge variant="lightgray" style={{ fontSize: '10px' }}>
                      Thread: {conversation.thread_id?.substring(0, 8)}...
                    </Badge>
                    <Badge variant="green" style={{ fontSize: '10px' }}>
                      {new Date(conversation.timestamp).toLocaleDateString()}
                    </Badge>
                  </div>
                }
                defaultOpen={false}
                onClick={() => toggleCard('conversations')}
                style={{ marginBottom: spacing[2] }}
              >
                <div style={{ maxHeight: '400px', overflow: 'auto' }}>
                  <Code language="json" copyable={true}>
                    {JSON.stringify(conversation, null, 2)}
                  </Code>
                </div>
              </ExpandableCard>
            ))}
            {conversations.length > 3 && (
              <Body size="small" style={{ 
                color: palette.gray.dark1, 
                textAlign: 'center', 
                marginTop: spacing[2],
                fontStyle: 'italic'
              }}>
                ... and {conversations.length - 3} more documents in agent_memory collection
              </Body>
            )}
          </div>
        )}
      </Card>

      {/* Agent Decisions Collection - Expandable Cards */}
      <Card style={{ marginBottom: spacing[3] }}>
        <H3 style={{ marginBottom: spacing[3], display: 'flex', alignItems: 'center', gap: spacing[2] }}>
          <Icon glyph="Bulb" fill={palette.yellow.base} size={20} />
          agent_decisions Collection ({decisions.length} documents)
          <Badge variant="yellow" style={{ fontSize: '10px' }}>OUTCOMES & LEARNING</Badge>
        </H3>
        
        {decisions.length === 0 ? (
          <Body style={{ color: palette.gray.dark1, textAlign: 'center', padding: spacing[4] }}>
            No decision documents yet. Agent decisions will be recorded here after transaction processing.
          </Body>
        ) : (
          <div>
            {decisions.slice(0, 3).map((decision, index) => (
              <ExpandableCard
                key={index}
                title={
                  <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2] }}>
                    <Icon glyph="Bulb" fill={palette.yellow.base} size={16} />
                    <span style={{ display: 'flex', alignItems: 'center', gap: spacing[1] }}>
                      <span style={{ color: palette.yellow.base, fontSize: '16px' }}>{'{'}</span>
                      <span style={{ fontSize: '13px', fontWeight: 'medium' }}>
                        Decision Document {index + 1}
                      </span>
                      <span style={{ color: palette.yellow.base, fontSize: '16px' }}>{'}'}</span>
                    </span>
                    <Badge variant="yellow" style={{ fontSize: '10px' }}>
                      {decision.decision_type || 'FRAUD_ANALYSIS'}
                    </Badge>
                    <Badge variant="lightgray" style={{ fontSize: '10px' }}>
                      {(decision.confidence * 100).toFixed(1)}% confidence
                    </Badge>
                    <Badge variant="yellow" style={{ fontSize: '10px' }}>
                      {new Date(decision.timestamp).toLocaleDateString()}
                    </Badge>
                  </div>
                }
                defaultOpen={false}
                onClick={() => toggleCard('decisions')}
                style={{ marginBottom: spacing[2] }}
              >
                <div style={{ maxHeight: '400px', overflow: 'auto' }}>
                  <Code language="json" copyable={true}>
                    {JSON.stringify(decision, null, 2)}
                  </Code>
                </div>
              </ExpandableCard>
            ))}
            {decisions.length > 3 && (
              <Body size="small" style={{ 
                color: palette.gray.dark1, 
                textAlign: 'center', 
                marginTop: spacing[2],
                fontStyle: 'italic'
              }}>
                ... and {decisions.length - 3} more documents in agent_decisions collection
              </Body>
            )}
          </div>
        )}
      </Card>

      {/* Agent Patterns Collection - Expandable Cards */}
      <Card style={{ marginBottom: spacing[3] }}>
        <H3 style={{ marginBottom: spacing[3], display: 'flex', alignItems: 'center', gap: spacing[2] }}>
          <Icon glyph="Cloud" fill={palette.purple.base} size={20} />
          agent_patterns Collection ({patterns.length} documents)
          <Badge variant="darkgray" style={{ fontSize: '10px' }}>LEARNED INSIGHTS</Badge>
        </H3>
        
        {patterns.length === 0 ? (
          <Body style={{ color: palette.gray.dark1, textAlign: 'center', padding: spacing[4] }}>
            No pattern documents yet. The agent will discover and store patterns as it processes more transactions.
          </Body>
        ) : (
          <div>
            {patterns.slice(0, 3).map((pattern, index) => (
              <ExpandableCard
                key={index}
                title={
                  <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2] }}>
                    <Icon glyph="Cloud" fill={palette.purple.base} size={16} />
                    <span style={{ display: 'flex', alignItems: 'center', gap: spacing[1] }}>
                      <span style={{ color: palette.purple.base, fontSize: '16px' }}>{'{'}</span>
                      <span style={{ fontSize: '13px', fontWeight: 'medium' }}>
                        Pattern Document {index + 1}
                      </span>
                      <span style={{ color: palette.purple.base, fontSize: '16px' }}>{'}'}</span>
                    </span>
                    <Badge variant="darkgray" style={{ fontSize: '10px' }}>
                      {pattern.pattern_type || 'FRAUD_PATTERN'}
                    </Badge>
                    <Badge variant="purple" style={{ fontSize: '10px' }}>
                      {(pattern.confidence * 100).toFixed(1)}% confidence
                    </Badge>
                    <Badge variant="lightgray" style={{ fontSize: '10px' }}>
                      {pattern.evidence_count || 0} evidence
                    </Badge>
                    <Badge variant="purple" style={{ fontSize: '10px' }}>
                      {new Date(pattern.last_updated).toLocaleDateString()}
                    </Badge>
                  </div>
                }
                defaultOpen={false}
                onClick={() => toggleCard('patterns')}
                style={{ marginBottom: spacing[2] }}
              >
                <div style={{ maxHeight: '400px', overflow: 'auto' }}>
                  <Code language="json" copyable={true}>
                    {JSON.stringify(pattern, null, 2)}
                  </Code>
                </div>
              </ExpandableCard>
            ))}
            {patterns.length > 3 && (
              <Body size="small" style={{ 
                color: palette.gray.dark1, 
                textAlign: 'center', 
                marginTop: spacing[2],
                fontStyle: 'italic'
              }}>
                ... and {patterns.length - 3} more documents in agent_patterns collection
              </Body>
            )}
          </div>
        )}
      </Card>

      {/* Memory Retrieval & Usage Information */}
      <Card style={{ 
        background: `linear-gradient(135deg, ${palette.yellow.light3}, ${palette.white})`,
        border: `2px solid ${palette.yellow.light1}`
      }}>
        <H3 style={{ marginBottom: spacing[3], display: 'flex', alignItems: 'center', gap: spacing[2] }}>
          <Icon glyph="Refresh" fill={palette.yellow.base} size={20} />
          When Does Memory Retrieval Happen?
          <Badge variant="yellow" style={{ fontSize: '11px' }}>LEARNING IN ACTION</Badge>
        </H3>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: spacing[3] }}>
          <div style={{ 
            background: palette.white,
            padding: spacing[3],
            borderRadius: '12px',
            border: `2px solid ${palette.blue.light1}`
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2], marginBottom: spacing[2] }}>
              <Icon glyph="MagnifyingGlass" fill={palette.blue.base} size={20} />
              <Body weight="bold" style={{ color: palette.blue.dark2 }}>1. Transaction Analysis</Body>
            </div>
            <Body size="small" style={{ color: palette.gray.dark2, lineHeight: 1.4 }}>
              When processing a new transaction, the agent searches <strong>agent_decisions</strong> for similar past cases using vector similarity.
            </Body>
          </div>
          
          <div style={{ 
            background: palette.white,
            padding: spacing[3],
            borderRadius: '12px',
            border: `2px solid ${palette.purple.light1}`
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2], marginBottom: spacing[2] }}>
              <Icon glyph="Cloud" fill={palette.purple.base} size={20} />
              <Body weight="bold" style={{ color: palette.purple.dark2 }}>2. Pattern Matching</Body>
            </div>
            <Body size="small" style={{ color: palette.gray.dark2, lineHeight: 1.4 }}>
              The agent checks <strong>agent_patterns</strong> to apply learned rules and insights from previous fraud cases.
            </Body>
          </div>
          
          <div style={{ 
            background: palette.white,
            padding: spacing[3],
            borderRadius: '12px',
            border: `2px solid ${palette.green.light1}`
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2], marginBottom: spacing[2] }}>
              <Icon glyph="Chat" fill={palette.green.base} size={20} />
              <Body weight="bold" style={{ color: palette.green.dark2 }}>3. Context Building</Body>
            </div>
            <Body size="small" style={{ color: palette.gray.dark2, lineHeight: 1.4 }}>
              Past conversations from <strong>agent_memory</strong> provide context for more informed decision-making.
            </Body>
          </div>
        </div>

        <div style={{ 
          marginTop: spacing[3], 
          padding: spacing[3], 
          background: `linear-gradient(135deg, ${palette.gray.light2}, ${palette.white})`,
          borderRadius: '12px',
          textAlign: 'center'
        }}>
          <Body weight="bold" style={{ color: palette.gray.dark3, marginBottom: spacing[2] }}>
            🚀 The Result: Smarter, Context-Aware AI Decisions
          </Body>
          <Body size="small" style={{ color: palette.gray.dark2, lineHeight: 1.5 }}>
            Each transaction analysis gets better over time as the agent learns from stored experiences, 
            leading to more accurate fraud detection and fewer false positives.
          </Body>
        </div>
      </Card>
    </div>
  );
};

export default MemoryVisualization;