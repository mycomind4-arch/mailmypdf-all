# MailMyPDF Remote MCP Connector

MailMyPDF exposes a vendor-neutral MCP surface so ChatGPT, Claude, Grok, Codex, and other compatible clients can use the same workflow engine.

## Endpoint

The host app mounts the connector at:

```
POST /api/mcp
```

The connector is deliberately an adapter over the existing generic workflow runtime. It does not implement a second matter store, document system, packet builder, pricing engine, payment system, or Lob integration.

## v0.1 tool boundary

Public discovery:

- `find_workflow`
- `get_workflow`

Authenticated matter execution:

- `get_profile`
- `create_matter`
- `get_matter`
- `save_matter_input`
- `analyze_matter`
- `generate_draft`
- `save_draft`
- `preview_packet`
- `approve_packet`
- `prepare_checkout`

The connector intentionally does **not** expose a raw-card tool or a model-authorized "mail now" tool.

`approve_packet` is bound server-side to the exact packet SHA-256, exact price, recipient, and mail class. `prepare_checkout` can only run against that saved approval and returns the existing Stripe-hosted checkout path. Existing payment and fulfillment infrastructure remains authoritative.

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

Supabase currently supports the standard `email` and `profile` scopes used by MailMyPDF's protected MCP tools. Application-specific permissions such as matter ownership and exact mailing approval are enforced by MailMyPDF server policy/RLS rather than unsupported custom OAuth scopes.

For local Supabase, the equivalent settings are committed in `mailmypdf/supabase/config.toml`.

Do not treat OAuth consent as authorization to mail. Packet approval and checkout remain separate server-side actions.

## Next execution milestones

1. Enable/verify Supabase OAuth 2.1 settings on the hosted project and exercise a real dynamic-client login.
2. Add a secure attachment-ingress tool that copies assistant-provided files into MailMyPDF quarantine/storage instead of trusting temporary third-party URLs.
3. Add an order-status tool backed by the canonical order/fulfillment records.
4. Add saved-payment support only after a server-side confirmation design is complete.
5. Add MCP Apps review UI for exact PDF, recipient, service, and price confirmation.
6. Package OpenAI-specific skills/manifest after the production MCP URL is stable.

The connector must remain useful without custom UI; UI is a review surface, not an authorization bypass.
