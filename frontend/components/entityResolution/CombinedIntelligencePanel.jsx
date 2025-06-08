"use client";

import React from 'react';
import { H2, H3, Body, Subtitle } from '@leafygreen-ui/typography';
import Badge from '@leafygreen-ui/badge';
import { spacing } from '@leafygreen-ui/tokens';
import { palette } from '@leafygreen-ui/palette';

import styles from './CombinedIntelligencePanel.module.css';

const CombinedIntelligencePanel = ({ searchResults, isVisible = true }) => {
  if (!isVisible || !searchResults || !searchResults.combined_intelligence) {
    return null;
  }

  const { combined_intelligence, atlas_results, vector_results } = searchResults;
  const { correlation_analysis, intersection_matches, key_insights, recommendations } = combined_intelligence;

  // Calculate confidence level for display
  const confidencePercentage = Math.round(combined_intelligence.confidence_level * 100);
  const comprehensivenessPercentage = Math.round(combined_intelligence.search_comprehensiveness * 100);

  // Format correlation percentage
  const correlationPercentage = correlation_analysis.correlation_percentage.toFixed(1);

  // Determine confidence level classification
  const getConfidenceClass = (confidence) => {
    if (confidence >= 0.8) return 'high';
    if (confidence >= 0.6) return 'medium';
    return 'low';
  };

  const formatScore = (score, type) => {
    if (type === 'atlas') {
      return score.toFixed(1);
    } else if (type === 'vector') {
      return `${(score * 100).toFixed(1)}%`;
    }
    return score.toFixed(3);
  };

  const getRecommendationPriority = (recommendation) => {
    if (recommendation.toLowerCase().includes('first') || recommendation.toLowerCase().includes('highest')) {
      return 'high';
    } else if (recommendation.toLowerCase().includes('consider') || recommendation.toLowerCase().includes('examine')) {
      return 'medium';
    }
    return 'low';
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.headerIcon}>⚡</div>
          <div>
            <H2 className={styles.headerTitle}>Combined Intelligence</H2>
            <Body className={styles.headerSubtitle}>
              Correlation analysis and insights from Atlas Search + Vector Search
            </Body>
          </div>
        </div>

        <div className={styles.intelligenceScore}>
          <span className={styles.scoreIcon}>🎯</span>
          <span className={styles.scoreValue}>{confidencePercentage}%</span>
          <span className={styles.scoreLabel}>Confidence</span>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className={styles.content}>
        {/* Correlation Analysis */}
        <div className={styles.correlationPanel}>
          <div className={styles.panelHeader}>
            <span className={styles.panelIcon}>📊</span>
            <H3 className={styles.panelTitle}>Correlation Analysis</H3>
          </div>

          {/* Venn Diagram Visualization */}
          <div className={styles.correlationChart}>
            <div className={styles.vennDiagram}>
              <div className={styles.circle + ' ' + styles.atlasCircle}>
                {atlas_results.length}
              </div>
              <div className={styles.circle + ' ' + styles.vectorCircle}>
                {vector_results.length}
              </div>
              {correlation_analysis.intersection_count > 0 && (
                <div className={styles.intersectionLabel}>
                  {correlation_analysis.intersection_count}
                </div>
              )}
            </div>
          </div>

          {/* Correlation Metrics */}
          <div className={styles.correlationMetrics}>
            <div className={styles.metric}>
              <div className={styles.metricValue}>{correlationPercentage}%</div>
              <div className={styles.metricLabel}>Correlation</div>
            </div>
            <div className={styles.metric}>
              <div className={styles.metricValue}>{comprehensivenessPercentage}%</div>
              <div className={styles.metricLabel}>Coverage</div>
            </div>
            <div className={styles.metric}>
              <div className={styles.metricValue}>{correlation_analysis.atlas_unique_count}</div>
              <div className={styles.metricLabel}>Atlas Only</div>
            </div>
            <div className={styles.metric}>
              <div className={styles.metricValue}>{correlation_analysis.vector_unique_count}</div>
              <div className={styles.metricLabel}>Vector Only</div>
            </div>
          </div>
        </div>

        {/* Key Insights */}
        <div className={styles.insightsPanel}>
          <div className={styles.panelHeader}>
            <span className={styles.panelIcon}>💡</span>
            <H3 className={styles.panelTitle}>Key Insights</H3>
          </div>

          <ul className={styles.insightsList}>
            {key_insights.map((insight, index) => (
              <li key={index} className={styles.insight}>
                <span className={styles.insightIcon}>✨</span>
                <span className={styles.insightText}>{insight}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Intersection Matches */}
      {intersection_matches.length > 0 && (
        <div className={styles.intersectionSection}>
          <div className={styles.sectionHeader}>
            <H3 className={styles.sectionTitle}>
              <span className={styles.sectionIcon}>⚡</span>
              High-Confidence Intersection Matches
            </H3>
          </div>

          <div className={styles.intersectionGrid}>
            {intersection_matches.map((match, index) => (
              <div 
                key={match.entity_id} 
                className={`${styles.intersectionCard} ${
                  match.combined_confidence >= 0.8 ? styles.highConfidence : ''
                }`}
              >
                <div className={styles.entityHeader}>
                  <H3 className={styles.entityName}>
                    {match.name?.full || 'Unknown Entity'}
                  </H3>
                  <div className={styles.confidenceBadge}>
                    <span>⚡</span>
                    <span>{Math.round(match.combined_confidence * 100)}%</span>
                  </div>
                </div>

                <div className={styles.entityDetails}>
                  <div className={styles.detailItem}>
                    <div className={styles.detailLabel}>Entity ID</div>
                    <div className={styles.detailValue}>{match.entity_id}</div>
                  </div>
                  <div className={styles.detailItem}>
                    <div className={styles.detailLabel}>Entity Type</div>
                    <div className={styles.detailValue}>
                      {match.entity_type || 'Individual'}
                    </div>
                  </div>
                </div>

                <div className={styles.scoreComparison}>
                  <div className={styles.scoreItem}>
                    <span className={styles.scoreIcon}>🔍</span>
                    <span className={styles.scoreText}>
                      Atlas: {formatScore(match.atlas_search_score, 'atlas')}
                    </span>
                  </div>
                  <div className={styles.scoreItem}>
                    <span className={styles.scoreIcon}>🧠</span>
                    <span className={styles.scoreText}>
                      Vector: {formatScore(match.vector_search_score, 'vector')}
                    </span>
                  </div>
                </div>

                {match.semantic_relevance && (
                  <div style={{ 
                    marginTop: '12px', 
                    padding: '8px', 
                    background: '#f8f9fa', 
                    borderRadius: '4px',
                    fontSize: '12px',
                    color: '#6c757d'
                  }}>
                    <strong>Semantic Relevance:</strong> {match.semantic_relevance}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div className={styles.recommendationsSection}>
          <div className={styles.panelHeader}>
            <span className={styles.panelIcon}>🎯</span>
            <H3 className={styles.panelTitle}>Investigation Recommendations</H3>
          </div>

          <ul className={styles.recommendationsList}>
            {recommendations.map((recommendation, index) => {
              const priority = getRecommendationPriority(recommendation);
              return (
                <li key={index} className={styles.recommendation}>
                  <span className={styles.recommendationIcon}>💡</span>
                  <span className={styles.recommendationText}>{recommendation}</span>
                  <span className={`${styles.recommendationPriority} ${styles[priority]}`}>
                    {priority}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Method Correlation Reasoning */}
      {correlation_analysis.reasoning.length > 0 && (
        <div className={styles.insightsPanel} style={{ marginTop: spacing[4] }}>
          <div className={styles.panelHeader}>
            <span className={styles.panelIcon}>🧠</span>
            <H3 className={styles.panelTitle}>Search Method Analysis</H3>
          </div>

          <ul className={styles.insightsList}>
            {correlation_analysis.reasoning.map((reason, index) => (
              <li key={index} className={styles.insight}>
                <span className={styles.insightIcon}>🔍</span>
                <span className={styles.insightText}>{reason}</span>
              </li>
            ))}
          </ul>

          {correlation_analysis.recommended_method && (
            <div style={{ 
              marginTop: '16px', 
              padding: '12px', 
              background: 'white',
              borderRadius: '6px',
              border: '1px solid #dee2e6',
              borderLeft: '4px solid #00ED64'
            }}>
              <Body style={{ margin: 0, fontWeight: 500, color: '#495057' }}>
                <span style={{ color: '#00ED64', marginRight: '8px' }}>💡</span>
                <strong>Recommended Method:</strong> {
                  correlation_analysis.recommended_method === 'atlas' ? '🔍 Atlas Search' :
                  correlation_analysis.recommended_method === 'vector' ? '🧠 Vector Search' :
                  '⚡ Combined Search'
                }
              </Body>
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {intersection_matches.length === 0 && key_insights.length === 0 && recommendations.length === 0 && (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>⚡</div>
          <Body className={styles.emptyText}>
            No combined intelligence data available. Perform a search to see correlation analysis.
          </Body>
        </div>
      )}
    </div>
  );
};

export default CombinedIntelligencePanel;