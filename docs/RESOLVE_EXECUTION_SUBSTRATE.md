# Recovery review and governed provider actions

Implemented on 2026-10-04 in the existing MailMyPDF packages and connector. This is the first executable recovery-review slice, not a replacement workflow engine or a production-enabled autonomous agent.

## Customer journey implemented in the host

An authenticated chat user can supply transaction records to `scan_recovery_candidates`. The existing MCP handler returns a deterministic scan and a portable review card. The card shows candidate values separately by currency, the merchant, original transaction IDs, confidence, and evidence requirements. It contains no sending, approval, payment, or bank-connection controls.

The scan groups settled debits by account alias, normalized merchant, currency, amount, and verified invoice identity. Without invoice evidence, a group is limited to a 48-hour window anchored at its first charge. Pending authorizations, reversals, and explicitly refunded charges are excluded; partial refunds on either charge reduce the net candidate value. Separate purchases remain possible. The result is screening evidence, not an entitlement or guaranteed recovery.

The host accepts at most 2,000 supplied records and rejects unsupported fields. It does not persist transactions or access bank accounts. `invoiceId` and `reversesTransactionId` must come from evidence, not inference. After reviewing evidence, chat can find an existing certified workflow or prepare an ordinary letter through the existing exact-document review process. The scanner itself creates no matter and sends no correspondence.

Example tool arguments, using synthetic data:

```json
{
  "transactions": [
    { "id": "demo-1", "accountId": "Checking alias", "merchant": "Northstar Internet", "amountMinor": 8900, "currency": "USD", "postedAt": "2026-10-01T12:00:00Z", "state": "settled", "kind": "debit" },
    { "id": "demo-2", "accountId": "Checking alias", "merchant": "Northstar Internet", "amountMinor": 8900, "currency": "USD", "postedAt": "2026-10-02T12:00:00Z", "state": "settled", "kind": "debit" }
  ]
}
```

That input yields one possible duplicate worth 8,900 USD minor units, requiring review. It does not establish that $89 is owed.

Browser evidence uses synthetic demonstration records only:

![Desktop recovery review](verification/recovery-review-desktop.png)

[Phone rendering](verification/recovery-review-mobile.png) was checked at 390px with no horizontal overflow. Desktop was checked at 840px. Both had zero JavaScript page errors, and the evidence disclosure expanded successfully. This verifies the actual HTML resource in Chromium, not its rendering inside a deployed ChatGPT or Claude host.

## Shared execution substrate

| Component | Implemented behavior | Activation boundary |
| --- | --- | --- |
| `@mailmypdf/intelligence` recovery scanner | Deterministic duplicate screening, refund handling, currency separation, evidence identities | Connected to the app's authenticated MCP handler; needs ordinary deployment to reach hosted clients |
| `@mailmypdf/document-intelligence` Docling provider | Native Serve v1 request/response, API key, text/pages/tables, provenance, partial-conversion warning, bounded bytes and response timeout | Host must select the provider and provision its HTTPS service; no live service check performed |
| `@mailmypdf/agent-runtime` governed executor | Authenticated ownership callback, scope policy, canonical SHA-256 approval identity, atomic execution claim, receipt, uncertain-write review | Host must supply durable storage and trusted authorization/approval callbacks |
| Gmail actions | Native search/read/draft/send endpoints; MIME encoding; scoped, owner-bound credentials; safe response and redirect handling | Package bindings only; no OAuth flow, token vault/refresh, host registration, or live send enabled |
| Case goals | Private owner-bound outcome lifecycle, linked evidence/matters/actions, explicit evidenced resolution | Contract and transitions only; no database repository or customer dashboard yet |
| Trigger HTTP client | Existing `TriggerTaskClient` contract implemented using one registered task's REST trigger endpoint | Requires deployed worker, scoped secret, durable run/checkpoint wiring, dispatch reconciliation, and host configuration |

The existing `ToolRegistry`, workflow registry, auth handler, and mailing approval/payment boundaries remain the owners of their respective responsibilities. No competing tool registry or bespoke workflow execution UI was added. No paid model defaults changed.

### Approval and uncertain effects

`GovernedActionExecutor.review()` authorizes the request and returns its fingerprint. Trusted server code records human approval of that exact fingerprint. `invoke()` loads approval from trusted storage and rejects changed identity/input, expiry, revocation, wrong ownership, or missing scopes. Approval validity is checked after the asynchronous lookup. Input is snapshotted before awaits.

The store must atomically claim the owner/idempotency-key pair. Concurrent calls return the existing operation; changed payloads conflict. A successful provider receipt is retained. An ambiguous external write becomes `needs_review` and cannot automatically repeat. If receipt persistence fails after the provider call, the surviving `running` claim blocks a resend. Gmail Message-ID is deterministic for correlation; it is not a Gmail exactly-once guarantee.

`MemoryActionExecutionStore` is explicitly a test/development reference, never a production default. A production store must enforce unique owner/key identity and optimistic revisions across processes. Approval must come from the authenticated human-review route, not caller-provided JSON. Provider connection IDs must have immutable ownership and account identity; token refresh must preserve that identity. Existing packet approvals do not automatically approve Gmail messages.

Gmail evidence is labeled `untrusted-evidence`: message content must never become agent instructions. The current email binding supports plain text and simple recipient addresses; it does not add attachments, bulk sending, arbitrary raw MIME, or HTML execution.

### Provider configuration

Docling defaults to `protocol: "serve-v1"` and maps a service root to `/v1/convert/source`. Supply `apiKey` for `X-Api-Key`; the existing `authorizationHeader` option remains available. A custom pre-existing wrapper must explicitly use `protocol: "legacy"`. Native HTTP 200 responses with failed conversion status are rejected. Missing text provenance stays unlocated instead of receiving a fabricated page number.

`TriggerHttpTaskClient` takes `registeredTaskId`, `secretKey`, an optional HTTPS root endpoint, and optional timeout/fetch injection. Its payload is `{ taskId, payload }` inside the Trigger request. The deployed task must route only allowed internal task identities and reload authoritative owned run/action state. Trigger's idempotency key deduplicates dispatch; it does not protect an arbitrary external write inside a retried worker. Consequential actions still require the governed executor and durable claims.

Provider contracts checked against primary documentation:

- [Docling Serve](https://github.com/docling-project/docling-serve)
- [Gmail MIME and send/draft API](https://developers.google.com/workspace/gmail/api/guides/sending)
- [Trigger task REST API](https://trigger.dev/docs/management/tasks/trigger)

## Verification

Use Node 24 in this environment. The repository pins pnpm 9.10.0. Dependencies were installed with lifecycle scripts disabled because the unrelated ONNX runtime install attempted an unavailable GPU package download. No dependency or lockfile changes are part of this slice. Direct Node/TypeScript commands avoided an installed pnpm 12 wrapper trying to reinstall the workspace from nested build scripts.

| Check | Result |
| --- | --- |
| `packages/agent-runtime`: `node --import tsx --test src/*.test.ts` | 53/53 |
| `packages/document-intelligence`: `node --import tsx --test tests/*.test.ts` | 23/23 |
| `packages/intelligence`: `node --import tsx --test tests/*.test.ts` | 539/539 |
| App MCP recovery, card, connector, transport, launch-readiness, conversational prompt tests | 66/66 |
| Root `node node_modules/typescript/bin/tsc -b` | Clean |
| Agent-runtime and document-intelligence `tsc --noEmit` | Clean |
| App `node ../node_modules/vite/bin/vite.js build`, then SSR cycle fixer | Clean; no runtime-helper cycles |
| Actual Chromium resource render at desktop/phone widths | Passed; screenshots above |
| App JavaScript tests | 674/675; existing scheduler-gap assertion fails |
| App TypeScript tests | 333/336; existing workflow inventory/registry assertions fail |
| Standalone app `tsc --noEmit` | 18 existing diagnostics; identical to untouched main under the same installed dependencies |

The remaining broad-check failures were reproduced in a separate unchanged clone at `4439147`. The missing checkout-instruction assertion also failed on unchanged main; restoring the instruction in this slice fixes it. Scheduler tests still list `scheduled-mailings` as an unaccepted scheduling gap; workflow tests expect 441 identities while the actual canonical registry has 449. These were not hidden by changing their assertions.

No hosted deployment, OAuth grant, bank connection, real Docling conversion, Trigger task invocation, Gmail send, payment, or mailing was performed. Package-level provider tests use injected responses.

## Next implementation

Bind action approvals, owner-scoped provider connections, execution claims, and case goals to durable server storage, then expose the exact-action human review UI. Wire the deployed Trigger worker through those same ownership and idempotency checks. Reconcile existing host-wide acceptance failures before treating broader autonomy as production ready. The scanner can be reviewed and deployed independently of activating Gmail or background actions.
