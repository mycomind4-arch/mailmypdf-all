# Notice Respond — Agent Guide

## What This Repo Is
Notice Respond is a MailMyPDF vertical for responding to government and administrative notices.
Users upload a notice, the system analyzes it, helps them understand what's being demanded,
identifies deadlines, surfaces evidence and contradictions, and prepares a professional response
that can be mailed with proof of delivery.

## Constraints
- Do NOT touch `mailmypdf-platform` repo.
- Do NOT use sub-agents.
- Work ONLY in this repository (`notice-respond`).
- Use `appeal-mail` as a sophistication benchmark but do NOT copy its code blindly.
- Notice-specific domain knowledge stays in Notice Respond, not in shared platform code.

## Tech Stack
- Vite + React + TanStack Router + TanStack Start
- Cloudflare Pages (Nitro preset)
- Zod for schema validation
- pdf.js for client-side PDF text extraction
- MailMyPDF API for physical mailing

## Build Commands
- `npm run dev` — dev server
- `npm run build` — production build
- `npm test` — run tests (`node --test tests/*.test.mjs`)
- `npm run verify:launch` — tests + build

## Architecture (Current)

```
src/
  domain/                   — Notice-specific domain models and intelligence
    workflow-catalog.ts     — ★ Single source of truth for all workflows (18 workflows)
    workflow-runtime.ts     — State machine: createWorkflowState, advanceStep, canAdvance
    workflow-adapter.ts     — Legacy adapter (workflows.ts re-exports from catalog)
    draft-validator.ts      — Independent validation pass on generated drafts
    notice-type.ts          — Classification patterns for auto-detecting notice type
    cp2000.ts               — CP2000-specific extraction & draft generation
    notice.ts               — Central Notice object with facts, deadlines, analysis
    fact.ts                 — Extracted facts with provenance
    deadline.ts             — Deadline intelligence
    evidence.ts             — Evidence model with exhibit indexing
    finding.ts              — Analysis findings (contradictions, gaps, issues)
    readiness.ts            — Case readiness assessment
    strategy.ts             — Response strategy options
    response.ts             — Response generation
    proof.ts                — Proof packet for mailed response
    mailing.ts              — Mailing types
  platform/                 — Platform adapters and server functions
    notice-extraction.ts    — Pattern-based extraction from notice text
    text-extraction.ts      — Client-side PDF/image text extraction
    extract-fn.ts           — Server function for extraction
  components/               — Shared UI components (workflow-shell, site-header, etc.)
  routes/                   — Page routes
    workflows/              — Interactive workflow pages
      irs-notice.tsx        — Generic IRS workflow (form-based, uses runtime)
      cp2000-response.tsx   — CP2000 workflow (auto-extraction + interactive review)
    tax-notice.tsx         — Tax notice (LLM analysis + draft generation)
    code-enforcement.tsx   — Code enforcement notice (LLM analysis + draft generation)
    permit-correction.tsx  — Permit correction notice (LLM analysis + draft generation)
    dmv-notice.tsx         — DMV notice (LLM analysis + draft generation)
    ssa-notice.tsx         — SSA notice (LLM analysis + draft generation)
    uscis-notice.tsx        — USCIS notice (LLM analysis + draft generation)
    benefits-notice.tsx    — Benefits notice (LLM analysis + draft generation)
      cp2000-seo.tsx        — SEO landing page for CP2000
tests/                      — Test files (994 tests, 992 passing)
agent/                      — Agent recovery state
```

## Key Architectural Decisions

### Catalog-Driven Workflows
`workflow-catalog.ts` is the single source of truth. It defines:
- Workflow steps (id + label)
- UX config (reviewChecks, requiredSections, disclaimerText)
- SEO metadata (title, description, keywords, FAQs, OpenGraph)
- Validation rules (minDraftLength, requireReviewChecks, requireMailing)

`workflows.ts` is a thin adapter that re-exports from the catalog for backward compatibility.

### Workflow Runtime
`workflow-runtime.ts` provides a state machine:
- `createWorkflowState(def)` → initial state at step 0
- `advanceStep` / `retreatStep` / `goToStep` → navigation
- `canAdvance(state, def)` → gating (facts required, objective required, draft non-empty, review checks all checked, recipient address complete)
- State includes: step, phase, userFacts, userObjective, draft, draftValidation, reviewChecks, mailing

### Draft Validator
`draft-validator.ts` performs an independent validation pass:
- Checks required sections appear in draft (literal substring match)
- Checks fact values appear in draft
- Checks amounts, dates, notice numbers match expectations
- Checks minimum draft length
- Checks for forbidden phrases ("I don't know", "I can't")
- Returns `{ passed, errors, warnings, findings }`

### Notice Classification
`notice-type.ts` classifies notice text using regex patterns:
- Specific types (CP2000, CP14, CP504) get +0.3 confidence boost
- Generic types (irs_letter, agency_action, other) are filtered out when any specific type matches
- This prevents "IRS" in a CP2000 notice from classifying as generic `irs_letter`

### CP2000 Domain Logic
`cp2000.ts` provides:
- `extractCP2000(text)` — extracts notice number, tax year, deadline, reported/IRS-reported income
- `classifyCP2000(text)` — confirms text is a CP2000 notice
- `generateCP2000Draft(params)` — generates response letter with section headers matching validator expectations
- Income extraction requires `$` signs to avoid matching form numbers (W-2, 1099)

## Workflow Factory Rules
- Every workflow owns a coherent search-intent cluster, not just a keyword landing page.
- A workflow definition is the future source of truth for SEO metadata, document inputs, deadlines, requirements, evidence, analysis, drafting, submission, and proof.
- `blueprint` means planned/incomplete; `functional` means usable with the current product; `authority` means the full quality gate has been validated.
- Do not label an unfinished workflow authority-grade.
- Migrate existing routes incrementally; do not break working workflows merely to adopt the new definition contract.
- See `WORKFLOW_FACTORY.md` for the full model and step-by-step guide to adding new notice types.

## Recovery Files
- `agent/CHECKPOINT.md` — Last completed milestone
- `agent/NEXT_ACTION.md` — What to do next
- `agent/SESSION_STATE.json` — Machine-readable state

## Test Status
- 237 tests across 67 test files, all passing
- 27 CP2000 end-to-end tests (extraction, classification, draft, validation, state transitions)
- Build succeeds with `npm run build`
