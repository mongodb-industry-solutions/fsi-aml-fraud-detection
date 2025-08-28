"""
OpenTelemetry Configuration for Azure AI Foundry Agent Observability
"""

import os
import logging
from typing import Optional

logger = logging.getLogger(__name__)

def configure_observability(
    connection_string: Optional[str] = None,
    enable_console_export: bool = True,
    service_name: str = "threatsight-360-agents"
) -> bool:
    """
    Configure OpenTelemetry tracing for Azure AI Foundry agent monitoring.
    
    Args:
        connection_string: Azure Monitor connection string (optional)
        enable_console_export: Whether to export traces to console for debugging
        service_name: Name of the service for trace identification
        
    Returns:
        bool: True if configuration was successful, False otherwise
    """
    try:
        # Try to configure Azure Monitor if connection string is provided
        if connection_string:
            try:
                from azure.monitor.opentelemetry import configure_azure_monitor
                configure_azure_monitor(
                    connection_string=connection_string,
                    service_name=service_name,
                    service_version="1.0.0",
                    service_instance_id=os.getenv("HOSTNAME", "local")
                )
                logger.info("✅ Azure Monitor telemetry configured successfully")
            except ImportError:
                logger.warning("⚠️ azure-monitor-opentelemetry not available, skipping Azure Monitor setup")
            except Exception as e:
                logger.warning(f"⚠️ Azure Monitor setup failed: {e}")
        
        # Configure basic OpenTelemetry setup
        if enable_console_export or not connection_string:
            try:
                from opentelemetry import trace
                from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
                from opentelemetry.sdk.trace import TracerProvider
                from opentelemetry.sdk.trace.export import BatchSpanProcessor, ConsoleSpanExporter
                from opentelemetry.sdk.resources import Resource
                
                # Create resource with service information
                resource = Resource.create({
                    "service.name": service_name,
                    "service.version": "1.0.0",
                    "service.instance.id": os.getenv("HOSTNAME", "local")
                })
                
                # Set up tracer provider
                trace.set_tracer_provider(TracerProvider(resource=resource))
                tracer_provider = trace.get_tracer_provider()
                
                # Add console exporter for debugging
                if enable_console_export:
                    console_exporter = ConsoleSpanExporter()
                    console_processor = BatchSpanProcessor(console_exporter)
                    tracer_provider.add_span_processor(console_processor)
                    
                logger.info("✅ Basic OpenTelemetry tracing configured")
                
            except ImportError as e:
                logger.warning(f"⚠️ OpenTelemetry packages not available: {e}")
                return False
            except Exception as e:
                logger.error(f"❌ OpenTelemetry setup failed: {e}")
                return False
        
        return True
        
    except Exception as e:
        logger.error(f"❌ Observability configuration failed: {e}")
        return False

def get_tracer(name: str = "azure-ai-foundry-agent"):
    """
    Get a tracer instance for creating spans.
    
    Args:
        name: Name of the tracer
        
    Returns:
        Tracer instance or None if tracing is not configured
    """
    try:
        from opentelemetry import trace
        return trace.get_tracer(name)
    except ImportError:
        logger.warning("⚠️ OpenTelemetry not available for tracing")
        return None
    except Exception as e:
        logger.error(f"❌ Failed to get tracer: {e}")
        return None

def create_span(name: str, attributes: dict = None):
    """
    Create a new span for tracing agent operations.
    
    Args:
        name: Name of the span
        attributes: Dictionary of attributes to add to the span
        
    Returns:
        Span context manager or dummy context manager
    """
    try:
        tracer = get_tracer()
        if tracer:
            span = tracer.start_span(name)
            if attributes:
                for key, value in attributes.items():
                    span.set_attribute(key, str(value))
            return span
    except Exception as e:
        logger.debug(f"Failed to create span '{name}': {e}")
    
    # Return a dummy context manager if tracing is not available
    class DummySpan:
        def __enter__(self):
            return self
        def __exit__(self, *args):
            pass
        def set_attribute(self, key, value):
            pass
        def add_event(self, name, attributes=None):
            pass
    
    return DummySpan()