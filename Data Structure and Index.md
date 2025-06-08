Okay, this is an excellent request and will serve as a great foundation for building your demo and explaining its value!

Here's a detailed document covering the data structures, index definitions, and demo scenarios for your MongoDB-powered AML solution.

---

## MongoDB AML Solution: Data Structure & Demo Scenarios Document

**Version:** 1.0
**Date:** October 26, 2023 (or current date)

**Objective:** This document outlines the data schemas for the core collections (`entities`, `watchlists`, `relationships`, `transactionsv2`) in the AML solution, their MongoDB index definitions, and potential demo scenarios that leverage MongoDB's strengths to address key AML challenges.

---

### I. Core Collections: Data Structures & Indexes

#### A. `entities` Collection

- **Purpose:** Stores comprehensive profiles of individuals and organizations, including KYC data, risk assessments, resolution status, and links to related data. This collection is central to Entity Resolution and Risk Scoring.
- **MongoDB Strengths Showcased:** Document Model (rich, nested data), Atlas Search (for finding entities), Vector Search (for semantic similarity in entity profiles), Aggregation Pipeline (for complex risk calculations and data enrichment).

**Schema:**

| Field                                            | Data Type        | Description & (Example/Notes)                                                                                                                                   |
| :----------------------------------------------- | :--------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `_id`                                            | ObjectId         | Unique MongoDB document identifier.                                                                                                                             |
| `entityId`                                       | String           | Unique application-level identifier for the entity. (e.g., "CGI-XXXX", "COP-YYYY") - **Indexed (Unique indirectly via Atlas Search if primary key)**            |
| `scenarioKey`                                    | String           | Identifier for demo data generation scenario. (e.g., "pep_individual_varied_0", "generic_organization") - **Indexed**                                           |
| `entityType`                                     | String           | "individual" or "organization". - **Indexed**                                                                                                                   |
| `status`                                         | String           | Current status of the entity. (e.g., "active", "inactive", "under_review", "restricted")                                                                        |
| `sourceSystem`                                   | String           | Originating system of the entity record. (e.g., "onboarding_v3_digital", "crm_salesforce")                                                                      |
| `createdAt`                                      | ISODate          | Timestamp of entity creation.                                                                                                                                   |
| `updatedAt`                                      | ISODate          | Timestamp of last entity update.                                                                                                                                |
| **`name` (Object)**                              |                  |                                                                                                                                                                 |
| `  name.full`                                    | String           | Full legal or common name. (e.g., "John Michael Doe", "Alpha Holdings International") - **Atlas Search Indexed (Standard, Keyword, Autocomplete)**              |
| `  name.structured` (Object)                     |                  |                                                                                                                                                                 |
| `    name.structured.first`                      | String           | First name (for individuals). - **Atlas Search Indexed (Keyword)**                                                                                              |
| `    name.structured.middle`                     | String           | Middle name/initial (for individuals).                                                                                                                          |
| `    name.structured.last`                       | String           | Last name (for individuals). - **Atlas Search Indexed (Keyword)**                                                                                               |
| `    name.structured.legalName`                  | String           | Official legal name (for organizations).                                                                                                                        |
| `  name.aliases`                                 | Array of Strings | List of known aliases or AKAs. - **Atlas Search Indexed (Standard)**                                                                                            |
| `  name.nameComponents`                          | Array of Strings | Lowercase tokens of the full name.                                                                                                                              |
| `dateOfBirth`                                    | String           | "YYYY-MM-DD" (for individuals). - **Atlas Search Indexed (Keyword/Date)**                                                                                       |
| `placeOfBirth`                                   | String           | City, Country (for individuals).                                                                                                                                |
| `gender`                                         | String           | (e.g., "male", "female", "non_binary", "undisclosed")                                                                                                           |
| `nationality`                                    | Array of Strings | List of nationalities (ISO country codes). - **Atlas Search Indexed (Keyword)**                                                                                 |
| `residency`                                      | String           | Primary country of residence (ISO code). - **Atlas Search Indexed (Keyword)**                                                                                   |
| `incorporationDate`                              | String           | "YYYY-MM-DD" (for organizations).                                                                                                                               |
| `jurisdictionOfIncorporation`                    | String           | Country of incorporation (ISO code, for organizations). - **Atlas Search Indexed (Keyword)**                                                                    |
| **`addresses` (Array of Objects)**               |                  |                                                                                                                                                                 |
| `  addresses.[].type`                            | String           | (e.g., "residential", "business", "mailing", "previous", "registered_office")                                                                                   |
| `  addresses.[].primary`                         | Boolean          | Is this the primary address?                                                                                                                                    |
| `  addresses.[].full`                            | String           | Full concatenated address string. - **Atlas Search Indexed (Standard)**                                                                                         |
| `  addresses.[].structured` (Obj)                |                  |                                                                                                                                                                 |
| `    addresses.[].structured.street`             | String           | Street address. - **Atlas Search Indexed (Standard)**                                                                                                           |
| `    addresses.[].structured.city`               | String           | City. - **Atlas Search Indexed (Keyword)**                                                                                                                      |
| `    addresses.[].structured.state`              | String           | State/Province.                                                                                                                                                 |
| `    addresses.[].structured.postalCode`         | String           | Postal/Zip code. - **Atlas Search Indexed (Keyword)**                                                                                                           |
| `    addresses.[].structured.country`            | String           | ISO Country code. - **Atlas Search Indexed (Keyword)**                                                                                                          |
| `  addresses.[].coordinates`                     | Array of Numbers | \[longitude, latitude] (GeoJSON Point for geospatial queries).                                                                                                  |
| `  addresses.[].validFrom`                       | ISODate          | Date address became valid.                                                                                                                                      |
| `  addresses.[].validTo`                         | ISODate          | Date address ceased to be valid (null if current).                                                                                                              |
| `  addresses.[].verified`                        | Boolean          |                                                                                                                                                                 |
| `  addresses.[].verificationMethod`              | String           | (e.g., "utility_bill", "electronic_idv")                                                                                                                        |
| `  addresses.[].verificationDate`                | ISODate          |                                                                                                                                                                 |
| **`contactInfo` (Array of Objects)**             |                  |                                                                                                                                                                 |
| `  contactInfo.[].type`                          | String           | (e.g., "email", "phone_mobile", "social_media_handle")                                                                                                          |
| `  contactInfo.[].value`                         | String           | The contact detail itself. - **Indexed (Consider for specific lookups)**                                                                                        |
| `  contactInfo.[].primary`                       | Boolean          |                                                                                                                                                                 |
| `  contactInfo.[].verified`                      | Boolean          |                                                                                                                                                                 |
| `  contactInfo.[].verificationDate`              | ISODate          |                                                                                                                                                                 |
| **`identifiers` (Array of Objects)**             |                  |                                                                                                                                                                 |
| `  identifiers.[].type`                          | String           | (e.g., "passport", "ssn", "lei_code", "tax_id") - **Indexed, Atlas Search Indexed (Keyword)**                                                                   |
| `  identifiers.[].value`                         | String           | The identifier value. - **Indexed, Atlas Search Indexed (Keyword)**                                                                                             |
| `  identifiers.[].country`                       | String           | Issuing country (ISO code).                                                                                                                                     |
| `  identifiers.[].issueDate`                     | ISODate          |                                                                                                                                                                 |
| `  identifiers.[].expiryDate`                    | ISODate          |                                                                                                                                                                 |
| `  identifiers.[].verified`                      | Boolean          |                                                                                                                                                                 |
| **`resolution` (Object)**                        |                  | Entity Resolution status.                                                                                                                                       |
| `  resolution.status`                            | String           | (e.g., "unresolved", "resolved", "under_review")                                                                                                                |
| `  resolution.masterEntityId`                    | String           | `entityId` of the master record if this is a duplicate.                                                                                                         |
| `  resolution.confidence`                        | Number           | Confidence score if linked to a master (0-1).                                                                                                                   |
| `  resolution.linkedEntities`                    | Array of Objects | List of other entities this one is linked to by ER. `[{entityId, linkType, confidence, matchedAttributes, matchDate, decidedBy, decision}]`                     |
| `  resolution.lastReviewDate`                    | ISODate          |                                                                                                                                                                 |
| `  resolution.reviewedBy`                        | String           | Analyst ID or system.                                                                                                                                           |
| **`riskAssessment` (Object)**                    |                  |                                                                                                                                                                 |
| `  riskAssessment.overall` (Obj)                 |                  |                                                                                                                                                                 |
| `    riskAssessment.overall.score`               | Number           | Overall risk score (0-100). - **Indexed, Atlas Search Indexed (Number)**                                                                                        |
| `    riskAssessment.overall.level`               | String           | (e.g., "low", "medium", "high"). - **Indexed, Atlas Search Indexed (Keyword)**                                                                                  |
| `    riskAssessment.overall.trend`               | String           | (e.g., "stable", "increasing", "decreasing")                                                                                                                    |
| `    riskAssessment.overall.lastUpdated`         | ISODate          |                                                                                                                                                                 |
| `    riskAssessment.overall.nextScheduledReview` | ISODate          |                                                                                                                                                                 |
| `  riskAssessment.components` (Obj)              |                  | Risk broken down by category. `{"identity": {score, weight, factors:[{type, impact, desc}]}, "profile": ..., "activity": ..., "external": ..., "network": ...}` |
| `  riskAssessment.history` (Array)               |                  | History of risk score changes. `[{date, score, level, changeTrigger}]`                                                                                          |
| `  riskAssessment.metadata` (Obj)                |                  | Model version, assessment type, etc. `{"model", "assessmentType", "overrides"}`                                                                                 |
| **`watchlistMatches` (Array of Objects)**        |                  | Matches found against watchlist data.                                                                                                                           |
| `  watchlistMatches.[].listId`                   | String           | ID of the watchlist hit. (e.g., "OFAC-SDN", "TARGETED-PEP-NATIONAL-US")                                                                                         |
| `  watchlistMatches.[].matchId`                  | String           | ID of the record from the watchlist source.                                                                                                                     |
| `  watchlistMatches.[].matchScore`               | Number           | Score of the match (0-1).                                                                                                                                       |
| `  watchlistMatches.[].matchDate`                | ISODate          |                                                                                                                                                                 |
| `  watchlistMatches.[].status`                   | String           | (e.g., "under_review", "confirmed_hit", "false_positive")                                                                                                       |
| `  watchlistMatches.[].details` (Obj)            |                  | Additional details about the match (e.g., role for PEP, reason for sanction).                                                                                   |
| **`customerInfo` (Object)**                      |                  | Customer-specific information.                                                                                                                                  |
| `  customerInfo.customerSince`                   | ISODate          |                                                                                                                                                                 |
| `  customerInfo.segments`                        | Array of Strings | Customer segments. (e.g., "private_wealth_management")                                                                                                          |
| `  customerInfo.products`                        | Array of Strings | Products held by the customer. (e.g., "managed_investment_portfolio_aggressive")                                                                                |
| `  customerInfo.employmentStatus`                | String           | (for individuals)                                                                                                                                               |
| `  customerInfo.occupation`                      | String           | (for individuals) - **Atlas Search Indexed (Standard)**                                                                                                         |
| `  customerInfo.employer`                        | String           | (for individuals)                                                                                                                                               |
| `  customerInfo.monthlyIncomeUSD`                | Number           | (for individuals)                                                                                                                                               |
| `  customerInfo.industry`                        | String           | (for organizations) - **Atlas Search Indexed (Standard)**                                                                                                       |
| `  customerInfo.businessType`                    | String           | (for organizations) - **Atlas Search Indexed (Keyword)**                                                                                                        |
| `  customerInfo.numberOfEmployees`               | Number           | (for organizations)                                                                                                                                             |
| `  customerInfo.annualRevenueUSD`                | Number           | (for organizations)                                                                                                                                             |
| `  customerInfo.notes`                           | String           | General notes about the customer.                                                                                                                               |
| **`uboInfo` (Array of Objects)**                 |                  | (For organizations) Ultimate Beneficial Owner information.                                                                                                      |
| `  uboInfo.[].name`                              | String           | Name of the UBO.                                                                                                                                                |
| `  uboInfo.[].entityType`                        | String           | "individual" or "corporate".                                                                                                                                    |
| `  uboInfo.[].nationality`                       | String           | (for individual UBOs)                                                                                                                                           |
| `  uboInfo.[].countryOfIncorporation`            | String           | (for corporate UBOs)                                                                                                                                            |
| `  uboInfo.[].percentageOwnership`               | Number           |                                                                                                                                                                 |
| `  uboInfo.[].controlType`                       | String           | (e.g., "direct_ownership", "voting_rights")                                                                                                                     |
| `  uboInfo.[].identification` (Obj)              |                  | `{"type", "value"}` for UBO ID.                                                                                                                                 |
| `  uboInfo.[].linkedEntityId`                    | String           | `entityId` if the UBO is also a full entity in this collection.                                                                                                 |
| `profileSummaryText`                             | String           | Concatenated string of key entity attributes for embedding.                                                                                                     |
| `profileEmbedding`                               | Array of Numbers | Vector embedding of `profileSummaryText` (e.g., 1536 dimensions). - **Vector Search Indexed**                                                                   |

**Standard MongoDB Indexes for `entities`:**

- `{ "entityId": 1 }` (Consider making this unique if it's your application's primary key, though often handled by Atlas Search primary key if `entityId` is `_id`)
- `{ "entityType": 1 }`
- `{ "scenarioKey": 1 }`
- `{ "identifiers.type": 1, "identifiers.value": 1 }`
- `{ "riskAssessment.overall.level": 1 }`
- `{ "riskAssessment.overall.score": 1 }`
- `{ "name.full": "text" }` (MongoDB native text index, alternative/complement to Atlas Search for basic name search) - _Note: Only one text index per collection._

**Atlas Search Index for `entities` (e.g., `default_entities_search`):**
_Refer to the previously provided Atlas Search index definition. Key fields indexed include `name.full` (with standard, keyword, autocomplete), `name.structured._`, `name.aliases`, `identifiers.value`, `addresses.full`, `addresses.structured._`, `entityType`, `dateOfBirth`, `nationality`, `riskAssessment.overall.level`, `customerInfo.occupation`, etc._

---

#### B. `watchlists` Collection

- **Purpose:** Stores records from various external and internal watchlists (sanctions, PEPs, adverse media, internal high-risk). Used for screening entities.
- **MongoDB Strengths Showcased:** Flexible schema for varied list structures, Atlas Search (for efficient screening against entity data).

**Schema:**

| Field                                | Data Type        | Description & (Example/Notes)                                                                                                                              |
| :----------------------------------- | :--------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `_id`                                | ObjectId         | Unique MongoDB document identifier.                                                                                                                        |
| `listId`                             | String           | Identifier of the source list. (e.g., "OFAC-SDN", "TARGETED-PEP-NATIONAL-US", "INTERNAL-ADVERSE-MEDIA-HNWI") - **Indexed, Atlas Search Indexed (Keyword)** |
| `sourceRecordId`                     | String           | Unique ID of the record within the source list. - **Indexed**                                                                                              |
| `name`                               | String           | Full name of the listed individual/entity. - **Atlas Search Indexed (Standard, Keyword, Autocomplete)**                                                    |
| `nameTokens`                         | Array of Strings | Lowercase name components for matching. - **Indexed, Atlas Search Indexed (Keyword)**                                                                      |
| `aliases`                            | Array of Strings | Known aliases. - **Atlas Search Indexed (Standard)**                                                                                                       |
| `entityType`                         | String           | "individual" or "organization". - **Indexed, Atlas Search Indexed (Keyword)**                                                                              |
| `dateOfBirths`                       | Array of Strings | List of known DOBs (can have varied formats "YYYY-MM-DD", "DD/MM/YYYY"). - **Indexed, Atlas Search Indexed (Keyword/Date)**                                |
| `nationalities`                      | Array of Strings | List of nationalities (ISO codes). - **Indexed, Atlas Search Indexed (Keyword)**                                                                           |
| `citizenships`                       | Array of Strings | List of citizenships (ISO codes).                                                                                                                          |
| `placeOfBirth`                       | String           | (for individuals)                                                                                                                                          |
| `gender`                             | String           | (e.g., "Male", "Female", "Unknown")                                                                                                                        |
| `identifications` (Array of Objects) |                  | `[{type, value, country, notes}]` - **`identifications.value` Atlas Search Indexed (Keyword)**                                                             |
| `addresses` (Array of Objects)       |                  | `[{full, city, country, type}]` - **`addresses.country` & `addresses.full` Atlas Search Indexed**                                                          |
| `positionsHeld` (Array of Objects)   |                  | (For PEPs) `[{title, organization, fromDate, toDate}]`                                                                                                     |
| `reasonForListing`                   | String           | Reason for inclusion on the list. - **Atlas Search Indexed (Standard)**                                                                                    |
| `listingDate`                        | ISODate          | Date added to the list. - **Atlas Search Indexed (Date)**                                                                                                  |
| `lastUpdatedOnList`                  | ISODate          | Last update date on the source list. - **Atlas Search Indexed (Date)**                                                                                     |
| `remarks`                            | String           | Additional notes or comments from the list.                                                                                                                |
| `sourceUrl`                          | String           | URL to the source record if available.                                                                                                                     |
| `matchKeys` (Object)                 |                  | Placeholder for pre-computed phonetic keys (e.g., Soundex, Metaphone on names).                                                                            |

**Standard MongoDB Indexes for `watchlists`:**

- `{ "listId": 1 }`
- `{ "sourceRecordId": 1 }`
- `{ "nameTokens": 1 }` (if used for app-side fuzzy matching)
- `{ "entityType": 1 }`
- `{ "dateOfBirths": 1 }`
- `{ "nationalities": 1 }`
- `{ "identifications.type": 1, "identifications.value": 1 }`
- `{ "name": "text", "aliases": "text" }` (MongoDB native text index - alternative/complement)

**Atlas Search Index for `watchlists` (e.g., `default_watchlists_search`):**
_Refer to the previously provided Atlas Search index definition. Key fields include `name` (standard, keyword, autocomplete), `aliases`, `nameTokens`, `entityType`, `dateOfBirths`, `nationalities`, `identifications.value`, `addresses.country`, `listId`, `reasonForListing`._

---

#### C. `relationships` Collection

- **Purpose:** Stores connections between entities. Essential for Network Analysis and understanding complex ownership structures or associations.
- **MongoDB Strengths Showcased:** Aggregation Pipeline (`$graphLookup`), flexible schema to model diverse relationship types.

**Schema:**

| Field                         | Data Type | Description & (Example/Notes)                                                                                                                    |
| :---------------------------- | :-------- | :----------------------------------------------------------------------------------------------------------------------------------------------- |
| `_id`                         | ObjectId  | Unique MongoDB document identifier.                                                                                                              |
| `relationshipId`              | String    | Unique application-level ID for the relationship. (e.g., "REL-XXXX") - **Indexed (Unique)**                                                      |
| **`source` (Object)**         |           | The originating entity of the relationship.                                                                                                      |
| `  source.entityId`           | String    | `entityId` of the source entity. - **Indexed**                                                                                                   |
| `  source.entityType`         | String    | "individual" or "organization".                                                                                                                  |
| **`target` (Object)**         |           | The destination entity of the relationship.                                                                                                      |
| `  target.entityId`           | String    | `entityId` of the target entity. - **Indexed**                                                                                                   |
| `  target.entityType`         | String    | "individual" or "organization".                                                                                                                  |
| `type`                        | String    | Type of relationship. (e.g., "confirmed_same_entity", "director_of", "ubo_of", "household_member", "business_associate_suspected") - **Indexed** |
| `subType`                     | String    | More specific classification. (e.g., "Executive Chairman/CEO", "Nominee Shareholder (100%)")                                                     |
| `direction`                   | String    | "bidirectional" or "directed" (source->target).                                                                                                  |
| `strength`                    | Number    | Strength/probability of the link (0-1).                                                                                                          |
| `active`                      | Boolean   | Is the relationship currently active? - **Indexed**                                                                                              |
| `verified`                    | Boolean   | Has the relationship been verified?                                                                                                              |
| `verifiedBy`                  | String    | Who/what verified it.                                                                                                                            |
| `verificationDate`            | ISODate   |                                                                                                                                                  |
| `evidence` (Array of Objects) |           | Supporting evidence. `[{type, attribute, similarity, details, doc_ref, data_quality_score}]`                                                     |
| `created`                     | ISODate   | Timestamp of relationship creation.                                                                                                              |
| `updated`                     | ISODate   | Timestamp of last relationship update.                                                                                                           |
| `validFrom`                   | ISODate   | Date relationship became valid.                                                                                                                  |
| `validTo`                     | ISODate   | Date relationship ceased to be valid (null if current).                                                                                          |
| `riskContribution`            | Number    | Estimated risk passed along this edge (0-1).                                                                                                     |
| `datasource`                  | String    | How this relationship was identified. (e.g., "entity_resolution_engine_v3", "ubo_registry_declaration_simulated") - **Indexed**                  |
| `confidence`                  | Number    | Confidence in the accuracy of the relationship data (0-1).                                                                                       |
| `notes`                       | String    | Analyst notes.                                                                                                                                   |
| `tags` (Array of Strings)     |           | Descriptive tags.                                                                                                                                |
| `createdBy`                   | String    |                                                                                                                                                  |
| `reviewStatus`                | String    | (e.g., "confirmed_verified", "pending_review", "requires_manual_investigation")                                                                  |
| `reviewDate`                  | ISODate   |                                                                                                                                                  |
| `reviewedBy`                  | String    |                                                                                                                                                  |

**Standard MongoDB Indexes for `relationships`:**

- `{ "source.entityId": 1, "type": 1, "active": 1 }` (Key for outbound `$graphLookup`)
- `{ "target.entityId": 1, "type": 1, "active": 1 }` (Key for inbound `$graphLookup`)
- `{ "type": 1 }`
- `{ "relationshipId": 1 }` (Unique)
- `{ "datasource": 1 }`

---
