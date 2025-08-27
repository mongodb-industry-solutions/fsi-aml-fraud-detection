/**
 * Enhanced Entity Resolution API Service
 * 
 * Comprehensive API client for next-generation entity resolution
 * with parallel search, network analysis, and intelligent classification
 */

const AML_BACKEND_URL = process.env.NEXT_PUBLIC_AML_API_URL || 'https://threatsight-aml.api.mongodb-industry-solutions.com';

class EnhancedEntityResolutionAPI {
  constructor() {
    this.baseURL = AML_BACKEND_URL;
  }

  /**
   * Perform parallel Atlas and Vector search with intelligence correlation
   */
  async performParallelSearch(entityData) {
    try {
      console.log('🔍 Enhanced Entity Resolution: Performing parallel search for:', entityData);
      
      const response = await fetch(`${this.baseURL}/api/v1/resolution/comprehensive-search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          entity: entityData,
          searchConfig: {
            enableAtlasSearch: true,
            enableVectorSearch: true,
            maxResults: 10,
            confidenceThreshold: 0.3,
            includeNetworkHints: true
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Parallel search failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('✅ Parallel search completed:', data);
      
      return {
        atlasResults: data.atlasResults || [],
        vectorResults: data.vectorResults || [],
        hybridResults: data.hybridResults || [],
        searchMetrics: data.searchMetrics || {}
      };
      
    } catch (error) {
      console.error('❌ Parallel search failed:', error);
      throw error;
    }
  }

  // Intelligence analysis removed to create more space for search results

  /**
   * Perform graph traversal and network analysis
   */
  async performNetworkAnalysis(entityData, topMatches) {
    try {
      console.log('🕸️ Enhanced Entity Resolution: Performing network analysis');
      
      const response = await fetch(`${this.baseURL}/api/v1/resolution/network-analysis`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          centerEntity: entityData,
          relatedEntities: topMatches,
          analysisConfig: {
            maxDepth: 3,
            minConfidence: 0.5,
            includeRiskPropagation: true,
            enableCentralityMetrics: true,
            maxNodes: 100
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Network analysis failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('✅ Network analysis completed:', data);
      
      return {
        networkData: data.networkData || { nodes: [], edges: [] },
        centralityMetrics: data.centralityMetrics || {},
        riskPropagation: data.riskPropagation || {},
        networkStatistics: data.networkStatistics || {},
        hubEntities: data.hubEntities || [],
        riskClusters: data.riskClusters || []
      };
      
    } catch (error) {
      console.error('❌ Network analysis failed:', error);
      throw error;
    }
  }

  /**
   * Classify entity based on comprehensive analysis
   */
  async classifyEntity(entityData, searchResults, intelligence, networkAnalysis) {
    try {
      console.log('🏷️ Enhanced Entity Resolution: Classifying entity');
      
      const response = await fetch(`${this.baseURL}/api/v1/resolution/classify-entity`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          entity: entityData,
          searchResults,
          intelligence,
          networkAnalysis,
          classificationConfig: {
            enableRiskScoring: true,
            enableDuplicateDetection: true,
            enableSuspiciousPatternDetection: true,
            confidenceThreshold: 0.7
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Entity classification failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('✅ Entity classification completed:', data);
      
      return {
        classification: data.classification || 'UNKNOWN', // SAFE, DUPLICATE, RISKY
        confidence: data.confidence || 0,
        riskScore: data.riskScore || 0,
        riskFactors: data.riskFactors || [],
        duplicateProbability: data.duplicateProbability || 0,
        suspiciousIndicators: data.suspiciousIndicators || [],
        reasoning: data.reasoning || '',
        recommendations: data.recommendations || [],
        nextSteps: data.nextSteps || []
      };
      
    } catch (error) {
      console.error('❌ Entity classification failed:', error);
      throw error;
    }
  }

  /**
   * Perform deep investigation with comprehensive analysis
   */
  async performDeepInvestigation(workflowData) {
    try {
      console.log('🔬 Enhanced Entity Resolution: Performing deep investigation');
      
      const response = await fetch(`${this.baseURL}/api/v1/resolution/deep-investigation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          workflowData,
          investigationConfig: {
            enableComprehensiveAnalysis: true,
            enableTimelineAnalysis: true,
            enablePatternCorrelation: true,
            enableRiskProjection: true,
            includeRecommendations: true
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Deep investigation failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('✅ Deep investigation completed:', data);
      
      return {
        investigationReport: data.investigationReport || {},
        timelineAnalysis: data.timelineAnalysis || [],
        patternCorrelations: data.patternCorrelations || [],
        riskProjections: data.riskProjections || {},
        detailedFindings: data.detailedFindings || [],
        expertRecommendations: data.expertRecommendations || [],
        complianceAssessment: data.complianceAssessment || {},
        actionableInsights: data.actionableInsights || []
      };
      
    } catch (error) {
      console.error('❌ Deep investigation failed:', error);
      throw error;
    }
  }

  /**
   * Get enhanced demo scenarios for testing
   */
  async getDemoScenarios() {
    try {
      const response = await fetch(`${this.baseURL}/api/v1/resolution/demo-scenarios-enhanced`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch demo scenarios: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data.scenarios || [];
      
    } catch (error) {
      console.error('❌ Failed to fetch demo scenarios:', error);
      // Return fallback demo scenarios
      return this.getFallbackDemoScenarios();
    }
  }

  /**
   * Fallback demo scenarios for offline development
   */
  getFallbackDemoScenarios() {
    return [
      {
        id: 'enhanced_safe_individual',
        name: 'Safe Individual - Low Risk',
        description: 'Clean individual with no risk indicators',
        entityData: {
          fullName: 'Jennifer Sarah Wilson',
          dateOfBirth: '1985-03-15',
          address: '123 Oak Street, Portland, OR 97201',
          primaryIdentifier: 'SSN:555-12-3456',
          entityType: 'individual'
        },
        expectedClassification: 'SAFE',
        networkComplexity: 'simple'
      },
      {
        id: 'enhanced_duplicate_individual', 
        name: 'Potential Duplicate - High Similarity',
        description: 'Individual with high similarity to existing record',
        entityData: {
          fullName: 'Robert J. Smith',
          dateOfBirth: '1975-08-22',
          address: '456 Pine Ave, Seattle, WA 98101',
          primaryIdentifier: 'DL:WA-567890123',
          entityType: 'individual'
        },
        expectedClassification: 'DUPLICATE',
        networkComplexity: 'moderate'
      },
      {
        id: 'enhanced_risky_individual',
        name: 'High Risk Individual - Multiple Indicators',
        description: 'Individual with multiple risk factors and suspicious network',
        entityData: {
          fullName: 'Alexander Petrov',
          dateOfBirth: '1970-12-01',
          address: '789 International Blvd, Miami, FL 33101',
          primaryIdentifier: 'PASSPORT:555123456',
          entityType: 'individual'
        },
        expectedClassification: 'RISKY',
        networkComplexity: 'complex'
      },
      {
        id: 'enhanced_complex_organization',
        name: 'Complex Corporate Structure',
        description: 'Organization with intricate ownership network',
        entityData: {
          fullName: 'Global Trading Solutions LLC',
          entityType: 'organization',
          address: '1000 Corporate Plaza, New York, NY 10001',
          primaryIdentifier: 'EIN:12-3456789'
        },
        expectedClassification: 'RISKY',
        networkComplexity: 'very_complex'
      }
    ];
  }

  /**
   * Analyze network risks for the first entity from hybrid search results
   * 
   * This method implements the enhanced network risk analysis that targets
   * the top-ranked entity from hybrid search results instead of the input entity.
   */
  async analyzeHybridNetworkRisk(requestData) {
    try {
      console.log('🔍 Enhanced Entity Resolution: Performing hybrid network risk analysis for:', requestData);
      
      const response = await fetch(`${this.baseURL}/api/v1/resolution/hybrid-network-risk-analysis`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData)
      });

      if (!response.ok) {
        throw new Error(`Hybrid network risk analysis failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('✅ Hybrid network risk analysis completed:', data);
      
      return {
        success: data.success,
        targetEntity: data.target_entity,
        networkData: data.network_data,  // Add network data for visualization
        comprehensiveRiskAnalysis: data.comprehensive_risk_analysis,
        relationshipAnalysis: data.relationship_analysis,
        transactionAnalysis: data.transaction_analysis,  // Add transaction analysis
        centralityAnalysis: data.centrality_analysis,
        suspiciousPatterns: data.suspicious_patterns,
        problematicRelationships: data.problematic_relationships,
        recommendations: data.recommendations,
        analysisMetadata: data.analysis_metadata
      };
      
    } catch (error) {
      console.error('❌ Hybrid network risk analysis failed:', error);
      throw error;
    }
  }

  /**
   * Utility method for handling API errors
   */
  handleAPIError(error, context) {
    console.error(`❌ Enhanced Entity Resolution API Error [${context}]:`, error);
    
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error(`Cannot connect to AML backend at ${this.baseURL}. Please ensure the backend is running.`);
    }
    
    throw error;
  }
}

// Create singleton instance
export const enhancedEntityResolutionAPI = new EnhancedEntityResolutionAPI();

// Export individual methods for convenience
export const {
  performParallelSearch,
  performNetworkAnalysis,
  classifyEntity,
  performDeepInvestigation,
  getDemoScenarios
} = enhancedEntityResolutionAPI;

export default enhancedEntityResolutionAPI;