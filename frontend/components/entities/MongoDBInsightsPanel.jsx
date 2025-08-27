"use client";

import { useState, useEffect } from 'react';
import Card from '@leafygreen-ui/card';
import ExpandableCard from '@leafygreen-ui/expandable-card';
import Code from '@leafygreen-ui/code';
import Callout from '@leafygreen-ui/callout';
import Icon from '@leafygreen-ui/icon';
import { Body, H3} from '@leafygreen-ui/typography';
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
 */
export default function MongoDBInsightsPanel({ 
  searchQuery,
  activeFilters,
  facetCounts,
  autocompleteActive = false
}) {
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

  return (
    <Card style={{ marginBottom: spacing[4] }}>
      <div style={{ padding: spacing[3] }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: spacing[2],
          marginBottom: spacing[3]
        }}>
          <Icon glyph="Sparkle" size={20} fill={palette.green.base} />
          <H3 style={{ margin: 0 }}>MongoDB Atlas Search Insights</H3>
        </div>

        {/* MongoDB Advantage */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: spacing[2],
            marginTop: spacing[2],
            marginBottom: spacing[3],
            padding: spacing[2],
            backgroundColor: palette.green.light3,
            borderRadius: '8px'
          }}
        >
          <Icon glyph="Sparkle" fill={palette.green.base} />
          <Body style={{ fontSize: '12px', color: palette.green.dark2 }}>
            <strong>MongoDB Advantage:</strong> Real-time fuzzy matching with 
            autocomplete powered by MongoDB's native full-text search.Faceted 
            search aggregations computed in real-time without separate OLAP systems or
            pre-computed views. Elasticsearch would require separate cluster
            management and data synchronization.
          </Body>
        </div>

        {/* Real-time Status */}
        <div style={{ 
          display: 'flex', 
          gap: spacing[3], 
          marginBottom: spacing[4],
          flexWrap: 'wrap'
        }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: spacing[1],
            padding: `${spacing[1]}px ${spacing[2]}px`,
            backgroundColor: autocompleteActive ? palette.green.light2 : palette.gray.light2,
            borderRadius: '16px',
            border: `1px solid ${autocompleteActive ? palette.green.base : palette.gray.light1}`
          }}>
            <Icon 
              glyph={autocompleteActive ? "Refresh" : "MagnifyingGlass"} 
              size={14} 
              fill={autocompleteActive ? palette.green.base : palette.gray.base} 
            />
            <Body style={{ 
              fontSize: '12px', 
              fontWeight: '600',
              color: autocompleteActive ? palette.green.dark2 : palette.gray.dark1 
            }}>
              Autocomplete: {autocompleteActive ? 'Active' : 'Idle'}
            </Body>
          </div>

          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: spacing[1],
            padding: `${spacing[1]}px ${spacing[2]}px`,
            backgroundColor: activeFilterCount > 0 ? palette.blue.light2 : palette.gray.light2,
            borderRadius: '16px',
            border: `1px solid ${activeFilterCount > 0 ? palette.blue.base : palette.gray.light1}`
          }}>
            <Icon 
              glyph="Filter" 
              size={14} 
              fill={activeFilterCount > 0 ? palette.blue.base : palette.gray.base} 
            />
            <Body style={{ 
              fontSize: '12px', 
              fontWeight: '600',
              color: activeFilterCount > 0 ? palette.blue.dark2 : palette.gray.dark1 
            }}>
              Facets: {activeFilterCount} active
            </Body>
          </div>

        </div>

        {/* Autocomplete Insights */}
        <ExpandableCard 
          title="🔍 Real-time Autocomplete"
          description={`Atlas Search autocomplete using name.full field with fuzzy matching${searchQuery ? ` for "${searchQuery}"` : ''}`}
          defaultOpen={autocompleteActive}
          style={{ marginBottom: spacing[3] }}
        >
          <div style={{ padding: spacing[3] }}>
            {searchQuery && searchQuery.length >= 2 ? (
              <>
                <Callout variant="note" style={{ marginBottom: spacing[3] }}>
                  <strong>Index Field:</strong> name.full with autocomplete analyzer (2-15 character n-grams)
                </Callout>
                
                <H3 style={{ marginBottom: spacing[2] }}>Atlas Search Pipeline</H3>
                <Code 
                  language="javascript"
                  style={{ marginBottom: spacing[3] }}
                >
                  {JSON.stringify(generateAutocompletePipeline(), null, 2)}
                </Code>
                
                <Body style={{ color: palette.gray.dark1 }}>
                  This pipeline searches the name.full field with fuzzy matching, 
                  allowing for up to 1 character difference to handle typos.
                </Body>
              </>
            ) : (
              <Body style={{ color: palette.gray.dark1, fontStyle: 'italic' }}>
                Start typing in the search bar to see the autocomplete pipeline in action...
              </Body>
            )}
          </div>
        </ExpandableCard>

        {/* Facets Insights */}
        <ExpandableCard 
          title="📊 Dynamic Faceted Search"
          description={`Real-time facet aggregation with ${Object.keys(facetCounts || {}).length} facet types`}
          defaultOpen={activeFilterCount > 0}
          style={{ marginBottom: spacing[3] }}
        >
          <div style={{ padding: spacing[3] }}>
            <Callout variant="tip" style={{ marginBottom: spacing[3] }}>
              <strong>$searchMeta Stage:</strong> Efficiently computes facet counts without returning documents
            </Callout>
            
            <H3 style={{ marginBottom: spacing[2] }}>Facet Aggregation Pipeline</H3>
            <Code 
              language="javascript"
              style={{ marginBottom: spacing[3] }}
            >
              {JSON.stringify(generateFacetsPipeline(), null, 2)}
            </Code>

            {activeFilterCount > 0 && (
              <>
                <H3 style={{ marginBottom: spacing[2] }}>Active Filter Conditions</H3>
                <Code 
                  language="javascript"
                  style={{ marginBottom: spacing[3] }}
                >
                  {JSON.stringify(generateFilterConditions(), null, 2)}
                </Code>
              </>
            )}
            
            <Body style={{ color: palette.gray.dark1 }}>
              Atlas Search facets provide real-time counts for filtering options, 
              enabling dynamic user interfaces with instant feedback.
            </Body>
          </div>
        </ExpandableCard>
      </div>
    </Card>
  );
}