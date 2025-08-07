/**
 * Processing Steps Indicator - Animated behind-the-scenes workflow visualization
 * 
 * Shows users what's happening during LLM classification and network analysis
 * with step-by-step progress indicators and smooth animations.
 */

"use client";

import React, { useState, useEffect } from 'react';
import Card from '@leafygreen-ui/card';
import { H3, Body, Label } from '@leafygreen-ui/typography';
import Badge from '@leafygreen-ui/badge';
import Icon from '@leafygreen-ui/icon';
import { Spinner } from '@leafygreen-ui/loading-indicator';
import { palette } from '@leafygreen-ui/palette';
import { spacing } from '@leafygreen-ui/tokens';

/**
 * Processing steps configuration for different workflow types
 */
const PROCESSING_STEPS = {
  networkAnalysis: [
    {
      id: 'entity_selection',
      title: 'Entity Selection',
      description: 'Selecting top 3 hybrid search matches for comprehensive analysis',
      icon: 'Checkmark',
      estimatedTime: 500
    },
    {
      id: 'relationship_networks',
      title: 'Relationship Networks',
      description: 'Fetching relationship networks with depth 2 traversal',
      icon: 'Connect',
      estimatedTime: 2000
    },
    {
      id: 'transaction_networks',
      title: 'Transaction Networks', 
      description: 'Analyzing transaction patterns with depth 1 analysis',
      icon: 'Charts',
      estimatedTime: 1500
    },
    {
      id: 'risk_calculation',
      title: 'Risk Assessment',
      description: 'Calculating network and transaction risk scores using MongoDB aggregations',
      icon: 'Warning',
      estimatedTime: 1000
    },
    {
      id: 'data_transformation',
      title: 'Data Preparation',
      description: 'Preparing network visualization data for interactive display',
      icon: 'Diagram3',
      estimatedTime: 800
    }
  ],
  
  llmClassification: [
    {
      id: 'data_preparation',
      title: 'Data Preparation',
      description: 'Structuring complete workflow data for AI analysis',
      icon: 'Database',
      estimatedTime: 300
    },
    {
      id: 'prompt_building',
      title: 'Prompt Engineering',
      description: 'Building comprehensive analysis prompt with entity, search, and network data',
      icon: 'Edit',
      estimatedTime: 500
    },
    {
      id: 'bedrock_connection',
      title: 'AWS Bedrock Connection',
      description: 'Connecting to AWS Bedrock Claude-3 Sonnet model',
      icon: 'Cloud',
      estimatedTime: 800
    },
    {
      id: 'ai_analysis',
      title: 'AI Risk Analysis',
      description: 'AI analyzing AML/KYC compliance, network positioning, and data quality',
      icon: 'Bulb',
      estimatedTime: 25000  // This is the longest step
    },
    {
      id: 'response_processing',
      title: 'Response Processing',
      description: 'Processing AI recommendations and risk assessment results',
      icon: 'Checkmark',
      estimatedTime: 600
    },
    {
      id: 'validation',
      title: 'Validation & Structuring',
      description: 'Validating classification results and preparing for display',
      icon: 'Verified',
      estimatedTime: 400
    }
  ]
};

/**
 * Individual step component with animation
 */
function ProcessingStep({ step, status, isActive, completedAt }) {
  const getStepIcon = () => {
    if (status === 'completed') return 'Checkmark';
    if (status === 'active') return 'Refresh';
    return step.icon;
  };

  const getStepColor = () => {
    if (status === 'completed') return palette.green.base;
    if (status === 'active') return palette.blue.base;
    return palette.gray.light1;
  };

  const getStepBadgeVariant = () => {
    if (status === 'completed') return 'green';
    if (status === 'active') return 'blue';
    return 'lightgray';
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'flex-start',
      gap: spacing[3],
      padding: spacing[3],
      marginBottom: spacing[2],
      backgroundColor: isActive ? palette.blue.light3 : 
                       status === 'completed' ? palette.green.light3 : 
                       palette.gray.light3,
      borderRadius: '8px',
      border: `2px solid ${isActive ? palette.blue.light1 : 
                           status === 'completed' ? palette.green.light1 : 
                           palette.gray.light2}`,
      transition: 'all 0.3s ease',
      transform: isActive ? 'scale(1.02)' : 'scale(1)',
      opacity: status === 'pending' ? 0.6 : 1
    }}>
      
      {/* Step Icon */}
      <div style={{
        width: '40px',
        height: '40px',
        borderRadius: '50%',
        backgroundColor: getStepColor(),
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        transition: 'all 0.3s ease'
      }}>
        {status === 'active' ? (
          <Spinner size="small" />
        ) : (
          <Icon 
            glyph={getStepIcon()} 
            style={{ color: 'white' }} 
            size={18}
          />
        )}
      </div>

      {/* Step Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: spacing[1]
        }}>
          <H3 style={{ 
            margin: 0, 
            fontSize: '14px',
            color: isActive ? palette.blue.dark2 : 
                   status === 'completed' ? palette.green.dark2 : 
                   palette.gray.dark1
          }}>
            {step.title}
          </H3>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2] }}>
            <Badge variant={getStepBadgeVariant()} size="small">
              {status === 'completed' ? 'Done' : 
               status === 'active' ? 'Processing' : 
               'Pending'}
            </Badge>
            {completedAt && (
              <Label style={{ fontSize: '10px', color: palette.gray.base }}>
                {completedAt}ms
              </Label>
            )}
          </div>
        </div>
        
        <Body style={{ 
          fontSize: '11px', 
          lineHeight: 1.4,
          color: isActive ? palette.blue.dark1 : 
                 status === 'completed' ? palette.green.dark1 : 
                 palette.gray.dark1,
          margin: 0
        }}>
          {step.description}
        </Body>
      </div>
    </div>
  );
}

/**
 * Main Processing Steps Indicator component
 */
function ProcessingStepsIndicator({ 
  processType = 'llmClassification', // or 'networkAnalysis'
  isVisible = true,
  onComplete = null,
  title = null
}) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [stepStatuses, setStepStatuses] = useState({});
  const [startTime, setStartTime] = useState(null);
  const [stepStartTimes, setStepStartTimes] = useState({});

  const steps = PROCESSING_STEPS[processType] || [];
  
  const defaultTitles = {
    networkAnalysis: '🔍 Analyzing Entity Networks',
    llmClassification: '🧠 AI-Powered Risk Classification'
  };

  useEffect(() => {
    if (!isVisible) return;

    const startTime = Date.now();
    setStartTime(startTime);
    setCurrentStepIndex(0);
    setStepStatuses({});
    setStepStartTimes({});

    const processSteps = async () => {
      for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        const stepStartTime = Date.now();
        
        // Mark current step as active
        setCurrentStepIndex(i);
        setStepStartTimes(prev => ({ ...prev, [step.id]: stepStartTime }));
        setStepStatuses(prev => ({ ...prev, [step.id]: 'active' }));
        
        // Wait for estimated time
        await new Promise(resolve => setTimeout(resolve, step.estimatedTime));
        
        // Mark step as completed
        const stepEndTime = Date.now();
        const stepDuration = stepEndTime - stepStartTime;
        
        setStepStatuses(prev => ({ 
          ...prev, 
          [step.id]: 'completed'
        }));
        
        // Store completion time for display
        setStepStartTimes(prev => ({ 
          ...prev, 
          [`${step.id}_duration`]: stepDuration 
        }));
      }
      
      // All steps completed
      if (onComplete) {
        const totalTime = Date.now() - startTime;
        setTimeout(() => onComplete(totalTime), 500);
      }
    };

    processSteps();
  }, [isVisible, processType, steps.length, onComplete]);

  if (!isVisible) return null;

  const getStepStatus = (stepIndex, stepId) => {
    if (stepStatuses[stepId]) return stepStatuses[stepId];
    if (stepIndex < currentStepIndex) return 'completed';
    if (stepIndex === currentStepIndex) return 'active';
    return 'pending';
  };

  const getProgressPercentage = () => {
    const completed = Object.values(stepStatuses).filter(status => status === 'completed').length;
    return Math.round((completed / steps.length) * 100);
  };

  return (
    <Card style={{ 
      padding: spacing[4],
      margin: spacing[4],
      border: `2px solid ${palette.blue.light1}`,
      backgroundColor: palette.blue.light3,
      maxWidth: '600px',
      width: '100%'
    }}>
      
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: spacing[4]
      }}>
        <H3 style={{ 
          margin: 0, 
          color: palette.blue.dark2,
          display: 'flex',
          alignItems: 'center',
          gap: spacing[2]
        }}>
          <div style={{
            animation: 'spin 2s linear infinite'
          }}>
            <Icon glyph="Refresh" style={{ color: palette.blue.base }} />
          </div>
          {title || defaultTitles[processType]}
        </H3>
        
        <Badge variant="blue">
          {getProgressPercentage()}% Complete
        </Badge>
      </div>

      {/* Progress Bar */}
      <div style={{
        width: '100%',
        height: '8px',
        backgroundColor: palette.gray.light2,
        borderRadius: '4px',
        marginBottom: spacing[4],
        overflow: 'hidden'
      }}>
        <div style={{
          height: '100%',
          width: `${getProgressPercentage()}%`,
          backgroundColor: palette.blue.base,
          borderRadius: '4px',
          transition: 'width 0.5s ease'
        }} />
      </div>

      {/* Processing Steps */}
      <div style={{ 
        maxHeight: '400px',
        overflowY: 'auto'
      }}>
        {steps.map((step, index) => (
          <ProcessingStep
            key={step.id}
            step={step}
            status={getStepStatus(index, step.id)}
            isActive={index === currentStepIndex}
            completedAt={stepStartTimes[`${step.id}_duration`]}
          />
        ))}
      </div>

      {/* Footer */}
      <div style={{ 
        marginTop: spacing[3],
        padding: spacing[3],
        backgroundColor: palette.blue.light2,
        borderRadius: '6px',
        textAlign: 'center'
      }}>
        <Body style={{ 
          fontSize: '11px', 
          color: palette.blue.dark1,
          margin: 0
        }}>
          {processType === 'llmClassification' 
            ? 'AI is analyzing your entity data using advanced language models...'
            : 'Building comprehensive network analysis from MongoDB aggregations...'
          }
        </Body>
      </div>

      {/* Add CSS animation */}
      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </Card>
  );
}

export default ProcessingStepsIndicator;