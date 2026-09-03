# Production Backlog

| ID | Area | Priority | Problem | Evidence | Solution | Acceptance criteria | Size |
|---|---|---|---|---|---|---|---|
| P0-001 | Security | P0 | Exposed credentials | Task content | Revoke and replace all affected secrets | Old values fail; replacements smoke-test | S |
| P0-002 | Core | P0 | Missing @/lib/auth build import | workflows/index.tsx | Restore canonical import or remove stale dependency | Production build succeeds | S |
| P0-003 | Catalog | P0 | 183 profiles exceed certified runtime | pricing and certification ledger | Certification-aware availability | No blocked profile purchasable/indexed | M |
| P0-004 | Auth | P0 | Split fake admin auth | admin-auth.server.ts and admin routes | Finish Supabase role migration | Non-admin/fake tokens rejected | M |
| P0-005 | Money | P0 | Charge-to-mail path unverified | payment/fulfillment gate | Retained staging E2E | Paid order recoverable; only approved artifact mails | L |
| P0-006 | Persistence | P0 | Missing production executor/storage in families | certification ledger | Shared persistence contract | Close/resume/recovery pass | L |
| P0-007 | Approval | P0 | Version invalidation differs | CP2000 ledger | Server-side hash/version enforcement | Post-approval mutation blocks mail | M |
| P0-008 | Fulfillment | P0 | Provider idempotency not deployed-certified | ledger/provider tests | Standard mailing intent and retry contract | One provider job per intent | M |
| P1-001 | Admin | P1 | Mock dashboard and local secret UI | admin/dashboard.tsx | Live order/provider/retry/refund views | Operator recovers failed paid order | L |
| P1-002 | Tests | P1 | Existing contracts fail | dispute/vertical tests | Fix or explicitly quarantine with owner | CI green and meaningful | M |
| P1-003 | Observability | P1 | Alerts/runbooks unverified | health/metrics modules | Configure launch alerts and runbook | First-hour checklist works | M |
| P1-004 | Commercial | P1 | Support/refund/receipt operations incomplete | route/docs audit | Publish policies and transactional email | Every failure has customer path | M |
| P1-005 | SEO | P1 | Registry/catalog mismatch | registry/pricing/ledger | Generate SEO from certified catalog | Sitemap contains honest claims | M |
| P2-001 | Expansion | P2 | Domain families need factory certification | ledger | Certify one workflow at a time | Tier promotion evidence retained | XL |
| P2-002 | Pricing | P2 | Credits/org pricing not fully operational | pricing package | Immutable server adjustment ledger | Quote/payment/refund reconcile | M |
| P3-001 | Scale | P3 | 19 repos duplicate concerns | repo inventory | Consolidate after usage evidence | Migration has rollback/data plan | XL |

