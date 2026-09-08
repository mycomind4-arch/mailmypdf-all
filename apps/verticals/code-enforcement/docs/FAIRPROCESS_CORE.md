# FairProcess Core inside Code Enforcement

Status: core architecture, evidence-integrity boundary, packet manifest, persistence contracts, and verified Humboldt source adapters are implemented on `feature/fairprocess-code-enforcement-core`.

## Product decision

Code Enforcement is the user-facing product. FairProcess is the case-intelligence, provenance, investigation, jurisdiction, and handoff layer beneath it.

Do not create another MailMyPDF vertical for FairProcess. Do not make Code Enforcement depend at runtime on the separate `fairprocessmaps` application. FairProcessMaps is a source of proven domain concepts, but every jurisdiction rule and connector must be revalidated before adoption. The reusable kernel is consolidated into this vertical and, once stable, can be extracted into a shared package for other MailMyPDF verticals.

Humboldt County is the proof-of-concept jurisdiction. The product must remain configuration-driven so a new county is primarily a new jurisdiction pack and connector set, not a fork of the application.

## What already exists

Code Enforcement already contains substantial reusable intelligence:

- notice extraction and document classification
- jurisdiction resolution
- property reconciliation
- evidence graphs and provenance
- timeline reconstruction
- discrepancy and contradiction analysis
- authority/scope analysis
- records-request workflows
- due-process analysis
- human review and authorization
- fulfillment and mailing
- a canonical investigation model under `src/investigation`

FairProcessMaps demonstrates useful patterns including:

- policy packs with activation/review state
- case export manifests
- case assistant and evidence-cited analysis
- brief/report generation concepts
- public-records workflows
- evidence, event, finding, graph, and integrity-report patterns
- jurisdiction-specific public-data connectors

These concepts are reusable. Their URLs, schemas, procedural rules, deadlines, and source freshness are not assumed to remain current.

## Source truth rule

A connector copied from another repository, prior build, documentation page, AI answer, or cached source is **not current merely because it previously worked**.

Before a connector is activated, the jurisdiction pack must record:

- exact source URL
- source owner/authority
- source purpose
- current-vs-historical status
- verified schema or query fields
- retrieval method
- connector version
- last verification date
- known freshness limitations
- whether automation is supported or only manual/public portal access is known

If current machine-readable access cannot be verified, FairProcess must represent the information as a source requirement rather than inventing an API or silently scraping an unsupported interface.

## New FairProcess kernel

`src/fairprocess/` is the integration boundary.

### Jurisdiction packs

A `JurisdictionPack` declares:

- jurisdiction identity and aliases
- supported case types
- data connectors
- policy-pack reference/version
- policy activation status
- whether jurisdiction-specific legal conclusions are allowed

The first pack is `us-ca-humboldt`.

Important: data discovery and legal-rule activation are separate concerns. Humboldt's current policy pack remains `legal_review_required`, so connectors can collect sourced facts while local legal conclusions remain gated.

The resolver deliberately refuses to choose Humboldt from `state=California` alone. A county, municipality, agency, or other locality match is required. This is the scaling invariant for adding Sonoma, Mendocino, Del Norte, or jurisdictions outside California.

### Investigation adapter

The existing `InvestigationState` remains the canonical evidence/claim/contradiction model.

`investigationToAttorneyPacketInput()` converts that state into FairProcess packet facts and source references conservatively:

- a claim found in a government record is an `agency_assertion`, not automatically a verified fact
- independently confirmed evidence can become `verified`
- contradictions become reviewable findings
- evidence IDs remain attached to every derived packet item

This avoids a second competing evidence model.

### Evidence integrity and source capture

The existing secure-ingest hash remains useful only as a lightweight duplicate fingerprint. FairProcess adds a separate cryptographic SHA-256 evidence-integrity layer.

The source chain is:

`exact source response -> SHA-256 blob -> evidence record -> source snapshot -> normalized record -> derived fact/finding`

A normalized public-data record must retain the snapshot/evidence identity that produced it. Corrections or changed source responses create new evidence versions/snapshots rather than silently rewriting history.

### Attorney packet manifest

`buildAttorneyPacketManifest()` produces the canonical specification for the eventual PDF renderer.

The packet sections are:

1. case cover
2. executive case summary
3. procedural posture
4. property and parties
5. deadline sheet
6. sourced chronology
7. allegation/evidence matrix
8. findings and open questions
9. public-records request history
10. communications and mailing proof
11. evidence index
12. issues for counsel to review
13. indexed exhibits

The manifest also calculates packet readiness and explicitly blocks attorney handoff when foundational items such as property identity, source evidence, or chronology are missing.

The renderer must preserve the distinction among verified facts, agency assertions, user assertions, inferences, and unknowns.

## Integrity rules

These are non-negotiable:

1. No finding without source references where source material should exist.
2. No AI output silently becomes a canonical fact.
3. Government allegations remain allegations until independently established.
4. User statements remain user assertions until sourced or confirmed.
5. Evidence becomes immutable/hash-addressed once persisted; corrections create new versions or withdrawal records rather than silently rewriting history.
6. Policy rules have version and activation state.
7. `legal_review_required` rules never render as controlling legal conclusions.
8. The system reports inconsistencies and evidence gaps; it does not declare government misconduct merely because a discrepancy exists.
9. Every mailed response and later proof-of-delivery artifact should become part of the same case record.
10. The attorney packet is reproducible from its underlying evidence and versioned rules.
11. Historical public data is never presented as current merely because it is the newest machine-readable source available.
12. Unsupported portal automation is not invented.

## Humboldt proof-of-concept — verified source model

The Humboldt jurisdiction pack now reflects the public sources revalidated during this implementation rather than blindly inheriting FairProcessMaps connector URLs.

### Current parcel/property GIS — automated

Connector: `humboldt-parcels`

The current county parcel layer is queried by APN and can supply source-backed property context such as:

- APN / APN-12
- site address and city
- acreage / lot size
- zoning
- general/community plan
- building area / year built when present
- coastal/flood/fire-responsibility fields when present
- supervisor district
- latitude / longitude
- legal description
- jurisdiction / inspection district

Every query attempt is captured with URL, parameters, timestamp, response SHA-256, jurisdiction-pack version, connector version, and exact raw response artifact.

### Code Enforcement GIS — historical context only

Connector: `humboldt-code-enforcement-cases`

The currently exposed county public GIS layer is explicitly titled **Code Enforcement Cases 1/15/2025**. FairProcess therefore labels every record from it as historical and fixes its `dataAsOf` date at `2025-01-15`.

It may help establish that a case number/type/opening date appeared in that historical public dataset. It must **not** be used to claim current case status, current allegations, current deadlines, current hearing posture, or whether a case remains open.

Current status must instead come from a current notice/document, a separately verified current source, an authenticated source available to the user, or records obtained from the agency.

### Building permits — public portal, automation disabled

Connector: `humboldt-building-permits`

Humboldt directs users to Accela for public permit searching. FairProcess stores the official public search URL but keeps the automated connector disabled until a supported machine interface is verified.

Until then, permit history can enter the case record through:

- user-assisted Accela lookup and source capture
- uploaded permit records
- agency-produced records
- a records request
- a future supported Accela integration after verification

FairProcess must not invent an undocumented Accela API.

### County code and public records

County-code and public-records resources remain jurisdiction-pack sources, with exact authorities, citations, response artifacts, and retrieval dates captured before consequential use.

## Current persistence model

The existing Code Enforcement SQL schema has been extended with:

- jurisdiction pack/version on cases
- separate SHA-256 evidence identity
- MIME type, byte size, filename, storage key, retrieval time
- immutable/versioned/withdrawn evidence metadata
- event-evidence links
- allegation/violation-evidence links
- policy/citation/authority state on findings
- source snapshots
- reproducible packet exports

The additive migration is staged in `database/migrations/001_fairprocess_case_record.sql` but is **not considered deployed** until the production persistence/runtime binding is confirmed and the migration is actually applied.

The FairProcess domain uses storage interfaces rather than importing D1 or Supabase directly. This prevents the domain layer from locking itself to a persistence backend before the production boundary is settled.

## Litigation / attorney handoff target

The eventual `Generate Attorney-Ready Case Packet` action should produce two artifacts from one manifest:

- an analytical PDF report
- an exhibit bundle/archive containing the underlying source documents

The analytical report should let counsel answer quickly:

- What happened?
- What does the agency allege?
- What does the sourced record establish?
- What is disputed or unknown?
- What deadlines remain?
- What records have been requested and received?
- Where do records contradict each other?
- What issues require legal review?
- Which exact exhibit supports each statement?

An escalation packet for a court, oversight body, civil grand jury, civil-rights intake, or other authority should be a view of the same case record with recipient-specific framing, not a separate evidence store.

## Implementation sequence

### Phase 1 — FairProcess core — implemented

- jurisdiction-pack contracts
- Humboldt POC pack
- locality-safe jurisdiction registry
- attorney packet manifest/readiness
- investigation-to-packet adapter
- unit tests

### Phase 2 — provenance and persistence boundary — implemented at domain/schema level

- cryptographic SHA-256 evidence identity
- immutable evidence/version/withdrawal contracts
- source snapshots
- exact raw-source artifact capture
- packet-export schema/contracts
- additive SQL migration

Still required before production use:

- bind the contracts to the vertical's real production database/blob runtime
- apply/verify migration in the target environment
- confirm user/organization authorization around every case artifact

### Phase 3 — Humboldt verified-source adapters — partially implemented

Implemented:

- current parcel ArcGIS connector
- exact-response hashing and raw source preservation
- APN normalization
- source-to-evidence links on normalized records
- historical 2025-01-15 CE context connector with explicit freshness warning
- public Accela permit entry point represented with automation disabled

Next:

- build source-requirement/evidence-gap records for information that cannot currently be obtained from a verified machine source
- drive targeted public-records requests from those gaps
- support user-assisted/manual Accela capture with provenance
- add current CE records/status connector only if a current supported source is verified
- add response change detection and refresh history
- surface sourced property intelligence and freshness labels in the workspace

### Phase 4 — policy engine

- import/compile FairProcess policy-pack format behind an adapter
- keep Humboldt pack inactive for legal conclusions until reviewed
- produce procedural checkpoints and open questions with exact policy provenance
- never collapse a missed/unknown trigger into a legal violation conclusion

### Phase 5 — workspace integration

Add a FairProcess layer to the existing case workspace rather than a separate app:

- Case Intelligence / overview
- Allegation Matrix
- Evidence Graph
- Chronology
- Contradictions
- Property Intelligence
- Records Investigation
- Procedural Checks
- Attorney Packet readiness

### Phase 6 — packet renderer

- deterministic HTML/PDF renderer from `AttorneyPacketManifest`
- stable exhibit numbering
- page/source citations
- evidence index
- packet checksum/version metadata
- optional ZIP case archive

### Phase 7 — records and escalation automation

- targeted CPRA request suggestions based on missing evidence
- response/deadline tracking
- records comparison and contradiction detection
- user-reviewed escalation packet templates
- attorney handoff/share workflow

## Scaling rule

Adding another jurisdiction should require, at most:

1. jurisdiction pack
2. verified source connectors and freshness policy
3. policy pack
4. jurisdiction-specific tests/fixtures
5. legal review/activation decision

The evidence model, packet builder, investigation engine, UI, mailing system, and attorney handoff must remain unchanged.

## Monetization boundary

Do not lock the core response workflow behind a large FairProcess fee during the Humboldt validation period. Measure which intelligence features users actually use.

Likely later products:

- Code Enforcement response workflow: transaction fee
- FairProcess active-case monitoring: recurring subscription
- FairProcess deep analysis: one-time analysis upgrade
- Attorney-ready packet: premium case output
- Professional review workspace: attorney/professional subscription

The durable value is the sourced case record and provenance chain, not generic AI prose.
