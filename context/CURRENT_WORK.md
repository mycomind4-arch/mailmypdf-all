# Current Work — MailMyPDF migration

Updated: 2026-09-16

## Active user-directed architecture

For the current migration, **Appeal Mail's active target is the top-level `appeal-mail/` tree**.

- Active target: `appeal-mail/`
- Active reference workflow: `appeal-mail/workflows/appeal-ssdi-denial/`
- Shared cross-workflow capabilities remain in `packages/*`.
- Legacy donor for Appeal Mail: `apps/verticals/appeal-mail/`

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

After docs, continue through the old Appeal Mail implementation in bounded clusters, prioritizing reusable workflow scaffolding and execution behavior before workflow-specific duplication.
