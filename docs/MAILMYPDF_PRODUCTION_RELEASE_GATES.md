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

## Reconciliation checkpoint (2026-10-25)

PR #124 was squash-merged into `main` as `eca959bcff29dd567a90ec1863eb20d2d0c256b8`. Before integrating this PR, compare its current head with current `main` again: the earlier branch comparison showed 30 commits ahead and 54 behind, and GitHub marked it conflicted. Do not force-push `main` or replace current production handlers wholesale.

Conflict-sensitive files requiring **semantic**, not ours/theirs, review:

| File | Required invariant before acceptance |
| --- | --- |
| `mailmypdf/src/lib/stripe-payment.functions.ts` | Checkout quote ownership, amount/currency binding, idempotency and refund authorization remain intact |
| `mailmypdf/src/routes/api/public/payments/webhook.ts` | Stripe signature verification, event replay handling and settlement mapping are preserved |
| `mailmypdf/src/lib/mcp/remote-document.server.ts` | Every remote download and redirect stays on explicitly trusted hosts, with timeout and private-network protection |
| `mailmypdf/src/routes/api/internal/scheduled-mailings.ts` | Approved packet/recipient binding and `AUTO_SUBMIT_TO_LOB=false` remain enforced |
| `.github/workflows/deploy-mailmypdf.yml` | Exact-head required checks and nonproduction defaults cannot be bypassed |
| `.github/workflows/secure-core-jobs.yml` | Missing job credentials fail closed; no false-green scans or reconciliations |

Observed operational failure: Secure Core Jobs run `40223468868` had blank `APP_URL` and `JOB_SECRET` for scan and reconciliation. The owner must configure `MAILMYPDF_APP_URL` and the three job secrets in GitHub Actions and matching runtime environment. These are **not code defects** and must not be replaced by dummy credentials. After configuration, run a synthetic quarantine → scan → clean promotion → connector reconciliation check, verifying actual HTTP execution and outcomes. Do not expose secrets in logs.

Release gate: reconcile on this existing PR branch; run focused payment, MCP remote-host, cron, and mailing regression suites plus all required exact-head checks; obtain security review and verify branch protection before merge. Passing old-head checks does not count. No live Stripe, Lob, or production deployment during reconciliation.
