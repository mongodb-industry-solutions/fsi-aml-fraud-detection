"""Field paths for party documents, and the BIAN -> wire translation.

Phase-2 step 3: the AML backend's party source moved from `threatsightEntities`
(the source ThreatSight shape) to `customers` (the BIAN shape) in
`leafy_bank_bian`. Two things changed at once:

  * identity   `entityId` / `_id` ObjectId   ->  `customerId` string ("CUST-1ea73383")
  * shape      flat-ish ThreatSight          ->  nested BIAN

**The frontend was NOT recased.** It has no adapter layer, no TypeScript and no
tests; ~9 JSX components read nested paths (`entity.riskAssessment.overall.score`,
`entity.name.structured.first`, `entity.customerInfo.*`) straight off the API
response. Recasing that surface means ~40 identity sites plus every field path,
where a typo renders blank and throws nothing.

So the translation lives **here**, applied in the `$project` stage that every
live read path already had. Storage is BIAN; the wire keeps the shape the
frontend already speaks:

    stored   {"customerId": "CUST-1ea73383", "identification": {"fullName": ...}}
    wire     {"entityId":   "CUST-1ea73383", "name": {"full": ...}}

The identity **key** on the wire stays `entityId`; only its **value** becomes a
`CUST-…`. That keeps `/entities/[entityId]`, every React key and every prop
working unchanged, while storage keeps the single party identity that decision
D1 requires. `entityId` is NOT backfilled into the collection.

Two rules for anyone extending this:

1. **Never inline a BIAN path in a pipeline.** Import the constant. Every
   failure in this migration is silent (handover §7) -- a stale path returns
   zero rows or a blank field, it does not raise.
2. **Values change, not just paths.** `type` and `status` are UPPERCASE in BIAN
   (`INDIVIDUAL`/`CORPORATE`, `ACTIVE`). The frontend compares against lowercase
   literals in four places that fail silently, so the projection lowercases them
   on the way out and `to_storage_*()` uppercases filters on the way in.
   `riskProfile.overall.level` is the exception -- it stayed lowercase.
"""

# ─── identity ──────────────────────────────────────────────────────────────
# Storage key. Unique index `customerId_1` exists on the collection.
CUSTOMER_ID = "customerId"
# The key the API emits and the frontend reads. Carries a `CUST-…` value.
WIRE_ID = "entityId"

# ─── storage paths (BIAN `customers`) ──────────────────────────────────────
# Kept byte-identical to the paths indexed by
# threat360-migration/create_customers_search_indexes.py. If one moves, the
# Atlas Search index must be rebuilt in the same change or the path silently
# stops matching.
FULL_NAME = "identification.fullName"
FIRST_NAME = "identification.firstName"
MIDDLE_NAME = "identification.middleName"
LAST_NAME = "identification.lastName"
ALIASES = "identification.tradingName"
DATE_OF_BIRTH = "identification.dateOfBirth"
PLACE_OF_BIRTH = "identification.placeOfBirth"
NATIONALITY = "identification.nationality"      # scalar
NATIONALITIES = "nationalities"                 # array; the facet path
TYPE = "type"                                   # was `entityType`
STATUS = "status"
RESIDENCY = "residency"                         # unchanged
JURISDICTION = "organization.jurisdictionOfIncorporation"
RISK_OVERALL = "riskProfile.overall"            # was `riskAssessment.overall`
RISK_LEVEL = "riskProfile.overall.level"        # lowercase values -- unchanged
RISK_SCORE = "riskProfile.overall.score"        # 0-100, mixed int/float
CUSTOMER_INFO = "bankRelations.customerInfo"
BUSINESS_TYPE = "bankRelations.customerInfo.businessType"
ADDRESSES = "contact.addresses"
ADDRESS_LINE1 = "contact.addresses.line1"       # nearest thing to `addresses.full`
ADDRESS_CITY = "contact.addresses.city"
ADDRESS_COUNTRY = "contact.addresses.country"
EMAIL = "contact.email"
PHONE = "contact.phone"
IDENTIFIERS = "identifiers"                     # unchanged
IDENTIFIER_TYPE = "identifiers.type"            # unchanged
IDENTIFIER_VALUE = "identifiers.value"          # unchanged
SCENARIO_KEY = "screening.scenarioKey"
WATCHLIST_MATCHES = "screening.watchlistMatches"
RESOLUTION = "screening.resolution"
CREATED_AT = "createdAt"
UPDATED_AT = "updatedAt"

# Unchanged between the two shapes -- named so consumers have one import.
PROFILE_EMBEDDING = "profileEmbedding"
IDENTIFIER_EMBEDDING = "identifierEmbedding"
BEHAVIORAL_EMBEDDING = "behavioralEmbedding"

# ─── shared-collection scoping ─────────────────────────────────────────────
# `customers` is SHARED with the Leafy Bank payments demo: 558 docs, 554 ours.
# Every AML read must be scoped or four payments parties leak into the AML UI.
SOURCE_SYSTEM = "sourceSystem"
SOURCE_SYSTEM_VALUE = "threatsight360"


def scoped(match=None):
    """Add the `sourceSystem` guard to a find/`$match` filter.

    Use on EVERY read of `customers`. Has no effect inside `$search` -- that
    stage bypasses the query layer entirely and needs `search_scope_clause()`.
    """
    out = dict(match or {})
    out[SOURCE_SYSTEM] = SOURCE_SYSTEM_VALUE
    return out


def search_scope_clause():
    """The `compound.filter` clause that scopes an Atlas `$search` stage.

    `equals` on a string requires the field indexed as `token`, which is why
    `sourceSystem` carries `{"type": "token"}` in both search index definitions.
    A `filter` clause matches without contributing to the relevance score, so
    scoping does not perturb ranking.
    """
    return {"equals": {"path": SOURCE_SYSTEM, "value": SOURCE_SYSTEM_VALUE}}


def vector_scope_filter():
    """The `filter` sub-document for a `$vectorSearch` stage."""
    return {SOURCE_SYSTEM: {"$eq": SOURCE_SYSTEM_VALUE}}


# ─── value translation ─────────────────────────────────────────────────────
# The BIAN transform uppercased `type` and `status`. `riskProfile.overall.level`
# was NOT uppercased -- do not "fix" it.
#
# Note CORPORATE -> "organization", not "corporate": the source demo's value was
# `organization`, and NetworkStatisticsPanel.jsx compares `type === 'individual'`
# with no lowercasing, so the wire has to match the source vocabulary exactly.
_TYPE_TO_WIRE = {
    "INDIVIDUAL": "individual",
    "CORPORATE": "organization",
    "SME": "organization",
    "TRUST": "organization",
    "GOVERNMENT": "organization",
    "FINANCIAL_INSTITUTION": "organization",
}
_TYPE_TO_STORAGE = {"individual": "INDIVIDUAL", "organization": "CORPORATE"}


def type_to_storage(value):
    """Map an inbound filter value ('individual') to its stored form."""
    if value is None:
        return None
    return _TYPE_TO_STORAGE.get(str(value).lower(), str(value).upper())


def type_to_wire(value):
    """Map a stored value ('INDIVIDUAL') to what the frontend expects."""
    if value is None:
        return None
    return _TYPE_TO_WIRE.get(str(value).upper(), str(value).lower())


def status_to_storage(value):
    return None if value is None else str(value).upper()


def status_to_wire(value):
    return None if value is None else str(value).lower()


# `$switch` branches mirroring _TYPE_TO_WIRE, for use inside a projection.
_TYPE_TO_WIRE_EXPR = {
    "$switch": {
        "branches": [
            {"case": {"$eq": [f"${TYPE}", "INDIVIDUAL"]}, "then": "individual"},
        ],
        "default": {
            "$cond": [
                {"$eq": [{"$type": f"${TYPE}"}, "missing"]},
                None,
                "organization",
            ]
        },
    }
}


def _as_array(expr):
    """Coerce a field that may be a single embedded document into an array.

    `contact.addresses` is read by the frontend through `getPrimaryAddress()`,
    which iterates and looks for a `.primary` flag -- so it must be an array on
    the wire. Whether BIAN stores one document or many is not something this
    module should assume, and guessing wrong yields a blank address panel with
    no error.
    """
    return {
        "$switch": {
            "branches": [
                {"case": {"$isArray": expr}, "then": expr},
                {"case": {"$eq": [{"$type": expr}, "object"]}, "then": [expr]},
            ],
            "default": [],
        }
    }


def _address_wire():
    """Rebuild the wire address shape, synthesising the `full` line.

    BIAN has no `addresses.full`; the source demo displayed one. Compose it from
    line1 / city / country so the detail page keeps rendering an address string.
    """
    parts = ["$$a.line1", "$$a.city", "$$a.country"]
    return {
        "$map": {
            "input": _as_array(f"${ADDRESSES}"),
            "as": "a",
            "in": {
                "$mergeObjects": [
                    "$$a",
                    {
                        "full": {
                            "$trim": {
                                "input": {
                                    "$reduce": {
                                        "input": [
                                            {"$ifNull": [p, ""]} for p in parts
                                        ],
                                        "initialValue": "",
                                        "in": {
                                            "$cond": [
                                                {"$eq": ["$$this", ""]},
                                                "$$value",
                                                {
                                                    "$cond": [
                                                        {"$eq": ["$$value", ""]},
                                                        "$$this",
                                                        {
                                                            "$concat": [
                                                                "$$value",
                                                                ", ",
                                                                "$$this",
                                                            ]
                                                        },
                                                    ]
                                                },
                                            ]
                                        },
                                    }
                                },
                                "chars": " ,",
                            }
                        },
                        "structured": {
                            "city": "$$a.city",
                            "country": "$$a.country",
                        },
                    },
                ]
            },
        }
    }


def _contact_info_wire():
    """Rebuild `contactInfo[]` from the BIAN `contact.email` / `contact.phone`."""
    return {
        "$filter": {
            "input": [
                {"type": "email", "value": f"${EMAIL}", "primary": True},
                {"type": "phone", "value": f"${PHONE}", "primary": False},
            ],
            "as": "c",
            "cond": {"$ne": ["$$c.value", None]},
        }
    }


def wire_projection(include_embeddings=True):
    """The `$project` stage translating a BIAN `customers` doc to the wire shape.

    This is the single point where storage shape becomes response shape. Every
    live read path applies it. Keys here are what the frontend reads -- see the
    field inventory in the phase-2 handover before changing any of them.

    Fields the BIAN transform carried over verbatim (`identifiers`,
    `residency`, the embeddings, `behavioral_analytics`, `account_info`) are
    projected through unchanged. If any of those turn out to live under a
    different BIAN path, they arrive absent rather than wrong, and the frontend
    already guards each with optional chaining.
    """
    proj = {
        "_id": 1,
        WIRE_ID: f"${CUSTOMER_ID}",
        "sourceSystem": 1,
        "scenarioKey": f"${SCENARIO_KEY}",
        "name": {
            "full": f"${FULL_NAME}",
            "aliases": {"$ifNull": [f"${ALIASES}", []]},
            "structured": {
                "first": f"${FIRST_NAME}",
                "middle": f"${MIDDLE_NAME}",
                "last": f"${LAST_NAME}",
            },
        },
        "entityType": _TYPE_TO_WIRE_EXPR,
        "status": {"$toLower": {"$ifNull": [f"${STATUS}", ""]}},
        "dateOfBirth": f"${DATE_OF_BIRTH}",
        "placeOfBirth": f"${PLACE_OF_BIRTH}",
        # The frontend accepts a scalar or an array here. Prefer the scalar the
        # BIAN transform kept on `identification`, fall back to the array's head.
        "nationality": {
            "$ifNull": [f"${NATIONALITY}", {"$first": {"$ifNull": [f"${NATIONALITIES}", []]}}]
        },
        "residency": 1,
        "jurisdictionOfIncorporation": f"${JURISDICTION}",
        "addresses": _address_wire(),
        "contactInfo": _contact_info_wire(),
        "identifiers": 1,
        "identifierText": 1,
        "behavioralText": 1,
        "customerInfo": f"${CUSTOMER_INFO}",
        "behavioral_analytics": 1,
        "account_info": 1,
        "watchlistMatches": {"$ifNull": [f"${WATCHLIST_MATCHES}", []]},
        "riskAssessment": "$riskProfile",
        "resolution": f"${RESOLUTION}",
        "createdAt": 1,
        "updatedAt": 1,
        # The list view reads these flattened aliases (EntityList.jsx).
        "created_date": f"${CREATED_AT}",
        "updated_date": f"${UPDATED_AT}",
    }
    if include_embeddings:
        proj.update({
            PROFILE_EMBEDDING: 1,
            IDENTIFIER_EMBEDDING: 1,
            BEHAVIORAL_EMBEDDING: 1,
        })
    return proj


def list_projection():
    """Wire shape for the paginated list, plus the flat aliases EntityList reads.

    EntityList.jsx reads `name_full`, `risk_level`, `risk_score`,
    `watchlist_matches_count` as top-level keys -- a flattening the source
    projection already did. Embeddings are excluded: 554 x 1536 floats per page
    is a large response the list never uses.
    """
    proj = wire_projection(include_embeddings=False)
    proj.update({
        "name_full": f"${FULL_NAME}",
        "risk_level": f"${RISK_LEVEL}",
        "risk_score": f"${RISK_SCORE}",
        "watchlist_matches_count": {
            "$size": {"$ifNull": [f"${WATCHLIST_MATCHES}", []]}
        },
        "has_watchlist_matches": {
            "$gt": [{"$size": {"$ifNull": [f"${WATCHLIST_MATCHES}", []]}}, 0]
        },
        "resolution_status": f"${RESOLUTION}.status",
    })
    return proj


# ─── graph node shape ──────────────────────────────────────────────────────
# network_repository builds nodes straight from fetched docs rather than going
# through wire_projection. These accessors keep those call sites from inlining
# BIAN paths.

def id_of(doc):
    """Party identity from a raw `customers` document."""
    return doc.get(CUSTOMER_ID)


def name_of(doc):
    ident = doc.get("identification") or {}
    return ident.get("fullName")


def type_of(doc):
    return type_to_wire((doc.get(TYPE)))


def risk_overall_of(doc):
    return ((doc.get("riskProfile") or {}).get("overall")) or {}
