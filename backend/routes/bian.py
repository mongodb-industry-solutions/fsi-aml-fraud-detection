"""BIAN v14 service-domain surface for the two routes the Transaction Simulator calls.

Per `bian-fraud-flow.md` §9.2, only the stage-boundary routes get BIAN-aligned URLs; the
other ~85 native routes stay as they are (§6.3 — search, network analytics, copilot chat and
health have no BIAN operation and should not be forced into one).

These handlers hold **no logic**. Each delegates to the native handler so there is exactly
one implementation per operation and the two surfaces cannot drift. The native routes stay
registered and working — this is additive, so nothing breaks until the frontend proxy is
cut over (see the note in the module docstring of `main.py`'s router registration).

Path provenance, from the local BIAN v14 index (`kg -s bian`):

    POST /FraudEvaluation/Evaluate                                    Evaluate
    GET  /PartyReferenceDataDirectory/{id}/Retrieve                   Retrieve
    POST /PartyReferenceDataDirectory/Request                         Request

The party surface mirrors the Leafy Bank accounts service exactly
(`leaf-bank-bian/backend/accounts/main.py:132,149`), so the two read as one system:

    GET  /PartyReferenceDataDirectory/{partyreferencedatadirectoryid}/Retrieve   one customer
    POST /PartyReferenceDataDirectory/Request                                    filtered list

`Request` — not a second `Retrieve` — is what carries the list. BIAN has no list operation
on this SD, and that is the split accounts already chose. Same convention as the payments
demo (`fsi-payments-processing` `PaymentRail/…`): literal SD name in the path, `GET` for
retrieves with the CR instance id, `POST` for the body-carrying verbs.
"""

from fastapi import APIRouter, Body, Depends
from typing import Any, Dict, Optional

from db.mongo_db import MongoDBAccess
from services.fraud_detection import FraudDetectionService

from routes.customer import get_db as get_customer_db
from routes.customer import get_customer as native_get_customer
from routes.customer import list_customers as native_list_customers
from routes.transaction import evaluate_transaction as native_evaluate_transaction
from routes.transaction import get_fraud_detection_service

router = APIRouter(tags=["bian"])


def _strip(doc: dict) -> dict:
    """Drop `_id` from a response document.

    Mirrors `accounts/main.py:97`. The native `/customers/*` routes keep `_id` (their
    `CustomerResponse` aliases it to `id`); the accounts BIAN surface omits it, because the
    BIAN identity of the document is `customerId`, not the Mongo key.
    """
    doc.pop("_id", None)
    return doc


def _camel_key(key: str) -> str:
    """`risk_assessment` → `riskAssessment`. Leaves already-camel keys alone.

    Keys starting with `_` are returned untouched so `_id` never becomes `Id`.
    """
    if key.startswith("_") or "_" not in key:
        return key
    head, *rest = key.split("_")
    return head + "".join(part[:1].upper() + part[1:] for part in rest)


def _camelize(value):
    """Recursively camelCase every dict key in `value`. Values are never touched.

    Applied only on the BIAN surface. `/transactions/evaluate` composes a snake_case
    payload (`routes/transaction.py:309` documents it as the one route whose wire stays
    snake, because the simulator reads it directly), while every other route in this
    service returns stored camelCase documents. Converting here gives the BIAN boundary
    one casing without a breaking change to the native route.

    Recursive rather than a fixed key map so nested bodies — `similar_transactions[]`
    entries carry their own `risk_assessment{}` — and any future field convert too.
    """
    if isinstance(value, dict):
        return {_camel_key(k): _camelize(v) for k, v in value.items()}
    if isinstance(value, list):
        return [_camelize(item) for item in value]
    return value


# --- Stage 1: Detect — FraudEvaluation -------------------------------------------------

@router.post(
    "/FraudEvaluation/Evaluate",
    response_description="BIAN FraudEvaluation/Evaluate — score a transaction without storing it",
)
async def fraud_evaluation_evaluate(
    transaction: Dict[str, Any] = Body(...),
    fraud_service: FraudDetectionService = Depends(get_fraud_detection_service),
):
    """BIAN `FraudEvaluation` / `Evaluate` — the demo's detect stage.

    The similar-transaction `$vectorSearch` and the weighted rule checks are BQs *inside*
    this operation, not separate endpoints: the target spec already carries them as
    `modelResults` → `FraudEvaluationModelsRecord` and `ruleResults` →
    `RuleSetsandDecisionTreesRecord`.

    Note this operation still has no terminal authorization decision — BIAN's
    `PUT /FraudEvaluation/{id}/Grant` is unimplemented (`bian-fraud-flow.md` §7.5). The
    response carries a score, not a verdict.

    The native handler composes a snake_case body; `_camelize` converts it on the way out so
    this surface is camelCase throughout, matching the party routes and the accounts service.
    The request body is passed through unchanged — the native handler reads `customer_id` /
    `entity_id` / `transaction_type`, so recasing inbound would break it.
    """
    result = await native_evaluate_transaction(
        transaction=transaction,
        fraud_service=fraud_service,
    )
    return _camelize(result)


# --- Party reference data — customer picker -------------------------------------------

@router.get(
    "/PartyReferenceDataDirectory/{partyreferencedatadirectoryid}/Retrieve",
    response_description="BIAN PartyReferenceDataDirectory/Retrieve — one customer",
)
async def party_retrieve(
    partyreferencedatadirectoryid: str,
    db: MongoDBAccess = Depends(get_customer_db),
):
    """BIAN `PartyReferenceDataDirectory` / `Retrieve` — a single customer by id.

    Path parameter name matches the accounts service and the BIAN v14 literal. Delegates
    to the native `/customers/{customer_id}`, so the 404 on an unknown id is unchanged.

    Envelope matches `accounts/main.py:138` — `{customerId, customer}`, not a bare document.
    """
    customer = await native_get_customer(
        customer_id=partyreferencedatadirectoryid,
        db=db,
    )
    return {
        "customerId": customer["customerId"],
        "customer": _strip(customer),
    }


@router.post(
    "/PartyReferenceDataDirectory/Request",
    response_description="BIAN PartyReferenceDataDirectory/Request — filtered customer list",
)
async def party_request(
    body: Optional[Dict[str, Any]] = Body(None),
    db: MongoDBAccess = Depends(get_customer_db),
):
    """BIAN `PartyReferenceDataDirectory` / `Request` — the list operation.

    Accounts uses `Request` for the same purpose (`accounts/main.py:149`), filtering on
    `status` / `segment` / `type`. This demo's `customers` collection has no BIAN-mapped
    equivalent of those, so the body carries the paging and the cohort selector the native
    handler actually supports:

        {"limit": n, "skip": n, "sortByRisk": bool, "behavioralSource": "aml"|"fraud"}

    Defaults mirror the native handler (`limit=5`, `createdAt` descending) so the
    simulator's dropdown ordering is unchanged.

    Envelope matches `accounts/main.py:153` — `{customers: [...]}`, not a bare array.
    """
    body = body or {}

    customers = await native_list_customers(
        db=db,
        limit=body.get("limit", 5),
        skip=body.get("skip", 0),
        sort_by_risk=body.get("sortByRisk", False),
        behavioral_source=body.get("behavioralSource"),
    )
    return {"customers": [_strip(c) for c in customers]}
