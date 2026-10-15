"""
Migrate `customers` documents from the seed-notebook shape to the shape
`models/customer.py` and the routes actually read.

The seed notebook (docs/ThreatSight360 - Transaction Synthetic Data Generation.ipynb)
writes flat, snake_case documents: personal_info / account_info / behavioral_profile /
risk_profile / metadata. The current app code expects a different, camelCase shape --
customerId / identification / identifiers / contact / riskProfile / behavioralProfile
-- documented in full in models/customer.py, and reads are scoped to
{"sourceSystem": "threatsight360"} (db/scope.py). Neither the README nor the notebook
was updated when the routes moved to this shape, so a fresh seed produces documents no
route can find.

This is a one-time, idempotent transform: run it after seeding, or again safely if run
twice (documents that already have `customerId` are skipped).

Run:
    poetry run python scripts/migrate_customers.py
"""
import os
from datetime import datetime, timezone

from dotenv import load_dotenv
from pymongo import MongoClient

load_dotenv()

MONGODB_URI = os.environ["MONGODB_URI"]
DB_NAME = os.environ.get("DB_NAME", "threatsight360")
SOURCE_SYSTEM = "threatsight360"


def split_name(full_name: str):
    parts = full_name.split()
    if len(parts) == 0:
        return "", "", None
    if len(parts) == 1:
        return parts[0], "", None
    if len(parts) == 2:
        return parts[0], parts[1], None
    return parts[0], parts[-1], " ".join(parts[1:-1])


def migrate_one(doc: dict) -> dict:
    personal = doc.get("personal_info", {})
    account = doc.get("account_info", {})
    behavioral = doc.get("behavioral_profile", {})
    risk = doc.get("risk_profile", {})

    first_name, last_name, middle_name = split_name(personal.get("name", ""))

    score = risk.get("overall_risk_score")
    if score is None:
        level = None
    elif score < 33:
        level = "low"
    elif score < 66:
        level = "medium"
    else:
        level = "high"

    return {
        "customerId": f"CUST-{str(doc['_id'])[:8]}",
        "identification": {
            "legalName": personal.get("name"),
            "firstName": first_name,
            "lastName": last_name,
            "middleName": middle_name,
            "dateOfBirth": personal.get("dob"),
            "nationality": personal.get("address", {}).get("country"),
        },
        "identifiers": [
            {
                "type": "accountNumber",
                "value": account.get("account_number"),
                "country": personal.get("address", {}).get("country"),
                "verified": account.get("status") == "active",
            }
        ]
        if account.get("account_number")
        else [],
        "contact": {
            "email": personal.get("email"),
            "phone": personal.get("phone"),
            "address": personal.get("address"),
        },
        "riskProfile": {
            "overall": {
                "score": score,
                "level": level,
                "trend": None,
            },
            "components": {"risk_factors": risk.get("risk_factors", [])},
            "assessedAt": risk.get("last_risk_assessment"),
            "history": [],
        },
        # Sub-keys stay snake_case -- behavioral_profile's devices/transaction_patterns
        # are already the shape BehavioralProfileModel expects; only the top-level key
        # needs to move from behavioral_profile to behavioralProfile.
        "behavioralProfile": {
            "source": "fraud",
            "devices": behavioral.get("devices", []),
            "transaction_patterns": behavioral.get("transaction_patterns"),
            "location_patterns": [],
            "time_of_day_patterns": None,
            "frequency_patterns": None,
            "ip_addresses": [],
        },
        "status": account.get("status"),
        "type": "individual",
        "segment": account.get("account_type"),
        # Top-level, not nested -- db/scope.py's scoped() filters on this field
        # directly, and CustomerResponse.screening is built from these same
        # top-level fields (see the ScreeningModel docstring in models/customer.py).
        "sourceSystem": SOURCE_SYSTEM,
        "scenarioKey": None,
    }


def main():
    client = MongoClient(MONGODB_URI)
    db = client[DB_NAME]
    collection = db["customers"]

    to_migrate = list(collection.find({"customerId": {"$exists": False}}))
    print(f"customers needing migration: {len(to_migrate)}")

    migrated = 0
    for doc in to_migrate:
        update = migrate_one(doc)
        collection.update_one({"_id": doc["_id"]}, {"$set": update})
        migrated += 1

    print(f"Migrated {migrated} customers.")

    remaining = collection.count_documents({"customerId": {"$exists": False}})
    print(f"customers still missing customerId: {remaining}")

    client.close()


if __name__ == "__main__":
    main()
