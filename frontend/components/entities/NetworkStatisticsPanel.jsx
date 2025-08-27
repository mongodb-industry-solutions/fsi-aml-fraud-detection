"use client";

import React, { useState } from 'react';
import Card from '@leafygreen-ui/card';
import Button from '@leafygreen-ui/button';
import { H3, Body } from '@leafygreen-ui/typography';
import Icon from '@leafygreen-ui/icon';
import { Table, TableBody, TableHead, HeaderRow, HeaderCell, Row, Cell } from '@leafygreen-ui/table';
import Banner from '@leafygreen-ui/banner';
import { palette } from '@leafygreen-ui/palette';
import { spacing } from '@leafygreen-ui/tokens';
import StatisticsCard from './StatisticsCard';

/**
 * Comprehensive network statistics panel powered by MongoDB aggregation
 * 
 * Displays network metrics, distributions, key entities, and relationship analysis
 * with optional technical details showing the MongoDB aggregation pipeline.
 */
function NetworkStatisticsPanel({ 
  statistics, 
  loading = false, 
  error = null,
  centerEntityId = null 
}) {
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);

  // Handle loading state
  if (loading) {
    return (
      <Card style={{ padding: spacing[4] }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          minHeight: '200px'
        }}>
          <Body style={{ color: palette.gray.base }}>
            Calculating network statistics using MongoDB aggregation...
          </Body>
        </div>
      </Card>
    );
  }

  // Handle error state
  if (error) {
    return (
      <Card style={{ padding: spacing[4] }}>
        <div style={{ 
          padding: spacing[3], 
          backgroundColor: palette.yellow.light3,
          border: `1px solid ${palette.yellow.light1}`,
          borderRadius: '4px'
        }}>
          <Body style={{ color: palette.yellow.dark2 }}>
            Unable to load network statistics: {error}
          </Body>
        </div>
      </Card>
    );
  }

  // Handle missing statistics
  if (!statistics) {
    return (
      <Card style={{ padding: spacing[4] }}>
        <div style={{ 
          padding: spacing[3], 
          backgroundColor: palette.blue.light3,
          border: `1px solid ${palette.blue.light1}`,
          borderRadius: '4px'
        }}>
          <Body style={{ color: palette.blue.dark2 }}>
            No network statistics available. Network may be empty or statistics calculation failed.
          </Body>
        </div>
      </Card>
    );
  }

  const basicMetrics = statistics.basic_metrics || {};
  const riskDistribution = statistics.risk_distribution || {};
  const entityTypeDistribution = statistics.entity_type_distribution || {};
  const hubEntities = statistics.hub_entities || [];
  const prominentEntities = statistics.prominent_entities || [];
  const relationshipDistribution = statistics.relationship_distribution || [];

  // Calculate network density percentage
  const networkDensity = statistics.network_density ? 
    (statistics.network_density * 100) : 0;

  // Get risk level color
  const getRiskColor = (level) => {
    switch (level?.toLowerCase()) {
      case 'high': return palette.red.base;
      case 'critical': return palette.red.dark2;
      case 'medium': return palette.yellow.base;
      case 'low': return palette.green.base;
      default: return palette.gray.base;
    }
  };

  // Format entity name for display
  const formatEntityName = (entity) => {
    if (!entity) return 'Unknown Entity';
    if (entity.name && typeof entity.name === 'string') return entity.name;
    if (entity.name && entity.name.full) return entity.name.full;
    return entity.entityId || 'Unknown Entity';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[4] }}>
      
      {/* Network Overview Cards */}
      <Card style={{ padding: spacing[4] }}>
        <H3 style={{ 
          marginBottom: spacing[3],
          display: 'flex',
          alignItems: 'center',
          gap: spacing[2]
        }}>
          <Icon glyph="Charts" style={{ color: palette.blue.base }} />
          Network Overview
        </H3>
        
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
          gap: spacing[3]
        }}>
          <StatisticsCard
            title="Total Nodes"
            value={basicMetrics.total_nodes}
            icon="Person"
            color={palette.blue.base}
          />
          <StatisticsCard
            title="Total Edges"
            value={basicMetrics.total_edges}
            icon="Connect"
            color={palette.green.base}
          />
          <StatisticsCard
            title="Average Risk"
            value={basicMetrics.avg_risk_score}
            subtitle="Risk Score (%)"
            icon="Warning"
            color={basicMetrics.avg_risk_score > 70 ? palette.red.base : 
                   basicMetrics.avg_risk_score > 40 ? palette.yellow.base : palette.green.base}
          />
          <StatisticsCard
            title="Network Density"
            value={networkDensity}
            subtitle="Connectivity (%)"
            icon="Diagram"
            color={palette.purple.base}
          />
        </div>
      </Card>

      {/* Network Composition */}
      <Card style={{ padding: spacing[4] }}>
        <H3 style={{ 
          marginBottom: spacing[3],
          display: 'flex',
          alignItems: 'center',
          gap: spacing[2]
        }}>
          <Icon glyph="Diagram2" style={{ color: palette.purple.base }} />
          Network Composition
        </H3>
        
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
          gap: spacing[4]
        }}>
          
          {/* Risk Distribution */}
          <div>
            <H3 style={{ marginBottom: spacing[2] }}>Risk Distribution</H3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[2] }}>
              {Object.keys(riskDistribution).length > 0 ? (
                Object.entries(riskDistribution).map(([level, count]) => (
                  <div key={level} style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    padding: spacing[2],
                    border: `1px solid ${palette.gray.light1}`,
                    borderRadius: '4px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2] }}>
                      <div style={{
                        width: '12px',
                        height: '12px',
                        borderRadius: '50%',
                        backgroundColor: getRiskColor(level)
                      }} />
                      <Body style={{ textTransform: 'capitalize' }}>{level}</Body>
                    </div>
                    <Body weight="medium">{count}</Body>
                  </div>
                ))
              ) : (
                <Body style={{ color: palette.gray.base }}>No risk data available</Body>
              )}
            </div>
          </div>

          {/* Entity Type Distribution */}
          <div>
            <H3 style={{ marginBottom: spacing[2] }}>Entity Types</H3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[2] }}>
              {Object.keys(entityTypeDistribution).length > 0 ? (
                Object.entries(entityTypeDistribution).map(([type, count]) => (
                  <div key={type} style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    padding: spacing[2],
                    border: `1px solid ${palette.gray.light1}`,
                    borderRadius: '4px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2] }}>
                      <Icon 
                        glyph={type === 'individual' ? 'Person' : 'Building'} 
                        style={{ color: type === 'individual' ? palette.blue.base : palette.purple.base }}
                      />
                      <Body style={{ textTransform: 'capitalize' }}>{type}</Body>
                    </div>
                    <Body weight="medium">{count}</Body>
                  </div>
                ))
              ) : (
                <Body style={{ color: palette.gray.base }}>No entity type data available</Body>
              )}
            </div>
          </div>
        </div>
      </Card>


      {/* Relationship Analysis */}
      {relationshipDistribution.length > 0 && (
        <Card style={{ padding: spacing[4] }}>
          <H3 style={{ 
            marginBottom: spacing[3],
            display: 'flex',
            alignItems: 'center',
            gap: spacing[2]
          }}>
            <Icon glyph="Connect" style={{ color: palette.green.base }} />
            Relationship Analysis
          </H3>
          
          <Table>
            <TableHead>
              <HeaderRow>
                <HeaderCell>Relationship Type</HeaderCell>
                <HeaderCell>Count</HeaderCell>
                <HeaderCell>Avg Confidence</HeaderCell>
                <HeaderCell>Verified</HeaderCell>
                <HeaderCell>Bidirectional</HeaderCell>
              </HeaderRow>
            </TableHead>
            <TableBody>
              {relationshipDistribution.map((rel, index) => (
                <Row key={rel.type || index}>
                  <Cell>
                    <Body style={{ fontFamily: 'monospace' }}>
                      {rel.type?.replace(/_/g, ' ') || 'Unknown'}
                    </Body>
                  </Cell>
                  <Cell>
                    <Body weight="medium">{rel.count}</Body>
                  </Cell>
                  <Cell>
                    <Body>{(rel.avg_confidence * 100).toFixed(1)}%</Body>
                  </Cell>
                  <Cell>
                    <Body>{rel.verified_count} / {rel.count}</Body>
                  </Cell>
                  <Cell>
                    <Body>{rel.bidirectional_count || 0}</Body>
                  </Cell>
                </Row>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Technical Details Panel */}
      <Card style={{ padding: spacing[4] }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: showTechnicalDetails ? spacing[3] : 0
        }}>
          <H3 style={{ 
            display: 'flex',
            alignItems: 'center',
            gap: spacing[2]
          }}>
            <Icon glyph="Code" style={{ color: palette.gray.dark1 }} />
            Technical Details
          </H3>
          <Button
            variant="default"
            size="small"
            leftGlyph={<Icon glyph={showTechnicalDetails ? "ChevronUp" : "ChevronDown"} />}
            onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
          >
            {showTechnicalDetails ? 'Hide' : 'Show'} MongoDB Pipeline
          </Button>
        </div>

        {showTechnicalDetails && (
          <div>
            <Body style={{ marginBottom: spacing[3], color: palette.gray.dark1 }}>
              These statistics are calculated server-side using MongoDB aggregation pipelines for optimal performance.
              All calculations use native MongoDB operations including $facet, $group, and $project stages.
            </Body>
            
            <div style={{
              backgroundColor: palette.gray.light3,
              border: `1px solid ${palette.gray.light1}`,
              borderRadius: '4px',
              padding: spacing[3],
              fontFamily: 'Menlo, Monaco, "Courier New", monospace',
              fontSize: '12px',
              overflow: 'auto'
            }}>
              <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
{`MongoDB Aggregation Pipeline:

// Phase 1: Entity Statistics Pipeline
[
  { "$match": { "entityId": { "$in": [...entity_ids] } } },
  { "$addFields": {
      "connection_count": { "$size": { "$ifNull": ["$connected_entities", []] } },
      "risk_score_pct": { "$multiply": [{ "$ifNull": ["$riskAssessment.overall.score", 0] }, 100] }
    }
  },
  { "$facet": {
      "basic_stats": [
        { "$group": {
            "_id": null,
            "total_nodes": { "$sum": 1 },
            "avg_risk_score": { "$avg": "$risk_score_pct" },
            "max_risk_score": { "$max": "$risk_score_pct" },
            "min_risk_score": { "$min": "$risk_score_pct" },
            "avg_connections": { "$avg": "$connection_count" },
            "max_connections": { "$max": "$connection_count" }
          }
        }
      ],
      "risk_distribution": [
        { "$group": { "_id": "$riskAssessment.overall.level", "count": { "$sum": 1 } } },
        { "$sort": { "_id": 1 } }
      ],
      "entity_type_distribution": [
        { "$group": { "_id": "$entityType", "count": { "$sum": 1 } } }
      ],
      "hub_entities": [
        { "$match": { "connection_count": { "$gte": 2 } } },
        { "$sort": { "connection_count": -1 } },
        { "$limit": 5 }
      ],
      "prominent_entities": [
        { "$addFields": {
            "prominence_score": {
              "$add": [
                { "$multiply": ["$connection_count", 0.6] },
                { "$multiply": ["$risk_score_pct", 0.004] }
              ]
            }
          }
        },
        { "$sort": { "prominence_score": -1 } },
        { "$limit": 5 }
      ]
    }
  }
]

// Phase 2: Relationship Distribution Pipeline  
[
  { "$match": { "_id": { "$in": [...relationship_ids] } } },
  { "$group": {
      "_id": "$type",
      "count": { "$sum": 1 },
      "avg_confidence": { "$avg": "$confidence" },
      "verified_count": { "$sum": { "$cond": ["$verified", 1, 0] } },
      "bidirectional_count": { "$sum": { "$cond": [{ "$eq": ["$direction", "bidirectional"] }, 1, 0] } }
    }
  },
  { "$sort": { "count": -1 } }
]`}
              </pre>
            </div>
          </div>
        )}
      </Card>

    </div>
  );
}

export default NetworkStatisticsPanel;