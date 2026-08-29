# Production Readiness

| Area | Status | Notes |
|---|---|---|
| Request validation | GREEN | Generic validation is executable and has workflow extension points. |
| Request persistence | GREEN | D1 repository supports owner-scoped creation and listing; creation uses batch when available. |
| Lifecycle | GREEN | Canonical lifecycle transitions are enforced by the repository. |
| Authorization | YELLOW | Approval boundary is fail-closed, but the real identity resolver must be installed. |
| Ownership | YELLOW | Owner IDs are persisted and route boundaries are enforced; repository-wide mutation enforcement remains. |
| Audit | GREEN | Event hashes use SHA-256 and previous-hash chaining; verification is available. |
| Document integrity | GREEN | Existing approved-document attestation architecture remains intact. |
| Outbound fulfillment | YELLOW | Existing MailMyPDF adapter/idempotency remains; durable outbound attempt storage is still required. |
| Webhooks | GREEN | HMAC verification plus durable provider/event deduplication is implemented. |
| Cloudflare D1 | YELLOW | Runtime now reads the binding through OpenNext, but real deployment IDs/migrations must be verified. |
| Dashboard | GREEN | Fake fixture requests and fake metrics were removed from the command center. |
| Workflow factory | GREEN | Versioned reusable definition contract and tests exist. |
| Jurisdiction intelligence | RED | Versioned policy packs still need implementation. |
| Production analysis | RED | Evidence/production schema exists; ingestion and analysis runtime remain to be built. |
| CI certification | YELLOW | Must be verified on the branch/main environment. |

## Certification rule

A yellow or red item must not be represented to users as complete. External credentials and Cloudflare resources are deployment requirements, not reasons to fabricate success in development or tests.
