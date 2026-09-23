# MailMyPDF agent operating instructions

## HARD RULE: workflow execution UI is @mailmypdf/step-workflow, no exceptions

Before writing or touching ANY workflow's `start/` execution UI, run:
`node scripts/check-step-workflow-execution.mjs`

This is not a suggestion. Building a new bespoke one-off React component for
workflow execution (a new `InsuranceAppealWorkflow`-shaped thing, a new
`NoticeResponseWorkflow`-shaped thing, a new generic "scaffold" component,
etc.) instead of reusing `@mailmypdf/step-workflow` (`packages/step-workflow/`)
is the single most repeated, most expensive mistake in this repo's history —
multiple sessions each independently reinvented execution instead of reusing
what already existed, burning real usage on duplicate work. The user has
said this directly, more than once, in strong terms. Do not repeat it.

- Porting a legacy `apps/verticals/<vertical>/src/domain/step-workflows/<id>.ts`
  workflow into the new top-level architecture, or building ANY new workflow's
  execution UI: use the `port-workflow` skill (`.claude/skills/port-workflow/SKILL.md`)
  if available, or read it directly — it has the exact procedure, including
  route-mounting gotchas that have broken "verified" code before.
- `secured-transactions/workflows/secured-transaction-eligibility/` is the one
  existing example that already does this correctly — read it as the pattern.
- If you find yourself about to `import` or copy-paste from any of
  `InsuranceAppealWorkflow.tsx`, `NoticeResponseWorkflow.tsx`,
  `RecordsRequestWorkflow.tsx`, `SecuredTransactionWorkflowStartScaffold.tsx`,
  or write a new component shaped like them — STOP. Those are past mistakes,
  not the pattern (see `context/CURRENT_WORK.md`, "Execution architecture:
  step-workflow is the standard, not legacy"). They are flagged for
  consolidation onto step-workflow, not for further copying.
- `scripts/check-step-workflow-execution.mjs` enforces this mechanically: it
  scans every `<vertical>/workflows/*/start/` directory and fails if a
  workflow NOT on its explicit legacy allowlist doesn't import
  `@mailmypdf/step-workflow`. Run it before considering any new workflow
  "done." If it fails on something you just built, fix the build, not the
  allowlist. If it fails on something pre-existing you didn't touch, that's
  a known item for the step-workflow consolidation effort — leave the
  allowlist entry alone unless you are the one doing that consolidation.

This rule is designed to survive being read out of context or after this file
goes stale elsewhere: even if every other word of this file rots, the script
above is the source of truth and will fail loudly rather than silently drift.

## Product objective

Build one dependable MailMyPDF application and a supervised workflow factory.
Customers must be able to discover a workflow, authenticate without losing their
destination, start or resume an owned matter, prepare evidence and documents,
review and approve the exact output, pay, mail, track, and retain proof.
Public visitors, authenticated users, and administrators require intentional,
consistent shells and server-enforced access boundaries throughout the ecosystem.
Studio coordinates Codex/Claude work and verifies real workflow/PDF outcomes.
The intended factory starts with a user's problem, composes a private matter plan,
and proposes privacy-reviewed reusable templates. Read
`context/PROBLEM_TO_WORKFLOW.md` when working on factory architecture or discovery.

## Required starting context

Read `context/CURRENT_WORK.md` first, then `context/FACTORY_STATUS.md`, then the relevant sections of `context/MASTER.md`
and applicable nested instructions. Inspect actual code and git status before
editing. Old chat reports, commit counts, and archive tags are evidence to examine,
not proof that a feature is missing, integrated, or production-ready.

Building or touching any customer-facing case workflow (IRS notices, court
filings, or any workflow like them) requires reading `context/WORKFLOW_UI_STANDARD.md`
first. It is mandatory, not a style suggestion — it exists specifically because
past sessions kept drifting back to plain forms mid-build.

## Workspaces and preservation

- Separate working copies (clones) are allowed, e.g. `/Users/macdizzle/dev/mailmypdf-all`
  and `/Users/macdizzle/dev/mailmypdf-all-main`. Each copy works on `main`.
- Copies do not share state. Before relying on another copy's work, or before
  pushing, fetch `origin` and reconcile the actual differences; never assume a
  commit made in one copy exists in another.
- Do not create branches or worktrees unless the user asks.
- Serialize changes within a single copy. Do not launch the existing worktree-based
  swarm until its architecture is reconciled with this constraint or the user changes it.
- Preserve user changes and archival tags. No resets, force pushes, bulk deletion,
  or whole-file conflict choices without reviewing the actual differences.
- GitHub synchronization is separate from verification. Push only within the
  current task's authorization and after reviewing the diff and relevant checks.

## Systematic repair loop

1. Select the highest-priority open item in `context/FACTORY_STATUS.md` that fits
   the user's current request. P0 security precedes P1 broken journeys, then P2
   consistency and P3 polish. Finish a bounded item before opening another.
2. Identify its shared root cause and a concrete failing journey/check.
3. Make the smallest durable repair, retaining useful later improvements.
4. Run focused regression checks. For UI changes inspect the actual browser;
   for PDF changes run the acceptance engine and inspect the generated PDF.
5. Recheck the integrated working tree and affected neighboring journeys.
6. Record files, command/result, limitations, and next item in the status file.
   Commit verified changes separately. Never call an unrun check a pass.

## Completion and cost controls

- Distinguish: implemented, locally verified, environment-blocked, and production-verified.
- A build, route file, agent success message, or simulated payment does not establish
  customer readiness. Missing tests are missing coverage, not successful acceptance.
- Preserve human approval, ownership, source provenance, payment idempotency,
  and exact-document approval boundaries. Do not weaken them to make tests pass.
- Use targeted file reads/tests; broaden only for a demonstrated dependency or failure.
- Do not run paid model swarms, real mailing, live payment, or deployment as a test.
- Explain genuine blockers with evidence; do not leave a broad success claim when
  requested work or acceptance criteria remain unfinished.
