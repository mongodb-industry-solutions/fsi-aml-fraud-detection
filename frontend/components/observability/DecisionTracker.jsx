/**
 * Decision Tracker Component
 * Shows agent decision-making process with confidence levels and reasoning
 */

'use client';

import React, { useState } from 'react';
import Badge from '@leafygreen-ui/badge';
import Button from '@leafygreen-ui/button';
import Icon from '@leafygreen-ui/icon';

export const DecisionTracker = ({ decisions }) => {
  const [expandedDecision, setExpandedDecision] = useState(null);

  const getConfidenceConfig = (confidence) => {
    if (confidence >= 0.9) return { color: 'green', label: 'Very High' };
    if (confidence >= 0.7) return { color: 'blue', label: 'High' };
    if (confidence >= 0.5) return { color: 'yellow', label: 'Medium' };
    if (confidence >= 0.3) return { color: 'orange', label: 'Low' };
    return { color: 'red', label: 'Very Low' };
  };

  const getDecisionTypeIcon = (type) => {
    switch (type) {
      case 'fraud_assessment':
        return 'Shield';
      case 'risk_scoring':
        return 'ChartLine';
      case 'tool_selection':
        return 'Settings';
      default:
        return 'Bulb';
    }
  };

  const formatDecisionType = (type) => {
    return type
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
  };

  const toggleDecisionExpansion = (decisionId) => {
    setExpandedDecision(expandedDecision === decisionId ? null : decisionId);
  };

  if (!decisions.length) {
    return null;
  }

  return (
    <div className="bg-gray-50 rounded-lg p-3 border">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-sm text-gray-800">Agent Decisions</h3>
        <Badge variant="purple" className="text-xs">
          {decisions.length} decisions
        </Badge>
      </div>

      <div className="space-y-2">
        {decisions.map((decision) => {
          const confidenceConfig = getConfidenceConfig(decision.confidence);
          const isExpanded = expandedDecision === decision.id;

          return (
            <div
              key={decision.id}
              className="bg-white rounded-md border p-3 transition-all duration-200"
            >
              {/* Decision Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3 flex-1">
                  <Icon 
                    glyph={getDecisionTypeIcon(decision.type)} 
                    size="small"
                    className="mt-0.5" 
                  />

                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="font-medium text-sm text-gray-800">
                        {formatDecisionType(decision.type)}
                      </span>
                      <Badge variant={confidenceConfig.color} className="text-xs">
                        {confidenceConfig.label} ({Math.round(decision.confidence * 100)}%)
                      </Badge>
                    </div>

                    <div className="text-sm text-gray-600 mb-2">
                      {decision.summary}
                    </div>

                    <div className="text-xs text-gray-500">
                      {new Date(decision.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                </div>

                <Button
                  size="xsmall"
                  variant="default"
                  onClick={() => toggleDecisionExpansion(decision.id)}
                >
                  <Icon 
                    glyph={isExpanded ? "ChevronUp" : "ChevronDown"} 
                    size="small" 
                  />
                </Button>
              </div>

              {/* Confidence Score Bar */}
              <div className="mt-3 mb-2">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-gray-500">Confidence Level</span>
                  <span className="font-medium">{Math.round(decision.confidence * 100)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${
                      confidenceConfig.color === 'green' ? 'bg-green-500' :
                      confidenceConfig.color === 'blue' ? 'bg-blue-500' :
                      confidenceConfig.color === 'yellow' ? 'bg-yellow-500' :
                      confidenceConfig.color === 'orange' ? 'bg-orange-500' :
                      'bg-red-500'
                    }`}
                    style={{ width: `${decision.confidence * 100}%` }}
                  />
                </div>
              </div>

              {/* Expanded Decision Details */}
              {isExpanded && (
                <div className="mt-3 pt-3 border-t border-gray-100 space-y-3">
                  {/* Reasoning Chain */}
                  {decision.reasoning && decision.reasoning.length > 0 && (
                    <div>
                      <div className="text-xs font-medium text-gray-600 mb-2">
                        Reasoning Chain:
                      </div>
                      <div className="space-y-2">
                        {decision.reasoning.map((reason, index) => (
                          <div key={index} className="flex items-start space-x-2">
                            <div className="flex-shrink-0 w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center text-xs font-medium text-blue-600 mt-0.5">
                              {index + 1}
                            </div>
                            <div className="text-sm text-gray-700 flex-1">
                              {reason}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Decision Details */}
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="text-gray-500">Decision Type:</span>
                      <div className="font-medium text-gray-700">
                        {formatDecisionType(decision.type)}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-500">Timestamp:</span>
                      <div className="font-mono text-gray-700">
                        {new Date(decision.timestamp).toLocaleString()}
                      </div>
                    </div>
                  </div>

                  {/* Confidence Analysis */}
                  <div className="bg-gray-50 rounded p-2">
                    <div className="text-xs font-medium text-gray-600 mb-1">
                      Confidence Analysis:
                    </div>
                    <div className="text-xs text-gray-600">
                      The agent expressed <strong>{confidenceConfig.label.toLowerCase()}</strong> confidence 
                      ({Math.round(decision.confidence * 100)}%) in this {formatDecisionType(decision.type).toLowerCase()}.
                      {decision.confidence >= 0.8 && " This indicates high reliability in the assessment."}
                      {decision.confidence < 0.8 && decision.confidence >= 0.6 && " This suggests moderate reliability with some uncertainty."}
                      {decision.confidence < 0.6 && " This indicates lower reliability and may require human review."}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Decision Summary */}
      <div className="mt-3 pt-3 border-t border-gray-200">
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div>
            <span className="text-gray-500">Average Confidence:</span>
            <div className="font-medium text-gray-700">
              {decisions.length > 0 
                ? Math.round((decisions.reduce((sum, d) => sum + d.confidence, 0) / decisions.length) * 100)
                : 0
              }%
            </div>
          </div>
          <div>
            <span className="text-gray-500">High Confidence:</span>
            <div className="font-medium text-gray-700">
              {decisions.filter(d => d.confidence >= 0.7).length} of {decisions.length}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};