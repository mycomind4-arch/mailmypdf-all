---
name: port-workflow
description: Port a legacy step-workflow-based workflow from apps/verticals/<vertical>/ into the new top-level <vertical>/workflows/<id>/ architecture, with real working execution (not a landing-only stub). Use when asked to "port", "migrate", "mount", or "bring forward" a workflow from the old app shells into the new architecture.
---

# Port a legacy workflow into the new architecture

Ground truth as of 2026-09-23, re-derived the hard way this session — read
`context/CURRENT_WORK.md`'s "Execution architecture: step-workflow is the
standard, not legacy" section first, it governs this skill.

**The standard**: execution UI uses `@mailmypdf/step-workflow`
(`packages/step-workflow/`), reusing the legacy `step-workflows/*.ts`
`StepWorkflowDefinition` and its step components. Do NOT invent a new bespoke
one-off React component (`InsuranceAppealWorkflow`, `RecordsRequestWorkflow`,
`NoticeResponseWorkflow`, and the various `secured-transactions` scaffolds are
all past mistakes of exactly this kind — flagged for later consolidation, not
patterns to copy). The one existing example that already does this correctly
in the new architecture: `secured-transactions/workflows/secured-transaction-eligibility/`
— read it before starting each port.

## Step 1 — Confirm the workflow isn't already done

A directory existing at `<vertical>/workflows/<id>/` does NOT mean the
workflow works. This repo has repeatedly had landing-only mounts (`config.ts`/
`seo.ts`/`schema.ts`/`index.tsx` present, `start/` empty except `.gitkeep`, or
`start/` present but referencing a route that was never wired into
`mailmypdf/src/routes/`). Check:
- Does `<vertical>/workflows/<id>/start/` contain more than `.gitkeep`?
- Does `mailmypdf/src/routes/<vertical>/workflows/<id>/start/index.tsx` exist
  and actually resolve (see Step 4 — a broken mount can exist and still be
  invisible in `git log` claims)?
- Grep `packages/workflows/src/workflow-execution-registry.ts` for the id —
  presence there is NOT proof of real execution, it only means a
  `manifest.ts` + `start/index.tsx` file exist somewhere, which can itself be
  a stub.

If genuinely unmounted/unbuilt, continue.

## Step 2 — Read the legacy source completely before writing anything

For workflow id `<id>` in vertical `<v>`:
- `apps/verticals/<v>/src/domain/step-workflows/<id>.ts` — the
  `StepWorkflowDefinition` (steps, `requiresApprovalBeforeStep`). Read every
  comment. Legacy files in this repo often contain hard-won, source-verified
  facts (addresses, phone numbers, legal citations) with corrections of
  previously-wrong data documented inline — preserve these exactly, never
  "helpfully" adjust or re-derive them from general knowledge.
- Any shared domain file the step-workflow imports (e.g. a
  `<domain>.ts` with draft-generation logic, config maps, etc.).
- `apps/verticals/<v>/src/components/workflow-steps/<id>/` — the step UI
  components. Port/adapt these; don't rewrite from scratch.
- `apps/verticals/<v>/src/routes/workflows/<id>.tsx` — shows how the step
  components + step-workflow service were wired into a page. Use as the
  wiring reference.
- `apps/verticals/<v>/tests/<id>.test.mjs` (or `.test.ts`) — port the
  meaningful assertions, especially verified facts, into new tests.

## Step 3 — Build the new top-level directory

`<v>/workflows/<id>/`:
- `config.ts` — landing page content (`WorkflowLandingConfig`). Port real
  content from the legacy files (`workflow-catalog.ts`, `workflow-seo.ts`,
  `workflow-prompts.ts` if present) — do not invent FAQs, addresses, or
  process descriptions not already sourced somewhere.
- `seo.ts`, `schema.ts` — mirror an existing working example's shape (e.g.
  `notice-respond/workflows/cp14-response/`).
- `index.tsx` — `WorkflowLandingPage` wired to `config`/`seo`/`schema`
  (copy the shape of any existing working landing page verbatim, only the
  imports change).
- `start/` — mount the ported step-workflow definition and step components,
  following exactly how `secured-transactions/workflows/secured-transaction-eligibility/start/`
  does it.

## Step 4 — Mount into `mailmypdf/src/routes/` (the part everyone gets wrong)

TanStack Router's file-based codegen scans `mailmypdf/src/routes/**` and
builds the route tree from files where `createFileRoute(...)` is called
**directly in the scanned file**. Confirmed empirically this session:

- A re-export (`export { Route } from "../../../../../../<v>/workflows/<id>/index"`)
  is **silently dropped** — no build error, no tsc error pointing at the
  re-export, the route just never exists. `grep` the built
  `mailmypdf/src/routeTree.gen.ts` for the path after building to confirm it's
  actually there — don't trust a clean `tsc` run alone as proof.
- Every mount file must call `createFileRoute()` itself, importing only the
  config/component/data it needs from the top-level vertical directory.
- Relative path depth: `mailmypdf/src/routes/<v>/workflows/<id>/index.tsx` is
  6 directories deep from repo root → needs exactly `../../../../../../` (6
  ups) to reach `<v>/workflows/<id>/...`. The `start/index.tsx` sits one
  level deeper → needs 7 ups (`../../../../../../../`). Verify by literally
  resolving the path (`python3 -c "import os; print(os.path.normpath(...))"`
  or `ls` the resolved path) — don't count by eye, this exact off-by-one
  broke 3 workflows in production-claimed code before this session caught it.
- The route id passed to `createFileRoute()` must end with a trailing slash
  for both the landing and start routes (`"/<v>/workflows/<id>/"` and
  `"/<v>/workflows/<id>/start/"`), matching the working CP14 example — a
  missing trailing slash produces a `TS2345 ... not assignable to
  FileRoutesByPath` error after the route tree regenerates.
- If the legacy component only has a default export (no named `Route`), the
  mount file imports the default and wraps it: `createFileRoute(path)({
  component: DefaultImport })`. If it's a generic shared component taking a
  config prop, import the component + local `config`/`manifest` directly and
  construct the props inline (see `mailmypdf/src/routes/appeal-mail/workflows/appeal-ssdi-denial/start/index.tsx`
  after this session's fix for the "default export" case, and
  `.../appeal-car-insurance-claim/start/index.tsx` for the "shared component
  + workflow config" case, as concrete examples — read them, don't
  reconstruct from memory).

## Step 5 — Server-side resolver

`mailmypdf/src/lib/secure-core/workflow-runtime.ts` → `resolveCaseWorkflow()`.
If the vertical has no `if (verticalId === "<v>") { ... }` block yet, add one
following the `secured-transactions` block as a template (~line 343 as of
2026-09-23). `analysisInstructions`/`draftInstructions` must say to use only
confirmed facts — never let the model infer domain-specific facts (addresses,
deadlines, legal citations) that should come from your ported data instead.

## Step 6 — Verify for real, every time

Never report success without running these and reading the actual output:

```bash
cd mailmypdf && npx vite build            # must exit 0
grep -c "<v>/workflows/<id>" src/routeTree.gen.ts   # confirms routes registered
npx tsc --noEmit -p .                      # compare error count to baseline BEFORE your change
```

Run the relevant test suite (`pnpm --filter @mailmypdf/workflows test`, or
whatever covers the touched packages) and read real pass/fail counts.

## Step 7 — Record it honestly

Append a dated entry to `context/FACTORY_STATUS.md` naming exactly what ran
and its real output, and explicitly say what wasn't verified (e.g. no browser
render, no signed-in journey) rather than implying full verification. This
repo has a documented history of status entries claiming "tsc clean, build
succeeds" for mounts that were actually broken — don't repeat it.
