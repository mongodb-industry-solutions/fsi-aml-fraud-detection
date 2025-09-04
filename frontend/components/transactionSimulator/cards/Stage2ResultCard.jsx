"use client";

import React from 'react';
import Card from '@leafygreen-ui/card';
import Badge from '@leafygreen-ui/badge';
import Icon from '@leafygreen-ui/icon';
import { Body, H3 } from '@leafygreen-ui/typography';
import { Spinner } from '@leafygreen-ui/loading-indicator';
import { palette } from '@leafygreen-ui/palette';
import { spacing } from '@leafygreen-ui/tokens';

/**
 * Stage 2 Result Card Component
 * 
 * Displays Stage 2 AI analysis results when Stage 2 is triggered.
 * Only visible when needs_stage2 is true or stage_completed === 2.
 */
const Stage2ResultCard = ({ 
  stage2Data = {}, 
  loading = false,
  visible = false,
  style = {}
}) => {
  // Don't render if not visible
  if (!visible) return null;

  const {
    risk_score,
    decision,
    thread_id
  } = stage2Data;

  // Get decision styling and info
  const getDecisionInfo = () => {
    if (loading) {
      return { 
        text: 'ANALYZING...', 
        variant: 'blue', 
        icon: 'Refresh',
        description: 'AI analysis in progress...',
        color: palette.blue.base
      };
    }

    switch(decision) {
      case 'APPROVE':
        return { 
          text: 'APPROVE', 
          variant: 'green', 
          icon: 'Checkmark',
          description: 'Transaction approved by AI analysis',
          color: palette.green.base
        };
      case 'BLOCK':
        return { 
          text: 'BLOCK', 
          variant: 'red', 
          icon: 'X',
          description: 'Transaction blocked by AI analysis',
          color: palette.red.base
        };
      case 'INVESTIGATE':
        return { 
          text: 'INVESTIGATE', 
          variant: 'yellow', 
          icon: 'MagnifyingGlass',
          description: 'Transaction requires manual investigation',
          color: palette.yellow.dark2
        };
      case 'ESCALATE':
        return { 
          text: 'ESCALATE', 
          variant: 'red', 
          icon: 'Warning',
          description: 'Transaction escalated for senior review',
          color: palette.red.dark1
        };
      default:
        return { 
          text: 'PENDING', 
          variant: 'gray', 
          icon: 'Clock',
          description: 'Awaiting AI analysis completion',
          color: palette.gray.base
        };
    }
  };

  const decisionInfo = getDecisionInfo();

  // Get risk level color
  const getRiskLevelColor = (score) => {
    if (score >= 80) return palette.red.base;
    if (score >= 60) return palette.yellow.base;
    if (score >= 40) return palette.blue.base;
    return palette.green.base;
  };


  return (
    <Card style={{ 
      marginBottom: spacing[3], 
      background: `linear-gradient(135deg, ${palette.blue.light3}, ${palette.white})`,
      border: `1px solid ${palette.blue.light2}`,
      ...style 
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: spacing[3],
        paddingBottom: spacing[2],
        borderBottom: `1px solid ${palette.gray.light2}`
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2] }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: palette.blue.base,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            {loading ? (
              <Spinner size={16} />
            ) : (
              <Icon glyph="Laptop" fill={palette.white} size={16} />
            )}
          </div>
          <H3 style={{ margin: 0, color: palette.blue.dark2 }}>
            Stage 2 - AI Analysis
          </H3>
        </div>
        
        <Badge 
          variant={decisionInfo.variant}
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: spacing[1],
            fontSize: '12px'
          }}
        >
          {loading ? (
            <Spinner size={12} />
          ) : (
            <Icon glyph={decisionInfo.icon} size={12} />
          )}
          {decisionInfo.text}
        </Badge>
      </div>

      {/* AI Analysis Results */}
      <div style={{ padding: spacing[3] }}>
        {loading ? (
          // Loading State
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column',
            alignItems: 'center',
            padding: spacing[4],
            gap: spacing[2]
          }}>
            <Spinner size={24} />
            <Body style={{ color: palette.gray.dark1, textAlign: 'center' }}>
              AI analyzing transaction patterns, similar cases, and risk factors...
            </Body>
          </div>
        ) : (
          <>
            {/* AI Risk Score */}
            <div style={{ marginBottom: spacing[3] }}>
              <Body weight="medium" style={{ 
                fontSize: '14px', 
                color: palette.gray.dark1, 
                marginBottom: spacing[2] 
              }}>
                AI Risk Assessment
              </Body>
              
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: spacing[3],
                padding: spacing[2],
                background: palette.gray.light3,
                borderRadius: '6px'
              }}>
                <div style={{ textAlign: 'center' }}>
                  <Body weight="medium" style={{ 
                    fontSize: '12px', 
                    color: palette.gray.dark1, 
                    marginBottom: spacing[1]/2 
                  }}>
                    AI Risk Score
                  </Body>
                  <Body weight="bold" style={{ 
                    fontSize: '24px', 
                    color: getRiskLevelColor(risk_score)
                  }}>
                    {risk_score !== null && risk_score !== undefined ? 
                      risk_score.toFixed(1) : 'N/A'}
                  </Body>
                </div>
              </div>
            </div>


            {/* Decision Description */}
            {decisionInfo.description && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: spacing[1],
                padding: spacing[2],
                background: `${decisionInfo.color}15`, // 15% opacity
                borderRadius: '6px',
                border: `1px solid ${decisionInfo.color}30`,
                marginBottom: spacing[2]
              }}>
                <Icon 
                  glyph="InfoWithCircle" 
                  size={14} 
                  fill={decisionInfo.color} 
                />
                <Body style={{ 
                  fontSize: '12px', 
                  color: decisionInfo.color,
                  margin: 0,
                  fontWeight: 500
                }}>
                  {decisionInfo.description}
                </Body>
              </div>
            )}

            {/* Thread ID */}
            {thread_id && (
              <div style={{ 
                marginTop: spacing[2],
                paddingTop: spacing[2],
                borderTop: `1px solid ${palette.gray.light2}`
              }}>
                <Badge 
                  variant="lightgray" 
                  style={{ 
                    fontFamily: 'monospace', 
                    fontSize: '9px',
                    maxWidth: '120px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}
                  title={`Thread ID: ${thread_id}`}
                >
                  {thread_id}
                </Badge>
              </div>
            )}
          </>
        )}
      </div>
    </Card>
  );
};

export default Stage2ResultCard;
