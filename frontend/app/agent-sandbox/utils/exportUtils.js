// Export utility functions for Agent Sandbox data

// Generate PDF report (simulated)
export const generatePDFReport = async (data, reportType = 'comprehensive') => {
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  const reportData = {
    title: `ThreatSight 360 Agent Sandbox Report - ${reportType.toUpperCase()}`,
    generatedAt: new Date().toISOString(),
    scenario: data.selectedScenario?.name || 'Unknown Scenario',
    ...data
  };

  // Create downloadable PDF blob (simulated)
  const pdfContent = generatePDFContent(reportData, reportType);
  const blob = new Blob([pdfContent], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  
  // Trigger download
  const link = document.createElement('a');
  link.href = url;
  link.download = `agent-sandbox-${reportType}-${new Date().getTime()}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  
  return { success: true, filename: link.download };
};

// Generate CSV data export
export const exportToCSV = (data, filename = 'agent-sandbox-data') => {
  let csvContent = '';
  
  if (data.metrics) {
    csvContent += 'Performance Metrics\n';
    csvContent += 'Metric,Value,Unit\n';
    csvContent += `Accuracy,${data.metrics.accuracy},%\n`;
    csvContent += `Average Latency,${data.metrics.avgLatency},ms\n`;
    csvContent += `Throughput,${Math.round(data.metrics.throughput)},decisions/hour\n`;
    csvContent += `False Positive Rate,${data.metrics.falsePositiveRate},%\n`;
    csvContent += `System Load,${data.metrics.systemLoad},%\n`;
    csvContent += `Fraud Prevented,${data.metrics.fraudPrevented},USD\n\n`;
  }
  
  if (data.timelineEvents) {
    csvContent += 'Timeline Events\n';
    csvContent += 'Event ID,Agent,Action,Duration,Confidence,Criticality\n';
    data.timelineEvents.forEach(event => {
      csvContent += `${event.id},${event.agent},"${event.action}",${event.duration},${event.confidence},${event.criticality}\n`;
    });
    csvContent += '\n';
  }
  
  if (data.memoryMetrics) {
    csvContent += 'Memory Metrics\n';
    csvContent += 'Type,Count,Accuracy,Status\n';
    csvContent += `Vector Clusters,${data.memoryMetrics.vectorClusters},${data.memoryMetrics.vectorAccuracy}%,Active\n`;
    csvContent += `Graph Relationships,${data.memoryMetrics.graphRelationships},${data.memoryMetrics.graphAccuracy}%,Active\n`;
    csvContent += `Temporal Patterns,${data.memoryMetrics.temporalPatterns},${data.memoryMetrics.temporalAccuracy}%,Active\n`;
  }
  
  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}-${new Date().getTime()}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  
  return { success: true, filename: link.download };
};

// Export JSON configuration
export const exportConfiguration = (config) => {
  const configData = {
    version: '2.0',
    exportedAt: new Date().toISOString(),
    scenario: config.selectedScenario,
    orchestrationPattern: config.orchestrationMode,
    simulationSettings: {
      isRunning: config.isSimulationRunning,
      speed: config.simulationSpeed
    },
    performanceThresholds: {
      minAccuracy: 95,
      maxLatency: 1000,
      maxFalsePositiveRate: 3
    },
    agentConfiguration: config.agentConfig || {}
  };
  
  const jsonString = JSON.stringify(configData, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `agent-sandbox-config-${new Date().getTime()}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  
  return { success: true, filename: link.download };
};

// Generate timeline data for export
export const exportTimelineData = (timelineEvents, format = 'json') => {
  const timelineData = {
    exportType: 'timeline',
    exportedAt: new Date().toISOString(),
    totalEvents: timelineEvents.length,
    events: timelineEvents.map(event => ({
      id: event.id,
      timestamp: event.timestamp,
      agent: event.agent,
      action: event.action,
      duration: event.duration,
      confidence: event.confidence,
      criticality: event.criticality,
      details: event.details
    }))
  };
  
  if (format === 'csv') {
    return exportToCSV({ timelineEvents }, 'timeline-data');
  }
  
  const jsonString = JSON.stringify(timelineData, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `timeline-data-${new Date().getTime()}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  
  return { success: true, filename: link.download };
};

// Generate memory analytics export
export const exportMemoryAnalytics = (memoryData) => {
  const analyticsData = {
    exportType: 'memory_analytics',
    exportedAt: new Date().toISOString(),
    vectorMemory: {
      totalVectors: memoryData.totalVectors || 1245893,
      clusters: memoryData.clusters || 12,
      avgSimilarity: memoryData.avgSimilarity || 0.876,
      queryLatency: memoryData.queryLatency || 0.234
    },
    graphMemory: {
      totalNodes: memoryData.totalNodes || 45672,
      totalEdges: memoryData.totalEdges || 123890,
      avgCentrality: memoryData.avgCentrality || 0.654,
      networkDensity: memoryData.networkDensity || 0.423
    },
    temporalMemory: {
      timeRange: memoryData.timeRange || '90 days',
      consolidationEvents: memoryData.consolidationEvents || 23,
      decayRate: memoryData.decayRate || 0.012,
      retentionScore: memoryData.retentionScore || 0.891
    }
  };
  
  const jsonString = JSON.stringify(analyticsData, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `memory-analytics-${new Date().getTime()}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  
  return { success: true, filename: link.download };
};

// Generate debug session export
export const exportDebugSession = (messages, sessionData) => {
  const debugData = {
    exportType: 'debug_session',
    exportedAt: new Date().toISOString(),
    sessionId: sessionData.sessionId || 'debug_' + new Date().getTime(),
    scenario: sessionData.selectedScenario?.name || 'Unknown',
    messageCount: messages.length,
    sessionDuration: sessionData.duration || 'Unknown',
    messages: messages.map(msg => ({
      id: msg.id,
      type: msg.type,
      agent: msg.agent,
      content: msg.content,
      confidence: msg.confidence,
      timestamp: msg.timestamp,
      debugData: msg.debugData
    })),
    sessionMetrics: {
      userQueries: messages.filter(m => m.type === 'user').length,
      agentResponses: messages.filter(m => m.type === 'agent').length,
      systemMessages: messages.filter(m => m.type === 'system').length
    }
  };
  
  const jsonString = JSON.stringify(debugData, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `debug-session-${new Date().getTime()}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  
  return { success: true, filename: link.download };
};

// Helper function to generate PDF content (simulated)
const generatePDFContent = (data, reportType) => {
  // This would normally use a PDF generation library like jsPDF
  // For now, we'll return a simple text representation
  let content = `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj

2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj

3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Resources <<
/Font <<
/F1 4 0 R
>>
>>
/Contents 5 0 R
>>
endobj

4 0 obj
<<
/Type /Font
/Subtype /Type1
/BaseFont /Helvetica
>>
endobj

5 0 obj
<<
/Length 200
>>
stream
BT
/F1 12 Tf
50 750 Td
(${data.title}) Tj
0 -20 Td
(Generated: ${new Date(data.generatedAt).toLocaleString()}) Tj
0 -20 Td
(Scenario: ${data.scenario}) Tj
0 -20 Td
(Report Type: ${reportType.toUpperCase()}) Tj
ET
endstream
endobj

xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000274 00000 n 
0000000361 00000 n 
trailer
<<
/Size 6
/Root 1 0 R
>>
startxref
565
%%EOF`;

  return content;
};

// Utility functions for data formatting
export const formatMetricsForExport = (metrics) => {
  return {
    accuracy: `${metrics.accuracy}%`,
    latency: `${metrics.avgLatency}ms`,
    throughput: `${Math.round(metrics.throughput)} decisions/hour`,
    falsePositiveRate: `${metrics.falsePositiveRate}%`,
    systemLoad: `${metrics.systemLoad}%`,
    fraudPrevented: `$${(metrics.fraudPrevented / 1000000).toFixed(1)}M`
  };
};

export const formatTimelineForExport = (events) => {
  return events.map(event => ({
    timestamp: new Date(event.timestamp).toISOString(),
    agent: event.agent,
    action: event.action,
    duration: `${event.duration}s`,
    confidence: `${Math.round(event.confidence * 100)}%`,
    criticality: event.criticality.toUpperCase(),
    summary: event.details.substring(0, 100) + (event.details.length > 100 ? '...' : '')
  }));
};