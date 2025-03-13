"use client";

import { useState, useEffect } from 'react';
import axios from 'axios';
import Card from '@leafygreen-ui/card';
import Button from '@leafygreen-ui/button';
import { Select, Option } from '@leafygreen-ui/select';
import Toggle from '@leafygreen-ui/toggle';
import Banner from '@leafygreen-ui/banner';
import { Table, TableBody, TableHead, HeaderRow, HeaderCell, Row, Cell, useLeafyGreenTable, flexRender } from '@leafygreen-ui/table';
import { Body, H1, H2, H3, Subtitle, InlineCode, Disclaimer } from '@leafygreen-ui/typography';
import { Tabs, Tab } from '@leafygreen-ui/tabs';
import Tooltip from '@leafygreen-ui/tooltip';
import Icon from '@leafygreen-ui/icon';
import TextInput from '@leafygreen-ui/text-input';
import { RadioGroup, Radio } from '@leafygreen-ui/radio-group';
import RadioBox from '@leafygreen-ui/radio-box-group';
import Modal from '@leafygreen-ui/modal';
import { Spinner } from '@leafygreen-ui/loading-indicator';
import Callout from '@leafygreen-ui/callout';
import { palette } from '@leafygreen-ui/palette';
import { spacing } from '@leafygreen-ui/tokens';
import styles from './TransactionSimulator.module.css';


// Constants for predefined scenarios
const SCENARIOS = {
  NORMAL: 'normal',
  AMOUNT_ANOMALY: 'unusual_amount',
  LOCATION_ANOMALY: 'unusual_location',
  DEVICE_ANOMALY: 'unknown_device',
  MULTI_FLAG: 'multiple_flags'
};

const TRANSACTION_TYPES = [
  { value: 'purchase', label: 'Purchase' },
  { value: 'withdrawal', label: 'Withdrawal' },
  { value: 'transfer', label: 'Transfer' },
  { value: 'deposit', label: 'Deposit' }
];

const PAYMENT_METHODS = [
  { value: 'credit_card', label: 'Credit Card' },
  { value: 'debit_card', label: 'Debit Card' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'digital_wallet', label: 'Digital Wallet' }
];

const MERCHANT_CATEGORIES = [
  { value: 'retail', label: 'Retail' },
  { value: 'restaurant', label: 'Restaurant' },
  { value: 'travel', label: 'Travel' },
  { value: 'entertainment', label: 'Entertainment' },
  { value: 'healthcare', label: 'Healthcare' },
  { value: 'utilities', label: 'Utilities' },
  { value: 'gas', label: 'Gas' },
  { value: 'grocery', label: 'Grocery' },
  { value: 'money_transfer', label: 'Money Transfer' }
];

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Tab IDs for the results modal
const TAB_OVERVIEW = 0;
const TAB_TRANSACTION_DETAILS = 1;
const TAB_VECTOR_SEARCH = 2;

function TransactionSimulator() {
  // State variables
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [selectedScenario, setSelectedScenario] = useState(SCENARIOS.NORMAL);
  const [transactionType, setTransactionType] = useState('purchase');
  const [paymentMethod, setPaymentMethod] = useState('credit_card');
  const [amount, setAmount] = useState(50);
  const [merchantCategory, setMerchantCategory] = useState('retail');
  const [merchantName, setMerchantName] = useState('');
  const [useCommonLocation, setUseCommonLocation] = useState(true);
  const [customLocation, setCustomLocation] = useState({
    city: '',
    state: '',
    country: '',
    coordinates: {
      type: 'Point',
      coordinates: [0, 0]
    }
  });
  const [useExistingDevice, setUseExistingDevice] = useState(true);
  const [selectedDeviceIndex, setSelectedDeviceIndex] = useState(0);
  const [customDevice, setCustomDevice] = useState({
    device_id: '',
    type: 'mobile',
    os: 'iOS',
    browser: 'Safari',
    ip: ''
  });
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState('');
  const [results, setResults] = useState(null);
  const [showResultsModal, setShowResultsModal] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [similarTransactions, setSimilarTransactions] = useState([]);
  const [similarityRiskScore, setSimilarityRiskScore] = useState(0);

  // Fetch customers and initial data
  useEffect(() => {
    async function fetchInitialData() {
      try {
        const response = await axios.get(`${API_BASE_URL}/customers/`);
        setCustomers(response.data);
        if (response.data.length > 0) {
          setSelectedCustomer(response.data[0]);
          // Set initial amount based on customer's average
          if (response.data[0].behavioral_profile && 
              response.data[0].behavioral_profile.transaction_patterns) {
            setAmount(Math.round(response.data[0].behavioral_profile.transaction_patterns.avg_transaction_amount));
          }
          
          // Set initial merchant category from customer's common categories
          if (response.data[0].behavioral_profile?.transaction_patterns?.common_merchant_categories?.length > 0) {
            setMerchantCategory(response.data[0].behavioral_profile.transaction_patterns.common_merchant_categories[0]);
          }
        }
        setInitialLoading(false);
      } catch (err) {
        console.error('Error fetching customers:', err);
        setError('Failed to load customers. Please try again later.');
        setInitialLoading(false);
      }
    }

    fetchInitialData();
  }, []);

  // Handle customer selection
  const handleCustomerChange = (customerId) => {
    const customer = customers.find(c => c._id === customerId);
    setSelectedCustomer(customer);
    
    // Update amount based on selected customer's average
    if (customer.behavioral_profile && 
        customer.behavioral_profile.transaction_patterns) {
      setAmount(Math.round(customer.behavioral_profile.transaction_patterns.avg_transaction_amount));
    }
    
    // Update merchant category from customer's common categories
    if (customer.behavioral_profile?.transaction_patterns?.common_merchant_categories?.length > 0) {
      setMerchantCategory(customer.behavioral_profile.transaction_patterns.common_merchant_categories[0]);
    }
    
    // Reset device selection
    setSelectedDeviceIndex(0);
  };

  // Handle scenario selection
  const handleScenarioChange = (scenario) => {
    setSelectedScenario(scenario);
    
    if (selectedCustomer) {
      const avgAmount = selectedCustomer.behavioral_profile?.transaction_patterns?.avg_transaction_amount || 50;
      const stdAmount = selectedCustomer.behavioral_profile?.transaction_patterns?.std_transaction_amount || 10;
      
      // Adjust settings based on selected scenario
      switch (scenario) {
        case SCENARIOS.NORMAL:
          setAmount(Math.round(avgAmount));
          setUseCommonLocation(true);
          setUseExistingDevice(true);
          break;
        case SCENARIOS.AMOUNT_ANOMALY:
          // Set amount to a much more unusual value - 10x the average or at least 5 standard deviations, whichever is higher
          const unusualAmount = Math.max(
            avgAmount * 10,
            avgAmount + (stdAmount * 5)
          );
          setAmount(Math.round(unusualAmount));
          setUseCommonLocation(true);
          setUseExistingDevice(true);
          break;
        case SCENARIOS.LOCATION_ANOMALY:
          setAmount(Math.round(avgAmount));
          setUseCommonLocation(false);
          setCustomLocation({
            city: 'Unknown City',
            state: 'Unknown State',
            country: 'Unknown Country',
            coordinates: {
              type: 'Point',
              coordinates: [180, 0] // Far away location
            }
          });
          setUseExistingDevice(true);
          break;
        case SCENARIOS.DEVICE_ANOMALY:
          setAmount(Math.round(avgAmount));
          setUseCommonLocation(true);
          setUseExistingDevice(false);
          setCustomDevice({
            device_id: `new-device-${Date.now()}`,
            type: 'desktop',
            os: 'Windows',
            browser: 'Chrome',
            ip: '203.0.113.1' // Example IP
          });
          break;
        case SCENARIOS.MULTI_FLAG:
          // Set amount to extreme value just like in the amount anomaly scenario
          const multiUnusualAmount = Math.max(
            avgAmount * 10,
            avgAmount + (stdAmount * 5)
          );
          setAmount(Math.round(multiUnusualAmount));
          
          // Set unusual location
          setUseCommonLocation(false);
          setCustomLocation({
            city: 'Unknown City',
            state: 'Unknown State',
            country: 'Unknown Country',
            coordinates: {
              type: 'Point',
              coordinates: [180, 0] // Far away location
            }
          });
          
          // Set unknown device
          setUseExistingDevice(false);
          setCustomDevice({
            device_id: `new-device-${Date.now()}`,
            type: 'desktop',
            os: 'Windows',
            browser: 'Chrome',
            ip: '203.0.113.1' // Example IP
          });
          break;
        default:
          break;
      }
    }
  };

  // Prepare transaction data for submission
  const prepareTransactionData = () => {
    if (!selectedCustomer) return null;
    
    // Get location data
    let locationData;
    if (useCommonLocation && selectedCustomer.behavioral_profile?.transaction_patterns?.usual_transaction_locations?.length > 0) {
      const commonLocation = selectedCustomer.behavioral_profile.transaction_patterns.usual_transaction_locations[0];
      locationData = {
        city: commonLocation.city,
        state: commonLocation.state,
        country: commonLocation.country,
        coordinates: commonLocation.location
      };
    } else {
      locationData = customLocation;
    }
    
    // Get device data
    let deviceData;
    if (useExistingDevice && selectedCustomer.behavioral_profile?.devices?.length > 0) {
      const device = selectedCustomer.behavioral_profile.devices[selectedDeviceIndex % selectedCustomer.behavioral_profile.devices.length];
      deviceData = {
        device_id: device.device_id,
        type: device.type,
        os: device.os,
        browser: device.browser,
        ip: device.ip_range?.[0] || '127.0.0.1'
      };
    } else {
      deviceData = customDevice;
    }
    
    // Generate merchant name if not provided
    const generatedMerchantName = merchantName || `${merchantCategory.charAt(0).toUpperCase() + merchantCategory.slice(1)} Store`;
    
    // Prepare transaction data
    return {
      customer_id: selectedCustomer._id,
      transaction_id: `tx-${Date.now()}`,
      timestamp: new Date().toISOString(),
      amount: parseFloat(amount),
      currency: 'USD',
      merchant: {
        name: generatedMerchantName,
        category: merchantCategory,
        id: `m-${Date.now().toString(36)}`
      },
      location: locationData,
      device_info: deviceData,
      transaction_type: transactionType,
      payment_method: paymentMethod,
      status: 'completed'
    };
  };

  // Submit transaction for evaluation
  // Generate a descriptive text of the transaction for embedding
  const generateTransactionDescription = (transaction, riskAssessment) => {
    const flags = riskAssessment?.flags || [];
    const merchant = transaction.merchant?.category || 'unknown';
    const amount = transaction.amount || 0;
    const transType = transaction.transaction_type || 'purchase';
    
    // Generate a natural language description
    return `${transType} transaction for $${amount} at ${merchant} merchant with` + 
      (flags.length > 0 ? ` the following risk indicators: ${flags.join(', ')}` : ' no suspicious indicators');
  };

  const handleSubmitTransaction = async () => {
    const transactionData = prepareTransactionData();
    if (!transactionData) {
      setError('Cannot create transaction: No customer selected');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      // Log the transaction data for debugging
      console.log('Transaction data being sent:', JSON.stringify(transactionData));
      
      // Call the API to evaluate the transaction
      const response = await axios.post(`${API_BASE_URL}/transactions/evaluate/`, transactionData);
      console.log('Transaction evaluation response:', JSON.stringify(response.data));
      
      // Extract similar transactions and similarity risk score
      const similarTransData = response.data.similar_transactions || [];
      const simRiskScore = response.data.similarity_risk_score || 0;
      
      // Update state with similar transactions data
      setSimilarTransactions(similarTransData);
      setSimilarityRiskScore(simRiskScore);
      
      setResults(response.data);
      setShowResultsModal(true);
    } catch (err) {
      console.error('Error evaluating transaction:', err);
      console.error('Error details:', err.response?.data || err.message);
      setError('Failed to evaluate transaction. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  // Submit and store transaction
  const handleSubmitAndStoreTransaction = async () => {
    const transactionData = prepareTransactionData();
    if (!transactionData) {
      setError('Cannot create transaction: No customer selected');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      // Log the transaction data for debugging
      console.log('Transaction data being stored:', JSON.stringify(transactionData));
      
      // Call the API to create and evaluate the transaction
      const response = await axios.post(`${API_BASE_URL}/transactions/`, transactionData);
      console.log('Transaction storage response:', JSON.stringify(response.data));
      
      // After storing, get similar transactions through the evaluate endpoint
      try {
        const evalResponse = await axios.post(`${API_BASE_URL}/transactions/evaluate/`, transactionData);
        
        // Extract similar transactions and similarity risk score
        const similarTransData = evalResponse.data.similar_transactions || [];
        const simRiskScore = evalResponse.data.similarity_risk_score || 0;
        
        // Update state with similar transactions data
        setSimilarTransactions(similarTransData);
        setSimilarityRiskScore(simRiskScore);
      } catch (evalErr) {
        console.error('Error getting similar transactions:', evalErr);
        // Continue even if this fails
      }
      
      setResults(response.data);
      setShowResultsModal(true);
    } catch (err) {
      console.error('Error creating transaction:', err);
      console.error('Error details:', err.response?.data || err.message);
      setError('Failed to create transaction. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Render risk level indicator
  const renderRiskLevelIndicator = (level) => {
    let color;
    let icon;
    
    switch (level) {
      case 'low':
        color = palette.green.dark1;
        icon = <Icon glyph="CheckmarkWithCircle" fill={color} />;
        break;
      case 'medium':
        color = palette.yellow.dark2;
        icon = <Icon glyph="Warning" fill={color} />;
        break;
      case 'high':
        color = palette.red.base;
        icon = <Icon glyph="Warning" fill={color} />;
        break;
      default:
        color = palette.gray.dark1;
        icon = <Icon glyph="InfoWithCircle" fill={color} />;
    }
    
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: spacing[1] }}>
        {icon}
        <Body style={{ color, fontWeight: 'bold', textTransform: 'uppercase' }}>
          {level}
        </Body>
      </div>
    );
  };

  // Render results modal
  const renderResultsModal = () => {
    if (!results) return null;
    
    const risk = results.risk_assessment;
    
    return (
      <Modal
        open={showResultsModal}
        setOpen={setShowResultsModal}
        size="large"
        title="Transaction Risk Assessment"
        contentstyle={{ zIndex: 1000 }}
      >
        <div style={{ padding: spacing[3] }}>
          <Tabs
            selected={activeTab}
            setSelected={setActiveTab}
            aria-label="Transaction assessment tabs"
          >
            <Tab name="Overview">
              <div style={{ marginTop: spacing[3] }}>
                <Card>
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    marginBottom: spacing[3]
                  }}>
                    <H3>Risk Assessment</H3>
                    {renderRiskLevelIndicator(risk.level)}
                  </div>
                  
                  <div style={{ 
                    display: 'flex', 
                    flexDirection: 'column',
                    alignItems: 'center', 
                    justifyContent: 'center',
                    marginBottom: spacing[3],
                    padding: spacing[3],
                    background: palette.gray.light2,
                    borderRadius: '4px'
                  }}>
                    <div style={{ textAlign: 'center', marginBottom: spacing[2] }}>
                      <H1 style={{ 
                        color: risk.level === 'high' 
                          ? palette.red.base 
                          : risk.level === 'medium' 
                            ? palette.yellow.dark2 
                            : palette.green.dark1
                      }}>
                        {Math.round(risk.score)}
                      </H1>
                      <Body>Risk Score</Body>
                    </div>
                    
                    {risk.diagnostics && (
                      <div style={{ width: '100%', maxWidth: '400px', marginTop: spacing[2] }}>
                        <Subtitle style={{ marginBottom: spacing[1], textAlign: 'center' }}>
                          Risk Factors Breakdown
                        </Subtitle>
                        
                        {/* Customer Base Risk */}
                        <div style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          padding: `${spacing[1]}px 0`
                        }}>
                          <Body weight="medium">Customer Base Risk:</Body>
                          <Body>{Math.round(risk.diagnostics.customer_base_risk)}</Body>
                        </div>
                        
                        {/* Transaction Factors */}
                        {Object.entries(risk.diagnostics.transaction_factors).map(([factor, value]) => (
                          value > 0 && (
                            <div key={factor} style={{ 
                              display: 'flex', 
                              justifyContent: 'space-between',
                              padding: `${spacing[1]}px 0` 
                            }}>
                              <Body weight="medium">{factor.charAt(0).toUpperCase() + factor.slice(1)} Risk:</Body>
                              <Body>{Math.round(value)}</Body>
                            </div>
                          )
                        ))}
                      </div>
                    )}
                  </div>
                  
                  {risk.flags && risk.flags.length > 0 ? (
                    <div>
                      <Subtitle style={{ marginBottom: spacing[2] }}>
                        Risk Factors Detected:
                      </Subtitle>
                      <ul style={{ marginLeft: spacing[3] }}>
                        {risk.flags.map((flag, index) => (
                          <li key={index}>
                            <Body>
                              {flag.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            </Body>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <div style={{ 
                      padding: '16px', 
                      background: palette.green.light2, 
                      border: `1px solid ${palette.green.base}`,
                      borderRadius: '4px'
                    }}>
                      <H3 style={{ 
                        color: palette.green.dark2,
                        marginBottom: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}>
                        <Icon glyph="CheckmarkWithCircle" fill={palette.green.base} />
                        No Risk Factors Detected
                      </H3>
                      <Body>This transaction appears to be normal and doesn't trigger any risk flags.</Body>
                    </div>
                  )}
                </Card>
              </div>
            </Tab>
            
            <Tab name="Transaction Details">
              <div style={{ marginTop: spacing[3] }}>
                <Card>
                  <H3 style={{ marginBottom: spacing[3] }}>
                    Transaction Information
                  </H3>
                  
                  <Table>
                    <TableHead>
                      <HeaderRow>
                        <HeaderCell>Property</HeaderCell>
                        <HeaderCell>Value</HeaderCell>
                      </HeaderRow>
                    </TableHead>
                    <TableBody>
                      {[
                        { key: 'Amount', value: `$${results.transaction?.amount}` },
                        { key: 'Merchant Category', value: results.transaction?.merchant },
                        { key: 'Transaction Type', value: results.transaction?.transaction_type },
                        { key: 'Risk Level', value: risk.level },
                        { key: 'Risk Score', value: Math.round(risk.score) },
                        { key: 'Customer Base Risk', value: Math.round(risk.diagnostics?.customer_base_risk || 0) },
                        ...Object.entries(risk.diagnostics?.transaction_factors || {})
                          .filter(([_, value]) => value > 0)
                          .map(([factor, value]) => ({ 
                            key: `${factor.charAt(0).toUpperCase() + factor.slice(1)} Risk`, 
                            value: Math.round(value) 
                          })),
                        { key: 'Transaction Classification', value: risk.transaction_type }
                      ].map(datum => (
                        <Row key={datum.key}>
                          <Cell><strong>{datum.key}</strong></Cell>
                          <Cell>
                            {datum.key === 'Risk Level' 
                              ? renderRiskLevelIndicator(datum.value) 
                              : datum.value}
                          </Cell>
                        </Row>
                      ))}
                    </TableBody>
                  </Table>
                </Card>
              </div>
            </Tab>
            
            <Tab name="Vector Search Fraud Assessment">
              <div style={{ marginTop: spacing[3] }}>
                <Card>
                  <div style={{ marginBottom: spacing[3] }}>
                    <H3>Vector Search Fraud Analysis</H3>
                    <Body style={{ marginTop: spacing[1] }}>
                      Using MongoDB Vector Search to analyze semantically similar transactions for fraud detection
                    </Body>
                  </div>
                  
                  {/* Transaction description */}
                  <div style={{ 
                    padding: spacing[3],
                    background: palette.gray.light2,
                    borderRadius: '4px',
                    marginBottom: spacing[3]
                  }}>
                    <Subtitle>Transaction Description:</Subtitle>
                    <Body style={{ fontStyle: 'italic', marginTop: spacing[1] }}>
                      {generateTransactionDescription(
                        {
                          amount: results.transaction?.amount,
                          merchant: { category: results.transaction?.merchant },
                          transaction_type: results.transaction?.transaction_type
                        }, 
                        risk
                      )}
                    </Body>
                  </div>
                  
                  {/* Vector search representation */}
                  <div style={{ marginBottom: spacing[3] }}>
                    <Subtitle>
                      <div style={{ display: 'flex', alignItems: 'center', gap: spacing[1] }}>
                        <Icon glyph="Diagram" fill={palette.blue.base} />
                        Vector Embedding Process
                      </div>
                    </Subtitle>
                    
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      marginTop: spacing[2],
                      flexWrap: 'wrap'
                    }}>
                      <div style={{ 
                        background: palette.blue.light2, 
                        padding: spacing[2], 
                        borderRadius: '4px',
                        flex: '1 1 200px',
                        margin: spacing[1]
                      }}>
                        <Body weight="medium" style={{ color: palette.blue.dark2 }}>Transaction Text</Body>
                      </div>
                      
                      <div style={{ display: 'flex', alignItems: 'center', padding: `0 ${spacing[1]}px` }}>
                        <Icon glyph="ArrowRight" />
                      </div>
                      
                      <div style={{ 
                        background: palette.purple.light2, 
                        padding: spacing[2], 
                        borderRadius: '4px',
                        flex: '1 1 200px',
                        margin: spacing[1]
                      }}>
                        <Body weight="medium" style={{ color: palette.purple.dark2 }}>Bedrock Titan Model</Body>
                      </div>
                      
                      <div style={{ display: 'flex', alignItems: 'center', padding: `0 ${spacing[1]}px` }}>
                        <Icon glyph="ArrowRight" />
                      </div>
                      
                      <div style={{ 
                        background: palette.green.light2, 
                        padding: spacing[2], 
                        borderRadius: '4px',
                        flex: '1 1 200px',
                        margin: spacing[1]
                      }}>
                        <Body weight="medium" style={{ color: palette.green.dark2 }}>Vector (1536 dimensions)</Body>
                      </div>
                      
                      <div style={{ display: 'flex', alignItems: 'center', padding: `0 ${spacing[1]}px` }}>
                        <Icon glyph="ArrowRight" />
                      </div>
                      
                      <div style={{ 
                        background: palette.yellow.light2, 
                        padding: spacing[2], 
                        borderRadius: '4px',
                        flex: '1 1 200px',
                        margin: spacing[1]
                      }}>
                        <Body weight="medium" style={{ color: palette.yellow.dark2 }}>MongoDB Vector Search</Body>
                      </div>
                    </div>
                  </div>
                  
                  {/* Similarity Risk Score */}
                  <div style={{ 
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: spacing[3],
                    background: palette.gray.light2,
                    borderRadius: '4px',
                    marginBottom: spacing[3]
                  }}>
                    <div>
                      <Subtitle>Vector Search Risk Score:</Subtitle>
                      <Body style={{ marginTop: spacing[1] }}>
                        Calculated using MongoDB vector search similarity analysis
                      </Body>
                    </div>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '80px',
                      height: '80px',
                      borderRadius: '50%',
                      background: 'white',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                      border: `3px solid ${
                        similarityRiskScore >= 0.7 ? palette.red.base :
                        similarityRiskScore >= 0.4 ? palette.yellow.base :
                        palette.green.base
                      }`
                    }}>
                      <H2 style={{ 
                        color: similarityRiskScore >= 0.7 ? palette.red.base :
                               similarityRiskScore >= 0.4 ? palette.yellow.base :
                               palette.green.base
                      }}>
                        {Math.round(similarityRiskScore * 100)}
                      </H2>
                    </div>
                  </div>
                  
                  {/* Similar transactions list */}
                  <div>
                    <Subtitle style={{ marginBottom: spacing[2] }}>
                      Vector-Matched Transactions:
                      {results.similar_transactions_count > similarTransactions.length && (
                        <span style={{ color: palette.gray.dark1, fontWeight: 'normal', fontSize: '14px', marginLeft: spacing[2] }}>
                          (Showing top {similarTransactions.length} of {results.similar_transactions_count} vector matches)
                        </span>
                      )}
                    </Subtitle>
                    
                    {similarTransactions.length > 0 ? (
                      <div>
                        {similarTransactions.map((trans, index) => (
                          <div 
                            key={trans._id || index} 
                            style={{ 
                              padding: spacing[3],
                              marginBottom: spacing[2],
                              border: `1px solid ${palette.gray.light2}`,
                              borderRadius: '4px',
                              borderLeft: `4px solid ${
                                trans.risk_assessment?.level === 'high' ? palette.red.base :
                                trans.risk_assessment?.level === 'medium' ? palette.yellow.base :
                                palette.green.base
                              }`
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: spacing[2] }}>
                              <H3>${trans.amount} {trans.transaction_type} at {trans.merchant?.category}</H3>
                              {trans.score && (
                                <div style={{ 
                                  background: palette.blue.light2, 
                                  padding: `${spacing[1]}px ${spacing[2]}px`,
                                  borderRadius: '12px'
                                }}>
                                  <Body weight="medium" style={{ color: palette.blue.dark2 }}>
                                    Vector Similarity: {(trans.score * 100).toFixed(1)}%
                                  </Body>
                                </div>
                              )}
                            </div>
                            
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: spacing[2] }}>
                              <div>
                                <Body weight="medium">Date:</Body>
                                <Body>{new Date(trans.timestamp).toLocaleString()}</Body>
                              </div>
                              
                              <div>
                                <Body weight="medium">Risk Level:</Body>
                                <Body>{trans.risk_assessment?.level || 'Unknown'}</Body>
                              </div>
                              
                              <div>
                                <Body weight="medium">Risk Score:</Body>
                                <Body>{trans.risk_assessment?.score || 'N/A'}</Body>
                              </div>
                              
                              <div>
                                <Body weight="medium">Payment Method:</Body>
                                <Body>{trans.payment_method?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Unknown'}</Body>
                              </div>
                            </div>
                            
                            {trans.risk_assessment?.flags && trans.risk_assessment.flags.length > 0 && (
                              <div style={{ marginTop: spacing[2] }}>
                                <Subtitle style={{ fontSize: '14px', marginBottom: spacing[1] }}>Risk Flags:</Subtitle>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: spacing[1] }}>
                                  {trans.risk_assessment.flags.map((flag, i) => (
                                    <div 
                                      key={i}
                                      style={{ 
                                        background: palette.gray.light2,
                                        padding: `${spacing[1]/2}px ${spacing[2]}px`,
                                        borderRadius: '12px',
                                        fontSize: '12px'
                                      }}
                                    >
                                      {flag.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ 
                        padding: spacing[3], 
                        background: palette.gray.light2, 
                        borderRadius: '4px',
                        textAlign: 'center' 
                      }}>
                        <Body>No vector matches found in transaction database.</Body>
                      </div>
                    )}
                  </div>
                </Card>
              </div>
            </Tab>
          </Tabs>
          
          <div style={{ 
            display: 'flex', 
            justifyContent: 'flex-end', 
            marginTop: spacing[3],
            gap: spacing[2]
          }}>
            <Button onClick={() => setShowResultsModal(false)}>Close</Button>
            <Button variant="primary" onClick={handleSubmitAndStoreTransaction}>
              Save Transaction
            </Button>
          </div>
        </div>
      </Modal>
    );
  };

  if (initialLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: spacing[4] }}>
        <Spinner />
      </div>
    );
  }

  return (
    <div>
      <H2 style={{ marginBottom: spacing[3] }}>
        Transaction Simulator
      </H2>
      
      <div style={{ display: 'flex', gap: spacing[3], flexWrap: 'wrap' }}>
        {/* Customer Selection Card */}
        <Card style={{ flex: '1 1 300px', marginBottom: spacing[3] }}>
          <H3 style={{ marginBottom: spacing[2] }}>
            Select Customer
          </H3>
          
          <Select
            label="Customer"
            placeholder="Select a customer"
            onChange={handleCustomerChange}
            value={selectedCustomer?._id}
          >
            {customers.map(customer => (
              <Option key={customer._id} value={customer._id}>
                {customer.personal_info.name}
              </Option>
            ))}
          </Select>
          
          {selectedCustomer && (
            <div style={{ marginTop: spacing[3] }}>
              <Subtitle style={{ marginBottom: spacing[1] }}>
                Profile Summary
              </Subtitle>
              <div style={{ marginBottom: spacing[1] }}>
                <Body style={{ color: palette.gray.dark1 }}>
                  Email: {selectedCustomer.personal_info.email}
                </Body>
              </div>
              <div style={{ marginBottom: spacing[1] }}>
                <Body style={{ color: palette.gray.dark1 }}>
                  Account: {selectedCustomer.account_info.account_number}
                </Body>
              </div>
              <div style={{ marginBottom: spacing[1] }}>
                <Body style={{ color: palette.gray.dark1 }}>
                  Risk Score: {selectedCustomer.risk_profile.overall_risk_score.toFixed(2)}
                </Body>
              </div>
              <div style={{ marginBottom: spacing[1] }}>
                <Body style={{ color: palette.gray.dark1 }}>
                  Avg. Transaction: ${selectedCustomer.behavioral_profile?.transaction_patterns?.avg_transaction_amount.toFixed(2)}
                </Body>
              </div>
            </div>
          )}
        </Card>
        
        {/* Scenario Selection Card */}
        <Card style={{ flex: '1 1 300px', marginBottom: spacing[3] }}>
          <H3 style={{ marginBottom: spacing[2] }}>
            Scenario Selection
          </H3>
          
          <RadioGroup
            onChange={(e) => handleScenarioChange(e.target.value)}
            value={selectedScenario}
            name="scenario"
          >
            <Radio value={SCENARIOS.NORMAL} id="scenario-normal">
              Normal Transaction
            </Radio>
            <Radio value={SCENARIOS.AMOUNT_ANOMALY} id="scenario-amount">
              Unusual Amount
            </Radio>
            <Radio value={SCENARIOS.LOCATION_ANOMALY} id="scenario-location">
              Unusual Location
            </Radio>
            <Radio value={SCENARIOS.DEVICE_ANOMALY} id="scenario-device">
              New Device
            </Radio>
            <Radio value={SCENARIOS.MULTI_FLAG} id="scenario-multi">
              Multiple Red Flags
            </Radio>
          </RadioGroup>
          
          <div style={{ marginTop: spacing[3] }}>
            <Subtitle style={{ marginBottom: spacing[1] }}>
              Scenario Description
            </Subtitle>
            <Body style={{ color: palette.gray.dark1 }}>
              {selectedScenario === SCENARIOS.NORMAL && 
                "A typical transaction within customer's normal patterns and behaviors."}
              {selectedScenario === SCENARIOS.AMOUNT_ANOMALY && 
                "Transaction with an unusually high amount compared to customer's average spending."}
              {selectedScenario === SCENARIOS.LOCATION_ANOMALY && 
                "Transaction from a location far from customer's usual areas of activity."}
              {selectedScenario === SCENARIOS.DEVICE_ANOMALY && 
                "Transaction from a device that hasn't been used by this customer before."}
              {selectedScenario === SCENARIOS.MULTI_FLAG && 
                "Transaction with multiple anomalies: unusual amount, location, and device."}
            </Body>
          </div>
        </Card>
      </div>
      
      {/* Transaction Details Card */}
      <Card style={{ marginBottom: spacing[3] }}>
        <H3 style={{ marginBottom: spacing[2] }}>
          Transaction Details
        </H3>
        
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', 
          gap: spacing[4]
        }}>
          <div style={{ marginBottom: spacing[2] }}>
            <Select
              label="Transaction Type"
              onChange={value => setTransactionType(value)}
              value={transactionType}
            >
              {TRANSACTION_TYPES.map(type => (
                <Option key={type.value} value={type.value}>
                  {type.label}
                </Option>
              ))}
            </Select>
          </div>
          
          <div style={{ marginBottom: spacing[2] }}>
            <Select
              label="Payment Method"
              onChange={value => setPaymentMethod(value)}
              value={paymentMethod}
            >
              {PAYMENT_METHODS.map(method => (
                <Option key={method.value} value={method.value}>
                  {method.label}
                </Option>
              ))}
            </Select>
          </div>
          
          <div style={{ marginBottom: spacing[2] }}>
            <TextInput
              label="Amount (USD)"
              onChange={e => setAmount(parseFloat(e.target.value) || 0)}
              value={amount.toString()}
              type="number"
              min="1"
              step="0.01"
              style={{ width: '100%' }}
            />
            {selectedCustomer?.behavioral_profile?.transaction_patterns && (
              <Body size="small" style={{ color: palette.gray.dark1 }}>
                Avg: ${selectedCustomer.behavioral_profile.transaction_patterns.avg_transaction_amount.toFixed(2)}
                {selectedCustomer.behavioral_profile.transaction_patterns.std_transaction_amount && 
                  ` (±$${selectedCustomer.behavioral_profile.transaction_patterns.std_transaction_amount.toFixed(2)})`}
              </Body>
            )}
          </div>
          
          <div style={{ marginBottom: spacing[2] }}>
            <Select
              label="Merchant Category"
              onChange={value => setMerchantCategory(value)}
              value={merchantCategory}
            >
              {MERCHANT_CATEGORIES.map(category => (
                <Option key={category.value} value={category.value}>
                  {category.label}
                </Option>
              ))}
            </Select>
            {selectedCustomer?.behavioral_profile?.transaction_patterns?.common_merchant_categories && (
              <Body size="small" style={{ color: palette.gray.dark1 }}>
                Common categories: {selectedCustomer.behavioral_profile.transaction_patterns.common_merchant_categories.join(', ')}
              </Body>
            )}
          </div>
          
          <div style={{ marginBottom: spacing[2] }}>
            <TextInput
              label="Merchant Name (Optional)"
              onChange={e => setMerchantName(e.target.value)}
              value={merchantName}
              placeholder="Auto-generated if empty"
            />
          </div>
        </div>
      </Card>
      
      {/* Location Card */}
      <Card style={{ marginBottom: spacing[3] }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: spacing[2]
        }}>
          <H3>
            Location
          </H3>
          
          <Toggle
            onChange={() => setUseCommonLocation(!useCommonLocation)}
            checked={useCommonLocation}
            size="small"
            label="Use Common Location"
            aria-label="Use Common Location"
          />
        </div>
        
        {!useCommonLocation ? (
          <div style={{ display: 'flex', gap: spacing[3], flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 200px', marginBottom: spacing[2] }}>
              <TextInput
                label="City"
                onChange={e => setCustomLocation({...customLocation, city: e.target.value})}
                value={customLocation.city}
              />
            </div>
            
            <div style={{ flex: '1 1 200px', marginBottom: spacing[2] }}>
              <TextInput
                label="State/Province"
                onChange={e => setCustomLocation({...customLocation, state: e.target.value})}
                value={customLocation.state}
              />
            </div>
            
            <div style={{ flex: '1 1 200px', marginBottom: spacing[2] }}>
              <TextInput
                label="Country"
                onChange={e => setCustomLocation({...customLocation, country: e.target.value})}
                value={customLocation.country}
              />
            </div>
            
            <div style={{ flex: '1 1 200px', marginBottom: spacing[2] }}>
              <TextInput
                label="Longitude"
                onChange={e => setCustomLocation({
                  ...customLocation, 
                  coordinates: {
                    ...customLocation.coordinates,
                    coordinates: [parseFloat(e.target.value) || 0, customLocation.coordinates.coordinates[1]]
                  }
                })}
                value={customLocation.coordinates.coordinates[0].toString()}
                type="number"
                min="-180"
                max="180"
                step="0.000001"
              />
            </div>
            
            <div style={{ flex: '1 1 200px', marginBottom: spacing[2] }}>
              <TextInput
                label="Latitude"
                onChange={e => setCustomLocation({
                  ...customLocation, 
                  coordinates: {
                    ...customLocation.coordinates,
                    coordinates: [customLocation.coordinates.coordinates[0], parseFloat(e.target.value) || 0]
                  }
                })}
                value={customLocation.coordinates.coordinates[1].toString()}
                type="number"
                min="-90"
                max="90"
                step="0.000001"
              />
            </div>
          </div>
        ) : (
          <div>
            {selectedCustomer?.behavioral_profile?.transaction_patterns?.usual_transaction_locations?.length > 0 ? (
              <div>
                <Subtitle style={{ marginBottom: spacing[1] }}>
                  Using Customer's Common Location
                </Subtitle>
                <Body style={{ color: palette.gray.dark1 }}>
                  {
                    selectedCustomer.behavioral_profile.transaction_patterns.usual_transaction_locations[0].city
                  }, {
                    selectedCustomer.behavioral_profile.transaction_patterns.usual_transaction_locations[0].state
                  }, {
                    selectedCustomer.behavioral_profile.transaction_patterns.usual_transaction_locations[0].country
                  }
                </Body>
              </div>
            ) : (
              <Banner variant="warning">
                No common locations found for this customer. Please enter a custom location.
              </Banner>
            )}
          </div>
        )}
      </Card>
      
      {/* Device Card */}
      <Card style={{ marginBottom: spacing[3] }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: spacing[2]
        }}>
          <H3>
            Device
          </H3>
          
          <Toggle
            onChange={() => setUseExistingDevice(!useExistingDevice)}
            checked={useExistingDevice}
            size="small"
            label="Use Existing Device"
            aria-label="Use Existing Device"
          />
        </div>
        
        {useExistingDevice ? (
          <div>
            {selectedCustomer?.behavioral_profile?.devices?.length > 0 ? (
              <div>
                <Select
                  label="Select Device"
                  onChange={(value) => setSelectedDeviceIndex(parseInt(value))}
                  value={selectedDeviceIndex.toString()}
                >
                  {selectedCustomer.behavioral_profile.devices.map((device, index) => (
                    <Option key={index} value={index.toString()}>
                      {device.type} - {device.os} ({device.browser})
                    </Option>
                  ))}
                </Select>
                
                <div style={{ marginTop: spacing[2] }}>
                  <Subtitle style={{ marginBottom: spacing[1] }}>
                    Device Details
                  </Subtitle>
                  <Body style={{ color: palette.gray.dark1 }}>
                    ID: {selectedCustomer.behavioral_profile.devices[selectedDeviceIndex].device_id}
                  </Body>
                  <Body style={{ color: palette.gray.dark1 }}>
                    Type: {selectedCustomer.behavioral_profile.devices[selectedDeviceIndex].type}
                  </Body>
                  <Body style={{ color: palette.gray.dark1 }}>
                    OS: {selectedCustomer.behavioral_profile.devices[selectedDeviceIndex].os}
                  </Body>
                  <Body style={{ color: palette.gray.dark1 }}>
                    Browser: {selectedCustomer.behavioral_profile.devices[selectedDeviceIndex].browser}
                  </Body>
                </div>
              </div>
            ) : (
              <Banner variant="warning">
                No devices found for this customer. Please add a custom device.
              </Banner>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', gap: spacing[3], flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 200px', marginBottom: spacing[2] }}>
              <TextInput
                label="Device ID"
                onChange={e => setCustomDevice({...customDevice, device_id: e.target.value})}
                value={customDevice.device_id}
              />
            </div>
            
            <div style={{ flex: '1 1 200px', marginBottom: spacing[2] }}>
              <Select
                label="Device Type"
                onChange={value => setCustomDevice({...customDevice, type: value})}
                value={customDevice.type}
              >
                <Option value="desktop">Desktop</Option>
                <Option value="laptop">Laptop</Option>
                <Option value="mobile">Mobile</Option>
                <Option value="tablet">Tablet</Option>
              </Select>
            </div>
            
            <div style={{ flex: '1 1 200px', marginBottom: spacing[2] }}>
              <Select
                label="Operating System"
                onChange={value => setCustomDevice({...customDevice, os: value})}
                value={customDevice.os}
              >
                <Option value="Windows">Windows</Option>
                <Option value="macOS">macOS</Option>
                <Option value="iOS">iOS</Option>
                <Option value="Android">Android</Option>
                <Option value="Linux">Linux</Option>
              </Select>
            </div>
            
            <div style={{ flex: '1 1 200px', marginBottom: spacing[2] }}>
              <Select
                label="Browser"
                onChange={value => setCustomDevice({...customDevice, browser: value})}
                value={customDevice.browser}
              >
                <Option value="Chrome">Chrome</Option>
                <Option value="Firefox">Firefox</Option>
                <Option value="Safari">Safari</Option>
                <Option value="Edge">Edge</Option>
              </Select>
            </div>
            
            <div style={{ flex: '1 1 200px', marginBottom: spacing[2] }}>
              <TextInput
                label="IP Address"
                onChange={e => setCustomDevice({...customDevice, ip: e.target.value})}
                value={customDevice.ip}
                placeholder="192.168.1.1"
              />
            </div>
          </div>
        )}
      </Card>
      
      {/* Action Buttons */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: spacing[2], marginBottom: spacing[3] }}>
        <Button
          disabled={loading || !selectedCustomer}
          onClick={handleSubmitTransaction}
        >
          Evaluate Transaction
        </Button>
        
        <Button
          variant="primary"
          disabled={loading || !selectedCustomer}
          onClick={handleSubmitAndStoreTransaction}
          leftGlyph={loading ? <Spinner /> : null}
        >
          Submit & Store Transaction
        </Button>
      </div>
      
      {/* Error Display */}
      {error && (
        <Banner variant="danger">
          {error}
        </Banner>
      )}
      
      {/* Results Modal */}
      {renderResultsModal()}
    </div>
  );
}

export default TransactionSimulator;