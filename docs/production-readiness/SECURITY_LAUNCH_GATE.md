# Security Launch Gate

Status: FAIL. Launch blocked.

| Control | Status | Evidence / action |
|---|---|---|
| Authenticated creation | PARTIAL | Middleware exists; trace every selected route |
| Ownership / IDOR | PARTIAL | Good checks exist in selected functions; add adversarial tests |
| Server approval | PARTIAL | Abstraction exists; CP2000 UI wiring is missing |
| Approved artifact hash/version | PARTIAL | Records has attestation; standardize across launch path |
| Price integrity | PARTIAL | Central engine exists; catalog adoption conflicts |
| Payment verification | PARTIAL | Webhook/state tests exist; deployed proof absent |
| Webhook replay defense | PARTIAL | Helpers exist; verify deployed registration/idempotency |
| Mailing authorization | PARTIAL | Prove paid + approved + owner-bound intent |
| File validation | PARTIAL | Checks are scattered; standardize limits and malware policy |
| Secret management | FAIL | Revoke and replace every exposed credential |
| RLS/database auth | PARTIAL | Patterns exist; add cross-account tests |
| Sensitive logging | PARTIAL | Inspect redaction of PII, tokens, addresses, documents |

Trust boundaries: browser/server, uploads, LLM output, Stripe/Lob callbacks, Supabase admin client, and cross-repo control-plane calls. Abuse tests must cover forged IDs, altered totals, artifact substitution, repeated checkout, repeated submission, replayed webhooks, cross-account access, malicious PDFs, prompt injection, expired tokens, and provider timeouts.

