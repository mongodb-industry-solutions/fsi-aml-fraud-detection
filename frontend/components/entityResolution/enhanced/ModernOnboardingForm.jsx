"use client";

import React, { useState } from 'react';
import Card from '@leafygreen-ui/card';
import Button from '@leafygreen-ui/button';
import TextInput from '@leafygreen-ui/text-input';
import TextArea from '@leafygreen-ui/text-area';
import { Select, Option } from '@leafygreen-ui/select';
import { H2, H3, Body, Label } from '@leafygreen-ui/typography';
import Icon from '@leafygreen-ui/icon';
import Banner from '@leafygreen-ui/banner';
import { palette } from '@leafygreen-ui/palette';
import { spacing } from '@leafygreen-ui/tokens';
import { enhancedEntityResolutionAPI } from '@/lib/enhanced-entity-resolution-api';

/**
 * Modern Onboarding Form
 * 
 * Enhanced entity input form with modern aesthetics inspired by entity detail page.
 * Features comprehensive validation, demo scenarios, and intelligent field suggestions.
 */
function ModernOnboardingForm({ onSubmit, isLoading = false }) {
  const [formData, setFormData] = useState({
    fullName: '',
    address: '',
    entityType: 'individual'
  });
  
  const [errors, setErrors] = useState({});
  const [demoScenarios, setDemoScenarios] = useState([]);
  const [loadingDemo, setLoadingDemo] = useState(false);
  const [categoryIndices, setCategoryIndices] = useState({});

  /**
   * Handle form field changes
   */
  const handleChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: null
      }));
    }
  };

  /**
   * Validate form data
   */
  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.fullName?.trim()) {
      newErrors.fullName = 'Full name is required';
    }
    
    if (!formData.entityType) {
      newErrors.entityType = 'Entity type is required';
    }
    
    // Address validation
    if (!formData.address?.trim()) {
      newErrors.address = 'Address is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Handle form submission
   */
  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (validateForm()) {
      onSubmit({
        ...formData,
        id: `temp_${Date.now()}`, // Temporary ID for tracking
        submittedAt: new Date().toISOString()
      });
    }
  };

  /**
   * Load demo scenarios and organize by category
   */
  const loadDemoScenarios = async () => {
    setLoadingDemo(true);
    try {
      const scenarios = await enhancedEntityResolutionAPI.getDemoScenarios();
      
      // Organize scenarios by category
      const categorizedScenarios = {
        'Safe (Low Risk)': scenarios.filter(s => s.id.startsWith('safe_')),
        'Duplicate': scenarios.filter(s => s.id.startsWith('duplicate_')),
        'High Risk': scenarios.filter(s => s.id.startsWith('high_risk_')),
        'Complex Corporate': scenarios.filter(s => s.id.startsWith('complex_corp_')),
        'Politically Exposed': scenarios.filter(s => s.id.startsWith('pep_'))
      };
      
      setDemoScenarios(categorizedScenarios);
      
      // Initialize category indices to 0 (first scenario in each category)
      const initialIndices = {};
      Object.keys(categorizedScenarios).forEach(category => {
        initialIndices[category] = 0;
      });
      setCategoryIndices(initialIndices);
      
    } catch (error) {
      console.error('Failed to load demo scenarios:', error);
    } finally {
      setLoadingDemo(false);
    }
  };

  /**
   * Handle category card click - cycle through scenarios in that category
   */
  const handleCategoryClick = (category) => {
    const scenariosInCategory = demoScenarios[category];
    if (!scenariosInCategory || scenariosInCategory.length === 0) return;
    
    // Get current index for this category
    const currentIndex = categoryIndices[category] || 0;
    
    // Apply the current scenario
    const scenario = scenariosInCategory[currentIndex];
    setFormData({
      fullName: scenario.entityData.fullName,
      address: scenario.entityData.address,
      entityType: scenario.entityData.entityType
    });
    setErrors({});
    
    // Cycle to next scenario (wrap around to 0 if at end)
    const nextIndex = (currentIndex + 1) % scenariosInCategory.length;
    setCategoryIndices(prev => ({
      ...prev,
      [category]: nextIndex
    }));
  };

  /**
   * Clear form
   */
  const clearForm = () => {
    setFormData({
      fullName: '',
      address: '',
      entityType: 'individual'
    });
    setErrors({});
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[4] }}>
      
      {/* Hero Section */}
      <Card style={{ 
        padding: spacing[5],
        background: 'linear-gradient(135deg, #EBF8FF 0%, #F0FDF4 100%)',
        border: '1px solid #E5E7EB',
        borderRadius: '12px'
      }}>
        <div style={{ textAlign: 'center', marginBottom: spacing[4] }}>
          <Icon 
            glyph="PersonWithLock" 
            size={48} 
            style={{ color: palette.blue.base, marginBottom: spacing[2] }} 
          />
          <H2 style={{ margin: 0, color: '#1F2937' }}>
            Enhanced Entity Onboarding
          </H2>
          <Body style={{ color: '#6B7280', marginTop: spacing[1] }}>
            Enter entity information to begin comprehensive analysis with parallel search and network intelligence
          </Body>
        </div>

        {/* Demo Scenarios Section */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          gap: spacing[2],
          marginBottom: spacing[4]
        }}>
          <Button
            variant="default"
            size="small"
            leftGlyph={<Icon glyph="Play" />}
            onClick={loadDemoScenarios}
            disabled={loadingDemo}
          >
            {loadingDemo ? 'Loading...' : 'Load Demo Scenarios'}
          </Button>
          <Button
            variant="default"
            size="small"
            leftGlyph={<Icon glyph="Refresh" />}
            onClick={clearForm}
          >
            Clear Form
          </Button>
        </div>

        {/* Demo Scenarios Grid */}
        {Object.keys(demoScenarios).length > 0 && (
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
            gap: spacing[2],
            marginBottom: spacing[4]
          }}>
            {Object.entries(demoScenarios).map(([category, scenarios]) => {
              if (!scenarios || scenarios.length === 0) return null;
              
              // Get current scenario for this category
              const currentIndex = categoryIndices[category] || 0;
              const currentScenario = scenarios[currentIndex];
              const totalInCategory = scenarios.length;
              
              return (
                <Card 
                  key={category}
                  style={{ 
                    padding: spacing[3],
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    border: '1px solid #E5E7EB',
                    position: 'relative'
                  }}
                  onClick={() => handleCategoryClick(category)}
                  onMouseOver={(e) => {
                    e.currentTarget.style.borderColor = palette.blue.base;
                    e.currentTarget.style.boxShadow = `0 2px 8px ${palette.blue.light2}`;
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.borderColor = '#E5E7EB';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  {/* Category indicator and counter */}
                  <div style={{ 
                    position: 'absolute', 
                    top: spacing[2], 
                    right: spacing[2],
                    backgroundColor: palette.gray.light3,
                    borderRadius: '12px',
                    padding: '2px 8px',
                    fontSize: '10px',
                    color: palette.gray.dark2,
                    fontWeight: '600'
                  }}>
                    {currentIndex + 1}/{totalInCategory}
                  </div>
                  
                  <Body weight="medium" style={{ fontSize: '13px', marginBottom: spacing[1], color: palette.blue.dark1 }}>
                    {category}
                  </Body>
                  <Body weight="medium" style={{ fontSize: '12px', marginBottom: spacing[1] }}>
                    {currentScenario.name}
                  </Body>
                  <Body style={{ fontSize: '11px', color: '#6B7280', lineHeight: '1.3' }}>
                    {currentScenario.description}
                  </Body>
                  <div style={{ 
                    marginTop: spacing[2],
                    display: 'flex',
                    justifyContent: 'flex-start',
                    alignItems: 'center'
                  }}>
                    <span style={{
                      padding: '2px 6px',
                      backgroundColor: currentScenario.expectedClassification === 'SAFE' ? '#D1FAE5' : 
                                     currentScenario.expectedClassification === 'DUPLICATE' ? '#FEF3C7' : '#FEE2E2',
                      color: currentScenario.expectedClassification === 'SAFE' ? '#065F46' : 
                             currentScenario.expectedClassification === 'DUPLICATE' ? '#92400E' : '#991B1B',
                      borderRadius: '4px',
                      fontSize: '10px',
                      fontWeight: '500'
                    }}>
                      {currentScenario.expectedClassification}
                    </span>
                  </div>
                  
                  {/* Click hint */}
                  <div style={{ 
                    marginTop: spacing[1],
                    fontSize: '9px',
                    color: palette.blue.base,
                    fontStyle: 'italic',
                    textAlign: 'center'
                  }}>
                    Click to cycle through {totalInCategory} options
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </Card>

      {/* Main Form */}
      <Card style={{ padding: spacing[5] }}>
        <H3 style={{ 
          marginBottom: spacing[4],
          display: 'flex',
          alignItems: 'center',
          gap: spacing[2]
        }}>
          <Icon glyph="Edit" style={{ color: palette.blue.base }} />
          Entity Information
        </H3>

        <form onSubmit={handleSubmit}>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
            gap: spacing[4]
          }}>
            
            {/* Entity Type Selection */}
            <div>
              <Select
                label="Entity Type"
                value={formData.entityType}
                onChange={(value) => handleChange('entityType', value)}
                errorMessage={errors.entityType}
              >
                <Option value="individual">Individual</Option>
                <Option value="organization">Organization</Option>
              </Select>
            </div>

            {/* Full Name */}
            <div style={{ width: '95%' }}>
              <TextInput
                label={formData.entityType === 'individual' ? 'Full Name' : 'Organization Name'}
                value={formData.fullName}
                onChange={(e) => handleChange('fullName', e.target.value)}
                errorMessage={errors.fullName}
                placeholder={formData.entityType === 'individual' ? 
                  'e.g., John Michael Smith' : 
                  'e.g., Acme Corporation LLC'
                }
              />
            </div>

            {/* Address */}
            <div>
              <TextInput
                label="Address"
                value={formData.address}
                onChange={(e) => handleChange('address', e.target.value)}
                errorMessage={errors.address}
                placeholder="e.g., 123 Main Street, City, State, ZIP"
              />
            </div>
          </div>

          {/* Form Actions */}
          <div style={{ 
            marginTop: spacing[5],
            paddingTop: spacing[4],
            borderTop: `1px solid ${palette.gray.light2}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <Body style={{ color: '#6B7280', fontSize: '12px' }}>
              <Icon glyph="InfoWithCircle" style={{ marginRight: spacing[1] }} />
              This will initiate parallel MongoDB Full-text, Vector and Hybrid search analysis
            </Body>
            
            <div style={{ display: 'flex', gap: spacing[2] }}>
              <Button
                variant="default"
                onClick={clearForm}
                disabled={isLoading}
              >
                Clear
              </Button>
              <Button
                variant="primary"
                type="submit"
                disabled={isLoading}
                leftGlyph={<Icon glyph="MagnifyingGlass" />}
              >
                {isLoading ? 'Processing...' : 'Begin Analysis'}
              </Button>
            </div>
          </div>
        </form>
      </Card>
    </div>
  );
}

export default ModernOnboardingForm;