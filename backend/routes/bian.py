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
    POST /PartyReferenceDataDirectory/Register                        Register
    PUT  /PartyReferenceDataDirectory/{id}/Update                     Update
    GET  /FraudModel/{id}/Retrieve                                    Retrieve
    POST /FraudModel/Create                                           Create

The four routes below the original three were added after a code-level audit of all ~110
native routes across both backends. Only six mapped cleanly; the rest were rejected, and
the two most common reasons are worth stating because they will come up again:

  * **The two-id trap.** BIAN sub-resource paths need a second id — `Production/{productionid}`,
    `Testing/{testingid}`, `Associations/{associationsid}`. This service has no value to put
    in any of them, so `/models/{id}/activate`, `/models/{id}/performance`,
    `/models/{id}/feedback` and every entity-resolution route stay native.
  * **No id-less list operation.** BIAN defines none on these SDs, so `GET /models/`,
    `GET /transactions/` and the risk/flag feeds have no target. `PartyReferenceDataDirectory`
    is the one exception this file makes, by project convention (see `party_request`).

Also rejected: `PUT /models/{model_id}` (`FraudModel` has no top-level `Update` in v14 —
only under `Testing/{testingid}`), `POST /transactions/` (persists, which contradicts the
score-without-storing semantics of `Evaluate` documented below), all six `/fraud-patterns/*`
routes (no SD covers a fraud-typology collection — consistent with the collection-level
rejection of `threatsightFraudPatterns` in `bian-mapping.md`), and `WS /models/change-stream`
(BIAN has no streaming operation).

The party surface mirrors the Leafy Bank accounts service exactly
(`leaf-bank-bian/backend/accounts/main.py:132,149`), so the two read as one system:

    GET  /PartyReferenceDataDirectory/{partyreferencedatadirectoryid}/Retrieve   one customer
    POST /PartyReferenceDataDirectory/Request                                    filtered list

`Request` — not a second `Retrieve` — is what carries the list. BIAN has no list operation
on this SD, and that is the split accounts already chose. Same convention as the payments
demo (`fsi-payments-processing` `PaymentRail/…`): literal SD name in the path, `GET` for
retrieves with the CR instance id, `POST` for the body-carrying verbs.
"""

import json

from fastapi import APIRouter, Body, Depends
from fastapi.encoders import jsonable_encoder
from fastapi.responses import JSONResponse
from typing import Any, Dict, Optional

from db.mongo_db import MongoDBAccess
from dependencies import get_database
from models.customer import CustomerModel
from services.fraud_detection import FraudDetectionService

from routes.customer import get_db as get_customer_db
from routes.customer import create_customer as native_create_customer
from routes.customer import get_customer as native_get_customer
from routes.customer import list_customers as native_list_customers
from routes.customer import update_customer as native_update_customer
from routes.model_management import RiskModelCreate
from routes.model_management import create_risk_model as native_create_risk_model
from routes.model_management import get_risk_model as native_get_risk_model
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


@router.post(
    "/PartyReferenceDataDirectory/Register",
    status_code=201,
    response_description="BIAN PartyReferenceDataDirectory/Register — create a customer",
)
async def party_register(
    customer: CustomerModel = Body(...),
    db: MongoDBAccess = Depends(get_customer_db),
):
    """BIAN `PartyReferenceDataDirectory` / `Register` — create a party.

    `Register` is the id-less creation verb on this SD and is a genuine v14 operation
    (`POST /PartyReferenceDataDirectory/Register`), unlike the `Request` route above, which
    is this project's deliberate convention for the list BIAN does not define.

    The native handler returns a `JSONResponse` rather than a dict (it sets 201 itself), so
    the body is decoded to re-envelope it. That is plumbing, not logic — the document is
    passed through untouched and the 201 is preserved.
    """
    created = await native_create_customer(customer=customer, db=db)
    document = json.loads(created.body)

    return JSONResponse(
        status_code=201,
        content={
            "customerId": document["customerId"],
            "customer": _strip(document),
        },
    )


@router.put(
    "/PartyReferenceDataDirectory/{partyreferencedatadirectoryid}/Update",
    response_description="BIAN PartyReferenceDataDirectory/Update — amend a customer",
)
async def party_update(
    partyreferencedatadirectoryid: str,
    customer: CustomerModel = Body(...),
    db: MongoDBAccess = Depends(get_customer_db),
):
    """BIAN `PartyReferenceDataDirectory` / `Update` — amend an existing party.

    Delegates to the native `PUT /customers/{customer_id}`, so the partial-update semantics
    (only non-null fields are `$set`) and the 404 on an unknown id are unchanged.

    Envelope matches `party_retrieve` — `{customerId, customer}`.
    """
    updated = await native_update_customer(
        customer_id=partyreferencedatadirectoryid,
        customer=customer,
        db=db,
    )
    return {
        "customerId": updated["customerId"],
        "customer": _strip(updated),
    }


# --- Stage 0: Design — FraudModel ------------------------------------------------------

@router.get(
    "/FraudModel/{fraudmodelid}/Retrieve",
    response_description="BIAN FraudModel/Retrieve — one scoring model",
)
async def fraud_model_retrieve(
    fraudmodelid: str,
    version: Optional[int] = None,
    db=Depends(get_database),
):
    """BIAN `FraudModel` / `Retrieve` — a single scoring model by id.

    `{fraudmodelid}` is the native `model_id`. `version` stays a query parameter: `modelId`
    alone is not unique (the collection's unique index is `modelId` + `version`), and BIAN
    has no path segment for a model version, so omitting it keeps the native "latest
    non-archived" default.

    The native handler already returns the wire shape — `to_wire()` lifts
    `usageGuidelines.*` back to flat `thresholds` / `weights` / `riskFactors` and casts the
    stored string `version` to an int — so no translation happens here. Only the Mongo key
    is dropped: the BIAN identity of this record is `modelId`.
    """
    model = await native_get_risk_model(
        model_id=fraudmodelid,
        version=version,
        db=db,
    )
    document = _strip(jsonable_encoder(model))

    return {
        "modelId": document["modelId"],
        "fraudModel": document,
    }


@router.post(
    "/FraudModel/Create",
    response_description="BIAN FraudModel/Create — register a new scoring model version",
)
async def fraud_model_create(
    model: RiskModelCreate,
    db=Depends(get_database),
):
    """BIAN `FraudModel` / `Create` — register a model.

    Id-less creation verb, so no path parameter. The native handler owns the versioning
    rule (a repeat `modelId` mints the next version rather than colliding) and the `draft`
    starting status; neither is re-implemented here.

    Note what this operation deliberately does NOT cover: activating a model. BIAN's
    `PUT /FraudModel/{id}/Production/{productionid}/Execute` needs a production-instance id
    that this service has no value for, and `Execute` means *run the model*, not *flip a
    lifecycle flag* — so `POST /models/{id}/activate` stays native only.
    """
    created = await native_create_risk_model(model=model, db=db)
    document = _strip(jsonable_encoder(created))

    return {
        "modelId": document["modelId"],
        "fraudModel": document,
    }
