/**
 * NetworkGraphComponent.jsx
 * 
 * Interactive network visualization using Reagraph for entity relationships
 * Optimized for AML/KYC entity network analysis with beautiful, performant rendering
 */

import React, { useMemo, useCallback, useState } from 'react';
import { GraphCanvas } from 'reagraph';
import { palette } from '@leafygreen-ui/palette';
import { Body, H3 } from '@leafygreen-ui/typography';

const NetworkGraphComponent = ({ 
  networkData, 
  onNodeClick, 
  onEdgeClick,
  centerNodeId,
  className = '',
  style = {}
}) => {
  const [selectedNodes, setSelectedNodes] = useState([]);
  const [camera, setCamera] = useState({ x: 0, y: 0, z: 50 });

  // Enhanced risk level to color mapping with gradients
  const getRiskColor = useCallback((riskLevel, riskScore) => {
    const level = riskLevel?.toLowerCase() || 'unknown';
    const score = riskScore || 0;
    
    // Base color mapping with gradient variations based on score
    switch (level) {
      case 'high':
        return score > 80 ? '#C62D42' : // Critical
               score > 70 ? palette.red.base : // High
               '#E85D75'; // High-Medium
      case 'medium':
        return score > 60 ? '#F39C12' : // High-Medium
               score > 40 ? palette.yellow.base : // Medium
               '#F7DC6F'; // Low-Medium
      case 'low':
        return score > 20 ? '#58D68D' : // Medium-Low
               palette.green.base; // Low
      case 'critical':
        return '#8B0000'; // Dark red for critical entities
      case 'minimal':
        return '#2ECC71'; // Bright green for minimal risk
      default:
        return palette.gray.base;
    }
  }, []);

  // Enhanced node size calculation based on multiple factors
  const calculateNodeSize = useCallback((node) => {
    const { riskScore = 0, label = '', centrality = 0, connections = 0, entityType = '' } = node;
    
    // Base size calculation
    const textLength = label.length;
    const baseSize = Math.max(30, Math.min(50, textLength * 2.2));
    
    // Risk-based size adjustment (0-20 additional pixels)
    const riskAdjustment = (riskScore / 100) * 20;
    
    // Centrality-based adjustment (0-15 additional pixels)
    const centralityAdjustment = (centrality || 0) * 15;
    
    // Connection-based adjustment (high connectivity = larger nodes)
    const connectionAdjustment = Math.min(10, (connections || 0) * 2);
    
    // Entity type adjustment
    const typeAdjustment = entityType === 'organization' ? 5 : 0;
    
    const finalSize = baseSize + riskAdjustment + centralityAdjustment + connectionAdjustment + typeAdjustment;
    return Math.max(25, Math.min(80, finalSize));
  }, []);

  // Get enhanced visual styling for nodes based on risk assessment
  const getNodeStyling = useCallback((node) => {
    const { riskLevel, riskScore = 0, entityType, verified = true } = node;
    const riskColor = getRiskColor(riskLevel, riskScore);
    
    // Special styling for high-risk entities
    const isHighRisk = riskLevel?.toLowerCase() === 'high' || riskScore > 70;
    const isCriticalRisk = riskLevel?.toLowerCase() === 'critical' || riskScore > 90;
    
    return {
      fill: riskColor,
      stroke: isCriticalRisk ? '#8B0000' : 
              isHighRisk ? '#C62D42' : 
              verified ? '#5C6C7C' : '#F39C12',
      strokeWidth: isCriticalRisk ? 4 : 
                   isHighRisk ? 3 : 
                   2,
      opacity: verified ? 0.95 : 0.75,
      // Add glow effect for high-risk entities
      filter: isCriticalRisk ? 'drop-shadow(0 0 8px #8B0000)' : 
              isHighRisk ? 'drop-shadow(0 0 6px #C62D42)' : 'none'
    };
  }, [getRiskColor]);

  // Get entity type icon
  const getEntityIcon = useCallback((entityType) => {
    const iconMap = {
      'individual': '👤',
      'organization': '🏢',
      'business': '🏢',
      'company': '🏢'
    };
    return iconMap[entityType?.toLowerCase()] || '●';
  }, []);

  // Enhanced relationship type to color mapping with risk-based variations
  const getRelationshipColor = useCallback((relationshipType, confidence = 1, riskWeight = 0) => {
    const type = relationshipType?.toLowerCase() || '';
    
    // Base color mapping for AML relationship types
    const baseColorMap = {
      // Entity Resolution (High confidence relationships)
      'confirmed_same_entity': '#27AE60', // Strong green
      'potential_duplicate': '#E67E22', // Orange
      
      // Corporate Structure (Ownership/Control relationships)
      'director_of': '#3498DB', // Blue
      'ubo_of': '#2E86C1', // Darker blue
      'parent_of_subsidiary': '#5DADE2', // Light blue
      
      // Household Relationships
      'household_member': '#8E44AD', // Purple
      
      // High-Risk Network Relationships
      'business_associate_suspected': '#E74C3C', // Red
      'potential_beneficial_owner_of': '#C0392B', // Dark red
      'transactional_counterparty_high_risk': '#A93226', // Very dark red
      
      // Public/Generic Relationships
      'professional_colleague_public': '#16A085', // Teal
      'social_media_connection_public': '#48C9B0', // Light teal
      
      // Legacy mappings
      'business_associate': palette.blue.base,
      'family_member': palette.purple.base,
      'shared_address': '#00B4B8',
      'shared_identifier': palette.red.base,
      'transaction_counterparty': '#F3922B',
      'corporate_structure': '#89979B'
    };
    
    let baseColor = baseColorMap[type] || '#5C6C7C';
    
    // Adjust color intensity based on confidence and risk
    if (confidence < 0.7) {
      // Lower confidence = more muted colors
      baseColor = baseColor + '80'; // Add transparency
    } else if (riskWeight > 0.7) {
      // High risk weight = more intense/darker colors
      baseColor = baseColor.replace('#', '#').substring(0, 7); // Ensure no transparency
    }
    
    return baseColor;
  }, []);

  // Enhanced edge styling based on relationship properties
  const getEdgeStyling = useCallback((edge) => {
    const { confidence = 1, verified = true, active = true, relationshipType, riskWeight = 0 } = edge;
    
    // Base thickness calculation
    const baseThickness = Math.max(1, Math.min(6, confidence * 5));
    
    // Risk-based thickness adjustment
    const riskAdjustment = riskWeight > 0.7 ? 2 : riskWeight > 0.4 ? 1 : 0;
    const finalThickness = baseThickness + riskAdjustment;
    
    // Color with confidence and risk adjustments
    const edgeColor = getRelationshipColor(relationshipType, confidence, riskWeight);
    
    return {
      fill: edgeColor,
      size: finalThickness,
      opacity: active ? (verified ? 1.0 : 0.6) : 0.4,
      dashed: !verified || !active,
      // Add special effects for high-risk relationships
      filter: riskWeight > 0.8 ? 'drop-shadow(0 0 3px rgba(255,0,0,0.5))' : 'none'
    };
  }, [getRelationshipColor]);

  // Transform backend data to Reagraph format
  const { nodes, edges } = useMemo(() => {
    if (!networkData || !networkData.nodes || !networkData.edges) {
      return { nodes: [], edges: [] };
    }

    console.log('Raw network data for Reagraph:', networkData);

    // Transform nodes for Reagraph with enhanced risk-based styling
    const reagraphNodes = networkData.nodes.map(node => {
      // Format label for display (truncate if too long)
      const displayLabel = node.label.length > 15 
        ? node.label.substring(0, 12) + '...' 
        : node.label;
      
      // Get enhanced node styling
      const nodeStyling = getNodeStyling(node);
      const nodeSize = calculateNodeSize(node);
      
      // Special handling for center node
      const isCenterNode = node.id === centerNodeId;
      
      return {
        id: node.id,
        label: displayLabel,
        data: {
          ...node,
          isCenterNode,
          fullLabel: node.label, // Keep full label for tooltips
          // Enhanced data for analytics
          riskCategory: node.riskScore > 90 ? 'critical' :
                       node.riskScore > 70 ? 'high' :
                       node.riskScore > 40 ? 'medium' : 'low'
        },
        // Enhanced node styling using new functions
        fill: nodeStyling.fill,
        size: nodeSize,
        // Node appearance configuration
        icon: getEntityIcon(node.entityType),
        // Dynamic text styling based on node size and risk
        labelFontSize: Math.max(9, Math.min(16, nodeSize * 0.2)),
        labelColor: '#FFFFFF', // White text for better contrast
        labelFontWeight: node.riskScore > 70 ? 'bold' : '600',
        // Enhanced visual styling with risk-based borders
        stroke: isCenterNode ? '#1C1E21' : nodeStyling.stroke,
        strokeWidth: isCenterNode ? Math.max(4, nodeStyling.strokeWidth + 1) : nodeStyling.strokeWidth,
        opacity: nodeStyling.opacity,
        // Add visual effects for high-risk entities
        filter: nodeStyling.filter,
        // Enhanced hover effects
        labelPosition: nodeSize > 50 ? 'center' : 'bottom'
      };
    });

    // Transform edges for Reagraph with enhanced styling
    const reagraphEdges = networkData.edges.map(edge => {
      // Get enhanced edge styling
      const edgeStyling = getEdgeStyling(edge);
      
      return {
        id: edge.id,
        source: edge.source,
        target: edge.target,
        label: edge.label,
        data: {
          ...edge,
          // Enhanced data for analytics
          confidenceCategory: edge.confidence > 0.8 ? 'high' :
                             edge.confidence > 0.6 ? 'medium' : 'low',
          riskCategory: edge.riskWeight > 0.7 ? 'high' :
                       edge.riskWeight > 0.4 ? 'medium' : 'low'
        },
        // Enhanced edge styling using new functions
        fill: edgeStyling.fill,
        size: edgeStyling.size,
        opacity: edgeStyling.opacity,
        dashed: edgeStyling.dashed,
        filter: edgeStyling.filter,
        // Arrow configuration for bidirectional relationships
        arrow: edge.bidirectional ? 'both' : 'target',
        arrowSize: Math.max(4, edgeStyling.size * 0.8),
        // Dynamic labeling for important relationships
        labelVisible: edge.confidence > 0.8 || edge.riskWeight > 0.7,
        labelFontSize: Math.max(8, Math.min(12, edgeStyling.size + 4)),
        labelColor: '#2C3E50',
        labelBackgroundColor: 'rgba(255,255,255,0.8)',
        labelPadding: 2
      };
    });

    console.log('Transformed nodes:', reagraphNodes.length, reagraphNodes);
    console.log('Transformed edges:', reagraphEdges.length, reagraphEdges);

    return { nodes: reagraphNodes, edges: reagraphEdges };
  }, [networkData, centerNodeId, getRiskColor, calculateNodeSize, getEntityIcon, getRelationshipColor]);

  // Handle node selection
  const handleNodeClick = useCallback((node) => {
    console.log('Node clicked:', node);
    setSelectedNodes([node.id]);
    if (onNodeClick) {
      onNodeClick(node.data || node);
    }
  }, [onNodeClick]);

  // Handle edge selection  
  const handleEdgeClick = useCallback((edge) => {
    console.log('Edge clicked:', edge);
    if (onEdgeClick) {
      onEdgeClick(edge.data || edge);
    }
  }, [onEdgeClick]);

  // Reset camera to fit all nodes
  const handleResetView = useCallback(() => {
    setCamera({ x: 0, y: 0, z: 50 });
  }, []);

  // Focus on center node
  const handleFocusCenter = useCallback(() => {
    if (centerNodeId) {
      const centerNode = nodes.find(n => n.id === centerNodeId);
      if (centerNode) {
        setSelectedNodes([centerNodeId]);
        setCamera({ x: 0, y: 0, z: 30 });
      }
    }
  }, [centerNodeId, nodes]);

  const defaultStyle = useMemo(() => ({
    width: '100%',
    height: '600px',
    border: '1px solid #E8EDEB',
    borderRadius: '8px',
    backgroundColor: '#fafafa',
    position: 'relative',
    ...style
  }), [style]);

  // Show empty state if no data
  if (!networkData || !networkData.nodes || networkData.nodes.length === 0) {
    return (
      <div className={className} style={defaultStyle}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          flexDirection: 'column',
          color: '#5C6C7C'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔍</div>
          <Body>No network data available</Body>
          <Body style={{ color: '#89979B', fontSize: '14px', marginTop: '8px' }}>
            Try adjusting the depth or strength parameters
          </Body>
        </div>
      </div>
    );
  }

  return (
    <div className={className} style={defaultStyle}>
      {/* Graph Canvas */}
      <GraphCanvas
        nodes={nodes}
        edges={edges}
        selections={selectedNodes}
        onNodeClick={handleNodeClick}
        onEdgeClick={handleEdgeClick}
        layoutType="forceDirected2d"
        animated={true}
        draggable={true}
        pannable={true}
        zoomable={true}
      />
      
      {/* Control Panel */}
      <div style={{
        position: 'absolute',
        top: '10px',
        right: '10px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        zIndex: 10
      }}>
        <button
          style={{
            padding: '8px 12px',
            fontSize: '12px',
            backgroundColor: 'white',
            border: '1px solid #E8EDEB',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
          onClick={handleResetView}
        >
          🎯 Reset View
        </button>
        {centerNodeId && (
          <button
            style={{
              padding: '8px 12px',
              fontSize: '12px',
              backgroundColor: 'white',
              border: '1px solid #E8EDEB',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
            onClick={handleFocusCenter}
          >
            🔍 Focus Center
          </button>
        )}
      </div>

      {/* Network Info Panel */}
      {networkData && (
        <div style={{
          position: 'absolute',
          top: '10px',
          left: '10px',
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          padding: '12px',
          borderRadius: '6px',
          border: '1px solid #E8EDEB',
          fontSize: '12px',
          color: '#5C6C7C',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          zIndex: 10
        }}>
          <div><strong>Nodes:</strong> {networkData.totalNodes}</div>
          <div><strong>Edges:</strong> {networkData.totalEdges}</div>
          <div><strong>Max Depth:</strong> {networkData.maxDepthReached}</div>
          {networkData.searchMetadata?.executionTimeMs && (
            <div><strong>Time:</strong> {networkData.searchMetadata.executionTimeMs}ms</div>
          )}
        </div>
      )}

      {/* Enhanced Legend */}
      <div style={{
        position: 'absolute',
        bottom: '10px',
        left: '10px',
        backgroundColor: 'rgba(255, 255, 255, 0.97)',
        padding: '14px',
        borderRadius: '8px',
        border: '1px solid #E8EDEB',
        fontSize: '11px',
        color: '#5C6C7C',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        zIndex: 10,
        maxWidth: '250px',
        minWidth: '220px'
      }}>
        <H3 style={{ fontSize: '13px', marginBottom: '10px', color: '#2C3E50' }}>Risk & Relationship Legend</H3>
        
        {/* Risk Levels */}
        <div style={{ marginBottom: '12px' }}>
          <div style={{ fontSize: '10px', fontWeight: '600', marginBottom: '6px', color: '#34495E' }}>
            Entity Risk Levels
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ 
                width: '14px', 
                height: '14px', 
                borderRadius: '50%', 
                backgroundColor: '#8B0000',
                border: '2px solid #8B0000'
              }}></div>
              <span style={{ fontSize: '10px' }}>Critical Risk (90+)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ 
                width: '12px', 
                height: '12px', 
                borderRadius: '50%', 
                backgroundColor: '#C62D42'
              }}></div>
              <span style={{ fontSize: '10px' }}>High Risk (70-89)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ 
                width: '10px', 
                height: '10px', 
                borderRadius: '50%', 
                backgroundColor: '#F39C12'
              }}></div>
              <span style={{ fontSize: '10px' }}>Medium Risk (40-69)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ 
                width: '8px', 
                height: '8px', 
                borderRadius: '50%', 
                backgroundColor: '#2ECC71'
              }}></div>
              <span style={{ fontSize: '10px' }}>Low Risk (0-39)</span>
            </div>
          </div>
        </div>

        {/* Relationship Types */}
        <div style={{ marginBottom: '12px' }}>
          <div style={{ fontSize: '10px', fontWeight: '600', marginBottom: '6px', color: '#34495E' }}>
            Key Relationship Types
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ 
                width: '16px', 
                height: '2px', 
                backgroundColor: '#A93226'
              }}></div>
              <span style={{ fontSize: '9px' }}>High-Risk Counterparty</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ 
                width: '16px', 
                height: '2px', 
                backgroundColor: '#3498DB'
              }}></div>
              <span style={{ fontSize: '9px' }}>Corporate Structure</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ 
                width: '16px', 
                height: '2px', 
                backgroundColor: '#27AE60'
              }}></div>
              <span style={{ fontSize: '9px' }}>Confirmed Same Entity</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ 
                width: '16px', 
                height: '1px', 
                backgroundColor: '#8E44AD',
                borderStyle: 'dashed',
                borderWidth: '1px 0'
              }}></div>
              <span style={{ fontSize: '9px' }}>Unverified/Inactive</span>
            </div>
          </div>
        </div>

        {/* Visual Guide */}
        <div style={{ fontSize: '9px', color: '#7F8C8D', lineHeight: '1.4' }}>
          <div style={{ marginBottom: '4px' }}>
            💡 <strong>Size</strong>: Risk score + network centrality<br/>
            🔗 <strong>Thickness</strong>: Relationship confidence<br/>
            ⚡ <strong>Glow</strong>: Critical risk entities
          </div>
          <div style={{ fontSize: '8px', color: '#95A5A6' }}>
            Click nodes to navigate • Drag to pan • Scroll to zoom
          </div>
        </div>
      </div>
    </div>
  );
};

export default NetworkGraphComponent;