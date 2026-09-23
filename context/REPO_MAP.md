# MailMyPDF Ecosystem Repository Map

Use this file to decide **where work belongs before reading code**.

## Tier 1 — Canonical production source

### `mycomind4-arch/mailmypdf-all`
Role: canonical MailMyPDF monorepo and production source of truth.

- Host: `mailmypdf/`
- Product sections/workflows: root section trees such as `appeal-mail/`, `notice-respond/`, `records-request/`, `secured-transactions/`, etc.
- Shared runtime/packages: `packages/*`
- Legacy migration donors: `apps/verticals/*` — reference/migration source only, not the destination for new production work
- Build/deployment state: `context/FACTORY_STATUS.md` plus current config/tests
- Migration disposition: `context/MIGRATION_PRUNE_LEDGER.md`
- Architecture decisions: `docs/decisions/*` and current `context/*` contracts

New production MailMyPDF work should normally land in the applicable root section or a shared package. If needed behavior exists only under `apps/verticals/*`, compare and migrate it deliberately; do not extend the donor as a competing implementation.

## Tier 2 — Shared/specialized systems with independent value

The `mailmypdf-all` monorepo owns its shared platform contracts in `packages/*`; there is no separate Platform repository.

### `mycomind4-arch/fairprocessmaps`
Role: FairProcess 2.0. Evidence-first property/case due-process analysis with GIS, evidence vault, timeline, findings, D1/R2, and Cloudflare deployment.

### `mycomind4-arch/ruthlessinvestigator`
Role: multi-model investigation council and evidence/uncertainty reasoning system.

### `mycomind4-arch/advanced-search`
Role: multimodal public/authorized-source investigation and evidence-search subsystem.

### `mycomind4-arch/project-unify`
Role: integration/unification experiment or supporting system. Do not treat it as the canonical MailMyPDF application without an explicit architecture decision.

### `mycomind4-arch/gov-reply`
Role: related government-response/proof workflow concept. Keep separate unless/until a deliberate integration decision assigns its production boundary.

## Tier 3 — Standalone product repositories retained as migration/reference sources

Standalone repositories may contain historical or newer implementation material, but the canonical destination is the matching root section inside `mailmypdf-all`:

- `appeal-mail` → `appeal-mail/`
- `benefits-appeal` → `benefits-appeal/`
- `claim-proof` → `claim-proof/`
- `code-enforcement` → `code-enforcement/`
- `dispute-mail` → `dispute-mail/`
- `immigration-mail` → `immigration-mail/`
- `insurance-claims` → `insurance-claims/`
- `notice-respond` → `notice-respond/`
- `permit-reply` → `permit-reply/`
- `mailmypdf-private-office` → `private-office/`
- `records-requests` → `records-request/`
- `mailmypdf-smallbusiness` → `small-business/`
- `tenant-reply` → `tenant-reply/`

Use standalone repositories for history, migration comparison, or recovery when needed. If a standalone repository contains useful behavior not yet present in the monorepo, port the desired behavior into the canonical root section/shared package rather than silently maintaining both.

## Legacy donor tree inside the monorepo

`apps/verticals/*` still contains substantial runtime logic, tests, fixtures, assets, and acceptance references for sections that have not completed migration. Treat these paths as **read-only donors by default**. Before deleting or excluding a donor, satisfy the prune gate in `context/MIGRATION_PRUNE_LEDGER.md`: inventory unique behavior, migrate/generalize/preserve it, verify destinations, record disposition, then prune.

## Tier 4 — Adjacent/experimental repos

Examples in the organization include `agent-x`, `AccessForge`, `ParcelProof`, `TrustTrace`, `civic-ledger`, `humboldt-records-watch`, `redact-desk`, and other experiments/utilities.

Do not preload or integrate these simply because they exist. Retrieve them only when a task identifies a concrete capability that should be evaluated for reuse.

## Routing rule

When a task names a product rather than a repository:

1. Start in `mycomind4-arch/mailmypdf-all`.
2. Route implementation to the root section or shared `packages/*`.
3. Inspect `apps/verticals/*` or a standalone repository only when migration/comparison/recovery is actually required.
4. Preserve unique donor behavior before pruning.
5. Record permanent ownership/topology changes in current context and, when appropriate, an ADR.
