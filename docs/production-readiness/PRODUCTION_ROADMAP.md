# Production Roadmap

## Phase 0: Freeze and inventory

Rotate credentials; freeze public catalog; fix build/tests; record deployment, database, webhook, and rollback targets.

## Phase 1: Shared P0 infrastructure

Create one certification-aware catalog for navigation, sitemap, pricing, checkout, and route gating. Standardize owner/persistence, approval artifact hash/version, checkout/webhook/reconciliation, fulfillment/idempotency, admin operations, secret redaction, health checks, alerts, and rollback.

## Phase 2: First gold workflow

Certify one MailMyPDF Core direct-PDF flow in staging, then supervised beta. Promote only after repeat transactions, failure recovery, refunds, and duplicate tests pass.

## Phase 3: Domain expansion

Certify CP2000, then one Appeal Mail flow. Promote Records Requests after D1 and deployed provider certification. Expand one workflow at a time.

## Phase 4: Operations and conversion

Replace mock admin panels; add live search, retries, refunds, receipts, transactional email, tracking/proof UX, support, and catalog-aware SEO.

## Phase 5: Remaining catalog

Migrate Immigration, Benefits, Code Enforcement, GovReply, Small Business, and Private Office. Defer Tenant, Permit, Insurance, and duplicate profiles until they have real execution paths.

Rollback on payment/fulfillment mismatch, data-integrity issue, security issue, error rate above 2x baseline, or provider duplication. Disable catalog flags, deploy the last known-good build, preserve paid orders, reconcile manually, and communicate.

