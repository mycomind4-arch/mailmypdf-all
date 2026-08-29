# MailMyPDF Monorepo Build Status

**Last verified:** 2026-08-28

## Build Results — All 11 Apps

| # | App | Framework | Status | Source Files |
|---|-----|-----------|--------|-------------|
| 00 | Core (mailmypdf) | TanStack Start | ✅ Builds | 488 |
| 01 | Notice Respond | TanStack Start | ✅ Builds | 285 |
| 02 | Appeal Mail | TanStack Start | ✅ Builds | 443 |
| 03 | Immigration Mail | TanStack Start | ✅ Builds | 233 |
| 04 | Dispute Mail | TanStack Start | ✅ Builds | 117 |
| 05 | Small Business | Vite SPA | ✅ Builds | 113 |
| 06 | Records Request | Next.js | ✅ Builds | 182 |
| 07 | Code Enforcement | Next.js | ✅ Builds | 105 |
| 08 | Benefits Appeal | Next.js | ✅ Builds | 252 |
| 09 | Private Office | TanStack Start | ✅ Builds | 130 |
| 10 | Insurance Claims | Next.js | ✅ Builds | 39 |

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
- **Core fix:** tslib alias in `apps/core/vite.config.ts` → resolves to monorepo root `node_modules/tslib/tslib.es6.mjs`
- **Package resolution:** All `@mailmypdf/*` deps use `workspace:*`
- **Package main/types:** All packages point to `src/index.ts` for dev resolution

## Framework Distribution

- **TanStack Start** (6 apps): core, notice-respond, appeal-mail, immigration-mail, dispute-mail, private-office
- **Next.js** (4 apps): records-request, code-enforcement, benefits-appeal, insurance-claims
- **Vite SPA** (1 app): small-business

## Deployment Targets

- TanStack Start → Cloudflare Workers (via Nitro `cloudflare-pages` preset)
- Next.js → Cloudflare Workers (via `@opennextjs/cloudflare`)
- Vite SPA → Cloudflare Pages (static)
