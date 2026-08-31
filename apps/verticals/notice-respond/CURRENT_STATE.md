# CURRENT_STATE.md — Fresh Repository Audit

**Date:** 2026-08-27
**Auditor:** Milo (continuing agent)
**Method:** Direct code inspection + test/build execution

---

## 1. Repository

- **Repo:** `github.com/mycomind4-arch/notice-respond`
- **Stack:** React 19 + TanStack Router + Vite 8 + Nitro (Cloudflare Workers preset)
- **Runtime:** Cloudflare Workers (serverless edge)
- **Database:** Supabase (schema defined, client wired)
- **Payments:** Stripe (dependency present, integration in mailing funnel)
- **Mailing:** MailMyPDF API (provider + server endpoint implemented)
- **Node:** v20.20.2
- **Tests:** 994 total / 992 pass / 2 pre-existing failures
- **Build:** Succeeds, produces `dist/_worker.js` for Cloudflare Workers

---

## 2. Architecture

### Source Tree

```
src/
  domain/          — Business logic (40+ modules)
  platform/        — Infrastructure adapters (Supabase, MailMyPDF, speech, repository)
  routes/          — TanStack Router file-based routes
  components/      — Shared UI (workflow-shell, mailing-funnel, etc.)
server/
  api/mail/        — Server-side mailing endpoint
tests/             — 23 test files, 490 tests
docs/              — Architecture docs, gap matrix, SEO keyword map
agent/             — Previous agent checkpoint files
```

### Key Domain Modules

| Module | Purpose | Connected to Production? |
|--------|---------|------------------------|
| `workflow-definition.ts` | Canonical workflow definition types, engine registry, priority scoring | Types used; factory not called at runtime |
| `workflow-master-registry.ts` | 54+ workflow entries across all verticals | Used for directory display + test validation |
| `workflow-catalog.ts` | 18 production workflow definitions (source of truth) | ✅ Yes — routes import from here |
| `workflow-factory.ts` | Factory: validate → resolve engine → load packs → construct | ❌ No — architecture only |
| `workflow-runtime.ts` | Generic state machine (phases, steps, transitions) | ✅ Yes — used by all routes |
| `domain-packs.ts` | Pack registry + 8 pack interfaces | ❌ No — registry empty at runtime |
| `cp2000.ts` | CP2000 extraction + draft generation | ✅ Yes — used by route |
| `cp2000-validation.ts` | Two-pass validation (factual + requirement, BLOCK level) | ❌ **NOT connected** |
| `cp2000-discrepancy.ts` | CP2000-specific discrepancy analysis | ❌ **NOT connected** |
| `cp2000-evidence.ts` | Dynamic evidence checklist from discrepancies | ❌ **NOT connected** |
| `cp2000-strategy.ts` | Discrepancy-aware strategy generator | ❌ **NOT connected** |
| `cp2000-case.ts` | CP2000 case model connecting all analysis | ❌ **NOT connected** |
| `cp2000-research.ts` | 7 verified IRS sources + known facts | ❌ **NOT connected** |
| `cp2000-findings.ts` | CP2000-specific finding types | ❌ **NOT connected** (via case model) |
| `cp2000-packs.ts` | CP2000 domain pack registration | ❌ **NOT connected** (registered, never imported by route) |
| `cp14.ts` | CP14 extraction + draft + gates | ✅ Yes — full implementation |
| `cp14-gates.ts` | CP14 authority-level quality gates | ✅ Yes |
| `security.ts` | Injection detection, sanitization, file validation | ❌ **NOT connected** |
| `draft-validator.ts` | Generic draft validation (sections, facts, forbidden behavior) | ✅ Yes — used by CP2000 route |
| `strategy.ts` | Generic strategy recommendation | ✅ Yes — used by CP2000 route (but should use cp2000-strategy) |
| `contradiction.ts` | Generic contradiction detection | ✅ Yes |
| `missing-info.ts` | Generic missing info detection | ✅ Yes |
| `deadline.ts` | Deadline derivation + certainty + urgency | Partially — extraction uses it, UI doesn't show certainty |
| `evidence.ts` | Shared evidence lifecycle | Used by CP2000 evidence module (not by route) |
| `fact.ts` | Fact model with provenance | ✅ Yes — extraction produces facts |
| `source-provenance.ts` | Authoritative source + citation model | Used by cp2000-research (not by route) |
| `draft-provenance.ts` | Trace draft assertions to facts | ❌ **NOT connected** |
| `response.ts` | ResponseDraft type | Used by case model (not by route) |
| `mailing.ts` | MailingProvider interface | ✅ Yes |
| `mailmypdf.ts` / `mailmypdf-provider.ts` | MailMyPDF API client + provider | ✅ Yes — server endpoint + provider |

### Production Routes

| Route | Workflow ID | Lifecycle | Status |
|-------|------------|-----------|--------|
| `/workflows/cp2000-response` | cp2000-response | functional | Works but uses generic validation, not two-pass |
| `/workflows/cp14-response` | cp14-response | authority | Most mature, full quality gates |
| `/workflows/cp504-response` | cp504-response | functional | Intent to Levy, CDP hearing, route + factory |
| `/workflows/cp49-response` | cp49-response | functional | Notice classification, extraction, case model, factory |
| `/workflows/cp523-response` | cp523-response | functional | Installment Agreement Default, full pipeline, factory parity |
| `/workflows/irs-notice` | irs-notice | functional | Works |
| `/workflows/court-summons` | court-summons | functional | Works |
| `/workflows/agency-action` | agency-action | functional | Works |
| `/workflows/file-appeal` | file-appeal | functional | Works |
| `/workflows/tax-notice` | tax-notice | functional | LLM analysis + draft generation, full pipeline |
| `/workflows/code-enforcement` | code-enforcement | functional | LLM analysis + draft generation, full pipeline |
| `/workflows/permit-correction` | permit-correction | functional | LLM analysis + draft generation, full pipeline |
| `/workflows/dmv-notice` | dmv-notice | functional | LLM analysis + draft generation, full pipeline |
| `/workflows/ssa-notice` | ssa-notice | functional | LLM analysis + draft generation, full pipeline |
| `/workflows/uscis-notice` | uscis-notice | functional | LLM analysis + draft generation, full pipeline |
| `/workflows/benefits-notice` | benefits-notice | functional | LLM analysis + draft generation, full pipeline |

---

## 3. Production-Connected Capabilities

What actually runs when a user uses the CP2000 workflow:

```
Upload/Paste text
  → extractCP2000() — pattern-based field extraction ✅
  → classifyNoticeType() — notice classification ✅
  → createFact() with provenance — structured facts ✅
  → detectContradictions() — generic contradiction check ✅
  → detectMissingInfo() — generic missing info check ✅
  → recommendStrategies() — generic strategy recommendation ✅
  → generateCP2000Draft() — template-based draft ✅
  → validateDraft() — GENERIC validation (sections, facts, forbidden behavior) ✅
  → Review checks → Mailing funnel → MailMyPDF API ✅
```

---

## 4. Disconnected Capabilities

These modules are **fully implemented and tested** but **not called by any production route**:

### CP2000 Gold-Standard Intelligence (P0/P1)

| Module | Lines | Tests | What It Does |
|--------|-------|-------|-------------|
| `cp2000-validation.ts` | ~370 | 15+ tests | Two-pass validation: factual consistency + requirement completeness, with BLOCK-level findings |
| `cp2000-discrepancy.ts` | ~280 | 10+ tests | Detects amount mismatches, documentation gaps, wrong tax years, generates findings |
| `cp2000-evidence.ts` | ~200 | 8+ tests | Dynamic evidence checklist built from discrepancies, tracks state (missing→provided→verified) |
| `cp2000-strategy.ts` | ~180 | 5+ tests | Strategy derived from discrepancies + evidence + findings, not assumptions |
| `cp2000-case.ts` | ~230 | 10+ tests | Typed case model connecting all analysis components with phase tracking |
| `cp2000-research.ts` | ~200 | 8+ tests | 7 verified IRS.gov sources, 10 known facts with source citations |
| `cp2000-findings.ts` | ~30 | via hardening | CP2000-specific finding types |
| `cp2000-packs.ts` | ~180 | 2 tests | Domain pack registration (registered but never imported by route) |

### Security (P0)

| Module | Lines | Tests | What It Does |
|--------|-------|-------|-------------|
| `security.ts` | ~250 | 15+ tests | Injection detection (12 patterns), sanitization, file validation, AI output validation |

### Provenance (P2)

| Module | Lines | Tests | What It Does |
|--------|-------|-------|-------------|
| `draft-provenance.ts` | ~150 | 5+ tests | Traces draft assertions to source facts |
| `source-provenance.ts` | ~120 | 5+ tests | Authoritative source + citation model |

### Factory (P3)

| Module | Lines | Tests | What It Does |
|--------|-------|-------|-------------|
| `workflow-factory.ts` | ~150 | 10+ tests | Validates definitions, resolves engines, loads packs |
| `domain-packs.ts` | ~180 | 2 tests | Pack registry + 8 composable pack interfaces |

---

## 5. Duplicated / Parallel Systems

### WorkflowState vs CP2000Case
- `WorkflowState` (workflow-runtime.ts) — used by production routes
- `CP2000Case` (cp2000-case.ts) — used by tests only
- These are parallel state objects with no bridge between them
- The route manages WorkflowState; the gold-standard modules expect CP2000Case

### Generic vs CP2000-Specific
| Capability | Generic (used by route) | CP2000-Specific (not connected) |
|-----------|------------------------|-------------------------------|
| Validation | `validateDraft()` from `draft-validator.ts` | `validateCP2000Draft()` from `cp2000-validation.ts` |
| Strategy | `recommendStrategies()` from `strategy.ts` | `generateCP2000Strategy()` from `cp2000-strategy.ts` |
| Contradiction | `detectContradictions()` from `contradiction.ts` | `analyzeCP2000Discrepancies()` from `cp2000-discrepancy.ts` |
| Evidence | (none — route has no evidence checklist) | `buildCP2000EvidenceChecklist()` from `cp2000-evidence.ts` |

---

## 6. Missing Capabilities

- **No validation blocking in state machine** — `canAdvance()` does not check `draftValidation.passed`
- **No security on document upload** — uploaded/pasted text flows directly to extraction
- **No PDF text extraction** — basic regex extraction from PDF streams (not reliable)
- **No case persistence** — all state in React useState, lost on refresh
- **No analytics/audit logging** — audit.ts module exists but not wired
- **No deployment config** — no wrangler.toml, nitro auto-generates
- **No CI/CD** — no GitHub Actions workflow

---

## 7. Test Status

```
Total: 490 tests
Pass:  490
Fail:  0
```

Test files:
- `cp2000-gold.test.mjs` — 40+ tests covering full gold-standard pipeline (in isolation)
- `cp2000-e2e.test.mjs` — end-to-end pipeline test (in isolation)
- `cp2000-hardening.test.mjs` — adversarial fixtures, edge cases
- `cp2000.test.mjs` — basic extraction tests
- `cp14.test.mjs` — 55 tests, CP14 full lifecycle including authority gates
- `security.test.mjs` — injection detection, file validation
- `workflow-catalog.test.mjs` — catalog validation
- `workflow-factory.test.mjs` — factory construction tests
- `workflow-factory-pipeline.test.mjs` — factory pipeline tests
- + 14 more test files

**Key gap:** Tests prove domain modules work, but there are no route-level integration tests that verify the production CP2000 route uses the gold-standard modules.

---

## 8. Build Status

- ✅ `npm run build` succeeds
- ✅ Produces Cloudflare Workers output (`dist/_worker.js`)
- ✅ Nitro auto-generates wrangler config
- ⚠️ No explicit `wrangler.toml` (auto-generated only)

---

## 9. Deployment Status

- Git remote: GitHub (`mycomind4-arch/notice-respond`)
- No Cloudflare deployment config found
- Build produces Workers-compatible output but no deploy script
- No evidence of production deployment (no deploy logs, no wrangler config)

---

## 10. Workflow Counts

### Master Registry (workflow-master-registry.ts)
- **Total:** 47 entries
- **Blueprint:** 41 (metadata only, no implementation)
- **Functional:** 5 (irs-notice, court-summons, agency-action, file-appeal, cp2000-response)
- **Authority:** 1 (cp14-response)

### Workflow Catalog (workflow-catalog.ts — production source of truth)
- **Total:** 6 entries
- **Functional:** 5
- **Authority:** 1

### Gap
The master registry has 47 entries but the catalog has only 6. The 41 blueprint entries exist as metadata for SEO/directory purposes but have no implementation.

---

## 11. Recommended Next Steps

### Phase 0: Fix CP2000 P0 Gaps (production safety)

1. **Enforce validation blocking** — Add `draftValidation.passed` check to `canAdvance()` for draft phase
2. **Connect two-pass validation** — Bridge WorkflowState → CP2000Case, call `validateCP2000Draft()` instead of generic `validateDraft()`
3. **Add security to upload** — Call `classifyContent()` + `validateTextInput()` before extraction

### Phase 1: Connect CP2000 P1 Intelligence (functional completeness)

4. **Show discrepancies** — Call `analyzeCP2000Discrepancies()`, render in extraction review
5. **Show evidence checklist** — Call `buildCP2000EvidenceChecklist()`, render in attachments phase
6. **Show deadline certainty** — Render `deadline.certainty` + `deadlineUrgency()`
7. **Use CP2000 strategy** — Replace `recommendStrategies()` with `generateCP2000Strategy()`

### Phase 2: Connect CP2000 P2 Intelligence (authority readiness)

8. **Show research sources** — Display `getCP2000ResearchPack()` sources
9. **Show draft provenance** — Call `buildDraftProvenance()`, display assertion-to-fact mapping
10. **Show fact source excerpts** — Add expandable source excerpt per fact

### Phase 3: Generalize Gold Standard

11. Extract shared platform capabilities from CP2000 (deadline engine, evidence lifecycle, contradiction engine, validation, findings, research provenance)
12. Make the workflow factory runtime-connected (validate definitions at startup)
13. Wire domain packs into the factory pipeline

### Phase 4: Mass Production

14. Build Phase A (IRS/tax) workflows using the factory
15. Continue through Phases B-I per the master plan

---

## 12. Architecture Diagram (Production Path)

```
User
  ↓
Route (cp2000-response.tsx)
  ↓
WorkflowState (workflow-runtime.ts)
  ↓
extractCP2000() (cp2000.ts)          ← pattern extraction
classifyNoticeType() (notice-type.ts) ← classification
  ↓
[DISCONNECTED: cp2000-discrepancy.ts]
[DISCONNECTED: cp2000-evidence.ts]
[DISCONNECTED: cp2000-strategy.ts]
[DISCONNECTED: cp2000-research.ts]
  ↓
generateCP2000Draft() (cp2000.ts)    ← template draft
  ↓
validateDraft() (draft-validator.ts) ← GENERIC validation only
[DISCONNECTED: validateCP2000Draft() (cp2000-validation.ts)]
  ↓
[NO BLOCKING ENFORCED — canAdvance() ignores validation result]
  ↓
Review checks
  ↓
MailingFunnel (mailing-funnel.tsx)
  ↓
POST /api/mail/response (server/api/mail/response.ts)
  ↓
MailMyPDF API (platform/mailmypdf.ts)
```

**The gap:** The gold-standard pipeline exists, is tested, and works — but it runs in test files only. The production route runs a simplified version that misses the two-pass validation, discrepancy analysis, evidence checklist, strategy, research, and security.
