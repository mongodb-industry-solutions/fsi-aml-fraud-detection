"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Card from '@leafygreen-ui/card';
import Button from '@leafygreen-ui/button';
import Banner from '@leafygreen-ui/banner';
import { Table, TableBody, TableHead, HeaderRow, HeaderCell, Row, Cell } from '@leafygreen-ui/table';
import { Body, H1, H2, H3, Subtitle, BackLink, Label } from '@leafygreen-ui/typography';
import { Tabs, Tab } from '@leafygreen-ui/tabs';
import Tooltip from '@leafygreen-ui/tooltip';
import Icon from '@leafygreen-ui/icon';
import IconButton from '@leafygreen-ui/icon-button';
import { Spinner } from '@leafygreen-ui/loading-indicator';
import { 
  ParagraphSkeleton, 
  CardSkeleton
} from '@leafygreen-ui/skeleton-loader';
import Callout from '@leafygreen-ui/callout';
import ExpandableCard from '@leafygreen-ui/expandable-card';
import Code from '@leafygreen-ui/code';
import { palette } from '@leafygreen-ui/palette';
import { spacing } from '@leafygreen-ui/tokens';
import { amlAPI, useAMLAPIError, amlUtils } from '@/lib/aml-api';
import SimilarProfilesSection from './SimilarProfilesSection';
import CytoscapeNetworkComponent from './CytoscapeNetworkComponent';
import AdvancedInvestigationPanel from './AdvancedInvestigationPanel';
import NetworkStatisticsPanel from './NetworkStatisticsPanel';
import TransactionActivityTable from './TransactionActivityTable';
import TransactionNetworkGraph from './TransactionNetworkGraph';
import styles from './EntityDetail.module.css';

// Tab constants
const TAB_OVERVIEW = 0;
const TAB_NETWORK = 1;
const TAB_ACTIVITY = 2;

function RiskScoreDisplay({ riskAssessment }) {
  if (!riskAssessment?.overall) {
    return (
      <div className={styles.riskScoreContainer}>
        <div style={{ textAlign: 'center' }}>
          <Body style={{ color: palette.gray.dark1 }}>Risk assessment unavailable</Body>
        </div>
      </div>
    );
  }

  const { score, level } = riskAssessment.overall;
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

  return (
    <Card style={{ 
      padding: spacing[4], 
      backgroundColor: bgColors[levelLower],
      border: `2px solid ${colors[levelLower]}`,
      textAlign: 'center'
    }}>
      <div style={{ 
        fontSize: '48px', 
        fontWeight: 'bold', 
        color: colors[levelLower],
        marginBottom: spacing[2]
      }}>
        {score}
      </div>
      <H3 style={{ color: colors[levelLower], textTransform: 'uppercase' }}>
        {level} Risk
      </H3>
      {riskAssessment.overall.trend && (
        <Body style={{ color: palette.gray.dark1, marginTop: spacing[1] }}>
          Trend: {riskAssessment.overall.trend}
        </Body>
      )}
      {riskAssessment.overall.lastUpdated && (
        <Body style={{ color: palette.gray.dark1, marginTop: spacing[1], fontSize: '12px' }}>
          Last Updated: {amlUtils.formatDate(riskAssessment.overall.lastUpdated)}
        </Body>
      )}
    </Card>
  );
}

function RiskComponentsDisplay({ riskAssessment }) {
  if (!riskAssessment?.components || Object.keys(riskAssessment.components).length === 0) {
    return null;
  }

  return (
    <Card style={{ padding: spacing[4] }}>
      <H3 style={{ marginBottom: spacing[3] }}>Risk Component Breakdown</H3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: spacing[3] }}>
        {Object.entries(riskAssessment.components).map(([componentName, component]) => {
          const componentColor = amlUtils.getRiskScoreColor(component.score);
          const componentBgColor = {
            red: palette.red.light2,
            yellow: palette.yellow.light2,
            green: palette.green.light2,
            gray: palette.gray.light2
          }[componentColor];
          
          const progressPercentage = (component.score / 100) * 100;
          const componentColorMap = {
            red: palette.red.base,
            yellow: palette.yellow.base,
            green: palette.green.base,
            gray: palette.gray.base
          };
          
          return (
            <div key={componentName} style={{
              padding: spacing[3],
              backgroundColor: componentBgColor,
              borderRadius: '8px',
              border: `1px solid ${componentColorMap[componentColor]}`,
              position: 'relative',
              overflow: 'hidden'
            }}>
              {/* Component Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing[2] }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: spacing[1] }}>
                  <Icon 
                    glyph={componentName === 'identity' ? 'Person' : 
                           componentName === 'activity' ? 'ActivityFeed' :
                           componentName === 'external' ? 'Cloud' :
                           componentName === 'network' ? 'Diagram3' : 'Warning'} 
                    size={18} 
                    fill={componentColorMap[componentColor]} 
                  />
                  <Body weight="medium" style={{ textTransform: 'capitalize', fontSize: '14px' }}>
                    {componentName.replace(/_/g, ' ')}
                  </Body>
                </div>
                <div style={{ 
                  fontSize: '20px', 
                  fontWeight: 'bold', 
                  color: componentColorMap[componentColor]
                }}>
                  {component.score.toFixed(1)}
                </div>
              </div>
              
              {/* Progress Bar */}
              <div style={{ marginBottom: spacing[2] }}>
                <div style={{
                  width: '100%',
                  height: '8px',
                  backgroundColor: palette.gray.light2,
                  borderRadius: '4px',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    width: `${progressPercentage}%`,
                    height: '100%',
                    backgroundColor: componentColorMap[componentColor],
                    borderRadius: '4px',
                    transition: 'width 0.3s ease-in-out'
                  }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: spacing[1] }}>
                  <Body style={{ fontSize: '11px', color: palette.gray.dark1 }}>
                    0
                  </Body>
                  <Body style={{ fontSize: '11px', color: palette.gray.dark1, fontWeight: '600' }}>
                    Weight: {(component.weight * 100).toFixed(0)}%
                  </Body>
                  <Body style={{ fontSize: '11px', color: palette.gray.dark1 }}>
                    100
                  </Body>
                </div>
              </div>
              
              {/* Risk Level Badge */}
              <div style={{ marginBottom: spacing[2] }}>
                <span style={{
                  padding: '3px 8px',
                  backgroundColor: componentColorMap[componentColor],
                  color: 'white',
                  borderRadius: '12px',
                  fontSize: '11px',
                  fontWeight: '600',
                  textTransform: 'uppercase'
                }}>
                  {component.score >= 75 ? 'High Risk' : 
                   component.score >= 50 ? 'Medium Risk' : 
                   component.score >= 25 ? 'Low Risk' : 'Minimal Risk'}
                </span>
              </div>
              
              {/* Top Risk Factors */}
              {component.factors && component.factors.length > 0 && (
                <div>
                  <Body style={{ fontSize: '12px', fontWeight: '600', marginBottom: spacing[1], color: palette.gray.dark2 }}>
                    Key Risk Factors:
                  </Body>
                  {component.factors.slice(0, 3).map((factor, index) => {
                    const factorPercentage = (factor.impact / 100) * 100;
                    return (
                      <div key={index} style={{ marginBottom: spacing[1] }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Body style={{ fontSize: '11px', color: palette.gray.dark1 }}>
                            {factor.type.replace(/_/g, ' ')}
                          </Body>
                          <Body style={{ fontSize: '11px', fontWeight: '600', color: componentColorMap[componentColor] }}>
                            {factor.impact.toFixed(1)}
                          </Body>
                        </div>
                        <div style={{
                          width: '100%',
                          height: '3px',
                          backgroundColor: palette.gray.light2,
                          borderRadius: '2px',
                          marginTop: '2px'
                        }}>
                          <div style={{
                            width: `${factorPercentage}%`,
                            height: '100%',
                            backgroundColor: componentColorMap[componentColor],
                            borderRadius: '2px',
                            opacity: 0.7
                          }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function WatchlistMatchesDisplay({ watchlistMatches }) {
  if (!watchlistMatches || watchlistMatches.length === 0) {
    return (
      <Card style={{ padding: spacing[4] }}>
        <H3 style={{ marginBottom: spacing[3] }}>Watchlist Screening</H3>
        <div style={{ textAlign: 'center', padding: spacing[3] }}>
          <Icon glyph="Checkmark" size={48} fill={palette.green.base} />
          <Body style={{ marginTop: spacing[2], color: palette.green.dark2 }}>No watchlist matches found</Body>
        </div>
      </Card>
    );
  }

  return (
    <Card style={{ padding: spacing[4] }}>
      <H3 style={{ marginBottom: spacing[3] }}>Watchlist Matches ({watchlistMatches.length})</H3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[3] }}>
        {watchlistMatches.map((match, index) => {
          const statusColor = amlUtils.getWatchlistStatusColor(match.status);
          const statusBgColor = {
            red: palette.red.light2,
            yellow: palette.yellow.light2,
            green: palette.green.light2,
            gray: palette.gray.light2
          }[statusColor];
          
          return (
            <div key={index} style={{
              padding: spacing[3],
              backgroundColor: statusBgColor,
              borderRadius: '8px',
              border: `1px solid ${{
                red: palette.red.base,
                yellow: palette.yellow.base,
                green: palette.green.base,
                gray: palette.gray.base
              }[statusColor]}`
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: spacing[2] }}>
                <div>
                  <Label>List ID</Label>
                  <Body weight="medium">{match.listId}</Body>
                </div>
                <div>
                  <Label>Match Score</Label>
                  <Body weight="medium">{(match.matchScore * 100).toFixed(1)}%</Body>
                </div>
                <div>
                  <Label>Status</Label>
                  <Body weight="medium" style={{ color: {
                    red: palette.red.base,
                    yellow: palette.yellow.base,
                    green: palette.green.base,
                    gray: palette.gray.base
                  }[statusColor] }}>
                    {amlUtils.formatWatchlistStatus(match.status)}
                  </Body>
                </div>
                <div>
                  <Label>Match Date</Label>
                  <Body>{amlUtils.formatDate(match.matchDate)}</Body>
                </div>
              </div>
              {match.details && (
                <div style={{ marginTop: spacing[2] }}>
                  <Label>Additional Details</Label>
                  <Body style={{ fontSize: '12px', color: palette.gray.dark1 }}>
                    {match.details.reason && `Reason: ${match.details.reason}`}
                    {match.details.role && ` | Role: ${match.details.role}`}
                  </Body>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function EntityResolutionDisplay({ resolution }) {
  const router = useRouter();
  
  if (!resolution || resolution.status === 'unresolved') {
    return null;
  }

  const statusColor = resolution.status === 'resolved' ? 'green' : 'yellow';
  const statusBgColor = {
    green: palette.green.light2,
    yellow: palette.yellow.light2
  }[statusColor];
  
  const handleEntityNavigation = (entityId) => {
    if (entityId) {
      router.push(`/entities/${entityId}`);
    }
  };

  return (
    <Card style={{ padding: spacing[4] }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing[3] }}>
        <H3>Entity Resolution Status</H3>
        <div style={{ display: 'flex', alignItems: 'center', gap: spacing[1] }}>
          <Icon 
            glyph={resolution.status === 'resolved' ? 'CheckmarkWithCircle' : 'InProgressWithCircle'} 
            size={20} 
            fill={statusColor === 'green' ? palette.green.base : palette.yellow.base} 
          />
          <span style={{
            padding: '4px 12px',
            backgroundColor: statusColor === 'green' ? palette.green.base : palette.yellow.base,
            color: 'white',
            borderRadius: '16px',
            fontSize: '12px',
            fontWeight: '600',
            textTransform: 'uppercase'
          }}>
            {amlUtils.formatEntityStatus(resolution.status)}
          </span>
        </div>
      </div>
      
      <div style={{
        padding: spacing[3],
        backgroundColor: statusBgColor,
        borderRadius: '8px',
        border: `1px solid ${statusColor === 'green' ? palette.green.base : palette.yellow.base}`
      }}>
        {/* Resolution Details Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: spacing[3], marginBottom: spacing[3] }}>
          <div>
            <Label>Resolution Date</Label>
            <div style={{ display: 'flex', alignItems: 'center', gap: spacing[1] }}>
              <Icon glyph="Calendar" size={14} fill={palette.gray.base} />
              <Body weight="medium">{amlUtils.formatDate(resolution.lastReviewDate)}</Body>
            </div>
          </div>
          
          {resolution.masterEntityId && (
            <div>
              <Label>Master Entity</Label>
              <div style={{ display: 'flex', alignItems: 'center', gap: spacing[1] }}>
                <Icon glyph="Diagram3" size={14} fill={palette.blue.base} />
                <Button 
                  variant="default" 
                  size="xsmall"
                  onClick={() => handleEntityNavigation(resolution.masterEntityId)}
                  style={{ 
                    fontSize: '11px',
                    padding: '2px 8px',
                    fontFamily: 'monospace'
                  }}
                >
                  {resolution.masterEntityId}
                </Button>
              </div>
            </div>
          )}
          
          <div>
            <Label>Confidence Score</Label>
            <div style={{ display: 'flex', alignItems: 'center', gap: spacing[1] }}>
              <Icon glyph="Charts" size={14} fill={palette.gray.base} />
              <Body weight="medium" style={{ 
                color: resolution.confidence >= 0.8 ? palette.green.base :
                       resolution.confidence >= 0.6 ? palette.yellow.base : palette.red.base
              }}>
                {(resolution.confidence * 100).toFixed(1)}%
              </Body>
              <div style={{
                width: '40px',
                height: '4px',
                backgroundColor: palette.gray.light2,
                borderRadius: '2px',
                overflow: 'hidden'
              }}>
                <div style={{
                  width: `${resolution.confidence * 100}%`,
                  height: '100%',
                  backgroundColor: resolution.confidence >= 0.8 ? palette.green.base :
                                   resolution.confidence >= 0.6 ? palette.yellow.base : palette.red.base,
                  borderRadius: '2px'
                }} />
              </div>
            </div>
          </div>
        </div>
        
        {/* Linked Entities Section */}
        {resolution.linkedEntities && resolution.linkedEntities.length > 0 && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: spacing[1], marginBottom: spacing[2] }}>
              <Icon glyph="Link" size={16} fill={palette.blue.base} />
              <Label>Linked Entities ({resolution.linkedEntities.length})</Label>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: spacing[2] }}>
              {resolution.linkedEntities.map((linkedEntity, index) => {
                const linkTypeColor = {
                  'confirmed_match': palette.green.base,
                  'potential_duplicate': palette.yellow.base,
                  'business_associate': palette.blue.base,
                  'family_member': palette.purple.base
                }[linkedEntity.linkType] || palette.gray.base;
                
                return (
                  <div key={index} style={{
                    padding: spacing[2],
                    backgroundColor: 'white',
                    borderRadius: '6px',
                    border: `1px solid ${linkTypeColor}`,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onClick={() => handleEntityNavigation(linkedEntity.entityId)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.boxShadow = `0 4px 8px ${linkTypeColor}20`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: spacing[1] }}>
                        <Icon glyph="Person" size={14} fill={linkTypeColor} />
                        <Body weight="medium" style={{ fontSize: '11px', fontFamily: 'monospace' }}>
                          {linkedEntity.entityId}
                        </Body>
                      </div>
                      <Icon glyph="ArrowRight" size={12} fill={palette.gray.base} />
                    </div>
                    
                    <div style={{ marginTop: spacing[1] }}>
                      <span style={{
                        padding: '2px 6px',
                        backgroundColor: `${linkTypeColor}20`,
                        color: linkTypeColor,
                        borderRadius: '8px',
                        fontSize: '10px',
                        fontWeight: '600'
                      }}>
                        {linkedEntity.linkType.replace(/_/g, ' ').toUpperCase()}
                      </span>
                      
                      {linkedEntity.confidence && (
                        <span style={{ 
                          marginLeft: spacing[1],
                          fontSize: '10px', 
                          color: palette.gray.dark1 
                        }}>
                          {(linkedEntity.confidence * 100).toFixed(0)}% match
                        </span>
                      )}
                    </div>
                    
                    {linkedEntity.matchedAttributes && linkedEntity.matchedAttributes.length > 0 && (
                      <div style={{ marginTop: spacing[1] }}>
                        <Body style={{ fontSize: '9px', color: palette.gray.dark1 }}>
                          Matched: {linkedEntity.matchedAttributes.slice(0, 3).join(', ')}
                          {linkedEntity.matchedAttributes.length > 3 && ` +${linkedEntity.matchedAttributes.length - 3} more`}
                        </Body>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
        
        {/* Review Information */}
        <div style={{ 
          marginTop: spacing[3], 
          paddingTop: spacing[2], 
          borderTop: `1px solid ${palette.gray.light2}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: spacing[1] }}>
            <Icon glyph="Person" size={12} fill={palette.gray.base} />
            <Body style={{ fontSize: '11px', color: palette.gray.dark1 }}>
              Reviewed by: {resolution.reviewedBy || 'System'}
            </Body>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: spacing[1] }}>
            <Icon glyph="Clock" size={12} fill={palette.gray.base} />
            <Body style={{ fontSize: '11px', color: palette.gray.dark1 }}>
              {amlUtils.formatDate(resolution.lastReviewDate)}
            </Body>
          </div>
        </div>
      </div>
    </Card>
  );
}

function ComprehensiveOverviewTab({ entity }) {
  const primaryAddress = amlUtils.getPrimaryAddress(entity.addresses);
  const primaryIdentifier = amlUtils.getPrimaryIdentifier(entity.identifiers);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[4] }}>
      {/* Basic Entity Information */}
      <Card style={{ padding: spacing[4] }}>
        <H3 style={{ marginBottom: spacing[3] }}>Basic Information</H3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: spacing[3] }}>
          <div>
            <Label>Entity ID</Label>
            <Body weight="medium">{entity.entityId}</Body>
          </div>
          <div>
            <Label>Entity Type</Label>
            <Body weight="medium">{amlUtils.formatEntityType(entity.entityType)}</Body>
          </div>
          <div>
            <Label>Status</Label>
            <Body weight="medium" style={{ 
              color: amlUtils.getEntityStatusColor(entity.status) === 'green' ? palette.green.dark2 : 
                     amlUtils.getEntityStatusColor(entity.status) === 'red' ? palette.red.base :
                     amlUtils.getEntityStatusColor(entity.status) === 'yellow' ? palette.yellow.base : palette.gray.dark1
            }}>
              {amlUtils.formatEntityStatus(entity.status)}
            </Body>
          </div>
          {entity.scenarioKey && (
            <div>
              <Label>Demo Scenario</Label>
              <Body weight="medium" style={{ color: palette.blue.base }}>
                {amlUtils.formatScenarioKey(entity.scenarioKey)}
              </Body>
            </div>
          )}
          <div>
            <Label>Source System</Label>
            <Body weight="medium">{entity.sourceSystem || 'N/A'}</Body>
          </div>
          <div>
            <Label>Created At</Label>
            <Body weight="medium">{amlUtils.formatDate(entity.createdAt)}</Body>
          </div>
          <div>
            <Label>Last Updated</Label>
            <Body weight="medium">{amlUtils.formatDate(entity.updatedAt)}</Body>
          </div>
        </div>
      </Card>

      {/* Personal Information */}
      <Card style={{ padding: spacing[4] }}>
        <H3 style={{ marginBottom: spacing[3] }}>Personal Information</H3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: spacing[3] }}>
          <div>
            <Label>Full Name</Label>
            <Body weight="medium">{entity.name?.full || 'N/A'}</Body>
          </div>
          {entity.name?.structured && (
            <>
              <div>
                <Label>First Name</Label>
                <Body weight="medium">{entity.name.structured.first || 'N/A'}</Body>
              </div>
              <div>
                <Label>Last Name</Label>
                <Body weight="medium">{entity.name.structured.last || 'N/A'}</Body>
              </div>
            </>
          )}
          {entity.dateOfBirth && (
            <div>
              <Label>Date of Birth</Label>
              <Body weight="medium">{amlUtils.formatDate(entity.dateOfBirth)}</Body>
            </div>
          )}
          {entity.placeOfBirth && (
            <div>
              <Label>Place of Birth</Label>
              <Body weight="medium">{entity.placeOfBirth}</Body>
            </div>
          )}
          {entity.gender && (
            <div>
              <Label>Gender</Label>
              <Body weight="medium">{entity.gender}</Body>
            </div>
          )}
          {entity.nationality && (
            <div>
              <Label>Nationality</Label>
              <Body weight="medium">
                {Array.isArray(entity.nationality) ? entity.nationality.join(', ') : entity.nationality}
              </Body>
            </div>
          )}
          {entity.residency && (
            <div>
              <Label>Residency</Label>
              <Body weight="medium">{entity.residency}</Body>
            </div>
          )}
        </div>
        
        {entity.name?.aliases && entity.name.aliases.length > 0 && (
          <div style={{ marginTop: spacing[3] }}>
            <Label>Known Aliases</Label>
            <Body weight="medium">{entity.name.aliases.join(', ')}</Body>
          </div>
        )}
        
        {entity.name?.nameComponents && entity.name.nameComponents.length > 0 && (
          <div style={{ marginTop: spacing[2] }}>
            <Label>Name Components (for search)</Label>
            <Body style={{ fontSize: '12px', color: palette.gray.dark1 }}>
              {entity.name.nameComponents.join(', ')}
            </Body>
          </div>
        )}
      </Card>

      {/* Addresses */}
      {entity.addresses && entity.addresses.length > 0 && (
        <Card style={{ padding: spacing[4] }}>
          <H3 style={{ marginBottom: spacing[3] }}>Addresses</H3>
          
          {/* MongoDB Advantage for Address Storage */}
          <div
            style={{
              padding: spacing[2],
              background: palette.blue.light3,
              borderRadius: '4px',
              marginBottom: spacing[3]
            }}
          >
            <Body style={{ fontSize: '12px', color: palette.blue.dark2 }}>
              💡 <strong>MongoDB Advantage:</strong> Arrays of addresses and
              contacts stored naturally as nested documents. PostgreSQL would
              require separate tables with foreign keys, making queries complex
              and slower.
            </Body>
          </div>
          {entity.addresses.map((address, index) => (
            <div key={index} style={{ 
              marginBottom: index < entity.addresses.length - 1 ? spacing[3] : 0,
              padding: spacing[3],
              background: palette.gray.light3,
              borderRadius: '6px'
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: spacing[2] }}>
                <div>
                  <Label>Type</Label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: spacing[1] }}>
                    <Body weight="medium">{address.type || 'Unknown'}</Body>
                  </div>
                </div>
                <div>
                  <Label>Primary Address</Label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: spacing[1] }}>
                    {address.primary ? (
                      <>
                        <Body weight="medium" style={{ color: palette.green.dark2 }}>Primary</Body>
                      </>
                    ) : (
                      <Body weight="medium" style={{ color: palette.gray.dark1 }}>Secondary</Body>
                    )}
                  </div>
                </div>
                <div>
                  <Label>Verification Status</Label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: spacing[1] }}>
                    {address.verified ? (
                      <>
                        <Icon glyph="CheckmarkWithCircle" size={16} fill={palette.green.base} />
                        <span style={{
                          padding: '2px 8px',
                          backgroundColor: palette.green.light2,
                          color: palette.green.dark2,
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: '600'
                        }}>
                          Verified
                        </span>
                      </>
                    ) : (
                      <>
                        <Icon glyph="Warning" size={16} fill={palette.red.base} />
                        <span style={{
                          padding: '2px 8px',
                          backgroundColor: palette.red.light2,
                          color: palette.red.dark2,
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: '600'
                        }}>
                          Unverified
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <div style={{ marginTop: spacing[2] }}>
                <Label>Full Address</Label>
                <Body weight="medium">{address.full || 'N/A'}</Body>
              </div>
              {/* Additional Address Details */}
              <div style={{ marginTop: spacing[3], display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: spacing[2] }}>
                {address.validFrom && (
                  <div>
                    <Label>Valid From</Label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: spacing[1] }}>
                      <Icon glyph="Calendar" size={14} fill={palette.gray.base} />
                      <Body style={{ fontSize: '12px' }}>{amlUtils.formatDate(address.validFrom)}</Body>
                    </div>
                  </div>
                )}
                {address.validTo && (
                  <div>
                    <Label>Valid To</Label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: spacing[1] }}>
                      <Icon glyph="Calendar" size={14} fill={palette.gray.base} />
                      <Body style={{ fontSize: '12px' }}>{amlUtils.formatDate(address.validTo)}</Body>
                    </div>
                  </div>
                )}
                {address.verificationMethod && (
                  <div>
                    <Label>Verification Method</Label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: spacing[1] }}>
                      <Icon glyph="Dashboard" size={14} fill={palette.blue.base} />
                      <Body style={{ fontSize: '12px', color: palette.blue.dark1 }}>
                        {address.verificationMethod.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </Body>
                    </div>
                  </div>
                )}
              </div>
              {address.coordinates && (
                <div style={{ marginTop: spacing[2] }}>
                  <Label>Geographic Coordinates</Label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: spacing[1] }}>
                    <Body style={{ fontSize: '12px', fontFamily: 'monospace', color: palette.gray.dark1 }}>
                      {address.coordinates[1].toFixed(6)}, {address.coordinates[0].toFixed(6)}
                    </Body>
                  </div>
                </div>
              )}
            </div>
          ))}
        </Card>
      )}

      {/* Contact Information */}
      {entity.contactInfo && entity.contactInfo.length > 0 && (
        <Card style={{ padding: spacing[4] }}>
          <H3 style={{ marginBottom: spacing[3] }}>Contact Information</H3>
          {entity.contactInfo.map((contact, index) => (
            <div key={index} style={{ 
              display: 'grid', 
              gridTemplateColumns: '1fr 2fr 1fr 1fr', 
              gap: spacing[2],
              marginBottom: index < entity.contactInfo.length - 1 ? spacing[2] : 0,
              padding: spacing[2],
              background: palette.gray.light3,
              borderRadius: '4px'
            }}>
              <div>
                <Label>Type</Label>
                <Body weight="medium">{amlUtils.formatContactType(contact.type)}</Body>
              </div>
              <div>
                <Label>Value</Label>
                <Body weight="medium">{contact.value}</Body>
              </div>
              <div>
                <Label>Primary</Label>
                <Body weight="medium" style={{ 
                  color: contact.primary ? palette.green.dark2 : palette.gray.dark1 
                }}>
                  {contact.primary ? 'Yes' : 'No'}
                </Body>
              </div>
              <div>
                <Label>Verification Status</Label>
                <div style={{ display: 'flex', alignItems: 'center', gap: spacing[1] }}>
                  {contact.verified ? (
                    <>
                      <Icon glyph="CheckmarkWithCircle" size={14} fill={palette.green.base} />
                      <span style={{
                        padding: '1px 6px',
                        backgroundColor: palette.green.light2,
                        color: palette.green.dark2,
                        borderRadius: '10px',
                        fontSize: '11px',
                        fontWeight: '600'
                      }}>
                        Verified
                      </span>
                    </>
                  ) : (
                    <>
                      <Icon glyph="Warning" size={14} fill={palette.red.base} />
                      <span style={{
                        padding: '1px 6px',
                        backgroundColor: palette.red.light2,
                        color: palette.red.dark2,
                        borderRadius: '10px',
                        fontSize: '11px',
                        fontWeight: '600'
                      }}>
                        Unverified
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </Card>
      )}

      {/* Identifiers */}
      {entity.identifiers && entity.identifiers.length > 0 && (
        <Card style={{ padding: spacing[4] }}>
          <H3 style={{ marginBottom: spacing[3] }}>Identifiers</H3>
          <Table>
            <TableHead>
              <HeaderRow>
                <HeaderCell>Type</HeaderCell>
                <HeaderCell>Value</HeaderCell>
                <HeaderCell>Country</HeaderCell>
                <HeaderCell>Issue Date</HeaderCell>
                <HeaderCell>Expiry Date</HeaderCell>
                <HeaderCell>Verified</HeaderCell>
              </HeaderRow>
            </TableHead>
            <TableBody>
              {entity.identifiers.map((identifier, index) => (
                <Row key={index}>
                  <Cell>
                    <Body weight="medium">{identifier.type?.toUpperCase() || 'Unknown'}</Body>
                  </Cell>
                  <Cell>
                    <Body weight="medium">{identifier.value || 'N/A'}</Body>
                  </Cell>
                  <Cell>
                    <Body>{identifier.country || 'N/A'}</Body>
                  </Cell>
                  <Cell>
                    <Body>{amlUtils.formatDate(identifier.issueDate)}</Body>
                  </Cell>
                  <Cell>
                    <Body>{amlUtils.formatDate(identifier.expiryDate)}</Body>
                  </Cell>
                  <Cell>
                    <Body style={{ 
                      color: identifier.verified ? palette.green.dark2 : palette.red.base 
                    }}>
                      {identifier.verified ? 'Yes' : 'No'}
                    </Body>
                  </Cell>
                </Row>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Customer Information */}
      {entity.customerInfo && (
        <Card style={{ padding: spacing[4] }}>
          <H3 style={{ marginBottom: spacing[3] }}>Customer Information</H3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: spacing[3] }}>
            {entity.customerInfo.customerSince && (
              <div>
                <Label>Customer Since</Label>
                <Body weight="medium">{amlUtils.formatDate(entity.customerInfo.customerSince)}</Body>
              </div>
            )}
            {entity.customerInfo.employmentStatus && (
              <div>
                <Label>Employment Status</Label>
                <Body weight="medium">{entity.customerInfo.employmentStatus}</Body>
              </div>
            )}
            {entity.customerInfo.monthlyIncomeUSD && (
              <div>
                <Label>Monthly Income (USD)</Label>
                <Body weight="medium">${entity.customerInfo.monthlyIncomeUSD.toLocaleString()}</Body>
              </div>
            )}
          </div>
          
          {entity.customerInfo.segments && entity.customerInfo.segments.length > 0 && (
            <div style={{ marginTop: spacing[3] }}>
              <Label>Customer Segments</Label>
              <div style={{ display: 'flex', gap: spacing[1], marginTop: spacing[1] }}>
                {entity.customerInfo.segments.map((segment, index) => (
                  <span key={index} style={{
                    padding: '4px 8px',
                    background: palette.blue.light2,
                    color: palette.blue.dark2,
                    borderRadius: '12px',
                    fontSize: '12px',
                    fontWeight: 500
                  }}>
                    {segment.replace(/_/g, ' ')}
                  </span>
                ))}
              </div>
            </div>
          )}
          
          {entity.customerInfo.products && entity.customerInfo.products.length > 0 && (
            <div style={{ marginTop: spacing[3] }}>
              <Label>Products</Label>
              <div style={{ display: 'flex', gap: spacing[1], marginTop: spacing[1] }}>
                {entity.customerInfo.products.map((product, index) => (
                  <span key={index} style={{
                    padding: '4px 8px',
                    background: palette.green.light2,
                    color: palette.green.dark2,
                    borderRadius: '12px',
                    fontSize: '12px',
                    fontWeight: 500
                  }}>
                    {product.replace(/_/g, ' ')}
                  </span>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Watchlist Matches */}
      <WatchlistMatchesDisplay watchlistMatches={entity.watchlistMatches} />

      {/* Risk Component Breakdown */}
      <RiskComponentsDisplay riskAssessment={entity.riskAssessment} />

      {/* Entity Resolution Information */}
      <EntityResolutionDisplay resolution={entity.resolution} />
      
      {/* MongoDB Unified Data Model Card */}
      <Card
        style={{
          background: palette.yellow.light3,
          padding: spacing[3],
          marginTop: spacing[3],
          border: `1px solid ${palette.yellow.light1}`
        }}
      >
        <div style={{ 
          display: 'flex', 
          alignItems: 'flex-start', 
          gap: spacing[2] 
        }}>
          <Icon 
            glyph="Link" 
            size={16} 
            fill={palette.yellow.dark2} 
            style={{ marginTop: '2px' }}
          />
          <div>
            <Body 
              weight="medium" 
              style={{ 
                fontSize: '13px', 
                color: palette.yellow.dark2,
                marginBottom: spacing[1]
              }}
            >
              Unified Data Model
            </Body>
            <Body style={{ fontSize: '12px', color: palette.yellow.dark1 }}>
              All entity relationships, watchlist matches, and risk assessments in one document. 
              No need for complex JOINs across 10+ tables like traditional RDBMS architectures.
            </Body>
          </div>
        </div>
      </Card>

      {/* Profile Summary */}
      {entity.profileSummaryText && (
        <Card style={{ padding: spacing[4] }}>
          <H3 style={{ marginBottom: spacing[3] }}>Profile Summary</H3>
          <Body>{entity.profileSummaryText}</Body>
        </Card>
      )}
    </div>
  );
}

function AddressesTab({ addresses }) {
  if (!addresses || addresses.length === 0) {
    return (
      <div className={styles.emptyState}>
        <Icon glyph="Home" size={48} fill={palette.gray.light1} />
        <H3>No addresses found</H3>
        <Body style={{ color: palette.gray.dark1 }}>
          No address information is available for this entity.
        </Body>
      </div>
    );
  }

  return (
    <div>
      {addresses.map((address, index) => (
        <Card key={index} style={{ marginBottom: spacing[3], padding: spacing[3] }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: spacing[2] }}>
            <div>
              <Label>Type</Label>
              <Body weight="medium">{address.type || 'Unknown'}</Body>
            </div>
            
            <div>
              <Label>Primary</Label>
              <Body weight="medium" style={{ 
                color: address.primary ? palette.green.dark2 : palette.gray.dark1 
              }}>
                {address.primary ? 'Yes' : 'No'}
              </Body>
            </div>
            
            <div style={{ gridColumn: '1 / -1' }}>
              <Label>Address</Label>
              <Body weight="medium">
                {address.full || 
                 `${address.structured?.street || ''} ${address.structured?.city || ''} ${address.structured?.state || ''} ${address.structured?.country || ''}`.trim() ||
                 'Address details unavailable'}
              </Body>
            </div>
            
            {address.verified !== undefined && (
              <div>
                <Label>Verified</Label>
                <Body weight="medium" style={{ 
                  color: address.verified ? palette.green.dark2 : palette.red.base 
                }}>
                  {address.verified ? 'Yes' : 'No'}
                </Body>
              </div>
            )}
            
            {address.validFrom && (
              <div>
                <Label>Valid From</Label>
                <Body weight="medium">{amlUtils.formatDate(address.validFrom)}</Body>
              </div>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}

function IdentifiersTab({ identifiers }) {
  if (!identifiers || identifiers.length === 0) {
    return (
      <div className={styles.emptyState}>
        <Icon glyph="IdCard" size={48} fill={palette.gray.light1} />
        <H3>No identifiers found</H3>
        <Body style={{ color: palette.gray.dark1 }}>
          No identification documents are available for this entity.
        </Body>
      </div>
    );
  }

  return (
    <Table>
      <TableHead>
        <HeaderRow>
          <HeaderCell>Type</HeaderCell>
          <HeaderCell>Value</HeaderCell>
          <HeaderCell>Country</HeaderCell>
          <HeaderCell>Issue Date</HeaderCell>
          <HeaderCell>Expiry Date</HeaderCell>
          <HeaderCell>Verified</HeaderCell>
        </HeaderRow>
      </TableHead>
      <TableBody>
        {identifiers.map((identifier, index) => (
          <Row key={index}>
            <Cell>
              <Body weight="medium">{identifier.type?.toUpperCase() || 'Unknown'}</Body>
            </Cell>
            <Cell>
              <Body weight="medium">{identifier.value || 'N/A'}</Body>
            </Cell>
            <Cell>
              <Body>{identifier.country || 'N/A'}</Body>
            </Cell>
            <Cell>
              <Body>{amlUtils.formatDate(identifier.issueDate)}</Body>
            </Cell>
            <Cell>
              <Body>{amlUtils.formatDate(identifier.expiryDate)}</Body>
            </Cell>
            <Cell>
              <Body style={{ 
                color: identifier.verified ? palette.green.dark2 : palette.red.base 
              }}>
                {identifier.verified ? 'Yes' : 'No'}
              </Body>
            </Cell>
          </Row>
        ))}
      </TableBody>
    </Table>
  );
}

function WatchlistTab({ watchlistMatches }) {
  if (!watchlistMatches || watchlistMatches.length === 0) {
    return (
      <div className={styles.emptyState}>
        <Icon glyph="Dashboard" size={48} fill={palette.green.base} />
        <H3>No watchlist matches</H3>
        <Body style={{ color: palette.gray.dark1 }}>
          This entity has no matches against watchlists.
        </Body>
      </div>
    );
  }

  return (
    <div>
      <Callout variant="warning" title="Watchlist Matches Found">
        This entity has {watchlistMatches.length} watchlist match(es). Please review carefully.
      </Callout>
      
      <div style={{ marginTop: spacing[3] }}>
        {watchlistMatches.map((match, index) => (
          <Card key={index} style={{ 
            marginBottom: spacing[3], 
            padding: spacing[3],
            border: `2px solid ${palette.red.light2}`
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: spacing[2] }}>
              <div>
                <Label>List Name</Label>
                <Body weight="medium">{match.list_name || 'Unknown'}</Body>
              </div>
              
              <div>
                <Label>Match Score</Label>
                <Body weight="medium" style={{ color: palette.red.base }}>
                  {match.match_score ? `${(match.match_score * 100).toFixed(1)}%` : 'N/A'}
                </Body>
              </div>
              
              <div>
                <Label>Matched Name</Label>
                <Body weight="medium">{match.matched_name || 'N/A'}</Body>
              </div>
            </div>
            
            {match.match_details && (
              <ExpandableCard 
                title="Match Details" 
                style={{ marginTop: spacing[2] }}
              >
                <Code language="json" copyable={true}>
                  {JSON.stringify(match.match_details, null, 2)}
                </Code>
              </ExpandableCard>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}

function NetworkAnalysisTab({ entity }) {
  const router = useRouter();
  const [networkData, setNetworkData] = useState(null);
  const [maxDepth, setMaxDepth] = useState(2);
  const [minStrength, setMinStrength] = useState(0.5);
  const [advancedInvestigationResults, setAdvancedInvestigationResults] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [networkStats, setNetworkStats] = useState(null);


  const fetchNetworkData = async () => {
    if (!entity?.entityId) return;
    
    console.log(`🔍 Fetching network data with maxDepth=${maxDepth}, minStrength=${minStrength} for entity ${entity.entityId}`);
    
    setIsLoading(true);
    setError(null);
    
    try {
      const data = await amlAPI.getEntityNetwork(
        entity.entityId, 
        maxDepth, 
        minStrength, 
        false, // includeInactive
        100, // max nodes
        null // relationshipTypeFilter
      );
      
      console.log(`✅ Network data received:`, {
        nodes: data?.nodes?.length || 0,
        edges: data?.edges?.length || 0,
        metadata: data?.metadata,
        maxDepthUsed: maxDepth,
        minStrengthUsed: minStrength
      });
      
      setNetworkData(data);
      
      // TODO: Add simple network statistics display
      
    } catch (error) {
      console.error('❌ Failed to fetch network:', error);
      setError(error.message || 'Failed to load network data');
    } finally {
      setIsLoading(false);
    }
  };



  // Advanced network investigation for AML workflows
  const handleAdvancedInvestigation = async () => {
    if (!entity?.entityId) return;
    
    setIsLoading(true);
    try {
      const investigationReport = await amlAPI.getNetworkInvestigationReport(
        entity.entityId, 
        'comprehensive'
      );
      
      // Process investigation results
      console.log('Advanced Investigation Report:', investigationReport);
      
      // Update network data with investigation results
      if (investigationReport.networkData) {
        setNetworkData(investigationReport.networkData);
        
        // TODO: Add simple network statistics for investigation data
      }
      
      // Store comprehensive investigation results
      setAdvancedInvestigationResults(investigationReport);
      
    } catch (error) {
      console.error('Advanced investigation failed:', error);
      setError(error.message || 'Advanced investigation failed');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNetworkData();
  }, [entity?.entityId, maxDepth, minStrength]);

  const handleNodeClick = (nodeData) => {
    if (nodeData.id !== entity?.entityId) {
      // Navigate to the clicked entity's detail page
      router.push(`/entities/${nodeData.id}`);
    }
  };

  const handleEdgeClick = (edgeData) => {
    console.log('Edge clicked:', edgeData);
    // Could show relationship details in a modal
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[4] }}>

      {/* Enhanced Network Controls */}
      <Card style={{ padding: spacing[4] }}>
        <H3 style={{ marginBottom: spacing[3] }}>
          <Icon glyph="Relationship" style={{ marginRight: spacing[2] }} />
          Advanced Network Configuration
        </H3>
        
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', 
          gap: spacing[3],
          marginBottom: spacing[3]
        }}>
          {/* Max Depth Control */}
          <div>
            <Label htmlFor="maxDepth" style={{ marginBottom: spacing[1] }}>
              Network Depth
            </Label>
            <select
              id="maxDepth"
              value={maxDepth}
              onChange={(e) => {
                const newDepth = parseInt(e.target.value);
                console.log(`🔧 Network depth changed from ${maxDepth} to ${newDepth}`);
                setMaxDepth(newDepth);
              }}
              style={{
                width: '100%',
                padding: spacing[2],
                border: `1px solid ${palette.gray.light2}`,
                borderRadius: '4px',
                fontSize: '14px'
              }}
            >
              <option value={1}>Direct connections (1 hop)</option>
              <option value={2}>2 degrees of separation</option>
              <option value={3}>3 degrees of separation</option>
              <option value={4}>4 degrees of separation</option>
            </select>
          </div>


          {/* Min Strength Control */}
          <div>
            <Label htmlFor="minStrength" style={{ marginBottom: spacing[1] }}>
              Min Confidence: {(minStrength * 100).toFixed(0)}%
            </Label>
            <input
              id="minStrength"
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={minStrength}
              onChange={(e) => setMinStrength(parseFloat(e.target.value))}
              style={{
                width: '100%',
                marginTop: spacing[1]
              }}
            />
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              fontSize: '11px', 
              color: palette.gray.dark1,
              marginTop: '2px'
            }}>
              <span>0%</span>
              <span>50%</span>
              <span>100%</span>
            </div>
          </div>


          {/* Action Buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[2] }}>
            <Button
              variant="primary"
              onClick={fetchNetworkData}
              disabled={isLoading}
              leftGlyph={<Icon glyph="Refresh" />}
              size="small"
            >
              {isLoading ? 'Loading...' : 'Update Network'}
            </Button>
            <Button
              variant="default"
              size="small"
              leftGlyph={<Icon glyph="Charts" />}
              disabled={!networkData || isLoading}
              onClick={handleAdvancedInvestigation}
              title="Run comprehensive AML investigation with advanced analytics"
            >
              Advanced Investigation
            </Button>
          </div>
        </div>
        
        {/* MongoDB Real-time Graph Traversal */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: spacing[2],
            marginTop: spacing[3],
            padding: spacing[2],
            backgroundColor: palette.green.light3,
            borderRadius: '8px',
            border: `1px solid ${palette.green.light1}`
          }}
        >
          <Icon 
            glyph="Refresh" 
            size={16} 
            fill={palette.green.dark2} 
            style={{ marginTop: '2px' }}
          />
          <div>
            <Body 
              weight="medium" 
              style={{ 
                fontSize: '13px', 
                color: palette.green.dark2,
                marginBottom: spacing[1]
              }}
            >
              Real-time Graph Traversal
            </Body>
            <Body style={{ fontSize: '12px', color: palette.green.dark1 }}>
              MongoDB's aggregation pipeline rebuilds this network instantly as you adjust
              depth and confidence filters - no pre-computed graph tables or
              cache invalidation needed.
            </Body>
          </div>
        </div>

      </Card>

            {/* Network Visualization */}
      <Card style={{ padding: spacing[3] }}>
        <H3 style={{ marginBottom: spacing[3] }}>
          <Icon glyph="Charts" style={{ marginRight: spacing[2] }} />
          Interactive Network Graph
        </H3>
        
        {error && (
          <Banner variant="danger" style={{ marginBottom: spacing[3] }}>
            {error}
          </Banner>
        )}

        {isLoading ? (
          <div style={{ 
            height: '800px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            flexDirection: 'column',
            gap: spacing[3]
          }}>
            <Spinner size="large" />
            <Body>Loading network data...</Body>
          </div>
        ) : (
          <CytoscapeNetworkComponent
            networkData={networkData}
            onNodeClick={handleNodeClick}
            onEdgeClick={handleEdgeClick}
            centerNodeId={entity?.entityId}
            layout="forceDirected"
            showControls={true}
            showLegend={true}
          />
        )}

        {networkData && networkData.totalNodes > 0 && (
          <div style={{ marginTop: spacing[3] }}>
            <Body style={{ fontSize: '12px', color: palette.gray.dark1 }}>
              💡 <strong>Tip:</strong> Click on nodes to navigate to other entities. 
              Use mouse wheel to zoom and drag to pan. 
              Edge thickness represents relationship strength.
            </Body>
          </div>
        )}
      </Card>

      {/* MongoDB Graph Operations Without Neo4j */}
      <Card style={{ 
        background: palette.blue.light3, 
        padding: spacing[4],
        border: `1px solid ${palette.blue.light1}`
      }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'flex-start', 
          gap: spacing[2],
          marginBottom: spacing[3]
        }}>
          <div style={{ flex: 1 }}>
            <H3 style={{ 
              fontSize: '16px', 
              color: palette.blue.dark2,
              marginBottom: spacing[2]
            }}>
              Graph Operations Without Neo4j
            </H3>
            <Body style={{ fontSize: '13px', color: palette.blue.dark1, marginBottom: spacing[2] }}>
              This network visualization leverages MongoDB's $graphLookup - no need for a
              separate Neo4j instance. In PostgreSQL, this would require recursive CTEs
              with severe performance penalties beyond 2 degrees.
            </Body>
            <Code 
              language="javascript" 
              style={{ fontSize: '12px' }}
              showLineNumbers={false}
            >
              {`// Single MongoDB query replaces entire Neo4j deployment
{ $graphLookup: { maxDepth: 4, restrictSearchWithMatch: {...} }}`}
            </Code>
          </div>
        </div>
      </Card>

      {/* Network Statistics Panel */}
      <NetworkStatisticsPanel
        statistics={networkData?.statistics}
        loading={isLoading}
        error={error}
        centerEntityId={entity?.entityId}
      />
    
      
      
      {/* Advanced Investigation Results Panel - Show when available */}
      {advancedInvestigationResults && (
        <AdvancedInvestigationPanel 
          results={advancedInvestigationResults}
          centerEntityId={entity?.entityId}
        />
      )}
      
      {/* Connected Entities via Resolution */}
      {entity.resolution?.linkedEntities && entity.resolution.linkedEntities.length > 0 && (
        <Card style={{ padding: spacing[4] }}>
          <H3 style={{ marginBottom: spacing[3] }}>
            <Icon glyph="Link" style={{ marginRight: spacing[2] }} />
            Resolution-Linked Entities
          </H3>
          <div style={{ display: 'flex', gap: spacing[2], flexWrap: 'wrap' }}>
            {entity.resolution.linkedEntities.map((linkedId, index) => (
              <Card key={index} style={{ 
                padding: spacing[2], 
                background: palette.blue.light3,
                border: `1px solid ${palette.blue.light1}`,
                cursor: 'pointer'
              }}
              onClick={() => router.push(`/entities/${typeof linkedId === 'string' ? linkedId : linkedId.entityId}`)}
              >
                <Body weight="medium" style={{ fontFamily: 'monospace' }}>
                  {typeof linkedId === 'string' ? linkedId : linkedId.entityId || 'Unknown Entity'}
                </Body>
                <Body style={{ fontSize: '12px', color: palette.blue.dark2 }}>
                  Resolution Link
                </Body>
              </Card>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function ActivityAnalysisTab({ entity }) {
  const handleError = (error) => {
    console.error('Transaction error:', error);
  };

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      gap: spacing[4],
      width: '100%',
      minWidth: 0 // Allow flex shrinking
    }}>
      <Card style={{ 
        padding: spacing[4]
      }}>
        <H3 style={{ marginBottom: spacing[3] }}>
          <Icon glyph="Charts" style={{ marginRight: spacing[2] }} />
          Activity & Risk Analysis
        </H3>
        
        <Body style={{ marginBottom: spacing[3], color: palette.gray.dark1 }}>
          Comprehensive analysis of entity activity patterns, transaction behaviors, 
          and risk assessment evolution over time.
        </Body>
        
        {/* MongoDB Transaction Analytics Advantage */}
        <Card
          style={{
            background: palette.green.light3,
            padding: spacing[2],
            marginTop: spacing[3],
            border: `1px solid ${palette.green.light1}`
          }}
        >
          <div style={{ 
            display: 'flex', 
            alignItems: 'flex-start', 
            gap: spacing[2] 
          }}>
            <Icon 
              glyph="ActivityFeed" 
              size={16} 
              fill={palette.green.dark2} 
              style={{ marginTop: '2px' }}
            />
            <div>
              <Body 
                weight="medium" 
                style={{ 
                  fontSize: '13px', 
                  color: palette.green.dark2,
                  marginBottom: spacing[1]
                }}
              >
                Rich Transaction Context
              </Body>
              <Body style={{ fontSize: '12px', color: palette.green.dark1 }}>
                MongoDB stores complete transaction documents with full context - parties, metadata, 
                and risk signals in one place. SQL databases would scatter this across 5+ normalized 
                tables, making pattern detection queries complex and slow.
              </Body>
            </div>
          </div>
        </Card>
      </Card>

      {/* Transaction Activity Table */}
      <TransactionActivityTable 
        entityId={entity?.entityId} 
        onError={handleError}
      />

      {/* Transaction Network Graph */}
      <TransactionNetworkGraph 
        entityId={entity?.entityId} 
        onError={handleError}
      />
    </div>
  );
}

export default function EntityDetail({ entityId }) {
  const router = useRouter();
  const { handleError } = useAMLAPIError();

  // State
  const [entity, setEntity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState(TAB_OVERVIEW);

  // Load entity
  useEffect(() => {
    const loadEntity = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await amlAPI.getEntity(entityId);
        setEntity(response.data || response);

      } catch (err) {
        console.error('Error loading entity:', err);
        setError(handleError(err));
      } finally {
        setLoading(false);
      }
    };

    if (entityId) {
      loadEntity();
    }
  }, [entityId]);

  if (loading) {
    return (
      <div>
        <div style={{ marginBottom: spacing[4] }}>
          <ParagraphSkeleton withHeader />
        </div>
        <CardSkeleton style={{ height: '400px' }} />
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <Banner variant="danger" style={{ marginBottom: spacing[4] }}>
          {error}
        </Banner>
        <div style={{ textAlign: 'center', padding: spacing[4] }}>
          <Button 
            variant="primary"
            onClick={() => router.push('/entities')}
            leftGlyph={<Icon glyph="ArrowLeft" />}
          >
            Back to Entities
          </Button>
        </div>
      </div>
    );
  }

  if (!entity) {
    return (
      <div className={styles.emptyState}>
        <Icon glyph="Person" size={48} fill={palette.gray.light1} />
        <H3>Entity not found</H3>
        <Body style={{ color: palette.gray.dark1 }}>
          The requested entity could not be found.
        </Body>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: spacing[4] }}>
        <BackLink href="/entities">Back to Entities</BackLink>
        <H1 style={{ marginTop: spacing[2], marginBottom: spacing[1] }}>
          {entity.name?.full || entity.entityId}
        </H1>
        <Subtitle>{amlUtils.formatEntityType(entity.entityType)} • {entity.entityId}</Subtitle>
      </div>

      {/* Main Content */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 4fr', gap: spacing[4] }}>
        {/* Left Panel - Entity Info and Risk Score */}
        <div>
          <div style={{ marginBottom: spacing[4] }}>
            <RiskScoreDisplay riskAssessment={entity.riskAssessment} />
          </div>
          
          {/* MongoDB Schema Flexibility Callout */}
          <Callout variant="note" style={{ marginBottom: spacing[4] }}>
            <strong>Schema Flexibility in Action:</strong> The
            entity document contains nested addresses, dynamic identifier types,
            and optional fields - all without rigid table schemas or migrations.
            New compliance requirements? Add fields immediately without
            downtime.
          </Callout>
          
          <SimilarProfilesSection entity={entity} />
        </div>

        {/* Right Panel - Tabs */}
        <div>
          <Tabs selected={activeTab} setSelected={setActiveTab}>
            <Tab name="Overview">
              <div style={{ marginTop: spacing[3] }}>
                <ComprehensiveOverviewTab entity={entity} />
              </div>
            </Tab>
            
            <Tab name="Relationship Network Analysis">
              <div style={{ marginTop: spacing[3] }}>
                <NetworkAnalysisTab entity={entity} />
              </div>
            </Tab>
            
            <Tab name="Transaction Activity Analysis">
              <div style={{ marginTop: spacing[3] }}>
                <ActivityAnalysisTab entity={entity} />
              </div>
            </Tab>
          </Tabs>
        </div>
      </div>
    </div>
  );
}