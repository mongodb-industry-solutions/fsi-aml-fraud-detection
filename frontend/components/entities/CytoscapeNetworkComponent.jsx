/**
 * CytoscapeNetworkComponent.jsx
 * 
 * Professional AML network visualization using Cytoscape.js
 * Direct replacement for NetworkGraphComponent.jsx with enhanced capabilities
 */

"use client";

import React, { useMemo, useEffect, useRef, useState, useCallback } from 'react';
import { Body, H3 } from '@leafygreen-ui/typography';
import Modal from '@leafygreen-ui/modal';
import Button from '@leafygreen-ui/button';
import Icon from '@leafygreen-ui/icon';
import cytoscape from 'cytoscape';

// Cytoscape configuration imports
import { cytoscapeStyles } from './cytoscape/cytoscapeStyles';
import { cytoscapeLayouts, switchLayout, getRecommendedLayout } from './cytoscape/cytoscapeLayouts';
import { setupCytoscapeEvents } from './cytoscape/cytoscapeEvents';
import { transformBackendToCytoscape, getNetworkStatistics } from './cytoscape/dataTransformation';

// Cytoscape extensions (dynamically imported to prevent SSR issues)
let fcose, dagre, contextMenus, panzoom;

const CytoscapeNetworkComponent = ({ 
  networkData, 
  onNodeClick, 
  onEdgeClick,
  centerNodeId,
  className = '',
  style = {},
  layout = 'forceDirected',
  showControls = true,
  showLegend = true,
  showStatistics = false
}) => {
  const containerRef = useRef(null);
  const cyRef = useRef(null);
  const fullscreenContainerRef = useRef(null);
  const fullscreenCyRef = useRef(null);
  const [currentLayout, setCurrentLayout] = useState(layout);
  const [fullscreenLayout, setFullscreenLayout] = useState(layout);
  const [isLayoutRunning, setIsLayoutRunning] = useState(false);
  const [extensionsLoaded, setExtensionsLoaded] = useState(false);
  const [showFullscreenModal, setShowFullscreenModal] = useState(false);
  const [selectedNode, setSelectedNode] = useState(null);
  const [showModal, setShowModal] = useState(false);

  // Transform backend data to Cytoscape format
  const elements = useMemo(() => {
    if (!networkData || !networkData.nodes || !networkData.edges) {
      return [];
    }

    console.log('🔄 CytoscapeNetworkComponent: Transforming backend data to Cytoscape format:', networkData);
    const cytoscapeElements = transformBackendToCytoscape(networkData, centerNodeId);
    console.log('✅ CytoscapeNetworkComponent: Transformation complete, elements:', cytoscapeElements);
    
    return cytoscapeElements;
  }, [networkData, centerNodeId]);

  // Container style with strict sizing constraints - increased height
  const containerStyle = useMemo(() => ({
    width: '100%',
    height: '800px',
    minWidth: '100%',
    maxWidth: '100%',
    minHeight: '800px',
    maxHeight: '800px',
    border: '1px solid #E5E7EB',
    borderRadius: '12px',
    backgroundColor: '#F9FAFB',
    background: 'linear-gradient(to bottom, #FFFFFF, #F9FAFB)',
    position: 'relative',
    overflow: 'hidden', // Prevent content from expanding beyond container
    contain: 'strict', // CSS containment to prevent layout interference
    isolation: 'isolate', // Create new stacking context
    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
    ...style
  }), [style]);

  // Load Cytoscape extensions once
  useEffect(() => {
    const loadExtensions = async () => {
      if (!extensionsLoaded) {
        // Dynamically import and register extensions to prevent SSR issues
        if (!fcose) {
          fcose = (await import('cytoscape-fcose')).default;
          cytoscape.use(fcose);
        }
        if (!dagre) {
          dagre = (await import('cytoscape-dagre')).default;
          cytoscape.use(dagre);
        }
        if (!contextMenus) {
          contextMenus = (await import('cytoscape-context-menus')).default;
          cytoscape.use(contextMenus);
        }
        if (!panzoom) {
          panzoom = (await import('cytoscape-panzoom')).default;
          cytoscape.use(panzoom);
        }
        setExtensionsLoaded(true);
      }
    };
    loadExtensions();
  }, [extensionsLoaded]);

  // Handle main layout changes
  const handleLayoutChange = useCallback((layoutName) => {
    if (!cyRef.current || !extensionsLoaded || !cytoscapeLayouts[layoutName]) {
      console.warn('Cannot switch main layout: Cytoscape or extensions not ready');
      return;
    }
    
    setCurrentLayout(layoutName);
    setIsLayoutRunning(true);
    
    try {
      const layoutConfig = {
        ...cytoscapeLayouts[layoutName],
        fit: false,
        animate: true,
        animationDuration: 800
      };
      
      const layout = cyRef.current.layout(layoutConfig);
      layout.on('layoutstop', () => {
        setIsLayoutRunning(false);
        if (cyRef.current) {
          cyRef.current.fit(cyRef.current.elements(), 30);
        }
      });
      layout.run();
      
    } catch (error) {
      console.error('Main layout switch failed:', error);
      setIsLayoutRunning(false);
    }
  }, [extensionsLoaded]);

  // Handle fullscreen layout changes
  const handleFullscreenLayoutChange = useCallback((layoutName) => {
    if (!fullscreenCyRef.current || !extensionsLoaded || !cytoscapeLayouts[layoutName]) {
      console.warn('Cannot switch fullscreen layout: Cytoscape or extensions not ready');
      return;
    }
    
    setFullscreenLayout(layoutName);
    
    try {
      const layoutConfig = {
        ...cytoscapeLayouts[layoutName],
        fit: false,
        animate: true,
        animationDuration: 800
      };
      
      const layout = fullscreenCyRef.current.layout(layoutConfig);
      layout.on('layoutstop', () => {
        if (fullscreenCyRef.current) {
          fullscreenCyRef.current.fit(fullscreenCyRef.current.elements(), 30);
        }
      });
      layout.run();
      
    } catch (error) {
      console.error('Fullscreen layout switch failed:', error);
    }
  }, [extensionsLoaded]);

  // Handle zoom to fit for both main and fullscreen
  const handleZoomToFit = useCallback((isFullscreen = false) => {
    const targetCy = isFullscreen ? fullscreenCyRef.current : cyRef.current;
    if (!targetCy) return;
    targetCy.fit(targetCy.elements(), 50);
  }, []);

  // Handle reset view for both main and fullscreen
  const handleResetView = useCallback((isFullscreen = false) => {
    const targetCy = isFullscreen ? fullscreenCyRef.current : cyRef.current;
    if (!targetCy) return;
    targetCy.reset();
    targetCy.fit(targetCy.elements(), 50);
  }, []);

  // Apply layout when data changes
  useEffect(() => {
    if (cyRef.current && extensionsLoaded && elements.length > 0 && currentLayout) {
      // Small delay to ensure elements are rendered
      const timeoutId = setTimeout(() => {
        if (cyRef.current && extensionsLoaded && cytoscapeLayouts[currentLayout]) {
          try {
            setIsLayoutRunning(true);
            
            // Get layout config and disable auto-fit to prevent expansion
            const layoutConfig = {
              ...cytoscapeLayouts[currentLayout],
              fit: false, // Disable auto-fit to prevent container expansion
              animate: true,
              animationDuration: 800
            };
            
            // Apply layout with disabled fit
            const layout = cyRef.current.layout(layoutConfig);
            layout.on('layoutstop', () => {
              setIsLayoutRunning(false);
              // Manual fit to container bounds after layout completes
              cyRef.current.fit(cyRef.current.elements(), 30);
            });
            layout.run();
            
          } catch (error) {
            console.error('Layout application failed:', error);
            setIsLayoutRunning(false);
          }
        }
      }, 100);
      
      return () => clearTimeout(timeoutId);
    }
  }, [extensionsLoaded, elements.length, currentLayout]);

  // Show empty state if no data
  if (!networkData || !networkData.nodes || networkData.nodes.length === 0) {
    return (
      <div className={className} style={containerStyle}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          flexDirection: 'column',
          color: '#5C6C7C'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔍</div>
          <Body>No network data available</Body>
          <Body style={{ color: '#89979B', fontSize: '14px', marginTop: '8px' }}>
            Try adjusting the depth or strength parameters
          </Body>
        </div>
      </div>
    );
  }

  // Initialize Cytoscape when container and data are ready
  useEffect(() => {
    if (!containerRef.current || !elements.length || !extensionsLoaded) return;

    // Destroy existing instance to prevent memory leaks
    if (cyRef.current) {
      cyRef.current.destroy();
    }

    try {
      // Create cytoscape instance
      cyRef.current = cytoscape({
        container: containerRef.current,
        elements: elements,
        style: cytoscapeStyles,
        layout: { 
          name: 'cose',
          animate: true,
          animationDuration: 1000,
          nodeDimensionsIncludeLabels: true,
          nodeRepulsion: 8000,
          idealEdgeLength: 100,
          gravity: 0.1,
          fit: true,
          padding: 30
        },
        wheelSensitivity: 0.2,
        minZoom: 0.3,
        maxZoom: 3,
        boxSelectionEnabled: true,
        autoungrabify: false,
        autounselectify: false,
        autolock: false,
        autoResizeContainer: false,
        pixelRatio: 1
      });

      // Setup event handlers
      setupCytoscapeEvents(cyRef.current, {
        onNodeClick: (nodeData) => {
          console.log('Node clicked:', nodeData);
          onNodeClick && onNodeClick(nodeData);
        },
        onEdgeClick: (edgeData) => {
          console.log('Edge clicked:', edgeData);
          onEdgeClick && onEdgeClick(edgeData);
        },
        onLayoutComplete: (layoutInfo) => {
          console.log('Layout completed:', layoutInfo);
          setIsLayoutRunning(false);
        },
        onSelectionChange: (selection) => {
          console.log('Selection changed:', selection);
        },
        onNetworkReady: (networkInfo) => {
          console.log('Network ready:', networkInfo);
          
          // Auto-select recommended layout if not manually set
          if (layout === 'auto') {
            const recommended = getRecommendedLayout(networkData);
            handleLayoutChange(recommended);
          }
        }
      });

      // Setup context menus
      cyRef.current.contextMenus({
        menuItems: [
          {
            id: 'focus-node',
            content: 'Focus on Node',
            tooltipText: 'Center view on this node',
            selector: 'node',
            onClickFunction: function(event) {
              const target = event.target || event.cyTarget;
              cyRef.current.animate({
                center: { eles: target },
                zoom: Math.min(cyRef.current.zoom() * 1.5, 3.0)
              }, { duration: 800 });
            }
          },
          {
            id: 'hide-node',
            content: 'Hide Node',
            tooltipText: 'Hide this node from view',
            selector: 'node',
            onClickFunction: function(event) {
              const target = event.target || event.cyTarget;
              target.hide();
            }
          },
          {
            id: 'expand-network',
            content: 'Expand Network',
            tooltipText: 'Load more connections',
            selector: 'node',
            onClickFunction: function(event) {
              const target = event.target || event.cyTarget;
              console.log('Expand network for:', target.data('id'));
            }
          }
        ]
      });

      // Setup enhanced pan/zoom
      cyRef.current.panzoom({
        zoomFactor: 0.05,
        zoomDelay: 45,
        minZoom: 0.1,
        maxZoom: 10,
        fitPadding: 50,
        panSpeed: 10,
        panDistance: 10,
        panDragAreaSize: 75,
        panMinPercentSpeed: 0.25,
        panMaxPercentSpeed: 2.0,
        panInactiveArea: 8,
        panIndicatorMinOpacity: 0.5,
        autodisableForMobile: true
      });

      // Add node click event for modal
      cyRef.current.on('tap', 'node', (event) => {
        const node = event.target;
        setSelectedNode({
          id: node.id(),
          ...node.data()
        });
        setShowModal(true);
      });

      cyRef.current.on('tap', (event) => {
        if (event.target === cyRef.current) {
          setSelectedNode(null);
        }
      });

      // Fit the graph after layout
      cyRef.current.ready(() => {
        cyRef.current.fit();
        cyRef.current.center();
      });

    } catch (error) {
      console.error('Error initializing Cytoscape:', error);
    }

    // Cleanup function
    return () => {
      if (cyRef.current) {
        cyRef.current.destroy();
        cyRef.current = null;
      }
    };
  }, [elements, extensionsLoaded, networkData, layout, onNodeClick, onEdgeClick]);

  // Cleanup fullscreen instance when modal closes
  useEffect(() => {
    return () => {
      // Cleanup when modal closes
      if (!showFullscreenModal && fullscreenCyRef.current) {
        fullscreenCyRef.current.destroy();
        fullscreenCyRef.current = null;
      }
    };
  }, [showFullscreenModal]);


  return (
    <div className={className} style={containerStyle}>
      {/* Cytoscape Graph Container */}
      <div 
        ref={containerRef}
        style={{ 
          width: '100%', 
          height: '100%',
          minHeight: '400px',
          backgroundColor: '#f7f8fa'
        }}
      />

      {/* Layout Controls */}
      {showControls && (
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
          <H3 style={{ fontSize: '12px', margin: '0 0 8px 0', color: '#2C3E50' }}>
            Layout {isLayoutRunning && '⟲'}
          </H3>
          
          {/* Layout selector */}
          <select 
            value={currentLayout} 
            onChange={(e) => handleLayoutChange(e.target.value)}
            style={{
              padding: '6px 10px',
              borderRadius: '6px',
              border: '1px solid #E5E7EB',
              backgroundColor: '#FFFFFF',
              fontSize: '12px',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
              color: '#374151',
              cursor: 'pointer',
              transition: 'border-color 0.2s',
              outline: 'none'
            }}
          >
            <option value="forceDirected">Force-Directed</option>
            <option value="hierarchical">Hierarchical</option>
            <option value="grid">Grid</option>
          </select>

          {/* Control buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'flex', gap: '4px' }}>
              <button
                onClick={handleZoomToFit}
                style={{
                  padding: '6px 10px',
                  fontSize: '11px',
                  border: '1px solid #E5E7EB',
                  borderRadius: '6px',
                  backgroundColor: '#FFFFFF',
                  color: '#374151',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  flex: 1
                }}
                onMouseOver={(e) => e.target.style.backgroundColor = '#F3F4F6'}
                onMouseOut={(e) => e.target.style.backgroundColor = '#FFFFFF'}
              >
                Fit
              </button>
              <button
                onClick={handleResetView}
                style={{
                  padding: '6px 10px',
                  fontSize: '11px',
                  border: '1px solid #E5E7EB',
                  borderRadius: '6px',
                  backgroundColor: '#FFFFFF',
                  color: '#374151',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  flex: 1
                }}
                onMouseOver={(e) => e.target.style.backgroundColor = '#F3F4F6'}
                onMouseOut={(e) => e.target.style.backgroundColor = '#FFFFFF'}
              >
                Reset
              </button>
            </div>
            <button
              onClick={() => setShowFullscreenModal(true)}
              style={{
                padding: '8px 12px',
                fontSize: '11px',
                border: '1px solid #3B82F6',
                borderRadius: '6px',
                backgroundColor: '#3B82F6',
                color: '#FFFFFF',
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                fontWeight: '500'
              }}
              onMouseOver={(e) => e.target.style.backgroundColor = '#2563EB'}
              onMouseOut={(e) => e.target.style.backgroundColor = '#3B82F6'}
            >
              Fullscreen
            </button>
          </div>
        </div>
      )}


      {/* Enhanced Legend */}
      {showLegend && (
        <div style={{
          position: 'absolute',
          bottom: '10px',
          left: '10px',
          backgroundColor: 'rgba(255, 255, 255, 0.98)',
          padding: '16px',
          borderRadius: '12px',
          border: '1px solid #E8EDEB',
          fontSize: '11px',
          color: '#2C3E50',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          zIndex: 10,
          maxWidth: '260px',
          backdropFilter: 'blur(10px)'
        }}>
          <H3 style={{ fontSize: '13px', marginBottom: '12px', color: '#1F2937', fontWeight: '600' }}>Network Legend</H3>
          
          {/* Risk Levels Section */}
          <div style={{ marginBottom: '12px' }}>
            <div style={{ fontSize: '10px', color: '#6B7280', marginBottom: '6px', fontWeight: '500' }}>RISK LEVELS</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ 
                  width: '12px', 
                  height: '12px', 
                  borderRadius: '50%', 
                  backgroundColor: '#C62D42',
                  boxShadow: '0 0 3px #C62D42'
                }}></div>
                <span style={{ fontSize: '11px' }}>High Risk (60+)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ 
                  width: '11px', 
                  height: '11px', 
                  borderRadius: '50%', 
                  backgroundColor: '#F39C12'
                }}></div>
                <span style={{ fontSize: '11px' }}>Medium Risk (40-59)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ 
                  width: '10px', 
                  height: '10px', 
                  borderRadius: '50%', 
                  backgroundColor: '#2ECC71'
                }}></div>
                <span style={{ fontSize: '11px' }}>Low Risk (0-39)</span>
              </div>
            </div>
          </div>
          
          {/* Node Types Section */}
          <div style={{ marginBottom: '12px' }}>
            <div style={{ fontSize: '10px', color: '#6B7280', marginBottom: '6px', fontWeight: '500' }}>NODE TYPES</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ 
                  width: '14px', 
                  height: '10px', 
                  borderRadius: '50%', 
                  backgroundColor: '#94A3B8',
                  border: '2px solid #FFD700'
                }}></div>
                <span style={{ fontSize: '11px' }}>Central Entity (You)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ 
                  width: '14px', 
                  height: '14px', 
                  borderRadius: '50%', 
                  backgroundColor: '#94A3B8'
                }}></div>
                <span style={{ fontSize: '11px' }}>Individual</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ 
                  width: '14px', 
                  height: '14px', 
                  backgroundColor: '#94A3B8'
                }}></div>
                <span style={{ fontSize: '11px' }}>Organization</span>
              </div>
            </div>
          </div>
          
          {/* Edge Types */}
          <div>
            <div style={{ fontSize: '10px', color: '#6B7280', marginBottom: '6px', fontWeight: '500' }}>RELATIONSHIPS</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '20px', height: '2px', backgroundColor: '#3498DB' }}></div>
                <span>Corporate</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '20px', height: '2px', backgroundColor: '#A93226' }}></div>
                <span>High Risk</span>
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
            Network Graph - Fullscreen View
          </H3>
          <Body style={{ color: '#6B7280', fontSize: '12px' }}>
            {networkData?.nodes?.length || 0} nodes • {networkData?.edges?.length || 0} edges
          </Body>
        </div>
        
        <div style={{
          width: '100%',
          height: '80vh',
          border: '1px solid #E5E7EB',
          borderRadius: '12px',
          backgroundColor: '#F9FAFB',
          background: 'linear-gradient(to bottom, #FFFFFF, #F9FAFB)',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)'
        }}>
          {/* Fullscreen Cytoscape Container */}
          <div 
            ref={(el) => {
              fullscreenContainerRef.current = el;
              if (el && showFullscreenModal && elements.length > 0 && extensionsLoaded) {
                // Small delay to ensure container is stable
                setTimeout(() => {
                  // Destroy existing instance if present
                  if (fullscreenCyRef.current) {
                    fullscreenCyRef.current.destroy();
                    fullscreenCyRef.current = null;
                  }
                  
                  try {
                    console.log('🔄 Initializing fullscreen Cytoscape via callback ref');
                    
                    // Create fullscreen cytoscape instance
                    fullscreenCyRef.current = cytoscape({
                      container: el,
                      elements: elements,
                      style: cytoscapeStyles,
                      layout: { 
                        name: 'cose',
                        animate: false,
                        fit: false,
                        nodeDimensionsIncludeLabels: true,
                        nodeRepulsion: 10000,
                        idealEdgeLength: 120,
                        gravity: 0.1
                      },
                      wheelSensitivity: 0.2,
                      minZoom: 0.1,
                      maxZoom: 5,
                      boxSelectionEnabled: true,
                      autoungrabify: false,
                      autounselectify: false,
                      autolock: false,
                      autoResizeContainer: false,
                      pixelRatio: 1
                    });
                    
                    // Add event handlers
                    fullscreenCyRef.current.on('tap', 'node', (event) => {
                      const node = event.target;
                      if (onNodeClick) {
                        onNodeClick({
                          id: node.id(),
                          ...node.data()
                        });
                      }
                    });
                    
                    fullscreenCyRef.current.on('tap', 'edge', (event) => {
                      const edge = event.target;
                      if (onEdgeClick) {
                        onEdgeClick({
                          id: edge.id(),
                          ...edge.data()
                        });
                      }
                    });
                    
                    // Apply layout after initialization
                    setTimeout(() => {
                      if (fullscreenCyRef.current) {
                        const layout = fullscreenCyRef.current.layout({
                          name: fullscreenLayout,
                          animate: true,
                          animationDuration: 800,
                          fit: true,
                          padding: 50
                        });
                        layout.on('layoutstop', () => {
                          console.log('✅ Fullscreen layout complete');
                          if (fullscreenCyRef.current) {
                            fullscreenCyRef.current.fit(fullscreenCyRef.current.elements(), 50);
                          }
                        });
                        layout.run();
                      }
                    }, 100);
                    
                    console.log('✅ Fullscreen Cytoscape initialized successfully');
                  } catch (error) {
                    console.error('❌ Error initializing fullscreen Cytoscape:', error);
                  }
                }, 100);
              }
            }}
            style={{ 
              width: '100%', 
              height: '100%',
              backgroundColor: '#f7f8fa'
            }}
          />
          
          {/* Enhanced Legend for Fullscreen */}
          <div style={{
            position: 'absolute',
            bottom: '16px',
            left: '16px',
            backgroundColor: 'rgba(255, 255, 255, 0.98)',
            padding: '20px',
            borderRadius: '12px',
            border: '1px solid #E5E7EB',
            fontSize: '12px',
            color: '#1F2937',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            zIndex: 10,
            maxWidth: '300px',
            backdropFilter: 'blur(10px)'
          }}>
            <H3 style={{ fontSize: '14px', marginBottom: '12px', color: '#1F2937', fontWeight: '600' }}>
              Network Legend
            </H3>
            
            {/* Risk Levels */}
            <div style={{ marginBottom: '12px' }}>
              <div style={{ fontSize: '11px', color: '#6B7280', marginBottom: '8px', fontWeight: '500' }}>
                RISK LEVELS
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ 
                    width: '16px', 
                    height: '16px', 
                    borderRadius: '50%', 
                    backgroundColor: '#991B1B',
                    boxShadow: '0 0 6px #991B1B'
                  }}></div>
                  <span style={{ fontSize: '11px' }}>Critical (80+)</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ 
                    width: '14px', 
                    height: '14px', 
                    borderRadius: '50%', 
                    backgroundColor: '#DC2626',
                    boxShadow: '0 0 4px #DC2626'
                  }}></div>
                  <span style={{ fontSize: '11px' }}>High (60-79)</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ 
                    width: '12px', 
                    height: '12px', 
                    borderRadius: '50%', 
                    backgroundColor: '#F59E0B'
                  }}></div>
                  <span style={{ fontSize: '11px' }}>Medium (40-59)</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ 
                    width: '11px', 
                    height: '11px', 
                    borderRadius: '50%', 
                    backgroundColor: '#10B981'
                  }}></div>
                  <span style={{ fontSize: '11px' }}>Low (0-39)</span>
                </div>
              </div>
            </div>
            
            {/* Network Roles */}
            <div style={{ marginBottom: '12px' }}>
              <div style={{ fontSize: '11px', color: '#6B7280', marginBottom: '8px', fontWeight: '500' }}>
                SPECIAL ROLES
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ 
                    width: '16px', 
                    height: '16px', 
                    borderRadius: '50%', 
                    backgroundColor: '#94A3B8',
                    border: '3px solid #F59E0B'
                  }}></div>
                  <span style={{ fontSize: '11px' }}>Center Entity</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ 
                    width: '16px', 
                    height: '16px', 
                    borderRadius: '50%', 
                    backgroundColor: '#94A3B8',
                    border: '3px solid #3B82F6'
                  }}></div>
                  <span style={{ fontSize: '11px' }}>Hub (Many connections)</span>
                </div>
              </div>
            </div>
            
            {/* Quick Tips */}
            <div style={{ fontSize: '10px', color: '#6B7280', lineHeight: '1.4' }}>
              <div><strong>Tips:</strong></div>
              <div>• Mouse wheel to zoom</div>
              <div>• Drag to pan view</div>
              <div>• Click nodes to navigate</div>
              <div>• Edge thickness = confidence</div>
            </div>
          </div>
          
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
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                color: '#374151',
                cursor: 'pointer'
              }}
            >
              <option value="forceDirected">Force-Directed</option>
              <option value="hierarchical">Hierarchical</option>
              <option value="grid">Grid</option>
            </select>
            
            <div style={{ display: 'flex', gap: '4px' }}>
              <button
                onClick={() => handleZoomToFit(true)}
                style={{
                  padding: '6px 10px',
                  fontSize: '11px',
                  border: '1px solid #E5E7EB',
                  borderRadius: '6px',
                  backgroundColor: '#FFFFFF',
                  color: '#374151',
                  cursor: 'pointer',
                  flex: 1
                }}
              >
                Fit
              </button>
              <button
                onClick={() => handleResetView(true)}
                style={{
                  padding: '6px 10px',
                  fontSize: '11px',
                  border: '1px solid #E5E7EB',
                  borderRadius: '6px',
                  backgroundColor: '#FFFFFF',
                  color: '#374151',
                  cursor: 'pointer',
                  flex: 1
                }}
              >
                Reset
              </button>
            </div>
          </div>
        </div>
        
        <div style={{ 
          marginTop: '16px', 
          padding: '12px', 
          backgroundColor: '#F3F4F6', 
          borderRadius: '8px',
          border: '1px solid #E5E7EB'
        }}>
          <Body style={{ fontSize: '12px', color: '#4B5563' }}>
            <Icon glyph="InfoWithCircle" style={{ marginRight: '6px' }} />
            <strong>Fullscreen View:</strong> Enhanced visibility for detailed network analysis. 
            All controls and interactions are available in this view.
          </Body>
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

export default CytoscapeNetworkComponent;