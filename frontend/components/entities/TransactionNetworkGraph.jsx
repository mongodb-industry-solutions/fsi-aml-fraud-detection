import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import cytoscape from 'cytoscape';
import Card from '@leafygreen-ui/card';
import { H3, Body, Subtitle } from '@leafygreen-ui/typography';
import Badge from '@leafygreen-ui/badge';
import Button from '@leafygreen-ui/button';
import { Spinner } from '@leafygreen-ui/loading-indicator';
import { Select, Option } from '@leafygreen-ui/select';
import Modal from '@leafygreen-ui/modal';
import Icon from '@leafygreen-ui/icon';
import { amlAPI } from '@/lib/aml-api';
import { transactionNetworkStyles } from './cytoscape/transactionNetworkStyles';
import { transformTransactionNetworkToCytoscape } from './cytoscape/transactionDataTransformation';

const TransactionNetworkGraph = ({ entityId, onError }) => {
  const containerRef = useRef(null);
  const cyRef = useRef(null);
  const [networkData, setNetworkData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState(null);
  const [maxDepth, setMaxDepth] = useState(1);
  const [currentLayout, setCurrentLayout] = useState('cose');
  const [showFullscreenModal, setShowFullscreenModal] = useState(false);
  const [extensionsLoaded, setExtensionsLoaded] = useState(false);
  const [fullscreenLayout, setFullscreenLayout] = useState('cose');
  const fullscreenCyRef = useRef(null);

  const fetchNetworkData = async () => {
    try {
      setLoading(true);
      const response = await amlAPI.getEntityTransactionNetwork(entityId, maxDepth);
      setNetworkData(response);
    } catch (error) {
      console.error('Error fetching transaction network:', error);
      onError?.(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (entityId) {
      fetchNetworkData();
    }
  }, [entityId, maxDepth]);

  // Layout configurations
  const layoutConfigs = {
    cose: {
      name: 'cose',
      animate: true,
      animationDuration: 1000,
      nodeDimensionsIncludeLabels: true,
      nodeRepulsion: 8000,
      idealEdgeLength: 100,
      gravity: 0.1
    },
    hierarchical: {
      name: 'dagre',
      animate: true,
      animationDuration: 1000,
      rankDir: 'TB',
      nodeSep: 50,
      rankSep: 75
    },
    circular: {
      name: 'circle',
      animate: true,
      animationDuration: 1000,
      radius: 200
    },
    concentric: {
      name: 'concentric',
      animate: true,
      animationDuration: 1000,
      concentric: (node) => node.degree(),
      levelWidth: () => 2
    },
    grid: {
      name: 'grid',
      animate: true,
      animationDuration: 1000,
      rows: undefined,
      cols: undefined
    }
  };

  // Helper functions remain for legacy data formatting
  // Main styling is now handled by transactionNetworkStyles.js and transactionDataTransformation.js

  // Transform network data for Cytoscape using sophisticated transformation
  const cytoscapeElements = useMemo(() => {
    if (!networkData) return [];

    console.log('🔄 TransactionNetworkGraph: Transforming backend data to Cytoscape format:', networkData);
    const elements = transformTransactionNetworkToCytoscape(networkData, entityId);
    console.log('✅ TransactionNetworkGraph: Transformation complete, elements:', elements);
    
    return elements;
  }, [networkData, entityId]);

  // Initialize main Cytoscape instance
  const initializeMainCytoscape = useCallback(async (container) => {
    if (!container || cytoscapeElements.length === 0) return;

    // Load extensions dynamically
    let fcose, dagre;
    try {
      fcose = (await import('cytoscape-fcose')).default;
      dagre = (await import('cytoscape-dagre')).default;
      cytoscape.use(fcose);
      cytoscape.use(dagre);
      setExtensionsLoaded(true);
    } catch (error) {
      console.warn('Failed to load Cytoscape extensions:', error);
    }

    // Destroy existing instance
    if (cyRef.current) {
      cyRef.current.destroy();
    }

    // Create new Cytoscape instance with transaction-specific styling
    cyRef.current = cytoscape({
      container: container,
      elements: cytoscapeElements,
      style: transactionNetworkStyles,
      layout: layoutConfigs[currentLayout] || layoutConfigs.cose,
      wheelSensitivity: 0.2,
      minZoom: 0.3,
      maxZoom: 3
    });

    // Add event listeners
    cyRef.current.on('tap', 'node', (event) => {
      const node = event.target;
      setSelectedNode({
        id: node.id(),
        ...node.data()
      });
    });

    cyRef.current.on('tap', (event) => {
      if (event.target === cyRef.current) {
        setSelectedNode(null);
      }
    });

    // Auto-fit to container with padding
    cyRef.current.fit(cyRef.current.elements(), 30);
  }, [cytoscapeElements, currentLayout]);

  // Initialize fullscreen Cytoscape instance separately
  const initializeFullscreenCytoscape = useCallback(async (container) => {
    if (!container || cytoscapeElements.length === 0) return;

    // Destroy existing fullscreen instance
    if (fullscreenCyRef.current) {
      fullscreenCyRef.current.destroy();
    }

    // Create separate Cytoscape instance for fullscreen
    fullscreenCyRef.current = cytoscape({
      container: container,
      elements: cytoscapeElements,
      style: transactionNetworkStyles,
      layout: layoutConfigs[fullscreenLayout] || layoutConfigs.cose,
      wheelSensitivity: 0.2,
      minZoom: 0.3,
      maxZoom: 3
    });

    // Add event listeners for fullscreen instance
    fullscreenCyRef.current.on('tap', 'node', (event) => {
      const node = event.target;
      setSelectedNode({
        id: node.id(),
        ...node.data()
      });
    });

    fullscreenCyRef.current.on('tap', (event) => {
      if (event.target === fullscreenCyRef.current) {
        setSelectedNode(null);
      }
    });

    // Auto-fit to container with padding
    fullscreenCyRef.current.fit(fullscreenCyRef.current.elements(), 30);
  }, [cytoscapeElements, fullscreenLayout]);

  // Initialize main Cytoscape
  useEffect(() => {
    if (containerRef.current) {
      initializeMainCytoscape(containerRef.current);
    }
  }, [initializeMainCytoscape]);

  // Handle main layout changes with expansion prevention
  const handleLayoutChange = useCallback((layoutName) => {
    if (!cyRef.current || !layoutConfigs[layoutName]) {
      console.warn('Cannot switch layout: Cytoscape not ready or invalid layout');
      return;
    }
    
    setCurrentLayout(layoutName);
    
    try {
      const layoutConfig = {
        ...layoutConfigs[layoutName],
        fit: false, // Prevent auto-fit to prevent expansion
        animate: true,
        animationDuration: 800,
        // Add constraints to prevent expansion
        boundingBox: {
          x1: 0,
          y1: 0,
          x2: cyRef.current.container().offsetWidth,
          y2: cyRef.current.container().offsetHeight
        }
      };
      
      const layout = cyRef.current.layout(layoutConfig);
      layout.on('layoutstop', () => {
        // Fit to container bounds without expanding
        cyRef.current.fit(cyRef.current.elements(), 30);
      });
      layout.run();
      
    } catch (error) {
      console.error('Main layout switch failed:', error);
    }
  }, []);

  // Handle fullscreen layout changes separately
  const handleFullscreenLayoutChange = useCallback((layoutName) => {
    if (!fullscreenCyRef.current || !layoutConfigs[layoutName]) {
      console.warn('Cannot switch fullscreen layout: Cytoscape not ready or invalid layout');
      return;
    }
    
    setFullscreenLayout(layoutName);
    
    try {
      const layoutConfig = {
        ...layoutConfigs[layoutName],
        fit: false,
        animate: true,
        animationDuration: 800,
        // Add constraints for fullscreen
        boundingBox: {
          x1: 0,
          y1: 0,
          x2: fullscreenCyRef.current.container().offsetWidth,
          y2: fullscreenCyRef.current.container().offsetHeight
        }
      };
      
      const layout = fullscreenCyRef.current.layout(layoutConfig);
      layout.on('layoutstop', () => {
        fullscreenCyRef.current.fit(fullscreenCyRef.current.elements(), 30);
      });
      layout.run();
      
    } catch (error) {
      console.error('Fullscreen layout switch failed:', error);
    }
  }, []);

  // Handle zoom to fit for main view
  const handleZoomToFit = useCallback(() => {
    if (!cyRef.current) return;
    cyRef.current.fit(cyRef.current.elements(), 50);
  }, []);

  // Handle zoom to fit for fullscreen view
  const handleFullscreenZoomToFit = useCallback(() => {
    if (!fullscreenCyRef.current) return;
    fullscreenCyRef.current.fit(fullscreenCyRef.current.elements(), 50);
  }, []);

  // Cleanup fullscreen instance when modal closes
  useEffect(() => {
    if (!showFullscreenModal && fullscreenCyRef.current) {
      fullscreenCyRef.current.destroy();
      fullscreenCyRef.current = null;
    }
  }, [showFullscreenModal]);

  const formatAmount = (amount, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      notation: 'compact',
      maximumFractionDigits: 1
    }).format(amount);
  };

  // Container style with strict width constraints - moved before early return
  const containerStyle = useMemo(() => ({
    width: '100%',
    height: '600px',
    maxWidth: '100%',
    minWidth: 0, // Allow flex shrinking
    border: '1px solid #E5E7EB',
    borderRadius: '12px',
    backgroundColor: '#F9FAFB',
    position: 'relative',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)'
  }), []);

  if (loading && !networkData) {
    return (
      <Card style={{ padding: '24px', textAlign: 'center' }}>
        <Spinner size="large" />
        <Body style={{ marginTop: '16px' }}>Building transaction network...</Body>
      </Card>
    );
  }

  return (
    <div style={containerStyle}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        padding: '16px',
        borderBottom: '1px solid #E5E7EB'
      }}>
        <H3 style={{ margin: 0 }}>Transaction Network</H3>
        
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <Select
            value={maxDepth.toString()}
            onChange={(value) => setMaxDepth(parseInt(value))}
            label="Network Depth"
            size="small"
          >
            <Option value="1">1 Hop</Option>
            <Option value="2">2 Hops</Option>
            <Option value="3">3 Hops</Option>
          </Select>
          {loading && <Spinner size="small" />}
        </div>
      </div>

      {/* Network Statistics */}
      {networkData && (
        <div style={{ 
          display: 'flex', 
          gap: '12px', 
          padding: '12px 16px',
          borderBottom: '1px solid #E5E7EB',
          flexWrap: 'wrap'
        }}>
          <Badge variant="blue">
            📊 {networkData.center_entity_transaction_count || networkData.total_transactions} Direct Transactions
          </Badge>
          <Badge variant="gray">
            🔗 {networkData.total_transactions} Network Total
          </Badge>
          <Badge variant="purple">
            💰 {formatAmount(networkData.center_entity_volume || networkData.total_volume)}
          </Badge>
          <Badge variant="green">
            🏢 {networkData.nodes?.length || 0} Entities
          </Badge>
        </div>
      )}

      {/* Network Container */}
      <div style={{ position: 'relative', flex: 1, minHeight: 0, overflow: 'hidden' }}>
        {loading && (
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 10
          }}>
            <Spinner />
          </div>
        )}
        
        <div 
          ref={containerRef} 
          style={{ 
            width: '100%', 
            height: '100%',
            backgroundColor: '#FAFAFA',
            position: 'relative',
            minWidth: 0, // Allow shrinking in flex container
            maxWidth: '100%' // Prevent expansion
          }} 
        />
        
        {/* Layout Controls */}
        <div style={{
          position: 'absolute',
          top: '16px',
          right: '16px',
          backgroundColor: 'rgba(255, 255, 255, 0.98)',
          padding: '12px',
          borderRadius: '8px',
          border: '1px solid #E5E7EB',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          backdropFilter: 'blur(10px)',
          zIndex: 10,
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          minWidth: '160px'
        }}>     
          <select 
            value={currentLayout} 
            onChange={(e) => handleLayoutChange(e.target.value)}
            style={{
              padding: '6px 8px',
              borderRadius: '4px',
              border: '1px solid #E5E7EB',
              backgroundColor: '#FFFFFF',
              fontSize: '12px',
              color: '#374151',
              cursor: 'pointer'
            }}
          >
            <option value="cose">Force-Directed</option>
            <option value="hierarchical">Hierarchical</option>
            <option value="circular">Circular</option>
            <option value="concentric">Concentric</option>
            <option value="grid">Grid</option>
          </select>
          
          <div style={{ display: 'flex', gap: '4px' }}>
            <button
              onClick={handleZoomToFit}
              style={{
                padding: '4px 8px',
                fontSize: '11px',
                border: '1px solid #E5E7EB',
                borderRadius: '4px',
                backgroundColor: '#FFFFFF',
                color: '#374151',
                cursor: 'pointer',
                flex: 1
              }}
            >
              Fit
            </button>
          </div>
             
          <button
            onClick={() => setShowFullscreenModal(true)}
            style={{
              padding: '6px 8px',
              fontSize: '11px',
              border: '1px solid #3B82F6',
              borderRadius: '4px',
              backgroundColor: '#3B82F6',
              color: '#FFFFFF',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              fontWeight: '500'
            }}
          >
            <Icon glyph="FullScreen" size={12} fill="#FFFFFF" />
            Fullscreen
          </button>
        </div>
      </div>

      {/* Selected Node Details */}
      {selectedNode && (
        <div style={{ 
          position: 'absolute',
          bottom: '16px',
          left: '16px',
          backgroundColor: 'rgba(255, 255, 255, 0.98)',
          padding: '12px',
          borderRadius: '8px',
          border: '1px solid #E5E7EB',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          backdropFilter: 'blur(10px)',
          zIndex: 10,
          maxWidth: '300px'
        }}>
          <H3 style={{ margin: '0 0 8px 0', fontSize: '14px' }}>{selectedNode.fullName || selectedNode.label}</H3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <Body style={{ fontSize: '12px', fontWeight: 'bold', margin: '0 0 4px 0' }}>Entity Type</Body>
              <Badge variant="blue">{selectedNode.entityType || selectedNode.entity_type}</Badge>
              <Body style={{ fontSize: '11px', marginTop: '4px', color: '#6B7280' }}>
                {selectedNode.metadata?.riskLevelText || `Risk: ${selectedNode.avgRiskScore?.toFixed(1) || selectedNode.avg_risk_score?.toFixed(1) || 'N/A'}`}
              </Body>
            </div>
            
            <div>
              <Body style={{ fontSize: '12px', fontWeight: 'bold', margin: '0 0 4px 0' }}>Transaction Activity</Body>
              <div style={{ fontSize: '11px', lineHeight: '1.4' }}>
                <div>Sent: {selectedNode.metadata?.sentFormatted || formatAmount(selectedNode.totalSent || selectedNode.total_sent || 0)}</div>
                <div>Received: {selectedNode.metadata?.receivedFormatted || formatAmount(selectedNode.totalReceived || selectedNode.total_received || 0)}</div>
                <div>Total: {selectedNode.metadata?.volumeFormatted || formatAmount((selectedNode.totalVolume || 0) || ((selectedNode.totalSent || selectedNode.total_sent || 0) + (selectedNode.totalReceived || selectedNode.total_received || 0)))}</div>
                <div>Count: {selectedNode.metadata?.transactionCountFormatted || `${selectedNode.transactionCount || selectedNode.transaction_count || 0} transactions`}</div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Fullscreen Modal */}
      <Modal
        open={showFullscreenModal}
        setOpen={setShowFullscreenModal}
        size="large"
      >
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: '16px' 
        }}>
          <H3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Icon glyph="Charts" style={{ color: '#3B82F6' }} />
            Transaction Network - Fullscreen View
          </H3>
          <Body style={{ color: '#6B7280', fontSize: '12px' }}>
            {networkData?.nodes?.length || 0} entities • {networkData?.total_transactions || 0} transactions
          </Body>
        </div>
        
        <div style={{
          width: '100%',
          height: '80vh',
          border: '1px solid #E5E7EB',
          borderRadius: '12px',
          backgroundColor: '#F9FAFB',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)'
        }}>
          <div 
            style={{ 
              width: '100%', 
              height: '100%',
              backgroundColor: '#FAFAFA',
              minWidth: 0, // Allow shrinking
              maxWidth: '100%' // Prevent expansion
            }} 
            ref={(el) => {
              if (el && showFullscreenModal && cytoscapeElements.length > 0) {
                initializeFullscreenCytoscape(el);
              }
            }}
          />
          
          {/* Layout Controls for Fullscreen */}
          <div style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            backgroundColor: 'rgba(255, 255, 255, 0.98)',
            padding: '16px',
            borderRadius: '12px',
            border: '1px solid #E5E7EB',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            backdropFilter: 'blur(10px)',
            zIndex: 10,
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            minWidth: '180px'
          }}>
            <H3 style={{ fontSize: '13px', margin: '0 0 8px 0', color: '#1F2937' }}>
              Layout Controls
            </H3>
            
            <select 
              value={fullscreenLayout} 
              onChange={(e) => handleFullscreenLayoutChange(e.target.value)}
              style={{
                padding: '6px 10px',
                borderRadius: '6px',
                border: '1px solid #E5E7EB',
                backgroundColor: '#FFFFFF',
                fontSize: '12px',
                color: '#374151',
                cursor: 'pointer'
              }}
            >
              <option value="cose">Force-Directed</option>
              <option value="hierarchical">Hierarchical</option>
              <option value="circular">Circular</option>
              <option value="concentric">Concentric</option>
              <option value="grid">Grid</option>
            </select>
            
            <button
              onClick={handleFullscreenZoomToFit}
              style={{
                padding: '6px 10px',
                fontSize: '11px',
                border: '1px solid #E5E7EB',
                borderRadius: '6px',
                backgroundColor: '#FFFFFF',
                color: '#374151',
                cursor: 'pointer'
              }}
            >
              Fit to View
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default TransactionNetworkGraph;