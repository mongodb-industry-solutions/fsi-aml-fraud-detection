'use client';

import React, { useState, useEffect } from 'react';
import { H2, H3, Body, Overline } from '@leafygreen-ui/typography';
import { palette } from '@leafygreen-ui/palette';
import { spacing } from '@leafygreen-ui/tokens';
import Card from '@leafygreen-ui/card';
import Badge from '@leafygreen-ui/badge';
import Button from '@leafygreen-ui/button';
import Icon from '@leafygreen-ui/icon';

import { generateMockMemoryData } from '../../utils/mockDataGenerator';
import VectorMemoryPanel from './VectorMemoryPanel';
import GraphMemoryPanel from './GraphMemoryPanel';
import TemporalMemoryPanel from './TemporalMemoryPanel';

// MAS Research-driven Memory Panels
import MASMemoryArchitecturePanel from './MASMemoryArchitecturePanel';
import SharedBlackboardPanel from './SharedBlackboardPanel';

const MemoryVisualization = ({ selectedScenario, isSimulationRunning }) => {
  const [memoryData, setMemoryData] = useState(generateMockMemoryData());
  const [activePanel, setActivePanel] = useState('architecture'); // Start with architecture overview
  const [exploreMode, setExploreMode] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [memoryAccesses, setMemoryAccesses] = useState([]);

  // Update memory data periodically during simulation
  useEffect(() => {
    if (!isSimulationRunning) return;

    const interval = setInterval(() => {
      setMemoryData(generateMockMemoryData());
    }, 4000); // Update every 4 seconds

    return () => clearInterval(interval);
  }, [isSimulationRunning]);

  // Memory architecture overview stats
  const overviewStats = {
    totalVectors: memoryData.vectorMemory.totalVectors.toLocaleString(),
    activeClusters: memoryData.vectorMemory.activeClusters.length,
    searchLatency: `${memoryData.vectorMemory.searchLatency}ms`,
    networkNodes: memoryData.graphMemory.nodeCount.toLocaleString(),
    networkEdges: memoryData.graphMemory.edgeCount.toLocaleString(),
    clustering: `${Math.round(memoryData.graphMemory.clustering * 100)}%`
  };

  return (
    <div style={{
      maxWidth: '1400px',
      margin: '0 auto',
      padding: spacing[3]
    }}>
      {/* Memory Architecture Header */}
      <div style={{
        marginBottom: spacing[4],
        padding: spacing[4],
        background: `linear-gradient(135deg, ${palette.gray.light3}, ${palette.blue.light3})`,
        borderRadius: '12px',
        border: `1px solid ${palette.gray.light2}`
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: spacing[3] }}>
            <div style={{
              width: '60px',
              height: '60px',
              borderRadius: '12px',
              background: `linear-gradient(135deg, ${palette.gray.base}, ${palette.gray.dark1})`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '28px',
              color: palette.white
            }}>
              💾
            </div>
            <div>
              <H2 style={{
                fontSize: '28px',
                margin: 0,
                color: palette.gray.dark3,
                fontFamily: "'Euclid Circular A', sans-serif"
              }}>
                Agent Memory Architecture
              </H2>
              <Body style={{
                color: palette.gray.dark1,
                margin: 0,
                fontFamily: "'Euclid Circular A', sans-serif"
              }}>
                MongoDB Atlas Vector Memory + Graph Relationships + Time-Decay Analytics
              </Body>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2] }}>
            <Badge variant={isSimulationRunning ? 'green' : 'lightgray'}>
              {isSimulationRunning ? 'LIVE UPDATES' : 'STATIC VIEW'}
            </Badge>
            <Button
              variant={exploreMode ? 'primary' : 'default'}
              size="small"
              leftGlyph={<Icon glyph="Apps" />}
              onClick={() => setExploreMode(!exploreMode)}
            >
              Explore Mode
            </Button>
          </div>
        </div>
      </div>

      {/* Memory Overview Stats */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: spacing[3],
        marginBottom: spacing[4]
      }}>
        <Card style={{ padding: spacing[3], textAlign: 'center' }}>
          <div style={{ 
            fontSize: '24px', 
            fontWeight: 700, 
            color: palette.blue.dark2,
            marginBottom: spacing[1]
          }}>
            {overviewStats.totalVectors}
          </div>
          <Body style={{ 
            fontSize: '12px', 
            color: palette.gray.dark1,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            margin: 0
          }}>
            Vector Embeddings
          </Body>
        </Card>

        <Card style={{ padding: spacing[3], textAlign: 'center' }}>
          <div style={{ 
            fontSize: '24px', 
            fontWeight: 700, 
            color: palette.green.dark2,
            marginBottom: spacing[1]
          }}>
            {overviewStats.activeClusters}
          </div>
          <Body style={{ 
            fontSize: '12px', 
            color: palette.gray.dark1,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            margin: 0
          }}>
            Active Clusters
          </Body>
        </Card>

        <Card style={{ padding: spacing[3], textAlign: 'center' }}>
          <div style={{ 
            fontSize: '24px', 
            fontWeight: 700, 
            color: palette.yellow.dark2,
            marginBottom: spacing[1]
          }}>
            {overviewStats.searchLatency}
          </div>
          <Body style={{ 
            fontSize: '12px', 
            color: palette.gray.dark1,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            margin: 0
          }}>
            Search Latency
          </Body>
        </Card>

        <Card style={{ padding: spacing[3], textAlign: 'center' }}>
          <div style={{ 
            fontSize: '24px', 
            fontWeight: 700, 
            color: palette.red.dark2,
            marginBottom: spacing[1]
          }}>
            {overviewStats.networkNodes}
          </div>
          <Body style={{ 
            fontSize: '12px', 
            color: palette.gray.dark1,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            margin: 0
          }}>
            Network Nodes
          </Body>
        </Card>

        <Card style={{ padding: spacing[3], textAlign: 'center' }}>
          <div style={{ 
            fontSize: '24px', 
            fontWeight: 700, 
            color: palette.blue.base,
            marginBottom: spacing[1]
          }}>
            {overviewStats.networkEdges}
          </div>
          <Body style={{ 
            fontSize: '12px', 
            color: palette.gray.dark1,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            margin: 0
          }}>
            Relationships
          </Body>
        </Card>

        <Card style={{ padding: spacing[3], textAlign: 'center' }}>
          <div style={{ 
            fontSize: '24px', 
            fontWeight: 700, 
            color: palette.green.base,
            marginBottom: spacing[1]
          }}>
            {overviewStats.clustering}
          </div>
          <Body style={{ 
            fontSize: '12px', 
            color: palette.gray.dark1,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            margin: 0
          }}>
            Clustering Coeff.
          </Body>
        </Card>
      </div>

      {/* MAS Research-Driven Memory Navigation */}
      <div style={{
        display: 'flex',
        gap: spacing[2],
        marginBottom: spacing[4],
        padding: spacing[2],
        background: palette.white,
        borderRadius: '8px',
        border: `1px solid ${palette.gray.light2}`
      }}>
        <Button
          variant={activePanel === 'architecture' ? 'primary' : 'default'}
          size="small"
          leftGlyph={<Icon glyph="Building" />}
          onClick={() => setActivePanel('architecture')}
        >
          🏗️ Memory Architecture
        </Button>
        <Button
          variant={activePanel === 'shared' ? 'primary' : 'default'}
          size="small"
          leftGlyph={<Icon glyph="Megaphone" />}
          onClick={() => setActivePanel('shared')}
        >
          🔗 Shared Blackboard
        </Button>
        <Button
          variant={activePanel === 'private' ? 'primary' : 'default'}
          size="small"
          leftGlyph={<Icon glyph="Lock" />}
          onClick={() => setActivePanel('private')}
        >
          🔐 Private Scratchpads
        </Button>
        <Button
          variant={activePanel === 'episodic' ? 'primary' : 'default'}
          size="small"
          leftGlyph={<Icon glyph="Clock" />}
          onClick={() => setActivePanel('episodic')}
        >
          📚 Episodic Memory
        </Button>
        <Button
          variant={activePanel === 'semantic' ? 'primary' : 'default'}
          size="small"
          leftGlyph={<Icon glyph="University" />}
          onClick={() => setActivePanel('semantic')}
        >
          🧠 Semantic Knowledge
        </Button>
      </div>

      {/* Active Memory Panel */}
      <div style={{ minHeight: '600px' }}>
        {activePanel === 'architecture' && (
          <MASMemoryArchitecturePanel 
            memoryData={memoryData}
            isSimulationRunning={isSimulationRunning}
            selectedAgent={selectedAgent}
            onAgentSelect={setSelectedAgent}
            memoryAccesses={memoryAccesses}
          />
        )}

        {activePanel === 'shared' && (
          <SharedBlackboardPanel 
            memoryData={memoryData}
            isSimulationRunning={isSimulationRunning}
            selectedAgent={selectedAgent}
          />
        )}

        {activePanel === 'private' && (
          <div style={{
            padding: spacing[3],
            textAlign: 'center',
            background: palette.gray.light3,
            borderRadius: '8px'
          }}>
            <H3 style={{
              color: palette.gray.dark2,
              margin: `0 0 ${spacing[2]}px 0`
            }}>
              🔐 Private Scratchpads Panel
            </H3>
            <Body style={{ color: palette.gray.dark1 }}>
              Coming soon - Individual agent private memory spaces with working memory, temporary calculations, and agent-specific context.
            </Body>
          </div>
        )}

        {activePanel === 'episodic' && (
          <TemporalMemoryPanel 
            vectorMemory={memoryData.vectorMemory}
            exploreMode={exploreMode}
            isSimulationRunning={isSimulationRunning}
          />
        )}

        {activePanel === 'semantic' && (
          <GraphMemoryPanel 
            graphMemory={memoryData.graphMemory}
            exploreMode={exploreMode}
            isSimulationRunning={isSimulationRunning}
          />
        )}
        
        {/* Legacy panels for backward compatibility */}
        {activePanel === 'vector' && (
          <VectorMemoryPanel 
            vectorMemory={memoryData.vectorMemory}
            exploreMode={exploreMode}
            isSimulationRunning={isSimulationRunning}
          />
        )}
        
        {activePanel === 'graph' && (
          <GraphMemoryPanel 
            graphMemory={memoryData.graphMemory}
            exploreMode={exploreMode}
            isSimulationRunning={isSimulationRunning}
          />
        )}
        
        {activePanel === 'temporal' && (
          <TemporalMemoryPanel 
            vectorMemory={memoryData.vectorMemory}
            exploreMode={exploreMode}
            isSimulationRunning={isSimulationRunning}
          />
        )}
      </div>

      {/* MongoDB Atlas Branding */}
      <div style={{
        marginTop: spacing[4],
        padding: spacing[3],
        background: palette.green.light3,
        borderRadius: '8px',
        border: `1px solid ${palette.green.light2}`,
        textAlign: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: spacing[2] }}>
          <img 
            src="/mongo.png" 
            alt="MongoDB" 
            style={{ width: '24px', height: '24px' }}
          />
          <Body style={{
            fontSize: '14px',
            color: palette.green.dark2,
            fontWeight: 600,
            margin: 0,
            fontFamily: "'Euclid Circular A', sans-serif"
          }}>
            Powered by MongoDB Atlas Vector Search & Graph Analytics
          </Body>
        </div>
        <Body style={{
          fontSize: '12px',
          color: palette.gray.dark1,
          margin: `${spacing[1]}px 0 0 0`,
          fontFamily: "'Euclid Circular A', sans-serif"
        }}>
          HNSW algorithm • Sub-second similarity search • 15M+ vectors • 90-95% accuracy retention
        </Body>
      </div>
    </div>
  );
};

export default MemoryVisualization;