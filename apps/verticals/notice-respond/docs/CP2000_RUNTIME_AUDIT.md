# CP2000 Runtime Audit

## Method

Every conclusion in this document was verified by tracing actual `import` statements and function calls in the production source code. No claims are based on filenames, previous agent reports, or documentation alone.

## Runtime Trace: What Actually Executes When a User Uploads a CP2000 Notice

### Production Entry Point

**File:** `src/routes/workflows/cp2000-response.tsx`

The CP2000 UI route is a React component using `@tanstack/react-router`. It manages state via `useState` and the `WorkflowState` type from `workflow-runtime.ts`.

### Actual Imports in the Production Route

| Module | Imported? | Purpose |
|--------|-----------|---------|
| `workflow-catalog.ts` | ✅ | Gets workflow definition metadata (SEO, steps, review checks) |
| `workflow-runtime.ts` | ✅ | Generic state machine (step navigation, upload, extraction, draft) |
| `notice-type.ts` | ✅ | `classifyNoticeType()` — classifies document type |
| `cp2000.ts` | ✅ | `extractCP2000()` + `generateCP2000Draft()` — extraction and draft template |
| `draft-validator.ts` | ✅ | `validateDraft()` — generic draft validation |
| `strategy.ts` | ✅ | `recommendStrategies()` — generic strategy suggestions |
| `contradiction.ts` | ✅ | `detectContradictions()` — contradiction detection |
| `missing-info.ts` | ✅ | `detectMissingInfo()` — missing info detection |
| `mailing-funnel.tsx` | ✅ | MailingFunnel component for checkout/mailing |

### Modules NOT Imported by the Production Route

| Module | Exists? | Tested? | Connected to UI? |
|--------|---------|---------|-------------------|
| `cp2000-case.ts` | ✅ | ✅ (unit + E2E tests) | ❌ NO |
| `cp2000-discrepancy.ts` | ✅ | ✅ (unit + E2E tests) | ❌ NO |
| `cp2000-evidence.ts` | ✅ | ✅ (unit + E2E tests) | ❌ NO |
| `cp2000-findings.ts` | ✅ | ✅ (via discrepancy) | ❌ NO |
| `cp2000-strategy.ts` | ✅ | ✅ (unit + E2E tests) | ❌ NO |
| `cp2000-research.ts` | ✅ | ✅ (unit + E2E tests) | ❌ NO |
| `cp2000-validation.ts` | ✅ | ✅ (unit + E2E tests) | ❌ NO |
| `cp2000-packs.ts` | ✅ | ❌ | ❌ NO |
| `finding.ts` | ✅ | ✅ (via hardening tests) | ❌ NO |
| `source-provenance.ts` | ✅ | ✅ (via hardening tests) | ❌ NO |
| `draft-provenance.ts` | ✅ | ✅ (via E2E tests) | ❌ NO |
| `workflow-factory.ts` | ✅ | ✅ (factory tests) | ❌ NO |
| `workflow-master-registry.ts` | ✅ | ✅ (factory tests) | ❌ NO |
| `domain-packs.ts` | ✅ | ❌ | ❌ NO |
| `security.ts` | ✅ | ✅ (security tests) | ❌ NO (used only by `analyze.tsx`) |

### Stage-by-Stage Trace

| Stage | Production Entry Point | Actual Function | Connected? | Persisted? | UI Exposed? | Tested E2E? | Gap |
|-------|----------------------|-----------------|------------|------------|-------------|-------------|-----|
| Document upload | `handleFileUpload` / `handlePasteText` | Raw file read + `extractCP2000()` | ✅ | In-memory only (React state) | ✅ Upload UI | ❌ E2E uses direct calls | No persistence |
| Classification | `handleFileUpload` / `handlePasteText` | `classifyNoticeType()` | ✅ | In `WorkflowState.extraction` | ✅ Shows type + confidence | ❌ E2E uses direct calls | — |
| Extraction | `handleFileUpload` / `handlePasteText` | `extractCP2000()` | ✅ | In React state + `WorkflowState` | ✅ Shows facts table | ❌ E2E uses direct calls | Facts shown but no source excerpts |
| Case creation | — | `createCP2000Case()` | ❌ NOT CALLED | N/A | ❌ | ✅ E2E only | Entire CP2000 case system is disconnected |
| Deadline analysis | `setExtraction()` | `extraction.deadlines[0]` set in `WorkflowState` | ⚠️ Partial | In `WorkflowState.deadline` | ❌ Not shown to user | ❌ | Deadline stored but NOT displayed; new deadline derivation not used |
| Discrepancy analysis | — | `analyzeCP2000Discrepancies()` | ❌ NOT CALLED | N/A | ❌ | ✅ E2E only | Critical gap — user never sees discrepancies |
| Contradiction detection | Inline computation | `detectContradictions()` | ✅ | Computed at render time | ✅ Shows in extraction review | ❌ | OK but uses old shared module |
| Missing info detection | Inline computation | `detectMissingInfo()` | ✅ | Computed at render time | ✅ Shows in extraction review | ❌ | OK but uses old shared module |
| Evidence analysis | — | `buildCP2000EvidenceChecklist()` | ❌ NOT CALLED | N/A | ❌ | ✅ E2E only | Critical gap — no evidence checklist in UI |
| Research | — | `getCP2000ResearchPack()` | ❌ NOT CALLED | N/A | ❌ | ✅ E2E only | Research sources never shown to user |
| Strategy (old) | Inline computation | `recommendStrategies()` | ✅ | Computed at render time | ✅ Shows strategy suggestions | ❌ | Uses generic strategy, not CP2000-specific |
| Strategy (new) | — | `generateCP2000Strategy()` | ❌ NOT CALLED | N/A | ❌ | ✅ E2E only | CP2000-specific strategy disconnected |
| Draft generation | `handleGenerateDraft()` | `generateCP2000Draft()` | ✅ | In `WorkflowState.draft` | ✅ Editable textarea | ❌ E2E uses direct calls | Template draft only |
| Draft provenance | — | `buildDraftProvenance()` | ❌ NOT CALLED | N/A | ❌ | ✅ E2E only | No provenance shown |
| Draft validation (old) | `handleGenerateDraft()` | `validateDraft()` | ✅ | In `WorkflowState.draftValidation` | ✅ Shows errors/warnings | ❌ | Uses generic validator, not CP2000 two-pass |
| Draft validation (new) | — | `validateCP2000Draft()` | ❌ NOT CALLED | N/A | ❌ | ✅ E2E only | BLOCK-level validation NOT enforced in UI |
| User review | Stepper navigation | `reviewChecks` array | ✅ | In `WorkflowState.reviewChecks` | ✅ Checkbox UI | ❌ | No BLOCK enforcement — user can proceed with validation errors |
| Approval | `canAdvance("review")` | `reviewChecks.every(Boolean)` | ✅ | In `WorkflowState.approved` | ✅ | ❌ | Only checks checkboxes — does NOT enforce draft validation passing |
| Mailing | MailingFunnel component | `MailingFunnel` | ✅ | In `WorkflowState.mailing` | ✅ | ❌ | Mailing can proceed even if draft validation failed |
| Tracking/proof | MailingFunnel | `MailingFunnelState` | ✅ | In React state | ✅ | ❌ | — |

### Critical Finding: Validation Does Not Block Mailing

The `canAdvance` function in `workflow-runtime.ts` checks:
- `"review"` phase: `reviewChecks.every(Boolean)` — only checks checkboxes
- There is NO check for `draftValidation.passed` or `draftValidation.blocked`

This means a user can:
1. Upload a CP2000 notice
2. Generate a draft with validation errors
3. Check all review checkboxes
4. Proceed to mailing without resolving validation errors

The new `validateCP2000Draft()` function has BLOCK-level findings that should prevent mailing, but it is never called by the production route.

### Critical Finding: No Discrepancy Analysis in UI

The `analyzeCP2000Discrepancies()` function detects amount mismatches, computes evidence needs, and generates findings. The UI route does not call this function. The user sees extracted facts and generic contradictions but never sees:
- What discrepancies were found
- What evidence is needed to resolve them
- What explanations are possible
- Which findings are high/critical severity

### Critical Finding: No Evidence Lifecycle in UI

The `buildCP2000EvidenceChecklist()` function creates an evidence checklist with states (missing, provided, extracted, verified, rejected). The UI route does not call this function. The "Attachments" phase shows a static file upload widget and lists `definition.evidence` from the catalog, but does not show:
- Which evidence items are required vs recommended
- Which evidence items are still missing
- Which evidence items relate to specific discrepancies
- Evidence state transitions

### Critical Finding: No Research/Source Display

The `getCP2000ResearchPack()` function returns 7 verified IRS sources with URLs, descriptions, and topic coverage. The UI route does not call this function. The user never sees:
- Authoritative IRS sources relevant to their situation
- Source citations that should appear in the response
- Taxpayer rights information

### Critical Finding: Two Parallel Systems

The production route uses the **old/shared** system:
- `validateDraft()` from `draft-validator.ts` — generic validator checking required sections, fact matching, forbidden behaviors
- `recommendStrategies()` from `strategy.ts` — generic strategy by notice type
- `WorkflowState` from `workflow-runtime.ts` — generic state machine

The new **CP2000-specific** system (tested in E2E but disconnected):
- `createCP2000Case()` — dedicated CP2000 case state
- `validateCP2000Draft()` — two-pass validation (factual + requirement) with BLOCK level
- `generateCP2000Strategy()` — discrepancy-aware strategy
- `buildCP2000EvidenceChecklist()` — evidence lifecycle
- `analyzeCP2000Discrepancies()` — discrepancy detection
- `getCP2000ResearchPack()` — authoritative sources

These two systems are completely separate. The new system is more capable but is not wired into the product.

### State Persistence

All workflow state is in-memory only (React `useState`). There is no persistence layer for CP2000 cases. If the user refreshes the page, all state is lost. The `case-repository.ts` module exists but is not used by the route.

### Security

The CP2000 route does NOT use the `security.ts` module. The `analyze.tsx` route does use `classifyContent()`, `wrapDocumentForAI()`, and `validateTextInput()`. The CP2000 route:
- Does not classify uploaded document trust level
- Does not wrap document text for AI processing
- Does not validate text input for injection attempts
- Stores raw document text in React state (in-memory only, not logged)
- Does not redact SSNs or account numbers from displayed text
