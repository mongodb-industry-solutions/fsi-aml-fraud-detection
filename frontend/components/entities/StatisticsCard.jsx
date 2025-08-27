"use client";

import React from 'react';
import Card from '@leafygreen-ui/card';
import { H3, Body } from '@leafygreen-ui/typography';
import Icon from '@leafygreen-ui/icon';
import { palette } from '@leafygreen-ui/palette';
import { spacing } from '@leafygreen-ui/tokens';

/**
 * Reusable statistics card component for network metrics
 * 
 * Displays a metric with title, value, and optional subtitle in a styled card
 * with consistent LeafyGreen UI theming.
 */
function StatisticsCard({ 
  title, 
  value, 
  subtitle, 
  color = palette.gray.dark1, 
  icon = "Charts",
  size = "medium",
  loading = false 
}) {
  
  // Handle loading state
  if (loading) {
    return (
      <Card style={{ 
        padding: spacing[3], 
        textAlign: 'center',
        minHeight: size === "large" ? '120px' : '100px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <Body style={{ color: palette.gray.base }}>Loading...</Body>
      </Card>
    );
  }

  // Format values for display
  const formatValue = (val) => {
    if (val === null || val === undefined) return 'N/A';
    if (typeof val === 'number') {
      // Handle percentages
      if (title?.toLowerCase().includes('risk') || title?.toLowerCase().includes('density')) {
        return `${val.toFixed(1)}%`;
      }
      // Handle decimals
      if (val % 1 !== 0 && val < 10) {
        return val.toFixed(2);
      }
      // Handle large numbers
      if (val >= 1000) {
        return val.toLocaleString();
      }
      return val.toString();
    }
    return val;
  };

  return (
    <Card style={{ 
      padding: size === "large" ? spacing[4] : spacing[3], 
      textAlign: 'center',
      minHeight: size === "large" ? '120px' : '100px',
      border: `1px solid ${palette.gray.light1}`,
      transition: 'box-shadow 0.2s ease'
    }}>
      {/* Icon */}
      <div style={{ marginBottom: spacing[2] }}>
        <Icon 
          glyph={icon} 
          style={{ 
            color: color,
            fontSize: size === "large" ? '24px' : '20px'
          }} 
        />
      </div>

      {/* Main Value */}
      <div style={{ 
        fontSize: size === "large" ? '32px' : '24px', 
        fontWeight: 'bold', 
        color: color,
        marginBottom: spacing[1],
        lineHeight: 1
      }}>
        {formatValue(value)}
      </div>

      {/* Title */}
      <H3 style={{ 
        color: palette.gray.dark2, 
        marginBottom: subtitle ? spacing[1] : 0,
        fontSize: size === "large" ? '16px' : '14px'
      }}>
        {title}
      </H3>

      {/* Subtitle (optional) */}
      {subtitle && (
        <Body style={{ 
          color: palette.gray.base, 
          fontSize: '12px',
          marginTop: spacing[1]
        }}>
          {subtitle}
        </Body>
      )}
    </Card>
  );
}

export default StatisticsCard;