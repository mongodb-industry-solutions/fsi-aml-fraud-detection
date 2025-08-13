"use client";

import { useState, useEffect } from 'react';
import { Select, Option } from '@leafygreen-ui/select';
import Card from '@leafygreen-ui/card';
import Button from '@leafygreen-ui/button';
import Icon from '@leafygreen-ui/icon';
import { Body, H3 } from '@leafygreen-ui/typography';
import { palette } from '@leafygreen-ui/palette';
import { spacing } from '@leafygreen-ui/tokens';

/**
 * Advanced Faceted Filters Component
 * 
 * Features:
 * - Dynamic facet loading from /entities/search/facets endpoint
 * - Clean, organized UI showing all filters at once
 * - Real-time facet counts and availability
 * - Simplified layout without collapsible sections
 */
export default function AdvancedFacetedFilters({ 
  onFiltersChange, 
  initialFilters = {},
  loading = false 
}) {
  const [facets, setFacets] = useState({});
  const [filters, setFilters] = useState(initialFilters);
  const [facetsLoading, setFacetsLoading] = useState(true);

  // Fetch available facets from the API
  const fetchFacets = async () => {
    try {
      setFacetsLoading(true);
      const amlApiUrl = process.env.NEXT_PUBLIC_AML_API_URL || 'https://threatsight-aml.api.mongodb-industry-solutions.com';
      const response = await fetch(`${amlApiUrl}/entities/search/facets`);
      
      if (response.ok) {
        const data = await response.json();
        // Extract facets from the correct location in the response
        const facetData = data.data?.facet || {};
        console.log('Facets received:', facetData);
        setFacets(facetData);
      } else {
        console.error('Failed to fetch facets');
        setFacets({});
      }
    } catch (error) {
      console.error('Error fetching facets:', error);
      setFacets({});
    } finally {
      setFacetsLoading(false);
    }
  };

  // Load facets on component mount
  useEffect(() => {
    fetchFacets();
  }, []);

  // Update filters and notify parent (simplified for demo - single values only)
  const updateFilter = (filterKey, value) => {
    const newFilters = { ...filters };
    
    // For demo simplicity: store single values, clear if empty
    if (value && value !== '') {
      newFilters[filterKey] = value;
    } else {
      delete newFilters[filterKey];
    }
    
    setFilters(newFilters);
    onFiltersChange?.(newFilters);
  };

  // Clear all filters
  const clearAllFilters = () => {
    const clearedFilters = {};
    setFilters(clearedFilters);
    onFiltersChange?.(clearedFilters);
  };

  // Helper to create select options from facet data
  const createOptions = (facetData, includeAll = true) => {
    const options = [];
    
    if (includeAll) {
      options.push(<Option key="" value="">All</Option>);
    }
    
    // Handle Atlas Search facet bucket format
    if (facetData && facetData.buckets && Array.isArray(facetData.buckets)) {
      facetData.buckets.forEach((bucket) => {
        const value = bucket._id;
        const count = bucket.count;
        if (value && value !== 'null' && value !== 'undefined' && count > 0) {
          options.push(
            <Option key={value} value={value}>
              {formatDisplayValue(value)} ({count})
            </Option>
          );
        }
      });
    }
    
    return options;
  };

  // Format display values for better readability
  const formatDisplayValue = (value) => {
    if (!value) return '';
    return value.charAt(0).toUpperCase() + value.slice(1).replace(/[-_]/g, ' ');
  };

  // Count active filters
  const activeFilterCount = Object.values(filters).filter(v => v && v !== '').length;

  return (
    <Card style={{ padding: spacing[3] }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: spacing[3]
      }}>
        <H3 style={{ margin: 0 }}>
          Advanced Filters
          {activeFilterCount > 0 && (
            <span style={{
              marginLeft: spacing[2],
              padding: `${spacing[1]}px ${spacing[2]}px`,
              backgroundColor: palette.blue.light2,
              color: palette.blue.base,
              borderRadius: '12px',
              fontSize: '12px',
              fontWeight: '600'
            }}>
              {activeFilterCount}
            </span>
          )}
        </H3>
        
        {activeFilterCount > 0 && (
          <Button 
            variant="default" 
            size="small"
            onClick={clearAllFilters}
            leftGlyph={<Icon glyph="X" />}
          >
            Clear All
          </Button>
        )}
      </div>

      {facetsLoading ? (
        <div style={{ padding: spacing[3], textAlign: 'center' }}>
          <Body style={{ color: palette.gray.dark1 }}>Loading filters...</Body>
        </div>
      ) : (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
          gap: spacing[3] 
        }}>
          
          {/* Entity Type Filter */}
          <div>
            <Select
              label="Entity Type"
              placeholder="Choose entity type"
              value={filters.entityType || ''}
              onChange={(value) => updateFilter('entityType', value)}
              disabled={loading}
            >
              {createOptions(facets.entityType)}
            </Select>
          </div>

          {/* Business Type Filter */}
          <div>
            <Select
              label="Business Type"
              placeholder="Choose business type"
              value={filters.businessType || ''}
              onChange={(value) => updateFilter('businessType', value)}
              disabled={loading}
            >
              {createOptions(facets.businessType)}
            </Select>
          </div>

          {/* Risk Level Filter */}
          <div>
            <Select
              label="Risk Level"
              placeholder="Choose risk level"
              value={filters.riskLevel || ''}
              onChange={(value) => updateFilter('riskLevel', value)}
              disabled={loading}
            >
              {createOptions(facets.riskLevel)}
            </Select>
          </div>

          {/* Nationality Filter */}
          <div>
            <Select
              label="Nationality"
              placeholder="Choose nationality"
              value={filters.nationality || ''}
              onChange={(value) => updateFilter('nationality', value)}
              disabled={loading}
            >
              {createOptions(facets.nationality)}
            </Select>
          </div>

          {/* Residency Filter */}
          <div>
            <Select
              label="Residency"
              placeholder="Choose residency"
              value={filters.residency || ''}
              onChange={(value) => updateFilter('residency', value)}
              disabled={loading}
            >
              {createOptions(facets.residency)}
            </Select>
          </div>

          {/* Jurisdiction Filter */}
          <div>
            <Select
              label="Jurisdiction"
              placeholder="Choose jurisdiction"
              value={filters.jurisdiction || ''}
              onChange={(value) => updateFilter('jurisdiction', value)}
              disabled={loading}
            >
              {createOptions(facets.jurisdiction)}
            </Select>
          </div>

        </div>
      )}
    </Card>
  );
}