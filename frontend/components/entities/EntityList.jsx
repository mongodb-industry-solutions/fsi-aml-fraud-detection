"use client";

import { useState, useEffect } from 'react';
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
import RiskScoreSlider from './RiskScoreSlider';
import styles from './EntityList.module.css';

// Constants
const DEFAULT_PAGE_SIZE = 20;

// Helper function to create filter options with counts
const createFilterOptions = (items, allLabel) => {
  const options = [{ value: '', label: allLabel }];
  items.forEach(item => {
    const label = item.count ? 
      `${amlUtils.formatEntityType(item.id)} (${item.count})` : 
      amlUtils.formatEntityType(item.id);
    options.push({ value: item.id, label });
  });
  return options;
};

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
          <Body weight="medium">{entity.name_full}</Body>
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
  
  // Filters
  const [entityTypeFilter, setEntityTypeFilter] = useState('');
  const [riskLevelFilter, setRiskLevelFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [scenarioFilter, setScenarioFilter] = useState('');
  const [countryFilter, setCountryFilter] = useState('');
  const [businessTypeFilter, setBusinessTypeFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [riskScoreMin, setRiskScoreMin] = useState('');
  const [riskScoreMax, setRiskScoreMax] = useState('');
  
  // Facet data
  const [facets, setFacets] = useState({});
  const [filterOptions, setFilterOptions] = useState({
    entity_types: [],
    risk_levels: [],
    statuses: [],
    countries: [],
    business_types: [],
    scenario_keys: [],
    risk_score_distribution: { min_score: 0, max_score: 100, avg_score: 50 }
  });

  // Load entities using faceted search
  const loadEntities = async (page = 1, filters = {}) => {
    try {
      setLoading(true);
      setError(null);

      // Prepare search request with all filters
      const searchRequest = {
        search_query: searchTerm || '',
        entity_type: filters.entityType || entityTypeFilter || undefined,
        risk_level: filters.riskLevel || riskLevelFilter || undefined,
        status: filters.status || statusFilter || undefined,
        scenario_key: filters.scenarioKey || scenarioFilter || undefined,
        country: filters.country || countryFilter || undefined,
        business_type: filters.businessType || businessTypeFilter || undefined,
        risk_score_min: filters.riskScoreMin || riskScoreMin ? parseFloat(filters.riskScoreMin || riskScoreMin) : undefined,
        risk_score_max: filters.riskScoreMax || riskScoreMax ? parseFloat(filters.riskScoreMax || riskScoreMax) : undefined,
        skip: (page - 1) * DEFAULT_PAGE_SIZE,
        limit: DEFAULT_PAGE_SIZE
      };

      // Remove undefined values
      Object.keys(searchRequest).forEach(key => {
        if (searchRequest[key] === undefined || searchRequest[key] === '') {
          delete searchRequest[key];
        }
      });

      const response = await amlAPI.facetedEntitySearch(searchRequest);

      setEntities(response.entities || []);
      setTotalCount(response.total_count || 0);
      setCurrentPage(response.page || page);
      setHasNext(response.has_next || false);
      setHasPrevious(response.has_previous || false);
      
      // Update facets from response
      if (response.facets) {
        setFacets(response.facets);
      }

    } catch (err) {
      console.error('Error loading entities:', err);
      setError(handleError(err));
      setEntities([]);
    } finally {
      setLoading(false);
    }
  };

  // Load filter options on initial load
  const loadFilterOptions = async () => {
    try {
      const options = await amlAPI.getFilterOptions();
      setFilterOptions(options);
    } catch (err) {
      console.error('Error loading filter options:', err);
      // Continue with default options if this fails
    }
  };

  // Initial load
  useEffect(() => {
    loadFilterOptions();
    loadEntities();
  }, []);

  // Handle filter changes
  const handleFilterChange = (filterType, value) => {
    const filters = { 
      entityType: entityTypeFilter, 
      riskLevel: riskLevelFilter,
      status: statusFilter,
      scenarioKey: scenarioFilter,
      country: countryFilter,
      businessType: businessTypeFilter,
      riskScoreMin,
      riskScoreMax
    };
    filters[filterType] = value;
    
    // Update individual filter states
    switch (filterType) {
      case 'entityType': setEntityTypeFilter(value); break;
      case 'riskLevel': setRiskLevelFilter(value); break;
      case 'status': setStatusFilter(value); break;
      case 'scenarioKey': setScenarioFilter(value); break;
      case 'country': setCountryFilter(value); break;
      case 'businessType': setBusinessTypeFilter(value); break;
      case 'riskScoreMin': setRiskScoreMin(value); break;
      case 'riskScoreMax': setRiskScoreMax(value); break;
    }
    
    setCurrentPage(1);
    loadEntities(1, filters);
  };

  // Handle risk score range changes
  const handleRiskScoreRangeChange = (min, max) => {
    const filters = {
      entityType: entityTypeFilter,
      riskLevel: riskLevelFilter,
      status: statusFilter,
      scenarioKey: scenarioFilter,
      country: countryFilter,
      businessType: businessTypeFilter,
      riskScoreMin: min,
      riskScoreMax: max
    };
    
    setRiskScoreMin(min);
    setRiskScoreMax(max);
    setCurrentPage(1);
    loadEntities(1, filters);
  };

  // Handle search
  const handleSearch = () => {
    setCurrentPage(1);
    loadEntities(1);
  };

  // Handle entity click
  const handleEntityClick = (entityId) => {
    router.push(`/entities/${entityId}`);
  };

  // Handle pagination
  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
    loadEntities(newPage);
  };

  return (
    <div style={{ padding: spacing[0] }}>
      {/* Header */}
      <div style={{ marginBottom: spacing[4] }}>
        <H1>Entity Management</H1>
        <Subtitle>AML/KYC Entity Resolution and Management</Subtitle>
      </div>

      {/* Error Banner */}
      {error && (
        <div style={{ marginBottom: spacing[3] }}>
          <Banner variant="danger">{error}</Banner>
        </div>
      )}

      {/* Filters and Search */}
      <Card style={{ marginBottom: spacing[4], padding: spacing[3] }}>
        <div style={{ display: 'flex', gap: spacing[3], alignItems: 'flex-start', flexWrap: 'wrap' }}>
          {/* Row 1: Core Entity Filters */}
          <div style={{ display: 'flex', gap: spacing[3], alignItems: 'flex-end', flexWrap: 'wrap', width: '100%' }}>
            <div style={{ minWidth: '200px' }}>
              <Select
                label="Entity Type"
                value={entityTypeFilter}
                onChange={(value) => handleFilterChange('entityType', value)}
              >
                {createFilterOptions(filterOptions.entity_types, 'All Types').map(type => (
                  <Option key={type.value} value={type.value}>
                    {type.label}
                  </Option>
                ))}
              </Select>
            </div>

            <div style={{ minWidth: '200px' }}>
              <Select
                label="Risk Level"
                value={riskLevelFilter}
                onChange={(value) => handleFilterChange('riskLevel', value)}
              >
                {createFilterOptions(filterOptions.risk_levels, 'All Risk Levels').map(level => (
                  <Option key={level.value} value={level.value}>
                    {level.label}
                  </Option>
                ))}
              </Select>
            </div>

            <div style={{ minWidth: '200px' }}>
              <Select
                label="Status"
                value={statusFilter}
                onChange={(value) => handleFilterChange('status', value)}
              >
                {createFilterOptions(filterOptions.statuses, 'All Statuses').map(status => (
                  <Option key={status.value} value={status.value}>
                    {status.label}
                  </Option>
                ))}
              </Select>
            </div>

            {filterOptions.countries.length > 0 && (
              <div style={{ minWidth: '200px' }}>
                <Select
                  label="Country"
                  value={countryFilter}
                  onChange={(value) => handleFilterChange('country', value)}
                >
                  {createFilterOptions(filterOptions.countries, 'All Countries').map(country => (
                    <Option key={country.value} value={country.value}>
                      {country.label}
                    </Option>
                  ))}
                </Select>
              </div>
            )}

            {filterOptions.business_types.length > 0 && (
              <div style={{ minWidth: '200px' }}>
                <Select
                  label="Business Type"
                  value={businessTypeFilter}
                  onChange={(value) => handleFilterChange('businessType', value)}
                >
                  {createFilterOptions(filterOptions.business_types, 'All Business Types').map(type => (
                    <Option key={type.value} value={type.value}>
                      {type.label}
                    </Option>
                  ))}
                </Select>
              </div>
            )}
          </div>

          {/* Row 2: Advanced Filters */}
          <div style={{ display: 'flex', gap: spacing[3], alignItems: 'flex-end', flexWrap: 'wrap', width: '100%' }}>
            {filterOptions.scenario_keys.length > 0 && (
              <div style={{ minWidth: '250px' }}>
                <Select
                  label="Demo Scenario"
                  value={scenarioFilter}
                  onChange={(value) => handleFilterChange('scenarioKey', value)}
                >
                  {createFilterOptions(filterOptions.scenario_keys.slice(0, 20), 'All Scenarios').map(scenario => (
                    <Option key={scenario.value} value={scenario.value}>
                      {scenario.label}
                    </Option>
                  ))}
                </Select>
              </div>
            )}

            <RiskScoreSlider
              min={filterOptions.risk_score_distribution.min_score || 0}
              max={filterOptions.risk_score_distribution.max_score || 100}
              value={[
                riskScoreMin ? parseFloat(riskScoreMin) : filterOptions.risk_score_distribution.min_score || 0,
                riskScoreMax ? parseFloat(riskScoreMax) : filterOptions.risk_score_distribution.max_score || 100
              ]}
              onChange={handleRiskScoreRangeChange}
              distribution={filterOptions.risk_score_distribution}
            />

            <div style={{ minWidth: '300px' }}>
              <TextInput
                label="Search Entities"
                placeholder="Search by name or ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>

            <Button 
              variant="primary"
              onClick={handleSearch}
              leftGlyph={<Icon glyph="MagnifyingGlass" />}
            >
              Search
            </Button>

            <Button 
              variant="default"
              onClick={() => {
                setEntityTypeFilter('');
                setRiskLevelFilter('');
                setStatusFilter('');
                setScenarioFilter('');
                setCountryFilter('');
                setBusinessTypeFilter('');
                setSearchTerm('');
                setRiskScoreMin('');
                setRiskScoreMax('');
                setCurrentPage(1);
                loadEntities(1, {});
              }}
            >
              Clear Filters
            </Button>
          </div>
        </div>
      </Card>

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