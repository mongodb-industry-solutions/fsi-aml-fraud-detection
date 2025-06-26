/**
 * Cytoscape.js Styling Configuration for AML Network Analysis
 * 
 * Rich CSS-like styling system optimized for financial compliance visualization
 * with risk-based color gradients, centrality indicators, and entity type styling.
 */

export const cytoscapeStyles = [
  // ========== BASE NODE STYLES ==========
  
  // Base node appearance
  {
    selector: 'node',
    style: {
      'label': 'data(label)',
      'text-valign': 'center',
      'text-halign': 'center',
      'text-margin-y': 0,
      'font-family': '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      'font-size': '11px',
      'font-weight': '600',
      'color': '#1F2937',
      'text-background-color': '#FFFFFF',
      'text-background-opacity': 0.9,
      'text-background-padding': '4px',
      'text-background-shape': 'roundrectangle',
      'min-zoomed-font-size': 8,
      'z-index': 10,
      'cursor': 'pointer',
      'overlay-padding': '6px',
      'transition-property': 'border-width, width, height, background-color',
      'transition-duration': '0.25s',
      'transition-timing-function': 'ease-out'
    }
  },
  
  // ========== RISK-BASED NODE STYLING ==========
  
  // Critical risk nodes (90+)
  {
    selector: 'node.critical-risk',
    style: {
      'background-color': '#8B0000',
      'border-width': 5,
      'border-color': '#5C0000',
      'width': function(ele) {
        const riskScore = ele.data('riskScore') || 0;
        const centrality = ele.data('centrality') || 0;
        return Math.max(35, Math.min(90, 40 + (riskScore / 100) * 25 + centrality * 25));
      },
      'height': function(ele) {
        const riskScore = ele.data('riskScore') || 0;
        const centrality = ele.data('centrality') || 0;
        return Math.max(35, Math.min(90, 40 + (riskScore / 100) * 25 + centrality * 25));
      },
      'overlay-color': '#8B0000',
      'overlay-opacity': 0.3,
      'font-size': '14px',
      'z-index': 25
    }
  },
  
  // High risk nodes (70-89)
  {
    selector: 'node.high-risk',
    style: {
      'background-color': '#C62D42',
      'border-width': 4,
      'border-color': '#8B0000',
      'width': function(ele) {
        const riskScore = ele.data('riskScore') || 0;
        const centrality = ele.data('centrality') || 0;
        return Math.max(30, Math.min(80, 35 + (riskScore / 100) * 20 + centrality * 25));
      },
      'height': function(ele) {
        const riskScore = ele.data('riskScore') || 0;
        const centrality = ele.data('centrality') || 0;
        return Math.max(30, Math.min(80, 35 + (riskScore / 100) * 20 + centrality * 25));
      },
      'overlay-color': '#C62D42',
      'overlay-opacity': 0.25,
      'font-size': '12px',
      'z-index': 20
    }
  },
  
  // Medium risk nodes (40-69)
  {
    selector: 'node.medium-risk',
    style: {
      'background-color': '#F39C12',
      'border-width': 2,
      'border-color': '#E67E22',
      'width': function(ele) {
        const riskScore = ele.data('riskScore') || 0;
        const centrality = ele.data('centrality') || 0;
        return Math.max(25, Math.min(60, 30 + (riskScore / 100) * 15 + centrality * 20));
      },
      'height': function(ele) {
        const riskScore = ele.data('riskScore') || 0;
        const centrality = ele.data('centrality') || 0;
        return Math.max(25, Math.min(60, 30 + (riskScore / 100) * 15 + centrality * 20));
      },
      'overlay-color': '#F39C12',
      'overlay-opacity': 0.2,
      'font-size': '11px',
      'z-index': 15
    }
  },
  
  // Low risk nodes (0-39)
  {
    selector: 'node.low-risk',
    style: {
      'background-color': '#2ECC71',
      'border-width': 1,
      'border-color': '#27AE60',
      'width': function(ele) {
        const riskScore = ele.data('riskScore') || 0;
        const centrality = ele.data('centrality') || 0;
        return Math.max(20, Math.min(50, 25 + (riskScore / 100) * 10 + centrality * 15));
      },
      'height': function(ele) {
        const riskScore = ele.data('riskScore') || 0;
        const centrality = ele.data('centrality') || 0;
        return Math.max(20, Math.min(50, 25 + (riskScore / 100) * 10 + centrality * 15));
      },
      'font-size': '10px',
      'z-index': 10
    }
  },
  
  // ========== CENTRALITY-BASED STYLING ==========
  
  // High centrality nodes (hubs)
  {
    selector: 'node.high-centrality',
    style: {
      'border-color': '#2E86C1',
      'border-width': function(ele) {
        const existingWidth = parseInt(ele.style('border-width')) || 2;
        return Math.max(existingWidth, 5);
      },
      'overlay-color': '#3B82F6',
      'overlay-opacity': 0.25,
      'font-weight': 'bold',
      'z-index': function(ele) {
        const existingZ = parseInt(ele.style('z-index')) || 10;
        return Math.max(existingZ, 30);
      }
    }
  },
  
  // Bridge nodes (high betweenness centrality)
  {
    selector: 'node.bridge-node',
    style: {
      'border-color': '#8E44AD',
      'border-width': function(ele) {
        const existingWidth = parseInt(ele.style('border-width')) || 2;
        return Math.max(existingWidth, 4);
      },
      'shape': 'diamond',
      'overlay-color': '#8B5CF6',
      'overlay-opacity': 0.25,
      'z-index': function(ele) {
        const existingZ = parseInt(ele.style('z-index')) || 10;
        return Math.max(existingZ, 25);
      }
    }
  },
  
  // ========== ENTITY TYPE STYLING ==========
  
  // Individual entities
  {
    selector: 'node.individual',
    style: {
      'shape': 'ellipse'
    }
  },
  
  // Organization entities
  {
    selector: 'node.organization',
    style: {
      'shape': 'rectangle'
    }
  },
  
  // Center node special styling
  {
    selector: 'node.center-node',
    style: {
      'border-color': '#FFD700',
      'border-width': function(ele) {
        const existingWidth = parseInt(ele.style('border-width')) || 2;
        return Math.max(existingWidth, 6);
      },
      'overlay-color': '#F59E0B',
      'overlay-opacity': 0.3,
      'z-index': 40
    }
  },
  
  // ========== EDGE STYLES ==========
  
  // Base edge styling
  {
    selector: 'edge',
    style: {
      'curve-style': 'bezier',
      'control-point-step-size': 40,
      'target-arrow-shape': 'triangle-tee',
      'target-arrow-color': function(ele) {
        return ele.data('color') || '#94A3B8';
      },
      'line-color': function(ele) {
        return ele.data('color') || '#94A3B8';
      },
      'width': function(ele) {
        const confidence = ele.data('confidence') || 0.5;
        return Math.max(1.5, Math.min(6, confidence * 5));
      },
      'arrow-scale': 1,
      'opacity': 0.7,
      'label': 'data(relationshipType)',
      'font-size': '9px',
      'font-family': '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      'font-weight': '500',
      'text-rotation': 'autorotate',
      'text-margin-y': -10,
      'text-background-color': '#FFFFFF',
      'text-background-opacity': 0.95,
      'text-background-padding': '3px',
      'text-background-shape': 'roundrectangle',
      'color': '#4B5563',
      'cursor': 'pointer',
      'overlay-padding': '3px',
      'transition-property': 'width, opacity, line-color',
      'transition-duration': '0.25s',
      'transition-timing-function': 'ease-out'
    }
  },
  
  // Bidirectional edges
  {
    selector: 'edge.bidirectional',
    style: {
      'source-arrow-shape': 'triangle-tee',
      'source-arrow-color': function(ele) {
        return ele.data('color') || '#94A3B8';
      },
      'line-style': 'solid',
      'width': function(ele) {
        const confidence = ele.data('confidence') || 0.5;
        return Math.max(2.5, Math.min(8, confidence * 6.5));
      },
      'curve-style': 'unbundled-bezier',
      'control-point-distances': [20, -20],
      'control-point-weights': [0.5, 0.5]
    }
  },
  
  // High-risk relationship styling
  {
    selector: 'edge.risk-high',
    style: {
      'line-color': '#DC2626',
      'target-arrow-color': '#DC2626',
      'source-arrow-color': '#DC2626',
      'width': function(ele) {
        const confidence = ele.data('confidence') || 0.5;
        return Math.max(3, Math.min(10, confidence * 8));
      },
      'opacity': 0.9,
      'overlay-color': '#DC2626',
      'overlay-opacity': 0.15
    }
  },
  
  // Medium-risk relationship styling
  {
    selector: 'edge.risk-medium',
    style: {
      'line-color': '#F59E0B',
      'target-arrow-color': '#F59E0B',
      'source-arrow-color': '#F59E0B',
      'opacity': 0.85
    }
  },
  
  // Low-risk relationship styling
  {
    selector: 'edge.risk-low',
    style: {
      'line-color': '#10B981',
      'target-arrow-color': '#10B981',
      'source-arrow-color': '#10B981',
      'opacity': 0.75
    }
  },
  
  // Corporate structure relationships
  {
    selector: 'edge[relationshipType *= "director"], edge[relationshipType *= "ubo"], edge[relationshipType *= "parent"]',
    style: {
      'line-color': '#3B82F6',
      'target-arrow-color': '#3B82F6',
      'source-arrow-color': '#3B82F6',
      'line-style': 'solid',
      'line-dash-pattern': [6, 3]
    }
  },
  
  // High confidence relationships
  {
    selector: 'edge.confidence-high',
    style: {
      'opacity': 1,
      'line-style': 'solid'
    }
  },
  
  // Medium confidence relationships
  {
    selector: 'edge.confidence-medium',
    style: {
      'opacity': 0.8,
      'line-style': 'dotted'
    }
  },
  
  // Low confidence relationships
  {
    selector: 'edge.confidence-low',
    style: {
      'opacity': 0.6,
      'line-style': 'dashed'
    }
  },
  
  // ========== INTERACTION STATES ==========
  
  // Selected node styling
  {
    selector: 'node:selected',
    style: {
      'border-color': '#F59E0B',
      'border-width': function(ele) {
        const existingWidth = parseInt(ele.style('border-width')) || 2;
        return Math.max(existingWidth + 2, 6);
      },
      'overlay-color': '#F59E0B',
      'overlay-opacity': 0.4
    }
  },
  
  // Selected edge styling
  {
    selector: 'edge:selected',
    style: {
      'line-color': '#FFD700',
      'target-arrow-color': '#FFD700',
      'source-arrow-color': '#FFD700',
      'width': function(ele) {
        const currentWidth = parseInt(ele.style('width')) || 2;
        return Math.max(currentWidth + 2, 6);
      },
      'opacity': 1,
      'z-index': 999
    }
  },
  
  // Hover states will be handled programmatically in events
  {
    selector: 'node.highlighted',
    style: {
      'border-width': function(ele) {
        const existingWidth = parseInt(ele.style('border-width')) || 2;
        return existingWidth + 2;
      },
      'z-index': 35
    }
  },
  
  {
    selector: 'edge.highlighted',
    style: {
      'width': function(ele) {
        const currentWidth = parseInt(ele.style('width')) || 2;
        return currentWidth + 2;
      },
      'opacity': 1,
      'z-index': 100
    }
  },
  
  // Hidden elements
  {
    selector: 'node.hidden',
    style: {
      'opacity': 0,
      'events': 'no'
    }
  },
  
  {
    selector: 'edge.hidden',
    style: {
      'opacity': 0,
      'events': 'no'
    }
  }
];

// Color scheme constants for programmatic access
export const COLOR_SCHEME = {
  risk: {
    critical: '#991B1B',  // Darker red for better contrast
    high: '#DC2626',      // Modern red
    medium: '#F59E0B',    // Amber
    low: '#10B981'        // Emerald
  },
  centrality: {
    high: '#3B82F6',      // Blue
    bridge: '#8B5CF6',    // Violet
    regular: '#6B7280'    // Gray
  },
  relationships: {
    highRisk: '#DC2626',  // Red
    corporate: '#3B82F6', // Blue
    confirmed: '#10B981', // Emerald
    household: '#8B5CF6', // Violet
    public: '#14B8A6'     // Teal
  },
  interactions: {
    selected: '#F59E0B',  // Amber instead of gold
    center: '#F59E0B',    // Amber
    hover: '#3B82F6'      // Blue
  }
};