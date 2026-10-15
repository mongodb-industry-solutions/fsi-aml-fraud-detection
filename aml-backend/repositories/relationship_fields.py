"""Field paths for documents in the BIAN `relationships` collection.

Phase-2 migration: the AML backend used to read the source ThreatSight shape,
where the two party endpoints were nested objects::

    {"source": {"entityId": "PEP0-95A3FDCE0B"}, "target": {"entityId": ...},
     "type": "trustee_for", "direction": "bidirectional"}

The BIAN build (`build_sd7.py`) is flat, and carries *two* pairs of endpoint
keys::

    {"sourceCustomerId": "CUST-1ea73383",      # the new party identity
     "sourceEntityRef":  "PEP0-95A3FDCE0B",    # the original AML id, retained
     "associationType": "trustee_for", "direction": "BIDIRECTIONAL"}

`SOURCE_KEY` / `TARGET_KEY` select which pair the graph traverses on. Both pairs
are populated on every document, so the collection is traversable either way —
that is what let the collection flip land *before* the entity-identity recasing
(handover §5, "optional de-risking"). Step 3 moved them onto
`sourceCustomerId` / `targetCustomerId`, so the graph now joins on the same key
`customers` resolves on. Traversing on `*EntityRef` while the entity side keys
on `customerId` yields a graph with zero edges and no error.

Every relationship consumer must import from here rather than inlining a path;
a stale literal returns zero rows instead of raising (handover §7).
"""

# ─── party endpoints — the one decision this module exists to centralise ───
# Moved to the `CUST-…` identities in step 3, now that `customers` is the party
# source and the graph must join on the same key the entity side resolves on.
# This is the two-line change the module was created to make possible.
SOURCE_KEY = "sourceCustomerId"
TARGET_KEY = "targetCustomerId"

# The original AML `entityId`s, retained by build_sd7.py on every document.
# Kept named here because `rekey-map.json` plus these fields are the only
# bridge back to a source id — do not delete them from the build.
SOURCE_ENTITY_REF_KEY = "sourceEntityRef"
TARGET_ENTITY_REF_KEY = "targetEntityRef"

# ─── renamed scalars ───
TYPE_KEY = "associationType"          # was "type"
SUBTYPE_KEY = "associationSubType"    # was "subType"
ID_KEY = "associationId"              # was "relationshipId"
CREATED_KEY = "createdAt"             # was "created"
UPDATED_KEY = "updatedAt"             # was "updated"

# ─── unchanged scalars, named here so consumers have one import ───
CONFIDENCE_KEY = "confidence"
STRENGTH_KEY = "strength"
ACTIVE_KEY = "active"
VERIFIED_KEY = "verified"
DIRECTION_KEY = "direction"

# `direction` is uppercase in the BIAN build. A lowercase comparison silently
# counts zero bidirectional edges rather than failing.
DIRECTION_BIDIRECTIONAL = "BIDIRECTIONAL"
DIRECTION_DIRECTED = "DIRECTED"


def source_of(doc):
    """Party id at the source end of a fetched relationship document."""
    return doc.get(SOURCE_KEY)


def target_of(doc):
    """Party id at the target end of a fetched relationship document."""
    return doc.get(TARGET_KEY)


def type_of(doc, default="unknown"):
    return doc.get(TYPE_KEY, default)
