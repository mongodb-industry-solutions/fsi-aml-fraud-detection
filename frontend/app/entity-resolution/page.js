'use client';

import React, { useState } from 'react';
import {
  H1,
  H2,
  H3,
  Body,
  Subtitle,
} from '@leafygreen-ui/typography';
import { spacing } from '@leafygreen-ui/tokens';
import { palette } from '@leafygreen-ui/palette';
import Card from '@leafygreen-ui/card';
import Banner from '@leafygreen-ui/banner';
import Button from '@leafygreen-ui/button';
import Badge from '@leafygreen-ui/badge';
import Icon from '@leafygreen-ui/icon';
import { Tabs, Tab } from '@leafygreen-ui/tabs';

import PageHeader from '../../components/shared/PageHeader';
import ErrorBanner from '../../components/shared/ErrorBanner';
import TraditionalWorkflow from '../../components/entityResolution/workflows/TraditionalWorkflow';
import UnifiedSearchWorkflow from '../../components/entityResolution/workflows/UnifiedSearchWorkflow';

const EntityResolutionPage = () => {
  // Traditional workflow state
  const [matchesData, setMatchesData] = useState(null);
  const [selectedEntity, setSelectedEntity] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showWorkbench, setShowWorkbench] = useState(false);
  const [resolutionComplete, setResolutionComplete] = useState(false);
  const [useEnhancedView, setUseEnhancedView] = useState(true);
  const [searchMetrics, setSearchMetrics] = useState(null);

  // Unified search state
  const [activeTab, setActiveTab] = useState(0);
  const [unifiedSearchResults, setUnifiedSearchResults] = useState(null);

  const handleMatchesFound = (data) => {
    setMatchesData(data);
    setSelectedEntity(null);
    setShowWorkbench(false);
    setResolutionComplete(false);
    setError(null);

    // Capture search metrics for enhanced view
    if (data.metadata) {
      setSearchMetrics({
        totalTime: data.metadata.totalTime || 0,
        atlasTime: data.metadata.atlasSearchTime || 0,
        vectorTime: data.metadata.vectorSearchTime || 0,
        totalMatches: data.matches ? data.matches.length : 0,
        atlasMatches: data.metadata.atlasMatches || 0,
        vectorMatches: data.metadata.vectorMatches || 0
      });
    }
  };

  const handleEntitySelect = (entity) => {
    setSelectedEntity(entity);
    setShowWorkbench(true);
    setResolutionComplete(false);
  };

  const handleError = (errorMessage) => {
    setError(errorMessage);
    setMatchesData(null);
    setSelectedEntity(null);
    setShowWorkbench(false);
    setResolutionComplete(false);
  };

  const handleLoading = (loading) => {
    setIsLoading(loading);
    if (loading) {
      setError(null);
    }
  };

  const handleResolutionComplete = (result) => {
    setResolutionComplete(true);
    setShowWorkbench(false);
    console.log('Resolution completed:', result);
  };

  const handleWorkbenchCancel = () => {
    setShowWorkbench(false);
    setSelectedEntity(null);
  };

  const handleReset = () => {
    setMatchesData(null);
    setSelectedEntity(null);
    setShowWorkbench(false);
    setResolutionComplete(false);
    setError(null);
  };

  // Unified search handlers
  const handleUnifiedSearchResults = (data) => {
    setUnifiedSearchResults(data.results);
    setError(null);
  };

  const handleUnifiedSearchError = (errorMessage) => {
    setError(errorMessage);
    setUnifiedSearchResults(null);
  };

  const handleEnhancedViewToggle = () => {
    setUseEnhancedView(!useEnhancedView);
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: palette.gray.light3,
        padding: spacing[4],
      }}
    >
      {/* Page Header */}
      <PageHeader
        badges={[
          { text: 'MongoDB Atlas', variant: 'blue' },
          { text: 'Vector Search', variant: 'green' },
          { text: 'Fuzzy Matching', variant: 'yellow' }
        ]}
        showControls={true}
        controls={
          <Button
            variant="default"
            size="small"
            leftGlyph={<Icon glyph="Refresh" />}
            onClick={handleEnhancedViewToggle}
          >
            {useEnhancedView ? 'Traditional View' : 'Enhanced View'}
          </Button>
        }
      />

      {/* Error Banner */}
      <ErrorBanner error={error} />

      {/* Main Content with Tabs */}
      <div
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
        }}
      >
        <Tabs
          selected={activeTab}
          setSelected={setActiveTab}
          style={{ marginBottom: spacing[4] }}
          aria-label="Entity Resolution Interface Modes"
        >
          <Tab name="Traditional Workflow">
            <TraditionalWorkflow
              matchesData={matchesData}
              selectedEntity={selectedEntity}
              showWorkbench={showWorkbench}
              resolutionComplete={resolutionComplete}
              useEnhancedView={useEnhancedView}
              searchMetrics={searchMetrics}
              onMatchesFound={handleMatchesFound}
              onError={handleError}
              onLoading={handleLoading}
              onEntitySelect={handleEntitySelect}
              onResolutionComplete={handleResolutionComplete}
              onWorkbenchCancel={handleWorkbenchCancel}
              onReset={handleReset}
              onEnhancedViewToggle={handleEnhancedViewToggle}
            />
          </Tab>

          <Tab name="Unified Search Demo">
            <UnifiedSearchWorkflow
              unifiedSearchResults={unifiedSearchResults}
              onSearchResults={handleUnifiedSearchResults}
              onError={handleUnifiedSearchError}
            />
          </Tab>
        </Tabs>
      </div>
    </div>
  );
};

export default EntityResolutionPage;