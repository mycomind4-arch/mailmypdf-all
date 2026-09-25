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
- `ingest_direct_pdf`
- `prepare_direct_pdf_mail`
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

`approve_packet` is bound server-side to the exact packet SHA-256, exact price, recipient, and mail class. `prepare_checkout` can only run against that saved approval and returns the existing Stripe-hosted checkout path. Existing payment and fulfillment infrastructure remains authoritative.

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
4. The assistant shows the user the PDF identity, recipient, mail class, and price.
5. Only after explicit confirmation, `approve_direct_pdf_mail` requires the client to echo the reviewed sender, recipient, mail class, color, SHA-256, and price; the server compares all of them and then records the immutable approval snapshot.
6. `prepare_direct_pdf_checkout` re-hashes the order PDF, re-quotes it, verifies both against approval, and returns a Stripe-hosted checkout URL.
7. Stripe's verified webhook records payment and, when auto-fulfillment is enabled, submits the order through the existing Lob pipeline.
8. `get_order_status(order_id)` reports payment, provider, tracking, and delivery state.

Direct-mail preparation requires a client-supplied `idempotency_key`. Retries of the same mailing intent reuse the existing order; intentionally mailing the same PDF again requires a new key.

The direct-mail tools never return the legacy order lookup token and never accept raw card data.

### Direct-mail integrity boundary

Approval is not merely a UI flag.

- `approved_packet_sha256` and `approved_price_cents` are written only after the client echoes the exact reviewed mailing details and the server confirms they still match the prepared order.
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

## Next execution milestones

1. Enable/verify Supabase OAuth 2.1 settings on the hosted project and exercise a real dynamic-client login.
2. Exercise workflow `ingest_document` and direct-mail `ingest_direct_pdf` against real ChatGPT/Claude/Grok attachment URLs; configure `MCP_REMOTE_FILE_HOSTS` only when stable provider/CDN domains are known.
3. Exercise the full direct-PDF sandbox path through Stripe checkout, verified webhook, Lob test submission, and `get_order_status`.
4. Exercise `get_order_status` against paid, mailed, delivered, returned, and failed production-like orders.
5. Add saved-payment support only after a server-side confirmation design is complete.
6. Add MCP Apps review UI for exact PDF, recipient, service, price, and post-mailing status.
7. Package OpenAI-specific skills/manifest after the production MCP URL is stable.

The connector must remain useful without custom UI; UI is a review surface, not an authorization bypass.
