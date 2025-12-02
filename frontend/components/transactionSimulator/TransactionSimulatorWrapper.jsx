"use client";

import { Suspense } from 'react';
import TransactionSimulator from "./TransactionSimulator";
import { Spinner } from '@leafygreen-ui/loading-indicator';
import { spacing } from '@leafygreen-ui/tokens';

export default function TransactionSimulatorWrapper() {
  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px' }}>
      <Suspense fallback={
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          minHeight: '400px',
          flexDirection: 'column',
          gap: spacing[3]
        }}>
          <Spinner size="large" />
        </div>
      }>
        <TransactionSimulator />
      </Suspense>
    </div>
  );
}