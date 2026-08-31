# Records Requests — Workflow Readiness

## Status

**Engineering foundation: workflow-development ready. Production deployment verification remains an external gate.**

## Green — engineering foundation

- [x] Real request creation API
- [x] Owner-scoped request persistence and listing
- [x] `validated -> review` transition
- [x] Authenticated approval boundary
- [x] Transaction-capable D1 request creation
- [x] Cryptographic audit event hashing and verification
- [x] Per-request audit-tail compare-and-swap for concurrent lifecycle writers
- [x] MailMyPDF webhook signature verification
- [x] Durable fulfillment event deduplication
- [x] Durable outbound fulfillment-attempt reservation
- [x] Deterministic fulfillment idempotency key
- [x] Exact-document SHA-256 attestation before fulfillment
- [x] Dashboard reads persisted request data
- [x] Reusable workflow factory contract
- [x] Capability-aware Records domain-pack contract
- [x] Workflow contract tests
- [x] Generic request validation with date-range checks
- [x] Versioned jurisdiction-policy extension point (fail-closed)
- [x] Production/evidence/finding/action domain boundary
- [x] Explicit MailMyPDF Platform consumption boundary

## Yellow — external/deployment verification required

- [ ] Real identity provider installed
- [ ] Production D1 IDs provisioned
- [ ] D1 migrations applied in staging
- [ ] MailMyPDF production credentials configured
- [ ] MailMyPDF webhook configured against deployed endpoint
- [ ] Full Cloudflare E2E run
- [ ] MailMyPDF Platform packages published for direct vertical consumption

These are deployment/ecosystem gates, not reasons to create a parallel Records Requests architecture.

## Workflow program

### Workflow 1 — `code-enforcement-records`

Flagship reference workflow. Its domain intelligence covers property/case identification, violations, inspections, complaints, photographs, notices, correspondence, enforcement actions, permits, custodians, date ranges, production completeness, contradictions, evidence-backed findings, authority-aware research, and escalation strategy.

### Workflow 2 — `property-permit-records`

Existing workflow upgraded to the same multi-LLM production-analysis standard. It covers building permits, applications, inspections, approved plans, site plans, plan-review comments, correction notices, certificates of occupancy, permit history, and correspondence. The production path now requires a two-provider LLM quorum, runs classification, extraction, contradiction analysis, and strategy, and records provider provenance/confidence.

It deliberately reuses the shared workflow factory, persistence, authorization, lifecycle, approval, fulfillment, audit, evidence, and MailMyPDF contracts rather than creating a parallel architecture.

## Quality rule

A workflow is not considered production-ready merely because its domain module exists. Required intelligence must be imported, invoked by the production path, tested end-to-end, fail closed when its multi-LLM quorum is unavailable, and preserve provenance into downstream strategy/follow-up decisions.
