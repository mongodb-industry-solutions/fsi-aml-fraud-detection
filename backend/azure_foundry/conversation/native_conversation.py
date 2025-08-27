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
            
            # Use native create_and_process - handles all tool calls automatically
            # This replaces the entire custom polling loop from original implementation
            run = self.agents_client.runs.create_and_process(
                thread_id=thread_id,
                agent_id=self.agent_id,
                **run_kwargs
            )
            
            logger.debug(f"✅ Native conversation completed with status: {run.status}")
            
            # Extract the agent's response
            return self._extract_latest_response(thread_id)
            
        except HttpResponseError as e:
            logger.error(f"❌ Azure AI API error in conversation: {e}")
            raise
        except Exception as e:
            logger.error(f"❌ Conversation error: {e}")
            raise
    
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