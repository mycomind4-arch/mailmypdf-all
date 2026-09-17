# Migration / Prune Ledger

Updated: 2026-09-16

This ledger prevents repeated rescanning of legacy donor trees. A subtree may be marked **deleted** only after its unique useful material has been migrated, generalized, preserved, or intentionally discarded.

| Donor subtree | Status | Destination / disposition | Verification |
|---|---|---|---|
| `apps/verticals/appeal-mail/docs/` | in progress | Distill durable Appeal Mail standards into top-level `appeal-mail/`; move workflow-specific gold/safety rules beside corresponding new workflows; discard stale production/deployment/provider assertions | Pending |
| `apps/verticals/appeal-mail/src/components/` | pending | Compare against `packages/design-system`, `packages/workflow-ui`, and new workflow folders | Not started |
| `apps/verticals/appeal-mail/src/domain/` | pending | Compare against `packages/workflows`, `packages/step-workflow`, and workflow-local config/schema | Not started |
| `apps/verticals/appeal-mail/src/platform/` | pending | Compare against shared document/payment/fulfillment/proof packages | Not started |
| `apps/verticals/appeal-mail/src/routes/` | pending | Extract reusable route/runtime behavior and workflow-specific execution requirements | Not started |
| `apps/verticals/appeal-mail/tests/` | pending | Preserve useful contract/acceptance fixtures in shared/new workflow tests before pruning | Not started |
| `apps/verticals/appeal-mail/public/` | pending | Preserve only useful unique assets; move canonical workflow imagery into new asset locations | Not started |
| `apps/verticals/appeal-mail/supabase/` | pending | Reconcile schema/migrations with active shared persistence architecture before pruning | Not started |

## Deletion gate

Before deleting any donor subtree:

- recursive inventory complete;
- unique behavior/material accounted for;
- destinations exist;
- relevant verification performed;
- ledger updated with what moved and what was intentionally discarded;
- no active import/runtime/build dependency still requires the donor path.

Git history remains the recovery mechanism after deletion; the working tree should not retain exhausted legacy copies.
