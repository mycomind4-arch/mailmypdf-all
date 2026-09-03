# Vertical Readiness Matrix

Audit date: 2026-09-02. Counts are pricing-profile counts, not certified executable counts.

| Vertical | Profiles | Evidence | Class | Decision | Recommendation |
|---|---:|---|---|---|---|
| MailMyPDF Core | 7 | Main app routes and canonical order/payment services; build fails | C | HARDEN | Tier 1 after one E2E |
| Notice Respond | 15 | CP2000 case pipeline; ledger reports missing approval affordance, mail route, deployment proof | C | HARDEN | CP2000 Tier 2 |
| Dispute Mail | 19 | Credit-report analyzer; preparation-only UI and missing live path | C | HARDEN | Credit Report Tier 2 |
| Appeal Mail | 35 | Many routes/APIs and domain packs; factory/provider/deployment gaps remain | C | HARDEN | Small subset Tier 2 |
| Immigration Mail | 19 | Document/action implementation; no verified checkout/provider path | D | MIGRATE | Defer |
| Small Business | 5 | Trigger/Gold runner/tests; executor/storage/scheduling/webhook/proof gaps | D | HARDEN | Defer |
| GovReply | 1 | Gold runner/domain work; executor/persistence/fulfillment blocked | D | UPGRADE | Defer |
| Tenant Reply | 1 | Catalog/architecture evidence only | E | DEFER | Hide |
| Permit Response | 1 | Domain contract; runtime/fulfillment absent | E | DEFER | Hide |
| Insurance Claims | 25 | Catalog/workflow engine; no verified shared execution chain | E | DEFER | Hide |
| Benefits Appeal | 23 | Domain contracts and pages/APIs; shared runtime and proof blocked | D | UPGRADE | Defer |
| Private Office | 5 | Pages and checkout tests; deployed fulfillment unverified | D | UPGRADE | Invite-only |
| Records Requests | 13 | Factory, D1 repository, attested PDF, idempotency, HMAC callback tests | C | HARDEN | Generic flow Tier 2 after deployment certification |
| Code Enforcement | 14 | Gold tests/domain analysis; production runtime/property/fulfillment blocked | D | UPGRADE | Defer |

