# Workflow execution after phase 3

## Product restoration: CP14 and CP2000 first

The next complete verticals are CP14 and CP2000. They will use the shared secure document and mailing infrastructure, but each will register its own workflow runtime. The runtime contract includes the step graph, notice suitability checks, extracted fields, user facts, response choices, draft rules, packet artifacts, deadline semantics, and fulfillment readiness.

### Delivery slices

1. **Shared visual and security language** — replace generic scaffold copy with the warm editorial system from the reference screens and put accurate security commitments on every shared public surface.
2. **CP14 runtime** — secure intake, scan-gated analysis, IRS-specific findings, response facts, draft letter, reviewable PDF packet, approval, payment, and certified mailing with tracking.
3. **CP2000 runtime** — separate proposed-change model, income/document reconciliation fields, agree/disagree/partial response logic, response packet, approval, payment, and certified mailing.
4. **Workflow SEO authority pages** — build pages from verified workflow content and runtime metadata; show status honestly and never imply that catalog content is executable.
5. **Verification and launch** — synthetic-document tests, owner isolation, stale-analysis tests, packet hash tests, browser checks at required breakpoints, and a staged production rollout.

### Definition of done for CP14 and CP2000

- [ ] A signed-in user can open the correct workflow runtime and resume it.
- [ ] Uploads are owner-scoped, retained under policy, scan-gated, and unusable until clean.
- [ ] Analysis uses only the selected workflow adapter and stores validated, non-document results.
- [ ] User-entered facts are validated and persisted with the case; model output never silently becomes user truth.
- [ ] Draft PDF content is generated from verified analysis and user facts, with human review and immutable versions.
- [ ] Packet assembly recalculates pages, hashes the exact bytes, quotes server-side, and blocks unsafe or stale enclosures.
- [ ] Approval is explicit and immutable; payment and mailing use the approved packet and configured recipient.
- [ ] Mailing creates tracking and proof records, with webhook reconciliation and user-visible status.
- [ ] Copy accurately describes security controls and does not overclaim legal advice, approval, or delivery guarantees.

Build from local phase 3 commit fc98021. On inspection, fetched main is af0c7ca;
do not discard local phases 1–3 or publish changes without reconciling that gap.

Keep document security, model disclosure, persistence, packet assembly, approval,
pricing, payment and fulfillment shared. Each enabled workflow owns its analysis
instructions, draft instructions and readiness rules. Page-content coverage does
not mean execution is implemented.

First increment: use the existing SSDI case flow to establish a tested runtime
boundary. Validate analysis before persistence and consumption; refuse unsupported
workflow/vertical pairs; prevent drafting from a removed/replaced notice or unsafe
enclosures. Preserve the current public analysis shape and case storage schema.

Next increments: connect the user's SSDI facts to drafting, then verify packet →
quote → payment → fulfillment end to end. Add the next workflow with its own
validated inputs and rules only after its execution path is verified. Track
execution readiness independently of SEO content and factory manifest validity.

Verification: behavior tests for malformed model results, workflow routing,
stale analysis and enclosure readiness; existing case/AI/SSDI tests; app suite
and build. Live model/payment verification remains a separate integration check.
