"""
LLM configuration for the agentic investigation pipeline.

The model is controlled by the LLM_MODEL_ARN env var and defaults to
Haiku 4.5 (fast + cheap, good for demos).  Set LLM_MODEL_ARN to the
Sonnet ARN for higher-quality output when needed.
"""

import os
import logging

from langchain_aws import ChatBedrockConverse

logger = logging.getLogger(__name__)

_SONNET_ARN = (
    "arn:aws:bedrock:us-east-1:275662791714:"
    "application-inference-profile/n5kazy9gif2u"
)
_HAIKU_ARN = (
    "arn:aws:bedrock:us-east-1:275662791714:"
    "inference-profile/global.anthropic.claude-haiku-4-5-20251001-v1:0"
)

_MODEL_ARN = os.getenv("LLM_MODEL_ARN", _HAIKU_ARN)

_llm_instance: ChatBedrockConverse | None = None


def extract_token_usage(raw_message) -> dict:
    """Extract token usage from a raw AIMessage, returning empty dict on failure."""
    meta = getattr(raw_message, "usage_metadata", None)
    if not meta:
        return {}
    return {
        "input_tokens": meta.get("input_tokens", 0),
        "output_tokens": meta.get("output_tokens", 0),
        "total_tokens": meta.get("total_tokens", 0),
    }


def get_llm() -> ChatBedrockConverse:
    """Singleton accessor for the investigation LLM."""
    global _llm_instance
    if _llm_instance is None:
        region = os.getenv("AWS_REGION", "us-east-1")
        _llm_instance = ChatBedrockConverse(
            model=_MODEL_ARN,
            provider="anthropic",
            region_name=region,
            temperature=0.1,
        )
        logger.info("ChatBedrockConverse initialised (model=%s, region=%s)", _MODEL_ARN, region)
    return _llm_instance
