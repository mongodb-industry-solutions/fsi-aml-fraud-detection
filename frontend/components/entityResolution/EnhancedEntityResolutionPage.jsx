"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Card from '@leafygreen-ui/card';
import Button from '@leafygreen-ui/button';
import { H1, H2, H3, Body, BackLink } from '@leafygreen-ui/typography';
import { Tabs, Tab } from '@leafygreen-ui/tabs';
import Icon from '@leafygreen-ui/icon';
import Banner from '@leafygreen-ui/banner';
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
   * Handle network analysis initiation
   */
  const handleNetworkAnalysis = async () => {
    if (!workflowData.searchResults) return;
    
    setIsLoading(true);
    try {
      const networkAnalysis = await enhancedEntityResolutionAPI.performNetworkAnalysis(
        workflowData.entityInput,
        workflowData.searchResults.topMatches
      );
      
      setWorkflowData(prev => ({
        ...prev,
        networkAnalysis
      }));
      
      setCurrentStep(2);
      
    } catch (error) {
      console.error('Network analysis failed:', error);
      setError(error.message || 'Failed to analyze network');
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
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <Button
                variant="primary"
                size="large"
                onClick={handleNetworkAnalysis}
                disabled={isLoading || !workflowData.searchResults}
                leftGlyph={<Icon glyph="Diagram3" />}
              >
                Analyze Network
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Network Analysis */}
        {currentStep === 2 && workflowData.networkAnalysis && (
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: spacing[4] }}>
            <NetworkVisualizationCard
              networkData={workflowData.networkAnalysis.networkData}
              centerEntityId={workflowData.entityInput?.id}
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[3] }}>
              <Card style={{ padding: spacing[4] }}>
                <H3 style={{ marginBottom: spacing[3] }}>Network Risk Analysis</H3>
                <Body>
                  Network analysis complete. Ready for entity classification.
                </Body>
                <Button
                  variant="primary"
                  onClick={handleClassification}
                  disabled={isLoading}
                  style={{ marginTop: spacing[3] }}
                >
                  Proceed to Classification
                </Button>
              </Card>
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