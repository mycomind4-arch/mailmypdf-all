# MailMyPDF Master Context

Keep this file intentionally small. It contains facts that are useful across nearly every MailMyPDF task.

## Canonical product topology

- `mailmypdf-all` is the canonical MailMyPDF ecosystem repository.
- `mailmypdf/` is the active host application.
- Product sections live at the repository root, for example `appeal-mail/`, `notice-respond/`, `records-request/`, and `secured-transactions/`.
- `apps/verticals/*` is legacy donor/reference code during the migration. It is not the destination for new production work. Mine unique behavior, tests, assets, schemas, and rules from a donor before pruning it, following `context/MIGRATION_PRUNE_LEDGER.md`.
- Public sections are path-addressable modules of one MailMyPDF host, not independent canonical public deployments.
- Cross-section capabilities belong in `packages/*` rather than being reimplemented inside sections.

Canonical section namespace currently includes:

`appeal-mail`, `benefits-appeal`, `claim-proof`, `code-enforcement`, `dispute-mail`, `immigration-mail`, `insurance-claims`, `legal-defense`, `notice-respond`, `permit-reply`, `private-office`, `records-request`, `secured-transactions`, `small-business`, and `tenant-reply`.

## Shared platform boundary

Shared concerns include payment, fulfillment, pricing, AI/provider abstraction, document handling/intelligence, workflow runtime/factory, evidence/proof primitives, account/access contracts, and design-system code.

The monorepo's `packages/*` directory is the canonical home for shared `@mailmypdf/*` contracts and implementations. Historical external-platform material and legacy donor implementations are evidence to mine, not competing sources of truth.

## Related systems

- `fairprocessmaps` / FairProcess 2.0 — evidence-first property due-process analysis, case/evidence/timeline/findings workspace, Cloudflare D1/R2/Workers architecture.
- `ruthlessinvestigator` — evidence-backed multi-model investigation council with premise audit, hypothesis competition, adversarial review, source lineage, uncertainty, and transparent assessments.
- `advanced-search` — multimodal investigation/search subsystem for public or authorized sources, evidence normalization, provenance, entity resolution, corroboration, and controlled research tooling.

These systems may integrate with MailMyPDF, but they are not section copies and should preserve clear service/domain boundaries.

## Working principles

- One production source of truth per capability.
- Prefer shared contracts over section forks.
- New production implementation belongs in the root section trees and shared `packages/*`, not in `apps/verticals/*`.
- Preserve provenance, evidence, deadlines, status, and fulfillment state explicitly.
- Never infer production readiness from the existence of UI or workflow definitions alone.
- Verify the actual payment-to-fulfillment path, persistence, retries/idempotency, and deployment configuration.
- Use current code/tests/config as evidence; treat old audits, legacy donors, and chat history as retrieval sources, not truth.

## Context discipline

Start with this file, `CURRENT_WORK.md`, `CURRENT_STATE.md`, and `REPO_MAP.md`; then retrieve only the affected subsystem, applicable ADR/contracts, and relevant code/tests. When older context conflicts with `CURRENT_WORK.md` or a newer explicit architecture decision, update the stale context rather than following both.
