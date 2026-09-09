# MailMyPDF Ecosystem Repository Map

Use this file to decide **where work belongs before reading code**.

## Tier 1 — Canonical production source

### `mycomind4-arch/mailmypdf-all`
Role: canonical MailMyPDF monorepo and production source of truth.

- Host: `apps/mailmypdf`
- Verticals: `apps/verticals/*`
- Shared runtime/packages: `packages/*`
- Build/deployment state: root status/checkpoint documents
- Architecture decisions: `docs/decisions/*`
- Token-efficient entry point: `context/*`

New production MailMyPDF work should normally land here.

## Tier 2 — Shared/specialized systems with independent value

### `mycomind4-arch/mailmypdf-platform`
Role: shared platform contracts, extraction/migration plans, workflow inventory, ecosystem audits, and source history for shared primitives. Before implementing here, check whether the canonical implementation already lives in `mailmypdf-all/packages/*`.

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

## Tier 3 — Standalone vertical repositories retained as migration/reference sources

The following products have canonical counterparts under `mailmypdf-all/apps/verticals/*` and therefore should **not** be assumed to be the production source of truth:

- `appeal-mail` → `apps/verticals/appeal-mail`
- `benefits-appeal` → `apps/verticals/benefits-appeal`
- `claim-proof` → `apps/verticals/claim-proof`
- `code-enforcement` → `apps/verticals/code-enforcement`
- `dispute-mail` → `apps/verticals/dispute-mail`
- `immigration-mail` → `apps/verticals/immigration-mail`
- `insurance-claims` → `apps/verticals/insurance-claims`
- `notice-respond` → `apps/verticals/notice-respond`
- `permit-reply` → `apps/verticals/permit-reply`
- `mailmypdf-private-office` → `apps/verticals/private-office`
- `records-requests` → `apps/verticals/records-request`
- `mailmypdf-smallbusiness` → `apps/verticals/small-business`
- `tenant-reply` → `apps/verticals/tenant-reply`

Use these repos for history, migration comparison, or recovery when needed. If a standalone repo contains a newer implementation than the monorepo, compare deliberately and port the desired change into the canonical monorepo rather than silently changing both.

## Tier 4 — Adjacent/experimental repos

Examples in the organization include `agent-x`, `AccessForge`, `ParcelProof`, `TrustTrace`, `civic-ledger`, `humboldt-records-watch`, `redact-desk`, and other experiments/utilities.

Do not preload or integrate these simply because they exist. Retrieve them only when a task identifies a concrete capability that should be evaluated for reuse.

## Routing rule

When a task names a product rather than a repository:

1. Map the product to this file.
2. Start in the canonical location.
3. Retrieve a standalone/adjacent repo only if comparison, migration, or reuse is actually required.
4. Record any new permanent ownership decision in an ADR.