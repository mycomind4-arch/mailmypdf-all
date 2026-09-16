# Shared Workflow Capability Audit

Audited against `main` on 2026-09-16.

## Result

The platform already had strong reusable foundations for document security, document extraction, intelligence/provenance, dynamic step matters, AI routing, PDF/packet generation, pricing, payment-to-fulfillment integrity, mailing, tracking, proof, notifications, workflow UI, and acceptance simulation.

This hardening pass closes the remaining package-level gaps that would otherwise force workflow-specific implementations.

| Capability area | Package | Audit result |
| --- | --- | --- |
| Identity / entitlements | `@mailmypdf/ecosystem` | implemented |
| Dynamic matter state | `@mailmypdf/step-workflow` | implemented, including conditional steps |
| Secure intake / quarantine | `@mailmypdf/documents` | implemented |
| Verified document retrieval | `@mailmypdf/documents` | added in this pass |
| Malware / structural validation | `@mailmypdf/documents` | implemented |
| Retention / purge eligibility | `@mailmypdf/documents` | implemented |
| PDF / text extraction | `@mailmypdf/document-intelligence` | implemented |
| PDF / image vision analysis boundary | `@mailmypdf/document-intelligence` | hardened with timeout/provider policy |
| AI routing / schema / provenance | `@mailmypdf/ai` | implemented |
| Facts / evidence / provenance / contradictions | `@mailmypdf/intelligence` | implemented |
| Timeline / deadlines / risk / readiness | `@mailmypdf/intelligence` | implemented |
| PDF generation / packet assembly | `@mailmypdf/packet-builder` | implemented |
| Pricing | `@mailmypdf/pricing` | implemented |
| Payment -> immutable fulfillment | `@mailmypdf/payment-fulfillment` | implemented |
| Address verification contract | `@mailmypdf/fulfillment` | implemented |
| Mailing / tracking | `@mailmypdf/mailing-client`, `@mailmypdf/fulfillment` | implemented |
| Notifications / reminders | `@mailmypdf/ecosystem` | hardened with durable due-dispatch |
| Proof / custody | `@mailmypdf/proof` | implemented |
| Matter completion archive | `@mailmypdf/proof` | added in this pass |
| Retry / idempotency | `@mailmypdf/workflows` | added in this pass |
| Safe workflow telemetry | `@mailmypdf/workflows` | added in this pass |
| Acceptance simulation | `@mailmypdf/workflow-acceptance` | implemented |
| Shared workflow UI | `@mailmypdf/workflow-ui` | implemented |
| Studio/factory operations | `@mailmypdf/vertical-foundry` | implemented foundation |

## Boundary rule

A workflow should declare and configure capabilities. It should not implement storage, malware scanning, model routing, PDF generation, pricing, Stripe state, mailing submission, notification delivery, retries, proof hashing, or acceptance simulation itself.

Provider-specific production adapters can remain in the canonical MailMyPDF application while the provider-neutral contracts and invariants live in packages. This keeps secrets and infrastructure configuration centralized without duplicating runtime logic across workflows.
