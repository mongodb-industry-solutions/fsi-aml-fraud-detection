"""
Centralized logging configuration for ThreatSight 360
Structured logging with environment-specific configurations
"""
import logging
import logging.handlers
import sys
import json
from pathlib import Path
from typing import Dict, Any, Optional
import os
from datetime import datetime


class LoggingConfig:
    """Centralized logging configuration management"""

    _instance: Optional['LoggingConfig'] = None
    _configured = False

    def __new__(cls) -> 'LoggingConfig':
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self):
        if not self._configured:
            self._setup_completed = False
            self.logs_dir = Path("logs")
            self.environment = os.getenv("ENVIRONMENT", "development").lower()
            self.log_level = os.getenv("LOG_LEVEL", "INFO").upper()
            self._configured = True

    def setup_logging(self) -> None:
        """Setup logging configuration for the entire application"""
        if self._setup_completed:
            return

        # Create logs directory
        self.logs_dir.mkdir(exist_ok=True)

        # Get root logger
        root_logger = logging.getLogger()
        root_logger.setLevel(getattr(logging, self.log_level))

        # Remove any existing handlers to prevent duplication
        for handler in root_logger.handlers[:]:
            root_logger.removeHandler(handler)

        # Add handlers based on environment
        if self.environment == "production":
            self._setup_production_handlers(root_logger)
        else:
            self._setup_development_handlers(root_logger)

        # Configure third-party loggers
        self._configure_third_party_loggers()

        self._setup_completed = True
        logger = logging.getLogger(__name__)
        logger.info(f"✅ Logging configured for {self.environment} environment")

    def _setup_development_handlers(self, root_logger: logging.Logger) -> None:
        """Setup handlers for development environment"""
        # Console handler with colored output
        console_handler = logging.StreamHandler(sys.stdout)
        console_handler.setLevel(logging.DEBUG)
        console_formatter = logging.Formatter(
            "%(asctime)s - %(name)s - %(levelname)s - %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S"
        )
        console_handler.setFormatter(console_formatter)
        root_logger.addHandler(console_handler)

        # File handler for development
        dev_file_handler = logging.handlers.RotatingFileHandler(
            self.logs_dir / "threatsight360_dev.log",
            maxBytes=5*1024*1024,  # 5MB
            backupCount=3,
            encoding='utf-8'
        )
        dev_file_handler.setLevel(logging.DEBUG)
        dev_file_formatter = logging.Formatter(
            "%(asctime)s - %(name)s - %(levelname)s - %(funcName)s:%(lineno)d - %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S"
        )
        dev_file_handler.setFormatter(dev_file_formatter)
        root_logger.addHandler(dev_file_handler)

    def _setup_production_handlers(self, root_logger: logging.Logger) -> None:
        """Setup handlers for production environment"""
        # JSON file handler for production
        json_file_handler = logging.handlers.RotatingFileHandler(
            self.logs_dir / "threatsight360.log",
            maxBytes=10*1024*1024,  # 10MB
            backupCount=5,
            encoding='utf-8'
        )
        json_file_handler.setLevel(logging.INFO)
        json_formatter = JSONFormatter()
        json_file_handler.setFormatter(json_formatter)
        root_logger.addHandler(json_file_handler)

        # Console handler for production (less verbose)
        console_handler = logging.StreamHandler(sys.stdout)
        console_handler.setLevel(logging.WARNING)
        console_formatter = logging.Formatter(
            "%(asctime)s - %(levelname)s - %(name)s - %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S"
        )
        console_handler.setFormatter(console_formatter)
        root_logger.addHandler(console_handler)

    def _configure_third_party_loggers(self) -> None:
        """Configure third-party library loggers to reduce noise"""
        third_party_configs = {
            # Azure SDK loggers
            "azure": logging.WARNING,
            "azure.core": logging.WARNING,
            "azure.identity": logging.WARNING,
            "azure.core.pipeline.policies.http_logging_policy": logging.ERROR,
            "azure.ai.agents": logging.INFO,

            # HTTP and network libraries
            "urllib3": logging.WARNING,
            "httpx": logging.WARNING,
            "aiohttp": logging.WARNING,

            # Web frameworks
            "uvicorn": logging.INFO,
            "uvicorn.access": logging.WARNING,
            "fastapi": logging.INFO,

            # Database drivers
            "motor": logging.WARNING,
            "pymongo": logging.WARNING,

            # Other libraries
            "dotenv": logging.WARNING,
        }

        for logger_name, level in third_party_configs.items():
            logging.getLogger(logger_name).setLevel(level)

    def get_logger(self, name: str) -> logging.Logger:
        """Get a configured logger with the specified name"""
        if not self._setup_completed:
            self.setup_logging()
        return logging.getLogger(name)


class JSONFormatter(logging.Formatter):
    """JSON formatter for structured logging in production"""

    def format(self, record: logging.LogRecord) -> str:
        """Format log record as JSON"""
        log_entry: Dict[str, Any] = {
            "timestamp": datetime.fromtimestamp(record.created).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }

        # Add extra fields if present
        if hasattr(record, 'extra_fields'):
            log_entry.update(record.extra_fields)

        # Add exception info if present
        if record.exc_info:
            log_entry["exception"] = self.formatException(record.exc_info)

        # Add function and line info for errors and above
        if record.levelno >= logging.ERROR:
            log_entry.update({
                "function": record.funcName,
                "line": record.lineno,
                "file": record.filename,
            })

        return json.dumps(log_entry, default=str)


# Global configuration instance
logging_config = LoggingConfig()

# Backward compatibility function
def setup_logging() -> None:
    """Backward compatibility function for existing code"""
    logging_config.setup_logging()


def get_logger(name: str) -> logging.Logger:
    """Get a properly configured logger"""
    return logging_config.get_logger(name)


def demo_logging_features():
    """Demonstrate the new logging features"""
    demo_logger = get_logger("demo")

    demo_logger.info("🚀 Logging system initialized successfully!")
    demo_logger.debug("This is a debug message (only shown in development)")
    demo_logger.info("This is an info message")
    demo_logger.warning("This is a warning message")
    demo_logger.error("This is an error message")

    # Demonstrate structured logging with extra fields
    extra_data = {
        "user_id": "12345",
        "action": "login_attempt",
        "ip_address": "192.168.1.100",
        "user_agent": "Mozilla/5.0..."
    }

    demo_logger.info("User authentication attempt", extra={"extra_fields": extra_data})

    # Show environment-specific behavior
    if logging_config.environment == "production":
        demo_logger.info("Running in PRODUCTION mode with JSON logging")
    else:
        demo_logger.info("Running in DEVELOPMENT mode with console logging")


if __name__ == "__main__":
    # Demo the logging system
    demo_logging_features()
