"""
Stage 2 Analyzer: Vector Search + AI Analysis
Deep investigation for edge cases that need sophisticated analysis
"""

import asyncio
import json
import logging
from datetime import datetime
from typing import Dict, Any, List, Optional, Tuple

from azure.ai.agents import AgentsClient
from azure.core.exceptions import HttpResponseError

from .models import (
    TransactionInput, Stage1Result, Stage2Result, AgentConfig,
    DecisionType, Stage2Error, AzureAIError
)

logger = logging.getLogger(__name__)


class Stage2Analyzer:
    """
    Stage 2: Vector similarity search + AI-powered analysis
    
    Goal: Deep analysis for edge cases (20-30% of transactions)
    - Find similar historical transactions using vector search
    - Use AI to identify sophisticated fraud patterns
    - Provide nuanced risk assessment for complex cases
    """
    
    def __init__(self, db_client, agents_client: AgentsClient, config: AgentConfig):
        self.db_client = db_client
        self.agents_client = agents_client
        self.config = config
        self.fraud_service = None
        self.enhanced_memory = None  # Will be set by agent_core
        
        logger.info("Initializing Stage2Analyzer")
    
    async def initialize(self):
        """Initialize the Stage 2 analyzer"""
        try:
            # Import and initialize existing fraud detection service for vector search
            from services.fraud_detection import FraudDetectionService
            
            import os
            self.fraud_service = FraudDetectionService(
                self.db_client,
                db_name=self.db_client.db_name if hasattr(self.db_client, 'db_name') else os.getenv("DB_NAME", "threatsight360")
            )
            
            logger.info("✅ Stage 2 analyzer initialized")
            
        except Exception as e:
            logger.error(f"Failed to initialize Stage 2 analyzer: {e}")
            raise Stage2Error(f"Stage 2 initialization failed: {str(e)}")
    
    async def analyze(
        self,
        transaction: TransactionInput,
        transaction_data: Dict[str, Any], 
        stage1_result: Stage1Result,
        thread_id: str,
        agent_id: str,
        conversation_handler=None,
        fraud_toolset=None,
        fraud_tools_instance=None,
        enhanced_memory=None,
        meta_context=None
    ) -> Stage2Result:
        """
        Perform Stage 2 analysis: vector search + AI analysis
        
        Args:
            transaction: Standardized transaction input
            transaction_data: Original transaction data
            stage1_result: Results from Stage 1 analysis
            thread_id: Azure AI conversation thread
            agent_id: Azure AI agent ID
            conversation_handler: Optional conversation handler for native Azure AI operations
            
        Returns:
            Stage2Result with AI analysis and recommendations
        """
        start_time = datetime.now()
        
        try:
            logger.debug(f"Starting Stage 2 analysis for {transaction.transaction_id}")
            
            # ============================================================
            # VECTOR SIMILARITY SEARCH
            # ============================================================
            similar_transactions, similarity_risk, similarity_breakdown = await self._vector_similarity_search(
                transaction_data
            )
            
            logger.debug(
                f"Vector search: found {len(similar_transactions)} similar transactions, "
                f"risk={similarity_risk:.3f}"
            )
            
            # ============================================================
            # AI ANALYSIS using Azure AI Foundry Agent
            # ============================================================
            ai_analysis, ai_recommendation = await self._ai_analysis(
                transaction=transaction,
                stage1_result=stage1_result,
                similar_transactions=similar_transactions,
                similarity_breakdown=similarity_breakdown,
                thread_id=thread_id,
                agent_id=agent_id,
                conversation_handler=conversation_handler,
                fraud_toolset=fraud_toolset,
                fraud_tools_instance=fraud_tools_instance,
                enhanced_memory=enhanced_memory,
                meta_context=meta_context
            )
            
            logger.debug(f"AI analysis complete: recommendation={ai_recommendation}")
            
            # ============================================================
            # BUILD STAGE 2 RESULT
            # ============================================================
            result = Stage2Result(
                similar_transactions_count=len(similar_transactions),
                similarity_risk_score=similarity_risk * 100,  # Convert to 0-100 scale
                ai_analysis_summary=ai_analysis,
                ai_recommendation=ai_recommendation,
                pattern_insights=self._extract_pattern_insights(similar_transactions),
                processing_time_ms=(datetime.now() - start_time).total_seconds() * 1000
            )
            
            logger.debug(f"Stage 2 complete: {result.similar_transactions_count} similar txns")
            return result
            
        except Exception as e:
            logger.error(f"Stage 2 analysis failed for {transaction.transaction_id}: {e}")
            raise Stage2Error(f"Stage 2 analysis failed: {str(e)}")
    
    async def _vector_similarity_search(
        self, 
        transaction_data: Dict[str, Any]
    ) -> Tuple[List[Dict], float, Dict]:
        """
        Use existing vector similarity search service
        
        Returns:
            - similar_transactions: List of similar transactions
            - similarity_risk: Overall similarity risk score (0-1)
            - similarity_breakdown: Detailed breakdown of similarity analysis
        """
        try:
            # Use existing fraud service vector search
            if asyncio.iscoroutinefunction(self.fraud_service.find_similar_transactions):
                similar_transactions, similarity_risk, similarity_breakdown = await self.fraud_service.find_similar_transactions(
                    transaction_data
                )
            else:
                # If not async, run in thread pool
                result = await asyncio.get_event_loop().run_in_executor(
                    None, 
                    self.fraud_service.find_similar_transactions,
                    transaction_data
                )
                similar_transactions, similarity_risk, similarity_breakdown = result
            
            logger.debug(
                f"Vector search found {len(similar_transactions)} similar transactions "
                f"with risk score {similarity_risk:.3f}"
            )
            
            return similar_transactions, similarity_risk, similarity_breakdown
            
        except Exception as e:
            logger.warning(f"Vector similarity search failed: {e}")
            # Return empty results on failure
            return [], 0.0, {"error": str(e)}
    
    async def _ai_analysis(
        self,
        transaction: TransactionInput,
        stage1_result: Stage1Result,
        similar_transactions: List[Dict],
        similarity_breakdown: Dict,
        thread_id: str,
        agent_id: str,
        conversation_handler=None,
        fraud_toolset=None,
        fraud_tools_instance=None,
        enhanced_memory=None,
        meta_context=None
    ) -> Tuple[str, Optional[DecisionType]]:
        """
        Use Azure AI Foundry agent for sophisticated analysis
        
        Returns:
            - ai_analysis: Summary of AI analysis
            - ai_recommendation: AI recommendation (if any)
        """
        try:
            # Build comprehensive context for AI analysis
            context = self._build_ai_context(
                transaction, stage1_result, fraud_tools_instance, meta_context
            )
            
            # Store the prompt for meta-learning
            if enhanced_memory:
                await enhanced_memory.store_conversation_message(
                    thread_id=thread_id,
                    transaction_id=transaction.transaction_id,
                    role="user",
                    content=context,
                    metadata={"stage": "stage2_analysis", "prompt_type": "ai_investigation"}
                )
            
            # Use conversation handler if available, otherwise use agents client
            if conversation_handler:
                # For existing agents, pass the fraud_toolset for manual function handling
                ai_response = await conversation_handler.run_conversation_native(
                    thread_id=thread_id,
                    message=context,
                    fraud_toolset=fraud_toolset
                )
            else:
                # Fallback to direct agents client usage
                self.agents_client.messages.create(
                    thread_id=thread_id,
                    role="user",
                    content=context
                )
                ai_response = await self._run_ai_conversation(thread_id, agent_id, self.agents_client)
                
                # Store fallback conversation if enhanced memory provided
                if enhanced_memory:
                    await enhanced_memory.store_conversation_message(
                        thread_id=thread_id,
                        transaction_id=transaction.transaction_id,
                        role="user",
                        content=context,
                        metadata={"stage": "stage2_analysis", "prompt_type": "ai_investigation", "fallback": True}
                    )
                    await enhanced_memory.store_conversation_message(
                        thread_id=thread_id,
                        transaction_id=transaction.transaction_id,
                        role="assistant",
                        content=ai_response,
                        metadata={"stage": "stage2_analysis", "response_type": "ai_investigation", "fallback": True}
                    )
            
            # Store the AI response for meta-learning
            if enhanced_memory:
                await enhanced_memory.store_conversation_message(
                    thread_id=thread_id,
                    transaction_id=transaction.transaction_id,
                    role="assistant",
                    content=ai_response,
                    metadata={"stage": "stage2_analysis", "response_type": "ai_investigation"}
                )
            
            # Extract recommendation from AI response
            ai_recommendation = self._extract_ai_recommendation(ai_response)
            
            return ai_response, ai_recommendation
            
        except Exception as e:
            logger.error(f"AI analysis failed: {e}")
            return f"AI analysis failed: {str(e)}", None
    
    def _build_ai_context(
        self,
        transaction: TransactionInput,
        stage1_result: Stage1Result,
        fraud_tools_instance=None,
        meta_context=None
    ) -> str:
        """Build comprehensive context for AI analysis"""
        
        context = f"""
TRANSACTION ANALYSIS REQUEST - STAGE 2 INVESTIGATION

Current Transaction Details:
- ID: {transaction.transaction_id}
- Customer: {transaction.customer_id}
- Amount: ${transaction.amount:,.2f} {transaction.currency}
- Merchant Category: {transaction.merchant_category}
- Location: {transaction.location_country}
- Timestamp: {transaction.timestamp.isoformat()}

Stage 1 Analysis Results:
- Combined Risk Score: {stage1_result.combined_score:.1f}/100
- Rules Score: {stage1_result.rule_score:.1f}/100
- Basic ML Score: {stage1_result.basic_ml_score or 'N/A'}
- Rule Flags: {stage1_result.rule_flags if stage1_result.rule_flags else 'None'}
- Processing Time: {stage1_result.processing_time_ms:.1f}ms
"""
        
        # Add meta-learning context if available
        if meta_context and meta_context.get("similar_decisions"):
            context += f"""\n
META-LEARNING CONTEXT:
Found {len(meta_context['similar_decisions'])} similar past decisions:
"""
            for i, decision in enumerate(meta_context['similar_decisions'][:3], 1):
                context += f"""\n{i}. Transaction from {decision.get('created_at', 'Unknown date')}
   - Decision: {decision.get('decision')}
   - Risk Score: {decision.get('risk_score', 0):.1f}/100
   - Confidence: {decision.get('confidence', 0):.2%}
   - Reasoning: {decision.get('reasoning', 'N/A')[:100]}...
"""
            
            if meta_context.get("statistics"):
                context += f"""\n
Historical Statistics:
- Most Common Decision: {meta_context['statistics'].get('most_common_decision', 'N/A')}
- Average Risk Score: {meta_context['statistics'].get('avg_risk_score', 0):.1f}/100
"""
        
        if meta_context and meta_context.get("relevant_patterns"):
            context += f"""\n
Learned Patterns ({len(meta_context['relevant_patterns'])} relevant):
"""
            for pattern in meta_context['relevant_patterns'][:2]:
                context += f"""\n- Pattern Type: {pattern.get('pattern_type')}
  Effectiveness: {pattern.get('effectiveness_score', 0):.2%}
  Usage Count: {pattern.get('usage_count', 0)}
"""
        
        # Build strategic tool selection guidance using the fraud tools instance
        tool_guidance = ""
        if fraud_tools_instance:
            tool_guidance = fraud_tools_instance.build_tool_selection_guidance(transaction, stage1_result)
        else:
            tool_guidance = "TOOL SELECTION: Start with analyze_transaction_patterns(), then choose additional tools based on findings."
        
        context += f"""

STRATEGIC ANALYSIS REQUEST:
This transaction scored {stage1_result.combined_score:.1f}/100 in our initial analysis, 
placing it in the edge case category that requires deeper investigation.

AVAILABLE ANALYSIS TOOLS:
1. analyze_transaction_patterns() - Customer behavioral analysis
2. search_similar_transactions() - Vector similarity search for patterns
3. calculate_network_risk() - Network analysis for connected fraud rings  
4. check_sanctions_lists() - PEP/sanctions screening
5. SuspiciousReportsAgent - Connected agent for historical SAR analysis

TOOL SELECTION STRATEGY:
{tool_guidance}

CONNECTED AGENT GUIDANCE:
Use SuspiciousReportsAgent when:
- High-value transactions ($10K+) with unusual patterns
- Multiple risk flags from Stage 1 (3+ flags)
- Transactions to high-risk jurisdictions
- Complex fraud patterns that may match historical SARs
- Network analysis reveals suspicious connections

When calling SuspiciousReportsAgent, provide:
- Transaction details (amount, location, merchant category)
- Customer profile and risk flags
- Stage 1 analysis summary
- Any tool findings that suggest historical pattern matches

ANALYSIS APPROACH:
1. Start with analyze_transaction_patterns() to establish customer baseline
2. Use search_similar_transactions() if patterns seem anomalous
3. Call SuspiciousReportsAgent if multiple red flags or complex patterns emerge
4. Use network/sanctions tools for high-risk scenarios
5. Make final decision based on comprehensive analysis

RESPONSE FORMAT:
Based on your strategic analysis, provide:
1. A clear risk assessment citing specific tool findings
2. Your recommendation: APPROVE, INVESTIGATE, ESCALATE, or BLOCK  
3. Explanation of your tool selection strategy and key findings
4. Specific risk factors or reassuring patterns from your analysis
5. If you used SuspiciousReportsAgent, integrate its historical insights

Focus on efficient, targeted analysis that maximizes insight while minimizing unnecessary tool usage.
"""
        
        return context
    
    async def _run_ai_conversation(self, thread_id: str, agent_id: str, client) -> str:
        """
        Run Azure AI conversation with simplified loop for demo
        
        For demo purposes, we'll use a simplified conversation loop
        without complex tool handling
        """
        try:
            logger.debug(f"Starting AI conversation in thread {thread_id}")
            
            # Create run
            run = client.runs.create(
                thread_id=thread_id,
                assistant_id=agent_id
            )
            
            # Simple polling loop with timeout
            max_iterations = 20  # Reduced for demo
            iteration = 0
            
            while run.status in ["queued", "in_progress"] and iteration < max_iterations:
                await asyncio.sleep(2)  # Wait 2 seconds between checks
                
                run = client.runs.get(
                    thread_id=thread_id,
                    run_id=run.id
                )
                
                iteration += 1
                logger.debug(f"AI conversation iteration {iteration}, status: {run.status}")
            
            if run.status == "completed":
                # Get the response
                messages = client.messages.list(thread_id=thread_id, limit=1)
                
                if messages and messages[0].role == "assistant":
                    content = messages[0].content
                    if content and len(content) > 0:
                        # Extract text content
                        response_text = content[0].text.value if hasattr(content[0].text, 'value') else content[0].text
                        logger.debug("AI analysis completed successfully")
                        return response_text
                
                return "AI analysis completed but no response content found"
            
            else:
                logger.warning(f"AI conversation ended with status: {run.status}")
                return f"AI analysis incomplete (status: {run.status})"
                
        except HttpResponseError as e:
            logger.error(f"Azure AI API error: {e}")
            return f"AI analysis failed: Azure AI API error"
        except Exception as e:
            logger.error(f"AI conversation failed: {e}")
            return f"AI analysis failed: {str(e)}"
    
    def _extract_ai_recommendation(self, ai_response: str) -> Optional[DecisionType]:
        """Extract decision recommendation from AI response"""
        if not ai_response:
            return None
        
        response_lower = ai_response.lower()
        
        # Look for explicit recommendations
        if "recommend: block" in response_lower or "recommendation: block" in response_lower:
            return DecisionType.BLOCK
        elif "recommend: approve" in response_lower or "recommendation: approve" in response_lower:
            return DecisionType.APPROVE
        elif "recommend: escalate" in response_lower or "recommendation: escalate" in response_lower:
            return DecisionType.ESCALATE
        elif "recommend: investigate" in response_lower or "recommendation: investigate" in response_lower:
            return DecisionType.INVESTIGATE
        
        # Look for decision keywords in context
        if "should be blocked" in response_lower or "recommend blocking" in response_lower:
            return DecisionType.BLOCK
        elif "should be approved" in response_lower or "appears legitimate" in response_lower:
            return DecisionType.APPROVE
        elif "requires escalation" in response_lower or "escalate immediately" in response_lower:
            return DecisionType.ESCALATE
        elif "needs investigation" in response_lower or "further investigation" in response_lower:
            return DecisionType.INVESTIGATE
        
        return None  # No clear recommendation found
    
    def _extract_pattern_insights(self, similar_transactions: List[Dict]) -> List[str]:
        """Extract pattern insights from similar transactions"""
        insights = []
        
        if not similar_transactions:
            insights.append("No similar historical transactions found")
            return insights
        
        # Analyze amounts
        amounts = [txn.get('amount', 0) for txn in similar_transactions]
        if amounts:
            avg_amount = sum(amounts) / len(amounts)
            max_amount = max(amounts)
            insights.append(f"Similar transactions: avg ${avg_amount:,.2f}, max ${max_amount:,.2f}")
        
        # Analyze merchant categories
        categories = [txn.get('merchant', {}).get('category', 'unknown') for txn in similar_transactions]
        category_counts = {}
        for cat in categories:
            category_counts[cat] = category_counts.get(cat, 0) + 1
        
        if category_counts:
            most_common = max(category_counts.items(), key=lambda x: x[1])
            insights.append(f"Most common category in similar transactions: {most_common[0]} ({most_common[1]} times)")
        
        # Analyze risk levels
        risk_scores = [txn.get('risk_score', 0) for txn in similar_transactions if txn.get('risk_score')]
        if risk_scores:
            avg_risk = sum(risk_scores) / len(risk_scores)
            high_risk_count = sum(1 for score in risk_scores if score > 60)
            insights.append(f"Similar transactions risk: avg {avg_risk:.1f}/100, {high_risk_count} high-risk")
        
        return insights
    
    async def cleanup(self):
        """Clean up Stage 2 resources"""
        logger.debug("Stage 2 analyzer cleanup complete")