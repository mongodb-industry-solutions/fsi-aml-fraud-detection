"use client";

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Card from '@leafygreen-ui/card';
import Button from '@leafygreen-ui/button';
import { Select, Option } from '@leafygreen-ui/select';
import Banner from '@leafygreen-ui/banner';
import { Table, TableBody, TableHead, HeaderRow, HeaderCell, Row, Cell } from '@leafygreen-ui/table';
import { Body, H1, H2, H3, Subtitle } from '@leafygreen-ui/typography';
import Tooltip from '@leafygreen-ui/tooltip';
import Icon from '@leafygreen-ui/icon';
import IconButton from '@leafygreen-ui/icon-button';
import TextInput from '@leafygreen-ui/text-input';
import { Spinner } from '@leafygreen-ui/loading-indicator';
import { 
  ParagraphSkeleton
} from '@leafygreen-ui/skeleton-loader';
import Callout from '@leafygreen-ui/callout';
import { palette } from '@leafygreen-ui/palette';
import { spacing } from '@leafygreen-ui/tokens';
import { amlAPI, useAMLAPIError, amlUtils } from '@/lib/aml-api';
import EnhancedSearchBar from './EnhancedSearchBar';
import AdvancedFacetedFilters from './AdvancedFacetedFilters';
import MongoDBInsightsPanel from './MongoDBInsightsPanel';
import EntityLink from '@/components/common/EntityLink';
import styles from './EntityList.module.css';

// Constants
const DEFAULT_PAGE_SIZE = 20;

function RiskBadge({ level, score, size = 'default' }) {
  const colors = {
    high: palette.red.base,
    medium: palette.yellow.base,
    low: palette.green.base,
    unknown: palette.gray.base
  };

  const bgColors = {
    high: palette.red.light2,
    medium: palette.yellow.light2,
    low: palette.green.light2,
    unknown: palette.gray.light2
  };

  const levelLower = level?.toLowerCase() || 'unknown';
  const badgeStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: spacing[1],
    padding: size === 'small' ? `${spacing[1]}px ${spacing[2]}px` : `${spacing[1]}px ${spacing[3]}px`,
    borderRadius: '16px',
    backgroundColor: bgColors[levelLower] || bgColors.unknown,
    color: colors[levelLower] || colors.unknown,
    fontSize: size === 'small' ? '12px' : '14px',
    fontWeight: '600',
    border: `1px solid ${colors[levelLower] || colors.unknown}`,
  };

  return (
    <span style={badgeStyle}>
      <Icon 
        glyph={levelLower === 'high' ? 'Warning' : 'Checkmark'} 
        size={size === 'small' ? 12 : 14}
        fill={colors[levelLower] || colors.unknown}
      />
      {score && `${score} - `}{amlUtils.formatEntityType(level)}
    </span>
  );
}

function StatusBadge({ status, size = 'default' }) {
  const colors = {
    active: palette.green.base,
    inactive: palette.gray.base,
    under_review: palette.yellow.base,
    restricted: palette.red.base
  };

  const bgColors = {
    active: palette.green.light2,
    inactive: palette.gray.light2,
    under_review: palette.yellow.light2,
    restricted: palette.red.light2
  };

  const statusLower = status?.toLowerCase() || 'inactive';
  const badgeStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: spacing[1],
    padding: size === 'small' ? `${spacing[1]}px ${spacing[2]}px` : `${spacing[1]}px ${spacing[3]}px`,
    borderRadius: '16px',
    backgroundColor: bgColors[statusLower] || bgColors.inactive,
    color: colors[statusLower] || colors.inactive,
    fontSize: size === 'small' ? '12px' : '14px',
    fontWeight: '600',
    border: `1px solid ${colors[statusLower] || colors.inactive}`,
  };

  return (
    <span style={badgeStyle}>
      <Icon 
        glyph={statusLower === 'active' ? 'Checkmark' : statusLower === 'restricted' ? 'Warning' : 'Clock'} 
        size={size === 'small' ? 12 : 14}
        fill={colors[statusLower] || colors.inactive}
      />
      {amlUtils.formatEntityStatus(status)}
    </span>
  );
}

function EntityRow({ entity, onClick }) {
  const handleRowClick = () => {
    onClick(entity.entityId);
  };

  return (
    <Row 
      onClick={handleRowClick}
      style={{ 
        cursor: 'pointer',
        transition: 'background-color 0.2s ease',
        minHeight: '80px', // Increased from default for better spacing
      }}
      className={styles.entityRow}
    >
      <Cell>
        <div>
          <Body weight="medium">{entity.entityId}</Body>
          {entity.scenarioKey && (
            <div style={{ marginTop: spacing[1] }}>
              <Body style={{ color: palette.gray.dark1, fontSize: '12px' }}>
                {amlUtils.formatScenarioKey(entity.scenarioKey)}
              </Body>
            </div>
          )}
        </div>
      </Cell>
      <Cell>
        <div>
          <EntityLink 
            entityId={entity.entityId}
            weight="medium"
            style={{ fontSize: '14px' }}
          >
            {entity.name_full}
          </EntityLink>
          <div style={{ marginTop: spacing[1] }}>
            <Body style={{ color: palette.gray.dark1, fontSize: '12px' }}>
              {amlUtils.formatEntityType(entity.entityType)}
            </Body>
          </div>
        </div>
      </Cell>
      <Cell>
        <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
          <StatusBadge status={entity.status} size="small" />
        </div>
      </Cell>
      <Cell>
        <div style={{ textAlign: 'center' }}>
          <Body weight="medium" style={{ color: palette.gray.dark1 }}>
            {entity.risk_score}
          </Body>
        </div>
      </Cell>
      <Cell>
        <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
          <RiskBadge level={entity.risk_level} size="small" />
        </div>
      </Cell>
      <Cell>
        <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2] }}>
          {entity.watchlist_matches_count > 0 && (
            <Tooltip 
              trigger={
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: spacing[1],
                  padding: `${spacing[1]}px ${spacing[2]}px`,
                  backgroundColor: palette.red.light2,
                  color: palette.red.base,
                  borderRadius: '12px',
                  fontSize: '12px',
                  fontWeight: '600'
                }}>
                  <Icon glyph="Warning" size={12} fill={palette.red.base} />
                  {entity.watchlist_matches_count}
                </span>
              }
              triggerEvent="hover"
            >
              {entity.watchlist_matches_count} watchlist match{entity.watchlist_matches_count > 1 ? 'es' : ''}
            </Tooltip>
          )}
          {entity.resolution_status && entity.resolution_status !== 'unresolved' && (
            <Tooltip 
              trigger={
                <Icon 
                  glyph="Link" 
                  size={14} 
                  fill={entity.resolution_status === 'resolved' ? palette.green.base : palette.yellow.base}
                />
              }
              triggerEvent="hover"
            >
              Resolution status: {amlUtils.formatEntityStatus(entity.resolution_status)}
            </Tooltip>
          )}
          <Tooltip 
            trigger={
              <IconButton aria-label="View entity details">
                <Icon glyph="ArrowRight" />
              </IconButton>
            }
            triggerEvent="hover"
          >
            View entity details
          </Tooltip>
        </div>
      </Cell>
    </Row>
  );
}

export default function EntityList() {
  const router = useRouter();
  const { handleError } = useAMLAPIError();

  // State
  const [entities, setEntities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrevious, setHasPrevious] = useState(false);
  
  // Search and Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({});
  const [facets, setFacets] = useState({});
  
  // MongoDB Insights State
  const [autocompleteActive, setAutocompleteActive] = useState(false);
  const autocompleteTimeoutRef = useRef(null);

  // Load entities using unified search API for all cases (replaces dual API approach)
  const loadEntities = async (page = 1, searchQuery = '', filters = {}) => {
    try {
      setLoading(true);
      setError(null);

      // Build query parameters for the unified search endpoint using camelCase
      const params = new URLSearchParams();
      if (searchQuery && searchQuery.trim()) params.append('q', searchQuery);
      if (filters.entityType) params.append('entityType', filters.entityType);
      if (filters.riskLevel) params.append('riskLevel', filters.riskLevel);
      if (filters.country) params.append('country', filters.country);
      if (filters.city) params.append('city', filters.city);
      if (filters.nationality) params.append('nationality', filters.nationality);
      if (filters.residency) params.append('residency', filters.residency);
      if (filters.jurisdiction) params.append('jurisdiction', filters.jurisdiction);
      if (filters.identifierType) params.append('identifierType', filters.identifierType);
      if (filters.businessType) params.append('businessType', filters.businessType);
      if (filters.scenarioKey) params.append('scenarioKey', filters.scenarioKey);
      params.append('facets', 'true');
      params.append('limit', DEFAULT_PAGE_SIZE.toString());
      params.append('page', page.toString());

      const amlApiUrl = process.env.NEXT_PUBLIC_AML_API_URL || 'http://localhost:8001';
      const response = await fetch(`${amlApiUrl}/entities/search/unified?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error(`Search failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Search request failed');
      }

      // Extract entities and metadata from the unified search response
      const results = data.data?.results || [];
      const resultData = data.data || {};
      
      setEntities(results);
      setFacets(resultData.facets || {});
      setTotalCount(resultData.total_count || results.length);
      setCurrentPage(resultData.page || page);
      setHasNext(resultData.has_next || false);
      setHasPrevious(resultData.has_previous || false);

    } catch (error) {
      const errorMessage = handleError(error);
      setError(errorMessage);
      setEntities([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  };

  // Initial load - use unified search API
  useEffect(() => {
    loadEntities(1, '', {});
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (autocompleteTimeoutRef.current) {
        clearTimeout(autocompleteTimeoutRef.current);
      }
    };
  }, []);

  // Handle search query changes
  const handleSearchQueryChange = (query) => {
    setSearchQuery(query);
    
    // Clear any existing timeout to prevent flickering
    if (autocompleteTimeoutRef.current) {
      clearTimeout(autocompleteTimeoutRef.current);
      autocompleteTimeoutRef.current = null;
    }
    
    // Track autocomplete activity for MongoDB insights
    if (query.length >= 2) {
      setAutocompleteActive(true);
      // Set a timeout to clear autocomplete activity after user stops typing
      autocompleteTimeoutRef.current = setTimeout(() => {
        setAutocompleteActive(false);
      }, 30000);
    } else {
      setAutocompleteActive(false);
    }
  };

  // Handle search execution
  const handleSearch = (query) => {
    const searchTerm = query || searchQuery;
    setSearchQuery(searchTerm);
    setCurrentPage(1);
    loadEntities(1, searchTerm, filters);
  };

  // Handle filter changes
  const handleFiltersChange = (newFilters) => {
    setFilters(newFilters);
    setCurrentPage(1);
    loadEntities(1, searchQuery, newFilters);
  };

  // Handle entity click
  const handleEntityClick = (entityId) => {
    router.push(`/entities/${entityId}`);
  };

  // Handle pagination
  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
    loadEntities(newPage, searchQuery, filters);
  };

  return (
    <div style={{ padding: spacing[0] }}>
      {/* Header */}
      <div style={{ marginBottom: spacing[4] }}>
        <H1>Entity Management</H1>
      </div>

      {/* Error Banner */}
      {error && (
        <div style={{ marginBottom: spacing[3] }}>
          <Banner variant="danger">{error}</Banner>
        </div>
      )}

      {/* Enhanced Search Bar */}
      <Card style={{ marginBottom: spacing[4], padding: spacing[3] }}>
        <div style={{ width: '95%' }}>
          <EnhancedSearchBar
            onSearch={handleSearch}
            onQueryChange={handleSearchQueryChange}
            placeholder="Search entities by name..."
          />
        </div>
      </Card>

      {/* Advanced Faceted Filters */}
      <div style={{ marginBottom: spacing[4] }}>
        <AdvancedFacetedFilters
          onFiltersChange={handleFiltersChange}
          initialFilters={filters}
          loading={loading}
        />
      </div>

      {/* MongoDB Atlas Search Insights Panel */}
      <MongoDBInsightsPanel
        searchQuery={searchQuery}
        activeFilters={filters}
        facetCounts={facets}
        autocompleteActive={autocompleteActive}
      />
      
      <div style={{ marginBottom: spacing[4] }}></div>

      {/* Results Summary */}
      {!loading && (
        <div style={{ marginBottom: spacing[3] }}>
          <Body style={{ color: palette.gray.dark1 }}>
            {totalCount > 0 
              ? `Showing ${entities.length} of ${totalCount} entities (Page ${currentPage})`
              : 'No entities found'
            }
          </Body>
        </div>
      )}

      {/* Entities Table */}
      <Card>
        {loading ? (
          <div style={{ padding: spacing[3] }}>
            <div style={{ height: '600px' }}>
              <ParagraphSkeleton />
              <ParagraphSkeleton />
              <ParagraphSkeleton />
              <ParagraphSkeleton />
              <ParagraphSkeleton />
              <ParagraphSkeleton />
              <ParagraphSkeleton />
              <ParagraphSkeleton />
              <ParagraphSkeleton />
              <ParagraphSkeleton />
            </div>
          </div>
        ) : entities.length > 0 ? (
          <div className={styles.tableContainer}>
            <Table>
              <TableHead>
              <HeaderRow>
                <HeaderCell>Entity ID & Scenario</HeaderCell>
                <HeaderCell>Name & Type</HeaderCell>
                <HeaderCell>Status</HeaderCell>
                <HeaderCell>Risk Score</HeaderCell>
                <HeaderCell>Risk Level</HeaderCell>
                <HeaderCell>Indicators & Actions</HeaderCell>
              </HeaderRow>
            </TableHead>
            <TableBody>
              {entities.map((entity) => (
                <EntityRow 
                  key={entity.entityId} 
                  entity={entity} 
                  onClick={handleEntityClick}
                />
              ))}
            </TableBody>
          </Table>
          </div>
        ) : (
          <div style={{ padding: spacing[4], textAlign: 'center' }}>
            <Icon glyph="Person" size={48} fill={palette.gray.light1} />
            <div style={{ marginTop: spacing[2] }}>
              <H3>No entities found</H3>
              <Body style={{ color: palette.gray.dark1 }}>
                Try adjusting your filters or search criteria.
              </Body>
            </div>
          </div>
        )}
      </Card>

      {/* MongoDB vs PostgreSQL Reality */}
      {!loading && totalCount > 0 && (
        <Banner variant="success" style={{ marginTop: spacing[3] }}>
          <strong>💡 MongoDB vs PostgreSQL Reality:</strong> This search
          processes millions of entities with complex nested structures.
          PostgreSQL JSONB would require 3x storage and complex JSON path
          queries. MongoDB's native document model makes this effortless.
        </Banner>
      )}


      {/* Pagination */}
      {!loading && totalCount > DEFAULT_PAGE_SIZE && (
        <div style={{ 
          marginTop: spacing[4], 
          display: 'flex', 
          justifyContent: 'center',
          alignItems: 'center',
          gap: spacing[2]
        }}>
          <Button 
            variant="default" 
            disabled={!hasPrevious}
            onClick={() => handlePageChange(currentPage - 1)}
            leftGlyph={<Icon glyph="ArrowLeft" />}
          >
            Previous
          </Button>
          
          <Body style={{ color: palette.gray.dark1, padding: `0 ${spacing[2]}px` }}>
            Page {currentPage}
          </Body>
          
          <Button 
            variant="default"
            disabled={!hasNext}
            onClick={() => handlePageChange(currentPage + 1)}
            rightGlyph={<Icon glyph="ArrowRight" />}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}