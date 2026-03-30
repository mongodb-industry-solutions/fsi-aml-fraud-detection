"""
LLM configuration for the agentic investigation pipeline.

The model is controlled by the LLM_MODEL_ARN env var and defaults to
Haiku 4.5 (fast + cheap, good for demos).  Set LLM_MODEL_ARN to the
Sonnet ARN for higher-quality output when needed.
"""

import os
import logging

from langchain_aws import ChatBedrockConverse
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception

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


def get_model_id() -> str:
    """Return the active model ARN for audit logging."""
    return _MODEL_ARN


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


def _is_retryable(exc: BaseException) -> bool:
    """Return True for transient Bedrock / network errors worth retrying."""
    # Handle botocore ClientError by inspecting the error code
    resp = getattr(exc, "response", None)
    if resp and isinstance(resp, dict):
        code = resp.get("Error", {}).get("Code", "")
        if code in ("ThrottlingException", "ServiceUnavailableException",
                     "ModelTimeoutException", "TooManyRequestsException"):
            return True

    name = type(exc).__name__
    if name in ("ThrottlingException", "ServiceUnavailableException", "ModelTimeoutException"):
        return True
    msg = str(exc).lower()
    return any(kw in msg for kw in ("throttl", "timeout", "rate exceeded", "service unavailable"))


@retry(
    retry=retry_if_exception(_is_retryable),
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=2, max=15),
    reraise=True,
)
def invoke_with_retry(llm, messages):
    """Invoke an LLM (or structured-output wrapper) with retry on transient errors."""
    return llm.invoke(messages)
