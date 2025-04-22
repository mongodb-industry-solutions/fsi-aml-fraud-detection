// components/ModelAdminPanel.js
import React, { useState, useEffect, useRef } from 'react';
import Card from '@leafygreen-ui/card';
import Button from '@leafygreen-ui/button';
import { Select, Option } from '@leafygreen-ui/select';
import TextInput from '@leafygreen-ui/text-input';
import {
  Body,
  H1,
  H2,
  H3,
  Label,
  Description,
} from '@leafygreen-ui/typography';
import { Tabs, Tab } from '@leafygreen-ui/tabs';
import Toggle from '@leafygreen-ui/toggle';
import Icon from '@leafygreen-ui/icon';
import Modal from '@leafygreen-ui/modal';
import Banner from '@leafygreen-ui/banner';
import Callout from '@leafygreen-ui/callout';
import Code from '@leafygreen-ui/code';
import { spacing } from '@leafygreen-ui/tokens';
import { palette } from '@leafygreen-ui/palette';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL;

// Helper functions for formatting change stream events
const formatEventTime = () => {
  const now = new Date();
  const hours = now.getHours().toString().padStart(2, '0');
  const minutes = now.getMinutes().toString().padStart(2, '0');
  const seconds = now.getSeconds().toString().padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
};

const getEventColor = (operationType) => {
  switch (operationType) {
    case 'insert':
      return palette.green.light2;
    case 'update':
    case 'replace':
      return palette.blue.light2;
    case 'delete':
      return palette.red.light2;
    default:
      return palette.gray.light2;
  }
};

const getEventDescription = (event) => {
  // This function is kept for compatibility but we now use inline description
  // in the render function for more accurate data from the actual event
  switch (event.operationType) {
    case 'insert':
      return `New model created: ${
        event.document?.modelId || 'unknown'
      } (v${event.document?.version || '?'})`;
    case 'update':
    case 'replace':
      if (event.document?.status === 'active') {
        return `Model activated: ${
          event.document?.modelId || 'unknown'
        } (v${event.document?.version || '?'})`;
      } else {
        return `Model updated: ${
          event.document?.modelId || 'unknown'
        } (v${event.document?.version || '?'})`;
      }
    case 'delete':
      return `Model deleted: ${event.documentId || 'unknown'}`;
    default:
      return `Unknown operation: ${event.operationType}`;
  }
};

const ModelAdminPanel = () => {
  // States for notifications
  const [notification, setNotification] = useState({
    message: '',
    variant: 'success',
    visible: false,
  });

  // WebSocket reference
  const wsRef = useRef(null);

  // Custom toast function
  const showToast = React.useCallback(
    (message, variant = 'success') => {
      // Ensure variant is a valid value for Banner component
      let validVariant = variant;
      if (variant === 'error') {
        validVariant = 'danger'; // Banner uses 'danger' instead of 'error'
      }

      setNotification({
        message,
        variant: validVariant,
        visible: true,
      });

      setTimeout(() => {
        setNotification((prev) => ({ ...prev, visible: false }));
      }, 3000);
    },
    []
  );

  // State for model list and selected model
  const [models, setModels] = useState([]);
  const [selectedModelId, setSelectedModelId] = useState(null);
  const [selectedModel, setSelectedModel] = useState(null);

  // State for change stream events
  const [changeEvents, setChangeEvents] = useState([]);
  const [wsConnected, setWsConnected] = useState(false);

  // State for model editing
  const [editMode, setEditMode] = useState(false);
  const [editedModel, setEditedModel] = useState(null);

  // State for performance data
  const [performanceData, setPerformanceData] = useState(null);
  const [performanceTimeframe, setPerformanceTimeframe] =
    useState('24h');

  // State for comparison
  const [comparisonModelId, setComparisonModelId] = useState(null);
  const [comparisonData, setComparisonData] = useState(null);
  const [showComparison, setShowComparison] = useState(false);

  // State for filtering
  const [statusFilter, setStatusFilter] = useState('');

  // Fetch details for a specific model
  const fetchModelDetails = React.useCallback(
    async (modelId) => {
      try {
        // Always fetch fresh data from MongoDB
        console.log('Fetching model from MongoDB:', modelId);
        const response = await fetch(
          `${BACKEND_URL}/models/${modelId}`
        );
        if (!response.ok)
          throw new Error('Failed to fetch model details');

        const data = await response.json();
        console.log('Received model data from MongoDB:', data);

        setSelectedModel(data);
        setEditedModel(null);
        setEditMode(false);

        // Show a toast notification
        showToast(
          `Model ${data.modelId} (v${data.version}) loaded from MongoDB`,
          'success'
        );
      } catch (error) {
        console.error('Error fetching model details:', error);
        showToast(
          'Failed to load model details from MongoDB',
          'error'
        );
      }
    },
    [showToast]
  );

  // Fetch performance data for a model
  const fetchModelPerformance = React.useCallback(
    async (modelId, timeframe) => {
      try {
        // Extract base modelId if it's in the composite format
        const baseModelId = modelId.includes('-v')
          ? modelId.split('-v')[0]
          : modelId;

        const response = await fetch(
          `${BACKEND_URL}/models/${baseModelId}/performance?timeframe=${timeframe}`
        );
        if (!response.ok)
          throw new Error('Failed to fetch performance data');

        const data = await response.json();
        setPerformanceData(data);
      } catch (error) {
        console.error('Error fetching performance data:', error);
        showToast('Failed to load performance data', 'error');
      }
    },
    [showToast]
  );

  // Fetch risk models from API
  const fetchModels = React.useCallback(async () => {
    try {
      // Build query string with filters
      let url = `${BACKEND_URL}/models/`;

      if (statusFilter) {
        url += `?status=${statusFilter}`;
      }

      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch models');

      const data = await response.json();
      setModels(data);

      // Select active model by default if no model is currently selected
      if (!selectedModelId) {
        const activeModel = data.find(
          (model) => model.status === 'active'
        );
        if (activeModel) {
          const compositeId = `${activeModel.modelId}-v${activeModel.version}`;
          console.log(
            'Selecting active model by default:',
            compositeId
          );
          setSelectedModelId(compositeId);
          setSelectedModel(activeModel);
        }
      }
    } catch (error) {
      console.error('Error fetching models:', error);
      showToast('Failed to load risk models', 'error');
    }
  }, [showToast, selectedModelId, statusFilter]);

  // Set up useEffect hooks after all callbacks are defined

  // Connect to WebSocket for real-time MongoDB Change Streams
  useEffect(() => {
    // Create WebSocket URL based on backend URL (replace http with ws)
    const wsUrl =
      BACKEND_URL.replace(/^http/, 'ws') + '/models/change-stream';
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    // Handle WebSocket events
    ws.onopen = () => {
      console.log('WebSocket connected to MongoDB Change Stream');
      setWsConnected(true);
      showToast('Connected to real-time model updates', 'success');
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
      setWsConnected(false);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setWsConnected(false);
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      // Handle heartbeat messages
      if (data.type === 'heartbeat') {
        console.log(
          'Received heartbeat from server:',
          data.timestamp
        );
        return;
      }

      // Handle initial models data
      if (data.type === 'initial') {
        setModels(data.models);

        // Select first active model by default
        const activeModel = data.models.find(
          (model) => model.status === 'active'
        );
        if (activeModel && !selectedModelId) {
          setSelectedModelId(activeModel.modelId);
          setSelectedModel(activeModel);
        }
      }

      // Handle change events
      if (data.type === 'change') {
        // Add the event to our change event log
        setChangeEvents((prev) => {
          // Keep only last 5 events
          const newEvents = [data, ...prev.slice(0, 4)];
          return newEvents;
        });

        // Update models list based on operation type
        if (
          data.operationType === 'insert' ||
          data.operationType === 'update' ||
          data.operationType === 'replace'
        ) {
          const updatedDoc = data.document;

          setModels((prevModels) => {
            // Check if model already exists in our list
            const existingIndex = prevModels.findIndex(
              (m) =>
                m.modelId === updatedDoc.modelId &&
                m.version === updatedDoc.version
            );

            if (existingIndex >= 0) {
              // Update existing model
              const updatedModels = [...prevModels];
              updatedModels[existingIndex] = updatedDoc;
              return updatedModels;
            } else {
              // Add new model
              return [...prevModels, updatedDoc];
            }
          });

          // If this update affects our selected model, update it too
          if (
            selectedModel &&
            selectedModel.modelId === updatedDoc.modelId &&
            selectedModel.version === updatedDoc.version
          ) {
            console.log(
              'Detected update to current model via Change Stream'
            );

            // Clear any previous highlights
            setRecentlyUpdated({
              description: false,
              flagThreshold: false,
              blockThreshold: false,
              riskFactors: {},
            });

            // Check which fields changed to highlight them
            if (
              selectedModel.description !== updatedDoc.description
            ) {
              console.log(
                'Description changed:',
                selectedModel.description,
                '->',
                updatedDoc.description
              );
              highlightField('description');
            }

            // Check threshold changes
            const oldFlag = parseInt(selectedModel.thresholds?.flag);
            const newFlag = parseInt(updatedDoc.thresholds?.flag);
            if (oldFlag !== newFlag) {
              console.log(
                'Flag threshold changed:',
                oldFlag,
                '->',
                newFlag
              );
              highlightField('flagThreshold');
            }

            const oldBlock = parseInt(
              selectedModel.thresholds?.block
            );
            const newBlock = parseInt(updatedDoc.thresholds?.block);
            if (oldBlock !== newBlock) {
              console.log(
                'Block threshold changed:',
                oldBlock,
                '->',
                newBlock
              );
              highlightField('blockThreshold');
            }

            // Check risk factor changes
            const oldFactors = selectedModel.riskFactors || [];
            const newFactors = updatedDoc.riskFactors || [];

            // Track changed or new risk factors
            newFactors.forEach((factor) => {
              const oldFactor = oldFactors.find(
                (f) => f.id === factor.id
              );
              if (!oldFactor) {
                console.log('New risk factor added:', factor.id);
                highlightField('riskFactors', factor.id);
              } else if (
                oldFactor.description !== factor.description ||
                oldFactor.threshold !== factor.threshold ||
                oldFactor.distanceThreshold !==
                  factor.distanceThreshold ||
                oldFactor.active !== factor.active
              ) {
                console.log('Risk factor changed:', factor.id);
                highlightField('riskFactors', factor.id);
              }
            });

            // Check for weight changes
            Object.keys(updatedDoc.weights || {}).forEach(
              (factorId) => {
                if (
                  selectedModel.weights?.[factorId] !==
                  updatedDoc.weights[factorId]
                ) {
                  console.log('Weight changed for factor:', factorId);
                  highlightField('riskFactors', factorId);
                }
              }
            );

            // Update the model
            setSelectedModel(updatedDoc);
            showToast(
              `Model ${updatedDoc.modelId} updated in real-time via Change Stream`,
              'info'
            );
          }

          // If status changed to active, update other models
          if (updatedDoc.status === 'active') {
            setModels((prevModels) =>
              prevModels.map((model) =>
                model._id !== updatedDoc._id &&
                model.status === 'active'
                  ? { ...model, status: 'inactive' }
                  : model
              )
            );
          }
        } else if (data.operationType === 'delete') {
          // Remove deleted model from list
          setModels((prevModels) =>
            prevModels.filter(
              (model) => model._id !== data.documentId
            )
          );
        }
      }
    };

    // Clean up on component unmount
    return () => {
      ws.close();
    };
  }, [showToast, selectedModelId]);

  // Fetch models on component mount (as backup if WebSocket fails)
  useEffect(() => {
    fetchModels();
  }, [fetchModels]);

  // Fetch selected model when ID changes
  useEffect(() => {
    if (selectedModelId) {
      // Reset any field highlights
      setRecentlyUpdated({
        description: false,
        flagThreshold: false,
        blockThreshold: false,
        riskFactors: {},
      });

      // With the new composite ID format (modelId-vVersion), we need to parse it
      const parts = selectedModelId.split('-v');
      const modelId = parts[0];
      const version =
        parts.length > 1 ? parseInt(parts[1]) : undefined;

      console.log(`Model selected: ${modelId}, version: ${version}`);

      // Always fetch from MongoDB to get fresh data
      console.log(
        `Fetching details from MongoDB for model: ${modelId}`
      );
      fetchModelDetails(modelId);

      // Fetch performance data
      fetchModelPerformance(modelId, performanceTimeframe);
    } else {
      setSelectedModel(null);
      setPerformanceData(null);
    }
  }, [
    selectedModelId,
    performanceTimeframe,
    fetchModelDetails,
    fetchModelPerformance,
  ]);

  // Enter edit mode for the current model
  const handleEditModel = () => {
    setEditedModel({ ...selectedModel });
    setEditMode(true);
  };

  // Handle changes to model weights
  const handleWeightChange = (factorId, value) => {
    setEditedModel((prev) => ({
      ...prev,
      weights: {
        ...prev.weights,
        [factorId]: value,
      },
    }));
  };

  // Handle changes to model thresholds
  const handleThresholdChange = (key, value) => {
    setEditedModel((prev) => ({
      ...prev,
      thresholds: {
        ...prev.thresholds,
        [key]: value,
      },
    }));
  };

  // Track fields that have been updated in real-time
  const [recentlyUpdated, setRecentlyUpdated] = useState({
    description: false,
    flagThreshold: false,
    blockThreshold: false,
    status: false,
    riskFactors: {},
  });

  // Highlight recently updated fields
  const highlightField = (field, subfieldId = null) => {
    console.log(
      `Highlighting field: ${field}${
        subfieldId ? ` (${subfieldId})` : ''
      }`
    );

    // Set the field as recently updated
    setRecentlyUpdated((prev) => {
      if (subfieldId) {
        return {
          ...prev,
          [field]: {
            ...prev[field],
            [subfieldId]: true,
          },
        };
      }
      return {
        ...prev,
        [field]: true,
      };
    });

    // Remove highlight after 3 seconds
    setTimeout(() => {
      setRecentlyUpdated((prev) => {
        if (subfieldId) {
          return {
            ...prev,
            [field]: {
              ...prev[field],
              [subfieldId]: false,
            },
          };
        }
        return {
          ...prev,
          [field]: false,
        };
      });
    }, 3000);
  };

  // Handle changes to risk factor configuration
  const handleRiskFactorChange = (index, field, value) => {
    const updatedFactors = [...editedModel.riskFactors];
    updatedFactors[index] = {
      ...updatedFactors[index],
      [field]: value,
    };

    setEditedModel((prev) => ({
      ...prev,
      riskFactors: updatedFactors,
    }));
  };

  // Save model changes
  const handleSaveModel = async () => {
    try {
      console.log('Saving model changes to MongoDB:', editedModel);

      // Identify which fields have changed to highlight them
      const fieldsToHighlight = [];

      if (selectedModel.description !== editedModel.description) {
        fieldsToHighlight.push('description');
      }

      if (
        selectedModel.thresholds?.flag !==
        editedModel.thresholds?.flag
      ) {
        fieldsToHighlight.push('flagThreshold');
      }

      if (
        selectedModel.thresholds?.block !==
        editedModel.thresholds?.block
      ) {
        fieldsToHighlight.push('blockThreshold');
      }

      // Check risk factors changes
      const changedRiskFactors = {};
      editedModel.riskFactors?.forEach((factor) => {
        const oldFactor = selectedModel.riskFactors?.find(
          (f) => f.id === factor.id
        );
        if (
          !oldFactor ||
          oldFactor.description !== factor.description ||
          oldFactor.threshold !== factor.threshold ||
          oldFactor.active !== factor.active
        ) {
          changedRiskFactors[factor.id] = true;
        }
      });

      // Save to MongoDB
      const response = await fetch(
        `${BACKEND_URL}/models/${selectedModelId.split('-v')[0]}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            description: editedModel.description,
            weights: editedModel.weights,
            thresholds: editedModel.thresholds,
            riskFactors: editedModel.riskFactors.map((factor) => ({
              ...factor,
              // Ensure numeric fields have valid defaults if null
              threshold:
                factor.threshold !== null &&
                factor.threshold !== undefined
                  ? factor.threshold
                  : 1.0,
              distanceThreshold:
                factor.distanceThreshold !== null &&
                factor.distanceThreshold !== undefined
                  ? factor.distanceThreshold
                  : 100.0,
            })),
          }),
        }
      );

      if (!response.ok) throw new Error('Failed to update model');

      // Use the model returned from MongoDB to update the UI
      const updatedModel = await response.json();
      console.log('MongoDB returned updated model:', updatedModel);

      // Update the UI with the MongoDB data
      setSelectedModel(updatedModel);
      setEditMode(false);
      setEditedModel(null);

      // Highlight changed fields
      fieldsToHighlight.forEach((field) => {
        highlightField(field);
      });

      // Highlight changed risk factors
      Object.keys(changedRiskFactors).forEach((factorId) => {
        highlightField('riskFactors', factorId);
      });

      showToast(
        'Risk model updated in MongoDB and UI refreshed with latest data',
        'success'
      );

      // Refresh models list to show new version
      fetchModels();
    } catch (error) {
      console.error('Error saving model to MongoDB:', error);
      showToast('Failed to update risk model in MongoDB', 'error');
    }
  };

  // Activate a model
  const handleActivateModel = async () => {
    try {
      console.log('Activating model in MongoDB:', selectedModelId);

      // Extract both model ID and version
      const parts = selectedModelId.split('-v');
      const baseModelId = parts[0];
      const version =
        parts.length > 1 ? parseInt(parts[1]) : undefined;

      // Include version as a query parameter
      let url = `${BACKEND_URL}/models/${baseModelId}/activate`;
      if (version) {
        url += `?version=${version}`;
      }

      const response = await fetch(url, { method: 'POST' });

      if (!response.ok) throw new Error('Failed to activate model');

      const result = await response.json();
      console.log('MongoDB activation result:', result);

      // Check if model was already active (improved handling for the updated backend)
      if (
        result.message &&
        result.message.includes('already active')
      ) {
        showToast('This model is already active', 'info');
      } else {
        showToast('Risk model activated in MongoDB', 'success');
      }

      // Highlight the status field
      highlightField('status');

      // Refresh models list to get all status changes
      await fetchModels();

      // Fetch fresh model details from MongoDB
      await fetchModelDetails(baseModelId);
    } catch (error) {
      console.error('Error activating model in MongoDB:', error);
      showToast('Failed to activate risk model', 'error');
    }
  };

  // Restore an archived model
  const handleRestoreModel = async () => {
    try {
      if (!selectedModel || selectedModel.status !== 'archived') {
        showToast('Only archived models can be restored', 'warning');
        return;
      }

      console.log('Restoring model in MongoDB:', selectedModelId);

      // Extract the base model ID from the composite ID
      const baseModelId = selectedModelId.split('-v')[0];

      const response = await fetch(
        `${BACKEND_URL}/models/${baseModelId}/restore`,
        {
          method: 'POST',
        }
      );

      if (!response.ok) throw new Error('Failed to restore model');

      const result = await response.json();
      console.log('MongoDB restoration result:', result);

      showToast('Risk model restored from archive', 'success');

      // Refresh models list to get all status changes
      await fetchModels();

      // Fetch fresh model details from MongoDB
      await fetchModelDetails(baseModelId);
    } catch (error) {
      console.error('Error restoring model in MongoDB:', error);
      showToast('Failed to restore risk model', 'error');
    }
  };

  // Archive a model
  const handleArchiveModel = async () => {
    try {
      console.log('Archiving model in MongoDB:', selectedModelId);

      // Extract both model ID and version
      const parts = selectedModelId.split('-v');
      const baseModelId = parts[0];
      const version =
        parts.length > 1 ? parseInt(parts[1]) : undefined;

      // Include version as a query parameter
      let url = `${BACKEND_URL}/models/${baseModelId}`;
      if (version) {
        url += `?version=${version}`;
      }

      const response = await fetch(url, { method: 'DELETE' });

      if (!response.ok) throw new Error('Failed to archive model');

      const result = await response.json();
      console.log('MongoDB archive result:', result);

      showToast('Risk model archived in MongoDB', 'success');

      // Refresh models list to get all status changes
      await fetchModels();

      // If the archived model was selected, select another active model
      if (selectedModelId.split('-v')[0] === baseModelId) {
        const activeModel = models.find(
          (model) =>
            model.status === 'active' && model.modelId !== baseModelId
        );

        if (activeModel) {
          const compositeId = `${activeModel.modelId}-v${activeModel.version}`;
          setSelectedModelId(compositeId);
        } else {
          setSelectedModelId(null);
        }
      }
    } catch (error) {
      console.error('Error archiving model in MongoDB:', error);
      showToast('Failed to archive risk model', 'error');
    }
  };

  // Create a new model
  const handleCreateNewModel = (baseModel = null) => {
    // Create a new model based on the selected one or with default values
    const newModel = baseModel
      ? {
          ...baseModel,
          modelId: `${baseModel.modelId}-new`,
          description: `${baseModel.description} (New Version)`,
        }
      : {
          modelId: `model-${Date.now()}`,
          description: 'New Risk Model',
          weights: {
            amount_anomaly_high: 30,
            amount_anomaly_medium: 15,
            location_anomaly: 25,
            merchant_category_anomaly: 10,
            unknown_device: 35,
            velocity_anomaly: 20,
          },
          thresholds: {
            flag: 60,
            block: 85,
          },
          riskFactors: [
            {
              id: 'amount_anomaly_high',
              description:
                'Transaction amount significantly higher than customer average',
              threshold: 3.0,
              active: true,
            },
            {
              id: 'amount_anomaly_medium',
              description:
                'Transaction amount moderately higher than customer average',
              threshold: 2.0,
              active: true,
            },
            {
              id: 'location_anomaly',
              description: 'Transaction from unusual location',
              distanceThreshold: 100,
              active: true,
            },
            {
              id: 'merchant_category_anomaly',
              description: 'Transaction in unusual merchant category',
              active: true,
            },
            {
              id: 'unknown_device',
              description: 'Transaction from unknown device',
              active: true,
            },
            {
              id: 'velocity_anomaly',
              description: 'Multiple transactions in short timeframe',
              threshold: 5,
              active: true,
            },
          ],
        };

    setEditedModel(newModel);
    setEditMode(true);
  };

  // Save a newly created model
  const handleSaveNewModel = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/models/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          modelId: editedModel.modelId,
          description: editedModel.description,
          weights: editedModel.weights,
          thresholds: editedModel.thresholds,
          riskFactors: editedModel.riskFactors,
        }),
      });

      if (!response.ok) throw new Error('Failed to create model');

      const data = await response.json();

      showToast('Risk model created successfully');

      // Refresh models list
      fetchModels();
      // Select the new model
      setSelectedModelId(data.modelId);
      setEditMode(false);
      setEditedModel(null);
    } catch (error) {
      console.error('Error creating model:', error);
      showToast('Failed to create risk model', 'error');
    }
  };

  // Helper to format risk factor names
  const formatRiskFactorName = (factor) => {
    return factor
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // State for custom risk factor
  const [newRiskFactor, setNewRiskFactor] = useState({
    id: '',
    description: '',
    threshold: 1.0,
    distanceThreshold: 100.0, // Add default value for distanceThreshold
    active: true,
  });

  // Handle custom risk factor changes
  const handleNewRiskFactorChange = (field, value) => {
    setNewRiskFactor((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // Add a new risk factor (demonstrating schema flexibility)
  const addCustomRiskFactor = async () => {
    if (!newRiskFactor.id || !newRiskFactor.description) {
      showToast(
        'Please provide an ID and description for the risk factor',
        'warning'
      );
      return;
    }

    // Add to edited model if in edit mode
    if (editedModel && editMode) {
      const updatedFactors = [
        ...editedModel.riskFactors,
        { ...newRiskFactor },
      ];

      const updatedWeights = {
        ...editedModel.weights,
        [newRiskFactor.id]: 10, // Default weight
      };

      // Update the edited model in state
      setEditedModel((prev) => ({
        ...prev,
        riskFactors: updatedFactors,
        weights: updatedWeights,
      }));

      // Reset the form
      setNewRiskFactor({
        id: '',
        description: '',
        threshold: 1.0,
        distanceThreshold: 100.0, // Include default distance threshold
        active: true,
      });

      // Save the changes directly to MongoDB to demonstrate real-time updates
      try {
        console.log(
          'Saving new risk factor to MongoDB:',
          newRiskFactor
        );
        console.log(
          'Full payload:',
          JSON.stringify(
            {
              description: editedModel.description, // Include all required fields
              weights: updatedWeights,
              thresholds: editedModel.thresholds, // Include all required fields
              riskFactors: updatedFactors,
            },
            null,
            2
          )
        );

        const response = await fetch(
          `${BACKEND_URL}/models/${editedModel.modelId}`,
          {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              description: editedModel.description, // Include all required fields
              weights: updatedWeights,
              thresholds: editedModel.thresholds, // Include all required fields
              riskFactors: updatedFactors.map((factor) => ({
                ...factor,
                // Ensure numeric fields have valid defaults if null
                threshold:
                  factor.threshold !== null &&
                  factor.threshold !== undefined
                    ? factor.threshold
                    : 1.0,
                distanceThreshold:
                  factor.distanceThreshold !== null &&
                  factor.distanceThreshold !== undefined
                    ? factor.distanceThreshold
                    : 100.0,
              })),
            }),
          }
        );

        if (!response.ok) {
          const errorData = await response.text();
          console.error('API Error Response:', errorData);
          throw new Error(
            `Failed to update model: ${response.status} ${errorData}`
          );
        }

        const updatedModel = await response.json();

        // Update the displayed model with the MongoDB response
        setSelectedModel(updatedModel);

        // Highlight the new risk factor
        highlightField('riskFactors', newRiskFactor.id);

        showToast(
          `Risk factor '${newRiskFactor.id}' added to MongoDB in real-time`,
          'success'
        );
      } catch (error) {
        console.error(
          'Error saving new risk factor to MongoDB:',
          error
        );
        showToast('Failed to save risk factor to MongoDB', 'error');
      }
    } else {
      showToast(
        'Enter edit mode to add custom risk factors',
        'warning'
      );
    }
  };

  // Render status badge
  const renderStatusBadge = (status) => {
    let color = palette.gray.light1;
    let textColor = palette.gray.dark2;
    let icon = null;

    switch (status) {
      case 'active':
        color = palette.green.light2;
        textColor = palette.green.dark2;
        icon = <Icon glyph="Checkmark" />;
        break;
      case 'draft':
        color = palette.blue.light2;
        textColor = palette.blue.dark2;
        break;
      case 'archived':
        color = palette.gray.light2;
        textColor = palette.gray.dark2;
        break;
      default:
        color = palette.gray.light2;
        textColor = palette.gray.dark2;
    }

    return (
      <span
        style={{
          backgroundColor: color,
          color: textColor,
          padding: '4px 8px',
          borderRadius: '4px',
          fontSize: '12px',
          fontWeight: '600',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
        }}
      >
        {icon}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  return (
    <div>
      {/* Show notification banner if visible */}
      {notification.visible && (
        <Banner variant={notification.variant}>
          {notification.message}
        </Banner>
      )}

      <Card
        style={{
          width: '95%',
          margin: '0 auto',
          marginBottom: spacing[4],
        }}
      >
        <div style={{ padding: spacing[4] }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: spacing[3],
            }}
          >
            <div>
              <H2>Risk Model Management</H2>
              <Description>
                Configure and monitor risk scoring models
              </Description>
            </div>

            <Button
              variant="primary"
              leftGlyph={<Icon glyph="Plus" />}
              onClick={() => handleCreateNewModel()}
            >
              New Model
            </Button>
          </div>

          {/* Status Filter */}
          <div style={{ marginBottom: spacing[3] }}>
            <Label>Filter by Status</Label>
            <div
              style={{
                display: 'flex',
                gap: spacing[2],
                marginTop: spacing[1],
                flexWrap: 'wrap',
              }}
            >
              <Button
                size="small"
                variant={statusFilter === '' ? 'primary' : 'default'}
                onClick={() => setStatusFilter('')}
              >
                All
              </Button>
              <Button
                size="small"
                variant={
                  statusFilter === 'active' ? 'primary' : 'default'
                }
                onClick={() => setStatusFilter('active')}
              >
                Active
              </Button>
              <Button
                size="small"
                variant={
                  statusFilter === 'draft' ? 'primary' : 'default'
                }
                onClick={() => setStatusFilter('draft')}
              >
                Draft
              </Button>
              <Button
                size="small"
                variant={
                  statusFilter === 'inactive' ? 'primary' : 'default'
                }
                onClick={() => setStatusFilter('inactive')}
              >
                Inactive
              </Button>
              <Button
                size="small"
                variant={
                  statusFilter === 'archived' ? 'primary' : 'default'
                }
                onClick={() => setStatusFilter('archived')}
              >
                Archived
              </Button>
            </div>
          </div>

          {/* Model Selection */}
          <div style={{ marginBottom: spacing[4] }}>
            <Label htmlFor="model-select">Select Risk Model</Label>
            <Select
              id="model-select"
              onChange={(value) => {
                console.log('Model selected:', value);

                // Reset any highlighted fields
                setRecentlyUpdated({
                  description: false,
                  flagThreshold: false,
                  blockThreshold: false,
                  riskFactors: {},
                });

                // Set the selected model ID - use full composite ID
                setSelectedModelId(value);

                // Extract the model ID and version
                const parts = value.split('-v');
                const modelId = parts[0];

                // Always fetch from MongoDB to get fresh data
                console.log(
                  'Fetching fresh data from MongoDB for:',
                  modelId
                );
                fetchModelDetails(modelId);
              }}
              value={
                selectedModel
                  ? `${selectedModel.modelId}-v${selectedModel.version}`
                  : ''
              }
              placeholder="Select a risk model"
            >
              {models.map((model) => (
                <Option
                  key={`${model.modelId}-v${model.version}`}
                  value={`${model.modelId}-v${model.version}`}
                >
                  {model.modelId} (v{model.version}) - {model.status}
                </Option>
              ))}
            </Select>

            {/* MongoDB Document Viewer */}
            {selectedModel && (
              <div style={{ marginTop: spacing[3] }}>
                <details
                  style={{
                    borderRadius: '4px',
                    padding: spacing[2],
                    backgroundColor: palette.gray.light3,
                  }}
                >
                  <summary
                    style={{
                      cursor: 'pointer',
                      fontWeight: 'bold',
                      color: palette.blue.dark2,
                      padding: `${spacing[1]}px 0`,
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: spacing[2],
                      }}
                    >
                      <Icon
                        glyph="Database"
                        fill={palette.green.base}
                      />
                      <span>
                        MongoDB Document ({selectedModel._id})
                      </span>
                    </div>
                  </summary>
                  <div
                    style={{
                      maxHeight: '400px',
                      overflow: 'auto',
                      marginTop: spacing[2],
                    }}
                  >
                    <Code language="json" copyable={true}>
                      {JSON.stringify(selectedModel, null, 2)}
                    </Code>
                  </div>
                  <div
                    style={{
                      marginTop: spacing[2],
                      fontSize: '12px',
                      fontStyle: 'italic',
                      color: palette.gray.dark1,
                    }}
                  >
                    This shows the complete MongoDB document as stored
                    in the database. Notice the flexible schema that
                    allows easy addition of risk factors without
                    migration.
                  </div>
                </details>
              </div>
            )}
          </div>

          {selectedModel && (
            <div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: spacing[3],
                }}
              >
                <div>
                  <H3>{selectedModel.modelId}</H3>
                  <div
                    style={{
                      display: 'flex',
                      gap: spacing[2],
                      marginTop: spacing[1],
                    }}
                  >
                    <span
                      style={{
                        backgroundColor: palette.gray.light2,
                        color: palette.gray.dark2,
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: '600',
                      }}
                    >
                      v{selectedModel.version}
                    </span>
                    {renderStatusBadge(selectedModel.status)}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: spacing[2] }}>
                  {selectedModel.status !== 'active' &&
                    selectedModel.status !== 'archived' && (
                      <Button onClick={handleActivateModel}>
                        Activate Model
                      </Button>
                    )}

                  {selectedModel.status === 'archived' && (
                    <Button onClick={handleRestoreModel}>
                      Restore Model
                    </Button>
                  )}

                  {selectedModel.status !== 'archived' && (
                    <Button
                      variant="danger"
                      onClick={handleArchiveModel}
                    >
                      Archive Model
                    </Button>
                  )}

                  {!editMode &&
                    selectedModel.status !== 'archived' && (
                      <Button
                        variant="default"
                        onClick={handleEditModel}
                      >
                        Edit Model
                      </Button>
                    )}
                </div>
              </div>

              <div style={{ marginBottom: spacing[4] }}>
                <H3>MongoDB Advantages Demo</H3>

                <div
                  style={{
                    display: 'flex',
                    gap: spacing[3],
                    marginTop: spacing[2],
                  }}
                >
                  <Card style={{ flex: 1, padding: spacing[3] }}>
                    <H3>Schema Flexibility</H3>
                    <Body style={{ marginBottom: spacing[3] }}>
                      Add custom risk factors on-the-fly without
                      schema migrations, unlike SQL databases.
                    </Body>

                    {editMode && (
                      <div style={{ marginTop: spacing[3] }}>
                        <Label htmlFor="new-risk-factor-id">
                          Add Custom Risk Factor
                        </Label>
                        <div style={{ marginTop: spacing[2] }}>
                          <Label
                            htmlFor="new-risk-factor-id"
                            style={{ fontSize: '12px' }}
                          >
                            ID
                          </Label>
                          <div style={{ maxWidth: '95%' }}>
                            <TextInput
                              id="new-risk-factor-id"
                              placeholder="e.g., geo_velocity, device_mismatch"
                              value={newRiskFactor.id}
                              onChange={(e) =>
                                handleNewRiskFactorChange(
                                  'id',
                                  e.target.value
                                )
                              }
                            />
                          </div>
                        </div>

                        <div style={{ marginTop: spacing[2] }}>
                          <Label
                            htmlFor="new-risk-factor-desc"
                            style={{ fontSize: '12px' }}
                          >
                            Description
                          </Label>
                          <div style={{ maxWidth: '95%' }}>
                            <TextInput
                              id="new-risk-factor-desc"
                              placeholder="e.g., Unusual device location change"
                              value={newRiskFactor.description}
                              onChange={(e) =>
                                handleNewRiskFactorChange(
                                  'description',
                                  e.target.value
                                )
                              }
                            />
                          </div>
                        </div>

                        <div style={{ marginTop: spacing[2] }}>
                          <Label
                            htmlFor="new-risk-factor-threshold"
                            style={{ fontSize: '12px' }}
                          >
                            Threshold: {newRiskFactor.threshold}
                          </Label>
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: spacing[2],
                            }}
                          >
                            <span>0</span>
                            <div
                              style={{
                                flex: 1,
                                height: '4px',
                                backgroundColor: palette.gray.light2,
                                position: 'relative',
                              }}
                            >
                              <div
                                style={{
                                  position: 'absolute',
                                  left: 0,
                                  top: 0,
                                  height: '100%',
                                  width: `${
                                    (newRiskFactor.threshold / 5) *
                                    100
                                  }%`,
                                  backgroundColor: palette.blue.base,
                                  borderRadius: '2px',
                                }}
                              />
                              <input
                                type="range"
                                min="0"
                                max="5"
                                step="0.1"
                                value={newRiskFactor.threshold}
                                onChange={(e) =>
                                  handleNewRiskFactorChange(
                                    'threshold',
                                    parseFloat(e.target.value)
                                  )
                                }
                                style={{
                                  position: 'absolute',
                                  width: '100%',
                                  opacity: 0,
                                  cursor: 'pointer',
                                }}
                              />
                            </div>
                            <span>5</span>
                          </div>
                        </div>

                        <div
                          style={{
                            marginTop: spacing[3],
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                          }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: spacing[1],
                            }}
                          >
                            <input
                              type="checkbox"
                              id="new-risk-factor-active"
                              checked={newRiskFactor.active}
                              onChange={(e) =>
                                handleNewRiskFactorChange(
                                  'active',
                                  e.target.checked
                                )
                              }
                            />
                            <Label
                              htmlFor="new-risk-factor-active"
                              style={{ fontSize: '12px', margin: 0 }}
                            >
                              Active
                            </Label>
                          </div>

                          <Button
                            variant="primary"
                            leftGlyph={<Icon glyph="Plus" />}
                            onClick={addCustomRiskFactor}
                          >
                            Add Factor
                          </Button>
                        </div>

                        <div
                          style={{
                            marginTop: spacing[3],
                            padding: spacing[2],
                            backgroundColor: palette.blue.light3,
                            borderRadius: '4px',
                            borderLeft: `4px solid ${palette.blue.base}`,
                          }}
                        >
                          <Body
                            style={{
                              fontSize: '12px',
                              color: palette.blue.dark2,
                            }}
                          >
                            <strong>MongoDB Advantage:</strong> Unlike
                            SQL databases that require schema
                            migrations, MongoDB's flexible document
                            model lets you add new risk factors
                            on-the-fly without downtime or schema
                            changes.
                          </Body>
                        </div>
                      </div>
                    )}
                  </Card>

                  <Card style={{ flex: 1, padding: spacing[3] }}>
                    <H3>Real-Time Updates</H3>
                    <Body style={{ marginBottom: spacing[3] }}>
                      Leverage MongoDB Change Streams for instant
                      model updates across the system.
                    </Body>

                    <div
                      style={{
                        padding: spacing[2],
                        backgroundColor: palette.green.light3,
                        borderRadius: '4px',
                        marginTop: spacing[2],
                        position: 'relative',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          position: 'absolute',
                          top: 4,
                          right: 4,
                          display: 'flex',
                          alignItems: 'center',
                        }}
                      >
                        <span
                          style={{
                            height: '8px',
                            width: '8px',
                            borderRadius: '50%',
                            backgroundColor: wsConnected
                              ? palette.green.dark1
                              : palette.red.dark1,
                            marginRight: '4px',
                            animation: wsConnected
                              ? 'pulse 2s infinite'
                              : 'none',
                          }}
                        />
                        <span
                          style={{
                            fontSize: '11px',
                            color: wsConnected
                              ? palette.green.dark2
                              : palette.red.dark2,
                          }}
                        >
                          {wsConnected ? 'LIVE' : 'DISCONNECTED'}
                        </span>
                      </div>

                      <Label>Change Stream Events</Label>
                      <div
                        style={{
                          marginTop: spacing[2],
                          fontSize: '13px',
                          fontFamily: 'monospace',
                          backgroundColor: palette.gray.dark3,
                          color: palette.gray.light3,
                          padding: spacing[2],
                          borderRadius: '4px',
                          maxHeight: '200px',
                          overflow: 'auto',
                        }}
                      >
                        <div style={{ color: palette.green.light2 }}>
                          {'>>'} MongoDB Change Stream watching
                          collection: risk_models
                        </div>
                        <div style={{ color: palette.yellow.light2 }}>
                          {'>>'} Watching for operations: ["insert",
                          "update", "replace", "delete"]
                        </div>
                        <div
                          style={{
                            color: wsConnected
                              ? palette.green.light2
                              : palette.red.light2,
                          }}
                        >
                          {'>>'} WebSocket connection status:{' '}
                          {wsConnected ? 'CONNECTED' : 'DISCONNECTED'}
                        </div>
                        {selectedModel && (
                          <div style={{ color: palette.blue.light2 }}>
                            {'>>'} Current active model:{' '}
                            {selectedModel.modelId} (v
                            {selectedModel.version})
                          </div>
                        )}
                        {wsConnected && (
                          <div
                            style={{ color: palette.green.light2 }}
                          >
                            {'>>'} Now receiving real-time updates via
                            MongoDB Change Streams
                          </div>
                        )}

                        {/* Display actual change events */}
                        {changeEvents.length > 0 ? (
                          <>
                            <div
                              style={{
                                borderTop: `1px solid ${palette.gray.dark2}`,
                                margin: `${spacing[2]}px 0`,
                                paddingTop: spacing[2],
                              }}
                            >
                              <span
                                style={{
                                  color: palette.yellow.light2,
                                }}
                              >
                                Recent events ({changeEvents.length}):
                              </span>
                            </div>

                            {changeEvents.map((event, idx) => {
                              // Get detailed information about the changed fields
                              let fieldsChanged = [];
                              if (
                                (event.operationType === 'update' ||
                                  event.operationType ===
                                    'replace') &&
                                event.document
                              ) {
                                if (event.document.description)
                                  fieldsChanged.push('description');
                                if (event.document.thresholds?.flag)
                                  fieldsChanged.push(
                                    'flag threshold'
                                  );
                                if (event.document.thresholds?.block)
                                  fieldsChanged.push(
                                    'block threshold'
                                  );
                                if (event.document.riskFactors)
                                  fieldsChanged.push('risk factors');
                                if (event.document.status)
                                  fieldsChanged.push('status');
                                if (event.document.weights)
                                  fieldsChanged.push('weights');
                              }

                              // Use the event's timestamp if available
                              const timestamp = event.timestamp
                                ? new Date(
                                    event.timestamp
                                  ).toLocaleTimeString()
                                : formatEventTime();

                              // Get model details if available
                              const modelId =
                                event.document?.modelId || 'unknown';
                              const version =
                                event.document?.version || '?';
                              const status =
                                event.document?.status || '';

                              let eventDescription = '';
                              switch (event.operationType) {
                                case 'insert':
                                  eventDescription = `New model created: ${modelId} (v${version})`;
                                  break;
                                case 'update':
                                case 'replace':
                                  if (status === 'active') {
                                    eventDescription = `Model activated: ${modelId} (v${version})`;
                                  } else {
                                    eventDescription = `Model updated: ${modelId} (v${version})`;
                                  }
                                  break;
                                case 'delete':
                                  eventDescription = `Model deleted: ${
                                    event.documentId || 'unknown'
                                  }`;
                                  break;
                                default:
                                  eventDescription = `${event.operationType}: ${modelId}`;
                              }

                              return (
                                <div
                                  key={idx}
                                  className={
                                    idx === 0
                                      ? 'highlight-update'
                                      : ''
                                  }
                                  style={{
                                    color: getEventColor(
                                      event.operationType
                                    ),
                                    marginTop: spacing[1],
                                    padding: '3px 0',
                                  }}
                                >
                                  {'>>'} {timestamp} [
                                  {event.operationType}]{' '}
                                  {eventDescription}
                                  {fieldsChanged.length > 0 && (
                                    <div
                                      style={{
                                        color: palette.gray.light1,
                                        marginLeft: '18px',
                                        fontSize: '11px',
                                      }}
                                    >
                                      Fields:{' '}
                                      {fieldsChanged.join(', ')}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </>
                        ) : wsConnected ? (
                          <div
                            style={{
                              borderTop: `1px solid ${palette.gray.dark2}`,
                              margin: `${spacing[2]}px 0`,
                              paddingTop: spacing[2],
                              fontStyle: 'italic',
                              color: palette.gray.light1,
                            }}
                          >
                            {'>>'} Waiting for change events... Make
                            changes to any model to see real-time
                            updates.
                          </div>
                        ) : (
                          <div
                            style={{
                              borderTop: `1px solid ${palette.gray.dark2}`,
                              margin: `${spacing[2]}px 0`,
                              paddingTop: spacing[2],
                              fontStyle: 'italic',
                              color: palette.red.light2,
                            }}
                          >
                            {'>>'} Connect to WebSocket to see
                            real-time change events
                          </div>
                        )}
                      </div>

                      <div
                        style={{
                          marginTop: spacing[3],
                          padding: spacing[2],
                          backgroundColor: 'white',
                          borderRadius: '4px',
                          borderLeft: `4px solid ${palette.green.base}`,
                        }}
                      >
                        <Body
                          style={{
                            fontSize: '12px',
                            color: palette.green.dark2,
                          }}
                        >
                          <strong>MongoDB Advantage:</strong> Change
                          Streams provide real-time notifications
                          about data changes without polling. The risk
                          model service automatically updates when a
                          new model version is activated - impossible
                          with traditional SQL databases.
                        </Body>
                      </div>
                    </div>

                    <style jsx global>{`
                      @keyframes pulse {
                        0% {
                          opacity: 1;
                        }
                        50% {
                          opacity: 0.4;
                        }
                        100% {
                          opacity: 1;
                        }
                      }

                      @keyframes highlight {
                        0% {
                          background-color: transparent;
                        }
                        50% {
                          background-color: rgba(255, 214, 0, 0.3);
                        }
                        100% {
                          background-color: transparent;
                        }
                      }

                      @keyframes field-highlight {
                        0% {
                          background-color: transparent;
                        }
                        30% {
                          background-color: rgba(255, 193, 7, 0.2);
                        }
                        70% {
                          background-color: rgba(255, 193, 7, 0.2);
                        }
                        100% {
                          background-color: transparent;
                        }
                      }

                      .highlight-update {
                        animation: highlight 2s ease;
                      }

                      .highlight-field {
                        animation: field-highlight 3s ease;
                        border-radius: 4px;
                        position: relative;
                      }

                      .highlight-field::after {
                        content: 'Updated via Change Stream';
                        position: absolute;
                        bottom: 2px;
                        right: 5px;
                        font-size: 10px;
                        color: #9e6b03;
                        font-style: italic;
                      }
                    `}</style>
                  </Card>
                </div>
              </div>

              {/* Enhanced model info display */}
              <div style={{ marginTop: spacing[3] }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                  }}
                >
                  <div
                    className={
                      recentlyUpdated.description
                        ? 'highlight-field'
                        : ''
                    }
                    style={{
                      padding: spacing[2],
                      borderRadius: '4px',
                      minHeight: '70px',
                      width: '70%',
                    }}
                  >
                    <Label>Description</Label>
                    <Body>{selectedModel.description}</Body>
                  </div>

                  <div
                    style={{
                      backgroundColor: palette.green.light3,
                      padding: spacing[2],
                      borderRadius: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: spacing[1],
                    }}
                  >
                    <Icon glyph="Bell" fill={palette.green.dark2} />
                    <Body
                      style={{
                        fontSize: '13px',
                        color: palette.green.dark2,
                      }}
                    >
                      Real-time updates via Change Streams
                    </Body>
                  </div>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: spacing[3],
                    margin: `${spacing[3]} 0`,
                  }}
                >
                  <div
                    className={
                      recentlyUpdated.flagThreshold
                        ? 'highlight-field'
                        : ''
                    }
                    style={{
                      padding: spacing[2],
                      borderRadius: '4px',
                      minHeight: '70px',
                    }}
                  >
                    <Label>Flag Threshold</Label>
                    <Body style={{ fontSize: '16px' }}>
                      <strong>
                        {selectedModel.thresholds?.flag}
                      </strong>
                      /100
                    </Body>
                  </div>
                  <div
                    className={
                      recentlyUpdated.blockThreshold
                        ? 'highlight-field'
                        : ''
                    }
                    style={{
                      padding: spacing[2],
                      borderRadius: '4px',
                      minHeight: '70px',
                    }}
                  >
                    <Label>Block Threshold</Label>
                    <Body style={{ fontSize: '16px' }}>
                      <strong>
                        {selectedModel.thresholds?.block}
                      </strong>
                      /100
                    </Body>
                  </div>
                </div>

                {/* Risk Factors Table with Schema Flexibility Highlight */}
                <div style={{ marginTop: spacing[4] }}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: spacing[2],
                    }}
                  >
                    <Label>Risk Factors</Label>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        backgroundColor: palette.yellow.light3,
                        padding: `${spacing[1]}px ${spacing[2]}px`,
                        borderRadius: '4px',
                        fontSize: '12px',
                      }}
                    >
                      <Icon
                        glyph="Bulb"
                        size="small"
                        fill={palette.yellow.base}
                        style={{ marginRight: spacing[1] }}
                      />
                      <span style={{ color: palette.yellow.dark2 }}>
                        Flexible Schema - No migration needed for new
                        fields
                      </span>
                    </div>
                  </div>

                  <div
                    style={{
                      border: `1px solid ${palette.gray.light2}`,
                      borderRadius: '4px',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 100px 150px',
                        borderBottom: `1px solid ${palette.gray.light2}`,
                        backgroundColor: palette.gray.light3,
                        padding: spacing[2],
                      }}
                    >
                      <Body style={{ fontWeight: 'bold' }}>
                        Factor
                      </Body>
                      <Body style={{ fontWeight: 'bold' }}>
                        Weight
                      </Body>
                      <Body style={{ fontWeight: 'bold' }}>
                        Status
                      </Body>
                    </div>

                    {selectedModel.riskFactors?.map(
                      (factor, index) => {
                        const isUpdated =
                          recentlyUpdated.riskFactors &&
                          recentlyUpdated.riskFactors[factor.id];

                        // Using index + factor.id as key to ensure uniqueness
                        return (
                          <div
                            key={`${index}-${factor.id}`}
                            className={
                              isUpdated ? 'highlight-field' : ''
                            }
                            style={{
                              display: 'grid',
                              gridTemplateColumns: '1fr 100px 150px',
                              borderBottom:
                                index <
                                selectedModel.riskFactors.length - 1
                                  ? `1px solid ${palette.gray.light2}`
                                  : 'none',
                              padding: spacing[2],
                              backgroundColor:
                                index % 2 === 0
                                  ? 'white'
                                  : palette.gray.light2,
                              position: 'relative',
                            }}
                          >
                            <div>
                              <Body>{factor.description}</Body>
                              {factor.threshold && (
                                <span
                                  style={{
                                    fontSize: '12px',
                                    color: palette.gray.dark1,
                                  }}
                                >
                                  Threshold: {factor.threshold}
                                </span>
                              )}
                            </div>
                            <Body
                              style={{
                                fontWeight: isUpdated
                                  ? 'bold'
                                  : 'normal',
                              }}
                            >
                              {selectedModel.weights?.[factor.id] ||
                                '-'}
                            </Body>
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: spacing[1],
                              }}
                            >
                              <span
                                style={{
                                  backgroundColor: factor.active
                                    ? palette.green.light2
                                    : palette.gray.light2,
                                  color: factor.active
                                    ? palette.green.dark2
                                    : palette.gray.dark1,
                                  padding: '2px 8px',
                                  borderRadius: '4px',
                                  fontSize: '12px',
                                  fontWeight: 500,
                                }}
                              >
                                {factor.active
                                  ? 'Active'
                                  : 'Inactive'}
                              </span>
                              {isUpdated && (
                                <Icon
                                  glyph="Bell"
                                  fill={palette.yellow.dark2}
                                  size="small"
                                />
                              )}
                            </div>
                          </div>
                        );
                      }
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* MongoDB Advantages Summary */}
          <Card
            style={{
              width: '95%',
              marginTop: spacing[4],
              padding: spacing[4],
              margin: '20px auto',
            }}
          >
            <H2>MongoDB Advantages Over SQL Databases</H2>
            <Description>
              This panel demonstrates key advantages of MongoDB for a
              fraud detection system
            </Description>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: spacing[4],
                marginTop: spacing[4],
              }}
            >
              <div>
                <H3>Schema Flexibility</H3>
                <ul style={{ paddingLeft: spacing[4] }}>
                  <li style={{ marginBottom: spacing[2] }}>
                    <Body>
                      <strong>Dynamic Schema:</strong> Add new risk
                      factors on-the-fly without schema migrations or
                      downtime
                    </Body>
                  </li>
                  <li style={{ marginBottom: spacing[2] }}>
                    <Body>
                      <strong>Heterogeneous Documents:</strong>{' '}
                      Different risk factors can have different
                      properties (threshold, distanceThreshold, etc.)
                    </Body>
                  </li>
                  <li style={{ marginBottom: spacing[2] }}>
                    <Body>
                      <strong>Evolving Models:</strong> No need to
                      modify tables or create migration scripts when
                      adding new attributes
                    </Body>
                  </li>
                </ul>
              </div>

              <div>
                <H3>Real-Time Updates via Change Streams</H3>
                <ul style={{ paddingLeft: spacing[4] }}>
                  <li style={{ marginBottom: spacing[2] }}>
                    <Body>
                      <strong>Live Notifications:</strong> Get instant
                      notifications when models are updated or
                      activated
                    </Body>
                  </li>
                  <li style={{ marginBottom: spacing[2] }}>
                    <Body>
                      <strong>No Polling Required:</strong> WebSocket
                      + Change Stream integration eliminates constant
                      API polling
                    </Body>
                  </li>
                  <li style={{ marginBottom: spacing[2] }}>
                    <Body>
                      <strong>Automatic Cache Invalidation:</strong>{' '}
                      Risk model service updates in real-time without
                      periodic refreshes
                    </Body>
                  </li>
                </ul>
              </div>

              <div>
                <H3>Document Model Benefits</H3>
                <ul style={{ paddingLeft: spacing[4] }}>
                  <li style={{ marginBottom: spacing[2] }}>
                    <Body>
                      <strong>Embedded Data:</strong> Risk factors
                      embedded directly in the model document - no
                      JOINs required
                    </Body>
                  </li>
                  <li style={{ marginBottom: spacing[2] }}>
                    <Body>
                      <strong>Natural Data Representation:</strong>{' '}
                      Model structure matches business requirements
                      exactly
                    </Body>
                  </li>
                  <li style={{ marginBottom: spacing[2] }}>
                    <Body>
                      <strong>Atomic Document Updates:</strong> Update
                      individual risk factors without complex
                      transaction handling
                    </Body>
                  </li>
                </ul>
              </div>

              <div>
                <H3>Versioning and History</H3>
                <ul style={{ paddingLeft: spacing[4] }}>
                  <li style={{ marginBottom: spacing[2] }}>
                    <Body>
                      <strong>Document Versions:</strong> Each model
                      version is a complete standalone document
                    </Body>
                  </li>
                  <li style={{ marginBottom: spacing[2] }}>
                    <Body>
                      <strong>Simple Auditing:</strong> Complete
                      history of model changes with creation/update
                      timestamps
                    </Body>
                  </li>
                  <li style={{ marginBottom: spacing[2] }}>
                    <Body>
                      <strong>Quick Rollbacks:</strong> Switch active
                      models instantly without complex migrations
                    </Body>
                  </li>
                </ul>
              </div>
            </div>
          </Card>
        </div>
      </Card>
    </div>
  );
};

export default ModelAdminPanel;
