"use client";

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import ReactFlow, {
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  useReactFlow,
  ReactFlowProvider
} from 'reactflow';
import 'reactflow/dist/style.css';

import Card from '@leafygreen-ui/card';
import Icon from '@leafygreen-ui/icon';
import Badge from '@leafygreen-ui/badge';
import Button from '@leafygreen-ui/button';
import Modal from '@leafygreen-ui/modal';
import { Body, H3 } from '@leafygreen-ui/typography';
import { palette } from '@leafygreen-ui/palette';
import { spacing } from '@leafygreen-ui/tokens';

// Import custom node types for memory architecture
import MemoryInputNode from './graph/nodes/MemoryInputNode';
import MemoryStoreNode from './graph/nodes/MemoryStoreNode';
import VectorSearchNode from './graph/nodes/VectorSearchNode';
import LearningNode from './graph/nodes/LearningNode';
import InsightNode from './graph/nodes/InsightNode';

const MemoryArchitectureGraph = ({ 
  loading, 
  memoryData,
  overview,
  conversations,
  decisions, 
  patterns 
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [renderKey, setRenderKey] = useState(0);
  const { fitView: reactFlowFitView } = useReactFlow();

  const toggleFullscreen = useCallback(() => {
    setIsFullscreen(prev => !prev);
    // Force re-render of ReactFlow when toggling fullscreen
    setRenderKey(prev => prev + 1);
  }, []);

  const fitViewManually = useCallback(() => {
    if (reactFlowFitView) {
      reactFlowFitView({
        padding: isFullscreen ? 0.1 : 0.2,
        minZoom: isFullscreen ? 0.5 : 0.6,
        maxZoom: isFullscreen ? 1.0 : 0.8,
        duration: 500,
        includeHiddenNodes: false
      });
    }
  }, [isFullscreen, reactFlowFitView]);

  // Fit view when switching fullscreen
  useEffect(() => {
    if (reactFlowFitView) {
      // Longer delay to ensure DOM and modal have fully updated
      setTimeout(() => {
        fitViewManually();
      }, 300);
    }
  }, [isFullscreen, reactFlowFitView, fitViewManually]);

  // Force re-render when exiting fullscreen
  useEffect(() => {
    if (!isFullscreen && reactFlowFitView) {
      // Additional delay when exiting fullscreen to ensure proper container sizing
      setTimeout(() => {
        reactFlowFitView({
          padding: 0.2,
          minZoom: 0.6,
          maxZoom: 0.8,
          duration: 500
        });
      }, 100);
    }
  }, [isFullscreen, reactFlowFitView]);

  // Handle ESC key to exit fullscreen
  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape' && isFullscreen) {
        event.preventDefault();
        event.stopPropagation();
        setIsFullscreen(false);
      }
    };

    document.addEventListener('keydown', handleEscape, true); // Use capture phase
    return () => document.removeEventListener('keydown', handleEscape, true);
  }, [isFullscreen]);

  // Node types mapping - memoized to prevent React Flow reinitialization
  const nodeTypes = useMemo(() => ({
    memoryInput: MemoryInputNode,
    memoryStore: MemoryStoreNode,
    vectorSearch: VectorSearchNode,
    learning: LearningNode,
    insight: InsightNode
  }), []);

  const getNodePosition = (x, y) => ({ x, y });

  // Define simplified vertical memory flow - centered and well-spaced - memoized
  const initialNodes = useMemo(() => [
    // Input: New Transaction
    {
      id: 'transaction-input',
      type: 'memoryInput',
      position: getNodePosition(400, 50),
      data: { 
        label: 'New Transaction',
        description: 'Incoming fraud analysis request',
        amount: memoryData?.context?.amount || 5000,
        merchant: memoryData?.context?.merchant?.name || 'Sample Merchant',
        isCompleted: true
      }
    },

    // Azure AI Foundry Thread Memory
    {
      id: 'azure-thread-memory',
      type: 'memoryStore',
      position: getNodePosition(400, 180),
      data: { 
        label: 'Azure Thread Memory',
        description: 'Native conversation context',
        type: 'azure_foundry',
        capacity: '100K messages',
        retention: 'Session-based',
        color: 'blue',
        isCompleted: true
      }
    },

    // MongoDB Collections (Vertical Stack)
    {
      id: 'mongodb-memory',
      type: 'memoryStore',
      position: getNodePosition(400, 310),
      data: { 
        label: 'agent_memory',
        description: 'Conversation + context storage',
        type: 'mongodb_collection',
        count: overview?.total_memories || 0,
        retention: '90 days',
        color: 'green',
        isCompleted: true
      }
    },

    {
      id: 'mongodb-decisions',
      type: 'memoryStore',
      position: getNodePosition(200, 440),
      data: { 
        label: 'agent_decisions',
        description: 'Decision tracking with embeddings',
        type: 'mongodb_collection',
        count: overview?.total_decisions || 0,
        retention: 'Permanent',
        color: 'yellow',
        isCompleted: true
      }
    },

    {
      id: 'mongodb-patterns',
      type: 'memoryStore',
      position: getNodePosition(600, 440),
      data: { 
        label: 'agent_patterns',
        description: 'Discovered insights & meta-learning',
        type: 'mongodb_collection',
        count: overview?.total_patterns || 0,
        retention: '180 days',
        color: 'purple',
        isCompleted: true
      }
    },

    // Learning Output
    {
      id: 'learning-insights',
      type: 'insight',
      position: getNodePosition(400, 570),
      data: { 
        label: 'Learning Insights',
        description: 'Actionable intelligence for fraud detection',
        insight_types: ['Patterns', 'Anomalies', 'Improvements'],
        confidence: '90%',
        isCompleted: true
      }
    }
  ], []);

  // Define edges matching the layout in the image - memoized
  const initialEdges = useMemo(() => [
    // Vertical flow from input through memory stores
    { 
      id: 'input-azure', 
      source: 'transaction-input', 
      target: 'azure-thread-memory',
      label: 'Store conversation',
      style: { stroke: palette.blue.base, strokeWidth: 2 }
    },
    
    { 
      id: 'azure-memory', 
      source: 'azure-thread-memory', 
      target: 'mongodb-memory',
      label: 'Persist context',
      style: { stroke: palette.green.base, strokeWidth: 2 }
    },

    // Split to decisions and patterns
    { 
      id: 'memory-decisions', 
      source: 'mongodb-memory', 
      target: 'mongodb-decisions',
      label: 'Record decisions',
      style: { stroke: palette.yellow.base, strokeWidth: 2 }
    },

    { 
      id: 'decisions-patterns', 
      source: 'mongodb-decisions', 
      target: 'mongodb-patterns',
      label: 'Learn patterns',
      style: { stroke: palette.purple.base, strokeWidth: 2 }
    },

    // Both feed into insights
    { 
      id: 'decisions-insights', 
      source: 'mongodb-decisions', 
      target: 'learning-insights',
      label: 'Generate insights',
      style: { stroke: palette.blue.dark1, strokeWidth: 2 }
    },

    { 
      id: 'patterns-insights', 
      source: 'mongodb-patterns', 
      target: 'learning-insights',
      label: 'Generate insights',
      style: { stroke: palette.blue.dark1, strokeWidth: 2 }
    }
  ], []);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  return (
    <div>
      {/* Memory Architecture Header */}
      <Card style={{ 
        marginBottom: spacing[4], 
        background: `linear-gradient(135deg, ${palette.blue.light3}, ${palette.white})`,
        border: `2px solid ${palette.blue.base}`
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2] }}>
            <Icon glyph="Database" fill={palette.blue.dark2} size={24} />
            <H3 style={{ margin: 0, color: palette.blue.dark2 }}>
              Hybrid Memory Architecture
            </H3>
            <Badge variant="blue" style={{ fontSize: '11px' }}>
              AZURE FOUNDRY + MONGODB ATLAS
            </Badge>
          </div>
          <div style={{ display: 'flex', gap: spacing[2] }}>
            <Button 
              size="small"
              variant="default"
              onClick={fitViewManually}
              leftGlyph={<Icon glyph="Refresh" />}
            >
              Fit Layout
            </Button>
            <Button 
              size="small"
              variant="default"
              onClick={toggleFullscreen}
              leftGlyph={<Icon glyph={isFullscreen ? "XWithCircle" : "NavExpand"} />}
            >
              {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            </Button>
          </div>
        </div>

        {/* Memory Stats Overview */}
        <div style={{ 
          marginTop: spacing[3],
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', 
          gap: spacing[2]
        }}>
          <div style={{ 
            textAlign: 'center', 
            padding: spacing[2], 
            background: palette.white, 
            borderRadius: '8px',
            border: `1px solid ${palette.green.light1}`
          }}>
            <Body weight="bold" style={{ color: palette.green.dark2, fontSize: '20px' }}>
              {overview?.total_memories || 0}
            </Body>
            <Body size="small" style={{ color: palette.gray.dark1 }}>Conversations</Body>
          </div>
          
          <div style={{ 
            textAlign: 'center', 
            padding: spacing[2], 
            background: palette.white, 
            borderRadius: '8px',
            border: `1px solid ${palette.yellow.light1}`
          }}>
            <Body weight="bold" style={{ color: palette.yellow.dark2, fontSize: '20px' }}>
              {overview?.total_decisions || 0}
            </Body>
            <Body size="small" style={{ color: palette.gray.dark1 }}>Decisions</Body>
          </div>
          
          <div style={{ 
            textAlign: 'center', 
            padding: spacing[2], 
            background: palette.white, 
            borderRadius: '8px',
            border: `1px solid ${palette.purple.light1}`
          }}>
            <Body weight="bold" style={{ color: palette.purple.dark2, fontSize: '20px' }}>
              {overview?.total_patterns || 0}
            </Body>
            <Body size="small" style={{ color: palette.gray.dark1 }}>Patterns</Body>
          </div>
        </div>
      </Card>

      {/* Fullscreen Modal */}
      <Modal 
        open={isFullscreen} 
        setOpen={setIsFullscreen}
        size="large"
        key="memory-architecture-fullscreen"
        contentClassName="memory-architecture-fullscreen-modal"
        contentStyle={{ 
          maxWidth: '98vw !important', 
          width: '98vw !important',
          maxHeight: '95vh !important',
          height: '95vh !important',
          margin: '1vh auto !important'
        }}
      >
        <style dangerouslySetInnerHTML={{
          __html: `
            .memory-architecture-fullscreen-modal {
              max-width: 98vw !important;
              width: 98vw !important;
              height: 95vh !important;
              margin: 1vh auto !important;
            }
            .memory-architecture-fullscreen-modal [role="dialog"] {
              max-width: 98vw !important;
              width: 98vw !important;
            }
            .memory-architecture-fullscreen-modal .leafygreen-ui-modal-content {
              max-width: 98vw !important;
              width: 98vw !important;
            }
          `
        }} />
        <div style={{ 
          height: '85vh',
          width: '100%',
          position: 'relative'
        }}>
          {/* Modal Header Controls - inside modal */}
          <div style={{
            position: 'absolute',
            top: 10,
            right: 10,
            display: 'flex',
            gap: spacing[2],
            zIndex: 10,
            background: 'rgba(255, 255, 255, 0.9)',
            borderRadius: '6px',
            padding: spacing[1]
          }}>
            <Button 
              size="small"
              variant="default"
              onClick={fitViewManually}
              leftGlyph={<Icon glyph="Refresh" />}
            >
              Fit Layout
            </Button>
          </div>
          
          {/* Graph Container */}
          <div style={{ 
            height: '100%',
            width: '100%',
            border: `1px solid ${palette.gray.light2}`,
            borderRadius: '8px',
            overflow: 'hidden',
            background: palette.white
          }}>
            <ReactFlow
              key={`memory-flow-fullscreen-${renderKey}`}
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              nodeTypes={nodeTypes}
              fitView
              fitViewOptions={{ 
                padding: 0.1, 
                minZoom: 0.5, 
                maxZoom: 1.0,
                duration: 500
              }}
              minZoom={0.2}
              maxZoom={2.0}
              attributionPosition="bottom-left"
            >
              <Background 
                variant="dots" 
                gap={20} 
                size={1}
                color={palette.gray.light2}
              />
              
              <Controls 
                style={{
                  button: {
                    backgroundColor: palette.white,
                    border: `1px solid ${palette.gray.light2}`,
                    borderRadius: '6px'
                  }
                }}
              />
              
            </ReactFlow>
          </div>
        </div>
      </Modal>

      {/* Regular Memory Architecture Graph */}
      <div style={{ 
        height: '600px',
        width: '100%',
        border: `1px solid ${palette.gray.light2}`,
        borderRadius: '12px',
        overflow: 'hidden',
        background: palette.white,
        display: isFullscreen ? 'none' : 'block'
      }}>
        <ReactFlow
          key={`memory-flow-regular-${renderKey}`}
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ 
            padding: 0.2, 
            minZoom: 0.6, 
            maxZoom: 0.8,
            duration: 500
          }}
          minZoom={0.3}
          maxZoom={1.5}
          attributionPosition="bottom-left"
        >
          <Background 
            variant="dots" 
            gap={20} 
            size={1}
            color={palette.gray.light2}
          />
          
          <Controls 
            style={{
              button: {
                backgroundColor: palette.white,
                border: `1px solid ${palette.gray.light2}`,
                borderRadius: '6px'
              }
            }}
          />
          
        </ReactFlow>
      </div>

      {/* MongoDB Document Views */}
      <div style={{ marginTop: spacing[4] }}>
        <H3 style={{ 
          marginBottom: spacing[3], 
          display: 'flex', 
          alignItems: 'center', 
          gap: spacing[2],
          color: palette.gray.dark3
        }}>
          <Icon glyph="Database" fill={palette.gray.dark2} size={20} />
          MongoDB Collections Data
        </H3>

        {/* Agent Memory Collection */}
        <Card style={{ marginBottom: spacing[3] }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2], marginBottom: spacing[3] }}>
            <Icon glyph="Note" fill={palette.green.base} size={20} />
            <H3 style={{ margin: 0, color: palette.green.dark2 }}>
              agent_memory Collection ({conversations?.length || 0} documents)
            </H3>
            <Badge variant="green" style={{ fontSize: '10px' }}>CONVERSATIONS & CONTEXT</Badge>
          </div>
          
          {conversations && conversations.length > 0 ? (
            <div>
              {conversations.slice(0, 2).map((conversation, index) => (
                <div key={index} style={{ 
                  marginBottom: spacing[2],
                  background: palette.gray.light3,
                  borderRadius: '8px',
                  padding: spacing[3],
                  border: `1px solid ${palette.green.light1}`
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2], marginBottom: spacing[2] }}>
                    <Badge variant="green" style={{ fontSize: '9px' }}>
                      Thread: {conversation.thread_id?.substring(0, 8)}...
                    </Badge>
                    <Badge variant="lightgray" style={{ fontSize: '9px' }}>
                      {new Date(conversation.timestamp || conversation.created_at).toLocaleDateString()}
                    </Badge>
                  </div>
                  <pre style={{ 
                    background: palette.white,
                    padding: spacing[2],
                    borderRadius: '4px',
                    fontSize: '11px',
                    overflow: 'auto',
                    maxHeight: '200px',
                    border: `1px solid ${palette.gray.light2}`
                  }}>
                    {JSON.stringify(conversation, null, 2)}
                  </pre>
                </div>
              ))}
              {conversations.length > 2 && (
                <Body size="small" style={{ 
                  color: palette.gray.dark1, 
                  textAlign: 'center', 
                  fontStyle: 'italic'
                }}>
                  ... and {conversations.length - 2} more documents
                </Body>
              )}
            </div>
          ) : (
            <Body style={{ color: palette.gray.dark1, textAlign: 'center', padding: spacing[4] }}>
              No memory documents yet. Agent conversations will appear here after analysis starts.
            </Body>
          )}
        </Card>

        {/* Agent Decisions Collection */}
        <Card style={{ marginBottom: spacing[3] }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2], marginBottom: spacing[3] }}>
            <Icon glyph="Bulb" fill={palette.yellow.base} size={20} />
            <H3 style={{ margin: 0, color: palette.yellow.dark2 }}>
              agent_decisions Collection ({decisions?.length || 0} documents)
            </H3>
            <Badge variant="yellow" style={{ fontSize: '10px' }}>OUTCOMES & LEARNING</Badge>
          </div>
          
          {decisions && decisions.length > 0 ? (
            <div>
              {decisions.slice(0, 2).map((decision, index) => (
                <div key={index} style={{ 
                  marginBottom: spacing[2],
                  background: palette.gray.light3,
                  borderRadius: '8px',
                  padding: spacing[3],
                  border: `1px solid ${palette.yellow.light1}`
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2], marginBottom: spacing[2] }}>
                    <Badge variant="yellow" style={{ fontSize: '9px' }}>
                      {decision.decision_type || 'FRAUD_ANALYSIS'}
                    </Badge>
                    <Badge variant="lightgray" style={{ fontSize: '9px' }}>
                      {((decision.confidence || 0) * 100).toFixed(1)}% confidence
                    </Badge>
                    <Badge variant="yellow" style={{ fontSize: '9px' }}>
                      {new Date(decision.timestamp || decision.created_at).toLocaleDateString()}
                    </Badge>
                  </div>
                  <pre style={{ 
                    background: palette.white,
                    padding: spacing[2],
                    borderRadius: '4px',
                    fontSize: '11px',
                    overflow: 'auto',
                    maxHeight: '200px',
                    border: `1px solid ${palette.gray.light2}`
                  }}>
                    {JSON.stringify(decision, null, 2)}
                  </pre>
                </div>
              ))}
              {decisions.length > 2 && (
                <Body size="small" style={{ 
                  color: palette.gray.dark1, 
                  textAlign: 'center', 
                  fontStyle: 'italic'
                }}>
                  ... and {decisions.length - 2} more documents
                </Body>
              )}
            </div>
          ) : (
            <Body style={{ color: palette.gray.dark1, textAlign: 'center', padding: spacing[4] }}>
              No decision documents yet. Agent decisions will be recorded here after transaction processing.
            </Body>
          )}
        </Card>

        {/* Agent Patterns Collection */}
        <Card style={{ marginBottom: spacing[3] }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2], marginBottom: spacing[3] }}>
            <Icon glyph="Cloud" fill={palette.purple.base} size={20} />
            <H3 style={{ margin: 0, color: palette.purple.dark2 }}>
              agent_patterns Collection ({patterns?.length || 0} documents)
            </H3>
            <Badge variant="darkgray" style={{ fontSize: '10px' }}>LEARNED INSIGHTS</Badge>
          </div>
          
          {patterns && patterns.length > 0 ? (
            <div>
              {patterns.slice(0, 2).map((pattern, index) => (
                <div key={index} style={{ 
                  marginBottom: spacing[2],
                  background: palette.gray.light3,
                  borderRadius: '8px',
                  padding: spacing[3],
                  border: `1px solid ${palette.purple.light1}`
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2], marginBottom: spacing[2] }}>
                    <Badge variant="darkgray" style={{ fontSize: '9px' }}>
                      {pattern.pattern_type || 'FRAUD_PATTERN'}
                    </Badge>
                    <Badge variant="purple" style={{ fontSize: '9px' }}>
                      {((pattern.confidence || 0) * 100).toFixed(1)}% confidence
                    </Badge>
                    <Badge variant="lightgray" style={{ fontSize: '9px' }}>
                      {pattern.evidence_count || 0} evidence
                    </Badge>
                    <Badge variant="purple" style={{ fontSize: '9px' }}>
                      {new Date(pattern.last_updated || pattern.created_at).toLocaleDateString()}
                    </Badge>
                  </div>
                  <pre style={{ 
                    background: palette.white,
                    padding: spacing[2],
                    borderRadius: '4px',
                    fontSize: '11px',
                    overflow: 'auto',
                    maxHeight: '200px',
                    border: `1px solid ${palette.gray.light2}`
                  }}>
                    {JSON.stringify(pattern, null, 2)}
                  </pre>
                </div>
              ))}
              {patterns.length > 2 && (
                <Body size="small" style={{ 
                  color: palette.gray.dark1, 
                  textAlign: 'center', 
                  fontStyle: 'italic'
                }}>
                  ... and {patterns.length - 2} more documents
                </Body>
              )}
            </div>
          ) : (
            <Body style={{ color: palette.gray.dark1, textAlign: 'center', padding: spacing[4] }}>
              No pattern documents yet. The agent will discover and store patterns as it processes more transactions.
            </Body>
          )}
        </Card>
      </div>
    </div>
  );
};

// Wrap in ReactFlowProvider for proper ReactFlow functionality
const MemoryArchitectureGraphWrapper = (props) => (
  <ReactFlowProvider>
    <MemoryArchitectureGraph {...props} />
  </ReactFlowProvider>
);

export default MemoryArchitectureGraphWrapper;
