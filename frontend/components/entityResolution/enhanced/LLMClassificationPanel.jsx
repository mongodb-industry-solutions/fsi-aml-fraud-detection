/**
 * LLM Classification Panel - AI-powered entity risk classification display
 * 
 * Displays comprehensive LLM-powered entity classification results including:
 * - Risk assessment and scoring
 * - AML/KYC compliance analysis
 * - Network positioning and influence
 * - Data quality assessment  
 * - Action recommendations
 * - Confidence analysis
 */

"use client";

import React, { useState } from 'react';
import Card from '@leafygreen-ui/card';
import Button from '@leafygreen-ui/button';
import { H2, H3, Body, Label, Subtitle } from '@leafygreen-ui/typography';
import { Tabs, Tab } from '@leafygreen-ui/tabs';
import Badge from '@leafygreen-ui/badge';
import Icon from '@leafygreen-ui/icon';
import { Code } from '@leafygreen-ui/code';
import Banner from '@leafygreen-ui/banner';
import { palette } from '@leafygreen-ui/palette';
import { spacing } from '@leafygreen-ui/tokens';


/**
 * Risk assessment visualization component
 */
function RiskScoreDisplay({ riskScore, riskLevel, riskRationale }) {
  const getRiskColor = (score) => {
    if (score >= 80) return palette.red.base;
    if (score >= 60) return palette.yellow.base;
    if (score >= 40) return palette.gray.base;
    return palette.green.base;
  };

  const getRiskVariant = (level) => {
    switch (level?.toLowerCase()) {
      case 'critical': return 'red';
      case 'high': return 'red';
      case 'medium': return 'yellow';
      case 'low': return 'green';
      default: return 'lightgray';
    }
  };

  return (
    <div style={{
      padding: spacing[4],
      backgroundColor: palette.gray.light3,
      borderRadius: '12px',
      border: `2px solid ${getRiskColor(riskScore)}`,
      marginBottom: spacing[3]
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing[2]
      }}>
        <H3 style={{ margin: 0, color: getRiskColor(riskScore) }}>
          Risk Assessment
        </H3>
        <div style={{
          fontSize: '32px',
          fontWeight: 'bold',
          color: getRiskColor(riskScore)
        }}>
          {riskScore}/100
        </div>
      </div>
      
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: spacing[2], 
        marginBottom: spacing[3] 
      }}>
        <Badge variant={getRiskVariant(riskLevel)} size="large">
          {riskLevel?.toUpperCase()} RISK
        </Badge>
        <Icon 
          glyph={riskScore >= 75 ? "Warning" : riskScore >= 40 ? "InfoWithCircle" : "Checkmark"}
          style={{ color: getRiskColor(riskScore) }}
        />
      </div>

      <Body style={{ 
        fontSize: '13px', 
        lineHeight: 1.4,
        color: palette.gray.dark2 
      }}>
        {riskRationale}
      </Body>
    </div>
  );
}


/**
 * AML/KYC compliance flags display
 */
function AMLKYCFlagsCard({ amlKycFlags }) {
  const flagsToDisplay = [
    { key: 'sanctions_risk', label: 'Sanctions Risk', icon: 'Warning' },
    { key: 'pep_risk', label: 'PEP Risk', icon: 'Person' },
    { key: 'high_volume_transactions', label: 'High Volume Transactions', icon: 'Charts' },
    { key: 'suspicious_network_connections', label: 'Suspicious Network', icon: 'Connect' },
    { key: 'geographic_risk', label: 'Geographic Risk', icon: 'Globe' },
    { key: 'identity_verification_gaps', label: 'Identity Gaps', icon: 'IdCard' }
  ];

  const activeFlagsCount = flagsToDisplay.filter(flag => amlKycFlags?.[flag.key]).length;

  return (
    <Card style={{ padding: spacing[3] }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing[3]
      }}>
        <H3 style={{ fontSize: '14px', margin: 0 }}>AML/KYC Compliance</H3>
        <Badge variant={activeFlagsCount > 0 ? "red" : "green"}>
          {activeFlagsCount} Flag{activeFlagsCount !== 1 ? 's' : ''}
        </Badge>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: spacing[2]
      }}>
        {flagsToDisplay.map(flag => (
          <div key={flag.key} style={{
            display: 'flex',
            alignItems: 'center',
            gap: spacing[2],
            padding: spacing[2],
            backgroundColor: amlKycFlags?.[flag.key] 
              ? palette.red.light3 
              : palette.green.light3,
            borderRadius: '6px',
            border: `1px solid ${amlKycFlags?.[flag.key] 
              ? palette.red.light1 
              : palette.green.light1}`
          }}>
            <Icon 
              glyph={amlKycFlags?.[flag.key] ? "Warning" : "Checkmark"}
              style={{ 
                color: amlKycFlags?.[flag.key] 
                  ? palette.red.base 
                  : palette.green.base 
              }}
            />
            <Body style={{ 
              fontSize: '11px',
              color: amlKycFlags?.[flag.key] 
                ? palette.red.dark2 
                : palette.green.dark2
            }}>
              {flag.label}
            </Body>
          </div>
        ))}
      </div>

      {/* Additional flags */}
      {amlKycFlags?.additional_flags?.length > 0 && (
        <div style={{ marginTop: spacing[3] }}>
          <Label style={{ fontSize: '12px', marginBottom: spacing[2] }}>
            Additional Flags:
          </Label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: spacing[1] }}>
            {amlKycFlags.additional_flags.map((flag, index) => (
              <Badge key={index} variant="yellow" size="small">
                {flag}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}


/**
 * Network positioning analysis display
 */
function NetworkPositioningCard({ networkClassification, networkInfluenceScore, networkRiskIndicators }) {
  const getNetworkIcon = (classification) => {
    switch (classification?.toLowerCase()) {
      case 'hub': return 'Diagram3';
      case 'bridge': return 'Connect';
      case 'leaf': return 'Person';
      case 'isolated': return 'Disconnect';
      default: return 'Diagram2';
    }
  };

  const getInfluenceColor = (score) => {
    if (score >= 75) return palette.red.base;
    if (score >= 50) return palette.yellow.base;
    if (score >= 25) return palette.blue.base;
    return palette.green.base;
  };

  return (
    <Card style={{ padding: spacing[3] }}>
      <H3 style={{ fontSize: '14px', margin: `0 0 ${spacing[3]} 0`, display: 'flex', alignItems: 'center', gap: spacing[2] }}>
        <Icon glyph={getNetworkIcon(networkClassification)} style={{ color: palette.blue.base }} />
        Network Positioning
      </H3>

      <div style={{ marginBottom: spacing[3] }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: spacing[2] 
        }}>
          <Label style={{ fontSize: '12px' }}>Classification:</Label>
          <Badge variant="blue">
            {networkClassification?.toUpperCase() || 'UNKNOWN'}
          </Badge>
        </div>
        
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: spacing[2] 
        }}>
          <Label style={{ fontSize: '12px' }}>Influence Score:</Label>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: spacing[2]
          }}>
            <div style={{
              fontSize: '18px',
              fontWeight: '600',
              color: getInfluenceColor(networkInfluenceScore)
            }}>
              {networkInfluenceScore}/100
            </div>
          </div>
        </div>
      </div>

      {networkRiskIndicators?.length > 0 && (
        <div>
          <Label style={{ fontSize: '12px', marginBottom: spacing[2] }}>
            Risk Indicators:
          </Label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[1] }}>
            {networkRiskIndicators.map((indicator, index) => (
              <div key={index} style={{
                padding: spacing[2],
                backgroundColor: palette.yellow.light3,
                borderRadius: '4px',
                fontSize: '11px',
                color: palette.yellow.dark2
              }}>
                • {indicator}
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}


/**
 * Data quality assessment display
 */
function DataQualityCard({ dataQualityAssessment }) {
  const getQualityColor = (score) => {
    if (score >= 85) return palette.green.base;
    if (score >= 70) return palette.yellow.base;
    return palette.red.base;
  };

  const qualityMetrics = [
    { key: 'completeness_score', label: 'Completeness', icon: 'Checkmark' },
    { key: 'reliability_score', label: 'Reliability', icon: 'Verified' },
    { key: 'consistency_score', label: 'Consistency', icon: 'Edit' }
  ];

  return (
    <Card style={{ padding: spacing[3] }}>
      <H3 style={{ fontSize: '14px', margin: `0 0 ${spacing[3]} 0` }}>Data Quality Assessment</H3>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: spacing[3],
        marginBottom: spacing[3]
      }}>
        {qualityMetrics.map(metric => {
          const score = dataQualityAssessment?.[metric.key] || 0;
          return (
            <div key={metric.key} style={{ textAlign: 'center' }}>
              <div style={{
                fontSize: '24px',
                fontWeight: 'bold',
                color: getQualityColor(score),
                marginBottom: spacing[1]
              }}>
                {score.toFixed(0)}%
              </div>
              <Label style={{ fontSize: '11px' }}>
                {metric.label}
              </Label>
            </div>
          );
        })}
      </div>

      {/* Missing fields and conflicts */}
      {(dataQualityAssessment?.missing_critical_fields?.length > 0 || 
        dataQualityAssessment?.data_conflicts?.length > 0) && (
        <div style={{
          padding: spacing[2],
          backgroundColor: palette.yellow.light3,
          borderRadius: '6px',
          border: `1px solid ${palette.yellow.light1}`
        }}>
          {dataQualityAssessment.missing_critical_fields?.length > 0 && (
            <div style={{ marginBottom: spacing[2] }}>
              <Label style={{ fontSize: '11px', color: palette.yellow.dark2 }}>
                Missing Critical Fields:
              </Label>
              <Body style={{ fontSize: '10px', color: palette.yellow.dark2 }}>
                {dataQualityAssessment.missing_critical_fields.join(', ')}
              </Body>
            </div>
          )}
          
          {dataQualityAssessment.data_conflicts?.length > 0 && (
            <div>
              <Label style={{ fontSize: '11px', color: palette.yellow.dark2 }}>
                Data Conflicts:
              </Label>
              <Body style={{ fontSize: '10px', color: palette.yellow.dark2 }}>
                {dataQualityAssessment.data_conflicts.join(', ')}
              </Body>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}


/**
 * Action recommendations display
 */
function ActionRecommendationCard({ recommendedAction, actionRationale, actionConditions }) {
  const getActionVariant = (action) => {
    switch (action?.toLowerCase()) {
      case 'approve': return 'green';
      case 'review': return 'yellow';
      case 'reject': return 'red';
      case 'investigate': return 'blue';
      default: return 'lightgray';
    }
  };

  const getActionIcon = (action) => {
    switch (action?.toLowerCase()) {
      case 'approve': return 'Checkmark';
      case 'review': return 'Eye';
      case 'reject': return 'X';
      case 'investigate': return 'MagnifyingGlass';
      default: return 'InfoWithCircle';
    }
  };

  return (
    <Card style={{ padding: spacing[3] }}>
      <H3 style={{ fontSize: '14px', margin: `0 0 ${spacing[3]} 0` }}>Recommended Action</H3>

      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: spacing[3],
        marginBottom: spacing[3],
        padding: spacing[3],
        backgroundColor: palette.gray.light3,
        borderRadius: '8px'
      }}>
        <Icon 
          glyph={getActionIcon(recommendedAction)}
          size={32}
          style={{ 
            color: getActionVariant(recommendedAction) === 'green' ? palette.green.base :
                   getActionVariant(recommendedAction) === 'red' ? palette.red.base :
                   getActionVariant(recommendedAction) === 'yellow' ? palette.yellow.base :
                   getActionVariant(recommendedAction) === 'blue' ? palette.blue.base :
                   palette.gray.base
          }}
        />
        <div>
          <Badge variant={getActionVariant(recommendedAction)} size="large">
            {recommendedAction?.toUpperCase()}
          </Badge>
          <Body style={{ 
            fontSize: '12px', 
            color: palette.gray.dark1,
            marginTop: spacing[1]
          }}>
            Primary recommendation based on risk analysis
          </Body>
        </div>
      </div>

      <div style={{ marginBottom: spacing[3] }}>
        <Label style={{ fontSize: '12px', marginBottom: spacing[2] }}>
          Rationale:
        </Label>
        <Body style={{ 
          fontSize: '11px', 
          lineHeight: 1.4,
          color: palette.gray.dark2,
          padding: spacing[2],
          backgroundColor: palette.gray.light3,
          borderRadius: '4px'
        }}>
          {actionRationale}
        </Body>
      </div>

      {actionConditions?.length > 0 && (
        <div>
          <Label style={{ fontSize: '12px', marginBottom: spacing[2] }}>
            Conditions/Restrictions:
          </Label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[1] }}>
            {actionConditions.map((condition, index) => (
              <div key={index} style={{
                padding: spacing[2],
                backgroundColor: palette.blue.light3,
                borderRadius: '4px',
                fontSize: '11px',
                color: palette.blue.dark2
              }}>
                • {condition}
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}


/**
 * Main LLM Classification Panel component
 */
function LLMClassificationPanel({ classification, workflowData, onProceedToInvestigation }) {
  const [selectedTab, setSelectedTab] = useState(0);

  if (!classification) {
    return (
      <Card style={{ padding: spacing[4] }}>
        <div style={{ textAlign: 'center', color: palette.gray.base }}>
          <Icon glyph="InfoWithCircle" size={48} style={{ marginBottom: spacing[2] }} />
          <Body>No classification data available</Body>
        </div>
      </Card>
    );
  }

  const result = classification.result || classification;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[4] }}>
      
      {/* Header with LLM Analysis Summary */}
      <Card style={{ 
        padding: spacing[4], 
        backgroundColor: palette.blue.light3,
        border: `1px solid ${palette.blue.light1}`
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: spacing[3] }}>
          <Icon glyph="Bulb" size={32} style={{ color: palette.blue.base }} />
          <div>
            <H2 style={{ margin: 0, color: palette.blue.dark2 }}>
              AI-Powered Entity Classification
            </H2>
            <Body style={{ color: palette.blue.dark1, marginTop: spacing[1] }}>
              Comprehensive risk analysis using {result.classification_model || 'LLM'} • 
              Confidence: {result.confidence_score?.toFixed(1)}% • 
            </Body>
          </div>
        </div>
      </Card>

      {/* Main Risk Assessment */}
      <RiskScoreDisplay 
        riskScore={result.risk_score}
        riskLevel={result.overall_risk_level}
        riskRationale={result.risk_rationale}
      />

      {/* Classification Results Tabs */}
      <Card style={{ padding: spacing[4] }}>
        <Tabs selected={selectedTab} setSelected={setSelectedTab}>
          
          <Tab name="Risk & Action">
            <div style={{ marginTop: spacing[3] }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: spacing[4]
              }}>
                <ActionRecommendationCard
                  recommendedAction={result.recommended_action}
                  actionRationale={result.action_rationale}
                  actionConditions={result.action_conditions}
                />
                
                <Card style={{ padding: spacing[3] }}>
                  <H3 style={{ fontSize: '14px', margin: `0 0 ${spacing[3]} 0` }}>Risk Factor Analysis</H3>
                  
                  {result.risk_factor_analysis?.primary_risk_factors?.length > 0 && (
                    <div style={{ marginBottom: spacing[3] }}>
                      <Label style={{ fontSize: '12px', marginBottom: spacing[2] }}>
                        Primary Risk Factors:
                      </Label>
                      {result.risk_factor_analysis.primary_risk_factors.map((factor, index) => (
                        <div key={index} style={{
                          padding: spacing[2],
                          backgroundColor: palette.red.light3,
                          borderRadius: '4px',
                          fontSize: '11px',
                          color: palette.red.dark2,
                          marginBottom: spacing[1]
                        }}>
                          • {factor}
                        </div>
                      ))}
                    </div>
                  )}

                  {result.risk_factor_analysis?.mitigating_factors?.length > 0 && (
                    <div>
                      <Label style={{ fontSize: '12px', marginBottom: spacing[2] }}>
                        Mitigating Factors:
                      </Label>
                      {result.risk_factor_analysis.mitigating_factors.map((factor, index) => (
                        <div key={index} style={{
                          padding: spacing[2],
                          backgroundColor: palette.green.light3,
                          borderRadius: '4px',
                          fontSize: '11px',
                          color: palette.green.dark2,
                          marginBottom: spacing[1]
                        }}>
                          • {factor}
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              </div>
            </div>
          </Tab>

          <Tab name="Compliance & Network">
            <div style={{ marginTop: spacing[3] }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: spacing[4]
              }}>
                <AMLKYCFlagsCard amlKycFlags={result.aml_kyc_flags} />
                <NetworkPositioningCard
                  networkClassification={result.network_classification}
                  networkInfluenceScore={result.network_influence_score}
                  networkRiskIndicators={result.network_risk_indicators}
                />
              </div>
            </div>
          </Tab>

          <Tab name="Data Quality">
            <div style={{ marginTop: spacing[3] }}>
              <DataQualityCard dataQualityAssessment={result.data_quality_assessment} />
              
              {result.entity_type_confidence !== undefined && (
                <Card style={{ padding: spacing[3], marginTop: spacing[3] }}>
                  <H3 style={{ fontSize: '14px', margin: `0 0 ${spacing[3]} 0` }}>Entity Type Validation</H3>
                  
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    marginBottom: spacing[2] 
                  }}>
                    <Label style={{ fontSize: '12px' }}>Confidence:</Label>
                    <Badge variant={result.entity_type_confidence >= 0.8 ? "green" : 
                                  result.entity_type_confidence >= 0.6 ? "yellow" : "red"}>
                      {(result.entity_type_confidence * 100).toFixed(1)}%
                    </Badge>
                  </div>

                  <Body style={{ 
                    fontSize: '11px', 
                    color: palette.gray.dark2,
                    padding: spacing[2],
                    backgroundColor: palette.gray.light3,
                    borderRadius: '4px'
                  }}>
                    {result.entity_type_validation}
                  </Body>
                </Card>
              )}
            </div>
          </Tab>

          <Tab name="LLM Analysis">
            <div style={{ marginTop: spacing[3] }}>
              <Card style={{ padding: spacing[3] }}>
                <H3 style={{ fontSize: '14px', margin: `0 0 ${spacing[3]} 0` }}>Full LLM Reasoning</H3>
                
                <div style={{
                  marginBottom: spacing[3],
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                  gap: spacing[2]
                }}>
                  <div>
                    <Label style={{ fontSize: '11px' }}>Model Used:</Label>
                    <Body style={{ fontSize: '10px', fontFamily: 'monospace' }}>
                      {result.classification_model || 'Unknown'}
                    </Body>
                  </div>
                  <div>
                    <Label style={{ fontSize: '11px' }}>Confidence Level:</Label>
                    <Badge variant={result.confidence_level === 'high' ? 'green' : 
                                  result.confidence_level === 'medium' ? 'yellow' : 'red'}>
                      {result.confidence_level?.toUpperCase()}
                    </Badge>
                  </div>
                </div>

                <Code 
                  language="none"
                  showLineNumbers={false}
                  style={{ 
                    maxHeight: '400px',
                    fontSize: '11px'
                  }}
                >
                  {result.llm_analysis}
                </Code>
              </Card>
            </div>
          </Tab>

        </Tabs>
      </Card>

      {/* Next Steps */}
      <Card style={{ padding: spacing[4], textAlign: 'center' }}>
        <H3 style={{ marginBottom: spacing[3] }}>Classification Complete</H3>
        
        <Body style={{ marginBottom: spacing[3] }}>
          {result.recommended_action === 'investigate' 
            ? 'Deep investigation recommended based on risk analysis. Proceed to generate comprehensive case file.'
            : result.recommended_action === 'review'
            ? 'Manual analyst review recommended. Case can be assigned to compliance team.'
            : result.recommended_action === 'approve' 
            ? 'Entity classification suggests approval with standard monitoring.'
            : 'Entity classification suggests rejection based on identified risk factors.'
          }
        </Body>

        {result.requires_review && (
          <Banner variant="warning" style={{ marginBottom: spacing[3] }}>
            This classification requires human oversight due to high risk indicators or low confidence.
          </Banner>
        )}

        <div style={{ display: 'flex', gap: spacing[3], justifyContent: 'center' }}>
          {result.recommended_action === 'investigate' && onProceedToInvestigation && (
            <Button
              variant="primary"
              size="large"
              onClick={onProceedToInvestigation}
              leftGlyph={<Icon glyph="MagnifyingGlass" />}
            >
              Proceed to Investigation
            </Button>
          )}
          
          <Button variant="default">
            Export Classification Report
          </Button>
        </div>
      </Card>

    </div>
  );
}

export default LLMClassificationPanel;