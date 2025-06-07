"use client";

import React, { useState } from 'react';
import { formatMatchReasons, getRiskLevel, getMatchConfidence } from '../../lib/entity-resolution-api';

// LeafyGreen UI Components
import { Table, TableHead, TableBody, Row, Cell } from '@leafygreen-ui/table';
import Button from '@leafygreen-ui/button';
import Badge from '@leafygreen-ui/badge';
import Card from '@leafygreen-ui/card';
import { H2, H3, Body, InlineCode } from '@leafygreen-ui/typography';
import { spacing } from '@leafygreen-ui/tokens';
import { palette } from '@leafygreen-ui/palette';
import Icon from '@leafygreen-ui/icon';
import Tooltip from '@leafygreen-ui/tooltip';

import styles from './PotentialMatchesList.module.css';

const PotentialMatchesList = ({ 
  matchesData, 
  onEntitySelect, 
  selectedEntityId, 
  isLoading = false 
}) => {
  const [sortField, setSortField] = useState('searchScore');
  const [sortDirection, setSortDirection] = useState('desc');
  const [expandedRows, setExpandedRows] = useState(new Set());

  if (!matchesData || !matchesData.matches) {
    return null;
  }

  const { matches, totalMatches, searchMetadata, searchDuration, inputData } = matchesData;

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const toggleRowExpansion = (entityId) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(entityId)) {
      newExpanded.delete(entityId);
    } else {
      newExpanded.add(entityId);
    }
    setExpandedRows(newExpanded);
  };

  const sortedMatches = [...matches].sort((a, b) => {
    const aVal = a[sortField] || 0;
    const bVal = b[sortField] || 0;
    
    if (sortDirection === 'asc') {
      return aVal - bVal;
    }
    return bVal - aVal;
  });

  const getRiskBadgeVariant = (riskScore) => {
    const level = getRiskLevel(riskScore);
    switch (level) {
      case 'red': return 'red';
      case 'yellow': return 'yellow';
      case 'blue': return 'blue';
      case 'green': return 'green';
      default: return 'lightgray';
    }
  };

  const getConfidenceBadgeVariant = (searchScore) => {
    const confidence = getMatchConfidence(searchScore);
    switch (confidence.level) {
      case 'high': return 'green';
      case 'medium': return 'yellow';
      case 'low': return 'blue';
      default: return 'lightgray';
    }
  };

  const renderMatchReasons = (matchReasons) => {
    const formattedReasons = formatMatchReasons(matchReasons);
    return (
      <div className={styles.matchReasons}>
        {formattedReasons.map((reason, index) => (
          <Tooltip 
            key={index} 
            trigger={
              <Badge 
                variant={reason.color === 'green' ? 'green' : reason.color === 'red' ? 'red' : 'blue'}
                className={styles.reasonBadge}
              >
                {reason.label}
              </Badge>
            }
          >
            Match reason: {reason.label}
          </Tooltip>
        ))}
      </div>
    );
  };

  const renderEntityDetails = (entity) => {
    return (
      <div className={styles.entityDetails}>
        <div className={styles.detailsGrid}>
          <div className={styles.detailItem}>
            <Body style={{ fontWeight: 'bold', color: palette.gray.dark1 }}>Date of Birth:</Body>
            <Body>{entity.dateOfBirth || 'Not provided'}</Body>
          </div>
          <div className={styles.detailItem}>
            <Body style={{ fontWeight: 'bold', color: palette.gray.dark1 }}>Entity Type:</Body>
            <Body style={{ textTransform: 'capitalize' }}>{entity.entityType || 'Individual'}</Body>
          </div>
          <div className={styles.detailItem}>
            <Body style={{ fontWeight: 'bold', color: palette.gray.dark1 }}>Primary Address:</Body>
            <Body>{entity.primaryAddress_full || 'Not provided'}</Body>
          </div>
          <div className={styles.detailItem}>
            <Body style={{ fontWeight: 'bold', color: palette.gray.dark1 }}>Match Score:</Body>
            <Body style={{ fontWeight: 'bold', color: palette.blue.dark1 }}>
              {entity.searchScore.toFixed(4)}
            </Body>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={styles.container}>
      {/* Search Results Header */}
      <Card className={styles.headerCard}>
        <div style={{ padding: spacing[3] }}>
          <div className={styles.headerContent}>
            <div>
              <H2 style={{ color: palette.gray.dark3, marginBottom: spacing[1] }}>
                🎯 Potential Matches Found
              </H2>
              <Body style={{ color: palette.gray.dark1 }}>
                Found <strong>{totalMatches}</strong> potential matches for "
                <InlineCode>{inputData?.name_full}</InlineCode>"
                {searchDuration && (
                  <span style={{ color: palette.green.dark1, marginLeft: spacing[2] }}>
                    ⚡ {searchDuration}ms
                  </span>
                )}
              </Body>
            </div>
            <div className={styles.searchMetadata}>
              <Body style={{ fontSize: '12px', color: palette.gray.dark1 }}>
                Search fields: {searchMetadata?.search_fields?.join(', ')}
              </Body>
            </div>
          </div>
        </div>
      </Card>

      {/* Matches Table */}
      <Card className={styles.tableCard}>
        <div style={{ padding: spacing[3] }}>
          <H3 style={{ marginBottom: spacing[3], color: palette.gray.dark2 }}>
            Entity Matches ({totalMatches})
          </H3>
          
          <Table className={styles.matchesTable}>
            <TableHead>
              <Row>
                <Cell>
                  <Button
                    variant="default"
                    size="xsmall"
                    onClick={() => handleSort('entityId')}
                    rightGlyph={
                      sortField === 'entityId' ? 
                        <Icon glyph={sortDirection === 'asc' ? 'ChevronUp' : 'ChevronDown'} /> : 
                        <Icon glyph="Unsorted" />
                    }
                  >
                    Entity ID
                  </Button>
                </Cell>
                <Cell>
                  <Button
                    variant="default"
                    size="xsmall"
                    onClick={() => handleSort('name_full')}
                    rightGlyph={
                      sortField === 'name_full' ? 
                        <Icon glyph={sortDirection === 'asc' ? 'ChevronUp' : 'ChevronDown'} /> : 
                        <Icon glyph="Unsorted" />
                    }
                  >
                    Name
                  </Button>
                </Cell>
                <Cell>
                  <Button
                    variant="default"
                    size="xsmall"
                    onClick={() => handleSort('searchScore')}
                    rightGlyph={
                      sortField === 'searchScore' ? 
                        <Icon glyph={sortDirection === 'asc' ? 'ChevronUp' : 'ChevronDown'} /> : 
                        <Icon glyph="Unsorted" />
                    }
                  >
                    Match Score
                  </Button>
                </Cell>
                <Cell>Match Reasons</Cell>
                <Cell>
                  <Button
                    variant="default"
                    size="xsmall"
                    onClick={() => handleSort('riskAssessment_overall_score')}
                    rightGlyph={
                      sortField === 'riskAssessment_overall_score' ? 
                        <Icon glyph={sortDirection === 'asc' ? 'ChevronUp' : 'ChevronDown'} /> : 
                        <Icon glyph="Unsorted" />
                    }
                  >
                    Risk Score
                  </Button>
                </Cell>
                <Cell>Actions</Cell>
              </Row>
            </TableHead>
            <TableBody>
              {sortedMatches.map((entity) => (
                <React.Fragment key={entity.entityId}>
                  <Row 
                    className={`${styles.entityRow} ${selectedEntityId === entity.entityId ? styles.selectedRow : ''}`}
                  >
                    <Cell>
                      <InlineCode>{entity.entityId}</InlineCode>
                    </Cell>
                    <Cell>
                      <div className={styles.nameCell}>
                        <Body style={{ fontWeight: 'bold' }}>{entity.name_full}</Body>
                        {entity.dateOfBirth && (
                          <Body style={{ fontSize: '12px', color: palette.gray.dark1 }}>
                            DOB: {entity.dateOfBirth}
                          </Body>
                        )}
                      </div>
                    </Cell>
                    <Cell>
                      <div className={styles.scoreCell}>
                        <Badge variant={getConfidenceBadgeVariant(entity.searchScore)}>
                          {entity.searchScore.toFixed(2)}
                        </Badge>
                        <Body style={{ fontSize: '11px', color: palette.gray.dark1 }}>
                          {getMatchConfidence(entity.searchScore).label}
                        </Body>
                      </div>
                    </Cell>
                    <Cell>
                      {renderMatchReasons(entity.matchReasons || [])}
                    </Cell>
                    <Cell>
                      <Badge variant={getRiskBadgeVariant(entity.riskAssessment_overall_score)}>
                        {entity.riskAssessment_overall_score || 0}
                      </Badge>
                    </Cell>
                    <Cell>
                      <div className={styles.actionButtons}>
                        <Button
                          variant="default"
                          size="xsmall"
                          onClick={() => toggleRowExpansion(entity.entityId)}
                          leftGlyph={
                            <Icon glyph={expandedRows.has(entity.entityId) ? 'ChevronUp' : 'ChevronDown'} />
                          }
                        >
                          Details
                        </Button>
                        <Button
                          variant={selectedEntityId === entity.entityId ? 'primary' : 'default'}
                          size="xsmall"
                          onClick={() => onEntitySelect?.(entity)}
                          leftGlyph={<Icon glyph="Target" />}
                          style={{ marginLeft: spacing[1] }}
                        >
                          {selectedEntityId === entity.entityId ? 'Selected' : 'Select'}
                        </Button>
                      </div>
                    </Cell>
                  </Row>

                  {/* Expanded Row Details */}
                  {expandedRows.has(entity.entityId) && (
                    <Row className={styles.expandedRow}>
                      <Cell colSpan={6}>
                        {renderEntityDetails(entity)}
                      </Cell>
                    </Row>
                  )}
                </React.Fragment>
              ))}
            </TableBody>
          </Table>

          {totalMatches === 0 && (
            <div className={styles.noMatches}>
              <Icon glyph="MagnifyingGlass" size="large" fill={palette.gray.base} />
              <H3 style={{ color: palette.gray.dark1, marginTop: spacing[2] }}>
                No matches found
              </H3>
              <Body style={{ color: palette.gray.dark1 }}>
                Try adjusting the search criteria or check for typos.
              </Body>
            </div>
          )}
        </div>
      </Card>

      {/* Wow Moment Callout */}
      {totalMatches > 0 && (
        <Card className={styles.wowCard}>
          <div style={{ padding: spacing[3] }}>
            <H3 style={{ color: palette.blue.dark1, marginBottom: spacing[2] }}>
              ✨ Fuzzy Matching in Action
            </H3>
            <Body style={{ color: palette.gray.dark1, marginBottom: spacing[2] }}>
              Notice how our Atlas Search found matches even with slight variations:
            </Body>
            <ul className={styles.wowList}>
              <li>
                <Body style={{ fontSize: '14px' }}>
                  <strong>Similar names:</strong> "Samantha Miller" → "Sam Brittany Miller"
                </Body>
              </li>
              <li>
                <Body style={{ fontSize: '14px' }}>
                  <strong>Address variations:</strong> "456 Oak Avenue" → "456 Oak Ave"
                </Body>
              </li>
              <li>
                <Body style={{ fontSize: '14px' }}>
                  <strong>Intelligent scoring:</strong> Higher scores for exact matches, lower for partial matches
                </Body>
              </li>
            </ul>
          </div>
        </Card>
      )}
    </div>
  );
};

export default PotentialMatchesList;