# FairProcess Core inside Code Enforcement

Status: implementation started on `feature/fairprocess-code-enforcement-core`

## Product decision

Code Enforcement is the user-facing product. FairProcess is the case-intelligence, provenance, investigation, jurisdiction, and handoff layer beneath it.

Do not create another MailMyPDF vertical for FairProcess. Do not make Code Enforcement depend at runtime on the separate `fairprocessmaps` application. FairProcessMaps is a source of proven domain concepts and Humboldt connectors while the reusable kernel is consolidated into this vertical and, once stable, can be extracted into a shared package for other MailMyPDF verticals.

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

FairProcessMaps already demonstrates:

- Humboldt permit and code-enforcement ArcGIS connectors
- policy packs with activation/review state
- case export manifests
- case assistant and evidence-cited analysis
- brief/report generation concepts
- public-records workflows
- evidence, event, finding, graph, and integrity-report patterns

The integration should compose those capabilities instead of reimplementing them.

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
5. Evidence should become immutable/hash-addressed once persisted; corrections create new versions or withdrawal records rather than silently rewriting history.
6. Policy rules have version and activation state.
7. `legal_review_required` rules never render as controlling legal conclusions.
8. The system reports inconsistencies and evidence gaps; it does not declare government misconduct merely because a discrepancy exists.
9. Every mailed response and later proof-of-delivery artifact should become part of the same case record.
10. The attorney packet is reproducible from its underlying evidence and versioned rules.

## Humboldt proof-of-concept

Initial connectors represented in the Humboldt pack:

- Humboldt County Building Permits ArcGIS
- Humboldt County Code Enforcement ArcGIS
- county-code discovery source
- Humboldt County public-records entry point

The next connector implementation should port the tested FairProcessMaps query logic behind the generic jurisdiction connector interface and add provenance metadata for every fetch:

- URL
- retrieval timestamp
- response hash
- jurisdiction pack/version
- connector/version
- query parameters
- raw source artifact ID

Do not write fetched county data directly into a conclusion. Store the raw/source record first, then derive facts from it.

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

### Phase 1 — core contracts — started

- jurisdiction-pack contracts
- Humboldt POC pack
- locality-safe jurisdiction registry
- attorney packet manifest/readiness
- investigation-to-packet adapter
- unit tests

### Phase 2 — provenance persistence

- reconcile current evidence stores into one canonical persistent evidence identity
- add/confirm SHA-256, source URL, retrieval timestamp, uploader/actor, page locator, and version/withdrawal fields
- preserve raw county/API responses as evidence artifacts
- ensure organization/user authorization scopes every case artifact

### Phase 3 — Humboldt connector service

- port permit and code-enforcement ArcGIS logic from FairProcessMaps
- route all queries through the jurisdiction pack
- add response hashing/change detection/retry/rate-limit handling
- add APN/address normalization and reconciliation
- surface source records in Property and Evidence views

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
2. source connectors
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
