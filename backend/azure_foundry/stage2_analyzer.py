"""
Stage 2 Analyzer: Vector Search + AI Analysis
Deep investigation for edge cases that need sophisticated analysis
"""

# IMPORTANT: Import and configure logging FIRST
from logging_setup import setup_logging, get_logger
setup_logging()  # Configure logging

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
        memory_store=None,
        similar_decisions=None
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
            ai_analysis, ai_recommendation, ai_risk_score = await self._ai_analysis(
                transaction=transaction,
                stage1_result=stage1_result,
                similar_transactions=similar_transactions,
                similarity_breakdown=similarity_breakdown,
                thread_id=thread_id,
                agent_id=agent_id,
                conversation_handler=conversation_handler,
                fraud_toolset=fraud_toolset,
                fraud_tools_instance=fraud_tools_instance,
                memory_store=memory_store,
                similar_decisions=similar_decisions
            )
            
            logger.debug(f"AI analysis complete: recommendation={ai_recommendation}")
            
            # ============================================================
            # BUILD STAGE 2 RESULT
            # ============================================================
            result = Stage2Result(
                similar_transactions_count=len(similar_transactions),
                similarity_risk_score=(similarity_risk or 0.0) * 100,  # Convert to 0-100 scale, handle None
                ai_analysis_summary=ai_analysis,
                ai_recommendation=ai_recommendation,
                ai_risk_score=ai_risk_score,  # AI's explicit risk assessment (0-100)
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
        memory_store=None,
        similar_decisions=None
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
                transaction, stage1_result, fraud_tools_instance, similar_decisions
            )
            
            # Store the prompt in memory if available
            if memory_store:
                await memory_store.add_message_to_memory(
                    transaction_id=transaction.transaction_id,
                    role="user",
                    content=context[:500]  # Limit length
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
                
                # Store fallback conversation if memory store provided
                if memory_store:
                    await memory_store.add_message_to_memory(
                        transaction_id=transaction.transaction_id,
                        role="user",
                        content=context[:500],
                        tools_used=["ai_analysis"]
                    )
                    await memory_store.add_message_to_memory(
                        transaction_id=transaction.transaction_id,
                        role="assistant",
                        content=ai_response[:500],
                        tools_used=["ai_analysis"]
                    )
            
            # Store the AI response in memory if available
            if memory_store:
                await memory_store.add_message_to_memory(
                    transaction_id=transaction.transaction_id,
                    role="assistant",
                    content=ai_response[:500]  # Limit length
                )
            
            # Read the FINAL agent response from the completed thread
            if conversation_handler:
                final_ai_response = self._get_final_agent_response_from_thread(
                    thread_id, 
                    conversation_handler.agents_client
                )
                if final_ai_response and final_ai_response != ai_response:
                    logger.info(f"📝 Using final thread response instead of initial response")
                    logger.info(f"📝 Initial response length: {len(ai_response)}")
                    logger.info(f"📝 Final thread response length: {len(final_ai_response)}")
                    ai_response = final_ai_response
            
            # Extract recommendation and risk score from AI response
            ai_recommendation = self._extract_ai_recommendation(ai_response)
            ai_risk_score = self._extract_ai_risk_score(ai_response)
            
            # Log the extraction for debugging with more detail
            logger.info(f"🔍 AI Response Decision Extraction: Extracted '{ai_recommendation}' from response")
            logger.info(f"🔍 AI Response Risk Score Extraction: Extracted '{ai_risk_score}' from response")
            logger.info(f"🔍 AI Response preview (first 300 chars): {ai_response[:300]}...")
            if not ai_recommendation:
                logger.warning(f"❌ Could not extract clear decision from AI response. Full response: {ai_response}")
            else:
                logger.info(f"✅ Successfully extracted AI recommendation: {ai_recommendation}")
            if not ai_risk_score:
                logger.warning(f"❌ Could not extract AI risk score from response")
            else:
                logger.info(f"✅ Successfully extracted AI risk score: {ai_risk_score}")
            
            return ai_response, ai_recommendation, ai_risk_score
            
        except Exception as e:
            logger.error(f"AI analysis failed: {e}")
            return f"AI analysis failed: {str(e)}", None, None
    
    def _build_ai_context(
        self,
        transaction: TransactionInput,
        stage1_result: Stage1Result,
        fraud_tools_instance=None,
        similar_decisions=None
    ) -> str:
        """Build comprehensive context for AI analysis"""
        
        context = f"""
TRANSACTION ANALYSIS REQUEST - STAGE 2 INVESTIGATION

Current Transaction:
- ID: {transaction.transaction_id} | Amount: ${transaction.amount:,.2f} {transaction.currency}
- Customer: {transaction.customer_id} | Category: {transaction.merchant_category}
- Location: {transaction.location_country} | Time: {transaction.timestamp.isoformat()}

Stage 1 Results:
- Risk Score: {stage1_result.combined_score:.1f}/100 (Rules: {stage1_result.rule_score:.1f}, ML: {stage1_result.basic_ml_score or 'N/A'})
- Flags: {stage1_result.rule_flags if stage1_result.rule_flags else 'None'}

AVAILABLE TOOLS:
1. analyze_transaction_patterns() - Customer behavioral analysis
2. search_similar_transactions() - Vector similarity search
3. calculate_network_risk() - Network/fraud ring analysis  
4. check_sanctions_lists() - PEP/sanctions screening
5. SuspiciousReportsAgent - Historical SAR analysis

TOOL SELECTION STRATEGY - CREATE YOUR OWN:
Analyze the transaction data and Stage 1 risk score to create a focused tool selection strategy.

FIRST: Share your tool selection strategy and reasoning:
- Which tools will you use based on this transaction's characteristics?
- Why are these tools most relevant for this risk score ({stage1_result.combined_score:.1f}/100)?
- What specific fraud patterns are you looking for?

CHAIN OF THOUGHT:
1. Risk Assessment: Given the Stage 1 score, what level of investigation is needed?
2. Transaction Profile: What stands out about this transaction (amount, location, category, timing)?
3. Tool Priority: Which tools provide the most value for this specific case?

Be concise in your strategy explanation.
"""
        
        # Add memory context AFTER tool selection strategy  
        if similar_decisions and len(similar_decisions) > 0:
            context += f"""

MEMORY CONTEXT:
Found {len(similar_decisions)} similar past decisions:
"""
            for i, decision in enumerate(similar_decisions[:2], 1):
                effectiveness = decision.get('outcome', {}).get('effectiveness_score', 'Unknown')
                if isinstance(effectiveness, (int, float)):
                    effectiveness = f"{effectiveness:.0%}"
                
                context += f"""
{i}. Decision: {decision.get('decision', {}).get('action', 'Unknown')} | Score: {decision.get('decision', {}).get('risk_score', 0):.0f}/100 | Effectiveness: {effectiveness}
"""
            
            # Show average effectiveness
            valid_scores = [d.get('outcome', {}).get('effectiveness_score') for d in similar_decisions 
                          if isinstance(d.get('outcome', {}).get('effectiveness_score'), (int, float))]
            if valid_scores:
                avg_effectiveness = sum(valid_scores) / len(valid_scores)
                context += f"Average effectiveness: {avg_effectiveness:.0%}\n"
        
        context += f"""
RESPONSE FORMAT:
1. Tool Selection Strategy & Execution (your Chain of Thought analysis)
2. Risk Assessment with tool findings
3. **REQUIRED DECISION**: You MUST include one of these exact phrases in your response:
   - "Recommendation: APPROVE" (for low-risk, legitimate transactions)
   - "Recommendation: INVESTIGATE" (for medium-risk requiring more review)
   - "Recommendation: ESCALATE" (for high-risk requiring senior review)
   - "Recommendation: BLOCK" (for confirmed fraud or very high risk)
4. Key reasoning for your decision

Important: Always include "Recommendation: [DECISION]" explicitly in your response.
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
    
    def _get_final_agent_response_from_thread(self, thread_id: str, agents_client) -> Optional[str]:
        """Get the final agent response from completed thread conversation"""
        try:
            # Get all messages from the thread after conversation completes
            messages = agents_client.messages.list(thread_id=thread_id, order="desc", limit=10)
            
            # Find the last assistant message (final agent response)
            for message in messages:
                if message.role == "assistant" and message.content:
                    # Get the text content from the message
                    if hasattr(message.content, '__iter__'):
                        for content_block in message.content:
                            if hasattr(content_block, 'text') and hasattr(content_block.text, 'value'):
                                final_response = content_block.text.value
                                logger.info(f"📨 Found final agent response: {len(final_response)} characters")
                                return final_response
                    elif hasattr(message.content, 'text'):
                        final_response = message.content.text.value if hasattr(message.content.text, 'value') else str(message.content.text)
                        logger.info(f"📨 Found final agent response: {len(final_response)} characters")
                        return final_response
                    else:
                        final_response = str(message.content)
                        logger.info(f"📨 Found final agent response (string): {len(final_response)} characters")
                        return final_response
            
            logger.warning("❌ No final assistant message found in thread")
            return None
            
        except Exception as e:
            logger.error(f"❌ Failed to get final agent response from thread: {e}")
            return None
    
    def _extract_ai_risk_score(self, ai_response: str) -> Optional[float]:
        """Extract AI's risk score from response"""
        if not ai_response:
            return None
            
        import re
        
        # Look for "Risk Score: X/100" or "Risk Score: X"
        risk_patterns = [
            r"risk score:?\s*(\d+(?:\.\d+)?)/100",
            r"risk score:?\s*(\d+(?:\.\d+)?)\s*(?:/100)?",
            r"score:?\s*(\d+(?:\.\d+)?)/100",
        ]
        
        for pattern in risk_patterns:
            match = re.search(pattern, ai_response.lower())
            if match:
                score = float(match.group(1))
                return score if score <= 100 else score  # Handle both 0-100 and 0-1 scales
                
        return None

    def _extract_ai_recommendation(self, ai_response: str) -> Optional[DecisionType]:
        """Extract decision recommendation from AI response"""
        if not ai_response:
            return None
        
        response_lower = ai_response.lower()
        
        # Look for explicit recommendations with various formats
        # BLOCK patterns
        if any(pattern in response_lower for pattern in [
            "recommend: block", "recommendation: block", "recommendation:** block",
            "decision: block", "**block**", "reject this transaction",
            "should be blocked", "recommend blocking", "block this transaction",
            "high risk - block", "fraudulent", "deny this transaction"
        ]):
            return DecisionType.BLOCK
            
        # APPROVE patterns
        elif any(pattern in response_lower for pattern in [
            "recommend: approve", "recommendation: approve", "recommendation:** approve",
            "decision: approve", "**approve**", "approve this transaction",
            "should be approved", "appears legitimate", "low risk - approve",
            "safe to proceed", "legitimate transaction", "can be approved"
        ]):
            return DecisionType.APPROVE
            
        # ESCALATE patterns
        elif any(pattern in response_lower for pattern in [
            "recommend: escalate", "recommendation: escalate", "recommendation:** escalate",
            "decision: escalate", "**escalate**", "requires escalation",
            "escalate immediately", "escalate for review", "needs senior review",
            "manual review required", "escalate to compliance"
        ]):
            return DecisionType.ESCALATE
            
        # INVESTIGATE patterns
        elif any(pattern in response_lower for pattern in [
            "recommend: investigate", "recommendation: investigate", "recommendation:** investigate",
            "decision: investigate", "**investigate**", "needs investigation",
            "further investigation", "requires investigation", "investigate further",
            "additional review needed", "more analysis required"
        ]):
            return DecisionType.INVESTIGATE
        
        # Final fallback based on risk language
        if "high risk" in response_lower or "very suspicious" in response_lower:
            return DecisionType.BLOCK
        elif "low risk" in response_lower or "no concerns" in response_lower:
            return DecisionType.APPROVE
        elif "medium risk" in response_lower or "moderate risk" in response_lower:
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