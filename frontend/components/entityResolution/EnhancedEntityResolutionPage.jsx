"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Card from '@leafygreen-ui/card';
import Button from '@leafygreen-ui/button';
import { H1, H2, H3, Body, BackLink } from '@leafygreen-ui/typography';
import { Tabs, Tab } from '@leafygreen-ui/tabs';
import Icon from '@leafygreen-ui/icon';
import Banner from '@leafygreen-ui/banner';
import Badge from '@leafygreen-ui/badge';
import Callout from '@leafygreen-ui/callout';
import { Spinner } from '@leafygreen-ui/loading-indicator';
import { palette } from '@leafygreen-ui/palette';
import { spacing } from '@leafygreen-ui/tokens';

// Enhanced Components
import ModernOnboardingForm from './enhanced/ModernOnboardingForm';
import ParallelSearchInterface from './enhanced/ParallelSearchInterface';
// Intelligence Analysis Panel removed to create more space
import NetworkVisualizationCard from './enhanced/NetworkVisualizationCard';
import RiskClassificationDisplay from './enhanced/RiskClassificationDisplay';
import DeepInvestigationWorkbench from './enhanced/DeepInvestigationWorkbench';

// Services
import { enhancedEntityResolutionAPI } from '@/lib/enhanced-entity-resolution-api';

/**
 * Enhanced Entity Resolution Page
 * 
 * Next-generation entity onboarding with modern UI inspired by entity detail page
 * with network analysis and risk classification.
 */
function EnhancedEntityResolutionPage() {
  const router = useRouter();
  
  // Core workflow state
  const [currentStep, setCurrentStep] = useState(0);
  const [workflowData, setWorkflowData] = useState({
    entityInput: null,
    searchResults: null,
    networkAnalysis: null,
    classification: null,
    investigation: null
  });
  
  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedTab, setSelectedTab] = useState(0);

  // Workflow steps
  const WORKFLOW_STEPS = [
    { id: 0, title: 'Entity Input', description: 'Capture entity information' },
    { id: 1, title: 'Parallel Search', description: 'Atlas & Vector search analysis' },
    { id: 2, title: 'Network Analysis', description: 'Graph traversal & risk assessment' },
    { id: 3, title: 'Classification', description: 'Risk categorization & recommendations' },
    { id: 4, title: 'Investigation', description: 'Deep analysis & final decisions' }
  ];

  /**
   * Handle entity input submission and initiate parallel search
   */
  const handleEntitySubmission = async (entityData) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Update workflow data
      setWorkflowData(prev => ({
        ...prev,
        entityInput: entityData
      }));
      
      // Initiate parallel search
      const searchResults = await enhancedEntityResolutionAPI.performParallelSearch(entityData);
      
      setWorkflowData(prev => ({
        ...prev,
        searchResults
      }));
      
      setCurrentStep(1);
      
    } catch (error) {
      console.error('Entity submission failed:', error);
      setError(error.message || 'Failed to process entity information');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle enhanced network analysis for first hybrid search result
   * 
   * This method implements the enhanced workflow that analyzes the network risks
   * of the TOP-RANKED entity from hybrid search results, not the input entity.
   */
  const handleNetworkAnalysis = async () => {
    if (!workflowData.searchResults?.hybridResults?.length) {
      setError('No hybrid search results available for network analysis');
      return;
    }
    
    setIsLoading(true);
    try {
      console.log('🎯 Starting enhanced network analysis for first hybrid search result');
      
      // Enhanced: Analyze the FIRST hybrid search result (highest ranked match)
      const hybridNetworkRiskAnalysis = await enhancedEntityResolutionAPI.analyzeHybridNetworkRisk({
        hybrid_results: workflowData.searchResults.hybridResults,
        analysis_config: {
          include_transaction_network: true,
          detect_suspicious_patterns: true,
          max_relationship_depth: 3,
          risk_threshold: 0.6
        }
      });
      
      // Transform the enhanced analysis data for the existing UI components
      const enhancedNetworkAnalysis = {
        success: hybridNetworkRiskAnalysis.success,
        targetEntity: hybridNetworkRiskAnalysis.targetEntity,
        networkData: hybridNetworkRiskAnalysis.networkData || {
          nodes: [],
          edges: [],
          metadata: {
            centerEntityId: hybridNetworkRiskAnalysis.targetEntity.entity_id,
            analysisType: 'hybrid_network_risk_analysis'
          },
          statistics: {}
        },
        comprehensiveRiskAnalysis: hybridNetworkRiskAnalysis.comprehensiveRiskAnalysis,
        centralityMetrics: hybridNetworkRiskAnalysis.centralityAnalysis?.centrality_metrics || {},
        transactionAnalysis: hybridNetworkRiskAnalysis.transactionAnalysis,  // Add transaction analysis
        riskPropagation: {
          networkRiskScore: hybridNetworkRiskAnalysis.comprehensiveRiskAnalysis?.overall_risk_score || 0,
          riskLevel: hybridNetworkRiskAnalysis.comprehensiveRiskAnalysis?.risk_level || 'unknown',
          riskBreakdown: hybridNetworkRiskAnalysis.comprehensiveRiskAnalysis?.risk_breakdown || {},
          highRiskConnections: hybridNetworkRiskAnalysis.problematicRelationships?.length || 0,
          riskClusters: hybridNetworkRiskAnalysis.suspiciousPatterns?.hub_entities || []
        },
        networkStatistics: hybridNetworkRiskAnalysis.networkData?.statistics || {
          basic_metrics: {
            total_nodes: hybridNetworkRiskAnalysis.networkData?.nodes?.length || 0,
            total_edges: hybridNetworkRiskAnalysis.networkData?.edges?.length || 0,
            avg_risk_score: null,
            network_density: null
          },
          analysisDepth: hybridNetworkRiskAnalysis.analysisMetadata.analysis_depth,
          totalConnections: hybridNetworkRiskAnalysis.analysisMetadata.total_network_entities_analyzed,
          riskIndicators: hybridNetworkRiskAnalysis.problematicRelationships.length
        },
        hubEntities: [],
        riskClusters: [],
        // Enhanced data specific to hybrid network analysis
        suspiciousPatterns: hybridNetworkRiskAnalysis.suspiciousPatterns,
        problematicRelationships: hybridNetworkRiskAnalysis.problematicRelationships,
        recommendations: hybridNetworkRiskAnalysis.recommendations,
        analysisMetadata: hybridNetworkRiskAnalysis.analysisMetadata
      };
      
      setWorkflowData(prev => ({
        ...prev,
        networkAnalysis: enhancedNetworkAnalysis
      }));
      
      setCurrentStep(2);
      
      console.log('✅ Enhanced network analysis completed for:', hybridNetworkRiskAnalysis.targetEntity.entity_name);
      
    } catch (error) {
      console.error('❌ Enhanced network analysis failed:', error);
      setError(error.message || 'Failed to analyze network risks for hybrid search result');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle entity classification
   */
  const handleClassification = async () => {
    if (!workflowData.searchResults) return;
    
    setIsLoading(true);
    try {
      const classification = await enhancedEntityResolutionAPI.classifyEntity(
        workflowData.entityInput,
        workflowData.searchResults,
        null,  // Intelligence analysis removed
        workflowData.networkAnalysis
      );
      
      setWorkflowData(prev => ({
        ...prev,
        classification
      }));
      
      setCurrentStep(3);
      
    } catch (error) {
      console.error('Classification failed:', error);
      setError(error.message || 'Failed to classify entity');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle deep investigation
   */
  const handleDeepInvestigation = async () => {
    setIsLoading(true);
    try {
      const investigation = await enhancedEntityResolutionAPI.performDeepInvestigation(
        workflowData
      );
      
      setWorkflowData(prev => ({
        ...prev,
        investigation
      }));
      
      setCurrentStep(4);
      
    } catch (error) {
      console.error('Deep investigation failed:', error);
      setError(error.message || 'Failed to perform deep investigation');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Reset workflow to start over
   */
  const handleReset = () => {
    setCurrentStep(0);
    setWorkflowData({
      entityInput: null,
      searchResults: null,
      networkAnalysis: null,
      classification: null,
      investigation: null
    });
    setError(null);
  };

  return (
    <div style={{ padding: spacing[4], maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header Section */}
      <div style={{ marginBottom: spacing[4] }}>
        <BackLink onClick={() => router.push('/entity-resolution')}>
          Back to Entity Resolution
        </BackLink>
        
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginTop: spacing[3],
          marginBottom: spacing[2]
        }}>
          <div>
            <H1 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: spacing[2] }}>
              <Icon glyph="Diagram3" style={{ color: palette.blue.base }} />
              Enhanced Entity Resolution
            </H1>
            <Body style={{ color: palette.gray.dark1, marginTop: spacing[1] }}>
              Next-generation onboarding with parallel search, network analysis, and risk classification
            </Body>
          </div>
          
          {currentStep > 0 && (
            <Button
              variant="default"
              size="small"
              leftGlyph={<Icon glyph="Refresh" />}
              onClick={handleReset}
            >
              Start Over
            </Button>
          )}
        </div>

        {/* Progress Indicator */}
        <Card style={{ padding: spacing[3], backgroundColor: palette.blue.light3 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: spacing[4] }}>
            {WORKFLOW_STEPS.map((step, index) => (
              <div key={step.id} style={{ display: 'flex', alignItems: 'center', gap: spacing[2] }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  backgroundColor: index <= currentStep ? palette.blue.base : palette.gray.light2,
                  color: index <= currentStep ? 'white' : palette.gray.base,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '14px',
                  fontWeight: '600'
                }}>
                  {index < currentStep ? '✓' : index + 1}
                </div>
                <div>
                  <Body weight="medium" style={{ 
                    color: index <= currentStep ? palette.blue.dark2 : palette.gray.base,
                    fontSize: '12px'
                  }}>
                    {step.title}
                  </Body>
                  <Body style={{ 
                    color: palette.gray.dark1,
                    fontSize: '10px'
                  }}>
                    {step.description}
                  </Body>
                </div>
                {index < WORKFLOW_STEPS.length - 1 && (
                  <div style={{
                    width: '24px',
                    height: '2px',
                    backgroundColor: index < currentStep ? palette.blue.base : palette.gray.light2,
                    marginLeft: spacing[2]
                  }} />
                )}
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Error Banner */}
      {error && (
        <Banner variant="danger" style={{ marginBottom: spacing[4] }}>
          {error}
        </Banner>
      )}

      {/* Main Workflow Content */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[4] }}>
        
        {/* Step 0: Entity Input */}
        {currentStep === 0 && (
          <ModernOnboardingForm
            onSubmit={handleEntitySubmission}
            isLoading={isLoading}
          />
        )}

        {/* Step 1: Parallel Search */}
        {currentStep === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[4] }}>
            <ParallelSearchInterface
              searchResults={workflowData.searchResults}
              originalEntityData={workflowData.entityInput}
              isLoading={isLoading}
            />
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: spacing[2] }}>
              {/* MongoDB Single Database Advantage */}
              <Callout variant="tip" style={{ marginBottom: spacing[3], width: '100%' }}>
                <strong>Single Database, Multiple Search Types:</strong> Atlas
                Search, Vector Search, and Hybrid Search all run within the same
                MongoDB cluster - eliminating data movement and reducing operational
                complexity that comes with Elasticsearch + Vector DB architectures.
              </Callout>
              
              <div style={{ textAlign: 'center', marginBottom: spacing[2] }}>
                <Body weight="medium" style={{ color: palette.blue.dark2 }}>
                  Ready for Enhanced Network Risk Analysis
                </Body>
                <Body style={{ fontSize: '12px', color: palette.gray.dark1, marginTop: spacing[1] }}>
                  {workflowData.searchResults?.hybridResults?.length > 0 
                    ? `Will analyze network risks for "${workflowData.searchResults.hybridResults[0]?.name || 'top match'}" (highest ranked result)`
                    : 'Waiting for search results...'
                  }
                </Body>
              </div>
              <Button
                variant="primary"
                size="large"
                onClick={handleNetworkAnalysis}
                disabled={isLoading || !workflowData.searchResults?.hybridResults?.length}
                leftGlyph={<Icon glyph="Diagram3" />}
              >
                Analyze Network Risks
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Enhanced Network Risk Analysis */}
        {currentStep === 2 && workflowData.networkAnalysis && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[4] }}>
            {/* Enhanced Analysis Header */}
            <Card style={{ padding: spacing[4], backgroundColor: palette.blue.light3 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: spacing[3] }}>
                <Icon glyph="Diagram3" size={32} style={{ color: palette.blue.base }} />
                <div>
                  <H3 style={{ margin: 0, color: palette.blue.dark2 }}>
                    Enhanced Network Risk Analysis Complete
                  </H3>
                  <Body style={{ color: palette.blue.dark1, marginTop: spacing[1] }}>
                    Analyzed network risks for: <strong>{workflowData.networkAnalysis.targetEntity?.entity_name || 'Target Entity'}</strong> (top hybrid search result)
                  </Body>
                  {workflowData.networkAnalysis.comprehensiveRiskAnalysis && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2], marginTop: spacing[2] }}>
                      <Body style={{ fontSize: '14px', fontWeight: '600' }}>
                        Risk Level: 
                      </Body>
                      <Badge 
                        variant={
                          workflowData.networkAnalysis.comprehensiveRiskAnalysis.risk_level === 'critical' ? 'red' :
                          workflowData.networkAnalysis.comprehensiveRiskAnalysis.risk_level === 'high' ? 'yellow' :
                          workflowData.networkAnalysis.comprehensiveRiskAnalysis.risk_level === 'medium' ? 'lightgray' : 'green'
                        }
                      >
                        {workflowData.networkAnalysis.comprehensiveRiskAnalysis.risk_level?.toUpperCase() || 'UNKNOWN'} 
                        ({workflowData.networkAnalysis.comprehensiveRiskAnalysis.overall_risk_score?.toFixed(1) || '0.0'}/100)
                      </Badge>
                    </div>
                  )}
                </div>
              </div>
            </Card>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: spacing[4] }}>
              <NetworkVisualizationCard
                networkData={workflowData.networkAnalysis.networkData}
                centerEntityId={workflowData.networkAnalysis.targetEntity?.entity_id || workflowData.networkAnalysis.networkData?.metadata?.centerEntityId}
                networkStatistics={workflowData.networkAnalysis.networkStatistics}
                riskPropagation={workflowData.networkAnalysis.riskPropagation}
                centralityMetrics={workflowData.networkAnalysis.centralityMetrics}
              />
              <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[3] }}>
                {/* Risk Analysis Summary */}
                {workflowData.networkAnalysis.comprehensiveRiskAnalysis && (
                  <Card style={{ padding: spacing[4] }}>
                    <H3 style={{ marginBottom: spacing[3] }}>Risk Analysis Summary</H3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[2] }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Body style={{ fontSize: '12px' }}>Base Entity Risk:</Body>
                        <Body weight="medium">{workflowData.networkAnalysis.comprehensiveRiskAnalysis.risk_breakdown?.base_entity_risk?.toFixed(1) || '0.0'}%</Body>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Body style={{ fontSize: '12px' }}>Network Risk:</Body>
                        <Body weight="medium">{workflowData.networkAnalysis.comprehensiveRiskAnalysis.risk_breakdown?.relationship_network_risk?.toFixed(1) || '0.0'}%</Body>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Body style={{ fontSize: '12px' }}>Pattern Risk:</Body>
                        <Body weight="medium">{workflowData.networkAnalysis.comprehensiveRiskAnalysis.risk_breakdown?.suspicious_pattern_risk?.toFixed(1) || '0.0'}%</Body>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Body style={{ fontSize: '12px' }}>Centrality Risk:</Body>
                        <Body weight="medium">{workflowData.networkAnalysis.comprehensiveRiskAnalysis.risk_breakdown?.centrality_influence_risk?.toFixed(1) || '0.0'}%</Body>
                      </div>
                    </div>
                  </Card>
                )}

                {/* Transaction Analysis */}
                {workflowData.networkAnalysis.transactionAnalysis && (
                  <Card style={{ padding: spacing[4] }}>
                    <H3 style={{ marginBottom: spacing[3] }}>Transaction Analysis</H3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[2] }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Body style={{ fontSize: '12px' }}>Transaction Risk Score:</Body>
                        <Body weight="medium">{workflowData.networkAnalysis.transactionAnalysis.transaction_risk_score || '0'}/100</Body>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Body style={{ fontSize: '12px' }}>High Risk Transactions:</Body>
                        <Body weight="medium">{workflowData.networkAnalysis.transactionAnalysis.high_risk_transactions || '0'}</Body>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Body style={{ fontSize: '12px' }}>Total Transactions:</Body>
                        <Body weight="medium">{workflowData.networkAnalysis.transactionAnalysis.total_transactions || '0'}</Body>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Body style={{ fontSize: '12px' }}>Transaction Volume:</Body>
                        <Body weight="medium">${workflowData.networkAnalysis.transactionAnalysis.transaction_volume?.toLocaleString() || '0'}</Body>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Body style={{ fontSize: '12px' }}>Avg Transaction Amount:</Body>
                        <Body weight="medium">${workflowData.networkAnalysis.transactionAnalysis.avg_transaction_amount?.toLocaleString() || '0'}</Body>
                      </div>
                      {workflowData.networkAnalysis.transactionAnalysis.analysis_note && (
                        <div style={{ padding: spacing[2], backgroundColor: palette.blue.light3, borderRadius: '4px', marginTop: spacing[1] }}>
                          <Body style={{ fontSize: '11px', color: palette.blue.dark1 }}>
                            {workflowData.networkAnalysis.transactionAnalysis.analysis_note}
                          </Body>
                        </div>
                      )}
                    </div>
                  </Card>
                )}

                {/* Recommendations */}
                {workflowData.networkAnalysis.recommendations && workflowData.networkAnalysis.recommendations.length > 0 && (
                  <Card style={{ padding: spacing[4] }}>
                    <H3 style={{ marginBottom: spacing[3] }}>Recommendations</H3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[2] }}>
                      {workflowData.networkAnalysis.recommendations.slice(0, 2).map((rec, index) => (
                        <div key={index} style={{ padding: spacing[2], backgroundColor: palette.gray.light3, borderRadius: '4px' }}>
                          <Body weight="medium" style={{ fontSize: '12px', color: rec.priority === 'critical' ? palette.red.base : palette.blue.dark1 }}>
                            {rec.title}
                          </Body>
                          <Body style={{ fontSize: '11px', color: palette.gray.dark1, marginTop: spacing[1] }}>
                            {rec.description}
                          </Body>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}

                <Card style={{ padding: spacing[4] }}>
                  <H3 style={{ marginBottom: spacing[3] }}>Next Steps</H3>
                  <Body style={{ marginBottom: spacing[3] }}>
                    Enhanced network risk analysis complete. Ready for entity classification.
                  </Body>
                  <Button
                    variant="primary"
                    onClick={handleClassification}
                    disabled={isLoading}
                    style={{ width: '100%' }}
                  >
                    Proceed to Classification
                  </Button>
                </Card>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Classification */}
        {currentStep === 3 && workflowData.classification && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: spacing[4] }}>
            <RiskClassificationDisplay
              classification={workflowData.classification}
              entityData={workflowData.entityInput}
            />
            <Card style={{ padding: spacing[4] }}>
              <H3 style={{ marginBottom: spacing[3] }}>Next Steps</H3>
              <Body style={{ marginBottom: spacing[3] }}>
                Entity classification is complete. Would you like to perform a deep investigation?
              </Body>
              <div style={{ display: 'flex', gap: spacing[2] }}>
                <Button
                  variant="primary"
                  onClick={handleDeepInvestigation}
                  disabled={isLoading}
                >
                  Deep Investigation
                </Button>
                <Button
                  variant="default"
                  onClick={handleReset}
                >
                  Complete & Reset
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* Step 4: Deep Investigation */}
        {currentStep === 4 && workflowData.investigation && (
          <DeepInvestigationWorkbench
            investigation={workflowData.investigation}
            workflowData={workflowData}
            onReset={handleReset}
          />
        )}

      </div>

      {/* Loading Overlay */}
      {isLoading && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <Card style={{ 
            padding: spacing[4], 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center',
            gap: spacing[3]
          }}>
            <Spinner size="large" />
            <Body>Processing entity analysis...</Body>
          </Card>
        </div>
      )}
    </div>
  );
}

export default EnhancedEntityResolutionPage;