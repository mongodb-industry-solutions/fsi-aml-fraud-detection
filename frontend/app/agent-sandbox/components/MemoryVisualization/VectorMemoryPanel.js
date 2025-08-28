'use client';

import React, { useState, useEffect } from 'react';
import { H3, Body, Overline } from '@leafygreen-ui/typography';
import { palette } from '@leafygreen-ui/palette';
import { spacing } from '@leafygreen-ui/tokens';
import Card from '@leafygreen-ui/card';
import Badge from '@leafygreen-ui/badge';
import Button from '@leafygreen-ui/button';
import Icon from '@leafygreen-ui/icon';

const VectorMemoryPanel = ({ vectorMemory, exploreMode, isSimulationRunning }) => {
  const [selectedCluster, setSelectedCluster] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [similarityResults, setSimilarityResults] = useState([]);

  // Simulate vector similarity search
  const performVectorSearch = (query) => {
    if (!query) {
      setSimilarityResults([]);
      return;
    }

    // Mock similarity search results
    const mockResults = [
      { id: 'vec-1', content: `Transaction pattern similar to: ${query}`, similarity: 94, type: 'fraud_pattern' },
      { id: 'vec-2', content: `Entity behavior matching: ${query}`, similarity: 87, type: 'entity_profile' },
      { id: 'vec-3', content: `Risk indicator related to: ${query}`, similarity: 82, type: 'risk_signal' },
      { id: 'vec-4', content: `Network pattern involving: ${query}`, similarity: 76, type: 'network_analysis' },
      { id: 'vec-5', content: `Historical case similar to: ${query}`, similarity: 71, type: 'case_history' }
    ];

    setSimilarityResults(mockResults);
  };

  // Get similarity color based on percentage
  const getSimilarityColor = (similarity) => {
    if (similarity >= 90) return palette.green.base;
    if (similarity >= 75) return palette.blue.base;
    if (similarity >= 60) return palette.yellow.base;
    return palette.gray.base;
  };

  // Get badge variant for vector types
  const getTypeVariant = (type) => {
    switch (type) {
      case 'fraud_pattern': return 'red';
      case 'entity_profile': return 'blue';
      case 'risk_signal': return 'yellow';
      case 'network_analysis': return 'green';
      default: return 'lightgray';
    }
  };

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: exploreMode ? '1fr 1fr' : '1fr',
      gap: spacing[4],
      height: '100%'
    }}>
      {/* Main Vector Clusters Visualization */}
      <div>
        <H3 style={{
          fontSize: '18px',
          color: palette.gray.dark3,
          marginBottom: spacing[3],
          fontFamily: "'Euclid Circular A', sans-serif"
        }}>
          Vector Memory Clusters
        </H3>

        {/* Cluster Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: spacing[3]
        }}>
          {vectorMemory.activeClusters.map(cluster => (
            <Card
              key={cluster.id}
              style={{
                padding: spacing[3],
                cursor: exploreMode ? 'pointer' : 'default',
                border: selectedCluster?.id === cluster.id 
                  ? `2px solid ${palette.blue.base}` 
                  : `1px solid ${palette.gray.light2}`,
                background: selectedCluster?.id === cluster.id 
                  ? palette.blue.light3 
                  : palette.white,
                transition: 'all 0.2s ease',
                position: 'relative'
              }}
              onClick={() => exploreMode && setSelectedCluster(cluster)}
            >
              {/* Cluster Header */}
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                marginBottom: spacing[2] 
              }}>
                <H3 style={{
                  fontSize: '14px',
                  color: palette.gray.dark3,
                  margin: 0,
                  fontFamily: "'Euclid Circular A', sans-serif"
                }}>
                  {cluster.name}
                </H3>
                <Badge variant={
                  cluster.similarity >= 90 ? 'green' :
                  cluster.similarity >= 75 ? 'blue' : 'yellow'
                }>
                  {cluster.similarity}%
                </Badge>
              </div>

              {/* Cluster Metrics */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: spacing[2],
                marginBottom: spacing[2]
              }}>
                <div>
                  <div style={{
                    fontSize: '18px',
                    fontWeight: 600,
                    color: palette.blue.dark2,
                    lineHeight: 1
                  }}>
                    {cluster.memberCount.toLocaleString()}
                  </div>
                  <Overline style={{
                    fontSize: '9px',
                    color: palette.gray.dark1,
                    margin: 0
                  }}>
                    Members
                  </Overline>
                </div>

                <div>
                  <div style={{
                    fontSize: '18px',
                    fontWeight: 600,
                    color: palette.green.dark2,
                    lineHeight: 1
                  }}>
                    {cluster.timeDecay}%
                  </div>
                  <Overline style={{
                    fontSize: '9px',
                    color: palette.gray.dark1,
                    margin: 0
                  }}>
                    Decay
                  </Overline>
                </div>
              </div>

              {/* Similarity Visualization */}
              <div style={{
                marginBottom: spacing[2]
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: spacing[1]
                }}>
                  <Overline style={{
                    fontSize: '10px',
                    color: palette.gray.dark1,
                    margin: 0
                  }}>
                    Similarity Score
                  </Overline>
                  <Body style={{
                    fontSize: '11px',
                    color: palette.gray.dark2,
                    margin: 0
                  }}>
                    {cluster.similarity}%
                  </Body>
                </div>
                <div style={{
                  height: '4px',
                  borderRadius: '2px',
                  background: palette.gray.light2,
                  overflow: 'hidden'
                }}>
                  <div style={{
                    height: '100%',
                    width: `${cluster.similarity}%`,
                    background: getSimilarityColor(cluster.similarity),
                    transition: 'width 0.5s ease'
                  }} />
                </div>
              </div>

              {/* Last Access */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: spacing[1]
              }}>
                <Icon glyph="Clock" size={12} fill={palette.gray.dark1} />
                <Body style={{
                  fontSize: '10px',
                  color: palette.gray.dark1,
                  margin: 0
                }}>
                  {Math.floor((new Date() - cluster.lastAccess) / 60000)} min ago
                </Body>
              </div>

              {/* Processing animation for active clusters */}
              {isSimulationRunning && cluster.similarity > 85 && (
                <div style={{
                  position: 'absolute',
                  top: spacing[1],
                  right: spacing[1],
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: palette.green.base,
                  animation: 'pulse 2s infinite'
                }} />
              )}
            </Card>
          ))}
        </div>

        {/* Vector Search Stats */}
        <Card style={{
          marginTop: spacing[4],
          padding: spacing[3]
        }}>
          <H3 style={{
            fontSize: '14px',
            color: palette.gray.dark3,
            marginBottom: spacing[2],
            fontFamily: "'Euclid Circular A', sans-serif"
          }}>
            MongoDB Atlas Vector Search Performance
          </H3>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
            gap: spacing[3]
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{
                fontSize: '20px',
                fontWeight: 600,
                color: palette.blue.base,
                lineHeight: 1
              }}>
                {vectorMemory.totalVectors.toLocaleString()}
              </div>
              <Overline style={{
                fontSize: '9px',
                color: palette.gray.dark1,
                margin: 0
              }}>
                Total Vectors
              </Overline>
            </div>

            <div style={{ textAlign: 'center' }}>
              <div style={{
                fontSize: '20px',
                fontWeight: 600,
                color: palette.green.base,
                lineHeight: 1
              }}>
                {vectorMemory.searchLatency}ms
              </div>
              <Overline style={{
                fontSize: '9px',
                color: palette.gray.dark1,
                margin: 0
              }}>
                Avg Latency
              </Overline>
            </div>

            <div style={{ textAlign: 'center' }}>
              <div style={{
                fontSize: '20px',
                fontWeight: 600,
                color: palette.yellow.base,
                lineHeight: 1
              }}>
                {Math.round(vectorMemory.similarityThreshold * 100)}%
              </div>
              <Overline style={{
                fontSize: '9px',
                color: palette.gray.dark1,
                margin: 0
              }}>
                Threshold
              </Overline>
            </div>

            <div style={{ textAlign: 'center' }}>
              <div style={{
                fontSize: '20px',
                fontWeight: 600,
                color: palette.red.base,
                lineHeight: 1
              }}>
                1536
              </div>
              <Overline style={{
                fontSize: '9px',
                color: palette.gray.dark1,
                margin: 0
              }}>
                Dimensions
              </Overline>
            </div>
          </div>
        </Card>
      </div>

      {/* Explore Panel (only visible in explore mode) */}
      {exploreMode && (
        <div>
          <H3 style={{
            fontSize: '18px',
            color: palette.gray.dark3,
            marginBottom: spacing[3],
            fontFamily: "'Euclid Circular A', sans-serif"
          }}>
            Vector Similarity Search
          </H3>

          {/* Search Interface */}
          <Card style={{ padding: spacing[3], marginBottom: spacing[3] }}>
            <div style={{ marginBottom: spacing[3] }}>
              <input
                type="text"
                placeholder="Search vectors: 'credit card fraud', 'money laundering', etc..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: spacing[2],
                  border: `1px solid ${palette.gray.light2}`,
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontFamily: "'Euclid Circular A', sans-serif"
                }}
              />
            </div>
            <Button
              variant="primary"
              size="small"
              leftGlyph={<Icon glyph="MagnifyingGlass" />}
              onClick={() => performVectorSearch(searchQuery)}
              disabled={!searchQuery}
            >
              Vector Search
            </Button>
          </Card>

          {/* Search Results */}
          {similarityResults.length > 0 && (
            <Card style={{ padding: spacing[3] }}>
              <H3 style={{
                fontSize: '14px',
                color: palette.gray.dark3,
                marginBottom: spacing[2],
                fontFamily: "'Euclid Circular A', sans-serif"
              }}>
                Similarity Search Results
              </H3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[2] }}>
                {similarityResults.map((result, index) => (
                  <div
                    key={result.id}
                    style={{
                      padding: spacing[2],
                      background: palette.gray.light3,
                      borderRadius: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: spacing[1], marginBottom: spacing[1] }}>
                        <Badge variant={getTypeVariant(result.type)} size="small">
                          {result.type.replace('_', ' ')}
                        </Badge>
                        <div style={{
                          fontSize: '14px',
                          fontWeight: 600,
                          color: getSimilarityColor(result.similarity)
                        }}>
                          {result.similarity}%
                        </div>
                      </div>
                      <Body style={{
                        fontSize: '12px',
                        color: palette.gray.dark1,
                        margin: 0,
                        lineHeight: 1.3
                      }}>
                        {result.content}
                      </Body>
                    </div>
                    <div style={{
                      width: '32px',
                      height: '4px',
                      borderRadius: '2px',
                      background: palette.gray.light2,
                      overflow: 'hidden',
                      marginLeft: spacing[2]
                    }}>
                      <div style={{
                        height: '100%',
                        width: `${result.similarity}%`,
                        background: getSimilarityColor(result.similarity)
                      }} />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Selected Cluster Details */}
          {selectedCluster && (
            <Card style={{ padding: spacing[3], marginTop: spacing[3] }}>
              <H3 style={{
                fontSize: '14px',
                color: palette.gray.dark3,
                marginBottom: spacing[2],
                fontFamily: "'Euclid Circular A', sans-serif"
              }}>
                Cluster: {selectedCluster.name}
              </H3>
              
              <Body style={{
                fontSize: '12px',
                color: palette.gray.dark1,
                marginBottom: spacing[2],
                lineHeight: 1.4
              }}>
                This cluster contains {selectedCluster.memberCount.toLocaleString()} fraud-related vectors 
                with an average similarity of {selectedCluster.similarity}%. Time decay is at {selectedCluster.timeDecay}%, 
                indicating recent activity and high relevance for current fraud detection analysis.
              </Body>

              <div style={{
                padding: spacing[2],
                background: palette.blue.light3,
                borderRadius: '6px',
                border: `1px solid ${palette.blue.light2}`
              }}>
                <Overline style={{
                  fontSize: '10px',
                  color: palette.blue.dark2,
                  margin: `0 0 ${spacing[1]}px 0`,
                  textTransform: 'uppercase'
                }}>
                  MongoDB Vector Details
                </Overline>
                <Body style={{
                  fontSize: '11px',
                  color: palette.gray.dark1,
                  margin: 0
                }}>
                  • HNSW Index Structure • Cosine Similarity • 1536 Dimensions<br/>
                  • Last accessed {Math.floor((new Date() - selectedCluster.lastAccess) / 60000)} minutes ago
                </Body>
              </div>
            </Card>
          )}
        </div>
      )}

      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default VectorMemoryPanel;