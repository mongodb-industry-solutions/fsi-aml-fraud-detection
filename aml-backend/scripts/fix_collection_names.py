"""
Copy `entities` / `relationships` / `transactionsv2` (the names the seed notebooks
write) to `threatsightEntities` / `threatsightRelationships` / `fraudEvaluation`
(the names the application code actually queries -- see
repositories/factory/repository_factory.py and routes/transactions.py), rebuild
their indexes on the new collections, then drop the old ones.

Document shape is unchanged: it's the same schema either way, the app just never
looked under the name the notebooks used. Embeddings on `entities` are preserved
as-is (no re-embedding, no Bedrock calls).

Run once, after seeding via the notebooks:
    poetry run python scripts/fix_collection_names.py
"""
import os
import time

from dotenv import load_dotenv
from pymongo import ASCENDING, DESCENDING, MongoClient
from pymongo.operations import SearchIndexModel

load_dotenv()

MONGODB_URI = os.environ["MONGODB_URI"]
DB_NAME = os.environ.get("DB_NAME", "threatsight360")

client = MongoClient(MONGODB_URI)
db = client[DB_NAME]

RENAMES = [
    ("entities", "threatsightEntities"),
    ("relationships", "threatsightRelationships"),
    ("transactionsv2", "fraudEvaluation"),
]


def copy_collection(old_name: str, new_name: str) -> bool:
    if old_name not in db.list_collection_names():
        print(f"[skip] '{old_name}' does not exist (already renamed, or notebook was updated)")
        return False
    if new_name in db.list_collection_names() and db[new_name].count_documents({}) > 0:
        print(f"[skip] '{new_name}' already has data")
        return False

    old_count = db[old_name].count_documents({})
    print(f"[copy] {old_name} ({old_count} docs) -> {new_name}")
    db[old_name].aggregate([{"$out": new_name}])
    new_count = db[new_name].count_documents({})
    if new_count != old_count:
        raise RuntimeError(f"count mismatch after copy: {old_count} -> {new_count}")
    print(f"  {new_name}: {new_count} docs (verified)")
    return True


def rebuild_indexes():
    # threatsightRelationships -- plain indexes, same keys as `relationships` had
    rel = db["threatsightRelationships"]
    rel.create_index([("source.entityId", ASCENDING), ("type", ASCENDING), ("active", ASCENDING)], name="rel_source_type_active_idx")
    rel.create_index([("target.entityId", ASCENDING), ("type", ASCENDING), ("active", ASCENDING)], name="rel_target_type_active_idx")
    rel.create_index([("type", ASCENDING)], name="rel_type_idx")
    rel.create_index([("relationshipId", ASCENDING)], name="rel_relationshipId_idx", unique=True)
    rel.create_index([("datasource", ASCENDING)], name="rel_datasource_idx")
    print("[index] threatsightRelationships: rebuilt 5 indexes")

    # fraudEvaluation -- plain indexes, same keys as `transactionsv2` had
    txn = db["fraudEvaluation"]
    txn.create_index([("fromEntityId", ASCENDING), ("timestamp", DESCENDING)], name="txn_from_entity_time_idx")
    txn.create_index([("toEntityId", ASCENDING), ("timestamp", DESCENDING)], name="txn_to_entity_time_idx")
    txn.create_index([("fromEntityId", ASCENDING), ("toEntityId", ASCENDING)], name="txn_from_to_idx")
    txn.create_index([("transactionId", ASCENDING)], name="txn_id_unique_idx", unique=True)
    txn.create_index([("timestamp", DESCENDING)], name="txn_timestamp_idx")
    txn.create_index([("amount", DESCENDING)], name="txn_amount_idx")
    txn.create_index([("riskScore", DESCENDING)], name="txn_risk_idx")
    txn.create_index([("tags", ASCENDING)], name="txn_tags_idx")
    txn.create_index([("flagged", ASCENDING)], name="txn_flagged_idx")
    print("[index] fraudEvaluation: rebuilt 9 indexes")

    # threatsightEntities -- Atlas Search + Vector Search indexes.
    # profileEmbedding is the field name the app actually queries (confirmed in
    # hybrid_search_service.py, vector_search_repository.py, chat_tools.py) --
    # not "embedding", which models/database/collections.py's stale "legacy"
    # config claims.
    ent = db["threatsightEntities"]
    existing = {i["name"] for i in ent.list_search_indexes()}

    if "entity_resolution_search" not in existing:
        ent.create_search_index(
            model=SearchIndexModel(
                name="entity_resolution_search",
                definition={
                    "mappings": {
                        "dynamic": False,
                        "fields": {
                            "name": {
                                "type": "document",
                                "fields": {
                                    "full": [
                                        {"type": "autocomplete", "analyzer": "lucene.standard", "tokenization": "edgeGram", "minGrams": 2, "maxGrams": 15},
                                        {"type": "string"},
                                    ],
                                    "aliases": {"type": "string"},
                                },
                            },
                            "entityType": {"type": "stringFacet"},
                            "nationality": {"type": "stringFacet"},
                            "residency": {"type": "stringFacet"},
                            "jurisdictionOfIncorporation": {"type": "stringFacet"},
                            "riskAssessment": {
                                "type": "document",
                                "fields": {
                                    "overall": {
                                        "type": "document",
                                        "fields": {"level": {"type": "stringFacet"}, "score": {"type": "numberFacet"}},
                                    }
                                },
                            },
                            "customerInfo": {"type": "document", "fields": {"businessType": {"type": "stringFacet"}}},
                        },
                    }
                },
            )
        )
        print("[index] threatsightEntities: created entity_resolution_search")

    if "entity_text_search_index" not in existing:
        ent.create_search_index(
            model=SearchIndexModel(
                name="entity_text_search_index",
                definition={
                    "mappings": {
                        "dynamic": False,
                        "fields": {
                            "name": {"type": "document", "fields": {"full": {"type": "string"}, "aliases": {"type": "string"}}},
                            "addresses": {"type": "document", "fields": {"full": {"type": "string"}}},
                            "entityType": {"type": "string"},
                            "identifiers": {"type": "document", "fields": {"value": {"type": "string"}}},
                        },
                    }
                },
            )
        )
        print("[index] threatsightEntities: created entity_text_search_index")

    if "entity_vector_search_index" not in existing:
        ent.create_search_index(
            model=SearchIndexModel(
                name="entity_vector_search_index",
                type="vectorSearch",
                definition={"fields": [{"type": "vector", "path": "profileEmbedding", "numDimensions": 1536, "similarity": "cosine"}]},
            )
        )
        print("[index] threatsightEntities: created entity_vector_search_index")

    print("Waiting for Atlas Search indexes to become queryable...")
    for _ in range(60):
        idxs = {i["name"]: i.get("queryable") for i in ent.list_search_indexes()}
        if all(idxs.get(n) for n in ["entity_resolution_search", "entity_text_search_index", "entity_vector_search_index"]):
            print("  all queryable")
            break
        time.sleep(5)
    else:
        print("  WARNING: not all queryable yet, check the Atlas UI")


def drop_old(copied: dict):
    for old_name, new_name in RENAMES:
        if not copied.get(old_name):
            continue
        old_count = db[old_name].count_documents({})
        new_count = db[new_name].count_documents({})
        if old_count == new_count:
            db.drop_collection(old_name)
            print(f"[drop] '{old_name}' (verified copy matches: {new_count} docs)")
        else:
            print(f"[keep] '{old_name}' NOT dropped -- count mismatch ({old_count} vs {new_count})")


def main():
    copied = {}
    for old_name, new_name in RENAMES:
        copied[old_name] = copy_collection(old_name, new_name)

    rebuild_indexes()
    drop_old(copied)

    print("\n--- final state ---")
    for _, new_name in RENAMES:
        print(f"{new_name}: {db[new_name].count_documents({})} docs")

    client.close()


if __name__ == "__main__":
    main()
