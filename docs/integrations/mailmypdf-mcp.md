# MailMyPDF Remote MCP Connector

MailMyPDF exposes a vendor-neutral MCP surface so ChatGPT, Claude, Grok, Codex, and other compatible clients can use the same workflow engine.

## Endpoint

Until the custom domain is purchased and configured, the intended live connector
URL is `https://mailmypdf.mycomind4.workers.dev/api/mcp`. Do not use the `.ai`
plugin manifest to install that temporary deployment. See
[installation and environment checklist](mailmypdf-installation.md).

The host app mounts the connector at:

```
POST /api/mcp
```

The connector is deliberately an adapter over the existing generic workflow runtime. It does not implement a second matter store, document system, packet builder, pricing engine, payment system, or Lob integration.

## Protocol compatibility

The HTTP endpoint serves the modern MCP `2026-07-28` stateless shape and keeps the legacy initialize path for older clients.

For modern requests:

- `MCP-Protocol-Version: 2026-07-28` must match `params._meta["io.modelcontextprotocol/protocolVersion"]`;
- `Mcp-Method` must agree with the JSON-RPC method;
- `Mcp-Name` must agree with `params.name` for tool calls;
- `server/discover` advertises tool and resource capabilities without creating a session;
- `tools/list`, `resources/list`, and `resources/read` return deterministic cache hints;
- modern `resources/read` binds `Mcp-Name` to the requested resource URI;
- discovery/list/static UI-resource requests do not load the workflow execution runtime; private PDF reads authenticate first.

MailMyPDF does not mint or require MCP session ids for modern requests. Application state is explicit through matter, document, approval, and order identifiers.

Legacy `initialize` supports `2025-03-26`, `2025-06-18`, and `2025-11-25`.
Unknown versions are not echoed as if implemented. Requests are capped at 1 MiB;
browser origins are validated and account responses are never HTTP-cacheable.

## v0.7 / connector-v2 tool boundary (26 tools)

Public discovery:

- `find_workflow`
- `get_workflow`

Authenticated matter execution:

- `get_profile`
- `create_matter`
- `get_matter`
- `get_order_status`
- `get_document_status`
- `get_operation_status`
- `get_connector_readiness`
- `ingest_direct_pdf`
- `prepare_direct_pdf_mail`
- `get_mailing_context`
- `list_saved_addresses`
- `save_mailing_address`
- `archive_mailing_address`
- `review_direct_pdf_mail`
- `approve_direct_pdf_mail`
- `prepare_direct_pdf_checkout`
- `ingest_document`
- `save_matter_input`
- `analyze_matter`
- `generate_draft`
- `save_draft`
- `preview_packet`
- `approve_packet`
- `prepare_checkout`

The connector intentionally does **not** expose a raw-card tool or a model-authorized "mail now" tool.

Saved senders and recipients are private and separate by kind. Saving requires
explicit consent and an owned order with fresh successful postal review; clients
cannot supply verification. Use a stable UUID and revision 0 to create, or the
listed id/revision to edit. Only senders can be defaults; defaults still require
confirmation. Preparation accepts optional `sender_profile` / `recipient_entry`
id/revision references alongside explicit addresses. The server checks the exact
selected snapshot and records provenance; fulfillment never follows a mutable
saved-address reference. Every new mailing still requires review. Archiving does
not change old orders. Requires `20260928010000_saved_mailing_addresses.sql`,
not yet applied to production. Manual address entry remains independent of this
table. Public autocomplete and address overrides are not implemented.

`approve_packet` is bound server-side to the exact packet SHA-256, exact price, recipient, and mail class. `prepare_checkout` can only run against that saved approval and returns the existing Stripe-hosted checkout path. Existing payment and fulfillment infrastructure remains authoritative.

## Packet review app

`preview_packet` now requires the intended recipient as part of the review request and advertises the portable MCP Apps resource:

```
ui://mailmypdf/packet-review-v1.html
```

The resource is self-contained `text/html;profile=mcp-app` with no external scripts or network dependencies. Compatible hosts can render the quote, mail class, response/supporting page counts, intended recipient, packet SHA-256, and recipient SHA-256 before approval. Clients that do not render MCP Apps can still use the same structured preview result.

The review UI displays the exact PDF and has an explicit approval button. Approval uses the same server-validated tool as other clients; the UI cannot charge or mail.

MailMyPDF canonicalizes the reviewed recipient and computes a deterministic SHA-256. `approve_packet` requires the exact `expected_recipient_sha256` returned by `preview_packet`. If the recipient changes after review, approval fails closed and the assistant must build a new preview. This is in addition to the existing packet-hash, quote, and mail-class checks.

`preview_packet` is intentionally advertised with `readOnlyHint: false` because the existing packet preview path persists measured page-count metadata even though it does not approve, charge, or mail anything.

## Durable operations and retries

The eight matter-bound write/action tools require an `idempotency_key`:

- `ingest_document`
- `save_matter_input`
- `analyze_matter`
- `generate_draft`
- `save_draft`
- `preview_packet`
- `approve_packet`
- `prepare_checkout`

The key must be 8–128 characters using letters, numbers, periods, underscores,
colons, or hyphens. A connector must reuse the key only when retrying the same
tool with the same matter and arguments. MailMyPDF binds it to the owner, matter,
tool kind, and a canonical SHA-256 of the request. Reusing a key with another
matter or changed arguments returns a conflict instead of replaying the wrong
result.

Successful tool responses preserve their existing fields and add
`connectorOperation` plus `connectorReplay`. If a call is interrupted, use
`get_operation_status` with the returned operation id. Owner-scoped RLS protects
status reads; only trusted server code can create or transition operation rows.

This is durable retry/status support, not blind background replay. A scheduled,
separately authorized reconciliation job scans operations that have remained
`running` for at least 15 minutes. If MailMyPDF cannot prove the outcome from an
immutable receipt, it moves the operation to `waiting_for_user` and returns an
explicit review instruction through `get_operation_status`. The reconciler has
no callback capable of repeating the original action.

The shared reconciliation contract supports future kind-specific resolvers that
can mark an operation succeeded or failed only from observable evidence. Those
receipt correlations are not implemented yet, so the current production-safe
fallback is review rather than guessing. Configure the app and scheduler with a
dedicated 32+ character `MAILMYPDF_CONNECTOR_JOB_SECRET`; do not reuse scanner,
retention, or general cleanup credentials.

`create_matter` is not yet part of this operation model because there is no
matter id to bind before creation.

## Secure assistant attachments

`ingest_document` accepts the provider-neutral file object used by ChatGPT file parameters:

```json
{
  "download_url": "https://temporary-provider-url/...",
  "file_id": "provider-file-id",
  "mime_type": "application/pdf",
  "file_name": "notice.pdf"
}
```

The tool is marked with `_meta["openai/fileParams"] = ["file"]`, so ChatGPT can supply an attached file directly. Other MCP clients can pass the same shape when they expose temporary file URLs.

Ingress is intentionally not a blind URL fetch:

- the matter is owner-checked before any remote network request;
- only public HTTPS URLs on port 443 are accepted;
- local/private/IP-literal targets and unsafe redirect destinations are rejected;
- deployments can further restrict hosts with `MCP_REMOTE_FILE_HOSTS`;
- response and provider MIME claims are treated as untrusted;
- binary signatures are checked before creating the File object;
- streaming size caps are enforced before the whole response can exceed MailMyPDF limits;
- the bytes then pass through the existing secure-document consent, validation, SHA-256, quarantine, retention, and malware-scan lifecycle;
- the attached document remains unusable for analysis until its security status becomes `clean`.

A user attaching a file is not approval to mail it. `processing_consent` must be true for ingestion, and exact packet approval plus checkout remain separate actions.

### Scan readiness

After `ingest_document`, assistants should use `get_document_status` before calling `analyze_matter` when the returned security state is not already clean.

The readiness result is deliberately small:

- `ready` only when the document is both `clean` and usable;
- `pending_scan` while quarantined/scanning or when a clean record is not yet usable;
- `rejected` when security validation fails;
- `unavailable` when deletion has started or completed.

Interactive MCP ingestion makes a best-effort immediate claim of the just-uploaded, owner-scoped document and runs the exact same structural + malware scanner pipeline used by the scheduled job. This normally lets a chat continue without waiting for the GitHub Actions scan interval. If the scanner service is unavailable or the immediate pass fails, the scanner code returns the record to `quarantined`; the scheduled secure-core scan remains the durable retry path. A scan failure never makes the document usable.

The tool reads only owner-scoped document/matter metadata. It does not return storage paths, scanner signatures, scanner error text, retention internals, or raw security metadata.

## Direct PDF mailing from chat

The connector now supports the core MailMyPDF use case without forcing a finished PDF through a specialized workflow.

The expected sequence is:

1. `ingest_direct_pdf` copies the assistant attachment into the same secure quarantine vault used by workflow evidence.
2. `get_document_status(document_id)` waits for a clean, usable PDF. A workflow matter id is not required for standalone direct mailing.
3. `prepare_direct_pdf_mail` creates or reuses an unpaid MailMyPDF order from the clean PDF and returns the exact order PDF SHA-256 and effective quote.
4. `review_direct_pdf_mail` verifies both addresses and returns a structured draft, owner-only exact PDF resource, illustrative envelope layout, actual price, color, and delivery caveat. Postal verification is not recipient-identity verification. Corrections, missing units, and unavailable verification block approval; changed addresses require a new draft. Successful verification is bound to the mailing snapshot and reused for up to 30 minutes.
5. Only after explicit confirmation, `approve_direct_pdf_mail` requires the client to echo the reviewed sender, recipient, mail class, color, SHA-256, and price; the server compares all of them, requires unexpired verification for both current addresses, and then records the immutable approval snapshot.
6. `prepare_direct_pdf_checkout` re-hashes the order PDF, re-quotes it, verifies both against approval, and returns a Stripe-hosted checkout URL.
7. Stripe's verified webhook records payment and, when auto-fulfillment is enabled, submits the order through the existing Lob pipeline.
8. `get_order_status(order_id)` reports payment, provider, tracking, and delivery state.

Direct-mail preparation requires a client-supplied `idempotency_key`. Retries of the same mailing intent reuse the existing order; intentionally mailing the same PDF again requires a new key.

The direct-mail tools never return the legacy order lookup token and never accept raw card data.

`get_mailing_context` returns at most ten owner-scoped recent direct mailings for
recipient/return-address reuse. It is not an address book, public company lookup,
or named sender-profile system. Ask the user to select among candidates.
`prompts/list` and `prompts/get(name="mail_this")` expose the conversational guide;
the same instructions are returned during initialization for clients that do not
expose MCP prompts. Text/structured results remain usable without card rendering.

The existing MCP review card now supports direct-mail drafts, including sender,
recipient, file name, service, price, color, verification, PDF, and illustrative
envelope layout. Approval requests echo only the displayed draft values. The
card does not create checkout or send mail; the conversation continues with the
separate checkout tool after approval. Provider estimates are not invented.

Local visual fixture (no providers or credentials): from `mailmypdf`, run
`node --import tsx tests/fixtures/conversational-mailing.mts`, then open
`http://127.0.0.1:4198/`. The `scenario=blocked` and `scenario=approval-error`
query parameters exercise failure states. Its $8.42 price is fictional.

### Direct-mail integrity boundary

Approval is not merely a UI flag.

- `approved_packet_sha256` and `approved_price_cents` are written only after the client echoes the exact reviewed mailing details and the server confirms they still match the prepared order.
- Approval values and the immutable mailing snapshot event are saved in one database transaction. Approved sender, recipient, PDF reference, service, and color settings cannot subsequently change.
- The existing database trigger makes non-null approved hash/price values immutable.
- The Stripe webhook rejects a completed payment whose amount differs from any stored approved price.
- Immediately before Lob receives a signed PDF URL, MailMyPDF downloads the stored order PDF and recomputes SHA-256.
- A hash mismatch records `fulfillment.packet_hash_mismatch` and blocks provider submission.

This means a successful checkout cannot silently authorize changed PDF bytes.

## Order and mailing status

`get_order_status` is a read-only account tool for questions such as “did it mail yet?”, “was it delivered?”, or “what tracking information does MailMyPDF have?”

The client can supply either a MailMyPDF `order_id` or an owner-scoped workflow `matter_id`. Workflow orders are authorized by loading the linked matter through the existing user-scoped case boundary. Older non-workflow orders fall back to the authenticated account email. Unauthorized and nonexistent orders both return “not found” so the connector does not reveal another customer's order existence.

The result intentionally exposes only customer-useful facts: canonical order state, amount, mail class, document/page summary, recipient name/city/state, workflow linkage, paid/mailed/expected-delivery dates, provider reference, recorded tracking number, and a sanitized event timeline. It does not return lookup tokens, Stripe session ids, storage paths, raw provider webhook metadata, internal errors, or admin notes.

The tool reads MailMyPDF's canonical status/event records instead of polling Lob on each assistant query. When Lob returns a tracking number during submission, MailMyPDF now retains it in the order event so future status queries can report it. Tracking remains `null` when the provider has not supplied one.

## Authentication

MailMyPDF uses the existing Supabase Auth user base as the OAuth 2.1 authorization server for remote MCP clients.

Protected tools validate the resulting Supabase access token through the same server-side `getUser(token)` boundary used by the authenticated web app, so existing owner-scoped RLS remains authoritative.

The application includes a branded consent route:

```
/oauth/consent
```

and protected-resource metadata:

```
GET /.well-known/oauth-protected-resource
```

When `SUPABASE_URL` is configured, resource metadata automatically advertises `${SUPABASE_URL}/auth/v1` as the authorization server. `MCP_AUTHORIZATION_SERVER` remains an optional override for unusual deployments.

For the hosted Supabase project, enable:

1. OAuth 2.1 Server.
2. Authorization Path: `/oauth/consent`.
3. Dynamic client registration for MCP clients.
4. Explicit user consent for every new client.

Dynamic client registration is currently the Supabase-supported compatibility route for self-registering MCP clients. The MCP 2026 specification deprecates DCR in favor of Client ID Metadata Documents, so this integration should migrate when the authorization platform exposes a compatible CIMD path.

Supabase currently supports the standard `email` and `profile` scopes used by MailMyPDF's protected MCP tools. Application-specific permissions such as matter ownership and exact mailing approval are enforced by MailMyPDF server policy/RLS rather than unsupported custom OAuth scopes.

For local Supabase, the equivalent settings are committed in `mailmypdf/supabase/config.toml`.

Do not treat OAuth consent as authorization to mail. Packet approval and checkout remain separate server-side actions.

## Capability contract and preflight

Each protected MCP tool now declares its required canonical MailMyPDF
capabilities. The declaration is validated against the shared Capability
Registry, including semantic version compatibility. `server/discover`
advertises the connector contract version, while `tools/list` places required
capability IDs in namespaced `_meta` so the protocol tool shape stays portable.

The shared connector-readiness boundary can evaluate authentication, matter
ownership, explicit approval, jurisdiction/domain applicability, and runtime
binding health. It also supports side-effect-free dry runs and reports
unsupported or unavailable requirements instead of inventing automation.

`get_connector_readiness` now runs those checks through deployed bindings. It
uses owner-scoped Supabase queries for workflow persistence, verifies the secure
storage bucket, and calls the existing Stripe, Lob, and notification provider
health adapters when those providers are relevant. AI and malware-scanner
bindings report configured/unavailable honestly because they do not expose a
safe zero-effect reachability check. Provider error bodies and credentials are
never returned.

This preflight is additive. Existing server-side authentication, RLS, ownership,
packet-hash approval, payment, and fulfillment checks remain authoritative.
Declared capability metadata is never sufficient authorization for a tool call.

Long-running connector actions use the shared provider-neutral queued, running,
waiting-for-user, succeeded, failed, and cancelled state contract. Database
constraints enforce legal transitions, monotonic revisions, immutable operation
identity, owner/matter binding, and one row per owner/tool/idempotency key.

## Next execution milestones

1. Deploy the current connector build to the production HTTPS domain.
2. Enable/verify Supabase OAuth 2.1 settings on the hosted project and exercise a real account connection.
3. Run `mcp:readiness` against production and resolve every failure before public submission.
4. Exercise `ingest_document` + `get_document_status` against real ChatGPT/Claude/Grok attachment URLs and configure `MCP_REMOTE_FILE_HOSTS` if stable provider/CDN domains are available.
5. Exercise the exact-PDF packet review and approval UI in ChatGPT developer mode.
6. Exercise `get_order_status` against paid, mailed, delivered, returned, and failed production-like orders.
7. Add saved-payment support only after a server-side confirmation design is complete.
8. Apply the connector-operation migrations, then verify interruption/retry/status recovery through real OAuth sessions. Keep review as the fallback until immutable effect/receipt correlation is available.

## Launch-readiness diagnostic

Use the stricter read-only diagnostic after deploying staging or production:

```bash
MCP_BASE_URL="https://mailmypdf.ai" \
pnpm --filter ./mailmypdf mcp:readiness
```

It verifies the live HTTPS endpoint, OAuth protected-resource metadata, stateless MCP discovery, the full 15-tool catalog, the packet-review MCP Apps resource, exact-PDF/approval controls, CP14 discovery, the protected-tool OAuth challenge, public support/privacy/terms/security routes, and the portable plugin package metadata.

To additionally verify a real connected account without creating any matter or document:

```bash
MCP_BASE_URL="https://mailmypdf.ai" \
MCP_BEARER_TOKEN="<temporary-user-access-token>" \
pnpm --filter ./mailmypdf mcp:readiness
```

During OpenAI directory submission, the portal provides a domain-verification token. Verify that exact deployed token with:

```bash
MCP_BASE_URL="https://mailmypdf.ai" \
OPENAI_CHALLENGE_EXPECTED_TOKEN="<portal-provided-token>" \
pnpm --filter ./mailmypdf mcp:readiness
```

The readiness command invokes only the read-only `find_workflow` and `get_profile` tools. It never creates matters, uploads files, analyzes documents, approves packets, creates checkout, charges, or mails.

## External smoke testing

Use the smoke command after local startup, staging deploys, and production deploys:

```bash
MCP_BASE_URL="http://127.0.0.1:8082" pnpm --filter ./mailmypdf mcp:smoke
```

For production:

```bash
MCP_BASE_URL="https://mailmypdf.ai" pnpm --filter ./mailmypdf mcp:smoke
```

The unauthenticated smoke verifies:

- `/api/mcp` is reachable and remains POST-only;
- protected-resource OAuth metadata is present (or reports configuration missing);
- modern `server/discover` returns protocol `2026-07-28`;
- `tools/list` exposes the expected 17-tool surface;
- public workflow discovery resolves `cp14-response`;
- a protected tool returns a 401 OAuth challenge with `resource_metadata`.

To verify a real connected account without performing any write action:

```bash
MCP_BASE_URL="https://mailmypdf.ai" \
MCP_BEARER_TOKEN="<temporary-user-access-token>" \
pnpm --filter ./mailmypdf mcp:smoke
```

The authenticated check calls only `get_profile`. It does not create a matter, upload a document, charge a payment method, or submit mail.

### Document execution E2E

After OAuth and the malware scanner are configured, exercise the first real assistant document path with a disposable test notice:

```bash
MCP_BASE_URL="https://staging.mailmypdf.ai" \
MCP_BEARER_TOKEN="<test-user-access-token>" \
MCP_TEST_FILE_URL="https://public-test-files.example/cp14.pdf" \
MCP_E2E_ALLOW_WRITES="true" \
pnpm --filter ./mailmypdf mcp:e2e:document
```

The harness performs exactly this sequence:

```
get_workflow
→ create_matter
→ ingest_document
→ get_document_status (until ready)
→ analyze_matter
→ stop
```

It does not call packet approval, checkout, payment, or mailing tools.

Production has an additional interlock. If `MCP_BASE_URL=https://mailmypdf.ai`, the harness refuses to write unless `MCP_E2E_ALLOW_PRODUCTION=true` is also explicitly set. Use staging or local environments by default.

Optional overrides:

- `MCP_TEST_WORKFLOW_ID` (default `cp14-response`)
- `MCP_TEST_SECTION_ID` (default `notice-respond`)
- `MCP_TEST_FILE_ID`, `MCP_TEST_FILE_NAME`, `MCP_TEST_FILE_MIME`
- `MCP_SCAN_POLL_MS` (default 3000)
- `MCP_SCAN_MAX_WAIT_MS` (default 90000)

The packet review MCP Apps card now exposes an **Approve this exact packet** action. The UI calls the same `approve_packet` MCP tool used by headless clients and passes the exact packet SHA-256, quoted total, recipient SHA-256, recipient, and mail class from the review. The server re-materializes/revalidates the current packet and rejects stale or changed review data before saving approval.

The review card deliberately has no checkout, payment, or mailing action. Approval only makes the immutable packet eligible for the separate secure checkout step.

### Exact PDF review

Every successful `preview_packet` now returns an owner-scoped `review.previewResourceUri` bound to the matter id, selected mail class, and exact packet SHA-256.

The packet review app can use `resources/read` to fetch that URI on demand. MailMyPDF:

- requires the connected MailMyPDF account before loading packet/PDF runtime code;
- rebuilds the current packet from the saved draft and included clean documents;
- does not mutate case state during the resource read;
- refuses the resource when the rebuilt packet hash no longer matches the reviewed hash;
- returns the PDF as an MCP binary resource (`application/pdf` + base64 `blob`);
- marks the resource response private rather than publishing a storage URL.

The widget converts those bytes to a temporary browser Blob URL only while the user is viewing the PDF and revokes that URL when the preview is hidden or the component leaves the page.

The PDF resource represents the exact packet bytes. The mailing recipient remains a separately reviewed, SHA-256-bound destination because Lob applies recipient addressing during fulfillment rather than baking that destination into these packet bytes.

The connector must remain useful without custom UI; UI is a review surface, not an authorization bypass.
