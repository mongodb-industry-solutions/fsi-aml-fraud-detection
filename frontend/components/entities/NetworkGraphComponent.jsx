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

  // Enhanced node size calculation with prominent centrality factor
  const calculateNodeSize = useCallback((node) => {
    const { riskScore = 0, label = '', centrality = 0, betweenness = 0, connections = 0, entityType = '' } = node;
    
    // Base size calculation
    const textLength = label.length;
    const baseSize = Math.max(35, Math.min(55, textLength * 2.5));
    
    // Centrality-based adjustment (MAJOR FACTOR - 0-25 additional pixels)
    const centralityAdjustment = (centrality || 0) * 25;
    
    // Betweenness centrality bonus (bridge nodes get extra prominence)
    const betweennessBonus = (betweenness || 0) * 15;
    
    // Risk-based size adjustment (0-15 additional pixels)
    const riskAdjustment = (riskScore / 100) * 15;
    
    // Connection-based adjustment (high connectivity = larger nodes)
    const connectionAdjustment = Math.min(12, (connections || 0) * 2);
    
    // Entity type adjustment
    const typeAdjustment = entityType === 'organization' ? 8 : 0;
    
    const finalSize = baseSize + centralityAdjustment + betweennessBonus + riskAdjustment + connectionAdjustment + typeAdjustment;
    return Math.max(30, Math.min(100, finalSize)); // Increased max size for high centrality nodes
  }, []);

  // Get enhanced visual styling for nodes with centrality prominence
  const getNodeStyling = useCallback((node) => {
    const { riskLevel, riskScore = 0, entityType, verified = true, centrality = 0, betweenness = 0 } = node;
    const riskColor = getRiskColor(riskLevel, riskScore);
    
    // Centrality-based prominence levels
    const isHighCentrality = centrality > 0.7;
    const isMediumCentrality = centrality > 0.4;
    const isKeyBridge = betweenness > 0.5; // Bridge nodes are critical in networks
    
    // Risk-based prominence levels  
    const isHighRisk = riskLevel?.toLowerCase() === 'high' || riskScore > 70;
    const isCriticalRisk = riskLevel?.toLowerCase() === 'critical' || riskScore > 90;
    
    // Combined prominence: high centrality + high risk = maximum prominence
    const isMaxProminence = (isHighCentrality && isHighRisk) || isCriticalRisk;
    const isHighProminence = isHighCentrality || isKeyBridge || isHighRisk;
    
    return {
      fill: riskColor,
      stroke: isMaxProminence ? '#8B0000' : // Dark red for maximum prominence
              isHighCentrality ? '#2E86C1' : // Blue for high centrality
              isKeyBridge ? '#8E44AD' : // Purple for bridge nodes
              isCriticalRisk ? '#8B0000' : 
              isHighRisk ? '#C62D42' : 
              verified ? '#5C6C7C' : '#F39C12',
      strokeWidth: isMaxProminence ? 5 : // Thickest border for max prominence
                   isHighCentrality ? 4 : // Thick border for high centrality
                   isKeyBridge ? 4 : // Thick border for bridge nodes
                   isCriticalRisk ? 4 : 
                   isHighRisk ? 3 : 
                   2,
      opacity: verified ? 0.95 : 0.75,
      // Enhanced glow effects for centrality and risk
      filter: isMaxProminence ? 'drop-shadow(0 0 12px #8B0000)' : // Maximum glow
              isHighCentrality ? 'drop-shadow(0 0 10px #2E86C1)' : // Blue glow for centrality
              isKeyBridge ? 'drop-shadow(0 0 8px #8E44AD)' : // Purple glow for bridges
              isCriticalRisk ? 'drop-shadow(0 0 8px #8B0000)' : 
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
                       node.riskScore > 40 ? 'medium' : 'low',
          // Centrality-based categorization
          centralityCategory: node.centrality > 0.7 ? 'high' :
                             node.centrality > 0.4 ? 'medium' : 'low',
          betweennessCategory: node.betweenness > 0.5 ? 'bridge' :
                              node.betweenness > 0.2 ? 'connector' : 'terminal',
          // Combined prominence score for sorting/filtering
          prominenceScore: (node.centrality * 0.4) + (node.betweenness * 0.3) + ((node.riskScore/100) * 0.3),
          // Centrality tooltip information
          centralityTooltip: `Centrality: ${(node.centrality * 100).toFixed(1)}% | Betweenness: ${(node.betweenness * 100).toFixed(1)}%`
        },
        // Enhanced node styling using new functions
        fill: nodeStyling.fill,
        size: nodeSize,
        // Node appearance configuration with centrality indicators
        icon: getEntityIcon(node.entityType),
        // Dynamic text styling based on centrality and risk prominence
        labelFontSize: Math.max(10, Math.min(18, nodeSize * 0.25)), // Larger fonts for prominent nodes
        labelColor: node.centrality > 0.7 ? '#FFD700' : // Gold text for high centrality
                   node.betweenness > 0.5 ? '#E6E6FA' : // Light purple for bridge nodes
                   node.riskScore > 70 ? '#FFB6C1' : // Light red for high risk
                   '#FFFFFF', // Default white
        labelFontWeight: (node.centrality > 0.7 || node.riskScore > 70) ? 'bold' : 
                        (node.centrality > 0.4 || node.riskScore > 40) ? '700' : '600',
        // Enhanced visual styling with centrality-based borders
        stroke: isCenterNode ? '#1C1E21' : nodeStyling.stroke,
        strokeWidth: isCenterNode ? Math.max(5, nodeStyling.strokeWidth + 1) : nodeStyling.strokeWidth,
        opacity: nodeStyling.opacity,
        // Add visual effects for centrality and risk
        filter: nodeStyling.filter,
        // Enhanced positioning for prominent nodes
        labelPosition: nodeSize > 60 ? 'center' : 'bottom',
        // Add centrality badge overlay for high centrality nodes
        subLabel: node.centrality > 0.7 ? `★${(node.centrality * 100).toFixed(0)}%` : 
                 node.betweenness > 0.5 ? `◆${(node.betweenness * 100).toFixed(0)}%` : ''
      };
    });

    // Transform edges for Reagraph with bidirectional support
    const reagraphEdges = [];
    
    networkData.edges.forEach(edge => {
      // Get enhanced edge styling
      const edgeStyling = getEdgeStyling(edge);
      
      // Create base edge configuration
      const baseEdgeConfig = {
        data: {
          ...edge,
          // Enhanced data for analytics
          confidenceCategory: edge.confidence > 0.8 ? 'high' :
                             edge.confidence > 0.6 ? 'medium' : 'low',
          riskCategory: edge.riskWeight > 0.7 ? 'high' :
                       edge.riskWeight > 0.4 ? 'medium' : 'low'
        },
        // Enhanced edge styling
        fill: edgeStyling.fill,
        size: edgeStyling.size,
        opacity: edgeStyling.opacity,
        dashed: edgeStyling.dashed,
        filter: edgeStyling.filter,
        arrowSize: Math.max(6, edgeStyling.size * 1.2),
        
        // Enhanced visual indicators
        labelVisible: edge.confidence > 0.8 || edge.riskWeight > 0.7,
        labelFontSize: Math.max(8, Math.min(12, edgeStyling.size + 4)),
        labelColor: '#2C3E50',
        labelBackgroundColor: 'rgba(255,255,255,0.8)',
        labelPadding: 2
      };

      if (edge.bidirectional) {
        // Create TWO separate edges for bidirectional relationships
        // Edge 1: source -> target
        reagraphEdges.push({
          ...baseEdgeConfig,
          id: `${edge.id}-forward`,
          source: edge.source,
          target: edge.target,
          label: `${edge.relationshipType || ''}`,
          size: edgeStyling.size + 1, // Slightly thicker
          labelColor: '#E74C3C', // Red for bidirectional
          edgeInterpolation: 'curved', // Add slight curve to distinguish the two edges
          curvature: 0.2
        });
        
        // Edge 2: target -> source  
        reagraphEdges.push({
          ...baseEdgeConfig,
          id: `${edge.id}-backward`,
          source: edge.target,
          target: edge.source,
          label: `⟷`, // Bidirectional symbol on reverse edge
          size: edgeStyling.size + 1,
          labelColor: '#E74C3C',
          labelVisible: true, // Always show bidirectional symbol
          edgeInterpolation: 'curved',
          curvature: -0.2 // Opposite curve direction
        });
      } else {
        // Standard single directional edge
        reagraphEdges.push({
          ...baseEdgeConfig,
          id: edge.id,
          source: edge.source,
          target: edge.target,
          label: edge.label || ''
        });
      }
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
        <H3 style={{ fontSize: '13px', marginBottom: '10px', color: '#2C3E50' }}>Network Analytics Legend</H3>
        
        {/* Centrality Indicators */}
        <div style={{ marginBottom: '12px' }}>
          <div style={{ fontSize: '10px', fontWeight: '600', marginBottom: '6px', color: '#34495E' }}>
            Centrality & Network Position
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ 
                width: '16px', 
                height: '16px', 
                borderRadius: '50%', 
                backgroundColor: '#2E86C1',
                border: '4px solid #2E86C1',
                filter: 'drop-shadow(0 0 6px #2E86C1)'
              }}></div>
              <span style={{ fontSize: '9px' }}>High Centrality ★ (hub nodes)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ 
                width: '14px', 
                height: '14px', 
                borderRadius: '50%', 
                backgroundColor: '#8E44AD',
                border: '4px solid #8E44AD',
                filter: 'drop-shadow(0 0 4px #8E44AD)'
              }}></div>
              <span style={{ fontSize: '9px' }}>Bridge Nodes ◆ (connectors)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ 
                width: '12px', 
                height: '12px', 
                borderRadius: '50%', 
                backgroundColor: '#5C6C7C'
              }}></div>
              <span style={{ fontSize: '9px' }}>Regular Nodes</span>
            </div>
          </div>
        </div>

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

        {/* Enhanced Visual Guide */}
        <div style={{ fontSize: '9px', color: '#7F8C8D', lineHeight: '1.4' }}>
          <div style={{ marginBottom: '4px' }}>
            📊 <strong>Size</strong>: Centrality + betweenness + risk score<br/>
            🎯 <strong>Borders</strong>: Blue=high centrality, Purple=bridges<br/>
            ⭐ <strong>Labels</strong>: ★=centrality %, ◆=betweenness %<br/>
            🔗 <strong>Edges</strong>: Thickness=confidence, ⟷=bidirectional<br/>
            ⚡ <strong>Glow</strong>: Network prominence + risk level
          </div>
          <div style={{ fontSize: '8px', color: '#95A5A6' }}>
            High centrality nodes = network hubs • Bridge nodes = key connectors<br/>
            Click nodes to navigate • Drag to pan • Scroll to zoom
          </div>
        </div>
      </div>
    </div>
  );
};

export default NetworkGraphComponent;