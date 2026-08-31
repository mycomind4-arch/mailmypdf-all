# Records Requests Architecture

## North-star workflow

`Discover → Draft → Validate → Send → Track → Receive → Normalize → Audit → Escalate → Preserve`

A request is a case, not a letter. The canonical record should connect the request, every requested category, policy/deadline calculations, agency communications, productions, individual records, findings, actions, and audit history.

## Request intelligence

The request builder should transform natural language into explicit request items. Each item can specify a record category, date range, custodian, system, location/property, identifiers, and desired format. The user can edit every generated item before sending.

## Deadline engine

Use versioned jurisdiction policy packs. Store the exact rule/policy version used for every calculated milestone. Model acknowledgement, clarification, extension, production, denial, appeal/review, and follow-up milestones separately. Never present a generic national deadline as if it applies to every jurisdiction.

## Production audit engine

Compare three layers:

1. **Requested** — the exact request items and scope.
2. **Agency response** — what the agency says it searched, withheld, extended, or produced.
3. **Actual production** — the files and content received.

The audit engine can then surface evidence-backed discrepancies:

- request item with no corresponding agency response
- request item acknowledged but no responsive production located
- produced record referencing an absent attachment
- missing pages or broken files
- duplicate records
- inconsistent dates or identifiers
- unexplained gaps in a communication chain
- redaction/withholding without an identified explanation
- production that appears to cover only part of a requested date range
- agency description inconsistent with the actual file set

A finding must say **what was observed**, **what source supports it**, and **what remains unknown**. Do not assert that a record does not exist merely because it was not produced.

## Evidence model

Reuse the ecosystem evidence primitives from FairProcess/FairProcessMaps: immutable originals, content hashes, provenance, page references, extraction, human review state, relationship graph, and append-only audit events.

## AI contract

Every material AI output should be represented conceptually as:

- classification: fact | inference | unknown | rule | recommendation
- claim
- supporting evidence IDs
- rule ID and policy version where applicable
- confidence
- human-review requirement
- explanation

AI can propose search terms, request scope, record relationships, discrepancy candidates, and response drafts. It cannot silently invent records, legal deadlines, agency actions, or conclusions.

## Escalation workflow

The system should recommend the least-friction next step supported by the record:

`clarify → narrow → status inquiry → search-details request → additional production request → administrative review/appeal → oversight/legal information`

Each step produces a draft communication linked to the exact unresolved issue and supporting evidence. Sending is always user-approved.

## Ecosystem integration

Do not duplicate certified-mail delivery, general document generation, or common identity/RBAC infrastructure. Integrate with the ecosystem's mail/response verticals. Records Requests owns request intelligence, production analysis, and evidence-backed escalation.
