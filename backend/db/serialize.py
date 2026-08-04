"""JSON-safe conversion for raw MongoDB documents.

Routes that return migrated documents as-is (no Pydantic `response_model`) must run
them through `mongo_json` first. `_id` is a BSON `ObjectId`, which FastAPI's
`jsonable_encoder` cannot serialize — the failure is a 500 raised *after* any write
has already committed (see defects.md, `response-shape`).

Mirrors the `MongoJSONEncoder` already in `routes/fraud_pattern.py`, kept in one place
so the two cannot drift.
"""

import json
from datetime import date, datetime

from bson import ObjectId


class MongoJSONEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, ObjectId):
            return str(obj)
        if isinstance(obj, (datetime, date)):
            return obj.isoformat()
        return super().default(obj)


def mongo_json(value):
    """Return `value` with ObjectId/datetime coerced to strings.

    Accepts a single document or a list of them.
    """
    return json.loads(json.dumps(value, cls=MongoJSONEncoder))
