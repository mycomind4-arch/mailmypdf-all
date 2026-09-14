# Step-Workflow Engine — Handoff to Continue Building Workflows

This is the operational handoff for the linear step-matter engine and its
component kit, built to replace one-off, single-page workflow forms with a
real multi-step matter experience (Intake → Documents → Analyze → Evidence →
Timeline → Draft → Review → Mail) — see the Contractor Dispute (Private
Office) and NOID Response (Immigration Mail) implementations as the reference
examples. Read this before adding another workflow or wiring another app.

This complements, and does not replace, [ADR-009](../decisions/ADR-009-workflow-runtime-boundaries.md):
each workflow here is still an explicit runtime registered by
`(vertical_id, workflow_id)`, owning its own step definitions, fields, and
readiness rules — the engine only standardizes the shared shell (stepper,
rail, persistence, approval gate) that ADR-009 says workflow pages "can share
... without presenting identical steps."

**Verification rule (same as [context/CURRENT_STATE.md](../../context/CURRENT_STATE.md)):**
this doc describes what was built and verified as of 2026-09-12. Before
relying on any claim below, check the actual files — this is a routing aid,
not proof.

## The three layers

1. **`packages/step-workflow`** — pure, app-agnostic engine. No React, no
   Supabase-specific config baked in beyond a `tablePrefix` parameter.
   - `step-workflow.ts`: types (`StepWorkflowDefinition`, `StepMatterState`,
     `StepStatus`, `ChecklistItemState`) and the pure reducer
     (`createStepMatterState`, `updateStepData`, `setChecklistItem`,
     `completeStep`, `approveMatter`, `getStepMatterProgress`). `completeStep`
     throws if you try to complete the step named in
     `definition.requiresApprovalBeforeStep` before `approveMatter` has run.
   - `step-matter-repository.ts`: the `StepMatterRepository` interface +
     `StepMatterOwnershipError`/`StepMatterVersionConflictError`.
   - `step-workflow-service.ts`: `StepWorkflowService` — thin
     optimistic-concurrency wrapper (`create/get/list/updateStepData/
     setChecklistItem/completeStep/approve`), constructed with a repository
     and a `Record<string, StepWorkflowDefinition>` registry.
   - `supabase-step-matter-repository.ts`: `SupabaseStepMatterRepository` —
     generic REST+RPC implementation. Construct with
     `{ supabaseUrl, serviceRoleKey, tablePrefix }`; it calls
     `${tablePrefix}_step_matters` / `${tablePrefix}_create_step_matter` /
     `${tablePrefix}_commit_step_state` under that Supabase project.

2. **`packages/workflow-ui`** — real React components, not the
   hyperscript-factory style of `packages/design-system` (which is unrelated
   and not used by these workflows). Ships `workflow-ui.css` with `--wf-*`
   custom properties defaulting to Private Office's palette — import it once
   per app in `__root.tsx` (see both apps' root routes for the exact line).
   Components: `StepShell`, `Stepper`, `StatusCard`, `ReadinessChecklist`,
   `NextActionCard`, `SummaryListCard`, `StatusPill`, `SectionCard`,
   `DataTable`, `FileList`, `Dropzone`, `RecommendedStepsRow`, `TimelineList`,
   `Field`/`TextField`/`TextArea`/`CheckboxField`.

3. **Per-app wiring** — each app that wants step workflows needs its own copy
   of these (they depend on that app's own Supabase project, auth, and
   Postgres schema — see "Wiring a new app" below):
   - `src/lib/server-function-auth.ts` — `accountAuthMiddleware`
   - `src/services/supabase-step-matter-repository.ts` — thin instantiation
     of the shared `SupabaseStepMatterRepository` with that app's
     `tablePrefix`
   - `src/lib/fns/step-matter.ts` — `createServerFn` wrappers
     (`createStepMatter`, `getStepMatter`, `listStepMatters`,
     `updateStepMatterData`, `setStepMatterChecklistItem`,
     `completeStepMatterStep`, `approveStepMatter`)
   - a Supabase schema addition for `<prefix>_step_matters` /
     `<prefix>_step_events` (RLS `select_own` policy, `security invoker` RPCs
     for create/commit — see either app's schema for the exact SQL to copy)
   - `src/domain/step-workflows/index.ts` — the app's
     `Record<string, StepWorkflowDefinition>` registry
   - `src/components/workflow-steps/registry.ts` — the app's
     `Record<string, WorkflowStepUiConfig>` UI registry
   - `src/components/matter-app-header.tsx` (Private Office only so far) —
     the authenticated-app masthead for matter pages, distinct from the
     marketing `SiteHeader`. Copy this pattern into any app that wants its
     matter pages to look like an app, not a marketing page.
   - `src/routes/matters/$matterId/$step.tsx` — one generic route component,
     `MatterStepPage`, that loads the matter, renders `StepShell` + rail, and
     dispatches to the step component registered for `(workflowId, step)`.
     Copy this file near-verbatim into a new app; it has no workflow-specific
     content.

## Adding a new workflow to an app that already has the engine wired

Both Private Office and Immigration Mail already have all of the above. To
add a workflow (e.g. a third workflow in either app, or your fourth
anywhere):

1. `src/domain/step-workflows/<id>.ts` — export a `StepWorkflowDefinition`
   (id, title, `steps: {id,label}[]`, optional
   `requiresApprovalBeforeStep`), plus a `get<Id>Readiness(matter)` function
   (the right-rail checklist, usually derived from the `intake` step's data —
   see `getContractorDisputeReadiness`/`getNoidResponseReadiness` for the
   pattern) and a `<id>MailingPackage` constant (the right-rail summary
   list).
2. Register it in that app's `src/domain/step-workflows/index.ts`.
3. `src/components/workflow-steps/<id>/{Overview,Intake,Documents,Analyze,
   Evidence,Timeline,Draft,Review,Mail}.tsx` — 9 files. `Overview` is a
   synthetic dashboard (not one of the stepper's steps); the other 8 map to
   `definition.steps`. Every component receives the exact same
   `StepComponentProps` (`matter, onUpdateData, onSetChecklistItem,
   onComplete, onApprove, goToStep`) — copy an existing step file for a
   workflow with similar shape and edit the fields/copy/tables, don't
   redesign the props contract.
4. `src/components/workflow-steps/<id>/index.ts` — barrel exporting
   `Record<string, ComponentType<StepComponentProps>>` keyed by step id
   (`overview`, `intake`, ..., `mail`).
5. Register the `{ stepComponents, getReadiness, mailingPackage }` triple in
   that app's `src/components/workflow-steps/registry.ts`.
6. Wire the entry point: the workflow's existing landing/marketing route gets
   a `startWorkflow()` handler that calls `createStepMatter({data:
   {workflowId}})` then navigates to `/matters/$matterId/$step` with
   `step: "intake"`. For Private Office's `WorkflowAuthorityPage`-based
   routes, pass the new `onStartWorkflow` prop instead of touching the shared
   component — see `routes/workflows/contractor-dispute.tsx`.

No changes to the engine packages, the route file, or any other workflow are
needed for this — that isolation is the point (and is what ADR-009 asks for).

## Wiring a new app that doesn't have the engine yet

Follow Immigration Mail's setup as the template (it was the second app, so
it's the cleaner "add to an app that has none of this yet" example — Private
Office's history has the engine's original, since-generalized code in it).
In order:

1. Confirm the app is on the standard build base
   (`@tanstack/react-start` + `@lovable.dev/vite-tanstack-config` + Nitro
   `cloudflare-pages`) — `claim-proof`, `permit-reply`, `small-business`, and
   `tenant-reply` are **not**, and are excluded from Studio's project tree
   for the same reason; don't wire the engine into them until they're
   rebuilt onto the standard base.
2. `package.json`: add `@mailmypdf/workflow-ui` and `@mailmypdf/step-workflow`
   as `workspace:*` dependencies; add a `build:shared` script that builds
   both packages before `dev`/`build` (both packages publish `main`/`types`
   pointing at `src/index.ts` for the TS language service, but their
   `exports.import` points at `dist/index.js` — Vite resolves through
   `exports`, so `dist` must exist before `vite dev` runs, exactly like the
   existing `@mailmypdf/core` etc. dependencies each app already builds
   first).
3. `pnpm install` from the repo root, then build both packages once
   (`pnpm --filter @mailmypdf/workflow-ui build && pnpm --filter
   @mailmypdf/step-workflow build`).
4. `src/lib/server-function-auth.ts` — copy Private Office's file, swapping
   in this app's own `./supabase` client and `./auth-guard`'s
   `requireAuthenticatedUser`. Confirm the app already has both of those (it
   almost certainly does — every vertical has its own Supabase client and an
   auth-guard module of some form); check the exact export names before
   copying, they differ slightly per app.
5. `src/services/supabase-step-matter-repository.ts` — instantiate
   `SupabaseStepMatterRepository` from `@mailmypdf/step-workflow` with this
   app's `tablePrefix` (pick something short and app-identifying, e.g.
   `immigration_mail`).
6. Supabase schema: add a new migration (check whether the app uses a single
   `supabase/schema.sql` like Private Office or a `supabase/migrations/`
   directory like Immigration Mail, and follow whichever convention exists)
   with `<prefix>_step_matters`, `<prefix>_step_events`, RLS, and the
   `<prefix>_create_step_matter` / `<prefix>_commit_step_state` RPCs. Copy
   Immigration Mail's `20260911_step_matters.sql` and rename the prefix — it
   already handles the case where `owner_id` is a real `uuid` column
   (`references auth.users(id)`) vs. Private Office's `text` column, so check
   which type this app's other tables use for owner/user id and match it.
7. `src/lib/fns/step-matter.ts` — copy verbatim from either app, no changes
   needed beyond the local imports.
8. `src/domain/step-workflows/index.ts`,
   `src/components/workflow-steps/registry.ts`,
   `src/routes/matters/$matterId/$step.tsx` — copy verbatim (empty
   registries to start).
9. `src/routes/__root.tsx` — add the `workflow-ui.css` import line next to
   the existing `design-system` CSS imports.
10. Now follow "Adding a new workflow" above for the app's first workflow.

## Gotchas actually hit while building this (read before you repeat them)

- **Node built-ins leaking into the client bundle.** Any file imported by a
  client component (which `scan-project-tree.ts`/`step-matter.ts`-style
  files are, transitively, via Studio or a route) must not
  top-level-`import` `node:fs`/`node:path`/`node:child_process` etc. —
  `createServerFn`'s handler body is stripped from the client bundle, but the
  *rest of the file* is not. Use `await import("node:fs")` etc. **inside the
  handler**, matching the existing `compound-matter.ts` pattern of
  dynamically importing service modules. This crashed the whole app on load
  the first time (see Studio's `scan-project-tree.ts` history) — TypeScript
  did not catch it; only the browser did.
- **`tsc --noEmit` passing is not sufficient verification.** A wrong import
  path (`@/lib/auth` instead of the actual `@/lib/use-auth` export) typechecked
  clean in this repo but threw a hard runtime error in the browser. Always
  load the actual page after a structural change, not just typecheck.
- **Node 20 + `@supabase/supabase-js` realtime client.** `createClient()`
  crashes SSR on Node <22 ("native WebSocket not found") the moment any
  workflow route imports the app's `supabase.ts`, even if realtime is never
  used. Fixed in both apps' `src/lib/supabase.ts` with a
  `(await import(/* @vite-ignore */ "ws")).default` fallback for the
  non-browser branch, gated so it never reaches the client bundle. If you add
  a third app, its `supabase.ts` almost certainly needs the same fix — check
  first before assuming it's fine.
- **Don't mint fake `publicPath`s when duplicating/copying a workflow whose
  target is a real, hardcoded file route** (Studio's "Duplicate" feature hit
  this — see `duplicateStudioWorkflow` in `studio.tsx`). A real TanStack file
  route can't be created by writing data; only by adding a file.
- **Viewport matters for visual QA.** `StepShell`'s sidebar and rail collapse
  under 960px width (see `workflow-ui.css`'s media query) — a narrow browser
  pane will make the layout look broken when it isn't. Resize to at least
  1440×1000 before comparing against a desktop mockup.
- **You cannot browser-verify a real matter route without a logged-in
  session** — `accountAuthMiddleware` gates every step-matter server
  function, same as every other mutation in these apps. For visual QA
  without a real login, use (or recreate) a dev-only, no-auth preview route
  like `apps/verticals/private-office/src/routes/dev/matter-preview.$step.tsx`
  — it builds a mock `StepMatterState` client-side and renders the real step
  components with no server calls. Delete it (or don't ship it) once you're
  done using it for a given workflow; it's not linked from anywhere in the
  real app on purpose.

## Current inventory (as of 2026-09-12)

| App | Workflow | Steps registered | Entry point |
|---|---|---|---|
| Private Office | `contractor-dispute` | 8 (+ Overview) | `/workflows/contractor-dispute` → creates matter → `/matters/<id>/intake` |
| Immigration Mail | `noid-response` | 8 (+ Overview) | `/noid` landing page → creates matter → `/matters/<id>/intake` |

Both apps have the full engine wired (steps 1–9 of "Wiring a new app" above
are already done for them) — only "Adding a new workflow" applies if you're
adding a second workflow to either.

## Known follow-ups (not done, flagged during the build)

- `MatterAppHeader`'s "My Matters" link points at `/dashboard` — there is no
  dedicated matter-list page yet. Build one and repoint it.
- Studio's "Local Drafts" feature and this engine's per-workflow matters are
  two separate persistence stories (Studio drafts are browser-localStorage;
  step matters are Supabase-backed) — don't conflate them.
- The dev-gateway vs. full-monorepo-merge question for Studio's multi-app
  preview is still open (deferred by the user) — irrelevant to this engine,
  but relevant if you're also touching Studio's project-tree preview for a
  new workflow's vertical.
- Image generation, GitHub repo access, SEO auditing, and uploaded
  design-reference retrieval as Claude tools (discussed for Studio) are not
  built — only the tool-call plumbing in `platform/llm-adapter.ts` exists,
  wired for Anthropic's web search tool only.
- `claim-proof`, `permit-reply`, `small-business`, `tenant-reply` remain on a
  non-standard build base and are out of scope for this engine until
  rebuilt.
