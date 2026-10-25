# ECC verification — recovery persistence

Date: 2026-10-04. Repository: `mycomind4-arch/mailmypdf-all`, existing main working copy. This report covers durable recovery cases, owned connection/approval/execution storage, and the connector lifecycle tools; previous provider-binding/browser evidence remains in `docs/RESOLVE_EXECUTION_SUBSTRATE.md`.

## ECC guidance applied

Read Everything Claude Code at `ef648e01899ba3e8dc6371642deaaf64b4477775`: `tdd-workflow`, `security-review`, `postgres-patterns`, `mcp-server-patterns`, and `verification-loop`. Source: https://github.com/affaan-m/everything-claude-code. This applies the guidance to the repository's existing Node test harness; it does not install a new paid agent harness or change model defaults.

Observed local TDD checkpoints:

| RED checkpoint | Observed failure | GREEN checkpoint/result |
| --- | --- | --- |
| `e6fdd91` | Missing recovery goal relation (7 database failures); missing lifecycle service | `faa6c19`: 7 SQL checks and 6 lifecycle checks passed |
| `e53538a` | Missing durable store module, before implementing the store/host tools | `4699ba9`: 8 SDK adapter checks and 4 authenticated MCP journeys passed |
| `759eba6` | Incomplete approved timestamps accepted; removed scope accepted; overdue evidence blocked | `64461e9`: all SQL edge checks passed, including restricted service-role writes |
| `2ddf525` | Full JavaScript suite exposed schema-sync mismatch for new table aliases/private schema | `b5a7a3f`: all 5 schema-sync checks passed; schema-aware parser retains every migrated-table check |
| `47e4125` | Null connection scope elements accepted, producing SQL unknown in a deny check | `37cb6ee`: all 13 SQL checks pass |

These local checkpoints preserve the observed failures. GitHub receives the verified final tree on top of the existing remote main; a failing intermediate checkpoint is not sent to the Lovable-connected branch.

## Verification results

Commands run from the package shown. Node 24.19.0, TypeScript 5.9.3; PGlite 0.5.8 reports PostgreSQL 18.3.

| Gate | Command | Result |
| --- | --- | --- |
| Real SQL/RLS/role guards | App: `node --test tests/database/recovery-storage.test.mjs` | **13/13**; SQL engine, no mocked SQL assertions |
| New lifecycle + durable adapters | App: `node --experimental-test-coverage --test-coverage-include='**/src/lib/mcp/recovery-case-service.ts' --test-coverage-include='**/src/lib/mcp/recovery-store.server.ts' --import tsx --test tests/recovery-case-service.test.ts tests/recovery-store.test.ts` | **18/18**; actual Supabase SDK with injected HTTP responses |
| Coverage | Same command | **99.84% lines, 95.65% branches, 94.87% functions** across the two new modules; each exceeds ECC's 80% minimum |
| Connector integration | App: module-mock runner over MCP scan/cases/connector/transport tests | **60/60**; includes four saved-case journeys |
| Neighboring card/prompt | App: same runner over `mcp-recovery-ui.test.ts`, `conversational-mailing.test.ts` | **6/6** |
| Connector launch contract | App: `node --test tests/mcp-launch-readiness.test.mjs` | **4/4**, 38 tools |
| Schema sync | App: `node --test tests/supabase-schema-sync.test.mjs` | **5/5**, includes private credential table |
| Agent runtime | Package: `node --import tsx --test src/*.test.ts` | **53/53** |
| App build | App: direct Vite build followed by `scripts/fix-ssr-chunk-cycle.mjs .output/server` | **PASS**, no runtime-helper cycles; existing bundler directive warnings |
| Root types | Root: `node node_modules/typescript/bin/tsc -b` | **PASS** |
| New module/test lint | App: direct ESLint over the two new modules and three new TS tests | **PASS** |
| Lock consistency | pnpm 9.10.0: `install --frozen-lockfile --lockfile-only --ignore-scripts` | **PASS**, no dependency upgrades; normalizes ordering and empty workspace entry |
| Shared execution architecture | Root: `node scripts/check-step-workflow-execution.mjs` | **PASS**, zero new violations |
| Security review | Reviewed new SQL, server store, lifecycle schemas, tool handlers, and changed-file secret/log patterns | Owner-bound RLS reads; service-only writes; private vault refs; strict event/confirmation schemas; parameterized SDK queries; bounded JSON; sanitized provider errors; no secret/logging additions |
| Diff review | `git diff --check`, review against prior verified tree | **PASS** |
| Full app JavaScript | `node --test tests/*.test.mjs` | **674/675**; pre-existing scheduler gap fails |
| Full app TypeScript tests | Module-mock runner over `tests/*.test.ts` | **355/358**; three pre-existing workflow inventory/registry assertions fail |
| Standalone app types | App: `node ../node_modules/typescript/bin/tsc --noEmit` | **18 existing diagnostics**, zero new recovery/storage diagnostics |

The prior slice reproduced the scheduler/inventory/typecheck failures on untouched `4439147`. Current broad checks retain those same failures: `scheduled-mailings` is not included in the accepted-gap expectation; workflow tests expect 441 identities while the canonical registry has 449. They are not suppressed or relabeled as passing here.

## Security behavior established locally

- Anonymous access and direct authenticated writes fail. Other owners cannot read goals or provider connections; credentials references have no authenticated read path.
- Every goal/connection/action/approval carries immutable owner identity. Goals and terminal receipts enforce monotonic revisions. Owner/key uniqueness arbitrates execution claims and owner/retry-key uniqueness arbitrates case creation.
- Cross-owner evidence and matter links fail. Resolving a case requires already-linked owned evidence and explicit confirmation; provider success alone cannot resolve it.
- An approval must first be a proposal. Input/review bytes cannot change; complete owner/time/expiry evidence is mandatory for approval. Revoked approval/connection and removed Gmail scopes deny claims.
- External-write uncertainty is `needs_review`. Terminal receipts cannot be overwritten, and a failed receipt write leaves the running claim available to block blind replay.
- The database permits only current Gmail policy version 1 for search/read/draft/send. Future providers or policy versions require a reviewed migration as well as registry changes.

## Activation limits and next work

Implemented and locally verified. **Not production verified**: no hosted database migration/advisors, PostgREST call, multi-process race test, OAuth/token-refresh flow, exact Gmail approval UI, deployed worker, deployment, real send, charge, or mailing. PGlite's single connection cannot prove production lock interleavings. The Supabase SDK tests verify request predicates and responses without a hosted PostgREST server.

The MCP save/update confirmations reflect the user's explicit instruction reported by the client; they do not issue an external-action approval. No host Gmail action is exposed. Future action review must store the fingerprint produced by the governed executor, retain exact recipient/body review evidence, and load credentials from an encrypted server vault. Public account exports/deletion/retention should include the new case/connection metadata when the production feature is activated. Existing account deletion cascades owner-bound recovery tables.
