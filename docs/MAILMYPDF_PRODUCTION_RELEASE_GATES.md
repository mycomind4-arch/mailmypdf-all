# MailMyPDF production release gates

MailMyPDF deliberately does **not** enable live provider submission through this
hardening PR. The `AUTO_SUBMIT_TO_LOB=false` interlock must remain in place until
sandbox and controlled live-canary checks are complete.

## Branch controls

On GitHub, protect `main` from direct pushes and force pushes; require pull-request
review and the **Workspace UI verification**, **Shared capability verification**,
**Factory generated workflow verification**, **Public workflow landing gate**,
**Records Request verification**, **Notice Respond package verification**, and
**SSDI Appeal verification** checks. Verify the required checks correspond to their
actual unique job names. On a protected branch, required checks must pass on the
latest commit.

## Secure scheduled jobs

The GitHub Actions `Secure core jobs` workflow executes document malware scanning
every ten minutes, and retention plus connector reconciliation on their configured
schedules. Repository secrets must point to the exact deployed application and match
its server-side environment:

- `MAILMYPDF_APP_URL` — HTTPS origin of the Worker
- `MAILMYPDF_SCANNER_JOB_SECRET`
- `MAILMYPDF_RETENTION_JOB_SECRET`
- `MAILMYPDF_CONNECTOR_JOB_SECRET`

Manually dispatch each job once and confirm that the HTTP call **ran** and produced
a successful response. A green Actions summary alone can be misleading if job steps
were skipped.

## Assistant-file egress

`MCP_REMOTE_FILE_HOSTS` is **mandatory** for deployments supporting remote assistant
attachment ingestion. It is a comma-separated list of trusted **hostnames**, not full
URLs (e.g. `files.provider.example,*.cdn.provider.example`). Determine the actual
temporary file hostnames from the client's sanctioned file-download integration,
and allow only those provider-operated hosts. Never add arbitrary user-controlled
domains. Wildcards should be avoided unless their entire suffix is provider-controlled.

When unset, assistant remote-file downloads are rejected deliberately. This does
not block normal uploaded documents handled by the application's separate secure
file upload path. The list applies to every redirect hop. DNS-level egress controls
are still recommended as additional protection.

## Checkout and refunds

- Confirm `PAYMENTS_ENV=sandbox` and the matching Stripe sandbox key and webhook
  secret before any paid test.
- Test authenticated quote review, Stripe Hosted Checkout return URLs, SDK-verified
  webhook settlement, receipt handling, and a staff-authorized quote refund.
- Ensure saved-payment direct mail, multi-recipient orders, and scheduled mail retain
  exact recipient, current price, and packet approval binding.
- Keep physical provider submission off until an approved, observed Lob sandbox
  exercise verifies return-address and recipient rendering, webhook reconciliation,
  mailing proof, and safe retry/idempotency behavior.

## Deployment

A successful PR build **does not** establish production readiness. The deployment
workflow publishes from `main` after a successful qualifying verification event.
Before merging, check configuration, the exact Worker target, connector OAuth
authorization, public MCP endpoint, webhook signatures, and scheduled-job credentials.

Do not print or commit secrets; configure them in the deployment and GitHub secret
stores. Keep production controlled through an explicit, reviewed release gate.
