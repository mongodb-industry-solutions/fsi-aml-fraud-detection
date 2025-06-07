"use client";

import React, { useState } from 'react';
import { resolveEntities, createTemporaryEntity } from '../../lib/entity-resolution-api';

// LeafyGreen UI Components
import Button from '@leafygreen-ui/button';
import Card from '@leafygreen-ui/card';
import { H2, H3, Body, InlineCode } from '@leafygreen-ui/typography';
import { spacing } from '@leafygreen-ui/tokens';
import { palette } from '@leafygreen-ui/palette';
import Icon from '@leafygreen-ui/icon';
import Banner from '@leafygreen-ui/banner';
import Modal from '@leafygreen-ui/modal';
import TextArea from '@leafygreen-ui/text-area';
import { Toast } from '@leafygreen-ui/toast';

import styles from './ResolutionWorkbench.module.css';

const ResolutionWorkbench = ({ 
  inputData, 
  selectedMatch, 
  onResolutionComplete, 
  onCancel 
}) => {
  const [isResolving, setIsResolving] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [resolutionType, setResolutionType] = useState(null);
  const [notes, setNotes] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  if (!inputData || !selectedMatch) {
    return null;
  }

  const tempEntity = createTemporaryEntity(inputData);

  const handleResolutionDecision = (decision) => {
    setResolutionType(decision);
    setShowConfirmation(true);
  };

  const confirmResolution = async () => {
    setIsResolving(true);
    
    try {
      const resolutionData = {
        sourceEntityId: tempEntity.entityId,
        targetMasterEntityId: selectedMatch.entityId,
        decision: resolutionType,
        matchConfidence: selectedMatch.searchScore / 20, // Convert Atlas score to 0-1 range
        matchedAttributes: selectedMatch.matchReasons || ['name'],
        resolvedBy: 'demo_analyst',
        notes: notes || `Resolution decision: ${resolutionType}`
      };

      const result = await resolveEntities(resolutionData);
      
      setToastMessage(`✅ Entities ${resolutionType === 'confirmed_match' ? 'merged' : 'processed'} successfully!`);
      setShowToast(true);
      
      setTimeout(() => {
        onResolutionComplete?.(result);
      }, 2000);

    } catch (error) {
      console.error('Resolution failed:', error);
      setToastMessage(`❌ Resolution failed: ${error.message}`);
      setShowToast(true);
    } finally {
      setIsResolving(false);
      setShowConfirmation(false);
    }
  };

  const getComparisonData = () => {
    return [
      {
        field: 'Full Name',
        input: inputData.name_full,
        match: selectedMatch.name_full,
        isMatch: inputData.name_full.toLowerCase().includes(selectedMatch.name_full.toLowerCase().split(' ')[0].toLowerCase())
      },
      {
        field: 'Date of Birth',
        input: inputData.date_of_birth || 'Not provided',
        match: selectedMatch.dateOfBirth || 'Not provided',
        isMatch: inputData.date_of_birth === selectedMatch.dateOfBirth
      },
      {
        field: 'Address',
        input: inputData.address_full || 'Not provided',
        match: selectedMatch.primaryAddress_full || 'Not provided',
        isMatch: inputData.address_full && selectedMatch.primaryAddress_full && 
                 inputData.address_full.toLowerCase().includes('oak')
      },
      {
        field: 'Entity Type',
        input: 'Individual',
        match: selectedMatch.entityType || 'Individual',
        isMatch: true
      }
    ];
  };

  const comparisonData = getComparisonData();
  const matchingFields = comparisonData.filter(item => item.isMatch).length;

  return (
    <div className={styles.workbench}>
      {/* Header */}
      <Card style={{ marginBottom: spacing[4] }}>
        <div style={{ padding: spacing[4] }}>
          <H2 style={{ color: palette.gray.dark3, textAlign: 'center', marginBottom: spacing[2] }}>
            🔍 Entity Resolution Workbench
          </H2>
          <Body style={{ color: palette.gray.dark1, textAlign: 'center' }}>
            Compare entities and make resolution decisions with confidence
          </Body>
        </div>
      </Card>

      {/* Side-by-Side Comparison */}
      <div className={styles.comparisonContainer}>
        {/* Input Data Column */}
        <Card className={styles.entityCard}>
          <div style={{ padding: spacing[3] }}>
            <H3 style={{ color: palette.blue.dark1, marginBottom: spacing[3] }}>
              📝 New Input Data
            </H3>
            <div className={styles.entityDetails}>
              <div className={styles.entityHeader}>
                <InlineCode>{tempEntity.entityId}</InlineCode>
                <Body style={{ fontWeight: 'bold', fontSize: '18px' }}>
                  {inputData.name_full}
                </Body>
              </div>
              
              <div className={styles.attributesList}>
                <div className={styles.attribute}>
                  <Body style={{ fontWeight: 'bold', color: palette.gray.dark1 }}>DOB:</Body>
                  <Body>{inputData.date_of_birth || 'Not provided'}</Body>
                </div>
                <div className={styles.attribute}>
                  <Body style={{ fontWeight: 'bold', color: palette.gray.dark1 }}>Address:</Body>
                  <Body>{inputData.address_full || 'Not provided'}</Body>
                </div>
                <div className={styles.attribute}>
                  <Body style={{ fontWeight: 'bold', color: palette.gray.dark1 }}>Identifier:</Body>
                  <Body>{inputData.identifier_value || 'Not provided'}</Body>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* VS Indicator */}
        <div className={styles.vsIndicator}>
          <div className={styles.vsCircle}>
            <Body style={{ fontWeight: 'bold', color: 'white' }}>VS</Body>
          </div>
          <div className={styles.matchScore}>
            <Body style={{ fontSize: '12px', color: palette.gray.dark1 }}>
              Match Score: <strong>{selectedMatch.searchScore.toFixed(2)}</strong>
            </Body>
          </div>
        </div>

        {/* Selected Match Column */}
        <Card className={styles.entityCard}>
          <div style={{ padding: spacing[3] }}>
            <H3 style={{ color: palette.green.dark1, marginBottom: spacing[3] }}>
              🎯 Selected Match
            </H3>
            <div className={styles.entityDetails}>
              <div className={styles.entityHeader}>
                <InlineCode>{selectedMatch.entityId}</InlineCode>
                <Body style={{ fontWeight: 'bold', fontSize: '18px' }}>
                  {selectedMatch.name_full}
                </Body>
              </div>
              
              <div className={styles.attributesList}>
                <div className={styles.attribute}>
                  <Body style={{ fontWeight: 'bold', color: palette.gray.dark1 }}>DOB:</Body>
                  <Body>{selectedMatch.dateOfBirth || 'Not provided'}</Body>
                </div>
                <div className={styles.attribute}>
                  <Body style={{ fontWeight: 'bold', color: palette.gray.dark1 }}>Address:</Body>
                  <Body>{selectedMatch.primaryAddress_full || 'Not provided'}</Body>
                </div>
                <div className={styles.attribute}>
                  <Body style={{ fontWeight: 'bold', color: palette.gray.dark1 }}>Risk Score:</Body>
                  <Body style={{ fontWeight: 'bold' }}>
                    {selectedMatch.riskAssessment_overall_score || 0}
                  </Body>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Attribute Comparison Table */}
      <Card style={{ marginTop: spacing[4], marginBottom: spacing[4] }}>
        <div style={{ padding: spacing[4] }}>
          <H3 style={{ color: palette.gray.dark2, marginBottom: spacing[3] }}>
            ⚖️ Attribute Comparison ({matchingFields}/{comparisonData.length} matches)
          </H3>
          
          <div className={styles.comparisonTable}>
            <div className={styles.tableHeader}>
              <Body style={{ fontWeight: 'bold' }}>Field</Body>
              <Body style={{ fontWeight: 'bold' }}>Input Data</Body>
              <Body style={{ fontWeight: 'bold' }}>Existing Entity</Body>
              <Body style={{ fontWeight: 'bold' }}>Match Status</Body>
            </div>
            
            {comparisonData.map((item, index) => (
              <div key={index} className={`${styles.tableRow} ${item.isMatch ? styles.matchingRow : styles.differentRow}`}>
                <Body style={{ fontWeight: 'bold', color: palette.gray.dark2 }}>
                  {item.field}
                </Body>
                <Body>{item.input}</Body>
                <Body>{item.match}</Body>
                <div style={{ display: 'flex', alignItems: 'center', gap: spacing[1] }}>
                  <Icon 
                    glyph={item.isMatch ? "Checkmark" : "X"} 
                    fill={item.isMatch ? palette.green.base : palette.red.base}
                    size="small"
                  />
                  <Body style={{ 
                    color: item.isMatch ? palette.green.dark2 : palette.red.dark1,
                    fontWeight: 'bold'
                  }}>
                    {item.isMatch ? 'Match' : 'Different'}
                  </Body>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Resolution Actions */}
      <Card>
        <div style={{ padding: spacing[4] }}>
          <H3 style={{ color: palette.gray.dark2, marginBottom: spacing[3], textAlign: 'center' }}>
            🎯 Resolution Decision
          </H3>
          
          <div className={styles.actionButtons}>
            <Button
              variant="primary"
              size="large"
              leftGlyph={<Icon glyph="Checkmark" />}
              onClick={() => handleResolutionDecision('confirmed_match')}
              disabled={isResolving}
            >
              Confirm Match & Merge
            </Button>
            
            <Button
              variant="default"
              size="large"
              leftGlyph={<Icon glyph="X" />}
              onClick={() => handleResolutionDecision('not_a_match')}
              disabled={isResolving}
            >
              Mark as Not a Match
            </Button>
            
            <Button
              variant="default"
              size="large"
              leftGlyph={<Icon glyph="Warning" />}
              onClick={() => handleResolutionDecision('needs_review')}
              disabled={isResolving}
            >
              Needs Review
            </Button>
          </div>

          <div style={{ textAlign: 'center', marginTop: spacing[3] }}>
            <Button
              variant="default"
              onClick={onCancel}
              disabled={isResolving}
            >
              Cancel
            </Button>
          </div>
        </div>
      </Card>

      {/* Confirmation Modal */}
      <Modal 
        open={showConfirmation} 
        setOpen={setShowConfirmation}
        size="large"
      >
        <div style={{ padding: spacing[4] }}>
          <H3 style={{ marginBottom: spacing[3] }}>
            Confirm Resolution Decision
          </H3>
          
          <Body style={{ marginBottom: spacing[3] }}>
            Are you sure you want to <strong>{resolutionType?.replace('_', ' ')}</strong> these entities?
            <br />
            <br />
            <strong>Input:</strong> {inputData.name_full}
            <br />
            <strong>Match:</strong> {selectedMatch.name_full}
          </Body>

          <TextArea
            label="Notes (optional)"
            placeholder="Add any additional notes about this resolution decision..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            style={{ marginBottom: spacing[3] }}
          />

          <div style={{ display: 'flex', gap: spacing[2], justifyContent: 'flex-end' }}>
            <Button
              variant="default"
              onClick={() => setShowConfirmation(false)}
              disabled={isResolving}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={confirmResolution}
              disabled={isResolving}
              leftGlyph={isResolving ? <Icon glyph="Refresh" /> : <Icon glyph="Checkmark" />}
            >
              {isResolving ? 'Processing...' : 'Confirm Decision'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Toast Notification */}
      <Toast
        open={showToast}
        close={() => setShowToast(false)}
        title="Resolution Status"
        description={toastMessage}
        variant={toastMessage.includes('✅') ? 'success' : 'warning'}
      />
    </div>
  );
};

export default ResolutionWorkbench;