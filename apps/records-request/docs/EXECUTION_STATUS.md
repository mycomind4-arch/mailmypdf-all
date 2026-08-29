# Records Requests — Execution Status

Updated: 2026-08-20

## Executable now

- Request payload validation through `POST /api/requests/validate`.
- Deterministic normalization of title, agency, scope, and request items.
- Domain-level audit payload generation for validated requests.
- Full Records Gold Standard lifecycle contract with explicit pre-send gating.
- D1-compatible `RequestStateRepository` with request, item, immutable audit-event, and fulfillment-event writes.
- Atomic lifecycle transitions: `draft → validated → review → approved → queued → submitted → tracking → completed|failed`.
- Database-level D1 status constraints mirror the application lifecycle and prevent unsupported persisted states.
- Provider failures can terminate `queued` requests instead of leaving them stranded.
- Fulfillment submissions now carry deterministic idempotency keys derived from request ID + attested document hash.
- Explicit MailMyPDF fulfillment adapter with authenticated request handling, provider-response validation, and tracking/proof identifiers.
- Signed MailMyPDF webhook verification using HMAC-SHA256.
- MailMyPDF callback endpoint records fulfillment events and advances `tracking → completed|failed`.
- Server-side PDF rendering and SHA-256 attestation on every submission path. The submit route fetches the approved request record, renders a deterministic PDF, records the hash as a `document_attested` audit event, and sends only that attested PDF.
- Approval is now fail-closed on authentication: the approval route requires an injected authenticated principal with `case_approver`, `admin`, or `owner` role and records the verified principal subject rather than trusting caller-supplied identity text.
- Deployment script fails closed when placeholder D1 IDs remain.
- Repository has an executable Vitest command for domain, migration, repository, fulfillment, webhook, attested-submission, authorization, and Gold Standard regression suites.

## Still blocked for production certification

### Actual runtime D1 binding
The repository and runtime contract exist, but no real provisioned D1 database ID has been installed in this repository or exercised through a deployed Cloudflare/OpenNext runtime.

### Real approval identity provider
The approval authorization boundary is fail-closed and injectable, but the actual authenticated identity/session provider has not yet been installed into the Cloudflare/OpenNext runtime.

### Real MailMyPDF credentials and endpoint
The fulfillment adapter is implemented and tested against mocked HTTP responses, but no live MailMyPDF credential or endpoint is configured here. No real mailing call has been performed.

### Tracking/proof provider integration
The signed callback endpoint exists and records delivery/failure evidence, but the deployed MailMyPDF provider must be configured with the callback secret and actual callback URL, and its real payload schema must be verified.

### Integration certification
There is no verified deployed end-to-end test against real D1 + real MailMyPDF. CI/status reporting is also not currently available through the GitHub connector for these commits.

## External-agent operations still required

1. Provision staging D1 and replace the placeholder IDs in `wrangler.jsonc`.
2. Apply the SQL migration/schema to staging and run the integration suite against D1.
3. Install the real authenticated approval/session resolver in the Cloudflare/OpenNext runtime.
4. Configure `MAILMYPDF_API_KEY` and the real fulfillment endpoint in a non-production environment.
5. Configure `MAILMYPDF_WEBHOOK_SECRET` and register the callback endpoint with MailMyPDF.
6. Run one authorized staging transaction and verify `approved → queued → submitted → tracking → completed` plus proof reconciliation, including an intentional retry to prove idempotency.
7. Promote infrastructure and credentials to production only after staging passes.

## Certification rule

The vertical is not Gold Standard until durable persistence, authenticated human approval, real fulfillment, idempotent retry behavior, tracking/proof reconciliation, and deployed end-to-end verification all pass. UI completeness and mocked adapters are not sufficient evidence.
