# Deep Audit — Full-Ecosystem Archive Findings

**Date:** 2026-08-27
**Method:** Every number from real `npm test` / `pnpm test` / `node --test` runs against actual code, not status docs.

---

## 0. Snapshot sanity check

The `code-enforcement` copy in the archive is byte-for-byte the same test result as before — **306/306 passing**, and `app/dashboard/CaseWorkspace.tsx` still imports zero of `src/domain` or `src/ui` (same grep, same zero hits, file dated Aug 26). **Confirm the live repo state directly before assuming Phase 1 shipped** — this snapshot doesn't show the agent's wiring work yet.

---

## 1. `fairprocess/testing-fairprocess/fairprocess-repo` — the big find

This is a more advanced codebase than `fairprocessmaps`, and it changes the build order.

### Architecture (verified from `INTEGRATION_NOTES.md` ADR-006)

- **Pivoted away** from FastAPI/PostGIS/Neo4j/Temporal/Meilisearch/LangGraph. That stack — including `backend/` Python code — is **frozen reference, not deployed.**
- **Live stack:** Next.js API routes on Cloudflare Workers + D1 (edge SQLite) + R2 (evidence storage) + Humboldt County ArcGIS REST API for real parcel lookup.
- **End-to-end wired flow:** map click → parcel resolve → project create → auto-gathered property intelligence (APN, zoning, acres, flood/coastal zone) → interactive timeline → due-process rule engine (10-day notice minimum, hearing right, appeal pathway) → evidence vault (R2-backed upload/download/delete) → dashboard panels: Overview, Property Intelligence, Timeline, Evidence Vault, Discrepancies, Building Dept, Code Enforcement, Legal Library, Connectors, Admin.

### Test results

**91/91 legitimate vitest tests pass** (`statutes.test.ts`, `analysis-agents.test.ts`, + 4 more files).

Two additional files (`statute-matcher.test.ts`, `timeline-anomaly.test.ts`) are manual console-log scripts, not vitest suites — vitest reports them as failed files, but their internal output shows 22/22 self-reported passes. Test-tooling mismatch, not logic failure.

### Self-reported honest gaps

- Local dev needs `wrangler dev` not `next dev` for D1 binding to resolve
- Appeal-pathway rule has no test data exercising it yet
- Evidence AI-summary column exists but nothing populates it
- Building Dept / Code Enforcement panels are UI shells not pulling real county data

### Why this changes the blueprint

`fairprocess-repo` is now the stronger foundation for property/due-process/evidence because:
- Already live end-to-end on Cloudflare Workers/D1/R2 — same architecture as `code-enforcement`, `records-requests`, and `mailmypdf`
- `fairprocessmaps`' backend is a separate FastAPI/Postgres/Neo4j service you'd have to stand up and integrate cross-stack
- Already has real Humboldt County GIS integration

**Recommendation:** Retarget Phase 3 of the blueprint at `fairprocess-repo` (primary) with `fairprocessmaps` as secondary/reference. Don't run both — two parallel due-process rule engines with two different rule sets against the same kind of case. Pick one canonical rule engine before either touches a real user's case.

---

## 2. `FairProcess` V1 — Recordation Integrity Engine

Mission: "Recordation Integrity Engine for code-enforcement cases" — organize documents, extract facts, apply versioned procedural rules, match recorder results, flag records as present/not-located/premature/needs-review, with explicit human-authorizes-consequential-findings design principle.

### Test results (package by package, `pnpm test`)

| Package | Tests | Result |
|---|---|---|
| `policy-engine` | 10 | ✅ 10/10 |
| `audit-engine` | 7 | ✅ 7/7 |
| `evidence-vault` | 26 | ✅ 26/26 |
| `fact-workbench` | 27 | ✅ 27/27 |
| `database` | 17 | ✅ 5/5 run, 12 skipped (need real Postgres — expected) |
| `api-server` | 45 | ✅ 13/13 run, 32 skipped (same reason) |
| `case-model` | 0 | ⚠️ **no test directory exists** — core type package has zero test coverage |
| `ai-worker` | — | ❌ **fails to build** — real TypeScript errors |
| `api-worker` | — | (no test script — thin Cloudflare Worker wrapper, expected) |
| `apps/web` build tests | 6 | ✅ 6/6 |

### `ai-worker` build failure — fix before relying on it

Two features drifted out of sync with their type contracts:

1. **Deadline Watchdog:** returns deadline items missing `rule`, `deadlineDate`, `daysRemaining`, and top-level response missing `asOfDate`. The deadline-tracking feature won't compile.
2. **Audit Narrative generator:** returns object missing required `sections` field.

Both look like schema/type updates that weren't propagated — a few-line fix each.

### Additional flag

The README's "Repository map" lists only `case-model`, `policy-engine`, `audit-engine`, `database`, `api-server` — omits `ai-worker`, `api-worker`, `evidence-vault`, `fact-workbench` even though all four are real and two are fully tested. Don't trust the doc's inventory over the actual package list.

---

## 3. `mailmypdf` core — mostly solid, one gap affecting the blueprint

### Test results

**508/519 pass, 11 fail.** Failures are a half-finished route migration:

- Some verticals (`dispute-mail`, `appeal-reply`, `debt-defense`, `private-office`, `small-business-mail`) still point at external `*.pages.dev` domains
- Others (`claim-proof`, `tenant-reply`, `permit-reply`, `benefits-appeal`, `records-request`) have migrated to root-relative canonical routes
- Registry-architecture and routing-integrity tests correctly catch the inconsistency

### Critical gap: `code-enforcement` and `records-requests` absent from vertical registry

Grepped `src/verticals/registry.ts` directly. The registered verticals at the time included:

`dispute-mail`, `appeal-reply`, `notice-response`, `claim-proof`, `tenant-reply`, `permit-reply`, `benefits-appeal`, `debt-defense`, `records-request` (singular — different id than the `records-requests` repo), `private-office`, `small-business-mail`.

**Neither `code-enforcement` nor `records-requests` appears.** Phase 4/5 is not currently plumbed at the registry level — needs to be an explicit build task.

**Options:**
- (a) Register as new verticals in `mailmypdf`'s registry — cleanest, matches existing pattern, gets webhook/proof-of-mailing infrastructure
- (b) Call fulfillment API directly without registry entry — faster, but loses registry-driven catalog/routing UI

**Recommendation:** Register them. Use root-relative routes (`/code-enforcement`), not `*.pages.dev` URLs.

### `mailmypdf-platform` dead-weight: reconfirmed

Direct grep across `mailmypdf-ecosystem/` for `@mailmypdf/*` import outside `mailmypdf-platform` itself: zero hits. Nothing depends on it. Leave out of scope.

---

## 4. `permit-signal` — explicitly archived, exclude

README: *"Archived: PermitSignal legacy implementation... Canonical repository: `mycomind4-arch/permitsignal`... Do not add features, deployment changes, or production data here."* If permit/deadline-monitoring is wanted later, get the canonical repo specifically.

---

## 5. Not yet audited this pass

`notice-respond` (42 test files), `permit-response` (1 test file), `mailmypdf-backup`, `mailmypdf-private-office`, `mailmypdf-smallbusiness`, `insurance-claims`, `immigration-mail`, `dispute-mail`, `benefits-appeal`, `appeal-mail`, `debt-defense` verticals, `fairprocess-ai`'s Cloudflare Worker (`agents.js`).

---

## 6. Summary of what to fix before trusting

| Item | Severity | Scope |
|---|---|---|
| `ai-worker` type errors (deadline watchdog, audit narrative) | Block — won't compile | FairProcess V1 |
| `case-model` zero test coverage | Risk — foundation package | FairProcess V1 |
| `code-enforcement` + `records-requests` absent from mailmypdf registry | Block for Phase 4/5 | mailmypdf |
| mailmypdf route migration inconsistency (11 failing tests) | Should fix — half-done | mailmypdf |
| `statute-matcher.test.ts` / `timeline-anomaly.test.ts` test format | Low — convert to vitest | fairprocess-repo |
| Confirm `code-enforcement` wiring in live repo (not just archive) | Verify before Phase 1 | code-enforcement |
