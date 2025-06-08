"use client";

import React, { useState } from 'react';
import {
  performUnifiedSearch,
  getSearchMethodIcon,
  getSearchMethodDescription,
  validateOnboardingInput,
  EntityResolutionAPIError
} from '../../lib/entity-resolution-api';

// LeafyGreen UI Components
import Button from '@leafygreen-ui/button';
import TextInput from '@leafygreen-ui/text-input';
import TextArea from '@leafygreen-ui/text-area';
import { FormField } from '@leafygreen-ui/form-field';
import { H2, H3, Body, Subtitle } from '@leafygreen-ui/typography';
import Banner from '@leafygreen-ui/banner';
import Badge from '@leafygreen-ui/badge';
import { spacing } from '@leafygreen-ui/tokens';
import { palette } from '@leafygreen-ui/palette';
import Icon from '@leafygreen-ui/icon';
import Modal from '@leafygreen-ui/modal';

import EntityDetail from '../entities/EntityDetail';
import styles from './UnifiedSearchInterface.module.css';

const SEARCH_METHODS = {
  ATLAS: 'atlas',
  VECTOR: 'vector',
  BOTH: 'both'
};

const UnifiedSearchInterface = ({ onSearchResults, onError }) => {
  // Search method state
  const [searchMethod, setSearchMethod] = useState(SEARCH_METHODS.BOTH);
  
  // Form data state
  const [formData, setFormData] = useState({
    // Atlas Search fields
    name_full: '',
    address_full: '',
    date_of_birth: '',
    identifier_value: '',
    
    // Vector Search fields
    semantic_query: '',
    
    // Common fields
    limit: 10
  });
  
  // UI state
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState(null);
  const [error, setError] = useState(null);
  const [formErrors, setFormErrors] = useState({});
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEntityId, setSelectedEntityId] = useState(null);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Clear field-specific error when user starts typing
    if (formErrors[field]) {
      setFormErrors(prev => ({
        ...prev,
        [field]: undefined
      }));
    }
  };

  const handleSearchMethodChange = (method) => {
    setSearchMethod(method);
    setError(null);
  };

  const handleEntityClick = (entityId) => {
    setSelectedEntityId(entityId);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedEntityId(null);
  };

  const validateForm = () => {
    const errors = {};

    // Validate based on search method
    if (searchMethod === SEARCH_METHODS.ATLAS || searchMethod === SEARCH_METHODS.BOTH) {
      if (!formData.name_full?.trim()) {
        errors.name_full = 'Name is required for Atlas Search';
      }
    }

    if (searchMethod === SEARCH_METHODS.VECTOR || searchMethod === SEARCH_METHODS.BOTH) {
      if (!formData.semantic_query?.trim()) {
        errors.semantic_query = 'Semantic query is required for Vector Search';
      } else if (formData.semantic_query.trim().length < 10) {
        errors.semantic_query = 'Semantic query must be at least 10 characters';
      }
    }

    // Validate traditional fields if provided
    if (formData.date_of_birth) {
      const validation = validateOnboardingInput({ date_of_birth: formData.date_of_birth });
      if (validation.errors.date_of_birth) {
        errors.date_of_birth = validation.errors.date_of_birth;
      }
    }

    return errors;
  };

  const performSearch = async () => {
    try {
      setIsSearching(true);
      setError(null);
      setSearchResults(null);

      // Validate form
      const errors = validateForm();
      if (Object.keys(errors).length > 0) {
        setFormErrors(errors);
        return;
      }

      // Prepare search request
      const searchRequest = {
        limit: formData.limit
      };

      // Add search methods
      if (searchMethod === SEARCH_METHODS.ATLAS) {
        searchRequest.search_methods = ['atlas'];
      } else if (searchMethod === SEARCH_METHODS.VECTOR) {
        searchRequest.search_methods = ['vector'];
      } else {
        searchRequest.search_methods = ['atlas', 'vector'];
      }

      // Add Atlas Search fields if applicable
      if (searchMethod === SEARCH_METHODS.ATLAS || searchMethod === SEARCH_METHODS.BOTH) {
        if (formData.name_full) searchRequest.name_full = formData.name_full;
        if (formData.address_full) searchRequest.address_full = formData.address_full;
        if (formData.date_of_birth) searchRequest.date_of_birth = formData.date_of_birth;
        if (formData.identifier_value) searchRequest.identifier_value = formData.identifier_value;
      }

      // Add Vector Search fields if applicable
      if (searchMethod === SEARCH_METHODS.VECTOR || searchMethod === SEARCH_METHODS.BOTH) {
        if (formData.semantic_query) searchRequest.semantic_query = formData.semantic_query;
      }

      // Execute search
      const results = await performUnifiedSearch(searchRequest);
      setSearchResults(results);

      // Pass results to parent component
      if (onSearchResults) {
        onSearchResults({
          searchMethod,
          searchRequest,
          results,
          isDemo: false
        });
      }

    } catch (err) {
      console.error('Search failed:', err);
      setError(err.message);
      onError?.(err);
    } finally {
      setIsSearching(false);
    }
  };

  const clearForm = () => {
    setFormData({
      name_full: '',
      address_full: '',
      date_of_birth: '',
      identifier_value: '',
      semantic_query: '',
      limit: 10
    });
    setFormErrors({});
    setError(null);
    setSearchResults(null);
  };

  const getSearchStatus = () => {
    if (isSearching) {
      return { text: 'Searching...', className: 'searching', icon: 'searching' };
    } else if (searchResults) {
      const total = searchResults.total_unique_entities;
      return { 
        text: `Found ${total} unique ${total === 1 ? 'entity' : 'entities'}`, 
        className: 'completed', 
        icon: 'completed' 
      };
    } else if (error) {
      return { text: 'Search failed', className: 'error', icon: 'error' };
    }
    return null;
  };

  const formatScore = (score, type) => {
    // Handle invalid scores
    if (score === null || score === undefined || isNaN(score)) {
      return type === 'vector' ? '0.0%' : '0.0';
    }
    
    if (type === 'atlas') {
      return `${score.toFixed(1)}`;
    } else if (type === 'vector') {
      return `${(score * 100).toFixed(1)}%`;
    }
    return score.toFixed(3);
  };

  const renderResultItem = (item, type) => {
    // Only check for intersection when doing unified search (both methods)
    const isIntersection = searchMethod === SEARCH_METHODS.BOTH && 
      searchResults?.combined_intelligence?.intersection_matches?.some(
        match => match.entity_id === item.entityId
      );

    const className = `${styles.resultItem} ${
      isIntersection ? styles.intersection : 
      type === 'atlas' ? styles.atlasOnly : styles.vectorOnly
    }`;

    return (
      <div 
        key={item.entityId} 
        className={`${className} ${styles.clickableResult}`}
        onClick={() => handleEntityClick(item.entityId)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            handleEntityClick(item.entityId);
          }
        }}
      >
        <div className={styles.resultHeader}>
          <div className={styles.resultInfo}>
            <H3 className={styles.resultName}>
              {item.name_full || item.name?.full || 'Unknown'}
            </H3>
            <div className={styles.resultId}>
              {item.entityId}
            </div>
          </div>
          <div className={styles.resultScore}>
            <span className={styles.scoreValue}>
              {type === 'atlas' ? formatScore(item.searchScore, 'atlas') : 
               formatScore(item.vectorSearchScore, 'vector')}
            </span>
            <span className={styles.scoreLabel}>
              {type === 'atlas' ? 'Score' : 'Similarity'}
            </span>
          </div>
        </div>

        <div className={styles.resultDetails}>
          <div className={styles.resultField}>
            <div className={styles.fieldLabel}>Entity Type</div>
            <div className={styles.fieldValue}>
              {item.entityType || item.entity_type || 'Individual'}
            </div>
          </div>
          
          {item.dateOfBirth && (
            <div className={styles.resultField}>
              <div className={styles.fieldLabel}>Date of Birth</div>
              <div className={styles.fieldValue}>{item.dateOfBirth}</div>
            </div>
          )}
          
          {item.primaryAddress_full && (
            <div className={styles.resultField}>
              <div className={styles.fieldLabel}>Address</div>
              <div className={styles.fieldValue}>{item.primaryAddress_full}</div>
            </div>
          )}
          
          {item.riskAssessment_overall_score && (
            <div className={styles.resultField}>
              <div className={styles.fieldLabel}>Risk Score</div>
              <div className={styles.fieldValue}>
                {item.riskAssessment_overall_score.toFixed(1)}
              </div>
            </div>
          )}
        </div>

        <div className={styles.resultTags}>
          {isIntersection && (
            <span className={`${styles.tag} ${styles.match}`}>
              ⚡ Found by Both Methods
            </span>
          )}
          
          {type === 'atlas' && item.matchReasons?.map((reason, index) => (
            <span key={index} className={`${styles.tag} ${styles.match}`}>
              {reason.replace(/_/g, ' ')}
            </span>
          ))}
          
          {type === 'vector' && (
            <span className={`${styles.tag} ${styles.semantic}`}>
              🧠 Semantic Match
            </span>
          )}
          
          {item.riskAssessment_overall_score >= 70 && (
            <span className={`${styles.tag} ${styles.risk}`}>
              ⚠️ High Risk
            </span>
          )}
        </div>
      </div>
    );
  };

  const status = getSearchStatus();

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.headerIcon}>🔍🧠</div>
          <div className={styles.headerContent}>
            <H2>Unified Search Interface</H2>
            <Body className={styles.subtitle}>
              Combine Atlas Search and Vector Search for comprehensive entity resolution
            </Body>
          </div>
        </div>

        {/* Search Method Toggle */}
        <div className={styles.searchMethodToggle}>
          <button
            className={`${styles.toggleButton} ${searchMethod === SEARCH_METHODS.ATLAS ? styles.active : ''}`}
            onClick={() => handleSearchMethodChange(SEARCH_METHODS.ATLAS)}
          >
            <span className={styles.toggleIcon}>🔍</span>
            Atlas Search
          </button>
          <button
            className={`${styles.toggleButton} ${searchMethod === SEARCH_METHODS.VECTOR ? styles.active : ''}`}
            onClick={() => handleSearchMethodChange(SEARCH_METHODS.VECTOR)}
          >
            <span className={styles.toggleIcon}>🧠</span>
            Vector Search
          </button>
          <button
            className={`${styles.toggleButton} ${searchMethod === SEARCH_METHODS.BOTH ? styles.active : ''}`}
            onClick={() => handleSearchMethodChange(SEARCH_METHODS.BOTH)}
          >
            <span className={styles.toggleIcon}>⚡</span>
            Both
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <Banner variant="danger" style={{ marginBottom: spacing[4] }}>
          <strong>Search Error:</strong> {error}
        </Banner>
      )}

      {/* Search Form */}
      <div className={styles.searchForm}>
        {/* Atlas Search Column */}
        {(searchMethod === SEARCH_METHODS.ATLAS || searchMethod === SEARCH_METHODS.BOTH) && (
          <div className={styles.searchColumn}>
            <div className={styles.columnHeader}>
              <span className={styles.columnIcon}>🔍</span>
              <div>
                <H3 className={styles.columnTitle}>Atlas Search</H3>
                <Body className={styles.columnDescription}>
                  Traditional fuzzy matching and exact identifier search
                </Body>
              </div>
            </div>

            <FormField label="Full Name" errorMessage={formErrors.name_full}>
              <TextInput
                aria-label="Full Name"
                placeholder="e.g., Sam Brittany Miller"
                value={formData.name_full}
                onChange={(e) => handleInputChange('name_full', e.target.value)}
                state={formErrors.name_full ? 'error' : 'none'}
              />
            </FormField>

            <FormField label="Address" errorMessage={formErrors.address_full}>
              <TextInput
                aria-label="Address"
                placeholder="e.g., Oak St Portland"
                value={formData.address_full}
                onChange={(e) => handleInputChange('address_full', e.target.value)}
                state={formErrors.address_full ? 'error' : 'none'}
              />
            </FormField>

            <FormField label="Date of Birth" errorMessage={formErrors.date_of_birth}>
              <TextInput
                aria-label="Date of Birth"
                type="date"
                value={formData.date_of_birth}
                onChange={(e) => handleInputChange('date_of_birth', e.target.value)}
                state={formErrors.date_of_birth ? 'error' : 'none'}
              />
            </FormField>

            <FormField label="Identifier" errorMessage={formErrors.identifier_value}>
              <TextInput
                aria-label="Identifier"
                placeholder="e.g., SSN, Passport, etc."
                value={formData.identifier_value}
                onChange={(e) => handleInputChange('identifier_value', e.target.value)}
                state={formErrors.identifier_value ? 'error' : 'none'}
              />
            </FormField>

            <div style={{ padding: '16px', background: '#f0f7ff', borderRadius: '6px', border: '1px solid #b3d9ff' }}>
              <Body style={{ fontSize: '13px', color: '#1a5490', margin: 0 }}>
                <strong>Try These Examples:</strong>
                <br />• <button 
                    className={styles.exampleButton}
                    onClick={() => {
                      handleInputChange('name_full', 'Samantha Miller');
                      handleInputChange('address_full', 'Oak Avenue Springfield');
                    }}
                  >
                    Samantha Miller
                  </button>
                <br />• <button 
                    className={styles.exampleButton}
                    onClick={() => {
                      handleInputChange('name_full', 'Christian Taylor');
                      handleInputChange('address_full', 'Matthew Mill');
                    }}
                  >
                    Christian Taylor
                  </button>
                <br />• <button 
                    className={styles.exampleButton}
                    onClick={() => {
                      handleInputChange('name_full', 'Global Trade Co');
                      handleInputChange('address_full', 'Potts Port');
                    }}
                  >
                    Global Trade Co
                  </button>
              </Body>
            </div>
          </div>
        )}

        {/* Vector Search Column */}
        {(searchMethod === SEARCH_METHODS.VECTOR || searchMethod === SEARCH_METHODS.BOTH) && (
          <div className={styles.searchColumn}>
            <div className={styles.columnHeader}>
              <span className={styles.columnIcon}>🧠</span>
              <div>
                <H3 className={styles.columnTitle}>Vector Search</H3>
                <Body className={styles.columnDescription}>
                  AI-powered semantic similarity and behavioral pattern recognition
                </Body>
              </div>
            </div>

            <FormField 
              label="Semantic Query" 
              errorMessage={formErrors.semantic_query}
              description="Describe the type of entity you're looking for using natural language"
            >
              <TextArea
                aria-label="Semantic Query"
                placeholder="e.g., High-risk individual with offshore banking activities and shell company connections"
                value={formData.semantic_query}
                onChange={(e) => handleInputChange('semantic_query', e.target.value)}
                state={formErrors.semantic_query ? 'error' : 'none'}
                rows={4}
              />
            </FormField>

            <div style={{ padding: '16px', background: '#f8f9fa', borderRadius: '6px', border: '1px solid #e9ecef' }}>
              <Body style={{ fontSize: '13px', color: '#6c757d', margin: 0 }}>
                <strong>Example Queries:</strong>
                <br />• <button 
                    className={styles.exampleButton}
                    onClick={() => handleInputChange('semantic_query', 'Corporate entities involved in money laundering schemes')}
                  >
                    "Corporate entities involved in money laundering schemes"
                  </button>
                <br />• <button 
                    className={styles.exampleButton}
                    onClick={() => handleInputChange('semantic_query', 'Individuals with politically exposed person connections')}
                  >
                    "Individuals with politically exposed person connections"
                  </button>
                <br />• <button 
                    className={styles.exampleButton}
                    onClick={() => handleInputChange('semantic_query', 'High-risk offshore banking activities and shell companies')}
                  >
                    "High-risk offshore banking activities and shell companies"
                  </button>
              </Body>
            </div>
          </div>
        )}

        {/* Form Actions */}
        <div className={styles.formActions}>
          <Button
            variant="default"
            size="default"
            onClick={clearForm}
            disabled={isSearching}
          >
            Clear Form
          </Button>
          
          <Button
            variant="primary"
            size="default"
            onClick={performSearch}
            disabled={isSearching}
            leftGlyph={isSearching ? undefined : <Icon glyph="MagnifyingGlass" />}
          >
            {isSearching ? 'Searching...' : 'Search'}
          </Button>
        </div>
      </div>

      {/* Search Status */}
      {status && (
        <div className={`${styles.searchStatus} ${styles[status.className]}`}>
          {isSearching && <div className={styles.loadingSpinner}></div>}
          <span className={styles.statusText}>{status.text}</span>
        </div>
      )}

      {/* Search Results */}
      {searchResults && (
        <div className={styles.resultsContainer}>
          <div className={styles.resultsHeader}>
            <H3 className={styles.resultsTitle}>
              <span>Search Results</span>
              {getSearchMethodIcon(searchMethod)}
            </H3>
            
            <div className={styles.resultsMetrics}>
              {(searchMethod === SEARCH_METHODS.ATLAS || searchMethod === SEARCH_METHODS.BOTH) && (
                <div className={styles.metric}>
                  <span className={styles.metricIcon}>🔍</span>
                  <span className={styles.metricValue}>{searchResults.atlas_results.length}</span>
                  <span className={styles.metricLabel}>Atlas</span>
                </div>
              )}
              {(searchMethod === SEARCH_METHODS.VECTOR || searchMethod === SEARCH_METHODS.BOTH) && (
                <div className={styles.metric}>
                  <span className={styles.metricIcon}>🧠</span>
                  <span className={styles.metricValue}>{searchResults.vector_results.length}</span>
                  <span className={styles.metricLabel}>Vector</span>
                </div>
              )}
              {searchMethod === SEARCH_METHODS.BOTH && (
                <div className={styles.metric}>
                  <span className={styles.metricIcon}>⚡</span>
                  <span className={styles.metricValue}>
                    {searchResults.combined_intelligence.correlation_analysis.intersection_count}
                  </span>
                  <span className={styles.metricLabel}>Intersection</span>
                </div>
              )}
            </div>
          </div>

          {/* Results Layout - Single or Dual Pane based on search method */}
          <div className={searchMethod === SEARCH_METHODS.BOTH ? styles.dualPane : ''}>
            {/* Atlas Search Results */}
            {(searchMethod === SEARCH_METHODS.ATLAS || searchMethod === SEARCH_METHODS.BOTH) && (
              <div className={styles.resultPane}>
                <div className={styles.paneHeader}>
                  <div>
                    <H3 className={styles.paneTitle}>
                      <span className={styles.paneIcon}>🔍</span>
                      Atlas Search
                    </H3>
                    <Body className={styles.paneSubtitle}>
                      Traditional fuzzy matching
                    </Body>
                  </div>
                  <div className={styles.paneBadge}>
                    <span>{searchResults.atlas_results.length}</span>
                    <span>results</span>
                  </div>
                </div>
                
                <div className={styles.paneContent}>
                  {searchResults.atlas_results.length > 0 ? (
                    searchResults.atlas_results.map(item => renderResultItem(item, 'atlas'))
                  ) : (
                    <div className={styles.emptyState}>
                      <div className={styles.emptyIcon}>🔍</div>
                      <Body>No Atlas Search results found</Body>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Vector Search Results */}
            {(searchMethod === SEARCH_METHODS.VECTOR || searchMethod === SEARCH_METHODS.BOTH) && (
              <div className={styles.resultPane}>
                <div className={styles.paneHeader}>
                  <div>
                    <H3 className={styles.paneTitle}>
                      <span className={styles.paneIcon}>🧠</span>
                      Vector Search
                    </H3>
                    <Body className={styles.paneSubtitle}>
                      AI-powered semantic similarity
                    </Body>
                  </div>
                  <div className={styles.paneBadge}>
                    <span>{searchResults.vector_results.length}</span>
                    <span>results</span>
                  </div>
                </div>
                
                <div className={styles.paneContent}>
                  {searchResults.vector_results.length > 0 ? (
                    searchResults.vector_results.map(item => renderResultItem(item, 'vector'))
                  ) : (
                    <div className={styles.emptyState}>
                      <div className={styles.emptyIcon}>🧠</div>
                      <Body>No Vector Search results found</Body>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Performance Metrics */}
          <div className={styles.performanceMetrics}>
            <div className={styles.performanceMetric}>
              <div className={styles.metricValue}>
                {Math.round(searchResults.search_metadata.performance_metrics.total_search_time_ms)}ms
              </div>
              <div className={styles.metricLabel}>Total Time</div>
            </div>
            
            {(searchMethod === SEARCH_METHODS.ATLAS || searchMethod === SEARCH_METHODS.BOTH) && 
             searchResults.search_metadata.performance_metrics.atlas_search_time_ms && (
              <div className={styles.performanceMetric}>
                <div className={styles.metricValue}>
                  {Math.round(searchResults.search_metadata.performance_metrics.atlas_search_time_ms)}ms
                </div>
                <div className={styles.metricLabel}>Atlas Search</div>
              </div>
            )}
            
            {(searchMethod === SEARCH_METHODS.VECTOR || searchMethod === SEARCH_METHODS.BOTH) &&
             searchResults.search_metadata.performance_metrics.vector_search_time_ms && (
              <div className={styles.performanceMetric}>
                <div className={styles.metricValue}>
                  {Math.round(searchResults.search_metadata.performance_metrics.vector_search_time_ms)}ms
                </div>
                <div className={styles.metricLabel}>Vector Search</div>
              </div>
            )}
            
            {searchMethod === SEARCH_METHODS.BOTH && (
              <div className={styles.performanceMetric}>
                <div className={styles.metricValue}>
                  {searchResults.combined_intelligence.correlation_analysis.correlation_percentage.toFixed(1)}%
                </div>
                <div className={styles.metricLabel}>Correlation</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Entity Detail Modal */}
      <Modal 
        open={isModalOpen} 
        setOpen={setIsModalOpen}
        size="large"
      >
        <div style={{ padding: spacing[4] }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: spacing[4]
          }}>
            <H2>Entity Details</H2>
            <Button 
              variant="default" 
              size="small"
              onClick={handleCloseModal}
              leftGlyph={<Icon glyph="X" />}
            >
              Close
            </Button>
          </div>
          
          {selectedEntityId && (
            <EntityDetail entityId={selectedEntityId} />
          )}
        </div>
      </Modal>
    </div>
  );
};

export default UnifiedSearchInterface;