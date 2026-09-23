# MailMyPDF Current State

This is a compact operational snapshot, not a substitute for verification. Update it after material changes.

**Snapshot assembled:** 2026-09-22  
**GitHub main inspected:** `ad6534a49ee574ab65dbd0a133f5e9a9e3d742d9`

## Canonical topology

- `mailmypdf/` — active host application.
- Root section trees — active destination for section/workflow implementation, including `appeal-mail/`, `notice-respond/`, `records-request/`, `immigration-mail/`, and `secured-transactions/`.
- `packages/*` — shared platform capabilities and reusable contracts.
- `apps/verticals/*` — legacy donor/reference implementations while migration is incomplete. Do not add new production behavior there unless a specific migration task explicitly requires preserving donor behavior before extraction.
- One public host with path-based section routing remains the intended deployment model.

The current root `pnpm-workspace.yaml` still includes `apps/verticals/*`. That means legacy donors may still participate in workspace/Turbo commands and acceptance infrastructure. This is a migration compatibility fact, not evidence that the legacy tree is canonical. Remove a donor from active workspace/build participation only after its migration/prune gate is satisfied.

## Verification/build state

A fresh clean-checkout full monorepo build is **not currently certified** by this snapshot. `context/FACTORY_STATUS.md` records an open P2 item for clean-checkout build integrity, including package-build/output issues. Do not claim production readiness from older build baselines.

The repository has focused tests and acceptance coverage for several migrated workflows, but coverage is uneven. Treat a workflow as executable or production-ready only when its real runtime path, ownership boundaries, persistence, generated output, approval/payment/fulfillment path, and applicable acceptance checks have been verified.

## Workflow/runtime migration

The new top-level workflow architecture is present alongside legacy donors. Shared workflow infrastructure under `packages/workflows` includes manifest/factory contracts, capability and runtime-policy registries, execution metadata, and related tests. `packages/workflow-acceptance` provides reusable acceptance infrastructure, but some registered/reference acceptance flows still point into `apps/verticals/*` and must be migrated before those donor paths can be deleted.

The active migration rule is: mine useful donor behavior into the root section or a shared package, verify the destination, record the disposition in `context/MIGRATION_PRUNE_LEDGER.md`, then prune the exhausted donor.

## Step-workflow engine

A generic linear step-matter engine (`packages/step-workflow`) and component kit (`packages/workflow-ui`) exist for multi-step matter workflows. New workflow execution should reuse shared runtime/UI contracts rather than recreate independent application shells per section.

## Related systems

- FairProcess 2.0 is independently implemented with evidence, timeline, findings, parcel intelligence, and due-process rule analysis.
- Ruthless Investigator has an investigation-council architecture centered on evidence lineage, competing hypotheses, adversarial analysis, and uncertainty.
- Advanced Search provides multimodal public/authorized-source investigation and evidence-search capabilities.

These may integrate through explicit shared/service boundaries; they are not alternate canonical MailMyPDF section trees.

## Verification rule

For any task that depends on present runtime truth, inspect the current branch and affected tests/configuration. Treat this snapshot as a routing aid, not proof.

## Next state-maintenance action

Keep `CURRENT_WORK.md`, `MASTER.md`, and `REPO_MAP.md` aligned with the active top-level migration. When a donor subtree becomes fully exhausted and its prune gate is verified, remove its obsolete workspace/build references and update this snapshot.
