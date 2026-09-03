# MailMyPDF Ecosystem Production Readiness

Audit date: 2026-09-02. Scope: 19 local Git repositories and the unified monorepo at repos/mailmypdf-all.

## Founder conclusion

Can MailMyPDF open for business today? No for unrestricted public launch. A limited beta is possible only after credential rotation, a clean build, and a supervised end-to-end payment-to-mail test for one narrow product.

The codebase has strong shared foundations: Supabase auth middleware, owner-scoped server functions, centralized pricing, Stripe webhook handling, order state transitions, Lob adapters, document storage, approval/provenance types, and extensive contract tests. It is not commercially certifiable because the catalog is much larger than the verified execution surface.

## Verified scale

- 19 local repositories.
- 14 vertical app packages.
- 183 pricing profiles across 14 pricing vertical IDs.
- 12 user-facing vertical definitions in the main registry.
- 0 unblocked gold workflows in the certification ledger.
- 1 executable family in the ledger: Records Requests.

## Genuine launch blockers

1. Exposed credentials must be revoked and replaced.
2. The main app build fails on a missing @/lib/auth import in apps/mailmypdf/src/routes/workflows/index.tsx.
3. The full test suite has pre-existing failures in dispute-mail and vertical-routing contracts.
4. Admin authentication had a split hardcoded/fake-token path; the local patch moves it to Supabase role auth but still needs review and deployment verification.
5. The ledger explicitly identifies missing production executor wiring, storage, provider certification, webhooks, and proof work in multiple families.
6. The money-to-fulfillment chain has not been certified in a deployed environment.
7. Public registry, pricing catalog, routes, and certification status disagree.
8. Production secrets, domains, webhooks, support/refund operations, and rollback are unverified.

## Recommended launch

After the blockers close, start with one narrow MailMyPDF Core direct-PDF mailing workflow. Keep domain-heavy products hidden or beta. CP2000 is the best second candidate after its missing approval and mailing-route issues are closed.

## Canonical references

Use Records Requests for approval, attested artifacts, idempotent fulfillment, callbacks, and persistence boundaries. Use CP2000 for domain intelligence. Use Appeal Mail as a broad candidate, not as the canonical runtime, because its ledger still reports factory and deployment gaps.

## Shortest path to revenue

Rotate credentials, restore a clean build, fix failing contracts, freeze the catalog, certify one Core workflow in staging, verify payment/webhook/provider/tracking/proof/recovery, then run a supervised beta.

## Scorecard

| Area | Score | Blocking |
|---|---:|---|
| Core Platform | 55 | Yes |
| Authentication | 60 | Yes |
| Authorization | 62 | Yes |
| Workflow Runtime | 45 | Yes |
| Persistence | 55 | Yes |
| AI Infrastructure | 55 | Yes for AI workflows |
| Pricing | 70 | Yes |
| Payments | 62 | Yes |
| Fulfillment | 48 | Yes |
| Security | 35 | Yes |
| Reliability | 52 | Yes |
| UX | 55 | Yes for public launch |
| SEO | 58 | Catalog claims are blocking |
| Admin Operations | 42 | Yes |
| Observability | 58 | Yes |
| Deployment | 25 | Yes |

# OVERALL COMMERCIAL READINESS: 45%

