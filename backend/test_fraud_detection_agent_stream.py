# Create a simple debug script: debug_agent.py
import asyncio
import json
from services.fraud_detection_agent_stream import FraudDetectionAgentStream

async def debug_agent():
    agent = FraudDetectionAgentStream()
    
    transaction = {
        "_id": {
            "$oid": "6838963110a89768cd90e4eb"
        },
        "customer_id": "67d2a82a654c7f1b869c4adb",
        "transaction_id": "6838962810a89768cd909122",
        "timestamp": "2025-02-25T02:26:41.441005",
        "amount": 450.7,
        "currency": "USD",
        "merchant": {
            "name": "Luna-Rodriguez",
            "category": "restaurant",
            "id": "9a158e89"
        },
        "location": {
            "city": "Lake Cynthiaborough",
            "state": "Rhode Island",
            "country": "BB",
            "coordinates": {
            "type": "Point",
            "coordinates": [
                -1.336118,
                66.2798285
            ]
            }
        },
        "device_info": {
            "device_id": "e0df0635-8941-478a-9f06-baef2ad12828",
            "type": "tablet",
            "os": "Android",
            "browser": "Chrome",
            "ip": "138.30.129.46"
        },
        "transaction_type": "payment",
        "payment_method": "digital_wallet",
        "status": "completed",
        "risk_assessment": {
            "score": 6.385022510130114,
            "level": "low",
            "flags": [],
            "transaction_type": "normal"
        },
        "embedding_metadata": {
            "generated_at": {
            "$date": "2025-08-15T15:37:55.836Z"
            },
            "embedding_model": "azure-foundry",
            "embedding_dimension": 3072,
            "text_representation_method": "_create_transaction_text_representation"
        }
    }
    
    result = await agent.evaluate_transaction(transaction)
    print(f"Result: {result}")

    agent.cleanup_resources()

if __name__ == "__main__":
    asyncio.run(debug_agent())
