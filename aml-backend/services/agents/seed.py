"""
Seed script for the agentic investigation pipeline.

Creates ONLY the new agent-specific collections:
  - typology_library   (~12 AML typology patterns)
  - compliance_policies (~6 SAR / FinCEN guidance docs)
  - investigations      (empty, with indexes)

Existing entities (504), transactionsv2 (12,766), and relationships (519)
are reused as-is -- this script never touches them.

Run:
    python -m services.agents.seed
"""

import asyncio
import logging
import os
from datetime import datetime, timezone

from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)

MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME", "fsi-threatsight360")

# ── typology_library ──────────────────────────────────────────────────────

TYPOLOGIES = [
    {
        "typology_id": "typ_structuring",
        "name": "Structuring / Smurfing",
        "category": "money_laundering",
        "description": (
            "Breaking large sums into smaller deposits or transactions to "
            "evade Currency Transaction Report (CTR) thresholds, typically "
            "below $10,000. Often involves multiple accounts, branches, or "
            "individuals making deposits in rapid succession."
        ),
        "red_flags": [
            "Multiple cash deposits just below $10,000",
            "Same-day deposits at different branches",
            "Use of multiple accounts by the same beneficial owner",
            "Round-dollar deposits with no clear business purpose",
        ],
        "regulatory_references": ["31 CFR 1010.311", "FinCEN Advisory FIN-2014-A007"],
    },
    {
        "typology_id": "typ_layering",
        "name": "Layering",
        "category": "money_laundering",
        "description": (
            "Complex series of financial transactions designed to distance "
            "illicit funds from their source. Typically involves moving money "
            "through multiple accounts, entities, or jurisdictions via wire "
            "transfers, intercompany transfers, and shell company chains."
        ),
        "red_flags": [
            "Rapid movement of funds through multiple accounts",
            "Shell-to-shell company transfers with no business rationale",
            "Circular fund flows returning to the originator",
            "Use of intermediary jurisdictions with weak AML controls",
        ],
        "regulatory_references": ["FATF Recommendation 20", "FinCEN Advisory FIN-2006-A003"],
    },
    {
        "typology_id": "typ_funnel_account",
        "name": "Funnel Account",
        "category": "money_laundering",
        "description": (
            "A single bank account receives deposits from many sources in one "
            "geographic area and rapidly disburses funds to a different area. "
            "The account acts as a funnel consolidating illicit proceeds before "
            "moving them out."
        ),
        "red_flags": [
            "High volume of deposits from unrelated third parties",
            "Deposits in one region, withdrawals in another",
            "Rapid in-and-out movement leaving minimal balance",
            "Account holder demographics inconsistent with activity volume",
        ],
        "regulatory_references": ["FinCEN Advisory FIN-2016-A003"],
    },
    {
        "typology_id": "typ_trade_based_ml",
        "name": "Trade-Based Money Laundering",
        "category": "money_laundering",
        "description": (
            "Exploiting international trade transactions to transfer value "
            "across borders. Methods include over- or under-invoicing goods, "
            "multiple invoicing for the same shipment, and misrepresentation "
            "of goods or services."
        ),
        "red_flags": [
            "Significant discrepancies between invoice value and fair market value",
            "Repeated transactions with shell companies in free-trade zones",
            "Goods described inconsistently across shipping and payment documents",
            "Payment patterns inconsistent with trade terms",
        ],
        "regulatory_references": ["FATF Report on Trade-Based Money Laundering (2006)"],
    },
    {
        "typology_id": "typ_terrorist_financing",
        "name": "Terrorist Financing",
        "category": "terrorist_financing",
        "description": (
            "Provision or collection of funds intended to be used to carry out "
            "terrorist acts. Funds may originate from legitimate or illegitimate "
            "sources and often involve small amounts that are difficult to detect."
        ),
        "red_flags": [
            "Transactions linked to designated terrorist organizations or individuals",
            "Funds sent to conflict zones with no clear humanitarian purpose",
            "Dormant accounts suddenly activated with unusual patterns",
            "Connections to charities or NGOs under sanctions scrutiny",
        ],
        "regulatory_references": ["FATF Recommendation 5", "Executive Order 13224"],
    },
    {
        "typology_id": "typ_fraud_scheme",
        "name": "Fraud Scheme",
        "category": "fraud",
        "description": (
            "Use of deception to obtain financial gain, including identity fraud, "
            "account takeover, advance-fee schemes, and investment fraud. "
            "Fraudulent proceeds are often laundered through the financial system."
        ),
        "red_flags": [
            "New accounts rapidly funded and drained",
            "Forged or inconsistent identity documents",
            "Sudden change in transaction patterns after account takeover",
            "Payments to known fraud-associated entities",
        ],
        "regulatory_references": ["18 U.S.C. § 1343 (Wire Fraud)"],
    },
    {
        "typology_id": "typ_sanctions_evasion",
        "name": "Sanctions Evasion",
        "category": "sanctions",
        "description": (
            "Attempts to circumvent economic sanctions programs by concealing "
            "the involvement of sanctioned parties. Methods include use of "
            "front companies, intermediaries, re-routing transactions through "
            "non-sanctioned jurisdictions, and falsifying transaction details."
        ),
        "red_flags": [
            "Transactions involving entities in sanctioned jurisdictions",
            "Use of intermediary entities to obscure sanctioned party involvement",
            "OFAC-SDN or EU sanctions list matches on counterparties",
            "Sudden changes in shipping routes to avoid sanctioned ports",
        ],
        "regulatory_references": ["OFAC Guidance (2019)", "EU Regulation 269/2014"],
    },
    {
        "typology_id": "typ_shell_company",
        "name": "Shell Company Abuse",
        "category": "money_laundering",
        "description": (
            "Use of corporate entities with no legitimate business operations, "
            "assets, or employees to obscure beneficial ownership and facilitate "
            "money laundering, tax evasion, or sanctions evasion. Often involves "
            "nominee directors and registered agents."
        ),
        "red_flags": [
            "Entity with no physical office, employees, or operations",
            "Nominee directors with multiple directorships across shell entities",
            "Registered in secrecy jurisdiction with opaque ownership",
            "High transaction volume inconsistent with stated business purpose",
        ],
        "regulatory_references": ["Corporate Transparency Act (2024)", "FATF Recommendation 24"],
    },
    {
        "typology_id": "typ_crypto_mixing",
        "name": "Cryptocurrency Mixing / Tumbling",
        "category": "money_laundering",
        "description": (
            "Use of cryptocurrency mixing services (tumblers) to obscure the "
            "trail of digital assets. Funds are pooled with others and "
            "redistributed to break the on-chain link between sender and "
            "recipient."
        ),
        "red_flags": [
            "Transactions to or from known mixing service addresses",
            "Rapid conversion between multiple cryptocurrency types",
            "Deposits from decentralized exchanges with no KYC",
            "Structuring crypto purchases to avoid identity verification thresholds",
        ],
        "regulatory_references": ["FinCEN Advisory FIN-2019-A003"],
    },
    {
        "typology_id": "typ_elder_exploitation",
        "name": "Elder Financial Exploitation",
        "category": "fraud",
        "description": (
            "Financial abuse of elderly individuals, including unauthorized "
            "withdrawals, coerced transfers, identity theft targeting seniors, "
            "and exploitation by caregivers or family members."
        ),
        "red_flags": [
            "Sudden large withdrawals by or on behalf of elderly account holders",
            "New authorized signers or powers of attorney added to elderly accounts",
            "Account activity inconsistent with the elder's known lifestyle",
            "Transfers to recently associated individuals with no prior relationship",
        ],
        "regulatory_references": ["FinCEN Advisory FIN-2022-A001"],
    },
    {
        "typology_id": "typ_pep_abuse",
        "name": "PEP Corruption / Abuse of Office",
        "category": "corruption",
        "description": (
            "Politically Exposed Persons using their position for personal "
            "enrichment through bribery, embezzlement of public funds, or "
            "directing government contracts to related entities. Proceeds "
            "are often laundered through offshore accounts and shell companies."
        ),
        "red_flags": [
            "Confirmed PEP status with unexplained wealth",
            "Transactions between PEP accounts and offshore entities",
            "Government contracts awarded to entities linked to the PEP",
            "Lifestyle inconsistent with declared income or public salary",
        ],
        "regulatory_references": ["FATF Recommendation 12", "UN Convention Against Corruption"],
    },
    {
        "typology_id": "typ_unknown",
        "name": "Unclassified Suspicious Activity",
        "category": "unclassified",
        "description": (
            "Activity that is suspicious but does not fit cleanly into a known "
            "typology. Requires further investigation to determine the nature "
            "of the underlying illicit activity."
        ),
        "red_flags": [
            "Unusual patterns that defy categorization",
            "Multiple minor anomalies that individually seem benign",
        ],
        "regulatory_references": [],
    },
]

# ── compliance_policies ───────────────────────────────────────────────────

POLICIES = [
    {
        "policy_id": "pol_sar_5ws",
        "title": "SAR Narrative Structure – The Five Ws",
        "category": "sar_filing",
        "content": (
            "A SAR narrative must address: WHO is conducting the suspicious "
            "activity (full name, account numbers, identification)? WHAT "
            "instruments or mechanisms are being used (cash, wire, ACH, crypto)? "
            "WHEN did the activity occur (specific dates and timeframes)? "
            "WHERE did the activity take place (branch, online, jurisdiction)? "
            "WHY is the activity suspicious (deviation from normal pattern, "
            "red flags, typology match)? Additionally, describe HOW the "
            "activity was conducted (modus operandi, layering steps, "
            "structuring method)."
        ),
    },
    {
        "policy_id": "pol_sar_format",
        "title": "SAR Narrative Formatting Requirements",
        "category": "sar_filing",
        "content": (
            "The narrative should follow three sections: (1) Introduction – "
            "reason for filing, subject identification, summary of suspicious "
            "activity. (2) Body – chronological detail of transactions, "
            "amounts, counterparties, and investigative findings with specific "
            "dates and dollar amounts. (3) Conclusion – actions taken by the "
            "institution, documents available upon request, and whether the "
            "account remains open or has been closed. Use plain language. "
            "Avoid jargon, unexplained acronyms, and institution-specific codes."
        ),
    },
    {
        "policy_id": "pol_sar_filing_rules",
        "title": "FinCEN SAR Filing Thresholds and Timing",
        "category": "regulatory",
        "content": (
            "A SAR must be filed for transactions involving $5,000 or more "
            "when the institution knows, suspects, or has reason to suspect "
            "the transaction involves funds from illegal activity, is designed "
            "to evade BSA requirements, lacks a lawful purpose, or involves "
            "use of the institution to facilitate criminal activity. Initial "
            "SARs must be filed within 30 calendar days of detection. "
            "Continuing activity SARs should be filed every 90 days, though "
            "per the October 2025 FinCEN FAQs this cycle is optional and "
            "institutions are encouraged to focus on quality over volume."
        ),
    },
    {
        "policy_id": "pol_evidence_citation",
        "title": "Evidence Citation and Grounding Policy",
        "category": "internal",
        "content": (
            "All factual claims in investigation narratives MUST cite their "
            "evidence source. Use bracket notation: [entity_profile], "
            "[transaction:<transactionId>], [relationship:<relationshipId>], "
            "[watchlist:<listId>], [network_analysis]. NEVER fabricate or "
            "infer facts not present in the gathered evidence. If information "
            "is unavailable, state 'Information not available in current records' "
            "rather than guessing."
        ),
    },
    {
        "policy_id": "pol_risk_thresholds",
        "title": "Investigation Risk Thresholds and Escalation",
        "category": "internal",
        "content": (
            "Risk-based escalation tiers: (1) Auto-Close – risk score below "
            "25, no watchlist hits, no flagged transactions, entity type is "
            "generic with clean history. (2) Standard Investigation – risk "
            "score 25-70, requires full pipeline analysis and human review. "
            "(3) Urgent Escalation – risk score above 70, confirmed sanctions "
            "hits, or PEP with suspicious transaction patterns. Urgent cases "
            "bypass standard queue and are routed directly to senior analysts."
        ),
    },
    {
        "policy_id": "pol_human_review",
        "title": "Human Review Requirements",
        "category": "regulatory",
        "content": (
            "All SAR filing decisions require human analyst approval. The AI "
            "system assists with data gathering, analysis, and narrative "
            "drafting, but the final determination of whether activity is "
            "suspicious and warrants filing rests with a qualified compliance "
            "analyst. The analyst must review the complete case file, validate "
            "the AI-generated narrative against source evidence, and document "
            "their independent judgment before approving or rejecting the filing."
        ),
    },
]


async def seed_agent_collections() -> dict:
    """Insert typology_library, compliance_policies, and set up investigations."""
    client = AsyncIOMotorClient(MONGODB_URI)
    db = client[DB_NAME]

    now = datetime.now(timezone.utc).isoformat()
    stats: dict = {}

    # ── typology_library ──────────────────────────────────────────────
    coll = db["typology_library"]
    await coll.drop()
    docs = [{**t, "created_at": now} for t in TYPOLOGIES]
    result = await coll.insert_many(docs)
    await coll.create_index("typology_id", unique=True)
    stats["typology_library"] = len(result.inserted_ids)

    # ── compliance_policies ───────────────────────────────────────────
    coll = db["compliance_policies"]
    await coll.drop()
    docs = [{**p, "created_at": now} for p in POLICIES]
    result = await coll.insert_many(docs)
    await coll.create_index("policy_id", unique=True)
    stats["compliance_policies"] = len(result.inserted_ids)

    # ── investigations (empty, with indexes) ──────────────────────────
    coll = db["investigations"]
    existing = await coll.count_documents({})
    if existing == 0:
        await coll.create_index("case_id", unique=True, sparse=True)
        await coll.create_index("investigation_status")
        await coll.create_index("created_at")
        await coll.create_index("entity_id")
    stats["investigations_indexes"] = "created"

    client.close()
    return stats


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    result = asyncio.run(seed_agent_collections())
    for k, v in result.items():
        print(f"  {k}: {v}")
    print("Seed complete.")
