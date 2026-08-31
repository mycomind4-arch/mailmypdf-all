# Ecosystem Architecture Map

**Date:** 2026-08-27 (updated with full-archive audit findings)
**Prior audit:** 2026-08-18
**Method:** Real test runs against actual code — see `docs/01_DEEP_AUDIT.md` for full findings

## Existing Repositories

| Repo | Type | Status | Role | Tests |
|---|---|---|---|---|
| notice-respond | vertical | live | Workflow factory + notice response workflows | 992/994 |
| mailmypdf | core | production | Mailing, tracking, proof, payments, fulfillment | 508/519 (11 route-migration fails) |
| mailmypdf-platform | platform | dead weight | Shared packages (nothing imports from it) | — |
| fairprocessmaps | data | live (frozen backend) | Jurisdiction/property intelligence (FastAPI stack frozen per ADR-006) | — |
| fairprocess-repo | data+engine | live | Due-process engine + property intelligence on Cloudflare D1/R2 + county GIS | 91/91 |
| FairProcess V1 | engine | partial (ai-worker won't build) | Recordation Integrity Engine for code-enforcement | 106/106 pass, ai-worker ❌, case-model 0 tests |
| code-enforcement | vertical | scaffolded | Code enforcement vertical | 306/306 |
| immigration-mail | vertical | live | Immigration document processing | — |
| certified-mail-from-pdf | vertical | live | Certified mail product | — |
| appeal-mail | vertical | live | Appeal letter generation | — |
| dispute-mail | vertical | live | Dispute letter generation | — |
| permit-signal | vertical | archived | Permit deadline monitoring — DO NOT EXTEND | — |

## Key Architecture Changes from Full Archive Audit

### 1. fairprocess-repo replaces fairprocessmaps as primary due-process engine
- fairprocess-repo runs on Cloudflare Workers/D1/R2 — same stack as all other repos
- fairprocessmaps' FastAPI/Postgres/Neo4j backend is frozen reference, not deployed
- fairprocess-repo has real Humboldt County GIS integration (map click → parcel → zoning, flood zone, etc.)
- fairprocess-repo has working due-process rule engine (10-day notice, hearing right, appeal pathway)
- fairprocess-repo has R2-backed evidence vault (upload/download/delete + timeline events)

### 2. Evidence vault consolidation needed
Three candidates exist. Pick one canonical:
- **fairprocess-repo's R2 vault** ← RECOMMENDED (live, R2-backed, wired end-to-end)
- FairProcess V1's `evidence-vault` package (26/26 tests, but standalone)
- code-enforcement/src/domain (conceptual only)

### 3. mailmypdf vertical registry gap
`code-enforcement` and `records-requests` are NOT in `mailmypdf/src/verticals/registry.ts`. This blocks Phase 4/5 of the blueprint. Must register them before mailing is wired.

### 4. FairProcess V1 ai-worker won't compile
Two type errors (Deadline Watchdog return shape, Audit Narrative missing `sections` field). Fix before relying on these features. Also: `case-model` package has zero test coverage.

### 5. permit-signal explicitly archived
README says don't add features. If permit monitoring needed, get canonical repo `mycomind4-arch/permitsignal`.

### 6. mailmypdf-platform confirmed dead weight
Zero `@mailmypdf/*` imports from any other repo. Leave out of scope.

## Reusable Capabilities Already Implemented

### notice-respond (canonical workflow infrastructure)
- `workflow-definition.ts` — MasterWorkflowDefinition interface
- `workflow-catalog.ts` — 25 workflow definitions (18 deployed routes)
- `workflow-runtime.ts` — Generic state machine with phases, extraction, facts, deadlines, evidence, draft validation, mailing state
- CP2000 gold-standard pipeline: discrepancy analysis, evidence checklist, strategy generation, two-pass validation, case model, research packs, draft provenance
- CP14 authority gates (8 gates)
- Fact/Evidence/Contradiction/Deadline/MissingInfo/Strategy/NextAction modules
- Draft validator with requirement coverage
- MailingFunnel component (recipient, method, checkout, tracking)
- Enhanced SEO head generator (FAQPage + WebApplication + BreadcrumbList JSON-LD)
- Per-workflow SEO content (keywords, FAQ, breadcrumbs, OpenGraph)

### mailmypdf (canonical fulfillment infrastructure)
- MailService + Lob adapter (actual mailing)
- TrackingService (Lob webhooks)
- ProofOfMailing (hash-linked custody chain)
- Stripe payments (checkout, refunds, subscriptions)
- Document handling (SHA-256, storage, security validation)
- Verticals registry (12 registered — code-enforcement + records-requests MISSING)

### fairprocess-repo (canonical due-process + property intelligence)
- Parcel resolution via Humboldt County ArcGIS REST API
- Auto-gathered property intelligence (APN, zoning, acres, flood/coastal zone)
- Interactive timeline with event tracking
- Due-process rule engine (10-day notice minimum, hearing right, appeal pathway)
- R2-backed evidence vault (upload/download/delete + timeline event creation)
- Dashboard panels: Overview, Property Intelligence, Timeline, Evidence Vault, Discrepancies, Building Dept, Code Enforcement, Legal Library, Connectors, Admin

### FairProcess V1 (Recordation Integrity Engine)
- `policy-engine` (10 tests) — versioned procedural rules
- `audit-engine` (7 tests) — audit trail
- `evidence-vault` (26 tests) — evidence model
- `fact-workbench` (27 tests) — fact extraction + verification
- `case-model` (0 tests ⚠️) — core type definitions
- `ai-worker` (❌ won't build) — deadline watchdog + audit narrative (needs type fixes)

## Architecture Decision: Where the Workflow Factory Lives

**notice-respond** owns the Workflow Factory. It has the canonical WorkflowDefinition + WorkflowCatalog + WorkflowRuntime, tested domain modules, a working deployed app on Cloudflare Pages, 992 passing tests, and the MailingFunnel integration.

## Integration Blueprint

See `docs/02_AGENT_INTEGRATION_BLUEPRINT.md` for the full phase-by-phase integration plan with dependencies and fix-before-trusting list.

## What NOT to Rebuild
- MasterWorkflowDefinition / WorkflowCatalog / WorkflowRuntime (exists, extend)
- Fact/Evidence/Contradiction/Deadline modules (exists, keep)
- MailingFunnel (exists, improve UX)
- Evidence vault (use fairprocess-repo's R2 vault — don't build a second one)
- Due-process rule engine (use fairprocess-repo's — don't run fairprocessmaps' too)

## What to Add
- code-enforcement and records-requests in mailmypdf vertical registry
- Fix FairProcess V1 ai-worker type errors (Deadline Watchdog + Audit Narrative)
- Add test coverage to FairProcess V1 case-model
- Migrate remaining mailmypdf verticals from *.pages.dev to root-relative routes
- Verify code-enforcement domain wiring in live repo (archive doesn't show it)
