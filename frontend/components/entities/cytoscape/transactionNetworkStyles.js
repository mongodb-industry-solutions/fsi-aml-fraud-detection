/**
 * Transaction Network Cytoscape Styling
 * 
 * Specialized styling for transaction network visualization with
 * volume-based node sizing, risk-based coloring, and transaction flow styling.
 */

export const transactionNetworkStyles = [
  // ========== BASE NODE STYLES ==========
  
  // Base node appearance for transaction networks
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
      'text-background-opacity': 0.95,
      'text-background-padding': '5px',
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
  
  // ========== TRANSACTION VOLUME-BASED NODE STYLING ==========
  
  // High volume transaction nodes
  {
    selector: 'node.high-volume',
    style: {
      'background-color': '#7C3AED',
      'border-width': 4,
      'border-color': '#5B21B6',
      'width': function(ele) {
        const volume = ele.data('totalVolume') || 0;
        const count = ele.data('transactionCount') || 0;
        return Math.max(50, Math.min(90, 50 + Math.log(volume + 1) * 3 + count * 2));
      },
      'height': function(ele) {
        const volume = ele.data('totalVolume') || 0;
        const count = ele.data('transactionCount') || 0;
        return Math.max(50, Math.min(90, 50 + Math.log(volume + 1) * 3 + count * 2));
      },
      'font-size': '13px',
      'z-index': 25
    }
  },
  
  // Medium volume transaction nodes
  {
    selector: 'node.medium-volume',
    style: {
      'background-color': '#0EA5E9',
      'border-width': 3,
      'border-color': '#0284C7',
      'width': function(ele) {
        const volume = ele.data('totalVolume') || 0;
        const count = ele.data('transactionCount') || 0;
        return Math.max(35, Math.min(70, 35 + Math.log(volume + 1) * 2 + count * 1.5));
      },
      'height': function(ele) {
        const volume = ele.data('totalVolume') || 0;
        const count = ele.data('transactionCount') || 0;
        return Math.max(35, Math.min(70, 35 + Math.log(volume + 1) * 2 + count * 1.5));
      },
      'font-size': '12px',
      'z-index': 20
    }
  },
  
  // Low volume transaction nodes
  {
    selector: 'node.low-volume',
    style: {
      'background-color': '#10B981',
      'border-width': 2,
      'border-color': '#059669',
      'width': function(ele) {
        const volume = ele.data('totalVolume') || 0;
        const count = ele.data('transactionCount') || 0;
        return Math.max(25, Math.min(50, 25 + Math.log(volume + 1) * 1 + count));
      },
      'height': function(ele) {
        const volume = ele.data('totalVolume') || 0;
        const count = ele.data('transactionCount') || 0;
        return Math.max(25, Math.min(50, 25 + Math.log(volume + 1) * 1 + count));
      },
      'font-size': '11px',
      'z-index': 15
    }
  },
  
  // ========== RISK-BASED OVERLAYS ==========
  
  // High risk transaction entities
  {
    selector: 'node.high-risk',
    style: {
      'border-color': '#DC2626',
      'border-width': function(ele) {
        const existingWidth = parseInt(ele.style('border-width')) || 2;
        return Math.max(existingWidth + 1, 4);
      },
      'overlay-color': '#DC2626',
      'overlay-opacity': 0.3
    }
  },
  
  // Medium risk transaction entities
  {
    selector: 'node.medium-risk',
    style: {
      'border-color': '#F59E0B',
      'border-width': function(ele) {
        const existingWidth = parseInt(ele.style('border-width')) || 2;
        return Math.max(existingWidth, 3);
      },
      'overlay-color': '#F59E0B',
      'overlay-opacity': 0.2
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
  
  // Center node special highlighting
  {
    selector: 'node.center-entity',
    style: {
      'border-color': '#FFD700',
      'border-width': function(ele) {
        const existingWidth = parseInt(ele.style('border-width')) || 2;
        return Math.max(existingWidth + 3, 6);
      },
      'overlay-color': '#F59E0B',
      'overlay-opacity': 0.4,
      'z-index': 50
    }
  },
  
  // ========== TRANSACTION EDGE STYLES ==========
  
  // Base edge styling for transaction flows
  {
    selector: 'edge',
    style: {
      'curve-style': 'bezier',
      'control-point-step-size': 40,
      'target-arrow-shape': 'triangle',
      'target-arrow-color': function(ele) {
        return ele.data('color') || '#6B7280';
      },
      'line-color': function(ele) {
        return ele.data('color') || '#6B7280';
      },
      'width': function(ele) {
        const count = ele.data('transactionCount') || 1;
        const amount = ele.data('totalAmount') || 0;
        const baseWidth = Math.max(2, Math.min(12, Math.log(count + 1) * 2));
        const amountBonus = Math.min(4, Math.log(amount + 1) / 5);
        return baseWidth + amountBonus;
      },
      'arrow-scale': 1.2,
      'opacity': 0.8,
      'label': function(ele) {
        const count = ele.data('transactionCount') || 0;
        const primaryType = ele.data('primaryTransactionType') || '';
        if (count > 1) {
          return `${count} ${primaryType}s`;
        }
        return primaryType;
      },
      'font-size': '9px',
      'font-family': '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      'font-weight': '500',
      'text-rotation': 'autorotate',
      'text-margin-y': -12,
      'text-background-color': '#FFFFFF',
      'text-background-opacity': 0.9,
      'text-background-padding': '3px',
      'text-background-shape': 'roundrectangle',
      'color': '#4B5563',
      'cursor': 'pointer',
      'overlay-padding': '3px',
      'transition-property': 'width, opacity, line-color',
      'transition-duration': '0.25s'
    }
  },
  
  // ========== TRANSACTION TYPE STYLING ==========
  
  // High-value transactions
  {
    selector: 'edge.high-value',
    style: {
      'line-color': '#7C3AED',
      'target-arrow-color': '#7C3AED',
      'opacity': 0.9
    }
  },
  
  // Medium-value transactions
  {
    selector: 'edge.medium-value',
    style: {
      'line-color': '#0EA5E9',
      'target-arrow-color': '#0EA5E9',
      'opacity': 0.85
    }
  },
  
  // Low-value transactions
  {
    selector: 'edge.low-value',
    style: {
      'line-color': '#10B981',
      'target-arrow-color': '#10B981',
      'opacity': 0.75
    }
  },
  
  // Critical-risk transactions (80+)
  {
    selector: 'edge.risk-critical',
    style: {
      'line-color': '#B91C1C',
      'target-arrow-color': '#B91C1C',
      'line-style': 'solid',
      'opacity': 1,
      'overlay-color': '#B91C1C',
      'overlay-opacity': 0.2,
      'width': function(ele) {
        const count = ele.data('transactionCount') || 1;
        const amount = ele.data('totalAmount') || 0;
        const baseWidth = Math.max(4, Math.min(16, Math.log(count + 1) * 3)); // Thicker for high risk
        const amountBonus = Math.min(6, Math.log(amount + 1) / 4);
        return baseWidth + amountBonus;
      }
    }
  },

  // High-risk transactions (60-79)
  {
    selector: 'edge.risk-high',
    style: {
      'line-color': '#DC2626',
      'target-arrow-color': '#DC2626',
      'line-style': 'solid',
      'opacity': 0.95,
      'overlay-color': '#DC2626',
      'overlay-opacity': 0.15,
      'width': function(ele) {
        const count = ele.data('transactionCount') || 1;
        const amount = ele.data('totalAmount') || 0;
        const baseWidth = Math.max(3, Math.min(14, Math.log(count + 1) * 2.5));
        const amountBonus = Math.min(5, Math.log(amount + 1) / 5);
        return baseWidth + amountBonus;
      }
    }
  },

  // Medium-risk transactions (40-59)
  {
    selector: 'edge.risk-medium',
    style: {
      'line-color': '#F59E0B',
      'target-arrow-color': '#F59E0B',
      'opacity': 0.9
    }
  },

  // Low-medium risk transactions (20-39)
  {
    selector: 'edge.risk-low-medium',
    style: {
      'line-color': '#F97316',
      'target-arrow-color': '#F97316',
      'opacity': 0.85
    }
  },
  
  // Suspicious transaction patterns
  {
    selector: 'edge.suspicious',
    style: {
      'line-color': '#EF4444',
      'target-arrow-color': '#EF4444',
      'line-style': 'dashed',
      'line-dash-pattern': [8, 4],
      'opacity': 0.95
    }
  },
  
  // Multiple transaction flows
  {
    selector: 'edge.multiple-transactions',
    style: {
      'width': function(ele) {
        const count = ele.data('transactionCount') || 1;
        return Math.max(3, Math.min(15, count * 0.8 + 2));
      },
      'opacity': function(ele) {
        const count = ele.data('transactionCount') || 1;
        return Math.min(1, 0.6 + (count / 20));
      }
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
      'overlay-opacity': 0.5
    }
  },
  
  // Selected edge styling
  {
    selector: 'edge:selected',
    style: {
      'line-color': '#F59E0B',
      'target-arrow-color': '#F59E0B',
      'width': function(ele) {
        const currentWidth = parseInt(ele.style('width')) || 2;
        return Math.max(currentWidth + 2, 6);
      },
      'opacity': 1,
      'z-index': 999
    }
  },
  
  // Hover states
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
  }
];

// Transaction-specific color scheme
export const TRANSACTION_COLOR_SCHEME = {
  volume: {
    high: '#7C3AED',      // Purple for high volume
    medium: '#0EA5E9',    // Sky blue for medium volume
    low: '#10B981'        // Emerald for low volume
  },
  risk: {
    high: '#DC2626',      // Red for high risk
    medium: '#F59E0B',    // Amber for medium risk
    low: '#10B981'        // Emerald for low risk
  },
  transactionTypes: {
    wire: '#7C3AED',      // Purple
    ach: '#0EA5E9',       // Sky blue
    check: '#10B981',     // Emerald
    cash: '#F59E0B',      // Amber
    crypto: '#EF4444',    // Red
    consulting: '#8B5CF6', // Violet
    default: '#6B7280'    // Gray
  },
  interactions: {
    selected: '#F59E0B',  // Amber
    center: '#FFD700',    // Gold
    hover: '#3B82F6'      // Blue
  }
};