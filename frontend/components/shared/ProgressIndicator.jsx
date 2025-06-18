'use client';

import React from 'react';
import { Body } from '@leafygreen-ui/typography';
import { spacing } from '@leafygreen-ui/tokens';
import { palette } from '@leafygreen-ui/palette';
import Card from '@leafygreen-ui/card';

const ProgressIndicator = ({ 
  currentStep = 1,
  isComplete = false,
  showWorkbench = false,
  steps = [
    'Customer Info',
    'Review Matches', 
    'Resolve Entity'
  ]
}) => {
  const getStepStatus = (stepNumber) => {
    if (isComplete) return 'complete';
    if (stepNumber < currentStep) return 'complete';
    if (stepNumber === currentStep) return 'active';
    if (stepNumber === 3 && showWorkbench) return 'active';
    return 'inactive';
  };

  const getStepStyle = (status) => {
    const baseStyle = {
      width: '40px',
      height: '40px',
      borderRadius: '50%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontWeight: 'bold',
      fontSize: '16px',
    };

    switch (status) {
      case 'complete':
        return {
          ...baseStyle,
          backgroundColor: palette.green.base,
          color: 'white',
        };
      case 'active':
        return {
          ...baseStyle,
          backgroundColor: palette.blue.base,
          color: 'white',
        };
      default:
        return {
          ...baseStyle,
          backgroundColor: palette.gray.light2,
          color: palette.gray.dark1,
          border: `2px solid ${palette.gray.light1}`,
        };
    }
  };

  const getTextColor = (status) => {
    switch (status) {
      case 'complete':
      case 'active':
        return palette.gray.dark1;
      default:
        return palette.gray.base;
    }
  };

  return (
    <Card style={{ padding: spacing[3] }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: spacing[4],
        }}
      >
        {steps.map((stepName, index) => {
          const stepNumber = index + 1;
          const status = getStepStatus(stepNumber);
          
          return (
            <div
              key={stepNumber}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: spacing[2],
              }}
            >
              <div style={getStepStyle(status)}>
                {status === 'complete' ? '✓' : stepNumber}
              </div>
              <Body style={{ color: getTextColor(status) }}>
                {isComplete && stepNumber === 3 ? 'Complete!' : stepName}
              </Body>
              
              {stepNumber < steps.length && (
                <div
                  style={{
                    width: '30px',
                    height: '2px',
                    backgroundColor: 
                      status === 'complete' ? palette.green.base : palette.gray.light2,
                    marginLeft: spacing[2],
                    marginRight: spacing[2],
                  }}
                />
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
};

export default ProgressIndicator;