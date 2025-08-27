"use client";

import React, { useState } from 'react';
import Card from '@leafygreen-ui/card';
import ExpandableCard from '@leafygreen-ui/expandable-card';
import Button from '@leafygreen-ui/button';
import Modal from '@leafygreen-ui/modal';
import Code from '@leafygreen-ui/code';
import Callout from '@leafygreen-ui/callout';
import { H3, Body, Label } from '@leafygreen-ui/typography';
import { Table, TableBody, TableHead, HeaderRow, HeaderCell, Row, Cell } from '@leafygreen-ui/table';
import Icon from '@leafygreen-ui/icon';
import Badge from '@leafygreen-ui/badge';
import { Spinner } from '@leafygreen-ui/loading-indicator';
import { palette } from '@leafygreen-ui/palette';
import { spacing } from '@leafygreen-ui/tokens';
import EntityDetailWrapper from '@/components/entities/EntityDetailWrapper';
import EntityLink from '@/components/common/EntityLink';

/**
 * Parallel Search Interface
 * 
 * Displays results from both Atlas Search and Vector Search in a modern,
 * side-by-side comparison with correlation analysis and combined intelligence.
 */
function ParallelSearchInterface({ searchResults, originalEntityData, isLoading = false }) {
  const [selectedTab, setSelectedTab] = useState(0); // 0: Atlas, 1: Vector, 2: Hybrid
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedEntityId, setSelectedEntityId] = useState(null);

  /**
   * Handle entity name click to open modal
   */
  const handleEntityClick = (entityId) => {
    setSelectedEntityId(entityId);
    setModalOpen(true);
  };
  
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
    hybridResults = [],
    searchMetrics = {}
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
   * Render clickable entity name that opens modal
   */
  const renderClickableEntityName = (entity) => {
    const entityName = formatEntityName(entity);
    const entityId = entity.entityId || entity.entity_id;
    
    return (
      <EntityLink
        entityId={entityId}
        onClick={(clickedEntityId, e) => {
          // For this component, we want to open the modal instead of navigating
          e.preventDefault();
          handleEntityClick(clickedEntityId);
        }}
        style={{
          fontSize: '13px',
          lineHeight: '1.4',
          wordBreak: 'break-word'
        }}
        weight="normal"
      >
        {entityName}
      </EntityLink>
    );
  };

  /**
   * Render search results table for individual search types (Atlas/Vector)
   */
  const renderIndividualResultsTable = (results, searchType) => {
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
            <HeaderCell style={{ width: '40%' }}>Entity</HeaderCell>
            <HeaderCell style={{ width: '20%' }}>Match Score</HeaderCell>
            <HeaderCell style={{ width: '20%' }}>Risk Level</HeaderCell>
            <HeaderCell style={{ width: '20%' }}>Type</HeaderCell>
          </HeaderRow>
        </TableHead>
        <TableBody>
          {/* Spacer row */}
          <Row style={{ height: `${spacing[1]}px` }}>
            <Cell colSpan={4} style={{ padding: 0, border: 'none' }}></Cell>
          </Row>
          {results.slice(0, 10).map((entity, index) => (
            <Row key={entity.entityId || index}>
              <Cell>
                <div style={{ 
                  padding: `${index === 0 ? spacing[3] : spacing[2]} ${spacing[1]} ${spacing[1]} ${spacing[1]}`, 
                  minWidth: '200px' 
                }}>
                  <Body weight="medium" style={{ marginBottom: spacing[1] }}>
                    {renderClickableEntityName(entity)}
                  </Body>
                  <Body style={{ 
                    fontSize: '11px', 
                    color: palette.gray.dark1,
                    fontFamily: 'monospace'
                  }}>
                    ID: {entity.entityId || entity.entity_id || 'No ID'}
                  </Body>
                </div>
              </Cell>
              <Cell>
                <div style={{ display: 'flex', alignItems: 'center', gap: spacing[1] }}>
                  <Badge variant="blue">
                    {(entity.searchScore || entity.matchScore || 0).toFixed(2)}
                  </Badge>
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

  /**
   * Render hybrid results table with MongoDB $rankFusion scores
   */
  const renderHybridResultsTable = (results) => {
    if (!results || results.length === 0) {
      return (
        <div style={{ 
          textAlign: 'center', 
          padding: spacing[4],
          color: palette.gray.base
        }}>
          <Icon glyph="Warning" style={{ marginBottom: spacing[2] }} />
          <Body>No hybrid results found</Body>
        </div>
      );
    }

    return (
      <Table>
        <TableHead>
          <HeaderRow>
            <HeaderCell style={{ width: '30%' }}>Entity</HeaderCell>
            <HeaderCell style={{ width: '15%' }}>Hybrid Score</HeaderCell>
            <HeaderCell style={{ width: '34%' }}>Search Contribution</HeaderCell>
            <HeaderCell style={{ width: '21%' }}>Risk Level</HeaderCell>
          </HeaderRow>
        </TableHead>
        <TableBody>
          {/* Spacer row */}
          <Row style={{ height: `${spacing[1]}px` }}>
            <Cell colSpan={4} style={{ padding: 0, border: 'none' }}></Cell>
          </Row>
          {results.slice(0, 10).map((entity, index) => (
            <Row key={entity.entityId || index}>
              <Cell>
                <div style={{ 
                  padding: `${index === 0 ? spacing[3] : spacing[2]} ${spacing[1]} ${spacing[1]} ${spacing[1]}`, 
                  minWidth: '200px' 
                }}>
                  <Body weight="medium" style={{ marginBottom: spacing[1] }}>
                    {renderClickableEntityName(entity)}
                  </Body>
                  <Body style={{ 
                    fontSize: '11px', 
                    color: palette.gray.dark1,
                    fontFamily: 'monospace'
                  }}>
                    ID: {entity.entityId || 'No ID'}
                  </Body>
                </div>
              </Cell>
              <Cell>
                <div style={{ display: 'flex', alignItems: 'center', gap: spacing[1] }}>
                  <Badge variant="blue">
                    {(entity.hybridScore || 0).toFixed(4)}
                  </Badge>
                </div>
              </Cell>
              <Cell>
                <div style={{ 
                  display: 'flex', 
                  flexDirection: 'column',
                  gap: '2px',
                  width: '100%',
                  padding: `${spacing[1]}px ${spacing[2]}px`
                }}>
                  {/* Labels above the pill */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '10px',
                    color: palette.gray.dark1
                  }}>
                    <span style={{ color: '#00593F', fontWeight: '500' }}>
                      Text: {(entity.text_contribution_percent || 0).toFixed(1)}%
                    </span>
                    <span style={{ color: '#016BF8', fontWeight: '500' }}>
                      Vector: {(entity.vector_contribution_percent || 0).toFixed(1)}%
                    </span>
                  </div>
                  
                  {/* Progress bar pill using flexbox */}
                  <div style={{ 
                    display: 'flex',
                    width: '100%',
                    height: '20px',
                    borderRadius: '10px',
                    overflow: 'hidden',
                    backgroundColor: palette.gray.light2
                  }}>
                    {/* Text contribution (green) */}
                    <div style={{
                      height: '100%',
                      backgroundColor: '#00593F',
                      flexBasis: `${entity.text_contribution_percent || 0}%`,
                      transition: 'flex-basis 0.3s ease'
                    }} />
                    
                    {/* Vector contribution (blue) */}
                    <div style={{
                      height: '100%',
                      backgroundColor: '#016BF8',
                      flexBasis: `${entity.vector_contribution_percent || 0}%`,
                      transition: 'flex-basis 0.3s ease'
                    }} />
                  </div>
                </div>
              </Cell>
              <Cell>
                <Badge 
                  variant={getRiskBadgeVariant(entity.riskAssessment?.overall?.score || 0)}
                >
                  {entity.riskAssessment?.overall?.level || 'Unknown'}
                </Badge>
              </Cell>
            </Row>
          ))}
        </TableBody>
      </Table>
    );
  };


  /**
   * Render search query details in expandable card
   */
  const renderSearchQueryDetails = () => {
    if (!originalEntityData) return null;

    return (
      <ExpandableCard
        title="Search Query Details"
        description="View original entity data and search parameters"
        style={{ marginBottom: spacing[4] }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: spacing[4] }}>
          {/* Original Entity Data */}
          <div>
            <H3 style={{ fontSize: '16px', marginBottom: spacing[3] }}>Original Entity Data</H3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[2] }}>
              <div>
                <Label style={{ fontSize: '12px', color: palette.gray.dark1 }}>Full Name</Label>
                <Body style={{ fontFamily: 'monospace', fontSize: '13px' }}>
                  {originalEntityData.fullName || 'Not provided'}
                </Body>
              </div>
              <div>
                <Label style={{ fontSize: '12px', color: palette.gray.dark1 }}>Entity Type</Label>
                <Body style={{ fontFamily: 'monospace', fontSize: '13px' }}>
                  {originalEntityData.entityType || 'Not specified'}
                </Body>
              </div>
              <div>
                <Label style={{ fontSize: '12px', color: palette.gray.dark1 }}>Address</Label>
                <Body style={{ fontFamily: 'monospace', fontSize: '13px' }}>
                  {originalEntityData.address || 'Not provided'}
                </Body>
              </div>
            </div>
          </div>

          {/* Search Parameters */}
          <div>
            <H3 style={{ fontSize: '16px', marginBottom: spacing[3] }}>Search Parameters</H3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[3] }}>
              {/* Atlas Search Query */}
              <div>
                <Label style={{ fontSize: '12px', color: palette.blue.dark1 }}>Atlas Search Query</Label>
                <div style={{ marginTop: spacing[1] }}>
                  <Code
                    language="json"
                    showLineNumbers={false}
                    copyable={false}
                  >
                    {JSON.stringify({
                      $search: {
                        index: "entity_text_search_index",
                        compound: {
                          should: [
                            {
                              text: {
                                query: originalEntityData.fullName || '',
                                path: ["name.full"],
                                fuzzy: { maxEdits: 2 }
                              }
                            },
                            {
                              text: {
                                query: originalEntityData.fullName || '',
                                path: ["name.aliases"],
                                fuzzy: { maxEdits: 2 }
                              }
                            },
                            {
                              text: {
                                query: originalEntityData.address || '',
                                path: ["addresses.full"],
                                fuzzy: { maxEdits: 1 }
                              }
                            }
                          ],
                          filter: originalEntityData.entityType ? [
                            {
                              text: {
                                query: originalEntityData.entityType,
                                path: "entityType"
                              }
                            }
                          ] : []
                        }
                      }
                    }, null, 2)}
                  </Code>
                </div>
              </div>

              {/* Vector Search Query */}
              <div>
                <Label style={{ fontSize: '12px', color: palette.purple.dark1 }}>Vector Search Query</Label>
                <div style={{ marginTop: spacing[1] }}>
                  <Code
                    language="json"
                    showLineNumbers={false}
                    copyable={false}
                  >
                    {JSON.stringify({
                      $vectorSearch: {
                        index: "entity_vector_search_index",
                        path: "profileEmbedding",
                        queryVector: "[Generated embedding vector array]",
                        numCandidates: 150,
                        limit: 20
                      }
                    }, null, 2)}
                  </Code>
                </div>
              </div>

              {/* Hybrid Search Query */}
              <div>
                <Label style={{ fontSize: '12px', color: palette.green.dark1 }}>Hybrid $rankFusion Query</Label>
                <div style={{ marginTop: spacing[1] }}>
                  <Code
                    language="json"
                    showLineNumbers={false}
                    copyable={false}
                  >
                    {JSON.stringify({
                      $rankFusion: {
                        input: {
                          pipelines: {
                            atlas: [
                              {
                                $search: {
                                  index: "entity_text_search_index",
                                  compound: {
                                    should: [
                                      {
                                        text: {
                                          query: originalEntityData.fullName || '',
                                          path: ["name.full"],
                                          fuzzy: { maxEdits: 1 }
                                        }
                                      },
                                      {
                                        text: {
                                          query: originalEntityData.fullName || '',
                                          path: ["name.aliases"],
                                          fuzzy: { maxEdits: 1 }
                                        }
                                      },
                                      {
                                        text: {
                                          query: originalEntityData.address || '',
                                          path: ["addresses.full"],
                                          fuzzy: { maxEdits: 2 }
                                        }
                                      }
                                    ]
                                  }
                                }
                              },
                              { $limit: 20 }
                            ],
                            vector: [
                              {
                                $vectorSearch: {
                                  index: "entity_vector_search_index",
                                  path: "profileEmbedding",
                                  queryVector: "[Generated embedding vector array]",
                                  numCandidates: 150,
                                  limit: 20
                                }
                              }
                            ]
                          }
                        },
                        combination: {
                          weights: {
                            atlas: 1,
                            vector: 1
                          }
                        },
                        scoreDetails: true
                      }
                    }, null, 2)}
                  </Code>
                </div>
              </div>
            </div>
          </div>
        </div>
      </ExpandableCard>
    );
  };

  return (
    <div>
      {/* Search Query Details Expandable Card */}
      {renderSearchQueryDetails()}

      {/* Main Results Card */}
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
            <Body weight="medium">{hybridResults.length}</Body>
            <Body style={{ color: palette.gray.dark1 }}>Hybrid</Body>
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
          { id: 2, label: 'Hybrid ($rankFusion)', icon: 'Connect', color: palette.green.base }
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
              <Body style={{ fontSize: '12px', color: palette.gray.dark1 }}>
                Fuzzy matching based on name, address, and entity type
              </Body>
            </div>
            
            {/* MongoDB Atlas Search Advantage */}
            <div
              style={{
                padding: spacing[2],
                background: palette.green.light3,
                borderRadius: '4px',
                marginBottom: spacing[3]
              }}
            >
              <Body style={{ fontSize: '12px', color: palette.green.dark2 }}>
                <strong>Atlas Search Advantage:</strong> Built-in full-text search with automatic index synchronization. 
                No separate search cluster to manage, no data sync delays, no additional operational overhead.
              </Body>
            </div>
            
            {renderIndividualResultsTable(atlasResults, 'Atlas')}
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
              <Body style={{ fontSize: '12px', color: palette.gray.dark1 }}>
                Semantic similarity using AI embeddings
              </Body>
            </div>
            
            {/* MongoDB Vector Search Advantage */}
            <div
              style={{
                padding: spacing[2],
                background: palette.purple.light3,
                borderRadius: '4px',
                marginBottom: spacing[3]
              }}
            >
              <Body style={{ fontSize: '12px', color: palette.purple.dark2, marginBottom: spacing[1] }}>
                <strong>Vector Search Performance:</strong> MongoDB outperforms pgvector at scale:
              </Body>
              <Body style={{ fontSize: '11px', color: palette.purple.dark1, lineHeight: '1.6' }}>
                pgvector: 1+ hour index build for 900K vectors vs MongoDB: minutes for millions • 
                pgvector degrades beyond 10M vectors, requires extensions • 
                MongoDB provides native vector support with no extensions needed
              </Body>
            </div>
            
            {renderIndividualResultsTable(vectorResults, 'Vector')}
          </div>
        )}

        {/* Hybrid Search Results */}
        {selectedTab === 2 && (
          <div>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: spacing[3]
            }}>
              <Body style={{ fontSize: '12px', color: palette.gray.dark1 }}>
                Optimized fusion of Full-text and Vector search using native MongoDB algorithms
              </Body>
            </div>
            
            {/* MongoDB $rankFusion Advantage */}
            <div
              style={{
                padding: spacing[2],
                background: palette.yellow.light3,
                borderRadius: '4px',
                marginBottom: spacing[3]
              }}
            >
              <Body style={{ fontSize: '12px', color: palette.yellow.dark2 }}>
                <strong>$rankFusion Advantage:</strong> MongoDB's native Reciprocal Rank Fusion combines 
                multiple search methods in a single aggregation - no manual score weighting or external 
                orchestration needed.
              </Body>
            </div>
            
            {/* Hybrid Search Info Panel */}
            {renderHybridResultsTable(hybridResults)}
          </div>
        )}

      </div>

      {/* Entity Detail Modal */}
      <Modal 
        open={modalOpen} 
        setOpen={setModalOpen}
        size="large"
        contentStyle={{ zIndex: 1001 }}
      >
        {selectedEntityId && (
          <EntityDetailWrapper entityId={selectedEntityId} />
        )}
      </Modal>

      </Card>
    </div>
  );
}

export default ParallelSearchInterface;