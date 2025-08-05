/**
 * Entity Resolution API Service
 * Handles all API communications for entity onboarding and resolution workflows
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_AML_API_URL || 'http://localhost:8001';

class EntityResolutionAPIError extends Error {
  constructor(message, status, details) {
    super(message);
    this.name = 'EntityResolutionAPIError';
    this.status = status;
    this.details = details;
  }
}

/**
 * Find potential entity matches for new onboarding input
 * @param {Object} onboardingData - Customer input data
 * @param {string} onboardingData.name_full - Full name (required)
 * @param {string} onboardingData.date_of_birth - Date in YYYY-MM-DD format
 * @param {string} onboardingData.address_full - Full address string
 * @param {string} onboardingData.identifier_value - Primary identifier (optional)
 * @param {number} limit - Maximum number of matches (default: 10)
 * @returns {Promise<Object>} Find matches response with potential matches
 */
export async function findEntityMatches(onboardingData, limit = 10) {
  try {
    const response = await fetch(`${API_BASE_URL}/entities/onboarding/find_matches?limit=${limit}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(onboardingData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new EntityResolutionAPIError(
        errorData.detail || 'Failed to find entity matches',
        response.status,
        errorData
      );
    }

    const data = await response.json();
    return data;
  } catch (error) {
    if (error instanceof EntityResolutionAPIError) {
      throw error;
    }
    throw new EntityResolutionAPIError(
      'Network error while searching for matches',
      0,
      { originalError: error.message }
    );
  }
}

/**
 * Process an entity resolution decision
 * @param {Object} resolutionData - Resolution decision data
 * @param {string} resolutionData.sourceEntityId - Source entity ID
 * @param {string} resolutionData.targetMasterEntityId - Target master entity ID
 * @param {string} resolutionData.decision - Resolution decision (confirmed_match, not_a_match, needs_review)
 * @param {number} resolutionData.matchConfidence - Confidence score (0.0-1.0)
 * @param {string[]} resolutionData.matchedAttributes - List of matched attributes
 * @param {string} resolutionData.resolvedBy - User identifier
 * @param {string} resolutionData.notes - Additional notes
 * @returns {Promise<Object>} Resolution response
 */
export async function resolveEntities(resolutionData) {
  try {
    const response = await fetch(`${API_BASE_URL}/entities/resolve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(resolutionData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new EntityResolutionAPIError(
        errorData.detail || 'Failed to resolve entities',
        response.status,
        errorData
      );
    }

    const data = await response.json();
    return data;
  } catch (error) {
    if (error instanceof EntityResolutionAPIError) {
      throw error;
    }
    throw new EntityResolutionAPIError(
      'Network error while resolving entities',
      0,
      { originalError: error.message }
    );
  }
}

/**
 * Get entity resolution status
 * @param {string} entityId - Entity ID to check
 * @returns {Promise<Object>} Resolution status
 */
export async function getEntityResolutionStatus(entityId) {
  try {
    const response = await fetch(`${API_BASE_URL}/entities/resolution/status/${entityId}`);
    
    if (!response.ok) {
      if (response.status === 404) {
        throw new EntityResolutionAPIError('Entity not found', 404);
      }
      const errorData = await response.json();
      throw new EntityResolutionAPIError(
        errorData.detail || 'Failed to get resolution status',
        response.status,
        errorData
      );
    }

    return await response.json();
  } catch (error) {
    if (error instanceof EntityResolutionAPIError) {
      throw error;
    }
    throw new EntityResolutionAPIError(
      'Network error while getting resolution status',
      0,
      { originalError: error.message }
    );
  }
}

/**
 * Get demo data for Samantha Miller scenario
 * @returns {Object} Pre-filled demo data
 */
export function getDemoData() {
  return {
    name_full: "Samantha Miller",
    date_of_birth: "1985-07-15",
    address_full: "456 Oak Avenue, Springfield, IL 62704",
    identifier_value: "SH609753513"
  };
}

/**
 * Get demo data with slight variations for fuzzy matching demonstration
 * @returns {Object} Demo data with variations
 */
export function getFuzzyDemoData() {
  return {
    name_full: "Samantha X. Miller",
    date_of_birth: "1985-07-15",
    address_full: "456 Oak Ave, Springfield, IL",
    identifier_value: ""
  };
}

/**
 * Get enhanced demo scenarios showcasing different data scenarios
 * @returns {Array} Array of demo scenario objects
 */
export function getEnhancedDemoScenarios() {
  return [
    {
      id: 'exact_match',
      name: 'Perfect Match Demo',
      description: 'Exact entity match with high confidence (Samantha Miller)',
      icon: '🎯',
      data: {
        name_full: "Samantha Miller",
        date_of_birth: "1985-07-15",
        address_full: "456 Oak Avenue, Springfield, IL 62704",
        identifier_value: "SH609753513"
      },
      expectedResults: 'Should find CDI-431BB609EB with 100% match confidence',
      scenarioKey: 'clear_duplicate_set0_1'
    },
    {
      id: 'fuzzy_match',
      name: 'Fuzzy Matching Demo',
      description: 'Fuzzy name and address matching (Samantha X. Miller)',
      icon: '🔍',
      data: {
        name_full: "Samantha X. Miller",
        date_of_birth: "1985-07-15",
        address_full: "456 Oak Ave, Springfield, IL",
        identifier_value: ""
      },
      expectedResults: 'Should find multiple matches including Sam Brittany Miller',
      scenarioKey: 'clear_duplicate_set0_1'
    },
    {
      id: 'alias_search',
      name: 'Alias Search Demo',
      description: 'Search using known aliases for enhanced matching',
      icon: '👥',
      data: {
        name_full: "Sam Miller",
        date_of_birth: "1985-07-15",
        address_full: "456 Oak Avenue, Springfield, IL 62704",
        identifier_value: ""
      },
      expectedResults: 'Should leverage alias matching capabilities',
      scenarioKey: 'clear_duplicate_set0_1'
    },
    {
      id: 'watchlist_demo',
      name: 'Sanctions/Watchlist Demo',
      description: 'Demonstrate watchlist matching with sanctions organizations',
      icon: '⚠️',
      data: {
        name_full: "PublicDebitis Ventures",
        date_of_birth: "",
        address_full: "Financial District, Dubai, UAE",
        identifier_value: ""
      },
      expectedResults: 'Should show sanctioned organizations with watchlist matches',
      scenarioKey: 'sanctioned_org_varied_0'
    },
    {
      id: 'pep_demo',
      name: 'PEP Individual Demo',
      description: 'Politically Exposed Person with enhanced risk profiles',
      icon: '🚨',
      data: {
        name_full: "Political Figure",
        date_of_birth: "1965-01-01",
        address_full: "Government District, Capital City",
        identifier_value: ""
      },
      expectedResults: 'Should find PEP individuals with detailed risk breakdowns',
      scenarioKey: 'pep_individual_varied_0'
    },
    {
      id: 'organization_demo',
      name: 'Corporate Structure Demo',
      description: 'Complex organization with parent-subsidiary relationships',
      icon: '🏢',
      data: {
        name_full: "Complex Parent Corporation",
        date_of_birth: "",
        address_full: "Corporate Plaza, Financial District",
        identifier_value: ""
      },
      expectedResults: 'Should find organizations with complex corporate structures',
      scenarioKey: 'complex_org_parent_struct0'
    },
    {
      id: 'shell_company_demo',
      name: 'Shell Company Demo',
      description: 'Potential shell companies with nominee directors',
      icon: '🔍',
      data: {
        name_full: "Shell Investment Holdings",
        date_of_birth: "",
        address_full: "Offshore Financial Center",
        identifier_value: ""
      },
      expectedResults: 'Should find potential shell companies and nominee structures',
      scenarioKey: 'shell_company_candidate_var0'
    },
    {
      id: 'resolution_demo',
      name: 'Resolution Workflow Demo',
      description: 'Entities with existing resolution status and linked entities',
      icon: '🔗',
      data: {
        name_full: "David Johnson",
        date_of_birth: "1980-11-30",
        address_full: "321 Elm Street, Boston, MA 02101",
        identifier_value: ""
      },
      expectedResults: 'Should show entities with resolution status and linked entities',
      scenarioKey: 'clear_duplicate_set1_1'
    },
    {
      id: 'hnwi_demo',
      name: 'High Net Worth Individual',
      description: 'Global investor with complex financial profiles',
      icon: '💼',
      data: {
        name_full: "Global Investor",
        date_of_birth: "1970-05-15",
        address_full: "Financial District, Global City",
        identifier_value: ""
      },
      expectedResults: 'Should find high net worth individuals with investment profiles',
      scenarioKey: 'hnwi_global_investor_0'
    },
    {
      id: 'household_demo',
      name: 'Household/Family Demo',
      description: 'Family members sharing addresses and relationships',
      icon: '👨‍👩‍👧‍👦',
      data: {
        name_full: "Family Member",
        date_of_birth: "1985-06-20",
        address_full: "Family Residence, Suburban Area",
        identifier_value: ""
      },
      expectedResults: 'Should find family members with shared household information',
      scenarioKey: 'household_set0_member1'
    }
  ];
}

/**
 * Get demo data by scenario ID
 * @param {string} scenarioId - Demo scenario identifier
 * @returns {Object} Demo data for the specified scenario
 */
export function getDemoDataByScenario(scenarioId) {
  const scenarios = getEnhancedDemoScenarios();
  const scenario = scenarios.find(s => s.id === scenarioId);
  return scenario ? scenario.data : getDemoData();
}

/**
 * Get scenario information by ID
 * @param {string} scenarioId - Demo scenario identifier
 * @returns {Object} Scenario information
 */
export function getScenarioInfo(scenarioId) {
  const scenarios = getEnhancedDemoScenarios();
  return scenarios.find(s => s.id === scenarioId);
}

/**
 * Format match reasons for display
 * @param {string[]} matchReasons - Array of match reason strings
 * @returns {Object[]} Formatted match reasons with labels and colors
 */
export function formatMatchReasons(matchReasons) {
  const reasonMap = {
    'exact_name_match': { label: 'Exact Name', color: 'green' },
    'similar_name': { label: 'Similar Name', color: 'blue' },
    'similar_address': { label: 'Similar Address', color: 'blue' },
    'shared_address': { label: 'Shared Address', color: 'yellow' },
    'shared_identifier': { label: 'Shared ID', color: 'red' },
    'highlighted_name': { label: 'Name Match', color: 'green' },
    'highlighted_address': { label: 'Address Match', color: 'blue' },
    'date_proximity': { label: 'Similar DOB', color: 'blue' }
  };

  return matchReasons.map(reason => ({
    key: reason,
    label: reasonMap[reason]?.label || reason.replace(/_/g, ' '),
    color: reasonMap[reason]?.color || 'gray'
  }));
}

/**
 * Get risk level color based on score
 * @param {number} riskScore - Risk score (0-100)
 * @returns {string} Risk level for MongoDB palette
 */
export function getRiskLevel(riskScore) {
  if (riskScore >= 75) return 'red';
  if (riskScore >= 50) return 'yellow';
  if (riskScore >= 25) return 'blue';
  return 'green';
}

/**
 * Get match confidence level
 * @param {number} searchScore - Search score from Atlas Search
 * @returns {Object} Confidence level with label and color
 */
export function getMatchConfidence(searchScore) {
  if (searchScore >= 20) return { level: 'high', label: 'High Confidence', color: 'green' };
  if (searchScore >= 10) return { level: 'medium', label: 'Medium Confidence', color: 'yellow' };
  if (searchScore >= 5) return { level: 'low', label: 'Low Confidence', color: 'blue' };
  return { level: 'very_low', label: 'Very Low', color: 'gray' };
}

/**
 * Validate onboarding input data
 * @param {Object} data - Input data to validate
 * @returns {Object} Validation result with errors
 */
export function validateOnboardingInput(data) {
  const errors = {};

  if (!data.name_full || data.name_full.trim().length < 2) {
    errors.name_full = 'Full name is required (minimum 2 characters)';
  }

  if (data.date_of_birth) {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(data.date_of_birth)) {
      errors.date_of_birth = 'Date must be in YYYY-MM-DD format';
    } else {
      const date = new Date(data.date_of_birth);
      const now = new Date();
      if (date > now) {
        errors.date_of_birth = 'Date of birth cannot be in the future';
      }
      if (date.getFullYear() < 1900) {
        errors.date_of_birth = 'Date of birth must be after 1900';
      }
    }
  }

  if (data.address_full && data.address_full.trim().length < 5) {
    errors.address_full = 'Address must be at least 5 characters';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}

/**
 * Create a temporary entity for workflow management
 * @param {Object} inputData - Onboarding input data
 * @returns {Object} Temporary entity object
 */
export function createTemporaryEntity(inputData) {
  return {
    id: `temp_${Date.now()}`,
    entityId: `TEMP-${Date.now()}`,
    name_full: inputData.name_full,
    dateOfBirth: inputData.date_of_birth,
    primaryAddress_full: inputData.address_full,
    identifier_value: inputData.identifier_value,
    entityType: 'individual',
    isTemporary: true,
    createdAt: new Date().toISOString()
  };
}

/**
 * Get demo scenarios for unified search
 * @returns {Promise<Object>} Demo scenarios response
 */
export async function getDemoScenarios() {
  try {
    const response = await fetch(`${API_BASE_URL}/entities/demo_scenarios`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new EntityResolutionAPIError(
        errorData.detail || 'Failed to get demo scenarios',
        response.status,
        errorData
      );
    }

    const data = await response.json();
    return data;
  } catch (error) {
    if (error instanceof EntityResolutionAPIError) {
      throw error;
    }
    throw new EntityResolutionAPIError(
      'Network error while fetching demo scenarios',
      0,
      { originalError: error.message }
    );
  }
}

/**
 * Execute a specific demo scenario
 * @param {string} scenarioId - Demo scenario identifier
 * @returns {Promise<Object>} Demo scenario execution results
 */
export async function executeDemoScenario(scenarioId) {
  try {
    const response = await fetch(`${API_BASE_URL}/entities/demo_scenario/${scenarioId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new EntityResolutionAPIError(
        errorData.detail || `Failed to execute demo scenario: ${scenarioId}`,
        response.status,
        errorData
      );
    }

    const data = await response.json();
    return data;
  } catch (error) {
    if (error instanceof EntityResolutionAPIError) {
      throw error;
    }
    throw new EntityResolutionAPIError(
      'Network error while executing demo scenario',
      0,
      { originalError: error.message }
    );
  }
}

/**
 * Perform unified entity search using both Atlas Search and Vector Search
 * @param {Object} searchRequest - Unified search request
 * @param {string} searchRequest.name_full - Full name for Atlas Search
 * @param {string} searchRequest.address_full - Address for Atlas Search
 * @param {string} searchRequest.date_of_birth - Date of birth for Atlas Search
 * @param {string} searchRequest.identifier_value - Identifier for Atlas Search
 * @param {string} searchRequest.semantic_query - Semantic query for Vector Search
 * @param {Array<string>} searchRequest.search_methods - Methods to use: ["atlas"], ["vector"], or ["atlas", "vector"]
 * @param {number} searchRequest.limit - Maximum results per method
 * @param {Object} searchRequest.filters - Optional filters
 * @returns {Promise<Object>} Unified search response
 */
export async function performUnifiedSearch(searchRequest) {
  try {
    const response = await fetch(`${API_BASE_URL}/search/unified/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(searchRequest),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new EntityResolutionAPIError(
        errorData.detail || 'Unified search failed',
        response.status,
        errorData
      );
    }

    const data = await response.json();
    return data;
  } catch (error) {
    if (error instanceof EntityResolutionAPIError) {
      throw error;
    }
    throw new EntityResolutionAPIError(
      'Network error during unified search',
      0,
      { originalError: error.message }
    );
  }
}

/**
 * Get search method icon based on method type
 * @param {string} method - Search method ("atlas" or "vector")
 * @returns {string} Icon string for display
 */
export function getSearchMethodIcon(method) {
  const iconMap = {
    'atlas': '🔍',
    'vector': '🧠',
    'both': '🔍🧠'
  };
  return iconMap[method] || '🔎';
}

/**
 * Get search method description
 * @param {string} method - Search method ("atlas" or "vector")
 * @returns {string} Human-readable description
 */
export function getSearchMethodDescription(method) {
  const descriptionMap = {
    'atlas': 'Traditional fuzzy matching and exact identifier search',
    'vector': 'AI-powered semantic similarity and behavioral pattern recognition',
    'both': 'Combined Atlas Search and Vector Search with correlation analysis'
  };
  return descriptionMap[method] || 'Unknown search method';
}

/**
 * Get demo scenario icon based on scenario type
 * @param {string} scenarioId - Scenario identifier
 * @returns {string} Icon string for display
 */
export function getDemoScenarioIcon(scenarioId) {
  const iconMap = {
    'atlas_search_excellence': '🔍',
    'vector_search_magic': '🧠',
    'combined_intelligence': '⚡'
  };
  return iconMap[scenarioId] || '🎯';
}

export { EntityResolutionAPIError };