# Shared Infrastructure Gaps

## Strengths

Supabase bearer middleware and server client; centralized pricing with non-production gating; canonical order state machine and event history; Stripe webhook code; Lob adapters and retries; document storage; proof modules; workflow durable-store, approval, model-routing, telemetry, domain-pack, and certification abstractions.

## Launch gaps

| Gap | Evidence | Impact | Priority |
|---|---|---|---|
| Build health | Missing @/lib/auth import | Cannot sign off artifact | P0 |
| Credential hygiene | Secrets pasted into task | Account compromise risk | P0 |
| Unified catalog | Registry, pricing, routes, ledger disagree | Unsupported work can appear purchasable | P0 |
| Runtime adoption | Ledger says Gold runner is not production executor | Tests may cover unused code | P0 |
| Durable persistence | Ledger lists missing production storage | Paid work cannot reliably resume/recover | P0 |
| Approval binding | CP2000 approval wiring explicitly missing | Wrong artifact could be mailed | P0 |
| Payment/fulfillment | No deployed E2E proof | Charge-to-mail behavior unknown | P0 |
| Admin operations | Old dashboard includes mock data and browser-side secret storage | Unsafe operations and leakage | P0 |
| Observability | Health/metrics exist but deployed alerts unverified | Silent failures | P1 |
| CI coherence | Contract tests fail while readiness claims persist | False confidence | P0 |

Identity is strongest in the monorepo through Supabase and user-ID scoping. Organizations/team permissions are incomplete; do not build them before first revenue. AI adapters are real but duplicated across verticals. Credits should be an immutable server-side adjustment ledger, not client state. Minimum admin operations are order search, payment state, provider status, retry, refund record, proof access, audit trail, and workflow kill switch.

