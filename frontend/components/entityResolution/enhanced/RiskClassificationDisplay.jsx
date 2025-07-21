"use client";

import React, { useState } from 'react';
import Card from '@leafygreen-ui/card';
import Button from '@leafygreen-ui/button';
import { H2, H3, Body, Label } from '@leafygreen-ui/typography';
import Icon from '@leafygreen-ui/icon';
import Badge from '@leafygreen-ui/badge';
import Banner from '@leafygreen-ui/banner';
import { palette } from '@leafygreen-ui/palette';
import { spacing } from '@leafygreen-ui/tokens';

/**
 * Risk Classification Display
 * 
 * Shows the final entity classification (SAFE/DUPLICATE/RISKY) with
 * detailed reasoning, risk factors, and actionable recommendations.
 */
function RiskClassificationDisplay({ classification, entityData }) {
  const [expandedSection, setExpandedSection] = useState(null);

  if (!classification) {
    return (
      <Card style={{ padding: spacing[4] }}>
        <div style={{ textAlign: 'center', color: palette.gray.base, padding: spacing[4] }}>
          <Icon glyph="DocumentMagnifyingGlass" size={48} style={{ marginBottom: spacing[2] }} />
          <Body>Classification results will appear here</Body>
        </div>
      </Card>
    );
  }

  const {
    classification: classificationResult,
    confidence,
    riskScore,
    riskFactors = [],
    duplicateProbability,
    suspiciousIndicators = [],
    reasoning,
    recommendations = [],
    nextSteps = []
  } = classification;

  /**
   * Get classification colors and icons
   */
  const getClassificationDetails = () => {
    switch (classificationResult?.toLowerCase()) {
      case 'safe':
        return {
          color: palette.green.base,
          backgroundColor: palette.green.light3,
          borderColor: palette.green.light1,
          icon: 'CheckmarkWithCircle',
          title: 'SAFE',
          description: 'Entity appears legitimate with low risk indicators'
        };
      case 'duplicate':
        return {
          color: palette.yellow.dark2,
          backgroundColor: palette.yellow.light3,
          borderColor: palette.yellow.light1,
          icon: 'Copy',
          title: 'POTENTIAL DUPLICATE',
          description: 'High similarity to existing records - merge decision required'
        };
      case 'risky':
        return {
          color: palette.red.base,
          backgroundColor: palette.red.light3,
          borderColor: palette.red.light1,
          icon: 'Warning',
          title: 'HIGH RISK',
          description: 'Multiple risk indicators detected - requires investigation'
        };
      default:
        return {
          color: palette.gray.base,
          backgroundColor: palette.gray.light3,
          borderColor: palette.gray.light1,
          icon: 'QuestionMarkWithCircle',
          title: 'UNKNOWN',
          description: 'Classification could not be determined'
        };
    }
  };

  const classDetails = getClassificationDetails();

  /**
   * Render risk factors section
   */
  const renderRiskFactors = () => {
    if (!riskFactors || riskFactors.length === 0) {
      return (
        <div style={{ textAlign: 'center', padding: spacing[3] }}>
          <Icon glyph="Shield" style={{ color: palette.green.base, marginBottom: spacing[1] }} />
          <Body style={{ color: palette.gray.base }}>No risk factors identified</Body>
        </div>
      );
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[2] }}>
        {riskFactors.map((factor, index) => (
          <Card key={index} style={{ 
            padding: spacing[3],
            border: `1px solid ${factor.severity === 'high' ? palette.red.light1 : 
                                 factor.severity === 'medium' ? palette.yellow.light1 : palette.gray.light2}`,
            backgroundColor: factor.severity === 'high' ? palette.red.light3 : 
                           factor.severity === 'medium' ? palette.yellow.light3 : 'transparent'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2], marginBottom: spacing[1] }}>
                  <Icon 
                    glyph={factor.severity === 'high' ? 'Warning' : 
                           factor.severity === 'medium' ? 'InfoWithCircle' : 'Checkmark'} 
                    style={{ 
                      color: factor.severity === 'high' ? palette.red.base : 
                             factor.severity === 'medium' ? palette.yellow.dark2 : palette.green.base
                    }} 
                    size={16}
                  />
                  <Body weight="medium" style={{ fontSize: '13px' }}>
                    {factor.type || factor.name || 'Risk Factor'}
                  </Body>
                </div>
                <Body style={{ fontSize: '12px', color: palette.gray.dark1, lineHeight: '1.4' }}>
                  {factor.description || 'No description available'}
                </Body>
                {factor.impact && (
                  <Body style={{ fontSize: '11px', color: palette.gray.base, marginTop: spacing[1] }}>
                    Impact: {factor.impact}
                  </Body>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'end', gap: spacing[1] }}>
                <Badge variant={factor.severity === 'high' ? 'red' : 
                              factor.severity === 'medium' ? 'yellow' : 'green'}>
                  {factor.severity || 'low'}
                </Badge>
                {factor.score && (
                  <Body style={{ fontSize: '11px', color: palette.gray.dark1 }}>
                    Score: {factor.score}
                  </Body>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
    );
  };

  /**
   * Render suspicious indicators
   */
  const renderSuspiciousIndicators = () => {
    if (!suspiciousIndicators || suspiciousIndicators.length === 0) {
      return (
        <div style={{ textAlign: 'center', padding: spacing[3] }}>
          <Icon glyph="CheckmarkWithCircle" style={{ color: palette.green.base, marginBottom: spacing[1] }} />
          <Body style={{ color: palette.gray.base }}>No suspicious indicators detected</Body>
        </div>
      );
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[2] }}>
        {suspiciousIndicators.map((indicator, index) => (
          <Card key={index} style={{ 
            padding: spacing[3],
            border: `1px solid ${palette.red.light1}`,
            backgroundColor: palette.red.light3
          }}>
            <div style={{ display: 'flex', gap: spacing[2] }}>
              <Icon glyph="Important" style={{ color: palette.red.base, marginTop: '2px' }} size={16} />
              <div style={{ flex: 1 }}>
                <Body weight="medium" style={{ fontSize: '13px', marginBottom: spacing[1] }}>
                  {indicator.type || 'Suspicious Activity'}
                </Body>
                <Body style={{ fontSize: '12px', color: palette.gray.dark1, lineHeight: '1.4' }}>
                  {indicator.description || indicator}
                </Body>
                {indicator.confidence && (
                  <Body style={{ fontSize: '11px', color: palette.gray.base, marginTop: spacing[1] }}>
                    Confidence: {(indicator.confidence * 100).toFixed(1)}%
                  </Body>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
    );
  };

  /**
   * Render recommendations
   */
  const renderRecommendations = () => {
    const allRecommendations = [...(recommendations || []), ...(nextSteps || [])];
    
    if (allRecommendations.length === 0) {
      return (
        <div style={{ textAlign: 'center', padding: spacing[3] }}>
          <Body style={{ color: palette.gray.base }}>No specific recommendations available</Body>
        </div>
      );
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[2] }}>
        {allRecommendations.map((rec, index) => (
          <Card key={index} style={{ 
            padding: spacing[3],
            border: `1px solid ${palette.blue.light1}`,
            backgroundColor: palette.blue.light3
          }}>
            <div style={{ display: 'flex', gap: spacing[2] }}>
              <Icon glyph="Target" style={{ color: palette.blue.base, marginTop: '2px' }} size={16} />
              <div style={{ flex: 1 }}>
                <Body weight="medium" style={{ fontSize: '13px', marginBottom: spacing[1] }}>
                  {rec.title || rec.action || 'Recommendation'}
                </Body>
                <Body style={{ fontSize: '12px', color: palette.gray.dark1, lineHeight: '1.4' }}>
                  {rec.description || rec.text || rec}
                </Body>
                {rec.priority && (
                  <Badge 
                    variant={rec.priority === 'high' ? 'red' : rec.priority === 'medium' ? 'yellow' : 'green'}
                    style={{ marginTop: spacing[1] }}
                  >
                    {rec.priority} priority
                  </Badge>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[4] }}>
      
      {/* Classification Header */}
      <Card style={{ 
        padding: spacing[4],
        border: `2px solid ${classDetails.borderColor}`,
        backgroundColor: classDetails.backgroundColor
      }}>
        <div style={{ textAlign: 'center' }}>
          <Icon 
            glyph={classDetails.icon} 
            size={48} 
            style={{ color: classDetails.color, marginBottom: spacing[2] }} 
          />
          <H2 style={{ 
            margin: 0, 
            color: classDetails.color,
            marginBottom: spacing[1]
          }}>
            {classDetails.title}
          </H2>
          <Body style={{ 
            color: palette.gray.dark1, 
            fontSize: '14px',
            marginBottom: spacing[3]
          }}>
            {classDetails.description}
          </Body>
          
          {/* Confidence and Score Metrics */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', 
            gap: spacing[3],
            marginTop: spacing[3]
          }}>
            <div style={{ textAlign: 'center' }}>
              <Body weight="medium" style={{ fontSize: '20px' }}>
                {(confidence * 100).toFixed(1)}%
              </Body>
              <Body style={{ fontSize: '12px', color: palette.gray.dark1 }}>
                Confidence
              </Body>
            </div>
            <div style={{ textAlign: 'center' }}>
              <Body weight="medium" style={{ fontSize: '20px' }}>
                {riskScore || 'N/A'}
              </Body>
              <Body style={{ fontSize: '12px', color: palette.gray.dark1 }}>
                Risk Score
              </Body>
            </div>
            {duplicateProbability !== undefined && (
              <div style={{ textAlign: 'center' }}>
                <Body weight="medium" style={{ fontSize: '20px' }}>
                  {(duplicateProbability * 100).toFixed(1)}%
                </Body>
                <Body style={{ fontSize: '12px', color: palette.gray.dark1 }}>
                  Duplicate Probability
                </Body>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Classification Reasoning */}
      {reasoning && (
        <Card style={{ padding: spacing[4] }}>
          <H3 style={{ 
            marginBottom: spacing[3],
            display: 'flex',
            alignItems: 'center',
            gap: spacing[2]
          }}>
            <Icon glyph="Bulb" style={{ color: palette.purple.base }} />
            Classification Reasoning
          </H3>
          <Card style={{ 
            padding: spacing[3],
            backgroundColor: palette.purple.light3,
            border: `1px solid ${palette.purple.light1}`
          }}>
            <Body style={{ fontSize: '13px', lineHeight: '1.5' }}>
              {reasoning}
            </Body>
          </Card>
        </Card>
      )}

      {/* Entity Summary */}
      <Card style={{ padding: spacing[4] }}>
        <H3 style={{ 
          marginBottom: spacing[3],
          display: 'flex',
          alignItems: 'center',
          gap: spacing[2]
        }}>
          <Icon glyph="Person" style={{ color: palette.blue.base }} />
          Entity Summary
        </H3>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
          gap: spacing[3]
        }}>
          <div>
            <Label>Name/Organization</Label>
            <Body weight="medium">{entityData?.fullName || 'N/A'}</Body>
          </div>
          <div>
            <Label>Type</Label>
            <Body weight="medium" style={{ textTransform: 'capitalize' }}>
              {entityData?.entityType || 'Unknown'}
            </Body>
          </div>
          {entityData?.dateOfBirth && (
            <div>
              <Label>Date of Birth</Label>
              <Body weight="medium">{entityData.dateOfBirth}</Body>
            </div>
          )}
          <div>
            <Label>Address</Label>
            <Body weight="medium">{entityData?.address || 'N/A'}</Body>
          </div>
        </div>
      </Card>

      {/* Detailed Analysis Sections */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[3] }}>
        
        {/* Risk Factors */}
        <Card style={{ padding: spacing[4] }}>
          <button
            onClick={() => setExpandedSection(expandedSection === 'risks' ? null : 'risks')}
            style={{
              width: '100%',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
              marginBottom: spacing[3]
            }}
          >
            <H3 style={{ 
              margin: 0,
              display: 'flex',
              alignItems: 'center',
              gap: spacing[2]
            }}>
              <Icon glyph="Warning" style={{ color: palette.red.base }} />
              Risk Factors ({riskFactors.length})
            </H3>
            <Icon 
              glyph={expandedSection === 'risks' ? 'ChevronUp' : 'ChevronDown'} 
              style={{ color: palette.gray.base }} 
            />
          </button>
          {expandedSection === 'risks' && renderRiskFactors()}
        </Card>

        {/* Suspicious Indicators */}
        <Card style={{ padding: spacing[4] }}>
          <button
            onClick={() => setExpandedSection(expandedSection === 'suspicious' ? null : 'suspicious')}
            style={{
              width: '100%',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
              marginBottom: spacing[3]
            }}
          >
            <H3 style={{ 
              margin: 0,
              display: 'flex',
              alignItems: 'center',
              gap: spacing[2]
            }}>
              <Icon glyph="Important" style={{ color: palette.red.base }} />
              Suspicious Indicators ({suspiciousIndicators.length})
            </H3>
            <Icon 
              glyph={expandedSection === 'suspicious' ? 'ChevronUp' : 'ChevronDown'} 
              style={{ color: palette.gray.base }} 
            />
          </button>
          {expandedSection === 'suspicious' && renderSuspiciousIndicators()}
        </Card>

        {/* Recommendations */}
        <Card style={{ padding: spacing[4] }}>
          <button
            onClick={() => setExpandedSection(expandedSection === 'recommendations' ? null : 'recommendations')}
            style={{
              width: '100%',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
              marginBottom: spacing[3]
            }}
          >
            <H3 style={{ 
              margin: 0,
              display: 'flex',
              alignItems: 'center',
              gap: spacing[2]
            }}>
              <Icon glyph="Target" style={{ color: palette.blue.base }} />
              Recommendations & Next Steps
            </H3>
            <Icon 
              glyph={expandedSection === 'recommendations' ? 'ChevronUp' : 'ChevronDown'} 
              style={{ color: palette.gray.base }} 
            />
          </button>
          {expandedSection === 'recommendations' && renderRecommendations()}
        </Card>
      </div>
    </div>
  );
}

export default RiskClassificationDisplay;