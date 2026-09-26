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

## RED and GREEN evidence

| Guarantee | Test target | RED evidence | GREEN evidence |
| --- | --- | --- | --- |
| Capability readiness resolves dependencies and blocks planned bindings | `packages/workflows/tests/connector-readiness.test.ts` | Compile failed because `connector-readiness.js` did not exist | 8 readiness tests passed |
| Connector operations are resumable and reject invalid transitions | `packages/workflows/tests/connector-operation.test.ts` | Compile failed because `connector-operation.js` did not exist | 4 operation tests passed |
| Every MCP mutating tool declares canonical capability requirements | `mailmypdf/tests/mcp-connector.test.ts` | Runtime import failed because the connector-contract exports did not exist | MCP connector suite passed 31/31 |
| Discovery exposes capability requirements without non-standard top-level tool fields | `mailmypdf/tests/mcp-connector.test.ts` | Test found no `_meta` capability declaration | MCP connector suite passed 31/31 |
| Exact and caret capability-version rules are enforced | `packages/workflows/tests/connector-readiness.test.ts` | The original major-only comparison accepted incompatible versions | Corrected semantic-version tests passed |
| Approval preflight does not require an approval before recording approval | `mailmypdf/tests/mcp-connector.test.ts` | Review test exposed a circular `APPROVAL_REQUIRED` result | Tool-specific policy override passed while checkout still requires prior approval |

## Implemented boundaries

- `@mailmypdf/workflows/connector-readiness` owns readiness, compatibility,
  binding-health, dry-run, and acceptance-gap contracts.
- `@mailmypdf/workflows/connector-operation` owns the provider-neutral queued,
  running, waiting, succeeded, failed, and cancelled lifecycle.
- The MCP tool catalog maps each protected operation to canonical capability IDs.
- `server/discover` advertises the connector contract version and tool count.
- `tools/list` publishes required capability IDs through namespaced `_meta`.

## Known gaps

- Binding-health inputs are supported by the contract, but no deployed service
  probes are wired yet.
- Connector-operation state is a reusable contract, not yet persisted or exposed
  as a new MCP polling tool.
- Existing tool handlers remain authoritative for authentication, owner-scoped
  matter access, approval, payment, and mailing. Readiness metadata is not an
  authorization replacement.
- Production OAuth and assistant-host smoke tests require a configured deployment.

Focused Node coverage for the two new workflow modules is 92.73% lines, 88.33%
branches, and 90.63% functions.

Integrated verification also passed the complete `@mailmypdf/workflows` suite
(194/194), all MailMyPDF JavaScript tests (605/605), all MailMyPDF TypeScript
tests (215/215), the root TypeScript project build, and `git diff --check`.
The standalone MailMyPDF typecheck still reports its documented pre-existing
design-system resolution, route typing, metadata typing, and `Uint8Array`
errors; none point to the connector-control-plane files changed here.
