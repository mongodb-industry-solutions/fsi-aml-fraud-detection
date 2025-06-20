/**
 * CytoscapeNetworkComponent.jsx
 * 
 * Professional AML network visualization using Cytoscape.js
 * Direct replacement for NetworkGraphComponent.jsx with enhanced capabilities
 */

"use client";

import React, { useMemo, useEffect, useRef, useState, useCallback } from 'react';
import CytoscapeComponent from 'react-cytoscapejs';
import { Body, H3 } from '@leafygreen-ui/typography';
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
  const cytoscapeRef = useRef(null);
  const [cy, setCy] = useState(null);
  const [currentLayout, setCurrentLayout] = useState(layout);
  const [isLayoutRunning, setIsLayoutRunning] = useState(false);
  const [extensionsLoaded, setExtensionsLoaded] = useState(false);

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
    border: '1px solid #E8EDEB',
    borderRadius: '8px',
    backgroundColor: '#fafafa',
    position: 'relative',
    overflow: 'hidden', // Prevent content from expanding beyond container
    contain: 'strict', // CSS containment to prevent layout interference
    isolation: 'isolate', // Create new stacking context
    ...style
  }), [style]);

  // Initialize Cytoscape with extensions
  const initializeCytoscape = useCallback(async (cytoscapeInstance) => {
    if (!cytoscapeInstance) return;

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

    setCy(cytoscapeInstance);
    cytoscapeRef.current = cytoscapeInstance;
    setExtensionsLoaded(true);

    // Setup event handlers
    setupCytoscapeEvents(cytoscapeInstance, {
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
    cytoscapeInstance.contextMenus({
      menuItems: [
        {
          id: 'focus-node',
          content: 'Focus on Node',
          tooltipText: 'Center view on this node',
          selector: 'node',
          onClickFunction: function(event) {
            const target = event.target || event.cyTarget;
            cytoscapeInstance.animate({
              center: { eles: target },
              zoom: Math.min(cytoscapeInstance.zoom() * 1.5, 3.0)
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
            // Could trigger network expansion callback
            console.log('Expand network for:', target.data('id'));
          }
        }
      ]
    });

    // Setup enhanced pan/zoom
    cytoscapeInstance.panzoom({
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

  }, [networkData, layout, onNodeClick, onEdgeClick]);

  // Handle layout changes
  const handleLayoutChange = useCallback((layoutName) => {
    if (!cy || !extensionsLoaded || !cytoscapeLayouts[layoutName]) {
      console.warn('Cannot switch layout: Cytoscape or extensions not ready');
      return;
    }
    
    setIsLayoutRunning(true);
    setCurrentLayout(layoutName);
    
    try {
      // Get layout config and disable auto-fit to prevent expansion
      const layoutConfig = {
        ...cytoscapeLayouts[layoutName],
        fit: false, // Disable auto-fit to prevent container expansion
        animate: true,
        animationDuration: 800
      };
      
      // Apply layout with disabled fit
      const layout = cy.layout(layoutConfig);
      layout.on('layoutstop', () => {
        setIsLayoutRunning(false);
        // Manual fit to container bounds after layout completes
        cy.fit(cy.elements(), 30);
      });
      layout.run();
      
    } catch (error) {
      console.error('Layout switch failed:', error);
      setIsLayoutRunning(false);
    }
  }, [cy, extensionsLoaded]);

  // Handle zoom to fit
  const handleZoomToFit = useCallback(() => {
    if (!cy) return;
    cy.fit(cy.elements(), 50);
  }, [cy]);

  // Handle reset view
  const handleResetView = useCallback(() => {
    if (!cy) return;
    cy.reset();
    cy.fit(cy.elements(), 50);
  }, [cy]);

  // Apply layout when data changes
  useEffect(() => {
    if (cy && extensionsLoaded && elements.length > 0 && currentLayout) {
      // Small delay to ensure elements are rendered
      const timeoutId = setTimeout(() => {
        if (cy && extensionsLoaded && cytoscapeLayouts[currentLayout]) {
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
            const layout = cy.layout(layoutConfig);
            layout.on('layoutstop', () => {
              setIsLayoutRunning(false);
              // Manual fit to container bounds after layout completes
              cy.fit(cy.elements(), 30);
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
  }, [cy, extensionsLoaded, elements.length, currentLayout]);

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

  return (
    <div className={className} style={containerStyle}>
      {/* Cytoscape Graph Canvas */}
      <CytoscapeComponent
        elements={elements}
        style={{ width: '100%', height: '100%' }}
        stylesheet={cytoscapeStyles}
        layout={{ name: 'preset' }} // We handle layout manually
        cy={initializeCytoscape}
        boxSelectionEnabled={true}
        userPanningEnabled={true}
        userZoomingEnabled={true}
        autoungrabify={false}
        autounselectify={false}
      />

      {/* Layout Controls */}
      {showControls && (
        <div style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          padding: '12px',
          borderRadius: '8px',
          border: '1px solid #E8EDEB',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          zIndex: 10,
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          minWidth: '160px'
        }}>
          <H3 style={{ fontSize: '12px', margin: '0 0 8px 0', color: '#2C3E50' }}>
            Layout {isLayoutRunning && '⟲'}
          </H3>
          
          {/* Layout selector */}
          <select 
            value={currentLayout} 
            onChange={(e) => handleLayoutChange(e.target.value)}
            style={{
              padding: '4px 8px',
              borderRadius: '4px',
              border: '1px solid #E8EDEB',
              fontSize: '11px'
            }}
          >
            <option value="forceDirected">Force-Directed</option>
            <option value="hierarchical">Hierarchical</option>
            <option value="circular">Circular</option>
            <option value="concentric">Concentric</option>
            <option value="grid">Grid</option>
            <option value="riskFocused">Risk-Focused</option>
            <option value="centralityFocused">Centrality-Focused</option>
          </select>

          {/* Control buttons */}
          <div style={{ display: 'flex', gap: '4px' }}>
            <button
              onClick={handleZoomToFit}
              style={{
                padding: '4px 8px',
                fontSize: '10px',
                border: '1px solid #E8EDEB',
                borderRadius: '4px',
                backgroundColor: '#FFFFFF',
                cursor: 'pointer',
                flex: 1
              }}
            >
              Fit
            </button>
            <button
              onClick={handleResetView}
              style={{
                padding: '4px 8px',
                fontSize: '10px',
                border: '1px solid #E8EDEB',
                borderRadius: '4px',
                backgroundColor: '#FFFFFF',
                cursor: 'pointer',
                flex: 1
              }}
            >
              Reset
            </button>
          </div>
        </div>
      )}


      {/* Simplified Legend */}
      {showLegend && (
        <div style={{
          position: 'absolute',
          bottom: '10px',
          left: '10px',
          backgroundColor: 'rgba(255, 255, 255, 0.97)',
          padding: '12px',
          borderRadius: '8px',
          border: '1px solid #E8EDEB',
          fontSize: '11px',
          color: '#5C6C7C',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          zIndex: 10,
          maxWidth: '220px'
        }}>
          <H3 style={{ fontSize: '12px', marginBottom: '8px', color: '#2C3E50' }}>Legend</H3>
          
          {/* Risk levels */}
          <div style={{ marginBottom: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <div style={{ 
                  width: '12px', 
                  height: '12px', 
                  borderRadius: '50%', 
                  backgroundColor: '#C62D42'
                }}></div>
                <span style={{ fontSize: '10px' }}>High Risk</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <div style={{ 
                  width: '10px', 
                  height: '10px', 
                  borderRadius: '50%', 
                  backgroundColor: '#F39C12'
                }}></div>
                <span style={{ fontSize: '10px' }}>Medium</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <div style={{ 
                  width: '10px', 
                  height: '10px', 
                  borderRadius: '50%', 
                  backgroundColor: '#2ECC71'
                }}></div>
                <span style={{ fontSize: '10px' }}>Low</span>
              </div>
            </div>
          </div>
          
          {/* Simplified visual guide */}
          <div style={{ fontSize: '10px', color: '#5C6C7C', lineHeight: '1.3' }}>
            <div>★ = High Centrality Hub</div>
            <div>◆ = Bridge Connector</div>
            <div>⟷ = Bidirectional</div>
            <div style={{ marginTop: '4px', fontSize: '9px', color: '#7F8C8D' }}>
              Size = Importance • Border = Network Role
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CytoscapeNetworkComponent;