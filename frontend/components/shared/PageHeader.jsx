'use client';

import React from 'react';
import {
  H1,
  Body,
} from '@leafygreen-ui/typography';
import { spacing } from '@leafygreen-ui/tokens';
import { palette } from '@leafygreen-ui/palette';
import Card from '@leafygreen-ui/card';
import Badge from '@leafygreen-ui/badge';
import Icon from '@leafygreen-ui/icon';

const PageHeader = ({
  title = "Enhanced Entity Resolution Intelligence",
  description = "Complete entity resolution platform combining MongoDB Atlas Search and Vector Search. Experience traditional fuzzy matching and AI-powered semantic discovery together.",
  icon = "University",
  badges = [],
  showControls = false,
  controls = null,
  style = {}
}) => {
  return (
    <div
      style={{
        maxWidth: '1200px',
        margin: '0 auto',
        marginBottom: spacing[4],
        ...style,
      }}
    >
      <Card style={{ padding: spacing[4] }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: spacing[3],
          }}
        >
          <div style={{ textAlign: 'center', flex: 1 }}>
            <div style={{ marginBottom: spacing[3] }}>
              <Icon
                glyph={icon}
                size="large"
                fill={palette.blue.base}
              />
            </div>
            <H1
              style={{
                color: palette.gray.dark3,
                marginBottom: spacing[2],
                fontSize: '36px',
              }}
            >
              ⚡ {title}
            </H1>
            <Body
              style={{
                color: palette.gray.dark1,
                fontSize: '18px',
                maxWidth: '600px',
                margin: '0 auto',
              }}
            >
              {description}
            </Body>
          </div>

          {showControls && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-end',
                gap: spacing[2],
              }}
            >
              {badges.map((badge, index) => (
                <Badge
                  key={index}
                  variant={badge.variant || 'blue'}
                  style={{ fontSize: '12px' }}
                >
                  {badge.text}
                </Badge>
              ))}
              
              {controls}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default PageHeader;