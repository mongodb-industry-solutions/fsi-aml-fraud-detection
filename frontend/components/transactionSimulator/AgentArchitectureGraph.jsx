"use client";

import React, { useMemo, useCallback, useState, useEffect } from 'react';
import ReactFlow, { 
  ReactFlowProvider, 
  Controls, 
  Background, 
  MiniMap,
  useNodesState, 
  useEdgesState,
  useReactFlow
} from 'reactflow';
import 'reactflow/dist/style.css';

import Card from '@leafygreen-ui/card';
import Icon from '@leafygreen-ui/icon';
import Badge from '@leafygreen-ui/badge';
import Button from '@leafygreen-ui/button';
import Modal from '@leafygreen-ui/modal';
import { Body, H3, H2 } from '@leafygreen-ui/typography';
import { palette } from '@leafygreen-ui/palette';
import { spacing } from '@leafygreen-ui/tokens';

// Custom Node Components
import InputNode from './graph/nodes/InputNode';
import StageNode from './graph/nodes/StageNode';
import DecisionNode from './graph/nodes/DecisionNode';
import AgentNode from './graph/nodes/AgentNode';
import ToolNode from './graph/nodes/ToolNode';
import OutcomeNode from './graph/nodes/OutcomeNode';

/**
 * Agent Architecture Graph Component
 * 
 * Interactive decision tree visualization showing all possible paths
 * through the fraud detection system with path highlighting.
 */
const AgentArchitectureGraph = ({
  loading = false,
  agentResults = null,
  processingStage = '',
  stage1Result = null,
  stage2Progress = null,
  transactionData = null
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [reactFlowInstance, setReactFlowInstance] = useState(null);
  const [renderKey, setRenderKey] = useState(0);

  const toggleFullscreen = useCallback(() => {
    setIsFullscreen(prev => !prev);
    // Force re-render of ReactFlow when toggling fullscreen
    setRenderKey(prev => prev + 1);
  }, []);

  const fitViewManually = useCallback(() => {
    if (reactFlowInstance) {
      reactFlowInstance.fitView({
        padding: isFullscreen ? 0.08 : 0.15,
        minZoom: isFullscreen ? 0.3 : 0.4,
        maxZoom: isFullscreen ? 1.2 : 1.2,
        duration: 300
      });
    }
  }, [reactFlowInstance, isFullscreen]);

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

  // Refit view when fullscreen state changes
  useEffect(() => {
    if (reactFlowInstance) {
      // Longer delay to ensure DOM and modal have fully updated
      setTimeout(() => {
        fitViewManually();
      }, 300);
    }
  }, [isFullscreen, reactFlowInstance, fitViewManually]);

  // Force re-render when exiting fullscreen
  useEffect(() => {
    if (!isFullscreen && reactFlowInstance) {
      // Additional delay when exiting fullscreen to ensure proper container sizing
      setTimeout(() => {
        reactFlowInstance.fitView({
          padding: 0.15,
          minZoom: 0.4,
          maxZoom: 1.2,
          duration: 500
        });
      }, 100);
    }
  }, [isFullscreen, reactFlowInstance]);

  // Node types mapping
  const nodeTypes = useMemo(() => ({
    input: InputNode,
    stage: StageNode,
    decision: DecisionNode,
    agent: AgentNode,
    tool: ToolNode,
    outcome: OutcomeNode
  }), []);

  // Calculate decision path based on current state
  const getDecisionPath = useCallback(() => {
    const path = ['input', 'stage1', 'ml-decision'];
    
    if (!loading && agentResults) {
      // Analysis completed - show actual path taken
      path.push('stage1-decision');
      
      if (agentResults.stage_completed === 2) {
        path.push('stage2', 'primary-agent', 'patterns-tool');
        
        // Add tools based on what was likely used
        if (agentResults.reasoning?.includes('similar')) {
          path.push('similarity-tool');
        }
        if (agentResults.reasoning?.includes('network')) {
          path.push('network-tool');
        }
        if (agentResults.reasoning?.includes('sanctions')) {
          path.push('sanctions-tool');
        }
        if (agentResults.reasoning?.includes('SAR') || agentResults.reasoning?.includes('suspicious')) {
          path.push('connected-agent', 'file-search-tool', 'code-interpreter-tool');
        }
        
        path.push('final-decision');
      }
      
      // Add final outcome
      const decision = agentResults.decision?.toLowerCase();
      if (decision === 'approve') path.push('outcome-approve');
      else if (decision === 'investigate') path.push('outcome-investigate');
      else if (decision === 'escalate') path.push('outcome-escalate');
      else if (decision === 'block') path.push('outcome-block');
      
    } else if (loading) {
      // Analysis in progress - show current stage
      path.push('stage1-decision');
      if (processingStage || stage2Progress) {
        path.push('stage2', 'primary-agent', 'patterns-tool');
        
        if (processingStage?.includes('similar')) {
          path.push('similarity-tool');
        }
        if (processingStage?.includes('network')) {
          path.push('network-tool');
        }
        if (processingStage?.includes('sanctions')) {
          path.push('sanctions-tool');
        }
        if (processingStage?.includes('SuspiciousReports')) {
          path.push('connected-agent', 'file-search-tool', 'code-interpreter-tool');
        }
      }
    }
    
    return new Set(path);
  }, [loading, agentResults, processingStage, stage2Progress]);

  const activePath = getDecisionPath();

  // Define all nodes in the decision tree with improved spacing and layout
  const getNodePosition = (baseX, baseY) => {
    // Scale positions for fullscreen to provide better spacing
    const scale = isFullscreen ? 1.4 : 1;
    return { x: baseX * scale, y: baseY * scale };
  };

  const initialNodes = useMemo(() => [
    // Input
    {
      id: 'input',
      type: 'input',
      position: getNodePosition(500, 50),
      data: { 
        label: 'Transaction Input',
        transactionData,
        isActive: false,
        isCompleted: true
      }
    },
    
    // Stage 1 - Using different color (yellow)
    {
      id: 'stage1',
      type: 'stage',
      position: getNodePosition(500, 200),
      data: { 
        label: 'Stage 1: Rules + ML',
        description: 'Pattern matching & risk scoring',
        stage: 1,
        color: 'yellow', // Different color for Stage 1
        isActive: false,
        isCompleted: true
      }
    },
    
    // ML Decision Node (Databricks via Azure MLflow)
    {
      id: 'ml-decision',
      type: 'tool',
      position: getNodePosition(700, 300),
      data: { 
        label: 'ML Risk Scoring',
        description: 'Databricks via Azure MLflow',
        priority: 'Real-time inference',
        color: 'red', // Databricks orange/red color
        isActive: false,
        isCompleted: true,
        isMLNode: true
      }
    },
    
    // Stage 1 Decision Point
    {
      id: 'stage1-decision',
      type: 'decision',
      position: getNodePosition(500, 370),
      data: { 
        label: 'Risk Score Decision',
        thresholds: ['< 25: Auto-Approve', '25-85: AI Analysis', '> 85: Auto-Block'],
        isActive: false,
        isCompleted: true
      }
    },
    
    // Direct outcomes from Stage 1 - wider spacing
    {
      id: 'outcome-auto-approve',
      type: 'outcome',
      position: getNodePosition(150, 540),
      data: { 
        label: 'Auto-Approve',
        decision: 'APPROVE',
        confidence: 85,
        stage: 1,
        isActive: activePath.has('outcome-auto-approve'),
        isCompleted: activePath.has('outcome-auto-approve') && agentResults
      }
    },
    
    {
      id: 'outcome-auto-block',
      type: 'outcome',
      position: getNodePosition(850, 540),
      data: { 
        label: 'Auto-Block',
        decision: 'BLOCK',
        confidence: 90,
        stage: 1,
        isActive: activePath.has('outcome-auto-block'),
        isCompleted: activePath.has('outcome-auto-block') && agentResults
      }
    },
    
    // Stage 2
    {
      id: 'stage2',
      type: 'stage',
      position: getNodePosition(500, 540),
      data: { 
        label: 'Stage 2: AI Analysis',
        description: 'Vector search & agent reasoning',
        stage: 2,
        color: 'blue', // Keep blue for Stage 2
        isActive: false, // activePath.has('stage2'),
        isCompleted: true
      }
    },
    
    // Primary Agent
    {
      id: 'primary-agent',
      type: 'agent',
      position: getNodePosition(500, 710),
      data: { 
        label: 'Primary Fraud Agent',
        model: 'GPT-4o',
        description: 'Strategic tool selection & reasoning',
        isActive: false, // activePath.has('primary-agent'),
        isCompleted: true
      }
    },
    
    // Tools - arranged in a wider grid with better spacing
    {
      id: 'patterns-tool',
      type: 'tool',
      position: getNodePosition(200, 880),
              data: { 
          label: 'analyze_transaction_patterns()',
          description: 'Customer baseline analysis',
          priority: 'Always first',
          color: 'purple',
        isActive: false, // activePath.has('patterns-tool'),
        isCompleted: true
      }
    },
    
    {
      id: 'similarity-tool',
      type: 'tool',
      position: getNodePosition(400, 880),
      data: { 
        label: 'search_similar_transactions()',
        description: 'MongoDB Vector Search',
        priority: 'Pattern validation',
        color: 'blue',
        isActive: false, // activePath.has('similarity-tool'),
        isCompleted: true
      }
    },
    
    {
      id: 'network-tool',
      type: 'tool',
      position: getNodePosition(600, 880),
      data: { 
        label: 'calculate_network_risk()',
        description: 'Fraud ring detection',
        priority: 'Anomaly investigation',
        color: 'yellowCustom', // Using custom yellow light color
        isActive: false, // activePath.has('network-tool'),
        isCompleted: true
      }
    },
    
    {
      id: 'sanctions-tool',
      type: 'tool',
      position: getNodePosition(800, 880),
      data: { 
        label: 'check_sanctions_lists()',
        description: 'AML compliance check',
        priority: 'Regulatory screening',
        color: 'yellow', // Keep yellow as it's distinct
        isActive: false, // activePath.has('sanctions-tool'),
        isCompleted: true
      }
    },
    
    // Connected Agent (when triggered) - better positioning
    {
      id: 'connected-agent',
      type: 'agent',
      position: getNodePosition(1200, 710),
      data: { 
        label: 'Report Agent',
        model: 'GPT-4-mini',
        description: 'Historical SAR analysis',
        isActive: false, // activePath.has('connected-agent'),
        isCompleted: activePath.has('connected-agent') && agentResults,
        isConnected: true
      }
    },
    
    // Connected Agent Tools - using proper LeafyGreen colors
    {
      id: 'file-search-tool',
      type: 'tool',
      position: getNodePosition(1100, 880),
      data: { 
        label: 'File Search',
        description: 'Historical SAR files',
        priority: 'Enterprise knowledge',
        color: 'purple', // Using purple for enterprise tools
        isActive: false, // activePath.has('file-search-tool'),
        isCompleted: true,
        isBuiltIn: true
      }
    },
    
    {
      id: 'code-interpreter-tool',
      type: 'tool',
      position: getNodePosition(1300, 880),
      data: { 
        label: 'Code Interpreter',
        description: 'Statistical analysis',
        priority: 'Pattern computation',
        color: 'blue', // Using blue for computation tools
        isActive: false, // activePath.has('code-interpreter-tool'),
        isCompleted: true,
        isBuiltIn: true
      }
    },
    
    // Final Decision Point
    {
      id: 'final-decision',
      type: 'decision',
      position: getNodePosition(500, 1050),
      data: { 
        label: 'AI Decision Synthesis',
        thresholds: ['< 40: Approve', '40-65: Investigate', '65-85: Escalate', '≥ 85: Block'],
        isActive: false, // activePath.has('final-decision'),
        isCompleted: true
      }
    },
    
    // Final Outcomes - wider spacing
    {
      id: 'outcome-approve',
      type: 'outcome',
      position: getNodePosition(150, 1220),
      data: { 
        label: 'AI-Approve',
        decision: 'APPROVE',
        confidence: agentResults?.confidence ? Math.round(agentResults.confidence * 100) : 82,
        stage: 2,
        isActive: false, // activePath.has('outcome-approve'),
        isCompleted: agentResults?.decision === 'APPROVE'
      }
    },
    
    {
      id: 'outcome-investigate',
      type: 'outcome',
      position: getNodePosition(350, 1220),
      data: { 
        label: 'AI-Investigate',
        decision: 'INVESTIGATE',
        confidence: agentResults?.confidence ? Math.round(agentResults.confidence * 100) : 70,
        stage: 2,
        isActive: false, // activePath.has('outcome-investigate'),
        isCompleted: agentResults?.decision === 'INVESTIGATE'
      }
    },
    
    {
      id: 'outcome-escalate',
      type: 'outcome',
      position: getNodePosition(650, 1220),
      data: { 
        label: 'AI-Escalate',
        decision: 'ESCALATE',
        confidence: agentResults?.confidence ? Math.round(agentResults.confidence * 100) : 85,
        stage: 2,
        isActive: false, // activePath.has('outcome-escalate'),
        isCompleted: agentResults?.decision === 'ESCALATE'
      }
    },
    
    {
      id: 'outcome-block',
      type: 'outcome',
      position: getNodePosition(850, 1220),
      data: { 
        label: 'AI-Block',
        decision: 'BLOCK',
        confidence: agentResults?.confidence ? Math.round(agentResults.confidence * 100) : 88,
        stage: 2,
        isActive: false, // activePath.has('outcome-block'),
        isCompleted: agentResults?.decision === 'BLOCK'
      }
    }
  ], [activePath, agentResults, loading, processingStage, stage2Progress, transactionData, isFullscreen]);

  // Define edges (connections between nodes)
  const initialEdges = useMemo(() => [
    // Main flow
    { id: 'input-stage1', source: 'input', target: 'stage1', animated: activePath.has('stage1') },
    { id: 'stage1-ml', source: 'stage1', target: 'ml-decision', animated: activePath.has('ml-decision'), sourceHandle: 'right', targetHandle: 'left' },
    { id: 'stage1-decision', source: 'stage1', target: 'stage1-decision', animated: activePath.has('stage1-decision') },
    
    // Stage 1 outcomes
    { id: 'decision-auto-approve', source: 'stage1-decision', target: 'outcome-auto-approve', label: '< 25', style: { opacity: activePath.has('outcome-auto-approve') ? 1 : 0.3, fontSize: '16px', fontWeight: 'bold' } },
    { id: 'decision-auto-block', source: 'stage1-decision', target: 'outcome-auto-block', label: '> 85', style: { opacity: activePath.has('outcome-auto-block') ? 1 : 0.3, fontSize: '16px', fontWeight: 'bold' } },
    
    // Stage 2 flow
    { id: 'decision-stage2', source: 'stage1-decision', target: 'stage2', label: '25-85', animated: activePath.has('stage2'), style: { fontSize: '16px', fontWeight: 'bold' } },
    { id: 'stage2-agent', source: 'stage2', target: 'primary-agent', animated: activePath.has('primary-agent') },
    
    // Tool connections
    { id: 'agent-patterns', source: 'primary-agent', target: 'patterns-tool', animated: true },
    { id: 'agent-similarity', source: 'primary-agent', target: 'similarity-tool', animated: true },
    { id: 'agent-network', source: 'primary-agent', target: 'network-tool', animated: true },
    { id: 'agent-sanctions', source: 'primary-agent', target: 'sanctions-tool', animated: true },
    
    // Connected agent
    { id: 'agent-connected', source: 'primary-agent', target: 'connected-agent', animated: true },
    { id: 'connected-file', source: 'connected-agent', target: 'file-search-tool', animated: true },
    { id: 'connected-code', source: 'connected-agent', target: 'code-interpreter-tool', animated: true },
    
    // Final decision
    { id: 'agent-decision', source: 'primary-agent', target: 'final-decision', animated: true },
    
    // Final outcomes
    { id: 'final-approve', source: 'final-decision', target: 'outcome-approve', label: '< 40', style: { opacity: activePath.has('outcome-approve') ? 1 : 0.3, fontSize: '16px', fontWeight: 'bold' }, animated: activePath.has('outcome-approve') },
    { id: 'final-investigate', source: 'final-decision', target: 'outcome-investigate', label: '40-65', style: { opacity: activePath.has('outcome-investigate') ? 1 : 0.3, fontSize: '16px', fontWeight: 'bold' }, animated: activePath.has('outcome-investigate') },
    { id: 'final-escalate', source: 'final-decision', target: 'outcome-escalate', label: '65-85', style: { opacity: activePath.has('outcome-escalate') ? 1 : 0.3, fontSize: '16px', fontWeight: 'bold' }, animated: activePath.has('outcome-escalate') },
    { id: 'final-block', source: 'final-decision', target: 'outcome-block', label: '≥ 85', style: { opacity: activePath.has('outcome-block') ? 1 : 0.3, fontSize: '16px', fontWeight: 'bold' }, animated: activePath.has('outcome-block') }
  ], [activePath]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Decision Summary Component (shown when analysis is complete)
  const DecisionSummary = () => {
    if (!agentResults) return null;
    
    const getDecisionColor = (decision) => {
      switch (decision?.toLowerCase()) {
        case 'approve': return palette.green.base;
        case 'investigate': return palette.yellow.base;
        case 'escalate': return palette.red.base;
        case 'block': return palette.red.base;
        default: return palette.gray.base;
      }
    };

    const getDecisionIcon = (decision) => {
      switch (decision?.toLowerCase()) {
        case 'approve': return 'Checkmark';
        case 'investigate': return 'MagnifyingGlass';
        case 'escalate': return 'Warning';
        case 'block': return 'X';
        default: return 'Clock';
      }
    };

    return (
      <Card style={{ 
        marginBottom: spacing[3],
        padding: `${spacing[3]}px ${spacing[3]}px`,
        background: `linear-gradient(135deg, ${getDecisionColor(agentResults.decision)}15, ${palette.white})`,
        border: `2px solid ${getDecisionColor(agentResults.decision)}`,
        display: 'flex',
        alignItems: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2], width: '100%' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            background: getDecisionColor(agentResults.decision),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Icon 
              glyph={getDecisionIcon(agentResults.decision)}
              fill={palette.white}
              size={18}
            />
          </div>
          <div style={{ flex: 1 }}>
            <H2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: spacing[2] }}>
              Agent Decision: {agentResults.decision}
              <Badge variant="lightgray" style={{ fontSize: '12px' }}>
                Stage {agentResults.stage_completed} Complete
              </Badge>
            </H2>

          </div>
        </div>
      </Card>
    );
  };

  return (
    <div>
      {/* Global styles for fullscreen modal */}
      <style dangerouslySetInnerHTML={{
        __html: `
          .agent-architecture-fullscreen-modal {
            max-width: 98vw !important;
            width: 98vw !important;
            height: 95vh !important;
            margin: 1vh auto !important;
          }
          .agent-architecture-fullscreen-modal [role="dialog"] {
            max-width: 98vw !important;
            width: 98vw !important;
          }
          .agent-architecture-fullscreen-modal .leafygreen-ui-modal-content {
            max-width: 98vw !important;
            width: 98vw !important;
          }
        `
      }} />
      
      {/* Decision Summary (when complete) */}
      <DecisionSummary />
      
      {/* Architecture Header with Fullscreen Button */}
      <Card style={{ 
        marginBottom: spacing[3], 
        padding: `${spacing[3]}px ${spacing[3]}px`,
        background: `linear-gradient(135deg, ${palette.blue.light3}, ${palette.white})`,
        border: `2px solid ${palette.blue.base}`,
        display: 'flex',
        alignItems: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2] }}>
            <Icon glyph="Diagram" fill={palette.blue.dark2} size={24} />
            <H3 style={{ margin: 0, color: palette.blue.dark2 }}>
              Fraud Detection Decision Tree
            </H3>
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
      </Card>

      {/* Fullscreen Modal */}
      <Modal 
        open={isFullscreen} 
        setOpen={setIsFullscreen}
        key="agent-architecture-fullscreen"
        size="large"
        contentClassName="agent-architecture-fullscreen-modal"
        contentStyle={{ 
          maxWidth: '98vw !important', 
          width: '98vw !important',
          maxHeight: '95vh !important',
          height: '95vh !important',
          margin: '1vh auto !important'
        }}
      >
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
            height: '85vh',
            width: '100%',
            border: `1px solid ${palette.gray.light2}`,
            borderRadius: '8px',
            overflow: 'hidden',
            background: palette.white,
            position: 'relative'
          }}>
            <ReactFlow
              key={`agent-flow-fullscreen-${renderKey}`}
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              nodeTypes={nodeTypes}
              onInit={setReactFlowInstance}
              fitView
              fitViewOptions={{ 
                padding: 0.05, 
                minZoom: 0.2, 
                maxZoom: 1.5,
                duration: 300
              }}
              minZoom={0.2}
              maxZoom={2.0}
              attributionPosition="bottom-left"
              style={{ width: '100%', height: '100%' }}
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

      {/* Regular Decision Tree Graph */}
      {!isFullscreen && (
        <div style={{ 
          height: '800px',
          width: '100%',
          border: `1px solid ${palette.gray.light2}`,
          borderRadius: '12px',
          overflow: 'hidden',
          background: palette.white,
          position: 'relative'
        }}>
            <ReactFlow
              key={`agent-flow-regular-${renderKey}`}
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              nodeTypes={nodeTypes}
              onInit={setReactFlowInstance}
              fitView
              fitViewOptions={{ 
                padding: 0.1, 
                minZoom: 0.3, 
                maxZoom: 1.2,
                duration: 300
              }}
              minZoom={0.3}
              maxZoom={1.5}
              attributionPosition="bottom-left"
              style={{ width: '100%', height: '100%' }}
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
          
          
          <MiniMap
            nodeStrokeColor={() => palette.gray.base}
            nodeColor={() => palette.blue.light2}
            nodeBorderRadius={8}
            pannable
            zoomable
            style={{
              backgroundColor: palette.gray.light3,
              border: `1px solid ${palette.gray.light2}`,
              borderRadius: '8px'
            }}
          />
          </ReactFlow>
        </div>
      )}
    </div>
  );
};

// Wrap in ReactFlowProvider
const AgentArchitectureGraphWrapper = (props) => (
  <ReactFlowProvider>
    <AgentArchitectureGraph {...props} />
  </ReactFlowProvider>
);

export default AgentArchitectureGraphWrapper;
