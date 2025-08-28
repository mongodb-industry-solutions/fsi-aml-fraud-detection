'use client';

import React, { useCallback, useEffect, useState, useMemo } from 'react';
import ReactFlow, { 
  ReactFlowProvider, 
  Controls, 
  Background, 
  MiniMap, 
  useNodesState, 
  useEdgesState,
  addEdge,
  MarkerType
} from 'reactflow';
import 'reactflow/dist/style.css';

import { palette } from '@leafygreen-ui/palette';
import { spacing } from '@leafygreen-ui/tokens';

// Custom Node Components
import AgentNode from './nodes/AgentNode';
import EnhancedAgentNode from './nodes/EnhancedAgentNode';
import MemoryNode from './nodes/MemoryNode';
import ToolNode from './nodes/ToolNode';
import DecisionNode from './nodes/DecisionNode';

// Custom Edge Components
import EnhancedEdge from './edges/EnhancedEdge';

// Overlay Components
import MessageFlowOverlay from './overlays/MessageFlowOverlay';
import ConsensusOverlay from './overlays/ConsensusOverlay';
import DecisionTreeOverlay from './overlays/DecisionTreeOverlay';
import ConfidenceMetersOverlay from './overlays/ConfidenceMetersOverlay';

// New Glass Box Components
import SequenceDiagramPanel from './panels/SequenceDiagramPanel';
import { useMessageCorrelation } from './managers/MessageCorrelationManager';

// Node types mapping - defined outside component to prevent recreation
const nodeTypes = {
  agentNode: EnhancedAgentNode,
  enhancedAgentNode: EnhancedAgentNode,
  memoryNode: MemoryNode,
  toolNode: ToolNode,
  decisionNode: DecisionNode,
  // Add specific agent types
  manager: EnhancedAgentNode,
  facilitator: EnhancedAgentNode,
  analyzer: EnhancedAgentNode,
  validator: EnhancedAgentNode,
  investigator: EnhancedAgentNode,
  compliance: EnhancedAgentNode,
};

// Edge types mapping - defined outside component to prevent recreation
const edgeTypes = {
  enhanced: EnhancedEdge,
  smoothstep: EnhancedEdge,
  default: EnhancedEdge,
};

// Default edge styles - defined outside component to prevent recreation
const defaultEdgeOptions = {
  animated: false,
  style: { 
    stroke: palette.gray.base,
    strokeWidth: 2 
  },
  markerEnd: {
    type: MarkerType.ArrowClosed,
    color: palette.gray.base,
  },
};

// Minimap node color function - defined outside component
const getMinimapNodeColor = (node) => {
  const typeColors = {
    agentNode: palette.blue.base,
    memoryNode: palette.gray.base,
    toolNode: palette.yellow.dark1,
    decisionNode: palette.red.base
  };
  
  return typeColors[node.type] || palette.gray.base;
};

const OrchestrationCanvas = ({ 
  pattern,
  selectedNode,
  onNodeSelect,
  isSimulationRunning,
  simulationSpeed,
  selectedScenario
}) => {
  // Initialize nodes and edges from pattern
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // Memoize nodeTypes and edgeTypes to prevent recreation warnings
  const memoizedNodeTypes = useMemo(() => nodeTypes, []);
  const memoizedEdgeTypes = useMemo(() => edgeTypes, []);
  const memoizedDefaultEdgeOptions = useMemo(() => defaultEdgeOptions, []);
  const memoizedFitViewOptions = useMemo(() => ({ padding: 0.2 }), []);
  const memoizedSnapGrid = useMemo(() => [20, 20], []);
  const memoizedControlsStyle = useMemo(() => ({
    button: {
      backgroundColor: palette.white,
      border: `1px solid ${palette.gray.light2}`,
      borderRadius: '6px'
    }
  }), []);
  const memoizedMinimapStyle = useMemo(() => ({
    backgroundColor: palette.gray.light3,
    border: `1px solid ${palette.gray.light2}`,
    borderRadius: '8px'
  }), []);
  const memoizedContainerStyle = useMemo(() => ({
    width: '100%', 
    height: '600px',
    border: `1px solid ${palette.gray.light2}`,
    borderRadius: '12px',
    overflow: 'hidden',
    background: palette.white
  }), []);

  // Memoized callback functions to prevent recreation
  const memoizedOnMessageComplete = useCallback((message) => {
    console.log('Message completed:', message);
  }, []);

  const memoizedOnConsensusUpdate = useCallback((consensus) => {
    console.log('Consensus update:', consensus);
  }, []);

  const memoizedOnDecisionUpdate = useCallback((decision) => {
    console.log('Decision update:', decision);
  }, []);

  const memoizedOnConfidenceUpdate = useCallback((confidence) => {
    console.log('Confidence update:', confidence);
  }, []);

  // Initialize message correlation system
  const messageCorrelation = useMessageCorrelation();

  // Enhanced node click handler with correlation
  const enhancedOnNodeClick = useCallback((event, node) => {
    event.stopPropagation();
    onNodeSelect?.(node.data);
    messageCorrelation.handleNodeSelection(node.id);
  }, [onNodeSelect, messageCorrelation]);

  // Clear messages when simulation stops
  useEffect(() => {
    if (!isSimulationRunning) {
      messageCorrelation.clearMessages();
    }
  }, [isSimulationRunning, messageCorrelation]);

  // Update node highlighting separately to avoid infinite loops
  useEffect(() => {
    if (nodes.length > 0) {
      const highlightedNodeIds = Array.from(messageCorrelation.highlightedNodes);
      
      setNodes(currentNodes => 
        currentNodes.map(node => ({
          ...node,
          data: {
            ...node.data,
            highlighted: highlightedNodeIds.includes(node.id)
          }
        }))
      );
    }
  }, [messageCorrelation.selectedAgent, messageCorrelation.selectedMessage, setNodes]);

  // Update nodes when pattern changes
  useEffect(() => {
    if (pattern?.agents) {
      // Transform agent data to ReactFlow node format
      const flowNodes = pattern.agents.map(agent => ({
        id: agent.id,
        type: getNodeType(agent.type),
        position: agent.position,
        data: {
          ...agent,
          isSelected: selectedNode === agent.id,
          highlighted: false // Will be updated by separate effect
        },
        style: getNodeStyle(agent.type, agent.status)
      }));
      
      setNodes(flowNodes);
    }
  }, [pattern, selectedNode, setNodes]);

  // Update edges when pattern changes
  useEffect(() => {
    if (pattern?.connections) {
      const flowEdges = pattern.connections.map(connection => ({
        id: connection.id,
        source: connection.source,
        target: connection.target,
        type: 'smoothstep',
        animated: connection.animated || false,
        label: connection.label,
        style: {
          ...defaultEdgeOptions.style,
          ...connection.style,
          ...(connection.type === 'control' && { stroke: palette.blue.base }),
          ...(connection.type === 'data' && { stroke: palette.green.base }),
          ...(connection.type === 'memory' && { stroke: palette.yellow.base }),
          ...(connection.type === 'debate' && { stroke: palette.red.base, strokeDasharray: '5,5' }),
        },
        markerEnd: {
          ...defaultEdgeOptions.markerEnd,
          color: connection.style?.stroke || palette.gray.base
        }
      }));
      
      setEdges(flowEdges);
    }
  }, [pattern, setEdges]);

  // Simulation updates - disabled to prevent continuous re-renders
  // Only overlays handle simulation when explicitly started
  // useEffect(() => {
  //   if (!isSimulationRunning) return;
  //   // ... simulation code disabled
  // }, [isSimulationRunning, simulationSpeed, setNodes]);

  // Node click handler
  const onNodeClick = useCallback((event, node) => {
    event.stopPropagation();
    onNodeSelect?.(node.data);
  }, [onNodeSelect]);

  // Connection handler (for future interactive features)
  const onConnect = useCallback((params) => {
    const newEdge = {
      ...params,
      ...defaultEdgeOptions,
      id: `edge-${params.source}-${params.target}`,
      type: 'smoothstep'
    };
    setEdges((eds) => addEdge(newEdge, eds));
  }, [setEdges]);

  // Canvas click handler (deselect nodes)
  const onPaneClick = useCallback(() => {
    onNodeSelect?.(null);
  }, [onNodeSelect]);

  return (
    <div style={memoizedContainerStyle}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={enhancedOnNodeClick}
        onPaneClick={onPaneClick}
        nodeTypes={memoizedNodeTypes}
        edgeTypes={memoizedEdgeTypes}
        defaultEdgeOptions={memoizedDefaultEdgeOptions}
        fitView
        fitViewOptions={memoizedFitViewOptions}
        minZoom={0.2}
        maxZoom={2}
        snapToGrid
        snapGrid={memoizedSnapGrid}
        attributionPosition="bottom-left"
      >
        <Background 
          variant="dots" 
          gap={20} 
          size={1}
          color={palette.gray.light2}
        />
        
        <Controls 
          style={memoizedControlsStyle}
        />
        
        <MiniMap
          nodeStrokeColor={getMinimapNodeColor}
          nodeColor={getMinimapNodeColor}
          nodeBorderRadius={8}
          pannable
          zoomable
          style={memoizedMinimapStyle}
        />
      </ReactFlow>
      
      {/* Real-time collaboration overlays */}
      {isSimulationRunning && (
        <>
          <MessageFlowOverlay
            nodes={nodes}
            edges={edges}
            isSimulationRunning={isSimulationRunning}
            simulationSpeed={simulationSpeed}
            onMessageComplete={memoizedOnMessageComplete}
            messageCorrelationManager={messageCorrelation}
          />
          
          <ConsensusOverlay
            nodes={nodes}
            edges={edges}
            isSimulationRunning={isSimulationRunning}
            selectedScenario={selectedScenario}
            onConsensusUpdate={memoizedOnConsensusUpdate}
          />
          
          <DecisionTreeOverlay
            nodes={nodes}
            isSimulationRunning={isSimulationRunning}
            selectedScenario={selectedScenario}
            onDecisionUpdate={memoizedOnDecisionUpdate}
          />
          
          <ConfidenceMetersOverlay
            nodes={nodes}
            isSimulationRunning={isSimulationRunning}
            simulationSpeed={simulationSpeed}
            onConfidenceUpdate={memoizedOnConfidenceUpdate}
          />
        </>
      )}

      {/* Glass Box Enhancement: Sequence Diagram Panel */}
      <SequenceDiagramPanel
        nodes={nodes}
        messages={messageCorrelation.messageHistory}
        isSimulationRunning={isSimulationRunning}
        selectedAgent={messageCorrelation.selectedAgent}
        selectedMessage={messageCorrelation.selectedMessage}
        onAgentSelect={messageCorrelation.handleNodeSelection}
        onMessageSelect={messageCorrelation.handleMessageSelection}
      />
    </div>
  );
};

// Utility functions
function getNodeType(agentType) {
  switch (agentType) {
    case 'manager':
      return 'manager';
    case 'facilitator':
      return 'facilitator';
    case 'analyzer':
      return 'analyzer';
    case 'validator':
      return 'validator';
    case 'investigator':
      return 'investigator';
    case 'compliance':
      return 'compliance';
    case 'memory':
      return 'memoryNode';
    case 'tool':
      return 'toolNode';
    case 'decision':
      return 'decisionNode';
    default:
      return 'agentNode';
  }
}

function getNodeStyle(type, status) {
  const baseStyle = {
    padding: 0,
    borderRadius: '12px',
    border: '2px solid',
    background: palette.white,
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  };

  // Type-specific colors
  const typeColors = {
    manager: palette.blue.base,
    facilitator: palette.blue.base,
    analyzer: palette.green.base,
    validator: palette.yellow.base,
    investigator: palette.red.base,
    compliance: palette.red.dark1,
    memory: palette.gray.base,
    tool: palette.yellow.dark1,
    decision: palette.red.base
  };

  // Status-specific effects
  const statusEffects = {
    active: { borderColor: typeColors[type], background: palette.white },
    processing: { 
      borderColor: typeColors[type], 
      background: `linear-gradient(135deg, ${palette.white}, ${palette.blue.light3})`,
      boxShadow: `0 0 20px ${typeColors[type]}40`
    },
    idle: { 
      borderColor: palette.gray.light1, 
      background: palette.gray.light3 
    },
    complete: { 
      borderColor: palette.green.base, 
      background: `linear-gradient(135deg, ${palette.white}, ${palette.green.light3})`
    },
    backtracking: { 
      borderColor: palette.yellow.base, 
      background: `linear-gradient(135deg, ${palette.white}, ${palette.yellow.light3})`
    },
    error: { 
      borderColor: palette.red.base, 
      background: `linear-gradient(135deg, ${palette.white}, ${palette.red.light3})`
    }
  };

  return {
    ...baseStyle,
    ...statusEffects[status] || statusEffects.idle
  };
}


// Wrap with ReactFlowProvider for context
const OrchestrationCanvasWrapper = (props) => (
  <ReactFlowProvider>
    <OrchestrationCanvas {...props} />
  </ReactFlowProvider>
);

export default OrchestrationCanvasWrapper;