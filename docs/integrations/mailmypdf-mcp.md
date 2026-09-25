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

## Authentication status

Public discovery tools can be tested without an account.

Protected tools currently validate the same MailMyPDF bearer token used by the authenticated web app. For public ChatGPT/Claude/Grok account linking, production still needs an OAuth 2.1 authorization server that satisfies the MCP authorization contract and maps the linked identity back to the MailMyPDF account.

Configure the resource metadata issuer with:

```
MCP_AUTHORIZATION_SERVER="https://auth.example.com"
```

The deployment serves protected-resource metadata at:

```
GET /.well-known/oauth-protected-resource
```

Do not set `MCP_AUTHORIZATION_SERVER` to an issuer until its tokens are actually accepted and mapped by the MailMyPDF resource server.

## Next execution milestones

1. Wire production OAuth account linking and scope enforcement.
2. Add a secure attachment-ingress tool that copies assistant-provided files into MailMyPDF quarantine/storage instead of trusting temporary third-party URLs.
3. Add an order-status tool backed by the canonical order/fulfillment records.
4. Add saved-payment support only after a server-side confirmation design is complete.
5. Add MCP Apps review UI for exact PDF, recipient, service, and price confirmation.
6. Package OpenAI-specific skills/manifest after the production MCP URL is stable.

The connector must remain useful without custom UI; UI is a review surface, not an authorization bypass.
