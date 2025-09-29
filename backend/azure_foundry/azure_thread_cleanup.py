"""
Azure AI Foundry Script to Delete Threads
Enhanced version with options to delete specific threads, all threads, or by agent name

Usage:
    python azure_thread_cleanup.py --help
    python azure_thread_cleanup.py --dry-run
    python azure_thread_cleanup.py --delete-thread <thread_id>
    python azure_thread_cleanup.py --delete-all
    python azure_thread_cleanup.py --delete-by-agent <agent_name>
"""
import sys
import argparse
from pathlib import Path
sys.path.append(str(Path(__file__).parent.parent))

import os
from typing import List, Optional
from azure.ai.projects import AIProjectClient
from azure.identity import DefaultAzureCredential
from azure.core.exceptions import HttpResponseError
from logging_setup import setup_logging, get_logger
from dotenv import load_dotenv

load_dotenv(dotenv_path=Path(__file__).parent.parent.parent / "backend" / ".env")

setup_logging()
logger = get_logger(__name__)

class ThreadManager:
    """Manages thread operations in Azure AI Foundry"""
    
    def __init__(self, project_endpoint: str):
        """
        Initialize the Thread Manager
        
        Args:
            project_endpoint: Azure AI Foundry project endpoint URL
        """
        self.credential = DefaultAzureCredential()
        self.project_endpoint = project_endpoint
        
        # Initialize the client correctly using AIProjectClient
        self.client = AIProjectClient(
            endpoint=project_endpoint,
            credential=self.credential
        )
        
    def get_all_threads(self) -> List:
        """
        Retrieve all threads from the project
        
        Returns:
            List of thread objects
        """
        try:
            threads = []
            # List all threads using the correct method
            thread_list = self.client.agents.threads.list()
            
            for thread in thread_list:
                threads.append(thread)
                
            logger.info(f"Found {len(threads)} total threads")
            return threads
            
        except HttpResponseError as e:
            logger.error(f"Error retrieving threads: {e}")
            return []
    
    def get_thread_info(self, thread_id: str) -> dict:
        """
        Get detailed information about a specific thread
        
        Args:
            thread_id: The ID of the thread
            
        Returns:
            Dictionary with thread information
        """
        try:
            thread_info = {
                "id": thread_id,
                "agent_name": None,
                "agent_id": None,
                "message_count": 0,
                "has_metadata": False,
                "metadata": {}
            }
            
            # Get thread object
            thread = self.client.agents.threads.get(thread_id=thread_id)
            if hasattr(thread, 'metadata') and thread.metadata:
                thread_info["has_metadata"] = True
                thread_info["metadata"] = thread.metadata
            
            # Count messages
            messages = list(self.client.agents.messages.list(thread_id=thread_id))
            thread_info["message_count"] = len(messages)
            
            # Try to find agent information
            for message in messages:
                if hasattr(message, 'agent_id') and message.agent_id:
                    thread_info["agent_id"] = message.agent_id
                    try:
                        agent = self.client.agents.get_agent(agent_id=message.agent_id)
                        if agent and hasattr(agent, 'name'):
                            thread_info["agent_name"] = agent.name
                            break
                    except Exception as e:
                        logger.warning(f"Error getting agent name for thread {thread_id}: {e}")
                        continue
                        
            return thread_info
            
        except Exception as e:
            logger.warning(f"Could not get thread info for {thread_id}: {e}")
            return {"id": thread_id, "error": str(e)}
    
    def delete_specific_thread(self, thread_id: str, dry_run: bool = False) -> bool:
        """
        Delete a specific thread by ID
        
        Args:
            thread_id: The ID of the thread to delete
            dry_run: If True, only logs what would be deleted without actually deleting
            
        Returns:
            True if successful, False otherwise
        """
        try:
            # Get thread info first
            thread_info = self.get_thread_info(thread_id)
            
            if "error" in thread_info:
                logger.error(f"Cannot delete thread {thread_id}: {thread_info['error']}")
                return False
            
            logger.info(f"Thread Details:")
            logger.info(f"  ID: {thread_info['id']}")
            logger.info(f"  Agent: {thread_info['agent_name'] or 'None'}")
            logger.info(f"  Messages: {thread_info['message_count']}")
            logger.info(f"  Metadata: {'Yes' if thread_info['has_metadata'] else 'No'}")
            
            if dry_run:
                logger.info(f"DRY RUN - Would delete thread: {thread_id}")
                return True
            
            # Confirm deletion
            confirm = input(f"Are you sure you want to delete thread {thread_id}? (yes/no): ")
            if confirm.lower() != 'yes':
                logger.info("Deletion cancelled by user")
                return False
            
            # Delete the thread
            self.client.agents.threads.delete(thread_id=thread_id)
            logger.info(f"Successfully deleted thread: {thread_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to delete thread {thread_id}: {e}")
            return False
    
    def delete_all_threads(self, dry_run: bool = False) -> int:
        """
        Delete all threads in the project
        
        Args:
            dry_run: If True, only logs what would be deleted without actually deleting
            
        Returns:
            Number of threads deleted
        """
        all_threads = self.get_all_threads()
        
        if not all_threads:
            logger.info("No threads found to delete")
            return 0
        
        logger.info(f"Found {len(all_threads)} threads to delete")
        
        if dry_run:
            logger.info("DRY RUN MODE - No threads will be deleted")
            for i, thread in enumerate(all_threads, 1):
                thread_id = thread.id if hasattr(thread, 'id') else str(thread)
                logger.info(f"  {i:3d}. Would delete: {thread_id}")
            return len(all_threads)
        
        # Confirm deletion
        confirm = input(f"⚠️  DANGER: This will delete ALL {len(all_threads)} threads! Type 'DELETE ALL' to confirm: ")
        if confirm != 'DELETE ALL':
            logger.info("Deletion cancelled by user")
            return 0
        
        # Delete all threads
        deleted_count = 0
        failed_count = 0
        
        for i, thread in enumerate(all_threads, 1):
            thread_id = thread.id if hasattr(thread, 'id') else str(thread)
            try:
                self.client.agents.threads.delete(thread_id=thread_id)
                logger.info(f"Successfully deleted thread {i}/{len(all_threads)}: {thread_id}")
                deleted_count += 1
            except Exception as e:
                logger.error(f"Failed to delete thread {thread_id}: {e}")
                failed_count += 1
        
        logger.info(f"Deletion complete: {deleted_count} succeeded, {failed_count} failed")
        return deleted_count
    
    def delete_threads_by_agent_name(self, agent_name: str, dry_run: bool = False) -> int:
        """
        Delete all threads associated with a specific agent name
        
        Args:
            agent_name: Name of the agent whose threads should be deleted
            dry_run: If True, only logs what would be deleted without actually deleting
            
        Returns:
            Number of threads deleted
        """
        threads_to_delete = []
        all_threads = self.get_all_threads()
        
        logger.info(f"Searching for threads with agent name: '{agent_name}'")
        
        # Find threads associated with the agent
        for thread in all_threads:
            thread_id = thread.id if hasattr(thread, 'id') else str(thread)
            thread_info = self.get_thread_info(thread_id)
            
            if thread_info.get('agent_name') and agent_name.lower() in thread_info['agent_name'].lower():
                threads_to_delete.append(thread_id)
                logger.info(f"Found thread to delete: {thread_id} (Agent: {thread_info['agent_name']})")
        
        if not threads_to_delete:
            logger.info(f"No threads found with agent name containing '{agent_name}'")
            return 0
        
        logger.info(f"Found {len(threads_to_delete)} threads to delete")
        
        if dry_run:
            logger.info("DRY RUN MODE - No threads will be deleted")
            for thread_id in threads_to_delete:
                logger.info(f"Would delete thread: {thread_id}")
            return len(threads_to_delete)
        
        # Confirm deletion
        confirm = input(f"Delete {len(threads_to_delete)} threads with agent '{agent_name}'? (yes/no): ")
        if confirm.lower() != 'yes':
            logger.info("Deletion cancelled by user")
            return 0
        
        # Delete the threads
        deleted_count = 0
        failed_count = 0
        
        for thread_id in threads_to_delete:
            try:
                self.client.agents.threads.delete(thread_id=thread_id)
                logger.info(f"Successfully deleted thread: {thread_id}")
                deleted_count += 1
            except Exception as e:
                logger.error(f"Failed to delete thread {thread_id}: {e}")
                failed_count += 1
        
        logger.info(f"Deletion complete: {deleted_count} succeeded, {failed_count} failed")
        return deleted_count
    
    def list_threads_with_agents(self, max_threads: int = 20) -> None:
        """
        List threads with their associated agent information
        
        Args:
            max_threads: Maximum number of threads to display
        """
        all_threads = self.get_all_threads()
        
        if not all_threads:
            logger.info("No threads found")
            return
        
        threads_to_show = all_threads[:max_threads] if max_threads else all_threads
        
        logger.info(f"Listing {len(threads_to_show)} of {len(all_threads)} threads:")
        logger.info("-" * 80)
        
        for i, thread in enumerate(threads_to_show, 1):
            thread_id = thread.id if hasattr(thread, 'id') else str(thread)
            thread_info = self.get_thread_info(thread_id)
            
            agent_name = thread_info.get('agent_name', 'No agent')
            message_count = thread_info.get('message_count', 0)
            
            logger.info(f"{i:3d}. {thread_id}")
            logger.info(f"     Agent: {agent_name}")
            logger.info(f"     Messages: {message_count}")
            logger.info("")


def parse_arguments():
    """Parse command line arguments"""
    parser = argparse.ArgumentParser(
        description="Azure AI Foundry Thread Management Tool",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python azure_thread_cleanup.py --dry-run
  python azure_thread_cleanup.py --delete-thread thread_abc123
  python azure_thread_cleanup.py --delete-all
  python azure_thread_cleanup.py --delete-by-agent "fraud_detection_agent"
  python azure_thread_cleanup.py --list-threads
        """
    )
    
    # Mutually exclusive group for main operations
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument('--dry-run', action='store_true', 
                      help='Show what threads would be deleted without actually deleting')
    group.add_argument('--delete-thread', type=str, metavar='THREAD_ID',
                      help='Delete a specific thread by ID')
    group.add_argument('--delete-all', action='store_true',
                      help='Delete ALL threads (DANGEROUS)')
    group.add_argument('--delete-by-agent', type=str, metavar='AGENT_NAME',
                      help='Delete all threads associated with a specific agent name')
    group.add_argument('--list-threads', action='store_true',
                      help='List threads with their agent information')
    
    # Optional arguments
    parser.add_argument('--max-threads', type=int, default=20,
                       help='Maximum number of threads to show when listing (default: 20)')
    
    return parser.parse_args()


def main():
    """Main execution function"""
    
    # Parse command line arguments
    args = parse_arguments()
    
    # Configuration - Use the project endpoint from environment
    PROJECT_ENDPOINT = os.getenv("AZURE_FOUNDRY_PROJECT_ENDPOINT")
    
    if not PROJECT_ENDPOINT:
        logger.error("Please set the AZURE_FOUNDRY_PROJECT_ENDPOINT environment variable")
        logger.info("Format: https://<project-name>.<region>.api.azureml.ms")
        return
    
    try:
        # Initialize the thread manager
        manager = ThreadManager(PROJECT_ENDPOINT)
        
        if args.dry_run:
            logger.info("🔍 DRY RUN MODE - Analyzing threads for deletion...")
            # Show threads without agents
            all_threads = manager.get_all_threads()
            threads_without_agents = []
            
            for thread in all_threads:
                thread_id = thread.id if hasattr(thread, 'id') else str(thread)
                thread_info = manager.get_thread_info(thread_id)
                if not thread_info.get('agent_name'):
                    threads_without_agents.append(thread_id)
            
            logger.info(f"Found {len(threads_without_agents)} threads without agents:")
            for thread_id in threads_without_agents[:10]:
                logger.info(f"  - {thread_id}")
            if len(threads_without_agents) > 10:
                logger.info(f"  ... and {len(threads_without_agents) - 10} more")
                
        elif args.delete_thread:
            logger.info(f"🗑️  Deleting specific thread: {args.delete_thread}")
            success = manager.delete_specific_thread(args.delete_thread, dry_run=False)
            if success:
                logger.info("✅ Thread deletion completed successfully")
            else:
                logger.error("❌ Thread deletion failed")
                
        elif args.delete_all:
            logger.info("🗑️  Deleting ALL threads...")
            deleted_count = manager.delete_all_threads(dry_run=False)
            logger.info(f"✅ Deleted {deleted_count} threads")
            
        elif args.delete_by_agent:
            logger.info(f"🗑️  Deleting threads for agent: {args.delete_by_agent}")
            deleted_count = manager.delete_threads_by_agent_name(args.delete_by_agent, dry_run=False)
            logger.info(f"✅ Deleted {deleted_count} threads")
            
        elif args.list_threads:
            logger.info("📋 Listing threads with agent information...")
            manager.list_threads_with_agents(max_threads=args.max_threads)
            
    except Exception as e:
        logger.error(f"An unexpected error occurred: {e}")
        raise


if __name__ == "__main__":
    main()