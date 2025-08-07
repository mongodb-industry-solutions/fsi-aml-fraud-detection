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
import Top3ComparisonPanel from './enhanced/Top3ComparisonPanel';
import LLMClassificationPanel from './enhanced/LLMClassificationPanel';
import ProcessingStepsIndicator from './enhanced/ProcessingStepsIndicator';

// Services
import { enhancedEntityResolutionAPI } from '@/lib/enhanced-entity-resolution-api';
import amlAPI from '@/lib/aml-api';

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
  const [currentProcess, setCurrentProcess] = useState(null); // 'networkAnalysis' | 'llmClassification' | null

  // Workflow steps
  const WORKFLOW_STEPS = [
    { id: 0, title: 'Entity Input', description: 'Capture entity information' },
    { id: 1, title: 'Parallel Search', description: 'Atlas & Vector search analysis' },
    { id: 2, title: 'Network Analysis', description: 'Graph traversal & risk assessment' },
    { id: 3, title: 'AI Classification', description: 'Risk categorization & recommendations' },
    { id: 4, title: 'Case Investigation', description: 'Deep analysis & final decisions' }
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
   * Handle enhanced network analysis for top 3 hybrid search results
   * 
   * This method implements the enhanced workflow that analyzes the network risks
   * of the TOP 3 entities from hybrid search results for comprehensive comparison.
   */
  const handleNetworkAnalysis = async () => {
    if (!workflowData.searchResults?.hybridResults?.length) {
      setError('No hybrid search results available for network analysis');
      return;
    }
    
    const top3Results = workflowData.searchResults.hybridResults.slice(0, 3);
    
    if (top3Results.length === 0) {
      setError('No hybrid search results available for network analysis');
      return;
    }
    
    setIsLoading(true);
    setCurrentProcess('networkAnalysis');
    try {
      console.log(`🎯 Starting enhanced network analysis for top ${top3Results.length} hybrid search results`);
      
      // Analyze each of the top 3 entities in parallel
      const networkAnalysisPromises = top3Results.map(async (entity, index) => {
        console.log(`🔍 Analyzing entity ${index + 1}: ${entity.entityId || entity.entity_id}`);
        
        // Get relationship network for this entity (depth 2) - same as entity detail page
        const relationshipNetwork = await amlAPI.getEntityNetwork(
          entity.entityId || entity.entity_id,
          2, // maxDepth = 2
          0.5, // minStrength
          false, // includeInactive
          100, // maxNodes
          null // relationshipTypeFilter
        );
        
        // Get transaction network for this entity (depth 1)
        const transactionNetwork = await amlAPI.getEntityTransactionNetwork(
          entity.entityId || entity.entity_id,
          1 // maxDepth = 1
        );
        
        return {
          entityId: entity.entityId || entity.entity_id,
          entityName: entity.name || entity.entity_name || entity.entityId,
          entityRank: index + 1,
          hybridScore: entity.hybridScore,
          textContribution: entity.text_contribution_percent,
          vectorContribution: entity.vector_contribution_percent,
          baseEntity: entity,
          relationshipNetwork,
          transactionNetwork,
          // Extract key risk metrics using correct response structure
          overallRiskScore: entity.riskAssessment?.overall?.score || 0,
          riskLevel: entity.riskAssessment?.overall?.level || 'unknown',
          // Network risk from statistics (same as NetworkStatisticsPanel)
          networkRiskScore: relationshipNetwork?.statistics?.basic_metrics?.avg_risk_score || 
                           relationshipNetwork?.riskAnalysis?.networkRiskScore || 
                           0,
          // Transaction risk - may not have specific risk scores, using total volume as proxy
          transactionRiskScore: transactionNetwork?.statistics?.avg_risk_score ||
                               transactionNetwork?.riskScore ||
                               (transactionNetwork?.totalTransactions > 100 ? 45 : 
                                transactionNetwork?.totalTransactions > 50 ? 30 : 
                                transactionNetwork?.totalTransactions > 10 ? 15 : 5) || 0
        };
      });
      
      const top3NetworkAnalyses = await Promise.all(networkAnalysisPromises);
      
      // Store the comprehensive analysis data for all top 3 entities
      const enhancedNetworkAnalysis = {
        success: true,
        analysisType: 'top_3_comparison',
        entitiesAnalyzed: top3NetworkAnalyses.length,
        entityAnalyses: top3NetworkAnalyses,
        // Keep compatibility with existing components by using first entity as primary
        targetEntity: {
          entity_id: top3NetworkAnalyses[0]?.entityId,
          entity_name: top3NetworkAnalyses[0]?.entityName
        },
        networkData: top3NetworkAnalyses[0]?.relationshipNetwork || { nodes: [], edges: [] },
        centralityMetrics: top3NetworkAnalyses[0]?.riskAnalysis?.centralityAnalysis || {},
        transactionAnalysis: {
          entities_analyzed: top3NetworkAnalyses.length,
          total_transaction_risk_score: top3NetworkAnalyses.reduce((sum, entity) => sum + (entity.transactionRiskScore || 0), 0),
          avg_transaction_risk_score: top3NetworkAnalyses.reduce((sum, entity) => sum + (entity.transactionRiskScore || 0), 0) / top3NetworkAnalyses.length
        }
      };
      
      setWorkflowData(prev => ({
        ...prev,
        networkAnalysis: enhancedNetworkAnalysis
      }));
      
      setCurrentStep(2);
      
      console.log(`✅ Enhanced network analysis completed for ${top3NetworkAnalyses.length} entities:`, 
        top3NetworkAnalyses.map(e => e.entityName).join(', '));
      
    } catch (error) {
      console.error('❌ Enhanced network analysis failed:', error);
      setError(error.message || 'Failed to analyze network risks for hybrid search result');
    } finally {
      setIsLoading(false);
      setCurrentProcess(null);
    }
  };

  /**
   * Handle LLM-powered entity classification
   */
  const handleClassification = async () => {
    if (!workflowData.searchResults || !workflowData.networkAnalysis) {
      setError('Search results and network analysis are required for LLM classification');
      return;
    }
    
    setIsLoading(true);
    setCurrentProcess('llmClassification');
    try {
      console.log('🧠 Starting LLM-powered entity classification...');
      
      // Use the new LLM classification API
      const classification = await amlAPI.classifyEntity(
        workflowData, // Complete workflow data
        'claude-3-sonnet', // Model preference
        'comprehensive' // Analysis depth
      );
      
      if (!classification.success) {
        throw new Error(classification.error?.error_message || 'LLM classification failed');
      }
      
      setWorkflowData(prev => ({
        ...prev,
        classification
      }));
      
      setCurrentStep(3);
      
      console.log('✅ LLM classification completed successfully:', {
        riskScore: classification.result?.risk_score,
        recommendedAction: classification.result?.recommended_action,
        confidenceScore: classification.result?.confidence_score
      });
      
    } catch (error) {
      console.error('❌ LLM classification failed:', error);
      setError(error.message || 'Failed to classify entity using LLM analysis');
    } finally {
      setIsLoading(false);
      setCurrentProcess(null);
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
    setCurrentProcess(null);
  };

  return (
    <div style={{ padding: spacing[4], maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header Section */}
      <div style={{ marginBottom: spacing[4] }}>

        
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
              Entity Resolution
            </H1>
            <Body style={{ color: palette.gray.dark1, marginTop: spacing[1] }}>
              Next-generation entity onboarding with parallel search, network analysis, and risk classification
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
                    ? `Will analyze network risks for top ${Math.min(3, workflowData.searchResults.hybridResults.length)} hybrid search results with comprehensive comparison`
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

        {/* Step 2: Top 3 Entity Network Analysis */}
        {currentStep === 2 && workflowData.networkAnalysis && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[4] }}>
            {/* Top 3 Comparison Panel */}
            <Top3ComparisonPanel networkAnalysis={workflowData.networkAnalysis} />
            
            {/* Next Steps Card */}
            <Card style={{ padding: spacing[4], textAlign: 'center' }}>
              <H3 style={{ marginBottom: spacing[3] }}>Analysis Complete</H3>
              <Body style={{ marginBottom: spacing[3] }}>
                Comprehensive network analysis completed for top {workflowData.networkAnalysis.entitiesAnalyzed || 3} entities. 
                Ready to proceed with entity classification.
              </Body>
              <Button
                variant="primary"
                size="large"
                onClick={handleClassification}
                disabled={isLoading}
                leftGlyph={<Icon glyph="Bulb" />}
              >
                AI-Powered Classification
              </Button>
            </Card>
          </div>
        )}

        {/* Step 3: LLM-Powered Classification */}
        {currentStep === 3 && workflowData.classification && (
          <LLMClassificationPanel
            classification={workflowData.classification}
            workflowData={workflowData}
            onProceedToInvestigation={handleDeepInvestigation}
          />
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

      {/* Processing Steps Overlay */}
      {isLoading && currentProcess && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <ProcessingStepsIndicator
            processType={currentProcess}
            isVisible={true}
            title={currentProcess === 'networkAnalysis' 
              ? '🔍 Analyzing Entity Networks'
              : '🧠 AI-Powered Risk Classification'
            }
            onComplete={(totalTime) => {
              console.log(`${currentProcess} completed in ${totalTime}ms`);
            }}
          />
        </div>
      )}

      {/* Fallback Loading Overlay (for processes without step indicators) */}
      {isLoading && !currentProcess && (
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