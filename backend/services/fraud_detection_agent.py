# IMPORTANT: Import and configure logging FIRST
from logging_setup import setup_logging, get_logger
setup_logging()  # Configure logging

import json
import os
import asyncio
import logging
from typing import Dict, List
from datetime import datetime

from dotenv import load_dotenv
from azure.ai.agents import AgentsClient
from azure.ai.agents.models import (
    FunctionTool,
    ToolSet,
    ToolOutput,
    MessageRole,
    RunStatus,
)
from azure.identity import DefaultAzureCredential

from azure_foundry.embeddings import get_embedding
from services.fraud_detection import FraudDetectionService
from db.mongo_db import MongoDBAccess

# Configure logging to suppress Azure SDK verbose output
logging.getLogger("azure.core.pipeline.policies.http_logging_policy").setLevel(logging.WARNING)
logging.getLogger("azure.identity").setLevel(logging.WARNING)
logging.getLogger("azure.ai.agents").setLevel(logging.WARNING)
# Set up logging
logger = get_logger(__name__)


load_dotenv()

class FraudDetectionAgent:
    """Azure AI Foundry Agent for fraud detection"""
    
    def __init__(self):
        # Get configuration
        self.PROJECT_ENDPOINT = os.getenv("PROJECT_ENDPOINT")
        self.model = os.getenv("MODEL_DEPLOYMENT_NAME")
        
        if not self.PROJECT_ENDPOINT:
            raise ValueError("PROJECT_ENDPOINT environment variable is required")
        
        # Initialize clients
        credential = DefaultAzureCredential()
        self.agents_client = AgentsClient(
            endpoint=self.PROJECT_ENDPOINT, 
            credential=credential
        )
        
        # Initialize MongoDB and fraud service
        self.mongo_client = MongoDBAccess(os.getenv("MONGODB_URI"))
        self.fraud_service = FraudDetectionService(self.mongo_client)
        self.db = self.mongo_client.get_database(os.getenv("DB_NAME"))
        
        # Create the agent
        self.agent = self._create_agent()
        print(f"✅ Fraud Detection Agent created: {self.agent.id}")
    
    def get_customer_profile(self, customer_id: str) -> str:
        """Tool: Fetch customer profile from MongoDB."""
        try:
            collection = self.db["customers"]
            profile = collection.find_one({"_id": customer_id})
            return json.dumps(profile, default=str) if profile else json.dumps({"error": "No profile found"})
        except Exception as e:
            return json.dumps({"error": str(e)})
    
    def find_similar_transactions(self, embedding: List[float]) -> str:
        """Tool: Vector search on fraud_patterns collection."""
        try:
            collection = self.db["transactions"]
            
            pipeline = [
                {
                    "$vectorSearch": {
                        "index": "transaction_vector_index",
                        "path": "vector_embedding",
                        "queryVector": embedding,
                        "numCandidates": 200,
                        "limit": 15
                    }
                },
                {
                    "$project": {
                        "_id": 1,
                        "transaction_id": 1,
                        "timestamp": 1,
                        "amount": 1,
                        "merchant": 1,
                        "transaction_type": 1,
                        "payment_method": 1,
                        "risk_assessment": 1,
                        "score": {"$meta": "vectorSearchScore"}
                    }
                }
            ]
            
            results = list(collection.aggregate(pipeline))
            return json.dumps(results, default=str)
        except Exception as e:
            return json.dumps({"error": str(e), "results": []})
    
    def apply_basic_rules(self, transaction: Dict, profile: Dict) -> str:
        """Tool: Basic rule checks for fraud detection."""
        try:
            flags = []
            
            # Amount check
            behavioral_profile = profile.get("behavioral_profile", {})
            avg_amount = behavioral_profile.get("transaction_patterns", {}).get("avg_transaction_amount", 0)
            if avg_amount > 0 and transaction["amount"] > avg_amount * 3:
                flags.append("unusually_high_amount")
            
            # Location check
            usual_locations = behavioral_profile.get("transaction_patterns", {}).get("usual_transaction_locations", [])
            transaction_city = transaction.get("location", {}).get("city", "")
            if usual_locations and transaction_city not in [loc.get("city", "") for loc in usual_locations]:
                flags.append("unusual_location")
            
            # Time pattern check
            transaction_hour = datetime.fromisoformat(transaction.get("timestamp", "")).hour
            if transaction_hour < 6 or transaction_hour > 22:
                flags.append("unusual_time")
            
            # Amount threshold
            if transaction["amount"] > 10000:
                flags.append("high_value_transaction")
            
            return json.dumps({
                "flags": flags,
                "risk_indicators": len(flags),
                "amount_ratio": transaction["amount"] / max(avg_amount, 1)
            })
        except Exception as e:
            return json.dumps({"error": str(e), "flags": []})
    
    def analyze_transaction_with_profile(self, customer_id: str) -> str:
        """Tool: Analyze transaction with customer profile - combines profile retrieval and rule application."""
        try:
            # First get the customer profile
            profile_result = self.get_customer_profile(customer_id=customer_id)
            profile = json.loads(profile_result)
            
            if "error" in profile:
                return json.dumps({
                    "error": f"Could not retrieve customer profile: {profile.get('error', 'Unknown error')}",
                    "flags": [],
                    "risk_indicators": 0
                })
            
            # Get the transaction from the current context
            # This will be set by the evaluate_transaction method
            if not hasattr(self, 'current_transaction'):
                return json.dumps({
                    "error": "No transaction available for analysis",
                    "flags": [],
                    "risk_indicators": 0
                })
            
            # Then apply basic rules
            return self.apply_basic_rules(self.current_transaction, profile)
            
        except Exception as e:
            return json.dumps({"error": str(e), "flags": [], "risk_indicators": 0})
    
    def _create_agent(self):
        """Create agent with fraud detection tools"""
        
        # Create toolset
        toolset = ToolSet()
        
        # Create function tools
        functions = FunctionTool(
            functions={
                self.get_customer_profile,
                self.find_similar_transactions,
                self.analyze_transaction_with_profile,
            }
        )
        
        # Add to toolset
        toolset.add(functions)
        
        # Create agent with fraud detection instructions
        agent = self.agents_client.create_agent(
            model=self.model,
            name="Fraud Detection Agent",
            instructions="""You are an expert fraud detection agent for financial transactions.

            Your responsibilities:
            1. Analyze transactions for potential fraud using available tools
            2. Check customer behavioral patterns and risk profiles
            3. Apply rule-based checks for common fraud indicators
            4. Search for similar historical fraud patterns using vector search
            5. Make final decisions: APPROVE, BLOCK, or ESCALATE

            Workflow:
            1. Use get_customer_profile(customer_id) to retrieve customer information
            2. Use analyze_transaction_with_profile(customer_id, transaction) to apply fraud detection rules
            3. Use find_similar_transactions(embedding) to find similar transactions
            4. Make your final decision based on all findings

            Decision criteria:
            - APPROVE: Low risk, normal patterns, trusted customer behavior
            - BLOCK: High risk, multiple fraud indicators, suspicious patterns
            - ESCALATE: Medium risk, unclear patterns, needs human review

            Always provide:
            - Clear reasoning for your decision
            - Risk score (0-100)
            - Key factors that influenced the decision
            - Specific fraud indicators found
            - list of similar transactions found using find_similar_transactions

            Be thorough but efficient in your analysis.""",
            toolset=toolset,
        )
        
        return agent
    
    async def evaluate_transaction(self, transaction: Dict) -> Dict:
        """Evaluate a transaction for fraud using the AI agent"""
        
        try:
            # Store the transaction in the instance for use by the agent
            self.current_transaction = transaction
            
            # Generate embedding for the transaction
            transaction_text = self.fraud_service._create_transaction_text_representation(transaction)
            embedding = await get_embedding(transaction_text)
            
            # Create thread for this transaction
            thread = self.agents_client.threads.create()
            
            # Prepare transaction analysis prompt
            analysis_prompt = f"""
            Analyze this transaction for potential fraud:
            
            Transaction Details:
            {json.dumps(transaction, indent=2, default=str)}
                        
            Respond with your analysis and final decision.
            """
            
            # Add message to thread
            self.agents_client.messages.create(
                thread_id=thread.id,
                role=MessageRole.USER,
                content=analysis_prompt
            )
            
            # Run the agent
            run = self.agents_client.runs.create(
                thread_id=thread.id,
                agent_id=self.agent.id
            )
            
            # Handle the conversation loop
            loop_count = 0
            max_iterations = 50  # Add a safety limit
            while run.status in [RunStatus.QUEUED, RunStatus.IN_PROGRESS, RunStatus.REQUIRES_ACTION]:
                loop_count += 1
                print(f"🔄 Agent loop iteration: {loop_count} (Status: {run.status})")
                
                # Add safety check to prevent infinite loops
                if loop_count > max_iterations:
                    print(f"⚠️ Maximum iterations ({max_iterations}) reached. Stopping agent.")
                    break
                
                if run.status == RunStatus.REQUIRES_ACTION:
                    # Handle tool calls
                    tool_outputs = []
                    print(f"🔧 Processing {len(run.required_action.submit_tool_outputs.tool_calls)} tool calls...")
                    
                    for tool_call in run.required_action.submit_tool_outputs.tool_calls:
                        function_name = tool_call.function.name
                        arguments = json.loads(tool_call.function.arguments)
                        print(f"   Calling: {function_name} with args: {list(arguments.keys())}")
                        
                        # Execute the appropriate function
                        if function_name == "get_customer_profile":
                            result = self.get_customer_profile(**arguments)
                        elif function_name == "find_similar_transactions":
                            # Use the pre-generated embedding
                            result = self.find_similar_transactions(embedding)
                        elif function_name == "analyze_transaction_with_profile":
                                # Use the new combined function - only needs customer_id
                                customer_id = arguments.get("customer_id")
                                
                                if customer_id:
                                    result = self.analyze_transaction_with_profile(customer_id)
                                else:
                                    result = json.dumps({
                                        "error": f"Missing required argument for analyze_transaction_with_profile. Expected 'customer_id', got: {list(arguments.keys())}"
                                    })
                        else:
                            result = json.dumps({"error": f"Unknown function: {function_name}"})
                        
                        print(f"  ✅ {function_name} completed")
                        tool_outputs.append(
                            ToolOutput(tool_call_id=tool_call.id, output=result)
                        )
                    
                    # Submit tool outputs
                    run = self.agents_client.runs.submit_tool_outputs(
                        thread_id=thread.id,
                        run_id=run.id,
                        tool_outputs=tool_outputs
                    )
                    print(f"📤 Tool outputs submitted")
                
                # Wait before checking again
                await asyncio.sleep(1)
                
                # Refresh run status
                run = self.agents_client.runs.get(thread_id=thread.id, run_id=run.id)
            
            # Get the final response
            messages = self.agents_client.messages.list(thread_id=thread.id)
            
            # Find the agent's final response
            agent_response = None
            for msg in messages:
                if msg.role == MessageRole.AGENT:
                    agent_response = msg.content[0].text.value
                    break
            
            if not agent_response:
                return {
                    "decision": "ESCALATE",
                    "risk_score": 75,
                    "reasoning": "Agent failed to provide response",
                    # "embedding": embedding
                }
            
            # Parse the decision from the response
            decision = "ESCALATE"  # Default
            risk_score = 50  # Default
            
            # Simple parsing - look for decision keywords
            response_upper = agent_response.upper()
            if "APPROVE" in response_upper:
                decision = "APPROVE"
                risk_score = 25
            elif "BLOCK" in response_upper:
                decision = "BLOCK"
                risk_score = 90
            elif "ESCALATE" in response_upper:
                decision = "ESCALATE"
                risk_score = 60
            
            # Try to extract risk score if mentioned
            import re
            score_match = re.search(r'risk.{0,10}score.{0,10}(\d+)', response_upper)
            if score_match:
                risk_score = int(score_match.group(1))
            
            return {
                "decision": decision,
                "risk_score": risk_score,
                "reasoning": agent_response,
                # "embedding": embedding,
                "agent_analysis": True
            }
            
        except Exception as e:
            return {
                "decision": "ESCALATE",
                "risk_score": 80,
                "reasoning": f"Error during agent analysis: {str(e)}",
                # "embedding": None,
                "agent_analysis": False
            }

    def delete_agent(self):
        """Delete the current agent from Azure AI Agents"""
        try:
            if hasattr(self, 'agent') and self.agent:
                # Delete the agent
                self.agents_client.delete_agent(agent_id=self.agent.id)
                print(f"✅ Agent {self.agent.id} deleted successfully")
                
                # Clear the agent reference
                self.agent = None
                return True
            else:
                print("⚠️ No agent to delete")
                return False
        except Exception as e:
            print(f"❌ Error deleting agent: {str(e)}")
            return False

    def cleanup_resources(self):
        """Clean up all resources including agent and threads"""
        try:
            if hasattr(self, 'agent') and self.agent:
                # Delete the agent
                self.delete_agent()
            
            # Close MongoDB connection
            if hasattr(self, 'mongo_client'):
                self.mongo_client.client.close()
                print("✅ MongoDB connection closed")
            
            print("✅ All resources cleaned up")
            return True
        except Exception as e:
            print(f"❌ Error during cleanup: {str(e)}")
            return False
