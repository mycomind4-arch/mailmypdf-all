# MailMyPDF Monorepo Build Status

**Last baseline verification:** 2026-08-28  
**Repository topology migration:** 2026-08-31  
**Payment/fulfillment consolidation pass:** 2026-09-01

## Build Baseline — 11 Apps

| # | App | Framework | Status | Source Files |
|---|-----|-----------|--------|-------------|
| 00 | MailMyPDF host (formerly Core) | TanStack Start | ✅ Builds (baseline) | 488 |
| 01 | Notice Respond | TanStack Start | ✅ Builds (baseline) | 285 |
| 02 | Appeal Mail | TanStack Start | ✅ Builds (baseline) | 443 |
| 03 | Immigration Mail | TanStack Start | ✅ Builds (baseline) | 233 |
| 04 | Dispute Mail | TanStack Start | ✅ Builds (baseline) | 117 |
| 05 | Small Business | Vite SPA | ✅ Builds (baseline) | 113 |
| 06 | Records Request | Next.js | ✅ Builds (baseline) | 182 |
| 07 | Code Enforcement | Next.js | ✅ Builds (baseline) | 105 |
| 08 | Benefits Appeal | Next.js | ✅ Builds (baseline) | 252 |
| 09 | Private Office | TanStack Start | ✅ Builds (baseline) | 130 |
| 10 | Insurance Claims | Next.js | ✅ Builds (baseline) | 39 |

The baseline above is retained from the 2026-08-28 verification. Additional verticals present in the consolidated repository (`claim-proof`, `permit-reply`, and `tenant-reply`) were not included in that historical 11-app baseline and are therefore not represented as newly verified here.

## 2026-09-01 Consolidation Reconciliation

The following production-path payment/fulfillment migrations have been reconciled in the codebase:

- **Notice Respond** — canonical `@mailmypdf/payment-fulfillment` and `@mailmypdf/mailing-client`; obsolete local payment-fulfillment implementation removed.
- **Immigration Mail** — Stripe webhook and browser-return fulfillment use the canonical payment/fulfillment engine; local MailMyPDF HTTP client is now a compatibility shim; schema translation remains in the vertical adapter.
- **Dispute Mail** — browser-return fulfillment and MailMyPDF client use the shared platform; vertical-only dispute-case synchronization remains in the adapter.
- **Appeal Mail** — Stripe fulfillment already uses the canonical payment/fulfillment engine and the shared mailing client contract; its vertical-specific adapter remains the integration boundary.
- **Fulfillment status vocabulary** — canonical provider-status normalization now lives in `@mailmypdf/fulfillment`.

These changes were pushed directly to `main`. No fresh monorepo build or test run has been certified after the consolidation changes because the execution environment could not clone the repository from GitHub.

## Remaining Repo Integrity Issue

The current `pnpm-workspace.yaml` correctly declares:

- `packages/*`
- `apps/*`
- `apps/verticals/*`

However, `pnpm-lock.yaml` still contains importer entries using the pre-topology paths such as `apps/appeal-mail`, `apps/dispute-mail`, `apps/immigration-mail`, and `apps/core`. Those importer paths and their relative `link:` targets need to be regenerated from the current workspace before treating a frozen-lockfile installation as production-ready.

## Current Application Topology

The repository now has one canonical host application and one normalized vertical namespace:

- `apps/mailmypdf` — canonical MailMyPDF host application
- `apps/verticals/appeal-mail`
- `apps/verticals/benefits-appeal`
- `apps/verticals/claim-proof`
- `apps/verticals/code-enforcement`
- `apps/verticals/dispute-mail`
- `apps/verticals/immigration-mail`
- `apps/verticals/insurance-claims`
- `apps/verticals/notice-respond`
- `apps/verticals/permit-reply`
- `apps/verticals/private-office`
- `apps/verticals/records-request`
- `apps/verticals/small-business`
- `apps/verticals/tenant-reply`

The former `apps/core` and top-level vertical directories were moved intact; their implementation trees were not deleted or rewritten during the topology migration.

## Shared Packages — 17 packages from mailmypdf-platform

| Package | Files | Status |
|---------|-------|--------|
| @mailmypdf/pricing | 1 | ✅ Core pricing engine |
| @mailmypdf/ecosystem | 2 | ✅ Account/access contracts |
| @mailmypdf/design-system | 3 | ✅ Design tokens + CSS |
| @mailmypdf/fulfillment | 1 | ✅ Lob fulfillment |
| @mailmypdf/core | 1 | ✅ Core types |
| @mailmypdf/ai | 1 | ✅ AI provider abstraction |
| @mailmypdf/documents | 1 | ✅ Document handling |
| @mailmypdf/intelligence | 12 | ✅ Intelligence pipeline |
| @mailmypdf/mailing-client | 1 | ✅ Mailing client |
| @mailmypdf/proof | 1 | ✅ Proof packets |
| @mailmypdf/payment-fulfillment | 1 | ✅ Payment fulfillment |
| @mailmypdf/vertical-foundry | 94 | ✅ Workflow factory |
| @mailmypdf/workflows | 22 | ✅ Workflow definitions |
| @mailmypdf/agent-runtime | 33 | ✅ Agent pipeline runtime |
| @mailmypdf/voice | 1 | ✅ Voice server |
| @mailmypdf/voice-client | 1 | ✅ Voice client |
| @mailmypdf/document-intelligence | 1 | ✅ Doc intelligence |

## Build Configuration

- **Package manager:** pnpm with workspace protocol
- **Node linker:** hoisted (`.npmrc`)
- **Turbo:** configured for parallel builds
- **Workspace globs:** `packages/*`, `apps/*`, and `apps/verticals/*`
- **Core fix:** tslib alias in `apps/mailmypdf/vite.config.ts` → resolves to monorepo root `node_modules/tslib/tslib.es6.mjs`
- **Package resolution:** All `@mailmypdf/*` deps use `workspace:*` in the consolidated package manifests where migrated
- **Package main/types:** All packages point to `src/index.ts` for dev resolution

## Deployment Architecture

The repository is now organized for one MailMyPDF public host with path-based verticals. No unconfirmed production hostname is encoded in the repo.

- `/` → `apps/mailmypdf`
- `/<vertical>/*` → matching `apps/verticals/<vertical>` application
- Shared payment, fulfillment, pricing, AI, workflow, and document capabilities remain in `packages/*`

The actual production hostname and DNS configuration remain intentionally unset until a MailMyPDF domain is established.

See `MAILMYPDF_APPLICATION_TOPOLOGY.md` for the canonical routing and ownership rules.
