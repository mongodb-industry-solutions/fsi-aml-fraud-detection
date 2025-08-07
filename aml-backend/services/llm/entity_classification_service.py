"""
Entity Classification Service - LLM-powered entity analysis and risk classification

Uses AWS Bedrock to analyze complete entity resolution workflow data and provide
comprehensive classification, risk assessment, and action recommendations.
"""

import json
import logging
import time
from typing import Dict, Any, Optional, List
from datetime import datetime

from bedrock.client import BedrockClient
from models.api.llm_classification import (
    ClassificationRequest, 
    ClassificationResponse,
    EntityClassificationResult,
    ClassificationError,
    AMLKYCFlags,
    DataQualityAssessment,
    RiskFactorAnalysis,
    RecommendedAction,
    NetworkClassification,
    ConfidenceLevel
)

logger = logging.getLogger(__name__)


class EntityClassificationService:
    """
    LLM-powered entity classification service using AWS Bedrock
    
    Analyzes complete entity resolution workflow data to provide:
    - Risk assessment and classification
    - AML/KYC compliance analysis  
    - Network positioning analysis
    - Data quality assessment
    - Action recommendations
    """
    
    def __init__(self, bedrock_client: Optional[BedrockClient] = None):
        """
        Initialize classification service
        
        Args:
            bedrock_client: AWS Bedrock client for LLM operations
        """
        self.bedrock_client = bedrock_client or BedrockClient()
        self.supported_models = [
            "claude-3-sonnet",
            "claude-3-haiku", 
            "anthropic.claude-v2",
            "amazon.titan-text-express-v1"
        ]
        
        logger.info("EntityClassificationService initialized with AWS Bedrock integration")
    
    # ==================== MAIN CLASSIFICATION METHODS ====================
    
    async def classify_entity(self, request: ClassificationRequest) -> ClassificationResponse:
        """
        Classify entity using LLM analysis of complete workflow data
        
        Args:
            request: Classification request with workflow data
            
        Returns:
            ClassificationResponse with detailed analysis results
        """
        start_time = time.time()
        
        try:
            logger.info(f"Starting LLM entity classification with model: {request.model_preference}")
            
            # Validate workflow data
            validation_result = self._validate_workflow_data(request.workflow_data)
            if not validation_result["valid"]:
                return ClassificationResponse(
                    success=False,
                    error=ClassificationError(
                        error_type="validation_error",
                        error_message=validation_result["error"]
                    )
                )
            
            # Build comprehensive classification prompt
            classification_prompt = self._build_classification_prompt(
                request.workflow_data, 
                request.analysis_depth
            )
            
            # Call AWS Bedrock for analysis
            llm_response = await self._call_bedrock_for_classification(
                prompt=classification_prompt,
                model=request.model_preference
            )
            
            if not llm_response["success"]:
                return ClassificationResponse(
                    success=False,
                    error=ClassificationError(
                        error_type="llm_error",
                        error_message=llm_response["error"],
                        error_details=llm_response.get("details", {})
                    )
                )
            
            # Parse and structure LLM response
            classification_result = self._parse_classification_response(
                llm_response["response"],
                request.model_preference,
                request.workflow_data
            )
            
            processing_time = int((time.time() - start_time) * 1000)
            classification_result.processing_time_ms = processing_time
            
            logger.info(f"LLM classification completed in {processing_time}ms - "
                       f"Risk: {classification_result.risk_score}/100, "
                       f"Action: {classification_result.recommended_action}")
            
            return ClassificationResponse(
                success=True,
                result=classification_result,
                processing_metadata={
                    "processing_time_ms": processing_time,
                    "model_used": request.model_preference,
                    "analysis_depth": request.analysis_depth,
                    "workflow_entities_analyzed": len(
                        request.workflow_data.get("networkAnalysis", {}).get("entityAnalyses", [])
                    )
                }
            )
            
        except Exception as e:
            logger.error(f"Error in entity classification: {e}")
            return ClassificationResponse(
                success=False,
                error=ClassificationError(
                    error_type="service_error",
                    error_message=f"Classification service failed: {str(e)}",
                    error_details={"exception_type": type(e).__name__}
                )
            )
    
    # ==================== PROMPT BUILDING ====================
    
    def _build_classification_prompt(self, workflow_data: Dict[str, Any], analysis_depth: str = "comprehensive") -> str:
        """
        Build comprehensive classification prompt for LLM analysis
        
        Args:
            workflow_data: Complete workflow data from steps 0-2
            analysis_depth: Level of analysis detail required
            
        Returns:
            Structured prompt for LLM classification
        """
        
        # Extract key data components
        entity_input = workflow_data.get("entityInput", {})
        search_results = workflow_data.get("searchResults", {})
        network_analysis = workflow_data.get("networkAnalysis", {})
        
        # Build search results summary
        search_summary = self._format_search_results_summary(search_results)
        
        # Build network analysis summary  
        network_summary = self._format_network_analysis_summary(network_analysis)
        
        prompt = f"""You are an expert AML/KYC analyst tasked with comprehensive entity risk classification. 
Analyze the following entity resolution workflow data and provide a detailed risk assessment.

ENTITY INFORMATION:
Name: {entity_input.get('fullName', 'Unknown')}
Type: {entity_input.get('entityType', 'Unknown')}
Address: {entity_input.get('address', 'Not provided')}
Submission Date: {entity_input.get('submissionTimestamp', 'Unknown')}

SEARCH RESULTS ANALYSIS:
{search_summary}

NETWORK ANALYSIS (TOP 3 ENTITIES):
{network_summary}

ANALYSIS REQUIREMENTS:
Provide a comprehensive risk classification covering:

1. OVERALL RISK ASSESSMENT
   - Risk Level: Critical/High/Medium/Low with clear rationale
   - Risk Score: 0-100 numerical assessment
   - Primary risk factors identified
   - Risk rationale with specific evidence

2. ENTITY TYPE VALIDATION
   - Confidence in declared entity type (0-1.0)
   - Any concerns about entity type classification
   - Supporting evidence for validation

3. AML/KYC COMPLIANCE ANALYSIS
   - Sanctions risk indicators
   - PEP (Politically Exposed Person) risk
   - High volume transaction flags
   - Suspicious network connection flags
   - Geographic risk factors
   - Identity verification gaps
   - Additional compliance concerns

4. NETWORK POSITIONING ANALYSIS
   - Network classification: Hub/Bridge/Leaf/Isolated
   - Network influence score (0-100)
   - Key network risk indicators
   - Connected entity risk propagation

5. DATA QUALITY ASSESSMENT
   - Data completeness score (0-100)
   - Data reliability score (0-100)  
   - Data consistency score (0-100)
   - Missing critical fields
   - Data conflicts identified
   - Quality improvement recommendations

6. SEARCH EFFECTIVENESS ANALYSIS
   - Atlas Search match quality assessment
   - Vector Search semantic relevance
   - Hybrid Search combination effectiveness
   - Cross-reference validation between methods
   - Search result confidence analysis

7. RECOMMENDED ACTION
   - Primary recommendation: Approve/Review/Reject/Investigate
   - Action rationale with specific reasoning
   - Conditions or restrictions if applicable
   - Next steps and timelines

8. RISK FACTOR BREAKDOWN
   - Primary risk factors (most significant)
   - Secondary risk factors (moderate concern)
   - Mitigating factors (risk reducers)
   - Risk probability assessments
   - Potential impact analysis

9. CONFIDENCE ASSESSMENT
   - Overall confidence in classification (0-100)
   - Factors affecting confidence level
   - Areas requiring additional information
   - Uncertainty indicators

RESPONSE FORMAT:
Provide your analysis in the following JSON structure. ALL FIELDS ARE REQUIRED:

{{
  "overall_risk_level": "high|medium|low|critical",
  "risk_score": 75.5,
  "risk_rationale": "Detailed explanation of risk assessment...",
  "entity_type_confidence": 0.85,
  "entity_type_validation": "Confident this is an individual based on...",
  "entity_type_concerns": ["List of any concerns"],
  "aml_kyc_flags": {{
    "sanctions_risk": false,
    "pep_risk": true,
    "high_volume_transactions": false,
    "suspicious_network_connections": true,
    "geographic_risk": false,
    "identity_verification_gaps": true,
    "additional_flags": ["custom_flag_1", "custom_flag_2"],
    "flag_explanations": {{
      "pep_risk": "Connected to known PEP entities in network",
      "suspicious_network_connections": "Multiple high-risk entity connections"
    }}
  }},
  "compliance_concerns": ["List of compliance issues"],
  "regulatory_implications": ["Potential regulatory impacts"],
  "network_classification": "hub|bridge|leaf|isolated",
  "network_influence_score": 78.2,
  "network_risk_indicators": ["High centrality score", "Multiple high-risk connections"],
  "data_quality_assessment": {{
    "completeness_score": 85.0,
    "reliability_score": 90.0,
    "consistency_score": 75.0,
    "missing_critical_fields": ["date_of_birth", "primary_identifier"],
    "data_conflicts": ["Address mismatch between sources"],
    "quality_recommendations": ["Collect additional verification documents"]
  }},
  "recommended_action": "review|approve|reject|investigate",
  "action_rationale": "Detailed reasoning for recommended action...",
  "action_conditions": ["Condition 1", "Condition 2"],
  "risk_factor_analysis": {{
    "primary_risk_factors": ["Factor 1", "Factor 2"],
    "secondary_risk_factors": ["Factor 3"],
    "mitigating_factors": ["Factor 4"],
    "risk_probability_assessment": {{"high_risk_scenario": 0.7}},
    "potential_impact_analysis": {{"regulatory": "Medium impact potential"}}
  }},
  "confidence_score": 87.5,
  "confidence_level": "high|medium|low",
  "confidence_factors": ["Strong search matches", "Comprehensive network data"],
  "search_effectiveness_analysis": {{
    "atlas_search_quality": "High - strong text matches found",
    "vector_search_relevance": "Medium - semantic similarities identified",
    "hybrid_search_effectiveness": "High - good combination of methods",
    "cross_reference_validation": "Strong - consistent results across methods"
  }},
  "match_quality_assessment": {{
    "top_match_confidence": 0.89,
    "match_consistency": "High across all search methods",
    "potential_false_positives": "Low likelihood based on multiple confirming factors"
  }},
  "llm_analysis": "COMPREHENSIVE ANALYSIS:\\n\\nBased on my analysis of the complete entity resolution workflow data..."
}}

CRITICAL: Ensure the confidence_level field is included and matches one of: "high", "medium", "low"

Ensure all scores are realistic and well-justified. Provide specific, actionable insights based on the actual data provided. Focus on practical risk assessment that would be valuable to AML/KYC analysts.
"""

        return prompt
    
    def _format_search_results_summary(self, search_results: Dict[str, Any]) -> str:
        """Format search results for prompt inclusion"""
        if not search_results:
            return "No search results available"
        
        summary = []
        
        # Atlas Search Results
        atlas_results = search_results.get("atlasResults", [])
        if atlas_results:
            summary.append(f"Atlas Search: {len(atlas_results)} matches found")
            if atlas_results:
                top_atlas = atlas_results[0]
                summary.append(f"  - Top match: {top_atlas.get('entity_name', 'Unknown')} "
                             f"(Score: {top_atlas.get('atlas_score', 0):.3f})")
        
        # Vector Search Results  
        vector_results = search_results.get("vectorResults", [])
        if vector_results:
            summary.append(f"Vector Search: {len(vector_results)} matches found")
            if vector_results:
                top_vector = vector_results[0]
                summary.append(f"  - Top match: {top_vector.get('entity_name', 'Unknown')} "
                             f"(Score: {top_vector.get('vector_score', 0):.3f})")
        
        # Hybrid Search Results
        hybrid_results = search_results.get("hybridResults", [])
        if hybrid_results:
            summary.append(f"Hybrid Search: {len(hybrid_results)} matches found")
            for i, result in enumerate(hybrid_results[:3], 1):
                summary.append(f"  - Match {i}: {result.get('entity_name', 'Unknown')} "
                             f"(Hybrid Score: {result.get('hybridScore', 0):.4f}, "
                             f"Text: {result.get('text_contribution_percent', 0):.1f}%, "
                             f"Vector: {result.get('vector_contribution_percent', 0):.1f}%)")
        
        return "\\n".join(summary) if summary else "No search results processed"
    
    def _format_network_analysis_summary(self, network_analysis: Dict[str, Any]) -> str:
        """Format network analysis for prompt inclusion"""
        if not network_analysis or not network_analysis.get("entityAnalyses"):
            return "No network analysis data available"
        
        summary = []
        entity_analyses = network_analysis.get("entityAnalyses", [])
        
        summary.append(f"Analyzed {len(entity_analyses)} entities from top hybrid search matches:")
        
        for i, entity in enumerate(entity_analyses, 1):
            entity_name = entity.get("entityName", "Unknown")
            hybrid_score = entity.get("hybridScore", 0)
            network_risk = entity.get("networkRiskScore", 0)
            transaction_risk = entity.get("transactionRiskScore", 0)
            overall_risk = entity.get("overallRiskScore", 0)
            
            # Network details
            rel_network = entity.get("relationshipNetwork", {})
            nodes = len(rel_network.get("nodes", []))
            edges = len(rel_network.get("edges", []))
            
            summary.append(f"  Entity {i}: {entity_name}")
            summary.append(f"    - Hybrid Match Score: {hybrid_score:.4f}")
            summary.append(f"    - Overall Risk Score: {overall_risk}/100")
            summary.append(f"    - Network Risk Score: {network_risk}/100")
            summary.append(f"    - Transaction Risk Score: {transaction_risk}/100")
            summary.append(f"    - Network Size: {nodes} nodes, {edges} relationships")
            
            # Add network statistics if available
            if rel_network.get("statistics"):
                stats = rel_network["statistics"]
                if stats.get("basic_metrics"):
                    basic = stats["basic_metrics"]
                    summary.append(f"    - Network Avg Risk: {basic.get('avg_risk_score', 0):.1f}/100")
        
        return "\\n".join(summary)
    
    # ==================== BEDROCK INTEGRATION ====================
    
    async def _call_bedrock_for_classification(self, prompt: str, model: str = "claude-3-sonnet") -> Dict[str, Any]:
        """
        Call AWS Bedrock for LLM classification analysis
        
        Args:
            prompt: Classification prompt
            model: Bedrock model to use
            
        Returns:
            Response from Bedrock with analysis results
        """
        try:
            logger.info(f"Calling AWS Bedrock with model: {model}")
            
            # Get Bedrock client
            bedrock_runtime = self.bedrock_client._get_bedrock_client(runtime=True)
            
            # Prepare request based on model type
            if "claude" in model.lower():
                request_body = {
                    "anthropic_version": "bedrock-2023-05-31",
                    "max_tokens": 4000,
                    "temperature": 0.1,  # Lower temperature for more consistent analysis
                    "messages": [
                        {
                            "role": "user",
                            "content": prompt
                        }
                    ]
                }
                model_id = "anthropic.claude-3-sonnet-20240229-v1:0"
                
            elif "titan" in model.lower():
                request_body = {
                    "inputText": prompt,
                    "textGenerationConfig": {
                        "maxTokenCount": 4000,
                        "temperature": 0.1,
                        "topP": 0.9
                    }
                }
                model_id = "amazon.titan-text-express-v1"
            else:
                return {
                    "success": False,
                    "error": f"Unsupported model: {model}",
                    "details": {"supported_models": self.supported_models}
                }
            
            # Make the API call
            response = bedrock_runtime.invoke_model(
                modelId=model_id,
                body=json.dumps(request_body),
                contentType="application/json"
            )
            
            # Parse response
            response_body = json.loads(response["body"].read())
            
            if "claude" in model.lower():
                content = response_body.get("content", [])
                if content and len(content) > 0:
                    llm_response = content[0].get("text", "")
                else:
                    return {"success": False, "error": "No content in Claude response"}
            elif "titan" in model.lower():
                results = response_body.get("results", [])
                if results:
                    llm_response = results[0].get("outputText", "")
                else:
                    return {"success": False, "error": "No results in Titan response"}
            
            logger.info(f"Received LLM response ({len(llm_response)} characters)")
            
            return {
                "success": True,
                "response": llm_response,
                "model_used": model_id,
                "metadata": {
                    "input_tokens": response_body.get("usage", {}).get("input_tokens"),
                    "output_tokens": response_body.get("usage", {}).get("output_tokens")
                }
            }
            
        except Exception as e:
            logger.error(f"Error calling Bedrock: {e}")
            return {
                "success": False,
                "error": f"Bedrock API call failed: {str(e)}",
                "details": {"exception_type": type(e).__name__}
            }
    
    # ==================== RESPONSE PARSING ====================
    
    def _parse_classification_response(self, llm_response: str, model_used: str, workflow_data: Dict[str, Any]) -> EntityClassificationResult:
        """
        Parse LLM response into structured classification result
        
        Args:
            llm_response: Raw LLM response text
            model_used: Model that generated the response
            workflow_data: Original workflow data
            
        Returns:
            Structured EntityClassificationResult
        """
        try:
            # Extract JSON from LLM response (handle potential markdown formatting)
            json_start = llm_response.find('{')
            json_end = llm_response.rfind('}') + 1
            
            if json_start == -1 or json_end == 0:
                raise ValueError("No JSON found in LLM response")
            
            json_str = llm_response[json_start:json_end]
            parsed_data = json.loads(json_str)
            
            # Build structured result
            result = EntityClassificationResult(
                # Overall Assessment
                overall_risk_level=parsed_data.get("overall_risk_level", "medium").lower(),
                risk_score=float(parsed_data.get("risk_score", 50)),
                risk_rationale=parsed_data.get("risk_rationale", "Risk assessment based on available data"),
                
                # Entity Type Validation
                entity_type_confidence=float(parsed_data.get("entity_type_confidence", 0.8)),
                entity_type_validation=parsed_data.get("entity_type_validation", "Entity type validated"),
                entity_type_concerns=parsed_data.get("entity_type_concerns", []),
                
                # AML/KYC Flags
                aml_kyc_flags=AMLKYCFlags(**parsed_data.get("aml_kyc_flags", {})),
                compliance_concerns=parsed_data.get("compliance_concerns", []),
                regulatory_implications=parsed_data.get("regulatory_implications", []),
                
                # Network Analysis
                network_classification=NetworkClassification(
                    parsed_data.get("network_classification", "leaf")
                ),
                network_influence_score=float(parsed_data.get("network_influence_score", 0)),
                network_risk_indicators=parsed_data.get("network_risk_indicators", []),
                
                # Data Quality
                data_quality_assessment=DataQualityAssessment(
                    **parsed_data.get("data_quality_assessment", {
                        "completeness_score": 70,
                        "reliability_score": 80,
                        "consistency_score": 75
                    })
                ),
                
                # Action Recommendation
                recommended_action=RecommendedAction(
                    parsed_data.get("recommended_action", "review")
                ),
                action_rationale=parsed_data.get("action_rationale", "Recommendation based on risk analysis"),
                action_conditions=parsed_data.get("action_conditions", []),
                
                # Risk Factor Analysis
                risk_factor_analysis=RiskFactorAnalysis(
                    **parsed_data.get("risk_factor_analysis", {})
                ),
                
                # Confidence Assessment
                confidence_score=float(parsed_data.get("confidence_score", 75)),
                confidence_factors=parsed_data.get("confidence_factors", []),
                
                # Search Analysis
                search_effectiveness_analysis=parsed_data.get("search_effectiveness_analysis", {}),
                match_quality_assessment=parsed_data.get("match_quality_assessment", {}),
                
                # LLM Details
                llm_analysis=parsed_data.get("llm_analysis", llm_response),
                classification_model=model_used,
                classification_timestamp=datetime.utcnow()
            )
            
            logger.info(f"Successfully parsed LLM classification: Risk {result.risk_score}/100, "
                       f"Action: {result.recommended_action}, Confidence: {result.confidence_score}%")
            
            return result
            
        except Exception as e:
            logger.error(f"Error parsing LLM response: {e}")
            # Return fallback classification result
            return self._create_fallback_classification(llm_response, model_used, str(e))
    
    def _create_fallback_classification(self, raw_response: str, model_used: str, error: str) -> EntityClassificationResult:
        """Create fallback classification when parsing fails"""
        logger.warning(f"Creating fallback classification due to parsing error: {error}")
        
        return EntityClassificationResult(
            overall_risk_level="medium",
            risk_score=50.0,
            risk_rationale=f"Unable to parse LLM response properly. Error: {error}",
            entity_type_confidence=0.5,
            entity_type_validation="Unable to validate due to parsing error",
            aml_kyc_flags=AMLKYCFlags(),
            compliance_concerns=["LLM response parsing failed"],
            network_classification=NetworkClassification.LEAF,
            network_influence_score=0.0,
            data_quality_assessment=DataQualityAssessment(
                completeness_score=0,
                reliability_score=0,
                consistency_score=0,
                missing_critical_fields=["llm_parsing_failed"]
            ),
            recommended_action=RecommendedAction.REVIEW,
            action_rationale="Manual review required due to LLM parsing failure",
            risk_factor_analysis=RiskFactorAnalysis(),
            confidence_score=0.0,
            confidence_level=ConfidenceLevel.LOW,
            confidence_factors=["LLM response parsing failed"],
            llm_analysis=f"RAW RESPONSE (PARSING FAILED):\\n{raw_response}",
            classification_model=model_used,
            classification_timestamp=datetime.utcnow()
        )
    
    # ==================== VALIDATION METHODS ====================
    
    def _validate_workflow_data(self, workflow_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Validate workflow data for classification
        
        Args:
            workflow_data: Complete workflow data
            
        Returns:
            Validation result with success/error details
        """
        try:
            # Check required top-level keys
            required_keys = ["entityInput", "searchResults"]
            missing_keys = [key for key in required_keys if key not in workflow_data]
            
            if missing_keys:
                return {
                    "valid": False,
                    "error": f"Missing required workflow data: {', '.join(missing_keys)}"
                }
            
            # Validate entity input
            entity_input = workflow_data["entityInput"]
            if not entity_input.get("fullName"):
                return {
                    "valid": False,
                    "error": "Entity input missing required field: fullName"
                }
            
            # Validate search results
            search_results = workflow_data["searchResults"]
            if not any(search_results.get(key, []) for key in ["atlasResults", "vectorResults", "hybridResults"]):
                return {
                    "valid": False,
                    "error": "No search results found in workflow data"
                }
            
            # Network analysis is optional but should be validated if present
            if "networkAnalysis" in workflow_data:
                network_analysis = workflow_data["networkAnalysis"]
                if not network_analysis.get("entityAnalyses"):
                    logger.warning("Network analysis present but no entity analyses found")
            
            return {"valid": True}
            
        except Exception as e:
            return {
                "valid": False,
                "error": f"Workflow data validation failed: {str(e)}"
            }


# ==================== SERVICE INSTANCE AND HELPERS ====================

# Global service instance (will be initialized by dependency injection)
_classification_service: Optional[EntityClassificationService] = None


def get_classification_service() -> EntityClassificationService:
    """Get or create classification service instance"""
    global _classification_service
    if _classification_service is None:
        _classification_service = EntityClassificationService()
    return _classification_service