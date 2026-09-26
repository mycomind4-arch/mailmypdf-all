# MailMyPDF Agent Plugin

This directory packages the MailMyPDF remote MCP server and the document-execution skill as a portable agent plugin.

## Contents

- `plugin.json` — portable plugin metadata.
- `mcp.json` — remote streamable-HTTP MCP endpoint at `https://mailmypdf.ai/api/mcp`.
- `skills/document-execution/SKILL.md` — safe execution sequence for document workflows.
- `review-cases.json` — positive and negative reviewer prompts for connector behavior.

The plugin does not duplicate workflow logic. MailMyPDF remains authoritative for authentication, matter ownership, secure document intake, malware scanning, analysis, drafting, packet construction, recipient/packet fingerprints, pricing, approval, Stripe checkout, Lob fulfillment, and mailing status.

## Safe execution sequence

The skill directs compatible assistants through:

```
discover workflow
→ create owner-scoped matter
→ ingest attachment
→ wait for clean document readiness
→ analyze
→ collect/save facts
→ generate and review draft
→ preview exact packet + recipient + price
→ explicit user approval
→ Stripe-hosted checkout
→ MailMyPDF fulfillment
→ status/tracking
```

No plugin instruction authorizes a raw-card charge or a direct provider-mail bypass.

## Before public submission

The production deployment should have all of the following verified:

1. `https://mailmypdf.ai/api/mcp` is publicly reachable over HTTPS and passes `mcp:smoke`.
2. Hosted Supabase OAuth 2.1 Server is enabled with authorization path `/oauth/consent`.
3. Dynamic client registration/account linking has been exercised with a real external MCP client.
4. Public privacy policy, terms, and support pages are current.
5. The MailMyPDF domain is verified through the platform's current app/plugin verification challenge:
   - set the portal-generated value as the deployment secret `OPENAI_APPS_CHALLENGE_TOKEN`;
   - verify that `https://mailmypdf.ai/.well-known/openai-apps-challenge` returns only that exact token;
   - do not commit the token to Git.
6. The positive and negative cases in `review-cases.json` have been exercised against the deployed connector.
7. A disposable staging/test account has passed the guarded document E2E path before production testing.

Do not place secrets, bearer tokens, Supabase service credentials, Stripe keys, Lob keys, or test-user passwords in this directory.
