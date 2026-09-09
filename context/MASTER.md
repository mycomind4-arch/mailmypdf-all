# MailMyPDF Master Context

Keep this file intentionally small. It contains facts that are useful across nearly every MailMyPDF task.

## Canonical product topology

- `mailmypdf-all` is the canonical MailMyPDF ecosystem repository.
- `apps/mailmypdf` is the host application.
- Product verticals live at `apps/verticals/<vertical>`.
- Public verticals are path-addressable modules of one MailMyPDF host, not independent canonical public deployments.
- Cross-vertical capabilities belong in `packages/*` rather than being reimplemented inside verticals.

Canonical vertical namespace currently includes:

`appeal-mail`, `benefits-appeal`, `claim-proof`, `code-enforcement`, `dispute-mail`, `immigration-mail`, `insurance-claims`, `notice-respond`, `permit-reply`, `private-office`, `records-request`, `small-business`, and `tenant-reply`.

## Shared platform boundary

Shared concerns include payment, fulfillment, pricing, AI/provider abstraction, document handling/intelligence, workflow runtime/factory, evidence/proof primitives, account/access contracts, and design-system code.

The monorepo currently contains shared `@mailmypdf/*` packages migrated from `mailmypdf-platform`. Treat `mailmypdf-platform` as an important contract/history/source repository, but verify whether the canonical implementation already exists in `mailmypdf-all/packages/*` before changing it there.

## Related systems

- `fairprocessmaps` / FairProcess 2.0 — evidence-first property due-process analysis, case/evidence/timeline/findings workspace, Cloudflare D1/R2/Workers architecture.
- `ruthlessinvestigator` — evidence-backed multi-model investigation council with premise audit, hypothesis competition, adversarial review, source lineage, uncertainty, and transparent assessments.
- `advanced-search` — multimodal investigation/search subsystem for public or authorized sources, evidence normalization, provenance, entity resolution, corroboration, and controlled research tooling.

These systems may integrate with MailMyPDF, but they are not vertical copies and should preserve clear service/domain boundaries.

## Working principles

- One production source of truth per capability.
- Prefer shared contracts over vertical forks.
- Preserve provenance, evidence, deadlines, status, and fulfillment state explicitly.
- Never infer production readiness from the existence of UI or workflow definitions alone.
- Verify the actual payment-to-fulfillment path, persistence, retries/idempotency, and deployment configuration.
- Use current code/tests/config as evidence; treat old audits and chat history as retrieval sources, not truth.

## Context discipline

Do not preload all repositories. Start with this file, `CURRENT_STATE.md`, and `REPO_MAP.md`; then retrieve only the affected subsystem, applicable ADR/contracts, and relevant code/tests.