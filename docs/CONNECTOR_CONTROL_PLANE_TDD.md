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


## Chat-guided workflow protocol — 2026-09-27

MailMyPDF now has a protocol layer above the existing MCP execution primitives.
The runtime remains authoritative; the model receives typed next actions instead
of inferring workflow order.

- `@mailmypdf/workflows` exports `mailmypdf.workflow/v1`, a deterministic,
  side-effect-free state reducer with progress, blockers, and typed next actions.
- The reducer distinguishes document-first workflows from request/fact-first
  workflows. A request-first manifest is not forced through source-document
  analysis.
- MCP v0.8 exposes `get_workflow_state` as a read-only, owner-scoped 27th
  connector tool. It reads canonical matter/document/analysis/input/draft/
  approval/order state and recommends existing tools; it never approves,
  checks out, charges, or mails.
- The first registered chat adapter is the shared Notice Respond domain pack, so
  CP14, CP2000, CP504, generic IRS balance-due, and IRS penalty response
  profiles use the same protocol instead of bespoke chat logic.
- Workflows without an explicit protocol adapter fail closed with
  `WORKFLOW_PROTOCOL_NOT_REGISTERED`. The LLM must not invent a step order.
- The plugin submission bundle has explicit annotation justifications for all
  27 tools. Launch-readiness and smoke checks use the same 27-tool surface, and
  Workspace UI CI now runs when `plugins/mailmypdf/**` or the plugin
  submission validator changes.

Verification for commit `ef4c96c5e89f0b4f74f82b480a9ddeee11380783`:
the full Workspace UI verification run `36316852480` completed successfully
with all 20 jobs green, including the MCP transport/catalog suites, plugin
submission validator, launch-readiness checks, executable notice runtime tests,
production core build, and every section build.

### Chat-protocol gaps intentionally left open

- Chat-guided adapters are not yet certified for every executable workflow.
  Records Request is intentionally not registered yet because its manifest field
  IDs and runtime input keys are not currently one canonical contract.
- Generated-but-not-saved drafts and previewed-but-not-approved packets are
  recoverable through durable connector operations, but `get_workflow_state`
  does not yet surface the latest operation receipt. A resumed chat can therefore
  safely regenerate/re-preview rather than recover that intermediate artifact.
- Optional source/evidence collection is not yet modeled as a parallel
  `nextActions` branch for request-first workflows.
- Production OAuth/client acceptance and live deployment remain separate
  operational gates; this repository verification does not claim a live
  ChatGPT/Claude round trip.


## Chat-readiness factory certification — 2026-09-27

The workflow factory now has a fail-closed chat-execution certification layer
above ordinary static composition.

- `WorkflowRuntimePolicy.chatContract` declares the runtime-visible source
  document mode, user-input bindings, connector-owned field bindings, and
  runtime-enforced manifest gates.
- `certifyWorkflowChatReadiness()` compares the canonical manifest against the
  runtime chat contract and actual connector tool catalog. Certification fails
  for unbound manifest fields, runtime-only fields, requiredness drift,
  unsupported connector bindings, unenforced required gates, source-document
  disagreement, missing request-first analysis, or missing connector tools.
- `composeWorkflowForChat()` combines ordinary factory composition with chat
  certification and exposes `chatExecutable` only when both pass.
- MCP workflow registration is now gated by that factory result. Known but
  uncertified workflows return structured chat-readiness diagnostics and cannot
  create an MCP matter.
- Public `get_workflow` exposes
  `chatExecution: { protocol: "mailmypdf.workflow/v1", certified: boolean }`
  so an assistant can distinguish catalog discovery from safe chat execution
  before matter creation.

Three reusable workflow archetypes are now certified through the same protocol:

1. **Document-first official response** — Notice Respond / CP14 family.
2. **Fact-first request** — Records Request family, including manifest-style
   chat field ids normalized to the existing stored camelCase runtime model.
3. **Evidence-heavy appeal** — all 11 platform insurance-appeal workflows.
   The shared insurance manifest now declares claimant facts, explicit fact
   confirmation, evidence review, and recipient review. Runtime and web UI both
   enforce the same confirmation contract.

The insurance family was also consolidated so `appeal-denied-claim` uses the
shared insurance manifest factory while preserving its existing
`standard-denied-claim` acceptance-scenario identity.

Verification: Workspace UI verification run `36322701374` completed
successfully with **20/20 jobs green** on code commit
`08b393a8f690566467bdebe7830cb97153628403`. This includes the workflow package
tests, Records Request verification, Notice Respond verification, insurance
appeal acceptance coverage exercised through the Appeal Mail/SSDI gate,
canonical registry verification, MCP connector/authority checks, every section
build, and the final production MailMyPDF core build.

### Remaining factory work

- Move family manifest/policy resolution out of the MCP host into one shared
  canonical chat-execution registry so new certified families self-register
  without host edits.
- Model optional evidence/source uploads as explicit parallel `nextActions`
  rather than relying on the model to call ingestion outside the primary
  progression.
- Surface durable generated-draft and packet-preview operation receipts through
  workflow state for exact mid-step resume.
- Add chat contracts and certification evidence for SSA/benefits,
  immigration, disputes, code enforcement, and the remaining platform runtime
  families.
- Add certification reporting to Studio so workflow generation shows exact
  blocking diagnostics before a workflow can be promoted to chat-executable.

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
