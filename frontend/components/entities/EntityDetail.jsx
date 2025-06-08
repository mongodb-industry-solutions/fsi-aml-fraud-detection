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
import NetworkGraphComponent from './NetworkGraphComponent';
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
              color: entity.status === 'active' ? palette.green.dark2 : palette.red.base 
            }}>
              {entity.status || 'Unknown'}
            </Body>
          </div>
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
      </Card>

      {/* Addresses */}
      {entity.addresses && entity.addresses.length > 0 && (
        <Card style={{ padding: spacing[4] }}>
          <H3 style={{ marginBottom: spacing[3] }}>Addresses</H3>
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
                <div>
                  <Label>Verified</Label>
                  <Body weight="medium" style={{ 
                    color: address.verified ? palette.green.dark2 : palette.red.base 
                  }}>
                    {address.verified ? 'Yes' : 'No'}
                  </Body>
                </div>
              </div>
              <div style={{ marginTop: spacing[2] }}>
                <Label>Full Address</Label>
                <Body weight="medium">{address.full || 'N/A'}</Body>
              </div>
              {address.validFrom && (
                <div style={{ marginTop: spacing[2] }}>
                  <Label>Valid From</Label>
                  <Body>{amlUtils.formatDate(address.validFrom)}</Body>
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
                <Body weight="medium">{contact.type?.toUpperCase()}</Body>
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
                <Label>Verified</Label>
                <Body weight="medium" style={{ 
                  color: contact.verified ? palette.green.dark2 : palette.red.base 
                }}>
                  {contact.verified ? 'Yes' : 'No'}
                </Body>
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
      {entity.watchlistMatches && (
        <Card style={{ padding: spacing[4] }}>
          <H3 style={{ marginBottom: spacing[3] }}>Watchlist Screening</H3>
          {entity.watchlistMatches.length === 0 ? (
            <div style={{ 
              textAlign: 'center', 
              padding: spacing[3],
              background: palette.green.light3,
              borderRadius: '6px'
            }}>
              <Icon glyph="Shield" size={32} fill={palette.green.base} />
              <Body style={{ color: palette.green.dark2, marginTop: spacing[1] }}>
                No watchlist matches found - Clear
              </Body>
            </div>
          ) : (
            <div>
              <Callout variant="warning" title="Watchlist Matches Found">
                This entity has {entity.watchlistMatches.length} watchlist match(es). Please review carefully.
              </Callout>
              {entity.watchlistMatches.map((match, index) => (
                <Card key={index} style={{ 
                  marginTop: spacing[3], 
                  padding: spacing[3],
                  border: `2px solid ${palette.red.light2}`
                }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: spacing[2] }}>
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
                </Card>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Resolution Information */}
      {entity.resolution && (
        <Card style={{ padding: spacing[4] }}>
          <H3 style={{ marginBottom: spacing[3] }}>Resolution Status</H3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: spacing[3] }}>
            <div>
              <Label>Status</Label>
              <Body weight="medium" style={{
                color: entity.resolution.status === 'resolved' ? palette.green.dark2 : palette.yellow.dark2
              }}>
                {entity.resolution.status || 'Unknown'}
              </Body>
            </div>
            <div>
              <Label>Master Entity ID</Label>
              <Body weight="medium">{entity.resolution.masterEntityId || 'N/A'}</Body>
            </div>
            <div>
              <Label>Confidence</Label>
              <Body weight="medium">
                {entity.resolution.confidence ? `${(entity.resolution.confidence * 100).toFixed(1)}%` : 'N/A'}
              </Body>
            </div>
          </div>
          
          {entity.resolution.linkedEntities && entity.resolution.linkedEntities.length > 0 && (
            <div style={{ marginTop: spacing[3] }}>
              <Label>Linked Entities</Label>
              <div style={{ display: 'flex', gap: spacing[1], marginTop: spacing[1] }}>
                {entity.resolution.linkedEntities.map((linkedId, index) => (
                  <span key={index} style={{
                    padding: '4px 8px',
                    background: palette.purple.light2,
                    color: palette.purple.dark2,
                    borderRadius: '12px',
                    fontSize: '12px',
                    fontWeight: 500,
                    fontFamily: 'monospace'
                  }}>
                    {typeof linkedId === 'string' ? linkedId : linkedId.entityId || 'Unknown Entity'}
                  </span>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}

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
        <Icon glyph="Shield" size={48} fill={palette.green.base} />
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
  const [networkData, setNetworkData] = useState(null);
  const [maxDepth, setMaxDepth] = useState(2);
  const [minStrength, setMinStrength] = useState(0.5);
  const [includeInactive, setIncludeInactive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const router = useRouter();

  const fetchNetworkData = async () => {
    if (!entity?.entityId) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const data = await amlAPI.getEntityNetwork(
        entity.entityId, 
        maxDepth, 
        minStrength, 
        includeInactive,
        100 // max nodes
      );
      
      setNetworkData(data);
    } catch (error) {
      console.error('Failed to fetch network:', error);
      setError(error.message || 'Failed to load network data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNetworkData();
  }, [entity?.entityId, maxDepth, minStrength, includeInactive]);

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
      {/* Network Controls */}
      <Card style={{ padding: spacing[4] }}>
        <H3 style={{ marginBottom: spacing[3] }}>
          <Icon glyph="Relationship" style={{ marginRight: spacing[2] }} />
          Network Configuration
        </H3>
        
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
          gap: spacing[3],
          marginBottom: spacing[3]
        }}>
          {/* Max Depth Control */}
          <div>
            <Label htmlFor="maxDepth" style={{ marginBottom: spacing[1] }}>
              Maximum Depth
            </Label>
            <select
              id="maxDepth"
              value={maxDepth}
              onChange={(e) => setMaxDepth(parseInt(e.target.value))}
              style={{
                width: '100%',
                padding: spacing[2],
                border: `1px solid ${palette.gray.light2}`,
                borderRadius: '4px',
                fontSize: '14px'
              }}
            >
              <option value={1}>Direct connections (1)</option>
              <option value={2}>2 degrees of separation</option>
              <option value={3}>3 degrees of separation</option>
              <option value={4}>4 degrees of separation</option>
            </select>
          </div>

          {/* Min Strength Control */}
          <div>
            <Label htmlFor="minStrength" style={{ marginBottom: spacing[1] }}>
              Minimum Strength: {(minStrength * 100).toFixed(0)}%
            </Label>
            <input
              id="minStrength"
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={minStrength}
              onChange={(e) => setMinStrength(parseFloat(e.target.value))}
              style={{
                width: '100%',
                marginTop: spacing[1]
              }}
            />
          </div>

          {/* Include Inactive */}
          <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2] }}>
            <input
              id="includeInactive"
              type="checkbox"
              checked={includeInactive}
              onChange={(e) => setIncludeInactive(e.target.checked)}
            />
            <Label htmlFor="includeInactive">Include inactive relationships</Label>
          </div>

          {/* Refresh Button */}
          <div style={{ display: 'flex', alignItems: 'end' }}>
            <Button
              variant="default"
              onClick={fetchNetworkData}
              disabled={isLoading}
              leftGlyph={<Icon glyph="Refresh" />}
            >
              {isLoading ? 'Loading...' : 'Update Network'}
            </Button>
          </div>
        </div>

        {/* Network Stats */}
        {networkData && (
          <div style={{ 
            display: 'flex', 
            gap: spacing[4], 
            padding: spacing[3],
            background: palette.gray.light3,
            borderRadius: '6px',
            fontSize: '14px'
          }}>
            <div><strong>Nodes:</strong> {networkData.totalNodes}</div>
            <div><strong>Edges:</strong> {networkData.totalEdges}</div>
            <div><strong>Max Depth Reached:</strong> {networkData.maxDepthReached}</div>
            {networkData.searchMetadata?.executionTimeMs && (
              <div><strong>Load Time:</strong> {networkData.searchMetadata.executionTimeMs}ms</div>
            )}
          </div>
        )}
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
            height: '600px', 
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
          <NetworkGraphComponent
            networkData={networkData}
            onNodeClick={handleNodeClick}
            onEdgeClick={handleEdgeClick}
            centerNodeId={entity?.entityId}
            style={{ height: '600px' }}
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
      
      {/* Similar Profiles Section */}
      <SimilarProfilesSection entity={entity} />
    </div>
  );
}

function ActivityAnalysisTab({ entity }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[4] }}>
      <Card style={{ padding: spacing[4] }}>
        <H3 style={{ marginBottom: spacing[3] }}>
          <Icon glyph="Charts" style={{ marginRight: spacing[2] }} />
          Activity & Risk Analysis
        </H3>
        
        <Body style={{ marginBottom: spacing[3], color: palette.gray.dark1 }}>
          Comprehensive analysis of entity activity patterns, transaction behaviors, 
          and risk assessment evolution over time.
        </Body>
        
        {/* Risk Assessment History */}
        {entity.riskAssessment?.history && entity.riskAssessment.history.length > 0 && (
          <div style={{ marginBottom: spacing[4] }}>
            <H3 style={{ marginBottom: spacing[2] }}>Risk Assessment History</H3>
            <Table>
              <TableHead>
                <HeaderRow>
                  <HeaderCell>Date</HeaderCell>
                  <HeaderCell>Risk Score</HeaderCell>
                  <HeaderCell>Risk Level</HeaderCell>
                  <HeaderCell>Change Trigger</HeaderCell>
                </HeaderRow>
              </TableHead>
              <TableBody>
                {entity.riskAssessment.history.map((record, index) => (
                  <Row key={index}>
                    <Cell>
                      <Body>{amlUtils.formatDate(record.date)}</Body>
                    </Cell>
                    <Cell>
                      <Body weight="medium">{record.score}</Body>
                    </Cell>
                    <Cell>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: 500,
                        background: record.level === 'high' ? palette.red.light2 : 
                                   record.level === 'medium' ? palette.yellow.light2 : palette.green.light2,
                        color: record.level === 'high' ? palette.red.dark2 : 
                               record.level === 'medium' ? palette.yellow.dark2 : palette.green.dark2
                      }}>
                        {record.level}
                      </span>
                    </Cell>
                    <Cell>
                      <Body>{record.changeTrigger?.replace(/_/g, ' ') || 'N/A'}</Body>
                    </Cell>
                  </Row>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        
        {/* Risk Components Breakdown */}
        {entity.riskAssessment?.components && (
          <div style={{ marginBottom: spacing[4] }}>
            <H3 style={{ marginBottom: spacing[2] }}>Risk Components Analysis</H3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: spacing[3] }}>
              {Object.entries(entity.riskAssessment.components).map(([component, data]) => (
                <Card key={component} style={{ 
                  padding: spacing[3], 
                  background: palette.gray.light3,
                  border: `1px solid ${palette.gray.light1}`
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <Label>{component.charAt(0).toUpperCase() + component.slice(1)}</Label>
                      <Body weight="medium">Score: {data.score}</Body>
                      <Body style={{ fontSize: '12px', color: palette.gray.dark1 }}>
                        Weight: {(data.weight * 100).toFixed(0)}%
                      </Body>
                    </div>
                    <div style={{ 
                      width: '60px', 
                      height: '60px', 
                      borderRadius: '50%',
                      background: `conic-gradient(${data.score >= 70 ? palette.red.base : 
                                                    data.score >= 40 ? palette.yellow.base : palette.green.base} ${data.score * 3.6}deg, ${palette.gray.light1} 0deg)`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontWeight: 'bold'
                    }}>
                      {data.score}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}
        
        <div style={{ 
          padding: spacing[4], 
          background: palette.gray.light3, 
          borderRadius: '8px',
          textAlign: 'center' 
        }}>
          <Icon glyph="Charts" size={64} fill={palette.gray.light1} />
          <H3 style={{ marginTop: spacing[2] }}>Advanced Activity Analytics</H3>
          <Body style={{ color: palette.gray.dark1, marginBottom: spacing[3] }}>
            Transaction timelines, activity heatmaps, behavioral pattern analysis, 
            and predictive risk modeling will be available here.
          </Body>
          <Button variant="default" disabled>
            <Icon glyph="BarChart" style={{ marginRight: spacing[1] }} />
            Coming Soon
          </Button>
        </div>
      </Card>
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
        setEntity(response);

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
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: spacing[4] }}>
        {/* Left Panel - Entity Info and Risk Score */}
        <div>
          <div style={{ marginBottom: spacing[4] }}>
            <RiskScoreDisplay riskAssessment={entity.riskAssessment} />
          </div>
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
            
            <Tab name="Network Analysis">
              <div style={{ marginTop: spacing[3] }}>
                <NetworkAnalysisTab entity={entity} />
              </div>
            </Tab>
            
            <Tab name="Activity Analysis">
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