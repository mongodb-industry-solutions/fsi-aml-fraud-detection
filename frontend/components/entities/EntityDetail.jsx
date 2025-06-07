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
import styles from './EntityDetail.module.css';

// Tab constants
const TAB_OVERVIEW = 0;
const TAB_ADDRESSES = 1;
const TAB_IDENTIFIERS = 2;
const TAB_WATCHLIST = 3;
const TAB_NETWORK = 4;
const TAB_ACTIVITY = 5;

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

function EntityInfoCard({ entity }) {
  const primaryAddress = amlUtils.getPrimaryAddress(entity.addresses);
  const primaryIdentifier = amlUtils.getPrimaryIdentifier(entity.identifiers);

  return (
    <Card style={{ padding: spacing[4] }}>
      <H2 style={{ marginBottom: spacing[3] }}>Entity Information</H2>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: spacing[3] }}>
        <div>
          <Label>Entity ID</Label>
          <Body weight="medium">{entity.entityId}</Body>
        </div>
        
        <div>
          <Label>Entity Type</Label>
          <Body weight="medium">{amlUtils.formatEntityType(entity.entityType)}</Body>
        </div>
        
        <div>
          <Label>Full Name</Label>
          <Body weight="medium">{entity.name?.full || 'N/A'}</Body>
        </div>
        
        <div>
          <Label>Status</Label>
          <Body weight="medium" style={{ 
            color: entity.status === 'active' ? palette.green.dark2 : palette.red.base 
          }}>
            {entity.status || 'Unknown'}
          </Body>
        </div>
        
        {entity.dateOfBirth && (
          <div>
            <Label>Date of Birth</Label>
            <Body weight="medium">{amlUtils.formatDate(entity.dateOfBirth)}</Body>
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
        
        {primaryAddress && (
          <div style={{ gridColumn: '1 / -1' }}>
            <Label>Primary Address</Label>
            <Body weight="medium">
              {primaryAddress.full || 
               `${primaryAddress.structured?.street || ''} ${primaryAddress.structured?.city || ''} ${primaryAddress.structured?.country || ''}`.trim() ||
               'Address details unavailable'}
            </Body>
          </div>
        )}
        
        {primaryIdentifier && (
          <div>
            <Label>Primary Identifier</Label>
            <Body weight="medium">
              {primaryIdentifier.type?.toUpperCase()}: {primaryIdentifier.value}
            </Body>
          </div>
        )}
        
        {entity.sourceSystem && (
          <div>
            <Label>Source System</Label>
            <Body weight="medium">{entity.sourceSystem}</Body>
          </div>
        )}
      </div>
    </Card>
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

function PlaceholderTab({ title, description, icon }) {
  return (
    <div className={styles.emptyState}>
      <Icon glyph={icon} size={48} fill={palette.gray.light1} />
      <H3>{title}</H3>
      <Body style={{ color: palette.gray.dark1 }}>
        {description}
      </Body>
      <div style={{ marginTop: spacing[3] }}>
        <Button variant="default" disabled>
          Coming Soon
        </Button>
      </div>
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
          <div style={{ marginBottom: spacing[4] }}>
            <EntityInfoCard entity={entity} />
          </div>
          <SimilarProfilesSection entity={entity} />
        </div>

        {/* Right Panel - Tabs */}
        <div>
          <Tabs selected={activeTab} setSelected={setActiveTab}>
            <Tab name="Overview">
              <div style={{ marginTop: spacing[3] }}>
                <Card style={{ padding: spacing[4] }}>
                  <H3 style={{ marginBottom: spacing[3] }}>Profile Summary</H3>
                  
                  {entity.profileSummaryText ? (
                    <Body>{entity.profileSummaryText}</Body>
                  ) : (
                    <Body style={{ color: palette.gray.dark1, fontStyle: 'italic' }}>
                      No profile summary available.
                    </Body>
                  )}

                  {entity.resolution && (
                    <div style={{ marginTop: spacing[4] }}>
                      <H3 style={{ marginBottom: spacing[2] }}>Resolution Status</H3>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: spacing[2] }}>
                        <div>
                          <Label>Status</Label>
                          <Body weight="medium" style={{
                            color: entity.resolution.status === 'resolved' ? palette.green.dark2 : palette.yellow.dark2
                          }}>
                            {entity.resolution.status || 'Unknown'}
                          </Body>
                        </div>
                        
                        <div>
                          <Label>Confidence</Label>
                          <Body weight="medium">
                            {entity.resolution.confidence ? `${(entity.resolution.confidence * 100).toFixed(1)}%` : 'N/A'}
                          </Body>
                        </div>
                      </div>
                    </div>
                  )}
                </Card>
              </div>
            </Tab>
            
            <Tab name="Addresses">
              <div style={{ marginTop: spacing[3] }}>
                <AddressesTab addresses={entity.addresses} />
              </div>
            </Tab>
            
            <Tab name="Identifiers">
              <div style={{ marginTop: spacing[3] }}>
                <IdentifiersTab identifiers={entity.identifiers} />
              </div>
            </Tab>
            
            <Tab name="Watchlist">
              <div style={{ marginTop: spacing[3] }}>
                <WatchlistTab watchlistMatches={entity.watchlistMatches} />
              </div>
            </Tab>
            
            <Tab name="Network Graph">
              <div style={{ marginTop: spacing[3] }}>
                <PlaceholderTab 
                  title="Network Graph"
                  description="Interactive network visualization showing entity relationships and connections will be available here."
                  icon="Relationship"
                />
              </div>
            </Tab>
            
            <Tab name="Activity Analysis">
              <div style={{ marginTop: spacing[3] }}>
                <PlaceholderTab 
                  title="Activity Analysis"
                  description="Transaction patterns, activity timelines, and behavioral analysis will be displayed here."
                  icon="Charts"
                />
              </div>
            </Tab>
          </Tabs>
        </div>
      </div>
    </div>
  );
}