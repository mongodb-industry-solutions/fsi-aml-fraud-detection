/**
 * Direct Backend to Cytoscape Data Transformation
 * 
 * Transforms AML backend network data directly into Cytoscape format,
 * eliminating the need for Reagraph intermediate format.
 */

import { COLOR_SCHEME } from './cytoscapeStyles';

/**
 * Transform backend network data directly to Cytoscape elements format
 * @param {Object} networkData - Raw network data from backend
 * @param {string} centerNodeId - ID of the center node for special styling
 * @returns {Array} Cytoscape elements array
 */
export const transformBackendToCytoscape = (networkData, centerNodeId = null) => {
  console.log('🚀 transformBackendToCytoscape called with:', networkData);
  
  if (!networkData || !networkData.nodes || !networkData.edges) {
    console.log('❌ No valid network data provided:', networkData);
    return [];
  }

  console.log(`📊 Processing ${networkData.nodes?.length} nodes and ${networkData.edges?.length} edges`);
  const elements = [];

  // ========== TRANSFORM NODES ==========
  networkData.nodes.forEach(node => {
    // Determine risk level classification
    const riskScore = node.riskScore || 0;
    let riskLevel = 'low-risk';
    if (riskScore > 90) riskLevel = 'critical-risk';
    else if (riskScore > 70) riskLevel = 'high-risk';
    else if (riskScore > 40) riskLevel = 'medium-risk';

    // Determine centrality classification
    const centrality = node.centrality || 0;
    const betweenness = node.betweenness || 0;
    let centralityClasses = [];
    if (centrality > 0.7) centralityClasses.push('high-centrality');
    if (betweenness > 0.5) centralityClasses.push('bridge-node');

    // Entity type classification
    const entityType = node.entityType || node.type || 'individual';
    
    // Build CSS classes for styling
    const nodeClasses = [
      riskLevel,
      entityType,
      ...centralityClasses
    ];

    // Add center node class if applicable
    if (node.id === centerNodeId) {
      nodeClasses.push('center-node');
    }

    // Create Cytoscape node element
    elements.push({
      data: {
        // Basic identification
        id: node.id,
        label: formatNodeLabel(node.label || node.name, 15),
        
        // AML-specific data for analysis
        riskScore: riskScore,
        riskLevel: node.riskLevel || getRiskLevelFromScore(riskScore),
        centrality: centrality,
        betweenness: betweenness,
        entityType: entityType,
        
        // Network analysis data
        connectionCount: node.connections || node.connectionCount || 0,
        verified: node.verified !== false, // Default to true
        active: node.active !== false, // Default to true
        
        // Additional entity data
        fullLabel: node.label || node.name, // Keep full label for tooltips
        entityId: node.id, // For backend API calls
        
        // Risk assessment details
        riskAssessment: node.riskAssessment,
        
        // Prominence scoring for analysis
        prominenceScore: calculateProminenceScore(centrality, betweenness, riskScore),
        
        // Centrality badges for display
        centralityBadge: getCentralityBadge(centrality, betweenness),
        
        // Color coding for programmatic access
        color: getNodeColor(riskScore, riskLevel),
        
        // Additional metadata
        metadata: {
          isCenter: node.id === centerNodeId,
          riskCategory: getRiskCategory(riskScore),
          centralityCategory: getCentralityCategory(centrality),
          betweennessCategory: getBetweennessCategory(betweenness)
        }
      },
      classes: nodeClasses.join(' ')
    });
  });

  // ========== TRANSFORM EDGES ==========
  console.log('🔗 Starting edge transformation...');
  networkData.edges.forEach((edge, index) => {
    if (index < 3) {
      console.log(`🔍 Edge ${index}:`, edge);
    }
    // Risk weight classification
    const riskWeight = edge.riskWeight || 0.5;
    let riskClass = 'risk-low';
    if (riskWeight > 0.7) riskClass = 'risk-high';
    else if (riskWeight > 0.4) riskClass = 'risk-medium';

    // Confidence classification
    const confidence = edge.confidence || 0.5;
    let confidenceClass = 'confidence-low';
    if (confidence > 0.8) confidenceClass = 'confidence-high';
    else if (confidence > 0.6) confidenceClass = 'confidence-medium';

    // Bidirectional classification
    const bidirectional = edge.bidirectional || edge.direction === 'bidirectional';
    const directionClass = bidirectional ? 'bidirectional' : 'directed';

    // Relationship type classification
    const relationshipType = edge.relationshipType || edge.type || 'unknown';
    const relationshipClass = getRelationshipTypeClass(relationshipType);

    // Build CSS classes for styling
    const edgeClasses = [
      riskClass,
      confidenceClass,
      directionClass,
      relationshipClass
    ];

    // Get edge color based on relationship type and risk
    const edgeColor = getEdgeColor(relationshipType, riskWeight, confidence);

    // Create base edge data
    const baseEdgeData = {
      // Relationship details
      relationshipType: relationshipType,
      label: edge.label || relationshipType,
      
      // Strength and confidence metrics
      confidence: confidence,
      weight: edge.weight || confidence,
      strength: edge.strength || confidence,
      riskWeight: riskWeight,
      
      // Direction and verification
      bidirectional: bidirectional,
      direction: edge.direction || (bidirectional ? 'bidirectional' : 'directed'),
      verified: edge.verified !== false,
      active: edge.active !== false,
      
      // Visual properties for styling functions
      color: edgeColor,
      
      // Evidence and metadata
      evidence: edge.evidence || [],
      datasource: edge.datasource,
      
      // Additional metadata for analysis
      metadata: {
        confidenceCategory: getConfidenceCategory(confidence),
        riskCategory: getRiskCategory(riskWeight * 100),
        relationshipCategory: getRelationshipCategory(relationshipType),
        
        // Risk propagation analysis
        riskPropagationScore: calculateRiskPropagationScore(riskWeight, confidence),
        
        // Suspicious pattern flags
        isSuspicious: riskWeight > 0.8 || 
                     relationshipType.includes('suspected') ||
                     relationshipType.includes('high_risk')
      }
    };

    // For bidirectional relationships, create two edges (one in each direction)
    if (bidirectional) {
      // Forward edge
      elements.push({
        data: {
          id: edge.id,
          source: edge.source,
          target: edge.target,
          ...baseEdgeData
        },
        classes: edgeClasses.filter(c => c !== 'bidirectional').join(' ') + ' directed'
      });
      
      // Reverse edge
      elements.push({
        data: {
          id: edge.id + '_reverse',
          source: edge.target,
          target: edge.source,
          ...baseEdgeData
        },
        classes: edgeClasses.filter(c => c !== 'bidirectional').join(' ') + ' directed'
      });
    } else {
      // Single directed edge
      elements.push({
        data: {
          id: edge.id,
          source: edge.source,
          target: edge.target,
          ...baseEdgeData
        },
        classes: edgeClasses.join(' ')
      });
    }
  });

  const nodeCount = networkData.nodes.length;
  const edgeCount = elements.filter(el => el.data.source).length;
  console.log(`Transformed ${nodeCount} nodes and ${networkData.edges.length} edges into ${edgeCount} Cytoscape edges`);
  
  // Debug: Log edge directions for investigation
  console.log('🔍 Edge Direction Debug:');
  networkData.edges.slice(0, 5).forEach(edge => {
    const isBidirectional = edge.bidirectional || edge.direction === 'bidirectional';
    console.log(`${edge.relationshipType || edge.type}: ${edge.source} ${isBidirectional ? '⟷' : '→'} ${edge.target}`, {
      bidirectional: isBidirectional,
      direction: edge.direction,
      edgesCreated: isBidirectional ? 2 : 1
    });
  });
  
  return elements;
};

// ========== HELPER FUNCTIONS ==========

/**
 * Format node label for display (truncate if too long)
 */
const formatNodeLabel = (label, maxLength = 15) => {
  if (!label) return 'Unknown';
  return label.length > maxLength ? label.substring(0, maxLength - 3) + '...' : label;
};

/**
 * Calculate prominence score combining centrality, betweenness, and risk
 */
const calculateProminenceScore = (centrality = 0, betweenness = 0, riskScore = 0) => {
  return (centrality * 0.4) + (betweenness * 0.3) + ((riskScore / 100) * 0.3);
};

/**
 * Get centrality badge for high-prominence nodes
 */
const getCentralityBadge = (centrality = 0, betweenness = 0) => {
  if (centrality > 0.7) {
    return `★${(centrality * 100).toFixed(0)}%`;
  } else if (betweenness > 0.5) {
    return `◆${(betweenness * 100).toFixed(0)}%`;
  }
  return '';
};

/**
 * Get node color based on risk score and level
 */
const getNodeColor = (riskScore = 0, riskLevel = '') => {
  const level = riskLevel.toLowerCase();
  
  if (level.includes('critical') || riskScore > 90) {
    return COLOR_SCHEME.risk.critical;
  } else if (level.includes('high') || riskScore > 70) {
    return COLOR_SCHEME.risk.high;
  } else if (level.includes('medium') || riskScore > 40) {
    return COLOR_SCHEME.risk.medium;
  } else {
    return COLOR_SCHEME.risk.low;
  }
};

/**
 * Get edge color based on relationship type and risk
 */
const getEdgeColor = (relationshipType = '', riskWeight = 0.5, confidence = 0.5) => {
  const type = relationshipType.toLowerCase();
  
  // High-risk relationship types
  if (type.includes('suspected') || type.includes('high_risk') || riskWeight > 0.7) {
    return COLOR_SCHEME.relationships.highRisk;
  }
  
  // Corporate structure relationships
  if (type.includes('director') || type.includes('ubo') || type.includes('parent')) {
    return COLOR_SCHEME.relationships.corporate;
  }
  
  // Confirmed same entity
  if (type.includes('confirmed') || type.includes('same_entity')) {
    return COLOR_SCHEME.relationships.confirmed;
  }
  
  // Household relationships
  if (type.includes('household') || type.includes('family')) {
    return COLOR_SCHEME.relationships.household;
  }
  
  // Public relationships
  if (type.includes('public') || type.includes('social_media')) {
    return COLOR_SCHEME.relationships.public;
  }
  
  // Default color with confidence-based opacity
  const baseColor = '#5C6C7C';
  const alpha = Math.max(0.6, confidence);
  return `${baseColor}${Math.round(alpha * 255).toString(16).padStart(2, '0')}`;
};

/**
 * Get relationship type CSS class
 */
const getRelationshipTypeClass = (relationshipType = '') => {
  const type = relationshipType.toLowerCase();
  
  if (type.includes('director') || type.includes('ubo') || type.includes('parent')) {
    return 'corporate-structure';
  } else if (type.includes('suspected') || type.includes('high_risk')) {
    return 'high-risk-relationship';
  } else if (type.includes('household') || type.includes('family')) {
    return 'household-relationship';
  } else if (type.includes('public') || type.includes('social_media')) {
    return 'public-relationship';
  } else if (type.includes('confirmed') || type.includes('same_entity')) {
    return 'confirmed-relationship';
  }
  
  return 'general-relationship';
};

/**
 * Classification helper functions
 */
const getRiskLevelFromScore = (score) => {
  if (score > 90) return 'critical';
  if (score > 70) return 'high';
  if (score > 40) return 'medium';
  return 'low';
};

const getRiskCategory = (score) => {
  if (score > 70) return 'high';
  if (score > 40) return 'medium';
  return 'low';
};

const getCentralityCategory = (centrality) => {
  if (centrality > 0.7) return 'high';
  if (centrality > 0.4) return 'medium';
  return 'low';
};

const getBetweennessCategory = (betweenness) => {
  if (betweenness > 0.5) return 'bridge';
  if (betweenness > 0.2) return 'connector';
  return 'terminal';
};

const getConfidenceCategory = (confidence) => {
  if (confidence > 0.8) return 'high';
  if (confidence > 0.6) return 'medium';
  return 'low';
};

const getRelationshipCategory = (relationshipType) => {
  const type = relationshipType.toLowerCase();
  
  if (type.includes('director') || type.includes('ubo') || type.includes('parent')) {
    return 'corporate';
  } else if (type.includes('suspected') || type.includes('high_risk')) {
    return 'suspicious';
  } else if (type.includes('household') || type.includes('family')) {
    return 'household';
  } else if (type.includes('confirmed') || type.includes('same_entity')) {
    return 'confirmed';
  }
  
  return 'general';
};

const calculateRiskPropagationScore = (riskWeight, confidence) => {
  // Risk propagation is higher when both risk weight and confidence are high
  return (riskWeight * 0.7) + (confidence * 0.3);
};

/**
 * Get network statistics from transformed elements
 */
export const getNetworkStatistics = (elements) => {
  const nodes = elements.filter(el => !el.data.source);
  const edges = elements.filter(el => el.data.source);
  
  // Risk distribution
  const riskDistribution = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0
  };
  
  // Centrality analysis
  let totalCentrality = 0;
  let highCentralityCount = 0;
  let bridgeNodeCount = 0;
  
  nodes.forEach(node => {
    const riskScore = node.data.riskScore || 0;
    const centrality = node.data.centrality || 0;
    const betweenness = node.data.betweenness || 0;
    
    // Risk distribution
    if (riskScore > 90) riskDistribution.critical++;
    else if (riskScore > 70) riskDistribution.high++;
    else if (riskScore > 40) riskDistribution.medium++;
    else riskDistribution.low++;
    
    // Centrality analysis
    totalCentrality += centrality;
    if (centrality > 0.7) highCentralityCount++;
    if (betweenness > 0.5) bridgeNodeCount++;
  });
  
  // Edge analysis
  const bidirectionalCount = edges.filter(edge => edge.data.bidirectional).length;
  const highRiskEdgeCount = edges.filter(edge => (edge.data.riskWeight || 0) > 0.7).length;
  
  return {
    totalNodes: nodes.length,
    totalEdges: edges.length,
    averageCentrality: nodes.length > 0 ? totalCentrality / nodes.length : 0,
    highCentralityNodes: highCentralityCount,
    bridgeNodes: bridgeNodeCount,
    bidirectionalRelationships: bidirectionalCount,
    highRiskRelationships: highRiskEdgeCount,
    riskDistribution,
    density: nodes.length > 1 ? edges.length / (nodes.length * (nodes.length - 1) / 2) : 0
  };
};