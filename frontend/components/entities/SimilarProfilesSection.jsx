"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Card from '@leafygreen-ui/card';
import Button from '@leafygreen-ui/button';
import Banner from '@leafygreen-ui/banner';
import { Table, TableBody, TableHead, HeaderRow, HeaderCell, Row, Cell } from '@leafygreen-ui/table';
import { Body, H2, H3, Label, Overline } from '@leafygreen-ui/typography';
import Badge from '@leafygreen-ui/badge';
import Tooltip from '@leafygreen-ui/tooltip';
import Icon from '@leafygreen-ui/icon';
import Modal from '@leafygreen-ui/modal';
import TextInput from '@leafygreen-ui/text-input';
import { Select, Option } from '@leafygreen-ui/select';
import { Spinner } from '@leafygreen-ui/loading-indicator';
import { palette } from '@leafygreen-ui/palette';
import { spacing } from '@leafygreen-ui/tokens';
import { amlAPI, useAMLAPIError, amlUtils } from '@/lib/aml-api';
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
  const [showTextSearch, setShowTextSearch] = useState(false);
  
  // Text search state
  const [queryText, setQueryText] = useState('');
  const [textSearchLimit, setTextSearchLimit] = useState(5);
  
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

  const handleTextSearch = async () => {
    if (!queryText.trim() || queryText.trim().length < 10) {
      setError('Query text must be at least 10 characters long');
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      const response = await amlAPI.findSimilarEntitiesByText(
        queryText.trim(),
        textSearchLimit,
        filters
      );
      
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
        Use vector search to find entities with semantically similar profiles based on 
        their risk characteristics, behavioral patterns, and profile descriptions.
      </Body>

      {error && (
        <Banner variant="warning" style={{ marginBottom: spacing[3] }}>
          {error}
        </Banner>
      )}

      <div style={{ display: 'flex', gap: spacing[2], flexWrap: 'wrap' }}>
        <Button
          variant="primary"
          size="default"
          leftGlyph={<Icon glyph="MagnifyingGlass" />}
          onClick={handleVectorSearch}
          disabled={isLoading || !entity?.entityId}
        >
          {isLoading ? 'Searching...' : 'Find Similar Profiles'}
        </Button>

        <Button
          variant="default"
          size="default"
          leftGlyph={<Icon glyph="Edit" />}
          onClick={() => setShowTextSearch(true)}
          disabled={isLoading}
        >
          Text Search
        </Button>
      </div>

      {/* Main Results Modal */}
      <Modal
        open={showModal}
        setOpen={setShowModal}
        size="large"
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
              Search completed in {searchMetadata.search_time_ms}ms • 
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
                        <Body weight="medium">{similarEntity.name?.full || 'N/A'}</Body>
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
                      <Button
                        variant="default"
                        size="xsmall"
                        onClick={() => handleEntityClick(similarEntity.entityId)}
                      >
                        View Details
                      </Button>
                    </Cell>
                  </Row>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Modal>

      {/* Text Search Modal */}
      <Modal
        open={showTextSearch}
        setOpen={setShowTextSearch}
        size="default"
      >
        <H2 style={{ marginBottom: spacing[3] }}>Search by Description</H2>
        
        <Body style={{ marginBottom: spacing[3], color: palette.gray.dark1 }}>
          Enter a narrative description to find entities with similar characteristics.
          For example: "high-risk individual with offshore banking activities"
        </Body>

        <div style={{ marginBottom: spacing[3] }}>
          <TextInput
            label="Query Description"
            description="Minimum 10 characters required"
            value={queryText}
            onChange={(e) => setQueryText(e.target.value)}
            placeholder="e.g., individuals involved in shell companies in offshore jurisdictions"
            state={queryText.length > 0 && queryText.length < 10 ? 'error' : 'none'}
            errorMessage={queryText.length > 0 && queryText.length < 10 ? 'Must be at least 10 characters' : ''}
          />
        </div>

        <div style={{ marginBottom: spacing[4] }}>
          <Select
            label="Number of Results"
            value={textSearchLimit.toString()}
            onChange={(value) => setTextSearchLimit(parseInt(value))}
          >
            <Option value="3">3 results</Option>
            <Option value="5">5 results</Option>
            <Option value="10">10 results</Option>
          </Select>
        </div>

        <div style={{ display: 'flex', gap: spacing[2], justifyContent: 'flex-end' }}>
          <Button
            variant="default"
            onClick={() => setShowTextSearch(false)}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleTextSearch}
            disabled={isLoading || queryText.trim().length < 10}
          >
            {isLoading ? <Spinner size={16} /> : 'Search'}
          </Button>
        </div>
      </Modal>
    </Card>
  );
}

export default SimilarProfilesSection;