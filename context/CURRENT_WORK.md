# Current Work — MailMyPDF migration

Updated: 2026-09-23

## Execution architecture: step-workflow is the standard, not legacy

**Correction (2026-09-23):** earlier revisions of this file implied
`apps/verticals/**` was a pure content donor to be mined and then deleted, and
that its execution model was being replaced. That was wrong and led a session
to rebuild execution UI from scratch (bespoke one-off components per vertical:
`InsuranceAppealWorkflow`, `RecordsRequestWorkflow`, ad hoc secured-transactions
scaffolds) instead of reusing `@mailmypdf/step-workflow`, the package
`apps/verticals/**` was actually built on.

**`@mailmypdf/step-workflow` (`packages/step-workflow/`) is the standing
execution architecture and should be used for workflow execution UI going
forward, including new top-level workflows and ports from `apps/verticals/**`.**
It is not legacy. It already backs real execution today, including inside the
new top-level architecture — see `secured-transactions/shared/domain` and
`secured-transactions/workflows/secured-transaction-eligibility/start` for a
current example of `@mailmypdf/step-workflow` used inside a top-level workflow.

What IS legacy and being replaced is the `apps/verticals/**` **app shell**
(routing, page chrome, per-app SPA scaffolding) — not the step-workflow
domain/execution logic living inside it. When porting a vertical's workflow
out of `apps/verticals/**`:
- Reuse or adapt its `step-workflows/*.ts` `StepWorkflowDefinition` and
  associated step components — don't rebuild execution from scratch in a new
  one-off shared component.
- Rebuild only the app-shell/page/routing layer in the new top-level
  `<vertical>/workflows/<id>/` structure (`config.ts`/`seo.ts`/`schema.ts`
  landing page + a `start/` route that mounts the step-workflow UI).
- If a vertical's newer top-level workflows already used a bespoke shared
  component instead of step-workflow (appeal-mail's `InsuranceAppealWorkflow`,
  records-request's `RecordsRequestWorkflow`), that is itself now considered
  drift from the standard, not a pattern to keep copying to new workflows —
  flag it rather than propagate it further. Do not mass-migrate those existing
  workflows back without asking first; this note governs new work.

## Active user-directed architecture

For the current migration, **Appeal Mail's active target is the top-level `appeal-mail/` tree**.

- Active target: `appeal-mail/`
- Active reference workflow: `appeal-mail/workflows/appeal-ssdi-denial/`
- Shared cross-workflow capabilities remain in `packages/*`.
- `apps/verticals/appeal-mail/` holds real step-workflow execution logic to
  reuse (see note above) — not a pure discard-after-mining donor.

Older context files that still describe `apps/verticals/appeal-mail/` as canonical are stale for this migration and must not override this file or the user's current direction.

Do not extrapolate this Appeal Mail decision to another vertical without first verifying that vertical's current top-level migration tree and the user's latest direction.

## Current goal

Continuously mine the repository for useful code, tests, assets, workflow rules, design patterns, SEO/content, and execution behavior that should survive in the new architecture.

Work one donor subtree at a time:

1. Recursively inventory the subtree.
2. Compare it against the new top-level vertical and shared `packages/*`.
3. Classify every unique item as:
   - migrate to the new vertical,
   - generalize into a shared package,
   - preserve as a test/fixture/reference,
   - or discard as obsolete/stale/duplicated.
4. Migrate the useful material.
5. Verify the destination and any affected contracts.
6. Record the disposition in `context/MIGRATION_PRUNE_LEDGER.md`.
7. Delete the exhausted legacy donor subtree so it cannot be rescanned by mistake.

Never delete a donor subtree merely because similar files exist elsewhere. Account for unique implementation behavior, tests, assets, schemas, prompts, pricing rules, authority/safety rules, auth/ownership logic, payment/fulfillment behavior, and acceptance fixtures first.

## Appeal Mail target shape

```text
appeal-mail/
├── index.tsx
├── config.ts
├── assets/
└── workflows/
    └── <workflow>/
        ├── index.tsx
        ├── config.ts
        ├── schema.ts
        ├── seo.ts
        ├── assets/
        ├── start/
        └── workflow-specific resources as needed
```

Public workflow pages use reusable design-system scaffolding. Authenticated workflow execution should reuse shared workflow/runtime components rather than recreate a full shell per workflow.

## SSDI reference workflow

Current workflow:

`appeal-mail/workflows/appeal-ssdi-denial/`

Official SSA PDFs currently present:

- `forms/generated/ssa-561-u2.pdf`
- `forms/generated/ssa-3441.pdf`
- `forms/generated/ssa-827.pdf`

Treat these as source forms to preserve while the SSDI workflow is converted into the reusable execution architecture.

## Current prune pass

Started with `apps/verticals/appeal-mail/docs/` because it is non-runtime and can be exhausted safely. Durable design/workflow/SEO/safety rules are being distilled into the new Appeal Mail tree; stale production claims, old deployment claims, and superseded provider assumptions are not carried forward.

After docs, continue through the old Appeal Mail implementation in bounded clusters, prioritizing reusable workflow scaffolding and execution behavior before workflow-specific duplication. Per the correction above: "reusable execution behavior" for step-workflow-based code means porting the `step-workflows/*.ts` definitions and step components forward into the new top-level structure, not discarding them once their content has been read once.
