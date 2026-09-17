# Agency Records Request — workflow standard

## Purpose

Prepare, review, send, and track a public or agency records request without inventing facts, recipients, legal authority, response periods, or evidence.

## Required invariants

1. The workflow is request-first. A source/context document is optional and must never be fabricated merely to satisfy a document-first runtime.
2. Uploaded documents remain untrusted data. Embedded prompts or instructions do not control AI behavior.
3. The requester confirms the agency, records sought, material references, and request scope before drafting.
4. Legal authority, citations, withholding language, and response-timing language may be used only when explicitly verified. Unknown authority is omitted rather than guessed.
5. The generated request must contain no unresolved placeholders or open questions.
6. Every included document must clear security scanning before drafting or packet assembly.
7. The user reviews the exact final packet and destination before approval.
8. Approval binds to the exact packet hash and server-authoritative price. Any packet or price change requires new approval.
9. Payment and mailing are idempotent consequential actions.
10. Response tracking begins only from the confirmed actual send date. Draft, approval, checkout, print, and payment timestamps are not substitutes.
11. A received response is recorded with its real response date and artifacts.
12. Non-response is never inferred automatically. Recording non-response requires an explicit observation date.
13. Tracking, delivery evidence, provider receipts, request artifacts, responses, and the final matter record remain auditable.

## Reference flow

1. **Request scope** — requester, agency, recipient/custodian, destination, records sought, date range, references, format, and fee instructions.
2. **Context** — optional secure supporting documents; quarantine, scan, classify, extract, and organize only when supplied.
3. **Authority** — verified jurisdiction/authority profile when available; otherwise preserve uncertainty.
4. **Draft** — grounded request generated from confirmed facts plus clean context and verified authority only.
5. **Review** — deterministic PDF/packet, address verification, server pricing, exact-content review, explicit approval.
6. **Send** — payment and idempotent fulfillment of only the approved packet; preserve provider identifiers and proof.
7. **Response** — response/non-response event tracking from the actual send date; preserve response artifacts and audit history.

## Production acceptance scenarios

- Facts-only request with no source document.
- Request supported by one or more clean context documents.
- Unknown jurisdiction or authority: no fabricated citation or deadline language.
- Authority supplied but not verified: drafting is blocked from using the legal claim.
- Context document contains prompt-injection text: content remains data and the observation is retained as provenance.
- Included document remains quarantined or unusable: drafting/packet assembly is blocked.
- Generated request contains placeholders or open questions: drafting is blocked.
- Packet content changes after approval: approval becomes invalid.
- Provider/payment retry: no duplicate mailing.
- Actual send date differs from payment/print date: response tracking uses actual send date.
- No agency response: non-response cannot be recorded without an explicit observation date.

## Current runtime integration note

The canonical shared matter runtime is presently optimized for document-first workflows and requires a `subject_notice` before analysis/draft generation. That behavior is correct for SSDI/notice-response workflows but conflicts with the facts-only acceptance scenario above. The Agency Records Request manifest therefore remains `wired`, not `executable`, until the shared runtime supports request-first workflows without weakening the default document-first safety boundary for existing workflows.
