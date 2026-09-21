# Migration / Prune Ledger

Updated: 2026-09-16

This ledger prevents repeated rescanning of legacy donor trees. A subtree may be marked **deleted** only after its unique useful material has been migrated, generalized, preserved, or intentionally discarded.

| Donor subtree | Status | Destination / disposition | Verification |
|---|---|---|---|
| `apps/verticals/appeal-mail/docs/` | **deleted** | Migrated durable rules to `appeal-mail/WORKFLOW_STANDARD.md`, `appeal-mail/DESIGN_STANDARD.md`, `appeal-mail/SEO_STRATEGY.md`, and workflow-local standards for SSDI/denied-claim. Administrative authority/safety rules were absorbed into the shared Appeal Mail standard. Discarded stale production/deployment/Gemini-default/retired pricing assertions. | All 12 donor docs were inventoried; repo search found no references to their filenames; donor files deleted 2026-09-16. |
| `apps/verticals/appeal-mail/src/components/` | in progress | Shared `StepComponentProps` / `WorkflowStepUiConfig` extracted to `packages/workflow-ui/src/WorkflowStepRegistry.ts`; Appeal Mail step components/registry now consume the shared contract; local `workflow-steps/types.ts` deleted. Continue mining remaining shells/workspaces/views for reusable behavior. | Shared contract created/exported; Appeal Mail duplicate type file deleted 2026-09-16. |
| `apps/verticals/appeal-mail/src/domain/` | pending | Compare against `packages/workflows`, `packages/step-workflow`, and workflow-local config/schema | Not started |
| `apps/verticals/appeal-mail/src/platform/` | pending | Compare against shared document/payment/fulfillment/proof packages | Not started |
| `apps/verticals/appeal-mail/src/routes/` | pending | Extract reusable route/runtime behavior and workflow-specific execution requirements | Not started |
| `apps/verticals/appeal-mail/tests/` | pending | Preserve useful contract/acceptance fixtures in shared/new workflow tests before pruning | Not started |
| `apps/verticals/appeal-mail/public/` | pending | Preserve only useful unique assets; move canonical workflow imagery into new asset locations | Not started |
| `apps/verticals/appeal-mail/supabase/` | pending | Reconcile schema/migrations with active shared persistence architecture before pruning | Not started |
| `apps/verticals/private-office/` Studio authoring surface | **migrated out of vertical** | Removed the duplicate Studio route, local Studio API routes, local machine file scanners, GitHub/Cloudflare adapters, and Studio-only authoring domain files. The preserved Studio implementation is now the MailMyPDF-side copy under `mailmypdf/src/studio`, with the admin UI under `mailmypdf/src/components/admin-studio.tsx`. Private Office keeps its customer matter runtime and published workflow preview contract. | Private Office build passed after route-tree regeneration on 2026-09-21; pre-migration archive and SHA-256 manifest at `/Users/macdizzle/.codex/vertical-migration-backups/2026-09-21-pre-migration/`. |
| `/Users/macdizzle/dev/mailmypdf-all/apps/mailmypdf/src/lib/cp2000/` | in progress | Migrated the reusable CP2000 discrepancy/finding analysis, dynamic evidence checklist, source/fact-separated research pack, independent draft validation, user-selected response strategy planner, and top-level draft-generation wiring into `packages/workflows/src/domain-packs/`; findings now carry declared authority IDs and generated drafts return independent validation results. Remaining source behavior—UI presentation and acceptance fixtures—still requires review before any pruning. | Workflows package: 165 tests passed; focused top-level workflow-runtime tests: 12 passed; filtered top-level typecheck has only the pre-existing generated-route mismatch in `notice-respond/workflows/cp2000-response/start/index.tsx`. |

## Deletion gate

Before deleting any donor subtree:

- recursive inventory complete;
- unique behavior/material accounted for;
- destinations exist;
- relevant verification performed;
- ledger updated with what moved and what was intentionally discarded;
- no active import/runtime/build dependency still requires the donor path.

Git history remains the recovery mechanism after deletion; the working tree should not retain exhausted legacy copies.
