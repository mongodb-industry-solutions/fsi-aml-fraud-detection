"""
Azure AI Foundry SDK - Methods to Find Agent Name for a Thread
"""
# Add parent directory to path to import our modules
from pathlib import Path    
import sys
sys.path.append(str(Path(__file__).parent.parent))

from logging_setup import setup_logging, get_logger
setup_logging()
from azure.ai.projects import AIProjectClient
from azure.ai.agents import AgentsClient
from azure.identity import DefaultAzureCredential
from typing import Optional, Dict, Any

from dotenv import load_dotenv

load_dotenv(dotenv_path=Path(__file__).parent.parent.parent / "backend" / ".env")
logger = get_logger(__name__)

def setup_client(endpoint: str) -> AIProjectClient:
    """Setup the Azure AI Foundry client"""
    credential = DefaultAzureCredential()
    client = AIProjectClient(
        endpoint=endpoint,
        credential=credential
    )
    return client


# METHOD 1: Get Agent from Thread's Run History
def get_agent_name_from_runs(agents_client: AgentsClient, thread_id: str) -> Optional[str]:
    """
    Get agent name by checking the thread's run history.
    This is the most reliable method as runs always have an agent_id.
    """
    try:
        # List all runs for this thread
        runs = agents_client.runs.list(thread_id=thread_id)
        
        for run in runs:
            if hasattr(run, 'agent_id') and run.agent_id:
                # Get the agent/assistant details
                agent = agents_client.get_agent(agent_id=run.agent_id)
                if agent and hasattr(agent, 'name'):
                    return agent.name

                    
    except Exception as e:
        print(f"Error getting agent from runs: {e}")
    
    return None


# METHOD 2: Get Agent from Thread Messages
def get_agent_name_from_messages(agents_client: AgentsClient, thread_id: str) -> Optional[str]:
    """
    Get agent name by checking messages in the thread.
    Assistant messages will have an assistant_id field.
    """
    try:
        # List messages in the thread
        messages = agents_client.messages.list(thread_id=thread_id)
        
        for message in messages:
            # Check if message is from an assistant
            if message.role == "assistant" and hasattr(message, 'agent_id'):
                if message.agent_id:
                    # Get the agent/assistant details
                    agent = agents_client.get_agent(agent_id=message.agent_id)
                    if agent and hasattr(agent, 'name'):
                        return agent.name
                        
    except Exception as e:
        print(f"Error getting agent from messages: {e}")
    
    return None


# METHOD 3: Check Thread Metadata
def get_agent_name_from_metadata(agents_client: AgentsClient, thread_id: str) -> Optional[str]:
    """
    Get agent name from thread metadata.
    This only works if you've stored the agent name in metadata when creating the thread.
    """
    try:
        # Get the thread object
        thread = agents_client.threads.get(thread_id=thread_id)
        
        if hasattr(thread, 'metadata') and thread.metadata:
            # Check various possible metadata keys
            metadata_keys = ['agent_name', 'assistant_name', 'agent', 'assistant']
            
            for key in metadata_keys:
                if key in thread.metadata:
                    return thread.metadata[key]
                    
    except Exception as e:
        print(f"Error getting agent from metadata: {e}")
    
    return None


# METHOD 4: Comprehensive Check (Try All Methods)
def get_agent_name_for_thread(agents_client: AgentsClient, thread_id: str) -> Optional[str]:
    """
    Try all methods to find the agent name for a thread.
    Returns the first agent name found.
    """
    # Try Method 1: Check runs (most reliable)
    agent_name = get_agent_name_from_runs(agents_client, thread_id)
    if agent_name:
        print(f"Found agent '{agent_name}' from thread runs")
        return agent_name
    
    # Try Method 2: Check messages
    agent_name = get_agent_name_from_messages(agents_client, thread_id)
    if agent_name:
        print(f"Found agent '{agent_name}' from thread messages")
        return agent_name
    
    # Try Method 3: Check metadata
    agent_name = get_agent_name_from_metadata(agents_client, thread_id)
    if agent_name:
        print(f"Found agent '{agent_name}' from thread metadata")
        return agent_name
    
    print(f"No agent found for thread {thread_id}")
    return None


# BONUS: Get All Thread Details Including Agent
def get_thread_details(agents_client: AgentsClient, thread_id: str) -> Dict[str, Any]:
    """
    Get comprehensive details about a thread including agent information.
    """
    details = {
        "thread_id": thread_id,
        "agent_name": None,
        "agent_id": None,
        "message_count": 0,
        "last_run_status": None,
        "metadata": {}
    }
    
    try:
        # Get thread metadata
        thread = agents_client.threads.get(thread_id=thread_id)
        if hasattr(thread, 'metadata'):
            details["metadata"] = thread.metadata or {}
        
        # Count messages
        messages = list(agents_client.messages.list(thread_id=thread_id))
        details["message_count"] = len(messages)
        
        # Get latest run info
        runs = list(agents_client.runs.list(thread_id=thread_id))
        if runs:
            latest_run = runs[0]  # Assuming ordered by recency
            details["last_run_status"] = latest_run.status if hasattr(latest_run, 'status') else None
            
            if hasattr(latest_run, 'agent_id') and latest_run.agent_id:
                details["agent_id"] = latest_run.agent_id
                
                # Get agent name
                try:
                    agent = agents_client.get_agent(agent_id=latest_run.agent_id)
                    if agent and hasattr(agent, 'name'):
                        details["agent_name"] = agent.name
                except:
                    pass
                    
    except Exception as e:
        print(f"Error getting thread details: {e}")
    
    return details


# Example Usage
def list_all_threads_with_agents(agents_client: AgentsClient, max_threads: int = 20) -> None:
    """List threads in the Azure AI project with their associated agent names"""
    try:
        print(f"📋 Listing threads with their associated agents...")
        threads = agents_client.threads.list()
        
        # Convert to list to handle ItemPaged properly
        threads_list = list(threads)
        
        if not threads_list:
            print("  No threads found")
            return
        
        total_threads = len(threads_list)
        threads_to_process = threads_list[:max_threads] if max_threads else threads_list
        threads_with_agents = 0
        
        print(f"Processing {len(threads_to_process)} of {total_threads} threads...")
        print()
        
        for i, thread in enumerate(threads_to_process, 1):
            print(f"  {i:3d}. Thread ID: {thread.id}")
            
            # Try to get agent name and ID for this thread (suppress individual method prints)
            agent_name = None
            agent_id = None
            try:
                # Try Method 1: Check runs first (most reliable)
                runs = list(agents_client.runs.list(thread_id=thread.id))
                for run in runs:
                    if hasattr(run, 'agent_id') and run.agent_id:
                        agent_id = run.agent_id
                        agent = agents_client.get_agent(agent_id=run.agent_id)
                        if agent and hasattr(agent, 'name'):
                            agent_name = agent.name
                            break
                
                # If no agent found from runs, try messages
                if not agent_name:
                    messages = list(agents_client.messages.list(thread_id=thread.id))
                    for message in messages:
                        if message.role == "assistant" and hasattr(message, 'agent_id') and message.agent_id:
                            agent_id = message.agent_id
                            agent = agents_client.get_agent(agent_id=message.agent_id)
                            if agent and hasattr(agent, 'name'):
                                agent_name = agent.name
                                break
                                
            except Exception as e:
                # Silent fail for individual threads
                pass
            
            if agent_name and agent_id:
                print(f"       🤖 Agent: {agent_name} (ID: {agent_id})")
                threads_with_agents += 1
            else:
                print(f"       ❓ No agent found")
            
            # Show metadata if available
            if hasattr(thread, 'metadata') and thread.metadata:
                print(f"       📋 Metadata: {thread.metadata}")
            
            print()
        
        if max_threads and total_threads > max_threads:
            print(f"📊 Summary: {threads_with_agents}/{len(threads_to_process)} threads shown have agents (total threads in project: {total_threads})")
        else:
            print(f"📊 Summary: {threads_with_agents}/{total_threads} threads have associated agents")
            
    except Exception as e:
        print(f"Error listing threads: {e}")

def delete_threads_without_agents(agents_client: AgentsClient, dry_run: bool = True) -> None:
    """Delete threads that don't have associated agents"""
    try:
        print("🗑️  Analyzing threads for deletion...")
        threads = list(agents_client.threads.list())
        
        threads_to_delete = []
        total_threads = len(threads)
        
        print(f"Scanning {total_threads} threads...")
        
        for i, thread in enumerate(threads, 1):
            if i % 50 == 0:  # Progress indicator
                print(f"  Processed {i}/{total_threads} threads...")
            
            agent_name = None
            agent_id = None
            try:
                # Quick check for agent in runs
                runs = list(agents_client.runs.list(thread_id=thread.id))
                for run in runs:
                    if hasattr(run, 'agent_id') and run.agent_id:
                        agent_id = run.agent_id
                        agent = agents_client.get_agent(agent_id=run.agent_id)
                        if agent and hasattr(agent, 'name'):
                            agent_name = agent.name
                            break
                
                # If no agent found from runs, try messages
                if not agent_name:
                    messages = list(agents_client.messages.list(thread_id=thread.id))
                    for message in messages:
                        if message.role == "assistant" and hasattr(message, 'agent_id') and message.agent_id:
                            agent_id = message.agent_id
                            agent = agents_client.get_agent(agent_id=message.agent_id)
                            if agent and hasattr(agent, 'name'):
                                agent_name = agent.name
                                break
                                
            except Exception:
                pass
            
            # If no agent found, mark for deletion
            if not agent_name and not agent_id:
                threads_to_delete.append(thread.id)
        
        print(f"\n📋 Deletion Analysis:")
        print(f"  Total threads: {total_threads}")
        print(f"  Threads without agents: {len(threads_to_delete)}")
        print(f"  Threads with agents: {total_threads - len(threads_to_delete)}")
        
        if not threads_to_delete:
            print("\n✅ No threads to delete - all threads have associated agents!")
            return
        
        if dry_run:
            print(f"\n🔍 DRY RUN - Would delete {len(threads_to_delete)} threads:")
            for i, thread_id in enumerate(threads_to_delete[:10], 1):  # Show first 10
                try:
                    # Get some basic info about the thread
                    messages = list(agents_client.messages.list(thread_id=thread_id))
                    message_count = len(messages)
                    
                    # Check if thread has any metadata
                    thread_obj = agents_client.threads.get(thread_id=thread_id)
                    has_metadata = bool(hasattr(thread_obj, 'metadata') and thread_obj.metadata)
                    
                    print(f"  {i:3d}. {thread_id} (Messages: {message_count}, Metadata: {'Yes' if has_metadata else 'No'})")
                except Exception:
                    print(f"  {i:3d}. {thread_id} (Could not get details)")
                    
            if len(threads_to_delete) > 10:
                print(f"  ... and {len(threads_to_delete) - 10} more")
            print(f"\n💡 Use --delete-confirm to actually delete these threads")
        else:
            print(f"\n⚠️  DELETING {len(threads_to_delete)} threads without agents...")
            
            deleted_count = 0
            failed_count = 0
            
            for i, thread_id in enumerate(threads_to_delete, 1):
                try:
                    agents_client.threads.delete(thread_id=thread_id)
                    deleted_count += 1
                    if i % 10 == 0:
                        print(f"  Deleted {i}/{len(threads_to_delete)} threads...")
                except Exception as e:
                    failed_count += 1
                    print(f"  ❌ Failed to delete {thread_id}: {e}")
            
            print(f"\n📊 Deletion Results:")
            print(f"  ✅ Successfully deleted: {deleted_count}")
            print(f"  ❌ Failed to delete: {failed_count}")
            print(f"  📈 Success rate: {(deleted_count/len(threads_to_delete)*100):.1f}%")
            
    except Exception as e:
        print(f"Error during thread deletion: {e}")

def get_agent_usage_summary(agents_client: AgentsClient) -> None:
    """Get a summary of agent usage across all threads"""
    try:
        print("📊 Analyzing agent usage across all threads...")
        threads = list(agents_client.threads.list())
        
        agent_counts = {}
        agent_ids = {}  # Track agent IDs for each agent name
        total_threads = len(threads)
        threads_with_agents = 0
        
        for i, thread in enumerate(threads, 1):
            if i % 50 == 0:  # Progress indicator
                print(f"  Processed {i}/{total_threads} threads...")
            
            agent_name = None
            agent_id = None
            try:
                # Quick check for agent in runs
                runs = list(agents_client.runs.list(thread_id=thread.id))
                for run in runs:
                    if hasattr(run, 'agent_id') and run.agent_id:
                        agent_id = run.agent_id
                        agent = agents_client.get_agent(agent_id=run.agent_id)
                        if agent and hasattr(agent, 'name'):
                            agent_name = agent.name
                            break
            except Exception:
                pass
                
            if agent_name and agent_id:
                threads_with_agents += 1
                agent_counts[agent_name] = agent_counts.get(agent_name, 0) + 1
                agent_ids[agent_name] = agent_id  # Store the agent ID
        
        print(f"\n📈 Agent Usage Summary:")
        print(f"  Total threads: {total_threads}")
        print(f"  Threads with agents: {threads_with_agents}")
        print(f"  Threads without agents: {total_threads - threads_with_agents}")
        print(f"\n🤖 Agent breakdown:")
        
        for agent_name, count in sorted(agent_counts.items(), key=lambda x: x[1], reverse=True):
            percentage = (count / total_threads) * 100
            agent_id = agent_ids.get(agent_name, "Unknown")
            print(f"  {agent_name} (ID: {agent_id}): {count} threads ({percentage:.1f}%)")
            
    except Exception as e:
        print(f"Error analyzing agent usage: {e}")

def main():
    import os
    
    # Setup
    project_endpoint = os.getenv("AZURE_FOUNDRY_PROJECT_ENDPOINT")
    if not project_endpoint:
        print("Please set AZURE_FOUNDRY_PROJECT_ENDPOINT environment variable")
        return
    
    client = setup_client(project_endpoint)
    agents_client = client.agents
    
    print("🔗 Connected to Azure AI Foundry successfully!")
    
    # List threads with their associated agents (first 20 by default)
    # Change max_threads=None to list ALL threads (may take a while for large projects)
    
    import sys
    if len(sys.argv) > 1:
        if sys.argv[1] == "--all":
            print("🔍 Listing ALL threads (this may take a while)...")
            list_all_threads_with_agents(agents_client, max_threads=None)
        elif sys.argv[1] == "--summary":
            get_agent_usage_summary(agents_client)
        elif sys.argv[1] == "--delete-dry-run":
            print("🔍 DRY RUN: Analyzing threads for deletion...")
            delete_threads_without_agents(agents_client, dry_run=True)
        elif sys.argv[1] == "--delete-confirm":
            print("⚠️  DANGER: This will permanently delete threads without agents!")
            print("🔍 First, let's see what would be deleted...")
            delete_threads_without_agents(agents_client, dry_run=True)
            print("\n" + "="*60)
            print("⚠️  FINAL WARNING: This action cannot be undone!")
            confirm1 = input("Type 'DELETE' (in capitals) to proceed: ")
            if confirm1 == 'DELETE':
                confirm2 = input("Type the number of threads that will be deleted to confirm: ")
                try:
                    # Get the actual count to verify
                    threads = list(agents_client.threads.list())
                    threads_to_delete = []
                    for thread in threads:
                        agent_found = False
                        try:
                            runs = list(agents_client.runs.list(thread_id=thread.id))
                            for run in runs:
                                if hasattr(run, 'agent_id') and run.agent_id:
                                    agent_found = True
                                    break
                        except:
                            pass
                        if not agent_found:
                            threads_to_delete.append(thread.id)
                    
                    expected_count = len(threads_to_delete)
                    if confirm2 == str(expected_count):
                        print(f"✅ Confirmed! Proceeding to delete {expected_count} threads...")
                        delete_threads_without_agents(agents_client, dry_run=False)
                    else:
                        print(f"❌ Number mismatch! Expected {expected_count}, got {confirm2}. Operation cancelled.")
                except Exception as e:
                    print(f"❌ Error during confirmation: {e}")
            else:
                print("❌ Operation cancelled")
        else:
            print("Usage: python show_thread_and_agent_info.py [options]")
            print("Options:")
            print("  --all              : List all threads with agents")
            print("  --summary          : Show agent usage summary")
            print("  --delete-dry-run   : Preview threads that would be deleted (safe)")
            print("  --delete-confirm   : Actually delete threads without agents (DANGEROUS)")
            return
    else:
        print("💡 Options:")
        print("  python show_thread_and_agent_info.py --all              : List all threads with agents")
        print("  python show_thread_and_agent_info.py --summary          : Show agent usage summary")
        print("  python show_thread_and_agent_info.py --delete-dry-run   : Preview threads that would be deleted")
        print("  python show_thread_and_agent_info.py --delete-confirm   : Delete threads without agents")
        print()
        list_all_threads_with_agents(agents_client, max_threads=20)
    
    print("\n✅ Test script completed successfully!")


# Utility: Store Agent Name in Thread Metadata (For Future Reference)
def create_thread_with_agent_metadata(agents_client: AgentsClient, agent_name: str, agent_id: str) -> str:
    """
    Create a thread and store agent information in metadata for easy retrieval.
    This is a best practice for tracking agent associations.
    """
    thread = agents_client.threads.create(
        metadata={
            "agent_name": agent_name,
            "agent_id": agent_id,
            "created_for": "specific_agent"
        }
    )
    return thread.id


if __name__ == "__main__":
    main()