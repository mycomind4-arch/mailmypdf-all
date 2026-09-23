# Workflow UI standard — mandatory, not a suggestion

Every customer-facing case workflow MUST use this shell. Do not invent a
different layout. Do not "simplify" to a flat form. This was locked in
2026-09-15 after repeated drift back to plain forms mid-build — read this file
before writing a new workflow component, not after.

Ported 2026-09-22 from the `/Users/macdizzle/dev/mailmypdf-all` copy
(commit `38ffb88b`), with paths rewritten for this copy's layout: the app is
`mailmypdf/`, not `apps/mailmypdf/`, and the notice runtime now lives in
`packages/workflows` + `notice-respond/` rather than in the app.

## Canonical reference implementation

`notice-respond/shared/NoticeResponseWorkflow.tsx` is the reference: one shell
serving every Notice Respond workflow, driven by that workflow's profile. Copy
its structure. If in doubt, open it side by side with whatever you're building.

## Required components

Import from `@mailmypdf/workflow-ui` (the shell imports
`@mailmypdf/workflow-ui/workflow-ui.css` itself):

- `StepShell` — the page frame: breadcrumb + title/subtitle + stepper + two-column body (content + rail). Every workflow renders inside one `StepShell`, full stop.
- `StatusCard`, `ReadinessChecklist`, `NextActionCard`, `SummaryListCard` — the right rail, in that order, every time.
- `SectionCard` — every content block inside a step is a `SectionCard`, not a raw div.
- `Field`, `TextField`, `TextArea` — every form input.
- Buttons are `<button className="wf-btn wf-btn--primary">` / `wf-btn--outline`, not the shadcn `Button` component (that's for marketing/site chrome, not case workflows).

## Step granularity — this is the part that keeps getting skipped

Do not collapse a workflow into a generic 5-step Upload → Review → Facts →
Draft → Mail flow just because it's faster to reuse. Step count follows the
workflow's actual shape:

- Intake and Notice/Case Details are separate steps when there's real data to split across them (what the user reports vs. what the document says).
- If the workflow involves multiple distinct items, claims, allegations, or issues (CP2000's discrepancies, a summons's causes of action), give it a dedicated **Analysis** or **Evidence** step that itemizes them — one card per item, not a single paragraph.
- If there are multiple relevant dates or events, give it a dedicated **Timeline** step — don't bury dates in a text field.
- **Draft** and **Review** are always separate steps. Review is where validation findings live and where mailing gets blocked — never let a draft skip straight to Mail.
- **Mail** is always the last step.

There is no target step count. Use however many steps the workflow's real
structure requires: a genuinely simple one-fact notice might be 5, a
multi-claim dispute might be 8, something with several distinct evidence
categories and a multi-party timeline could legitimately be 12-14. Never pad to
hit a number, and never collapse distinct concerns to save a step. The test is:
does each step correspond to a real, separate thing the user needs to do or a
real, separate fact the system needs to capture?

## Validation-block gate — required, not optional

Every workflow must have a real gate before a draft can be approved for
mailing:

- Unresolved template placeholders are blocked for every workflow by the shared runtime itself: `findUnresolvedPlaceholders()` / `unresolvedPlaceholderMessage()` in `packages/workflows/src/draft-placeholders.ts`, enforced server-side at the packet and approval steps in `matter-runtime-server.ts`. A UI must surface this, and must never be the only thing checking it.
- Where the workflow has real structured facts to check (CP2000's discrepancies), run an actual two-pass validator (factual + requirement) and block on real findings, not just placeholders. See `packages/workflows/src/domain-packs/notice-response/cp2000-validation.ts`.

This exists because a real defect — an unresolved `[Your Name]` placeholder
silently treated as a valid signature — reached production before this standard
existed. Don't reintroduce it.

## Backend — reuse, don't reinvent

The real case/document/PDF/Stripe/Lob pipeline already exists. New-architecture
workflows talk to the generic runtime at `/api/workflow-runtime/**`
(`packages/workflows`' `createPlatformWorkflowRuntimeRequestHandler`, adapted to
this app's Supabase secure-core in
`mailmypdf/src/lib/secure-core/workflow-runtime-host.server.ts`). Adding a
Notice Respond workflow requires:

1. A profile in `packages/workflows/src/domain-packs/notice-response/profiles.ts` (response modes, evidence kinds, `analysisInstructions`/`draftInstructions`). That profile is also what `resolveCaseWorkflow()` reads server-side — do not hand-write a second definition.
2. A start component under `notice-respond/workflows/<id>/start/`, registered in `notice-respond/runtime.ts` and `mailmypdf/src/lib/workflow-start-registry.tsx`.
3. An `executionStatus: "executable"` record in `packages/workflows/src/workflow-execution-registry.ts`.
4. If it needs structured analysis beyond generic extraction, a domain module beside the CP2000 modules in the same domain pack.

A workflow outside the notice family still needs its own runtime policy and its
own input validation; do not reuse a notice policy for a non-notice workflow.

## Discoverability — a workflow that isn't in the catalog doesn't exist

A working route is not enough. Every shipped workflow needs an individually
authored authority record in `mailmypdf/src/lib/workflow-seo-entries/` (one
module per workflow, merged over the DRAFT topology in
`workflow-seo-catalog.ts`). Run `mailmypdf`'s `seo:authority:validate` script
and confirm the new entry passes before considering the workflow done. Sources
cited in the content must be verified live, not recalled from memory.

## Definition of done for one workflow

1. `StepShell`-based UI matching this standard, wired to the real runtime.
2. Real validation-block gate before mailing.
3. Catalog entry passes the authority gate at 85+/100, zero topology issues.
4. `tsc --noEmit` clean — no new errors against the stashed baseline.
5. Full test suite run, zero new failures against the stashed baseline.
6. Verified in a browser, not only by tests.
