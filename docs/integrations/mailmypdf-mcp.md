# MailMyPDF Remote MCP Connector

MailMyPDF exposes a vendor-neutral MCP surface so ChatGPT, Claude, Grok, Codex, and other compatible clients can use the same workflow engine.

## Endpoint

The host app mounts the connector at:

```
POST /api/mcp
```

The connector is deliberately an adapter over the existing generic workflow runtime. It does not implement a second matter store, document system, packet builder, pricing engine, payment system, or Lob integration.

## Protocol compatibility

The HTTP endpoint serves the modern MCP `2026-07-28` stateless shape and keeps the legacy initialize path for older clients.

For modern requests:

- `MCP-Protocol-Version: 2026-07-28` identifies the modern protocol;
- `Mcp-Method` must agree with the JSON-RPC method;
- `Mcp-Name` must agree with `params.name` for tool calls;
- `server/discover` advertises capabilities without creating a session;
- `tools/list` returns deterministic cache hints;
- discovery/list requests do not load the workflow execution runtime.

MailMyPDF does not mint or require MCP session ids for modern requests. Application state is explicit through matter, document, approval, and order identifiers.

## v0.6 tool boundary

Public discovery:

- `find_workflow`
- `get_workflow`

Authenticated matter execution:

- `get_profile`
- `create_matter`
- `get_matter`
- `get_order_status`
- `get_document_status`
- `ingest_document`
- `save_matter_input`
- `analyze_matter`
- `generate_draft`
- `save_draft`
- `preview_packet`
- `approve_packet`
- `prepare_checkout`

The connector intentionally does **not** expose a raw-card tool or a model-authorized "mail now" tool.

`approve_packet` is bound server-side to the exact packet SHA-256, exact price, recipient, and mail class. `prepare_checkout` can only run against that saved approval and returns the existing Stripe-hosted checkout path. Existing payment and fulfillment infrastructure remains authoritative.

## Packet review app

`preview_packet` now requires the intended recipient as part of the review request and advertises the portable MCP Apps resource:

```
ui://mailmypdf/packet-review-v1.html
```

The resource is self-contained `text/html;profile=mcp-app` with no external scripts or network dependencies. Compatible hosts can render the quote, mail class, response/supporting page counts, intended recipient, packet SHA-256, and recipient SHA-256 before approval. Clients that do not render MCP Apps can still use the same structured preview result.

The review UI is passive: it cannot approve, charge, or mail. It receives tool input/result through the MCP Apps bridge and only renders what MailMyPDF already calculated.

MailMyPDF canonicalizes the reviewed recipient and computes a deterministic SHA-256. `approve_packet` requires the exact `expected_recipient_sha256` returned by `preview_packet`. If the recipient changes after review, approval fails closed and the assistant must build a new preview. This is in addition to the existing packet-hash, quote, and mail-class checks.

`preview_packet` is intentionally advertised with `readOnlyHint: false` because the existing packet preview path persists measured page-count metadata even though it does not approve, charge, or mail anything.

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

The tool reads only the owner-scoped matter snapshot. It does not return storage paths, scanner signatures, scanner error text, retention internals, or raw security metadata.

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

## Next execution milestones

1. Enable/verify Supabase OAuth 2.1 settings on the hosted project and exercise a real dynamic-client login.
2. Exercise `ingest_document` + `get_document_status` against real ChatGPT/Claude/Grok attachment URLs and configure `MCP_REMOTE_FILE_HOSTS` if stable provider/CDN domains are available.
3. Exercise `get_order_status` against paid, mailed, delivered, returned, and failed production-like orders.
4. Add saved-payment support only after a server-side confirmation design is complete.
5. Exercise the MCP Apps packet review UI in ChatGPT/Claude-compatible hosts, then add a post-mailing status UI if it materially improves the experience.
6. Package OpenAI-specific skills/manifest after the production MCP URL is stable.

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
- `tools/list` exposes the expected 15-tool surface;
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

The connector must remain useful without custom UI; UI is a review surface, not an authorization bypass.
