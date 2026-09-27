# Install MailMyPDF in ChatGPT or Claude

## Current target and blockers (2026-09-26)

Use `https://mailmypdf.mycomind4.workers.dev/api/mcp` until `mailmypdf.ai`
is acquired and configured. The repository's portable plugin manifest targets
the future `.ai` domain; use the explicit Workers endpoint for a custom connection.

The current live Worker is an older release: `/api/mcp` returned the HTML
not-found page, not MCP. Its public authentication configuration identifies
Supabase project `akpjuhrzypmcbivgsegt`. OAuth discovery now succeeds and advertises
dynamic client registration and PKCE S256; both the connected Supabase integration
and local CLI can identify the correct project. The CLI's automatic database-login
role endpoint is denied, so manual exports required a privately entered database
password. Do not use the unrelated Private Office project or bypass production
preflight to publish the new server.

The live project originally had an empty migration history despite existing
application tables. On September 27 UTC, all 25 pending forward migrations were
applied in one transaction as `20260927054844`:
`mailmypdf_verified_connector_rollout_25_migrations`. The document vault,
workflow-case, connector-operation, delivery-evidence, and approval-security
changes are now present. All 43 public tables have RLS enabled; the six checked
trusted RPCs exclude both anonymous and authenticated client execution.
A private roles/schema/data export has been completed, its SHA-256 checksums
verified, and the full export restored into a network-isolated local Supabase
database. All 25 migrations from `20260820163000` onward, including the new
server-only workflow approval correction, passed there. Both executable SQL
security suites passed. Counts across all 49 backed-up tables were preserved,
except for the expected addition of the secure-document bucket. This does not
back up uploaded Storage file contents or dashboard configuration. Live counts
across those 49 tables were also preserved, apart from the expected new bucket.
The remote ledger records one batch, not the 25 original file versions; the
legacy baseline remains unrecorded. Do not run `supabase db push`, replay these
files, or mark legacy migrations applied without explicit history reconciliation.
See [the source-file hash manifest](database-rollout-20260927.json).

Deployment remains blocked. Cloudflare binding-name inspection confirms missing
scanner URL/key, scan/retention/connector job secrets, both Stripe webhook
secrets, Lob webhook secret, Resend key/sender, and the expected project reference.
The GitHub repository has no Actions secrets configured. No Worker deployment or
real client OAuth flow has been completed; the old Worker remains live.

## Deployment checklist

1. Database access, backup rehearsal, and the 25 forward changes are complete
   for `akpjuhrzypmcbivgsegt`. Verify the batch ledger and source manifest above;
   do not rerun it. Reconcile migration history explicitly before future CLI
   migration pushes. Keep the private backup outside Git.
2. In that project's Authentication OAuth Server settings, enable the OAuth
   server and dynamic client registration. Set the authorization path to
   `/oauth/consent`; set Auth Site URL to `https://mailmypdf.mycomind4.workers.dev`.
   Add the site's required sign-in redirect URLs. Never put service-role keys
   or shared account tokens in a ChatGPT/Claude connector configuration.
3. Set the Worker's canonical site URL variables (`PUBLIC_APP_URL`, `APP_URL`,
   `MAILMYPDF_BASE_URL`) to the Workers origin and
   `MAILMYPDF_EXPECTED_SUPABASE_PROJECT_REF=akpjuhrzypmcbivgsegt`.
4. Supply and verify the scanner, scheduled-job, payment-webhook, Lob-webhook,
   and transactional-email configuration listed in the production runbook.
   Existing encrypted Cloudflare secrets cannot be read back locally; their
   presence alone does not prove valid values or correct database schema.
5. Run production preflight and the normal `mailmypdf/deploy.sh` deployment.
   It must pass without suppressing missing schema or service checks.
6. Run the read-only smoke and launch checks against the Workers URL:

   ```sh
   pnpm --filter ./mailmypdf mcp:smoke https://mailmypdf.mycomind4.workers.dev
   pnpm --filter ./mailmypdf mcp:readiness https://mailmypdf.mycomind4.workers.dev
   ```

   Public checks do not prove account linking. Complete OAuth through the client
   and call `get_profile` with the resulting user-scoped access token. Verify
   the 23-tool catalog, owner isolation, exact PDF review, and negative approval
   cases. Never use a real payment or mail submission as an automated smoke test.

## ChatGPT custom connection

After the deployment checks pass, enable Developer mode under **Settings →
Security and login**, then open **Plugins**, use the plus button, and create
a connection named **MailMyPDF** with the Workers MCP URL above. Complete OAuth,
review the discovered tools, and enable it in a new conversation. Availability
depends on account/workspace policy. This is a private development connection,
not approval for publication in the public directory.

Source: [OpenAI connection and testing guide](https://developers.openai.com/plugins/deploy/connect-chatgpt).

## Claude custom connection

For individual Pro/Max accounts, open **Customize → Connectors → + → Add custom
connector**, enter the Workers MCP URL, add it, and connect your MailMyPDF
account. Team/Enterprise organization owners add it under organization connector
settings first; each user then authenticates individually. Enable the connector
for the desired conversation.

Source: [Claude remote connector guide](https://support.claude.com/en/articles/11175166-get-started-with-custom-connectors-using-remote-mcp).

## Safe first prompts

- “Find the MailMyPDF workflow for an IRS CP14 notice.” (public discovery)
- “Which MailMyPDF account am I connected to?” (read-only OAuth verification)
- “Prepare this PDF for review; do not approve it or start payment.” (creates
  private test data; use only an intentionally supplied nonsensitive test PDF)

When moving to `mailmypdf.ai`, update the canonical site URLs, Supabase Site URL
and allowed redirects, deploy, rerun checks, and reconnect/refresh client metadata.
Treat the new OAuth resource origin as a different connection.
