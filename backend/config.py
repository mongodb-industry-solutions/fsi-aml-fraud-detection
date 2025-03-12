import os
from dotenv import load_dotenv
import logging

# Load environment variables
load_dotenv()

# Database configuration
MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME", "leafy_fraud_detector")
TRANSACTIONS_COLLECTION = os.getenv("TRANSACTIONS_COLLECTION", "transactions")
RULES_COLLECTION = os.getenv("RULES_COLLECTION", "fraud_detection_rules")

# Default fraud detection rules
DEFAULT_RULES = {
    "high_risk_locations": {"values": ["LY", "HK"], "weight": 0.5},
    "amount_threshold": {"values": 5000, "weight": 0.3}
}

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)