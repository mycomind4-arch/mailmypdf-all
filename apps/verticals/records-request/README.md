# Records Requests

A powerful, user-friendly public-records request command center for requesting, tracking, receiving, analyzing, and escalating government records.

## Product thesis

Most records-request tools stop at generating a letter. This vertical treats a request as a **case with a lifecycle**:

**Discover → Draft → Validate → Send → Track → Follow up → Receive → Organize → Analyze → Escalate → Preserve**

The system should make a first-time requester feel guided while giving experienced investigators, journalists, attorneys, advocates, and property owners a deep evidence and workflow layer.

## Core capabilities

### Request builder
- Identify agency and records custodian.
- Guided plain-English description of what the user needs.
- Convert a vague objective into precise, searchable record categories.
- Date ranges, custodians, systems, locations, identifiers, formats, and exclusions.
- Generate jurisdiction-aware request language.
- Detect ambiguity, overbreadth, unnecessary personal information, and likely search problems before sending.

### Request intelligence
- Track statutory response deadlines and extensions using versioned jurisdiction policy packs.
- Distinguish acknowledgement, clarification request, partial production, denial, extension, and final response.
- Detect when a response appears incomplete or does not address requested categories.
- Compare agency claims against the request and prior communications.

### Correspondence and delivery
- Draft initial requests, clarifications, narrowing responses, status inquiries, fee objections, deadline notices, and administrative appeals.
- Evidence-linked communication history.
- Delivery/proof packet integration with the ecosystem's certified-mail capabilities rather than duplicating mail infrastructure.

### Records production workspace
- Upload batches of PDFs, images, spreadsheets, emails, and correspondence.
- OCR and normalize documents.
- Deduplicate records and preserve originals.
- Search across the complete production.
- Extract dates, names, agencies, case numbers, properties, permits, citations, and other entities.
- Build relationships between records.

### Production audit
The system should answer:
- What did we request?
- What did the agency say it searched?
- What did it produce?
- What categories appear unanswered?
- Which responsive records reference documents that were not produced?
- Are there contradictions between productions?
- Are redactions explained?
- Are there missing pages, duplicate pages, broken files, or suspicious gaps?

### Escalation
When a response is inadequate, guide the user through progressively stronger options:
1. Clarification
2. Narrowing or scope discussion
3. Status follow-up
4. Request for search details / additional custodians
5. Administrative appeal or review where available
6. Ombudsman/oversight route where available
7. Formal legal escalation information

The product should never automatically make a legal conclusion. It should show the evidence, governing policy source, uncertainty, and suggested next step.

## Reusable ecosystem technology

Reuse the strongest primitives from FairProcess and FairProcessMaps:

- Evidence vault and provenance
- Content hashes
- Canonical event store and timeline projections
- Entity/relationship graph
- Property and parcel intelligence when relevant
- Deterministic policy/deadline engine
- Contradiction and discrepancy detection
- Append-only audit history

Shared components should eventually live in reusable packages instead of being copied into each vertical.

## AI behavior

The assistant is grounded in the user's request, correspondence, policy sources, and produced records. Every material conclusion should identify whether it is:

- **Fact** — directly supported by a source.
- **Inference** — reasoned from sources.
- **Unknown** — the evidence is insufficient.
- **Rule** — supplied by a jurisdiction policy source.
- **Recommendation** — a proposed action for user approval.

Never claim that records do not exist merely because they were not produced. Use language such as **"not located in the production"** or **"response does not identify these requested categories"** unless stronger evidence exists.

## UX goal

A user should be able to start with one sentence — *"I want everything the county has about this property"* — and be guided toward a precise request without needing to understand public-records law or government records systems.

At the same time, expert users should be able to inspect every source, deadline calculation, search term, production gap, and communication.
