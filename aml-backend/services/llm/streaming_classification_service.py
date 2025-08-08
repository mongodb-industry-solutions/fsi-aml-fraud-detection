"""
Streaming Classification Service - Real-time LLM-powered entity analysis

Provides transparent, streaming classification of entities using AWS Bedrock with:
- Real-time prompt visibility
- Live AI response streaming  
- Comprehensive risk assessment
- Complete workflow transparency
"""

import json
import re
import asyncio
import time
import logging
from datetime import datetime
from typing import Dict, Any, Optional, AsyncGenerator
from bedrock.client import BedrockClient

logger = logging.getLogger(__name__)


class StreamingClassificationService:
    """
    Streaming LLM classification service with full transparency
    
    Replaces synchronous classification with real-time streaming that provides:
    - Prompt transparency for user trust
    - Live AI response streaming (like ChatGPT)
    - Structured final results
    - Complete error visibility
    """
    
    def __init__(self, bedrock_client: Optional[BedrockClient] = None):
        """Initialize streaming classification service"""
        self.bedrock_client = bedrock_client or BedrockClient()
        self.supported_models = {
            'claude-3-sonnet': 'anthropic.claude-3-sonnet-20240229-v1:0',
            'claude-3-haiku': 'anthropic.claude-3-haiku-20240307-v1:0'
        }
        logger.info("StreamingClassificationService initialized for transparent AI classification")
    
    async def classify_entity_stream(self, workflow_data: Dict[str, Any], 
                                   model_preference: str = 'claude-3-sonnet',
                                   analysis_depth: str = 'comprehensive') -> AsyncGenerator[str, None]:
        """
        Stream entity classification with real-time updates
        
        Args:
            workflow_data: Complete workflow data from entity resolution steps 0-2
            model_preference: AWS Bedrock model to use
            analysis_depth: Level of analysis (basic, standard, comprehensive)
            
        Yields:
            Server-Sent Event formatted strings with real-time updates
        """
        start_time = time.time()
        
        try:
            # Phase 1: Generate and send prompt for transparency
            logger.info("Phase 1: Generating classification prompt for transparency")
            prompt = self._build_classification_prompt(workflow_data, analysis_depth)
            
            yield self._create_event('prompt_ready', {
                'prompt': prompt,
                'step': 'prompt_generation',
                'message': 'Classification prompt generated - full transparency enabled',
                'analysis_depth': analysis_depth,
                'model': model_preference,
                'prompt_length': len(prompt),
                'workflow_components': list(workflow_data.keys())
            })
            
            # Brief pause for UI to display prompt
            await asyncio.sleep(0.5)
            
            # Phase 2: Initialize streaming connection to AWS Bedrock
            logger.info("Phase 2: Connecting to AWS Bedrock for streaming analysis")
            bedrock_runtime = self.bedrock_client._get_bedrock_client(runtime=True)
            model_id = self.supported_models.get(model_preference)
            
            if not model_id:
                raise ValueError(f"Unsupported model: {model_preference}")
            
            request_body = {
                "anthropic_version": "bedrock-2023-05-31",
                "max_tokens": 4000,
                "temperature": 0.1,
                "messages": [{"role": "user", "content": prompt}]
            }
            
            # Use AWS Bedrock streaming API
            response = bedrock_runtime.invoke_model_with_response_stream(
                modelId=model_id,
                body=json.dumps(request_body),
                contentType="application/json"
            )
            
            yield self._create_event('llm_start', {
                'message': f'AWS Bedrock {model_preference} streaming analysis started',
                'model': model_id,
                'streaming': True,
                'request_tokens': len(prompt.split())  # Approximate token count
            })
            
            # Phase 3: Stream AI response chunks in real-time
            logger.info("Phase 3: Streaming AI response chunks in real-time")
            full_response = ""
            chunk_count = 0
            last_chunk_time = time.time()
            
            for event in response['body']:
                if 'chunk' in event:
                    chunk_data = json.loads(event['chunk']['bytes'].decode())
                    
                    if chunk_data['type'] == 'content_block_delta':
                        text_chunk = chunk_data['delta']['text']
                        full_response += text_chunk
                        chunk_count += 1
                        current_time = time.time()
                        
                        # Calculate streaming metrics
                        chunk_latency = current_time - last_chunk_time
                        estimated_completion = min(95, (len(full_response) / 3500) * 100)
                        
                        # Stream chunk to frontend with metrics
                        yield self._create_event('llm_chunk', {
                            'chunk': text_chunk,
                            'chunk_count': chunk_count,
                            'current_length': len(full_response),
                            'estimated_completion': estimated_completion,
                            'chunk_latency_ms': round(chunk_latency * 1000, 2),
                            'streaming_speed': 'real-time'
                        })
                        
                        last_chunk_time = current_time
                        
                        # Small delay to prevent overwhelming frontend
                        await asyncio.sleep(0.02)
            
            # Phase 4: Process and structure the complete AI response
            logger.info("Phase 4: Processing complete AI response into structured format")
            processing_start = time.time()
            
            yield self._create_event('processing_start', {
                'message': 'Processing complete AI response and extracting structured classification data',
                'total_chunks': chunk_count,
                'response_length': len(full_response),
                'raw_response_preview': full_response[:300] + "..." if len(full_response) > 300 else full_response,
                'streaming_complete': True
            })
            
            # Parse and structure the LLM response
            structured_result = self._parse_classification_response(full_response, workflow_data)
            
            # Validate result structure
            self._validate_classification_result(structured_result)
            
            processing_time = time.time() - processing_start
            
            # Phase 5: Send final structured result
            total_time = time.time() - start_time
            logger.info(f"Streaming classification completed successfully in {total_time:.2f}s")
            
            yield self._create_event('classification_complete', {
                'result': structured_result,
                'processing_complete': True,
                'total_time_seconds': round(total_time, 2),
                'processing_time_seconds': round(processing_time, 2),
                'streaming_time_seconds': round(total_time - processing_time, 2),
                'total_chunks': chunk_count,
                'response_length': len(full_response),
                'success': True,
                'performance_metrics': {
                    'avg_chunk_size': len(full_response) // chunk_count if chunk_count > 0 else 0,
                    'streaming_efficiency': 'optimal'
                }
            })
            
        except Exception as e:
            logger.error(f"Streaming classification error: {e}", exc_info=True)
            yield self._create_event('error', {
                'error_message': str(e),
                'error_type': type(e).__name__,
                'error_phase': 'streaming_classification',
                'timestamp': datetime.utcnow().isoformat(),
                'total_time_before_error': round(time.time() - start_time, 2)
            })
    
    def _create_event(self, event_type: str, data: Dict[str, Any]) -> str:
        """Create Server-Sent Event format for streaming"""
        event_data = {
            'type': event_type,
            'timestamp': datetime.utcnow().isoformat(),
            'data': data
        }
        return f"data: {json.dumps(event_data)}\n\n"
    
    def _build_classification_prompt(self, workflow_data: Dict[str, Any], analysis_depth: str) -> str:
        """Build comprehensive classification prompt with full transparency"""
        # Extract workflow components
        entity_input = workflow_data.get('entityInput', {})
        search_results = workflow_data.get('searchResults', {})
        network_analysis = workflow_data.get('networkAnalysis', {})
        
        # Build prompt based on analysis depth
        if analysis_depth == 'comprehensive':
            return self._build_comprehensive_prompt(entity_input, search_results, network_analysis)
        elif analysis_depth == 'standard':
            return self._build_standard_prompt(entity_input, search_results, network_analysis)
        else:  # basic
            return self._build_basic_prompt(entity_input, search_results)
    
    def _build_comprehensive_prompt(self, entity_input: dict, search_results: dict, network_analysis: dict) -> str:
        """Build comprehensive analysis prompt with complete workflow data"""
        
        # Entity information
        entity_name = entity_input.get('fullName', 'Unknown Entity')
        entity_type = entity_input.get('entityType', 'unknown')
        entity_address = entity_input.get('address', 'Address not provided')
        
        # Search results analysis
        atlas_count = len(search_results.get('atlasResults', []))
        vector_count = len(search_results.get('vectorResults', []))
        hybrid_count = len(search_results.get('hybridResults', []))
        
        # Network analysis data
        entities_analyzed = network_analysis.get('entitiesAnalyzed', 0)
        entity_analyses = network_analysis.get('entityAnalyses', [])
        analysis_type = network_analysis.get('analysisType', 'unknown')
        
        prompt = f"""You are an expert AML/KYC compliance analyst with specialized knowledge in financial crime detection, regulatory compliance, and risk assessment. Analyze the following comprehensive entity resolution workflow data to provide detailed risk classification.

=== ENTITY INFORMATION ===
Entity Name: {entity_name}
Entity Type: {entity_type}
Primary Address: {entity_address}
Resolution Context: New entity onboarding with duplicate detection

=== SEARCH RESULTS ANALYSIS ===
MongoDB Atlas Search Results: {atlas_count} potential text-based matches found
Vector Similarity Search Results: {vector_count} semantic similarity matches identified
Hybrid Search Results ($rankFusion): {hybrid_count} combined weighted matches

=== NETWORK ANALYSIS RESULTS ===
Analysis Type: {analysis_type}
Total Entities Analyzed: {entities_analyzed}
Network Depth: 2-degree relationship traversal + 1-degree transaction analysis

"""
        
        # Add detailed entity analysis for top matches
        if entity_analyses and len(entity_analyses) > 0:
            prompt += "=== COMPREHENSIVE ENTITY INTELLIGENCE ANALYSIS ===\n"
            for i, entity in enumerate(entity_analyses[:3]):  # Top 3 entities
                base_entity = entity.get('baseEntity', {})
                relationship_nodes = len(entity.get('relationshipNetwork', {}).get('nodes', []))
                relationship_edges = len(entity.get('relationshipNetwork', {}).get('edges', []))
                
                prompt += f"""
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TOP MATCH {i+1} - COMPREHENSIVE ENTITY INTELLIGENCE PROFILE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔍 SEARCH & MATCHING ANALYSIS:
• Entity ID: {entity.get('entityId', 'unknown')}
• Entity Name: {entity.get('entityName', 'unknown')}  
• Search Ranking: #{i+1} of {len(entity_analyses)} potential matches (Hybrid Score: {entity.get('hybridScore', 0):.4f})
• Match Confidence: {'High' if i == 0 else 'Medium' if i == 1 else 'Lower'} - Rank #{i+1} indicates {'strong potential match' if i == 0 else 'possible match requiring verification' if i == 1 else 'weaker correlation'}
• Text Contribution: {entity.get('textContribution', 0)}% | Vector Contribution: {entity.get('vectorContribution', 0)}%

📋 CORE ENTITY PROFILE:
• Full Name: {base_entity.get('name', {}).get('full', 'Unknown') if isinstance(base_entity.get('name'), dict) else base_entity.get('name', 'Unknown')}
• Entity Type: {base_entity.get('entityType', 'Unknown')}
• Date of Birth: {base_entity.get('dateOfBirth', 'Not provided')}"""
                
                # Add aliases if available
                name_data = base_entity.get('name', {})
                if isinstance(name_data, dict) and name_data.get('aliases'):
                    aliases = name_data.get('aliases', [])
                    prompt += f"\n• Known Aliases: {', '.join(aliases[:5])}" + (f" (+{len(aliases)-5} more)" if len(aliases) > 5 else "")
                
                # Add address information
                addresses = base_entity.get('addresses', [])
                if addresses:
                    prompt += "\n\n🏠 ADDRESS:"
                    for j, addr in enumerate(addresses[:3]):  # Top 3 addresses
                        addr_full = addr.get('full', 'Address not formatted')
                        addr_type = addr.get('type', 'Unknown')
                        verification = addr.get('verified', False)
                        verification_status = "✓ Verified" if verification else "⚠ Unverified"
                        prompt += f"\n• Address {j+1}: {addr_full} ({addr_type}) - {verification_status}"
                
                # Add risk assessment details
                risk_assessment = base_entity.get('riskAssessment', {})
                if risk_assessment:
                    overall_risk = risk_assessment.get('overall', {})
                    risk_factors = risk_assessment.get('factors', {})
                    
                    prompt += "\n\n⚠️ RISK ASSESSMENT BREAKDOWN:"
                    prompt += f"\n• Overall Risk Score: {overall_risk.get('score', 0)}/100"
                    prompt += f"\n• Risk Level: {overall_risk.get('level', 'Unknown').upper()}"
                    
                    
                    risk_reasoning = risk_assessment.get('reasoning')
                    if risk_reasoning:
                        prompt += f"\n• Risk Justification: {risk_reasoning}"
                
                # Add watchlist matches  
                watchlist_matches = base_entity.get('watchlistMatches', [])
                if watchlist_matches:
                    prompt += "\n\n🚨 WATCHLIST & COMPLIANCE SCREENING:"
                    for match in watchlist_matches[:5]:  # Top 5 matches
                        match_type = match.get('match_type', 'Unknown').upper()
                        match_score = match.get('match_score', 0)
                        match_details = match.get('match_details', 'No details')
                        prompt += f"\n• {match_type} Match: {match_score:.2f} confidence - {match_details} (Source: {match_source})"
                else:
                    prompt += "\n\n🚨 WATCHLIST & COMPLIANCE SCREENING:\n• No watchlist matches found - Clean screening result"
                
                # Add contact information
                contact_info = base_entity.get('contactInfo', [])
                if contact_info:
                    prompt += "\n\n📞 CONTACT VERIFICATION:"
                    for contact in contact_info[:3]:  # Top 3 contacts
                        contact_type = contact.get('type', 'Unknown')
                        contact_value = contact.get('value', 'Not provided')  
                        is_primary = contact.get('primary', False)
                        is_verified = contact.get('verified', False)
                        primary_flag = " (Primary)" if is_primary else ""
                        verification_status = "✓ Verified" if is_verified else "⚠ Unverified"
                        prompt += f"\n• {contact_type}: {contact_value}{primary_flag} - {verification_status}"
                
                # Add comprehensive network intelligence (available from workflow networkAnalysis)
                relationship_network = entity.get('relationshipNetwork', {})
                transaction_network = entity.get('transactionNetwork', {})
                
                prompt += f"\n\n🕸️ COMPREHENSIVE NETWORK INTELLIGENCE:"
                prompt += f"\n• Network Risk Score: {entity.get('networkRiskScore', 0)}/100"
                prompt += f"\n• Transaction Risk Score: {entity.get('transactionRiskScore', 0)}/100"
                prompt += f"\n• Connection Summary: {relationship_nodes} related entities with {relationship_edges} relationships identified"
                
                # Add relationship network analysis
                if relationship_network and isinstance(relationship_network, dict):
                    network_stats = relationship_network.get('statistics', {})
                    network_nodes = relationship_network.get('nodes', [])
                    network_edges = relationship_network.get('edges', [])
                    
                    prompt += f"\n\n🔗 RELATIONSHIP NETWORK ANALYSIS:"
                    prompt += f"\n• Total Network Nodes: {len(network_nodes)}"
                    prompt += f"\n• Total Network Edges: {len(network_edges)}"
                    
                    # Add network statistics if available
                    if network_stats:
                        basic_metrics = network_stats.get('basic_metrics', {})
                        prompt += f"\n• Network Depth: {basic_metrics.get('max_depth', 'Unknown')}"
                        prompt += f"\n• Average Risk Score: {basic_metrics.get('avg_risk_score', 0):.1f}/100"
                        prompt += f"\n• High-Risk Connections: {basic_metrics.get('high_risk_count', 0)}"
                    
                    # Add high-risk connected entities (top 5)
                    high_risk_entities = [node for node in network_nodes if node.get('riskLevel') in ['high', 'critical']]
                    if high_risk_entities:
                        prompt += f"\n• High-Risk Connected Entities ({len(high_risk_entities)} total):"
                        for risk_entity in high_risk_entities[:5]:  # Top 5
                            entity_name = risk_entity.get('name', risk_entity.get('id', 'Unknown'))
                            entity_risk = risk_entity.get('riskLevel', 'unknown')
                            entity_type = risk_entity.get('type', 'unknown')
                            prompt += f"\n  - {entity_name} ({entity_type}) - Risk: {entity_risk.upper()}"
                        if len(high_risk_entities) > 5:
                            prompt += f"\n  - (+{len(high_risk_entities) - 5} more high-risk connections)"
                    
                    # Add relationship type distribution (from statistics.relationship_distribution)
                    relationship_distribution = network_stats.get('relationship_distribution', [])
                    if relationship_distribution:
                        prompt += f"\n• Relationship Type Distribution:"
                        for rel in relationship_distribution[:10]:  # Top 5 relationship types
                            rel_type = rel.get('type', 'unknown').replace('_', ' ').title()
                            rel_count = rel.get('count', 0)
                            rel_confidence = rel.get('avg_confidence', 0)   
                            rel_verified = rel.get('verified_count', 0)
                            rel_bidirectional = rel.get('bidirectional_count', 0)
                            
                            prompt += f"\n  - {rel_type}: {rel_count} connections"
                            prompt += f" (Avg Confidence: {rel_confidence:.1f}%, Verified: {rel_verified}, Bidirectional: {rel_bidirectional})"
                
                # Add transaction network analysis (correct structure)
                if transaction_network and isinstance(transaction_network, dict):
                    # Use correct property names from TransactionNetwork model
                    total_transactions = transaction_network.get('total_transactions', 0)
                    total_volume = transaction_network.get('total_volume', 0)
                    nodes = transaction_network.get('nodes', [])
                    edges = transaction_network.get('edges', [])
                    center_entity_transaction_count = transaction_network.get('center_entity_transaction_count', 0)
                    center_entity_volume = transaction_network.get('center_entity_volume', 0)
                    
                    prompt += f"\n\n💰 TRANSACTION NETWORK ANALYSIS:"
                    prompt += f"\n• Total Network Transactions: {total_transactions:,}"
                    prompt += f"\n• Total Network Volume: ${total_volume:,.2f}" if total_volume > 0 else f"\n• Total Network Volume: ${total_volume}"
                    prompt += f"\n• Direct Entity Transactions: {center_entity_transaction_count:,}"
                    prompt += f"\n• Direct Entity Volume: ${center_entity_volume:,.2f}" if center_entity_volume > 0 else f"\n• Direct Entity Volume: ${center_entity_volume}"
                    prompt += f"\n• Network Entities: {len(nodes)} connected entities"
                    prompt += f"\n• Transaction Flows: {len(edges)} unique flows"
                    
                    # Add node-level transaction analysis
                    if nodes:
                        high_volume_nodes = [node for node in nodes 
                                           if (node.get('total_sent', 0) + node.get('total_received', 0)) > 10000]
                        high_risk_nodes = [node for node in nodes if node.get('avg_risk_score', 0) > 60]
                        
                        prompt += f"\n• High-Volume Entities: {len(high_volume_nodes)} entities with >$10K transactions"
                        prompt += f"\n• High-Risk Transaction Entities: {len(high_risk_nodes)} entities with >60 risk score"
                        
                        # Show top 3 high-volume entities
                        sorted_nodes = sorted(nodes, key=lambda x: x.get('total_sent', 0) + x.get('total_received', 0), reverse=True)
                        for i, node in enumerate(sorted_nodes[:3]):
                            entity_name = node.get('entity_name', node.get('entity_id', 'Unknown'))
                            total_node_volume = node.get('total_sent', 0) + node.get('total_received', 0)
                            tx_count = node.get('transaction_count', 0)
                            avg_risk = node.get('avg_risk_score', 0)
                            prompt += f"\n  - {entity_name}: ${total_node_volume:,.2f} volume, {tx_count} transactions, {avg_risk:.1f} avg risk"
                    
                    # Add edge-level flow analysis
                    if edges:
                        high_value_flows = [edge for edge in edges if edge.get('total_amount', 0) > 50000]
                        high_risk_flows = [edge for edge in edges if edge.get('avg_risk_score', 0) > 70]
                        
                        prompt += f"\n• High-Value Flows: {len(high_value_flows)} flows >$50K"
                        prompt += f"\n• High-Risk Flows: {len(high_risk_flows)} flows >70 risk score"
                        
                        # Calculate average transaction size across all flows
                        if edges:
                            total_flow_amount = sum(edge.get('total_amount', 0) for edge in edges)
                            total_flow_count = sum(edge.get('transaction_count', 0) for edge in edges)
                            if total_flow_count > 0:
                                avg_transaction_size = total_flow_amount / total_flow_count
                                prompt += f"\n• Average Transaction Size: ${avg_transaction_size:,.2f}"
                
                # Add network positioning analysis with comprehensive data
                prompt += f"\n\n📍 NETWORK POSITIONING & INFLUENCE:"
                
                # Always provide basic network positioning information
                if relationship_network and isinstance(relationship_network, dict):
                    network_nodes = relationship_network.get('nodes', [])
                    network_edges = relationship_network.get('edges', [])
                    
                    # Basic network metrics
                    total_connections = len(network_edges)
                    total_entities = len(network_nodes)
                    
                    prompt += f"\n• Network Size: {total_entities} connected entities with {total_connections} relationships"
                    
                    # Use centrality metrics if available, otherwise provide basic analysis
                    centrality_metrics = relationship_network.get('centralityMetrics', {}) if relationship_network else {}
                    if centrality_metrics and any(centrality_metrics.values()):
                        prompt += f"\n• Degree Centrality: {centrality_metrics.get('degree_centrality', 0):.3f} (Network connectivity)"
                        prompt += f"\n• Betweenness Centrality: {centrality_metrics.get('betweenness_centrality', 0):.3f} (Bridge influence)"
                        prompt += f"\n• Closeness Centrality: {centrality_metrics.get('closeness_centrality', 0):.3f} (Network accessibility)"
                        
                        # Determine network role based on centrality
                        degree_cent = centrality_metrics.get('degree_centrality', 0)
                        betweenness_cent = centrality_metrics.get('betweenness_centrality', 0)
                        
                        if degree_cent > 0.3 and betweenness_cent > 0.3:
                            network_role = "Central Hub (High influence and connectivity)"
                        elif betweenness_cent > 0.2:
                            network_role = "Bridge Entity (Connects different groups)"
                        elif degree_cent > 0.2:
                            network_role = "Well-Connected Node (Multiple relationships)"
                        else:
                            network_role = "Peripheral Entity (Limited connections)"
                        
                        prompt += f"\n• Network Role: {network_role}"
                    else:
                        # Provide basic analysis when centrality metrics aren't available
                        if total_connections > 10:
                            network_role = "Highly Connected Entity (10+ direct relationships)"
                        elif total_connections > 5:
                            network_role = "Well Connected Entity (5+ direct relationships)"
                        elif total_connections > 2:
                            network_role = "Moderately Connected Entity (2+ direct relationships)"
                        else:
                            network_role = "Minimally Connected Entity (Limited relationships)"
                        
                        prompt += f"\n• Network Role: {network_role} based on {total_connections} direct connections"
                    
                    # Add connection quality assessment
                    verified_count = sum(1 for edge in network_edges if edge.get('verified', False))
                    if total_connections > 0:
                        verification_rate = (verified_count / total_connections) * 100
                        prompt += f"\n• Connection Verification Rate: {verification_rate:.1f}% ({verified_count}/{total_connections} verified)"
                else:
                    prompt += f"\n• Network analysis data not available - entity appears to have limited relationship data"
                
                prompt += "\n"
        
        # Analysis requirements with comprehensive structure
        prompt += """
=== ADVANCED FINANCIAL INTELLIGENCE ANALYSIS REQUIRED ===

Using the comprehensive entity intelligence data provided above, perform sophisticated risk assessment with specific evidence-based analysis:

1. **MULTI-ENTITY COMPARATIVE RISK ANALYSIS**
   • Compare and contrast the risk profiles of the top 3 matched entities with specific data points
   • Focus on RANKING significance: Entity #1 vs #2 vs #3 - why is rank #1 the strongest match regardless of absolute score?
   • Assess match quality based on POSITION in results rather than raw hybrid scores
   • Identify patterns in relationship structures between the ranked matches
   • Compare transaction network behaviors across the ranked entities
   • Cross-reference individual risk scores against network transaction volumes - identify anomalies

2. **TRANSACTION PATTERN INTELLIGENCE ANALYSIS**
   • Analyze transaction volume vs individual risk score contradictions (e.g., low 21/100 risk but $107M volume)
   • Assess average transaction sizes: $95K, $88K, $41K - what business patterns do these suggest?
   • Evaluate high-value flow concentrations: 150, 143, 37 flows >$50K respectively
   • Identify suspicious patterns: why minimal direct entity transactions (5-7) vs massive network volumes?
   • Analyze connected entity transaction behaviors and risk propagation patterns
   • Assess transaction network centrality vs stated business purposes

3. **RELATIONSHIP STRUCTURE RISK ASSESSMENT**
   • Analyze relationship type distributions for business legitimacy:
     * Entity 1: Heavy "Supplier Of", "Trustee For" patterns - corporate supply chain or shell structure?
     * Entity 2: Multiple "Financial Link Suspected", "Financial Beneficiary Suspected" - red flags?
     * Entity 3: "Financial Link Suspected", UBO relationships - beneficial ownership concerns?
   • Evaluate confidence levels: why consistently low 1.0% confidence across relationships?
   • Assess verification rates against relationship types - identify verification gaps
   • Analyze bidirectional vs directed relationship patterns for control structures
   • Identify potential layering or shell company indicators from relationship networks

4. **BUSINESS LEGITIMACY vs NETWORK BEHAVIOR ANALYSIS**
   • Assess if stated entity purposes align with observed transaction patterns
   • Analyze network positioning vs claimed business activities
   • Evaluate if relationship types match expected business structures
   • Identify potential structuring or layering through network analysis
   • Assess if transaction volumes are proportionate to stated business scale
   • Compare direct entity transactions vs network involvement ratios

5. **SEARCH INTELLIGENCE & DUPLICATE RISK EVALUATION**
   • Analyze hybrid search confidence levels: all entities <0.035 - insufficient for high-confidence matching?
   • Evaluate text vs vector contribution balance implications for entity similarity
   • Assess match quality: similar names ("Global Trading...") suggest potential shell network?
   • Identify naming pattern concerns: systematic naming similarities across matches
   • Evaluate if low search scores indicate new entity vs sophisticated name variation

6. **RED FLAG DETECTION & REGULATORY CONCERN IDENTIFICATION**
   Using specific data points from the intelligence profiles, identify:
   • Transaction structuring patterns (small direct volumes, massive network involvement)
   • Shell company indicators (complex relationship networks, minimal direct activity)
   • Layering schemes (multiple intermediary entities in transaction flows)
   • Beneficial ownership obfuscation (UBO relationships, trustee structures)
   • Trade-based money laundering signs (supplier relationships with high transaction volumes)
   • Dormant entity activation (low individual risk but high network connectivity)

7. **DATA-DRIVEN RISK SCORING & EVIDENCE COMPILATION**
   • Weight individual entity scores (15-24/100) against network transaction evidence ($35M-$107M)
   • Factor relationship verification gaps (low confidence scores) into overall risk assessment
   • Consider search score clustering (<0.035) as potential systematic risk indicator
   • Evaluate transaction size patterns against typical business behaviors
   • Assess network centrality metrics against AML risk indicators
   • Compile specific numerical evidence supporting final risk classification

=== REQUIRED JSON RESPONSE FORMAT ===

Provide your complete analysis in this exact JSON structure (ALL fields required):

{{
  "overall_risk_level": "high",
  "risk_score": 75,
  "confidence_score": 85,
  "confidence_level": "high",
  "recommended_action": "enhanced_due_diligence",
  "aml_kyc_flags": {{
    "sanctions_match": false,
    "pep_match": false,
    "high_risk_jurisdiction": false,
    "complex_structure": true,
    "inconsistent_information": false,
    "identity_verification_gaps": true,
    "additional_flags": ["flag1", "flag2"]
  }},
  "network_classification": "hub",
  "key_risk_factors": [
    "Detailed primary risk factor with specific evidence",
    "Secondary risk factor with supporting data",
    "Additional risk consideration"
  ],
  "detailed_analysis": {{
    "entity_profile_assessment": "Comprehensive entity profile evaluation with specific findings and concerns...",
    "search_results_analysis": "Detailed analysis of search match quality, relevance, and cross-method validation...",
    "network_positioning_analysis": "In-depth network role analysis, influence assessment, and risk propagation evaluation...",
    "data_quality_assessment": "Complete data quality evaluation including gaps, inconsistencies, and reliability factors..."
  }},
  "recommendations": [
    "Specific actionable recommendation 1 with clear implementation guidance",
    "Detailed recommendation 2 with timeline and responsible party",
    "Additional recommendation 3 with success criteria"
  ],
  "classification_model": "streaming_claude_3_sonnet_comprehensive",
  "classification_timestamp": "{datetime.utcnow().isoformat()}"
}}

Ensure all analysis is evidence-based, specific, and actionable for AML/KYC compliance purposes."""

        return prompt
    
    def _build_standard_prompt(self, entity_input: dict, search_results: dict, network_analysis: dict) -> str:
        """Build standard analysis prompt (simplified version)"""
        entity_name = entity_input.get('fullName', 'Unknown')
        entity_type = entity_input.get('entityType', 'unknown')
        
        return f"""Analyze this entity for AML/KYC risk assessment:

ENTITY: {entity_name} ({entity_type})
SEARCH MATCHES: {len(search_results.get('hybridResults', []))} hybrid results
NETWORK ANALYSIS: {network_analysis.get('entitiesAnalyzed', 0)} entities analyzed

Provide risk assessment in JSON format with: overall_risk_level, risk_score, confidence_score, recommended_action, key_risk_factors, and recommendations."""
    
    def _build_basic_prompt(self, entity_input: dict, search_results: dict) -> str:
        """Build basic analysis prompt (minimal version)"""
        entity_name = entity_input.get('fullName', 'Unknown')
        
        return f"""Basic risk assessment for: {entity_name}
Search results: {len(search_results.get('hybridResults', []))} matches found.
Provide JSON with: risk_level, risk_score, recommended_action."""
    
    def _parse_classification_response(self, response_text: str, workflow_data: dict) -> dict:
        """Parse and structure LLM response into classification result with robust error handling"""
        try:
            logger.info(f"Attempting to parse classification response of {len(response_text)} characters")
            
            # Extract JSON from response
            json_text = self._extract_json_from_response(response_text)
            
            if not json_text:
                raise ValueError("No valid JSON structure found in LLM response")
            
            logger.debug(f"Extracted JSON text: {len(json_text)} characters")
            
            # Clean JSON text
            json_text = json_text.strip()
            
            # Remove any trailing comma before closing brace or bracket (common LLM error)
            json_text = re.sub(r',(\s*[}\]])', r'\1', json_text)
            
            # Parse the JSON response
            parsed_result = json.loads(json_text)
            
            # Validate and structure the result with comprehensive defaults
            structured_result = self._structure_classification_result(parsed_result, response_text)
            
            logger.info(f"Successfully parsed classification response: {structured_result['overall_risk_level']} risk")
            return structured_result
            
        except json.JSONDecodeError as e:
            logger.error(f"JSON parsing error at position {e.pos}: {e.msg}")
            if 'json_text' in locals():
                logger.error(f"Extracted JSON text: {repr(json_text[:500])}")
                logger.debug(f"Problematic JSON excerpt around position {e.pos}: {repr(json_text[max(0, e.pos-50):e.pos+50])}")
            else:
                logger.error("Failed to extract JSON from response")
                logger.debug(f"Raw response preview: {repr(response_text[:500])}")
            return self._create_fallback_result(workflow_data, f"JSON parsing error: {str(e)}")
        except Exception as e:
            logger.error(f"Error parsing classification response: {e}")
            logger.debug(f"Response text preview: {response_text[:500]}...")
            return self._create_fallback_result(workflow_data, str(e))
    
    def _extract_json_from_response(self, response_text: str) -> str:
        """Extract JSON from response text - simplified approach"""
        # First, handle template-style double braces if present
        if '{{' in response_text:
            logger.debug("Found template-style double braces, converting to single braces")
            response_text = response_text.replace('{{', '{').replace('}}', '}')
        
        # Simple approach: Find JSON from first { to last }
        json_start = response_text.find('{')
        json_end = response_text.rfind('}')
        
        if json_start != -1 and json_end != -1 and json_end > json_start:
            return response_text[json_start:json_end + 1]
        
        return None
    
    def _structure_classification_result(self, parsed_result: dict, response_text: str) -> dict:
        """Structure and validate the parsed classification result"""
        # Helper function to safely convert to float
        def safe_float(value, default=0.0):
            try:
                return float(value) if value is not None else default
            except (ValueError, TypeError):
                return default
        
        # Helper function to safely get list
        def safe_list(value, default=None):
            if default is None:
                default = []
            return value if isinstance(value, list) else default
        
        # Helper function to safely get dict
        def safe_dict(value, default=None):
            if default is None:
                default = {}
            return value if isinstance(value, dict) else default
        
        structured_result = {
            'overall_risk_level': parsed_result.get('overall_risk_level', 'medium'),
            'risk_score': safe_float(parsed_result.get('risk_score'), 50),
            'confidence_score': safe_float(parsed_result.get('confidence_score'), 70),
            'confidence_level': parsed_result.get('confidence_level', 'medium'),
            'recommended_action': parsed_result.get('recommended_action', 'enhanced_due_diligence'),
            'aml_kyc_flags': safe_dict(parsed_result.get('aml_kyc_flags')),
            'network_classification': parsed_result.get('network_classification', 'unknown'),
            'key_risk_factors': safe_list(parsed_result.get('key_risk_factors')),
            'detailed_analysis': safe_dict(parsed_result.get('detailed_analysis')),
            'recommendations': safe_list(parsed_result.get('recommendations')),
            'classification_model': 'streaming_claude_3_sonnet_v1.0',
            'classification_timestamp': datetime.utcnow().isoformat(),
            'streaming_enabled': True,
            'parsing_successful': True,
            'response_length': len(response_text),
            'raw_response_preview': response_text[:1000] + '...' if len(response_text) > 1000 else response_text
        }
        
        # Validate risk score bounds
        if not 0 <= structured_result['risk_score'] <= 100:
            structured_result['risk_score'] = max(0, min(100, structured_result['risk_score']))
        
        # Validate confidence score bounds  
        if not 0 <= structured_result['confidence_score'] <= 100:
            structured_result['confidence_score'] = max(0, min(100, structured_result['confidence_score']))
        
        return structured_result
    
    def _create_fallback_result(self, workflow_data: dict, error_message: str) -> dict:
        """Create fallback classification result when AI parsing fails"""
        entity_input = workflow_data.get('entityInput', {})
        entity_name = entity_input.get('fullName', 'Unknown Entity')
        
        logger.warning(f"Using fallback classification result for {entity_name}: {error_message}")
        
        return {
            'overall_risk_level': 'medium',
            'risk_score': 50,
            'confidence_score': 30,
            'confidence_level': 'low',
            'recommended_action': 'enhanced_due_diligence',
            'aml_kyc_flags': {
                'parsing_error': True,
                'manual_review_required': True
            },
            'network_classification': 'unknown',
            'key_risk_factors': [
                'AI response parsing failed - manual review required',
                'Unable to process LLM classification automatically'
            ],
            'detailed_analysis': {
                'parsing_error': error_message,
                'fallback_used': True,
                'recommendation': 'Manual review required due to AI processing error'
            },
            'recommendations': [
                'Conduct manual risk assessment review',
                'Verify entity information through alternative methods',
                'Consider system maintenance or prompt optimization'
            ],
            'classification_model': 'fallback_classification_v1.0',
            'classification_timestamp': datetime.utcnow().isoformat(),
            'streaming_enabled': True,
            'parsing_successful': False,
            'error_details': error_message
        }
    
    def _validate_classification_result(self, result: dict):
        """Validate classification result structure and data integrity"""
        required_fields = [
            'overall_risk_level', 'risk_score', 'confidence_score', 
            'recommended_action', 'classification_timestamp'
        ]
        
        # Check required fields
        for field in required_fields:
            if field not in result:
                raise ValueError(f"Missing required field in classification result: {field}")
        
        # Validate score ranges
        risk_score = result['risk_score']
        if not isinstance(risk_score, (int, float)) or not 0 <= risk_score <= 100:
            raise ValueError(f"Risk score must be numeric 0-100, got: {risk_score}")
        
        confidence_score = result['confidence_score']  
        if not isinstance(confidence_score, (int, float)) or not 0 <= confidence_score <= 100:
            raise ValueError(f"Confidence score must be numeric 0-100, got: {confidence_score}")
        
        # Validate risk level consistency
        risk_level = result['overall_risk_level'].lower()
        if risk_score >= 80 and risk_level not in ['critical', 'high']:
            logger.warning(f"Risk level inconsistency: score {risk_score} but level {risk_level}")
        
        logger.info("Classification result validation passed")


# Service instance management
_streaming_service_instance = None


def get_streaming_classification_service(bedrock_client: Optional[BedrockClient] = None) -> StreamingClassificationService:
    """Get or create streaming classification service instance"""
    global _streaming_service_instance
    
    if _streaming_service_instance is None:
        _streaming_service_instance = StreamingClassificationService(bedrock_client)
        logger.info("Created new StreamingClassificationService instance")
    
    return _streaming_service_instance