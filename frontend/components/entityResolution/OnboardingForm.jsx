"use client";

import React, { useState } from 'react';
import { 
  findEntityMatches, 
  validateOnboardingInput, 
  getDemoData, 
  getFuzzyDemoData, 
  getEnhancedDemoScenarios,
  getDemoDataByScenario,
  getScenarioInfo,
  EntityResolutionAPIError 
} from '../../lib/entity-resolution-api';

// LeafyGreen UI Components
import Button from '@leafygreen-ui/button';
import TextInput from '@leafygreen-ui/text-input';
import { Select, Option } from '@leafygreen-ui/select';
import { FormField } from '@leafygreen-ui/form-field';
import Banner from '@leafygreen-ui/banner';
import { H2, H3, Body } from '@leafygreen-ui/typography';
import Card from '@leafygreen-ui/card';
import { spacing } from '@leafygreen-ui/tokens';
import { palette } from '@leafygreen-ui/palette';
import Icon from '@leafygreen-ui/icon';

import styles from './OnboardingForm.module.css';

const OnboardingForm = ({ onMatchesFound, onError, onLoading }) => {
  const [formData, setFormData] = useState({
    name_full: '',
    date_of_birth: '',
    address_full: '',
    identifier_value: ''
  });

  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [searchPerformed, setSearchPerformed] = useState(false);
  const [selectedScenario, setSelectedScenario] = useState('exact_match');
  const [showScenarioInfo, setShowScenarioInfo] = useState(false);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Clear field-specific error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: undefined
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate input
    const validation = validateOnboardingInput(formData);
    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    setIsLoading(true);
    setErrors({});
    onLoading?.(true);

    try {
      const startTime = Date.now();
      const response = await findEntityMatches(formData, 10);
      const duration = Date.now() - startTime;

      setSearchPerformed(true);
      onMatchesFound?.({
        ...response,
        searchDuration: duration,
        inputData: formData
      });

    } catch (error) {
      console.error('Error finding matches:', error);
      
      if (error instanceof EntityResolutionAPIError) {
        setErrors({ api: error.message });
        onError?.(error.message);
      } else {
        setErrors({ api: 'Network error occurred. Please try again.' });
        onError?.('Network error occurred');
      }
    } finally {
      setIsLoading(false);
      onLoading?.(false);
    }
  };

  const handleDemoData = (useFuzzy = false) => {
    const demoData = useFuzzy ? getFuzzyDemoData() : getDemoData();
    setFormData(demoData);
    setErrors({});
    setSearchPerformed(false);
  };

  const handleScenarioSelect = (scenarioId) => {
    setSelectedScenario(scenarioId);
    const demoData = getDemoDataByScenario(scenarioId);
    setFormData(demoData);
    setErrors({});
    setSearchPerformed(false);
    setShowScenarioInfo(true);
    // Hide scenario info after 3 seconds
    setTimeout(() => setShowScenarioInfo(false), 3000);
  };

  const enhancedScenarios = getEnhancedDemoScenarios();
  const currentScenarioInfo = getScenarioInfo(selectedScenario);

  const handleReset = () => {
    setFormData({
      name_full: '',
      date_of_birth: '',
      address_full: '',
      identifier_value: ''
    });
    setErrors({});
    setSearchPerformed(false);
  };

  const isFormValid = formData.name_full.trim().length >= 2;

  return (
    <Card className={styles.onboardingCard}>
      <div style={{ padding: spacing[4] }}>
        <div className={styles.header}>
          <H2 style={{ color: palette.gray.dark3, marginBottom: spacing[2] }}>
            New Customer Onboarding
          </H2>
          <Body style={{ color: palette.gray.dark1, marginBottom: spacing[4] }}>
            Enter customer details to check for potential matches using intelligent fuzzy search
          </Body>
        </div>

        {/* Enhanced Demo Scenarios */}
        <div style={{ marginBottom: spacing[4] }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: spacing[3], marginBottom: spacing[3] }}>
            <div style={{ flex: 1, maxWidth: '400px' }}>
              <Select
                label="Demo Scenarios"
                description="Choose a demo scenario to explore different matching capabilities"
                value={selectedScenario}
                onChange={handleScenarioSelect}
                disabled={isLoading}
              >
                {enhancedScenarios.map(scenario => (
                  <Option key={scenario.id} value={scenario.id}>
                    {scenario.icon} {scenario.name}
                  </Option>
                ))}
              </Select>
            </div>
            
            <div style={{ display: 'flex', gap: spacing[2] }}>
              <Button
                variant="default"
                size="small"
                leftGlyph={<Icon glyph="Beaker" />}
                onClick={() => handleDemoData(false)}
                disabled={isLoading}
              >
                Classic Demo
              </Button>
              <Button
                variant="default"
                size="small"
                leftGlyph={<Icon glyph="Star" />}
                onClick={() => handleDemoData(true)}
                disabled={isLoading}
              >
                Fuzzy Demo
              </Button>
            </div>
          </div>

          {/* Scenario Information Panel */}
          {currentScenarioInfo && (showScenarioInfo || selectedScenario !== 'exact_match') && (
            <Card style={{ 
              padding: spacing[3], 
              backgroundColor: palette.blue.light3,
              border: `1px solid ${palette.blue.light1}`,
              marginBottom: spacing[3]
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: spacing[2] }}>
                <div style={{ fontSize: '24px' }}>{currentScenarioInfo.icon}</div>
                <div style={{ flex: 1 }}>
                  <H3 style={{ color: palette.blue.dark2, marginBottom: spacing[1], fontSize: '16px' }}>
                    {currentScenarioInfo.name}
                  </H3>
                  <Body style={{ color: palette.gray.dark1, fontSize: '14px', marginBottom: spacing[1] }}>
                    {currentScenarioInfo.description}
                  </Body>
                  <Body style={{ color: palette.blue.dark1, fontSize: '12px', fontStyle: 'italic' }}>
                    Expected: {currentScenarioInfo.expectedResults}
                  </Body>
                </div>
              </div>
            </Card>
          )}
        </div>

        {/* API Error Banner */}
        {errors.api && (
          <div style={{ marginBottom: spacing[3] }}>
            <Banner variant="danger">
              {errors.api}
            </Banner>
          </div>
        )}

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formRow}>
            <FormField>
              <TextInput
                label="Full Name *"
                description="Customer's complete legal name"
                placeholder="e.g., Samantha Miller"
                value={formData.name_full}
                onChange={(e) => handleInputChange('name_full', e.target.value)}
                state={errors.name_full ? 'error' : 'none'}
                errorMessage={errors.name_full}
                disabled={isLoading}
                aria-required="true"
              />
            </FormField>
          </div>

          <div className={styles.formRow}>
            <FormField>
              <TextInput
                label="Date of Birth"
                description="Format: YYYY-MM-DD"
                placeholder="1985-07-15"
                value={formData.date_of_birth}
                onChange={(e) => handleInputChange('date_of_birth', e.target.value)}
                state={errors.date_of_birth ? 'error' : 'none'}
                errorMessage={errors.date_of_birth}
                disabled={isLoading}
                type="date"
              />
            </FormField>
          </div>

          <div className={styles.formRow}>
            <FormField>
              <TextInput
                label="Full Address"
                description="Complete residential or business address"
                placeholder="456 Oak Avenue, Springfield, IL 62704"
                value={formData.address_full}
                onChange={(e) => handleInputChange('address_full', e.target.value)}
                state={errors.address_full ? 'error' : 'none'}
                errorMessage={errors.address_full}
                disabled={isLoading}
              />
            </FormField>
          </div>

          <div className={styles.formRow}>
            <FormField>
              <TextInput
                label="Primary Identifier"
                description="SSN, Passport, or other government ID (optional)"
                placeholder="SH609753513"
                value={formData.identifier_value}
                onChange={(e) => handleInputChange('identifier_value', e.target.value)}
                disabled={isLoading}
              />
            </FormField>
          </div>

          <div className={styles.formActions}>
            <Button
              variant="primary"
              size="large"
              type="submit"
              disabled={!isFormValid || isLoading}
              leftGlyph={isLoading ? <Icon glyph="Refresh" /> : <Icon glyph="MagnifyingGlass" />}
            >
              {isLoading ? 'Searching...' : 'Check for Duplicates'}
            </Button>

            <Button
              variant="default"
              size="large"
              onClick={handleReset}
              disabled={isLoading}
              style={{ marginLeft: spacing[3] }}
            >
              Reset Form
            </Button>
          </div>

          {/* Search Performance Indicator */}
          {searchPerformed && (
            <div className={styles.searchInfo}>
              <Body style={{ color: palette.gray.dark1, fontSize: '14px' }}>
                <Icon glyph="Checkmark" fill={palette.green.base} size="small" />
                <span style={{ marginLeft: spacing[1] }}>
                  Search completed successfully
                </span>
              </Body>
            </div>
          )}
        </form>

        {/* Wow Moment Callout */}
        <div className={styles.wowMoment}>
          <H3 style={{ color: palette.blue.dark1, marginBottom: spacing[2] }}>
            🎯 Intelligent Fuzzy Matching
          </H3>
          <Body style={{ color: palette.gray.dark1, fontSize: '14px' }}>
            Our Atlas Search technology finds matches even with variations in names, addresses, 
            and dates. Try the "Fuzzy Match Demo" to see how "Samantha X. Miller" 
            matches "Samantha Miller" and "Sam Brittany Miller"!
          </Body>
        </div>
      </div>
    </Card>
  );
};

export default OnboardingForm;