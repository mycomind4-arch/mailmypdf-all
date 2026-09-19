# ADR-004: Consumer Orders and Proof-of-Service Communications — Separate but Documented

## Date
2026-08-15

## Status
Accepted

## Context

MailMyPDF has two distinct product surfaces:

1. **Consumer App (B2C)** — Anonymous users upload a PDF or write a letter, pay via Stripe Checkout, and MailMyPDF mails it via Lob. Data lives in the `orders` and `order_events` tables. Access is via lookup token (no account needed).

2. **Proof-of-Service API (B2B)** — Authenticated tenants (organizations) send legal communications via an API. Data lives in `proof_communications`, `proof_documents`, `proof_custody_events`, and related tables. Access is via API keys.

The `MailJob` domain model (`src/domain/models.ts`) was designed to unify both surfaces under a single lifecycle. `status-mapping.ts` bridges the two status enums. However, in practice, each surface has its own persistence layer, status tracking, and API surface.

## Decision

**Keep the two data models separate.** They serve fundamentally different use cases with different access patterns, security requirements, and lifecycle needs.

### Rationale

| Dimension | Consumer App | Proof-of-Service API |
|-----------|-------------|----------------------|
| **Users** | Anonymous (no account) | Authenticated tenants (API keys) |
| **Access** | Lookup token via URL | API key via Authorization header |
| **Legal context** | None (user just wants to mail something) | Required (statute, clause, response window) |
| **Audit needs** | Basic order events | Full cryptographic custody chain |
| **Multi-tenancy** | No (user-scoped by email) | Yes (tenant_id on every record) |
| **Idempotency** | Via Stripe session ID | Via explicit idempotency keys |
| **Scale pattern** | Many single orders | Fewer tenants, higher volume per tenant |

Forcing these into a single table would require:
- Nullable columns for legal context (ugly, error-prone)
- Complex RLS policies mixing anonymous and authenticated access
- A hybrid status enum that serves neither surface well
- Tenant-scoping on a table that's mostly anonymous

The domain model (`MailJob`) remains valuable as a shared conceptual vocabulary and for cross-surface features (e.g., "show me all mail jobs for this user across consumer + API"). But the persistence layer stays separate.

## Consequences

- The `MailJob` domain model is aspirational — it describes the shared concept but doesn't map 1:1 to either table.
- `status-mapping.ts` continues to bridge the two status enums for cross-surface queries.
- Future cross-surface features (unified dashboard, shared tracking) will need a view or service-level join.
- New tables for new verticals should follow the Proof-of-Service pattern (tenant-scoped, with custody chains) rather than the consumer pattern.

## Revisit
Revisit if:
- The consumer app adds accounts and multi-tenancy (convergence would make more sense)
- A new vertical needs both consumer and API access to the same data
- The maintenance cost of two data models exceeds the cost of migration
