"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Card from '@leafygreen-ui/card';
import ExpandableCard from '@leafygreen-ui/expandable-card';
import Button from '@leafygreen-ui/button';
import Banner from '@leafygreen-ui/banner';
import { Table, TableBody, TableHead, HeaderRow, HeaderCell, Row, Cell } from '@leafygreen-ui/table';
import { Body, H2, H3, Label, Overline } from '@leafygreen-ui/typography';
import Badge from '@leafygreen-ui/badge';
import Tooltip from '@leafygreen-ui/tooltip';
import Icon from '@leafygreen-ui/icon';
import Modal from '@leafygreen-ui/modal';
import Code from '@leafygreen-ui/code';
import { palette } from '@leafygreen-ui/palette';
import { spacing } from '@leafygreen-ui/tokens';
import { amlAPI, useAMLAPIError, amlUtils } from '@/lib/aml-api';
import EntityLink from '@/components/common/EntityLink';
import styles from './EntityDetail.module.css';

function SimilarProfilesSection({ entity }) {
  const router = useRouter();
  const { handleError } = useAMLAPIError();
  
  // State management
  const [isLoading, setIsLoading] = useState(false);
  const [similarEntities, setSimilarEntities] = useState([]);
  const [searchMetadata, setSearchMetadata] = useState(null);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showJsonModal, setShowJsonModal] = useState(false);
  const [showEntityJson, setShowEntityJson] = useState(false);
  
  // Vector search state
  const [vectorSearchLimit, setVectorSearchLimit] = useState(5);
  const [filters, setFilters] = useState({});

  const handleVectorSearch = async () => {
    if (!entity?.entityId) {
      setError('Entity ID is required for vector search');
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      const response = await amlAPI.findSimilarEntitiesByVector(
        entity.entityId,
        vectorSearchLimit,
        filters
      );
      
      console.log('Vector search response:', response);
      setSimilarEntities(response.similar_entities || []);
      setSearchMetadata(response.search_metadata || {});
      setShowModal(true);
      
    } catch (err) {
      const errorMessage = handleError(err);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };


  const handleEntityClick = (entityId) => {
    setShowModal(false);
    router.push(`/entities/${entityId}`);
  };

  const SimilarityBadge = ({ score }) => {
    const percentage = amlUtils.formatSimilarityScore(score);
    const color = amlUtils.getSimilarityScoreColor(score);
    
    return (
      <Badge 
        variant={color === 'green' ? 'green' : color === 'yellow' ? 'yellow' : 'red'}
      >
        {percentage}
      </Badge>
    );
  };

  const RiskBadge = ({ riskAssessment }) => {
    if (!riskAssessment?.overall) return <Badge variant="lightgray">Unknown</Badge>;
    
    const { level } = riskAssessment.overall;
    const variant = level?.toLowerCase() === 'high' ? 'red' : 
                   level?.toLowerCase() === 'medium' ? 'yellow' : 'green';
    
    return <Badge variant={variant}>{level}</Badge>;
  };

  return (
    <Card style={{ padding: spacing[4], marginTop: spacing[4] }}>
      <H2 style={{ marginBottom: spacing[3] }}>
        <Icon glyph="MagnifyingGlass" style={{ marginRight: spacing[2] }} />
        Similar Profiles
      </H2>
      
      <Body style={{ marginBottom: spacing[3], color: palette.gray.dark1 }}>
        Find entities with similar profiles using vector similarity search based on AI embeddings of 
        risk characteristics, behavioral patterns, and profile descriptions.
      </Body>

      {error && (
        <Banner variant="warning" style={{ marginBottom: spacing[3] }}>
          {error}
        </Banner>
      )}

      <div style={{ display: 'flex', gap: spacing[2], flexWrap: 'wrap', alignItems: 'center' }}>
        <Button
          variant="primary"
          size="default"
          leftGlyph={<Icon glyph="MagnifyingGlass" />}
          onClick={handleVectorSearch}
          disabled={isLoading || !entity?.entityId}
        >
          {isLoading ? 'Searching...' : 'Find Similar Profiles'}
        </Button>

        {entity?.profileEmbedding && (
          <Body style={{ color: palette.green.dark2, fontSize: '12px' }}>
            ✓ Vector embeddings available ({entity.profileEmbedding.length} dimensions)
          </Body>
        )}
        
        {!entity?.profileEmbedding && (
          <Body style={{ color: palette.yellow.dark2, fontSize: '12px' }}>
            ⚠ No vector embeddings found for this entity
          </Body>
        )}
      </div>

      {/* Main Results Modal */}
      <Modal
        open={showModal}
        setOpen={setShowModal}
        size="large"
        contentStyle={{ zIndex: 1001 }}
      >
        <H2 style={{ marginBottom: spacing[3] }}>Similar Profiles Found</H2>
        
        {searchMetadata && (
          <div style={{ 
            padding: spacing[2], 
            backgroundColor: palette.gray.light3, 
            borderRadius: '6px',
            marginBottom: spacing[3]
          }}>
            <Overline style={{ color: palette.gray.dark2 }}> 
              {similarEntities.length} results • 
              {searchMetadata.similarity_metric || 'cosine'} similarity
            </Overline>
          </div>
        )}

        {similarEntities.length === 0 ? (
          <div style={{ textAlign: 'center', padding: spacing[4] }}>
            <Icon glyph="InfoWithCircle" size={48} fill={palette.gray.light1} />
            <H3 style={{ marginTop: spacing[2] }}>No Similar Profiles Found</H3>
            <Body style={{ color: palette.gray.dark1 }}>
              No entities with similar profiles were found. Try adjusting your search criteria.
            </Body>
          </div>
        ) : (
          <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
            <Table>
              <TableHead>
                <HeaderRow>
                  <HeaderCell>Entity</HeaderCell>
                  <HeaderCell>Type</HeaderCell>
                  <HeaderCell>Risk Level</HeaderCell>
                  <HeaderCell>Similarity</HeaderCell>
                  <HeaderCell>Profile Summary</HeaderCell>
                  <HeaderCell>Actions</HeaderCell>
                </HeaderRow>
              </TableHead>
              <TableBody>
                {similarEntities.map((similarEntity, index) => (
                  <Row key={index}>
                    <Cell>
                      <div>
                        <EntityLink 
                          entityId={similarEntity.entityId}
                          weight="medium"
                          onClick={() => setShowModal(false)}
                        >
                          {similarEntity.name?.full || 'N/A'}
                        </EntityLink>
                        <Overline style={{ color: palette.gray.dark1 }}>
                          {similarEntity.entityId}
                        </Overline>
                      </div>
                    </Cell>
                    <Cell>
                      <Body>{amlUtils.formatEntityType(similarEntity.entityType)}</Body>
                    </Cell>
                    <Cell>
                      <RiskBadge riskAssessment={similarEntity.riskAssessment} />
                    </Cell>
                    <Cell>
                      <SimilarityBadge score={similarEntity.vectorSearchScore} />
                    </Cell>
                    <Cell>
                      <Tooltip 
                        trigger={
                          <Body style={{ 
                            maxWidth: '200px', 
                            overflow: 'hidden', 
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            cursor: 'help'
                          }}>
                            {amlUtils.truncateProfileSummary(similarEntity.profileSummaryText, 100)}
                          </Body>
                        }
                      >
                        {similarEntity.profileSummaryText || 'No profile summary available'}
                      </Tooltip>
                    </Cell>
                    <Cell>
                      <a 
                        href={`/entities/${similarEntity.entityId}`}
                        onClick={(e) => {
                          if (e.button === 0 && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
                            e.preventDefault();
                            handleEntityClick(similarEntity.entityId);
                          }
                        }}
                        style={{ textDecoration: 'none' }}
                      >
                        <Button
                          variant="default"
                          size="xsmall"
                        >
                          View Details
                        </Button>
                      </a>
                    </Cell>
                  </Row>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Modal>

      {/* MongoDB Document View with ExpandableCard */}
      <ExpandableCard
        title={
          <span style={{ display: 'flex', alignItems: 'center', gap: spacing[1] }}>
            <span style={{ color: palette.blue.base, fontSize: '16px' }}>{ '{' }</span>
            <span style={{ fontSize: '13px' }}>
              MongoDB Document 
            </span>
            <span style={{ color: palette.blue.base, fontSize: '16px' }}>{ '}' }</span>
            <Button
              variant="default"
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                setShowJsonModal(true);
              }}
              style={{ marginLeft: 'auto' }}
            >
              Fullscreen
            </Button>
          </span>
        }
        defaultOpen={showEntityJson}
        onClick={() => setShowEntityJson(!showEntityJson)}
        contentClassName={styles.expandableContent}
        style={{ marginTop: spacing[4] }}
      >
        <div style={{ maxHeight: '400px', overflow: 'auto' }}>
          <Code 
            language="json" 
            copyable={true}
            style={{ fontSize: '12px', lineHeight: '1.4' }}
          >
            {JSON.stringify(entity, null, 2)}
          </Code>
        </div>
      </ExpandableCard>

      {/* Fullscreen JSON Modal */}
      <Modal
        open={showJsonModal}
        setOpen={setShowJsonModal}
        size="large"
        contentStyle={{ zIndex: 1001 }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing[3] }}>
          <H2 style={{ margin: 0 }}>
            <Icon glyph="Code" style={{ marginRight: spacing[2] }} />
            MongoDB Document Structure
          </H2>
          <Body style={{ color: palette.gray.dark1, fontSize: '12px' }}>
            Entity ID: {entity?.entityId}
          </Body>
        </div>
        
        <div style={{ 
          maxHeight: '70vh', 
          overflow: 'auto',
          border: `1px solid ${palette.gray.light2}`,
          borderRadius: '6px',
          backgroundColor: palette.gray.light3
        }}>
          <Code 
            language="json" 
            copyable={true}
            style={{ 
              fontSize: '13px', 
              lineHeight: '1.5',
              margin: 0
            }}
          >
            {JSON.stringify(entity, null, 2)}
          </Code>
        </div>

        <div style={{ 
          marginTop: spacing[3], 
          padding: spacing[2], 
          backgroundColor: palette.blue.light3, 
          borderRadius: '6px',
          border: `1px solid ${palette.blue.light2}`
        }}>
          <Body style={{ fontSize: '12px', color: palette.blue.dark2 }}>
            <Icon glyph="InfoWithCircle" style={{ marginRight: spacing[1] }} />
            This shows the complete MongoDB document structure as stored in the database, 
            including all fields, nested objects, and metadata.
          </Body>
        </div>
        
        {/* Bottom Right Close Button */}
        <div style={{
          position: 'absolute',
          bottom: '16px',
          right: '16px',
          zIndex: 1002
        }}>
          <Button
            onClick={() => setShowJsonModal(false)}
            variant="primary"
            size="default"
            leftGlyph={<Icon glyph="X" />}
          >
            Close Document
          </Button>
        </div>
      </Modal>

    </Card>
  );
}

export default SimilarProfilesSection;