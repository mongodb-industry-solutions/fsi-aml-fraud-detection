"use client";

import React from 'react';
import Card from '@leafygreen-ui/card';
import Icon from '@leafygreen-ui/icon';
import Badge from '@leafygreen-ui/badge';
import { Body, H3, Subtitle } from '@leafygreen-ui/typography';
import { palette } from '@leafygreen-ui/palette';
import { spacing } from '@leafygreen-ui/tokens';

/**
 * Agent Architecture Visualization Component
 * 
 * Replaces the loading screen with an interactive visualization of the
 * two-stage fraud detection architecture, showing real-time processing state.
 */
const AgentArchitectureVisualization = ({
  loading = false,
  currentStage = 'stage1',
  stage1Result = null,
  stage2Progress = null,
  agentResults = null,
  processingStage = ''
}) => {
  
  // Determine current processing state
  const getProcessingState = () => {
    if (!loading && agentResults) return 'completed';
    if (loading && currentStage === 'stage2') return 'stage2';
    if (loading) return 'stage1';
    return 'idle';
  };

  const processingState = getProcessingState();

  // Architecture Header Component
  const ArchitectureHeader = () => (
    <Card style={{ 
      marginBottom: spacing[3], 
      background: `linear-gradient(135deg, ${palette.blue.light3}, ${palette.white})`,
      border: `2px solid ${palette.blue.base}`
    }}>
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: spacing[2], 
        marginBottom: spacing[2] 
      }}>
        <Icon glyph="Diagram" fill={palette.blue.dark2} size={24} />
        <H3 style={{ margin: 0, color: palette.blue.dark2 }}>
          Two-Stage Fraud Detection Architecture
        </H3>
        <Badge variant="blue" style={{ fontSize: '11px' }}>
          {processingState === 'completed' ? 'ANALYSIS COMPLETE' : 
           processingState === 'stage2' ? 'STAGE 2 ACTIVE' :
           processingState === 'stage1' ? 'STAGE 1 ACTIVE' : 'READY'}
        </Badge>
      </div>
      <Body style={{ color: palette.blue.dark1 }}>
        {processingState === 'completed' ? 'Decision process completed with AI analysis' :
         processingState === 'stage2' ? 'AI agent analyzing transaction with strategic tools' :
         processingState === 'stage1' ? 'Rules engine processing transaction patterns' :
         'Interactive visualization of the fraud detection decision process'}
      </Body>
    </Card>
  );

  // Stage 1 Visualization Component
  const Stage1Visualization = () => {
    const isActive = processingState === 'stage1';
    const isCompleted = processingState === 'stage2' || processingState === 'completed';
    
    return (
      <Card style={{ 
        marginBottom: spacing[3],
        background: isActive ? 
          `linear-gradient(135deg, ${palette.green.light2}, ${palette.green.light3})` :
          isCompleted ? 
          `linear-gradient(135deg, ${palette.green.light3}, ${palette.white})` :
          palette.gray.light3,
        border: `2px solid ${isActive ? palette.green.base : isCompleted ? palette.green.light1 : palette.gray.light1}`,
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Active state animation */}
        {isActive && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: '-100%',
            width: '100%',
            height: '100%',
            background: `linear-gradient(90deg, transparent, ${palette.green.light1}, transparent)`,
            animation: 'shimmer 2s infinite',
            pointerEvents: 'none'
          }} />
        )}
        
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2], marginBottom: spacing[3] }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: isActive ? palette.green.base : isCompleted ? palette.green.light1 : palette.gray.base,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Icon 
                glyph={isCompleted ? "Checkmark" : isActive ? "Refresh" : "University"} 
                fill={palette.white} 
                size={16} 
              />
            </div>
            <H3 style={{ margin: 0, color: isActive ? palette.green.dark2 : palette.gray.dark2 }}>
              Stage 1: Rules + Basic ML
            </H3>
            <Badge variant={isActive ? "green" : isCompleted ? "lightgreen" : "lightgray"} style={{ fontSize: '10px' }}>
              {isCompleted ? 'COMPLETED' : isActive ? 'PROCESSING' : 'PENDING'}
            </Badge>
          </div>

          {/* Decision Thresholds */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', 
            gap: spacing[2],
            marginBottom: spacing[3]
          }}>
            <div style={{ 
              background: palette.white,
              padding: spacing[2],
              borderRadius: '6px',
              border: `1px solid ${palette.green.light1}`,
              textAlign: 'center'
            }}>
              <Body size="small" weight="bold" style={{ color: palette.green.dark2 }}>
                Auto-Approve
              </Body>
              <Body size="small" style={{ color: palette.green.dark1 }}>
                Score &lt; 25
              </Body>
            </div>
            
            <div style={{ 
              background: palette.white,
              padding: spacing[2],
              borderRadius: '6px',
              border: `1px solid ${palette.yellow.light1}`,
              textAlign: 'center'
            }}>
              <Body size="small" weight="bold" style={{ color: palette.yellow.dark2 }}>
                AI Analysis
              </Body>
              <Body size="small" style={{ color: palette.yellow.dark1 }}>
                Score 25-85
              </Body>
            </div>
            
            <div style={{ 
              background: palette.white,
              padding: spacing[2],
              borderRadius: '6px',
              border: `1px solid ${palette.red.light1}`,
              textAlign: 'center'
            }}>
              <Body size="small" weight="bold" style={{ color: palette.red.dark2 }}>
                Auto-Block
              </Body>
              <Body size="small" style={{ color: palette.red.dark1 }}>
                Score &gt; 85
              </Body>
            </div>
          </div>

          {/* Current Processing Info */}
          {isActive && (
            <div style={{ 
              background: `linear-gradient(135deg, ${palette.white}, ${palette.green.light3})`,
              padding: spacing[2],
              borderRadius: '6px',
              border: `1px solid ${palette.green.light1}`
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: spacing[1] }}>
                <div style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  background: palette.green.base,
                  animation: 'pulse 1.5s infinite'
                }} />
                <Body size="small" weight="medium" style={{ color: palette.green.dark2 }}>
                  Analyzing transaction patterns and risk factors...
                </Body>
              </div>
            </div>
          )}

          {/* Completed State Info */}
          {isCompleted && stage1Result && (
            <div style={{ 
              background: palette.white,
              padding: spacing[2],
              borderRadius: '6px',
              border: `1px solid ${palette.green.light1}`
            }}>
              <Body size="small" style={{ color: palette.green.dark1 }}>
                ✅ Stage 1 completed • Risk score in edge case range • Proceeding to AI analysis
              </Body>
            </div>
          )}
        </div>
      </Card>
    );
  };

  // Connected Agent Visualization Component
  const ConnectedAgentVisualization = () => {
    const shouldShow = processingState === 'stage2' || processingState === 'completed';
    const isActive = processingState === 'stage2' && processingStage.includes('SuspiciousReports');
    const isCompleted = processingState === 'completed' && agentResults?.connected_agent_results;
    
    if (!shouldShow) return null;
    
    return (
      <Card style={{ 
        marginBottom: spacing[3],
        background: isActive ? 
          `linear-gradient(135deg, ${palette.purple.light2}, ${palette.purple.light3})` :
          isCompleted ?
          `linear-gradient(135deg, ${palette.purple.light3}, ${palette.white})` :
          palette.gray.light3,
        border: `2px solid ${isActive ? palette.purple.base : isCompleted ? palette.purple.light1 : palette.gray.light1}`,
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Active state animation */}
        {isActive && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: '-100%',
            width: '100%',
            height: '100%',
            background: `linear-gradient(90deg, transparent, ${palette.purple.light1}, transparent)`,
            animation: 'shimmer 2s infinite',
            pointerEvents: 'none'
          }} />
        )}
        
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2], marginBottom: spacing[3] }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: isActive ? palette.purple.base : isCompleted ? palette.purple.light1 : palette.gray.base,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Icon 
                glyph={isCompleted ? "Checkmark" : isActive ? "File" : "Connect"} 
                fill={palette.white} 
                size={16} 
              />
            </div>
            <H3 style={{ margin: 0, color: isActive ? palette.purple.dark2 : palette.gray.dark1 }}>
              Connected Agent: SuspiciousReportsAgent
            </H3>
            <Badge variant={isActive ? "darkgray" : isCompleted ? "lightgray" : "lightgray"} style={{ fontSize: '10px' }}>
              {isCompleted ? 'COMPLETED' : isActive ? 'ANALYZING' : 'ON-DEMAND'}
            </Badge>
          </div>

          {/* Agent Info */}
          <div style={{ 
            background: palette.white,
            padding: spacing[2],
            borderRadius: '6px',
            border: `1px solid ${palette.purple.light1}`,
            marginBottom: spacing[2]
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2], marginBottom: spacing[1] }}>
              <Icon glyph="File" fill={palette.purple.base} size={16} />
              <Body size="small" weight="bold" style={{ color: palette.purple.dark2 }}>
                Specialized SAR Analysis Agent (GPT-4-mini)
              </Body>
            </div>
            <Body size="small" style={{ color: palette.purple.dark1 }}>
              Historical suspicious activity reports • Enterprise knowledge access • Statistical analysis
            </Body>
          </div>

          {/* Built-in Tools */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', 
            gap: spacing[2],
            marginBottom: spacing[2]
          }}>
            <div style={{ 
              background: isActive ? palette.purple.light3 : palette.white,
              padding: spacing[2],
              borderRadius: '6px',
              border: `1px solid ${palette.purple.light1}`,
              position: 'relative'
            }}>
              {isActive && (
                <div style={{
                  position: 'absolute',
                  top: spacing[1],
                  right: spacing[1],
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: palette.purple.base,
                  animation: 'pulse 1s infinite'
                }} />
              )}
              
              <div style={{ display: 'flex', alignItems: 'center', gap: spacing[1], marginBottom: spacing[1] }}>
                <Icon glyph="File" fill={palette.purple.base} size={14} />
                <Body size="small" weight="bold" style={{ 
                  color: palette.purple.dark2,
                  fontSize: '11px'
                }}>
                  File Search Tool
                </Body>
              </div>
              <Body size="small" style={{ 
                color: palette.purple.dark1,
                fontSize: '10px'
              }}>
                Historical SAR files & compliance documents
              </Body>
            </div>
            
            <div style={{ 
              background: isActive ? palette.purple.light3 : palette.white,
              padding: spacing[2],
              borderRadius: '6px',
              border: `1px solid ${palette.purple.light1}`,
              position: 'relative'
            }}>
              {isActive && (
                <div style={{
                  position: 'absolute',
                  top: spacing[1],
                  right: spacing[1],
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: palette.purple.base,
                  animation: 'pulse 1s infinite'
                }} />
              )}
              
              <div style={{ display: 'flex', alignItems: 'center', gap: spacing[1], marginBottom: spacing[1] }}>
                <Icon glyph="Code" fill={palette.purple.base} size={14} />
                <Body size="small" weight="bold" style={{ 
                  color: palette.purple.dark2,
                  fontSize: '11px'
                }}>
                  Code Interpreter
                </Body>
              </div>
              <Body size="small" style={{ 
                color: palette.purple.dark1,
                fontSize: '10px'
              }}>
                Statistical analysis & pattern computation
              </Body>
            </div>
          </div>

          {/* Trigger Conditions */}
          {!isActive && !isCompleted && (
            <div style={{ 
              background: `linear-gradient(135deg, ${palette.white}, ${palette.purple.light3})`,
              padding: spacing[2],
              borderRadius: '6px',
              border: `1px solid ${palette.purple.light1}`
            }}>
              <Body size="small" weight="medium" style={{ color: palette.purple.dark2, marginBottom: spacing[1] }}>
                Triggers when:
              </Body>
              <Body size="small" style={{ color: palette.purple.dark1, fontSize: '10px' }}>
                • High-value transactions ($10K+) • Multiple risk flags • Complex fraud patterns • Historical pattern matching needed
              </Body>
            </div>
          )}

          {/* Active Processing */}
          {isActive && (
            <div style={{ 
              background: `linear-gradient(135deg, ${palette.white}, ${palette.purple.light3})`,
              padding: spacing[2],
              borderRadius: '6px',
              border: `1px solid ${palette.purple.light1}`
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: spacing[1] }}>
                <div style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  background: palette.purple.base,
                  animation: 'pulse 1.5s infinite'
                }} />
                <Body size="small" weight="medium" style={{ color: palette.purple.dark2 }}>
                  Analyzing historical SAR patterns and regulatory context...
                </Body>
              </div>
            </div>
          )}

          {/* Completed Results */}
          {isCompleted && (
            <div style={{ 
              background: palette.white,
              padding: spacing[2],
              borderRadius: '6px',
              border: `1px solid ${palette.purple.light1}`
            }}>
              <Body size="small" style={{ color: palette.purple.dark1 }}>
                ✅ SAR analysis completed • Historical patterns identified • Results integrated with primary agent
              </Body>
            </div>
          )}
        </div>
      </Card>
    );
  };

  // Stage 2 Visualization Component  
  const Stage2Visualization = () => {
    const isActive = processingState === 'stage2';
    const isCompleted = processingState === 'completed';
    const shouldShow = isActive || isCompleted;
    
    if (!shouldShow) {
      return (
        <Card style={{ 
          marginBottom: spacing[3],
          background: palette.gray.light3,
          border: `1px solid ${palette.gray.light1}`,
          opacity: 0.6
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2], marginBottom: spacing[2] }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: palette.gray.base,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Icon glyph="Bulb" fill={palette.white} size={16} />
            </div>
            <H3 style={{ margin: 0, color: palette.gray.dark1 }}>
              Stage 2: AI Agent Analysis
            </H3>
            <Badge variant="lightgray" style={{ fontSize: '10px' }}>
              AWAITING
            </Badge>
          </div>
          <Body size="small" style={{ color: palette.gray.dark1 }}>
            AI analysis will begin if transaction requires deeper investigation
          </Body>
        </Card>
      );
    }

    return (
      <Card style={{ 
        marginBottom: spacing[3],
        background: isActive ? 
          `linear-gradient(135deg, ${palette.blue.light2}, ${palette.blue.light3})` :
          `linear-gradient(135deg, ${palette.blue.light3}, ${palette.white})`,
        border: `2px solid ${isActive ? palette.blue.base : palette.blue.light1}`,
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Active state animation */}
        {isActive && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: '-100%',
            width: '100%',
            height: '100%',
            background: `linear-gradient(90deg, transparent, ${palette.blue.light1}, transparent)`,
            animation: 'shimmer 2s infinite',
            pointerEvents: 'none'
          }} />
        )}
        
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2], marginBottom: spacing[3] }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: isActive ? palette.blue.base : palette.blue.light1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Icon 
                glyph={isCompleted ? "Checkmark" : "Bulb"} 
                fill={palette.white} 
                size={16} 
              />
            </div>
            <H3 style={{ margin: 0, color: palette.blue.dark2 }}>
              Stage 2: AI Agent Analysis
            </H3>
            <Badge variant={isActive ? "blue" : "lightgray"} style={{ fontSize: '10px' }}>
              {isCompleted ? 'COMPLETED' : 'PROCESSING'}
            </Badge>
          </div>

          {/* AI Agent Info */}
          <div style={{ 
            background: palette.white,
            padding: spacing[2],
            borderRadius: '6px',
            border: `1px solid ${palette.blue.light1}`,
            marginBottom: spacing[2]
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2], marginBottom: spacing[1] }}>
              <Icon glyph="Diagram" fill={palette.blue.base} size={16} />
              <Body size="small" weight="bold" style={{ color: palette.blue.dark2 }}>
                Primary Fraud Agent (GPT-4o)
              </Body>
            </div>
            <Body size="small" style={{ color: palette.blue.dark1 }}>
              Strategic tool selection • Thread-based memory • Dynamic context prompts
            </Body>
          </div>

          {/* Tool Selection Grid */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
            gap: spacing[2],
            marginBottom: spacing[2]
          }}>
            <ToolCard 
              name="analyze_transaction_patterns()"
              description="Customer baseline analysis"
              icon="Camera"
              isActive={isActive}
              color="green"
              priority="Always first"
            />
            <ToolCard 
              name="search_similar_transactions()"
              description="Vector similarity search"
              icon="MagnifyingGlass"
              isActive={isActive && processingStage.includes('similar')}
              color="blue"
              priority="Pattern validation"
            />
            <ToolCard 
              name="calculate_network_risk()"
              description="Fraud ring detection"
              icon="Connect"
              isActive={isActive && processingStage.includes('network')}
              color="red"
              priority="Anomaly investigation"
            />
            <ToolCard 
              name="check_sanctions_lists()"
              description="AML compliance check"
              icon="Warning"
              isActive={isActive && processingStage.includes('sanctions')}
              color="yellow"
              priority="Regulatory screening"
            />
          </div>

          {/* Current Processing Info */}
          {isActive && (
            <div style={{ 
              background: `linear-gradient(135deg, ${palette.white}, ${palette.blue.light3})`,
              padding: spacing[2],
              borderRadius: '6px',
              border: `1px solid ${palette.blue.light1}`
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: spacing[1] }}>
                <div style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  background: palette.blue.base,
                  animation: 'pulse 1.5s infinite'
                }} />
                <Body size="small" weight="medium" style={{ color: palette.blue.dark2 }}>
                  {processingStage || 'AI agent selecting optimal analysis tools...'}
                </Body>
              </div>
            </div>
          )}
        </div>
      </Card>
    );
  };

  // Tool Card Component
  const ToolCard = ({ name, description, icon, isActive, color, priority }) => {
    const colorMap = {
      green: { bg: palette.green.light3, border: palette.green.light1, text: palette.green.dark2 },
      blue: { bg: palette.blue.light3, border: palette.blue.light1, text: palette.blue.dark2 },
      red: { bg: palette.red.light3, border: palette.red.light1, text: palette.red.dark2 },
      yellow: { bg: palette.yellow.light3, border: palette.yellow.light1, text: palette.yellow.dark2 }
    };
    
    const colors = colorMap[color] || colorMap.blue;
    
    return (
      <div style={{ 
        background: isActive ? colors.bg : palette.white,
        padding: spacing[2],
        borderRadius: '6px',
        border: `1px solid ${isActive ? colors.border : palette.gray.light1}`,
        position: 'relative',
        transition: 'all 0.3s ease'
      }}>
        {isActive && (
          <div style={{
            position: 'absolute',
            top: spacing[1],
            right: spacing[1],
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: colors.text,
            animation: 'pulse 1s infinite'
          }} />
        )}
        
        <div style={{ display: 'flex', alignItems: 'center', gap: spacing[1], marginBottom: spacing[1] }}>
          <Icon glyph={icon} fill={isActive ? colors.text : palette.gray.base} size={14} />
          <Body size="small" weight="bold" style={{ 
            color: isActive ? colors.text : palette.gray.dark1,
            fontSize: '11px'
          }}>
            {name}
          </Body>
        </div>
        <Body size="small" style={{ 
          color: isActive ? colors.text : palette.gray.dark1,
          fontSize: '10px',
          marginBottom: spacing[1]
        }}>
          {description}
        </Body>
        <Badge variant="lightgray" style={{ fontSize: '9px' }}>
          {priority}
        </Badge>
      </div>
    );
  };

  return (
    <div>
      <ArchitectureHeader />
      <Stage1Visualization />
      <Stage2Visualization />
      <ConnectedAgentVisualization />
      
      {/* Add CSS animations */}
      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        
        @keyframes shimmer {
          0% { left: -100%; }
          100% { left: 100%; }
        }
      `}</style>
    </div>
  );
};

export default AgentArchitectureVisualization;
