"use client";

import React, { useState } from 'react';
import { H2, H3, Body, Subtitle } from '@leafygreen-ui/typography';
import { spacing } from '@leafygreen-ui/tokens';
import { palette } from '@leafygreen-ui/palette';
import Card from '@leafygreen-ui/card';
import Button from '@leafygreen-ui/button';
import Badge from '@leafygreen-ui/badge';
import { Table, TableHead, TableBody, HeaderRow, HeaderCell, Row, Cell } from '@leafygreen-ui/table';
import Icon from '@leafygreen-ui/icon';
import { Menu, MenuItem } from '@leafygreen-ui/menu';
import Banner from '@leafygreen-ui/banner';

import styles from './PotentialMatchesList.module.css';

const EnhancedPotentialMatchesList = ({ 
  matchesData, 
  onEntitySelect, 
  selectedEntityId, 
  isLoading,
  onResolutionAction 
}) => {
  const [sortField, setSortField] = useState('searchScore');
  const [sortDirection, setSortDirection] = useState('desc');
  const [selectedMatches, setSelectedMatches] = useState(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);

  if (!matchesData || !matchesData.matches) {
    return (
      <Card style={{ padding: spacing[4], textAlign: 'center' }}>
        <Body style={{ color: palette.gray.dark1 }}>
          No potential matches found. Try adjusting your search criteria.
        </Body>
      </Card>
    );
  }

  const { matches, totalMatches, searchMetadata = {} } = matchesData;

  // Color and styling functions
  const getRiskBadgeVariant = (score) => {
    if (score >= 75) return 'red';
    if (score >= 50) return 'yellow';
    if (score >= 25) return 'blue';
    return 'green';
  };

  const getMatchScoreColor = (score) => {
    if (score >= 80) return palette.red.dark1;
    if (score >= 60) return palette.yellow.dark2;
    return palette.blue.dark1;
  };

  const getMatchScoreBadgeVariant = (score) => {
    if (score >= 80) return 'red';
    if (score >= 60) return 'yellow';
    return 'blue';
  };

  // Sorting logic
  const sortedMatches = [...matches].sort((a, b) => {
    let aValue = a[sortField];
    let bValue = b[sortField];
    
    if (typeof aValue === 'string') {
      aValue = aValue.toLowerCase();
      bValue = bValue.toLowerCase();
    }
    
    if (sortDirection === 'asc') {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const handleSelectMatch = (matchId) => {
    const newSelected = new Set(selectedMatches);
    if (newSelected.has(matchId)) {
      newSelected.delete(matchId);
    } else {
      newSelected.add(matchId);
    }
    setSelectedMatches(newSelected);
    setShowBulkActions(newSelected.size > 0);
  };

  const handleSelectAll = () => {
    if (selectedMatches.size === matches.length) {
      setSelectedMatches(new Set());
      setShowBulkActions(false);
    } else {
      setSelectedMatches(new Set(matches.map(m => m.entityId)));
      setShowBulkActions(true);
    }
  };

  const handleBulkAction = (action) => {
    // Handle bulk actions like bulk merge, bulk dismiss, etc.
    console.log(`Bulk ${action} for entities:`, Array.from(selectedMatches));
    if (onResolutionAction) {
      onResolutionAction(action, Array.from(selectedMatches));
    }
    setSelectedMatches(new Set());
    setShowBulkActions(false);
  };

  const renderMatchReasons = (reasons) => {
    if (!reasons || reasons.length === 0) return null;
    
    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: spacing[1] }}>
        {reasons.slice(0, 3).map((reason, index) => (
          <Badge
            key={index}
            variant="lightblue"
            style={{ fontSize: '11px' }}
          >
            {reason.replace(/_/g, ' ')}
          </Badge>
        ))}
        {reasons.length > 3 && (
          <Badge variant="lightgray" style={{ fontSize: '11px' }}>
            +{reasons.length - 3} more
          </Badge>
        )}
      </div>
    );
  };

  const getSortIcon = (field) => {
    if (sortField !== field) return 'CaretUpDown';
    return sortDirection === 'asc' ? 'CaretUp' : 'CaretDown';
  };

  // Calculate match statistics
  const avgMatchScore = matches.length > 0 
    ? Math.round(matches.reduce((sum, m) => sum + m.searchScore, 0) / matches.length)
    : 0;
  
  const highConfidenceMatches = matches.filter(m => m.searchScore >= 80).length;
  const avgRiskScore = matches.length > 0
    ? Math.round(matches.reduce((sum, m) => sum + (m.riskAssessment_overall_score || 0), 0) / matches.length)
    : 0;

  return (
    <div className={styles.matchesContainer}>
      {/* Search Summary Banner */}
      <Banner variant="info" style={{ marginBottom: spacing[3] }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <Body style={{ fontWeight: 'bold' }}>
              Found {totalMatches} potential matches in {searchMetadata.execution_time || 'N/A'}ms
            </Body>
            <Body style={{ fontSize: '14px', marginTop: spacing[1] }}>
              Using {searchMetadata.query_type || 'atlas_search'} across {searchMetadata.search_fields?.length || 0} fields
            </Body>
          </div>
          <Icon glyph="InfoWithCircle" fill={palette.blue.base} />
        </div>
      </Banner>

      {/* Bulk Actions Bar */}
      {showBulkActions && (
        <Card style={{ 
          marginBottom: spacing[3],
          backgroundColor: palette.blue.light2,
          border: `1px solid ${palette.blue.light1}`
        }}>
          <div style={{ 
            padding: spacing[3],
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <Body style={{ color: palette.blue.dark2, fontWeight: 'bold' }}>
              {selectedMatches.size} entities selected
            </Body>
            <div style={{ display: 'flex', gap: spacing[2] }}>
              <Button 
                variant="primary" 
                size="small"
                onClick={() => handleBulkAction('bulk_merge')}
              >
                Bulk Merge
              </Button>
              <Button 
                variant="default" 
                size="small"
                onClick={() => handleBulkAction('bulk_dismiss')}
              >
                Bulk Dismiss
              </Button>
              <Button 
                variant="default" 
                size="small"
                onClick={() => setSelectedMatches(new Set())}
              >
                Clear Selection
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Main Matches Table */}
      <Card style={{ marginBottom: spacing[3] }}>
        <div style={{ 
          padding: spacing[3], 
          borderBottom: `1px solid ${palette.gray.light2}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <H3 style={{ color: palette.gray.dark3, margin: 0 }}>
            Potential Entity Matches ({totalMatches})
          </H3>
          <div style={{ display: 'flex', gap: spacing[2] }}>
            <Button variant="default" size="small">
              Export Results
            </Button>
            <Button variant="default" size="small">
              Save Search
            </Button>
          </div>
        </div>
        
        <Table>
          <TableHead>
            <HeaderRow>
              <HeaderCell style={{ width: '40px' }}>
                <input
                  type="checkbox"
                  checked={selectedMatches.size === matches.length && matches.length > 0}
                  onChange={handleSelectAll}
                />
              </HeaderCell>
              
              <HeaderCell 
                onClick={() => handleSort('entityId')}
                style={{ cursor: 'pointer' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: spacing[1] }}>
                  Entity ID
                  <Icon glyph={getSortIcon('entityId')} size="small" />
                </div>
              </HeaderCell>
              
              <HeaderCell 
                onClick={() => handleSort('name_full')}
                style={{ cursor: 'pointer' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: spacing[1] }}>
                  Name
                  <Icon glyph={getSortIcon('name_full')} size="small" />
                </div>
              </HeaderCell>
              
              <HeaderCell 
                onClick={() => handleSort('searchScore')}
                style={{ cursor: 'pointer' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: spacing[1] }}>
                  Match Score
                  <Icon glyph={getSortIcon('searchScore')} size="small" />
                </div>
              </HeaderCell>
              
              <HeaderCell>Match Reasons</HeaderCell>
              
              <HeaderCell 
                onClick={() => handleSort('riskAssessment_overall_score')}
                style={{ cursor: 'pointer' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: spacing[1] }}>
                  Risk Score
                  <Icon glyph={getSortIcon('riskAssessment_overall_score')} size="small" />
                </div>
              </HeaderCell>
              
              <HeaderCell>Details</HeaderCell>
              <HeaderCell>Actions</HeaderCell>
            </HeaderRow>
          </TableHead>
          
          <TableBody>
            {sortedMatches.map((match) => (
              <Row 
                key={match.entityId}
                onClick={() => onEntitySelect?.(match)}
                style={{ 
                  cursor: 'pointer',
                  backgroundColor: selectedEntityId === match.entityId 
                    ? palette.blue.light3 
                    : 'transparent'
                }}
              >
                <Cell onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={selectedMatches.has(match.entityId)}
                    onChange={() => handleSelectMatch(match.entityId)}
                  />
                </Cell>
                
                <Cell>
                  <Body style={{ fontSize: '14px', fontFamily: 'monospace' }}>
                    {match.entityId}
                  </Body>
                </Cell>
                
                <Cell>
                  <div>
                    <Body style={{ fontWeight: 'bold', fontSize: '14px' }}>
                      {match.name_full}
                    </Body>
                    {match.dateOfBirth && (
                      <Body style={{ fontSize: '12px', color: palette.gray.dark1 }}>
                        DOB: {match.dateOfBirth}
                      </Body>
                    )}
                  </div>
                </Cell>
                
                <Cell>
                  <div style={{ display: 'flex', alignItems: 'center', gap: spacing[1] }}>
                    <Badge variant={getMatchScoreBadgeVariant(match.searchScore)}>
                      {Math.round(match.searchScore)}%
                    </Badge>
                    <div style={{ 
                      width: '60px', 
                      height: '4px', 
                      backgroundColor: palette.gray.light2,
                      borderRadius: '2px',
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        width: `${match.searchScore}%`,
                        height: '100%',
                        backgroundColor: getMatchScoreColor(match.searchScore)
                      }} />
                    </div>
                  </div>
                </Cell>
                
                <Cell>
                  {renderMatchReasons(match.matchReasons)}
                </Cell>
                
                <Cell>
                  {match.riskAssessment_overall_score !== null && match.riskAssessment_overall_score !== undefined ? (
                    <Badge variant={getRiskBadgeVariant(match.riskAssessment_overall_score)}>
                      {match.riskAssessment_overall_score}
                    </Badge>
                  ) : (
                    <Body style={{ color: palette.gray.base, fontSize: '14px' }}>—</Body>
                  )}
                </Cell>
                
                <Cell>
                  <div style={{ fontSize: '12px' }}>
                    {match.primaryAddress_full && (
                      <Body style={{ fontSize: '12px', color: palette.gray.dark1 }}>
                        {match.primaryAddress_full.substring(0, 30)}...
                      </Body>
                    )}
                    {match.entityType && (
                      <Body style={{ fontSize: '11px', color: palette.gray.base }}>
                        Type: {match.entityType}
                      </Body>
                    )}
                  </div>
                </Cell>
                
                <Cell onClick={(e) => e.stopPropagation()}>
                  <Menu
                    trigger={
                      <Button variant="default" size="xsmall">
                        Actions
                      </Button>
                    }
                  >
                    <MenuItem onClick={() => onEntitySelect?.(match)}>
                      View Details
                    </MenuItem>
                    <MenuItem onClick={() => onResolutionAction?.('merge', [match.entityId])}>
                      Mark as Match
                    </MenuItem>
                    <MenuItem onClick={() => onResolutionAction?.('dismiss', [match.entityId])}>
                      Dismiss Match
                    </MenuItem>
                    <MenuItem onClick={() => onResolutionAction?.('review', [match.entityId])}>
                      Needs Review
                    </MenuItem>
                  </Menu>
                </Cell>
              </Row>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* Match Intelligence Summary */}
      <Card>
        <div style={{ padding: spacing[3] }}>
          <H3 style={{ color: palette.gray.dark3, marginBottom: spacing[3] }}>
            🎯 Match Intelligence Summary
          </H3>
          
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: spacing[3]
          }}>
            <div style={{ 
              border: `1px solid ${palette.gray.light2}`,
              borderRadius: '6px',
              padding: spacing[3],
              textAlign: 'center'
            }}>
              <Body style={{ color: palette.gray.dark1, fontSize: '12px' }}>
                Average Match Score
              </Body>
              <H2 style={{ color: palette.blue.dark1, margin: `${spacing[1]} 0` }}>
                {avgMatchScore}%
              </H2>
              <Body style={{ color: palette.gray.dark1, fontSize: '14px' }}>
                Across {totalMatches} matches
              </Body>
            </div>
            
            <div style={{ 
              border: `1px solid ${palette.gray.light2}`,
              borderRadius: '6px',
              padding: spacing[3],
              textAlign: 'center'
            }}>
              <Body style={{ color: palette.gray.dark1, fontSize: '12px' }}>
                High Confidence Matches
              </Body>
              <H2 style={{ color: palette.red.dark1, margin: `${spacing[1]} 0` }}>
                {highConfidenceMatches}
              </H2>
              <Body style={{ color: palette.gray.dark1, fontSize: '14px' }}>
                Matches ≥80% confidence
              </Body>
            </div>
            
            <div style={{ 
              border: `1px solid ${palette.gray.light2}`,
              borderRadius: '6px',
              padding: spacing[3],
              textAlign: 'center'
            }}>
              <Body style={{ color: palette.gray.dark1, fontSize: '12px' }}>
                Average Risk Score
              </Body>
              <H2 style={{ 
                color: avgRiskScore >= 50 ? palette.yellow.base : palette.green.base,
                margin: `${spacing[1]} 0`
              }}>
                {avgRiskScore}
              </H2>
              <Body style={{ color: palette.gray.dark1, fontSize: '14px' }}>
                Risk assessment average
              </Body>
            </div>
            
            <div style={{ 
              border: `1px solid ${palette.gray.light2}`,
              borderRadius: '6px',
              padding: spacing[3],
              textAlign: 'center'
            }}>
              <Body style={{ color: palette.gray.dark1, fontSize: '12px' }}>
                Search Performance
              </Body>
              <H2 style={{ color: palette.green.dark1, margin: `${spacing[1]} 0` }}>
                {searchMetadata.execution_time || 'N/A'}ms
              </H2>
              <Body style={{ color: palette.gray.dark1, fontSize: '14px' }}>
                Atlas Search query time
              </Body>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default EnhancedPotentialMatchesList;