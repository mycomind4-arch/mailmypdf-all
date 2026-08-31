# MailMyPDF Monorepo Build Status

**Last baseline verification:** 2026-08-28
**Repository topology migration:** 2026-08-31

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
- **Package resolution:** All `@mailmypdf/*` deps use `workspace:*`
- **Package main/types:** All packages point to `src/index.ts` for dev resolution

## Deployment Architecture

The repository is now organized for one MailMyPDF public host with path-based verticals. No unconfirmed production hostname is encoded in the repo.

- `/` → `apps/mailmypdf`
- `/<vertical>/*` → matching `apps/verticals/<vertical>` application
- Shared payment, fulfillment, pricing, AI, workflow, and document capabilities remain in `packages/*`

The actual production hostname and DNS configuration remain intentionally unset until a MailMyPDF domain is established.

See `MAILMYPDF_APPLICATION_TOPOLOGY.md` for the canonical routing and ownership rules.
