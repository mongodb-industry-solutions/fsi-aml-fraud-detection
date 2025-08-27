'use client';

import React from 'react';
import { spacing } from '@leafygreen-ui/tokens';
import Banner from '@leafygreen-ui/banner';
import Icon from '@leafygreen-ui/icon';

const ErrorBanner = ({ 
  error, 
  variant = "danger",
  iconGlyph = "Warning",
  style = {},
  maxWidth = '1200px'
}) => {
  if (!error) return null;

  return (
    <div
      style={{
        maxWidth,
        margin: '0 auto',
        marginBottom: spacing[4],
        ...style,
      }}
    >
      <Banner variant={variant}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: spacing[2],
          }}
        >
          <Icon glyph={iconGlyph} />
          <span>{error}</span>
        </div>
      </Banner>
    </div>
  );
};

export default ErrorBanner;