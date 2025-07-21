"use client";

import React, { useState } from 'react';
import Card from '@leafygreen-ui/card';
import Button from '@leafygreen-ui/button';
import { H3, Body, Label } from '@leafygreen-ui/typography';
import { Table, TableBody, TableHead, HeaderRow, HeaderCell, Row, Cell } from '@leafygreen-ui/table';
import Icon from '@leafygreen-ui/icon';
import Badge from '@leafygreen-ui/badge';
import { Spinner } from '@leafygreen-ui/loading-indicator';
import { palette } from '@leafygreen-ui/palette';
import { spacing } from '@leafygreen-ui/tokens';

/**
 * Parallel Search Interface
 * 
 * Displays results from both Atlas Search and Vector Search in a modern,
 * side-by-side comparison with correlation analysis and combined intelligence.
 */
function ParallelSearchInterface({ searchResults, isLoading = false }) {
  const [selectedTab, setSelectedTab] = useState(0); // 0: Atlas, 1: Vector, 2: Combined
  
  if (isLoading) {
    return (
      <Card style={{ padding: spacing[4] }}>
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column',
          alignItems: 'center', 
          justifyContent: 'center',
          minHeight: '400px',
          gap: spacing[3]
        }}>
          <Spinner size="large" />
          <H3>Performing Parallel Search</H3>
          <Body style={{ textAlign: 'center', color: palette.gray.dark1 }}>
            Executing Atlas Search and Vector Search simultaneously...
          </Body>
          <div style={{ 
            display: 'flex', 
            gap: spacing[4],
            marginTop: spacing[2]
          }}>
            <div style={{ textAlign: 'center' }}>
              <Icon glyph="MagnifyingGlass" style={{ color: palette.blue.base }} />
              <Body style={{ fontSize: '12px', marginTop: spacing[1] }}>Atlas Search</Body>
            </div>
            <div style={{ textAlign: 'center' }}>
              <Icon glyph="Diagram3" style={{ color: palette.purple.base }} />
              <Body style={{ fontSize: '12px', marginTop: spacing[1] }}>Vector Search</Body>
            </div>
            <div style={{ textAlign: 'center' }}>
              <Icon glyph="Connect" style={{ color: palette.green.base }} />
              <Body style={{ fontSize: '12px', marginTop: spacing[1] }}>Correlation</Body>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  if (!searchResults) {
    return (
      <Card style={{ padding: spacing[4] }}>
        <div style={{ textAlign: 'center', color: palette.gray.base }}>
          <Icon glyph="MagnifyingGlass" size={48} style={{ marginBottom: spacing[2] }} />
          <Body>Search results will appear here</Body>
        </div>
      </Card>
    );
  }

  const { 
    atlasResults = [], 
    vectorResults = [], 
    combinedResults = [],
    searchMetrics = {},
    correlationAnalysis = {}
  } = searchResults;

  /**
   * Get risk badge variant based on score
   */
  const getRiskBadgeVariant = (riskScore) => {
    if (riskScore >= 80) return 'red';
    if (riskScore >= 60) return 'yellow';
    if (riskScore >= 40) return 'lightgray';
    return 'green';
  };

  /**
   * Format entity name for display
   */
  const formatEntityName = (entity) => {
    if (!entity) return 'Unknown Entity';
    if (entity.name && typeof entity.name === 'string') return entity.name;
    if (entity.name && entity.name.full) return entity.name.full;
    return entity.entityId || 'Unknown Entity';
  };

  /**
   * Render search results table
   */
  const renderResultsTable = (results, searchType) => {
    if (!results || results.length === 0) {
      return (
        <div style={{ 
          textAlign: 'center', 
          padding: spacing[4],
          color: palette.gray.base
        }}>
          <Icon glyph="Warning" style={{ marginBottom: spacing[2] }} />
          <Body>No {searchType} results found</Body>
        </div>
      );
    }

    return (
      <Table>
        <TableHead>
          <HeaderRow>
            <HeaderCell>Entity</HeaderCell>
            <HeaderCell>Match Score</HeaderCell>
            <HeaderCell>Risk Level</HeaderCell>
            <HeaderCell>Type</HeaderCell>
          </HeaderRow>
        </TableHead>
        <TableBody>
          {results.slice(0, 10).map((entity, index) => (
            <Row key={entity.entityId || index}>
              <Cell>
                <div>
                  <Body weight="medium" style={{ fontSize: '13px' }}>
                    {formatEntityName(entity)}
                  </Body>
                  <Body style={{ fontSize: '11px', color: palette.gray.dark1 }}>
                    ID: {entity.entityId}
                  </Body>
                </div>
              </Cell>
              <Cell>
                <div style={{ display: 'flex', alignItems: 'center', gap: spacing[1] }}>
                  <div style={{
                    width: '40px',
                    height: '6px',
                    backgroundColor: palette.gray.light2,
                    borderRadius: '3px',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      width: `${(entity.matchScore || entity.confidence || 0) * 100}%`,
                      height: '100%',
                      backgroundColor: palette.blue.base
                    }} />
                  </div>
                  <Body style={{ fontSize: '12px' }}>
                    {((entity.matchScore || entity.confidence || 0) * 100).toFixed(1)}%
                  </Body>
                </div>
              </Cell>
              <Cell>
                <Badge 
                  variant={getRiskBadgeVariant(entity.riskAssessment?.overall?.score || 0)}
                >
                  {entity.riskAssessment?.overall?.level || 'Unknown'}
                </Badge>
              </Cell>
              <Cell>
                <Body style={{ fontSize: '12px' }}>
                  {entity.entityType || 'Unknown'}
                </Body>
              </Cell>
            </Row>
          ))}
        </TableBody>
      </Table>
    );
  };

  return (
    <Card style={{ padding: spacing[4] }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: spacing[4]
      }}>
        <H3 style={{ 
          margin: 0,
          display: 'flex',
          alignItems: 'center',
          gap: spacing[2]
        }}>
          <Icon glyph="Diagram2" style={{ color: palette.blue.base }} />
          Parallel Search Results
        </H3>
        
        {/* Search Metrics */}
        <div style={{ display: 'flex', gap: spacing[3], fontSize: '12px' }}>
          <div style={{ textAlign: 'center' }}>
            <Body weight="medium">{atlasResults.length}</Body>
            <Body style={{ color: palette.gray.dark1 }}>Atlas</Body>
          </div>
          <div style={{ textAlign: 'center' }}>
            <Body weight="medium">{vectorResults.length}</Body>
            <Body style={{ color: palette.gray.dark1 }}>Vector</Body>
          </div>
          <div style={{ textAlign: 'center' }}>
            <Body weight="medium">{combinedResults.length}</Body>
            <Body style={{ color: palette.gray.dark1 }}>Combined</Body>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div style={{ 
        display: 'flex', 
        borderBottom: `1px solid ${palette.gray.light2}`,
        marginBottom: spacing[3]
      }}>
        {[
          { id: 0, label: 'Atlas Search', icon: 'MagnifyingGlass', color: palette.blue.base },
          { id: 1, label: 'Vector Search', icon: 'Diagram3', color: palette.purple.base },
          { id: 2, label: 'Combined Results', icon: 'Connect', color: palette.green.base }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSelectedTab(tab.id)}
            style={{
              padding: `${spacing[2]}px ${spacing[3]}px`,
              border: 'none',
              backgroundColor: 'transparent',
              borderBottom: selectedTab === tab.id ? `2px solid ${tab.color}` : '2px solid transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: spacing[1],
              color: selectedTab === tab.id ? tab.color : palette.gray.dark1,
              fontWeight: selectedTab === tab.id ? '600' : '400',
              fontSize: '14px'
            }}
          >
            <Icon glyph={tab.icon} size={16} fill={selectedTab === tab.id ? tab.color : palette.gray.base} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div style={{ minHeight: '400px' }}>
        
        {/* Atlas Search Results */}
        {selectedTab === 0 && (
          <div>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: spacing[3]
            }}>
              <H3 style={{ margin: 0, fontSize: '16px' }}>Traditional Atlas Search</H3>
              <Body style={{ fontSize: '12px', color: palette.gray.dark1 }}>
                Fuzzy matching based on name, address, and identifiers
              </Body>
            </div>
            {renderResultsTable(atlasResults, 'Atlas')}
          </div>
        )}

        {/* Vector Search Results */}
        {selectedTab === 1 && (
          <div>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: spacing[3]
            }}>
              <H3 style={{ margin: 0, fontSize: '16px' }}>AI Vector Search</H3>
              <Body style={{ fontSize: '12px', color: palette.gray.dark1 }}>
                Semantic similarity using AI embeddings
              </Body>
            </div>
            {renderResultsTable(vectorResults, 'Vector')}
          </div>
        )}

        {/* Combined Results */}
        {selectedTab === 2 && (
          <div>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: spacing[3]
            }}>
              <H3 style={{ margin: 0, fontSize: '16px' }}>Combined Intelligence</H3>
              <Body style={{ fontSize: '12px', color: palette.gray.dark1 }}>
                Correlation-weighted results from both methods
              </Body>
            </div>
            
            {/* Correlation Metrics */}
            {correlationAnalysis && Object.keys(correlationAnalysis).length > 0 && (
              <Card style={{ 
                padding: spacing[3], 
                marginBottom: spacing[3],
                backgroundColor: palette.blue.light3
              }}>
                <H3 style={{ fontSize: '14px', marginBottom: spacing[2] }}>
                  Correlation Analysis
                </H3>
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', 
                  gap: spacing[2]
                }}>
                  <div style={{ textAlign: 'center' }}>
                    <Body weight="medium" style={{ fontSize: '16px' }}>
                      {correlationAnalysis.intersectionCount || 0}
                    </Body>
                    <Body style={{ fontSize: '12px', color: palette.gray.dark1 }}>
                      Intersection
                    </Body>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <Body weight="medium" style={{ fontSize: '16px' }}>
                      {(correlationAnalysis.correlationPercentage || 0).toFixed(1)}%
                    </Body>
                    <Body style={{ fontSize: '12px', color: palette.gray.dark1 }}>
                      Correlation
                    </Body>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <Body weight="medium" style={{ fontSize: '16px' }}>
                      {(correlationAnalysis.confidenceScore || 0).toFixed(2)}
                    </Body>
                    <Body style={{ fontSize: '12px', color: palette.gray.dark1 }}>
                      Confidence
                    </Body>
                  </div>
                </div>
              </Card>
            )}
            
            {renderResultsTable(combinedResults, 'Combined')}
          </div>
        )}
      </div>

      {/* Search Performance Metrics */}
      {searchMetrics && Object.keys(searchMetrics).length > 0 && (
        <Card style={{ 
          padding: spacing[3], 
          marginTop: spacing[3],
          backgroundColor: palette.gray.light3
        }}>
          <H3 style={{ fontSize: '14px', marginBottom: spacing[2] }}>
            Performance Metrics
          </H3>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', 
            gap: spacing[2],
            fontSize: '12px'
          }}>
            <div>
              <Label>Atlas Search Time</Label>
              <Body>{searchMetrics.atlasSearchTime || 'N/A'}</Body>
            </div>
            <div>
              <Label>Vector Search Time</Label>
              <Body>{searchMetrics.vectorSearchTime || 'N/A'}</Body>
            </div>
            <div>
              <Label>Total Processing Time</Label>
              <Body>{searchMetrics.totalProcessingTime || 'N/A'}</Body>
            </div>
            <div>
              <Label>Records Processed</Label>
              <Body>{searchMetrics.recordsProcessed || 'N/A'}</Body>
            </div>
          </div>
        </Card>
      )}
    </Card>
  );
}

export default ParallelSearchInterface;