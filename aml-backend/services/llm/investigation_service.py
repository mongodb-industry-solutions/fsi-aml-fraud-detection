"""
Investigation Service - Simple case investigation creation

Creates case investigation documents using existing workflow data
and generates basic LLM investigation summaries.
"""

import json
import logging
from typing import Dict, Any, Optional
from datetime import datetime

from bedrock.client import BedrockClient

logger = logging.getLogger(__name__)


class InvestigationService:
    """
    Simple investigation service for case document creation
    
    Uses existing workflow data to create MongoDB case documents
    with LLM-generated investigation summaries.
    """
    
    def __init__(self, bedrock_client: Optional[BedrockClient] = None):
        """Initialize investigation service"""
        self.bedrock_client = bedrock_client or BedrockClient()
        logger.info("InvestigationService initialized for simple case investigation")
    
    async def create_case_investigation(self, workflow_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Create case investigation using existing workflow data
        
        Args:
            workflow_data: Complete workflow data from steps 0-3
            
        Returns:
            Case investigation result with MongoDB document
        """
        try:
            logger.info("Starting simple case investigation creation")
            
            # Validate workflow_data is not None
            if workflow_data is None:
                logger.error("workflow_data is None")
                raise ValueError("workflow_data cannot be None")
            
            # Log workflow data structure for debugging
            logger.info(f"Workflow data keys: {list(workflow_data.keys())}")
            logger.info(f"Workflow data types: {[(k, type(v).__name__) for k, v in workflow_data.items()]}")
            
            # Generate unique case ID
            case_id = f"ERC-{datetime.now().strftime('%Y%m%d-%H%M%S')}"
            logger.info(f"Generated case ID: {case_id}")
            
            # Generate LLM investigation summary
            logger.info("Generating LLM investigation summary")
            llm_summary = await self._generate_investigation_summary(workflow_data)
            
            # Create MongoDB case document
            case_document = self._create_case_document(
                workflow_data=workflow_data,
                case_id=case_id,
                llm_summary=llm_summary
            )
            
            logger.info(f"Case investigation created successfully: {case_id}")
            
            return {
                "success": True,
                "case_id": case_id,
                "case_document": case_document,
                "investigation_summary": llm_summary
            }
            
        except Exception as e:
            logger.error(f"Error creating case investigation: {e}")
            logger.error(f"Workflow data was: {type(workflow_data)} - {workflow_data}")
            raise
    
    def _create_case_document(self, workflow_data: Dict[str, Any], case_id: str, llm_summary: str) -> Dict[str, Any]:
        """Create optimized MongoDB case document with summaries instead of full data"""
        
        # Extract key information
        entity_input = workflow_data.get("entityInput", {})
        classification_data = workflow_data.get("classification", {})
        classification = classification_data.get("result", {})
        raw_ai_response = classification_data.get("raw_ai_response", "")
        streaming_metadata = classification_data.get("streaming_metadata", {})
        network_analysis = workflow_data.get("networkAnalysis", {})
        search_results = workflow_data.get("searchResults", {})
        
        return {
            "_id": f"case_{case_id}",
            "caseId": case_id,
            "caseStatus": "investigation_complete",
            "createdAt": datetime.utcnow().isoformat(),
            
            # Summarized workflow data (not complete data to avoid massive documents)
            "workflowSummary": {
                "entityInput": entity_input,  # Keep entity input (small)
                "searchResults": {
                    "atlasResultsCount": len(search_results.get("atlasResults", [])),
                    "vectorResultsCount": len(search_results.get("vectorResults", [])),
                    "hybridResultsCount": len(search_results.get("hybridResults", [])),
                    "topHybridMatch": search_results.get("hybridResults", [{}])[0] if search_results.get("hybridResults") else None,
                    "searchExecutionTime": search_results.get("searchExecutionTime", 0)
                },
                "networkAnalysis": {
                    "analysisType": network_analysis.get("analysisType", "unknown"),
                    "entitiesAnalyzed": network_analysis.get("entitiesAnalyzed", 0),
                    "entitySummaries": [
                        {
                            "entityId": entity.get("entityId"),
                            "entityName": entity.get("entityName"),
                            "hybridScore": entity.get("hybridScore"),
                            "overallRiskScore": entity.get("overallRiskScore"),
                            "networkRiskScore": entity.get("networkRiskScore"),
                            "transactionRiskScore": entity.get("transactionRiskScore"),
                            "relationshipCount": len(entity.get("relationshipNetwork", {}).get("nodes", [])),
                            "transactionCount": entity.get("relationshipNetwork", {}).get("statistics", {}).get("basic_metrics", {}).get("total_nodes", 0)
                        }
                        for entity in network_analysis.get("entityAnalyses", [])
                    ]
                },
                "classification": {
                    "overall_risk_level": classification.get("overall_risk_level"),
                    "risk_score": classification.get("risk_score"),
                    "recommended_action": classification.get("recommended_action"),
                    "confidence_score": classification.get("confidence_score"),
                    "aml_kyc_flags": classification.get("aml_kyc_flags", {}),
                    "network_classification": classification.get("network_classification"),
                    "classification_model": classification.get("classification_model"),
                    "classification_timestamp": classification.get("classification_timestamp"),
                    # Store raw AI response for audit trail and transparency
                    "raw_ai_analysis": raw_ai_response,
                    "streaming_metadata": streaming_metadata
                }
            },
            
            # Investigation results
            "investigation": {
                "summary": llm_summary,
                "createdAt": datetime.utcnow().isoformat(),
                "model": "claude-3-sonnet"
            },
            
            # Case metrics
            "metrics": {
                "riskScore": classification.get("risk_score", 0),
                "riskLevel": classification.get("overall_risk_level", "unknown"),
                "recommendedAction": classification.get("recommended_action", "review"),
                "confidenceScore": classification.get("confidence_score", 0)
            },
            
            # Metadata
            "metadata": {
                "entityName": entity_input.get("fullName", "Unknown"),
                "entityType": entity_input.get("entityType", "unknown"),
                "workflowVersion": "enhanced_entity_resolution_v2.1",
                "documentVersion": "simple_case_investigation_v2_optimized",
                "createdBy": "system",
                "optimization": "Excluded full network graphs and search results to reduce document size"
            }
        }
    
    async def _generate_investigation_summary(self, workflow_data: Dict[str, Any]) -> str:
        """Generate investigation summary using LLM with raw AI classification analysis"""
        
        try:
            # Validate workflow_data structure
            if not workflow_data:
                raise ValueError("workflow_data is empty or None")
                
            logger.info("Extracting data from workflow_data for investigation summary")
            
            entity_input = workflow_data.get("entityInput", {})
            classification = workflow_data.get("classification", {})
            
            logger.info(f"Entity input keys: {list(entity_input.keys()) if entity_input else 'None'}")
            logger.info(f"Classification keys: {list(classification.keys()) if classification else 'None'}")
            
            # Extract structured classification result
            classification_result = classification.get("result", {}) if classification else {}
            
            # CRITICAL: Extract raw AI classification response for comprehensive analysis
            raw_ai_response = classification.get("raw_ai_response", "") if classification else ""
            streaming_metadata = classification.get("streaming_metadata", {}) if classification else {}
            
            network_analysis = workflow_data.get("networkAnalysis", {})
            search_results = workflow_data.get("searchResults", {})
            
            logger.info(f"Extracted data - Entity: {entity_input.get('fullName', 'Unknown')}, Raw AI response length: {len(raw_ai_response)}")
            
        except Exception as e:
            logger.error(f"Error extracting data from workflow_data: {e}")
            logger.error(f"Workflow data structure: {workflow_data}")
            raise
        
        # Build enhanced prompt using raw AI classification analysis
        if raw_ai_response:
            logger.info(f"Using raw AI classification response ({len(raw_ai_response)} characters) for investigation summary")
            
            # Use the comprehensive raw AI analysis as the foundation
            prompt = f"""Based on the comprehensive AI classification analysis below, create a professional case investigation summary:

=== ENTITY INFORMATION ===
Name: {entity_input.get('fullName', 'Unknown')}
Type: {entity_input.get('entityType', 'Unknown')}
Address: {entity_input.get('address', 'Not provided')}

=== SEARCH & NETWORK ANALYSIS CONTEXT ===
- Atlas Search: {len(search_results.get('atlasResults', []))} matches
- Vector Search: {len(search_results.get('vectorResults', []))} matches  
- Hybrid Search: {len(search_results.get('hybridResults', []))} matches
- Network Entities Analyzed: {network_analysis.get('entitiesAnalyzed', 0)}
- Analysis Type: {network_analysis.get('analysisType', 'unknown')}

=== COMPREHENSIVE AI CLASSIFICATION ANALYSIS ===
{raw_ai_response}

=== STRUCTURED CLASSIFICATION RESULTS ===
- Risk Score: {classification_result.get('risk_score', 0)}/100
- Risk Level: {classification_result.get('overall_risk_level', 'unknown')}
- Recommended Action: {classification_result.get('recommended_action', 'review')}
- Confidence: {classification_result.get('confidence_score', 0)}%
- Model Used: {streaming_metadata.get('model_used', 'claude-3-sonnet')}
- Analysis Duration: {streaming_metadata.get('total_time', 0):.1f}s

INSTRUCTIONS:
Create a professional case investigation summary (2-3 paragraphs) that:
1. Synthesizes the detailed AI classification analysis provided above
2. References specific risk factors and concerns identified in the AI analysis
3. Incorporates the network analysis and search results context
4. Provides a clear, actionable recommendation based on the comprehensive analysis
5. Uses professional AML/KYC compliance language suitable for regulatory documentation

Focus on the specific insights from the AI classification analysis rather than generic statements."""
        else:
            logger.warning("Raw AI classification response not available, using fallback structured data approach")
            
            # Fallback to structured data approach if raw response unavailable
            prompt = f"""Create a professional investigation summary for this entity resolution case:

ENTITY INFORMATION:
Name: {entity_input.get('fullName', 'Unknown')}
Type: {entity_input.get('entityType', 'Unknown')}
Address: {entity_input.get('address', 'Not provided')}

SEARCH RESULTS:
- Atlas Search: {len(search_results.get('atlasResults', []))} matches
- Vector Search: {len(search_results.get('vectorResults', []))} matches  
- Hybrid Search: {len(search_results.get('hybridResults', []))} matches

NETWORK ANALYSIS:
- Entities Analyzed: {network_analysis.get('entitiesAnalyzed', 0)}
- Analysis Type: {network_analysis.get('analysisType', 'unknown')}

CLASSIFICATION RESULTS:
- Risk Score: {classification_result.get('risk_score', 0)}/100
- Risk Level: {classification_result.get('overall_risk_level', 'unknown')}
- Recommended Action: {classification_result.get('recommended_action', 'review')}
- Confidence: {classification_result.get('confidence_score', 0)}%

Create a professional 2-3 paragraph investigation summary that:
1. Summarizes the key findings from the entity resolution process
2. Highlights the main risk factors and network analysis results
3. Provides a clear recommendation based on the classification

Write in professional compliance language suitable for case documentation."""
        
        try:
            logger.info("Calling AWS Bedrock for investigation summary")
            
            # Get Bedrock client
            bedrock_runtime = self.bedrock_client._get_bedrock_client(runtime=True)
            
            # Prepare Claude request
            request_body = {
                "anthropic_version": "bedrock-2023-05-31",
                "max_tokens": 1000,
                "temperature": 0.1,
                "messages": [
                    {
                        "role": "user",
                        "content": prompt
                    }
                ]
            }
            
            # Make API call
            response = bedrock_runtime.invoke_model(
                modelId="anthropic.claude-3-sonnet-20240229-v1:0",
                body=json.dumps(request_body),
                contentType="application/json"
            )
            
            # Parse response
            response_body = json.loads(response["body"].read())
            content = response_body.get("content", [])
            
            if content and len(content) > 0:
                summary = content[0].get("text", "").strip()
                logger.info(f"Generated investigation summary ({len(summary)} characters)")
                return summary
            else:
                logger.warning("No content in LLM response, using fallback")
                return self._create_fallback_summary(entity_input, classification)
                
        except Exception as e:
            logger.error(f"Error generating LLM summary: {e}")
            return self._create_fallback_summary(entity_input, classification)
    
    def _create_fallback_summary(self, entity_input: Dict[str, Any], classification: Dict[str, Any]) -> str:
        """Create fallback investigation summary when LLM fails"""
        
        entity_name = entity_input.get('fullName', 'Unknown Entity')
        risk_level = classification.get('overall_risk_level', 'medium')
        risk_score = classification.get('risk_score', 50)
        recommended_action = classification.get('recommended_action', 'review')
        
        return f"""Investigation Summary for {entity_name}

This case investigation analyzed {entity_name} through a comprehensive entity resolution workflow including parallel search analysis, network risk assessment, and AI-powered classification. The entity has been classified with a {risk_level} risk level (score: {risk_score}/100) based on available data and network analysis.

The investigation utilized multiple search methods including Atlas Search for text-based matching, Vector Search for semantic analysis, and Hybrid Search combining both approaches. Network analysis was performed to assess relationship patterns and risk propagation through connected entities.

Based on the comprehensive analysis, the recommended action is to {recommended_action} this entity. This recommendation takes into account the risk assessment results, network positioning analysis, and data quality factors identified during the investigation process."""


# Global service instance
_investigation_service: Optional[InvestigationService] = None


def get_investigation_service() -> InvestigationService:
    """Get or create investigation service instance"""
    global _investigation_service
    if _investigation_service is None:
        _investigation_service = InvestigationService()
    return _investigation_service