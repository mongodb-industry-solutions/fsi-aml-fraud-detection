"""
LLM configuration for the agentic investigation pipeline.

Reuses the same Claude Sonnet model ARN already configured in the existing
streaming classification service, accessed through LangChain's ChatBedrockConverse.
"""

import os
import logging

from langchain_aws import ChatBedrockConverse

logger = logging.getLogger(__name__)

_SONNET_ARN = (
    "arn:aws:bedrock:us-east-1:275662791714:"
    "application-inference-profile/n5kazy9gif2u"
)

_llm_instance: ChatBedrockConverse | None = None


def get_llm() -> ChatBedrockConverse:
    """Singleton accessor for the investigation LLM."""
    global _llm_instance
    if _llm_instance is None:
        region = os.getenv("AWS_REGION", "us-east-1")
        _llm_instance = ChatBedrockConverse(
            model=_SONNET_ARN,
            provider="anthropic",
            region_name=region,
            temperature=0.1,
        )
        logger.info("ChatBedrockConverse initialised (region=%s)", region)
    return _llm_instance
