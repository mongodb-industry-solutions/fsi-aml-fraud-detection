/**
 * Cytoscape.js Event Handling for AML Network Analysis
 * 
 * Comprehensive event system for node/edge interactions, hover effects,
 * selection management, and advanced AML-specific interactions.
 */

// Setup all Cytoscape event handlers
export const setupCytoscapeEvents = (cy, callbacks = {}) => {
  const {
    onNodeClick,
    onEdgeClick,
    onLayoutComplete,
    onSelectionChange,
    onNetworkReady,
    onPerformanceUpdate
  } = callbacks;
  
  // ========== NODE EVENTS ==========
  
  // Node click with enhanced AML data
  cy.on('tap', 'node', function(evt) {
    const node = evt.target;
    
    // Calculate real-time centrality if not available
    const centrality = node.data('centrality') || calculateNodeCentrality(cy, node);
    const betweenness = node.data('betweenness') || calculateBetweennessCentrality(cy, node);
    
    // Enhanced node data for AML analysis
    const enhancedNodeData = {
      // Basic node data
      ...node.data(),
      
      // Position and visual info
      position: node.position(),
      renderedPosition: node.renderedPosition(),
      boundingBox: node.boundingBox(),
      
      // Network analysis data
      degree: node.degree(),
      neighborhood: node.neighborhood().nodes().map(n => ({
        id: n.id(),
        label: n.data('label'),
        riskScore: n.data('riskScore'),
        relationshipType: getRelationshipType(node, n)
      })),
      
      // Centrality metrics
      centrality: centrality,
      betweenness: betweenness,
      closeness: calculateClosenessCentrality(cy, node),
      
      // Risk analysis
      connectedRiskScore: calculateConnectedRiskScore(node),
      suspiciousPatterns: detectSuspiciousPatterns(cy, node),
      
      // UI state
      isSelected: node.selected(),
      isVisible: node.visible(),
      classes: node.classes()
    };
    
    // Clear previous selections and select this node
    cy.elements().removeClass('highlighted');
    node.addClass('highlighted');
    highlightNeighborhood(node);
    
    // Trigger callback
    onNodeClick && onNodeClick(enhancedNodeData);
  });
  
  // Node hover effects
  cy.on('mouseover', 'node', function(evt) {
    const node = evt.target;
    
    // Visual hover effects
    node.addClass('highlighted');
    highlightNeighborhood(node, 'hover');
    
    // Update cursor
    cy.container().style.cursor = 'pointer';
  });
  
  cy.on('mouseout', 'node', function(evt) {
    const node = evt.target;
    
    // Remove hover effects (but keep selection highlights)
    if (!node.selected()) {
      node.removeClass('highlighted');
      clearNeighborhoodHighlight(node, 'hover');
    }
    
    // Reset cursor
    cy.container().style.cursor = 'default';
  });
  
  // Node double-click for focus
  cy.on('dbltap', 'node', function(evt) {
    const node = evt.target;
    
    // Animate to focus on node
    cy.animate({
      center: { eles: node },
      zoom: Math.min(cy.zoom() * 1.5, 3.0)
    }, {
      duration: 800,
      easing: 'ease-out'
    });
    
    // Highlight the node's network
    highlightNodeNetwork(cy, node);
  });
  
  // ========== EDGE EVENTS ==========
  
  // Edge click with relationship analysis
  cy.on('tap', 'edge', function(evt) {
    const edge = evt.target;
    
    // Enhanced edge data for AML analysis
    const enhancedEdgeData = {
      // Basic edge data
      ...edge.data(),
      
      // Connected nodes
      sourceNode: {
        ...edge.source().data(),
        position: edge.source().position()
      },
      targetNode: {
        ...edge.target().data(),
        position: edge.target().position()
      },
      
      // Relationship analysis
      relationshipStrength: calculateRelationshipStrength(edge),
      riskPropagation: calculateRiskPropagation(edge),
      isInSuspiciousPath: checkSuspiciousPath(cy, edge),
      
      // Visual properties
      length: calculateEdgeLength(edge),
      isVisible: edge.visible(),
      classes: edge.classes(),
      
      // Network context
      alternativePaths: findAlternativePaths(cy, edge.source(), edge.target()),
      communityBridge: isCommunityBridge(cy, edge)
    };
    
    // Highlight the edge and connected nodes
    cy.elements().removeClass('highlighted');
    edge.addClass('highlighted');
    edge.source().addClass('highlighted');
    edge.target().addClass('highlighted');
    
    // Trigger callback
    onEdgeClick && onEdgeClick(enhancedEdgeData);
  });
  
  // Edge hover effects
  cy.on('mouseover', 'edge', function(evt) {
    const edge = evt.target;
    
    edge.addClass('highlighted');
    edge.source().addClass('highlighted');
    edge.target().addClass('highlighted');
    
    cy.container().style.cursor = 'pointer';
  });
  
  cy.on('mouseout', 'edge', function(evt) {
    const edge = evt.target;
    
    if (!edge.selected()) {
      edge.removeClass('highlighted');
      edge.source().removeClass('highlighted');
      edge.target().removeClass('highlighted');
    }
    
    cy.container().style.cursor = 'default';
  });
  
  // ========== SELECTION EVENTS ==========
  
  // Selection change tracking
  cy.on('select unselect', function(evt) {
    const selectedNodes = cy.nodes(':selected');
    const selectedEdges = cy.edges(':selected');
    
    onSelectionChange && onSelectionChange({
      nodes: selectedNodes.map(n => n.data()),
      edges: selectedEdges.map(e => e.data()),
      count: selectedNodes.length + selectedEdges.length
    });
  });
  
  // Clear selection on background click
  cy.on('tap', function(evt) {
    if (evt.target === cy) {
      cy.elements().removeClass('highlighted');
      cy.elements().unselect();
    }
  });
  
  // ========== LAYOUT EVENTS ==========
  
  // Layout completion tracking
  cy.on('layoutstop', function(evt) {
    const layout = evt.layout;
    const nodeCount = cy.nodes().length;
    const edgeCount = cy.edges().length;
    
    // Calculate network metrics after layout
    const networkMetrics = calculateNetworkMetrics(cy);
    
    onLayoutComplete && onLayoutComplete({
      layoutName: layout.options.name,
      nodeCount,
      edgeCount,
      duration: Date.now() - (layout._startTime || 0),
      metrics: networkMetrics
    });
  });
  
  // ========== PERFORMANCE MONITORING ==========
  
  // Viewport change for performance optimization
  cy.on('viewport', throttle(function() {
    const zoom = cy.zoom();
    const pan = cy.pan();
    const viewportBounds = cy.extent();
    
    // Optimize rendering based on zoom level
    optimizeRenderingForZoom(cy, zoom);
    
    onPerformanceUpdate && onPerformanceUpdate({
      zoom,
      pan,
      viewportBounds,
      visibleNodes: cy.nodes(':visible').length,
      visibleEdges: cy.edges(':visible').length
    });
  }, 100));
  
  // ========== NETWORK READY EVENT ==========
  
  // Initial setup when network is ready
  cy.ready(function() {
    // Calculate initial network metrics
    const networkMetrics = calculateNetworkMetrics(cy);
    
    onNetworkReady && onNetworkReady({
      nodeCount: cy.nodes().length,
      edgeCount: cy.edges().length,
      metrics: networkMetrics,
      recommendations: {
        recommended: 'forceDirected',
        reason: 'General purpose layout'
      }
    });
  });
};

// ========== HELPER FUNCTIONS ==========

// Highlight node's immediate neighborhood
const highlightNeighborhood = (node, type = 'select') => {
  const neighborhood = node.neighborhood();
  const className = type === 'hover' ? 'hover-highlighted' : 'highlighted';
  
  neighborhood.addClass(className);
  node.connectedEdges().addClass(className);
};

// Clear neighborhood highlighting
const clearNeighborhoodHighlight = (node, type = 'select') => {
  const neighborhood = node.neighborhood();
  const className = type === 'hover' ? 'hover-highlighted' : 'highlighted';
  
  neighborhood.removeClass(className);
  node.connectedEdges().removeClass(className);
};

// Highlight extended network for a node
const highlightNodeNetwork = (cy, centerNode, maxDepth = 2) => {
  cy.elements().removeClass('network-highlighted');
  
  const visited = new Set();
  const toVisit = [{ node: centerNode, depth: 0 }];
  
  while (toVisit.length > 0) {
    const { node, depth } = toVisit.shift();
    
    if (visited.has(node.id()) || depth > maxDepth) continue;
    visited.add(node.id());
    
    node.addClass('network-highlighted');
    
    if (depth < maxDepth) {
      node.neighborhood().nodes().forEach(neighbor => {
        if (!visited.has(neighbor.id())) {
          toVisit.push({ node: neighbor, depth: depth + 1 });
        }
      });
    }
  }
};

// Calculate node centrality if not provided
const calculateNodeCentrality = (cy, node) => {
  const totalNodes = cy.nodes().length;
  if (totalNodes <= 1) return 0;
  
  const degree = node.degree();
  return degree / (totalNodes - 1);
};

// Calculate betweenness centrality approximation
const calculateBetweennessCentrality = (cy, node) => {
  // Simplified betweenness calculation for performance
  const allNodes = cy.nodes();
  let betweenness = 0;
  let pathCount = 0;
  
  // Sample-based calculation for large networks
  const sampleSize = Math.min(20, allNodes.length);
  const sampledNodes = allNodes.slice(0, sampleSize);
  
  for (let i = 0; i < sampledNodes.length; i++) {
    for (let j = i + 1; j < sampledNodes.length; j++) {
      if (sampledNodes[i].id() !== node.id() && sampledNodes[j].id() !== node.id()) {
        const path = cy.elements().dijkstra({
          root: sampledNodes[i],
          weight: function() { return 1; }
        }).pathTo(sampledNodes[j]);
        
        if (path.nodes().some(n => n.id() === node.id())) {
          betweenness++;
        }
        pathCount++;
      }
    }
  }
  
  return pathCount > 0 ? betweenness / pathCount : 0;
};

// Calculate closeness centrality
const calculateClosenessCentrality = (cy, node) => {
  const dijkstra = cy.elements().dijkstra({
    root: node,
    weight: function() { return 1; }
  });
  
  let totalDistance = 0;
  let reachableNodes = 0;
  
  cy.nodes().forEach(target => {
    if (target.id() !== node.id()) {
      const distance = dijkstra.distanceTo(target);
      if (distance < Infinity) {
        totalDistance += distance;
        reachableNodes++;
      }
    }
  });
  
  return reachableNodes > 0 ? reachableNodes / totalDistance : 0;
};

// Calculate connected risk score
const calculateConnectedRiskScore = (node) => {
  const neighbors = node.neighborhood().nodes();
  if (neighbors.length === 0) return node.data('riskScore') || 0;
  
  const neighborRisks = neighbors.map(n => n.data('riskScore') || 0);
  const avgNeighborRisk = neighborRisks.reduce((sum, risk) => sum + risk, 0) / neighborRisks.length;
  const maxNeighborRisk = Math.max(...neighborRisks);
  
  const ownRisk = node.data('riskScore') || 0;
  
  // Weighted combination of own risk and network risk
  return (ownRisk * 0.6) + (avgNeighborRisk * 0.3) + (maxNeighborRisk * 0.1);
};

// Detect suspicious patterns around a node
const detectSuspiciousPatterns = (cy, node) => {
  const patterns = [];
  
  // High-risk clustering
  const highRiskNeighbors = node.neighborhood().nodes().filter(n => 
    (n.data('riskScore') || 0) > 70
  );
  if (highRiskNeighbors.length > 2) {
    patterns.push({
      type: 'high_risk_cluster',
      description: `Connected to ${highRiskNeighbors.length} high-risk entities`,
      severity: 'high'
    });
  }
  
  // Circular relationships (potential layering)
  const cycles = findCycles(cy, node, 3);
  if (cycles.length > 0) {
    patterns.push({
      type: 'circular_relationships',
      description: `Part of ${cycles.length} circular relationship patterns`,
      severity: 'medium'
    });
  }
  
  // Hub behavior (unusually high connectivity)
  const degree = node.degree();
  const avgDegree = cy.nodes().map(n => n.degree()).reduce((sum, d) => sum + d, 0) / cy.nodes().length;
  if (degree > avgDegree * 3) {
    patterns.push({
      type: 'hub_behavior',
      description: `Unusually high connectivity (${degree} connections)`,
      severity: 'medium'
    });
  }
  
  return patterns;
};

// Find cycles involving a node
const findCycles = (cy, startNode, maxLength) => {
  const cycles = [];
  const visited = new Set();
  
  const dfs = (currentNode, path, depth) => {
    if (depth > maxLength) return;
    if (visited.has(currentNode.id())) return;
    
    visited.add(currentNode.id());
    
    currentNode.neighborhood().nodes().forEach(neighbor => {
      if (neighbor.id() === startNode.id() && path.length >= 2) {
        cycles.push([...path, neighbor]);
      } else if (!path.some(n => n.id() === neighbor.id())) {
        dfs(neighbor, [...path, neighbor], depth + 1);
      }
    });
    
    visited.delete(currentNode.id());
  };
  
  dfs(startNode, [startNode], 0);
  return cycles;
};

// Calculate network metrics
const calculateNetworkMetrics = (cy) => {
  const nodes = cy.nodes();
  const edges = cy.edges();
  const nodeCount = nodes.length;
  const edgeCount = edges.length;
  
  // Basic metrics
  const density = nodeCount > 1 ? edgeCount / (nodeCount * (nodeCount - 1) / 2) : 0;
  const avgDegree = nodeCount > 0 ? (edgeCount * 2) / nodeCount : 0;
  
  // Risk metrics
  const riskScores = nodes.map(n => n.data('riskScore') || 0);
  const avgRiskScore = riskScores.reduce((sum, score) => sum + score, 0) / riskScores.length;
  const maxRiskScore = Math.max(...riskScores);
  
  // Centrality metrics
  const centralities = nodes.map(n => n.data('centrality') || 0);
  const avgCentrality = centralities.reduce((sum, c) => sum + c, 0) / centralities.length;
  const maxCentrality = Math.max(...centralities);
  
  return {
    nodeCount,
    edgeCount,
    density,
    avgDegree,
    avgRiskScore,
    maxRiskScore,
    avgCentrality,
    maxCentrality,
    riskDistribution: {
      high: riskScores.filter(r => r > 70).length,
      medium: riskScores.filter(r => r > 40 && r <= 70).length,
      low: riskScores.filter(r => r <= 40).length
    }
  };
};

// Throttle function for performance
const throttle = (func, limit) => {
  let inThrottle;
  return function() {
    const args = arguments;
    const context = this;
    if (!inThrottle) {
      func.apply(context, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

// Optimize rendering based on zoom level
const optimizeRenderingForZoom = (cy, zoom) => {
  if (zoom < 0.5) {
    // Very zoomed out - hide labels and simplify
    cy.style()
      .selector('node')
      .style('label', '')
      .style('font-size', '8px')
      .update();
      
    cy.style()
      .selector('edge')
      .style('label', '')
      .style('width', 1)
      .update();
  } else if (zoom < 1.0) {
    // Moderately zoomed out - show essential labels only
    cy.style()
      .selector('node')
      .style('label', function(ele) {
        return (ele.data('centrality') || 0) > 0.5 ? ele.data('label') : '';
      })
      .update();
  } else {
    // Normal or zoomed in - show all labels
    cy.style()
      .selector('node')
      .style('label', 'data(label)')
      .style('font-size', '10px')
      .update();
      
    cy.style()
      .selector('edge')
      .style('label', 'data(relationshipType)')
      .update();
  }
};

// Additional helper functions would go here...
// (calculateRelationshipStrength, calculateRiskPropagation, etc.)

export default setupCytoscapeEvents;