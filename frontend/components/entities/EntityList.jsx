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
  ParagraphSkeleton, 
  TableSkeleton
} from '@leafygreen-ui/skeleton-loader';
import Callout from '@leafygreen-ui/callout';
import { palette } from '@leafygreen-ui/palette';
import { spacing } from '@leafygreen-ui/tokens';
import { amlAPI, useAMLAPIError, amlUtils } from '@/lib/aml-api';
import styles from './EntityList.module.css';

// Constants
const DEFAULT_PAGE_SIZE = 20;
const ENTITY_TYPES = [
  { value: '', label: 'All Types' },
  { value: 'individual', label: 'Individual' },
  { value: 'organization', label: 'Organization' }
];

const RISK_LEVELS = [
  { value: '', label: 'All Risk Levels' },
  { value: 'low', label: 'Low Risk' },
  { value: 'medium', label: 'Medium Risk' },
  { value: 'high', label: 'High Risk' }
];

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
        </div>
      </Cell>
      <Cell>
        <div>
          <Body weight="medium">{entity.name_full}</Body>
        </div>
      </Cell>
      <Cell>
        <div>
          <Body>{amlUtils.formatEntityType(entity.entityType)}</Body>
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
        <div style={{ display: 'flex', justifyContent: 'center' }}>
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
  const [searchTerm, setSearchTerm] = useState('');

  // Load entities
  const loadEntities = async (page = 1, filters = {}) => {
    try {
      setLoading(true);
      setError(null);

      const response = await amlAPI.getEntitiesPaginated(page, DEFAULT_PAGE_SIZE, {
        entity_type: filters.entityType || entityTypeFilter,
        risk_level: filters.riskLevel || riskLevelFilter,
      });

      setEntities(response.entities || []);
      setTotalCount(response.total_count || 0);
      setCurrentPage(response.page || page);
      setHasNext(response.has_next || false);
      setHasPrevious(response.has_previous || false);

    } catch (err) {
      console.error('Error loading entities:', err);
      setError(handleError(err));
      setEntities([]);
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    loadEntities();
  }, []);

  // Handle filter changes
  const handleFilterChange = (filterType, value) => {
    const filters = { entityType: entityTypeFilter, riskLevel: riskLevelFilter };
    filters[filterType] = value;
    
    if (filterType === 'entityType') setEntityTypeFilter(value);
    if (filterType === 'riskLevel') setRiskLevelFilter(value);
    
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
        <div style={{ display: 'flex', gap: spacing[3], alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ minWidth: '200px' }}>
            <Select
              label="Entity Type"
              value={entityTypeFilter}
              onChange={(value) => handleFilterChange('entityType', value)}
            >
              {ENTITY_TYPES.map(type => (
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
              {RISK_LEVELS.map(level => (
                <Option key={level.value} value={level.value}>
                  {level.label}
                </Option>
              ))}
            </Select>
          </div>

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
              setSearchTerm('');
              setCurrentPage(1);
              loadEntities(1, { entityType: '', riskLevel: '' });
            }}
          >
            Clear Filters
          </Button>
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
            <TableSkeleton 
              rowCount={10}
              columnCount={6}
              style={{ height: '600px' }}
            />
          </div>
        ) : entities.length > 0 ? (
          <Table>
            <TableHead>
              <HeaderRow>
                <HeaderCell>Entity ID</HeaderCell>
                <HeaderCell>Name</HeaderCell>
                <HeaderCell>Type</HeaderCell>
                <HeaderCell>Risk Score</HeaderCell>
                <HeaderCell>Risk Level</HeaderCell>
                <HeaderCell>Actions</HeaderCell>
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