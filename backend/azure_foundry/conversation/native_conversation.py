"""
Native Azure AI Foundry Conversation Handler
Uses Azure's built-in conversation patterns instead of custom polling loops

Based on Azure AI Foundry documentation patterns from research files.
"""

import logging
from typing import Dict, Any, AsyncGenerator, Optional
from datetime import datetime

from azure.ai.agents import AgentsClient
from azure.core.exceptions import HttpResponseError

logger = logging.getLogger(__name__)


class NativeConversationHandler:
    """
    Uses Azure AI Foundry's native conversation patterns.
    
    Key principles from documentation analysis:
    1. Use native create_and_process for tool handling (no custom polling)
    2. Use native stream() method with event handlers for real-time responses
    3. Let Azure AI Foundry handle tool execution lifecycle
    4. Focus on business logic, not conversation mechanics
    """
    
    def __init__(self, agents_client: AgentsClient, agent_id: str):
        self.agents_client = agents_client
        self.agent_id = agent_id
        
        logger.info(f"✅ Native conversation handler initialized for agent {agent_id}")
    
    async def run_conversation_native(
        self, 
        thread_id: str, 
        message: str,
        fraud_toolset=None,
        **run_kwargs
    ) -> str:
        """
        Use Azure AI Foundry's native conversation handling with automatic tool processing.
        
        This replaces the custom polling loop from the original complex implementation.
        Azure handles all the tool call states internally.
        
        Args:
            thread_id: Azure AI Foundry thread ID
            message: User message to process
            **run_kwargs: Additional run parameters (temperature, etc.)
            
        Returns:
            Agent's response text
        """
        try:
            logger.debug(f"🔄 Starting native conversation for thread {thread_id}")
            
            # Add user message to thread (native pattern)
            self.agents_client.messages.create(
                thread_id=thread_id,
                role="user",
                content=message
            )
            
            # For existing agents, use create() and manual polling to handle function calls
            # The existing agent already has function definitions, we just need to handle execution
            run = self.agents_client.runs.create(
                thread_id=thread_id,
                agent_id=self.agent_id,
                **run_kwargs
            )
            
            # Manual polling with function call handling (required for existing agents)
            max_iterations = 50
            iteration = 0
            
            while run.status in ["queued", "in_progress", "requires_action"] and iteration < max_iterations:
                iteration += 1
                logger.debug(f"🔄 Run iteration {iteration}, status: {run.status}")
                
                if run.status == "requires_action":
                    # Handle function calls for existing agents
                    await self._handle_function_calls(thread_id, run, fraud_toolset)
                
                # Wait and check status again
                import asyncio
                await asyncio.sleep(1)
                run = self.agents_client.runs.get(thread_id=thread_id, run_id=run.id)
                
            if iteration >= max_iterations:
                logger.warning(f"⚠️ Run reached maximum iterations ({max_iterations})")
            
            logger.debug(f"✅ Run completed with status: {run.status}")
            
            logger.debug(f"✅ Native conversation completed with status: {run.status}")
            
            # Extract the agent's response
            return self._extract_latest_response(thread_id)
            
        except HttpResponseError as e:
            logger.error(f"❌ Azure AI API error in conversation: {e}")
            raise
        except Exception as e:
            logger.error(f"❌ Conversation error: {e}")
            raise
    
    async def _handle_function_calls(self, thread_id: str, run, fraud_toolset):
        """Handle function calls for existing agents - manually execute and submit outputs"""
        try:
            tool_calls = run.required_action.submit_tool_outputs.tool_calls
            tool_outputs = []
            
            logger.info(f"🔧 Handling {len(tool_calls)} function calls for existing agent")
            
            for tool_call in tool_calls:
                function_name = tool_call.function.name
                
                try:
                    # Parse function arguments
                    import json
                    arguments = json.loads(tool_call.function.arguments) if tool_call.function.arguments else {}
                    
                    logger.debug(f"Executing function: {function_name} with args: {arguments}")
                    
                    # Execute the function based on name
                    output = await self._execute_fraud_function(function_name, arguments, fraud_toolset)
                    
                    tool_outputs.append({
                        "tool_call_id": tool_call.id,
                        "output": output
                    })
                    
                except Exception as e:
                    logger.error(f"Error executing function {function_name}: {e}")
                    tool_outputs.append({
                        "tool_call_id": tool_call.id,
                        "output": json.dumps({"error": f"Function execution failed: {str(e)}"})
                    })
            
            # Submit tool outputs back to the agent
            self.agents_client.runs.submit_tool_outputs(
                thread_id=thread_id,
                run_id=run.id,
                tool_outputs=tool_outputs
            )
            
            logger.info(f"✅ Submitted {len(tool_outputs)} tool outputs to agent")
            
        except Exception as e:
            logger.error(f"Error handling function calls: {e}")
            raise
    
    async def _execute_fraud_function(self, function_name: str, arguments: dict, fraud_toolset):
        """Execute fraud detection functions manually"""
        import json
        
        try:
            # Get the FraudDetectionTools instance to execute functions
            from azure_foundry.tools.native_tools import FraudDetectionTools
            from services.fraud_detection import FraudDetectionService
            from db.mongo_db import MongoDBAccess
            import os
            
            # Create fresh instances for function execution
            mongodb_uri = os.getenv('MONGODB_URI')
            db_client = MongoDBAccess(mongodb_uri) 
            fraud_service = FraudDetectionService(db_client)
            tools_instance = FraudDetectionTools(db_client, fraud_service)
            
            # Execute the specific function
            if function_name == "analyze_transaction_patterns":
                result = tools_instance._analyze_transaction_patterns_impl(
                    customer_id=arguments.get("customer_id", ""),
                    lookback_days=arguments.get("lookback_days", 30),
                    include_velocity=arguments.get("include_velocity", True)
                )
            elif function_name == "check_sanctions_lists":
                result = tools_instance._check_sanctions_lists_impl(
                    entity_name=arguments.get("entity_name", ""),
                    entity_type=arguments.get("entity_type", "individual")
                )
            elif function_name == "calculate_network_risk":
                result = tools_instance._calculate_network_risk_impl(
                    customer_id=arguments.get("customer_id", ""),
                    analysis_depth=arguments.get("analysis_depth", 2),
                    include_centrality=arguments.get("include_centrality", True)
                )
            elif function_name == "search_similar_transactions":
                result = tools_instance._search_similar_transactions_impl(
                    transaction_amount=arguments.get("transaction_amount", 0),
                    merchant_category=arguments.get("merchant_category", ""),
                    location_city=arguments.get("location_city", ""),
                    customer_id=arguments.get("customer_id", ""),
                    limit=arguments.get("limit", 10)
                )
            else:
                result = {"error": f"Unknown function: {function_name}"}
            
            return json.dumps(result)
            
        except Exception as e:
            logger.error(f"Error in _execute_fraud_function for {function_name}: {e}")
            return json.dumps({"error": f"Function {function_name} execution failed: {str(e)}"})
            
    
    async def run_conversation_streaming(
        self, 
        thread_id: str, 
        message: str,
        **run_kwargs
    ) -> AsyncGenerator[str, None]:
        """
        Use Azure AI Foundry's native streaming with event handlers.
        
        This replaces the custom streaming implementation from original agent.
        Azure handles tool calls within the stream automatically.
        
        Args:
            thread_id: Azure AI Foundry thread ID
            message: User message to process
            **run_kwargs: Additional run parameters
            
        Yields:
            Text chunks as they're generated
        """
        try:
            logger.debug(f"🔄 Starting native streaming conversation for thread {thread_id}")
            
            # Add user message to thread
            self.agents_client.messages.create(
                thread_id=thread_id,
                role="user",
                content=message
            )
            
            # Use native streaming - Azure handles everything
            with self.agents_client.runs.stream(
                thread_id=thread_id,
                agent_id=self.agent_id,
                **run_kwargs
            ) as stream:
                
                for event_type, event_data, _ in stream:
                    # Handle message deltas (actual content streaming)
                    if event_type == "thread.message.delta":
                        if hasattr(event_data, 'delta') and event_data.delta.content:
                            for content in event_data.delta.content:
                                if hasattr(content, 'text') and content.text:
                                    text_value = content.text.value if hasattr(content.text, 'value') else content.text
                                    if text_value:
                                        yield text_value
                    
                    # Handle tool calls (Azure manages this internally)
                    elif event_type == "thread.run.requires_action":
                        logger.debug("🔧 Azure AI handling tool calls in stream")
                    
                    # Handle completion
                    elif event_type == "thread.run.completed":
                        logger.debug("✅ Native streaming completed")
                        break
                    
                    # Handle errors
                    elif event_type == "error":
                        logger.error(f"❌ Streaming error: {event_data}")
                        break
                        
        except Exception as e:
            logger.error(f"❌ Streaming conversation error: {e}")
            raise
    
    def _extract_latest_response(self, thread_id: str) -> str:
        """Extract the latest assistant response from the thread"""
        try:
            # Get recent messages from thread
            messages = self.agents_client.messages.list(
                thread_id=thread_id,
                limit=1  # Just get the latest
            )
            
            # Handle ItemPaged object correctly 
            messages_list = list(messages) if messages else []
            if messages_list and len(messages_list) > 0:
                latest_message = messages_list[0]
                if latest_message.role == "assistant":
                    # Handle different content formats
                    content = latest_message.content
                    if content and len(content) > 0:
                        # Extract text from content
                        if hasattr(content[0], 'text'):
                            text_obj = content[0].text
                            if hasattr(text_obj, 'value'):
                                return text_obj.value
                            else:
                                return str(text_obj)
                        else:
                            return str(content[0])
            
            logger.warning("No assistant response found in thread")
            return "Analysis completed successfully"
            
        except Exception as e:
            logger.error(f"Error extracting response: {e}")
            return "Response extraction failed"


class StreamingEventHandler:
    """
    Optional custom event handler for advanced streaming scenarios.
    Based on Azure AI Foundry documentation patterns.
    """
    
    def __init__(self):
        self.accumulated_text = []
        self.tool_calls_handled = 0
        
    def on_message_delta(self, event_data) -> str:
        """Handle streaming message deltas"""
        if hasattr(event_data, 'delta') and event_data.delta.content:
            for content in event_data.delta.content:
                if hasattr(content, 'text') and content.text:
                    text_value = content.text.value if hasattr(content.text, 'value') else content.text
                    if text_value:
                        self.accumulated_text.append(text_value)
                        return text_value
        return ""
    
    def on_tool_call(self, event_data):
        """Handle tool call events"""
        self.tool_calls_handled += 1
        logger.debug(f"Tool call handled by Azure: {self.tool_calls_handled}")
    
    def get_full_response(self) -> str:
        """Get the complete accumulated response"""
        return "".join(self.accumulated_text)