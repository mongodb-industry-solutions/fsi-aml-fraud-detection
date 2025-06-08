#### D. `transactionsv2` Collection

- **Purpose:** Stores financial transaction records for entities. Used for monitoring transactional behavior, identifying suspicious patterns, and contributing to activity risk scores.
- **MongoDB Strengths Showcased:** Scalability for high-volume data, flexible schema for diverse transaction details, Aggregation Pipeline (for pattern detection, summarization), Change Streams (for real-time pKYC).

**Schema:**

| Field                        | Data Type       | Description & (Example/Notes)                                                                                                                                    |
| :--------------------------- | :-------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `_id`                        | ObjectId        | Unique MongoDB document identifier.                                                                                                                              |
| `transactionId`              | String          | Unique application-level ID for the transaction. (e.g., "TXN-XXXX") - **Indexed (Unique)**                                                                       |
| `entityId`                   | String          | `entityId` of the customer involved in the transaction. - **Indexed**                                                                                            |
| `entityType`                 | String          | "individual" or "organization" (of the `entityId`).                                                                                                              |
| `timestamp`                  | ISODate         | Date and time of the transaction. - **Indexed**                                                                                                                  |
| `amount`                     | Number (Double) | Transaction amount. - **Indexed**                                                                                                                                |
| `currency`                   | String          | ISO currency code. (e.g., "USD", "EUR") - **Indexed**                                                                                                            |
| `direction`                  | String          | "incoming" or "outgoing" (relative to `entityId`).                                                                                                               |
| `counterpartyName`           | String          | Name of the other party in the transaction.                                                                                                                      |
| `counterpartyAccountNumber`  | String          | Account number of the counterparty.                                                                                                                              |
| `counterpartyBank`           | String          | Bank of the counterparty.                                                                                                                                        |
| `counterpartyCountry`        | String          | ISO Country code of the counterparty. - **Indexed**                                                                                                              |
| `transactionType`            | String          | Type of transaction. (e.g., "wire_transfer_international", "cash_deposit_branch", "card_payment_online_ecom") - **Indexed**                                      |
| `paymentMethod`              | String          | Method of payment. (e.g., "SWIFT", "ACH", "CardNetwork", "CryptoExchange")                                                                                       |
| `description`                | String          | Transaction description or memo.                                                                                                                                 |
| `channel`                    | String          | How the transaction was initiated. (e.g., "online_banking_web", "mobile_app_native", "atm_self_service")                                                         |
| `status`                     | String          | (e.g., "completed", "pending", "failed_insufficient_funds", "flagged_for_review") - **Indexed**                                                                  |
| `tags` (Array of Strings)    |                 | Descriptive tags for risky attributes. (e.g., "structuring_candidate", "high_risk_jurisdiction_counterparty", "large_cash_transaction") - **Indexed (Multikey)** |
| `additionalDetails` (Object) |                 | Flexible field for extra data like IP address, device ID, merchant category code.                                                                                |

**Standard MongoDB Indexes for `transactionsv2`:**

- `{ "entityId": 1, "timestamp": -1 }` (Primary query pattern)
- `{ "timestamp": -1 }`
- `{ "transactionId": 1 }` (Unique)
- `{ "counterpartyCountry": 1 }`
- `{ "transactionType": 1 }`
- `{ "amount": -1, "currency": 1 }`
- `{ "tags": 1 }` (Multikey index)
- `{ "status": 1 }`

---

### II. Demo Scenarios Leveraging MongoDB Strengths

This section outlines demo scenarios that can effectively showcase MongoDB's capabilities in an AML context, using the data structures defined above.

**Scenario Group 1: Intelligent Entity Resolution (ER)**

- **MongoDB Strengths:** Document Model, Atlas Search (fuzzy matching, multiple analyzers, compound queries), Aggregation Pipeline (for complex matching logic).
  1.  **Searching for an Entity:**
      - **Demo:** Analyst searches for "Samantha Miller" (from Clear Duplicate Set).
      - **MongoDB:** Atlas Search query using `name.full` (standard analyzer for typos, keyword for exact, autocomplete for suggestions). Search can also combine with DOB or partial address.
      - **Outcome:** Shows both "Samantha Miller" and "Sam Miller" records, highlighting the need for resolution.
  2.  **Resolving Clear Duplicates:**
      - **Demo:** System (or analyst) flags "Samantha Miller" and "Sam Miller" as potential duplicates based on shared DOB, similar last name, and very similar address components. A "confirmed_same_entity" relationship is created (or shown as already seeded).
      - **MongoDB:** Demo retrieval of entities with `resolution.status = "resolved"` and show their `masterEntityId`. Use Aggregation Pipeline to consolidate data from duplicates into a "golden record" view.
  3.  **Investigating Subtle Duplicates (Maria Rodriguez Cluster):**
      - **Demo:** Analyst searches for "Maria Rodriguez, DOB 1990-05-20, Phone +1-555-001-1234".
      - **MongoDB:** Atlas Search using a compound query with name (fuzzy/partial), DOB (exact/range), and contact info.
      - **Outcome:** Shows the three "Maria Rodriguez" variants. Highlight `potential_duplicate` relationships and their `evidence` (shared phone, past address). Demo how an analyst might review and confirm/reject these, updating the `resolution` status and relationship `type`/`verified` status.
  4.  **Vector Search for Profile Similarity (Advanced ER):**
      - **Demo:** Analyst has an incomplete profile from an alert (e.g., "Individual, possible involvement in import/export from KY, name sounds like 'Apex Management'").
      - **MongoDB:**
        - User input is converted to an embedding using the same Bedrock model.
        - A `$vectorSearch` query is run against the `profileEmbedding` field in the `entities` collection.
        - Optionally, pre-filter `$vectorSearch` using Atlas Search on known fields (e.g., `entityType: "organization"`, `addresses.structured.country: "KY"`).
      - **Outcome:** Returns entities with semantically similar profiles, like the "Shell Company Candidate" from KY, even if names don't match exactly. Showcases finding non-obvious links.

**Scenario Group 2: Network Analysis & Visualization**

- **MongoDB Strengths:** Aggregation Pipeline (`$graphLookup`), flexible `relationships` collection.
  1.  **Visualizing an Organization's Structure (Complex Org Structure):**
      - **Demo:** Select "Alpha Holdings International".
      - **MongoDB:** Use `$graphLookup` starting from Alpha Holdings:
        - 1st hop: Find `director_of` (individuals) and `ubo_of` (individuals/corporates) pointing TO Alpha.
        - 1st hop: Find `parent_of_subsidiary` (organizations) where Alpha is the SOURCE.
        - 2nd+ hops: For each subsidiary found, find their directors/UBOs. For corporate UBOs of Alpha, find _their_ UBOs/directors.
      - **Outcome:** Visually display the ownership and control structure, showing parent, subsidiaries, directors, and UBOs (including individual and corporate UBOs, like "Omega Investments S.A."). Highlight how UBOs can be multiple hops away.
  2.  **Uncovering Nominee Structures (Shell Company Candidate):**
      - **Demo:** Investigate "Apex Management Ltd" (the shell company).
      - **MongoDB:** `$graphLookup` to find its `director_of` and `ubo_of` relationships.
      - **Outcome:** Shows the "Nominee Director" entity linked as both director and 100% UBO. Highlight that this director might be linked to many other shell companies (if more such relationships were seeded or discovered).
  3.  **Identifying Shared Connections / "Guilt by Association":**
      - **Demo:**
        - Start with the "Senator Powers" (PEP). Use `$graphLookup` to find his `business_associate_suspected` links.
        - Show he's linked to an HNWI.
        - Separately, the HNWI is flagged on an "INTERNAL-ADVERSE-MEDIA-HNWI" list (from `entities.watchlistMatches`).
        - Or, show a Sanctioned Org connected via `transactional_counterparty_high_risk` to a seemingly legitimate business, raising red flags for that business.
      - **MongoDB:** `$graphLookup` traversing multiple relationship types. Combine with lookups on the `entities` collection for their risk levels or watchlist statuses.
      - **Outcome:** Demonstrates how network context can elevate or highlight risk.
  4.  **Household Member Connections:**
      - **Demo:** Select one of the "Jones" household members.
      - **MongoDB:** `$graphLookup` for `household_member` relationships.
      - **Outcome:** Easily shows other members sharing the same address. This can be relevant if one member becomes high-risk.

**Scenario Group 3: Real-Time Risk Scoring & Perpetual KYC (pKYC)**

- **MongoDB Strengths:** Document Model (easy updates to `riskAssessment`), Change Streams, Aggregation Pipeline (for recalculating risk).
  1.  **Initial Risk Assessment:**
      - **Demo:** Show the `riskAssessment` object for various entities (Low Risk generic, PEP, Shell Company, Incomplete Data entity).
      - **MongoDB:** Display the pre-calculated `overall.score`, `overall.level`, and `components` with their contributing `factors`.
      - **Outcome:** Illustrates how different profile attributes contribute to risk.
  2.  **pKYC - Risk Change due to New Transaction (Evolving Risk Individual):**
      - **Demo:**
        - Show "Norman Day" (Evolving Risk) with an initial low/medium risk score and his older, normal transactions.
        - Simulate a new, high-risk transaction being added for him (e.g., large outgoing international wire to a high-risk country – as per the pKYC info message from transaction seeding).
        - **MongoDB (Backend Simulation):**
          - A (simulated) transaction monitoring system or a Change Stream on `transactionsv2` detects this new transaction.
          - An aggregation pipeline (or application logic) recalculates Norman's `activity` risk score based on this new transaction. This updates his `riskAssessment.components.activity` and consequently `riskAssessment.overall` score and level in his `entities` document.
          - The `riskAssessment.history` is updated.
        - **MongoDB (Frontend):** Refresh Norman's profile to show the increased risk score/level and the new transaction in his history. An alert is generated.
      - **Outcome:** Powerful demonstration of pKYC – how real-time events update risk profiles.
  3.  **pKYC - Risk Change due to New Watchlist Hit:**
      - **Demo:** Select an initially low/medium risk entity (e.g., one of the "Evolving Risk Individuals" or a "Generic Individual").
      - Simulate this entity now appearing on a newly updated watchlist (e.g., add a `watchlistMatches` entry to their `entities` document).
      - **MongoDB (Backend Simulation):**
        - A (simulated) nightly watchlist screening process or a Change Stream on a (hypothetical) "watchlist_updates" collection triggers a re-screening.
        - The entity now gets a hit. Their `riskAssessment.components.external` score is increased, updating the overall risk.
        - **MongoDB (Frontend):** Refresh the entity's profile to show the new watchlist hit and increased risk.
      - **Outcome:** Shows pKYC based on external data changes.
  4.  **pKYC - Risk Change due to Network Link:**
      - **Demo:** An "Evolving Risk Individual" was linked (in relationship seeding) to another individual who _now_ becomes a PEP or gets sanctioned.
      - **MongoDB (Backend Simulation):**
        - When the associate's risk dramatically increases, a (simulated) network risk propagation mechanism runs.
        - This might involve a `$graphLookup` from the Evolving Risk Individual to check the risk of their connections.
        - The Evolving Risk Individual's `riskAssessment.components.network` score is updated.
      - **Outcome:** Demonstrates how changes in the network affect an entity's risk.

**Scenario Group 4: Advanced Search & Analytics**

- **MongoDB Strengths:** Atlas Search, Aggregation Pipeline.
  1.  **Fuzzy Name & Address Search for Watchlist Screening:**
      - **Demo:** During entity onboarding or screening, search for an entity like "Jon Smithe, born around 1980, lives in Anytown, CA" against the `watchlists` collection.
      - **MongoDB:** Atlas Search on `watchlists` using:
        - `name` with `lucene.standard` (for fuzzy) and potentially phonetic matching if enabled.
        - `dateOfBirths` (potentially with date range queries if data is clean, or flexible string matching).
        - `addresses.full` or `addresses.structured.city`/`country`.
      - **Outcome:** Shows potential matches even with slight variations, demonstrating robust screening.
  2.  **Aggregating Transactional Risk Indicators:**
      - **Demo:** Show a dashboard or report: "Top 5 entities with the highest volume of transactions to high-risk countries in the last 30 days" or "Entities with more than X structuring candidate transactions."
      - **MongoDB:** Aggregation Pipeline on `transactionsv2`:
        - `$match` by `timestamp`, `tags` (e.g., "high_risk_jurisdiction_counterparty", "structuring_candidate").
        - `$group` by `entityId` to sum amounts or count transactions.
        - `$sort` and `$limit`.
        - `$lookup` to `entities` to get entity names.
      - **Outcome:** Demonstrates powerful analytics and pattern detection capabilities.
  3.  **Faceted Search for Entities:**
      - **Demo:** An analyst wants to explore entities. Provide filters (facets) for `entityType`, `riskAssessment.overall.level`, `addresses.structured.country`, `customerInfo.industry`.
      - **MongoDB:** Atlas Search query with `$searchMeta` or by building facets in the aggregation pipeline after an initial search.
      - **Outcome:** Shows how analysts can dynamically slice and dice the entity population.
