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

  // Risk level to color mapping
  const getRiskColor = useCallback((riskLevel) => {
    const colorMap = {
      'high': palette.red.base,
      'medium': palette.yellow.base, 
      'low': palette.green.base,
      'unknown': palette.gray.base
    };
    return colorMap[riskLevel?.toLowerCase()] || colorMap.unknown;
  }, []);

  // Calculate node size based on risk score and label length
  const calculateNodeSize = useCallback((riskScore, label) => {
    // Base size for text fitting + risk adjustment
    const textLength = (label || '').length;
    const baseSize = Math.max(25, textLength * 2.5); // Ensure text fits
    const riskAdjustment = (riskScore || 0) / 100 * 15; // 0-15 additional size
    return Math.max(25, Math.min(60, baseSize + riskAdjustment));
  }, []);

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

  // Relationship type to color mapping
  const getRelationshipColor = useCallback((relationshipType) => {
    const colorMap = {
      'confirmed_same_entity': palette.green.base,
      'confirmed same entity': palette.green.base,
      'potential_duplicate': palette.yellow.base,
      'potential duplicate': palette.yellow.base,
      'business_associate': palette.blue.base,
      'business associate': palette.blue.base,
      'family_member': palette.purple.base,
      'family member': palette.purple.base,
      'shared_address': '#00B4B8', // Teal
      'shared address': '#00B4B8',
      'shared_identifier': palette.red.base,
      'shared identifier': palette.red.base,
      'transaction_counterparty': '#F3922B', // Orange
      'transaction counterparty': '#F3922B',
      'corporate_structure': '#89979B',
      'corporate structure': '#89979B'
    };
    return colorMap[relationshipType?.toLowerCase()] || '#5C6C7C';
  }, []);

  // Transform backend data to Reagraph format
  const { nodes, edges } = useMemo(() => {
    if (!networkData || !networkData.nodes || !networkData.edges) {
      return { nodes: [], edges: [] };
    }

    console.log('Raw network data for Reagraph:', networkData);

    // Transform nodes for Reagraph
    const reagraphNodes = networkData.nodes.map(node => {
      // Format label for display (truncate if too long)
      const displayLabel = node.label.length > 15 
        ? node.label.substring(0, 12) + '...' 
        : node.label;
      
      return {
        id: node.id,
        label: displayLabel,
        data: {
          ...node,
          isCenterNode: node.id === centerNodeId,
          fullLabel: node.label // Keep full label for tooltips
        },
        // Enhanced node styling
        fill: getRiskColor(node.riskLevel),
        size: calculateNodeSize(node.riskScore, displayLabel),
        // Node appearance configuration
        icon: getEntityIcon(node.entityType),
        // Text styling for better readability
        labelFontSize: Math.max(10, Math.min(14, 12 - displayLabel.length * 0.2)),
        labelColor: '#FFFFFF', // White text for better contrast
        labelFontWeight: 'bold',
        // Enhanced visual styling
        stroke: node.id === centerNodeId ? '#1C1E21' : '#89979B',
        strokeWidth: node.id === centerNodeId ? 3 : 2,
        opacity: 0.9,
      };
    });

    // Transform edges for Reagraph
    const reagraphEdges = networkData.edges.map(edge => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      label: edge.label,
      data: edge,
      // Edge styling
      fill: edge.edgeStyle?.stroke || getRelationshipColor(edge.label),
      size: edge.edgeStyle?.strokeWidth || Math.max(2, edge.strength * 8),
      opacity: edge.verified ? 1.0 : 0.7,
      // Dashed line for unverified relationships
      dashed: !edge.verified,
    }));

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

      {/* Legend */}
      <div style={{
        position: 'absolute',
        bottom: '10px',
        left: '10px',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        padding: '12px',
        borderRadius: '6px',
        border: '1px solid #E8EDEB',
        fontSize: '11px',
        color: '#5C6C7C',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        zIndex: 10,
        maxWidth: '200px'
      }}>
        <H3 style={{ fontSize: '12px', marginBottom: '8px' }}>Legend</H3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ 
              width: '12px', 
              height: '12px', 
              borderRadius: '50%', 
              backgroundColor: palette.red.base 
            }}></div>
            <span>High Risk</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ 
              width: '12px', 
              height: '12px', 
              borderRadius: '50%', 
              backgroundColor: palette.yellow.base 
            }}></div>
            <span>Medium Risk</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ 
              width: '12px', 
              height: '12px', 
              borderRadius: '50%', 
              backgroundColor: palette.green.base 
            }}></div>
            <span>Low Risk</span>
          </div>
        </div>
        <div style={{ marginTop: '8px', fontSize: '10px', color: '#89979B' }}>
          💡 Click nodes to navigate • Drag to pan • Scroll to zoom<br/>
          🔵 Center node has thicker border • Node size reflects risk level
        </div>
      </div>
    </div>
  );
};

export default NetworkGraphComponent;