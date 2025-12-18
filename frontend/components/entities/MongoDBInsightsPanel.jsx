"use client";

import { useState, useEffect } from 'react';
import ExpandableCard from '@leafygreen-ui/expandable-card';
import Code from '@leafygreen-ui/code';
import Callout from '@leafygreen-ui/callout';
import Icon from '@leafygreen-ui/icon';
import IconButton from '@leafygreen-ui/icon-button';
import { Body, H3 } from '@leafygreen-ui/typography';
import { palette } from '@leafygreen-ui/palette';
import { spacing } from '@leafygreen-ui/tokens';

/**
 * MongoDB Insights Panel - Showcases Atlas Search Magic
 * 
 * Features:
 * - Real-time autocomplete pipeline visualization
 * - Faceted search aggregation showcase
 * - Performance metrics and index usage
 * - Live MongoDB query display
 * 
 * Now rendered as a collapsible footer console
 */
export default function MongoDBInsightsPanel({ 
  searchQuery,
  activeFilters,
  facetCounts,
  autocompleteActive = false
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    autocomplete: false,
    facets: false,
    performance: false
  });

  // Generate Atlas Search autocomplete pipeline
  const generateAutocompletePipeline = () => {
    if (!searchQuery || searchQuery.length < 2) return null;
    
    return [
      {
        $search: {
          index: "entity_resolution_search",
          autocomplete: {
            query: searchQuery,
            path: "name.full",
            fuzzy: {
              maxEdits: 1,
              prefixLength: 1
            }
          }
        }
      },
      {
        $limit: 10
      },
      {
        $project: {
          "name.full": 1,
          score: { $meta: "searchScore" }
        }
      }
    ];
  };

  // Generate faceted search pipeline
  const generateFacetsPipeline = () => {
    const facetStages = {};
    
    // Build facet stages for each filter type
    if (facetCounts && Object.keys(facetCounts).length > 0) {
      facetStages.entityType = [
        { $group: { _id: "$entityType", count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ];
      facetStages.riskLevel = [
        { $group: { _id: "$riskAssessment.overall.level", count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ];
      facetStages.jurisdiction = [
        { $group: { _id: "$jurisdictionOfIncorporation", count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ];
    }

    return [
      {
        $searchMeta: {
          index: "entity_resolution_search",
          facet: {
            operator: { wildcard: { query: "*", path: "name.full" } },
            facets: {
              entityType: { type: "string", path: "entityType" },
              riskLevel: { type: "string", path: "riskAssessment.overall.level" },
              jurisdiction: { type: "string", path: "jurisdictionOfIncorporation" },
              businessType: { type: "string", path: "customerInfo.businessType" }
            }
          }
        }
      }
    ];
  };

  // Generate active filter conditions
  const generateFilterConditions = () => {
    if (!activeFilters || Object.keys(activeFilters).length === 0) {
      return { message: "No filters applied" };
    }

    const conditions = {};
    Object.entries(activeFilters).forEach(([key, value]) => {
      if (value) {
        switch (key) {
          case 'entityType':
            conditions.entityType = value;
            break;
          case 'riskLevel':
            conditions['riskAssessment.overall.level'] = value;
            break;
          case 'jurisdiction':
            conditions.jurisdictionOfIncorporation = value;
            break;
          case 'businessType':
            conditions['customerInfo.businessType'] = value;
            break;
          default:
            conditions[key] = value;
        }
      }
    });

    return conditions;
  };

  // Count active filters
  const activeFilterCount = activeFilters ? Object.values(activeFilters).filter(v => v && v !== '').length : 0;

  // Toggle console open/closed
  const toggleConsole = () => {
    setIsOpen(!isOpen);
  };

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        transition: 'transform 0.3s ease-in-out',
        transform: isOpen ? 'translateY(0)' : 'translateY(calc(100% - 48px))',
      }}
    >
      {/* Clickable Header Bar */}
      <div
        onClick={toggleConsole}
        style={{
          backgroundColor: palette.gray.dark3,
          color: palette.gray.light3,
          padding: `${spacing[2]}px ${spacing[4]}px`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          borderTop: `2px solid ${palette.green.base}`,
          boxShadow: '0 -4px 12px rgba(0, 0, 0, 0.15)',
          height: '48px',
          boxSizing: 'border-box',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2] }}>
          <Icon glyph="Sparkle" size={18} fill={palette.green.base} />
          <Body style={{ 
            color: palette.gray.light3, 
            fontWeight: 600, 
            fontSize: '14px',
            margin: 0 
          }}>
            MongoDB Atlas Search Insights
          </Body>
          
          {/* Status indicators in header */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: spacing[2],
            marginLeft: spacing[3]
          }}>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: spacing[1],
              padding: `2px ${spacing[2]}px`,
              backgroundColor: autocompleteActive ? palette.green.dark1 : palette.gray.dark2,
              borderRadius: '12px',
              fontSize: '11px',
              fontWeight: '500',
              color: autocompleteActive ? palette.green.light2 : palette.gray.light1
            }}>
              <Icon 
                glyph={autocompleteActive ? "Refresh" : "MagnifyingGlass"} 
                size={12} 
                fill={autocompleteActive ? palette.green.light2 : palette.gray.light1} 
              />
              Autocomplete: {autocompleteActive ? 'Active' : 'Idle'}
            </span>
            
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: spacing[1],
              padding: `2px ${spacing[2]}px`,
              backgroundColor: activeFilterCount > 0 ? palette.blue.dark1 : palette.gray.dark2,
              borderRadius: '12px',
              fontSize: '11px',
              fontWeight: '500',
              color: activeFilterCount > 0 ? palette.blue.light2 : palette.gray.light1
            }}>
              <Icon 
                glyph="Filter" 
                size={12} 
                fill={activeFilterCount > 0 ? palette.blue.light2 : palette.gray.light1} 
              />
              Facets: {activeFilterCount} active
            </span>
          </div>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2] }}>
          <Body style={{ 
            color: palette.gray.light1, 
            fontSize: '12px',
            margin: 0 
          }}>
            {isOpen ? 'Click to close' : 'Click to open'}
          </Body>
          <Icon 
            glyph={isOpen ? "ChevronDown" : "ChevronUp"} 
            size={16} 
            fill={palette.gray.light1} 
          />
        </div>
      </div>

      {/* Console Content */}
      <div
        style={{
          backgroundColor: palette.gray.dark2,
          maxHeight: '60vh',
          overflowY: 'auto',
          padding: isOpen ? spacing[4] : 0,
          opacity: isOpen ? 1 : 0,
          transition: 'opacity 0.2s ease-in-out',
        }}
      >
        {/* MongoDB Advantage */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: spacing[2],
            marginBottom: spacing[4],
            padding: spacing[3],
            backgroundColor: palette.green.dark1,
            borderRadius: '8px',
            border: `1px solid ${palette.green.base}`
          }}
        >
          <Icon glyph="Sparkle" fill={palette.green.light2} />
          <Body style={{ fontSize: '13px', color: palette.green.light2 }}>
            <strong>MongoDB Advantage:</strong> Real-time fuzzy matching with 
            autocomplete powered by MongoDB's native full-text search. Faceted 
            search aggregations computed in real-time without separate OLAP systems or
            pre-computed views. Elasticsearch would require separate cluster
            management and data synchronization.
          </Body>
        </div>

        {/* Autocomplete Insights */}
        <ExpandableCard 
          title="Real-time Autocomplete"
          description={`Atlas Search autocomplete using name.full field with fuzzy matching${searchQuery ? ` for "${searchQuery}"` : ''}`}
          defaultOpen={autocompleteActive}
          style={{ marginBottom: spacing[3] }}
          darkMode={true}
        >
          <div style={{ padding: spacing[3] }}>
            {searchQuery && searchQuery.length >= 2 ? (
              <>
                <Callout variant="note" style={{ marginBottom: spacing[3] }}>
                  <strong>Index Field:</strong> name.full with autocomplete analyzer (2-15 character n-grams)
                </Callout>
                
                <H3 style={{ marginBottom: spacing[2], color: palette.gray.light3 }}>Atlas Search Pipeline</H3>
                <Code 
                  language="javascript"
                  style={{ marginBottom: spacing[3] }}
                >
                  {JSON.stringify(generateAutocompletePipeline(), null, 2)}
                </Code>
                
                <Body style={{ color: palette.gray.light1 }}>
                  This pipeline searches the name.full field with fuzzy matching, 
                  allowing for up to 1 character difference to handle typos.
                </Body>
              </>
            ) : (
              <Body style={{ color: palette.gray.light1, fontStyle: 'italic' }}>
                Start typing in the search bar to see the autocomplete pipeline in action...
              </Body>
            )}
          </div>
        </ExpandableCard>

        {/* Facets Insights */}
        <ExpandableCard 
          title="Dynamic Faceted Search"
          description={`Real-time facet aggregation with ${Object.keys(facetCounts || {}).length} facet types`}
          defaultOpen={activeFilterCount > 0}
          style={{ marginBottom: spacing[3] }}
          darkMode={true}
        >
          <div style={{ padding: spacing[3] }}>
            <Callout variant="tip" style={{ marginBottom: spacing[3] }}>
              <strong>$searchMeta Stage:</strong> Efficiently computes facet counts without returning documents
            </Callout>
            
            <H3 style={{ marginBottom: spacing[2], color: palette.gray.light3 }}>Facet Aggregation Pipeline</H3>
            <Code 
              language="javascript"
              style={{ marginBottom: spacing[3] }}
            >
              {JSON.stringify(generateFacetsPipeline(), null, 2)}
            </Code>

            {activeFilterCount > 0 && (
              <>
                <H3 style={{ marginBottom: spacing[2], color: palette.gray.light3 }}>Active Filter Conditions</H3>
                <Code 
                  language="javascript"
                  style={{ marginBottom: spacing[3] }}
                >
                  {JSON.stringify(generateFilterConditions(), null, 2)}
                </Code>
              </>
            )}
            
            <Body style={{ color: palette.gray.light1 }}>
              Atlas Search facets provide real-time counts for filtering options, 
              enabling dynamic user interfaces with instant feedback.
            </Body>
          </div>
        </ExpandableCard>
      </div>
    </div>
  );
}
