# Agent Integration Blueprint

**Date:** 2026-08-27
**Amended with:** Full-ecosystem archive findings (see `01_DEEP_AUDIT.md`)

---

## Architecture Summary

The MailMyPDF ecosystem is a multi-repository system for guided document-response workflows. All repos deploy to Cloudflare Workers/Pages. The integration blueprint connects `code-enforcement`, `notice-respond`, `fairprocess-repo`, `FairProcess` V1, and `mailmypdf` into a unified code-enforcement platform.

```
                    MAILMYPDF (fulfillment backbone)
                        |
            +-----------+-----------+-----------+
            |           |           |           |
     NOTICE-RESPOND  CODE-ENF.  FAIRPROCESS-REPO
     (workflow factory) (vertical)  (due-process brain)
            |
     +------+------+
     |      |      |
  FAIRPROCESS V1   MAILMYPDF-PLATFORM (dead weight — exclude)
  (recordation
   integrity)
```

---

## Phase 1 — Verify & Wire code-enforcement domain layer

**Status:** Verify live repo before assuming shipped (archive snapshot doesn't show agent wiring)

**Tasks:**
- Confirm `app/dashboard/CaseWorkspace.tsx` imports from `src/domain` and `src/ui` in the live repo (archive shows zero hits)
- Confirm 306/306 tests still pass in live repo
- Wire any missing domain imports the agent was supposed to add

**Block on:** Live repo verification

---

## Phase 2 — notice-respond workflow factory → code-enforcement

**Status:** notice-respond is the gold-standard reference implementation

**Tasks:**
- Extend `MasterWorkflowDefinition` to support code-enforcement engine type
- Create code-enforcement domain pack (notice types: code violation, abatement order, hearing notice, appeal deadline)
- Wire extraction → facts → evidence → contradictions → deadlines → draft → mailing pipeline
- Use notice-respond's existing `WorkflowRuntime` state machine (don't rebuild)

**Depends on:** Phase 1

---

## Phase 3a — Fix FairProcess V1 ai-worker build (PREREQUISITE)

**Status:** Currently fails to compile — must fix before Phase 3

**Tasks:**
1. Fix **Deadline Watchdog** return type — add `rule`, `deadlineDate`, `daysRemaining` to deadline items, add `asOfDate` to top-level response
2. Fix **Audit Narrative generator** — add required `sections` field to return object

Both are small, specific fixes — schema/type updates that weren't propagated to the implementation.

**Also:** Add test coverage to `case-model` package (currently 0 tests — it's the type foundation several tested packages build on)

**Depends on:** Nothing (independent)

---

## Phase 3 — Integrate fairprocess-repo as due-process/property brain

**Status:** RETARGETED from fairprocessmaps to fairprocess-repo per audit findings

**Rationale:** fairprocess-repo is already live end-to-end on Cloudflare Workers/D1/R2 (same architecture as everything else), has real Humboldt County GIS integration, and 91/91 tests pass. fairprocessmaps' FastAPI/Postgres/Neo4j backend is frozen reference — standing it up and integrating cross-stack would be wasted effort.

**Tasks:**
- Consume fairprocess-repo's due-process rule engine (10-day notice minimum, hearing right, appeal pathway) as the canonical rule engine for code-enforcement cases
- Use its property intelligence pipeline (map click → parcel resolve → APN, zoning, acres, flood/coastal zone from real county GIS)
- Use its R2-backed evidence vault as the canonical evidence storage (see "Evidence vault consolidation" below)
- Port any useful rule content from fairprocessmaps' `due_process_analyzer.py` as reference, but do NOT run fairprocessmaps as a live service

**DO NOT run two live due-process engines.** Pick fairprocess-repo as canonical. fairprocessmaps is reference-only.

**Depends on:** Phase 1, Phase 3a (if using FairProcess V1's Deadline Watchdog / Audit Narrative)

---

## Phase 4 — Register code-enforcement + records-requests in mailmypdf

**Status:** NEW PREREQUISITE — neither repo is in the vertical registry today

**Current state:** `src/verticals/registry.ts` has 12 verticals. `code-enforcement` and `records-requests` are absent. Phase 4/5 ("route all outbound mail through MailMyPDF") is not plumbed at the registry level.

**Tasks:**
1. Register `code-enforcement` as new vertical in `mailmypdf/src/verticals/registry.ts`
2. Register `records-requests` as new vertical (note: existing `records-request` singular is a different id — resolve naming)
3. Use **root-relative routes** (`/code-enforcement`), NOT `*.pages.dev` URLs — don't perpetuate the half-migrated split that 11 failing tests are flagging
4. Wire webhook/proof-of-mailing infrastructure (same pattern as other 12 verticals)

**Also fix:** The 11 failing mailmypdf tests from half-finished route migration (migrate remaining `*.pages.dev` verticals to root-relative)

**Depends on:** Phase 1

---

## Phase 5 — Full mailing flow integration

**Tasks:**
- Connect code-enforcement workflow's mailing step to mailmypdf's fulfillment API (now registered in Phase 4)
- Wire proof-of-mailing / tracking hash chain back to the case timeline
- Use Certified mail as default for legal notices (matches notice-respond pattern)

**Depends on:** Phase 4

---

## Evidence Vault Consolidation (cross-cutting decision)

Three candidate evidence-storage implementations exist:
1. `code-enforcement/src/domain` (conceptual)
2. `fairprocess-repo`'s R2-backed vault (live, tested, upload/download/delete + timeline event creation)
3. `FairProcess` V1's `evidence-vault` package (26/26 tests pass)

**Decision:** Pick `fairprocess-repo`'s R2-backed vault as canonical. It's live, R2-backed, and already wired to upload/download/delete/timeline-event-creation. The others defer to it or are retired.

**Do NOT build a second evidence vault.** Pick one early.

---

## What NOT to do

1. **Don't run two due-process rule engines.** Pick fairprocess-repo. fairprocessmaps is reference-only.
2. **Don't build a second evidence vault.** Pick fairprocess-repo's R2 vault.
3. **Don't use `*.pages.dev` URLs in mailmypdf vertical registry.** Use root-relative routes.
4. **Don't extend `permit-signal`.** It's explicitly archived.
5. **Don't rely on `mailmypdf-platform`.** Nothing imports `@mailmypdf/*` from it. Dead weight.
6. **Don't trust doc inventories over actual package lists.** FairProcess V1's README omits 4 real packages. mailmypdf's route migration is half-done but tests correctly flag it.
7. **Don't assume the archive reflects live repo state.** The `code-enforcement` snapshot doesn't show agent wiring — verify the live repo directly.

---

## Fix-before-trusting list

| Item | What | Where |
|---|---|---|
| `ai-worker` type errors | Deadline Watchdog return shape + Audit Narrative `sections` field | FairProcess V1 |
| `case-model` zero tests | Add test coverage to core type package | FairProcess V1 |
| mailmypdf route migration | Migrate 6 verticals from `*.pages.dev` to root-relative | mailmypdf |
| mailmypdf vertical registry | Register `code-enforcement` + `records-requests` | mailmypdf |
| code-enforcement wiring | Verify live repo imports (archive shows zero) | code-enforcement |
| fairprocessmaps timeline-sort bug | Fix (from original audit) | fairprocessmaps |

---

## Phase ordering

```
Phase 3a (fix ai-worker) ─────┐
                               ├──→ Phase 3 (integrate fairprocess-repo)
Phase 1 (verify code-enforcement) ─┘         │
                                               │
Phase 1 ──→ Phase 2 (workflow factory) ──→ Phase 5 (mailing flow)
    │                                         ↑
    └──→ Phase 4 (register in mailmypdf) ────┘
```

Phase 3a and Phase 1 can run in parallel. Phase 3 depends on both. Phase 4 depends on Phase 1. Phase 5 depends on Phase 4. Phase 2 depends on Phase 1.
