/**
 * Streaming Classification Interface - Real-time AI-powered entity classification
 * 
 * Enhanced professional UI with improved visualization and user experience
 * - Clean, modern design consistent with other workflow steps
 * - Real-time streaming with professional progress indicators
 * - Comprehensive risk analysis display
 * - Advanced metrics and detailed insights
 */

"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Card from '@leafygreen-ui/card';
import ExpandableCard from '@leafygreen-ui/expandable-card';
import { H2, H3, Body, Label, Overline } from '@leafygreen-ui/typography';
import Code from '@leafygreen-ui/code';
import Badge from '@leafygreen-ui/badge';
import Button from '@leafygreen-ui/button';
import Icon from '@leafygreen-ui/icon';
import { Spinner } from '@leafygreen-ui/loading-indicator';
import Banner from '@leafygreen-ui/banner';
import { Tabs, Tab } from '@leafygreen-ui/tabs';
import { palette } from '@leafygreen-ui/palette';
import { spacing } from '@leafygreen-ui/tokens';
import { Table, TableBody, TableHead, HeaderRow, HeaderCell, Row, Cell } from '@leafygreen-ui/table';
import Callout from '@leafygreen-ui/callout';

// Import AML API for streaming
import { amlAPI } from '@/lib/aml-api';

/**
 * Format streaming text for better readability
 */
function formatStreamingText(text) {
  if (!text) return '';
  
  // Add proper spacing and formatting
  return text
    .replace(/\n\n/g, '\n\n')  // Preserve double newlines
    .replace(/([.!?])\s*([A-Z])/g, '$1\n\n$2')  // Add spacing after sentences
    .replace(/(\d+\.)\s*/g, '\n$1 ')  // Format numbered lists
    .replace(/•\s*/g, '\n• ')  // Format bullet points
    .replace(/━{3,}/g, '\n' + '─'.repeat(60) + '\n')  // Replace long dashes with consistent dividers
    .replace(/^\s+/gm, '')  // Remove leading whitespace
    .trim();
}

/**
 * Error Boundary Component for Classification Results
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Classification component error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Card style={{ marginBottom: spacing[4] }}>
          <div style={{ padding: spacing[4], textAlign: 'center' }}>
            <Icon glyph="Warning" size="large" style={{ color: palette.red.base, marginBottom: spacing[3] }} />
            <H3 style={{ color: palette.red.dark1, marginBottom: spacing[2] }}>Display Error</H3>
            <Body style={{ color: palette.gray.dark1, marginBottom: spacing[3] }}>
              An error occurred while displaying the classification results.
            </Body>
            <Body style={{ fontSize: '12px', color: palette.gray.dark1, fontFamily: 'monospace', backgroundColor: palette.gray.light2, padding: spacing[2], borderRadius: '4px' }}>
              {this.state.error?.message || 'Unknown error occurred'}
            </Body>
          </div>
        </Card>
      );
    }

    return this.props.children;
  }
}


/**
 * Main streaming classification interface component
 */
function StreamingClassificationInterface({ workflowData, onComplete, onError, onProceedToInvestigation }) {
  // Streaming state management
  const [streamingState, setStreamingState] = useState({
    phase: 'starting', // 'starting' | 'prompt_ready' | 'llm_streaming' | 'processing' | 'complete' | 'error'
    prompt: '',
    streamingText: '',
    finalStreamingText: '', // Preserve final streaming text
    chunkCount: 0,
    currentLength: 0,
    estimatedCompletion: 0,
    finalResult: null,
    error: null,
    totalTime: 0,
    streamingTime: 0,
    processingTime: 0,
    model: '',
    performanceMetrics: null
  });
  
  // UI state
  const [selectedTab, setSelectedTab] = useState(0);
  
  // Refs for auto-scroll and cleanup
  const streamingTextRef = useRef(null);
  const abortControllerRef = useRef(null);
  const eventHandlerRef = useRef(null);
  const streamingStartedRef = useRef(false);
  const workflowDataRef = useRef(workflowData);
  
  // Auto-scroll streaming text to bottom for real-time feel
  useEffect(() => {
    if (streamingTextRef.current && streamingState.phase === 'llm_streaming') {
      streamingTextRef.current.scrollTop = streamingTextRef.current.scrollHeight;
    }
  }, [streamingState.streamingText]);
  
  // Stream event handler - processes all streaming events
  const handleStreamEvent = useCallback(async (eventData) => {
    const { type, data, timestamp } = eventData;
    
    console.log(`📡 Stream event: ${type}`, data);
    
    switch (type) {
      case 'prompt_ready':
        setStreamingState(prev => ({
          ...prev,
          phase: 'prompt_ready',
          prompt: data.prompt,
          model: data.model || 'claude-3-sonnet'
        }));
        break;
        
      case 'llm_start':
        setStreamingState(prev => ({
          ...prev,
          phase: 'llm_streaming',
          streamingText: '',
          model: data.model || prev.model
        }));
        break;
        
      case 'llm_chunk':
        setStreamingState(prev => ({
          ...prev,
          streamingText: prev.streamingText + data.chunk,
          chunkCount: data.chunk_count,
          currentLength: data.current_length,
          estimatedCompletion: data.estimated_completion || 0
        }));
        break;
        
      case 'processing_start':
        setStreamingState(prev => ({
          ...prev,
          phase: 'processing',
          streamingTime: data.streaming_time_seconds || 0
        }));
        break;
        
      case 'classification_complete':
        console.log('🎯 Classification complete event received:', {
          has_data_result: !!data.result,
          data_result_keys: data.result ? Object.keys(data.result) : 'No result',
          has_raw_response_preview: !!data.raw_response_preview,
          raw_response_length: data.raw_response_preview?.length || 0,
          total_time: data.total_time_seconds || 0
        });
        
        // Update state and handle completion in the callback to access prev properly
        setStreamingState(prev => {
          const updatedState = {
            ...prev,
            phase: 'complete',
            finalResult: data.result,
            finalStreamingText: prev.streamingText, // Preserve the final streaming text
            totalTime: data.total_time_seconds || 0,
            streamingTime: data.streaming_time_seconds || 0,
            processingTime: data.processing_time_seconds || 0,
            performanceMetrics: data.performance_metrics
          };
          
          // Call parent completion handler with COMPLETE classification data
          // CRITICAL: Always call completion handler if we have classification data
          if (onComplete && (data.result || prev.streamingText || data.raw_response_preview)) {
            // Use raw_response_preview from backend if available, otherwise use accumulated streaming text
            const rawAIResponse = data.raw_response_preview || prev.streamingText || '';
            
            // Include both structured result AND raw streaming text for case investigation
            const completeClassificationData = {
              // Use data.result if available, otherwise create a basic structure
              ...(data.result || {
                success: true,
                has_structured_result: false,
                fallback_reason: 'Using streaming text only - no structured result available'
              }),
              // Add the complete raw AI response for case investigation analysis
              raw_ai_response: rawAIResponse,
              streaming_metadata: {
                total_time: data.total_time_seconds || 0,
                streaming_time: data.streaming_time_seconds || 0,
                processing_time: data.processing_time_seconds || 0,
                model_used: prev.model,
                chunk_count: prev.chunkCount,
                response_length: rawAIResponse.length,
                performance_metrics: data.performance_metrics,
                data_source: data.raw_response_preview ? 'backend_preview' : 'frontend_streaming'
              }
            };
            
            console.log('📋 Sending complete classification data to parent:', {
              has_structured_result: !!data.result,
              has_raw_ai_response: !!rawAIResponse,
              raw_response_length: rawAIResponse.length,
              structured_keys: data.result ? Object.keys(data.result) : 'No structured result',
              complete_data_keys: Object.keys(completeClassificationData),
              data_source: completeClassificationData.streaming_metadata.data_source
            });
            
            // Use setTimeout to ensure state update completes before calling parent
            setTimeout(() => {
              onComplete(completeClassificationData);
            }, 0);
            
          } else {
            console.error('❌ Cannot call completion handler - no onComplete callback or no classification data available');
            console.error('Debug info:', {
              has_onComplete: !!onComplete,
              has_data_result: !!data.result,
              has_streaming_text: !!prev.streamingText,
              has_raw_response_preview: !!data.raw_response_preview
            });
          }
          
          return updatedState;
        });
        break;
        
      case 'error':
        setStreamingState(prev => ({
          ...prev,
          phase: 'error',
          error: data.error_message,
          totalTime: data.total_time_before_error || 0
        }));
        
        // Call parent error handler
        if (onError) {
          onError(data.error_message);
        }
        break;
        
      default:
        console.warn(`Unknown stream event type: ${type}`);
    }
  }, [onComplete, onError]);

  // Update the event handler ref when it changes
  useEffect(() => {
    eventHandlerRef.current = handleStreamEvent;
  }, [handleStreamEvent]);

  // Update workflow data ref when it changes
  useEffect(() => {
    workflowDataRef.current = workflowData;
  }, [workflowData]);
  
  // Start streaming classification on mount
  useEffect(() => {
    // Prevent multiple simultaneous requests using ref
    if (streamingStartedRef.current) {
      console.log('⚠️ Streaming already started, skipping duplicate request');
      return;
    }
    
    // Don't start new streaming if already completed
    if (streamingState.phase === 'complete') {
      console.log('⚠️ Classification already completed, skipping new request');
      return;
    }
    
    streamingStartedRef.current = true;
    
    const startStreaming = async () => {
      try {
        console.log('🚀 Starting streaming entity classification...');
        
        // Create abort controller for cancellation support
        abortControllerRef.current = new AbortController();
        
        // Start streaming with full workflow data
        await amlAPI.classifyEntityStreaming(
          workflowDataRef.current,
          eventHandlerRef.current,
          {
            model_preference: 'claude-3-sonnet',
            analysis_depth: 'comprehensive',
            signal: abortControllerRef.current.signal
          }
        );
      } catch (error) {
        // Check if this is an abort/cancel operation (expected cleanup)
        const isAbortError = error.name === 'AbortError' || 
                            error.message === 'Component unmounted' || 
                            error.message === 'User cancelled streaming' ||
                            error.message?.includes('aborted') ||
                            error.message?.includes('unmounted') ||
                            error.code === 'ABORT_ERR' ||
                            (typeof error === 'string' && (error.includes('unmounted') || error.includes('aborted')));
        
        if (isAbortError) {
          console.log('🛑 Streaming classification cancelled:', error.message || error.name);
          // Don't treat abort as an error - just reset state
          setStreamingState(prev => ({
            ...prev,
            phase: 'starting',
            error: null
          }));
          streamingStartedRef.current = false; // Reset flag
        } else {
          console.error('❌ Streaming classification error:', error);
          setStreamingState(prev => ({
            ...prev,
            phase: 'error',
            error: error.message || 'Failed to start streaming classification'
          }));
          streamingStartedRef.current = false; // Reset flag on error
          
          // Only call onError for actual errors, not cancellations
          if (onError) {
            onError(error.message || 'Streaming classification failed');
          }
        }
      }
    };
    
    startStreaming();
    
    // Cleanup on unmount
    return () => {
      if (abortControllerRef.current && !abortControllerRef.current.signal.aborted) {
        console.log('🛑 Aborting streaming classification on component unmount');
        abortControllerRef.current.abort('Component unmounted');
      }
      streamingStartedRef.current = false; // Reset flag on unmount
    };
  }, []); // Only run on mount - workflowData should not trigger new streams
  
  // Helper functions for UI state
  const getPhaseIcon = () => {
    switch (streamingState.phase) {
      case 'starting': return 'Refresh';
      case 'prompt_ready': return 'Edit';
      case 'llm_streaming': return 'Sparkle';
      case 'processing': return 'Settings';
      case 'complete': return 'Checkmark';
      case 'error': return 'Warning';
      default: return 'Refresh';
    }
  };
  
  const getPhaseColor = () => {
    switch (streamingState.phase) {
      case 'complete': return palette.green.base;
      case 'error': return palette.red.base;
      case 'llm_streaming': return palette.blue.base;
      case 'processing': return palette.purple.base;
      case 'prompt_ready': return palette.gray.dark1;
      default: return palette.gray.base;
    }
  };
  
  const getPhaseTitle = () => {
    switch (streamingState.phase) {
      case 'starting': return 'Initializing AI Classification';
      case 'prompt_ready': return 'Prompt Prepared';
      case 'llm_streaming': return 'AI Analysis in Progress';
      case 'processing': return 'Processing Results';
      case 'complete': return 'Classification Complete';
      case 'error': return 'Classification Error';
      default: return 'Processing...';
    }
  };

  const getPhaseDescription = () => {
    switch (streamingState.phase) {
      case 'starting': return 'Preparing comprehensive entity analysis...';
      case 'prompt_ready': return 'Analysis prompt generated with full workflow context';
      case 'llm_streaming': return 'Claude-3 Sonnet analyzing entity risk profile...';
      case 'processing': return 'Structuring AI insights into actionable intelligence...';
      case 'complete': return 'Risk assessment and recommendations ready';
      case 'error': return 'An error occurred during classification';
      default: return 'Processing entity data...';
    }
  };
  
  return (
    <div style={{ width: '100%', maxWidth: '1200px', margin: '0 auto' }}>
      
      {/* Main Status Card - Clean Professional Design */}
      <Card style={{ marginBottom: spacing[4] }}>
        <div style={{ padding: spacing[4] }}>
          {/* Status Header */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: spacing[3]
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: spacing[3] }}>
              {streamingState.phase !== 'complete' && streamingState.phase !== 'error' && (
                <div style={{ 
                  width: '48px', 
                  height: '48px',
                  borderRadius: '50%',
                  backgroundColor: getPhaseColor() + '20',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {streamingState.phase === 'llm_streaming' ? (
                    <Spinner size="small" />
                  ) : (
                    <Icon glyph={getPhaseIcon()} size="large" style={{ color: getPhaseColor() }} />
                  )}
                </div>
              )}
              
              <div>
                <H2 style={{ margin: 0, fontSize: '24px', fontWeight: '600' }}>
                  {getPhaseTitle()}
                </H2>
                <Body style={{ color: palette.gray.dark1, marginTop: spacing[2], fontSize: '15px', lineHeight: 1.5 }}>
                  {getPhaseDescription()}
                </Body>
              </div>
            </div>
            
            {/* Status Badges */}
            <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2] }}>
              {streamingState.model && (
                <Badge variant="lightgray">
                  <Icon glyph="Sparkle" style={{ marginRight: spacing[1] }} />
                  {streamingState.model}
                </Badge>
              )}
              {streamingState.totalTime > 0 && (
                <Badge variant="green">
                  {streamingState.totalTime.toFixed(1)}s
                </Badge>
              )}
            </div>
          </div>
          
          {/* Progress Indicator for Streaming */}
          {streamingState.phase === 'llm_streaming' && (
            <>
              <div style={{
                width: '100%',
                height: '6px',
                backgroundColor: palette.gray.light2,
                borderRadius: '3px',
                marginBottom: spacing[2],
                overflow: 'hidden'
              }}>
                <div style={{
                  height: '100%',
                  width: `${streamingState.estimatedCompletion}%`,
                  backgroundColor: palette.blue.base,
                  borderRadius: '3px',
                  transition: 'width 0.3s ease',
                  background: `linear-gradient(90deg, ${palette.blue.base}, ${palette.blue.light1})`
                }} />
              </div>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between',
                fontSize: '14px',
                color: palette.gray.dark1,
                marginTop: spacing[2]
              }}>
                <span>{streamingState.chunkCount} chunks received</span>
                <span>{(streamingState.currentLength / 1024).toFixed(1)}KB processed</span>
                <span>{streamingState.estimatedCompletion.toFixed(0)}% complete</span>
              </div>
            </>
          )}
        </div>
      </Card>
      
      {/* Prompt Transparency - Expandable Card */}
      {streamingState.prompt && streamingState.phase !== 'starting' && (
        <ExpandableCard
          title="Analysis Prompt"
          description={`Full transparency - ${streamingState.prompt.length.toLocaleString()} characters`}
          style={{ marginBottom: spacing[4] }}
        >
          <div style={{ padding: spacing[3] }}>
            <Code 
              language="none"
              style={{ 
                fontSize: '13px',
                maxHeight: '450px',
                overflowY: 'auto',
                whiteSpace: 'pre-wrap',
                lineHeight: 1.6,
                padding: spacing[4]
              }}
            >
              {streamingState.prompt}
            </Code>
          </div>
        </ExpandableCard>
      )}
      
      {/* Live Streaming View - Professional Terminal Style */}
      {streamingState.phase === 'llm_streaming' && (
        <Card style={{ marginBottom: spacing[4] }}>
          <div style={{ padding: spacing[4] }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: spacing[3]
            }}>
              <Label style={{ fontSize: '16px', fontWeight: '600' }}>
                Live AI Analysis Stream
              </Label>
              <div style={{ display: 'flex', gap: spacing[2] }}>
                <Badge variant="blue" size="small">
                  <Icon glyph="Refresh" style={{ marginRight: spacing[1] }} />
                  Streaming
                </Badge>
              </div>
            </div>
            
            <div
              ref={streamingTextRef}
              style={{
                backgroundColor: palette.gray.dark3,
                color: palette.white,
                padding: spacing[3],
                borderRadius: '8px',
                fontFamily: 'Monaco, Consolas, monospace',
                fontSize: '14px',
                height: '400px',
                overflowY: 'auto',
                whiteSpace: 'pre-wrap',
                lineHeight: 1.9,
                border: `1px solid ${palette.gray.dark2}`,
                letterSpacing: '0.3px'
              }}
            >
              <div style={{ color: palette.green.light2, marginBottom: spacing[2] }}>
                🤖 AI Analysis Stream - Live Response
              </div>
              <div style={{ 
                color: palette.white,
                fontSize: '14px',
                lineHeight: 1.9,
                wordWrap: 'break-word',
                overflowWrap: 'break-word'
              }}>
                {formatStreamingText(streamingState.streamingText)}
              </div>
              <span style={{ 
                animation: 'blink 1s infinite',
                color: palette.green.light1,
                fontSize: '16px'
              }}>▊</span>
            </div>
          </div>
        </Card>
      )}
      
      {/* Processing Phase */}
      {streamingState.phase === 'processing' && (
        <Card style={{ marginBottom: spacing[4] }}>
          <div style={{ 
            padding: spacing[5], 
            textAlign: 'center'
          }}>
            <Spinner size="large" />
            <H3 style={{ marginTop: spacing[3], marginBottom: spacing[3], fontSize: '20px' }}>
              Structuring Analysis Results
            </H3>
            <Body style={{ color: palette.gray.dark1, fontSize: '15px', lineHeight: 1.5 }}>
              Converting {(streamingState.currentLength / 1024).toFixed(1)}KB of AI analysis into structured intelligence...
            </Body>
          </div>
        </Card>
      )}
      
      {/* Classification Results - Enhanced Professional Display */}
      {streamingState.phase === 'complete' && (
        <ErrorBoundary>
          {streamingState.finalResult ? (
            <>
              {/* Executive Summary Card */}
              <ExecutiveSummaryCard result={streamingState.finalResult} />
              
              {/* Detailed Analysis Tabs */}
              <Card style={{ marginBottom: spacing[4] }}>
                <Tabs selected={selectedTab} setSelected={setSelectedTab}>
                  
                  <Tab name="Risk Analysis">
                    <div style={{ padding: spacing[4] }}>
                      <RiskAnalysisDisplay result={streamingState.finalResult} />
                    </div>
                  </Tab>
                  
                  <Tab name="Compliance Screening">
                    <div style={{ padding: spacing[4] }}>
                      <ComplianceScreeningDisplay result={streamingState.finalResult} />
                    </div>
                  </Tab>
                  
                  <Tab name="Detailed Findings">
                    <div style={{ padding: spacing[4] }}>
                      <DetailedFindingsDisplay result={streamingState.finalResult} />
                    </div>
                  </Tab>
                  
                  <Tab name="Recommendations">
                    <div style={{ padding: spacing[4] }}>
                      <RecommendationsDisplay result={streamingState.finalResult} />
                    </div>
                  </Tab>
                  
                  <Tab name="Raw AI Response">
                    <div style={{ padding: spacing[4] }}>
                      <RawResponseDisplay 
                        rawText={streamingState.finalStreamingText || streamingState.streamingText}
                        responseLength={streamingState.currentLength}
                      />
                    </div>
                  </Tab>
                  
                  <Tab name="Performance Metrics">
                    <div style={{ padding: spacing[4] }}>
                      <PerformanceMetricsDisplay 
                        totalTime={streamingState.totalTime}
                        streamingTime={streamingState.streamingTime}
                        processingTime={streamingState.processingTime}
                        chunkCount={streamingState.chunkCount}
                        responseLength={streamingState.currentLength}
                      />
                    </div>
                  </Tab>
                  
                </Tabs>
              </Card>
              
              {/* Case Investigation Button - Final Step */}
              <Card style={{ marginBottom: spacing[4], textAlign: 'center' }}>
                <div style={{ padding: spacing[5] }}>
                  <div style={{ marginBottom: spacing[4] }}>
                    <Icon glyph="File" size={48} style={{ color: palette.green.base, marginBottom: spacing[3] }} />
                    <H3 style={{ marginBottom: spacing[2], color: palette.green.dark2, fontSize: '22px' }}>
                      Classification Complete
                    </H3>
                    <Body style={{ color: palette.gray.dark1, fontSize: '15px', lineHeight: 1.6 }}>
                      AI analysis completed successfully. Ready to generate comprehensive case investigation report 
                      with all workflow data and recommendations.
                    </Body>
                  </div>
                  
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'center', 
                    gap: spacing[3],
                    alignItems: 'center' 
                  }}>
                    <Button
                      variant="primary"
                      size="large"
                      onClick={() => onProceedToInvestigation && onProceedToInvestigation()}
                      leftGlyph={<Icon glyph="Folder" />}
                      style={{
                        fontSize: '16px',
                        padding: `${spacing[3]}px ${spacing[4]}px`
                      }}
                    >
                      Generate Case Investigation
                    </Button>
                    
                    <div style={{ textAlign: 'left', marginLeft: spacing[3] }}>
                      <Body style={{ fontSize: '13px', color: palette.gray.dark1 }}>
                        • Complete workflow summary
                      </Body>
                      <Body style={{ fontSize: '13px', color: palette.gray.dark1 }}>
                        • MongoDB document export
                      </Body>
                      <Body style={{ fontSize: '13px', color: palette.gray.dark1 }}>
                        • Professional case report
                      </Body>
                    </div>
                  </div>
                </div>
              </Card>
            </>
          ) : (
            <Card style={{ marginBottom: spacing[4] }}>
              <div style={{ padding: spacing[4], textAlign: 'center' }}>
                <Icon glyph="Warning" size="large" style={{ color: palette.yellow.base, marginBottom: spacing[3] }} />
                <H3 style={{ color: palette.yellow.dark1, marginBottom: spacing[2] }}>Classification Processing Error</H3>
                <Body style={{ color: palette.gray.dark1, marginBottom: spacing[3] }}>
                  The classification completed but no results were returned. This may indicate a parsing error.
                </Body>
                <Callout variant="warning">
                  <strong>Possible causes:</strong>
                  <ul style={{ marginTop: spacing[2], paddingLeft: spacing[3] }}>
                    <li>AI response format was invalid</li>
                    <li>Network interruption during processing</li>
                    <li>Response parsing failed</li>
                  </ul>
                </Callout>
              </div>
            </Card>
          )}
        </ErrorBoundary>
      )}
      
      {/* Error Display */}
      {streamingState.error && (
        <Banner variant="danger" style={{ marginBottom: spacing[4] }}>
          <strong>Classification Error</strong>
          <Body style={{ marginTop: spacing[2] }}>
            {streamingState.error}
          </Body>
          {streamingState.totalTime > 0 && (
            <Body style={{ marginTop: spacing[1], fontSize: '12px', color: palette.gray.dark1 }}>
              Error occurred after {streamingState.totalTime.toFixed(1)}s of processing
            </Body>
          )}
        </Banner>
      )}
      
      {/* CSS Animations */}
      <style jsx>{`
        @keyframes blink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}


/**
 * Executive Summary Card - Professional Risk Overview
 */
function ExecutiveSummaryCard({ result }) {
  // Error boundary for missing or invalid result
  if (!result || typeof result !== 'object') {
    return (
      <Card style={{ marginBottom: spacing[4] }}>
        <div style={{ padding: spacing[4], textAlign: 'center' }}>
          <Icon glyph="Warning" size="large" style={{ color: palette.yellow.base, marginBottom: spacing[2] }} />
          <H3 style={{ color: palette.yellow.dark1 }}>Classification Result Unavailable</H3>
          <Body style={{ color: palette.gray.dark1 }}>Unable to display risk assessment - data may be processing</Body>
        </div>
      </Card>
    );
  }
  
  const getRiskColor = (level) => {
    switch (level?.toLowerCase()) {
      case 'critical': return palette.red.dark2;
      case 'high': return palette.red.base;
      case 'medium': return palette.yellow.dark1;
      case 'low': return palette.green.base;
      default: return palette.gray.base;
    }
  };
  
  const getRiskIcon = (level) => {
    switch (level?.toLowerCase()) {
      case 'critical': return 'Warning';
      case 'high': return 'Warning';
      case 'medium': return 'InfoWithCircle';
      case 'low': return 'Checkmark';
      default: return 'QuestionMarkWithCircle';
    }
  };
  
  return (
    <Card style={{ marginBottom: spacing[4] }}>
      <div style={{ padding: spacing[4] }}>
        {/* Risk Level Header */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: spacing[4],
          paddingBottom: spacing[3],
          borderBottom: `1px solid ${palette.gray.light2}`
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: spacing[3] }}>
            <div style={{ 
              width: '56px', 
              height: '56px',
              borderRadius: '50%',
              backgroundColor: getRiskColor(result.overall_risk_level) + '20',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Icon 
                glyph={getRiskIcon(result.overall_risk_level)} 
                size="xlarge" 
                style={{ color: getRiskColor(result.overall_risk_level) }} 
              />
            </div>
            
            <div>
              <Overline style={{ color: palette.gray.dark1, fontSize: '13px', fontWeight: '500' }}>OVERALL RISK ASSESSMENT</Overline>
              <H2 style={{ 
                margin: 0, 
                color: getRiskColor(result.overall_risk_level),
                fontSize: '28px',
                fontWeight: '700',
                marginTop: spacing[1]
              }}>
                {result.overall_risk_level?.toUpperCase() || 'UNKNOWN'} RISK
              </H2>
            </div>
          </div>
          
          <div style={{ textAlign: 'right' }}>
            <Overline style={{ color: palette.gray.dark1, fontSize: '13px', fontWeight: '500' }}>CONFIDENCE</Overline>
            <H3 style={{ margin: 0, color: palette.blue.base, fontSize: '22px', fontWeight: '600', marginTop: spacing[1] }}>
              {result.confidence_score || 0}%
            </H3>
          </div>
        </div>
        
        {/* Key Metrics Grid */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
          gap: spacing[3],
          marginBottom: spacing[4]
        }}>
          <div style={{ 
            padding: spacing[3],
            backgroundColor: palette.gray.light3,
            borderRadius: '8px'
          }}>
            <Label style={{ color: palette.gray.dark1, fontSize: '13px', fontWeight: '500' }}>Risk Score</Label>
            <H3 style={{ 
              margin: `${spacing[2]}px 0`, 
              color: getRiskColor(result.overall_risk_level),
              fontSize: '18px',
              fontWeight: '600'
            }}>
              {result.risk_score || 0}/100
            </H3>
          </div>
          
          <div style={{ 
            padding: spacing[3],
            backgroundColor: palette.gray.light3,
            borderRadius: '8px'
          }}>
            <Label style={{ color: palette.gray.dark1, fontSize: '13px', fontWeight: '500' }}>Network Classification</Label>
            <H3 style={{ margin: `${spacing[2]}px 0`, fontSize: '18px', fontWeight: '600' }}>
              {result.network_classification?.replace(/_/g, ' ').toUpperCase() || 'UNKNOWN'}
            </H3>
          </div>
          
          <div style={{ 
            padding: spacing[3],
            backgroundColor: palette.gray.light3,
            borderRadius: '8px'
          }}>
            <Label style={{ color: palette.gray.dark1, fontSize: '13px', fontWeight: '500' }}>Recommended Action</Label>
            <Badge 
              variant={result.recommended_action?.includes('reject') ? 'red' : 
                     result.recommended_action?.includes('approve') ? 'green' : 'yellow'}
              style={{ marginTop: spacing[2], fontSize: '13px', padding: `${spacing[1]}px ${spacing[2]}px` }}
            >
              {result.recommended_action?.replace(/_/g, ' ').toUpperCase() || 'REVIEW'}
            </Badge>
          </div>
        </div>
        
        {/* Key Risk Factors */}
        {result.key_risk_factors && result.key_risk_factors.length > 0 && (
          <Callout variant="warning">
            <Label style={{ marginBottom: spacing[3], display: 'block', fontSize: '15px', fontWeight: '600' }}>
              Key Risk Factors Identified
            </Label>
            {result.key_risk_factors.map((factor, index) => (
              <div key={index} style={{ 
                display: 'flex', 
                alignItems: 'flex-start',
                gap: spacing[2],
                marginBottom: index < result.key_risk_factors.length - 1 ? spacing[2] : 0
              }}>
                <Icon glyph="Warning" style={{ color: palette.yellow.dark1, marginTop: '2px' }} />
                <Body style={{ fontSize: '15px', lineHeight: 1.6 }}>{factor}</Body>
              </div>
            ))}
          </Callout>
        )}
      </div>
    </Card>
  );
}


/**
 * Risk Analysis Display Component
 */
function RiskAnalysisDisplay({ result }) {
  if (!result || typeof result !== 'object') {
    return (
      <div style={{ textAlign: 'center', padding: spacing[4] }}>
        <Icon glyph="Warning" style={{ color: palette.yellow.base, marginBottom: spacing[2] }} />
        <Body>Risk analysis data is not available</Body>
      </div>
    );
  }
  
  const detailed = result.detailed_analysis || {};
  
  return (
    <div>
      <H3 style={{ marginBottom: spacing[4], fontSize: '20px', fontWeight: '600' }}>Comprehensive Risk Analysis</H3>
      
      {Object.entries(detailed).map(([section, analysis]) => (
        <Card key={section} style={{ 
          marginBottom: spacing[3], 
          backgroundColor: palette.gray.light3
        }}>
          <div style={{ padding: spacing[3] }}>
            <Label style={{ 
              marginBottom: spacing[3], 
              fontSize: '16px', 
              fontWeight: '600',
              color: palette.blue.dark1,
              display: 'block'
            }}>
              {section.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </Label>
            <Body style={{ lineHeight: 1.7, fontSize: '15px' }}>{analysis}</Body>
          </div>
        </Card>
      ))}
    </div>
  );
}


/**
 * Compliance Screening Display Component
 */
function ComplianceScreeningDisplay({ result }) {
  if (!result || typeof result !== 'object') {
    return (
      <div style={{ textAlign: 'center', padding: spacing[4] }}>
        <Icon glyph="Warning" style={{ color: palette.yellow.base, marginBottom: spacing[2] }} />
        <Body>Compliance screening data is not available</Body>
      </div>
    );
  }
  
  const flags = result.aml_kyc_flags || {};
  
  return (
    <div>
      <H3 style={{ marginBottom: spacing[4], fontSize: '20px', fontWeight: '600' }}>AML/KYC Compliance Screening</H3>
      
      <Table>
        <TableHead>
          <HeaderRow>
            <HeaderCell>Compliance Check</HeaderCell>
            <HeaderCell>Status</HeaderCell>
            <HeaderCell>Details</HeaderCell>
          </HeaderRow>
        </TableHead>
        <TableBody>
          {Object.entries(flags).map(([flag, value]) => {
            // Skip additional_flags for main table
            if (flag === 'additional_flags') return null;
            
            const isRisk = value === true;
            const flagName = flag.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            
            return (
              <Row key={flag}>
                <Cell>{flagName}</Cell>
                <Cell>
                  <Badge variant={isRisk ? 'red' : 'green'}>
                    <Icon glyph={isRisk ? 'X' : 'Checkmark'} style={{ marginRight: spacing[1] }} />
                    {isRisk ? 'FLAGGED' : 'CLEAR'}
                  </Badge>
                </Cell>
                <Cell>
                  <Body style={{ fontSize: '14px', color: palette.gray.dark1 }}>
                    {isRisk ? 'Requires further investigation' : 'No issues detected'}
                  </Body>
                </Cell>
              </Row>
            );
          })}
        </TableBody>
      </Table>
      
      {/* Additional Flags */}
      {flags.additional_flags && flags.additional_flags.length > 0 && (
        <Card style={{ marginTop: spacing[3], backgroundColor: palette.red.light3 }}>
          <div style={{ padding: spacing[3] }}>
            <Label style={{ marginBottom: spacing[3], display: 'block', fontSize: '15px', fontWeight: '600' }}>Additional Risk Indicators</Label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: spacing[2] }}>
              {flags.additional_flags.map((flag, index) => (
                <Badge key={index} variant="red">
                  {flag.replace(/_/g, ' ').toUpperCase()}
                </Badge>
              ))}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}


/**
 * Detailed Findings Display Component
 */
function DetailedFindingsDisplay({ result }) {
  if (!result || typeof result !== 'object') {
    return (
      <div style={{ textAlign: 'center', padding: spacing[4] }}>
        <Icon glyph="Warning" style={{ color: palette.yellow.base, marginBottom: spacing[2] }} />
        <Body>Detailed findings are not available</Body>
      </div>
    );
  }
  
  return (
    <div>
      <H3 style={{ marginBottom: spacing[4], fontSize: '20px', fontWeight: '600' }}>Detailed Analysis Findings</H3>
      
      {/* Network Classification Details */}
      <Card style={{ marginBottom: spacing[3] }}>
        <div style={{ padding: spacing[3] }}>
          <Label style={{ marginBottom: spacing[3], display: 'block', fontSize: '16px', fontWeight: '600' }}>
            Network Positioning Analysis
          </Label>
          <Body style={{ lineHeight: 1.6, marginBottom: spacing[3], fontSize: '15px' }}>
            Entity classified as: <strong>{result.network_classification}</strong>
          </Body>
          <Body style={{ fontSize: '14px', color: palette.gray.dark1, lineHeight: 1.6 }}>
            {result.detailed_analysis?.network_positioning_analysis || 
             'Network positioning analysis indicates the entity\'s role and influence within the broader network structure.'}
          </Body>
        </div>
      </Card>
      
      {/* Search Results Quality */}
      <Card style={{ marginBottom: spacing[3] }}>
        <div style={{ padding: spacing[3] }}>
          <Label style={{ marginBottom: spacing[3], display: 'block', fontSize: '16px', fontWeight: '600' }}>
            Entity Matching & Search Quality
          </Label>
          <Body style={{ fontSize: '14px', lineHeight: 1.7 }}>
            {result.detailed_analysis?.search_results_analysis || 
             'Search results indicate potential matches requiring further verification.'}
          </Body>
        </div>
      </Card>
      
      {/* Data Quality Assessment */}
      <Card>
        <div style={{ padding: spacing[3] }}>
          <Label style={{ marginBottom: spacing[3], display: 'block', fontSize: '16px', fontWeight: '600' }}>
            Data Quality & Completeness
          </Label>
          <Body style={{ fontSize: '14px', lineHeight: 1.7 }}>
            {result.detailed_analysis?.data_quality_assessment || 
             'Data quality assessment indicates areas requiring additional verification.'}
          </Body>
        </div>
      </Card>
    </div>
  );
}


/**
 * Recommendations Display Component
 */
function RecommendationsDisplay({ result }) {
  if (!result || typeof result !== 'object') {
    return (
      <div style={{ textAlign: 'center', padding: spacing[4] }}>
        <Icon glyph="Warning" style={{ color: palette.yellow.base, marginBottom: spacing[2] }} />
        <Body>Recommendations are not available</Body>
      </div>
    );
  }
  
  const recommendations = result.recommendations || [];
  
  const getPriorityColor = (index) => {
    if (index === 0) return palette.red.base;
    if (index === 1) return palette.yellow.base;
    return palette.blue.base;
  };
  
  const getPriorityLabel = (index) => {
    if (index === 0) return 'HIGH PRIORITY';
    if (index === 1) return 'MEDIUM PRIORITY';
    return 'STANDARD';
  };
  
  return (
    <div>
      <H3 style={{ marginBottom: spacing[4], fontSize: '20px', fontWeight: '600' }}>Actionable Recommendations</H3>
      
      {recommendations.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[3] }}>
          {recommendations.map((recommendation, index) => (
            <Card key={index} style={{ 
              borderLeft: `4px solid ${getPriorityColor(index)}`
            }}>
              <div style={{ padding: spacing[3] }}>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: spacing[2]
                }}>
                  <Label style={{ color: getPriorityColor(index) }}>
                    Recommendation {index + 1}
                  </Label>
                  <Badge variant={index === 0 ? 'red' : index === 1 ? 'yellow' : 'blue'}>
                    {getPriorityLabel(index)}
                  </Badge>
                </div>
                <Body style={{ lineHeight: 1.7, fontSize: '15px' }}>{recommendation}</Body>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <div style={{ padding: spacing[4], textAlign: 'center' }}>
            <Icon glyph="InfoWithCircle" size="large" style={{ color: palette.gray.base, marginBottom: spacing[2] }} />
            <Body style={{ color: palette.gray.dark1 }}>
              No specific recommendations generated
            </Body>
          </div>
        </Card>
      )}
    </div>
  );
}


/**
 * Performance Metrics Display Component
 */
function PerformanceMetricsDisplay({ 
  totalTime = 0, streamingTime = 0, processingTime = 0, chunkCount = 0, responseLength = 0 
}) {
  // Ensure all values are numbers and handle undefined/null cases
  const safeTotalTime = Number(totalTime) || 0;
  const safeStreamingTime = Number(streamingTime) || 0;
  const safeProcessingTime = Number(processingTime) || 0;
  const safeChunkCount = Number(chunkCount) || 0;
  const safeResponseLength = Number(responseLength) || 0;
  
  return (
    <div>
      <H3 style={{ marginBottom: spacing[4], fontSize: '20px', fontWeight: '600' }}>Performance Analytics</H3>
      
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', 
        gap: spacing[3],
        marginBottom: spacing[4]
      }}>
        <Card>
          <div style={{ padding: spacing[3], textAlign: 'center' }}>
            <Icon glyph="Clock" style={{ color: palette.blue.base, marginBottom: spacing[1] }} />
            <Label style={{ fontSize: '13px', fontWeight: '500' }}>Total Time</Label>
            <H3 style={{ margin: `${spacing[2]}px 0`, color: palette.blue.base, fontSize: '18px' }}>
              {safeTotalTime.toFixed(1)}s
            </H3>
          </div>
        </Card>
        
        <Card>
          <div style={{ padding: spacing[3], textAlign: 'center' }}>
            <Icon glyph="Refresh" style={{ color: palette.green.base, marginBottom: spacing[1] }} />
            <Label style={{ fontSize: '13px', fontWeight: '500' }}>Streaming</Label>
            <H3 style={{ margin: `${spacing[2]}px 0`, color: palette.green.base, fontSize: '18px' }}>
              {safeStreamingTime.toFixed(1)}s
            </H3>
          </div>
        </Card>
        
        <Card>
          <div style={{ padding: spacing[3], textAlign: 'center' }}>
            <Icon glyph="Settings" style={{ color: palette.purple.base, marginBottom: spacing[1] }} />
            <Label style={{ fontSize: '13px', fontWeight: '500' }}>Processing</Label>
            <H3 style={{ margin: `${spacing[2]}px 0`, color: palette.purple.base, fontSize: '18px' }}>
              {safeProcessingTime.toFixed(1)}s
            </H3>
          </div>
        </Card>
        
        <Card>
          <div style={{ padding: spacing[3], textAlign: 'center' }}>
            <Icon glyph="Code" style={{ color: palette.gray.dark1, marginBottom: spacing[1] }} />
            <Label style={{ fontSize: '13px', fontWeight: '500' }}>Chunks</Label>
            <H3 style={{ margin: `${spacing[2]}px 0`, fontSize: '18px' }}>
              {safeChunkCount}
            </H3>
          </div>
        </Card>
        
        <Card>
          <div style={{ padding: spacing[3], textAlign: 'center' }}>
            <Icon glyph="File" style={{ color: palette.gray.dark1, marginBottom: spacing[1] }} />
            <Label style={{ fontSize: '13px', fontWeight: '500' }}>Response Size</Label>
            <H3 style={{ margin: `${spacing[2]}px 0`, fontSize: '18px' }}>
              {(safeResponseLength / 1024).toFixed(1)}KB
            </H3>
          </div>
        </Card>
      </div>
      
      {/* Performance Insights */}
      <Callout variant="note">
        <Label style={{ marginBottom: spacing[2], display: 'block' }}>Performance Highlights</Label>
        <ul style={{ margin: 0, paddingLeft: spacing[3] }}>
          <li><Body style={{ fontSize: '12px' }}>Real-time streaming provides immediate user engagement</Body></li>
          <li><Body style={{ fontSize: '12px' }}>Average chunk processing: {safeChunkCount > 0 ? Math.round(safeResponseLength / safeChunkCount) : 0} characters</Body></li>
          <li><Body style={{ fontSize: '12px' }}>Stream efficiency: {safeStreamingTime > 0 ? ((safeResponseLength / 1024) / safeStreamingTime).toFixed(1) : 0} KB/s</Body></li>
        </ul>
      </Callout>
    </div>
  );
}


/**
 * Raw Response Display Component - Always Available
 */
function RawResponseDisplay({ rawText, responseLength = 0 }) {
  if (!rawText) {
    return (
      <div style={{ textAlign: 'center', padding: spacing[4] }}>
        <Icon glyph="InformationWithCircle" style={{ color: palette.gray.base, marginBottom: spacing[2] }} />
        <Body style={{ color: palette.gray.dark1, fontSize: '15px' }}>No raw response data available</Body>
      </div>
    );
  }
  
  return (
    <div>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing[3]
      }}>
        <H3 style={{ fontSize: '20px', fontWeight: '600' }}>Complete AI Response</H3>
        <div style={{ display: 'flex', gap: spacing[2] }}>
          <Badge variant="lightgray">
            {(responseLength / 1024).toFixed(1)}KB
          </Badge>
          <Badge variant="blue">
            {rawText.split('\n').length} lines
          </Badge>
        </div>
      </div>
      
      <Body style={{ marginBottom: spacing[4], color: palette.gray.dark1, fontSize: '15px', lineHeight: 1.6 }}>
        Complete unprocessed response from Claude-3 Sonnet for transparency and debugging.
      </Body>
      
      <div style={{
        backgroundColor: palette.gray.dark3,
        color: palette.white,
        padding: spacing[4],
        borderRadius: '8px',
        fontFamily: 'Monaco, Consolas, "SF Mono", monospace',
        fontSize: '14px',
        maxHeight: '600px',
        overflowY: 'auto',
        whiteSpace: 'pre-wrap',
        lineHeight: 1.8,
        border: `1px solid ${palette.gray.dark2}`,
        letterSpacing: '0.3px'
      }}>
        {formatStreamingText(rawText)}
      </div>
    </div>
  );
}


export default StreamingClassificationInterface;