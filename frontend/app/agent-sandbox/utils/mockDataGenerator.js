// Mock Data Generator for Agent Sandbox
// Generates realistic fraud detection scenarios and agent behaviors

// Fraud Detection Scenarios
export const fraudScenarios = [
  {
    id: 'money-laundering-ring',
    name: 'Cross-Border Money Laundering Ring',
    description: 'Complex multi-entity network with layered transactions across multiple jurisdictions',
    riskLevel: 'critical',
    complexity: 'high',
    agentCount: 7,
    networkDepth: 4,
    estimatedDuration: 2.3,
    transactionData: {
      id: 'txn-2024-89432',
      amount: 12847.50,
      currency: 'USD',
      timestamp: new Date('2024-08-27T10:24:31.245Z'),
      location: {
        country: 'Singapore',
        region: 'Central Singapore',
        city: 'Singapore',
        coordinates: { lat: 1.3521, lng: 103.8198 },
        timezone: 'Asia/Singapore'
      },
      merchant: {
        id: 'merchant-sg-8834',
        name: 'TechCorp International',
        category: 'Professional Services',
        riskProfile: 'high',
        verificationStatus: 'pending'
      },
      account: {
        id: 'acc-4421-9987',
        holderName: 'John Smith',
        type: 'individual',
        riskScore: 73,
        accountAge: 45,
        transactionHistory: {
          totalTransactions: 1247,
          averageAmount: 2340.50,
          frequentMerchants: ['TechCorp International', 'Global Finance Ltd', 'Apex Trading'],
          unusualPatterns: ['High velocity transactions', 'Unusual geographic spread', 'Round number amounts']
        }
      }
    },
    fraudIndicators: [
      { type: 'velocity', severity: 'high', description: 'Unusual transaction frequency', weight: 25 },
      { type: 'geography', severity: 'medium', description: 'Cross-border pattern', weight: 20 },
      { type: 'network', severity: 'critical', description: 'Connected to known shell companies', weight: 35 },
      { type: 'amount', severity: 'medium', description: 'Just below reporting threshold', weight: 20 }
    ],
    expectedOutcome: {
      riskScore: 87,
      riskLevel: 'critical',
      confidence: 89,
      recommendation: 'investigate'
    }
  },
  {
    id: 'credit-card-testing',
    name: 'Credit Card Testing Attack',
    description: 'High-frequency micro transactions to validate stolen card data',
    riskLevel: 'high',
    complexity: 'medium',
    agentCount: 5,
    networkDepth: 2,
    estimatedDuration: 1.1,
    transactionData: {
      id: 'txn-2024-12845',
      amount: 1.99,
      currency: 'USD',
      timestamp: new Date(),
      location: {
        country: 'United States',
        region: 'California',
        city: 'San Francisco',
        coordinates: { lat: 37.7749, lng: -122.4194 },
        timezone: 'America/Los_Angeles'
      },
      merchant: {
        id: 'merchant-us-1234',
        name: 'Digital Store Inc',
        category: 'E-commerce',
        riskProfile: 'medium',
        verificationStatus: 'verified'
      },
      account: {
        id: 'acc-1234-5678',
        holderName: 'Sarah Johnson',
        type: 'individual',
        riskScore: 45,
        accountAge: 180,
        transactionHistory: {
          totalTransactions: 23,
          averageAmount: 1.50,
          frequentMerchants: ['Digital Store Inc', 'Test Merchant A', 'Test Merchant B'],
          unusualPatterns: ['Micro transactions only', 'Sequential attempts']
        }
      }
    },
    fraudIndicators: [
      { type: 'velocity', severity: 'critical', description: '47 transactions in 12 minutes', weight: 40 },
      { type: 'amount', severity: 'high', description: 'Consistent micro amounts', weight: 30 },
      { type: 'pattern', severity: 'high', description: 'Sequential card testing behavior', weight: 30 }
    ],
    expectedOutcome: {
      riskScore: 94,
      riskLevel: 'critical',
      confidence: 96,
      recommendation: 'decline'
    }
  },
  {
    id: 'account-takeover',
    name: 'Account Takeover Sequence',
    description: 'Progressive suspicious activity indicating compromised account access',
    riskLevel: 'high',
    complexity: 'medium',
    agentCount: 4,
    networkDepth: 3,
    estimatedDuration: 1.8,
    transactionData: {
      id: 'txn-2024-67890',
      amount: 850.00,
      currency: 'USD',
      timestamp: new Date(),
      location: {
        country: 'Russia',
        region: 'Moscow Oblast',
        city: 'Moscow',
        coordinates: { lat: 55.7558, lng: 37.6173 },
        timezone: 'Europe/Moscow'
      },
      merchant: {
        id: 'merchant-ru-5567',
        name: 'Moscow Electronics',
        category: 'Electronics',
        riskProfile: 'medium',
        verificationStatus: 'verified'
      },
      account: {
        id: 'acc-9876-5432',
        holderName: 'Michael Brown',
        type: 'individual',
        riskScore: 65,
        accountAge: 1095,
        transactionHistory: {
          totalTransactions: 892,
          averageAmount: 67.30,
          frequentMerchants: ['Local Grocery', 'Gas Station Chain', 'Coffee Shop'],
          unusualPatterns: ['Geographic anomaly', 'Amount deviation', 'Time pattern change']
        }
      }
    },
    fraudIndicators: [
      { type: 'geography', severity: 'critical', description: 'Transaction from Russia, user typically in US', weight: 35 },
      { type: 'behavior', severity: 'high', description: 'Unusual purchase category', weight: 25 },
      { type: 'timing', severity: 'medium', description: 'Transaction at 3 AM local user time', weight: 20 },
      { type: 'amount', severity: 'medium', description: '12x higher than average', weight: 20 }
    ],
    expectedOutcome: {
      riskScore: 78,
      riskLevel: 'high',
      confidence: 85,
      recommendation: 'review'
    }
  }
];

// Agent Orchestration Patterns
export const orchestrationPatterns = {
  magentic: {
    name: 'Magentic Orchestration',
    description: 'Dynamic task ledger with intelligent backtracking',
    agents: [
      {
        id: 'manager',
        type: 'manager',
        name: 'Manager Agent',
        description: 'Orchestrates dynamic task ledger and manages backtracking with intelligent decision routing',
        position: { x: 400, y: 50 },
        status: 'active',
        confidence: 92,
        capabilities: ['task_management', 'backtracking', 'orchestration', 'decision_routing'],
        currentTask: 'Coordinating fraud investigation',
        messageQueue: Math.floor(Math.random() * 3) + 1,
        connections: ['analyzer', 'validator', 'investigator', 'backtrack'],
        metrics: {
          avgLatency: 45,
          throughput: 12.4,
          accuracy: 94,
          memoryUtilization: 67,
          toolUsageCount: 145,
          lastActivity: new Date()
        }
      },
      {
        id: 'analyzer',
        type: 'analyzer',
        name: 'Pattern Analysis Agent',
        description: 'Deep pattern recognition and fraud detection using advanced ML models and vector embeddings',
        position: { x: 200, y: 200 },
        status: 'processing',
        confidence: 87,
        capabilities: ['pattern_recognition', 'ml_inference', 'vector_search', 'anomaly_detection'],
        currentTask: 'Analyzing transaction patterns',
        messageQueue: Math.floor(Math.random() * 5) + 2,
        connections: ['manager', 'validator', 'memory_node'],
        metrics: {
          avgLatency: 234,
          throughput: 8.7,
          accuracy: 89,
          memoryUtilization: 78,
          toolUsageCount: 892,
          lastActivity: new Date(Date.now() - 1000)
        }
      },
      {
        id: 'validator',
        type: 'validator',
        name: 'Rule Validation Agent',
        description: 'Cross-references findings with compliance rules and regulatory frameworks',
        position: { x: 400, y: 200 },
        status: 'idle',
        confidence: 95,
        capabilities: ['rule_engine', 'compliance_check', 'validation', 'regulatory_mapping'],
        currentTask: 'Standby for validation',
        messageQueue: 0,
        connections: ['manager', 'analyzer', 'investigator'],
        metrics: {
          avgLatency: 78,
          throughput: 15.2,
          accuracy: 97,
          memoryUtilization: 34,
          toolUsageCount: 567,
          lastActivity: new Date(Date.now() - 5000)
        }
      },
      {
        id: 'investigator',
        type: 'investigator',
        name: 'Risk Assessment Agent',
        description: 'Calculates comprehensive risk scores using network analysis and behavioral patterns',
        position: { x: 600, y: 200 },
        status: 'waiting',
        confidence: 91,
        capabilities: ['risk_scoring', 'network_analysis', 'investigation', 'behavioral_analysis'],
        currentTask: 'Waiting for analysis results',
        messageQueue: 1,
        connections: ['manager', 'validator', 'analyzer'],
        metrics: {
          avgLatency: 156,
          throughput: 6.8,
          accuracy: 93,
          memoryUtilization: 45,
          toolUsageCount: 234,
          lastActivity: new Date(Date.now() - 3000)
        }
      },
      {
        id: 'backtrack',
        type: 'manager',
        name: 'Backtrack Handler',
        description: 'Handles low-confidence scenarios with alternative approaches and recovery strategies',
        position: { x: 200, y: 350 },
        status: 'idle',
        confidence: 88,
        capabilities: ['backtracking', 'alternative_strategies', 'retry_logic', 'recovery_planning'],
        currentTask: 'Monitoring for backtrack triggers',
        messageQueue: 0,
        connections: ['manager'],
        metrics: {
          avgLatency: 67,
          throughput: 4.2,
          accuracy: 85,
          memoryUtilization: 23,
          toolUsageCount: 89,
          lastActivity: new Date(Date.now() - 8000)
        }
      }
    ],
    connections: [
      { 
        id: 'e1', 
        source: 'manager', 
        target: 'analyzer', 
        type: 'enhanced',
        data: { 
          type: 'control', 
          activity: 'high', 
          messageCount: 3,
          confidence: 0.95,
          showLabel: true
        },
        animated: true 
      },
      { 
        id: 'e2', 
        source: 'manager', 
        target: 'validator', 
        type: 'enhanced',
        data: { 
          type: 'control', 
          activity: 'medium', 
          messageCount: 1,
          confidence: 0.88
        },
        animated: false 
      },
      { 
        id: 'e3', 
        source: 'manager', 
        target: 'investigator', 
        type: 'enhanced',
        data: { 
          type: 'control', 
          activity: 'low', 
          messageCount: 0,
          confidence: 0.72
        }
      },
      { 
        id: 'e4', 
        source: 'analyzer', 
        target: 'validator', 
        type: 'enhanced',
        data: { 
          type: 'data', 
          activity: 'high', 
          messageCount: 5,
          confidence: 0.91,
          showLabel: true
        }
      },
      { 
        id: 'e5', 
        source: 'validator', 
        target: 'investigator', 
        type: 'enhanced',
        data: { 
          type: 'data', 
          activity: 'medium', 
          messageCount: 2,
          confidence: 0.84
        }
      },
      { 
        id: 'e6', 
        source: 'investigator', 
        target: 'backtrack', 
        type: 'enhanced',
        data: { 
          type: 'backtrack', 
          activity: 'low', 
          messageCount: 0,
          confidence: 0.45,
          showLabel: true
        }
      },
      { 
        id: 'e7', 
        source: 'backtrack', 
        target: 'manager', 
        type: 'enhanced',
        data: { 
          type: 'backtrack', 
          activity: 'low', 
          messageCount: 0,
          confidence: 0.65
        }
      }
    ]
  },
  groupChat: {
    name: 'Group Chat Orchestration',
    description: 'Collaborative agents debate and reach consensus',
    agents: [
      {
        id: 'facilitator',
        type: 'facilitator',
        name: 'Facilitator Agent',
        description: 'Manages group discussion and builds consensus',
        position: { x: 400, y: 50 },
        status: 'active',
        confidence: 89,
        capabilities: ['facilitation', 'consensus_building', 'conflict_resolution'],
        metrics: { avgLatency: 56, throughput: 7.3, accuracy: 91, memoryUtilization: 45, toolUsageCount: 156, lastActivity: new Date() }
      },
      {
        id: 'tech-analyst',
        type: 'analyzer',
        name: 'Technical Analyst',
        description: 'Provides technical fraud analysis perspective',
        position: { x: 200, y: 200 },
        status: 'processing',
        confidence: 78,
        capabilities: ['technical_analysis', 'pattern_detection', 'data_mining'],
        metrics: { avgLatency: 189, throughput: 5.6, accuracy: 87, memoryUtilization: 67, toolUsageCount: 445, lastActivity: new Date() }
      },
      {
        id: 'risk-assessor',
        type: 'investigator',
        name: 'Risk Assessor',
        description: 'Evaluates business and financial risk factors',
        position: { x: 400, y: 200 },
        status: 'processing',
        confidence: 82,
        capabilities: ['risk_assessment', 'financial_analysis', 'impact_evaluation'],
        metrics: { avgLatency: 134, throughput: 6.8, accuracy: 89, memoryUtilization: 56, toolUsageCount: 367, lastActivity: new Date() }
      },
      {
        id: 'compliance-officer',
        type: 'compliance',
        name: 'Compliance Officer',
        description: 'Ensures regulatory compliance and legal requirements',
        position: { x: 600, y: 200 },
        status: 'processing',
        confidence: 91,
        capabilities: ['compliance_check', 'regulatory_analysis', 'legal_review'],
        metrics: { avgLatency: 98, throughput: 8.9, accuracy: 95, memoryUtilization: 38, toolUsageCount: 278, lastActivity: new Date() }
      }
    ],
    connections: [
      { id: 'g1', source: 'facilitator', target: 'tech-analyst', type: 'control', animated: true, label: 'Request Analysis' },
      { id: 'g2', source: 'facilitator', target: 'risk-assessor', type: 'control', animated: true },
      { id: 'g3', source: 'facilitator', target: 'compliance-officer', type: 'control', animated: true },
      { id: 'g4', source: 'tech-analyst', target: 'risk-assessor', type: 'debate', style: { strokeDasharray: '5,5' }, label: 'Challenge' },
      { id: 'g5', source: 'risk-assessor', target: 'compliance-officer', type: 'debate', style: { strokeDasharray: '5,5' }, label: 'Debate' },
      { id: 'g6', source: 'compliance-officer', target: 'tech-analyst', type: 'debate', style: { strokeDasharray: '5,5' }, label: 'Feedback' }
    ]
  },
  concurrent: {
    name: 'Concurrent Processing',
    description: 'Parallel agent execution with result aggregation',
    agents: [
      {
        id: 'orchestrator',
        type: 'manager',
        name: 'Parallel Orchestrator',
        description: 'Manages concurrent execution and aggregates results',
        position: { x: 400, y: 50 },
        status: 'active',
        confidence: 95,
        capabilities: ['parallel_coordination', 'result_aggregation', 'load_balancing'],
        metrics: { avgLatency: 23, throughput: 18.5, accuracy: 96, memoryUtilization: 42, toolUsageCount: 89, lastActivity: new Date() }
      },
      {
        id: 'processor-1',
        type: 'analyzer',
        name: 'Stream Processor A',
        description: 'Processes transaction batch A with vector similarity',
        position: { x: 150, y: 200 },
        status: 'processing',
        confidence: 84,
        capabilities: ['stream_processing', 'vector_search', 'batch_analysis'],
        metrics: { avgLatency: 156, throughput: 1200, accuracy: 91, memoryUtilization: 78, toolUsageCount: 1456, lastActivity: new Date() }
      },
      {
        id: 'processor-2',
        type: 'analyzer',
        name: 'Stream Processor B',
        description: 'Processes transaction batch B with rule engine',
        position: { x: 300, y: 200 },
        status: 'processing',
        confidence: 89,
        capabilities: ['stream_processing', 'rule_engine', 'pattern_matching'],
        metrics: { avgLatency: 98, throughput: 980, accuracy: 94, memoryUtilization: 65, toolUsageCount: 2134, lastActivity: new Date() }
      },
      {
        id: 'processor-3',
        type: 'analyzer',
        name: 'Stream Processor C',
        description: 'Processes transaction batch C with graph analysis',
        position: { x: 450, y: 200 },
        status: 'processing',
        confidence: 87,
        capabilities: ['stream_processing', 'graph_analysis', 'network_traversal'],
        metrics: { avgLatency: 234, throughput: 1100, accuracy: 88, memoryUtilization: 71, toolUsageCount: 987, lastActivity: new Date() }
      },
      {
        id: 'processor-4',
        type: 'analyzer',
        name: 'Stream Processor D',
        description: 'Standby processor for overflow handling',
        position: { x: 600, y: 200 },
        status: 'idle',
        confidence: 0,
        capabilities: ['stream_processing', 'overflow_handling', 'backup_analysis'],
        metrics: { avgLatency: 0, throughput: 0, accuracy: 0, memoryUtilization: 12, toolUsageCount: 0, lastActivity: new Date(Date.now() - 30000) }
      },
      {
        id: 'aggregator',
        type: 'investigator',
        name: 'Result Aggregator',
        description: 'Combines and reconciles parallel processing results',
        position: { x: 400, y: 350 },
        status: 'processing',
        confidence: 92,
        capabilities: ['result_aggregation', 'consensus_building', 'conflict_resolution'],
        metrics: { avgLatency: 67, throughput: 8.5, accuracy: 94, memoryUtilization: 45, toolUsageCount: 234, lastActivity: new Date() }
      }
    ],
    connections: [
      { id: 'c1', source: 'orchestrator', target: 'processor-1', type: 'control', animated: true },
      { id: 'c2', source: 'orchestrator', target: 'processor-2', type: 'control', animated: true },
      { id: 'c3', source: 'orchestrator', target: 'processor-3', type: 'control', animated: true },
      { id: 'c4', source: 'orchestrator', target: 'processor-4', type: 'control', style: { stroke: '#6c757d' } },
      { id: 'c5', source: 'processor-1', target: 'aggregator', type: 'data' },
      { id: 'c6', source: 'processor-2', target: 'aggregator', type: 'data' },
      { id: 'c7', source: 'processor-3', target: 'aggregator', type: 'data' },
      { id: 'c8', source: 'processor-4', target: 'aggregator', type: 'data', style: { stroke: '#6c757d', strokeDasharray: '5,5' } }
    ]
  }
};

// Mock Memory Data
export const generateMockMemoryData = () => ({
  vectorMemory: {
    totalVectors: 1247892,
    activeClusters: [
      {
        id: 'cluster-card-testing',
        name: 'Credit Card Testing Patterns',
        similarity: 92,
        memberCount: 1247,
        timeDecay: 2,
        lastAccess: new Date(Date.now() - 1000 * 60 * 15)
      },
      {
        id: 'cluster-money-laundering',
        name: 'Money Laundering Networks',
        similarity: 87,
        memberCount: 456,
        timeDecay: 1,
        lastAccess: new Date(Date.now() - 1000 * 60 * 5)
      },
      {
        id: 'cluster-account-takeover',
        name: 'Account Takeover Sequences',
        similarity: 78,
        memberCount: 234,
        timeDecay: 5,
        lastAccess: new Date(Date.now() - 1000 * 60 * 60)
      },
      {
        id: 'cluster-velocity-attacks',
        name: 'High Velocity Transaction Attacks',
        similarity: 84,
        memberCount: 789,
        timeDecay: 3,
        lastAccess: new Date(Date.now() - 1000 * 60 * 30)
      }
    ],
    searchLatency: 23,
    similarityThreshold: 0.75
  },
  graphMemory: {
    nodeCount: 12847,
    edgeCount: 45632,
    clustering: 0.73,
    connectedComponents: 234,
    networkRelationships: [
      { source: 'acc-4421-9987', target: 'merchant-sg-8834', type: 'transacted_with', strength: 0.89 },
      { source: 'merchant-sg-8834', target: 'shell-company-445', type: 'owned_by', strength: 0.95 },
      { source: 'shell-company-445', target: 'suspicious-network-12', type: 'connected_to', strength: 0.67 }
    ]
  }
});

// Performance Metrics Generator
export const generatePerformanceMetrics = () => ({
  avgLatency: Math.round(800 + Math.random() * 600), // 800-1400ms
  throughput: Math.round((2500 + Math.random() * 1000) * 10) / 10, // 2500-3500 decisions/hour
  accuracy: Math.round((92 + Math.random() * 6) * 10) / 10, // 92-98%
  falsePositiveRate: Math.round((2 + Math.random() * 3) * 10) / 10, // 2-5%
  fraudPrevented: Math.round((2.5 + Math.random() * 2) * 1000000), // $2.5-4.5M
  systemLoad: Math.round((60 + Math.random() * 30) * 10) / 10, // 60-90%
  memoryUtilization: Math.round((45 + Math.random() * 35) * 10) / 10, // 45-80%
  apiCallsPerSecond: Math.round(150 + Math.random() * 100), // 150-250
  timestamp: new Date()
});

// Timeline Data Generator
export const generateTimelineData = (scenario) => [
  {
    id: 'step-1',
    title: 'Transaction Received',
    description: 'Initial validation and data extraction completed',
    duration: 12,
    timestamp: new Date(Date.now() - 5000),
    status: 'completed',
    agent: 'system'
  },
  {
    id: 'step-2', 
    title: 'Rule Engine Processing',
    description: `${scenario.fraudIndicators.length} rules evaluated, ${scenario.fraudIndicators.filter(i => i.severity === 'high' || i.severity === 'critical').length} violations found`,
    duration: 78,
    timestamp: new Date(Date.now() - 4800),
    status: 'completed',
    agent: 'validator'
  },
  {
    id: 'step-3',
    title: 'MongoDB Vector Search',
    description: '1.2M vectors searched, 12 similar patterns found',
    duration: 234,
    timestamp: new Date(Date.now() - 4200),
    status: 'completed', 
    agent: 'analyzer'
  },
  {
    id: 'step-4',
    title: 'AI Agent Analysis',
    description: 'Deep pattern recognition and fraud assessment in progress',
    duration: 892,
    timestamp: new Date(Date.now() - 3000),
    status: 'processing',
    agent: 'investigator'
  },
  {
    id: 'step-5',
    title: `Decision: ${scenario.expectedOutcome.recommendation.toUpperCase()}`,
    description: `${scenario.expectedOutcome.confidence}% confidence • ${scenario.expectedOutcome.recommendation === 'investigate' ? 'Manual review required' : 'Automated decision'}`,
    duration: scenario.estimatedDuration * 1000,
    timestamp: new Date(),
    status: 'pending',
    agent: 'manager'
  }
];

// State Update Simulator
export class AgentStateSimulator {
  constructor(pattern, speed = 1) {
    this.pattern = pattern;
    this.speed = speed;
    this.intervalId = null;
    this.listeners = [];
  }

  start() {
    this.intervalId = setInterval(() => {
      this.updateAgentStates();
    }, 2000 / this.speed);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  updateAgentStates() {
    const updatedAgents = this.pattern.agents.map(agent => {
      if (agent.status === 'processing') {
        // Simulate confidence fluctuation
        const confidenceChange = (Math.random() - 0.5) * 10;
        const newConfidence = Math.max(50, Math.min(100, agent.confidence + confidenceChange));
        
        // Simulate status changes
        const statusChange = Math.random();
        let newStatus = agent.status;
        
        if (statusChange < 0.1) {
          newStatus = 'complete';
        } else if (statusChange < 0.15) {
          newStatus = 'backtracking';
        } else if (statusChange < 0.2) {
          newStatus = 'idle';
        }

        // Update metrics
        const updatedMetrics = {
          ...agent.metrics,
          avgLatency: agent.metrics.avgLatency + (Math.random() - 0.5) * 20,
          throughput: Math.max(0, agent.metrics.throughput + (Math.random() - 0.5) * 2),
          memoryUtilization: Math.max(0, Math.min(100, agent.metrics.memoryUtilization + (Math.random() - 0.5) * 10)),
          lastActivity: new Date()
        };

        return {
          ...agent,
          confidence: Math.round(newConfidence),
          status: newStatus,
          metrics: updatedMetrics
        };
      }
      return agent;
    });

    this.notifyListeners({ agents: updatedAgents });
  }

  subscribe(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(listener => listener !== callback);
    };
  }

  notifyListeners(data) {
    this.listeners.forEach(callback => callback(data));
  }
}

// Export utility functions
export const getScenarioById = (id) => fraudScenarios.find(scenario => scenario.id === id);
export const getPatternByName = (name) => orchestrationPatterns[name];
export const createMockAgent = (overrides = {}) => ({
  id: `agent-${Date.now()}`,
  type: 'analyzer',
  name: 'Mock Agent',
  description: 'Generated agent for testing',
  position: { x: 400, y: 200 },
  status: 'idle',
  confidence: 85,
  capabilities: ['mock_capability'],
  metrics: {
    avgLatency: 100,
    throughput: 10,
    accuracy: 90,
    memoryUtilization: 50,
    toolUsageCount: 0,
    lastActivity: new Date()
  },
  ...overrides
});