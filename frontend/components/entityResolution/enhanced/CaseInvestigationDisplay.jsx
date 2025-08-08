/**
 * Enhanced Case Investigation Display - Professional case analysis and reporting
 * 
 * Displays comprehensive workflow analysis with consistent styling matching other workflow components.
 * Features executive summary, AI classification analysis, search & network data, and MongoDB export.
 */

"use client";

import React, { useState } from 'react';
import Card from '@leafygreen-ui/card';
import Button from '@leafygreen-ui/button';
import { H2, H3, Body, Label } from '@leafygreen-ui/typography';
import { Tabs, Tab } from '@leafygreen-ui/tabs';
import Badge from '@leafygreen-ui/badge';
import Icon from '@leafygreen-ui/icon';
import { Code } from '@leafygreen-ui/code';
import Callout from '@leafygreen-ui/callout';
import { palette } from '@leafygreen-ui/palette';
import { spacing } from '@leafygreen-ui/tokens';

/**
 * Executive Summary Tab - High-level case overview
 */
function ExecutiveSummaryTab({ workflowData, investigation }) {
  const entityData = workflowData?.entityInput;
  const classificationData = workflowData?.classification;
  const searchResults = workflowData?.searchResults;
  
  return (
    <div style={{ marginTop: spacing[3] }}>
      {/* Case Header - Consistent styling */}
      <Card style={{ 
        padding: spacing[3],
        backgroundColor: palette.blue.light3,
        border: `1px solid ${palette.blue.light1}`,
        marginBottom: spacing[3]
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <H3 style={{ margin: 0, fontSize: '16px', color: palette.blue.dark2 }}>
              Case Investigation Report
            </H3>
            <Body style={{ fontSize: '12px', color: palette.gray.dark1, marginTop: spacing[1] }}>
              Entity: <strong>{entityData?.fullName || 'Unknown'}</strong> | 
              Type: <strong>{entityData?.entityType || 'Unknown'}</strong>
            </Body>
          </div>
          <div style={{ display: 'flex', gap: spacing[2] }}>
            <Badge variant="blue" style={{ fontSize: '11px' }}>
              Case ID: {investigation?.case_id || 'Generating...'}
            </Badge>
            <Badge variant="green" style={{ fontSize: '11px' }}>Complete</Badge>
          </div>
        </div>
      </Card>

      {/* Key Findings Grid */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
        gap: spacing[3],
        marginBottom: spacing[3]
      }}>
        <Card style={{ padding: spacing[3], textAlign: 'center' }}>
          <Icon glyph="Warning" style={{ color: palette.red.base, marginBottom: spacing[2] }} />
          <Label style={{ fontSize: '11px' }}>Overall Risk Level</Label>
          <Body weight="medium" style={{ 
            margin: `${spacing[1]}px 0`, 
            color: palette.red.base,
            fontSize: '14px'
          }}>
            {classificationData?.overall_risk_level?.toUpperCase() || 'PENDING'}
          </Body>
        </Card>
        
        <Card style={{ padding: spacing[3], textAlign: 'center' }}>
          <Icon glyph="Checkmark" style={{ color: palette.blue.base, marginBottom: spacing[2] }} />
          <Label style={{ fontSize: '11px' }}>Confidence Score</Label>
          <Body weight="medium" style={{ 
            margin: `${spacing[1]}px 0`, 
            color: palette.blue.base,
            fontSize: '14px'
          }}>
            {classificationData?.confidence_score || 0}%
          </Body>
        </Card>
        
        <Card style={{ padding: spacing[3], textAlign: 'center' }}>
          <Icon glyph="Diagram3" style={{ color: palette.purple.base, marginBottom: spacing[2] }} />
          <Label style={{ fontSize: '11px' }}>Search Matches</Label>
          <Body weight="medium" style={{ 
            margin: `${spacing[1]}px 0`, 
            color: palette.purple.base,
            fontSize: '14px'
          }}>
            {searchResults?.hybridResults?.length || 0} Found
          </Body>
        </Card>
        
        <Card style={{ padding: spacing[3], textAlign: 'center' }}>
          <Icon glyph="Settings" style={{ color: palette.green.base, marginBottom: spacing[2] }} />
          <Label style={{ fontSize: '11px' }}>Recommended Action</Label>
          <Badge 
            variant={
              classificationData?.recommended_action?.includes('approve') ? 'green' :
              classificationData?.recommended_action?.includes('reject') ? 'red' : 'yellow'
            }
            style={{ marginTop: spacing[1] }}
          >
            {classificationData?.recommended_action?.replace(/_/g, ' ').toUpperCase() || 'REVIEW'}
          </Badge>
        </Card>
      </div>

      {/* Investigation Summary */}
      {investigation?.investigation_summary && (
        <Card style={{ padding: spacing[4] }}>
          <H3 style={{ marginBottom: spacing[2], fontSize: '16px' }}>Investigation Summary</H3>
          <Card style={{ 
            padding: spacing[3],
            backgroundColor: palette.gray.light3,
            border: `1px solid ${palette.gray.light1}`
          }}>
            <Body style={{ 
              lineHeight: 1.6, 
              whiteSpace: 'pre-wrap',
              fontSize: '12px'
            }}>
              {investigation.investigation_summary}
            </Body>
          </Card>
        </Card>
      )}
    </div>
  );
}

/**
 * AI Classification Analysis Tab - Enhanced visual representation
 */
function AIClassificationTab({ workflowData }) {
  const classificationData = workflowData?.classification;
  
  if (!classificationData) {
    return (
      <div style={{ textAlign: 'center', padding: spacing[4] }}>
        <Icon glyph="Warning" style={{ color: palette.yellow.base, marginBottom: spacing[2] }} />
        <Body style={{ fontSize: '15px' }}>AI Classification data not available</Body>
      </div>
    );
  }
  
  // Get risk level color
  const getRiskColor = (level) => {
    switch(level?.toLowerCase()) {
      case 'high': return palette.red.base;
      case 'medium': return palette.yellow.base;
      case 'low': return palette.green.base;
      default: return palette.gray.base;
    }
  };
  
  return (
    <div style={{ marginTop: spacing[3] }}>
      {/* Key Metrics Dashboard */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', 
        gap: spacing[3],
        marginBottom: spacing[4]
      }}>
        {/* Risk Score Card */}
        <Card style={{ 
          padding: spacing[4], 
          textAlign: 'center',
          border: `2px solid ${getRiskColor(classificationData.overall_risk_level)}`
        }}>
          <div style={{ 
            fontSize: '48px', 
            fontWeight: 'bold', 
            color: getRiskColor(classificationData.overall_risk_level),
            marginBottom: spacing[2]
          }}>
            {classificationData.risk_score || 0}
          </div>
          <Label style={{ fontSize: '11px', textTransform: 'uppercase' }}>Risk Score</Label>
          <Body weight="medium" style={{ 
            color: getRiskColor(classificationData.overall_risk_level),
            marginTop: spacing[1],
            fontSize: '14px'
          }}>
            {classificationData.overall_risk_level?.toUpperCase() || 'UNKNOWN'} RISK
          </Body>
        </Card>

        {/* Confidence Card */}
        <Card style={{ padding: spacing[4], textAlign: 'center' }}>
          <div style={{ 
            fontSize: '48px', 
            fontWeight: 'bold', 
            color: palette.blue.base,
            marginBottom: spacing[2]
          }}>
            {classificationData.confidence_score || 0}%
          </div>
          <Label style={{ fontSize: '11px', textTransform: 'uppercase' }}>Confidence Level</Label>
          <Body weight="medium" style={{ 
            color: palette.blue.base,
            marginTop: spacing[1],
            fontSize: '14px'
          }}>
            {classificationData.confidence_level?.toUpperCase() || 'MEDIUM'} CONFIDENCE
          </Body>
        </Card>

        {/* Recommended Action Card */}
        <Card style={{ padding: spacing[4], textAlign: 'center' }}>
          <Icon 
            glyph="Settings" 
            size={48} 
            style={{ 
              color: palette.purple.base, 
              marginBottom: spacing[2] 
            }} 
          />
          <Label style={{ fontSize: '11px', textTransform: 'uppercase' }}>Recommended Action</Label>
          <Body weight="medium" style={{ 
            color: palette.purple.base,
            marginTop: spacing[1],
            fontSize: '14px'
          }}>
            {classificationData.recommended_action?.replace(/_/g, ' ').toUpperCase() || 'REVIEW'}
          </Body>
        </Card>
      </div>

      {/* AML/KYC Flags */}
      {classificationData.aml_kyc_flags && (
        <Card style={{ padding: spacing[3], marginBottom: spacing[3] }}>
          <H3 style={{ marginBottom: spacing[3], fontSize: '16px' }}>AML/KYC Compliance Flags</H3>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', 
            gap: spacing[2]
          }}>
            {Object.entries(classificationData.aml_kyc_flags).map(([flag, value]) => {
              if (flag === 'additional_flags') return null; // Handle separately
              const isRisk = value === true;
              return (
                <div key={flag} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: spacing[2],
                  padding: spacing[2],
                  backgroundColor: isRisk ? palette.red.light3 : palette.green.light3,
                  borderRadius: '6px',
                  border: `1px solid ${isRisk ? palette.red.light1 : palette.green.light1}`
                }}>
                  <Icon 
                    glyph={isRisk ? "Warning" : "Checkmark"} 
                    style={{ color: isRisk ? palette.red.base : palette.green.base }}
                  />
                  <Body style={{ 
                    fontSize: '12px',
                    color: isRisk ? palette.red.dark1 : palette.green.dark1
                  }}>
                    {flag.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </Body>
                </div>
              );
            })}
          </div>
          
          {/* Additional Flags */}
          {classificationData.aml_kyc_flags.additional_flags && classificationData.aml_kyc_flags.additional_flags.length > 0 && (
            <div style={{ marginTop: spacing[3] }}>
              <Label style={{ fontSize: '12px', marginBottom: spacing[2], display: 'block' }}>Additional Risk Indicators</Label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: spacing[2] }}>
                {classificationData.aml_kyc_flags.additional_flags.map((flag, index) => (
                  <Badge key={index} variant="red" style={{ fontSize: '11px' }}>
                    {flag.replace(/_/g, ' ')}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Key Risk Factors - Visual Enhancement */}
      {classificationData.key_risk_factors && classificationData.key_risk_factors.length > 0 && (
        <Card style={{ padding: spacing[3], marginBottom: spacing[3] }}>
          <H3 style={{ marginBottom: spacing[3], fontSize: '16px' }}>
            <Icon glyph="Warning" style={{ color: palette.red.base, marginRight: spacing[2] }} />
            Critical Risk Factors
          </H3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[3] }}>
            {classificationData.key_risk_factors.map((factor, index) => (
              <div key={index} style={{ 
                padding: spacing[3],
                border: `2px solid ${palette.red.light1}`,
                backgroundColor: palette.red.light3,
                borderRadius: '8px',
                borderLeft: `6px solid ${palette.red.base}`
              }}>
                <div style={{ display: 'flex', gap: spacing[2] }}>
                  <div style={{
                    backgroundColor: palette.red.base,
                    color: 'white',
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    flexShrink: 0,
                    marginTop: '2px'
                  }}>
                    {index + 1}
                  </div>
                  <Body style={{ fontSize: '13px', lineHeight: 1.6, color: palette.red.dark2 }}>
                    {factor}
                  </Body>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Recommendations */}
      {classificationData.recommendations && classificationData.recommendations.length > 0 && (
        <Card style={{ padding: spacing[4] }}>
          <H3 style={{ marginBottom: spacing[2], fontSize: '16px' }}>AI Recommendations</H3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[2] }}>
            {classificationData.recommendations.map((recommendation, index) => (
              <Card key={index} style={{ 
                padding: spacing[3],
                border: `1px solid ${palette.blue.light1}`,
                backgroundColor: palette.blue.light3,
                borderLeft: `4px solid ${palette.blue.base}`
              }}>
                <div style={{ display: 'flex', gap: spacing[2] }}>
                  <Icon glyph="Warning" style={{ color: palette.blue.base, marginTop: '2px' }} />
                  <Body style={{ fontSize: '12px', lineHeight: 1.6 }}>{recommendation}</Body>
                </div>
              </Card>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

/**
 * Case Report Tab - Professional PDF report generation
 */
function CaseReportTab({ investigation, workflowData }) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedReport, setGeneratedReport] = useState(null);
  const [reportError, setReportError] = useState(null);
  
  const generatePDFReport = async () => {
    setIsGenerating(true);
    setReportError(null);
    setGeneratedReport(null);
    
    try {
      console.log('🔄 Starting PDF report generation...');
      
      // Prepare data for PDF generation
      const pdfRequestData = {
        caseId: investigation?.case_id || `TEMP-${Date.now()}`,
        caseStatus: investigation?.case_status || 'investigation_complete',
        createdAt: investigation?.created_at || new Date().toISOString(),
        investigationSummary: investigation?.investigation_summary || '',
        workflowData: workflowData || {},
        workflowSummary: investigation?.workflow_summary || {}
      };
      
      console.log('📋 Sending case data for PDF generation:', pdfRequestData);
      
      // Call backend PDF generation API
      const response = await fetch('http://localhost:8001/pdf/generate-case-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(pdfRequestData)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`PDF generation failed: ${errorText}`);
      }
      
      // Get PDF as blob
      const pdfBlob = await response.blob();
      const pdfUrl = URL.createObjectURL(pdfBlob);
      const pdfSize = (pdfBlob.size / (1024 * 1024)).toFixed(2); // Convert to MB
      
      console.log('✅ PDF generated successfully:', pdfBlob.size, 'bytes');
      
      // Set generated report with real data
      setGeneratedReport({
        url: pdfUrl,
        blob: pdfBlob,
        filename: `case_report_${investigation?.case_id || Date.now()}.pdf`,
        size: `${pdfSize}MB`
      });
      
    } catch (error) {
      console.error('❌ PDF report generation failed:', error);
      setReportError(error.message || 'Failed to generate PDF report');
    } finally {
      setIsGenerating(false);
    }
  };
  
  return (
    <div style={{ marginTop: spacing[3] }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: spacing[4]
      }}>
        <div>
          <H3 style={{ margin: 0, fontSize: '16px' }}>Professional Case Report</H3>
          <Body style={{ fontSize: '12px', color: palette.gray.dark1, marginTop: spacing[1] }}>
            Generate a comprehensive PDF report using AI analysis of case data
          </Body>
        </div>
        <Button 
          variant="primary"
          size="large"
          leftGlyph={<Icon glyph="File" />}
          onClick={generatePDFReport}
          disabled={isGenerating}
        >
          {isGenerating ? 'Generating...' : 'Generate Case Report'}
        </Button>
      </div>
      
      {/* Error Display */}
      {reportError && (
        <Callout variant="warning" style={{ marginBottom: spacing[3] }}>
          <strong>Report Generation Failed:</strong> {reportError}
        </Callout>
      )}
      
      {/* Generating Status */}
      {isGenerating && (
        <Card style={{ 
          padding: spacing[4], 
          marginBottom: spacing[3],
          backgroundColor: palette.blue.light3,
          border: `1px solid ${palette.blue.light1}`
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2], justifyContent: 'center' }}>
            <Icon glyph="Refresh" style={{ color: palette.blue.base, animation: 'spin 1s linear infinite' }} />
            <Body weight="medium" style={{ color: palette.blue.dark1 }}>Generating PDF Report...</Body>
          </div>
        </Card>
      )}
      
      {/* Generated Report Display */}
      {generatedReport && (
        <Card style={{ padding: spacing[4] }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: spacing[3]
          }}>
            <div>
              <H3 style={{ margin: 0, fontSize: '16px', color: palette.green.dark1 }}>
                <Icon glyph="Checkmark" style={{ color: palette.green.base, marginRight: spacing[2] }} />
                Report Generated Successfully
              </H3>
              <Body style={{ fontSize: '12px', color: palette.gray.dark1, marginTop: spacing[1] }}>
                {generatedReport.filename} • {generatedReport.size}
              </Body>
            </div>
            <div style={{ display: 'flex', gap: spacing[2] }}>
              <Button 
                variant="primary" 
                leftGlyph={<Icon glyph="Download" />}
                onClick={() => {
                  // Download PDF
                  if (generatedReport && generatedReport.blob) {
                    const link = document.createElement('a');
                    link.href = generatedReport.url;
                    link.download = generatedReport.filename;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    console.log('✅ PDF downloaded:', generatedReport.filename);
                  }
                }}
              >
                Download PDF
              </Button>
              <Button 
                variant="default" 
                leftGlyph={<Icon glyph="Visibility" />}
                onClick={() => {
                  // Open PDF in new tab
                  if (generatedReport && generatedReport.url) {
                    window.open(generatedReport.url, '_blank');
                    console.log('✅ PDF opened in new tab');
                  }
                }}
              >
                View Report
              </Button>
            </div>
          </div>
          
          {/* PDF Preview */}
          {generatedReport && generatedReport.url ? (
            <iframe
              src={generatedReport.url}
              style={{
                width: '100%',
                height: '600px',
                border: `2px solid ${palette.gray.light1}`,
                borderRadius: '8px'
              }}
              title="PDF Report Preview"
            />
          ) : (
            <div style={{ 
              backgroundColor: palette.gray.light3,
              border: `2px dashed ${palette.gray.light1}`,
              borderRadius: '8px',
              padding: spacing[4],
              textAlign: 'center',
              minHeight: '300px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center'
            }}>
              <Icon glyph="File" size={64} style={{ color: palette.gray.base, marginBottom: spacing[2] }} />
              <Body style={{ color: palette.gray.dark1, marginBottom: spacing[1] }}>PDF Report Preview</Body>
              <Body style={{ fontSize: '12px', color: palette.gray.base }}>
                Click "Generate Case Report" to create a professional PDF report
              </Body>
            </div>
          )}
        </Card>
      )}
      
      {/* Case Data Summary */}
      <Card style={{ padding: spacing[3], marginTop: spacing[3] }}>
        <H3 style={{ marginBottom: spacing[2], fontSize: '14px' }}>Source Data Summary</H3>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', 
          gap: spacing[3],
          fontSize: '12px'
        }}>
          <div>
            <Label style={{ fontSize: '11px' }}>Case ID</Label>
            <Body style={{ fontSize: '12px', marginTop: spacing[1] }}>
              {investigation?.case_id || 'Pending'}
            </Body>
          </div>
          <div>
            <Label style={{ fontSize: '11px' }}>Entity</Label>
            <Body style={{ fontSize: '12px', marginTop: spacing[1] }}>
              {workflowData?.entityInput?.fullName || 'Unknown'}
            </Body>
          </div>
          <div>
            <Label style={{ fontSize: '11px' }}>Risk Score</Label>
            <Body style={{ fontSize: '12px', marginTop: spacing[1] }}>
              {workflowData?.classification?.risk_score || 0}/100
            </Body>
          </div>
          <div>
            <Label style={{ fontSize: '11px' }}>Data Size</Label>
            <Body style={{ fontSize: '12px', marginTop: spacing[1] }}>
              {investigation?.case_document ? 
                `${(JSON.stringify(investigation.case_document).length / 1024).toFixed(1)}KB` : 
                'Calculating...'}
            </Body>
          </div>
        </div>
      </Card>
      
      {/* Add CSS for animations */}
      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes blink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}

/**
 * Main Case Investigation Display Component
 */
function CaseInvestigationDisplay({ investigation, workflowData }) {
  const [selectedTab, setSelectedTab] = useState(0);

  // Data validation with better error handling
  const hasInvestigation = investigation && investigation.case_id;
  const hasWorkflowData = workflowData && (workflowData.entityInput || workflowData.searchResults || workflowData.classification);

  if (!hasWorkflowData && !hasInvestigation) {
    return (
      <Card style={{ padding: spacing[4], textAlign: 'center' }}>
        <Icon glyph="InfoWithCircle" size={48} style={{ color: palette.gray.base, marginBottom: spacing[2] }} />
        <H3 style={{ color: palette.gray.dark1, margin: 0, fontSize: '16px' }}>No Investigation Data Available</H3>
        <Body style={{ fontSize: '12px', color: palette.gray.dark1, marginTop: spacing[1] }}>
          Unable to generate case investigation - workflow data is required.
        </Body>
      </Card>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[4] }}>
      
      {/* Professional Header - Consistent with other workflow components */}
      <Card style={{ padding: spacing[4] }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: spacing[3]
        }}>
          <div>
            <H3 style={{ margin: 0, fontSize: '16px' }}>
              Case Investigation Complete
            </H3>
            <Body style={{ fontSize: '12px', color: palette.gray.dark1, marginTop: spacing[1] }}>
              Entity: <strong>{workflowData?.entityInput?.fullName || 'Unknown'}</strong> | 
              Type: <strong>{workflowData?.entityInput?.entityType || 'Unknown'}</strong>
            </Body>
          </div>
          <div style={{ display: 'flex', gap: spacing[2] }}>
            {hasInvestigation && (
              <Badge variant="blue" style={{ fontSize: '11px' }}>
                Case ID: {investigation.case_id}
              </Badge>
            )}
            <Badge variant="green" style={{ fontSize: '11px' }}>Complete</Badge>
          </div>
        </div>

        {/* Key Metrics Grid - Consistent with other components */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', 
          gap: spacing[3]
        }}>
          <div style={{ textAlign: 'center' }}>
            <Label style={{ fontSize: '11px' }}>Risk Level</Label>
            <Badge variant={
              workflowData?.classification?.overall_risk_level === 'high' ? 'red' :
              workflowData?.classification?.overall_risk_level === 'medium' ? 'yellow' : 'green'
            } style={{ marginTop: spacing[1] }}>
              {workflowData?.classification?.overall_risk_level?.toUpperCase() || 'PENDING'}
            </Badge>
          </div>
          
          <div style={{ textAlign: 'center' }}>
            <Label style={{ fontSize: '11px' }}>Confidence</Label>
            <Body weight="medium" style={{ fontSize: '12px', marginTop: spacing[1] }}>
              {workflowData?.classification?.confidence_score || 0}%
            </Body>
          </div>
          
          <div style={{ textAlign: 'center' }}>
            <Label style={{ fontSize: '11px' }}>Search Matches</Label>
            <Body weight="medium" style={{ fontSize: '12px', marginTop: spacing[1] }}>
              {workflowData?.searchResults?.hybridResults?.length || 0}
            </Body>
          </div>
          
          <div style={{ textAlign: 'center' }}>
            <Label style={{ fontSize: '11px' }}>Recommended Action</Label>
            <Badge variant={
              workflowData?.classification?.recommended_action?.includes('approve') ? 'green' :
              workflowData?.classification?.recommended_action?.includes('reject') ? 'red' : 'yellow'
            } style={{ marginTop: spacing[1] }}>
              {workflowData?.classification?.recommended_action?.replace(/_/g, ' ').toUpperCase() || 'REVIEW'}
            </Badge>
          </div>
        </div>
      </Card>

      {/* Investigation Results Tabs */}
      <Card style={{ padding: spacing[4] }}>
        <Tabs selected={selectedTab} setSelected={setSelectedTab}>
          
          <Tab name="Executive Summary">
            <ExecutiveSummaryTab workflowData={workflowData} investigation={investigation} />
          </Tab>
          
          <Tab name="AI Classification Analysis">
            <AIClassificationTab workflowData={workflowData} />
          </Tab>
          
          {hasInvestigation && (
            <Tab name="Case Report">
              <CaseReportTab investigation={investigation} workflowData={workflowData} />
            </Tab>
          )}
          
        </Tabs>
      </Card>


    </div>
  );
}

export default CaseInvestigationDisplay;