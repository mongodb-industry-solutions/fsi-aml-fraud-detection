/**
 * Case Investigation Display - Simple case investigation results display
 * 
 * Shows case investigation summary and MongoDB document structure
 * from the workflow data and LLM-generated investigation summary.
 */

"use client";

import React, { useState } from 'react';
import Card from '@leafygreen-ui/card';
import Button from '@leafygreen-ui/button';
import { H2, H3, Body } from '@leafygreen-ui/typography';
import { Tabs, Tab } from '@leafygreen-ui/tabs';
import Badge from '@leafygreen-ui/badge';
import Icon from '@leafygreen-ui/icon';
import { Code } from '@leafygreen-ui/code';
import Callout from '@leafygreen-ui/callout';
import { palette } from '@leafygreen-ui/palette';
import { spacing } from '@leafygreen-ui/tokens';

/**
 * Investigation Summary Tab Content
 */
function InvestigationSummaryTab({ investigation }) {
  return (
    <div style={{ marginTop: spacing[3] }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: spacing[4]
      }}>
        <H3 style={{ margin: 0 }}>Investigation Summary</H3>
        <div style={{ display: 'flex', gap: spacing[2] }}>
          <Badge variant="blue">Case ID: {investigation.case_id}</Badge>
          <Badge variant="green">Complete</Badge>
        </div>
      </div>
      
      <Card style={{ 
        padding: spacing[4],
        backgroundColor: palette.gray.light3,
        border: `1px solid ${palette.gray.light1}`
      }}>
        <Body style={{ 
          lineHeight: 1.6, 
          whiteSpace: 'pre-wrap',
          fontSize: '14px'
        }}>
          {investigation.investigation_summary}
        </Body>
      </Card>
    </div>
  );
}

/**
 * MongoDB Document Tab Content
 */
function MongoDocumentTab({ investigation }) {
  const [documentExpanded, setDocumentExpanded] = useState(false);
  
  const documentSize = JSON.stringify(investigation.case_document, null, 2).length;
  
  return (
    <div style={{ marginTop: spacing[3] }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: spacing[3]
      }}>
        <H3 style={{ margin: 0 }}>MongoDB Case Document</H3>
        <div style={{ display: 'flex', gap: spacing[2], alignItems: 'center' }}>
          <Badge variant="blue">Size: {(documentSize / 1024).toFixed(1)}KB</Badge>
          <Badge variant="green">Valid JSON</Badge>
          <Button 
            variant="default" 
            size="small"
            onClick={() => setDocumentExpanded(!documentExpanded)}
          >
            {documentExpanded ? 'Collapse' : 'Expand All'}
          </Button>
        </div>
      </div>
      
      <Callout variant="tip" style={{ marginBottom: spacing[3] }}>
        This is the complete MongoDB document structure that would be stored in the{' '}
        <code>entity_resolution_cases</code> collection. It contains all workflow data 
        from entity input through classification, plus the LLM-generated investigation summary.
      </Callout>
      
      <Code 
        language="json"
        showLineNumbers={true}
        style={{ 
          maxHeight: documentExpanded ? 'none' : '600px',
          fontSize: '11px',
          overflow: documentExpanded ? 'visible' : 'auto'
        }}
      >
        {JSON.stringify(investigation.case_document, null, 2)}
      </Code>
      
      <div style={{ 
        marginTop: spacing[3], 
        display: 'flex', 
        gap: spacing[2] 
      }}>
        <Button 
          variant="primary" 
          leftGlyph={<Icon glyph="Download" />}
          onClick={() => {
            const blob = new Blob([JSON.stringify(investigation.case_document, null, 2)], 
                                { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `case_${investigation.case_id}.json`;
            a.click();
            URL.revokeObjectURL(url);
          }}
        >
          Download JSON
        </Button>
        <Button 
          variant="default" 
          leftGlyph={<Icon glyph="Copy" />}
          onClick={() => {
            navigator.clipboard.writeText(JSON.stringify(investigation.case_document, null, 2));
          }}
        >
          Copy to Clipboard
        </Button>
      </div>
    </div>
  );
}

/**
 * Main Case Investigation Display Component
 */
function CaseInvestigationDisplay({ investigation, workflowData }) {
  const [selectedTab, setSelectedTab] = useState(0);

  if (!investigation) {
    return (
      <Card style={{ padding: spacing[4], textAlign: 'center' }}>
        <Icon glyph="InfoWithCircle" size={48} style={{ color: palette.gray.base, marginBottom: spacing[2] }} />
        <Body>No investigation data available</Body>
      </Card>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[4] }}>
      
      {/* Header */}
      <Card style={{ 
        padding: spacing[4], 
        backgroundColor: palette.green.light3,
        border: `2px solid ${palette.green.light1}`
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: spacing[3] }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            backgroundColor: palette.green.base,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Icon glyph="Checkmark" size={24} style={{ color: 'white' }} />
          </div>
          <div>
            <H2 style={{ margin: 0, color: palette.green.dark2 }}>
              Case Investigation Complete
            </H2>
            <Body style={{ color: palette.green.dark1, marginTop: spacing[1] }}>
              Investigation report generated and case document created for MongoDB storage
            </Body>
          </div>
        </div>
      </Card>

      {/* Investigation Results */}
      <Card style={{ padding: spacing[4] }}>
        <Tabs selected={selectedTab} setSelected={setSelectedTab}>
          
          <Tab name="Investigation Summary">
            <InvestigationSummaryTab investigation={investigation} />
          </Tab>
          
          <Tab name="MongoDB Document">
            <MongoDocumentTab investigation={investigation} />
          </Tab>
          
        </Tabs>
      </Card>

      {/* Case Metrics */}
      <Card style={{ padding: spacing[4] }}>
        <H3 style={{ marginBottom: spacing[3] }}>Case Summary</H3>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: spacing[3]
        }}>
          <div style={{ textAlign: 'center' }}>
            <Body style={{ fontSize: '12px', color: palette.gray.dark1 }}>Case ID</Body>
            <Body style={{ fontWeight: '600', marginTop: spacing[1] }}>
              {investigation.case_id}
            </Body>
          </div>
          
          <div style={{ textAlign: 'center' }}>
            <Body style={{ fontSize: '12px', color: palette.gray.dark1 }}>Risk Score</Body>
            <Body style={{ fontWeight: '600', marginTop: spacing[1] }}>
              {investigation.case_document?.metrics?.riskScore || 0}/100
            </Body>
          </div>
          
          <div style={{ textAlign: 'center' }}>
            <Body style={{ fontSize: '12px', color: palette.gray.dark1 }}>Recommended Action</Body>
            <Badge variant={
              investigation.case_document?.metrics?.recommendedAction === 'approve' ? 'green' :
              investigation.case_document?.metrics?.recommendedAction === 'reject' ? 'red' :
              investigation.case_document?.metrics?.recommendedAction === 'investigate' ? 'blue' : 'yellow'
            } style={{ marginTop: spacing[1] }}>
              {investigation.case_document?.metrics?.recommendedAction?.toUpperCase() || 'REVIEW'}
            </Badge>
          </div>
          
          <div style={{ textAlign: 'center' }}>
            <Body style={{ fontSize: '12px', color: palette.gray.dark1 }}>Entity</Body>
            <Body style={{ fontWeight: '600', marginTop: spacing[1] }}>
              {investigation.case_document?.metadata?.entityName || 'Unknown'}
            </Body>
          </div>
        </div>
      </Card>

    </div>
  );
}

export default CaseInvestigationDisplay;