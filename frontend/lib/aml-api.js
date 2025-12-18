/**
 * AML/KYC API Service
 * Handles communication with the AML backend (port 8001)
 */

const AML_API_URL =
  process.env.NEXT_PUBLIC_AML_API_URL ||
  'https://threatsight-aml.api.mongodb-industry-solutions.com';

class AMLAPIError extends Error {
  constructor(message, status, response) {
    super(message);
    this.name = 'AMLAPIError';
    this.status = status;
    this.response = response;
  }
}

/**
 * Generic API request handler with error handling
 */
async function apiRequest(endpoint, options = {}) {
  const url = `${AML_API_URL}${endpoint}`;

  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  try {
    const response = await fetch(url, config);

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new AMLAPIError(
        errorData?.detail ||
          `HTTP ${response.status}: ${response.statusText}`,
        response.status,
        errorData
      );
    }

    return await response.json();
  } catch (error) {
    if (error instanceof AMLAPIError) {
      throw error;
    }

    // Network or other errors
    throw new AMLAPIError(`Network error: ${error.message}`, 0, null);
  }
}

/**
 * AML API functions
 */
export const amlAPI = {
  /**
   * Health check endpoints
   */
  async getHealth() {
    return apiRequest('/health');
  },

  async getStatus() {
    return apiRequest('/');
  },

  /**
   * Entity management
   */
  async getEntities(params = {}) {
    const searchParams = new URLSearchParams();

    // Add pagination parameters
    if (params.skip !== undefined)
      searchParams.append('skip', params.skip);
    if (params.limit !== undefined)
      searchParams.append('limit', params.limit);

    // Add filter parameters
    if (params.entity_type)
      searchParams.append('entity_type', params.entity_type);
    if (params.risk_level)
      searchParams.append('risk_level', params.risk_level);
    if (params.scenario_key)
      searchParams.append('scenario_key', params.scenario_key);
    if (params.status) searchParams.append('status', params.status);

    const query = searchParams.toString();
    const endpoint = query ? `/entities/?${query}` : '/entities/';

    return apiRequest(endpoint);
  },

  async getEntity(entityId) {
    if (!entityId) {
      throw new AMLAPIError('Entity ID is required', 400, null);
    }

    return apiRequest(`/entities/${encodeURIComponent(entityId)}`);
  },

  /**
   * Helper functions for common operations
   */
  async getEntitiesPaginated(page = 1, limit = 20, filters = {}) {
    const skip = (page - 1) * limit;

    return this.getEntities({
      skip,
      limit,
      ...filters,
    });
  },

  async searchEntities(searchTerm, filters = {}) {
    // For now, we'll use basic filtering
    // This can be enhanced when search functionality is added to the backend
    return this.getEntities(filters);
  },

  /**
   * Vector search endpoints
   */
  async findSimilarEntitiesByVector(
    entityId,
    limit = 5,
    filters = {},
    embeddingType = 'identifier'
  ) {
    if (!entityId) {
      throw new AMLAPIError('Entity ID is required', 400, null);
    }

    return apiRequest('/search/vector/find_similar_by_entity', {
      method: 'POST',
      body: JSON.stringify({
        entity_id: entityId,
        limit,
        filters,
        embedding_type: embeddingType,
      }),
    });
  },

  async findSimilarEntitiesByText(
    queryText,
    limit = 5,
    filters = {}
  ) {
    if (!queryText || queryText.trim().length < 10) {
      throw new AMLAPIError(
        'Query text must be at least 10 characters',
        400,
        null
      );
    }

    return apiRequest('/search/vector/find_similar_by_text', {
      method: 'POST',
      body: JSON.stringify({
        query_text: queryText,
        limit,
        filters,
      }),
    });
  },

  async getVectorSearchStats() {
    return apiRequest('/search/vector/stats');
  },

  async demoVectorSearch(scenario, limit = 5) {
    if (!scenario) {
      throw new AMLAPIError('Scenario is required', 400, null);
    }

    return apiRequest('/search/vector/demo', {
      method: 'POST',
      body: JSON.stringify({
        scenario,
        limit,
      }),
    });
  },

  // =====================================
  // ENHANCED NETWORK ANALYSIS FUNCTIONS
  // =====================================

  /**
   * Get enhanced entity network data using modern network analysis endpoints
   */
  async getEntityNetwork(
    entityId,
    maxDepth = 2,
    minStrength = 0.5,
    includeInactive = false,
    maxNodes = 100,
    relationshipTypeFilter = null
  ) {
    if (!entityId) {
      throw new AMLAPIError('Entity ID is required', 400, null);
    }

    const params = new URLSearchParams({
      max_depth: maxDepth.toString(),
      min_strength: minStrength.toString(),
      include_inactive: includeInactive.toString(),
      max_nodes: maxNodes.toString(),
      include_risk_analysis: 'true',
    });

    // Add relationship type filter if specified
    if (relationshipTypeFilter && relationshipTypeFilter !== 'all') {
      params.append(
        'relationship_type_filter',
        relationshipTypeFilter
      );
    }

    return await apiRequest(`/network/${entityId}?${params}`);
  },

  /**
   * Get comprehensive risk propagation analysis for an entity
   */
  async getRiskPropagationAnalysis(
    entityId,
    propagationDepth = 3,
    riskThreshold = 0.6
  ) {
    if (!entityId) {
      throw new AMLAPIError('Entity ID is required', 400, null);
    }

    const params = new URLSearchParams({
      propagation_depth: propagationDepth.toString(),
      risk_threshold: riskThreshold.toString(),
    });

    return await apiRequest(
      `/network/${entityId}/risk_propagation?${params}`
    );
  },

  /**
   * Get network centrality analysis for hub detection
   */
  async getCentralityAnalysis(
    entityId,
    centralityType = 'all',
    networkScope = 3
  ) {
    if (!entityId) {
      throw new AMLAPIError('Entity ID is required', 400, null);
    }

    const params = new URLSearchParams({
      centrality_type: centralityType,
      network_scope: networkScope.toString(),
    });

    return await apiRequest(
      `/network/${entityId}/centrality?${params}`
    );
  },

  /**
   * Detect suspicious patterns in entity network
   */
  async getSuspiciousPatterns(
    entityId,
    patternTypes = null,
    sensitivity = 0.7
  ) {
    if (!entityId) {
      throw new AMLAPIError('Entity ID is required', 400, null);
    }

    const params = new URLSearchParams({
      sensitivity: sensitivity.toString(),
    });

    if (patternTypes && Array.isArray(patternTypes)) {
      params.append('pattern_types', patternTypes.join(','));
    }

    return await apiRequest(
      `/network/${entityId}/suspicious_patterns?${params}`
    );
  },

  /**
   * Detect network communities for clustering analysis
   */
  async getNetworkCommunities(
    entityId,
    algorithm = 'modularity',
    minCommunitySize = 3
  ) {
    if (!entityId) {
      throw new AMLAPIError('Entity ID is required', 400, null);
    }

    const params = new URLSearchParams({
      community_algorithm: algorithm,
      min_community_size: minCommunitySize.toString(),
    });

    return await apiRequest(
      `/network/${entityId}/communities?${params}`
    );
  },

  /**
   * Get optimized network visualization data
   */
  async getNetworkVisualizationData(
    entityId,
    layoutAlgorithm = 'force_directed',
    includeStyling = true,
    optimizeForSize = null
  ) {
    if (!entityId) {
      throw new AMLAPIError('Entity ID is required', 400, null);
    }

    const params = new URLSearchParams({
      layout_algorithm: layoutAlgorithm,
      include_styling: includeStyling.toString(),
    });

    if (optimizeForSize !== null) {
      params.append('optimize_for_size', optimizeForSize.toString());
    }

    return await apiRequest(
      `/network/${entityId}/visualization?${params}`
    );
  },

  /**
   * Get comprehensive network statistics without full network data
   * All calculations performed server-side using MongoDB aggregation
   */
  async getNetworkStatistics(
    entityId,
    maxDepth = 2,
    includeAdvanced = true
  ) {
    if (!entityId) {
      throw new AMLAPIError('Entity ID is required', 400, null);
    }

    const params = new URLSearchParams({
      max_depth: maxDepth.toString(),
      include_advanced: includeAdvanced.toString(),
    });

    return await apiRequest(
      `/network/${entityId}/statistics?${params}`
    );
  },

  /**
   * Get global network statistics and health metrics
   */
  async getGlobalNetworkStats() {
    return await apiRequest('/network/stats/global');
  },

  /**
   * Find relationship paths between two entities
   */
  async getEntityPathAnalysis(
    sourceEntityId,
    targetEntityId,
    maxHops = 4,
    pathType = 'shortest'
  ) {
    if (!sourceEntityId || !targetEntityId) {
      throw new AMLAPIError(
        'Both source and target entity IDs are required',
        400,
        null
      );
    }

    const params = new URLSearchParams({
      target_entity_id: targetEntityId,
      max_hops: maxHops.toString(),
      path_type: pathType,
    });

    return await apiRequest(
      `/network/${sourceEntityId}/paths?${params}`
    );
  },

  // =====================================
  // ATLAS SEARCH FACETED ENDPOINTS
  // =====================================

  /**
   * Perform faceted search with all supported filters and get facet counts
   */
  async facetedEntitySearch(searchRequest = {}) {
    const {
      search_query,
      entity_type,
      risk_level,
      status,
      scenario_key,
      country,
      business_type,
      risk_score_min,
      risk_score_max,
      skip = 0,
      limit = 20,
    } = searchRequest;

    return apiRequest('/search/atlas/faceted', {
      method: 'POST',
      body: JSON.stringify({
        search_query,
        entity_type,
        risk_level,
        status,
        scenario_key,
        country,
        business_type,
        risk_score_min,
        risk_score_max,
        skip,
        limit,
      }),
    });
  },

  /**
   * Get autocomplete suggestions for entity names
   */
  async autocompleteEntityNames(query, limit = 10) {
    if (!query || query.trim().length < 2) {
      return { suggestions: [], query: '', total_suggestions: 0 };
    }

    return apiRequest('/search/atlas/autocomplete', {
      method: 'POST',
      body: JSON.stringify({
        query: query.trim(),
        limit,
      }),
    });
  },

  /**
   * Get available filter options with counts
   */
  async getFilterOptions() {
    return apiRequest('/search/atlas/filters');
  },

  /**
   * Get search statistics and capabilities
   */
  async getSearchStats() {
    return apiRequest('/search/atlas/stats');
  },

  // =====================================
  // ADVANCED INTELLIGENCE & ANALYTICS
  // =====================================

  /**
   * Enhanced unified search combining Atlas + Vector search
   */
  async unifiedIntelligentSearch(
    searchQuery,
    searchFilters = {},
    limit = 20
  ) {
    if (!searchQuery || searchQuery.trim().length < 2) {
      return { entities: [], searchMetadata: { totalResults: 0 } };
    }

    return apiRequest('/search/unified/search', {
      method: 'POST',
      body: JSON.stringify({
        search_query: searchQuery.trim(),
        search_filters: searchFilters,
        limit,
        include_vector_results: true,
        include_atlas_results: true,
      }),
    });
  },

  /**
   * Advanced entity matching using multiple algorithms
   */
  async findAdvancedEntityMatches(
    entityId,
    includeVectorSearch = true,
    includeAtlasSearch = true,
    limit = 10
  ) {
    if (!entityId) {
      throw new AMLAPIError('Entity ID is required', 400, null);
    }

    return apiRequest('/search/unified/entity_matches', {
      method: 'POST',
      body: JSON.stringify({
        entity_id: entityId,
        include_vector_search: includeVectorSearch,
        include_atlas_search: includeAtlasSearch,
        limit,
      }),
    });
  },

  /**
   * Risk intelligence analysis for an entity
   */
  async getRiskIntelligenceAnalysis(entityId) {
    if (!entityId) {
      throw new AMLAPIError('Entity ID is required', 400, null);
    }

    // Combine multiple intelligence sources
    const [networkAnalysis, centralityData, suspiciousPatterns] =
      await Promise.allSettled([
        this.getRiskPropagationAnalysis(entityId),
        this.getCentralityAnalysis(entityId),
        this.getSuspiciousPatterns(entityId),
      ]);

    return {
      entityId,
      riskPropagation:
        networkAnalysis.status === 'fulfilled'
          ? networkAnalysis.value
          : null,
      centralityAnalysis:
        centralityData.status === 'fulfilled'
          ? centralityData.value
          : null,
      suspiciousPatterns:
        suspiciousPatterns.status === 'fulfilled'
          ? suspiciousPatterns.value
          : null,
      analysisTimestamp: new Date().toISOString(),
    };
  },

  /**
   * Comprehensive network investigation for AML workflows
   */
  async getNetworkInvestigationReport(
    entityId,
    investigationScope = 'comprehensive'
  ) {
    if (!entityId) {
      throw new AMLAPIError('Entity ID is required', 400, null);
    }

    const scope = {
      basic: {
        depth: 2,
        includePatterns: false,
        includeCommunities: false,
      },
      standard: {
        depth: 3,
        includePatterns: true,
        includeCommunities: false,
      },
      comprehensive: {
        depth: 4,
        includePatterns: true,
        includeCommunities: true,
      },
    }[investigationScope] || {
      depth: 3,
      includePatterns: true,
      includeCommunities: false,
    };

    const investigations = [
      this.getEntityNetwork(entityId, scope.depth),
      this.getRiskPropagationAnalysis(entityId, scope.depth),
      this.getCentralityAnalysis(entityId),
    ];

    if (scope.includePatterns) {
      investigations.push(this.getSuspiciousPatterns(entityId));
    }

    if (scope.includeCommunities) {
      investigations.push(this.getNetworkCommunities(entityId));
    }

    const results = await Promise.allSettled(investigations);

    return {
      entityId,
      investigationScope,
      networkData:
        results[0].status === 'fulfilled' ? results[0].value : null,
      riskAnalysis:
        results[1].status === 'fulfilled' ? results[1].value : null,
      centralityAnalysis:
        results[2].status === 'fulfilled' ? results[2].value : null,
      suspiciousPatterns:
        scope.includePatterns && results[3]?.status === 'fulfilled'
          ? results[3].value
          : null,
      communityAnalysis:
        scope.includeCommunities && results[4]?.status === 'fulfilled'
          ? results[4].value
          : null,
      investigationTimestamp: new Date().toISOString(),
      investigationId: `INV-${entityId}-${Date.now()}`,
    };
  },

  /**
   * Helper function for paginated faceted search
   */
  async getFacetedEntitiesPaginated(
    page = 1,
    limit = 20,
    filters = {}
  ) {
    const skip = (page - 1) * limit;

    const response = await this.facetedEntitySearch({
      skip,
      limit,
      ...filters,
    });

    return response;
  },

  // =====================================
  // TRANSACTION ANALYSIS FUNCTIONS
  // =====================================

  /**
   * Get transaction activity for an entity
   */
  async getEntityTransactions(entityId, params = {}) {
    if (!entityId) {
      throw new AMLAPIError('Entity ID is required', 400, null);
    }

    const searchParams = new URLSearchParams();
    if (params.limit !== undefined)
      searchParams.append('limit', params.limit);
    if (params.skip !== undefined)
      searchParams.append('skip', params.skip);

    const query = searchParams.toString();
    const endpoint = `/transactions/${entityId}/transactions${
      query ? `?${query}` : ''
    }`;

    return apiRequest(endpoint);
  },

  /**
   * Get transaction network for an entity
   */
  async getEntityTransactionNetwork(entityId, maxDepth = 1) {
    if (!entityId) {
      throw new AMLAPIError('Entity ID is required', 400, null);
    }

    return apiRequest(
      `/transactions/${entityId}/transaction_network?max_depth=${maxDepth}`
    );
  },

  // =====================================
  // ENHANCED RELATIONSHIP UTILITIES
  // =====================================

  /**
   * Enhanced relationship type formatting for AML compliance
   */
  formatRelationshipType(type) {
    const typeMap = {
      // Entity Resolution Types
      confirmed_same_entity: 'Confirmed Same Entity',
      potential_duplicate: 'Potential Duplicate',

      // Corporate Structure Types
      director_of: 'Director Of',
      ubo_of: 'Ultimate Beneficial Owner',
      parent_of_subsidiary: 'Parent/Subsidiary',

      // Household & Personal Types
      household_member: 'Household Member',
      family_member: 'Family Member',

      // High-Risk Network Types
      business_associate_suspected: 'Business Associate (Suspected)',
      potential_beneficial_owner_of: 'Potential Beneficial Owner',
      transactional_counterparty_high_risk: 'High-Risk Counterparty',

      // Public/Generic Types
      professional_colleague_public: 'Professional Colleague',
      social_media_connection_public: 'Social Media Connection',

      // Legacy Types (for backward compatibility)
      business_associate: 'Business Associate',
      shared_address: 'Shared Address',
      shared_identifier: 'Shared Identifier',
      transaction_counterparty: 'Transaction Partner',
      corporate_structure: 'Corporate Structure',
    };

    return (
      typeMap[type] ||
      type
        ?.replace(/_/g, ' ')
        .replace(/\b\w/g, (l) => l.toUpperCase()) ||
      'Unknown'
    );
  },

  /**
   * Get relationship risk category for AML analysis
   */
  getRelationshipRiskCategory(type) {
    const riskMap = {
      // High Risk - Identity fraud and high-risk associations
      confirmed_same_entity: 'high',
      business_associate_suspected: 'high',
      potential_beneficial_owner_of: 'high',
      transactional_counterparty_high_risk: 'high',

      // Medium Risk - Corporate structure and potential duplicates
      director_of: 'medium',
      ubo_of: 'medium',
      parent_of_subsidiary: 'medium',
      potential_duplicate: 'medium',
      shared_identifier: 'medium',

      // Low Risk - Household and verified public connections
      household_member: 'low',
      family_member: 'low',
      professional_colleague_public: 'low',
      social_media_connection_public: 'low',

      // Legacy mapping
      business_associate: 'medium',
      shared_address: 'low',
      transaction_counterparty: 'medium',
      corporate_structure: 'medium',
    };

    return riskMap[type] || 'unknown';
  },

  /**
   * Enhanced relationship strength assessment
   */
  getRelationshipStrengthText(strength) {
    if (strength >= 0.95) return 'Definitive';
    if (strength >= 0.85) return 'Very Strong';
    if (strength >= 0.7) return 'Strong';
    if (strength >= 0.55) return 'Medium';
    if (strength >= 0.4) return 'Weak';
    if (strength >= 0.25) return 'Very Weak';
    return 'Minimal';
  },

  /**
   * Enhanced relationship color coding for AML workflows
   */
  getRelationshipColor(type) {
    const colorMap = {
      // Entity Resolution (Green spectrum)
      confirmed_same_entity: '#27AE60',
      potential_duplicate: '#E67E22',

      // Corporate Structure (Blue spectrum)
      director_of: '#3498DB',
      ubo_of: '#2E86C1',
      parent_of_subsidiary: '#5DADE2',

      // Household (Purple spectrum)
      household_member: '#8E44AD',
      family_member: '#9B59B6',

      // High-Risk Network (Red spectrum)
      business_associate_suspected: '#E74C3C',
      potential_beneficial_owner_of: '#C0392B',
      transactional_counterparty_high_risk: '#A93226',

      // Public/Generic (Teal spectrum)
      professional_colleague_public: '#16A085',
      social_media_connection_public: '#48C9B0',

      // Legacy support
      business_associate: '#3F73F4',
      shared_address: '#00B4B8',
      shared_identifier: '#F94144',
      transaction_counterparty: '#F3922B',
      corporate_structure: '#5C6C7C',
    };

    return colorMap[type] || '#89979B';
  },

  // ==================== LLM CLASSIFICATION API ====================

  /**
   * Stream entity classification with real-time transparency and progress updates
   * REPLACES: Old synchronous classifyEntity method
   *
   * @param {Object} workflowData - Complete workflow data from entity resolution steps 0-2
   * @param {Function} onStreamEvent - Event handler for streaming updates
   * @param {Object} options - Configuration options
   * @param {string} options.model_preference - AWS Bedrock model (default: claude-3-sonnet)
   * @param {string} options.analysis_depth - Analysis depth: basic, standard, comprehensive
   * @param {AbortSignal} options.signal - AbortController signal for cancellation
   * @returns {Promise<Object>} Final classification result when streaming completes
   */
  async classifyEntityStreaming(
    workflowData,
    onStreamEvent,
    options = {}
  ) {
    const {
      model_preference = 'claude-3-sonnet',
      analysis_depth = 'comprehensive',
      signal = null,
    } = options;

    try {
      console.log('🧠 Starting streaming entity classification...', {
        workflowDataKeys: Object.keys(workflowData),
        model_preference,
        analysis_depth,
        streaming: true,
      });

      // Validate required parameters
      if (!onStreamEvent || typeof onStreamEvent !== 'function') {
        throw new AMLAPIError(
          'onStreamEvent callback function is required',
          400,
          null
        );
      }

      if (
        !workflowData ||
        !workflowData.entityInput ||
        !workflowData.searchResults
      ) {
        throw new AMLAPIError(
          'Invalid workflow data - missing entityInput or searchResults',
          400,
          null
        );
      }

      // Start Server-Sent Events stream
      const response = await fetch(
        `${AML_API_URL}/llm/classification/classify-entity`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            workflow_data: workflowData,
            model_preference,
            analysis_depth,
          }),
          signal, // Support cancellation
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new AMLAPIError(
          errorData?.detail ||
            `HTTP ${response.status}: ${response.statusText}`,
          response.status,
          errorData
        );
      }

      // Process Server-Sent Events stream
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      try {
        while (true) {
          const { done, value } = await reader.read();

          if (done) {
            console.log(
              '📡 Streaming classification completed - connection closed'
            );
            break;
          }

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop(); // Keep incomplete line in buffer

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const eventData = JSON.parse(line.slice(6));
                console.log(
                  `📡 Stream event received: ${eventData.type}`
                );

                // Call event handler
                await onStreamEvent(eventData);

                // Return final result when complete
                if (eventData.type === 'classification_complete') {
                  console.log(
                    '✅ Streaming classification completed successfully:',
                    {
                      riskScore: eventData.data.result?.risk_score,
                      recommendedAction:
                        eventData.data.result?.recommended_action,
                      totalTime: eventData.data.total_time_seconds,
                    }
                  );

                  return {
                    success: true,
                    result: eventData.data.result,
                    streaming: true,
                    total_time: eventData.data.total_time_seconds,
                    performance_metrics:
                      eventData.data.performance_metrics,
                  };
                }

                // Handle streaming errors
                if (eventData.type === 'error') {
                  throw new AMLAPIError(
                    eventData.data.error_message,
                    500,
                    eventData.data
                  );
                }
              } catch (parseError) {
                console.warn(
                  'Failed to parse stream event:',
                  parseError,
                  'Line:',
                  line
                );
                // Continue processing other events
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
    } catch (error) {
      // Check if this is an abort/cancel operation (expected cleanup)
      const isAbortError =
        error.name === 'AbortError' ||
        error.message === 'Component unmounted' ||
        error.message === 'User cancelled streaming' ||
        error.message?.includes('aborted') ||
        error.message?.includes('unmounted') ||
        error.code === 'ABORT_ERR' ||
        (typeof error === 'string' &&
          (error.includes('unmounted') || error.includes('aborted')));

      if (isAbortError) {
        console.log(
          '🛑 Streaming classification cancelled:',
          error.message || error.name
        );
        // Don't throw abort errors - they are expected cleanup
        return {
          success: false,
          cancelled: true,
          reason: error.message || 'Operation cancelled',
        };
      } else {
        console.error('❌ Streaming classification failed:', error);

        // Call error handler only for real errors
        if (onStreamEvent) {
          try {
            await onStreamEvent({
              type: 'error',
              timestamp: new Date().toISOString(),
              data: {
                error_message: error.message,
                error_type: error.name,
                error_phase: 'streaming_client',
              },
            });
          } catch (handlerError) {
            console.warn('Error handler also failed:', handlerError);
          }
        }

        throw error;
      }
    }
  },

  /**
   * Get streaming LLM classification service health status
   * @returns {Promise<Object>} Streaming service health and capabilities information
   */
  async getLLMClassificationHealth() {
    try {
      const response = await apiRequest('/llm/classification/health');
      console.log(
        '📊 Streaming LLM Classification service health:',
        response
      );
      return response;
    } catch (error) {
      console.error(
        '❌ Streaming LLM Classification health check failed:',
        error
      );
      throw error;
    }
  },

  // ==================== CASE INVESTIGATION METHODS ====================

  /**
   * Create case investigation from complete workflow data
   * @param {Object} workflowData - Complete workflow data from entity resolution steps 0-3
   * @param {string} analystNotes - Optional analyst notes for investigation context
   * @returns {Promise<Object>} Case investigation result with MongoDB document and LLM summary
   */
  async createCaseInvestigation(workflowData, analystNotes = null) {
    try {
      console.log(
        '🔍 Creating case investigation with workflow data...'
      );

      const investigation = await apiRequest(
        '/llm/investigation/create-case',
        {
          method: 'POST',
          body: JSON.stringify({
            workflow_data: workflowData,
            analyst_notes: analystNotes,
          }),
        }
      );

      console.log('✅ Case investigation created successfully:', {
        caseId: investigation.case_id,
        success: investigation.success,
      });

      return investigation;
    } catch (error) {
      console.error('❌ Case investigation creation failed:', error);
      throw error;
    }
  },

  /**
   * Get investigation service health status
   * @returns {Promise<Object>} Investigation service health information
   */
  async getInvestigationHealth() {
    try {
      return await apiRequest('/llm/investigation/health');
    } catch (error) {
      console.error('❌ Investigation health check failed:', error);
      throw error;
    }
  },
};

/**
 * React hook for API error handling
 */
export function useAMLAPIError() {
  const handleError = (error) => {
    console.error('AML API Error:', error);

    if (error instanceof AMLAPIError) {
      switch (error.status) {
        case 404:
          return 'Entity not found';
        case 422:
          return 'Invalid request parameters';
        case 500:
          return 'Internal server error. Please try again later.';
        case 0:
          return 'Unable to connect to AML service. Please check your connection.';
        default:
          return error.message || 'An unexpected error occurred';
      }
    }

    return 'An unexpected error occurred';
  };

  return { handleError };
}

/**
 * Utility functions for data transformation
 */
export const amlUtils = {
  /**
   * Get risk color based on risk level
   */
  getRiskColor(riskLevel) {
    const level = riskLevel?.toLowerCase();
    switch (level) {
      case 'high':
        return 'red';
      case 'medium':
        return 'yellow';
      case 'low':
        return 'green';
      default:
        return 'gray';
    }
  },

  /**
   * Get risk score color based on numeric score
   */
  getRiskScoreColor(score) {
    if (score >= 75) return 'red';
    if (score >= 50) return 'yellow';
    if (score >= 25) return 'green';
    return 'gray';
  },

  /**
   * Format entity type for display
   */
  formatEntityType(entityType) {
    if (!entityType) return 'Unknown';

    return entityType
      .toLowerCase()
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  },

  /**
   * Format entity status for display
   */
  formatEntityStatus(status) {
    if (!status) return 'Unknown';

    const statusMap = {
      active: 'Active',
      inactive: 'Inactive',
      under_review: 'Under Review',
      restricted: 'Restricted',
    };

    return (
      statusMap[status] ||
      status
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (l) => l.toUpperCase())
    );
  },

  /**
   * Get entity status color
   */
  getEntityStatusColor(status) {
    const statusColors = {
      active: 'green',
      inactive: 'gray',
      under_review: 'yellow',
      restricted: 'red',
    };

    return statusColors[status] || 'gray';
  },

  /**
   * Format scenario key for display
   */
  formatScenarioKey(scenarioKey) {
    if (!scenarioKey) return 'No Scenario';

    return scenarioKey
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (l) => l.toUpperCase())
      .replace(/Set(\d+)/g, 'Set $1')
      .replace(/(\d+)$/, ' ($1)');
  },

  /**
   * Get primary contact from contactInfo array
   */
  getPrimaryContact(contactInfo, type = null) {
    if (
      !contactInfo ||
      !Array.isArray(contactInfo) ||
      contactInfo.length === 0
    ) {
      return null;
    }

    let contacts = contactInfo;

    // Filter by type if specified
    if (type) {
      contacts = contactInfo.filter(
        (contact) => contact.type === type
      );
    }

    // Look for primary contact first
    const primary = contacts.find((contact) => contact.primary);
    if (primary) return primary;

    // Fall back to first contact
    return contacts[0];
  },

  /**
   * Format contact type for display
   */
  formatContactType(type) {
    const typeMap = {
      email: 'Email',
      phone_mobile: 'Mobile Phone',
      phone_landline: 'Landline',
      social_media_handle: 'Social Media',
    };

    return (
      typeMap[type] ||
      type
        ?.replace(/_/g, ' ')
        .replace(/\b\w/g, (l) => l.toUpperCase()) ||
      'Unknown'
    );
  },

  /**
   * Format address with verification status
   */
  formatAddressWithStatus(address) {
    if (!address) return 'No address available';

    let formatted = address.full || 'Address not formatted';

    if (address.verified !== undefined) {
      const status = address.verified ? '✓ Verified' : '⚠ Unverified';
      formatted += ` (${status})`;
    }

    return formatted;
  },

  /**
   * Get watchlist match status color
   */
  getWatchlistStatusColor(status) {
    const statusColors = {
      under_review: 'yellow',
      confirmed_hit: 'red',
      false_positive: 'green',
    };

    return statusColors[status] || 'gray';
  },

  /**
   * Format watchlist match status
   */
  formatWatchlistStatus(status) {
    const statusMap = {
      under_review: 'Under Review',
      confirmed_hit: 'Confirmed Hit',
      false_positive: 'False Positive',
    };

    return (
      statusMap[status] ||
      status
        ?.replace(/_/g, ' ')
        .replace(/\b\w/g, (l) => l.toUpperCase()) ||
      'Unknown'
    );
  },

  /**
   * Format date for display
   */
  formatDate(dateString) {
    if (!dateString) return 'N/A';

    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch (error) {
      return dateString;
    }
  },

  /**
   * Get primary address from addresses array
   */
  getPrimaryAddress(addresses) {
    if (
      !addresses ||
      !Array.isArray(addresses) ||
      addresses.length === 0
    ) {
      return null;
    }

    // Look for primary address first
    const primary = addresses.find((addr) => addr.primary);
    if (primary) return primary;

    // Fall back to first address
    return addresses[0];
  },

  /**
   * Get primary identifier from identifiers array
   */
  getPrimaryIdentifier(identifiers) {
    if (
      !identifiers ||
      !Array.isArray(identifiers) ||
      identifiers.length === 0
    ) {
      return null;
    }

    // Prioritize certain identifier types
    const priority = ['ssn', 'passport', 'tax_id', 'dl'];

    for (const type of priority) {
      const identifier = identifiers.find(
        (id) => id.type?.toLowerCase() === type
      );
      if (identifier) return identifier;
    }

    // Fall back to first identifier
    return identifiers[0];
  },

  /**
   * Format vector search similarity score for display
   */
  formatSimilarityScore(score) {
    if (!score || isNaN(score)) return 'N/A';
    return `${(score * 100).toFixed(1)}%`;
  },

  /**
   * Get similarity score color
   */
  getSimilarityScoreColor(score) {
    if (score >= 0.8) return 'green';
    if (score >= 0.6) return 'yellow';
    if (score >= 0.4) return 'orange';
    return 'red';
  },

  /**
   * Get match reason display text
   */
  getMatchReasonText(reason) {
    const reasons = {
      profile_similarity: 'Profile Similarity',
      risk_profile_match: 'Risk Profile Match',
      behavioral_similarity: 'Behavioral Similarity',
      geographic_proximity: 'Geographic Proximity',
      entity_type_similarity: 'Entity Type Similarity',
      high_similarity: 'High Similarity',
      medium_similarity: 'Medium Similarity',
      low_similarity: 'Low Similarity',
    };

    return (
      reasons[reason] ||
      reason
        ?.replace(/_/g, ' ')
        .replace(/\b\w/g, (l) => l.toUpperCase()) ||
      'Unknown'
    );
  },

  /**
   * Truncate profile summary for display
   */
  truncateProfileSummary(text, maxLength = 150) {
    if (!text) return 'No profile summary available';
    if (text.length <= maxLength) return text;

    return (
      text.substring(0, maxLength).replace(/\s+\S*$/, '') + '...'
    );
  },
};

export default amlAPI;
