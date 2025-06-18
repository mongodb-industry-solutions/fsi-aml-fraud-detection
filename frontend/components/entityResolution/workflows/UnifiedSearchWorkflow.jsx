'use client';

import React from 'react';
import { spacing } from '@leafygreen-ui/tokens';

import UnifiedSearchInterface from '../UnifiedSearchInterface';
import CombinedIntelligencePanel from '../CombinedIntelligencePanel';

const UnifiedSearchWorkflow = ({
  unifiedSearchResults,
  onSearchResults,
  onError
}) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: spacing[4],
        paddingTop: spacing[4],
      }}
    >
      {/* Unified Search Interface */}
      <UnifiedSearchInterface
        onSearchResults={onSearchResults}
        onError={onError}
      />

      {/* Combined Intelligence Panel */}
      {unifiedSearchResults && (
        <CombinedIntelligencePanel
          searchResults={unifiedSearchResults}
          isVisible={true}
        />
      )}
    </div>
  );
};

export default UnifiedSearchWorkflow;