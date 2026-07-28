"""Build a `leafy_bank_bian.transactions` document from a simulator request.

Mirrors `threat360-migration/build-scripts/build_sd6.py::build_txn`, which produced the
21,449 migrated documents. A simulated transaction that does not match that shape is not
a bug the app will report — it just reads back with missing fields, so keep the two in
step. The enum maps below are copied from that script; changing one means changing both.

Deliberate departures from the migration builder, each because the value does not exist
at request time rather than because the field is optional:

  balanceAfter  None — the migration fabricated a running per-party balance across the
                 whole history. There is no account balance to draw from here.
  externalRef   None — the migration preserved the pre-migration Mongo _id.
  createdBy     "simulator" rather than "migration:threat360-sd6".
  vector_embedding  omitted — the caller has no embedding. Consequence: a simulated
                 transaction is never returned by find_similar_transactions.
"""

from typing import Any, Dict, Optional

from db.scope import SOURCE_SYSTEM

CREATED_BY = "simulator"

# (paymentType, rail, transactionCategory, paymentMethod)
# `rail: "CARD"` is not in the v4_30 spec enum — emitted per the migration's decision.
PAYMENT_METHOD = {
    "credit_card": ("CARD_PAYMENT", "CARD", "CardPayment", None),
    "debit_card": ("CARD_PAYMENT", "CARD", "CardPayment", None),
    "digital_wallet": ("CARD_PAYMENT", "CARD", "DigitalPayment", None),
    "bank_transfer": ("CREDIT_TRANSFER", "ACH", "AccountTransfer", None),
}
# Only `refund` returns money to the customer.
DIRECTION = {
    "purchase": "OUTGOING",
    "payment": "OUTGOING",
    "withdrawal": "OUTGOING",
    "transfer": "OUTGOING",
    "refund": "INCOMING",
}
MOBILE_DEVICES = {"mobile", "tablet"}

# Fallbacks for a payment_method or transaction_type the migration never saw. Chosen so an
# unexpected value produces a well-formed document instead of a KeyError mid-insert.
DEFAULT_METHOD = ("CREDIT_TRANSFER", "ACH", "AccountTransfer", None)
DEFAULT_DIRECTION = "OUTGOING"


def build_transaction(src: Dict[str, Any], payer_name: Optional[str] = None) -> Dict[str, Any]:
    """Translate a snake_case request body into the stored camelCase shape.

    `src` is the inbound payload (customer_id, transaction_id, timestamp, amount,
    currency, merchant, location, device_info, transaction_type, payment_method,
    risk_assessment) — the wire format, which stays snake_case.
    """
    tid = src["transaction_id"]
    method = src.get("payment_method")
    txn_type = src.get("transaction_type") or "purchase"

    payment_type, rail, category, payment_method = PAYMENT_METHOD.get(method, DEFAULT_METHOD)
    direction = DIRECTION.get(txn_type, DEFAULT_DIRECTION)

    ts = src["timestamp"]
    if not isinstance(ts, str):
        ts = ts.isoformat()
    day = ts[:10]

    device = src.get("device_info") or {}
    channel = "MOBILE" if device.get("type") in MOBILE_DEVICES else "WEB"
    loc = src.get("location") or {}
    merchant = src.get("merchant") or {}
    customer_id = src.get("customer_id")

    return {
        "txnId": f"TXN-{tid}",
        "paymentId": f"PAY-{tid}",
        "externalRef": None,
        "bankRef": f"BNK-{tid[-8:]}",
        "rail": rail,
        "paymentType": payment_type,
        "direction": direction,
        "txnCode": merchant.get("category"),
        "amount": src["amount"],
        "currency": src.get("currency", "USD"),
        "fxRate": None,
        "baseAmount": src["amount"],
        "valueDate": day,
        "bookingDate": day,
        "description": f"{txn_type.title()} at {merchant.get('name') or 'unknown merchant'}",
        "narrative": None,
        "balanceAfter": None,
        "channel": channel,
        "payer": {
            "accountId": customer_id,
            "accountNo": f"ACC-STUB-{customer_id.split('-')[-1]}" if customer_id else None,
            "name": payer_name,
            "bic": None,
            "country": loc.get("country"),
            "isInternal": True,
        },
        "payee": {
            "accountId": None,
            "accountNo": merchant.get("id"),
            "name": merchant.get("name"),
            "bic": None,
            "country": loc.get("country"),
            "isInternal": False,
        },
        "transactionCategory": category,
        "paymentMethod": payment_method,
        "isReversed": False,
        "reversalTxnId": None,
        "transactionDates": [
            {"date": ts, "type": "TransactionInitiatedDate"},
            {"date": ts, "type": "TransactionCompletedDate"},
        ],
        "transactionStatus": "Completed",
        "isCompleted": True,
        "isNotified": False,
        "createdAt": ts,
        "createdBy": CREATED_BY,
        # Without this the document is invisible to every scoped read AND falls inside the
        # ledger change stream's ingest filter, which would reject it (payer.accountId is a
        # CUST- reference, not an account) and kill the worker.
        "sourceSystem": SOURCE_SYSTEM,
        "riskAssessment": src.get("risk_assessment"),
        "merchant": merchant,
        "location": loc,
        "deviceInfo": device,
        "paymentMethodSource": method,
        "transactionTypeSource": txn_type,
    }
