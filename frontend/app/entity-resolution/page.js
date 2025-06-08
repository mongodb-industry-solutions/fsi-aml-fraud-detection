'use client';

import React, { useState } from 'react';
import {
  H1,
  H2,
  H3,
  Body,
  Subtitle,
} from '@leafygreen-ui/typography';
import { spacing } from '@leafygreen-ui/tokens';
import { palette } from '@leafygreen-ui/palette';
import Card from '@leafygreen-ui/card';
import Banner from '@leafygreen-ui/banner';
import Button from '@leafygreen-ui/button';
import Badge from '@leafygreen-ui/badge';
import Icon from '@leafygreen-ui/icon';
import { Tabs, Tab } from '@leafygreen-ui/tabs';

import OnboardingForm from '../../components/entityResolution/OnboardingForm';
import PotentialMatchesList from '../../components/entityResolution/PotentialMatchesList';
import EnhancedPotentialMatchesList from '../../components/entityResolution/EnhancedPotentialMatchesList';
import ResolutionWorkbench from '../../components/entityResolution/ResolutionWorkbench';
import UnifiedSearchInterface from '../../components/entityResolution/UnifiedSearchInterface';
import CombinedIntelligencePanel from '../../components/entityResolution/CombinedIntelligencePanel';

const EntityResolutionPage = () => {
  // Traditional workflow state
  const [matchesData, setMatchesData] = useState(null);
  const [selectedEntity, setSelectedEntity] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showWorkbench, setShowWorkbench] = useState(false);
  const [resolutionComplete, setResolutionComplete] = useState(false);
  const [useEnhancedView, setUseEnhancedView] = useState(true);
  const [searchMetrics, setSearchMetrics] = useState(null);

  // Unified search state
  const [activeTab, setActiveTab] = useState(0);
  const [unifiedSearchResults, setUnifiedSearchResults] =
    useState(null);

  const handleMatchesFound = (data) => {
    setMatchesData(data);
    setSelectedEntity(null);
    setShowWorkbench(false);
    setResolutionComplete(false);
    setError(null);

    // Capture search metrics for enhanced view
    if (data.searchDuration) {
      setSearchMetrics({
        execution_time: data.searchDuration,
        query_type: 'atlas_search_compound',
        search_fields: [
          'name.full',
          'addresses.full',
          'dateOfBirth',
          'identifiers.value',
        ].filter((field) => {
          const inputData = data.inputData || {};
          return (
            inputData.name_full ||
            inputData.address_full ||
            inputData.date_of_birth ||
            inputData.identifier_value
          );
        }),
      });
    }
  };

  const handleResolutionAction = async (action, entityIds) => {
    console.log(
      `Resolution action: ${action} for entities:`,
      entityIds
    );
    // Implement resolution action logic here
    // This could call your resolution API
  };

  const handleEntitySelect = (entity) => {
    setSelectedEntity(entity);
    setShowWorkbench(true);
    setResolutionComplete(false);
  };

  const handleError = (errorMessage) => {
    setError(errorMessage);
    setMatchesData(null);
    setSelectedEntity(null);
    setShowWorkbench(false);
    setResolutionComplete(false);
  };

  const handleLoading = (loading) => {
    setIsLoading(loading);
    if (loading) {
      setError(null);
    }
  };

  const handleResolutionComplete = (result) => {
    setResolutionComplete(true);
    setShowWorkbench(false);
    console.log('Resolution completed:', result);
  };

  const handleWorkbenchCancel = () => {
    setShowWorkbench(false);
    setSelectedEntity(null);
  };

  const handleReset = () => {
    setMatchesData(null);
    setSelectedEntity(null);
    setShowWorkbench(false);
    setResolutionComplete(false);
    setError(null);
  };

  // Unified search handlers
  const handleUnifiedSearchResults = (data) => {
    setUnifiedSearchResults(data.results);
    setError(null);
  };


  const handleUnifiedSearchError = (errorMessage) => {
    setError(errorMessage);
    setUnifiedSearchResults(null);
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: palette.gray.light3,
        padding: spacing[4],
      }}
    >
      {/* Page Header */}
      <div
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
          marginBottom: spacing[4],
        }}
      >
        <Card style={{ padding: spacing[4] }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              marginBottom: spacing[3],
            }}
          >
            <div style={{ textAlign: 'center', flex: 1 }}>
              <div style={{ marginBottom: spacing[3] }}>
                <Icon
                  glyph="University"
                  size="large"
                  fill={palette.blue.base}
                />
              </div>
              <H1
                style={{
                  color: palette.gray.dark3,
                  marginBottom: spacing[2],
                  fontSize: '36px',
                }}
              >
                ⚡ Enhanced Entity Resolution Intelligence
              </H1>
              <Body
                style={{
                  color: palette.gray.dark1,
                  fontSize: '18px',
                  maxWidth: '600px',
                  margin: '0 auto',
                }}
              >
                Complete entity resolution platform combining MongoDB
                Atlas Search and Vector Search. Experience traditional
                fuzzy matching and AI-powered semantic discovery
                together.
              </Body>
            </div>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-end',
                gap: spacing[2],
              }}
            >
              <Badge
                variant={useEnhancedView ? 'green' : 'lightgray'}
              >
                {useEnhancedView ? 'Enhanced View' : 'Standard View'}
              </Badge>
              <Button
                variant="default"
                size="small"
                onClick={() => setUseEnhancedView(!useEnhancedView)}
                leftGlyph={
                  <Icon
                    glyph={
                      useEnhancedView ? 'Megaphone' : 'University'
                    }
                  />
                }
              >
                {useEnhancedView
                  ? 'Switch to Standard'
                  : 'Switch to Enhanced'}
              </Button>

              {searchMetrics && (
                <div
                  style={{
                    fontSize: '12px',
                    color: palette.gray.dark1,
                    textAlign: 'right',
                    marginTop: spacing[1],
                  }}
                >
                  <Body style={{ fontSize: '12px' }}>
                    Last search: {searchMetrics.execution_time}ms
                  </Body>
                  <Body
                    style={{
                      fontSize: '11px',
                      color: palette.gray.base,
                    }}
                  >
                    Fields: {searchMetrics.search_fields?.length || 0}
                  </Body>
                </div>
              )}
            </div>
          </div>
        </Card>
      </div>

      {/* Error Banner */}
      {error && (
        <div
          style={{
            maxWidth: '1200px',
            margin: '0 auto',
            marginBottom: spacing[4],
          }}
        >
          <Banner variant="danger">
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: spacing[2],
              }}
            >
              <Icon glyph="Warning" />
              <span>{error}</span>
            </div>
          </Banner>
        </div>
      )}

      {/* Main Content with Tabs */}
      <div
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
        }}
      >
        <Tabs
          selected={activeTab}
          setSelected={setActiveTab}
          style={{ marginBottom: spacing[4] }}
          aria-label="Entity Resolution Interface Modes"
        >
          <Tab name="Traditional Workflow">
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
                  onMatchesFound={handleMatchesFound}
                  onError={handleError}
                  onLoading={handleLoading}
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
                          {matchesData.matches.length === 1
                            ? 'match'
                            : 'matches'}{' '}
                          found
                        </Badge>
                      )}

                      {searchMetrics && (
                        <Badge
                          variant="lightgray"
                          style={{ fontSize: '12px' }}
                        >
                          {searchMetrics.execution_time}ms
                        </Badge>
                      )}
                    </div>
                  </div>

                  {useEnhancedView ? (
                    <EnhancedPotentialMatchesList
                      matchesData={{
                        ...matchesData,
                        searchMetadata: searchMetrics,
                      }}
                      onEntitySelect={handleEntitySelect}
                      selectedEntityId={selectedEntity?.entityId}
                      isLoading={isLoading}
                      onResolutionAction={handleResolutionAction}
                    />
                  ) : (
                    <PotentialMatchesList
                      matchesData={matchesData}
                      onEntitySelect={handleEntitySelect}
                      selectedEntityId={selectedEntity?.entityId}
                      isLoading={isLoading}
                    />
                  )}
                </div>
              )}

              {/* Step 3: Resolution Workbench */}
              {showWorkbench && selectedEntity && matchesData && (
                <div>
                  <H2
                    style={{
                      color: palette.gray.dark2,
                      marginBottom: spacing[3],
                      textAlign: 'center',
                    }}
                  >
                    Step 3: Entity Resolution Workbench
                  </H2>
                  <ResolutionWorkbench
                    inputData={matchesData.inputData}
                    selectedMatch={selectedEntity}
                    onResolutionComplete={handleResolutionComplete}
                    onCancel={handleWorkbenchCancel}
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
                        The entities have been successfully processed
                        and relationships have been created.
                        <br />
                        This demonstrates the complete AML/KYC entity
                        resolution workflow.
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
                          onClick={handleReset}
                        >
                          Start New Resolution
                        </Button>
                        <Button
                          variant="default"
                          leftGlyph={<Icon glyph="Person" />}
                          onClick={() =>
                            window.open('/entities', '_blank')
                          }
                        >
                          View Entity Management
                        </Button>
                      </div>
                    </div>
                  </Card>
                </div>
              )}

              {/* Progress Indicator */}
              <Card style={{ padding: spacing[3] }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: spacing[4],
                  }}
                >
                  {/* Step 1 */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: spacing[2],
                    }}
                  >
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        backgroundColor: palette.green.base,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontWeight: 'bold',
                      }}
                    >
                      1
                    </div>
                    <Body style={{ color: palette.gray.dark1 }}>
                      Input Data
                    </Body>
                  </div>

                  {/* Connector */}
                  <div
                    style={{
                      width: '40px',
                      height: '2px',
                      backgroundColor: matchesData
                        ? palette.green.base
                        : palette.gray.light2,
                    }}
                  />

                  {/* Step 2 */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: spacing[2],
                    }}
                  >
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        backgroundColor: matchesData
                          ? palette.green.base
                          : palette.gray.light2,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: matchesData
                          ? 'white'
                          : palette.gray.dark1,
                        fontWeight: 'bold',
                      }}
                    >
                      2
                    </div>
                    <Body
                      style={{
                        color: matchesData
                          ? palette.gray.dark1
                          : palette.gray.base,
                      }}
                    >
                      Find Matches
                    </Body>
                  </div>

                  {/* Connector */}
                  <div
                    style={{
                      width: '40px',
                      height: '2px',
                      backgroundColor: selectedEntity
                        ? palette.green.base
                        : palette.gray.light2,
                    }}
                  />

                  {/* Step 3 */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: spacing[2],
                    }}
                  >
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        backgroundColor:
                          showWorkbench || resolutionComplete
                            ? palette.green.base
                            : palette.gray.light2,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color:
                          showWorkbench || resolutionComplete
                            ? 'white'
                            : palette.gray.dark1,
                        fontWeight: 'bold',
                      }}
                    >
                      {resolutionComplete ? '✓' : '3'}
                    </div>
                    <Body
                      style={{
                        color:
                          showWorkbench || resolutionComplete
                            ? palette.gray.dark1
                            : palette.gray.base,
                      }}
                    >
                      {resolutionComplete
                        ? 'Complete!'
                        : 'Resolve Entity'}
                    </Body>
                  </div>
                </div>
              </Card>

              {/* Demo Instructions */}
              <Card
                style={{
                  padding: spacing[4],
                  background:
                    'linear-gradient(135deg, #f0f7ff 0%, #e6f4ff 100%)',
                  border: `1px solid ${palette.blue.light1}`,
                }}
              >
                <H2
                  style={{
                    color: palette.blue.dark1,
                    marginBottom: spacing[3],
                    textAlign: 'center',
                  }}
                >
                  🎪 Try the Demo!
                </H2>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns:
                      'repeat(auto-fit, minmax(280px, 1fr))',
                    gap: spacing[3],
                  }}
                >
                  <div>
                    <Body
                      style={{
                        fontWeight: 'bold',
                        color: palette.blue.dark2,
                      }}
                    >
                      Perfect Match Demo:
                    </Body>
                    <Body
                      style={{
                        color: palette.gray.dark1,
                        fontSize: '14px',
                      }}
                    >
                      Click "Load Demo Data" to see exact entity
                      matching with Samantha Miller.
                    </Body>
                  </div>
                  <div>
                    <Body
                      style={{
                        fontWeight: 'bold',
                        color: palette.blue.dark2,
                      }}
                    >
                      Fuzzy Matching Demo:
                    </Body>
                    <Body
                      style={{
                        color: palette.gray.dark1,
                        fontSize: '14px',
                      }}
                    >
                      Click "Fuzzy Match Demo" to see how "Samantha X.
                      Miller" finds similar entities.
                    </Body>
                  </div>
                  <div>
                    <Body
                      style={{
                        fontWeight: 'bold',
                        color: palette.blue.dark2,
                      }}
                    >
                      Enhanced View Features:
                    </Body>
                    <Body
                      style={{
                        color: palette.gray.dark1,
                        fontSize: '14px',
                      }}
                    >
                      Try the Enhanced View for advanced sorting, bulk
                      actions, and match intelligence.
                    </Body>
                  </div>
                  <div>
                    <Body
                      style={{
                        fontWeight: 'bold',
                        color: palette.blue.dark2,
                      }}
                    >
                      Expected Results:
                    </Body>
                    <Body
                      style={{
                        color: palette.gray.dark1,
                        fontSize: '14px',
                      }}
                    >
                      You should see 2-4 matches including "Sam
                      Brittany Miller" as a potential duplicate.
                    </Body>
                  </div>
                </div>
              </Card>
            </div>
          </Tab>

          <Tab name="Unified Search Demo">
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: spacing[4],
                paddingTop: spacing[4],
              }}
            >

              {/* Unified Search Interface */}
              <UnifiedSearchInterface
                onSearchResults={handleUnifiedSearchResults}
                onError={handleUnifiedSearchError}
              />

              {/* Combined Intelligence Panel */}
              {unifiedSearchResults && (
                <CombinedIntelligencePanel
                  searchResults={unifiedSearchResults}
                  isVisible={true}
                />
              )}


            </div>
          </Tab>
        </Tabs>
      </div>
    </div>
  );
};

export default EntityResolutionPage;
