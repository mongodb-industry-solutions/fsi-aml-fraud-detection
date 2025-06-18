'use client';

import React from 'react';
import { H2, Body } from '@leafygreen-ui/typography';
import { spacing } from '@leafygreen-ui/tokens';
import { palette } from '@leafygreen-ui/palette';
import Card from '@leafygreen-ui/card';
import Button from '@leafygreen-ui/button';
import Badge from '@leafygreen-ui/badge';
import Icon from '@leafygreen-ui/icon';

import OnboardingForm from '../OnboardingForm';
import PotentialMatchesList from '../PotentialMatchesList';
import EnhancedPotentialMatchesList from '../EnhancedPotentialMatchesList';
import ResolutionWorkbench from '../ResolutionWorkbench';
import ProgressIndicator from '../../shared/ProgressIndicator';
import DemoInstructions from '../../shared/DemoInstructions';

const TraditionalWorkflow = ({
  matchesData,
  selectedEntity,
  showWorkbench,
  resolutionComplete,
  useEnhancedView,
  searchMetrics,
  onMatchesFound,
  onError,
  onLoading,
  onEntitySelect,
  onResolutionComplete,
  onWorkbenchCancel,
  onReset,
  onEnhancedViewToggle
}) => {
  // Calculate current step for progress indicator
  const getCurrentStep = () => {
    if (resolutionComplete) return 3;
    if (showWorkbench) return 3;
    if (matchesData) return 2;
    return 1;
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: spacing[4],
        paddingTop: spacing[4],
      }}
    >
      {/* Step 1: Onboarding Form */}
      <div>
        <H2
          style={{
            color: palette.gray.dark2,
            marginBottom: spacing[3],
            textAlign: 'center',
          }}
        >
          Step 1: Customer Information
        </H2>
        <OnboardingForm
          onMatchesFound={onMatchesFound}
          onError={onError}
          onLoading={onLoading}
        />
      </div>

      {/* Step 2: Search Results */}
      {matchesData && (
        <div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: spacing[3],
            }}
          >
            <H2
              style={{
                color: palette.gray.dark2,
                margin: 0,
              }}
            >
              Step 2: Review Potential Matches
            </H2>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: spacing[2],
              }}
            >
              {matchesData.matches && (
                <Badge
                  variant="blue"
                  style={{ fontSize: '14px' }}
                >
                  {matchesData.matches.length}{' '}
                  {matchesData.matches.length === 1 ? 'match' : 'matches'} found
                </Badge>
              )}

              <Button
                variant="default"
                size="small"
                leftGlyph={<Icon glyph="Refresh" />}
                onClick={onEnhancedViewToggle}
              >
                {useEnhancedView ? 'Traditional View' : 'Enhanced View'}
              </Button>
            </div>
          </div>

          {useEnhancedView ? (
            <EnhancedPotentialMatchesList
              matchesData={matchesData}
              searchMetrics={searchMetrics}
              onEntitySelect={onEntitySelect}
            />
          ) : (
            <PotentialMatchesList
              matchesData={matchesData}
              onEntitySelect={onEntitySelect}
            />
          )}
        </div>
      )}

      {/* Step 3: Resolution Workbench */}
      {showWorkbench && selectedEntity && (
        <div>
          <H2
            style={{
              color: palette.gray.dark2,
              marginBottom: spacing[3],
              textAlign: 'center',
            }}
          >
            Step 3: Entity Resolution
          </H2>
          <ResolutionWorkbench
            selectedEntity={selectedEntity}
            onResolutionComplete={onResolutionComplete}
            onCancel={onWorkbenchCancel}
          />
        </div>
      )}

      {/* Resolution Complete */}
      {resolutionComplete && (
        <div>
          <H2
            style={{
              color: palette.green.dark2,
              marginBottom: spacing[3],
              textAlign: 'center',
            }}
          >
            ✅ Resolution Complete!
          </H2>
          <Card
            style={{
              padding: spacing[4],
              background: `linear-gradient(135deg, ${palette.green.light3} 0%, ${palette.green.light2} 100%)`,
              border: `1px solid ${palette.green.light1}`,
            }}
          >
            <div style={{ textAlign: 'center' }}>
              <Icon
                glyph="Checkmark"
                size="xlarge"
                fill={palette.green.base}
              />
              <H2
                style={{
                  color: palette.green.dark2,
                  marginTop: spacing[2],
                  marginBottom: spacing[2],
                }}
              >
                Entity Resolution Successful!
              </H2>
              <Body
                style={{
                  color: palette.gray.dark1,
                  marginBottom: spacing[3],
                  fontSize: '16px',
                }}
              >
                The entities have been successfully processed and relationships have been created.
                <br />
                This demonstrates the complete AML/KYC entity resolution workflow.
              </Body>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  gap: spacing[3],
                  marginTop: spacing[4],
                }}
              >
                <Button
                  variant="primary"
                  leftGlyph={<Icon glyph="Refresh" />}
                  onClick={onReset}
                >
                  Start New Resolution
                </Button>
                <Button
                  variant="default"
                  leftGlyph={<Icon glyph="Person" />}
                  onClick={() => window.open('/entities', '_blank')}
                >
                  View Entity Management
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Progress Indicator */}
      <ProgressIndicator
        currentStep={getCurrentStep()}
        isComplete={resolutionComplete}
        showWorkbench={showWorkbench}
      />

      {/* Demo Instructions */}
      <DemoInstructions />
    </div>
  );
};

export default TraditionalWorkflow;