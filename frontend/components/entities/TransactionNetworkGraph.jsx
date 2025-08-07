import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import cytoscape from 'cytoscape';
import Card from '@leafygreen-ui/card';
import { H3, Body, Subtitle } from '@leafygreen-ui/typography';
import Badge from '@leafygreen-ui/badge';
import Button from '@leafygreen-ui/button';
import { Spinner } from '@leafygreen-ui/loading-indicator';
import Modal from '@leafygreen-ui/modal';
import Icon from '@leafygreen-ui/icon';
import { amlAPI } from '@/lib/aml-api';
import { transactionNetworkStyles } from './cytoscape/transactionNetworkStyles';
import { transformTransactionNetworkToCytoscape } from './cytoscape/transactionDataTransformation';

// Import Cytoscape extensions
import dagre from 'cytoscape-dagre';
import fcose from 'cytoscape-fcose';

// Register extensions
cytoscape.use(dagre);
cytoscape.use(fcose);

const TransactionNetworkGraph = ({ entityId, onError }) => {
  const containerRef = useRef(null);
  const cyRef = useRef(null);
  const [networkData, setNetworkData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState(null);
  const [currentLayout, setCurrentLayout] = useState('circle');
  const [showFullscreenModal, setShowFullscreenModal] = useState(false);
  const [fullscreenLayout, setFullscreenLayout] = useState('circle');

  const fetchNetworkData = async () => {
    try {
      setLoading(true);
      const response = await amlAPI.getEntityTransactionNetwork(entityId, 1);
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
  }, [entityId]);

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
    dagre: {
      name: 'dagre',
      animate: true,
      animationDuration: 1000,
      rankDir: 'TB',
      nodeSep: 50,
      rankSep: 75
    },
    circle: {
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

  // Initialize Cytoscape when container and data are ready
  useEffect(() => {
    if (!containerRef.current || !cytoscapeElements.length) return;

    // Destroy existing instance to prevent memory leaks
    if (cyRef.current) {
      cyRef.current.destroy();
    }

    // Create cytoscape instance with strict container constraints  
    cyRef.current = cytoscape({
      container: containerRef.current,
      elements: cytoscapeElements,
      style: transactionNetworkStyles,
      layout: { 
        name: 'preset', // Use preset layout to prevent any auto-sizing
        animate: false,
        fit: false,
        positions: {} // Empty positions - nodes will be at origin
      },
      wheelSensitivity: 0.2,
      minZoom: 0.3,
      maxZoom: 3,
      boxSelectionEnabled: false,
      autoungrabify: false,
      autounselectify: false,
      autolock: false,
      autoResizeContainer: false, // CRITICAL: Don't auto-resize container
      pixelRatio: 1 // Fixed pixel ratio
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

    // Apply proper layout after container is stable
    setTimeout(() => {
      if (cyRef.current) {
        const layout = cyRef.current.layout({
          name: 'cose',
          animate: false,
          fit: false,
          nodeRepulsion: 8000,
          idealEdgeLength: 100
        });
        layout.run();
        
        // Center without fitting
        cyRef.current.center();
        cyRef.current.zoom(1);
      }
    }, 100); // Small delay to ensure container is stable

    return () => {
      if (cyRef.current) {
        cyRef.current.destroy();
        cyRef.current = null;
      }
    };
  }, [cytoscapeElements, containerRef.current]);

  // Handle main layout changes with expansion prevention
  const handleLayoutChange = useCallback((layoutName) => {
    if (!cyRef.current || !layoutConfigs[layoutName]) {
      console.warn('Cannot switch layout: Cytoscape not ready or invalid layout');
      return;
    }
    
    // Check if cytoscape instance is still valid
    try {
      if (!cyRef.current.elements || cyRef.current.destroyed()) {
        console.warn('Cytoscape instance is destroyed, cannot change layout');
        return;
      }
    } catch (e) {
      console.warn('Cytoscape instance is invalid, cannot change layout');
      return;
    }
    
    setCurrentLayout(layoutName);
    
    try {
      const layoutConfig = {
        ...layoutConfigs[layoutName],
        fit: false,
        animate: true,
        animationDuration: 800
      };
      
      const layout = cyRef.current.layout(layoutConfig);
      layout.on('layoutstop', () => {
        // Double-check cytoscape is still valid before fitting
        if (cyRef.current && !cyRef.current.destroyed()) {
          cyRef.current.fit(cyRef.current.elements(), 30);
        }
      });
      layout.run();
      
    } catch (error) {
      console.error('Main layout switch failed:', error);
    }
  }, [layoutConfigs]);

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
    cyRef.current.fit(cyRef.current.elements(), 30);
  }, []);
  
  // Handle zoom in
  const handleZoomIn = useCallback(() => {
    if (!cyRef.current) return;
    const zoom = cyRef.current.zoom();
    cyRef.current.zoom(Math.min(zoom * 1.25, 3));
  }, []);
  
  // Handle zoom out
  const handleZoomOut = useCallback(() => {
    if (!cyRef.current) return;
    const zoom = cyRef.current.zoom();
    cyRef.current.zoom(Math.max(zoom * 0.8, 0.3));
  }, []);

  // Fullscreen cytoscape reference
  const fullscreenCyRef = useRef(null);

  // Handle fullscreen zoom to fit
  const handleFullscreenZoomToFit = useCallback(() => {
    if (!fullscreenCyRef.current) return;
    fullscreenCyRef.current.fit(fullscreenCyRef.current.elements(), 30);
  }, []);

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
    contain: 'strict', // CSS containment to prevent layout interference
    isolation: 'isolate', // Create new stacking context
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
          <Badge variant="green">
            🏢 {networkData.nodes?.length || 0} Entities
          </Badge>
          <Badge variant="gray">
            🔗 {networkData.total_transactions} Total Connections
          </Badge>
          <Badge variant="purple">
            💰 {formatAmount(networkData.center_entity_volume || networkData.total_volume)}
          </Badge>
          
        </div>
      )}

      {/* Network Container */}
      <div style={{ 
        position: 'relative', 
        flex: 1, 
        minHeight: 0, 
        overflow: 'hidden',
        width: '100%',  // Explicit width
        maxWidth: '100%' // Prevent expansion
      }}>
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
            maxWidth: '100%',   // Maximum size to prevent expansion
            overflow: 'hidden', // Hide any overflow
            position: 'relative', // Contain positioning
            contain: 'layout style paint', // Additional containment for cytoscape container
            isolation: 'isolate' // Isolate stacking context
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
            <option value="circle">Circular</option>
            <option value="concentric">Concentric</option>
          </select>
          
          <div style={{ display: 'flex', gap: '4px' }}>
            <button
              onClick={handleZoomIn}
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
              +
            </button>
            <button
              onClick={handleZoomOut}
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
              -
            </button>
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
        contentStyle={{ zIndex: 1001 }}
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
          contain: 'strict',
          isolation: 'isolate',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)'
        }}>
          <div 
            ref={(el) => {
              if (el && showFullscreenModal && cytoscapeElements.length > 0) {
                if (fullscreenCyRef.current) {
                  fullscreenCyRef.current.destroy();
                }
                fullscreenCyRef.current = cytoscape({
                  container: el,
                  elements: cytoscapeElements,
                  style: transactionNetworkStyles,
                  layout: { name: 'cose', animate: false },
                  wheelSensitivity: 0.2,
                  minZoom: 0.1,
                  maxZoom: 5,
                  autoResizeContainer: false
                });
                
                // Apply layout after initialization
                setTimeout(() => {
                  if (fullscreenCyRef.current) {
                    const layout = fullscreenCyRef.current.layout({
                      name: fullscreenLayout,
                      animate: true,
                      animationDuration: 800
                    });
                    layout.run();
                    fullscreenCyRef.current.fit(fullscreenCyRef.current.elements(), 30);
                  }
                }, 100);
              }
            }}
            style={{ 
              width: '100%', 
              height: '100%',
              backgroundColor: '#FAFAFA',
              contain: 'layout style paint',
              isolation: 'isolate'
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
              <option value="circle">Circular</option>
              <option value="concentric">Concentric</option>
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
        
        {/* Bottom Right Close Button */}
        <div style={{
          position: 'absolute',
          bottom: '16px',
          right: '16px',
          zIndex: 1002
        }}>
          <Button
            onClick={() => setShowFullscreenModal(false)}
            variant="primary"
            size="default"
            leftGlyph={<Icon glyph="X" />}
          >
            Close Fullscreen
          </Button>
        </div>
      </Modal>
    </div>
  );
};

export default TransactionNetworkGraph;