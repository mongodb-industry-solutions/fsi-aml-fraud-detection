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
      'text-valign': 'bottom',
      'text-margin-y': 5,
      'font-family': 'Arial, sans-serif',
      'font-size': '10px',
      'font-weight': 'bold',
      'color': '#FFFFFF',
      'text-outline-width': 2,
      'text-outline-color': '#000000',
      'text-outline-opacity': 0.7,
      'min-zoomed-font-size': 8,
      'z-index': 10,
      'cursor': 'pointer',
      'transition-property': 'border-width, box-shadow, background-color',
      'transition-duration': '0.3s'
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
      'box-shadow': '0 0 25px #8B0000',
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
      'box-shadow': '0 0 20px #C62D42',
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
      'box-shadow': '0 0 15px #F39C12',
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
      'box-shadow': function(ele) {
        const existingShadow = ele.style('box-shadow');
        return existingShadow && existingShadow !== 'none' 
          ? `${existingShadow}, 0 0 25px #2E86C1`
          : '0 0 25px #2E86C1';
      },
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
      'box-shadow': function(ele) {
        const existingShadow = ele.style('box-shadow');
        return existingShadow && existingShadow !== 'none' 
          ? `${existingShadow}, 0 0 20px #8E44AD`
          : '0 0 20px #8E44AD';
      },
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
      'box-shadow': function(ele) {
        const existingShadow = ele.style('box-shadow');
        return existingShadow && existingShadow !== 'none' 
          ? `${existingShadow}, 0 0 30px #FFD700`
          : '0 0 30px #FFD700';
      },
      'z-index': 40
    }
  },
  
  // ========== EDGE STYLES ==========
  
  // Base edge styling
  {
    selector: 'edge',
    style: {
      'curve-style': 'bezier',
      'target-arrow-shape': 'triangle',
      'target-arrow-color': function(ele) {
        return ele.data('color') || '#5C6C7C';
      },
      'line-color': function(ele) {
        return ele.data('color') || '#5C6C7C';
      },
      'width': function(ele) {
        const confidence = ele.data('confidence') || 0.5;
        return Math.max(1, Math.min(8, confidence * 6));
      },
      'arrow-scale': 1.2,
      'opacity': 0.8,
      'label': 'data(relationshipType)',
      'font-size': '8px',
      'text-rotation': 'autorotate',
      'text-margin-y': -10,
      'text-background-color': '#FFFFFF',
      'text-background-opacity': 0.8,
      'text-background-padding': '2px',
      'cursor': 'pointer',
      'transition-property': 'width, opacity, line-color',
      'transition-duration': '0.3s'
    }
  },
  
  // Bidirectional edges
  {
    selector: 'edge.bidirectional',
    style: {
      'source-arrow-shape': 'triangle',
      'source-arrow-color': function(ele) {
        return ele.data('color') || '#5C6C7C';
      },
      'line-style': 'solid',
      'width': function(ele) {
        const confidence = ele.data('confidence') || 0.5;
        return Math.max(2, Math.min(10, confidence * 8)); // Thicker for bidirectional
      },
      'curve-style': 'unbundled-bezier'
    }
  },
  
  // High-risk relationship styling
  {
    selector: 'edge.risk-high',
    style: {
      'line-color': '#A93226',
      'target-arrow-color': '#A93226',
      'source-arrow-color': '#A93226',
      'box-shadow': '0 0 10px #A93226',
      'width': function(ele) {
        const confidence = ele.data('confidence') || 0.5;
        return Math.max(3, Math.min(12, confidence * 10));
      },
      'opacity': 1
    }
  },
  
  // Medium-risk relationship styling
  {
    selector: 'edge.risk-medium',
    style: {
      'line-color': '#F39C12',
      'target-arrow-color': '#F39C12',
      'source-arrow-color': '#F39C12',
      'opacity': 0.9
    }
  },
  
  // Low-risk relationship styling
  {
    selector: 'edge.risk-low',
    style: {
      'line-color': '#2ECC71',
      'target-arrow-color': '#2ECC71',
      'source-arrow-color': '#2ECC71',
      'opacity': 0.7
    }
  },
  
  // Corporate structure relationships
  {
    selector: 'edge[relationshipType *= "director"], edge[relationshipType *= "ubo"], edge[relationshipType *= "parent"]',
    style: {
      'line-color': '#3498DB',
      'target-arrow-color': '#3498DB',
      'source-arrow-color': '#3498DB',
      'line-style': 'dashed'
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
      'border-color': '#FFD700',
      'border-width': function(ele) {
        const existingWidth = parseInt(ele.style('border-width')) || 2;
        return Math.max(existingWidth + 2, 6);
      },
      'box-shadow': function(ele) {
        const existingShadow = ele.style('box-shadow');
        return existingShadow && existingShadow !== 'none' 
          ? `${existingShadow}, 0 0 40px #FFD700`
          : '0 0 40px #FFD700';
      }
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
    critical: '#8B0000',
    high: '#C62D42',
    medium: '#F39C12',
    low: '#2ECC71'
  },
  centrality: {
    high: '#2E86C1',
    bridge: '#8E44AD',
    regular: '#5C6C7C'
  },
  relationships: {
    highRisk: '#A93226',
    corporate: '#3498DB',
    confirmed: '#27AE60',
    household: '#8E44AD',
    public: '#16A085'
  },
  interactions: {
    selected: '#FFD700',
    center: '#FFD700',
    hover: '#3498DB'
  }
};