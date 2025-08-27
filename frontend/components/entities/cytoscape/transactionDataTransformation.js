/**
 * Transaction Network Data Transformation
 * 
 * Transforms transaction network data from backend into Cytoscape format
 * with sophisticated styling classes and metadata for transaction analysis.
 */

import { TRANSACTION_COLOR_SCHEME } from './transactionNetworkStyles';

/**
 * Transform transaction network data to Cytoscape elements format
 * @param {Object} networkData - Raw transaction network data from backend
 * @param {string} centerEntityId - ID of the center entity for special styling
 * @returns {Array} Cytoscape elements array
 */
export const transformTransactionNetworkToCytoscape = (networkData, centerEntityId = null) => {
  console.log('🚀 transformTransactionNetworkToCytoscape called with:', networkData);
  
  if (!networkData || !networkData.nodes || !networkData.edges) {
    console.log('❌ No valid transaction network data provided:', networkData);
    return [];
  }

  console.log(`📊 Processing ${networkData.nodes?.length} nodes and ${networkData.edges?.length} edges`);
  const elements = [];

  // ========== TRANSFORM TRANSACTION NODES ==========
  networkData.nodes.forEach(node => {
    // Calculate total transaction volume
    const totalVolume = (node.total_sent || 0) + (node.total_received || 0);
    const transactionCount = node.transaction_count || 0;
    const avgRiskScore = node.avg_risk_score || 0;
    
    // Determine volume classification
    let volumeLevel = 'low-volume';
    if (totalVolume > 1000000) volumeLevel = 'high-volume';        // $1M+
    else if (totalVolume > 100000) volumeLevel = 'medium-volume';  // $100K+
    
    // Determine risk classification
    let riskLevel = '';
    if (avgRiskScore >= 60) riskLevel = 'high-risk';
    else if (avgRiskScore >= 40) riskLevel = 'medium-risk';
    
    // Entity type classification
    const entityType = (node.entity_type || 'individual').toLowerCase();
    
    // Build CSS classes for styling
    const nodeClasses = [
      volumeLevel,
      entityType,
      riskLevel
    ].filter(Boolean);

    // Add center entity class if applicable
    if (node.entity_id === centerEntityId) {
      nodeClasses.push('center-entity');
    }

    // Format entity name for display
    const displayName = formatEntityName(node.entity_name || 'Unknown Entity');
    
    // Create Cytoscape node element
    elements.push({
      data: {
        // Basic identification
        id: node.entity_id,
        label: displayName,
        
        // Transaction-specific data
        totalVolume: totalVolume,
        totalSent: node.total_sent || 0,
        totalReceived: node.total_received || 0,
        transactionCount: transactionCount,
        avgRiskScore: avgRiskScore,
        entityType: entityType,
        
        // Display metadata
        fullName: node.entity_name,
        entityId: node.entity_id,
        
        // Volume metrics for sizing
        volumeScore: calculateVolumeScore(totalVolume, transactionCount),
        riskCategory: getRiskCategory(avgRiskScore),
        volumeCategory: getVolumeCategory(totalVolume),
        
        // Color coding
        color: getNodeColor(volumeLevel, avgRiskScore),
        
        // Additional metadata
        metadata: {
          isCenter: node.entity_id === centerEntityId,
          volumeFormatted: formatCurrency(totalVolume),
          sentFormatted: formatCurrency(node.total_sent || 0),
          receivedFormatted: formatCurrency(node.total_received || 0),
          transactionCountFormatted: formatTransactionCount(transactionCount),
          riskLevelText: getRiskLevelText(avgRiskScore)
        }
      },
      classes: nodeClasses.join(' ')
    });
  });

  // ========== TRANSFORM TRANSACTION EDGES ==========
  console.log('🔗 Starting transaction edge transformation...');
  networkData.edges.forEach((edge, index) => {
    if (index < 3) {
      console.log(`🔍 Edge ${index}:`, edge);
    }
    
    const totalAmount = edge.total_amount || 0;
    const transactionCount = edge.transaction_count || 1;
    const avgRiskScore = edge.avg_risk_score || 0;
    const primaryType = edge.primary_transaction_type || 'transfer';
    
    // Value classification
    let valueLevel = 'low-value';
    if (totalAmount > 500000) valueLevel = 'high-value';        // $500K+
    else if (totalAmount > 50000) valueLevel = 'medium-value';  // $50K+
    
    // Risk classification with more granular levels
    let riskClass = '';
    if (avgRiskScore >= 80) riskClass = 'risk-critical';
    else if (avgRiskScore >= 60) riskClass = 'risk-high';
    else if (avgRiskScore >= 40) riskClass = 'risk-medium';
    else if (avgRiskScore >= 20) riskClass = 'risk-low-medium';
    
    // Transaction pattern analysis
    let patternClasses = [];
    if (transactionCount >= 10) patternClasses.push('multiple-transactions');
    if (avgRiskScore >= 70 || primaryType.includes('cash')) patternClasses.push('suspicious');
    
    // Build CSS classes for styling
    const edgeClasses = [
      valueLevel,
      riskClass,
      ...patternClasses,
      getTransactionTypeClass(primaryType)
    ].filter(Boolean);

    // Get edge color based on transaction type and risk
    const edgeColor = getEdgeColor(primaryType, avgRiskScore, totalAmount);
    
    // Create transaction edge data
    const edgeData = {
      // Flow details
      fromEntityId: edge.from_entity_id,
      toEntityId: edge.to_entity_id,
      
      // Transaction metrics
      transactionCount: transactionCount,
      totalAmount: totalAmount,
      avgAmount: edge.avg_amount || 0,
      avgRiskScore: avgRiskScore,
      primaryTransactionType: primaryType,
      currency: edge.currency || 'USD',
      
      // Temporal data
      latestTransaction: edge.latest_transaction,
      
      // Visual properties
      color: edgeColor,
      
      // Display formatting
      label: formatEdgeLabel(transactionCount, primaryType),
      
      // Metadata for analysis
      metadata: {
        totalAmountFormatted: formatCurrency(totalAmount),
        avgAmountFormatted: formatCurrency(edge.avg_amount || 0),
        transactionCountText: formatTransactionCount(transactionCount),
        riskLevelText: getRiskLevelText(avgRiskScore),
        typeDisplayName: getTransactionTypeDisplayName(primaryType),
        valueCategory: getValueCategory(totalAmount),
        riskCategory: getRiskCategory(avgRiskScore),
        latestTransactionFormatted: formatDate(edge.latest_transaction)
      }
    };

    // Create Cytoscape edge element
    elements.push({
      data: {
        id: `${edge.from_entity_id}-${edge.to_entity_id}`,
        source: edge.from_entity_id,
        target: edge.to_entity_id,
        ...edgeData
      },
      classes: edgeClasses.join(' ')
    });
  });

  const nodeCount = networkData.nodes.length;
  const edgeCount = networkData.edges.length;
  console.log(`✅ Transformed ${nodeCount} nodes and ${edgeCount} transaction flows`);
  
  return elements;
};

// ========== HELPER FUNCTIONS ==========

/**
 * Format entity name for display (truncate if too long)
 */
const formatEntityName = (name, maxLength = 20) => {
  if (!name) return 'Unknown Entity';
  return name.length > maxLength ? name.substring(0, maxLength - 3) + '...' : name;
};

/**
 * Calculate volume score for node sizing
 */
const calculateVolumeScore = (totalVolume, transactionCount) => {
  const volumeScore = Math.log(totalVolume + 1) / 25;
  const countScore = Math.log(transactionCount + 1) / 10;
  return volumeScore + countScore;
};

/**
 * Get node color based on volume and risk
 */
const getNodeColor = (volumeLevel, riskScore) => {
  // Risk override for high-risk entities
  if (riskScore >= 60) {
    return TRANSACTION_COLOR_SCHEME.risk.high;
  }
  
  // Volume-based coloring
  if (volumeLevel === 'high-volume') {
    return TRANSACTION_COLOR_SCHEME.volume.high;
  } else if (volumeLevel === 'medium-volume') {
    return TRANSACTION_COLOR_SCHEME.volume.medium;
  } else {
    return TRANSACTION_COLOR_SCHEME.volume.low;
  }
};

/**
 * Get edge color based on transaction risk (prioritized) and type
 */
const getEdgeColor = (transactionType, riskScore, totalAmount) => {
  // PRIMARY: Risk-based coloring (takes priority)
  if (riskScore >= 80) {
    return '#B91C1C'; // Dark red for critical risk
  } else if (riskScore >= 60) {
    return TRANSACTION_COLOR_SCHEME.risk.high; // Red for high risk
  } else if (riskScore >= 40) {
    return TRANSACTION_COLOR_SCHEME.risk.medium; // Amber for medium risk
  } else if (riskScore >= 20) {
    return '#F97316'; // Orange for low-medium risk
  }
  
  // SECONDARY: Transaction type specific coloring for low-risk transactions
  const type = transactionType.toLowerCase();
  
  if (type.includes('wire')) {
    return TRANSACTION_COLOR_SCHEME.transactionTypes.wire;
  } else if (type.includes('ach')) {
    return TRANSACTION_COLOR_SCHEME.transactionTypes.ach;
  } else if (type.includes('check')) {
    return TRANSACTION_COLOR_SCHEME.transactionTypes.check;
  } else if (type.includes('cash')) {
    return '#F59E0B'; // Always amber for cash (higher scrutiny)
  } else if (type.includes('crypto')) {
    return TRANSACTION_COLOR_SCHEME.transactionTypes.crypto;
  } else if (type.includes('consulting')) {
    return TRANSACTION_COLOR_SCHEME.transactionTypes.consulting;
  }
  
  // Default: Low risk green
  return TRANSACTION_COLOR_SCHEME.risk.low;
};

/**
 * Get transaction type CSS class
 */
const getTransactionTypeClass = (transactionType) => {
  const type = transactionType.toLowerCase();
  
  if (type.includes('wire')) return 'wire-transfer';
  if (type.includes('ach')) return 'ach-transfer';
  if (type.includes('check')) return 'check-payment';
  if (type.includes('cash')) return 'cash-transaction';
  if (type.includes('crypto')) return 'crypto-transaction';
  if (type.includes('consulting')) return 'consulting-fee';
  
  return 'general-transaction';
};

/**
 * Format edge label for display
 */
const formatEdgeLabel = (count, transactionType) => {
  if (count > 1) {
    return `${count} ${getTransactionTypeShortName(transactionType)}s`;
  }
  return getTransactionTypeShortName(transactionType);
};

/**
 * Get short name for transaction type
 */
const getTransactionTypeShortName = (transactionType) => {
  const type = transactionType.toLowerCase();
  
  if (type.includes('wire')) return 'Wire';
  if (type.includes('ach')) return 'ACH';
  if (type.includes('check')) return 'Check';
  if (type.includes('cash')) return 'Cash';
  if (type.includes('crypto')) return 'Crypto';
  if (type.includes('consulting')) return 'Consult';
  
  return 'Transfer';
};

/**
 * Get display name for transaction type
 */
const getTransactionTypeDisplayName = (transactionType) => {
  const type = transactionType.toLowerCase();
  
  if (type.includes('wire')) return 'Wire Transfer';
  if (type.includes('ach')) return 'ACH Transfer';
  if (type.includes('check')) return 'Check Payment';
  if (type.includes('cash')) return 'Cash Transaction';
  if (type.includes('crypto')) return 'Cryptocurrency';
  if (type.includes('consulting')) return 'Consulting Fee';
  
  return 'Transfer';
};

/**
 * Classification helper functions
 */
const getRiskCategory = (score) => {
  if (score >= 60) return 'high';
  if (score >= 40) return 'medium';
  return 'low';
};

const getVolumeCategory = (volume) => {
  if (volume >= 1000000) return 'high';
  if (volume >= 100000) return 'medium';
  return 'low';
};

const getValueCategory = (amount) => {
  if (amount >= 500000) return 'high';
  if (amount >= 50000) return 'medium';
  return 'low';
};

const getRiskLevelText = (score) => {
  if (score >= 60) return 'High Risk';
  if (score >= 40) return 'Medium Risk';
  return 'Low Risk';
};

/**
 * Formatting helper functions
 */
const formatCurrency = (amount, currency = 'USD') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    notation: 'compact',
    maximumFractionDigits: 1
  }).format(amount);
};

const formatTransactionCount = (count) => {
  if (count === 1) return '1 transaction';
  return `${count.toLocaleString()} transactions`;
};

const formatDate = (dateString) => {
  if (!dateString) return 'Unknown';
  try {
    return new Date(dateString).toLocaleDateString();
  } catch {
    return 'Invalid Date';
  }
};

/**
 * Get transaction network statistics
 */
export const getTransactionNetworkStatistics = (elements) => {
  const nodes = elements.filter(el => !el.data.source);
  const edges = elements.filter(el => el.data.source);
  
  // Volume analysis
  let totalVolume = 0;
  let highVolumeNodes = 0;
  let highRiskNodes = 0;
  let totalTransactions = 0;
  
  nodes.forEach(node => {
    const volume = node.data.totalVolume || 0;
    const riskScore = node.data.avgRiskScore || 0;
    const count = node.data.transactionCount || 0;
    
    totalVolume += volume;
    totalTransactions += count;
    
    if (volume >= 1000000) highVolumeNodes++;
    if (riskScore >= 60) highRiskNodes++;
  });
  
  // Edge analysis
  let highValueEdges = 0;
  let highRiskEdges = 0;
  
  edges.forEach(edge => {
    const amount = edge.data.totalAmount || 0;
    const riskScore = edge.data.avgRiskScore || 0;
    
    if (amount >= 500000) highValueEdges++;
    if (riskScore >= 60) highRiskEdges++;
  });
  
  return {
    totalNodes: nodes.length,
    totalEdges: edges.length,
    totalVolume,
    totalTransactions,
    highVolumeNodes,
    highRiskNodes,
    highValueEdges,
    highRiskEdges,
    averageVolumePerNode: nodes.length > 0 ? totalVolume / nodes.length : 0,
    averageTransactionsPerNode: nodes.length > 0 ? totalTransactions / nodes.length : 0
  };
};