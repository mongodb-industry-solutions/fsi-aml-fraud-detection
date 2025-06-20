/**
 * Cytoscape.js Layout Algorithms for AML Network Analysis
 * 
 * Multiple specialized layout algorithms optimized for different types of
 * financial network analysis: force-directed, hierarchical, circular, and grid layouts.
 */

export const cytoscapeLayouts = {
  
  // ========== FORCE-DIRECTED LAYOUTS ==========
  
  // Enhanced force-directed layout (fcose) - Primary layout for general network analysis
  forceDirected: {
    name: 'fcose',
    quality: 'default',
    randomize: false,
    animate: true,
    animationDuration: 1000,
    animationEasing: 'ease-out',
    fit: true,
    padding: 50,
    nodeDimensionsIncludeLabels: true,
    uniformNodeDimensions: false,
    packComponents: true,
    nodeRepulsion: function(node) {
      // Higher repulsion for high-risk and high-centrality nodes
      const riskScore = node.data('riskScore') || 0;
      const centrality = node.data('centrality') || 0;
      const baseRepulsion = 4500;
      const riskBonus = riskScore * 20;
      const centralityBonus = centrality * 1000;
      return baseRepulsion + riskBonus + centralityBonus;
    },
    idealEdgeLength: function(edge) {
      // Edge length based on relationship confidence and risk
      const confidence = edge.data('confidence') || 0.5;
      const riskWeight = edge.data('riskWeight') || 0.5;
      const baseLength = 80;
      const confidenceAdjustment = (1 - confidence) * 60; // Lower confidence = longer edges
      const riskAdjustment = riskWeight * 40; // Higher risk = longer edges
      return baseLength + confidenceAdjustment + riskAdjustment;
    },
    edgeElasticity: function(edge) {
      // Higher elasticity for high-confidence relationships
      const confidence = edge.data('confidence') || 0.5;
      return 0.45 + (confidence * 0.55);
    },
    gravity: 0.25,
    gravityRangeCompound: 1.5,
    gravityCompound: 1.0,
    gravityRange: 3.8,
    initialEnergyOnIncremental: 0.3
  },
  
  // ========== HIERARCHICAL LAYOUTS ==========
  
  // Hierarchical layout (dagre) - Optimal for corporate structure analysis
  hierarchical: {
    name: 'dagre',
    rankDir: 'TB', // Top to bottom
    align: 'UL', // Upper left alignment
    ranker: 'longest-path',
    nodeSep: 60, // Horizontal separation between nodes
    edgeSep: 20, // Separation between edges
    rankSep: 120, // Vertical separation between ranks
    marginx: 20,
    marginy: 20,
    animate: true,
    animationDuration: 1000,
    animationEasing: 'ease-out',
    fit: true,
    padding: 50,
    // Custom node ordering for compliance hierarchy
    sort: function(a, b) {
      // Sort by entity type first (organizations at top), then by risk score
      const aType = a.data('entityType');
      const bType = b.data('entityType');
      const aRisk = a.data('riskScore') || 0;
      const bRisk = b.data('riskScore') || 0;
      
      if (aType !== bType) {
        return aType === 'organization' ? -1 : 1;
      }
      return bRisk - aRisk; // Higher risk first within same type
    }
  },
  
  // Breadth-first hierarchy - Alternative hierarchical view
  breadthFirst: {
    name: 'breadthfirst',
    directed: true,
    roots: function(nodes) {
      // Find nodes with highest centrality as roots
      return nodes.filter(node => {
        const centrality = node.data('centrality') || 0;
        return centrality > 0.7;
      });
    },
    padding: 50,
    spacingFactor: 1.5,
    animate: true,
    animationDuration: 1000,
    fit: true,
    grid: false,
    avoidOverlap: true
  },
  
  // ========== CIRCULAR LAYOUTS ==========
  
  // Circular layout - Ideal for community visualization and risk grouping
  circular: {
    name: 'circle',
    radius: function(nodes) {
      // Dynamic radius based on number of nodes
      const nodeCount = nodes.length;
      return Math.max(150, Math.min(400, nodeCount * 15));
    },
    startAngle: -Math.PI / 2, // Start at top
    sweep: 2 * Math.PI, // Full circle
    clockwise: true,
    sort: function(a, b) {
      // Sort by combined prominence score for better positioning
      const aProminence = (a.data('centrality') || 0) * 0.4 + 
                         (a.data('betweenness') || 0) * 0.3 + 
                         ((a.data('riskScore') || 0) / 100) * 0.3;
      const bProminence = (b.data('centrality') || 0) * 0.4 + 
                         (b.data('betweenness') || 0) * 0.3 + 
                         ((b.data('riskScore') || 0) / 100) * 0.3;
      return bProminence - aProminence;
    },
    animate: true,
    animationDuration: 1000,
    animationEasing: 'ease-out',
    fit: true,
    padding: 50
  },
  
  // Concentric circles - Multi-ring layout for risk stratification
  concentric: {
    name: 'concentric',
    concentric: function(node) {
      // Ring assignment based on risk level
      const riskScore = node.data('riskScore') || 0;
      if (riskScore > 70) return 4; // Outer ring for high risk
      if (riskScore > 40) return 3; // Middle ring for medium risk
      if (riskScore > 20) return 2; // Inner ring for low risk
      return 1; // Center for minimal risk
    },
    levelWidth: function(nodes) {
      // Equal width for all levels
      return nodes.maxDegree() / 4;
    },
    minNodeSpacing: 60,
    padding: 50,
    animate: true,
    animationDuration: 1000,
    fit: true,
    clockwise: true,
    startAngle: -Math.PI / 2
  },
  
  // ========== GRID LAYOUTS ==========
  
  // Grid layout - Systematic analysis view
  grid: {
    name: 'grid',
    rows: function(nodes) {
      // Auto-calculate rows based on entity types
      const entityTypes = [...new Set(nodes.map(n => n.data('entityType')))];
      return Math.max(2, entityTypes.length);
    },
    cols: function(nodes) {
      // Auto-calculate columns based on risk levels
      return 4; // Critical, High, Medium, Low
    },
    position: function(node) {
      // Position based on entity type (row) and risk level (column)
      const entityType = node.data('entityType');
      const riskScore = node.data('riskScore') || 0;
      
      // Row assignment by entity type
      let row = 0;
      if (entityType === 'organization') row = 0;
      else if (entityType === 'individual') row = 1;
      else row = 2;
      
      // Column assignment by risk score
      let col = 0;
      if (riskScore > 70) col = 0; // High risk
      else if (riskScore > 40) col = 1; // Medium risk
      else if (riskScore > 20) col = 2; // Low risk
      else col = 3; // Minimal risk
      
      return { row, col };
    },
    spacingFactor: 1.2,
    padding: 50,
    animate: true,
    animationDuration: 1000,
    fit: true,
    avoidOverlap: true,
    avoidOverlapPadding: 20
  },
  
  // ========== SPECIALIZED LAYOUTS ==========
  
  // Risk-focused layout - Emphasizes risk relationships
  riskFocused: {
    name: 'fcose',
    quality: 'proof',
    randomize: false,
    animate: true,
    animationDuration: 1500,
    fit: true,
    padding: 60,
    nodeDimensionsIncludeLabels: true,
    // Strong attraction for high-risk relationships
    idealEdgeLength: function(edge) {
      const riskWeight = edge.data('riskWeight') || 0.5;
      return 40 + (1 - riskWeight) * 80; // High-risk relationships = shorter edges
    },
    nodeRepulsion: function(node) {
      const riskScore = node.data('riskScore') || 0;
      return 3000 + (100 - riskScore) * 30; // Low-risk nodes repel more
    },
    gravity: 0.8, // Stronger gravity to cluster high-risk nodes
    gravityRange: 5.0
  },
  
  // Centrality-focused layout - Emphasizes network hubs
  centralityFocused: {
    name: 'fcose',
    quality: 'proof',
    randomize: false,
    animate: true,
    animationDuration: 1500,
    fit: true,
    padding: 60,
    gravity: 1.2,
    gravityRange: 6.0,
    // Hub nodes attract others more strongly
    nodeRepulsion: function(node) {
      const centrality = node.data('centrality') || 0;
      return 2000 + (1 - centrality) * 4000; // High centrality = less repulsion
    },
    idealEdgeLength: function(edge) {
      const sourceCentrality = edge.source().data('centrality') || 0;
      const targetCentrality = edge.target().data('centrality') || 0;
      const avgCentrality = (sourceCentrality + targetCentrality) / 2;
      return 60 + (1 - avgCentrality) * 60; // Hubs cluster together
    }
  }
};

// Layout switching utility with smooth transitions
export const switchLayout = (cy, layoutName, options = {}) => {
  const layout = cytoscapeLayouts[layoutName];
  if (!layout) {
    console.warn(`Layout '${layoutName}' not found. Available layouts:`, Object.keys(cytoscapeLayouts));
    return false;
  }
  
  // Merge custom options
  const layoutConfig = { ...layout, ...options };
  
  // Stop any running layout
  const existingLayouts = cy.scratch('_running_layouts') || [];
  existingLayouts.forEach(layout => {
    if (layout && layout.stop) {
      layout.stop();
    }
  });
  
  // Apply new layout
  const newLayout = cy.layout(layoutConfig);
  
  // Track the layout so we can stop it later
  const currentLayouts = cy.scratch('_running_layouts') || [];
  currentLayouts.push(newLayout);
  cy.scratch('_running_layouts', currentLayouts);
  
  // Clean up when layout stops
  newLayout.on('layoutstop', () => {
    const layouts = cy.scratch('_running_layouts') || [];
    const index = layouts.indexOf(newLayout);
    if (index > -1) {
      layouts.splice(index, 1);
      cy.scratch('_running_layouts', layouts);
    }
  });
  
  newLayout.run();
  
  return newLayout;
};

// Get layout recommendations based on network characteristics
export const getRecommendedLayout = (networkData) => {
  const nodeCount = networkData?.nodes?.length || 0;
  const edgeCount = networkData?.edges?.length || 0;
  const density = edgeCount / (nodeCount * (nodeCount - 1) / 2);
  
  // Analyze network characteristics
  const hasHierarchy = networkData?.edges?.some(edge => 
    edge.relationshipType?.includes('director') || 
    edge.relationshipType?.includes('ubo') || 
    edge.relationshipType?.includes('parent')
  );
  
  const hasHighRiskCluster = networkData?.nodes?.some(node => 
    (node.riskScore || 0) > 70
  );
  
  // Recommend layout based on characteristics
  if (nodeCount < 20 && hasHierarchy) {
    return 'hierarchical';
  } else if (nodeCount < 50 && hasHighRiskCluster) {
    return 'riskFocused';
  } else if (nodeCount > 100) {
    return 'concentric'; // Better for large networks
  } else if (density > 0.3) {
    return 'circular'; // Good for dense networks
  } else {
    return 'forceDirected'; // Default for most cases
  }
};

// Performance-optimized layouts for different network sizes
export const getPerformanceOptimizedLayout = (nodeCount) => {
  if (nodeCount > 500) {
    // Very large networks - simplified layout
    return {
      ...cytoscapeLayouts.grid,
      animate: false,
      randomize: true
    };
  } else if (nodeCount > 200) {
    // Large networks - reduce animation time
    return {
      ...cytoscapeLayouts.concentric,
      animationDuration: 500
    };
  } else if (nodeCount > 100) {
    // Medium networks - standard performance
    return {
      ...cytoscapeLayouts.forceDirected,
      animationDuration: 800,
      quality: 'default'
    };
  } else {
    // Small networks - full quality
    return {
      ...cytoscapeLayouts.forceDirected,
      quality: 'proof'
    };
  }
};