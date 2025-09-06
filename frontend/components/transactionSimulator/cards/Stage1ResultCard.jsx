"use client";

import React from 'react';
import Card from '@leafygreen-ui/card';
import Badge from '@leafygreen-ui/badge';
import Icon from '@leafygreen-ui/icon';
import { Body, H3 } from '@leafygreen-ui/typography';
import { palette } from '@leafygreen-ui/palette';
import { spacing } from '@leafygreen-ui/tokens';

/**
 * Stage 1 Result Card Component
 * 
 * Displays Stage 1 analysis results (Rules + ML) with clear separation
 * from Stage 2 results. This card is always visible and never gets overwritten.
 */
const Stage1ResultCard = ({ 
  stage1Data = {}, 
  loading = false,
  style = {}
}) => {
  const {
    rules_score,
    ml_score, 
    combined_score,
    rule_flags = [],
    needs_stage2 = false,
    processing_time_ms
  } = stage1Data;

  // Calculate stage 1 decision based on combined score and flags
  const getStage1Decision = () => {
    if (loading) return { text: 'ANALYZING...', variant: 'blue', icon: 'Refresh' };
    
    if (needs_stage2) {
      return { 
        text: 'PROCEED TO STAGE 2', 
        variant: 'yellow', 
        icon: 'ArrowRight',
        description: 'Score requires AI analysis'
      };
    }
    
    // Stage 1 final decisions (when Stage 2 not needed)
    if (combined_score < 25) {
      return { 
        text: 'APPROVE', 
        variant: 'green', 
        icon: 'Checkmark',
        description: 'Low risk - automatic approval'
      };
    } else if (combined_score > 85) {
      return { 
        text: 'BLOCK', 
        variant: 'red', 
        icon: 'X',
        description: 'High risk - automatic block'
      };
    }
    
    return { 
      text: 'COMPLETED', 
      variant: 'gray', 
      icon: 'Checkmark',
      description: 'Analysis complete'
    };
  };

  const decision = getStage1Decision();

  // Risk Score Component
  const RiskScore = ({ label, value, color, loading: scoreLoading = false }) => (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column',
      alignItems: 'center',
      padding: spacing[2],
      background: palette.gray.light3,
      borderRadius: '6px',
      minWidth: '80px'
    }}>
      <Body weight="medium" style={{ 
        fontSize: '12px', 
        color: palette.gray.dark1, 
        marginBottom: spacing[1]/2,
        textAlign: 'center'
      }}>
        {label}
      </Body>
      <Body weight="bold" style={{ 
        fontSize: '16px', 
        color: scoreLoading ? palette.gray.base : color,
        textAlign: 'center'
      }}>
        {scoreLoading ? (
          <div className="animate-pulse">--</div>
        ) : (
          value !== null && value !== undefined ? value.toFixed(1) : 'N/A'
        )}
      </Body>
    </div>
  );

  return (
    <Card style={{ 
      marginBottom: spacing[3], 
      background: `linear-gradient(135deg, ${palette.green.light3}, ${palette.white})`,
      border: `1px solid ${palette.green.light2}`,
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
            background: palette.green.base,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Icon glyph="Save" fill={palette.white} size={16} />
          </div>
          <H3 style={{ margin: 0, color: palette.green.dark2 }}>
            Stage 1 - Rules & ML Analysis
          </H3>
        </div>
        
        <Badge 
          variant={decision.variant}
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: spacing[1],
            fontSize: '12px'
          }}
        >
          <Icon glyph={decision.icon} size={12} />
          {decision.text}
        </Badge>
      </div>

      {/* Risk Scores Grid */}
      <div style={{ padding: spacing[3] }}>
        <Body weight="medium" style={{ 
          fontSize: '14px', 
          color: palette.gray.dark1, 
          marginBottom: spacing[2] 
        }}>
          Risk Assessment Scores
        </Body>
        
        <div style={{
          display: 'flex',
          gap: spacing[2],
          marginBottom: spacing[3],
          flexWrap: 'wrap'
        }}>
          <RiskScore 
            label="Rules Score" 
            value={rules_score} 
            color={palette.blue.dark2}
            loading={loading}
          />
          <RiskScore 
            label="ML Score" 
            value={ml_score} 
            color={palette.purple.dark2}
            loading={loading}
          />
          <RiskScore 
            label="Combined Score" 
            value={combined_score} 
            color={palette.green.dark2}
            loading={loading}
          />
        </div>

        {/* Risk Flags */}
        {rule_flags && rule_flags.length > 0 && (
          <div style={{ marginBottom: spacing[2] }}>
            <Body weight="medium" style={{ 
              fontSize: '12px', 
              color: palette.gray.dark1, 
              marginBottom: spacing[1] 
            }}>
              Risk Flags Detected
            </Body>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: spacing[1] }}>
              {rule_flags.map((flag, index) => (
                <Badge 
                  key={index}
                  variant="yellow" 
                  style={{ 
                    fontSize: '10px',
                    textTransform: 'capitalize'
                  }}
                >
                  {flag.replace(/_/g, ' ')}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Decision Description */}
        {decision.description && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: spacing[1],
            padding: spacing[2],
            background: palette.gray.light3,
            borderRadius: '6px',
            marginTop: spacing[2]
          }}>
            <Icon 
              glyph="InfoWithCircle" 
              size={14} 
              fill={palette.gray.dark1} 
            />
            <Body style={{ 
              fontSize: '12px', 
              color: palette.gray.dark1,
              margin: 0
            }}>
              {decision.description}
            </Body>
          </div>
        )}

      </div>
    </Card>
  );
};

export default Stage1ResultCard;
