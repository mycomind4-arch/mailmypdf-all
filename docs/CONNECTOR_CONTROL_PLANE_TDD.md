# Connector capability control plane — TDD evidence

Updated 2026-09-26 from the live `mailmypdf-all-main` checkout.

## Source and user journeys

The journeys were derived from the connector-first product direction and the
existing MailMyPDF MCP contract:

1. An assistant can discover exactly which canonical capabilities a tool needs.
2. A connector preflight fails closed when authentication, ownership, approval,
   version compatibility, or a runtime binding is unavailable.
3. A dry run reports readiness without performing payment, mailing, filing, or
   any other external effect.
4. A long-running connector action has a resumable, idempotent state contract.
5. MCP discovery remains protocol-compatible by placing MailMyPDF extensions in
   `_meta`, not as non-standard top-level tool fields.
6. Retrying one action cannot duplicate work or silently bind changed arguments.
7. An owner can recover operation status after losing a tool response.
8. Readiness can inspect live database, storage, payment, and mailing bindings
   without performing the target action.
9. A scheduled reconciler detects stale `running` operations and quarantines
   ambiguous outcomes for review without rerunning the original action.

## RED and GREEN evidence

| Guarantee | Test target | RED evidence | GREEN evidence |
| --- | --- | --- | --- |
| Capability readiness resolves dependencies and blocks planned bindings | `packages/workflows/tests/connector-readiness.test.ts` | Compile failed because `connector-readiness.js` did not exist | 8 readiness tests passed |
| Connector operations are resumable and reject invalid transitions | `packages/workflows/tests/connector-operation.test.ts` | Compile failed because `connector-operation.js` did not exist | 4 operation tests passed |
| Every MCP mutating tool declares canonical capability requirements | `mailmypdf/tests/mcp-connector.test.ts` | Runtime import failed because the connector-contract exports did not exist | MCP connector suite passed 31/31 |
| Discovery exposes capability requirements without non-standard top-level tool fields | `mailmypdf/tests/mcp-connector.test.ts` | Test found no `_meta` capability declaration | MCP connector suite passed 31/31 |
| Exact and caret capability-version rules are enforced | `packages/workflows/tests/connector-readiness.test.ts` | The original major-only comparison accepted incompatible versions | Corrected semantic-version tests passed |
| Approval preflight does not require an approval before recording approval | `mailmypdf/tests/mcp-connector.test.ts` | Review test exposed a circular `APPROVAL_REQUIRED` result | Tool-specific policy override passed while checkout still requires prior approval |
| Idempotency cannot cross an owner/matter/request boundary | `packages/workflows/tests/connector-operation.test.ts` | Repository replay had no persistence/request-binding contract | Repository tests reject matter and request-hash rebinding |
| Provider-family probes are bounded and secret-safe | `packages/workflows/tests/connector-binding-health.test.ts` | Compile failed because no probe runner existed | Probe deduplication, safe failure, unknown state, and timeout tests pass |
| Operation persistence is owner-read/server-write with database transition guards | `mailmypdf/tests/connector-operation-migration.test.ts` | No operation migration existed | RLS/grant, compound ownership, idempotency, and transition-trigger checks pass |
| MCP exposes polling/readiness and requires keys for persisted actions | `mailmypdf/tests/mcp-connector.test.ts` | Tool surface had neither status/readiness tools nor required retry keys | Connector catalog and discovery tests pass with 17 tools |
| Interrupted operations are reconciled without replaying effects | `packages/workflows/tests/connector-operation-reconciliation.test.ts` | No reconciliation contract or stale-operation processor existed | Evidence-only decisions, review fallback, conflict handling, and repository-identity tests pass |
| Reconciliation is scheduled and separately authorized | `mailmypdf/tests/connector-operation-reconciliation.test.ts`, `mailmypdf/tests/jobs-are-scheduled.test.mjs` | No endpoint, scoped secret, stale-running index, or scheduler invocation existed | POST-only job, timing-safe secret, bounded inputs, partial index, and ten-minute schedule checks pass |

## Implemented boundaries

- `@mailmypdf/workflows/connector-readiness` owns readiness, compatibility,
  binding-health, dry-run, and acceptance-gap contracts.
- `@mailmypdf/workflows/connector-operation` owns the provider-neutral queued,
  running, waiting, succeeded, failed, and cancelled lifecycle.
- `@mailmypdf/workflows/connector-binding-health` owns bounded, provider-family
  health-probe orchestration and safe result normalization.
- The MCP tool catalog maps each protected operation to canonical capability IDs.
- `server/discover` advertises the connector contract version and tool count.
- `tools/list` publishes required capability IDs through namespaced `_meta`.
- `connector_operations` persists owner/matter/request-bound state with RLS and
  database-enforced optimistic transitions.
- `get_operation_status` recovers owner-scoped state/results;
  `get_connector_readiness` runs live binding probes without the target effect.
- `@mailmypdf/workflows/connector-operation-reconciliation` accepts only
  observable-evidence decisions. It deliberately has no original-action
  execution callback.
- A separately authorized scheduled job scans operations stale for at least 15
  minutes. Operations without a receipt-backed resolver move to
  `waiting_for_user` with explicit review instructions.

## Known gaps

- The migration is implemented and statically verified but has not been applied
  to staging or production in this task.
- Operations still execute inside the initiating request. The reconciler can
  quarantine ambiguous interrupted actions, but exact automatic success/failure
  recovery requires kind-specific immutable receipt correlation that is not yet
  implemented.
- `create_matter` remains outside the matter-bound operation model because a
  matter id does not exist before creation.
- AI and malware-scanner checks are configuration-aware but report `unknown`
  when configured; neither provider exposes a safe no-effect reachability probe.
- Existing tool handlers remain authoritative for authentication, owner-scoped
  matter access, approval, payment, and mailing. Readiness metadata is not an
  authorization replacement.
- Production OAuth and assistant-host smoke tests require a configured deployment.

Verification counts for this phase are recorded in `context/FACTORY_STATUS.md`.
The repository build remains the authoritative workspace typecheck; the broad
standalone app-only typecheck currently includes unrelated pre-existing errors.
