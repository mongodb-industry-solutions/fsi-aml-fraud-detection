"""BIAN v14 service-domain surface for the AML backend.

Mirrors `backend/routes/bian.py` in the fraud service: handlers hold **no logic**, each one
delegates to the native handler so there is exactly one implementation per operation and the
two surfaces cannot drift. Additive — every native route stays registered and working.

Path provenance, from the local BIAN v14 index (`kg -s bian`):

    GET  /FraudResolution/{fraudresolutionid}/Retrieve                 Retrieve
    GET  /FraudEvaluation/{fraudevaluationid}/Retrieve                 Retrieve

Two routes. That is not an oversight — a code-level audit of this backend's ~70 routes found
exactly one clean wrapper (`FraudResolution/Retrieve`); the second is net-new code, flagged as
such on the handler. The reasons the others were rejected are worth recording here so the
question is not reopened from the route list alone:

  * **`POST /agents/investigate` is the true owner of `FraudResolution/Initiate`** — the only
    `insert_one` into `fraudResolution` is `services/agents/nodes/finalize.py`, which runs as
    a terminal LangGraph node inside that request. But the route returns a
    `StreamingResponse` (`text/event-stream`), and BIAN has no streaming operation. Wrapping
    it would mean converting SSE to a synchronous response — logic, which this file forbids.
    So `Initiate` has no honest home and is deliberately absent.
  * **`POST /llm/investigation/create-case` is NOT `Initiate`.** It composes an LLM narrative
    and a `case_document` and returns them in the body; `services/llm/investigation_service.py`
    performs no persistence at all. Labelling it `Initiate` would claim a control record is
    created when none is.
  * **The entity-resolution routes all fail the two-id test.** `Associations/{associationsid}`
    needs an association id; `resolve_entities` keys on `sourceEntityId`/`targetMasterEntityId`
    and the status/linked routes on `entity_id` alone. No association record with its own
    identity is ever created here, so the id would have to be fabricated.
  * **`GET /entities/{entity_id}` was rejected on collision, not on fit.** It maps cleanly to
    `GET /PartyReferenceDataDirectory/{id}/Retrieve` — but the fraud backend already serves
    that exact path over the *same* `customers` collection. Two services answering one BIAN
    URL would leave the frontend proxy an arbitrary choice, so the fraud service keeps it.
  * The list, analytics, search, seed, health, WebSocket and PDF routes have no BIAN
    operation and are not forced into one — same standard `bian-fraud-flow.md` §6.3 applies
    to search and network analytics.
"""

from fastapi import APIRouter, Depends, HTTPException

from repositories.impl.transaction_repository import TransactionRepository
from routes.agents.investigation_routes import get_investigation as native_get_investigation
from routes.transactions import get_transaction_repository
from services.agents import fraud_resolution_shape as frs

router = APIRouter(tags=["bian"])


def _camel_key(key: str) -> str:
    """`case_id` → `caseId`. Leaves already-camel keys alone.

    Keys starting with `_` are returned untouched so `_id` never becomes `Id`.
    """
    if key.startswith("_") or "_" not in key:
        return key
    head, *rest = key.split("_")
    return head + "".join(part[:1].upper() + part[1:] for part in rest)


def _camelize(value):
    """Recursively camelCase every dict key in `value`. Values are never touched.

    ⚠️ Byte-identical mirror of `_camel_key` / `_camelize` in
    `backend/routes/bian.py`. The two backends are separate services with no shared
    import path, so this is a copy — change both together or the BIAN surface casing
    splits between the fraud and AML halves. Same discipline the umbrella defect log
    applies to `bian-alias-map.json` and `refs.py`.

    Needed here because `fraud_resolution_shape.to_wire()` deliberately returns the
    **snake_case** shape the frontend renders (`case_id`, `investigation_status`), while
    every BIAN surface in this project is camelCase. Converting at this boundary gives
    the BIAN wire one casing without touching the native route the UI depends on.
    """
    if isinstance(value, dict):
        return {_camel_key(k): _camelize(v) for k, v in value.items()}
    if isinstance(value, list):
        return [_camelize(item) for item in value]
    return value


# --- Stage 3: Resolve — FraudResolution ------------------------------------------------

@router.get(
    "/FraudResolution/{fraudresolutionid}/Retrieve",
    response_description="BIAN FraudResolution/Retrieve — one investigation case",
)
async def fraud_resolution_retrieve(fraudresolutionid: str):
    """BIAN `FraudResolution` / `Retrieve` — a single case by id.

    `{fraudresolutionid}` is the native `case_id`, which is `fraudResolution.caseId` — the
    CR primary key, so the BIAN path id and the stored identity are the same value.

    The native handler runs the document through `fraud_resolution_shape.to_wire()`, the
    boundary that un-nests the CR + three BQs back into the flat shape every consumer reads.
    That shape is snake_case by design, so `_camelize` converts it on the way out — the only
    thing this wrapper does. `_id` is projected out at the query, so there is no Mongo key
    to strip.

    The 404 on an unknown id is the native handler's, unchanged.

    Note what this SD does *not* expose here: `CaseAnalysis`, `CaseDetermination` and
    `CaseResolution` all need a second path id that no code produces, and `caseResolution{}`
    was deliberately never populated (the filing block would have been fabricated — see
    `threat360-migration/DECISION-investigations-to-fraudResolution.md`).
    """
    case = _camelize(await native_get_investigation(case_id=fraudresolutionid))

    return {
        "caseId": case[frs.CASE_ID],
        "fraudResolution": case,
    }


# --- Stage 1: Detect — FraudEvaluation -------------------------------------------------

@router.get(
    "/FraudEvaluation/{fraudevaluationid}/Retrieve",
    response_description="BIAN FraudEvaluation/Retrieve — one fraud evaluation assessment",
)
async def fraud_evaluation_retrieve(
    fraudevaluationid: str,
    repository: TransactionRepository = Depends(get_transaction_repository),
):
    """BIAN `FraudEvaluation` / `Retrieve` — a single assessment by id.

    `{fraudevaluationid}` is `fraudEvaluation.transactionId`, the collection's unique index
    and the migration's declared upsert key, so the BIAN path id and the stored identity
    are the same value.

    ⚠️ **This route is the exception to this file's "no logic" rule, deliberately.** Every
    other BIAN route here and in `backend/routes/bian.py` delegates to a native handler.
    This one has none to delegate to: an audit of both backends found that every read of
    `fraudEvaluation` is entity-scoped (`fromEntityId`/`toEntityId`) or a date-windowed
    aggregation, and no by-id lookup existed. `TransactionRepository.get_by_transaction_id`
    was added to supply that primitive, so the DB access still lives in the repository layer
    and this handler stays a thin boundary.

    The stored document is already camelCase and BIAN-shaped (CR `FraudEvaluationAssessment`),
    so unlike `fraud_resolution_retrieve` no recasing is needed — `_camelize` would be a
    no-op here and is deliberately not applied.

    Not exposed, for the same missing-primitive reason plus the two-id problem: the nested
    `Models/{modelsid}` and `RuleSetsandDecisionTrees/{rulesetsanddecisiontreesid}` reads,
    which need a second path id no code produces. And the write-side operations —
    `Grant`, `Request`, `Exchange`, `Execute` — have no backing at all: nothing in either
    backend writes this collection (the only writer is the offline migration loader), which
    is the `bian-fraud-flow.md` §7.5 gap, widened.
    """
    evaluation = await repository.get_by_transaction_id(fraudevaluationid)

    if not evaluation:
        raise HTTPException(
            status_code=404,
            detail=f"Fraud evaluation {fraudevaluationid} not found",
        )

    return {
        "transactionId": evaluation["transactionId"],
        "fraudEvaluation": evaluation,
    }
