# CURRENT_STATE.md — Appeal Mail

**Last updated:** 2026-08-20
**Commit:** 601a5b2a
**Branch:** main

---

## Product Status

### What is complete

- **Homepage** — Polished production-quality hero with:
  - "Start an Appeal" + "Explore Appeal Types" CTAs
  - Visual flow bar (Upload → Understand → Analyze → Evidence → Build → Review → Send → Prove)
  - Stats bar (delivery time, pricing, control, no printers)
  - Workflow catalog preview by category (links to category pages)
  - Trust/safety section (6 items: AI-assisted analysis, evidence-supported drafting, source-aware reasoning, user review, no fabricated facts, no automatic mailing)
  - Features grid (8 features with 3 featured)
  - Step-by-step guide (8 steps with MailMyPDF mentions in Send and Track)
  - MailMyPDF ecosystem section (3 cards: mail from browser, track every step, proof of timely filing)
  - FAQ section (6 questions with accordion)
  - Final CTA section
  - SEO metadata (title, description, OG tags, canonical, JSON-LD WebSite schema with SearchAction)
- **Workflow directory** (`/workflows`) — Full product directory with:
  - Search bar (search by title, keyword, category, slug)
  - Category filter dropdown (All + 7 categories)
  - Status filter (All / Available Now / Coming Soon)
  - Grouped display by 7 categories with descriptions
  - Stats bar showing total/available/coming soon counts
  - Empty state with "Clear filters" button
  - SEO metadata (title, description, OG, canonical, JSON-LD)
- **Workflow placeholder pages** (`/appeal/$slug`) — Each of the 20 catalog workflows has a polished page:
  - Hero with category badge and status indicator (Available now / Coming soon)
  - Long description
  - Info grid: What We Analyze / What You'll Need / What We Identify / What Your Appeal Can Address
  - Intended user and problem solved
  - Honest CTA ("Start Appeal" for IMPLEMENTED, "Coming soon — join the waitlist" for COMING_SOON)
  - SEO metadata (title, description, OG, canonical, JSON-LD WebPage schema)
- **Category parent pages** (`/appeal/$slug` for category slugs) — 7 category pages:
  - Hero with category name, description, workflow counts
  - Workflow card grid with status badges
  - Other categories navigation
  - SEO metadata (title, description, OG, canonical, JSON-LD CollectionPage)
- **Workflow catalog** (`src/domain/appeal-catalog.ts`) — 20 entries across 7 categories:
  - Stable slugs, routes, SEO titles/descriptions
  - Truthful IMPLEMENTED (1) / COMING_SOON (19) status
  - `executable` boolean (true only for IMPLEMENTED)
  - `validateCatalog()` function for test-time integrity checks
  - Category slugs and helpers (`getCategoryRoute`, `getCategoryBySlug`)
- **Site header** — Sticky, blur, mobile menu, SPA Link navigation, "Start an Appeal" CTA
- **Site footer** — Product links, appeal categories with counts, company links, MailMyPDF branding
- **Tests** — 165 passing (138 original + 27 catalog tests)
- **Build** — Passes, Cloudflare Workers output generated

### Insurance Appeal (flagship)

The Insurance Appeal workflow at `/workflows/denied-claim` remains fully executable:
- Route: `/workflows/denied-claim`
- Component: `WorkflowWizard` (1512 lines)
- Full pipeline: Upload → X-Ray → Decision → Timeline → Grounds → Evidence → Arguments → Stress Test → Draft → Final Test → Readiness → Packet → Recipient → Mailing → Checkout → Proof
- Catalog entry at `/appeal/insurance-claim` marked IMPLEMENTED, executable: true
- Not modified in this milestone (backend preserved)

### What is NOT implemented (by design)

- SSI, SSDI, unemployment, Medicaid, SNAP, workers comp, VA, and administrative appeal intelligence engines
- Workflow-specific extraction logic for non-insurance types
- Per-workflow domain intelligence
- Factory registration for new workflows

### Known gaps

1. Old routes (`/workflows/government-decision`, `/workflows/court-ruling`, `/workflows/reconsideration`) still use the shared wizard — these are legacy
2. Resources pages (`/resources/$slug`) use older styling
3. The `appeal-a-decision.tsx` route uses inline styles
4. No sitemap.xml generation yet
5. No robots.txt configuration yet

## Test Results

```
# tests 165
# pass 165
# fail 0
```

## Build

```
✓ built in ~600ms
[nitro] ✔ You can preview this build using npx vite preview
[nitro] ✔ You can deploy this build using npx nitro deploy --prebuilt
```

## Git

- Committed: 601a5b2a
- Pushed: yes (to origin/main)
